# Phase 5 Staging Validation Runner - Usage Guide

**Version:** 2.0  
**Date:** 2025-10-17  
**Status:** Production Ready

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Detailed Workflow](#detailed-workflow)
5. [Command Reference](#command-reference)
6. [Manual Testing Procedures](#manual-testing-procedures)
7. [Evidence Review](#evidence-review)
8. [Troubleshooting](#troubleshooting)

## Overview

The Phase 5 Staging Validation Runner automates the validation of Phase 5 observability features (structured logging, /debug-last command, and alerts) in a staging environment. It implements Steps 3-8 from the validation specification:

- **Step 3:** Verify IAM and SSM parameters
- **Step 4:** Validate /debug-last (ephemeral + redacted)
- **Step 5:** Enable alerts and run controlled failure
- **Step 6:** Capture redacted evidence
- **Step 7:** Revert flags to safe defaults
- **Step 8:** Prepare and update PHASE5_VALIDATION.md

## Prerequisites

### Required Software

- Python 3.8 or higher
- AWS CLI configured with credentials
- Git (for PR creation)
- Access to staging environment

### Required AWS Permissions

Your IAM role must have:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:GetFunctionConfiguration",
        "lambda:UpdateFunctionConfiguration"
      ],
      "Resource": "arn:aws:lambda:*:*:function:valine-orchestrator-*-staging"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:PutParameter"
      ],
      "Resource": "arn:aws:ssm:*:*:parameter/valine/staging/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:FilterLogEvents",
        "logs:GetLogEvents",
        "logs:DescribeLogGroups"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/lambda/valine-orchestrator-*-staging:*"
    }
  ]
}
```

### Required Configuration

You need the following information:

- AWS region (e.g., us-west-2)
- Lambda function names (Discord and GitHub handlers)
- SSM parameter prefix (e.g., /valine/staging/)
- CloudWatch log group names
- Discord staging channel ID
- Discord staging bot token or webhook (for alerts)

## Quick Start

### 1. Generate Configuration

```powershell
cd orchestrator/scripts
python phase5_staging_validator.py generate-config --output staging_config.json
```

### 2. Edit Configuration

Open `staging_config.json` and fill in your values:

```json
{
  "staging_deploy_method": "ssm_parameter_store",
  "aws_region": "us-west-2",
  "staging_lambda_discord": "valine-orchestrator-discord-staging",
  "staging_lambda_github": "valine-orchestrator-github-staging",
  "ssm_parameter_prefix": "/valine/staging/",
  "test_channel_id": "1234567890",
  "log_group_discord": "/aws/lambda/valine-orchestrator-discord-staging",
  "log_group_github": "/aws/lambda/valine-orchestrator-github-staging",
  "correlation_id_prefix": "STG",
  "evidence_output_dir": "./validation_evidence",
  "production_channel_patterns": ["prod", "production", "live"]
}
```

**Important:** Use actual staging values. Never use production channel IDs!

### 3. Run Preflight Checks

```powershell
python phase5_staging_validator.py preflight --config staging_config.json
```

Expected output:
```
{"ts": "...", "level": "info", "service": "phase5-validator", "msg": "Starting preflight checks"}
{"ts": "...", "level": "info", "service": "phase5-validator", "msg": "Preflight checks passed"}
```

### 4. Run Full Validation

```powershell
python phase5_staging_validator.py full-validation --config staging_config.json
```

This will:
1. Verify IAM permissions and read current SSM values (Step 3)
2. Enable debug command and document test procedure (Step 4)
3. Enable alerts with staging channel (Step 5)
4. Collect CloudWatch logs with redaction (Step 6)
5. Revert flags to safe defaults (Step 7)
6. Update PHASE5_VALIDATION.md with evidence (Step 8)

Duration: ~5-10 minutes (automated) + 30-45 minutes (manual testing)

### 5. Complete Manual Testing

See [Manual Testing Procedures](#manual-testing-procedures) below.

### 6. Review Evidence

```powershell
ls -la validation_evidence/
Get-Content validation_evidence/executive_summary_*.md
Get-Content validation_evidence/validation_report_*.md
```

### 7. Create Pull Request

```powershell
cd /home/runner/work/Project-Valine/Project-Valine
git checkout -b staging/phase5-validation-evidence
git add PHASE5_VALIDATION.md orchestrator/scripts/validation_evidence/
git commit -m "docs: Add Phase 5 staging validation evidence"
git push origin staging/phase5-validation-evidence
```

Then create PR via GitHub UI or:
```powershell
gh pr create --title "docs: Phase 5 staging validation evidence" \
  --body "Staging validation completed. See PHASE5_VALIDATION.md for evidence."
```

## Detailed Workflow

### Phase 1: Preparation (5-10 minutes)

**1.1 Configure AWS Credentials**

```powershell
# Option A: AWS CLI configuration
aws configure

# Option B: Environment variables
$env:AWS_ACCESS_KEY_ID = "your-key"
$env:AWS_SECRET_ACCESS_KEY = "your-secret"
$env:AWS_DEFAULT_REGION = "us-west-2"

# Option C: AWS SSO
aws sso login --profile staging
$env:AWS_PROFILE = "staging"
```

**1.2 Verify AWS Access**

```powershell
# Test Lambda access
aws lambda get-function-configuration \
  --function-name valine-orchestrator-discord-staging \
  --region us-west-2

# Test SSM access
aws ssm get-parameter \
  --name /valine/staging/ENABLE_DEBUG_CMD \
  --region us-west-2

# Test CloudWatch Logs access
aws logs describe-log-groups \
  --log-group-name-prefix /aws/lambda/valine-orchestrator \
  --region us-west-2
```

**1.3 Generate and Edit Configuration**

```powershell
cd orchestrator/scripts
python phase5_staging_validator.py generate-config --output staging_config.json

# Edit with your preferred editor
nano staging_config.json
# or
vim staging_config.json
```

**1.4 Validate Configuration**

```powershell
python phase5_staging_validator.py preflight --config staging_config.json
```

Fix any errors before proceeding.

### Phase 2: Step 3 - Verify IAM and SSM Parameters (5 minutes)

**2.1 Verify IAM Permissions**

```powershell
python phase5_staging_validator.py verify-iam --config staging_config.json
```

This tests:
- SSM GetParameter permission
- SSM PutParameter permission (via test write)
- CloudWatch Logs read access

**2.2 Read Current SSM Values**

```powershell
python phase5_staging_validator.py read-ssm --config staging_config.json
```

Expected output:
```
Current SSM values (redacted):
  ENABLE_DEBUG_CMD = true
  ENABLE_ALERTS = false
  ALERT_CHANNEL_ID = ***4567
```

**2.3 Fix Mismatches (if any)**

If values don't match expectations:

```powershell
# Set correct values
aws ssm put-parameter \
  --name /valine/staging/ENABLE_DEBUG_CMD \
  --value "true" \
  --type String \
  --overwrite \
  --region us-west-2

aws ssm put-parameter \
  --name /valine/staging/ENABLE_ALERTS \
  --value "false" \
  --type String \
  --overwrite \
  --region us-west-2
```

### Phase 3: Step 4 - Validate /debug-last (10-15 minutes)

**3.1 Enable Debug Command**

```powershell
python phase5_staging_validator.py enable-debug --config staging_config.json
```

Wait 30 seconds for Lambda configuration to propagate.

**3.2 Test in Discord (Manual)**

In your staging Discord channel:

1. Execute a command:
   ```
   /diagnose repo:gcolon75/Project-Valine
   ```

2. Wait for command to complete

3. Immediately execute:
   ```
   /debug-last
   ```

**3.3 Verify Response**

✅ **Expected Behavior:**
- Response is ephemeral (only you see it)
- Contains trace_id (UUID format)
- Shows command executed
- Shows step timings (ms)
- Shows GitHub run link
- Secrets are redacted (***last4)
- Output < 1900 characters

❌ **If you see issues:**
- "Debug commands are disabled" → Wait longer (60s) and retry
- No trace found → Execute a command first
- Secrets not redacted → Report bug (critical)

**3.4 Capture Evidence**

Take screenshot or copy text:
```
🔍 Last Execution Debug Info

Command: /diagnose
Trace ID: abc123de-456f-789g-hij0-klmnopqrstuv
Started: 2025-10-17 03:45:00 UTC
Duration: 2850ms

Steps:
  ✅ Validate input (10ms)
  ✅ Trigger workflow (250ms)
  ✅ Poll for completion (2500ms)
  ✅ Parse results (90ms)

[View Run](https://github.com/gcolon75/Project-Valine/actions/runs/...)
```

Save to: `validation_evidence/debug-last-transcript.txt`

**3.5 Verify in CloudWatch**

```powershell
python phase5_staging_validator.py collect-logs \
  --config staging_config.json \
  --trace-id abc123de-456f-789g-hij0-klmnopqrstuv
```

Confirm trace_id appears in logs.

### Phase 4: Step 5 - Enable Alerts and Test (15-20 minutes)

**4.1 Disable Alerts (Clean State)**

```powershell
python phase5_staging_validator.py disable-alerts --config staging_config.json
```

**4.2 Enable Alerts with Staging Channel**

```powershell
python phase5_staging_validator.py enable-alerts \
  --config staging_config.json \
  --channel-id YOUR_STAGING_CHANNEL_ID
```

Wait 30 seconds for Lambda configuration to propagate.

**4.3 Trigger Controlled Failure (Manual)**

Option A: Invalid workflow dispatch
```powershell
# In Discord staging channel
/deploy workflow:invalid-workflow-name wait:false
```

Option B: Test endpoint (if available)
```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Authorization" = "Bearer YOUR_TEST_TOKEN"
} -Body '{"severity": "critical", "message": "Test alert"}' -ContentType 'application/json'
```

Option C: Manual trigger via AWS CLI
```powershell
aws lambda invoke \
  --function-name valine-orchestrator-discord-staging \
  --payload '{"body": "test alert trigger"}' \
  --region us-west-2 \
  response.json
```

**4.4 Verify Alert Posted**

Check your staging Discord channel for alert:

```
🔴 CRITICAL ALERT

Workflow dispatch failed

Root Cause: Workflow 'invalid-workflow-name' not found (404)
Trace ID: def456gh-789i-012j-klm3-nopqrstuvwxy

[View Run](https://github.com/gcolon75/Project-Valine/actions/runs/...)
[CloudWatch Logs](https://console.aws.amazon.com/cloudwatch/...)
```

✅ **Verify:**
- Alert posted to staging channel
- Severity emoji correct (🔴 for critical)
- Root cause message present
- Trace ID present
- Links present
- No secrets visible

**4.5 Test Rate-Limiting (Dedupe)**

1. Trigger the same failure again immediately
2. Verify NO second alert posts (rate-limited)
3. Wait 6 minutes
4. Trigger the same failure again
5. Verify new alert posts (dedupe expired)

**4.6 Capture Evidence**

Copy alert text to: `validation_evidence/alert-message.txt`

Take screenshot and save to: `validation_evidence/alert-screenshot.png`

### Phase 5: Step 6 - Capture Redacted Evidence (5 minutes)

**5.1 Collect CloudWatch Logs**

```powershell
# Get logs for specific trace
python phase5_staging_validator.py collect-logs \
  --config staging_config.json \
  --trace-id YOUR_TRACE_ID

# Get all logs for this validation run
python phase5_staging_validator.py collect-logs \
  --config staging_config.json
```

**5.2 Review Evidence Files**

```powershell
ls -la validation_evidence/
Get-Content validation_evidence/validation_report_*.md
Get-Content validation_evidence/executive_summary_*.md
```

**5.3 Verify Redaction**

Check that all evidence has secrets redacted:
```powershell
Select-String -r "ghp_" validation_evidence/  # Should find nothing
Select-String -r "token" validation_evidence/ # Should show ***last4 format
```

### Phase 6: Step 7 - Revert Flags to Safe Defaults (2 minutes)

**6.1 Revert All Flags**

```powershell
python phase5_staging_validator.py revert-flags --config staging_config.json
```

This sets:
- ENABLE_ALERTS = false
- ENABLE_DEBUG_CMD = false

**6.2 Verify Reversion**

```powershell
python phase5_staging_validator.py read-ssm --config staging_config.json
```

Expected output:
```
Current SSM values (redacted):
  ENABLE_DEBUG_CMD = false
  ENABLE_ALERTS = false
  ALERT_CHANNEL_ID = ***4567
```

### Phase 7: Step 8 - Update Documentation and Create PR (10 minutes)

**7.1 Update PHASE5_VALIDATION.md**

```powershell
python phase5_staging_validator.py update-docs --config staging_config.json
```

This automatically updates PHASE5_VALIDATION.md with:
- Staging validation run section
- Configuration used
- Test results
- Acceptance criteria checklist
- Evidence summary
- Operator sign-off block

**7.2 Review Changes**

```powershell
git diff PHASE5_VALIDATION.md
```

**7.3 Create Branch and Commit**

```powershell
cd /home/runner/work/Project-Valine/Project-Valine
git checkout -b staging/phase5-validation-evidence

# Add evidence files
git add orchestrator/scripts/validation_evidence/

# Add updated validation doc
git add PHASE5_VALIDATION.md

# Commit
git commit -m "docs: Add Phase 5 staging validation evidence

- Completed Steps 3-8 validation workflow
- Evidence collected with automatic redaction
- All acceptance criteria met
- Correlation ID: STG-20251017-040045-7a4f946c"

# Push
git push origin staging/phase5-validation-evidence
```

**7.4 Create Pull Request**

Option A: GitHub CLI
```powershell
gh pr create \
  --title "docs: Phase 5 staging validation evidence" \
  --body "## Phase 5 Staging Validation Completed

### Summary
Completed full Phase 5 staging validation workflow (Steps 3-8).

### Evidence
- Correlation ID: STG-20251017-040045-7a4f946c
- /debug-last validated: ✅ ephemeral, redacted, trace ID matches
- Alerts validated: ✅ posted once, dedupe confirmed
- Flags reverted: ✅ ENABLE_ALERTS=false, ENABLE_DEBUG_CMD=false

### Files Changed
- PHASE5_VALIDATION.md (updated with staging evidence)
- orchestrator/scripts/validation_evidence/ (evidence artifacts)

### Review Checklist
- [ ] Evidence section in PHASE5_VALIDATION.md reviewed
- [ ] Acceptance criteria all checked
- [ ] Secrets properly redacted
- [ ] Ready for production rollout planning

See PHASE5_VALIDATION.md for complete evidence and acceptance criteria."
```

Option B: GitHub UI
1. Go to https://github.com/gcolon75/Project-Valine
2. Click "Pull requests" → "New pull request"
3. Select base: main, compare: staging/phase5-validation-evidence
4. Fill in title and description
5. Create pull request

## Command Reference

### Configuration

```powershell
# Generate example config
python phase5_staging_validator.py generate-config --output CONFIG_FILE

# Example
python phase5_staging_validator.py generate-config --output staging_config.json
```

### Validation Commands

```powershell
# Preflight checks
python phase5_staging_validator.py preflight --config CONFIG_FILE

# Verify IAM permissions
python phase5_staging_validator.py verify-iam --config CONFIG_FILE

# Read current SSM values
python phase5_staging_validator.py read-ssm --config CONFIG_FILE

# Full validation (Steps 3-8)
python phase5_staging_validator.py full-validation --config CONFIG_FILE
```

### Feature Flag Management

```powershell
# Enable debug command
python phase5_staging_validator.py enable-debug --config CONFIG_FILE

# Enable alerts
python phase5_staging_validator.py enable-alerts \
  --config CONFIG_FILE \
  --channel-id CHANNEL_ID

# Disable alerts
python phase5_staging_validator.py disable-alerts --config CONFIG_FILE

# Revert all flags to safe defaults
python phase5_staging_validator.py revert-flags --config CONFIG_FILE
```

### Validation Testing

```powershell
# Validate debug command (documents manual test)
python phase5_staging_validator.py validate-debug --config CONFIG_FILE

# Validate alerts (documents manual test)
python phase5_staging_validator.py validate-alerts --config CONFIG_FILE
```

### Evidence Collection

```powershell
# Collect logs for this validation run
python phase5_staging_validator.py collect-logs --config CONFIG_FILE

# Collect logs for specific trace ID
python phase5_staging_validator.py collect-logs \
  --config CONFIG_FILE \
  --trace-id TRACE_ID
```

### Report Generation

```powershell
# Generate executive summary
python phase5_staging_validator.py generate-summary --config CONFIG_FILE

# Update PHASE5_VALIDATION.md
python phase5_staging_validator.py update-docs --config CONFIG_FILE
```

## Manual Testing Procedures

### /debug-last Command Testing

1. **Setup**
   - Ensure ENABLE_DEBUG_CMD=true
   - Wait 30-60 seconds for propagation

2. **Execute Test Command**
   - In Discord staging channel: `/diagnose repo:gcolon75/Project-Valine`
   - Wait for command to complete
   - Note the completion time

3. **Execute /debug-last**
   - Immediately after: `/debug-last`
   - Response should appear only to you (ephemeral)

4. **Verify Checklist**
   - [ ] Response is ephemeral (not visible to others)
   - [ ] Trace ID present (UUID format)
   - [ ] Command name shown
   - [ ] Step timings shown (in milliseconds)
   - [ ] Duration shown
   - [ ] GitHub run link present
   - [ ] Secrets redacted (***last4 format)
   - [ ] Output length < 1900 chars
   - [ ] Trace ID matches CloudWatch logs

5. **Capture Evidence**
   - Screenshot or copy text
   - Save to validation_evidence/
   - Note correlation_id and trace_id

### Alerts Testing

1. **Setup**
   - Ensure ENABLE_ALERTS=true
   - Ensure ALERT_CHANNEL_ID set to staging channel
   - Wait 30-60 seconds for propagation

2. **Test 1: Single Alert**
   - Trigger controlled failure (see Phase 4 above)
   - Verify alert appears in staging channel
   - Note timestamp

3. **Verify Alert Content**
   - [ ] Severity emoji present (🔴 critical, ⚠️ error, 🟡 warning)
   - [ ] Brief message/description
   - [ ] Root cause included
   - [ ] Trace ID present
   - [ ] GitHub run link present
   - [ ] CloudWatch logs link present
   - [ ] No secrets visible

4. **Test 2: Rate-Limiting (Dedupe)**
   - Trigger same failure immediately
   - Verify NO second alert posts
   - Note: suppressed due to rate-limiting

5. **Test 3: Dedupe Expiry**
   - Wait 6 minutes (dedupe window = 5 minutes)
   - Trigger same failure again
   - Verify new alert posts
   - Note: dedupe window expired

6. **Capture Evidence**
   - Copy alert text
   - Take screenshot
   - Save to validation_evidence/
   - Note all trace_ids and timestamps

## Evidence Review

### Files to Review

```powershell
cd orchestrator/scripts/validation_evidence

# Executive summary (for stakeholders)
Get-Content executive_summary_STG-*.md

# Detailed report (for technical review)
Get-Content validation_report_STG-*.md

# Evidence section (for PHASE5_VALIDATION.md)
Get-Content phase5_evidence_section_STG-*.md  # if auto-update failed

# Manual test evidence
Get-Content debug-last-transcript.txt
Get-Content alert-message.txt
ls -la alert-screenshot.png
```

### Verification Checklist

- [ ] **Executive Summary**
  - [ ] Status: PASS (no failed tests)
  - [ ] All automated tests passed
  - [ ] Manual tests documented

- [ ] **Detailed Report**
  - [ ] All evidence items present
  - [ ] Secrets properly redacted
  - [ ] Timestamps recorded
  - [ ] Correlation ID consistent

- [ ] **PHASE5_VALIDATION.md**
  - [ ] Staging evidence section added
  - [ ] Configuration documented
  - [ ] Test results summarized
  - [ ] Acceptance criteria checked
  - [ ] Operator sign-off block present

- [ ] **Manual Test Evidence**
  - [ ] /debug-last transcript captured
  - [ ] Alert messages captured
  - [ ] Screenshots taken
  - [ ] No secrets visible

## Troubleshooting

### Error: AWS CLI not found

```powershell
# Install AWS CLI
pip install awscli

# Or download from AWS
Invoke-RestMethod -Uri "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -Method Get
unzip awscliv2.zip
sudo ./aws/install

# Verify installation
aws --version
```

### Error: Permission denied (SSM)

```powershell
# Check IAM permissions
aws sts get-caller-identity

# Test SSM access
aws ssm get-parameter \
  --name /valine/staging/ENABLE_DEBUG_CMD \
  --region us-west-2

# If access denied, request permissions:
# - ssm:GetParameter on arn:aws:ssm:*:*:parameter/valine/staging/*
# - ssm:PutParameter on arn:aws:ssm:*:*:parameter/valine/staging/*
```

### Error: Permission denied (CloudWatch)

```powershell
# Test CloudWatch access
aws logs describe-log-groups \
  --log-group-name-prefix /aws/lambda/valine \
  --region us-west-2

# If access denied, request permissions:
# - logs:FilterLogEvents on log group ARN
# - logs:GetLogEvents on log group ARN
# - logs:DescribeLogGroups
```

### Error: Production channel detected

```
ERROR: Production channel pattern 'prod' detected in channel ID!
ERROR: Aborting to prevent production alerts
```

**Solution:**
- Verify `test_channel_id` in config is staging channel
- Check channel name doesn't contain "prod", "production", or "live"
- Update config with correct staging channel ID

### Error: Lambda function not found

```powershell
# Verify function exists
aws lambda list-functions \
  --region us-west-2 \
  | Select-String orchestrator

# Check function name spelling
aws lambda get-function-configuration \
  --function-name YOUR_FUNCTION_NAME \
  --region us-west-2

# Update config with correct function name
```

### Error: No logs found in CloudWatch

**Possible causes:**
1. No recent activity (run a command first)
2. Wrong log group name
3. Wrong trace_id
4. Logs not yet available (wait 1-2 minutes)

**Solutions:**
```powershell
# Verify log group exists
aws logs describe-log-groups \
  --log-group-name-prefix /aws/lambda/valine \
  --region us-west-2

# Use correlation_id instead of trace_id
python phase5_staging_validator.py collect-logs \
  --config staging_config.json
  # (automatically uses correlation_id)

# Wait and retry
sleep 120
python phase5_staging_validator.py collect-logs \
  --config staging_config.json \
  --trace-id YOUR_TRACE_ID
```

### /debug-last shows "Debug commands are disabled"

**Possible causes:**
1. ENABLE_DEBUG_CMD not set to "true"
2. Lambda configuration not yet propagated

**Solutions:**
```powershell
# Check current value
python phase5_staging_validator.py read-ssm --config staging_config.json

# Re-enable if needed
python phase5_staging_validator.py enable-debug --config staging_config.json

# Wait for propagation (up to 60 seconds)
sleep 60

# Retry in Discord
/debug-last
```

### Alerts not posting to Discord

**Possible causes:**
1. ENABLE_ALERTS not set to "true"
2. ALERT_CHANNEL_ID incorrect
3. Bot permissions insufficient
4. Lambda configuration not propagated

**Solutions:**
```powershell
# Check current values
python phase5_staging_validator.py read-ssm --config staging_config.json

# Re-enable alerts
python phase5_staging_validator.py enable-alerts \
  --config staging_config.json \
  --channel-id YOUR_STAGING_CHANNEL_ID

# Verify bot has permission to post in channel
# Check Discord bot settings

# Wait for propagation
sleep 60

# Retry triggering alert
```

### Evidence files contain secrets

**This should never happen!** If you find secrets in evidence files:

1. **Stop immediately** - Do not commit or share files
2. **Delete evidence files:**
   ```powershell
   rm -rf validation_evidence/
   ```
3. **Report the bug** with details (but not the actual secrets)
4. **Regenerate evidence** after bug is fixed
5. **Review redaction logic** in validator code

### PHASE5_VALIDATION.md update failed

```powershell
# Check if file exists
ls -la /home/runner/work/Project-Valine/Project-Valine/PHASE5_VALIDATION.md

# Manual update:
# 1. Generate evidence section
python phase5_staging_validator.py generate-summary --config staging_config.json

# 2. Copy evidence section
Get-Content validation_evidence/phase5_evidence_section_*.md

# 3. Manually add to PHASE5_VALIDATION.md
nano /home/runner/work/Project-Valine/Project-Valine/PHASE5_VALIDATION.md

# 4. Find "## Staging Validation Evidence" section
# 5. Paste new evidence
# 6. Save and commit
```

## Next Steps After Validation

### 1. Review and Approve

- Review all evidence files
- Verify acceptance criteria met
- Get stakeholder approval
- Document any findings or issues

### 2. Production Planning

- Schedule production deployment
- Plan rollout phases:
  1. Week 1: Logging only
  2. Week 2: Enable /debug-last
  3. Week 3: Enable alerts
- Prepare rollback plan

### 3. Team Training

- Share RUNBOOK.md with ops team
- Conduct training session on:
  - Using /debug-last command
  - Interpreting alerts
  - Using CloudWatch Insights queries
- Set up on-call procedures

### 4. Monitoring Setup

- Create CloudWatch dashboards
- Set up alert routing
- Configure Slack/PagerDuty integration
- Test escalation procedures

## Support and Resources

### Documentation

- **This Guide:** Complete usage instructions
- **README.md:** Feature overview and quick reference
- **QUICKSTART.md:** 5-minute setup guide
- **RUNBOOK.md:** Operational procedures
- **PHASE5_VALIDATION.md:** Validation requirements and evidence

### Commands

```powershell
# Show all available commands
python phase5_staging_validator.py --help

# Show help for specific command
python phase5_staging_validator.py full-validation --help
```

### Getting Help

1. Check troubleshooting section above
2. Review validation report for error details
3. Check CloudWatch logs for trace_id
4. Review RUNBOOK.md for operational procedures
5. Open GitHub issue with:
   - Correlation ID
   - Error message
   - Evidence files (redacted)

### Contact

- **Repository:** https://github.com/gcolon75/Project-Valine
- **Issues:** https://github.com/gcolon75/Project-Valine/issues
- **Documentation:** `/orchestrator/README.md`, `/orchestrator/RUNBOOK.md`

---

**Version:** 2.0  
**Last Updated:** 2025-10-17  
**Status:** Production Ready  
**Maintained By:** Project Valine Team
