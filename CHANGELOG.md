# Changelog

All notable changes to Project Valine will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2025-10-23] - Fixed Lambda Deployment Cache Issues + Discord Endpoint Validation

### 🐛 What Was Broken

The Discord bot Lambda function was experiencing critical deployment failures:

- **Stale S3 Artifacts**: AWS SAM was reusing cached Lambda packages from S3, causing deployments to use old code even after successful builds
- **Import Errors**: Lambda crashed immediately with `Runtime.ImportModuleError: No module named 'app'` because the deployed package contained outdated code structure
- **Failed Endpoint Validation**: Discord Developer Portal couldn't verify the interactions endpoint, preventing the bot from going live
- **Manual Workarounds Required**: Developers had to manually clear S3 cache or delete/recreate the entire CloudFormation stack to force fresh deployments
- **No Automated Testing**: Deployments succeeded in CI but failed silently at runtime, only discovered when testing Discord interactions

### ✅ What We Fixed

#### 1. Timestamp Cache-Buster Mechanism ([PR #88](https://github.com/gcolon75/Project-Valine/pull/88))

**Problem**: SAM's `sam deploy` command checks if the local build artifact matches the S3 hash. If they match, it skips upload, even if the code structure changed.

**Solution**: 
- Created `scripts/generate-deploy-stamp.sh` that injects a unique timestamp file (`.deploy-stamp`) into every build
- File contains deployment timestamp, GitHub Actions run ID, and commit SHA
- Forces S3 hash to change on every deploy, bypassing cache
- Added to deploy workflow before `sam build` step

**Impact**: Every deploy now uploads fresh artifacts to S3, eliminating stale code issues.

#### 2. Automated Health Check ([PR #90](https://github.com/gcolon75/Project-Valine/pull/90))

**Problem**: Deployments appeared successful in CI but Lambda crashed at runtime with import errors. No automated way to catch this.

**Solution**:
- Created `scripts/test-discord-endpoint.sh` that sends a Discord PING request to the deployed Lambda
- Validates Lambda can start without crashing (checks for 200/401 responses, fails on 500/502/503)
- Integrated into deploy workflow as final step after `sam deploy`
- Provides clear error messages linking to CloudWatch logs if health check fails

**Impact**: CI now catches broken Lambda deployments immediately, before Discord registration is attempted.

#### 3. Recovery Playbook ([PR #89](https://github.com/gcolon75/Project-Valine/pull/89))

**Problem**: When Lambda deployments failed, developers had no clear troubleshooting guide and wasted hours experimenting.

**Solution**:
- Created comprehensive troubleshooting guide: `orchestrator/docs/LAMBDA_DEPLOY_RECOVERY.md`
- Includes 3 recovery options:
  - **Option 1: Force Fresh Deploy** (non-destructive, using `--force-upload`)
  - **Option 2: Check IAM Permissions** (diagnose access issues)
  - **Option 3: Nuclear Reset** (last resort - delete and recreate stack)
- Copy-paste emergency commands for when Lambda is on fire 🔥
- Troubleshooting matrix mapping symptoms to fixes
- Gen Z tone with gaming metaphors (respawn = redeploy, boss fight = debugging)

**Impact**: Developers can now diagnose and fix deployment issues in <5 minutes instead of hours.

### 🎮 Current Status

- ✅ **Discord Bot Endpoint**: Operational and validated
- ✅ **Lambda Imports**: Working correctly with fresh code on every deploy
- ✅ **CI Health Checks**: Catching broken deployments automatically
- ✅ **Developer Experience**: Clear playbook for troubleshooting

### 🔗 Related Issues & PRs

- [PR #88 - Timestamp Cache-Buster](https://github.com/gcolon75/Project-Valine/pull/88)
- [PR #89 - Recovery Playbook](https://github.com/gcolon75/Project-Valine/pull/89)
- [PR #90 - Automated Health Check](https://github.com/gcolon75/Project-Valine/pull/90)

### 📚 Documentation Updates

- Added "Recent Updates" section to [README.md](README.md)
- Created recovery playbook: [orchestrator/docs/LAMBDA_DEPLOY_RECOVERY.md](orchestrator/docs/LAMBDA_DEPLOY_RECOVERY.md)
- Updated [orchestrator/README.md](orchestrator/README.md) with deployment troubleshooting guidance

---

## [2025-11-06] - Security Hardening, Verification Infrastructure, Profile/Onboarding (PRs 155-187)

### 🔒 Security & Privacy Hardening (PRs 181, 183-185)

**Authentication Security:**
- **CSRF Protection** ([PR #185](https://github.com/gcolon75/Project-Valine/pull/185)): Token-based CSRF protection on all state-changing endpoints (login, register, profile edit, settings)
- **Rate Limiting** ([PR #181](https://github.com/gcolon75/Project-Valine/pull/181)): 
  - Login/Register: 5 attempts per 15 minutes
  - Password Reset: 3 attempts per hour
  - API endpoints: 100 requests per 15 minutes
  - 2FA verification: 5 attempts per 15 minutes
- **Session Management** ([PR #185](https://github.com/gcolon75/Project-Valine/pull/185)): Secure httpOnly cookies, SameSite=Strict, 15-min access tokens, 7-day refresh tokens
- **2FA Support** ([PR #183](https://github.com/gcolon75/Project-Valine/pull/183)): TOTP-based two-factor authentication with recovery codes

**Content Security Policy:**
- **CSP Report-Only Mode** ([PR #183](https://github.com/gcolon75/Project-Valine/pull/183)): 
  - CSP configuration deployed in report-only mode
  - Violation reporting to CloudWatch
  - XSS protection with DOMPurify
  - Inline script/style inventory completed
  - Phased enforcement plan: Marketing pages (Q1 2026), Authenticated pages (Q2 2026), Full enforcement (Q3 2026)

**Audit Logging:**
- **Audit Log System** ([PR #184](https://github.com/gcolon75/Project-Valine/pull/184)):
  - User authentication events (login, logout, failures)
  - 2FA events (enable, disable, verification attempts)
  - Profile changes (edit, delete, data export)
  - Security events (password reset, email verification)
  - Retention policies: Security (90 days), User actions (30 days), Failed attempts (7 days)

**Security Documentation:**
- Security runbooks: 2FA enablement, email verification, password reset
- Incident response playbook for auth abuse scenarios
- CSP rollout plan with phase timelines
- Environment variable security guidelines

### 🎨 Onboarding & Profile Builder (PRs 173, 175, 182)

**Onboarding Wizard:**
- **6-Step Profile Builder** ([PR #173](https://github.com/gcolon75/Project-Valine/pull/173)):
  - Step 1: Profile photo upload (S3 + Cloudinary)
  - Step 2: Bio and title (500 char limit)
  - Step 3: Profile links (GitHub, LinkedIn, Twitter, Website, Portfolio)
  - Step 4: Theme preference (light/dark mode)
  - Step 5: Privacy settings (profile visibility, data controls)
  - Step 6: Review and submit
- **Progress Persistence** ([PR #173](https://github.com/gcolon75/Project-Valine/pull/173)): Onboarding state saved across sessions
- **Accessibility** ([PR #175](https://github.com/gcolon75/Project-Valine/pull/175)): WCAG AA compliant forms, keyboard navigation, screen reader support

**Profile Links Normalization:**
- **Profile Links API** ([PR #182](https://github.com/gcolon75/Project-Valine/pull/182)):
  - Normalized `profile_links` table (separate from User model)
  - Profile link ordering and visibility controls
  - URL validation with platform-specific patterns
  - Migration from legacy `socialLinks` JSON field
  - Rollback scripts for safe deployment
- **Theme Preference API** ([PR #175](https://github.com/gcolon75/Project-Valine/pull/175)):
  - GET/PATCH `/api/users/:id/theme` endpoint
  - Theme stored in User model (nullable string: "light" | "dark" | null)
  - LocalStorage sync for pre-hydration theme application

### 🧪 Verification & Regression Infrastructure (PRs 186-187)

**Post-Merge Verification** ([PR #186](https://github.com/gcolon75/Project-Valine/pull/186)):
- Comprehensive verification script (`scripts/post-merge-comprehensive-verification.js`)
- PR verification matrix for PRs 155-185
- Migration validation (Prisma schemas, rollback scripts)
- Security validation (middleware, auth routes, test coverage)
- CSP policy analysis (directives, violations)
- Vulnerability scanning (npm audit, secret patterns)
- Audit log verification
- Test suite execution (unit, integration, E2E)
- Verification report: `logs/verification/verification-report.md`

**Regression Test Suite** ([PR #187](https://github.com/gcolon75/Project-Valine/pull/187)):
- **Accessibility Testing** (`tests/e2e/accessibility-sweep.spec.ts`):
  - 14 scenarios covering WCAG AA compliance
  - Marketing pages, authentication flows, authenticated pages, onboarding wizard
  - Axe-core integration with severity classification (Critical → Serious → Moderate → Minor)
- **Visual Regression** (`tests/e2e/visual-regression.spec.ts`):
  - 15+ component/page snapshots
  - Cross-browser (Chromium, WebKit, Firefox)
  - Responsive viewports (Mobile, Tablet, Desktop)
  - Dark/light theme variants
- **CSP Compliance** (`tests/e2e/csp-compliance.spec.ts`):
  - Inline script/style detection
  - XSS payload testing
  - External resource validation
  - CSP header recommendations
- **Negative Flow Testing** (`tests/e2e/negative-flows.spec.ts`):
  - Expired token handling (auth, refresh, verification, reset)
  - 2FA failures and account lockout
  - Rate limiting validation
  - Network errors (timeout, offline, 5xx)

### 🗄️ Backend Improvements (PR 177 and related)

**API Enhancements:**
- Profile links ordering and caching
- Theme preference endpoint with proper validation
- Dashboard stats API (7-day engagement metrics)
- Profile data export and deletion endpoints
- Enhanced error handling and validation middleware

**Database:**
- Profile links migration (`20251105030800_add_profile_links_table`)
- User theme field migration
- Audit log model migration
- Legacy data migration script (`api/scripts/migrate-social-links.js`)

### 🖥️ Frontend Integration (PRs 175, 180, 185)

**API Integration:**
- Profile links edit UI with reordering
- Theme preference toggle with instant preview
- Onboarding wizard with progress tracking
- CSRF token management in forms
- Graceful API fallback to mock data
- Optimistic updates with automatic rollback

**Error Boundaries:**
- Frontend error boundaries for crash recovery
- User-friendly error messages
- Diagnostic logging (`window.__diagnostics`)
- Analytics tracking (`window.__analytics`)

### 📚 Documentation Reorganization

**New Documentation Structure:**
- **PROJECT_STATUS.md**: Comprehensive current status, readiness, security posture, QA coverage, risks, next steps
- **docs/README.md**: Complete documentation index with categorized navigation
- **Reorganized Docs:**
  - `docs/security/` - Security policies, CSP, runbooks, incident response
  - `docs/backend/` - API docs, migrations, profile links, theme API
  - `docs/frontend/` - Hardening reports, integration guides
  - `docs/ux/` - UX audit reports, findings, transformation plan
  - `docs/agents/` - Agent implementation docs
  - `docs/verification/` - Post-merge verification, regression test guides
  - `docs/ops/` - Deployment guides, CI/CD, monitoring, runbooks
  - `docs/reference/` - Implementation summaries, roadmap, historical docs

**Updated Root README.md:**
- Prominent link to PROJECT_STATUS.md at top
- Quick navigation to documentation sections
- Status badges (CI, Accessibility, Lighthouse, Security)

### 🔗 Related PRs & Issues

- Security Hardening: [#181](https://github.com/gcolon75/Project-Valine/pull/181), [#183](https://github.com/gcolon75/Project-Valine/pull/183), [#184](https://github.com/gcolon75/Project-Valine/pull/184), [#185](https://github.com/gcolon75/Project-Valine/pull/185)
- Onboarding/Profile: [#173](https://github.com/gcolon75/Project-Valine/pull/173), [#175](https://github.com/gcolon75/Project-Valine/pull/175), [#182](https://github.com/gcolon75/Project-Valine/pull/182)
- Backend Improvements: [#177](https://github.com/gcolon75/Project-Valine/pull/177)
- Frontend Integration: [#175](https://github.com/gcolon75/Project-Valine/pull/175), [#180](https://github.com/gcolon75/Project-Valine/pull/180), [#185](https://github.com/gcolon75/Project-Valine/pull/185)
- Verification: [#186](https://github.com/gcolon75/Project-Valine/pull/186), [#187](https://github.com/gcolon75/Project-Valine/pull/187)

---

## [Unreleased]

### Added
- Nothing yet

### Changed
- Nothing yet

### Fixed
- Nothing yet

---

**Note**: For UX-specific changes, see [CHANGES.md](docs/reference/changes.md)
