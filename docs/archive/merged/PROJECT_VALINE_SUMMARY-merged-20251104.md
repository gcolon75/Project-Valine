<!-- ARCHIVED DOCUMENT -->
<!-- Original location: PROJECT_VALINE_SUMMARY.md -->
<!-- Archived on: 2025-11-04 -->
<!-- Reason: Merged into docs/reference/project-summary.md -->
<!-- This document is kept for historical reference only -->

---

# Project Valine - Comprehensive Summary

**Repository:** gcolon75/Project-Valine  
**Status:** 🚀 Production Ready - All 12 Autonomous Agent Phases Complete  
**Last Updated:** November 3, 2025

---

## Executive Summary

Project Valine is a **LinkedIn-style collaborative platform** specifically designed for voice actors, writers, and artists. The platform enables creative professionals to create and share scripts, auditions, and creative content while managing collaboration workflows.

### Key Differentiators
- **Niche Focus**: Tailored for the voice acting and creative content industry
- **AWS-Hosted Infrastructure**: Serverless architecture for scalability and cost efficiency
- **AI Agent Integration**: Discord bots acting as automated "employees" for workflow management
- **GitHub-First Development**: Integrated CI/CD with GitHub Actions orchestration

---

## Overall Goal

Build a modern, scalable platform that combines:

1. **Professional Networking** (LinkedIn-style features)
   - User profiles with portfolios
   - Connection management
   - Content feeds and discovery
   - Messaging and notifications

2. **Creative Content Management**
   - Script creation and sharing
   - Audition management and submissions
   - Collaborative workflows
   - Access request system

3. **AI-Powered Automation**
   - Discord bot agents for workflow orchestration
   - Automated deployment and monitoring
   - Intelligent triage and issue management
   - Quality assurance automation

4. **AWS Cloud Infrastructure**
   - Serverless backend (AWS Lambda)
   - API Gateway for HTTP endpoints
   - S3 + CloudFront for frontend hosting
   - DynamoDB for state management
   - SSM Parameter Store for configuration

---

## Current Architecture

### Frontend (Client)
- **Technology**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Deployment**: AWS S3 + CloudFront
- **Build Tool**: Vite (fast HMR, optimized builds)

**Key Features:**
- Authentication with role-based access
- Responsive design
- Main feed and content discovery
- User profiles and settings
- Script and audition management
- Messaging system
- Notifications
- Bookmarks

**Routes:**
```
Public:
  / - Home page
  /about - About page
  /login - Authentication

Authenticated:
  /feed - Main content feed
  /search - Search functionality
  /messages - Messaging
  /bookmarks - Saved content
  /notifications - Notifications
  /settings - User settings
  /profile/:id - User profiles
  /scripts/* - Script management
  /auditions/* - Audition management
  /requests - Access requests
```

### Backend (API)

#### Serverless API (`/serverless`)
- **Framework**: Serverless Framework v3
- **Runtime**: Node.js 20.x
- **Service**: `pv-api`
- **Region**: us-west-2 (default)

**Endpoints:**
- `/health` - Health check
- `/hello` - Test endpoint
- `/requests` - GET/POST access requests
- `/requests/{id}/approve` - Approve request
- `/requests/{id}/reject` - Reject request

#### Infrastructure API (`/infra`)
- **Purpose**: File upload management
- **Service**: `valine-api`
- **Function**: Presigned URL generation for S3 uploads

**Features:**
- CORS-enabled
- Presigned S3 URLs for secure uploads
- Support for images, PDFs, videos
- TTL: 300 seconds (5 minutes)

### AI Orchestrator (`/orchestrator`)

**The brain of Project Valine** - AWS Lambda-based orchestrator managing automated workflows through Discord and GitHub integration.

#### Unified Bot Architecture - Rin 🎮

Project Valine uses **Rin**, a unified Discord bot that handles all interactions. Different "agent personalities" provide specialized messaging styles through custom embeds and formatting, all using a **single bot token**.

**Agent Personalities:**
- 🚀 **Amadeus** - Deployment Specialist (handles `/deploy-client`)
- 🏗️ **BuildAgent** - Build System Monitor (build notifications)
- 📊 **StatusAgent** - Workflow Status Reporter (handles `/status`, `/status-digest`)
- ✅ **VerifyAgent** - Deployment Verification (handles `/verify-latest`, `/verify-run`)
- 🔍 **DiagnoseAgent** - Infrastructure Diagnostics (handles `/diagnose`)
- 🔧 **TriageAgent** - Issue Diagnostics (handles `/triage`)
- 🎮 **Rin** - Core Orchestrator (general commands)

**Benefits of Unified Architecture:**
- Single `DISCORD_BOT_TOKEN` for all operations
- Simplified permissions and deployment
- Consistent user experience with specialized contexts
- Visual differentiation through emojis, colors, and embeds

**Current Setup:**
- **Rin Bot**: Primary Discord bot handling all commands
- **Lambda Function**: Deployed via GitHub Actions (`.github/workflows/deploy-orchestrator.yml`)
- **Command Registration**: Use `orchestrator/scripts/register_staging_slash_commands.sh`
- **Configuration**: Stored in GitHub Secrets and AWS SSM Parameter Store

See [orchestrator/BOT_UNIFIER_GUIDE.md](orchestrator/BOT_UNIFIER_GUIDE.md) for complete details.

#### Architecture
- **Framework**: AWS SAM (Serverless Application Model)
- **Runtime**: Python 3.11
- **Components**:
  - Discord Handler Lambda (slash commands via Rin bot)
  - GitHub Webhook Handler Lambda (events)
  - DynamoDB for state storage
  - API Gateway for HTTP endpoints
  - Agent Messenger for personality-based messaging

#### Discord Slash Commands

All commands are handled by Rin bot with appropriate agent personalities.

**Production Commands:**
- `/plan` - Create daily plan from ready GitHub issues
- `/approve <run_id>` - Approve and execute a plan
- `/status [run_id]` - Check orchestrator status (StatusAgent 📊)
- `/ship <run_id>` - Finalize and ship completed run
- `/verify-latest [diagnose]` - Verify latest deployment (VerifyAgent ✅)
- `/verify-run <run_id>` - Verify specific workflow run (VerifyAgent ✅)
- `/diagnose [frontend_url] [api_base]` - Run infrastructure diagnostics (DiagnoseAgent 🔍)
- `/deploy-client [api_base] [wait]` - Trigger client deployment (Amadeus 🚀)
- `/agents` - List available orchestrator agents
- `/status-digest [period]` - Aggregated workflow status (StatusAgent 📊)
- `/triage <pr>` - Auto-diagnose failing GitHub Actions (TriageAgent 🔧)
- `/debug-last` - Show last execution debug info (feature-flagged)

**Admin Commands (Feature-Flagged):**
- `/set-frontend <url> [confirm]` - Update FRONTEND_BASE_URL
- `/set-api-base <url> [confirm]` - Update VITE_API_BASE
- `/relay-send` - Post message to Discord channel with audit trail
- `/relay-dm` - Post message as bot (owner-only)

#### Multi-Agent System

The orchestrator includes specialized agents with distinct personalities:

1. **Amadeus** 🚀 (`deploy_client`)
   - Deployment specialist
   - Handles client deployments
   - Entry: `/deploy-client`

2. **VerifyAgent** ✅ (`deploy_verifier`)
   - Verifies deployment health
   - Checks GitHub Actions, frontend, API endpoints
   - Entry: `/verify-latest`, `/verify-run`

3. **DiagnoseAgent** 🔍 (`diagnose_runner`)
   - Infrastructure diagnostics
   - AWS credentials, S3, CloudFront, API checks
   - Entry: `/diagnose`

4. **StatusAgent** 📊 (`status_reporter`)
   - Recent workflow run status
   - Entry: `/status`, `/status-digest`
   - Triggers deployments with tracking
   - Entry: `/deploy-client`

5. **Triage Agent** (Phase 5)
   - Auto-diagnose CI/CD failures
   - Generate fix proposals
   - Entry: `/triage`

#### Observability Features

**Structured Logging:**
- JSON format with consistent fields
- Trace IDs for correlation
- Automatic secret redaction
- CloudWatch integration

**Distributed Tracing:**
- Unique trace_id per command execution
- Step-by-step timing tracking
- Cross-service correlation

**Alerts:**
- Discord alerts for critical failures
- Severity-based emojis
- Rate-limiting (5-minute window)
- Configurable via `ENABLE_ALERTS`

**Audit Trail:**
- DynamoDB storage for relay operations
- Full metadata tracking
- Forensic investigation support

### Content Management

#### Sanity CMS (`/sanity`)
- Structured content management
- Schema-based content modeling
- API integration via `@sanity/client`

### Database

#### API Database (`/api`)
- **ORM**: Prisma
- **Schema**: `api/prisma/schema.prisma`
- **Seeding**: `api/prisma/seed.js`

#### Orchestrator State
- **Type**: DynamoDB
- **Table**: `valine-orchestrator-runs-{stage}`
- **Purpose**: Track orchestrator run state
- **Billing**: Pay-per-request

---

## AWS Infrastructure

### Current Resources

1. **S3 Buckets**
   - Frontend hosting
   - File uploads
   - Build artifacts

2. **CloudFront**
   - CDN for frontend
   - Global distribution
   - HTTPS support

3. **Lambda Functions**
   - Discord handler (orchestrator)
   - GitHub webhook handler (orchestrator)
   - API functions (serverless)
   - Presign function (infra)

4. **API Gateway**
   - REST API for orchestrator
   - HTTP API for serverless
   - CORS configuration

5. **DynamoDB**
   - Orchestrator run state
   - Audit logs

6. **SSM Parameter Store**
   - Configuration management
   - Feature flags
   - Environment variables

### Deployment Strategy

**Frontend:**
- GitHub Actions workflow: `client-deploy.yml`
- Build with Vite
- Deploy to S3
- Invalidate CloudFront cache
- OIDC authentication for AWS credentials

**Backend:**
- Serverless Framework deployment
- SAM CLI for orchestrator
- Automated via GitHub Actions

**Orchestrator:**
- Workflow: `deploy-orchestrator.yml`
- SAM build and deploy
- Environment-specific configurations

---

## GitHub Actions Workflows

### Active Workflows

1. **`client-deploy.yml`**
   - Frontend deployment to S3/CloudFront
   - Correlation tracking
   - Discord notifications
   - Can be triggered via `/deploy-client` command

2. **`client-deploy-diagnose.yml`**
   - Deployment with comprehensive diagnostics
   - Health checks and validation

3. **`backend-deploy.yml`**
   - Serverless API deployment
   - AWS credentials via OIDC

4. **`deploy-orchestrator.yml`**
   - Orchestrator Lambda deployment
   - SAM-based deployment

5. **`phase5-triage-agent.yml`**
   - Auto-diagnose failing CI/CD runs
   - Generate fix proposals
   - Create draft PRs
   - Triggered by `/triage` command

6. **`phase5-staging-validation.yml`**
   - Staging environment validation
   - Comprehensive health checks

7. **`phase5-super-agent.yml`**
   - Advanced automation agent
   - Multi-phase validation

8. **`operational-readiness.yml`**
   - Production readiness checks
   - Security scanning
   - Deployment validation

9. **`bot-smoke.yml`**
   - Discord bot smoke tests
   - Command registration validation

10. **`discord-bot-test.yml`**
    - Discord integration testing

11. **`register-staging-slash-commands.yml`**
    - Automated slash command registration for staging
    - Guild commands (instant visibility)

12. **`codeql.yml`**
    - Security scanning
    - Vulnerability detection

### Workflow Features

- **OIDC Authentication**: Secure AWS credential management
- **Correlation Tracking**: Unique IDs for tracking deployments
- **Discord Integration**: Status updates via bot
- **Artifact Upload**: Build outputs and reports
- **Cache Management**: CloudFront invalidation
- **Health Checks**: Automated validation

---

## Discord Bot Integration

### Current Status
✅ **Endpoint URL Obtained** - API Gateway endpoint configured  
⏳ **Lambda Functions Created** - Discord and GitHub handlers deployed  
🔜 **Next Step**: Register slash commands and test integration

### Bot Architecture

**Discord Developer Portal Setup:**
- Application ID configured
- Bot token secured in AWS SSM/GitHub Secrets
- Public key for signature verification
- OAuth2 scopes: `bot` + `applications.commands`
- Permissions: Send Messages, Create Public Threads

**Lambda Integration:**
- **Endpoint**: API Gateway → Discord Handler Lambda
- **Verification**: Ed25519 signature validation
- **Processing**: Command routing via agent registry
- **Response**: Immediate acknowledgment + deferred updates

**Command Registration:**
- **Production**: Global commands (1-hour propagation)
- **Staging**: Guild commands (instant visibility)
- **Scripts**: `register_discord_commands.sh` and staging variant
- **Automation**: GitHub Actions workflow for staging

### Bot Capabilities

**Workflow Management:**
- Trigger GitHub Actions workflows
- Monitor deployment status
- Parse workflow results
- Report outcomes to Discord

**Infrastructure Diagnostics:**
- AWS resource health checks
- API endpoint validation
- Frontend availability tests
- Correlation tracking

**AI-Powered Triage:**
- Fetch CI/CD failure logs
- Extract error patterns
- Analyze root causes
- Generate fix proposals
- Create draft PRs automatically

**Admin Operations:**
- Update repository secrets/variables
- Relay messages with audit trail
- Feature flag management
- User authorization checks

**Multi-Turn Confirmation Flows:**
- **Technical Limitation**: Plain text replies (e.g., "yes") in Discord **do NOT trigger follow-up command logic** after slash commands
- **Solution Pattern 1 (Preferred)**: Use Discord buttons/components for interactive confirmation
- **Solution Pattern 2 (Fallback)**: Require explicit `conversation_id` and `confirm:yes` parameters in re-run command
- **State Management**: Conversation state tracked in DynamoDB with TTL for automatic cleanup
- **See**: [Discord Confirmation Flow Agent Prompt](orchestrator/agent-prompts/discord_confirmation_flow_agent.md) for reusable implementation patterns

### Security Features

**Secret Protection:**
- Automatic redaction in logs
- Last 4 characters only shown
- No secrets in Discord messages
- Ephemeral responses for sensitive data

**Authorization:**
- Admin user allowlists (ADMIN_USER_IDS)
- Admin role allowlists (ADMIN_ROLE_IDS)
- Two-step confirmation for sensitive ops
- Feature flags for dangerous commands

**Audit Trail:**
- DynamoDB audit log
- Trace IDs for correlation
- Full metadata capture
- Forensic investigation support

### Discord Interaction Model & Multi-Turn Workflows

**Critical Technical Limitation:**

Discord slash commands have a fundamental constraint that affects bot design:

> **Plain text responses (e.g., typing "yes") do NOT trigger follow-up command logic.**

When a Discord bot responds to a slash command and asks for confirmation, a user typing "yes" in chat will **not** be routed back to the bot as a structured interaction. This is a core limitation of Discord's interaction model.

**Impact on Bot UX Design:**

Commands requiring multi-turn interactions (like the `/ux-update` command that needs confirmation) must use one of these patterns:

1. **Discord Buttons/Components (Recommended)**
   - Use Discord's native button UI for yes/no confirmations
   - Provides familiar, intuitive UX
   - Handles confirmation in single interaction
   - Requires button interaction handling in bot code

2. **Explicit Confirmation Parameters (Fallback)**
   - User must re-run the command with `conversation_id:<id>` and `confirm:yes` parameters
   - Example: `/ux-update section:header text:"Title" conversation_id:abc123 confirm:yes`
   - Works without additional Discord bot setup
   - Less user-friendly but reliable fallback

**State Management:**
- Conversation state tracked in DynamoDB with TTL (typically 1 hour)
- Validates conversation ownership before execution
- Handles expired conversations gracefully
- Provides clear error messages with examples

**Documentation:**
- Full implementation patterns: [Discord Confirmation Flow Agent Prompt](orchestrator/agent-prompts/discord_confirmation_flow_agent.md)
- This reusable prompt helps future bot agents handle confirmation flows correctly
- Includes code examples, security considerations, and testing checklists

---

## Development Phases Completed

### Phase 00: Preflight & Repo Snapshot ✅
- Repository structure analysis
- Technology stack validation
- Initial setup and configuration

### Phase 01: Automated Verification & Quick Fixes ✅
- Build system verification
- Dependency updates
- Quick bug fixes

### Phase 02: API Integration (Dev Environment) ✅
- Backend API connection
- Fallback system implementation
- Mock data integration

### Phase 03: Authentication & Protect App Routes ✅
- User authentication (login/register)
- Protected route system
- Session management
- Dev-bypass for testing (development only)

### Phase 04: Persist Engagement ✅
- Like/bookmark functionality
- Comment system foundation
- Optimistic updates
- Automatic rollback on errors

### Phase 05: Messaging & Notifications Integration ✅
- Direct messaging system
- Notification system
- Real-time ready architecture
- Conversation management

### Phase 06: Reels Hardening, Analytics & Accessibility ✅
- TikTok-style vertical video feed
- Keyboard and touch navigation
- Analytics tracking foundation
- Initial accessibility improvements

### Phase 07: Tests (Unit + E2E Suite) ✅
- 107 automated tests created
- 45% code coverage
- 100% pass rate
- Test infrastructure established

### Phase 08: CI/CD & Staging Deploy + Smoke Tests ✅
- GitHub Actions workflows
- Automated testing on PR
- Deployment automation
- Smoke test suite

### Phase 09: Performance & Accessibility Sweep ✅
- Core Web Vitals monitoring (PerformanceMonitor utility)
- LazyImage component with Intersection Observer
- Performance audit tooling (`npm run perf:audit`)
- WCAG 2.1 AA improvements (ARIA labels, semantic HTML)
- @axe-core/react integration

### Phase 10: Production Cleanup & Readiness ✅
- Debug code cleanup (console.log removal)
- Security verification (dev-bypass gated)
- RELEASE_NOTES.md created (10.5 KB)
- Production documentation complete

### Phase 11: Observability, Analytics & Runbook ✅
- Operational runbook created (ops/RUNBOOK.md - 17.8 KB)
- Sentry integration guide (docs/SENTRY_SETUP.md - 14.1 KB)
- CloudWatch setup guide (docs/CLOUDWATCH_SETUP.md - 14.5 KB)
- PII scrubbing documentation
- Incident response procedures (P0-P3 severity levels)
- Complete maintenance checklists

### Phase 12: Backlog, Issues & Roadmap ✅
- Product backlog created (BACKLOG.md - 15.9 KB)
- Product roadmap created (ROADMAP.md - 10.1 KB)
- 50+ features prioritized (P0-P3)
- 5 major milestones defined
- Success metrics established
- Resource allocation planning

### 🎉 ALL PHASES COMPLETE!
**Status:** Production Ready  
**Total Duration:** ~20 hours across 13 phases  
**Deliverables:**
- 107 automated tests (100% passing)
- ~91 KB comprehensive documentation
- Complete operational procedures
- Clear 12-month product roadmap
- 0 security vulnerabilities

---

## Recent Developments

### Key Accomplishments

1. **Unified Discord Bot Architecture**
   - Implemented "Rin" bot with specialized agent personalities
   - Single bot token manages all Discord interactions
   - DynamoDB persistence with TTL auto-cleanup

2. **Automated Triage System**
   - `/triage` command analyzes CI/CD failures
   - Integrates with Phase 5 Triage Agent workflow
   - Comprehensive test coverage

3. **Enhanced Observability**
   - Structured logging with trace IDs
   - Distributed tracing across services
   - Alert management system
   - Debug commands for troubleshooting

4. **Security & Compliance**
   - Automatic secret redaction in logs
   - Admin authorization framework
   - Audit trail for sensitive operations
   - Feature flag system for controlled rollouts

5. **Deployment Automation**
   - GitHub Actions workflows for client and orchestrator
   - Automated health checks post-deployment
   - Discord notifications for deployment status
   - Correlation tracking across services

For detailed changelog, see [CHANGELOG.md](CHANGELOG.md).

---

## AWS Lambda Functions

### Current Lambda Functions

#### 1. Discord Handler Lambda
**Name**: `valine-orchestrator-discord-{stage}`  
**Purpose**: Handle Discord slash command interactions  
**Runtime**: Python 3.11  
**Handler**: `app.handlers.discord_handler.handler`

**Key Environment Variables:**
- `DISCORD_PUBLIC_KEY` - Signature verification
- `DISCORD_BOT_TOKEN` - API calls
- `GITHUB_TOKEN` - GitHub Actions dispatch
- `RUN_TABLE_NAME` - DynamoDB table

**Trigger**: API Gateway POST `/discord`

#### 2. GitHub Webhook Handler Lambda
**Name**: `valine-orchestrator-github-{stage}`  
**Purpose**: Process GitHub webhook events  
**Runtime**: Python 3.11  
**Handler**: `app.handlers.github_handler.handler`

**Trigger**: API Gateway POST `/github/webhook`

#### 3. Serverless API Lambda
**Name**: `pv-api-{stage}-api`  
**Purpose**: Backend API endpoints  
**Runtime**: Node.js 20.x

**Endpoints**: Health check, access request management

#### 4. Presign Lambda
**Purpose**: Generate presigned S3 URLs for file uploads  
**Runtime**: Node.js 20.x

### Deployment

See [orchestrator/README.md](orchestrator/README.md) for deployment instructions.

**Quick Start:**
```bash
cd orchestrator
cp samconfig.toml.example samconfig.toml
# Edit samconfig.toml with credentials
sam build
sam deploy --guided
```

---

## Current State (November 2025)

### ✅ Production Ready
**Core Platform:**
- All 12 autonomous agent phases complete
- 107 automated tests (100% passing)
- 0 security vulnerabilities (CodeQL verified)
- Comprehensive documentation (~91 KB)
- Complete operational runbook
- Production-ready infrastructure

**Features Implemented:**
- User authentication & profile management
- Dashboard with posts feed
- Reels (vertical video feed)
- Messaging system
- Notifications
- Connection requests
- Dark/light theme
- API with fallback system
- Performance monitoring (Core Web Vitals)
- Accessibility improvements (WCAG 2.1 AA)

### ⏳ Pending Before Launch

**Required (1-2 weeks):**
1. **Image Optimization** (Guide: docs/IMAGE_OPTIMIZATION_GUIDE.md)
   - Reduce 12 MB → 1 MB (89% savings expected)
   - Target: < 500 KB per image

2. **AWS Infrastructure Setup** (Guide: DEPLOYMENT_GUIDE_AWS.md)
   - Provision S3, CloudFront, Lambda, RDS
   - Configure monitoring services

3. **Monitoring Configuration** (Guides: docs/SENTRY_SETUP.md, docs/CLOUDWATCH_SETUP.md)
   - Set up Sentry for error tracking
   - Configure CloudWatch alarms
   - Test alert workflows

4. **Staging Deployment** (Guide: ops/RUNBOOK.md)
   - Deploy to staging environment
   - Run smoke tests
   - Validate all features

---

## Next Steps

### Immediate Priorities (This Week)

1. **Pre-Launch Preparation**
   - Review backlog with team (BACKLOG.md)
   - Optimize 6 images using IMAGE_OPTIMIZATION_GUIDE.md
   - Provision AWS infrastructure
   - Configure Sentry and CloudWatch monitoring

2. **Staging Deployment**
   - Deploy frontend to S3/CloudFront
   - Deploy backend via Serverless Framework
   - Run comprehensive smoke tests
   - Validate all critical user flows

3. **Security Audit**
   - Review authentication flow
   - Test rate limiting
   - Verify CORS configuration
   - Scan for vulnerabilities

### Sprint 1 (Post-Launch: Weeks 1-4)

**High Priority Features (P1):**
1. **File Uploads System** (1-2 weeks)
   - Audio, video, image support
   - S3 pre-signed URLs
   - Progress tracking
   - Thumbnail generation

2. **Search Functionality** (1-2 weeks)
   - Full-text search (users, posts, reels)
   - Real-time suggestions
   - Filters and sorting

3. **Follow/Unfollow System** (3-5 days)
   - Follow buttons and lists
   - Feed from followed users
   - Follow recommendations

4. **Email Notifications** (3-5 days)
   - Event-based notifications
   - User preferences
   - Weekly digest

5. **Password Reset Flow** (1-3 days)
   - Forgot password link
   - Email verification
   - Secure token system

6. **Enhanced Profile Editing** (3-5 days)
   - Bio, links, avatar updates
   - Privacy settings

**Success Metrics - Sprint 1:**
- 100+ registered users
- 40% Day 7 retention
- 20+ posts/day
- < 5% error rate

### Sprint 2-3 (Months 2-3)

**Engagement & Growth Features (P2):**
- Trending/explore page
- Hashtag system
- User mentions (@username)
- Recommended content
- Creator analytics dashboard
- Video upload & editing
- Comments on reels
- Share functionality

**Success Metrics - Month 3:**
- 500+ MAU (Monthly Active Users)
- 300+ DAU (Daily Active Users)
- 100+ posts/day
- 50+ reels/day

### Long-Term Vision (Months 4-12)

**Milestone 3: Growth Engine** (March 2026)
- Advanced discovery features
- Viral growth mechanisms
- Creator tools

**Milestone 4: Monetization** (June 2026)
- Creator verification
- Tip/donation system
- Sponsored content
- Premium memberships
- Target: $1,000+ monthly revenue

**Milestone 5: Platform Maturity** (December 2026)
- Live streaming
- Voice AI tools
- Project management
- Casting calls & auditions
- Mobile apps (iOS/Android)
- Target: $10,000+ monthly revenue

### Technology Roadmap

**Q4 2025 (Current):**
- React + Vite
- AWS Lambda + API Gateway
- PostgreSQL (Prisma)
- S3 + CloudFront

**Q1 2026:**
- Elasticsearch/CloudSearch (search)
- MediaConvert (video transcoding)
- SES/SendGrid (email)
- Redis/ElastiCache (caching)

**Q2 2026:**
- Stripe (payments)
- React Native (mobile)
- WebSocket (real-time)
- ML models (recommendations)

**Q3-Q4 2026:**
- WebRTC (live streaming)
- GraphQL (API v2)
- Voice AI tools
- Advanced analytics

---
   sam build
   sam deploy --guided
   ```

3. **Configure Discord Interactions Endpoint**
   - Go to Discord Developer Portal
   - Set Interactions Endpoint URL to DiscordWebhookUrl from deployment
   - Discord will verify the endpoint

4. **Register Slash Commands**
   ```bash
   cd orchestrator
   # For production (global commands)
   ./register_discord_commands.sh
   
   # For staging (guild commands - instant)
   ./register_discord_commands_staging.sh
   ```

5. **Configure GitHub Webhook**
   - Go to repository settings → Webhooks
   - Add webhook with GitHubWebhookUrl
   - Set secret to match your configuration
   - Select events: Issues, Pull Requests, Check Suites

6. **Test Discord Commands**
   ```
   /agents - List available agents
   /status - Check workflow status
   /diagnose - Run diagnostics
   /verify-latest - Verify latest deployment
   ```

### Short-Term Goals

1. **Complete Discord Bot Testing**
   - Verify all slash commands work
   - Test workflow triggers
   - Validate status reporting
   - Check error handling

2. **Enable Triage Automation**
   - Test `/triage` command on real PR
   - Validate fix proposal generation
   - Test draft PR creation
   - Monitor accuracy of root cause analysis

3. **Production Deployment**
   - Deploy orchestrator to production stage
   - Register global Discord commands
   - Configure production webhooks
   - Set up monitoring and alerts

4. **User Onboarding**
   - Create user documentation
   - Record demo videos
   - Build landing page
   - Set up authentication

### Medium-Term Goals

1. **Feature Development**
   - Complete script management UI
   - Build audition submission flow
   - Implement messaging system
   - Add search functionality

2. **Performance Optimization**
   - Optimize Lambda cold starts
   - Implement caching strategy
   - CDN optimization
   - Database query optimization

3. **Monitoring & Observability**
   - CloudWatch dashboards
   - Custom metrics
   - Alert policies
   - Log aggregation

4. **Security Hardening**
   - Penetration testing
   - Vulnerability scanning
   - Rate limiting
   - DDoS protection

### Long-Term Vision

1. **Platform Expansion**
   - Mobile app (React Native)
   - Desktop app (Electron)
   - Browser extensions
   - Third-party integrations

2. **AI Capabilities**
   - Content recommendations
   - Smart matching (actors to roles)
   - Automated quality checks
   - Voice analysis tools

3. **Monetization**
   - Premium features
   - Subscription tiers
   - Commission on bookings
   - Sponsored content

4. **Community Features**
   - Forums and discussions
   - Events and workshops
   - Mentorship programs
   - Portfolio showcases

---

## Technology Stack Summary

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **CMS Client**: Sanity Client

### Backend
- **API Framework**: Serverless Framework v3
- **Runtime**: Node.js 20.x
- **Database**: Prisma ORM
- **File Uploads**: S3 presigned URLs

### Orchestrator
- **Framework**: AWS SAM
- **Runtime**: Python 3.11
- **State Storage**: DynamoDB
- **API Gateway**: REST API

### Infrastructure
- **Cloud Provider**: AWS
- **Hosting**: S3 + CloudFront
- **Compute**: Lambda (serverless)
- **API**: API Gateway
- **Database**: DynamoDB
- **Configuration**: SSM Parameter Store
- **Authentication**: AWS OIDC for GitHub Actions
- **CDN**: CloudFront

### DevOps
- **Version Control**: GitHub
- **CI/CD**: GitHub Actions
- **IaC**: AWS SAM, Serverless Framework
- **Deployment**: Automated via workflows
- **Monitoring**: CloudWatch
- **Secrets**: GitHub Secrets, AWS SSM

### Third-Party Integrations
- **Discord**: Bot API for workflow management
- **GitHub**: Actions, API, Webhooks
- **Sanity**: Headless CMS

---

## File Structure Overview

```
Project-Valine/
├── src/                          # React client source
│   ├── components/               # Reusable UI components
│   ├── pages/                    # Page components
│   ├── routes/                   # Route definitions
│   ├── services/                 # API services
│   ├── context/                  # React context
│   ├── hooks/                    # Custom React hooks
│   └── App.jsx                   # Main app component
│
├── serverless/                   # Serverless API
│   ├── handler.js                # API router
│   ├── serverless.yml            # Serverless config
│   └── package.json              # Dependencies
│
├── infra/                        # Infrastructure code
│   ├── serverless.yml            # Infra config
│   └── functions/                # Lambda functions
│       └── presign/              # Presign function
│
├── orchestrator/                 # AI Orchestrator
│   ├── app/                      # Application code
│   │   ├── handlers/             # Lambda handlers
│   │   ├── agents/               # Agent definitions
│   │   ├── services/             # Service clients
│   │   └── utils/                # Utilities
│   ├── tests/                    # Test suite
│   ├── scripts/                  # Automation scripts
│   ├── template.yaml             # SAM template
│   ├── requirements.txt          # Python dependencies
│   └── README.md                 # Orchestrator docs
│
├── api/                          # API utilities
│   └── prisma/                   # Prisma schema
│
├── sanity/                       # Sanity CMS config
│
├── .github/                      # GitHub configuration
│   ├── workflows/                # GitHub Actions
│   └── agents/                   # AI agent configs
│
├── public/                       # Static assets
│
├── scripts/                      # Utility scripts
│
├── package.json                  # Client dependencies
├── vite.config.js                # Vite configuration
├── tailwind.config.js            # Tailwind configuration
└── README.md                     # Main documentation
```

---

## Key Configuration Files

### Discord Bot Configuration
- **Location**: Discord Developer Portal
- **Secrets**: 
  - `DISCORD_BOT_TOKEN` (GitHub Secrets, AWS SSM)
  - `DISCORD_PUBLIC_KEY` (GitHub Variables, AWS SSM)
  - `DISCORD_APPLICATION_ID` (GitHub Variables)
- **Staging Variants**: `STAGING_DISCORD_*` for staging environment

### GitHub Integration
- **Secrets**:
  - `GITHUB_TOKEN` - For API access and workflow dispatch
  - `GITHUB_WEBHOOK_SECRET` - For webhook verification
- **Variables**:
  - `FRONTEND_BASE_URL` - Frontend URL
  - `VITE_API_BASE` - API base URL

### AWS Configuration
- **SSM Parameters** (us-west-2):
  - `/valine/{stage}/ENABLE_DEBUG_CMD` - Feature flag for debug commands
  - `/valine/{stage}/ENABLE_ALERTS` - Feature flag for alerts
  - `/valine/{stage}/ALERT_CHANNEL_ID` - Discord alert channel
  - `/valine/{stage}/bucket_name` - S3 bucket for uploads
  - `/valine/{stage}/allowed_origins` - CORS origins

### Feature Flags
- `ENABLE_DEBUG_CMD` - Enable `/debug-last` command (default: false)
- `ENABLE_ALERTS` - Enable Discord alerts (default: false)
- `ALLOW_SECRET_WRITES` - Enable admin setter commands (default: false)
- `SAFE_LOCAL` - Allow localhost URLs in dev (default: false)

---

## Documentation Files

### Quick Start Guides
- `README.md` - Main project overview
- `orchestrator/README.md` - Orchestrator setup and usage
- `orchestrator/QUICK_START_STAGING.md` - Staging setup
- `docs/archive/AUTO_TRIAGE_QUICKSTART.md` - Triage automation quick start
- `docs/diagnostics/PHASE6_DISCORD_TRIAGE_QUICKSTART.md` - Phase 6 quick start

### Implementation Summaries
- `docs/diagnostics/IMPLEMENTATION_COMPLETE.md` - Discord slash commands
- `docs/diagnostics/PHASE6_IMPLEMENTATION_SUMMARY.md` - Phase 6 triage integration
- `docs/diagnostics/IMPLEMENTATION_SUMMARY_PHASE5.md` - Phase 5 triage agent

### Technical Guides
- `orchestrator/INTEGRATION_GUIDE.md` - Discord/GitHub integration
- `orchestrator/QA_CHECKER_GUIDE.md` - QA automation
- `orchestrator/RUNBOOK.md` - Operations runbook
- `scripts/VERIFICATION_GUIDE.md` - Deployment verification

### Reference Documentation
- `orchestrator/TRIAGE_COMMAND_REFERENCE.md` - `/triage` command
- `orchestrator/DISCORD_SLASH_CMD_QUICK_REF.md` - Slash commands
- `ORCHESTRATOR_CONSOLIDATION.md` - Migration planning

### Troubleshooting
- `orchestrator/START_HERE_DISCORD_ISSUES.md` - Discord issues
- `orchestrator/DISCORD_NO_RESPONSE_QUICKFIX.md` - Quick fixes
- `orchestrator/DISCORD_DEPLOYMENT_TROUBLESHOOTING.md` - Detailed troubleshooting

---

## Security Considerations

### Implemented Security Measures

1. **Secret Management**
   - GitHub Secrets for sensitive data
   - AWS SSM Parameter Store for configuration
   - Never commit secrets to repository
   - Automatic redaction in logs and responses

2. **Authentication & Authorization**
   - Discord signature verification (Ed25519)
   - GitHub webhook signature verification (HMAC-SHA256)
   - Admin user/role allowlists
   - Two-step confirmation for sensitive operations

3. **API Security**
   - CORS configuration
   - HTTPS only
   - Rate limiting considerations
   - Input validation

4. **Infrastructure Security**
   - AWS OIDC for GitHub Actions (no long-lived credentials)
   - Least privilege IAM policies
   - VPC considerations for future
   - CloudWatch logging enabled

5. **Code Security**
   - CodeQL scanning
   - Dependency vulnerability checks
   - Regular updates
   - Security-focused code reviews

### Security Best Practices to Implement

- [ ] Enable AWS WAF on API Gateway
- [ ] Set up rate limiting
- [ ] Implement request throttling
- [ ] Add DDoS protection
- [ ] Regular security audits
- [ ] Penetration testing
- [ ] SIEM integration
- [ ] Incident response plan

---

## Monitoring & Observability

### Current Capabilities

**Structured Logging:**
- JSON format with consistent schema
- Trace IDs for request correlation
- Automatic secret redaction
- CloudWatch Logs integration

**Metrics:**
- Lambda invocations, duration, errors
- API Gateway requests, 4xx/5xx errors
- DynamoDB read/write operations
- Custom business metrics

**Tracing:**
- Distributed tracing with trace_id
- Step-by-step timing
- Cross-service correlation
- `/debug-last` command for investigation

**Alerts:**
- Discord alerts for critical failures
- Severity-based notifications
- Rate-limiting to prevent storms
- Configurable via feature flags

### Monitoring to Implement

- [ ] CloudWatch Dashboards
- [ ] Custom alarms (Lambda errors, API latency)
- [ ] Cost monitoring and alerts
- [ ] Performance metrics tracking
- [ ] User analytics
- [ ] Error rate tracking
- [ ] SLA monitoring

---

## UX Design Implementation Research (2025-10-25)

### Current State
**Files found:**
- `orchestrator/app/agents/ux_agent.py` - **Full implementation exists!** (966 lines)
- `orchestrator/app/handlers/discord_handler.py` - Has `handle_ux_update_command()` handler
- `.github/agents/ux-designer.md` - Complete UX Designer agent specification

**Command registered:** ❌ **NOT YET** - `/ux-update` command is NOT in `register_discord_commands.sh`

**Implementation status:** **Skeleton complete, needs Discord integration**

### Architecture Pattern (based on other agents)

**Standard Pattern:**
1. User runs `/command` in Discord
2. Lambda handler calls trigger method or agent directly
3. For workflow-based: GitHub Actions workflow executes agent script
4. For direct agents: Agent runs in Lambda and returns result
5. Agent analyzes request and opens PR with changes

**UX Agent Specifics:**
The UX Agent follows a **direct execution pattern** (not workflow-based like Triage):
- User runs `/ux-update section:header text:"Welcome!"` in Discord
- Lambda handler calls `UXAgent.start_conversation()`
- Agent parses intent and generates preview
- **Interactive confirmation flow**: Agent asks user to confirm before making changes
- User confirms with "yes" → Agent calls `confirm_and_execute()`
- Agent creates draft PR with changes
- Discord receives PR link

**What makes UX agent different:**
- **Interactive conversation flow** with confirmation steps
- **In-memory conversation state** tracking (needs persistent storage for production)
- **Direct PR creation** without GitHub Actions workflow
- **Parses multiple input formats**: structured commands, plain text, images
- **Supports 4 sections**: header, footer, navbar, home page
- **Changes React/JSX files** directly in the repository

### Current UX Agent Capabilities

**Supported sections:**
- `header` → `src/components/Header.jsx`
- `footer` → `src/components/Footer.jsx`
- `navbar` → `src/components/NavBar.jsx`
- `home` → `src/pages/Home.jsx`

**Supported properties:**
- `text` - Update displayed text
- `color` - Change background/foreground colors (hex format)
- `brand` - Update brand name
- `links` / `add-link` - Add navigation links
- `hero-text`, `description`, `cta-text` - Home page specific

**Example commands:**
```
/ux-update section:header text:"Welcome to Project Valine!"
/ux-update section:footer color:"#FF0080"
/ux-update section:navbar brand:"Joint"
/ux-update section:home hero-text:"Level Up!"
```

**What's already implemented:**
- ✅ Command parsing (structured + plain text)
- ✅ Image analysis placeholder (needs API integration)
- ✅ Intent extraction (sections, colors, quoted text)
- ✅ Clarification question system
- ✅ Change preview generation
- ✅ Interactive confirmation flow
- ✅ Code snippet generation for previews
- ✅ File change generation (regex-based replacements)
- ✅ PR body generation
- ✅ Conversation state management

**What's NOT fully implemented:**
- ❌ Actual GitHub PR creation (returns mock PR #999)
- ❌ File reading from repository
- ❌ Branch creation and commits
- ❌ Persistent conversation storage (uses in-memory dict)
- ❌ Image analysis (placeholder only)
- ❌ Discord command registration

### Next Steps to Implement

**Phase 1: Discord Command Registration** (Estimated: 30 minutes)
1. Add `/ux-update` command to `orchestrator/register_discord_commands.sh`
   ```bash
   echo "📝 Registering /ux-update command..."
   curl -X POST "${BASE_URL}" \
     -H "Authorization: Bot ${BOT_TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "ux-update",
       "description": "Interactive UX/UI updates with confirmation",
**Status**: Active Development
