# Phase 5 Double-Check Agent - Quick Start

## TL;DR

Run independent secondary verification of Phase 5 validation results to catch inconsistencies.

```powershell
cd orchestrator/scripts
./run_phase5_doublecheck.sh ../validation_evidence/validation_report_*.json
```

## What It Does

The Phase 5 Double-Check Agent is your QA safety net. It re-verifies each validation check using different methods to detect:

- False positives (primary passed, but system is actually broken)
- False negatives (primary failed, but system is actually fine)
- Timing/race conditions (results differ between runs)
- Configuration drift (staging vs production mismatches)

## Quick Examples

### Example 1: Basic Usage

```powershell
# After running Phase 5 Staging Validator, run double-check
cd orchestrator/scripts
./run_phase5_doublecheck.sh \
  ../validation_evidence/validation_report_20251017.json
```

### Example 2: With Custom Config

```powershell
# Create config
Get-Content > my_config.json << 'EOF'
{
  "staging_urls": ["https://my-staging.example.com"],
  "aws_region": "us-east-1",
  "log_group": "/aws/lambda/my-api"
}
EOF

# Run with config
./run_phase5_doublecheck.sh \
  ../validation_evidence/validation_report_20251017.json \
  ./my_config.json
```

### Example 3: Direct Python

```powershell
python3 phase5_doublecheck_agent.py \
  --primary-report ../validation_evidence/validation_report_20251017.json \
  --config doublecheck_config.json \
  --output-dir ./my_evidence
```

## Double-Check Methods

| Check Type | Primary Method | Secondary Method |
|------------|---------------|------------------|
| **Health** | GET /api/health | HEAD / + UI asset fetch |
| **Version** | GET /version | Parse UI meta tags |
| **Artifacts** | REST API | GitHub Checks API |
| **Logs** | Metrics query | Raw CloudWatch filter |
| **Alerts** | Send test | Query Discord history |

## Output Files

The agent generates two reports in the output directory:

1. **JSON Matrix**: `phase5_double_check_matrix_<run_id>.json`
   - Machine-readable format
   - Full check details
   - Statistics and metadata

2. **Markdown Report**: `phase5_double_check_report_<run_id>.md`
   - Human-readable format
   - Executive summary
   - Inconsistency details
   - Remediation results

## Reading the Results

### Consistent Check ✅

```
| health_api | health | ✅ Pass | ✅ Pass | ✅ | N/A |
```

Both primary and secondary passed. System is working as expected.

### Inconsistent Check ⚠️

```
| health_api | health | ✅ Pass | ❌ Fail | ⚠️ | HEAD returned 503 but GET returned 200 |
```

Primary passed but secondary failed. Investigate the discrepancy note.

### Common Discrepancies

**Network Blip**
- **Symptom**: Primary passed, secondary failed on retry
- **Remediation**: Agent retries after 5 seconds
- **Action**: If persists, check network/DNS

**Ingestion Delay**
- **Symptom**: Logs check shows fewer events in secondary
- **Remediation**: Agent waits 10 seconds for ingestion
- **Action**: If persists, check log pipeline

**Reverse Proxy Issue**
- **Symptom**: HEAD / succeeds but GET /api fails
- **Remediation**: None (configuration issue)
- **Action**: Check reverse proxy/load balancer config

**Cache Staleness**
- **Symptom**: Version mismatch between API and UI
- **Remediation**: None (deployment issue)
- **Action**: Check deployment process, CDN cache

## Configuration

### Minimal Config

```json
{
  "staging_urls": ["https://staging.example.com"]
}
```

### Full Config

```json
{
  "repo": "gcolon75/Project-Valine",
  "base_ref": "main",
  "staging_urls": ["https://staging.example.com"],
  "aws_region": "us-west-2",
  "log_group": "/aws/lambda/my-api",
  "github_token": "ENV:STAGING_GITHUB_TOKEN",
  "output_dir": "./doublecheck_evidence",
  "read_only": true,
  "redact_secrets": true
}
```

### Environment Variables

```powershell
$env:STAGING_GITHUB_TOKEN = "ghp_..."
$env:AWS_ACCESS_KEY_ID = "AKIA..."
$env:AWS_SECRET_ACCESS_KEY = "..."
$env:AWS_REGION = "us-west-2"
```

## Prerequisites

- Python 3.8+
- AWS CLI v2 (for log checks)
- GitHub CLI (for artifact checks)
- Git

Install Python dependencies:

```powershell
pip install boto3 requests
```

## When to Use

✅ **Use double-check when:**
- Before promoting staging to production
- After major infrastructure changes
- When debugging intermittent failures
- As part of release validation
- When primary validation seems suspicious

❌ **Don't use double-check:**
- On every commit (too slow, use primary only)
- Without primary validation first
- Against production (use staging only)

## Safety Features

🔒 **Read-only mode** - Never writes to production
🔐 **Secret redaction** - All secrets shown as ***last4
🛡️ **No intrusive tests** - No DB writes, no user creation
🚨 **Escalation on danger** - Stops if production risk detected

## Success Criteria

The double-check passes when:

- All critical checks are consistent (primary == secondary), OR
- Discrepancies have plausible root causes and remediation steps
- No secrets leaked in outputs

## Interpreting Consistency Rate

- **100%**: Perfect! Primary validation is rock solid.
- **80-99%**: Good. Minor transient issues, check remediation results.
- **50-79%**: Warning. Significant issues, review inconsistencies.
- **<50%**: Critical. Major problems with primary validation or environment.

## Troubleshooting

### No Secondary Checks Run

**Cause**: All primary checks failed or were skipped
**Fix**: Run primary validation first with passing checks

### All Secondary Checks Error

**Cause**: Missing credentials or network access
**Fix**: Set environment variables, check AWS/GitHub access

### Inconsistent Results Every Time

**Cause**: Actual environment issue (not validation issue)
**Fix**: Check staging environment health, not agent config

## Next Steps

1. Review the markdown report for inconsistencies
2. Check remediation results for resolved issues
3. Investigate persistent discrepancies
4. Update primary validation if false positives found
5. Fix environment issues if real problems found

## Full Documentation

See `PHASE5_DOUBLECHECK_USAGE_GUIDE.md` for complete documentation.

## Quick Reference

```powershell
# Help
./run_phase5_doublecheck.sh --help

# View reports
ls -lh doublecheck_evidence/
Get-Content doublecheck_evidence/phase5_double_check_report_*.md

# Run tests
cd .. && python3 -m unittest tests.test_phase5_doublecheck_agent
```

## Example Output

```
╔═══════════════════════════════════════════════════════╗
║  Phase 5 Double-Check (Red-Team) Agent               ║
╚═══════════════════════════════════════════════════════╝

Configuration:
  Primary Report: validation_report_20251017.json
  Config File:    doublecheck_config.json

✓ Running Phase 5 Double-Check Agent...

Reports generated in: ./doublecheck_evidence

Next steps:
  1. Review the double-check matrix JSON
  2. Review the markdown report
  3. Address any inconsistencies found
```

---

**Remember**: The double-check agent is the annoying QA friend who retries everything twice. 
If it finds inconsistencies, thank it for saving you from shipping broken sauce! 🎯
