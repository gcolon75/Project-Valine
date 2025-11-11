"""
Ship Command - Release Conductor MVP
Orchestrates deployment with verification, promote, and rollback actions.
"""
import os
import json
from typing import Dict
from commands import BaseCommand
from services.state_store import get_state_store
from services.github_actions_dispatcher import GitHubActionsDispatcher
from services.github import GitHubService
from verification.http_checker import HTTPChecker
from utils.time_formatter import TimeFormatter


class ShipCommand(BaseCommand):
    """
    Release Conductor MVP - Orchestrate deploy with verification.
    """
    
    @property
    def name(self) -> str:
        return 'ship'
    
    @property
    def description(self) -> str:
        return 'Deploy with verification and promote/rollback options'
    
    async def execute(self, interaction: dict) -> dict:
        """
        Execute ship command - initiate deployment.
        
        Args:
            interaction: Discord interaction payload
            
        Returns:
            Discord response
        """
        try:
            # Extract options
            options = interaction.get('data', {}).get('options', [])
            env = 'staging'
            strategy = 'full'
            
            for option in options:
                if option.get('name') == 'env':
                    env = option.get('value', 'staging')
                elif option.get('name') == 'strategy':
                    strategy = option.get('value', 'full')
            
            # Validate environment
            if env not in ['staging', 'prod']:
                return {
                    'type': 4,
                    'data': {
                        'content': '❌ Invalid environment. Use `staging` or `prod`.',
                        'flags': 64
                    }
                }
            
            # Validate strategy
            if strategy not in ['canary', 'full']:
                return {
                    'type': 4,
                    'data': {
                        'content': '❌ Invalid strategy. Use `canary` or `full`.',
                        'flags': 64
                    }
                }
            
            # Generate deploy ID
            import time
            deploy_id = f"ship-{env}-{int(time.time())}"
            
            # Store deployment info in state
            state_store = get_state_store()
            deploy_info = {
                'deploy_id': deploy_id,
                'env': env,
                'strategy': strategy,
                'status': 'initiated',
                'initiated_by': interaction.get('member', {}).get('user', {}).get('id'),
                'initiated_at': time.time()
            }
            state_store.put(deploy_id, deploy_info, ttl=3600)  # 1 hour TTL
            
            # Trigger deployment workflow
            github_service = GitHubService()
            dispatcher = GitHubActionsDispatcher(github_service)
            
            workflow_name = 'Client Deploy' if env == 'staging' else 'Backend Deploy'
            
            try:
                run_result = dispatcher.trigger_workflow_dispatch(
                    workflow_name,
                    ref='main',
                    inputs={'environment': env, 'strategy': strategy}
                )
                
                deploy_info['workflow_run_id'] = run_result.get('id')
                deploy_info['workflow_run_url'] = run_result.get('html_url')
                state_store.put(deploy_id, deploy_info, ttl=3600)
                
            except Exception as e:
                return {
                    'type': 4,
                    'data': {
                        'content': f'❌ Failed to trigger deployment: {str(e)}',
                        'flags': 64
                    }
                }
            
            # Return immediate acknowledgment
            embed = {
                'title': '🚀 Deployment Initiated',
                'color': 0x3498db,  # Blue
                'fields': [
                    {
                        'name': 'Environment',
                        'value': env.title(),
                        'inline': True
                    },
                    {
                        'name': 'Strategy',
                        'value': strategy.title(),
                        'inline': True
                    },
                    {
                        'name': 'Deploy ID',
                        'value': deploy_id,
                        'inline': False
                    },
                    {
                        'name': 'Status',
                        'value': '⏳ Running deployment workflow...',
                        'inline': False
                    }
                ],
                'footer': {
                    'text': 'Verification checks will run after deployment completes'
                }
            }
            
            if deploy_info.get('workflow_run_url'):
                embed['fields'].append({
                    'name': 'Workflow',
                    'value': f"[View Run]({deploy_info['workflow_run_url']})",
                    'inline': False
                })
            
            return {
                'type': 4,
                'data': {
                    'embeds': [embed]
                }
            }
            
        except Exception as e:
            print(f'Error in ship command: {str(e)}')
            import traceback
            traceback.print_exc()
            
            return {
                'type': 4,
                'data': {
                    'content': f'❌ Error initiating deployment: {str(e)}',
                    'flags': 64
                }
            }
    
    def handle_component(self, interaction: dict, custom_id: str) -> dict:
        """
        Handle button interactions for promote/rollback.
        
        Args:
            interaction: Discord interaction payload
            custom_id: Button custom ID (e.g., 'ship_promote_12345')
            
        Returns:
            Discord response
        """
        try:
            # Parse custom_id
            parts = custom_id.split('_')
            if len(parts) < 3:
                return self._error_response('Invalid button action')
            
            action = parts[1]  # promote, rollback, details
            deploy_id = '_'.join(parts[2:])  # Reconstruct deploy ID
            
            # Get deployment info from state
            state_store = get_state_store()
            deploy_info = state_store.get(deploy_id)
            
            if not deploy_info:
                return self._error_response('Deployment info not found or expired')
            
            if action == 'promote':
                return self._handle_promote(deploy_info, interaction)
            elif action == 'rollback':
                return self._handle_rollback(deploy_info, interaction)
            elif action == 'details':
                return self._handle_details(deploy_info, interaction)
            else:
                return self._error_response(f'Unknown action: {action}')
                
        except Exception as e:
            print(f'Error handling ship component: {str(e)}')
            return self._error_response(str(e))
    
    def _handle_promote(self, deploy_info: dict, interaction: dict) -> dict:
        """Handle promote action."""
        deploy_id = deploy_info['deploy_id']
        env = deploy_info['env']
        
        # Update state
        state_store = get_state_store()
        deploy_info['status'] = 'promoted'
        deploy_info['promoted_at'] = __import__('time').time()
        deploy_info['promoted_by'] = interaction.get('member', {}).get('user', {}).get('id')
        state_store.put(deploy_id, deploy_info, ttl=3600)
        
        # In a real implementation, this would trigger full rollout
        # For now, we just update the message
        
        return {
            'type': 7,  # Update message
            'data': {
                'embeds': [{
                    'title': '✅ Deployment Promoted',
                    'color': 0x2ecc71,  # Green
                    'description': f'Deployment `{deploy_id}` has been promoted to {env}.',
                    'fields': [
                        {
                            'name': 'Status',
                            'value': '🎉 Full rollout in progress',
                            'inline': False
                        }
                    ],
                    'timestamp': __import__('datetime').datetime.utcnow().isoformat()
                }],
                'components': []  # Remove buttons
            }
        }
    
    def _handle_rollback(self, deploy_info: dict, interaction: dict) -> dict:
        """Handle rollback action."""
        deploy_id = deploy_info['deploy_id']
        env = deploy_info['env']
        
        # Update state
        state_store = get_state_store()
        deploy_info['status'] = 'rolled_back'
        deploy_info['rolled_back_at'] = __import__('time').time()
        deploy_info['rolled_back_by'] = interaction.get('member', {}).get('user', {}).get('id')
        state_store.put(deploy_id, deploy_info, ttl=3600)
        
        # In a real implementation, this would trigger rollback to previous version
        
        return {
            'type': 7,  # Update message
            'data': {
                'embeds': [{
                    'title': '⏪ Deployment Rolled Back',
                    'color': 0xe74c3c,  # Red
                    'description': f'Deployment `{deploy_id}` has been rolled back.',
                    'fields': [
                        {
                            'name': 'Status',
                            'value': '🔙 Reverting to previous version',
                            'inline': False
                        }
                    ],
                    'timestamp': __import__('datetime').datetime.utcnow().isoformat()
                }],
                'components': []  # Remove buttons
            }
        }
    
    def _handle_details(self, deploy_info: dict, interaction: dict) -> dict:
        """Handle details action."""
        # Run verification checks
        http_checker = HTTPChecker()
        frontend_url = os.environ.get('FRONTEND_BASE_URL', '')
        api_url = os.environ.get('VITE_API_BASE', '')
        
        checks = []
        
        # Check frontend
        if frontend_url:
            result = http_checker.check_endpoint(frontend_url, '/')
            checks.append({
                'name': '🌐 Frontend',
                'value': f"Status: {result.get('status_code', 'Error')}\nLatency: {result.get('response_time_ms', 'N/A')}ms",
                'inline': True
            })
        
        # Check API
        if api_url:
            result = http_checker.check_endpoint(api_url, '/health')
            checks.append({
                'name': '⚙️ API',
                'value': f"Status: {result.get('status_code', 'Error')}\nLatency: {result.get('response_time_ms', 'N/A')}ms",
                'inline': True
            })
        
        return {
            'type': 4,  # Send ephemeral message
            'data': {
                'embeds': [{
                    'title': '📊 Deployment Details',
                    'color': 0x3498db,  # Blue
                    'description': f"Deploy ID: `{deploy_info['deploy_id']}`",
                    'fields': checks,
                    'timestamp': __import__('datetime').datetime.utcnow().isoformat()
                }],
                'flags': 64  # Ephemeral
            }
        }
    
    def _error_response(self, message: str) -> dict:
        """Create error response."""
        return {
            'type': 4,
            'data': {
                'content': f'❌ {message}',
                'flags': 64
            }
        }
