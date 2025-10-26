#Requires -Version 5.1
<#
.SYNOPSIS
    Generate a crisp AI agent prompt to fully review our Discord integration work.

.DESCRIPTION
    This script creates a comprehensive agent prompt to review Discord integration 
    for the Rin (staging) bot. The prompt focuses on ensuring the UX agent commands
    (/ux-update and peers) are registered and working correctly in staging.
    
    Output: .agent/rin_full_review_prompt.json (problem_title + problem_statement)
    
    Windows PowerShell 5 compatible. ASCII only, no emojis.

.PARAMETER Repo
    Repository identifier. Default: "gcolon75/Project-Valine"

.PARAMETER OutDir
    Output directory for the agent prompt. Default: ".\.agent"

.PARAMETER RinAppId
    Rin (staging) Discord Application ID. Default: "1428568840958251109"

.PARAMETER StagingGuildId
    Staging Guild (server) ID. Default: "1407810581532250233"

.PARAMETER CommonlyMistakenChannelId
    A channel ID that should NOT be used as guild ID. Default: "1428102811832553554"

.EXAMPLE
    .\rin_full_review_agent_prompt.ps1
    
    Generates the agent prompt JSON with default values.

.EXAMPLE
    .\rin_full_review_agent_prompt.ps1 -OutDir ".\.custom_agent"
    
    Generates the agent prompt JSON in a custom directory.

.NOTES
    Author: Project Valine Team
    Purpose: Generate AI agent prompt for Discord integration review (staging only)
    This script is staging-only and does not modify any production resources.
#>

[CmdletBinding()]
param(
  [string]$Repo = "gcolon75/Project-Valine",
  [string]$OutDir = ".\.agent",

  # Staging constants (Rin only)
  [string]$RinAppId = "1428568840958251109",
  [string]$StagingGuildId = "1407810581532250233",
  [string]$CommonlyMistakenChannelId = "1428102811832553554" # channel, not guild
)

# Force UTF-8 encoding for proper output
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Create output directory if it doesn't exist
if (-not (Test-Path -LiteralPath $OutDir)) {
  New-Item -ItemType Directory -Path $OutDir | Out-Null
}

$problem_title = "Rin (staging): Full-stack Discord integration review to ship /ux-update correctly"

$problem_statement = @"
Context
- Repository: $Repo
- Bot: Rin (staging) Application ID: $RinAppId
- Staging Guild (server) ID: $StagingGuildId
- NOTE: $CommonlyMistakenChannelId is a channel ID, NOT a guild ID. Do not use as guild.
- Primary goal: Ensure the UX Agent's /ux-update (and the rest of the staging set) are registered as guild commands AND actually work end-to-end in Discord.

Mission (no side quests)
Perform a comprehensive, read-first review of our current direction for Discord integration and registration. Confirm it is correct, identify missteps, and produce a minimal, surgical plan to guarantee /ux-update and peers are registered and functional for Rin in staging. Prioritize Windows-friendly, guild-based, fast-iteration workflows. Keep it staging-only.

Objectives
1) Registration correctness (guild scope)
   - Verify all staging tooling uses guild endpoint:
     /applications/{app_id}/guilds/{guild_id}/commands
   - Prefer safe upsert: POST (create) + PATCH (update). Avoid bulk PUT unless the payload includes the full set (19) to prevent wipes.
   - Confirm /ux-update schema matches our canonical definition (options: command, description, conversation_id, confirm).

2) Env var consistency (staging-first)
   - Canonical vars: STAGING_DISCORD_APPLICATION_ID, STAGING_DISCORD_BOT_TOKEN (raw token, no 'Bot '), STAGING_DISCORD_GUILD_ID.
   - Allow fallbacks for older names: STAGING_GUILD_ID, DISCORD_GUILD_ID_STAGING, DISCORD_APPLICATION_ID, DISCORD_BOT_TOKEN.
   - Flag any scripts that rely only on generic DISCORD_* without staging variants, or that mix names inconsistently.

3) Windows PowerShell 5 compatibility
   - No ternary (? :), no non-ASCII emoji in scripts likely to run on PS5 consoles.
   - Ensure Invoke-WebRequest flows handle 429 rate limits with Retry-After backoff.

4) Direction check vs recent PRs
   - Validate the current path aligns with merged changes (e.g., PRs that: fixed /ux-update mismatch, standardized env vars, added Windows PS scripts, avoided mass wipes).
   - Confirm the command count target (19) is consistent across tests, docs, and scripts.

5) Runtime readiness (light sanity, no prod changes)
   - Confirm bot token expectations (raw token only; header adds 'Bot ').
   - Confirm Rin is in the staging guild; if not, the invite URL is correct (bot + applications.commands scopes).
   - Confirm Discord app Interactions Endpoint URL and Public Key considerations are documented and consistent (no need to rotate or redeploy; just verify docs and scripts point the right way).

Scope to review (read-only)
- orchestrator/scripts/*.ps1, *.sh, *.py
- orchestrator/register_*.py and orchestrator/register_*.sh
- orchestrator/register_slash_commands_agent.py
- orchestrator/app/agents/discord_slash_cmd_agent.py (reference implementation and behavior)
- Relevant docs under orchestrator/ and docs/ that may influence operator steps
- Recent merged PRs (esp. ones fixing /ux-update, env standardization, Windows PS tooling)

What to detect (common simple accidents)
- Channel ID used as Guild ID anywhere (e.g., $CommonlyMistakenChannelId as guild)
- Global endpoint used in staging scripts (leads to up to 1h delay)
- Bulk PUT without full payload (accidental wipe)
- Token value examples that include 'Bot ' prefix in the secret itself
- Env var name drift: STAGING_DISCORD_GUILD_ID vs STAGING_GUILD_ID vs DISCORD_GUILD_ID_STAGING
- PowerShell 5-incompatible syntax (ternary) or logs with non-ASCII that break consoles
- /ux-update option schema mismatches across scripts vs handler expectations

Acceptance criteria
- Produce a crisp Markdown report and a JSON findings file in ./discord_cmd_evidence/:
  A) scripts_full_review.md (ASCII-only):
     - TLDR (<= 5 lines) verdict on direction (on-track or not) and top fixes
     - Findings by category (env vars, endpoints/methods, IDs, token handling, PS5 compat, schema)
     - A single recommended registration flow for staging (guild + upsert, PS5-safe)
     - Micro-fix playbook (3-7 bullets) to guarantee /ux-update shows up and works
  B) scripts_full_review.json:
     - Per-file findings: {file, issue_kind, severity, snippet or line ref}
     - Env var usage map per script with recommended canonicalization
     - Endpoint/method matrix (guild/global, POST/PATCH/PUT)
     - Command schema diffs for /ux-update and other key commands

Rails to stay on
- STAGING ONLY. Do not create global commands. Do not touch production anything.
- Default to read-only analysis. If proposing changes, output them as suggested diffs/patches under ./discord_cmd_evidence/patches/ without applying.
- Keep Windows PowerShell 5 users happy (no ternary in any helper you output).
- Keep tokens raw in secrets; add 'Bot ' only in the Authorization header.

Helpful constants for cross-checks
- Rin APP_ID: $RinAppId
- Staging Guild ID (correct): $StagingGuildId
- Channel ID (do not use as guild): $CommonlyMistakenChannelId
- Expected command set size: 19 (must include ux-update)
- /ux-update options: command (string), description (string), conversation_id (string), confirm (string)

Operator QoL (optional outputs)
- Provide a tiny PS5-safe verification snippet to list guild commands for Rin using env vars:
  - STAGING_DISCORD_APPLICATION_ID
  - STAGING_DISCORD_BOT_TOKEN (raw token)
  - STAGING_DISCORD_GUILD_ID

Style and tone
- Keep it concise, gamer-friendly, and actionable. Less lore, more loot.
- If there is a single blocking issue, call it out loudly and show the exact one-liner fix.

"@

# Build the prompt object
$prompt = [PSCustomObject]@{
  problem_title      = $problem_title
  problem_statement  = $problem_statement
  repository         = $Repo
  metadata           = @{
    rin_app_id                    = $RinAppId
    staging_guild_id              = $StagingGuildId
    channel_id_do_not_use_as_guild= $CommonlyMistakenChannelId
    canonical_env_vars            = @("STAGING_DISCORD_APPLICATION_ID","STAGING_DISCORD_BOT_TOKEN","STAGING_DISCORD_GUILD_ID")
    expected_command_count        = 19
    key_command                   = "ux-update"
  }
}

# Convert to JSON and write to file
$outPath = Join-Path $OutDir "rin_full_review_prompt.json"
$prompt | ConvertTo-Json -Depth 8 | Out-File -LiteralPath $outPath -Encoding utf8

Write-Host ("Agent prompt written to: {0}" -f $outPath)
