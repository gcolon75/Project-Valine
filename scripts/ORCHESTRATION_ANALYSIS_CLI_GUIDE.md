# Orchestration Analysis CLI Guide - Phase Group A Enhancements

## Overview

This guide documents the CLI enhancements added to `analyze-orchestration-run.mjs` in Phase Group A.

## New CLI Flags

### `--out-dir <path>`

**Purpose:** Specify custom output directory for analysis reports.

**Default:** `analysis-output`

**Example:**
```bash
node scripts/analyze-orchestration-run.mjs 12345 --out-dir ./my-reports
```

**Output files:**
- `./my-reports/CONSOLIDATED_ANALYSIS_REPORT.md`
- `./my-reports/draft-pr-payloads.json`
- `./my-reports/draft-github-issues.json`
- `./my-reports/summary.json` (if `--json` specified)

---

### `--json`

**Purpose:** Emit machine-readable JSON summary file.

**Output:** Creates `summary.json` in the output directory.

**Example:**
```bash
node scripts/analyze-orchestration-run.mjs 12345 --json
```

**JSON Structure:**
```json
{
  "runId": "12345",
  "timestamp": "2025-11-10T18:00:00.000Z",
  "status": "success",
  "workflowName": "orchestrate-verification-and-sweep",
  "gating": {
    "decision": "✅ PROCEED",
    "recommendation": "No critical issues detected.",
    "exitCode": 0
  },
  "artifacts": {
    "found": ["verification-and-smoke-artifacts", "playwright-report"],
    "missing": ["regression-and-a11y-artifacts"],
    "degraded": true
  },
  "issues": {
    "p0": 0,
    "p1": 2,
    "p2": 5,
    "total": 7
  },
  "tests": {
    "playwright": {
      "total": 25,
      "passed": 23,
      "failed": 2,
      "skipped": 0
    },
    "a11y": {
      "violations": 3
    }
  },
  "healthChecks": 2,
  "authChecks": 3,
  "extraction": {
    "totalSize": 12456789,
    "fileCount": 234,
    "sanitizedPaths": 0
  }
}
```

---

### `--summary <path>`

**Purpose:** Write executive summary markdown to a custom path.

**Example:**
```bash
node scripts/analyze-orchestration-run.mjs 12345 --summary ./exec-summary.md
```

**Output:** Creates a concise executive summary at the specified path with:
- Gating decision (BLOCK/CAUTION/PROCEED)
- Issue counts by priority
- Test results summary
- Missing artifacts (if any)
- Recommended actions

**Sample Output:**
```markdown
# Executive Summary - Run 12345

**Date:** 2025-11-10T18:00:00.000Z
**Workflow:** orchestrate-verification-and-sweep
**Status:** success

## Gating Decision

**✅ PROCEED** - No critical issues detected. Safe to proceed with deployment.

## Issue Summary

| Priority | Count | Description |
|----------|-------|-------------|
| P0 | 0 | Critical - Blocks deployment |
| P1 | 2 | High - Review required |
| P2 | 5 | Medium - Track in backlog |

## Test Results

- **Playwright:** 23/25 passed (2 failed)
- **Accessibility:** 3 violations

## Recommended Actions

1. Review all 2 P1 issue(s)
2. Create tracking issues
3. Assess deployment readiness
```

---

### `--fail-on <P0|P1|P2|none>`

**Purpose:** Configure exit code policy based on issue severity.

**Default:** `P0`

**Exit Codes:**
- **0 (PROCEED):** No issues above threshold
- **1 (CAUTION):** Issues detected at specified level
- **2 (BLOCK):** P0 critical issues always block (unless `--fail-on none`)

**Examples:**

```bash
# Exit 2 only if P0 issues present (default)
node scripts/analyze-orchestration-run.mjs 12345 --fail-on P0

# Exit 1 if any P1 issues present
node scripts/analyze-orchestration-run.mjs 12345 --fail-on P1

# Exit 1 if any P2 issues present
node scripts/analyze-orchestration-run.mjs 12345 --fail-on P2

# Always exit 0 (never fail)
node scripts/analyze-orchestration-run.mjs 12345 --fail-on none
```

**Policy Details:**

| fail-on | P0 issues | Multiple P1 (>3) | Any P1 | Any P2 | Exit Code |
|---------|-----------|------------------|--------|--------|-----------|
| P0      | Yes       | -                | -      | -      | 2         |
| P0      | No        | Yes              | -      | -      | 1         |
| P0      | No        | No               | -      | -      | 0         |
| P1      | Yes       | -                | -      | -      | 2         |
| P1      | No        | -                | Yes    | -      | 1         |
| P1      | No        | -                | No     | -      | 0         |
| P2      | Yes       | -                | -      | -      | 2         |
| P2      | No        | -                | -      | Yes    | 1         |
| P2      | No        | -                | -      | No     | 0         |
| none    | -         | -                | -      | -      | 0         |

---

### `--log-level <info|debug>`

**Purpose:** Control logging verbosity.

**Default:** `info`

**Levels:**
- **info:** Standard output with timestamps, shows: info, success, warning, error
- **debug:** Verbose output, includes all info-level logs plus debug messages

**Example:**
```bash
# Standard logging
node scripts/analyze-orchestration-run.mjs 12345 --log-level info

# Verbose debugging
node scripts/analyze-orchestration-run.mjs 12345 --log-level debug
```

**Debug Output Includes:**
- Gating decision reasoning
- Path sanitization details
- Extraction statistics
- Configuration options
- Internal state changes

**Sample Debug Logs:**
```
[2025-11-10T18:00:00.000Z] DEBUG Options: {"outDir":"./analysis-output","emitJson":false,...}
[2025-11-10T18:00:00.000Z] DEBUG Sanitizing path: normal/file.txt
[2025-11-10T18:00:00.000Z] DEBUG Path sanitized: normal/file.txt -> /base/normal/file.txt
[2025-11-10T18:00:00.000Z] DEBUG Extraction stats: 234 files, 12.45 MB
[2025-11-10T18:00:00.000Z] DEBUG Computing gating decision: P0=0, P1=2, P2=5
[2025-11-10T18:00:00.000Z] DEBUG Gating: REVIEW due to 2 P1 issue(s)
[2025-11-10T18:00:00.000Z] DEBUG Computing exit code with --fail-on=P0: P0=0, P1=2, P2=5
[2025-11-10T18:00:00.000Z] DEBUG Exit code: 1 (2 P1 issues, threshold exceeded)
```

---

### `--no-gh`

**Purpose:** Force REST API artifact retrieval mode (stub implementation).

**Status:** **Stub mode only** - REST API implementation deferred to Phase Group B.

**Example:**
```bash
node scripts/analyze-orchestration-run.mjs 12345 --no-gh
```

**Output:**
```
⚠ --no-gh flag specified: REST API mode not yet implemented
⚠ Proceeding with GitHub CLI mode as fallback
DEBUG REST API artifact retrieval is a stub for future implementation
```

**Note:** The script will continue using GitHub CLI (`gh`) for artifact retrieval and display a warning. This flag is a placeholder for future REST API integration.

---

## Exit Code Policy

The script now returns meaningful exit codes based on analysis results:

| Exit Code | Status | Meaning |
|-----------|--------|---------|
| 0 | PROCEED | No critical issues or issues below configured threshold |
| 1 | CAUTION | High-priority issues detected, review required |
| 2 | BLOCK | Critical P0 issues present, deployment blocked |

### Using Exit Codes in CI/CD

```bash
#!/bin/bash
# CI/CD integration example

node scripts/analyze-orchestration-run.mjs "$RUN_ID" --fail-on P0
EXIT_CODE=$?

case $EXIT_CODE in
  0)
    echo "✅ Analysis passed, proceeding with deployment"
    ;;
  1)
    echo "⚠️ Analysis raised caution, manual review required"
    # Notify team, create issues, etc.
    ;;
  2)
    echo "🛑 Analysis blocked, critical issues must be resolved"
    exit 1  # Fail the CI/CD pipeline
    ;;
esac
```

---

## Safe Artifact Extraction

Phase Group A implements security guards for artifact extraction:

### Path Sanitization

**Protections:**
- ✅ Rejects paths with `..` components (path traversal)
- ✅ Rejects absolute paths (`/etc/passwd`)
- ✅ Rejects drive letters (`C:\Windows\System32`)
- ✅ Ensures all paths remain within base directory

**Example:**
```javascript
// Safe paths
"logs/verification/health.json"  ✅
"reports/summary.md"             ✅

// Rejected paths
"../../../etc/passwd"            ❌ Path traversal
"/etc/passwd"                    ❌ Absolute path
"C:\Windows\System32"            ❌ Drive letter
```

### Extraction Limits

**File Count Limit:** 10,000 files
**Size Limit:** 250 MB (uncompressed)

When limits are exceeded, extraction aborts with an error:
```
✗ Extraction aborted: file count exceeds 10000
✗ Extraction aborted: total size exceeds 250 MB
```

### Sanitized Tree Listing

Debug logs show original vs sanitized paths:
```
DEBUG Sanitizing path: normal/path/file.txt
DEBUG Path sanitized: normal/path/file.txt -> /base/normal/path/file.txt
⚠ Potentially unsafe path detected: ../malicious/file.txt
```

---

## Structured Logging

All log messages now include ISO 8601 timestamps:

```
[2025-11-10T18:00:00.123Z] ℹ Found 3 artifact(s)
[2025-11-10T18:00:01.456Z] ✓ Playwright: 23/25 passed
[2025-11-10T18:00:02.789Z] ⚠ Missing artifacts: regression-and-a11y-artifacts
[2025-11-10T18:00:03.012Z] ✗ Auth check failed
```

**Log Levels:**
- `info` - Shows standard operational messages
- `debug` - Shows verbose debugging information

---

## Missing Artifact Handling

The analyzer gracefully handles missing artifacts:

1. **Continues Analysis:** Doesn't crash on missing artifacts
2. **Notes Degraded State:** Clearly marks analysis as degraded
3. **Partial Parsing:** Analyzes available artifacts
4. **Reports Missing:** Lists missing artifacts in all outputs

**Example:**
```
⚠️ DEGRADED: Analysis performed with missing artifacts

Missing Artifacts:
- regression-and-a11y-artifacts
- playwright-report
```

---

## Complete Usage Examples

### Basic Analysis
```bash
node scripts/analyze-orchestration-run.mjs 12345
```

### Production-Ready Analysis
```bash
node scripts/analyze-orchestration-run.mjs 12345 \
  --json \
  --summary ./exec-summary.md \
  --fail-on P0 \
  --log-level info
```

### Debug Mode for Troubleshooting
```bash
node scripts/analyze-orchestration-run.mjs 12345 \
  --log-level debug \
  --out-dir ./debug-reports
```

### Strict Mode (Fail on Any P1)
```bash
node scripts/analyze-orchestration-run.mjs 12345 \
  --fail-on P1 \
  --json
```

### CI/CD Integration
```bash
# In your GitHub Actions workflow
- name: Analyze orchestration results
  run: |
    node scripts/analyze-orchestration-run.mjs "${{ github.run_id }}" \
      --json \
      --summary ./exec-summary.md \
      --fail-on P0 \
      --out-dir ./analysis-reports
    
- name: Upload analysis artifacts
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: analysis-reports
    path: ./analysis-reports/
```

---

## Migration from Previous Version

The enhanced script maintains backward compatibility:

**Old Usage:**
```bash
node scripts/analyze-orchestration-run.mjs 12345
```

**New Usage (same behavior):**
```bash
node scripts/analyze-orchestration-run.mjs 12345 \
  --out-dir analysis-output \
  --fail-on P0 \
  --log-level info
```

All flags are optional and have sensible defaults.

---

## Testing

### Placeholder Tests

Test placeholders are available in `tests/scripts/analyze-orchestration-run.test.mjs`:

```bash
npm test -- tests/scripts/analyze-orchestration-run.test.mjs
```

**Note:** Full test implementation is deferred to Phase Group B.

### Manual Testing

Validate the script:
```bash
# Syntax check
node --check scripts/analyze-orchestration-run.mjs

# Help output
node scripts/analyze-orchestration-run.mjs --help

# Invalid inputs
node scripts/analyze-orchestration-run.mjs abc123          # Invalid run ID
node scripts/analyze-orchestration-run.mjs 12345 --fail-on invalid  # Invalid flag
```

---

## Security Considerations

### Path Sanitization

The script protects against:
- **Path Traversal:** Prevents `../../../etc/passwd` attacks
- **Absolute Paths:** Blocks access outside artifact directory
- **Drive Letters:** Rejects Windows-style absolute paths

### Extraction Limits

Guards against:
- **Zip Bombs:** 250 MB uncompressed size limit
- **Resource Exhaustion:** 10,000 file count limit

### Logging

- **Timestamps:** All operations are auditable
- **Debug Mode:** Detailed logging for security reviews

---

## Next Steps (Phase Group B)

Phase Group B will implement:
1. Full REST API artifact retrieval (remove `--no-gh` stub)
2. Workflow integration and automation
3. Comprehensive test suite
4. Advanced reporting features

---

## Support

For issues or questions:
1. Check this guide and main README
2. Run with `--help` for usage information
3. Use `--log-level debug` for troubleshooting
4. Open an issue with run ID and error logs
