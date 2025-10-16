"""
Tests for Discord relay commands.
"""
import unittest
from unittest.mock import Mock, patch, MagicMock
import json
import os


class TestRelayCommands(unittest.TestCase):
    """Test cases for relay command handlers."""

    def setUp(self):
        """Set up test fixtures."""
        # Clear environment variables
        os.environ.pop('ADMIN_USER_IDS', None)
        os.environ.pop('ADMIN_ROLE_IDS', None)
        os.environ.pop('ALLOW_SECRET_WRITES', None)
        
        # Set admin user for tests
        os.environ['ADMIN_USER_IDS'] = 'admin-user-123'

    def tearDown(self):
        """Clean up after tests."""
        os.environ.pop('ADMIN_USER_IDS', None)

    @patch('app.handlers.discord_handler.DiscordService')
    @patch('app.handlers.discord_handler.AuditStore')
    @patch('app.handlers.discord_handler.get_trace_store')
    def test_relay_send_success(self, mock_trace_store, mock_audit_store, mock_discord_service):
        """Test successful relay-send command."""
        from app.handlers.discord_handler import handle_relay_send_command
        
        # Configure mocks
        mock_discord = MagicMock()
        mock_discord.send_message.return_value = {'id': 'message-123'}
        mock_discord_service.return_value = mock_discord
        
        mock_audit = MagicMock()
        mock_audit.create_audit_record.return_value = 'audit-456'
        mock_audit._get_message_fingerprint.return_value = '…abcd'
        mock_audit_store.return_value = mock_audit
        
        mock_trace = MagicMock()
        mock_trace_instance = MagicMock()
        mock_trace.create_trace.return_value = mock_trace_instance
        mock_trace_store.return_value = mock_trace
        
        # Create interaction
        interaction = {
            'data': {
                'options': [
                    {'name': 'channel_id', 'value': 'channel-789'},
                    {'name': 'message', 'value': 'Test message'},
                    {'name': 'confirm', 'value': True}
                ]
            },
            'member': {
                'user': {'id': 'admin-user-123', 'username': 'admin'},
                'roles': []
            }
        }
        
        # Call handler
        response = handle_relay_send_command(interaction)
        
        # Verify response
        self.assertEqual(response['statusCode'], 200)
        body = json.loads(response['body'])
        self.assertEqual(body['type'], 4)
        self.assertIn('Message posted', body['data']['content'])
        
        # Verify Discord service was called
        mock_discord.send_message.assert_called_once_with('channel-789', 'Test message')
        
        # Verify audit record was created
        mock_audit.create_audit_record.assert_called_once()
        call_kwargs = mock_audit.create_audit_record.call_args[1]
        self.assertEqual(call_kwargs['user_id'], 'admin-user-123')
        self.assertEqual(call_kwargs['command'], '/relay-send')
        self.assertEqual(call_kwargs['target_channel'], 'channel-789')
        self.assertEqual(call_kwargs['result'], 'posted')

    @patch('app.handlers.discord_handler.get_trace_store')
    def test_relay_send_missing_parameters(self, mock_trace_store):
        """Test relay-send with missing parameters."""
        from app.handlers.discord_handler import handle_relay_send_command
        
        mock_trace = MagicMock()
        mock_trace_store.return_value = mock_trace
        
        # Create interaction with missing message
        interaction = {
            'data': {
                'options': [
                    {'name': 'channel_id', 'value': 'channel-789'}
                ]
            },
            'member': {
                'user': {'id': 'admin-user-123', 'username': 'admin'},
                'roles': []
            }
        }
        
        # Call handler
        response = handle_relay_send_command(interaction)
        
        # Verify error response
        body = json.loads(response['body'])
        self.assertIn('Missing required parameters', body['data']['content'])
        self.assertEqual(body['data']['flags'], 64)  # Ephemeral

    @patch('app.handlers.discord_handler.get_trace_store')
    def test_relay_send_unauthorized(self, mock_trace_store):
        """Test relay-send with unauthorized user."""
        from app.handlers.discord_handler import handle_relay_send_command
        
        mock_trace = MagicMock()
        mock_trace_instance = MagicMock()
        mock_trace.create_trace.return_value = mock_trace_instance
        mock_trace_store.return_value = mock_trace
        
        # Create interaction with non-admin user
        interaction = {
            'data': {
                'options': [
                    {'name': 'channel_id', 'value': 'channel-789'},
                    {'name': 'message', 'value': 'Test message'},
                    {'name': 'confirm', 'value': True}
                ]
            },
            'member': {
                'user': {'id': 'regular-user-999', 'username': 'user'},
                'roles': []
            }
        }
        
        # Call handler
        response = handle_relay_send_command(interaction)
        
        # Verify error response
        body = json.loads(response['body'])
        self.assertIn('admin only', body['data']['content'])
        self.assertEqual(body['data']['flags'], 64)  # Ephemeral

    @patch('app.handlers.discord_handler.get_trace_store')
    def test_relay_send_no_confirmation(self, mock_trace_store):
        """Test relay-send without confirmation."""
        from app.handlers.discord_handler import handle_relay_send_command
        
        mock_trace = MagicMock()
        mock_trace_instance = MagicMock()
        mock_trace.create_trace.return_value = mock_trace_instance
        mock_trace_store.return_value = mock_trace
        
        # Create interaction without confirm flag
        interaction = {
            'data': {
                'options': [
                    {'name': 'channel_id', 'value': 'channel-789'},
                    {'name': 'message', 'value': 'Test message'}
                ]
            },
            'member': {
                'user': {'id': 'admin-user-123', 'username': 'admin'},
                'roles': []
            }
        }
        
        # Call handler
        response = handle_relay_send_command(interaction)
        
        # Verify error response
        body = json.loads(response['body'])
        self.assertIn('Confirmation required', body['data']['content'])
        self.assertEqual(body['data']['flags'], 64)  # Ephemeral

    @patch('app.handlers.discord_handler.DiscordService')
    @patch('app.handlers.discord_handler.AuditStore')
    @patch('app.handlers.discord_handler.get_trace_store')
    def test_relay_send_post_failure(self, mock_trace_store, mock_audit_store, mock_discord_service):
        """Test relay-send when posting fails."""
        from app.handlers.discord_handler import handle_relay_send_command
        
        # Configure mocks
        mock_discord = MagicMock()
        mock_discord.send_message.return_value = None  # Simulate failure
        mock_discord_service.return_value = mock_discord
        
        mock_audit = MagicMock()
        mock_audit.create_audit_record.return_value = 'audit-456'
        mock_audit_store.return_value = mock_audit
        
        mock_trace = MagicMock()
        mock_trace_instance = MagicMock()
        mock_trace.create_trace.return_value = mock_trace_instance
        mock_trace_store.return_value = mock_trace
        
        # Create interaction
        interaction = {
            'data': {
                'options': [
                    {'name': 'channel_id', 'value': 'channel-789'},
                    {'name': 'message', 'value': 'Test message'},
                    {'name': 'confirm', 'value': True}
                ]
            },
            'member': {
                'user': {'id': 'admin-user-123', 'username': 'admin'},
                'roles': []
            }
        }
        
        # Call handler
        response = handle_relay_send_command(interaction)
        
        # Verify error response
        body = json.loads(response['body'])
        self.assertIn('Failed to post message', body['data']['content'])
        
        # Verify audit record was created with 'failed' status
        mock_audit.create_audit_record.assert_called_once()
        call_kwargs = mock_audit.create_audit_record.call_args[1]
        self.assertEqual(call_kwargs['result'], 'failed')

    @patch('app.handlers.discord_handler.DiscordService')
    @patch('app.handlers.discord_handler.AuditStore')
    @patch('app.handlers.discord_handler.get_trace_store')
    def test_relay_dm_success(self, mock_trace_store, mock_audit_store, mock_discord_service):
        """Test successful relay-dm command."""
        from app.handlers.discord_handler import handle_relay_dm_command
        
        # Configure mocks
        mock_discord = MagicMock()
        mock_discord.send_message.return_value = {'id': 'message-123'}
        mock_discord_service.return_value = mock_discord
        
        mock_audit = MagicMock()
        mock_audit.create_audit_record.return_value = 'audit-456'
        mock_audit._get_message_fingerprint.return_value = '…abcd'
        mock_audit_store.return_value = mock_audit
        
        mock_trace = MagicMock()
        mock_trace_instance = MagicMock()
        mock_trace.create_trace.return_value = mock_trace_instance
        mock_trace_store.return_value = mock_trace
        
        # Create interaction
        interaction = {
            'data': {
                'options': [
                    {'name': 'message', 'value': 'Test DM message'},
                    {'name': 'target_channel_id', 'value': 'channel-789'}
                ]
            },
            'member': {
                'user': {'id': 'admin-user-123', 'username': 'admin'},
                'roles': []
            }
        }
        
        # Call handler
        response = handle_relay_dm_command(interaction)
        
        # Verify response
        self.assertEqual(response['statusCode'], 200)
        body = json.loads(response['body'])
        self.assertEqual(body['type'], 4)
        self.assertIn('Message posted as bot', body['data']['content'])
        self.assertEqual(body['data']['flags'], 64)  # Ephemeral
        
        # Verify Discord service was called
        mock_discord.send_message.assert_called_once_with('channel-789', 'Test DM message')
        
        # Verify audit record was created
        mock_audit.create_audit_record.assert_called_once()
        call_kwargs = mock_audit.create_audit_record.call_args[1]
        self.assertEqual(call_kwargs['command'], '/relay-dm')

    @patch('app.handlers.discord_handler.get_trace_store')
    def test_relay_dm_unauthorized(self, mock_trace_store):
        """Test relay-dm with unauthorized user."""
        from app.handlers.discord_handler import handle_relay_dm_command
        
        mock_trace = MagicMock()
        mock_trace_instance = MagicMock()
        mock_trace.create_trace.return_value = mock_trace_instance
        mock_trace_store.return_value = mock_trace
        
        # Create interaction with non-admin user
        interaction = {
            'data': {
                'options': [
                    {'name': 'message', 'value': 'Test DM message'},
                    {'name': 'target_channel_id', 'value': 'channel-789'}
                ]
            },
            'member': {
                'user': {'id': 'regular-user-999', 'username': 'user'},
                'roles': []
            }
        }
        
        # Call handler
        response = handle_relay_dm_command(interaction)
        
        # Verify error response
        body = json.loads(response['body'])
        self.assertIn('owner only', body['data']['content'])
        self.assertEqual(body['data']['flags'], 64)  # Ephemeral

    @patch('app.handlers.discord_handler.DiscordService')
    @patch('app.handlers.discord_handler.AuditStore')
    @patch('app.handlers.discord_handler.get_trace_store')
    def test_relay_send_with_role_authorization(self, mock_trace_store, mock_audit_store, mock_discord_service):
        """Test relay-send with role-based authorization."""
        from app.handlers.discord_handler import handle_relay_send_command
        
        # Set admin role
        os.environ['ADMIN_ROLE_IDS'] = 'admin-role-456'
        os.environ.pop('ADMIN_USER_IDS', None)
        
        # Configure mocks
        mock_discord = MagicMock()
        mock_discord.send_message.return_value = {'id': 'message-123'}
        mock_discord_service.return_value = mock_discord
        
        mock_audit = MagicMock()
        mock_audit.create_audit_record.return_value = 'audit-456'
        mock_audit._get_message_fingerprint.return_value = '…abcd'
        mock_audit_store.return_value = mock_audit
        
        mock_trace = MagicMock()
        mock_trace_instance = MagicMock()
        mock_trace.create_trace.return_value = mock_trace_instance
        mock_trace_store.return_value = mock_trace
        
        # Create interaction with user having admin role
        interaction = {
            'data': {
                'options': [
                    {'name': 'channel_id', 'value': 'channel-789'},
                    {'name': 'message', 'value': 'Test message'},
                    {'name': 'confirm', 'value': True}
                ]
            },
            'member': {
                'user': {'id': 'user-999', 'username': 'roleuser'},
                'roles': ['admin-role-456', 'other-role']
            }
        }
        
        # Call handler
        response = handle_relay_send_command(interaction)
        
        # Verify successful response
        body = json.loads(response['body'])
        self.assertIn('Message posted', body['data']['content'])
        
        # Clean up
        os.environ.pop('ADMIN_ROLE_IDS', None)


if __name__ == '__main__':
    unittest.main()
