# Fix Discord Slash Commands Not Showing in Staging

## Summary

This PR fixes the issue where Discord slash commands (specifically `/debug-last`) were not appearing in the staging Discord server. The root cause was that the `/debug-last` command was implemented in the handler but never registered with Discord's API, and there was no staging-specific registration process using guild commands for instant visibility.

## Problem

From the issue description:
- Slash commands like `/debug-last` weren't showing up in the staging Discord server
- Phase 5 observability features needed to be validated but couldn't be tested
- No clear process for registering commands in staging vs production
- Commands registered globally can take up to 1 hour to appear

## Root Causes

### 1. Missing Command Registration
The `/debug-last` command was implemented in `app/handlers/discord_handler.py` (lines 588-675) but was **not included** in `register_discord_commands.sh`.

### 2. Global vs Guild Commands
The existing script used global commands (1-hour propagation delay) instead of guild commands (instant visibility) which is better for staging.

### 3. No Staging Registration Process
There was no dedicated script or process for staging command registration with guild-specific commands.

### 4. Missing Bot Scopes
The bot may have been invited without the `applications.commands` scope required for slash commands.

## Solution

### New Scripts

#### 1. `register_discord_commands_staging.sh`
- Registers commands as **guild commands** for instant visibility (no 1-hour wait)
- Includes `/debug-last` command registration
- Prompts for staging-specific credentials
- Provides clear next steps and verification

#### 2. `diagnose_discord_commands.sh`
- Validates bot authentication and credentials
- Lists guild membership
- Checks both global and guild command registration
- Identifies missing commands and scopes
- Provides actionable fixes

#### 3. `setup_staging_bot.sh`
- All-in-one automated setup script
- Validates configuration
- Optionally registers commands
- Verifies AWS SSM parameters
- Provides comprehensive next steps

### Updated Files

#### 1. `register_discord_commands.sh`
- Added `/debug-last` command registration for production

#### 2. `README.md`
- Added "Quick Setup for Staging" section
- Added comprehensive "Troubleshooting" section
- References to new scripts and documentation

### Documentation

#### 1. `DISCORD_STAGING_SETUP.md` (7.5 KB)
Comprehensive guide covering:
- Problem statement and solution
- Step-by-step setup process
- Configuration checklist
- Common issues and fixes
- Architecture overview (staging vs production)
- Feature flag configuration

#### 2. `DISCORD_SLASH_COMMANDS_FIX.md` (7.3 KB)
Root cause analysis including:
- Detailed issue breakdown
- Solution implementation
- Verification steps
- Files changed
- Benefits and next steps

#### 3. `QUICK_START_STAGING.md` (4.6 KB)
Quick reference guide with:
- TL;DR one-command setup
- Step-by-step instructions
- Troubleshooting quick fixes
- Scripts reference table
- Configuration checklist

## Usage

### Quick Setup (Recommended)

```bash
cd orchestrator
./setup_staging_bot.sh
```

### Manual Setup

```bash
cd orchestrator
./register_discord_commands_staging.sh
```

### Diagnostics

```bash
cd orchestrator
./diagnose_discord_commands.sh
```

## Configuration Required

### GitHub Repository Variables
- `STAGING_DISCORD_PUBLIC_KEY` - Public key from Discord Developer Portal
- `STAGING_DISCORD_APPLICATION_ID` - Application ID from Discord Developer Portal

### GitHub Repository Secrets
- `STAGING_DISCORD_BOT_TOKEN` - Bot token from Discord Developer Portal

### AWS SSM Parameters (us-west-2)
```bash
/valine/staging/ENABLE_DEBUG_CMD=true
/valine/staging/ENABLE_ALERTS=false
/valine/staging/ALERT_CHANNEL_ID=1428102811832553554
```

### Discord Configuration
- Bot invited with `bot` + `applications.commands` scopes
- Interactions Endpoint URL set in Discord Developer Portal

## Testing Checklist

After running the setup:

- [ ] Run `./setup_staging_bot.sh` successfully
- [ ] Commands appear in Discord autocomplete immediately
- [ ] Type `/debug-last` in staging Discord server
- [ ] Command executes with ephemeral response
- [ ] Secrets are redacted (`***abcd` format)
- [ ] Trace ID and execution details are shown
- [ ] SSM parameter `ENABLE_DEBUG_CMD=true` is set
- [ ] No errors in CloudWatch Logs

## Expected Behavior

### Before Fix
- ❌ `/debug-last` command not visible in Discord
- ❌ No way to test Phase 5 observability features
- ❌ 1-hour delay for command registration (global commands)
- ❌ No staging-specific setup process

### After Fix
- ✅ `/debug-last` appears immediately in Discord (guild commands)
- ✅ Command executes with ephemeral response
- ✅ Secrets automatically redacted
- ✅ Clear staging setup process
- ✅ Automated diagnostics and troubleshooting

## Files Changed

### New Files (6)
- `orchestrator/register_discord_commands_staging.sh` (5.2 KB) - Staging registration
- `orchestrator/diagnose_discord_commands.sh` (5.9 KB) - Diagnostics
- `orchestrator/setup_staging_bot.sh` (8.3 KB) - Automated setup
- `orchestrator/DISCORD_STAGING_SETUP.md` (7.5 KB) - Comprehensive guide
- `orchestrator/DISCORD_SLASH_COMMANDS_FIX.md` (7.3 KB) - Root cause analysis
- `orchestrator/QUICK_START_STAGING.md` (4.6 KB) - Quick reference

### Modified Files (2)
- `orchestrator/register_discord_commands.sh` (+17 lines) - Added `/debug-last`
- `orchestrator/README.md` (+60 lines) - Added staging and troubleshooting sections

**Total**: ~40 KB of new documentation and tooling

## Benefits

1. **Instant Command Visibility**: Guild commands appear immediately (vs 1-hour global delay)
2. **Automated Setup**: One-command setup with `setup_staging_bot.sh`
3. **Clear Diagnostics**: Easy troubleshooting with diagnostic script
4. **Production Safety**: Separate staging and production registration
5. **Operator-Friendly**: Interactive scripts with clear guidance
6. **Comprehensive Documentation**: Multiple docs for different audiences

## Next Steps for Users

1. Run `./setup_staging_bot.sh` to configure staging bot
2. Test `/debug-last` in staging Discord server
3. Verify ephemeral response and secret redaction
4. Enable alerts when ready: Set `ENABLE_ALERTS=true` in SSM
5. Test alert functionality with controlled failures
6. Collect evidence for Phase 5 validation
7. Plan production rollout

## Related

- **Issue**: "Why no Discord slash commands?"
- **PR**: #49 - Phase 5 Staging Validation
- **Implementation**: `app/handlers/discord_handler.py` (lines 588-675)
- **Discord API**: https://discord.com/developers/docs/interactions/application-commands

## Security

- All scripts prompt for credentials (never hardcoded)
- Secrets are redacted in debug output (`***abcd` format)
- Feature flags control command access (`ENABLE_DEBUG_CMD`)
- Separate staging and production credentials
- Ephemeral messages for debug info (visible only to user)
