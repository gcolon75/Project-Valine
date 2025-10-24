#!/usr/bin/env python3
"""
Script to register the /ux-update Discord slash command.

This script registers the /ux-update command with Discord, allowing users
to trigger UI/UX updates via Discord interactions.

Usage:
    python register_ux_command.py
    
Environment Variables Required:
    - DISCORD_APPLICATION_ID: Discord application ID
    - DISCORD_BOT_TOKEN: Discord bot token
    - DISCORD_GUILD_ID: Discord guild ID (for guild command)
"""

import os
import sys
import requests
import json
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from app.agents.discord_slash_cmd_agent import DiscordSlashCommandAgent


def register_ux_update_command():
    """Register the /ux-update slash command with Discord."""
    
    # Get environment variables
    app_id = os.environ.get('DISCORD_APPLICATION_ID')
    bot_token = os.environ.get('DISCORD_BOT_TOKEN')
    guild_id = os.environ.get('DISCORD_GUILD_ID')
    
    if not app_id or not bot_token:
        print("❌ Missing required environment variables:")
        print("   - DISCORD_APPLICATION_ID")
        print("   - DISCORD_BOT_TOKEN")
        print("   - DISCORD_GUILD_ID (optional, can be discovered)")
        sys.exit(1)
    
    # Define the /ux-update command with flexible options
    ux_update_command = {
        "name": "ux-update",
        "type": 1,
        "description": "Interactive UX/UI updates with confirmation (supports plain English + images)",
        "options": [
            {
                "name": "command",
                "description": "Structured command like 'section:header text:\"Welcome!\"' (optional if using description)",
                "type": 3,  # STRING
                "required": False
            },
            {
                "name": "description",
                "description": "Plain English description like 'Make the navbar blue' (can attach images)",
                "type": 3,  # STRING
                "required": False
            },
            {
                "name": "conversation_id",
                "description": "Conversation ID for confirming/modifying previous request (internal use)",
                "type": 3,  # STRING
                "required": False
            },
            {
                "name": "confirm",
                "description": "Confirmation response: 'yes' to proceed, 'no' to cancel, or modify text",
                "type": 3,  # STRING
                "required": False
            }
        ]
    }
    
    print("🚀 Registering /ux-update command with Discord...\n")
    
    # Initialize Discord Slash Command Agent
    agent = DiscordSlashCommandAgent(
        app_id=app_id,
        bot_token=bot_token,
        guild_id=guild_id,
        expected_commands=[ux_update_command]
    )
    
    # Run validation and registration
    result = agent.run_full_flow(
        register_commands=True,
        verify_handlers=False
    )
    
    if result['status'] in ['SUCCESS', 'PARTIAL']:
        print("\n✅ Successfully registered /ux-update command!")
        print("\n🎨 **Interactive UX Agent** - Now supports conversation flow with confirmation!")
        print("\n📝 **Usage Examples:**")
        print("\n  **Structured Commands:**")
        print('    /ux-update command:"section:header text:\\"Welcome to Project Valine!\\""')
        print('    /ux-update command:"section:footer color:\\"#FF0080\\""')
        print('    /ux-update command:"section:navbar brand:\\"Joint\\""')
        print("\n  **Plain English (Natural Language):**")
        print('    /ux-update description:"Make the navbar blue"')
        print('    /ux-update description:"Change the header to say \'Level Up!\'"')
        print('    /ux-update description:"Update footer text to \'Valine\'"')
        print("\n  **With Image Attachments:**")
        print('    /ux-update description:"Make the navbar match this design" [attach screenshot]')
        print('    /ux-update description:"Use the color scheme from this image" [attach image]')
        print("\n  **Confirmation Flow:**")
        print("    1. Send your request (command or description)")
        print("    2. Agent shows preview and asks for confirmation")
        print("    3. Reply with 'yes' to confirm, 'no' to cancel, or modify your request")
        print("\n💡 **The agent will:**")
        print("  • Ask clarifying questions if needed")
        print("  • Show code preview before changes")
        print("  • Wait for your confirmation")
        print("  • Only create PR after you approve")
        
        if result['deliverables']:
            print("\n📄 Deliverables:")
            for name, path in result['deliverables'].items():
                print(f"  - {name}: {path}")
        
        return 0
    else:
        print("\n❌ Failed to register /ux-update command")
        if result['errors']:
            print("\nErrors:")
            for error in result['errors']:
                print(f"  - {error}")
        return 1


if __name__ == '__main__':
    sys.exit(register_ux_update_command())
