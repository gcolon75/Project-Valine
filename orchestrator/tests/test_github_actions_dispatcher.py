"""
Tests for GitHub Actions dispatcher.
Tests dispatch triggering, polling, and result parsing.
"""
import unittest
from unittest.mock import Mock, patch, MagicMock
import json
from datetime import datetime, timedelta
from app.services.github_actions_dispatcher import GitHubActionsDispatcher


class TestGitHubActionsDispatcher(unittest.TestCase):
    """Test cases for GitHubActionsDispatcher class."""

    def setUp(self):
        """Set up test fixtures."""
        self.mock_github_service = Mock()
        self.mock_github_service.token = 'test-token'
        self.dispatcher = GitHubActionsDispatcher(self.mock_github_service)

    def test_generate_correlation_id(self):
        """Test correlation ID generation."""
        correlation_id = self.dispatcher.generate_correlation_id()
        
        # Should be a UUID string
        self.assertIsInstance(correlation_id, str)
        self.assertEqual(len(correlation_id), 36)  # UUID format: 8-4-4-4-12
        self.assertIn('-', correlation_id)

    @patch('app.services.github_actions_dispatcher.requests.post')
    def test_trigger_diagnose_dispatch_success(self, mock_post):
        """Test successful repository_dispatch trigger."""
        mock_response = Mock()
        mock_response.status_code = 204  # No Content is success
        mock_post.return_value = mock_response

        result = self.dispatcher.trigger_diagnose_dispatch(
            correlation_id='test-123',
            requester='testuser'
        )

        self.assertTrue(result['success'])
        self.assertIn('test-123', result['message'])
        mock_post.assert_called_once()

    @patch('app.services.github_actions_dispatcher.requests.post')
    def test_trigger_diagnose_dispatch_forbidden(self, mock_post):
        """Test repository_dispatch with 403 forbidden."""
        mock_response = Mock()
        mock_response.status_code = 403
        mock_response.text = 'Forbidden'
        mock_post.return_value = mock_response

        result = self.dispatcher.trigger_diagnose_dispatch(
            correlation_id='test-123',
            requester='testuser'
        )

        self.assertFalse(result['success'])
        self.assertIn('Permission denied', result['message'])

    @patch('app.services.github_actions_dispatcher.requests.post')
    def test_trigger_diagnose_dispatch_rate_limit(self, mock_post):
        """Test repository_dispatch with rate limit."""
        mock_response = Mock()
        mock_response.status_code = 429
        mock_post.return_value = mock_response

        result = self.dispatcher.trigger_diagnose_dispatch(
            correlation_id='test-123',
            requester='testuser'
        )

        self.assertFalse(result['success'])
        self.assertIn('Rate limit', result['message'])

    @patch('app.services.github_actions_dispatcher.requests.post')
    def test_trigger_workflow_dispatch_success(self, mock_post):
        """Test successful workflow_dispatch trigger."""
        mock_response = Mock()
        mock_response.status_code = 204
        mock_post.return_value = mock_response

        result = self.dispatcher.trigger_workflow_dispatch(
            workflow_id='diagnose-dispatch.yml',
            correlation_id='test-123',
            requester='testuser'
        )

        self.assertTrue(result['success'])
        self.assertIn('test-123', result['message'])

    def test_find_run_by_correlation_id_found(self):
        """Test finding run by correlation ID."""
        mock_repo = Mock()
        mock_workflow = Mock()
        mock_workflow.name = 'Diagnose on Demand'
        
        mock_run = Mock()
        mock_run.id = 12345
        mock_run.name = 'Diagnose on Demand — test-123 by testuser'
        mock_run.created_at = datetime.utcnow()
        
        mock_workflow.get_runs.return_value = [mock_run]
        mock_repo.get_workflows.return_value = [mock_workflow]
        self.mock_github_service.get_repository.return_value = mock_repo

        result = self.dispatcher.find_run_by_correlation_id('test-123')

        self.assertIsNotNone(result)
        self.assertEqual(result.id, 12345)

    def test_find_run_by_correlation_id_not_found(self):
        """Test finding run when correlation ID doesn't match."""
        mock_repo = Mock()
        mock_workflow = Mock()
        mock_workflow.name = 'Diagnose on Demand'
        
        mock_run = Mock()
        mock_run.id = 12345
        mock_run.name = 'Diagnose on Demand — other-456 by otheruser'
        mock_run.created_at = datetime.utcnow()
        
        mock_workflow.get_runs.return_value = [mock_run]
        mock_repo.get_workflows.return_value = [mock_workflow]
        self.mock_github_service.get_repository.return_value = mock_repo

        result = self.dispatcher.find_run_by_correlation_id('test-123')

        self.assertIsNone(result)

    def test_find_run_by_correlation_id_too_old(self):
        """Test finding run when run is too old."""
        mock_repo = Mock()
        mock_workflow = Mock()
        mock_workflow.name = 'Diagnose on Demand'
        
        mock_run = Mock()
        mock_run.id = 12345
        mock_run.name = 'Diagnose on Demand — test-123 by testuser'
        mock_run.created_at = datetime.utcnow() - timedelta(minutes=10)
        
        mock_workflow.get_runs.return_value = [mock_run]
        mock_repo.get_workflows.return_value = [mock_workflow]
        self.mock_github_service.get_repository.return_value = mock_repo

        result = self.dispatcher.find_run_by_correlation_id('test-123', max_age_minutes=5)

        self.assertIsNone(result)

    def test_parse_summary_json_success(self):
        """Test parsing JSON from summary text."""
        summary_text = """
        # Diagnose Summary
        
        Some text here
        
        ```json
        {
          "correlation_id": "test-123",
          "conclusion": "success",
          "checks": {
            "oidc": {"ok": true}
          }
        }
        ```
        
        More text
        """
        
        result = self.dispatcher.parse_summary_json(summary_text)
        
        self.assertIsNotNone(result)
        self.assertEqual(result['correlation_id'], 'test-123')
        self.assertEqual(result['conclusion'], 'success')
        self.assertTrue(result['checks']['oidc']['ok'])

    def test_parse_summary_json_no_block(self):
        """Test parsing when no JSON block exists."""
        summary_text = """
        # Diagnose Summary
        
        Just some text, no JSON here.
        """
        
        result = self.dispatcher.parse_summary_json(summary_text)
        
        self.assertIsNone(result)

    def test_parse_summary_json_invalid(self):
        """Test parsing invalid JSON."""
        summary_text = """
        ```json
        {
          "invalid": "json" without closing brace
        ```
        """
        
        result = self.dispatcher.parse_summary_json(summary_text)
        
        self.assertIsNone(result)

    def test_get_run_summary(self):
        """Test getting run summary."""
        mock_run = Mock()
        mock_run.id = 12345
        mock_run.html_url = 'https://github.com/owner/repo/actions/runs/12345'
        mock_run.status = 'completed'
        mock_run.conclusion = 'success'
        mock_run.created_at = datetime.utcnow()
        mock_run.updated_at = datetime.utcnow()
        mock_run.name = 'Diagnose on Demand — test-123 by testuser'

        result = self.dispatcher.get_run_summary(mock_run)

        self.assertIsNotNone(result)
        self.assertEqual(result['run_id'], 12345)
        self.assertEqual(result['conclusion'], 'success')
        self.assertIn('github.com', result['html_url'])

    def test_format_result_for_discord_success(self):
        """Test formatting success result for Discord."""
        summary = {
            'run_id': 12345,
            'html_url': 'https://github.com/owner/repo/actions/runs/12345',
            'conclusion': 'success'
        }

        result = self.dispatcher.format_result_for_discord(summary)

        self.assertIn('content', result)
        self.assertIn('🟢', result['content'])
        self.assertIn('OK', result['content'])
        self.assertIn('12345', result['content'])

    def test_format_result_for_discord_failure(self):
        """Test formatting failure result for Discord."""
        summary = {
            'run_id': 12345,
            'html_url': 'https://github.com/owner/repo/actions/runs/12345',
            'conclusion': 'failure'
        }

        result = self.dispatcher.format_result_for_discord(summary)

        self.assertIn('content', result)
        self.assertIn('🔴', result['content'])
        self.assertIn('Failed', result['content'])

    def test_format_result_for_discord_none(self):
        """Test formatting when summary is None."""
        result = self.dispatcher.format_result_for_discord(None)

        self.assertIn('content', result)
        self.assertIn('Failed to get run summary', result['content'])


if __name__ == '__main__':
    unittest.main()
