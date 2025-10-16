"""
Tests for multi-agent commands (/agents and /status-digest).
"""
import unittest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta, timezone
from app.handlers.discord_handler import (
    handle_agents_command,
    handle_status_digest_command
)


class TestMultiAgentCommands(unittest.TestCase):
    """Test cases for /agents and /status-digest commands."""

    def test_handle_agents_command_success(self):
        """Test /agents command returns agent list."""
        interaction = {
            'data': {},
            'member': {'user': {'username': 'testuser'}}
        }
        
        response = handle_agents_command(interaction)
        
        self.assertEqual(response['statusCode'], 200)
        body = response['body']
        self.assertIn('Available Orchestrator Agents', body)
        self.assertIn('deploy_verifier', body)
        self.assertIn('diagnose_runner', body)
        self.assertIn('status_reporter', body)
        self.assertIn('deploy_client', body)

    def test_handle_agents_command_includes_descriptions(self):
        """Test /agents command includes agent descriptions."""
        interaction = {
            'data': {},
            'member': {'user': {'username': 'testuser'}}
        }
        
        response = handle_agents_command(interaction)
        body = response['body']
        
        # Check for specific agent descriptions
        self.assertIn('Deploy Verifier', body)
        self.assertIn('Diagnose Runner', body)
        self.assertIn('Status Reporter', body)
        self.assertIn('Client Deploy', body)
        
        # Check for entry commands
        self.assertIn('/verify-latest', body)
        self.assertIn('/diagnose', body)
        self.assertIn('/status', body)
        self.assertIn('/deploy-client', body)

    @patch('app.handlers.discord_handler.GitHubActionsDispatcher')
    @patch('app.handlers.discord_handler.GitHubService')
    def test_handle_status_digest_daily(self, mock_github_service, mock_dispatcher_class):
        """Test /status-digest with daily period."""
        # Mock dispatcher
        mock_dispatcher = Mock()
        mock_dispatcher_class.return_value = mock_dispatcher
        
        # Create mock runs
        now = datetime.now(timezone.utc)
        mock_runs = [
            {
                'id': 1,
                'conclusion': 'success',
                'created_at': now - timedelta(hours=2),
                'duration_seconds': 100,
                'html_url': 'https://example.com/run/1'
            },
            {
                'id': 2,
                'conclusion': 'failure',
                'created_at': now - timedelta(hours=5),
                'duration_seconds': 90,
                'html_url': 'https://example.com/run/2'
            },
            {
                'id': 3,
                'conclusion': 'success',
                'created_at': now - timedelta(days=2),  # Too old for daily
                'duration_seconds': 95,
                'html_url': 'https://example.com/run/3'
            }
        ]
        
        mock_dispatcher.list_workflow_runs.return_value = mock_runs
        
        interaction = {
            'data': {
                'options': [
                    {'name': 'period', 'value': 'daily'}
                ]
            },
            'member': {'user': {'username': 'testuser'}}
        }
        
        response = handle_status_digest_command(interaction)
        
        self.assertEqual(response['statusCode'], 200)
        body = response['body']
        
        self.assertIn('Status Digest', body)
        self.assertIn('Last 24 Hours', body)
        self.assertIn('Client Deploy', body)
        self.assertIn('Diagnose on Demand', body)

    @patch('app.handlers.discord_handler.GitHubActionsDispatcher')
    @patch('app.handlers.discord_handler.GitHubService')
    def test_handle_status_digest_weekly(self, mock_github_service, mock_dispatcher_class):
        """Test /status-digest with weekly period."""
        mock_dispatcher = Mock()
        mock_dispatcher_class.return_value = mock_dispatcher
        mock_dispatcher.list_workflow_runs.return_value = []
        
        interaction = {
            'data': {
                'options': [
                    {'name': 'period', 'value': 'weekly'}
                ]
            },
            'member': {'user': {'username': 'testuser'}}
        }
        
        response = handle_status_digest_command(interaction)
        
        self.assertEqual(response['statusCode'], 200)
        body = response['body']
        
        self.assertIn('Status Digest', body)
        self.assertIn('Last 7 Days', body)

    @patch('app.handlers.discord_handler.GitHubActionsDispatcher')
    @patch('app.handlers.discord_handler.GitHubService')
    def test_handle_status_digest_default_period(self, mock_github_service, mock_dispatcher_class):
        """Test /status-digest defaults to daily when no period specified."""
        mock_dispatcher = Mock()
        mock_dispatcher_class.return_value = mock_dispatcher
        mock_dispatcher.list_workflow_runs.return_value = []
        
        interaction = {
            'data': {'options': []},
            'member': {'user': {'username': 'testuser'}}
        }
        
        response = handle_status_digest_command(interaction)
        
        self.assertEqual(response['statusCode'], 200)
        body = response['body']
        
        # Should default to daily
        self.assertIn('Last 24 Hours', body)

    def test_handle_status_digest_invalid_period(self):
        """Test /status-digest with invalid period."""
        interaction = {
            'data': {
                'options': [
                    {'name': 'period', 'value': 'invalid'}
                ]
            },
            'member': {'user': {'username': 'testuser'}}
        }
        
        response = handle_status_digest_command(interaction)
        body = response['body']
        
        self.assertIn('Invalid period', body)

    @patch('app.handlers.discord_handler.GitHubActionsDispatcher')
    @patch('app.handlers.discord_handler.GitHubService')
    def test_handle_status_digest_aggregates_correctly(self, mock_github_service, mock_dispatcher_class):
        """Test /status-digest aggregates run statistics correctly."""
        mock_dispatcher = Mock()
        mock_dispatcher_class.return_value = mock_dispatcher
        
        now = datetime.now(timezone.utc)
        
        # Create mock runs with specific outcomes
        client_runs = [
            {
                'id': 1,
                'conclusion': 'success',
                'created_at': now - timedelta(hours=1),
                'duration_seconds': 100,
                'html_url': 'https://example.com/run/1'
            },
            {
                'id': 2,
                'conclusion': 'success',
                'created_at': now - timedelta(hours=2),
                'duration_seconds': 120,
                'html_url': 'https://example.com/run/2'
            },
            {
                'id': 3,
                'conclusion': 'failure',
                'created_at': now - timedelta(hours=3),
                'duration_seconds': 80,
                'html_url': 'https://example.com/run/3'
            }
        ]
        
        diagnose_runs = [
            {
                'id': 4,
                'conclusion': 'success',
                'created_at': now - timedelta(hours=1),
                'duration_seconds': 30,
                'html_url': 'https://example.com/run/4'
            }
        ]
        
        def mock_list_runs(workflow_name, count):
            if workflow_name == 'Client Deploy':
                return client_runs
            else:
                return diagnose_runs
        
        mock_dispatcher.list_workflow_runs.side_effect = mock_list_runs
        
        interaction = {
            'data': {'options': []},
            'member': {'user': {'username': 'testuser'}}
        }
        
        response = handle_status_digest_command(interaction)
        
        # Parse the response body
        import json
        response_data = json.loads(response['body'])
        content = response_data['data']['content']
        
        # Should show correct counts
        # Client: 3 runs, 2 success, 1 failure
        self.assertIn('3', content)  # Total runs
        self.assertIn('2 ✅', content)  # Successes
        self.assertIn('1 ❌', content)  # Failures


if __name__ == '__main__':
    unittest.main()
