# Discord Endpoint Verification Test Plan

## Pre-Test Setup

Before running tests, ensure you have:
- [ ] AWS CLI configured with correct credentials and region (us-west-2)
- [ ] Access to Discord Developer Portal
- [ ] Access to GitHub repository secrets
- [ ] Python 3.11+ installed (for Python test script)
- [ ] jq installed (for JSON parsing in bash scripts)

## Test Execution

### Test 1: Run Diagnostic Script

**Purpose:** Verify Lambda configuration and identify any issues

```bash
cd orchestrator/scripts
./verify_discord_config.sh
```

**Expected Output:**
```
✅ Lambda function exists
✅ Public key format is valid (64 hex characters)
✅ Stack status: UPDATE_COMPLETE or CREATE_COMPLETE
✅ API endpoint is accessible (returned 401 - signature verification failed as expected)
```

**Pass Criteria:**
- All checks show ✅
- Public key is 64 hex characters
- API endpoint returns 401 (expected without valid signature)

**Fail Criteria:**
- Any check shows ❌
- Public key is wrong length or format
- API endpoint is not accessible

---

### Test 2: Verify Public Key Format

**Purpose:** Ensure public key is in correct format

```bash
cd orchestrator/scripts

# Get the public key from Lambda
LAMBDA_KEY=$(aws lambda get-function-configuration \
  --function-name valine-orchestrator-discord-dev \
  --region us-west-2 \
  --query 'Environment.Variables.DISCORD_PUBLIC_KEY' \
  --output text)

# Test it
python3 test_discord_verification.py "$LAMBDA_KEY"
```

**Expected Output:**
```
✅ PASS: Key length is 64 characters
✅ PASS: Key contains only valid hex characters
✅ PASS: Public key can be loaded by nacl.signing.VerifyKey
✅ All tests passed!
```

**Pass Criteria:**
- All 3 format checks pass
- No ValueError or exceptions

**Fail Criteria:**
- Key is not 64 characters
- Key contains invalid characters
- Cannot load with nacl

---

### Test 3: Compare Public Keys

**Purpose:** Verify all three sources have the same public key

```bash
# 1. Get Lambda public key
LAMBDA_KEY=$(aws lambda get-function-configuration \
  --function-name valine-orchestrator-discord-dev \
  --region us-west-2 \
  --query 'Environment.Variables.DISCORD_PUBLIC_KEY' \
  --output text)

echo "Lambda Key (first 20): ${LAMBDA_KEY:0:20}..."
echo "Lambda Key (last 20):  ...${LAMBDA_KEY: -20}"
```

**Manual Steps:**
1. Go to Discord Developer Portal: https://discord.com/developers/applications/1428568840958251109/information
2. Copy the "Public Key"
3. Compare with Lambda key above
4. Go to GitHub → Settings → Secrets → STAGING_DISCORD_PUBLIC_KEY
5. Click "Update" to reveal (first/last chars shown)
6. Compare with the above

**Pass Criteria:**
- All three keys match EXACTLY
- No extra spaces, newlines, or characters
- First 20 and last 20 characters are identical across all sources

**Fail Criteria:**
- Keys don't match
- Extra whitespace detected
- Different lengths

---

### Test 4: Test API Endpoint Accessibility

**Purpose:** Verify the API Gateway endpoint is reachable

```bash
API_URL="https://3n6t1f7pw1.execute-api.us-west-2.amazonaws.com/dev/discord"

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-signature-ed25519: test" \
  -H "x-signature-timestamp: 1234567890" \
  -d '{"type":1}' \
  -v
```

**Expected Output:**
```
< HTTP/2 401
< content-type: application/json
...
{"error":"Invalid request signature"}
```

**Pass Criteria:**
- HTTP 401 response
- Response contains error about invalid signature
- Connection successful

**Fail Criteria:**
- Connection timeout
- HTTP 500 error
- No response

---

### Test 5: Check CloudWatch Logs

**Purpose:** Verify Lambda is invoked and no import errors exist

```bash
# Tail logs (keep this running in a terminal)
aws logs tail /aws/lambda/valine-orchestrator-discord-dev \
  --region us-west-2 \
  --follow
```

**Manual Steps:**
1. In another terminal, run the curl test from Test 4
2. Watch the logs in the first terminal

**Expected Output:**
```
2025-10-23T... START RequestId: ... Version: ...
2025-10-23T... Error handling Discord interaction: Invalid request signature
2025-10-23T... END RequestId: ...
```

**Pass Criteria:**
- Lambda invoked successfully
- No ModuleNotFoundError
- Only signature verification errors (expected)
- Clean function start/end

**Fail Criteria:**
- ModuleNotFoundError (import issues)
- Lambda timeout
- No logs appear (Lambda not invoked)

---

### Test 6: Discord Endpoint Verification

**Purpose:** Actually verify the endpoint with Discord

**Manual Steps:**
1. Go to Discord Developer Portal
2. Navigate to Applications → Staging Bot (1428568840958251109) → General Information
3. Scroll to "Interactions Endpoint URL"
4. Enter: `https://3n6t1f7pw1.execute-api.us-west-2.amazonaws.com/dev/discord`
5. Click "Save Changes"
6. Watch for Discord's verification

**Expected Behavior:**
- Discord sends PING request
- Lambda verifies signature
- Lambda responds with PONG
- Discord shows "✅ Successfully verified"

**Pass Criteria:**
- Discord endpoint verification succeeds
- No error message from Discord
- Green checkmark appears

**Fail Criteria:**
- Error: "The specified interactions endpoint url could not be verified"
- Discord timeout (>3 seconds)
- Any error message

**If Test 6 Fails:**
Check CloudWatch logs immediately:
```bash
aws logs tail /aws/lambda/valine-orchestrator-discord-dev \
  --region us-west-2 \
  --since 1m
```

Look for specific error messages.

---

## Remediation Steps

### If Public Keys Don't Match

**Option A: Update GitHub Secret (Recommended)**
1. Get correct key from Discord Portal
2. Go to GitHub → Settings → Secrets and variables → Actions
3. Update `STAGING_DISCORD_PUBLIC_KEY`
4. Re-run deploy workflow
5. Wait for deployment to complete
6. Repeat Test 6

**Option B: Update Lambda Directly (Quick Fix)**
```bash
cd orchestrator/scripts
./verify_discord_config.sh --fix
# Enter the correct public key when prompted
```

Then immediately retry Test 6.

### If Import Errors Found

This should be fixed by PR #82, but if you still see import errors:

1. Check `orchestrator/app/handlers/discord_handler.py` imports:
   ```bash
   grep "^from" orchestrator/app/handlers/discord_handler.py
   ```
   
2. Ensure imports are relative (no `app.` prefix):
   ```python
   from verification.verifier import DeployVerifier  # ✅ Correct
   # NOT:
   from app.verification.verifier import DeployVerifier  # ❌ Wrong
   ```

3. If imports are wrong, fix and re-deploy

### If API Gateway Issues

Check API Gateway configuration:
```bash
aws cloudformation describe-stacks \
  --stack-name valine-orchestrator-staging \
  --region us-west-2 \
  --query 'Stacks[0].Outputs'
```

Ensure CORS headers are set correctly in `template.yaml`:
```yaml
Cors:
  AllowHeaders: "'Content-Type,X-Hub-Signature-256,X-Signature-Ed25519,X-Signature-Timestamp'"
```

---

## Success Criteria Summary

All of the following must be true:

- [ ] Diagnostic script shows all ✅
- [ ] Public key format test passes
- [ ] All three public keys match exactly
- [ ] API endpoint responds with 401
- [ ] CloudWatch logs show clean invocations
- [ ] **Discord endpoint verification succeeds** ← MAIN GOAL

## Test Report Template

```markdown
## Discord Endpoint Verification Test Results

**Date:** 2025-10-23
**Tester:** [Your Name]
**Environment:** Staging (us-west-2)

### Test 1: Diagnostic Script
- Status: [PASS/FAIL]
- Notes: [Any observations]

### Test 2: Public Key Format
- Status: [PASS/FAIL]
- Key Length: [64 expected]
- Notes: [Any observations]

### Test 3: Public Key Comparison
- Lambda Key: [first 20]...[last 20]
- Discord Key: [first 20]...[last 20]
- GitHub Key: [first 20]...[last 20]
- Match: [YES/NO]
- Status: [PASS/FAIL]

### Test 4: API Endpoint
- HTTP Response: [401 expected]
- Status: [PASS/FAIL]

### Test 5: CloudWatch Logs
- Invocations: [Number]
- Import Errors: [YES/NO]
- Status: [PASS/FAIL]

### Test 6: Discord Verification
- Result: [SUCCESS/FAILED]
- Error Message: [If any]
- Screenshot: [Attach if failed]

### Overall Result
- [ ] All tests passed
- [ ] Discord endpoint verified successfully
- [ ] Ready for slash command testing

### Issues Found
[List any issues discovered]

### Remediation Applied
[List any fixes applied]

### Final Status
[PASS/FAIL]
```

---

## Post-Verification Tests

After Discord endpoint verification succeeds, test the slash commands:

### Test Slash Command Registration

```bash
cd orchestrator
./register_discord_commands_staging.sh
```

**Expected:**
- Commands registered successfully
- No errors

### Test Slash Command Invocation

In Discord (staging bot server):
1. Type `/status`
2. Execute command

**Expected:**
- Bot responds within 3 seconds
- Response shows workflow status
- No error message

**If fails:**
- Check CloudWatch logs
- Verify bot has correct permissions in server
- Ensure commands are registered to staging bot

---

## Troubleshooting Guide

### Issue: "Public key format error"
**Solution:** 
```bash
# Strip any whitespace
CLEAN_KEY=$(echo "$DIRTY_KEY" | tr -d ' \n\t')
# Verify length
echo ${#CLEAN_KEY}  # Should be 64
```

### Issue: "Connection timeout"
**Solution:**
- Check security groups on Lambda
- Verify API Gateway is deployed
- Check if Lambda has network access

### Issue: "ModuleNotFoundError"
**Solution:**
- Verify PR #82 changes are deployed
- Check SAM build logs for errors
- Ensure requirements.txt includes all dependencies

### Issue: "BadSignatureError" in logs
**Solution:**
- This is the public key mismatch
- Follow Remediation Steps above
- Verify public keys match across all sources

---

## Automation Script (Optional)

For automated testing, you can create a combined script:

```bash
#!/bin/bash
# run_all_tests.sh

set -e

echo "Running all Discord endpoint verification tests..."

# Test 1
./verify_discord_config.sh || exit 1

# Test 2
LAMBDA_KEY=$(aws lambda get-function-configuration \
  --function-name valine-orchestrator-discord-dev \
  --region us-west-2 \
  --query 'Environment.Variables.DISCORD_PUBLIC_KEY' \
  --output text)
python3 test_discord_verification.py "$LAMBDA_KEY" || exit 1

# Test 4
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  "https://3n6t1f7pw1.execute-api.us-west-2.amazonaws.com/dev/discord" \
  -H "Content-Type: application/json" \
  -H "x-signature-ed25519: test" \
  -H "x-signature-timestamp: 1234567890" \
  -d '{"type":1}')

if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ All automated tests passed!"
    echo ""
    echo "Next step: Manually verify endpoint in Discord Portal"
    echo "  https://discord.com/developers/applications/1428568840958251109/information"
else
    echo "❌ API endpoint test failed (HTTP $HTTP_CODE)"
    exit 1
fi
```

This script can be run as a pre-check before attempting Discord verification.
