# Discord Staging Bot Setup - Quick Reference

This is a quick reference guide for setting up Discord slash commands in the staging environment.

## TL;DR - One Command Setup

```bash
cd orchestrator
./setup_staging_bot.sh
```

Then test `/debug-last` in your staging Discord server.

## Step-by-Step Setup

### 1. Prerequisites

Before you begin, gather:

- **STAGING_DISCORD_APPLICATION_ID** (from GitHub repo variables or Discord Developer Portal)
- **STAGING_DISCORD_BOT_TOKEN** (from GitHub secrets or Discord Developer Portal)
- **Staging Guild ID** (right-click your Discord server → "Copy Server ID" with Developer Mode enabled)

### 2. Register Commands

Run the automated setup:

```bash
cd orchestrator
./setup_staging_bot.sh
```

The script will:
1. ✅ Validate bot credentials
2. ✅ Check guild membership
3. ✅ Verify current command registration
4. ✅ Optionally register commands (instant visibility)
5. ✅ Check AWS SSM parameters

### 3. Enable Debug Command

Set the feature flag in AWS SSM:

```bash
aws ssm put-parameter \
  --name "/valine/staging/ENABLE_DEBUG_CMD" \
  --value "true" \
  --type String \
  --overwrite \
  --region us-west-2
```

Wait 30 seconds for Lambda to pick up the new environment variable.

### 4. Test in Discord

1. Open your staging Discord server
2. Type `/debug-last`
3. Command should appear in autocomplete
4. Execute it
5. Verify:
   - ✅ Response is ephemeral (only you see it)
   - ✅ Secrets are redacted (`***abcd` format)
   - ✅ Shows trace ID, command, duration, steps

## Troubleshooting

### Commands Don't Appear

**Diagnosis:**
```bash
cd orchestrator
./diagnose_discord_commands.sh
```

**Common Fixes:**

1. **Missing bot scope** → Re-invite bot:
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_APP_ID&scope=bot%20applications.commands&permissions=0
   ```

2. **Commands not registered** → Run:
   ```bash
   ./register_discord_commands_staging.sh
   ```

3. **Wrong guild ID** → Get correct ID:
   - Enable Developer Mode in Discord
   - Right-click server → "Copy Server ID"

### /debug-last Returns "Disabled"

**Fix:** Enable the feature flag:
```bash
aws ssm put-parameter \
  --name "/valine/staging/ENABLE_DEBUG_CMD" \
  --value "true" \
  --type String \
  --overwrite \
  --region us-west-2
```

### Commands Don't Respond

**Check:**
1. Interactions Endpoint URL is set in Discord Developer Portal
2. `STAGING_DISCORD_PUBLIC_KEY` matches the app in Developer Portal
3. CloudWatch Logs (`/aws/lambda/pv-api-prod-api`) for errors

## Manual Verification

Check if commands are registered:

```bash
# Set your credentials
export APP_ID="your_staging_app_id"
export BOT_TOKEN="your_staging_bot_token"
export GUILD_ID="your_staging_guild_id"

# List guild commands
curl -H "Authorization: Bot $BOT_TOKEN" \
  "https://discord.com/api/v10/applications/$APP_ID/guilds/$GUILD_ID/commands" \
  | jq '.[] | .name'

# Should include "debug-last"
```

## Scripts Reference

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `setup_staging_bot.sh` | Automated setup with diagnostics | First-time setup or troubleshooting |
| `register_discord_commands_staging.sh` | Register commands only | Quick command registration |
| `diagnose_discord_commands.sh` | Diagnose registration issues | When commands don't appear |
| `register_discord_commands.sh` | Production registration | Production deployment only |

## Configuration Checklist

- [ ] Bot invited with `bot` + `applications.commands` scopes
- [ ] Commands registered via staging script
- [ ] `STAGING_DISCORD_PUBLIC_KEY` set in GitHub repo variables
- [ ] `STAGING_DISCORD_APPLICATION_ID` set in GitHub repo variables
- [ ] `/valine/staging/ENABLE_DEBUG_CMD=true` in AWS SSM
- [ ] `/valine/staging/ENABLE_ALERTS=false` in AWS SSM (until ready to test)
- [ ] `/valine/staging/ALERT_CHANNEL_ID=1428102811832553554` in AWS SSM
- [ ] Interactions Endpoint URL set in Discord Developer Portal
- [ ] `/debug-last` appears in Discord autocomplete
- [ ] `/debug-last` executes with ephemeral response
- [ ] Secrets are redacted in debug output

## Next Steps

After confirming `/debug-last` works:

1. **Test other commands**: `/diagnose`, `/status`, `/verify-latest`
2. **Enable alerts**: Set `ENABLE_ALERTS=true` when ready
3. **Test alert flow**: Trigger controlled failure to test alerting
4. **Collect evidence**: Take screenshots for validation report
5. **Document findings**: Update Phase 5 validation document

## More Information

- **Comprehensive Guide**: `DISCORD_STAGING_SETUP.md`
- **Root Cause Analysis**: `DISCORD_SLASH_COMMANDS_FIX.md`
- **Main Documentation**: `README.md`
