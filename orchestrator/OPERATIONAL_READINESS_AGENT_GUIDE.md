# Operational Readiness Validation Agent - Usage Guide

## Overview

The Operational Readiness Validation Agent is a comprehensive SRE/dev-ops tool that validates the operational readiness of the Discord AI triage system. It performs automated security checks, workflow scans, secret detection, and can automatically detect and fix network-dependent test failures.

## Features

### Core Validation Tasks

1. **Repo Recon & Entry Points** - Identifies Discord handlers, GitHub Actions clients, agent scripts, and slash command registration
2. **Secrets-in-Code Check** - Scans for hardcoded secrets and maps example configs to GitHub secrets
3. **Workflow/CI Scan** - Analyzes GitHub Actions workflows, triggers, and referenced secrets
4. **Registration Commands** - Provides exact commands for staging setup and smoke tests
5. **E2E /triage Dry-Run Guide** - Step-by-step guide for testing the triage command
6. **Draft PR Policy Verification** - Verifies guardrails for automated PR creation
7. **Network Test Failure Detection** (NEW) - Automatically detects network-dependent test failures
8. **Automated Test Patching** (NEW) - Generates and applies minimal patches to fix network tests

### Security & Safety

- **Read-only by default** - No modifications without explicit permission
- **Secret redaction** - All secrets shown as `***last4` in outputs
- **Draft-only PRs** - Never creates merge-ready PRs
- **Human-in-the-loop** - Always asks before writes or PR creation
- **Audit trails** - Every operation includes correlation IDs

## Installation & Setup

### Prerequisites

```bash
# Python 3.8+ required
python3 --version

# Install dependencies
cd orchestrator
pip install -r requirements.txt
pip install pytest requests boto3 PyNaCl PyGithub
```

### Environment Variables

```bash
# Required for GitHub operations
export GITHUB_TOKEN="your_github_personal_access_token"

# Required for registration (if using --allow-run-registration)
export STAGING_DISCORD_BOT_TOKEN="your_staging_bot_token"
export STAGING_DISCORD_APPLICATION_ID="your_staging_app_id"
export STAGING_DISCORD_GUILD_ID="your_staging_guild_id"

# Optional: Non-interactive mode
export AUTO_CONFIRM_REGISTRATION=1
export AUTO_CONFIRM_PR_CREATION=1
```

## Usage

### Basic Usage (Read-Only Validation)

Run a complete operational readiness validation without any writes:

```bash
cd orchestrator/scripts
python operational_readiness_agent.py run --repo gcolon75/Project-Valine
```

This will:
- Scan the repository for entry points and slash commands
- Check for hardcoded secrets
- Analyze GitHub Actions workflows
- Run tests and detect network failures
- Generate a comprehensive report
- Ask permission before any writes

### With Registration Authorization

Allow the agent to run Discord command registration (requires secrets):

```bash
python operational_readiness_agent.py run \
  --repo gcolon75/Project-Valine \
  --allow-run-registration
```

The agent will ask for confirmation before running registration commands.

### With Draft PR Creation for Test Fixes

Allow the agent to create draft PRs for network test fixes:

```bash
python operational_readiness_agent.py run \
  --repo gcolon75/Project-Valine \
  --allow-create-draft-prs
```

If network test failures are detected, the agent will:
1. Analyze the failures
2. Generate minimal monkeypatch fixtures
3. Ask for explicit confirmation
4. Create a draft PR with the fixes
5. Report the PR URL

### With Test PR for E2E Validation

Specify a test PR number for E2E /triage validation:

```bash
python operational_readiness_agent.py run \
  --repo gcolon75/Project-Valine \
  --test-pr 71
```

### Configuration File Usage

Generate an example configuration file:

```bash
python operational_readiness_agent.py generate-config
```

This creates `operational_readiness_config.json`. Edit it and run:

```bash
python operational_readiness_agent.py run --config operational_readiness_config.json
```

### Non-Interactive (CI) Mode

For CI/automation, set these environment variables to skip prompts:

```bash
export AUTO_CONFIRM_REGISTRATION=1
export AUTO_CONFIRM_PR_CREATION=1

python operational_readiness_agent.py run \
  --repo gcolon75/Project-Valine \
  --allow-run-registration \
  --allow-create-draft-prs
```

## Network Test Failure Detection & Auto-Fix

### How It Works

The agent automatically detects network-related test failures by analyzing pytest output for patterns like:

- `socket.gaierror` - DNS resolution failures
- `requests.exceptions.ConnectionError` - HTTP connection errors
- `ConnectionRefusedError` - Blocked connections
- `Failed to resolve` / `No address associated with hostname` - DNS issues

### Automatic Fix Strategy

When network failures are detected, the agent generates minimal patches using pytest's `monkeypatch` fixture:

```python
# Auto-generated patch for network test failure
import pytest

@pytest.fixture(autouse=True)
def _mock_network_calls(monkeypatch):
    """Mock external network calls to prevent CI failures"""
    
    def _fake_get(url, *args, **kwargs):
        class MockResponse:
            status_code = 200
            text = "ok"
            def json(self):
                return {"ok": True, "status": "success"}
            def raise_for_status(self):
                pass
        return MockResponse()
    
    # Patch requests module
    monkeypatch.setattr("requests.get", _fake_get)
    monkeypatch.setattr("requests.post", _fake_post)
    monkeypatch.setattr("requests.head", _fake_head)
```

This approach:
- ✅ Preserves test coverage
- ✅ Only modifies test files, never production code
- ✅ Uses standard pytest fixtures (no new dependencies)
- ✅ Makes tests CI-friendly
- ✅ Maintains test assertions and logic

### Manual Application

If you decline automated PR creation, you can apply fixes manually:

1. Review the generated report in `./readiness_evidence/`
2. Find the network failure details
3. Apply the patch code shown in the report
4. Run `pytest` to verify the fix

## Output & Reports

### Console Output

The agent provides real-time progress with color-coded messages:
- ⏳ Progress indicators
- ✅ Success messages
- ⚠️  Warnings
- ❌ Errors
- ℹ️  Information

### Report Files

Reports are saved to `./readiness_evidence/` (configurable):

- `operational_readiness_report_TIMESTAMP.json` - Machine-readable JSON
- `operational_readiness_report_TIMESTAMP.md` - Human-readable Markdown

### Report Structure

Each report includes:

1. **Summary** - 3-line overview of validation status
2. **Findings** - Bulleted list of discoveries
3. **Action Plan** - Prioritized tasks with time estimates
4. **Evidence** - Detailed data (all secrets redacted)
   - Entry points and slash commands
   - Secret checks and config mappings
   - Workflow analysis
   - Network test failures (if any)
   - Draft PR policies

### Correlation IDs

Every run includes a correlation ID (format: `OPS-<unix-timestamp>`) for tracking and audit purposes.

## Example Workflows

### 1. Pre-Deployment Validation

```bash
# Run full validation before deploying to staging
python operational_readiness_agent.py run --repo gcolon75/Project-Valine

# Review the report
cat ./readiness_evidence/operational_readiness_report_*.md

# If all clear, proceed with deployment
```

### 2. CI Pipeline Integration

```yaml
# .github/workflows/operational-readiness.yml
name: Operational Readiness Check

on:
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd orchestrator
          pip install -r requirements.txt
          pip install pytest
      
      - name: Run Operational Readiness Agent
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          AUTO_CONFIRM_REGISTRATION: 0
          AUTO_CONFIRM_PR_CREATION: 0
        run: |
          python orchestrator/scripts/operational_readiness_agent.py run \
            --repo ${{ github.repository }}
      
      - name: Upload Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: readiness-report
          path: ./readiness_evidence/
```

### 3. Fixing Flaky Network Tests

```bash
# Detect and fix network test failures
python operational_readiness_agent.py run \
  --repo gcolon75/Project-Valine \
  --allow-create-draft-prs

# Review the draft PR
gh pr list --state open --draft

# Test the fix
gh pr checkout <PR_NUMBER>
cd orchestrator && pytest tests/

# If tests pass, approve and merge
```

## Troubleshooting

### "No tests directory found"

Ensure you're running from the repository root and `orchestrator/tests/` exists.

### "GitHub token required to create PR"

Set the `GITHUB_TOKEN` environment variable or use `gh auth login`.

### "Missing required environment variables"

For registration, you need:
- `STAGING_DISCORD_BOT_TOKEN`
- `STAGING_DISCORD_APPLICATION_ID`
- `STAGING_DISCORD_GUILD_ID`

Check `.env.example` for the complete list.

### Tests timing out

If pytest hangs, check for:
- Tests with infinite loops
- Tests waiting for external services
- Tests with very long timeouts

Use `pytest -k test_name` to run specific tests.

### "Could not find test file"

The agent detected a failure but couldn't locate the test file. This can happen if:
- The test file was moved or renamed
- The test output format changed
- File paths are relative vs absolute

## Advanced Usage

### Custom Evidence Directory

```bash
python operational_readiness_agent.py run \
  --repo gcolon75/Project-Valine \
  --evidence-output-dir /path/to/custom/evidence
```

### Verbose Mode

```bash
python operational_readiness_agent.py run \
  --repo gcolon75/Project-Valine \
  --verbose
```

### Dry Run Mode

```bash
# Simulate operations without making changes
python operational_readiness_agent.py run \
  --repo gcolon75/Project-Valine \
  --dry-run
```

## Security Considerations

### What the Agent Can See

- ✅ File contents in the repository
- ✅ Git history and branches
- ✅ GitHub Actions workflows (public info)
- ✅ Example config files (`.env.example`, etc.)
- ❌ GitHub repository secrets (cannot read secrets from Settings)

### What the Agent Can Do (with permission)

- ✅ Create branches locally
- ✅ Commit changes to test files only
- ✅ Push branches to GitHub
- ✅ Create draft PRs via GitHub API
- ❌ Merge PRs (requires human review)
- ❌ Modify production code (only test files)
- ❌ Access GitHub secrets

### Best Practices

1. **Review generated patches** before allowing PR creation
2. **Test fixes locally** with `pytest` before merging
3. **Check PR diffs** to ensure only test files are modified
4. **Verify correlation IDs** match between logs and PRs
5. **Keep GitHub token secure** - use short-lived tokens for CI

## Support & Feedback

For issues, questions, or feedback:
1. Check this guide first
2. Review the generated reports in `./readiness_evidence/`
3. Open an issue in the GitHub repository
4. Include the correlation ID from your run

## Start Phrase

When the agent starts, it will always print:

```
================================================================================
On it — running combined readiness + fix agent now.
================================================================================
```

This confirms you're running the correct operational readiness validation agent.
