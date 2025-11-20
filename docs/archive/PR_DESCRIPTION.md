# Add Orchestration Workflow for Post-Merge Verification and Regression Sweep

## 📋 Summary

This PR adds a manually-dispatchable GitHub Actions workflow and comprehensive runbook documentation for running post-merge verification and Playwright regression testing against staging environments.

## ⚠️ IMPORTANT: Required Setup Before First Use

**This workflow will NOT run until you configure three required secrets:**

### Required GitHub Secrets

Navigate to **Settings → Secrets and variables → Actions → New repository secret** and add:

1. **STAGING_URL**
   - Example: `https://staging.valine.app`
   - Description: Full URL of your staging environment

2. **TEST_USER_EMAIL**
   - Example: `qa-tester@valine.app`
   - Description: Email for a test user account in staging

3. **TEST_USER_PASSWORD**
   - Example: `SecureTestPassword123!`
   - Description: Password for the test user account
   - ⚠️ Use a unique password, NOT production passwords

## 📁 Files Added

### 1. `.github/workflows/orchestrate-verification-and-sweep.yml`

A GitHub Actions workflow that:

- **Trigger**: Manual dispatch only (`workflow_dispatch`)
- **Runtime**: Ubuntu latest with Node.js 18
- **Actions Used**: 
  - `actions/checkout@v4`
  - `actions/setup-node@v4`
  - `actions/upload-artifact@v4`
- **Steps**:
  1. Install dependencies with `npm ci`
  2. Run `npm run verify:post-merge` (continues on error)
  3. Run `./tests/e2e/run-regression-sweep.sh` (continues on error)
  4. Upload three artifact bundles
- **Timeouts**: 45 minutes total (10m install, 15m verification, 20m regression)
- **Permissions**: 
  - `contents: read`
  - `actions: read`
  - `checks: write`
  - `pull-requests: write`

**Artifacts Generated**:
1. `verification-and-smoke-artifacts` - Verification logs and reports
2. `playwright-report` - Interactive HTML test report
3. `regression-and-a11y-artifacts` - Test results and accessibility findings

### 2. `docs/ops/ORCHESTRATION_RUNBOOK.md`

A comprehensive operational runbook (700+ lines) covering:

- **Prerequisites**: Repository access, environment requirements, local testing
- **Required Secrets**: Step-by-step configuration guide
- **Running the Workflow**: Via GitHub UI, GitHub CLI, and API
- **Artifact Locations**: Detailed breakdown of all generated files
- **Health Checks**: Staging availability, API health, authentication tests
- **Triage Steps**: Decision matrix for handling results
- **Troubleshooting**: Common issues and resolutions
- **Safety Notes**: Security considerations and workflow guarantees

## 🔒 Safety Guarantees

This workflow is designed with safety in mind:

✅ **Manual Trigger Only** - No automatic execution on push/PR
✅ **Non-Destructive** - Read-only operations on staging
✅ **No Auto-Merge** - Does not modify PRs or repository
✅ **No Auto-Deploy** - Does not deploy to any environment
✅ **Continue-on-Error** - Artifacts uploaded even if tests fail
✅ **Proper Timeouts** - Each step has appropriate time limits
✅ **Isolated Environment** - Only runs against staging (when configured)

## 🚀 How to Use

### Quick Start

1. **Configure Secrets** (see Required Setup above)
2. **Navigate to Actions Tab**
3. **Select "Orchestrate Verification and Sweep"**
4. **Click "Run workflow"**
5. **Optionally add description**
6. **Click green "Run workflow" button**
7. **Monitor execution** (typical duration: 20-30 minutes)
8. **Download artifacts** when complete

### Via GitHub CLI

```bash
gh workflow run "Orchestrate Verification and Sweep" \
  --ref main \
  -f description="Post-deployment validation"
```

## 📊 Expected Outputs

### Success Scenario
- ✅ All steps complete (green checkmarks)
- 📦 Three artifact bundles available for download
- 📄 Summary with key metrics in workflow run
- ✓ Ready to review verification and test results

### Partial Failure Scenario
- ⚠️ Some tests may fail (by design, continues on error)
- 📦 Artifacts still uploaded for analysis
- 📋 Review artifacts to determine if failures are critical
- 🔍 Use runbook triage steps to categorize issues

## 📖 Documentation

Refer to the comprehensive runbook at `docs/ops/ORCHESTRATION_RUNBOOK.md` for:

- Detailed secret configuration
- Health check commands
- Triage procedures
- Troubleshooting guides
- Security considerations

## 🔍 What This PR Does NOT Do

This PR:
- ❌ Does NOT execute any workflows automatically
- ❌ Does NOT modify existing secrets
- ❌ Does NOT change any existing functionality
- ❌ Does NOT auto-merge anything
- ❌ Does NOT deploy to any environment

## ✅ Testing & Validation

- [x] YAML syntax validated
- [x] Workflow structure follows repository conventions
- [x] Documentation follows existing runbook format
- [x] All required files created
- [x] Branch pushed to remote

## 🔐 Security Considerations

1. **Secrets are properly isolated** - Only accessible in workflow runtime
2. **No secrets in logs** - Environment variables properly scoped
3. **Test account recommended** - Do not use personal/admin accounts
4. **Staging only** - No production systems accessed
5. **Audit trail** - All workflow runs logged in Actions

## 📝 Related Documentation

- [Post-Merge Verification Workflow](/.github/workflows/post-merge-verification.yml)
- [Regression Sweep README](/tests/e2e/REGRESSION_SWEEP_README.md)
- [Email Verification Runbook](/docs/runbooks/email-verification.md)

## 🎯 Next Steps After Merge

1. **Configure the three required secrets** in repository settings
2. **Test the workflow** with a manual run
3. **Review artifacts** to ensure everything works as expected
4. **Integrate into deployment process** as needed
5. **Schedule regular runs** if desired (can be added later)

## ℹ️ Branch Information

**Branch**: `copilot/choreorchestrate-verification-sweep-again`  
**Base**: `main`  
**Files Changed**: 2 files added
- `.github/workflows/orchestrate-verification-and-sweep.yml` (5KB)
- `docs/ops/ORCHESTRATION_RUNBOOK.md` (18KB)

---

**Note**: This workflow is completely safe to merge as it does not execute automatically and requires manual secrets configuration before it can be run. No workflows will execute upon merging this PR.
