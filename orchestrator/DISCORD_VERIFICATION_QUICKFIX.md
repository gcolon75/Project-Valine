# Discord Endpoint Verification - Quick Fix Guide

## TL;DR - The Fix

The Discord endpoint verification is failing because of a **public key mismatch**. Here's how to fix it:

### Quick Fix (5 minutes)

1. **Get the correct public key:**
   ```bash
   # Go to Discord Developer Portal
   open https://discord.com/developers/applications/1428568840958251109/information
   # Copy the "Public Key" (64 hex characters)
   ```

2. **Run the diagnostic script:**
   ```bash
   cd orchestrator/scripts
   ./verify_discord_config.sh
   ```

3. **If keys don't match, update and re-deploy:**
   - Update GitHub Secret `STAGING_DISCORD_PUBLIC_KEY` with the correct key
   - OR run `./verify_discord_config.sh --fix` to update Lambda directly

4. **Verify in Discord:**
   - Go to Discord Developer Portal → Interactions Endpoint URL
   - Paste: `https://3n6t1f7pw1.execute-api.us-west-2.amazonaws.com/dev/discord`
   - Save (Discord will send PING and verify)

## Problem Statement

**Symptoms:**
- Lambda deployment succeeds ✅
- Imports are fixed (PR #82) ✅
- Discord endpoint verification fails ❌
- Error: "The specified interactions endpoint url could not be verified"

**Root Cause:**
The `DISCORD_PUBLIC_KEY` environment variable in Lambda doesn't match the actual public key of the staging Discord bot (App ID 1428568840958251109).

## Diagnostic Tools

### 1. Configuration Verification Script

```bash
cd orchestrator/scripts
./verify_discord_config.sh
```

This script will:
- ✅ Check if Lambda function exists
- ✅ Verify environment variables are set
- ✅ Validate public key format (64 hex chars)
- ✅ Test API endpoint accessibility
- ✅ Check CloudWatch logs
- ✅ Provide Discord Portal verification instructions

**Output Example:**
```
=== Discord Bot Configuration Diagnostic ===

Stack: valine-orchestrator-staging
Function: valine-orchestrator-discord-dev
Region: us-west-2
Staging Bot ID: 1428568840958251109

Step 1: Checking Lambda function exists...
✅ Lambda function exists

Step 2: Fetching Lambda environment variables...
Lambda environment variables:
DISCORD_PUBLIC_KEY = abc123def456789...
DISCORD_BOT_TOKEN = MTQyODU2ODg0MDk...
GITHUB_TOKEN = ghp_...
...
```

### 2. Public Key Tester

```bash
cd orchestrator/scripts
python3 test_discord_verification.py <YOUR_PUBLIC_KEY>
```

This script will:
- ✅ Validate public key format
- ✅ Test signature verification logic
- ✅ Verify PING/PONG response format

**Example Usage:**
```bash
# Get public key from Discord Portal, then test it
python3 test_discord_verification.py abc123def456...

# Output:
✅ PASS: Key length is 64 characters
✅ PASS: Key contains only valid hex characters
✅ PASS: Public key can be loaded by nacl.signing.VerifyKey
```

## Step-by-Step Debugging

### Step 1: Verify Lambda Configuration

```bash
# Get Lambda environment variables
aws lambda get-function-configuration \
  --function-name valine-orchestrator-discord-dev \
  --region us-west-2 \
  --query 'Environment.Variables.DISCORD_PUBLIC_KEY' \
  --output text
```

**Expected:** 64-character hexadecimal string (0-9, a-f)

### Step 2: Get Discord Bot Public Key

1. Go to https://discord.com/developers/applications/1428568840958251109/information
2. Copy the "Public Key" under "General Information"
3. Verify it's 64 hex characters

### Step 3: Compare Keys

```bash
# Use the diagnostic script
./verify_discord_config.sh

# Manually compare:
# Lambda key (first 20): abc123def456789abcd...
# Discord key (first 20): abc123def456789abcd...
# They should MATCH exactly
```

### Step 4: Check CloudWatch Logs

```bash
# Get latest logs
aws logs tail /aws/lambda/valine-orchestrator-discord-dev \
  --region us-west-2 \
  --follow

# Or use AWS Console:
# https://us-west-2.console.aws.amazon.com/cloudwatch/home?region=us-west-2#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fvaline-orchestrator-discord-dev
```

Look for error messages like:
- `BadSignatureError` → Public key mismatch
- `ModuleNotFoundError` → Import error (should be fixed by PR #82)
- `Missing signature headers` → API Gateway configuration issue

### Step 5: Test Endpoint Manually

```bash
# Test with curl (will fail signature check, but confirms endpoint is reachable)
curl -X POST https://3n6t1f7pw1.execute-api.us-west-2.amazonaws.com/dev/discord \
  -H "Content-Type: application/json" \
  -H "x-signature-ed25519: test" \
  -H "x-signature-timestamp: 1234567890" \
  -d '{"type":1}'

# Expected: {"error":"Invalid request signature"}
# This confirms the endpoint is working, just failing signature verification
```

## Common Issues and Fixes

### Issue 1: Public Key Mismatch

**Symptom:** Lambda has wrong public key

**Fix:**
```bash
# Option A: Update GitHub Secret and re-deploy
# 1. GitHub → Settings → Secrets → STAGING_DISCORD_PUBLIC_KEY
# 2. Update with correct key from Discord Portal
# 3. Re-run deploy workflow

# Option B: Update Lambda directly
./verify_discord_config.sh --fix
# Enter the correct public key when prompted
```

### Issue 2: Wrong Bot Public Key

**Symptom:** Using production bot key instead of staging

**Fix:**
- Verify you're using the public key from the **staging bot** (App ID 1428568840958251109)
- NOT the production bot (App ID 1302154777933172756)

### Issue 3: Extra Whitespace in Key

**Symptom:** Key has spaces or newlines

**Fix:**
```bash
# Clean the key
echo "abc123def456..." | tr -d ' \n\t'
```

### Issue 4: Import Errors

**Symptom:** CloudWatch logs show `ModuleNotFoundError`

**Status:** Should be fixed by PR #82
**Verify:**
```bash
# Check if imports are correct in discord_handler.py
grep "^from" orchestrator/app/handlers/discord_handler.py
# Should NOT have "from app.services" etc.
# Should have "from services" etc.
```

## Manual Lambda Update (Advanced)

If you need to update the Lambda environment variable manually:

```bash
# Get current environment
CURRENT_ENV=$(aws lambda get-function-configuration \
  --function-name valine-orchestrator-discord-dev \
  --region us-west-2 \
  --query 'Environment.Variables' \
  --output json)

# Update with new public key
echo $CURRENT_ENV | jq '.DISCORD_PUBLIC_KEY = "NEW_KEY_HERE"' | \
aws lambda update-function-configuration \
  --function-name valine-orchestrator-discord-dev \
  --region us-west-2 \
  --environment "Variables=$(cat -)"
```

## Verification Checklist

Before attempting Discord verification:

- [ ] Lambda function `valine-orchestrator-discord-dev` exists
- [ ] Lambda has environment variable `DISCORD_PUBLIC_KEY`
- [ ] Public key is 64 hex characters (no spaces/newlines)
- [ ] Public key matches Discord Portal (staging bot 1428568840958251109)
- [ ] Public key matches GitHub Secret `STAGING_DISCORD_PUBLIC_KEY`
- [ ] API endpoint is accessible (test with curl)
- [ ] No import errors in CloudWatch logs
- [ ] CORS headers allow `x-signature-ed25519` and `x-signature-timestamp`

## Expected Behavior

When everything is configured correctly:

1. Discord sends POST to `/discord` with:
   - Headers: `x-signature-ed25519`, `x-signature-timestamp`
   - Body: `{"type":1}` (PING)

2. Lambda handler:
   - Verifies signature using `DISCORD_PUBLIC_KEY`
   - Returns: `{"type":1}` (PONG)

3. Discord:
   - Receives PONG within 3 seconds
   - Marks endpoint as verified ✅

## Resources

- **Discord Developer Portal:** https://discord.com/developers/applications
- **Lambda Console:** https://us-west-2.console.aws.amazon.com/lambda/home?region=us-west-2#/functions/valine-orchestrator-discord-dev
- **CloudWatch Logs:** https://us-west-2.console.aws.amazon.com/cloudwatch/home?region=us-west-2#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fvaline-orchestrator-discord-dev
- **API Gateway:** https://us-west-2.console.aws.amazon.com/apigateway/main/apis?region=us-west-2

## Getting Help

If you're still stuck after following this guide:

1. Run the diagnostic script and save the output:
   ```bash
   ./verify_discord_config.sh > diagnostic_output.txt
   ```

2. Check CloudWatch logs for specific errors:
   ```bash
   aws logs tail /aws/lambda/valine-orchestrator-discord-dev \
     --region us-west-2 \
     --since 10m > logs.txt
   ```

3. Share the diagnostic output and logs for further investigation

## Success Criteria

✅ Diagnostic script shows all checks passing
✅ Public keys match across all sources
✅ Test endpoint returns 401 (signature verification, as expected)
✅ CloudWatch logs show no errors
✅ Discord endpoint verification succeeds
✅ Bot responds to slash commands in Discord
