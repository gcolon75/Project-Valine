"""
Unit tests for Phase 5 Triage Agent
"""
import json
import os
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch, MagicMock, call
from pathlib import Path
from datetime import datetime, timezone

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from phase5_triage_agent import (
    TriageConfig,
    FailureContext,
    FailureInfo,
    FixProposal,
    TriageReport,
    Phase5TriageAgent,
    GitHubClient,
    redact_secrets,
    generate_default_config,
    load_config
)


class TestRedactSecrets(unittest.TestCase):
    """Test redact_secrets function"""
    
    def test_redact_dict_with_token(self):
        """Test redacting dictionary with token"""
        data = {"username": "john", "api_token": "secret12345678"}
        result = redact_secrets(data)
        
        self.assertEqual(result["username"], "john")
        self.assertEqual(result["api_token"], "***5678")
    
    def test_redact_nested_dict(self):
        """Test redacting nested dictionary"""
        data = {
            "config": {
                "user": "john",
                "github_token": "ghp_1234567890abcdef1234567890abcdef12"
            }
        }
        result = redact_secrets(data)
        
        self.assertEqual(result["config"]["user"], "john")
        self.assertEqual(result["config"]["github_token"], "***ef12")
    
    def test_redact_inline_patterns(self):
        """Test redacting inline patterns in strings"""
        data = "Authorization: Bearer ghp_1234567890abcdef1234567890abcdef12"
        result = redact_secrets(data)
        
        self.assertIn("***", result)
        self.assertNotIn("ghp_123456", result)
    
    def test_redact_list(self):
        """Test redacting list of items"""
        data = [
            {"token": "token1234567890"},
            {"username": "normal_value"},
            {"secret": "secret_key_12345"}
        ]
        result = redact_secrets(data)
        
        self.assertEqual(result[0]["token"], "***7890")
        self.assertEqual(result[1]["username"], "normal_value")
        self.assertEqual(result[2]["secret"], "***2345")
    
    def test_redact_preserves_non_secrets(self):
        """Test that non-secret values are preserved"""
        data = {
            "username": "alice",
            "email": "alice@example.com",
            "count": 42,
            "active": True
        }
        result = redact_secrets(data)
        
        self.assertEqual(result["username"], "alice")
        self.assertEqual(result["email"], "alice@example.com")
        self.assertEqual(result["count"], 42)
        self.assertEqual(result["active"], True)


class TestTriageConfig(unittest.TestCase):
    """Test TriageConfig dataclass"""
    
    def test_default_config(self):
        """Test default configuration values"""
        config = TriageConfig()
        
        self.assertEqual(config.repo, "gcolon75/Project-Valine")
        self.assertIsNone(config.failure_ref)
        self.assertFalse(config.allow_auto_fix)
        self.assertTrue(config.verbose)
        self.assertTrue(config.redaction_enabled)
        self.assertEqual(config.actor, "github-actions")
    
    def test_custom_config(self):
        """Test custom configuration"""
        config = TriageConfig(
            repo="owner/repo",
            failure_ref=123,
            allow_auto_fix=True,
            actor="test-user"
        )
        
        self.assertEqual(config.repo, "owner/repo")
        self.assertEqual(config.failure_ref, 123)
        self.assertTrue(config.allow_auto_fix)
        self.assertEqual(config.actor, "test-user")


class TestFailureContext(unittest.TestCase):
    """Test FailureContext dataclass"""
    
    def test_pr_context(self):
        """Test PR failure context"""
        context = FailureContext(
            ref_type="pr",
            ref_id=49,
            repo="owner/repo",
            pr_number=49,
            commit_sha="abc123",
            branch="feature-branch"
        )
        
        self.assertEqual(context.ref_type, "pr")
        self.assertEqual(context.ref_id, 49)
        self.assertEqual(context.pr_number, 49)
        self.assertEqual(context.commit_sha, "abc123")
    
    def test_workflow_run_context(self):
        """Test workflow run failure context"""
        context = FailureContext(
            ref_type="workflow_run",
            ref_id=1234567890,
            repo="owner/repo",
            workflow_run_id=1234567890,
            workflow_name="CI",
            commit_sha="def456"
        )
        
        self.assertEqual(context.ref_type, "workflow_run")
        self.assertEqual(context.workflow_run_id, 1234567890)
        self.assertEqual(context.workflow_name, "CI")


class TestFailureInfo(unittest.TestCase):
    """Test FailureInfo dataclass"""
    
    def test_test_failure(self):
        """Test test failure info"""
        failure = FailureInfo(
            test_name="test_foo",
            error_message="AssertionError: expected True",
            category="test_failure",
            stack_trace=["File 'test.py', line 10", "assert result == True"]
        )
        
        self.assertEqual(failure.test_name, "test_foo")
        self.assertEqual(failure.category, "test_failure")
        self.assertEqual(len(failure.stack_trace), 2)
    
    def test_missing_dependency(self):
        """Test missing dependency failure"""
        failure = FailureInfo(
            error_message="Missing module: requests",
            category="missing_dependency"
        )
        
        self.assertEqual(failure.category, "missing_dependency")
        self.assertIsNone(failure.test_name)


class TestFixProposal(unittest.TestCase):
    """Test FixProposal dataclass"""
    
    def test_patch_proposal(self):
        """Test patch fix proposal"""
        fix = FixProposal(
            type="patch",
            description="Fix null pointer",
            files_changed=["src/main.py"],
            risk_level="low",
            confidence="high"
        )
        
        self.assertEqual(fix.type, "patch")
        self.assertEqual(fix.risk_level, "low")
        self.assertEqual(len(fix.files_changed), 1)
    
    def test_config_proposal(self):
        """Test config fix proposal"""
        fix = FixProposal(
            type="config",
            description="Add missing dependency",
            commands=["pip install requests"],
            risk_level="low",
            confidence="high"
        )
        
        self.assertEqual(fix.type, "config")
        self.assertEqual(len(fix.commands), 1)


class TestGitHubClient(unittest.TestCase):
    """Test GitHubClient"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.token = "test_token_1234567890"
        self.repo = "owner/repo"
        self.client = GitHubClient(self.token, self.repo)
    
    def test_initialization(self):
        """Test GitHubClient initialization"""
        self.assertEqual(self.client.repo, "owner/repo")
        self.assertIn("Bearer", self.client.headers["Authorization"])
    
    @patch('requests.request')
    def test_get_pr(self, mock_request):
        """Test getting PR details"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "number": 49,
            "title": "Test PR",
            "head": {"sha": "abc123", "ref": "feature"}
        }
        mock_request.return_value = mock_response
        
        result = self.client.get_pr(49)
        
        self.assertEqual(result["number"], 49)
        mock_request.assert_called_once()
    
    @patch('requests.request')
    def test_get_workflow_run(self, mock_request):
        """Test getting workflow run details"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "id": 1234567890,
            "name": "CI",
            "head_sha": "def456",
            "head_branch": "main"
        }
        mock_request.return_value = mock_response
        
        result = self.client.get_workflow_run(1234567890)
        
        self.assertEqual(result["id"], 1234567890)
        self.assertEqual(result["name"], "CI")


class TestPhase5TriageAgent(unittest.TestCase):
    """Test Phase5TriageAgent"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.config = TriageConfig(
            repo="owner/repo",
            failure_ref=49,
            github_token="test_token",
            verbose=False
        )
        self.agent = Phase5TriageAgent(self.config)
    
    def test_initialization(self):
        """Test agent initialization"""
        self.assertEqual(self.agent.config.repo, "owner/repo")
        self.assertIsNotNone(self.agent.github)
        self.assertTrue(self.agent.correlation_id.startswith("TRIAGE-"))
    
    def test_resolve_pr_number(self):
        """Test resolving PR number"""
        self.agent.github = Mock()
        self.agent.github.get_pr.return_value = {
            "number": 49,
            "head": {"sha": "abc123", "ref": "feature"}
        }
        
        context = self.agent._resolve_pr(49)
        
        self.assertEqual(context.ref_type, "pr")
        self.assertEqual(context.pr_number, 49)
        self.assertEqual(context.commit_sha, "abc123")
    
    def test_resolve_workflow_run(self):
        """Test resolving workflow run ID"""
        self.agent.github = Mock()
        self.agent.github.get_workflow_run.return_value = {
            "id": 1234567890,
            "name": "CI",
            "head_sha": "def456",
            "head_branch": "main",
            "pull_requests": []
        }
        
        context = self.agent._resolve_workflow_run(1234567890)
        
        self.assertEqual(context.ref_type, "workflow_run")
        self.assertEqual(context.workflow_run_id, 1234567890)
        self.assertEqual(context.workflow_name, "CI")
    
    def test_extract_pytest_failure(self):
        """Test extracting pytest failure"""
        log_lines = [
            "Running tests...",
            "FAILED tests/test_foo.py::test_bar - AssertionError: expected True",
            'File "tests/test_foo.py", line 10, in test_bar',
            "    assert result == True",
            "AssertionError: expected True"
        ]
        
        failure = self.agent._extract_pytest_failure(log_lines, 1)
        
        self.assertIsNotNone(failure)
        self.assertEqual(failure.test_name, "tests/test_foo.py::test_bar")
        self.assertEqual(failure.category, "test_failure")
        self.assertTrue(len(failure.stack_trace) > 0)
    
    def test_extract_python_error(self):
        """Test extracting Python error"""
        log_lines = [
            "Traceback (most recent call last):",
            '  File "main.py", line 42, in foo',
            "    raise ValueError('Invalid input')",
            "ValueError: Invalid input"
        ]
        
        failure = self.agent._extract_python_error(log_lines, 3)
        
        self.assertIsNotNone(failure)
        self.assertIn("ValueError", failure.error_message)
        self.assertEqual(failure.category, "python_error")
    
    def test_extract_missing_dependency(self):
        """Test extracting missing dependency"""
        log_lines = [
            "Import error:",
            "ModuleNotFoundError: No module named 'requests'",
            "Please install the module"
        ]
        
        failure = self.agent._extract_missing_dependency(log_lines, 1)
        
        self.assertIsNotNone(failure)
        self.assertEqual(failure.category, "missing_dependency")
        self.assertIn("requests", failure.error_message)
    
    def test_analyze_root_cause_missing_dependency(self):
        """Test root cause analysis for missing dependency"""
        failures = [
            FailureInfo(
                error_message="Missing module: requests",
                category="missing_dependency"
            )
        ]
        context = FailureContext("pr", 49, "owner/repo")
        
        root_cause = self.agent.analyze_root_cause(failures, context)
        
        self.assertIn("missing_dependency", root_cause)
        self.assertIn("requests", root_cause)
    
    def test_analyze_root_cause_test_failure(self):
        """Test root cause analysis for test failure"""
        failures = [
            FailureInfo(
                test_name="test_foo",
                error_message="AssertionError",
                category="test_failure"
            )
        ]
        context = FailureContext("pr", 49, "owner/repo")
        
        root_cause = self.agent.analyze_root_cause(failures, context)
        
        self.assertIn("test_failure", root_cause)
    
    def test_propose_dependency_fix(self):
        """Test proposing fix for missing dependency"""
        failures = [
            FailureInfo(
                error_message="Missing module: requests",
                category="missing_dependency"
            )
        ]
        
        fix = self.agent._propose_dependency_fix(failures)
        
        self.assertEqual(fix.type, "config")
        self.assertTrue(len(fix.commands) > 0)
        self.assertIn("pip install", fix.commands[0])
        self.assertEqual(fix.risk_level, "low")
    
    def test_propose_test_fix(self):
        """Test proposing fix for test failure"""
        failures = [
            FailureInfo(
                test_name="test_foo",
                category="test_failure",
                affected_files=["tests/test_foo.py"]
            )
        ]
        
        fix = self.agent._propose_test_fix(failures)
        
        self.assertEqual(fix.type, "patch")
        self.assertTrue(len(fix.files_changed) > 0)
    
    def test_create_triage_report(self):
        """Test creating triage report"""
        context = FailureContext(
            ref_type="pr",
            ref_id=49,
            repo="owner/repo",
            pr_number=49
        )
        
        failures = [
            FailureInfo(
                test_name="test_foo",
                error_message="Test failed",
                category="test_failure"
            )
        ]
        
        root_cause = "test_failure: 1 test failed"
        
        fix = FixProposal(
            type="patch",
            description="Fix test",
            risk_level="low",
            confidence="high"
        )
        
        report = self.agent.create_triage_report(context, failures, root_cause, fix)
        
        self.assertEqual(report.context.pr_number, 49)
        self.assertEqual(len(report.failure_details), 1)
        self.assertEqual(report.proposed_fix.type, "patch")
        self.assertTrue(len(report.next_steps) > 0)
    
    def test_format_markdown_report(self):
        """Test formatting Markdown report"""
        context = FailureContext(
            ref_type="pr",
            ref_id=49,
            repo="owner/repo",
            pr_number=49,
            commit_sha="abc123"
        )
        
        failure = FailureInfo(
            test_name="test_foo",
            error_message="Test failed",
            category="test_failure"
        )
        
        fix = FixProposal(
            type="patch",
            description="Fix test",
            risk_level="low",
            confidence="high"
        )
        
        report = TriageReport(
            context=context,
            failure_summary="1 failure detected",
            root_cause="test_failure: test_foo failed",
            failure_details=[failure],
            proposed_fix=fix,
            remediation_options=[fix],
            next_steps=["Review fix"],
            rollback_plan="Revert changes",
            correlation_id="TRIAGE-123"
        )
        
        md = self.agent._format_markdown_report(report)
        
        self.assertIn("# Phase 5 Failed-Run Triage Report", md)
        self.assertIn("test_foo", md)
        self.assertIn("Fix test", md)
        self.assertIn("Review fix", md)


class TestConfigGeneration(unittest.TestCase):
    """Test configuration generation and loading"""
    
    def test_generate_default_config(self):
        """Test generating default config"""
        config = generate_default_config()
        
        self.assertIn("repo", config)
        self.assertIn("failure_ref", config)
        self.assertEqual(config["repo"], "gcolon75/Project-Valine")
    
    def test_load_config_from_file(self):
        """Test loading config from JSON file"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            config_data = {
                "repo": "test/repo",
                "failure_ref": 99,
                "allow_auto_fix": True,
                "verbose": False
            }
            json.dump(config_data, f)
            config_path = f.name
        
        try:
            config = load_config(config_path)
            
            self.assertEqual(config.repo, "test/repo")
            self.assertEqual(config.failure_ref, 99)
            self.assertTrue(config.allow_auto_fix)
            self.assertFalse(config.verbose)
        finally:
            os.unlink(config_path)
    
    def test_load_config_with_env_vars(self):
        """Test loading config with ENV: references"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            config_data = {
                "repo": "test/repo",
                "failure_ref": 99,
                "github_token": "ENV:TEST_TOKEN"
            }
            json.dump(config_data, f)
            config_path = f.name
        
        try:
            # Set environment variable
            os.environ["TEST_TOKEN"] = "test_value"
            
            config = load_config(config_path)
            
            self.assertEqual(config.github_token, "test_value")
        finally:
            os.unlink(config_path)
            if "TEST_TOKEN" in os.environ:
                del os.environ["TEST_TOKEN"]


if __name__ == '__main__':
    unittest.main()
