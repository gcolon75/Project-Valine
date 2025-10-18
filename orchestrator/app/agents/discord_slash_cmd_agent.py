"""
Discord Slash Command Registration & Fixes Agent (Staging)

This agent ensures Discord slash commands are registered and visible in the staging guild,
verifies handlers respond, ephemeral/redaction behavior works, and provides remediation playbook.

Key Features:
- Preflight validation (bot token, guild discovery)
- Command listing and comparison
- Safe command registration (guild-level for staging only)
- Rate limit handling with backoff
- Handler health verification
- Comprehensive deliverables (diff, playbook, evidence)

Usage:
    from app.agents.discord_slash_cmd_agent import DiscordSlashCommandAgent
    
    agent = DiscordSlashCommandAgent(
        app_id="DISCORD_APPLICATION_ID",
        bot_token="DISCORD_BOT_TOKEN",
        guild_id="DISCORD_GUILD_ID_STAGING"  # Optional, can be discovered
    )
    
    # Run full validation
    result = agent.run_full_flow(register_commands=False)
"""

import os
import json
import time
import requests
from typing import Dict, List, Optional, Any, Tuple, Union
from datetime import datetime, timezone
from pathlib import Path


class DiscordSlashCommandAgent:
    """
    Discord Slash Command Registration & Fixes Agent for Staging.
    
    This agent validates and registers Discord slash commands for staging environments.
    It uses guild commands (instant) for staging only - never global commands.
    """
    
    # Discord API configuration
    BASE_URL = "https://discord.com/api/v10"
    RATE_LIMIT_BACKOFF_SECONDS = 60
    DISCORD_PROPAGATION_MS = 60000  # 60 seconds default
    
    # Expected staging commands
    DEFAULT_EXPECTED_COMMANDS = [
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
        },
        {
            "name": "triage",
            "type": 1,
            "description": "Auto-diagnose and fix failed PR/workflow runs",
            "options": [
                {
                    "name": "pr",
                    "description": "PR number or workflow run ID",
                    "type": 4,
                    "required": True
                },
                {
                    "name": "auto_fix",
                    "description": "Automatically create fix PR",
                    "type": 5,
                    "required": False
                },
                {
                    "name": "allow_invasive",
                    "description": "Allow changes >10 files or >500 lines",
                    "type": 5,
                    "required": False
                }
            ]
        }
    ]
    
    def __init__(
        self,
        app_id: str,
        bot_token: str,
        guild_id: Optional[str] = None,
        expected_commands: Optional[List[Dict]] = None,
        evidence_dir: str = "./discord_cmd_evidence"
    ):
        """
        Initialize Discord Slash Command Agent.
        
        Args:
            app_id: Discord Application ID
            bot_token: Discord Bot Token (will be redacted in logs)
            guild_id: Discord Guild ID (optional, can be discovered)
            expected_commands: List of expected command definitions
            evidence_dir: Directory to store evidence and deliverables
        """
        self.app_id = app_id
        self.bot_token = bot_token
        self.guild_id = guild_id
        self.expected_commands = expected_commands or self.DEFAULT_EXPECTED_COMMANDS
        self.evidence_dir = Path(evidence_dir)
        self.evidence_dir.mkdir(exist_ok=True, parents=True)
        
        # Request headers
        self.headers = {
            "Authorization": f"Bot {bot_token}",
            "Content-Type": "application/json",
            "User-Agent": "ProjectValine-DiscordSlashCmdAgent/1.0"
        }
        
        # Evidence collection
        self.evidence: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "app_id": app_id,
            "guild_id": guild_id,
            "bot_token_last4": self._redact_token(bot_token),
            "steps": [],
            "warnings": [],
            "errors": []
        }
        
        # Bot info (populated during preflight)
        self.bot_info = None
        self.guild_info = None
    
    @staticmethod
    def _redact_token(token: str) -> str:
        """Redact token showing only last 4 characters."""
        if not token or len(token) <= 4:
            return "****"
        return f"***{token[-4:]}"
    
    def _log(self, message: str, level: str = "INFO"):
        """Log message with timestamp and emoji."""
        timestamp = datetime.now(timezone.utc).strftime("%H:%M:%S")
        emoji = {
            "INFO": "ℹ️",
            "SUCCESS": "✅",
            "WARNING": "⚠️",
            "ERROR": "❌",
            "DEBUG": "🔍"
        }.get(level, "  ")
        print(f"[{timestamp}] {emoji} {message}")
    
    def _add_step(self, name: str, status: str, details: Any = None, error: Optional[str] = None):
        """Add a step to evidence."""
        step = {
            "name": name,
            "status": status,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        if details:
            step["details"] = details
        if error:
            step["error"] = error
        self.evidence["steps"].append(step)
    
    def _add_warning(self, message: str):
        """Add a warning to evidence."""
        self.evidence["warnings"].append({
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        self._log(message, "WARNING")
    
    def _add_error(self, message: str):
        """Add an error to evidence."""
        self.evidence["errors"].append({
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        self._log(message, "ERROR")
    
    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Union[Dict, List]] = None,
        retry_on_429: bool = True
    ) -> Tuple[Optional[Any], Optional[str]]:
        """
        Make an API request with rate limit handling.
        
        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint (without base URL)
            data: Optional request data
            retry_on_429: Whether to retry on rate limit
            
        Returns:
            Tuple of (response_data, error_message)
        """
        url = f"{self.BASE_URL}{endpoint}"
        
        try:
            if method == "GET":
                response = requests.get(url, headers=self.headers, timeout=10)
            elif method == "POST":
                response = requests.post(url, headers=self.headers, json=data, timeout=10)
            elif method == "PUT":
                response = requests.put(url, headers=self.headers, json=data, timeout=10)
            elif method == "DELETE":
                response = requests.delete(url, headers=self.headers, timeout=10)
            else:
                return None, f"Unsupported method: {method}"
            
            # Handle rate limiting
            if response.status_code == 429 and retry_on_429:
                retry_after = int(response.headers.get('Retry-After', self.RATE_LIMIT_BACKOFF_SECONDS))
                self._add_warning(f"Rate limited. Waiting {retry_after} seconds...")
                time.sleep(retry_after)
                return self._make_request(method, endpoint, data, retry_on_429=False)
            
            if response.status_code in [200, 201, 204]:
                return response.json() if response.content else {}, None
            else:
                error_msg = f"{method} {endpoint} failed with status {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg += f": {error_data}"
                except:
                    error_msg += f": {response.text[:200]}"
                return None, error_msg
                
        except Exception as e:
            return None, f"Request failed: {str(e)}"
    
    def preflight_validate_bot(self) -> bool:
        """
        Validate bot token by calling GET /users/@me.
        
        Returns:
            True if bot is valid, False otherwise
        """
        self._log("Step 1: Preflight - Validating bot token...")
        
        bot_info, error = self._make_request("GET", "/users/@me")
        
        if error:
            self._add_error(f"Bot authentication failed: {error}")
            self._add_step("Preflight - Bot Authentication", "FAIL", error=error)
            return False
        
        if not bot_info:
            self._add_error("Bot authentication returned no data")
            self._add_step("Preflight - Bot Authentication", "FAIL", error="No bot info")
            return False
        
        self.bot_info = bot_info
        bot_username = bot_info.get("username", "Unknown")
        bot_id = bot_info.get("id", "Unknown")
        
        self._log(f"Bot authenticated: @{bot_username} (ID: {bot_id})", "SUCCESS")
        self._add_step(
            "Preflight - Bot Authentication",
            "PASS",
            details={
                "username": bot_username,
                "id": bot_id,
                "bot": bot_info.get("bot", False)
            }
        )
        return True
    
    def preflight_discover_guild(self) -> bool:
        """
        Discover guild if guild_id not provided by calling GET /users/@me/guilds.
        If multiple guilds found, prompts user to select.
        
        Returns:
            True if guild is discovered/confirmed, False otherwise
        """
        self._log("Step 2: Preflight - Checking guild membership...")
        
        # If guild_id already provided, verify bot is member
        if self.guild_id:
            return self._verify_guild_membership()
        
        # Discover guilds
        guilds, error = self._make_request("GET", "/users/@me/guilds")
        
        if error:
            self._add_error(f"Failed to fetch guilds: {error}")
            self._add_step("Preflight - Guild Discovery", "FAIL", error=error)
            return False
        
        if not guilds:
            self._add_error("Bot is not a member of any guilds")
            self._add_step("Preflight - Guild Discovery", "FAIL", error="No guilds found")
            self._log("", "INFO")
            self._log("ACTION REQUIRED:", "WARNING")
            self._log(f"Invite the bot using this URL:", "INFO")
            invite_url = self._generate_invite_url()
            self._log(invite_url, "INFO")
            return False
        
        # If only one guild, use it automatically
        if len(guilds) == 1:
            self.guild_id = guilds[0]["id"]
            self.guild_info = guilds[0]
            guild_name = guilds[0].get("name", "Unknown")
            self._log(f"Using guild: {guild_name} (ID: {self.guild_id})", "SUCCESS")
            self._add_step(
                "Preflight - Guild Discovery",
                "PASS",
                details={"guild_name": guild_name, "guild_id": self.guild_id}
            )
            self.evidence["guild_id"] = self.guild_id
            return True
        
        # Multiple guilds - need user input
        self._log(f"Bot is member of {len(guilds)} guilds:", "WARNING")
        for i, guild in enumerate(guilds, 1):
            self._log(f"  {i}. {guild.get('name')} (ID: {guild.get('id')})", "INFO")
        
        self._add_step(
            "Preflight - Guild Discovery",
            "PENDING",
            details={
                "guilds": [{"id": g["id"], "name": g.get("name")} for g in guilds],
                "message": "Multiple guilds found. Please specify guild_id parameter."
            }
        )
        self._add_error("guild_id not provided and multiple guilds found")
        return False
    
    def _verify_guild_membership(self) -> bool:
        """Verify bot is member of specified guild."""
        guilds, error = self._make_request("GET", "/users/@me/guilds")
        
        if error:
            self._add_error(f"Failed to verify guild membership: {error}")
            self._add_step("Preflight - Guild Verification", "FAIL", error=error)
            return False
        
        if not guilds:
            self._add_error("Guild membership check returned no data")
            self._add_step("Preflight - Guild Verification", "FAIL", error="No guilds data")
            return False
        
        guild_ids = [g.get("id") for g in guilds]
        
        if self.guild_id not in guild_ids:
            self._add_error(f"Bot is NOT a member of guild {self.guild_id}")
            self._add_step("Preflight - Guild Verification", "FAIL", error="Bot not in guild")
            self._log("", "INFO")
            self._log("ACTION REQUIRED:", "WARNING")
            self._log(f"Invite the bot using this URL:", "INFO")
            invite_url = self._generate_invite_url()
            self._log(invite_url, "INFO")
            return False
        
        guild = next(g for g in guilds if g.get("id") == self.guild_id)
        self.guild_info = guild
        guild_name = guild.get("name", "Unknown")
        
        self._log(f"Bot is member of guild: {guild_name}", "SUCCESS")
        self._add_step(
            "Preflight - Guild Verification",
            "PASS",
            details={"guild_name": guild_name, "guild_id": self.guild_id}
        )
        return True
    
    def _generate_invite_url(self) -> str:
        """Generate bot invite URL with proper scopes."""
        return (
            f"https://discord.com/api/oauth2/authorize"
            f"?client_id={self.app_id}"
            f"&scope=bot%20applications.commands"
            f"&permissions=0"
        )
    
    def list_existing_commands(self) -> Optional[List[Dict]]:
        """
        List currently registered guild commands.
        
        Returns:
            List of command objects or None on error
        """
        self._log("Step 3: Listing existing guild commands...")
        
        commands, error = self._make_request(
            "GET",
            f"/applications/{self.app_id}/guilds/{self.guild_id}/commands"
        )
        
        if error:
            self._add_error(f"Failed to list commands: {error}")
            self._add_step("List Existing Commands", "FAIL", error=error)
            return None
        
        if not commands:
            self._log("No guild commands currently registered", "WARNING")
            self._add_step(
                "List Existing Commands",
                "PASS",
                details={"count": 0, "commands": []}
            )
            return []
        
        self._log(f"Found {len(commands)} registered commands:", "SUCCESS")
        for cmd in commands:
            cmd_name = cmd.get("name", "unknown")
            cmd_desc = cmd.get("description", "")
            self._log(f"  • /{cmd_name} - {cmd_desc}", "INFO")
        
        self._add_step(
            "List Existing Commands",
            "PASS",
            details={
                "count": len(commands),
                "commands": [
                    {"name": c.get("name"), "description": c.get("description")}
                    for c in commands
                ]
            }
        )
        
        return commands
    
    def compare_commands(
        self,
        existing: List[Dict],
        expected: List[Dict]
    ) -> Dict[str, Any]:
        """
        Compare existing commands with expected commands.
        
        Args:
            existing: List of existing command objects
            expected: List of expected command definitions
            
        Returns:
            Comparison result with missing, extra, and outdated commands
        """
        self._log("Step 4: Comparing existing vs expected commands...")
        
        existing_names = {name for cmd in existing if (name := cmd.get("name"))}
        expected_names = {name for cmd in expected if (name := cmd.get("name"))}
        
        missing = expected_names - existing_names
        extra = existing_names - expected_names
        
        # Check for outdated commands (same name but different description/options)
        outdated: List[str] = []
        for exp_cmd in expected:
            exp_name = exp_cmd.get("name")
            if exp_name and exp_name in existing_names:
                exist_cmd = next(c for c in existing if c.get("name") == exp_name)
                # Simple comparison - description only
                if exp_cmd.get("description") != exist_cmd.get("description"):
                    outdated.append(exp_name)
        
        comparison = {
            "missing": list(missing),
            "extra": list(extra),
            "outdated": outdated,
            "total_expected": len(expected),
            "total_existing": len(existing)
        }
        
        # Log results
        if missing:
            self._log(f"Missing commands: {', '.join(missing)}", "WARNING")
        if extra:
            self._log(f"Extra commands: {', '.join(extra)}", "WARNING")
        if outdated:
            self._log(f"Outdated commands: {', '.join(outdated)}", "WARNING")
        if not missing and not extra and not outdated:
            self._log("All commands are up-to-date ✅", "SUCCESS")
        
        self._add_step("Compare Commands", "PASS", details=comparison)
        
        return comparison
    
    def register_commands(self, commands_to_register: List[Dict]) -> Tuple[int, List[str]]:
        """
        Register or update commands using PUT (idempotent).
        
        Args:
            commands_to_register: List of command definitions to register
            
        Returns:
            Tuple of (success_count, failed_command_names)
        """
        self._log("Step 5: Registering/updating commands...")
        
        # Use PUT to overwrite all guild commands (idempotent)
        commands, error = self._make_request(
            "PUT",
            f"/applications/{self.app_id}/guilds/{self.guild_id}/commands",
            data=commands_to_register
        )
        
        if error:
            self._add_error(f"Failed to register commands: {error}")
            self._add_step("Register Commands", "FAIL", error=error)
            return 0, [cmd.get("name", "unknown") for cmd in commands_to_register]
        
        if not commands:
            self._add_error("Command registration returned no data")
            self._add_step("Register Commands", "FAIL", error="No commands data")
            return 0, [cmd.get("name", "unknown") for cmd in commands_to_register]
        
        if not isinstance(commands, list):
            self._add_error(f"Unexpected response type: {type(commands)}")
            self._add_step("Register Commands", "FAIL", error="Invalid response type")
            return 0, [cmd.get("name", "unknown") for cmd in commands_to_register]
        
        success_count = len(commands)
        self._log(f"Successfully registered {success_count} commands", "SUCCESS")
        
        # Wait for Discord propagation
        propagation_sec = self.DISCORD_PROPAGATION_MS / 1000
        self._log(f"Waiting {propagation_sec}s for Discord propagation...", "INFO")
        time.sleep(propagation_sec)
        
        self._add_step(
            "Register Commands",
            "PASS",
            details={"success_count": success_count}
        )
        
        return success_count, []
    
    def verify_handler_health(self) -> bool:
        """
        Verify handler health (basic check).
        
        Note: This is a placeholder. Actual handler verification would require:
        - Testing endpoint if available
        - CloudWatch log analysis
        - Manual test instructions
        
        Returns:
            True (always, as this is informational)
        """
        self._log("Step 6: Handler health verification (informational)...", "INFO")
        
        self._log("Handler verification requires manual testing:", "WARNING")
        self._log("  1. Go to Discord staging server", "INFO")
        self._log("  2. Type '/' and look for commands in autocomplete", "INFO")
        self._log("  3. Execute /debug-last or /status to verify responses", "INFO")
        self._log("  4. Check CloudWatch logs for interaction handling", "INFO")
        self._log("  5. Verify ENABLE_DEBUG_CMD=true in AWS SSM", "INFO")
        
        self._add_step(
            "Handler Health Verification",
            "INFO",
            details={
                "message": "Manual verification required",
                "instructions": [
                    "Test commands in Discord",
                    "Check CloudWatch logs",
                    "Verify SSM parameters"
                ]
            }
        )
        
        return True
    
    def generate_deliverables(
        self,
        existing_commands: List[Dict],
        comparison: Dict[str, Any]
    ) -> Dict[str, str]:
        """
        Generate all deliverables.
        
        Args:
            existing_commands: List of existing commands
            comparison: Comparison result
            
        Returns:
            Dictionary of file paths
        """
        self._log("Step 7: Generating deliverables...")
        
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        
        # 1. Evidence JSON
        evidence_file = self.evidence_dir / f"evidence_{timestamp}.json"
        with open(evidence_file, 'w') as f:
            json.dump(self.evidence, f, indent=2)
        self._log(f"  Generated: {evidence_file.name}", "SUCCESS")
        
        # 2. Commands diff JSON
        diff_file = self.evidence_dir / f"commands_diff_{timestamp}.json"
        diff_data = {
            "timestamp": self.evidence["timestamp"],
            "guild_id": self.guild_id,
            "comparison": comparison,
            "existing_commands": existing_commands,
            "expected_commands": self.expected_commands
        }
        with open(diff_file, 'w') as f:
            json.dump(diff_data, f, indent=2)
        self._log(f"  Generated: {diff_file.name}", "SUCCESS")
        
        # 3. Before/After markdown
        md_file = self.evidence_dir / f"before_after_commands_{timestamp}.md"
        md_content = self._generate_before_after_md(existing_commands, comparison)
        with open(md_file, 'w') as f:
            f.write(md_content)
        self._log(f"  Generated: {md_file.name}", "SUCCESS")
        
        # 4. Remediation playbook
        playbook_file = self.evidence_dir / f"remediation_playbook_{timestamp}.md"
        playbook_content = self._generate_remediation_playbook(comparison)
        with open(playbook_file, 'w') as f:
            f.write(playbook_content)
        self._log(f"  Generated: {playbook_file.name}", "SUCCESS")
        
        return {
            "evidence": str(evidence_file),
            "diff": str(diff_file),
            "before_after": str(md_file),
            "playbook": str(playbook_file)
        }
    
    def _generate_before_after_md(
        self,
        existing: List[Dict],
        comparison: Dict[str, Any]
    ) -> str:
        """Generate before/after markdown report."""
        lines = [
            "# Discord Commands - Before/After Comparison",
            "",
            f"**Timestamp:** {self.evidence['timestamp']}",
            f"**Guild ID:** {self.guild_id}",
            f"**Guild Name:** {self.guild_info.get('name') if self.guild_info else 'Unknown'}",
            "",
            "## Summary",
            "",
            f"- **Expected commands:** {comparison['total_expected']}",
            f"- **Existing commands:** {comparison['total_existing']}",
            f"- **Missing:** {len(comparison['missing'])}",
            f"- **Extra:** {len(comparison['extra'])}",
            f"- **Outdated:** {len(comparison['outdated'])}",
            "",
            "## Before (Existing Commands)",
            ""
        ]
        
        if existing:
            for cmd in existing:
                name = cmd.get("name", "unknown")
                desc = cmd.get("description", "")
                lines.append(f"### `/{name}`")
                lines.append(f"- **Description:** {desc}")
                lines.append(f"- **ID:** {cmd.get('id', 'N/A')}")
                lines.append("")
        else:
            lines.append("*No commands registered*")
            lines.append("")
        
        lines.extend([
            "## After (Expected Commands)",
            ""
        ])
        
        for cmd in self.expected_commands:
            name = cmd.get("name", "unknown")
            desc = cmd.get("description", "")
            status = "✅" if name not in comparison['missing'] else "⚠️ MISSING"
            lines.append(f"### `/{name}` {status}")
            lines.append(f"- **Description:** {desc}")
            options = cmd.get("options")
            if options and isinstance(options, list):
                lines.append(f"- **Options:** {len(options)}")
            lines.append("")
        
        lines.extend([
            "## Changes Required",
            ""
        ])
        
        if comparison['missing']:
            lines.append("### Missing Commands (need registration)")
            for name in comparison['missing']:
                lines.append(f"- `/{name}`")
            lines.append("")
        
        if comparison['extra']:
            lines.append("### Extra Commands (not in expected list)")
            for name in comparison['extra']:
                lines.append(f"- `/{name}`")
            lines.append("")
        
        if comparison['outdated']:
            lines.append("### Outdated Commands (need update)")
            for name in comparison['outdated']:
                lines.append(f"- `/{name}`")
            lines.append("")
        
        if not comparison['missing'] and not comparison['extra'] and not comparison['outdated']:
            lines.append("✅ **No changes required** - all commands are up-to-date!")
            lines.append("")
        
        return "\n".join(lines)
    
    def _generate_remediation_playbook(self, comparison: Dict[str, Any]) -> str:
        """Generate remediation playbook with copy-paste commands."""
        lines = [
            "# Discord Slash Commands - Remediation Playbook",
            "",
            f"**Timestamp:** {self.evidence['timestamp']}",
            f"**Application ID:** {self.app_id}",
            f"**Bot Token:** {self._redact_token(self.bot_token)}",
            f"**Guild ID:** {self.guild_id}",
            "",
            "## Quick Commands",
            "",
            "### 1. List Guilds (if needed)",
            "",
            "```bash",
            "curl -H \"Authorization: Bot $BOT_TOKEN\" \\",
            "  https://discord.com/api/v10/users/@me/guilds",
            "```",
            "",
            "### 2. List Current Guild Commands",
            "",
            "```bash",
            f"curl -H \"Authorization: Bot $BOT_TOKEN\" \\",
            f"  https://discord.com/api/v10/applications/{self.app_id}/guilds/{self.guild_id}/commands",
            "```",
            "",
            "### 3. Register Commands (PUT - Overwrites All)",
            "",
            "```bash",
            f"curl -X PUT \\",
            f"  -H \"Authorization: Bot $BOT_TOKEN\" \\",
            f"  -H \"Content-Type: application/json\" \\",
            f"  -d '{json.dumps(self.expected_commands)}' \\",
            f"  https://discord.com/api/v10/applications/{self.app_id}/guilds/{self.guild_id}/commands",
            "```",
            "",
            "### 4. Delete a Specific Command (if needed)",
            "",
            "```bash",
            "# First get command ID from list, then:",
            f"curl -X DELETE \\",
            f"  -H \"Authorization: Bot $BOT_TOKEN\" \\",
            f"  https://discord.com/api/v10/applications/{self.app_id}/guilds/{self.guild_id}/commands/COMMAND_ID",
            "```",
            "",
            "## Bot Invite URL",
            "",
            "If bot is not in the guild, use this invite URL:",
            "",
            f"```",
            self._generate_invite_url(),
            "```",
            "",
            "**Required Scopes:** `bot` + `applications.commands`",
            "",
            "## SSM Parameter Guidance",
            "",
            "Ensure these SSM parameters are set in AWS:",
            "",
            "```bash",
            "# Enable debug command",
            "aws ssm put-parameter \\",
            "  --name /valine/staging/ENABLE_DEBUG_CMD \\",
            "  --value \"true\" \\",
            "  --type String \\",
            "  --overwrite",
            "",
            "# Discord bot token",
            "aws ssm put-parameter \\",
            "  --name /valine/staging/DISCORD_BOT_TOKEN \\",
            "  --value \"YOUR_BOT_TOKEN\" \\",
            "  --type SecureString \\",
            "  --overwrite",
            "",
            "# Discord guild ID",
            "aws ssm put-parameter \\",
            "  --name /valine/staging/DISCORD_GUILD_ID \\",
            f"  --value \"{self.guild_id}\" \\",
            "  --type String \\",
            "  --overwrite",
            "```",
            "",
            "## Current Status",
            ""
        ]
        
        if comparison['missing']:
            lines.append(f"⚠️  **{len(comparison['missing'])} missing commands:** {', '.join(comparison['missing'])}")
        if comparison['extra']:
            lines.append(f"⚠️  **{len(comparison['extra'])} extra commands:** {', '.join(comparison['extra'])}")
        if comparison['outdated']:
            lines.append(f"⚠️  **{len(comparison['outdated'])} outdated commands:** {', '.join(comparison['outdated'])}")
        if not comparison['missing'] and not comparison['extra'] and not comparison['outdated']:
            lines.append("✅ **All commands are up-to-date!**")
        
        lines.extend([
            "",
            "## Verification Steps",
            "",
            "1. Go to Discord staging server",
            "2. Type `/` in any text channel",
            "3. Verify commands appear in autocomplete",
            "4. Execute `/debug-last` to test ephemeral response",
            "5. Execute `/status` to test handler",
            "6. Check CloudWatch logs for interaction events",
            "",
            "## Troubleshooting",
            "",
            "### Commands not appearing in autocomplete",
            "- Wait 60 seconds after registration (Discord propagation)",
            "- Refresh Discord client (Ctrl+R or Cmd+R)",
            "- Check bot has proper scopes: `bot` + `applications.commands`",
            "",
            "### 403 Forbidden errors",
            "- Verify bot is member of the guild",
            "- Check bot token is valid",
            "- Ensure bot has `applications.commands` scope",
            "",
            "### Rate limiting (429)",
            "- Wait as indicated by `Retry-After` header",
            "- Use PUT to overwrite all commands at once (more efficient)",
            ""
        ])
        
        return "\n".join(lines)
    
    def run_full_flow(
        self,
        register_commands: bool = False,
        verify_handlers: bool = True
    ) -> Dict[str, Any]:
        """
        Run the complete flow.
        
        Args:
            register_commands: Whether to register missing/outdated commands
            verify_handlers: Whether to include handler verification step
            
        Returns:
            Dictionary with status and deliverable file paths
        """
        self._log("=" * 70, "INFO")
        self._log("Discord Slash Command Registration & Fixes Agent (Staging)", "INFO")
        self._log("=" * 70, "INFO")
        self._log("", "INFO")
        
        result: Dict[str, Any] = {
            "status": "SUCCESS",
            "errors": [],
            "warnings": [],
            "deliverables": {}
        }
        
        # Step 1: Preflight - Validate bot
        if not self.preflight_validate_bot():
            result["status"] = "FAIL"
            result["errors"].append("Bot authentication failed")
            return result
        
        self._log("", "INFO")
        
        # Step 2: Preflight - Discover/verify guild
        if not self.preflight_discover_guild():
            result["status"] = "FAIL"
            result["errors"].append("Guild discovery/verification failed")
            return result
        
        self._log("", "INFO")
        
        # Step 3: List existing commands
        existing_commands = self.list_existing_commands()
        if existing_commands is None:
            result["status"] = "FAIL"
            result["errors"].append("Failed to list existing commands")
            return result
        
        self._log("", "INFO")
        
        # Step 4: Compare commands
        comparison = self.compare_commands(existing_commands, self.expected_commands)
        
        self._log("", "INFO")
        
        # Step 5: Register commands if requested
        if register_commands:
            needs_update = (
                comparison['missing'] or
                comparison['outdated'] or
                comparison['total_existing'] == 0
            )
            
            if needs_update:
                success_count, failed = self.register_commands(self.expected_commands)
                
                if failed:
                    result["status"] = "PARTIAL"
                    result["errors"].append(f"Failed to register: {', '.join(failed)}")
                
                self._log("", "INFO")
                
                # Re-list commands after registration
                self._log("Re-checking commands after registration...", "INFO")
                existing_commands = self.list_existing_commands()
                if existing_commands is None:
                    result["status"] = "PARTIAL"
                    result["errors"].append("Failed to re-list commands after registration")
                else:
                    comparison = self.compare_commands(existing_commands, self.expected_commands)
            else:
                self._log("No command updates needed", "SUCCESS")
        else:
            if comparison['missing'] or comparison['outdated']:
                result["warnings"].append(
                    "Commands need updates but --register flag not provided"
                )
        
        self._log("", "INFO")
        
        # Step 6: Verify handlers (informational)
        if verify_handlers:
            self.verify_handler_health()
            self._log("", "INFO")
        
        # Step 7: Generate deliverables
        if existing_commands is None:
            existing_commands = []  # Fallback to empty list if somehow None
        deliverables = self.generate_deliverables(existing_commands, comparison)
        result["deliverables"] = deliverables
        
        # Copy warnings and errors
        result["warnings"].extend([w["message"] for w in self.evidence["warnings"]])
        result["errors"].extend([e["message"] for e in self.evidence["errors"]])
        
        # Final status
        self._log("", "INFO")
        self._log("=" * 70, "INFO")
        
        if result["status"] == "SUCCESS":
            self._log("Agent completed successfully ✅", "SUCCESS")
        elif result["status"] == "PARTIAL":
            self._log("Agent completed with warnings ⚠️", "WARNING")
        else:
            self._log("Agent failed ❌", "ERROR")
        
        self._log("", "INFO")
        self._log("Deliverables:", "INFO")
        for name, path in deliverables.items():
            self._log(f"  {name}: {path}", "INFO")
        
        return result
