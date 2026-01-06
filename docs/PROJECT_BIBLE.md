# Project Valine - The Bible
## Complete Master Reference & Single Source of Truth

**Version:** 2.1  
**Last Updated:** 2026-01-05  
**Purpose:** This document serves as the complete, authoritative reference for Project Valine (Joint), consolidating all architectural decisions, database schemas, API endpoints, deployment procedures, and operational knowledge into a single source of truth.

## 🌐 Production Endpoints (Confirmed)

- **Frontend (CloudFront):** https://dkmxy676d3vgc.cloudfront.net
- **Frontend S3 Bucket:** `valine-frontend-prod`
- **CloudFront Distribution ID:** `E16LPJDBIL5DEE`
- **Production API Base:** https://wkndtj22ab.execute-api.us-west-2.amazonaws.com
- **Media Uploads Bucket:** `valine-media-uploads`

## 🔐 Database Connection

**Canonical DATABASE_URL Format (example with placeholder credentials):**
```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

**⚠️ CRITICAL:** Database URLs must NEVER contain spaces. Spaces cause authentication and connection failures.

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Overview](#project-overview)
3. [Complete Architecture](#complete-architecture)
4. [Database Schema Reference](#database-schema-reference)
5. [API Endpoints Reference](#api-endpoints-reference)
6. [Authentication & Security](#authentication--security)
7. [Deployment Procedures](#deployment-procedures)
8. [Environment Configuration](#environment-configuration)
9. [Testing Strategy](#testing-strategy)
10. [Agent Instructions & Workflows](#agent-instructions--workflows)
11. [Troubleshooting Guide](#troubleshooting-guide)
12. [Project Status & Roadmap](#project-status--roadmap)
13. [Quick Reference Cards](#quick-reference-cards)

---

## Executive Summary

### What is Project Valine (Joint)?

**Joint** is a **LinkedIn-style professional networking platform** specifically designed for creative professionals in the entertainment industry—voice actors, writers, and artists. The platform enables users to:

- Build professional profiles with portfolios, credits, and work samples
- Connect and collaborate with other creative professionals
- Share scripts, auditions, and creative content
- Manage projects and communication workflows
- Discover opportunities and showcase talent

### Technology Foundation

| Component | Technology |
|-----------|-----------|
| **Frontend** | React 18 + Vite 5, Tailwind CSS 3, React Router v6 |
| **Backend** | Node.js 20.x on AWS Lambda (Serverless Framework) |
| **Database** | PostgreSQL (Amazon RDS) with Prisma ORM |
| **File Storage** | Amazon S3 with presigned URLs |
| **CDN** | Amazon CloudFront |
| **API Gateway** | AWS API Gateway (REST) |
| **Orchestrator** | Python 3.11 Discord bot (AWS SAM) |
| **State Management** | DynamoDB (orchestrator), React Context (frontend) |
| **CI/CD** | GitHub Actions with AWS OIDC |

### Current Status

- **Production Readiness:** 83% Complete (Phases 00-08 of 13)
- **Test Coverage:** 107 automated tests, 45% code coverage
- **Security:** JWT authentication, 2FA support, CSRF protection, rate limiting
- **Deployment:** Serverless AWS infrastructure (staging + production environments)

---

## Project Overview

### Core Features

#### Platform Capabilities
1. **User Authentication**
   - JWT-based authentication with HttpOnly cookies
   - Email verification system
   - 2FA support (TOTP)
   - Password reset workflows
   - Owner-only mode with email allowlisting

2. **Professional Profiles**
   - User profiles with vanity URLs
   - Portfolio links (external social media, websites)
   - Professional credits and education history
   - Media uploads (audio, video, images)
   - Theme preferences (light/dark mode)
   - Onboarding workflow (6-step profile builder)

3. **Content Management**
   - Posts with media attachments and tags
   - Reels (short-form video content)
   - Scripts and auditions
   - Comments, likes, and bookmarks
   - Hashtag support

4. **Networking Features**
   - Connection requests (pending/accepted/rejected)
   - Direct messaging and conversations
   - Notifications system
   - User search and discovery

5. **Media System**
   - S3-based file storage with presigned URLs
   - Video processing pipeline
   - Image optimization
   - Thumbnail generation
   - Privacy controls (public/private/connections-only)

#### Infrastructure & Automation
- **Discord Bot Orchestrator ("Rin")**: Unified bot with specialized agent personalities
  - Deployment automation (`/deploy-client`)
  - Infrastructure diagnostics (`/diagnose`, `/verify-latest`)
  - CI/CD triage (`/triage`)
  - Status reporting (`/status`, `/status-digest`)
- **DynamoDB Persistence**: Conversation state with automatic TTL cleanup
- **GitHub Actions Integration**: Automated quality checks and deployments
- **Staged Deployment**: Separate staging and production environments

### Repository Structure

```
Project-Valine/
├── src/                      # React frontend source code
│   ├── components/           # Reusable UI components
│   │   ├── ui/              # Base UI primitives (Button, Input, Card)
│   │   ├── layout/          # Layout components (Header, Footer, Sidebar)
│   │   └── features/        # Feature-specific components
│   ├── pages/               # Page components (route views)
│   ├── routes/              # Route definitions and protection
│   ├── services/            # API service layer
│   ├── contexts/            # React Context providers
│   ├── hooks/               # Custom React hooks
│   └── utils/               # Utility functions
│
├── serverless/              # Serverless Backend (CANONICAL for production)
│   ├── src/
│   │   ├── api/            # API route handlers
│   │   ├── middleware/     # Express-style middleware
│   │   ├── db/             # Prisma client and database utilities
│   │   └── utils/          # Helper functions
│   ├── handler.js          # Main Lambda handler
│   ├── serverless.yml      # Serverless Framework configuration
│   ├── package.json        # Backend dependencies
│   └── tests/              # Backend test suite
│
├── api/                     # Database & Prisma
│   └── prisma/
│       ├── schema.prisma   # Database schema definition
│       └── migrations/     # Database migration history
│
├── infra/                   # Infrastructure code
│   ├── serverless.yml      # Presign function config
│   ├── waf/                # WAF configuration
│   └── cloudfront/         # CloudFront functions
│
├── orchestrator/            # Discord Bot & Automation
│   ├── app/
│   │   ├── handlers/       # Lambda handlers (Discord webhook, slash commands)
│   │   ├── agents/         # Agent implementations (deploy, triage, QA)
│   │   ├── services/       # External service clients (GitHub, Discord API)
│   │   └── utils/          # Utilities and helpers
│   ├── template.yaml       # AWS SAM template
│   ├── scripts/            # Automation scripts
│   ├── docs/               # Orchestrator documentation
│   └── tests/              # Python test suite
│
├── docs/                    # Documentation (THIS IS YOUR PRIMARY DOCS LOCATION)
│   ├── backend/            # Backend API documentation
│   ├── frontend/           # Frontend architecture & patterns
│   ├── deployment/         # Deployment guides (AWS, serverless)
│   ├── security/           # Security policies and procedures
│   ├── qa/                 # QA and CI/CD documentation
│   ├── troubleshooting/    # Problem resolution guides
│   ├── runbooks/           # Operational runbooks
│   ├── api/                # API reference documentation
│   └── archive/            # Historical docs (PHASE_* implementation docs)
│
├── scripts/                 # Utility scripts
│   ├── deployment/         # Deployment automation
│   ├── admin/              # Admin utilities
│   └── archive/            # Archived scripts
│
├── public/                  # Static assets (images, fonts, etc.)
├── tests/                   # E2E and integration tests
│   ├── e2e/                # Playwright end-to-end tests
│   └── manual/             # Manual test procedures
│
├── .github/
│   ├── workflows/          # CI/CD pipelines
│   └── agents/             # AI agent configurations (DO NOT READ)
│
├── archive/                 # Archived code and configs
├── logs/                    # Agent execution logs
├── reports/                 # Build and analysis reports
└── server/                  # Legacy Express server (DEV ONLY - NOT FOR PRODUCTION)

Key Root Files:
├── README.md               # Main project documentation
├── CHANGELOG.md            # Version history
├── CONTRIBUTING.md         # Contribution guidelines
├── SECURITY.md             # Security policies
├── package.json            # Frontend dependencies
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── .env.example            # Environment variable template
```

### Architecture Layers

#### Frontend (React SPA)
- **Hosting:** AWS CloudFront + S3
- **Build Tool:** Vite 5
- **Routing:** React Router v6 with protected routes
- **State Management:** React Context API + custom hooks
- **Styling:** Tailwind CSS 3 with custom theme
- **API Integration:** Axios with automatic fallback to mock data

#### Backend (Serverless Lambda)
- **Location:** `/serverless` directory (CANONICAL)
- **Framework:** Serverless Framework v3
- **Runtime:** Node.js 20.x
- **API Pattern:** Express-style routing via `serverless-http`
- **Database:** Prisma ORM connecting to PostgreSQL
- **Authentication:** JWT tokens (access + refresh) with HttpOnly cookies
- **Middleware:** Rate limiting, CSRF protection, request validation

#### Database (PostgreSQL + Prisma)
- **Provider:** Amazon RDS PostgreSQL
- **ORM:** Prisma 5.x
- **Migrations:** Prisma Migrate
- **Connection:** Connection pooling via Prisma
- **Schema Location:** `serverless/prisma/schema.prisma` (CANONICAL) and `api/prisma/schema.prisma` (must be kept in sync)
- **⚠️ IMPORTANT:** Production migrations run from `serverless/prisma`. Keep both schemas synchronized to prevent drift.

##### Schema Drift Prevention

**Why It Matters:**  
The project maintains two Prisma schema files that MUST remain identical:
- `api/prisma/schema.prisma` - Used for development and migrations
- `serverless/prisma/schema.prisma` - Used for Lambda Prisma client generation in production

If these schemas diverge, production will generate a Prisma client with different fields than development expects, causing runtime errors like "Unknown argument" or missing field errors.

**Prevention Tools:**
```bash
# Check for schema drift (exit code 1 if different)
node scripts/check-schema-drift.mjs
```

**Best Practices:**
1. Always update BOTH schemas when making changes
2. Run `node scripts/check-schema-drift.mjs` before committing
3. Create migrations in both `api/prisma/migrations/` and `serverless/prisma/migrations/`
4. Use idempotent SQL (`ADD COLUMN IF NOT EXISTS`) for safety
5. Test migrations locally before deploying to production

#### File Storage (S3)
- **Buckets:** 
  - `valine-frontend-prod` (frontend static assets)
  - `valine-media-uploads` (user-uploaded content)
- **Access:** Presigned URLs for secure temporary access
- **Processing:** Lambda functions for media processing
- **CDN:** CloudFront distribution for optimized delivery

#### Orchestrator (Discord Bot)
- **Framework:** AWS SAM
- **Runtime:** Python 3.11
- **State Storage:** DynamoDB with TTL
- **Handlers:**
  - Discord webhook endpoint (signature verification)
  - Slash command processor
  - GitHub Actions integration
- **Agents:** Deploy, Triage, QA Checker, Status Reporter

---

## Complete Architecture

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        Users / Clients                         │
│            (Web Browsers, Mobile, Discord Bot)                │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        │ HTTPS
                        ▼
┌───────────────────────────────────────────────────────────────┐
│                    AWS CloudFront CDN                          │
│              (Global Edge Locations + WAF)                     │
│  • SPA Routing (CloudFront Function)                          │
│  • Static Asset Caching                                       │
│  • DDoS Protection                                            │
└────────────┬──────────────────────┬───────────────────────────┘
             │                       │
             │ Static Assets         │ API Requests
             ▼                       ▼
┌─────────────────────┐   ┌──────────────────────────────────┐
│    S3 Bucket        │   │      API Gateway (REST)          │
│  (Frontend Build)   │   │  • Request validation            │
│                     │   │  • Throttling                    │
│  • index.html       │   │  • API key management           │
│  • /assets/*.js     │   │  • CORS configuration           │
│  • /assets/*.css    │   └───────────┬──────────────────────┘
│  • images, fonts    │               │
└─────────────────────┘               │ Invoke
                                      ▼
                        ┌──────────────────────────────────────┐
                        │      AWS Lambda Functions            │
                        │      (Node.js 20.x Runtime)          │
                        │                                      │
                        │  ┌────────────────────────────────┐ │
                        │  │   API Handler (handler.js)     │ │
                        │  │  • Express-style routing       │ │
                        │  │  • Authentication middleware   │ │
                        │  │  • Rate limiting               │ │
                        │  │  • CSRF protection             │ │
                        │  └───────────┬────────────────────┘ │
                        └──────────────┼──────────────────────┘
                                       │
                   ┌───────────────────┼───────────────────┐
                   │                   │                   │
                   ▼                   ▼                   ▼
         ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐
         │   Amazon RDS     │  │  Amazon S3   │  │  DynamoDB    │
         │   (PostgreSQL)   │  │  (Media)     │  │ (Bot State)  │
         │                  │  │              │  │              │
         │  • Users         │  │  • Uploads   │  │  • Sessions  │
         │  • Posts         │  │  • Avatars   │  │  • State     │
         │  • Profiles      │  │  • Videos    │  │              │
         │  • Messages      │  │              │  │              │
         └──────────────────┘  └──────────────┘  └──────────────┘

┌───────────────────────────────────────────────────────────────┐
│                  Discord Bot (Orchestrator)                    │
│                   (AWS SAM + Lambda + Python 3.11)            │
│                                                               │
│  • Deployment Agent (/deploy-client)                         │
│  • Triage Agent (/triage)                                    │
│  • Diagnostics Agent (/diagnose, /verify-latest)            │
│  • Status Reporter (/status, /status-digest)                │
│                                                               │
│  Integrations:                                               │
│  • GitHub Actions API (trigger workflows, get status)        │
│  • Discord API (slash commands, messages)                    │
│  • DynamoDB (conversation state persistence)                │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│                     CI/CD (GitHub Actions)                     │
│                                                               │
│  • Pull Request Checks (lint, test, security scan)           │
│  • Accessibility Audit (axe-core)                            │
│  • Lighthouse CI (performance budgets)                       │
│  • Frontend Deployment (build + upload to S3 + invalidate)   │
│  • Backend Deployment (serverless deploy)                    │
│  • Orchestrator Deployment (SAM deploy)                      │
└───────────────────────────────────────────────────────────────┘
```

### Data Flow: User Authentication

```
┌──────────┐
│  Client  │
│ (React)  │
└────┬─────┘
     │
     │ 1. POST /auth/login
     │    { email, password }
     ▼
┌─────────────────┐
│  API Gateway    │
└────┬────────────┘
     │
     │ 2. Invoke Lambda
     ▼
┌──────────────────────────────────┐
│  Lambda: authHandler             │
│                                  │
│  ┌────────────────────────────┐ │
│  │ 1. Validate input          │ │
│  │ 2. Query user from DB      │ │
│  │ 3. Verify password (bcrypt)│ │
│  │ 4. Generate JWT tokens     │ │
│  │ 5. Create session record   │ │
│  └────────────────────────────┘ │
└──────┬───────────────────────────┘
       │
       │ 3. Query user
       ▼
┌──────────────────┐
│  PostgreSQL RDS  │
│                  │
│  users table     │
│  sessions table  │
└──────┬───────────┘
       │
       │ 4. Return user + create session
       ▼
┌──────────────────────────────────┐
│  Lambda Response                 │
│                                  │
│  {                               │
│    user: { id, email, ... },     │
│    accessToken: "jwt...",        │
│    refreshToken: "jwt..."        │
│  }                               │
│                                  │
│  Set-Cookie: refreshToken=...;   │
│              HttpOnly; Secure    │
└──────┬───────────────────────────┘
       │
       │ 5. Return to client
       ▼
┌──────────────────┐
│  Client          │
│                  │
│  • Store tokens  │
│  • Redirect to   │
│    /dashboard    │
└──────────────────┘
```

### Data Flow: Create Post

```
┌──────────┐
│  Client  │
└────┬─────┘
     │
     │ 1. POST /api/posts
     │    Authorization: Bearer <token>
     │    { content, media, tags }
     ▼
┌─────────────────┐
│  API Gateway    │
└────┬────────────┘
     │
     │ 2. Invoke Lambda
     ▼
┌──────────────────────────────────┐
│  Lambda: postsHandler            │
│                                  │
│  ┌────────────────────────────┐ │
│  │ 1. Validate JWT token      │ │
│  │ 2. Check rate limit        │ │
│  │ 3. Validate input schema   │ │
│  │ 4. Insert post to DB       │ │
│  │ 5. Trigger notifications   │ │
│  └────────────────────────────┘ │
└──────┬───────────────────────────┘
       │
       │ 3. Insert post
       ▼
┌──────────────────┐
│  PostgreSQL RDS  │
│                  │
│  INSERT INTO     │
│  posts (...)     │
└──────┬───────────┘
       │
       │ 4. Return created post
       ▼
┌──────────────────────────────────┐
│  Lambda Response                 │
│                                  │
│  {                               │
│    id: "uuid",                   │
│    content: "...",               │
│    author: { ... },              │
│    createdAt: "..."              │
│  }                               │
└──────┬───────────────────────────┘
       │
       │ 5. Return to client
       ▼
┌──────────────────┐
│  Client          │
│                  │
│  • Update feed   │
│  • Show success  │
└──────────────────┘
```


---

## Authentication & Security

### JWT Authentication Flow

**Token Strategy:**
- **Access Token:** Short-lived (15 minutes), used for API authorization
- **Refresh Token:** Long-lived (7 days), used to obtain new access tokens
- **Token Rotation:** New refresh token issued on each refresh request

**Token Structure (JWT Payload):**
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "artist",
  "iat": 1234567890,
  "exp": 1234568790,
  "type": "access" | "refresh"
}
```

**Authentication Methods:**

1. **Bearer Token (localStorage)** - Current default
   ```
   Authorization: Bearer <accessToken>
   ```

2. **HttpOnly Cookies** - Recommended for production
   ```
   Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict
   ```

### Security Features

#### Rate Limiting
- **Implementation:** Express-rate-limit middleware
- **Storage:** In-memory (development) or Redis (production)
- **Limits by Endpoint:**
  - `/auth/register`: 5 requests per 15 minutes per IP
  - `/auth/login`: 10 requests per 5 minutes per IP
  - `/auth/refresh`: 20 requests per 5 minutes per user
  - `/api/posts`: 20 posts per hour per user
  - `/api/messages`: 60 messages per hour per user

#### CSRF Protection
- **Token Generation:** Server generates CSRF token on session creation
- **Token Delivery:** Sent in response header: `X-CSRF-Token`
- **Token Validation:** Client includes token in request header: `X-CSRF-Token`
- **Token Storage:** Client stores in memory or sessionStorage (NOT localStorage)

#### Password Security
- **Hashing:** bcrypt with salt rounds = 10
- **Requirements:** 
  - Minimum 8 characters
  - Must contain: uppercase, lowercase, number, special character
- **Reset Flow:** Token-based with 1-hour expiration

#### Email Allowlist (Owner-Only Mode)
- **Purpose:** Restrict registration to approved emails
- **Configuration:** `ALLOWED_USER_EMAILS` environment variable (comma-separated)
- **Enforcement:** Backend validation before account creation
- **Frontend UX:** Friendly restriction notice on /join page
- **Build Validation:** Pre-build checks ensure required emails present

#### 2FA Support
- **Method:** TOTP (Time-Based One-Time Password)
- **Library:** speakeasy
- **Backup Codes:** 10 recovery codes generated on 2FA setup
- **QR Code:** Generated for easy setup with authenticator apps

#### Audit Logging
- **Table:** `audit_logs`
- **Logged Actions:** login, logout, profile_update, post_create, settings_change, 2fa_enable, password_change
- **Logged Data:** userId, action, resource, resourceId, changes (JSON), ipAddress, userAgent, metadata

### Security Headers

**Implemented Headers:**
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: (see CSP section)
```

**CSP Policy (Content Security Policy):**
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: https:;
connect-src 'self' https://*.amazonaws.com;
media-src 'self' https://*.amazonaws.com;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
```

**Note:** CSP is currently in report-only mode for testing. Enable enforcement after monitoring reports.

---

## Deployment Procedures

### Prerequisites

**Required Tools:**
- Node.js 20.x or later
- Python 3.11 (for orchestrator)
- AWS CLI configured with credentials
- Serverless Framework: `npm install -g serverless`
- AWS SAM CLI: `pip install aws-sam-cli`

**AWS Resources Required:**
- RDS PostgreSQL database
- S3 buckets (frontend assets + media uploads)
- CloudFront distribution
- API Gateway REST API
- Lambda execution roles
- Parameter Store for secrets

### Frontend Deployment

**Build Process:**
```powershell
# 1. Install dependencies
npm install

# 2. Set environment variables
$env:VITE_API_BASE = "https://your-api-gateway-url.amazonaws.com/prod"
$env:VITE_ALLOWED_USER_EMAILS = "email1@example.com,email2@example.com"

# 3. Build production bundle
npm run build

# 4. Generate SRI (Subresource Integrity) hashes
node scripts/generate-sri.js

# 5. Verify build
npm run verify:sri
npm run postbuild-validate
```

**Deploy to S3 + CloudFront:**
```powershell
# Option 1: Automated script
./scripts/deploy-frontend.sh --bucket valine-frontend-prod --distribution E16LPJDBIL5DEE

# Option 2: Manual deployment
aws s3 sync ./dist s3://valine-frontend-prod/ --delete
aws cloudfront create-invalidation --distribution-id E16LPJDBIL5DEE --paths "/*"
```

**Post-Deployment Verification:**
```powershell
# Check CloudFront status
node scripts/check-cloudfront.js --distribution E16LPJDBIL5DEE

# Verify SPA routing
Invoke-WebRequest -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts/{id}" -Method Get
Invoke-WebRequest -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts/{id}" -Method Get

# Run automated verification
npm run verify:deployment
```

### Backend Deployment (Serverless API)

**Pre-Deployment Checks:**
```powershell
# 1. Verify environment contract
node scripts/verify-env-contract.mjs

# 2. Run tests
cd serverless
npm test

# 3. Optimize Prisma binaries
node ../scripts/prisma-optimize.mjs --prod

# 4. Generate Prisma client
npm run prisma:generate
```

**Deploy to AWS Lambda:**
```powershell
cd serverless

# Development/Staging
npx serverless deploy --stage dev --region us-west-2

# Production
npx serverless deploy --stage prod --region us-west-2
```

**Output:**
```
Service deployed successfully

endpoints:
  GET - https://abc123.execute-api.us-west-2.amazonaws.com/prod/health
  ANY - https://abc123.execute-api.us-west-2.amazonaws.com/prod/{proxy+}
  
functions:
  api: pv-api-prod-api (size: 15 MB)
  
layers:
  prisma: arn:aws:lambda:us-west-2:123456789:layer:prisma:1
```

**Database Migrations:**
```powershell
# Run migrations in production (from canonical serverless/prisma)
cd /home/runner/work/Project-Valine/Project-Valine/serverless
DATABASE_URL="postgresql://user:pass@host:5432/db" npx prisma migrate deploy

# Check migration status
npx prisma migrate status

# NOTE: Keep api/prisma/schema.prisma in sync with serverless/prisma/schema.prisma
# to prevent schema drift between development and production environments.
```

**Post-Deployment Verification:**
```powershell
# Test health endpoint
Invoke-RestMethod -Uri "https://abc123.execute-api.us-west-2.amazonaws.com/prod/health" -Method Get

# Run full API test suite
API_BASE="https://abc123.execute-api.us-west-2.amazonaws.com/prod" ./scripts/deployment/test-endpoints.sh

# Check logs
aws logs tail /aws/lambda/pv-api-prod-api --follow
```

### Orchestrator Deployment (Discord Bot)

**Build & Deploy:**
```powershell
cd orchestrator

# Build SAM application
sam build

# Deploy to AWS
sam deploy --guided

# Or use existing config
sam deploy --config-file samconfig.toml
```

**Register Discord Slash Commands:**
```powershell
# For staging (instant visibility)
./scripts/register_staging_slash_commands.sh

# For production (takes up to 1 hour)
# Configure in Discord Developer Portal:
# Interactions Endpoint URL: <DiscordWebhookUrl from deployment outputs>
```

**Test Discord Integration:**
```powershell
# Health check
Invoke-RestMethod -Uri "https://your-discord-lambda-url.amazonaws.com/health" -Method Get

# Test signature verification
./scripts/test-discord-endpoint.sh
```

### Rollback Procedures

**Frontend Rollback:**
```powershell
# List previous deployments
aws s3api list-objects-v2 --bucket valine-frontend-prod-backups

# Restore from backup
aws s3 sync s3://valine-frontend-prod-backups/2025-01-01/ s3://valine-frontend-prod/ --delete
aws cloudfront create-invalidation --distribution-id E16LPJDBIL5DEE --paths "/*"
```

**Backend Rollback:**
```powershell
cd serverless

# Rollback to previous deployment
npx serverless rollback --stage prod
```

**Database Migration Rollback:**
```powershell
cd /home/runner/work/Project-Valine/Project-Valine/api

# Check migration to rollback
Get-Content prisma/migrations/<migration-name>/ROLLBACK.md

# Execute rollback SQL manually via psql or database client
psql $DATABASE_URL < prisma/migrations/<migration-name>/rollback.sql
```

---

## Environment Configuration

### Required Environment Variables

#### Frontend (.env or .env.production)
```powershell
# API Configuration
VITE_API_BASE=https://your-api-gateway-url.amazonaws.com/prod

# Feature Flags
VITE_ALLOWED_USER_EMAILS=email1@example.com,email2@example.com
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_2FA=true

# External Services (optional)
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

#### Backend (serverless.yml environment section)
```yaml
environment:
  # Database
  DATABASE_URL: ${env:DATABASE_URL}
  
  # JWT Secrets (MUST be 32+ characters, NEVER use defaults in production)
  JWT_SECRET: ${env:JWT_SECRET}
  JWT_REFRESH_SECRET: ${env:JWT_REFRESH_SECRET}
  
  # Application Config
  NODE_ENV: production
  FRONTEND_URL: ${env:FRONTEND_URL}
  
  # Email Allowlist
  ALLOWED_USER_EMAILS: ${env:ALLOWED_USER_EMAILS}
  STRICT_ALLOWLIST: "1"
  
  # Email Service (optional)
  SMTP_HOST: ${env:SMTP_HOST, ''}
  SMTP_PORT: ${env:SMTP_PORT, '587'}
  SMTP_USER: ${env:SMTP_USER, ''}
  SMTP_PASS: ${env:SMTP_PASS, ''}
  SMTP_FROM: ${env:SMTP_FROM, 'noreply@joint.example.com'}
  
  # File Upload
  MEDIA_BUCKET_NAME: ${env:MEDIA_BUCKET_NAME}
  MEDIA_UPLOAD_LIMIT_MB: "50"
  
  # Feature Flags
  ENABLE_REGISTRATION: "false"
  ENABLE_2FA: "true"
  ENABLE_RATE_LIMITING: "true"
  
  # Caching (optional)
  CACHE_ENABLED: "false"
  REDIS_URL: ${env:REDIS_URL, ''}
  CACHE_TTL_PROFILE: "300"
  CACHE_TTL_SEARCH: "60"
```

#### Orchestrator (template.yaml Globals.Environment)
```yaml
Environment:
  Variables:
    # Discord
    DISCORD_BOT_TOKEN: !Ref DiscordBotToken
    DISCORD_PUBLIC_KEY: !Ref DiscordPublicKey
    DISCORD_APPLICATION_ID: !Ref DiscordApplicationId
    
    # GitHub
    GITHUB_TOKEN: !Ref GitHubToken
    GITHUB_REPO_OWNER: gcolon75
    GITHUB_REPO_NAME: Project-Valine
    
    # DynamoDB
    CONVERSATIONS_TABLE_NAME: !Ref ConversationsTable
    
    # Feature Flags
    ENABLE_DEPLOYMENT_AGENT: "true"
    ENABLE_TRIAGE_AGENT: "true"
```

### Secrets Management

**Storage Strategy:**
- **Development:** `.env` files (NOT committed to git)
- **CI/CD:** GitHub Secrets
- **Production:** AWS Systems Manager Parameter Store or Secrets Manager

**Rotate Secrets Every 90 Days:**
1. JWT_SECRET
2. JWT_REFRESH_SECRET
3. DATABASE_URL (password)
4. DISCORD_BOT_TOKEN
5. GITHUB_TOKEN
6. SMTP credentials

**Secret Scanning:**
```powershell
# Pre-commit hook
cp scripts/hooks/pre-commit-secret-scan.sh .git/hooks/pre-commit
# Note: chmod not needed in PowerShell

# Manual audit
node scripts/secret-audit.mjs

# CI/CD workflow
# Automatically runs on PR via .github/workflows/secret-hygiene.yml
```

---

## Testing Strategy

### Test Coverage

**Current Status:**
- **Total Tests:** 107
- **Pass Rate:** 100%
- **Coverage:** 45% overall
  - Hooks: 100%
  - Contexts: 80%
  - Components: 40%
  - Services: 50%

### Frontend Tests (Vitest)

**Run Tests:**
```powershell
# Watch mode (during development)
npm test

# Run once (CI)
npm run test:run

# With coverage report
npm run test:coverage

# Specific file
npm test -- src/components/Button.test.jsx
```

**Test Structure:**
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Button from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

### Backend Tests (Jest/Vitest)

**Run Tests:**
```powershell
cd serverless

# All tests
npm test

# With JSON reporter for analysis
npm test -- --reporter=json > test-results.json

# Analyze failures
node ../scripts/analyze-test-failures.mjs test-results.json

# Integration tests only
npm test -- --testPathPattern=integration
```

**Test Categories:**
- `auth` - Authentication and authorization
- `api` - API endpoint tests
- `database` - Database operations and migrations
- `validation` - Input validation and error handling
- `security` - Security features (rate limiting, CSRF, etc.)

### E2E Tests (Playwright)

**Run E2E Tests:**
```powershell
# Install browsers (first time only)
npx playwright install

# Run all E2E tests
npm run test:e2e

# Run specific test
npx playwright test tests/e2e/login.spec.js

# Debug mode with browser visible
npx playwright test --debug

# Generate test report
npx playwright show-report
```

**Example E2E Test:**
```javascript
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/login');
  
  await page.fill('input[name="email"]', 'user@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Welcome');
});
```

### Manual Testing Procedures

**Location:** `/tests/manual/README.md`

**Key Manual Test Scenarios:**
1. First-time user registration and onboarding
2. Profile creation with media uploads
3. Messaging and real-time notifications
4. Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
5. Mobile responsive behavior
6. Accessibility with screen readers
7. Performance under load (stress testing)

---

## Agent Instructions & Workflows

### Discord Bot Agents

**Rin - The Orchestrator Bot**

Rin is a unified Discord bot with specialized agent personalities for different tasks.

#### Available Commands

**Deployment Agent:**
- `/deploy-client` - Deploy frontend to S3 + CloudFront
- `/deploy-backend` - Deploy serverless backend
- `/deploy-orchestrator` - Deploy Discord bot itself

**Diagnostics Agent:**
- `/diagnose` - Run infrastructure health checks
- `/verify-latest` - Verify most recent deployment
- `/check-endpoints` - Test all API endpoints

**Triage Agent:**
- `/triage <issue-number>` - Analyze GitHub issue and suggest labels
- `/triage-pr <pr-number>` - Analyze pull request changes and risks

**Status Reporter:**
- `/status` - Get GitHub Actions workflow status
- `/status-digest` - Get daily summary of CI/CD runs

#### Agent Architecture

**State Management:**
- **Storage:** DynamoDB `conversations` table
- **TTL:** Conversations expire after 1 hour of inactivity
- **State Structure:**
```json
{
  "conversationId": "discord-channel-id",
  "userId": "discord-user-id",
  "agentType": "deploy" | "triage" | "diagnose" | "status",
  "state": "awaiting_confirmation" | "in_progress" | "completed",
  "context": {
    "deploymentTarget": "frontend",
    "prNumber": 123,
    "checkResults": {...}
  },
  "createdAt": 1234567890,
  "updatedAt": 1234567890,
  "ttl": 1234571490
}
```

**Agent Workflow (Example: Deploy Client):**
```
1. User: /deploy-client
2. Bot: "Deploy frontend to S3? React with ✅ to confirm."
3. Bot creates state: { conversationId, agentType: "deploy", state: "awaiting_confirmation" }
4. User reacts with ✅
5. Bot: "Deployment started. Triggering GitHub Actions workflow..."
6. Bot updates state: { state: "in_progress" }
7. Bot polls GitHub Actions API for workflow status
8. Workflow completes
9. Bot: "✅ Deployment successful! Frontend deployed to CloudFront."
10. Bot updates state: { state: "completed" }
11. State expires after TTL (1 hour)
```

### CI/CD Workflows

**Location:** `.github/workflows/`

#### Pull Request Checks (ci-pr-check.yml)
**Triggers:** Pull request opened, synchronized, or reopened  
**Jobs:**
1. Lint frontend code (ESLint)
2. Run frontend tests (Vitest)
3. Run backend tests (Jest)
4. Security audit (npm audit)
5. Build frontend (ensure no errors)

**Success Criteria:** All jobs must pass

#### Accessibility Audit (accessibility-audit.yml)
**Triggers:** Pull request, manual dispatch  
**Jobs:**
1. Build frontend
2. Start local server
3. Run axe-core accessibility tests on key routes
4. Upload results as artifact

**Success Criteria:** No critical accessibility violations

#### Lighthouse CI (lighthouse-ci.yml)
**Triggers:** Pull request, manual dispatch  
**Jobs:**
1. Build frontend
2. Run Lighthouse on multiple routes
3. Check performance budgets:
   - Performance score ≥ 90
   - Accessibility score ≥ 95
   - Best Practices score ≥ 90
   - SEO score ≥ 90

**Success Criteria:** All budgets met

#### Security Audit (security-audit.yml)
**Triggers:** Pull request, scheduled (weekly)  
**Jobs:**
1. Run npm audit for vulnerabilities
2. Check for hardcoded secrets (secret-audit.mjs)
3. CodeQL analysis (if available)

**Success Criteria:** No high/critical vulnerabilities, no secrets found

#### Frontend Deployment (client-deploy.yml)
**Triggers:** Push to main, manual dispatch, Discord bot (/deploy-client)  
**Jobs:**
1. Build frontend with production environment
2. Generate SRI hashes
3. Upload to S3
4. Invalidate CloudFront cache
5. Post deployment notification

**Success Criteria:** Build succeeds, S3 upload succeeds, invalidation succeeds

#### Backend Deployment (serverless-deploy.yml)
**Triggers:** Push to main (if serverless/ changed), manual dispatch  
**Jobs:**
1. Run backend tests
2. Optimize Prisma binaries
3. Deploy via Serverless Framework
4. Run database migrations
5. Test health endpoint
6. Post deployment notification

**Success Criteria:** Tests pass, deployment succeeds, health check passes

---

## Troubleshooting Guide

### Common Issues & Solutions

#### 1. White Screen / Blank Page

**Symptoms:**
- Users see blank white page
- Console error: "Unexpected token '<'"
- JavaScript bundle fails to load

**Diagnosis:**
```powershell
# Check CloudFront configuration
node scripts/check-cloudfront.js --distribution E16LPJDBIL5DEE

# Verify SPA routing
Invoke-WebRequest -Uri "https://d2vj0jjqgov8e1.cloudfront.net/" -Method Get
# Should return 200, NOT 404

# Check bundle integrity
Invoke-WebRequest -Uri "https://d2vj0jjqgov8e1.cloudfront.net/" -Method Get
# Should have Content-Type: application/javascript
```

**Solutions:**
1. **Missing CloudFront Function:**
   ```powershell
   # Associate SPA rewrite function
   ./scripts/cloudfront-associate-spa-function.ps1 -DistributionId E16LPJDBIL5DEE
   ```

2. **SRI Hash Mismatch:**
   ```powershell
   # Regenerate SRI hashes
   node scripts/generate-sri.js
   npm run verify:sri
   
   # Rebuild and redeploy
   npm run build
   ./scripts/deploy-frontend.sh
   ```

3. **Incorrect MIME Types:**
   ```powershell
   # Check S3 bucket policy and object metadata
   aws s3api head-object --bucket valine-frontend-prod --key assets/index-abc123.js
   
   # Fix: Re-upload with correct Content-Type
   aws s3 cp dist/assets/index-abc123.js s3://valine-frontend-prod/assets/ --content-type "application/javascript"
   ```

**See Also:** [docs/white-screen-runbook.md](white-screen-runbook.md)

#### 2. Login Failures / 503 Errors

**Symptoms:**
- Login returns 503 Service Unavailable
- Console error: "Prisma Client not initialized"
- Lambda cold start issues

**Diagnosis:**
```powershell
# Check Lambda logs
aws logs tail /aws/lambda/pv-api-prod-api --follow

# Test health endpoint
Invoke-RestMethod -Uri "https://your-api-gateway-url.amazonaws.com/prod/health" -Method Get
```

**Solutions:**
1. **Prisma Client Not Initialized:**
   - Fix implemented in `serverless/src/db/client.js`
   - Ensures synchronous loading at module load time
   - Fallback to async loading if sync fails

2. **Database Connection Issues:**
   ```powershell
   # Verify DATABASE_URL is set correctly
   aws lambda get-function-configuration --function-name pv-api-prod-api | Select-String DATABASE_URL
   
   # Test database connectivity
   psql $DATABASE_URL -c "SELECT 1;"
   ```

3. **Lambda Timeout:**
   ```powershell
   # Increase timeout in serverless.yml
   # functions.api.timeout: 30  # seconds
   
   # Redeploy
   cd serverless && npx serverless deploy --stage prod
   ```

#### 3. Email Allowlist Issues

**Symptoms:**
- Allowed users can't register
- Health endpoint doesn't show allowlist fields
- Registration always returns 403 Forbidden

**Diagnosis:**
```powershell
# Check health endpoint
Invoke-RestMethod -Uri "https://your-api-gateway-url.amazonaws.com/prod/health" -Method Get

# Verify environment variable
aws lambda get-function-configuration --function-name pv-api-prod-api | Select-String ALLOWED_USER_EMAILS
```

**Solutions:**
1. **Missing Environment Variable:**
   ```powershell
   # Add to serverless.yml and redeploy
   environment:
     ALLOWED_USER_EMAILS: "email1@example.com,email2@example.com"
   
   cd serverless && npx serverless deploy --stage prod
   ```

2. **Misconfigured Allowlist:**
   ```powershell
   # Audit allowlist configuration
   pwsh scripts/audit-allowlist.ps1
   
   # Emergency patch (if needed)
   pwsh scripts/patch-allowlist-env.ps1 -Emails "email1@example.com,email2@example.com"
   ```

**See Also:** [docs/ALLOWLIST_DEPLOYMENT_RUNBOOK.md](ALLOWLIST_DEPLOYMENT_RUNBOOK.md)

#### 4. API Connection Failures

**Symptoms:**
- Frontend shows "API Unavailable"
- All requests failing
- Automatic fallback to mock data

**Diagnosis:**
```powershell
# Check API_BASE configuration
echo $VITE_API_BASE

# Test API directly
Invoke-RestMethod -Uri "https://your-api-gateway-url.amazonaws.com/prod/health" -Method Get

# Check browser console
# window.__diagnostics.summary()
```

**Solutions:**
1. **Incorrect API_BASE:**
   ```powershell
   # Update .env or .env.production
   VITE_API_BASE=https://correct-api-url.amazonaws.com/prod
   
   # Rebuild
   npm run build
   ```

2. **CORS Issues:**
   ```yaml
   # serverless.yml
   functions:
     api:
       events:
         - http:
             cors:
               origin: 'https://your-frontend-domain.com'
               headers:
                 - Content-Type
                 - Authorization
                 - X-CSRF-Token
   ```

3. **API Gateway Configuration:**
   - Verify API Gateway deployment stage
   - Check resource policies
   - Verify Lambda permissions

#### 5. Database Migration Failures

**Symptoms:**
- Migration hangs or fails
- Schema out of sync with database
- Prisma client errors

**Diagnosis:**
```powershell
# Check migration status (use serverless directory for production)
cd /home/runner/work/Project-Valine/Project-Valine/serverless
npx prisma migrate status

# Check database connection
npx prisma db pull
```

**Solutions:**
1. **Failed Migration:**
   ```powershell
   # Mark migration as applied (if manually fixed or columns already exist)
   npx prisma migrate resolve --applied <migration-name>
   
   # Example: If 20251224033820_add_post_access_system failed due to existing columns
   cd /home/runner/work/Project-Valine/Project-Valine/serverless
   npx prisma migrate resolve --applied "20251224033820_add_post_access_system"
   
   # Or rollback
   psql $DATABASE_URL < prisma/migrations/<migration-name>/rollback.sql
   npx prisma migrate resolve --rolled-back <migration-name>
   ```

2. **Schema Drift:**
   ```powershell
   # Generate migration from current schema
   npx prisma migrate dev --name fix_schema_drift
   
   # Deploy to production
   npx prisma migrate deploy
   ```

3. **Connection Pool Exhaustion:**
   ```powershell
   # Increase connection limit in DATABASE_URL
   # postgresql://user:pass@host:5432/db?connection_limit=10
   ```

---

## Project Status & Roadmap

### Current Status (As of 2025-12-12)

**Production Readiness:** 83% Complete

**Completed Phases (00-08 of 13):**
- ✅ Phase 00: Repository setup and initial structure
- ✅ Phase 01: Frontend foundation (React + Vite)
- ✅ Phase 02: Authentication system (JWT, login, register)
- ✅ Phase 03: Backend API infrastructure
- ✅ Phase 04: Database schema and Prisma setup
- ✅ Phase 05: CI/CD pipelines and quality checks
- ✅ Phase 06: Profile builder and onboarding
- ✅ Phase 07: Security hardening (rate limiting, CSRF, 2FA)
- ✅ Phase 08: Deployment automation and orchestrator

**In Progress (Phase 09-13):**
- 🔄 Phase 09: Real-time messaging and notifications
- ⏳ Phase 10: Media processing pipeline
- ⏳ Phase 11: Search and discovery features
- ⏳ Phase 12: Analytics and insights dashboard
- ⏳ Phase 13: Production launch and monitoring

### Known Issues & Limitations

**High Priority:**
1. Email verification not fully implemented (SMTP stub)
2. Real-time features (WebSocket) not yet implemented
3. Video processing pipeline incomplete
4. Search indexing not optimized

**Medium Priority:**
1. CSP in report-only mode (needs enforcement)
2. WAF detached (needs reattachment plan)
3. Redis caching disabled by default
4. Mobile app not yet started

**Low Priority:**
1. Some test coverage gaps (40% component coverage)
2. Documentation could be more comprehensive
3. Performance optimizations needed
4. Internationalization (i18n) not implemented

### Roadmap

**Q1 2026:**
- Complete Phase 09 (messaging)
- Complete Phase 10 (media processing)
- Launch beta with limited user group

**Q2 2026:**
- Complete Phase 11 (search)
- Complete Phase 12 (analytics)
- Scale to 1,000 users

**Q3 2026:**
- Complete Phase 13 (production launch)
- Mobile app MVP
- Scale to 10,000 users

**Q4 2026:**
- Advanced features (recommendations, AI assistance)
- Mobile app full feature parity
- Scale to 100,000 users

---

## Quick Reference Cards

### Developer Quick Start
```powershell
# Clone and install
git clone https://github.com/gcolon75/Project-Valine.git
cd Project-Valine
npm install

# Start frontend dev server
npm run dev

# Start backend locally
cd serverless
npm install
npx serverless offline start

# Run tests
npm test
cd serverless && npm test
```

### Essential File Locations
- **Prisma Schema:** `/api/prisma/schema.prisma`
- **Frontend Routes:** `/src/routes/index.jsx`
- **Backend Handler:** `/serverless/handler.js`
- **API Endpoints:** `/serverless/src/api/`
- **Environment Examples:** `.env.example`, `.env.local.example`
- **Deployment Scripts:** `/scripts/deployment/`
- **Documentation:** `/docs/`

### Key Environment Variables
```powershell
# Frontend
VITE_API_BASE=https://api-url.amazonaws.com/prod
VITE_ALLOWED_USER_EMAILS=email1@example.com

# Backend
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-32-char-secret-here
FRONTEND_URL=https://your-domain.com
ALLOWED_USER_EMAILS=email1@example.com,email2@example.com
```

### Useful Commands
```powershell
# Build
npm run build                    # Frontend production build
npm run build:sri                # Build with SRI hashes

# Test
npm test                         # Run all tests
npm run test:coverage            # With coverage
npm run test:e2e                 # E2E tests

# Deploy
./scripts/deploy-frontend.sh    # Deploy frontend
cd serverless && npx serverless deploy  # Deploy backend

# Utilities
node scripts/secret-audit.mjs            # Scan for secrets
node scripts/verify-env-contract.mjs     # Validate env vars
node scripts/check-cloudfront.js         # Check CloudFront status
```

### API Testing
```powershell
# Health check
Invoke-RestMethod -Uri "https://api-url.amazonaws.com/prod/health" -Method Get

# Register
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/register" -Method Post -Headers @{
    "Content-Type" = "application/json"
    "Content-Type" = "application/json"
    "Authorization" = "Bearer <access-token>"
} -Body '{"email":"user@example.com","password":"SecurePass123!","username":"johndoe"}' -ContentType 'application/json'
```

### Troubleshooting Commands
```powershell
# Frontend issues
node scripts/diagnose-white-screen.js --domain your-domain.com
node scripts/verify-spa-rewrite.js
npm run verify:sri

# Backend issues
aws logs tail /aws/lambda/pv-api-prod-api --follow
npx prisma migrate status
node scripts/check-auth-backend.js

# Database
psql $DATABASE_URL -c "SELECT * FROM users LIMIT 1;"
npx prisma studio  # Visual database browser
```

---

## Additional Resources

### Documentation Index
- **[README.md](../README.md)** - Main project documentation
- **[PROJECT_VALINE_SYSTEM_HANDBOOK.md](PROJECT_VALINE_SYSTEM_HANDBOOK.md)** - Detailed system handbook
- **[COMPREHENSIVE_SUMMARY.md](backend/COMPREHENSIVE_SUMMARY.md)** - Backend comprehensive summary
- **[docs/](.)** - Complete documentation directory

### External Resources
- **Prisma Documentation:** https://www.prisma.io/docs/
- **React Documentation:** https://react.dev/
- **Vite Documentation:** https://vitejs.dev/
- **Serverless Framework:** https://www.serverless.com/framework/docs/
- **AWS Lambda:** https://docs.aws.amazon.com/lambda/
- **AWS SAM:** https://docs.aws.amazon.com/serverless-application-model/

### Support & Community
- **GitHub Issues:** https://github.com/gcolon75/Project-Valine/issues
- **Discord Server:** [Join for real-time support]
- **Contributing Guide:** [CONTRIBUTING.md](../CONTRIBUTING.md)

---

**Document Version:** 2.0  
**Last Updated:** 2025-12-12  
**Maintained By:** Project Valine Documentation Team  
**Next Review:** 2026-01-12

---

*This document serves as the single source of truth for Project Valine. All other documentation should reference this Bible for authoritative information.*
