# Operational Readiness Agent - Quick Start

Get your Discord AI triage system validated in 3 minutes! 🚀

## TL;DR

```powershell
cd orchestrator/scripts
python3 operational_readiness_agent.py run
# Review the report, then follow the action plan
```

## Prerequisites

- Python 3.7+
- Access to Project Valine repository
- (Optional) `GITHUB_TOKEN` for PR analysis

## Quick Start Steps

### Step 1: Run the Agent (2 min)

```powershell
cd orchestrator/scripts
python3 operational_readiness_agent.py run --repo gcolon75/Project-Valine
```

**What it does:**
- ✅ Discovers all entry points and slash commands
- ✅ Checks for hardcoded secrets
- ✅ Scans GitHub Actions workflows
- ✅ Counts tests and identifies flaky ones
- ✅ Generates comprehensive report

### Step 2: Review the Report (1 min)

Check the console output or generated files:

```powershell
# View latest markdown report
Get-Content readiness_evidence/operational_readiness_report_*.md | tail -100

# Or open the JSON report
Get-Content readiness_evidence/operational_readiness_report_*.json | jq .
```

**Key sections:**
1. **Summary** - Pass/fail status at a glance
2. **Findings** - What was discovered
3. **Action Plan** - What to do next (prioritized)
4. **Evidence** - Proof with file paths

### Step 3: Follow the Action Plan

The report includes a prioritized action plan. Typical steps:

#### Priority 1: Verify Secrets (5 min)
```
Go to: https://github.com/gcolon75/Project-Valine/settings/secrets/actions
Verify these secrets exist:
- STAGING_DISCORD_BOT_TOKEN
- STAGING_DISCORD_APPLICATION_ID  
- STAGING_DISCORD_GUILD_ID
- GITHUB_TOKEN
```

#### Priority 2: Register Commands (10 min)
```powershell
cd ../..  # Back to orchestrator/
./register_discord_commands_staging.sh
```

#### Priority 3: Run Smoke Tests (5 min)
```powershell
gh workflow run bot-smoke.yml --ref main
# Or use GitHub UI: Actions → Bot Smoke Tests → Run workflow
```

## Advanced Usage

### With GitHub Token (for PR analysis)

```powershell
$env:GITHUB_TOKEN = "ghp_your_token_here"
python3 operational_readiness_agent.py run
```

**Benefits:**
- Analyzes PRs #50-71 for flaky tests
- More detailed workflow scanning
- Better secret mapping

### With Test PR (for E2E validation)

```powershell
python3 operational_readiness_agent.py run --test-pr 71
```

**What you get:**
- Step-by-step E2E test guide
- Commands to trigger /triage in Discord
- Instructions for monitoring workflow runs
- Draft PR verification steps

### Using a Config File

```powershell
# Generate example config
python3 operational_readiness_agent.py generate-config

# Edit operational_readiness_config.json
nano operational_readiness_config.json

# Run with config
python3 operational_readiness_agent.py run --config operational_readiness_config.json
```

## Understanding the Output

### Success Indicators

```
✅ Found 6 entry points and 69 slash commands
✅ No hardcoded secrets found in code
✅ All 27 workflow secrets are documented
```

### Warning Indicators

```
⚠️  Found 2 potential secret leaks
⚠️  25 secrets referenced but not documented
⚠️  Missing Guardrails: Enforce draft-only PR creation
```

### Report Structure

```
================================================================================
On it — running repo recon now.
================================================================================

[Progress messages with emojis and timestamps]

================================================================================
🚀 OPERATIONAL READINESS VALIDATION REPORT
================================================================================

📊 SUMMARY
[3-line status summary]

🔍 FINDINGS
[Bulleted discoveries]

📋 ACTION PLAN
[Prioritized steps with time estimates]

📁 EVIDENCE
[File paths, command lists, policy checks]

❓ May I create draft PRs for low-risk fixes? (Yes/No)
================================================================================
```

## Common Workflows

### Daily Health Check

```powershell
# Quick morning check
python3 operational_readiness_agent.py run > daily_check.log
Select-String "⚠️" daily_check.log  # Any warnings?
```

### Pre-Release Validation

```powershell
# Full validation with test PR
$env:GITHUB_TOKEN = "..."
python3 operational_readiness_agent.py run --test-pr 71 --verbose
```

### Security Audit

```powershell
# Focus on secrets and guardrails
python3 operational_readiness_agent.py run
# Review "Secret Checks" and "Draft PR Policies" sections
```

### CI/CD Integration

```powershell
# In GitHub Actions workflow:
- name: Operational Readiness Check
  run: |
    cd orchestrator/scripts
    python3 operational_readiness_agent.py run
```

## Troubleshooting

### "No module named 'requests'"

**Not needed!** The agent uses Python standard library only.

### "Missing required environment variables"

Only needed if running registration:
```powershell
$env:STAGING_DISCORD_BOT_TOKEN = "your_token"
$env:STAGING_DISCORD_APPLICATION_ID = "your_app_id"
$env:STAGING_DISCORD_GUILD_ID = "your_guild_id"
```

### "Could not analyze PR"

Need GitHub token for PR analysis:
```powershell
$env:GITHUB_TOKEN = "ghp_your_token"
```

### Report says "unmapped secrets"

Add missing secrets to:
1. GitHub Secrets (Settings → Secrets)
2. Example config files (.env.example)

## Next Steps

After your first run:

1. ✅ **Share report** with team
2. ✅ **Create action items** from high-priority findings
3. ✅ **Set up scheduled runs** (daily or weekly)
4. ✅ **Update secrets** based on findings
5. ✅ **Strengthen guardrails** if missing

## Help & Documentation

- **Full README**: `OPERATIONAL_READINESS_AGENT_README.md`
- **Help command**: `python3 operational_readiness_agent.py --help`
- **Config generation**: `python3 operational_readiness_agent.py generate-config`

## Examples

### Example 1: Basic Run

```powershell
$ python3 operational_readiness_agent.py run

On it — running repo recon now.

2025-10-20 01:07:44 UTC ⏳ Running repo recon now.
2025-10-20 01:07:44 UTC ✅ Repo recon complete: 6 entry points, 69 slash commands found
...
✅ Report generation complete!
```

### Example 2: With Test PR

```powershell
$ python3 operational_readiness_agent.py run --test-pr 71

On it — running repo recon now.
...
✅ E2E test guide prepared with 6 steps
...
```

### Example 3: Generate Config

```powershell
$ python3 operational_readiness_agent.py generate-config

✅ Example configuration saved to: operational_readiness_config.json

Edit this file and run:
  python operational_readiness_agent.py run --config operational_readiness_config.json
```

---

**Remember**: The agent is safe by default - read-only, no invasive actions without your permission! 🎮✨

Questions? Check `OPERATIONAL_READINESS_AGENT_README.md` for detailed docs.
