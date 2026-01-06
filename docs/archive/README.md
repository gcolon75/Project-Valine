# Documentation Archive

> **Note:** This directory contains archived documentation that has been consolidated into the canonical docs.
> 
> **See:** [Documentation Index](../README.md) for current documentation.

---

## Archive Structure

### root-docs/
Contains markdown files that were previously in the `docs/` root directory.

**Archived:** 2026-01-05  
**Reason:** Consolidated into 8 canonical documents  
**Files:** 48 markdown files from docs/ root + 7 from project root

### subdirs/
Contains entire subdirectories that were previously in `docs/`.

**Archived:** 2026-01-05  
**Reason:** Consolidated into canonical docs  
**Directories:** 34 subdirectories (a11y, agents, analytics, api, backend, ci, compliance, database, debug, deployment, devops, diagnostics, evidence, frontend, guides, migrations, moderation, onboarding, ops, performance, privacy, qa, quickstart, reference, release, review, runbooks, security, seo, testing, troubleshooting, ui, ux, verification)

---

## Why Archive?

The documentation was consolidated from **424 files** down to **8 canonical documents** to:

1. **Reduce maintenance burden** - Keep docs up-to-date in one place
2. **Eliminate duplication** - Remove redundant and conflicting information
3. **Improve discoverability** - Clear hierarchy and navigation
4. **Preserve history** - Archive maintains all previous content

---

## Canonical Documentation (Current)

All current documentation is now in these **8 files** in `/docs/`:

1. **[PROJECT_BIBLE.md](../PROJECT_BIBLE.md)** - Complete master reference
2. **[DEPLOYMENT_BIBLE.md](../DEPLOYMENT_BIBLE.md)** - Deployment procedures
3. **[ARCHITECTURE.md](../ARCHITECTURE.md)** - System architecture
4. **[OPERATIONS.md](../OPERATIONS.md)** - Operations runbook
5. **[API_REFERENCE.md](../API_REFERENCE.md)** - API endpoints
6. **[TROUBLESHOOTING.md](../TROUBLESHOOTING.md)** - Common issues
7. **[DUPLICATE_USER_MITIGATION.md](../DUPLICATE_USER_MITIGATION.md)** - Duplicate user fix
8. **[README.md](../README.md)** - Documentation index

---

## Finding Archived Content

### If you're looking for:

- **Deployment guides** → See [DEPLOYMENT_BIBLE.md](../DEPLOYMENT_BIBLE.md)
- **API documentation** → See [API_REFERENCE.md](../API_REFERENCE.md)
- **Architecture info** → See [ARCHITECTURE.md](../ARCHITECTURE.md)
- **Runbooks** → See [OPERATIONS.md](../OPERATIONS.md)
- **Troubleshooting** → See [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
- **Historical postmortems** → Check `subdirs/ops/` or `root-docs/`
- **Investigation docs** → Check `root-docs/` for archaeology files
- **Old fix summaries** → Check `root-docs/` for *_FIX_SUMMARY.md files

---

## Archive Contents Summary

### root-docs/ (48 files from docs/ + 7 from project root)

**Deployment & Operations:**
- ALLOWLIST_DEPLOYMENT_RUNBOOK.md
- BACKEND-DEPLOYMENT.md
- DEPLOYMENT.md
- deployment-guide-profile-media-fix.md
- white-screen-runbook.md
- waf-reattachment-checklist.md
- OPS_LOG_2025-10-26.md

**Investigations & Archaeology:**
- AUTH_BACKEND_INVESTIGATION.md
- pr-archaeology-profile-media.md
- API_BASE_VALIDATION.md
- schema-validation-profile-media.md

**Fix Summaries:**
- SCHEMA_DRIFT_AUDIT_AVATAR_BANNER_FIX.md
- SCHEMA_DRIFT_FIX_SUMMARY.md
- PROFILE_FORM_INITIALIZATION_FIX.md
- PROFILE_IDENTITY_FIX_SUMMARY.md
- POWERSHELL_CONVERSION_SUMMARY.md
- POWERSHELL_FIX_VERIFICATION_SUMMARY.md
- WHITE_SCREEN_FIX_TESTING.md
- SPA_DELIVERY_RECOVERY.md

**Documentation & Summaries:**
- DOCUMENTATION_CLEANUP_SUMMARY.md
- DOCUMENTATION_CONSOLIDATION.md
- REORGANIZATION_SUMMARY.md
- SUMMARY.md
- PROJECT_VALINE_SYSTEM_HANDBOOK.md (superseded by PROJECT_BIBLE.md)

**Feature Specs & Guides:**
- ACCOUNT_CREATION_MVP.md
- ACCOUNT_CREATION_SECURITY.md
- ACCESS_CONTROL_ALLOWLIST.md
- IMAGE_OPTIMIZATION_GUIDE.md
- MEDIA_UPLOAD_INTEGRATION.md
- SOCIAL_GRAPH_MESSAGING.md
- SYNTHETIC_JOURNEYS.md
- profile-education-crud-spec.md

**Configuration & Checklists:**
- ENV_CHECKLIST.md
- feature-flags.md
- allowlist.md

**Debug & Diagnostics:**
- DISCORD_LAMBDA_DEBUG.md
- discord_min_flow.md
- troubleshooting-profile-media-upload.md

**Migration & Status:**
- cloudfront-spa-migration-status.md
- postmortem-2025-11-30.md

**Observability:**
- OBSERVABILITY_V2.md

**Planning:**
- NEXT_STEPS.md
- DATABASE_PROVIDER_COMPARISON.md

**Root Project Files:**
- QUICK_REFERENCE.md
- SINGLE_SOURCE_OF_TRUTH.md
- SERVERLESS_YML_ANALYSIS.md
- TEST_PLAN_AVATAR_BANNER_FIX.md
- TEST_PLAN_PR366_FIXES.md

### subdirs/ (34 directories)

**Frontend & UX:**
- frontend/ - Frontend patterns and components
- ui/ - UI documentation
- ux/ - UX guidelines and audit outputs
- seo/ - SEO documentation

**Backend:**
- backend/ - Backend API documentation
- api/ - API specifications
- database/ - Database migration guides

**Testing & QA:**
- testing/ - Test strategies
- qa/ - QA documentation
- verification/ - Verification guides
- a11y/ - Accessibility testing

**Operations:**
- ops/ - Operational runbooks
- runbooks/ - Specific runbooks
- deployment/ - Deployment guides
- devops/ - DevOps documentation

**Security & Compliance:**
- security/ - Security documentation
- compliance/ - Compliance guides
- privacy/ - Privacy policies

**Monitoring & Debug:**
- diagnostics/ - Diagnostic tools
- debug/ - Debug guides
- analytics/ - Analytics documentation
- performance/ - Performance optimization

**Project Management:**
- guides/ - General guides
- quickstart/ - Quick start guides
- reference/ - Reference materials
- release/ - Release notes
- review/ - Review documentation
- evidence/ - Evidence and artifacts

**Features:**
- onboarding/ - Onboarding flows
- moderation/ - Moderation features
- migrations/ - Migration guides

**Infrastructure:**
- ci/ - CI/CD documentation
- agents/ - Agent instructions

---

## Restoration Policy

**Do not restore archived docs.** If you need information from an archived doc:

1. Check if the info exists in a canonical doc
2. If missing and still relevant, update the canonical doc
3. Reference this archive for historical context only

---

**Archive Created:** 2026-01-05  
**Total Files Archived:** 424 from docs/ + 7 from root = 431 files  
**Archive Location:** `/docs/archive/`  
**Status:** ✅ Complete
