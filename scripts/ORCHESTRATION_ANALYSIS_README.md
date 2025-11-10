# Post-Run Orchestration Analysis Agent

## Table of Contents

- [Overview](#overview)
- [Purpose](#purpose)
- [Prerequisites](#prerequisites)
  - [Required Tools](#required-tools)
  - [Repository Secrets](#repository-secrets)
  - [Optional Secrets](#optional-secrets)
- [Retrieval Modes](#retrieval-modes)
  - [CLI Mode (Default)](#cli-mode-default)
  - [REST API Mode (Fallback)](#rest-api-mode-fallback)
  - [Retrieval Mode Field](#retrieval-mode-field)
- [Usage](#usage)
  - [Basic Usage](#basic-usage)
  - [CLI Flags](#cli-flags)
  - [Config & Flags Reference](#config--flags-reference)
  - [Quick Reference](#quick-reference)
  - [Example](#example)
  - [Finding the Run ID](#finding-the-run-id)
- [Exit Codes](#exit-codes)
  - [Exit Code Reference](#exit-code-reference)
  - [Exit Code by Scenario](#exit-code-by-scenario)
  - [Exit Code Policy](#exit-code-policy)
  - [Error Exit Codes](#error-exit-codes)
  - [Using Exit Codes in CI/CD](#using-exit-codes-in-cicd)
- [Degraded Mode Operation](#degraded-mode-operation)
- [What It Does](#what-it-does)
  - [Phase A: Fetch Artifacts and Primary Evidence](#phase-a-fetch-artifacts-and-primary-evidence)
  - [Safe Extraction & Limits](#safe-extraction--limits)
  - [Phase B: Automated Analysis](#phase-b-automated-analysis)
  - [Phase C: Generate Outputs](#phase-c-generate-outputs)
- [Understanding the Output](#understanding-the-output)
  - [Priority Levels](#priority-levels)
  - [Gating Recommendations](#gating-recommendations)
- [Common Issues and Solutions](#common-issues-and-solutions)
- [Sample Workflow](#sample-workflow)
- [Outputs Directory Structure](#outputs-directory-structure)
- [Automated Workflow Integration](#automated-workflow-integration)
  - [Workflow Triggers](#workflow-triggers)
  - [Integration Workflow](#integration-workflow)
  - [Console Output Examples](#console-output-examples)
  - [Gating Decision Badges](#gating-decision-badges)
  - [Automatic PR Comments](#automatic-pr-comments)
  - [Use Cases](#use-cases)
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

## Retrieval Modes

The analyzer supports two modes for retrieving workflow artifacts:

### CLI Mode (Default)

Uses the GitHub CLI (`gh`) to fetch artifacts. This is the recommended and currently fully supported mode.

**Advantages:**
- Leverages existing GitHub CLI authentication
- Handles large artifacts efficiently with streaming downloads
- Automatically manages compression and extraction
- Well-tested and reliable

**Requirements:**
- GitHub CLI must be installed and authenticated
- User must have read access to the repository and Actions artifacts

**Usage:**
```bash
# Default mode (uses GitHub CLI)
node scripts/analyze-orchestration-run.mjs 19125388400
```

**Authentication:**
```bash
# One-time setup
gh auth login

# Verify authentication
gh auth status
```

### REST API Mode (Fallback)

A future enhancement that will use GitHub's REST API directly for artifact retrieval, bypassing the GitHub CLI dependency.

**Status:** 🚧 **Not Yet Implemented** (stub mode only)

**Planned Advantages:**
- No GitHub CLI installation required
- Useful in constrained environments (containers, CI systems)
- Direct API control for advanced use cases

**Planned Requirements:**
- `GITHUB_TOKEN` environment variable or `ORCHESTRATION_BOT_PAT` secret
- Token scopes required:
  - `actions: read` - For reading workflow run information
  - `contents: read` - For downloading artifacts

**Planned Usage:**
```bash
# Future: Use REST API mode instead of GitHub CLI
GITHUB_TOKEN="ghp_xxxx" node scripts/analyze-orchestration-run.mjs 19125388400 --no-gh
```

**Current Behavior:**

If you specify `--no-gh` flag currently, the analyzer will:
1. Log a warning that REST API mode is not yet implemented
2. Fall back to GitHub CLI mode automatically
3. Continue with normal operation

```bash
# Current behavior with --no-gh
node scripts/analyze-orchestration-run.mjs 19125388400 --no-gh

# Output:
# ⚠ --no-gh flag specified: REST API mode not yet implemented
# ⚠ Proceeding with GitHub CLI mode as fallback
```

### Retrieval Mode Field

When REST API mode is implemented, the analyzer will store the retrieval mode used in the analysis metadata:

```json
{
  "summary": {
    "retrievalMode": "cli",
    "timestamp": "2025-11-10T18:45:45.123Z",
    "runId": "19125388400"
  }
}
```

This field will be included in:
- `summary.json` output (when `--json` flag is used)
- Analysis metadata in the consolidated report
- Logs for troubleshooting and auditing

**Valid values:**
- `"cli"` - Artifacts retrieved via GitHub CLI (current default)
- `"rest"` - Artifacts retrieved via REST API (future implementation)
- `"hybrid"` - Mixed mode if fallback occurred during retrieval

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

### Config & Flags Reference

| Flag | Type | Default | Description | Example |
|------|------|---------|-------------|---------|
| `<run-id>` | **Required** | - | GitHub Actions workflow run ID (numeric) | `19125388400` |
| `--out-dir <path>` | Optional | `analysis-output` | Output directory for generated reports | `--out-dir ./reports` |
| `--json` | Flag | `false` | Emit machine-readable `summary.json` file | `--json` |
| `--summary <path>` | Optional | - | Write executive summary markdown to specified path | `--summary ./exec-summary.md` |
| `--fail-on <level>` | Optional | `P0` | Exit code policy based on severity (`P0`, `P1`, `P2`, `none`) | `--fail-on P1` |
| `--log-level <level>` | Optional | `info` | Logging verbosity (`info`, `debug`) | `--log-level debug` |
| `--no-gh` | Flag | `false` | Force REST API mode (stub, falls back to CLI) | `--no-gh` |
| `-h, --help` | Flag | - | Display help message and exit | `--help` |

### Flag Details

#### `<run-id>` (Required)

**Description:** The GitHub Actions workflow run ID to analyze.

**Format:** Numeric value only (no dashes, letters, or special characters)

**Where to find:**
- GitHub Actions URL: `https://github.com/gcolon75/Project-Valine/actions/runs/19125388400`
- GitHub CLI: `gh run list --repo gcolon75/Project-Valine --workflow="orchestrate-verification-and-sweep.yml"`

**Examples:**
```bash
# Valid
node scripts/analyze-orchestration-run.mjs 19125388400

# Invalid (will be rejected)
node scripts/analyze-orchestration-run.mjs 19125-388-400  # Has dashes
node scripts/analyze-orchestration-run.mjs abc123         # Has letters
```

#### `--out-dir <path>` 

**Description:** Specify where to write analysis reports and outputs.

**Default:** `analysis-output/` in current working directory

**Behavior:**
- Directory is created if it doesn't exist
- Existing files are overwritten
- Relative paths are resolved from current working directory
- Absolute paths are supported

**Outputs created:**
- `<out-dir>/CONSOLIDATED_ANALYSIS_REPORT.md` - Main report (always created)
- `<out-dir>/summary.json` - Machine-readable summary (if `--json` specified)
- `<out-dir>/draft-pr-payloads.json` - Mechanical fix suggestions
- `<out-dir>/draft-github-issues.json` - Issue templates for tracking

**Examples:**
```bash
# Use default directory
node scripts/analyze-orchestration-run.mjs 19125388400

# Custom relative directory
node scripts/analyze-orchestration-run.mjs 19125388400 --out-dir ./reports/2025-11-10

# Custom absolute directory
node scripts/analyze-orchestration-run.mjs 19125388400 --out-dir /tmp/analysis
```

#### `--json`

**Description:** Generate machine-readable JSON summary for programmatic consumption.

**Output:** `<out-dir>/summary.json`

**Format:**
```json
{
  "summary": {
    "status": "success",
    "workflowName": "Orchestrate Verification and Sweep",
    "createdAt": "2025-11-10T18:45:23Z",
    "retrievalMode": "cli",
    "runId": "19125388400"
  },
  "issues": {
    "p0": 0,
    "p1": 2,
    "p2": 5,
    "p3": 10,
    "total": 17
  },
  "tests": {
    "playwright": { "passed": 12, "failed": 0, "total": 12 },
    "health": { "status": "healthy" },
    "auth": { "status": "success" }
  },
  "gatingDecision": "PROCEED"
}
```

**Use Cases:**
- CI/CD pipeline integration
- Automated reporting dashboards
- Trend analysis over time
- Alerting systems

**Examples:**
```bash
# Generate JSON summary
node scripts/analyze-orchestration-run.mjs 19125388400 --json

# Parse with jq
node scripts/analyze-orchestration-run.mjs 19125388400 --json
cat analysis-output/summary.json | jq '.issues.p0'

# Use in CI/CD
if [ $(jq '.issues.p0' analysis-output/summary.json) -gt 0 ]; then
  echo "Critical issues detected"
  exit 1
fi
```

#### `--summary <path>`

**Description:** Generate a concise executive summary in markdown format.

**Output:** Written to specified path (not to `--out-dir`)

**Content:**
- High-level status (PROCEED/CAUTION/BLOCK)
- Issue counts by priority
- Key test results
- Recommended next steps

**Format:**
```markdown
# Executive Summary

**Status:** ✅ PROCEED  
**Run ID:** 19125388400  
**Analyzed:** 2025-11-10 18:45:45 UTC

## Issues
- P0 (Critical): 0
- P1 (High): 2
- P2 (Medium): 5

## Recommendation
Safe to deploy. Track P1/P2 issues in backlog.
```

**Examples:**
```bash
# Write summary to specific file
node scripts/analyze-orchestration-run.mjs 19125388400 --summary ./summary.md

# Use with custom directory
node scripts/analyze-orchestration-run.mjs 19125388400 \
  --out-dir ./reports \
  --summary ./reports/executive-summary.md
```

#### `--fail-on <level>`

**Description:** Configure exit code policy based on issue severity.

**Valid values:** `P0`, `P1`, `P2`, `none` (case-insensitive)

**Default:** `P0`

**Behavior:** See [Exit Codes](#exit-codes) section for detailed exit code mapping.

**Quick Reference:**
- `P0` - Exit 2 if P0 issues, exit 1 if >3 P1 issues, else exit 0 (default)
- `P1` - Exit 2 if P0 issues, exit 1 if any P1 issues, else exit 0 (strict)
- `P2` - Exit 2 if P0 issues, exit 1 if any P1/P2 issues, else exit 0 (very strict)
- `none` - Always exit 0 unless analysis fails (monitoring mode)

**Examples:**
```bash
# Default: Block on P0 only
node scripts/analyze-orchestration-run.mjs 19125388400 --fail-on P0

# Strict: Block on any P1 issue
node scripts/analyze-orchestration-run.mjs 19125388400 --fail-on P1

# Very strict: Block on any P2 issue
node scripts/analyze-orchestration-run.mjs 19125388400 --fail-on P2

# Never block: Monitoring only
node scripts/analyze-orchestration-run.mjs 19125388400 --fail-on none
```

#### `--log-level <level>`

**Description:** Control logging verbosity.

**Valid values:** `info`, `debug`

**Default:** `info`

**Behavior:**
- `info` - Standard output with progress and results
- `debug` - Verbose output including path sanitization, extraction stats, API calls

**Examples:**
```bash
# Standard logging
node scripts/analyze-orchestration-run.mjs 19125388400

# Verbose debugging
node scripts/analyze-orchestration-run.mjs 19125388400 --log-level debug
```

#### `--no-gh`

**Description:** Attempt to use REST API for artifact retrieval instead of GitHub CLI.

**Status:** 🚧 Not yet implemented (stub mode)

**Current Behavior:**
- Logs warning that REST API mode is not implemented
- Automatically falls back to GitHub CLI mode
- Analysis proceeds normally

**Future Behavior:** Will use GitHub REST API directly without requiring GitHub CLI.

**Examples:**
```bash
# Current: Falls back to CLI mode
node scripts/analyze-orchestration-run.mjs 19125388400 --no-gh

# Output:
# ⚠ --no-gh flag specified: REST API mode not yet implemented
# ⚠ Proceeding with GitHub CLI mode as fallback
```

### Combined Flag Examples

```bash
# Production deployment gate: Strict + JSON output
node scripts/analyze-orchestration-run.mjs 19125388400 \
  --fail-on P0 \
  --json \
  --out-dir ./prod-gate-reports

# Development monitoring: Lenient + debug logging
node scripts/analyze-orchestration-run.mjs 19125388400 \
  --fail-on none \
  --log-level debug \
  --out-dir ./dev-reports

# Executive report: Summary + custom output
node scripts/analyze-orchestration-run.mjs 19125388400 \
  --summary ./executive-summary.md \
  --out-dir ./detailed-reports

# CI/CD integration: Strict + JSON + summary
node scripts/analyze-orchestration-run.mjs 19125388400 \
  --fail-on P1 \
  --json \
  --summary ./summary.md \
  --out-dir ./ci-reports
```

### Quick Reference

**Common usage patterns:**

```bash
# Basic analysis (default settings)
node scripts/analyze-orchestration-run.mjs 19125388400

# Block deployment on P0 issues with JSON output
node scripts/analyze-orchestration-run.mjs 19125388400 --fail-on P0 --json

# Strict gating: Block on any P1 issue
node scripts/analyze-orchestration-run.mjs 19125388400 --fail-on P1

# Monitoring mode: Never block, just report
node scripts/analyze-orchestration-run.mjs 19125388400 --fail-on none

# Debug mode: Verbose logging
node scripts/analyze-orchestration-run.mjs 19125388400 --log-level debug

# Generate executive summary
node scripts/analyze-orchestration-run.mjs 19125388400 --summary ./summary.md
```

**Example output with P0 issues:**

```
[2025-11-10T18:45:45.123Z] ✓ Analysis complete!
⚠ Found 2 P0 issues, 5 P1 issues, 3 P2 issues
🛑 BLOCK - Critical issues must be resolved
[2025-11-10T18:45:45.124Z] ℹ Exit code: 2 (based on --fail-on=P0)
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

The analyzer uses standardized exit codes to indicate the analysis result. The exit code behavior depends on the `--fail-on` flag value.

### Exit Code Reference

| Exit Code | Meaning | Description | Typical Cause |
|-----------|---------|-------------|---------------|
| **0** | PROCEED | Analysis completed successfully, no issues above threshold | No P0 issues (with `--fail-on P0`), or `--fail-on none` |
| **1** | CAUTION | High-priority issues detected above threshold | Multiple P1 issues (>3) or single P1 with `--fail-on P1` |
| **2** | BLOCK | Critical issues present, deployment must be blocked | One or more P0 issues detected |

### Exit Code by Scenario

The following table maps specific scenarios to their corresponding exit codes based on the `--fail-on` flag:

| Scenario | P0 Count | P1 Count | P2 Count | `--fail-on P0` | `--fail-on P1` | `--fail-on P2` | `--fail-on none` |
|----------|----------|----------|----------|----------------|----------------|----------------|------------------|
| **Clean run** | 0 | 0 | 0 | 0 ✅ | 0 ✅ | 0 ✅ | 0 ✅ |
| **Minor issues only** | 0 | 0 | 5 | 0 ✅ | 0 ✅ | 1 ⚠️ | 0 ✅ |
| **Single P1 issue** | 0 | 1 | 2 | 0 ✅ | 1 ⚠️ | 1 ⚠️ | 0 ✅ |
| **Few P1 issues** | 0 | 3 | 4 | 0 ✅ | 1 ⚠️ | 1 ⚠️ | 0 ✅ |
| **Many P1 issues** | 0 | 5 | 2 | 1 ⚠️ | 1 ⚠️ | 1 ⚠️ | 0 ✅ |
| **Single P0 issue** | 1 | 0 | 0 | 2 🛑 | 2 🛑 | 2 🛑 | 0 ✅ |
| **P0 + P1 issues** | 2 | 3 | 1 | 2 🛑 | 2 🛑 | 2 🛑 | 0 ✅ |
| **Invalid run ID** | - | - | - | 1 ❌ | 1 ❌ | 1 ❌ | 1 ❌ |
| **GitHub CLI not installed** | - | - | - | 1 ❌ | 1 ❌ | 1 ❌ | 1 ❌ |
| **Missing artifacts** | - | - | - | 1 ❌ | 1 ❌ | 1 ❌ | 1 ❌ |
| **API error** | - | - | - | 1 ❌ | 1 ❌ | 1 ❌ | 1 ❌ |

**Legend:**
- ✅ 0 = PROCEED (safe to deploy)
- ⚠️ 1 = CAUTION (review required)
- 🛑 2 = BLOCK (do not deploy)
- ❌ 1 = ERROR (analysis failed)

### Exit Code Policy

The exit code policy is controlled by the `--fail-on` flag:

#### `--fail-on P0` (Default)

**Exit Code 0 (PROCEED):**
- Analysis completes successfully
- No P0 issues detected
- P1/P2/P3 issues are acceptable

**Exit Code 1 (CAUTION):**
- Analysis completes successfully
- No P0 issues
- More than 3 P1 issues detected (threshold exceeded)

**Exit Code 2 (BLOCK):**
- Analysis completes successfully
- One or more P0 (critical) issues detected
- Deployment must be blocked regardless of other issues

#### `--fail-on P1`

More strict than default. Fails on any P1 issue.

**Exit Code 0 (PROCEED):**
- Analysis completes successfully
- No P0 or P1 issues detected
- Only P2/P3 issues are acceptable

**Exit Code 1 (CAUTION):**
- Analysis completes successfully
- No P0 issues
- One or more P1 issues detected

**Exit Code 2 (BLOCK):**
- Analysis completes successfully
- One or more P0 issues detected

#### `--fail-on P2`

Very strict. Fails on any P2 or higher priority issue.

**Exit Code 0 (PROCEED):**
- Analysis completes successfully
- No P0, P1, or P2 issues detected
- Only P3 (minor) issues are acceptable

**Exit Code 1 (CAUTION):**
- Analysis completes successfully
- No P0 issues
- One or more P1 or P2 issues detected

**Exit Code 2 (BLOCK):**
- Analysis completes successfully
- One or more P0 issues detected

#### `--fail-on none`

Never fails based on issue count. Only fails on analysis errors.

**Exit Code 0 (PROCEED):**
- Analysis completes successfully
- Any number of issues at any priority level

**Exit Code 1 (ERROR):**
- Analysis failed to complete
- Invalid input, API errors, missing artifacts, etc.

### Error Exit Codes

The analyzer may exit with code 1 for analysis failures (not issue-related):

**Common Error Scenarios:**
1. **Invalid run ID** - Run ID is not numeric or doesn't exist
2. **GitHub CLI not installed** - `gh` command not found
3. **GitHub CLI not authenticated** - `gh auth status` fails
4. **Insufficient permissions** - Cannot access repository or artifacts
5. **Missing artifacts** - Expected artifacts not found in workflow run
6. **Artifact download failure** - Network error, disk space, permissions
7. **Artifact extraction failure** - Corrupted archive, extraction limits exceeded
8. **Invalid flags** - Invalid `--fail-on` value or other CLI arguments

### Using Exit Codes in CI/CD

#### Example 1: Block deployment on P0 issues

```bash
# Run analysis with default fail-on policy
node scripts/analyze-orchestration-run.mjs "$RUN_ID" --fail-on P0

EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ PROCEED - Safe to deploy"
  # Continue deployment pipeline
elif [ $EXIT_CODE -eq 1 ]; then
  echo "⚠️ CAUTION - Multiple P1 issues detected"
  # Optional: Require manual approval before deploying
elif [ $EXIT_CODE -eq 2 ]; then
  echo "🛑 BLOCK - Critical P0 issues detected"
  exit 1  # Block deployment
else
  echo "❌ ERROR - Analysis failed with code $EXIT_CODE"
  exit 1  # Block deployment due to analysis failure
fi
```

#### Example 2: Strict gating with P1 threshold

```bash
# Fail on any P1 issue
node scripts/analyze-orchestration-run.mjs "$RUN_ID" --fail-on P1

EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ PROCEED - No high-priority issues"
else
  echo "❌ BLOCKED - High-priority issues or analysis error"
  exit 1
fi
```

#### Example 3: Always proceed (monitoring only)

```bash
# Run analysis for monitoring, never block deployment
node scripts/analyze-orchestration-run.mjs "$RUN_ID" --fail-on none

# Always continue, just log the results
echo "Analysis complete (exit code: $?)"
# Deployment proceeds regardless of issues
```

#### Example 4: Conditional gating based on branch

```bash
# Different policies for different branches
if [ "$BRANCH" = "main" ]; then
  # Strict on main branch
  node scripts/analyze-orchestration-run.mjs "$RUN_ID" --fail-on P0
elif [ "$BRANCH" = "develop" ]; then
  # Lenient on develop
  node scripts/analyze-orchestration-run.mjs "$RUN_ID" --fail-on none
fi

EXIT_CODE=$?
# Handle exit code based on branch policy
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

### Safe Extraction & Limits

The analyzer implements robust security controls to prevent malicious artifacts from compromising the analysis environment.

#### Path Sanitization

All extracted file paths are sanitized to prevent path traversal attacks:

**Sanitization Steps:**
1. Reject absolute paths (starting with `/` or drive letters like `C:`)
2. Reject paths containing `..` components (parent directory traversal)
3. Normalize paths using `path.normalize()` to resolve symbolic references
4. Verify final resolved path remains within the extraction base directory

**Example Protection:**

```javascript
// ❌ REJECTED: Absolute path
"/etc/passwd"

// ❌ REJECTED: Path traversal attempt
"../../.ssh/id_rsa"

// ❌ REJECTED: Path traversal with normalization bypass
"foo/../../../etc/shadow"

// ✅ ALLOWED: Safe relative path
"logs/verification/health.json"

// ✅ ALLOWED: Nested relative path
"playwright-report/screenshots/login-test.png"
```

#### Size Cap

Maximum uncompressed artifact size: **250 MB**

**Rationale:**
- Prevents zip bomb attacks (small compressed file expanding to enormous size)
- Protects disk space on analysis machine
- Ensures analysis completes in reasonable time
- Typical orchestration artifacts are 10-50 MB uncompressed

**Behavior:**
- Extraction tracks cumulative uncompressed size across all files
- If limit is exceeded during extraction, process is aborted immediately
- Partial extraction is discarded to prevent incomplete analysis
- Error is logged with details about the oversized artifact

**Example:**
```
❌ Extraction aborted: total size exceeds 250.00 MB
   Files extracted: 1,234
   Cumulative size: 251.45 MB
   Limit: 250.00 MB
```

#### File Count Cap

Maximum files per artifact: **10,000 files**

**Rationale:**
- Prevents decompression bomb attacks (archive with millions of tiny files)
- Prevents filesystem exhaustion (inode limits)
- Ensures reasonable extraction and processing time
- Typical orchestration artifacts contain 100-500 files

**Behavior:**
- Extraction tracks number of files extracted
- If limit is exceeded, extraction is aborted immediately
- Partial extraction is discarded
- Error is logged with details

**Example:**
```
❌ Extraction aborted: file count exceeds 10,000
   Files extracted: 10,001
   Limit: 10,000
```

#### Typical Artifact Sizes

For reference, typical artifact sizes from orchestration workflows:

| Artifact | Files | Compressed | Uncompressed | Notes |
|----------|-------|------------|--------------|-------|
| verification-and-smoke-artifacts | ~50 | 2-5 MB | 5-15 MB | Logs, JSON, Markdown files |
| playwright-report | ~200 | 5-10 MB | 15-30 MB | HTML, JSON, screenshots |
| regression-and-a11y-artifacts | ~100 | 3-8 MB | 10-25 MB | Test results, a11y scans |
| **Total** | **~350** | **10-23 MB** | **30-70 MB** | Well within limits |

#### Monitoring Extraction

The analyzer logs extraction progress with debug-level messages:

```bash
# Enable debug logging to monitor extraction
node scripts/analyze-orchestration-run.mjs 19125388400 --log-level debug
```

**Debug Output:**
```
[2025-11-10T18:45:30.123Z] DEBUG Path sanitized: logs/health.json -> /path/to/temp-artifacts/logs/health.json
[2025-11-10T18:45:30.124Z] DEBUG Extraction stats: 1 files, 2.34 KB
[2025-11-10T18:45:30.234Z] DEBUG Extraction stats: 50 files, 1.23 MB
[2025-11-10T18:45:31.456Z] DEBUG Extraction stats: 200 files, 15.67 MB
[2025-11-10T18:45:32.789Z] ✓ Extracted 347 files, total size: 45.23 MB
```

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

The orchestration analyzer can be integrated into automated GitHub Actions workflows to provide continuous verification and deployment gating.

### Workflow Triggers

The analyzer is designed to work with the following trigger scenarios:

1. **Post-Deployment Verification**
   - Triggered automatically after successful deployment to staging
   - Runs comprehensive health checks, authentication tests, and regression verification
   - Analyzes results to determine if deployment was successful
   
2. **Manual Workflow Dispatch**
   - Triggered manually from GitHub Actions UI or via `gh workflow run`
   - Useful for ad-hoc verification before production deployment
   - Allows on-demand analysis of current staging environment state

3. **Pull Request Quality Gates**
   - Triggered on PR merge to main branch
   - Runs analysis on orchestration workflow results
   - Blocks further deployments if critical issues detected

4. **Scheduled Monitoring**
   - Triggered on a cron schedule (e.g., daily at 9 AM)
   - Monitors staging environment health over time
   - Detects regression or degradation trends

### Integration Workflow

```yaml
# Example: .github/workflows/post-orchestration-analysis.yml
name: Post-Orchestration Analysis

on:
  workflow_run:
    workflows: ["Orchestrate Verification and Sweep"]
    types:
      - completed

jobs:
  analyze:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion != 'skipped' }}
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Authenticate GitHub CLI
        run: gh auth login --with-token <<< "${{ secrets.GITHUB_TOKEN }}"
      
      - name: Run Analysis
        id: analysis
        run: |
          RUN_ID="${{ github.event.workflow_run.id }}"
          node scripts/analyze-orchestration-run.mjs "$RUN_ID" \
            --fail-on P0 \
            --json \
            --out-dir ./analysis-output
        continue-on-error: true
      
      - name: Upload Analysis Reports
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: analysis-reports
          path: analysis-output/
          retention-days: 30
      
      - name: Check Exit Code
        run: |
          EXIT_CODE=${{ steps.analysis.outcome }}
          if [ "$EXIT_CODE" = "failure" ]; then
            echo "::error::Critical issues detected - deployment blocked"
            exit 1
          fi
```

### Console Output Examples

When running the analyzer, you'll see structured output indicating the analysis progress and results:

#### Example: Successful Run (No Issues)

```
[2025-11-10T18:45:23.123Z] ℹ Analyzing Run ID: 19125388400
[2025-11-10T18:45:23.234Z] ✓ GitHub CLI is installed
[2025-11-10T18:45:24.567Z] ✓ Run: Orchestrate Verification and Sweep
[2025-11-10T18:45:24.568Z] ℹ Status: completed | Conclusion: success
[2025-11-10T18:45:25.890Z] ✓ Found 3 artifacts
[2025-11-10T18:45:30.123Z] ✓ Downloaded verification-and-smoke-artifacts
[2025-11-10T18:45:35.456Z] ✓ Downloaded playwright-report
[2025-11-10T18:45:40.789Z] ✓ Downloaded regression-and-a11y-artifacts

============================================================
ANALYSIS SUMMARY
============================================================

Issues by Priority:
  P0 (Critical):  0
  P1 (High):      0
  P2 (Medium):    2
  P3 (Minor):     5

Test Results:
  Playwright:     ✓ 12/12 passed
  Health Checks:  ✓ All endpoints healthy
  Auth Tests:     ✓ Authentication successful

Gating Decision:
  ✅ PROCEED - No critical issues

============================================================

[2025-11-10T18:45:45.123Z] ✓ Analysis complete!
[2025-11-10T18:45:45.124Z] ℹ Exit code: 0 (based on --fail-on=P0)
```

#### Example: Run with P0 Issues (Blocked)

```
[2025-11-10T18:45:23.123Z] ℹ Analyzing Run ID: 19125388401
[2025-11-10T18:45:24.567Z] ✓ Run: Orchestrate Verification and Sweep
[2025-11-10T18:45:30.890Z] ✗ Health check failed: /api/health returned 503

============================================================
ANALYSIS SUMMARY
============================================================

Issues by Priority:
  P0 (Critical):  2  🚨
  P1 (High):      3
  P2 (Medium):    4
  P3 (Minor):     8

Critical Issues (P0):
  1. Health Check Failed: /api/health endpoint unreachable
  2. Authentication Failed: Login returned 401 Unauthorized

Test Results:
  Playwright:     ✗ 9/12 passed (3 failed)
  Health Checks:  ✗ Critical endpoint down
  Auth Tests:     ✗ Authentication failed

Gating Decision:
  🛑 BLOCK - Critical issues must be resolved

============================================================

[2025-11-10T18:45:45.123Z] ✗ Analysis complete with critical issues
[2025-11-10T18:45:45.124Z] ℹ Exit code: 2 (based on --fail-on=P0)
```

#### Example: Run with P1 Issues (Caution)

```
[2025-11-10T18:45:23.123Z] ℹ Analyzing Run ID: 19125388402

============================================================
ANALYSIS SUMMARY
============================================================

Issues by Priority:
  P0 (Critical):  0
  P1 (High):      5  ⚠️
  P2 (Medium):    3
  P3 (Minor):     10

High-Priority Issues (P1):
  1. Playwright Test Failed: Login flow - timeout on submit button
  2. Playwright Test Failed: Profile edit - form validation issue
  3. A11y Violation (Serious): Missing alt text on 3 images
  4. A11y Violation (Serious): Insufficient color contrast on CTA button
  5. CSP Violation: Inline script blocked 2 times

Test Results:
  Playwright:     ⚠ 10/12 passed (2 failed)
  Health Checks:  ✓ All endpoints healthy
  Auth Tests:     ✓ Authentication successful

Gating Decision:
  ⚠️  CAUTION - Multiple high-priority issues

============================================================

[2025-11-10T18:45:45.123Z] ⚠ Analysis complete with high-priority issues
[2025-11-10T18:45:45.124Z] ℹ Exit code: 1 (based on --fail-on=P0)
```

### Gating Decision Badges

The analyzer produces a gating recommendation based on the detected issues:

| Badge | Decision | Criteria | Action |
|-------|----------|----------|--------|
| **🛑 BLOCK** | Do not deploy | One or more P0 (critical) issues present | Stop deployment process immediately. Fix all P0 issues, re-run workflow, and re-analyze. |
| **⚠️ CAUTION** | Review required | Multiple P1 (high-priority) issues (>3) | Review each P1 issue with team. Create tracking issues. Decide if deployment can proceed with known risks. |
| **⚠️ REVIEW** | Review recommended | Some P1 issues (1-3) | Review P1 issues. Create tracking issues. Deployment can proceed if risks are acceptable. |
| **✅ PROCEED** | Safe to deploy | No P0 issues, few or no P1 issues | Proceed with deployment. Track any P2/P3 issues in backlog. |

### Automatic PR Comments

When integrated with `ORCHESTRATION_BOT_PAT`, the analyzer can post results directly to pull requests:

**Prerequisites:**
- `ORCHESTRATION_BOT_PAT` secret configured with scopes:
  - `contents: read` - For accessing repository content
  - `pull_requests: write` - For posting comments
  - `actions: read` - For reading workflow run information

**Example Comment:**

```markdown
## 🤖 Orchestration Analysis Results

**Run ID:** 19125388400  
**Status:** ✅ PROCEED  
**Analyzed:** 2025-11-10 18:45:45 UTC

### Summary
- **P0 (Critical):** 0
- **P1 (High):** 0
- **P2 (Medium):** 2
- **P3 (Minor):** 5

### Test Results
- ✅ Playwright: 12/12 passed
- ✅ Health Checks: All endpoints healthy
- ✅ Auth Tests: Authentication successful

### Gating Decision
✅ **PROCEED** - No critical issues detected

Safe to deploy to production.

---
[View Full Report](link-to-artifact) | [Re-run Analysis](link-to-workflow)
```

### Use Cases

1. **Post-Merge Deployment Gating**
   - Run analyzer after each merge to main
   - Block deployment pipeline if P0 issues detected
   - Alert team in Slack/Discord on failures

2. **Scheduled Environment Monitoring**
   - Run orchestration workflow daily
   - Analyze results and track trends over time
   - Detect environmental drift or degradation

3. **Pre-Production Verification**
   - Run before production deployment
   - Ensure staging environment is healthy
   - Verify recent changes haven't introduced regressions

4. **Automated Issue Creation**
   - Parse `draft-github-issues.json`
   - Automatically create GitHub issues for P1/P2 findings
   - Assign to appropriate team members

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
