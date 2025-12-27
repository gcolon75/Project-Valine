# Discord Endpoint Verification - Quick Reference Card

## 🚨 Problem
Discord endpoint verification fails: **"The specified interactions endpoint url could not be verified"**

## 💡 Root Cause
Lambda's `DISCORD_PUBLIC_KEY` doesn't match the staging bot's actual public key from Discord Portal.

## ⚡ 5-Minute Fix

### Step 1: Diagnose
```powershell
cd orchestrator/scripts
./verify_discord_config.sh
```

### Step 2: Fix (Choose One)

**Option A - Quick Fix (updates Lambda directly):**
```powershell
./verify_discord_config.sh --fix
# Enter public key from Discord Portal when prompted
```

**Option B - Proper Fix (updates GitHub Secret):**
1. Get public key: https://discord.com/developers/applications/1428568840958251109/information
2. Update GitHub Secret: `STAGING_DISCORD_PUBLIC_KEY`
3. Re-run deploy workflow

### Step 3: Verify
1. Discord Portal → Interactions Endpoint URL
2. Paste: `https://3n6t1f7pw1.execute-api.us-west-2.amazonaws.com/dev/discord`
3. Save → Discord verifies ✅

## 📋 Checklist

- [ ] Run `./verify_discord_config.sh`
- [ ] Public keys match (Lambda vs Discord Portal)
- [ ] Apply fix if needed
- [ ] Discord endpoint verifies successfully

## 🔗 Key Resources

- **Diagnostic Script:** `orchestrator/scripts/verify_discord_config.sh`
- **Test Script:** `orchestrator/scripts/test_discord_verification.py`
- **Quick Guide:** `orchestrator/DISCORD_VERIFICATION_QUICKFIX.md`
- **Full Guide:** `DISCORD_ENDPOINT_DIAGNOSTIC.md`
- **Test Plan:** `orchestrator/DISCORD_VERIFICATION_TEST_PLAN.md`
- **Summary:** `DISCORD_FIX_SUMMARY.md`

## 🎯 Bot Info

- **Staging Bot ID:** 1428568840958251109
- **Lambda Function:** valine-orchestrator-discord-dev
- **Region:** us-west-2
- **Endpoint:** https://3n6t1f7pw1.execute-api.us-west-2.amazonaws.com/dev/discord

## 🛠️ Common Commands

```powershell
# Check Lambda config
aws lambda get-function-configuration \
  --function-name valine-orchestrator-discord-dev \
  --region us-west-2 \
  --query 'Environment.Variables.DISCORD_PUBLIC_KEY'

# Test public key format
cd orchestrator/scripts
python3 test_discord_verification.py <PUBLIC_KEY>

# Check CloudWatch logs
aws logs tail /aws/lambda/valine-orchestrator-discord-dev \
  --region us-west-2 \
  --follow

# Test API endpoint
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "x-signature-ed25519" = "test"
    "x-signature-timestamp" = "1234567890"
} -Body '{"type":1}' -ContentType 'application/json'
```

## ✅ Success = Discord Verification ✅

When fixed correctly:
1. Discord sends PING
2. Lambda responds PONG
3. Discord shows: "Successfully verified" ✅

---

**Need help?** See `DISCORD_FIX_SUMMARY.md` for complete solution.
