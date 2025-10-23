# Phase-5 Triage Automation Agent

> **TL;DR:** End-to-end automation for finding, analyzing, and fixing Phase-5 workflow failures. Speedrun mode. No secrets. Production ready. 🚀

## What Is This?

This automation agent implements the complete workflow specified in the problem statement for PR #58. It:

1. ✅ **Authenticates** with GitHub CLI or environment tokens
2. ✅ **Finds** the Phase-5 triage workflow run for any PR
3. ✅ **Downloads** and parses logs (secrets auto-redacted)
4. ✅ **Analyzes** failures with root cause identification
5. ✅ **Creates** prioritized fix plan
6. ✅ **Applies** fixes with comprehensive safety guardrails
7. ✅ **Opens** PR with detailed metadata and labels

## Quick Start (60 seconds)

```bash
# 1. Authenticate
gh auth login

# 2. Run automation
cd /home/runner/work/Project-Valine/Project-Valine
python orchestrator/scripts/auto_triage_pr58.py \
  --repo gcolon75/Project-Valine \
  --pr 58 \
  --mode apply-fixes \
  --allow-invasive

# 3. Review PR
gh pr list --label auto-triage

# Done! 🎉
```

## Files

### Scripts
- **`orchestrator/scripts/auto_triage_pr58.py`** - Main automation agent (700+ lines)
- **`orchestrator/scripts/example_automation_agent_usage.sh`** - Usage examples

### Documentation
- **`AUTO_TRIAGE_QUICKSTART.md`** - Quick start guide (5 minutes)
- **`AUTO_TRIAGE_AUTOMATION_GUIDE.md`** - Complete guide (comprehensive)
- **`AUTO_TRIAGE_AUTOMATION_README.md`** - This file

## Features

### 🔐 Authentication
- GitHub CLI (`gh auth login`)
- Environment variables (`GITHUB_TOKEN` or `GH_PAT`)
- Automatic token scope verification
- Clear error messages if auth fails

### 🔍 Workflow Discovery
- **Primary:** Direct PR number filtering
- **Fallback:** Manual selection from recent runs
- **Alternative:** Uses existing triage agent if no workflow runs found
- Graceful handling of edge cases

### 📥 Log Management
- Downloads via `gh run download` (primary)
- Fallback to GitHub API with `curl`
- Automatic ZIP extraction
- Log concatenation and indexing
- **Secret redaction** (shows only last 4 chars)

### 🎯 Failure Analysis
Detects and categorizes 6 failure types:

| Type | Description | Example |
|------|-------------|---------|
| `test_failure` | Test assertion errors | `FAILED tests/test_foo.py::test_bar` |
| `missing_dependency` | Missing modules | `ModuleNotFoundError: No module named 'requests'` |
| `python_error` | Runtime exceptions | `ValueError: Missing required field` |
| `job_failure` | Generic workflow failures | `Error: Process completed with exit code 1` |
| `workflow_permission` | Permission errors | `403 Resource not accessible by integration` |
| `environment_mismatch` | Config issues | `Node version mismatch` |

Each failure includes:
- **Line number** in logs
- **Context** (5 lines before/after)
- **Confidence score** (1-5)
- **File/line pointers** if available

### 🛠️ Fix Application
With comprehensive safety guardrails:

#### Safety Limits (without `--allow-invasive`)
- ✅ Max 10 files changed
- ✅ Max 500 lines changed
- ✅ Creates **draft PR** if exceeded

#### Safety Checks (always)
- ✅ Secret detection (blocks if found)
- ✅ No auto-merge (human approval required)
- ✅ No force push
- ✅ No history modification
- ✅ Dry-run mode available

#### Branch Naming
```
auto/triage/fix/pr-{number}/{YYYYMMDD-HHMMSS}
```
Example: `auto/triage/fix/pr-58/20251017-223015`

#### Commit Messages
```
auto-triage(pr-58): Install missing requests module

- Added requests to requirements.txt
- Updated lockfile
- Fixes ModuleNotFoundError in Phase-5 triage agent
```

### 📝 PR Creation
Automatic PR with:

**Title:**
```
Auto-fix: Phase‑5 triage fixes for PR #58
```

**Labels:**
- `auto-triage` (always)
- `needs-review` (always)
- `invasive-changes` (if `--allow-invasive` used)

**Assignees:**
- @gcolon75 (repository owner)

**Body includes:**
- TL;DR summary
- Workflow run URL
- Log file location
- Root causes identified (with confidence scores)
- Fixes applied
- Test results
- Safety check status
- Manual review items (if any)

## Usage

### Command-Line Options

```
Required:
  --repo OWNER/REPO          Repository (e.g., gcolon75/Project-Valine)
  --pr NUMBER                PR number (e.g., 58)

Optional:
  --workflow-file PATH       Workflow file path
                            Default: .github/workflows/phase5-triage-agent.yml
  
  --mode MODE               Operation mode
                            Choices: triage-only, apply-fixes
                            Default: apply-fixes
  
  --allow-invasive          Allow changes to >10 files or >500 lines
  
  --dry-run                 Test without committing (recommended first)
```

### Example Commands

**1. Dry Run (Recommended First)**
```bash
python orchestrator/scripts/auto_triage_pr58.py \
  --repo gcolon75/Project-Valine \
  --pr 58 \
  --mode apply-fixes \
  --allow-invasive \
  --dry-run
```

**2. Triage Only**
```bash
python orchestrator/scripts/auto_triage_pr58.py \
  --repo gcolon75/Project-Valine \
  --pr 58 \
  --mode triage-only
```

**3. Conservative Fixes**
```bash
python orchestrator/scripts/auto_triage_pr58.py \
  --repo gcolon75/Project-Valine \
  --pr 58 \
  --mode apply-fixes
# Creates draft PR if >10 files or >500 lines
```

**4. Invasive Fixes (Problem Statement Mode)**
```bash
python orchestrator/scripts/auto_triage_pr58.py \
  --repo gcolon75/Project-Valine \
  --pr 58 \
  --mode apply-fixes \
  --allow-invasive
# Allows any number of files/lines
```

**5. Different PR**
```bash
python orchestrator/scripts/auto_triage_pr58.py \
  --repo gcolon75/Project-Valine \
  --pr 59 \
  --mode apply-fixes
```

**6. Custom Workflow**
```bash
python orchestrator/scripts/auto_triage_pr58.py \
  --repo gcolon75/Project-Valine \
  --pr 58 \
  --workflow-file .github/workflows/custom.yml \
  --mode apply-fixes
```

## Output

### Console Output
Colorized, structured output with clear sections:
```
================================================================================
PRECHECK 1: GitHub Authentication
================================================================================

✓ GitHub CLI is authenticated

================================================================================
STEP 1: Locate Workflow Run for PR #58
================================================================================

ℹ Searching for workflow runs...
✓ Found workflow run: 1234567890
ℹ   Status: completed
ℹ   Conclusion: failure
ℹ   URL: https://github.com/gcolon75/Project-Valine/actions/runs/1234567890

...
```

### Files Generated
```
/tmp/phase5-triage-logs/
├── run-1234567890-logs.zip        # Original download
├── run-1234567890-logs/           # Extracted files
│   ├── triage/1_Run Phase 5 Triage Agent.txt
│   ├── triage/2_Upload triage report.txt
│   └── ...
├── run-1234567890-logs.txt        # Concatenated (secrets redacted)
└── final_report.md                # Complete triage report
```

### Report Format
```markdown
# Phase-5 Triage Automation Final Report

## Workflow Run
- **Run ID:** 1234567890
- **Run URL:** https://github.com/...
- **Status:** Analyzed

## Root Causes
Found 5 potential failures

1. **missing_dependency** (Line 142)
   - Confidence: 5/5
   - Error: ModuleNotFoundError: No module named 'requests'

2. **test_failure** (Line 256)
   - Confidence: 3/5
   - Error: FAILED tests/test_foo.py::test_bar

...

## Fix Plan
1. [HIGH] (Confidence: 5/5)
   - Install missing module: pip install requests

2. [MEDIUM] (Confidence: 3/5)
   - Fix failing test: tests/test_foo.py::test_bar

...

## PR Created
- **Branch:** auto/triage/fix/pr-58/20251017-223015
- **PR URL:** https://github.com/gcolon75/Project-Valine/pull/61

## Log File
- /tmp/phase5-triage-logs/run-1234567890-logs.txt (secrets redacted)
```

## Workflow Steps (Detailed)

### Step 0: Prechecks
**Authentication Check:**
1. Run `gh auth status`
2. Check `GITHUB_TOKEN` env var
3. Check `GH_PAT` env var
4. Exit with clear error if none found

**Token Scopes:**
- Verify `repo` scope
- Verify `workflow` scope
- Exit with instructions if missing

### Step 1: Locate Workflow Run
**Primary Method:**
```bash
gh run list --repo OWNER/REPO \
  --workflow .github/workflows/phase5-triage-agent.yml \
  --limit 100 \
  --json id,status,conclusion,event,headBranch,htmlUrl,pullRequests
```
- Filters by PR number
- Selects most recent match

**Fallback Method:**
- Lists all recent runs
- Displays PR numbers for each
- Uses most recent if no exact match
- Notes uncertainty

**Alternative Approach:**
If no workflow runs found, automatically uses existing triage agent:
```bash
python orchestrator/scripts/phase5_triage_agent.py run \
  --repo OWNER/REPO \
  --failure-ref PR_NUMBER \
  --auto-fix \
  --allow-invasive
```

### Step 2: Download Logs
**Primary Method:**
```bash
gh run download RUN_ID --repo OWNER/REPO --dir logs/
```

**Fallback Method:**
```bash
curl -L -H "Authorization: Bearer $GITHUB_TOKEN" \
  "https://api.github.com/repos/OWNER/REPO/actions/runs/RUN_ID/logs" \
  -o logs.zip
unzip logs.zip
```

**Processing:**
1. Extract ZIP archive
2. Find all `.txt` files
3. Concatenate in order
4. Apply secret redaction
5. Save as single file

### Step 3: Parse & Triage
**Failure Detection:**
Uses regex patterns to find:
- Error messages
- Test failures
- Missing modules
- Python exceptions
- Exit codes
- Permission errors

**Context Extraction:**
For each failure:
- 5 lines before
- Failing line
- 5 lines after

**Confidence Scoring:**
| Score | Meaning |
|-------|---------|
| 5 | Very confident (exact match, clear error) |
| 4 | Confident (strong indicators) |
| 3 | Moderate (pattern match) |
| 2 | Low (weak indicators) |
| 1 | Very low (ambiguous) |

### Step 4: Create Fix Plan
**Prioritization:**
1. High priority, high confidence (5)
2. High priority, medium confidence (3-4)
3. Medium priority, high confidence (5)
4. Medium priority, medium confidence (3-4)
5. Low priority, any confidence (1-5)

**Fix Generation:**
- Missing dependency → `pip install X`
- Test failure → Review test expectations
- Permission error → Add workflow permissions
- Config issue → Update configuration

### Step 5: Apply Fixes
**Safety Checks:**
1. Scan for secrets (block if found)
2. Count files changed
3. Count lines changed
4. Create draft if limits exceeded (without `--allow-invasive`)

**Branch Creation:**
```bash
git fetch origin main
git checkout -b auto/triage/fix/pr-58/YYYYMMDD-HHMMSS
```

**Commit Creation:**
```bash
git add <files>
git commit -m "auto-triage(pr-58): <description>"
```

**Push:**
```bash
git push --set-upstream origin <branch-name>
```

### Step 6: Create PR
**PR Creation:**
```bash
gh pr create \
  --repo OWNER/REPO \
  --title "Auto-fix: Phase‑5 triage fixes for PR #58" \
  --body-file pr_body.txt \
  --label auto-triage \
  --label needs-review \
  --assignee gcolon75
```

**If invasive:**
```bash
--label invasive-changes
```

## Troubleshooting

### Common Issues

**1. AUTH_MISSING**
```
Error: AUTH_MISSING - run 'gh auth login' locally

Solution:
  gh auth login
  # or
  export GITHUB_TOKEN="your_token"
```

**2. No workflow runs found**
```
Warning: No workflow runs found for PR #58

Solution: Script automatically uses existing triage agent
```

**3. Permission denied**
```
Error: 403 Resource not accessible by integration

Solution:
  gh auth refresh -h github.com -s repo,workflow
```

**4. Log download failed**
```
Error: Failed to download logs

Solutions:
  1. Check authentication
  2. Verify run ID exists
  3. Check network connectivity
  4. Script will try API fallback automatically
```

**5. Secret detected**
```
Error: Secret detected in changes

Solution:
  1. Review the commit
  2. Remove the secret
  3. Update code to use environment variables
  4. Retry
```

## Best Practices

### 1. Always Test with Dry Run First
```bash
python orchestrator/scripts/auto_triage_pr58.py \
  --repo gcolon75/Project-Valine \
  --pr 58 \
  --mode apply-fixes \
  --allow-invasive \
  --dry-run
```

### 2. Review PRs Before Merging
- Check files changed
- Verify tests pass
- Review commit messages
- Confirm fixes are appropriate

### 3. Use Conservative Mode Initially
```bash
# Start conservative (draft if >10 files or >500 lines)
python orchestrator/scripts/auto_triage_pr58.py \
  --repo gcolon75/Project-Valine \
  --pr 58 \
  --mode apply-fixes

# Then use invasive if needed
```

### 4. Monitor CI After PR Creation
```bash
gh run watch --repo gcolon75/Project-Valine
```

### 5. Keep Logs Secure
- Never commit log files
- Redact secrets before sharing
- Use secure channels for sensitive data

## Integration

### GitHub Actions
```yaml
name: Auto-Triage PR Failures
on:
  workflow_run:
    workflows: ["Phase 5 Triage Agent"]
    types: [completed]

jobs:
  auto-triage:
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Auto-Triage
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          python orchestrator/scripts/auto_triage_pr58.py \
            --repo ${{ github.repository }} \
            --pr ${{ github.event.workflow_run.pull_requests[0].number }} \
            --mode apply-fixes
```

### CI/CD Pipeline
```bash
#!/bin/bash
# auto_triage_hook.sh

# Triggered on PR workflow failure
PR_NUMBER=$1

python orchestrator/scripts/auto_triage_pr58.py \
  --repo gcolon75/Project-Valine \
  --pr "$PR_NUMBER" \
  --mode apply-fixes \
  --allow-invasive
```

## FAQ

**Q: Can I use this for other PRs?**

A: Yes! Just change the `--pr` parameter.

**Q: What if the workflow hasn't run?**

A: The script automatically falls back to the existing triage agent.

**Q: How do I revert auto-applied fixes?**

A: Close the PR and delete the branch:
```bash
gh pr close <pr-number>
git push origin --delete auto/triage/fix/pr-58/<timestamp>
```

**Q: Can I customize branch naming?**

A: Yes, edit the `apply_fixes()` function in the script.

**Q: What permissions does my token need?**

A: `repo` and `workflow` scopes.

## Support

For issues or questions:
1. Check [AUTO_TRIAGE_AUTOMATION_GUIDE.md](./AUTO_TRIAGE_AUTOMATION_GUIDE.md)
2. Check [AUTO_TRIAGE_QUICKSTART.md](./AUTO_TRIAGE_QUICKSTART.md)
3. Review script source code
4. Create GitHub issue

## License

Part of Project-Valine. See repository license.

---

**Version:** 1.0.0  
**Status:** Production Ready ✅  
**Last Updated:** 2025-10-17
