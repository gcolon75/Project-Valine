# Phase 5 Double-Check (Red-Team) Agent Usage Guide

## Overview

The Phase 5 Double-Check Agent is a secondary verification tool that independently validates the results from the Phase 5 Staging Validator. It acts as a "red-team" QA layer to detect inconsistencies, drift, or false positives in the primary validation.

**Mission:** Run independent secondary checks for each Phase 5 validation item to detect inconsistencies or drift.

**Role:** Annoying QA friend who retries everything twice so we don't ship broken sauce.

## Quick Start

### Basic Usage

```bash
cd orchestrator/scripts

# Run double-check against a primary validation report
./run_phase5_doublecheck.sh ../validation_evidence/validation_report_*.json
```

### With Custom Configuration

```bash
./run_phase5_doublecheck.sh \
  ../validation_evidence/validation_report_*.json \
  ./my_doublecheck_config.json
```

## Configuration

### Creating a Configuration File

Copy the example configuration:

```bash
cp doublecheck_config.example.json doublecheck_config.json
```

Edit `doublecheck_config.json`:

```json
{
  "repo": "gcolon75/Project-Valine",
  "base_ref": "main",
  "staging_urls": [
    "https://api.staging.valine.example.com"
  ],
  "aws_region": "us-west-2",
  "log_group": "/aws/lambda/pv-api-prod-api",
  "github_token": "ENV:STAGING_GITHUB_TOKEN",
  "aws_access_key": "ENV:AWS_ACCESS_KEY_ID",
  "output_dir": "./doublecheck_evidence",
  "read_only": true,
  "redact_secrets": true
}
```

### Configuration Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `repo` | string | No | GitHub repository (default: gcolon75/Project-Valine) |
| `base_ref` | string | No | Base branch reference (default: main) |
| `staging_urls` | array | No | List of staging endpoint URLs for health checks |
| `aws_region` | string | No | AWS region (default: us-west-2) |
| `log_group` | string | No | CloudWatch log group for logs verification |
| `github_token` | string | No | GitHub token (use ENV:VAR_NAME for environment variable) |
| `aws_access_key` | string | No | AWS access key (use ENV:VAR_NAME for environment variable) |
| `output_dir` | string | No | Output directory for evidence (default: ./doublecheck_evidence) |
| `read_only` | boolean | No | Read-only mode for production (default: true) |
| `redact_secrets` | boolean | No | Redact secrets in output (default: true) |

## Double-Check Mapping

The agent runs different secondary verification methods for each check type:

### Health Checks

- **Primary Method:** GET /api/health
- **Secondary Method:** HEAD / + UI asset fetch (favicon.ico, index.html)
- **Comparison:** Status codes and latency bucket
- **Discrepancy Example:** "HEAD returned 200 but GET returned 503 — possibly reverse-proxy rewrite difference"

### Version Checks

- **Primary Method:** GET /version endpoint
- **Secondary Method:** Parse UI footer or meta tag for build ID
- **Comparison:** Version strings
- **Discrepancy Example:** "API version 1.0.0 but UI meta tag shows 1.0.1 — possible deployment lag"

### Artifacts Checks

- **Primary Method:** GitHub Actions artifacts via REST API
- **Secondary Method:** GitHub Checks API or download checksum file
- **Comparison:** Artifact counts and checksums
- **Discrepancy Example:** "REST API shows 5 artifacts but Checks API shows 4 — possible cache issue"

### Logs Checks

- **Primary Method:** Ingest pipeline metrics query
- **Secondary Method:** Raw CloudWatch snippets filtered by trace_id
- **Comparison:** Event counts and trace presence
- **Discrepancy Example:** "Metrics show 10 events but CloudWatch only has 8 — ingestion delay"

### Alerts Checks

- **Primary Method:** Send test alert and verify posted
- **Secondary Method:** Reload alert state via alert manager API or Discord channel history
- **Comparison:** Alert presence and dedupe behavior
- **Discrepancy Example:** "Primary shows 1 alert but Discord channel has 2 — dedupe not working"

## Workflow

The agent follows this workflow:

1. **Load Primary Report**
   - Parse primary validation report JSON
   - Enumerate all checks performed
   - Extract check IDs, types, and results

2. **Run Secondary Checks**
   - For each primary check, run mapped secondary verification
   - Use different methods than primary (HEAD vs GET, API vs UI, etc.)
   - Record secondary results independently

3. **Create Double-Check Matrix**
   - Compare primary and secondary results
   - Identify consistent checks (pass/pass or fail/fail)
   - Identify inconsistent checks (pass/fail or fail/pass)
   - Generate discrepancy notes for inconsistencies

4. **Attempt Safe Remediation**
   - For inconsistent checks, attempt safe remediation:
     - Health: Retry after brief delay (network blip)
     - Logs: Wait for ingestion delay (10 seconds)
     - Artifacts: Wait for cache invalidation
   - Only attempt safe, idempotent operations
   - Never write to production or make destructive changes

5. **Generate Reports**
   - JSON matrix: `phase5_double_check_matrix_<run_id>.json`
   - Markdown report: `phase5_double_check_report_<run_id>.md`
   - Both redacted for secrets

## Output Format

### JSON Matrix Example

```json
{
  "run_id": "DOUBLECHECK-20251017-123456-abcd1234",
  "timestamp": "2025-10-17T12:34:56Z",
  "statistics": {
    "total_checks": 5,
    "consistent_checks": 4,
    "inconsistent_checks": 1,
    "remediation_attempted": 1,
    "remediation_successful": 0
  },
  "checks": [
    {
      "check_id": "health_api",
      "check_type": "health",
      "pass_primary": true,
      "pass_secondary": false,
      "consistent": false,
      "discrepancy_note": "HEAD returned 200 but GET returned 503",
      "primary_details": {
        "status_code": 200
      },
      "secondary_details": {
        "head_status": 200,
        "ui_status": 503
      },
      "remediation_attempted": true,
      "remediation_result": "failed - health check still failing"
    }
  ]
}
```

### Markdown Report Example

```markdown
# Phase 5 Double-Check Report

**Run ID:** DOUBLECHECK-20251017-123456-abcd1234
**Timestamp:** 2025-10-17T12:34:56Z

## Executive Summary

- **Total Checks:** 5
- **Consistent:** 4
- **Inconsistent:** 1
- **Remediation Attempted:** 1
- **Remediation Successful:** 0

## Consistency Rate

**80.0%** of checks are consistent between primary and secondary validation.

## Double-Check Matrix

| Check ID | Type | Primary | Secondary | Consistent | Discrepancy Note |
|----------|------|---------|-----------|------------|------------------|
| health_api | health | ✅ Pass | ❌ Fail | ⚠️ | HEAD returned 200 but GET returned 503 |
| version_api | version | ✅ Pass | ✅ Pass | ✅ | N/A |
```

## Prerequisites

### Software Requirements

- Python 3.8+
- AWS CLI v2 (for CloudWatch logs checks)
- GitHub CLI `gh` (for artifacts checks)
- Git

### Python Dependencies

The agent requires these Python packages (already in `requirements.txt`):

```
boto3>=1.34.34
requests>=2.31.0
```

### AWS Permissions

For CloudWatch logs verification:

- `logs:FilterLogEvents`
- `logs:GetLogEvents`
- `logs:DescribeLogGroups`

### GitHub Permissions

For artifacts verification:

- Repository: `contents:read`, `actions:read`
- Token: `STAGING_GITHUB_TOKEN` environment variable

## Environment Variables

Set these environment variables before running:

```bash
# GitHub token for artifacts checks
export STAGING_GITHUB_TOKEN="ghp_..."

# AWS credentials (if not using default profile)
export AWS_ACCESS_KEY_ID="AKIA..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_REGION="us-west-2"
```

## Safety Guardrails

### Read-Only for Production

- The agent operates in read-only mode by default
- Only reads/verifies staging environments
- Never writes to production
- Never makes destructive changes

### Secret Redaction

- All secrets are redacted in outputs
- Shows only last 4 characters (***abcd)
- Applied to: tokens, webhooks, API keys, passwords
- Cannot be disabled for production runs

### No Intrusive Tests

- No database writes
- No user creation
- No load testing
- No destructive operations
- Only safe, idempotent verification

### Escalation on Production Mismatch

If the agent discovers anything that could cause harm:

1. Stop immediately
2. Log the issue with full context
3. Do not attempt remediation
4. Escalate to human operator

## Success Criteria

The double-check is successful when:

- ✅ All critical checks are consistent (primary == secondary)
- ✅ OR discrepancy has a plausible root cause and remediation steps
- ✅ No secret leakage in outputs
- ✅ All safety guardrails respected

## Troubleshooting

### Common Issues

**Issue:** Primary report not found

```
Error: Primary report not found: /path/to/report.json
```

**Solution:** Ensure the path to the primary validation report is correct. The report should be generated by the Phase 5 Staging Validator first.

---

**Issue:** AWS CLI not configured

```
Error: Unable to locate credentials
```

**Solution:** Configure AWS credentials using `aws configure` or set environment variables.

---

**Issue:** GitHub token not set

```
Warning: STAGING_GITHUB_TOKEN not set
```

**Solution:** Set the `STAGING_GITHUB_TOKEN` environment variable with a valid GitHub token.

---

**Issue:** Secondary check fails due to network timeout

```
Error: Connection timeout for https://staging.example.com
```

**Solution:** Check network connectivity to staging environment. The agent will attempt remediation automatically for transient failures.

---

**Issue:** All secondary checks return error

```
Status: ❌ NEEDS REVIEW - Significant inconsistencies detected
```

**Solution:** Review the detailed report for specific errors. Common causes:
- Staging environment not accessible
- AWS/GitHub credentials invalid or expired
- Configuration file has incorrect URLs or parameters

## Examples

### Example 1: Basic Double-Check

```bash
cd orchestrator/scripts

# Run double-check with default configuration
./run_phase5_doublecheck.sh ../validation_evidence/validation_report_20251017.json
```

### Example 2: Custom Configuration

```bash
# Create custom config
cat > my_config.json << 'EOF'
{
  "staging_urls": ["https://my-staging.example.com"],
  "aws_region": "us-east-1",
  "log_group": "/aws/lambda/my-api",
  "output_dir": "./my_evidence"
}
EOF

# Run with custom config
./run_phase5_doublecheck.sh \
  ../validation_evidence/validation_report_20251017.json \
  ./my_config.json
```

### Example 3: Python API Usage

```python
from phase5_doublecheck_agent import (
    DoubleCheckConfig,
    Phase5DoubleCheckAgent
)

# Create configuration
config = DoubleCheckConfig(
    primary_report_path='./report.json',
    repo='gcolon75/Project-Valine',
    staging_urls=['https://staging.example.com'],
    output_dir='./evidence'
)

# Run agent
agent = Phase5DoubleCheckAgent(config)
success = agent.run()

if success:
    print(f"Consistent checks: {agent.stats['consistent_checks']}")
    print(f"Inconsistent checks: {agent.stats['inconsistent_checks']}")
```

## Integration with CI/CD

The double-check agent can be integrated into CI/CD workflows:

```yaml
- name: Run Phase 5 Double-Check
  run: |
    cd orchestrator/scripts
    ./run_phase5_doublecheck.sh \
      ../validation_evidence/validation_report_*.json \
      ./doublecheck_config.json
  env:
    STAGING_GITHUB_TOKEN: ${{ secrets.STAGING_GITHUB_TOKEN }}
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Appendix: Check Type Details

### Health Check Secondary Verification

The health check secondary verification uses multiple methods:

1. **HEAD request to root (`/`)**
   - Minimal overhead
   - Tests reverse proxy/load balancer
   - May return different result than application endpoint

2. **GET request for UI asset**
   - Fetches `favicon.ico` or `index.html`
   - Tests static file serving
   - Validates full request path

3. **Comparison with primary**
   - Primary typically uses `GET /api/health`
   - Discrepancies may indicate:
     - Reverse proxy configuration issues
     - Static vs dynamic endpoint differences
     - Load balancer health check vs application health

### Version Check Secondary Verification

The version check secondary verification parses UI metadata:

1. **Meta tags in HTML**
   - `<meta name="version" content="1.0.0">`
   - `<meta name="build-id" content="abc123">`
   - May be injected during build

2. **Footer text**
   - Common pattern: `Version: 1.0.0` in page footer
   - May be dynamically generated

3. **HTML comments**
   - `<!-- Version: 1.0.0 -->`
   - Often included by build tools

4. **Comparison with primary**
   - Primary typically uses `GET /version` API endpoint
   - Discrepancies may indicate:
     - Deployment lag (UI updated but API not yet)
     - Cache issues (old UI cached)
     - Build metadata not synchronized

## References

- **Primary Validator:** `orchestrator/scripts/phase5_staging_validator.py`
- **Test Suite:** `orchestrator/tests/test_phase5_doublecheck_agent.py`
- **Configuration Example:** `orchestrator/scripts/doublecheck_config.example.json`
- **Shell Runner:** `orchestrator/scripts/run_phase5_doublecheck.sh`
