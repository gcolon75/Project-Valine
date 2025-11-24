# Project Valine Change Log

## PR #268 - 2025-11-24 - Repository Organization & Deployment Streamlining
- **Agent:** Repository Organization Agent
- **Objective:** Transform Project-Valine into production-ready repository
- **Files Added:**
  - `DEV_MODE.md` - Dev bypass documentation
  - `ALLOWED_USERS.md` - Allowlist documentation
  - `UX_DEPLOYMENT_CHECKLIST.md` - UX deployment guide
  - `TESTING_GUIDE.md` - User testing guide
  - `FRONTEND_AUDIT_REPORT.md` - Frontend feature audit
  - `BACKEND_AUDIT_REPORT.md` - Backend feature audit
  - `MISSING_FEATURES.md` - Feature gap analysis
  - `FRONTEND_FILE_INVENTORY.md` - File inventory
  - `FRONTEND_CLEANUP_PLAN.md` - Cleanup recommendations
  - `DEPLOYMENT_READY.md` - Certification document
  - `client/.env.local.example` - Client dev environment
  - `src/lib/devBypass.js` - Dev bypass module
  - `src/components/DevModeIndicator.jsx` - Dev mode indicator
  - `scripts/deploy-ux-only.sh` - UX deployment script
  - `scripts/provision-production-accounts.mjs` - Account provisioning
  - `.github/workflows/security-check.yml` - Security checks
  - `.copilot/` directory - Knowledge base
- **Status:** 🔄 In Progress

## PR #267 - 2025-11-24 - Add comprehensive production deployment documentation
- **Agent:** Deployment Investigation Agent
- **Objective:** Document exact deployment procedures
- **Files Added:** 
  - PRODUCTION_DEPLOYMENT_GUIDE.md (1,310 lines)
  - DEPLOYMENT_INVESTIGATION_SUMMARY.md (856 lines)
- **Status:** ✅ Merged
- **Key Decisions:** 
  - Migrations must run before backend deployment
  - GitHub Actions preferred for automated deployments
  - Prisma layer built via `build-prisma-layer.sh`

## PR #266 - 2025-11-24 - Production Deployment Tools
- **Objective:** Add production verification scripts
- **Files Added:** scripts/verify-production-deployment.mjs
- **Status:** ✅ Merged
- **Key Features:** Automated health checks, login tests, frontend verification

## PR #265 - User Account Provisioning
- **Files Added:** 
  - scripts/admin-set-password.mjs
  - scripts/admin-upsert-user.mjs
- **Status:** ✅ Merged

## PR #264 - Direct SQL Migration
- **Objective:** Direct SQL-based migration approach
- **Status:** ✅ Merged

## PR #263 - Schema Migration
- **Schema Changes:**
  - Added `users.status` column (VARCHAR, default: 'active')
  - Added `users.theme` column (VARCHAR, nullable)
  - Added `users.onboardingComplete` column (BOOLEAN)
- **Migration:** 20251121235650_add_missing_user_fields
- **Status:** ✅ Merged

## PR #262 - Dashboard/Auth Refactor
- **Objective:** Improve dashboard and authentication UX
- **Status:** ✅ Merged

## PR #255 - Secrets Management
- **Files Added:** SECRETS_MANAGEMENT.md
- **Key Features:** JWT rotation, secure storage guidelines
- **Status:** ✅ Merged

---

## Earlier History

See GitHub PR history for changes before PR #255.
