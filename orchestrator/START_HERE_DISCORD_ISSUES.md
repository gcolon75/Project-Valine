# 🚨 Discord Commands Not Working? START HERE 🚨

## Quick Problem Identifier

**Select the issue that matches your situation:**

### 1. "The application did not respond" ⚠️
**Symptoms:** Commands appear in autocomplete, but don't respond when executed

**Quick Action:**
```bash
cd orchestrator
python scripts/validate_deployment.py --stage dev
```

**Resources:**
- 🚀 **Quick Fix (5 min):** [DISCORD_NO_RESPONSE_QUICKFIX.md](./DISCORD_NO_RESPONSE_QUICKFIX.md)
- 📚 **Detailed Guide:** [DISCORD_DEPLOYMENT_TROUBLESHOOTING.md](./DISCORD_DEPLOYMENT_TROUBLESHOOTING.md)

---

### 2. Commands Don't Appear in Discord 🔍
**Symptoms:** Slash commands not showing in autocomplete when you type `/`

**Quick Action:**
```bash
cd orchestrator
./register_discord_commands.sh
# Wait 60 seconds, then refresh Discord (Ctrl+R)
```

**Common Cause:** Bot invited without `applications.commands` scope

**Fix:** Re-invite bot with correct scopes:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_APP_ID&scope=bot%20applications.commands&permissions=2048
```

**Resource:** [DISCORD_STAGING_SETUP.md](./DISCORD_STAGING_SETUP.md)

---

### 3. First Time Deploying 🎯
**Symptoms:** Haven't deployed Lambda functions yet, starting from scratch

**Quick Action:** Follow the step-by-step deployment guide

**Resource:** [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

---

### 4. Commands Execute but Fail ❌
**Symptoms:** Commands respond but return errors like "Missing GITHUB_TOKEN"

**Quick Action:**
```bash
# Check environment variables
aws lambda get-function-configuration \
  --function-name valine-orchestrator-discord-dev \
  --query 'Environment.Variables'
```

**Resource:** [DISCORD_DEPLOYMENT_TROUBLESHOOTING.md](./DISCORD_DEPLOYMENT_TROUBLESHOOTING.md) - Section 4

---

### 5. Not Sure What's Wrong 🤔
**Symptoms:** Something's broken but not sure what

**Quick Action:** Run the automated diagnostic
```bash
cd orchestrator
python scripts/validate_deployment.py --stage dev --verbose
```

This will check everything and tell you exactly what needs to be fixed.

**Resource:** [DISCORD_TROUBLESHOOTING_README.md](./DISCORD_TROUBLESHOOTING_README.md)

---

## Documentation Map

### 🎯 Quick Reference (Pick One)

| Your Situation | Document | Time |
|----------------|----------|------|
| Commands don't respond | [DISCORD_NO_RESPONSE_QUICKFIX.md](./DISCORD_NO_RESPONSE_QUICKFIX.md) | 5 min |
| Need detailed troubleshooting | [DISCORD_DEPLOYMENT_TROUBLESHOOTING.md](./DISCORD_DEPLOYMENT_TROUBLESHOOTING.md) | 15-30 min |
| First time deploying | [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) | 30-60 min |
| Need all troubleshooting docs | [DISCORD_TROUBLESHOOTING_README.md](./DISCORD_TROUBLESHOOTING_README.md) | 5 min |
| Want to understand what was fixed | [../DISCORD_SLASH_COMMANDS_DEPLOYMENT_FIX.md](../DISCORD_SLASH_COMMANDS_DEPLOYMENT_FIX.md) | 10 min |

---

## Top 3 Most Common Issues

### #1: Lambda Not Deployed (60% of cases)
**Check:**
```bash
aws lambda list-functions --query 'Functions[?contains(FunctionName, `valine-orchestrator`)]'
```

**Fix if missing:**
```bash
cd orchestrator
cp samconfig.toml.example samconfig.toml
# Edit samconfig.toml with your credentials
sam build
sam deploy
```

### #2: Interactions Endpoint URL Not Set (30% of cases)
**Check:** Discord Developer Portal > Your App > General Information > Interactions Endpoint URL

**Fix if missing:**
```bash
# Get the URL
aws cloudformation describe-stacks \
  --stack-name valine-orchestrator \
  --query 'Stacks[0].Outputs[?OutputKey==`DiscordWebhookUrl`].OutputValue' \
  --output text

# Set it in Discord Developer Portal
```

### #3: Discord Public Key Mismatch (10% of cases)
**Check:**
```bash
# Get from Lambda
aws lambda get-function-configuration \
  --function-name valine-orchestrator-discord-dev \
  --query 'Environment.Variables.DISCORD_PUBLIC_KEY'

# Compare with Discord Portal > General Information > Public Key
```

**Fix if different:** Update `samconfig.toml` and redeploy

---

## Tools & Scripts

### Automated Validation
```bash
cd orchestrator
python scripts/validate_deployment.py --stage dev
```
Checks everything and provides specific fixes.

### Command Registration
```bash
cd orchestrator
./register_discord_commands.sh
```
Registers all slash commands with Discord.

### View Logs
```bash
aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow
```
Watch real-time Lambda execution logs.

---

## Getting Help

Still stuck? Here's how to get help:

1. **Run diagnostics:**
   ```bash
   python scripts/validate_deployment.py --stage dev --verbose
   ```

2. **Check CloudWatch Logs:**
   ```bash
   aws logs tail /aws/lambda/valine-orchestrator-discord-dev --since 1h
   ```

3. **Create GitHub Issue:**
   - Include validation script output
   - Include relevant logs (redact secrets!)
   - Describe what you tried

---

## Quick Commands Reference

```bash
# Validate deployment
cd orchestrator && python scripts/validate_deployment.py --stage dev

# Deploy/Redeploy
cd orchestrator && sam build && sam deploy

# Register commands
cd orchestrator && ./register_discord_commands.sh

# View logs
aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow

# Check Lambda exists
aws lambda list-functions --query 'Functions[?contains(FunctionName, `valine-orchestrator`)]'

# Get webhook URL
aws cloudformation describe-stacks \
  --stack-name valine-orchestrator \
  --query 'Stacks[0].Outputs[?OutputKey==`DiscordWebhookUrl`].OutputValue' \
  --output text
```

---

## Success Checklist

Before asking for help, verify:

- [ ] Lambda function `valine-orchestrator-discord-dev` exists
- [ ] Interactions Endpoint URL set in Discord Portal (shows green checkmark)
- [ ] Public Key matches between Lambda and Discord Portal
- [ ] Commands registered via `./register_discord_commands.sh`
- [ ] Bot invited with `bot + applications.commands` scopes
- [ ] `/status` command appears in Discord autocomplete

If all checked and still not working, run the validation script and follow its recommendations.

---

**Last Updated:** 2025-10-19  
**Status:** ✅ Ready to Use  
**Quick Question?** Check [DISCORD_TROUBLESHOOTING_README.md](./DISCORD_TROUBLESHOOTING_README.md)
