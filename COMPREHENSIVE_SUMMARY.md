# Project Valine - Comprehensive Summary

**For Agents, New Chat Sessions, and Contributors**

> 📍 This document provides a complete overview of the Project Valine repository. Use it as your starting point to understand the codebase, architecture, and current state.

**Last Updated:** November 29, 2025  
**Repository:** [gcolon75/Project-Valine](https://github.com/gcolon75/Project-Valine)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Repository Structure](#repository-structure)
4. [Key Files Quick Reference](#key-files-quick-reference)
5. [Scripts Documentation](#scripts-documentation)
6. [Recent Changes & PRs](#recent-changes--prs)
7. [Current Status](#current-status)
8. [Getting Started](#getting-started)
9. [Documentation Navigation](#documentation-navigation)
10. [For AI Agents](#for-ai-agents)

---

## Project Overview

### What is Project Valine (Joint)?

**Joint** is a **LinkedIn-style collaborative platform** for voice actors, writers, and artists. The platform enables creative professionals to:

- **Create and share** scripts, auditions, and creative content
- **Build professional profiles** with portfolio links, bios, and work samples
- **Connect with others** in the creative industry
- **Manage collaborations** through messaging and notifications

### Key Characteristics

| Aspect | Description |
|--------|-------------|
| **Platform Type** | Professional networking for creatives |
| **Target Users** | Voice actors, writers, artists |
| **Hosting** | AWS serverless infrastructure |
| **Automation** | Discord bot orchestration (Rin) |
| **Status** | Production-ready (83% complete) |

### Technology Stack

- **Frontend**: React 18, Vite 5, Tailwind CSS 3, React Router v6
- **Backend**: Node.js 20.x, Serverless Framework v3, AWS Lambda
- **Database**: PostgreSQL (Prisma ORM), DynamoDB (orchestrator state)
- **Infrastructure**: AWS S3, CloudFront, API Gateway, SSM Parameter Store
- **Caching**: Redis with in-memory fallback
- **Orchestrator**: Python 3.11, AWS SAM, Discord Bot API
- **CMS**: Sanity CMS for structured content
- **CI/CD**: GitHub Actions with AWS OIDC

---

## Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USER BROWSER                                │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ React + Vite Frontend (S3 + CloudFront)                         │    │
│  │ - Tailwind CSS styling                                          │    │
│  │ - React Router v6 for navigation                                │    │
│  │ - API fallback to mock data                                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │ HTTPS
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         AWS API GATEWAY                                   │
│  ┌──────────────────────┐  ┌──────────────────────┐                      │
│  │ Serverless API       │  │ Orchestrator API     │                      │
│  │ (REST endpoints)     │  │ (Discord webhook)    │                      │
│  └──────────┬───────────┘  └──────────┬───────────┘                      │
└─────────────┼─────────────────────────┼──────────────────────────────────┘
              │                         │
              ▼                         ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│ AWS LAMBDA (Node.js)    │  │ AWS LAMBDA (Python)     │
│ /serverless             │  │ /orchestrator           │
│ - Auth endpoints        │  │ - Discord bot (Rin)     │
│ - Profile management    │  │ - CI/CD automation      │
│ - Prisma ORM            │  │ - Deployment triggers   │
└────────────┬────────────┘  └────────────┬────────────┘
             │                            │
             ▼                            ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│ PostgreSQL (Prisma)     │  │ DynamoDB                │
│ - User accounts         │  │ - Bot state             │
│ - Profiles              │  │ - Audit logs            │
│ - Profile links         │  │ - Session data          │
└─────────────────────────┘  └─────────────────────────┘
```

### Component Breakdown

#### 1. Frontend (`/src`, `/client`, `/frontend`)
- **React 18** with Vite 5 for fast development
- **Tailwind CSS 3** for styling
- **React Router v6** for client-side routing
- Static hosting via **S3 + CloudFront**
- Automatic fallback to mock data when API unavailable

#### 2. Serverless Backend (`/serverless`)
- **Canonical production API** - This is the primary backend
- AWS Lambda functions with API Gateway
- Prisma ORM for PostgreSQL database access
- **Key file**: `serverless/src/db/client.js` - Prisma client initialization
- Rate limiting, CSRF protection, 2FA support

#### 3. Orchestrator (`/orchestrator`)
- Discord bot named "Rin" with specialized agent personalities
- Python 3.11 with AWS SAM
- Commands: `/deploy-client`, `/diagnose`, `/triage`, `/status`
- DynamoDB for state management

#### 4. Infrastructure (`/infra`)
- CloudFront functions for SPA routing
- S3 bucket configurations
- WAF rules (currently detached for troubleshooting)

#### 5. API Utilities (`/api`)
- Prisma schema definitions
- Database migrations
- Seed scripts

> **⚠️ Important:** If a `/server` directory exists, it contains **legacy development stubs only** and should NOT be deployed to production. The serverless backend is the canonical API.

---

## Repository Structure

```
Project-Valine/
├── 📄 COMPREHENSIVE_SUMMARY.md    # This file - start here!
├── 📄 README.md                   # Main project documentation
├── 📄 PROJECT_STATUS.md           # Current readiness (83% complete)
├── 📄 CHANGELOG.md                # Version history and recent changes
├── 📄 CONTRIBUTING.md             # Contribution guidelines
├── 📄 SECURITY.md                 # Security policies
│
├── 📁 src/                        # React frontend source
│   ├── components/                # Reusable UI components
│   ├── pages/                     # Page components
│   ├── routes/                    # Route definitions
│   ├── services/                  # API services
│   ├── hooks/                     # React hooks
│   ├── context/                   # React contexts
│   └── utils/                     # Utility functions
│
├── 📁 serverless/                 # ⭐ CANONICAL BACKEND
│   ├── handler.js                 # Main API router
│   ├── serverless.yml             # Serverless Framework config
│   ├── src/
│   │   ├── db/client.js           # Prisma client (key file)
│   │   ├── handlers/              # Lambda handlers
│   │   ├── middleware/            # Express-style middleware
│   │   └── utils/                 # Backend utilities
│   ├── prisma/                    # Database schema
│   └── tests/                     # Backend tests
│
├── 📁 orchestrator/               # Discord bot & automation
│   ├── app/                       # Bot application code
│   │   ├── handlers/              # Lambda handlers
│   │   ├── agents/                # Agent implementations
│   │   └── services/              # External service clients
│   ├── template.yaml              # SAM template
│   └── tests/                     # Bot tests
│
├── 📁 infra/                      # Infrastructure code
│   └── cloudfront/                # CloudFront functions
│
├── 📁 api/                        # API utilities
│   └── prisma/                    # Prisma schema & migrations
│
├── 📁 docs/                       # 📚 Documentation hub (~548 MD files)
│   ├── README.md                  # Documentation index
│   ├── SUMMARY.md                 # Complete doc listing
│   ├── api/                       # API reference docs
│   ├── backend/                   # Backend guides
│   ├── frontend/                  # Frontend guides
│   ├── security/                  # Security docs
│   ├── qa/                        # Testing & QA
│   ├── ux/                        # UX audit & design
│   ├── deployment/                # Deployment guides
│   ├── troubleshooting/           # Issue resolution
│   ├── runbooks/                  # Operational procedures
│   └── archive/                   # Historical docs
│
├── 📁 scripts/                    # Utility scripts
│   ├── README.md                  # Scripts documentation
│   ├── deployment/                # Deployment automation
│   ├── verify-*.js                # Verification scripts
│   ├── check-*.js                 # Diagnostic scripts
│   └── admin-*.mjs                # Admin utilities
│
├── 📁 tests/                      # Test suites
│   ├── e2e/                       # Playwright E2E tests
│   └── unit/                      # Unit tests
│
├── 📁 public/                     # Static assets
├── 📁 sanity/                     # Sanity CMS config
└── 📁 archive/                    # Archived files
```

---

## Key Files Quick Reference

### Core Configuration

| File | Purpose |
|------|---------|
| `package.json` | Root dependencies and scripts |
| `vite.config.js` | Vite build configuration |
| `tailwind.config.js` | Tailwind CSS configuration |
| `.env.example` | Environment variable template |
| `.env.production` | Production environment config |

### Backend (Serverless)

| File | Purpose |
|------|---------|
| `serverless/serverless.yml` | Serverless Framework config |
| `serverless/handler.js` | Main API router |
| `serverless/src/db/client.js` | **Prisma client initialization** (recently fixed) |
| `serverless/prisma/schema.prisma` | Database schema (shadowed) |
| `api/prisma/schema.prisma` | **Canonical** Prisma schema |

### Frontend

| File | Purpose |
|------|---------|
| `src/App.jsx` | Root React component |
| `src/main.jsx` | React entry point |
| `src/routes/` | Route definitions |
| `index.html` | HTML entry point |

### Orchestrator (Discord Bot)

| File | Purpose |
|------|---------|
| `orchestrator/template.yaml` | SAM template |
| `orchestrator/app/handlers/` | Lambda handlers |
| `orchestrator/samconfig.toml` | SAM deployment config |

### Documentation

| File | Purpose |
|------|---------|
| `README.md` | Main project README |
| `PROJECT_STATUS.md` | Current status & readiness |
| `CHANGELOG.md` | Version history |
| `docs/README.md` | Documentation index |
| `SECRETS_MANAGEMENT.md` | Environment variables guide |

---

## Scripts Documentation

### Build & Development

```bash
npm run dev           # Start dev server (Vite, localhost:5173)
npm run build         # Production build
npm run preview       # Preview production build
npm run test          # Run tests (watch mode)
npm run test:run      # Run tests once
npm run test:coverage # Generate coverage report
```

### Pre-Deployment & Validation

```bash
node scripts/verify-predeploy.mjs      # Pre-deployment checks
node scripts/verify-env-contract.mjs   # Validate env vars
node scripts/secret-audit.mjs          # Scan for secrets
node scripts/prisma-optimize.mjs       # Optimize Prisma binaries
```

### API & Auth Diagnostics

```bash
node scripts/validate-api-base.js      # Validate API config
node scripts/scan-api-base.js          # Scan for stale hosts
node scripts/check-auth-backend.js     # Auth connectivity check
```

### Deployment

```bash
./scripts/deployment/deploy-backend.sh    # Deploy serverless backend
./scripts/deployment/deploy-frontend.sh   # Deploy frontend to S3
./scripts/verify-deployment.sh            # Verify deployment
```

### Admin & Maintenance

```bash
node scripts/admin-set-password.mjs    # Set user password
node scripts/admin-upsert-user.mjs     # Create/update user
node scripts/setup-test-users.mjs      # Create test accounts
```

### Testing & Analysis

```bash
node scripts/analyze-test-failures.mjs # Analyze test results
node scripts/generate-sri.js           # Generate SRI hashes
npm run verify:sri                     # Verify SRI integrity
```

---

## Recent Changes & PRs

### Current PR: Prisma Client Synchronous Initialization Fix

**Status:** In Progress  
**Files Changed:**
- `serverless/src/db/client.js` - Fixed synchronous initialization
- `serverless/tests/degraded-mode.test.js` - Added tests

**Problem:** Login attempts were failing with 503 errors due to Prisma Client not being initialized properly at Lambda cold start.

**Solution:** 
- Added synchronous loading of PrismaClient at module load time using `createRequire`
- Falls back to async loading if synchronous load fails
- `getPrisma()` now works synchronously when PrismaClient is pre-loaded
- Added comprehensive degraded mode with in-memory user store for outages

### Recent Major Updates (PRs 155-287)

| Date | PRs | Category | Summary |
|------|-----|----------|---------|
| Nov 2025 | 287 | Backend | Profile record creation fix |
| Nov 2025 | 181-185 | Security | Rate limiting, CSRF, 2FA, audit logging |
| Nov 2025 | 186-187 | QA | Verification infrastructure, regression tests |
| Nov 2025 | 173-182 | Onboarding | 6-step profile builder, profile links API |
| Oct 2025 | 88-90 | Discord | Lambda deployment cache fix |

### Key Milestones

1. **Security Hardening (PRs 181-185)**
   - CSRF protection on all state-changing endpoints
   - Rate limiting (5 attempts/15min login, 100 req/15min API)
   - 2FA with TOTP and recovery codes
   - Audit logging with retention policies

2. **Onboarding (PRs 173-182)**
   - 6-step profile builder wizard
   - Profile links normalization (GitHub, LinkedIn, etc.)
   - Theme preference API

3. **Verification Infrastructure (PRs 186-187)**
   - Post-merge verification scripts
   - Playwright E2E tests (accessibility, visual regression, CSP)

---

## Current Status

### Production Readiness: 83% Complete

| Category | Status | Notes |
|----------|--------|-------|
| Authentication | ✅ Ready | Login, register, 2FA, session management |
| Onboarding | ✅ Ready | 6-step wizard, profile links |
| Dashboard | ✅ Ready | Feed, posts, with mock fallback |
| Profiles | ✅ Ready | View, edit, links, theme |
| Security | 🟡 Partial | CSP in report-only mode |
| Real-time | 🟡 Planned | WebSocket for Phase 11 |

### Test Coverage

- **107 unit tests** - 45% coverage, 100% pass rate
- **E2E tests** - Accessibility, visual regression, CSP compliance
- **Build time**: 3.4s | **Test time**: 6.5s | **CI**: < 2 min

### Known Limitations

1. **CSP not enforced** - Report-only mode until Q1 2026
2. **Real-time features** - Using mock data, WebSocket planned
3. **Production database** - Needs AWS RDS or Supabase configuration

---

## Getting Started

### For Development

```bash
# 1. Clone and install
git clone https://github.com/gcolon75/Project-Valine.git
cd Project-Valine
npm install

# 2. Configure environment
cp .env.local.example .env

# 3. Start development server
npm run dev
# Opens http://localhost:5173
```

### For Backend Development

```bash
# 1. Install serverless dependencies
cd serverless
npm install

# 2. Configure database
export DATABASE_URL="postgresql://user:pass@host:5432/db"

# 3. Generate Prisma client
npm run prisma:generate

# 4. Run locally
npx serverless invoke local -f api
```

### For Deployment

```bash
# Pre-deployment checks
node scripts/verify-predeploy.mjs

# Deploy backend
./scripts/deployment/deploy-backend.sh --stage dev

# Deploy frontend
./scripts/deployment/deploy-frontend.sh --bucket valine-frontend
```

---

## Documentation Navigation

### Entry Points

| Document | When to Use |
|----------|-------------|
| [README.md](README.md) | General overview, quick start |
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | Current readiness, risks, next steps |
| [docs/README.md](docs/README.md) | Full documentation index |
| [CHANGELOG.md](CHANGELOG.md) | Recent changes, version history |

### By Topic

| Topic | Location |
|-------|----------|
| Security | `docs/security/`, `SECURITY.md`, `SECRETS_MANAGEMENT.md` |
| API Reference | `docs/api/`, `serverless/API_DOCUMENTATION.md` |
| Deployment | `docs/deployment/`, `docs/ops/` |
| Testing | `docs/qa/`, `TESTING_GUIDE.md` |
| Troubleshooting | `docs/troubleshooting/`, `docs/white-screen-runbook.md` |
| UX/Design | `docs/ux/`, `docs/frontend/` |
| Orchestrator | `orchestrator/README.md`, `orchestrator/docs/` |

### Quick Links

- **Auth Issues?** → [AUTH_RECOVERY_CHECKLIST.md](AUTH_RECOVERY_CHECKLIST.md)
- **White Screen?** → [docs/white-screen-runbook.md](docs/white-screen-runbook.md)
- **Discord Bot?** → [orchestrator/README.md](orchestrator/README.md)
- **API Problems?** → [docs/API_BASE_VALIDATION.md](docs/API_BASE_VALIDATION.md)

---

## For AI Agents

### Understanding the Codebase

When working on this repository:

1. **Start with this file** (`COMPREHENSIVE_SUMMARY.md`) for context
2. **Check `PROJECT_STATUS.md`** for current state and risks
3. **The serverless backend** (`/serverless`) is the canonical API
4. **The Express server** (`/server`) is legacy - don't deploy it
5. **Documentation is in `docs/`** - 548 markdown files organized by topic

### Common Tasks

| Task | Key Files |
|------|-----------|
| Fix backend issue | `serverless/src/`, `serverless/handler.js` |
| Update frontend | `src/components/`, `src/pages/` |
| Database changes | `api/prisma/schema.prisma` |
| Add API endpoint | `serverless/src/handlers/` |
| Discord bot changes | `orchestrator/app/` |
| Documentation | `docs/`, root `.md` files |

### Important Patterns

1. **Prisma Client**: Use `getPrisma()` for synchronous access (after module load)
2. **API Fallback**: Frontend automatically uses mock data when API unavailable
3. **Degraded Mode**: Backend has in-memory fallback when database is unavailable
4. **Authentication**: JWT tokens with 15-min access, 7-day refresh
5. **Error Handling**: Structured logging with correlation IDs

### Testing Changes

```bash
# Frontend tests
npm run test

# Backend tests
cd serverless && npm test

# E2E tests
npm run test:e2e

# Pre-commit validation
node scripts/verify-predeploy.mjs
```

### Documentation Updates

When updating docs:
1. Update relevant `docs/` files
2. Update `docs/README.md` index if adding new docs
3. Update `CHANGELOG.md` for significant changes
4. Update this summary if architecture changes

---

## Support & Resources

- **GitHub Issues**: [Project Issues](https://github.com/gcolon75/Project-Valine/issues)
- **Discord**: Real-time support via bot commands
- **Documentation**: 548 markdown files in `docs/`

---

*This document was created to help AI agents, new contributors, and chat sessions quickly understand the Project Valine codebase. Keep it updated when making significant changes.*
