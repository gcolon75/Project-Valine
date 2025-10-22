# Operational Readiness Agent - Quick Reference

## Start Phrase
```
On it — running combined readiness + fix agent now.
```

## Quick Start

### Basic Run (Read-Only)
```bash
python orchestrator/scripts/operational_readiness_agent.py run --repo gcolon75/Project-Valine
```

### With Auto-Fix for Network Tests
```bash
export GITHUB_TOKEN="your_token"
python orchestrator/scripts/operational_readiness_agent.py run \
  --repo gcolon75/Project-Valine \
  --allow-create-draft-prs
```

## What It Does

1. ✅ **Repo Recon** - Finds entry points and slash commands
2. ✅ **Secrets Check** - Detects hardcoded secrets (shows ***last4)
3. ✅ **Workflow Scan** - Analyzes GitHub Actions and secrets
4. ✅ **Registration Commands** - Provides exact setup commands
5. ✅ **E2E Test Guide** - Step-by-step /triage testing
6. ✅ **Draft PR Verification** - Checks guardrails
7. ✅ **Network Test Detection** - Finds DNS/connection failures
8. ✅ **Auto-Fix Generation** - Creates monkeypatch patches

## Network Test Auto-Fix

### Detected Failures
- `socket.gaierror` - DNS resolution failed
- `ConnectionError` - Connection refused/blocked
- `Failed to resolve` - DNS lookup failed
- `Max retries exceeded` - Network timeout

### Fix Strategy
Adds pytest monkeypatch fixture to mock `requests.get/post/head`:

```python
@pytest.fixture(autouse=True)
def _mock_network_calls(monkeypatch):
    def _fake_get(url, *args, **kwargs):
        class MockResponse:
            status_code = 200
            text = "ok"
            def json(self): return {"ok": True}
        return MockResponse()
    monkeypatch.setattr("requests.get", _fake_get)
```

### Safety Guarantees
- ✅ Only modifies test files
- ✅ Never touches production code
- ✅ Creates draft PRs only
- ✅ Requires explicit confirmation
- ✅ Includes correlation IDs

## Report Output

Location: `./readiness_evidence/operational_readiness_report_TIMESTAMP.json|.md`

Contains:
- Summary (3-line status)
- Findings (bulleted discoveries)
- Action Plan (5 prioritized tasks)
- Evidence (entry points, secrets, workflows, network failures)

## Permissions & Safety

### Read-Only by Default
- ✅ Scans files and workflows
- ✅ Runs tests
- ✅ Generates reports
- ❌ No writes without permission

### With --allow-run-registration
- ✅ Can run Discord command registration
- ⚠️  Requires confirmation
- ⚠️  Needs STAGING_* environment variables

### With --allow-create-draft-prs
- ✅ Can create branches
- ✅ Can commit test file changes
- ✅ Can create draft PRs
- ⚠️  Requires explicit "Yes — create draft PR" confirmation
- ❌ Cannot merge PRs

## Environment Variables

### Required for PR Creation
```bash
export GITHUB_TOKEN="ghp_..."
```

### Required for Registration
```bash
export STAGING_DISCORD_BOT_TOKEN="..."
export STAGING_DISCORD_APPLICATION_ID="..."
export STAGING_DISCORD_GUILD_ID="..."
```

### Optional (Non-Interactive Mode)
```bash
export AUTO_CONFIRM_REGISTRATION=1
export AUTO_CONFIRM_PR_CREATION=1
```

## Typical Workflow

1. **Run Validation**
   ```bash
   python operational_readiness_agent.py run --repo gcolon75/Project-Valine
   ```

2. **Review Report**
   ```bash
   cat ./readiness_evidence/operational_readiness_report_*.md
   ```

3. **Fix Network Tests (if detected)**
   ```bash
   python operational_readiness_agent.py run \
     --repo gcolon75/Project-Valine \
     --allow-create-draft-prs
   # Type: "Yes — create draft PR"
   ```

4. **Review & Merge PR**
   ```bash
   gh pr list --draft
   gh pr checkout <number>
   cd orchestrator && pytest tests/
   # If passing, merge the PR
   ```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "GitHub token required" | Set `GITHUB_TOKEN` env var |
| "No tests directory found" | Run from repo root |
| "Missing required environment variables" | Set STAGING_* vars for registration |
| Tests timing out | Check for infinite loops or long timeouts |
| "Could not find test file" | Verify test file paths are correct |

## Security Notes

### ✅ The Agent Can
- Read repository files
- Run tests
- Create branches and draft PRs
- Commit changes to test files only

### ❌ The Agent Cannot
- Read GitHub repository secrets
- Merge PRs
- Modify production code
- Access sensitive data beyond repo files

### 🔒 Secrets are Redacted
All secret values shown as `***last4` in:
- Console output
- Report files
- Error messages
- PR descriptions

## For More Details

See full guide: `orchestrator/OPERATIONAL_READINESS_AGENT_GUIDE.md`

## Correlation IDs

Every run includes a correlation ID: `OPS-<unix-timestamp>`
- Appears in console output
- Included in reports
- Added to PR descriptions
- Use for tracking and auditing
