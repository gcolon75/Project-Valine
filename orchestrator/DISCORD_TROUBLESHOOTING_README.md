# Discord Slash Commands - Troubleshooting Documentation

This directory contains comprehensive troubleshooting resources for Discord slash command deployment and configuration issues.

## Problem: "The application did not respond"

If your Discord slash commands are registered but don't respond when executed, you're in the right place.

## Quick Start (Pick Your Path)

### 🚀 Path 1: Automated Diagnosis (Recommended)

Run the validation script to automatically check your deployment:

```bash
cd orchestrator
python scripts/validate_deployment.py --stage dev
```

This will check:
- ✅ AWS CLI and credentials
- ✅ CloudFormation stack status
- ✅ Lambda functions exist and are configured
- ✅ Environment variables are set
- ✅ DynamoDB table exists
- ✅ Provides specific fix instructions

### ⚡ Path 2: Quick Fix (5 minutes)

Follow the quick fix guide for the most common issues:

📖 [DISCORD_NO_RESPONSE_QUICKFIX.md](./DISCORD_NO_RESPONSE_QUICKFIX.md)

Covers:
- Lambda not deployed (60% of cases)
- Interactions Endpoint URL not set (30% of cases)
- Discord Public Key mismatch (10% of cases)
- Step-by-step 5-minute full fix

### 📚 Path 3: Detailed Troubleshooting

For complex issues or detailed diagnosis:

📖 [DISCORD_DEPLOYMENT_TROUBLESHOOTING.md](./DISCORD_DEPLOYMENT_TROUBLESHOOTING.md)

Comprehensive guide covering:
- All root cause diagnostics
- Step-by-step fixes for each issue
- Complete deployment guide
- Validation checklist
- Windows-specific instructions
- Security notes

## Documentation Map

### For Deployment Issues

| Document | Use When | Time Required |
|----------|----------|---------------|
| [DISCORD_NO_RESPONSE_QUICKFIX.md](./DISCORD_NO_RESPONSE_QUICKFIX.md) | Commands don't respond | 5 minutes |
| [DISCORD_DEPLOYMENT_TROUBLESHOOTING.md](./DISCORD_DEPLOYMENT_TROUBLESHOOTING.md) | Detailed diagnosis needed | 15-30 minutes |
| [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) | First-time deployment | 30-60 minutes |
| `scripts/validate_deployment.py` | Automated diagnosis | 30 seconds |

### For Configuration Issues

| Document | Use When | Time Required |
|----------|----------|---------------|
| [DISCORD_STAGING_SETUP.md](./DISCORD_STAGING_SETUP.md) | Setting up staging environment | 15 minutes |
| [QUICK_START_STAGING.md](./QUICK_START_STAGING.md) | Quick staging setup | 10 minutes |
| [README.md](./README.md) | Understanding architecture | 10 minutes |

### For Command-Specific Issues

| Document | Use When | Time Required |
|----------|----------|---------------|
| [../docs/diagnostics/PHASE6_DISCORD_TRIAGE_QUICKSTART.md](../docs/diagnostics/PHASE6_DISCORD_TRIAGE_QUICKSTART.md) | Using /triage command | 5 minutes |
| [TRIAGE_COMMAND_REFERENCE.md](./TRIAGE_COMMAND_REFERENCE.md) | Triage command details | 10 minutes |
| [DISCORD_SLASH_CMD_QUICK_REF.md](./DISCORD_SLASH_CMD_QUICK_REF.md) | All slash commands | 5 minutes |

## Most Common Issues

### 1. "The application did not respond" ⚠️

**Symptoms:** Commands appear in autocomplete but don't respond when executed

**Quick Fix:**
```bash
# Run validation
cd orchestrator
python scripts/validate_deployment.py --stage dev

# Follow the specific fixes it recommends
```

**Detailed Guide:** [DISCORD_NO_RESPONSE_QUICKFIX.md](./DISCORD_NO_RESPONSE_QUICKFIX.md)

### 2. Commands Don't Appear in Discord 🔍

**Symptoms:** Slash commands not showing in autocomplete

**Quick Fix:**
```bash
# Register commands
cd orchestrator
./register_discord_commands.sh

# Wait 60 seconds, then refresh Discord (Ctrl+R)
```

**Common Cause:** Bot invited without `applications.commands` scope

**Fix:** Re-invite bot:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_APP_ID&scope=bot%20applications.commands&permissions=2048
```

### 3. "Invalid request signature" Error 🔐

**Symptoms:** CloudWatch Logs show signature verification errors

**Quick Fix:**
```bash
# Get Discord Public Key from Developer Portal
# Compare with Lambda environment variable
aws lambda get-function-configuration \
  --function-name valine-orchestrator-discord-dev \
  --query 'Environment.Variables.DISCORD_PUBLIC_KEY'

# If different, update samconfig.toml and redeploy
sam build && sam deploy
```

### 4. Lambda Not Deployed 🚀

**Symptoms:** No Lambda functions exist, validation script fails

**Quick Fix:**
```bash
cd orchestrator
cp samconfig.toml.example samconfig.toml
# Edit samconfig.toml with your credentials
sam build
sam deploy
```

### 5. Missing Environment Variables ⚙️

**Symptoms:** Commands execute but fail with "token not configured" errors

**Quick Fix:**
```bash
# Check current variables
aws lambda get-function-configuration \
  --function-name valine-orchestrator-discord-dev \
  --query 'Environment.Variables'

# Update if missing
# See DISCORD_DEPLOYMENT_TROUBLESHOOTING.md section 4
```

## Diagnostic Tools

### 1. Validation Script

Automated checking of all deployment requirements:

```bash
cd orchestrator
python scripts/validate_deployment.py --stage dev --verbose
```

Output:
- ✅ PASS / ❌ FAIL / ⚠️ WARN for each check
- Specific error messages
- Recommended fixes

### 2. CloudWatch Logs

Real-time Lambda execution logs:

```bash
# Watch logs in real-time
aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow

# Execute a command in Discord and watch the logs
```

Common log patterns:
- `"Invalid request signature"` → Public Key mismatch
- `"Missing signature headers"` → Interactions Endpoint URL issue
- `"GITHUB_TOKEN not configured"` → Environment variable missing
- No logs at all → Request not reaching Lambda

### 3. Discord Developer Portal

Manual verification:

1. Go to https://discord.com/developers/applications
2. Select your application
3. Check "General Information":
   - ✅ Interactions Endpoint URL is set
   - ✅ Shows green checkmark "Valid"
   - ✅ Public Key matches Lambda environment

### 4. AWS CloudFormation

Check deployment status:

```bash
aws cloudformation describe-stacks \
  --stack-name valine-orchestrator \
  --query 'Stacks[0].[StackStatus,Outputs]'
```

Expected:
- Status: `CREATE_COMPLETE` or `UPDATE_COMPLETE`
- Outputs: `DiscordWebhookUrl`, `GitHubWebhookUrl`

## Support Resources

### Documentation

- 📖 [Quick Fix Guide](./DISCORD_NO_RESPONSE_QUICKFIX.md) - 5 minutes
- 📖 [Detailed Troubleshooting](./DISCORD_DEPLOYMENT_TROUBLESHOOTING.md) - Comprehensive
- 📖 [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md) - Step-by-step
- 📖 [Main README](./README.md) - Architecture overview

### Tools

- 🔧 `scripts/validate_deployment.py` - Automated validation
- 🔧 `register_discord_commands.sh` - Command registration
- 🔧 `diagnose_discord_commands.sh` - Command diagnostics
- 🔧 `deploy.sh` - Deployment script

### External Resources

- [Discord Developer Portal](https://discord.com/developers/applications)
- [Discord Interactions Documentation](https://discord.com/developers/docs/interactions/receiving-and-responding)
- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)
- [AWS Lambda Logs](https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups)

## Getting Help

If you're still stuck after trying the guides:

1. **Run diagnostics:**
   ```bash
   python scripts/validate_deployment.py --stage dev --verbose
   ```

2. **Collect logs:**
   ```bash
   aws logs tail /aws/lambda/valine-orchestrator-discord-dev --since 1h > logs.txt
   ```

3. **Create GitHub Issue:**
   - Include validation script output
   - Include relevant CloudWatch Logs (redact secrets!)
   - Describe what you tried
   - Share Discord Developer Portal screenshots

## Security Reminders

⚠️ **When sharing logs or asking for help:**

- **Redact all tokens and secrets**
- Never share `DISCORD_BOT_TOKEN`
- Never share `GITHUB_TOKEN`
- Never share `DISCORD_PUBLIC_KEY` (though less sensitive)
- Validation script automatically redacts sensitive values

## Quick Reference

### Essential Commands

```bash
# Validate deployment
python scripts/validate_deployment.py --stage dev

# Deploy/Redeploy
cd orchestrator && sam build && sam deploy

# Check Lambda exists
aws lambda list-functions --query 'Functions[?contains(FunctionName, `valine-orchestrator`)]'

# View logs
aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow

# Get webhook URL
aws cloudformation describe-stacks \
  --stack-name valine-orchestrator \
  --query 'Stacks[0].Outputs[?OutputKey==`DiscordWebhookUrl`].OutputValue' \
  --output text

# Register commands
./register_discord_commands.sh
```

### Success Checklist

- [ ] `sam build && sam deploy` succeeds
- [ ] Lambda function `valine-orchestrator-discord-dev` exists
- [ ] Interactions Endpoint URL set in Discord Portal (green checkmark)
- [ ] Public Key matches between Lambda and Discord Portal
- [ ] Commands registered via `./register_discord_commands.sh`
- [ ] Bot invited with `bot + applications.commands` scopes
- [ ] `/status` command appears in Discord autocomplete
- [ ] `/status` command responds successfully

---

**Last Updated:** 2025-10-19  
**Status:** ✅ Ready to Use  
**Feedback:** Open an issue or PR
