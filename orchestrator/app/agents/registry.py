"""
Agent registry for Project Valine orchestrator.
Defines available agents and their capabilities for multi-agent orchestration.
"""
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class AgentInfo:
    """Information about an orchestrator agent."""
    id: str
    name: str
    description: str
    command: str


def get_agents() -> List[AgentInfo]:
    """
    Get list of available agents in the orchestrator.
    
    Returns:
        List of AgentInfo objects describing available agents
    """
    return [
        AgentInfo(
            id='plan',
            name='Daily Plan Agent',
            description='Creates a daily plan proposal by reading open GitHub issues with the ready label.',
            command='/plan'
        ),
        AgentInfo(
            id='approve',
            name='Plan Approval Agent',
            description='Approves a plan and begins execution.',
            command='/approve'
        ),
        AgentInfo(
            id='status_reporter',
            name='Status Reporter',
            description='Reports recent workflow run status (last 1-3 runs) for Client Deploy and Diagnose workflows.',
            command='/status'
        ),
        AgentInfo(
            id='ship',
            name='Ship Agent',
            description='Triggers deployment workflow.',
            command='/ship'
        ),
        AgentInfo(
            id='deploy_verifier',
            name='Deploy Verifier',
            description='Verifies deployment health by checking GitHub Actions workflows, frontend endpoints, and API health.',
            command='/verify-latest'
        ),
        AgentInfo(
            id='verify_run',
            name='Run Verifier',
            description='Verifies a specific workflow run by ID.',
            command='/verify-run'
        ),
        AgentInfo(
            id='diagnose_runner',
            name='Diagnose Runner',
            description='Runs comprehensive infrastructure diagnostics including AWS credentials, S3, CloudFront, and API endpoints.',
            command='/diagnose'
        ),
        AgentInfo(
            id='deploy_client',
            name='Client Deploy',
            description='Triggers Client Deploy workflow with optional API base override and completion tracking.',
            command='/deploy-client'
        ),
        AgentInfo(
            id='set_frontend',
            name='Frontend URL Setter',
            description='Sets the frontend base URL for the environment.',
            command='/set-frontend'
        ),
        AgentInfo(
            id='set_api_base',
            name='API Base Setter',
            description='Sets the API base URL for the environment.',
            command='/set-api-base'
        ),
        AgentInfo(
            id='agents',
            name='Agents List',
            description='Lists all available orchestrator agents and their capabilities.',
            command='/agents'
        ),
        AgentInfo(
            id='status_digest',
            name='Status Digest',
            description='Provides a comprehensive status digest with metrics and health information.',
            command='/status-digest'
        ),
        AgentInfo(
            id='debug_last',
            name='Debug Last Run',
            description='Debugs the last workflow run with detailed diagnostics.',
            command='/debug-last'
        ),
        AgentInfo(
            id='relay_send',
            name='Relay Send',
            description='Sends a message through the relay system.',
            command='/relay-send'
        ),
        AgentInfo(
            id='relay_dm',
            name='Relay DM',
            description='Sends a direct message through the relay system.',
            command='/relay-dm'
        ),
        AgentInfo(
            id='phase5_triage',
            name='Phase 5 Triage Agent',
            description='Triages failing Phase 5 jobs/PR runs (CI, agent runs, or registration scripts). Produces actionable triage report with root cause, failing test/log excerpts, and minimal fix proposals.',
            command='/triage'
        ),
        AgentInfo(
            id='triage_all',
            name='Triage All Agent',
            description='Triages all failing workflow runs across the repository.',
            command='/triage-all'
        ),
        AgentInfo(
            id='ux_update',
            name='UX Update Agent',
            description='Handles UX-related updates and improvements.',
            command='/ux-update'
        ),
        AgentInfo(
            id='summary_agent',
            name='Summary Agent',
            description='Generates and updates project summaries with latest status, recent changes, and next steps in a Gen Z/gamer-themed style. Updates PROJECT_VALINE_SUMMARY.md at the top with emojis and bullet points.',
            command='/update-summary'
        ),
        AgentInfo(
            id='uptime_guardian',
            name='Uptime Guardian',
            description='Monitors Discord bot and critical services for 24/7 uptime. Detects downtime instantly, provides health checks with response times, and alerts the squad if services go offline. Auto-recovery capabilities coming soon!',
            command='/uptime-check'
        )
    ]


def get_agent_by_id(agent_id: str) -> Optional[AgentInfo]:
    """
    Get agent information by ID.
    
    Args:
        agent_id: Agent identifier
        
    Returns:
        AgentInfo object or None if not found
    """
    agents = get_agents()
    for agent in agents:
        if agent.id == agent_id:
            return agent
    return None
