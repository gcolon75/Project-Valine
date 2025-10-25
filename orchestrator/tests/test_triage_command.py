"""
Tests for /triage Discord command handler.
"""
import unittest
from unittest.mock import Mock, patch, MagicMock
import json
from app.handlers.discord_handler import handle_triage_command, create_response


class TestTriageCommand(unittest.TestCase):
    """Test cases for /triage command handler."""

    def setUp(self):
        """Set up test fixtures."""
        self.base_interaction = {
            'type': 2,
            'data': {
                'name': 'triage',
                'options': []
            },
            'member': {
                'user': {
                    'id': '123456789',
                    'username': 'testuser'
                },
                'roles': []
            },
            'channel_id': '987654321'
        }

    def test_triage_command_missing_pr_parameter(self):
        """Test triage command without PR parameter."""
        interaction = self.base_interaction.copy()
        
        response = handle_triage_command(interaction)
        
        self.assertEqual(response['statusCode'], 200)
        body = json.loads(response['body'])
        self.assertIn('Missing required parameter', body['data']['content'])

    def test_triage_command_invalid_pr_number(self):
        """Test triage command with invalid PR number."""
        interaction = self.base_interaction.copy()
        interaction['data']['options'] = [
            {'name': 'pr', 'value': 'invalid'}
        ]
        
        response = handle_triage_command(interaction)
        
        self.assertEqual(response['statusCode'], 200)
        body = json.loads(response['body'])
        self.assertIn('Invalid PR number', body['data']['content'])

    @patch('app.handlers.discord_handler.GitHubService')
    @patch('app.handlers.discord_handler.GitHubActionsDispatcher')
    @patch('app.handlers.discord_handler.StructuredLogger')
    def test_triage_command_valid_pr(self, mock_logger_class, mock_dispatcher_class, mock_github_service_class):
        """Test triage command with valid PR number."""
        # Setup mocks
        mock_github_service = Mock()
        mock_github_service_class.return_value = mock_github_service
        
        mock_dispatcher = Mock()
        mock_dispatcher_class.return_value = mock_dispatcher
        mock_dispatcher.trigger_workflow_dispatch.return_value = {
            'success': True
        }
        
        mock_logger_instance = Mock()
        mock_logger_class.return_value = mock_logger_instance
        
        # Create interaction with valid PR
        interaction = self.base_interaction.copy()
        interaction['data']['options'] = [
            {'name': 'pr', 'value': 58}
        ]
        
        response = handle_triage_command(interaction)
        
        # Verify response
        self.assertEqual(response['statusCode'], 200)
        body = json.loads(response['body'])
        self.assertIn('TriageAgent', body['data']['content'])
        self.assertIn('Analyzing failure', body['data']['content'])
        self.assertIn('#58', body['data']['content'])
        self.assertIn('testuser', body['data']['content'])
        
        # Verify workflow was triggered
        mock_dispatcher.trigger_workflow_dispatch.assert_called_once()
        call_args = mock_dispatcher.trigger_workflow_dispatch.call_args
        self.assertEqual(call_args[1]['workflow_id'], 'phase5-triage-agent.yml')
        self.assertEqual(call_args[1]['inputs']['failure_ref'], '58')
        self.assertEqual(call_args[1]['inputs']['allow_auto_fix'], 'false')

    @patch('app.handlers.discord_handler.GitHubService')
    @patch('app.handlers.discord_handler.GitHubActionsDispatcher')
    @patch('app.handlers.discord_handler.StructuredLogger')
    def test_triage_command_workflow_trigger_failure(self, mock_logger_class, mock_dispatcher_class, mock_github_service_class):
        """Test triage command when workflow trigger fails."""
        # Setup mocks
        mock_github_service = Mock()
        mock_github_service_class.return_value = mock_github_service
        
        mock_dispatcher = Mock()
        mock_dispatcher_class.return_value = mock_dispatcher
        mock_dispatcher.trigger_workflow_dispatch.return_value = {
            'success': False,
            'message': 'Workflow not found'
        }
        
        mock_logger_instance = Mock()
        mock_logger_class.return_value = mock_logger_instance
        
        # Create interaction with valid PR
        interaction = self.base_interaction.copy()
        interaction['data']['options'] = [
            {'name': 'pr', 'value': 58}
        ]
        
        response = handle_triage_command(interaction)
        
        # Verify response still successful but with warning
        self.assertEqual(response['statusCode'], 200)
        body = json.loads(response['body'])
        self.assertIn('Starting Triage Analysis', body['data']['content'])
        self.assertIn('Note: Workflow trigger encountered an issue', body['data']['content'])

    @patch('app.handlers.discord_handler.GitHubService')
    @patch('app.handlers.discord_handler.GitHubActionsDispatcher')
    @patch('app.handlers.discord_handler.StructuredLogger')
    def test_triage_command_with_workflow_run_id(self, mock_logger_class, mock_dispatcher_class, mock_github_service_class):
        """Test triage command with workflow run ID (large number)."""
        # Setup mocks
        mock_github_service = Mock()
        mock_github_service_class.return_value = mock_github_service
        
        mock_dispatcher = Mock()
        mock_dispatcher_class.return_value = mock_dispatcher
        mock_dispatcher.trigger_workflow_dispatch.return_value = {
            'success': True
        }
        
        mock_logger_instance = Mock()
        mock_logger_class.return_value = mock_logger_instance
        
        # Create interaction with workflow run ID
        interaction = self.base_interaction.copy()
        interaction['data']['options'] = [
            {'name': 'pr', 'value': 1234567890}
        ]
        
        response = handle_triage_command(interaction)
        
        # Verify response
        self.assertEqual(response['statusCode'], 200)
        body = json.loads(response['body'])
        self.assertIn('Starting Triage Analysis', body['data']['content'])
        self.assertIn('#1234567890', body['data']['content'])


if __name__ == '__main__':
    unittest.main()
