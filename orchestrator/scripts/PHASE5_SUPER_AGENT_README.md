# Phase 5 Staging Super-Agent

## Mission

Speedrun the Phase 5 staging checks with receipts. Execute Steps 3–8 of the staging validation runner, apply the double-check framework for robustness, and ensure Discord slash commands are correctly registered and visible in the staging guild. Output a single, clean report with actionable fixes. No leaking secrets. GG.

## Overview

The Phase 5 Staging Super-Agent is a comprehensive validation tool that combines:

1. **Phase 5 Validation Steps (Steps 3-8)** - Complete staging validation workflow
2. **Double-Check Framework** - Dual verification of all checks for robustness
3. **Discord Slash Commands Validation** - Registration and visibility verification
4. **Comprehensive Reporting** - Single, clean report with all evidence and remediation

## Features

### 1. Prep + Discovery
- ✅ Confirm repository and base_ref
- ✅ Fetch latest default branch SHA
- ✅ Validate environment: tokens present, URLs reachable, DNS resolves, TLS OK
- ✅ Discover validation scripts/workflows/docs

### 2. Phase 5 Staging Validation Runner (Steps 3–8)

| Step | Check | Primary Method | Secondary Method (Double-Check) |
|------|-------|---------------|--------------------------------|
| 3 | Build + Artifact | GitHub Actions workflows exist | package.json exists |
| 4 | Deploy-to-staging | AWS CLI available | SSM parameters accessible |
| 5 | Health checks | GET /health endpoint | HEAD /health endpoint |
| 6 | Smoke tests | Test files exist | pytest available |
| 7 | E2E/synthetics | E2E framework exists | E2E scripts in package.json |
| 8 | Observability | CloudWatch logs accessible | Target log group exists |

### 3. Double-Check Framework
- Each validation performs an alternate method to verify results
- Marks each check as: pass_primary, pass_secondary, consistent
- Detects discrepancies between primary and secondary checks
- Provides discrepancy notes when mismatches occur

### 4. Discord Slash Commands
- Fetches current guild commands
- Compares against expected command schema
- Verifies bot authentication
- Checks for missing/outdated commands
- Validates command visibility in staging guild

### 5. Comprehensive Reporting
- Single Markdown + JSON report with all evidence
- Steps 3-8 results table (status, duration, artifacts)
- Double-check matrix (primary vs secondary, consistency)
- Discord commands diff + propagation checks
- Prioritized, concrete remediation steps
- All secrets automatically redacted

## Quick Start

### Generate Configuration

```bash
cd orchestrator/scripts
python phase5_super_agent.py generate-config
```

This creates `super_agent_config.json` with default values.

### Edit Configuration

Edit `super_agent_config.json` with your values:

```json
{
  "repo": "gcolon75/Project-Valine",
  "base_ref": "main",
  "staging": {
    "urls": [
      "https://staging.example.com",
      "https://staging.example.com/api/health"
    ],
    "region": "us-west-2"
  },
  "discord": {
    "bot_token": "ENV:DISCORD_BOT_TOKEN",
    "app_id": "ENV:DISCORD_APP_ID",
    "guild_id": "ENV:DISCORD_GUILD_ID_STAGING"
  },
  "github": {
    "token": "ENV:GITHUB_TOKEN"
  },
  "aws": {
    "region": "us-west-2",
    "ssm_prefix": "/valine/staging/",
    "log_group": "/aws/lambda/pv-api-prod-api"
  }
}
```

### Set Environment Variables

```bash
export DISCORD_BOT_TOKEN="your-bot-token"
export DISCORD_APP_ID="your-app-id"
export DISCORD_GUILD_ID_STAGING="your-guild-id"
export GITHUB_TOKEN="your-github-token"
```

Or use actual values in the config file (not recommended for production).

### Run Super-Agent

```bash
python phase5_super_agent.py run --config super_agent_config.json
```

### Run with Verbose Output

```bash
python phase5_super_agent.py run --config super_agent_config.json --verbose
```

### Run in Dry-Run Mode

```bash
python phase5_super_agent.py run --config super_agent_config.json --dry-run
```

## GitHub Actions Integration

The super-agent can be run automatically via GitHub Actions:

### Manual Workflow Dispatch

1. Go to **Actions** → **Phase 5 Staging Super-Agent**
2. Click **Run workflow**
3. Select options:
   - **Dry run mode**: Test without modifications
   - **Verbose output**: Enable detailed logging
4. Click **Run workflow**

### Scheduled Execution

The workflow runs automatically every Monday at 10 AM UTC.

### Workflow Features

- ✅ Automatic AWS OIDC authentication
- ✅ Evidence artifact upload (90-day retention)
- ✅ Workflow summary with validation results
- ✅ Automatic PR creation with evidence
- ✅ Secret redaction in all outputs

## Configuration Reference

### Required Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `repo` | Repository name | `gcolon75/Project-Valine` |
| `base_ref` | Base branch/ref | `main` |
| `staging.urls` | Staging URLs to check | `["https://staging.example.com"]` |

### Optional Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `staging.region` | AWS region | `us-west-2` |
| `github.workflows` | Workflows to validate | `[]` |
| `timeouts.action_dispatch` | Workflow timeout (ms) | `600000` |
| `timeouts.http` | HTTP request timeout (ms) | `15000` |
| `timeouts.discord_propagation` | Discord cache timeout (ms) | `60000` |
| `flags.dry_run` | Dry run mode | `false` |
| `flags.verbose` | Verbose output | `true` |
| `flags.redaction_enabled` | Redact secrets | `true` |

### Environment Variable References

Use `ENV:VARIABLE_NAME` syntax to reference environment variables:

```json
{
  "discord": {
    "bot_token": "ENV:DISCORD_BOT_TOKEN",
    "app_id": "ENV:DISCORD_APP_ID",
    "guild_id": "ENV:DISCORD_GUILD_ID_STAGING"
  }
}
```

## Output

### Evidence Directory Structure

```
validation_evidence/
├── super_agent_report_20251017_120000.json  # Full JSON report
└── super_agent_report_20251017_120000.md    # Markdown report
```

### Markdown Report Sections

1. **Context** - Timestamp, correlation ID, repository, configuration
2. **Summary** - Pass/fail counts, Discord commands, issues, remediation
3. **Steps 3-8 Results** - Table with status, duration, consistency
4. **Double-Check Matrix** - Primary vs secondary verification
5. **Discord Commands** - Verified, missing, outdated commands
6. **Issues Found** - Detailed issue descriptions
7. **Remediation Playbook** - Ordered list of fixes
8. **Artifacts** - Links to evidence files
9. **Appendix** - Detailed check results with raw data

### JSON Report Structure

```json
{
  "timestamp": "2025-10-17T12:00:00Z",
  "correlation_id": "SUPER-AGENT-1234567890",
  "config": { /* redacted configuration */ },
  "steps": [
    {
      "name": "Step 3: Build + Artifact Check",
      "status": "PASS",
      "primary_result": { /* ... */ },
      "secondary_result": { /* ... */ },
      "consistent": true,
      "duration_ms": 123.45
    }
  ],
  "discord_commands": {
    "verified": ["verify-latest", "diagnose"],
    "missing": ["debug-last"],
    "errors": []
  },
  "issues": [],
  "remediation": [],
  "artifacts": ["path/to/report.json", "path/to/report.md"]
}
```

## Guardrails (Non-Negotiable)

### 1. Secret Redaction

- ✅ All tokens, passwords, keys automatically redacted
- ✅ Shows only last 4 characters (e.g., `***abcd`)
- ✅ Patterns: `(?i)(token|secret|key|password|bearer)[=: ]\S+`
- ✅ Applied to all evidence: logs, reports, artifacts

### 2. Rate Limiting

- ✅ GitHub API: Respects X-RateLimit headers
- ✅ Discord API: Respects X-RateLimit headers
- ✅ Exponential backoff (base 2, jitter)

### 3. Safety

- ✅ Never performs destructive operations outside staging
- ✅ Dry-run mode available for testing
- ✅ Production channel detection (blocks execution)
- ✅ Deterministic output: same inputs → same plan

## Success Criteria

✅ All Steps 3–8 pass or are cleanly skipped with justification  
✅ Double-checks show consistency; discrepancies explained with remediation  
✅ Discord staging guild shows expected commands present and current  
✅ No secrets leaked; report fully redacted and reproducible  

## Failure Handling

On failure, the super-agent:

1. ✅ Logs detailed error information
2. ✅ Adds issue to issues list
3. ✅ Provides concrete remediation step
4. ✅ Continues with remaining checks (fail-soft)
5. ✅ Generates report with all results
6. ✅ Exits with non-zero code if any failures

## Remediation Playbook

The super-agent provides actionable fixes for common issues:

| Issue | Remediation |
|-------|-------------|
| Missing tokens | Set environment variable DISCORD_BOT_TOKEN |
| URL not reachable | Verify URL https://... is accessible |
| AWS CLI not available | Install and configure AWS CLI |
| Discord 401 Unauthorized | Verify DISCORD_BOT_TOKEN is valid and not expired |
| Discord 403 Forbidden | Verify bot has applications.commands scope |
| Inconsistent health checks | Investigate difference between GET and HEAD |
| Missing Discord commands | Register missing commands: verify-latest, debug-last |

## Testing

### Run Unit Tests

```bash
cd orchestrator
python -m pytest tests/test_phase5_super_agent.py -v
```

### Test Coverage

- ✅ 30 unit tests
- ✅ Configuration loading and generation
- ✅ Secret redaction
- ✅ Check result tracking
- ✅ Double-check framework
- ✅ Discord validation
- ✅ Report generation
- ✅ Error handling

## Comparison with Existing Tools

| Feature | phase5_staging_validator.py | validate_discord_slash_commands.py | phase5_super_agent.py |
|---------|----------------------------|-----------------------------------|----------------------|
| Steps 3-8 | ✅ Yes | ❌ No | ✅ Yes |
| Double-check framework | ❌ No | ❌ No | ✅ Yes |
| Discord validation | ❌ No | ✅ Yes | ✅ Yes |
| Single report | ❌ Separate | ❌ Separate | ✅ Combined |
| GitHub Actions | ✅ Yes | ❌ No | ✅ Yes |
| Automated remediation | ⚠️ Partial | ❌ No | ✅ Full |

## Examples

### Example 1: Full Validation

```bash
python phase5_super_agent.py run --config super_agent_config.json
```

**Output:**
```
[12:00:00] ℹ️  ============================================================
[12:00:00] ℹ️  Phase 5 Staging Super-Agent
[12:00:00] ℹ️  Correlation ID: SUPER-AGENT-1697544000
[12:00:00] ℹ️  ============================================================
[12:00:00] ℹ️  ============================================================
[12:00:00] ℹ️  STEP 1: Prep + Discovery
[12:00:00] ℹ️  ============================================================
[12:00:01] ✅ ✅ Repository and Base Ref: PASS
[12:00:01] ✅ ✅ Required Tokens Present: PASS
[12:00:02] ✅ ✅ URL Reachable: https://staging.example.com: PASS
[12:00:02] ✅ ✅ Discover Validation Scripts: PASS
...
[12:00:10] ✅ Validation complete in 10234ms
[12:00:10] ℹ️  ============================================================
[12:00:10] ℹ️  VALIDATION SUMMARY
[12:00:10] ℹ️  ============================================================

## Summary

**Total Checks:** 15
- ✅ Passed: 13
- ❌ Failed: 0
- ⚠️ Warnings: 2
- ⏭️ Skipped: 0

**Discord Commands:** 3 registered
**Issues Found:** 0
**Remediation Steps:** 0

✅ Validation completed successfully
```

### Example 2: With Missing Commands

```bash
python phase5_super_agent.py run --config super_agent_config.json
```

**Output:**
```
...
[12:00:08] ⚠️  ⚠️ Discord Slash Commands - Fetch Current: WARNING
[12:00:08] ℹ️  ============================================================
[12:00:08] ⚠️  REMEDIATION REQUIRED
[12:00:08] ℹ️  ============================================================
1. Register missing Discord commands: debug-last, verify-run
```

### Example 3: Dry Run

```bash
python phase5_super_agent.py run --config super_agent_config.json --dry-run
```

All checks run but no modifications are made.

## Troubleshooting

### Issue: "Cannot verify base_ref"

**Cause:** Git cannot find the specified branch/ref  
**Fix:** Ensure you're in the repository root and the ref exists

```bash
cd /path/to/Project-Valine
git branch -a
```

### Issue: "Missing tokens"

**Cause:** Environment variables not set  
**Fix:** Export required variables

```bash
export DISCORD_BOT_TOKEN="your-token"
export DISCORD_APP_ID="your-app-id"
export DISCORD_GUILD_ID_STAGING="your-guild-id"
```

### Issue: "URL not reachable"

**Cause:** Network connectivity or URL configuration issue  
**Fix:** Test URL manually

```bash
curl -I https://staging.example.com
```

### Issue: "Discord 401 Unauthorized"

**Cause:** Invalid or expired bot token  
**Fix:** Regenerate bot token in Discord Developer Portal

### Issue: "AWS credentials not configured"

**Cause:** AWS CLI not configured  
**Fix:** Configure AWS credentials

```bash
aws configure
# or
export AWS_PROFILE=staging
```

## Best Practices

1. **Run weekly** - Schedule automated runs every Monday
2. **Review reports** - Check all evidence before production deploy
3. **Fix issues promptly** - Address remediation steps immediately
4. **Monitor trends** - Track check durations over time
5. **Update expected commands** - Keep Discord command list current
6. **Verify consistency** - Investigate inconsistent double-checks
7. **Redact secrets** - Never disable redaction in production
8. **Use dry-run** - Test configuration changes with --dry-run

## Support

- **Documentation**: This file
- **Tests**: `orchestrator/tests/test_phase5_super_agent.py`
- **Issues**: https://github.com/gcolon75/Project-Valine/issues
- **Workflow**: `.github/workflows/phase5-super-agent.yml`

## Version History

- **v1.0** (2025-10-17) - Initial release
  - Steps 3-8 validation
  - Double-check framework
  - Discord command validation
  - Comprehensive reporting
  - GitHub Actions integration
  - 30 unit tests

## License

Part of Project Valine. See repository LICENSE file.
