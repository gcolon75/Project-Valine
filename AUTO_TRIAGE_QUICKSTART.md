# Phase-5 Triage Automation - Quick Start

**TL;DR:** Analyze and auto-fix failed workflow runs in 3 commands. Speedrun mode activated. 🚀

## Prerequisites (30 seconds)

```bash
# 1. Install GitHub CLI (if not installed)
brew install gh  # macOS
# or: sudo apt install gh  # Linux

# 2. Authenticate
gh auth login

# 3. Verify
gh auth status
# Should show: "Logged in to github.com"
```

## Usage (5 commands)

### 1. Navigate to repo
```bash
cd /home/runner/work/Project-Valine/Project-Valine
```

### 2. Test with dry-run (recommended first)
```bash
python orchestrator/scripts/auto_triage_pr58.py \
  --repo gcolon75/Project-Valine \
  --pr 58 \
  --mode apply-fixes \
  --allow-invasive \
  --dry-run
```

### 3. Apply fixes for real
```bash
python orchestrator/scripts/auto_triage_pr58.py \
  --repo gcolon75/Project-Valine \
  --pr 58 \
  --mode apply-fixes \
  --allow-invasive
```

### 4. Review the PR
```bash
gh pr list --repo gcolon75/Project-Valine --label auto-triage
```

### 5. Monitor CI
```bash
gh run watch --repo gcolon75/Project-Valine
```

## What It Does

1. ✅ **Finds** the Phase-5 triage workflow run for PR #58
2. ✅ **Downloads** and parses logs (secrets auto-redacted)
3. ✅ **Analyzes** failures (root cause + confidence score)
4. ✅ **Creates** prioritized fix plan
5. ✅ **Applies** fixes with safety guardrails
6. ✅ **Opens** PR with comprehensive metadata

## Safety Guardrails

- ✅ Never commits secrets
- ✅ Max 10 files changed (unless `--allow-invasive`)
- ✅ Max 500 lines changed (unless `--allow-invasive`)
- ✅ Draft PR if limits exceeded
- ✅ All PRs require human approval
- ✅ Dry-run mode available

## Output

```
/tmp/phase5-triage-logs/
├── run-{RUN_ID}-logs.txt         # Concatenated logs (redacted)
├── final_report.md               # Complete triage report
└── run-{RUN_ID}-logs/            # Raw log files
```

## Troubleshooting

### "AUTH_MISSING" error
```bash
gh auth login
# or
export GITHUB_TOKEN="your_token"
```

### "No workflow runs found"
The script automatically falls back to using the existing triage agent directly:
```bash
# This happens automatically, but you can also run manually:
python orchestrator/scripts/phase5_triage_agent.py run \
  --repo gcolon75/Project-Valine \
  --failure-ref 58 \
  --auto-fix \
  --allow-invasive
```

### "Permission denied"
```bash
gh auth refresh -h github.com -s repo,workflow
```

## Options

```bash
# Required
--repo OWNER/REPO          # Repository to analyze
--pr NUMBER                # PR number

# Optional
--mode triage-only         # Don't apply fixes (default: apply-fixes)
--allow-invasive           # Allow >10 files or >500 lines changes
--dry-run                  # Test without committing
```

## Examples

**Triage only (no fixes):**
```bash
python orchestrator/scripts/auto_triage_pr58.py \
  --repo gcolon75/Project-Valine \
  --pr 58 \
  --mode triage-only
```

**Conservative fixes:**
```bash
python orchestrator/scripts/auto_triage_pr58.py \
  --repo gcolon75/Project-Valine \
  --pr 58 \
  --mode apply-fixes
# Creates draft PR if >10 files or >500 lines
```

**Aggressive fixes:**
```bash
python orchestrator/scripts/auto_triage_pr58.py \
  --repo gcolon75/Project-Valine \
  --pr 58 \
  --mode apply-fixes \
  --allow-invasive
# Allows any number of files/lines
```

## Next Steps

- ✅ Review the auto-created PR
- ✅ Check CI status
- ✅ Merge after approval

For detailed documentation, see: [AUTO_TRIAGE_AUTOMATION_GUIDE.md](./AUTO_TRIAGE_AUTOMATION_GUIDE.md)

---

**Get started in 60 seconds. No drama. No secrets. Production ready.** ✨
