#!/usr/bin/env python3
"""
Discord Slash Command Registration Agent - CLI Interface

Command-line interface for the Discord Slash Command Registration & Fixes Agent.
This agent ensures Discord slash commands are properly registered and working
in the staging environment.

Usage:
    # Check current status (no registration)
    python register_slash_commands_agent.py check \\
        --app-id APP_ID \\
        --bot-token BOT_TOKEN \\
        --guild-id GUILD_ID
    
    # Register commands
    python register_slash_commands_agent.py register \\
        --app-id APP_ID \\
        --bot-token BOT_TOKEN \\
        --guild-id GUILD_ID
    
    # Full flow with automatic registration
    python register_slash_commands_agent.py full \\
        --app-id APP_ID \\
        --bot-token BOT_TOKEN \\
        --guild-id GUILD_ID \\
        --register
    
    # Use environment variables
    export DISCORD_APPLICATION_ID="..."
    export DISCORD_BOT_TOKEN="..."
    export DISCORD_GUILD_ID_STAGING="..."
    python register_slash_commands_agent.py full --register

Environment Variables:
    DISCORD_APPLICATION_ID - Discord Application ID
    DISCORD_BOT_TOKEN - Discord Bot Token
    DISCORD_GUILD_ID_STAGING - Discord Guild ID (optional, can be discovered)
"""

import os
import sys
import argparse
import json
from pathlib import Path

# Add app directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from agents.discord_slash_cmd_agent import DiscordSlashCommandAgent


def load_expected_commands(file_path: str) -> list:
    """Load expected commands from JSON file."""
    with open(file_path, 'r') as f:
        return json.load(f)


def main():
    parser = argparse.ArgumentParser(
        description="Discord Slash Command Registration & Fixes Agent (Staging)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Common arguments for all commands
    common_args = argparse.ArgumentParser(add_help=False)
    common_args.add_argument(
        "--app-id",
        default=os.environ.get("DISCORD_APPLICATION_ID"),
        help="Discord Application ID (env: DISCORD_APPLICATION_ID)"
    )
    common_args.add_argument(
        "--bot-token",
        default=os.environ.get("DISCORD_BOT_TOKEN"),
        help="Discord Bot Token (env: DISCORD_BOT_TOKEN)"
    )
    common_args.add_argument(
        "--guild-id",
        default=os.environ.get("DISCORD_GUILD_ID_STAGING"),
        help="Discord Guild ID - optional, can be discovered (env: DISCORD_GUILD_ID_STAGING)"
    )
    common_args.add_argument(
        "--expected-commands",
        type=str,
        help="Path to JSON file with expected command definitions"
    )
    common_args.add_argument(
        "--evidence-dir",
        default="./discord_cmd_evidence",
        help="Directory to store evidence and deliverables (default: ./discord_cmd_evidence)"
    )
    
    # Check command - verify current status
    check_parser = subparsers.add_parser(
        "check",
        parents=[common_args],
        help="Check current command registration status (no changes)"
    )
    
    # Register command - register missing/outdated commands
    register_parser = subparsers.add_parser(
        "register",
        parents=[common_args],
        help="Register missing and update outdated commands"
    )
    
    # Full command - run complete flow
    full_parser = subparsers.add_parser(
        "full",
        parents=[common_args],
        help="Run full validation and optionally register commands"
    )
    full_parser.add_argument(
        "--register",
        action="store_true",
        help="Register commands automatically if missing or outdated"
    )
    full_parser.add_argument(
        "--no-verify-handlers",
        action="store_true",
        help="Skip handler verification step"
    )
    
    args = parser.parse_args()
    
    # Validate command
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Validate required arguments
    if not args.app_id:
        print("❌ Error: --app-id or DISCORD_APPLICATION_ID is required")
        sys.exit(1)
    
    if not args.bot_token:
        print("❌ Error: --bot-token or DISCORD_BOT_TOKEN is required")
        sys.exit(1)
    
    # Load expected commands if provided
    expected_commands = None
    if args.expected_commands:
        try:
            expected_commands = load_expected_commands(args.expected_commands)
        except Exception as e:
            print(f"❌ Error loading expected commands from {args.expected_commands}: {e}")
            sys.exit(1)
    
    # Create agent
    agent = DiscordSlashCommandAgent(
        app_id=args.app_id,
        bot_token=args.bot_token,
        guild_id=args.guild_id,
        expected_commands=expected_commands,
        evidence_dir=args.evidence_dir
    )
    
    # Run command
    try:
        if args.command == "check":
            result = agent.run_full_flow(register_commands=False, verify_handlers=True)
        elif args.command == "register":
            result = agent.run_full_flow(register_commands=True, verify_handlers=True)
        elif args.command == "full":
            result = agent.run_full_flow(
                register_commands=args.register,
                verify_handlers=not args.no_verify_handlers
            )
        else:
            parser.print_help()
            sys.exit(1)
        
        # Print summary
        print()
        print("=" * 70)
        print("SUMMARY")
        print("=" * 70)
        print(f"Status: {result['status']}")
        
        if result.get('warnings'):
            print(f"\nWarnings ({len(result['warnings'])}):")
            for warning in result['warnings']:
                print(f"  ⚠️  {warning}")
        
        if result.get('errors'):
            print(f"\nErrors ({len(result['errors'])}):")
            for error in result['errors']:
                print(f"  ❌ {error}")
        
        if result.get('deliverables'):
            print(f"\nDeliverables:")
            for name, path in result['deliverables'].items():
                print(f"  📄 {name}: {path}")
        
        print()
        
        # Exit code based on status
        if result['status'] == "SUCCESS":
            sys.exit(0)
        elif result['status'] == "PARTIAL":
            sys.exit(2)
        else:
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
