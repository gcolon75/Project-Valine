"""
Tests for QA Checker agent.
Tests PR validation logic and acceptance criteria checks.
"""
import unittest
from unittest.mock import Mock, patch, MagicMock
import json
from app.agents.qa_checker import QAChecker, PRValidationResult


class TestPRValidationResult(unittest.TestCase):
    """Test cases for PRValidationResult class."""
    
    def test_initial_status(self):
        """Test initial status is PASS."""
        result = PRValidationResult()
        self.assertEqual(result.status, "PASS")
        self.assertEqual(len(result.checks), 0)
        self.assertEqual(len(result.evidence), 0)
        self.assertEqual(len(result.fixes), 0)
    
    def test_add_check_passing(self):
        """Test adding a passing check."""
        result = PRValidationResult()
        result.add_check("Test Check", True, "Details")
        
        self.assertEqual(result.status, "PASS")
        self.assertEqual(len(result.checks), 1)
        self.assertTrue(result.checks[0]['passed'])
        self.assertEqual(result.checks[0]['name'], "Test Check")
    
    def test_add_check_failing(self):
        """Test adding a failing check changes status to FAIL."""
        result = PRValidationResult()
        result.add_check("Test Check", False, "Failed details")
        
        self.assertEqual(result.status, "FAIL")
        self.assertEqual(len(result.checks), 1)
        self.assertFalse(result.checks[0]['passed'])
    
    def test_add_evidence(self):
        """Test adding evidence."""
        result = PRValidationResult()
        result.add_evidence("Test Evidence", {"key": "value"})
        
        self.assertEqual(len(result.evidence), 1)
        self.assertEqual(result.evidence[0]['description'], "Test Evidence")
        self.assertEqual(result.evidence[0]['data'], {"key": "value"})
    
    def test_add_fix(self):
        """Test adding a fix."""
        result = PRValidationResult()
        result.add_fix("Fix description", "file.py", 42)
        
        self.assertEqual(len(result.fixes), 1)
        self.assertEqual(result.fixes[0]['description'], "Fix description")
        self.assertEqual(result.fixes[0]['file'], "file.py")
        self.assertEqual(result.fixes[0]['line'], 42)


class TestQAChecker(unittest.TestCase):
    """Test cases for QAChecker class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.checker = QAChecker("test-owner/test-repo", "test-token")
    
    def test_init(self):
        """Test QAChecker initialization."""
        self.assertEqual(self.checker.repo, "test-owner/test-repo")
        self.assertEqual(self.checker.github_token, "test-token")
        self.assertIn("Authorization", self.checker.headers)
    
    @patch('app.agents.qa_checker.requests.get')
    def test_get_pr_success(self, mock_get):
        """Test getting PR details successfully."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'number': 123,
            'title': 'Test PR',
            'state': 'open'
        }
        mock_get.return_value = mock_response
        
        pr_data = self.checker._get_pr(123)
        
        self.assertIsNotNone(pr_data)
        self.assertEqual(pr_data['number'], 123)
        self.assertEqual(pr_data['title'], 'Test PR')
    
    @patch('app.agents.qa_checker.requests.get')
    def test_get_pr_not_found(self, mock_get):
        """Test getting PR when not found."""
        mock_response = Mock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response
        
        pr_data = self.checker._get_pr(123)
        
        self.assertIsNone(pr_data)
    
    @patch('app.agents.qa_checker.requests.get')
    def test_get_pr_files(self, mock_get):
        """Test getting PR files."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {'filename': 'file1.py', 'status': 'modified'},
            {'filename': 'file2.py', 'status': 'added'}
        ]
        mock_get.return_value = mock_response
        
        files = self.checker._get_pr_files(123)
        
        self.assertEqual(len(files), 2)
        self.assertEqual(files[0]['filename'], 'file1.py')
    
    def test_check_workflow_inputs_missing_file(self):
        """Test workflow input check when file is missing."""
        result = PRValidationResult()
        files = [
            {'filename': 'some-other-file.yml', 'patch': ''}
        ]
        
        self.checker._check_workflow_inputs(result, files)
        
        # Should have a failing check for missing workflow file
        self.assertEqual(result.status, "FAIL")
        self.assertGreater(len(result.fixes), 0)
    
    def test_check_workflow_inputs_with_correlation_id(self):
        """Test workflow input check with correlation_id."""
        result = PRValidationResult()
        files = [
            {
                'filename': '.github/workflows/client-deploy.yml',
                'patch': '''
                +  workflow_dispatch:
                +    inputs:
                +      correlation_id:
                +        description: "Correlation ID"
                +      requester:
                +        description: "Requester"
                +run-name: "Deploy — ${{ inputs.correlation_id }}"
                '''
            }
        ]
        
        self.checker._check_workflow_inputs(result, files)
        
        # Should pass checks for correlation_id and requester
        passed_checks = [c for c in result.checks if c['passed']]
        self.assertGreaterEqual(len(passed_checks), 2)
    
    def test_check_dispatcher_with_implementations(self):
        """Test dispatcher check with required implementations."""
        result = PRValidationResult()
        files = [
            {
                'filename': 'app/services/github_actions_dispatcher.py',
                'patch': '''
                +    def trigger_client_deploy(self, correlation_id, requester, api_base=''):
                +        payload['inputs']['correlation_id'] = correlation_id
                +    def find_run_by_correlation(self, correlation_id):
                +        # Implementation
                +    def poll_run_conclusion(self, run_id, timeout_seconds=180):
                +        # Implementation
                '''
            }
        ]
        
        self.checker._check_dispatcher_implementation(result, files)
        
        # Should pass checks
        passed_checks = [c for c in result.checks if c['passed']]
        self.assertGreaterEqual(len(passed_checks), 2)
    
    def test_check_discord_handler_wait_flow(self):
        """Test Discord handler wait flow check."""
        result = PRValidationResult()
        files = [
            {
                'filename': 'app/handlers/discord_handler.py',
                'patch': '''
                +        wait = False
                +        for option in options:
                +            if option.get('name') == 'wait':
                +                wait = option.get('value', False)
                +        if wait:
                +            return create_response(5)  # DEFERRED
                +            _post_followup_message(interaction, content)
                '''
            }
        ]
        
        self.checker._check_discord_handler_wait_flow(result, files)
        
        # Should pass checks for wait, deferred, and follow-up
        passed_checks = [c for c in result.checks if c['passed']]
        self.assertGreaterEqual(len(passed_checks), 2)
    
    def test_check_agent_registry_with_all_agents(self):
        """Test agent registry check with all required agents."""
        result = PRValidationResult()
        files = [
            {
                'filename': 'app/agents/registry.py',
                'patch': '''
                +        AgentInfo(
                +            id='deploy_verifier',
                +            name='Deploy Verifier',
                +        ),
                +        AgentInfo(
                +            id='diagnose_runner',
                +            name='Diagnose Runner',
                +        ),
                +        AgentInfo(
                +            id='status_reporter',
                +            name='Status Reporter',
                +        ),
                +        AgentInfo(
                +            id='deploy_client',
                +            name='Deploy Client',
                +        )
                '''
            }
        ]
        
        self.checker._check_agent_registry(result, files)
        
        # Should pass checks
        passed_checks = [c for c in result.checks if c['passed']]
        self.assertGreaterEqual(len(passed_checks), 1)
    
    def test_check_agents_command(self):
        """Test /agents command check."""
        result = PRValidationResult()
        files = [
            {
                'filename': 'app/handlers/discord_handler.py',
                'patch': '''
                +def handle_agents_command(interaction):
                +    from app.agents.registry import get_agents
                +    agents = get_agents()
                '''
            }
        ]
        
        self.checker._check_agents_command(result, files)
        
        # Should pass checks
        passed_checks = [c for c in result.checks if c['passed']]
        self.assertGreaterEqual(len(passed_checks), 1)
    
    def test_check_status_digest_command(self):
        """Test /status-digest command check."""
        result = PRValidationResult()
        files = [
            {
                'filename': 'app/handlers/discord_handler.py',
                'patch': '''
                +def handle_status_digest_command(interaction):
                +    period = 'daily'
                +    for option in options:
                +        if option.get('name') == 'period':
                +            period = option.get('value', 'daily')
                +    if period == 'weekly':
                +        cutoff = now - timedelta(days=7)
                +    success_count = sum(1 for r in filtered_runs if r.get('conclusion') == 'success')
                +    failure_count = sum(1 for r in filtered_runs if r.get('conclusion') == 'failure')
                '''
            }
        ]
        
        self.checker._check_status_digest_command(result, files)
        
        # Should pass checks for period and aggregation
        passed_checks = [c for c in result.checks if c['passed']]
        self.assertGreaterEqual(len(passed_checks), 2)
    
    def test_format_review_comment_pass(self):
        """Test formatting review comment for PASS."""
        result = PRValidationResult()
        result.add_check("Check 1", True, "Details")
        result.add_check("Check 2", True)
        result.add_evidence("Evidence 1", {"key": "value"})
        
        comment = self.checker.format_review_comment(result, "Test PR Title")
        
        self.assertIn("Test PR Title", comment)
        self.assertIn("PASS", comment)
        self.assertIn("✅", comment)
        self.assertIn("APPROVE", comment)
        self.assertNotIn("REQUEST CHANGES", comment)
    
    def test_format_review_comment_fail(self):
        """Test formatting review comment for FAIL."""
        result = PRValidationResult()
        result.add_check("Check 1", True)
        result.add_check("Check 2", False, "Failed")
        result.add_fix("Fix this", "file.py", 10)
        
        comment = self.checker.format_review_comment(result, "Test PR Title")
        
        self.assertIn("FAIL", comment)
        self.assertIn("❌", comment)
        self.assertIn("REQUEST CHANGES", comment)
        self.assertIn("Required Fixes", comment)
        self.assertIn("Fix this", comment)
    
    @patch('app.agents.qa_checker.requests.post')
    def test_post_review_approve(self, mock_post):
        """Test posting approval review."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        
        self.checker.post_review(123, "Test review", approve=True)
        
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        payload = call_args[1]['json']
        self.assertEqual(payload['event'], "APPROVE")
    
    @patch('app.agents.qa_checker.requests.post')
    def test_post_review_request_changes(self, mock_post):
        """Test posting request changes review."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        
        self.checker.post_review(123, "Test review", approve=False)
        
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        payload = call_args[1]['json']
        self.assertEqual(payload['event'], "REQUEST_CHANGES")
    
    @patch.object(QAChecker, '_get_pr')
    @patch.object(QAChecker, '_get_pr_files')
    def test_validate_pr1_no_pr(self, mock_files, mock_pr):
        """Test PR1 validation when PR doesn't exist."""
        mock_pr.return_value = None
        
        result = self.checker.validate_pr1_deploy_client_polish(123)
        
        self.assertEqual(result.status, "FAIL")
        # Should have a check for PR existence
        self.assertGreater(len(result.checks), 0)
    
    @patch.object(QAChecker, '_get_pr')
    @patch.object(QAChecker, '_get_pr_files')
    def test_validate_pr1_with_pr(self, mock_files, mock_pr):
        """Test PR1 validation with existing PR."""
        mock_pr.return_value = {
            'number': 123,
            'title': 'Test PR',
            'state': 'open',
            'html_url': 'https://github.com/test/repo/pull/123'
        }
        mock_files.return_value = [
            {
                'filename': '.github/workflows/client-deploy.yml',
                'patch': 'correlation_id\nrequester\nrun-name'
            }
        ]
        
        result = self.checker.validate_pr1_deploy_client_polish(123)
        
        # Should have PR existence check passed
        pr_check = [c for c in result.checks if c['name'] == 'PR Exists']
        self.assertEqual(len(pr_check), 1)
        self.assertTrue(pr_check[0]['passed'])
    
    @patch.object(QAChecker, '_get_pr')
    @patch.object(QAChecker, '_get_pr_files')
    def test_validate_pr2_with_registry(self, mock_files, mock_pr):
        """Test PR2 validation with registry file."""
        mock_pr.return_value = {
            'number': 123,
            'title': 'Multi-Agent PR',
            'state': 'open',
            'html_url': 'https://github.com/test/repo/pull/123'
        }
        mock_files.return_value = [
            {
                'filename': 'app/agents/registry.py',
                'patch': 'deploy_verifier\ndiagnose_runner\nstatus_reporter\ndeploy_client'
            },
            {
                'filename': 'app/handlers/discord_handler.py',
                'patch': 'handle_agents_command\nget_agents\nhandle_status_digest_command\nperiod\ndaily\nweekly\nsuccess_count'
            }
        ]
        
        result = self.checker.validate_pr2_multi_agent_foundation(123)
        
        # Should have passing checks
        passed_checks = [c for c in result.checks if c['passed']]
        self.assertGreater(len(passed_checks), 0)


if __name__ == '__main__':
    unittest.main()
