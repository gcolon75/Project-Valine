"""
Unit tests for Phase 5 Staging Validator
"""
import json
import os
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from phase5_staging_validator import (
    ValidationConfig,
    ValidationEvidence,
    Phase5StagingValidator
)


class TestValidationConfig(unittest.TestCase):
    """Test ValidationConfig class"""
    
    def test_default_values(self):
        """Test default configuration values"""
        config = ValidationConfig(staging_deploy_method="aws_parameter_store")
        
        self.assertEqual(config.staging_deploy_method, "aws_parameter_store")
        self.assertEqual(config.aws_region, "us-west-2")
        self.assertEqual(config.correlation_id_prefix, "STG")
        self.assertEqual(config.evidence_output_dir, "./validation_evidence")
    
    def test_from_file(self):
        """Test loading configuration from JSON file"""
        config_data = {
            "staging_deploy_method": "sam_deploy",
            "aws_region": "us-east-1",
            "staging_lambda_discord": "test-lambda",
            "test_channel_id": "TEST123"
        }
        
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as f:
            json.dump(config_data, f)
            config_file = f.name
        
        try:
            config = ValidationConfig.from_file(config_file)
            self.assertEqual(config.staging_deploy_method, "sam_deploy")
            self.assertEqual(config.aws_region, "us-east-1")
            self.assertEqual(config.staging_lambda_discord, "test-lambda")
            self.assertEqual(config.test_channel_id, "TEST123")
        finally:
            os.unlink(config_file)
    
    def test_to_dict(self):
        """Test converting configuration to dictionary"""
        config = ValidationConfig(
            staging_deploy_method="aws_parameter_store",
            staging_lambda_discord="test-lambda"
        )
        
        config_dict = config.to_dict()
        self.assertIsInstance(config_dict, dict)
        self.assertEqual(config_dict["staging_deploy_method"], "aws_parameter_store")
        self.assertEqual(config_dict["staging_lambda_discord"], "test-lambda")


class TestValidationEvidence(unittest.TestCase):
    """Test ValidationEvidence class"""
    
    def test_evidence_creation(self):
        """Test creating evidence object"""
        evidence = ValidationEvidence(
            timestamp="2025-10-16T12:00:00Z",
            test_name="test_example",
            status="pass",
            details={"message": "Test passed"}
        )
        
        self.assertEqual(evidence.test_name, "test_example")
        self.assertEqual(evidence.status, "pass")
        self.assertEqual(evidence.details["message"], "Test passed")
        self.assertIsNone(evidence.logs)


class TestPhase5StagingValidator(unittest.TestCase):
    """Test Phase5StagingValidator class"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.config = ValidationConfig(
            staging_deploy_method="aws_parameter_store",
            staging_lambda_discord="test-lambda-discord",
            staging_lambda_github="test-lambda-github",
            test_channel_id="TEST_CHANNEL_123",
            log_group_discord="/aws/lambda/test-lambda-discord"
        )
        
        # Create validator with temp evidence directory
        self.temp_dir = tempfile.mkdtemp()
        self.config.evidence_output_dir = self.temp_dir
        self.validator = Phase5StagingValidator(self.config)
    
    def tearDown(self):
        """Clean up test fixtures"""
        # Clean up temp directory
        import shutil
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
    
    def test_initialization(self):
        """Test validator initialization"""
        self.assertIsNotNone(self.validator.correlation_id)
        self.assertTrue(self.validator.correlation_id.startswith("STG-"))
        self.assertEqual(self.validator.test_results["passed"], 0)
        self.assertEqual(self.validator.test_results["failed"], 0)
        self.assertEqual(self.validator.test_results["skipped"], 0)
        self.assertTrue(os.path.exists(self.temp_dir))
    
    def test_generate_correlation_id(self):
        """Test correlation ID generation"""
        correlation_id = self.validator._generate_correlation_id()
        
        self.assertIsInstance(correlation_id, str)
        self.assertTrue(correlation_id.startswith("STG-"))
        self.assertGreater(len(correlation_id), 10)
    
    def test_record_evidence_pass(self):
        """Test recording passing evidence"""
        self.validator._record_evidence(
            "test_pass",
            "pass",
            {"message": "Test passed"}
        )
        
        self.assertEqual(len(self.validator.evidence), 1)
        self.assertEqual(self.validator.test_results["passed"], 1)
        self.assertEqual(self.validator.test_results["failed"], 0)
        
        evidence = self.validator.evidence[0]
        self.assertEqual(evidence.test_name, "test_pass")
        self.assertEqual(evidence.status, "pass")
    
    def test_record_evidence_fail(self):
        """Test recording failing evidence"""
        self.validator._record_evidence(
            "test_fail",
            "fail",
            {"error": "Test failed"}
        )
        
        self.assertEqual(len(self.validator.evidence), 1)
        self.assertEqual(self.validator.test_results["passed"], 0)
        self.assertEqual(self.validator.test_results["failed"], 1)
    
    def test_record_evidence_skip(self):
        """Test recording skipped evidence"""
        self.validator._record_evidence(
            "test_skip",
            "skip",
            {"message": "Test skipped"}
        )
        
        self.assertEqual(len(self.validator.evidence), 1)
        self.assertEqual(self.validator.test_results["skipped"], 1)
    
    @patch('phase5_staging_validator.subprocess.run')
    def test_check_aws_cli_available(self, mock_run):
        """Test AWS CLI availability check (success)"""
        mock_result = Mock()
        mock_result.returncode = 0
        mock_run.return_value = mock_result
        
        result = self.validator._check_aws_cli()
        self.assertTrue(result)
        mock_run.assert_called_once()
    
    @patch('phase5_staging_validator.subprocess.run')
    def test_check_aws_cli_not_available(self, mock_run):
        """Test AWS CLI availability check (failure)"""
        mock_run.side_effect = Exception("Command not found")
        
        result = self.validator._check_aws_cli()
        self.assertFalse(result)
    
    @patch('phase5_staging_validator.subprocess.run')
    def test_check_github_cli_available(self, mock_run):
        """Test GitHub CLI availability check (success)"""
        mock_result = Mock()
        mock_result.returncode = 0
        mock_run.return_value = mock_result
        
        result = self.validator._check_github_cli()
        self.assertTrue(result)
    
    @patch.object(Phase5StagingValidator, '_check_aws_cli')
    @patch.object(Phase5StagingValidator, '_check_github_cli')
    def test_preflight_checks_success(self, mock_gh_cli, mock_aws_cli):
        """Test successful preflight checks"""
        mock_aws_cli.return_value = True
        mock_gh_cli.return_value = True
        
        result = self.validator.preflight_checks()
        
        self.assertTrue(result)
        self.assertGreater(self.validator.test_results["passed"], 0)
        self.assertEqual(self.validator.test_results["failed"], 0)
    
    @patch.object(Phase5StagingValidator, '_check_aws_cli')
    @patch.object(Phase5StagingValidator, '_check_github_cli')
    def test_preflight_checks_aws_cli_missing(self, mock_gh_cli, mock_aws_cli):
        """Test preflight checks with AWS CLI missing"""
        mock_aws_cli.return_value = False
        mock_gh_cli.return_value = True
        
        result = self.validator.preflight_checks()
        
        self.assertFalse(result)
        self.assertGreater(self.validator.test_results["failed"], 0)
    
    def test_preflight_checks_production_channel_detected(self):
        """Test preflight checks detect production channel"""
        # Create validator with production-like channel ID
        config = ValidationConfig(
            staging_deploy_method="aws_parameter_store",
            staging_lambda_discord="test-lambda",
            test_channel_id="PRODUCTION_CHANNEL_123"
        )
        config.evidence_output_dir = self.temp_dir
        validator = Phase5StagingValidator(config)
        
        with patch.object(validator, '_check_aws_cli', return_value=True):
            with patch.object(validator, '_check_github_cli', return_value=True):
                result = validator.preflight_checks()
        
        self.assertFalse(result)
        # Check that production channel was flagged
        channel_safety_evidence = [e for e in validator.evidence 
                                   if e.test_name == "preflight_channel_safety"]
        self.assertEqual(len(channel_safety_evidence), 1)
        self.assertEqual(channel_safety_evidence[0].status, "fail")
    
    @patch('phase5_staging_validator.subprocess.run')
    def test_set_environment_variable_lambda_success(self, mock_run):
        """Test setting Lambda environment variable (success)"""
        # Mock get-function-configuration
        get_result = Mock()
        get_result.returncode = 0
        get_result.stdout = json.dumps({
            "Environment": {
                "Variables": {
                    "EXISTING_VAR": "value"
                }
            }
        })
        
        # Mock update-function-configuration
        update_result = Mock()
        update_result.returncode = 0
        
        mock_run.side_effect = [get_result, update_result]
        
        result = self.validator.set_environment_variable_lambda(
            "test-lambda",
            "NEW_VAR",
            "new_value"
        )
        
        self.assertTrue(result)
        self.assertEqual(mock_run.call_count, 2)
    
    @patch('phase5_staging_validator.subprocess.run')
    def test_set_environment_variable_lambda_get_config_fails(self, mock_run):
        """Test setting Lambda environment variable (get config fails)"""
        mock_result = Mock()
        mock_result.returncode = 1
        mock_result.stderr = "Lambda not found"
        mock_run.return_value = mock_result
        
        result = self.validator.set_environment_variable_lambda(
            "test-lambda",
            "NEW_VAR",
            "new_value"
        )
        
        self.assertFalse(result)
    
    @patch.object(Phase5StagingValidator, 'set_environment_variable_lambda')
    def test_enable_debug_command_success(self, mock_set_env):
        """Test enabling debug command (success)"""
        mock_set_env.return_value = True
        
        result = self.validator.enable_debug_command()
        
        self.assertTrue(result)
        mock_set_env.assert_called_once_with(
            "test-lambda-discord",
            "ENABLE_DEBUG_CMD",
            "true"
        )
        
        # Check evidence recorded
        evidence = [e for e in self.validator.evidence if e.test_name == "enable_debug_cmd"]
        self.assertEqual(len(evidence), 1)
        self.assertEqual(evidence[0].status, "pass")
    
    @patch.object(Phase5StagingValidator, 'set_environment_variable_lambda')
    def test_enable_debug_command_failure(self, mock_set_env):
        """Test enabling debug command (failure)"""
        mock_set_env.return_value = False
        
        result = self.validator.enable_debug_command()
        
        self.assertFalse(result)
        
        # Check evidence recorded
        evidence = [e for e in self.validator.evidence if e.test_name == "enable_debug_cmd"]
        self.assertEqual(len(evidence), 1)
        self.assertEqual(evidence[0].status, "fail")
    
    @patch.object(Phase5StagingValidator, 'set_environment_variable_lambda')
    def test_enable_alerts_success(self, mock_set_env):
        """Test enabling alerts (success)"""
        mock_set_env.return_value = True
        
        result = self.validator.enable_alerts("TEST_CHANNEL_456")
        
        self.assertTrue(result)
        self.assertEqual(mock_set_env.call_count, 2)
        
        # Check both ALERT_CHANNEL_ID and ENABLE_ALERTS were set
        calls = mock_set_env.call_args_list
        self.assertEqual(calls[0][0][1], "ALERT_CHANNEL_ID")
        self.assertEqual(calls[0][0][2], "TEST_CHANNEL_456")
        self.assertEqual(calls[1][0][1], "ENABLE_ALERTS")
        self.assertEqual(calls[1][0][2], "true")
    
    @patch.object(Phase5StagingValidator, 'set_environment_variable_lambda')
    def test_disable_alerts(self, mock_set_env):
        """Test disabling alerts"""
        mock_set_env.return_value = True
        
        result = self.validator.disable_alerts()
        
        self.assertTrue(result)
        mock_set_env.assert_called_once_with(
            "test-lambda-discord",
            "ENABLE_ALERTS",
            "false"
        )
    
    def test_validate_debug_last(self):
        """Test validate_debug_last (manual test)"""
        result = self.validator.validate_debug_last()
        
        # Should return True but mark as skip
        self.assertTrue(result)
        
        # Check evidence
        evidence = [e for e in self.validator.evidence if e.test_name == "validate_debug_last"]
        self.assertEqual(len(evidence), 1)
        self.assertEqual(evidence[0].status, "skip")
        self.assertIn("test_steps", evidence[0].details)
    
    def test_validate_alerts(self):
        """Test validate_alerts (manual test)"""
        result = self.validator.validate_alerts()
        
        # Should return True but mark as skip
        self.assertTrue(result)
        
        # Check evidence
        evidence = [e for e in self.validator.evidence if e.test_name == "validate_alerts"]
        self.assertEqual(len(evidence), 1)
        self.assertEqual(evidence[0].status, "skip")
        self.assertIn("test_steps", evidence[0].details)
    
    @patch('phase5_staging_validator.subprocess.run')
    def test_collect_cloudwatch_logs_success(self, mock_run):
        """Test collecting CloudWatch logs (success)"""
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stdout = json.dumps({
            "events": [
                {"message": "Log entry 1"},
                {"message": "Log entry 2"}
            ]
        })
        mock_run.return_value = mock_result
        
        logs = self.validator.collect_cloudwatch_logs(trace_id="test-trace-123")
        
        self.assertEqual(len(logs), 2)
        self.assertEqual(logs[0], "Log entry 1")
        self.assertEqual(logs[1], "Log entry 2")
        
        # Check evidence
        evidence = [e for e in self.validator.evidence 
                   if e.test_name == "collect_cloudwatch_logs"]
        self.assertEqual(len(evidence), 1)
        self.assertEqual(evidence[0].status, "pass")
    
    def test_collect_cloudwatch_logs_no_log_group(self):
        """Test collecting CloudWatch logs with no log group configured"""
        config = ValidationConfig(
            staging_deploy_method="aws_parameter_store",
            staging_lambda_discord="test-lambda"
        )
        config.evidence_output_dir = self.temp_dir
        validator = Phase5StagingValidator(config)
        
        logs = validator.collect_cloudwatch_logs()
        
        self.assertEqual(len(logs), 0)
    
    def test_generate_validation_report(self):
        """Test generating validation report"""
        # Add some evidence
        self.validator._record_evidence("test1", "pass", {"msg": "Test 1 passed"})
        self.validator._record_evidence("test2", "fail", {"error": "Test 2 failed"})
        self.validator._record_evidence("test3", "skip", {"msg": "Test 3 skipped"})
        
        report = self.validator.generate_validation_report()
        
        # Check report content
        self.assertIn("Phase 5 Staging Validation Report", report)
        self.assertIn(self.validator.correlation_id, report)
        self.assertIn("✅ Passed: 1", report)
        self.assertIn("❌ Failed: 1", report)
        self.assertIn("⏭️ Skipped: 1", report)
        self.assertIn("test1", report)
        self.assertIn("test2", report)
        self.assertIn("test3", report)
        
        # Check report file created
        report_files = [f for f in os.listdir(self.temp_dir) 
                       if f.startswith("validation_report_")]
        self.assertEqual(len(report_files), 1)


if __name__ == '__main__':
    unittest.main()
