#!/usr/bin/env python3
"""
Phase 5 Failed-Run Triage & Fix Agent

Mission: Find what failed, why it failed, and produce a minimal, safe fix 
(or a clear remediation playbook). If safe and authorized, open a PR with the fix.

This agent triages failing Phase 5 jobs/PR runs (CI, agent runs, or registration scripts),
produces a concise actionable triage report with root cause, failing test/log excerpts,
files/lines implicated, and an exact minimal fix.

Usage:
    python phase5_triage_agent.py run --repo owner/repo --failure-ref 49
    python phase5_triage_agent.py run --repo owner/repo --failure-ref 1234567890 --auto-fix
    python phase5_triage_agent.py generate-config
    python phase5_triage_agent.py --help
"""

import os
import sys
import json
import time
import argparse
import hashlib
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
class TriageConfig:
    """Configuration for Phase 5 Triage Agent"""
    # Repository
    repo: str = "gcolon75/Project-Valine"
    failure_ref: Union[str, int] = None  # PR number, workflow run id, or agent run id
    
    # Execution mode
    allow_auto_fix: bool = False
    actor: str = "github-actions"
    
    # Credentials (from environment)
    github_token: Optional[str] = None  # ENV:GITHUB_TOKEN
    
    # Branch naming
    fix_branch_prefix: str = "fix/phase5-triage-"
    
    # Timeouts (seconds)
    timeout_http: int = 30
    timeout_git: int = 60
    
    # Flags
    dry_run: bool = False
    verbose: bool = True
    redaction_enabled: bool = True
    
    # Output
    output_dir: str = "./triage_output"
    correlation_id_prefix: str = "TRIAGE"

@dataclass
class FailureContext:
    """Context about the failure"""
    ref_type: str  # "pr", "workflow_run", "agent_run"
    ref_id: Union[str, int]
    repo: str
    commit_sha: Optional[str] = None
    branch: Optional[str] = None
    pr_number: Optional[int] = None
    workflow_run_id: Optional[int] = None
    workflow_name: Optional[str] = None
    job_name: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
@dataclass
class FailureInfo:
    """Information about a specific failure"""
    test_name: Optional[str] = None
    command: Optional[str] = None
    exit_code: Optional[int] = None
    error_message: str = ""
    stack_trace: List[str] = field(default_factory=list)
    log_excerpt: List[str] = field(default_factory=list)
    affected_files: List[str] = field(default_factory=list)
    category: str = "unknown"  # test_failure, missing_dependency, environment_mismatch, etc.
    
@dataclass
class FixProposal:
    """Proposed fix for the failure"""
    type: str  # "patch", "config", "revert", "playbook"
    description: str
    files_changed: List[str] = field(default_factory=list)
    diff: Optional[str] = None
    commands: List[str] = field(default_factory=list)
    risk_level: str = "low"  # low, medium, high
    confidence: str = "high"  # high, medium, low
    test_plan: str = ""
    
@dataclass
class TriageReport:
    """Complete triage report"""
    context: FailureContext
    failure_summary: str
    root_cause: str
    failure_details: List[FailureInfo]
    proposed_fix: FixProposal
    remediation_options: List[FixProposal]
    pr_url: Optional[str] = None
    next_steps: List[str] = field(default_factory=list)
    rollback_plan: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    correlation_id: str = ""

# ============================================
# Secret Redaction
# ============================================

def redact_secrets(data: Any, show_last_n: int = 4) -> Any:
    """
    Redact secrets from data structures.
    Shows only last N characters as ***abcd.
    
    Args:
        data: Data to redact (dict, list, str, etc.)
        show_last_n: Number of trailing characters to show
    
    Returns:
        Redacted copy of data
    """
    if data is None:
        return None
    
    # Secret patterns in keys
    secret_keys = [
        'token', 'password', 'secret', 'key', 'credential',
        'auth', 'api_key', 'access_key', 'private'
    ]
    
    # Inline patterns (e.g., tokens in strings)
    secret_patterns = [
        r'ghp_[a-zA-Z0-9]{36}',  # GitHub personal access token
        r'ghs_[a-zA-Z0-9]{36}',  # GitHub server token
        r'github_pat_[a-zA-Z0-9_]{82}',  # GitHub fine-grained token
        r'Bearer\s+[a-zA-Z0-9\-._~+/]+=*',  # Bearer tokens
        r'(?i)password["\']?\s*[:=]\s*["\']?[^\s"\']+',
        r'(?i)api[_-]?key["\']?\s*[:=]\s*["\']?[^\s"\']+',
    ]
    
    def _redact_value(value: str) -> str:
        """Redact a string value"""
        if not isinstance(value, str) or len(value) < 8:
            return value
        
        # Check inline patterns
        for pattern in secret_patterns:
            if re.search(pattern, value):
                return f"***{value[-show_last_n:]}" if len(value) > show_last_n else "***"
        
        return value
    
    def _should_redact_key(key: str) -> bool:
        """Check if key name suggests it's a secret"""
        key_lower = key.lower()
        return any(secret in key_lower for secret in secret_keys)
    
    # Process based on type
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            if _should_redact_key(key) and isinstance(value, str) and len(value) > 8:
                result[key] = f"***{value[-show_last_n:]}"
            else:
                result[key] = redact_secrets(value, show_last_n)
        return result
    
    elif isinstance(data, list):
        return [redact_secrets(item, show_last_n) for item in data]
    
    elif isinstance(data, str):
        return _redact_value(data)
    
    else:
        return data

# ============================================
# GitHub API Client
# ============================================

class GitHubClient:
    """Simple GitHub API client for triage operations"""
    
    def __init__(self, token: str, repo: str):
        self.token = token
        self.repo = repo
        self.base_url = "https://api.github.com"
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Phase5-Triage-Agent"
        }
    
    def _request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make HTTP request to GitHub API"""
        url = f"{self.base_url}{endpoint}"
        kwargs.setdefault('headers', self.headers)
        kwargs.setdefault('timeout', 30)
        response = requests.request(method, url, **kwargs)
        response.raise_for_status()
        return response
    
    def get_pr(self, pr_number: int) -> Dict:
        """Get PR details"""
        endpoint = f"/repos/{self.repo}/pulls/{pr_number}"
        return self._request("GET", endpoint).json()
    
    def get_workflow_run(self, run_id: int) -> Dict:
        """Get workflow run details"""
        endpoint = f"/repos/{self.repo}/actions/runs/{run_id}"
        return self._request("GET", endpoint).json()
    
    def get_workflow_run_logs(self, run_id: int) -> str:
        """Get workflow run logs"""
        endpoint = f"/repos/{self.repo}/actions/runs/{run_id}/logs"
        response = self._request("GET", endpoint)
        return response.text
    
    def get_workflow_jobs(self, run_id: int) -> List[Dict]:
        """Get jobs for a workflow run"""
        endpoint = f"/repos/{self.repo}/actions/runs/{run_id}/jobs"
        return self._request("GET", endpoint).json()["jobs"]
    
    def get_job_logs(self, job_id: int) -> str:
        """Get logs for a specific job"""
        endpoint = f"/repos/{self.repo}/actions/jobs/{job_id}/logs"
        response = self._request("GET", endpoint)
        return response.text
    
    def get_pr_files(self, pr_number: int) -> List[Dict]:
        """Get files changed in PR"""
        endpoint = f"/repos/{self.repo}/pulls/{pr_number}/files"
        return self._request("GET", endpoint).json()
    
    def get_commit(self, sha: str) -> Dict:
        """Get commit details"""
        endpoint = f"/repos/{self.repo}/commits/{sha}"
        return self._request("GET", endpoint).json()
    
    def search_code(self, query: str) -> List[Dict]:
        """Search code in repository"""
        endpoint = f"/search/code?q={query}+repo:{self.repo}"
        return self._request("GET", endpoint).json().get("items", [])
    
    def create_branch(self, branch_name: str, base_sha: str) -> Dict:
        """Create a new branch"""
        endpoint = f"/repos/{self.repo}/git/refs"
        data = {
            "ref": f"refs/heads/{branch_name}",
            "sha": base_sha
        }
        return self._request("POST", endpoint, json=data).json()
    
    def create_pr(self, title: str, body: str, head: str, base: str) -> Dict:
        """Create a pull request"""
        endpoint = f"/repos/{self.repo}/pulls"
        data = {
            "title": title,
            "body": body,
            "head": head,
            "base": base
        }
        return self._request("POST", endpoint, json=data).json()

# ============================================
# Triage Agent
# ============================================

class Phase5TriageAgent:
    """Phase 5 Failed-Run Triage & Fix Agent"""
    
    def __init__(self, config: TriageConfig):
        self.config = config
        self.github = None
        self.correlation_id = f"{config.correlation_id_prefix}-{int(time.time())}"
        
        # Initialize GitHub client if token provided
        if config.github_token:
            self.github = GitHubClient(config.github_token, config.repo)
        
        # Create output directory
        Path(config.output_dir).mkdir(parents=True, exist_ok=True)
    
    def log(self, message: str, level: str = "INFO"):
        """Log message with timestamp"""
        if self.config.verbose or level in ["ERROR", "WARNING"]:
            timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [{level}] {message}", flush=True)
    
    def resolve_failure_ref(self) -> FailureContext:
        """
        Resolve failure_ref to a concrete failure context.
        Determines if it's a PR, workflow run, or agent run.
        """
        self.log(f"Resolving failure ref: {self.config.failure_ref}")
        
        failure_ref = self.config.failure_ref
        
        # Try to parse as PR number (integer)
        try:
            pr_number = int(failure_ref)
            if pr_number > 0 and pr_number < 10000:  # Reasonable PR range
                self.log(f"Detected as PR number: {pr_number}")
                return self._resolve_pr(pr_number)
        except (ValueError, TypeError):
            pass
        
        # Try to parse as workflow run ID (large integer)
        try:
            run_id = int(failure_ref)
            if run_id > 1000000000:  # Workflow run IDs are typically 10+ digits
                self.log(f"Detected as workflow run ID: {run_id}")
                return self._resolve_workflow_run(run_id)
        except (ValueError, TypeError):
            pass
        
        # Try to parse as URL
        if isinstance(failure_ref, str) and failure_ref.startswith("http"):
            return self._resolve_url(failure_ref)
        
        raise ValueError(f"Could not resolve failure_ref: {failure_ref}")
    
    def _resolve_pr(self, pr_number: int) -> FailureContext:
        """Resolve PR number to failure context"""
        pr_data = self.github.get_pr(pr_number)
        
        context = FailureContext(
            ref_type="pr",
            ref_id=pr_number,
            repo=self.config.repo,
            pr_number=pr_number,
            commit_sha=pr_data["head"]["sha"],
            branch=pr_data["head"]["ref"]
        )
        
        self.log(f"Resolved to PR #{pr_number}, branch: {context.branch}, SHA: {context.commit_sha}")
        return context
    
    def _resolve_workflow_run(self, run_id: int) -> FailureContext:
        """Resolve workflow run ID to failure context"""
        run_data = self.github.get_workflow_run(run_id)
        
        context = FailureContext(
            ref_type="workflow_run",
            ref_id=run_id,
            repo=self.config.repo,
            workflow_run_id=run_id,
            workflow_name=run_data["name"],
            commit_sha=run_data["head_sha"],
            branch=run_data["head_branch"]
        )
        
        # Try to find associated PR
        if run_data.get("pull_requests"):
            context.pr_number = run_data["pull_requests"][0]["number"]
        
        self.log(f"Resolved to workflow run {run_id}: {context.workflow_name}")
        return context
    
    def _resolve_url(self, url: str) -> FailureContext:
        """Resolve URL to failure context"""
        # Extract workflow run ID from URL
        # Format: https://github.com/owner/repo/actions/runs/12345678
        run_match = re.search(r'/actions/runs/(\d+)', url)
        if run_match:
            run_id = int(run_match.group(1))
            return self._resolve_workflow_run(run_id)
        
        # Extract PR number from URL
        # Format: https://github.com/owner/repo/pull/49
        pr_match = re.search(r'/pull/(\d+)', url)
        if pr_match:
            pr_number = int(pr_match.group(1))
            return self._resolve_pr(pr_number)
        
        raise ValueError(f"Could not extract failure ref from URL: {url}")
    
    def fetch_logs(self, context: FailureContext) -> Tuple[str, List[Dict]]:
        """
        Fetch logs based on failure context.
        Returns (raw_logs, jobs_data)
        """
        self.log("Fetching logs...")
        
        if context.ref_type == "workflow_run":
            jobs = self.github.get_workflow_jobs(context.workflow_run_id)
            
            # Collect logs from failed jobs
            all_logs = []
            for job in jobs:
                if job["conclusion"] == "failure":
                    self.log(f"Fetching logs for failed job: {job['name']}")
                    job_logs = self.github.get_job_logs(job["id"])
                    all_logs.append(f"\n=== Job: {job['name']} ===\n{job_logs}")
            
            return "\n".join(all_logs), jobs
        
        elif context.ref_type == "pr":
            # For PR, we need to find associated workflow runs
            # This is a simplified approach - in production, we'd check multiple runs
            self.log("PR-based triage: looking for recent failed workflow runs")
            return "", []
        
        return "", []
    
    def extract_failures(self, logs: str, jobs: List[Dict]) -> List[FailureInfo]:
        """
        Extract failure information from logs.
        Identifies failing tests, commands, and stack traces.
        """
        self.log("Extracting failure information from logs...")
        failures = []
        
        # Split logs into lines
        log_lines = logs.split('\n')
        
        # Common failure patterns
        patterns = {
            'pytest': r'FAILED (.*?) - (.*)',
            'npm_test': r'npm ERR! Test failed\.',
            'python_error': r'([\w\.]+Error): (.*)',
            'shell_exit': r'Error: Process completed with exit code (\d+)',
            'missing_module': r'ModuleNotFoundError: No module named [\'"](.+)[\'"]',
            'import_error': r'ImportError: (.+)',
        }
        
        # Extract failures
        i = 0
        while i < len(log_lines):
            line = log_lines[i]
            
            # Check for pytest failures
            if re.search(patterns['pytest'], line):
                failure = self._extract_pytest_failure(log_lines, i)
                if failure:
                    failures.append(failure)
            
            # Check for Python errors
            elif re.search(patterns['python_error'], line):
                failure = self._extract_python_error(log_lines, i)
                if failure:
                    failures.append(failure)
            
            # Check for missing module
            elif re.search(patterns['missing_module'], line):
                failure = self._extract_missing_dependency(log_lines, i)
                if failure:
                    failures.append(failure)
            
            i += 1
        
        # If no specific failures found, create a generic failure from job data
        if not failures and jobs:
            for job in jobs:
                if job["conclusion"] == "failure":
                    failures.append(FailureInfo(
                        command=job["name"],
                        error_message=f"Job '{job['name']}' failed",
                        category="job_failure",
                        log_excerpt=self._extract_log_excerpt(logs, job["name"])
                    ))
        
        self.log(f"Extracted {len(failures)} failure(s)")
        return failures
    
    def _extract_pytest_failure(self, log_lines: List[str], start_idx: int) -> Optional[FailureInfo]:
        """Extract pytest failure details"""
        test_name_match = re.search(r'FAILED (.*?) -', log_lines[start_idx])
        if not test_name_match:
            return None
        
        test_name = test_name_match.group(1)
        
        # Look for stack trace and error message
        stack_trace = []
        error_message = ""
        
        for i in range(start_idx, min(start_idx + 50, len(log_lines))):
            line = log_lines[i]
            
            # Collect stack trace
            if 'File "' in line or line.strip().startswith('at '):
                stack_trace.append(line.strip())
            
            # Look for error message
            if 'Error:' in line or 'AssertionError' in line:
                error_message = line.strip()
        
        return FailureInfo(
            test_name=test_name,
            error_message=error_message,
            stack_trace=stack_trace,
            category="test_failure",
            log_excerpt=log_lines[start_idx:min(start_idx + 10, len(log_lines))]
        )
    
    def _extract_python_error(self, log_lines: List[str], start_idx: int) -> Optional[FailureInfo]:
        """Extract Python error details"""
        error_match = re.search(r'([\w\.]+Error): (.*)', log_lines[start_idx])
        if not error_match:
            return None
        
        error_type = error_match.group(1)
        error_message = error_match.group(2)
        
        # Look for stack trace above the error
        stack_trace = []
        for i in range(max(0, start_idx - 20), start_idx):
            line = log_lines[i]
            if 'File "' in line:
                stack_trace.append(line.strip())
                # Also get the next line (code line)
                if i + 1 < len(log_lines):
                    stack_trace.append(log_lines[i + 1].strip())
        
        # Extract affected files from stack trace
        affected_files = []
        for line in stack_trace:
            file_match = re.search(r'File "([^"]+)"', line)
            if file_match:
                affected_files.append(file_match.group(1))
        
        return FailureInfo(
            error_message=f"{error_type}: {error_message}",
            stack_trace=stack_trace,
            affected_files=affected_files,
            category="python_error",
            log_excerpt=log_lines[max(0, start_idx - 5):min(start_idx + 5, len(log_lines))]
        )
    
    def _extract_missing_dependency(self, log_lines: List[str], start_idx: int) -> Optional[FailureInfo]:
        """Extract missing dependency information"""
        line = log_lines[start_idx]
        module_match = re.search(r'No module named [\'"](.+)[\'"]', line)
        if not module_match:
            return None
        
        module_name = module_match.group(1)
        
        return FailureInfo(
            error_message=f"Missing module: {module_name}",
            category="missing_dependency",
            log_excerpt=log_lines[max(0, start_idx - 3):min(start_idx + 3, len(log_lines))]
        )
    
    def _extract_log_excerpt(self, logs: str, context: str, lines: int = 10) -> List[str]:
        """Extract relevant log excerpt around context"""
        log_lines = logs.split('\n')
        
        # Find context in logs
        for i, line in enumerate(log_lines):
            if context in line:
                start = max(0, i - lines // 2)
                end = min(len(log_lines), i + lines // 2)
                return log_lines[start:end]
        
        # If context not found, return last N lines
        return log_lines[-lines:]
    
    def analyze_root_cause(self, failures: List[FailureInfo], context: FailureContext) -> str:
        """
        Analyze failures to determine root cause.
        Returns root cause description with category.
        """
        self.log("Analyzing root cause...")
        
        if not failures:
            return "unknown: No specific failure information extracted from logs"
        
        # Categorize failures
        categories = [f.category for f in failures]
        
        if "missing_dependency" in categories:
            deps = [f.error_message for f in failures if f.category == "missing_dependency"]
            return f"missing_dependency: Required dependencies not installed: {', '.join(deps)}"
        
        if "test_failure" in categories:
            tests = [f.test_name for f in failures if f.category == "test_failure"]
            return f"test_failure: {len(tests)} test(s) failed: {', '.join(tests[:3])}"
        
        if "python_error" in categories:
            errors = [f.error_message for f in failures if f.category == "python_error"]
            return f"python_error: {errors[0]}"
        
        if "job_failure" in categories:
            jobs = [f.command for f in failures if f.category == "job_failure"]
            return f"job_failure: {len(jobs)} job(s) failed: {', '.join(jobs[:3])}"
        
        return f"unknown: {len(failures)} failure(s) detected but category unclear"
    
    def generate_fix_proposal(self, failures: List[FailureInfo], root_cause: str) -> FixProposal:
        """
        Generate fix proposal based on failures and root cause.
        """
        self.log("Generating fix proposal...")
        
        if "missing_dependency" in root_cause:
            return self._propose_dependency_fix(failures)
        
        if "test_failure" in root_cause:
            return self._propose_test_fix(failures)
        
        if "python_error" in root_cause:
            return self._propose_code_fix(failures)
        
        # Default: playbook
        return FixProposal(
            type="playbook",
            description="Manual investigation required",
            risk_level="medium",
            confidence="low",
            test_plan="Review logs and reproduce locally"
        )
    
    def _propose_dependency_fix(self, failures: List[FailureInfo]) -> FixProposal:
        """Propose fix for missing dependencies"""
        missing_modules = []
        for f in failures:
            if f.category == "missing_dependency":
                match = re.search(r'Missing module: (.+)', f.error_message)
                if match:
                    missing_modules.append(match.group(1))
        
        if not missing_modules:
            return FixProposal(
                type="playbook",
                description="Could not extract missing module names",
                risk_level="low",
                confidence="low"
            )
        
        # Create fix commands
        commands = [f"pip install {module}" for module in missing_modules]
        
        # Check if requirements.txt needs update
        req_path = Path("orchestrator/requirements.txt")
        files_changed = []
        if req_path.exists():
            files_changed.append("orchestrator/requirements.txt")
        
        return FixProposal(
            type="config",
            description=f"Install missing dependencies: {', '.join(missing_modules)}",
            files_changed=files_changed,
            commands=commands,
            risk_level="low",
            confidence="high",
            test_plan=f"Run: {'; '.join(commands)}\nThen re-run the failing job"
        )
    
    def _propose_test_fix(self, failures: List[FailureInfo]) -> FixProposal:
        """Propose fix for test failures"""
        test_failures = [f for f in failures if f.category == "test_failure"]
        
        if not test_failures:
            return FixProposal(
                type="playbook",
                description="No test failures to fix",
                risk_level="low",
                confidence="low"
            )
        
        # Extract affected files from stack traces
        affected_files = set()
        for f in test_failures:
            affected_files.update(f.affected_files)
        
        return FixProposal(
            type="patch",
            description=f"Fix {len(test_failures)} failing test(s)",
            files_changed=list(affected_files),
            risk_level="medium",
            confidence="medium",
            test_plan=f"Fix tests: {', '.join([f.test_name for f in test_failures[:3]])}\nRun: pytest {' '.join(affected_files)}"
        )
    
    def _propose_code_fix(self, failures: List[FailureInfo]) -> FixProposal:
        """Propose fix for code errors"""
        code_failures = [f for f in failures if f.category == "python_error"]
        
        if not code_failures:
            return FixProposal(
                type="playbook",
                description="No code errors to fix",
                risk_level="low",
                confidence="low"
            )
        
        affected_files = set()
        for f in code_failures:
            affected_files.update(f.affected_files)
        
        return FixProposal(
            type="patch",
            description=f"Fix code error: {code_failures[0].error_message}",
            files_changed=list(affected_files),
            risk_level="medium",
            confidence="medium",
            test_plan=f"Review and fix: {', '.join(affected_files)}\nRun tests to verify"
        )
    
    def create_triage_report(self, context: FailureContext, failures: List[FailureInfo], 
                            root_cause: str, fix: FixProposal) -> TriageReport:
        """Create comprehensive triage report"""
        self.log("Creating triage report...")
        
        # Generate failure summary
        failure_summary = f"{len(failures)} failure(s) detected"
        if failures:
            failure_summary += f": {', '.join([f.test_name or f.command or f.category for f in failures[:3]])}"
        
        # Generate next steps
        next_steps = [
            "Review the triage report and proposed fix",
            "Verify the root cause matches expectations",
            "Test the proposed fix locally if possible",
        ]
        
        if fix.type == "patch":
            next_steps.append("Apply the patch and run affected tests")
        elif fix.type == "config":
            next_steps.append("Apply configuration changes and re-run the failing job")
        elif fix.type == "playbook":
            next_steps.append("Follow the remediation playbook")
        
        # Generate rollback plan
        rollback_plan = "If fix causes issues:\n"
        rollback_plan += "1. Revert the PR or commit\n"
        rollback_plan += "2. Re-run the original failing job to confirm revert\n"
        rollback_plan += "3. Investigate alternative fixes\n"
        
        report = TriageReport(
            context=context,
            failure_summary=failure_summary,
            root_cause=root_cause,
            failure_details=failures,
            proposed_fix=fix,
            remediation_options=[fix],
            next_steps=next_steps,
            rollback_plan=rollback_plan,
            correlation_id=self.correlation_id
        )
        
        return report
    
    def save_report(self, report: TriageReport):
        """Save triage report to files"""
        self.log("Saving triage report...")
        
        # Save Markdown report
        md_path = Path(self.config.output_dir) / "phase5_triage_report.md"
        with open(md_path, 'w') as f:
            f.write(self._format_markdown_report(report))
        self.log(f"Saved Markdown report: {md_path}")
        
        # Save JSON report (redacted)
        json_path = Path(self.config.output_dir) / "phase5_triage_report.json"
        report_dict = asdict(report)
        if self.config.redaction_enabled:
            report_dict = redact_secrets(report_dict)
        with open(json_path, 'w') as f:
            json.dump(report_dict, f, indent=2)
        self.log(f"Saved JSON report: {json_path}")
        
        # Save diff if available
        if report.proposed_fix.diff:
            diff_path = Path(self.config.output_dir) / "fix_patch.diff"
            with open(diff_path, 'w') as f:
                f.write(report.proposed_fix.diff)
            self.log(f"Saved patch: {diff_path}")
        
        # Save playbook
        if report.proposed_fix.commands:
            playbook_path = Path(self.config.output_dir) / "quick_playbook.txt"
            with open(playbook_path, 'w') as f:
                f.write("# Quick Remediation Playbook\n\n")
                f.write(f"## {report.proposed_fix.description}\n\n")
                f.write("```bash\n")
                f.write("\n".join(report.proposed_fix.commands))
                f.write("\n```\n")
            self.log(f"Saved playbook: {playbook_path}")
    
    def _format_markdown_report(self, report: TriageReport) -> str:
        """Format triage report as Markdown"""
        md = []
        
        md.append("# Phase 5 Failed-Run Triage Report\n")
        md.append(f"**Correlation ID:** {report.correlation_id}\n")
        md.append(f"**Timestamp:** {report.timestamp}\n")
        md.append("\n---\n")
        
        # Context
        md.append("## Context\n")
        md.append(f"- **Repository:** {report.context.repo}\n")
        md.append(f"- **Ref Type:** {report.context.ref_type}\n")
        md.append(f"- **Ref ID:** {report.context.ref_id}\n")
        if report.context.pr_number:
            md.append(f"- **PR:** #{report.context.pr_number}\n")
        if report.context.workflow_name:
            md.append(f"- **Workflow:** {report.context.workflow_name}\n")
        if report.context.commit_sha:
            md.append(f"- **Commit:** {report.context.commit_sha[:8]}\n")
        if report.context.branch:
            md.append(f"- **Branch:** {report.context.branch}\n")
        md.append("\n")
        
        # Failure Summary
        md.append("## Failure Summary\n")
        md.append(f"{report.failure_summary}\n\n")
        
        # Root Cause
        md.append("## Root Cause\n")
        md.append(f"**Category:** {report.root_cause.split(':')[0]}\n")
        md.append(f"**Details:** {report.root_cause}\n\n")
        
        # Failure Details
        if report.failure_details:
            md.append("## Failure Details\n")
            for i, failure in enumerate(report.failure_details[:5], 1):
                md.append(f"### Failure {i}\n")
                if failure.test_name:
                    md.append(f"**Test:** {failure.test_name}\n")
                if failure.command:
                    md.append(f"**Command:** {failure.command}\n")
                if failure.error_message:
                    md.append(f"**Error:** {failure.error_message}\n")
                if failure.stack_trace:
                    md.append("\n**Stack Trace:**\n```\n")
                    md.append("\n".join(failure.stack_trace[:10]))
                    md.append("\n```\n")
                if failure.log_excerpt:
                    md.append("\n**Log Excerpt:**\n```\n")
                    md.append("\n".join(failure.log_excerpt[:6]))
                    md.append("\n```\n")
                md.append("\n")
        
        # Proposed Fix
        md.append("## Proposed Fix\n")
        md.append(f"**Type:** {report.proposed_fix.type}\n")
        md.append(f"**Description:** {report.proposed_fix.description}\n")
        md.append(f"**Risk Level:** {report.proposed_fix.risk_level}\n")
        md.append(f"**Confidence:** {report.proposed_fix.confidence}\n")
        
        if report.proposed_fix.files_changed:
            md.append(f"\n**Files to Change:**\n")
            for file in report.proposed_fix.files_changed:
                md.append(f"- {file}\n")
        
        if report.proposed_fix.commands:
            md.append(f"\n**Commands:**\n```bash\n")
            md.append("\n".join(report.proposed_fix.commands))
            md.append("\n```\n")
        
        if report.proposed_fix.test_plan:
            md.append(f"\n**Test Plan:**\n{report.proposed_fix.test_plan}\n")
        
        md.append("\n")
        
        # Next Steps
        md.append("## Next Steps\n")
        for step in report.next_steps:
            md.append(f"- {step}\n")
        md.append("\n")
        
        # Rollback Plan
        md.append("## Rollback Plan\n")
        md.append(f"{report.rollback_plan}\n")
        
        # PR Link
        if report.pr_url:
            md.append(f"\n## Fix PR\n")
            md.append(f"A fix PR has been created: {report.pr_url}\n")
        
        return "".join(md)
    
    def run(self) -> TriageReport:
        """
        Main execution flow for triage agent.
        """
        try:
            self.log("=== Phase 5 Failed-Run Triage Agent ===")
            self.log(f"Correlation ID: {self.correlation_id}")
            
            # 1. Resolve failure reference
            context = self.resolve_failure_ref()
            
            # 2. Fetch logs
            logs, jobs = self.fetch_logs(context)
            
            # 3. Extract failures
            failures = self.extract_failures(logs, jobs)
            
            # 4. Analyze root cause
            root_cause = self.analyze_root_cause(failures, context)
            self.log(f"Root cause: {root_cause}")
            
            # 5. Generate fix proposal
            fix = self.generate_fix_proposal(failures, root_cause)
            
            # 6. Create triage report
            report = self.create_triage_report(context, failures, root_cause, fix)
            
            # 7. Save report
            self.save_report(report)
            
            # 8. Optionally create fix PR (if allowed)
            if self.config.allow_auto_fix and not self.config.dry_run:
                self.log("Auto-fix is enabled but not implemented in this version")
                # TODO: Implement auto-fix PR creation
            
            self.log("=== Triage Complete ===")
            return report
            
        except Exception as e:
            self.log(f"Triage failed: {str(e)}", level="ERROR")
            self.log(traceback.format_exc(), level="ERROR")
            raise

# ============================================
# CLI Interface
# ============================================

def generate_default_config() -> Dict:
    """Generate default configuration"""
    config = TriageConfig()
    return asdict(config)

def load_config(config_path: str) -> TriageConfig:
    """Load configuration from JSON file"""
    with open(config_path, 'r') as f:
        data = json.load(f)
    
    # Replace ENV: references with environment variables
    for key, value in data.items():
        if isinstance(value, str) and value.startswith("ENV:"):
            env_var = value.split(":", 1)[1]
            data[key] = os.environ.get(env_var)
    
    return TriageConfig(**data)

def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description="Phase 5 Failed-Run Triage & Fix Agent",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # Run command
    run_parser = subparsers.add_parser("run", help="Run triage agent")
    run_parser.add_argument("--config", help="Path to config JSON file")
    run_parser.add_argument("--repo", help="Repository (owner/repo)")
    run_parser.add_argument("--failure-ref", help="Failure reference (PR number, run ID, or URL)")
    run_parser.add_argument("--auto-fix", action="store_true", help="Enable auto-fix PR creation")
    run_parser.add_argument("--dry-run", action="store_true", help="Dry run mode")
    run_parser.add_argument("--verbose", action="store_true", default=True, help="Verbose output")
    
    # Generate config command
    config_parser = subparsers.add_parser("generate-config", help="Generate default config")
    config_parser.add_argument("--output", default="triage_config.json", help="Output file path")
    
    args = parser.parse_args()
    
    if args.command == "generate-config":
        config = generate_default_config()
        output_path = args.output
        with open(output_path, 'w') as f:
            json.dump(config, f, indent=2)
        print(f"Generated default config: {output_path}")
        return 0
    
    elif args.command == "run":
        # Load or create config
        if args.config:
            config = load_config(args.config)
        else:
            config = TriageConfig()
        
        # Override with CLI arguments
        if args.repo:
            config.repo = args.repo
        if args.failure_ref:
            config.failure_ref = args.failure_ref
        if args.auto_fix:
            config.allow_auto_fix = True
        if args.dry_run:
            config.dry_run = True
        if not args.verbose:
            config.verbose = False
        
        # Get GitHub token from environment
        config.github_token = os.environ.get("GITHUB_TOKEN")
        if not config.github_token:
            print("ERROR: GITHUB_TOKEN environment variable not set", file=sys.stderr)
            return 1
        
        # Validate required inputs
        if not config.failure_ref:
            print("ERROR: --failure-ref is required", file=sys.stderr)
            return 1
        
        # Run agent
        agent = Phase5TriageAgent(config)
        report = agent.run()
        
        print("\n" + "="*60)
        print("Triage report saved to:", config.output_dir)
        print("="*60)
        
        return 0
    
    else:
        parser.print_help()
        return 1

if __name__ == "__main__":
    sys.exit(main())
