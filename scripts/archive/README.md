# Scripts Archive

This directory contains scripts that are no longer actively used but preserved for reference.

## Archived Scripts

### Deployment Scripts
- `deploy-backend.ps1` / `deploy-backend.sh` - Superseded by automated deployment
- `deploy-static-with-mime.ps1` / `deploy-static-with-mime.sh` - Superseded by automated deployment
- `verify-deployment-example.sh` - Example script, not actively used

### One-Time Setup Scripts
- `cloudfront-associate-spa-function.ps1` - One-time CloudFront setup
- `put-ssm-params.sh` - One-time parameter store setup
- `patch-allowlist-env.ps1` - Migration script
- `patch-legacy-passwords.mjs` - Migration script

### Old Testing/Validation Scripts
- `test-account-creation.mjs` - Superseded by current test suite
- `test-observability-v2.sh` - Experimental test
- `strict-allowlist-check.js` - Superseded by validate-allowlist.js
- `audit-allowlist.ps1` - Superseded by current audit scripts
- `verify-spa-rewrite.js` - Validation complete, no longer needed

### Configuration Scripts
- `waf-attach-plan.ps1` - One-time WAF setup
- `csp-rollout-config.js` - CSP configuration helper
- `start-dev.ps1` - Old dev startup script

### Versioned/Duplicate Scripts
- `check-seo-flag_Version5.mjs` - Versioned script (active version in parent)
- `scripts_retention-sanity-check_Version3.js` - Versioned script

### Orchestration Scripts (Moved)
- `analyze-orchestration-run.mjs` - Functionality moved to orchestrator/
- `who-is-my-app.mjs` - Functionality moved to orchestrator/

### Experimental Scripts
- `wire-original-router.mjs` - Experimental routing script

## Active Scripts

For currently active scripts, see the parent `/scripts/` directory:

### Core Utilities (DO NOT ARCHIVE)
- `admin-set-password.mjs` - Admin password management ✅
- `secret-audit.mjs` - Security audit tool ✅
- `verify-env-contract.mjs` - Environment validation ✅

### Build & Deployment
- `prebuild.js` - Build preparation
- `postbuild-validate.js` - Build validation
- `deploy-frontend.js` - Frontend deployment

### Testing & Validation
- `verify-sri.js` - SRI validation
- `verify-white-screen-fix.js` - White screen validation
- `validate-api-base.js` - API validation
- `validate-allowlist.js` - Allowlist validation

### Diagnostics
- `diagnose-white-screen.js` - White screen diagnostics
- `check-auth-backend.js` - Auth diagnostics
- `check-cloudfront.js` - CloudFront diagnostics

## Usage Notes

⚠️ **These archived scripts should not be used in production or development.**

They are preserved for:
1. Historical reference
2. Understanding previous implementations
3. Recovery in case specific functionality is needed again

## Archive Date

Scripts archived: 2025-11-20

## Related Documentation

- [WORKING_STATE_SUMMARY.md](../../WORKING_STATE_SUMMARY.md) - Current working state
- [README.md](../../README.md) - Main documentation
