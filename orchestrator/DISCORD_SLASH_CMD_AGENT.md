# Discord Slash Command Registration & Fixes Agent (Staging)

A comprehensive agent for managing Discord slash commands in staging environments. Ensures commands are registered, visible, and working correctly with full validation and remediation support.

## Features

✅ **Preflight Validation**
- Bot token authentication
- Guild membership verification
- Automatic guild discovery (if not specified)

✅ **Command Management**
- List existing commands
- Compare with expected commands
- Detect missing, extra, and outdated commands
- Idempotent registration with PUT (guild-level only)

✅ **Rate Limiting & Safety**
- Automatic rate limit detection and backoff
- Token redaction in logs (shows last 4 chars only)
- Guild commands only (never global)
- 60s Discord propagation wait

✅ **Comprehensive Deliverables**
- `commands_diff.json` - Detailed comparison data
- `before_after_commands.md` - Readable before/after report
- `remediation_playbook.md` - Copy-paste curl commands & SSM guidance
- `evidence_*.json` - Complete execution trace

## Installation

```bash
cd orchestrator
pip install -r requirements.txt
```

## Quick Start

### 1. Set Environment Variables

```bash
export DISCORD_APPLICATION_ID="your_app_id"
export DISCORD_BOT_TOKEN="your_bot_token"
export DISCORD_GUILD_ID_STAGING="your_guild_id"  # Optional, can be discovered
```

### 2. Check Current Status (No Changes)

```bash
python register_slash_commands_agent.py check \
  --app-id $DISCORD_APPLICATION_ID \
  --bot-token $DISCORD_BOT_TOKEN \
  --guild-id $DISCORD_GUILD_ID_STAGING
```

### 3. Register Missing Commands

```bash
python register_slash_commands_agent.py register \
  --app-id $DISCORD_APPLICATION_ID \
  --bot-token $DISCORD_BOT_TOKEN \
  --guild-id $DISCORD_GUILD_ID_STAGING
```

### 4. Full Validation with Auto-Registration

```bash
python register_slash_commands_agent.py full \
  --app-id $DISCORD_APPLICATION_ID \
  --bot-token $DISCORD_BOT_TOKEN \
  --guild-id $DISCORD_GUILD_ID_STAGING \
  --register
```

## CLI Commands

### `check`
Validates current state without making changes:
- ✅ Verifies bot authentication
- ✅ Checks guild membership
- ✅ Lists existing commands
- ✅ Compares with expected commands
- ✅ Generates deliverables
- ❌ Does NOT register commands

### `register`
Registers missing and updates outdated commands:
- ✅ All checks from `check` command
- ✅ Registers commands via PUT (idempotent)
- ✅ Waits for Discord propagation (60s)
- ✅ Re-validates after registration

### `full`
Complete workflow with optional registration:
- ✅ All preflight checks
- ✅ Command comparison
- ✅ Optional registration (with `--register` flag)
- ✅ Handler health verification (informational)
- ✅ Complete deliverables

## CLI Options

### Required (or via environment)
- `--app-id` - Discord Application ID (env: `DISCORD_APPLICATION_ID`)
- `--bot-token` - Discord Bot Token (env: `DISCORD_BOT_TOKEN`)

### Optional
- `--guild-id` - Discord Guild ID (env: `DISCORD_GUILD_ID_STAGING`)
  - If omitted and bot is in single guild: auto-discovers
  - If omitted and bot is in multiple guilds: prompts for selection
- `--expected-commands` - Path to JSON file with custom command definitions
- `--evidence-dir` - Output directory (default: `./discord_cmd_evidence`)

### Flags (full command only)
- `--register` - Enable command registration
- `--no-verify-handlers` - Skip handler verification step

## Expected Commands (Default)

The agent validates these commands by default:

```json
[
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
        "required": false,
        "min_value": 1,
        "max_value": 3
      }
    ]
  }
]
```

### Custom Commands

To use custom commands, create a JSON file:

```bash
cat > custom_commands.json <<EOF
[
  {
    "name": "my-cmd",
    "type": 1,
    "description": "My custom command"
  }
]
EOF

python register_slash_commands_agent.py full \
  --expected-commands custom_commands.json \
  --register
```

## Programmatic Usage

```python
from app.agents.discord_slash_cmd_agent import DiscordSlashCommandAgent

# Create agent
agent = DiscordSlashCommandAgent(
    app_id="your_app_id",
    bot_token="your_bot_token",
    guild_id="your_guild_id",  # Optional
    expected_commands=None,  # Optional, uses defaults
    evidence_dir="./evidence"
)

# Run full flow
result = agent.run_full_flow(
    register_commands=True,  # Set to False for check-only
    verify_handlers=True
)

# Check result
if result["status"] == "SUCCESS":
    print("✅ All commands validated!")
    print(f"Deliverables: {result['deliverables']}")
elif result["status"] == "PARTIAL":
    print("⚠️  Partial success with warnings")
    print(f"Warnings: {result['warnings']}")
else:
    print("❌ Failed")
    print(f"Errors: {result['errors']}")
```

## Deliverables

After each run, the agent generates:

### 1. Evidence JSON (`evidence_TIMESTAMP.json`)
Complete execution trace with:
- All steps taken
- Success/failure status
- Warnings and errors
- Timing information

### 2. Commands Diff (`commands_diff_TIMESTAMP.json`)
Structured comparison data:
```json
{
  "timestamp": "2024-...",
  "guild_id": "...",
  "comparison": {
    "missing": ["cmd1", "cmd2"],
    "extra": ["old-cmd"],
    "outdated": ["cmd3"],
    "total_expected": 3,
    "total_existing": 2
  },
  "existing_commands": [...],
  "expected_commands": [...]
}
```

### 3. Before/After Markdown (`before_after_commands_TIMESTAMP.md`)
Human-readable comparison with:
- Summary statistics
- Before state (existing commands)
- After state (expected commands)
- Changes required

### 4. Remediation Playbook (`remediation_playbook_TIMESTAMP.md`)
Copy-paste ready commands:
- curl commands for manual registration
- Bot invite URL with proper scopes
- SSM parameter setup commands
- Troubleshooting guide

## Rate Limiting

The agent handles Discord rate limits (429) automatically:

1. Detects 429 response
2. Reads `Retry-After` header
3. Waits specified duration
4. Retries request once
5. Logs warning if rate limited

Default backoff: 60 seconds

## Security & Guardrails

✅ **Token Redaction**
- Bot tokens shown as `***last4` in logs
- Full tokens never printed to console
- Evidence files contain redacted tokens only

✅ **Guild-Level Only**
- Uses `/guilds/{guild_id}/commands` endpoint
- Never uses global commands endpoint
- Instant visibility (no 1-hour wait)

✅ **Idempotent Registration**
- Uses PUT to overwrite commands
- No duplicate command issues
- Safe to re-run multiple times

✅ **403/Missing Scope Detection**
- Generates invite URL if bot not in guild
- Includes required scopes: `bot` + `applications.commands`
- Clear error messages and remediation steps

## Troubleshooting

### Commands not appearing in autocomplete

**Cause:** Discord propagation delay or client cache

**Fix:**
1. Wait 60 seconds after registration
2. Refresh Discord client (Ctrl+R / Cmd+R)
3. Restart Discord if still not visible

### 401 Unauthorized

**Cause:** Invalid bot token

**Fix:**
1. Verify token in Discord Developer Portal
2. Regenerate token if compromised
3. Update SSM parameter: `/valine/staging/DISCORD_BOT_TOKEN`

### 403 Forbidden

**Cause:** Bot missing permissions or not in guild

**Fix:**
1. Check bot invite URL from playbook
2. Ensure scopes: `bot` + `applications.commands`
3. Re-invite bot if needed

### 429 Rate Limited

**Cause:** Too many API requests

**Fix:**
- Agent automatically handles this
- If repeated: wait longer between runs
- Use PUT (overwrites all) instead of POST (creates one)

### Guild discovery shows multiple guilds

**Cause:** Bot is member of multiple servers

**Fix:**
1. Specify `--guild-id` explicitly
2. Or remove bot from test guilds
3. Or select guild ID from list provided

## SSM Parameter Setup

Commands are in the remediation playbook. Quick reference:

```bash
# Enable debug command
aws ssm put-parameter \
  --name /valine/staging/ENABLE_DEBUG_CMD \
  --value "true" \
  --type String \
  --overwrite

# Bot token (secure string)
aws ssm put-parameter \
  --name /valine/staging/DISCORD_BOT_TOKEN \
  --value "YOUR_BOT_TOKEN" \
  --type SecureString \
  --overwrite

# Guild ID
aws ssm put-parameter \
  --name /valine/staging/DISCORD_GUILD_ID \
  --value "YOUR_GUILD_ID" \
  --type String \
  --overwrite
```

## Manual Verification Steps

After registration, manually verify:

1. **Open Discord staging server**
2. **Type `/` in text channel**
3. **Verify commands in autocomplete:**
   - `/debug-last`
   - `/diagnose`
   - `/status`
4. **Execute `/debug-last`**
   - Should respond ephemerally (only you see it)
   - Should show redacted debug info
5. **Execute `/status`**
   - Should show workflow run status
   - Should respond with embed
6. **Check CloudWatch Logs**
   - Look for interaction events
   - Verify signature validation
   - Check for 2xx responses

## Exit Codes

- `0` - SUCCESS: All validations passed
- `1` - FAIL: Critical error occurred
- `2` - PARTIAL: Completed with warnings
- `130` - Interrupted by user (Ctrl+C)

## Testing

Run the test suite:

```bash
cd orchestrator
python -m pytest tests/test_discord_slash_cmd_agent.py -v
```

All tests (25 test cases):
- Token redaction
- Bot authentication
- Guild discovery and verification
- Command listing and comparison
- Registration (success and failure)
- Rate limit handling
- Deliverable generation
- Full flow (check-only and with registration)

## Architecture

```
DiscordSlashCommandAgent
├── Preflight
│   ├── preflight_validate_bot()      # GET /users/@me
│   └── preflight_discover_guild()    # GET /users/@me/guilds
├── Comparison
│   ├── list_existing_commands()      # GET /guilds/{id}/commands
│   └── compare_commands()            # Diff logic
├── Registration
│   └── register_commands()           # PUT /guilds/{id}/commands
├── Verification
│   └── verify_handler_health()       # Informational
└── Deliverables
    └── generate_deliverables()       # JSON, MD, playbook
```

## Integration with Orchestrator

The agent can be integrated into the orchestrator workflow:

```python
from app.agents.discord_slash_cmd_agent import DiscordSlashCommandAgent

# In your orchestrator handler
def handle_discord_setup(event):
    agent = DiscordSlashCommandAgent(
        app_id=os.environ["DISCORD_APPLICATION_ID"],
        bot_token=os.environ["DISCORD_BOT_TOKEN"],
        guild_id=os.environ.get("DISCORD_GUILD_ID_STAGING")
    )
    
    result = agent.run_full_flow(register_commands=True)
    
    return {
        "status": result["status"],
        "playbook": result["deliverables"]["playbook"]
    }
```

## Discord API References

- [Discord API v10 Documentation](https://discord.com/developers/docs/intro)
- [Application Commands](https://discord.com/developers/docs/interactions/application-commands)
- [Guild Commands](https://discord.com/developers/docs/interactions/application-commands#create-guild-application-command)
- [Rate Limits](https://discord.com/developers/docs/topics/rate-limits)

## Related Files

- `app/agents/discord_slash_cmd_agent.py` - Agent implementation
- `register_slash_commands_agent.py` - CLI interface
- `tests/test_discord_slash_cmd_agent.py` - Test suite
- `scripts/validate_discord_slash_commands.py` - Legacy validator (deprecated)
- `app/services/discord.py` - Discord service utilities

## License

Part of Project Valine orchestrator system.

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review deliverables (especially playbook)
3. Check Discord Developer Portal
4. Review CloudWatch logs for Lambda handlers
