# Phase 5 Failed-Run Triage & Fix Agent

## Overview

The Phase 5 Triage Agent is an automated tool for analyzing failed CI runs, PRs, and workflow executions. It identifies root causes, extracts relevant logs and stack traces, and proposes minimal fixes—all while maintaining security through secret redaction and dry-run capabilities.

**Built for speedrunners:** Find what failed, why it failed, produce a minimal safe fix (or clear remediation playbook). No drama. No secrets.

## Quick Links

- 📖 **[Complete Guide](PHASE5_TRIAGE_AGENT_GUIDE.md)** - Full documentation
- 🚀 **[Quick Reference](PHASE5_TRIAGE_QUICK_REF.md)** - Cheat sheet and common commands
- 💻 **[Example Usage](example_triage_usage.py)** - Basic usage patterns
- 🔬 **[Integration Demo](demo_triage_integration.py)** - Detailed scenarios

## Features

### Core Capabilities

✅ **Automatic Failure Detection**
- Detects pytest failures, Python errors, missing dependencies
- Extracts stack traces and error messages
- Maps failures to specific files and line numbers

✅ **Root Cause Analysis**
- Categorizes failures (test_failure, missing_dependency, python_error, etc.)
- Identifies affected files and functions
- Provides confidence levels for diagnoses

✅ **Fix Proposals**
- Generates minimal patches for code issues
- Suggests config changes for dependency problems
- Creates playbooks for complex issues
- Risk assessment (low/medium/high) for each fix

✅ **Comprehensive Reports**
- Markdown reports for humans
- JSON reports for machines
- Git patches for code changes
- Shell scripts for quick fixes

✅ **Security & Safety**
- Secret redaction (shows `***abcd` for tokens)
- Dry-run mode for testing
- No direct production changes
- Branch naming policies enforced

## Installation

### Prerequisites

- Python 3.11+
- GitHub token with `repo` and `actions:read` scopes

### Setup

```bash
# Clone the repository
git clone https://github.com/gcolon75/Project-Valine.git
cd Project-Valine/orchestrator

# Install dependencies
pip install requests

# Set up GitHub token
export GITHUB_TOKEN="your_github_token"
```

## Usage

### Via GitHub Actions (Recommended)

1. Navigate to **Actions** → **Phase 5 Triage Agent**
2. Click **Run workflow**
3. Enter failure reference (PR number, workflow run ID, or URL)
4. Configure options:
   - **Allow auto-fix**: `false` (default, for safety)
   - **Dry run**: `false` (set to `true` for testing)
   - **Verbose**: `true` (default)
5. Click **Run workflow**
6. Review the workflow summary and download artifacts

### Via Command Line

#### Triage a PR
```bash
cd orchestrator/scripts
python phase5_triage_agent.py run \
  --repo gcolon75/Project-Valine \
  --failure-ref 49
```

#### Triage a Workflow Run
```bash
python phase5_triage_agent.py run \
  --repo gcolon75/Project-Valine \
  --failure-ref 1234567890
```

#### Dry Run (Safe Mode)
```bash
python phase5_triage_agent.py run \
  --repo gcolon75/Project-Valine \
  --failure-ref 49 \
  --dry-run
```

#### Generate Config File
```bash
python phase5_triage_agent.py generate-config \
  --output triage_config.json
```

## Output Structure

All outputs are saved to `triage_output/` directory:

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
**Timestamp:** 2025-10-17T22:00:00Z

## Context
- Repository: gcolon75/Project-Valine
- PR: #49
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

## Failure Categories

The agent automatically categorizes failures:

| Category | Description | Typical Fix |
|----------|-------------|-------------|
| `test_failure` | Test failed or assertion error | Patch code or test |
| `missing_dependency` | Module/package not found | Update requirements.txt |
| `python_error` | Runtime exception/error | Add error handling |
| `job_failure` | Generic job failure | Manual investigation |
| `environment_mismatch` | Config/env issue | Update config |
| `unknown` | Unclear root cause | Manual analysis |

## Examples

### Scenario 1: Test Failure

**Problem:** PR has failing tests

```bash
python phase5_triage_agent.py run --repo owner/repo --failure-ref 49
```

**Result:**
- Identifies failed test: `test_foo`
- Extracts assertion error
- Proposes fix to test or implementation
- Risk: LOW | Confidence: HIGH

### Scenario 2: Missing Dependency

**Problem:** Workflow fails with "ModuleNotFoundError"

```bash
python phase5_triage_agent.py run --repo owner/repo --failure-ref 1234567890
```

**Result:**
- Identifies missing module: `requests`
- Generates pip install command
- Suggests requirements.txt update
- Risk: LOW | Confidence: HIGH

### Scenario 3: Python Error

**Problem:** Runtime error in production code

```bash
python phase5_triage_agent.py run --repo owner/repo --failure-ref 50
```

**Result:**
- Extracts stack trace
- Identifies affected files
- Proposes null guard or error handling
- Risk: MEDIUM | Confidence: HIGH

## Testing

### Run Unit Tests

```bash
cd orchestrator
python -m pytest tests/test_phase5_triage_agent.py -v
```

**Expected:** 31 tests pass

### Run Example Demonstrations

```bash
# Basic usage examples
python example_triage_usage.py

# Integration scenarios
python demo_triage_integration.py
```

## Development

### Project Structure

```
orchestrator/
├── scripts/
│   └── phase5_triage_agent.py         # Main agent (1,000+ lines)
├── tests/
│   └── test_phase5_triage_agent.py    # Unit tests (31 tests)
├── PHASE5_TRIAGE_AGENT_GUIDE.md       # Complete guide
├── PHASE5_TRIAGE_QUICK_REF.md         # Quick reference
├── example_triage_usage.py            # Usage examples
└── demo_triage_integration.py         # Integration demo

.github/workflows/
└── phase5-triage-agent.yml            # GitHub Actions workflow
```

### Adding New Failure Patterns

1. Edit `orchestrator/scripts/phase5_triage_agent.py`
2. Add pattern to `extract_failures()` method
3. Create extraction method (e.g., `_extract_custom_failure()`)
4. Add tests to `tests/test_phase5_triage_agent.py`
5. Run tests to verify

## Troubleshooting

### Common Issues

**Issue:** "Could not resolve failure_ref"
- **Fix:** Verify failure_ref is valid (PR: 1-9999, run ID: 10+ digits, or valid URL)

**Issue:** "403 Forbidden" from GitHub API
- **Fix:** Ensure `GITHUB_TOKEN` has `repo` and `actions:read` scopes

**Issue:** "No failures extracted from logs"
- **Fix:** Check triage report for raw logs; may need custom parser for your log format

**Issue:** Workflow doesn't start
- **Fix:** Validate `.github/workflows/phase5-triage-agent.yml` with `yamllint`

### Getting Help

- Check **[Complete Guide](PHASE5_TRIAGE_AGENT_GUIDE.md)** for detailed troubleshooting
- Review **[Quick Reference](PHASE5_TRIAGE_QUICK_REF.md)** for common commands
- Open an issue with `phase5` and `triage` labels

## Security

### Built-in Safety Features

- **Secret Redaction**: All tokens redacted to `***abcd` format
- **No Raw Credentials**: Never prints or stores full tokens/passwords
- **Dry-Run Mode**: Test without making changes
- **No Production Pushes**: All changes target branches, never main
- **Risk Assessment**: High-risk fixes require manual approval

### Permissions Required

- `contents: write` - For creating branches (auto-fix only)
- `pull-requests: write` - For creating PRs (auto-fix only)
- `actions: read` - For reading workflow runs

## Limitations

- Supports GitHub-hosted repositories only
- Requires GitHub token with appropriate scopes
- Auto-fix PR creation framework ready but not fully implemented
- Recognizes common log formats (pytest, npm, Python) - custom formats may need adaptation

## Roadmap

- [ ] Complete auto-fix PR creation
- [ ] Add support for more log formats (npm, Maven, Gradle, etc.)
- [ ] Integrate with CodeQL for security-aware fixes
- [ ] Add ML-based root cause prediction
- [ ] Support for GitLab and Bitbucket

## Contributing

Contributions welcome! To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Ensure all tests pass
6. Submit a PR with clear description

## License

Part of Project Valine. See root [LICENSE](../LICENSE) file for details.

## Acknowledgments

Built as part of Phase 5 of Project Valine's CI/CD enhancement initiative.

**Inspired by:** The need to speedrun failure triage without the drama.

---

**Status:** ✅ Production Ready

**Version:** 1.0.0

**Last Updated:** 2025-10-17
