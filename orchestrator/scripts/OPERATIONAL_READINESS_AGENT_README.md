# Operational Readiness Validation Agent

## Overview

The **Operational Readiness Validation Agent** is an SRE/dev-ops AI agent designed to validate the operational readiness of the Discord AI triage system in the Project Valine repository. It performs comprehensive checks, generates evidence-based reports, and guides operators through staging validation with safety guardrails.

## Features

### 1. 🔍 Repository Reconnaissance
- Discovers Discord handlers, GitHub Actions clients, and agent scripts
- Enumerates all implemented slash commands
- Identifies command registration scripts
- Provides 1-line summaries of entry points

### 2. 🔐 Secrets-in-Code Check
- Searches for hardcoded tokens and credentials
- Maps example configs to expected GitHub secrets
- Redacts sensitive data (shows only last 4 characters)
- Verifies secret documentation

### 3. 📊 Workflow & CI Scan
- Lists all GitHub Actions workflows with triggers
- Extracts referenced secrets and environment variables
- Identifies unmapped or undocumented secrets
- Counts total tests and identifies flaky tests

### 4. 🛠️ Registration & Smoke Test Commands
- Provides exact commands for staging setup
- Lists required environment variables
- Includes deployment and validation commands
- Shows how to trigger smoke tests via GitHub Actions

### 5. 🧪 E2E /triage Dry-Run Guide
- Step-by-step guide for testing /triage command
- Instructions for Discord interaction
- GitHub Actions monitoring guidance
- Draft PR verification steps

### 6. 🛡️ Draft PR Policy Verification
- Verifies branch naming conventions
- Checks for draft-only PR enforcement
- Validates change size limits
- Ensures secret detection before commit
- Generates code suggestions for missing guardrails

### 7. 📄 Comprehensive Report Generation
- Produces concise pass/fail reports (≤800 words)
- Includes Summary, Findings, Action Plan, and Evidence
- Saves JSON and Markdown formats
- Redacts all sensitive data

## Installation

No additional dependencies are required. The agent uses Python 3 standard library.

```bash
cd orchestrator/scripts
chmod +x operational_readiness_agent.py
```

## Usage

### Quick Start

```bash
# Run with default settings
python3 operational_readiness_agent.py run --repo gcolon75/Project-Valine

# Run with test PR for E2E validation
python3 operational_readiness_agent.py run --repo gcolon75/Project-Valine --test-pr 71

# Generate example config
python3 operational_readiness_agent.py generate-config
```

### Command-Line Options

#### `run` Command

```bash
python3 operational_readiness_agent.py run [OPTIONS]
```

**Options:**

- `--repo REPO` - Repository in format `owner/name` (default: gcolon75/Project-Valine)
- `--config CONFIG` - Path to JSON config file
- `--test-pr TEST_PR` - Test PR number for E2E validation
- `--allow-run-registration` - Allow running registration commands (requires confirmation)
- `--allow-create-draft-prs` - Allow creating draft PRs (requires explicit authorization)
- `--verbose` - Enable verbose output (default: true)

#### `generate-config` Command

```bash
python3 operational_readiness_agent.py generate-config
```

Generates `operational_readiness_config.json` with example configuration.

### Using a Config File

1. Generate example config:
   ```bash
   python3 operational_readiness_agent.py generate-config
   ```

2. Edit `operational_readiness_config.json`:
   ```json
   {
     "repo": "gcolon75/Project-Valine",
     "base_ref": "main",
     "github_token": "ENV:GITHUB_TOKEN",
     "test_pr_number": 71,
     "allow_run_registration": false,
     "allow_create_draft_prs": false,
     "dry_run": true,
     "verbose": true,
     "pr_scan_start": 50,
     "pr_scan_end": 71,
     "evidence_output_dir": "./readiness_evidence"
   }
   ```

3. Run with config:
   ```bash
   python3 operational_readiness_agent.py run --config operational_readiness_config.json
   ```

## Configuration

### Environment Variables

The agent respects the following environment variables:

- `GITHUB_TOKEN` - GitHub personal access token (for PR analysis and API calls)
- `STAGING_DISCORD_BOT_TOKEN` - Discord bot token for staging
- `STAGING_DISCORD_APPLICATION_ID` - Discord application ID for staging
- `STAGING_DISCORD_GUILD_ID` - Discord guild (server) ID for staging

### Config File Schema

```json
{
  "repo": "owner/repo",
  "base_ref": "main",
  "github_token": "ENV:GITHUB_TOKEN",  // Use ENV: prefix to read from environment
  "test_pr_number": null,              // Optional PR number for E2E testing
  "allow_run_registration": false,     // Allow automated registration
  "allow_create_draft_prs": false,     // Allow draft PR creation
  "dry_run": true,                     // Safe mode - no invasive actions
  "verbose": true,                     // Detailed output
  "pr_scan_start": 50,                 // Start PR for flaky test scan
  "pr_scan_end": 71,                   // End PR for flaky test scan
  "evidence_output_dir": "./readiness_evidence"  // Output directory
}
```

## Output

### Console Output

The agent produces a structured report on the console with:

- 🎮 **Start Phrase**: "On it — running repo recon now."
- 📊 **Summary**: High-level status (≤3 lines)
- 🔍 **Findings**: Bulleted list of discoveries
- 📋 **Action Plan**: Prioritized checklist with time estimates
- 📁 **Evidence**: File paths and redacted snippets
- ❓ **Final Question**: "May I create draft PRs for low-risk fixes?"

### Files Generated

1. **JSON Report**: `readiness_evidence/operational_readiness_report_YYYYMMDD_HHMMSS.json`
   - Complete structured data
   - Machine-readable format
   - All evidence included

2. **Markdown Report**: `readiness_evidence/operational_readiness_report_YYYYMMDD_HHMMSS.md`
   - Human-readable summary
   - Formatted action plan
   - Easy to share with team

## Example Workflow

### 1. Initial Validation

```bash
# Run basic validation
python3 operational_readiness_agent.py run

# Review output
cat readiness_evidence/operational_readiness_report_*.md
```

### 2. Verify Secrets

Check GitHub repository settings:
- Navigate to: Settings → Secrets & variables → Actions
- Verify all secrets listed in Priority 1 of action plan exist
- Confirm staging-specific secrets are configured

### 3. Register Staging Commands

```bash
# Export required env vars
export STAGING_DISCORD_BOT_TOKEN="your_token"
export STAGING_DISCORD_APPLICATION_ID="your_app_id"
export STAGING_DISCORD_GUILD_ID="your_guild_id"

# Run with registration allowed
python3 operational_readiness_agent.py run --allow-run-registration

# Or manually execute:
cd ../..
./register_discord_commands_staging.sh
```

### 4. Run Smoke Tests

```bash
# Via GitHub CLI
gh workflow run bot-smoke.yml --ref main

# Or via API
curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/gcolon75/Project-Valine/actions/workflows/bot-smoke.yml/dispatches \
  -d '{"ref":"main"}'
```

### 5. E2E /triage Test

```bash
# Run with test PR
python3 operational_readiness_agent.py run --test-pr 71

# Follow the E2E guide in the report to:
# 1. Trigger /triage in Discord
# 2. Monitor workflow runs
# 3. Verify draft PR creation
# 4. Review results
```

## Safety Features

### Read-Only by Default

- Agent operates in read-only mode unless explicitly authorized
- No writes, pushes, or PR creation without flags
- All invasive actions require confirmation

### Secret Redaction

- All tokens show only last 4 characters: `***abcd`
- Redaction applies to console output, JSON, and Markdown reports
- Comprehensive pattern matching for various secret types

### Confirmation Prompts

- Registration requires explicit "Yes" confirmation
- Draft PR creation requires explicit authorization
- User must verify staging guild ID and secrets exist

### Audit Trail

- All actions logged with timestamps
- Correlation IDs for tracking
- Evidence files preserved for review

## Troubleshooting

### Common Issues

#### 1. "Missing required environment variables"

**Solution**: Export required variables before running:
```bash
export GITHUB_TOKEN="ghp_..."
export STAGING_DISCORD_BOT_TOKEN="..."
```

#### 2. "Could not analyze PR X"

**Solution**: Ensure `GITHUB_TOKEN` has `repo` scope and can read PRs.

#### 3. "Unmapped secrets found"

**Solution**: Review unmapped secrets in report and add them to example configs or GitHub secrets.

#### 4. "Missing guardrails detected"

**Solution**: Review suggestions in report and apply code changes to strengthen guardrails.

### Debug Mode

Enable verbose output for detailed logging:
```bash
python3 operational_readiness_agent.py run --verbose
```

## Integration with CI/CD

### GitHub Actions Workflow

```yaml
name: Operational Readiness Check

on:
  schedule:
    - cron: '0 9 * * *'  # Daily at 9 AM UTC
  workflow_dispatch:

jobs:
  readiness-check:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Run operational readiness agent
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          cd orchestrator/scripts
          python3 operational_readiness_agent.py run --repo ${{ github.repository }}
      
      - name: Upload report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: readiness-report
          path: readiness_evidence/operational_readiness_report_*.md
```

## Best Practices

### Before Running

1. ✅ Ensure you're on a clean branch
2. ✅ Verify GitHub token has appropriate scopes
3. ✅ Review staging guild ID and bot tokens
4. ✅ Check that example configs are up to date

### After Running

1. ✅ Review generated reports thoroughly
2. ✅ Address high-severity findings first
3. ✅ Update documentation based on findings
4. ✅ Share reports with team
5. ✅ Track action items in project board

### Regular Cadence

- **Daily**: Automated readiness checks (read-only)
- **Weekly**: Manual review of reports and action items
- **Before Releases**: Full validation with E2E tests
- **After Incidents**: Immediate readiness check

## Architecture

### Agent Structure

```
OperationalReadinessAgent
├── perform_repo_recon()           # Task 1: Find entry points
├── perform_secrets_check()        # Task 2: Search for leaks
├── perform_workflow_scan()        # Task 3: Analyze CI/CD
├── provide_registration_commands()# Task 4: Command generation
├── guide_e2e_triage_test()       # Task 5: E2E guide
├── verify_draft_pr_policies()     # Task 6: Policy check
└── generate_report()              # Task 7: Report creation
```

### Data Classes

- `OperationalReadinessConfig` - Agent configuration
- `ReconResult` - Repository reconnaissance results
- `SecretsCheckResult` - Secrets scan results
- `WorkflowScanResult` - Workflow analysis results
- `OperationalReadinessReport` - Final report structure

## Contributing

When extending the agent:

1. Follow existing patterns and style
2. Add comprehensive docstrings
3. Include error handling and logging
4. Maintain read-only default behavior
5. Add appropriate confirmation prompts
6. Update documentation

## Related Documentation

- [Phase 5 Triage Agent](./phase5_triage_agent.py) - Failed run triage and fixes
- [Phase 5 Super Agent](./phase5_super_agent.py) - Comprehensive staging validation
- [Phase 5 Staging Validator](./phase5_staging_validator.py) - Feature validation
- [Discord Slash Commands Validation](./validate_discord_slash_commands.py) - Command verification

## License

Part of Project Valine - see repository license.

## Support

For issues or questions:
1. Review this README
2. Check troubleshooting section
3. Review generated reports for specific errors
4. Consult related documentation

---

**Remember**: The agent starts with "On it — running repo recon now." and uses light Gen-Z/video-game humor while staying professional and helpful. Always ask before any write/invasive actions! 🎮✨
