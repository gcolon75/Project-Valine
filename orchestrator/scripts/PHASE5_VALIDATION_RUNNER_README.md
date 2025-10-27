# Phase 5 Staging Validation Runner

A comprehensive agent for executing Steps 3-8 of Phase 5 staging validation with deterministic, redacted evidence reporting.

## Overview

The Phase 5 Staging Validation Runner automates the validation of observability features and staging deployments. It executes validation steps in sequence, collects evidence, and produces detailed reports with automatic secret redaction.

## Features

- **Automated Steps 3-8 Execution**: Complete workflow automation
- **Secret Redaction**: Automatic redaction of tokens, keys, and passwords
- **Rate Limiting**: Built-in rate limiting with exponential backoff
- **Evidence Collection**: Structured evidence artifacts with correlation IDs
- **Staging-Only Enforcement**: Production environment detection and blocking
- **Flexible Configuration**: JSON-based or inline configuration
- **Comprehensive Reporting**: Markdown reports with acceptance criteria

## Quick Start

### 1. Generate Configuration

```bash
cd orchestrator/scripts
python3 phase5_validation_runner.py generate-config --output my_config.json
```

### 2. Edit Configuration

Edit `my_config.json` with your actual values:

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
    "role_arn": null,
    "access_key_id": "ENV:AWS_ACCESS_KEY_ID",
    "secret_access_key": "ENV:AWS_SECRET_ACCESS_KEY",
    "region": "us-west-2"
  },
  "timeouts": {
    "action_dispatch_ms": 600000,
    "http_ms": 15000
  }
}
```

### 3. Run Validation

```bash
python3 phase5_validation_runner.py --config my_config.json
```

## Configuration Reference

### Required Inputs

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `repo` | string | Repository in "owner/repo" format | `"gcolon75/Project-Valine"` |
| `base_ref` | string | Branch or commit SHA | `"main"` |
| `staging.urls` | array | List of staging URLs | `["https://staging.valine.app"]` |

### Optional Inputs

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `staging.region` | string | `"us-west-2"` | AWS region for staging |
| `github.token` | string | `null` | GitHub token (use ENV:VAR_NAME for env vars) |
| `aws.role_arn` | string | `null` | AWS IAM role ARN |
| `aws.access_key_id` | string | `null` | AWS access key ID |
| `aws.secret_access_key` | string | `null` | AWS secret access key |
| `timeouts.action_dispatch_ms` | number | `600000` | GitHub Actions dispatch timeout (ms) |
| `timeouts.http_ms` | number | `15000` | HTTP request timeout (ms) |
| `evidence_dir` | string | `"./validation_evidence"` | Evidence output directory |
| `report_file` | string | `"phase5_staging_validation_report.md"` | Report filename |

### Environment Variables

Configuration values can reference environment variables using the `ENV:` prefix:

```json
{
  "github": {
    "token": "ENV:GITHUB_TOKEN"
  },
  "aws": {
    "access_key_id": "ENV:AWS_ACCESS_KEY_ID",
    "secret_access_key": "ENV:AWS_SECRET_ACCESS_KEY"
  }
}
```

## Validation Steps

### Preflight Checks

Before running validation steps, the runner performs:

1. **Repository Verification**: Confirms repo and base_ref exist
2. **Staging URL Validation**: Verifies URLs are reachable and not production
3. **Credential Checks**: Verifies required credentials are present
4. **TLS Verification**: Confirms HTTPS endpoints have valid certificates

**Production Detection**: The runner blocks execution if URLs contain "prod", "production", or "live" without "staging".

### Step 3: Build & Artifact Check

- Verifies latest CI run for base_ref completed successfully
- Checks for expected artifacts
- Records workflow URLs and artifact lists

**Requirements**:
- GitHub token with repository access
- `gh` CLI tool (optional but recommended)

### Step 4: Deploy-to-Staging Verification

- Confirms deployment status via version endpoint
- Captures deployed commit SHA
- Compares deployed commit with base_ref

**Expected Endpoints**:
- `/api/version` - Returns JSON with version info
- `/api/health` - Health check endpoint

### Step 5: Health Checks

- Tests all configured staging URLs
- Records status codes, latency, and body fingerprints
- Validates TLS configuration

**Success Criteria**:
- Status codes in 200-399 range
- Response latency under configured timeout
- Valid HTTPS certificates

### Step 6: Smoke Tests

- Executes read-only endpoint tests
- Tests common paths: `/`, `/api/health`, `/api/version`
- Records pass/fail status and latency

**Safety**: All smoke tests are read-only operations.

### Step 7: E2E/Synthetic Tests (Optional)

- Checks for presence of E2E test frameworks
- Documents available test suites
- Optionally dispatches test workflows

**Supported Frameworks**:
- Playwright
- Cypress
- Custom GitHub Actions workflows

### Step 8: Observability & Alerts

- Queries CloudWatch logs for recent activity
- Checks for error patterns
- Verifies alerting system health
- Collects redacted log samples

**Requirements**:
- AWS credentials with CloudWatch access
- `boto3` library installed

## Evidence Collection

All validation steps produce structured evidence:

### Evidence Files

```
validation_evidence/
└── phase5_run_20251017_123456_abc123/
    ├── step_0_preflight_checks.json
    ├── step_3_build_&_artifact_check.json
    ├── step_4_deployment_verification.json
    ├── step_5_health_checks.json
    ├── step_6_smoke_tests.json
    ├── step_7_e2e/synthetic_tests.json
    ├── step_8_observability_&_alerts.json
    └── phase5_staging_validation_report.md
```

### Evidence Structure

Each evidence file contains:

```json
{
  "step_number": 3,
  "step_name": "Build & Artifact Check",
  "status": "PASS",
  "duration_ms": 1234.5,
  "timestamp": "2025-10-17T20:30:00.000Z",
  "details": {
    "workflow_name": "CI",
    "workflow_url": "https://github.com/...",
    "artifacts": ["build-output"]
  },
  "artifacts": [],
  "error": null
}
```

## Guardrails

### Secret Redaction

All secrets are automatically redacted in:
- Evidence files
- Reports
- Console output
- Error messages

**Redaction Pattern**: `(?i)(token|secret|key|password|bearer)[=: ]\S+`

**Example**:
```
Before: token=ghp_1234567890abcdef
After:  token=***cdef
```

### Staging-Only Enforcement

The runner blocks execution if:
- URLs contain "prod", "production", or "live" without "staging"
- `require_staging_only` is `true` (default)

**Override**: Set `require_staging_only: false` in config (not recommended).

### Rate Limiting

Automatic rate limiting prevents:
- GitHub API rate limit exhaustion
- Discord webhook rate limits
- AWS API throttling

**Default Limits**:
- Minimum 1 second between same-key calls
- Exponential backoff on retries
- Jitter to prevent thundering herd

## Usage Examples

### Example 1: Basic Validation

```bash
# Generate config
python3 phase5_validation_runner.py generate-config

# Edit validation_config.example.json with your values

# Run validation
python3 phase5_validation_runner.py --config validation_config.example.json
```

### Example 2: Inline JSON Configuration

```bash
python3 phase5_validation_runner.py --config-json '{
  "repo": "gcolon75/Project-Valine",
  "base_ref": "main",
  "staging": {
    "urls": ["https://staging.valine.app"]
  }
}'
```

### Example 3: CI/CD Integration

```yaml
# .github/workflows/phase5-validation.yml
name: Phase 5 Staging Validation

on:
  workflow_dispatch:
  schedule:
    - cron: '0 9 * * 1'  # Weekly on Monday

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
        run: pip install boto3 requests
      
      - name: Run validation
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          python3 orchestrator/scripts/phase5_validation_runner.py \
            --config orchestrator/scripts/staging_validation_config.json
      
      - name: Upload evidence
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: validation-evidence
          path: validation_evidence/
          retention-days: 30
```

## Report Format

The generated Markdown report includes:

1. **Context**: Run ID, repository, ref, timestamps
2. **Summary Table**: All steps with status and duration
3. **Detailed Results**: Per-step details, errors, and artifacts
4. **Acceptance Criteria**: Checklist of met criteria
5. **Remediation**: Required actions for failed steps
6. **Artifacts**: List of evidence files

### Example Report Excerpt

```markdown
# Phase 5 Staging Validation Report

**Run ID:** phase5_run_20251017_123456_abc123
**Repository:** gcolon75/Project-Valine
**Base Ref:** main

## Validation Summary

| Step | Name | Status | Duration |
|------|------|--------|----------|
| 0 | Preflight Checks | ✅ PASS | 1234ms |
| 3 | Build & Artifact Check | ✅ PASS | 2345ms |
| 5 | Health Checks | ✅ PASS | 456ms |

## Acceptance Criteria

- [x] Preflight checks passed
- [x] Build verification complete
- [x] Health checks passed
- [x] Secrets redacted
```

## Troubleshooting

### Issue: "Repository check failed"

**Cause**: Git cannot access the repository.

**Solution**:
1. Verify repository name is correct
2. Ensure GitHub token has repository access
3. Check network connectivity

### Issue: "GitHub token missing"

**Cause**: GitHub token not configured or environment variable not set.

**Solution**:
```bash
export GITHUB_TOKEN="ghp_your_token_here"
# Or set in config:
# "github": {"token": "ghp_your_token_here"}
```

### Issue: "Staging URLs not reachable"

**Cause**: URLs don't exist or network issues.

**Solution**:
1. Verify URLs in browser
2. Check VPN/network requirements
3. Verify staging environment is running

### Issue: "Production URL detected"

**Cause**: URL contains production keywords without "staging".

**Solution**:
1. Verify URL is actually staging
2. Update URL to include "staging" keyword
3. Or set `require_staging_only: false` (not recommended)

### Issue: "AWS credentials missing"

**Cause**: AWS credentials not configured.

**Solution**:
```bash
export AWS_ACCESS_KEY_ID="your_key_id"
export AWS_SECRET_ACCESS_KEY="your_secret_key"
# Or use AWS CLI configure:
aws configure
```

## Security Considerations

### Secret Handling

- **Never commit secrets to configuration files**
- Use `ENV:VAR_NAME` pattern for sensitive values
- Review generated reports for leaked secrets
- Evidence files are automatically redacted

### Production Safety

- Always use staging-only URLs
- Keep `require_staging_only: true`
- Review URLs before execution
- Use separate AWS accounts for staging

### Network Security

- Validate TLS certificates (enabled by default)
- Use VPN for internal staging environments
- Rotate credentials regularly
- Audit access logs

## Dependencies

### Required

- Python 3.8+
- Git command-line tool

### Optional

- `requests` library (for HTTP checks)
- `boto3` library (for AWS features)
- `gh` CLI tool (for enhanced GitHub integration)

### Installation

```bash
pip install requests boto3
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Validation passed or completed with warnings |
| 1 | Configuration error or critical failure |
| 2 | Preflight checks failed |

## API Reference

### ValidationRunnerConfig

Configuration dataclass for the validation runner.

**Fields**:
- `repo: str` - Repository in "owner/repo" format
- `base_ref: str` - Branch or commit SHA
- `staging: StagingConfig` - Staging environment config
- `github: GitHubConfig` - GitHub configuration
- `aws: AWSConfig` - AWS configuration
- `timeouts: TimeoutsConfig` - Timeout configuration

### Phase5ValidationRunner

Main validation runner class.

**Methods**:
- `preflight_checks() -> bool` - Run preflight validation
- `step3_build_artifacts() -> bool` - Verify build and artifacts
- `step4_deployment_verification() -> bool` - Verify deployment
- `step5_health_checks() -> bool` - Run health checks
- `step6_smoke_tests() -> bool` - Run smoke tests
- `step7_e2e_synthetic() -> bool` - Check E2E tests
- `step8_observability_alerts() -> bool` - Check observability
- `generate_report() -> str` - Generate validation report
- `run_full_validation() -> bool` - Execute complete workflow

## Contributing

### Running Tests

```bash
cd orchestrator
python3 -m unittest tests/test_phase5_validation_runner.py -v
```

### Test Coverage

The test suite covers:
- Configuration loading and validation
- Secret redaction
- Rate limiting
- All validation steps
- Report generation
- Error handling

## Support

### Documentation

- **This README**: Complete usage guide
- **Problem Statement**: See repository documentation
- **Test Suite**: `orchestrator/tests/test_phase5_validation_runner.py`

### Issues

Report issues at: https://github.com/gcolon75/Project-Valine/issues

### Runbook

For operational procedures, see: `orchestrator/docs/guides/operations/RUNBOOK.md`

## License

See repository LICENSE file.

---

**Version**: 1.0.0  
**Last Updated**: 2025-10-17  
**Maintainer**: Project Valine Team
