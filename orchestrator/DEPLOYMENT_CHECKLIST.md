# Orchestrator Deployment Checklist

Use this checklist to ensure proper deployment and integration of the Project Valine orchestrator.

## Quick Start

**New to deployment?** Start here:

1. **Run the validation script** to check your current state:
   ```bash
   cd orchestrator
   python scripts/validate_deployment.py --stage dev
   ```

2. **Having issues?** See [DISCORD_DEPLOYMENT_TROUBLESHOOTING.md](./DISCORD_DEPLOYMENT_TROUBLESHOOTING.md) for detailed troubleshooting.

3. **First time deployment?** Follow the checklist below step by step.

## Pre-Deployment Preparation

### Gather Required Credentials

- [ ] Discord Application ID
- [ ] Discord Bot Token
- [ ] Discord Public Key
- [ ] GitHub Personal Access Token (or GitHub App credentials)
- [ ] GitHub Webhook Secret (generated)
- [ ] AWS Account with appropriate permissions
- [ ] AWS CLI configured with valid credentials

### Install Prerequisites

- [ ] AWS SAM CLI installed (`sam --version`)
- [ ] Python 3.11+ installed
- [ ] AWS credentials configured (`aws sts get-caller-identity`)
- [ ] Git configured

### Repository Preparation

- [ ] Guardrail files present:
  - [ ] `.github/pull_request_template.md`
  - [ ] `.github/CODEOWNERS`
  - [ ] `.github/workflows/codeql.yml`
- [ ] At least one GitHub issue with `ready` label (for testing)

## Step 1: Configure Secrets

### Update samconfig.toml

- [ ] Copy example config: `cp orchestrator/samconfig.toml.example orchestrator/samconfig.toml`
- [ ] Reference `orchestrator/.env.example` for required values
- [ ] Edit `orchestrator/samconfig.toml`
- [ ] Replace `DiscordPublicKey` with actual Discord public key
- [ ] Replace `DiscordBotToken` with actual Discord bot token
- [ ] Replace `GitHubToken` with actual GitHub token
- [ ] Replace `GitHubWebhookSecret` with generated secret
- [ ] Verify AWS region is correct (default: us-west-2)
- [ ] Choose deployment stage (dev/prod)

**Important**: DO NOT commit `samconfig.toml` with actual secrets to Git!

## Step 2: Build and Deploy

### Build SAM Application

- [ ] Navigate to orchestrator directory: `cd orchestrator`
- [ ] Run: `sam build`
- [ ] Verify build succeeds without errors
- [ ] Check `.aws-sam/build/` directory is created

### Deploy to AWS

- [ ] Run: `sam deploy --guided` (first time)
- [ ] Or run: `./deploy.sh` (using provided script)
- [ ] Confirm all parameters
- [ ] Wait for deployment to complete (5-10 minutes)
- [ ] Note the stack outputs:
  - [ ] DiscordWebhookUrl: ___________________________
  - [ ] GitHubWebhookUrl: ___________________________
  - [ ] RunStateTableName: ___________________________

### Verify Deployment

- [ ] Check CloudFormation stack: `aws cloudformation list-stacks`
- [ ] Verify Lambda functions exist:
  - [ ] `valine-orchestrator-discord-dev`
  - [ ] `valine-orchestrator-github-dev`
- [ ] Verify DynamoDB table exists: `valine-orchestrator-runs-dev`
- [ ] Check API Gateway endpoints are accessible

## Step 3: Discord Integration

### Register Slash Commands

- [ ] Run: `./register_discord_commands.sh`
- [ ] Enter Discord Application ID
- [ ] Enter Discord Bot Token
- [ ] Verify all 4 commands registered (200 status codes):
  - [ ] `/plan`
  - [ ] `/approve`
  - [ ] `/status`
  - [ ] `/ship`

### Configure Interactions Endpoint

- [ ] Go to Discord Developer Portal
- [ ] Select your application
- [ ] Navigate to General Information
- [ ] Paste DiscordWebhookUrl into "Interactions Endpoint URL"
- [ ] Click "Save Changes"
- [ ] Verify Discord shows "Valid" with green checkmark

### Invite Bot to Server

- [ ] Go to OAuth2 > URL Generator
- [ ] Select scopes: `bot`, `applications.commands`
- [ ] Select permissions:
  - [ ] Send Messages
  - [ ] Create Public Threads
  - [ ] Send Messages in Threads
  - [ ] Read Message History
- [ ] Copy generated URL
- [ ] Open URL and invite bot to your Discord server
- [ ] Verify bot appears in member list

### Get Channel ID

- [ ] Enable Developer Mode in Discord (User Settings > Advanced)
- [ ] Right-click on desired channel
- [ ] Click "Copy ID"
- [ ] Save channel ID for testing: ___________________________

## Step 4: GitHub Integration

### Create Issue Label

- [ ] Go to repository > Issues > Labels
- [ ] Create label named `ready`
- [ ] Choose appropriate color (suggestion: green)
- [ ] Save label

### Configure Webhook

- [ ] Go to repository Settings > Webhooks
- [ ] Click "Add webhook"
- [ ] Configure webhook:
  - [ ] Payload URL: Paste GitHubWebhookUrl
  - [ ] Content type: `application/json`
  - [ ] Secret: Paste GitHub webhook secret
  - [ ] SSL verification: Enable
  - [ ] Events: Select individual events:
    - [ ] Issues
    - [ ] Issue comments
    - [ ] Pull requests
    - [ ] Check suites
  - [ ] Active: Checked
- [ ] Click "Add webhook"

### Verify Webhook

- [ ] Check "Recent Deliveries" tab
- [ ] Verify ping delivery has green checkmark
- [ ] Status code should be 200
- [ ] Review response body for any errors

## Step 5: Testing

### Test Discord Commands

- [ ] In Discord server, type `/status`
- [ ] Verify bot responds (should respond within 3 seconds)
- [ ] If you get "The application did not respond" error:
  ```bash
  # Run the validation script
  python scripts/validate_deployment.py --stage dev
  
  # See detailed troubleshooting
  # Read DISCORD_DEPLOYMENT_TROUBLESHOOTING.md
  ```
- [ ] Check CloudWatch Logs:
  ```bash
  aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow
  ```
- [ ] Verify no errors in logs

### Test GitHub Webhook

- [ ] Create test issue with `ready` label
- [ ] Check webhook delivery in GitHub (should be green)
- [ ] Check CloudWatch Logs:
  ```bash
  aws logs tail /aws/lambda/valine-orchestrator-github-dev --follow
  ```
- [ ] Verify webhook handler processed event

### Test Full Workflow

- [ ] Create 2-3 issues with `ready` label
- [ ] In Discord, run `/plan` command
- [ ] Verify:
  - [ ] Bot creates thread with plan
  - [ ] Thread shows list of issues
  - [ ] Run ID is generated
  - [ ] DynamoDB entry created:
    ```bash
    aws dynamodb scan --table-name valine-orchestrator-runs-dev
    ```
- [ ] Run `/status` command
  - [ ] Verify shows active run
- [ ] Run `/approve run_id:YOUR_RUN_ID`
  - [ ] Verify status changes to "in_progress"
- [ ] Run `/ship run_id:YOUR_RUN_ID`
  - [ ] Verify run completes

## Step 6: Monitoring Setup

### CloudWatch Logs

- [ ] Configure log retention:
  ```bash
  aws logs put-retention-policy \
    --log-group-name /aws/lambda/valine-orchestrator-discord-dev \
    --retention-in-days 7
  
  aws logs put-retention-policy \
    --log-group-name /aws/lambda/valine-orchestrator-github-dev \
    --retention-in-days 7
  ```

### CloudWatch Alarms (Optional)

- [ ] Create alarm for Lambda errors
- [ ] Create alarm for Lambda throttles
- [ ] Create alarm for DynamoDB throttles
- [ ] Set up SNS topic for notifications

### Metrics Dashboard (Optional)

- [ ] Create CloudWatch dashboard
- [ ] Add Lambda invocation count
- [ ] Add Lambda error rate
- [ ] Add Lambda duration
- [ ] Add DynamoDB read/write metrics

## Step 7: Documentation

### Update Team Documentation

- [ ] Add orchestrator information to team wiki
- [ ] Document Discord channel to use
- [ ] Document workflow process
- [ ] Share slash command usage guide
- [ ] Document troubleshooting steps

### Security Review

- [ ] Verify no secrets in Git repository
- [ ] Confirm IAM roles follow least privilege
- [ ] Review CloudWatch Logs for sensitive data
- [ ] Ensure webhook secrets are strong
- [ ] Document secret rotation process

## Post-Deployment

### Success Criteria

- [ ] All slash commands work in Discord
- [ ] GitHub webhooks deliver successfully
- [ ] DynamoDB stores run state correctly
- [ ] CloudWatch Logs show detailed traces
- [ ] No errors in production logs
- [ ] Team can use orchestrator successfully

### Known Limitations

Document any current limitations:
- [ ] ___________________________
- [ ] ___________________________

### Next Steps

- [ ] Train team on orchestrator usage
- [ ] Set up production environment (if still in dev)
- [ ] Implement additional features
- [ ] Configure CI/CD for orchestrator updates
- [ ] Schedule regular security reviews

## Rollback Plan

If issues occur after deployment:

1. Disable Discord interactions endpoint (to stop incoming requests)
2. Disable GitHub webhook (to prevent event processing)
3. Review CloudWatch Logs for errors
4. Fix issues and redeploy
5. Re-enable integrations
6. Test thoroughly before announcing to team

## Support Contacts

- AWS Support: ___________________________
- Discord Support: https://support.discord.com
- GitHub Support: https://support.github.com
- Team Lead: ___________________________
- DevOps Contact: ___________________________

## Deployment Sign-off

- [ ] Deployed by: ___________________________ Date: ___________
- [ ] Tested by: ___________________________ Date: ___________
- [ ] Approved by: ___________________________ Date: ___________

---

## Quick Reference

### Useful Commands

```bash
# View Discord handler logs
aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow

# View GitHub handler logs
aws logs tail /aws/lambda/valine-orchestrator-github-dev --follow

# Query DynamoDB
aws dynamodb scan --table-name valine-orchestrator-runs-dev

# Get specific run
aws dynamodb get-item --table-name valine-orchestrator-runs-dev \
  --key '{"run_id": {"S": "YOUR-RUN-ID"}}'

# Redeploy after changes
cd orchestrator && sam build && sam deploy

# Delete stack (careful!)
sam delete
```

### Important URLs

- Discord Developer Portal: https://discord.com/developers/applications
- GitHub Webhook Settings: https://github.com/gcolon75/Project-Valine/settings/hooks
- AWS CloudFormation Console: https://console.aws.amazon.com/cloudformation
- AWS Lambda Console: https://console.aws.amazon.com/lambda
- CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups

### Troubleshooting Resources

If Discord commands are not responding:

1. **Run the validation script:**
   ```bash
   cd orchestrator
   python scripts/validate_deployment.py --stage dev
   ```

2. **Read the troubleshooting guide:**
   - [DISCORD_DEPLOYMENT_TROUBLESHOOTING.md](./DISCORD_DEPLOYMENT_TROUBLESHOOTING.md)

3. **Check CloudWatch Logs:**
   ```bash
   aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow
   ```

Common issues and solutions are documented in the troubleshooting guide above.
