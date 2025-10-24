"""
Test suite for Agent Messenger functionality.

Tests the unified bot architecture where different agent personalities
use custom embeds and formatting while sharing a single Discord bot token.
"""
import sys
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'app'))

import pytest
from unittest.mock import Mock, MagicMock
from utils.agent_messenger import (
    AgentPersonality, 
    AgentMessenger, 
    get_agent_messenger,
    AMADEUS, 
    BUILD_AGENT, 
    STATUS_AGENT,
    VERIFY_AGENT,
    RIN
)


class TestAgentPersonality:
    """Test AgentPersonality class."""
    
    def test_initialization(self):
        """Test personality initialization."""
        agent = AgentPersonality(
            name='TestAgent',
            emoji='🧪',
            color=0x123456,
            description='Test agent'
        )
        
        assert agent.name == 'TestAgent'
        assert agent.emoji == '🧪'
        assert agent.color == 0x123456
        assert agent.description == 'Test agent'
    
    def test_format_message_plain_text(self):
        """Test plain text message formatting."""
        agent = AgentPersonality(
            name='TestAgent',
            emoji='🧪',
            color=0x123456,
            description='Test agent'
        )
        
        result = agent.format_message('Hello world', as_embed=False)
        assert result == '🧪 **TestAgent:** Hello world'
    
    def test_format_message_embed(self):
        """Test embed message formatting."""
        agent = AgentPersonality(
            name='TestAgent',
            emoji='🧪',
            color=0x123456,
            description='Test agent'
        )
        
        result = agent.format_message('Hello world', as_embed=True)
        
        assert isinstance(result, dict)
        assert result['title'] == '🧪 TestAgent'
        assert result['description'] == 'Hello world'
        assert result['color'] == 0x123456
        assert result['footer']['text'] == 'TestAgent • Powered by Rin'


class TestPredefinedAgents:
    """Test predefined agent personalities."""
    
    def test_amadeus_properties(self):
        """Test Amadeus agent properties."""
        assert AMADEUS.name == 'Amadeus'
        assert AMADEUS.emoji == '🚀'
        assert AMADEUS.color == 0x3498db  # Blue
        assert AMADEUS.description == 'Deployment Specialist'
    
    def test_build_agent_properties(self):
        """Test BuildAgent properties."""
        assert BUILD_AGENT.name == 'BuildAgent'
        assert BUILD_AGENT.emoji == '🏗️'
        assert BUILD_AGENT.color == 0xe67e22  # Orange
        assert BUILD_AGENT.description == 'Build System Monitor'
    
    def test_status_agent_properties(self):
        """Test StatusAgent properties."""
        assert STATUS_AGENT.name == 'StatusAgent'
        assert STATUS_AGENT.emoji == '📊'
        assert STATUS_AGENT.color == 0x95a5a6  # Gray
        assert STATUS_AGENT.description == 'Workflow Status Reporter'
    
    def test_verify_agent_properties(self):
        """Test VerifyAgent properties."""
        assert VERIFY_AGENT.name == 'VerifyAgent'
        assert VERIFY_AGENT.emoji == '✅'
        assert VERIFY_AGENT.color == 0x2ecc71  # Green
    
    def test_rin_properties(self):
        """Test Rin core agent properties."""
        assert RIN.name == 'Rin'
        assert RIN.emoji == '🎮'
        assert RIN.color == 0xe91e63  # Pink
        assert RIN.description == 'Orchestrator Core'


class TestAgentMessenger:
    """Test AgentMessenger class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.mock_discord = Mock()
        self.messenger = AgentMessenger(self.mock_discord)
    
    def test_initialization(self):
        """Test messenger initialization."""
        assert self.messenger.discord == self.mock_discord
        assert 'amadeus' in self.messenger.agents
        assert 'build' in self.messenger.agents
        assert 'status' in self.messenger.agents
        assert 'rin' in self.messenger.agents
    
    def test_send_as_agent_plain_text(self):
        """Test sending message as agent (plain text)."""
        self.mock_discord.send_message = Mock(return_value={'id': '123'})
        
        result = self.messenger.send_as_agent(
            channel_id='999',
            content='Deploy started',
            agent='amadeus',
            as_embed=False
        )
        
        # Verify Discord service was called
        self.mock_discord.send_message.assert_called_once()
        call_args = self.mock_discord.send_message.call_args
        
        # Check channel ID
        assert call_args[0][0] == '999'
        
        # Check formatted content
        assert '🚀' in call_args[0][1]
        assert 'Amadeus' in call_args[0][1]
        assert 'Deploy started' in call_args[0][1]
    
    def test_send_as_agent_embed(self):
        """Test sending message as agent (embed)."""
        self.mock_discord.send_message = Mock(return_value={'id': '123'})
        
        result = self.messenger.send_as_agent(
            channel_id='999',
            content='Deploy started',
            agent='amadeus',
            as_embed=True
        )
        
        # Verify Discord service was called
        self.mock_discord.send_message.assert_called_once()
        call_args = self.mock_discord.send_message.call_args
        
        # Check channel ID
        assert call_args[0][0] == '999'
        
        # Check embed structure
        embeds = call_args[1]['embeds']
        assert len(embeds) == 1
        assert embeds[0]['title'] == '🚀 Amadeus'
        assert embeds[0]['description'] == 'Deploy started'
        assert embeds[0]['color'] == 0x3498db
    
    def test_send_as_agent_with_extra_embeds(self):
        """Test sending message with additional embeds."""
        self.mock_discord.send_message = Mock(return_value={'id': '123'})
        
        extra_embed = {'title': 'Extra Info', 'description': 'Details'}
        
        result = self.messenger.send_as_agent(
            channel_id='999',
            content='Deploy started',
            agent='amadeus',
            as_embed=True,
            extra_embeds=[extra_embed]
        )
        
        # Verify multiple embeds sent
        call_args = self.mock_discord.send_message.call_args
        embeds = call_args[1]['embeds']
        assert len(embeds) == 2
        assert embeds[1] == extra_embed
    
    def test_send_as_unknown_agent_defaults_to_rin(self):
        """Test that unknown agent key defaults to Rin."""
        self.mock_discord.send_message = Mock(return_value={'id': '123'})
        
        result = self.messenger.send_as_agent(
            channel_id='999',
            content='Test message',
            agent='unknown_agent',
            as_embed=False
        )
        
        # Should use Rin as fallback
        call_args = self.mock_discord.send_message.call_args
        assert '🎮' in call_args[0][1]  # Rin's emoji
        assert 'Rin' in call_args[0][1]
    
    def test_create_status_embed_success(self):
        """Test creating success status embed."""
        fields = [
            {'name': 'Status', 'value': 'OK', 'inline': True}
        ]
        
        embed = self.messenger.create_status_embed(
            agent='amadeus',
            title='Deploy Status',
            fields=fields,
            status='success'
        )
        
        assert embed['title'] == '🚀 Deploy Status'
        assert embed['color'] == 0x2ecc71  # Green for success
        assert embed['fields'] == fields
        assert 'Amadeus' in embed['footer']['text']
    
    def test_create_status_embed_error(self):
        """Test creating error status embed."""
        fields = [
            {'name': 'Error', 'value': 'Failed', 'inline': True}
        ]
        
        embed = self.messenger.create_status_embed(
            agent='amadeus',
            title='Deploy Error',
            fields=fields,
            status='error'
        )
        
        assert embed['color'] == 0xe74c3c  # Red for error
    
    def test_create_status_embed_warning(self):
        """Test creating warning status embed."""
        embed = self.messenger.create_status_embed(
            agent='build',
            title='Build Warning',
            fields=[],
            status='warning'
        )
        
        assert embed['color'] == 0xf39c12  # Yellow for warning
    
    def test_create_status_embed_info(self):
        """Test creating info status embed uses agent color."""
        embed = self.messenger.create_status_embed(
            agent='amadeus',
            title='Deploy Info',
            fields=[],
            status='info'
        )
        
        assert embed['color'] == AMADEUS.color
    
    def test_get_agent_header(self):
        """Test getting agent header for plain text."""
        header = self.messenger.get_agent_header('amadeus')
        assert header == '🚀 **Amadeus**'
        
        header = self.messenger.get_agent_header('build')
        assert header == '🏗️ **BuildAgent**'
        
        header = self.messenger.get_agent_header('status')
        assert header == '📊 **StatusAgent**'


class TestFactoryFunction:
    """Test factory function."""
    
    def test_get_agent_messenger(self):
        """Test factory function creates messenger."""
        mock_discord = Mock()
        messenger = get_agent_messenger(mock_discord)
        
        assert isinstance(messenger, AgentMessenger)
        assert messenger.discord == mock_discord


class TestIntegration:
    """Integration tests for agent messaging."""
    
    def test_multiple_agents_use_same_service(self):
        """Test that all agents use the same Discord service (unified bot)."""
        mock_discord = Mock()
        mock_discord.send_message = Mock(return_value={'id': '123'})
        
        messenger = AgentMessenger(mock_discord)
        
        # Send messages as different agents
        messenger.send_as_agent('999', 'Deploy', agent='amadeus', as_embed=False)
        messenger.send_as_agent('999', 'Build', agent='build', as_embed=False)
        messenger.send_as_agent('999', 'Status', agent='status', as_embed=False)
        
        # All should use the same Discord service
        assert mock_discord.send_message.call_count == 3
        
        # All calls should be to the same mock (same bot token)
        for call in mock_discord.send_message.call_args_list:
            assert call[0][0] == '999'  # Same channel
