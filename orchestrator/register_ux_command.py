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
    
    # Define the /ux-update command
    ux_update_command = {
        "name": "ux-update",
        "type": 1,
        "description": "Update UI/UX elements (text, colors, links) via Discord",
        "options": [
            {
                "name": "section",
                "description": "Section to update (header, footer, navbar, home)",
                "type": 3,  # STRING
                "required": True,
                "choices": [
                    {"name": "Header", "value": "header"},
                    {"name": "Footer", "value": "footer"},
                    {"name": "Navbar", "value": "navbar"},
                    {"name": "Home", "value": "home"}
                ]
            },
            {
                "name": "text",
                "description": "Update text content",
                "type": 3,  # STRING
                "required": False
            },
            {
                "name": "color",
                "description": "Update color (hex format like #FF0080)",
                "type": 3,  # STRING
                "required": False
            },
            {
                "name": "brand",
                "description": "Update brand name",
                "type": 3,  # STRING
                "required": False
            },
            {
                "name": "hero-text",
                "description": "Update home page hero text",
                "type": 3,  # STRING
                "required": False
            },
            {
                "name": "description",
                "description": "Update home page description",
                "type": 3,  # STRING
                "required": False
            },
            {
                "name": "cta-text",
                "description": "Update home page CTA button text",
                "type": 3,  # STRING
                "required": False
            },
            {
                "name": "add-link",
                "description": "Add navigation link (format: 'Label:/path' or '/path')",
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
        print("\nYou can now use it in Discord:")
        print("  /ux-update section:header text:\"Welcome to Project Valine!\"")
        print("  /ux-update section:footer color:\"#FF0080\"")
        print("  /ux-update section:navbar brand:\"Joint\"")
        print("  /ux-update section:home hero-text:\"Your Creative Hub\"")
        
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
