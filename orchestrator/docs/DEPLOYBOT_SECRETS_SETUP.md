# DeployBot Quick Start - Repo Secrets Setup 🔐

> **TL;DR**: Copy-paste guide to get DeployBot auto-deploying your Lambda. Takes 5 mins. No AWS CLI setup required.

## 🎯 What You Need

To enable automated Discord bot deployment, you need these GitHub repository secrets configured:

### Required Secrets

| Secret Name | Description | Where to Get It |
|-------------|-------------|-----------------|
| `STAGING_DISCORD_PUBLIC_KEY` | Discord app public key | Discord Developer Portal → Your App → General Information |
| `STAGING_DISCORD_BOT_TOKEN` | Discord bot token | Discord Developer Portal → Your App → Bot → Reset Token |
| `STAGING_GITHUB_TOKEN` | GitHub PAT or app token | GitHub Settings → Developer Settings → Personal Access Tokens |
| `STAGING_GITHUB_WEBHOOK_SECRET` | Random secure string | Generate with `openssl rand -hex 32` |

### Optional Secrets (For Notifications)

| Secret Name | Description | Recommended? |
|-------------|-------------|--------------|
| `DISCORD_DEPLOY_WEBHOOK` | Discord webhook URL for deploy notifications | ✅ **Preferred** |
| `DISCORD_DEPLOY_CHANNEL_ID` | Discord channel ID for notifications | ⚠️ Fallback if no webhook |
| `FRONTEND_BASE_URL` | Your frontend URL | Optional |
| `VITE_API_BASE` | Your API base URL | Optional |

> **Note**: For notifications, use either:
> - **Webhook** (Recommended): Just set `DISCORD_DEPLOY_WEBHOOK`
> - **Bot Token**: Set `DISCORD_BOT_TOKEN` (already set as `STAGING_DISCORD_BOT_TOKEN`) + `DISCORD_DEPLOY_CHANNEL_ID`

## 🚀 Step-by-Step Setup

### Step 1: Get Discord Credentials

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application (or create one)
3. **Public Key:**
   - Click "General Information"
   - Copy "Public Key"
   - Save as `STAGING_DISCORD_PUBLIC_KEY`
4. **Bot Token:**
   - Click "Bot" in the sidebar
   - Click "Reset Token" (or "Copy" if you have it)
   - Save as `STAGING_DISCORD_BOT_TOKEN`
   - ⚠️ **Keep this secret!** Don't commit it to code.

### Step 2: Generate GitHub Token

1. Go to [GitHub Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a name: `Project Valine Deploy Token`
4. Select scopes:
   - ✅ `repo` (full control)
   - ✅ `workflow` (update workflows)
5. Click "Generate token"
6. Copy the token (you won't see it again!)
7. Save as `STAGING_GITHUB_TOKEN`

### Step 3: Generate Webhook Secret

```bash
# On macOS/Linux
openssl rand -hex 32

# Copy the output and save as STAGING_GITHUB_WEBHOOK_SECRET
```

Or use an online generator: [RandomKeygen](https://randomkeygen.com/)

### Step 4: Add Secrets to GitHub Repo

1. Go to your repo: https://github.com/gcolon75/Project-Valine
2. Click "Settings" → "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Add each secret:

   **Example for `STAGING_DISCORD_PUBLIC_KEY`:**
   - Name: `STAGING_DISCORD_PUBLIC_KEY`
   - Secret: `abc123...xyz` (paste your Discord public key)
   - Click "Add secret"

5. Repeat for all required secrets:
   - `STAGING_DISCORD_PUBLIC_KEY`
   - `STAGING_DISCORD_BOT_TOKEN`
   - `STAGING_GITHUB_TOKEN`
   - `STAGING_GITHUB_WEBHOOK_SECRET`

### Step 5: (Optional) Set Up Deploy Notifications

**Option A: Discord Webhook (Recommended)**

1. In Discord, go to your server
2. Click server name → "Server Settings" → "Integrations"
3. Click "Webhooks" → "New Webhook"
4. Name it "DeployBot"
5. Select the channel for notifications
6. Click "Copy Webhook URL"
7. Add as GitHub secret: `DISCORD_DEPLOY_WEBHOOK`

**Option B: Bot Token + Channel ID**

1. Enable Developer Mode in Discord:
   - User Settings → Advanced → Developer Mode → ON
2. Right-click the channel for notifications
3. Click "Copy Channel ID"
4. Add as GitHub secret: `DISCORD_DEPLOY_CHANNEL_ID`
5. Bot token already set as `STAGING_DISCORD_BOT_TOKEN`

### Step 6: Verify AWS OIDC Role

DeployBot uses AWS OIDC for authentication (no AWS keys needed!).

**Check the role exists:**
```bash
aws iam get-role --role-name ProjectValine-GitHubDeployRole
```

**Role ARN:** `arn:aws:iam::579939802800:role/ProjectValine-GitHubDeployRole`  
**Region:** `us-west-2`

If the role doesn't exist or needs setup, ask your AWS admin to create it with:
- **Trust policy:** Allows GitHub Actions from `gcolon75/Project-Valine`
- **Permissions:**
  - `AWSLambda_FullAccess` (or Lambda create/update)
  - `AmazonS3FullAccess` (or SAM bucket access)
  - `CloudFormationFullAccess` (or stack operations)
  - `IAMFullAccess` (or role creation for Lambda execution)

## ✅ Verification

### Test Preflight Workflow

1. Go to GitHub Actions: https://github.com/gcolon75/Project-Valine/actions
2. Click "Preflight Orchestrator Deploy"
3. Click "Run workflow"
4. Select environment: `staging`
5. Click "Run workflow"

**Expected Result:**
- ✅ SAM template validation passes
- ✅ Discord notification test passes
- ✅ Configuration check shows correct values
- ✅ S3 bucket check completes (may warn if bucket doesn't exist yet, which is OK)

### Test Full Deploy

1. Make a small change in `orchestrator/` (e.g., add a comment)
2. Commit and push to `main` branch
3. Watch GitHub Actions: https://github.com/gcolon75/Project-Valine/actions
4. Check Discord for deploy notifications

**Expected Result:**
- ✅ Deploy starts (Discord notification)
- ✅ SAM build completes
- ✅ SAM deploy completes
- ✅ Health check passes
- ✅ Deploy success (Discord notification)

## 🛠️ Troubleshooting

### "Secret not found" Error

**Fix:** Make sure secret names are EXACT:
- `STAGING_DISCORD_PUBLIC_KEY` (not `DISCORD_PUBLIC_KEY`)
- `STAGING_DISCORD_BOT_TOKEN` (not `DISCORD_BOT_TOKEN`)
- Check for typos in GitHub Secrets page

### "Invalid Discord Public Key" Error

**Fix:** 
1. Double-check you copied the **Public Key** (not Application ID)
2. Make sure there are no extra spaces or newlines
3. Re-copy from Discord Developer Portal

### "GitHub Actions doesn't have permission"

**Fix:**
1. Check AWS OIDC role exists: `ProjectValine-GitHubDeployRole`
2. Verify trust policy allows GitHub Actions
3. Verify role has Lambda, S3, CloudFormation permissions

### "Discord notification failed"

**For Webhook:**
- Check webhook URL is valid
- Make sure webhook isn't deleted in Discord
- Test manually:
  ```bash
  curl -X POST "YOUR_WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d '{"content": "Test from DeployBot"}'
  ```

**For Bot Token + Channel:**
- Check bot is in the server
- Check bot has permission to post in the channel
- Check channel ID is correct (enable Developer Mode to copy ID)

## 📚 Next Steps

Once secrets are configured:

1. **Run Preflight Check** to validate everything works
2. **Test Deploy** by pushing a small change
3. **Monitor Discord** for notifications
4. **Check [AWS Auto-Deployer Guide](AWS_AUTO_DEPLOYER.md)** for daily usage

## 🎮 Pro Tips

- **Store secrets in password manager**: 1Password, Bitwarden, etc.
- **Rotate tokens quarterly**: Generate new tokens every 3 months
- **Use webhook for notifications**: Faster and simpler than bot token
- **Test preflight first**: Don't waste time on broken deploys
- **Keep AWS role minimal**: Only grant permissions DeployBot needs

**Questions?** Check [AWS Auto-Deployer](AWS_AUTO_DEPLOYER.md) or [Lambda Deploy Recovery](LAMBDA_DEPLOY_RECOVERY.md)

**Status:** Ready to raid! 🎯
