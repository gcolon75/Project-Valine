# Phase 5 Triage Agent - Quick Start Guide

## TL;DR - Run Now

Want to run the Phase 5 Triage Agent on PR #58 right now? Here's how:

### Option 1: GitHub Actions UI (Easiest) ⭐

1. Go to: https://github.com/gcolon75/Project-Valine/actions/workflows/phase5-triage-agent.yml
2. Click **"Run workflow"** (green button)
3. Fill in:
   - **pr_number**: `58`
   - **mode**: `apply-fixes`
   - **allow_invasive_fixes**: `true`
4. Click **"Run workflow"**
5. Wait 1-2 minutes for results

### Option 2: GitHub CLI (Terminal)

```powershell
gh workflow run phase5-triage-agent.yml \
  --ref main \
  --field pr_number=58 \
  --field mode=apply-fixes \
  --field allow_invasive_fixes=true
```

### Option 3: Python Script

```powershell
$env:GITHUB_TOKEN = "your_personal_access_token"
cd orchestrator/scripts
python phase5_triage_agent.py run \
  --repo gcolon75/Project-Valine \
  --failure-ref 58 \
  --auto-fix \
  --allow-invasive
```

## What Will Happen?

1. **Analyzes PR #58** - Fetches logs, identifies failures
2. **Determines root cause** - Categorizes the issue
3. **Proposes a fix** - Generates minimal code changes
4. **Checks for safety** - Scans for secrets, counts changes
5. **Creates a PR** - Opens auto-fix PR with changes
6. **Adds labels** - `auto-triage`, `needs-review`
7. **Assigns you** - @gcolon75 gets notified
8. **Comments on PR #58** - Links to the fix PR

## Safety Features

✅ **Checks for secrets** - Won't commit tokens, passwords, or keys  
✅ **Limits changes** - Max 10 files or 500 lines (creates draft if exceeded)  
✅ **No force push** - Never modifies history  
✅ **Requires approval** - All PRs need manual review before merge  
✅ **Creates backups** - Timestamped branches for easy rollback  

## Output

You'll get:
- **Fix PR** - With detailed description and changes
- **Triage Report** - Markdown and JSON formats
- **Workflow Summary** - In GitHub Actions
- **PR Comment** - On original PR #58

## If Something Goes Wrong

**Rollback**: Just close the auto-fix PR and revert if merged  
**Logs**: Check GitHub Actions logs for details  
**Support**: See `orchestrator/PHASE5_TRIAGE_AUTOMATION_GUIDE.md`

## Advanced Usage

Want more control? See full options:

```powershell
python phase5_triage_agent.py run --help
```

**Dry run** (safe preview):
```powershell
python phase5_triage_agent.py run \
  --repo gcolon75/Project-Valine \
  --failure-ref 58 \
  --auto-fix \
  --dry-run
```

**Triage only** (no changes):
```powershell
python phase5_triage_agent.py run \
  --repo gcolon75/Project-Valine \
  --failure-ref 58
```

## Documentation

- **Full Guide**: `orchestrator/PHASE5_TRIAGE_AUTOMATION_GUIDE.md` (9KB, everything you need)
- **Implementation Summary**: `PHASE5_TRIAGE_AUTOMATION_IMPLEMENTATION.md` (11KB, what was built)
- **Examples**: `orchestrator/scripts/example_auto_triage_usage.sh` (8 examples)
- **README**: `orchestrator/scripts/README.md` (includes triage section)

## That's It!

You're ready to run automated triage and fixes. Start with Option 1 (GitHub Actions UI) for the easiest experience.

**Need help?** Open an issue or check the full guide.

---

**Quick Start Version**: 1.0  
**Last Updated**: 2025-10-17  
**Status**: ✅ Ready to Use
