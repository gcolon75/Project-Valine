# Orchestrator Scripts

This directory contains utility scripts for managing and validating the Project Valine orchestrator.

## Minimal Global Registration (Rin) - Current Standard

**Script:** `min_register_global.ps1`

**Platform:** Windows PowerShell 5.1+

**Purpose:** Simplest path to register `/ux-update` command globally using only APP_ID + BOT_TOKEN.

**Quick Start:**

```powershell
# Set environment variables
$env:STAGING_DISCORD_APPLICATION_ID = "1428568840958251109"
$env:STAGING_DISCORD_BOT_TOKEN = "your_raw_token_here"

# Run the script
.\orchestrator\scripts\min_register_global.ps1

# Expected output:
# Bot OK: @RinBot (ID:1428568840958251109)
# GLOBAL: Created /ux-update
# Heads-up: Global commands can take up to ~1 hour to appear in Discord UI
```

**Important Notes:**
- ⏰ Global commands take up to ~1 hour to appear in Discord (tradeoff for simplicity)
- 🔒 Use raw token only (no "Bot " prefix) - script adds it automatically
- ✅ Only 2 env vars needed (no GUILD_ID required)

**Full Documentation:**
- [docs/discord_min_flow.md](../../docs/discord_min_flow.md) - Complete setup guide
- [docs/TROUBLESHOOTING.md](../../docs/TROUBLESHOOTING.md) - Common errors and fixes
- [docs/PROJECT_SUMMARY.md](../../docs/PROJECT_SUMMARY.md) - High-level overview

---

## Other Scripts

This directory also contains various utility scripts for Phase 5 validation, triage automation, and other orchestrator functions. See individual script files for documentation.

**Key Scripts:**

- `phase5_triage_agent.py` - Automated triage and fix agent for failed PRs
- `phase5_staging_validator.py` - Phase 5 (observability + alerts) staging validator
- `issue_triage_agent.py` - Automated issue triage agent
- `rin_register_commands.ps1` - Full-featured guild registration script (advanced)

For more information on these scripts, refer to the documentation sections below or the original detailed README that was preserved in git history.

---

**Last Updated:** 2025-10-26  
**Version:** Minimal (archived old Discord scripts to archive/_discord_old_scripts/)
