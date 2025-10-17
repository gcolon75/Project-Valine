# Phase 5 Triage Agent - Quick Reference

## TL;DR

**What it does:** Analyzes failed CI runs, extracts errors, proposes fixes.

**When to use:** PR failed, workflow failed, something's broken and you want to know why.

**How to run:**
```bash
# Via GitHub Actions
Actions → Phase 5 Triage Agent → Run workflow → Enter PR/run ID

# Via CLI
python phase5_triage_agent.py run --repo owner/repo --failure-ref 49
```

## Common Commands

### Triage a PR
```bash
export GITHUB_TOKEN="your_token"
cd orchestrator/scripts
python phase5_triage_agent.py run \
  --repo gcolon75/Project-Valine \
  --failure-ref 49
```

### Triage a Workflow Run
```bash
python phase5_triage_agent.py run \
  --repo gcolon75/Project-Valine \
  --failure-ref 1234567890
```

### Dry Run (Safe Mode)
```bash
python phase5_triage_agent.py run \
  --repo gcolon75/Project-Valine \
  --failure-ref 49 \
  --dry-run
```

### With Auto-Fix
```bash
python phase5_triage_agent.py run \
  --repo gcolon75/Project-Valine \
  --failure-ref 49 \
  --auto-fix
```

## Output Files

All outputs go to `triage_output/` directory:

- `phase5_triage_report.md` - Human-readable report
- `phase5_triage_report.json` - Machine-readable (redacted)
- `fix_patch.diff` - Proposed code changes
- `quick_playbook.txt` - Copy/paste commands

## Failure Categories

The agent categorizes failures automatically:

| Category | Description | Fix Type |
|----------|-------------|----------|
| `test_failure` | Test failed/assertion error | Patch |
| `missing_dependency` | Module not found | Config |
| `python_error` | Exception/runtime error | Patch |
| `job_failure` | Generic job failure | Playbook |
| `environment_mismatch` | Config/env issue | Config |
| `unknown` | Needs investigation | Playbook |

## Report Structure

```markdown
# Phase 5 Failed-Run Triage Report
├── Context (repo, PR, commit, branch)
├── Failure Summary (one-liner)
├── Root Cause (category + details)
├── Failure Details (stack trace, logs)
├── Proposed Fix (type, files, commands)
├── Next Steps (actionable items)
└── Rollback Plan (undo instructions)
```

## Inputs

### Required
- `repo` - Repository (e.g., `gcolon75/Project-Valine`)
- `failure_ref` - PR number, workflow run ID, or URL

### Optional
- `--auto-fix` - Enable automatic PR creation (default: `false`)
- `--dry-run` - Safe mode, no changes (default: `false`)
- `--verbose` - Detailed logging (default: `true`)

### Environment Variables
- `GITHUB_TOKEN` - Required for GitHub API access

## GitHub Actions Usage

1. Go to **Actions** tab
2. Select **Phase 5 Triage Agent**
3. Click **Run workflow**
4. Fill in:
   - **Failure Ref**: PR number or workflow run ID
   - **Allow Auto-Fix**: ☐ (leave unchecked for safety)
   - **Dry Run**: ☑ (check for first run)
   - **Verbose**: ☑ (check for detailed logs)
5. Click **Run workflow**
6. Check **Summary** tab for results
7. Download artifacts for detailed reports

## Examples

### Example 1: Failed PR
```bash
# PR #49 has test failures
python phase5_triage_agent.py run --repo gcolon75/Project-Valine --failure-ref 49

# Output: triage_output/phase5_triage_report.md
# Contains: Test name, stack trace, proposed fix
```

### Example 2: Missing Dependency
```bash
# Workflow run 1234567890 failed with "ModuleNotFoundError"
python phase5_triage_agent.py run --repo gcolon75/Project-Valine --failure-ref 1234567890

# Output: triage_output/quick_playbook.txt
# Contains: pip install commands
```

### Example 3: Python Error
```bash
# PR #50 has ValueError
python phase5_triage_agent.py run --repo gcolon75/Project-Valine --failure-ref 50

# Output: triage_output/fix_patch.diff
# Contains: Code changes to fix the error
```

## Troubleshooting

### Problem: "Could not resolve failure_ref"
- **Fix**: Check that failure_ref is valid (PR 1-9999, run ID 10+ digits)

### Problem: "403 Forbidden"
- **Fix**: Ensure `GITHUB_TOKEN` has `repo` and `actions:read` scopes

### Problem: "No failures extracted"
- **Fix**: Agent may not recognize log format - check triage report for raw logs

### Problem: Workflow doesn't start
- **Fix**: Check `.github/workflows/phase5-triage-agent.yml` syntax

## Safety Features

✓ **Secret Redaction**: All tokens shown as `***abcd` (last 4 chars only)
✓ **Dry Run Mode**: Preview changes without applying
✓ **No Production Changes**: All edits target branches, never main
✓ **Risk Assessment**: High-risk fixes require manual approval

## Integration

### With CI/CD
- Workflow runs on manual trigger
- Uploads artifacts (90-day retention)
- Comments on PRs with triage results
- Generates workflow summaries

### With Other Tools
- JSON output for parsing
- Git patches for applying fixes
- Playbook scripts for automation

## Performance

- **Typical runtime**: 30-60 seconds
- **Log processing**: Up to 100K lines
- **Failure extraction**: Top 50 errors
- **Report generation**: < 1 second

## Limitations

- Only GitHub-hosted repositories
- Requires GitHub token with appropriate scopes
- Auto-fix PR creation not yet implemented
- Limited to common log formats (pytest, npm, Python)

## Next Steps

After running triage:

1. **Review Report**: Read `phase5_triage_report.md`
2. **Verify Root Cause**: Check if analysis makes sense
3. **Test Fix Locally**: Apply patch/commands and test
4. **Apply Fix**: 
   - Manual: Copy changes from report
   - Auto: Enable `--auto-fix` (when available)
5. **Verify**: Re-run failing job to confirm fix

## Support

- **Documentation**: `orchestrator/PHASE5_TRIAGE_AGENT_GUIDE.md`
- **Examples**: `orchestrator/example_triage_usage.py`
- **Tests**: `orchestrator/tests/test_phase5_triage_agent.py`
- **Issues**: Tag with `phase5` and `triage` labels

## Cheat Sheet

```bash
# Install
pip install requests

# Setup
export GITHUB_TOKEN="your_token"
cd orchestrator/scripts

# Basic triage
python phase5_triage_agent.py run --repo owner/repo --failure-ref <ref>

# Generate config
python phase5_triage_agent.py generate-config --output config.json

# Run with config
python phase5_triage_agent.py run --config config.json

# Test
cd ../
python -m pytest tests/test_phase5_triage_agent.py -v
```

---

**Pro tip:** Start with `--dry-run` on first use to see what the agent would do without making changes.
