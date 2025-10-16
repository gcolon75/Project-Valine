# Orchestrator Operations Runbook

This runbook provides guidance for handling failures, finding logs, diagnosing issues, and escalating problems.

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Finding Logs](#finding-logs)
3. [Common Failures](#common-failures)
4. [Diagnostic Commands](#diagnostic-commands)
5. [Escalation Procedures](#escalation-procedures)
6. [Feature Flags](#feature-flags)
7. [Allowlists and Security](#allowlists-and-security)

## Quick Reference

### Key Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_ALERTS` | `false` | Enable Discord alerts for critical failures |
| `ENABLE_DEBUG_CMD` | `false` | Enable /debug-last command |
| `ALERT_CHANNEL_ID` | None | Discord channel ID for alerts |
| `ADMIN_USER_IDS` | None | Comma-separated Discord user IDs with admin access |
| `ADMIN_ROLE_IDS` | None | Comma-separated Discord role IDs with admin access |
| `ALLOW_SECRET_WRITES` | `false` | Allow updating repository secrets/variables |

### Quick Commands

```bash
# View Discord handler logs
aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow

# View GitHub handler logs
aws logs tail /aws/lambda/valine-orchestrator-github-dev --follow

# Query DynamoDB for runs
aws dynamodb scan --table-name valine-orchestrator-runs-dev

# Check recent workflow runs
gh run list --repo gcolon75/Project-Valine --limit 10
```

## Finding Logs

### CloudWatch Logs

All Lambda functions log to CloudWatch. Logs include structured JSON with trace IDs for correlation.

#### View Logs in Real-Time

```bash
# Discord handler
aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow --format short

# GitHub webhook handler
aws logs tail /aws/lambda/valine-orchestrator-github-dev --follow --format short
```

#### Query Logs by Trace ID

```bash
# Using CloudWatch Insights
aws logs start-query \
  --log-group-name /aws/lambda/valine-orchestrator-discord-dev \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, msg, trace_id | filter trace_id = "YOUR_TRACE_ID" | sort @timestamp desc'
```

#### Search for Errors

```bash
# Find all errors in last hour
aws logs filter-log-events \
  --log-group-name /aws/lambda/valine-orchestrator-discord-dev \
  --start-time $(date -d '1 hour ago' +%s000) \
  --filter-pattern '"level":"error"'
```

### Structured Log Format

All logs follow this JSON structure:

```json
{
  "ts": "2025-10-16T18:00:00.000Z",
  "level": "info",
  "service": "orchestrator",
  "fn": "handle_diagnose_command",
  "trace_id": "abc123de-456f-789g-hij0-klmnopqrstuv",
  "correlation_id": "workflow-run-123",
  "user_id": "discord-user-123",
  "cmd": "/diagnose",
  "msg": "Triggered diagnose workflow"
}
```

### Log Retention

- CloudWatch logs are retained for 30 days by default
- Configure longer retention in CloudWatch Logs console if needed
- Consider exporting to S3 for long-term storage

## Common Failures

### 1. Discord Command Timeout

**Symptom:** Command doesn't respond or times out

**Possible Causes:**
- Lambda function timeout (default: 30s)
- GitHub API rate limiting
- Network issues

**Diagnosis:**
1. Check CloudWatch logs for the specific command
2. Look for trace_id in the Discord interaction
3. Search logs by trace_id to see where it failed

**Resolution:**
```bash
# Check for rate limiting
aws logs filter-log-events \
  --log-group-name /aws/lambda/valine-orchestrator-discord-dev \
  --filter-pattern '"429"' \
  --start-time $(date -d '1 hour ago' +%s000)

# Check for timeouts
aws logs filter-log-events \
  --log-group-name /aws/lambda/valine-orchestrator-discord-dev \
  --filter-pattern 'Task timed out'
```

**Fix:**
- Increase Lambda timeout in `template.yaml`
- Implement caching for GitHub API calls
- Use deferred responses for long-running operations

### 2. GitHub Actions Workflow Not Triggering

**Symptom:** `/diagnose` or `/deploy-client` doesn't start workflow

**Possible Causes:**
- Insufficient GitHub token permissions
- Workflow file syntax error
- Repository settings blocking workflow_dispatch

**Diagnosis:**
1. Check logs for `trigger_workflow_dispatch` errors
2. Verify GitHub token has `workflow` scope
3. Check workflow file exists and is valid

**Resolution:**
```bash
# Test workflow dispatch manually
gh workflow run "Diagnose on Demand" \
  --repo gcolon75/Project-Valine \
  --ref main

# Check workflow file
gh api repos/gcolon75/Project-Valine/actions/workflows \
  | jq '.workflows[] | {name, path, state}'
```

**Fix:**
- Regenerate GitHub token with `workflow` scope
- Validate workflow YAML syntax
- Check repository workflow permissions

### 3. Alert Not Sent

**Symptom:** Critical failure but no Discord alert

**Possible Causes:**
- `ENABLE_ALERTS` is false (default)
- `ALERT_CHANNEL_ID` not configured
- Discord API error

**Diagnosis:**
1. Check if alerts are enabled: `echo $ENABLE_ALERTS`
2. Verify channel ID: `echo $ALERT_CHANNEL_ID`
3. Check logs for "Alert skipped" or "Alert rate-limited"

**Resolution:**
```bash
# Enable alerts
aws lambda update-function-configuration \
  --function-name valine-orchestrator-discord-dev \
  --environment "Variables={ENABLE_ALERTS=true,ALERT_CHANNEL_ID=123456789}"

# Test alert manually
# (via Discord: /debug-last to see if trace exists)
```

### 4. Trace Not Available for /debug-last

**Symptom:** `/debug-last` says "No recent trace found"

**Possible Causes:**
- `ENABLE_DEBUG_CMD` is false (default)
- Lambda container was recycled (in-memory store cleared)
- No commands executed yet

**Diagnosis:**
1. Check if debug command is enabled
2. Verify user has executed commands recently
3. Check Lambda cold start logs

**Resolution:**
- Enable debug command: `ENABLE_DEBUG_CMD=true`
- Execute a command first (e.g., `/status`)
- Consider persisting traces to DynamoDB for durability

### 5. Secrets Exposed in Logs

**Symptom:** Sensitive data visible in CloudWatch logs

**Possible Causes:**
- Logging unredacted data structures
- Error messages containing secrets
- Debug logging enabled in production

**Diagnosis:**
1. Search logs for patterns: `token`, `password`, `secret`, `key`
2. Check code for direct `print()` statements
3. Review error handling paths

**Resolution:**
```bash
# Immediately rotate exposed secrets
gh secret set GITHUB_TOKEN --repo gcolon75/Project-Valine
aws lambda update-function-configuration \
  --function-name valine-orchestrator-discord-dev \
  --environment "Variables={...}"

# Fix code to use redact_secrets()
# Review PR #XX for redaction implementation
```

**Prevention:**
- Always use `redact_secrets()` before logging
- Use structured logger with context
- Never log raw API responses
- Review CI security check in bot-smoke.yml

## Diagnostic Commands

### Discord Commands

#### /debug-last
Shows last command execution trace with timings and errors.

**Usage:**
```
/debug-last
```

**Requires:** `ENABLE_DEBUG_CMD=true`

**Output:**
- Command executed
- Trace ID
- Step timings
- Last error (if any)
- Relevant links

#### /status
Shows recent workflow runs with outcomes.

**Usage:**
```
/status
/status count:3
```

#### /diagnose
Triggers comprehensive infrastructure diagnostics.

**Usage:**
```
/diagnose
/diagnose frontend_url:https://example.com
```

### AWS CLI Diagnostics

#### Check Lambda Function Status

```bash
# Get function configuration
aws lambda get-function-configuration \
  --function-name valine-orchestrator-discord-dev

# Check recent invocations
aws lambda get-function \
  --function-name valine-orchestrator-discord-dev \
  | jq '.Configuration.LastModified'
```

#### Query DynamoDB State

```bash
# Get all runs
aws dynamodb scan \
  --table-name valine-orchestrator-runs-dev \
  --output json | jq '.Items'

# Get specific run
aws dynamodb get-item \
  --table-name valine-orchestrator-runs-dev \
  --key '{"run_id": {"S": "YOUR_RUN_ID"}}' \
  | jq '.Item'
```

#### Check API Gateway

```bash
# Get API details
aws apigateway get-rest-apis \
  --query "items[?name=='valine-orchestrator-api-dev']" \
  --output json

# Check recent requests
aws logs tail /aws/apigateway/valine-orchestrator-api-dev \
  --since 1h
```

### GitHub CLI Diagnostics

#### Check Workflow Runs

```bash
# List recent runs
gh run list --repo gcolon75/Project-Valine --limit 20

# View specific run
gh run view RUN_ID --repo gcolon75/Project-Valine --log

# Watch run in real-time
gh run watch RUN_ID --repo gcolon75/Project-Valine
```

#### Check Repository Configuration

```bash
# List secrets (names only)
gh secret list --repo gcolon75/Project-Valine

# List variables
gh variable list --repo gcolon75/Project-Valine

# Check webhook deliveries
gh api repos/gcolon75/Project-Valine/hooks \
  | jq '.[] | {id, config: .config.url, active}'
```

## Escalation Procedures

### Level 1: Self-Service (0-30 minutes)

1. Check CloudWatch logs for errors
2. Use `/debug-last` to see recent execution
3. Try `/diagnose` to verify infrastructure
4. Review recent GitHub Actions runs
5. Check this runbook for matching symptoms

### Level 2: Team Investigation (30-120 minutes)

1. Create issue in GitHub with:
   - Trace ID or correlation ID
   - CloudWatch log excerpts (redacted)
   - Steps to reproduce
   - Expected vs actual behavior
2. Notify team in Discord #orchestrator-alerts
3. Assign to on-call engineer
4. Review recent deployments for changes

### Level 3: Incident Response (2+ hours)

1. Declare incident in #incidents channel
2. Create incident doc with timeline
3. Assign incident commander
4. Rollback recent changes if needed
5. Enable debug mode: `ENABLE_DEBUG_CMD=true`
6. Increase logging verbosity
7. Consider temporary workarounds

### Post-Incident

1. Write postmortem document
2. Update runbook with lessons learned
3. Add monitoring/alerting for issue
4. Create follow-up tasks for fixes
5. Share learnings with team

## Feature Flags

### ENABLE_ALERTS

**Default:** `false` (safe in production)

**Purpose:** Enable Discord alerts for critical failures

**When to Enable:**
- In production after configuring `ALERT_CHANNEL_ID`
- During staged rollout to staging channel first
- After validating alert format and rate-limiting

**Configuration:**
```bash
aws lambda update-function-configuration \
  --function-name valine-orchestrator-discord-dev \
  --environment "Variables={ENABLE_ALERTS=true,ALERT_CHANNEL_ID=YOUR_CHANNEL_ID,...}"
```

### ENABLE_DEBUG_CMD

**Default:** `false` (safe in production)

**Purpose:** Enable `/debug-last` command for troubleshooting

**When to Enable:**
- During development and testing
- Temporarily during incident investigation
- For authorized users only (consider allowlist)

**Security Considerations:**
- Traces may contain sensitive information
- Use ephemeral messages (visible only to user)
- Ensure redaction is working properly
- Limit to admin users if possible

### ALLOW_SECRET_WRITES

**Default:** `false` (safe in production)

**Purpose:** Enable `/set-frontend` and `/set-api-base` commands

**When to Enable:**
- Only for authorized administrators
- During deployment configuration
- Never enable without admin allowlists

**Required with:**
- `ADMIN_USER_IDS` or `ADMIN_ROLE_IDS` configured
- Two-step confirmation required

## Allowlists and Security

### Admin User Allowlist

Configure Discord user IDs who can perform admin actions:

```bash
export ADMIN_USER_IDS="123456789012345,234567890123456"
```

Get your Discord user ID:
1. Enable Developer Mode in Discord
2. Right-click your username
3. Copy ID

### Admin Role Allowlist

Configure Discord role IDs for admin access:

```bash
export ADMIN_ROLE_IDS="987654321098765"
```

Get role ID:
1. Server Settings > Roles
2. Right-click role name > Copy ID

### Command Allowlist

For sensitive commands, consider implementing per-command allowlists:

```python
# In discord_handler.py
COMMAND_ALLOWLISTS = {
    'debug-last': os.environ.get('DEBUG_CMD_ALLOWED_USERS', '').split(','),
    'set-api-base': os.environ.get('ADMIN_USER_IDS', '').split(',')
}
```

### URL Validator Configuration

Configure domain allowlist for URL parameters:

```bash
export ALLOWED_DOMAINS="*.example.com,api.example.com"
export SAFE_LOCAL="false"  # Disallow localhost/private IPs
```

## Dashboard and Queries

### CloudWatch Dashboard

Create a dashboard with these metrics:

1. **Lambda Invocations**
   - Metric: `AWS/Lambda/Invocations`
   - Functions: discord-handler, github-handler

2. **Lambda Errors**
   - Metric: `AWS/Lambda/Errors`
   - Alarm threshold: > 5 in 5 minutes

3. **Lambda Duration**
   - Metric: `AWS/Lambda/Duration`
   - P50, P90, P99 percentiles

4. **DynamoDB Operations**
   - Metrics: `AWS/DynamoDB/ConsumedReadCapacityUnits`, `ConsumedWriteCapacityUnits`

### CloudWatch Insights Queries

#### Error Summary
```sql
fields @timestamp, level, msg, trace_id, error
| filter level = "error"
| sort @timestamp desc
| limit 50
```

#### Command Usage
```sql
fields @timestamp, cmd, user_id
| filter cmd != ""
| stats count() by cmd
| sort count desc
```

#### Slow Operations
```sql
fields @timestamp, fn, duration_ms
| filter duration_ms > 1000
| sort duration_ms desc
| limit 20
```

#### Trace Timeline
```sql
fields @timestamp, fn, msg, trace_id
| filter trace_id = "YOUR_TRACE_ID"
| sort @timestamp asc
```

## Additional Resources

- [Orchestrator README](README.md) - Architecture and deployment
- [Testing Guide](TESTING_GUIDE.md) - End-to-end testing procedures
- [Integration Guide](INTEGRATION_GUIDE.md) - Discord and GitHub setup
- [QA Checker Guide](QA_CHECKER_GUIDE.md) - Automated validation
- [AWS Lambda Docs](https://docs.aws.amazon.com/lambda/)
- [Discord API Docs](https://discord.com/developers/docs/intro)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
