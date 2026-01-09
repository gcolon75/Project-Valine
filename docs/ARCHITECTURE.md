# Project Valine - System Architecture

**Version:** 1.0  
**Last Updated:** 2026-01-05  
**Purpose:** High-level system architecture overview for Project Valine (Joint)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Component Breakdown](#component-breakdown)
4. [Data Flow](#data-flow)
5. [Security Architecture](#security-architecture)
6. [Scalability & Performance](#scalability--performance)
7. [Disaster Recovery](#disaster-recovery)

---

## System Overview

**Project Valine (Joint)** is a serverless, cloud-native professional networking platform built on AWS infrastructure. The system uses a modern microservices architecture with the following key characteristics:

- **Serverless-first:** AWS Lambda for compute, eliminating server management
- **Event-driven:** Asynchronous processing via SQS and EventBridge
- **API-driven:** RESTful APIs via API Gateway
- **Static frontend:** React SPA delivered via CloudFront CDN
- **Managed services:** RDS PostgreSQL, S3, DynamoDB for persistence

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│                                                                   │
│  Browser/Mobile App                                              │
│  └── React 18 + Vite 5 (SPA)                                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EDGE/CDN LAYER                              │
│                                                                   │
│  CloudFront Distribution (E16LPJDBIL5DEE)                       │
│  ├── Origin: S3 (valine-frontend-prod)                          │
│  ├── Custom Domain: dkmxy676d3vgc.cloudfront.net               │
│  ├── SSL/TLS Termination                                        │
│  └── Caching Strategy (SPA, no cache on index.html)            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ API Requests
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                           │
│                                                                   │
│  API Gateway (REST)                                              │
│  ├── Base: ce73w43mga.execute-api.us-west-2.amazonaws.com      │
│       ⚠️ Verify: .deploy/last-api-base.txt                      │
│  ├── Rate Limiting (10k req/sec per account)                   │
│  ├── Request Validation & Transformation                        │
│  ├── CORS Configuration                                         │
│  └── JWT Authorization (custom authorizer)                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Lambda Invocation
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    COMPUTE LAYER (Serverless)                    │
│                                                                   │
│  AWS Lambda Functions (Node.js 20.x)                            │
│  ├── Auth Handler: /auth/* (login, signup, verify)             │
│  ├── Users Handler: /users/* (profile CRUD)                    │
│  ├── Posts Handler: /posts/* (content management)              │
│  ├── Media Handler: /media/* (presigned URLs, uploads)         │
│  ├── Social Handler: /social/* (connections, follows)          │
│  ├── Search Handler: /search/* (full-text search)              │
│  └── Discord Orchestrator (Python 3.11 SAM)                    │
│      └── Command Handler, Event Processor                       │
└────┬──────────────────┬──────────────────┬──────────────────────┘
     │                  │                  │
     │                  │                  │ S3 Operations
     │                  │                  ▼
     │                  │         ┌──────────────────────┐
     │                  │         │   S3 Buckets         │
     │                  │         ├──────────────────────┤
     │                  │         │ valine-media-uploads │
     │                  │         │ (audio, video, img)  │
     │                  │         └──────────────────────┘
     │                  │
     │                  │ State Management
     │                  ▼
     │         ┌──────────────────────────┐
     │         │      DynamoDB            │
     │         ├──────────────────────────┤
     │         │ Orchestrator State       │
     │         │ - Conversations          │
     │         │ - Discord Interactions   │
     │         └──────────────────────────┘
     │
     │ Database Operations
     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
│                                                                   │
│  Amazon RDS PostgreSQL 13+                                       │
│  ├── Endpoint: project-valine-dev.c9aqq6yoiyvt.us-west-2        │
│  ├── Database: postgres                                         │
│  ├── ORM: Prisma 5.x                                            │
│  ├── Schema: 15 tables (Users, Posts, Credits, etc.)           │
│  └── SSL Required (sslmode=require)                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   OBSERVABILITY LAYER                            │
│                                                                   │
│  CloudWatch Logs + Metrics                                       │
│  ├── Lambda Execution Logs                                      │
│  ├── API Gateway Access Logs                                    │
│  ├── Custom Application Metrics                                 │
│  └── Alarms (error rates, latency, throttles)                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### Frontend (React SPA)

**Technology:** React 18 + Vite 5 + Tailwind CSS 3

**Key Features:**
- Single Page Application (client-side routing)
- Responsive design (mobile-first)
- Theme support (light/dark mode)
- Context-based state management
- JWT auth with HttpOnly cookies

**Build Output:**
- Static assets (HTML, JS, CSS)
- Deployed to S3, served via CloudFront
- Code-splitting for optimal load times

### Backend (Serverless Functions)

**Technology:** Node.js 20.x on AWS Lambda (Serverless Framework)

**Handlers:**

| Handler | Routes | Responsibilities |
|---------|--------|------------------|
| **auth.js** | `/auth/*` | Login, signup, email verification, password reset, 2FA |
| **users.js** | `/users/*` | Profile CRUD, avatar/banner uploads, vanity URLs |
| **posts.js** | `/posts/*` | Create/edit/delete posts, reactions, comments |
| **media.js** | `/media/*` | Generate presigned S3 URLs for uploads/downloads |
| **social.js** | `/social/*` | Follow/unfollow, connections, friend requests |
| **search.js** | `/search/*` | Full-text search across users/posts/content |

**Orchestrator (Discord Bot):**
- **Language:** Python 3.11 (AWS SAM)
- **Purpose:** Discord slash command interface for platform ops
- **State:** DynamoDB for conversation tracking
- **Commands:** User management, content moderation, system diagnostics

### Database (PostgreSQL)

**Provider:** Amazon RDS PostgreSQL 13+

**Schema Overview:**

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **User** | User accounts & profiles | id, email, normalizedEmail, username |
| **Post** | User-generated content | id, authorId, content, visibility |
| **Credit** | Professional credits | id, userId, title, role, year |
| **Education** | Education history | id, userId, institution, degree |
| **ProfileLink** | Social media links | id, userId, platform, url |
| **Follow** | Social graph | followerId, followingId |
| **Reaction** | Post reactions | userId, postId, type |
| **Comment** | Post comments | id, postId, authorId, content |
| **Session** | Auth sessions | token, userId, expiresAt |

**Connection Details:**
```
postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require
```

### Storage (S3)

**Buckets:**

| Bucket | Purpose | Access |
|--------|---------|--------|
| `valine-frontend-prod` | Static frontend assets | CloudFront origin, public read |
| `valine-media-uploads` | User media (audio, video, images) | Presigned URLs only, private |

**Upload Flow:**
1. Client requests presigned URL from `/media/upload` endpoint
2. Lambda generates presigned URL with expiration (15 minutes)
3. Client uploads directly to S3 using presigned URL
4. Client confirms upload, Lambda creates database record

---

## Data Flow

### Authentication Flow

```
1. User submits credentials → API Gateway → auth.js Lambda
2. Lambda validates credentials against PostgreSQL
3. Lambda generates JWT token (expires 7 days)
4. Lambda sets HttpOnly cookie with JWT
5. Client receives success response + user object
6. Subsequent requests include JWT in cookie header
7. API Gateway custom authorizer validates JWT before invoking Lambda
```

### Profile Update Flow

```
1. User updates profile → API Gateway → users.js Lambda
2. Lambda validates JWT (from cookie)
3. Lambda validates ownership (user can only edit own profile)
4. Lambda updates PostgreSQL via Prisma
5. Lambda returns updated user object
6. Frontend updates local state + UI
```

### Media Upload Flow

```
1. User initiates upload → /media/upload → media.js Lambda
2. Lambda generates presigned S3 URL (PUT, 15 min expiry)
3. Client uploads file directly to S3 using presigned URL
4. Client calls /media/confirm with file metadata
5. Lambda creates MediaUpload record in database
6. Lambda returns media object with CDN URL
```

---

## Security Architecture

### Authentication & Authorization

- **JWT Tokens:** HS256 signed, stored in HttpOnly cookies
- **Token Expiry:** 7 days (configurable)
- **Password Hashing:** bcrypt with salt rounds = 10
- **2FA Support:** TOTP (Time-based One-Time Password)
- **Session Management:** Database-backed sessions for revocation

### API Security

- **CORS:** Configured origins (frontend domain only)
- **Rate Limiting:** API Gateway throttling (10k req/sec per account)
- **Input Validation:** Joi schema validation on all endpoints
- **SQL Injection Prevention:** Prisma ORM with parameterized queries
- **XSS Prevention:** Content sanitization, CSP headers

### Data Security

- **Encryption at Rest:** RDS encryption enabled, S3 bucket encryption
- **Encryption in Transit:** TLS 1.2+ for all connections
- **Database Access:** Lambda VPC security groups, no public access
- **Secrets Management:** AWS Secrets Manager / Parameter Store

### Owner-Only Mode

- **Allowlist:** Email-based registration restriction
- **Admin Panel:** Discord bot commands for user management
- **Environment Variable:** `OWNER_EMAILS` (comma-separated list)

---

## Scalability & Performance

### Horizontal Scaling

- **Lambda:** Auto-scales to 1000 concurrent executions (default limit)
- **API Gateway:** Handles 10k requests/second per account
- **RDS:** Scalable instance types (db.t3.medium → db.r5.xlarge)
- **CloudFront:** Unlimited edge locations, auto-scaling

### Performance Optimizations

- **Lambda Cold Start:** < 1 second (Node.js 20.x)
- **Database Connection Pooling:** Prisma connection pooling (max 10 connections)
- **CloudFront Caching:** Static assets (1 year), API responses (no cache)
- **Code Splitting:** Vite lazy loading, route-based chunks

### Cost Optimization

- **Lambda:** Pay-per-execution (first 1M requests free per month)
- **API Gateway:** Pay-per-request ($3.50 per million requests)
- **RDS:** Reserved instances for production (up to 75% savings)
- **S3:** Lifecycle policies (move to Glacier after 90 days)

---

## Disaster Recovery

### Backup Strategy

- **RDS Automated Backups:** Daily snapshots, 7-day retention
- **Manual Snapshots:** Before major releases
- **S3 Versioning:** Enabled on media bucket
- **Code Repository:** GitHub (primary source of truth)

### Recovery Procedures

**RDS Restoration:**
```powershell
# Restore from automated backup
aws rds restore-db-instance-from-db-snapshot `
  --db-instance-identifier project-valine-prod-restored `
  --db-snapshot-identifier rds:project-valine-prod-2026-01-05
```

**Lambda Rollback:**
```powershell
# Rollback to previous version
cd serverless
serverless rollback --stage prod --timestamp <timestamp>
```

**Frontend Rollback:**
```powershell
# Revert CloudFront origin to previous S3 version
aws s3 sync s3://valine-frontend-prod-backup/ s3://valine-frontend-prod/ --delete
aws cloudfront create-invalidation --distribution-id E16LPJDBIL5DEE --paths "/*"
```

### High Availability

- **Multi-AZ RDS:** Primary + standby replica (auto-failover)
- **CloudFront:** Global edge network (99.9% SLA)
- **Lambda:** Multi-AZ by default (regional service)
- **S3:** 99.999999999% durability (11 nines)

---

## Related Documentation

- **[Project Bible](./PROJECT_BIBLE.md)** - Complete master reference
- **[Deployment Bible](./DEPLOYMENT_BIBLE.md)** - Deployment procedures
- **[API Reference](./API_REFERENCE.md)** - API endpoint documentation
- **[Operations](./OPERATIONS.md)** - Ops runbook and monitoring
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Common issues and fixes

---

**Last Updated:** 2026-01-05  
**Maintainer:** Project Valine Team  
**Status:** ✅ Current
