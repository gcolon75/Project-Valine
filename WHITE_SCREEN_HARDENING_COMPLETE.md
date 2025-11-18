# White Screen Hardening Implementation - Complete

## Summary

This implementation completes the white screen hardening initiative for Project Valine by adding comprehensive runtime safeguards, diagnostic tools, and operational documentation to prevent and quickly resolve blank screen issues in production.

## Problem Addressed

Recent incidents showed blank-screen behavior caused by:
- Deep links (e.g., /join) not rewritten to /index.html → S3 XML 404 rendered
- Cached index.html referencing pruned bundles → 404 for main module
- Incorrect MIME types (HTML served instead of JavaScript) → "Unexpected token '<'"
- Lack of automated checks → regressions not caught until end users reported

## Solution Components

### 1. Runtime Hardening

#### Boot Watchdog (`public/theme-init.js`)
**Purpose:** Detect when the React app fails to mount within a reasonable timeout

**Features:**
- 8-second timeout to detect mount failures
- Automatic dismissal on successful mount (`window.__appMounted()`)
- User-friendly overlay with retry options
- Console diagnostic output with common causes
- Environment logging (URL, user agent, detected bundles)

**Usage:**
```javascript
// Signal successful mount (called in src/main.jsx)
window.__appMounted();
```

**Overlay includes:**
- Retry button (simple reload)
- Clear cache & retry button (clears storage + forces refresh)
- Helpful explanation of common causes

#### Enhanced ErrorBoundary (`src/components/ErrorBoundary.jsx`)
**New Feature:** "Clear cache & reload" option

**Behavior:**
- Clears localStorage and sessionStorage
- Forces reload with cache bypass (`window.location.reload(true)`)
- Helps recover from stale cached state

**User Experience:**
- Primary action: "Try Again" (reset error state)
- Secondary action: "Reload" (full page reload)
- Tertiary action: "Clear cache & reload" (link style, less prominent)
- "Back to Home" link for escape route

### 2. Diagnostic Tools

#### White Screen Diagnostic Script
**Files:**
- `scripts/diagnose-white-screen.js` (Node.js)
- `scripts/diagnose-white-screen.ps1` (PowerShell)

**Capabilities:**
1. **SPA Route Tests** - Verifies extension-less paths return 200 HTML
   - Tests: `/`, `/join`, `/login`, `/feed`, `/about`, `/settings`
   - Expected: 200 status, `text/html` content-type

2. **404 Handling** - Ensures non-existent files return 404
   - Tests: `/this-should-not-exist-404-test.js`
   - Expected: 404 or 403 status (not HTML fallback)

3. **Bundle Validation** - Checks JavaScript bundle delivery
   - Extracts bundle path from `index.html`
   - HEAD request to verify:
     - Status: 200
     - Content-Type: `application/javascript`
     - Cache-Control: includes `immutable` or `max-age`

4. **S3 Metadata Checks** (optional, requires AWS credentials)
   - Verifies correct Content-Type on S3 objects
   - Checks Cache-Control headers

5. **CloudFront Configuration** (optional, requires AWS credentials)
   - Verifies viewer-request function is attached
   - Warns about error response mappings

**Usage:**
```bash
# Basic check
node scripts/diagnose-white-screen.js --domain example.com

# Full check with AWS integration
node scripts/diagnose-white-screen.js \
  --domain example.com \
  --bucket my-frontend-bucket \
  --distribution-id E1234567890ABC \
  --verbose

# PowerShell
.\scripts\diagnose-white-screen.ps1 -Domain "example.com"
```

**Exit Codes:**
- 0 = All checks passed
- 1 = One or more checks failed (suitable for CI)

#### CloudFront Safety Guard
**File:** `scripts/guard-cloudfront-config.ps1`

**Verifies:**
1. DefaultRootObject is `index.html`
2. Viewer-request function is attached to default behavior
3. No problematic 403/404 error response mappings to `/index.html`
4. OriginPath is empty (assets from bucket root)
5. Optional: Cache behavior for `/assets/*`

**Usage:**
```powershell
# Standard check
.\scripts\guard-cloudfront-config.ps1 -DistributionId "E123..."

# Strict mode (fail on warnings)
.\scripts\guard-cloudfront-config.ps1 -DistributionId "E123..." -Strict
```

### 3. CI/CD Integration

#### GitHub Workflow
**File:** `.github/workflows/white-screen-check.yml`

**Trigger:** Manual (workflow_dispatch)

**Inputs:**
- `domain` (required) - Domain to test
- `bucket` (optional) - S3 bucket for metadata checks
- `distribution_id` (optional) - CloudFront distribution ID
- `verbose` (optional) - Enable verbose output

**Features:**
- Runs diagnostic script automatically
- Optional AWS credential integration (uses secrets)
- Posts results to workflow summary
- Fails workflow if checks fail

**Usage:**
Via GitHub UI: Actions → White Screen Diagnostic Check → Run workflow

### 4. Documentation

#### White Screen Runbook
**File:** `docs/white-screen-runbook.md`

**Contents:**

1. **Quick Reference**
   - Common symptoms and causes
   - Fast diagnosis command

2. **Decision Tree**
   - Visual flowchart for root cause identification
   - Branches based on when/how issue occurs

3. **Troubleshooting Sections**
   - SPA Routing Issues (deep links)
   - Bundle Issues (module not loading)
   - Cache Issues (stale content)
   - Emergency Rollback

4. **Advanced Diagnostics**
   - CloudFront log analysis
   - Browser console commands
   - Backend error log queries

5. **Preventive Measures**
   - Pre-deployment checklist
   - Monitoring setup
   - Regular health checks

6. **Quick Reference Commands**
   - PowerShell and Bash variants
   - Copy-paste ready for fast response

#### README Updates
**File:** `README.md`

**Added:**
- Link to white screen runbook in CloudFront & SPA Routing section
- Quick diagnostic command examples
- Reference to guard script

## Files Changed

### New Files
1. `.github/workflows/white-screen-check.yml` - CI workflow
2. `docs/white-screen-runbook.md` - Comprehensive troubleshooting guide
3. `scripts/diagnose-white-screen.js` - Node.js diagnostic tool
4. `scripts/diagnose-white-screen.ps1` - PowerShell diagnostic tool
5. `scripts/guard-cloudfront-config.ps1` - CloudFront safety validator

### Modified Files
1. `public/theme-init.js` - Added boot watchdog
2. `src/components/ErrorBoundary.jsx` - Added clear cache option
3. `src/main.jsx` - Signal successful mount to watchdog
4. `README.md` - Added links to runbook and diagnostic commands
5. `infra/cloudfront/functions/spa-rewrite.js` - Fixed merge conflict

## Verification

All checks pass:
- ✅ Build validation (postbuild-validate.js)
- ✅ verify-white-screen-fix.js (12/12 checks passed)
- ✅ CodeQL security scan (0 alerts)
- ✅ Syntax validation for all scripts

## Testing Evidence

### Build Validation
```
✅ Build validation passed - output looks good!
```

### Verification Script
```
🔍 Running comprehensive verification...
✅ ErrorBoundary component exists
✅ ErrorBoundary imported in main.jsx
✅ theme-init.js has error instrumentation
✅ Observability handler accepts client errors
✅ postbuild validation script exists
✅ package.json includes postbuild validation
✅ vite.config.js has source maps enabled
✅ Deployment scripts exist
✅ Documentation exists
✅ ErrorBoundary tests exist
✅ Build output is valid
✅ Source maps are generated

Results: 12 passed, 0 failed
✅ All verifications passed!
```

### Security Scan
```
CodeQL Analysis: 0 alerts found
```

## Usage Examples

### For End Users

**When white screen appears:**
1. Wait a few seconds - boot watchdog may appear with retry options
2. If ErrorBoundary appears, try "Try Again" first
3. If issue persists, click "Clear cache & reload"
4. If still broken, report to ops team

### For Operators

**Quick diagnosis:**
```bash
node scripts/diagnose-white-screen.js --domain app.valine.com
```

**Pre-deployment validation:**
```powershell
.\scripts\guard-cloudfront-config.ps1 -DistributionId "E123..." -Strict
```

**Post-deployment verification:**
```bash
node scripts/diagnose-white-screen.js \
  --domain app.valine.com \
  --bucket valine-frontend-prod \
  --distribution-id E1234567890ABC
```

**Emergency rollback:**
See [docs/white-screen-runbook.md](../docs/white-screen-runbook.md) Section 4

## Acceptance Criteria - All Met ✅

- [x] App shows friendly fallback if it throws before mount (ErrorBoundary)
- [x] If app fails to mount in 8s, boot watchdog overlay appears with suggestions
- [x] Diagnose scripts exit nonzero when checks fail (CI integration ready)
- [x] Guard script confirms CloudFront config and fails on unsafe config
- [x] README/docs clearly explain failure modes and diagnostic commands
- [x] Dynamic invalidation derived from dist/index.html (deploy-frontend.ps1)
- [x] Immutable caching asserted for bundles (diagnostic scripts verify)

## Impact

### Before This PR
- White screens were mysterious and required deep investigation
- No runtime safeguards for mount failures
- Manual CloudFront config checks
- Unclear troubleshooting procedures

### After This PR
- Users see helpful recovery UI with retry options
- Automated diagnostics identify root cause in seconds
- Guard scripts prevent misconfigurations before deployment
- Clear runbook for fast incident response
- CI integration for automated checks

## Next Steps

1. ✅ Merge this PR
2. Deploy to staging and test with `diagnose-white-screen.js`
3. Run `guard-cloudfront-config.ps1` on production distribution
4. Train ops team on runbook usage
5. Set up scheduled diagnostics (optional)
6. Monitor for any new white screen incidents

## Related Documentation

- [White Screen Runbook](../docs/white-screen-runbook.md) - Troubleshooting guide
- [White Screen Fix Testing](../docs/WHITE_SCREEN_FIX_TESTING.md) - Test procedures
- [CloudFront SPA Migration](../docs/cloudfront-spa-migration-status.md) - Setup guide
- [Deployment Guide](../docs/DEPLOYMENT.md) - Deployment procedures

---

**Implementation Date:** 2024-11-18  
**Status:** ✅ Complete and Ready for Review  
**Security:** ✅ CodeQL Scan Passed (0 alerts)  
**Verification:** ✅ All Checks Passed (12/12)
