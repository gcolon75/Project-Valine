# Joint

A collaborative platform for voice actors, writers, and artists to create and share scripts, auditions, and creative content.

[![CI - Pull Request Check](https://github.com/gcolon75/Project-Valine/actions/workflows/ci-pr-check.yml/badge.svg)](https://github.com/gcolon75/Project-Valine/actions/workflows/ci-pr-check.yml)
[![Accessibility Audit](https://github.com/gcolon75/Project-Valine/actions/workflows/accessibility-audit.yml/badge.svg)](https://github.com/gcolon75/Project-Valine/actions/workflows/accessibility-audit.yml)
[![Lighthouse CI](https://github.com/gcolon75/Project-Valine/actions/workflows/lighthouse-ci.yml/badge.svg)](https://github.com/gcolon75/Project-Valine/actions/workflows/lighthouse-ci.yml)
[![Security Audit](https://github.com/gcolon75/Project-Valine/actions/workflows/security-audit.yml/badge.svg)](https://github.com/gcolon75/Project-Valine/actions/workflows/security-audit.yml)

---

## 📊 **[→ Project Status (Current Readiness, Security, QA)](PROJECT_STATUS.md)** ←

**Latest Update:** PRs 155-287 merged | **Status:** Production-Ready (83% Complete)  
**Security:** 2FA, CSRF, Rate Limits, CSP (Report-Only) | **Tests:** 107 (45% coverage)

---

> 📖 **New to Joint?** Start with:
> - **[docs/PROJECT_BIBLE.md](docs/PROJECT_BIBLE.md)** - **THE BIBLE** - Complete master reference and single source of truth
> - **[docs/backend/COMPREHENSIVE_SUMMARY.md](docs/backend/COMPREHENSIVE_SUMMARY.md)** - Backend comprehensive summary
> - **[PROJECT_STATUS.md](PROJECT_STATUS.md)** - Readiness, security posture, QA coverage
> - **[docs/](docs/README.md)** - Complete documentation index

## Table of Contents

- [Recent Changes](#recent-changes)
- [Overview](#overview)
- [Current Status](#current-status)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Secrets & Configuration](#secrets--configuration)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Available Routes](#available-routes)
- [Deployment & Verification](#deployment--verification)
- [CloudFront & SPA Routing](#cloudfront--spa-routing)
- [Documentation](#documentation)
- [Performance Optimizations](#performance-optimizations)
- [Contributing](#contributing)
- [Development](#development)
- [Technology Stack](#technology-stack)

## Recent Changes

### 🔧 Current PR: Prisma Client Synchronous Initialization Fix

**Problem:** Login attempts were failing with 503 errors due to Prisma Client not being initialized properly at Lambda cold start.

**Solution:**
- Added synchronous loading of PrismaClient at module load time using `createRequire`
- Falls back to async loading if synchronous load fails
- `getPrisma()` now works synchronously when PrismaClient is pre-loaded
- Added comprehensive degraded mode with in-memory user store for database outages

**Files Changed:**
- `serverless/src/db/client.js` - Fixed synchronous initialization
- `serverless/tests/degraded-mode.test.js` - Added tests for degraded mode

### Recent PRs (Nov 2025)

| PR | Category | Summary |
|----|----------|---------|
| #287 | Backend | Profile record creation fix |
| #181-185 | Security | Rate limiting, CSRF protection, 2FA support, audit logging |
| #186-187 | QA | Post-merge verification infrastructure, regression test suite |
| #173-182 | Onboarding | 6-step profile builder, profile links API, theme preferences |

See [CHANGELOG.md](CHANGELOG.md) for complete version history.

## Overview

Joint is a **LinkedIn-style collaborative platform** specifically designed for voice actors, writers, and artists. The platform enables creative professionals to create and share scripts, auditions, and creative content while managing collaboration workflows through an AWS-hosted serverless infrastructure with AI-powered automation via Discord bots.

### High-Level Goals

1. **Professional Networking** - User profiles, connections, content feeds
2. **Creative Content Management** - Script creation, audition submissions, collaborative workflows
3. **AI-Powered Automation** - Discord bot orchestration, automated deployments, intelligent triage
4. **AWS Cloud Infrastructure** - Serverless backend with Lambda, API Gateway, DynamoDB, S3, and CloudFront

## Current Status

✅ **Production-Ready** - 83% Complete (Phases 00-08 of 13)

> 🤖 **Autonomous Agent Build Complete!** See [AUTONOMOUS_AGENT_SUMMARY.md](docs/archive/historical/AUTONOMOUS_AGENT_SUMMARY-20251104.md) for comprehensive wrap-up, manual steps, and complete feature list.

### Recent Achievements (Autonomous Agent Build - Nov 2025)

- **✅ 107 Comprehensive Tests**: 45% code coverage, 100% pass rate, 6.44s execution time, zero flaky tests
- **✅ Complete API Integration**: Graceful fallback system with automatic mock data when API unavailable
- **✅ Secure Authentication**: Login/register with session management, dev bypass gated for production only
- **✅ CI/CD Pipelines**: Automated testing + deployment workflows (< 2 min build, < 3 min deploy)
- **✅ Analytics Infrastructure**: Complete event tracking system (`window.__analytics`)
- **✅ Network Resilience**: App works offline, optimistic updates with automatic rollback
- **✅ Diagnostics Logging**: Track API failures with `window.__diagnostics`

### What's Working Now

**Core Features:**
- ✅ User authentication (login, register, session management)
- ✅ Dashboard with posts feed (create, like, save, comment)
- ✅ Reels with video playback (keyboard nav, touch swipe, optimistic updates)
- ✅ Messages & Conversations (send, search, real-time ready)
- ✅ Notifications (mark as read, filter unread)
- ✅ User profiles (dynamic loading, fallback to mock)
- ✅ Dark/Light mode theme toggle
- ✅ Responsive design (mobile, tablet, desktop)

**Quality & Automation:**
- ✅ 107 automated tests prevent regressions
- ✅ CI/CD pipelines for automatic deployment
- ✅ 45% test coverage (hooks 100%, contexts 80%, components 40%, services 50%)
- ✅ Build time: 3.4s, Test time: 6.5s, Total CI: < 2 min

**Developer Experience:**
- ✅ Complete documentation (~100 KB of guides)
- ✅ Debug utilities (`window.__diagnostics`, `window.__analytics`)
- ✅ Test utilities and mocks ready for expansion
- ✅ Dev bypass for testing (development only)
- **Developer Tools**: Diagnostics logging, analytics tracking, API fallback monitoring

### Current Repository Mode

**Authentication Mode**: Owner-Only (Production)

The repository is configured for **owner-only** authentication mode, where:
- ✅ Registration restricted to allowlisted email addresses
- ✅ Email verification enforcement (partial stub)
- ✅ Analytics with privacy constraints (opt-in, limited events)
- ✅ SPA routing preserved (CloudFront function from PR #245)
- ✅ Structured logging with correlation IDs
- ✅ Diagnostic headers (X-Correlation-ID, X-Service-Version, X-Auth-Mode)

**Configuration**:
```bash
ENABLE_REGISTRATION=false
ALLOWED_USER_EMAILS=ghawk075@gmail.com,approved-users@example.com
STRICT_ALLOWLIST=1  # Production: requires 2+ emails
```

**Documentation**:
- [AUTH_RECOVERY_CHECKLIST.md](./AUTH_RECOVERY_CHECKLIST.md) - Troubleshooting guide
- [WORKING_STATE_SUMMARY.md](./WORKING_STATE_SUMMARY.md) - Current system status and working state
- See [docs/archive/](docs/archive/) for historical deployment guides

### Test Failure Triage Workflow

**Quick Triage**:
```bash
# Run tests with JSON reporter
cd serverless
npm test -- --reporter=json > test-results.json

# Analyze failures by category
node ../scripts/analyze-test-failures.mjs test-results.json
```

**Output Example**:
```
═══════════════════════════════════════
        TEST FAILURE ANALYSIS          
═══════════════════════════════════════

Total Failures: 48

Failures by Category:
─────────────────────────────────────
  MODERATION              22 failures
  AUTH                    15 failures
  VERIFICATION            8 failures
  ANALYTICS               3 failures

Top 3 Recurring Assertion Failures:
─────────────────────────────────────
  1. [12x] expected 401 to be 403
  2. [8x] expected 'Unauthorized' to be 'Access denied'
  3. [5x] Mock function not called
```

**Test Status** (Current):
- Total: 336 tests
- Passing: 278 tests
- Failing: 51 tests (pre-existing, unrelated to Phase 2)

**Categories**: auth, moderation, analytics, rate-limit, verification, orchestration, security

### Quick Links

- **[👉 Next Steps Guide](docs/guides/next-steps.md)** - Manual actions required for deployment
- **[🔐 Account Creation MVP](docs/ACCOUNT_CREATION_MVP.md)** - User signup and authentication
- **[📚 Complete Documentation](docs/)** - All docs organized by category
- [Latest Changes](CHANGELOG.md)
- [Quick Start Guide](docs/quickstart/README.md) - Get started in minutes
- [CI/CD Setup Guide](docs/CI-CD-SETUP.md) - Configure automated deployments
- [Deployment Guides](docs/deployment/) - Deploy to AWS and other platforms
- [Setup Discord Bot](orchestrator/README.md)
- [Troubleshooting](docs/troubleshooting/)

## What Users Can Do Right Now

### For All Users (Public Pages)
- ✅ Browse landing page with feature showcase
- ✅ Read about Joint and view features
- ✅ Switch between light/dark themes
- ✅ Create new account or sign in

### For Authenticated Users
- ✅ **Dashboard** - Personalized feed, connection suggestions, trending posts
- ✅ **Reels & Stories** - Watch/like/bookmark videos with keyboard/touch navigation
- ✅ **Networking** - Send/accept connection requests, browse suggested connections
- ✅ **Messaging** - View conversations, search, send messages
- ✅ **Notifications** - View/filter/mark as read, bulk actions
- ✅ **Posts** - Create posts with tags, like, save, comment, share
- ✅ **Profile** - View/edit profiles, upload avatar
- ✅ **Settings** - Toggle dark mode, manage preferences

### Behind the Scenes
- ✅ **API Fallback** - Graceful degradation with mock data when backend unavailable
- ✅ **Optimistic Updates** - Instant UI feedback with automatic rollback on error
- ✅ **Diagnostics** - All API failures logged (`window.__diagnostics` in console)
- ✅ **Analytics** - Event tracking ready (`window.__analytics` in console)
- ✅ **Automated Testing** - 107 tests run on every PR
- ✅ **CI/CD** - Automated builds and deployments (AWS setup required)

## Key Features

### Platform Features
- **Client Application**: React + Vite client with authentication and role-based access
- **User Profiles**: Portfolio management, connections, and professional networking
- **Content Management**: Sanity CMS for structured content
- **Messaging System**: Real-time communication between users
- **Script & Audition Management**: Create, share, and manage creative content

### Infrastructure & Automation
- **Serverless Backend**: AWS Lambda functions with API Gateway
- **Discord Bot Orchestrator**: Unified "Rin" bot with specialized agent personalities
  - Deployment automation (`/deploy-client`)
  - Infrastructure diagnostics (`/diagnose`, `/verify-latest`)
  - CI/CD triage (`/triage`)
  - Status reporting (`/status`, `/status-digest`)
- **DynamoDB Persistence**: State management with automatic TTL cleanup
- **GitHub Actions Integration**: Automated workflows for CI/CD
- **Staged Deployment**: Separate staging and production environments

## Architecture

### Frontend
- **Technology**: React 18 + Vite 5
- **Styling**: Tailwind CSS 3
- **Routing**: React Router v6
- **Deployment**: AWS S3 + CloudFront CDN

### Backend
- **API Framework**: Serverless Framework v3, AWS SAM
- **Runtime**: Node.js 20.x (API), Python 3.11 (Orchestrator)
- **Database**: DynamoDB (orchestrator state), Prisma ORM (API)
- **File Storage**: S3 with presigned URLs

> **⚠️ Important:** The **Serverless backend** (located in `/serverless`) is the canonical production/staging API. The Express routes in `/server` are legacy development stubs only and should NOT be deployed to staging or production environments.

### Orchestrator (Discord Bot)
- **Framework**: AWS SAM
- **Runtime**: Python 3.11
- **State Storage**: DynamoDB with TTL
- **Integrations**: Discord API, GitHub Actions API

### Key AWS Resources
- **S3**: Frontend hosting, file uploads, build artifacts
- **CloudFront**: CDN for global distribution
- **Lambda**: Serverless functions for API and orchestrator
- **API Gateway**: REST APIs for orchestrator and backend
- **DynamoDB**: State management and audit logs
- **SSM Parameter Store**: Configuration and feature flags

## Quick Start

### Prerequisites
- Node.js 20.x or later
- Python 3.11 (for orchestrator)
- AWS CLI configured (for deployment)
- Discord bot token (for orchestrator)
- GitHub personal access token (for orchestrator)

### Client Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API Connection:**
   
   Create a `.env` file (or `.env.local`) from the example:
   ```bash
   cp .env.local.example .env
   ```
   
   Update `VITE_API_BASE` with your backend URL:
   ```bash
   # For local development with serverless offline:
   VITE_API_BASE=http://localhost:3001
   
   # For deployed backend:
   VITE_API_BASE=https://your-api-id.execute-api.us-west-2.amazonaws.com/dev
   ```
   
   **Automatic Fallback:** If the API is unavailable, the frontend automatically falls back to mock data. Check diagnostics:
   ```javascript
   // In browser console:
   window.__diagnostics.summary()  // View API failure stats
   ```

3. **Start development server:**
   ```bash
   npm run dev
   # Opens on http://localhost:3000 (or http://localhost:5173)
   ```

4. **Build for production:**
   ```bash
   npm run build
   npm run preview  # Preview production build locally
   ```

5. **Development Tools & Monitoring:**
   
   The application includes built-in monitoring and debugging tools:
   
   ```javascript
   // Performance Monitoring (Core Web Vitals)
   window.__performanceMonitor.getMetrics()
   window.__performanceMonitor.reportMetrics()
   
   // API Diagnostics
   window.__diagnostics.summary()
   window.__diagnostics.getAll()
   
   // Analytics Tracking
   window.__analytics.getEvents()
   ```
   
   **Performance Audit:**
   ```bash
   npm run perf:audit         # Analyze build output
   npm run build:analyze      # Build and analyze in one command
   ```
   
   **Testing:**
   ```bash
   npm run test              # Run tests in watch mode
   npm run test:run          # Run tests once
   npm run test:coverage     # Run with coverage report
   ```

## Access Control & Security

### Email Allowlist Enforcement

**Joint uses an email-based allowlist to restrict account creation and application access to pre-approved users only.**

This security measure ensures that only authorized individuals can register, authenticate, and access protected features. The allowlist is enforced at multiple layers for defense in depth.

#### Current Configuration

The platform is restricted to **two authorized emails**:
- ghawk075@gmail.com
- valinejustin@gmail.com

#### How It Works

1. **Backend Enforcement** (Primary Security)
   - Registration attempts for non-allowlisted emails return `403 Forbidden`
   - Login attempts for non-allowlisted accounts are blocked
   - Enforcement happens BEFORE database writes
   - Structured logging tracks all denial events

2. **Frontend Gating** (UX Enhancement)
   - "Get Started" button hidden from marketing pages when allowlist active
   - `/join` route shows friendly restriction notice
   - Client-side validation prevents unnecessary API calls
   - Unauthenticated users don't trigger background polling

3. **Build-Time Validation**
   - `npm run build` validates allowlist configuration
   - Fails if required emails are missing
   - Prevents accidental misconfiguration in production

#### Configuration

**Backend** (`serverless.yml`):
```yaml
environment:
  ALLOWED_USER_EMAILS: ${env:ALLOWED_USER_EMAILS, "ghawk075@gmail.com,valinejustin@gmail.com"}
```

**Frontend** (`.env.production`):
```bash
VITE_ALLOWED_USER_EMAILS=ghawk075@gmail.com,valinejustin@gmail.com
```

**Local Development** (`.env`):
```bash
# Optional in dev - leave empty for open registration
VITE_ALLOWED_USER_EMAILS=ghawk075@gmail.com,valinejustin@gmail.com
```

#### Health Check

The `/health` endpoint reports allowlist status:
```bash
curl https://your-api.execute-api.us-west-2.amazonaws.com/health
```

Response includes:
```json
{
  "allowlistActive": true,
  "allowlistCount": 2,
  "allowlistMisconfigured": false
}
```

#### Documentation

For complete details on configuration, testing, rollback procedures, and troubleshooting:
- **[Access Control Allowlist Guide](docs/ACCESS_CONTROL_ALLOWLIST.md)** - Comprehensive documentation

### Backend Deployment

> **📌 Deployment Note:** Deploy the **Serverless backend** (`/serverless` directory) to staging and production. The Express server in `/server` is for local development only.

📚 **AWS Deployment Guides:**
- **[AWS Deployment Quick Start](docs/AWS_DEPLOYMENT_QUICKSTART.md)** - 30-minute fast-track deployment guide
- **[Complete AWS Deployment Guide](docs/deployment/aws-guide.md)** - Comprehensive guide with all curl tests
- **[Database Provider Comparison](docs/DATABASE_PROVIDER_COMPARISON.md)** - Choose between Supabase and AWS RDS
- **[Deployment Overview](docs/deployment/overview.md)** - Complete deployment documentation
- **[Quick Deploy](docs/deployment/quick-deploy.md)** - 5-minute deployment overview

**Automated Deployment (Recommended):**
```bash
# 1. Pre-deployment validation
node scripts/verify-predeploy.mjs

# 2. Optimize Prisma for production
node scripts/prisma-optimize.mjs --prod
cd serverless && npm run prisma:generate && cd ..

# 3. Setup database (Supabase free tier recommended for dev)
export DATABASE_URL="postgresql://user:password@host:5432/valine_db"
./scripts/deployment/setup-database.sh

# 4. One-time: Migrate legacy passwords (if upgrading)
DATABASE_URL=$DATABASE_URL node scripts/patch-legacy-passwords.mjs

# 5. Deploy backend to AWS
./scripts/deployment/deploy-backend.sh --stage dev --region us-west-2

# 6. Test all API endpoints
export API_BASE="https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev"
./scripts/deployment/test-endpoints.sh

# 7. Configure frontend
./scripts/deployment/configure-frontend.sh --api-url "$API_BASE"
```

**Phase 2 Automation Scripts**:
```bash
# Pre-deployment checks (error() signature, JWT secret, Prisma targets)
node scripts/verify-predeploy.mjs

# Optimize Prisma binaries (prod: Linux only, dev: all platforms)
node scripts/prisma-optimize.mjs --prod
node scripts/prisma-optimize.mjs --dev

# Migrate legacy password column (one-time)
DATABASE_URL=postgresql://... node scripts/patch-legacy-passwords.mjs

# Analyze test failures by category
npm test -- --reporter=json > results.json
node scripts/analyze-test-failures.mjs results.json

# Lint serverless code
cd serverless && npm run lint:serverless
```

**Manual Deployment:**

**Serverless API** (`/serverless`):
```bash
cd serverless
npm install
npx serverless deploy --stage dev
```

**Infrastructure API** (`/infra`):
```bash
cd infra
npx serverless deploy --stage dev
```

See:
- [DEPLOYMENT.md](docs/deployment/overview.md) - Complete deployment guide with troubleshooting
- [QUICK_START.md](docs/quickstart/README.md) - 5-minute deployment guide
- [scripts/deployment/README.md](scripts/deployment/README.md) - Deployment scripts documentation

### Orchestrator Setup

The orchestrator manages Discord bot interactions and GitHub Actions automation.

**Quick Setup:**
```bash
cd orchestrator

# Configure credentials
cp samconfig.toml.example samconfig.toml
# Edit samconfig.toml with your Discord and GitHub credentials

# Build and deploy
sam build
sam deploy --guided
```

**Register Discord Commands:**
```bash
# For staging (instant visibility)
./scripts/register_staging_slash_commands.sh

# Configure Discord Interactions Endpoint in Developer Portal
# Use the DiscordWebhookUrl from deployment outputs
```

**Detailed Guide:** [orchestrator/README.md](orchestrator/README.md)

### Automated Workflow Integration

**Post-Run Orchestration Analysis** automatically analyzes workflow results from quality checks and generates comprehensive reports with actionable insights.

**Workflow Name:** `Orchestrate Verification and Sweep`

**How It Works:**
1. The orchestration workflow runs automated quality checks (accessibility, security, regression tests)
2. On completion, the `Analyze Orchestration Run` workflow automatically triggers
3. Analysis results are uploaded as artifacts with severity-based gating decisions
4. If configured, PR comments are posted with issue summaries and gating recommendations

**Gating Logic:**
- **P0 (Critical):** Exit code 2 - BLOCK merge
- **P1 (Serious):** Exit code 1 if >3 issues - CAUTION recommended
- **P2 (Moderate):** Non-gating by default
- **P3 (Minor):** Non-gating, informational only

**Manual Analysis:**
```bash
# Analyze a specific workflow run
node scripts/analyze-orchestration-run.mjs <run-id> \
  --out-dir analysis-output \
  --json \
  --summary report.md \
  --fail-on P0

# Available flags:
#   --out-dir <path>         Output directory (default: analysis-output)
#   --json                   Emit machine-readable summary.json
#   --summary <path>         Write executive summary to file
#   --fail-on <P0|P1|P2|none> Exit code policy (default: P0)
#   --log-level <info|debug> Logging verbosity
```

**Configuration:**
- Set `ORCHESTRATION_BOT_PAT` secret for PR comment posting
- Without the secret, analysis still runs but comments are skipped
- Reports are always uploaded as workflow artifacts

**Documentation:**
- [Analysis CLI Guide](scripts/ORCHESTRATION_ANALYSIS_CLI_GUIDE.md)
- [Security Documentation](scripts/ORCHESTRATION_ANALYSIS_SECURITY.md)
- [Quick Reference](scripts/ORCHESTRATION_ANALYSIS_QUICKREF.md)

## Secrets & Configuration

Joint uses environment variables for configuration across frontend, backend, and CI/CD. Proper secrets management is critical for security and operational stability.

### 📚 Complete Documentation

**See [SECRETS_MANAGEMENT.md](./SECRETS_MANAGEMENT.md) for comprehensive guidance on:**

- Complete environment variables inventory (purpose, scope, rotation policy)
- Secrets rotation schedule and process
- Automated secret scanning and detection
- Runtime validation and guardrails
- Best practices for development and production

### Quick Reference

**Critical Secrets (Must be set in production):**
- `JWT_SECRET` - JWT signing key (32+ characters, never use default)
- `DATABASE_URL` - PostgreSQL connection string with credentials
- `ALLOWED_USER_EMAILS` - Email allowlist for owner-only mode

**Configuration Variables:**
- `FRONTEND_URL` - Frontend base URL (canonical, replaces deprecated `FRONTEND_BASE_URL`)
- `VITE_API_BASE` - API Gateway endpoint URL
- `NODE_ENV` - Environment mode (development/staging/production)

**Deprecated Variables:**
- ⚠️ `FRONTEND_BASE_URL` - Use `FRONTEND_URL` instead (compatibility shim logs warning)

### Validation & Scanning

**Pre-deployment validation:**
```bash
# Validate environment contract (required vars, no insecure defaults)
node scripts/verify-env-contract.mjs

# Scan for accidentally committed secrets
node scripts/secret-audit.mjs
```

**Health endpoint** (`GET /health`) includes `secretsStatus`:
```json
{
  "status": "ok",
  "secretsStatus": {
    "jwtSecretValid": true,
    "discordConfigured": true,
    "smtpConfigured": false,
    "databaseConfigured": true,
    "insecureDefaults": []
  }
}
```

**Developer Pre-commit Hook:**
```bash
# Install secret scanning hook
cp scripts/hooks/pre-commit-secret-scan.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**CI/CD:** The `secret-hygiene` workflow runs automatically on PRs and push to scan for secrets, validate environment contracts, and enforce security policies.

### Security Notes

- Never commit secrets to version control
- Use GitHub Secrets for CI/CD variables
- Use AWS Parameter Store for production Lambda secrets  
- Rotate secrets every 90 days or on suspected compromise
- Health endpoint never exposes actual secret values (boolean flags only)

## Project Structure

```
Project-Valine/
├── src/                    # React client source
│   ├── components/         # Reusable UI components
│   ├── pages/             # Page components
│   ├── routes/            # Route definitions
│   └── services/          # API services
│
├── serverless/            # Serverless API
│   ├── handler.js         # API router
│   └── serverless.yml     # Configuration
│
├── infra/                 # Infrastructure code
│   └── serverless.yml     # Presign function config
│
├── orchestrator/          # Discord bot & automation
│   ├── app/              # Application code
│   │   ├── handlers/     # Lambda handlers
│   │   ├── agents/       # Agent implementations
│   │   └── services/     # External service clients
│   ├── tests/            # Test suite
│   ├── scripts/          # Automation scripts
│   └── template.yaml     # SAM template
│
├── api/                   # API utilities
│   └── prisma/           # Database schema
│
├── docs/                  # Documentation
│   ├── diagnostics/      # Reports and diagnostics
│   ├── troubleshooting/  # Issue resolution guides
│   └── archive/          # Historical documentation
│
├── .github/
│   ├── workflows/        # CI/CD pipelines
│   └── agents/           # AI agent configurations
│
├── scripts/              # Utility scripts
├── public/               # Static assets
└── sanity/               # Sanity CMS config
```

## Available Routes

### Public Routes
- `/` - Home page
- `/about` - About page
- `/login` - Authentication

### Authenticated Routes
- `/feed` - Main content feed
- `/search` - Search functionality
- `/messages` - Messaging system
- `/bookmarks` - Saved content
- `/notifications` - User notifications
- `/settings` - User settings
- `/profile/:id` - User profiles
- `/scripts/*` - Script management
- `/auditions/*` - Audition management
- `/requests` - Access requests

## Deployment & Verification

### Automated Deployment

**Client Deployment:**
- Triggered automatically on push to `main` branch
- Manual trigger via `/deploy-client` Discord command
- Deploys to S3 + CloudFront
- Workflow: `.github/workflows/client-deploy.yml`

**Orchestrator Deployment:**
- Triggered on changes to `orchestrator/` directory
- Uses AWS SAM for Lambda deployment
- Workflow: `.github/workflows/deploy-orchestrator.yml`

### Verification Tools

**Automated Health Checks:**
```bash
# Verify latest deployment
cd scripts
./verify-deployment.sh --help
```

**Discord Commands:**
- `/verify-latest` - Verify most recent deployment
- `/diagnose` - Run infrastructure diagnostics
- `/status` - Check GitHub Actions workflow status

**Manual Testing:**
```bash
cd orchestrator/scripts
./test-discord-endpoint.sh  # Test Discord Lambda health
```

See [scripts/VERIFICATION_GUIDE.md](scripts/VERIFICATION_GUIDE.md) for comprehensive verification procedures.

## CloudFront & SPA Routing

### Overview

Joint uses CloudFront for content delivery with proper SPA (Single Page Application) routing. The infrastructure ensures:
- Extension-less routes (e.g., `/about`, `/users/123`) fallback to `index.html` for client-side routing
- Asset requests (`.js`, `.css`, etc.) are served with correct MIME types and never substituted with HTML
- Previous bundle versions are retained during deployments to prevent 404s for cached users

### Key Components

1. **CloudFront Function** (`infra/cloudfront/functions/spa-rewrite.js`): Viewer-request function that rewrites extension-less paths to `/index.html` while preserving actual file requests
2. **Association Helper** (`scripts/cloudfront-associate-spa-function.ps1`): Automated script to create, publish, and associate the CloudFront Function
3. **Deployment Scripts** (`scripts/deploy-frontend.{ps1,js}`): Automated deployment with bundle retention and dynamic invalidation
4. **Verification Scripts**: Local testing (`scripts/verify-spa-rewrite.js`) and header validation (`scripts/assert-headers.js`)
5. **Diagnostic Tools** (`scripts/check-cloudfront.{ps1,js}`): Check distribution status and asset delivery
6. **CI/CD Verification** (`.github/workflows/frontend-verify.yml`): Automated post-deployment validation

### Quick Start

**Associate CloudFront Function (one-time setup)**:
```powershell
# Create, publish, and associate the spa-rewrite function
.\scripts\cloudfront-associate-spa-function.ps1 -DistributionId E16LPJDBIL5DEE

# Test function logic locally before deploying
node scripts/verify-spa-rewrite.js
```

**Deploy frontend with bundle retention**:
```bash
# PowerShell
.\scripts\deploy-frontend.ps1 -S3Bucket "valine-frontend-prod" -CloudFrontDistributionId "E16LPJDBIL5DEE"

# Node.js (alternative)
node scripts/deploy-frontend.js --bucket valine-frontend-prod --distribution E16LPJDBIL5DEE
```

**Verify deployment**:
```bash
# Verify headers and MIME types
node scripts/assert-headers.js --domain dkmxy676d3vgc.cloudfront.net --bundle /assets/index-<hash>.js

# Run diagnostic check
node scripts/check-cloudfront.js --distribution E16LPJDBIL5DEE --domain dkmxy676d3vgc.cloudfront.net

# Or trigger CI/CD verification
gh workflow run frontend-verify.yml
```

### Documentation

📖 **CloudFront & SPA Routing Guides**:
- **[Migration Status & Setup](docs/cloudfront-spa-migration-status.md)** - Implementation checklist, verification procedures, and dynamic bundle parsing
- **[Complete Technical Guide](CLOUDFRONT_SPA_ROUTING.md)** - Problem summary, solution components, deployment workflow, troubleshooting
- **[White Screen Runbook](docs/white-screen-runbook.md)** - ⚡ Fast troubleshooting guide for blank screen issues with decision tree and quick fixes

**White Screen Troubleshooting**:
If users experience blank screens or "Unexpected token '<'" errors:
```bash
# Quick diagnosis
node scripts/diagnose-white-screen.js --domain your-domain.com

# Or via PowerShell
.\scripts\diagnose-white-screen.ps1 -Domain "your-domain.com"

# Check CloudFront config
.\scripts\guard-cloudfront-config.ps1 -DistributionId "E123..."
```

See the [White Screen Runbook](docs/white-screen-runbook.md) for detailed troubleshooting steps.

**Migration Status Guide** covers:
- CloudFront Function association checklist with verification commands
- Dynamic bundle name extraction (no hard-coded hashes)
- Helper script usage and options
- Temporary fallback procedure (404 custom error responses)
- Step-by-step troubleshooting for common issues

**Technical Guide** covers:
- Architecture and implementation details
- Manual CloudFront configuration steps
- Bundle retention policy and pruning
- Security considerations and monitoring
- Alert configuration
- Migration checklist

## Subresource Integrity (SRI)

### Overview

Subresource Integrity (SRI) ensures that JavaScript and CSS bundles loaded from CDN haven't been tampered with. After build, cryptographic hashes (SHA384) are computed for main assets and injected into `index.html` as `integrity` attributes.

### Usage

```bash
# Build with SRI (recommended)
npm run build:sri

# Or separately
npm run build
node scripts/generate-sri.js

# Verify SRI hashes match built files
npm run verify:sri
```

### What It Does

1. **Generate**: Computes SHA384 hash for main JS and CSS bundles in `dist/`
2. **Inject**: Adds `integrity="sha384-..."` and `crossorigin="anonymous"` to script/link tags in `index.html`
3. **Verify**: Confirms generated hashes match actual file content

### Example

```html
<!-- Before SRI -->
<script type="module" src="/assets/index-abc123.js"></script>

<!-- After SRI -->
<script type="module" src="/assets/index-abc123.js" 
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous"></script>
```

### CI/CD Integration

The `frontend-harden.yml` workflow automatically:
- Runs build
- Generates SRI hashes
- Verifies integrity attributes exist
- Fails CI if hashes mismatch

### Troubleshooting

**Email Allowlist Issues**:

If the `/health` endpoint doesn't show allowlist fields (`allowlistActive`, `allowlistCount`, `allowlistMisconfigured`):

```bash
# Check health endpoint
curl https://your-api/health

# Expected: Should include allowlist fields
# If missing, backend code needs updating/redeployment
```

**Registration blocked for allowed emails**:
```bash
# Verify environment variables are set
aws lambda get-function-configuration --function-name pv-api-prod-register | grep ALLOWED_USER_EMAILS

# Run audit script
pwsh scripts/audit-allowlist.ps1

# Emergency patch if missing
pwsh scripts/patch-allowlist-env.ps1 -Emails "ghawk075@gmail.com,valinejustin@gmail.com"
```

See [Allowlist Deployment Runbook](docs/ALLOWLIST_DEPLOYMENT_RUNBOOK.md) for complete troubleshooting guide.

**"Failed to find a valid digest"**: Hash mismatch detected
```bash
# Regenerate SRI
node scripts/generate-sri.js
npm run verify:sri

# Emergency disable (NOT recommended for production)
sed -i 's/ integrity="[^"]*"//g' dist/index.html
```

See [White Screen Runbook § SRI](docs/white-screen-runbook.md#65-subresource-integrity-sri) for detailed troubleshooting.

## Diagnostic Scripts

### Cross-Platform Tools

Joint includes diagnostic scripts in multiple languages for maximum compatibility:

**Bash** (Linux/macOS):
```bash
./scripts/diagnose-white-screen.sh --domain your-domain.com
./scripts/assert-headers.sh --domain your-domain.com
./scripts/guard-cloudfront-config.sh --distribution-id E123
```

**PowerShell** (Windows):
```powershell
.\scripts\diagnose-white-screen.ps1 -Domain "your-domain.com"
.\scripts\guard-cloudfront-config.ps1 -DistributionId "E123"
```

**Node.js** (Cross-platform):
```bash
node scripts/diagnose-white-screen.js --domain your-domain.com
node scripts/assert-headers.js --domain your-domain.com
```

All scripts include:
- Help text (`--help` or `-Help`)
- Color-coded output
- Graceful degradation when AWS credentials absent
- Exit codes for CI/CD integration

## WAF Reattachment Plan

### Overview

AWS WAF (Web Application Firewall) was temporarily disabled during white screen troubleshooting. The reattachment plan ensures safe restoration of security protection without blocking legitimate traffic.

### Status

- **Current**: WAF detached
- **Next Step**: Staged reattachment with allow rules
- **Documentation**: `infra/waf/README.md` and `docs/waf-reattachment-checklist.md`

### Allow Rules (Planned)

To prevent false positives, the following paths will be explicitly allowed:
- `/assets/*` - Static assets (JS, CSS, images)
- `/theme-init.js` - Theme initialization script
- `/favicon*`, `/manifest.json` - Browser-requested files
- `/robots.txt`, `/sitemap.xml` - SEO
- `/api/*` - API endpoints (with rate limiting)
- `/`, `/index.html` - SPA entry points

### Preview Tool

```powershell
# Dry-run preview (no changes made)
.\scripts\waf-attach-plan.ps1 -DistributionId E123 -WebAclArn arn:aws:wafv2:...

# Shows current vs planned WebACL association
```

### Phased Rollout

1. **Phase 1**: Create WebACL with allow rules (no attachment)
2. **Phase 2**: Attach in COUNT mode, monitor 24-48 hours
3. **Phase 3**: Enable BLOCK mode for attack patterns, monitor 24 hours
4. **Phase 4**: Full enforcement with CloudWatch alarms

### Resources

- **Plan**: `infra/waf/README.md` - Allow rules, block rules, monitoring
- **Checklist**: `docs/waf-reattachment-checklist.md` - Step-by-step rollout
- **IaC**: `infra/waf/terraform-stub.tf` - Infrastructure as Code template
- **Script**: `scripts/waf-attach-plan.ps1` - Dry-run preview tool

## Documentation

📚 **Complete Documentation**: See **[docs/](docs/)** for the full documentation index

> 📖 **Documentation reorganized 2025-11-20** - All docs now organized in the `docs/` directory for better discoverability. See [docs/SUMMARY.md](docs/SUMMARY.md) for complete index. Historical documentation moved to [docs/archive/](docs/archive/).

### Current Working State

**🟢 SYSTEM STATUS**: ✅ **Production-Ready** - Frontend delivery and owner authentication fully operational

- **[WORKING_STATE_SUMMARY.md](./WORKING_STATE_SUMMARY.md)** - **START HERE** - Current working state, what's deployed, how to test
- **[AUTH_RECOVERY_CHECKLIST.md](./AUTH_RECOVERY_CHECKLIST.md)** - Authentication troubleshooting guide
- **[SECRETS_MANAGEMENT.md](./SECRETS_MANAGEMENT.md)** - Environment variables and secrets reference

### Essential Guides

- **[API Base Validation Guide](docs/API_BASE_VALIDATION.md)** - Validate and troubleshoot API configuration
- **[Deployment Overview](docs/deployment/overview.md)** - Complete deployment documentation
- **[Quick Start](docs/quickstart/README.md)** - Get started in minutes
- **[Troubleshooting](docs/troubleshooting/)** - Common issues and solutions
- **[White Screen Runbook](docs/white-screen-runbook.md)** - Diagnose and fix white screen issues
- **[Auth Backend Investigation](docs/AUTH_BACKEND_INVESTIGATION.md)** - Authentication diagnostics

### Quick Links

**Getting Started:**
- 🚀 [Quick Start Guide](docs/quickstart/README.md) - Get up and running quickly
- 📖 [Project Summary](docs/reference/project-summary.md) - Comprehensive overview
- 📋 [Contributing Guide](CONTRIBUTING.md) - How to contribute

**Development:**
- 🔌 [API Documentation](docs/api/) - API reference, contracts, and integration
- 💻 [Backend Guide](docs/backend/) - Backend development guidelines
- 🎨 [Frontend Guide](docs/frontend/) - Frontend development guidelines
- 👤 [Account Creation MVP](docs/ACCOUNT_CREATION_MVP.md) - User signup endpoint specification

**Deployment & Operations:**
- ☁️ [Deployment Guides](docs/deployment/) - AWS, serverless, and quick deploy
- 🔧 [Troubleshooting](docs/troubleshooting/) - Fix common issues
- 📊 [CloudWatch Setup](docs/CLOUDWATCH_SETUP.md) - Monitoring and logging
- 📋 [Operational Runbooks](docs/runbooks/) - Security operations, user management, deployments

**Quality Assurance:**
- 🔍 [CI/CD Overview](docs/qa/ci-overview.md) - Continuous integration workflows
- ♿ [Accessibility Checklist](docs/qa/a11y-checklist.md) - WCAG 2.1 AA compliance guide
- 🚀 [Lighthouse Guide](docs/qa/lighthouse.md) - Performance optimization
- 📦 [Bundle Optimization](docs/qa/bundle-optimization.md) - Bundle size management
- 🔒 [Security Policy](SECURITY.md) - Security policy, vulnerability reporting, access control
- 📊 [Security Audit Report](docs/archive/SECURITY_AUDIT_REPORT.md) - Comprehensive security review and hardening

**Orchestrator & Automation:**
- 🤖 [Orchestrator Documentation](orchestrator/README.md) - Bot setup and agent management
- 💬 [Discord Integration](orchestrator/docs/) - Discord bot guides

**Reference:**
- 🗺️ [Roadmap](docs/reference/roadmap.md) - Future plans
- 📝 [Changelog](CHANGELOG.md) - Version history
- 🏗️ [Architecture](docs/reference/project-summary.md#architecture) - System design

### Documentation Structure

All documentation is organized in the [`docs/`](docs/) directory:

```
docs/
├── api/              # API documentation
├── backend/          # Backend guides
├── frontend/         # Frontend guides
├── deployment/       # Deployment guides
├── qa/               # Quality assurance & CI/CD
├── quickstart/       # Quick start guides
├── troubleshooting/  # Troubleshooting guides
├── guides/           # Development guides
├── reference/        # Reference documentation
└── archive/          # Historical documents (PHASE_* implementation docs)
```

See **[docs/README.md](docs/README.md)** or **[docs/SUMMARY.md](docs/SUMMARY.md)** for the complete documentation index.

### Repository Structure

The repository has been recently reorganized (2025-11-20) for better clarity:

**Core Documentation** (Repository Root):
- `README.md` - Main documentation
- `WORKING_STATE_SUMMARY.md` - Current working state ⭐ NEW
- `SECRETS_MANAGEMENT.md` - Environment variables & secrets guide
- `AUTH_RECOVERY_CHECKLIST.md` - Authentication troubleshooting
- `PROJECT_STATUS.md` - Current readiness & QA status
- `SECURITY.md` - Security policies
- `CONTRIBUTING.md` - Contribution guidelines
- `CHANGELOG.md` - Version history

**Active Scripts** (`scripts/`):
- Core utilities: `admin-set-password.mjs`, `secret-audit.mjs`, `verify-env-contract.mjs`
- Build/test scripts: `prebuild.js`, `postbuild-validate.js`, `verify-sri.js`
- Diagnostics: `diagnose-white-screen.js`, `check-auth-backend.js`, `check-cloudfront.js`
- See `scripts/archive/README.md` for archived scripts

**Archived Files** (`archive/`):
- `old-configs/` - Historical CloudFront configs, bucket policies
- `old-scripts/` - Superseded deployment and test scripts
- See `archive/README.md` for details

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development workflow and best practices
- Code style guidelines
- Testing requirements
- Pull request process
- Folder structure overview

## Development

### Running Locally

**Frontend:**
```bash
npm run dev  # Starts Vite dev server with hot reload (localhost:5173)
```

**Backend (Local Testing):**
```bash
cd serverless
npx serverless invoke local -f api
```

### Testing

**Orchestrator Tests:**
```bash
cd orchestrator
python -m pytest tests/
```

### Code Quality

- **Linting**: ESLint for JavaScript/React code
- **Formatting**: Follow existing code style
- **Security**: CodeQL scanning enabled in CI

### Environment Variables

See example configuration files:
- `.env.example` - Client environment variables
- `orchestrator/.env.example` - Orchestrator configuration
- `serverless/.env.example` - Backend API configuration

**Important**: Never commit actual `.env` files or credentials to the repository.

## Performance Optimizations

Joint implements a multi-layered caching strategy to minimize latency and improve user experience:

### Caching Layer

**Redis-based caching** with automatic fallback to in-memory cache for:

- **Profile Summaries**: Cached for 5 minutes (configurable)
- **Search Results**: Cached for 1 minute (configurable)
- **Cache Hit Ratio**: Target ≥70% for profiles, ≥50% for search

**Performance Improvements**:
- p95 latency reduction: **≥15%** target (≥25% stretch goal)
- Warm cache requests served in milliseconds
- Graceful degradation if cache unavailable

### Configuration

```bash
# Enable caching (disabled by default)
CACHE_ENABLED=true

# Redis connection (optional, falls back to in-memory)
REDIS_URL=redis://localhost:6379

# TTL settings (seconds)
CACHE_TTL_PROFILE=300  # 5 minutes
CACHE_TTL_SEARCH=60    # 1 minute
```

### Monitoring

**Cache Metrics Endpoint**:
```bash
GET /api/cache/metrics
```

Returns hit/miss counts, hit ratio, and cache type.

**Response Headers** (when caching enabled):
- `X-Cache-Hit`: Indicates whether request was served from cache
- `X-Response-Time`: Request duration in milliseconds

### Documentation

- **[Caching Layer Guide](docs/performance/CACHING_LAYER.md)** - Architecture, configuration, and best practices
- **[Support & Operations](docs/performance/SUPPORT_CACHE_OPERATIONS.md)** - Troubleshooting and maintenance
- **[Metrics Queries](docs/performance/METRICS_QUERIES.md)** - Performance measurement and analysis

### Cache Invalidation

Caches are automatically invalidated on:
- Profile updates (title, headline, bio)
- Profile link changes (create, update, delete)
- User account operations

**Manual invalidation**:
```bash
# Invalidate specific user profile
node server/scripts/cache/invalidate-profile.mjs <userId>

# Invalidate all search caches
node server/scripts/cache/invalidate-profile.mjs --all-search
```

## Technology Stack

**Frontend**: React 18, Vite 5, Tailwind CSS 3, React Router v6  
**Backend**: Node.js 20.x, Python 3.11, Serverless Framework v3, AWS SAM  
**Database**: DynamoDB, Prisma ORM  
**Infrastructure**: AWS (S3, CloudFront, Lambda, API Gateway, SSM)  
**Caching**: Redis with in-memory fallback  
**DevOps**: GitHub Actions, AWS OIDC  
**Integrations**: Discord Bot API, GitHub API, Sanity CMS

---

## Support

- **Issues**: [GitHub Issues](https://github.com/gcolon75/Project-Valine/issues)
- **Discord**: Join our Discord server for real-time support
- **Documentation**: See [docs/](docs/) for comprehensive guides
