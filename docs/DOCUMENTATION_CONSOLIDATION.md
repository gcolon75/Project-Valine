# Documentation Consolidation - January 2026

## Summary

This document tracks the documentation consolidation effort to establish single sources of truth and archive outdated/duplicate files.

## Canonical Documents (DO NOT DELETE)

### Primary References
1. **docs/PROJECT_BIBLE.md** - Complete master reference for the entire project
   - Architecture, features, database schemas, API endpoints
   - Deployment procedures, testing strategy, troubleshooting
   - Updated: 2026-01-05
   - Status: ✅ Current and authoritative

2. **docs/DEPLOYMENT_BIBLE.md** - Canonical deployment guide
   - Step-by-step deployment procedures for all components
   - Environment configuration, verification steps
   - Rollback procedures, common issues
   - Updated: 2025-12-27
   - Status: ✅ Current and authoritative

### Important Supporting Documents
3. **README.md** - Project overview and quick start
4. **CONTRIBUTING.md** - Contribution guidelines
5. **SECURITY.md** - Security policies
6. **CHANGELOG.md** - Version history

## Archived Documents

The following documents have been superseded by the canonical bibles and should be considered historical reference only:

### Root Level (Moved to docs/archive/)
- DEPLOYMENT_GUIDE_AVATAR_BANNER_FIX.md
- FINAL_IMPLEMENTATION_SUMMARY.md
- FINAL_IMPLEMENTATION_SUMMARY_PROFILE_MEDIA_FIX.md
- IMPLEMENTATION_SUMMARY_AVATAR_BANNER_FIX.md
- IMPLEMENTATION_SUMMARY_PR366_FIXES.md

### docs/ (Already in archive/)
All files in:
- docs/archive/deployment-old/
- docs/archive/ALLOWLIST_DEPLOYMENT_GUIDE.md
- docs/archive/DEPLOYMENT_*.md
- docs/archive/DEPLOY_*.md
- docs/archive/QUICK_DEPLOY*.md

### docs/deployment/ (Superseded by DEPLOYMENT_BIBLE.md)
The following are superseded:
- AUTH_FIX_DEPLOYMENT.md
- DEPLOYMENT_READY.md
- PRODUCTION_DEPLOYMENT_GUIDE.md
- UX_DEPLOYMENT_CHECKLIST.md
- checklist.md
- deployment-guide.md
- quick-deploy.md
- quick-deploy-backend.md

Keep for reference:
- aws-guide.md (detailed AWS service setup)
- serverless-guide.md (Serverless Framework details)
- FUTURE_WORK.md (roadmap items)
- PRODUCTION_ACCOUNT_SETUP.md (one-time AWS setup)

### docs/ops/ (Superseded by DEPLOYMENT_BIBLE.md)
- DEPLOYMENT_RUNBOOK.md - Use DEPLOYMENT_BIBLE.md instead
- aws-deployment-quickstart.md - Use DEPLOYMENT_BIBLE.md instead
- deployment-flow.md - Information merged into PROJECT_BIBLE.md
- deployment-index.md - Information merged into PROJECT_BIBLE.md

## Recent Updates (2026-01-05)

### PROJECT_BIBLE.md Changes
- ✅ Updated version to 2.1
- ✅ Added confirmed production endpoints section at top
- ✅ Added canonical DATABASE_URL (no spaces)
- ✅ Added Schema Drift Prevention section with:
  - Explanation of why drift matters
  - Prevention tools (check-schema-drift.mjs)
  - Best practices for maintaining sync

### DEPLOYMENT_BIBLE.md Changes
- ✅ Already contained correct production endpoints
- ✅ Already had DATABASE_URL formatting warnings
- ✅ Already had comprehensive deployment procedures

## Schema Drift Prevention

### New Tools Added
- **scripts/check-schema-drift.mjs** - Validates that api/prisma/schema.prisma and serverless/prisma/schema.prisma are identical
  - Usage: `node scripts/check-schema-drift.mjs`
  - Exit code 0: Schemas match
  - Exit code 1: Drift detected with detailed error message

### Schema Changes Made
- ✅ Added missing Profile model fields to both schemas:
  - `pronouns` (String?, nullable)
  - `showPronouns` (Boolean, default: true)
  - `showLocation` (Boolean, default: true)
  - `showAvailability` (Boolean, default: true)
  - `visibility` (String, default: "PUBLIC")
  - `messagePermission` (String, default: "EVERYONE")
  - `isSearchable` (Boolean, default: true)
  - `notifyOnFollow` (Boolean, default: true)
  - `notifyOnMessage` (Boolean, default: true)
  - `notifyOnPostShare` (Boolean, default: true)

### Migrations Created
- **20260105224004_add_profile_pronouns_and_privacy_fields/migration.sql**
  - Created in both api/prisma/migrations/ and serverless/prisma/migrations/
  - Uses idempotent SQL (ADD COLUMN IF NOT EXISTS)
  - Safe to run multiple times

## Using the Canonical Documents

### For Developers
1. Start with **PROJECT_BIBLE.md** for understanding the system
2. Reference **DEPLOYMENT_BIBLE.md** when deploying
3. Run `node scripts/check-schema-drift.mjs` before committing schema changes

### For DevOps/SRE
1. Use **DEPLOYMENT_BIBLE.md** as the primary deployment reference
2. Use **PROJECT_BIBLE.md** for troubleshooting and architecture understanding
3. Post-deployment verification procedures are in DEPLOYMENT_BIBLE.md

### For New Team Members
1. Read README.md for project overview
2. Read PROJECT_BIBLE.md for comprehensive system knowledge
3. Read CONTRIBUTING.md before making changes
4. Use DEPLOYMENT_BIBLE.md when ready to deploy

## Migration Notes

### Why Two Schemas?
The project maintains two Prisma schemas due to different use cases:
- `api/prisma/schema.prisma` - Used during development for running migrations
- `serverless/prisma/schema.prisma` - Used in production for Lambda Prisma layer generation

Both MUST stay identical to prevent Prisma client generation drift, which causes runtime errors in production.

### Recent Production Issue (Fixed)
**Problem:** `PATCH /me/profile` failed with "Unknown argument `pronouns`"  
**Root Cause:** Schemas missing fields that profile handler expected  
**Fix Applied:** Added all missing fields to both schemas with proper defaults  
**Prevention:** Added check-schema-drift.mjs script and documentation

## Next Steps

1. ✅ Schema drift fixed and prevention tools added
2. ✅ Canonical documentation updated
3. ⏳ Consider adding check-schema-drift.mjs to CI/CD pipeline
4. ⏳ Review and potentially archive more duplicate docs
5. ⏳ Add pre-commit hook for schema drift check

## Document Status Legend

- ✅ Current and authoritative
- ⚠️ Outdated but useful for reference
- ❌ Superseded - use canonical docs instead
- 🗄️ Archived - historical reference only
