# Deployment Runbook for Agents-as-Employees Workflow

## Purpose

This runbook provides step-by-step instructions for safely deploying the agents-as-employees workflow and Natural Language UX Agent features to development and production environments.

## Prerequisites

- AWS CLI configured with appropriate credentials
- SAM CLI installed (`sam --version`)
- Access to AWS Secrets Manager / SSM Parameter Store for secrets
- GitHub repository access
- Discord bot configured (for testing)

## Pre-Deployment Checklist

### Development Deployment
- [ ] All tests passing locally (`pytest orchestrator/tests/`)
- [ ] SAM template validates (`sam validate --lint`)
- [ ] Feature flag defaults confirmed (`USE_LLM_PARSING=false`)
- [ ] Backup current DynamoDB tables
- [ ] Check current stack status (`aws cloudformation describe-stacks`)
- [ ] OpenAI API key available (optional, for LLM testing)

### Production Deployment
- [ ] All development testing completed successfully
- [ ] PM approval obtained for production deployment
- [ ] Production secrets verified in Secrets Manager
- [ ] Rollback plan reviewed and understood
- [ ] Monitoring dashboards configured
- [ ] On-call engineer notified
- [ ] Deployment window scheduled (low-traffic period)

## Development Deployment

### Step 1: Build the Application

```bash
cd orchestrator

# Build SAM application
sam build --use-container

# Validate the build
sam validate --lint
```

Expected output: "Template is a valid SAM Template"

### Step 2: Deploy to Development

```bash
# Deploy with default settings (LLM disabled)
sam deploy \
  --stack-name valine-orchestrator-dev \
  --parameter-overrides \
    Stage=dev \
    UseLLMParsing=false \
    OpenAIApiKey="" \
    DiscordPublicKey="$DISCORD_PUBLIC_KEY" \
    DiscordBotToken="$DISCORD_BOT_TOKEN" \
    GitHubToken="$GITHUB_TOKEN" \
    GitHubWebhookSecret="$GITHUB_WEBHOOK_SECRET" \
  --capabilities CAPABILITY_IAM \
  --no-confirm-changeset
```

**Important**: Never commit secrets to version control. Use environment variables or AWS Secrets Manager.

### Step 3: Verify Deployment

```bash
# Check stack status
aws cloudformation describe-stacks \
  --stack-name valine-orchestrator-dev \
  --query 'Stacks[0].StackStatus'

# Get API endpoints
aws cloudformation describe-stacks \
  --stack-name valine-orchestrator-dev \
  --query 'Stacks[0].Outputs'

# Check Lambda functions
aws lambda get-function \
  --function-name valine-orchestrator-discord-dev
```

### Step 4: Smoke Tests

#### Test 1: Discord Handler Health
```bash
# From Discord channel:
/agents
```
Expected: List of available agents including UXAgent

#### Test 2: UX Update (Dry-Run)
```bash
# From Discord channel:
/ux-update command:"section:header text:\"Test Deploy\""
```
Expected: Preview message with proposed changes and confirmation buttons

#### Test 3: Cancel Flow
Click "❌ Cancel" button
Expected: "Request cancelled" message

#### Test 4: Confirm Flow (Optional - creates real PR)
```bash
/ux-update command:"section:footer text:\"Test\""
```
Click "✅ Confirm"
Expected: Draft PR created in GitHub

### Step 5: Monitor Logs

```bash
# Tail Lambda logs
sam logs \
  --stack-name valine-orchestrator-dev \
  --name DiscordHandlerFunction \
  --tail

# Check for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/valine-orchestrator-discord-dev \
  --filter-pattern "ERROR"
```

## Enabling LLM Parsing (Development Only - Initially)

**⚠️ CAUTION**: This incurs OpenAI API costs. Start with development environment only.

### Step 1: Update Stack with LLM Enabled

```bash
sam deploy \
  --stack-name valine-orchestrator-dev \
  --parameter-overrides \
    Stage=dev \
    UseLLMParsing=true \
    OpenAIApiKey="$OPENAI_API_KEY" \
    DiscordPublicKey="$DISCORD_PUBLIC_KEY" \
    DiscordBotToken="$DISCORD_BOT_TOKEN" \
    GitHubToken="$GITHUB_TOKEN" \
    GitHubWebhookSecret="$GITHUB_WEBHOOK_SECRET" \
  --capabilities CAPABILITY_IAM \
  --no-confirm-changeset
```

### Step 2: Test LLM Parsing

```bash
# From Discord channel:
/ux-update description:"Make the navbar blue"
```

Expected: LLM parses intent and generates preview

### Step 3: Monitor Costs

```bash
# Check CloudWatch metrics for LLM calls
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=valine-orchestrator-discord-dev \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum

# Check Lambda logs for cost tracking
aws logs tail /aws/lambda/valine-orchestrator-discord-dev \
  --format short \
  --filter-pattern "cost_usd"
```

**Daily Budget**: Default $10/day. Monitor actual spend in OpenAI dashboard.

## Production Deployment

### Step 1: Final Pre-Flight Checks

- [ ] All smoke tests passed in development
- [ ] LLM parsing tested and costs validated (if enabling)
- [ ] PM approval obtained (documented)
- [ ] Rollback plan reviewed
- [ ] Team notified of deployment

### Step 2: Deploy to Production

```bash
# Deploy with LLM DISABLED initially (canary approach)
sam deploy \
  --stack-name valine-orchestrator-prod \
  --parameter-overrides \
    Stage=prod \
    UseLLMParsing=false \
    OpenAIApiKey="" \
    DiscordPublicKey="$PROD_DISCORD_PUBLIC_KEY" \
    DiscordBotToken="$PROD_DISCORD_BOT_TOKEN" \
    GitHubToken="$PROD_GITHUB_TOKEN" \
    GitHubWebhookSecret="$PROD_GITHUB_WEBHOOK_SECRET" \
  --capabilities CAPABILITY_IAM \
  --no-confirm-changeset
```

### Step 3: Verify Production Deployment

```bash
# Check stack status
aws cloudformation describe-stacks \
  --stack-name valine-orchestrator-prod \
  --query 'Stacks[0].StackStatus'

# Verify environment variables
aws lambda get-function-configuration \
  --function-name valine-orchestrator-discord-prod \
  --query 'Environment.Variables'
```

### Step 4: Production Smoke Tests

Run the same smoke tests as development, but in production Discord channel.

## Rollback Procedures

### Scenario 1: Deployment Fails

```bash
# Rollback to previous version
aws cloudformation cancel-update-stack \
  --stack-name valine-orchestrator-{dev|prod}

# Or delete and redeploy previous version
aws cloudformation delete-stack \
  --stack-name valine-orchestrator-{dev|prod}

# Then redeploy previous version from git tag
git checkout <previous-version-tag>
sam deploy --stack-name valine-orchestrator-{dev|prod}
```

### Scenario 2: Feature Flag Needs Disabling

```bash
# Quick disable LLM parsing without full redeployment
aws lambda update-function-configuration \
  --function-name valine-orchestrator-discord-{dev|prod} \
  --environment "Variables={USE_LLM_PARSING=false,STAGE={dev|prod},...}"

# Or full redeployment
sam deploy \
  --stack-name valine-orchestrator-{dev|prod} \
  --parameter-overrides UseLLMParsing=false \
  ...
```

### Scenario 3: Critical Bug in New Code

```bash
# Immediate: Disable new commands via environment variable
aws lambda update-function-configuration \
  --function-name valine-orchestrator-discord-{dev|prod} \
  --environment "Variables={DISABLE_UX_UPDATES=true,...}"

# Then rollback and investigate
git checkout <previous-stable-version>
sam deploy --stack-name valine-orchestrator-{dev|prod}
```

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Lambda Errors**
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/Lambda \
     --metric-name Errors \
     --dimensions Name=FunctionName,Value=valine-orchestrator-discord-{dev|prod}
   ```

2. **Lambda Duration** (check for timeouts)
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/Lambda \
     --metric-name Duration \
     --dimensions Name=FunctionName,Value=valine-orchestrator-discord-{dev|prod}
   ```

3. **DynamoDB Throttles**
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/DynamoDB \
     --metric-name UserErrors \
     --dimensions Name=TableName,Value=ux-agent-conversations
   ```

### CloudWatch Alarms (Recommended)

```bash
# Create alarm for Lambda errors
aws cloudwatch put-metric-alarm \
  --alarm-name valine-discord-errors-prod \
  --alarm-description "Alert on Lambda errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=valine-orchestrator-discord-prod
```

## Troubleshooting

### Issue: "Discord signature verification failed"

**Cause**: Discord public key mismatch or timestamp drift

**Solution**:
```bash
# Verify Discord public key
aws lambda get-function-configuration \
  --function-name valine-orchestrator-discord-{dev|prod} \
  --query 'Environment.Variables.DISCORD_PUBLIC_KEY'

# Update if needed
sam deploy --parameter-overrides DiscordPublicKey="<correct-key>"
```

### Issue: "DynamoDB table not found"

**Cause**: Table name mismatch or table doesn't exist

**Solution**:
```bash
# List tables
aws dynamodb list-tables

# Check if table exists
aws dynamodb describe-table --table-name ux-agent-conversations

# Create if missing (should be in CloudFormation)
sam deploy --stack-name valine-orchestrator-{dev|prod}
```

### Issue: "OpenAI API rate limit exceeded"

**Cause**: Too many LLM requests

**Solution**:
```bash
# Temporarily disable LLM
aws lambda update-function-configuration \
  --function-name valine-orchestrator-discord-{dev|prod} \
  --environment "Variables={USE_LLM_PARSING=false,...}"

# Check OpenAI usage dashboard
# Adjust MAX_DAILY_COST_USD in code if needed
```

## Post-Deployment Validation

- [ ] All smoke tests pass
- [ ] No errors in CloudWatch logs
- [ ] Discord commands respond correctly
- [ ] Draft PRs created successfully (if tested)
- [ ] DynamoDB tables accessible
- [ ] Metrics dashboard shows healthy status

## Contacts

- **On-Call Engineer**: [Your team's on-call]
- **PM Approval**: [PM name/email]
- **AWS Account Owner**: [Account owner]
- **Discord Bot Owner**: [Bot owner]

## Change Log

- 2025-10-27: Initial runbook created for agents-as-employees workflow
