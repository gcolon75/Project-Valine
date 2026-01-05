> **ARCHIVED:** 2026-01-05
> **Reason:** Consolidated into canonical documentation
> **See:** [Documentation Index](../README.md) for current docs

---
# API Base Validation Guide

**Document Version:** 1.0  
**Last Updated:** 2025-11-19

## Overview

This guide explains how the API base URL is configured, validated, and enforced in the Project Valine application. It provides tools and procedures to prevent deployment of incorrect API configurations and diagnose issues when they occur.

## Table of Contents

1. [How API Base is Defined](#how-api-base-is-defined)
2. [Build-Time Validation](#build-time-validation)
3. [Runtime Safeguards](#runtime-safeguards)
4. [Validation Scripts](#validation-scripts)
5. [Recovery Steps](#recovery-steps)
6. [CI/CD Integration](#cicd-integration)
7. [Troubleshooting](#troubleshooting)

## How API Base is Defined

The API base URL is configured through the `VITE_API_BASE` environment variable, which is used by Vite at build time.

### Configuration Hierarchy

1. **Environment Variable**: `VITE_API_BASE` (highest priority)
2. **`.env.production`**: For production builds
3. **`.env.local`**: For local development (git-ignored)
4. **Fallback**: `http://localhost:4000` (development only)

### Current Production Configuration

```powershell
# .env.production
VITE_API_BASE=https://wkndtj22ab.execute-api.us-west-2.amazonaws.com
```

### Known Deprecated Hosts

The following hosts are **deprecated** and must not be used:

- `https://fb9pxd6m09.execute-api.us-west-2.amazonaws.com`
- `fb9pxd6m09.execute-api.us-west-2.amazonaws.com`

## Build-Time Validation

The build process includes automated validation via `scripts/prebuild.js`, which runs before every build.

### Validation Steps

1. **Dev Bypass Check**: Ensures dev bypass is not enabled in production
2. **API Base Validation**: Calls `scripts/validate-api-base.js` to:
   - Verify `VITE_API_BASE` is set
   - Extract and validate hostname format
   - Perform DNS resolution check
   - Optionally cross-check with expected API Gateway ID

### Running Validation Manually

```powershell
# Validate API base configuration
node scripts/validate-api-base.js

# With environment variable override
VITE_API_BASE=https://your-api.execute-api.us-west-2.amazonaws.com \
  node scripts/validate-api-base.js

# Allow DNS failure (NOT RECOMMENDED for production)
ALLOW_API_BASE_DNS_FAILURE=true node scripts/validate-api-base.js
```

### Override Flags

#### `ALLOW_API_BASE_DNS_FAILURE`

Set to `true` to bypass DNS resolution failure. Use only when:
- Testing in restricted network environments
- The API host is known to be valid but temporarily unreachable
- Local development with custom DNS configuration

**Warning:** Bypassing DNS validation can result in deploying a non-functional application.

#### `STACK_API_ID`

Set to your expected API Gateway ID (e.g., `wkndtj22ab`) for additional validation:

```powershell
STACK_API_ID=wkndtj22ab node scripts/validate-api-base.js
```

The script will verify that the configured host matches the expected API ID.

## Runtime Safeguards

### Frontend Debug Mode

When `VITE_DEBUG_API=true` or in development mode, the API client (`src/services/api.js`) performs additional validation:

1. Logs the API base URL on initialization
2. Checks against known deprecated hosts
3. Emits console error if a deprecated host is detected

Example console output:

```
[API Client] Initializing with base URL: https://wkndtj22ab.execute-api.us-west-2.amazonaws.com
```

If a deprecated host is detected:

```
❌ CRITICAL: API client is configured with a DEPRECATED host!
   Current: https://fb9pxd6m09.execute-api.us-west-2.amazonaws.com
   This host is no longer valid and requests will fail.
   Action required:
   1. Update VITE_API_BASE in .env.production to the correct host
   2. Rebuild and redeploy the application
   3. Clear browser cache and CloudFront distribution
   For validation, run: node scripts/validate-api-base.js
```

### Enable Debug Mode

```powershell
# .env.local or .env.production
VITE_DEBUG_API=true
```

**Note:** Debug logging is minimal in production to avoid exposing sensitive information.

## Validation Scripts

### 1. `scan-api-base.js`

Scans source code and built assets for API configuration issues.

**Usage:**

```powershell
node scripts/scan-api-base.js
```

**What it checks:**

- Hard-coded execute-api host patterns
- Known stale hosts (e.g., `fb9pxd6m09`)
- Fallback patterns using `||` or ternary operators
- Environment variable usage

**Exit codes:**

- `0`: No stale hosts found
- `1`: Stale host detected or error

**Example output:**

```
🔍 API Base Configuration Scan Results

════════════════════════════════════════════════════════════

❌ STALE HOSTS FOUND (CRITICAL):
────────────────────────────────────────────────────────────
  setup-valine-ses_Version2.ps1:26
    Host: https://fb9pxd6m09.execute-api.us-west-2.amazonaws.com
    Line: [string]$ApiBase = "https://fb9pxd6m09..."

✅ No stale hosts detected
   Valid host configured: wkndtj22ab.execute-api.us-west-2.amazonaws.com
```

### 2. `validate-api-base.js`

Validates the configured API base URL before build.

**Usage:**

```powershell
node scripts/validate-api-base.js
```

**What it checks:**

- `VITE_API_BASE` is set
- URL format is valid
- Hostname DNS resolution
- Optional API ID cross-check

**Environment variables:**

- `VITE_API_BASE`: API base URL (required)
- `ALLOW_API_BASE_DNS_FAILURE`: Allow DNS failure with warning
- `STACK_API_ID`: Expected API Gateway ID

### 3. `analyze-api-base-history.js`

Analyzes Git/PR history for API base configuration changes.

**Usage:**

```powershell
node scripts/analyze-api-base-history.js [--count=25]

# With GitHub token for higher rate limits
GITHUB_TOKEN=your_token node scripts/analyze-api-base-history.js
```

**Output:**

- Generates `reports/api-base-history.md`
- Lists PRs that modified `VITE_API_BASE`
- Identifies stale host references
- Summarizes execute-api occurrences

### 4. `diff-bundles-api-base.js`

Compares two production bundles to detect API hostname changes.

**Usage:**

```powershell
# Auto-detect latest two bundles in dist/assets
node scripts/diff-bundles-api-base.js

# Explicit bundle paths
node scripts/diff-bundles-api-base.js \
  dist/assets/index-abc123.js \
  dist/assets/index-def456.js
```

**Output:**

- JSON summary to stdout
- Markdown report at `reports/bundle-host-diff.md`
- Lists added, removed, and common hosts

## Recovery Steps

### If Wrong Host Deployed

**Symptoms:**
- Login/auth failures in production
- 404 or network errors on API calls
- Browser console shows requests to wrong hostname

**Recovery procedure:**

#### 1. Verify Current Configuration

```powershell
# Check .env.production
cat .env.production | Select-String VITE_API_BASE

# Scan for stale hosts
node scripts/scan-api-base.js
```

#### 2. Update Configuration

```powershell
# Update .env.production
echo "VITE_API_BASE=https://wkndtj22ab.execute-api.us-west-2.amazonaws.com" > .env.production
```

#### 3. Rebuild Application

```powershell
# Clean build
rm -rf dist node_modules/.vite

# Install and build
npm install
npm run build
```

#### 4. Validate Build

```powershell
# Validate API base
node scripts/validate-api-base.js

# Scan for stale hosts
node scripts/scan-api-base.js

# Check bundle if available
node scripts/diff-bundles-api-base.js
```

#### 5. Deploy

```powershell
# Deploy to hosting service (e.g., Netlify, Vercel, S3+CloudFront)
# Follow your standard deployment procedure

# For CloudFront, invalidate cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

#### 6. Clear Client Caches

**CloudFront invalidation:**

```powershell
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

**Service Worker cache:**

If your app uses a service worker, users may need to:
1. Open browser DevTools
2. Go to Application > Service Workers
3. Click "Unregister" or "Update"
4. Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

**Browser cache:**

Instruct users to:
1. Clear browser cache
2. Hard refresh the page
3. Or use incognito/private browsing mode to verify

### Manual Steps (Cannot be Automated)

Some recovery steps require manual intervention:

1. **Update CI/CD Secrets**
   - GitHub Actions: Repository Settings > Secrets
   - Netlify: Site Settings > Build & Deploy > Environment
   - Vercel: Project Settings > Environment Variables
   - AWS Amplify: App Settings > Environment Variables

2. **Rotate API Gateway Stage/Domain** (if API was replaced)
   - Update CloudFormation/CDK stack
   - Redeploy backend
   - Update VITE_API_BASE to new endpoint

3. **Clear CDN/Edge Caches**
   - CloudFront: Create invalidation
   - Cloudflare: Purge cache
   - Netlify: Clear cache and deploy

4. **Notify Users**
   - If cache issues persist, notify users to clear browser cache
   - Consider implementing cache-busting headers

## CI/CD Integration

### GitHub Actions Workflow

A dedicated workflow (`.github/workflows/api-base-guard.yml`) runs validation on every build.

**Jobs:**

1. **Scan**: Run `scan-api-base.js`
2. **Validate**: Run `validate-api-base.js`
3. **Upload Reports**: Store generated reports as artifacts

**Override in workflow:**

```yaml
env:
  ALLOW_API_BASE_DNS_FAILURE: ${{ github.event.inputs.allow_dns_failure || 'false' }}
```

### Integration with Existing Workflows

Add to your build workflow:

```yaml
- name: Validate API Base
  run: |
    node scripts/scan-api-base.js
    node scripts/validate-api-base.js
  env:
    VITE_API_BASE: ${{ secrets.VITE_API_BASE }}
```

## Troubleshooting

### DNS Resolution Fails in CI

**Problem:** `validate-api-base.js` fails with DNS error in CI environment.

**Solution:**

```yaml
# In GitHub Actions workflow
env:
  ALLOW_API_BASE_DNS_FAILURE: true
```

**Note:** Only use in environments where DNS is restricted. Verify the host is correct through other means.

### Scan Detects Stale Hosts in Documentation

**Problem:** `scan-api-base.js` reports stale hosts in example code or documentation.

**Solution:**

1. Replace with current host
2. Or use placeholder like `YOUR-API-ID.execute-api.us-west-2.amazonaws.com`
3. Update the scan script to skip specific files if needed

### Build Passes but Runtime Fails

**Problem:** Build validation passes, but production app cannot reach API.

**Diagnosis:**

1. Check browser console for actual API calls
2. Verify environment variables in deployment platform
3. Check if CloudFront/CDN is caching old bundle
4. Verify API Gateway is deployed and accessible

**Solution:**

1. Invalidate CloudFront cache
2. Verify `VITE_API_BASE` in deployment environment
3. Rebuild with `VITE_DEBUG_API=true` for detailed logging
4. Check API Gateway logs in AWS Console

### Historical Analysis Hits Rate Limit

**Problem:** `analyze-api-base-history.js` fails with 403/rate limit error.

**Solution:**

```powershell
# Generate GitHub personal access token (no scopes needed for public repo)
# https://github.com/settings/tokens

GITHUB_TOKEN=ghp_your_token node scripts/analyze-api-base-history.js
```

## Best Practices

1. **Always validate before deploying**
   ```powershell
   npm run build  # Includes validation via prebuild
   ```

2. **Scan after merging PRs that touch API config**
   ```powershell
   node scripts/scan-api-base.js
   ```

3. **Use environment-specific .env files**
   - `.env.production` for production builds
   - `.env.local` for local development (git-ignored)
   - Never commit `.env` files with real credentials

4. **Monitor API base in production**
   - Enable `VITE_DEBUG_API=true` temporarily to verify
   - Check browser console on first deployment
   - Test authentication flow end-to-end

5. **Document API changes**
   - When changing API base, document in PR
   - Update deployment guides
   - Notify team via communication channels

6. **Maintain bundle history**
   - Keep at least 2 production bundles for comparison
   - Run `diff-bundles-api-base.js` after each deployment
   - Archive bundle host reports

## References

- [Auth Backend Investigation](./AUTH_BACKEND_INVESTIGATION.md)
- [White Screen Runbook](./white-screen-runbook.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Scripts README](../scripts/README.md)

## Support

For issues or questions:

1. Check [Troubleshooting](#troubleshooting) section above
2. Run diagnostic scripts with `--help` flag
3. Review GitHub Issues for similar problems
4. Contact the development team

---

**Next:** [White Screen Runbook](./white-screen-runbook.md) | [Deployment Guide](./DEPLOYMENT.md)
