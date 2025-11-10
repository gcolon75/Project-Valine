# Quick Start: Post-Run Orchestration Analysis

This guide helps you quickly analyze orchestration workflow runs.

## Prerequisites Check

```bash
# 1. Check if GitHub CLI is installed
gh --version
# If not installed: https://cli.github.com/

# 2. Check if you're authenticated
gh auth status
# If not authenticated: gh auth login

# 3. Verify Node.js version
node --version
# Need v18 or higher
```

## Basic Usage

```bash
# Step 1: Find your run ID
gh run list --repo gcolon75/Project-Valine --workflow="orchestrate-verification-and-sweep.yml" --limit 5

# Step 2: Run the analysis
node scripts/analyze-orchestration-run.mjs <RUN_ID>

# Example:
node scripts/analyze-orchestration-run.mjs 19125388400
```

### Advanced Options

```bash
# Run with fail-on-p0 flag (exits with code 1 if P0 issues found)
node scripts/analyze-orchestration-run.mjs 19125388400 --fail-on-p0

# Get summary output instead of full details
node scripts/analyze-orchestration-run.mjs 19125388400 --summary

# Combine flags for CI/CD pipelines
node scripts/analyze-orchestration-run.mjs 19125388400 --fail-on-p0 --summary
```

**Note:** See [ORCHESTRATION_ANALYSIS_README.md](./ORCHESTRATION_ANALYSIS_README.md#config--flags-reference) for all available flags and options.

## What You'll Get

After running the analysis, you'll have:

```
analysis-output/
├── CONSOLIDATED_ANALYSIS_REPORT.md    # Main report - read this first
├── draft-pr-payloads.json             # Automated fixes (if any)
└── draft-github-issues.json           # Issues to create (if any)

temp-artifacts/                         # Downloaded files (can delete)
├── verification-and-smoke-artifacts/
├── playwright-report/
└── regression-and-a11y-artifacts/
```

## Reading the Report

### 1. Check the Executive Summary

Look for the status at the top:

- **✅ PASS** - No critical issues, safe to deploy
- **⚠️ CAUTION** - Review recommended before deployment  
- **❌ BLOCK** - Do not deploy, critical issues present

### 2. Review Issue Counts

- **P0 (Critical)** - Must fix before deployment
- **P1 (High)** - Should fix, or proceed with caution
- **P2 (Medium)** - Track in backlog, fix in next sprint

### 3. Check Test Results

- Playwright tests passed/failed
- Accessibility violations by severity
- Health check status
- Authentication status

## Decision Matrix

| Situation | Action | Exit Code (with --fail-on P0) |
|-----------|--------|-------------------------------|
| **P0 issues present** | ❌ BLOCK deployment<br>Fix all P0 issues<br>Re-run workflow<br>Re-analyze | Exit 2 🛑 |
| **Multiple P1 issues (>3)** | ⚠️ CAUTION<br>Review each issue<br>Create tracking issues<br>Decide: fix now or accept risk | Exit 1 ⚠️ |
| **Few P1 issues (1-3)** | ⚠️ Review issues<br>Create tracking issues<br>Deployment can proceed | Exit 0 ✅ |
| **Only P2/P3 issues** | ✅ Create backlog issues<br>Proceed with deployment | Exit 0 ✅ |
| **No issues** | ✅ Proceed with deployment | Exit 0 ✅ |

**Note:** Exit codes depend on the `--fail-on` flag value. See [Exit Codes](./ORCHESTRATION_ANALYSIS_README.md#exit-codes) for complete details and scenario mapping.

## Common Scenarios

### Scenario 1: Authentication Failed

**Report shows**: P0 issue - "Authentication Failed"

**Action**:
```bash
# Check your secrets
gh secret list --repo gcolon75/Project-Valine

# Update if needed
gh secret set STAGING_URL --repo gcolon75/Project-Valine
gh secret set TEST_USER_EMAIL --repo gcolon75/Project-Valine
gh secret set TEST_USER_PASSWORD --repo gcolon75/Project-Valine

# Re-run workflow
gh workflow run orchestrate-verification-and-sweep.yml --repo gcolon75/Project-Valine
```

### Scenario 2: Playwright Tests Failed

**Report shows**: P1 issues - "Playwright Test Failed: ..."

**Action**:
1. Review the test failure details in the report
2. Check if it's a real bug or flaky test
3. If real bug: fix the code
4. If flaky: mark test for review
5. Re-run workflow after fixes

### Scenario 3: Accessibility Violations

**Report shows**: P1/P2 issues - "A11y Violation: ..."

**Action**:
1. Review each violation
2. Check `draft-pr-payloads.json` for auto-fixable issues
3. For serious violations: create issues and assign
4. For minor violations: add to backlog

### Scenario 4: Missing Artifacts

**Report shows**: Artifacts missing

**Action**:
```bash
# Check the workflow run logs
gh run view <RUN_ID> --log --repo gcolon75/Project-Valine

# Look for why artifacts weren't uploaded
# Common causes:
# - Workflow timed out
# - Step failed before artifact upload
# - No files matched the artifact path

# Solution: Re-run the workflow
gh run rerun <RUN_ID> --repo gcolon75/Project-Valine
```

## Integration with Deployment

### Pre-Deployment Checklist

```bash
# 1. Run orchestration workflow
gh workflow run orchestrate-verification-and-sweep.yml --repo gcolon75/Project-Valine

# 2. Wait for completion (check status)
gh run list --repo gcolon75/Project-Valine --workflow="orchestrate-verification-and-sweep.yml" --limit 1

# 3. Get the run ID from output
RUN_ID="<from_step_2>"

# 4. Analyze
node scripts/analyze-orchestration-run.mjs $RUN_ID

# 5. Review the report
cat analysis-output/CONSOLIDATED_ANALYSIS_REPORT.md

# 6. Check for blockers
grep "P0 (Critical)" analysis-output/CONSOLIDATED_ANALYSIS_REPORT.md

# 7. Make deployment decision
# - If P0 found: STOP, fix issues
# - If P1 found: Review and decide
# - If clean: Proceed
```

## Cleanup

After reviewing the analysis:

```bash
# Delete downloaded artifacts (they can be large)
rm -rf temp-artifacts/

# Keep the analysis reports for records
# (or delete if you don't need them)
# rm -rf analysis-output/
```

## Troubleshooting

### "GitHub CLI (gh) is not installed"

```bash
# macOS
brew install gh

# Windows  
winget install --id GitHub.cli

# Linux
# See: https://github.com/cli/cli/blob/trunk/docs/install_linux.md
```

### "Failed to fetch run details: Not Found"

- Check the run ID is correct
- Verify you have access to the repository
- Ensure the run is from `orchestrate-verification-and-sweep` workflow

### "Invalid run ID"

- Run ID must be a number
- Example valid run ID: `19125388400`
- Find it in the GitHub Actions URL or with `gh run list`

## Getting Help

1. **Detailed Documentation**: `scripts/ORCHESTRATION_ANALYSIS_README.md`
2. **Security Info**: `scripts/ORCHESTRATION_ANALYSIS_SECURITY.md`
3. **Script Help**: `node scripts/analyze-orchestration-run.mjs --help`

## Next Steps

After analyzing a run:

1. ✅ Read the consolidated report
2. ✅ Address any P0 issues immediately
3. ✅ Create GitHub issues from `draft-github-issues.json`
4. ✅ Apply fixes from `draft-pr-payloads.json` (if appropriate)
5. ✅ Document your deployment decision
6. ✅ Clean up artifacts directory

---

*Quick reference for the orchestration analysis agent*
