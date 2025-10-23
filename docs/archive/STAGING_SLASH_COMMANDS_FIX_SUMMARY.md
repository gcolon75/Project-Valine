# Staging Discord Slash Commands Fix - Summary

**Repository:** gcolon75/Project-Valine  
**Date:** 2025-10-17  
**Branch:** copilot/fix-staging-slash-commands  
**Status:** ✅ Implementation Complete - Ready for Testing

---

## TL;DR

**Root Cause:** Discord slash commands (specifically `/debug-last`) were implemented in code but never registered with Discord's API for the staging guild.

**Fix:** Created automated validation script to register commands as guild commands (instant visibility) and comprehensive documentation for the complete fix process.

**Result:** Commands can now be registered and verified with a single command. Ready for actual testing in staging Discord server with real credentials.

---

## Root Cause Analysis

### What Went Wrong

1. **Missing API Registration**
   - Command handler implemented in `orchestrator/app/handlers/discord_handler.py` (lines 588-675)
   - Command routing exists (line 1265)
   - BUT: Command was never registered with Discord's API

2. **Global vs Guild Commands**
   - Global commands take up to 1 hour to propagate
   - Guild commands appear instantly (better for staging)
   - No guild-specific registration existed for staging

3. **Bot Invitation Scopes**
   - Bot may lack `applications.commands` scope
   - Requires BOTH `bot` + `applications.commands`

4. **Feature Flag Configuration**
   - `/debug-last` requires `ENABLE_DEBUG_CMD=true` in AWS SSM
   - May not be set in staging environment

### Why It Matters

Without visible slash commands in staging:
- Cannot test Phase 5 observability features
- Cannot validate `/debug-last` functionality
- Cannot collect evidence for Phase 5 validation
- Blocks staging acceptance testing

---

## Solution Implemented

### Files Created

#### 1. Automated Validation Script (21 KB)
**File:** `orchestrator/scripts/validate_discord_slash_commands.py`

**Capabilities:**
- ✅ Validates bot authentication with Discord API
- ✅ Checks bot guild membership
- ✅ Lists currently registered commands
- ✅ Registers missing commands (debug-last, diagnose, status)
- ✅ Verifies registration succeeded
- ✅ Generates evidence reports (JSON + Markdown)

**Usage:**
```bash
cd orchestrator/scripts

# Full validation with auto-registration
python validate_discord_slash_commands.py full \
  --app-id $STAGING_DISCORD_APPLICATION_ID \
  --bot-token $STAGING_DISCORD_BOT_TOKEN \
  --guild-id $STAGING_GUILD_ID \
  --register
```

#### 2. Comprehensive Fix Guide (12 KB)
**File:** `orchestrator/SLASH_COMMANDS_FIX_GUIDE.md`

**Contents:**
- Root cause analysis
- Step-by-step fix procedure
- Troubleshooting guide (bot not in guild, commands not appearing, etc.)
- Evidence collection methods
- Configuration reference (staging vs production)
- Architecture notes and security considerations

#### 3. Script Documentation (9 KB)
**File:** `orchestrator/scripts/README_SLASH_COMMANDS.md`

**Contents:**
- Quick start guide
- Usage examples for all modes (check, register, full)
- Expected output samples
- Troubleshooting section
- CI/CD integration examples
- Security considerations

#### 4. One-Command Fix Script (6 KB)
**File:** `orchestrator/fix_staging_slash_commands.sh`

**Features:**
- Interactive credential collection
- Runs validation script
- Checks AWS SSM parameters
- Provides next steps
- Color-coded output

**Usage:**
```bash
cd orchestrator
./fix_staging_slash_commands.sh
```

### Documentation Updated

#### PHASE5_VALIDATION.md
Added comprehensive "Slash Commands Fix for Staging" section:
- Problem statement and root cause
- Solution implemented (all 4 files)
- Validation procedure
- Expected evidence format
- Before/after command lists
- SSM parameter configuration
- Discord test results format
- Next steps

**Location:** Lines 1039-1458 (419 lines added)

---

## How to Use

### Prerequisites

1. **GitHub Repository Variables** (need to be set if not already):
   - `STAGING_DISCORD_PUBLIC_KEY`
   - `STAGING_DISCORD_APPLICATION_ID`

2. **GitHub Repository Secrets**:
   - `STAGING_DISCORD_BOT_TOKEN`

3. **Discord Guild ID**: Get from staging Discord server

### Quick Start (Recommended)

```bash
cd orchestrator
./fix_staging_slash_commands.sh
```

Follow the prompts to:
1. Enter credentials
2. Validate bot and guild
3. Register commands
4. Check SSM parameters
5. Get next steps

### Manual Validation

```bash
cd orchestrator/scripts

# Check current status (no changes)
python validate_discord_slash_commands.py check \
  --app-id $APP_ID \
  --bot-token $BOT_TOKEN \
  --guild-id $GUILD_ID

# Register missing commands
python validate_discord_slash_commands.py full \
  --app-id $APP_ID \
  --bot-token $BOT_TOKEN \
  --guild-id $GUILD_ID \
  --register
```

### Configure AWS SSM

```bash
# Enable debug command
aws ssm put-parameter \
  --name "/valine/staging/ENABLE_DEBUG_CMD" \
  --value "true" \
  --type String \
  --overwrite \
  --region us-west-2

# Keep alerts disabled initially
aws ssm put-parameter \
  --name "/valine/staging/ENABLE_ALERTS" \
  --value "false" \
  --type String \
  --overwrite \
  --region us-west-2

# Set staging alert channel
aws ssm put-parameter \
  --name "/valine/staging/ALERT_CHANNEL_ID" \
  --value "1428102811832553554" \
  --type String \
  --overwrite \
  --region us-west-2
```

### Test in Discord

1. Open Discord staging server
2. Type `/debug-last` - should appear in autocomplete
3. Execute the command
4. Verify:
   - ✅ Response is ephemeral (only you see it)
   - ✅ Secrets are redacted (`***abcd` format)
   - ✅ Shows trace ID, command, duration, steps

**Expected Output:**
```
🔍 Last Execution Debug Info

Command: /diagnose
Trace ID: abc123de-456f-789g-hij0-klmnopqrstuv
Started: 2025-10-17 05:30:00 UTC
Duration: 2850ms

Steps:
  ✅ Validate input (10ms)
  ✅ Trigger workflow (250ms)
  ✅ Poll for completion (2500ms)
  ✅ Parse results (90ms)

[View Run](https://github.com/...)
```

---

## Evidence to Collect

### 1. Validation Script Output

Generated in `validation_evidence/`:
- `discord_commands_validation_YYYYMMDD_HHMMSS.json`
- `discord_commands_validation_YYYYMMDD_HHMMSS.md`

### 2. Command List Before/After

**Before:**
```bash
$ curl -H "Authorization: Bot $BOT_TOKEN" \
  https://discord.com/api/v10/applications/$APP_ID/guilds/$GUILD_ID/commands
[]
```

**After:**
```bash
$ curl -H "Authorization: Bot $BOT_TOKEN" \
  https://discord.com/api/v10/applications/$APP_ID/guilds/$GUILD_ID/commands
[
  {"name": "debug-last", "description": "Show last run debug info..."},
  {"name": "diagnose", "description": "Run a quick staging diagnostic"},
  {"name": "status", "description": "Show last 1-3 runs for workflows"}
]
```

### 3. SSM Parameters

```bash
$ aws ssm get-parameters-by-path --path "/valine/staging/" --region us-west-2
{
  "Parameters": [
    {"Name": "/valine/staging/ENABLE_DEBUG_CMD", "Value": "true"},
    {"Name": "/valine/staging/ENABLE_ALERTS", "Value": "false"},
    {"Name": "/valine/staging/ALERT_CHANNEL_ID", "Value": "1428102811832553554"}
  ]
}
```

### 4. Discord Test

- Screenshot of `/debug-last` autocomplete
- Screenshot of command execution
- Text of response (with redaction)
- Trace ID for CloudWatch correlation

### 5. CloudWatch Logs

Filter by trace ID:
```bash
aws logs filter-log-events \
  --log-group-name /aws/lambda/pv-api-prod-api \
  --filter-pattern "trace_id_from_debug_last" \
  --region us-west-2 \
  --start-time $(date -d '1 hour ago' +%s)000
```

---

## Troubleshooting

### Bot Not in Guild

**Error:** `❌ Bot is NOT a member of guild`

**Fix:**
```
https://discord.com/api/oauth2/authorize?client_id=$APP_ID&scope=bot%20applications.commands&permissions=0
```
Make sure to use BOTH scopes: `bot` + `applications.commands`

### Commands Not Appearing

**Causes:**
1. Discord client cache - Restart Discord
2. Wrong command type - Wait 1 hour or verify using API
3. Missing scope - Re-invite bot with correct scopes

### /debug-last Returns "Disabled"

**Fix:**
```bash
aws ssm put-parameter \
  --name "/valine/staging/ENABLE_DEBUG_CMD" \
  --value "true" \
  --type String \
  --overwrite \
  --region us-west-2
```

---

## Files Changed Summary

### New Files (4)

| File | Size | Purpose |
|------|------|---------|
| `orchestrator/scripts/validate_discord_slash_commands.py` | 21 KB | Automated validation & registration |
| `orchestrator/SLASH_COMMANDS_FIX_GUIDE.md` | 12 KB | Comprehensive fix guide |
| `orchestrator/scripts/README_SLASH_COMMANDS.md` | 9 KB | Script documentation |
| `orchestrator/fix_staging_slash_commands.sh` | 6 KB | One-command fix script |

### Updated Files (1)

| File | Changes | Purpose |
|------|---------|---------|
| `PHASE5_VALIDATION.md` | +419 lines | Added slash commands fix section |

**Total New Content:** ~48 KB (automation + documentation)

### Existing Files Leveraged (3)

- `orchestrator/setup_staging_bot.sh` - Interactive setup
- `orchestrator/register_discord_commands_staging.sh` - Manual registration
- `orchestrator/diagnose_discord_commands.sh` - Diagnostics

---

## Next Steps

### Immediate (Testing Required)

1. ✅ Scripts created and tested (syntax)
2. ✅ Documentation complete
3. ⏳ **Run validation with real credentials**
4. ⏳ **Test /debug-last in Discord staging server**
5. ⏳ **Capture screenshot evidence**
6. ⏳ **Collect CloudWatch logs for trace ID**
7. ⏳ **Update PHASE5_VALIDATION.md with actual results**

### Short-term (After Validation)

1. Test alerts functionality (set `ENABLE_ALERTS=true`)
2. Verify deduplication works
3. Document production rollout plan
4. Plan global command registration for production

### Long-term (Production)

1. Register commands as global (not guild) for production
2. Set production SSM parameters
3. Test in production Discord server
4. Monitor for 24 hours
5. Document lessons learned

---

## Configuration Reference

### GitHub Repository

**Variables:**
```
STAGING_DISCORD_PUBLIC_KEY=<from_developer_portal>
STAGING_DISCORD_APPLICATION_ID=<from_developer_portal>
STAGING_GUILD_ID=<from_discord_server>
```

**Secrets:**
```
STAGING_DISCORD_BOT_TOKEN=<from_developer_portal>
```

### AWS SSM Parameters (us-west-2)

```
/valine/staging/ENABLE_DEBUG_CMD=true
/valine/staging/ENABLE_ALERTS=false
/valine/staging/ALERT_CHANNEL_ID=1428102811832553554
```

### Discord Configuration

- **Interactions Endpoint:** `https://<api-gateway>/staging/discord`
- **Public Key:** Must match `STAGING_DISCORD_PUBLIC_KEY`
- **Bot Scopes:** `bot` + `applications.commands`
- **Permissions:** Minimal (0 or Send Messages)

---

## Benefits

1. **Instant Visibility** - Guild commands appear immediately (vs 1-hour global delay)
2. **Automated Process** - One-command fix with validation
3. **Evidence Generation** - Automatic report generation
4. **Clear Troubleshooting** - Comprehensive guide for all failure modes
5. **Production-Ready** - Same process works for production (with adjustments)

---

## Related Documentation

- **PHASE5_VALIDATION.md** - Phase 5 validation (updated with slash commands section)
- **orchestrator/SLASH_COMMANDS_FIX_GUIDE.md** - Complete fix guide
- **orchestrator/scripts/README_SLASH_COMMANDS.md** - Script documentation
- **orchestrator/DISCORD_STAGING_SETUP.md** - Staging setup (already exists)
- **orchestrator/RUNBOOK.md** - Operations runbook

---

## Contact

- **Repository:** gcolon75/Project-Valine
- **Branch:** copilot/fix-staging-slash-commands
- **AWS Region:** us-west-2
- **Staging Channel ID:** 1428102811832553554

---

## Sign-off

**Implementation:** ✅ Complete  
**Testing:** ⏳ Pending (requires credentials)  
**Documentation:** ✅ Complete  
**Ready for:** Manual testing in staging environment

**Next Action:** Run `./orchestrator/fix_staging_slash_commands.sh` with real credentials to complete the fix.
