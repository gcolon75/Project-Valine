"""
Discord slash command handler for Project Valine orchestrator.
Handles /plan, /approve, /status, /ship, /verify-latest, /verify-run, /diagnose,
/deploy-client, /set-frontend, and /set-api-base commands.
"""
import json
import os
import time
import requests
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError
from app.verification.verifier import DeployVerifier
from app.services.github import GitHubService
from app.services.github_actions_dispatcher import GitHubActionsDispatcher
from app.services.discord import DiscordService
from app.utils.url_validator import URLValidator
from app.utils.admin_auth import AdminAuthenticator
from app.utils.time_formatter import TimeFormatter


def verify_discord_signature(signature, timestamp, body, public_key):
    """Verify Discord interaction signature."""
    try:
        verify_key = VerifyKey(bytes.fromhex(public_key))
        verify_key.verify(f'{timestamp}{body}'.encode(), bytes.fromhex(signature))
        return True
    except (BadSignatureError, ValueError):
        return False


def create_response(response_type, data=None):
    """Create a Discord interaction response."""
    response = {'type': response_type}
    if data:
        response['data'] = data
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps(response)
    }


def handle_plan_command(interaction):
    """Handle /plan command - create a daily plan proposal."""
    # TODO: Implement actual plan generation logic
    return create_response(4, {
        'content': '📋 Creating daily plan proposal...\nThis will read open GitHub issues with the `ready` label and post a plan to Discord.',
        'flags': 64  # Ephemeral message
    })


def handle_approve_command(interaction):
    """Handle /approve command - approve a plan."""
    # TODO: Implement plan approval logic
    return create_response(4, {
        'content': '✅ Plan approved! Beginning execution...',
        'flags': 64
    })


def handle_status_command(interaction):
    """Handle /status command - show last 1-3 runs for Client Deploy and Diagnose workflows."""
    try:
        # Extract optional count parameter (default: 2, min: 1, max: 3)
        options = interaction.get('data', {}).get('options', [])
        count = 2
        for option in options:
            if option.get('name') == 'count':
                count = int(option.get('value', 2))
                count = max(1, min(3, count))  # Clamp to 1-3
        
        # Initialize services
        github_service = GitHubService()
        dispatcher = GitHubActionsDispatcher(github_service)
        formatter = TimeFormatter()
        
        # Get runs for both workflows
        client_deploy_runs = dispatcher.list_workflow_runs('Client Deploy', count=count)
        diagnose_runs = dispatcher.list_workflow_runs('Diagnose on Demand', count=count)
        
        # Build status message
        content = f'📊 **Status (last {count})**\n\n'
        
        # Client Deploy section
        content += '**Client Deploy:**\n'
        if client_deploy_runs:
            for run in client_deploy_runs:
                conclusion = run.get('conclusion', 'in_progress')
                if conclusion == 'success':
                    icon = '🟢'
                elif conclusion == 'failure':
                    icon = '🔴'
                elif conclusion is None or run.get('status') != 'completed':
                    icon = '🟡'
                    conclusion = 'running'
                else:
                    icon = '⚪'
                
                ago = formatter.format_relative_time(run.get('created_at'))
                duration = formatter.format_duration_seconds(run.get('duration_seconds'))
                url = run.get('html_url', '')
                
                content += f'{icon} {conclusion} • {ago} • {duration} • [run]({url})\n'
        else:
            content += '  No runs found\n'
        
        content += '\n**Diagnose on Demand:**\n'
        if diagnose_runs:
            for run in diagnose_runs:
                conclusion = run.get('conclusion', 'in_progress')
                if conclusion == 'success':
                    icon = '🟢'
                elif conclusion == 'failure':
                    icon = '🔴'
                elif conclusion is None or run.get('status') != 'completed':
                    icon = '🟡'
                    conclusion = 'running'
                else:
                    icon = '⚪'
                
                ago = formatter.format_relative_time(run.get('created_at'))
                duration = formatter.format_duration_seconds(run.get('duration_seconds'))
                url = run.get('html_url', '')
                
                content += f'{icon} {conclusion} • {ago} • {duration} • [run]({url})\n'
        else:
            content += '  No runs found\n'
        
        return create_response(4, {
            'content': content
        })
    
    except Exception as e:
        print(f'Error in handle_status_command: {str(e)}')
        import traceback
        traceback.print_exc()
        return create_response(4, {
            'content': f'❌ Error: {str(e)}',
            'flags': 64
        })


def handle_ship_command(interaction):
    """Handle /ship command - finalize and deploy."""
    # TODO: Implement shipping logic
    return create_response(4, {
        'content': '🚢 Preparing to ship...\nThis will finalize PRs and trigger deployments.',
        'flags': 64
    })


def handle_verify_latest_command(interaction):
    """Handle /verify-latest command - verify latest Client Deploy run."""
    try:
        # Extract optional parameters
        options = interaction.get('data', {}).get('options', [])
        run_url = None
        diagnose = False
        for option in options:
            if option.get('name') == 'run_url':
                run_url = option.get('value')
            elif option.get('name') == 'diagnose':
                diagnose = option.get('value', False)

        # Perform verification
        verifier = DeployVerifier()
        result = verifier.verify_latest_run(run_url)

        # Get message from result
        message = result.get('message', {})
        content = message.get('content', '❌ Verification failed')
        embed = message.get('embed')

        # If diagnose option is enabled, trigger diagnose workflow
        if diagnose:
            try:
                github_service = GitHubService()
                dispatcher = GitHubActionsDispatcher(github_service)
                
                # Generate correlation ID
                correlation_id = dispatcher.generate_correlation_id()
                
                # Get user info
                user = interaction.get('member', {}).get('user', {})
                requester = user.get('username', user.get('id', 'unknown'))
                
                # Trigger diagnose
                dispatch_result = dispatcher.trigger_diagnose_dispatch(
                    correlation_id=correlation_id,
                    requester=requester
                )
                
                if dispatch_result.get('success'):
                    # Add diagnose info to response
                    content += f'\n\n🔧 **Diagnose triggered** (correlation: `{correlation_id[:8]}...`)'
                    content += '\n⏳ Checking for run...'
                else:
                    content += f'\n\n⚠️ Failed to trigger diagnose: {dispatch_result.get("message")}'
                    
            except Exception as diag_error:
                print(f'Error triggering diagnose: {str(diag_error)}')
                content += f'\n\n⚠️ Failed to trigger diagnose: {str(diag_error)}'

        # Return response with embed
        response_data = {'content': content}
        if embed:
            response_data['embeds'] = [embed]

        return create_response(4, response_data)

    except Exception as e:
        print(f'Error in handle_verify_latest_command: {str(e)}')
        import traceback
        traceback.print_exc()
        return create_response(4, {
            'content': f'❌ Error: {str(e)}',
            'flags': 64
        })


def handle_verify_run_command(interaction):
    """Handle /verify-run command - verify specific run by ID."""
    try:
        # Extract required run_id parameter
        options = interaction.get('data', {}).get('options', [])
        run_id = None
        for option in options:
            if option.get('name') == 'run_id':
                run_id = option.get('value')

        if not run_id:
            return create_response(4, {
                'content': '❌ Missing required parameter: run_id',
                'flags': 64
            })

        # Validate run_id is numeric
        try:
            run_id = int(run_id)
        except ValueError:
            return create_response(4, {
                'content': '❌ Invalid run_id: must be a number',
                'flags': 64
            })

        # Perform verification
        verifier = DeployVerifier()
        result = verifier.verify_run(run_id)

        # Get message from result
        message = result.get('message', {})
        content = message.get('content', '❌ Verification failed')
        embed = message.get('embed')

        # Return response with embed
        response_data = {'content': content}
        if embed:
            response_data['embeds'] = [embed]

        return create_response(4, response_data)

    except Exception as e:
        print(f'Error in handle_verify_run_command: {str(e)}')
        import traceback
        traceback.print_exc()
        return create_response(4, {
            'content': f'❌ Error: {str(e)}',
            'flags': 64
        })


def handle_diagnose_command(interaction):
    """Handle /diagnose command - trigger on-demand diagnose workflow."""
    try:
        # Extract optional parameters
        options = interaction.get('data', {}).get('options', [])
        frontend_url = ''
        api_base = ''
        for option in options:
            if option.get('name') == 'frontend_url':
                frontend_url = option.get('value', '')
            elif option.get('name') == 'api_base':
                api_base = option.get('value', '')

        # Initialize services
        github_service = GitHubService()
        dispatcher = GitHubActionsDispatcher(github_service)
        
        # Generate correlation ID
        correlation_id = dispatcher.generate_correlation_id()
        
        # Get user info
        user = interaction.get('member', {}).get('user', {})
        requester = user.get('username', user.get('id', 'unknown'))
        
        # Get channel/thread info
        channel_id = interaction.get('channel_id', '')
        
        # Trigger diagnose workflow
        dispatch_result = dispatcher.trigger_diagnose_dispatch(
            correlation_id=correlation_id,
            requester=requester,
            channel_id=channel_id,
            frontend_url=frontend_url,
            api_base=api_base
        )
        
        if not dispatch_result.get('success'):
            return create_response(4, {
                'content': f'❌ Failed to trigger diagnose: {dispatch_result.get("message")}',
                'flags': 64
            })
        
        # Return initial response
        short_id = correlation_id[:8]
        content = f'🟡 **Starting Diagnose...**\n\n'
        content += f'**Correlation ID:** `{short_id}...`\n'
        content += f'**Requested by:** {requester}\n\n'
        content += '⏳ Workflow is being triggered. Searching for run...'
        
        return create_response(4, {
            'content': content
        })

    except Exception as e:
        print(f'Error in handle_diagnose_command: {str(e)}')
        import traceback
        traceback.print_exc()
        return create_response(4, {
            'content': f'❌ Error: {str(e)}',
            'flags': 64
        })


def handle_deploy_client_command(interaction):
    """Handle /deploy-client command - trigger Client Deploy workflow."""
    try:
        # Extract optional parameters
        options = interaction.get('data', {}).get('options', [])
        api_base = ''
        wait = False
        
        for option in options:
            if option.get('name') == 'api_base':
                api_base = option.get('value', '')
            elif option.get('name') == 'wait':
                wait = option.get('value', False)
        
        # Validate api_base if provided
        if api_base:
            validator = URLValidator()
            validation_result = validator.validate_url(api_base)
            if not validation_result['valid']:
                return create_response(4, {
                    'content': f'❌ Invalid api_base URL: {validation_result["message"]}',
                    'flags': 64
                })
        
        # Initialize services
        github_service = GitHubService()
        dispatcher = GitHubActionsDispatcher(github_service)
        
        # Generate correlation ID
        correlation_id = dispatcher.generate_correlation_id()
        
        # Get user info
        user = interaction.get('member', {}).get('user', {})
        requester = user.get('username', user.get('id', 'unknown'))
        
        # Trigger Client Deploy workflow
        dispatch_result = dispatcher.trigger_client_deploy(
            correlation_id=correlation_id,
            requester=requester,
            api_base=api_base
        )
        
        if not dispatch_result.get('success'):
            return create_response(4, {
                'content': f'❌ Failed to trigger Client Deploy: {dispatch_result.get("message")}',
                'flags': 64
            })
        
        # Build initial response
        short_id = correlation_id[:8]
        
        # If wait=false, return immediate response (unchanged behavior)
        if not wait:
            content = f'🟡 **Starting Client Deploy...**\n\n'
            if api_base:
                content += f'**API Base Override:** `{api_base}`\n'
            content += f'**Correlation ID:** `{short_id}...`\n'
            content += f'**Requested by:** {requester}\n\n'
            content += '⏳ Workflow dispatched. Use `/status` to check progress.'
            
            return create_response(4, {
                'content': content
            })
        
        # If wait=true, use deferred response and follow-up
        # Send deferred response (type 5)
        deferred_response = create_response(5)  # DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
        
        # Post follow-up messages in a background thread/async manner
        # Since Lambda doesn't support long-running processes, we'll do polling here
        # and return before timeout (3 seconds Lambda context)
        
        # Wait a bit for run to be created
        time.sleep(3)
        
        # Find the run by correlation_id
        run = dispatcher.find_run_by_correlation(correlation_id, 'Client Deploy')
        
        if run:
            # Send follow-up with run link
            follow_up_content = f'🟡 **Client Deploy Started**\n\n'
            if api_base:
                follow_up_content += f'**API Base Override:** `{api_base}`\n'
            follow_up_content += f'**Correlation ID:** `{short_id}...`\n'
            follow_up_content += f'**Requested by:** {requester}\n'
            follow_up_content += f'**Run:** {run.html_url}\n\n'
            follow_up_content += '⏳ Waiting for completion (up to 3 minutes)...'
            
            # Post follow-up via webhook/interaction token
            _post_followup_message(interaction, follow_up_content)
            
            # Poll for completion (up to 180 seconds)
            poll_result = dispatcher.poll_run_conclusion(run.id, timeout_seconds=180, poll_interval=3)
            
            # Send final outcome
            if poll_result.get('completed'):
                conclusion = poll_result.get('conclusion')
                if conclusion == 'success':
                    final_content = f'🟢 **Client Deploy Successful**\n\n'
                    final_content += f'**Correlation ID:** `{short_id}...`\n'
                    final_content += f'**Run:** {run.html_url}\n\n'
                    final_content += '✅ Deployment completed successfully!'
                else:
                    final_content = f'🔴 **Client Deploy Failed**\n\n'
                    final_content += f'**Correlation ID:** `{short_id}...`\n'
                    final_content += f'**Run:** {run.html_url}\n'
                    final_content += f'**Conclusion:** {conclusion}\n\n'
                    final_content += '❌ Deployment failed. Check the run for details.'
            else:
                # Timed out
                final_content = f'⏱️ **Client Deploy Timeout**\n\n'
                final_content += f'**Correlation ID:** `{short_id}...`\n'
                final_content += f'**Run:** {run.html_url}\n\n'
                final_content += '⚠️ Deployment is still running after 3 minutes. Check the run for current status.'
            
            _post_followup_message(interaction, final_content)
        else:
            # Run not found, post searching message
            follow_up_content = f'🟡 **Client Deploy Triggered**\n\n'
            if api_base:
                follow_up_content += f'**API Base Override:** `{api_base}`\n'
            follow_up_content += f'**Correlation ID:** `{short_id}...`\n'
            follow_up_content += f'**Requested by:** {requester}\n\n'
            follow_up_content += '⏳ Searching for run... Check GitHub Actions if this takes too long.'
            
            _post_followup_message(interaction, follow_up_content)
        
        return deferred_response
    
    except Exception as e:
        print(f'Error in handle_deploy_client_command: {str(e)}')
        import traceback
        traceback.print_exc()
        return create_response(4, {
            'content': f'❌ Error: {str(e)}',
            'flags': 64
        })


def _post_followup_message(interaction, content):
    """Post a follow-up message to a Discord interaction."""
    try:
        # Get interaction token and application_id
        token = interaction.get('token')
        app_id = interaction.get('application_id')
        
        if not token or not app_id:
            print('Missing interaction token or app_id for follow-up')
            return
        
        # Post follow-up message
        url = f'https://discord.com/api/v10/webhooks/{app_id}/{token}'
        headers = {'Content-Type': 'application/json'}
        payload = {'content': content}
        
        response = requests.post(url, headers=headers, json=payload, timeout=5)
        
        if response.status_code in [200, 204]:
            print('Follow-up message posted successfully')
        else:
            print(f'Failed to post follow-up message: {response.status_code} - {response.text}')
    
    except Exception as e:
        print(f'Error posting follow-up message: {str(e)}')


def handle_set_frontend_command(interaction):
    """Handle /set-frontend command - update FRONTEND_BASE_URL (admin only, feature-flagged)."""
    try:
        # Extract parameters
        options = interaction.get('data', {}).get('options', [])
        url = None
        confirm = False
        
        for option in options:
            if option.get('name') == 'url':
                url = option.get('value')
            elif option.get('name') == 'confirm':
                confirm = option.get('value', False)
        
        if not url:
            return create_response(4, {
                'content': '❌ Missing required parameter: url',
                'flags': 64
            })
        
        # Check admin authorization
        authenticator = AdminAuthenticator()
        user = interaction.get('member', {}).get('user', {})
        user_id = user.get('id', '')
        role_ids = [role for role in interaction.get('member', {}).get('roles', [])]
        
        auth_result = authenticator.authorize_admin_action(
            user_id, 
            role_ids, 
            requires_secret_write=True
        )
        
        if not auth_result['authorized']:
            return create_response(4, {
                'content': auth_result['message'],
                'flags': 64
            })
        
        # Check confirmation
        if not confirm:
            return create_response(4, {
                'content': '❌ Confirmation required: pass `confirm: true` to update FRONTEND_BASE_URL',
                'flags': 64
            })
        
        # Validate URL
        validator = URLValidator()
        validation_result = validator.validate_url(url)
        if not validation_result['valid']:
            return create_response(4, {
                'content': f'❌ Invalid URL: {validation_result["message"]}',
                'flags': 64
            })
        
        # Update repository variable (preferred) or secret
        github_service = GitHubService()
        
        # Try variable first
        result = github_service.update_repo_variable('FRONTEND_BASE_URL', url)
        
        if result['success']:
            fingerprint = AdminAuthenticator.get_value_fingerprint(url)
            return create_response(4, {
                'content': f'✅ Updated FRONTEND_BASE_URL (fingerprint {fingerprint})',
                'flags': 64
            })
        else:
            return create_response(4, {
                'content': f'❌ Failed to update FRONTEND_BASE_URL: {result["message"]}',
                'flags': 64
            })
    
    except Exception as e:
        print(f'Error in handle_set_frontend_command: {str(e)}')
        import traceback
        traceback.print_exc()
        return create_response(4, {
            'content': f'❌ Error: {str(e)}',
            'flags': 64
        })


def handle_set_api_base_command(interaction):
    """Handle /set-api-base command - update VITE_API_BASE secret (admin only, feature-flagged)."""
    try:
        # Extract parameters
        options = interaction.get('data', {}).get('options', [])
        url = None
        confirm = False
        
        for option in options:
            if option.get('name') == 'url':
                url = option.get('value')
            elif option.get('name') == 'confirm':
                confirm = option.get('value', False)
        
        if not url:
            return create_response(4, {
                'content': '❌ Missing required parameter: url',
                'flags': 64
            })
        
        # Check admin authorization
        authenticator = AdminAuthenticator()
        user = interaction.get('member', {}).get('user', {})
        user_id = user.get('id', '')
        role_ids = [role for role in interaction.get('member', {}).get('roles', [])]
        
        auth_result = authenticator.authorize_admin_action(
            user_id, 
            role_ids, 
            requires_secret_write=True
        )
        
        if not auth_result['authorized']:
            return create_response(4, {
                'content': auth_result['message'],
                'flags': 64
            })
        
        # Check confirmation
        if not confirm:
            return create_response(4, {
                'content': '❌ Confirmation required: pass `confirm: true` to update VITE_API_BASE',
                'flags': 64
            })
        
        # Validate URL
        validator = URLValidator()
        validation_result = validator.validate_url(url)
        if not validation_result['valid']:
            return create_response(4, {
                'content': f'❌ Invalid URL: {validation_result["message"]}',
                'flags': 64
            })
        
        # Update repository secret
        github_service = GitHubService()
        result = github_service.update_repo_secret('VITE_API_BASE', url)
        
        if result['success']:
            fingerprint = AdminAuthenticator.get_value_fingerprint(url)
            return create_response(4, {
                'content': f'✅ Updated VITE_API_BASE (fingerprint {fingerprint})',
                'flags': 64
            })
        else:
            return create_response(4, {
                'content': f'❌ Failed to update VITE_API_BASE: {result["message"]}',
                'flags': 64
            })
    
    except Exception as e:
        print(f'Error in handle_set_api_base_command: {str(e)}')
        import traceback
        traceback.print_exc()
        return create_response(4, {
            'content': f'❌ Error: {str(e)}',
            'flags': 64
        })


def handler(event, context):
    """
    Main Lambda handler for Discord interactions.

    Verifies Discord signature and routes commands to appropriate handlers.
    """
    try:
        # Get Discord public key from environment
        public_key = os.environ.get('DISCORD_PUBLIC_KEY')
        if not public_key:
            return {
                'statusCode': 500,
                'body': json.dumps({'error': 'Discord public key not configured'})
            }

        # Extract signature headers
        signature = event.get('headers', {}).get('x-signature-ed25519')
        timestamp = event.get('headers', {}).get('x-signature-timestamp')
        body = event.get('body', '')

        # Verify signature
        if not signature or not timestamp:
            return {
                'statusCode': 401,
                'body': json.dumps({'error': 'Missing signature headers'})
            }

        if not verify_discord_signature(signature, timestamp, body, public_key):
            return {
                'statusCode': 401,
                'body': json.dumps({'error': 'Invalid request signature'})
            }

        # Parse interaction
        interaction = json.loads(body)
        interaction_type = interaction.get('type')

        # Handle PING
        if interaction_type == 1:
            return create_response(1)  # PONG

        # Handle APPLICATION_COMMAND
        if interaction_type == 2:
            command_name = interaction.get('data', {}).get('name')

            if command_name == 'plan':
                return handle_plan_command(interaction)
            elif command_name == 'approve':
                return handle_approve_command(interaction)
            elif command_name == 'status':
                return handle_status_command(interaction)
            elif command_name == 'ship':
                return handle_ship_command(interaction)
            elif command_name == 'verify-latest':
                return handle_verify_latest_command(interaction)
            elif command_name == 'verify-run':
                return handle_verify_run_command(interaction)
            elif command_name == 'diagnose':
                return handle_diagnose_command(interaction)
            elif command_name == 'deploy-client':
                return handle_deploy_client_command(interaction)
            elif command_name == 'set-frontend':
                return handle_set_frontend_command(interaction)
            elif command_name == 'set-api-base':
                return handle_set_api_base_command(interaction)
            else:
                return create_response(4, {
                    'content': f'Unknown command: {command_name}',
                    'flags': 64
                })

        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Unknown interaction type'})
        }

    except Exception as e:
        print(f'Error handling Discord interaction: {str(e)}')
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'})
        }
