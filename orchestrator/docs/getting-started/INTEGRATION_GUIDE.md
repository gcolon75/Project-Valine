# Integration Setup Guide

This guide provides detailed steps for integrating the orchestrator with Discord and GitHub.

## Discord Integration

### 1. Create Discord Application

1. Visit [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name it "Project Valine Orchestrator"
4. Save the **Application ID**

### 2. Configure Bot

1. Navigate to "Bot" section in the left sidebar
2. Click "Add Bot" if not already created
3. Under "Privileged Gateway Intents", enable:
   - Server Members Intent (if needed)
   - Message Content Intent
4. Click "Reset Token" and copy the **Bot Token** (save securely)
5. Under "Bot Permissions", select:
   - Send Messages
   - Create Public Threads
   - Send Messages in Threads
   - Read Message History

### 3. Get Public Key

1. Navigate to "General Information" in the left sidebar
2. Copy the **Public Key** (needed for signature verification)

### 4. Invite Bot to Server

1. Go to "OAuth2" > "URL Generator"
2. Select scopes:
   - `bot`
   - `applications.commands`
3. Select bot permissions (same as step 2.5 above)
4. Copy the generated URL
5. Open the URL in a browser and select your server
6. Authorize the bot

### 5. Register Slash Commands

Use the provided script or API calls to register commands (see README.md Step 3).

### 6. Set Interactions Endpoint

1. After deploying the orchestrator (SAM deployment complete)
2. Copy the **DiscordWebhookUrl** from CloudFormation outputs
3. In Discord Developer Portal > "General Information"
4. Paste the URL into **Interactions Endpoint URL**
5. Click "Save Changes"
6. Discord will verify the endpoint (it will send a PING request)

**Note**: The Lambda must be deployed and operational before setting this URL.

### 7. Get Channel ID

To use the orchestrator, you need a Discord channel ID:

1. Enable Developer Mode in Discord:
   - User Settings > Advanced > Developer Mode
2. Right-click on a channel
3. Select "Copy ID"
4. Save this channel ID (you'll use it with `/plan` command)

## GitHub Integration

### 1. Create Personal Access Token

For development/testing:

1. Go to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name: "Project Valine Orchestrator"
4. Select scopes:
   - `repo` (full control of private repositories)
   - `write:discussion`
   - `workflow` (if you want to trigger workflows)
5. Click "Generate token"
6. Copy the token immediately (it won't be shown again)

For production, consider using a GitHub App:

1. Go to GitHub Settings > Developer settings > GitHub Apps
2. Click "New GitHub App"
3. Configure:
   - Name: "Project Valine Orchestrator"
   - Homepage URL: Your project URL
   - Webhook URL: Your GitHubWebhookUrl from SAM deployment
   - Webhook secret: The secret you generated
4. Set permissions:
   - Repository permissions:
     - Contents: Read & write
     - Issues: Read & write
     - Pull requests: Read & write
     - Checks: Read & write
5. Subscribe to events:
   - Issues
   - Issue comment
   - Pull request
   - Check suite
6. Install the app on your repository

### 2. Generate Webhook Secret

Generate a secure random secret:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Save this secret for use in both:
- SAM deployment configuration (samconfig.toml)
- GitHub webhook configuration

### 3. Configure Repository Webhook

1. Navigate to your repository on GitHub
2. Go to Settings > Webhooks
3. Click "Add webhook"
4. Configure:
   - **Payload URL**: The GitHubWebhookUrl from SAM deployment output
   - **Content type**: application/json
   - **Secret**: The webhook secret you generated
   - **SSL verification**: Enable SSL verification (recommended)
   - **Which events would you like to trigger this webhook?**
     - Select "Let me select individual events"
     - Check:
       - ☑ Issues
       - ☑ Issue comments
       - ☑ Pull requests
       - ☑ Check suites
     - Uncheck "Pushes" (unless needed)
   - **Active**: ✓ Checked
5. Click "Add webhook"

### 4. Verify Webhook

1. After creating the webhook, GitHub sends a test ping
2. Click on the webhook in the list
3. Go to "Recent Deliveries"
4. Check that the ping was successful (green checkmark)
5. If failed, check:
   - Lambda is deployed
   - API Gateway endpoint is accessible
   - Signature verification is working
   - Check CloudWatch Logs for errors

### 5. Create Issue Label

The orchestrator looks for issues with the `ready` label by default:

1. Go to your repository > Issues > Labels
2. Click "New label"
3. Name: `ready`
4. Description: "Issues ready for orchestrator processing"
5. Color: Choose a color (e.g., green #0E8A16)
6. Click "Create label"

### 6. Test the Integration

Create a test issue:

1. Go to Issues > New issue
2. Title: "Test orchestrator integration"
3. Add the `ready` label
4. Create issue
5. Check CloudWatch Logs to verify the webhook was received:
   ```bash
   aws logs tail /aws/lambda/valine-orchestrator-github-dev --follow
   ```

## Environment Variables

The following environment variables are used by the orchestrator:

### Discord Handler
- `DISCORD_PUBLIC_KEY`: Discord application public key (for signature verification)
- `DISCORD_BOT_TOKEN`: Discord bot token (for API calls)
- `GITHUB_TOKEN`: GitHub token (for creating issues/PRs from Discord commands)
- `RUN_TABLE_NAME`: DynamoDB table name (auto-configured by SAM)
- `STAGE`: Deployment stage (dev/prod)

### GitHub Handler
- `GITHUB_WEBHOOK_SECRET`: Secret for webhook signature verification
- `GITHUB_TOKEN`: GitHub token (for API calls)
- `DISCORD_BOT_TOKEN`: Discord token (for posting updates)
- `RUN_TABLE_NAME`: DynamoDB table name (auto-configured by SAM)
- `STAGE`: Deployment stage (dev/prod)

These are configured in the SAM template and passed via parameter overrides in samconfig.toml.

## Security Considerations

### Secrets Management

**For Development:**
- Use samconfig.toml with parameter overrides
- Never commit actual secrets to Git
- Add `samconfig.toml` to .gitignore if it contains secrets

**For Production:**
1. Use AWS Secrets Manager:
   ```bash
   # Store Discord public key
   aws secretsmanager create-secret \
     --name /valine/orchestrator/discord-public-key \
     --secret-string "your-public-key"
   
   # Store Discord bot token
   aws secretsmanager create-secret \
     --name /valine/orchestrator/discord-bot-token \
     --secret-string "your-bot-token"
   
   # Store GitHub token
   aws secretsmanager create-secret \
     --name /valine/orchestrator/github-token \
     --secret-string "your-github-token"
   
   # Store webhook secret
   aws secretsmanager create-secret \
     --name /valine/orchestrator/webhook-secret \
     --secret-string "your-webhook-secret"
   ```

2. Update Lambda to read from Secrets Manager
3. Grant Lambda execution role permissions to read secrets

### Network Security

- Use AWS WAF to protect API Gateway
- Implement rate limiting
- Use VPC endpoints if Lambda is in VPC
- Enable CloudWatch Logs encryption

### Access Control

- Use least privilege IAM policies
- Regularly audit IAM permissions
- Enable CloudTrail for audit logs
- Use resource-based policies where appropriate

## Monitoring Setup

### CloudWatch Alarms

Create alarms for critical metrics:

```bash
# Lambda errors
aws cloudwatch put-metric-alarm \
  --alarm-name orchestrator-discord-errors \
  --alarm-description "Alert on Discord handler errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=FunctionName,Value=valine-orchestrator-discord-dev

# Lambda throttles
aws cloudwatch put-metric-alarm \
  --alarm-name orchestrator-throttles \
  --alarm-description "Alert on Lambda throttles" \
  --metric-name Throttles \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

### Log Insights Queries

Useful CloudWatch Insights queries:

```sql
-- Find all errors
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc

-- Count events by type
fields @timestamp, @message
| filter @message like /GitHub event:/
| parse @message "GitHub event: *" as event_type
| stats count() by event_type

-- Discord command usage
fields @timestamp, @message
| filter @message like /command/
| parse @message "* command" as command_name
| stats count() by command_name
```

## Testing Checklist

- [ ] Discord bot appears online in server
- [ ] `/plan` command is registered and visible
- [ ] `/approve` command is registered and visible
- [ ] `/status` command is registered and visible
- [ ] `/ship` command is registered and visible
- [ ] Discord interactions endpoint responds to PING
- [ ] GitHub webhook receives and acknowledges events
- [ ] DynamoDB table exists and is accessible
- [ ] Lambda functions can write to CloudWatch Logs
- [ ] Lambda functions can read/write to DynamoDB
- [ ] GitHub API calls succeed (check CloudWatch Logs)
- [ ] Discord API calls succeed (check CloudWatch Logs)

## Troubleshooting Common Issues

### Discord "Invalid Signature" Error

**Cause**: Public key mismatch or incorrect signature verification

**Solution**:
1. Verify the public key in samconfig.toml matches Discord Developer Portal
2. Ensure the Lambda is using the correct environment variable
3. Check CloudWatch Logs for signature verification details
4. Redeploy after fixing configuration

### GitHub Webhook Fails Verification

**Cause**: Webhook secret mismatch

**Solution**:
1. Verify the secret in GitHub matches samconfig.toml
2. Ensure the secret is properly base64 encoded if needed
3. Check CloudWatch Logs for signature details
4. Redeliver the webhook from GitHub interface to test

### Bot Not Responding to Commands

**Cause**: Multiple possible causes

**Solution**:
1. Check bot is online in Discord
2. Verify bot has permissions in the channel
3. Check commands are registered (see Discord Developer Portal)
4. Review Lambda CloudWatch Logs for errors
5. Verify interactions endpoint URL is correct

### DynamoDB Access Errors

**Cause**: Missing IAM permissions

**Solution**:
1. Check Lambda execution role has DynamoDB permissions
2. Verify table name in environment variables
3. Ensure table exists in the correct region
4. Check CloudWatch Logs for specific error messages

## Support Resources

- [Discord Developer Documentation](https://discord.com/developers/docs)
- [GitHub Webhooks Documentation](https://docs.github.com/en/developers/webhooks-and-events/webhooks)
- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
