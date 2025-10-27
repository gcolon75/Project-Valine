# QA Checker Agent Guide

## Overview

The QA Checker agent validates Phase 3 and Phase 4 pull requests against comprehensive acceptance criteria. It automates the quality assurance process by checking code changes, validating implementations, and generating detailed review reports.

## Features

### Phase 3 Validation - Deploy Client Polish

The QA checker validates the following for PR1:

1. **Workflow inputs and run-name**
   - Client Deploy workflow has `workflow_dispatch` inputs: `correlation_id`, `requester`, `api_base`
   - `run-name` includes `correlation_id` and `requester` with sensible fallbacks
   - No behavioral changes to deploy logic beyond naming/inputs
   - YAML validated, CI passes

2. **Dispatcher and discovery**
   - Dispatch payload includes inputs with `correlation_id`, `requester`, `api_base`
   - `find_run_by_correlation` searches workflow_dispatch runs for `correlation_id` in run-name
   - Falls back to newest run if correlation search fails
   - `poll_run_conclusion` returns `(status, conclusion)` or times out cleanly within ~180s

3. **Discord handler behavior**
   - `/deploy-client wait=true` uses deferred response and follow-ups
   - Posts "Starting…" with short correlation_id (first 8 chars) and run link
   - Posts final outcome (🟢 success / 🔴 failure) or timeout message with run link
   - `/deploy-client wait=false` behavior unchanged

4. **Guardrails and safety**
   - URL validator unchanged (HTTPS-only, no localhost/private IPs, optional allowlist)
   - No secrets logged; inputs sanitized
   - Rate limits respected; retries capped; per-call timeout ≤10s

5. **Tests and docs**
   - Unit tests cover dispatch payload, run-name correlation, polling success/timeout, handler branches
   - README updated describing `wait:true` final outcome and correlation behavior
   - CI green

### Phase 4 Validation - Multi-Agent Foundation

The QA checker validates the following for PR2:

1. **Registry and router**
   - `orchestrator/app/agents/registry.py` exists with initial agents:
     - `deploy_verifier`
     - `diagnose_runner`
     - `status_reporter`
     - `deploy_client`
   - Data includes id/name/description/entry command
   - Router (if present) is structured for extension

2. **Commands**
   - `/agents` lists available agents with descriptions and entry commands
   - `/status-digest [period=daily|weekly]` summarizes Client Deploy and Diagnose:
     - Counts of success/failure in the period
     - Latest run links per workflow
     - Average durations if available; otherwise "n/a"
   - Replies are threaded if supported; fallback is clean

3. **Guardrails and UX**
   - No new secrets required; reuses GitHub token for read/dispatch
   - Rate limits respected; per-call timeout ≤10s
   - Output is concise, link-rich, and free of sensitive data

4. **Tests and docs**
   - Unit tests for registry presence, `/agents` output shaping
   - Unit tests for `/status-digest` aggregation logic with mocked runs
   - README updated with "Multi-Agent Orchestration" and new command usage
   - CI green

## Installation

The QA checker is part of the orchestrator package and requires the following dependencies:

```bash
cd orchestrator
pip install -r requirements.txt
```

Additional dependency for the QA checker:
```bash
pip install requests
```

## Usage

### Command Line Interface

The QA checker can be run from the command line using the `run_qa_checker.py` script:

```bash
# Basic usage (validates and prints results)
python run_qa_checker.py <pr1_number> <pr2_number>

# Example
python run_qa_checker.py 27 28
```

### With Custom Repository

```bash
python run_qa_checker.py 27 28 --repo gcolon75/Project-Valine
```

### Post Reviews to GitHub

To automatically post the review comments to GitHub PRs:

```bash
export GITHUB_TOKEN=ghp_your_token_here
python run_qa_checker.py 27 28 --post-reviews
```

### Verbose Output

For detailed logging:

```bash
python run_qa_checker.py 27 28 --verbose
```

### Environment Variables

- **`GITHUB_TOKEN`** (required): GitHub personal access token with `repo` scope
- **`GITHUB_REPO`** (optional): Default repository in format `owner/repo` (default: `gcolon75/Project-Valine`)

### Getting a GitHub Token

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token (classic)
3. Select scopes: `repo`, `write:discussion`
4. Copy the token and export it:
   ```bash
   export GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
   ```

## Output Format

The QA checker produces a comprehensive review for each PR with the following sections:

### Review Structure

```markdown
# QA: [PR Title]

**Status:** PASS or FAIL

## Acceptance Checklist

- [✅/❌] Check name — details
- [✅/❌] Another check — details
...

## Evidence

### Evidence Item
```json
{
  "key": "value"
}
```

## Required Fixes (if FAIL)

- Fix description (`file.py`)
- Another fix description (`another_file.py` at line 42)

## Final Verdict

✅ **APPROVE** — All acceptance criteria met.
or
❌ **REQUEST CHANGES** — Please address the fixes above.
```

## Programmatic Usage

You can also use the QA checker as a Python module:

```python
from app.agents.qa_checker import QAChecker

# Initialize
checker = QAChecker("owner/repo", "github_token")

# Validate PR1 (Phase 3)
result1 = checker.validate_pr1_deploy_client_polish(27)

# Validate PR2 (Phase 4)
result2 = checker.validate_pr2_multi_agent_foundation(28)

# Format review comments
review1 = checker.format_review_comment(result1, "Phase 3 Polish — /deploy-client wait flow")
review2 = checker.format_review_comment(result2, "Phase 4 — Multi-Agent Foundation")

# Post reviews
checker.post_review(27, review1, approve=(result1.status == "PASS"))
checker.post_review(28, review2, approve=(result2.status == "PASS"))
```

## Testing

The QA checker includes comprehensive unit tests:

```bash
cd orchestrator
python -m unittest tests.test_qa_checker -v
```

Test coverage includes:
- PR validation result tracking
- Check addition and status updates
- Evidence gathering
- Fix recommendations
- PR fetching and file analysis
- Workflow input validation
- Dispatcher implementation checks
- Discord handler validation
- Agent registry checks
- Command implementation checks
- Review comment formatting
- GitHub API integration

## Architecture

### Core Components

1. **`QAChecker`**: Main class that orchestrates PR validation
   - Fetches PR details and files from GitHub API
   - Runs acceptance checks against PR changes
   - Generates evidence-backed reports
   - Posts reviews to GitHub

2. **`PRValidationResult`**: Tracks validation results
   - Maintains list of checks (passed/failed)
   - Collects evidence (files, patches, data)
   - Accumulates required fixes
   - Determines overall PASS/FAIL status

3. **Validation Methods**:
   - `validate_pr1_deploy_client_polish()`: Phase 3 validation
   - `validate_pr2_multi_agent_foundation()`: Phase 4 validation
   - Multiple check methods for specific acceptance criteria

### Check Methods

- `_check_workflow_inputs()`: Validates workflow YAML changes
- `_check_dispatcher_implementation()`: Validates dispatcher code
- `_check_discord_handler_wait_flow()`: Validates Discord handler
- `_check_guardrails()`: Validates safety and security measures
- `_check_tests_and_docs()`: Validates test coverage and documentation
- `_check_agent_registry()`: Validates agent registry structure
- `_check_agents_command()`: Validates `/agents` command
- `_check_status_digest_command()`: Validates `/status-digest` command
- `_check_multi_agent_guardrails()`: Validates multi-agent safety
- `_check_multi_agent_tests_and_docs()`: Validates multi-agent tests/docs

## Best Practices

1. **Run Before Merging**: Always run the QA checker before merging Phase 3/4 PRs
2. **Review Evidence**: Check the evidence section to understand validation basis
3. **Address All Fixes**: If status is FAIL, address all required fixes before requesting re-review
4. **Test Locally**: Run unit tests locally before committing QA checker changes
5. **Keep Updated**: Update acceptance criteria as requirements evolve

## Troubleshooting

### "GITHUB_TOKEN environment variable not set"

Set your GitHub token:
```bash
export GITHUB_TOKEN=ghp_your_token_here
```

### "Could not fetch PR"

- Check that the PR number is correct
- Verify your GitHub token has `repo` scope
- Ensure the repository name is correct

### "Rate limit exceeded"

The checker respects GitHub API rate limits. If you hit the limit:
- Wait for the rate limit to reset (usually 1 hour)
- Use a GitHub App token instead of personal access token (higher limits)

### Reviews not posting

If `--post-reviews` doesn't work:
- Verify your token has `write:discussion` scope
- Check that you have write access to the repository
- Review the error message in the output

## Examples

### Example 1: Basic Validation

```bash
export GITHUB_TOKEN=ghp_xxxxx
python run_qa_checker.py 27 28
```

Output:
```
================================================================================
QA Checker for Phase 3 Polish and Phase 4 Multi-Agent Foundation
================================================================================

📦 Repository: gcolon75/Project-Valine
🔍 PR #1 (Phase 3): 27
🔍 PR #2 (Phase 4): 28

────────────────────────────────────────────────────────────────────────────────
🔍 Validating PR #27 - Deploy Client Polish...
────────────────────────────────────────────────────────────────────────────────

# QA: Phase 3 Polish — /deploy-client wait flow

**Status:** PASS

## Acceptance Checklist

- [✅] PR Exists — PR #27 found
- [✅] Workflow YAML Modified — Found .github/workflows/client-deploy.yml
- [✅] Correlation ID Input — correlation_id input found
...
```

### Example 2: Post Reviews Automatically

```bash
export GITHUB_TOKEN=ghp_xxxxx
python run_qa_checker.py 27 28 --post-reviews
```

This will validate both PRs and automatically post approve/request changes reviews.

### Example 3: Dry Run with Custom Repo

```bash
export GITHUB_TOKEN=ghp_xxxxx
python run_qa_checker.py 10 11 --repo myorg/myrepo
```

## Contributing

To add new acceptance checks:

1. Add check method to `QAChecker` class
2. Call the check method from `validate_pr1_*` or `validate_pr2_*`
3. Add unit tests to `tests/test_qa_checker.py`
4. Update this documentation

## License

This QA checker is part of the Project Valine orchestrator and follows the same license as the main project.
