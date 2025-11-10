# Post-Run Orchestration Analysis Agent

## Overview

This agent performs comprehensive analysis of GitHub Actions workflow runs from the `orchestrate-verification-and-sweep` workflow. It fetches artifacts, analyzes them in detail, and generates actionable reports, draft PRs, and draft issues.

## Purpose

After running the manual orchestration workflow (`orchestrate-verification-and-sweep.yml`), this agent:

1. **Fetches** all artifacts from a specific workflow run
2. **Analyzes** health checks, authentication, verification logs, Playwright results, and accessibility findings
3. **Generates** a consolidated report with P0/P1/P2 prioritized issues
4. **Creates** draft PR payloads for mechanical fixes
5. **Produces** draft GitHub issues for non-trivial problems

## Prerequisites

### Required Tools

- **GitHub CLI** (`gh`) - Must be installed and authenticated
  - Install: https://cli.github.com/
  - Authenticate: `gh auth login`
- **Node.js** - Version 18 or higher
- **Access** - Read access to repository and Actions artifacts

### Repository Secrets

The orchestration workflow uses these secrets (ensure they are configured):

- `STAGING_URL` - URL of the staging environment
- `TEST_USER_EMAIL` - Test user email for authentication
- `TEST_USER_PASSWORD` - Test user password for authentication

## Usage

### Basic Usage

```bash
node scripts/analyze-orchestration-run.mjs <run-id>
```

### Example

```bash
node scripts/analyze-orchestration-run.mjs 19125388400
```

### Finding the Run ID

1. Go to the Actions tab in GitHub
2. Click on the workflow run you want to analyze
3. The run ID is in the URL: `https://github.com/gcolon75/Project-Valine/actions/runs/19125388400`

Or use the GitHub CLI:

```bash
# List recent runs
gh run list --repo gcolon75/Project-Valine --workflow="orchestrate-verification-and-sweep.yml"

# View a specific run
gh run view 19125388400 --repo gcolon75/Project-Valine
```

## What It Does

### Phase A: Fetch Artifacts and Primary Evidence

1. **Fetches run details** - Status, conclusion, timestamps
2. **Lists all artifacts** - Identifies which artifacts are present/missing
3. **Downloads artifacts**:
   - `verification-and-smoke-artifacts` - Verification logs and reports
   - `playwright-report` - Playwright HTML report and results
   - `regression-and-a11y-artifacts` - Test results and accessibility scans
4. **Unpacks and catalogs** all files with sizes and locations

### Phase B: Automated Analysis

#### Health Checks
- Parses `health_status.txt` and `health.json`
- Checks for HTTP 200 OK responses
- Identifies endpoint availability issues

#### Authentication Checks
- Analyzes `login_response_parsed.txt` and `login_response_raw.txt`
- Verifies token/session presence
- Detects authentication failures (401, invalid credentials)
- Checks profile link creation success

#### Post-Merge Verification
- Parses `REGRESSION_VERIFICATION_REPORT.md`
- Extracts verification step results
- Identifies failed verification steps
- Notes migration warnings/errors

#### Playwright & Regression Tests
- Summarizes test counts (passed/failed/skipped)
- Lists all failing tests with details
- Extracts error messages and stack traces
- Links to screenshots/videos/traces (when available)

#### Accessibility (a11y) Analysis
- Parses axe-core accessibility scan results
- Categorizes violations by severity (critical/serious/moderate/minor)
- Lists affected selectors and node counts
- Provides remediation links

#### Security Scans
- Summarizes dependency/vulnerability scan results
- Identifies high/critical findings
- **Redacts** any exposed secrets
- Marks secret exposures as P0 issues

#### CSP Reports
- Analyzes Content Security Policy violations
- Lists sources causing report-only hits
- Assesses impact of switching to enforce mode

### Phase C: Generate Outputs

#### 1. Consolidated Markdown Report

Generated at: `analysis-output/CONSOLIDATED_ANALYSIS_REPORT.md`

Contains:
- **Executive Summary** - Pass/fail status, high-level metrics
- **Quick Stats** - Artifacts, tests, violations count
- **Detailed Results** - Per-check analysis with evidence
- **Prioritized Issues** - P0/P1/P2 list with file references
- **Remediation Plan** - Step-by-step actions to take
- **Gating Recommendation** - Deploy/block/caution decision
- **Next Steps** - Clear actionable items

#### 2. Draft PR Payloads

Generated at: `analysis-output/draft-pr-payloads.json`

Contains JSON payloads for mechanical fixes:
- Branch name
- Commit message
- File changes (patch diffs when possible)
- Labels (automated-fix, priority level)

Example fixes identified:
- Missing alt text on images
- Missing aria-labels
- CSP-safe refactors
- Dependency version bumps (non-breaking)

**Note:** These are drafts only. Review before creating actual PRs.

#### 3. Draft GitHub Issues

Generated at: `analysis-output/draft-github-issues.json`

Contains JSON for every non-trivial problem:
- Issue title (with priority prefix)
- Detailed description
- Evidence/snippets
- Artifact references
- Recommended fixes
- Labels (priority, orchestration-failure, needs-triage)

**Note:** These are drafts only. Review before creating actual issues.

## Understanding the Output

### Priority Levels

- **P0 (Critical)** - Blocks deployment, must be fixed immediately
  - Examples: Authentication failures, exposed secrets, critical security vulnerabilities
  
- **P1 (High Priority)** - Should be fixed before deployment
  - Examples: Failed health checks, Playwright test failures, serious a11y violations
  
- **P2 (Medium Priority)** - Can be tracked and fixed in upcoming sprint
  - Examples: Minor a11y violations, moderate CSP issues, documentation gaps

### Gating Recommendations

- **🛑 BLOCK** - Do not deploy. Critical (P0) issues present.
- **⚠️ CAUTION** - Multiple high-priority (P1) issues. Consider delaying.
- **⚠️ REVIEW REQUIRED** - Some P1 issues. Review before deployment.
- **✅ PROCEED** - No critical issues. Safe to deploy.

## Common Issues and Solutions

### Issue: "GitHub CLI (gh) is not installed"

**Solution:**
```bash
# macOS
brew install gh

# Windows
winget install --id GitHub.cli

# Linux
# See: https://github.com/cli/cli/blob/trunk/docs/install_linux.md
```

Then authenticate:
```bash
gh auth login
```

### Issue: "Failed to fetch run details: Not Found"

**Causes:**
1. Invalid run ID
2. Run belongs to a different repository
3. Insufficient permissions

**Solution:**
- Verify the run ID is correct
- Ensure you have read access to the repository
- Check `gh auth status` to verify authentication

### Issue: "Missing artifacts" reported

**Causes:**
1. Workflow run did not complete all steps
2. Artifacts were not uploaded due to errors
3. Artifacts expired (retention period passed)

**Solution:**
- Re-run the orchestration workflow
- Check workflow logs for upload failures
- Ensure `continue-on-error: true` allows artifact uploads even on failures

### Issue: "STAGING_URL is a placeholder" detected

**Cause:** The `STAGING_URL` secret is set to a placeholder value (e.g., `staging.example.com`)

**Solution:**
```bash
# Update the secret with the real staging URL
gh secret set STAGING_URL --repo gcolon75/Project-Valine
# Enter the real staging URL when prompted
```

Then re-run the workflow and re-analyze.

## Sample Workflow

### 1. Trigger orchestration workflow

```bash
# Via GitHub UI
# Go to Actions → Orchestrate Verification and Sweep → Run workflow

# Or via CLI
gh workflow run orchestrate-verification-and-sweep.yml --repo gcolon75/Project-Valine
```

### 2. Get the run ID

```bash
# List recent runs
gh run list --repo gcolon75/Project-Valine --workflow="orchestrate-verification-and-sweep.yml" --limit 5
```

Example output:
```
STATUS  NAME                                 WORKFLOW                          BRANCH  EVENT              ID
✓       Manual verification and sweep run    Orchestrate Verification and...   main    workflow_dispatch  19125388400
```

### 3. Run the analysis

```bash
node scripts/analyze-orchestration-run.mjs 19125388400
```

### 4. Review the outputs

```bash
# Read the consolidated report
cat analysis-output/CONSOLIDATED_ANALYSIS_REPORT.md

# Or open in your editor
code analysis-output/CONSOLIDATED_ANALYSIS_REPORT.md
```

### 5. Take action based on findings

#### If P0 issues are present:

1. **DO NOT** deploy to production
2. Address all P0 issues immediately
3. Re-run orchestration workflow
4. Re-run analysis to verify fixes

#### If P1 issues are present:

1. Review each P1 issue
2. Decide if deployment can proceed with known issues
3. Create tracking issues using draft payloads
4. Ensure rollback plan is ready

#### If only P2 issues:

1. Create issues from draft payloads
2. Schedule fixes in upcoming sprint
3. Proceed with deployment if all gates pass

## Outputs Directory Structure

```
analysis-output/
├── CONSOLIDATED_ANALYSIS_REPORT.md   # Main analysis report
├── draft-pr-payloads.json            # Mechanical fix PR drafts
└── draft-github-issues.json          # Issue drafts for tracking

temp-artifacts/                        # Downloaded artifacts (can be deleted)
├── verification-and-smoke-artifacts/
│   ├── logs/verification/
│   ├── REGRESSION_VERIFICATION_REPORT.md
│   └── ...
├── playwright-report/
│   ├── index.html
│   ├── results.json
│   └── ...
└── regression-and-a11y-artifacts/
    ├── test-results/
    └── ...
```

**Note:** The `temp-artifacts/` directory can be deleted after analysis. All relevant information is extracted into the reports.

## Integration with CI/CD

This analysis can be integrated into your deployment pipeline:

```yaml
# Example workflow step
- name: Analyze orchestration results
  if: always()
  run: |
    # Get the run ID (this example uses the current run)
    RUN_ID="${{ github.run_id }}"
    
    # Run analysis
    node scripts/analyze-orchestration-run.mjs "$RUN_ID"
    
    # Upload analysis reports as artifacts
    # (Implementation depends on your CI/CD system)

- name: Check for P0 issues
  run: |
    # Parse the report for P0 issues
    if grep -q "P0 (Critical): [1-9]" analysis-output/CONSOLIDATED_ANALYSIS_REPORT.md; then
      echo "::error::Critical (P0) issues detected. Blocking deployment."
      exit 1
    fi
```

## Customization

The script can be customized by modifying:

- **Repository owner/name** - Update `REPO_OWNER` and `REPO_NAME` constants
- **Artifact names** - Adjust expected artifact names in `listArtifacts()`
- **Issue priorities** - Modify priority assignment logic in analysis methods
- **Report format** - Customize Markdown generation in `generateConsolidatedReport()`

## Security Considerations

- **Secret Redaction** - The script automatically redacts secrets found in logs
- **No Destructive Operations** - The script is read-only and makes no changes to:
  - Repository code
  - Production/staging environments
  - Secrets or credentials
  - PR merge status
- **Local Analysis** - All analysis is performed locally; no data is sent to third parties
- **Artifact Cleanup** - Downloaded artifacts may contain sensitive logs. Delete `temp-artifacts/` after analysis.

## Troubleshooting

### Enable verbose logging

Add debug logging to the script if needed:

```javascript
// Add at the top of analyze-orchestration-run.mjs
const DEBUG = true;

// Then add debug logs throughout:
if (DEBUG) console.log('Debug info:', data);
```

### Check GitHub CLI authentication

```bash
gh auth status
gh auth refresh
```

### Verify artifact availability

```bash
# List all artifacts for a run
gh run view 19125388400 --repo gcolon75/Project-Valine --json artifacts

# Download a specific artifact manually
gh run download 19125388400 --name verification-and-smoke-artifacts --repo gcolon75/Project-Valine
```

## Support

For issues or questions:

1. Check this README
2. Review the script comments
3. Check GitHub Actions logs for the orchestration workflow
4. Open an issue in the repository with:
   - Run ID you're analyzing
   - Error message or unexpected behavior
   - Relevant logs from the analysis script

## License

This script is part of Project-Valine and follows the same license as the repository.
