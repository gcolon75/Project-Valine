"""
Unit tests for Phase 5 Double-Check Agent
"""
import json
import os
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch, MagicMock, mock_open
from pathlib import Path
from datetime import datetime, timezone

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from phase5_doublecheck_agent import (
    PrimaryCheckResult,
    SecondaryCheckResult,
    DoubleCheckResult,
    DoubleCheckConfig,
    Phase5DoubleCheckAgent
)


class TestDataClasses(unittest.TestCase):
    """Test data classes"""
    
    def test_primary_check_result(self):
        """Test PrimaryCheckResult creation"""
        check = PrimaryCheckResult(
            check_id='health_check',
            check_type='health',
            status='pass',
            details={'status_code': 200},
            timestamp='2025-10-17T00:00:00Z'
        )
        
        self.assertEqual(check.check_id, 'health_check')
        self.assertEqual(check.check_type, 'health')
        self.assertEqual(check.status, 'pass')
    
    def test_secondary_check_result(self):
        """Test SecondaryCheckResult creation"""
        check = SecondaryCheckResult(
            check_id='health_check',
            check_type='health',
            method='HEAD request',
            status='pass',
            details={'head_status': 200},
            timestamp='2025-10-17T00:00:00Z'
        )
        
        self.assertEqual(check.check_id, 'health_check')
        self.assertEqual(check.method, 'HEAD request')
    
    def test_double_check_result(self):
        """Test DoubleCheckResult creation"""
        result = DoubleCheckResult(
            check_id='health_check',
            check_type='health',
            pass_primary=True,
            pass_secondary=True,
            consistent=True
        )
        
        self.assertTrue(result.consistent)
        self.assertIsNone(result.discrepancy_note)
    
    def test_double_check_result_with_discrepancy(self):
        """Test DoubleCheckResult with discrepancy"""
        result = DoubleCheckResult(
            check_id='health_check',
            check_type='health',
            pass_primary=True,
            pass_secondary=False,
            consistent=False,
            discrepancy_note='HEAD returned 503 but GET returned 200'
        )
        
        self.assertFalse(result.consistent)
        self.assertIsNotNone(result.discrepancy_note)


class TestDoubleCheckConfig(unittest.TestCase):
    """Test DoubleCheckConfig"""
    
    def test_config_from_dict(self):
        """Test creating config from dictionary"""
        config = DoubleCheckConfig(
            primary_report_path='/path/to/report.json',
            repo='test/repo',
            output_dir='./output'
        )
        
        self.assertEqual(config.primary_report_path, '/path/to/report.json')
        self.assertEqual(config.repo, 'test/repo')
        self.assertTrue(config.read_only)
        self.assertTrue(config.redact_secrets)
    
    def test_config_from_file(self):
        """Test loading config from JSON file"""
        config_data = {
            'repo': 'test/repo',
            'staging_urls': ['https://staging.example.com'],
            'aws_region': 'us-west-2'
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(config_data, f)
            config_file = f.name
        
        try:
            config = DoubleCheckConfig.from_file(config_file, '/path/to/report.json')
            
            self.assertEqual(config.repo, 'test/repo')
            self.assertEqual(config.staging_urls, ['https://staging.example.com'])
            self.assertEqual(config.primary_report_path, '/path/to/report.json')
        finally:
            os.unlink(config_file)


class TestPhase5DoubleCheckAgent(unittest.TestCase):
    """Test Phase5DoubleCheckAgent"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        self.config = DoubleCheckConfig(
            primary_report_path=os.path.join(self.temp_dir, 'report.json'),
            repo='test/repo',
            staging_urls=['https://staging.example.com'],
            output_dir=self.temp_dir
        )
        self.agent = Phase5DoubleCheckAgent(self.config)
    
    def tearDown(self):
        """Clean up test fixtures"""
        import shutil
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
    
    def test_agent_initialization(self):
        """Test agent initialization"""
        self.assertIsNotNone(self.agent.run_id)
        self.assertTrue(self.agent.run_id.startswith('DOUBLECHECK-'))
        self.assertEqual(len(self.agent.primary_checks), 0)
        self.assertEqual(len(self.agent.secondary_checks), 0)
        self.assertTrue(os.path.exists(self.temp_dir))
    
    def test_infer_check_type_health(self):
        """Test inferring health check type"""
        check_type = self.agent._infer_check_type('health_api_check')
        self.assertEqual(check_type, 'health')
        
        check_type = self.agent._infer_check_type('api_ping_test')
        self.assertEqual(check_type, 'health')
    
    def test_infer_check_type_version(self):
        """Test inferring version check type"""
        check_type = self.agent._infer_check_type('version_endpoint')
        self.assertEqual(check_type, 'version')
        
        check_type = self.agent._infer_check_type('build_id_check')
        self.assertEqual(check_type, 'version')
    
    def test_infer_check_type_artifacts(self):
        """Test inferring artifacts check type"""
        check_type = self.agent._infer_check_type('artifact_validation')
        self.assertEqual(check_type, 'artifacts')
        
        check_type = self.agent._infer_check_type('github_actions_check')
        self.assertEqual(check_type, 'artifacts')
    
    def test_infer_check_type_logs(self):
        """Test inferring logs check type"""
        check_type = self.agent._infer_check_type('cloudwatch_logs')
        self.assertEqual(check_type, 'logs')
        
        check_type = self.agent._infer_check_type('log_ingestion')
        self.assertEqual(check_type, 'logs')
    
    def test_infer_check_type_alerts(self):
        """Test inferring alerts check type"""
        check_type = self.agent._infer_check_type('alert_notification')
        self.assertEqual(check_type, 'alerts')
        
        check_type = self.agent._infer_check_type('notification_test')
        self.assertEqual(check_type, 'alerts')
    
    def test_infer_check_type_other(self):
        """Test inferring other check type"""
        check_type = self.agent._infer_check_type('some_random_check')
        self.assertEqual(check_type, 'other')
    
    def test_load_primary_report_evidence_format(self):
        """Test loading primary report with evidence format"""
        report_data = {
            'evidence': [
                {
                    'test_name': 'health_check',
                    'status': 'pass',
                    'details': {'status_code': 200},
                    'timestamp': '2025-10-17T00:00:00Z'
                },
                {
                    'test_name': 'version_check',
                    'status': 'pass',
                    'details': {'version': '1.0.0'},
                    'timestamp': '2025-10-17T00:00:00Z'
                }
            ]
        }
        
        with open(self.config.primary_report_path, 'w') as f:
            json.dump(report_data, f)
        
        result = self.agent.load_primary_report()
        
        self.assertTrue(result)
        self.assertEqual(len(self.agent.primary_checks), 2)
        self.assertEqual(self.agent.primary_checks[0].check_id, 'health_check')
        self.assertEqual(self.agent.primary_checks[0].check_type, 'health')
        self.assertEqual(self.agent.primary_checks[1].check_id, 'version_check')
        self.assertEqual(self.agent.primary_checks[1].check_type, 'version')
    
    def test_load_primary_report_checks_format(self):
        """Test loading primary report with checks format"""
        report_data = {
            'checks': [
                {
                    'check_id': 'health_api',
                    'status': 'pass',
                    'details': {'status_code': 200}
                }
            ]
        }
        
        with open(self.config.primary_report_path, 'w') as f:
            json.dump(report_data, f)
        
        result = self.agent.load_primary_report()
        
        self.assertTrue(result)
        self.assertEqual(len(self.agent.primary_checks), 1)
        self.assertEqual(self.agent.primary_checks[0].check_id, 'health_api')
    
    def test_load_primary_report_file_not_found(self):
        """Test loading non-existent primary report"""
        self.config.primary_report_path = '/nonexistent/report.json'
        result = self.agent.load_primary_report()
        
        self.assertFalse(result)
    
    def test_load_primary_report_invalid_json(self):
        """Test loading invalid JSON primary report"""
        with open(self.config.primary_report_path, 'w') as f:
            f.write('invalid json{')
        
        result = self.agent.load_primary_report()
        
        self.assertFalse(result)
    
    @patch('phase5_doublecheck_agent.requests.head')
    @patch('phase5_doublecheck_agent.requests.get')
    def test_run_secondary_health_check_success(self, mock_get, mock_head):
        """Test successful secondary health check"""
        mock_head.return_value = Mock(status_code=200)
        mock_get.return_value = Mock(status_code=200)
        
        primary = PrimaryCheckResult(
            check_id='health_check',
            check_type='health',
            status='pass',
            details={'status_code': 200, 'url': 'https://example.com'},
            timestamp='2025-10-17T00:00:00Z'
        )
        
        secondary = self.agent.run_secondary_health_check(primary)
        
        self.assertEqual(secondary.status, 'pass')
        self.assertEqual(secondary.check_id, 'health_check')
        self.assertIn('head_status', secondary.details)
    
    @patch('phase5_doublecheck_agent.requests.get')
    @patch('phase5_doublecheck_agent.requests.head')
    def test_run_secondary_health_check_failure(self, mock_head, mock_get):
        """Test failed secondary health check"""
        mock_head.return_value = Mock(status_code=503)
        mock_get.return_value = Mock(status_code=503)
        
        primary = PrimaryCheckResult(
            check_id='health_check',
            check_type='health',
            status='pass',
            details={'status_code': 200, 'url': 'https://example.com'},
            timestamp='2025-10-17T00:00:00Z'
        )
        
        secondary = self.agent.run_secondary_health_check(primary)
        
        self.assertEqual(secondary.status, 'fail')
    
    def test_run_secondary_health_check_no_url(self):
        """Test secondary health check with no URL"""
        primary = PrimaryCheckResult(
            check_id='health_check',
            check_type='health',
            status='pass',
            details={'status_code': 200},
            timestamp='2025-10-17T00:00:00Z'
        )
        
        secondary = self.agent.run_secondary_health_check(primary)
        
        self.assertEqual(secondary.status, 'error')
        self.assertIn('error', secondary.details)
    
    @patch('phase5_doublecheck_agent.requests.get')
    def test_run_secondary_version_check_success(self, mock_get):
        """Test successful secondary version check"""
        html = '<html><head><meta name="version" content="1.0.0"></head></html>'
        mock_get.return_value = Mock(text=html, status_code=200)
        
        primary = PrimaryCheckResult(
            check_id='version_check',
            check_type='version',
            status='pass',
            details={'version': '1.0.0', 'url': 'https://example.com'},
            timestamp='2025-10-17T00:00:00Z'
        )
        
        secondary = self.agent.run_secondary_version_check(primary)
        
        self.assertEqual(secondary.status, 'pass')
        self.assertIn('version_from_meta', secondary.details)
    
    @patch('phase5_doublecheck_agent.requests.get')
    def test_run_secondary_version_check_no_version(self, mock_get):
        """Test secondary version check with no version found"""
        html = '<html><head></head></html>'
        mock_get.return_value = Mock(text=html, status_code=200)
        
        primary = PrimaryCheckResult(
            check_id='version_check',
            check_type='version',
            status='pass',
            details={'version': '1.0.0', 'url': 'https://example.com'},
            timestamp='2025-10-17T00:00:00Z'
        )
        
        secondary = self.agent.run_secondary_version_check(primary)
        
        self.assertEqual(secondary.status, 'fail')
    
    @patch('subprocess.run')
    def test_run_secondary_artifacts_check_success(self, mock_run):
        """Test successful secondary artifacts check"""
        mock_run.return_value = Mock(
            returncode=0,
            stdout='5\n',
            stderr=''
        )
        
        primary = PrimaryCheckResult(
            check_id='artifacts_check',
            check_type='artifacts',
            status='pass',
            details={'run_id': 12345, 'artifact_count': 5},
            timestamp='2025-10-17T00:00:00Z'
        )
        
        secondary = self.agent.run_secondary_artifacts_check(primary)
        
        self.assertEqual(secondary.status, 'pass')
        self.assertIn('job_count', secondary.details)
    
    def test_run_secondary_artifacts_check_no_run_id(self):
        """Test secondary artifacts check with no run_id"""
        primary = PrimaryCheckResult(
            check_id='artifacts_check',
            check_type='artifacts',
            status='pass',
            details={'artifact_count': 5},
            timestamp='2025-10-17T00:00:00Z'
        )
        
        secondary = self.agent.run_secondary_artifacts_check(primary)
        
        self.assertEqual(secondary.status, 'error')
        self.assertIn('error', secondary.details)
    
    @patch('subprocess.run')
    def test_run_secondary_logs_check_success(self, mock_run):
        """Test successful secondary logs check"""
        logs_output = json.dumps({
            'events': [
                {'message': 'log entry 1'},
                {'message': 'log entry 2'}
            ]
        })
        
        mock_run.return_value = Mock(
            returncode=0,
            stdout=logs_output,
            stderr=''
        )
        
        self.agent.config.log_group = '/aws/lambda/test'
        
        primary = PrimaryCheckResult(
            check_id='logs_check',
            check_type='logs',
            status='pass',
            details={'trace_id': 'trace-123'},
            timestamp='2025-10-17T00:00:00Z'
        )
        
        secondary = self.agent.run_secondary_logs_check(primary)
        
        self.assertEqual(secondary.status, 'pass')
        self.assertIn('event_count', secondary.details)
        self.assertEqual(secondary.details['event_count'], 2)
    
    def test_run_secondary_logs_check_no_trace_id(self):
        """Test secondary logs check with no trace_id"""
        primary = PrimaryCheckResult(
            check_id='logs_check',
            check_type='logs',
            status='pass',
            details={},
            timestamp='2025-10-17T00:00:00Z'
        )
        
        secondary = self.agent.run_secondary_logs_check(primary)
        
        self.assertEqual(secondary.status, 'error')
        self.assertIn('error', secondary.details)
    
    def test_run_secondary_alerts_check(self):
        """Test secondary alerts check"""
        primary = PrimaryCheckResult(
            check_id='alerts_check',
            check_type='alerts',
            status='pass',
            details={'alert_id': 'alert-123'},
            timestamp='2025-10-17T00:00:00Z'
        )
        
        secondary = self.agent.run_secondary_alerts_check(primary)
        
        # This is currently a simulated check
        self.assertEqual(secondary.status, 'pass')
        self.assertIn('alert_id', secondary.details)
    
    def test_create_double_check_matrix_consistent(self):
        """Test creating double-check matrix with consistent results"""
        # Add primary check
        self.agent.primary_checks.append(PrimaryCheckResult(
            check_id='health_check',
            check_type='health',
            status='pass',
            details={'status_code': 200},
            timestamp='2025-10-17T00:00:00Z'
        ))
        
        # Add matching secondary check
        self.agent.secondary_checks.append(SecondaryCheckResult(
            check_id='health_check',
            check_type='health',
            method='HEAD request',
            status='pass',
            details={'head_status': 200},
            timestamp='2025-10-17T00:00:00Z'
        ))
        
        result = self.agent.create_double_check_matrix()
        
        self.assertTrue(result)
        self.assertEqual(len(self.agent.double_check_results), 1)
        self.assertTrue(self.agent.double_check_results[0].consistent)
        self.assertEqual(self.agent.stats['consistent_checks'], 1)
        self.assertEqual(self.agent.stats['inconsistent_checks'], 0)
    
    def test_create_double_check_matrix_inconsistent(self):
        """Test creating double-check matrix with inconsistent results"""
        # Add primary check
        self.agent.primary_checks.append(PrimaryCheckResult(
            check_id='health_check',
            check_type='health',
            status='pass',
            details={'status_code': 200},
            timestamp='2025-10-17T00:00:00Z'
        ))
        
        # Add non-matching secondary check
        self.agent.secondary_checks.append(SecondaryCheckResult(
            check_id='health_check',
            check_type='health',
            method='HEAD request',
            status='fail',
            details={'head_status': 503},
            timestamp='2025-10-17T00:00:00Z'
        ))
        
        result = self.agent.create_double_check_matrix()
        
        self.assertTrue(result)
        self.assertEqual(len(self.agent.double_check_results), 1)
        self.assertFalse(self.agent.double_check_results[0].consistent)
        self.assertIsNotNone(self.agent.double_check_results[0].discrepancy_note)
        self.assertEqual(self.agent.stats['consistent_checks'], 0)
        self.assertEqual(self.agent.stats['inconsistent_checks'], 1)
    
    def test_generate_json_matrix(self):
        """Test generating JSON matrix report"""
        # Add a double-check result
        self.agent.double_check_results.append(DoubleCheckResult(
            check_id='health_check',
            check_type='health',
            pass_primary=True,
            pass_secondary=True,
            consistent=True
        ))
        self.agent.stats['total_checks'] = 1
        self.agent.stats['consistent_checks'] = 1
        
        output_file = self.agent.generate_json_matrix()
        
        self.assertTrue(os.path.exists(output_file))
        
        with open(output_file, 'r') as f:
            data = json.load(f)
        
        self.assertIn('run_id', data)
        self.assertIn('checks', data)
        self.assertEqual(len(data['checks']), 1)
    
    def test_generate_markdown_report(self):
        """Test generating markdown report"""
        # Add a double-check result
        self.agent.double_check_results.append(DoubleCheckResult(
            check_id='health_check',
            check_type='health',
            pass_primary=True,
            pass_secondary=True,
            consistent=True,
            primary_details={'status_code': 200},
            secondary_details={'head_status': 200}
        ))
        self.agent.stats['total_checks'] = 1
        self.agent.stats['consistent_checks'] = 1
        
        output_file = self.agent.generate_markdown_report()
        
        self.assertTrue(os.path.exists(output_file))
        
        with open(output_file, 'r') as f:
            content = f.read()
        
        self.assertIn('Phase 5 Double-Check Report', content)
        self.assertIn('health_check', content)
        self.assertIn('100.0%', content)  # 100% consistency
    
    def test_generate_markdown_report_with_inconsistencies(self):
        """Test generating markdown report with inconsistencies"""
        # Add an inconsistent result
        self.agent.double_check_results.append(DoubleCheckResult(
            check_id='health_check',
            check_type='health',
            pass_primary=True,
            pass_secondary=False,
            consistent=False,
            discrepancy_note='HEAD returned 503 but GET returned 200',
            primary_details={'status_code': 200},
            secondary_details={'head_status': 503}
        ))
        self.agent.stats['total_checks'] = 1
        self.agent.stats['inconsistent_checks'] = 1
        
        output_file = self.agent.generate_markdown_report()
        
        self.assertTrue(os.path.exists(output_file))
        
        with open(output_file, 'r') as f:
            content = f.read()
        
        self.assertIn('Inconsistent Checks Details', content)
        self.assertIn('HEAD returned 503 but GET returned 200', content)


class TestSafeRemediation(unittest.TestCase):
    """Test safe remediation functionality"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        self.config = DoubleCheckConfig(
            primary_report_path=os.path.join(self.temp_dir, 'report.json'),
            repo='test/repo',
            staging_urls=['https://staging.example.com'],
            output_dir=self.temp_dir
        )
        self.agent = Phase5DoubleCheckAgent(self.config)
    
    def tearDown(self):
        """Clean up test fixtures"""
        import shutil
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
    
    @patch('phase5_doublecheck_agent.requests.head')
    @patch('phase5_doublecheck_agent.requests.get')
    @patch('time.sleep')
    def test_remediation_health_check_success(self, mock_sleep, mock_get, mock_head):
        """Test successful remediation for health check"""
        # Set up inconsistent result
        primary = PrimaryCheckResult(
            check_id='health_check',
            check_type='health',
            status='pass',
            details={'status_code': 200, 'url': 'https://example.com'},
            timestamp='2025-10-17T00:00:00Z'
        )
        
        self.agent.primary_checks.append(primary)
        
        # First call fails, second succeeds (remediation)
        mock_head.side_effect = [
            Mock(status_code=503),  # Initial fail
            Mock(status_code=200)   # Retry success
        ]
        mock_get.return_value = Mock(status_code=200)
        
        result = DoubleCheckResult(
            check_id='health_check',
            check_type='health',
            pass_primary=True,
            pass_secondary=False,
            consistent=False
        )
        
        self.agent.double_check_results.append(result)
        
        # Attempt remediation
        self.agent.attempt_safe_remediation()
        
        self.assertTrue(result.remediation_attempted)
        self.assertTrue(result.pass_secondary)
        self.assertTrue(result.consistent)
        self.assertEqual(self.agent.stats['remediation_attempted'], 1)
        self.assertEqual(self.agent.stats['remediation_successful'], 1)


if __name__ == '__main__':
    unittest.main()
