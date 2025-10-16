"""
Tests for QoL command handlers and dispatcher enhancements.
"""
import unittest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone, timedelta
from app.services.github_actions_dispatcher import GitHubActionsDispatcher


class TestQoLDispatchers(unittest.TestCase):
    """Test cases for new dispatcher methods."""

    def setUp(self):
        """Set up test fixtures."""
        self.mock_github_service = Mock()
        self.mock_github_service.token = 'test-token'
        self.dispatcher = GitHubActionsDispatcher(self.mock_github_service)

    def test_get_workflow_by_name(self):
        """Test getting workflow by name."""
        mock_workflow = Mock()
        mock_workflow.name = 'Client Deploy'
        mock_workflow.id = 12345
        
        mock_repo = Mock()
        mock_repo.get_workflows.return_value = [mock_workflow]
        self.mock_github_service.get_repository.return_value = mock_repo
        
        result = self.dispatcher.get_workflow_by_name('Client Deploy')
        
        self.assertIsNotNone(result)
        self.assertEqual(result.id, 12345)

    def test_get_workflow_by_name_not_found(self):
        """Test getting workflow that doesn't exist."""
        mock_workflow = Mock()
        mock_workflow.name = 'Other Workflow'
        
        mock_repo = Mock()
        mock_repo.get_workflows.return_value = [mock_workflow]
        self.mock_github_service.get_repository.return_value = mock_repo
        
        result = self.dispatcher.get_workflow_by_name('Client Deploy')
        
        self.assertIsNone(result)

    def test_list_workflow_runs(self):
        """Test listing workflow runs."""
        # Create mock runs
        mock_run1 = Mock()
        mock_run1.id = 1
        mock_run1.name = 'Run 1'
        mock_run1.status = 'completed'
        mock_run1.conclusion = 'success'
        mock_run1.html_url = 'https://github.com/run/1'
        mock_run1.created_at = datetime.now(timezone.utc) - timedelta(hours=2)
        mock_run1.updated_at = datetime.now(timezone.utc) - timedelta(hours=2) + timedelta(seconds=120)
        mock_run1.event = 'push'
        mock_run1.head_sha = 'abc1234567890'
        
        mock_run2 = Mock()
        mock_run2.id = 2
        mock_run2.name = 'Run 2'
        mock_run2.status = 'completed'
        mock_run2.conclusion = 'failure'
        mock_run2.html_url = 'https://github.com/run/2'
        mock_run2.created_at = datetime.now(timezone.utc) - timedelta(hours=1)
        mock_run2.updated_at = datetime.now(timezone.utc) - timedelta(hours=1) + timedelta(seconds=90)
        mock_run2.event = 'workflow_dispatch'
        mock_run2.head_sha = 'def1234567890'
        
        mock_workflow = Mock()
        mock_workflow.name = 'Client Deploy'
        mock_workflow.get_runs.return_value = [mock_run1, mock_run2]
        
        mock_repo = Mock()
        mock_repo.get_workflows.return_value = [mock_workflow]
        self.mock_github_service.get_repository.return_value = mock_repo
        
        result = self.dispatcher.list_workflow_runs('Client Deploy', count=2)
        
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]['id'], 1)
        self.assertEqual(result[0]['conclusion'], 'success')
        self.assertEqual(result[0]['duration_seconds'], 120)
        self.assertEqual(result[1]['id'], 2)
        self.assertEqual(result[1]['conclusion'], 'failure')

    def test_list_workflow_runs_empty(self):
        """Test listing workflow runs when none exist."""
        mock_workflow = Mock()
        mock_workflow.name = 'Client Deploy'
        mock_workflow.get_runs.return_value = []
        
        mock_repo = Mock()
        mock_repo.get_workflows.return_value = [mock_workflow]
        self.mock_github_service.get_repository.return_value = mock_repo
        
        result = self.dispatcher.list_workflow_runs('Client Deploy', count=3)
        
        self.assertEqual(len(result), 0)

    @patch('app.services.github_actions_dispatcher.requests.post')
    def test_trigger_client_deploy_success(self, mock_post):
        """Test triggering Client Deploy workflow."""
        mock_response = Mock()
        mock_response.status_code = 204
        mock_post.return_value = mock_response
        
        mock_workflow = Mock()
        mock_workflow.name = 'Client Deploy'
        mock_workflow.id = 12345
        
        mock_repo = Mock()
        mock_repo.get_workflows.return_value = [mock_workflow]
        self.mock_github_service.get_repository.return_value = mock_repo
        
        result = self.dispatcher.trigger_client_deploy(
            correlation_id='test-123',
            requester='testuser',
            api_base='https://api.example.com'
        )
        
        self.assertTrue(result['success'])
        self.assertEqual(result['workflow_id'], 12345)
        mock_post.assert_called_once()

    @patch('app.services.github_actions_dispatcher.requests.post')
    def test_trigger_client_deploy_no_api_base(self, mock_post):
        """Test triggering Client Deploy without api_base override."""
        mock_response = Mock()
        mock_response.status_code = 204
        mock_post.return_value = mock_response
        
        mock_workflow = Mock()
        mock_workflow.name = 'Client Deploy'
        mock_workflow.id = 12345
        
        mock_repo = Mock()
        mock_repo.get_workflows.return_value = [mock_workflow]
        self.mock_github_service.get_repository.return_value = mock_repo
        
        result = self.dispatcher.trigger_client_deploy(
            correlation_id='test-123',
            requester='testuser'
        )
        
        self.assertTrue(result['success'])

    @patch('app.services.github_actions_dispatcher.requests.post')
    def test_trigger_client_deploy_workflow_not_found(self, mock_post):
        """Test triggering Client Deploy when workflow doesn't exist."""
        mock_repo = Mock()
        mock_repo.get_workflows.return_value = []
        self.mock_github_service.get_repository.return_value = mock_repo
        
        result = self.dispatcher.trigger_client_deploy(
            correlation_id='test-123',
            requester='testuser'
        )
        
        self.assertFalse(result['success'])
        self.assertIn('not found', result['message'])

    def test_find_recent_run_for_workflow(self):
        """Test finding recent run for workflow."""
        mock_run = Mock()
        mock_run.id = 1
        mock_run.created_at = datetime.now(timezone.utc) - timedelta(seconds=10)
        
        mock_workflow = Mock()
        mock_workflow.name = 'Client Deploy'
        mock_workflow.get_runs.return_value = [mock_run]
        
        mock_repo = Mock()
        mock_repo.get_workflows.return_value = [mock_workflow]
        self.mock_github_service.get_repository.return_value = mock_repo
        
        result = self.dispatcher.find_recent_run_for_workflow('Client Deploy', max_age_seconds=30)
        
        self.assertIsNotNone(result)
        self.assertEqual(result.id, 1)

    def test_find_recent_run_for_workflow_too_old(self):
        """Test finding recent run when all runs are too old."""
        mock_run = Mock()
        mock_run.id = 1
        mock_run.created_at = datetime.now(timezone.utc) - timedelta(seconds=60)
        
        mock_workflow = Mock()
        mock_workflow.name = 'Client Deploy'
        mock_workflow.get_runs.return_value = [mock_run]
        
        mock_repo = Mock()
        mock_repo.get_workflows.return_value = [mock_workflow]
        self.mock_github_service.get_repository.return_value = mock_repo
        
        result = self.dispatcher.find_recent_run_for_workflow('Client Deploy', max_age_seconds=30)
        
        self.assertIsNone(result)


if __name__ == '__main__':
    unittest.main()
