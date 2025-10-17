#!/usr/bin/env python3
"""
Unit tests for Phase 5 Staging Validation Runner
"""

import unittest
import json
import tempfile
import os
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import sys

# Add orchestrator scripts to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from phase5_validation_runner import (
    ValidationRunnerConfig,
    StagingConfig,
    GitHubConfig,
    AWSConfig,
    TimeoutsConfig,
    ValidationStep,
    redact_secrets,
    redact_dict,
    RateLimiter,
    Phase5ValidationRunner
)


class TestRedaction(unittest.TestCase):
    """Test secret redaction functions"""
    
    def test_redact_secrets_token(self):
        """Test redacting tokens from text"""
        text = "Authorization: Bearer ghp_1234567890abcdef"
        result = redact_secrets(text)
        self.assertIn("***", result)
        self.assertNotIn("ghp_1234567890abcdef", result)
    
    def test_redact_secrets_password(self):
        """Test redacting passwords"""
        text = "password=supersecret123"
        result = redact_secrets(text)
        self.assertIn("***", result)
        self.assertNotIn("supersecret123", result)
    
    def test_redact_dict_simple(self):
        """Test redacting dictionary values"""
        data = {
            "token": "secret12345678",
            "user": "john"
        }
        result = redact_dict(data)
        self.assertEqual(result["user"], "john")
        self.assertIn("***", result["token"])
        self.assertNotIn("secret12345678", result["token"])
    
    def test_redact_dict_nested(self):
        """Test redacting nested dictionaries"""
        data = {
            "config": {
                "api_key": "key123456789",
                "timeout": 30
            }
        }
        result = redact_dict(data)
        self.assertEqual(result["config"]["timeout"], 30)
        self.assertIn("***", result["config"]["api_key"])
    
    def test_redact_short_values(self):
        """Test that short values are fully redacted"""
        data = {"key": "abc"}
        result = redact_dict(data)
        self.assertEqual(result["key"], "***")


class TestConfiguration(unittest.TestCase):
    """Test configuration classes"""
    
    def test_validation_runner_config_defaults(self):
        """Test default configuration"""
        config = ValidationRunnerConfig()
        self.assertEqual(config.repo, "gcolon75/Project-Valine")
        self.assertEqual(config.base_ref, "main")
        self.assertTrue(config.require_staging_only)
        self.assertTrue(config.enable_redaction)
    
    def test_config_from_dict(self):
        """Test creating config from dictionary"""
        data = {
            "repo": "test/repo",
            "base_ref": "develop",
            "staging": {
                "urls": ["https://staging.example.com"],
                "region": "us-east-1"
            },
            "timeouts": {
                "http_ms": 10000
            }
        }
        config = ValidationRunnerConfig.from_dict(data)
        self.assertEqual(config.repo, "test/repo")
        self.assertEqual(config.base_ref, "develop")
        self.assertEqual(config.staging.urls, ["https://staging.example.com"])
        self.assertEqual(config.staging.region, "us-east-1")
        self.assertEqual(config.timeouts.http_ms, 10000)
    
    def test_config_from_file(self):
        """Test loading config from file"""
        data = {
            "repo": "test/repo",
            "base_ref": "main"
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(data, f)
            temp_file = f.name
        
        try:
            config = ValidationRunnerConfig.from_file(temp_file)
            self.assertEqual(config.repo, "test/repo")
            self.assertEqual(config.base_ref, "main")
        finally:
            os.unlink(temp_file)


class TestRateLimiter(unittest.TestCase):
    """Test rate limiter"""
    
    def test_rate_limiter_basic(self):
        """Test basic rate limiting"""
        limiter = RateLimiter()
        limiter.min_interval = 0.1
        
        import time
        start = time.time()
        limiter.wait_if_needed('test_key')
        limiter.wait_if_needed('test_key')
        elapsed = time.time() - start
        
        # Second call should have waited at least min_interval
        self.assertGreater(elapsed, 0.08)  # Allow some tolerance
    
    def test_rate_limiter_different_keys(self):
        """Test that different keys don't interfere"""
        limiter = RateLimiter()
        limiter.min_interval = 0.5
        
        import time
        start = time.time()
        limiter.wait_if_needed('key1')
        limiter.wait_if_needed('key2')  # Different key, should not wait
        elapsed = time.time() - start
        
        self.assertLess(elapsed, 0.3)  # Should be fast


class TestValidationStep(unittest.TestCase):
    """Test validation step data class"""
    
    def test_validation_step_creation(self):
        """Test creating a validation step"""
        step = ValidationStep(
            step_number=3,
            step_name="Test Step",
            status="PASS",
            duration_ms=100.5
        )
        self.assertEqual(step.step_number, 3)
        self.assertEqual(step.step_name, "Test Step")
        self.assertEqual(step.status, "PASS")
        self.assertEqual(step.duration_ms, 100.5)
        self.assertIsInstance(step.timestamp, str)


class TestPhase5ValidationRunner(unittest.TestCase):
    """Test validation runner main class"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.config = ValidationRunnerConfig(
            repo="test/repo",
            base_ref="main",
            staging=StagingConfig(
                urls=["https://staging.example.com"],
                region="us-west-2"
            )
        )
    
    def test_runner_initialization(self):
        """Test runner initialization"""
        with tempfile.TemporaryDirectory() as tmpdir:
            self.config.evidence_dir = tmpdir
            runner = Phase5ValidationRunner(self.config)
            
            self.assertIsNotNone(runner.run_id)
            self.assertTrue(runner.run_id.startswith("phase5_run_"))
            self.assertEqual(len(runner.steps), 0)
    
    def test_generate_run_id(self):
        """Test run ID generation"""
        with tempfile.TemporaryDirectory() as tmpdir:
            self.config.evidence_dir = tmpdir
            runner = Phase5ValidationRunner(self.config)
            
            run_id = runner._generate_run_id()
            self.assertIsInstance(run_id, str)
            self.assertTrue(run_id.startswith("phase5_run_"))
            self.assertIn("_", run_id)
    
    def test_resolve_env_vars(self):
        """Test environment variable resolution"""
        os.environ['TEST_TOKEN'] = 'test_value_123'
        
        with tempfile.TemporaryDirectory() as tmpdir:
            config = ValidationRunnerConfig(
                evidence_dir=tmpdir,
                github=GitHubConfig(token="ENV:TEST_TOKEN")
            )
            runner = Phase5ValidationRunner(config)
            
            self.assertEqual(runner.config.github.token, 'test_value_123')
        
        del os.environ['TEST_TOKEN']
    
    def test_record_step(self):
        """Test recording a validation step"""
        with tempfile.TemporaryDirectory() as tmpdir:
            self.config.evidence_dir = tmpdir
            runner = Phase5ValidationRunner(self.config)
            
            step = ValidationStep(
                step_number=1,
                step_name="Test",
                status="PASS",
                duration_ms=100
            )
            
            runner._record_step(step)
            
            self.assertEqual(len(runner.steps), 1)
            self.assertEqual(runner.steps[0].step_name, "Test")
    
    @patch('phase5_validation_runner.subprocess.run')
    def test_run_command_success(self, mock_run):
        """Test running a successful command"""
        mock_run.return_value = Mock(
            returncode=0,
            stdout="output",
            stderr=""
        )
        
        with tempfile.TemporaryDirectory() as tmpdir:
            self.config.evidence_dir = tmpdir
            runner = Phase5ValidationRunner(self.config)
            
            success, stdout, stderr = runner._run_command(['echo', 'test'])
            
            self.assertTrue(success)
            self.assertEqual(stdout, "output")
    
    @patch('phase5_validation_runner.subprocess.run')
    def test_run_command_failure(self, mock_run):
        """Test running a failed command"""
        mock_run.return_value = Mock(
            returncode=1,
            stdout="",
            stderr="error"
        )
        
        with tempfile.TemporaryDirectory() as tmpdir:
            self.config.evidence_dir = tmpdir
            runner = Phase5ValidationRunner(self.config)
            
            success, stdout, stderr = runner._run_command(['false'])
            
            self.assertFalse(success)
            self.assertEqual(stderr, "error")
    
    @patch('phase5_validation_runner.subprocess.run')
    def test_preflight_checks_basic(self, mock_run):
        """Test basic preflight checks"""
        mock_run.return_value = Mock(
            returncode=0,
            stdout="ref: refs/heads/main",
            stderr=""
        )
        
        with tempfile.TemporaryDirectory() as tmpdir:
            self.config.evidence_dir = tmpdir
            self.config.staging.urls = []  # Skip URL checks
            runner = Phase5ValidationRunner(self.config)
            
            result = runner.preflight_checks()
            
            # Should pass even with warnings
            self.assertTrue(result)
            self.assertGreater(len(runner.steps), 0)
    
    def test_preflight_production_detection(self):
        """Test that production URLs are blocked"""
        with tempfile.TemporaryDirectory() as tmpdir:
            self.config.evidence_dir = tmpdir
            self.config.staging.urls = ["https://production.example.com"]
            self.config.require_staging_only = True
            
            runner = Phase5ValidationRunner(self.config)
            
            result = runner.preflight_checks()
            
            # Should fail due to production URL
            self.assertFalse(result)
    
    def test_generate_report(self):
        """Test report generation"""
        with tempfile.TemporaryDirectory() as tmpdir:
            self.config.evidence_dir = tmpdir
            runner = Phase5ValidationRunner(self.config)
            
            # Add a test step
            step = ValidationStep(
                step_number=1,
                step_name="Test",
                status="PASS",
                duration_ms=100
            )
            runner._record_step(step)
            
            # Generate report
            report = runner.generate_report()
            
            # Check report content
            self.assertIn("# Phase 5 Staging Validation Report", report)
            self.assertIn(runner.run_id, report)
            self.assertIn("Test", report)
            self.assertIn("PASS", report)
            
            # Check report file was created
            report_file = runner.evidence_dir / self.config.report_file
            self.assertTrue(report_file.exists())
    
    @patch('phase5_validation_runner.HAS_REQUESTS', False)
    def test_health_checks_no_requests(self):
        """Test health checks when requests library is not available"""
        with tempfile.TemporaryDirectory() as tmpdir:
            self.config.evidence_dir = tmpdir
            runner = Phase5ValidationRunner(self.config)
            
            result = runner.step5_health_checks()
            
            # Should skip gracefully
            self.assertTrue(result)
            step = [s for s in runner.steps if s.step_number == 5][0]
            self.assertEqual(step.status, "SKIP")
    
    @patch('phase5_validation_runner.HAS_BOTO3', False)
    def test_observability_no_boto3(self):
        """Test observability checks when boto3 is not available"""
        with tempfile.TemporaryDirectory() as tmpdir:
            self.config.evidence_dir = tmpdir
            runner = Phase5ValidationRunner(self.config)
            
            result = runner.step8_observability_alerts()
            
            # Should skip gracefully
            self.assertTrue(result)
            step = [s for s in runner.steps if s.step_number == 8][0]
            self.assertEqual(step.status, "SKIP")


class TestIntegration(unittest.TestCase):
    """Integration tests"""
    
    def test_full_config_roundtrip(self):
        """Test creating config, saving, and loading"""
        original = ValidationRunnerConfig(
            repo="test/repo",
            base_ref="develop",
            staging=StagingConfig(
                urls=["https://staging.test.com"],
                region="us-east-1"
            ),
            timeouts=TimeoutsConfig(
                action_dispatch_ms=300000,
                http_ms=10000
            )
        )
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            # Manually create dict structure
            data = {
                "repo": original.repo,
                "base_ref": original.base_ref,
                "staging": {
                    "urls": original.staging.urls,
                    "region": original.staging.region
                },
                "timeouts": {
                    "action_dispatch_ms": original.timeouts.action_dispatch_ms,
                    "http_ms": original.timeouts.http_ms
                }
            }
            json.dump(data, f)
            temp_file = f.name
        
        try:
            loaded = ValidationRunnerConfig.from_file(temp_file)
            self.assertEqual(loaded.repo, original.repo)
            self.assertEqual(loaded.base_ref, original.base_ref)
            self.assertEqual(loaded.staging.urls, original.staging.urls)
            self.assertEqual(loaded.timeouts.http_ms, original.timeouts.http_ms)
        finally:
            os.unlink(temp_file)


if __name__ == '__main__':
    unittest.main()
