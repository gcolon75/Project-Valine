# DeployBot Quick Start 🚀

## Enable Discord Notifications (Optional)

To get Discord notifications for deploy status, add this secret to your GitHub repository:

### Step 1: Get Discord Channel ID

1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click your target channel → Copy ID
3. Save this Channel ID for the next step

### Step 2: Add GitHub Secret

1. Go to: `https://github.com/gcolon75/Project-Valine/settings/secrets/actions`
2. Click "New repository secret"
3. Name: `DISCORD_DEPLOY_CHANNEL_ID`
4. Value: (paste the Channel ID from Step 1)
5. Click "Add secret"

### Step 3: Test It

Test the notification system locally (optional):
```bash
cd orchestrator
export DISCORD_BOT_TOKEN="your-bot-token"
export DISCORD_CHANNEL_ID="your-channel-id"
./scripts/test-discord-notification.sh
```

Or trigger a deploy:
```bash
# Option 1: Push to main
git push origin main

# Option 2: Manual workflow trigger
# Go to GitHub Actions → Deploy Orchestrator → Run workflow
```

Check your Discord channel for the notification! 🎉

---

## Deploy Commands Cheat Sheet

### Auto-Deploy (Recommended)
```bash
git push origin main  # DeployBot does everything!
```

### Manual Deploy
```bash
cd orchestrator
sam build
sam deploy  # Uses config from samconfig.toml
```

### Manual Deploy with Guided Setup
```bash
cd orchestrator
sam deploy --guided  # Interactive prompts
```

### Emergency Recovery
```bash
cd orchestrator
rm -rf .aws-sam/
sam build --use-container --force
sam deploy --force-upload
```

---

## Troubleshooting

**Deploy not triggering?**
- Check that your changes are in `orchestrator/**` directory
- Verify workflow file is on the main branch

**No Discord notification?**
- Verify `DISCORD_DEPLOY_CHANNEL_ID` secret is set
- Check bot has permission to post in that channel
- Notifications are optional - deploy works without them!

**Deploy failed?**
- Check GitHub Actions summary for troubleshooting steps
- See [AWS_AUTO_DEPLOYER.md](AWS_AUTO_DEPLOYER.md) for full recovery guide
- Check [LAMBDA_DEPLOY_RECOVERY.md](LAMBDA_DEPLOY_RECOVERY.md) for emergency fixes

---

## Configuration Files

**Stack Name & Region:**
- `orchestrator/samconfig.toml`

**Lambda Functions:**
- `orchestrator/template.yaml`

**GitHub Secrets Required:**
- `STAGING_DISCORD_PUBLIC_KEY`
- `STAGING_DISCORD_BOT_TOKEN`
- `STAGING_GITHUB_TOKEN`
- `STAGING_GITHUB_WEBHOOK_SECRET`
- `FRONTEND_BASE_URL`
- `VITE_API_BASE`

**Optional Secrets:**
- `DISCORD_DEPLOY_CHANNEL_ID` (for Discord notifications)

---

## What Gets Deployed

**Lambda Functions:**
1. `valine-orchestrator-discord-dev` - Discord slash commands handler
2. `valine-orchestrator-github-dev` - GitHub webhook handler

**API Gateway:**
- Endpoint: `https://{api-id}.execute-api.us-west-2.amazonaws.com/dev`
- Paths: `/discord`, `/github/webhook`

**DynamoDB:**
- Table: `valine-orchestrator-runs-dev`

---

Need more help? See [AWS_AUTO_DEPLOYER.md](AWS_AUTO_DEPLOYER.md) for the full guide! 📚
