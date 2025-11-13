# Phase 1 Classification Matrix: Project Valine Repository Maintenance

**Report Date:** November 13, 2025  
**Phase:** 1 - Classification  
**Previous Phase:** Phase 0 - Discovery (completed)  
**Purpose:** Categorize all files and directories for potential action

---

## Executive Summary

This matrix classifies all major components of the Project Valine repository discovered in Phase 0. Each item is categorized by:
- **Status**: ✅ Active, ⚠️ Unclear, 🗄️ Deprecated, 📦 Legacy
- **Classification**: Core, Config, Build Artifact, Legacy, Candidate Consolidation, Unknown
- **Action**: Keep, Archive, Consolidate, Delete, Investigate
- **Risk Level**: 🔴 High, 🟡 Medium, 🟢 Low

**Key Findings**:
- **43 root-level markdown files** → 38 candidates for relocation, 5 to keep
- **3 backend directories** → 1 active (serverless), 2 need investigation (server, api)
- **2 Prisma schemas** → Potential divergence, needs diff and consolidation
- **9 environment files** → Consolidation opportunities identified
- **Multiple unclear directories** → orchestrator, client, frontend, sanity need clarification

---

## Table of Contents

1. [Directory Classification](#1-directory-classification)
2. [Configuration Files Classification](#2-configuration-files-classification)
3. [Documentation Files Classification](#3-documentation-files-classification)
4. [Code Directories Classification](#4-code-directories-classification)
5. [Environment File Divergence Analysis](#5-environment-file-divergence-analysis)
6. [Duplicate Configs Analysis](#6-duplicate-configs-analysis)
7. [High-Risk Items Summary](#7-high-risk-items-summary)
8. [Action Plan by Priority](#8-action-plan-by-priority)

---

## 1. Directory Classification

### Top-Level Directories

| Directory | Status | Classification | Action | Risk | Justification |
|-----------|--------|----------------|--------|------|---------------|
| **src/** | ✅ Active | Core | Keep | 🔴 High | Primary Vite React frontend (1.4M), actively deployed to S3/CloudFront |
| **serverless/** | ✅ Active | Core | Keep | 🔴 High | Primary AWS Lambda backend (1.2M), 28 handlers, 80+ routes, production API |
| **server/** | ⚠️ Unclear | Legacy | Investigate | 🟡 Medium | Express.js server (584K), duplicates serverless dependencies, no clear deployment |
| **api/** | ⚠️ Unclear | Candidate Consolidation | Investigate | 🟡 Medium | Contains only Prisma schema (168K), duplicates serverless/prisma schema |
| **client/** | ⚠️ Unclear | Unknown | Investigate | 🟢 Low | Minimal Sanity CMS integration (20K), usage unclear, misnamed if just CMS config |
| **frontend/** | ⚠️ Unclear | Candidate Consolidation | Consolidate | 🟢 Low | Only contains CI scripts (28K), should be in .github/workflows/ or scripts/ |
| **docs/** | ✅ Active | Core | Keep | 🟢 Low | Well-organized documentation (252 files), 30 subdirectories |
| **archive/** | ✅ Active | Core | Keep | 🟢 Low | Historical backups, properly organized |
| **tests/** | ✅ Active | Core | Keep | 🟡 Medium | E2E test suites (Playwright, 64 test files), critical for quality |
| **scripts/** | ✅ Active | Core | Keep | 🟡 Medium | Build/deploy automation, actively used in CI/CD |
| **infra/** | ✅ Active | Core | Keep | 🟡 Medium | Infrastructure as code, S3 presign Lambda, separate serverless.yml |
| **orchestrator/** | ⚠️ Unclear | Unknown | Investigate | 🟡 Medium | Large directory, Discord bot + agents, separate system, may need own repo |
| **sanity/** | ⚠️ Unclear | Unknown | Investigate | 🟢 Low | Sanity CMS project (projectId: f57vovth), usage unclear |
| **public/** | ✅ Active | Core | Keep | 🟡 Medium | Static assets for Vite, required for frontend build |
| **logs/** | ⚠️ Unclear | Build Artifact | Investigate | 🟢 Low | Agent/verification logs, should likely be gitignored |
| **patches/** | ✅ Active | Config | Keep | 🟢 Low | Package patches for dependency fixes |
| **ops/** | ⚠️ Unclear | Unknown | Investigate | 🟢 Low | Operations scripts, purpose unclear, may overlap with scripts/ |
| **.github/** | ✅ Active | Core | Keep | 🟡 Medium | GitHub workflows, CI/CD automation |

### Key Observations

**🚨 Critical Issues**:
1. **Three backend directories** (`api/`, `server/`, `serverless/`) - Only serverless is clearly active
2. **Potential schema divergence** - Two Prisma schemas in api/ and serverless/
3. **Unclear purpose directories** - orchestrator, client, sanity, frontend, ops need investigation

**Consolidation Opportunities**:
- `frontend/ci/` → Move to `.github/workflows/` or `scripts/`
- `api/prisma/` → Merge with or symlink to `serverless/prisma/`
- `ops/` → Merge with `scripts/` if overlap exists
- `logs/` → Add to .gitignore if not intentional evidence logs

---

## 2. Configuration Files Classification

### Build & Bundler Configurations

| File | Type | Status | Classification | Action | Risk | Notes |
|------|------|--------|----------------|--------|------|-------|
| `vite.config.js` | Bundler | ✅ Active | Core | Keep | 🔴 High | Primary frontend build config, includes API validation |
| `vitest.config.js` | Testing | ✅ Active | Core | Keep | 🟡 Medium | Test runner configuration |
| `postcss.config.js` | Build | ✅ Active | Core | Keep | 🟡 Medium | PostCSS/Tailwind integration, required for styles |
| `tailwind.config.js` | Styling | ✅ Active | Core | Keep | 🔴 High | Design system configuration, core to UI |
| `playwright.config.js` | Testing | ✅ Active | Core | Keep | 🟡 Medium | E2E test configuration, 64 test files |
| `jsconfig.json` | IDE/Build | ✅ Active | Config | Keep | 🟡 Medium | Path aliases (@/ → src/), used by Vite |
| `sanity/project-valine/tsconfig.json` | TypeScript | ⚠️ Unclear | Unknown | Investigate | 🟢 Low | Only Sanity uses TypeScript, main app uses JS |

**Findings**:
- ✅ All critical build configs present and properly configured
- ⚠️ Sanity configs present but usage unclear
- 🎯 No duplicate build configs found (good)

### Serverless Configurations

| File | Service | Status | Classification | Action | Risk | Notes |
|------|---------|--------|----------------|--------|------|-------|
| `serverless/serverless.yml` | pv-api | ✅ Active | Core | Keep | 🔴 High | Main API (652 lines), 80+ routes, production deployment |
| `infra/serverless.yml` | valine-api | ✅ Active | Core | Keep | 🟡 Medium | Infrastructure utilities (45 lines), S3 presign endpoint |

**Findings**:
- ✅ Two serverless configs are intentional (separation of concerns)
- ✅ No conflict between services (different service names)
- 📝 Main API: `pv-api`, Infrastructure: `valine-api`

### Sanity CMS Configurations

| File | Type | Status | Classification | Action | Risk | Notes |
|------|------|--------|----------------|--------|------|-------|
| `sanity/project-valine/sanity.config.ts` | CMS Config | ⚠️ Unclear | Unknown | Investigate | 🟢 Low | ProjectId: f57vovth, dataset: production |
| `sanity/project-valine/sanity.cli.ts` | CMS CLI | ⚠️ Unclear | Unknown | Investigate | 🟢 Low | CLI configuration for Sanity studio |
| `client/.env.sanity.example` | Env Template | ⚠️ Unclear | Unknown | Investigate | 🟢 Low | 1-line file, minimal config |

**Findings**:
- ⚠️ Sanity is configured but no obvious integration in frontend
- 🤔 May be deprecated, planned, or undocumented feature
- 📋 **Action Required**: Document usage or archive if unused

### Misplaced Configuration Files

| File | Current Location | Status | Classification | Action | Risk | Notes |
|------|------------------|--------|----------------|--------|------|-------|
| `github_workflows_lighthouse.yml` | Root | ⚠️ Misplaced | Config | Consolidate | 🟢 Low | Should be in `.github/workflows/lighthouse.yml` |
| `amplify.yml` | Root | ⚠️ Unclear | Config | Investigate | 🟢 Low | App deployed to S3, not Amplify - legacy? |
| `strip-api-prefix.js` | Root | ✅ Active | Config | Keep | 🟡 Medium | CloudFront function, required for routing |

**Actions**:
1. Move `github_workflows_lighthouse.yml` → `.github/workflows/lighthouse.yml`
2. Investigate `amplify.yml` - delete if not used, document if intentional
3. Keep `strip-api-prefix.js` but consider moving to `infra/` or `scripts/`

---

## 3. Documentation Files Classification

### Root-Level Markdown Files (43 Total)

#### Category: Core Documentation (Keep in Root - 5 files)

| File | Classification | Action | Risk | Justification |
|------|----------------|--------|------|---------------|
| `README.md` | Core | Keep | 🔴 High | Primary project documentation, must stay in root |
| `CHANGELOG.md` | Core | Keep | 🟢 Low | Version history, standard in root |
| `CONTRIBUTING.md` | Core | Keep | 🟢 Low | Contributor guidelines, standard in root |
| `SECURITY.md` | Core | Keep | 🟡 Medium | Security policy, GitHub standard location |
| `PROJECT_STATUS.md` | Core | Keep | 🟢 Low | High-visibility status, valuable in root |

#### Category: Phase Tracking (Archive - 10 files)

| File | Classification | Action | Risk | Justification |
|------|----------------|--------|------|---------------|
| `ALL_PHASES_COMPLETE.md` | Historical | Archive | 🟢 Low | Historical record, move to docs/archive/phases/ |
| `PHASES_1_3_COMPLETE.md` | Historical | Archive | 🟢 Low | Outdated milestone, move to docs/archive/phases/ |
| `PHASES_STATUS.md` | Historical | Archive | 🟢 Low | Superceded by PROJECT_STATUS.md |
| `PHASE_1_COMPLETE.md` | Historical | Archive | 🟢 Low | Move to docs/archive/phases/ |
| `PHASE_2_3_AUTH_IMPLEMENTATION.md` | Historical | Archive | 🟢 Low | Move to docs/archive/phases/ |
| `PHASE_4_FRONTEND_AUTH_IMPLEMENTATION.md` | Historical | Archive | 🟢 Low | Move to docs/archive/phases/ |
| `PHASE_5_MEDIA_UPLOAD_IMPLEMENTATION.md` | Historical | Archive | 🟢 Low | Move to docs/archive/phases/ |
| `PHASE_6_IMPLEMENTATION_COMPLETE.md` | Historical | Archive | 🟢 Low | Move to docs/archive/phases/ |
| `PHASE_7_COMPLETE.md` | Historical | Archive | 🟢 Low | Move to docs/archive/phases/ |
| `PHASE_GROUP_A_IMPLEMENTATION.md` | Historical | Archive | 🟢 Low | Move to docs/archive/phases/ |

**Action**: Create `docs/archive/phases/` and move all 10 files there.

#### Category: Implementation Summaries (Relocate - 16 files)

| File | Classification | Action | Destination | Risk | Notes |
|------|----------------|--------|-------------|------|-------|
| `A11Y_IMPLEMENTATION_SUMMARY.md` | Evidence | Consolidate | docs/evidence/a11y/ | 🟢 Low | Accessibility implementation evidence |
| `ACCOUNT_CREATION_SUMMARY.md` | Evidence | Consolidate | docs/evidence/auth/ | 🟢 Low | Auth feature implementation |
| `ANALYTICS_IMPLEMENTATION_EVIDENCE.md` | Evidence | Consolidate | docs/evidence/analytics/ | 🟢 Low | Analytics implementation proof |
| `ANALYTICS_SECURITY_SUMMARY.md` | Evidence | Consolidate | docs/security/ | 🟢 Low | Security review for analytics |
| `FRONTEND_SECURITY_HARDENING.md` | Evidence | Consolidate | docs/security/ | 🟢 Low | Frontend security measures |
| `FRONTEND_SECURITY_IMPLEMENTATION.md` | Evidence | Consolidate | docs/security/ | 🟢 Low | Duplicate/overlap with above? |
| `IMPLEMENTATION_COMPLETE.md` | Evidence | Consolidate | docs/evidence/ | 🟢 Low | General implementation summary |
| `IMPLEMENTATION_SUMMARY.md` | Evidence | Consolidate | docs/evidence/ | 🟢 Low | May duplicate above |
| `MODERATION_MVP_SUMMARY.md` | Evidence | Consolidate | docs/evidence/moderation/ | 🟢 Low | Moderation feature implementation |
| `OWNER_ONLY_AUTH_SUMMARY.md` | Evidence | Consolidate | docs/evidence/auth/ | 🟢 Low | Auth mode implementation |
| `PERFORMANCE_CACHING_IMPLEMENTATION.md` | Evidence | Consolidate | docs/evidence/performance/ | 🟢 Low | Performance optimization proof |
| `REST_API_IMPLEMENTATION_SUMMARY.md` | Evidence | Consolidate | docs/evidence/backend/ | 🟢 Low | API implementation summary |
| `SEO_IMPLEMENTATION_COMPLETE.md` | Evidence | Consolidate | docs/evidence/seo/ | 🟢 Low | SEO feature implementation |
| `TASK_EXECUTION_SUMMARY.md` | Evidence | Consolidate | docs/evidence/ | 🟢 Low | General task summary |
| `PHASE_1_SECURITY_SUMMARY.md` | Evidence | Consolidate | docs/security/ | 🟢 Low | Security audit summary |
| `SECURITY_AUDIT_REPORT.md` | Evidence | Consolidate | docs/security/ | 🟢 Low | Comprehensive security audit |

**Actions**:
1. Create subdirectories in `docs/evidence/` (a11y, auth, analytics, backend, moderation, performance, seo)
2. Move files to appropriate evidence subdirectories
3. Consolidate duplicates (check if IMPLEMENTATION_COMPLETE.md and IMPLEMENTATION_SUMMARY.md overlap)
4. Update any cross-references in moved files

#### Category: Deployment Guides (Relocate - 5 files)

| File | Classification | Action | Destination | Risk | Notes |
|------|----------------|--------|-------------|------|-------|
| `DEPLOYMENT_CHECKLIST.md` | Guide | Consolidate | docs/deployment/ | 🟢 Low | Move to existing docs/deployment/ |
| `DEPLOYMENT_CHECKLIST_OWNER_AUTH.md` | Guide | Consolidate | docs/deployment/ | 🟢 Low | Auth-specific deployment |
| `DEPLOYMENT_GUIDE.md` | Guide | Consolidate | docs/deployment/ | 🟢 Low | General deployment guide |
| `OWNER_ONLY_AUTH_DEPLOYMENT.md` | Guide | Consolidate | docs/deployment/ | 🟢 Low | Auth deployment specifics |
| `CLOUDFRONT_FUNCTION_GUIDE.md` | Guide | Consolidate | docs/deployment/ or docs/infra/ | 🟢 Low | Infrastructure deployment |

**Action**: Move all 5 files to `docs/deployment/` (directory already exists per discovery report).

#### Category: PR Artifacts (Archive/Delete - 4 files)

| File | Classification | Action | Risk | Justification |
|------|----------------|--------|------|---------------|
| `DRAFT_PR_PAYLOAD.md` | Artifact | Archive or Delete | 🟢 Low | Draft PR, likely obsolete if already merged |
| `PR_DESCRIPTION.md` | Artifact | Archive or Delete | 🟢 Low | PR artifact, check if obsolete |
| `PR_SUMMARY.md` | Artifact | Archive or Delete | 🟢 Low | PR artifact, check if obsolete |
| `DOCS_PARITY_REPORT.md` | Meta-doc | Archive | 🟢 Low | Meta-documentation, archive to docs/archive/ |

**Action**: Review PR files - if PRs are merged/closed, archive to `docs/archive/pr-artifacts/`. If still relevant, move to `docs/`.

#### Category: Miscellaneous (Relocate - 1 file)

| File | Classification | Action | Destination | Risk | Notes |
|------|----------------|--------|-------------|------|-------|
| `docs_agents_AUTOMATION_PLAYBOOK.md` | Config | Consolidate | docs/agents/ | 🟢 Low | Agent documentation, misplaced in root |

**Action**: Move to `docs/agents/automation-playbook.md` (normalize filename).

### Documentation Summary

**Current State**: 43 files in root  
**Target State**: 5 files in root (88% reduction)

**Distribution**:
- ✅ Keep in root: 5 files
- 📦 Archive to docs/archive/phases/: 10 files
- 📁 Move to docs/evidence/: 16 files
- 📁 Move to docs/deployment/: 5 files
- 🗑️ Archive/delete: 4 files
- 📁 Move to docs/agents/: 1 file

**Total to relocate**: 38 files  
**Estimated effort**: 2-3 hours with careful link checking

---

## 4. Code Directories Classification

### Frontend Directories

| Directory | Status | Classification | Action | Risk | Size | Justification |
|-----------|--------|----------------|--------|------|------|---------------|
| **src/** | ✅ Active | Core | Keep | 🔴 High | 1.4M | Primary Vite React app, production frontend |
| **public/** | ✅ Active | Core | Keep | 🟡 Medium | - | Static assets required by Vite |
| **client/** | ⚠️ Unclear | Unknown | Investigate | 🟢 Low | 20K | Only Sanity CMS config, misnamed? Should be sanity-client/ or merged |

**Frontend Observations**:
- ✅ Main frontend is clear and well-organized (src/)
- ⚠️ client/ directory is confusing - if only Sanity, rename or merge with sanity/
- 🎯 No other frontend directories found

### Backend Directories

| Directory | Status | Classification | Action | Risk | Size | Justification |
|-----------|--------|----------------|--------|------|------|---------------|
| **serverless/** | ✅ Active | Core | Keep | 🔴 High | 1.2M | Primary Lambda backend, 28 handlers, production API |
| **server/** | ⚠️ Unclear | Legacy | Investigate | 🟡 Medium | 584K | Express server, duplicates serverless deps, no clear deployment |
| **api/** | ⚠️ Unclear | Candidate Consolidation | Investigate | 🟡 Medium | 168K | Only Prisma schema, duplicates serverless/prisma |
| **infra/** | ✅ Active | Core | Keep | 🟡 Medium | - | Infrastructure Lambdas (S3 presign), separate serverless.yml |

**Backend Critical Issues**:

#### Issue 1: server/ Directory - Legacy or Active?

**Evidence**:
- ✅ Contains complete Express.js implementation (package.json, 584K)
- ✅ Has duplicate dependencies (bcryptjs, jsonwebtoken, otplib, express)
- ❌ No deployment configuration found (not in CI/CD)
- ❌ Not referenced in serverless.yml
- ⚠️ Uses different Redis client (redis vs ioredis)

**Scenarios**:
1. **Legacy/Deprecated**: Old Express backend replaced by serverless/
2. **Dev Server**: Local development server (but why not in scripts/?)
3. **Alternative Backend**: Parallel implementation (but why?)

**Classification**: 📦 Legacy (likely)  
**Risk**: 🟡 Medium - If accidentally deployed, could cause issues  
**Action Required**: 
- ✅ Check git history for last meaningful commits
- ✅ Check if referenced in any documentation
- ✅ Confirm with human before archiving
- 📋 If legacy: Archive to `archive/server_express/` with README explaining replacement

**Safety Note**: DO NOT delete without confirmation - may be used locally by developers.

#### Issue 2: api/ Directory - Prisma Schema Only?

**Evidence**:
- ✅ Contains `prisma/schema.prisma` (168K)
- ✅ Has package.json with only Prisma dependencies
- ✅ Has migration scripts in package.json
- ⚠️ Schema size differs from serverless/prisma/schema.prisma (14,003 bytes vs 13,742 bytes)

**Scenarios**:
1. **Schema Management Separation**: Intentional separation for clarity
2. **Duplicate/Divergent**: Accidental duplication causing schema drift
3. **Migration Tool**: Separate environment for running migrations

**Classification**: Candidate Consolidation  
**Risk**: 🟡 Medium - Schema divergence could cause data corruption  
**Critical Action Required**:
1. 🚨 **URGENT**: Diff `api/prisma/schema.prisma` and `serverless/prisma/schema.prisma`
2. Identify which is canonical (check git history, deployment scripts)
3. Merge or symlink schemas to ensure single source of truth
4. Document why both exist if intentional

**Safety Note**: This is HIGH PRIORITY - schema divergence is a data corruption risk.

### Lambda Handlers Analysis

| Handler File | Routes in serverless.yml | Status | Classification | Action | Risk |
|--------------|-------------------------|--------|----------------|--------|------|
| health.js | ✅ Yes (GET /health) | ✅ Active | Core | Keep | 🟢 Low |
| meta.js | ✅ Yes (GET /meta) | ✅ Active | Core | Keep | 🟢 Low |
| auth.js | ✅ Yes (8+ routes) | ✅ Active | Core | Keep | 🔴 High |
| sessions.js | ✅ Yes (2 routes) | ✅ Active | Core | Keep | 🟡 Medium |
| users.js | ✅ Yes (3 routes) | ✅ Active | Core | Keep | 🔴 High |
| profiles.js | ✅ Yes (5+ routes) | ✅ Active | Core | Keep | 🔴 High |
| media.js | ✅ Yes (5+ routes) | ✅ Active | Core | Keep | 🔴 High |
| credits.js | ✅ Yes (4 routes) | ✅ Active | Core | Keep | 🟡 Medium |
| reels.js | ✅ Yes (6+ routes) | ✅ Active | Core | Keep | 🔴 High |
| posts.js | ✅ Yes (3 routes) | ✅ Active | Core | Keep | 🟡 Medium |
| conversations.js | ✅ Yes (4 routes) | ✅ Active | Core | Keep | 🟡 Medium |
| notifications.js | ✅ Yes (3 routes) | ✅ Active | Core | Keep | 🟡 Medium |
| connections.js | ✅ Yes (4 routes) | ✅ Active | Core | Keep | 🟡 Medium |
| search.js | ✅ Yes (2 routes) | ✅ Active | Core | Keep | 🟡 Medium |
| settings.js | ✅ Yes (4 routes) | ✅ Active | Core | Keep | 🟡 Medium |
| reelRequests.js | ✅ Yes (4 routes) | ✅ Active | Core | Keep | 🟡 Medium |
| reports.js | ✅ Yes (3 routes) | ✅ Active | Core | Keep | 🟡 Medium |
| moderation.js | ✅ Yes (2 routes) | ✅ Active | Core | Keep | 🟡 Medium |
| analytics.js | ✅ Yes (3 routes) | ✅ Active | Core | Keep | 🟡 Medium |
| observability.js | ✅ Yes (5 routes) | ✅ Active | Core | Keep | 🟢 Low |
| prIntel.js | ✅ Yes (2 routes) | ✅ Active | Core | Keep | 🟢 Low |
| testIntel.js | ✅ Yes (2 routes) | ✅ Active | Core | Keep | 🟢 Low |
| schemaDiff.js | ✅ Yes (1 route) | ✅ Active | Core | Keep | 🟢 Low |
| syntheticJourney.js | ✅ Yes (1 route) | ✅ Active | Core | Keep | 🟢 Low |
| **auditions.js** | ❌ No routes | 🗄️ Deprecated or Incomplete | Unknown | Investigate | 🟡 Medium |
| **scripts.js** | ❌ No routes | 🗄️ Deprecated or Incomplete | Unknown | Investigate | 🟡 Medium |
| **requests.js** | ❌ No routes | 🗄️ Deprecated | Unknown | Investigate | 🟢 Low |
| **uploads.js** | ❌ No routes | 🗄️ Deprecated | Unknown | Investigate | 🟢 Low |

**Critical Finding**: 4 handlers without routes

**Handlers Without Routes**:

1. **auditions.js** - Listed as "core feature" in README but no routes
   - **Classification**: Incomplete Feature
   - **Risk**: 🟡 Medium (core feature not deployed)
   - **Action**: Investigate if in development, add routes, or document as planned feature

2. **scripts.js** - Listed as "core feature" in README but no routes
   - **Classification**: Incomplete Feature
   - **Risk**: 🟡 Medium (core feature not deployed)
   - **Action**: Investigate if in development, add routes, or document as planned feature

3. **requests.js** - Generic name, may be deprecated
   - **Classification**: Legacy
   - **Risk**: 🟢 Low
   - **Action**: Check git history, likely safe to archive

4. **uploads.js** - Overlaps with media.js
   - **Classification**: Legacy
   - **Risk**: 🟢 Low
   - **Action**: Verify media.js handles uploads, then archive

**Recommendation**: Add to investigation list - auditions and scripts are core features per README.

### Other Code Directories

| Directory | Status | Classification | Action | Risk | Notes |
|-----------|--------|----------------|--------|------|-------|
| **orchestrator/** | ⚠️ Unclear | Unknown | Investigate | 🟡 Medium | Large system, Discord bot + agents, may need own repo |
| **sanity/** | ⚠️ Unclear | Unknown | Investigate | 🟢 Low | Sanity CMS project, usage unclear |
| **tests/** | ✅ Active | Core | Keep | 🟡 Medium | E2E tests (Playwright), 64 test files |
| **scripts/** | ✅ Active | Core | Keep | 🟡 Medium | Build/deploy automation |
| **patches/** | ✅ Active | Config | Keep | 🟢 Low | Dependency patches |
| **ops/** | ⚠️ Unclear | Unknown | Investigate | 🟢 Low | Purpose unclear, may overlap scripts/ |

**orchestrator/ Deep Dive Needed**:
- Contains Discord bot integration
- Contains agent prompts and triage agents
- Uses SAM templates (AWS Serverless Application Model)
- Large directory suggesting significant functionality
- **Question**: Is this part of main app or separate autonomous system?
- **Action**: Document architecture or consider extracting to separate repository

---

## 5. Environment File Divergence Analysis

### Environment Template Files Inventory

| File | Location | Lines | Purpose | Status | Classification | Action |
|------|----------|-------|---------|--------|----------------|--------|
| `.env.example` | Root | 197 | Complete FE+BE config | ✅ Active | Core | Keep (canonical) |
| `.env.local.example` | Root | ~10 | Local overrides | ⚠️ Unclear | Duplicate | Investigate |
| `serverless/.env.example` | serverless/ | 114 | Backend config | ✅ Active | Core | Keep (backend ref) |
| `serverless/.env.staging.example` | serverless/ | ~100 | Staging env | ⚠️ Unclear | Config | Investigate |
| `server/.env.example` | server/ | ~50 | Express config | 🗄️ Deprecated | Legacy | Archive if server/ archived |
| `orchestrator/.env.example` | orchestrator/ | ~20 | Discord bot config | ⚠️ Unclear | Unknown | Keep if orchestrator active |
| `client/.env.sanity.example` | client/ | 1 | Sanity project ID | ⚠️ Unclear | Unknown | Archive if Sanity unused |
| `archive/client_backup/.env.example` | archive/ | - | Archived config | ✅ Archived | Legacy | Keep in archive |
| `archive/client_backup/.env.sample` | archive/ | - | Archived config | ✅ Archived | Legacy | Keep in archive |

### Divergence Analysis

#### Primary Templates Comparison

**Root `.env.example` (197 lines)** vs **serverless/.env.example (114 lines)**:

| Category | Root File | Serverless File | Divergence | Action |
|----------|-----------|-----------------|------------|--------|
| **Backend vars** | ✅ Complete | ✅ Complete | None | ✅ Good |
| **Frontend vars** | ✅ Complete (VITE_*) | ❌ Not included | Expected | ✅ Good |
| **Documentation** | ✅ Detailed comments | ✅ Good comments | Both well-documented | ✅ Good |
| **Examples** | ❌ Few examples | ✅ Has examples section | Minor | 🟡 Could sync |
| **Coverage** | ✅ Superset (FE+BE) | ✅ Backend-focused | Root is superset | ✅ Good |

**Verdict**: ✅ No major conflicts. Root is canonical. Serverless is backend subset.

**Recommendation**: Add comment to serverless/.env.example pointing to root for frontend vars.

#### Minor Templates Analysis

**`.env.local.example`**:
- **Purpose**: Local development overrides
- **Issue**: May duplicate root .env.example
- **Action**: Review content - if minimal/empty, delete. If has useful local-only examples, keep with clear docs.

**`serverless/.env.staging.example`**:
- **Purpose**: Staging environment configuration
- **Value**: Useful for multi-environment deployment
- **Action**: Keep if staging deployment is used. Document in deployment guides.

**`server/.env.example`**:
- **Status**: Depends on server/ directory decision
- **Action**: If server/ is archived, archive this too. Otherwise, investigate purpose.

**`orchestrator/.env.example`**:
- **Status**: Depends on orchestrator/ investigation
- **Action**: Keep if orchestrator is active system. Document relationship to main app.

**`client/.env.sanity.example`**:
- **Content**: Single line (SANITY_PROJECT_ID)
- **Action**: If Sanity unused, archive. If used, merge into root .env.example for completeness.

### Environment Variables Coverage Matrix

**Critical Production Variables** (from discovery report):

| Variable | Root .env.example | serverless/.env.example | Missing From |
|----------|-------------------|------------------------|--------------|
| DATABASE_URL | ✅ | ✅ | - |
| JWT_SECRET | ✅ | ✅ | - |
| AWS_REGION | ✅ | ✅ | - |
| FRONTEND_URL | ✅ | ✅ | - |
| API_BASE_URL | ✅ | ✅ | - |
| MEDIA_BUCKET | ✅ | ✅ | - |
| VITE_API_BASE | ✅ | ❌ | serverless (expected) |
| ENABLE_REGISTRATION | ✅ | ✅ | - |
| ALLOWED_USER_EMAILS | ✅ | ✅ | - |

**Verdict**: ✅ All critical variables documented in root file.

### Recommended Single Source of Truth Approach

**Proposal**:

1. **Primary**: Root `.env.example` (197 lines)
   - Comprehensive (frontend + backend)
   - Well-documented
   - Single source for all variables
   - Cross-reference other env files

2. **Secondary**: `serverless/.env.example` (114 lines)
   - Backend-focused subset
   - Deployment-specific guidance
   - Add header: "For frontend variables, see root .env.example"

3. **Optional**: `serverless/.env.staging.example`
   - Keep if staging deployment active
   - Document in deployment guides

4. **Archive**:
   - `.env.local.example` (if duplicate/minimal)
   - `server/.env.example` (if server/ archived)
   - `client/.env.sanity.example` (if Sanity unused)

**Benefits**:
- ✅ Clear hierarchy (root is canonical)
- ✅ No duplication of critical variables
- ✅ Environment-specific files for deployment needs
- ✅ Reduced confusion for new developers

---

## 6. Duplicate Configs Analysis

### Prisma Schema Duplication

**Critical Finding**: Two Prisma schemas with size difference

| Schema Location | Size (bytes) | Status | Classification | Risk |
|-----------------|--------------|--------|----------------|------|
| `api/prisma/schema.prisma` | 14,003 | ⚠️ Unclear | Candidate Consolidation | 🔴 High |
| `serverless/prisma/schema.prisma` | 13,742 | ✅ Active | Core | 🔴 High |

**Size Difference**: 261 bytes (1.9% difference)

**⚠️ Critical Risk**: Even small schema differences can cause:
- Data corruption
- Migration conflicts
- Runtime errors
- Deployment failures

**Required Actions** (HIGH PRIORITY):

1. **🚨 URGENT: Diff the schemas**
   ```bash
   diff -u api/prisma/schema.prisma serverless/prisma/schema.prisma
   ```
   - Identify all differences
   - Determine which is canonical
   - Check git history for divergence point

2. **Investigate ownership**
   - Check which schema is used in production deployments
   - Check CI/CD scripts (which schema do they reference?)
   - Check package.json scripts (which prisma commands point where?)

3. **Resolution options**:
   - **Option A**: Delete api/prisma/, use serverless/prisma/ only
   - **Option B**: Symlink api/prisma/schema.prisma → serverless/prisma/schema.prisma
   - **Option C**: Keep separate if intentional (document why!)
   - **Option D**: Create shared prisma/ at root, symlink from both

4. **Safety measures**:
   - DO NOT delete without diff and confirmation
   - Backup both schemas before any changes
   - Run full test suite after consolidation
   - Verify all migrations apply to consolidated schema

**Recommended Approach**:
1. Diff schemas and identify canonical version
2. If api/ is just for migrations: Document clearly or consolidate
3. If schemas must be separate: Add validation in CI/CD to ensure they stay in sync
4. If one is obsolete: Archive with explanation

### Package.json Dependency Duplication

**Prisma Version Mismatch**:

| Location | @prisma/client | prisma (dev) | Issue |
|----------|----------------|--------------|-------|
| Root | 6.18.0 | - | Frontend (shouldn't need Prisma?) |
| serverless/ | 6.19.0 | 6.19.0 | Backend (correct) |
| server/ | 6.18.0 | - | Legacy? (if server/ is unused) |
| api/ | 6.18.0 | 6.18.0 | Schema management only |

**Classification**: 🟡 Medium Risk  
**Issues**:
1. Version mismatch (6.18.0 vs 6.19.0) could cause client/server incompatibility
2. Root package.json has Prisma (frontend shouldn't access DB directly)

**Actions**:
1. **Align Prisma versions** to 6.19.0 across all package.json files
2. **Remove @prisma/client from root** if not actually used by frontend
3. **If server/ is legacy**: Remove its package.json or archive entire directory

**Redis Client Duplication**:

| Location | Redis Package | Purpose | Issue |
|----------|---------------|---------|-------|
| serverless/ | ioredis 5.8.2 | Rate limiting, sessions | Production |
| server/ | redis 5.9.0 | Rate limiting, sessions | Legacy? |

**Classification**: 🟢 Low Risk (if server/ is deprecated)  
**Action**: If server/ is archived, this resolves automatically.

**Sanity Client Duplication**:

| Location | @sanity/client | Purpose | Issue |
|----------|----------------|---------|-------|
| Root | 6.29.1 | Frontend integration? | Unused in src/? |
| sanity/project-valine/ | (via sanity 3.69.5) | Sanity Studio | Correct |

**Classification**: 🟢 Low Risk  
**Action**: Audit root package.json - if @sanity/client is unused, remove it.

### Other Potential Duplicates (None Found)

✅ **PostCSS configs**: Only one found (root postcss.config.js)  
✅ **Alias definitions**: Only jsconfig.json (Vite uses this)  
✅ **Tailwind configs**: Only one found (root tailwind.config.js)  
✅ **Serverless configs**: Two intentional (pv-api and valine-api services)

**Verdict**: No problematic config duplication beyond Prisma schemas and package.json versions.

---

## 7. High-Risk Items Summary

### 🔴 Critical Risk (Immediate Action Required)

| Item | Risk | Impact | Urgency | Action |
|------|------|--------|---------|--------|
| **Prisma schema divergence** | Data corruption | 🔴 Critical | 🚨 Immediate | Diff schemas, identify canonical, consolidate |
| **serverless/ backend** | Production API | 🔴 Critical | - | Keep, document thoroughly |
| **src/ frontend** | Production UI | 🔴 Critical | - | Keep, document thoroughly |
| **Backend architecture clarity** | Deployment errors | 🔴 High | ⚠️ High | Document which backend is active (serverless/) |

### 🟡 Medium Risk (High Priority)

| Item | Risk | Impact | Urgency | Action |
|------|------|--------|---------|--------|
| **server/ directory** | Confusion, accidental deploy | 🟡 Medium | ⚠️ High | Investigate usage, archive if legacy |
| **api/ directory** | Schema management confusion | 🟡 Medium | ⚠️ High | Clarify purpose or consolidate with serverless/ |
| **Missing auditions/scripts routes** | Incomplete features | 🟡 Medium | 🟡 Medium | Investigate if in development or deprecated |
| **Prisma version mismatch** | Runtime errors | 🟡 Medium | 🟡 Medium | Align to 6.19.0 across all package.json |
| **orchestrator/ purpose** | Unclear dependencies | 🟡 Medium | 🟡 Medium | Document architecture and integration |

### 🟢 Low Risk (Lower Priority)

| Item | Risk | Impact | Urgency | Action |
|------|------|--------|---------|--------|
| **43 root MD files** | Repository clutter | 🟢 Low | 🟢 Low | Move 38 files to docs/, keep 5 in root |
| **Sanity CMS usage** | Unused dependencies | 🟢 Low | 🟢 Low | Document usage or archive if unused |
| **logs/ committed** | Repository bloat | 🟢 Low | 🟢 Low | Add to .gitignore if not intentional |
| **frontend/ CI scripts** | Misorganization | 🟢 Low | 🟢 Low | Move to .github/workflows/ or scripts/ |
| **Environment file cleanup** | Minor confusion | 🟢 Low | 🟢 Low | Archive unnecessary .env.* files |

---

## 8. Action Plan by Priority

### Priority 1: Critical Infrastructure (Week 1)

**Must complete before any other changes**

#### Action 1.1: Prisma Schema Audit 🚨
- **Risk**: 🔴 Critical (data corruption)
- **Effort**: 2-4 hours
- **Owner**: Backend engineer + DBA review
- **Steps**:
  1. Run: `diff -u api/prisma/schema.prisma serverless/prisma/schema.prisma`
  2. Document all differences in a report
  3. Check git blame for divergence point
  4. Review serverless deployment scripts (which schema is deployed?)
  5. Identify canonical schema
  6. Create backup of both schemas
  7. Consolidate (delete one, symlink, or document separation)
  8. Add CI check to prevent future divergence if keeping both
  9. Run full test suite
  10. Update documentation

**Safety Checklist**:
- [ ] Full database backup created
- [ ] Both schemas backed up to docs/archive/
- [ ] Diff report reviewed by 2+ engineers
- [ ] Migration plan documented
- [ ] Rollback plan prepared
- [ ] Test suite passes
- [ ] No production deployment until verified

#### Action 1.2: Backend Architecture Documentation
- **Risk**: 🔴 High (deployment confusion)
- **Effort**: 3-4 hours
- **Owner**: Backend engineer
- **Steps**:
  1. Create `docs/architecture/backend-architecture.md`
  2. Document: serverless/ is production backend
  3. Document: server/ status (legacy/dev/deprecated)
  4. Document: api/ purpose (schema management only?)
  5. Document: infra/ purpose (infrastructure utilities)
  6. Update README.md with architecture summary
  7. Create decision log: why serverless over express

**Deliverables**:
- [ ] docs/architecture/backend-architecture.md created
- [ ] README.md updated with backend section
- [ ] Decision documented (serverless vs express)

#### Action 1.3: server/ Directory Investigation
- **Risk**: 🟡 Medium (if accidentally deployed)
- **Effort**: 2-3 hours
- **Owner**: Backend engineer
- **Steps**:
  1. Check git log: when was server/ last actively developed?
  2. Search codebase: any references to server/ in CI/CD?
  3. Check docs: any mention of Express backend?
  4. Interview team: is anyone using server/ locally?
  5. Make decision: Archive, Document, or Keep
  6. If archive: Move to `archive/server_express/` with README
  7. If keep: Document purpose clearly in README and architecture docs

**Decision Tree**:
```
Is server/ used in production? 
  ├─ YES → Document purpose, keep
  └─ NO → Is it used for local dev?
      ├─ YES → Document clearly, keep
      └─ NO → Archive to archive/server_express/
```

### Priority 2: Repository Organization (Week 2)

#### Action 2.1: Root Documentation Cleanup
- **Risk**: 🟢 Low
- **Effort**: 2-3 hours
- **Owner**: Technical writer or documentation agent
- **Steps**:
  1. Create directories:
     - `docs/archive/phases/`
     - `docs/evidence/` (with subdirs: a11y, auth, analytics, backend, moderation, performance, seo)
  2. Move 10 phase files to `docs/archive/phases/`
  3. Move 16 implementation summaries to `docs/evidence/`
  4. Move 5 deployment guides to `docs/deployment/`
  5. Archive 4 PR artifacts to `docs/archive/pr-artifacts/`
  6. Move `docs_agents_AUTOMATION_PLAYBOOK.md` to `docs/agents/automation-playbook.md`
  7. Check for broken links in all moved files
  8. Update links in remaining files
  9. Verify only 5 files remain in root: README, CHANGELOG, CONTRIBUTING, SECURITY, PROJECT_STATUS
  10. Commit with clear message listing all moves

**Before/After**:
- Before: 43 MD files in root
- After: 5 MD files in root (88% reduction)

#### Action 2.2: Configuration File Organization
- **Risk**: 🟢 Low
- **Effort**: 1 hour
- **Owner**: DevOps engineer
- **Steps**:
  1. Move `github_workflows_lighthouse.yml` to `.github/workflows/lighthouse.yml`
  2. Investigate `amplify.yml` - delete if unused, document if intentional
  3. Consider moving `strip-api-prefix.js` to `infra/cloudfront/` or `scripts/`
  4. Update any references to moved files
  5. Test CI/CD after moving workflow file

#### Action 2.3: Environment File Cleanup
- **Risk**: 🟢 Low
- **Effort**: 1-2 hours
- **Owner**: DevOps engineer
- **Steps**:
  1. Add cross-reference comment to `serverless/.env.example`: "For frontend vars, see root .env.example"
  2. Review `.env.local.example` - delete if duplicate/minimal
  3. Document `serverless/.env.staging.example` in deployment guides or remove if unused
  4. If server/ is archived: Archive `server/.env.example` too
  5. If Sanity is unused: Archive `client/.env.sanity.example`
  6. Update deployment documentation with environment setup guide

### Priority 3: Code Cleanup (Week 3)

#### Action 3.1: Missing Handler Routes Investigation
- **Risk**: 🟡 Medium (incomplete features)
- **Effort**: 3-4 hours
- **Owner**: Backend engineer
- **Steps**:
  1. Review `auditions.js` handler code
  2. Check README - is this listed as complete or in-progress?
  3. Check project management - is this planned or deprecated?
  4. Decision: Add routes, mark as incomplete, or archive
  5. Repeat for `scripts.js`
  6. Review `requests.js` and `uploads.js` - likely safe to archive
  7. Document findings in `docs/backend/handler-audit.md`
  8. Update README if features are incomplete

**Decision Matrix**:
- If in active development → Document as incomplete in README
- If deprecated → Archive to `archive/handlers/`
- If ready → Add routes to serverless.yml

#### Action 3.2: Dependency Cleanup
- **Risk**: 🟡 Medium
- **Effort**: 2-3 hours
- **Owner**: Frontend + Backend engineers
- **Steps**:
  1. Align Prisma to 6.19.0 in all package.json files
  2. Check if `@prisma/client` is used in src/ (frontend)
     - If not used: Remove from root package.json
  3. Check if `@sanity/client` is used in src/
     - If not used: Remove from root package.json
  4. If server/ is archived: Note that redis vs ioredis issue is resolved
  5. Run `npm audit` and address any vulnerabilities
  6. Run `npm install` in all directories to update lock files
  7. Test builds: frontend and backend
  8. Run test suites

**Safety Checklist**:
- [ ] Prisma versions aligned
- [ ] Frontend build succeeds
- [ ] Backend build succeeds
- [ ] All tests pass
- [ ] No new npm audit issues

#### Action 3.3: Unclear Directories Investigation
- **Risk**: 🟡 Medium
- **Effort**: 4-6 hours
- **Owner**: Multiple team members
- **Steps**:
  1. **orchestrator/**:
     - Document purpose and architecture
     - Document Discord bot integration
     - Decide: Keep as part of repo or extract to separate repo
     - If keeping: Add `orchestrator/README.md`
  2. **sanity/** and **client/**:
     - Check if Sanity CMS is used anywhere
     - If unused: Archive both directories
     - If used: Document integration in README and architecture docs
  3. **frontend/ci/**:
     - Move CI scripts to `.github/workflows/` or `scripts/`
     - Delete empty `frontend/` directory
  4. **ops/**:
     - Document purpose
     - Check for overlap with `scripts/`
     - Consolidate if duplicate, document if different purpose
  5. **logs/**:
     - Determine if intentional evidence logs or accidental commits
     - If evidence: Keep and document in README
     - If accidental: Add to .gitignore, remove from repo (careful: check if needed for compliance)

### Priority 4: Documentation Excellence (Week 4)

#### Action 4.1: Architecture Documentation
- **Risk**: 🟢 Low
- **Effort**: 4-6 hours
- **Owner**: Senior engineer + technical writer
- **Steps**:
  1. Create `docs/architecture/` directory
  2. Create `docs/architecture/overview.md` with high-level system diagram
  3. Create `docs/architecture/frontend-architecture.md`
     - Vite React SPA
     - S3 hosting + CloudFront CDN
     - Component structure
     - State management
  4. Create `docs/architecture/backend-architecture.md` (expand from 1.2)
     - AWS Lambda handlers
     - API Gateway
     - Prisma + PostgreSQL
     - Redis (if used)
  5. Create `docs/architecture/deployment-architecture.md`
     - CI/CD pipeline
     - Environment strategy (prod/staging)
     - Infrastructure as code
  6. Add diagrams (use mermaid or ascii art)
  7. Link from README.md

#### Action 4.2: Documentation Index
- **Risk**: 🟢 Low
- **Effort**: 2-3 hours
- **Owner**: Technical writer or documentation agent
- **Steps**:
  1. Create `docs/README.md` as documentation index
  2. List all 30 subdirectories with descriptions
  3. Create quick-start guide with links
  4. Add "Find documentation by topic" section
  5. Link to key docs (deployment, architecture, API reference)
  6. Update root README.md to link to docs/README.md

#### Action 4.3: README.md Enhancement
- **Risk**: 🟢 Low
- **Effort**: 2-3 hours
- **Owner**: Project lead or technical writer
- **Steps**:
  1. Add "Repository Structure" section explaining monorepo
  2. Document which directories are active vs deprecated
  3. Add architecture diagram (link to docs/architecture/)
  4. Clarify backend approach (serverless) and why
  5. Document feature completeness (83% per discovery)
  6. Add clear getting-started section
  7. Link to comprehensive docs in docs/

### Priority 5: Ongoing Maintenance (Continuous)

#### Action 5.1: Automated Dependency Updates
- **Risk**: 🟢 Low
- **Effort**: 2-3 hours setup, ongoing maintenance
- **Owner**: DevOps engineer
- **Steps**:
  1. Enable Dependabot or Renovate for automated PRs
  2. Configure update frequency (weekly recommended)
  3. Set up auto-merge for patch versions (optional)
  4. Configure grouping (e.g., all Prisma updates together)
  5. Add dependency update policy to CONTRIBUTING.md

#### Action 5.2: CI/CD Enhancements
- **Risk**: 🟢 Low
- **Effort**: 3-4 hours
- **Owner**: DevOps engineer
- **Steps**:
  1. If keeping both Prisma schemas: Add CI check to ensure they match
  2. Add root directory file count check (prevent MD file sprawl)
  3. Add unused dependency detection (e.g., depcheck)
  4. Ensure all workflows are in `.github/workflows/` (check for strays)
  5. Document CI/CD pipeline in `docs/ci/`

#### Action 5.3: Test Coverage Improvement
- **Risk**: 🟢 Low
- **Effort**: Ongoing
- **Owner**: All engineers
- **Steps**:
  1. Current: 45% coverage (from discovery report)
  2. Target: 70%+ coverage for critical paths
  3. Focus areas:
     - Auth handlers (high risk)
     - User/profile handlers (high risk)
     - Media upload handlers (high risk)
  4. Add coverage reporting to CI/CD
  5. Set coverage thresholds (fail if drops below 40%)
  6. Monthly coverage review and improvement

---

## Safety Notes

### ⚠️ Before Making Any Changes

1. **Create a branch**: Never work directly on main
2. **Backup critical files**:
   - Both Prisma schemas
   - All package.json files
   - Root .env.example
3. **Review with team**: Get human approval for:
   - Archiving any directory
   - Deleting any code
   - Consolidating schemas
4. **Test thoroughly**:
   - Run full test suite
   - Build frontend and backend
   - Deploy to staging before production

### 🚨 High-Risk Operations (Require Extra Caution)

1. **Prisma schema consolidation**
   - Risk: Data corruption
   - Mitigation: Database backup, thorough diff, test migrations, staged rollout

2. **Archiving server/ or api/ directories**
   - Risk: Breaking local dev environments, missing dependencies
   - Mitigation: Team communication, check for references, staged approach

3. **Dependency version changes**
   - Risk: Breaking changes, runtime errors
   - Mitigation: Read changelogs, test thoroughly, rollback plan

4. **Environment file changes**
   - Risk: Missing configuration in deployment
   - Mitigation: Compare all env files before changes, update deployment docs

### ✅ Safe Operations (Low Risk)

1. **Moving documentation files**
   - Risk: Broken links
   - Mitigation: Update links, use find/grep to check for references

2. **Moving config files to standard locations**
   - Risk: Breaking CI/CD
   - Mitigation: Test CI/CD after move, update references

3. **Adding documentation**
   - Risk: None
   - Mitigation: None needed

---

## Next Steps

After completing this classification matrix:

1. **Review and Approve**: Have team review this classification and approve action plan
2. **Prioritize**: Confirm priority order (adjust if needed for business needs)
3. **Assign**: Assign actions to team members with appropriate expertise
4. **Execute**: Complete Priority 1 actions before moving to Priority 2
5. **Track Progress**: Update this document as actions are completed
6. **Document Decisions**: Record all major decisions in `docs/decisions/` (ADRs)

---

## Appendix: Quick Reference Tables

### Files to Keep in Root (5 files)

| File | Purpose | Justification |
|------|---------|---------------|
| README.md | Primary documentation | GitHub standard, must be in root |
| CHANGELOG.md | Version history | Standard location for changelogs |
| CONTRIBUTING.md | Contributor guidelines | GitHub standard location |
| SECURITY.md | Security policy | GitHub standard, auto-detected |
| PROJECT_STATUS.md | High-level status | High-visibility, valuable in root |

### Files to Move (38 files)

| Destination | Count | Files |
|-------------|-------|-------|
| docs/archive/phases/ | 10 | ALL_PHASES*, PHASE_*.md, PHASES_*.md |
| docs/evidence/ | 16 | *_IMPLEMENTATION*.md, *_SUMMARY.md |
| docs/deployment/ | 5 | DEPLOYMENT_*.md, CLOUDFRONT_*.md |
| docs/archive/pr-artifacts/ | 4 | DRAFT_PR_PAYLOAD.md, PR_*.md, DOCS_PARITY_REPORT.md |
| docs/agents/ | 1 | docs_agents_AUTOMATION_PLAYBOOK.md |

### Directories Requiring Investigation (8 directories)

| Directory | Primary Question | Decision Criteria |
|-----------|------------------|-------------------|
| server/ | Is this still used? | Check git history, team usage, deployment |
| api/ | Why separate from serverless/? | Check schema usage, migration scripts |
| orchestrator/ | Part of main app or separate? | Check integration, consider extraction |
| sanity/ | Is Sanity CMS used? | Check frontend integration |
| client/ | Just Sanity or something else? | Check contents, consider rename |
| frontend/ | Why not in .github/workflows/? | Move CI scripts to standard location |
| ops/ | Overlaps with scripts/? | Check for duplication, consolidate |
| logs/ | Intentional or accidental? | Check if evidence logs or should be gitignored |

---

**End of Phase 1 Classification Matrix**

**Next Phase**: Phase 2 - Execution (Begin with Priority 1 actions)
