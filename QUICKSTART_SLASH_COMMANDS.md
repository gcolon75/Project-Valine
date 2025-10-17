# Quick Start: Register Staging Slash Commands

This guide walks through the actual execution steps to register Discord slash commands in staging.

## Prerequisites

Ensure you have these credentials/values available:

### From Discord Developer Portal
1. **Application ID** - Found under "General Information" → "Application ID"
2. **Bot Token** - Found under "Bot" → "Token" (click "Reset Token" if needed)
3. **Public Key** - Found under "General Information" → "Public Key"
4. **Guild ID** - Your staging Discord server ID (can be auto-discovered)

### Optional: AWS Access
- AWS credentials with SSM read/write permissions for `/valine/staging/*`
- Or: AWS OIDC role via GitHub Actions

## Step-by-Step Execution

### Option 1: GitHub Actions (Easiest)

**Step 1:** Set repository secrets/variables

Go to repository Settings → Secrets and variables → Actions

**Secrets** (encrypted, not visible):
- `STAGING_DISCORD_BOT_TOKEN` = `Bot YOUR_BOT_TOKEN_HERE`

**Variables** (visible in logs):
- `STAGING_DISCORD_APPLICATION_ID` = `123456789012345678`
- `STAGING_DISCORD_PUBLIC_KEY` = `abc123...`
- `STAGING_DISCORD_GUILD_ID` = `987654321098765432` (optional, can auto-discover)

**Step 2:** Run the workflow

1. Go to Actions tab
2. Select "Register Staging Slash Commands" workflow
3. Click "Run workflow"
4. Click green "Run workflow" button
5. Wait ~30 seconds

**Step 3:** Check results

- Workflow should complete successfully
- Check "Summary" tab for validation report
- Download "slash-commands-registration-evidence" artifact if needed

**Step 4:** Verify in Discord

1. Open staging Discord server
2. Type `/` in any channel
3. Look for `/debug-last`, `/diagnose`, `/status` commands
4. They should appear immediately (guild commands)

### Option 2: Local Execution

**Step 1:** Export environment variables

```bash
export STAGING_DISCORD_APPLICATION_ID="your_app_id_here"
export STAGING_DISCORD_BOT_TOKEN="Bot your_bot_token_here"
export STAGING_DISCORD_GUILD_ID="your_guild_id_here"  # Optional
```

**Note:** Bot token must include the `Bot ` prefix!

**Step 2:** Discover guild ID (if needed)

```bash
cd orchestrator/scripts
./discover_guild_id.sh
```

This will list all guilds your bot is in. Copy the desired guild ID.

**Step 3:** Run registration

```bash
cd orchestrator/scripts
./register_staging_slash_commands.sh
```

**Step 4:** Verify output

Expected output:
```
🚀 Registering Discord Slash Commands for Staging

Configuration:
  App ID: ***5678
  Bot Token: ***abcd
  Guild ID: 1234567890
  Evidence Dir: /path/to/validation_evidence

[09:30:15] ℹ️ Discord Slash Commands Validation
[09:30:15] ✅ Bot authenticated: @ProjectValineStaging (ID: 123...)
[09:30:16] ✅ Bot is member of guild: Staging Server
[09:30:16] ⚠️  No guild commands currently registered
[09:30:17] ℹ️ Registering staging commands...
[09:30:17] ✅ /debug-last registered (status 201)
[09:30:18] ✅ /diagnose registered (status 201)
[09:30:18] ✅ /status registered (status 201)
[09:30:19] ✅ All 3 commands registered successfully
[09:30:19] ✅ /debug-last command is registered ✅
[09:30:19] ✅ Evidence saved to: validation_evidence/...

✅ Registration completed successfully!
```

### Option 3: Direct Python

**Step 1:** Install dependencies

```bash
cd orchestrator/scripts
pip install requests pynacl
```

**Step 2:** Run validator

```bash
python3 validate_discord_slash_commands.py full \
    --app-id "$STAGING_DISCORD_APPLICATION_ID" \
    --bot-token "$STAGING_DISCORD_BOT_TOKEN" \
    --guild-id "$STAGING_DISCORD_GUILD_ID" \
    --register
```

## Enable /debug-last Command

After registration, enable the command via AWS SSM:

```bash
# Method 1: AWS CLI
aws ssm put-parameter \
    --region us-west-2 \
    --name /valine/staging/ENABLE_DEBUG_CMD \
    --type String \
    --value true \
    --overwrite

# Method 2: GitHub Actions (if workflow exists)
# Trigger "Phase 5 Staging Validation" workflow with:
# - validation_type: enable-debug
```

## Test Commands in Discord

### Test /status
1. In Discord, type `/status`
2. Press Enter
3. Should see last 2 workflow runs

### Test /diagnose  
1. In Discord, type `/diagnose`
2. Press Enter
3. Should trigger a diagnostic workflow
4. Follow-up message shows run link

### Test /debug-last
1. First run another command (to generate trace)
2. Type `/debug-last`
3. Press Enter
4. Should see ephemeral response with:
   - Command name
   - Trace ID
   - Started timestamp
   - Duration
   - Step-by-step timings
   - Secrets redacted (***last4)

**Example response:**
```
🔍 Last Execution Debug Info

Command: /diagnose
Trace ID: abc123de-456f-789g-hij0-klmnopqrstuv
Started: 2025-10-17 12:34:56 UTC
Duration: 2500ms

Steps:
  ✅ Validate authorization (10ms)
  ✅ Trigger workflow (200ms)
  ✅ Wait for run start (2000ms)
  ✅ Post follow-up (100ms)
```

## Troubleshooting

### Commands not appearing

**Check:** Bot has `applications.commands` scope

**Fix:** Re-invite bot with:
```
https://discord.com/api/oauth2/authorize?client_id=<APP_ID>&scope=bot%20applications.commands&permissions=0
```

### /debug-last says "disabled"

**Check:** SSM parameter `ENABLE_DEBUG_CMD`

**Fix:** Run the AWS SSM command above

### Bot authentication fails

**Check:** Token includes `Bot ` prefix

**Fix:** 
```bash
# Wrong
export STAGING_DISCORD_BOT_TOKEN="MTE..."

# Correct
export STAGING_DISCORD_BOT_TOKEN="Bot MTE..."
```

### Guild not found

**Check:** Bot is actually in the guild

**Fix:** Invite bot or verify guild ID is correct

## Phase 5 Validation

After commands work, update PHASE5_VALIDATION.md:

```bash
cd orchestrator/scripts

# Generate staging config
cat > staging_config.json << EOF
{
  "staging_deploy_method": "ssm_parameter_store",
  "aws_region": "us-west-2",
  "ssm_parameter_prefix": "/valine/staging/",
  "test_channel_id": "1428102811832553554",
  "cloudwatch_log_group": "/aws/lambda/pv-api-prod-api",
  "github_repo": "gcolon75/Project-Valine",
  "github_token": "ENV:STAGING_GITHUB_TOKEN",
  "evidence_output_dir": "./validation_evidence"
}
EOF

# Run validation
python3 phase5_staging_validator.py full-validation \
    --config staging_config.json
```

## Create Docs PR

After validation:

```bash
cd /home/runner/work/Project-Valine/Project-Valine

# Create docs branch
git checkout -b staging/phase5-validation-evidence

# Commit changes
git add PHASE5_VALIDATION.md orchestrator/scripts/validation_evidence/
git commit -m "Update PHASE5_VALIDATION.md with staging evidence"

# Push and create PR
git push origin staging/phase5-validation-evidence
gh pr create --title "Phase 5: Staging Validation Evidence" \
    --body "Updates PHASE5_VALIDATION.md with staging validation results"
```

## Cleanup

After testing, ensure safe defaults:

```bash
# Keep debug command enabled in staging (it's safe)
aws ssm put-parameter \
    --region us-west-2 \
    --name /valine/staging/ENABLE_DEBUG_CMD \
    --type String \
    --value true \
    --overwrite

# Keep alerts disabled (safe default)
aws ssm put-parameter \
    --region us-west-2 \
    --name /valine/staging/ENABLE_ALERTS \
    --type String \
    --value false \
    --overwrite
```

## Success Checklist

- [ ] Commands registered via GitHub Actions or local script
- [ ] Commands visible in Discord (type `/` to check)
- [ ] `/status` command works
- [ ] `/diagnose` command works
- [ ] `ENABLE_DEBUG_CMD=true` set in SSM
- [ ] `/debug-last` command works and shows ephemeral response
- [ ] Secrets redacted in /debug-last output (***last4)
- [ ] Trace ID visible in /debug-last output
- [ ] CloudWatch logs contain trace IDs
- [ ] PHASE5_VALIDATION.md updated with evidence
- [ ] Docs PR created on staging branch
- [ ] ENABLE_ALERTS=false confirmed in SSM

## Next Steps

1. ✅ Commands registered and working
2. ✅ Evidence collected
3. ✅ Documentation updated
4. ⏭️ Prepare for production rollout (separate effort)

## Support

- **Main docs:** `STAGING_SLASH_COMMANDS_SETUP.md`
- **Implementation:** `STAGING_SLASH_COMMANDS_IMPLEMENTATION.md`
- **Validation script:** `orchestrator/scripts/validate_discord_slash_commands.py`
- **CloudWatch logs:** `/aws/lambda/pv-api-prod-api`
