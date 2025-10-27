#!/usr/bin/env python3
"""
Register /triage-all Discord slash command.

This script registers the /triage-all command with Discord's API.
It should be run after deploying the orchestrator to ensure the command is available.

Usage:
    python register_triage_all_command.py [--guild-id GUILD_ID]

Environment variables:
    DISCORD_BOT_TOKEN: Discord bot token (required)
    DISCORD_APPLICATION_ID: Discord application ID (required)
    GUILD_ID: Optional guild ID for guild-specific registration
"""

import os
import sys
import requests
import argparse

def register_triage_all_command(guild_id=None):
    """
    Register the /triage-all command with Discord.
    
    Args:
        guild_id: Optional guild ID for guild-specific registration.
                 If None, registers globally (takes up to 1 hour).
    """
    bot_token = os.getenv('DISCORD_BOT_TOKEN')
    application_id = os.getenv('DISCORD_APPLICATION_ID')
    
    if not bot_token:
        print("❌ Error: DISCORD_BOT_TOKEN environment variable not set")
        return False
    
    if not application_id:
        print("❌ Error: DISCORD_APPLICATION_ID environment variable not set")
        return False
    
    headers = {
        'Authorization': f'Bot {bot_token}',
        'Content-Type': 'application/json'
    }
    
    # Define the command
    command = {
        'name': 'triage-all',
        'type': 1,  # CHAT_INPUT
        'description': 'Triage all open issues in the repository (Support Main)',
        'options': []  # No parameters needed
    }
    
    # Determine URL based on guild_id
    if guild_id:
        url = f'https://discord.com/api/v10/applications/{application_id}/guilds/{guild_id}/commands'
        print(f"📝 Registering /triage-all as guild command (guild: {guild_id})...")
    else:
        url = f'https://discord.com/api/v10/applications/{application_id}/commands'
        print("📝 Registering /triage-all as global command (may take up to 1 hour)...")
    
    try:
        response = requests.post(url, headers=headers, json=command, timeout=10)
        response.raise_for_status()
        
        if response.status_code in [200, 201]:
            print("✅ Successfully registered /triage-all command!")
            print("\nCommand details:")
            print(f"   Name: {command['name']}")
            print(f"   Description: {command['description']}")
            print(f"   Type: Slash command")
            
            if guild_id:
                print(f"\n⚡ Command is immediately available in guild {guild_id}")
            else:
                print("\n⏳ Global commands may take up to 1 hour to become available")
            
            return True
        else:
            print(f"⚠️ Unexpected response: {response.status_code}")
            print(response.text)
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Error registering command: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response: {e.response.text}")
        return False

def main():
    parser = argparse.ArgumentParser(
        description='Register /triage-all Discord slash command'
    )
    parser.add_argument(
        '--guild-id',
        help='Guild ID for guild-specific registration (faster, recommended for testing)'
    )
    
    args = parser.parse_args()
    
    print("🎮 Issue Triage & Solver Agent - Discord Command Registration")
    print("=" * 60)
    
    success = register_triage_all_command(guild_id=args.guild_id)
    
    if success:
        print("\n✅ Setup complete!")
        print("\nNext steps:")
        print("   1. Go to your Discord server")
        print("   2. Type / in any channel")
        print("   3. Look for /triage-all in the command list")
        print("   4. Run the command to triage all open issues")
        print("\nThe bot will:")
        print("   • Fetch all open issues from GitHub")
        print("   • Analyze and prioritize them")
        print("   • Attempt auto-fixes where possible")
        print("   • Mark issues as triaged")
        print("   • Post results back to Discord")
        sys.exit(0)
    else:
        print("\n❌ Registration failed")
        sys.exit(1)

if __name__ == '__main__':
    main()
