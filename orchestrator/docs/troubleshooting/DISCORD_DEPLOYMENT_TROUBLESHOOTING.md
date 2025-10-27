# Discord Slash Commands - Deployment Troubleshooting Guide

## Problem: "The application did not respond" Error

If your Discord slash commands are registered but don't respond when executed, this guide will help you diagnose and fix the issue.

## Quick Diagnosis

Run the deployment validation script:

```bash
cd orchestrator
python scripts/validate_deployment.py
```

This will check all required configurations and identify what needs to be fixed.

## Common Root Causes

### 1. Lambda Function Not Deployed

**Symptoms:**
- Commands registered but don't respond
- No logs in CloudWatch
- Interactions Endpoint URL returns 404

**Diagnosis:**
```bash
# Check if Lambda functions exist
aws lambda list-functions --query 'Functions[?contains(FunctionName, `valine-orchestrator`)].[FunctionName,Runtime,LastModified]' --output table
```

Expected output should show:
- `valine-orchestrator-discord-dev` (or `-prod`)
- `valine-orchestrator-github-dev` (or `-prod`)

**Fix:**

1. **Ensure samconfig.toml exists:**
   ```bash
   cd orchestrator
   cp samconfig.toml.example samconfig.toml
   ```

2. **Edit samconfig.toml with your values:**
   ```toml
   parameter_overrides = [
     "Stage=\"dev\"",
     "DiscordPublicKey=\"YOUR_ACTUAL_DISCORD_PUBLIC_KEY\"",
     "DiscordBotToken=\"YOUR_ACTUAL_DISCORD_BOT_TOKEN\"",
     "GitHubToken=\"YOUR_ACTUAL_GITHUB_TOKEN\"",
     "GitHubWebhookSecret=\"YOUR_GENERATED_WEBHOOK_SECRET\"",
     "FrontendBaseUrl=\"\"",
     "ViteApiBase=\"\""
   ]
   ```

3. **Deploy using SAM:**
   ```bash
   # Install SAM CLI if needed
   # https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
   
   # Build and deploy
   sam build
   sam deploy
   ```

4. **Save the outputs:**
   ```bash
   aws cloudformation describe-stacks \
     --stack-name valine-orchestrator \
     --query 'Stacks[0].Outputs' \
     --output table
   ```

   Note the `DiscordWebhookUrl` - you'll need it for Discord configuration.

### 2. Interactions Endpoint URL Not Set

**Symptoms:**
- Lambda deployed successfully
- Commands registered successfully
- Discord shows "The application did not respond"
- No logs in CloudWatch (request never reaches Lambda)

**Diagnosis:**

Check Discord Developer Portal:
1. Go to https://discord.com/developers/applications
2. Select your application
3. Go to "General Information"
4. Check "Interactions Endpoint URL"

**Fix:**

1. Get your Lambda endpoint URL from CloudFormation outputs:
   ```bash
   aws cloudformation describe-stacks \
     --stack-name valine-orchestrator \
     --query 'Stacks[0].Outputs[?OutputKey==`DiscordWebhookUrl`].OutputValue' \
     --output text
   ```

2. Set it in Discord Developer Portal:
   - Go to https://discord.com/developers/applications
   - Select your application
   - Go to "General Information"
   - Paste the URL into "Interactions Endpoint URL"
   - Click "Save Changes"

3. Discord will verify the endpoint by sending a PING request. If it fails:
   - Check Lambda exists and is deployed
   - Check DISCORD_PUBLIC_KEY is set correctly (see next section)
   - Check CloudWatch Logs for errors

### 3. DISCORD_PUBLIC_KEY Mismatch

**Symptoms:**
- Lambda deployed successfully
- Interactions Endpoint URL is set
- Discord verification fails with "Invalid request signature" error
- CloudWatch shows "Invalid request signature" or "BadSignatureError"

**Diagnosis:**

1. Get the Public Key from Discord Developer Portal:
   - Go to https://discord.com/developers/applications
   - Select your application
   - Go to "General Information"
   - Copy the "Public Key" (NOT the Bot Token)

2. Check what's set in Lambda:
   ```bash
   aws lambda get-function-configuration \
     --function-name valine-orchestrator-discord-dev \
     --query 'Environment.Variables.DISCORD_PUBLIC_KEY' \
     --output text
   ```

3. Compare them - they must match exactly.

**Fix:**

**Option A: Redeploy with correct key**

1. Edit `orchestrator/samconfig.toml`:
   ```toml
   "DiscordPublicKey=\"YOUR_CORRECT_PUBLIC_KEY_FROM_DISCORD_PORTAL\""
   ```

2. Redeploy:
   ```bash
   cd orchestrator
   sam build
   sam deploy
   ```

**Option B: Update environment variable directly**

```bash
# Get current environment variables
CURRENT_ENV=$(aws lambda get-function-configuration \
  --function-name valine-orchestrator-discord-dev \
  --query 'Environment.Variables' \
  --output json)

# Update with correct public key
aws lambda update-function-configuration \
  --function-name valine-orchestrator-discord-dev \
  --environment "Variables={DISCORD_PUBLIC_KEY=YOUR_CORRECT_PUBLIC_KEY,DISCORD_BOT_TOKEN=YOUR_BOT_TOKEN,GITHUB_TOKEN=YOUR_GITHUB_TOKEN,GITHUB_REPO=gcolon75/Project-Valine,STAGE=dev,RUN_TABLE_NAME=valine-orchestrator-runs-dev}"
```

### 4. Missing Environment Variables

**Symptoms:**
- Lambda deployed successfully
- Interactions Endpoint URL verification succeeds
- Commands execute but fail with errors about missing tokens
- CloudWatch shows errors like "GITHUB_TOKEN not configured"

**Diagnosis:**

Check all environment variables:
```bash
aws lambda get-function-configuration \
  --function-name valine-orchestrator-discord-dev \
  --query 'Environment.Variables' \
  --output json
```

Required variables:
- `DISCORD_PUBLIC_KEY` - From Discord Developer Portal > General Information
- `DISCORD_BOT_TOKEN` - From Discord Developer Portal > Bot
- `GITHUB_TOKEN` - Personal Access Token or GitHub App token with repo permissions
- `GITHUB_REPO` - Should be `gcolon75/Project-Valine`
- `STAGE` - Should be `dev` or `prod`
- `RUN_TABLE_NAME` - Should be `valine-orchestrator-runs-dev` (or `-prod`)

**Fix:**

Redeploy with all required variables in samconfig.toml, or update them directly:

```bash
aws lambda update-function-configuration \
  --function-name valine-orchestrator-discord-dev \
  --environment "Variables={
    DISCORD_PUBLIC_KEY=YOUR_PUBLIC_KEY,
    DISCORD_BOT_TOKEN=YOUR_BOT_TOKEN,
    GITHUB_TOKEN=YOUR_GITHUB_TOKEN,
    GITHUB_REPO=gcolon75/Project-Valine,
    STAGE=dev,
    RUN_TABLE_NAME=valine-orchestrator-runs-dev
  }"
```

### 5. Bot Missing Required Permissions

**Symptoms:**
- Everything else works
- Commands execute but fail with permission errors
- CloudWatch shows "Missing Permissions" or "403 Forbidden"

**Diagnosis:**

Check bot invite URL had correct scopes and permissions.

**Fix:**

Re-invite the bot with correct scopes:

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_APPLICATION_ID&scope=bot%20applications.commands&permissions=2048
```

Required scopes:
- `bot` - Basic bot functionality
- `applications.commands` - Slash command execution

Required permissions:
- `Send Messages` (2048) - To respond to commands

## Step-by-Step Deployment Guide

If you're deploying for the first time, follow these steps in order:

### Step 1: Prerequisites

- [ ] AWS CLI installed and configured (`aws sts get-caller-identity`)
- [ ] AWS SAM CLI installed (`sam --version`)
- [ ] Python 3.11+ installed
- [ ] Discord Application created (https://discord.com/developers/applications)
- [ ] GitHub Personal Access Token created (with `repo` scope)

### Step 2: Configure Secrets

```bash
cd orchestrator
cp samconfig.toml.example samconfig.toml
```

Edit `samconfig.toml` and replace all `REPLACE_WITH_*` values:

1. **DiscordPublicKey**: 
   - Go to Discord Developer Portal > Your App > General Information
   - Copy "Public Key"

2. **DiscordBotToken**:
   - Go to Discord Developer Portal > Your App > Bot
   - Copy token (click "Reset Token" if you don't have it saved)

3. **GitHubToken**:
   - Go to GitHub Settings > Developer settings > Personal access tokens
   - Create token with `repo`, `workflow` scopes

4. **GitHubWebhookSecret**:
   - Generate a random string: `openssl rand -hex 32`

### Step 3: Deploy to AWS

```bash
cd orchestrator

# Build the SAM application
sam build

# Deploy (first time - will prompt for confirmations)
sam deploy --guided

# For subsequent deployments
sam deploy
```

Save the outputs shown after deployment, especially `DiscordWebhookUrl`.

### Step 4: Configure Discord

1. **Set Interactions Endpoint URL:**
   - Go to Discord Developer Portal > Your App > General Information
   - Paste the `DiscordWebhookUrl` into "Interactions Endpoint URL"
   - Click "Save Changes"
   - Discord should show a green checkmark "Valid"

2. **Register Slash Commands:**
   ```bash
   cd orchestrator
   ./register_discord_commands.sh
   ```
   
   Enter your Discord Application ID and Bot Token when prompted.
   
   Commands to register:
   - `/status` - Show workflow status
   - `/triage` - Auto-diagnose and fix failing PRs
   - `/diagnose` - Run diagnostics
   - `/verify-latest` - Verify latest deployment
   - And more...

3. **Invite Bot to Server:**
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_APP_ID&scope=bot%20applications.commands&permissions=2048
   ```

### Step 5: Test

1. In your Discord server, type `/status`
2. The command should appear in autocomplete
3. Execute it - bot should respond within 3 seconds

If you get "The application did not respond", check CloudWatch Logs:

```bash
aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow
```

## Validation Checklist

Use this checklist to verify your deployment:

- [ ] Lambda function `valine-orchestrator-discord-dev` exists
- [ ] Lambda function `valine-orchestrator-github-dev` exists
- [ ] DynamoDB table `valine-orchestrator-runs-dev` exists
- [ ] CloudFormation stack `valine-orchestrator` shows `CREATE_COMPLETE` or `UPDATE_COMPLETE`
- [ ] `DiscordWebhookUrl` output exists and is accessible
- [ ] Environment variable `DISCORD_PUBLIC_KEY` matches Discord Portal
- [ ] Environment variable `DISCORD_BOT_TOKEN` is set
- [ ] Environment variable `GITHUB_TOKEN` is set
- [ ] Environment variable `GITHUB_REPO` is set to `gcolon75/Project-Valine`
- [ ] Interactions Endpoint URL is set in Discord Developer Portal
- [ ] Discord shows "Valid" (green checkmark) for Interactions Endpoint URL
- [ ] Slash commands are registered (use `./register_discord_commands.sh`)
- [ ] Bot is invited to your Discord server with `bot + applications.commands` scopes
- [ ] `/status` command appears in Discord autocomplete
- [ ] `/status` command responds successfully when executed

## Troubleshooting Commands

```bash
# Check if Lambda functions exist
aws lambda list-functions --query 'Functions[?contains(FunctionName, `valine-orchestrator`)].[FunctionName,Runtime,LastModified]' --output table

# Check Lambda environment variables
aws lambda get-function-configuration \
  --function-name valine-orchestrator-discord-dev \
  --query 'Environment.Variables' \
  --output json

# Check CloudFormation stack status
aws cloudformation describe-stacks \
  --stack-name valine-orchestrator \
  --query 'Stacks[0].[StackStatus,StackStatusReason]' \
  --output table

# Get stack outputs
aws cloudformation describe-stacks \
  --stack-name valine-orchestrator \
  --query 'Stacks[0].Outputs' \
  --output table

# View recent Lambda logs
aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow

# Check DynamoDB table
aws dynamodb describe-table \
  --table-name valine-orchestrator-runs-dev \
  --query 'Table.[TableName,TableStatus,ItemCount]' \
  --output table

# Test Lambda function directly (requires test event JSON)
aws lambda invoke \
  --function-name valine-orchestrator-discord-dev \
  --payload '{"body": "test"}' \
  response.json
```

## Windows-Specific Notes

If you're on Windows using PowerShell or Git Bash:

### PowerShell

```powershell
# Check AWS CLI
aws sts get-caller-identity

# Deploy
cd orchestrator
sam build
sam deploy

# Get outputs
aws cloudformation describe-stacks `
  --stack-name valine-orchestrator `
  --query 'Stacks[0].Outputs' `
  --output table
```

### Git Bash

The bash commands above should work directly in Git Bash.

### WSL (Windows Subsystem for Linux)

Recommended for best compatibility. All bash commands will work natively.

## Getting Help

If you're still having issues after following this guide:

1. **Check CloudWatch Logs:**
   ```bash
   aws logs tail /aws/lambda/valine-orchestrator-discord-dev --since 1h --follow
   ```

2. **Run the validation script:**
   ```bash
   cd orchestrator
   python scripts/validate_deployment.py
   ```

3. **Gather diagnostic information:**
   - CloudFormation stack status
   - Lambda function configuration
   - Environment variables (redact secrets!)
   - CloudWatch Logs (last 10 error messages)
   - Discord Developer Portal screenshots

4. **Create a GitHub Issue:**
   - Include the diagnostic information
   - Describe what you've tried
   - Share any error messages (redact secrets!)

## Additional Resources

- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Full deployment checklist
- [../getting-started/QUICK_START_STAGING.md](../getting-started/QUICK_START_STAGING.md) - Staging environment setup
- [PHASE6_DISCORD_TRIAGE_QUICKSTART.md](../docs/diagnostics/PHASE6_DISCORD_TRIAGE_QUICKSTART.md) - Triage command usage
- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [Discord Interactions Documentation](https://discord.com/developers/docs/interactions/receiving-and-responding)

## Security Notes

⚠️ **IMPORTANT:**

- **Never commit `samconfig.toml` with real secrets to Git**
- It's already in `.gitignore` - keep it that way
- Use AWS Secrets Manager or SSM Parameter Store for production
- Rotate tokens regularly
- Use separate tokens for dev and prod environments
- Limit GitHub token permissions to minimum required (`repo`, `workflow`)

---

**Version:** 1.0  
**Last Updated:** 2025-10-19  
**Status:** ✅ Ready to Use
