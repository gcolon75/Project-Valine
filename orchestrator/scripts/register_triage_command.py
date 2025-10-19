#!/usr/bin/env python3
"""
Register /triage Discord slash command.

This script registers the /triage command with Discord's API.

Usage:
    export DISCORD_APPLICATION_ID="your_app_id"
    export DISCORD_BOT_TOKEN="your_bot_token"
    export DISCORD_GUILD_ID="your_guild_id"  # For guild commands (instant)
    
    python register_triage_command.py [--global]  # Use --global for global commands (slower)
"""

import os
import sys
import json
import requests
import argparse


def register_triage_command(app_id: str, bot_token: str, guild_id: str = None):
    """
    Register the /triage command with Discord.
    
    Args:
        app_id: Discord Application ID
        bot_token: Discord Bot Token
        guild_id: Optional guild ID for guild-specific command (instant)
    """
    # Command definition
    command = {
        "name": "triage",
        "type": 1,
        "description": "Auto-triage a failing PR and optionally create fix PR",
        "options": [
            {
                "name": "pr",
                "description": "PR number to triage",
                "type": 4,  # INTEGER
                "required": True
            },
            {
                "name": "create_pr",
                "description": "Create draft PR with fixes (default: false)",
                "type": 5,  # BOOLEAN
                "required": False
            }
        ]
    }
    
    # Prepare request
    headers = {
        "Authorization": f"Bot {bot_token}",
        "Content-Type": "application/json"
    }
    
    # Choose endpoint based on guild_id
    if guild_id:
        url = f"https://discord.com/api/v10/applications/{app_id}/guilds/{guild_id}/commands"
        print(f"📝 Registering /triage as guild command (guild: {guild_id})...")
    else:
        url = f"https://discord.com/api/v10/applications/{app_id}/commands"
        print("📝 Registering /triage as global command (may take up to 1 hour)...")
    
    # Register command
    try:
        response = requests.post(url, headers=headers, json=command, timeout=10)
        
        if response.status_code in [200, 201]:
            print("✅ Successfully registered /triage command!")
            data = response.json()
            print(f"   Command ID: {data.get('id')}")
            print(f"   Name: {data.get('name')}")
            print(f"   Description: {data.get('description')}")
            return True
        else:
            print(f"❌ Failed to register command: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Error making request: {e}")
        return False


def list_commands(app_id: str, bot_token: str, guild_id: str = None):
    """List currently registered commands."""
    headers = {
        "Authorization": f"Bot {bot_token}",
        "Content-Type": "application/json"
    }
    
    if guild_id:
        url = f"https://discord.com/api/v10/applications/{app_id}/guilds/{guild_id}/commands"
    else:
        url = f"https://discord.com/api/v10/applications/{app_id}/commands"
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            commands = response.json()
            print(f"\n📋 Currently registered commands ({len(commands)}):")
            for cmd in commands:
                print(f"   /{cmd.get('name')} - {cmd.get('description')}")
            return commands
        else:
            print(f"❌ Failed to list commands: {response.status_code}")
            return []
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Error: {e}")
        return []


def main():
    parser = argparse.ArgumentParser(
        description='Register /triage Discord slash command'
    )
    parser.add_argument('--global', dest='is_global', action='store_true',
                       help='Register as global command (default: guild command)')
    parser.add_argument('--list', action='store_true',
                       help='List currently registered commands')
    
    args = parser.parse_args()
    
    # Get credentials from environment
    app_id = os.environ.get('DISCORD_APPLICATION_ID')
    bot_token = os.environ.get('DISCORD_BOT_TOKEN')
    guild_id = os.environ.get('DISCORD_GUILD_ID') if not args.is_global else None
    
    if not app_id or not bot_token:
        print("❌ Error: Missing required environment variables")
        print("   Required: DISCORD_APPLICATION_ID, DISCORD_BOT_TOKEN")
        print("   Optional: DISCORD_GUILD_ID (for guild commands)")
        sys.exit(1)
    
    if not guild_id and not args.is_global:
        print("⚠️  Warning: DISCORD_GUILD_ID not set, using global command")
        print("   Global commands take up to 1 hour to propagate")
        print("   Set DISCORD_GUILD_ID for instant guild commands")
    
    print("🎮 Discord Triage Command Registration")
    print(f"   App ID: {app_id}")
    print(f"   Bot Token: ***{bot_token[-4:]}")
    if guild_id:
        print(f"   Guild ID: {guild_id}")
    print()
    
    # List commands if requested
    if args.list:
        list_commands(app_id, bot_token, guild_id)
        return
    
    # Register command
    success = register_triage_command(app_id, bot_token, guild_id)
    
    if success:
        print("\n✅ Registration complete!")
        print("\n📝 Next steps:")
        print("   1. Go to your Discord server")
        print("   2. Type '/' in any channel")
        print("   3. Look for /triage in the command list")
        print("   4. Test with: /triage pr:60")
    else:
        print("\n❌ Registration failed")
        sys.exit(1)


if __name__ == '__main__':
    main()
