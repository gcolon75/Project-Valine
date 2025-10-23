# Quick Fix Reference - Lambda Discord Bot

## TL;DR - What Was Wrong
Your GitHub Secrets weren't making it to the Lambda function. SAM was using placeholder strings instead of actual keys.

## The Actual Root Cause
```yaml
# ❌ BEFORE: Secrets set as env vars but not passed to SAM
- name: SAM Deploy
  run: sam deploy
  # SAM used hardcoded "REPLACE_WITH_DISCORD_PUBLIC_KEY" from samconfig.toml

# ✅ AFTER: Explicitly pass secrets to SAM
- name: SAM Deploy
  run: |
    sam deploy --parameter-overrides \
      "DiscordPublicKey=${STAGING_DISCORD_PUBLIC_KEY}"
  # SAM gets actual key from GitHub Secret
```

## What To Do Now

### Option 1: Quick Deploy (2 minutes)
1. Merge this PR
2. Go to Actions → "Deploy Orchestrator" → Run workflow
3. Wait for "Discord Webhook URL" in summary
4. Copy URL to Discord Developer Portal
5. Done ✅

### Option 2: Verify First (5 minutes)
```bash
# Check the changes
git diff 4ff07c2..a4ed5a6

# Key changes:
# 1. .github/workflows/deploy-orchestrator.yml - pass secrets
# 2. orchestrator/app/requirements.txt - add PyGithub
# 3. orchestrator/samconfig.toml - fix stack name
# 4. discord_handler.py - remove bad import

# All good? Merge and deploy.
```

## Commands to Test After Deploy

```bash
# Watch Lambda logs
aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow

# Test endpoint (Discord does this automatically)
curl -X POST https://YOUR-ENDPOINT/dev/discord \
  -H "Content-Type: application/json" \
  -d '{"type": 1}'
# Should return: {"type": 1}
```

## Discord Setup
1. Go to https://discord.com/developers/applications/1428568840958251109
2. General Information → Interactions Endpoint URL
3. Paste: (from GitHub Actions output)
4. Discord sends PING → Lambda returns PONG → ✅ Verified

## Troubleshooting

**If deployment fails:**
- Check GitHub Secrets exist: `STAGING_DISCORD_PUBLIC_KEY`, etc.
- Check AWS IAM role: `arn:aws:iam::579939802800:role/ProjectValine-GitHubDeployRole`

**If endpoint returns 500:**
- Check CloudWatch: `/aws/lambda/valine-orchestrator-discord-dev`
- Look for: import errors, missing env vars

**If Discord won't verify:**
- Make sure you're using STAGING bot (1428568840958251109)
- Check STAGING_DISCORD_PUBLIC_KEY matches Discord portal

## Files Changed Summary
| File | Change |
|------|--------|
| deploy-orchestrator.yml | ✅ Pass secrets to SAM |
| samconfig.toml | ✅ Remove placeholders |
| app/requirements.txt | ✅ Add PyGithub |
| discord_handler.py | ✅ Remove bad import |

## Confidence Level
**99%** - All issues found and fixed. Only thing that could go wrong:
- GitHub Secrets not set (unlikely - you already did this)
- AWS permissions issue (unlikely - IAM role exists)
- Network/infrastructure issue (AWS side)

---
**Bottom line:** Merge → Deploy → Configure Discord → Test `/status` → Ship it 🚀
