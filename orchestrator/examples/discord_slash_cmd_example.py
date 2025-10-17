#!/usr/bin/env python3
"""
Example usage of Discord Slash Command Agent.

This demonstrates how to use the DiscordSlashCommandAgent programmatically
in your Python code.
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'app'))

from agents.discord_slash_cmd_agent import DiscordSlashCommandAgent


def example_integration():
    """Example: Integration with larger workflow."""
    print("=" * 70)
    print("Discord Slash Command Agent - Integration Example")
    print("=" * 70)
    print()
    
    def setup_discord_commands():
        """Setup function that can be called from orchestrator."""
        agent = DiscordSlashCommandAgent(
            app_id=os.environ.get("DISCORD_APPLICATION_ID", "demo_app_id"),
            bot_token=os.environ.get("DISCORD_BOT_TOKEN", "demo_bot_token"),
            guild_id=os.environ.get("DISCORD_GUILD_ID_STAGING"),
            evidence_dir="./evidence_integration"
        )
        
        result = agent.run_full_flow(register_commands=False)
        
        return {
            "success": result['status'] in ["SUCCESS", "PARTIAL"],
            "playbook_path": result['deliverables'].get('playbook'),
            "warnings": result.get('warnings', []),
            "errors": result.get('errors', [])
        }
    
    # Simulate integration
    print("Running as part of deployment workflow...")
    result = setup_discord_commands()
    
    print()
    print(f"Success: {result['success']}")
    print(f"Playbook: {result['playbook_path']}")
    
    if result['warnings']:
        print(f"⚠️  {len(result['warnings'])} warning(s)")
    
    if result['errors']:
        print(f"❌ {len(result['errors'])} error(s)")
    
    return result


if __name__ == "__main__":
    print()
    print("Discord Slash Command Agent - Example Usage")
    print()
    print("NOTE: This example requires valid Discord credentials in environment:")
    print("  - DISCORD_APPLICATION_ID")
    print("  - DISCORD_BOT_TOKEN")
    print("  - DISCORD_GUILD_ID_STAGING (optional)")
    print()
    
    example_integration()
