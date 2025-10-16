"""
QA Checker Agent for Phase 3 Polish and Phase 4 Multi-Agent Foundation.
Validates PR implementations against acceptance criteria.
"""
import os
import re
import json
import time
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timezone
import requests


class PRValidationResult:
    """Result of a PR validation check."""
    
    def __init__(self):
        self.status = "PASS"  # PASS or FAIL
        self.checks = []  # List of check results
        self.evidence = []  # Evidence gathered
        self.fixes = []  # Required fixes (if FAIL)
        
    def add_check(self, name: str, passed: bool, details: str = ""):
        """Add a check result."""
        self.checks.append({
            'name': name,
            'passed': passed,
            'details': details
        })
        if not passed:
            self.status = "FAIL"
    
    def add_evidence(self, description: str, data: dict):
        """Add evidence."""
        self.evidence.append({
            'description': description,
            'data': data
        })
    
    def add_fix(self, description: str, file_path: str = "", line_number: int = 0):
        """Add required fix."""
        self.fixes.append({
            'description': description,
            'file': file_path,
            'line': line_number
        })


class QAChecker:
    """QA Checker agent for validating PR implementations."""
    
    def __init__(self, repo: str, github_token: str):
        """
        Initialize QA checker.
        
        Args:
            repo: Repository in format "owner/repo"
            github_token: GitHub API token
        """
        self.repo = repo
        self.github_token = github_token
        self.base_url = "https://api.github.com"
        self.headers = {
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
    
    def validate_pr1_deploy_client_polish(self, pr_number: int) -> PRValidationResult:
        """
        Validate PR1 - /deploy-client polish with deferred response and correlation_id.
        
        Args:
            pr_number: PR number
            
        Returns:
            PRValidationResult
        """
        result = PRValidationResult()
        
        # Get PR details
        pr_data = self._get_pr(pr_number)
        if not pr_data:
            result.add_check("PR Exists", False, f"Could not fetch PR #{pr_number}")
            return result
        
        result.add_check("PR Exists", True, f"PR #{pr_number} found")
        result.add_evidence("PR Details", {
            'title': pr_data.get('title'),
            'state': pr_data.get('state'),
            'url': pr_data.get('html_url')
        })
        
        # Get PR files
        files = self._get_pr_files(pr_number)
        result.add_evidence("PR Files", {'count': len(files), 'files': [f['filename'] for f in files]})
        
        # 1. Workflow inputs and run-name
        self._check_workflow_inputs(result, files)
        
        # 2. Dispatcher and discovery
        self._check_dispatcher_implementation(result, files)
        
        # 3. Discord handler behavior
        self._check_discord_handler_wait_flow(result, files)
        
        # 4. Guardrails and safety
        self._check_guardrails(result, files)
        
        # 5. Tests and docs
        self._check_tests_and_docs(result, files, pr_number)
        
        return result
    
    def validate_pr2_multi_agent_foundation(self, pr_number: int) -> PRValidationResult:
        """
        Validate PR2 - Multi-agent registry/router + /agents + /status-digest.
        
        Args:
            pr_number: PR number
            
        Returns:
            PRValidationResult
        """
        result = PRValidationResult()
        
        # Get PR details
        pr_data = self._get_pr(pr_number)
        if not pr_data:
            result.add_check("PR Exists", False, f"Could not fetch PR #{pr_number}")
            return result
        
        result.add_check("PR Exists", True, f"PR #{pr_number} found")
        result.add_evidence("PR Details", {
            'title': pr_data.get('title'),
            'state': pr_data.get('state'),
            'url': pr_data.get('html_url')
        })
        
        # Get PR files
        files = self._get_pr_files(pr_number)
        result.add_evidence("PR Files", {'count': len(files), 'files': [f['filename'] for f in files]})
        
        # 1. Registry and router
        self._check_agent_registry(result, files)
        
        # 2. Commands
        self._check_agents_command(result, files)
        self._check_status_digest_command(result, files)
        
        # 3. Guardrails and UX
        self._check_multi_agent_guardrails(result, files)
        
        # 4. Tests and docs
        self._check_multi_agent_tests_and_docs(result, files, pr_number)
        
        return result
    
    def _get_pr(self, pr_number: int) -> Optional[dict]:
        """Get PR details."""
        try:
            url = f"{self.base_url}/repos/{self.repo}/pulls/{pr_number}"
            response = requests.get(url, headers=self.headers, timeout=10)
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            print(f"Error fetching PR: {e}")
            return None
    
    def _get_pr_files(self, pr_number: int) -> List[dict]:
        """Get files changed in PR."""
        try:
            url = f"{self.base_url}/repos/{self.repo}/pulls/{pr_number}/files"
            response = requests.get(url, headers=self.headers, timeout=10)
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            print(f"Error fetching PR files: {e}")
            return []
    
    def _get_file_content(self, path: str, ref: str = "main") -> Optional[str]:
        """Get file content from repository."""
        try:
            url = f"{self.base_url}/repos/{self.repo}/contents/{path}?ref={ref}"
            response = requests.get(url, headers=self.headers, timeout=10)
            if response.status_code == 200:
                import base64
                content = response.json().get('content', '')
                return base64.b64decode(content).decode('utf-8')
            return None
        except Exception as e:
            print(f"Error fetching file content: {e}")
            return None
    
    def _check_workflow_inputs(self, result: PRValidationResult, files: List[dict]):
        """Check workflow inputs and run-name."""
        workflow_file = None
        for f in files:
            if 'client-deploy.yml' in f['filename'] or 'client-deploy.yaml' in f['filename']:
                workflow_file = f
                break
        
        if not workflow_file:
            result.add_check("Workflow YAML Modified", False, "client-deploy.yml not found in PR")
            result.add_fix("Ensure Client Deploy workflow is included in PR", ".github/workflows/client-deploy.yml")
            return
        
        result.add_check("Workflow YAML Modified", True, f"Found {workflow_file['filename']}")
        
        # Check if patch contains workflow_dispatch inputs
        patch = workflow_file.get('patch', '')
        
        # Check for correlation_id input
        if 'correlation_id' in patch:
            result.add_check("Correlation ID Input", True, "correlation_id input found")
        else:
            result.add_check("Correlation ID Input", False, "correlation_id input not found")
            result.add_fix("Add correlation_id input to workflow_dispatch", workflow_file['filename'])
        
        # Check for requester input
        if 'requester' in patch:
            result.add_check("Requester Input", True, "requester input found")
        else:
            result.add_check("Requester Input", False, "requester input not found")
            result.add_fix("Add requester input to workflow_dispatch", workflow_file['filename'])
        
        # Check for run-name with correlation_id
        if 'run-name' in patch and 'correlation_id' in patch:
            result.add_check("Run Name with Correlation ID", True, "run-name includes correlation_id")
        else:
            result.add_check("Run Name with Correlation ID", False, "run-name doesn't include correlation_id")
            result.add_fix("Update run-name to include correlation_id", workflow_file['filename'])
    
    def _check_dispatcher_implementation(self, result: PRValidationResult, files: List[dict]):
        """Check dispatcher payload and discovery."""
        dispatcher_file = None
        for f in files:
            if 'github_actions_dispatcher.py' in f['filename']:
                dispatcher_file = f
                break
        
        if not dispatcher_file:
            result.add_check("Dispatcher Modified", False, "github_actions_dispatcher.py not found")
            return
        
        result.add_check("Dispatcher Modified", True, f"Found {dispatcher_file['filename']}")
        
        patch = dispatcher_file.get('patch', '')
        
        # Check for trigger_client_deploy with correlation_id
        if 'trigger_client_deploy' in patch and 'correlation_id' in patch:
            result.add_check("Dispatch Payload with Correlation ID", True)
        else:
            result.add_check("Dispatch Payload with Correlation ID", False)
            result.add_fix("Ensure trigger_client_deploy sends correlation_id in inputs", dispatcher_file['filename'])
        
        # Check for find_run_by_correlation
        if 'find_run_by_correlation' in patch or 'find_recent_run' in patch:
            result.add_check("Run Discovery Implementation", True)
        else:
            result.add_check("Run Discovery Implementation", False)
            result.add_fix("Implement run discovery by correlation_id", dispatcher_file['filename'])
        
        # Check for poll_run_conclusion
        if 'poll_run_conclusion' in patch or 'poll_run_completion' in patch:
            result.add_check("Polling Implementation", True)
        else:
            result.add_check("Polling Implementation", False)
            result.add_fix("Implement polling for run completion", dispatcher_file['filename'])
    
    def _check_discord_handler_wait_flow(self, result: PRValidationResult, files: List[dict]):
        """Check Discord handler deferred response and follow-ups."""
        handler_file = None
        for f in files:
            if 'discord_handler.py' in f['filename']:
                handler_file = f
                break
        
        if not handler_file:
            result.add_check("Discord Handler Modified", False, "discord_handler.py not found")
            return
        
        result.add_check("Discord Handler Modified", True, f"Found {handler_file['filename']}")
        
        patch = handler_file.get('patch', '')
        
        # Check for wait parameter
        if 'wait' in patch:
            result.add_check("Wait Parameter", True, "wait parameter found")
        else:
            result.add_check("Wait Parameter", False, "wait parameter not found")
            result.add_fix("Add wait parameter to /deploy-client command", handler_file['filename'])
        
        # Check for deferred response (type 5)
        if 'type.*5' in patch or 'DEFERRED' in patch or 'create_response(5' in patch:
            result.add_check("Deferred Response", True, "Deferred response type found")
        else:
            result.add_check("Deferred Response", False, "Deferred response not found")
            result.add_fix("Implement deferred response for wait=true", handler_file['filename'])
        
        # Check for follow-up messages
        if 'followup' in patch.lower() or '_post_followup' in patch:
            result.add_check("Follow-up Messages", True, "Follow-up message logic found")
        else:
            result.add_check("Follow-up Messages", False, "Follow-up message logic not found")
            result.add_fix("Implement follow-up messages for wait=true flow", handler_file['filename'])
    
    def _check_guardrails(self, result: PRValidationResult, files: List[dict]):
        """Check guardrails and safety."""
        # Check URL validator usage
        has_url_validation = False
        for f in files:
            if 'discord_handler.py' in f['filename']:
                patch = f.get('patch', '')
                if 'URLValidator' in patch or 'validate_url' in patch:
                    has_url_validation = True
                    break
        
        result.add_check("URL Validation", has_url_validation, 
                        "URLValidator used" if has_url_validation else "URLValidator not found")
        
        if not has_url_validation:
            result.add_fix("Use URLValidator for api_base parameter validation", "discord_handler.py")
        
        # Check for timeout limits
        has_timeout = False
        for f in files:
            patch = f.get('patch', '')
            if 'timeout' in patch.lower() and ('180' in patch or '3 minutes' in patch.lower()):
                has_timeout = True
                break
        
        result.add_check("Polling Timeout", has_timeout,
                        "Reasonable timeout found" if has_timeout else "Timeout not clearly defined")
    
    def _check_tests_and_docs(self, result: PRValidationResult, files: List[dict], pr_number: int):
        """Check tests and documentation."""
        has_tests = any('test' in f['filename'].lower() for f in files)
        result.add_check("Tests Included", has_tests, 
                        "Test files found" if has_tests else "No test files in PR")
        
        if not has_tests:
            result.add_fix("Add unit tests for dispatch, polling, and handler", "tests/")
        
        has_docs = any('readme' in f['filename'].lower() or '.md' in f['filename'] for f in files)
        result.add_check("Documentation Updated", has_docs,
                        "Documentation files found" if has_docs else "No documentation updates")
    
    def _check_agent_registry(self, result: PRValidationResult, files: List[dict]):
        """Check agent registry implementation."""
        registry_file = None
        for f in files:
            if 'registry.py' in f['filename'] and 'agents' in f['filename']:
                registry_file = f
                break
        
        if not registry_file:
            result.add_check("Agent Registry File", False, "registry.py not found in agents/")
            result.add_fix("Create orchestrator/app/agents/registry.py", "app/agents/registry.py")
            return
        
        result.add_check("Agent Registry File", True, f"Found {registry_file['filename']}")
        
        patch = registry_file.get('patch', '')
        
        # Check for required agents
        required_agents = ['deploy_verifier', 'diagnose_runner', 'status_reporter', 'deploy_client']
        found_agents = []
        for agent_id in required_agents:
            if agent_id in patch:
                found_agents.append(agent_id)
        
        if len(found_agents) == len(required_agents):
            result.add_check("Required Agents", True, f"All {len(required_agents)} agents found")
        else:
            missing = set(required_agents) - set(found_agents)
            result.add_check("Required Agents", False, f"Missing agents: {missing}")
            result.add_fix(f"Add missing agents to registry: {missing}", registry_file['filename'])
    
    def _check_agents_command(self, result: PRValidationResult, files: List[dict]):
        """Check /agents command implementation."""
        handler_file = None
        for f in files:
            if 'discord_handler.py' in f['filename']:
                handler_file = f
                break
        
        if not handler_file:
            result.add_check("/agents Command", False, "discord_handler.py not modified")
            return
        
        patch = handler_file.get('patch', '')
        
        # Check for handle_agents_command
        if 'handle_agents_command' in patch or "'agents'" in patch:
            result.add_check("/agents Command Handler", True)
        else:
            result.add_check("/agents Command Handler", False)
            result.add_fix("Implement handle_agents_command", handler_file['filename'])
        
        # Check for get_agents import/usage
        if 'get_agents' in patch:
            result.add_check("/agents Uses Registry", True)
        else:
            result.add_check("/agents Uses Registry", False)
            result.add_fix("Use get_agents() from registry", handler_file['filename'])
    
    def _check_status_digest_command(self, result: PRValidationResult, files: List[dict]):
        """Check /status-digest command implementation."""
        handler_file = None
        for f in files:
            if 'discord_handler.py' in f['filename']:
                handler_file = f
                break
        
        if not handler_file:
            result.add_check("/status-digest Command", False, "discord_handler.py not modified")
            return
        
        patch = handler_file.get('patch', '')
        
        # Check for handle_status_digest_command
        if 'handle_status_digest_command' in patch or 'status-digest' in patch or 'status_digest' in patch:
            result.add_check("/status-digest Command Handler", True)
        else:
            result.add_check("/status-digest Command Handler", False)
            result.add_fix("Implement handle_status_digest_command", handler_file['filename'])
        
        # Check for period parameter (daily/weekly)
        if 'daily' in patch or 'weekly' in patch or 'period' in patch:
            result.add_check("/status-digest Period Parameter", True)
        else:
            result.add_check("/status-digest Period Parameter", False)
            result.add_fix("Add period parameter (daily/weekly)", handler_file['filename'])
        
        # Check for aggregation logic
        if 'success_count' in patch or 'failure_count' in patch or 'aggregate' in patch.lower():
            result.add_check("/status-digest Aggregation", True)
        else:
            result.add_check("/status-digest Aggregation", False)
            result.add_fix("Implement run aggregation logic", handler_file['filename'])
    
    def _check_multi_agent_guardrails(self, result: PRValidationResult, files: List[dict]):
        """Check multi-agent guardrails and UX."""
        # Check rate limits
        has_rate_limits = False
        for f in files:
            patch = f.get('patch', '')
            if 'rate' in patch.lower() or 'timeout' in patch.lower():
                has_rate_limits = True
                break
        
        result.add_check("Rate Limits Respected", has_rate_limits,
                        "Rate limit handling found" if has_rate_limits else "Rate limit handling unclear")
        
        # Check for sensitive data handling
        has_safe_output = True  # Assume safe unless proven otherwise
        for f in files:
            patch = f.get('patch', '')
            # Look for potential secret leakage
            if 'secret' in patch.lower() and 'print' in patch.lower():
                has_safe_output = False
                break
        
        result.add_check("No Sensitive Data Exposure", has_safe_output)
    
    def _check_multi_agent_tests_and_docs(self, result: PRValidationResult, files: List[dict], pr_number: int):
        """Check tests and docs for multi-agent features."""
        # Check for registry tests
        has_registry_tests = any('test' in f['filename'].lower() and 'registry' in f['filename'].lower() for f in files)
        result.add_check("Registry Tests", has_registry_tests,
                        "Registry test file found" if has_registry_tests else "No registry tests")
        
        if not has_registry_tests:
            result.add_fix("Add tests for agent registry", "tests/test_agent_registry.py")
        
        # Check for command tests
        has_command_tests = any('test' in f['filename'].lower() and ('agent' in f['filename'].lower() or 'status' in f['filename'].lower()) for f in files)
        result.add_check("Command Tests", has_command_tests,
                        "Command test files found" if has_command_tests else "No command tests")
        
        if not has_command_tests:
            result.add_fix("Add tests for /agents and /status-digest", "tests/")
        
        # Check for README updates
        has_readme = any('readme' in f['filename'].lower() for f in files)
        result.add_check("README Updated", has_readme,
                        "README updated" if has_readme else "README not updated")
        
        if not has_readme:
            result.add_fix("Update README with multi-agent documentation", "README.md")
    
    def format_review_comment(self, result: PRValidationResult, pr_title: str) -> str:
        """
        Format validation result as PR review comment.
        
        Args:
            result: Validation result
            pr_title: PR title
            
        Returns:
            Formatted review comment in Markdown
        """
        lines = []
        lines.append(f"# QA: {pr_title}")
        lines.append("")
        lines.append(f"**Status:** {result.status}")
        lines.append("")
        
        # Acceptance checklist
        lines.append("## Acceptance Checklist")
        lines.append("")
        for check in result.checks:
            icon = "✅" if check['passed'] else "❌"
            name = check['name']
            details = f" — {check['details']}" if check['details'] else ""
            lines.append(f"- [{icon}] {name}{details}")
        lines.append("")
        
        # Evidence
        if result.evidence:
            lines.append("## Evidence")
            lines.append("")
            for ev in result.evidence:
                lines.append(f"### {ev['description']}")
                lines.append("```json")
                lines.append(json.dumps(ev['data'], indent=2))
                lines.append("```")
                lines.append("")
        
        # Fixes (if FAIL)
        if result.status == "FAIL" and result.fixes:
            lines.append("## Required Fixes")
            lines.append("")
            for fix in result.fixes:
                file_ref = f" (`{fix['file']}`)" if fix['file'] else ""
                line_ref = f" at line {fix['line']}" if fix['line'] else ""
                lines.append(f"- {fix['description']}{file_ref}{line_ref}")
            lines.append("")
        
        # Final verdict
        lines.append("## Final Verdict")
        lines.append("")
        if result.status == "PASS":
            lines.append("✅ **APPROVE** — All acceptance criteria met.")
        else:
            lines.append("❌ **REQUEST CHANGES** — Please address the fixes above.")
        
        return "\n".join(lines)
    
    def post_review(self, pr_number: int, review_comment: str, approve: bool = True):
        """
        Post review comment on PR.
        
        Args:
            pr_number: PR number
            review_comment: Review comment body
            approve: Whether to approve (True) or request changes (False)
        """
        try:
            url = f"{self.base_url}/repos/{self.repo}/pulls/{pr_number}/reviews"
            
            event = "APPROVE" if approve else "REQUEST_CHANGES"
            
            payload = {
                "body": review_comment,
                "event": event
            }
            
            response = requests.post(url, headers=self.headers, json=payload, timeout=10)
            
            if response.status_code == 200:
                print(f"✅ Review posted successfully on PR #{pr_number}")
            else:
                print(f"❌ Failed to post review: {response.status_code}")
                print(response.text)
        
        except Exception as e:
            print(f"Error posting review: {e}")


def main():
    """Main entry point for QA checker."""
    import sys
    
    if len(sys.argv) < 4:
        print("Usage: python -m app.agents.qa_checker <pr1_number> <pr2_number> <repo>")
        print("Example: python -m app.agents.qa_checker 27 28 gcolon75/Project-Valine")
        sys.exit(1)
    
    pr1 = int(sys.argv[1])
    pr2 = int(sys.argv[2])
    repo = sys.argv[3]
    
    github_token = os.environ.get('GITHUB_TOKEN')
    if not github_token:
        print("Error: GITHUB_TOKEN environment variable not set")
        sys.exit(1)
    
    checker = QAChecker(repo, github_token)
    
    print(f"🔍 Validating PR #{pr1} - Deploy Client Polish...")
    result1 = checker.validate_pr1_deploy_client_polish(pr1)
    review1 = checker.format_review_comment(result1, "Phase 3 Polish — /deploy-client wait flow")
    print(review1)
    print()
    
    print(f"🔍 Validating PR #{pr2} - Multi-Agent Foundation...")
    result2 = checker.validate_pr2_multi_agent_foundation(pr2)
    review2 = checker.format_review_comment(result2, "Phase 4 — Multi-Agent Foundation")
    print(review2)
    print()
    
    # Post reviews (optional, controlled by env var)
    if os.environ.get('POST_REVIEWS', '').lower() == 'true':
        print("📝 Posting reviews...")
        checker.post_review(pr1, review1, approve=(result1.status == "PASS"))
        checker.post_review(pr2, review2, approve=(result2.status == "PASS"))
        print("✅ Reviews posted")
    else:
        print("ℹ️  Set POST_REVIEWS=true to post reviews to GitHub")


if __name__ == '__main__':
    main()
