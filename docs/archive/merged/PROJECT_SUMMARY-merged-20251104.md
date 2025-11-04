<!-- ARCHIVED DOCUMENT -->
<!-- Original location: docs/PROJECT_SUMMARY.md -->
<!-- Archived on: 2025-11-04 -->
<!-- Reason: Merged into docs/reference/project-summary.md -->
<!-- This document is kept for historical reference only -->

---

# Project Valine - Rin Discord Bot Summary

## TL;DR

**Rin** is the orchestrator bot for Project Valine, managing automated workflows via Discord. Currently, Rin uses the **GLOBAL registration flow** for the `/ux-update` command, which requires only `APP_ID + BOT_TOKEN` but accepts a ~1 hour UI propagation delay.

**Quick Deploy:**
```powershell
$env:STAGING_DISCORD_APPLICATION_ID = "1428568840958251109"
$env:STAGING_DISCORD_BOT_TOKEN = "your_raw_token_here"
.\orchestrator\scripts\min_register_global.ps1
```

Wait up to 1 hour, then `/ux-update` appears in Discord. ✅

**Full guide:** [docs/discord_min_flow.md](discord_min_flow.md)

---

## What is Rin?

**Rin** is Project Valine's orchestrator bot that handles:
- Interactive UX/UI updates via `/ux-update` Discord command
- Automated workflows between Discord and GitHub
- Staging environment coordination

**Key Identity:**
- App ID: `1428568840958251109`
- Bot name: `@RinBot` (staging)
- Not to be confused with: Amadeus (builder/notifier bot)

---

## Current Registration Choice: GLOBAL

As of **October 2025**, Rin uses the **GLOBAL endpoint** for slash command registration:

```
POST/PATCH /applications/{app_id}/commands
```

**Why GLOBAL?**
- ✅ Simplest setup: only 2 env vars (`APP_ID + BOT_TOKEN`)
- ✅ Fewer permissions headaches
- ✅ No guild/install confusion
- ⏰ Tradeoff: Commands take up to ~1 hour to appear in Discord UI

**Required Environment Variables:**
- `STAGING_DISCORD_APPLICATION_ID` - App ID
- `STAGING_DISCORD_BOT_TOKEN` - Raw token (no "Bot " prefix)

**Not required:**
- ~~STAGING_GUILD_ID~~ (deferred for instant registration later)

---

## What Changed in PR #116?

**The Simplification PR** moved us from a complex guild-based flow to a minimal global flow:

### Before (Archived)
- Required: `APP_ID`, `BOT_TOKEN`, `GUILD_ID`
- Multiple scripts: guild registration, diagnostics, various flows
- Instant command visibility (seconds) but more complexity
- Location: `archive/_discord_old_scripts/`

### After (Current)
- Required: `APP_ID`, `BOT_TOKEN` only
- Single script: `orchestrator/scripts/min_register_global.ps1`
- Command visibility in ~1 hour but minimal moving parts
- Clear docs: `docs/discord_min_flow.md`

**Trade:** Instant commands ➜ Simple setup. We chose simplicity for now.

---

## Deploy & Verify in 3 Steps

1. **Set env vars:**
   ```powershell
   $env:STAGING_DISCORD_APPLICATION_ID = "1428568840958251109"
   $env:STAGING_DISCORD_BOT_TOKEN = "your_raw_token_here"
   ```

2. **Run script:**
   ```powershell
   .\orchestrator\scripts\min_register_global.ps1
   ```

3. **Wait & verify:**
   - Wait up to 1 hour (Discord global propagation)
   - Open Discord, type `/` in any channel
   - Look for `/ux-update` command
   - Test: `/ux-update description:"Test navbar"`

---

## Known Issues & Fixes

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for full reference.

**Quick hits:**
- **401 Unauthorized** → Wrong token or includes "Bot " prefix
- **403 Missing Access** → App not installed with `applications.commands` scope
- **40333 Internal Network Error** → Discord flake, retry with backoff
- **Command not visible** → Global propagation delay, wait up to 1 hour

---

## Future: Instant Registration Option

Guild-based registration (instant visibility) is **deferred but planned**. See [NEXT_STEPS.md](NEXT_STEPS.md) for the safe re-enablement path.

**When we need instant commands:**
- Add `STAGING_GUILD_ID` env var
- Re-invite app with `bot + applications.commands` scopes
- Switch endpoint to `/applications/{app}/guilds/{guild}/commands`
- Commands appear in seconds instead of hours

---

## Documentation Links

- **[discord_min_flow.md](discord_min_flow.md)** - Full setup guide for global registration
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Symptom → Cause → Fix reference
- **[OPS_LOG_2025-10-26.md](OPS_LOG_2025-10-26.md)** - Timeline of incidents and fixes
- **[NEXT_STEPS.md](NEXT_STEPS.md)** - Plan to re-enable guild-based instant registration
- **[orchestrator/scripts/README.md](../orchestrator/scripts/README.md)** - Scripts reference

---

**Last Updated:** 2025-10-26  
**Version:** Post-PR-116 (Global registration flow)  
**Style:** Concise, Gen Z gamer-light, copy-paste friendly
