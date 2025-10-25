"""
Integration tests for Phase 5 Double-Check Agent

These tests verify the complete workflow from loading a primary report
through generating the final double-check reports.
"""
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from phase5_doublecheck_agent import (
    DoubleCheckConfig,
    Phase5DoubleCheckAgent
)


class TestPhase5DoubleCheckIntegration(unittest.TestCase):
    """Integration tests for the complete double-check workflow"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        
        # Create a sample primary report
        self.primary_report_path = os.path.join(self.temp_dir, 'primary_report.json')
        self.primary_report_data = {
            'run_id': 'TEST-RUN-001',
            'timestamp': '2025-10-17T12:00:00Z',
            'evidence': [
                {
                    'test_name': 'health_check',
                    'status': 'pass',
                    'details': {'status_code': 200, 'url': 'https://example.com'},
                    'timestamp': '2025-10-17T12:00:01Z'
                },
                {
                    'test_name': 'version_check',
                    'status': 'pass',
                    'details': {'version': '1.0.0', 'url': 'https://example.com'},
                    'timestamp': '2025-10-17T12:00:02Z'
                }
            ],
            'test_results': {
                'passed': 2,
                'failed': 0,
                'skipped': 0
            }
        }
        
        with open(self.primary_report_path, 'w') as f:
            json.dump(self.primary_report_data, f)
        
        # Create config
        self.config = DoubleCheckConfig(
            primary_report_path=self.primary_report_path,
            repo='test/repo',
            staging_urls=['https://example.com'],
            output_dir=self.temp_dir,
            read_only=True,
            redact_secrets=True
        )
    
    def tearDown(self):
        """Clean up test fixtures"""
        import shutil
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
    
    def test_complete_workflow(self):
        """Test the complete double-check workflow"""
        agent = Phase5DoubleCheckAgent(self.config)
        
        # Load primary report
        result = agent.load_primary_report()
        self.assertTrue(result)
        self.assertEqual(len(agent.primary_checks), 2)
        
        # Verify checks were loaded correctly
        check_ids = [check.check_id for check in agent.primary_checks]
        self.assertIn('health_check', check_ids)
        self.assertIn('version_check', check_ids)
        
        # Verify check types were inferred
        check_types = {check.check_id: check.check_type for check in agent.primary_checks}
        self.assertEqual(check_types['health_check'], 'health')
        self.assertEqual(check_types['version_check'], 'version')
    
    def test_report_generation(self):
        """Test that reports are generated successfully"""
        agent = Phase5DoubleCheckAgent(self.config)
        
        # Load primary report
        agent.load_primary_report()
        
        # Add a mock double-check result
        from phase5_doublecheck_agent import DoubleCheckResult
        agent.double_check_results.append(DoubleCheckResult(
            check_id='health_check',
            check_type='health',
            pass_primary=True,
            pass_secondary=True,
            consistent=True,
            primary_details={'status_code': 200},
            secondary_details={'head_status': 200}
        ))
        agent.stats['total_checks'] = 1
        agent.stats['consistent_checks'] = 1
        
        # Generate JSON matrix
        json_file = agent.generate_json_matrix()
        self.assertTrue(os.path.exists(json_file))
        
        # Verify JSON content
        with open(json_file, 'r') as f:
            data = json.load(f)
        self.assertIn('run_id', data)
        self.assertIn('statistics', data)
        self.assertIn('checks', data)
        self.assertEqual(len(data['checks']), 1)
        
        # Generate markdown report
        md_file = agent.generate_markdown_report()
        self.assertTrue(os.path.exists(md_file))
        
        # Verify markdown content
        with open(md_file, 'r') as f:
            content = f.read()
        self.assertIn('Phase 5 Double-Check Report', content)
        self.assertIn('health_check', content)
        self.assertIn('100.0%', content)  # 100% consistency
    
    def test_secret_redaction_in_reports(self):
        """Test that secrets are redacted in generated reports"""
        # Create a report with sensitive data
        sensitive_report = self.primary_report_data.copy()
        sensitive_report['evidence'][0]['details']['api_token'] = 'secret123456789'
        
        sensitive_report_path = os.path.join(self.temp_dir, 'sensitive_report.json')
        with open(sensitive_report_path, 'w') as f:
            json.dump(sensitive_report, f)
        
        config = DoubleCheckConfig(
            primary_report_path=sensitive_report_path,
            repo='test/repo',
            output_dir=self.temp_dir,
            redact_secrets=True
        )
        
        agent = Phase5DoubleCheckAgent(config)
        agent.load_primary_report()
        
        # Add a result with the sensitive data
        from phase5_doublecheck_agent import DoubleCheckResult
        agent.double_check_results.append(DoubleCheckResult(
            check_id='health_check',
            check_type='health',
            pass_primary=True,
            pass_secondary=True,
            consistent=True,
            primary_details={'api_token': 'secret123456789'},
            secondary_details={'head_status': 200}
        ))
        agent.stats['total_checks'] = 1
        agent.stats['consistent_checks'] = 1
        
        # Generate reports
        json_file = agent.generate_json_matrix()
        
        # Verify secrets are redacted in JSON
        with open(json_file, 'r') as f:
            data = json.load(f)
        
        # The secret should be redacted
        primary_details = data['checks'][0]['primary_details']
        self.assertIn('api_token', primary_details)
        # Should show only last 4 chars
        self.assertTrue(primary_details['api_token'].startswith('***'))
        self.assertNotIn('secret123456789', json.dumps(data))


class TestReportFormats(unittest.TestCase):
    """Test report format specifications"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Clean up test fixtures"""
        import shutil
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
    
    def test_json_matrix_structure(self):
        """Test JSON matrix has required fields"""
        from phase5_doublecheck_agent import DoubleCheckResult
        
        config = DoubleCheckConfig(
            primary_report_path='dummy.json',
            output_dir=self.temp_dir
        )
        agent = Phase5DoubleCheckAgent(config)
        
        # Add test results
        agent.double_check_results = [
            DoubleCheckResult(
                check_id='test_check',
                check_type='health',
                pass_primary=True,
                pass_secondary=False,
                consistent=False,
                discrepancy_note='Test discrepancy',
                primary_details={'key': 'value1'},
                secondary_details={'key': 'value2'}
            )
        ]
        agent.stats = {
            'total_checks': 1,
            'consistent_checks': 0,
            'inconsistent_checks': 1,
            'remediation_attempted': 0,
            'remediation_successful': 0
        }
        
        json_file = agent.generate_json_matrix()
        
        with open(json_file, 'r') as f:
            data = json.load(f)
        
        # Verify required top-level fields
        self.assertIn('run_id', data)
        self.assertIn('timestamp', data)
        self.assertIn('statistics', data)
        self.assertIn('checks', data)
        
        # Verify statistics structure
        stats = data['statistics']
        self.assertIn('total_checks', stats)
        self.assertIn('consistent_checks', stats)
        self.assertIn('inconsistent_checks', stats)
        
        # Verify check structure
        check = data['checks'][0]
        self.assertEqual(check['check_id'], 'test_check')
        self.assertEqual(check['check_type'], 'health')
        self.assertTrue(check['pass_primary'])
        self.assertFalse(check['pass_secondary'])
        self.assertFalse(check['consistent'])
        self.assertEqual(check['discrepancy_note'], 'Test discrepancy')
    
    def test_markdown_report_structure(self):
        """Test markdown report has required sections"""
        from phase5_doublecheck_agent import DoubleCheckResult
        
        config = DoubleCheckConfig(
            primary_report_path='dummy.json',
            output_dir=self.temp_dir
        )
        agent = Phase5DoubleCheckAgent(config)
        
        # Add test results
        agent.double_check_results = [
            DoubleCheckResult(
                check_id='test_check',
                check_type='health',
                pass_primary=True,
                pass_secondary=False,
                consistent=False,
                discrepancy_note='Test discrepancy',
                primary_details={'key': 'value1'},
                secondary_details={'key': 'value2'}
            )
        ]
        agent.stats = {
            'total_checks': 1,
            'consistent_checks': 0,
            'inconsistent_checks': 1,
            'remediation_attempted': 0,
            'remediation_successful': 0
        }
        
        md_file = agent.generate_markdown_report()
        
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Verify required sections
        self.assertIn('# Phase 5 Double-Check Report', content)
        self.assertIn('## Executive Summary', content)
        self.assertIn('## Consistency Rate', content)
        self.assertIn('## Double-Check Matrix', content)
        self.assertIn('## Inconsistent Checks Details', content)
        self.assertIn('## Success Criteria', content)
        
        # Verify check details
        self.assertIn('test_check', content)
        self.assertIn('Test discrepancy', content)


if __name__ == '__main__':
    unittest.main()
