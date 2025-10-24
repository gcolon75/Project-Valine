"""
Agent Messenger - Unified bot messaging with agent-specific personalities.

This module enables the Rin bot to represent multiple agent personalities
through custom embeds, icons, and message formatting while using a single
Discord bot token.

Agents:
- Amadeus: Deployment specialist (rocket emoji, blue theme)
- BuildAgent: Build system monitor (hammer emoji, orange theme)
- TriageAgent: Issue diagnostics (wrench emoji, yellow theme)
- VerifyAgent: Deployment verification (checkmark emoji, green theme)
"""


class AgentPersonality:
    """Represents an agent's visual identity and messaging style."""
    
    def __init__(self, name, emoji, color, description):
        """
        Initialize agent personality.
        
        Args:
            name: Agent name (e.g., "Amadeus", "BuildAgent")
            emoji: Unicode emoji or emoji code
            color: Discord embed color (integer)
            description: Short agent description
        """
        self.name = name
        self.emoji = emoji
        self.color = color
        self.description = description
    
    def format_message(self, content, as_embed=False):
        """
        Format a message with agent personality.
        
        Args:
            content: Message content
            as_embed: If True, returns embed format; otherwise plain text
        
        Returns:
            Formatted message string or embed dict
        """
        if as_embed:
            return {
                'title': f'{self.emoji} {self.name}',
                'description': content,
                'color': self.color,
                'footer': {
                    'text': f'{self.name} • Powered by Rin'
                }
            }
        else:
            return f'{self.emoji} **{self.name}:** {content}'


# Agent Personalities
AMADEUS = AgentPersonality(
    name='Amadeus',
    emoji='🚀',
    color=0x3498db,  # Blue
    description='Deployment Specialist'
)

BUILD_AGENT = AgentPersonality(
    name='BuildAgent',
    emoji='🏗️',
    color=0xe67e22,  # Orange
    description='Build System Monitor'
)

TRIAGE_AGENT = AgentPersonality(
    name='TriageAgent',
    emoji='🔧',
    color=0xf39c12,  # Yellow/Gold
    description='Issue Diagnostics Specialist'
)

VERIFY_AGENT = AgentPersonality(
    name='VerifyAgent',
    emoji='✅',
    color=0x2ecc71,  # Green
    description='Deployment Verification'
)

DIAGNOSE_AGENT = AgentPersonality(
    name='DiagnoseAgent',
    emoji='🔍',
    color=0x9b59b6,  # Purple
    description='Infrastructure Diagnostics'
)

STATUS_AGENT = AgentPersonality(
    name='StatusAgent',
    emoji='📊',
    color=0x95a5a6,  # Gray
    description='Workflow Status Reporter'
)

RIN = AgentPersonality(
    name='Rin',
    emoji='🎮',
    color=0xe91e63,  # Pink/Magenta
    description='Orchestrator Core'
)


class AgentMessenger:
    """
    Unified messenger for the Rin bot with agent personality support.
    
    All agents use the same Discord bot token (DISCORD_BOT_TOKEN) but can
    display different personalities through embeds and formatting.
    """
    
    def __init__(self, discord_service):
        """
        Initialize agent messenger.
        
        Args:
            discord_service: DiscordService instance
        """
        self.discord = discord_service
        self.agents = {
            'amadeus': AMADEUS,
            'build': BUILD_AGENT,
            'triage': TRIAGE_AGENT,
            'verify': VERIFY_AGENT,
            'diagnose': DIAGNOSE_AGENT,
            'status': STATUS_AGENT,
            'rin': RIN
        }
    
    def send_as_agent(self, channel_id, content, agent='rin', as_embed=True, extra_embeds=None):
        """
        Send a message with agent personality.
        
        Args:
            channel_id: Discord channel ID
            content: Message content
            agent: Agent key ('amadeus', 'build', 'triage', 'verify', 'diagnose', 'status', 'rin')
            as_embed: If True, format as embed; otherwise plain text
            extra_embeds: Additional embeds to include
        
        Returns:
            Discord API response
        """
        personality = self.agents.get(agent, RIN)
        
        if as_embed:
            embed = personality.format_message(content, as_embed=True)
            embeds = [embed]
            if extra_embeds:
                embeds.extend(extra_embeds)
            return self.discord.send_message(channel_id, '', embeds=embeds)
        else:
            formatted_content = personality.format_message(content, as_embed=False)
            embeds = extra_embeds if extra_embeds else None
            return self.discord.send_message(channel_id, formatted_content, embeds=embeds)
    
    def create_status_embed(self, agent, title, fields, status='info'):
        """
        Create a status embed with agent branding.
        
        Args:
            agent: Agent key
            title: Embed title
            fields: List of field dicts with 'name', 'value', 'inline' keys
            status: Status type ('success', 'error', 'warning', 'info')
        
        Returns:
            Embed dict
        """
        personality = self.agents.get(agent, RIN)
        
        # Status-specific colors
        status_colors = {
            'success': 0x2ecc71,  # Green
            'error': 0xe74c3c,    # Red
            'warning': 0xf39c12,  # Yellow
            'info': personality.color
        }
        
        color = status_colors.get(status, personality.color)
        
        return {
            'title': f'{personality.emoji} {title}',
            'color': color,
            'fields': fields,
            'footer': {
                'text': f'{personality.name} • Powered by Rin'
            }
        }
    
    def get_agent_header(self, agent):
        """
        Get formatted agent header for plain text messages.
        
        Args:
            agent: Agent key
        
        Returns:
            Formatted header string
        """
        personality = self.agents.get(agent, RIN)
        return f'{personality.emoji} **{personality.name}**'


def get_agent_messenger(discord_service):
    """
    Factory function to create AgentMessenger instance.
    
    Args:
        discord_service: DiscordService instance
    
    Returns:
        AgentMessenger instance
    """
    return AgentMessenger(discord_service)
