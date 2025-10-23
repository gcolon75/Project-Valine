# Staging Slash Commands Implementation Summary

## Root Cause Analysis

**Problem:** Discord slash commands were implemented in the codebase but never registered with Discord's API for the staging guild.

**Key Findings:**
1. Command handlers exist in `orchestrator/app/handlers/discord_handler.py`:
   - `/debug-last` (lines 588-675) - Shows last execution trace
   - `/diagnose` (lines 277-366) - Triggers diagnostic workflow
   - `/status` (lines 66-145) - Shows workflow run status
   - Plus 10+ other commands

2. Lambda handler routes commands properly (line 1201+)

3. Discord interactions endpoint exists in SAM template (`orchestrator/template.yaml`)

4. **Missing piece:** Commands were never registered via Discord API

## Why Commands Don't Appear

Discord slash commands require explicit registration via API:
- **Global commands:** Registered at application level, take 1 hour to propagate
- **Guild commands:** Registered per server, appear instantly (better for staging)

Without registration:
- Commands won't appear in Discord's autocomplete
- Users can't discover or use them
- Even though handlers exist and work

## Solution Implemented

### 1. Scripts Created

#### `orchestrator/scripts/validate_discord_slash_commands.py`
- Already existed, validates and registers commands
- Checks bot authentication
- Verifies guild membership  
- Lists current commands
- Registers missing commands
- Generates validation evidence

#### `orchestrator/scripts/register_staging_slash_commands.sh`
- Bash wrapper for easy execution
- Validates environment variables
- Redacts tokens in output
- Provides next steps guidance

#### `orchestrator/scripts/discover_guild_id.sh`
- Helper to find guild ID if unknown
- Lists all guilds bot is in
- Provides invite URL if needed

### 2. GitHub Actions Workflow

**File:** `.github/workflows/register-staging-slash-commands.yml`

Features:
- Workflow dispatch trigger (manual execution)
- Auto-discovers guild ID from bot's guilds
- Registers commands as guild commands
- Uploads validation evidence as artifacts
- Posts summary to workflow summary

### 3. Documentation

**File:** `STAGING_SLASH_COMMANDS_SETUP.md`

Comprehensive guide covering:
- Quick start (3 options)
- Required configuration
- Guild ID discovery
- Verification steps
- Troubleshooting
- Architecture notes
- API reference

## How to Use

### Option 1: GitHub Actions (Recommended)

1. Ensure repository secrets/vars are set:
   - `STAGING_DISCORD_BOT_TOKEN` (secret)
   - `STAGING_DISCORD_APPLICATION_ID` (var)
   - `STAGING_DISCORD_GUILD_ID` (var, optional)

2. Go to Actions → "Register Staging Slash Commands"

3. Click "Run workflow"

4. Check workflow summary and artifacts

### Option 2: Local Execution

```bash
# Set environment variables
export STAGING_DISCORD_APPLICATION_ID="your_app_id"
export STAGING_DISCORD_BOT_TOKEN="your_bot_token"
export STAGING_DISCORD_GUILD_ID="your_guild_id"

# Run registration
cd orchestrator/scripts
./register_staging_slash_commands.sh
```

### Option 3: Direct Python

```bash
cd orchestrator/scripts
pip install requests pynacl

python3 validate_discord_slash_commands.py full \
    --app-id "$STAGING_DISCORD_APPLICATION_ID" \
    --bot-token "$STAGING_DISCORD_BOT_TOKEN" \
    --guild-id "$STAGING_DISCORD_GUILD_ID" \
    --register
```

## Verification Checklist

After registration:

- [ ] Commands appear in Discord autocomplete (type `/` to check)
- [ ] `/status` works (doesn't require trace data)
- [ ] `/debug-last` requires `ENABLE_DEBUG_CMD=true` in SSM
- [ ] `/debug-last` shows ephemeral response with redacted secrets
- [ ] CloudWatch logs contain trace IDs
- [ ] PHASE5_VALIDATION.md updated with evidence

## AWS SSM Parameters Required

For `/debug-last` to work:

```bash
# Enable debug command
aws ssm put-parameter \
    --region us-west-2 \
    --name /valine/staging/ENABLE_DEBUG_CMD \
    --type String \
    --value true \
    --overwrite

# Keep alerts disabled for staging
aws ssm put-parameter \
    --region us-west-2 \
    --name /valine/staging/ENABLE_ALERTS \
    --type String \
    --value false \
    --overwrite

# Set alert channel (staging only)
aws ssm put-parameter \
    --region us-west-2 \
    --name /valine/staging/ALERT_CHANNEL_ID \
    --type String \
    --value 1428102811832553554 \
    --overwrite
```

## Common Issues and Fixes

### Issue: Bot not in guild

**Error:** "Bot is NOT a member of guild"

**Fix:** Invite bot with correct scopes:
```
https://discord.com/api/oauth2/authorize?client_id=<APP_ID>&scope=bot%20applications.commands&permissions=0
```

Note the TWO scopes: `bot` AND `applications.commands`

### Issue: /debug-last says "disabled"

**Error:** "Debug commands are disabled (ENABLE_DEBUG_CMD=false)"

**Fix:** Set SSM parameter (see above)

### Issue: /debug-last says "no trace found"

**Error:** "No recent trace found. Execute a command first."

**Fix:** Normal behavior. Run another command first (like `/status`)

### Issue: Commands registered but don't respond

**Possible causes:**
1. Signature verification failing
2. Wrong DISCORD_PUBLIC_KEY
3. Lambda not receiving requests
4. Interactions endpoint misconfigured

**Debug:**
- Check CloudWatch logs: `/aws/lambda/pv-api-prod-api`
- Search for: "discord", "signature", "interaction", 401, 403
- Verify public key matches Discord Developer Portal
- Verify interactions endpoint URL is correct

## Phase 5 Validation Integration

The `/debug-last` command is part of Phase 5 (Observability):

1. **Structured Logging:** JSON logs with trace IDs
2. **Secret Redaction:** Shows last 4 chars only
3. **/debug-last Command:** Ephemeral debug info
4. **Discord Alerts:** Rate-limited notifications
5. **CI Watchguard:** bot-smoke.yml workflow

To update PHASE5_VALIDATION.md:

```bash
cd orchestrator/scripts

# Generate config
python3 phase5_staging_validator.py generate-config \
    --output staging_config.json

# Edit staging_config.json with actual values

# Update docs
python3 phase5_staging_validator.py update-docs \
    --config staging_config.json

# Or run full validation
python3 phase5_staging_validator.py full-validation \
    --config staging_config.json
```

## Security Considerations

✅ **Implemented:**
- Token redaction in logs (last 4 chars)
- Ephemeral responses for debug info
- Secret redaction in trace data
- Production channel pattern blocking
- Signature verification for all requests

⚠️ **Important:**
- Never post staging alerts to production channels
- Keep `ENABLE_ALERTS=false` by default in staging
- Use guild commands (not global) for staging
- Rotate tokens if exposed

## Files Modified/Created

### Created:
- `.github/workflows/register-staging-slash-commands.yml`
- `STAGING_SLASH_COMMANDS_SETUP.md`
- `orchestrator/scripts/register_staging_slash_commands.sh`
- `orchestrator/scripts/discover_guild_id.sh`
- `STAGING_SLASH_COMMANDS_IMPLEMENTATION.md` (this file)

### Existing (Not Modified):
- `orchestrator/scripts/validate_discord_slash_commands.py` (already complete)
- `orchestrator/app/handlers/discord_handler.py` (handlers already implemented)
- `orchestrator/template.yaml` (Lambda config already correct)

## Next Steps

### Immediate (Can be done now):
1. ✅ Review scripts and documentation
2. ✅ Verify GitHub Actions workflow syntax
3. ✅ Ensure all files are committed

### Requires Credentials:
4. ⏸️ Run GitHub Actions workflow to register commands
5. ⏸️ Or run local script with staging credentials
6. ⏸️ Verify commands appear in Discord

### Requires AWS Access:
7. ⏸️ Set SSM parameters (ENABLE_DEBUG_CMD, etc.)
8. ⏸️ Run phase5_staging_validator.py
9. ⏸️ Update PHASE5_VALIDATION.md with evidence
10. ⏸️ Create docs PR on staging/phase5-validation-evidence

### Final Verification:
11. ⏸️ Test /debug-last in staging Discord
12. ⏸️ Capture transcript (redacted)
13. ⏸️ Check CloudWatch logs for trace ID
14. ⏸️ Verify ENABLE_ALERTS=false
15. ⏸️ Document final evidence

## Success Criteria

When complete, you should have:

- [x] Scripts and workflows to register commands ✅
- [x] Comprehensive documentation ✅
- [ ] Commands visible in staging Discord UI
- [ ] /debug-last working with ephemeral response
- [ ] Secrets properly redacted
- [ ] Trace IDs in CloudWatch logs
- [ ] PHASE5_VALIDATION.md updated
- [ ] Docs PR opened on staging branch
- [ ] ENABLE_ALERTS=false confirmed
- [ ] Evidence captured and documented

## Timeline Estimate

Assuming credentials are available:

1. Register commands: 5 minutes
2. Set SSM parameters: 5 minutes
3. Test in Discord: 10 minutes
4. Run phase5 validator: 15 minutes
5. Update docs and PR: 10 minutes

**Total:** ~45 minutes hands-on time

## Support Resources

- **Main Guide:** `STAGING_SLASH_COMMANDS_SETUP.md`
- **Validation Script:** `orchestrator/scripts/validate_discord_slash_commands.py`
- **Phase 5 Docs:** `PHASE5_VALIDATION.md`
- **CloudWatch Logs:** `/aws/lambda/pv-api-prod-api`
- **Discord API Docs:** https://discord.com/developers/docs/interactions/application-commands

## Contact

For issues or questions:
- Check validation evidence in `orchestrator/scripts/validation_evidence/`
- Review CloudWatch logs for errors
- Verify all environment variables are set
- Check Discord Developer Portal configuration
