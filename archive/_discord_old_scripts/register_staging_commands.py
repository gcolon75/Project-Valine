#!/usr/bin/env python3
"""
Register Discord Slash Commands for Staging Environment

This script registers all 19 Discord slash commands (18 + ux-update) to the staging
guild using the Discord API with proper error handling and rate limit management.

Usage:
    # Using environment variables
    export STAGING_DISCORD_APPLICATION_ID="your_app_id"
    export STAGING_DISCORD_BOT_TOKEN="your_bot_token"
    export STAGING_DISCORD_GUILD_ID="1407810581532250233"
    python register_staging_commands.py

    # Using command-line arguments
    python register_staging_commands.py \\
        --app-id YOUR_APP_ID \\
        --bot-token YOUR_BOT_TOKEN \\
        --guild-id 1407810581532250233

Features:
- Registers all 19 commands to guild 1407810581532250233
- Handles rate limits with exponential backoff (1s, 2s, 4s, 8s, 16s, max 5 retries)
- Validates bot authentication and guild membership
- Generates comprehensive evidence report
- Clear error messages for common issues (401, 403, 429)
"""

import os
import sys
import argparse
from pathlib import Path

# Add app directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from agents.discord_slash_cmd_agent import DiscordSlashCommandAgent


def main():
    parser = argparse.ArgumentParser(
        description="Register Discord Slash Commands for Staging",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument(
        "--app-id",
        default=os.environ.get("STAGING_DISCORD_APPLICATION_ID"),
        help="Discord Application ID (env: STAGING_DISCORD_APPLICATION_ID)"
    )
    parser.add_argument(
        "--bot-token",
        default=os.environ.get("STAGING_DISCORD_BOT_TOKEN"),
        help="Discord Bot Token (env: STAGING_DISCORD_BOT_TOKEN)"
    )
    parser.add_argument(
        "--guild-id",
        default=os.environ.get("STAGING_DISCORD_GUILD_ID", "1407810581532250233"),
        help="Discord Guild ID (env: STAGING_DISCORD_GUILD_ID, default: 1407810581532250233)"
    )
    parser.add_argument(
        "--evidence-dir",
        default="./discord_cmd_evidence",
        help="Directory to store evidence and reports (default: ./discord_cmd_evidence)"
    )
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Only check current status without registering commands"
    )
    
    args = parser.parse_args()
    
    # Validate required arguments
    if not args.app_id:
        print("❌ Error: --app-id or STAGING_DISCORD_APPLICATION_ID is required")
        sys.exit(1)
    
    if not args.bot_token:
        print("❌ Error: --bot-token or STAGING_DISCORD_BOT_TOKEN is required")
        sys.exit(1)
    
    if not args.guild_id:
        print("❌ Error: --guild-id or STAGING_DISCORD_GUILD_ID is required")
        sys.exit(1)
    
    print("=" * 70)
    print("Discord Slash Command Registration for Staging")
    print("=" * 70)
    print()
    print(f"Application ID: {args.app_id}")
    print(f"Guild ID: {args.guild_id}")
    print(f"Bot Token: ***{args.bot_token[-4:] if len(args.bot_token) > 4 else '****'}")
    print(f"Evidence Directory: {args.evidence_dir}")
    print(f"Mode: {'Check Only' if args.check_only else 'Register Commands'}")
    print()
    
    # Create agent
    agent = DiscordSlashCommandAgent(
        app_id=args.app_id,
        bot_token=args.bot_token,
        guild_id=args.guild_id,
        evidence_dir=args.evidence_dir
    )
    
    # Run the agent
    try:
        result = agent.run_full_flow(
            register_commands=not args.check_only,
            verify_handlers=True
        )
        
        # Print summary
        print()
        print("=" * 70)
        print("SUMMARY")
        print("=" * 70)
        print(f"Status: {result['status']}")
        print()
        
        if result.get('warnings'):
            print(f"⚠️  Warnings ({len(result['warnings'])}):")
            for warning in result['warnings']:
                print(f"  • {warning}")
            print()
        
        if result.get('errors'):
            print(f"❌ Errors ({len(result['errors'])}):")
            for error in result['errors']:
                print(f"  • {error}")
            print()
        
        if result.get('deliverables'):
            print(f"📄 Evidence Files Generated:")
            for name, path in result['deliverables'].items():
                print(f"  • {name}: {path}")
            print()
        
        # Print next steps based on status
        if result['status'] == "SUCCESS":
            print("✅ All commands registered successfully!")
            print()
            print("📋 Next Steps:")
            print("  1. Go to Discord staging server (Guild ID: {})".format(args.guild_id))
            print("  2. Type '/' to see all 19 registered commands")
            print("  3. Test commands like /agents, /status, /ux-update")
            print("  4. Verify feature flags in AWS SSM if needed")
            print()
            sys.exit(0)
        elif result['status'] == "PARTIAL":
            print("⚠️  Command registration partially completed")
            print()
            print("📋 Action Required:")
            print("  1. Review errors above")
            print("  2. Check bot permissions and scopes")
            print("  3. Retry registration if needed")
            print()
            sys.exit(2)
        else:
            print("❌ Command registration failed")
            print()
            print("📋 Troubleshooting:")
            if any("401" in str(e) for e in result.get('errors', [])):
                print("  • Invalid bot token - check STAGING_DISCORD_BOT_TOKEN")
            if any("403" in str(e) for e in result.get('errors', [])):
                print("  • Bot lacks permissions - invite with applications.commands scope")
                print(f"  • Invite URL: https://discord.com/api/oauth2/authorize?client_id={args.app_id}&scope=bot%20applications.commands&permissions=0")
            if any("429" in str(e) for e in result.get('errors', [])):
                print("  • Rate limited - wait and retry")
            print("  • Check evidence files for detailed information")
            print()
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
