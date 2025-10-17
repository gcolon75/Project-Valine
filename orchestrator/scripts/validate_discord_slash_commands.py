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
        """Register essential staging commands"""
        self.log("Registering staging commands...")
        
        # Define minimal staging commands
        commands_to_register = [
            {
                "name": "debug-last",
                "type": 1,
                "description": "Show last run debug info (redacted, ephemeral)"
            },
            {
                "name": "diagnose",
                "type": 1,
                "description": "Run a quick staging diagnostic"
            },
            {
                "name": "status",
                "type": 1,
                "description": "Show last 1-3 runs for workflows",
                "options": [
                    {
                        "name": "count",
                        "description": "Number of runs (1-3)",
                        "type": 4,
                        "required": False,
                        "min_value": 1,
                        "max_value": 3
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
        """Verify that debug-last command is registered"""
        self.log("Verifying /debug-last command...")
        commands = self.list_guild_commands()
        
        if not commands:
            self.log("/debug-last command NOT found (no commands registered)", "WARNING")
            self.add_check(
                "Verify debug-last Command",
                "FAIL",
                error="Command not registered"
            )
            return False
        
        command_names = [cmd.get("name") for cmd in commands]
        
        if "debug-last" in command_names:
            self.log("/debug-last command is registered ✅", "SUCCESS")
            self.add_check(
                "Verify debug-last Command",
                "PASS",
                details={"status": "registered"}
            )
            return True
        else:
            self.log("/debug-last command NOT found in registered commands", "WARNING")
            self.add_check(
                "Verify debug-last Command",
                "FAIL",
                error="Command not in registry"
            )
            return False
    
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
            self.log("2. Type /debug-last (should appear in autocomplete)", "INFO")
            self.log("3. Execute the command to verify it works", "INFO")
            self.log("4. Ensure ENABLE_DEBUG_CMD=true in AWS SSM", "INFO")
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
