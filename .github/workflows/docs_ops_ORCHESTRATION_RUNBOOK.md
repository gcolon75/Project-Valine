# Orchestrated Verification + Frontend Regression Sweep (Staging)

This runbook explains how to execute both the post-merge verification (PR 186) and the frontend regression/a11y/CSP sweep (PR 187) via a single workflow.

## Prerequisites

1. Add repository secrets (Settings → Secrets and variables → Actions → New repository secret):
   - `STAGING_URL` → e.g., `https://staging.example.com`
   - `TEST_USER_EMAIL` → test account email in staging
   - `TEST_USER_PASSWORD` → test account password in staging

2. Make sure CI can access staging (network/firewall allowlist).

3. Ensure the repo contains:
   - `scripts/post-merge-comprehensive-verification.js`
   - `tests/e2e/run-regression-sweep.sh`
   - Playwright config and tests as merged by PR 187

## How to run

1. Go to GitHub → Actions → “Orchestrate Verification and Frontend Regression Sweep”
2. Click “Run workflow” → choose environment “staging” → Run.
3. Wait for both jobs to complete:
   - Backend post-merge verification + smoke tests
   - Frontend regression + a11y + CSP sweep

## Where to find results

- Artifacts:
  - `verification-and-smoke-artifacts` → verification logs, smoke test outputs
  - `regression-and-a11y-artifacts` → axe results, visual diffs, regression summary
  - `playwright-report` → HTML report (`playwright-report/index.html`)

Download artifacts and open `playwright-report/index.html` locally.

## Next steps

- Triage P0/P1 items in `REGRESSION_SWEEP_REPORT.md` and verification logs.
- Apply auto-generated draft PR payloads (if produced) or create follow-up PRs.
- Re-run the workflow to confirm fixes.
- When stable, proceed to canary rollout per PROJECT_STATUS.md.