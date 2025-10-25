## 🚨 Current Status (2025-10-25 01:21 UTC)

### Active Debugging Session - Bot Duplicate Commands Issue

**What's happening RIGHT NOW:**
- Rin bot is deployed and partially working
- `/triage` command fixed via PR #102 and PR #103 (merged ~1:11 UTC)
- `.status` command works BUT appears twice in Discord (duplicate registration issue)
- Root cause: Old "Amadeus bot" application still has commands registered
- Other commands giving "Application did not respond" (3-second timeout issue)

**Timeline of Events (Oct 24-25):**
- 8:24 PM: `.status` worked perfectly
- 10:38 PM: PR #99 merged (AWS Auto-Deployer)
- After 10:38 PM: Bot started failing
- PR #102 & #103: Fixed `/triage` command parameter mismatch
- Current: Investigating duplicate command registration and timeouts

**What We Know:**
1. `/triage` now works after merging trigger method fixes
2. Duplicate `/status` = two bot applications have it registered
3. Bot code is correct, issue is Discord command registration
4. Lambda is deployed successfully (run #34 at 1:11 UTC succeeded)

**Next Steps (being handled by agent):**
- [ ] Clean up duplicate commands from old Amadeus bot application
- [ ] Investigate Lambda cold start timeouts (CloudWatch logs)
- [ ] Research UX design implementation approach
- [ ] Document findings in summary

**If This Agent Run Fails:**
The bot is functional but has duplicate commands. To fix manually:
1. Go to Discord Developer Portal
2. Find old "Amadeus bot" application (non-staging tokens)
3. Delete its slash commands OR delete the entire application
4. Keep only Rin bot active

**Files Changed Today:**
- `orchestrator/app/handlers/discord_handler.py` (triage command fixes)
- `orchestrator/app/services/github_actions_dispatcher.py` (added trigger_phase5_triage and trigger_issue_triage methods)
- `orchestrator/tests/test_github_actions_dispatcher.py` (added tests)

**Important Context:**
- Rin bot = unified bot (uses non-staging tokens, was previously "Amadeus")
- Old Amadeus bot = should be decommissioned but commands still registered
- UX bot = planned feature, no Discord commands yet, just backend code

---

## 🆕 Project Valine Status (2025-10-24)

- 🎮 **Bot Unifier Architecture Implemented!** Rin is now the unified orchestrator bot
- 🎭 **Agent Personalities Added:** Amadeus 🚀, BuildAgent 🏗️, StatusAgent 📊, and more
- ✅ **20 tests passing** for AgentMessenger implementation
- 📚 **Comprehensive documentation:** BOT_UNIFIER_GUIDE.md created
- 🔧 **Commands updated** with agent-specific messaging styles
- 🚀 **Single bot token** manages all Discord interactions

**What's new:**
- All Discord commands now use Rin bot with specialized agent personalities
- Different agents (Amadeus, BuildAgent, etc.) represented through custom embeds
- Simplified token management - only one DISCORD_BOT_TOKEN needed
- Enhanced user experience with distinct visual identities per agent

**Previous updates:**
- 🤖 **SummaryAgent deployed!** New bot to auto-generate status updates
- 🎮 **New slash command:** /update-summary now available in Discord
- ✅ **15 tests passing** for SummaryAgent implementation
- 🛠️ **Command registration scripts updated** for staging and production
- 📚 **Documentation complete:** SUMMARY_AGENT_GUIDE.md created
- 🚀 **Ready for testing:** All code committed, awaiting Discord registration

**Next quests:**
- Test unified bot architecture in Discord
- Monitor agent personality effectiveness
- Continue development and testing
- Address any issues that arise

---
# Project Valine - Comprehensive Summary

**Generated:** October 23, 2025  
**Repository:** gcolon75/Project-Valine  
**Status:** Active Development - Phase 6 Complete

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

**Current Setup (Updated 2025-10-25):**
- **Rin Bot**: Primary Discord bot handling all commands
- **Bot Token**: Uses non-staging tokens (previously labeled "Amadeus")
- **Lambda Function**: `ProjectValineDiscordHandler` deployed via GitHub Actions
- **Command Registration**: `orchestrator/register_discord_commands.sh`
- **Application ID**: Stored in GitHub Secrets as `DISCORD_APPLICATION_ID`

**Bot Personas (UI/UX representations, same bot):**
- Amadeus: Build/deploy operations
- Status Agent: Workflow status reports
- Verify Agent: Deployment verification
- Diagnose Agent: Infrastructure diagnostics
- Triage Agent: Failure analysis and auto-fix

**Deprecated:**
- Old staging bot (separate application) - should be removed
- Old Amadeus bot application - commands need cleanup (causing duplicate command issue)

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

---

## Development Phases Completed

### Phase 1-2: Foundation
- ✅ React client with Vite
- ✅ Serverless backend structure
- ✅ AWS infrastructure setup
- ✅ Basic orchestrator framework

### Phase 3: Quality of Life Commands
- ✅ `/status` command with run history
- ✅ `/deploy-client` with correlation tracking
- ✅ Admin setter commands (feature-flagged)
- ✅ URL validation and security guardrails

### Phase 4: Multi-Agent Foundation
- ✅ Agent registry system
- ✅ `/agents` command to list agents
- ✅ `/status-digest` for aggregated metrics
- ✅ Extensible agent architecture

### Phase 5: Triage Automation
- ✅ Phase 5 Triage Agent workflow
- ✅ Automatic failure detection
- ✅ Root cause analysis
- ✅ Fix proposal generation
- ✅ Draft PR creation
- ✅ Staging validation

### Phase 6: Discord Triage Integration
- ✅ `/triage` slash command
- ✅ Integration with Phase 5 agent
- ✅ Command handler implementation
- ✅ Comprehensive testing
- ✅ Documentation complete

### Current Phase: Documentation & Lambda Setup
- ✅ Endpoint URL obtained
- ✅ Lambda functions exist in codebase
- 🔄 **In Progress**: Create comprehensive documentation
- ⏳ **Next**: Register slash commands
- ⏳ **Next**: Test Discord integration end-to-end

---

## What We've Been Doing Recently

### Recent Accomplishments

### 2025-10-25: Discord Bot Duplicate Commands & Triage Fix

**PRs Merged:**
- **#102**: Fix Discord bot workflow dispatch parameter mismatch (added specialized triage methods)
- **#103**: Fix /triage Discord command parameter mismatch (attempted same fix, superseded by #102)

**Issue:** Duplicate slash commands appearing in Discord (specifically `/status`)

**Cause:** Commands registered under multiple bot applications (old Amadeus + Rin)

**Fix in progress:** Agent cleaning up old registrations

**Technical Details:**
- **Before**: `trigger_workflow_dispatch()` was being called with `ref='main'` as kwarg (not in signature)
- **After**: Created `trigger_phase5_triage()` and `trigger_issue_triage()` that handle ref internally
- Both PRs #102 and #103 tried to fix this but with slightly different approaches
- PR #102's approach was used (removed workflow_id parameter, hardcoded it)

**Key Changes in PR #102:**
```python
# New methods in github_actions_dispatcher.py:
def trigger_phase5_triage(self, failure_ref, allow_auto_fix='false', dry_run='false', verbose='true'):
    """Trigger Phase 5 Triage Agent workflow via workflow_dispatch."""
    url = f'{self.base_url}/repos/{owner}/{repo}/actions/workflows/phase5-triage-agent.yml/dispatches'
    payload = {
        'ref': 'main',  # Handled internally, not passed as parameter
        'inputs': {...}
    }

def trigger_issue_triage(self, requester, trace_id=''):
    """Trigger Issue Triage Agent workflow via workflow_dispatch."""
    url = f'{self.base_url}/repos/{owner}/{repo}/actions/workflows/issue-triage-agent.yml/dispatches'
    payload = {
        'ref': 'main',  # Handled internally
        'inputs': {...}
    }
```

**Impact:** `/triage` command now works correctly, but revealed duplicate command registration issue

1. **Discord Slash Commands Fix** (Phase 5)
   - Created validation scripts for command registration
   - Implemented one-command fix script
   - Documented troubleshooting procedures
   - Added feature flags for debug commands

2. **Triage Command Integration** (Phase 6)
   - Built `/triage` command handler
   - Integrated with Phase 5 Triage Agent
   - Added comprehensive tests (5 new tests, all passing)
   - Created usage documentation

3. **Observability Enhancements**
   - Structured logging system
   - Distributed tracing with trace IDs
   - Alert management system
   - Debug commands for troubleshooting

4. **Security Improvements**
   - Automatic secret redaction
   - Admin authorization framework
   - Audit trail for sensitive operations
   - Feature flag system

5. **Documentation**
   - Created 50+ documentation files
   - Quick start guides
   - Troubleshooting references
   - API documentation
   - Runbooks for operations

### Known Issues (2025-10-25)

- **Discord Command Duplicates**: Multiple bot applications have same commands registered. Need to clean up old "Amadeus bot" application.
- **Lambda Timeouts**: Some commands timing out with "Application did not respond" - investigating cold start performance.

### Recent Challenges Solved

**Problem**: Discord slash commands not appearing in staging  
**Solution**: Created automated validation and registration scripts using guild commands for instant visibility

**Problem**: No visibility into orchestrator execution  
**Solution**: Implemented structured logging, tracing, and `/debug-last` command

**Problem**: Manual triage of CI/CD failures time-consuming  
**Solution**: Built `/triage` command with AI-powered failure analysis

**Problem**: Too many manual deployment steps  
**Solution**: Automated via Discord commands with correlation tracking

---

## AWS Lambda Functions

### Current Lambda Functions

#### 1. Discord Handler Lambda
**Name**: `valine-orchestrator-discord-{stage}`  
**Purpose**: Handle Discord slash command interactions  
**Runtime**: Python 3.11  
**Handler**: `app.handlers.discord_handler.handler`

**Environment Variables:**
- `DISCORD_PUBLIC_KEY` - For signature verification
- `DISCORD_BOT_TOKEN` - For API calls
- `GITHUB_TOKEN` - For GitHub Actions dispatch
- `FRONTEND_BASE_URL` - For deployment verification
- `VITE_API_BASE` - For API health checks
- `GITHUB_REPO` - Target repository (gcolon75/Project-Valine)
- `RUN_TABLE_NAME` - DynamoDB table name
- `STAGE` - Deployment stage (dev/prod)

**Permissions:**
- DynamoDB read/write (run state table)

**Trigger**: API Gateway POST `/discord`

#### 2. GitHub Webhook Handler Lambda
**Name**: `valine-orchestrator-github-{stage}`  
**Purpose**: Process GitHub webhook events  
**Runtime**: Python 3.11  
**Handler**: `app.handlers.github_handler.handler`

**Environment Variables:**
- `GITHUB_WEBHOOK_SECRET` - For signature verification
- `GITHUB_TOKEN` - For GitHub API calls
- `DISCORD_BOT_TOKEN` - For Discord notifications
- `RUN_TABLE_NAME` - DynamoDB table name

**Permissions:**
- DynamoDB read/write (run state table)

**Trigger**: API Gateway POST `/github/webhook`

#### 3. Serverless API Lambda
**Name**: `pv-api-{stage}-api`  
**Purpose**: Backend API endpoints  
**Runtime**: Node.js 20.x  
**Handler**: `handler.router`

**Endpoints:**
- Health check
- Access request management
- Hello world test

#### 4. Presign Lambda
**Name**: Defined in infra/serverless.yml  
**Purpose**: Generate presigned S3 URLs for file uploads  
**Runtime**: Node.js 20.x

### Lambda Functions to Create/Configure

Based on the problem statement, here's what needs to be set up:

✅ **Discord Handler** - Already defined in `orchestrator/template.yaml`  
✅ **GitHub Webhook Handler** - Already defined in `orchestrator/template.yaml`  
⏳ **Deployment** - Need to run `sam deploy` in orchestrator directory  
⏳ **Configuration** - Need to set up `samconfig.toml` with secrets  
⏳ **Testing** - Need to validate endpoints and commands

### Deployment Commands

**To deploy the orchestrator Lambda functions:**

```bash
cd orchestrator

# First time setup - create samconfig.toml
cp samconfig.toml.example samconfig.toml
# Edit samconfig.toml with your credentials

# Build the Lambda functions
sam build

# Deploy (guided mode for first deployment)
sam deploy --guided

# Subsequent deployments
sam deploy
```

**Outputs from deployment:**
- DiscordWebhookUrl - Use for Discord Interactions Endpoint
- GitHubWebhookUrl - Use for GitHub webhook
- RunStateTableName - DynamoDB table name

---

## Next Steps

### Immediate Actions (You Need to Do)

1. **Configure Orchestrator Secrets**
   ```bash
   cd orchestrator
   cp samconfig.toml.example samconfig.toml
   # Edit with your Discord and GitHub credentials
   ```

2. **Deploy Lambda Functions**
   ```bash
   cd orchestrator
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
       "options": [{
         "name": "request",
         "description": "Your UX update request (e.g., section:header text:\"New Title\")",
         "type": 3,
         "required": true
       }]
     }'
   ```
2. Also add to `register_discord_commands_staging.sh`
3. Re-run registration script to deploy

**Phase 2: GitHub Integration** (Estimated: 2 hours)
1. Implement `_create_draft_pr()` to actually create PRs:
   - Use `github_service.create_branch()`
   - Use `github_service.create_or_update_file()` for changes
   - Use `github_service.create_pull_request(draft=True)`
2. Implement file reading to get current content
3. Apply regex replacements to actual file content
4. Handle errors (file not found, regex no match, etc.)

**Phase 3: Persistent Storage** (Estimated: 1 hour)
1. Move conversation state from in-memory dict to DynamoDB
2. Add TTL for auto-cleanup (e.g., 1 hour)
3. Update `start_conversation()` and `confirm_and_execute()` to use DynamoDB

**Phase 4: Testing & Polish** (Estimated: 1 hour)
1. Test with real React component files
2. Handle edge cases (malformed commands, missing sections)
3. Add unit tests for UXAgent
4. Update documentation with examples

**Total Estimated Effort:** ~4-5 hours to full production-ready

### Estimated Complexity
**Medium** - Core logic exists, needs integration work

**Why:**
- ✅ Agent code is complete and well-structured
- ✅ Discord handler integration exists
- ❌ Needs GitHub PR creation wired up
- ❌ Needs persistent storage for conversations
- ❌ Needs Discord command registration

### Blockers
**None** - All dependencies are in place:
- GitHub service available
- Discord handler ready
- No new libraries needed
- Files to edit exist in repository

### Recommended Approach

**Option 1: Quick MVP (Register command only)** - 30 minutes
- Just register `/ux-update` in Discord
- Test the interactive flow (will get mock PR)
- Validate conversation UX before building PR integration

**Option 2: Full Implementation** - 4-5 hours
- Register Discord command
- Wire up GitHub PR creation
- Add DynamoDB conversation storage
- Full testing

**Option 3: Hybrid (Recommended)** - 2 hours
- Register Discord command
- Implement real PR creation
- Keep in-memory conversation state (document as known limitation)
- Add TODO comments for DynamoDB migration

**Recommendation:** Start with Option 1 to test UX, then do Option 3 if user likes it.

---

## Discord Bot Cleanup Plan (2025-10-25)

### Problem
Two bot applications exist with same commands registered:
- **Rin Bot** (current, active) - The unified bot using non-staging tokens
- **Old Amadeus Bot** (deprecated) - Previous separate application

### Solution
Delete all commands from old Amadeus bot application.

### How to Identify the Old Bot

**Check Discord Developer Portal:**
1. Visit: https://discord.com/developers/applications
2. Look for multiple applications
3. The **old** one is likely:
   - Named "Amadeus" or "Project Valine Amadeus"
   - Has fewer OAuth2 redirects configured
   - May have older creation date
4. The **current** one (Rin) is:
   - Named "Rin" or "Project Valine"
   - Has the Application ID matching `DISCORD_APPLICATION_ID` in GitHub Secrets
   - Should be the one with the newest updates

**Check GitHub Secrets:**
```
DISCORD_APPLICATION_ID → Current Rin bot
STAGING_DISCORD_APPLICATION_ID → Staging bot (different)
```

Any other Application ID found in Discord Developer Portal is likely the old bot.

### Commands to Run (MANUAL - don't execute automatically)

**Step 1: List commands from old bot**
```bash
# Replace OLD_APP_ID and OLD_BOT_TOKEN with values from old Amadeus bot
curl -X GET "https://discord.com/api/v10/applications/OLD_APP_ID/commands" \
  -H "Authorization: Bot OLD_BOT_TOKEN"
```

**Step 2: For each command ID returned, delete:**
```bash
# For EACH command returned from Step 1
curl -X DELETE "https://discord.com/api/v10/applications/OLD_APP_ID/commands/COMMAND_ID" \
  -H "Authorization: Bot OLD_BOT_TOKEN"
```

**Alternative: Delete entire old application via Discord Developer Portal**
1. Navigate to: https://discord.com/developers/applications
2. Select old Amadeus bot application
3. Go to "General Information"
4. Scroll to bottom → "Delete Application"
5. Confirm deletion

### Files to Check

**Environment configuration:**
- `orchestrator/.env.example` - Shows what env vars are used (no Application IDs stored here)
- `orchestrator/template.yaml` - SAM template references `DISCORD_PUBLIC_KEY` parameter

**GitHub Secrets to verify:**
- `DISCORD_APPLICATION_ID` - Current Rin bot Application ID
- `DISCORD_BOT_TOKEN` - Current Rin bot token
- `DISCORD_PUBLIC_KEY` - Current Rin bot public key
- `STAGING_DISCORD_*` variants - For staging environment (separate bot)

**No code changes needed** - This is purely a Discord Developer Portal cleanup.

### Post-Cleanup Verification

1. Run `/status` in Discord - should only show **ONCE**
2. Test other commands - should work without duplicates
3. Check Discord Developer Portal - only Rin bot should exist (plus staging if used)
4. Verify no "Application did not respond" errors (may need Lambda timeout investigation)

### Risk Assessment
**Low risk** - Only deleting unused command registrations. Lambda/code unchanged.

**What could go wrong:**
- Accidentally delete active Rin bot → Re-register commands using `register_discord_commands.sh`
- Delete wrong commands → Re-run registration script to restore

**Recovery:** If you accidentally break something, run:
```bash
cd orchestrator
./register_discord_commands.sh
```

---

## Action Items for User (gcolon75)

### URGENT
- [ ] Check Discord Developer Portal for bot applications
- [ ] Identify which Application ID is old Amadeus vs Rin
- [ ] Delete commands from old application (see cleanup plan above)
- [ ] Verify `/status` only appears once after cleanup

### INVESTIGATE
- [ ] Check CloudWatch logs for Lambda timeouts
- [ ] Look for errors around 01:15-01:21 UTC (recent command attempts)
- [ ] Check cold start duration (should be < 2 seconds)
- [ ] If timeouts persist, consider increasing Lambda timeout or optimizing imports

### UX IMPLEMENTATION (after bot is stable)
- [ ] Review UX agent research findings (see section above)
- [ ] Decide on implementation approach (MVP vs Full)
- [ ] Register `/ux-update` command in Discord (Quick win - 30 min)
- [ ] Create GitHub issue for UX agent completion if desired

### OPTIONAL
- [ ] Test `/triage` command now that PR #102 is merged
- [ ] Monitor for any other duplicate command issues
- [ ] Review CloudWatch logs for any other Lambda errors

---

## How to Brief New Agents/Chats

### Quick Briefing (30 seconds)

**Project Valine** is a LinkedIn-style platform for voice actors and creatives. We're building:
- React frontend hosted on AWS S3/CloudFront
- Serverless backend with AWS Lambda
- Discord bots as AI "employees" for workflow automation
- Full CI/CD via GitHub Actions

**Current Status**: Infrastructure mostly built, Discord bot Lambda functions exist, need to complete command registration and testing.

### Standard Briefing (2 minutes)

**What**: LinkedIn-like platform for voice actors, writers, and artists to share scripts and auditions.

**Tech Stack**: 
- Frontend: React + Vite + Tailwind
- Backend: AWS Lambda (Node.js + Python)
- Infrastructure: S3, CloudFront, API Gateway, DynamoDB
- Automation: Discord bots + GitHub Actions

**Discord Bots**: Acting as automated "employees" that:
- Trigger deployments (`/deploy-client`)
- Monitor infrastructure (`/diagnose`, `/verify-latest`)
- Triage CI/CD failures (`/triage`)
- Report status (`/status`, `/status-digest`)
- Manage workflows via Discord slash commands

**Current Phase**: Have endpoint URL from AWS API Gateway, Lambda functions defined in code, need to finalize deployment and test Discord integration.

**Next Steps**: Deploy orchestrator Lambdas, register slash commands, test end-to-end workflow.

### Detailed Briefing (5 minutes)

Read this document (PROJECT_VALINE_SUMMARY.md) in full. Key sections:
1. **Overall Goal** - Understand the vision
2. **Current Architecture** - See what's built
3. **AWS Lambda Functions** - Understand the backend
4. **Discord Bot Integration** - See how automation works
5. **Next Steps** - Know what needs to be done

**Key Files to Review**:
- `README.md` - Project overview
- `orchestrator/README.md` - Orchestrator documentation
- `orchestrator/template.yaml` - Lambda function definitions
- `.github/workflows/` - CI/CD automation

**Pro Tips**:
- Discord bots are how we interact with the system
- Everything is serverless (no servers to manage)
- GitHub Actions orchestrates deployments
- Trace IDs connect logs across services
- Documentation is extensive - check docs before asking

---

## Glossary

**Orchestrator**: The AWS Lambda-based system that coordinates Discord commands, GitHub webhooks, and workflow automation.

**Slash Commands**: Discord commands starting with `/` that trigger bot actions (e.g., `/triage`, `/deploy-client`).

**Triage Agent**: AI-powered system that analyzes CI/CD failures, determines root causes, and proposes fixes.

**Trace ID**: Unique identifier (UUID) for tracking a single operation across multiple services and logs.

**Correlation ID**: Unique identifier linking a Discord command to its corresponding GitHub Actions workflow run.

**Feature Flag**: Configuration toggle (via environment variable or SSM) to enable/disable features without code changes.

**Guild Commands**: Discord slash commands registered to a specific server (instant visibility).

**Global Commands**: Discord slash commands available across all servers (1-hour propagation delay).

**SAM**: AWS Serverless Application Model - framework for building serverless applications.

**Serverless Framework**: Open-source framework for deploying serverless applications.

**OIDC**: OpenID Connect - authentication protocol used for AWS access from GitHub Actions without long-lived credentials.

**Presigned URL**: Time-limited URL for uploading files directly to S3 without exposing AWS credentials.

**DynamoDB**: AWS NoSQL database service used for storing orchestrator state and audit logs.

**CloudWatch**: AWS monitoring and logging service.

**SSM Parameter Store**: AWS service for storing configuration and secrets.

---

## Contact & Resources

### Repository
**URL**: https://github.com/gcolon75/Project-Valine  
**Owner**: gcolon75  
**Visibility**: Private (assumed)

### Key Links
- Discord Developer Portal: https://discord.com/developers/applications
- AWS Console: https://console.aws.amazon.com
- GitHub Actions: https://github.com/gcolon75/Project-Valine/actions

### Support Channels
- GitHub Issues: For bugs and feature requests
- Discord Server: For real-time communication and bot interaction
- GitHub Discussions: For questions and community support

---

## Changelog

### 2025-10-23
- Created comprehensive PROJECT_VALINE_SUMMARY.md
- Documented full architecture and current status
- Outlined next steps for Lambda deployment
- Added detailed briefing guide for new agents

### 2025-10-18
- Completed Phase 6: Discord Triage Integration
- Implemented `/triage` command
- Added comprehensive testing (5 new tests)

### 2025-10-17
- Fixed Discord slash commands not appearing
- Created automated validation scripts
- Documented troubleshooting procedures

### 2025-10 (Earlier)
- Completed Phase 5: Triage Automation
- Implemented multi-agent system
- Built observability features
- Created extensive documentation

---

## Summary for Quick Reference

**What is Project Valine?**  
A LinkedIn-style platform for voice actors and creatives with AWS serverless backend and Discord bot automation.

**What's the goal?**  
Build a scalable platform for professional networking, content sharing, and collaboration in the voice acting industry.

**What's been done?**  
- React frontend (complete)
- Serverless backend structure (complete)
- AWS infrastructure (S3, CloudFront, Lambda, DynamoDB)
- Discord bot framework (complete)
- GitHub Actions CI/CD (complete)
- Phase 1-6 features (complete)

**What's next?**  
1. Deploy orchestrator Lambda functions (sam deploy)
2. Register Discord slash commands
3. Test end-to-end integration
4. Complete production deployment

**Current blocker?**  
Need to create/deploy Lambda functions - codebase is ready, just needs deployment with proper configuration.

**How long to complete?**  
~30 minutes to deploy Lambdas, ~30 minutes to test = 1 hour to full Discord bot functionality.

---

**This document is intended to be shared with new AI agents and team members to quickly understand Project Valine's current state, architecture, goals, and next steps.**

**Last Updated**: October 23, 2025  
**Document Version**: 1.0  
**Status**: Active Development
