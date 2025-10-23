# Orchestrator Scripts

This directory contains utility scripts for managing and validating the Project Valine orchestrator.

## Phase 5 Triage Agent (Auto-Fix)

### Overview

The Phase 5 Triage Agent is an automated triage and fix agent that analyzes failed PRs, workflow runs, and CI jobs, identifies root causes, and can automatically apply fixes and create PRs. It includes comprehensive safety guardrails including secret detection, change limits, and rollback capabilities.

**Script:** `phase5_triage_agent.py`

**Role:** Automated DevOps Triage & Fix Agent

### Key Features

1. **Automatic Failure Detection**
   - Pytest failures with stack traces
   - Python runtime errors (ValueError, ImportError, etc.)
   - Missing dependencies (ModuleNotFoundError)
   - Job/workflow failures
   - Environment configuration issues

2. **Root Cause Analysis**
   - Categorizes failures into 6+ types
   - Extracts relevant log excerpts
   - Identifies affected files and code locations
   - Provides confidence ratings

3. **Automatic Fix Application**
   - Missing dependency installation
   - Configuration file updates
   - Code patches via unified diffs
   - Multi-step remediation playbooks

4. **Safety Guardrails**
   - **File limit**: Max 10 files changed (configurable)
   - **Line limit**: Max 500 lines changed (configurable)
   - **Secret detection**: Blocks PRs with potential secrets
   - **Draft PRs**: Creates draft for invasive changes
   - **No force push**: Never modifies commit history
   - **Manual approval**: All PRs require human review

5. **Automatic PR Creation**
   - Timestamped branches: `auto/triage/fix/pr-{num}/{timestamp}`
   - Comprehensive PR descriptions with metadata
   - Auto-labels: `auto-triage`, `needs-review`, `invasive-changes`
   - Auto-assigns to repository owner
   - Links to workflow logs and triage reports

### Quick Start

**Via GitHub Actions:**
```bash
# Navigate to Actions → Phase 5 Triage Agent → Run workflow
# Input: pr_number=58, mode=apply-fixes, allow_invasive_fixes=true
```

**Via CLI:**
```bash
export GITHUB_TOKEN="your_token"
cd orchestrator/scripts

# Triage only (no modifications)
python phase5_triage_agent.py run --repo gcolon75/Project-Valine --failure-ref 58

# Auto-fix mode
python phase5_triage_agent.py run --repo gcolon75/Project-Valine --failure-ref 58 --auto-fix

# Allow invasive fixes (>10 files or >500 lines)
python phase5_triage_agent.py run --repo gcolon75/Project-Valine --failure-ref 58 --auto-fix --allow-invasive
```

**Via GitHub API:**
```bash
gh workflow run phase5-triage-agent.yml \
  --ref main \
  --field pr_number=58 \
  --field mode=apply-fixes \
  --field allow_invasive_fixes=true
```

### Operation Modes

- **triage-only** (default): Analyzes and reports, no modifications
- **apply-fixes**: Applies fixes and creates PRs automatically

### Safety Features

1. **Secret Detection**: Scans for GitHub tokens, API keys, passwords, private keys
2. **Change Limits**: Enforces max files and lines changed
3. **Draft PRs**: Creates drafts for invasive changes when `--allow-invasive` not set
4. **Dry Run**: Preview changes without applying (`--dry-run`)
5. **Redaction**: All reports have secrets redacted automatically

### Example Scenarios

**Scenario 1: Missing Dependency**
```bash
# PR #58 failed: ModuleNotFoundError: No module named 'requests'
python phase5_triage_agent.py run --repo gcolon75/Project-Valine --failure-ref 58 --auto-fix

# Agent will:
# 1. Detect missing 'requests' module
# 2. Add to requirements.txt
# 3. Create PR with changes
# 4. Label: auto-triage, needs-review
```

**Scenario 2: Invasive Test Fixes**
```bash
# PR #60 has 15 failing tests across 12 files (exceeds 10 file limit)
python phase5_triage_agent.py run --repo gcolon75/Project-Valine --failure-ref 60 --auto-fix

# Agent will:
# 1. Analyze all 15 test failures
# 2. Detect change exceeds limits (12 files)
# 3. Create DRAFT PR for manual review
# 4. Label: auto-triage, needs-review, invasive-changes
```

**Scenario 3: With Invasive Fixes Allowed**
```bash
python phase5_triage_agent.py run --repo gcolon75/Project-Valine --failure-ref 60 --auto-fix --allow-invasive

# Agent will:
# 1. Apply all fixes (even if >10 files)
# 2. Create regular (non-draft) PR
# 3. Include warning in PR description
```

### Output Artifacts

All runs generate artifacts (90-day retention):
```
triage_output/
├── phase5_triage_report.md       # Human-readable report
├── phase5_triage_report.json     # Machine-readable (redacted)
├── fix_patch.diff                # Git patch (if applicable)
├── quick_playbook.txt            # Shell commands (if applicable)
└── fix_pr_url.txt                # PR URL (if created)
```

### Documentation

- **Complete Guide**: `../PHASE5_TRIAGE_AUTOMATION_GUIDE.md` (9KB)
- **Example Usage**: `example_auto_triage_usage.sh`
- **Original Guide**: `PHASE5_TRIAGE_AGENT_GUIDE.md`
- **Quick Reference**: `PHASE5_TRIAGE_QUICK_REF.md`

### Testing

All functionality is backed by comprehensive tests:
```bash
cd orchestrator
python -m pytest tests/test_phase5_triage_agent.py -v
# 31 tests, 100% pass rate
```

---

## Phase 5 Staging Validator

### Overview

The Phase 5 Staging Validator is a comprehensive agent script that validates Phase 5 (observability + alerts) features in a staging environment, manages feature flags safely, and produces validation artifacts. It implements **Steps 3-8** from the Phase 5 Staging Validation Runner specification.

**Script:** `phase5_staging_validator.py`

**Role:** Senior SRE/Platform Engineer Agent

### Validation Steps

The validator implements the complete Phase 5 staging validation workflow:

1. **Step 3: Verify IAM and SSM Parameters**
   - Confirm IAM permissions for SSM GetParameter/PutParameter
   - Confirm IAM permissions for CloudWatch Logs read access
   - Read and verify current SSM parameter values
   - Log any mismatches or required corrections

2. **Step 4: Validate /debug-last (ephemeral + redacted)**
   - Enable ENABLE_DEBUG_CMD flag
   - Document test procedure for manual validation
   - Verify ephemeral response behavior
   - Verify secret redaction in output
   - Capture evidence with trace ID correlation

3. **Step 5: Enable alerts and run controlled failure**
   - Set ENABLE_ALERTS=true with staging channel
   - Document test procedure for controlled failure
   - Verify alert posting with required content
   - Verify rate-limiting/dedupe behavior
   - Capture alert message text (redacted)

4. **Step 6: Capture redacted evidence**
   - Collect CloudWatch logs filtered by trace_id/correlation_id
   - Automatic secret redaction in all evidence
   - Generate structured evidence files
   - Save /debug-last transcripts and alert messages

5. **Step 7: Revert flags to safe defaults**
   - Set ENABLE_ALERTS=false
   - Set ENABLE_DEBUG_CMD=false
   - Verify final values via GetParameter
   - Log all configuration changes

6. **Step 8: Prepare and update docs/diagnostics/PHASE5_VALIDATION.md**
   - Generate staging evidence section
   - Update docs/diagnostics/PHASE5_VALIDATION.md automatically
   - Include acceptance criteria checklist
   - Provide operator sign-off block
   - Note: PR creation should be done separately via git/GitHub

### Features

1. **Safe Feature Flag Management**
   - Enable/disable debug commands (`ENABLE_DEBUG_CMD`)
   - Enable/disable alerts (`ENABLE_ALERTS`)
   - Configure alert channels (`ALERT_CHANNEL_ID`)
   - Multiple deployment method support:
     - AWS Lambda environment variables (default)
     - AWS Systems Manager Parameter Store
     - SAM configuration file updates
     - GitHub repository variables (planned)

2. **IAM and Permission Verification**
   - Verify SSM GetParameter and PutParameter permissions
   - Verify CloudWatch Logs read access
   - Test actual parameter access before making changes
   - Report missing permissions with ARN details

3. **Validation Testing**
   - Preflight checks (AWS CLI, configurations, safety checks)
   - IAM permission verification
   - Debug command validation (`/debug-last`)
   - Alerts validation with rate-limiting
   - CloudWatch logs collection with automatic redaction

4. **Evidence Collection**
   - Structured JSON logging
   - Test result tracking with pass/fail/skip status
   - CloudWatch log aggregation with redaction
   - Validation report generation
   - Executive summary for stakeholders
   - docs/diagnostics/PHASE5_VALIDATION.md automatic updates

5. **Safety Features**
   - Production channel detection and blocking
   - Required configuration verification
   - Correlation ID tracking for test runs
   - Automatic secret redaction in all evidence
   - Abort behavior on safety violations
   - Safe default flag reversion

6. **Secret Redaction**
   - Automatic redaction of tokens, passwords, API keys
   - Shows only last 4 characters of secrets
   - Handles nested data structures (dicts, lists, tuples)
   - Supports custom secret key patterns
   - Redacts GitHub tokens (ghp_, gho_, etc.)

### Installation

No installation required. The script uses Python standard library and AWS CLI.

**Prerequisites:**
- Python 3.8+
- AWS CLI configured with appropriate permissions
- AWS Lambda functions deployed in staging

### Configuration

Generate an example configuration file:

```bash
cd orchestrator/scripts
python phase5_staging_validator.py generate-config --output staging_config.json
```

Edit `staging_config.json` with your actual values:

```json
{
  "staging_deploy_method": "aws_parameter_store",
  "aws_region": "us-west-2",
  "staging_lambda_discord": "valine-orchestrator-discord-staging",
  "staging_lambda_github": "valine-orchestrator-github-staging",
  "staging_api_endpoint": "https://api.staging.example.com",
  "ssm_parameter_prefix": "/valine/staging/",
  "sam_config_file": null,
  "sam_stack_name": null,
  "test_channel_id": "STAGING_CHANNEL_ID",
  "test_user_id": "TEST_USER_ID",
  "log_group_discord": "/aws/lambda/valine-orchestrator-discord-staging",
  "log_group_github": "/aws/lambda/valine-orchestrator-github-staging",
  "correlation_id_prefix": "STG",
  "evidence_output_dir": "./validation_evidence",
  "require_confirmation_for_production": true,
  "production_channel_patterns": ["prod", "production", "live"]
}
```

### Deployment Methods

The validator supports multiple deployment methods for managing feature flags:

#### 1. AWS Lambda Environment Variables (Default)
Direct updates to Lambda function configuration.
- **Method:** `aws_parameter_store` or `lambda`
- **Requirements:** `staging_lambda_discord` configured
- **Propagation:** ~5-10 seconds
- **Best for:** Quick testing, small deployments

#### 2. AWS Systems Manager Parameter Store
Store configuration in SSM Parameter Store.
- **Method:** `ssm_parameter_store` or `ssm`
- **Requirements:** `ssm_parameter_prefix` configured
- **Propagation:** Depends on application polling
- **Best for:** Centralized configuration, compliance requirements

#### 3. SAM Configuration File
Update samconfig.toml and trigger deployment.
- **Method:** `sam_deploy`
- **Requirements:** `sam_config_file` and `sam_stack_name` configured
- **Propagation:** Requires `sam deploy` after update
- **Best for:** Infrastructure-as-code workflows, audit trails

#### 4. GitHub Repository Variables (Planned)
Manage flags via GitHub Actions variables.
- **Method:** `github_repo_var`
- **Requirements:** `github_token` with repo scope
- **Status:** Not yet implemented

### Usage

#### Quick Start - Full Validation (Steps 3-8)

Run the complete Phase 5 staging validation workflow:

```bash
cd orchestrator/scripts

# 1. Generate configuration
python phase5_staging_validator.py generate-config --output staging_config.json

# 2. Edit staging_config.json with your values

# 3. Run full validation (Steps 3-8)
python phase5_staging_validator.py full-validation --config staging_config.json
```

This will:
- Verify IAM and SSM parameters (Step 3)
- Enable and validate /debug-last (Step 4)
- Enable and validate alerts (Step 5)
- Capture all evidence with redaction (Step 6)
- Revert flags to safe defaults (Step 7)
- Update docs/diagnostics/PHASE5_VALIDATION.md (Step 8)

#### Individual Commands

**Step 3: Verify IAM and SSM Parameters**

```bash
# Verify IAM permissions
python phase5_staging_validator.py verify-iam --config staging_config.json

# Read current SSM parameter values
python phase5_staging_validator.py read-ssm --config staging_config.json
```

**Step 4: Validate /debug-last**

```bash
# Enable debug command
python phase5_staging_validator.py enable-debug --config staging_config.json

# Validate (documents manual test procedure)
python phase5_staging_validator.py validate-debug --config staging_config.json
```

**Step 5: Enable and Validate Alerts**

```bash
# Enable alerts with staging channel
python phase5_staging_validator.py enable-alerts --config staging_config.json --channel-id STAGING_CHANNEL_ID

# Validate (documents manual test procedure)
python phase5_staging_validator.py validate-alerts --config staging_config.json
```

**Step 6: Capture Evidence**

```bash
# Collect CloudWatch logs (by correlation ID)
python phase5_staging_validator.py collect-logs --config staging_config.json

# Collect logs for specific trace ID
python phase5_staging_validator.py collect-logs --config staging_config.json --trace-id TRACE_ID
```

**Step 7: Revert Flags**

```bash
# Revert to safe defaults (ENABLE_ALERTS=false, ENABLE_DEBUG_CMD=false)
python phase5_staging_validator.py revert-flags --config staging_config.json
```

**Step 8: Update Documentation**

```bash
# Update docs/diagnostics/PHASE5_VALIDATION.md with evidence
python phase5_staging_validator.py update-docs --config staging_config.json

# Generate executive summary
python phase5_staging_validator.py generate-summary --config staging_config.json
```

**Other Commands**

```bash
# Run preflight checks only
python phase5_staging_validator.py preflight --config staging_config.json

# Disable alerts
python phase5_staging_validator.py disable-alerts --config staging_config.json
```

### Output Files

The validator generates the following files in the `evidence_output_dir` (default: `./validation_evidence/`):

- `validation_report_{CORRELATION_ID}.md` - Detailed validation report with all evidence
- `executive_summary_{CORRELATION_ID}.md` - Executive summary for stakeholders
- `phase5_evidence_section_{CORRELATION_ID}.md` - Evidence section for docs/diagnostics/PHASE5_VALIDATION.md (if auto-update fails)

The validator also updates:
- `/home/runner/work/Project-Valine/Project-Valine/docs/diagnostics/PHASE5_VALIDATION.md` - Adds staging validation evidence section

### Example Workflow

```bash
# 1. Setup
cd orchestrator/scripts
python phase5_staging_validator.py generate-config --output staging_config.json
# Edit staging_config.json with actual values

# 2. Preflight checks
python phase5_staging_validator.py preflight --config staging_config.json
python phase5_staging_validator.py verify-iam --config staging_config.json
python phase5_staging_validator.py read-ssm --config staging_config.json

# 3. Run full validation
python phase5_staging_validator.py full-validation --config staging_config.json

# 4. Review evidence
ls -la validation_evidence/
cat validation_evidence/executive_summary_*.md

# 5. Manual testing (as documented in reports)
# - Test /debug-last in Discord
# - Trigger test alert
# - Verify dedupe behavior

# 6. Commit and create PR
cd /home/runner/work/Project-Valine/Project-Valine
git checkout -b staging/phase5-validation-evidence
git add docs/diagnostics/PHASE5_VALIDATION.md orchestrator/scripts/validation_evidence/
git commit -m "docs: Add Phase 5 staging validation evidence"
git push origin staging/phase5-validation-evidence
# Create PR via GitHub UI or gh CLI
```

### Manual Testing Required

Some validation steps require manual Discord interaction:

**For /debug-last validation:**
1. Execute `/diagnose` command in staging Discord channel
2. Immediately execute `/debug-last`
3. Verify response is ephemeral (only visible to you)
4. Verify trace ID matches CloudWatch logs
5. Verify secrets are redacted (last 4 chars visible)
6. Capture screenshot or text transcript

**For alerts validation:**
1. Ensure ENABLE_ALERTS=true and ALERT_CHANNEL_ID is set
2. Trigger a controlled failure (e.g., invalid workflow dispatch)
3. Verify alert posted to staging channel
4. Verify alert format (emoji, trace_id, links)
5. Trigger same failure again within 5 minutes
6. Verify second alert is rate-limited
7. Wait 6 minutes and trigger again
8. Verify third alert posts (dedupe expired)
9. Capture screenshots of alerts

### Security and Safety

The validator includes multiple safety features:

1. **Production Channel Detection**
   - Checks channel IDs for production patterns ("prod", "production", "live")
   - Aborts if production channel detected
   - Requires explicit staging configuration

2. **Automatic Secret Redaction**
   - Redacts all tokens, passwords, API keys
   - Shows only last 4 characters
   - Applies to all evidence, logs, and reports

3. **Safe Default Flags**
   - ENABLE_ALERTS defaults to false
   - ENABLE_DEBUG_CMD defaults to false
   - Validation automatically reverts to safe defaults (Step 7)

4. **IAM Verification**
   - Tests actual permissions before making changes
   - Reports missing permissions with details
   - Prevents silent failures

5. **Correlation ID Tracking**
   - Every validation run has unique correlation ID
   - All logs and evidence include correlation ID
   - Enables tracing and auditing

### Troubleshooting

**Error: AWS CLI not found**
- Install AWS CLI: `pip install awscli` or download from AWS
- Configure credentials: `aws configure`

**Error: Permission denied (SSM/CloudWatch)**
- Verify IAM role has required permissions
- Check ARNs match your account and region
- Run `verify-iam` command to test permissions

**Error: Production channel detected**
- Verify test_channel_id is staging channel
- Check production_channel_patterns in config
- Update channel ID to non-production value

**Error: Lambda function not found**
- Verify staging_lambda_discord is correct function name
- Check AWS region matches Lambda region
- Verify function is deployed

**Manual testing steps unclear**
- See validation_report_{CORRELATION_ID}.md for detailed steps
- Check RUNBOOK.md for operational procedures
- Review docs/diagnostics/PHASE5_VALIDATION.md for examples

### Additional Resources

- **Phase 5 Validation Document:** `docs/diagnostics/PHASE5_VALIDATION.md`
- **Runbook:** `orchestrator/RUNBOOK.md`
- **Quick Start Guide:** `orchestrator/scripts/QUICKSTART.md`
- **CI/CD Workflow:** `.github/workflows/phase5-staging-validation.yml`

### Support

For issues or questions:
1. Check this README and QUICKSTART.md
2. Review validation reports in evidence_output_dir
3. Check CloudWatch logs for detailed traces
4. Open an issue on GitHub with correlation_id and evidence

---

**Last Updated:** 2025-10-17
**Version:** 2.0 (with Steps 3-8 implementation)

Run complete Phase 5 staging validation:

```bash
python phase5_staging_validator.py full-validation --config staging_config.json
```

This will:
1. Run preflight checks
2. Enable debug command
3. Validate debug command (manual)
4. Disable alerts (safety)
5. Enable alerts with staging channel
6. Validate alerts (manual)
7. Collect CloudWatch logs (with automatic redaction)
8. Generate validation report
9. Generate executive summary

#### Generate Executive Summary

Generate an executive summary for stakeholders:

```bash
python phase5_staging_validator.py generate-summary --config staging_config.json
```

The executive summary includes:
- Overall validation status (PASS/FAIL)
- Test results breakdown
- Safety check results
- Next steps and recommendations
- Links to detailed evidence

### Secret Redaction

The validator automatically redacts sensitive information in all output:

**Automatic Redaction:**
- Tokens, passwords, API keys, secrets
- Shows only last 4 characters: `"token12345678"` → `"***5678"`
- GitHub tokens: `"ghp_1234567890abcdef"` → `"ghp_***"`
- Discord channel IDs and user IDs
- Any field with "token", "secret", "password", "key" in the name

**Preserved Information:**
- Trace IDs (needed for debugging)
- Correlation IDs (needed for tracking)
- Usernames and email addresses (non-sensitive)
- Timestamps and log levels

**Example:**
```json
{
  "username": "john",
  "api_token": "secret12345678",
  "trace_id": "abc123de-456f-789g"
}
```

Becomes:
```json
{
  "username": "john",
  "api_token": "***5678",
  "trace_id": "abc123de-456f-789g"
}
```

### Validation Workflow

**Recommended workflow for Phase 5 staging validation:**

1. **Setup Configuration**
   ```bash
   python phase5_staging_validator.py generate-config --output staging_config.json
   # Edit staging_config.json with your values
   ```

2. **Run Preflight Checks**
   ```bash
   python phase5_staging_validator.py preflight --config staging_config.json
   ```

3. **Enable and Test Debug Command**
   ```bash
   # Enable debug command
   python phase5_staging_validator.py enable-debug --config staging_config.json
   
   # Wait 30 seconds for propagation
   sleep 30
   
   # Manually test in Discord:
   # 1. Execute /diagnose
   # 2. Execute /debug-last
   # 3. Verify output
   ```

4. **Enable and Test Alerts**
   ```bash
   # Enable alerts
   python phase5_staging_validator.py enable-alerts \
     --config staging_config.json \
     --channel-id STAGING_CHANNEL_ID
   
   # Wait 30 seconds for propagation
   sleep 30
   
   # Manually test:
   # 1. Trigger a controlled failure
   # 2. Verify alert posted
   # 3. Trigger same failure again
   # 4. Verify alert rate-limited
   ```

5. **Collect Evidence**
   ```bash
   # Collect logs with trace ID from manual tests
   python phase5_staging_validator.py collect-logs \
     --config staging_config.json \
     --trace-id YOUR_TRACE_ID
   ```

6. **Generate Final Report**
   ```bash
   # Full validation generates report automatically
   python phase5_staging_validator.py full-validation --config staging_config.json
   ```

7. **Review Evidence**
   - Check `validation_evidence/` directory for reports
   - Review generated markdown report
   - Update PHASE5_VALIDATION.md with findings

### Output

The validator generates:

1. **Structured JSON Logs**
   - Real-time logging to stdout
   - Correlation ID for tracking
   - Test status and details

2. **Validation Report** (`validation_evidence/validation_report_<correlation_id>.md`)
   - Test results summary
   - Configuration used
   - Evidence for each test
   - Manual testing procedures
   - Next steps

3. **Evidence Files**
   - CloudWatch logs (if collected)
   - Test artifacts
   - Screenshots (if captured)

### Safety Features

The validator includes multiple safety features:

1. **Production Channel Detection**
   - Blocks if channel ID contains "prod" or "production"
   - Prevents accidental alert storms in production

2. **Required Configuration Verification**
   - Verifies all required settings before proceeding
   - Fails fast if critical configuration missing

3. **Preflight Checks**
   - AWS CLI availability
   - Configuration completeness
   - Channel safety verification

4. **Structured Evidence**
   - All tests tracked with pass/fail/skip status
   - Evidence collected for audit trail
   - Reports saved for review

### Troubleshooting

#### AWS CLI Not Found

```bash
# Install AWS CLI
pip install awscli

# Configure credentials
aws configure
```

#### Permission Denied

```bash
# Make script executable
chmod +x phase5_staging_validator.py
```

#### Lambda Not Found

Verify Lambda function names in configuration:
```bash
aws lambda list-functions --region us-west-2 | grep valine-orchestrator
```

#### Environment Variable Update Failed

Check Lambda permissions:
```bash
aws lambda get-function-configuration \
  --function-name valine-orchestrator-discord-staging \
  --region us-west-2
```

### AWS Permissions Required

The validator requires the following AWS permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:GetFunctionConfiguration",
        "lambda:UpdateFunctionConfiguration"
      ],
      "Resource": [
        "arn:aws:lambda:*:*:function:valine-orchestrator-*-staging"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:FilterLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": [
        "arn:aws:logs:*:*:log-group:/aws/lambda/valine-orchestrator-*-staging:*"
      ]
    }
  ]
}
```

### Integration with CI/CD

The validator can be integrated into CI/CD pipelines:

```yaml
# .github/workflows/staging-validation.yml
name: Phase 5 Staging Validation

on:
  workflow_dispatch:
  schedule:
    - cron: '0 9 * * 1'  # Weekly on Mondays

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-region: us-west-2
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
      
      - name: Generate Config
        run: |
          cd orchestrator/scripts
          cat > staging_config.json <<EOF
          {
            "staging_deploy_method": "aws_parameter_store",
            "aws_region": "us-west-2",
            "staging_lambda_discord": "${{ secrets.STAGING_LAMBDA_DISCORD }}",
            "test_channel_id": "${{ secrets.STAGING_CHANNEL_ID }}",
            "log_group_discord": "/aws/lambda/valine-orchestrator-discord-staging",
            "correlation_id_prefix": "CI",
            "evidence_output_dir": "./validation_evidence"
          }
          EOF
      
      - name: Run Preflight Checks
        run: |
          cd orchestrator/scripts
          python phase5_staging_validator.py preflight --config staging_config.json
      
      - name: Enable Debug Command
        run: |
          cd orchestrator/scripts
          python phase5_staging_validator.py enable-debug --config staging_config.json
      
      - name: Upload Evidence
        uses: actions/upload-artifact@v4
        with:
          name: validation-evidence
          path: orchestrator/scripts/validation_evidence/
```

### Related Documentation

- [Phase 5 Validation](../../PHASE5_VALIDATION.md) - Complete validation documentation
- [Orchestrator README](../README.md) - Orchestrator overview and features
- [Runbook](../RUNBOOK.md) - Operational procedures and troubleshooting
- [Phase 5 QA Checker](../agent-prompts/phase5_qa_checker.md) - QA validation agent

### Support

For issues or questions:
- Review [PHASE5_VALIDATION.md](../../PHASE5_VALIDATION.md) for validation checklist
- Check [RUNBOOK.md](../RUNBOOK.md) for operational guidance
- Open an issue: https://github.com/gcolon75/Project-Valine/issues
