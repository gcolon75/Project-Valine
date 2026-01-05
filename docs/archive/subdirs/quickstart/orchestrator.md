# Phase 5 Staging Validator - Quick Start Guide

This guide helps you quickly get started with Phase 5 staging validation.

## What's New

**Latest enhancements:**
- ✅ Multiple deployment methods (Lambda, SSM Parameter Store, SAM deploy)
- ✅ Automatic secret redaction in all evidence
- ✅ Executive summary generation
- ✅ Enhanced safety checks
- ✅ 33 unit tests (all passing)

## Prerequisites

- AWS CLI installed and configured
- Python 3.8+ installed
- AWS permissions for Lambda configuration updates
- Access to staging Discord channel
- Lambda functions deployed in staging environment

## 5-Minute Quick Start

### Step 1: Generate Configuration (1 minute)

```powershell
cd orchestrator/scripts
python phase5_staging_validator.py generate-config --output staging_config.json
```

Edit `staging_config.json` with your staging values:
- `staging_deploy_method`: Choose deployment method
  - `aws_parameter_store`: Lambda environment variables (default, fastest)
  - `ssm_parameter_store`: SSM Parameter Store (centralized config)
  - `sam_deploy`: SAM config file (infrastructure-as-code)
- `staging_lambda_discord`: Your staging Lambda function name (e.g., `valine-orchestrator-discord-staging`)
- `test_channel_id`: Your staging Discord channel ID
- `log_group_discord`: CloudWatch log group name (e.g., `/aws/lambda/valine-orchestrator-discord-staging`)

**Security Note:** All sensitive data in evidence will be automatically redacted.

### Step 2: Run Preflight Checks (1 minute)

```powershell
python phase5_staging_validator.py preflight --config staging_config.json
```

This verifies:
- ✅ AWS CLI is available
- ✅ Configuration is complete
- ✅ Test channel is not production

### Step 3: Enable Debug Command (1 minute)

```powershell
python phase5_staging_validator.py enable-debug --config staging_config.json
```

Wait 30 seconds for Lambda to update, then test in Discord:
```
/diagnose
/debug-last
```

Verify the output shows:
- ✅ Response is ephemeral (only you can see it)
- ✅ Trace ID present
- ✅ Steps and timings displayed
- ✅ Secrets redacted (only last 4 chars visible)

### Step 4: Enable and Test Alerts (2 minutes)

```powershell
# Enable alerts
python phase5_staging_validator.py enable-alerts \
  --config staging_config.json \
  --channel-id YOUR_STAGING_CHANNEL_ID

# Wait 30 seconds
sleep 30
```

Manually trigger a test alert (e.g., by causing a controlled failure).

Verify:
- ✅ Alert posted to staging channel
- ✅ Alert has severity emoji (🔴, ⚠️, or 🟡)
- ✅ Alert includes trace ID and links
- ✅ Triggering same alert again is rate-limited (no duplicate)

### Step 5: Review Evidence (30 seconds)

```powershell
# View the validation report (with automatic redaction)
Get-Content validation_evidence/validation_report_*.md

# View the executive summary
Get-Content validation_evidence/executive_summary_*.md
```

**All sensitive information is automatically redacted:**
- Tokens show only last 4 characters
- Channel IDs are redacted
- Trace IDs preserved for debugging

## Full Validation (Automated)

To run all steps automatically:

```powershell
python phase5_staging_validator.py full-validation --config staging_config.json
```

This runs:
1. Preflight checks
2. Enable debug command
3. Document debug validation steps
4. Disable alerts (safety)
5. Enable alerts
6. Document alert validation steps
7. Collect CloudWatch logs
8. Generate validation report

**Note:** Manual testing is still required for steps 3 and 6.

## Using GitHub Actions (No Local Setup Required)

### Option 1: Via GitHub UI

1. Go to: https://github.com/gcolon75/Project-Valine/actions/workflows/phase5-staging-validation.yml
2. Click "Run workflow"
3. Select validation type:
   - `preflight` - Run preflight checks only
   - `enable-debug` - Enable debug command
   - `enable-alerts` - Enable alerts
   - `disable-alerts` - Disable alerts (safety)
   - `full-validation` - Run complete validation
4. Click "Run workflow"

### Option 2: Via GitHub CLI

```powershell
# Run preflight checks
gh workflow run phase5-staging-validation.yml \
  -f validation_type=preflight

# Enable debug command
gh workflow run phase5-staging-validation.yml \
  -f validation_type=enable-debug

# Enable alerts
gh workflow run phase5-staging-validation.yml \
  -f validation_type=enable-alerts \
  -f alert_channel_id=YOUR_STAGING_CHANNEL_ID

# Full validation
gh workflow run phase5-staging-validation.yml \
  -f validation_type=full-validation
```

## Common Commands

### Check Current Lambda Configuration

```powershell
aws lambda get-function-configuration \
  --function-name valine-orchestrator-discord-staging \
  --region us-west-2 \
  --query 'Environment.Variables' \
  --output json
```

### Collect Logs for Specific Trace ID

```powershell
python phase5_staging_validator.py collect-logs \
  --config staging_config.json \
  --trace-id abc123de-456f-789g
```

### Disable Features After Testing

```powershell
# Disable alerts
python phase5_staging_validator.py disable-alerts \
  --config staging_config.json
```

## Validation Checklist

Use this checklist to track your validation:

### Debug Command Validation
- [ ] Debug command enabled (`ENABLE_DEBUG_CMD=true`)
- [ ] Lambda configuration updated successfully
- [ ] Waited 30 seconds for propagation
- [ ] Executed `/diagnose` in Discord
- [ ] Executed `/debug-last` in Discord
- [ ] Response was ephemeral (only visible to me)
- [ ] Trace ID present in output
- [ ] Steps and timings displayed
- [ ] Secrets redacted (last 4 chars only)
- [ ] Output under 1900 chars
- [ ] CloudWatch logs contain trace ID
- [ ] Evidence captured and saved

### Alerts Validation
- [ ] Alerts enabled (`ENABLE_ALERTS=true`)
- [ ] Alert channel configured (`ALERT_CHANNEL_ID` set)
- [ ] Lambda configuration updated successfully
- [ ] Waited 30 seconds for propagation
- [ ] Triggered controlled failure
- [ ] Alert posted to staging channel
- [ ] Severity emoji present (🔴, ⚠️, or 🟡)
- [ ] Root cause message clear
- [ ] Trace ID included
- [ ] Run link included
- [ ] No secrets visible in alert
- [ ] Triggered same failure again
- [ ] Second alert rate-limited (no duplicate)
- [ ] Waited 6 minutes
- [ ] Third alert posted (dedupe expired)
- [ ] Evidence captured and saved

### CloudWatch Logs Validation
- [ ] Logs collected for test trace IDs
- [ ] Logs in structured JSON format
- [ ] Trace ID propagation verified
- [ ] Secrets redacted in logs
- [ ] Log retention policy verified
- [ ] CloudWatch Insights queries work

## Troubleshooting

### "AWS CLI not found"

```powershell
# Install AWS CLI
pip install awscli

# Configure credentials
aws configure
```

### "Lambda not found"

Verify the Lambda function name:
```powershell
aws lambda list-functions --region us-west-2 | Select-String valine-orchestrator
```

Update `staging_lambda_discord` in your config file.

### "Permission denied updating Lambda"

Check your AWS permissions:
```powershell
aws lambda get-function-configuration \
  --function-name valine-orchestrator-discord-staging \
  --region us-west-2
```

You need `lambda:UpdateFunctionConfiguration` permission.

### "Production channel detected"

The validator detected "prod" or "production" in your channel ID. This is a safety feature to prevent accidental production deployments.

Use a staging/test channel ID instead.

### "Debug command not responding in Discord"

1. Check Lambda logs:
   ```powershell
   aws logs tail /aws/lambda/valine-orchestrator-discord-staging --follow
   ```

2. Verify Lambda environment variables:
   ```powershell
   aws lambda get-function-configuration \
     --function-name valine-orchestrator-discord-staging \
     --region us-west-2
   ```

3. Check if `ENABLE_DEBUG_CMD=true` is set

4. Wait longer (can take up to 60 seconds for Lambda to update)

### "Alerts not posting to Discord"

1. Verify `ENABLE_ALERTS=true`:
   ```powershell
   aws lambda get-function-configuration \
     --function-name valine-orchestrator-discord-staging \
     --region us-west-2 \
     --query 'Environment.Variables.ENABLE_ALERTS'
   ```

2. Verify `ALERT_CHANNEL_ID` is set:
   ```powershell
   aws lambda get-function-configuration \
     --function-name valine-orchestrator-discord-staging \
     --region us-west-2 \
     --query 'Environment.Variables.ALERT_CHANNEL_ID'
   ```

3. Check Lambda logs for alert attempts:
   ```powershell
   aws logs filter-log-events \
     --log-group-name /aws/lambda/valine-orchestrator-discord-staging \
     --filter-pattern "alert" \
     --max-items 10
   ```

## Next Steps

After successful validation:

1. **Document Results**
   - Update `PHASE5_VALIDATION.md` with your findings
   - Include evidence files and screenshots
   - Document any issues encountered

2. **Create Executive Summary**
   - Summarize validation results
   - List any blockers or concerns
   - Recommend production rollout timeline

3. **Production Rollout Planning**
   - Review docs/guides/operations/RUNBOOK.md operational procedures
   - Plan phased rollout (logging → debug → alerts)
   - Set up production monitoring
   - Schedule training for operations team

4. **Clean Up**
   - Disable features if no longer needed for testing:
     ```powershell
     python phase5_staging_validator.py disable-alerts --config staging_config.json
     ```

## Support

- **Documentation**: See [README.md](README.md) for complete documentation
- **Runbook**: See [RUNBOOK.md](../docs/guides/operations/RUNBOOK.md) for operational procedures
- **Issues**: https://github.com/gcolon75/Project-Valine/issues
- **Phase 5 Validation**: See [PHASE5_VALIDATION.md](../../PHASE5_VALIDATION.md)
