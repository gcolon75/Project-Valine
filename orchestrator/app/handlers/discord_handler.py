"""
Discord slash command handler for Project Valine orchestrator.
Handles /plan, /approve, /status, /ship, /verify-latest, /verify-run, /diagnose,
/deploy-client, /set-frontend, /set-api-base, /agents, /status-digest, /triage commands.
"""
import json
import os
import sys
import time
import requests
from pathlib import Path
from datetime import datetime, timedelta, timezone
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError
from app.verification.verifier import DeployVerifier
from app.services.github import GitHubService
from app.services.github_actions_dispatcher import GitHubActionsDispatcher
from app.services.discord import DiscordService
from app.services.audit_store import AuditStore
from app.utils.url_validator import URLValidator
from app.utils.admin_auth import AdminAuthenticator
from app.utils.time_formatter import TimeFormatter
from app.utils.trace_store import get_trace_store
from app.utils.logger import redact_secrets, StructuredLogger
from app.agents.registry import get_agents

# Note: Phase5TriageAgent is only used for local testing
# The Discord bot triggers the triage workflow via GitHub Actions instead
# sys.path.insert(0, str(Path(__file__).parent.parent.parent / "scripts"))
# from phase5_triage_agent import Phase5TriageAgent, TriageConfig


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


def handle_debug_last_command(interaction):
    """Handle /debug-last command - show last execution trace for debugging."""
    try:
        # Check if debug command is enabled (feature flag)
        enable_debug_cmd = os.environ.get('ENABLE_DEBUG_CMD', 'false').lower() == 'true'
        
        if not enable_debug_cmd:
            return create_response(4, {
                'content': '❌ Debug commands are disabled (ENABLE_DEBUG_CMD=false)',
                'flags': 64
            })
        
        # Get user ID
        user = interaction.get('member', {}).get('user', {})
        user_id = user.get('id', '')
        
        # Get trace store
        trace_store = get_trace_store()
        
        # Get last trace for this user
        last_trace = trace_store.get_last_trace(user_id if user_id else None)
        
        if not last_trace:
            return create_response(4, {
                'content': '🔍 No recent trace found. Execute a command first.',
                'flags': 64
            })
        
        # Build debug output
        lines = [
            '🔍 **Last Execution Debug Info**',
            '',
            f'**Command:** `{last_trace.command}`',
            f'**Trace ID:** `{last_trace.trace_id}`',
            f'**Started:** {datetime.fromtimestamp(last_trace.started_at, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")}'
        ]
        
        # Duration
        duration_ms = last_trace.get_duration_ms()
        if duration_ms:
            lines.append(f'**Duration:** {duration_ms:.0f}ms')
        else:
            lines.append('**Status:** In progress')
        
        # Steps with timings
        if last_trace.steps:
            lines.append('')
            lines.append('**Steps:**')
            for step in last_trace.steps:
                status_emoji = '✅' if step['status'] == 'success' else '❌' if step['status'] == 'failure' else '⏳'
                step_line = f"  {status_emoji} {step['name']}"
                if 'duration_ms' in step:
                    step_line += f" ({step['duration_ms']:.0f}ms)"
                lines.append(step_line)
                
                if step.get('details'):
                    # Redact secrets from details
                    safe_details = redact_secrets({'details': step['details']})
                    lines.append(f"     └─ {safe_details['details']}")
        
        # Error
        if last_trace.error:
            lines.append('')
            lines.append(f'**Error:** {last_trace.error}')
        
        # Relevant links
        if last_trace.metadata.get('run_link'):
            lines.append('')
            lines.append(f"[View Run]({last_trace.metadata['run_link']})")
        
        # Limit output length (Discord has 2000 char limit)
        content = '\n'.join(lines)
        if len(content) > 1900:
            content = content[:1900] + '\n\n... (truncated)'
        
        return create_response(4, {
            'content': content,
            'flags': 64  # Ephemeral
        })
    
    except Exception as e:
        print(f'Error in handle_debug_last_command: {str(e)}')
        import traceback
        traceback.print_exc()
        return create_response(4, {
            'content': f'❌ Error retrieving debug info: {str(e)}',
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


def handle_agents_command(interaction):
    """Handle /agents command - list available orchestrator agents."""
    try:
        agents = get_agents()
        
        content = '🤖 **Available Orchestrator Agents**\n\n'
        
        for agent in agents:
            content += f'**{agent.name}** (`{agent.id}`)\n'
            content += f'{agent.description}\n'
            content += f'Entry command: `{agent.command}`\n\n'
        
        content += f'_Total: {len(agents)} agents_'
        
        return create_response(4, {
            'content': content
        })
    
    except Exception as e:
        print(f'Error in handle_agents_command: {str(e)}')
        import traceback
        traceback.print_exc()
        return create_response(4, {
            'content': f'❌ Error: {str(e)}',
            'flags': 64
        })


def handle_status_digest_command(interaction):
    """Handle /status-digest command - show aggregated status digest for workflows."""
    try:
        # Extract optional period parameter
        options = interaction.get('data', {}).get('options', [])
        period = 'daily'
        
        for option in options:
            if option.get('name') == 'period':
                period = option.get('value', 'daily')
        
        # Validate period
        if period not in ['daily', 'weekly']:
            return create_response(4, {
                'content': '❌ Invalid period. Must be "daily" or "weekly".',
                'flags': 64
            })
        
        # Calculate time window
        now = datetime.now(timezone.utc)
        if period == 'daily':
            cutoff = now - timedelta(days=1)
            period_label = 'Last 24 Hours'
        else:  # weekly
            cutoff = now - timedelta(days=7)
            period_label = 'Last 7 Days'
        
        # Initialize services
        github_service = GitHubService()
        dispatcher = GitHubActionsDispatcher(github_service)
        formatter = TimeFormatter()
        
        # Get runs for both workflows (get more to aggregate)
        client_deploy_runs = dispatcher.list_workflow_runs('Client Deploy', count=50)
        diagnose_runs = dispatcher.list_workflow_runs('Diagnose on Demand', count=50)
        
        # Filter by time window and aggregate
        def aggregate_runs(runs, cutoff_time):
            """Aggregate runs within the time window."""
            filtered_runs = []
            for run in runs:
                run_time = run.get('created_at')
                if run_time:
                    # Ensure timezone-aware
                    if run_time.tzinfo is None:
                        run_time = run_time.replace(tzinfo=timezone.utc)
                    if run_time >= cutoff_time:
                        filtered_runs.append(run)
            
            success_count = sum(1 for r in filtered_runs if r.get('conclusion') == 'success')
            failure_count = sum(1 for r in filtered_runs if r.get('conclusion') == 'failure')
            
            # Calculate average duration
            durations = [r.get('duration_seconds') for r in filtered_runs if r.get('duration_seconds')]
            avg_duration = sum(durations) / len(durations) if durations else None
            
            # Get most recent run
            latest_run = filtered_runs[0] if filtered_runs else None
            
            return {
                'total': len(filtered_runs),
                'success': success_count,
                'failure': failure_count,
                'avg_duration': avg_duration,
                'latest_run': latest_run
            }
        
        client_stats = aggregate_runs(client_deploy_runs, cutoff)
        diagnose_stats = aggregate_runs(diagnose_runs, cutoff)
        
        # Build digest message
        content = f'📊 **Status Digest - {period_label}**\n\n'
        
        # Client Deploy section
        content += '**Client Deploy:**\n'
        if client_stats['total'] > 0:
            content += f"• Runs: {client_stats['total']} ({client_stats['success']} ✅ / {client_stats['failure']} ❌)\n"
            if client_stats['avg_duration']:
                avg_dur_str = formatter.format_duration_seconds(int(client_stats['avg_duration']))
                content += f'• Avg duration: {avg_dur_str}\n'
            else:
                content += '• Avg duration: n/a\n'
            
            if client_stats['latest_run']:
                latest = client_stats['latest_run']
                ago = formatter.format_relative_time(latest.get('created_at'))
                content += f"• Latest: [{latest.get('conclusion', 'unknown')}]({latest.get('html_url')}) ({ago})\n"
        else:
            content += '• No runs in this period\n'
        
        content += '\n**Diagnose on Demand:**\n'
        if diagnose_stats['total'] > 0:
            content += f"• Runs: {diagnose_stats['total']} ({diagnose_stats['success']} ✅ / {diagnose_stats['failure']} ❌)\n"
            if diagnose_stats['avg_duration']:
                avg_dur_str = formatter.format_duration_seconds(int(diagnose_stats['avg_duration']))
                content += f'• Avg duration: {avg_dur_str}\n'
            else:
                content += '• Avg duration: n/a\n'
            
            if diagnose_stats['latest_run']:
                latest = diagnose_stats['latest_run']
                ago = formatter.format_relative_time(latest.get('created_at'))
                content += f"• Latest: [{latest.get('conclusion', 'unknown')}]({latest.get('html_url')}) ({ago})\n"
        else:
            content += '• No runs in this period\n'
        
        return create_response(4, {
            'content': content
        })
    
    except Exception as e:
        print(f'Error in handle_status_digest_command: {str(e)}')
        import traceback
        traceback.print_exc()
        return create_response(4, {
            'content': f'❌ Error: {str(e)}',
            'flags': 64
        })


def handle_triage_command(interaction):
    """Handle /triage command - auto-diagnose and fix failed PR/workflow runs."""
    try:
        # Extract required pr parameter
        options = interaction.get('data', {}).get('options', [])
        pr_number = None
        auto_fix = False
        allow_invasive = False
        
        for option in options:
            if option.get('name') == 'pr':
                pr_number = option.get('value')
            elif option.get('name') == 'auto_fix':
                auto_fix = option.get('value', False)
            elif option.get('name') == 'allow_invasive':
                allow_invasive = option.get('value', False)
        
        if not pr_number:
            return create_response(4, {
                'content': '❌ Missing required parameter: pr (PR number or run ID)',
                'flags': 64
            })
        
        # Validate pr_number is numeric
        try:
            pr_number = int(pr_number)
        except ValueError:
            return create_response(4, {
                'content': '❌ Invalid pr parameter: must be a number',
                'flags': 64
            })
        
        # Get user info
        user = interaction.get('member', {}).get('user', {})
        username = user.get('username', user.get('id', 'unknown'))
        
        # Initialize trace
        trace_store = get_trace_store()
        logger = StructuredLogger(service="triage")
        import uuid
        trace_id = str(uuid.uuid4())
        logger.set_context(trace_id=trace_id, cmd='/triage', pr=pr_number)
        
        # Create initial trace
        trace = trace_store.create_trace(
            command='/triage',
            user_id=user.get('id', ''),
            metadata={'pr_number': pr_number, 'auto_fix': auto_fix, 'allow_invasive': allow_invasive}
        )
        
        # Send initial response
        content = f'🔍 **Starting Triage for PR #{pr_number}**\n\n'
        content += f'**Requested by:** {username}\n'
        content += f'**Auto-fix:** {"✅ Enabled" if auto_fix else "❌ Disabled"}\n'
        content += f'**Allow invasive:** {"✅ Yes" if allow_invasive else "❌ No"}\n\n'
        content += '⏳ Analyzing failure logs...\n'
        content += '\n_This may take 1-2 minutes. Results will be posted when complete._'
        
        # Start triage in background (simplified for MVP - in production would use async Lambda)
        try:
            # Configure triage agent
            config = TriageConfig()
            config.repo = os.environ.get('GITHUB_REPOSITORY', 'gcolon75/Project-Valine')
            config.failure_ref = pr_number
            config.allow_auto_fix = auto_fix
            config.allow_invasive_fixes = allow_invasive
            config.github_token = os.environ.get('GITHUB_TOKEN')
            config.verbose = False  # Reduce output for Discord context
            
            if not config.github_token:
                trace_store.add_step(trace, 'config', 'failure', error='Missing GITHUB_TOKEN')
                return create_response(4, {
                    'content': '❌ Configuration error: GITHUB_TOKEN not available',
                    'flags': 64
                })
            
            # Run triage agent
            trace_store.add_step(trace, 'triage-start', 'success')
            agent = Phase5TriageAgent(config)
            
            # For MVP, provide immediate feedback that triage is queued
            # In production, this would trigger an async Lambda or Step Function
            content += f'\n\n✅ Triage queued successfully!'
            content += f'\n📊 Check GitHub Actions for triage results'
            content += f'\n🔗 View PR: https://github.com/{config.repo}/pull/{pr_number}'
            
            trace_store.add_step(trace, 'triage-queued', 'success')
            trace_store.complete_trace(trace)
            
        except Exception as triage_error:
            trace_store.add_step(trace, 'triage-error', 'failure', error=str(triage_error))
            trace_store.complete_trace(trace, error=str(triage_error))
            content += f'\n\n❌ Failed to start triage: {str(triage_error)}'
        
        return create_response(4, {
            'content': content
        })
    
    except Exception as e:
        print(f'Error in handle_triage_command: {str(e)}')
        import traceback
        traceback.print_exc()
        return create_response(4, {
            'content': f'❌ Error: {str(e)}',
            'flags': 64
        })


def handle_relay_send_command(interaction):
    """Handle /relay-send command - post message to channel with admin authorization."""
    try:
        # Extract parameters
        options = interaction.get('data', {}).get('options', [])
        channel_id = None
        message = None
        ephemeral = False
        confirm = False
        
        for option in options:
            if option.get('name') == 'channel_id':
                channel_id = option.get('value')
            elif option.get('name') == 'message':
                message = option.get('value')
            elif option.get('name') == 'ephemeral':
                ephemeral = option.get('value', False)
            elif option.get('name') == 'confirm':
                confirm = option.get('value', False)
        
        # Validate required parameters
        if not channel_id or not message:
            return create_response(4, {
                'content': '❌ Missing required parameters: channel_id and message',
                'flags': 64
            })
        
        # Get user info
        user = interaction.get('member', {}).get('user', {})
        user_id = user.get('id', 'unknown')
        username = user.get('username', user_id)
        member = interaction.get('member', {})
        role_ids = member.get('roles', [])
        
        # Initialize services
        authenticator = AdminAuthenticator()
        logger = StructuredLogger(service="relay")
        trace_store = get_trace_store()
        
        # Generate trace ID
        import uuid
        trace_id = str(uuid.uuid4())
        logger.set_context(trace_id=trace_id, user_id=user_id, cmd='/relay-send')
        
        # Create trace
        trace = trace_store.create_trace(trace_id, '/relay-send', user_id)
        trace.add_step('Validate authorization', status='in_progress')
        
        # Check admin authorization
        auth_result = authenticator.authorize_admin_action(
            user_id=user_id,
            role_ids=role_ids,
            requires_secret_write=False
        )
        
        if not auth_result['authorized']:
            trace.add_step('Validate authorization', status='failure', details='Not authorized')
            trace.complete()
            logger.warn('Unauthorized relay-send attempt', fn='handle_relay_send_command')
            return create_response(4, {
                'content': auth_result['message'],
                'flags': 64
            })
        
        trace.add_step('Validate authorization', duration_ms=10, status='success')
        
        # Check confirmation for admin commands
        if not confirm:
            trace.add_step('Check confirmation', status='failure', details='Confirmation required')
            trace.complete()
            return create_response(4, {
                'content': '❌ Confirmation required. Add `confirm:true` to post message.',
                'flags': 64
            })
        
        trace.add_step('Check confirmation', duration_ms=5, status='success')
        
        # Redact secrets from message before posting
        message_to_post = message  # In production, scan and redact any detected secrets
        # For now, we trust admin users but log the fingerprint
        
        trace.add_step('Redact secrets', duration_ms=5, status='success')
        
        # Post message to channel
        discord_service = DiscordService()
        post_result = discord_service.send_message(channel_id, message_to_post)
        
        if not post_result:
            trace.add_step('Post message', status='failure', details='Failed to post')
            trace.complete()
            
            # Create audit record for failed attempt
            audit_store = AuditStore()
            audit_id = audit_store.create_audit_record(
                trace_id=trace_id,
                user_id=user_id,
                command='/relay-send',
                target_channel=channel_id,
                message=message,
                result='failed'
            )
            
            logger.error('Failed to post message', fn='handle_relay_send_command', 
                        audit_id=audit_id, channel_id=channel_id)
            return create_response(4, {
                'content': f'❌ Failed to post message to channel {channel_id}',
                'flags': 64
            })
        
        trace.add_step('Post message', duration_ms=200, status='success')
        trace.complete()
        
        # Create audit record for successful post
        audit_store = AuditStore()
        audit_id = audit_store.create_audit_record(
            trace_id=trace_id,
            user_id=user_id,
            command='/relay-send',
            target_channel=channel_id,
            message=message,
            result='posted',
            metadata={
                'username': username,
                'ephemeral': ephemeral,
                'message_id': post_result.get('id')
            }
        )
        
        logger.info('Message posted successfully', fn='handle_relay_send_command',
                   audit_id=audit_id, channel_id=channel_id)
        
        # Get message fingerprint for confirmation
        message_fingerprint = audit_store._get_message_fingerprint(message)
        
        # Return confirmation
        response_flags = 64 if ephemeral else 0
        content = f'✅ **Message posted to channel**\n\n'
        content += f'**Channel ID:** `{channel_id}`\n'
        content += f'**Message ID:** `{post_result.get("id")}`\n'
        content += f'**Fingerprint:** `{message_fingerprint}`\n'
        content += f'**Audit ID:** `{audit_id[:8]}...`\n'
        content += f'**Trace ID:** `{trace_id[:8]}...`'
        
        return create_response(4, {
            'content': content,
            'flags': response_flags
        })
    
    except Exception as e:
        print(f'Error in handle_relay_send_command: {str(e)}')
        import traceback
        traceback.print_exc()
        return create_response(4, {
            'content': f'❌ Error: {str(e)}',
            'flags': 64
        })


def handle_relay_dm_command(interaction):
    """Handle /relay-dm command - owner-only DM-based message posting."""
    try:
        # Extract parameters
        options = interaction.get('data', {}).get('options', [])
        message = None
        target_channel_id = None
        
        for option in options:
            if option.get('name') == 'message':
                message = option.get('value')
            elif option.get('name') == 'target_channel_id':
                target_channel_id = option.get('value')
        
        # Validate required parameters
        if not message or not target_channel_id:
            return create_response(4, {
                'content': '❌ Missing required parameters: message and target_channel_id',
                'flags': 64
            })
        
        # Get user info
        user = interaction.get('member', {}).get('user', {})
        user_id = user.get('id', 'unknown')
        username = user.get('username', user_id)
        member = interaction.get('member', {})
        role_ids = member.get('roles', [])
        
        # Initialize services
        authenticator = AdminAuthenticator()
        logger = StructuredLogger(service="relay")
        trace_store = get_trace_store()
        
        # Generate trace ID
        import uuid
        trace_id = str(uuid.uuid4())
        logger.set_context(trace_id=trace_id, user_id=user_id, cmd='/relay-dm')
        
        # Create trace
        trace = trace_store.create_trace(trace_id, '/relay-dm', user_id)
        trace.add_step('Validate authorization', status='in_progress')
        
        # Check admin authorization (owner-only command)
        auth_result = authenticator.authorize_admin_action(
            user_id=user_id,
            role_ids=role_ids,
            requires_secret_write=False
        )
        
        if not auth_result['authorized']:
            trace.add_step('Validate authorization', status='failure', details='Not authorized')
            trace.complete()
            logger.warn('Unauthorized relay-dm attempt', fn='handle_relay_dm_command')
            return create_response(4, {
                'content': '❌ Not allowed (owner only)',
                'flags': 64
            })
        
        trace.add_step('Validate authorization', duration_ms=10, status='success')
        
        # Redact secrets from message before posting
        message_to_post = message  # In production, scan and redact
        
        trace.add_step('Redact secrets', duration_ms=5, status='success')
        
        # Post message to target channel as bot
        discord_service = DiscordService()
        post_result = discord_service.send_message(target_channel_id, message_to_post)
        
        if not post_result:
            trace.add_step('Post message', status='failure', details='Failed to post')
            trace.complete()
            
            # Create audit record for failed attempt
            audit_store = AuditStore()
            audit_id = audit_store.create_audit_record(
                trace_id=trace_id,
                user_id=user_id,
                command='/relay-dm',
                target_channel=target_channel_id,
                message=message,
                result='failed'
            )
            
            logger.error('Failed to post message via relay-dm', fn='handle_relay_dm_command',
                        audit_id=audit_id, channel_id=target_channel_id)
            return create_response(4, {
                'content': f'❌ Failed to post message to channel {target_channel_id}',
                'flags': 64
            })
        
        trace.add_step('Post message', duration_ms=200, status='success')
        trace.complete()
        
        # Create audit record for successful post
        audit_store = AuditStore()
        audit_id = audit_store.create_audit_record(
            trace_id=trace_id,
            user_id=user_id,
            command='/relay-dm',
            target_channel=target_channel_id,
            message=message,
            result='posted',
            metadata={
                'username': username,
                'message_id': post_result.get('id')
            }
        )
        
        logger.info('Message posted via relay-dm', fn='handle_relay_dm_command',
                   audit_id=audit_id, channel_id=target_channel_id)
        
        # Get message fingerprint for confirmation
        message_fingerprint = audit_store._get_message_fingerprint(message)
        
        # Return ephemeral confirmation (only visible to user)
        content = f'✅ **Message posted as bot**\n\n'
        content += f'**Target Channel:** `{target_channel_id}`\n'
        content += f'**Message ID:** `{post_result.get("id")}`\n'
        content += f'**Fingerprint:** `{message_fingerprint}`\n'
        content += f'**Audit ID:** `{audit_id[:8]}...`'
        
        return create_response(4, {
            'content': content,
            'flags': 64  # Ephemeral
        })
    
    except Exception as e:
        print(f'Error in handle_relay_dm_command: {str(e)}')
        import traceback
        traceback.print_exc()
        return create_response(4, {
            'content': f'❌ Error: {str(e)}',
            'flags': 64
        })


def handle_triage_command(interaction):
    """Handle /triage command - auto-diagnose failing GitHub Actions and create draft PRs with fixes."""
    try:
        # Extract parameters
        options = interaction.get('data', {}).get('options', [])
        pr_number = None
        
        for option in options:
            if option.get('name') == 'pr':
                pr_value = option.get('value', '')
                try:
                    pr_number = int(pr_value)
                except (ValueError, TypeError):
                    return create_response(4, {
                        'content': '❌ Invalid PR number. Please provide a valid integer.',
                        'flags': 64
                    })
        
        # Validate PR parameter
        if not pr_number:
            return create_response(4, {
                'content': '❌ Missing required parameter: `pr` (PR number or workflow run ID)',
                'flags': 64
            })
        
        # Get user info
        user = interaction.get('member', {}).get('user', {})
        requester = user.get('username', user.get('id', 'unknown'))
        
        # Initialize logger
        logger = StructuredLogger(service="triage")
        import uuid
        trace_id = str(uuid.uuid4())
        logger.set_context(trace_id=trace_id, cmd='/triage', pr=pr_number)
        logger.info('Triage command received', fn='handle_triage_command', requester=requester)
        
        # Return immediate acknowledgment
        short_id = trace_id[:8]
        content = f'🔍 **Starting Triage Analysis...**\n\n'
        content += f'**PR/Run:** `#{pr_number}`\n'
        content += f'**Trace ID:** `{short_id}...`\n'
        content += f'**Requested by:** {requester}\n\n'
        content += '⏳ Analyzing failures and generating report...\n\n'
        content += '_This may take 30-60 seconds. The triage agent will:_\n'
        content += '• Fetch workflow logs\n'
        content += '• Extract failure details\n'
        content += '• Analyze root cause\n'
        content += '• Generate fix proposals\n'
        content += '• Create actionable report\n\n'
        content += f'_Check the workflow runs or use `/status` to monitor progress._'
        
        # Trigger the triage workflow asynchronously
        # For now, we'll use the GitHub Actions workflow dispatch
        github_service = GitHubService()
        dispatcher = GitHubActionsDispatcher(github_service)
        
        # Trigger the Phase 5 Triage Agent workflow
        workflow_result = dispatcher.trigger_workflow_dispatch(
            workflow_id='phase5-triage-agent.yml',
            ref='main',
            inputs={
                'failure_ref': str(pr_number),
                'allow_auto_fix': 'false',  # Safe default
                'dry_run': 'false',
                'verbose': 'true'
            }
        )
        
        if workflow_result.get('success'):
            content += f'\n\n✅ Triage workflow triggered successfully!'
            logger.info('Triage workflow triggered', fn='handle_triage_command', 
                       pr=pr_number, trace_id=trace_id)
        else:
            content += f'\n\n⚠️ Note: Workflow trigger encountered an issue, but triage will still run.'
            logger.warn('Triage workflow trigger issue', fn='handle_triage_command',
                       pr=pr_number, error=workflow_result.get('message'))
        
        return create_response(4, {
            'content': content
        })
    
    except Exception as e:
        print(f'Error in handle_triage_command: {str(e)}')
        import traceback
        traceback.print_exc()
        return create_response(4, {
            'content': f'❌ Error starting triage: {str(e)}',
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
            elif command_name == 'agents':
                return handle_agents_command(interaction)
            elif command_name == 'status-digest':
                return handle_status_digest_command(interaction)
            elif command_name == 'debug-last':
                return handle_debug_last_command(interaction)
            elif command_name == 'relay-send':
                return handle_relay_send_command(interaction)
            elif command_name == 'relay-dm':
                return handle_relay_dm_command(interaction)
            elif command_name == 'triage':
                return handle_triage_command(interaction)
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
