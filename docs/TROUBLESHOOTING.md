# Discord Command Registration - Troubleshooting Guide

Quick reference for diagnosing and fixing common Discord slash command issues.

---

## Symptoms → Causes → Fixes

### 🔴 Error: 401 Unauthorized

**Symptoms:**
```
HTTP 401 :: {"message": "401: Unauthorized", "code": 0}
```

**Causes:**
1. Token includes "Bot " prefix in the secret
2. Wrong token being used
3. Token expired or regenerated

**Fixes:**
```powershell
# ✅ Use raw token only (no "Bot " prefix)
$env:STAGING_DISCORD_BOT_TOKEN = "MTQyODU2ODg0MDk1ODI1MTEwOQ.GxYz..."

# ❌ WRONG - do not include "Bot "
$env:STAGING_DISCORD_BOT_TOKEN = "Bot MTQyODU2ODg0MDk1ODI1MTEwOQ.GxYz..."
```

**Verify:**
```powershell
# Should return bot user info
iwr -Headers @{Authorization="Bot $env:STAGING_DISCORD_BOT_TOKEN"} `
  https://discord.com/api/v10/users/@me | % Content
```

---

### 🔴 Error: 403 Missing Access (Forbidden)

**Symptoms:**
```
HTTP 403 :: {"message": "Missing Access", "code": 50001}
```

**Causes:**
1. App not installed in server with `applications.commands` scope
2. Bot permissions disabled in Discord Developer Portal
3. Using guild endpoint without proper bot install

**Fixes:**

**For GLOBAL registration (current):**
- Ensure bot has permissions enabled in Discord Developer Portal
- No specific guild install required

**For guild registration (future):**
- Re-invite bot with correct scopes:
  ```
  https://discord.com/api/oauth2/authorize?client_id=<APP_ID>&scope=bot%20applications.commands&permissions=0&guild_id=<GUILD_ID>&disable_guild_select=true
  ```
- Both `bot` AND `applications.commands` scopes required

**Verify:**
- Check Discord Developer Portal → Bot → Bot permissions enabled
- Check server → Server Settings → Integrations → Verify bot listed

---

### 🔴 Error: 40333 Internal Network Error

**Symptoms:**
```
HTTP 40333 :: Discord internal network error
```

**Causes:**
1. Discord transient network issue (their infrastructure)
2. Rare flake on their side

**Fixes:**
```powershell
# Wait briefly and retry
Start-Sleep -Seconds 5
.\orchestrator\scripts\min_register_global.ps1
```

**Retry Strategy:**
- First retry: 5 seconds
- Second retry: 10 seconds
- Third retry: 20 seconds
- If still failing: Check Discord status page

---

### 🔴 Error: 429 Rate Limiting

**Symptoms:**
```
HTTP 429 :: You are being rate limited
```

**Causes:**
1. Too many API requests in short time
2. Aggressive retry loop

**Fixes:**
```powershell
# Wait for the retry-after header duration (usually 30-60 seconds)
Start-Sleep -Seconds 60
.\orchestrator\scripts\min_register_global.ps1
```

**Prevention:**
- Don't hammer the API with retries
- Use exponential backoff
- Cache command state locally

---

### ⚠️ Command Not Visible in Discord UI

**Symptoms:**
- Script reports success: "GLOBAL: Created /ux-update"
- But command doesn't appear when typing `/` in Discord

**Causes:**
1. Global command propagation delay (expected behavior)
2. Discord client cache not refreshed

**Fixes:**
```
1. Wait up to 1 hour (Discord global propagation)
2. Hard refresh Discord client (Ctrl+R)
3. Restart Discord client completely
4. Check other servers where bot is installed
```

**Verify registration via API:**
```powershell
# List all global commands
iwr -Headers @{Authorization="Bot $env:STAGING_DISCORD_BOT_TOKEN"} `
  https://discord.com/api/v10/applications/$env:STAGING_DISCORD_APPLICATION_ID/commands | % Content
```

**Not a bug:** This is the tradeoff for using GLOBAL endpoint.

**Future solution:** Switch to guild endpoint for instant visibility (see [NEXT_STEPS.md](guides/next-steps.md))

---

### ⚠️ Wrong Bot Responding to Commands

**Symptoms:**
- `/ux-update` triggers Amadeus instead of Rin
- OR commands registered to wrong application

**Causes:**
1. Environment variables mixed up between Rin and Amadeus
2. Copy-paste error with APP_ID or BOT_TOKEN

**Fixes:**

**Rin (Orchestrator):**
```powershell
$env:STAGING_DISCORD_APPLICATION_ID = "1428568840958251109"
$env:STAGING_DISCORD_BOT_TOKEN = "<Rin's token from Discord Portal>"
```

**Amadeus (Builder/Notifier):**
```powershell
$env:AMADEUS_APPLICATION_ID = "<Amadeus's app ID>"
$env:AMADEUS_BOT_TOKEN = "<Amadeus's token>"
```

**Verify bot identity:**
```powershell
# Should return: username = "RinBot" or similar
iwr -Headers @{Authorization="Bot $env:STAGING_DISCORD_BOT_TOKEN"} `
  https://discord.com/api/v10/users/@me | % Content
```

**Prevention:**
- Keep env vars clearly named and documented
- Always verify bot identity before registration

---

## One-Liner Verification Snippets

**Check bot auth:**
```powershell
iwr -Headers @{Authorization="Bot $env:STAGING_DISCORD_BOT_TOKEN"} https://discord.com/api/v10/users/@me | % Content
```

**List global commands:**
```powershell
iwr -Headers @{Authorization="Bot $env:STAGING_DISCORD_BOT_TOKEN"} https://discord.com/api/v10/applications/$env:STAGING_DISCORD_APPLICATION_ID/commands | % Content
```

**Register /ux-update globally:**
```powershell
.\orchestrator\scripts\min_register_global.ps1
```

**Delete a specific command (by ID):**
```powershell
iwr -Method DELETE -Headers @{Authorization="Bot $env:STAGING_DISCORD_BOT_TOKEN"} https://discord.com/api/v10/applications/$env:STAGING_DISCORD_APPLICATION_ID/commands/<COMMAND_ID>
```

**Delete ALL global commands (nuclear option):**
```powershell
iwr -Method PUT -Headers @{Authorization="Bot $env:STAGING_DISCORD_BOT_TOKEN"; "Content-Type"="application/json"} -Body "[]" https://discord.com/api/v10/applications/$env:STAGING_DISCORD_APPLICATION_ID/commands
```

---

## Bot Identity Guardrails

### Rin (Orchestrator)
- **App ID:** 1428568840958251109
- **Bot Name:** @RinBot (staging)
- **Role:** Orchestrator for UX updates, workflows
- **Commands:** `/ux-update`
- **Env Vars:**
  - `STAGING_DISCORD_APPLICATION_ID`
  - `STAGING_DISCORD_BOT_TOKEN`

### Amadeus (Builder/Notifier)
- **App ID:** <different ID>
- **Bot Name:** @Amadeus or similar
- **Role:** Build notifications, CI/CD updates
- **Commands:** <different commands>
- **Env Vars:**
  - `AMADEUS_APPLICATION_ID`
  - `AMADEUS_BOT_TOKEN`

**Key Rule:** Never mix Rin and Amadeus env vars. They are separate bots.

---

## Avatar/Banner Upload Issues

### 🔴 Error: net::ERR_FILE_NOT_FOUND for blob: URLs

**Symptoms:**
```
Failed to load resource: net::ERR_FILE_NOT_FOUND
blob:https://dkmxy676d3vgc.cloudfront.net/0509d8e4-b6d2-4fb2-8155-7bc604675394
```
- Avatar/banner disappears after page refresh
- Console shows repeated GET attempts for blob: URLs
- Network tab shows no proper S3/CloudFront URL requests

**Causes:**
Frontend was persisting a temporary browser-local `blob:` URL (created via `URL.createObjectURL`) into the profile payload instead of using the canonical S3 URL returned from the backend upload completion.

**Understanding blob: URLs:**
- `blob:` URLs are **temporary** and **browser-local** preview URLs
- They exist only in the current browser session
- They cannot be fetched by the backend, CloudFront, or other browsers
- They are meant for UI preview only, never for persistence

**Fixes:**
1. **Ensure frontend uses S3 URL from upload result:**
   - Upload handlers (`handleAvatarUpload`, `handleBannerUpload`) must use `result.s3Url`
   - Never persist `URL.createObjectURL()` results to the database
   - See PR #[current] for correct implementation

2. **Backend validation (added in PR #[current]):**
   ```javascript
   // Backend now rejects blob: URLs with 400 Bad Request
   if (avatarUrl?.startsWith('blob:')) {
     return error(400, 'avatarUrl cannot be a blob: URL. Use S3 URL from upload completion.');
   }
   ```

3. **Clear browser cache if stuck with blob: URL:**
   ```javascript
   // In browser console, clear form data:
   localStorage.clear();
   sessionStorage.clear();
   // Then hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   ```

**Verify Fix:**
```powershell
# After uploading avatar, check PATCH payload:
# Should show https:// URL, NOT blob:
# Example correct URL:
# "avatarUrl": "https://valine-media-uploads.s3.us-west-2.amazonaws.com/profiles/abc123/media/1234567890-uuid"

# Example WRONG URL (bug):
# "avatarUrl": "blob:https://dkmxy676d3vgc.cloudfront.net/0509d8e4-b6d2-4fb2-8155-7bc604675394"
```

**Flow diagram:**
```
User uploads file → Frontend sends to S3 via presigned URL 
→ Backend completeUpload returns {s3Url: "https://..."}
→ Frontend uses s3Url for form state (NOT blob: URL)
→ Save profile with s3Url in payload
→ Backend persists s3Url
→ Image accessible from CloudFront after refresh ✅
```

---

## Escalation Path

If issues persist after trying fixes above:

1. **Check Discord Status:** https://discordstatus.com/
2. **Review API docs:** https://discord.com/developers/docs/interactions/application-commands
3. **Verify env vars:** Double-check APP_ID and BOT_TOKEN
4. **Check script version:** Ensure using latest `min_register_global.ps1`
5. **Review logs:** See [OPS_LOG_2025-10-26.md](OPS_LOG_2025-10-26.md) for historical issues

---

**Last Updated:** 2025-10-26  
**Version:** Post-PR-116 (Global registration)  
**Maintainer:** DevOps / Rin Operations Team
