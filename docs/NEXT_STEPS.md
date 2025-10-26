# Next Steps: Re-enabling Guild-Based Instant Registration

## Current State

**As of October 2025:**
- Using **GLOBAL endpoint** for slash command registration
- Requires only: `APP_ID + BOT_TOKEN`
- Commands take up to **~1 hour** to appear in Discord UI
- Simplicity prioritized over instant visibility

**Status:** ✅ Production-ready, low maintenance

---

## Future Goal: Instant Command Visibility

**When we need it:**
- Testing new commands frequently (dev workflow)
- User requests faster command updates
- Critical fix needs immediate deployment

**Guild-based registration provides:**
- Commands appear in **seconds** (not hours)
- Instant feedback during development
- Better testing experience

**Tradeoff:**
- More complex setup
- Additional env var (`GUILD_ID`)
- Requires proper bot install with scopes

---

## Pre-requisites for Guild Registration

### 1. Environment Variables

Add to existing Rin env vars:

```powershell
# Existing (keep these)
$env:STAGING_DISCORD_APPLICATION_ID = "1428568840958251109"
$env:STAGING_DISCORD_BOT_TOKEN = "your_raw_token_here"

# NEW - add this for guild registration
$env:STAGING_GUILD_ID = "1407810581532250233"  # Your staging server ID
```

**How to find GUILD_ID:**
- Discord → Server Settings → Widget → Server ID
- OR enable Developer Mode → Right-click server icon → Copy ID

---

### 2. Bot Installation with Correct Scopes

**Current install likely missing `applications.commands` scope.**

**Required OAuth2 URL shape:**
```
https://discord.com/api/oauth2/authorize?client_id=<APP_ID>&scope=bot%20applications.commands&permissions=0&guild_id=<GUILD_ID>&disable_guild_select=true
```

**Placeholders:**
- `<APP_ID>` = `1428568840958251109` (Rin's app ID)
- `<GUILD_ID>` = `1407810581532250233` (your staging guild)

**Complete example URL:**
```
https://discord.com/api/oauth2/authorize?client_id=1428568840958251109&scope=bot%20applications.commands&permissions=0&guild_id=1407810581532250233&disable_guild_select=true
```

**Why this URL shape:**
- `scope=bot%20applications.commands` → Both scopes required for slash commands
- `permissions=0` → Minimal permissions (adjust if needed)
- `guild_id=<GUILD_ID>` → Pre-selects your server
- `disable_guild_select=true` → Prevents user from choosing wrong server

---

### 3. Script Modification

**Current script:**
```powershell
# Global endpoint (current)
POST https://discord.com/api/v10/applications/{app_id}/commands
```

**Guild endpoint (future):**
```powershell
# Guild-specific endpoint
POST https://discord.com/api/v10/applications/{app_id}/guilds/{guild_id}/commands
```

**Two options:**

#### Option A: Create new guild script
```powershell
# Keep min_register_global.ps1 as-is
# Create new: orchestrator/scripts/min_register_guild.ps1
```

#### Option B: Add flag to existing script
```powershell
# Add parameter to min_register_global.ps1
.\orchestrator\scripts\min_register_global.ps1 -UseGuild
```

**Recommendation:** Option A (separate script) for clarity

---

## Safe Migration Checklist

**Phase 1: Preparation (no changes to production)**
- [ ] Document current GLOBAL setup (done ✅)
- [ ] Save current env vars and script state
- [ ] Test bot identity: `GET /users/@me` returns RinBot

**Phase 2: Guild Setup**
- [ ] Obtain STAGING_GUILD_ID (see section 1 above)
- [ ] Generate correct OAuth2 invite URL (see section 2 above)
- [ ] Re-invite bot using the new URL
- [ ] Verify bot appears in Server Settings → Integrations

**Phase 3: Script Creation**
- [ ] Copy `min_register_global.ps1` to `min_register_guild.ps1`
- [ ] Update endpoint: add `/guilds/{guild_id}` path
- [ ] Add `STAGING_GUILD_ID` env var check
- [ ] Test in staging guild only

**Phase 4: Testing**
- [ ] Run new guild script: `.\orchestrator\scripts\min_register_guild.ps1`
- [ ] Verify command appears in Discord within 1 minute
- [ ] Test command: `/ux-update description:"Test guild registration"`
- [ ] Compare with global command (still propagating)

**Phase 5: Documentation**
- [ ] Update `docs/discord_min_flow.md` with guild option
- [ ] Add guild script docs to `orchestrator/scripts/README.md`
- [ ] Update `TROUBLESHOOTING.md` with guild-specific issues
- [ ] Mark this section as ✅ Complete in NEXT_STEPS.md

**Phase 6: Choose Default**
- [ ] Decide: Keep GLOBAL as default, or switch to GUILD
- [ ] If GLOBAL: Keep guild script as optional fast path
- [ ] If GUILD: Update README quick start to use guild script

---

## Environment Variable Canon

**Rin (Orchestrator) - Complete Set:**
```powershell
# Minimal (current production)
$env:STAGING_DISCORD_APPLICATION_ID = "1428568840958251109"
$env:STAGING_DISCORD_BOT_TOKEN = "your_raw_token_here"

# Optional (for guild registration)
$env:STAGING_GUILD_ID = "1407810581532250233"
```

**Amadeus (Builder/Notifier) - Keep Separate:**
```powershell
$env:AMADEUS_APPLICATION_ID = "<different_app_id>"
$env:AMADEUS_BOT_TOKEN = "<different_token>"
# No STAGING_GUILD_ID - Amadeus doesn't use guild commands
```

**Key Rule:** Never mix Rin and Amadeus variables.

---

## Potential Issues & Mitigations

### Issue: 403 Missing Access

**Cause:** Bot not re-invited with `applications.commands` scope

**Fix:** Use the exact OAuth2 URL shape from section 2 above

---

### Issue: Commands registered twice (global + guild)

**Cause:** Both global and guild scripts run

**Behavior:**
- Global command appears everywhere (1 hour delay)
- Guild command appears in staging guild only (instant)
- Discord shows both, but they're functionally the same

**Fix if unwanted:**
```powershell
# Delete global command
iwr -Method DELETE -Headers @{Authorization="Bot $env:STAGING_DISCORD_BOT_TOKEN"} `
  https://discord.com/api/v10/applications/$env:STAGING_DISCORD_APPLICATION_ID/commands/<GLOBAL_COMMAND_ID>

# Keep only guild command
```

**OR keep both:** Global for production, guild for staging (recommended)

---

### Issue: Wrong guild ID

**Symptom:** Commands don't appear in your server

**Fix:**
```powershell
# Verify guild ID in Discord
# Developer Mode → Right-click server → Copy ID
# Should be: 1407810581532250233 (staging)
```

---

## When to Switch

**Stick with GLOBAL if:**
- ✅ 1 hour delay is acceptable
- ✅ Simplicity is priority
- ✅ Minimal operations overhead desired

**Switch to GUILD if:**
- ⚠️ Need instant command visibility
- ⚠️ Frequent command updates during development
- ⚠️ Testing new commands rapidly

**Hybrid approach (recommended):**
- Keep GLOBAL for production/default
- Use GUILD for staging/development
- Maintain both scripts for flexibility

---

## Documentation Updates Required

When implementing guild registration:

1. **docs/discord_min_flow.md**
   - Add guild registration section
   - Explain GLOBAL vs GUILD tradeoffs
   - Link to both scripts

2. **orchestrator/scripts/README.md**
   - Document both `min_register_global.ps1` and `min_register_guild.ps1`
   - Explain when to use each

3. **docs/TROUBLESHOOTING.md**
   - Add guild-specific 403 errors
   - Document guild ID verification

4. **README.md**
   - Update quick start with guild option
   - Note: Guild is optional, GLOBAL is default

---

## Timeline Estimate

**Estimated effort:** 2-3 hours for complete guild setup

- 30 min: Generate OAuth2 URL, re-invite bot
- 30 min: Create and test `min_register_guild.ps1`
- 30 min: Test in staging guild
- 60 min: Documentation updates
- 30 min: Buffer for issues

**No rush:** Current GLOBAL setup is production-ready. Switch when needed.

---

**Status:** 📋 Planned (not started)  
**Priority:** Low (current setup works)  
**Owner:** DevOps / Rin Operations Team  
**Last Updated:** 2025-10-26
