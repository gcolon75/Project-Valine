# Phase 5 Validation Runner - Quick Start Guide

Get up and running with the Phase 5 Staging Validation Runner in 5 minutes.

## Prerequisites

- Python 3.8+
- Git CLI
- (Optional) GitHub CLI (`gh`)
- (Optional) AWS CLI configured with credentials

## Installation

### 1. Install Python Dependencies

```powershell
pip install requests boto3
```

### 2. Set Environment Variables

```powershell
# GitHub token (for CI/artifact checks)
$env:GITHUB_TOKEN = "ghp_your_token_here"

# AWS credentials (for CloudWatch logs)
$env:AWS_ACCESS_KEY_ID = "your_aws_key"
$env:AWS_SECRET_ACCESS_KEY = "your_aws_secret"
$env:AWS_DEFAULT_REGION = "us-west-2"
```

## Quick Start

### Step 1: Generate Configuration

```powershell
cd orchestrator/scripts
python3 phase5_validation_runner.py generate-config
```

This creates `validation_config.example.json`.

### Step 2: Edit Configuration

Edit `validation_config.example.json` with your values:

```json
{
  "repo": "gcolon75/Project-Valine",
  "base_ref": "main",
  "staging": {
    "urls": [
      "https://staging.valine.app",
      "https://staging.valine.app/api/health"
    ],
    "region": "us-west-2"
  },
  "github": {
    "token": "ENV:GITHUB_TOKEN"
  },
  "aws": {
    "access_key_id": "ENV:AWS_ACCESS_KEY_ID",
    "secret_access_key": "ENV:AWS_SECRET_ACCESS_KEY",
    "region": "us-west-2"
  }
}
```

### Step 3: Run Validation

```powershell
python3 phase5_validation_runner.py --config validation_config.example.json
```

### Step 4: Review Results

Results are saved to:
- `validation_evidence/<run_id>/` - Evidence files
- `validation_evidence/<run_id>/phase5_staging_validation_report.md` - Main report

## Example Output

```
================================================================================
Phase 5 Staging Validation Runner
================================================================================

[Preflight] Starting preflight checks...
[Preflight] ✓ Repository and ref exist
[Preflight] ✓ URL reachable: https://staging.valine.app (status: 200)
[Preflight] ✓ GitHub token present
[Preflight] ✓ Preflight checks passed (1234ms)

[Step 3] Checking build and artifacts...
[Step 3] ✓ Latest CI run passed: CI Build
[Step 3]   URL: https://github.com/gcolon75/Project-Valine/actions/runs/123456

[Step 4] Verifying staging deployment...
[Step 4] ✓ Deployment verified
[Step 4]   Commit: abc1234

[Step 5] Running health checks...
[Step 5] ✓ https://staging.valine.app - 200 (123ms)
[Step 5] ✓ https://staging.valine.app/api/health - 200 (45ms)
[Step 5] ✓ Health checks complete: PASS

[Step 6] Running smoke tests...
[Step 6] ✓ Root page - 200 (120ms)
[Step 6] ✓ Health check - 200 (45ms)
[Step 6] ✓ Smoke tests complete: PASS

[Step 7] Checking for E2E/synthetic tests...
[Step 7] ~ No E2E tests found

[Step 8] Checking observability and alerts...
[Step 8] ✓ Connected to CloudWatch Logs
[Step 8]   Found 15 log groups
[Step 8] ✓ Found 3 recent error logs
[Step 8] ✓ Observability check complete: PASS

[Report] Generating validation report...
[Report] ✓ Report saved to: validation_evidence/phase5_run_20251017_123456_abc123/phase5_staging_validation_report.md

================================================================================
Validation complete in 8.5s
Evidence directory: validation_evidence/phase5_run_20251017_123456_abc123
================================================================================
```

## Common Scenarios

### Scenario 1: Basic Validation (No AWS)

If you don't have AWS credentials:

```json
{
  "repo": "gcolon75/Project-Valine",
  "base_ref": "main",
  "staging": {
    "urls": ["https://staging.valine.app"]
  }
}
```

Steps 3-6 will run. Step 8 (observability) will be skipped.

### Scenario 2: Inline JSON Configuration

For quick tests without a config file:

```powershell
python3 phase5_validation_runner.py --config-json '{
  "repo": "gcolon75/Project-Valine",
  "base_ref": "main",
  "staging": {
    "urls": ["https://staging.valine.app"]
  }
}'
```

### Scenario 3: Different Branch

To validate a feature branch:

```json
{
  "repo": "gcolon75/Project-Valine",
  "base_ref": "feature/new-feature",
  "staging": {
    "urls": ["https://staging.valine.app"]
  }
}
```

### Scenario 4: Custom Timeouts

For slower staging environments:

```json
{
  "repo": "gcolon75/Project-Valine",
  "base_ref": "main",
  "staging": {
    "urls": ["https://staging.valine.app"]
  },
  "timeouts": {
    "http_ms": 30000,
    "action_dispatch_ms": 1200000
  }
}
```

## Understanding Results

### Status Codes

- ✅ **PASS** - Step completed successfully
- ⚠️ **WARNING** - Step completed with warnings (non-critical)
- ⏭️ **SKIP** - Step skipped (missing dependencies/config)
- ❌ **FAIL** - Step failed critically

### Evidence Files

Each step creates a JSON evidence file:

```
validation_evidence/phase5_run_20251017_123456_abc123/
├── step_0_preflight_checks.json          # Preflight results
├── step_3_build_&_artifact_check.json    # CI/artifact info
├── step_4_deployment_verification.json   # Deployment status
├── step_5_health_checks.json             # Health check results
├── step_6_smoke_tests.json               # Smoke test results
├── step_7_e2e/synthetic_tests.json       # E2E test info
├── step_8_observability_&_alerts.json    # CloudWatch logs
└── phase5_staging_validation_report.md   # Complete report
```

### Report Structure

The Markdown report includes:

1. **Run Context** - Run ID, repo, ref, timestamps
2. **Summary Table** - All steps with status icons
3. **Detailed Results** - Per-step breakdown
4. **Acceptance Criteria** - Checklist of requirements
5. **Remediation** - Actions for failed steps
6. **Artifacts** - List of evidence files

## Troubleshooting

### "Repository check failed"

**Solution**: Verify GitHub token and repository name:

```powershell
gh auth status
gh repo view gcolon75/Project-Valine
```

### "Staging URLs not reachable"

**Solution**: Test URLs manually:

```powershell
Invoke-WebRequest -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/api/endpoint" -Method Get
```

Ensure staging environment is running and accessible.

### "Production URL detected"

**Solution**: URLs must contain "staging" if they include "prod", "production", or "live":

```json
{
  "staging": {
    "urls": ["https://staging.valine.app"]  // ✓ Good
  }
}
```

Not:
```json
{
  "staging": {
    "urls": ["https://production.valine.app"]  // ✗ Blocked
  }
}
```

### "AWS credentials missing"

**Solution**: Either set environment variables or update config:

```powershell
$env:AWS_ACCESS_KEY_ID = "..."
$env:AWS_SECRET_ACCESS_KEY = "..."
```

Or set in config:
```json
{
  "aws": {
    "access_key_id": "AKIAIOSFODNN7EXAMPLE",
    "secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  }
}
```

**Note**: Using environment variables is more secure.

## Next Steps

### Production Deployment

Once staging validation passes:

1. Review validation report
2. Verify all acceptance criteria met
3. Check remediation section for any issues
4. Sign off on staging validation
5. Plan production deployment

### Automation

Integrate with CI/CD:

```yaml
# .github/workflows/staging-validation.yml
name: Staging Validation

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      
      - name: Install dependencies
        run: pip install requests boto3
      
      - name: Run validation
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          cd orchestrator/scripts
          python3 phase5_validation_runner.py --config validation_config.example.json
      
      - name: Upload evidence
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: validation-evidence
          path: validation_evidence/
```

### Scheduled Validation

Run weekly validation automatically:

```yaml
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM UTC
```

## Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Review generated reports** - Check for leaked secrets
3. **Use staging-only URLs** - Keep `require_staging_only: true`
4. **Rotate credentials** - Regularly update tokens and keys
5. **Audit access** - Review who can run validation

## Getting Help

- **Documentation**: See `PHASE5_VALIDATION_RUNNER_README.md`
- **Tests**: Run `python3 -m unittest orchestrator/tests/test_phase5_validation_runner.py`
- **Issues**: https://github.com/gcolon75/Project-Valine/issues

## Summary

You've now run a complete Phase 5 staging validation! The process:

1. ✅ Generated configuration
2. ✅ Edited with your values
3. ✅ Ran validation (Steps 3-8)
4. ✅ Reviewed results

For complete documentation, see `orchestrator/scripts/PHASE5_VALIDATION_RUNNER_README.md`.

---

**Time to complete**: ~5 minutes  
**Total validation time**: ~10-15 seconds  
**Evidence retention**: Permanent (local files)
