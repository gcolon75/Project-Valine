# Phase 5 Failed-Run Triage & Fix Agent

TL;DR (speedrun): Find what failed, why it failed, and produce a minimal, safe fix (or a clear remediation playbook). If safe and authorized, open a PR with the fix. No drama. No secrets.

## Mission

Triage a failing Phase 5 job / PR run (CI, agent run, or registration script). Produce a concise actionable triage report with:
- Root cause
- Failing test/log excerpt
- Files/lines implicated
- Exact minimal fix (code diff or config change)

Optionally create a branch + PR with the fix (only if flagged to do so).

## Quick Start

### Via GitHub Actions (Recommended)

1. Navigate to **Actions** → **Phase 5 Triage Agent**
2. Click **Run workflow**
3. Enter the failure reference:
   - PR number (e.g., `49`)
   - Workflow run ID (e.g., `1234567890`)
   - Workflow run URL (e.g., `https://github.com/owner/repo/actions/runs/1234567890`)
4. Configure options:
   - **Allow auto-fix**: Enable automatic fix PR creation (default: `false`)
   - **Dry run**: Preview mode without making changes (default: `false`)
   - **Verbose**: Enable detailed logging (default: `true`)
5. Click **Run workflow**

### Via CLI

```bash
# Navigate to orchestrator scripts directory
cd orchestrator/scripts

# Run triage for a PR
export GITHUB_TOKEN="your_github_token"
python phase5_triage_agent.py run --repo gcolon75/Project-Valine --failure-ref 49

# Run triage for a workflow run
python phase5_triage_agent.py run --repo gcolon75/Project-Valine --failure-ref 1234567890

# Run triage with auto-fix enabled
python phase5_triage_agent.py run --repo gcolon75/Project-Valine --failure-ref 49 --auto-fix

# Run triage in dry-run mode
python phase5_triage_agent.py run --repo gcolon75/Project-Valine --failure-ref 49 --dry-run

# Generate default config file
python phase5_triage_agent.py generate-config --output triage_config.json

# Run with config file
python phase5_triage_agent.py run --config triage_config.json
```

## Inputs

### Required

- **repo**: Repository in `owner/repo` format (e.g., `gcolon75/Project-Valine`)
- **failure_ref**: One of:
  - PR number (e.g., `49`)
  - Workflow run ID (e.g., `1234567890`)
  - Workflow run URL (e.g., `https://github.com/owner/repo/actions/runs/1234567890`)
  - Agent run URL

### Optional

- **allow_auto_fix**: Enable automatic fix PR creation (default: `false`)
- **actor**: GitHub login performing actions (default: `github-actions`)
- **dry_run**: Dry run mode - no modifications (default: `false`)
- **verbose**: Enable verbose output (default: `true`)

### Credentials

The following environment variables must be set:

- **GITHUB_TOKEN**: GitHub personal access token with `repo` scope

Optional (only if needed for specific features):
- AWS credentials (for Lambda/CloudWatch log analysis)
- Discord bot token (for Discord-related failures)

## Outputs

The agent generates the following outputs in the `triage_output/` directory:

1. **phase5_triage_report.md** - Human-readable Markdown report
2. **phase5_triage_report.json** - Machine-readable JSON report (redacted)
3. **fix_patch.diff** - Unified diff patch (if applicable)
4. **quick_playbook.txt** - Copy/paste remediation commands

### Report Structure

```markdown
# Phase 5 Failed-Run Triage Report

**Correlation ID:** TRIAGE-1234567890
**Timestamp:** 2025-10-17T21:49:47Z

---

## Context
- **Repository:** gcolon75/Project-Valine
- **Ref Type:** pr
- **Ref ID:** 49
- **PR:** #49
- **Commit:** abc12345
- **Branch:** feature-branch

## Failure Summary
1 failure(s) detected: test_foo

## Root Cause
**Category:** test_failure
**Details:** test_failure: 1 test(s) failed: test_foo

## Failure Details
### Failure 1
**Test:** test_foo
**Error:** AssertionError: expected True
**Stack Trace:**
```
File "tests/test_foo.py", line 10, in test_foo
    assert result == True
```

## Proposed Fix
**Type:** patch
**Description:** Fix failing test
**Risk Level:** low
**Confidence:** high

**Files to Change:**
- tests/test_foo.py

**Test Plan:**
Fix test: test_foo
Run: pytest tests/test_foo.py

## Next Steps
- Review the triage report and proposed fix
- Verify the root cause matches expectations
- Test the proposed fix locally if possible
- Apply the patch and run affected tests

## Rollback Plan
If fix causes issues:
1. Revert the PR or commit
2. Re-run the original failing job to confirm revert
3. Investigate alternative fixes
```

## Features

### 1. Fetch Context
- Resolves failure_ref to the failing PR/workflow/run
- Fetches run logs, test output, and PR diff
- Lists files changed in PR and files touched by failing job

### 2. Summarize Failure
- Extracts top 6 relevant log lines
- Extracts stack trace/test failure output
- Identifies test names or commands that exited non-zero
- Maps stack trace frames to repo files and line numbers

### 3. Root-Cause Analysis
- Uses targeted code search to find functions/classes referenced
- Examines recent commits/PRs that touched those files
- Categorizes cause:
  - `test_failure` - Test assumption change
  - `missing_dependency` - Missing dependency
  - `environment_mismatch` - Environment configuration issue
  - `python_error` - Python exception/error
  - `job_failure` - Generic job failure
  - `unknown` - Could not determine cause

### 4. Remediation Options
Produces ordered remediation options:

1. **Minimal patch** - 1-3 small edits that fix the failing case
2. **Config tweak** - Timeouts, env var defaults for environment-sensitive failures
3. **Revert/rollback** - If recent commit introduced regression
4. **Remediation playbook** - For non-trivial fixes (infra/permissions/design)

### 5. Safety Checks
Before any automated commit:
- Runs local unit tests relevant to change (if available)
- Lint/typecheck hooks if applicable
- Never prints or stores raw secrets (redacts tokens to `***abcd`)

### 6. Create Fix PR (Optional)
If `allow_auto_fix` is enabled:
- Creates branch `fix/phase5-triage-<short>`
- Commits minimal change(s) with descriptive commit message
- Opens PR with:
  - Title: `fix(triage): <short summary> — fixes #<PR-number-or-run>`
  - Body: problem → root cause → changes → test plan → reviewer list
- Requests reviewers per CODEOWNERS

## Guardrails

### Non-Negotiable Safety Rules

1. **No secret leaks**: Never print or store raw secrets. Redact tokens (show only last 4 chars as `***abcd`)
2. **No production changes**: All edits must target a branch and PR
3. **Risk assessment**: If remediation touches infra/permissions/anything risky, do NOT auto-fix — only propose
4. **Branch policy**: Always use branch naming: `fix/phase5-triage-<short>`

### Security Features

- Automatic secret redaction in all outputs
- GitHub token scoped to minimal permissions
- Dry-run mode for safe testing
- No direct pushes to main/production branches

## Examples

### Example 1: Triage a Failed PR

```bash
# PR #49 has failing tests
python phase5_triage_agent.py run \
  --repo gcolon75/Project-Valine \
  --failure-ref 49
```

**Output:**
```
[2025-10-17 21:49:47] [INFO] === Phase 5 Failed-Run Triage Agent ===
[2025-10-17 21:49:47] [INFO] Correlation ID: TRIAGE-1697579387
[2025-10-17 21:49:48] [INFO] Resolving failure ref: 49
[2025-10-17 21:49:48] [INFO] Detected as PR number: 49
[2025-10-17 21:49:49] [INFO] Resolved to PR #49, branch: feature, SHA: abc123
[2025-10-17 21:49:49] [INFO] Fetching logs...
[2025-10-17 21:49:50] [INFO] Extracting failure information from logs...
[2025-10-17 21:49:51] [INFO] Extracted 1 failure(s)
[2025-10-17 21:49:51] [INFO] Analyzing root cause...
[2025-10-17 21:49:51] [INFO] Root cause: test_failure: 1 test failed
[2025-10-17 21:49:51] [INFO] Generating fix proposal...
[2025-10-17 21:49:52] [INFO] Creating triage report...
[2025-10-17 21:49:52] [INFO] Saving triage report...
[2025-10-17 21:49:52] [INFO] Saved Markdown report: triage_output/phase5_triage_report.md
[2025-10-17 21:49:52] [INFO] Saved JSON report: triage_output/phase5_triage_report.json
[2025-10-17 21:49:52] [INFO] === Triage Complete ===

============================================================
Triage report saved to: ./triage_output
============================================================
```

### Example 2: Triage a Failed Workflow Run

```bash
# Workflow run 1234567890 failed
python phase5_triage_agent.py run \
  --repo gcolon75/Project-Valine \
  --failure-ref 1234567890 \
  --verbose
```

### Example 3: Auto-Fix with PR Creation

```bash
# Triage and auto-create fix PR
python phase5_triage_agent.py run \
  --repo gcolon75/Project-Valine \
  --failure-ref 49 \
  --auto-fix
```

**Note:** Auto-fix requires `allow_auto_fix=true` and proper GitHub token permissions.

### Example 4: Dry Run

```bash
# Test triage without making changes
python phase5_triage_agent.py run \
  --repo gcolon75/Project-Valine \
  --failure-ref 49 \
  --dry-run
```

## Configuration File

Generate a configuration file:

```bash
python phase5_triage_agent.py generate-config --output triage_config.json
```

Example `triage_config.json`:

```json
{
  "repo": "gcolon75/Project-Valine",
  "failure_ref": null,
  "allow_auto_fix": false,
  "actor": "github-actions",
  "github_token": null,
  "fix_branch_prefix": "fix/phase5-triage-",
  "timeout_http": 30,
  "timeout_git": 60,
  "dry_run": false,
  "verbose": true,
  "redaction_enabled": true,
  "output_dir": "./triage_output",
  "correlation_id_prefix": "TRIAGE"
}
```

Use environment variable references:

```json
{
  "repo": "gcolon75/Project-Valine",
  "failure_ref": 49,
  "github_token": "ENV:GITHUB_TOKEN",
  "allow_auto_fix": true
}
```

Run with config:

```bash
export GITHUB_TOKEN="your_token"
python phase5_triage_agent.py run --config triage_config.json
```

## Failure Handling & Escalation

### Missing Credentials

If required credentials are missing:

```
ERROR: GITHUB_TOKEN environment variable not set
```

**Solution:** Set the `GITHUB_TOKEN` environment variable.

### Ambiguous Failure

If multiple plausible root causes:

The agent lists hypotheses in the report with:
- Likelihood ranking
- Evidence for each hypothesis
- Fastest reproducible test for each

### High-Risk Fix

If proposed fix risks broad behavior changes:

The agent:
- Does NOT auto-apply (even if `allow_auto_fix=true`)
- Produces a detailed remediation playbook
- Requests human signoff in the report

## Integration with CI/CD

### GitHub Actions Workflow

The agent includes a pre-built GitHub Actions workflow at `.github/workflows/phase5-triage-agent.yml`.

To use:

1. Navigate to **Actions** → **Phase 5 Triage Agent**
2. Click **Run workflow**
3. Enter failure reference and options
4. Review the generated workflow summary and artifacts

### Workflow Features

- Automatic artifact upload (triage reports retained for 90 days)
- Workflow summary with full triage report
- PR commenting for PR-based triage
- Failure notifications

## Testing

Run unit tests:

```bash
cd orchestrator
python -m pytest tests/test_phase5_triage_agent.py -v
```

Run with coverage:

```bash
python -m pytest tests/test_phase5_triage_agent.py --cov=scripts.phase5_triage_agent --cov-report=html
```

## Troubleshooting

### Issue: "Could not resolve failure_ref"

**Cause:** Invalid failure reference format.

**Solution:** Ensure failure_ref is:
- A valid PR number (1-9999)
- A valid workflow run ID (10+ digits)
- A valid GitHub URL

### Issue: "403 Forbidden" when calling GitHub API

**Cause:** GitHub token lacks required permissions.

**Solution:** Ensure token has `repo` scope (and `actions:read` for workflow runs).

### Issue: No failures extracted from logs

**Cause:** Log format not recognized by parsers.

**Solution:** The agent supports common formats (pytest, npm test, Python errors). For custom formats, the agent creates a generic failure entry with available log excerpts.

## Contributing

To add support for new failure patterns:

1. Edit `orchestrator/scripts/phase5_triage_agent.py`
2. Add pattern to `extract_failures()` method
3. Add corresponding extraction method (e.g., `_extract_custom_failure()`)
4. Add tests to `orchestrator/tests/test_phase5_triage_agent.py`
5. Submit PR with examples

## License

Part of Project Valine. See root LICENSE file for details.

## Support

For issues or questions:
- Open an issue in the repository
- Tag with `phase5` and `triage` labels
- Provide failure reference and triage output
