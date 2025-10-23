# Phase 5 Staging Validation Double-Check - README

## Quick Links

- **Quick Start:** [PHASE5_VALIDATION_QUICKSTART.md](PHASE5_VALIDATION_QUICKSTART.md)
- **Complete Guide:** [PHASE5_STAGING_DOUBLECHECK_GUIDE.md](PHASE5_STAGING_DOUBLECHECK_GUIDE.md)
- **Implementation:** [PHASE5_DOUBLECHECK_IMPLEMENTATION.md](PHASE5_DOUBLECHECK_IMPLEMENTATION.md)
- **TL;DR Summary:** [PHASE5_VALIDATION_SUMMARY.md](PHASE5_VALIDATION_SUMMARY.md)
- **Evidence Template:** [PHASE5_VALIDATION.md](PHASE5_VALIDATION.md#phase-5-staging-validation-double-check-post-pr-49)

## What This Is

A comprehensive validation framework to confirm PR #49 (Phase 5 Staging Validation Runner) works end-to-end in staging. This implements the requirements from the problem statement as the **Phase 5 Staging Validation Double-Check Agent**.

## Status

✅ **Framework:** Complete and ready  
⏳ **Execution:** Requires AWS credentials and Discord tokens  
📊 **Evidence:** Template ready, awaiting collection  

## What You Get

1. **GitHub Actions Workflow** - Fully automated validation with one click
2. **Local Runner Script** - Interactive validation for debugging
3. **Staging Configuration** - Pre-configured for safe staging-only testing
4. **Documentation Suite** - 34 KB of comprehensive guides and templates
5. **Evidence Collection** - Automatic redaction and artifact upload
6. **Acceptance Checklist** - Complete validation criteria tracking

## How to Use

### For First-Time Execution

1. **Read the Quick Start:**
   ```bash
   cat PHASE5_VALIDATION_QUICKSTART.md
   ```

2. **Configure GitHub Secrets:**
   - `AWS_ROLE_ARN_STAGING`
   - `STAGING_DISCORD_BOT_TOKEN`
   - `STAGING_GITHUB_TOKEN`
   - `STAGING_DISCORD_PUBLIC_KEY` (variable)
   - `STAGING_DISCORD_APPLICATION_ID` (variable)

3. **Run the Workflow:**
   - Go to: Actions → Phase 5 Staging Validation Double-Check
   - Click "Run workflow"
   - Select "full-validation"
   - Follow prompts for manual Discord testing

4. **Review Results:**
   - Check auto-created PR
   - Download evidence artifacts
   - Complete acceptance checklist

### For Detailed Understanding

Read these documents in order:

1. `PHASE5_VALIDATION_QUICKSTART.md` - Get started (5 min read)
2. `PHASE5_STAGING_DOUBLECHECK_GUIDE.md` - Complete procedures (20 min read)
3. `PHASE5_DOUBLECHECK_IMPLEMENTATION.md` - Technical details (15 min read)
4. `PHASE5_VALIDATION_SUMMARY.md` - Executive summary (5 min read)

## Files Created

```
.github/workflows/
  └── phase5-staging-validation-doublecheck.yml  # GitHub Actions workflow

orchestrator/scripts/
  ├── staging_config_phase5.json                 # Staging configuration
  └── run_phase5_validation.sh                   # Local runner script

Documentation:
  ├── PHASE5_STAGING_DOUBLECHECK_GUIDE.md        # Complete guide (9.9 KB)
  ├── PHASE5_VALIDATION_QUICKSTART.md            # Quick start (6.6 KB)
  ├── PHASE5_DOUBLECHECK_IMPLEMENTATION.md       # Implementation (14.5 KB)
  ├── PHASE5_VALIDATION_SUMMARY.md               # TL;DR summary (10.8 KB)
  └── PHASE5_VALIDATION.md                       # Updated with evidence template
```

## Acceptance Criteria

From the problem statement, this framework validates:

- ✅ **1. IAM/Permissions:** Can Get/Put SSM, read CloudWatch Logs
- ✅ **2. Flags Baseline:** ENABLE_DEBUG_CMD=true, ENABLE_ALERTS=false, ALERT_CHANNEL_ID=1428102811832553554
- ✅ **3. /debug-last:** Ephemeral response with secret redaction
- ✅ **4. Alerts:** Single alert with dedupe working
- ✅ **5. Evidence:** CloudWatch logs, alert text, debug transcript (all redacted)
- ✅ **6. Flags Reverted:** ENABLE_ALERTS=false after testing
- ✅ **7. Documentation:** PHASE5_VALIDATION.md updated, PR created

## Safety Features

🛡️ **Production Protection** - Only uses staging channel 1428102811832553554  
🔒 **Secret Redaction** - All secrets show only ***last4  
⚠️ **Permission Checks** - Verifies IAM before changes  
♻️ **Safe Reversion** - Always reverts to safe defaults  
📋 **Audit Trail** - Correlation ID for all operations  

## What's Different from PR #49

PR #49 created the `phase5_staging_validator.py` script. This implementation:

1. **Adds GitHub Actions automation** - One-click validation
2. **Adds local runner script** - Interactive execution
3. **Adds staging configuration** - Pre-configured for the problem statement
4. **Adds documentation suite** - Complete guides for execution
5. **Adds evidence templates** - Ready for actual validation data
6. **Updates PHASE5_VALIDATION.md** - Acceptance checklist and sign-off

## Prerequisites

### Minimum Requirements

- AWS credentials with SSM and CloudWatch permissions
- Discord bot token for staging environment
- GitHub token with repo access
- Python 3.8+ (for local execution)
- AWS CLI v2 (for local execution)

### Recommended Setup

- Use GitHub Actions (no local setup needed)
- Configure secrets in repository settings
- Review documentation before first run
- Have Discord app open for manual testing

## Common Questions

**Q: Can I run this without AWS credentials?**  
A: No, validation requires actual AWS access to test SSM and CloudWatch.

**Q: Will this affect production?**  
A: No, multiple safety checks ensure staging-only operation.

**Q: How long does validation take?**  
A: 5-10 minutes via GitHub Actions, 45-60 minutes locally.

**Q: What if validation fails?**  
A: Flags are automatically reverted to safe defaults. Review evidence to identify issues.

**Q: Can I run individual steps?**  
A: Yes, the workflow supports running individual validation steps.

## Troubleshooting

### "Unable to locate credentials"
**Solution:** Configure AWS_PROFILE or set up OIDC for GitHub Actions

### "AccessDeniedException"
**Solution:** Verify IAM role has SSM Get/Put and CloudWatch Logs permissions

### "Production channel detected"
**Solution:** Ensure ALERT_CHANNEL_ID is 1428102811832553554 (staging)

### "401 Unauthorized" (Discord)
**Solution:** Verify STAGING_DISCORD_BOT_TOKEN is valid and not expired

## Support

If you need help:

1. **Check documentation:** Start with PHASE5_VALIDATION_QUICKSTART.md
2. **Review workflow logs:** Check GitHub Actions for detailed output
3. **Run preflight:** Use `preflight` validation type to check setup
4. **Check configuration:** Verify staging_config_phase5.json

## Success Criteria

Validation is successful when:

- ✅ All acceptance criteria checkboxes are marked
- ✅ Evidence is collected with proper redaction
- ✅ Flags are reverted to safe defaults
- ✅ Documentation PR is created
- ✅ No errors in workflow logs

## Next Actions

**For Repository Maintainer:**

1. Configure GitHub secrets and variables
2. Run GitHub Actions workflow (full-validation)
3. Perform manual Discord testing when prompted
4. Review and approve auto-generated PR
5. Sign off on validation in PHASE5_VALIDATION.md

**For Validation Operator:**

1. Read PHASE5_VALIDATION_QUICKSTART.md
2. Ensure AWS credentials are configured
3. Execute validation workflow
4. Collect and review evidence
5. Complete acceptance checklist

## Links

- **PR #49:** https://github.com/gcolon75/Project-Valine/pull/49
- **Validator Script:** orchestrator/scripts/phase5_staging_validator.py
- **Test Suite:** orchestrator/tests/test_phase5_staging_validator.py
- **Workflow:** .github/workflows/phase5-staging-validation-doublecheck.yml

## License

This validation framework is part of Project Valine and follows the same license as the repository.

---

**Version:** 1.0  
**Created:** 2025-10-17  
**Status:** Ready for execution  
**Agent:** Phase 5 Staging Validation Double-Check Agent
