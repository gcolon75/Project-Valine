"""
Unit tests for Phase 5 Super-Agent
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

from phase5_super_agent import (
    SuperAgentConfig,
    CheckResult,
    ValidationReport,
    Phase5SuperAgent,
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
                "password": "mypassword123456"
            }
        }
        result = redact_secrets(data)
        
        self.assertEqual(result["config"]["user"], "john")
        self.assertEqual(result["config"]["password"], "***3456")
    
    def test_redact_inline_patterns(self):
        """Test redacting inline patterns in strings"""
        data = "Authorization: Bearer ghp_1234567890abcdef"
        result = redact_secrets(data)
        
        self.assertIn("***", result)
        self.assertIn("cdef", result)
        self.assertNotIn("ghp_1234567890", result)
    
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


class TestSuperAgentConfig(unittest.TestCase):
    """Test SuperAgentConfig dataclass"""
    
    def test_default_config(self):
        """Test default configuration values"""
        config = SuperAgentConfig()
        
        self.assertEqual(config.repo, "gcolon75/Project-Valine")
        self.assertEqual(config.base_ref, "main")
        self.assertEqual(config.aws_region, "us-west-2")
        self.assertTrue(config.verbose)
        self.assertTrue(config.redaction_enabled)
        self.assertFalse(config.dry_run)
    
    def test_custom_config(self):
        """Test custom configuration values"""
        config = SuperAgentConfig(
            repo="test/repo",
            base_ref="develop",
            dry_run=True,
            verbose=False
        )
        
        self.assertEqual(config.repo, "test/repo")
        self.assertEqual(config.base_ref, "develop")
        self.assertTrue(config.dry_run)
        self.assertFalse(config.verbose)


class TestCheckResult(unittest.TestCase):
    """Test CheckResult dataclass"""
    
    def test_check_result_creation(self):
        """Test creating a CheckResult"""
        result = CheckResult(
            name="Test Check",
            status="PASS",
            primary_result={"value": 123},
            duration_ms=100.5
        )
        
        self.assertEqual(result.name, "Test Check")
        self.assertEqual(result.status, "PASS")
        self.assertEqual(result.primary_result["value"], 123)
        self.assertEqual(result.duration_ms, 100.5)
        self.assertTrue(result.consistent)
        self.assertIsNone(result.error)
    
    def test_check_result_with_error(self):
        """Test CheckResult with error"""
        result = CheckResult(
            name="Failed Check",
            status="FAIL",
            error="Connection timeout",
            consistent=False
        )
        
        self.assertEqual(result.status, "FAIL")
        self.assertEqual(result.error, "Connection timeout")
        self.assertFalse(result.consistent)


class TestPhase5SuperAgent(unittest.TestCase):
    """Test Phase5SuperAgent class"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.config = SuperAgentConfig(
            repo="test/repo",
            base_ref="main",
            verbose=False,
            dry_run=True
        )
        
        # Create temporary directory for evidence
        self.temp_dir = tempfile.mkdtemp()
        self.config.evidence_output_dir = self.temp_dir
        
        self.agent = Phase5SuperAgent(self.config)
    
    def tearDown(self):
        """Clean up"""
        import shutil
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
    
    def test_agent_initialization(self):
        """Test agent initialization"""
        self.assertEqual(self.agent.config.repo, "test/repo")
        self.assertTrue(self.agent.correlation_id.startswith("SUPER-AGENT"))
        self.assertEqual(len(self.agent.checks), 0)
        self.assertEqual(len(self.agent.issues), 0)
        self.assertEqual(len(self.agent.remediation), 0)
    
    def test_resolve_env_vars(self):
        """Test environment variable resolution"""
        os.environ["TEST_TOKEN"] = "test_value_123456"
        
        config = SuperAgentConfig(
            discord_bot_token="ENV:TEST_TOKEN"
        )
        
        agent = Phase5SuperAgent(config)
        self.assertEqual(agent.config.discord_bot_token, "test_value_123456")
        
        # Clean up
        del os.environ["TEST_TOKEN"]
    
    def test_add_check(self):
        """Test adding check results"""
        result = CheckResult(
            name="Test Check",
            status="PASS",
            duration_ms=50.0
        )
        
        self.agent.add_check(result)
        
        self.assertEqual(len(self.agent.checks), 1)
        self.assertEqual(self.agent.checks[0].name, "Test Check")
    
    def test_add_check_with_failure(self):
        """Test adding failed check creates issue"""
        result = CheckResult(
            name="Failed Check",
            status="FAIL",
            error="Test error",
            duration_ms=50.0
        )
        
        self.agent.add_check(result)
        
        self.assertEqual(len(self.agent.checks), 1)
        self.assertEqual(len(self.agent.issues), 1)
        self.assertEqual(self.agent.issues[0]["check"], "Failed Check")
        self.assertEqual(self.agent.issues[0]["error"], "Test error")
    
    def test_add_remediation(self):
        """Test adding remediation steps"""
        self.agent.add_remediation("Fix issue 1")
        self.agent.add_remediation("Fix issue 2")
        
        self.assertEqual(len(self.agent.remediation), 2)
        self.assertEqual(self.agent.remediation[0], "Fix issue 1")
    
    @patch('subprocess.run')
    def test_check_tokens_present(self, mock_run):
        """Test token presence check"""
        # Set tokens
        self.agent.config.discord_bot_token = "test_token"
        self.agent.config.discord_app_id = "test_app_id"
        self.agent.config.discord_guild_id = "test_guild_id"
        self.agent.config.github_token = "test_gh_token"
        
        self.agent._check_tokens_present()
        
        # Should have added one check
        self.assertEqual(len(self.agent.checks), 1)
        self.assertEqual(self.agent.checks[0].status, "PASS")
    
    @patch('subprocess.run')
    def test_check_tokens_missing(self, mock_run):
        """Test token presence check with missing tokens"""
        # Clear tokens
        self.agent.config.discord_bot_token = None
        self.agent.config.discord_app_id = None
        
        self.agent._check_tokens_present()
        
        # Should have added one check with WARNING
        self.assertEqual(len(self.agent.checks), 1)
        self.assertEqual(self.agent.checks[0].status, "WARNING")
        
        # Should have remediation steps
        self.assertGreater(len(self.agent.remediation), 0)
    
    @patch('requests.head')
    def test_check_urls_reachable_success(self, mock_head):
        """Test URL reachability check - success"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.headers = {"Content-Type": "text/html"}
        mock_head.return_value = mock_response
        
        self.agent.config.staging_urls = ["https://test.example.com"]
        self.agent._check_urls_reachable()
        
        # Should have added one check
        self.assertEqual(len(self.agent.checks), 1)
        self.assertEqual(self.agent.checks[0].status, "PASS")
    
    @patch('requests.head')
    def test_check_urls_reachable_failure(self, mock_head):
        """Test URL reachability check - failure"""
        mock_head.side_effect = Exception("Connection refused")
        
        self.agent.config.staging_urls = ["https://test.example.com"]
        self.agent._check_urls_reachable()
        
        # Should have added one check with FAIL
        self.assertEqual(len(self.agent.checks), 1)
        self.assertEqual(self.agent.checks[0].status, "FAIL")
        
        # Should have remediation step
        self.assertGreater(len(self.agent.remediation), 0)
    
    def test_discover_validation_scripts(self):
        """Test validation scripts discovery"""
        self.agent._discover_validation_scripts()
        
        # Should have added one check
        self.assertEqual(len(self.agent.checks), 1)
        self.assertEqual(self.agent.checks[0].name, "Discover Validation Scripts")
        self.assertEqual(self.agent.checks[0].status, "PASS")
    
    @patch('requests.get')
    @patch('requests.head')
    def test_step5_health_checks(self, mock_head, mock_get):
        """Test Step 5 health checks with double-check"""
        # Mock primary GET request
        mock_get_response = Mock()
        mock_get_response.status_code = 200
        mock_get_response.content = b'{"status": "ok"}'
        mock_get_response.elapsed.total_seconds.return_value = 0.1
        mock_get.return_value = mock_get_response
        
        # Mock secondary HEAD request
        mock_head_response = Mock()
        mock_head_response.status_code = 200
        mock_head_response.elapsed.total_seconds.return_value = 0.05
        mock_head.return_value = mock_head_response
        
        self.agent.config.staging_urls = ["https://test.example.com/api/health"]
        self.agent._step5_health_checks()
        
        # Should have added one check
        self.assertEqual(len(self.agent.checks), 1)
        check = self.agent.checks[0]
        
        self.assertEqual(check.status, "PASS")
        self.assertTrue(check.consistent)
        self.assertIsNotNone(check.primary_result)
        self.assertIsNotNone(check.secondary_result)
    
    @patch('requests.get')
    @patch('requests.head')
    def test_step5_health_checks_inconsistent(self, mock_head, mock_get):
        """Test Step 5 health checks with inconsistent results"""
        # Mock primary GET request (200)
        mock_get_response = Mock()
        mock_get_response.status_code = 200
        mock_get_response.content = b'{"status": "ok"}'
        mock_get_response.elapsed.total_seconds.return_value = 0.1
        mock_get.return_value = mock_get_response
        
        # Mock secondary HEAD request (500 - inconsistent!)
        mock_head_response = Mock()
        mock_head_response.status_code = 500
        mock_head_response.elapsed.total_seconds.return_value = 0.05
        mock_head.return_value = mock_head_response
        
        self.agent.config.staging_urls = ["https://test.example.com/api/health"]
        self.agent._step5_health_checks()
        
        # Should have added one check
        self.assertEqual(len(self.agent.checks), 1)
        check = self.agent.checks[0]
        
        self.assertFalse(check.consistent)
        self.assertGreater(len(self.agent.remediation), 0)
    
    @patch('subprocess.run')
    def test_step6_smoke_tests(self, mock_run):
        """Test Step 6 smoke tests check"""
        # Mock pytest --version
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stdout = "pytest 7.4.0"
        mock_run.return_value = mock_result
        
        self.agent._step6_smoke_tests()
        
        # Should have added one check
        self.assertEqual(len(self.agent.checks), 1)
        check = self.agent.checks[0]
        
        self.assertEqual(check.name, "Step 6: Smoke Tests")
    
    @patch('subprocess.run')
    def test_step8_observability_checks(self, mock_run):
        """Test Step 8 observability checks"""
        # Mock CloudWatch logs describe-log-groups
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stdout = json.dumps({
            "logGroups": [
                {"logGroupName": "/aws/lambda/test"}
            ]
        })
        mock_run.return_value = mock_result
        
        self.agent._step8_observability_checks()
        
        # Should have added one check
        self.assertEqual(len(self.agent.checks), 1)
        check = self.agent.checks[0]
        
        self.assertEqual(check.name, "Step 8: Observability Checks")
    
    @patch('requests.get')
    def test_run_discord_validation_success(self, mock_get):
        """Test Discord validation with successful response"""
        # Set Discord config
        self.agent.config.discord_bot_token = "test_token"
        self.agent.config.discord_app_id = "12345"
        self.agent.config.discord_guild_id = "67890"
        
        # Mock commands list response
        commands_response = Mock()
        commands_response.status_code = 200
        commands_response.json.return_value = [
            {"name": "verify-latest", "id": "1"},
            {"name": "diagnose", "id": "2"}
        ]
        
        # Mock bot info response
        bot_response = Mock()
        bot_response.status_code = 200
        bot_response.json.return_value = {
            "username": "TestBot",
            "id": "12345"
        }
        
        mock_get.side_effect = [commands_response, bot_response]
        
        result = self.agent.run_discord_validation()
        
        self.assertEqual(len(result["verified"]), 2)
        self.assertIn("verify-latest", result["verified"])
        self.assertIn("diagnose", result["verified"])
        
        # Check that missing commands are detected
        self.assertGreater(len(result["missing"]), 0)
    
    @patch('requests.get')
    def test_run_discord_validation_failure(self, mock_get):
        """Test Discord validation with failed response"""
        # Set Discord config
        self.agent.config.discord_bot_token = "test_token"
        self.agent.config.discord_app_id = "12345"
        self.agent.config.discord_guild_id = "67890"
        
        # Mock 401 unauthorized response
        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.json.return_value = {"message": "Unauthorized"}
        mock_get.return_value = mock_response
        
        result = self.agent.run_discord_validation()
        
        self.assertGreater(len(result["errors"]), 0)
        self.assertGreater(len(self.agent.remediation), 0)
    
    def test_run_discord_validation_skip(self):
        """Test Discord validation when credentials missing"""
        # Clear Discord config
        self.agent.config.discord_bot_token = None
        
        result = self.agent.run_discord_validation()
        
        # Should skip validation
        self.assertEqual(len(result["commands"]), 0)
        
        # Should have added SKIP check
        skip_checks = [c for c in self.agent.checks if c.status == "SKIP"]
        self.assertGreater(len(skip_checks), 0)
    
    def test_generate_report(self):
        """Test report generation"""
        # Add some checks
        self.agent.add_check(CheckResult(
            name="Test Check 1",
            status="PASS",
            duration_ms=100
        ))
        
        self.agent.add_check(CheckResult(
            name="Test Check 2",
            status="FAIL",
            error="Test error",
            duration_ms=200
        ))
        
        discord_results = {
            "commands": [],
            "verified": ["test-command"],
            "missing": [],
            "errors": []
        }
        
        report = self.agent.generate_report(discord_results)
        
        self.assertIsInstance(report, ValidationReport)
        self.assertEqual(len(report.steps), 2)
        self.assertIn("Total Checks:** 2", report.summary)
        self.assertIn("Passed: 1", report.summary)
        self.assertIn("Failed: 1", report.summary)
    
    def test_save_report_creates_files(self):
        """Test that report files are created"""
        # Add a check
        self.agent.add_check(CheckResult(
            name="Test Check",
            status="PASS",
            duration_ms=50
        ))
        
        # Generate report
        discord_results = {"commands": [], "verified": [], "missing": [], "errors": []}
        report = self.agent.generate_report(discord_results)
        
        # Check that files were created
        evidence_dir = Path(self.temp_dir)
        json_files = list(evidence_dir.glob("super_agent_report_*.json"))
        md_files = list(evidence_dir.glob("super_agent_report_*.md"))
        
        self.assertGreater(len(json_files), 0)
        self.assertGreater(len(md_files), 0)


class TestConfigGeneration(unittest.TestCase):
    """Test configuration generation and loading"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        self.original_cwd = os.getcwd()
        os.chdir(self.temp_dir)
    
    def tearDown(self):
        """Clean up"""
        os.chdir(self.original_cwd)
        import shutil
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
    
    def test_generate_default_config(self):
        """Test generating default configuration file"""
        config_path = generate_default_config()
        
        self.assertTrue(os.path.exists(config_path))
        
        # Load and verify
        with open(config_path) as f:
            data = json.load(f)
        
        self.assertEqual(data["repo"], "gcolon75/Project-Valine")
        self.assertEqual(data["base_ref"], "main")
        self.assertIn("staging", data)
        self.assertIn("discord", data)
        self.assertIn("github", data)
    
    def test_load_config(self):
        """Test loading configuration from file"""
        # Create a test config file
        config_data = {
            "repo": "test/repo",
            "base_ref": "develop",
            "staging": {
                "urls": ["https://test.com"],
                "region": "us-east-1"
            },
            "flags": {
                "dry_run": True,
                "verbose": False
            }
        }
        
        config_path = "test_config.json"
        with open(config_path, 'w') as f:
            json.dump(config_data, f)
        
        # Load config
        config = load_config(config_path)
        
        self.assertEqual(config.repo, "test/repo")
        self.assertEqual(config.base_ref, "develop")
        self.assertEqual(config.staging_urls, ["https://test.com"])
        self.assertEqual(config.staging_region, "us-east-1")
        self.assertTrue(config.dry_run)
        self.assertFalse(config.verbose)


if __name__ == "__main__":
    unittest.main()
