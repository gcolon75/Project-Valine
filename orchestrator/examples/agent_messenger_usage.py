"""
Example usage of AgentMessenger for unified bot architecture.

This file demonstrates how to use different agent personalities
while maintaining a single Discord bot token (Rin).
"""
from services.discord import DiscordService
from utils.agent_messenger import get_agent_messenger


# Example 1: Send deployment notification as Amadeus
def send_deployment_notification(channel_id, deployment_info):
    """Send a deployment notification with Amadeus personality."""
    discord = DiscordService()
    messenger = get_agent_messenger(discord)
    
    content = f"Client deployment initiated!\n\n"
    content += f"**Correlation ID:** `{deployment_info['correlation_id'][:8]}...`\n"
    content += f"**Environment:** {deployment_info['environment']}\n"
    content += f"**Requested by:** {deployment_info['requester']}"
    
    # Send as Amadeus with embed
    return messenger.send_as_agent(
        channel_id=channel_id,
        content=content,
        agent='amadeus',
        as_embed=True
    )


# Example 2: Send build status as BuildAgent
def send_build_status(channel_id, build_result):
    """Send a build status update with BuildAgent personality."""
    discord = DiscordService()
    messenger = get_agent_messenger(discord)
    
    status_emoji = '✅' if build_result['success'] else '❌'
    status_text = 'Success' if build_result['success'] else 'Failed'
    
    content = f"Build completed!\n\n"
    content += f"**Status:** {status_emoji} {status_text}\n"
    content += f"**Duration:** {build_result['duration']}\n"
    content += f"**Branch:** {build_result['branch']}\n"
    content += f"**Commit:** {build_result['commit'][:7]}"
    
    # Send as BuildAgent
    return messenger.send_as_agent(
        channel_id=channel_id,
        content=content,
        agent='build',
        as_embed=True
    )


# Example 3: Send verification results as VerifyAgent with status embed
def send_verification_results(channel_id, verification_results):
    """Send verification results with VerifyAgent personality."""
    discord = DiscordService()
    messenger = get_agent_messenger(discord)
    
    # Create status embed
    fields = []
    for check_name, check_result in verification_results.items():
        status = '✅' if check_result['passed'] else '❌'
        fields.append({
            'name': check_name,
            'value': f"{status} {check_result['message']}",
            'inline': False
        })
    
    status = 'success' if all(r['passed'] for r in verification_results.values()) else 'error'
    embed = messenger.create_status_embed(
        agent='verify',
        title='Deployment Verification Results',
        fields=fields,
        status=status
    )
    
    # Send with custom embed directly via Discord service
    return discord.send_message(
        channel_id=channel_id, 
        content=f'{messenger.get_agent_header("verify")} Verification complete',
        embeds=[embed]
    )


# Example 4: Send plain text message as DiagnoseAgent
def send_diagnose_update(channel_id, progress_message):
    """Send a quick diagnose progress update (plain text)."""
    discord = DiscordService()
    messenger = get_agent_messenger(discord)
    
    # Send as plain text for quick updates
    return messenger.send_as_agent(
        channel_id=channel_id,
        content=progress_message,
        agent='diagnose',
        as_embed=False  # Plain text for quick updates
    )


# Example 5: Send triage analysis as TriageAgent with detailed embed
def send_triage_analysis(channel_id, pr_number, analysis):
    """Send triage analysis with TriageAgent personality."""
    discord = DiscordService()
    messenger = get_agent_messenger(discord)
    
    # Main content
    content = f"Triage analysis complete for PR #{pr_number}"
    
    # Create detailed analysis embed
    analysis_fields = [
        {
            'name': '🔍 Root Cause',
            'value': analysis['root_cause'],
            'inline': False
        },
        {
            'name': '💡 Proposed Fix',
            'value': analysis['proposed_fix'],
            'inline': False
        },
        {
            'name': '⚠️ Impact',
            'value': analysis['impact'],
            'inline': True
        },
        {
            'name': '🎯 Confidence',
            'value': analysis['confidence'],
            'inline': True
        }
    ]
    
    status = 'success' if analysis['auto_fixable'] else 'warning'
    analysis_embed = messenger.create_status_embed(
        agent='triage',
        title=f"Analysis Results for PR #{pr_number}",
        fields=analysis_fields,
        status=status
    )
    
    # Add footer with action items
    analysis_embed['footer']['text'] = f"{analysis_embed['footer']['text']} • Use /deploy-client to test fix"
    
    # Send message with embed using the same discord service
    return discord.send_message(
        channel_id=channel_id,
        content=f"{messenger.get_agent_header('triage')} {content}",
        embeds=[analysis_embed]
    )


# Example 6: Send multi-part workflow update with different agents
def send_workflow_update(channel_id, workflow_status):
    """Send workflow update showing multiple agents working together."""
    discord = DiscordService()
    messenger = get_agent_messenger(discord)
    
    # StatusAgent header
    content = f"{messenger.get_agent_header('status')} Workflow Pipeline Update\n\n"
    
    # Add updates from different agents
    if workflow_status['build_complete']:
        content += f"{messenger.get_agent_header('build')} Build completed successfully\n"
    
    if workflow_status['deploy_in_progress']:
        content += f"{messenger.get_agent_header('amadeus')} Deployment in progress...\n"
    
    if workflow_status['verification_pending']:
        content += f"{messenger.get_agent_header('verify')} Verification queued\n"
    
    # Send as plain text with multiple agent headers
    return discord.send_message(channel_id, content)


# Example 7: Error handling with fallback to Rin
def send_generic_message(channel_id, message):
    """Send a generic message with Rin personality (fallback)."""
    discord = DiscordService()
    messenger = get_agent_messenger(discord)
    
    # When no specific agent matches, defaults to Rin
    return messenger.send_as_agent(
        channel_id=channel_id,
        content=message,
        agent='rin',  # Or use any unknown agent key - will default to Rin
        as_embed=False
    )


# Example 8: Webhook/event handler using agent personalities
def handle_github_webhook_event(event_type, payload):
    """Route GitHub webhook events to appropriate agents."""
    discord = DiscordService()
    messenger = get_agent_messenger(discord)
    channel_id = '1234567890'  # Your notification channel
    
    if event_type == 'deployment':
        agent = 'amadeus'
        content = f"Deployment {payload['status']}: {payload['environment']}"
    elif event_type == 'check_suite':
        agent = 'build'
        content = f"Build {payload['conclusion']}: {payload['head_branch']}"
    elif event_type == 'pull_request':
        agent = 'status'
        content = f"PR #{payload['number']}: {payload['action']}"
    else:
        agent = 'rin'
        content = f"Event: {event_type}"
    
    return messenger.send_as_agent(
        channel_id=channel_id,
        content=content,
        agent=agent,
        as_embed=True
    )


# Example 9: Batch notifications with consistent styling
def send_daily_report(channel_id, report_data):
    """Send daily report with multiple agent updates."""
    discord = DiscordService()
    messenger = get_agent_messenger(discord)
    
    # StatusAgent creates the report embed
    fields = []
    
    # Amadeus - Deployment stats
    fields.append({
        'name': f'{messenger.get_agent_header("amadeus")} Deployments',
        'value': f"{report_data['deployments']} successful today",
        'inline': True
    })
    
    # BuildAgent - Build stats
    fields.append({
        'name': f'{messenger.get_agent_header("build")} Builds',
        'value': f"{report_data['builds']} builds completed",
        'inline': True
    })
    
    # TriageAgent - Issue stats
    fields.append({
        'name': f'{messenger.get_agent_header("triage")} Triage',
        'value': f"{report_data['triaged']} issues analyzed",
        'inline': True
    })
    
    embed = messenger.create_status_embed(
        agent='status',
        title='📊 Daily Activity Report',
        fields=fields,
        status='info'
    )
    
    return discord.send_message(channel_id, '', embeds=[embed])


if __name__ == '__main__':
    # Example usage (commented out - requires actual Discord bot setup)
    
    # Example deployment notification
    # send_deployment_notification('123456789', {
    #     'correlation_id': 'abc123def456',
    #     'environment': 'production',
    #     'requester': 'developer123'
    # })
    
    # Example build status
    # send_build_status('123456789', {
    #     'success': True,
    #     'duration': '3m 45s',
    #     'branch': 'main',
    #     'commit': 'abc1234567890'
    # })
    
    print("Agent Messenger examples loaded!")
    print("All examples use the same DISCORD_BOT_TOKEN via DiscordService")
    print("Different agents are just messaging styles, not separate bots!")
