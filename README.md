# Project Valine

A collaborative platform for voice actors, writers, and artists to create and share scripts, auditions, and creative content.

[![CI - Pull Request Check](https://github.com/gcolon75/Project-Valine/actions/workflows/ci-pr-check.yml/badge.svg)](https://github.com/gcolon75/Project-Valine/actions/workflows/ci-pr-check.yml)
[![Accessibility Audit](https://github.com/gcolon75/Project-Valine/actions/workflows/accessibility-audit.yml/badge.svg)](https://github.com/gcolon75/Project-Valine/actions/workflows/accessibility-audit.yml)
[![Lighthouse CI](https://github.com/gcolon75/Project-Valine/actions/workflows/lighthouse-ci.yml/badge.svg)](https://github.com/gcolon75/Project-Valine/actions/workflows/lighthouse-ci.yml)
[![Security Audit](https://github.com/gcolon75/Project-Valine/actions/workflows/security-audit.yml/badge.svg)](https://github.com/gcolon75/Project-Valine/actions/workflows/security-audit.yml)

---

## 📊 **[→ Project Status (Current Readiness, Security, QA)](PROJECT_STATUS.md)** ←

**Latest Update:** PRs 155-187 merged | **Status:** Production-Ready (83% Complete)  
**Security:** 2FA, CSRF, Rate Limits, CSP (Report-Only) | **Tests:** 107 (45% coverage)

---

> 📖 **New to Project Valine?** Start with [PROJECT_STATUS.md](PROJECT_STATUS.md) for current readiness, security posture, QA coverage, and next steps. See also [docs/](docs/README.md) for complete documentation index.

## Table of Contents

- [Overview](#overview)
- [Current Status](#current-status)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Available Routes](#available-routes)
- [Deployment & Verification](#deployment--verification)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Development](#development)
- [Technology Stack](#technology-stack)

## Overview

Project Valine is a **LinkedIn-style collaborative platform** specifically designed for voice actors, writers, and artists. The platform enables creative professionals to create and share scripts, auditions, and creative content while managing collaboration workflows through an AWS-hosted serverless infrastructure with AI-powered automation via Discord bots.

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
- ✅ Read about Project Valine and view features
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

### Backend Deployment

📚 **AWS Deployment Guides:**
- **[AWS Deployment Quick Start](docs/AWS_DEPLOYMENT_QUICKSTART.md)** - 30-minute fast-track deployment guide
- **[Complete AWS Deployment Guide](docs/deployment/aws-guide.md)** - Comprehensive guide with all curl tests
- **[Database Provider Comparison](docs/DATABASE_PROVIDER_COMPARISON.md)** - Choose between Supabase and AWS RDS
- **[Deployment Overview](docs/deployment/overview.md)** - Complete deployment documentation
- **[Quick Deploy](docs/deployment/quick-deploy.md)** - 5-minute deployment overview

**Automated Deployment (Recommended):**
```bash
# 1. Setup database (Supabase free tier recommended for dev)
export DATABASE_URL="postgresql://user:password@host:5432/valine_db"
./scripts/deployment/setup-database.sh

# 2. Deploy backend to AWS
./scripts/deployment/deploy-backend.sh --stage dev --region us-west-2

# 3. Test all API endpoints
export API_BASE="https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev"
./scripts/deployment/test-endpoints.sh

# 4. Configure frontend
./scripts/deployment/configure-frontend.sh --api-url "$API_BASE"
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

## Documentation

📚 **Complete Documentation**: See **[docs/](docs/)** for the full documentation index

> 📖 **Documentation reorganized 2025-11-04** - All docs now organized in the `docs/` directory for better discoverability. See [docs/SUMMARY.md](docs/SUMMARY.md) for complete index.

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

**Quality Assurance:**
- 🔍 [CI/CD Overview](docs/qa/ci-overview.md) - Continuous integration workflows
- ♿ [Accessibility Checklist](docs/qa/a11y-checklist.md) - WCAG 2.1 AA compliance guide
- 🚀 [Lighthouse Guide](docs/qa/lighthouse.md) - Performance optimization
- 📦 [Bundle Optimization](docs/qa/bundle-optimization.md) - Bundle size management
- 🔒 [Security Best Practices](docs/qa/security.md) - Security guidelines

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
└── archive/          # Historical documents
```

See **[docs/README.md](docs/README.md)** or **[docs/SUMMARY.md](docs/SUMMARY.md)** for the complete documentation index.

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

## Technology Stack

**Frontend**: React 18, Vite 5, Tailwind CSS 3, React Router v6  
**Backend**: Node.js 20.x, Python 3.11, Serverless Framework v3, AWS SAM  
**Database**: DynamoDB, Prisma ORM  
**Infrastructure**: AWS (S3, CloudFront, Lambda, API Gateway, SSM)  
**DevOps**: GitHub Actions, AWS OIDC  
**Integrations**: Discord Bot API, GitHub API, Sanity CMS

---

## Support

- **Issues**: [GitHub Issues](https://github.com/gcolon75/Project-Valine/issues)
- **Discord**: Join our Discord server for real-time support
- **Documentation**: See [docs/](docs/) for comprehensive guides
