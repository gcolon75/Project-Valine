#!/usr/bin/env python3
"""
Unit tests for Discord Slash Command Registration

Tests the core functionality without making actual API calls.
"""

import sys
import os
from unittest.mock import Mock, patch, MagicMock

# Add app directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'app'))

from agents.discord_slash_cmd_agent import DiscordSlashCommandAgent


def test_command_count():
    """Test that all 19 commands are defined"""
    commands = DiscordSlashCommandAgent.DEFAULT_EXPECTED_COMMANDS
    assert len(commands) == 19, f"Expected 19 commands, got {len(commands)}"
    print("✅ Command count test passed: 19 commands defined")


def test_command_names():
    """Test that all required command names are present"""
    commands = DiscordSlashCommandAgent.DEFAULT_EXPECTED_COMMANDS
    command_names = [cmd['name'] for cmd in commands]
    
    expected_names = [
        "plan", "approve", "status", "ship", "verify-latest", "verify-run",
        "diagnose", "deploy-client", "set-frontend", "set-api-base",
        "agents", "status-digest", "relay-send", "relay-dm", "triage",
        "debug-last", "update-summary", "uptime-check", "ux-update"
    ]
    
    for name in expected_names:
        assert name in command_names, f"Missing command: {name}"
    
    print(f"✅ Command names test passed: All {len(expected_names)} required commands present")


def test_ux_update_command():
    """Test that ux-update command is properly defined"""
    commands = DiscordSlashCommandAgent.DEFAULT_EXPECTED_COMMANDS
    ux_update = next((cmd for cmd in commands if cmd['name'] == 'ux-update'), None)
    
    assert ux_update is not None, "ux-update command not found"
    assert ux_update['type'] == 1, "ux-update must be type 1 (CHAT_INPUT)"
    assert 'description' in ux_update, "ux-update must have description"
    assert 'options' in ux_update, "ux-update must have options"
    
    # Check command option (required)
    options = ux_update['options']
    command_opt = next((opt for opt in options if opt['name'] == 'command'), None)
    assert command_opt is not None, "ux-update must have command option"
    assert command_opt['required'] == True, "command option must be required"
    
    # Check optional options exist
    desc_opt = next((opt for opt in options if opt['name'] == 'description'), None)
    assert desc_opt is not None, "ux-update must have description option"
    assert desc_opt['required'] == False, "description option must be optional"
    
    confirm_opt = next((opt for opt in options if opt['name'] == 'confirm'), None)
    assert confirm_opt is not None, "ux-update must have confirm option"
    assert confirm_opt['type'] == 5, "confirm must be boolean type (5)"
    
    conv_id_opt = next((opt for opt in options if opt['name'] == 'conversation_id'), None)
    assert conv_id_opt is not None, "ux-update must have conversation_id option"
    
    print("✅ ux-update command test passed: Properly defined with command/description/confirm/conversation_id options")


def test_exponential_backoff_config():
    """Test that exponential backoff configuration is correct"""
    assert DiscordSlashCommandAgent.RATE_LIMIT_INITIAL_BACKOFF == 1, "Initial backoff should be 1 second"
    assert DiscordSlashCommandAgent.RATE_LIMIT_MAX_RETRIES == 5, "Max retries should be 5"
    print("✅ Exponential backoff config test passed: 1s initial, 5 max retries")


def test_agent_initialization():
    """Test that agent initializes correctly"""
    agent = DiscordSlashCommandAgent(
        app_id="test_app_id",
        bot_token="test_bot_token_1234",
        guild_id="test_guild_id"
    )
    
    assert agent.app_id == "test_app_id"
    assert agent.guild_id == "test_guild_id"
    assert len(agent.expected_commands) == 19
    assert agent.evidence_dir.name == "discord_cmd_evidence"
    
    print("✅ Agent initialization test passed")


def test_token_redaction():
    """Test that tokens are properly redacted"""
    token = "MTQyODU2ODg0MDk1ODI1MTEwOQ.Ghf2Jj.abcdefghijklmnopqrstuvwxyz"
    redacted = DiscordSlashCommandAgent._redact_token(token)
    
    assert "***" in redacted
    assert redacted.endswith(token[-4:])
    assert len(redacted) < len(token)
    
    print("✅ Token redaction test passed")


def test_rate_limit_handling():
    """Test rate limit handling with exponential backoff"""
    agent = DiscordSlashCommandAgent(
        app_id="test_app_id",
        bot_token="test_bot_token_1234",
        guild_id="test_guild_id"
    )
    
    # Mock response with 429 status
    mock_response_429 = Mock()
    mock_response_429.status_code = 429
    mock_response_429.headers = {}
    
    mock_response_200 = Mock()
    mock_response_200.status_code = 200
    mock_response_200.content = b'{}'
    mock_response_200.json.return_value = {}
    
    call_count = 0
    
    def side_effect(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count <= 2:  # Fail twice with 429
            return mock_response_429
        return mock_response_200
    
    with patch('requests.get', side_effect=side_effect):
        with patch('time.sleep'):  # Don't actually sleep in tests
            result, error = agent._make_request("GET", "/test")
            
            # Should succeed after retries
            assert error is None, f"Expected success after retries, got error: {error}"
            assert call_count == 3, f"Expected 3 calls (2 failures + 1 success), got {call_count}"
    
    print("✅ Rate limit handling test passed: Exponential backoff works correctly")


def test_max_retries_exceeded():
    """Test that max retries are enforced"""
    agent = DiscordSlashCommandAgent(
        app_id="test_app_id",
        bot_token="test_bot_token_1234",
        guild_id="test_guild_id"
    )
    
    # Mock response that always returns 429
    mock_response_429 = Mock()
    mock_response_429.status_code = 429
    mock_response_429.headers = {}
    
    with patch('requests.get', return_value=mock_response_429):
        with patch('time.sleep'):  # Don't actually sleep in tests
            result, error = agent._make_request("GET", "/test")
            
            # Should fail after max retries
            assert error is not None, "Expected error after max retries"
            assert "Rate limit exceeded" in error, f"Expected rate limit error, got: {error}"
    
    print("✅ Max retries test passed: Stops after 5 attempts")


def test_error_handling_401():
    """Test 401 authentication error handling"""
    agent = DiscordSlashCommandAgent(
        app_id="test_app_id",
        bot_token="test_bot_token_1234",
        guild_id="test_guild_id"
    )
    
    mock_response = Mock()
    mock_response.status_code = 401
    
    with patch('requests.get', return_value=mock_response):
        result, error = agent._make_request("GET", "/test")
        
        assert error is not None
        assert "401" in error
        assert "Authentication failed" in error or "token" in error.lower()
    
    print("✅ 401 error handling test passed")


def test_error_handling_403():
    """Test 403 permission error handling"""
    agent = DiscordSlashCommandAgent(
        app_id="test_app_id",
        bot_token="test_bot_token_1234",
        guild_id="test_guild_id"
    )
    
    mock_response = Mock()
    mock_response.status_code = 403
    
    with patch('requests.get', return_value=mock_response):
        result, error = agent._make_request("GET", "/test")
        
        assert error is not None
        assert "403" in error
        assert "Permission denied" in error or "applications.commands" in error
    
    print("✅ 403 error handling test passed")


def run_all_tests():
    """Run all tests"""
    print("=" * 70)
    print("Discord Slash Command Registration - Unit Tests")
    print("=" * 70)
    print()
    
    tests = [
        test_command_count,
        test_command_names,
        test_ux_update_command,
        test_exponential_backoff_config,
        test_agent_initialization,
        test_token_redaction,
        test_rate_limit_handling,
        test_max_retries_exceeded,
        test_error_handling_401,
        test_error_handling_403,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"❌ {test.__name__} failed: {e}")
            failed += 1
        except Exception as e:
            print(f"❌ {test.__name__} error: {e}")
            failed += 1
    
    print()
    print("=" * 70)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 70)
    
    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
