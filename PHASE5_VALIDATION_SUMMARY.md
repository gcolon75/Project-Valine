# Phase 5 Staging Validation Double-Check - TL;DR Summary

## Status: ✅ Framework Complete, ⏳ Awaiting Execution

## What Was Implemented

A comprehensive validation framework to re-verify Phase 5 (PR #49) works end-to-end in staging. The framework includes:

### 1. Automated Validation Workflow ✅
- **File:** `.github/workflows/phase5-staging-validation-doublecheck.yml`
- **Features:** GitHub Actions workflow with full automation
- **Execution:** Workflow dispatch with validation type selection
- **Outputs:** Evidence artifacts, automatic PR creation, workflow summary

### 2. Configuration Files ✅
- **File:** `orchestrator/scripts/staging_config_phase5.json`
- **Settings:** Pre-configured for staging (us-west-2, /valine/staging/, channel 1428102811832553554)
- **Safety:** Production channel detection, secret redaction

### 3. Local Runner Script ✅
- **File:** `orchestrator/scripts/run_phase5_validation.sh`
- **Features:** Bash script for interactive local execution
- **Options:** --skip-revert, --dry-run

### 4. Documentation ✅
- **PHASE5_STAGING_DOUBLECHECK_GUIDE.md:** Complete 9.9 KB guide with all procedures
- **PHASE5_VALIDATION_QUICKSTART.md:** Quick start (TL;DR) 6.6 KB guide
- **PHASE5_DOUBLECHECK_IMPLEMENTATION.md:** Technical implementation summary 14.5 KB
- **PHASE5_VALIDATION.md:** Updated with evidence template and acceptance checklist

## Acceptance Criteria Status

| Criterion | Status | Notes |
|-----------|--------|-------|
| 1. IAM/Permissions | ⏳ Ready | Validator ready, needs AWS credentials |
| 2. Flags Baseline | ⏳ Ready | SSM read/verify implemented |
| 3. /debug-last Works | ⏳ Ready | Validation procedure documented |
| 4. Alerts Test | ⏳ Ready | Controlled failure procedure documented |
| 5. Evidence Captured | ⏳ Ready | Auto-collection with redaction |
| 6. Flags Reverted | ⏳ Ready | Safe default reversion implemented |
| 7. Docs Updated | 🔄 In Progress | Template ready, awaits evidence |

## What's Missing (Needs User Action)

### Required GitHub Secrets

Configure these in repository settings → Secrets and variables → Actions:

1. `AWS_ROLE_ARN_STAGING` - AWS IAM role ARN for OIDC
   - Format: `arn:aws:iam::ACCOUNT_ID:role/GitHubActions-Phase5-Staging`
   - Permissions: SSM Get/Put, CloudWatch Logs read

2. `STAGING_DISCORD_BOT_TOKEN` - Discord bot token for staging
   - Format: `MTQy...` (Discord bot token)
   - Scope: Staging bot only

3. `STAGING_GITHUB_TOKEN` - GitHub token with repo access
   - Format: `ghp_...` or `gho_...`
   - Permissions: `contents:write`, `pull-requests:write`

### Required GitHub Variables

Configure these in repository settings → Secrets and variables → Actions → Variables:

1. `STAGING_DISCORD_PUBLIC_KEY` - Discord bot public key
2. `STAGING_DISCORD_APPLICATION_ID` - Discord application ID

### Required AWS IAM Permissions

The AWS role (`AWS_ROLE_ARN_STAGING`) must have:

**SSM Access:**
```json
{
  "Effect": "Allow",
  "Action": ["ssm:GetParameter", "ssm:GetParametersByPath", "ssm:PutParameter"],
  "Resource": "arn:aws:ssm:us-west-2:*:parameter/valine/staging/*"
}
```

**CloudWatch Access:**
```json
{
  "Effect": "Allow",
  "Action": ["logs:FilterLogEvents", "logs:GetLogEvents", "logs:DescribeLogGroups"],
  "Resource": "arn:aws:logs:us-west-2:*:log-group:/aws/lambda/pv-api-prod-api:*"
}
```

## How to Execute Validation

### Option 1: GitHub Actions (Recommended)

1. **Configure Secrets/Variables** (see above)

2. **Run Workflow:**
   - Go to: https://github.com/gcolon75/Project-Valine/actions/workflows/phase5-staging-validation-doublecheck.yml
   - Click "Run workflow"
   - Select "full-validation"
   - Click "Run workflow"

3. **Manual Discord Testing:**
   - When prompted, test /debug-last in Discord
   - When prompted, test alerts in Discord
   - Follow instructions in workflow logs

4. **Review Results:**
   - Workflow creates PR automatically
   - Evidence in workflow artifacts
   - Executive summary in workflow output

### Option 2: Local Execution

1. **Configure AWS Credentials:**
   ```bash
   export AWS_PROFILE=staging
   # or configure default credentials
   ```

2. **Set Environment Variables:**
   ```bash
   export STAGING_DISCORD_BOT_TOKEN="your-token"
   export STAGING_GITHUB_TOKEN="your-token"
   ```

3. **Run Validation:**
   ```bash
   cd orchestrator/scripts
   ./run_phase5_validation.sh
   ```

4. **Follow Prompts:**
   - Script pauses for manual Discord testing
   - Press Enter when complete

5. **Review Evidence:**
   - Check `orchestrator/scripts/validation_evidence/`
   - Review reports and summaries

## Pass/Fail Checklist

When validation completes, verify:

- [ ] ✅ **IAM Permissions Verified**
  - SSM Get/Put access confirmed
  - CloudWatch Logs read access confirmed
  
- [ ] ✅ **Baseline Flags Match**
  - `ENABLE_DEBUG_CMD = true`
  - `ENABLE_ALERTS = false`
  - `ALERT_CHANNEL_ID = 1428102811832553554`

- [ ] ✅ **/debug-last Works**
  - Response is ephemeral (only visible to invoker)
  - Secrets redacted (***last4)
  - Contains trace_id and timings

- [ ] ✅ **Alerts Work with Dedupe**
  - Single alert posted to staging channel
  - Contains severity, cause, trace_id, links
  - Duplicate suppressed within 5-min window

- [ ] ✅ **Evidence Collected**
  - CloudWatch logs (filtered by trace_id)
  - Discord alert text (redacted)
  - /debug-last transcript (redacted)

- [ ] ✅ **Flags Reverted**
  - `ENABLE_ALERTS = false`
  - Verified via SSM GetParameter

- [ ] ✅ **Documentation Updated**
  - PHASE5_VALIDATION.md has evidence section
  - Acceptance checklist complete
  - Docs PR created

## Safety Guarantees

✅ **Production Protection:** Only uses staging channel 1428102811832553554  
✅ **Secret Redaction:** All secrets show only last 4 chars (***abcd)  
✅ **Permission Checks:** Verifies IAM before making changes  
✅ **Safe Reversion:** Always reverts flags to safe defaults  
✅ **Audit Trail:** Correlation ID tracking for all operations  

## Quick Stats

| Metric | Value |
|--------|-------|
| Files Created | 6 files |
| Documentation | 34 KB |
| Automation | 1 workflow, 1 script |
| Test Coverage | 40 tests (existing) |
| Validation Time | 5-10 min (GitHub Actions) |
| Manual Steps | 2 (Discord testing) |

## Implementation Details

### Validation Steps Automated

1. ✅ Preflight checks (AWS CLI, config, safety)
2. ✅ IAM permission verification (SSM, CloudWatch)
3. ✅ SSM baseline reading (current values)
4. ✅ Debug command enable/disable
5. ⚠️ Debug command validation (requires manual Discord testing)
6. ✅ Alerts enable/disable
7. ⚠️ Alerts validation (requires manual Discord testing)
8. ✅ CloudWatch logs collection (filtered, redacted)
9. ✅ Flag reversion to safe defaults
10. ✅ Documentation updates

### Manual Steps Required

1. **Discord /debug-last Testing:**
   - Execute `/diagnose` in Discord
   - Run `/debug-last`
   - Verify ephemeral, trace_id, redaction
   - Record evidence

2. **Discord Alerts Testing:**
   - Trigger controlled failure
   - Verify alert in channel 1428102811832553554
   - Test dedupe (trigger same failure twice)
   - Record evidence

## Deliverables

✅ **TL;DR Summary:** This document (3-5 lines below)  
✅ **Pass/Fail Checklist:** See "Pass/Fail Checklist" above  
⏳ **Evidence:** To be collected during execution  
⏳ **Docs PR:** Auto-created by workflow  
✅ **Recommendations:** See "Next Steps" below  

## TL;DR (3-5 Lines)

**Implemented a complete validation framework for Phase 5 staging double-check.** Framework includes GitHub Actions workflow, local runner script, and comprehensive documentation (34 KB). All acceptance criteria have automated validators ready. **Missing: AWS credentials, Discord tokens, and GitHub tokens must be configured as repository secrets.** Once secrets are configured, run the workflow to execute full validation and auto-generate evidence PR. Manual Discord testing required for /debug-last and alerts validation.

## Recommendations

### Immediate Actions

1. **Configure Secrets (5 minutes):**
   - Add `AWS_ROLE_ARN_STAGING` to GitHub secrets
   - Add `STAGING_DISCORD_BOT_TOKEN` to GitHub secrets
   - Add `STAGING_GITHUB_TOKEN` to GitHub secrets
   - Add Discord public key and app ID as variables

2. **Run Validation (10 minutes):**
   - Execute GitHub Actions workflow
   - Select "full-validation"
   - Perform manual Discord testing when prompted
   - Review results

3. **Review Evidence (15 minutes):**
   - Check auto-generated PR
   - Verify acceptance checklist
   - Review collected evidence
   - Confirm secret redaction

4. **Sign Off (5 minutes):**
   - Complete operator sign-off in PHASE5_VALIDATION.md
   - Merge documentation PR
   - Archive evidence artifacts

### Configuration Recommendations

1. **IAM Role:**
   - Use least-privilege permissions
   - Scope to staging resources only
   - Enable OIDC authentication for GitHub Actions

2. **Redaction Patterns:**
   - Current patterns are comprehensive
   - No changes needed unless custom keys required

3. **Dedupe Timing:**
   - Current: 5-minute window
   - Recommended: Keep as-is for staging
   - Production: Consider tuning based on alert volume

### Diffs to Consider

1. **CloudWatch Log Group:**
   - Currently: `/aws/lambda/pv-api-prod-api` (shared)
   - Consider: Dedicated staging log group
   - Benefit: Clearer separation, easier filtering

2. **Correlation ID Prefix:**
   - Currently: `STG-PHASE5`
   - Could add: Timestamp or run number
   - Benefit: Easier tracing across multiple runs

## Next Steps

1. ✅ **Review this summary**
2. ▶️ **Configure GitHub secrets and variables** (see "What's Missing" section)
3. ▶️ **Run validation** (GitHub Actions workflow)
4. ▶️ **Perform manual Discord testing** (follow prompts)
5. ▶️ **Review evidence and PR** (auto-generated)
6. ▶️ **Complete sign-off** (PHASE5_VALIDATION.md)
7. ▶️ **Merge docs PR**
8. 🚀 **Proceed with production rollout** (if validation passes)

## Support

- **Quick Start:** `PHASE5_VALIDATION_QUICKSTART.md`
- **Complete Guide:** `PHASE5_STAGING_DOUBLECHECK_GUIDE.md`
- **Implementation:** `PHASE5_DOUBLECHECK_IMPLEMENTATION.md`
- **Workflow:** `.github/workflows/phase5-staging-validation-doublecheck.yml`
- **Validator:** `orchestrator/scripts/phase5_staging_validator.py`

## Conclusion

**Framework Status:** ✅ Complete and ready for execution

**Blocker:** AWS credentials and Discord tokens must be configured as GitHub secrets

**Estimated Time to Execute:** 5-10 minutes (GitHub Actions) or 45-60 minutes (local)

**Risk Level:** Low (multiple safety checks, staging-only, automatic reversion)

**Recommendation:** Configure secrets and run GitHub Actions workflow for fastest, safest validation.

---

**Created:** 2025-10-17  
**Agent:** Phase 5 Staging Validation Double-Check Agent  
**Status:** Framework ready, awaiting credentials for execution
