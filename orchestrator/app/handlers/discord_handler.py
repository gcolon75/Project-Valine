"""
Discord slash command handler for Project Valine orchestrator.
Handles /plan, /approve, /status, and /ship commands.
"""
import json
import os
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError


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
    """Handle /status command - check orchestrator status."""
    # TODO: Implement status checking logic
    return create_response(4, {
        'content': '🔍 Checking orchestrator status...\nFetching current runs and their states.',
        'flags': 64
    })


def handle_ship_command(interaction):
    """Handle /ship command - finalize and deploy."""
    # TODO: Implement shipping logic
    return create_response(4, {
        'content': '🚢 Preparing to ship...\nThis will finalize PRs and trigger deployments.',
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
