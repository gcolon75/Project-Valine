# Lambda Deployment Recovery Playbook

> **TL;DR**: Your Lambda keeps dying with "No module named 'app'" because S3 cached a stale artifact. This doc has the exact commands to diagnose and nuke it.

## 🎯 Quick Diagnosis (5 minutes)

### Step 1: Download the deployed Lambda package

```bash
# Get the S3 bucket used by SAM
STACK_NAME="valine-orchestrator"
S3_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`ArtifactBucket`].OutputValue' \
  --output text)

# If that doesn't work, SAM uses a managed bucket
if [ -z "$S3_BUCKET" ]; then
  S3_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name aws-sam-cli-managed-default \
    --query 'Stacks[0].Outputs[?OutputKey==`SourceBucket`].OutputValue' \
    --output text)
fi

echo "SAM Bucket: $S3_BUCKET"

# Download the deployed zip
mkdir -p /tmp/lambda-debug
aws s3 cp s3://$S3_BUCKET/ /tmp/lambda-debug/ --recursive --exclude "*" --include "*DiscordHandlerFunction*"

# Find and extract the zip
cd /tmp/lambda-debug
LATEST_ZIP=$(ls -t *.zip 2>/dev/null | head -1)
if [ -n "$LATEST_ZIP" ]; then
  unzip -q "$LATEST_ZIP" -d deployed-code
  echo "✅ Extracted deployed package"
else
  echo "❌ No Lambda package found in S3"
fi
```

**✅ If you see:** "Extracted deployed package"  
**❌ If you see:** "No Lambda package found" → Lambda never deployed, skip to [Option 1](#option-1-force-fresh-deploy)

### Step 2: Inspect what's actually deployed

```bash
cd /tmp/lambda-debug/deployed-code

# Check if discord_handler.py exists
if [ -f "handlers/discord_handler.py" ]; then
  echo "✅ Handler file exists"
  head -20 handlers/discord_handler.py
else
  echo "❌ Handler file missing - package is definitely broken"
fi

# Check imports in discord_handler.py
echo "🔍 Checking imports..."
grep "^from " handlers/discord_handler.py | head -10

# Compare to repo version
cd /home/runner/work/Project-Valine/Project-Valine/orchestrator/app/handlers
echo "📋 Repo version imports:"
grep "^from " discord_handler.py | head -10
```

**✅ If imports match (no `from app.` prefix):** Package looks good, check CloudWatch logs  
**❌ If you see `from app.services` or `from app.verification`:** STALE PACKAGE → Continue to fix

### Step 3: Check CloudWatch logs for import errors

```bash
# Get Lambda function name
FUNCTION_NAME=$(aws lambda list-functions \
  --query 'Functions[?contains(FunctionName, `valine-orchestrator-discord`)].FunctionName' \
  --output text)

echo "Function: $FUNCTION_NAME"

# Tail recent logs
aws logs tail /aws/lambda/$FUNCTION_NAME --since 1h --format short

# Look for import errors specifically
aws logs tail /aws/lambda/$FUNCTION_NAME --since 1h \
  | grep -i "importmoduleerror\|no module named"
```

**✅ If no import errors:** Not a stale package issue  
**❌ If you see "No module named 'app'":** CONFIRMED STALE PACKAGE → Fix it below

### Step 4: Compare deployed Lambda code hash

```bash
# Get deployed code hash
aws lambda get-function \
  --function-name $FUNCTION_NAME \
  --query 'Configuration.CodeSha256' \
  --output text

# Build locally and compare
cd /home/runner/work/Project-Valine/Project-Valine/orchestrator
sam build --use-container
cd .aws-sam/build/DiscordHandlerFunction
LOCAL_HASH=$(zip -r - . | sha256sum | cut -d' ' -f1)
echo "Local build hash: $LOCAL_HASH"
```

**✅ If hashes match:** Code is current  
**❌ If hashes differ:** S3 has stale artifact → [Force Fresh Deploy](#option-1-force-fresh-deploy)

---

## ⚡ Option 1: Force Fresh Deploy (Non-Destructive)

> **When to use**: Stale package detected, need to push fresh code without destroying infrastructure.

### Step 1: Clean local build artifacts

```bash
cd /home/runner/work/Project-Valine/Project-Valine/orchestrator

# Clean SAM cache
rm -rf .aws-sam/

echo "✅ Local cache cleared"
```

### Step 2: Build with container (guarantees clean Python env)

```bash
sam build --use-container --force
```

**✅ Expected output:**
```
Build Succeeded

Built Artifacts  : .aws-sam/build
Built Template   : .aws-sam/build/template.yaml
```

**❌ If build fails:**
- Check Docker is running: `docker ps`
- Check `template.yaml` syntax
- Check `requirements.txt` in app/ directory

### Step 3: Force upload to S3 (bypass cache)

```bash
# Method 1: Using samconfig.toml
sam deploy --force-upload

# Method 2: Explicit parameters (if secrets not in samconfig.toml)
sam deploy \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --force-upload \
  --parameter-overrides \
    "Stage=dev" \
    "DiscordPublicKey=YOUR_KEY" \
    "DiscordBotToken=YOUR_TOKEN" \
    "GitHubToken=YOUR_TOKEN" \
    "GitHubWebhookSecret=YOUR_SECRET" \
    "FrontendBaseUrl=" \
    "ViteApiBase="
```

**✅ Expected output:**
```
Uploading to <hash>  <size> / <size>  (100.00%)
Successfully packaged artifacts and wrote output template to s3://...
Successfully created/updated stack - valine-orchestrator
```

**❌ If you see "Skipping upload":**
- SAM still thinks package is identical
- Check `--force-upload` flag is present
- Proceed to [Option 3](#option-3-nuclear-reset) if this persists

### Step 4: Verify S3 upload timestamp

```bash
# Check latest upload time
aws s3api list-objects-v2 \
  --bucket $S3_BUCKET \
  --prefix "valine-orchestrator" \
  --query 'Contents | sort_by(@, &LastModified)[-1].[Key,LastModified,Size]' \
  --output table
```

**✅ If timestamp is within last few minutes:** Upload succeeded  
**❌ If timestamp is old:** Upload was skipped → [Check Permissions](#option-2-check-iam-permissions)

### Step 5: Check CloudWatch for clean startup

```bash
# Wait 30 seconds for Lambda to warm up
echo "⏳ Waiting 30 seconds for Lambda initialization..."
sleep 30

# Check logs
aws logs tail /aws/lambda/$FUNCTION_NAME --since 1m --follow
```

**✅ If you see:** No import errors, handler starts clean  
**❌ If still seeing import errors:** Code didn't actually update → [Option 3](#option-3-nuclear-reset)

### Step 6: Test Discord endpoint

```bash
# Get Discord webhook URL
DISCORD_URL=$(aws cloudformation describe-stacks \
  --stack-name valine-orchestrator \
  --query 'Stacks[0].Outputs[?OutputKey==`DiscordWebhookUrl`].OutputValue' \
  --output text)

echo "Discord URL: $DISCORD_URL"

# Test with PING (Discord interaction type 1)
curl -X POST "$DISCORD_URL" \
  -H "Content-Type: application/json" \
  -d '{"type": 1}'
```

**✅ Expected output:** `{"type":1}` (PONG response)  
**❌ If 5xx error or timeout:** Lambda still broken, check logs again

---

## 🔐 Option 2: Check IAM Permissions

> **When to use**: SAM says "upload skipped" or you get S3 permission errors.

### Step 1: Check current AWS identity

```bash
aws sts get-caller-identity
```

**✅ You should see:**
```json
{
  "UserId": "...",
  "Account": "579939802800",
  "Arn": "arn:aws:..."
}
```

### Step 2: Verify GitHub Actions role (if deploying via CI/CD)

```bash
# Check if role exists
aws iam get-role --role-name ProjectValine-GitHubDeployRole

# Check attached policies
aws iam list-attached-role-policies --role-name ProjectValine-GitHubDeployRole
```

**✅ Expected policies:**
- `AWSLambda_FullAccess` or equivalent
- `AmazonS3FullAccess` or SAM bucket access
- `CloudFormationFullAccess` or stack permissions

**❌ If role doesn't exist or missing policies:**
```bash
# Recreate role (requires admin access)
# See AWS docs: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create.html
```

### Step 3: Check SAM bucket permissions

```bash
# Try to list bucket
aws s3 ls s3://$S3_BUCKET/

# Try to upload test file
echo "test" > /tmp/test.txt
aws s3 cp /tmp/test.txt s3://$S3_BUCKET/test-permission.txt

# Try to delete (cleanup)
aws s3 rm s3://$S3_BUCKET/test-permission.txt
```

**✅ If all commands succeed:** Permissions are fine  
**❌ If you get "AccessDenied":**
- Your AWS credentials don't have S3 write access
- Switch to admin credentials or fix IAM policy
- [AWS docs on S3 permissions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-overview.html)

### Step 4: Fix permission issues

**For local deployment:**
```bash
# Configure with credentials that have admin access
aws configure

# Or use a profile with sufficient permissions
export AWS_PROFILE=admin
sam deploy --force-upload
```

**For GitHub Actions:**
- Add missing permissions to `ProjectValine-GitHubDeployRole`
- Or recreate role with correct trust policy
- See `.github/workflows/deploy-orchestrator.yml` for role ARN

---

## 💣 Option 3: Nuclear Reset (Destructive - Last Resort)

> ⚠️ **WARNING**: This DELETES your Lambda, DynamoDB table, and all stack resources. Use only when nothing else works.

### ⚠️ CHECKPOINT: What you're about to do

- ❌ DELETE CloudFormation stack (Lambda, API Gateway, DynamoDB)
- ❌ WIPE S3 bucket prefix (all Lambda artifacts)
- ❌ LOSE all DynamoDB data (run history, state)
- ✅ RESPAWN point: Clean infrastructure from scratch

**⏸️ STOP HERE if:**
- You haven't tried [Option 1](#option-1-force-fresh-deploy)
- You have important data in DynamoDB
- You're not sure what you're doing

**Type this to confirm you understand:**
```bash
echo "I understand this is destructive and will delete all Lambda resources"
```

### Step 1: Backup DynamoDB table (if you care about data)

```bash
# Export table to S3
aws dynamodb create-backup \
  --table-name valine-orchestrator-runs-dev \
  --backup-name "pre-nuke-backup-$(date +%Y%m%d-%H%M%S)"

echo "✅ Backup created (just in case)"
```

### Step 2: Delete CloudFormation stack

```bash
# Delete the stack
aws cloudformation delete-stack --stack-name valine-orchestrator

# Wait for deletion (this takes 2-5 minutes)
echo "⏳ Waiting for stack deletion..."
aws cloudformation wait stack-delete-complete --stack-name valine-orchestrator

echo "✅ Stack deleted"
```

**✅ Expected:** Stack deletes without errors  
**❌ If stuck in DELETE_FAILED:**
```bash
# Check what failed
aws cloudformation describe-stack-events \
  --stack-name valine-orchestrator \
  --query 'StackEvents[?ResourceStatus==`DELETE_FAILED`]' \
  --output table

# Manually delete stuck resources, then retry delete
```

### Step 3: Empty SAM S3 bucket prefix

```bash
# Delete all objects with valine-orchestrator prefix
aws s3 rm s3://$S3_BUCKET/ --recursive --exclude "*" --include "*valine-orchestrator*"

echo "✅ S3 artifacts nuked"
```

### Step 4: Clean redeploy from scratch

```bash
cd /home/runner/work/Project-Valine/Project-Valine/orchestrator

# Clean everything
rm -rf .aws-sam/

# Fresh build
sam build --use-container --force

# Deploy (will create new stack)
sam deploy --guided
```

**Follow the prompts:**
- Stack name: `valine-orchestrator`
- Region: `us-west-2`
- Confirm changes: `Y`
- Allow SAM CLI IAM role creation: `Y`
- Save arguments to config: `Y`

**✅ Expected:** New stack creates successfully  
**❌ If deploy fails:** Check error message, usually IAM or parameter issues

### Step 5: Re-verify Discord endpoint

```bash
# Get new Discord URL (it will be different)
NEW_DISCORD_URL=$(aws cloudformation describe-stacks \
  --stack-name valine-orchestrator \
  --query 'Stacks[0].Outputs[?OutputKey==`DiscordWebhookUrl`].OutputValue' \
  --output text)

echo "🎮 NEW RESPAWN POINT (Discord URL): $NEW_DISCORD_URL"

# Test it
curl -X POST "$NEW_DISCORD_URL" \
  -H "Content-Type: application/json" \
  -d '{"type": 1}'
```

**✅ Expected:** `{"type":1}`  

### Step 6: Update Discord Developer Portal

1. Go to https://discord.com/developers/applications
2. Select your application
3. Go to "General Information"
4. Update "Interactions Endpoint URL" with new URL
5. Discord will verify with PING → should succeed

**✅ Verification succeeds:** You've respawned successfully 🎮  
**❌ Verification fails:** Check Discord public key in parameters

---

## 🔍 Troubleshooting Matrix

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `No module named 'app'` in logs | Stale S3 package | [Option 1](#option-1-force-fresh-deploy) |
| SAM says "upload skipped" | Cache thinks code identical | [Option 1](#option-1-force-fresh-deploy) with `--force-upload` |
| "AccessDenied" on S3 | IAM permissions missing | [Option 2](#option-2-check-iam-permissions) |
| Can't overwrite S3 artifact | Bucket policy or lock | [Option 2](#option-2-check-iam-permissions) or [Option 3](#option-3-nuclear-reset) |
| Lambda returns 5xx immediately | Code crashed on import | [Quick Diagnosis](#-quick-diagnosis-5-minutes), check logs |
| Discord "invalid signature" | Wrong public key | Update `DiscordPublicKey` parameter |
| "Stack does not exist" | Never deployed or deleted | [Option 1](#option-1-force-fresh-deploy) or [Option 3](#option-3-nuclear-reset) |
| DynamoDB table not found | Stack incomplete or deleted | [Option 3](#option-3-nuclear-reset) |
| Import succeeds but command fails | Code is good, logic bug | Check CloudWatch logs for actual error |
| GitHub Actions deploy fails | Role doesn't exist or no perms | [Option 2](#option-2-check-iam-permissions) |

---

## 🎮 Game References (because why not)

- **Stale artifact** = Corrupted save file
- **Option 1** = Quick save reload
- **Option 2** = Check you have permission to enter zone
- **Option 3** = Delete save and start new game
- **`sam build --use-container`** = Reinstall game with verified files
- **`--force-upload`** = Force update, no cache
- **CloudWatch logs** = Game console (where crashes show up)
- **Discord endpoint** = Multiplayer server connection
- **Fresh deploy** = Respawn at checkpoint

---

## 🚨 Emergency Quick Commands

**Copy-paste this entire block when Lambda is on fire:**

```bash
#!/bin/bash
# Lambda Import Fix - Emergency Edition
cd /home/runner/work/Project-Valine/Project-Valine/orchestrator

# Nuke cache
rm -rf .aws-sam/

# Rebuild clean
sam build --use-container --force

# Force upload (bypass S3 cache)
sam deploy --force-upload

# Check it worked
FUNCTION_NAME=$(aws lambda list-functions \
  --query 'Functions[?contains(FunctionName, `valine-orchestrator-discord`)].FunctionName' \
  --output text)

echo "⏳ Waiting 30s for Lambda..."
sleep 30

echo "📋 Recent logs:"
aws logs tail /aws/lambda/$FUNCTION_NAME --since 2m

echo "🧪 Testing endpoint:"
DISCORD_URL=$(aws cloudformation describe-stacks \
  --stack-name valine-orchestrator \
  --query 'Stacks[0].Outputs[?OutputKey==`DiscordWebhookUrl`].OutputValue' \
  --output text)
curl -X POST "$DISCORD_URL" -H "Content-Type: application/json" -d '{"type": 1}'
```

---

## 📚 Additional Resources

- [LAMBDA_IMPORT_FIX.md](../LAMBDA_IMPORT_FIX.md) - Technical explanation of the import issue
- [DISCORD_DEPLOYMENT_TROUBLESHOOTING.md](../DISCORD_DEPLOYMENT_TROUBLESHOOTING.md) - Full deployment guide
- [AWS SAM CLI Reference](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-command-reference.html)
- [Discord Interactions Endpoint](https://discord.com/developers/docs/interactions/receiving-and-responding)

---

**Version**: 1.0  
**Last Updated**: 2025-10-23  
**Maintainer**: Project Valine Team  
**Target Audience**: 23yo devs who want fast answers  
**Status**: ✅ Battle-tested
