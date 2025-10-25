# Purpose: Generate an AI agent prompt to diagnose simple script accidents blocking Discord command registration for Rin (staging).
# Style: Speedrun-friendly. Windows PowerShell 5 compatible. ASCII only.
# Output: .agent/rin_scripts_diagnose_prompt.json (problem_title + problem_statement)

[CmdletBinding()]
param(
  [string]$Repo = "gcolon75/Project-Valine",
  [string]$OutDir = ".\.agent",
  [string]$AppId_Rin = "1428568840958251109",          # Rin (staging) App ID
  [string]$KnownGuildId_ProbablyCorrect = "1407810581532250233", # Suspected staging guild ID per docs
  [string]$KnownChannelId_DoNotUseAsGuild = "1428102811832553554" # Commonly mistaken channel ID
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

if (-not (Test-Path -LiteralPath $OutDir)) {
  New-Item -ItemType Directory -Path $OutDir | Out-Null
}

# Compact, no-fluff title
$problem_title = "Rin (staging): Diagnose and fix simple script accidents blocking Discord command registration"

# Straight-to-the-point problem statement
$problem_statement = @"
Context
- Repository: $Repo
- Target bot: Rin (Application ID: $AppId_Rin) - STAGING ONLY
- Primary envs: STAGING_DISCORD_APPLICATION_ID, STAGING_DISCORD_BOT_TOKEN, STAGING_GUILD_ID
- Known ID gotchas:
  * Channel ID (do NOT use as guild): $KnownChannelId_DoNotUseAsGuild
  * Likely guild ID (docs): $KnownGuildId_ProbablyCorrect
- User workflow should be Windows-friendly (PowerShell 5) and guild commands (instant visibility), no global commands.

Mission (speedrun)
Perform a read-only audit of orchestrator/scripts and related registration scripts to find simple accidents that explain why new slash commands (e.g., /ux-update) are not reliably appearing or sticking for Rin. Keep blast radius small and propose minimal, surgical fixes.

Scope to inspect (read-only)
- orchestrator/scripts/*.ps1, *.sh, *.py
- orchestrator/register_*.py and orchestrator/register_*.sh
- orchestrator/register_slash_commands_agent.py
- orchestrator/app/agents/discord_slash_cmd_agent.py (for reference on expected behavior)
- Anything under docs/ that might mislead env usage or token formatting

What to detect (common mini-bosses)
1) Env var drift and naming collisions
   - STAGING_GUILD_ID vs STAGING_DISCORD_GUILD_ID vs DISCORD_GUILD_ID_STAGING vs DISCORD_GUILD_ID
   - STAGING_DISCORD_APPLICATION_ID vs STAGING_BOT_ID (non-standard)
   - Scripts that only read generic DISCORD_* and ignore STAGING_* (or vice versa)
   - Acceptance: produce clear map per-script of which vars it reads and recommend a staging-first canonical set with fallbacks.

2) Channel ID vs Guild ID mixups
   - Hardcoded use of $KnownChannelId_DoNotUseAsGuild as a guild ID
   - Any literals for guild id where env should be used
   - Acceptance: list all occurrences and propose swapping to env; highlight any exact mistaken usages.

3) Endpoint and method pitfalls
   - Global endpoint used for staging flows (applications/{app}/commands) -> 1h delay
   - Guild endpoint missing for staging (applications/{app}/guilds/{guild}/commands)
   - Mass PUT overwrites the entire guild command set without full payload
   - Safer upsert pattern: POST for create, PATCH for update
   - Acceptance: per-script endpoint+method matrix with recommendations (prefer guild + POST/PATCH; avoid bulk PUT unless full set provided).

4) Token handling
   - Secrets that include "Bot " prefix inside the token itself (bad)
   - Header building that incorrectly double-prefixes or omits "Bot "
   - Acceptance: for each script, confirm header formation is Authorization: Bot <raw_token> and docs do not instruct storing "Bot " in secrets.

5) PowerShell 5 compatibility
   - Ternary operator ? : in .ps1 (not supported on Windows PowerShell 5)
   - Non-ASCII emoji in Write-Host that may cause parsing/logging issues
   - Acceptance: flag all offenders and show minimal code fix (plain if/else, ASCII only).

6) Command definition mismatches
   - /ux-update options: command, description, conversation_id, confirm
   - Any mismatch between registration script definitions and handler/agent expectations
   - Acceptance: list diffs and propose the exact option schema to use.

7) Legacy vs new tool paths
   - validate_discord_slash_commands.py using POST-per-command vs agent using bulk PUT
   - Risk of one tool wiping another's commands
   - Acceptance: recommend one consistent path for staging (guild + upsert), plus a simple Windows PS entry point.

Deliverables to produce (do not change repo by default)
A) Markdown report (ASCII) at ./discord_cmd_evidence/scripts_diagnosis_report.md containing:
   - TLDR: 5 lines tops
   - Findings by category (env drift, IDs, endpoints/methods, token, PS5, command schema)
   - Quick wins: 3-7 bullet fixes, smallest possible to unblock registration

B) JSON findings at ./discord_cmd_evidence/scripts_diagnosis_report.json containing:
   - Per-file issues: {file, issue_kind, severity, line_refs or snippets}
   - A normalized env var usage table across scripts
   - Endpoint/method usage table across scripts
   - Command schema diffs for ux-update and others

C) Optional quickfix patch set (separate section in the MD, and unified diff files in ./discord_cmd_evidence/patches/):
   - Standardize env access: prefer STAGING_* with fallbacks to DISCORD_* names
   - Replace any channel-id-as-guild-id literals with env reads
   - Switch global registration to guild registration for staging scripts
   - Replace bulk PUT with POST/PATCH upsert unless full set is provided
   - Remove PS5-incompatible ternary in .ps1
   - Align /ux-update schema with handler

Constraints
- STAGING ONLY. Do not create global commands. Do not modify production config or secrets.
- Default to read-only. If proposing code changes, output as patch files, do not commit.
- PowerShell-first user path. If you generate helpers, prefer .ps1 ASCII-only.

Acceptance criteria
- Clear, concise MD report + JSON emitted under ./discord_cmd_evidence/.
- All simple accidents called out with file and suggested one-liner fixes.
- Explicit callout if $KnownChannelId_DoNotUseAsGuild appears where a guild id should be used.
- A single recommended, Windows-friendly, guild upsert flow summarized (no mass wipe).
- Zero code changes made unless user opts-in to apply patches.

Nice-to-have (if time)
- Generate a tiny Windows PS validator snippet to list current guild commands and highlight missing ones, no ternary, ASCII only.

Assumptions
- Rin is already in the staging guild.
- Bot token is valid and stored without the "Bot " prefix.
- Network access may be restricted; the analysis should not depend on live API calls.

Output format vibe
- Keep it crisp. Short sections. No walls of text. Think raid leader callouts, not a novel.

"@

# Write prompt JSON
$prompt = [pscustomobject]@{
  problem_title = $problem_title
  problem_statement = $problem_statement
  repository = $Repo
}

$outPath = Join-Path $OutDir "rin_scripts_diagnose_prompt.json"
$prompt | ConvertTo-Json -Depth 6 | Out-File -LiteralPath $outPath -Encoding utf8

Write-Host ("Agent prompt written to: {0}" -f $outPath)
Write-Host "Pro tip: feed this to your AI coding agent. Loot target: quick MD+JSON report and tiny patch set. GG."
