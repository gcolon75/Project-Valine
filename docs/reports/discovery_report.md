# Phase 0 Discovery Report: Project Valine Repository Maintenance

**Report Date:** November 13, 2025  
**Repository:** Project Valine  
**Purpose:** Comprehensive repository discovery and assessment for maintenance and organization effort

---

## Executive Summary

Project Valine is an **83% complete, production-ready** LinkedIn-style collaborative platform for voice actors, writers, and artists. The repository contains a **Vite React frontend** deployed to S3/CloudFront and an **AWS Lambda serverless backend** with Prisma ORM and PostgreSQL.

### Key Findings
- **43 root-level markdown files** creating documentation sprawl
- **252 documentation files** in organized `docs/` structure (good)
- **Multiple overlapping directories**: `api/`, `server/`, `serverless/`, with `serverless/` being the active backend
- **5 package.json files** indicating monorepo structure with some confusion
- **9 environment template files** with variations across directories
- **2 serverless.yml configurations**: main API (serverless/) and infra utilities (infra/)
- **28 Lambda handler files** mapped to 80+ API routes

---

## 1. Directory Enumeration

### Top-Level Directory Structure

| Directory | Purpose | Size | Status |
|-----------|---------|------|--------|
| **src/** | Active Vite React frontend source | 1.4M | ✅ Active - Primary frontend |
| **serverless/** | Active AWS Lambda API handlers | 1.2M | ✅ Active - Primary backend |
| **server/** | Express.js server (legacy/dev?) | 584K | ⚠️ Unclear - Potential duplicate |
| **api/** | Prisma schema only | 168K | ⚠️ Unclear - Schema management? |
| **client/** | Minimal Sanity CMS integration | 20K | ⚠️ Unclear - Separate client? |
| **frontend/** | CI scripts only | 28K | ⚠️ Unclear - Just CI configs? |
| **docs/** | Organized documentation | - | ✅ Well-structured |
| **archive/** | Historical backups | - | ✅ Properly archived |
| **tests/** | E2E test suites | - | ✅ Active testing |
| **scripts/** | Build/deploy automation | - | ✅ Active utilities |
| **infra/** | Infrastructure as code | - | ✅ Active - S3 presign lambda |
| **orchestrator/** | Discord bot & agents | - | ⚠️ Large, unclear usage |
| **sanity/** | Sanity CMS project | - | ⚠️ Usage unclear (projectId: f57vovth) |
| **public/** | Static assets | - | ✅ Active - Vite public dir |
| **logs/** | Agent/verification logs | - | ⚠️ Should be gitignored? |
| **patches/** | Package patches | - | ✅ Dependency fixes |
| **ops/** | Operations scripts | - | ⚠️ Purpose unclear |

### Observations: Redundant/Unclear Structures

1. **Three backend-looking directories**: `api/`, `server/`, `serverless/`
   - **Active**: `serverless/` (contains handlers, serverless.yml, deployed to Lambda)
   - **Unclear**: `server/` (Express server with package.json - dev server? deprecated?)
   - **Unclear**: `api/` (only Prisma schema - why separate from serverless/prisma?)

2. **Two frontend-looking directories**: `src/`, `client/`
   - **Active**: `src/` (main Vite React app)
   - **Unclear**: `client/` (only Sanity CMS config - why called "client"?)

3. **Minimal directory**: `frontend/`
   - Contains only `ci/` subdirectory with scripts
   - Purpose unclear - why not in `.github/workflows/` or `scripts/`?

4. **Large orchestrator directory**
   - Contains Discord bot, agent prompts, triage agents
   - Appears to be a separate autonomous agent system
   - May warrant its own repository or clearer documentation

---

## 2. Configuration Files Inventory

### Serverless Configurations

#### Primary API: `serverless/serverless.yml` (652 lines)
- **Service**: `pv-api`
- **Runtime**: Node.js 20.x
- **Region**: us-west-2
- **Stage**: prod (from env)
- **Functions**: 80+ Lambda handlers
- **Key Routes**:
  - Health: `/health`, `/meta`
  - Auth: `/auth/*` (register, login, logout, 2FA, sessions)
  - Users: `/users`, `/users/{id}`
  - Profiles: `/profiles/*`
  - Reels: `/reels/*`
  - Posts: `/posts/*`
  - Media: `/media/*`, `/profiles/{id}/media/*`
  - Connections: `/connections/*`
  - Conversations: `/conversations/*`
  - Notifications: `/notifications/*`
  - Reports/Moderation: `/reports/*`, `/moderation/*`
  - Analytics: `/analytics/*`
  - Internal tools: `/internal/*` (PR intel, observability, schema diff, synthetic journeys)

#### Infrastructure: `infra/serverless.yml` (45 lines)
- **Service**: `valine-api`
- **Runtime**: Node.js 20.x
- **Functions**: 1 (presign for S3 uploads)
- **Resources**: S3 bucket for uploads
- **Route**: `/uploads/presign`

**Finding**: Two separate serverless deployments, which is intentional for separation of concerns (main API vs infrastructure utilities).

### Build & Bundler Configs

| File | Purpose | Location | Notes |
|------|---------|----------|-------|
| `vite.config.js` | Vite bundler config | Root | ✅ Active - includes API base validation |
| `vitest.config.js` | Vitest test runner | Root | ✅ Active - test configuration |
| `postcss.config.js` | PostCSS processor | Root | ✅ Active - Tailwind integration |
| `tailwind.config.js` | Tailwind CSS config | Root | ✅ Active - design system |
| `playwright.config.js` | Playwright E2E tests | Root | ✅ Active - 64 test files found |

### TypeScript/JavaScript Configs

| File | Purpose | Location | Notes |
|------|---------|----------|-------|
| `jsconfig.json` | JS path aliases | Root | ✅ Active - `@/` alias for src |
| `sanity/project-valine/tsconfig.json` | Sanity TypeScript | sanity/ | ⚠️ Sanity CMS usage unclear |

**Observation**: Main app uses JavaScript (JSX), not TypeScript. Only Sanity CMS uses TypeScript.

### Sanity CMS Configs

| File | Purpose | Status |
|------|---------|--------|
| `sanity/project-valine/sanity.config.ts` | Sanity studio config | ⚠️ ProjectId: f57vovth |
| `sanity/project-valine/sanity.cli.ts` | Sanity CLI config | ⚠️ Dataset: production |
| `client/.env.sanity.example` | Sanity env template | ⚠️ Purpose unclear |

**Finding**: Sanity CMS is configured but its role in the application is unclear. No obvious integration in frontend code. May be deprecated or planned feature.

### Environment Template Files

Found **9 environment template files** across the repository:

| File | Location | Lines | Purpose | Status |
|------|----------|-------|---------|--------|
| `.env.example` | Root | 197 | Complete frontend + backend config | ✅ Primary template |
| `.env.local.example` | Root | ? | Local development overrides | ⚠️ Minimal/duplicate? |
| `serverless/.env.example` | serverless/ | 114 | Serverless-specific config | ✅ Backend reference |
| `serverless/.env.staging.example` | serverless/ | ? | Staging environment | ⚠️ Needs assessment |
| `server/.env.example` | server/ | ? | Express server config | ⚠️ If server/ is unused, remove |
| `orchestrator/.env.example` | orchestrator/ | ? | Discord bot config | ⚠️ Separate system |
| `client/.env.sanity.example` | client/ | 1 line | Sanity project ID | ⚠️ If Sanity unused, remove |
| `archive/client_backup/.env.example` | archive/ | ? | Archived config | ✅ Properly archived |
| `archive/client_backup/.env.sample` | archive/ | ? | Archived config | ✅ Properly archived |

**Observations**:
- Root `.env.example` is comprehensive (197 lines) and appears canonical
- `serverless/.env.example` has good backend documentation (114 lines)
- Multiple overlapping configs suggest confusion about which to use
- Staging-specific example suggests multi-environment deployment

### Other Config Files

| File | Purpose | Notes |
|------|---------|-------|
| `amplify.yml` | AWS Amplify deployment | ⚠️ Deployed to S3/CloudFront, not Amplify? |
| `github_workflows_lighthouse.yml` | Lighthouse CI workflow | ⚠️ Why not in `.github/workflows/`? |
| `.markdownlintrc` | Markdown linting rules | ✅ Documentation quality |
| `strip-api-prefix.js` | CloudFront function | ✅ Strips /api prefix for routing |

---

## 3. Lambda Handler Route Manifest

### Handler File Inventory

**Location**: `serverless/src/handlers/`  
**Count**: 28 handler files

| Handler File | Primary Functions | Routes |
|--------------|-------------------|--------|
| `health.js` | Health check | `GET /health` |
| `meta.js` | Metadata endpoint | `GET /meta` |
| `auth.js` | Authentication | `POST /auth/register`, `/auth/login`, `GET /auth/me`, `POST /auth/verify-email`, `/auth/resend-verification`, `/auth/refresh`, `/auth/logout`, `/auth/2fa/*` |
| `sessions.js` | Session management | `GET /auth/sessions`, `POST /auth/logout-session` |
| `users.js` | User CRUD | `POST /users`, `GET /users/{username}`, `PUT /users/{id}` |
| `profiles.js` | Profile management | `GET /profiles/{vanityUrl}`, `GET /profiles/id/{id}`, `POST /profiles`, `PUT /profiles/id/{id}`, `DELETE /profiles/id/{id}` |
| `media.js` | Media upload/access | `POST /profiles/{id}/media/upload-url`, `/profiles/{id}/media/complete`, `PUT /media/{id}`, `DELETE /media/{id}`, `GET /media/{id}/access-url` |
| `credits.js` | Profile credits | `GET /profiles/{id}/credits`, `POST /profiles/{id}/credits`, `PUT /credits/{id}`, `DELETE /credits/{id}` |
| `reels.js` | Video reels | `GET /reels`, `POST /reels`, `POST /reels/{id}/like`, `/reels/{id}/bookmark`, `GET /reels/{id}/comments`, `POST /reels/{id}/comments` |
| `posts.js` | Posts (legacy?) | `POST /posts`, `GET /posts`, `GET /posts/{id}` |
| `conversations.js` | Messaging | `GET /conversations`, `POST /conversations`, `GET /conversations/{id}/messages`, `POST /conversations/{id}/messages` |
| `notifications.js` | Notifications | `GET /notifications`, `PATCH /notifications/{id}/read`, `/notifications/mark-all` |
| `connections.js` | User connections | `POST /connections/request`, `GET /connections/requests`, `POST /connections/requests/{id}/approve`, `/connections/requests/{id}/reject` |
| `search.js` | Search | `GET /search`, `GET /search/users` |
| `settings.js` | User settings | `GET /settings`, `PUT /settings`, `POST /account/export`, `DELETE /account` |
| `reelRequests.js` | Reel requests | `POST /reels/{id}/request`, `GET /reel-requests`, `POST /reel-requests/{id}/approve`, `/reel-requests/{id}/deny` |
| `reports.js` | Content reporting | `POST /reports`, `GET /reports`, `GET /reports/{id}` |
| `moderation.js` | Moderation actions | `POST /moderation/decision`, `GET /moderation/health` |
| `analytics.js` | Analytics events | `POST /analytics/ingest`, `GET /analytics/config`, `DELETE /analytics/events/cleanup` |
| `observability.js` | Internal observability | `POST /internal/observability/metrics`, `GET /internal/observability/metrics`, `/internal/observability/health`, `/internal/observability/stats`, `POST /internal/observability/log` |
| `prIntel.js` | PR intelligence | `POST /internal/pr-intel/ingest`, `GET /internal/pr-intel/{prNumber}` |
| `testIntel.js` | Test intelligence | `POST /internal/tests/ingest`, `GET /internal/tests/flaky-candidates` |
| `schemaDiff.js` | Schema diff analysis | `POST /internal/schema/diff` |
| `syntheticJourney.js` | Synthetic testing | `POST /internal/journey/run` |
| `auditions.js` | Auditions (core feature) | ⚠️ Routes not in serverless.yml - unused? |
| `requests.js` | Generic requests | ⚠️ Routes not in serverless.yml - unused? |
| `scripts.js` | Scripts feature | ⚠️ Routes not in serverless.yml - unused? |
| `uploads.js` | Uploads (separate from media) | ⚠️ Routes not in serverless.yml - unused? |

### Active vs Potentially Unused Handlers

**✅ Active (defined in serverless.yml)**: 24 handlers  
**⚠️ Potentially unused (not in serverless.yml)**: 4 handlers
- `auditions.js` - Core feature per README, but no routes defined
- `scripts.js` - Core feature per README, but no routes defined  
- `requests.js` - Generic name, may be deprecated
- `uploads.js` - Overlaps with `media.js`, may be deprecated

**Recommendation**: Investigate whether auditions/scripts handlers are incomplete features or need route definitions added to serverless.yml.

---

## 4. Dependency Analysis

### Package.json Files

Found **5 package.json files** in the monorepo:

#### 1. Root `package.json` (valine-client)
**Location**: `/package.json`  
**Name**: valine-client  
**Type**: module  
**Key Dependencies**:
- React 18.3.1, React Router 6.26.1
- Framer Motion 12.23.24 (animations)
- Axios 1.7.2 (HTTP client)
- DOMPurify 3.3.0 (XSS protection)
- Lucide React 0.548.0 (icons)
- @prisma/client 6.18.0
- @sanity/client 6.29.1

**Dev Dependencies**:
- Vite 4.3.1 (bundler)
- Vitest 4.0.6 (testing)
- Playwright 1.56.1 (E2E)
- Axe-core (a11y testing)
- Tailwind CSS (styling)

**Scripts**:
- `dev`, `build`, `preview` (Vite)
- `test`, `test:ui`, `test:coverage` (Vitest)
- `a11y:test`, `a11y:report` (Accessibility)
- `seo:generate`, `seo:build`, `seo:audit` (SEO)
- `visual:test`, `visual:update` (Visual regression)

#### 2. Serverless `package.json` (joint-api-serverless)
**Location**: `/serverless/package.json`  
**Name**: joint-api-serverless  
**Type**: module  
**Key Dependencies**:
- @prisma/client 6.19.0 (⚠️ version mismatch with root: 6.18.0)
- @aws-sdk/client-s3 3.637.0
- @aws-sdk/s3-request-presigner 3.637.0
- bcryptjs 3.0.3 (password hashing)
- jsonwebtoken 9.0.2 (JWT auth)
- ioredis 5.8.2 (Redis client)
- otplib 12.0.1 (2FA TOTP)

**Dev Dependencies**:
- serverless 3.39.0
- serverless-esbuild 1.52.1
- prisma 6.19.0

**Scripts**:
- `deploy`, `remove` (Serverless Framework)
- `prisma:generate`, `prisma:migrate`, `prisma:deploy`

#### 3. Server `package.json` (valine-server)
**Location**: `/server/package.json`  
**Name**: valine-server  
**Type**: module  
**Key Dependencies**:
- Express 4.19.2 (REST server)
- @prisma/client 6.18.0
- bcryptjs 3.0.3
- jsonwebtoken 9.0.2
- cors 2.8.5
- helmet 8.1.0 (security headers)
- express-rate-limit 8.2.1
- redis 5.9.0 (⚠️ different from serverless ioredis)
- nodemailer 7.0.10
- otplib 12.0.1
- qrcode 1.5.4

**Scripts**:
- `dev` (nodemon), `start` (node)
- `test`, `test:server` (vitest)

**Observation**: This appears to be a duplicate backend. Contains same auth/DB dependencies as serverless. If not in use, consider archiving.

#### 4. API `package.json` (valine-api)
**Location**: `/api/package.json`  
**Name**: valine-api  
**Type**: module  
**Dependencies**:
- @prisma/client 6.18.0

**Dev Dependencies**:
- prisma 6.18.0

**Scripts**:
- `prisma:generate`, `prisma:migrate`
- `seed` (node prisma/seed.js)
- `migrate:social-links`, `migrate:social-links:dry-run`

**Observation**: This appears to be solely for Prisma schema management and migrations. May have been separated for clarity but creates confusion.

#### 5. Sanity `package.json` (project-valine)
**Location**: `/sanity/project-valine/package.json`  
**Name**: project-valine  
**Dependencies**:
- sanity 3.69.5
- react 18.3.1
- styled-components 6.1.15

**Observation**: Sanity CMS studio. Usage in application unclear.

### Dependency Issues & Inconsistencies

| Issue | Impact | Recommendation |
|-------|--------|----------------|
| **Prisma version mismatch** | Root uses 6.18.0, serverless uses 6.19.0 | Align to same version |
| **Redis client duplication** | Server uses `redis`, serverless uses `ioredis` | Choose one, or document why both |
| **Duplicate auth dependencies** | Both server/ and serverless/ have bcryptjs, jsonwebtoken, otplib | If server/ is unused, remove it |
| **Multiple package managers?** | All use npm (package-lock.json present) | ✅ Consistent |

### Potentially Unused Dependencies

**Analysis needed**: Compare package.json to actual imports in code.

From import analysis of `src/`:
- Heavy use of React, React Router, Axios
- DOMPurify imported for sanitization
- Framer Motion used for animations
- Lucide React for icons

**Suspicious**:
- `@prisma/client` in root package.json - frontend shouldn't access DB directly
- `@sanity/client` in root package.json - no obvious Sanity usage in src/

**Recommendation**: Audit Prisma and Sanity dependencies in root package.json. May be legacy or incorrectly placed.

---

## 5. Environment Variables Inventory

### Backend Variables (from serverless code)

**Source**: `serverless/src/` code analysis and `serverless.yml`

| Variable | Purpose | Required | Notes |
|----------|---------|----------|-------|
| `DATABASE_URL` | PostgreSQL connection | ✅ Yes | Prisma |
| `JWT_SECRET` | JWT signing key | ✅ Yes | Auth |
| `AWS_REGION` | AWS deployment region | ✅ Yes | Default: us-west-2 |
| `STAGE` | Environment stage | No | Default: prod |
| `NODE_ENV` | Node environment | No | Default: production |
| `FRONTEND_URL` | Frontend origin | ✅ Yes | CORS, cookies |
| `API_BASE_URL` | API base URL | ✅ Yes | Internal calls |
| `COOKIE_DOMAIN` | Cookie scope | No | Default: CloudFront domain |
| `MEDIA_BUCKET` | S3 media bucket | ✅ Yes | File uploads |
| `ENABLE_REGISTRATION` | Allow signup | No | Default: false (owner-only) |
| `ALLOWED_USER_EMAILS` | Email allowlist | No | CSV list (owner-only auth) |
| `EMAIL_ENABLED` | SMTP email sending | No | Default: false |
| `TWO_FACTOR_ENABLED` | 2FA features | No | Default: false |
| `CSRF_ENABLED` | CSRF protection | No | Default: false |
| `RATE_LIMITING_ENABLED` | Rate limiting | No | Default: true |
| `REDIS_URL` | Redis connection | No | For rate limiting |
| `ANALYTICS_ENABLED` | Analytics tracking | No | Default: false |
| `ANALYTICS_REQUIRE_CONSENT` | GDPR consent | No | Default: true |
| `ANALYTICS_PERSIST_ENABLED` | Store events in DB | No | Default: true |
| `ANALYTICS_STORAGE_DRIVER` | Storage backend | No | postgres or dynamodb |
| `ANALYTICS_RETENTION_DAYS` | Data retention | No | Default: 30 |
| `ANALYTICS_ALLOWED_EVENTS` | Event whitelist | No | CSV list |
| `ANALYTICS_SAMPLING_RATE` | Event sampling | No | 0.0-1.0, default: 1.0 |
| `MODERATION_ENABLED` | Content moderation | No | Default: false |
| `MODERATION_STRICT_MODE` | Strict moderation | No | Default: false |
| `REPORTS_ENABLED` | User reporting | No | Default: true |
| `OBSERVABILITY_ENABLED` | Internal metrics | No | Default: true |
| `PR_INTEL_ENABLED` | PR intelligence | No | Default: false |
| `FLAKY_DETECTOR_ENABLED` | Test tracking | No | Default: false |
| `SCHEMA_DIFF_ENABLED` | Schema analysis | No | Default: false |
| `SYNTHETIC_JOURNEY_ENABLED` | Synthetic tests | No | Default: false |

### Frontend Variables (from src/ code)

**Source**: `src/` code analysis (Vite environment)

| Variable | Purpose | Required | Notes |
|----------|---------|----------|-------|
| `VITE_API_BASE` | Backend API URL | ✅ Yes | Validated in vite.config.js |
| `VITE_API_INTEGRATION` | Enable real API | No | Default: false (use mocks) |
| `VITE_ENABLE_AUTH` | Cookie-based auth | No | Default: false |
| `VITE_ENABLE_REGISTRATION` | Show signup UI | No | Must match backend |
| `VITE_CSRF_ENABLED` | CSRF tokens | No | Auto-enabled with auth |
| `VITE_USE_SESSION_TRACKING` | Session management UI | No | Default: false |
| `VITE_TWO_FACTOR_ENABLED` | 2FA UI | No | Default: false |
| `VITE_ENABLE_PROFILE_LINKS_API` | Profile links API | No | Default: false |
| `VITE_OBSERVABILITY_ENABLED` | Observability tracking | No | Default: false |
| `VITE_SEO_ENABLED` | SEO features | No | Default: true (inferred) |
| `VITE_COGNITO_USER_POOL_ID` | Cognito pool (legacy?) | No | May be deprecated |
| `VITE_COGNITO_CLIENT_ID` | Cognito client (legacy?) | No | May be deprecated |
| `VITE_COGNITO_REGION` | Cognito region (legacy?) | No | May be deprecated |

### Inconsistencies Between .env Examples

**Root `.env.example`** (197 lines):
- Comprehensive, well-documented
- Includes both frontend (VITE_*) and backend vars
- Has detailed comments explaining each variable
- Appears to be canonical reference

**`serverless/.env.example`** (114 lines):
- Backend-focused
- Good documentation
- Missing some frontend variables (expected)
- Includes examples at the end

**Overlaps & Conflicts**:
- No major conflicts identified
- Root file is superset of serverless file
- Both are well-maintained

**Recommendation**: Keep both files, but add a comment to serverless/.env.example pointing to root for frontend vars.

---

## 6. Documentation Files Assessment

### Root-Level Markdown Files

**Count**: 43 markdown files in repository root

**Breakdown by Category**:

#### Implementation Summaries (16 files)
- A11Y_IMPLEMENTATION_SUMMARY.md
- ACCOUNT_CREATION_SUMMARY.md
- ANALYTICS_IMPLEMENTATION_EVIDENCE.md
- ANALYTICS_SECURITY_SUMMARY.md
- FRONTEND_SECURITY_HARDENING.md
- FRONTEND_SECURITY_IMPLEMENTATION.md
- IMPLEMENTATION_COMPLETE.md
- IMPLEMENTATION_SUMMARY.md
- MODERATION_MVP_SUMMARY.md
- OWNER_ONLY_AUTH_SUMMARY.md
- PERFORMANCE_CACHING_IMPLEMENTATION.md
- REST_API_IMPLEMENTATION_SUMMARY.md
- SEO_IMPLEMENTATION_COMPLETE.md
- TASK_EXECUTION_SUMMARY.md
- PHASE_*_IMPLEMENTATION.md (multiple)

#### Phase Tracking (10 files)
- ALL_PHASES_COMPLETE.md
- PHASES_1_3_COMPLETE.md
- PHASES_STATUS.md
- PHASE_1_COMPLETE.md
- PHASE_2_3_AUTH_IMPLEMENTATION.md
- PHASE_4_FRONTEND_AUTH_IMPLEMENTATION.md
- PHASE_5_MEDIA_UPLOAD_IMPLEMENTATION.md
- PHASE_6_IMPLEMENTATION_COMPLETE.md
- PHASE_7_COMPLETE.md
- PHASE_GROUP_A_IMPLEMENTATION.md

#### Security & Audit (3 files)
- SECURITY.md
- SECURITY_AUDIT_REPORT.md
- PHASE_1_SECURITY_SUMMARY.md

#### Deployment Guides (5 files)
- DEPLOYMENT_CHECKLIST.md
- DEPLOYMENT_CHECKLIST_OWNER_AUTH.md
- DEPLOYMENT_GUIDE.md
- OWNER_ONLY_AUTH_DEPLOYMENT.md
- CLOUDFRONT_FUNCTION_GUIDE.md

#### PR/Status Docs (4 files)
- DRAFT_PR_PAYLOAD.md
- PR_DESCRIPTION.md
- PR_SUMMARY.md
- PROJECT_STATUS.md

#### Core Documentation (3 files)
- README.md ✅ (Primary project documentation)
- CHANGELOG.md
- CONTRIBUTING.md

#### Miscellaneous (2 files)
- DOCS_PARITY_REPORT.md
- docs_agents_AUTOMATION_PLAYBOOK.md

### Organized Documentation (`docs/`)

**Count**: 252 markdown files in `docs/`

**Subdirectories** (30 subdirectories):
- a11y/ - Accessibility documentation
- agents/ - Agent configurations and prompts
- analytics/ - Analytics implementation
- api/ - API documentation
- archive/ - Archived/deprecated docs
- backend/ - Backend implementation
- ci/ - CI/CD pipelines
- compliance/ - Legal/compliance docs
- deployment/ - Deployment guides
- diagnostics/ - Troubleshooting
- evidence/ - Implementation evidence
- frontend/ - Frontend architecture
- guides/ - How-to guides
- moderation/ - Content moderation
- ops/ - Operations runbooks
- performance/ - Performance optimization
- privacy/ - Privacy documentation
- qa/ - Quality assurance
- quickstart/ - Getting started guides
- reference/ - API reference
- release/ - Release notes
- review/ - Code review guidelines
- runbooks/ - Operational runbooks
- security/ - Security documentation
- seo/ - SEO implementation
- troubleshooting/ - Debugging guides
- ui/ - UI/UX documentation
- ux/ - User experience docs
- verification/ - Verification logs

### Consolidation Opportunities

**High Priority** (reduce root clutter):

1. **Move phase tracking files** (10 files) → `docs/phases/` or `docs/archive/`
   - ALL_PHASES_COMPLETE.md
   - PHASE_*.md
   - PHASES_*.md

2. **Move implementation summaries** (16 files) → `docs/evidence/` or `docs/implementation/`
   - *_IMPLEMENTATION*.md
   - *_SUMMARY.md

3. **Move deployment guides** (5 files) → `docs/deployment/` (already exists)
   - DEPLOYMENT_*.md
   - OWNER_ONLY_AUTH_DEPLOYMENT.md
   - CLOUDFRONT_FUNCTION_GUIDE.md

4. **Move PR artifacts** (4 files) → `docs/archive/` or delete if obsolete
   - DRAFT_PR_PAYLOAD.md
   - PR_DESCRIPTION.md
   - PR_SUMMARY.md

5. **Move security docs** (2 files) → `docs/security/` (already exists)
   - SECURITY_AUDIT_REPORT.md
   - PHASE_1_SECURITY_SUMMARY.md

**Keep in Root**:
- README.md ✅
- CHANGELOG.md ✅
- CONTRIBUTING.md ✅
- SECURITY.md ✅
- PROJECT_STATUS.md ✅ (high-visibility status)

**Result**: Reduce root from 43 to 5 core files.

### Outdated/Redundant Documentation

**Candidates for Review**:
- Multiple "COMPLETE" files suggesting done phases
- Multiple "SUMMARY" files that may overlap
- DOCS_PARITY_REPORT.md - meta-documentation, archive?
- docs_agents_AUTOMATION_PLAYBOOK.md - should be in docs/agents/

**Recommendation**: 
1. Archive phase-complete files (historical record)
2. Consolidate overlapping summaries into PROJECT_STATUS.md
3. Move agent docs to proper location

---

## 7. Infrastructure & Deployment Context

### Current Production Setup

**Frontend**:
- **Hosting**: AWS S3 bucket `valine-frontend-prod`
- **CDN**: CloudFront distribution `E16LPJDBIL5DEE`
- **Domain**: `dkmxy676d3vgc.cloudfront.net`
- **Build**: Vite React SPA
- **Deployment**: Automated via CI/CD (inferred from scripts)

**Backend API**:
- **Compute**: AWS Lambda functions (prefix: `pv-api-prod-*`)
- **Gateway**: API Gateway (HTTP API with CORS)
- **Runtime**: Node.js 20.x
- **Region**: us-west-2
- **Functions**: 80+ Lambda handlers

**Database**:
- **Type**: PostgreSQL (inferred from Prisma config)
- **ORM**: Prisma 6.18.0-6.19.0
- **Schema**: Defined in `api/prisma/schema.prisma` and `serverless/prisma/schema.prisma`
- **Binary Targets**: Lambda-compatible (linux-arm64-openssl-3.0.x)

**Authentication**:
- **Mode**: Owner-only via `ALLOWED_USER_EMAILS`
- **Method**: JWT tokens (HttpOnly cookies when `ENABLE_AUTH=true`)
- **Registration**: Disabled (`ENABLE_REGISTRATION=false`)
- **Features**: 2FA (optional), CSRF protection (optional)

**Content Management**:
- **Sanity CMS**: Configured (projectId: f57vovth)
- **Usage**: Unclear - may be planned or deprecated

**File Storage**:
- **Bucket**: `valine-media-uploads` (S3)
- **Access**: Pre-signed URLs via Lambda

### Node Version Verification

**Specified**:
- `serverless.yml`: Node.js 20.x
- `infra/serverless.yml`: Node.js 20.x

**Recommendation**: Verify package.json engines field and CI/CD Node version match 20.x.

### Build Tool Verification

**Frontend**:
- Bundler: Vite 4.3.1
- Build command: `npm run build` → `vite build`
- Output: `dist/` directory (gitignored)

**Backend**:
- Bundler: serverless-esbuild 1.52.1
- Build command: `serverless deploy`
- Output: `.serverless/` directory (gitignored)

---

## 8. Additional Findings

### Test Infrastructure

**Test Files**: 64 test files found (*.test.js, *.spec.js, *.test.ts, *.spec.ts)

**Test Frameworks**:
- **Unit/Integration**: Vitest (107 tests, 45% coverage, 6.44s runtime)
- **E2E**: Playwright (a11y, visual regression, user journeys)
- **Accessibility**: Axe-core integration

**Test Scripts**:
- `npm test` - Run Vitest
- `npm run a11y:test` - Accessibility tests
- `npm run visual:test` - Visual regression

### CI/CD Workflows

**Files Found**:
- `github_workflows_lighthouse.yml` (⚠️ misplaced in root)
- `amplify.yml` (⚠️ deployed to S3, not Amplify)
- `.github/workflows/` (standard location, not checked in detail)

**Inferred Workflows**:
- Pull request checks
- Accessibility audits
- Lighthouse CI
- Security audits

### Logs Directory

**Found**: `logs/agent/`, `logs/verification/`

**Concern**: Logs should typically be gitignored, not committed.

**Check**: Verify if `.gitignore` excludes logs properly or if these are intentional evidence logs.

### Orchestrator System

**Size**: Large directory with multiple subsystems

**Components**:
- Discord bot integration
- Agent prompts (triage_agents/)
- SAM templates (AWS Serverless Application Model)
- Validation scripts

**Observation**: This appears to be a separate autonomous agent system. May deserve its own repository or clearer integration documentation.

### Prisma Schema Duplication

**Found**: Two Prisma schemas:
1. `api/prisma/schema.prisma` (14,003 bytes)
2. `serverless/prisma/schema.prisma` (13,742 bytes)

**Concern**: Schemas should be identical. Slight size difference suggests divergence.

**Recommendation**: 
1. Diff the two schemas
2. Identify canonical version
3. Remove duplicate or document why both exist
4. Consider symlinking if both are needed

---

## 9. Prioritized Action Items

### Phase 1: Critical Consolidation (Week 1)

1. **Verify Prisma schema parity**
   - Diff `api/prisma/schema.prisma` and `serverless/prisma/schema.prisma`
   - Merge or document differences
   - Establish single source of truth

2. **Clarify backend architecture**
   - Document whether `server/` is active or deprecated
   - If deprecated, archive to `archive/server/`
   - If active, document its purpose vs `serverless/`

3. **Clean up root directory**
   - Move 38 implementation/phase docs to `docs/`
   - Keep only 5 core files in root (README, CHANGELOG, CONTRIBUTING, SECURITY, PROJECT_STATUS)
   - Update links in moved files

4. **Align dependency versions**
   - Update Prisma to consistent version across all package.json files
   - Document Redis client strategy (redis vs ioredis)

### Phase 2: Unused Code Audit (Week 2)

5. **Investigate missing handler routes**
   - Add routes for `auditions.js`, `scripts.js` or mark as incomplete
   - Archive/remove `requests.js`, `uploads.js` if unused

6. **Audit frontend dependencies**
   - Check if `@prisma/client` in root package.json is used (shouldn't be)
   - Check if `@sanity/client` is actually used
   - Remove unused dependencies

7. **Sanity CMS decision**
   - Document current usage or planned usage
   - If unused, archive `sanity/` and `client/` directories
   - Update README accordingly

### Phase 3: Environment & Config Cleanup (Week 3)

8. **Consolidate environment templates**
   - Make root `.env.example` canonical
   - Add cross-references between templates
   - Remove or merge duplicate templates

9. **Organize config files**
   - Move `github_workflows_lighthouse.yml` to `.github/workflows/`
   - Document `amplify.yml` purpose (if not using Amplify)
   - Review `strip-api-prefix.js` CloudFront function

10. **Review .gitignore**
    - Ensure `logs/` is properly excluded (or document why committed)
    - Verify all build artifacts are excluded
    - Check for sensitive file patterns

### Phase 4: Documentation Excellence (Week 4)

11. **Update README.md**
    - Clarify monorepo structure
    - Document which directories are active
    - Add architecture diagram

12. **Create ARCHITECTURE.md**
    - Document frontend (src/) → Vite → S3/CloudFront
    - Document backend (serverless/) → Lambda → API Gateway
    - Document data flow and API integration

13. **Index docs/ directory**
    - Create `docs/README.md` with directory guide
    - Link to key documentation from root README
    - Ensure cross-links are up to date

### Phase 5: Long-term Maintenance (Ongoing)

14. **Orchestrator documentation**
    - Document Discord bot integration
    - Clarify agent system architecture
    - Consider extracting to separate repo

15. **Dependency audit automation**
    - Set up automated dependency updates (Dependabot/Renovate)
    - Configure security scanning (already have workflows)
    - Regular package.json audits

16. **Test coverage improvement**
    - Current: 45% coverage
    - Target: 70%+ coverage for critical paths
    - Add missing tests for handlers without route definitions

---

## 10. Risk Assessment

### High Risk Items

1. **Prisma schema divergence** - Could cause data corruption
2. **Unclear backend architecture** - Risk of deploying wrong code
3. **Missing handler routes** - Incomplete features may break

### Medium Risk Items

4. **Dependency version mismatches** - Potential runtime errors
5. **Root directory clutter** - Confusing for new contributors
6. **Unused dependencies** - Security vulnerabilities in unused code

### Low Risk Items

7. **Documentation organization** - No runtime impact
8. **Sanity CMS clarity** - Isolated subsystem
9. **Log file management** - Disk space only

---

## 11. Open Questions

1. **Is `server/` (Express) still in use?**
   - If yes: What's its purpose vs `serverless/`?
   - If no: Why not archived?

2. **Why two Prisma schemas?**
   - Is this intentional separation?
   - Which is canonical?

3. **What is Sanity CMS used for?**
   - Is it active, planned, or deprecated?
   - Should it be documented or removed?

4. **Are auditions/scripts handlers incomplete?**
   - These are core features per README
   - Why no routes in serverless.yml?

5. **What is the orchestrator's role?**
   - Is it part of the main app?
   - Should it be a separate repository?

6. **Why are logs committed to git?**
   - Are these evidence logs (intentional)?
   - Or should they be gitignored?

---

## 12. Recommendations Summary

### Immediate Actions (Do First)
1. ✅ Diff and merge Prisma schemas
2. ✅ Document or archive `server/` directory
3. ✅ Move 38 markdown files from root to `docs/`
4. ✅ Align Prisma versions across package.json files

### High-Value Actions (Do Soon)
5. ✅ Add routes for auditions/scripts or document incompleteness
6. ✅ Audit and remove unused frontend dependencies
7. ✅ Make root `.env.example` canonical with cross-references
8. ✅ Create `docs/README.md` index

### Quality-of-Life Improvements (Do When Possible)
9. ✅ Move misplaced workflow files
10. ✅ Review and update .gitignore
11. ✅ Add ARCHITECTURE.md
12. ✅ Document orchestrator system

### Long-term Maintenance (Ongoing)
13. ✅ Set up automated dependency updates
14. ✅ Improve test coverage to 70%+
15. ✅ Regular documentation reviews
16. ✅ Monorepo structure documentation

---

## Appendix A: File Counts

| Category | Count |
|----------|-------|
| Root .md files | 43 |
| `docs/` .md files | 252 |
| package.json files | 5 |
| .env template files | 9 |
| serverless.yml files | 2 |
| Lambda handlers | 28 |
| Test files | 64 |
| Total LOC (estimated) | ~50,000+ |

## Appendix B: Directory Tree (Top 2 Levels)

```
Project-Valine/
├── .github/          # GitHub workflows
├── api/              # ⚠️ Prisma schema only
├── archive/          # ✅ Historical backups
├── client/           # ⚠️ Sanity CMS config
├── docs/             # ✅ 252 organized docs
├── frontend/         # ⚠️ CI scripts only
├── infra/            # ✅ Infrastructure lambdas
├── logs/             # ⚠️ Committed logs?
├── ops/              # ⚠️ Operations scripts
├── orchestrator/     # ⚠️ Large agent system
├── public/           # ✅ Static assets
├── sanity/           # ⚠️ Sanity CMS project
├── scripts/          # ✅ Build/deploy scripts
├── server/           # ⚠️ Express server - unused?
├── serverless/       # ✅ Primary Lambda backend
├── src/              # ✅ Primary React frontend
└── tests/            # ✅ E2E test suites
```

**Legend**:
- ✅ Clear purpose, actively used
- ⚠️ Unclear purpose, needs investigation

---

## Appendix C: Environment Variable Quick Reference

### Production-Critical Variables

```bash
# Backend (Required)
DATABASE_URL=postgresql://...
JWT_SECRET=...
AWS_REGION=us-west-2
FRONTEND_URL=https://dkmxy676d3vgc.cloudfront.net
API_BASE_URL=https://dkmxy676d3vgc.cloudfront.net/api
MEDIA_BUCKET=valine-media-uploads

# Frontend (Required)
VITE_API_BASE=https://dkmxy676d3vgc.cloudfront.net/api

# Security (Recommended)
ENABLE_REGISTRATION=false
ALLOWED_USER_EMAILS=owner@example.com
RATE_LIMITING_ENABLED=true
CSRF_ENABLED=true (when using cookie auth)

# Features (Optional)
TWO_FACTOR_ENABLED=false
EMAIL_ENABLED=false
ANALYTICS_ENABLED=false
MODERATION_ENABLED=false
```

---

**End of Phase 0 Discovery Report**

**Next Steps**: Review this report, prioritize action items, and proceed with Phase 1 (Critical Consolidation).
