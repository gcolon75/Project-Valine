#!/usr/bin/env python3
"""
Operational Readiness Validation Agent for Discord AI Triage System

Mission: validate operational readiness of the Discord AI triage system in repository 
gcolon75/Project-Valine, help the human operator run staging validation, and produce 
a concise pass/fail report with evidence.

This SRE/dev-ops AI agent performs:
1. Repo recon and entry points
2. Secrets-in-code check (leak search)
3. Workflow/CI scan (env vars & triggers)
4. Provide exact commands & checklist to register staging commands and run smoke tests
5. Guide/run E2E /triage dry-run using a test PR (user provides PR number)
6. Verify draft-PR creation code & guardrails
7. Produce a short Summary + Findings + Action Plan + Evidence (≤800 words)

Usage:
    python operational_readiness_agent.py run --repo gcolon75/Project-Valine
    python operational_readiness_agent.py run --repo gcolon75/Project-Valine --test-pr 71
    python operational_readiness_agent.py run --repo gcolon75/Project-Valine --allow-run-registration
    python operational_readiness_agent.py generate-config
    python operational_readiness_agent.py --help

Safety rules:
- Read-only by default
- Always ask before any write/invasive actions
- Redact secrets (show only last 4 chars)
- No auto-merge, draft-only PRs if created
"""

import os
import sys
import json
import time
import argparse
import subprocess
import re
import requests
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass, asdict, field
from pathlib import Path
import traceback

# ============================================
# Configuration and Data Classes
# ============================================

@dataclass
class OperationalReadinessConfig:
    """Configuration for Operational Readiness Agent"""
    # Repository
    repo: str = "gcolon75/Project-Valine"
    base_ref: str = "main"
    
    # GitHub Configuration
    github_token: Optional[str] = None  # ENV:GITHUB_TOKEN
    
    # Test PR for E2E validation
    test_pr_number: Optional[int] = None
    
    # Execution modes
    allow_run_registration: bool = False
    allow_create_draft_prs: bool = False
    dry_run: bool = True
    verbose: bool = True
    
    # PR scanning range for flaky test analysis
    pr_scan_start: int = 50
    pr_scan_end: int = 71
    
    # Output
    evidence_output_dir: str = "./readiness_evidence"
    correlation_id: str = field(default_factory=lambda: f"OPS-{int(time.time())}")


@dataclass
class ReconResult:
    """Result of repository reconnaissance"""
    entry_points: List[Dict[str, str]]
    slash_commands: List[Dict[str, str]]
    registration_scripts: List[str]
    status: str


@dataclass
class SecretsCheckResult:
    """Result of secrets-in-code check"""
    found_secrets: List[Dict[str, Any]]
    example_configs: List[Dict[str, Any]]
    secret_mappings: Dict[str, str]
    status: str


@dataclass
class WorkflowScanResult:
    """Result of workflow/CI scan"""
    workflows: List[Dict[str, Any]]
    referenced_secrets: List[str]
    unmapped_secrets: List[str]
    total_tests: int
    flaky_tests: List[Dict[str, Any]]
    status: str


@dataclass
class OperationalReadinessReport:
    """Complete operational readiness report"""
    timestamp: str
    correlation_id: str
    repo: str
    summary: str
    findings: List[str]
    action_plan: List[Dict[str, Any]]
    evidence: Dict[str, Any]
    allow_draft_prs: Optional[bool] = None


# ============================================
# Redaction Utilities
# ============================================

def redact_secrets(data: Union[str, Dict, List, Any], show_last_n: int = 4) -> Union[str, Dict, List, Any]:
    """
    Redact secrets from data, showing only last N characters.
    """
    secret_patterns = [
        'token', 'secret', 'password', 'key', 'authorization',
        'bearer', 'api_key', 'access_token', 'refresh_token',
        'webhook_url', 'bot_token', 'github_token', 'discord_token',
        'cookie', 'session', 'auth', 'public_key', 'application_id'
    ]
    
    def _redact_value(value: str, force: bool = False) -> str:
        """Redact a single string value"""
        if not isinstance(value, str) or len(value) <= show_last_n:
            return value
        
        if force or re.search(r'[a-zA-Z0-9_-]{8,}', value):
            return f"***{value[-show_last_n:]}"
        return value
    
    def _should_redact(key: str) -> bool:
        """Check if a key should be redacted"""
        key_lower = key.lower()
        return any(pattern in key_lower for pattern in secret_patterns)
    
    # Handle different data types
    if isinstance(data, dict):
        return {
            key: _redact_value(val, force=True) if isinstance(val, str) and _should_redact(key)
            else redact_secrets(val, show_last_n)
            for key, val in data.items()
        }
    elif isinstance(data, list):
        return [redact_secrets(item, show_last_n) for item in data]
    elif isinstance(data, str):
        return data
    else:
        return data


# ============================================
# Operational Readiness Agent
# ============================================

class OperationalReadinessAgent:
    """Agent for validating operational readiness of Discord AI triage system"""
    
    def __init__(self, config: OperationalReadinessConfig):
        self.config = config
        
        # Find repository root (look for .git directory)
        self.repo_path = self._find_repo_root()
        self.github_token = config.github_token or os.environ.get('GITHUB_TOKEN')
        
        # Ensure evidence directory exists
        os.makedirs(config.evidence_output_dir, exist_ok=True)
        
        # Initialize results
        self.recon_result: Optional[ReconResult] = None
        self.secrets_result: Optional[SecretsCheckResult] = None
        self.workflow_result: Optional[WorkflowScanResult] = None
    
    def _find_repo_root(self) -> str:
        """Find the repository root by looking for .git directory"""
        current_dir = os.getcwd()
        
        # Walk up the directory tree looking for .git
        while current_dir != '/':
            if os.path.exists(os.path.join(current_dir, '.git')):
                return current_dir
            parent = os.path.dirname(current_dir)
            if parent == current_dir:
                break
            current_dir = parent
        
        # If not found, use current directory
        return os.getcwd()
    
    def log(self, message: str, level: str = "INFO"):
        """Log a message with timestamp"""
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        prefix = {
            "INFO": "ℹ️",
            "SUCCESS": "✅",
            "WARNING": "⚠️",
            "ERROR": "❌",
            "PROGRESS": "⏳"
        }.get(level, "📝")
        print(f"{timestamp} {prefix} {message}")
    
    def run_command(self, command: List[str], capture_output: bool = True) -> Tuple[int, str, str]:
        """Run a shell command and return exit code, stdout, stderr"""
        try:
            result = subprocess.run(
                command,
                capture_output=capture_output,
                text=True,
                cwd=self.repo_path
            )
            return result.returncode, result.stdout, result.stderr
        except Exception as e:
            return 1, "", str(e)
    
    # ============================================
    # Task 1: Repo Recon
    # ============================================
    
    def perform_repo_recon(self) -> ReconResult:
        """Perform repository reconnaissance to find entry points and commands"""
        self.log("Running repo recon now.", "PROGRESS")
        
        entry_points = []
        slash_commands = []
        registration_scripts = []
        
        # Find Discord handler
        discord_handler_path = "orchestrator/app/handlers/discord_handler.py"
        if os.path.exists(os.path.join(self.repo_path, discord_handler_path)):
            entry_points.append({
                "path": discord_handler_path,
                "summary": "Discord slash command handler - processes /plan, /approve, /status, /ship, /verify-latest, /triage, etc."
            })
            
            # Parse commands from discord_handler
            try:
                with open(os.path.join(self.repo_path, discord_handler_path), 'r') as f:
                    content = f.read()
                    # Find command patterns
                    cmd_pattern = r"command_name\s*==\s*['\"](\w+)['\"]"
                    commands = re.findall(cmd_pattern, content)
                    for cmd in set(commands):
                        slash_commands.append({
                            "name": f"/{cmd}",
                            "file": discord_handler_path
                        })
            except Exception as e:
                self.log(f"Could not parse commands from discord_handler: {e}", "WARNING")
        
        # Find GitHub Actions client
        github_actions_path = "orchestrator/app/verification/github_actions.py"
        if os.path.exists(os.path.join(self.repo_path, github_actions_path)):
            entry_points.append({
                "path": github_actions_path,
                "summary": "GitHub Actions client - fetches workflow runs, jobs, and verifies deployments"
            })
        
        # Find agent scripts
        agent_scripts = [
            ("orchestrator/scripts/phase5_triage_agent.py", "Phase 5 triage agent - triages failed runs and produces fix recommendations"),
            ("orchestrator/scripts/auto_triage_pr58.py", "Auto-triage automation for PR analysis"),
            ("orchestrator/scripts/phase5_super_agent.py", "Phase 5 super agent - comprehensive staging validation"),
            ("orchestrator/scripts/phase5_staging_validator.py", "Phase 5 staging validator - validates Phase 5 features in staging")
        ]
        
        for path, summary in agent_scripts:
            if os.path.exists(os.path.join(self.repo_path, path)):
                entry_points.append({"path": path, "summary": summary})
        
        # Find registration scripts
        reg_scripts = [
            "orchestrator/register_discord_commands_staging.sh",
            "orchestrator/register_discord_commands.sh",
            "orchestrator/scripts/register_staging_slash_commands.sh",
            "orchestrator/scripts/register_triage_command.py",
            "orchestrator/scripts/validate_discord_slash_commands.py"
        ]
        
        for script in reg_scripts:
            if os.path.exists(os.path.join(self.repo_path, script)):
                registration_scripts.append(script)
                
                # Parse commands from registration scripts
                try:
                    with open(os.path.join(self.repo_path, script), 'r') as f:
                        content = f.read()
                        # Find command names in JSON or script
                        name_pattern = r'"name"\s*:\s*"([^"]+)"'
                        names = re.findall(name_pattern, content)
                        for name in names:
                            if name not in [c['name'] for c in slash_commands]:
                                slash_commands.append({
                                    "name": f"/{name}" if not name.startswith('/') else name,
                                    "file": script
                                })
                except Exception as e:
                    self.log(f"Could not parse {script}: {e}", "WARNING")
        
        result = ReconResult(
            entry_points=entry_points,
            slash_commands=slash_commands,
            registration_scripts=registration_scripts,
            status="PASS"
        )
        
        self.recon_result = result
        self.log(f"Repo recon complete: {len(entry_points)} entry points, {len(slash_commands)} slash commands found", "SUCCESS")
        return result
    
    # ============================================
    # Task 2: Secrets-in-Code Check
    # ============================================
    
    def perform_secrets_check(self) -> SecretsCheckResult:
        """Search for secrets in code and map example configs to expected secrets"""
        self.log("Performing secrets-in-code check...", "PROGRESS")
        
        found_secrets = []
        example_configs = []
        secret_mappings = {}
        
        # Secret patterns to search for
        secret_env_vars = [
            "STAGING_DISCORD_BOT_TOKEN",
            "STAGING_DISCORD_PUBLIC_KEY",
            "STAGING_DISCORD_APPLICATION_ID",
            "STAGING_GITHUB_TOKEN",
            "GITHUB_TOKEN",
            "DISCORD_BOT_TOKEN",
            "AWS_ROLE_ARN_STAGING",
            "AWS_ACCESS_KEY_ID",
            "AWS_SECRET_ACCESS_KEY",
            "GH_PAT"
        ]
        
        # Search for secret patterns in code
        for secret_var in secret_env_vars:
            # Use grep to search
            code, stdout, stderr = self.run_command([
                "grep", "-r", "-n", secret_var,
                "--include=*.py", "--include=*.sh", "--include=*.yml", "--include=*.yaml",
                "."
            ])
            
            if code == 0 and stdout:
                lines = stdout.strip().split('\n')
                for line in lines[:20]:  # Limit to first 20 occurrences
                    parts = line.split(':', 2)
                    if len(parts) >= 3:
                        filepath, line_num, content = parts[0], parts[1], parts[2]
                        
                        # Check if this looks like a hardcoded secret (not just env var reference)
                        if re.search(r'=\s*["\'][a-zA-Z0-9_-]{20,}["\']', content):
                            # Redact the value
                            redacted_content = re.sub(
                                r'(["\'])([a-zA-Z0-9_-]{20,})(["\'])',
                                lambda m: f"{m.group(1)}***{m.group(2)[-4:]}{m.group(3)}",
                                content
                            )
                            found_secrets.append({
                                "file": filepath,
                                "line": line_num,
                                "snippet": redacted_content.strip(),
                                "variable": secret_var
                            })
        
        # Find example config files
        example_files = [
            ".env.example",
            "orchestrator/.env.example",
            "orchestrator/samconfig.toml.example",
            "orchestrator/scripts/validation_config.example.json",
            "orchestrator/scripts/staging_config.example.json",
            "orchestrator/scripts/doublecheck_config.example.json",
            "server/.env.example",
            "serverless/.env.example"
        ]
        
        for example_file in example_files:
            full_path = os.path.join(self.repo_path, example_file)
            if os.path.exists(full_path):
                try:
                    with open(full_path, 'r') as f:
                        content = f.read()
                        
                        # Extract env var names
                        env_vars = re.findall(r'^([A-Z_][A-Z0-9_]*)\s*=', content, re.MULTILINE)
                        
                        example_configs.append({
                            "file": example_file,
                            "variables": env_vars
                        })
                        
                        # Map to GitHub secret names
                        for var in env_vars:
                            if 'TOKEN' in var or 'SECRET' in var or 'KEY' in var:
                                # Map to expected GitHub secret name
                                github_secret_name = var
                                if var.startswith('VITE_'):
                                    github_secret_name = var  # Keep VITE_ prefix
                                elif 'STAGING' not in var and var not in ['GITHUB_TOKEN', 'DISCORD_BOT_TOKEN']:
                                    # Add STAGING prefix for staging-specific secrets
                                    github_secret_name = f"STAGING_{var}"
                                
                                secret_mappings[var] = github_secret_name
                
                except Exception as e:
                    self.log(f"Could not parse {example_file}: {e}", "WARNING")
        
        result = SecretsCheckResult(
            found_secrets=found_secrets,
            example_configs=example_configs,
            secret_mappings=secret_mappings,
            status="PASS" if len(found_secrets) == 0 else "WARNING"
        )
        
        self.secrets_result = result
        self.log(f"Secrets check complete: {len(found_secrets)} potential secrets found", 
                "SUCCESS" if len(found_secrets) == 0 else "WARNING")
        return result
    
    # ============================================
    # Task 3: Workflows & CI Scan
    # ============================================
    
    def perform_workflow_scan(self) -> WorkflowScanResult:
        """Scan GitHub Actions workflows for triggers, secrets, and tests"""
        self.log("Scanning workflows and CI...", "PROGRESS")
        
        workflows = []
        all_referenced_secrets = set()
        total_tests = 0
        flaky_tests = []
        
        # Find workflow files
        workflow_dir = os.path.join(self.repo_path, ".github/workflows")
        if os.path.exists(workflow_dir):
            for filename in os.listdir(workflow_dir):
                if filename.endswith(('.yml', '.yaml')):
                    workflow_path = os.path.join(workflow_dir, filename)
                    
                    try:
                        with open(workflow_path, 'r') as f:
                            content = f.read()
                            
                            # Extract workflow name
                            name_match = re.search(r'name:\s*(.+)', content)
                            name = name_match.group(1).strip() if name_match else filename
                            
                            # Extract triggers
                            triggers = []
                            if 'workflow_dispatch' in content:
                                triggers.append('workflow_dispatch')
                            if 'push:' in content:
                                triggers.append('push')
                            if 'pull_request:' in content:
                                triggers.append('pull_request')
                            if 'schedule:' in content:
                                triggers.append('schedule')
                            
                            # Extract referenced secrets/env vars
                            secrets_in_workflow = set()
                            secret_patterns = [
                                r'\$\{\{\s*secrets\.([A-Z_][A-Z0-9_]*)\s*\}\}',
                                r'\$\{\{\s*env\.([A-Z_][A-Z0-9_]*)\s*\}\}',
                                r'env:\s*\n\s+([A-Z_][A-Z0-9_]*):',
                            ]
                            
                            for pattern in secret_patterns:
                                matches = re.findall(pattern, content)
                                secrets_in_workflow.update(matches)
                            
                            all_referenced_secrets.update(secrets_in_workflow)
                            
                            workflows.append({
                                "name": name,
                                "file": f".github/workflows/{filename}",
                                "triggers": triggers,
                                "secrets": list(secrets_in_workflow)
                            })
                            
                            # Check if this is a test workflow
                            if 'pytest' in content or 'test' in filename.lower():
                                # Try to estimate test count
                                test_pattern = r'def test_\w+'
                                test_files_pattern = r'tests?/.*\.py'
                                # This is a rough estimate - actual count would require parsing test files
                                total_tests += 10  # Placeholder
                    
                    except Exception as e:
                        self.log(f"Could not parse workflow {filename}: {e}", "WARNING")
        
        # Count actual tests by scanning test directory
        test_dir = os.path.join(self.repo_path, "orchestrator/tests")
        if os.path.exists(test_dir):
            actual_test_count = 0
            for filename in os.listdir(test_dir):
                if filename.startswith('test_') and filename.endswith('.py'):
                    try:
                        with open(os.path.join(test_dir, filename), 'r') as f:
                            content = f.read()
                            # Count test functions
                            test_functions = re.findall(r'def test_\w+', content)
                            actual_test_count += len(test_functions)
                    except:
                        pass
            
            if actual_test_count > 0:
                total_tests = actual_test_count
        
        # Check for unmapped secrets
        unmapped_secrets = []
        if self.secrets_result:
            documented_secrets = set(self.secrets_result.secret_mappings.keys())
            for secret in all_referenced_secrets:
                if secret not in documented_secrets and secret not in self.secrets_result.secret_mappings.values():
                    unmapped_secrets.append(secret)
        
        # Analyze PRs for flaky tests (if GitHub token available)
        if self.github_token:
            flaky_tests = self._analyze_prs_for_flaky_tests()
        
        result = WorkflowScanResult(
            workflows=workflows,
            referenced_secrets=sorted(list(all_referenced_secrets)),
            unmapped_secrets=unmapped_secrets,
            total_tests=total_tests,
            flaky_tests=flaky_tests,
            status="PASS" if len(unmapped_secrets) == 0 else "WARNING"
        )
        
        self.workflow_result = result
        self.log(f"Workflow scan complete: {len(workflows)} workflows, {len(all_referenced_secrets)} secrets referenced", "SUCCESS")
        return result
    
    def _analyze_prs_for_flaky_tests(self) -> List[Dict[str, Any]]:
        """Analyze PRs 50-71 for flaky test mentions"""
        flaky_tests = []
        
        if not self.github_token:
            return flaky_tests
        
        self.log(f"Analyzing PRs {self.config.pr_scan_start}-{self.config.pr_scan_end} for flaky tests...", "PROGRESS")
        
        headers = {
            "Authorization": f"token {self.github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        for pr_num in range(self.config.pr_scan_start, self.config.pr_scan_end + 1):
            try:
                # Fetch PR details
                url = f"https://api.github.com/repos/{self.config.repo}/pulls/{pr_num}"
                response = requests.get(url, headers=headers, timeout=10)
                
                if response.status_code == 200:
                    pr_data = response.json()
                    
                    # Check title and body for flaky test mentions
                    title = pr_data.get('title', '').lower()
                    body = pr_data.get('body', '').lower() if pr_data.get('body') else ''
                    
                    flaky_keywords = ['flaky', 'intermittent', 'unstable', 'failing randomly']
                    
                    for keyword in flaky_keywords:
                        if keyword in title or keyword in body:
                            # Extract test names if mentioned
                            test_names = re.findall(r'test_\w+', body)
                            
                            flaky_tests.append({
                                "pr": pr_num,
                                "title": pr_data.get('title'),
                                "tests": test_names[:5] if test_names else ["unspecified"],
                                "keyword": keyword
                            })
                            break
                
                # Rate limiting
                time.sleep(0.5)
                
            except Exception as e:
                if self.config.verbose:
                    self.log(f"Could not analyze PR {pr_num}: {e}", "WARNING")
        
        return flaky_tests
    
    # ============================================
    # Task 4: Registration & Smoke Test Commands
    # ============================================
    
    def provide_registration_commands(self) -> Dict[str, Any]:
        """Provide exact commands for registration and smoke tests"""
        self.log("Generating registration and smoke test commands...", "PROGRESS")
        
        commands = {
            "registration": [
                {
                    "description": "Register staging Discord slash commands",
                    "command": "cd orchestrator && ./register_discord_commands_staging.sh",
                    "required_env": ["STAGING_DISCORD_BOT_TOKEN", "STAGING_DISCORD_APPLICATION_ID", "STAGING_DISCORD_GUILD_ID"],
                    "notes": "Interactive script - will prompt for credentials"
                },
                {
                    "description": "Register staging slash commands (alternative)",
                    "command": "cd orchestrator/scripts && ./register_staging_slash_commands.sh",
                    "required_env": ["STAGING_DISCORD_BOT_TOKEN", "STAGING_DISCORD_APPLICATION_ID", "STAGING_DISCORD_GUILD_ID"],
                    "notes": "Requires env vars to be set beforehand"
                },
                {
                    "description": "Validate Discord slash commands registration",
                    "command": "cd orchestrator/scripts && python validate_discord_slash_commands.py",
                    "required_env": ["STAGING_DISCORD_BOT_TOKEN", "STAGING_DISCORD_APPLICATION_ID"],
                    "notes": "Verifies commands are properly registered"
                }
            ],
            "deployment": [
                {
                    "description": "Build SAM application",
                    "command": "cd orchestrator && sam build",
                    "required_env": [],
                    "notes": "Builds Lambda functions and dependencies"
                },
                {
                    "description": "Deploy to staging",
                    "command": "cd orchestrator && sam deploy --config-file samconfig.toml",
                    "required_env": ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"],
                    "notes": "Requires samconfig.toml to be configured for staging"
                },
                {
                    "description": "Validate deployment",
                    "command": "cd orchestrator/scripts && python validate_deployment.py",
                    "required_env": ["AWS_REGION"],
                    "notes": "Checks Lambda functions and API Gateway"
                }
            ],
            "smoke_tests": [
                {
                    "description": "Run bot smoke tests via GitHub Actions",
                    "command": 'gh workflow run bot-smoke.yml --ref main',
                    "required_env": ["GITHUB_TOKEN"],
                    "notes": "Or use workflow_dispatch in GitHub UI"
                },
                {
                    "description": "Trigger bot smoke tests via curl",
                    "command": 'curl -X POST -H "Authorization: token $GITHUB_TOKEN" -H "Accept: application/vnd.github.v3+json" https://api.github.com/repos/gcolon75/Project-Valine/actions/workflows/bot-smoke.yml/dispatches -d \'{"ref":"main"}\'',
                    "required_env": ["GITHUB_TOKEN"],
                    "notes": "Manual trigger via GitHub API"
                },
                {
                    "description": "Run tests locally",
                    "command": "cd orchestrator && python -m pytest tests/ -v",
                    "required_env": [],
                    "notes": "Runs unit tests locally"
                }
            ],
            "validation": [
                {
                    "description": "Run Phase 5 staging validation",
                    "command": "cd orchestrator/scripts && ./run_phase5_validation.sh",
                    "required_env": ["STAGING_DISCORD_BOT_TOKEN", "STAGING_GITHUB_TOKEN"],
                    "notes": "Comprehensive Phase 5 feature validation"
                },
                {
                    "description": "Run Phase 5 super agent",
                    "command": "cd orchestrator/scripts && python phase5_super_agent.py run --config super_agent_config.json",
                    "required_env": ["GITHUB_TOKEN", "DISCORD_BOT_TOKEN"],
                    "notes": "Speedrun staging checks with receipts"
                }
            ]
        }
        
        return commands
    
    def run_registration(self):
        """Run registration if authorized"""
        if not self.config.allow_run_registration:
            self.log("Registration not authorized. Set --allow-run-registration to enable.", "WARNING")
            return
        
        # Ask for confirmation
        print("\n⚠️  About to run registration commands. Please confirm:")
        print("1. STAGING_DISCORD_GUILD_ID is set correctly")
        print("2. All required GitHub secrets exist in Settings → Secrets & variables")
        print("3. You have reviewed the registration scripts")
        response = input("\nType 'Yes' to proceed: ")
        
        if response != "Yes":
            self.log("Registration cancelled by user", "INFO")
            return
        
        self.log("Running registration commands...", "PROGRESS")
        
        # Check if required env vars are set
        required_vars = ["STAGING_DISCORD_BOT_TOKEN", "STAGING_DISCORD_APPLICATION_ID", "STAGING_DISCORD_GUILD_ID"]
        missing_vars = [var for var in required_vars if not os.environ.get(var)]
        
        if missing_vars:
            self.log(f"Missing required environment variables: {', '.join(missing_vars)}", "ERROR")
            return
        
        # Run registration
        code, stdout, stderr = self.run_command([
            "bash", "-c",
            "cd orchestrator/scripts && ./register_staging_slash_commands.sh"
        ])
        
        if code == 0:
            self.log("Registration completed successfully", "SUCCESS")
            print(stdout)
        else:
            self.log(f"Registration failed with exit code {code}", "ERROR")
            print(stderr)
    
    # ============================================
    # Task 5: E2E /triage Dry-Run
    # ============================================
    
    def guide_e2e_triage_test(self) -> Dict[str, Any]:
        """Guide user through E2E /triage test"""
        self.log("Preparing E2E /triage dry-run guide...", "PROGRESS")
        
        guide = {
            "prerequisites": [
                "Test PR must exist (user provides PR number)",
                "Discord bot must be running in staging guild",
                "Bot must have /triage command registered",
                "User must have permissions to trigger /triage in staging"
            ],
            "steps": [
                {
                    "step": 1,
                    "action": "Create or identify test PR",
                    "details": "Use an existing PR with known issues or create a new test PR",
                    "command": None
                },
                {
                    "step": 2,
                    "action": "Trigger /triage command in Discord",
                    "details": "In staging Discord guild, run: /triage <pr_number>",
                    "command": "/triage {pr_number}"
                },
                {
                    "step": 3,
                    "action": "Monitor GitHub Actions workflow",
                    "details": "Watch for workflow run triggered by triage command",
                    "command": "gh run list --workflow=phase5-triage-agent.yml --limit 1"
                },
                {
                    "step": 4,
                    "action": "Poll for completion",
                    "details": "Wait for workflow to complete (poll every 60s)",
                    "command": "gh run watch <run_id>"
                },
                {
                    "step": 5,
                    "action": "Check for draft PR creation",
                    "details": "If triage found fixable issues, check if draft PR was created",
                    "command": "gh pr list --state open --draft --limit 5"
                },
                {
                    "step": 6,
                    "action": "Review triage results",
                    "details": "Check Discord for triage report and GitHub for any created PRs",
                    "command": None
                }
            ],
            "failure_handling": [
                "If workflow fails, download logs for analysis",
                "Retry flaky jobs up to 2 times automatically",
                "Parse logs for root cause and redact secrets",
                "Report findings in Discord channel"
            ]
        }
        
        if self.config.test_pr_number:
            self.log(f"Test PR specified: #{self.config.test_pr_number}", "INFO")
            guide["test_pr"] = self.config.test_pr_number
            
            # Could automate triggering here if authorized
            if self.config.allow_create_draft_prs:
                self.log("Automated triggering not implemented - manual Discord interaction required", "WARNING")
        
        return guide
    
    # ============================================
    # Task 6: Draft PR Policy Verification
    # ============================================
    
    def verify_draft_pr_policies(self) -> Dict[str, Any]:
        """Verify draft PR creation code and guardrails"""
        self.log("Verifying draft PR policies and guardrails...", "PROGRESS")
        
        verification = {
            "policies": [],
            "missing_guardrails": [],
            "suggestions": []
        }
        
        # Check triage agent for PR creation logic
        triage_agent_path = "orchestrator/scripts/phase5_triage_agent.py"
        if os.path.exists(os.path.join(self.repo_path, triage_agent_path)):
            try:
                with open(os.path.join(self.repo_path, triage_agent_path), 'r') as f:
                    content = f.read()
                    
                    # Check for branch naming
                    if 'auto/triage/fix/' in content:
                        verification["policies"].append({
                            "policy": "Branch naming convention",
                            "location": triage_agent_path,
                            "pattern": "auto/triage/fix/pr-<num>/<timestamp>",
                            "status": "FOUND"
                        })
                    else:
                        verification["missing_guardrails"].append({
                            "guardrail": "Standard branch naming convention",
                            "severity": "MEDIUM"
                        })
                    
                    # Check for draft flag
                    if 'draft' in content.lower() and ('draft=True' in content or 'draft: true' in content):
                        verification["policies"].append({
                            "policy": "Default to draft PRs",
                            "location": triage_agent_path,
                            "status": "FOUND"
                        })
                    else:
                        verification["missing_guardrails"].append({
                            "guardrail": "Enforce draft-only PR creation",
                            "severity": "HIGH"
                        })
                    
                    # Check for change caps
                    if 'max_files' in content or 'max_lines' in content or 'MAX_' in content:
                        verification["policies"].append({
                            "policy": "Change size limits",
                            "location": triage_agent_path,
                            "status": "FOUND"
                        })
                    else:
                        verification["missing_guardrails"].append({
                            "guardrail": "Maximum files/lines change limits",
                            "severity": "MEDIUM"
                        })
                    
                    # Check for secret detection
                    if 'redact' in content.lower() or 'secret' in content.lower():
                        verification["policies"].append({
                            "policy": "Secret detection/redaction",
                            "location": triage_agent_path,
                            "status": "FOUND"
                        })
                    else:
                        verification["missing_guardrails"].append({
                            "guardrail": "Pre-commit secret detection",
                            "severity": "HIGH"
                        })
            
            except Exception as e:
                self.log(f"Could not verify {triage_agent_path}: {e}", "WARNING")
        
        # Generate suggestions for missing guardrails
        if verification["missing_guardrails"]:
            verification["suggestions"] = self._generate_guardrail_suggestions(verification["missing_guardrails"])
        
        return verification
    
    def _generate_guardrail_suggestions(self, missing_guardrails: List[Dict[str, Any]]) -> List[str]:
        """Generate code suggestions for missing guardrails"""
        suggestions = []
        
        for guardrail in missing_guardrails:
            name = guardrail["guardrail"]
            
            if "draft-only" in name.lower():
                suggestions.append("""
# Suggestion: Enforce draft-only PR creation
# In PR creation function, ensure draft=True is always set:

def create_pr(self, branch, title, body):
    pr = self.github_client.create_pull_request(
        head=branch,
        base=self.config.base_ref,
        title=title,
        body=body,
        draft=True  # Always create as draft
    )
    return pr
""")
            
            elif "change size limits" in name.lower():
                suggestions.append("""
# Suggestion: Add change size limits
# In agent config:

@dataclass
class TriageConfig:
    max_files_changed: int = 10
    max_lines_changed: int = 500
    
# Before creating PR:

def validate_changes(self, changes):
    if len(changes['files']) > self.config.max_files_changed:
        raise ValueError(f"Too many files changed: {len(changes['files'])}")
    
    total_lines = sum(f['additions'] + f['deletions'] for f in changes['files'])
    if total_lines > self.config.max_lines_changed:
        raise ValueError(f"Too many lines changed: {total_lines}")
""")
            
            elif "secret detection" in name.lower():
                suggestions.append("""
# Suggestion: Add pre-commit secret detection
# Before committing changes:

def check_for_secrets(self, content: str) -> List[str]:
    secret_patterns = [
        r'ghp_[a-zA-Z0-9]{36}',  # GitHub tokens
        r'sk-[a-zA-Z0-9]{20,}',  # API keys
        r'[a-zA-Z0-9_]{32,}',    # Generic tokens
    ]
    
    found_secrets = []
    for pattern in secret_patterns:
        if re.search(pattern, content):
            found_secrets.append(pattern)
    
    return found_secrets
""")
        
        return suggestions
    
    # ============================================
    # Task 7: Generate Report
    # ============================================
    
    def generate_report(self) -> OperationalReadinessReport:
        """Generate comprehensive operational readiness report"""
        self.log("Generating operational readiness report...", "PROGRESS")
        
        # Build summary
        summary_lines = []
        status = "PASS"
        
        if self.recon_result:
            summary_lines.append(f"✅ Found {len(self.recon_result.entry_points)} entry points and {len(self.recon_result.slash_commands)} slash commands")
        
        if self.secrets_result:
            if len(self.secrets_result.found_secrets) > 0:
                summary_lines.append(f"⚠️  Found {len(self.secrets_result.found_secrets)} potential secret leaks")
                status = "WARNING"
            else:
                summary_lines.append("✅ No hardcoded secrets found in code")
        
        if self.workflow_result:
            if len(self.workflow_result.unmapped_secrets) > 0:
                summary_lines.append(f"⚠️  {len(self.workflow_result.unmapped_secrets)} secrets referenced but not documented")
                status = "WARNING"
            else:
                summary_lines.append(f"✅ All {len(self.workflow_result.referenced_secrets)} workflow secrets are documented")
        
        summary = " | ".join(summary_lines)
        
        # Build findings
        findings = []
        
        if self.recon_result:
            findings.append(f"**Entry Points**: {len(self.recon_result.entry_points)} found")
            findings.append(f"**Slash Commands**: {len(self.recon_result.slash_commands)} implemented")
            findings.append(f"**Registration Scripts**: {len(self.recon_result.registration_scripts)} available")
        
        if self.secrets_result:
            findings.append(f"**Secret Checks**: {len(self.secrets_result.found_secrets)} potential leaks")
            findings.append(f"**Config Files**: {len(self.secrets_result.example_configs)} example configs mapped")
            if len(self.secrets_result.found_secrets) > 0:
                findings.append("⚠️  **Action Required**: Review and remove hardcoded secrets")
        
        if self.workflow_result:
            findings.append(f"**Workflows**: {len(self.workflow_result.workflows)} GitHub Actions workflows")
            findings.append(f"**Tests**: ~{self.workflow_result.total_tests} test cases found")
            findings.append(f"**Flaky Tests**: {len(self.workflow_result.flaky_tests)} identified in PRs")
            if len(self.workflow_result.unmapped_secrets) > 0:
                findings.append(f"⚠️  **Unmapped Secrets**: {', '.join(self.workflow_result.unmapped_secrets[:5])}")
        
        # Build action plan
        action_plan = [
            {
                "priority": 1,
                "action": "Verify GitHub repository secrets exist",
                "details": "Settings → Secrets & variables → Actions",
                "time_estimate": "5 min",
                "required_secrets": list(self.secrets_result.secret_mappings.values()) if self.secrets_result else []
            },
            {
                "priority": 2,
                "action": "Run staging command registration",
                "details": "Execute: cd orchestrator && ./register_discord_commands_staging.sh",
                "time_estimate": "10 min",
                "blockers": ["Staging guild ID", "Bot token"]
            },
            {
                "priority": 3,
                "action": "Trigger bot smoke tests",
                "details": "Run: gh workflow run bot-smoke.yml",
                "time_estimate": "5 min",
                "depends_on": ["GitHub token"]
            },
            {
                "priority": 4,
                "action": "Execute E2E /triage test",
                "details": "Test with PR (user provides number)",
                "time_estimate": "15 min",
                "depends_on": ["Registration complete", "Test PR ready"]
            },
            {
                "priority": 5,
                "action": "Review and strengthen guardrails",
                "details": "Ensure draft-only, change limits, secret detection",
                "time_estimate": "30 min",
                "optional": True
            }
        ]
        
        # Build evidence
        evidence = {
            "recon": asdict(self.recon_result) if self.recon_result else {},
            "secrets": redact_secrets(asdict(self.secrets_result)) if self.secrets_result else {},
            "workflows": asdict(self.workflow_result) if self.workflow_result else {},
            "draft_pr_policies": self.verify_draft_pr_policies()
        }
        
        report = OperationalReadinessReport(
            timestamp=datetime.now(timezone.utc).isoformat(),
            correlation_id=self.config.correlation_id,
            repo=self.config.repo,
            summary=summary,
            findings=findings,
            action_plan=action_plan,
            evidence=evidence
        )
        
        return report
    
    def print_report(self, report: OperationalReadinessReport):
        """Print formatted report to console"""
        print("\n" + "="*80)
        print("🚀 OPERATIONAL READINESS VALIDATION REPORT")
        print("="*80)
        print(f"\n📅 Timestamp: {report.timestamp}")
        print(f"🔖 Correlation ID: {report.correlation_id}")
        print(f"📦 Repository: {report.repo}")
        
        print("\n" + "-"*80)
        print("📊 SUMMARY")
        print("-"*80)
        print(report.summary)
        
        print("\n" + "-"*80)
        print("🔍 FINDINGS")
        print("-"*80)
        for i, finding in enumerate(report.findings, 1):
            print(f"{i}. {finding}")
        
        print("\n" + "-"*80)
        print("📋 ACTION PLAN")
        print("-"*80)
        for item in report.action_plan:
            priority_emoji = ["🔴", "🟠", "🟡", "🔵", "⚪"][min(item["priority"]-1, 4)]
            print(f"\n{priority_emoji} Priority {item['priority']}: {item['action']}")
            print(f"   Details: {item['details']}")
            print(f"   Time: {item['time_estimate']}")
            if 'depends_on' in item:
                print(f"   Depends on: {', '.join(item['depends_on'])}")
            if 'required_secrets' in item and item['required_secrets']:
                print(f"   Required secrets: {', '.join(item['required_secrets'][:5])}")
                if len(item['required_secrets']) > 5:
                    print(f"   ... and {len(item['required_secrets']) - 5} more")
        
        print("\n" + "-"*80)
        print("📁 EVIDENCE")
        print("-"*80)
        
        # Recon evidence
        if report.evidence.get('recon'):
            recon = report.evidence['recon']
            print(f"\n**Entry Points** ({len(recon.get('entry_points', []))} found):")
            for ep in recon.get('entry_points', [])[:5]:
                print(f"  • {ep['path']}: {ep['summary']}")
            
            print(f"\n**Slash Commands** ({len(recon.get('slash_commands', []))} found):")
            for cmd in recon.get('slash_commands', [])[:10]:
                print(f"  • {cmd['name']} (registered in {cmd['file']})")
        
        # Secrets evidence
        if report.evidence.get('secrets'):
            secrets = report.evidence['secrets']
            if secrets.get('found_secrets'):
                print(f"\n**⚠️  Potential Secret Leaks** ({len(secrets['found_secrets'])} found):")
                for secret in secrets['found_secrets'][:5]:
                    print(f"  • {secret['file']}:{secret['line']}")
                    print(f"    {secret['snippet']}")
            
            print(f"\n**Config Files** ({len(secrets.get('example_configs', []))} found):")
            for config in secrets.get('example_configs', [])[:5]:
                print(f"  • {config['file']}: {len(config.get('variables', []))} variables")
        
        # Workflows evidence
        if report.evidence.get('workflows'):
            workflows = report.evidence['workflows']
            print(f"\n**Workflows** ({len(workflows.get('workflows', []))} found):")
            for wf in workflows.get('workflows', [])[:10]:
                triggers = ', '.join(wf.get('triggers', []))
                print(f"  • {wf['name']} (triggers: {triggers})")
            
            if workflows.get('unmapped_secrets'):
                print(f"\n**⚠️  Unmapped Secrets**:")
                for secret in workflows['unmapped_secrets'][:10]:
                    print(f"  • {secret}")
            
            if workflows.get('flaky_tests'):
                print(f"\n**Flaky Tests** ({len(workflows['flaky_tests'])} found in PRs):")
                for flaky in workflows['flaky_tests'][:5]:
                    print(f"  • PR #{flaky['pr']}: {flaky['keyword']} - {', '.join(flaky['tests'][:3])}")
        
        # Draft PR policies
        if report.evidence.get('draft_pr_policies'):
            policies = report.evidence['draft_pr_policies']
            print(f"\n**Draft PR Policies** ({len(policies.get('policies', []))} found):")
            for policy in policies.get('policies', []):
                print(f"  ✅ {policy['policy']} - {policy['status']}")
            
            if policies.get('missing_guardrails'):
                print(f"\n**⚠️  Missing Guardrails** ({len(policies['missing_guardrails'])} found):")
                for guardrail in policies['missing_guardrails']:
                    severity_emoji = {"HIGH": "🔴", "MEDIUM": "🟠", "LOW": "🟡"}.get(guardrail['severity'], "⚪")
                    print(f"  {severity_emoji} {guardrail['guardrail']} (severity: {guardrail['severity']})")
        
        print("\n" + "="*80)
        print("ℹ️  NOTE: I cannot read GitHub repository secrets.")
        print("   Please verify them in: Settings → Secrets & variables → Actions")
        print("="*80)
        
        print("\n❓ May I create draft PRs for low-risk fixes? (Yes/No)")
        print("   (Not automated in this run - requires explicit authorization)")
        
        print("\n✅ Report generation complete!")
    
    def save_report(self, report: OperationalReadinessReport):
        """Save report to file"""
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        report_file = os.path.join(
            self.config.evidence_output_dir,
            f"operational_readiness_report_{timestamp}.json"
        )
        
        with open(report_file, 'w') as f:
            json.dump(asdict(report), f, indent=2)
        
        self.log(f"Report saved to: {report_file}", "SUCCESS")
        
        # Also save a markdown version
        md_file = report_file.replace('.json', '.md')
        with open(md_file, 'w') as f:
            f.write(f"# Operational Readiness Report\n\n")
            f.write(f"**Timestamp**: {report.timestamp}\n")
            f.write(f"**Correlation ID**: {report.correlation_id}\n")
            f.write(f"**Repository**: {report.repo}\n\n")
            f.write(f"## Summary\n\n{report.summary}\n\n")
            f.write(f"## Findings\n\n")
            for finding in report.findings:
                f.write(f"- {finding}\n")
            f.write(f"\n## Action Plan\n\n")
            for item in report.action_plan:
                f.write(f"### Priority {item['priority']}: {item['action']}\n")
                f.write(f"- **Details**: {item['details']}\n")
                f.write(f"- **Time**: {item['time_estimate']}\n")
                if 'depends_on' in item:
                    f.write(f"- **Depends on**: {', '.join(item['depends_on'])}\n")
                f.write("\n")
        
        self.log(f"Markdown report saved to: {md_file}", "SUCCESS")
    
    # ============================================
    # Main Execution
    # ============================================
    
    def run(self):
        """Run the complete operational readiness validation"""
        print("\n" + "="*80)
        print("On it — running repo recon now.")
        print("="*80 + "\n")
        
        try:
            # Task 1: Repo Recon
            self.perform_repo_recon()
            
            # Task 2: Secrets Check
            self.perform_secrets_check()
            
            # Task 3: Workflow Scan
            self.perform_workflow_scan()
            
            # Task 4: Registration Commands
            commands = self.provide_registration_commands()
            self.log(f"Generated {len(commands)} command categories", "SUCCESS")
            
            # Task 5: E2E Triage Guide
            e2e_guide = self.guide_e2e_triage_test()
            self.log(f"E2E test guide prepared with {len(e2e_guide['steps'])} steps", "SUCCESS")
            
            # Task 6: Draft PR Policies
            pr_policies = self.verify_draft_pr_policies()
            self.log(f"Verified {len(pr_policies['policies'])} PR policies", "SUCCESS")
            
            # Task 7: Generate Report
            report = self.generate_report()
            
            # Print report to console
            self.print_report(report)
            
            # Save report to files
            self.save_report(report)
            
            self.log("Operational readiness validation complete!", "SUCCESS")
            
        except Exception as e:
            self.log(f"Validation failed: {e}", "ERROR")
            if self.config.verbose:
                traceback.print_exc()
            sys.exit(1)


# ============================================
# CLI Interface
# ============================================

def generate_example_config():
    """Generate example configuration file"""
    config = {
        "repo": "gcolon75/Project-Valine",
        "base_ref": "main",
        "github_token": "ENV:GITHUB_TOKEN",
        "test_pr_number": None,
        "allow_run_registration": False,
        "allow_create_draft_prs": False,
        "dry_run": True,
        "verbose": True,
        "pr_scan_start": 50,
        "pr_scan_end": 71,
        "evidence_output_dir": "./readiness_evidence"
    }
    
    config_file = "operational_readiness_config.json"
    with open(config_file, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"✅ Example configuration saved to: {config_file}")
    print("\nEdit this file and run:")
    print(f"  python operational_readiness_agent.py run --config {config_file}")


def main():
    parser = argparse.ArgumentParser(
        description="Operational Readiness Validation Agent for Discord AI Triage System",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Run command
    run_parser = subparsers.add_parser('run', help='Run operational readiness validation')
    run_parser.add_argument('--repo', default='gcolon75/Project-Valine', help='Repository (owner/name)')
    run_parser.add_argument('--config', help='Path to JSON config file')
    run_parser.add_argument('--test-pr', type=int, help='Test PR number for E2E validation')
    run_parser.add_argument('--allow-run-registration', action='store_true', 
                           help='Allow running registration commands')
    run_parser.add_argument('--allow-create-draft-prs', action='store_true',
                           help='Allow creating draft PRs (requires explicit confirmation)')
    run_parser.add_argument('--verbose', action='store_true', default=True, help='Verbose output')
    
    # Generate config command
    gen_parser = subparsers.add_parser('generate-config', help='Generate example config file')
    
    args = parser.parse_args()
    
    if args.command == 'generate-config':
        generate_example_config()
        return
    
    elif args.command == 'run':
        # Load config
        if args.config:
            with open(args.config, 'r') as f:
                config_dict = json.load(f)
            
            # Replace ENV: references with actual env vars
            for key, value in config_dict.items():
                if isinstance(value, str) and value.startswith('ENV:'):
                    env_var = value[4:]
                    config_dict[key] = os.environ.get(env_var)
            
            config = OperationalReadinessConfig(**config_dict)
        else:
            config = OperationalReadinessConfig(repo=args.repo)
        
        # Override with CLI args
        if args.test_pr:
            config.test_pr_number = args.test_pr
        if args.allow_run_registration:
            config.allow_run_registration = True
        if args.allow_create_draft_prs:
            config.allow_create_draft_prs = True
        config.verbose = args.verbose
        
        # Run agent
        agent = OperationalReadinessAgent(config)
        agent.run()
    
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
