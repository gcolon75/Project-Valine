# Phase 5 Staging Validation Double-Check - Quick Start

## TL;DR

This validation confirms PR #49 works end-to-end in staging. Run via GitHub Actions or locally.

### GitHub Actions (Recommended - 5 minutes)

1. Go to: https://github.com/gcolon75/Project-Valine/actions/workflows/phase5-staging-validation-doublecheck.yml
2. Click "Run workflow"
3. Select "full-validation"
4. Click "Run workflow"
5. Review results and auto-created PR

### Local Execution (45-60 minutes)

```powershell
cd orchestrator/scripts
$env:STAGING_DISCORD_BOT_TOKEN = "your-token"
$env:STAGING_GITHUB_TOKEN = "your-token"
$env:AWS_PROFILE = "staging"
./run_phase5_validation.sh
```

## What Gets Validated

✅ IAM permissions (SSM, CloudWatch Logs)  
✅ SSM parameter baseline (`ENABLE_DEBUG_CMD=true`, `ENABLE_ALERTS=false`, `ALERT_CHANNEL_ID=1428102811832553554`)  
✅ `/debug-last` command (ephemeral + secret redaction)  
✅ Discord alerts with dedupe (controlled failure)  
✅ CloudWatch logs collection (filtered by trace_id)  
✅ Flags reverted to safe defaults  
✅ Documentation updated with evidence  

## Prerequisites

### Required Secrets (GitHub Actions)

Set these in repository settings:

- `AWS_ROLE_ARN_STAGING` - AWS IAM role ARN for OIDC authentication
- `STAGING_DISCORD_BOT_TOKEN` - Discord bot token for staging environment
- `STAGING_GITHUB_TOKEN` - GitHub token with repo access

### Required Variables (GitHub Actions)

Set these in repository settings:

- `STAGING_DISCORD_PUBLIC_KEY` - Discord bot public key
- `STAGING_DISCORD_APPLICATION_ID` - Discord application ID

### Required IAM Permissions

The AWS role must have:

```json
{
  "Effect": "Allow",
  "Action": [
    "ssm:GetParameter",
    "ssm:GetParametersByPath",
    "ssm:PutParameter"
  ],
  "Resource": "arn:aws:ssm:us-west-2:*:parameter/valine/staging/*"
}
```

```json
{
  "Effect": "Allow",
  "Action": [
    "logs:FilterLogEvents",
    "logs:GetLogEvents",
    "logs:DescribeLogGroups"
  ],
  "Resource": "arn:aws:logs:us-west-2:*:log-group:/aws/lambda/pv-api-prod-api:*"
}
```

## Configuration

Pre-configured in `orchestrator/scripts/staging_config_phase5.json`:

| Setting | Value |
|---------|-------|
| AWS Region | us-west-2 |
| SSM Path | /valine/staging/ |
| Log Group | /aws/lambda/pv-api-prod-api |
| Alert Channel | 1428102811832553554 |
| Deploy Method | ssm_parameter_store |

## Validation Steps

The validator performs these steps automatically:

1. **Preflight** - Check AWS CLI, configs, safety checks
2. **Verify IAM** - Test SSM and CloudWatch access
3. **Read SSM** - Capture current baseline flags
4. **Enable Debug** - Set `ENABLE_DEBUG_CMD=true`
5. **Validate Debug** - Test `/debug-last` (requires manual Discord testing)
6. **Enable Alerts** - Set `ENABLE_ALERTS=true`, `ALERT_CHANNEL_ID=1428102811832553554`
7. **Validate Alerts** - Test controlled failure and dedupe (requires manual Discord testing)
8. **Collect Logs** - Gather CloudWatch evidence with redaction
9. **Revert Flags** - Set `ENABLE_ALERTS=false`, `ENABLE_DEBUG_CMD=false`
10. **Update Docs** - Update `PHASE5_VALIDATION.md` with evidence

## Manual Testing Required

Some steps require manual Discord interaction:

### /debug-last Testing

```
1. In Discord staging channel: /diagnose
2. Wait for completion
3. In Discord: /debug-last
4. Verify:
   - Ephemeral (only you see it)
   - Shows trace_id
   - Secrets redacted (***last4)
   - Has timing info
```

### Alerts Testing

```
1. Trigger a controlled failure in staging
2. Check channel 1428102811832553554 for alert
3. Verify alert contains:
   - Severity emoji (🔴/⚠️/🟡)
   - Brief message
   - Trace ID
   - Links
4. Trigger same failure again immediately
5. Verify second alert is suppressed (dedupe)
```

## Outputs

### Evidence Directory

Location: `orchestrator/scripts/validation_evidence/`

Contains:
- `executive_summary_*.md` - TL;DR results
- `validation_report_*.md` - Detailed results
- `cloudwatch_logs_*.json` - Log snippets (redacted)
- `alert_transcript_*.md` - Alert messages (redacted)
- `debug_transcript_*.md` - /debug-last output (redacted)

### Automatic PR

The workflow creates a PR with:
- Branch: `staging/phase5-validation-evidence-{timestamp}`
- Updated `PHASE5_VALIDATION.md`
- Evidence directory contents
- Executive summary
- Acceptance checklist

## Safety Features

🛡️ Production channel detection - Aborts if production patterns detected  
🔒 Automatic secret redaction - Shows only last 4 chars (***abcd)  
⚠️ Permission verification - Tests IAM before making changes  
♻️ Safe flag reversion - Always reverts to safe defaults  
📊 Audit trail - Correlation ID tracking for all operations  

## Troubleshooting

### AWS Credentials

```powershell
# Verify AWS access
aws sts get-caller-identity

# Test SSM access
aws ssm get-parameters-by-path --region us-west-2 --path /valine/staging/

# Test CloudWatch access
aws logs describe-log-groups --region us-west-2 \
  --log-group-name-prefix "/aws/lambda/pv-api"
```

### Discord Bot

```powershell
# Verify bot token (redacted)
echo "Token: ***$(echo $STAGING_DISCORD_BOT_TOKEN | tail -c 5)"

# Test Discord API access (requires valid token)
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Get -Headers @{
    "Authorization" = "Bot $STAGING_DISCORD_BOT_TOKEN"
}```

### Common Errors

| Error | Solution |
|-------|----------|
| `AccessDeniedException` | Check IAM permissions for SSM/CloudWatch |
| `Unable to locate credentials` | Set AWS_PROFILE or configure credentials |
| `Production channel detected` | Verify using staging channel 1428102811832553554 |
| `401 Unauthorized` | Check STAGING_DISCORD_BOT_TOKEN is valid |

## Support

- **Documentation:** `PHASE5_STAGING_DOUBLECHECK_GUIDE.md`
- **Usage Guide:** `PHASE5_STAGING_RUNNER_USAGE_GUIDE.md`
- **Implementation:** `IMPLEMENTATION_SUMMARY_PHASE5_STAGING_RUNNER.md`
- **Validator Script:** `orchestrator/scripts/phase5_staging_validator.py`
- **Tests:** `orchestrator/tests/test_phase5_staging_validator.py`

## Expected Results

After successful validation:

```
✅ IAM permissions verified
✅ Baseline flags match specification
✅ /debug-last works (ephemeral + redacted)
✅ Alerts work with dedupe
✅ Evidence collected with redaction
✅ Flags reverted to safe defaults
✅ Documentation updated
```

Results in:
- `PHASE5_VALIDATION.md` updated with evidence section
- Evidence artifacts saved and uploaded
- Auto-generated PR with validation results
- Executive summary for stakeholders

## Next Steps

1. ✅ Review this README
2. ▶️ Run validation (GitHub Actions or local)
3. 📋 Review evidence and acceptance checklist
4. ✍️ Complete operator sign-off
5. 🔀 Merge documentation PR
6. 🚀 Plan production rollout
