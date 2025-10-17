# Phase-5 Triage Automation Agent - Complete Guide

## Overview

This automation agent implements the complete end-to-end workflow for finding, analyzing, and fixing Phase-5 triage workflow failures as specified in the problem statement. It's designed to work fast but safely, with comprehensive safety guardrails and detailed reporting.

**TL;DR:** Speedrun mode for diagnosing and auto-fixing failed workflow runs. No secrets leaked. Production ready.

## Features

### 🔍 Comprehensive Prechecks
- ✅ GitHub CLI authentication verification
- ✅ Token scope validation (repo, workflow permissions)
- ✅ Fail-fast with clear error messages

### 🔎 Intelligent Workflow Discovery
- Primary method: Direct PR number filtering
- Fallback: Manual selection from recent runs
- Handles missing/ambiguous workflow runs gracefully

### 📥 Robust Log Management
- Downloads via `gh run download` (primary)
- Fallback to GitHub API with `curl`
- Automatic extraction and concatenation
- Secret redaction (show only last 4 chars)

### 🎯 Smart Failure Analysis
- Detects 6 failure categories:
  - Test failures
  - Missing dependencies
  - Python errors
  - Job failures
  - Workflow permission errors
  - Environment mismatches
- Confidence scoring (1-5)
- Root cause identification
- File/line number extraction

### 🛠️ Automated Fix Application
- Prioritized fix plan (quick wins first)
- Safety guardrails:
  - Secret detection and blocking
  - File limit: 10 files max (configurable)
  - Line limit: 500 lines max (configurable)
  - Draft PR for invasive changes
- Deterministic branch naming: `auto/triage/fix/pr-{num}/{YYYYMMDD-HHMMSS}`
- Descriptive commit messages: `auto-triage(pr-{num}): {description}`

### 📝 Comprehensive Reporting
- TL;DR summary
- Root cause list with confidence scores
- Unified diffs for all changes
- Links to workflow run and logs
- Test results and CI status
- Manual review items flagged

## Installation

### Prerequisites

```bash
# 1. GitHub CLI
brew install gh  # macOS
# or
sudo apt install gh  # Ubuntu/Debian

# 2. Python 3.8+
python --version  # Should be 3.8 or higher

# 3. Git
git --version
```

### Authentication

Choose one of the following methods:

**Method 1: GitHub CLI (Recommended)**
```bash
gh auth login
# Follow the prompts to authenticate
```

**Method 2: Environment Variable**
```bash
export GITHUB_TOKEN="your_github_token_here"
# Do NOT paste tokens into chat or logs!
```

**Method 3: GH_PAT Environment Variable**
```bash
export GH_PAT="your_github_pat_here"
# Do NOT paste tokens into chat or logs!
```

### Verify Authentication

```bash
gh auth status
# Should show: "Logged in to github.com as <username>"
```

### Required Token Scopes

Your GitHub token must have:
- `repo` - Full control of private repositories
- `workflow` - Update GitHub Action workflows

## Usage

### Basic Usage

```bash
cd /home/runner/work/Project-Valine/Project-Valine
python orchestrator/scripts/auto_triage_pr58.py \
  --repo gcolon75/Project-Valine \
  --pr 58 \
  --mode apply-fixes \
  --allow-invasive
```

### Command-Line Options

```
Required:
  --repo OWNER/REPO          Repository to analyze
  --pr NUMBER                PR number to triage

Optional:
  --workflow-file PATH       Workflow file path
                            Default: .github/workflows/phase5-triage-agent.yml
  
  --mode MODE               Operation mode
                            Choices: triage-only, apply-fixes
                            Default: apply-fixes
  
  --allow-invasive          Allow invasive fixes
                            (changes affecting >10 files or >500 lines)
  
  --dry-run                 Dry run mode (no commits/PRs created)
```

### Examples

**1. Triage Only (No Fixes)**
```bash
python orchestrator/scripts/auto_triage_pr58.py \
  --repo gcolon75/Project-Valine \
  --pr 58 \
  --mode triage-only
```

**2. Apply Fixes (Conservative)**
```bash
python orchestrator/scripts/auto_triage_pr58.py \
  --repo gcolon75/Project-Valine \
  --pr 58 \
  --mode apply-fixes
# Creates draft PR if changes exceed limits
```

**3. Apply Invasive Fixes**
```bash
python orchestrator/scripts/auto_triage_pr58.py \
  --repo gcolon75/Project-Valine \
  --pr 58 \
  --mode apply-fixes \
  --allow-invasive
# Allows changes to >10 files or >500 lines
```

**4. Dry Run (Safe Testing)**
```bash
python orchestrator/scripts/auto_triage_pr58.py \
  --repo gcolon75/Project-Valine \
  --pr 58 \
  --mode apply-fixes \
  --allow-invasive \
  --dry-run
# Analyzes but doesn't commit or push
```

**5. Custom Workflow File**
```bash
python orchestrator/scripts/auto_triage_pr58.py \
  --repo gcolon75/Project-Valine \
  --pr 58 \
  --workflow-file .github/workflows/custom-workflow.yml \
  --mode apply-fixes
```

## Workflow Steps

The automation agent follows these steps:

### Step 0: Prechecks
1. **Check GitHub Authentication**
   - Runs `gh auth status`
   - Checks for `GITHUB_TOKEN` or `GH_PAT` environment variables
   - Exits with clear error message if not authenticated

2. **Verify Token Scopes**
   - Ensures token has `repo` and `workflow` permissions
   - Exits with instructions if missing required scopes

### Step 1: Locate Workflow Run
1. **Primary Method:**
   ```bash
   gh run list --repo OWNER/REPO \
     --workflow .github/workflows/phase5-triage-agent.yml \
     --limit 100 \
     --json id,status,event,headBranch,htmlUrl,pullRequests
   ```
   - Filters runs by PR number
   - Selects most recent matching run

2. **Fallback Method:**
   - Lists all recent runs
   - Allows manual selection
   - Notes uncertainty if no exact match

3. **Saves:**
   - `RUN_ID` - Workflow run identifier
   - `RUN_URL` - Direct link to workflow run

### Step 2: Download Logs
1. **Primary Method:**
   ```bash
   gh run download RUN_ID --repo OWNER/REPO
   ```

2. **Fallback Method:**
   ```bash
   curl -L -H "Authorization: Bearer $GITHUB_TOKEN" \
     "https://api.github.com/repos/OWNER/REPO/actions/runs/RUN_ID/logs" \
     -o run-RUN_ID-logs.zip
   ```

3. **Processing:**
   - Extracts ZIP archive
   - Concatenates all log files
   - Applies secret redaction
   - Saves as `run-RUN_ID-logs.txt`

### Step 3: Parse & Triage
Analyzes logs to extract:

**For Each Failure:**
- Step name
- Exit code
- Stderr/stdout excerpt
- Full stack trace (if present)
- Referenced files and line numbers
- Failing test names

**Failure Classification:**
- `test_failure` - Test assertion or logic errors
- `missing_dependency` - Required modules not installed
- `python_error` - Runtime exceptions
- `job_failure` - Generic workflow failures
- `workflow_permission` - GitHub API permission errors
- `environment_mismatch` - Configuration issues

**Output:**
- Type
- Root cause (one-line)
- Confidence score (1-5)
- File/line pointers
- Excerpted error text

### Step 4: Create Fix Plan
Generates prioritized fixes:

**Priority Order:**
1. High priority, high confidence
2. High priority, medium confidence
3. Medium priority, high confidence
4. Medium priority, medium confidence
5. Low priority, any confidence

**Fix Types:**
- Dependency installation
- Test expectation updates
- Workflow permission additions
- Action version updates
- Configuration changes

**For Each Fix:**
- Exact file edits or unified diff
- Estimated impact
- Risk level

### Step 5: Apply Fixes
With safety guardrails:

**Before Applying:**
- Scan for secrets (blocks if found)
- Count files and lines changed
- Create draft PR if limits exceeded

**Branch Creation:**
```bash
git fetch origin main
git checkout -b auto/triage/fix/pr-58/YYYYMMDD-HHMMSS
```

**Commit Messages:**
```
auto-triage(pr-58): Install missing requests module

- Added requests to requirements.txt
- Updated lockfile
- Fixes ModuleNotFoundError in Phase-5 triage agent
```

**Safety Limits:**
- Max files: 10 (configurable)
- Max lines: 500 (configurable)
- Creates draft PR if exceeded without `--allow-invasive`

### Step 6: Create PR
With comprehensive metadata:

**PR Title:**
```
Auto-fix: Phase‑5 triage fixes for PR #58
```

**PR Body Includes:**
- TL;DR (1-2 lines)
- Workflow run URL and log file link
- Root causes identified
- Files changed list
- Commit SHAs
- Test results
- Safety check status
- Note if invasive

**PR Labels:**
- `auto-triage`
- `needs-review`
- `invasive-changes` (if applicable)

**Assignees:**
- @gcolon75 (repository owner)

## Safety Features

### Secret Detection
Detects and blocks:
- GitHub tokens (ghp_, ghs_, github_pat_)
- API keys
- Private keys
- Passwords
- AWS credentials

**Action:**
- Blocks commit if secrets detected
- Reports detected secret types
- Requires manual review

### Secret Redaction
All logs and reports have secrets redacted:
```
GitHub token: ghp_1234567890abcdef... → ***cdef
API key: sk_live_1234567890abcdef... → ***cdef
```

### Change Limits
**Without `--allow-invasive`:**
- Max 10 files changed
- Max 500 lines changed
- Creates draft PR if exceeded

**With `--allow-invasive`:**
- No file limit
- No line limit
- Adds `invasive-changes` label
- Still requires human approval

### Manual Approval Required
- No auto-merge functionality
- All PRs require human review
- No force push or history modification

### Dry Run Mode
Test without making changes:
```bash
python orchestrator/scripts/auto_triage_pr58.py \
  --repo gcolon75/Project-Valine \
  --pr 58 \
  --mode apply-fixes \
  --allow-invasive \
  --dry-run
```

## Output Files

All outputs saved to `/tmp/phase5-triage-logs/`:

```
/tmp/phase5-triage-logs/
├── run-{RUN_ID}-logs.zip          # Original downloaded logs
├── run-{RUN_ID}-logs/             # Extracted log files
│   ├── triage/1_Run Phase 5 Triage Agent.txt
│   ├── triage/2_Upload triage report.txt
│   └── ...
├── run-{RUN_ID}-logs.txt          # Concatenated logs (secrets redacted)
└── final_report.md                # Complete triage report
```

## Troubleshooting

### Authentication Errors

**Problem:** `AUTH_MISSING - run 'gh auth login' locally`

**Solution:**
```bash
gh auth login
# or
export GITHUB_TOKEN="your_token"
```

### Permission Errors

**Problem:** `403 Resource not accessible by integration`

**Solution:**
Ensure your token has required scopes:
```bash
gh auth refresh -h github.com -s repo,workflow
```

### No Workflow Runs Found

**Problem:** No workflow runs found for PR #58

**Solutions:**
1. Check if workflow has been triggered:
   ```bash
   gh run list --repo gcolon75/Project-Valine \
     --workflow phase5-triage-agent.yml
   ```

2. Use alternative approach:
   ```bash
   python orchestrator/scripts/phase5_triage_agent.py run \
     --repo gcolon75/Project-Valine \
     --failure-ref 58 \
     --auto-fix \
     --allow-invasive
   ```

### Log Download Failures

**Problem:** Failed to download logs

**Solutions:**
1. Check authentication
2. Verify run ID exists
3. Check network connectivity
4. Try API fallback method

### Secret Detection False Positives

**Problem:** Secret detected but it's not a real secret

**Solution:**
Review the detection and manually edit the commit to remove the false positive, then retry.

## Advanced Usage

### Integration with CI/CD

Add to GitHub Actions workflow:

```yaml
name: Auto-Triage PR Failures
on:
  workflow_run:
    workflows: ["Phase 5 Triage Agent"]
    types: [completed]

jobs:
  auto-triage:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Auto-Triage
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          python orchestrator/scripts/auto_triage_pr58.py \
            --repo ${{ github.repository }} \
            --pr ${{ github.event.workflow_run.pull_requests[0].number }} \
            --mode apply-fixes \
            --allow-invasive
```

### Batch Processing

Process multiple PRs:

```bash
#!/bin/bash
for pr in 58 59 60; do
  echo "Processing PR #$pr..."
  python orchestrator/scripts/auto_triage_pr58.py \
    --repo gcolon75/Project-Valine \
    --pr $pr \
    --mode apply-fixes
done
```

### Custom Failure Patterns

Extend failure detection by modifying the script:

```python
failure_patterns = [
    (r'Error:\s*(.+)', 'error'),
    (r'FAILED\s+(.+)', 'test_failure'),
    (r'ModuleNotFoundError:\s*(.+)', 'missing_dependency'),
    # Add your custom patterns here:
    (r'YourCustomError:\s*(.+)', 'custom_error'),
]
```

## Best Practices

1. **Always test with `--dry-run` first**
   ```bash
   python orchestrator/scripts/auto_triage_pr58.py ... --dry-run
   ```

2. **Review PR before merging**
   - Check files changed
   - Verify tests pass
   - Review commit messages

3. **Use `--allow-invasive` cautiously**
   - Only when necessary
   - Review changes carefully
   - Get additional review from team

4. **Keep logs secure**
   - Never commit log files
   - Redact secrets before sharing
   - Use secure channels for sensitive data

5. **Monitor CI after PR creation**
   ```bash
   gh run watch --repo gcolon75/Project-Valine <run-id>
   ```

## FAQ

**Q: What if the workflow hasn't run yet?**

A: The automation agent will fall back to using the existing triage agent directly:
```bash
python orchestrator/scripts/phase5_triage_agent.py run \
  --repo gcolon75/Project-Valine \
  --failure-ref 58 \
  --auto-fix \
  --allow-invasive
```

**Q: Can I use this for PRs other than #58?**

A: Yes! Just change the `--pr` parameter:
```bash
python orchestrator/scripts/auto_triage_pr58.py \
  --repo gcolon75/Project-Valine \
  --pr <your-pr-number> \
  --mode apply-fixes
```

**Q: What if I don't have GitHub CLI installed?**

A: The script will fall back to using the GitHub API directly with `curl`, as long as you have `GITHUB_TOKEN` set.

**Q: How do I revert auto-applied fixes?**

A: Close the auto-created PR and optionally revert the branch:
```bash
gh pr close <pr-number>
git branch -D auto/triage/fix/pr-58/<timestamp>
git push origin --delete auto/triage/fix/pr-58/<timestamp>
```

**Q: Can I customize the branch naming?**

A: Yes, edit the script and modify the `branch_name` generation in the `apply_fixes()` function.

## Support

For issues or questions:
1. Check this guide and troubleshooting section
2. Review the script source code
3. Check existing GitHub issues
4. Create a new issue with:
   - Error message
   - Command used
   - Expected vs actual behavior
   - Log files (secrets redacted)

## License

This automation agent is part of the Project-Valine repository and follows the same license.

---

**Version:** 1.0.0  
**Last Updated:** 2025-10-17  
**Status:** Production Ready
