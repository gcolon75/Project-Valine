# Rin Discord Command Registration Diagnostic Prompt Generator

## Overview

This PowerShell script generates an AI agent prompt JSON file designed to diagnose simple script accidents that may be blocking Discord slash command registration for the Rin (staging) bot.

## Purpose

The generated prompt guides an AI coding agent to:
- Audit orchestrator/scripts for common registration issues
- Identify environment variable drift and naming collisions
- Detect channel ID vs guild ID mixups
- Find endpoint and method pitfalls
- Check token handling issues
- Identify PowerShell 5 compatibility problems
- Find command definition mismatches
- Generate actionable diagnostic reports

## Usage

### Basic Usage

Run from the repository root:

```powershell
.\generate_rin_diagnose_prompt.ps1
```

This creates `.agent/rin_scripts_diagnose_prompt.json` with default parameters.

### Custom Parameters

```powershell
.\generate_rin_diagnose_prompt.ps1 `
    -Repo "your-org/your-repo" `
    -OutDir ".\.custom-agent" `
    -AppId_Rin "1234567890123456789" `
    -KnownGuildId_ProbablyCorrect "9876543210987654321" `
    -KnownChannelId_DoNotUseAsGuild "1111111111111111111"
```

### Parameters

- **Repo**: Repository name (default: "gcolon75/Project-Valine")
- **OutDir**: Output directory for the JSON file (default: ".\.agent")
- **AppId_Rin**: Rin (staging) Discord Application ID (default: "1428568840958251109")
- **KnownGuildId_ProbablyCorrect**: Expected staging guild ID (default: "1407810581532250233")
- **KnownChannelId_DoNotUseAsGuild**: Channel ID that should NOT be used as guild ID (default: "1428102811832553554")

## Output

The script generates a JSON file containing:
- `problem_title`: Brief description of the diagnostic task
- `problem_statement`: Comprehensive agent instructions including:
  - Context and known ID gotchas
  - Mission and scope to inspect
  - Common issues to detect (7 categories)
  - Expected deliverables (MD report, JSON findings, optional patches)
  - Constraints and acceptance criteria
- `repository`: Repository identifier

## Compatibility

- **Windows PowerShell 5.1+** compatible
- **ASCII-only** output for maximum compatibility
- No ternary operators or other PS7+ features
- UTF-8 encoding for JSON output

## Integration with AI Coding Agents

Feed the generated JSON to your AI coding agent to receive:

1. **Markdown Report** (`./discord_cmd_evidence/scripts_diagnosis_report.md`):
   - TLDR summary (5 lines max)
   - Findings by category
   - Quick wins and surgical fixes

2. **JSON Findings** (`./discord_cmd_evidence/scripts_diagnosis_report.json`):
   - Per-file issues with line references
   - Environment variable usage table
   - Endpoint/method usage matrix
   - Command schema comparisons

3. **Optional Patches** (`./discord_cmd_evidence/patches/`):
   - Unified diff files for suggested fixes
   - Non-destructive by default

## Related Tools

- `orchestrator/scripts/rin_register_commands.ps1` - PowerShell command registration tool
- `orchestrator/scripts/validate_discord_slash_commands.py` - Python validation tool
- `orchestrator/register_slash_commands_agent.py` - Agent-based registration tool

## Target Issues

The diagnostic prompt helps identify:
- Environment variable inconsistencies (STAGING_* vs DISCORD_*)
- Hardcoded IDs where environment variables should be used
- Global endpoints used instead of guild endpoints
- PUT operations that may wipe commands
- Token prefix issues ("Bot " handling)
- PowerShell compatibility problems
- Command schema mismatches

## Constraints

- **STAGING ONLY** - Diagnostic scope limited to staging bot
- **READ-ONLY by default** - Patch files generated, not auto-applied
- **Guild commands preferred** - Instant visibility vs 1-hour global propagation

## Example Workflow

1. Generate the prompt:
   ```powershell
   .\generate_rin_diagnose_prompt.ps1
   ```

2. Review the generated file:
   ```powershell
   Get-Content .\.agent\rin_scripts_diagnose_prompt.json | ConvertFrom-Json | Format-List
   ```

3. Feed to your AI coding agent for analysis

4. Review generated reports in `./discord_cmd_evidence/`

5. Apply patches if recommended and validated

## Notes

- The `.agent/` directory is in `.gitignore` (output files not committed)
- Generated prompt is self-contained and comprehensive
- Diagnostic approach is "speedrun-friendly" with focused quick wins
- Output format is "raid leader callouts" style - crisp and actionable

## Last Updated

2025-10-25
