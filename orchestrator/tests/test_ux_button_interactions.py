"""
Tests for UX button interaction handling in Discord.
"""
import unittest
from unittest.mock import Mock, patch, MagicMock
import json


class TestUXButtonInteractions(unittest.TestCase):
    """Test cases for Discord button interactions in UX updates."""

    def setUp(self):
        """Set up test fixtures."""
        # Mock environment
        self.env_patcher = patch.dict('os.environ', {
            'GITHUB_REPOSITORY': 'gcolon75/Project-Valine'
        })
        self.env_patcher.start()

    def tearDown(self):
        """Clean up after tests."""
        self.env_patcher.stop()

    @patch('agents.ux_agent.UXAgent')
    @patch('services.github.GitHubService')
    def test_handle_ux_update_command_adds_buttons_to_confirmation(self, mock_github_service, mock_ux_agent_class):
        """Test that confirmation preview includes Discord buttons."""
        from app.handlers.discord_handler import handle_ux_update_command
        
        # Mock UXAgent
        mock_agent = Mock()
        mock_ux_agent_class.return_value = mock_agent
        
        # Mock start_conversation to return needs_confirmation
        mock_agent.start_conversation.return_value = {
            'success': True,
            'conversation_id': 'test-conv-id-12345',
            'message': '🎨 **Preview of Changes:**\n\nReady to proceed?',
            'needs_confirmation': True
        }
        
        interaction = {
            'data': {
                'options': [
                    {'name': 'command', 'value': 'section:header text:"Test"'}
                ]
            },
            'member': {'user': {'id': 'user123', 'username': 'testuser'}}
        }
        
        response = handle_ux_update_command(interaction)
        
        # Verify response structure
        self.assertEqual(response['statusCode'], 200)
        body = json.loads(response['body'])
        
        # Verify buttons are included
        self.assertIn('components', body['data'])
        components = body['data']['components']
        self.assertEqual(len(components), 1)
        
        # Verify ACTION_ROW
        action_row = components[0]
        self.assertEqual(action_row['type'], 1)  # ACTION_ROW
        
        # Verify buttons
        buttons = action_row['components']
        self.assertEqual(len(buttons), 2)
        
        # Check Confirm button
        confirm_button = buttons[0]
        self.assertEqual(confirm_button['type'], 2)  # BUTTON
        self.assertEqual(confirm_button['style'], 3)  # SUCCESS (green)
        self.assertEqual(confirm_button['label'], '✅ Confirm')
        self.assertIn('test-conv-id-12345', confirm_button['custom_id'])
        self.assertTrue(confirm_button['custom_id'].startswith('ux_confirm_'))
        
        # Check Cancel button
        cancel_button = buttons[1]
        self.assertEqual(cancel_button['type'], 2)  # BUTTON
        self.assertEqual(cancel_button['style'], 4)  # DANGER (red)
        self.assertEqual(cancel_button['label'], '❌ Cancel')
        self.assertIn('test-conv-id-12345', cancel_button['custom_id'])
        self.assertTrue(cancel_button['custom_id'].startswith('ux_cancel_'))

    @patch('agents.ux_agent.UXAgent')
    @patch('services.github.GitHubService')
    def test_handle_ux_button_interaction_confirm(self, mock_github_service, mock_ux_agent_class):
        """Test handling confirm button click."""
        from app.handlers.discord_handler import handle_ux_button_interaction
        
        # Mock UXAgent
        mock_agent = Mock()
        mock_ux_agent_class.return_value = mock_agent
        
        # Mock confirm_and_execute for successful confirmation
        mock_agent.confirm_and_execute.return_value = {
            'success': True,
            'message': '🎨 **Changes applied!**\n\nDraft PR created: https://github.com/...'
        }
        
        interaction = {
            'data': {
                'custom_id': 'ux_confirm_test-conv-id-12345'
            },
            'member': {'user': {'id': 'user123', 'username': 'testuser'}}
        }
        
        response = handle_ux_button_interaction(interaction)
        
        # Verify response
        self.assertEqual(response['statusCode'], 200)
        body = json.loads(response['body'])
        
        # Verify it's an UPDATE_MESSAGE response (type 7)
        self.assertEqual(body['type'], 7)
        
        # Verify buttons are removed
        self.assertIn('components', body['data'])
        self.assertEqual(len(body['data']['components']), 0)
        
        # Verify success message
        self.assertIn('Changes applied', body['data']['content'])
        
        # Verify agent was called with 'yes'
        mock_agent.confirm_and_execute.assert_called_once_with(
            conversation_id='test-conv-id-12345',
            user_response='yes'
        )

    @patch('agents.ux_agent.UXAgent')
    @patch('services.github.GitHubService')
    def test_handle_ux_button_interaction_cancel(self, mock_github_service, mock_ux_agent_class):
        """Test handling cancel button click."""
        from app.handlers.discord_handler import handle_ux_button_interaction
        
        # Mock UXAgent
        mock_agent = Mock()
        mock_ux_agent_class.return_value = mock_agent
        
        # Mock confirm_and_execute for cancellation
        mock_agent.confirm_and_execute.return_value = {
            'success': True,
            'cancelled': True,
            'message': '🚫 No problem! Request cancelled.'
        }
        
        interaction = {
            'data': {
                'custom_id': 'ux_cancel_test-conv-id-12345'
            },
            'member': {'user': {'id': 'user123', 'username': 'testuser'}}
        }
        
        response = handle_ux_button_interaction(interaction)
        
        # Verify response
        self.assertEqual(response['statusCode'], 200)
        body = json.loads(response['body'])
        
        # Verify it's an UPDATE_MESSAGE response (type 7)
        self.assertEqual(body['type'], 7)
        
        # Verify buttons are removed
        self.assertIn('components', body['data'])
        self.assertEqual(len(body['data']['components']), 0)
        
        # Verify cancellation message
        self.assertIn('cancelled', body['data']['content'].lower())
        
        # Verify agent was called with 'no'
        mock_agent.confirm_and_execute.assert_called_once_with(
            conversation_id='test-conv-id-12345',
            user_response='no'
        )

    @patch('agents.ux_agent.UXAgent')
    @patch('services.github.GitHubService')
    def test_handle_ux_button_interaction_invalid_custom_id(self, mock_github_service, mock_ux_agent_class):
        """Test handling invalid custom_id format."""
        from app.handlers.discord_handler import handle_ux_button_interaction
        
        interaction = {
            'data': {
                'custom_id': 'invalid_button_id'
            },
            'member': {'user': {'id': 'user123', 'username': 'testuser'}}
        }
        
        response = handle_ux_button_interaction(interaction)
        
        # Verify error response
        self.assertEqual(response['statusCode'], 200)
        body = json.loads(response['body'])
        
        # Should return ephemeral error message
        self.assertIn('Invalid', body['data']['content'])
        self.assertEqual(body['data']['flags'], 64)  # Ephemeral

    @patch('agents.ux_agent.UXAgent')
    @patch('services.github.GitHubService')
    def test_handle_ux_button_interaction_conversation_not_found(self, mock_github_service, mock_ux_agent_class):
        """Test handling button click for expired/missing conversation."""
        from app.handlers.discord_handler import handle_ux_button_interaction
        
        # Mock UXAgent
        mock_agent = Mock()
        mock_ux_agent_class.return_value = mock_agent
        
        # Mock confirm_and_execute to return conversation not found
        mock_agent.confirm_and_execute.return_value = {
            'success': False,
            'message': '❌ Conversation not found or expired. Please start a new request.'
        }
        
        interaction = {
            'data': {
                'custom_id': 'ux_confirm_expired-conv-id'
            },
            'member': {'user': {'id': 'user123', 'username': 'testuser'}}
        }
        
        response = handle_ux_button_interaction(interaction)
        
        # Verify error response
        self.assertEqual(response['statusCode'], 200)
        body = json.loads(response['body'])
        
        # Should return ephemeral error message
        self.assertIn('not found or expired', body['data']['content'])
        self.assertEqual(body['data']['flags'], 64)  # Ephemeral

    def test_main_handler_routes_button_interactions(self):
        """Test that main handler routes MESSAGE_COMPONENT (type 3) to button handler."""
        from app.handlers.discord_handler import handler
        
        # Create a mock button interaction event
        event = {
            'body': json.dumps({
                'type': 3,  # MESSAGE_COMPONENT
                'data': {
                    'custom_id': 'ux_confirm_test-id'
                },
                'member': {'user': {'id': 'user123', 'username': 'testuser'}}
            }),
            'headers': {
                'x-signature-ed25519': 'mock-signature',
                'x-signature-timestamp': '1234567890'
            }
        }
        
        # Mock environment and verification
        with patch.dict('os.environ', {'DISCORD_PUBLIC_KEY': 'test-key'}):
            with patch('app.handlers.discord_handler.verify_discord_signature', return_value=True):
                with patch('app.handlers.discord_handler.handle_ux_button_interaction') as mock_handler:
                    mock_handler.return_value = {
                        'statusCode': 200,
                        'body': json.dumps({'type': 7, 'data': {'content': 'Success'}})
                    }
                    
                    response = handler(event, None)
                    
                    # Verify button handler was called
                    mock_handler.assert_called_once()
                    self.assertEqual(response['statusCode'], 200)

    def test_conversation_id_encoding_in_custom_id(self):
        """Test that conversation_id is properly encoded in button custom_id."""
        from app.handlers.discord_handler import handle_ux_update_command
        
        with patch('agents.ux_agent.UXAgent') as mock_ux_agent_class:
            with patch('services.github.GitHubService'):
                mock_agent = Mock()
                mock_ux_agent_class.return_value = mock_agent
                
                # Use a conversation ID with special characters
                test_conv_id = 'abc123-def456-ghi789'
                mock_agent.start_conversation.return_value = {
                    'success': True,
                    'conversation_id': test_conv_id,
                    'message': 'Preview',
                    'needs_confirmation': True
                }
                
                interaction = {
                    'data': {
                        'options': [{'name': 'command', 'value': 'section:header text:"Test"'}]
                    },
                    'member': {'user': {'id': 'user123', 'username': 'testuser'}}
                }
                
                response = handle_ux_update_command(interaction)
                body = json.loads(response['body'])
                
                # Verify conversation_id is in both buttons
                buttons = body['data']['components'][0]['components']
                self.assertEqual(buttons[0]['custom_id'], f'ux_confirm_{test_conv_id}')
                self.assertEqual(buttons[1]['custom_id'], f'ux_cancel_{test_conv_id}')


if __name__ == '__main__':
    unittest.main()
