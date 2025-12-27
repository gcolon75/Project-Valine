# Phase 5 Staging Validation Double-Check Guide

## Purpose

This guide provides step-by-step instructions for running the Phase 5 Staging Validation Double-Check as specified in the problem statement. This validation re-verifies everything set up in PR #49 and confirms the latest changes work end-to-end in staging.

## Overview

**Agent Role:** Phase 5 Staging Validation Double-Check Agent  
**Mission:** Re-verify Phase 5 setup and confirm the latest PR (#49) works end-to-end  
**Environment:** Staging only (no production access)  
**Safety:** All secrets redacted, no production channels used

## Prerequisites

### Required Access

1. **AWS Permissions:**
   - SSM: `GetParameter`, `GetParametersByPath`, `PutParameter` on `/valine/staging/*`
   - CloudWatch Logs: `FilterLogEvents`, `GetLogEvents` on `/aws/lambda/pv-api-prod-api`
   - IAM: `GetUser`, `GetRole` (for verification)

2. **GitHub Access:**
   - Repository: `gcolon75/Project-Valine`
   - Permissions: `contents:write`, `pull-requests:write`
   - Token: `STAGING_GITHUB_TOKEN` secret

3. **Discord Access:**
   - Staging bot token: `STAGING_DISCORD_BOT_TOKEN` secret
   - Staging public key: `STAGING_DISCORD_PUBLIC_KEY` var
   - Staging application ID: `STAGING_DISCORD_APPLICATION_ID` var
   - Staging alert channel: `1428102811832553554`

### Required Software

- Python 3.8+
- AWS CLI v2
- GitHub CLI (`gh`)
- Git

### Configuration

The staging configuration is pre-configured in `orchestrator/scripts/staging_config_phase5.json`:

- **Region:** us-west-2
- **SSM Path:** `/valine/staging/`
- **CloudWatch Log Group:** `/aws/lambda/pv-api-prod-api`
- **Alert Channel:** `1428102811832553554`

## Validation Workflow

### Option 1: GitHub Actions (Recommended)

The easiest way to run validation is through GitHub Actions:

1. **Navigate to Actions:**
   ```
   https://github.com/gcolon75/Project-Valine/actions/workflows/phase5-staging-validation-doublecheck.yml
   ```

2. **Click "Run workflow"**

3. **Select validation type:**
   - `full-validation` - Complete end-to-end validation (recommended)
   - Individual steps for targeted testing

4. **Monitor workflow execution:**
   - View real-time logs
   - Check each validation step
   - Review artifacts when complete

5. **Review results:**
   - Workflow will create a PR with evidence
   - Evidence artifacts available for download
   - Executive summary in workflow output

### Option 2: Local Execution

For local execution with AWS credentials:

```powershell
# Navigate to scripts directory
cd orchestrator/scripts

# Set environment variables
$env:STAGING_DISCORD_BOT_TOKEN = "your-token-here"
$env:STAGING_GITHUB_TOKEN = "your-token-here"
$env:AWS_PROFILE = "staging-profile"  # or configure default credentials"

# Run validation
./run_phase5_validation.sh
```

The script will:
1. Run preflight checks
2. Verify IAM permissions
3. Read current SSM baseline
4. Prompt for manual /debug-last testing
5. Enable and validate debug command
6. Prompt for manual alerts testing
7. Enable and validate alerts
8. Collect CloudWatch logs evidence
9. Revert flags to safe defaults
10. Update PHASE5_VALIDATION.md

## Manual Testing Procedures

Some validation steps require manual testing in Discord:

### /debug-last Command Testing

1. **Execute a staging command:**
   ```
   /diagnose
   ```

2. **Wait for completion, then run:**
   ```
   /debug-last
   ```

3. **Verify response:**
   - [ ] Response is ephemeral (only visible to you)
   - [ ] Contains trace_id
   - [ ] Shows step timings
   - [ ] Secrets are redacted (***last4)
   - [ ] Output length is within Discord limits

4. **Record evidence:**
   - Copy trace_id: `________________`
   - Screenshot (with secrets redacted)
   - Note timestamp

### Alerts Testing

1. **Trigger controlled failure:**
   - Use a test endpoint or invalid workflow dispatch
   - Record the action taken

2. **Verify alert in channel 1428102811832553554:**
   - [ ] Alert posted to correct channel
   - [ ] Contains severity emoji (🔴, ⚠️, or 🟡)
   - [ ] Includes brief message
   - [ ] Shows trace_id
   - [ ] Has links (run, logs)
   - [ ] Secrets are redacted

3. **Test dedupe:**
   - Trigger same failure again immediately
   - [ ] Second alert is suppressed (dedupe working)
   - Wait 6+ minutes
   - Trigger again
   - [ ] Third alert posts (dedupe window expired)

4. **Record evidence:**
   - Copy alert text (redacted): `________________`
   - Note alert count and timing
   - Screenshot (with secrets redacted)

## Acceptance Criteria

This validation must verify all criteria from the problem statement:

### 1. IAM/Permissions ✅
- [ ] Can Get/Put SSM under `/valine/staging/*`
- [ ] Can read logs from `/aws/lambda/pv-api-prod-api`

### 2. Flags Baseline ✅
- [ ] `ENABLE_DEBUG_CMD = true`
- [ ] `ENABLE_ALERTS = false`
- [ ] `ALERT_CHANNEL_ID = 1428102811832553554`

### 3. /debug-last Works ✅
- [ ] Response is ephemeral
- [ ] Secrets are redacted (***last4)
- [ ] Contains trace_id and timings
- [ ] Works end-to-end

### 4. Alerts Test ✅
- [ ] Single controlled failure posts exactly one alert
- [ ] Alert contains severity, cause, trace_id, links
- [ ] Dedupe prevents repeats within window
- [ ] All posted to staging channel only

### 5. Evidence Captured ✅
- [ ] Discord alert text (redacted)
- [ ] CloudWatch snippets (filtered by trace_id)
- [ ] /debug-last transcript (redacted)
- [ ] All secrets properly redacted

### 6. Flags Reverted ✅
- [ ] `ENABLE_ALERTS = false`
- [ ] `ENABLE_DEBUG_CMD = false` (optional)
- [ ] Verified via SSM GetParameter

### 7. Documentation Updated ✅
- [ ] `PHASE5_VALIDATION.md` updated with evidence
- [ ] Acceptance checklist included
- [ ] Docs PR opened

## Safety Checks

### Hard Rules

1. **Never post to production channels**
   - Only use channel ID: `1428102811832553554`
   - Script validates channel ID before enabling alerts

2. **Redact all secrets**
   - Show only last 4 chars (***abcd)
   - Applied to: tokens, webhooks, API keys, passwords

3. **Stop on failure**
   - If any permission check fails, abort
   - Revert any changed flags before exiting
   - Report exactly what's missing

4. **Shared CloudWatch group**
   - Filter by correlation_id/trace_id
   - Don't assume exclusive access
   - Scope evidence collection appropriately

## Evidence Collection

All evidence is collected with automatic redaction:

### CloudWatch Logs

```powershell
# Filter by trace_id
aws logs filter-log-events \
  --region us-west-2 \
  --log-group-name "/aws/lambda/pv-api-prod-api" \
  --filter-pattern '"<trace_id>"' \
  --limit 100
```

### Discord Alert Text

```
Example (redacted):
🔴 CRITICAL ALERT

Workflow dispatch failed

Root Cause: Workflow 'test-invalid' not found (404)
Trace ID: abc123de-456f-789g-hij0-klmnopqrstuv

[View Run](https://github.com/gcolon75/Project-Valine/actions/runs/***1234)
[CloudWatch Logs](https://console.aws.amazon.com/cloudwatch/...)
```

### /debug-last Transcript

```
Example (redacted):
🔍 Last Execution Debug Info

Command: /diagnose
Trace ID: abc123de-456f-789g
Started: 2025-10-17 04:00:00 UTC
Duration: 2850ms

Steps:
  ✅ Validate input (10ms)
  ✅ Trigger workflow (250ms)
  ✅ Poll for completion (2500ms)
  ✅ Parse results (90ms)

[View Run](https://github.com/gcolon75/Project-Valine/actions/runs/***1234)
```

## Outputs

### Validation Reports

Generated in `orchestrator/scripts/validation_evidence/`:

1. **Executive Summary** (`executive_summary_*.md`)
   - TL;DR (3-5 lines)
   - Pass/fail checklist
   - Quick notes on each criterion

2. **Detailed Report** (`validation_report_*.md`)
   - Complete validation results
   - All test outcomes
   - Evidence snippets
   - Recommendations

3. **Evidence Files**
   - CloudWatch log snippets (JSON)
   - Alert transcripts (text/markdown)
   - Debug command output (text/markdown)
   - Correlation metadata (JSON)

### Documentation PR

The workflow automatically creates a PR with:

- Branch: `staging/phase5-validation-evidence-{timestamp}`
- Title: "Phase 5 Staging Validation Evidence - Run {number}"
- Contains:
  - Updated `PHASE5_VALIDATION.md`
  - Evidence directory contents
  - Executive summary
  - Acceptance checklist

## Troubleshooting

### Common Issues

**Issue:** AWS credentials not configured
```
Error: Unable to locate credentials
Solution: Set AWS_PROFILE or configure default credentials
```

**Issue:** Permission denied on SSM
```
Error: AccessDeniedException
Solution: Verify IAM role has ssm:GetParameter, ssm:PutParameter permissions
```

**Issue:** Discord bot not responding
```
Error: 401 Unauthorized
Solution: Check STAGING_DISCORD_BOT_TOKEN is valid and not expired
```

**Issue:** Channel ID looks like production
```
Error: Production channel pattern detected
Solution: Verify using staging channel 1428102811832553554
```

### Debug Commands

```powershell
# Verify AWS access
aws sts get-caller-identity

# Test SSM access
aws ssm get-parameters-by-path \
  --region us-west-2 \
  --path /valine/staging/

# Test CloudWatch Logs access
aws logs describe-log-groups \
  --region us-west-2 \
  --log-group-name-prefix "/aws/lambda/pv-api"

# Run preflight checks only
python phase5_staging_validator.py preflight \
  --config staging_config_phase5.json
```

## Next Steps After Validation

1. **Review evidence:** Check all collected evidence for completeness
2. **Verify acceptance criteria:** Ensure all checkboxes are marked
3. **Review PR:** Examine the auto-generated docs PR
4. **Sign off:** Approve validation if all criteria met
5. **Plan rollout:** If approved, proceed with production deployment

## References

- **PR #49:** https://github.com/gcolon75/Project-Valine/pull/49
- **Validator Script:** `orchestrator/scripts/phase5_staging_validator.py`
- **Test Suite:** `orchestrator/tests/test_phase5_staging_validator.py`
- **Usage Guide:** `PHASE5_STAGING_RUNNER_USAGE_GUIDE.md`
- **Implementation Summary:** `IMPLEMENTATION_SUMMARY_PHASE5_STAGING_RUNNER.md`
