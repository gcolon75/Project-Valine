# Orchestration Runbook: Verification and Sweep

## Overview
Operational runbook for the **Orchestrate Verification and Sweep** workflow, which executes post-merge verification and Playwright regression testing against staging environments.

**Workflow**: `.github/workflows/orchestrate-verification-and-sweep.yml`  
**Last Updated**: 2025-11-06  
**Owner**: QA & Operations Team  
**Severity**: P2 (Non-blocking, manual execution only)

---

## Table of Contents
- [Prerequisites](#prerequisites)
- [Required Secrets](#required-secrets)
- [Running the Workflow](#running-the-workflow)
- [Artifact Locations](#artifact-locations)
- [Health Checks](#health-checks)
- [Triage Steps](#triage-steps)
- [Safety Notes](#safety-notes)
- [Troubleshooting](#troubleshooting)
- [Related Documentation](#related-documentation)

---

## Prerequisites

### Repository Access
- **Required Role**: Write access to repository or Actions permission
- **Branch**: Available on all branches (workflow_dispatch only)

### Environment Requirements
- **Staging Environment**: Must be deployed and accessible
- **Test User Account**: Valid staging credentials required
- **Secrets**: All three required secrets must be configured

### Local Testing (Optional)
Before running the workflow, you can test locally:
```powershell
# Set environment variables
$env:STAGING_URL = "https://staging.valine.app"
$env:TEST_USER_EMAIL = "test@example.com"
$env:TEST_USER_PASSWORD = "SecureTestPass123!"

# Run verification
npm run verify:post-merge

# Run regression sweep
./tests/e2e/run-regression-sweep.sh
```

---

## Required Secrets

The workflow requires three GitHub repository secrets. Configure these in **Settings → Secrets and variables → Actions**.

### 1. STAGING_URL
**Description**: Full URL of the staging environment  
**Format**: `https://staging.valine.app` (or your staging domain)  
**Example**: `https://staging.valine.app`

**How to Add**:
```
1. Navigate to: Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: STAGING_URL
4. Secret: https://staging.valine.app
5. Click "Add secret"
```

### 2. TEST_USER_EMAIL
**Description**: Email address for staging test user account  
**Format**: Valid email address registered in staging environment  
**Example**: `qa-tester@valine.app`

**Requirements**:
- Account must exist in staging environment
- Email must be verified
- Account should have standard user permissions (not admin)

**How to Add**:
```
1. Navigate to: Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: TEST_USER_EMAIL
4. Secret: qa-tester@valine.app
5. Click "Add secret"
```

### 3. TEST_USER_PASSWORD
**Description**: Password for staging test user account  
**Format**: String (should meet password requirements)  
**Example**: `SecureTestPassword123!`

**Security Requirements**:
- Use a strong, unique password
- DO NOT reuse production passwords
- Rotate periodically (quarterly recommended)
- Document password rotation in team password manager

**How to Add**:
```
1. Navigate to: Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: TEST_USER_PASSWORD
4. Secret: [your secure password]
5. Click "Add secret"
```

### Verifying Secrets
After adding secrets, verify they are configured:
```
Repository → Settings → Secrets and variables → Actions → Repository secrets

You should see:
✅ STAGING_URL
✅ TEST_USER_EMAIL
✅ TEST_USER_PASSWORD
```

---

## Running the Workflow

### Via GitHub Actions UI

**Step 1**: Navigate to Actions tab
```
1. Go to your repository on GitHub
2. Click the "Actions" tab
3. Find "Orchestrate Verification and Sweep" in the left sidebar
```

**Step 2**: Trigger workflow dispatch
```
1. Click "Run workflow" button (top right)
2. Select branch (default: main)
3. Optionally add description:
   Example: "Testing PR #185 staging deployment"
4. Click "Run workflow" (green button)
```

**Step 3**: Monitor execution
```
1. Workflow run appears immediately
2. Click on the run to view details
3. Monitor each step's progress
4. Typical duration: 30-40 minutes
```

### Via GitHub CLI (gh)

```powershell
# Run on main branch with description
gh workflow run "Orchestrate Verification and Sweep" \
  --ref main \
  -f description="Manual staging validation"

# Run on specific branch
gh workflow run "Orchestrate Verification and Sweep" \
  --ref feature/my-branch \
  -f description="Testing feature branch"

# Check run status
gh run list --workflow="Orchestrate Verification and Sweep"

# Watch latest run
gh run watch
```

### Via GitHub API

```powershell
# Get workflow ID
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Authorization" = "token YOUR_TOKEN"
    "Authorization" = "token YOUR_TOKEN"
    "Accept" = "application/vnd.github.v3+json"
} -Body '{"ref":"main","inputs":{"description":"API triggered run"}}' -ContentType 'application/json'
```

---

## Artifact Locations

The workflow generates three artifact bundles. Download them from the workflow run page.

### 1. verification-and-smoke-artifacts

**Contents**:
```
logs/verification/
├── verification-report.md          # Main verification report
├── pr-audit-summary.md             # PR audit summary
└── artifacts/
    └── draft-prs.json              # Generated PR drafts

REGRESSION_VERIFICATION_REPORT.md   # Regression verification
REGRESSION_SWEEP_REPORT.md          # Full sweep report
UX_AUDIT_REPORT.md                  # UX audit findings
UX_AUDIT_FINDINGS.csv               # Structured UX data
UX_AUDIT_SUMMARY.json               # Machine-readable summary
```

**How to Download**:
1. Navigate to workflow run
2. Scroll to "Artifacts" section (bottom)
3. Click "verification-and-smoke-artifacts" to download ZIP

**Expected Files**:
- `logs/verification/verification-report.md` - Always present
- Reports (*.md) - Present if tests generated them
- CSV/JSON files - Present if UX audit ran

### 2. playwright-report

**Contents**:
```
playwright-report/
├── index.html              # Interactive HTML report
├── data/
│   └── *.json             # Test result data
└── trace/
    └── *.zip              # Playwright traces
```

**How to View**:
1. Download artifact ZIP
2. Extract locally
3. Open `playwright-report/index.html` in browser
4. Interactive report shows:
   - Test results by suite
   - Screenshots of failures
   - Trace viewer (timeline, network, console)

**Accessing Traces**:
```powershell
# Install Playwright if not already installed
npm install -D @playwright/test

# View trace file
npx playwright show-trace playwright-report/trace/trace-file.zip
```

### 3. regression-and-a11y-artifacts

**Contents**:
```
test-results/
├── accessibility/
│   ├── *.json             # A11y scan results
│   └── violations.csv     # Accessibility violations
├── visual-regression/
│   ├── baseline/          # Baseline screenshots
│   ├── actual/            # Current screenshots
│   └── diff/              # Visual diffs
├── csp-compliance/
│   └── csp-report.json    # CSP violation reports
└── negative-flows/
    └── error-states.json  # Error handling tests

REGRESSION_SWEEP_REPORT.md  # Consolidated report
```

**Key Files**:
- `test-results/accessibility/violations.csv` - All a11y issues
- `REGRESSION_SWEEP_REPORT.md` - Executive summary
- Visual diffs - Screenshots showing UI changes

---

## Health Checks

### Pre-Run Health Checks

Before running the workflow, verify staging health:

#### 1. Staging Availability
```powershell
# Check if staging is accessible
Invoke-WebRequest -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/health" -Method Get

# Expected response:
# HTTP/2 200
# server: nginx
# content-type: text/html
```

#### 2. API Health Check
```powershell
# Check API endpoint
Invoke-RestMethod -Uri "https://staging.valine.app/api/health" -Method Get

# Expected response:
# {"status":"healthy","version":"x.x.x","timestamp":"2025-11-06T..."}
```

#### 3. Authentication Service
```powershell
# Test login endpoint availability
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{"email":"test@example.com","password":"dummy"}' -ContentType 'application/json'
```

### Login Verification Commands

Test authentication with configured test user:

#### Valid Login Test
```powershell
# Replace with your actual test credentials
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{ "email": "' -ContentType 'application/json'
```

#### Session Validation
```powershell
# Use token from login response
TOKEN="eyJhbGciOiJIUzI1NiIs..."

Invoke-RestMethod -Uri "https://staging.valine.app/api/auth/me" -Method Get -Headers @{
    "Authorization" = "Bearer $TOKEN"
}
```

---

## Triage Steps

When the workflow completes, follow these steps to triage results.

### Step 1: Check Workflow Status

**Green (Success)**:
- All steps completed successfully
- No action required unless reviewing for insights

**Yellow (Warning)**:
- One or both main steps failed but continued
- Artifacts still uploaded
- **Action**: Review artifacts to determine severity

**Red (Failure)**:
- Infrastructure or setup issue
- **Action**: Check logs for setup/environment errors

### Step 2: Download and Review Artifacts

**Priority Order**:
1. **verification-and-smoke-artifacts** - Start here
2. **regression-and-a11y-artifacts** - Check test results
3. **playwright-report** - Deep dive on failures

### Step 3: Analyze Verification Report

**Location**: `logs/verification/verification-report.md`

**Key Sections**:
```markdown
## Executive Summary
- Total PRs verified: X
- Security issues found: Y
- Breaking changes: Z

## Critical Findings
- [Lists P0/P1 issues]

## Recommendations
- [Action items]
```

**Decision Matrix**:
| Finding | Severity | Action |
|---------|----------|--------|
| Security vulnerability | P0 | Create hotfix PR immediately |
| Breaking change | P1 | Create issue, notify team |
| Minor bug | P2 | Add to backlog |
| Enhancement opportunity | P3 | Document for future sprint |

### Step 4: Review Regression Sweep

**Location**: `REGRESSION_SWEEP_REPORT.md`

**Check For**:
- ❌ **Failed tests**: Regression or new bugs
- ⚠️ **A11y violations**: Accessibility issues
- 📸 **Visual diffs**: Unintended UI changes
- 🔒 **CSP violations**: Security policy issues

**Sample Report**:
```markdown
## Test Summary
✅ 45 passed
❌ 3 failed
⚠️ 2 warnings

## Failed Tests
1. auth-error-states.spec.ts - Invalid password handling
   - Expected: Error message shown
   - Actual: Page crashed
   
2. visual-regression.spec.ts - Profile page layout
   - Baseline mismatch: 15% difference
   - Screenshot: visual-regression/diff/profile.png
```

### Step 5: Investigate Failures

For each failure:

1. **Review test output** in artifacts
2. **View screenshots/traces** in Playwright report
3. **Reproduce locally** if needed:
   ```powershell
$env:STAGING_URL = "https://staging.valine.app"
   npm run test:e2e -- --Select-String "test-name"
   ```
4. **Determine root cause**:
   - Is it a real bug? → Create issue
   - Is it a test flake? → Re-run workflow
   - Is it environment-specific? → Check staging config

### Step 6: Take Action

**If Critical Issues Found**:
1. Create GitHub issue with label `severity:critical`
2. Notify team via Slack/Discord
3. Link workflow run in issue
4. Assign to relevant developer

**If Tests Need Updates**:
1. Update test expectations if intentional change
2. Fix flaky tests
3. Adjust baselines for visual regression

**If All Green**:
1. Document in team channel
2. Mark staging as validated
3. Proceed with production deployment (if applicable)

---

## Safety Notes

### 🔒 Security Considerations

**Secrets Management**:
- ⚠️ Never commit secrets to repository
- ⚠️ Do not log secrets in workflow outputs
- ⚠️ Rotate test passwords quarterly
- ✅ Use GitHub Secrets for sensitive data

**Test User Security**:
- Use dedicated test account (not personal account)
- Test account should have standard user permissions (not admin)
- Monitor test account for suspicious activity
- Test account should only exist in staging, not production

**Data Handling**:
- Test data should be synthetic/anonymized
- Do not use real user PII in tests
- Clean up test data after runs if needed

### ⚙️ Workflow Execution

**Manual Dispatch Only**:
- ✅ Workflow is manual trigger only (`workflow_dispatch`)
- ✅ Does NOT run on push/PR automatically
- ✅ Does NOT auto-merge anything
- ✅ Safe to run on any branch

**Non-Destructive**:
- Workflow is read-only on staging
- Does not modify database
- Does not change application state
- Only performs GET requests and test actions

**Failure Handling**:
- Both main steps use `continue-on-error: true`
- Artifacts uploaded even if tests fail
- Workflow completes even with failures
- No automatic rollbacks or alerts

### 🚨 What This Workflow DOES NOT Do

**Does NOT**:
- ❌ Deploy code to any environment
- ❌ Modify production systems
- ❌ Auto-merge PRs
- ❌ Create or update GitHub issues automatically
- ❌ Send notifications (except via GitHub)
- ❌ Execute on push/PR events
- ❌ Run on production environments

**Safety Guarantees**:
- Requires explicit manual trigger
- Cannot be triggered by external events
- Isolated to staging environment only
- All changes are test artifacts only

### 📊 Resource Considerations

**Timeout Management**:
- Workflow timeout: 45 minutes
- Dependency installation: 10 minutes max
- Verification: 15 minutes max
- Regression sweep: 20 minutes max

**Cost Optimization**:
- Uses GitHub Actions minutes
- Consider running during off-peak hours
- Artifacts retained for 30 days (configurable)

---

## Troubleshooting

### Workflow Won't Start

**Problem**: "Run workflow" button disabled

**Cause**: Insufficient permissions

**Resolution**:
```
1. Verify you have Write access to repository
2. Check: Settings → Actions → General → Workflow permissions
3. Ensure "Allow GitHub Actions to create and approve pull requests" is enabled
```

### Secrets Not Found Error

**Problem**: `Error: Secret STAGING_URL not found`

**Resolution**:
1. Verify secrets are configured in Settings → Secrets
2. Check secret names match exactly (case-sensitive)
3. Ensure secrets are repository secrets, not environment secrets

### Authentication Failures

**Problem**: Login tests failing with "Invalid credentials"

**Symptoms**:
```
Error: Login failed
Status: 401 Unauthorized
```

**Resolution**:
1. Verify test user exists in staging database
2. Test login manually using curl command
3. Check password hasn't been changed/expired
4. Verify staging auth service is operational

### Timeout Errors

**Problem**: Steps timeout before completion

**Resolution**:
1. Check staging environment performance
2. Increase step timeout in workflow file
3. Review if tests are hanging (not failing)

### Missing Artifacts

**Problem**: Artifacts section shows "No artifacts"

**Resolution**:
1. Check if steps ran (may have failed early)
2. Verify paths exist in workspace
3. Check workflow logs for file generation errors
4. Some artifacts only created if tests generate them

### Test Flakiness

**Problem**: Tests fail inconsistently

**Investigation**:
```powershell
# Run test multiple times locally
for i in {1..5}; do
  echo "Run $i"
  npm run test:e2e -- --Select-String "flaky-test"
done
```

**Common Causes**:
- Network timing issues
- Race conditions
- Staging environment instability
- Test data conflicts

**Resolution**:
1. Add retry logic to flaky tests
2. Increase timeouts for slow operations
3. Ensure proper test isolation
4. Fix staging environment issues

---

## Related Documentation

### Internal Documentation
- [Post-Merge Verification Script](../../scripts/post-merge-comprehensive-verification.js)
- [Regression Sweep README](../../tests/e2e/REGRESSION_SWEEP_README.md)
- [GitHub Actions Workflows](../.github/workflows/README.md)
- [QA Testing Strategy](../qa/testing-strategy.md)

### External Resources
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [GitHub Secrets Management](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

### Workflow Files
- `.github/workflows/orchestrate-verification-and-sweep.yml` - This workflow
- `.github/workflows/post-merge-verification.yml` - Automated post-merge checks
- `.github/workflows/phase5-staging-validation.yml` - Staging deployment validation

---

## Appendix: Quick Reference

### Common Commands

```powershell
# Verify secrets locally (requires GitHub CLI)
gh secret list

# View workflow runs
gh run list --workflow="Orchestrate Verification and Sweep"

# Download latest artifacts
gh run download --name verification-and-smoke-artifacts

# Cancel running workflow
gh run cancel [run-id]

# Re-run failed jobs
gh run rerun [run-id] --failed
```

### Workflow Permissions

```yaml
permissions:
  contents: read          # Read repository code
  actions: read           # Read workflow artifacts
  checks: write           # Write check status
  pull-requests: write    # Comment on PRs (future use)
```

### Expected Duration by Step

| Step | Typical Duration | Max Timeout |
|------|------------------|-------------|
| Checkout | 30s | 5min |
| Setup Node | 1min | 5min |
| Install deps | 3min | 10min |
| Verification | 5-10min | 15min |
| Regression sweep | 10-15min | 20min |
| Upload artifacts | 1-2min | 5min |
| **Total** | **20-30min** | **45min** |

---

**Version**: 1.0  
**Review Schedule**: Monthly or after workflow changes  
**Last Reviewed**: 2025-11-06

