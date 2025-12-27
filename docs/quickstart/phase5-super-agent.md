# Phase 5 Super-Agent Quick Start Guide

**5-Minute Setup and Validation**

## What Is This?

The Phase 5 Staging Super-Agent is a comprehensive validation tool that:
- ✅ Runs Steps 3-8 of the Phase 5 staging validation
- ✅ Applies double-check framework for robustness
- ✅ Verifies Discord slash commands registration
- ✅ Outputs a single, clean report with actionable fixes
- ✅ Redacts all secrets automatically

## Prerequisites

- Python 3.11+
- AWS CLI configured (for staging validation)
- Discord bot token (optional, for Discord checks)
- GitHub token (optional, for workflow validation)

## Step 1: Generate Configuration (30 seconds)

```powershell
cd orchestrator/scripts
python phase5_super_agent.py generate-config
```

**Output:**
```
✅ Generated default configuration: super_agent_config.json
```

## Step 2: Configure Environment (1 minute)

### Option A: Use Environment Variables (Recommended)

```powershell
$env:DISCORD_BOT_TOKEN = "your-bot-token"
$env:DISCORD_APP_ID = "your-app-id"
$env:DISCORD_GUILD_ID_STAGING = "your-guild-id"
$env:GITHUB_TOKEN = "your-github-token"
```

### Option B: Edit Config File

Edit `super_agent_config.json`:

```json
{
  "discord": {
    "bot_token": "your-actual-token",
    "app_id": "your-app-id",
    "guild_id": "your-guild-id"
  }
}
```

⚠️ **Warning:** Don't commit actual tokens to git!

## Step 3: Run Validation (3 minutes)

### Dry Run (Safe Test)

```powershell
python phase5_super_agent.py run --config super_agent_config.json --dry-run
```

### Full Validation

```powershell
python phase5_super_agent.py run --config super_agent_config.json
```

## Step 4: Review Results (1 minute)

Check the output:

```
[12:00:00] ℹ️  Phase 5 Staging Super-Agent
[12:00:00] ℹ️  Correlation ID: SUPER-AGENT-1234567890
...
[12:00:15] ✅ Validation complete in 15234ms

## Summary

**Total Checks:** 12
- ✅ Passed: 10
- ❌ Failed: 0
- ⚠️ Warnings: 2
- ⏭️ Skipped: 0

✅ Validation completed successfully
```

## Step 5: Review Reports

### Markdown Report

```powershell
ls -lt validation_evidence/
Get-Content validation_evidence/super_agent_report_*.md
```

### JSON Report

```powershell
Get-Content validation_evidence/super_agent_report_*.json | python -m json.tool
```

## Common Issues and Quick Fixes

### Issue: Missing Tokens

**Error:**
```
⚠️ Required Tokens Present: WARNING
Missing tokens: discord_bot_token, discord_app_id
```

**Fix:**
```powershell
$env:DISCORD_BOT_TOKEN = "your-token"
$env:DISCORD_APP_ID = "your-app-id"
```

### Issue: URL Not Reachable

**Error:**
```
❌ URL Reachable: https://staging.example.com: FAIL
```

**Fix:**
Edit `super_agent_config.json`:
```json
{
  "staging": {
    "urls": [
      "https://your-actual-staging-url.com"
    ]
  }
}
```

### Issue: AWS Credentials Not Configured

**Error:**
```
❌ Step 4: Deploy-to-Staging Verification: FAIL
```

**Fix:**
```powershell
aws configure
# or
$env:AWS_PROFILE = "staging"
```

## GitHub Actions (Automated)

### Manual Run

1. Go to: https://github.com/gcolon75/Project-Valine/actions/workflows/phase5-super-agent.yml
2. Click "Run workflow"
3. Select options:
   - Dry run: false (for real validation)
   - Verbose: true (for detailed logs)
4. Click "Run workflow"

### Scheduled Run

The workflow runs automatically every Monday at 10 AM UTC.

## What Gets Validated

### Steps 3-8

| Step | What It Checks | Pass Criteria |
|------|----------------|---------------|
| 3 | Build + Artifacts | CI workflows exist, package.json present |
| 4 | Deployment | AWS CLI available, SSM accessible |
| 5 | Health | API endpoints return 200, GET/HEAD consistent |
| 6 | Smoke Tests | Test files exist, pytest available |
| 7 | E2E Tests | E2E framework detected (optional) |
| 8 | Observability | CloudWatch logs accessible |

### Discord Commands

- Fetches current guild commands
- Verifies bot authentication
- Checks for expected commands: `/verify-latest`, `/verify-run`, `/diagnose`, `/debug-last`
- Reports missing or outdated commands

### Double-Check Framework

For each validation:
- Primary check (main verification method)
- Secondary check (alternate verification method)
- Consistency check (both methods agree)
- Discrepancy reporting (if methods disagree)

## Report Structure

### Sections

1. **Context** - Timestamp, repo, configuration
2. **Summary** - Pass/fail counts, quick overview
3. **Steps 3-8 Results** - Detailed table with status and duration
4. **Double-Check Matrix** - Primary vs secondary verification
5. **Discord Commands** - Registered, missing, verified
6. **Issues** - Problems found with details
7. **Remediation Playbook** - Ordered list of fixes
8. **Artifacts** - Links to evidence files
9. **Appendix** - Full check results with raw data

## Best Practices

### 1. Run Before Production Deploy

```powershell
python phase5_super_agent.py run --config super_agent_config.json
# Review report
# Address any issues
# Deploy to production
```

### 2. Schedule Weekly Runs

The GitHub Actions workflow runs automatically. Review results weekly.

### 3. Keep Configuration Updated

Update `super_agent_config.json` when:
- Staging URLs change
- New Discord commands added
- AWS resources change
- Validation requirements change

### 4. Review Double-Check Inconsistencies

If primary and secondary checks disagree:
```
| Step 5: Health Check | ✅ PASS | ❌ FAIL | ❌ |
```

Investigate why:
- Check network connectivity
- Verify endpoint behavior
- Review server logs

### 5. Act on Remediation Steps

The report provides concrete fixes:
```
1. Set environment variable DISCORD_BOT_TOKEN
2. Verify URL https://staging.example.com is accessible
3. Register missing Discord commands: debug-last
```

Complete each step and re-run validation.

## Advanced Usage

### Custom Staging URLs

```json
{
  "staging": {
    "urls": [
      "https://staging-v2.example.com",
      "https://staging-v2.example.com/api/health",
      "https://staging-v2.example.com/api/version"
    ]
  }
}
```

### Custom Timeouts

```json
{
  "timeouts": {
    "action_dispatch": 900000,  // 15 minutes
    "http": 30000,              // 30 seconds
    "discord_propagation": 120000  // 2 minutes
  }
}
```

### Verbose Logging

```powershell
python phase5_super_agent.py run --config super_agent_config.json --verbose
```

### Targeted Validation

Edit config to skip certain checks:
```json
{
  "staging": {
    "urls": []  // Skip URL checks
  },
  "discord": {
    "bot_token": null  // Skip Discord checks
  }
}
```

## Integration with CI/CD

### In GitHub Actions

```yaml
- name: Run Phase 5 Super-Agent
  run: |
    cd orchestrator/scripts
    python phase5_super_agent.py run --config super_agent_config.json
```

### In Shell Scripts

```powershell
#!/bin/bash
set -e

cd orchestrator/scripts

# Generate config
python phase5_super_agent.py generate-config

# Run validation
python phase5_super_agent.py run --config super_agent_config.json

# Check exit code
if [ $? -eq 0 ]; then
  echo "✅ Validation passed"
else
  echo "❌ Validation failed"
  exit 1
fi
```

## Troubleshooting

### Debug Mode

Set verbose flag and check logs:
```powershell
python phase5_super_agent.py run --config super_agent_config.json --verbose 2>&1 | tee validation.log
```

### Check Dependencies

```powershell
python --version  # Should be 3.11+
pip install requests boto3
aws --version
```

### Validate Configuration

```powershell
python -c "import json; print(json.load(open('super_agent_config.json')))"
```

### Check AWS Credentials

```powershell
aws sts get-caller-identity
aws ssm describe-parameters --region us-west-2 --max-results 1
```

### Test Discord Token

```powershell
Invoke-RestMethod -Uri "-H" -Method Get -Headers @{
    "Authorization" = "Bot $DISCORD_BOT_TOKEN"
}```

## Support

- **Full Documentation**: `PHASE5_SUPER_AGENT_README.md`
- **Tests**: `orchestrator/tests/test_phase5_super_agent.py`
- **Issues**: https://github.com/gcolon75/Project-Valine/issues
- **Workflow**: `.github/workflows/phase5-super-agent.yml`

## Summary

**You now have:**
- ✅ Phase 5 Super-Agent configured
- ✅ Validation reports generated
- ✅ Remediation steps identified
- ✅ Automated weekly validation (GitHub Actions)

**Next steps:**
1. Address any issues in remediation playbook
2. Run full validation in staging
3. Review reports before production deploy
4. Set up weekly automated runs

**Total setup time:** ~5 minutes 🎉
