# Discord /triage Command - Quick Reference

## Overview

The `/triage` command auto-diagnoses failing GitHub Actions runs and creates draft PRs with fixes. It integrates with the Phase 5 Triage Agent to analyze failures, extract root causes, and propose minimal fixes.

## Usage

```
/triage pr:<pr_number>
```

### Parameters

- **pr** (required): PR number or workflow run ID to triage
  - PR numbers: 1-9999 (e.g., `58`)
  - Workflow run IDs: 10+ digits (e.g., `1234567890`)

### Examples

**Triage a PR:**
```
/triage pr:58
```

**Triage a workflow run:**
```
/triage pr:1234567890
```

## How It Works

1. **Trigger**: User runs `/triage pr:58` in Discord
2. **Acknowledgment**: Bot immediately responds with trace ID and status
3. **Analysis**: Phase 5 Triage Agent workflow starts:
   - Fetches workflow logs from GitHub Actions
   - Extracts failure details (stack traces, error messages)
   - Analyzes root cause (test failure, missing dependency, etc.)
   - Generates fix proposals with confidence levels
4. **Report**: Triage report saved to workflow artifacts:
   - `phase5_triage_report.md` - Human-readable report
   - `phase5_triage_report.json` - Machine-readable (redacted)
   - `fix_patch.diff` - Git patch (if applicable)
   - `quick_playbook.txt` - Shell commands for quick fixes
5. **PR Creation**: If auto-fix is enabled and confidence is high, a draft PR is created

## Response Format

```
🔍 **Starting Triage Analysis...**

**PR/Run:** `#58`
**Trace ID:** `abc12345...`
**Requested by:** username

⏳ Analyzing failures and generating report...

_This may take 30-60 seconds. The triage agent will:_
• Fetch workflow logs
• Extract failure details
• Analyze root cause
• Generate fix proposals
• Create actionable report

_Check the workflow runs or use `/status` to monitor progress._

✅ Triage workflow triggered successfully!
```

## Security & Safety

### Guardrails

- **Secret Redaction**: All tokens redacted to `***abcd` format
- **Safe Default**: `allow_auto_fix=false` (no automatic PR creation)
- **Draft PRs**: All auto-created PRs are drafts requiring review
- **Audit Trail**: Full logging and tracing for all operations
- **No Direct Changes**: Never modifies production code without review

### What Gets Redacted

The triage agent automatically redacts:
- GitHub tokens (`ghp_*`, `ghs_*`, `github_pat_*`)
- Bearer tokens
- API keys
- Passwords
- Private keys

Redaction format: `***abcd` (shows last 4 characters)

## Failure Categories

The triage agent categorizes failures:

| Category | Description | Typical Fix |
|----------|-------------|-------------|
| `test_failure` | Test failed or assertion error | Patch code or test |
| `missing_dependency` | Module/package not found | Update requirements.txt |
| `python_error` | Runtime exception/error | Add error handling |
| `job_failure` | Generic job failure | Manual investigation |
| `environment_mismatch` | Config/env issue | Update config |
| `unknown` | Unclear root cause | Manual analysis |

## Output Artifacts

All triage outputs are saved to workflow artifacts:

```
triage_output/
├── phase5_triage_report.md      # Human-readable report
├── phase5_triage_report.json    # Machine-readable (redacted)
├── fix_patch.diff               # Git patch (if applicable)
└── quick_playbook.txt           # Shell commands for quick fixes
```

### Example Report Structure

```markdown
# Phase 5 Failed-Run Triage Report

**Correlation ID:** TRIAGE-1697579387
**Timestamp:** 2025-10-18T22:00:00Z

## Context
- Repository: gcolon75/Project-Valine
- PR: #58
- Commit: abc12345
- Branch: feature-branch

## Failure Summary
1 test failure detected: test_foo

## Root Cause
Category: test_failure
Details: Assertion mismatch in test

## Proposed Fix
Type: patch
Description: Fix test assertion
Files to change: tests/test_foo.py
Risk: LOW | Confidence: HIGH

## Next Steps
- Review the proposed fix
- Apply changes to tests/test_foo.py
- Run: pytest tests/test_foo.py
- Re-run CI to verify
```

## Monitoring Progress

### Check Workflow Status

Use `/status` to see recent workflow runs:
```
/status
```

### View Run Details

1. Go to **Actions** → **Phase 5 Triage Agent**
2. Find your run by correlation ID or timestamp
3. Download artifacts to see reports
4. Check logs for detailed execution

### CloudWatch Logs

Search logs by trace ID:
```bash
aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow
```

## Limitations

- **GitHub Only**: Supports GitHub-hosted repositories only
- **Token Required**: Requires GitHub token with `repo` and `actions:read` scopes
- **Log Formats**: Recognizes common formats (pytest, npm, Python) - custom formats may need adaptation
- **Auto-Fix Framework**: Ready but PR creation not fully implemented (manual review required)

## Related Commands

- `/status` - Check recent workflow runs
- `/diagnose` - Run infrastructure diagnostics
- `/agents` - List all available agents
- `/verify-latest` - Verify latest deployment

## Troubleshooting

### "Could not resolve failure_ref"

**Cause**: Invalid PR number or workflow run ID

**Fix**: Verify the number is correct:
- PR numbers: 1-9999
- Workflow run IDs: 10+ digits

### "403 Forbidden" from GitHub API

**Cause**: GitHub token missing or lacks permissions

**Fix**: Ensure `GITHUB_TOKEN` has:
- `repo` scope
- `actions:read` scope

### "No failures extracted from logs"

**Cause**: Log format not recognized or logs empty

**Fix**: 
1. Check triage report for raw logs
2. Verify workflow actually failed
3. May need custom parser for your log format

### Workflow doesn't start

**Cause**: Workflow file missing or invalid

**Fix**: Validate `.github/workflows/phase5-triage-agent.yml` exists and is valid

## Advanced Usage

### Enable Auto-Fix (Requires Configuration)

To enable automatic PR creation:

1. Update workflow inputs:
```yaml
inputs:
  allow_auto_fix: true
```

2. Configure GitHub token with additional permissions:
- `contents: write` - For creating branches
- `pull-requests: write` - For creating PRs

3. Set up branch protection rules
4. Configure PR review requirements

**⚠️ Warning**: Auto-fix creates draft PRs but still requires human review before merging.

## API Integration

The triage command triggers the GitHub Actions workflow:

```python
dispatcher.trigger_workflow_dispatch(
    workflow_id='phase5-triage-agent.yml',
    ref='main',
    inputs={
        'failure_ref': str(pr_number),
        'allow_auto_fix': 'false',  # Safe default
        'dry_run': 'false',
        'verbose': 'true'
    }
)
```

## Development

### Testing Locally

Run the triage agent locally:

```bash
cd orchestrator/scripts
python phase5_triage_agent.py run \
  --repo gcolon75/Project-Valine \
  --failure-ref 58 \
  --dry-run
```

### Running Tests

```bash
cd orchestrator
python -m unittest tests.test_triage_command -v
```

### Adding New Failure Patterns

1. Edit `orchestrator/scripts/phase5_triage_agent.py`
2. Add pattern to `extract_failures()` method
3. Create extraction method (e.g., `_extract_custom_failure()`)
4. Add tests to `tests/test_phase5_triage_agent.py`
5. Run tests to verify

## References

- [Phase 5 Triage Agent Guide](PHASE5_TRIAGE_AGENT_GUIDE.md)
- [Phase 5 Triage Quick Start](PHASE5_TRIAGE_QUICK_START.md)
- [Auto Triage Quick Start](../AUTO_TRIAGE_QUICKSTART.md)
- [Orchestrator README](README.md)

---

**Status:** ✅ Production Ready  
**Version:** 1.0.0 (Phase 6)  
**Last Updated:** 2025-10-18
