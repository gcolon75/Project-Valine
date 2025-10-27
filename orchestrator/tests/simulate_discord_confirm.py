#!/usr/bin/env python3
"""
Simulation script for Discord confirmation flow testing.

This script simulates the Discord interaction flow for UX updates without
requiring a real Discord bot token or server.

Usage:
    python3 simulate_discord_confirm.py
"""

import os
import sys
import json
import uuid
from pathlib import Path
from unittest.mock import Mock, MagicMock, patch

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'app'))


class MockGitHubService:
    """Mock GitHub service for testing."""
    
    def __init__(self):
        self.prs_created = []
    
    def create_pull_request(self, title, body, head, base='main', repo_name=None):
        """Mock PR creation."""
        pr_number = len(self.prs_created) + 1
        pr = {
            'number': pr_number,
            'title': title,
            'body': body,
            'head': head,
            'base': base,
            'html_url': f'https://github.com/{repo_name or "test/repo"}/pull/{pr_number}'
        }
        self.prs_created.append(pr)
        print(f'[MOCK] Created PR #{pr_number}: {title}')
        return pr


class DiscordFlowSimulator:
    """Simulates Discord interaction flow for testing."""
    
    def __init__(self):
        self.github_service = MockGitHubService()
        self.conversation_states = {}
        
        # Mock boto3 DynamoDB
        self.mock_dynamodb_patcher = patch('boto3.resource')
        self.mock_dynamodb = self.mock_dynamodb_patcher.start()
        self.mock_table = MagicMock()
        self.mock_dynamodb.return_value.Table.return_value = self.mock_table
    
    def __del__(self):
        """Clean up patches."""
        try:
            self.mock_dynamodb_patcher.stop()
        except:
            pass
    
    def simulate_ux_update_command(self, command_text=None, plain_text=None, user_id='test_user'):
        """
        Simulate /ux-update command.
        
        Args:
            command_text: Structured command (e.g., 'section:header text:"Title"')
            plain_text: Plain language description
            user_id: Simulated Discord user ID
            
        Returns:
            Dictionary with response data
        """
        print('\n' + '='*60)
        print('SIMULATING: /ux-update command')
        print('='*60)
        print(f'User: {user_id}')
        if command_text:
            print(f'Command: {command_text}')
        if plain_text:
            print(f'Description: {plain_text}')
        print()
        
        try:
            from agents.ux_agent import UXAgent
            
            # Create UX agent with mock GitHub service
            ux_agent = UXAgent(
                github_service=self.github_service,
                repo='test/repo'
            )
            
            # Start conversation
            result = ux_agent.start_conversation(
                command_text=command_text,
                user_id=user_id,
                plain_text=plain_text
            )
            
            # Mock the DynamoDB storage
            if result.get('conversation_id'):
                stored_item = {
                    'conversation_id': result['conversation_id'],
                    'user_id': user_id,
                    'section': result.get('preview', {}).get('section'),
                    'updates': {},
                    'confirmed': False
                }
                self.mock_table.get_item.return_value = {'Item': stored_item}
            
            if not result.get('success'):
                print('❌ FAILED')
                print(f"Error: {result.get('message', 'Unknown error')}")
                if result.get('examples'):
                    print('\nExamples:')
                    for ex in result['examples']:
                        print(f'  • {ex}')
                return None
            
            if result.get('needs_clarification'):
                print('⚠️  NEEDS CLARIFICATION')
                print(result['message'])
                return None
            
            if result.get('needs_confirmation'):
                conversation_id = result['conversation_id']
                
                # Store conversation state for later mocking
                self.conversation_states[conversation_id] = {
                    'conversation_id': conversation_id,
                    'user_id': user_id,
                    'section': 'header',  # Parse from command_text
                    'updates': {'text': 'Welcome to Valine!'},
                    'images': [],
                    'parsed_intent': {},
                    'preview_message': result['message'],
                    'confirmed': False,
                    'needs_clarification': False,
                    'clarification_questions': [],
                    'created_at': '2025-10-27T22:00:00Z'
                }
                
                print('✅ PREVIEW GENERATED')
                print()
                print(result['message'])
                print()
                print(f"Conversation ID: {conversation_id[:8]}...")
                print()
                print('Next step: Call confirm_interaction() or cancel_interaction()')
                
                return {
                    'conversation_id': conversation_id,
                    'preview': result['message']
                }
            
            # Should not reach here
            print('✅ COMPLETED')
            return result
            
        except Exception as e:
            print(f'❌ EXCEPTION: {e}')
            import traceback
            traceback.print_exc()
            return None
    
    def simulate_confirm_button(self, conversation_id):
        """
        Simulate clicking the "Confirm" button.
        
        Args:
            conversation_id: Conversation ID from preview
            
        Returns:
            Dictionary with execution result
        """
        print('\n' + '='*60)
        print('SIMULATING: Confirm button click')
        print('='*60)
        print(f'Conversation: {conversation_id[:8]}...')
        print()
        
        try:
            from agents.ux_agent import UXAgent
            
            ux_agent = UXAgent(
                github_service=self.github_service,
                repo='test/repo'
            )
            
            # Mock get_item to return stored conversation
            self.mock_table.get_item.return_value = {
                'Item': self.conversation_states.get(conversation_id, {
                    'conversation_id': conversation_id,
                    'user_id': 'test_user',
                    'section': 'header',
                    'updates': {'text': 'Test'},
                    'confirmed': False
                })
            }
            
            result = ux_agent.confirm_and_execute(
                conversation_id=conversation_id,
                user_response='yes'
            )
            
            if not result.get('success'):
                print('❌ EXECUTION FAILED')
                print(result.get('message', 'Unknown error'))
                return None
            
            print('✅ CHANGES EXECUTED')
            print()
            print(result.get('message', 'Changes applied'))
            
            if result.get('pr_url'):
                print(f"\nPR: {result['pr_url']}")
            
            return result
            
        except Exception as e:
            print(f'❌ EXCEPTION: {e}')
            import traceback
            traceback.print_exc()
            return None
    
    def simulate_cancel_button(self, conversation_id):
        """
        Simulate clicking the "Cancel" button.
        
        Args:
            conversation_id: Conversation ID from preview
            
        Returns:
            Dictionary with cancellation result
        """
        print('\n' + '='*60)
        print('SIMULATING: Cancel button click')
        print('='*60)
        print(f'Conversation: {conversation_id[:8]}...')
        print()
        
        try:
            from agents.ux_agent import UXAgent
            
            ux_agent = UXAgent(
                github_service=self.github_service,
                repo='test/repo'
            )
            
            # Mock get_item to return stored conversation
            self.mock_table.get_item.return_value = {
                'Item': self.conversation_states.get(conversation_id, {
                    'conversation_id': conversation_id,
                    'user_id': 'test_user',
                    'section': 'footer',
                    'updates': {'text': 'MyApp'},
                    'confirmed': False
                })
            }
            
            result = ux_agent.confirm_and_execute(
                conversation_id=conversation_id,
                user_response='no'
            )
            
            print('✅ CANCELLED')
            print(result.get('message', 'Request cancelled'))
            
            return result
            
        except Exception as e:
            print(f'❌ EXCEPTION: {e}')
            import traceback
            traceback.print_exc()
            return None


def main():
    """Run simulation scenarios."""
    print('Discord Confirmation Flow Simulator')
    print('='*60)
    
    # Set up mock environment
    os.environ['STAGE'] = 'test'
    
    simulator = DiscordFlowSimulator()
    
    # Scenario 1: Structured command → Confirm
    print('\n\n📋 SCENARIO 1: Structured Command → Confirm')
    print('-'*60)
    
    response = simulator.simulate_ux_update_command(
        command_text='section:header text:"Welcome to Valine!"',
        user_id='user123'
    )
    
    if response and response.get('conversation_id'):
        conv_id = response['conversation_id']
        simulator.simulate_confirm_button(conv_id)
    
    # Scenario 2: Structured command → Cancel
    print('\n\n📋 SCENARIO 2: Structured Command → Cancel')
    print('-'*60)
    
    response = simulator.simulate_ux_update_command(
        command_text='section:footer text:"MyApp"',
        user_id='user456'
    )
    
    if response and response.get('conversation_id'):
        conv_id = response['conversation_id']
        simulator.simulate_cancel_button(conv_id)
    
    # Scenario 3: Plain text (needs clarification)
    print('\n\n📋 SCENARIO 3: Plain Text (Clarification Needed)')
    print('-'*60)
    
    simulator.simulate_ux_update_command(
        plain_text='Make the navbar blue',
        user_id='user789'
    )
    
    # Summary
    print('\n\n' + '='*60)
    print('SIMULATION SUMMARY')
    print('='*60)
    print(f'PRs Created: {len(simulator.github_service.prs_created)}')
    for i, pr in enumerate(simulator.github_service.prs_created, 1):
        print(f'  {i}. #{pr["number"]}: {pr["title"]}')
    
    print('\n✅ Simulation complete!')


if __name__ == '__main__':
    main()
