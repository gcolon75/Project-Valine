# Quick Fix: "The application did not respond"

## Problem

Discord slash commands appear in autocomplete but when you execute them, you get:
```
The application did not respond
```

## Quick Diagnosis (30 seconds)

Run this command:
```bash
cd orchestrator
python scripts/validate_deployment.py --stage dev
```

This will identify exactly what's wrong.

## Most Common Causes

### 1. Lambda Not Deployed (60% of cases)

**Check:**
```bash
aws lambda list-functions --query 'Functions[?contains(FunctionName, `valine-orchestrator`)].[FunctionName]' --output text
```

**Expected:** Should show `valine-orchestrator-discord-dev`

**Fix if missing:**
```bash
cd orchestrator
cp samconfig.toml.example samconfig.toml
# Edit samconfig.toml with your secrets
sam build
sam deploy
```

### 2. Interactions Endpoint URL Not Set (30% of cases)

**Check:**
1. Go to https://discord.com/developers/applications
2. Select your application
3. Go to "General Information"
4. Look at "Interactions Endpoint URL"

**Expected:** Should be set to your Lambda API Gateway URL

**Fix if missing:**
```bash
# Get the URL
aws cloudformation describe-stacks \
  --stack-name valine-orchestrator \
  --query 'Stacks[0].Outputs[?OutputKey==`DiscordWebhookUrl`].OutputValue' \
  --output text

# Copy the URL and paste it in Discord Developer Portal > General Information > Interactions Endpoint URL
```

### 3. Discord Public Key Mismatch (10% of cases)

**Check:**
```bash
# Get key from Lambda
aws lambda get-function-configuration \
  --function-name valine-orchestrator-discord-dev \
  --query 'Environment.Variables.DISCORD_PUBLIC_KEY' \
  --output text

# Compare with Discord Developer Portal > General Information > Public Key
# They must match EXACTLY
```

**Fix if different:**
```bash
# Update samconfig.toml with correct public key from Discord Portal
# Then redeploy
cd orchestrator
sam build
sam deploy
```

## 5-Minute Full Fix (If Nothing Works)

If you want to start fresh and fix everything:

```bash
# 1. Get your Discord credentials
# - Go to https://discord.com/developers/applications
# - Copy Application ID
# - Copy Public Key (from General Information)
# - Copy Bot Token (from Bot section)

# 2. Get your GitHub token
# - Go to https://github.com/settings/tokens
# - Create token with 'repo' and 'workflow' scopes

# 3. Configure deployment
cd orchestrator
cp samconfig.toml.example samconfig.toml

# 4. Edit samconfig.toml
# Replace ALL "REPLACE_WITH_*" values with actual credentials

# 5. Deploy
sam build
sam deploy

# 6. Get the Discord webhook URL
aws cloudformation describe-stacks \
  --stack-name valine-orchestrator \
  --query 'Stacks[0].Outputs[?OutputKey==`DiscordWebhookUrl`].OutputValue' \
  --output text

# 7. Set Interactions Endpoint URL in Discord Developer Portal
# - Go to https://discord.com/developers/applications
# - Select your application
# - Go to General Information
# - Paste the URL in "Interactions Endpoint URL"
# - Save Changes (Discord will verify with a green checkmark)

# 8. Register commands
./register_discord_commands.sh

# 9. Test in Discord
# Type /status and execute
```

## Verification Steps

After the fix, verify:

1. **Lambda exists:**
   ```bash
   aws lambda list-functions --query 'Functions[?contains(FunctionName, `valine-orchestrator`)].[FunctionName]' --output text
   ```
   Should show: `valine-orchestrator-discord-dev`

2. **Interactions Endpoint is set:**
   - Discord Developer Portal should show green checkmark next to Interactions Endpoint URL

3. **Commands work:**
   - Type `/status` in Discord
   - Should respond within 3 seconds

## Still Not Working?

Check CloudWatch Logs:
```bash
aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow
```

Execute a command in Discord and watch the logs. Common errors:

- **"Invalid request signature"** → Public key mismatch (see cause #3 above)
- **"Missing signature headers"** → Interactions Endpoint URL not set correctly
- **No logs at all** → Request not reaching Lambda (check Interactions Endpoint URL)

## Need More Help?

See detailed troubleshooting guide:
- [DISCORD_DEPLOYMENT_TROUBLESHOOTING.md](./DISCORD_DEPLOYMENT_TROUBLESHOOTING.md)

Or run the validation script for detailed diagnosis:
```bash
python scripts/validate_deployment.py --stage dev --verbose
```

## Windows Users

If you're on Windows:

**PowerShell:**
```powershell
cd orchestrator
sam build
sam deploy

# Get webhook URL
aws cloudformation describe-stacks `
  --stack-name valine-orchestrator `
  --query 'Stacks[0].Outputs[?OutputKey==``DiscordWebhookUrl``].OutputValue' `
  --output text
```

**Git Bash:**
All bash commands above work in Git Bash.

**WSL:**
Recommended - all commands work natively.

---

**Quick Summary:**

1. ✅ Deploy Lambda: `sam build && sam deploy`
2. ✅ Set Interactions Endpoint URL in Discord Portal
3. ✅ Verify Public Key matches
4. ✅ Test: `/status` in Discord

That's it!
