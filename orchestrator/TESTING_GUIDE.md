# End-to-End Testing Guide

This guide walks through testing the orchestrator after deployment and integration.

## Prerequisites

- Orchestrator deployed to AWS
- Discord bot configured and slash commands registered
- GitHub webhook configured
- Discord channel ID obtained

## Viewing Logs

### Structured JSON Logs

The orchestrator outputs structured JSON logs to CloudWatch. Each log entry includes:
- `timestamp`: ISO 8601 timestamp
- `level`: Log level (INFO, WARNING, ERROR)
- `service`: Service name (orchestrator)
- `function`: Function name
- `message`: Log message
- `trace_id`: Unique trace identifier
- `user_id`: Discord user ID (when available)
- `command`: Command name (when available)

### CloudWatch Logs

View logs in real-time:
```bash
aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow
```

### CloudWatch Logs Insights

Query logs using CloudWatch Logs Insights. Example queries:

**Find all errors:**
```
fields @timestamp, level, message, trace_id
| filter level = "ERROR"
| sort @timestamp desc
```

**Track a specific trace:**
```
fields @timestamp, function, message
| filter trace_id = "your-trace-id"
| sort @timestamp asc
```

**Command execution statistics:**
```
fields command, duration_ms
| filter command != ""
| stats avg(duration_ms) as avg_duration, count() as executions by command
```

## Dry-Run Mode

The orchestrator supports a **dry-run mode** for testing without making actual external API calls. This is useful for:
- Local development and testing
- CI/CD pipeline validation
- Integration test scenarios

### Enabling Dry-Run Mode

Set the `DRY_RUN` environment variable:

```bash
export DRY_RUN=true
python -m pytest tests/
```

In dry-run mode:
- External API calls are mocked/simulated
- Discord and GitHub API interactions are logged but not executed
- Traces are still created and can be inspected
- All business logic is exercised

### Example Dry-Run Test

```python
import os
os.environ['DRY_RUN'] = 'true'

from app.handlers.discord_handler import handle_status_command

# Create mock interaction
interaction = {
    'data': {'options': []},
    'member': {'user': {'id': '12345'}},
    'channel': {'id': '67890'}
}

# Execute command in dry-run mode
response = handle_status_command(interaction)

# Verify response structure without external calls
assert response['statusCode'] == 200
```

### Running Integration Tests

Integration tests exercise multiple components together:

```bash
# Run all tests including integration tests
python -m pytest tests/ -v

# Run only integration tests (if tagged)
python -m pytest tests/ -v -m integration
```

## Test 1: Discord PING Verification

**Purpose**: Verify Discord can communicate with the orchestrator

**Steps**:
1. Set the Interactions Endpoint URL in Discord Developer Portal
2. Discord automatically sends a PING request
3. Verify the endpoint responds with success

**Expected Result**:
- Discord shows "Valid" next to the Interactions Endpoint URL
- Green checkmark indicating successful verification

**Troubleshooting**:
- Check CloudWatch Logs: `aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow`
- View structured logs with trace_id for detailed debugging
- Verify DISCORD_PUBLIC_KEY is correct
- Ensure Lambda is responding with correct PONG response

## Test 2: GitHub Webhook PING

**Purpose**: Verify GitHub can communicate with the orchestrator

**Steps**:
1. Configure webhook in GitHub repository settings
2. GitHub automatically sends a ping event
3. Check webhook delivery status

**Expected Result**:
- Green checkmark in GitHub webhook deliveries
- Status code 200
- Response body indicates successful processing

**Troubleshooting**:
- Check CloudWatch Logs: `aws logs tail /aws/lambda/valine-orchestrator-github-dev --follow`
- Verify GITHUB_WEBHOOK_SECRET matches
- Check API Gateway endpoint is accessible

## Test 3: /plan Command

**Purpose**: Test daily plan creation from GitHub issues

**Prerequisites**:
- At least one issue with the `ready` label in the repository

**Steps**:
1. In Discord, type: `/plan`
2. Bot should acknowledge the command
3. Check CloudWatch Logs for execution

**Expected Result**:
- Bot responds with a message about creating a plan
- A new thread is created in the channel
- DynamoDB run entry is created
- GitHub issues are fetched successfully

**Verify**:
```bash
# Check Lambda logs
aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow

# Check DynamoDB entries
aws dynamodb scan --table-name valine-orchestrator-runs-dev

# Query for specific run
aws dynamodb get-item --table-name valine-orchestrator-runs-dev \
  --key '{"run_id": {"S": "YOUR-RUN-ID"}}'
```

**Troubleshooting**:
- If no issues found, create a test issue with `ready` label
- Check GITHUB_TOKEN has correct permissions
- Verify repository name is correct in configuration

## Test 4: /status Command

**Purpose**: Check orchestrator run status

**Steps**:
1. In Discord, type: `/status`
2. Or: `/status run_id:YOUR-RUN-ID`

**Expected Result**:
- Bot responds with current orchestrator status
- Shows active runs and their states
- If run_id provided, shows detailed status of that run

**Verify**:
```bash
# Check logs
aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow
```

## Test 5: GitHub Issue Event

**Purpose**: Test GitHub webhook event processing

**Steps**:
1. Create a new issue in the repository
2. Add the `ready` label
3. Check CloudWatch Logs

**Expected Result**:
- Webhook handler receives the event
- Event is logged in CloudWatch
- Event type is correctly identified

**Verify**:
```bash
# Check GitHub webhook handler logs
aws logs tail /aws/lambda/valine-orchestrator-github-dev --follow

# Check webhook deliveries in GitHub
# Repository Settings > Webhooks > Click webhook > Recent Deliveries
```

**Test Scenarios**:
- Create issue with `ready` label
- Add `ready` label to existing issue
- Remove `ready` label from issue
- Close issue with `ready` label

## Test 6: GitHub Pull Request Event

**Purpose**: Test PR event processing

**Steps**:
1. Create a branch: `git checkout -b test-orchestrator`
2. Make a change and push
3. Create a pull request
4. Check CloudWatch Logs

**Expected Result**:
- Webhook handler receives PR event
- Event is logged correctly
- Handler processes PR data

**Verify**:
```bash
aws logs tail /aws/lambda/valine-orchestrator-github-dev --follow
```

## Test 7: /approve Command

**Purpose**: Test plan approval and execution

**Prerequisites**:
- A run created from `/plan` command

**Steps**:
1. Get run_id from previous `/plan` execution or DynamoDB
2. In Discord, type: `/approve run_id:YOUR-RUN-ID`

**Expected Result**:
- Bot acknowledges approval
- Run status changes to "in_progress" in DynamoDB
- Discord thread is updated with approval message

**Verify**:
```bash
# Check run status
aws dynamodb get-item --table-name valine-orchestrator-runs-dev \
  --key '{"run_id": {"S": "YOUR-RUN-ID"}}'

# Check logs
aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow
```

## Test 8: /ship Command

**Purpose**: Test run finalization

**Prerequisites**:
- A run in "in_progress" or "completed" state

**Steps**:
1. Get run_id from DynamoDB
2. In Discord, type: `/ship run_id:YOUR-RUN-ID`

**Expected Result**:
- Bot acknowledges shipping
- Run status changes to "completed" in DynamoDB
- Discord thread shows completion summary

**Verify**:
```bash
# Check run status
aws dynamodb get-item --table-name valine-orchestrator-runs-dev \
  --key '{"run_id": {"S": "YOUR-RUN-ID"}}'
```

## Test 9: Error Handling

**Purpose**: Verify error handling works correctly

**Test Scenarios**:

### Invalid Discord Signature
1. Send a request with invalid signature to Discord endpoint
2. Should return 401 Unauthorized

### Invalid GitHub Signature
1. Send a request with invalid signature to GitHub endpoint
2. Should return 401 Unauthorized

### Non-existent Run ID
1. Type: `/approve run_id:invalid-id`
2. Should return error message

### Missing GitHub Token
1. Temporarily remove GITHUB_TOKEN from environment
2. Redeploy
3. Commands should fail gracefully with error message
4. Restore token and redeploy

## Test 10: Performance and Limits

**Purpose**: Test under load and verify limits

**Test Scenarios**:

### Multiple Concurrent Commands
1. Execute multiple `/plan` commands simultaneously
2. Verify all are processed correctly
3. Check for race conditions

### Large Issue Count
1. Create 50+ issues with `ready` label
2. Execute `/plan`
3. Verify all issues are fetched and displayed
4. Check Discord embed limits (max 25 fields)

### Rapid Events
1. Create multiple issues quickly
2. Verify all webhook events are processed
3. Check for throttling or missed events

## Integration Test Checklist

Run through this checklist to verify full integration:

- [ ] Discord bot appears online in server
- [ ] Discord slash commands are registered
- [ ] `/plan` command executes successfully
- [ ] Discord thread is created with plan
- [ ] DynamoDB entry is created for run
- [ ] `/status` command shows active runs
- [ ] GitHub issue with `ready` label triggers webhook
- [ ] GitHub PR events are received
- [ ] GitHub issue comment events are received
- [ ] `/approve` command updates run status
- [ ] `/ship` command finalizes run
- [ ] Error messages are clear and helpful
- [ ] CloudWatch Logs show detailed execution traces
- [ ] No credentials are logged or exposed
- [ ] All IAM permissions are working correctly

## Monitoring During Tests

### CloudWatch Logs

Terminal 1 - Discord Handler:
```bash
aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow --format short
```

Terminal 2 - GitHub Handler:
```bash
aws logs tail /aws/lambda/valine-orchestrator-github-dev --follow --format short
```

### CloudWatch Insights

Run this query to see all events:
```sql
fields @timestamp, @message
| sort @timestamp desc
| limit 100
```

### DynamoDB Monitoring

Watch item count:
```bash
aws dynamodb describe-table --table-name valine-orchestrator-runs-dev \
  --query 'Table.ItemCount'
```

## Common Issues and Solutions

### Issue: Discord commands not appearing
**Solution**: 
- Wait 5-10 minutes for Discord to sync commands globally
- Try in a different server
- Re-run command registration script

### Issue: "Invalid token" from GitHub
**Solution**:
- Verify token has correct scopes
- Check token hasn't expired
- Regenerate token if needed

### Issue: Lambda timeout
**Solution**:
- Increase timeout in template.yaml
- Optimize API calls
- Add retry logic with exponential backoff

### Issue: DynamoDB throttling
**Solution**:
- Switch to provisioned capacity
- Reduce request rate
- Implement request batching

### Issue: API Gateway 502 error
**Solution**:
- Check Lambda function code for errors
- Verify function returns correct response format
- Check CloudWatch Logs for exceptions

## Test Results Template

Use this template to document test results:

```markdown
## Test Results - [Date]

### Environment
- Stage: dev/prod
- Region: us-west-2
- Lambda Runtime: python3.11

### Test 1: Discord PING
- Status: ✅ Pass / ❌ Fail
- Notes: 

### Test 2: GitHub PING
- Status: ✅ Pass / ❌ Fail
- Notes:

### Test 3: /plan Command
- Status: ✅ Pass / ❌ Fail
- Run ID: 
- Issues Found: 
- Notes:

### Test 4: /status Command
- Status: ✅ Pass / ❌ Fail
- Notes:

### Test 5: GitHub Issue Event
- Status: ✅ Pass / ❌ Fail
- Notes:

### Test 6: GitHub PR Event
- Status: ✅ Pass / ❌ Fail
- Notes:

### Test 7: /approve Command
- Status: ✅ Pass / ❌ Fail
- Run ID:
- Notes:

### Test 8: /ship Command
- Status: ✅ Pass / ❌ Fail
- Run ID:
- Notes:

### Overall Status
- [ ] All tests passing
- [ ] Ready for production
- [ ] Issues to address:

### Performance Metrics
- Average Lambda execution time:
- DynamoDB read/write latency:
- API Gateway response time:
```

## Next Steps After Testing

Once all tests pass:

1. Document any configuration changes needed
2. Update deployment scripts if issues found
3. Create runbook for common operations
4. Set up production environment
5. Configure monitoring and alerts
6. Train team on using the orchestrator
7. Create user documentation
8. Plan for production rollout
