# Discord Endpoint Verification Diagnostic Report

## Executive Summary

The Discord bot Lambda deployment is successful, but endpoint verification is failing. This document provides a comprehensive analysis of the root cause and verification steps.

## Configuration Analysis

### Current Deployment State

- **Stack Name**: `valine-orchestrator-staging`
- **Lambda Function**: `valine-orchestrator-discord-dev` (Stage=dev)
- **Region**: us-west-2
- **Endpoint**: https://3n6t1f7pw1.execute-api.us-west-2.amazonaws.com/dev/discord

### Discord Bots

1. **Production Bot**
   - App ID: `1302154777933172756`
   - Should use: Production public key

2. **Staging Bot** (CURRENT DEPLOYMENT TARGET)
   - App ID: `1428568840958251109`
   - Should use: `STAGING_DISCORD_PUBLIC_KEY` from GitHub Secrets

### Deployment Workflow Analysis

The workflow correctly:
1. ✅ Sets environment variables from GitHub Secrets
2. ✅ Passes parameters to SAM deploy with `STAGING_DISCORD_PUBLIC_KEY`
3. ✅ Deploys to `valine-orchestrator-staging` stack
4. ✅ Creates Lambda function `valine-orchestrator-discord-dev` with environment variable `DISCORD_PUBLIC_KEY`

## Suspected Root Causes

### 1. Secret Mismatch (Most Likely)

The `STAGING_DISCORD_PUBLIC_KEY` in GitHub Secrets may not match the actual public key from the Discord Developer Portal for the staging bot (App ID 1428568840958251109).

**Verification Steps:**
1. Go to Discord Developer Portal → Applications → Staging Bot (1428568840958251109)
2. Navigate to General Information → Public Key
3. Compare with GitHub Secret `STAGING_DISCORD_PUBLIC_KEY` in repository settings
4. Ensure they match **character-by-character** (no extra spaces/newlines)

### 2. Environment Variable Not Updated

Even if the workflow passes the correct secret, the Lambda environment variable might still have an old value from a previous deployment.

**Verification Steps:**
1. Go to AWS Lambda Console → `valine-orchestrator-discord-dev`
2. Configuration tab → Environment variables
3. Check `DISCORD_PUBLIC_KEY` value
4. Compare with the staging bot's public key from Discord Developer Portal

### 3. Signature Verification Logic Issue

The `verify_discord_signature` function in `discord_handler.py` expects a hex-encoded public key.

```python
def verify_discord_signature(signature, timestamp, body, public_key):
    try:
        verify_key = VerifyKey(bytes.fromhex(public_key))
        verify_key.verify(f'{timestamp}{body}'.encode(), bytes.fromhex(signature))
        return True
    except (BadSignatureError, ValueError):
        return False
```

**Potential Issues:**
- Public key must be in hex format (64 characters, 0-9a-f)
- No extra whitespace or line breaks
- Correct encoding

### 4. API Gateway CORS/Headers

Discord sends specific headers that must be allowed:
- `x-signature-ed25519`
- `x-signature-timestamp`

Check template.yaml:
```yaml
Cors:
  AllowHeaders: "'Content-Type,X-Hub-Signature-256,X-Signature-Ed25519,X-Signature-Timestamp'"
```

This looks correct (headers are allowed).

### 5. Cold Start or Import Errors

Even though PR #82 fixed import paths, there could still be runtime import issues on cold start.

## Immediate Action Items

### Step 1: Verify Discord Public Key Match

Run this test script to compare keys:

```powershell
#!/bin/bash
# Test script to verify Discord public key configuration

# 1. Get the value from Lambda
echo "=== Lambda Environment Variable ==="
aws lambda get-function-configuration \
  --function-name valine-orchestrator-discord-dev \
  --region us-west-2 \
  --query 'Environment.Variables.DISCORD_PUBLIC_KEY' \
  --output text

echo ""
echo "=== Expected Value ==="
echo "Copy the public key from Discord Developer Portal:"
echo "https://discord.com/developers/applications/1428568840958251109/information"
echo ""
echo "Compare the two values character-by-character"
```

### Step 2: Test Lambda with PING Request

Create a test event in Lambda Console:

```json
{
  "headers": {
    "x-signature-ed25519": "VALID_SIGNATURE_HERE",
    "x-signature-timestamp": "1234567890"
  },
  "body": "{\"type\":1}"
}
```

Note: For actual testing, you'll need a valid signature. Use the test script below.

### Step 3: Check CloudWatch Logs

```powershell
# Get latest log streams
aws logs describe-log-streams \
  --log-group-name /aws/lambda/valine-orchestrator-discord-dev \
  --region us-west-2 \
  --order-by LastEventTime \
  --descending \
  --max-items 5

# Get logs from latest stream
aws logs get-log-events \
  --log-group-name /aws/lambda/valine-orchestrator-discord-dev \
  --log-stream-name <LATEST_STREAM_NAME> \
  --region us-west-2 \
  --limit 50
```

### Step 4: Manual Endpoint Test

You can test the endpoint manually with Discord's verification:

1. Go to Discord Developer Portal
2. Settings → General Information
3. Interactions Endpoint URL: `https://3n6t1f7pw1.execute-api.us-west-2.amazonaws.com/dev/discord`
4. Click "Save Changes"
5. Discord will send a PING request
6. Check CloudWatch logs immediately for errors

## Fix Implementation

Based on the diagnostic findings, here are the likely fixes:

### Fix 1: Update GitHub Secret (if mismatch found)

1. Go to GitHub → gcolon75/Project-Valine → Settings → Secrets and variables → Actions
2. Edit `STAGING_DISCORD_PUBLIC_KEY`
3. Paste the exact public key from Discord Developer Portal (staging bot)
4. Save
5. Re-run the deployment workflow

### Fix 2: Force Lambda Update (if env var stale)

Add a workflow step to explicitly update the Lambda environment variable:

```yaml
- name: Update Lambda Environment Variables
  run: |
    aws lambda update-function-configuration \
      --function-name valine-orchestrator-discord-dev \
      --environment "Variables={
        DISCORD_PUBLIC_KEY=${{ secrets.STAGING_DISCORD_PUBLIC_KEY }},
        DISCORD_BOT_TOKEN=${{ secrets.STAGING_DISCORD_BOT_TOKEN }},
        GITHUB_TOKEN=${{ secrets.STAGING_GITHUB_TOKEN }},
        FRONTEND_BASE_URL=${{ secrets.FRONTEND_BASE_URL }},
        VITE_API_BASE=${{ secrets.VITE_API_BASE }},
        GITHUB_REPO=gcolon75/Project-Valine,
        STAGE=dev,
        RUN_TABLE_NAME=valine-orchestrator-runs-dev
      }"
```

### Fix 3: Test PING Handler Locally

Create a local test to verify the signature logic works:

```python
#!/usr/bin/env python3
"""Test Discord signature verification locally"""

import os
import json
from nacl.signing import VerifyKey

def verify_discord_signature(signature, timestamp, body, public_key):
    """Verify Discord interaction signature."""
    try:
        verify_key = VerifyKey(bytes.fromhex(public_key))
        verify_key.verify(f'{timestamp}{body}'.encode(), bytes.fromhex(signature))
        return True
    except Exception as e:
        print(f"Verification failed: {e}")
        return False

# Test with PING
public_key = "YOUR_STAGING_PUBLIC_KEY_HERE"
timestamp = "1234567890"
body = '{"type":1}'

# This won't work without a real signature from Discord
# But it will validate the public key format
try:
    verify_key = VerifyKey(bytes.fromhex(public_key))
    print(f"✅ Public key is valid hex format: {public_key[:16]}...")
except Exception as e:
    print(f"❌ Public key format error: {e}")
```

## Security Considerations

- Never commit Discord public keys or tokens to git
- Ensure GitHub Secrets are properly set
- Verify that the correct bot (staging) is being configured
- Check that production bot credentials are not accidentally being used

## Next Steps

1. **Immediate**: Compare Lambda `DISCORD_PUBLIC_KEY` with Discord Portal public key
2. **If mismatch**: Update GitHub Secret and re-deploy
3. **If match**: Check CloudWatch logs for actual error message
4. **If no logs**: Verify API Gateway is routing requests correctly
5. **If still failing**: Test with manual PING request and capture Discord's error message

## Expected Outcome

When properly configured:
- Discord sends PING (type=1) to endpoint
- Lambda verifies signature using `DISCORD_PUBLIC_KEY`
- Lambda responds with PONG (type=1)
- Discord marks endpoint as verified ✅

## Verification Checklist

- [ ] Lambda `DISCORD_PUBLIC_KEY` matches staging bot public key
- [ ] GitHub Secret `STAGING_DISCORD_PUBLIC_KEY` is correct
- [ ] Lambda function exists and is updated
- [ ] API Gateway endpoint is accessible
- [ ] CORS headers allow Discord's signature headers
- [ ] No import errors in Lambda cold start
- [ ] PING request returns 200 with type=1 response
- [ ] Discord endpoint verification succeeds

## Resources

- Discord Developer Portal: https://discord.com/developers/applications
- Lambda Console: https://us-west-2.console.aws.amazon.com/lambda/home?region=us-west-2#/functions/valine-orchestrator-discord-dev
- CloudWatch Logs: https://us-west-2.console.aws.amazon.com/cloudwatch/home?region=us-west-2#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fvaline-orchestrator-discord-dev
- CloudFormation Stack: https://us-west-2.console.aws.amazon.com/cloudformation/home?region=us-west-2#/stacks/stackinfo?stackId=valine-orchestrator-staging
