# Phase 5 Double-Check Report

**Run ID:** DOUBLECHECK-20251017-210058-e30ead55
**Timestamp:** 2025-10-17T21:01:35.051495+00:00

## Executive Summary

- **Total Checks:** 5
- **Consistent:** 1
- **Inconsistent:** 4
- **Remediation Attempted:** 3
- **Remediation Successful:** 0

## Consistency Rate

**20.0%** of checks are consistent between primary and secondary validation.

## Double-Check Matrix

| Check ID | Type | Primary | Secondary | Consistent | Discrepancy Note |
|----------|------|---------|-----------|------------|------------------|
| health_api_check | health | ✅ Pass | ❌ Fail | ⚠️ | Primary passed but secondary failed using HEAD / + UI asset fetch |
| version_endpoint_check | version | ✅ Pass | ❌ Fail | ⚠️ | Primary passed but secondary failed using UI meta tag / footer parsing |
| github_actions_artifact_check | artifacts | ✅ Pass | ❌ Fail | ⚠️ | Primary passed but secondary failed using GitHub Checks API |
| cloudwatch_logs_ingestion | logs | ✅ Pass | ❌ Fail | ⚠️ | Primary passed but secondary failed using CloudWatch raw log query |
| discord_alert_test | alerts | ✅ Pass | ✅ Pass | ✅ | N/A |

## Inconsistent Checks Details

### health_api_check

**Type:** health
**Primary Status:** Pass
**Secondary Status:** Fail
**Discrepancy:** Primary passed but secondary failed using HEAD / + UI asset fetch

**Remediation Attempted:** Yes
**Remediation Result:** failed - health check still failing

**Primary Details:**
```json
{
  "url": "https://api.staging.valine.example.com/health",
  "status_code": 200,
  "response_time_ms": 125
}
```

**Secondary Details:**
```json
{
  "error": "HTTPSConnectionPool(host='api.staging.valine.example.com', port=443): Max retries exceeded with url: /health (Caused by NameResolutionError(\"<urllib3.connection.HTTPSConnection object at 0x7f938b111a60>: Failed to resolve 'api.staging.valine.example.com' ([Errno -5] No address associated with hostname)\"))",
  "url": "https://api.staging.valine.example.com/health"
}
```

### version_endpoint_check

**Type:** version
**Primary Status:** Pass
**Secondary Status:** Fail
**Discrepancy:** Primary passed but secondary failed using UI meta tag / footer parsing

**Primary Details:**
```json
{
  "url": "https://api.staging.valine.example.com/version",
  "version": "1.5.2",
  "build_id": "abc123def456"
}
```

**Secondary Details:**
```json
{
  "error": "HTTPSConnectionPool(host='api.staging.valine.example.com', port=443): Max retries exceeded with url: /version (Caused by NameResolutionError(\"<urllib3.connection.HTTPSConnection object at 0x7f938ab82390>: Failed to resolve 'api.staging.valine.example.com' ([Errno -5] No address associated with hostname)\"))",
  "url": "https://api.staging.valine.example.com/version"
}
```

### github_actions_artifact_check

**Type:** artifacts
**Primary Status:** Pass
**Secondary Status:** Fail
**Discrepancy:** Primary passed but secondary failed using GitHub Checks API

**Remediation Attempted:** Yes
**Remediation Result:** failed - still not available

**Primary Details:**
```json
{
  "run_id": 1234567890,
  "artifact_count": 3,
  "artifacts": [
    "logs",
    "test-results",
    "coverage"
  ]
}
```

**Secondary Details:**
```json
{
  "error": "gh: To use GitHub CLI in a GitHub Actions workflow, set the GH_TOKEN environment variable. Example:\n  env:\n    GH_TOKEN: ${{ github.token }}\n",
  "run_id": 1234567890
}
```

### cloudwatch_logs_ingestion

**Type:** logs
**Primary Status:** Pass
**Secondary Status:** Fail
**Discrepancy:** Primary passed but secondary failed using CloudWatch raw log query

**Remediation Attempted:** Yes
**Remediation Result:** failed - still not available

**Primary Details:**
```json
{
  "trace_id": "trace-abc123-def456",
  "log_group": "/aws/lambda/pv-api-prod-api",
  "event_count": 15
}
```

**Secondary Details:**
```json
{
  "error": "\nUnable to locate credentials. You can configure credentials by running \"aws configure\".\n",
  "trace_id": "trace-abc123-def456"
}
```


## Success Criteria

✅ All critical checks consistent OR discrepancy has plausible root cause and remediation steps
✅ No secret leakage in outputs

**Status:** ❌ NEEDS REVIEW - Significant inconsistencies detected