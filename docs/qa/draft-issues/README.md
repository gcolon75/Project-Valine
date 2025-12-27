# Draft GitHub Issues for Orchestration Analyzer Enhancements

This directory contains draft GitHub issues for remaining enhancements to the orchestration analysis tool (`scripts/analyze-orchestration-run.mjs`). These issues are ready to be created in the repository to enable future agent automation.

## Overview

The orchestration analyzer is a comprehensive tool for analyzing GitHub Actions workflow runs. These enhancements will improve its reliability, performance, flexibility, and security.

## Draft Issues

### 1. Rate Limiting & Exponential Backoff for REST Retrieval
**File:** [01-rate-limiting-exponential-backoff.md](01-rate-limiting-exponential-backoff.md)  
**Labels:** `enhancement`, `analyzer`  
**Priority:** P2  
**Dependency:** After REST fallback implementation

Implement intelligent retry logic with exponential backoff for REST API artifact retrieval to handle transient failures and respect GitHub's rate limits.

### 2. Streaming Artifact Extraction to Reduce Peak Memory
**File:** [02-streaming-artifact-extraction.md](02-streaming-artifact-extraction.md)  
**Labels:** `enhancement`, `analyzer`, `performance`  
**Priority:** P2  
**Dependency:** None

Stream ZIP extraction and parsing to reduce memory footprint and improve startup time for large artifact collections.

### 3. Externalized Config File for Artifact Names & Severity Thresholds
**File:** [03-externalized-config-file.md](03-externalized-config-file.md)  
**Labels:** `enhancement`, `analyzer`, `configuration`  
**Priority:** P2  
**Dependency:** None

Enable configuration via external JSON/YAML files for artifact names, severity mappings, gating thresholds, and other settings.

### 4. Visual Diff Integration Pipeline
**File:** [04-visual-diff-integration-pipeline.md](04-visual-diff-integration-pipeline.md)  
**Labels:** `enhancement`, `analyzer`, `visual-testing`  
**Priority:** P3  
**Dependency:** None

Integrate visual regression testing with baseline comparison and automated diff generation for UI changes.

### 5. Flakiness Historical Storage (Persist Test Results Snapshot)
**File:** [05-flakiness-historical-storage.md](05-flakiness-historical-storage.md)  
**Labels:** `enhancement`, `analyzer`, `testing`  
**Priority:** P2  
**Dependency:** None

Store minimal test result snapshots over time to track flakiness trends and test suite health metrics.

### 6. Extended Secret Redaction Patterns
**File:** [06-extended-secret-redaction-patterns.md](06-extended-secret-redaction-patterns.md)  
**Labels:** `enhancement`, `analyzer`, `security`  
**Priority:** P1  
**Dependency:** None

Expand secret redaction to cover JWTs, private keys, cloud credentials, database URLs, and other sensitive patterns.

### 7. Performance Profiling Harness for Large Artifacts
**File:** [07-performance-profiling-harness.md](07-performance-profiling-harness.md)  
**Labels:** `enhancement`, `analyzer`, `performance`  
**Priority:** P2  
**Dependency:** None

Add comprehensive performance profiling to identify bottlenecks and track optimization improvements over time.

### 8. PR Comment Templating & Localization Support
**File:** [08-pr-comment-templating-localization.md](08-pr-comment-templating-localization.md)  
**Labels:** `enhancement`, `analyzer`, `i18n`  
**Priority:** P3  
**Dependency:** None

Implement template system with i18n support for customizable, multi-language PR comments and notifications.

## Priority Summary

| Priority | Count | Issues |
|----------|-------|--------|
| P1 (High) | 1 | #6 Extended Secret Redaction |
| P2 (Medium) | 5 | #1 Rate Limiting, #2 Streaming, #3 Config, #5 Flakiness Storage, #7 Profiling |
| P3 (Low) | 2 | #4 Visual Diff, #8 Templating |

## Creating Issues

### Manual Creation

Each markdown file contains all the information needed to create a GitHub issue:
- Title (from the `# Enhancement:` header)
- Description (full content)
- Labels (listed at the top)
- Acceptance criteria
- Technical details and examples

### Automated Creation (with GitHub CLI)

If you have GitHub CLI (`gh`) installed and authenticated with appropriate permissions:

```powershell
# Create individual issue
gh issue create \
  --title "Rate Limiting & Exponential Backoff for REST Retrieval" \
  --body-file docs/qa/draft-issues/01-rate-limiting-exponential-backoff.md \
  --label enhancement,analyzer

# Or use the provided script (if available)
./scripts/create-enhancement-issues.sh
```

### Automated Creation (with JSON payload)

See [enhancement-issues-draft.json](enhancement-issues-draft.json) for a machine-readable format suitable for GitHub API or automation tools.

## Dependencies

- **Issue #1 (Rate Limiting)**: Depends on REST fallback implementation
- **Issues #2-#8**: No blocking dependencies, can be implemented in any order

## Implementation Order Recommendation

For maximum impact, consider implementing in this order:

1. **#6 Extended Secret Redaction** (P1, security-critical)
2. **#3 Externalized Config** (enables customization for all features)
3. **#2 Streaming Extraction** (performance win, enables handling larger artifacts)
4. **#7 Performance Profiling** (measure impact of #2 and future optimizations)
5. **#5 Flakiness Storage** (valuable for test suite health)
6. **#1 Rate Limiting** (production resilience)
7. **#4 Visual Diff** (comprehensive QA)
8. **#8 Templating** (polish and i18n)

## Related Documentation

- [Orchestration Analysis README](../../../../scripts/ORCHESTRATION_ANALYSIS_README.md)
- [Orchestration Analysis Quick Reference](../../../../scripts/ORCHESTRATION_ANALYSIS_QUICKREF.md)
- [Orchestration Analysis CLI Guide](../../../../scripts/ORCHESTRATION_ANALYSIS_CLI_GUIDE.md)
- [Security Documentation](../../../../scripts/ORCHESTRATION_ANALYSIS_SECURITY.md)

## Contributing

If you'd like to implement any of these enhancements:

1. Choose an issue from the list above
2. Review the detailed markdown file for requirements
3. Check for dependencies (most have none)
4. Follow the acceptance criteria
5. Refer to the technical notes and examples
6. Submit a PR with your implementation

## Questions or Feedback

For questions about these enhancements or the orchestration analyzer:
- Open a discussion in the repository
- Contact the QA/CI team
- Review the existing documentation in `scripts/`

---

**Last Updated:** 2025-11-10  
**Created By:** Documentation Agent (Phase Group D)
