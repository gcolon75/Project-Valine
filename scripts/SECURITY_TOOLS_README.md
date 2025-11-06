# Security Audit & Testing Tools

This directory contains automated security audit and testing tools for Project Valine.

## Overview

Three main tools for security validation and rollout:

1. **post-merge-security-audit.js** - Automated comprehensive audit
2. **verify-security-behaviors.sh** - Runtime behavior tests  
3. **csp-rollout-config.js** - CSP configuration generator

---

## 1. Post-Merge Security Audit

**File**: `scripts/post-merge-security-audit.js`

### Purpose
Automated audit script that verifies all security implementations from PRs 155-183.

### What It Checks
- ✅ PR verification (22 files from 3 PRs)
- ✅ Security infrastructure (middleware, routes, utilities)
- ✅ Authentication & authorization (email verify, password reset, 2FA, CSRF, rate limiting)
- ✅ Privacy compliance (GDPR/CCPA export, deletion, audit logs)
- ✅ CSP configuration (directives, report-only mode, rollout plan)
- ✅ Security headers (HSTS, X-Frame-Options, Referrer-Policy, etc.)
- ✅ Rate limiting (brute-force protection, retry-after)
- ✅ ETag caching (generation, validation, 304 responses)
- ✅ Documentation parity (runbooks, env vars, guides)

### Usage

```bash
# Run the audit
node scripts/post-merge-security-audit.js

# Outputs:
# - CONSOLIDATED_SECURITY_AUDIT_REPORT.md (human-readable)
# - audit-report.json (machine-readable)
```

### Output

**CONSOLIDATED_SECURITY_AUDIT_REPORT.md** contains:
- Executive summary
- PR verification matrix
- Component-by-component analysis
- Security posture assessment
- Prioritized recommendations
- Fix PR proposals (if issues found)

**audit-report.json** contains:
- Structured audit data
- Can be consumed by CI/CD pipelines
- Useful for automated reporting

### CI/CD Integration

Add to GitHub Actions:

```yaml
- name: Security Audit
  run: node scripts/post-merge-security-audit.js
  
- name: Upload Audit Report
  uses: actions/upload-artifact@v3
  with:
    name: security-audit-report
    path: |
      CONSOLIDATED_SECURITY_AUDIT_REPORT.md
      audit-report.json
```

---

## 2. Security Behavior Tests

**File**: `scripts/verify-security-behaviors.sh`

### Purpose
Runtime tests that verify security mechanisms behave correctly.

### What It Tests
- ✅ Rate limiting (triggers after max attempts)
- ✅ CSRF protection (rejects requests without token)
- ✅ Security headers (HSTS, CSP, X-Frame-Options, etc.)
- ✅ ETag caching (generates ETags, returns 304)
- ✅ API response structure (health, root endpoints)

### Prerequisites

**Requires running server**:
```bash
# Terminal 1: Start server
cd server && npm run dev

# Terminal 2: Run tests
./scripts/verify-security-behaviors.sh
```

### Usage

```bash
# Default (localhost:5000)
./scripts/verify-security-behaviors.sh

# Custom API base URL
API_BASE=http://localhost:3001 ./scripts/verify-security-behaviors.sh

# Staging environment
API_BASE=https://staging-api.valine.app ./scripts/verify-security-behaviors.sh
```

### Output

```
🔐 Security Behavior Verification
=================================
API Base: http://localhost:5000

✓ Server is running

🔒 Testing Security Headers...
------------------------------
✓ HSTS header present
✓ X-Frame-Options header present
✓ X-Content-Type-Options header present
✓ Referrer-Policy header present
✓ CSP header present (report-only)

📊 Testing Rate Limiting...
----------------------------
✓ Rate limiting triggers after max attempts
✓ 429 response includes retryAfter

🛡️  Testing CSRF Protection...
------------------------------
✓ POST without auth/CSRF is rejected

💾 Testing ETag and Caching...
------------------------------
✓ ETag header present in responses
✓ 304 Not Modified on matching ETag
✓ Cache-Control header present

📋 Testing API Response Structure...
------------------------------------
✓ Health endpoint returns structured response
✓ Root endpoint returns API info
✓ Security features listed in root endpoint

=================================
Test Summary
=================================
Total Tests: 14
Passed: 14
Failed: 0

✅ All security behavior tests passed!
```

### Exit Codes
- `0` - All tests passed
- `1` - One or more tests failed or server not running

### Notes
- Some tests may show warnings if features are disabled in dev (e.g., CSRF, rate limiting)
- This is expected behavior - the warnings indicate features are off in development mode
- Production should have all features enabled

---

## 3. CSP Rollout Configuration

**File**: `scripts/csp-rollout-config.js`

### Purpose
Generates Content Security Policy configurations for phased rollout.

### Available Phases

1. **reportOnly** - Report-Only (Phase 1-2)
   - Liberal policy for initial monitoring
   - Collects violations without blocking
   - For: Development, initial staging

2. **stagingEnforced** - Staging Enforced (Phase 3)
   - Refined policy after analysis
   - Enforced in staging only
   - For: Pre-production validation

3. **production** - Production (Phase 4)
   - Strict policy
   - Enforced in production
   - For: Production rollout

4. **development** - Development (Local)
   - Relaxed policy for convenience
   - Report-only mode
   - For: Local development

### Usage

#### Generate Configuration
```bash
# Generate report-only config
node scripts/csp-rollout-config.js generate reportOnly

# Generate production config
node scripts/csp-rollout-config.js generate production

# Save to .env file
node scripts/csp-rollout-config.js generate stagingEnforced > .env.staging
```

#### Get Deployment Checklist
```bash
# Get checklist for specific phase
node scripts/csp-rollout-config.js checklist reportOnly
node scripts/csp-rollout-config.js checklist stagingEnforced
node scripts/csp-rollout-config.js checklist production
```

#### Analyze Current Resources
```bash
# Analyze codebase for external resources
node scripts/csp-rollout-config.js analyze
```

#### List All Configurations
```bash
# Show all available CSP configs
node scripts/csp-rollout-config.js list
```

### Example Output

**Generate Configuration**:
```
🛡️  CSP Rollout Configuration Tool

Generating CSP configuration for: Report-Only (Phase 1-2)

# ============================================
# CSP Configuration: Report-Only (Phase 1-2)
# ============================================
# Enable CSP violation reporting without blocking
#
# Generated by: scripts/csp-rollout-config.js
# Date: 2025-11-06T00:00:00.000Z
#

CSP_REPORT_ONLY=true
CSP_REPORT_URI=https://your-report-endpoint.example.com/csp-violations
NODE_ENV=staging

# CSP Policy Directives (for reference):
# default-src: 'self'
# script-src: 'self' 'unsafe-inline' 'unsafe-eval'
# style-src: 'self' 'unsafe-inline'
# img-src: 'self' data: https:
# ...

# Implementation Notes:
# - Collect violations for 24-48 hours
# - Review CSP reports daily
# - Identify legitimate sources to whitelist
# - Document all external resources used

---

CSP Header String:
default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ...
```

**Deployment Checklist**:
```
# CSP Rollout Checklist - Report-Only (Phase 1-2)
============================================================

## Pre-Deployment
- [ ] Review CSP configuration
- [ ] Set environment variables
- [ ] Configure CSP report endpoint
- [ ] Set up monitoring/alerts for violations

## Deployment
- [ ] Deploy configuration to environment
- [ ] Verify CSP header is present in responses
- [ ] Check CSP mode (report-only vs enforced)

## Monitoring (First 24-48 hours)
- [ ] Review CSP violation reports
- [ ] Identify false positives
- [ ] Document legitimate sources
- [ ] Test critical user flows

## Post-Deployment
- [ ] Tune policy based on violations
- [ ] Update whitelist as needed
- [ ] Document changes
- [ ] Prepare for next phase

## Notes
- Collect violations for 24-48 hours
- Review CSP reports daily
- Identify legitimate sources to whitelist
- Document all external resources used
```

---

## Recommended Workflow

### 1. Initial Audit (First Time)
```bash
# Run comprehensive audit
node scripts/post-merge-security-audit.js

# Review reports
cat CONSOLIDATED_SECURITY_AUDIT_REPORT.md
cat SECURITY_ROLLOUT_SUMMARY.md
```

### 2. Verify Runtime Behavior (Staging)
```bash
# Start staging server
cd server && npm run dev

# In another terminal, run behavior tests
./scripts/verify-security-behaviors.sh

# Or test remote staging
API_BASE=https://staging-api.valine.app ./scripts/verify-security-behaviors.sh
```

### 3. CSP Rollout (Phased)

**Phase 1: Report-Only Staging**
```bash
# Generate report-only config
node scripts/csp-rollout-config.js generate reportOnly > .env.staging.csp

# Get deployment checklist
node scripts/csp-rollout-config.js checklist reportOnly > csp-phase1-checklist.md

# Deploy to staging with CSP_REPORT_ONLY=true
# Monitor violations for 24-48h
```

**Phase 2: Analysis**
```bash
# Review CSP violation reports
# Identify legitimate sources
# Update whitelist in csp-rollout-config.js

# Generate refined policy
node scripts/csp-rollout-config.js generate stagingEnforced
```

**Phase 3: Enforced Staging**
```bash
# Deploy to staging with CSP_REPORT_ONLY=false
# Test all critical flows
# Monitor error logs
```

**Phase 4: Production**
```bash
# Generate production config
node scripts/csp-rollout-config.js generate production > .env.production.csp

# Gradual rollout (10% → 50% → 100%)
# Continue monitoring
```

### 4. Continuous Monitoring

**Weekly**:
```bash
# Re-run audit
node scripts/post-merge-security-audit.js

# Compare with previous audit
diff audit-report.json audit-report-last-week.json
```

**After Each Deployment**:
```bash
# Verify behaviors
./scripts/verify-security-behaviors.sh

# Check security headers
curl -I https://api.valine.app/
```

---

## Troubleshooting

### Audit Script Issues

**Problem**: "File not found" errors
**Solution**: Run from repository root: `cd /path/to/Project-Valine && node scripts/...`

**Problem**: Missing dependencies
**Solution**: `npm install` in root directory

### Behavior Test Issues

**Problem**: "Server not running" error
**Solution**: Start server first: `cd server && npm run dev`

**Problem**: Connection refused on port 5000
**Solution**: Set correct port: `API_BASE=http://localhost:3001 ./scripts/verify-security-behaviors.sh`

**Problem**: Rate limiting not triggered
**Solution**: Expected in dev mode (disabled by default). Set `RATE_LIMIT_ENABLED=true` to test.

**Problem**: CSRF tests showing warnings
**Solution**: Expected in dev mode (disabled by default). Set `CSRF_ENABLED=true` to test.

### CSP Config Issues

**Problem**: "Invalid phase" error
**Solution**: Use valid phase: reportOnly, stagingEnforced, production, or development

**Problem**: Need custom CSP directives
**Solution**: Edit `cspConfigs` object in `csp-rollout-config.js`

---

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Security Audit

on:
  pull_request:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday

jobs:
  audit:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          npm install
          cd server && npm install
      
      - name: Run Security Audit
        run: node scripts/post-merge-security-audit.js
      
      - name: Upload Reports
        uses: actions/upload-artifact@v3
        with:
          name: security-audit-reports
          path: |
            CONSOLIDATED_SECURITY_AUDIT_REPORT.md
            audit-report.json
      
      - name: Comment PR with Summary
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('audit-report.json', 'utf8');
            const data = JSON.parse(report);
            
            // Post summary comment
            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Security Audit Results\n\n✅ Audit complete. See artifacts for details.`
            });
```

---

## Reference Documentation

- **CSP Rollout Plan**: `docs/security/csp-rollout-plan.md`
- **Security Guide**: `docs/SECURITY_GUIDE.md`
- **Environment Variables**: `docs/security/environment-variables.md`
- **Incident Response**: `docs/security/incident-response-auth-abuse.md`
- **Runbooks**: `docs/runbooks/*.md`

---

## Support

For questions or issues:
1. Check existing documentation in `docs/` directory
2. Review `SECURITY_ROLLOUT_SUMMARY.md`
3. Create GitHub issue with `security` label
4. Reference specific tool in issue title

---

**Last Updated**: 2025-11-06  
**Version**: 1.0  
**Maintained By**: Backend Team
