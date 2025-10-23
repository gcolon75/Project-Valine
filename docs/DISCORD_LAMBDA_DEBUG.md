# Discord Lambda Deployment Issue - Debug Summary

**Status:** BLOCKED - Lambda keeps deploying cached broken code  
**Date:** 2025-10-23  
**Error:** `Runtime.ImportModuleError: No module named 'app'`

## Problem Overview

Discord bot endpoint verification failing because AWS Lambda is running OLD cached code from S3, even after:
- Deleting and recreating CloudFormation stack multiple times
- Fixing imports in PR #82, #85
- Force rebuilding by updating file timestamps
- Merging correct code to main branch

## Current State

### ✅ What's Working
1. **GitHub repo has correct code** - All imports in `orchestrator/app/handlers/discord_handler.py` have proper `app.` prefix (PR #85)
2. **GitHub Actions deploy workflow passes** - No build errors, exits green
3. **CloudFormation stack deploys successfully** - Stack creates without errors
4. **Discord endpoint exists** - API Gateway URL is live at: `https://{api-id}.execute-api.us-west-2.amazonaws.com/dev/discord`

### ❌ What's Broken
1. **Lambda function crashes on import** - Still throwing `No module named 'app'` error
2. **S3 bucket cache not refreshing** - SAM keeps reusing hash `812a86ea8b7ec36f87376fc5995e69a4` (old broken code)
3. **Discord verification fails** - Discord can't verify endpoint because Lambda crashes before responding

## Technical Details

### CloudFormation Template
- **Location:** `orchestrator/template.yaml`
- **Handler:** `handlers.discord_handler.handler`
- **CodeUri:** `app/` (correct - expects `app.` prefix in imports)
- **S3 Bucket:** `aws-sam-cli-managed-default-samclisourcebucket-xfvzppwwhcoy`
- **Cached Zip:** `valine-orchestrator-staging/812a86ea8b7ec36f87376fc5995e69a4`

### Lambda Error (CloudWatch Logs)
```
[ERROR] Runtime.ImportModuleError: Unable to import module 'handlers.discord_handler': No module named 'app'
Traceback (most recent call last):
```

This error means Lambda is running code with imports like:
```python
from verification.verifier import DeployVerifier  # WRONG - old code
```

Instead of:
```python
from app.verification.verifier import DeployVerifier  # CORRECT - in repo now
```

### Import History
- **PR #82** - REMOVED `app.` prefix (thought it was wrong)
- **PR #85** - ADDED `app.` prefix back (correct for Lambda)
- **Current repo state** - Has correct `app.` prefix
- **Current Lambda state** - Running old code WITHOUT `app.` prefix

## What We've Tried

1. ✅ Fixed imports multiple times (PR #82, #85)
2. ✅ Deleted CloudFormation stack and redeployed
3. ✅ Updated file timestamps to force rebuild
4. ✅ Verified GitHub repo has correct code
5. ❌ Tried to delete S3 cache (got 403 Forbidden error - insufficient permissions)

## S3 Cache Issue

SAM deploy workflow always shows:
```
File with same data already exists at valine-orchestrator-staging/812a86ea8b7ec36f87376fc5995e69a4, skipping upload
```

This means SAM is comparing file hashes and saying "code hasn't changed" even though it HAS changed. The hash collision is causing it to reuse old broken code.

## Potential Solutions (Not Yet Tried)

### Option 1: Force SAM to rebuild (high priority)
Add `--force-upload` flag to SAM deploy command in `.github/workflows/deploy-orchestrator.yml`:
```yaml
sam deploy \
  --template-file orchestrator/template.yaml \
  --stack-name valine-orchestrator-staging \
  --capabilities CAPABILITY_IAM \
  --region us-west-2 \
  --force-upload \  # ADD THIS LINE
  --no-confirm-changeset \
  ...
```

### Option 2: Delete S3 cache manually (needs permissions)
```bash
aws s3 rm s3://aws-sam-cli-managed-default-samclisourcebucket-xfvzppwwhcoy/valine-orchestrator-staging/ --recursive
```
**Status:** Blocked by 403 Forbidden error - IAM permissions need updating

### Option 3: Change stack name to force new S3 path
In workflow, change:
```yaml
--stack-name valine-orchestrator-staging-v2  # Forces new S3 path
```

### Option 4: Manual Lambda code upload
Skip SAM entirely:
1. Zip `orchestrator/app/` folder manually
2. Upload directly to Lambda console
3. Test if imports work

### Option 5: Add requirements.txt hack
Create `orchestrator/app/requirements.txt` with a comment timestamp:
```
# Last build: 2025-10-23T19:23:38
```
This changes file hash and might trigger rebuild.

## Files to Check

### Handler Files (should have app. prefix)
- `orchestrator/app/handlers/discord_handler.py` - ✅ Fixed in PR #85
- `orchestrator/app/handlers/github_handler.py` - ✅ Fixed in PR #85

### Deployment Config
- `.github/workflows/deploy-orchestrator.yml` - Needs `--force-upload` flag
- `orchestrator/template.yaml` - Correct as-is
- `orchestrator/samconfig.toml` - May have cache settings

## Discord Setup (For Reference)

**Endpoint URL:** Get from CloudFormation outputs after deployment  
**Format:** `https://{api-id}.execute-api.us-west-2.amazonaws.com/dev/discord`

**Required Secrets (in GitHub Secrets):**
- `DISCORD_PUBLIC_KEY` - For signature verification
- `DISCORD_BOT_TOKEN` - For bot API calls
- `GITHUB_TOKEN` - For GitHub API
- `GITHUB_WEBHOOK_SECRET` - For webhook verification

**Note:** Secrets are correctly configured - not the issue here.

## Next Steps (Recommended Order)

1. **Add `--force-upload` to deploy workflow** (easiest fix)
2. Redeploy and check if new code hash appears in SAM output
3. If still failing, try changing stack name to force clean slate
4. If still failing, manually upload Lambda zip to test imports
5. If imports work manually, issue is definitely SAM caching

## Related PRs
- #82 - Removed app. prefix (wrong direction)
- #84 - Reorganized docs (no impact on this issue)
- #85 - Added app. prefix back (correct fix, but not deploying)

## CloudWatch Log Groups
- `/aws/lambda/valine-orchestrator-discord-dev` - Discord handler logs
- `/aws/lambda/valine-orchestrator-github-dev` - GitHub webhook logs

## Questions for Investigation

1. Why does SAM show "file already exists" when code has changed?
2. Is SAM hashing the entire `app/` directory or just the handler file?
3. Are there SAM cache settings in `samconfig.toml` overriding `--force-upload`?
4. Does the GitHub Actions service account have S3 delete permissions?

## Owner Notes
- User: gcolon75
- Preferred style: Gen Z humor, efficient explanations
- Has been debugging for multiple days
- AWS credentials work for deploy but not S3 delete operations

---

**For next Copilot session:** Start by adding `--force-upload` flag to deploy workflow and testing if Lambda gets new code.