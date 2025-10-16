# Orchestrator Scripts

This directory contains utility scripts for managing and validating the Project Valine orchestrator.

## Phase 5 Staging Validator

### Overview

The Phase 5 Staging Validator is a comprehensive agent script that validates Phase 5 (observability + alerts) features in a staging environment, manages feature flags safely, and produces validation artifacts.

**Script:** `phase5_staging_validator.py`

**Role:** Senior SRE/Platform Engineer Agent

### Features

1. **Safe Feature Flag Management**
   - Enable/disable debug commands (`ENABLE_DEBUG_CMD`)
   - Enable/disable alerts (`ENABLE_ALERTS`)
   - Configure alert channels (`ALERT_CHANNEL_ID`)
   - Support for AWS Lambda environment variables

2. **Validation Testing**
   - Preflight checks (AWS CLI, configurations, safety checks)
   - Debug command validation (`/debug-last`)
   - Alerts validation with rate-limiting
   - CloudWatch logs collection

3. **Evidence Collection**
   - Structured JSON logging
   - Test result tracking
   - CloudWatch log aggregation
   - Validation report generation

4. **Safety Features**
   - Production channel detection and blocking
   - Required configuration verification
   - Correlation ID tracking for test runs
   - Redacted evidence in reports

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
  "test_channel_id": "STAGING_CHANNEL_ID",
  "test_user_id": "TEST_USER_ID",
  "log_group_discord": "/aws/lambda/valine-orchestrator-discord-staging",
  "log_group_github": "/aws/lambda/valine-orchestrator-github-staging",
  "correlation_id_prefix": "STG",
  "evidence_output_dir": "./validation_evidence"
}
```

### Usage

#### Show Help

```bash
python phase5_staging_validator.py --help
```

#### Run Preflight Checks

Verify AWS CLI, configurations, and safety checks before validation:

```bash
python phase5_staging_validator.py preflight --config staging_config.json
```

#### Enable Debug Command

Enable `/debug-last` command in staging:

```bash
python phase5_staging_validator.py enable-debug --config staging_config.json
```

#### Enable Alerts

Enable Discord alerts with a staging channel:

```bash
python phase5_staging_validator.py enable-alerts \
  --config staging_config.json \
  --channel-id STAGING_CHANNEL_ID
```

#### Disable Alerts

Disable alerts (safety feature):

```bash
python phase5_staging_validator.py disable-alerts --config staging_config.json
```

#### Validate Debug Command

Validate `/debug-last` command (requires manual testing):

```bash
python phase5_staging_validator.py validate-debug --config staging_config.json
```

#### Validate Alerts

Validate alert posting and rate-limiting (requires manual testing):

```bash
python phase5_staging_validator.py validate-alerts --config staging_config.json
```

#### Collect CloudWatch Logs

Collect logs from CloudWatch for analysis:

```bash
# Collect all logs for this validation run
python phase5_staging_validator.py collect-logs --config staging_config.json

# Collect logs for a specific trace ID
python phase5_staging_validator.py collect-logs \
  --config staging_config.json \
  --trace-id abc123de-456f-789g
```

#### Run Full Validation

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
7. Collect CloudWatch logs
8. Generate validation report

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
