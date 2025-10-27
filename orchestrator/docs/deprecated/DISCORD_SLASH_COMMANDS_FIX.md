# Discord Slash Commands Fix - Root Cause Analysis

## Problem Statement

Discord slash commands (specifically `/debug-last`) were not appearing in the staging Discord server, preventing validation of Phase 5 observability features.

## Root Cause Analysis

### Issue 1: Missing `/debug-last` Command Registration

**Root Cause**: The `/debug-last` command was implemented in the handler (`app/handlers/discord_handler.py` lines 588-675) but was **NOT included** in the command registration script (`register_discord_commands.sh`).

**Evidence**:
```bash
$ grep -n "debug-last" orchestrator/register_discord_commands.sh
# No results - command was missing
```

**Impact**: Even though the handler could process `/debug-last` commands, Discord users couldn't see or execute it because it was never registered with Discord's API.

### Issue 2: Global vs Guild Command Registration

**Root Cause**: The existing registration script used **global commands** which have up to a 1-hour propagation delay:

```bash
BASE_URL="https://discord.com/api/v10/applications/${APP_ID}/commands"  # Global endpoint
```

**Best Practice for Staging**: Use **guild commands** for instant visibility:

```bash
BASE_URL="https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands"  # Guild endpoint
```

**Impact**: Even if commands were registered, they would take up to 1 hour to appear in Discord, making rapid iteration and testing difficult.

### Issue 3: No Staging-Specific Registration Process

**Root Cause**: The repository had only one registration script that targeted production (global commands) without a separate process for staging environments.

**Impact**: No clear path for operators to register staging commands with instant visibility for testing.

### Issue 4: Missing Bot Scope

**Potential Root Cause**: The bot may have been invited without the `applications.commands` scope.

**Required Scopes**:
- `bot` - Basic bot functionality
- `applications.commands` - Slash command registration and execution

**Impact**: Without `applications.commands`, slash commands cannot be registered or executed, even if the bot is in the server.

## Solution Implementation

### 1. Created Staging Registration Script

**File**: `orchestrator/register_discord_commands_staging.sh`

**Key Features**:
- Uses **guild commands endpoint** for instant visibility (no 1-hour delay)
- Includes `/debug-last` command registration
- Prompts for staging-specific credentials (STAGING_DISCORD_APPLICATION_ID, STAGING_DISCORD_BOT_TOKEN)
- Provides clear next steps and verification commands

**Usage**:
```bash
cd orchestrator
./register_discord_commands_staging.sh
```

### 2. Updated Production Registration Script

**File**: `orchestrator/register_discord_commands.sh`

**Changes**:
- Added `/debug-last` command registration
- Updated documentation to list the new command
- Remains as global command endpoint for production (appropriate for that environment)

### 3. Created Diagnostic Script

**File**: `orchestrator/diagnose_discord_commands.sh`

**Key Features**:
- Validates bot authentication
- Lists guild membership
- Checks both global and guild command registration
- Specifically checks for `/debug-last` command
- Provides bot invite URL with correct scopes
- Suggests fixes based on detected issues

**Usage**:
```bash
cd orchestrator
./diagnose_discord_commands.sh
```

### 4. Created Automated Setup Script

**File**: `orchestrator/setup_staging_bot.sh`

**Key Features**:
- All-in-one script for staging bot setup
- Validates credentials and guild membership
- Checks current registration status
- Optionally registers commands interactively
- Verifies AWS SSM parameters (ENABLE_DEBUG_CMD, ENABLE_ALERTS, ALERT_CHANNEL_ID)
- Provides comprehensive next steps

**Usage**:
```bash
cd orchestrator
./setup_staging_bot.sh
```

### 5. Comprehensive Documentation

**File**: `orchestrator/DISCORD_STAGING_SETUP.md`

**Contents**:
- Complete staging setup guide
- Root cause explanation
- Step-by-step registration process
- Troubleshooting guide for common issues
- Configuration checklist
- Architecture overview (staging vs production)

### 6. Updated Main README

**File**: `orchestrator/README.md`

**Changes**:
- Added "Quick Setup for Staging" section
- Added comprehensive "Troubleshooting" section
- References to new documentation and scripts
- Clear distinction between staging and production setup

## Verification Steps

After implementing the fix, operators should:

### 1. Register Commands
```bash
cd orchestrator
./setup_staging_bot.sh
# Or manually:
./register_discord_commands_staging.sh
```

### 2. Verify Registration
```bash
# Check commands are registered
curl -H "Authorization: Bot $STAGING_DISCORD_BOT_TOKEN" \
  https://discord.com/api/v10/applications/$STAGING_APP_ID/guilds/$GUILD_ID/commands \
  | jq '.[] | .name'

# Should include "debug-last"
```

### 3. Enable Feature Flag
```bash
# Set SSM parameter to enable /debug-last
aws ssm put-parameter \
  --name "/valine/staging/ENABLE_DEBUG_CMD" \
  --value "true" \
  --type String \
  --overwrite \
  --region us-west-2
```

### 4. Test in Discord
1. Go to staging Discord server
2. Type `/debug-last` - should appear in autocomplete immediately
3. Execute the command
4. Verify:
   - Response is ephemeral (only visible to user)
   - Secrets are redacted (shows `***abcd` format)
   - Shows trace ID, command, duration, and steps

## Testing Results

**Expected Behavior**:
- ✅ Commands registered as guild commands appear **instantly** (no 1-hour wait)
- ✅ `/debug-last` appears in Discord autocomplete
- ✅ `/debug-last` executes with ephemeral response
- ✅ Secrets are automatically redacted in debug output
- ✅ Feature flag `ENABLE_DEBUG_CMD` controls access

## Files Changed

### New Files
- `orchestrator/register_discord_commands_staging.sh` - Staging command registration
- `orchestrator/diagnose_discord_commands.sh` - Diagnostic tool
- `orchestrator/setup_staging_bot.sh` - Automated setup script
- `orchestrator/DISCORD_STAGING_SETUP.md` - Comprehensive documentation

### Modified Files
- `orchestrator/register_discord_commands.sh` - Added `/debug-last` command
- `orchestrator/README.md` - Added staging setup and troubleshooting sections

## Benefits

1. **Instant Command Visibility**: Guild commands appear immediately (vs 1-hour global command delay)
2. **Clear Staging Process**: Dedicated scripts and documentation for staging setup
3. **Automated Diagnostics**: Tools to quickly identify and fix registration issues
4. **Production Safety**: Separate staging and production registration paths
5. **Operator-Friendly**: Interactive scripts with clear prompts and next steps

## Next Steps for Operators

1. Run `./setup_staging_bot.sh` to configure staging bot
2. Test `/debug-last` command in staging Discord server
3. Enable alerts when ready: `ENABLE_ALERTS=true` in SSM
4. Test alert functionality with controlled failures
5. Collect evidence for Phase 5 validation report
6. Plan production rollout (phased: logging → debug → alerts)

## Related Issues

- **Original Issue**: PR #49 - Phase 5 Staging Validation
- **Feature Implementation**: `app/handlers/discord_handler.py` (lines 588-675)
- **Documentation**: `DISCORD_STAGING_SETUP.md`, `README.md`
