"""
Tests for GitHub Actions dispatcher.
Tests dispatch triggering, polling, and result parsing.
"""
import unittest
from unittest.mock import Mock, patch, MagicMock
import json
from datetime import datetime, timedelta, timezone
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
        mock_run.created_at = datetime.now(timezone.utc)
        
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
        mock_run.created_at = datetime.now(timezone.utc)
        
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
        mock_run.created_at = datetime.now(timezone.utc) - timedelta(minutes=10)
        
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
        mock_run.created_at = datetime.now(timezone.utc)
        mock_run.updated_at = datetime.now(timezone.utc)
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

    @patch('app.services.github_actions_dispatcher.requests.post')
    def test_trigger_client_deploy_with_correlation_id(self, mock_post):
        """Test Client Deploy trigger includes correlation_id and requester."""
        # Mock workflow lookup
        mock_workflow = Mock()
        mock_workflow.id = 12345
        mock_workflow.name = 'Client Deploy'
        
        with patch.object(self.dispatcher, 'get_workflow_by_name', return_value=mock_workflow):
            mock_response = Mock()
            mock_response.status_code = 204
            mock_post.return_value = mock_response
            
            correlation_id = 'test-correlation-123'
            requester = 'testuser'
            api_base = 'https://api.example.com'
            
            result = self.dispatcher.trigger_client_deploy(
                correlation_id=correlation_id,
                requester=requester,
                api_base=api_base
            )
            
            self.assertTrue(result['success'])
            
            # Verify the dispatch payload includes correlation_id and requester
            call_args = mock_post.call_args
            payload = call_args[1]['json']
            
            self.assertIn('inputs', payload)
            self.assertEqual(payload['inputs']['correlation_id'], correlation_id)
            self.assertEqual(payload['inputs']['requester'], requester)
            self.assertEqual(payload['inputs']['VITE_API_BASE'], api_base)

    def test_find_run_by_correlation(self):
        """Test finding a run by correlation_id in run name."""
        correlation_id = 'abc-123-def'
        
        # Mock workflow and runs
        mock_workflow = Mock()
        mock_workflow.name = 'Client Deploy'
        
        mock_run_1 = Mock()
        mock_run_1.id = 111
        mock_run_1.name = f'Client Deploy — {correlation_id} by testuser'
        mock_run_1.created_at = datetime.now(timezone.utc)
        
        mock_run_2 = Mock()
        mock_run_2.id = 222
        mock_run_2.name = 'Client Deploy — other-id by otheruser'
        mock_run_2.created_at = datetime.now(timezone.utc) - timedelta(minutes=2)
        
        mock_workflow.get_runs.return_value = [mock_run_1, mock_run_2]
        
        with patch.object(self.dispatcher, 'get_workflow_by_name', return_value=mock_workflow):
            run = self.dispatcher.find_run_by_correlation(correlation_id, 'Client Deploy')
            
            self.assertIsNotNone(run)
            self.assertEqual(run.id, 111)
            self.assertIn(correlation_id, run.name)

    def test_find_run_by_correlation_fallback(self):
        """Test fallback to most recent run when correlation_id not found."""
        correlation_id = 'not-found-123'
        
        # Mock workflow and runs
        mock_workflow = Mock()
        mock_workflow.name = 'Client Deploy'
        
        mock_run = Mock()
        mock_run.id = 999
        mock_run.name = 'Client Deploy — other-id by testuser'
        mock_run.created_at = datetime.now(timezone.utc)
        
        mock_workflow.get_runs.return_value = [mock_run]
        
        with patch.object(self.dispatcher, 'get_workflow_by_name', return_value=mock_workflow):
            with patch.object(self.dispatcher, 'find_recent_run_for_workflow', return_value=mock_run):
                run = self.dispatcher.find_run_by_correlation(correlation_id, 'Client Deploy')
                
                # Should fallback to recent run
                self.assertIsNotNone(run)
                self.assertEqual(run.id, 999)

    def test_poll_run_conclusion_success(self):
        """Test polling run until successful completion."""
        run_id = 12345
        
        # Mock completed run
        mock_run = Mock()
        mock_run.id = run_id
        mock_run.status = 'completed'
        mock_run.conclusion = 'success'
        
        mock_repo = Mock()
        mock_repo.get_workflow_run.return_value = mock_run
        self.mock_github_service.get_repository.return_value = mock_repo
        
        result = self.dispatcher.poll_run_conclusion(run_id, timeout_seconds=10, poll_interval=1)
        
        self.assertTrue(result['completed'])
        self.assertEqual(result['conclusion'], 'success')
        self.assertFalse(result['timed_out'])
        self.assertIsNotNone(result['run'])

    def test_poll_run_conclusion_failure(self):
        """Test polling run until failed completion."""
        run_id = 12345
        
        # Mock failed run
        mock_run = Mock()
        mock_run.id = run_id
        mock_run.status = 'completed'
        mock_run.conclusion = 'failure'
        
        mock_repo = Mock()
        mock_repo.get_workflow_run.return_value = mock_run
        self.mock_github_service.get_repository.return_value = mock_repo
        
        result = self.dispatcher.poll_run_conclusion(run_id, timeout_seconds=10, poll_interval=1)
        
        self.assertTrue(result['completed'])
        self.assertEqual(result['conclusion'], 'failure')
        self.assertFalse(result['timed_out'])

    def test_poll_run_conclusion_timeout(self):
        """Test polling run that times out."""
        run_id = 12345
        
        # Mock in-progress run that never completes
        mock_run = Mock()
        mock_run.id = run_id
        mock_run.status = 'in_progress'
        mock_run.conclusion = None
        
        mock_repo = Mock()
        mock_repo.get_workflow_run.return_value = mock_run
        self.mock_github_service.get_repository.return_value = mock_repo
        
        result = self.dispatcher.poll_run_conclusion(run_id, timeout_seconds=2, poll_interval=1)
        
        self.assertFalse(result['completed'])
        self.assertIsNone(result['conclusion'])
        self.assertTrue(result['timed_out'])

    @patch('app.services.github_actions_dispatcher.requests.post')
    def test_trigger_phase5_triage_success(self, mock_post):
        """Test successful Phase 5 Triage trigger."""
        mock_response = Mock()
        mock_response.status_code = 204
        mock_post.return_value = mock_response

        result = self.dispatcher.trigger_phase5_triage(
            failure_ref='49',
            allow_auto_fix='false',
            dry_run='false',
            verbose='true'
        )

        self.assertTrue(result['success'])
        self.assertIn('49', result['message'])
        
        # Verify the correct payload was sent
        call_args = mock_post.call_args
        payload = call_args[1]['json']
        self.assertEqual(payload['ref'], 'main')
        self.assertEqual(payload['inputs']['failure_ref'], '49')
        self.assertEqual(payload['inputs']['allow_auto_fix'], 'false')

    @patch('app.services.github_actions_dispatcher.requests.post')
    def test_trigger_phase5_triage_forbidden(self, mock_post):
        """Test Phase 5 Triage trigger with 403 forbidden."""
        mock_response = Mock()
        mock_response.status_code = 403
        mock_response.text = 'Forbidden'
        mock_post.return_value = mock_response

        result = self.dispatcher.trigger_phase5_triage(
            failure_ref='49'
        )

        self.assertFalse(result['success'])
        self.assertIn('Permission denied', result['message'])

    @patch('app.services.github_actions_dispatcher.requests.post')
    def test_trigger_issue_triage_success(self, mock_post):
        """Test successful Issue Triage trigger."""
        mock_response = Mock()
        mock_response.status_code = 204
        mock_post.return_value = mock_response

        result = self.dispatcher.trigger_issue_triage(
            requester='testuser',
            trace_id='test-trace-123'
        )

        self.assertTrue(result['success'])
        self.assertIn('triggered', result['message'])
        
        # Verify the correct payload was sent
        call_args = mock_post.call_args
        payload = call_args[1]['json']
        self.assertEqual(payload['ref'], 'main')
        self.assertEqual(payload['inputs']['requester'], 'testuser')
        self.assertEqual(payload['inputs']['trace_id'], 'test-trace-123')

    @patch('app.services.github_actions_dispatcher.requests.post')
    def test_trigger_issue_triage_rate_limit(self, mock_post):
        """Test Issue Triage trigger with rate limit."""
        mock_response = Mock()
        mock_response.status_code = 429
        mock_post.return_value = mock_response

        result = self.dispatcher.trigger_issue_triage(
            requester='testuser'
        )

        self.assertFalse(result['success'])
        self.assertIn('Rate limit', result['message'])


if __name__ == '__main__':
    unittest.main()
