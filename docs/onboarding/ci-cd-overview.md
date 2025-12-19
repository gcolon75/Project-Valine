# CI/CD Overview

This document provides a high-level overview of the CI/CD (Continuous Integration / Continuous Deployment) infrastructure for Project Valine. All workflows are implemented using GitHub Actions and integrate with AWS via OIDC (OpenID Connect) for secure, credential-less authentication.

For complete CI/CD documentation, see the **[Project Bible - CI/CD Workflows](../PROJECT_BIBLE.md#cicd-workflows)**.

## Where to Start

**Primary Location:** `.github/workflows/` directory contains all workflow definitions

**Workflow Documentation:** `.github/workflows/README.md` provides a detailed index of all workflows

## High-Level Architecture

```
Developer
    ↓ git push / PR
GitHub Repository
    ↓ trigger
GitHub Actions Workflows
    ↓ authenticate via OIDC
AWS Resources (S3, Lambda, API Gateway, CloudFront)
    ↓ notify
Discord Bot (Orchestrator)
```

### Key Integration Points

1. **GitHub Actions** - Automated quality gates and deployments
2. **AWS OIDC** - Secure authentication without long-lived credentials
3. **Discord Bot** - Real-time notifications and manual trigger capabilities
4. **S3 + CloudFront** - Frontend deployment targets
5. **Lambda + API Gateway** - Backend deployment targets

See the [Project Bible - System Architecture Diagram](../PROJECT_BIBLE.md#system-architecture-diagram) for complete integration architecture.

## Core Workflows

### Pull Request Quality Gates

**Workflow:** `.github/workflows/ci-pr-check.yml`

**Purpose:** Enforce quality standards on every PR before merge

**Triggered By:**
- Pull request opened
- Pull request synchronized (new commits)
- Pull request reopened

**Jobs:**
1. **Lint** - ESLint checks on frontend code
2. **Frontend Tests** - Vitest unit tests with coverage report
3. **Backend Tests** - Jest tests for serverless functions
4. **Security Audit** - npm audit for known vulnerabilities
5. **Build Validation** - Ensure production build succeeds

**Success Criteria:** All jobs must pass before merge is allowed

**Note:** Test failures or lint errors will block the PR with detailed feedback.

### Accessibility Audit

**Workflow:** `.github/workflows/accessibility-audit.yml`

**Purpose:** Ensure WCAG AA compliance on key routes

**Triggered By:**
- Pull request
- Manual workflow dispatch

**Jobs:**
1. Build frontend
2. Start local server
3. Run axe-core accessibility tests on routes:
   - `/` (home)
   - `/login`
   - `/join`
   - `/dashboard`
   - `/profile`
4. Upload results as artifact

**Success Criteria:** No critical accessibility violations

**See Also:** [QA Documentation - Accessibility Checklist](../qa/a11y-checklist.md)

### Lighthouse CI

**Workflow:** `.github/workflows/lighthouse-ci.yml`

**Purpose:** Performance and SEO monitoring

**Triggered By:**
- Pull request
- Manual workflow dispatch

**Jobs:**
1. Build frontend
2. Run Lighthouse on multiple routes
3. Check performance budgets:
   - Performance score ≥ 90
   - Accessibility score ≥ 95
   - Best Practices score ≥ 90
   - SEO score ≥ 90

**Success Criteria:** All budgets met (warnings allowed, failures block)

**See Also:** [QA Documentation - Lighthouse](../qa/lighthouse.md)

### Security Audit

**Workflow:** `.github/workflows/security-audit.yml`

**Purpose:** Detect vulnerabilities and secrets in code

**Triggered By:**
- Pull request
- Scheduled (weekly)

**Jobs:**
1. **Dependency Audit** - npm audit for vulnerabilities
2. **Secret Scanning** - Check for hardcoded secrets (`scripts/secret-audit.mjs`)
3. **CodeQL Analysis** - Static code analysis (if available)

**Success Criteria:** No high/critical vulnerabilities, no secrets found

**See Also:** [Security Documentation](../security/guide.md)

## Deployment Workflows

### Frontend Deployment

**Workflow:** `.github/workflows/client-deploy.yml`

**Purpose:** Deploy frontend to S3 + CloudFront

**Triggered By:**
- Push to `main` branch
- Manual workflow dispatch (Actions tab)
- Discord bot command: `/deploy-client`

**Jobs:**
1. Checkout code
2. Setup Node.js 20.x
3. Install dependencies
4. Set production environment variables (from GitHub Secrets):
   - `VITE_API_BASE`
   - `VITE_ALLOWED_USER_EMAILS`
5. Run build (`npm run build`)
6. Upload to S3 with correct MIME types and cache headers
7. Create CloudFront invalidation
8. Post deployment notification to Discord

**Deployment Time:** ~3-5 minutes (build + upload + invalidate)

**See Also:** [Frontend Build and Deploy](frontend-build-and-deploy.md)

### Backend Deployment

**Workflow:** `.github/workflows/backend-deploy.yml`

**Purpose:** Deploy serverless backend to AWS Lambda

**Triggered By:**
- Push to `main` branch (if `serverless/` directory changed)
- Manual workflow dispatch

**Jobs:**
1. Checkout code
2. Configure AWS credentials via OIDC
3. Install dependencies (`npm ci`)
4. Generate Prisma client
5. Build Prisma Lambda Layer (`scripts/build-prisma-layer.ps1` or `.sh`)
6. Deploy via Serverless Framework
7. Run database migrations (if needed)
8. Test health endpoint
9. Post deployment notification

**Deployment Time:** ~1-2 minutes (with Prisma layer optimization)

**See Also:** [Backend Build and Deploy](backend-build-and-deploy.md)

### Orchestrator Deployment

**Workflow:** `.github/workflows/orchestrator-deploy.yml`

**Purpose:** Deploy Discord bot to AWS Lambda

**Triggered By:**
- Push to `main` branch (if `orchestrator/` directory changed)
- Manual workflow dispatch

**Jobs:**
1. Checkout code
2. Setup Python 3.11
3. Configure AWS credentials
4. Build SAM application
5. Deploy via AWS SAM
6. Update Discord slash commands
7. Test webhook endpoint

**Deployment Time:** ~2-3 minutes

## AWS OIDC Authentication

**Why OIDC?** Eliminates the need for long-lived AWS credentials stored in GitHub Secrets. Instead, GitHub Actions obtains temporary credentials directly from AWS STS using OIDC tokens.

**Benefits:**
- No credential rotation needed
- Automatic expiration (temporary credentials)
- Fine-grained IAM permissions per workflow
- Audit trail via CloudTrail

**Configuration:** IAM role with trust policy allowing GitHub Actions OIDC provider

See the [Project Bible - Deployment Procedures](../PROJECT_BIBLE.md#deployment-procedures) for AWS resource requirements.

## Discord Bot Integration

The Orchestrator Discord bot can trigger deployments and provide status updates:

**Available Commands:**
- `/deploy-client` - Deploy frontend to S3 + CloudFront
- `/deploy-backend` - Deploy serverless backend
- `/deploy-orchestrator` - Deploy Discord bot itself
- `/status` - Get GitHub Actions workflow status
- `/status-digest` - Daily summary of CI/CD runs
- `/diagnose` - Run infrastructure health checks
- `/verify-latest` - Verify most recent deployment

**How It Works:**
1. User invokes slash command in Discord
2. Orchestrator Lambda receives webhook
3. Bot confirms action with user (react with ✅)
4. Bot triggers GitHub Actions workflow via API
5. Bot polls workflow status
6. Bot posts completion notification

See the [Project Bible - Agent Instructions](../PROJECT_BIBLE.md#agent-instructions--workflows) for complete bot documentation.

## Workflow Status and Monitoring

### View Workflow Runs

**GitHub UI:**
1. Navigate to repository
2. Click **Actions** tab
3. Filter by workflow name or status

**Discord Bot:**
```
/status
```
Returns status of all recent workflow runs

### Check Logs

**GitHub UI:**
1. Navigate to **Actions** → Select workflow run
2. Click on job name
3. Expand log sections

**AWS CloudWatch:**
```powershell
# Frontend deployment logs (CloudFront invalidation)
aws logs tail /aws/cloudfront/E16LPJDBIL5DEE --follow

# Backend API logs
aws logs tail /aws/lambda/pv-api-prod-api --follow

# Orchestrator logs
aws logs tail /aws/lambda/rin-discord-bot --follow
```

### Deployment Rollback

**Frontend Rollback:**
```powershell
# Restore from S3 backup (if versioning enabled)
aws s3 sync s3://valine-frontend-prod-backups/2025-01-01/ `
    s3://valine-frontend-prod/ --delete
    
aws cloudfront create-invalidation `
    --distribution-id E16LPJDBIL5DEE --paths "/*"
```

**Backend Rollback:**
```powershell
cd serverless
npx serverless rollback --stage prod
```

See the [Project Bible - Rollback Procedures](../PROJECT_BIBLE.md#rollback-procedures) for complete rollback instructions.

## Required GitHub Secrets

Workflows require these secrets to be configured in GitHub repository settings:

| Secret | Description | Used By |
|--------|-------------|---------|
| `VITE_API_BASE` | Production API Gateway URL | Frontend Deploy |
| `VITE_ALLOWED_USER_EMAILS` | Email allowlist | Frontend Deploy |
| `DATABASE_URL` | PostgreSQL connection string | Backend Deploy |
| `JWT_SECRET` | JWT signing secret | Backend Deploy |
| `DISCORD_BOT_TOKEN` | Discord bot token | Orchestrator Deploy |
| `DISCORD_PUBLIC_KEY` | Discord public key for webhooks | Orchestrator Deploy |

**AWS Credentials:** Not needed! Workflows use OIDC for authentication.

## Workflow File Locations

Key workflows referenced in this document:

```
.github/workflows/
├── ci-pr-check.yml              # PR quality gates
├── accessibility-audit.yml      # WCAG AA compliance
├── lighthouse-ci.yml            # Performance budgets
├── security-audit.yml           # Vulnerability scanning
├── client-deploy.yml            # Frontend deployment
├── backend-deploy.yml           # Backend deployment
├── orchestrator-deploy.yml      # Discord bot deployment
└── README.md                    # Complete workflow index
```

## Manual Deployment Triggers

### Via GitHub Actions UI

1. Navigate to **Actions** tab
2. Select workflow (e.g., "Frontend Deploy")
3. Click **Run workflow**
4. Select branch (usually `main`)
5. Click **Run workflow** button

### Via Discord Bot

```
/deploy-client      # Deploy frontend
/deploy-backend     # Deploy backend
```

Bot will confirm action, trigger workflow, and notify on completion.

## Next Steps

- **[Architecture Overview](architecture.md)** - Understand the system design
- **[Build and Run Locally](build-and-run-locally.md)** - Set up local development
- **[Frontend Build and Deploy](frontend-build-and-deploy.md)** - Learn the frontend pipeline
- **[Backend Build and Deploy](backend-build-and-deploy.md)** - Learn the backend pipeline

## Additional Resources

- **[Project Bible - CI/CD Workflows](../PROJECT_BIBLE.md#cicd-workflows)** - Complete workflow documentation
- **[Workflows README](./.github/workflows/README.md)** - Detailed workflow index (if exists)
- **[QA Documentation](../qa/README.md)** - Quality assurance processes
- **[Security Documentation](../security/guide.md)** - Security policies and procedures
- **[Orchestrator Documentation](../../orchestrator/docs/README.md)** - Discord bot architecture
