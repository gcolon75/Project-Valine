# Post-Run Orchestration Analysis Agent

## Table of Contents

- [Overview](#overview)
- [Purpose](#purpose)
- [Prerequisites](#prerequisites)
  - [Required Tools](#required-tools)
  - [Repository Secrets](#repository-secrets)
  - [Optional Secrets](#optional-secrets)
- [Usage](#usage)
  - [Basic Usage](#basic-usage)
  - [CLI Flags](#cli-flags)
  - [Quick Reference](#quick-reference)
  - [Example](#example)
  - [Finding the Run ID](#finding-the-run-id)
- [Exit Codes](#exit-codes)
- [Degraded Mode Operation](#degraded-mode-operation)
- [What It Does](#what-it-does)
  - [Phase A: Fetch Artifacts and Primary Evidence](#phase-a-fetch-artifacts-and-primary-evidence)
  - [Phase B: Automated Analysis](#phase-b-automated-analysis)
  - [Phase C: Generate Outputs](#phase-c-generate-outputs)
- [Understanding the Output](#understanding-the-output)
  - [Priority Levels](#priority-levels)
  - [Gating Recommendations](#gating-recommendations)
- [Common Issues and Solutions](#common-issues-and-solutions)
- [Sample Workflow](#sample-workflow)
- [Outputs Directory Structure](#outputs-directory-structure)
- [Automated Workflow Integration](#automated-workflow-integration)
- [Integration with CI/CD](#integration-with-cicd)
- [Customization](#customization)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)
- [Support](#support)
- [License](#license)

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

#### Optional Secrets

- `ORCHESTRATION_BOT_PAT` - Personal Access Token for posting automated comments on PRs
  - **Scopes required:**
    - `Contents: write` - For accessing repository content
    - `Pull requests: write` - For posting comments on pull requests
    - `Actions: read` - For reading workflow run information
  - If not set, the analyzer will skip automated PR commenting features

## Usage

### Basic Usage

```bash
node scripts/analyze-orchestration-run.mjs <run-id>
```

### CLI Flags

The analyzer supports the following command-line flags:

```bash
node scripts/analyze-orchestration-run.mjs <run-id> [options]
```

**Available Options:**

- `--fail-on-p0` - Exit with non-zero code if P0 (critical) issues are detected
- `--summary` - Output a compact summary instead of full analysis details
- `--json` - Output results in JSON format for programmatic consumption
- `--no-download` - Skip artifact download if already present locally

**Coming Soon:**

- `--rest-fallback` - Use REST API fallback if GraphQL queries fail (implementation pending)

### Quick Reference

**Fail on critical issues with summary output:**

```bash
# Analyze run and exit with error code if P0 issues found
node scripts/analyze-orchestration-run.mjs 19125388400 --fail-on-p0 --summary

# Example output:
# ✓ Analysis complete
# ⚠ Found 2 P0 issues, 5 P1 issues, 3 P2 issues
# ❌ BLOCKING: Critical issues detected - do not deploy
# Exit code: 1
```

This is useful in CI/CD pipelines to automatically block deployments when critical issues are present.

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

## Exit Codes

The analyzer uses standardized exit codes to indicate the analysis result:

| Exit Code | Meaning | Description |
|-----------|---------|-------------|
| **0** | Success | Analysis completed successfully with no critical issues |
| **1** | Critical Issues | P0 (critical) issues detected - blocks deployment |
| **2** | Analysis Failed | Unable to complete analysis (missing artifacts, API errors, etc.) |
| **3** | Invalid Input | Invalid run ID or missing required parameters |
| **4** | Authentication Failed | GitHub CLI not authenticated or insufficient permissions |

**Exit Code Policy:**

- Exit code **0** is returned when:
  - Analysis completes successfully AND
  - No P0 issues are detected (P1/P2 issues are acceptable)
  
- Exit code **1** is returned when:
  - Analysis completes successfully BUT
  - One or more P0 (critical) issues are detected
  - This should block deployment in CI/CD pipelines

- Exit codes **2-4** indicate the analysis itself failed:
  - These should trigger alerts to investigate the analysis tooling
  - Do not proceed with deployment until analysis can complete

**Using Exit Codes in CI/CD:**

```bash
# Example: Block deployment on critical issues
if node scripts/analyze-orchestration-run.mjs "$RUN_ID" --fail-on-p0; then
  echo "✅ Safe to deploy"
  # Proceed with deployment
else
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 1 ]; then
    echo "❌ Critical issues detected - deployment blocked"
  else
    echo "⚠️ Analysis failed with exit code $EXIT_CODE"
  fi
  exit $EXIT_CODE
fi
```

## Degraded Mode Operation

When the analyzer encounters certain failures, it may operate in **degraded mode** to provide partial results:

**Degraded Mode Triggers:**

1. **Missing Artifacts** - Some artifacts are unavailable (expired, not uploaded, etc.)
   - Analyzer will process available artifacts and note which are missing
   - Report will include warnings about incomplete analysis
   
2. **API Rate Limiting** - GitHub API rate limits are exceeded
   - Analyzer will complete with cached/local data where possible
   - May skip non-critical metadata enrichment
   
3. **Partial Download Failures** - Some artifact downloads fail
   - Analyzer will process successfully downloaded artifacts
   - Failed downloads will be listed in the report

**Degraded Mode Indicators:**

The analysis report will include a **Degraded Mode Notice** section when operating in degraded mode:

```
⚠️ DEGRADED MODE NOTICE
This analysis ran in degraded mode due to:
- Missing artifact: playwright-report (expired after 90 days)
- API rate limit reached (metadata enrichment skipped)

Results may be incomplete. Manual review recommended.
```

**Best Practices for Degraded Mode:**

- **Do not deploy** if critical artifacts are missing (health checks, auth logs)
- **Proceed with caution** if only supplementary artifacts are missing (screenshots, traces)
- **Re-run the workflow** if artifacts are missing due to upload failures
- **Wait and retry** if API rate limits are the issue (limits reset hourly)

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

## Automated Workflow Integration

**Status: Coming in Next Phase**

This section will document how to integrate the orchestration analyzer into automated GitHub Actions workflows for:

- **Automatic PR Comments** - Post analysis summaries directly on pull requests
- **Status Checks** - Create commit status checks based on analysis results
- **Deployment Gating** - Automatically block/allow deployments based on findings
- **Scheduled Analysis** - Run analysis on a schedule for monitoring trends
- **Slack/Discord Notifications** - Send alerts when critical issues are detected

**Prerequisites (when implemented):**
- `ORCHESTRATION_BOT_PAT` secret configured with appropriate scopes
- Workflow file: `.github/workflows/post-analysis-automation.yml`

**Example Use Cases:**
1. Run analyzer after each merge to main and post results as PR comment
2. Gate production deployments on P0 issue count
3. Send daily summary reports to team Slack channel
4. Automatically create GitHub issues from P1/P2 findings

Check back in the next phase for complete workflow examples and setup instructions.

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
