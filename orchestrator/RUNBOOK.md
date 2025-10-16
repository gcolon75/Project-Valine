# Orchestrator Operations Runbook

This runbook provides operational guidance for monitoring, troubleshooting, and managing the Project Valine orchestrator.

## Table of Contents

1. [Overview](#overview)
2. [Monitoring](#monitoring)
3. [Common Issues](#common-issues)
4. [Debugging](#debugging)
5. [Escalation](#escalation)
6. [Maintenance](#maintenance)

## Overview

The orchestrator is a serverless application running on AWS Lambda that:
- Handles Discord slash commands
- Triggers and monitors GitHub Actions workflows
- Performs deployment verification
- Provides diagnostic capabilities

**Key Components:**
- Discord Handler Lambda (`valine-orchestrator-discord-{stage}`)
- GitHub Webhook Lambda (`valine-orchestrator-github-{stage}`)
- DynamoDB table for run state (`valine-orchestrator-runs-{stage}`)
- CloudWatch Logs for observability

## Monitoring

### Health Checks

**Discord Bot Health:**
```bash
# Check if bot is responding to commands
# In Discord, try: /status
```

**Lambda Function Health:**
```bash
# Check recent invocations
aws lambda get-function --function-name valine-orchestrator-discord-dev

# Check error rates
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=valine-orchestrator-discord-dev \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

### Key Metrics

**Lambda Invocations:**
- Normal: 10-100 invocations per hour
- Alert threshold: >500 invocations per hour (possible abuse)

**Lambda Errors:**
- Normal: <1% error rate
- Alert threshold: >5% error rate

**Lambda Duration:**
- Normal: 1-10 seconds
- Alert threshold: >30 seconds (approaching timeout)

### Logs

**View Recent Logs:**
```bash
aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow
```

**Search Logs by Trace ID:**
```bash
aws logs filter-log-events \
  --log-group-name /aws/lambda/valine-orchestrator-discord-dev \
  --filter-pattern '{ $.trace_id = "trace-id-here" }'
```

**CloudWatch Logs Insights Queries:**

Find all errors:
```
fields @timestamp, level, message, trace_id, user_id, command
| filter level = "ERROR"
| sort @timestamp desc
| limit 100
```

Track command execution:
```
fields @timestamp, command, user_id, duration_ms
| filter command != ""
| stats count() as executions, avg(duration_ms) as avg_duration by command
```

## Common Issues

### Issue: Discord Commands Not Responding

**Symptoms:**
- User reports that `/status` or other commands don't work
- Discord shows "Application did not respond"

**Diagnosis:**
1. Check Lambda function status:
   ```bash
   aws lambda get-function --function-name valine-orchestrator-discord-dev
   ```
2. Check recent invocations and errors in CloudWatch
3. Verify Discord bot token is valid

**Resolution:**
- If Lambda is timing out, increase timeout or optimize code
- If signature verification fails, verify `DISCORD_PUBLIC_KEY` is correct
- If rate limited, wait and retry

**Prevention:**
- Set up CloudWatch alarms for Lambda errors
- Monitor Lambda duration metrics

### Issue: Workflow Dispatch Fails

**Symptoms:**
- User runs `/diagnose` but workflow doesn't trigger
- Error message about dispatch failure

**Diagnosis:**
1. Check GitHub token permissions:
   - Token needs `repo` and `workflow` scopes
2. Check API rate limits:
   ```bash
   curl -H "Authorization: token ${GITHUB_TOKEN}" \
     https://api.github.com/rate_limit
   ```
3. Look for dispatch errors in logs:
   ```
   fields @timestamp, message, error.type
   | filter message like /dispatch/
   | sort @timestamp desc
   ```

**Resolution:**
- If rate limited (403), wait for rate limit reset
- If unauthorized (401), verify token and regenerate if needed
- If workflow not found, verify workflow file exists in `.github/workflows/`

**Prevention:**
- Implement exponential backoff for retries
- Monitor GitHub API rate limit usage

### Issue: Verification Always Fails

**Symptoms:**
- `/verify-latest` always reports failure
- Frontend or API checks consistently fail

**Diagnosis:**
1. Check if frontend is actually accessible:
   ```bash
   curl -I https://your-frontend-url.com
   ```
2. Check API health:
   ```bash
   curl https://your-api-url.com/health
   ```
3. Review verification logs:
   ```bash
   aws logs filter-log-events \
     --log-group-name /aws/lambda/valine-orchestrator-discord-dev \
     --filter-pattern "verification"
   ```

**Resolution:**
- If URLs are wrong, update with `/set-frontend` or `/set-api-base` (admin only)
- If endpoints are down, investigate deployment issues
- If checks are too strict, adjust verification logic

**Prevention:**
- Ensure deployment process is stable
- Add smoke tests to deployment pipeline

### Issue: High Lambda Costs

**Symptoms:**
- Unexpectedly high AWS bill for Lambda
- Excessive invocations

**Diagnosis:**
1. Check invocation count:
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/Lambda \
     --metric-name Invocations \
     --dimensions Name=FunctionName,Value=valine-orchestrator-discord-dev \
     --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 86400 \
     --statistics Sum
   ```
2. Check for abuse patterns in logs
3. Look for infinite loops or retry storms

**Resolution:**
- Implement rate limiting per user
- Add DynamoDB or Redis-based request tracking
- Block abusive users if necessary

**Prevention:**
- Set up billing alarms
- Monitor invocation patterns

## Debugging

### Using /debug-last Command

The `/debug-last` command retrieves the most recent execution trace for a user:

```
/debug-last
```

**What It Shows:**
- Trace ID for correlation
- Command that was executed
- Timestamp and duration
- Step-by-step execution flow
- Any errors that occurred
- Links to related workflow runs

**When to Use:**
- User reports command failure
- Investigating slow command execution
- Debugging intermittent issues

### Manual Trace Lookup

If `/debug-last` isn't available, find traces in CloudWatch:

```
fields @timestamp, trace_id, command, user_id, message
| filter user_id = "USER_ID_HERE"
| sort @timestamp desc
| limit 10
```

### Reproducing Issues

1. **Get trace ID** from user or logs
2. **Review execution flow** using CloudWatch Logs Insights
3. **Check for errors** in that trace
4. **Reproduce locally** if possible:
   ```bash
   cd orchestrator
   export DRY_RUN=true
   python -m pytest tests/ -v
   ```

### X-Ray Traces

View distributed traces in AWS X-Ray Console:
1. Go to AWS X-Ray Console
2. Navigate to "Traces"
3. Filter by time range and function name
4. Look for slow or failed traces

## Escalation

### When to Escalate

- **Critical**: Production bot completely down (escalate immediately)
- **High**: Significant feature broken, affects all users (escalate within 1 hour)
- **Medium**: Minor feature broken, affects some users (escalate within 4 hours)
- **Low**: Non-blocking issues, improvements (escalate within 1 day)

### Escalation Path

1. **Level 1**: Check this runbook and attempt resolution
2. **Level 2**: Review GitHub Issues for similar problems
3. **Level 3**: Contact repository maintainers via GitHub Issues
4. **Level 4**: Emergency contact (if available)

### Information to Gather

When escalating, provide:
- **Trace ID** (from `/debug-last` or logs)
- **Timestamp** of issue
- **User ID** experiencing the issue
- **Command** that failed
- **Error messages** from logs
- **Steps to reproduce**

### Emergency Contacts

- **Repository**: https://github.com/gcolon75/Project-Valine
- **Issues**: https://github.com/gcolon75/Project-Valine/issues
- **Maintainer**: @gcolon75

## Maintenance

### Regular Tasks

**Daily:**
- Review CloudWatch alarms
- Check error rate in Lambda metrics
- Monitor bot-smoke CI results

**Weekly:**
- Review CloudWatch Logs for patterns
- Check GitHub API rate limit usage
- Verify DynamoDB table size is reasonable

**Monthly:**
- Review AWS costs
- Update dependencies if needed
- Check for deprecated API usage

### Deployment Process

1. **Test in Dev:**
   ```bash
   cd orchestrator
   sam build
   sam deploy --config-env dev
   ```

2. **Verify in Dev:**
   - Test commands in dev Discord channel
   - Check logs for errors
   - Run `/debug-last` to verify tracing

3. **Deploy to Prod:**
   ```bash
   sam deploy --config-env prod
   ```

4. **Monitor Prod:**
   - Watch logs for 30 minutes post-deployment
   - Test critical commands
   - Set up alerts if not already configured

### Rollback Procedure

If deployment causes issues:

1. **Immediate rollback:**
   ```bash
   # Redeploy previous version
   git checkout <previous-commit>
   sam build
   sam deploy --config-env prod
   ```

2. **Verify rollback:**
   - Test commands
   - Check error rates return to normal
   - Review logs

3. **Post-mortem:**
   - Document what went wrong
   - Create GitHub Issue
   - Add tests to prevent recurrence

### Updating Secrets

If secrets need rotation:

1. **Update in AWS Parameter Store** (recommended) or **samconfig.toml** (not recommended)
2. **Redeploy Lambda functions:**
   ```bash
   sam deploy --config-env prod --parameter-overrides \
     "DiscordBotToken=NEW_TOKEN" \
     "GitHubToken=NEW_TOKEN"
   ```
3. **Verify new secrets work**
4. **Invalidate old secrets**

### DynamoDB Maintenance

**Check table size:**
```bash
aws dynamodb describe-table --table-name valine-orchestrator-runs-prod
```

**Clear old entries** (if needed):
```python
# Use with caution in production
import boto3
from datetime import datetime, timedelta

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('valine-orchestrator-runs-prod')

# Delete items older than 30 days
cutoff = int((datetime.now() - timedelta(days=30)).timestamp())
# Scan and delete logic here
```

## Additional Resources

- **README**: [orchestrator/README.md](README.md)
- **Testing Guide**: [orchestrator/TESTING_GUIDE.md](TESTING_GUIDE.md)
- **CloudWatch Console**: https://console.aws.amazon.com/cloudwatch/
- **X-Ray Console**: https://console.aws.amazon.com/xray/
- **GitHub Actions**: https://github.com/gcolon75/Project-Valine/actions
