# Phase 5 Triage Agent - Automation Guide

## Overview

The Phase 5 Triage Agent can now automatically apply fixes to failed PRs and workflow runs. This guide covers the enhanced automation capabilities including invasive fixes, safety guardrails, and automatic PR creation.

## Quick Start

### Via GitHub Actions (Recommended)

1. Navigate to **Actions** → **Phase 5 Triage Agent**
2. Click **Run workflow**
3. Configure inputs:
   - **pr_number**: The PR number to triage (e.g., `58`)
   - **mode**: Choose `apply-fixes` to enable auto-fix
   - **allow_invasive_fixes**: Set to `true` to allow changes >10 files or >500 lines

### Via CLI

```bash
export GITHUB_TOKEN="your_token"
cd orchestrator/scripts

# Triage with auto-fix for PR #58
python phase5_triage_agent.py run \
  --repo gcolon75/Project-Valine \
  --failure-ref 58 \
  --auto-fix

# Allow invasive fixes
python phase5_triage_agent.py run \
  --repo gcolon75/Project-Valine \
  --failure-ref 58 \
  --auto-fix \
  --allow-invasive
```

### Via GitHub API

```bash
# Trigger workflow with curl
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/gcolon75/Project-Valine/actions/workflows/phase5-triage-agent.yml/dispatches \
  -d '{
    "ref": "main",
    "inputs": {
      "pr_number": "58",
      "mode": "apply-fixes",
      "allow_invasive_fixes": "true"
    }
  }'

# Or using gh CLI
gh workflow run phase5-triage-agent.yml \
  --ref main \
  --field pr_number=58 \
  --field mode=apply-fixes \
  --field allow_invasive_fixes=true
```

## Features

### 1. Automatic Fix Application

The agent can automatically apply fixes for common failure types:

- **Missing dependencies**: Installs packages and updates requirements.txt
- **Configuration errors**: Applies configuration changes
- **Code patches**: Applies unified diffs to source files

### 2. Safety Guardrails

**File Count Limit**: Maximum 10 files changed (configurable)
- If exceeded without `--allow-invasive`, creates a **draft PR** for manual review

**Line Change Limit**: Maximum 500 lines changed (configurable)
- If exceeded without `--allow-invasive`, creates a **draft PR** for manual review

**Secret Detection**: Scans changes for potential secrets
- GitHub tokens (ghp_, ghs_, github_pat_)
- Bearer tokens
- Passwords and API keys
- Private keys
- If secrets detected, **no PR is created** and an issue is opened instead

### 3. Automatic PR Creation

When fixes are applied successfully, the agent:

1. Creates a timestamped branch: `auto/triage/fix/pr-{number}/{timestamp}`
2. Commits changes with descriptive message
3. Pushes branch to GitHub
4. Opens a PR with comprehensive details
5. Adds labels: `auto-triage`, `needs-review`, and `invasive-changes` (if applicable)
6. Assigns PR to repository owner

**PR Title Format**:
```
Auto-fix: Phase‑5 triage fixes for PR #{number}
```

**Commit Message Format**:
```
auto-triage(pr-{number}): {fix description}

Root cause: {root cause details}
Files changed: {list of files}

Correlation ID: TRIAGE-{timestamp}
```

### 4. Comprehensive PR Body

The generated PR includes:

- **Overview**: Summary of the fix and correlation ID
- **Root Cause**: Detailed root cause analysis
- **Changes Summary**: File count, line count, fix type, risk level
- **Files Changed**: List of all modified files
- **Triage Run**: Links to workflow logs and artifacts
- **Test Results**: Test plan and validation steps
- **Rollback Plan**: Instructions for reverting changes

### 5. Draft PRs for Invasive Changes

When changes exceed safety limits and `--allow-invasive` is not set:

- PR is created as a **draft**
- Labeled with `invasive-changes`
- Requires manual review before merging
- Includes warning in PR description

## Operation Modes

### `triage-only` (Default)

- Analyzes failures and generates reports
- No modifications to code
- Safe for exploratory analysis

### `apply-fixes`

- Applies fixes automatically
- Creates PRs with changes
- Respects safety guardrails

## Configuration

### Environment Variables

- `GITHUB_TOKEN` (required): GitHub token with `repo` and `workflow` scopes

### CLI Arguments

```
--repo REPO                Repository (owner/repo)
--failure-ref REF          PR number, workflow run ID, or URL
--auto-fix                 Enable auto-fix PR creation
--allow-invasive           Allow invasive fixes (>10 files or >500 lines)
--dry-run                  Preview changes without applying
--verbose                  Enable detailed logging
```

### Config File

```json
{
  "repo": "gcolon75/Project-Valine",
  "failure_ref": "58",
  "allow_auto_fix": true,
  "allow_invasive_fixes": false,
  "max_files_changed": 10,
  "max_lines_changed": 500,
  "dry_run": false,
  "verbose": true
}
```

Use with: `python phase5_triage_agent.py run --config config.json`

## Workflow Inputs

### Required

- **pr_number** OR **failure_ref**: Identifier for what to triage

### Optional

- **mode**: `triage-only` (default) or `apply-fixes`
- **allow_invasive_fixes**: `true` or `false` (default)
- **dry_run**: `true` or `false` (default)
- **verbose**: `true` (default) or `false`

## Outputs

### Artifacts

All triage runs generate artifacts stored for 90 days:

```
triage_output/
├── phase5_triage_report.md       # Human-readable report
├── phase5_triage_report.json     # Machine-readable (redacted)
├── fix_patch.diff                # Git patch (if applicable)
├── quick_playbook.txt            # Shell commands (if applicable)
└── fix_pr_url.txt                # PR URL (if created)
```

### PR Comments

For PR-based triage, the agent automatically comments with:
- Triage report summary
- Link to fix PR (if created)
- Link to workflow logs

## Safety & Security

### What the Agent Will NOT Do

1. **Commit secrets**: All secrets are detected and redacted
2. **Force push**: Never modifies commit history
3. **Auto-merge**: All PRs require manual approval
4. **Modify main/production**: Only works on feature branches

### Best Practices

1. **Start with dry-run**: Test commands with `--dry-run` first
2. **Review draft PRs**: Always review invasive changes manually
3. **Check CI**: Ensure CI passes before merging auto-fix PRs
4. **Monitor logs**: Review workflow logs for warnings
5. **Use correlation IDs**: Track fixes across systems

## Rollback

If an auto-fix PR causes issues after merging:

1. Create a revert PR manually:
   ```bash
   git revert {commit-sha}
   git push origin HEAD:revert-auto-fix-pr-{number}
   ```

2. Or use GitHub UI:
   - Go to the merged PR
   - Click "Revert" button
   - Create revert PR

3. Reference the original correlation ID for tracking

## Troubleshooting

### "Could not resolve failure_ref"

- Ensure PR number is valid and < 10000
- Check workflow run ID is correct (10+ digits)
- Verify URL format matches GitHub patterns

### "Git operation failed"

- Check GitHub token has `repo` scope
- Verify repository permissions
- Ensure branch doesn't already exist

### "Potential secrets detected"

- Review git diff output manually
- Remove any sensitive data
- Run again after cleanup

### "Fix exceeds safety limits"

- Review the changes manually
- If safe, re-run with `--allow-invasive`
- Otherwise, apply fixes incrementally

## Examples

### Example 1: Simple Dependency Fix

```bash
# PR #58 failed due to missing 'requests' module
python phase5_triage_agent.py run \
  --repo gcolon75/Project-Valine \
  --failure-ref 58 \
  --auto-fix

# Output:
# - Detects missing dependency
# - Adds 'requests' to requirements.txt
# - Creates PR with changes
# - Labels: auto-triage, needs-review
```

### Example 2: Test Failure Fix (Invasive)

```bash
# PR #60 has 15 failing tests across 12 files
python phase5_triage_agent.py run \
  --repo gcolon75/Project-Valine \
  --failure-ref 60 \
  --auto-fix \
  --allow-invasive

# Output:
# - Analyzes test failures
# - Proposes fixes for all 15 tests
# - Creates DRAFT PR (exceeds 10 file limit)
# - Labels: auto-triage, needs-review, invasive-changes
```

### Example 3: Workflow Run Triage

```bash
# Workflow run 1234567890 failed
python phase5_triage_agent.py run \
  --repo gcolon75/Project-Valine \
  --failure-ref 1234567890 \
  --auto-fix

# Output:
# - Fetches logs from workflow run
# - Identifies failed jobs
# - Proposes and applies fixes
# - Creates PR with fixes
```

## Integration with CI/CD

### Automatic Triage on PR Failure

Add to `.github/workflows/`:

```yaml
name: Auto-Triage on Failure
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]

jobs:
  auto-triage:
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Trigger Triage Agent
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.actions.createWorkflowDispatch({
              owner: context.repo.owner,
              repo: context.repo.repo,
              workflow_id: 'phase5-triage-agent.yml',
              ref: 'main',
              inputs: {
                failure_ref: '${{ github.event.workflow_run.id }}',
                mode: 'apply-fixes',
                allow_invasive_fixes: 'false'
              }
            });
```

## Support

For issues or questions:
- Check workflow logs in GitHub Actions
- Review artifacts for detailed reports
- Open an issue with correlation ID
- Reference this guide for troubleshooting

---

**Version**: 2.0.0  
**Last Updated**: 2025-10-17  
**Maintainer**: Phase 5 Triage Agent Team
