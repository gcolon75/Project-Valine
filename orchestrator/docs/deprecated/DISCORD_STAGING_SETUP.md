# Discord Staging Bot Setup Guide

This guide explains how to set up and troubleshoot Discord slash commands in the **staging** environment.

## Problem

Discord slash commands (like `/debug-last`) weren't appearing in the staging Discord server due to:

1. The `/debug-last` command was not included in the command registration script
2. Commands were registered globally (1-hour propagation delay) instead of as guild commands (instant)
3. No separate registration process for staging vs production
4. Missing bot scopes (`applications.commands`)

## Solution

### 1. Register Commands for Staging

Use the staging-specific registration script which registers commands as **guild commands** for instant visibility:

```bash
cd orchestrator
./register_discord_commands_staging.sh
```

When prompted, provide:
- **Discord Application ID**: `STAGING_DISCORD_APPLICATION_ID` (from GitHub repo variables)
- **Discord Bot Token**: `STAGING_DISCORD_BOT_TOKEN` (from GitHub secrets)
- **Guild ID**: Your staging Discord server ID (right-click server → Copy Server ID with Developer Mode enabled)

The script will register:
- `/debug-last` - Show last run debug info (ephemeral, redacted) **[STAGING ONLY]**
- `/diagnose` - Run staging diagnostic
- `/status` - Show workflow run status
- `/verify-latest` - Verify latest deployment
- `/deploy-client` - Trigger client deployment

### 2. Verify Bot Scopes

Ensure the bot was invited with **both** scopes:

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_APP_ID&scope=bot%20applications.commands&permissions=0
```

Missing `applications.commands` scope will prevent slash commands from appearing.

### 3. Configure SSM Parameters

Set the following parameters in **AWS Systems Manager** (region: `us-west-2`, path: `/valine/staging/`):

```bash
aws ssm put-parameter --name "/valine/staging/ENABLE_DEBUG_CMD" --value "true" --type String --overwrite
aws ssm put-parameter --name "/valine/staging/ENABLE_ALERTS" --value "false" --type String --overwrite
aws ssm put-parameter --name "/valine/staging/ALERT_CHANNEL_ID" --value "1428102811832553554" --type String --overwrite
```

**Important**: Keep `ENABLE_ALERTS=false` until you're ready to test alerts to avoid spamming.

### 4. Configure GitHub Repository Variables

Ensure these are set in your GitHub repository settings:

- `STAGING_DISCORD_PUBLIC_KEY` - Public key from Discord Developer Portal
- `STAGING_DISCORD_APPLICATION_ID` - Application ID from Discord Developer Portal

### 5. Set Interactions Endpoint URL

In the [Discord Developer Portal](https://discord.com/developers/applications):

1. Select your staging application
2. Go to "General Information"
3. Set "Interactions Endpoint URL" to your Lambda endpoint (from CloudFormation outputs)
4. Ensure the `STAGING_DISCORD_PUBLIC_KEY` matches this application

### 6. Test the /debug-last Command

1. Go to your staging Discord server
2. Type `/debug-last` - it should appear in autocomplete
3. Execute the command
4. Verify:
   - ✅ Response is **ephemeral** (only visible to you)
   - ✅ Secrets are **redacted** (shows `***abcd` format)
   - ✅ Shows trace ID, command, duration, steps

## Diagnostic Tools

### Check Command Registration Status

Use the diagnostic script to check what's currently registered:

```bash
./diagnose_discord_commands.sh
```

This will show:
- Bot identity and authentication status
- Which servers the bot is in
- Global commands (1-hour delay)
- Guild-specific commands (instant)
- Whether `/debug-last` is registered

### Manual Verification

List guild commands manually:

```bash
curl -H "Authorization: Bot YOUR_BOT_TOKEN" \
  https://discord.com/api/v10/applications/YOUR_APP_ID/guilds/YOUR_GUILD_ID/commands
```

Should return a JSON array with all registered commands including `/debug-last`.

## Common Issues

### Issue 1: Commands Don't Appear

**Root Cause**: Bot missing `applications.commands` scope

**Fix**: Re-invite bot with correct scopes:
```
https://discord.com/api/oauth2/authorize?client_id=APP_ID&scope=bot%20applications.commands&permissions=0
```

### Issue 2: /debug-last Returns "Disabled"

**Root Cause**: Feature flag not enabled in SSM

**Fix**: Set `/valine/staging/ENABLE_DEBUG_CMD=true` in SSM

### Issue 3: Commands Registered but Don't Respond

**Root Cause**: 
- Wrong `STAGING_DISCORD_PUBLIC_KEY` (signature verification fails)
- Interactions endpoint URL not set or incorrect
- Lambda not deployed or misconfigured

**Fix**: 
1. Verify public key matches Discord Developer Portal
2. Check Interactions Endpoint URL is set correctly
3. Check CloudWatch Logs (`/aws/lambda/pv-api-prod-api`) for errors

### Issue 4: Global vs Guild Commands

**Symptoms**: Commands appear after 1 hour delay

**Root Cause**: Used global command endpoint instead of guild endpoint

**Fix**: Use `register_discord_commands_staging.sh` which uses guild commands for instant registration

## Architecture

### Staging Environment

- **Bot Token**: `STAGING_DISCORD_BOT_TOKEN` (GitHub secret)
- **Application ID**: `STAGING_DISCORD_APPLICATION_ID` (GitHub variable)
- **Public Key**: `STAGING_DISCORD_PUBLIC_KEY` (GitHub variable)
- **SSM Path**: `/valine/staging/` (us-west-2)
- **CloudWatch Logs**: `/aws/lambda/pv-api-prod-api`
- **Alert Channel**: `1428102811832553554`

### Production Environment

- **Bot Token**: `DISCORD_BOT_TOKEN` (GitHub secret)
- **Application ID**: `DISCORD_APPLICATION_ID` (GitHub variable)  
- **Public Key**: `DISCORD_PUBLIC_KEY` (GitHub variable)
- **SSM Path**: `/valine/prod/` (us-west-2)
- **Alert Channel**: Production channel ID

### Command Registration

| Environment | Script | Command Type | Visibility Delay |
|-------------|--------|--------------|------------------|
| Staging | `register_discord_commands_staging.sh` | Guild | Instant |
| Production | `register_discord_commands.sh` | Global | Up to 1 hour |

## Feature Flags

The `/debug-last` command is **feature-flagged** for safety:

```python
enable_debug_cmd = os.environ.get('ENABLE_DEBUG_CMD', 'false').lower() == 'true'
```

If disabled, the command returns:
```
❌ Debug commands are disabled (ENABLE_DEBUG_CMD=false)
```

This prevents accidentally exposing debug info in production.

## Testing Checklist

- [ ] Bot invited with `bot + applications.commands` scopes
- [ ] Commands registered via `register_discord_commands_staging.sh`
- [ ] Commands appear in Discord autocomplete (instant for guild commands)
- [ ] `/debug-last` executes and shows ephemeral response
- [ ] Secrets in `/debug-last` response are redacted (`***abcd`)
- [ ] SSM parameter `ENABLE_DEBUG_CMD=true` in staging
- [ ] SSM parameter `ENABLE_ALERTS=false` in staging (until ready)
- [ ] `STAGING_DISCORD_PUBLIC_KEY` matches Discord Developer Portal
- [ ] Interactions Endpoint URL set in Discord Developer Portal
- [ ] CloudWatch Logs show no signature verification errors

## Next Steps

1. **Register commands**: Run `./register_discord_commands_staging.sh`
2. **Test /debug-last**: Verify ephemeral + redaction behavior
3. **Enable alerts**: When ready, set `ENABLE_ALERTS=true` and test
4. **Monitor logs**: Check CloudWatch for any errors
5. **Document evidence**: Collect screenshots for validation report

## References

- Discord API Documentation: https://discord.com/developers/docs/interactions/application-commands
- Problem Statement: Issue "Why no Discord slash commands?"
- Implementation: `app/handlers/discord_handler.py` (line 588-675)
- Related PR: #49 (Phase 5 Staging Validation)
