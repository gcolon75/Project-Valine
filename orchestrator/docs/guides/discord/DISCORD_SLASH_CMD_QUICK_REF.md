# Discord Slash Command Agent - Quick Reference

## Quick Start

```bash
# Set environment variables
export DISCORD_APPLICATION_ID="your_app_id"
export DISCORD_BOT_TOKEN="your_bot_token"
export DISCORD_GUILD_ID_STAGING="your_guild_id"  # Optional

# Check status
./register_slash_commands.sh check

# Register commands
./register_slash_commands.sh register

# Full flow with auto-registration
./register_slash_commands.sh full --register
```

## CLI Commands

| Command | Description | Registers? |
|---------|-------------|------------|
| `check` | Validate current status | ❌ No |
| `register` | Register missing commands | ✅ Yes |
| `full` | Complete workflow | With `--register` flag |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_APPLICATION_ID` | ✅ Yes | Discord Application ID |
| `DISCORD_BOT_TOKEN` | ✅ Yes | Discord Bot Token |
| `DISCORD_GUILD_ID_STAGING` | ⚠️ Optional | Guild ID (can be discovered) |

## Exit Codes

| Code | Status | Meaning |
|------|--------|---------|
| `0` | SUCCESS | All validations passed |
| `1` | FAIL | Critical error occurred |
| `2` | PARTIAL | Completed with warnings |
| `130` | INTERRUPTED | User cancelled (Ctrl+C) |

## Deliverables Generated

Every run creates in `./discord_cmd_evidence/`:

| File | Description |
|------|-------------|
| `evidence_*.json` | Complete execution trace |
| `commands_diff_*.json` | Structured comparison data |
| `before_after_commands_*.md` | Human-readable diff |
| `remediation_playbook_*.md` | Copy-paste curl commands |

## Default Commands

The agent validates these commands by default:
- `/debug-last` - Show last run debug info (ephemeral)
- `/diagnose` - Run staging diagnostic
- `/status` - Show workflow run status (1-3 runs)

## Common Operations

### Check if commands are registered
```bash
python3 register_slash_commands_agent.py check
```

### Register missing commands
```bash
python3 register_slash_commands_agent.py register
```

### Use custom commands
```bash
# Create custom_commands.json
python3 register_slash_commands_agent.py full \
  --expected-commands custom_commands.json \
  --register
```

### Change output directory
```bash
python3 register_slash_commands_agent.py check \
  --evidence-dir /tmp/evidence
```

## Troubleshooting

### Commands not appearing
1. Wait 60 seconds (Discord propagation)
2. Refresh Discord (Ctrl+R / Cmd+R)
3. Check remediation playbook

### 401 Unauthorized
- Verify bot token is correct
- Check in Discord Developer Portal

### 403 Forbidden
- Bot not in guild → Use invite URL from playbook
- Missing scopes → Ensure `bot` + `applications.commands`

### Multiple guilds found
- Specify `--guild-id` explicitly
- Or remove bot from test guilds

## Quick curl Commands

### List guilds
```bash
curl -H "Authorization: Bot $DISCORD_BOT_TOKEN" \
  https://discord.com/api/v10/users/@me/guilds
```

### List guild commands
```bash
curl -H "Authorization: Bot $DISCORD_BOT_TOKEN" \
  https://discord.com/api/v10/applications/$DISCORD_APPLICATION_ID/guilds/$DISCORD_GUILD_ID_STAGING/commands
```

### Register commands (PUT)
```bash
curl -X PUT \
  -H "Authorization: Bot $DISCORD_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"name":"test","type":1,"description":"Test command"}]' \
  https://discord.com/api/v10/applications/$DISCORD_APPLICATION_ID/guilds/$DISCORD_GUILD_ID_STAGING/commands
```

## Programmatic Usage

```python
from app.agents.discord_slash_cmd_agent import DiscordSlashCommandAgent

# Create agent
agent = DiscordSlashCommandAgent(
    app_id=app_id,
    bot_token=bot_token,
    guild_id=guild_id
)

# Run
result = agent.run_full_flow(register_commands=True)

# Check result
if result["status"] == "SUCCESS":
    print("✅ Success!")
    print(f"Playbook: {result['deliverables']['playbook']}")
```

## File Locations

| File | Path |
|------|------|
| Agent Class | `orchestrator/app/agents/discord_slash_cmd_agent.py` |
| CLI Interface | `orchestrator/register_slash_commands_agent.py` |
| Shell Wrapper | `orchestrator/register_slash_commands.sh` |
| Tests | `orchestrator/tests/test_discord_slash_cmd_agent.py` |
| Documentation | `orchestrator/docs/guides/discord/DISCORD_SLASH_CMD_AGENT.md` |
| Examples | `orchestrator/examples/discord_slash_cmd_example.py` |

## SSM Parameters

```bash
# Enable debug command
aws ssm put-parameter \
  --name /valine/staging/ENABLE_DEBUG_CMD \
  --value "true" \
  --type String \
  --overwrite

# Bot token
aws ssm put-parameter \
  --name /valine/staging/DISCORD_BOT_TOKEN \
  --value "$DISCORD_BOT_TOKEN" \
  --type SecureString \
  --overwrite

# Guild ID
aws ssm put-parameter \
  --name /valine/staging/DISCORD_GUILD_ID \
  --value "$DISCORD_GUILD_ID_STAGING" \
  --type String \
  --overwrite
```

## Verification Steps

After registration:

1. Open Discord staging server
2. Type `/` in text channel
3. Verify commands in autocomplete
4. Execute `/debug-last` (should be ephemeral)
5. Execute `/status` (should show runs)
6. Check CloudWatch logs for interactions

## Support

- **User Guide**: `orchestrator/docs/guides/discord/DISCORD_SLASH_CMD_AGENT.md`
- **Technical Details**: `orchestrator/DISCORD_SLASH_CMD_AGENT_IMPLEMENTATION.md`
- **Quick Reference**: `orchestrator/DISCORD_SLASH_CMD_QUICK_REF.md` (this file)
- **Summary**: `DISCORD_SLASH_CMD_AGENT_SUMMARY.md`

## Testing

```bash
# Run agent tests only
cd orchestrator
python3 -m pytest tests/test_discord_slash_cmd_agent.py -v

# Run all tests
python3 -m pytest tests/ -v
```

## Notes

- ✅ Uses guild commands (instant visibility)
- ✅ Never touches global commands
- ✅ Token redaction in all logs
- ✅ Rate limit handling with backoff
- ✅ Idempotent registration with PUT
- ✅ Zero destructive operations without flag
