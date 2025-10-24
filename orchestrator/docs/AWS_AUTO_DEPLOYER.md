# AWS Auto-Deployer - DeployBot 🚀

> **TL;DR**: Push code → DeployBot speedruns to Lambda for you. Zero hassle, no AWS keys, just vibes. 💯

## What is DeployBot?

DeployBot (aka "Cloud Raid Leader") is your automated AWS deployment system that handles all the boring stuff so you don't have to. It's like having a pro speedrunner deploy your Discord bot to Lambda - fast, reliable, and fully automated.

## ✨ Features

- 🤖 **Fully Automated**: Push to main → Auto-deploys to AWS Lambda
- 🔐 **Zero Manual Setup**: Uses GitHub Actions secrets, never asks for AWS keys
- 🎯 **Repeatable Deploys**: Uses same config as last successful deploy
- 🏥 **Health Checks**: Validates deployment before marking as complete
- 💬 **Discord Notifications**: Posts deploy status to your Discord channel
- 🛠️ **Gamer-Style Errors**: Clear, actionable error messages with next steps
- ⚡ **Cache-Busting**: Forces fresh Lambda artifacts every deploy (no stale code issues)

## 🎮 How It Works

### The Happy Path (Auto-Deploy)

1. **You:** Merge code to `main` branch
2. **DeployBot:** "Yo, I got this! 🎮"
   - Builds Lambda package with `sam build`
   - Deploys to AWS with `sam deploy` (all params from last successful deploy)
   - Validates health with endpoint tests
   - Posts success message to Discord
3. **You:** Chill while Lambda goes live ✅

### The Sad Path (Deploy Failed)

1. **DeployBot:** "Oof, hit a wall! 💀"
   - Posts error details to Discord with troubleshooting steps
   - Adds GitHub Actions summary with recovery options
   - Links to CloudWatch logs for debugging
2. **You:** Follow the recovery guide (usually 5 minutes to fix)

## 🚀 Quick Start

### First-Time Setup (One-Time Only)

1. **Set up GitHub secrets** (in repository settings):
   ```
   AWS_ACCESS_KEY_ID              # Not needed if using OIDC (we use OIDC)
   AWS_SECRET_ACCESS_KEY          # Not needed if using OIDC (we use OIDC)
   STAGING_DISCORD_PUBLIC_KEY     # From Discord Developer Portal
   STAGING_DISCORD_BOT_TOKEN      # From Discord Developer Portal
   STAGING_GITHUB_TOKEN           # GitHub PAT or app token
   STAGING_GITHUB_WEBHOOK_SECRET  # Random secure string
   FRONTEND_BASE_URL              # Your frontend URL
   VITE_API_BASE                  # Your API base URL
   DISCORD_DEPLOY_CHANNEL_ID      # (Optional) Discord channel for notifications
   DISCORD_DEPLOY_WEBHOOK         # (Optional) Discord webhook URL for notifications
   ```

> **Note**: For Discord notifications, you can use either:
> - **Webhook** (Recommended): Set `DISCORD_DEPLOY_WEBHOOK`
> - **Bot Token**: Set both `DISCORD_BOT_TOKEN` + `DISCORD_DEPLOY_CHANNEL_ID`

2. **Configure AWS OIDC** (we already did this):
   - GitHub role: `arn:aws:iam::579939802800:role/ProjectValine-GitHubDeployRole`
   - Region: `us-west-2`
   - Trust policy allows GitHub Actions to assume role

3. **That's it!** 🎉 DeployBot is ready to raid.

### Daily Usage

**Auto-Deploy (Recommended):**
```bash
# Just merge to main - DeployBot handles the rest
git checkout main
git merge your-feature-branch
git push origin main
# ✅ Watch GitHub Actions for deploy progress
# ✅ Get Discord notification when done
```

**Manual Deploy (If You Want Control):**
```bash
cd orchestrator
sam build
sam deploy --guided  # Follow prompts
```

**Trigger Deploy Manually:**
```
# Go to GitHub Actions → Deploy Orchestrator → Run workflow
```

**Run Preflight Check (Before Deploy):**
```
# Go to GitHub Actions → Preflight Orchestrator Deploy → Run workflow
# Select environment (staging/prod)
# ✅ Validates SAM template
# ✅ Tests Discord notifications
# ✅ Checks S3 bucket and config
# ✅ Creates audit report
```

## 📊 Monitoring Deploys

### GitHub Actions Summary

After each deploy, check the GitHub Actions run summary:
- ✅ Build status
- ✅ Lambda function info (size, last modified, S3 location)
- ✅ Endpoint URLs
- ✅ Health check results

### Discord Notifications

DeployBot posts to your Discord channel:
- 🔄 **Started**: "Speedrunning Lambda deploy to AWS..."
- ✅ **Success**: "Deploy COMPLETE! Lambda is live and ready to raid!"
- ❌ **Failed**: "Deploy FAILED! Here's what to check..."

### CloudWatch Logs

Lambda execution logs: [CloudWatch Console](https://console.aws.amazon.com/cloudwatch/home?region=us-west-2#logsV2:log-groups)

## 🛠️ Troubleshooting

### Deploy Failed - What Now?

**Error: S3 bucket not found**
```bash
# Create an S3 bucket for SAM artifacts
aws s3 mb s3://your-sam-bucket-name --region us-west-2
# Update samconfig.toml with bucket name
```

**Error: IAM permission denied**
```bash
# Check GitHub deploy role has permissions:
# - AWSLambda_FullAccess
# - AmazonS3FullAccess
# - AWSCloudFormationFullAccess
# Contact AWS admin to update role
```

**Error: Lambda deployment successful but bot not responding**
```bash
# Force fresh deploy with cache clearing
cd orchestrator
rm -rf .aws-sam/
sam build --use-container --force
sam deploy --force-upload
```

**Error: Health check failed (500/502/503)**
```bash
# Check CloudWatch logs for Lambda errors
aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow

# Validate deployment
python scripts/validate_deployment.py --stage dev
```

### Full Recovery Guide

For comprehensive troubleshooting steps, see:
- [orchestrator/docs/LAMBDA_DEPLOY_RECOVERY.md](../docs/LAMBDA_DEPLOY_RECOVERY.md)

### Emergency Manual Deploy

If automation is broken, you can always deploy manually:
```bash
cd orchestrator
sam deploy --guided
# Answer the prompts with your config values
```

## 🎯 Under the Hood

### Cache-Busting Mechanism

Every deploy generates a `.deploy-stamp` file with:
- Current timestamp
- GitHub Actions build ID
- Commit SHA

This forces S3 to accept new artifacts even if code structure is identical, preventing Lambda from loading stale cached packages.

**Script:** `scripts/generate-deploy-stamp.sh`

### Health Check System

After deploy, DeployBot sends a Discord PING request to validate:
- Lambda is reachable (200/401 response OK)
- Not crashed (500/502/503 = bad)
- Proper error handling (expects signature validation error)

**Script:** `scripts/test-discord-endpoint.sh`

### Notification System

Posts Discord embeds with:
- Deploy status (started/success/failure)
- Commit info
- Endpoint URLs
- Troubleshooting guidance
- Links to logs and docs

**Script:** `scripts/notify-deploy-status.sh`

## 🔄 Workflow Configuration

DeployBot includes two main workflows:

### 1. Automated Deploy Workflow
`.github/workflows/deploy-orchestrator.yml`

**Triggers:**
- Push to `main` branch (when `orchestrator/**` files change)
- Manual workflow dispatch (from GitHub Actions UI)

**Steps:**
1. **Preflight Validation**: Runs `sam validate` on template.yaml
2. **Discord Notification Test**: Tests webhook or bot token
3. **SAM Build**: Builds Lambda package
4. **SAM Deploy**: Deploys with non-interactive flags (--no-confirm-changeset)
5. **Health Check**: Verifies Lambda endpoints are live
6. **Discord Notification**: Posts success/failure to Discord
7. **Audit Trail**: Creates artifact with deploy metadata

### 2. Preflight Check Workflow
`.github/workflows/preflight-orchestrator.yml`

**Triggers:**
- Manual workflow dispatch only (for validation before deploy)

**Steps:**
1. **SAM Template Validation**: Checks template.yaml syntax and resources
2. **Discord Notification Test**: Validates webhook or bot token works
3. **Configuration Check**: Reads samconfig.toml parameters
4. **S3 Bucket Check**: Verifies S3 bucket exists or can be created
5. **Audit Report**: Creates artifact summarizing preflight results

**Repeatable Configuration:**
All deploy parameters are stored in:
- `orchestrator/samconfig.toml` (stack name, region, S3 bucket)
- GitHub Actions secrets (environment variables, tokens)
- `orchestrator/template.yaml` (CloudFormation parameters)

This ensures every deploy uses the same config as the last successful deploy unless you explicitly change it.

## 📚 Additional Resources

- [Orchestrator README](../README.md) - Bot architecture and features
- [Integration Guide](../INTEGRATION_GUIDE.md) - Discord and GitHub setup
- [Lambda Deploy Recovery](../docs/LAMBDA_DEPLOY_RECOVERY.md) - Troubleshooting guide
- [SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/) - AWS SAM reference

## 💡 Pro Tips

1. **Watch the logs**: GitHub Actions output shows exactly what's happening
2. **Discord first**: Check Discord notifications for quick status updates
3. **Don't panic**: Failed deploys are usually quick fixes (5-10 minutes)
4. **Manual deploys are OK**: `sam deploy --guided` is always there if you need it
5. **Ask for help**: Drop a message in Discord if you're stuck

## 🎮 Philosophy

DeployBot follows the "speedrun deployment" philosophy:
- **Zero friction**: No manual AWS setup, ever
- **Fast feedback**: Know within minutes if deploy worked
- **Clear guidance**: Every error has next steps
- **Repeatable**: Same config every time
- **Safe**: All credentials in GitHub secrets, never exposed

---

**Questions?** Check the [Orchestrator README](../README.md) or ask in Discord. DeployBot has your back! 💪
