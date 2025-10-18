"""
Tests for Discord /triage command handler.
"""
import unittest
from unittest.mock import Mock, patch, MagicMock
import json
import os


class TestTriageCommand(unittest.TestCase):
    """Test cases for /triage command handler."""

    def setUp(self):
        """Set up test fixtures."""
        # Set required environment variables
        os.environ['GITHUB_TOKEN'] = 'test-token-123456'
        os.environ['GITHUB_REPOSITORY'] = 'gcolon75/Project-Valine'

    def tearDown(self):
        """Clean up after tests."""
        os.environ.pop('GITHUB_TOKEN', None)
        os.environ.pop('GITHUB_REPOSITORY', None)

    @patch('app.handlers.discord_handler.Phase5TriageAgent')
    @patch('app.handlers.discord_handler.get_trace_store')
    def test_triage_command_basic(self, mock_trace_store, mock_agent_class):
        """Test basic /triage command with PR number."""
        from app.handlers.discord_handler import handle_triage_command
        
        # Configure mocks
        mock_trace = MagicMock()
        mock_trace_instance = MagicMock()
        mock_trace.create_trace.return_value = mock_trace_instance
        mock_trace_store.return_value = mock_trace
        
        mock_agent = MagicMock()
        mock_agent_class.return_value = mock_agent
        
        # Create interaction
        interaction = {
            'data': {
                'options': [
                    {'name': 'pr', 'value': 58}
                ]
            },
            'member': {
                'user': {'id': 'user-123', 'username': 'testuser'}
            }
        }
        
        # Call handler
        response = handle_triage_command(interaction)
        
        # Verify response
        self.assertEqual(response['statusCode'], 200)
        body = json.loads(response['body'])
        self.assertEqual(body['type'], 4)
        self.assertIn('Starting Triage for PR #58', body['data']['content'])
        self.assertIn('testuser', body['data']['content'])
        
        # Verify trace was created
        mock_trace.create_trace.assert_called_once()
        call_kwargs = mock_trace.create_trace.call_args[1]
        self.assertEqual(call_kwargs['command'], '/triage')
        self.assertEqual(call_kwargs['metadata']['pr_number'], 58)

    @patch('app.handlers.discord_handler.Phase5TriageAgent')
    @patch('app.handlers.discord_handler.get_trace_store')
    def test_triage_command_with_auto_fix(self, mock_trace_store, mock_agent_class):
        """Test /triage command with auto_fix enabled."""
        from app.handlers.discord_handler import handle_triage_command
        
        # Configure mocks
        mock_trace = MagicMock()
        mock_trace_instance = MagicMock()
        mock_trace.create_trace.return_value = mock_trace_instance
        mock_trace_store.return_value = mock_trace
        
        mock_agent = MagicMock()
        mock_agent_class.return_value = mock_agent
        
        # Create interaction with auto_fix
        interaction = {
            'data': {
                'options': [
                    {'name': 'pr', 'value': 58},
                    {'name': 'auto_fix', 'value': True}
                ]
            },
            'member': {
                'user': {'id': 'user-123', 'username': 'testuser'}
            }
        }
        
        # Call handler
        response = handle_triage_command(interaction)
        
        # Verify response
        self.assertEqual(response['statusCode'], 200)
        body = json.loads(response['body'])
        self.assertIn('Auto-fix:** ✅ Enabled', body['data']['content'])
        
        # Verify trace metadata includes auto_fix
        call_kwargs = mock_trace.create_trace.call_args[1]
        self.assertTrue(call_kwargs['metadata']['auto_fix'])

    @patch('app.handlers.discord_handler.Phase5TriageAgent')
    @patch('app.handlers.discord_handler.get_trace_store')
    def test_triage_command_with_invasive(self, mock_trace_store, mock_agent_class):
        """Test /triage command with allow_invasive enabled."""
        from app.handlers.discord_handler import handle_triage_command
        
        # Configure mocks
        mock_trace = MagicMock()
        mock_trace_instance = MagicMock()
        mock_trace.create_trace.return_value = mock_trace_instance
        mock_trace_store.return_value = mock_trace
        
        mock_agent = MagicMock()
        mock_agent_class.return_value = mock_agent
        
        # Create interaction with allow_invasive
        interaction = {
            'data': {
                'options': [
                    {'name': 'pr', 'value': 58},
                    {'name': 'auto_fix', 'value': True},
                    {'name': 'allow_invasive', 'value': True}
                ]
            },
            'member': {
                'user': {'id': 'user-123', 'username': 'testuser'}
            }
        }
        
        # Call handler
        response = handle_triage_command(interaction)
        
        # Verify response
        self.assertEqual(response['statusCode'], 200)
        body = json.loads(response['body'])
        self.assertIn('Allow invasive:** ✅ Yes', body['data']['content'])
        
        # Verify trace metadata includes allow_invasive
        call_kwargs = mock_trace.create_trace.call_args[1]
        self.assertTrue(call_kwargs['metadata']['allow_invasive'])

    def test_triage_command_missing_pr(self):
        """Test /triage command without PR parameter."""
        from app.handlers.discord_handler import handle_triage_command
        
        # Create interaction without PR
        interaction = {
            'data': {
                'options': []
            },
            'member': {
                'user': {'id': 'user-123', 'username': 'testuser'}
            }
        }
        
        # Call handler
        response = handle_triage_command(interaction)
        
        # Verify error response
        self.assertEqual(response['statusCode'], 200)
        body = json.loads(response['body'])
        self.assertIn('Missing required parameter', body['data']['content'])
        self.assertEqual(body['data']['flags'], 64)  # Ephemeral

    def test_triage_command_invalid_pr(self):
        """Test /triage command with invalid PR number."""
        from app.handlers.discord_handler import handle_triage_command
        
        # Create interaction with invalid PR
        interaction = {
            'data': {
                'options': [
                    {'name': 'pr', 'value': 'invalid'}
                ]
            },
            'member': {
                'user': {'id': 'user-123', 'username': 'testuser'}
            }
        }
        
        # Call handler
        response = handle_triage_command(interaction)
        
        # Verify error response
        self.assertEqual(response['statusCode'], 200)
        body = json.loads(response['body'])
        self.assertIn('Invalid pr parameter', body['data']['content'])
        self.assertEqual(body['data']['flags'], 64)  # Ephemeral

    @patch('app.handlers.discord_handler.get_trace_store')
    def test_triage_command_missing_token(self, mock_trace_store):
        """Test /triage command when GITHUB_TOKEN is missing."""
        from app.handlers.discord_handler import handle_triage_command
        
        # Remove token
        os.environ.pop('GITHUB_TOKEN', None)
        
        # Configure mocks
        mock_trace = MagicMock()
        mock_trace_instance = MagicMock()
        mock_trace.create_trace.return_value = mock_trace_instance
        mock_trace_store.return_value = mock_trace
        
        # Create interaction
        interaction = {
            'data': {
                'options': [
                    {'name': 'pr', 'value': 58}
                ]
            },
            'member': {
                'user': {'id': 'user-123', 'username': 'testuser'}
            }
        }
        
        # Call handler
        response = handle_triage_command(interaction)
        
        # Verify error response
        self.assertEqual(response['statusCode'], 200)
        body = json.loads(response['body'])
        self.assertIn('GITHUB_TOKEN not available', body['data']['content'])
        self.assertEqual(body['data']['flags'], 64)  # Ephemeral

    @patch('app.handlers.discord_handler.Phase5TriageAgent')
    @patch('app.handlers.discord_handler.get_trace_store')
    def test_triage_command_agent_error(self, mock_trace_store, mock_agent_class):
        """Test /triage command when agent initialization fails."""
        from app.handlers.discord_handler import handle_triage_command
        
        # Restore token for this test
        os.environ['GITHUB_TOKEN'] = 'test-token-123456'
        
        # Configure mocks
        mock_trace = MagicMock()
        mock_trace_instance = MagicMock()
        mock_trace.create_trace.return_value = mock_trace_instance
        mock_trace_store.return_value = mock_trace
        
        # Make agent raise an error
        mock_agent_class.side_effect = Exception("Agent initialization failed")
        
        # Create interaction
        interaction = {
            'data': {
                'options': [
                    {'name': 'pr', 'value': 58}
                ]
            },
            'member': {
                'user': {'id': 'user-123', 'username': 'testuser'}
            }
        }
        
        # Call handler
        response = handle_triage_command(interaction)
        
        # Verify response contains error
        self.assertEqual(response['statusCode'], 200)
        body = json.loads(response['body'])
        self.assertIn('Failed to start triage', body['data']['content'])
        
        # Verify trace was marked with error
        mock_trace.add_step.assert_called()
        mock_trace.complete_trace.assert_called()


if __name__ == '__main__':
    unittest.main()
