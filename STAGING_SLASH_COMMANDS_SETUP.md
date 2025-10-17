# Staging Slash Commands Setup Guide

## TL;DR

**Root Cause:** Discord slash commands were implemented in code but never registered with Discord's API for the staging guild.

**Fix:** Run the registration script or GitHub Actions workflow to register commands as guild commands (instant visibility).

**Commands to Register:**
- `/debug-last` - Show last run debug info (redacted, ephemeral)
- `/diagnose` - Run a quick staging diagnostic  
- `/status` - Show last 1-3 runs for workflows

## Quick Start

### Option 1: GitHub Actions (Recommended)

1. Go to Actions → "Register Staging Slash Commands" workflow
2. Click "Run workflow"
3. Wait for completion (~30 seconds)
4. Commands should appear in Discord immediately

### Option 2: Local Execution

```bash
# Set environment variables
export STAGING_DISCORD_APPLICATION_ID="your_app_id"
export STAGING_DISCORD_BOT_TOKEN="your_bot_token"
export STAGING_DISCORD_GUILD_ID="your_guild_id"

# Run registration script
cd orchestrator/scripts
./register_staging_slash_commands.sh
```

### Option 3: Direct Python

```bash
cd orchestrator/scripts

# Install dependencies
pip install requests pynacl

# Run validation and registration
python3 validate_discord_slash_commands.py full \
    --app-id "$STAGING_DISCORD_APPLICATION_ID" \
    --bot-token "$STAGING_DISCORD_BOT_TOKEN" \
    --guild-id "$STAGING_DISCORD_GUILD_ID" \
    --register
```

## Required Configuration

### GitHub Repository Secrets

- `STAGING_DISCORD_BOT_TOKEN` (secret) - Bot token for staging environment
- `AWS_ROLE_ARN` (secret) - AWS IAM role for OIDC authentication (optional, for SSM access)

### GitHub Repository Variables

- `STAGING_DISCORD_APPLICATION_ID` (var) - Discord Application ID
- `STAGING_DISCORD_PUBLIC_KEY` (var) - Discord Public Key for signature verification
- `STAGING_DISCORD_GUILD_ID` (var) - Discord Guild/Server ID (can be auto-discovered)

### AWS SSM Parameters (Optional)

Under `/valine/staging/` prefix:
- `ENABLE_DEBUG_CMD` - Set to `true` to enable /debug-last command
- `ENABLE_ALERTS` - Set to `false` for staging (safe default)
- `ALERT_CHANNEL_ID` - Discord channel ID for alerts (e.g., `1428102811832553554`)

## Discovery: Finding Your Guild ID

If you don't know your staging guild ID:

```bash
# Using curl
curl -H "Authorization: Bot $STAGING_DISCORD_BOT_TOKEN" \
    https://discord.com/api/v10/users/@me/guilds

# Using Python
python3 -c "
import requests
token = 'YOUR_BOT_TOKEN_HERE'
headers = {'Authorization': f'Bot {token}'}
response = requests.get('https://discord.com/api/v10/users/@me/guilds', headers=headers)
print(response.json())
"
```

The output will show all guilds the bot is in. Look for the staging server by name.

## Verification

### 1. Check Command Registration

```bash
cd orchestrator/scripts
python3 validate_discord_slash_commands.py check \
    --app-id "$STAGING_DISCORD_APPLICATION_ID" \
    --bot-token "$STAGING_DISCORD_BOT_TOKEN" \
    --guild-id "$STAGING_DISCORD_GUILD_ID"
```

Expected output:
```
✅ Bot authenticated: @YourBot (ID: 123...)
✅ Bot is member of guild: Your Staging Server
✅ Found 3 registered commands:
  • /debug-last - Show last run debug info (redacted, ephemeral)
  • /diagnose - Run a quick staging diagnostic
  • /status - Show last 1-3 runs for workflows
```

### 2. Test in Discord

1. Open your staging Discord server
2. In any channel, type `/`
3. You should see `/debug-last`, `/diagnose`, `/status` in autocomplete
4. Test `/status` first (doesn't require trace data)
5. Test `/debug-last` after running a command that creates a trace

### 3. Verify /debug-last Response

The `/debug-last` command should:
- ✅ Respond ephemerally (only visible to you)
- ✅ Show trace_id for correlation
- ✅ Show command name and timestamp
- ✅ Show step-by-step timings
- ✅ Redact secrets (show last 4 chars: `***abcd`)
- ✅ Include CloudWatch correlation info

Example response:
```
🔍 Last Execution Debug Info

Command: `/diagnose`
Trace ID: `abc123de-456f-789g-hij0-klmnopqrstuv`
Started: 2025-10-17 12:34:56 UTC
Duration: 2500ms

Steps:
  ✅ Validate authorization (10ms)
  ✅ Trigger workflow (200ms)
  ✅ Wait for run start (2000ms)
  ✅ Post follow-up (100ms)
```

## Troubleshooting

### Commands Don't Appear in Discord

**Cause:** Commands not registered or bot missing `applications.commands` scope

**Fix:**
1. Re-run registration script
2. If that fails, re-invite bot with correct scopes:
   ```
   https://discord.com/api/oauth2/authorize?client_id=<APP_ID>&scope=bot%20applications.commands&permissions=0
   ```

### /debug-last Returns "Debug commands are disabled"

**Cause:** `ENABLE_DEBUG_CMD` SSM parameter is not set to `true`

**Fix:**
```bash
aws ssm put-parameter \
    --region us-west-2 \
    --name /valine/staging/ENABLE_DEBUG_CMD \
    --type String \
    --value true \
    --overwrite
```

### /debug-last Returns "No recent trace found"

**Cause:** No commands have been executed yet

**Fix:** Run another slash command first (like `/status` or `/diagnose`)

### Bot Returns 401 Unauthorized

**Cause:** Signature verification failing or wrong endpoint

**Check:**
1. Verify `STAGING_DISCORD_PUBLIC_KEY` matches the one in Discord Developer Portal
2. Verify interactions endpoint URL points to staging Lambda
3. Check CloudWatch logs for signature verification errors

## Architecture Notes

### Why Guild Commands Instead of Global?

- **Global commands:** Take up to 1 hour to propagate across Discord
- **Guild commands:** Appear instantly (perfect for staging)
- **Recommendation:** Use guild commands for staging, global for production

### Command Handler Flow

1. Discord sends POST to Lambda endpoint (`/discord`)
2. Lambda handler verifies signature using `DISCORD_PUBLIC_KEY`
3. Handler routes command to appropriate function
4. Function executes logic and returns response within 3 seconds
5. For long operations, function uses deferred responses

### Environment Variable Hierarchy

1. **AWS SSM Parameters** (runtime configuration)
   - Prefix: `/valine/staging/`
   - Can be updated without redeployment
   
2. **Lambda Environment Variables** (deployment configuration)
   - Set during SAM/CloudFormation deployment
   - Requires redeployment to change

3. **GitHub Secrets/Variables** (CI/CD configuration)
   - Used by workflows and scripts
   - Never exposed in logs

## Related Files

- `orchestrator/scripts/validate_discord_slash_commands.py` - Validation and registration script
- `orchestrator/scripts/register_staging_slash_commands.sh` - Bash wrapper
- `orchestrator/app/handlers/discord_handler.py` - Command handlers
- `.github/workflows/register-staging-slash-commands.yml` - GitHub Actions workflow
- `orchestrator/template.yaml` - SAM template for Lambda deployment

## Common API Endpoints

```bash
# Who am I (bot info)
curl -H "Authorization: Bot $BOT_TOKEN" \
    https://discord.com/api/v10/users/@me

# My guilds
curl -H "Authorization: Bot $BOT_TOKEN" \
    https://discord.com/api/v10/users/@me/guilds

# List guild commands
curl -H "Authorization: Bot $BOT_TOKEN" \
    https://discord.com/api/v10/applications/$APP_ID/guilds/$GUILD_ID/commands

# Register guild command
curl -X POST \
    -H "Authorization: Bot $BOT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"debug-last","type":1,"description":"Show last run debug info"}' \
    https://discord.com/api/v10/applications/$APP_ID/guilds/$GUILD_ID/commands

# Delete a command
curl -X DELETE \
    -H "Authorization: Bot $BOT_TOKEN" \
    https://discord.com/api/v10/applications/$APP_ID/guilds/$GUILD_ID/commands/$COMMAND_ID
```

## Security Notes

- ✅ All tokens shown in logs are redacted (last 4 chars only)
- ✅ `/debug-last` redacts secrets from trace data
- ✅ Signature verification prevents unauthorized requests
- ✅ Ephemeral responses keep debug info private
- ⚠️ Staging alerts should NEVER post to production channels

## Next Steps

After commands are registered and working:

1. ✅ Test `/debug-last` with actual trace data
2. ✅ Verify CloudWatch logs contain correlation IDs
3. ✅ Update PHASE5_VALIDATION.md with evidence
4. ✅ Create docs PR on `staging/phase5-validation-evidence` branch
5. ✅ Set `ENABLE_ALERTS=false` (safe default for staging)
6. ✅ Document any issues or improvements needed

## Support

For issues or questions:
- Check CloudWatch logs: `/aws/lambda/pv-api-prod-api`
- Review validation evidence in `orchestrator/scripts/validation_evidence/`
- Check Discord Developer Portal for endpoint configuration
- Verify AWS SSM parameters are set correctly
