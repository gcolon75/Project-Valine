# Post-Merge Verification & Regression Sweep Orchestration Runbook

## Overview

This runbook provides step-by-step instructions for running the orchestrated post-merge verification and frontend regression/accessibility sweep workflow against a staging environment.

**Purpose**: Validate that merged PRs 155-185 work correctly in a staging environment, with no security regressions, accessibility violations, or functional breaks.

**Components**:
- Post-merge comprehensive verification script (`npm run verify:post-merge`)
- Playwright regression and accessibility sweep (`./tests/e2e/run-regression-sweep.sh`)

**Workflow**: `.github/workflows/orchestrate-verification-and-sweep.yml`

---

## Prerequisites

### 1. Staging Environment Requirements

- A deployed staging environment accessible via HTTPS
- Test user account with credentials for authentication testing
- Staging environment should mirror production configuration

### 2. Repository Access

- Admin or Maintainer access to the GitHub repository
- Ability to add repository secrets
- Permission to run GitHub Actions workflows

---

## Step 1: Add Repository Secrets

Repository secrets must be configured before running the workflow.

### Navigate to Repository Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

### Required Secrets

Add the following three secrets:

#### `STAGING_URL`

- **Name**: `STAGING_URL`
- **Value**: The full URL of your staging environment (e.g., `https://staging.valine.example.com`)
- **Notes**: 
  - Must be a complete URL with protocol (https://)
  - Do NOT include trailing slash
  - Must be accessible from GitHub Actions runners

**Example**:
```
https://staging.valine.example.com
```

#### `TEST_USER_EMAIL`

- **Name**: `TEST_USER_EMAIL`
- **Value**: Email address of a valid test user account in staging
- **Notes**:
  - This user should have a verified account
  - Account should have completed onboarding
  - Used for authentication tests

**Example**:
```
test-user@example.com
```

#### `TEST_USER_PASSWORD`

- **Name**: `TEST_USER_PASSWORD`
- **Value**: Password for the test user account
- **Notes**:
  - Store securely as a secret (never commit to code)
  - Ensure this is a test account, not a real user
  - Rotate periodically for security

**Example**:
```
SecureTestP@ssw0rd123!
```

### Verify Secrets

After adding all three secrets, you should see them listed under **Repository secrets**:
- `STAGING_URL`
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`

---

## Step 2: Run the Workflow

### Manual Dispatch from GitHub UI

1. Go to your GitHub repository
2. Click **Actions** tab
3. In the left sidebar, click **Orchestrate Verification and Sweep**
4. Click the **Run workflow** dropdown button (top right)
5. Select the branch (typically `main` or your feature branch)
6. *Optional*: Override secrets using input fields if needed
7. Click **Run workflow** (green button)

### Monitor Workflow Execution

1. The workflow will appear in the list with a yellow status indicator
2. Click on the workflow run to view real-time logs
3. Expand each step to see detailed output
4. Workflow will take approximately 15-30 minutes to complete

### Workflow Steps Overview

The workflow performs these steps in sequence:

1. ✅ **Checkout code** - Clones the repository
2. ✅ **Setup Node.js** - Installs Node.js 18
3. ✅ **Install dependencies** - Runs `npm ci`
4. ✅ **Install Playwright browsers** - Installs Chromium for testing
5. ✅ **Verify secrets** - Checks that all required secrets are configured
6. ✅ **Health check staging** - Verifies staging environment is accessible
7. ✅ **Test authentication** - Validates test user credentials
8. ✅ **Run post-merge verification** - Executes comprehensive verification
9. ✅ **Upload verification logs** - Uploads verification artifacts
10. ✅ **Run Playwright regression sweep** - Executes E2E and accessibility tests
11. ✅ **Upload Playwright report** - Uploads interactive HTML report
12. ✅ **Upload regression artifacts** - Uploads test results and reports
13. ✅ **Generate workflow summary** - Creates summary with key findings
14. ✅ **Check for critical findings** - Flags critical issues

---

## Step 3: Download and Review Artifacts

### Locate Artifacts

After the workflow completes (success or failure):

1. Scroll to the bottom of the workflow run page
2. Find the **Artifacts** section
3. You should see three artifacts:
   - `verification-logs`
   - `playwright-report`
   - `regression-artifacts`

### Download Artifacts

Click each artifact name to download a ZIP file containing:

#### `verification-logs`

**Location**: `logs/verification/`

**Contents**:
- `verification-report.md` - Main verification report with executive summary
- `artifacts/draft-prs.json` - Draft PR payloads for fixes
- `artifacts/npm-audit.json` - Detailed vulnerability scan
- `artifacts/unit-tests.txt` - Unit test results
- `artifacts/e2e-tests.txt` - E2E test results

**Key files to review**:
1. Start with `verification-report.md` for the executive summary
2. Check `artifacts/draft-prs.json` for recommended fixes
3. Review `artifacts/npm-audit.json` for vulnerabilities

#### `playwright-report`

**Location**: `playwright-report/`

**Contents**:
- `index.html` - Interactive HTML report (open in browser)
- Test traces, screenshots, and videos
- Per-test detailed results

**How to view**:
1. Extract the ZIP file
2. Open `index.html` in a web browser
3. Navigate through test results, filter by status
4. Click on individual tests to see traces and screenshots

#### `regression-artifacts`

**Location**: `test-results/`, `REGRESSION_SWEEP_REPORT.md`

**Contents**:
- `REGRESSION_SWEEP_REPORT.md` - Consolidated regression report
- `test-results/accessibility/results.json` - axe-core violations
- `test-results/visual-regression/results.json` - Screenshot diffs
- `test-results/csp-compliance/results.json` - CSP violations
- `test-results/negative-flows/results.json` - Error handling results
- Various test result JSON files

**Key files to review**:
1. `REGRESSION_SWEEP_REPORT.md` - Overall regression summary
2. `test-results/accessibility/results.json` - Accessibility violations by page

---

## Step 4: Triage Results

### Understanding Workflow Status

**Green (Success)**:
- All checks passed
- No critical issues detected
- Proceed with confidence

**Yellow/Orange (Warning)**:
- Some tests failed (informational)
- Non-critical issues detected
- Review artifacts for details

**Red (Failure)**:
- Critical issues detected
- Secrets not configured correctly
- Staging environment unreachable

### Health Check and Authentication Tests

Before reviewing detailed results, check these preliminary steps:

#### Health Check Command

The workflow automatically runs:
```bash
curl -f -s -o /dev/null -w "%{http_code}" "$STAGING_URL"
```

**Expected**: HTTP 200, 301, or 302

**If failed**:
- Verify staging URL is correct
- Check if staging environment is deployed
- Verify network access from GitHub Actions runners

#### Login Test Command

The workflow automatically runs:
```bash
curl -s -X POST "$STAGING_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"TEST_USER_EMAIL","password":"TEST_USER_PASSWORD"}'
```

**Expected**: HTTP 200 or 201 with authentication token

**If failed**:
- Verify test user credentials are correct
- Check if user account exists in staging
- Ensure `/api/auth/login` endpoint is deployed

### Verification Report Triage

#### Executive Summary

Open `verification-report.md` and locate the **Executive Summary** section.

**Key metrics**:
- **PRs Merged**: Number of PRs from range 155-185 detected
- **Security Tests**: Number of security checks performed
- **Vulnerabilities**: Number of npm/secret vulnerabilities found
- **Recommendations**: Number of recommended fixes
- **Draft PRs**: Number of draft PR payloads generated

#### Prioritization Matrix

| Priority | Action Required | Timeline |
|----------|----------------|----------|
| **Critical** | Immediate fix | Within 24 hours |
| **High** | Priority fix | Within 1 week |
| **Medium** | Schedule fix | Within 2 weeks |
| **Low** | Consider fixing | Backlog |

#### Security Findings

**Critical security issues** to address immediately:
- Exposed secrets or credentials in code
- Critical npm vulnerabilities (CVSS 9.0+)
- Authentication bypass vulnerabilities
- Broken access control

**Review**:
1. Check `artifacts/npm-audit.json` for vulnerability details
2. Check `artifacts/draft-prs.json` for security-related PRs
3. Review any "PRIVATE/SECURITY FINDING" sections (redacted in public report)

### Regression Sweep Triage

#### Accessibility Violations

Open `test-results/accessibility/results.json` or review the Playwright HTML report.

**Severity levels** (WCAG):
- **Critical**: Prevents users from accessing content
- **Serious**: Major barrier for some users
- **Moderate**: Noticeable issue but workaround exists
- **Minor**: Cosmetic or minor inconvenience

**Focus on**:
- Critical and Serious violations first
- Violations affecting authentication or core flows
- Color contrast issues (common and easy to fix)

**Example violation**:
```json
{
  "id": "color-contrast",
  "impact": "serious",
  "description": "Elements must have sufficient color contrast",
  "nodes": 3,
  "help": "Ensure text has sufficient contrast ratio"
}
```

**Next steps**:
1. Identify affected components/pages
2. Review WCAG guidelines linked in violation
3. Create fix PR with updated styles

#### Visual Regression Failures

Visual regressions may indicate:
- Intentional design changes (update snapshots)
- Unintended CSS/layout bugs (fix the issue)
- Browser rendering differences (review and adjust)

**Review**:
1. Open Playwright HTML report
2. Look for tests with "Comparison failed" status
3. View side-by-side diffs of screenshots
4. Determine if changes are expected or bugs

**Decision tree**:
- **Expected change**: Update snapshots with `npx playwright test --update-snapshots`
- **Unexpected change**: Fix the CSS/layout bug
- **Browser-specific**: Review and adjust test thresholds

#### CSP Compliance Issues

CSP (Content Security Policy) violations indicate security risks.

**Common violations**:
- Inline `<script>` tags (XSS risk)
- Inline `style=""` attributes (CSP violation)
- Event handlers like `onclick` (XSS risk)
- Missing DOMPurify for user content

**Review**:
1. Check `test-results/csp-compliance/results.json`
2. Identify file paths of violations
3. Refactor to use external scripts/stylesheets
4. Ensure user content is sanitized with DOMPurify

#### Negative Flow Test Failures

Negative flow tests validate error handling.

**Critical failures**:
- No error message shown to user
- App crashes on invalid input
- Security bypass via error conditions
- Rate limiting not enforced

**Review**:
1. Check `test-results/negative-flows/results.json`
2. Identify which scenarios failed
3. Verify error handling code exists
4. Add missing error handling/validation

---

## Step 5: Create Fix PRs

### Using Draft PR Payloads

1. Open `logs/verification/artifacts/draft-prs.json`
2. Each entry contains:
   - `branch`: Suggested branch name
   - `title`: PR title
   - `body`: PR description with details
   - `labels`: Suggested labels
   - `filesAffected`: Files that need changes

3. Create PRs based on priority:
   - Start with `priority: "critical"` or `priority: "high"`
   - Create one PR per issue category

### Example Fix Workflow

For a high-priority vulnerability:

```bash
# Create fix branch
git checkout -b fix/high-severity-vulnerabilities

# Update dependencies
npm audit fix

# Verify fix
npm audit

# Commit and push
git add package.json package-lock.json
git commit -m "fix: resolve high-severity npm vulnerabilities"
git push origin fix/high-severity-vulnerabilities

# Create PR using draft payload from artifacts
```

### Testing Fixes

Before merging fix PRs:

1. Run the orchestration workflow again on the fix branch
2. Verify the specific issue is resolved
3. Ensure no new issues were introduced
4. Review the new artifacts for confirmation

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: "STAGING_URL secret not configured"

**Cause**: Secret is missing or has wrong name

**Solution**:
1. Go to Settings → Secrets and variables → Actions
2. Verify secret name is exactly `STAGING_URL` (case-sensitive)
3. Re-add the secret with correct name if needed
4. Re-run the workflow

#### Issue: "Staging environment is unreachable"

**Cause**: URL is incorrect, environment is down, or network issue

**Solution**:
1. Verify `STAGING_URL` value is correct (check for typos)
2. Test URL manually: `curl -I https://your-staging-url.com`
3. Check if staging environment is deployed and running
4. Verify firewall/security group allows GitHub Actions IPs

#### Issue: "Authentication test returned HTTP 401"

**Cause**: Invalid credentials or user doesn't exist

**Solution**:
1. Verify test user exists in staging database
2. Check credentials are correct (try manual login)
3. Ensure user account is verified and active
4. Re-add `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` secrets

#### Issue: "Playwright tests timing out"

**Cause**: Staging environment is slow or unresponsive

**Solution**:
1. Check staging environment performance
2. Increase workflow timeout (default: 60 minutes)
3. Run tests with fewer workers (edit workflow)
4. Review staging server logs for errors

#### Issue: "No artifacts uploaded"

**Cause**: Tests failed early or no results generated

**Solution**:
1. Review workflow logs for errors
2. Check that verification script completed
3. Verify `logs/verification/` directory was created
4. Re-run workflow with `continue-on-error` steps

#### Issue: "Too many test failures"

**Cause**: Staging environment differs from expectations

**Solution**:
1. Review differences between staging and expected state
2. Check if database migrations ran correctly
3. Verify environment variables are configured
4. Update tests to match staging environment

---

## Workflow Customization

### Override Secrets via Inputs

You can override secrets when running the workflow manually:

1. Click **Run workflow**
2. Fill in optional input fields:
   - `staging_url_override`: Override `STAGING_URL` secret
   - `test_user_email_override`: Override `TEST_USER_EMAIL` secret
   - `test_user_password_override`: Override `TEST_USER_PASSWORD` secret
3. Click **Run workflow**

**Use case**: Testing against a different environment or user without changing secrets.

### Modify Workflow Parameters

To customize the workflow behavior, edit `.github/workflows/orchestrate-verification-and-sweep.yml`:

```yaml
# Change Node.js version
env:
  NODE_VERSION: '20'  # Change from 18 to 20

# Change workflow timeout
jobs:
  orchestrate:
    timeout-minutes: 90  # Increase from 60 to 90

# Change artifact retention
- name: Upload verification logs
  uses: actions/upload-artifact@v4
  with:
    retention-days: 60  # Increase from 30 to 60
```

---

## Expected Artifact Locations

After downloading and extracting artifacts, you should find:

### Verification Logs

```
verification-logs/
├── verification-report.md           # Main report
└── artifacts/
    ├── draft-prs.json              # Draft PR payloads
    ├── npm-audit.json              # Vulnerability details
    ├── unit-tests.txt              # Unit test output
    └── e2e-tests.txt               # E2E test output
```

### Playwright Report

```
playwright-report/
├── index.html                       # Open this in browser
├── data/
│   └── (test result data)
└── trace/
    └── (test traces)
```

### Regression Artifacts

```
regression-artifacts/
├── REGRESSION_SWEEP_REPORT.md       # Consolidated report
└── test-results/
    ├── accessibility/
    │   └── results.json            # axe-core violations
    ├── visual-regression/
    │   └── results.json            # Screenshot diffs
    ├── csp-compliance/
    │   └── results.json            # CSP violations
    ├── negative-flows/
    │   └── results.json            # Error handling results
    └── (various test JSON files)
```

---

## Best Practices

### Scheduling Regular Runs

**Recommendation**: Run this workflow after each merge to `main` or weekly.

**Manual trigger**: Use for ad-hoc testing or before releases.

**Automated trigger**: Consider adding to workflow:
```yaml
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM UTC
```

### Maintaining Test Users

- Rotate test user passwords regularly
- Keep test user data realistic but not sensitive
- Document test user account requirements
- Ensure test users have necessary permissions

### Artifact Retention

- Default retention: 30 days
- Download critical artifacts immediately
- Archive important reports in project documentation
- Clean up old artifacts periodically

### Security Considerations

- **Never** commit secrets to code
- Rotate test passwords periodically
- Use dedicated test accounts, not real users
- Review security findings privately before public disclosure
- Limit repository secret access to maintainers only

---

## Support and References

### Related Documentation

- [Post-Merge Verification README](../../scripts/POST_MERGE_VERIFICATION_README.md)
- [Regression Sweep README](../../tests/e2e/REGRESSION_SWEEP_README.md)
- [Verification Guide](../../scripts/VERIFICATION_GUIDE.md)
- [Accessibility Checklist](../qa/a11y-checklist.md)

### GitHub Actions Documentation

- [Workflow syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Encrypted secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Manual workflow triggers](https://docs.github.com/en/actions/using-workflows/manually-running-a-workflow)
- [Artifacts](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts)

### External Resources

- [Playwright Documentation](https://playwright.dev/)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-06 | 1.0.0 | Initial runbook creation |

---

**Task Reference**: Add orchestration workflow and runbook (PR 186, PR 187 integration)  
**Maintainer**: Review this runbook after each workflow modification  
**Last Updated**: 2025-11-06
