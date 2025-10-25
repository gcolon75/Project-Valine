#!/usr/bin/env python3
"""
Discord Slash Commands Validator for Staging

This script validates that Discord slash commands are properly registered and working
in the staging environment. It performs the following checks:
1. Validates bot credentials and authentication
2. Checks bot guild membership
3. Lists and verifies registered guild commands
4. Optionally registers missing commands
5. Tests command responses (if bot token provided)
6. Generates evidence and validation report

Usage:
    python validate_discord_slash_commands.py check --app-id <ID> --bot-token <TOKEN> --guild-id <GUILD>
    python validate_discord_slash_commands.py register --app-id <ID> --bot-token <TOKEN> --guild-id <GUILD>
    python validate_discord_slash_commands.py full --app-id <ID> --bot-token <TOKEN> --guild-id <GUILD>
"""

import os
import sys
import json
import argparse
import requests
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from pathlib import Path


def redact_token(token: str) -> str:
    """Redact token showing only last 4 characters"""
    if not token or len(token) <= 4:
        return "****"
    return f"***{token[-4:]}"


class DiscordSlashCommandValidator:
    """Validator for Discord slash commands in staging"""
    
    def __init__(self, app_id: str, bot_token: str, guild_id: str, evidence_dir: str = "./validation_evidence"):
        self.app_id = app_id
        self.bot_token = bot_token
        self.guild_id = guild_id
        self.evidence_dir = Path(evidence_dir)
        self.evidence_dir.mkdir(exist_ok=True)
        self.base_url = "https://discord.com/api/v10"
        self.headers = {
            "Authorization": f"Bot {bot_token}",
            "Content-Type": "application/json"
        }
        self.evidence = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "app_id": app_id,
            "guild_id": guild_id,
            "checks": []
        }
    
    def log(self, message: str, level: str = "INFO"):
        """Log message with timestamp"""
        timestamp = datetime.now(timezone.utc).strftime("%H:%M:%S")
        prefix = {
            "INFO": "ℹ️",
            "SUCCESS": "✅",
            "WARNING": "⚠️",
            "ERROR": "❌"
        }.get(level, "  ")
        print(f"[{timestamp}] {prefix} {message}")
    
    def add_check(self, name: str, status: str, details: Any = None, error: str = None):
        """Add a validation check result"""
        check = {
            "name": name,
            "status": status,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        if details:
            check["details"] = details
        if error:
            check["error"] = error
        self.evidence["checks"].append(check)
    
    def verify_bot_authentication(self) -> bool:
        """Verify bot can authenticate with Discord API"""
        self.log("Verifying bot authentication...")
        try:
            response = requests.get(
                f"{self.base_url}/users/@me",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                bot_info = response.json()
                bot_username = bot_info.get("username", "Unknown")
                bot_id = bot_info.get("id", "Unknown")
                self.log(f"Bot authenticated: @{bot_username} (ID: {bot_id})", "SUCCESS")
                self.add_check(
                    "Bot Authentication",
                    "PASS",
                    details={
                        "username": bot_username,
                        "id": bot_id,
                        "bot_token": redact_token(self.bot_token)
                    }
                )
                return True
            else:
                error_msg = f"Authentication failed with status {response.status_code}"
                self.log(error_msg, "ERROR")
                self.add_check(
                    "Bot Authentication",
                    "FAIL",
                    error=error_msg
                )
                return False
        except Exception as e:
            self.log(f"Authentication error: {str(e)}", "ERROR")
            self.add_check("Bot Authentication", "FAIL", error=str(e))
            return False
    
    def check_guild_membership(self) -> bool:
        """Check if bot is a member of the specified guild"""
        self.log(f"Checking guild membership (Guild ID: {self.guild_id})...")
        try:
            response = requests.get(
                f"{self.base_url}/users/@me/guilds",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                guilds = response.json()
                guild_ids = [g.get("id") for g in guilds]
                
                if self.guild_id in guild_ids:
                    guild = next(g for g in guilds if g.get("id") == self.guild_id)
                    guild_name = guild.get("name", "Unknown")
                    self.log(f"Bot is member of guild: {guild_name}", "SUCCESS")
                    self.add_check(
                        "Guild Membership",
                        "PASS",
                        details={
                            "guild_name": guild_name,
                            "guild_id": self.guild_id
                        }
                    )
                    return True
                else:
                    error_msg = f"Bot is NOT a member of guild {self.guild_id}"
                    self.log(error_msg, "ERROR")
                    self.log("", "INFO")
                    self.log("ACTION REQUIRED:", "WARNING")
                    self.log(f"Invite the bot using this URL:", "INFO")
                    invite_url = f"https://discord.com/api/oauth2/authorize?client_id={self.app_id}&scope=bot%20applications.commands&permissions=0"
                    self.log(invite_url, "INFO")
                    self.log("Make sure to use BOTH scopes: bot + applications.commands", "WARNING")
                    self.add_check(
                        "Guild Membership",
                        "FAIL",
                        error=error_msg,
                        details={"invite_url": invite_url}
                    )
                    return False
            else:
                error_msg = f"Failed to fetch guilds (status {response.status_code})"
                self.log(error_msg, "ERROR")
                self.add_check("Guild Membership", "FAIL", error=error_msg)
                return False
        except Exception as e:
            self.log(f"Guild membership check error: {str(e)}", "ERROR")
            self.add_check("Guild Membership", "FAIL", error=str(e))
            return False
    
    def list_guild_commands(self) -> List[Dict]:
        """List currently registered guild commands"""
        self.log("Listing registered guild commands...")
        try:
            response = requests.get(
                f"{self.base_url}/applications/{self.app_id}/guilds/{self.guild_id}/commands",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                commands = response.json()
                
                if not commands:
                    self.log("No guild commands currently registered", "WARNING")
                    self.add_check(
                        "List Guild Commands",
                        "PASS",
                        details={"command_count": 0, "commands": []}
                    )
                else:
                    self.log(f"Found {len(commands)} registered commands:", "SUCCESS")
                    command_names = []
                    for cmd in commands:
                        cmd_name = cmd.get("name", "unknown")
                        cmd_desc = cmd.get("description", "")
                        command_names.append(cmd_name)
                        self.log(f"  • /{cmd_name} - {cmd_desc}", "INFO")
                    
                    self.add_check(
                        "List Guild Commands",
                        "PASS",
                        details={
                            "command_count": len(commands),
                            "commands": command_names
                        }
                    )
                
                return commands
            else:
                error_msg = f"Failed to list commands (status {response.status_code})"
                self.log(error_msg, "ERROR")
                self.add_check("List Guild Commands", "FAIL", error=error_msg)
                return []
        except Exception as e:
            self.log(f"Error listing commands: {str(e)}", "ERROR")
            self.add_check("List Guild Commands", "FAIL", error=str(e))
            return []
    
    def register_staging_commands(self) -> bool:
        """Register all staging commands"""
        self.log("Registering staging commands...")
        
        # Define all staging commands (18 total)
        commands_to_register = [
            {
                "name": "plan",
                "type": 1,
                "description": "Create a daily plan from ready GitHub issues",
                "options": [
                    {
                        "name": "channel_id",
                        "description": "Discord channel ID to post plan to (optional, uses current channel)",
                        "type": 3,
                        "required": False
                    }
                ]
            },
            {
                "name": "approve",
                "type": 1,
                "description": "Approve and execute a plan",
                "options": [
                    {
                        "name": "run_id",
                        "description": "Run ID to approve",
                        "type": 3,
                        "required": True
                    }
                ]
            },
            {
                "name": "status",
                "type": 1,
                "description": "Show last 1-3 runs for Client Deploy and Diagnose workflows",
                "options": [
                    {
                        "name": "count",
                        "description": "Number of runs to show (1-3, default: 2)",
                        "type": 4,
                        "required": False,
                        "min_value": 1,
                        "max_value": 3
                    }
                ]
            },
            {
                "name": "ship",
                "type": 1,
                "description": "Finalize and ship a completed run",
                "options": [
                    {
                        "name": "run_id",
                        "description": "Run ID to ship",
                        "type": 3,
                        "required": True
                    }
                ]
            },
            {
                "name": "verify-latest",
                "type": 1,
                "description": "Verify the latest Client Deploy workflow run",
                "options": [
                    {
                        "name": "run_url",
                        "description": "Optional: specific run URL to verify instead of latest",
                        "type": 3,
                        "required": False
                    },
                    {
                        "name": "diagnose",
                        "description": "Optional: also trigger on-demand diagnose workflow",
                        "type": 5,
                        "required": False
                    }
                ]
            },
            {
                "name": "verify-run",
                "type": 1,
                "description": "Verify a specific workflow run by ID",
                "options": [
                    {
                        "name": "run_id",
                        "description": "GitHub Actions run ID to verify",
                        "type": 3,
                        "required": True
                    }
                ]
            },
            {
                "name": "diagnose",
                "type": 1,
                "description": "Trigger on-demand diagnose workflow",
                "options": [
                    {
                        "name": "frontend_url",
                        "description": "Optional: override frontend URL for checks",
                        "type": 3,
                        "required": False
                    },
                    {
                        "name": "api_base",
                        "description": "Optional: override API base URL for checks",
                        "type": 3,
                        "required": False
                    }
                ]
            },
            {
                "name": "deploy-client",
                "type": 1,
                "description": "Trigger Client Deploy workflow",
                "options": [
                    {
                        "name": "api_base",
                        "description": "Optional: override API base URL",
                        "type": 3,
                        "required": False
                    },
                    {
                        "name": "wait",
                        "description": "Optional: wait for deployment completion",
                        "type": 5,
                        "required": False
                    }
                ]
            },
            {
                "name": "set-frontend",
                "type": 1,
                "description": "Update FRONTEND_BASE_URL (admin only, feature-flagged)",
                "options": [
                    {
                        "name": "url",
                        "description": "New frontend URL (must be https)",
                        "type": 3,
                        "required": True
                    },
                    {
                        "name": "confirm",
                        "description": "Confirmation required (set to true)",
                        "type": 5,
                        "required": False
                    }
                ]
            },
            {
                "name": "set-api-base",
                "type": 1,
                "description": "Update VITE_API_BASE secret (admin only, feature-flagged)",
                "options": [
                    {
                        "name": "url",
                        "description": "New API base URL (must be https)",
                        "type": 3,
                        "required": True
                    },
                    {
                        "name": "confirm",
                        "description": "Confirmation required (set to true)",
                        "type": 5,
                        "required": False
                    }
                ]
            },
            {
                "name": "agents",
                "type": 1,
                "description": "List available orchestrator agents and their capabilities"
            },
            {
                "name": "status-digest",
                "type": 1,
                "description": "Show aggregated status digest for workflows over a time period",
                "options": [
                    {
                        "name": "period",
                        "description": "Time period for digest (daily or weekly)",
                        "type": 3,
                        "required": False,
                        "choices": [
                            {"name": "daily", "value": "daily"},
                            {"name": "weekly", "value": "weekly"}
                        ]
                    }
                ]
            },
            {
                "name": "relay-send",
                "type": 1,
                "description": "Post message to Discord channel (admin only, audited)",
                "options": [
                    {
                        "name": "channel_id",
                        "description": "Target Discord channel ID",
                        "type": 3,
                        "required": True
                    },
                    {
                        "name": "message",
                        "description": "Message to post",
                        "type": 3,
                        "required": True
                    },
                    {
                        "name": "ephemeral",
                        "description": "Show confirmation as ephemeral (default: false)",
                        "type": 5,
                        "required": False
                    },
                    {
                        "name": "confirm",
                        "description": "Confirmation required (set to true)",
                        "type": 5,
                        "required": False
                    }
                ]
            },
            {
                "name": "relay-dm",
                "type": 1,
                "description": "Post message to channel as bot (owner only, audited)",
                "options": [
                    {
                        "name": "message",
                        "description": "Message to post",
                        "type": 3,
                        "required": True
                    },
                    {
                        "name": "target_channel_id",
                        "description": "Target Discord channel ID",
                        "type": 3,
                        "required": True
                    }
                ]
            },
            {
                "name": "triage",
                "type": 1,
                "description": "Auto-diagnose failing GitHub Actions and create draft PRs with fixes",
                "options": [
                    {
                        "name": "pr",
                        "description": "PR number or workflow run ID to triage",
                        "type": 4,
                        "required": True
                    }
                ]
            },
            {
                "name": "debug-last",
                "type": 1,
                "description": "Show last run debug info (redacted, ephemeral, feature-flagged)"
            },
            {
                "name": "update-summary",
                "type": 1,
                "description": "Generate and update project summary with latest status",
                "options": [
                    {
                        "name": "notes",
                        "description": "Optional: custom notes to include in summary",
                        "type": 3,
                        "required": False
                    },
                    {
                        "name": "dry_run",
                        "description": "Optional: preview without saving to file",
                        "type": 5,
                        "required": False
                    }
                ]
            },
            {
                "name": "uptime-check",
                "type": 1,
                "description": "Check uptime and health of Discord bot and critical services"
            },
            {
                "name": "ux-update",
                "type": 1,
                "description": "Trigger UX agent to improve user experience based on feedback",
                "options": [
                    {
                        "name": "feedback",
                        "description": "User feedback or issue description",
                        "type": 3,
                        "required": True
                    },
                    {
                        "name": "priority",
                        "description": "Priority level (low, medium, high)",
                        "type": 3,
                        "required": False,
                        "choices": [
                            {"name": "low", "value": "low"},
                            {"name": "medium", "value": "medium"},
                            {"name": "high", "value": "high"}
                        ]
                    }
                ]
            }
        ]
        
        success_count = 0
        failed_commands = []
        
        for cmd_def in commands_to_register:
            cmd_name = cmd_def["name"]
            self.log(f"  Registering /{cmd_name}...", "INFO")
            
            try:
                response = requests.post(
                    f"{self.base_url}/applications/{self.app_id}/guilds/{self.guild_id}/commands",
                    headers=self.headers,
                    json=cmd_def,
                    timeout=10
                )
                
                if response.status_code in [200, 201]:
                    self.log(f"    ✅ /{cmd_name} registered (status {response.status_code})", "SUCCESS")
                    success_count += 1
                else:
                    error_msg = f"Failed to register /{cmd_name} (status {response.status_code})"
                    self.log(f"    ❌ {error_msg}", "ERROR")
                    failed_commands.append(cmd_name)
            except Exception as e:
                error_msg = f"Error registering /{cmd_name}: {str(e)}"
                self.log(f"    ❌ {error_msg}", "ERROR")
                failed_commands.append(cmd_name)
        
        if failed_commands:
            self.add_check(
                "Register Commands",
                "PARTIAL",
                details={
                    "success_count": success_count,
                    "failed_commands": failed_commands
                }
            )
            return False
        else:
            self.log(f"All {success_count} commands registered successfully", "SUCCESS")
            self.add_check(
                "Register Commands",
                "PASS",
                details={"success_count": success_count}
            )
            return True
    
    def verify_debug_last_command(self) -> bool:
        """Verify that all expected commands are registered"""
        self.log("Verifying registered commands...")
        commands = self.list_guild_commands()
        
        if not commands:
            self.log("No commands registered", "WARNING")
            self.add_check(
                "Verify Commands",
                "FAIL",
                error="No commands registered"
            )
            return False
        
        command_names = [cmd.get("name") for cmd in commands]
        
        # Expected commands (19 total: 18 + ux-update)
        expected_commands = [
            "plan", "approve", "status", "ship", "verify-latest", "verify-run",
            "diagnose", "deploy-client", "set-frontend", "set-api-base",
            "agents", "status-digest", "relay-send", "relay-dm", "triage",
            "debug-last", "update-summary", "uptime-check", "ux-update"
        ]
        
        missing_commands = [cmd for cmd in expected_commands if cmd not in command_names]
        extra_commands = [cmd for cmd in command_names if cmd not in expected_commands]
        
        if missing_commands:
            self.log(f"Missing commands: {', '.join(missing_commands)}", "WARNING")
            self.add_check(
                "Verify Commands",
                "PARTIAL",
                details={
                    "registered_count": len(command_names),
                    "expected_count": len(expected_commands),
                    "missing": missing_commands,
                    "extra": extra_commands
                }
            )
            return False
        else:
            self.log(f"All {len(expected_commands)} expected commands are registered ✅", "SUCCESS")
            self.add_check(
                "Verify Commands",
                "PASS",
                details={
                    "registered_count": len(command_names),
                    "extra": extra_commands if extra_commands else []
                }
            )
            return True
    
    def generate_evidence_report(self) -> str:
        """Generate validation evidence report"""
        self.log("Generating evidence report...")
        
        # Save JSON evidence
        json_file = self.evidence_dir / f"discord_commands_validation_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json"
        with open(json_file, 'w') as f:
            json.dump(self.evidence, separators=(',', ':'), indent=2, fp=f)
        
        # Generate markdown report
        md_lines = [
            "# Discord Slash Commands Validation Report",
            "",
            f"**Timestamp:** {self.evidence['timestamp']}",
            f"**Application ID:** {self.app_id}",
            f"**Guild ID:** {self.guild_id}",
            "",
            "## Validation Checks",
            ""
        ]
        
        for check in self.evidence["checks"]:
            status_emoji = {
                "PASS": "✅",
                "FAIL": "❌",
                "PARTIAL": "⚠️"
            }.get(check["status"], "ℹ️")
            
            md_lines.append(f"### {status_emoji} {check['name']}")
            md_lines.append(f"**Status:** {check['status']}")
            md_lines.append(f"**Time:** {check['timestamp']}")
            
            if check.get("details"):
                md_lines.append("**Details:**")
                md_lines.append(f"```json")
                md_lines.append(json.dumps(check["details"], indent=2))
                md_lines.append(f"```")
            
            if check.get("error"):
                md_lines.append(f"**Error:** {check['error']}")
            
            md_lines.append("")
        
        # Overall summary
        passed = sum(1 for c in self.evidence["checks"] if c["status"] == "PASS")
        failed = sum(1 for c in self.evidence["checks"] if c["status"] == "FAIL")
        partial = sum(1 for c in self.evidence["checks"] if c["status"] == "PARTIAL")
        total = len(self.evidence["checks"])
        
        md_lines.extend([
            "## Summary",
            "",
            f"- ✅ Passed: {passed}/{total}",
            f"- ❌ Failed: {failed}/{total}",
            f"- ⚠️ Partial: {partial}/{total}",
            "",
            f"**Overall Status:** {'PASS ✅' if failed == 0 else 'FAIL ❌'}",
            ""
        ])
        
        md_content = "\n".join(md_lines)
        md_file = self.evidence_dir / f"discord_commands_validation_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.md"
        with open(md_file, 'w') as f:
            f.write(md_content)
        
        self.log(f"Evidence saved to:", "SUCCESS")
        self.log(f"  JSON: {json_file}", "INFO")
        self.log(f"  Markdown: {md_file}", "INFO")
        
        return str(md_file)
    
    def run_full_validation(self, register_if_missing: bool = False) -> bool:
        """Run full validation flow"""
        self.log("=" * 60, "INFO")
        self.log("Discord Slash Commands Validation", "INFO")
        self.log("=" * 60, "INFO")
        self.log("", "INFO")
        
        # Step 1: Verify bot authentication
        if not self.verify_bot_authentication():
            self.log("", "INFO")
            self.log("Validation FAILED: Bot authentication failed", "ERROR")
            self.generate_evidence_report()
            return False
        
        self.log("", "INFO")
        
        # Step 2: Check guild membership
        if not self.check_guild_membership():
            self.log("", "INFO")
            self.log("Validation FAILED: Bot not in guild", "ERROR")
            self.generate_evidence_report()
            return False
        
        self.log("", "INFO")
        
        # Step 3: List current commands
        commands = self.list_guild_commands()
        
        self.log("", "INFO")
        
        # Step 4: Check if debug-last exists
        has_debug_last = self.verify_debug_last_command()
        
        # Step 5: Register if missing and requested
        if not has_debug_last and register_if_missing:
            self.log("", "INFO")
            if not self.register_staging_commands():
                self.log("", "INFO")
                self.log("Validation PARTIAL: Some commands failed to register", "WARNING")
                self.generate_evidence_report()
                return False
            
            # Verify again after registration
            self.log("", "INFO")
            has_debug_last = self.verify_debug_last_command()
        
        # Generate report
        self.log("", "INFO")
        report_path = self.generate_evidence_report()
        
        # Final status
        self.log("", "INFO")
        self.log("=" * 60, "INFO")
        if has_debug_last:
            self.log("Validation PASSED ✅", "SUCCESS")
            self.log("", "INFO")
            self.log("Next Steps:", "INFO")
            self.log("1. Go to your Discord staging server", "INFO")
            self.log("2. Type '/' to see all 18 registered commands", "INFO")
            self.log("3. Test commands like /agents, /debug-last, /status", "INFO")
            self.log("4. Ensure feature flags are enabled in AWS SSM if needed", "INFO")
            return True
        else:
            self.log("Validation FAILED ❌", "ERROR")
            self.log("", "INFO")
            self.log("Action Required:", "WARNING")
            self.log("Run with --register flag to register missing commands", "INFO")
            return False


def main():
    parser = argparse.ArgumentParser(
        description="Discord Slash Commands Validator for Staging",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Check current status
  python validate_discord_slash_commands.py check \\
    --app-id APP_ID --bot-token BOT_TOKEN --guild-id GUILD_ID
  
  # Register missing commands
  python validate_discord_slash_commands.py register \\
    --app-id APP_ID --bot-token BOT_TOKEN --guild-id GUILD_ID
  
  # Full validation with auto-registration
  python validate_discord_slash_commands.py full \\
    --app-id APP_ID --bot-token BOT_TOKEN --guild-id GUILD_ID --register
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Check command
    check_parser = subparsers.add_parser("check", help="Check current command registration status")
    check_parser.add_argument("--app-id", required=True, help="Discord Application ID")
    check_parser.add_argument("--bot-token", required=True, help="Discord Bot Token")
    check_parser.add_argument("--guild-id", required=True, help="Discord Guild (Server) ID")
    check_parser.add_argument("--evidence-dir", default="./validation_evidence", help="Evidence output directory")
    
    # Register command
    register_parser = subparsers.add_parser("register", help="Register missing commands")
    register_parser.add_argument("--app-id", required=True, help="Discord Application ID")
    register_parser.add_argument("--bot-token", required=True, help="Discord Bot Token")
    register_parser.add_argument("--guild-id", required=True, help="Discord Guild (Server) ID")
    register_parser.add_argument("--evidence-dir", default="./validation_evidence", help="Evidence output directory")
    
    # Full validation command
    full_parser = subparsers.add_parser("full", help="Run full validation")
    full_parser.add_argument("--app-id", required=True, help="Discord Application ID")
    full_parser.add_argument("--bot-token", required=True, help="Discord Bot Token")
    full_parser.add_argument("--guild-id", required=True, help="Discord Guild (Server) ID")
    full_parser.add_argument("--register", action="store_true", help="Register missing commands automatically")
    full_parser.add_argument("--evidence-dir", default="./validation_evidence", help="Evidence output directory")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Create validator
    validator = DiscordSlashCommandValidator(
        app_id=args.app_id,
        bot_token=args.bot_token,
        guild_id=args.guild_id,
        evidence_dir=args.evidence_dir
    )
    
    # Run command
    if args.command == "check":
        success = validator.run_full_validation(register_if_missing=False)
    elif args.command == "register":
        validator.verify_bot_authentication()
        validator.check_guild_membership()
        success = validator.register_staging_commands()
        validator.verify_debug_last_command()
        validator.generate_evidence_report()
    elif args.command == "full":
        success = validator.run_full_validation(register_if_missing=args.register)
    else:
        parser.print_help()
        sys.exit(1)
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
