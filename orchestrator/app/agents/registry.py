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
            id='deploy_verifier',
            name='Deploy Verifier',
            description='Verifies deployment health by checking GitHub Actions workflows, frontend endpoints, and API health.',
            command='/verify-latest'
        ),
        AgentInfo(
            id='diagnose_runner',
            name='Diagnose Runner',
            description='Runs comprehensive infrastructure diagnostics including AWS credentials, S3, CloudFront, and API endpoints.',
            command='/diagnose'
        ),
        AgentInfo(
            id='status_reporter',
            name='Status Reporter',
            description='Reports recent workflow run status for Client Deploy and Diagnose workflows.',
            command='/status'
        ),
        AgentInfo(
            id='deploy_client',
            name='Client Deploy',
            description='Triggers Client Deploy workflow with optional API base override and completion tracking.',
            command='/deploy-client'
        ),
        AgentInfo(
            id='discord_slash_cmd',
            name='Discord Slash Command Agent',
            description='Registers and validates Discord slash commands for staging. Ensures commands are visible, provides remediation playbook, and verifies handler health.',
            command='/register-slash-commands'
        ),
        AgentInfo(
            id='phase5_triage',
            name='Phase 5 Triage Agent',
            description='Triages failing Phase 5 jobs/PR runs (CI, agent runs, or registration scripts). Produces actionable triage report with root cause, failing test/log excerpts, and minimal fix proposals.',
            command='/triage'
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
