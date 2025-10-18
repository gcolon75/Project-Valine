"""
Tests for Discord Slash Command Registration Agent.

These tests verify the functionality of the Discord Slash Command Agent
for staging environments, including preflight checks, command comparison,
registration, and deliverable generation.
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
import json
import tempfile
import shutil
from pathlib import Path
from datetime import datetime, timezone

from app.agents.discord_slash_cmd_agent import DiscordSlashCommandAgent


class TestDiscordSlashCommandAgent(unittest.TestCase):
    """Test cases for DiscordSlashCommandAgent."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Create temporary evidence directory
        self.temp_dir = tempfile.mkdtemp()
        
        # Test credentials
        self.app_id = "123456789012345678"
        self.bot_token = "test_token_1234567890abcdef"
        self.guild_id = "987654321098765432"
        
        # Create agent
        self.agent = DiscordSlashCommandAgent(
            app_id=self.app_id,
            bot_token=self.bot_token,
            guild_id=self.guild_id,
            evidence_dir=self.temp_dir
        )
    
    def tearDown(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.temp_dir)
    
    def test_initialization(self):
        """Test agent initialization."""
        self.assertEqual(self.agent.app_id, self.app_id)
        self.assertEqual(self.agent.bot_token, self.bot_token)
        self.assertEqual(self.agent.guild_id, self.guild_id)
        self.assertIsNotNone(self.agent.expected_commands)
        self.assertTrue(Path(self.temp_dir).exists())
    
    def test_token_redaction(self):
        """Test token redaction shows only last 4 characters."""
        token = "1234567890abcdef"
        redacted = DiscordSlashCommandAgent._redact_token(token)
        self.assertEqual(redacted, "***cdef")
        
        # Short tokens
        short = "123"
        self.assertEqual(DiscordSlashCommandAgent._redact_token(short), "****")
        
        # Empty token
        self.assertEqual(DiscordSlashCommandAgent._redact_token(""), "****")
    
    def test_generate_invite_url(self):
        """Test bot invite URL generation."""
        invite_url = self.agent._generate_invite_url()
        
        self.assertIn(self.app_id, invite_url)
        self.assertIn("bot%20applications.commands", invite_url)
        self.assertIn("oauth2/authorize", invite_url)
        self.assertIn("permissions=0", invite_url)
    
    @patch('app.agents.discord_slash_cmd_agent.requests.get')
    def test_preflight_validate_bot_success(self, mock_get):
        """Test successful bot validation."""
        # Mock successful response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "id": "123456789",
            "username": "TestBot",
            "bot": True
        }
        mock_get.return_value = mock_response
        
        result = self.agent.preflight_validate_bot()
        
        self.assertTrue(result)
        self.assertIsNotNone(self.agent.bot_info)
        self.assertEqual(self.agent.bot_info["username"], "TestBot")
    
    @patch('app.agents.discord_slash_cmd_agent.requests.get')
    def test_preflight_validate_bot_failure(self, mock_get):
        """Test bot validation failure."""
        # Mock failed response
        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.text = "Unauthorized"
        mock_get.return_value = mock_response
        
        result = self.agent.preflight_validate_bot()
        
        self.assertFalse(result)
        self.assertIsNone(self.agent.bot_info)
    
    @patch('app.agents.discord_slash_cmd_agent.requests.get')
    def test_verify_guild_membership_success(self, mock_get):
        """Test successful guild membership verification."""
        # Mock guilds response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"id": self.guild_id, "name": "Test Guild"}
        ]
        mock_get.return_value = mock_response
        
        result = self.agent._verify_guild_membership()
        
        self.assertTrue(result)
        self.assertEqual(self.agent.guild_info["name"], "Test Guild")
    
    @patch('app.agents.discord_slash_cmd_agent.requests.get')
    def test_verify_guild_membership_not_member(self, mock_get):
        """Test guild membership verification when bot is not a member."""
        # Mock guilds response with different guild
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"id": "different_guild_id", "name": "Other Guild"}
        ]
        mock_get.return_value = mock_response
        
        result = self.agent._verify_guild_membership()
        
        self.assertFalse(result)
    
    @patch('app.agents.discord_slash_cmd_agent.requests.get')
    def test_preflight_discover_guild_single(self, mock_get):
        """Test guild discovery with single guild."""
        # Remove guild_id to trigger discovery
        self.agent.guild_id = None
        
        # Mock guilds response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"id": "guild_123", "name": "Single Guild"}
        ]
        mock_get.return_value = mock_response
        
        result = self.agent.preflight_discover_guild()
        
        self.assertTrue(result)
        self.assertEqual(self.agent.guild_id, "guild_123")
        self.assertEqual(self.agent.guild_info["name"], "Single Guild")
    
    @patch('app.agents.discord_slash_cmd_agent.requests.get')
    def test_preflight_discover_guild_multiple(self, mock_get):
        """Test guild discovery with multiple guilds (requires user input)."""
        # Remove guild_id to trigger discovery
        self.agent.guild_id = None
        
        # Mock guilds response with multiple guilds
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"id": "guild_1", "name": "Guild One"},
            {"id": "guild_2", "name": "Guild Two"}
        ]
        mock_get.return_value = mock_response
        
        result = self.agent.preflight_discover_guild()
        
        # Should fail and require user input
        self.assertFalse(result)
        self.assertIsNone(self.agent.guild_id)
    
    @patch('app.agents.discord_slash_cmd_agent.requests.get')
    def test_list_existing_commands_success(self, mock_get):
        """Test listing existing commands."""
        # Mock commands response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"id": "cmd1", "name": "debug-last", "description": "Debug info"},
            {"id": "cmd2", "name": "status", "description": "Status"}
        ]
        mock_get.return_value = mock_response
        
        commands = self.agent.list_existing_commands()
        
        self.assertIsNotNone(commands)
        self.assertEqual(len(commands), 2)
        self.assertEqual(commands[0]["name"], "debug-last")
    
    @patch('app.agents.discord_slash_cmd_agent.requests.get')
    def test_list_existing_commands_empty(self, mock_get):
        """Test listing commands when none exist."""
        # Mock empty commands response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = []
        mock_get.return_value = mock_response
        
        commands = self.agent.list_existing_commands()
        
        self.assertIsNotNone(commands)
        self.assertEqual(len(commands), 0)
    
    def test_compare_commands_all_match(self):
        """Test command comparison when all commands match."""
        existing = [
            {"name": "debug-last", "description": "Show last run debug info (redacted, ephemeral)"},
            {"name": "diagnose", "description": "Run a quick staging diagnostic"},
            {"name": "status", "description": "Show last 1-3 runs for workflows"},
            {"name": "triage", "description": "Auto-diagnose and fix failed PR/workflow runs"}
        ]
        expected = self.agent.expected_commands
        
        comparison = self.agent.compare_commands(existing, expected)
        
        self.assertEqual(len(comparison["missing"]), 0)
        self.assertEqual(len(comparison["extra"]), 0)
        self.assertEqual(len(comparison["outdated"]), 0)
    
    def test_compare_commands_missing(self):
        """Test command comparison with missing commands."""
        existing = [
            {"name": "debug-last", "description": "Show last run debug info (redacted, ephemeral)"}
        ]
        expected = self.agent.expected_commands
        
        comparison = self.agent.compare_commands(existing, expected)
        
        self.assertGreater(len(comparison["missing"]), 0)
        self.assertIn("diagnose", comparison["missing"])
        self.assertIn("status", comparison["missing"])
        self.assertIn("triage", comparison["missing"])
    
    def test_compare_commands_extra(self):
        """Test command comparison with extra commands."""
        existing = [
            {"name": "debug-last", "description": "Show last run debug info (redacted, ephemeral)"},
            {"name": "diagnose", "description": "Run a quick staging diagnostic"},
            {"name": "status", "description": "Show last 1-3 runs for workflows"},
            {"name": "triage", "description": "Auto-diagnose and fix failed PR/workflow runs"},
            {"name": "extra-cmd", "description": "Extra command"}
        ]
        expected = self.agent.expected_commands
        
        comparison = self.agent.compare_commands(existing, expected)
        
        self.assertEqual(len(comparison["extra"]), 1)
        self.assertIn("extra-cmd", comparison["extra"])
    
    def test_compare_commands_outdated(self):
        """Test command comparison with outdated descriptions."""
        existing = [
            {"name": "debug-last", "description": "Old description"},
            {"name": "diagnose", "description": "Run a quick staging diagnostic"},
            {"name": "status", "description": "Show last 1-3 runs for workflows"}
        ]
        expected = self.agent.expected_commands
        
        comparison = self.agent.compare_commands(existing, expected)
        
        self.assertEqual(len(comparison["outdated"]), 1)
        self.assertIn("debug-last", comparison["outdated"])
    
    @patch('app.agents.discord_slash_cmd_agent.requests.put')
    @patch('app.agents.discord_slash_cmd_agent.time.sleep')
    def test_register_commands_success(self, mock_sleep, mock_put):
        """Test successful command registration."""
        # Mock successful PUT response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.agent.expected_commands
        mock_put.return_value = mock_response
        
        success_count, failed = self.agent.register_commands(self.agent.expected_commands)
        
        self.assertEqual(success_count, len(self.agent.expected_commands))
        self.assertEqual(len(failed), 0)
        mock_sleep.assert_called_once()  # Verify propagation wait
    
    @patch('app.agents.discord_slash_cmd_agent.requests.put')
    def test_register_commands_failure(self, mock_put):
        """Test command registration failure."""
        # Mock failed PUT response
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"
        mock_put.return_value = mock_response
        
        success_count, failed = self.agent.register_commands(self.agent.expected_commands)
        
        self.assertEqual(success_count, 0)
        self.assertGreater(len(failed), 0)
    
    @patch('app.agents.discord_slash_cmd_agent.requests.get')
    def test_rate_limit_handling(self, mock_get):
        """Test rate limit handling with backoff."""
        # First call returns 429, second call succeeds
        mock_response_429 = Mock()
        mock_response_429.status_code = 429
        mock_response_429.headers = {'Retry-After': '1'}
        
        mock_response_200 = Mock()
        mock_response_200.status_code = 200
        mock_response_200.json.return_value = {"id": "123", "username": "TestBot"}
        
        mock_get.side_effect = [mock_response_429, mock_response_200]
        
        with patch('app.agents.discord_slash_cmd_agent.time.sleep'):
            result = self.agent.preflight_validate_bot()
        
        self.assertTrue(result)
        self.assertEqual(mock_get.call_count, 2)
    
    def test_generate_deliverables(self):
        """Test deliverable generation."""
        existing = [
            {"name": "debug-last", "description": "Debug info"}
        ]
        comparison = {
            "missing": ["diagnose", "status"],
            "extra": [],
            "outdated": [],
            "total_expected": 3,
            "total_existing": 1
        }
        
        self.agent.guild_info = {"name": "Test Guild"}
        
        deliverables = self.agent.generate_deliverables(existing, comparison)
        
        # Verify all deliverables are created
        self.assertIn("evidence", deliverables)
        self.assertIn("diff", deliverables)
        self.assertIn("before_after", deliverables)
        self.assertIn("playbook", deliverables)
        
        # Verify files exist
        for file_path in deliverables.values():
            self.assertTrue(Path(file_path).exists())
    
    def test_generate_before_after_md(self):
        """Test before/after markdown generation."""
        existing = [
            {"name": "debug-last", "description": "Debug info", "id": "cmd1"}
        ]
        comparison = {
            "missing": ["diagnose"],
            "extra": [],
            "outdated": [],
            "total_expected": 2,
            "total_existing": 1
        }
        
        self.agent.guild_info = {"name": "Test Guild"}
        
        md_content = self.agent._generate_before_after_md(existing, comparison)
        
        self.assertIn("Test Guild", md_content)
        self.assertIn("debug-last", md_content)
        self.assertIn("Missing Commands", md_content)
        self.assertIn("diagnose", md_content)
    
    def test_generate_remediation_playbook(self):
        """Test remediation playbook generation."""
        comparison = {
            "missing": ["diagnose"],
            "extra": [],
            "outdated": [],
            "total_expected": 2,
            "total_existing": 1
        }
        
        playbook = self.agent._generate_remediation_playbook(comparison)
        
        self.assertIn("Remediation Playbook", playbook)
        self.assertIn("curl", playbook)
        self.assertIn(self.app_id, playbook)
        self.assertIn(self.guild_id, playbook)
        self.assertIn("SSM Parameter", playbook)
        self.assertIn("Bot Invite URL", playbook)
    
    @patch('app.agents.discord_slash_cmd_agent.requests.get')
    @patch('app.agents.discord_slash_cmd_agent.requests.put')
    @patch('app.agents.discord_slash_cmd_agent.time.sleep')
    def test_run_full_flow_check_only(self, mock_sleep, mock_put, mock_get):
        """Test full flow in check-only mode (no registration)."""
        # Mock bot validation
        mock_bot_response = Mock()
        mock_bot_response.status_code = 200
        mock_bot_response.json.return_value = {"id": "123", "username": "TestBot"}
        
        # Mock guilds response
        mock_guilds_response = Mock()
        mock_guilds_response.status_code = 200
        mock_guilds_response.json.return_value = [
            {"id": self.guild_id, "name": "Test Guild"}
        ]
        
        # Mock commands response
        mock_commands_response = Mock()
        mock_commands_response.status_code = 200
        mock_commands_response.json.return_value = []
        
        mock_get.side_effect = [
            mock_bot_response,
            mock_guilds_response,
            mock_commands_response
        ]
        
        result = self.agent.run_full_flow(register_commands=False)
        
        self.assertIn(result["status"], ["SUCCESS", "PARTIAL"])
        self.assertIn("deliverables", result)
        # PUT should not be called in check-only mode
        mock_put.assert_not_called()
    
    @patch('app.agents.discord_slash_cmd_agent.requests.get')
    @patch('app.agents.discord_slash_cmd_agent.requests.put')
    @patch('app.agents.discord_slash_cmd_agent.time.sleep')
    def test_run_full_flow_with_registration(self, mock_sleep, mock_put, mock_get):
        """Test full flow with command registration."""
        # Mock bot validation
        mock_bot_response = Mock()
        mock_bot_response.status_code = 200
        mock_bot_response.json.return_value = {"id": "123", "username": "TestBot"}
        
        # Mock guilds response
        mock_guilds_response = Mock()
        mock_guilds_response.status_code = 200
        mock_guilds_response.json.return_value = [
            {"id": self.guild_id, "name": "Test Guild"}
        ]
        
        # Mock commands response (empty initially)
        mock_commands_response_empty = Mock()
        mock_commands_response_empty.status_code = 200
        mock_commands_response_empty.json.return_value = []
        
        # Mock commands response (after registration)
        mock_commands_response_full = Mock()
        mock_commands_response_full.status_code = 200
        mock_commands_response_full.json.return_value = self.agent.expected_commands
        
        mock_get.side_effect = [
            mock_bot_response,
            mock_guilds_response,
            mock_commands_response_empty,
            mock_commands_response_full
        ]
        
        # Mock PUT for registration
        mock_put_response = Mock()
        mock_put_response.status_code = 200
        mock_put_response.json.return_value = self.agent.expected_commands
        mock_put.return_value = mock_put_response
        
        result = self.agent.run_full_flow(register_commands=True)
        
        self.assertIn(result["status"], ["SUCCESS", "PARTIAL"])
        self.assertIn("deliverables", result)
        # PUT should be called for registration
        mock_put.assert_called_once()


class TestDiscordSlashCommandAgentIntegration(unittest.TestCase):
    """Integration tests for agent workflow."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.temp_dir)
    
    def test_evidence_collection(self):
        """Test that evidence is collected throughout the flow."""
        agent = DiscordSlashCommandAgent(
            app_id="test_app",
            bot_token="test_token",
            guild_id="test_guild",
            evidence_dir=self.temp_dir
        )
        
        # Add some evidence
        agent._add_step("Test Step", "PASS", details={"key": "value"})
        agent._add_warning("Test warning")
        agent._add_error("Test error")
        
        self.assertEqual(len(agent.evidence["steps"]), 1)
        self.assertEqual(len(agent.evidence["warnings"]), 1)
        self.assertEqual(len(agent.evidence["errors"]), 1)
    
    def test_custom_expected_commands(self):
        """Test agent with custom expected commands."""
        custom_commands = [
            {
                "name": "custom-cmd",
                "type": 1,
                "description": "Custom command"
            }
        ]
        
        agent = DiscordSlashCommandAgent(
            app_id="test_app",
            bot_token="test_token",
            guild_id="test_guild",
            expected_commands=custom_commands,
            evidence_dir=self.temp_dir
        )
        
        self.assertEqual(len(agent.expected_commands), 1)
        self.assertEqual(agent.expected_commands[0]["name"], "custom-cmd")


if __name__ == "__main__":
    unittest.main()
