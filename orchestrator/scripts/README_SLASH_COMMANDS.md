# Discord Slash Commands Validation Script

## Overview

`validate_discord_slash_commands.py` is an automated validation and registration tool for Discord slash commands in staging environments. It verifies bot authentication, guild membership, command registration, and generates evidence for validation.

## Quick Start

### Prerequisites

- Python 3.7+
- `requests` library (`pip install requests`)
- Discord bot credentials:
  - Application ID (`STAGING_DISCORD_APPLICATION_ID`)
  - Bot Token (`STAGING_DISCORD_BOT_TOKEN`)
  - Guild ID (staging Discord server ID)

### Installation

```bash
cd orchestrator/scripts
pip install requests
```

### Usage

#### 1. Check Current Status

```bash
python validate_discord_slash_commands.py check \
  --app-id YOUR_APP_ID \
  --bot-token YOUR_BOT_TOKEN \
  --guild-id YOUR_GUILD_ID
```

**What it does:**
- Validates bot authentication
- Checks guild membership
- Lists currently registered commands
- Verifies `/debug-last` command exists
- Does NOT register commands

#### 2. Register Missing Commands

```bash
python validate_discord_slash_commands.py register \
  --app-id YOUR_APP_ID \
  --bot-token YOUR_BOT_TOKEN \
  --guild-id YOUR_GUILD_ID
```

**What it does:**
- Validates bot authentication and guild membership
- Registers staging commands: `/debug-last`, `/diagnose`, `/status`
- Verifies registration succeeded
- Generates evidence report

#### 3. Full Validation with Auto-Registration

```bash
python validate_discord_slash_commands.py full \
  --app-id YOUR_APP_ID \
  --bot-token YOUR_BOT_TOKEN \
  --guild-id YOUR_GUILD_ID \
  --register
```

**What it does:**
- Runs complete validation flow
- Automatically registers missing commands if `--register` flag is set
- Generates comprehensive evidence report
- Provides next steps for manual testing

### Using Environment Variables

```bash
# Set credentials in environment
export STAGING_DISCORD_APPLICATION_ID="your_app_id"
export STAGING_DISCORD_BOT_TOKEN="your_bot_token"
export STAGING_GUILD_ID="your_guild_id"

# Run validation
python validate_discord_slash_commands.py full \
  --app-id $STAGING_DISCORD_APPLICATION_ID \
  --bot-token $STAGING_DISCORD_BOT_TOKEN \
  --guild-id $STAGING_GUILD_ID \
  --register
```

## Commands Registered

The script registers these essential staging commands:

1. **`/debug-last`**
   - Description: "Show last run debug info (redacted, ephemeral)"
   - Purpose: Display last command execution trace for troubleshooting
   - Security: Ephemeral response, secrets redacted

2. **`/diagnose`**
   - Description: "Run a quick staging diagnostic"
   - Purpose: Trigger on-demand diagnostic workflow

3. **`/status`**
   - Description: "Show last 1-3 runs for workflows"
   - Options: `count` (1-3, optional)
   - Purpose: Display recent workflow run status

## Output

### Console Output

```
[12:34:56] ℹ️  Verifying bot authentication...
[12:34:57] ✅ Bot authenticated: @ProjectValineBot (ID: 1234567890)
[12:34:58] ℹ️  Checking guild membership (Guild ID: 0987654321)...
[12:34:59] ✅ Bot is member of guild: Staging Server
[12:35:00] ℹ️  Listing registered guild commands...
[12:35:01] ⚠️  No guild commands currently registered
[12:35:02] ℹ️  Registering staging commands...
[12:35:03] ✅   /debug-last registered (201)
[12:35:04] ✅   /diagnose registered (201)
[12:35:05] ✅   /status registered (201)
[12:35:06] ✅ All 3 commands registered successfully
[12:35:07] ✅ /debug-last command is registered ✅
[12:35:08] ✅ Validation PASSED ✅
```

### Evidence Files

Generated in `./validation_evidence/`:

#### JSON Evidence
`discord_commands_validation_YYYYMMDD_HHMMSS.json`

```json
{
  "timestamp": "2025-10-17T12:35:08.000000+00:00",
  "app_id": "1234567890",
  "guild_id": "0987654321",
  "checks": [
    {
      "name": "Bot Authentication",
      "status": "PASS",
      "timestamp": "2025-10-17T12:34:57.000000+00:00",
      "details": {
        "username": "ProjectValineBot",
        "id": "1234567890",
        "bot_token": "***abcd"
      }
    },
    {
      "name": "Guild Membership",
      "status": "PASS",
      "timestamp": "2025-10-17T12:34:59.000000+00:00",
      "details": {
        "guild_name": "Staging Server",
        "guild_id": "0987654321"
      }
    },
    {
      "name": "Register Commands",
      "status": "PASS",
      "timestamp": "2025-10-17T12:35:06.000000+00:00",
      "details": {
        "success_count": 3
      }
    },
    {
      "name": "Verify debug-last Command",
      "status": "PASS",
      "timestamp": "2025-10-17T12:35:07.000000+00:00",
      "details": {
        "status": "registered"
      }
    }
  ]
}
```

#### Markdown Report
`discord_commands_validation_YYYYMMDD_HHMMSS.md`

Human-readable report with:
- Timestamp and configuration
- Validation check results
- Details and errors
- Overall summary with pass/fail counts

## Troubleshooting

### Bot Authentication Failed

**Symptom:** `❌ Bot authentication failed with status 401`

**Cause:** Invalid bot token

**Fix:**
1. Verify `STAGING_DISCORD_BOT_TOKEN` is correct
2. Check token hasn't been regenerated in Discord Developer Portal
3. Ensure token is properly formatted (no extra spaces)

### Bot Not in Guild

**Symptom:** `❌ Bot is NOT a member of guild`

**Cause:** Bot hasn't been invited to the Discord server

**Fix:**
1. Use the provided invite URL (displayed in error message)
2. Ensure BOTH scopes are selected: `bot` + `applications.commands`
3. Authorize the bot to join the server
4. Re-run validation

### Command Registration Failed

**Symptom:** `❌ Failed to register /command-name (status 400)`

**Causes:**
- Invalid command definition
- Missing required fields
- Incorrect permissions

**Fix:**
1. Check Discord API documentation for command schema
2. Verify app_id and guild_id are correct
3. Ensure bot has appropriate permissions

### Commands Not Appearing in Discord

**Symptom:** Commands registered but not visible in Discord client

**Possible Causes:**
1. **Discord Client Cache:** Restart Discord client
2. **Wrong Command Type:** Using global instead of guild commands (wait 1 hour)
3. **Missing Scope:** Bot invited without `applications.commands` scope (re-invite)

**Fix:**
1. Restart Discord client
2. Verify commands using API:
   ```bash
   curl -H "Authorization: Bot $BOT_TOKEN" \
     https://discord.com/api/v10/applications/$APP_ID/guilds/$GUILD_ID/commands
   ```
3. If missing scope, re-invite bot with correct URL

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Validate Discord Commands
  env:
    STAGING_DISCORD_APPLICATION_ID: ${{ vars.STAGING_DISCORD_APPLICATION_ID }}
    STAGING_DISCORD_BOT_TOKEN: ${{ secrets.STAGING_DISCORD_BOT_TOKEN }}
    STAGING_GUILD_ID: ${{ vars.STAGING_GUILD_ID }}
  run: |
    cd orchestrator/scripts
    pip install requests
    python validate_discord_slash_commands.py full \
      --app-id $STAGING_DISCORD_APPLICATION_ID \
      --bot-token $STAGING_DISCORD_BOT_TOKEN \
      --guild-id $STAGING_GUILD_ID \
      --register

- name: Upload Evidence
  uses: actions/upload-artifact@v4
  with:
    name: discord-validation-evidence
    path: orchestrator/scripts/validation_evidence/
```

## Security Considerations

### Token Redaction

All bot tokens are automatically redacted in output:
- Console logs show: `***abcd` (last 4 characters)
- Evidence files show: `***abcd`
- Never logs full tokens

### Ephemeral Responses

The `/debug-last` command uses ephemeral responses (`flags: 64`), meaning only the command invoker sees the output. This prevents sensitive debug information from being visible to other users.

### Feature Flags

Commands respect feature flags in AWS SSM:
- `ENABLE_DEBUG_CMD=true` - Required for `/debug-last` to work
- `ENABLE_ALERTS=false` - Safe default for staging

## API Reference

### Discord API Endpoints Used

```
GET  /users/@me                                      - Verify bot authentication
GET  /users/@me/guilds                               - List bot guilds
GET  /applications/{app_id}/guilds/{guild_id}/commands  - List guild commands
POST /applications/{app_id}/guilds/{guild_id}/commands  - Register guild command
```

### Rate Limits

- Global rate limit: 50 requests per second
- Per-route rate limits vary
- Script uses sequential requests (no rate limit issues)

## Related Files

- **`../SLASH_COMMANDS_FIX_GUIDE.md`** - Comprehensive fix guide
- **`../setup_staging_bot.sh`** - Interactive setup script
- **`../register_discord_commands_staging.sh`** - Manual registration script
- **`../diagnose_discord_commands.sh`** - Diagnostic tool
- **`phase5_staging_validator.py`** - Full Phase 5 validation

## Support

For issues or questions:
- **Repository:** gcolon75/Project-Valine
- **Documentation:** `/orchestrator/` directory
- **Guide:** `SLASH_COMMANDS_FIX_GUIDE.md`
- **AWS Region:** us-west-2
- **Staging Channel:** 1428102811832553554

## License

Part of Project Valine - see repository LICENSE
