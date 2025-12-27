# Enhancement: Externalized Config File for Artifact Names & Severity Thresholds

**Labels:** `enhancement`, `analyzer`, `configuration`  
**Dependency:** None

## Context

The orchestration analysis tool currently has hardcoded configuration for:
- Expected artifact names (e.g., `accessibility-report`, `playwright-results`)
- Severity mappings (critical→P0, serious→P1, etc.)
- Gating thresholds (e.g., ">3 P1 issues = CAUTION")
- File patterns to extract/ignore
- Security limits (max file size, max file count)

This makes the tool less flexible for different projects or evolving workflows.

## Problem Statement

Current limitations:
- Configuration changes require code modifications
- No easy way to customize for different repositories
- Hard to A/B test different severity thresholds
- Difficult to add new artifact types without code changes
- No per-repository customization in multi-repo setups

This creates:
- Maintenance burden for configuration updates
- Risk of breaking changes when modifying thresholds
- Difficulty onboarding new projects with different artifact names
- No version control for configuration separately from code

## Rationale

Externalizing configuration enables:
- **Flexibility**: Customize behavior per project without code changes
- **Maintainability**: Non-developers can adjust thresholds
- **Versioning**: Track configuration changes separately
- **Testing**: Easily test different threshold policies
- **Multi-repo**: Support different configs for different repositories

## Proposed Solution

Create a `.orchestrator-config.json` or `.orchestrator-config.yaml` file:

```json
{
  "version": "1.0",
  "artifacts": {
    "expected": [
      {
        "name": "accessibility-report",
        "required": true,
        "parser": "axe-json",
        "severity_map": {
          "critical": "P0",
          "serious": "P1",
          "moderate": "P2",
          "minor": "P3"
        }
      },
      {
        "name": "playwright-results",
        "required": false,
        "parser": "playwright-json",
        "flakiness_threshold": 0.20
      }
    ]
  },
  "gating": {
    "fail_on": "P0",
    "caution_threshold": {
      "P1": 3,
      "P2": 10
    },
    "block_threshold": {
      "P0": 1
    }
  },
  "extraction": {
    "max_file_size_mb": 250,
    "max_file_count": 10000,
    "skip_patterns": [
      "**/node_modules/**",
      "**/.git/**"
    ]
  }
}
```

## Acceptance Criteria

- [ ] Define configuration schema (JSON Schema)
- [ ] Support both JSON and YAML formats
- [ ] Load config from multiple sources (priority order):
  1. `--config <path>` CLI flag
  2. `.orchestrator-config.{json,yaml}` in repo root
  3. `~/.orchestrator-config.{json,yaml}` (user home)
  4. Built-in defaults (fallback)
- [ ] Validate configuration on load
- [ ] Provide clear error messages for invalid config
- [ ] Support environment variable overrides
- [ ] Add `--dump-config` command to show effective config
- [ ] Update documentation with all options
- [ ] Include example configs for common scenarios
- [ ] Add unit tests for config loading
- [ ] Support per-workflow config overrides

## Example Usage

```powershell
# Use custom config file
node scripts/analyze-orchestration-run.mjs 123456 --config my-config.yaml

# Use repo config (auto-detected)
node scripts/analyze-orchestration-run.mjs 123456

# Override via env var
ORCH_FAIL_ON=P1 node scripts/analyze-orchestration-run.mjs 123456

# Show effective configuration
node scripts/analyze-orchestration-run.mjs --dump-config
```

## Technical Notes

- Use JSON Schema for validation (ajv library)
- Support environment variable pattern: `ORCH_<SECTION>_<KEY>=value`
- Provide schema versioning for future changes

## References

- JSON Schema: https://json-schema.org/
- ajv: https://ajv.js.org/
- 12-factor config: https://12factor.net/config

## Related Issues

- Enhancement #6: Extended secret redaction (will use config patterns)
- Enhancement #8: PR comment templating (will use config)

## Priority

**P2** - High value for flexibility, not blocking current functionality.
