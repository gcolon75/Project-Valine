# Project Valine - Interview Preparation Sheet

**Version:** 1.0  
**Last Updated:** 2026-01-09  
**Purpose:** Technical reference for project interviews - comprehensive overview of architecture, technologies, and implementation details

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture & Infrastructure](#architecture--infrastructure)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Authentication & Security](#authentication--security)
7. [Deployment & Operations](#deployment--operations)
8. [Feature Implementation Status](#feature-implementation-status)
9. [Known Issues & Challenges](#known-issues--challenges)
10. [Development Workflow](#development-workflow)
11. [Key Resources & Links](#key-resources--links)
12. [Interview Questions to Ask](#interview-questions-to-ask)

---

## Project Overview

### What is Project Valine (Joint)?

**Joint** is a LinkedIn-style professional networking platform for creative professionals in the entertainment industry—specifically voice actors, writers, and artists.

**Core Purpose:**
- Professional profile creation with portfolios and credits
- Networking and collaboration between creatives
- Content sharing (scripts, auditions, creative work)
- Project management and communication
- Opportunity discovery and talent showcase

**Current Status:**
- **83% Complete** (Phases 00-08 of 13 done)
- Production deployment on AWS serverless infrastructure
- Active development with contractor support needed

---

## Technology Stack

### Frontend Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 18.x | UI framework |
| **Vite** | 5.x | Build tool and dev server |
| **React Router** | 6.x | Client-side routing |
| **Tailwind CSS** | 3.x | Styling framework |
| **Axios** | Latest | HTTP client for API calls |
| **React Context API** | Built-in | State management |

**Key Frontend Features:**
- Single Page Application (SPA) with client-side routing
- Responsive design (mobile-first approach)
- Dark/light theme support
- Accessibility features (WCAG AA compliance target)
- Progressive Web App (PWA) capabilities

### Backend Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 20.x | Runtime environment |
| **AWS Lambda** | Latest | Serverless compute |
| **Serverless Framework** | 3.x | Deployment and configuration |
| **Express-style routing** | via serverless-http | API routing pattern |
| **Prisma** | 5.x | ORM and database migrations |
| **PostgreSQL** | 13+ | Relational database |
| **JWT** | jsonwebtoken | Authentication tokens |
| **bcrypt** | Latest | Password hashing |

**Backend Architecture:**
- Serverless Lambda functions (Node.js 20.x runtime)
- Express-style routing via serverless-http
- Prisma ORM for database operations
- RESTful API design
- Middleware pattern (auth, rate limiting, CSRF protection)

### Infrastructure Stack

| Service | Purpose |
|---------|---------|
| **AWS CloudFront** | Global CDN and static asset delivery |
| **AWS S3** | Static file hosting and media storage |
| **AWS API Gateway** | REST API management |
| **AWS Lambda** | Serverless compute functions |
| **Amazon RDS PostgreSQL** | Production database |
| **AWS Systems Manager Parameter Store** | Secrets management |
| **DynamoDB** | Discord bot state storage |
| **GitHub Actions** | CI/CD pipelines |

### Orchestration & Automation

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Python** | 3.11 | Discord bot runtime |
| **AWS SAM** | Latest | Serverless Application Model |
| **Discord.py** | Latest | Discord bot framework |
| **GitHub Actions** | Latest | CI/CD workflows |

## Architecture & Infrastructure

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       End Users                              │
│                  (Web Browsers, Mobile)                      │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              AWS CloudFront (Global CDN)                     │
│              Distribution: E16LPJDBIL5DEE                    │
│              + WAF (Web Application Firewall)                │
└────────────┬────────────────────────┬────────────────────────┘
             │                        │
             │ Static Assets          │ API Requests
             ▼                        ▼
    ┌─────────────────┐    ┌──────────────────────────┐
    │   S3 Bucket     │    │   API Gateway (REST)     │
    │valine-frontend- │    │  Region: us-west-2       │
    │     prod        │    └───────────┬──────────────┘
    │                 │                │
    │ • React 18      │                │ Lambda Invoke
    │ • Vite build    │                ▼
    │ • Tailwind CSS  │    ┌──────────────────────────┐
    └─────────────────┘    │   Lambda Functions       │
                           │   (Node.js 20.x)         │
                           │                          │
                           │ • Auth Handler           │
                           │ • Users Handler          │
                           │ • Posts Handler          │
                           │ • Media Handler          │
                           │ • Notifications Handler  │
                           └────┬─────────────────┬───┘
                                │                 │
                    ┌───────────┴──────┐          │
                    ▼                  ▼          ▼
            ┌──────────────┐  ┌─────────────┐  ┌──────────┐
            │ RDS Postgres │  │ S3 (Media)  │  │ DynamoDB │
            │ 15 tables    │  │ valine-     │  │ (Bot)    │
            │              │  │ media-      │  │          │
            │              │  │ uploads     │  │          │
            └──────────────┘  └─────────────┘  └──────────┘
```

### Production Endpoints (Confirmed)

- **Frontend (CloudFront):** https://dkmxy676d3vgc.cloudfront.net
- **Frontend S3 Bucket:** `valine-frontend-prod`
- **CloudFront Distribution ID:** `E16LPJDBIL5DEE`
- **Production API Base:** https://ce73w43mga.execute-api.us-west-2.amazonaws.com  
  ⚠️ **Verify:** `Get-Content .deploy/last-api-base.txt`
- **Media Uploads Bucket:** `valine-media-uploads`
- **Allowed Emails:** ghawk075@gmail.com, valinejustin@gmail.com

### Data Flow Examples

**User Authentication Flow:**
1. User submits login (email + password)
2. API Gateway receives POST /auth/login
3. Lambda authHandler validates credentials
4. Queries PostgreSQL for user record
5. Verifies password with bcrypt
6. Generates JWT access token (15 min) + refresh token (7 days)
7. Returns tokens via HttpOnly cookies (SameSite=None; Secure)
8. Client stores access token, makes authenticated requests

**Post Creation Flow:**
1. User submits post content + media
2. API Gateway receives POST /posts (with Bearer token)
3. Lambda validates JWT token
4. Rate limiting check (20 posts/hour)
5. Input validation and sanitization
6. If media: generate presigned S3 URL
7. Insert post record to PostgreSQL
8. Trigger notifications to followers
9. Return created post object

---

## Database Schema

### Total Tables: 15

**Core Tables:**
- `users` - User accounts and basic profile info
- `profiles` - Extended profile information
- `posts` - User-generated content posts
- `media` - Media files (images, videos, audio)
- `comments` - Post comments
- `likes` - Post likes
- `bookmarks` - Saved posts

**Social/Networking:**
- `connectionRequests` - Follow/connection requests
- `messages` - Direct messages
- `conversations` - DM conversation threads
- `notifications` - User notifications

**Security & Auth:**
- `sessions` - Active user sessions
- `passwordResetTokens` - Password reset flow
- `twoFactorAuth` - 2FA settings
- `auditLogs` - Security audit trail

**Content Management:**
- `profileLinks` - External links (social media, portfolio)
- `hashtags` - Post hashtags
- `postHashtags` - Post-to-hashtag junction table

### Key Schema Details

**Users Table:**
```prisma
model User {
  id              String    @id @default(uuid())
  email           String    @unique
  username        String    @unique
  passwordHash    String
  role            String    @default("user")
  emailVerified   Boolean   @default(false)
  twoFactorEnabled Boolean  @default(false)
  avatar          String?
  banner          String?
  themePreference String    @default("system")
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  profile         Profile?
  posts           Post[]
  comments        Comment[]
  likes           Like[]
  sessions        Session[]
  notifications   Notification[]
}
```

**Posts Table:**
```prisma
model Post {
  id              String    @id @default(uuid())
  authorId        String
  content         String    @db.Text
  mediaUrls       String[]
  visibility      String    @default("public")
  accessType      String    @default("free")
  requireApproval Boolean   @default(false)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  author          User      @relation(fields: [authorId], references: [id])
  comments        Comment[]
  likes           Like[]
  hashtags        PostHashtag[]
}
```

### Database Migrations

**Location:** 
- Production: `serverless/prisma/schema.prisma` (CANONICAL)
- Development: `api/prisma/schema.prisma` (must be kept in sync)

**Migration Commands:**
```powershell
# Generate Prisma client
cd serverless
npx prisma generate

# Check migration status
npx prisma migrate status

# Apply migrations to production
npx prisma migrate deploy

# Create new migration
npx prisma migrate dev --name description_of_change
```

**⚠️ CRITICAL:** Always keep both schema files synchronized to prevent drift!

---

## API Endpoints

### Production API Base
```
https://ce73w43mga.execute-api.us-west-2.amazonaws.com
```
⚠️ **API Gateway IDs can change if the API is recreated. Always verify the current base by running:** `Get-Content .deploy/last-api-base.txt` **or** `scripts/get-api-base.ps1`

### Authentication Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| POST | /auth/register | Create new account | No |
| POST | /auth/login | User login | No |
| POST | /auth/logout | User logout | Yes |
| GET | /auth/me | Get current user | Yes |
| POST | /auth/refresh | Refresh access token | Yes (refresh token) |
| POST | /auth/forgot-password | Request password reset | No |
| POST | /auth/reset-password | Reset password with token | No |
| POST | /auth/verify-email | Verify email address | Yes |
| POST | /auth/2fa/setup | Setup 2FA | Yes |
| POST | /auth/2fa/verify | Verify 2FA code | Yes |

### User/Profile Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | /users/:id | Get user profile | No (public profiles) |
| PATCH | /users/me | Update own profile | Yes |
| GET | /me/profile | Get own full profile | Yes |
| PATCH | /me/profile | Update profile details | Yes |
| GET | /me/preferences | Get user preferences | Yes |
| PATCH | /me/preferences | Update preferences | Yes |
| POST | /me/avatar | Upload avatar | Yes |
| POST | /me/banner | Upload banner | Yes |

### Post Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | /posts | List posts (feed) | No (public) / Yes (filtered) |
| GET | /posts/:id | Get single post | No (public) / Yes (private) |
| POST | /posts | Create new post | Yes |
| PATCH | /posts/:id | Update post | Yes (author only) |
| DELETE | /posts/:id | Delete post | Yes (author only) |
| POST | /posts/:id/like | Like a post | Yes |
| DELETE | /posts/:id/like | Unlike a post | Yes |
| GET | /posts/:id/comments | Get post comments | No |
| POST | /posts/:id/comments | Add comment | Yes |
| PATCH | /comments/:id | Edit comment | Yes (author only) |
| DELETE | /comments/:id | Delete comment | Yes (author only) |

### Social/Connection Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | /connections | List my connections | Yes |
| POST | /connections/request | Send connection request | Yes |
| POST | /connections/accept | Accept request | Yes |
| POST | /connections/reject | Reject request | Yes |
| DELETE | /connections/:id | Remove connection | Yes |
| GET | /connections/pending | List pending requests | Yes |

### Notification Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | /notifications | List notifications | Yes |
| GET | /notifications/unread | Get unread count | Yes |
| PATCH | /notifications/:id/read | Mark as read | Yes |
| DELETE | /notifications/:id | Delete notification | Yes |
| POST | /notifications/mark-all-read | Mark all as read | Yes |

### Media Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| POST | /media/upload | Request presigned URL | Yes |
| POST | /media/confirm | Confirm upload complete | Yes |
| DELETE | /media/:id | Delete media file | Yes (owner only) |

### Health & Utility

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | /health | API health check | No |
| GET | /version | API version info | No |

---

## Authentication & Security

### JWT Token Strategy

**Access Token:**
- Lifespan: 15 minutes
- Purpose: API authorization
- Storage: Memory/localStorage (client-side)
- Delivery: Bearer token in Authorization header

**Refresh Token:**
- Lifespan: 7 days
- Purpose: Obtain new access tokens
- Storage: HttpOnly cookie (secure)
- Rotation: New refresh token on each use

**Token Payload:**
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

### Security Features Implemented

**Rate Limiting:**
- `/auth/register`: 5 requests per 15 minutes per IP
- `/auth/login`: 10 requests per 5 minutes per IP
- `/auth/refresh`: 20 requests per 5 minutes per user
- `/api/posts`: 20 posts per hour per user
- `/api/messages`: 60 messages per hour per user

**CSRF Protection:**
- Token generation on session creation
- Token validation on state-changing requests
- Double-submit cookie pattern

**Password Security:**
- bcrypt hashing (salt rounds = 10)
- Minimum 8 characters
- Must contain: uppercase, lowercase, number, special character
- Password history tracking (prevent reuse)

**2FA Support:**
- TOTP (Time-Based One-Time Password)
- QR code generation for authenticator apps
- 10 backup recovery codes

**Email Allowlist (Owner-Only Mode):**
- Enabled: `ENABLE_REGISTRATION=false`
- Allowed emails: ghawk075@gmail.com, valinejustin@gmail.com
- Enforced at backend registration endpoint
- Friendly UX on frontend /join page

**Security Headers:**
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: (configured)
```

**Audit Logging:**
- All authentication events logged
- Profile updates tracked
- Security-sensitive actions recorded
- IP address and user agent captured

---

## Deployment & Operations

### Deployment Process

**Frontend Deployment:**
```powershell
# 1. Build production bundle
npm run build

# 2. Upload to S3
aws s3 sync dist/ s3://valine-frontend-prod --delete

# 3. Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id E16LPJDBIL5DEE --paths "/*"
```

**Backend Deployment:**
```powershell
# 1. Navigate to serverless directory
cd serverless

# 2. Install dependencies
npm ci

# 3. Deploy to AWS Lambda
npx serverless@3 deploy --stage prod --region us-west-2
```

**Database Migrations:**
```powershell
# From serverless directory (PRODUCTION)
cd serverless
npx prisma migrate deploy

# Check status
npx prisma migrate status
```

### Environment Variables

**Frontend (.env.production):**
```
VITE_API_BASE=https://ce73w43mga.execute-api.us-west-2.amazonaws.com
VITE_ALLOWED_USER_EMAILS=ghawk075@gmail.com,valinejustin@gmail.com
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_2FA=true
```

**Backend (serverless.yml):**
```yaml
environment:
  DATABASE_URL: ${env:DATABASE_URL}
  JWT_SECRET: ${env:JWT_SECRET}
  JWT_REFRESH_SECRET: ${env:JWT_REFRESH_SECRET}
  NODE_ENV: production
  FRONTEND_URL: https://dkmxy676d3vgc.cloudfront.net
  ALLOWED_USER_EMAILS: ghawk075@gmail.com,valinejustin@gmail.com
  MEDIA_BUCKET_NAME: valine-media-uploads
  API_BASE_URL: https://ce73w43mga.execute-api.us-west-2.amazonaws.com
  ENABLE_REGISTRATION: false
  ENABLE_RATE_LIMITING: true
```

### Monitoring & Logs

**CloudWatch Logs:**
```powershell
# View Lambda logs
aws logs tail /aws/lambda/pv-api-prod-api --follow

# Filter for errors
aws logs filter-log-events --log-group-name /aws/lambda/pv-api-prod-api --filter-pattern "ERROR"
```

**Health Checks:**
```powershell
# API health
$apiBase = Get-Content .deploy/last-api-base.txt
Invoke-RestMethod -Uri "$apiBase/health" -Method Get

# Frontend health
Invoke-RestMethod -Uri "https://dkmxy676d3vgc.cloudfront.net/" -Method Get
```

---

## Feature Implementation Status

### ✅ Completed Features (83%)

**Phase 00-08 Complete:**
- ✅ Authentication system (JWT, login, register, 2FA)
- ✅ User profiles with onboarding flow
- ✅ Post creation and viewing
- ✅ Database schema (15 tables)
- ✅ Frontend foundation (React + Vite)
- ✅ Backend API (Serverless Lambda)
- ✅ CI/CD pipelines
- ✅ Email allowlist system
- ✅ Rate limiting and security features
- ✅ Discord bot orchestrator

### 🔄 Partially Implemented

**Profile Media Uploads:**
- ✅ Backend presigned URL generation
- ✅ S3 bucket configuration
- ⚠️ Frontend UI needs testing/fixes
- ⚠️ Edge cases need handling

**Follow/Unfollow (Connections):**
- ✅ Backend endpoints implemented
- ✅ Database schema complete
- ⚠️ Frontend UI needs implementation
- ⚠️ Notification triggers needed

**Notifications System:**
- ✅ Backend handler exists
- ✅ Database table ready
- ⚠️ Frontend integration needed
- ⚠️ Polling/real-time updates needed

**Post Liking:**
- ✅ Backend endpoints implemented
- ✅ Database schema complete
- ⚠️ Frontend UI needs verification
- ⚠️ Like counts unification needed

**Post Commenting:**
- ✅ Backend endpoints implemented
- ✅ Database schema complete
- ⚠️ Frontend needs API integration
- ⚠️ Edit/delete functionality needed
- ⚠️ Input sanitization needed

### ⏳ Remaining Tasks

**High Priority:**
1. **Post Access Gating:**
   - Finish owner approve/deny UI
   - Implement "My Requests" list
   - Hide "Pay" button for now

2. **Notifications:**
   - Wire bell badge + list to backend
   - Implement polling (30-60 second interval)
   - Add mark read/delete functionality
   - Trigger on follows and access requests

3. **Password Reset:**
   - Wire Forgot/Reset pages to backend
   - Implement token email via SES
   - Handle expired/invalid tokens

4. **Post Sharing:**
   - Add backend endpoints
   - Implement share/unshare UI
   - Show share counts

5. **Comments:**
   - Switch from local context to API
   - Add edit/delete functionality
   - Sanitize inputs (XSS prevention)

6. **Likes:**
   - Ensure like/unlike works on PostDetail and cards
   - Unify like counts across components

7. **Connections:**
   - Finalize follow/unfollow UI
   - Implement approve/reject flow
   - Add follow-back prompt
   - Verify profile status edges (blocked/visibility)

8. **Profile Media:**
   - Sanity test avatar/banner/audio uploads
   - Fix lingering edge cases
   - Ensure S3 bucket is valine-media-uploads

9. **QA/Tests:**
   - Smoke tests
   - E2E tests (post create, access request, reset password)
   - Fix critical UX bugs

10. **Onboarding:**
    - Tighten contractor onboarding doc
    - Remove outdated notes
    - Document that onboarding pages exist but allowlist prevents signup
    - Note: allowlist needed for testing onboarding process

**Known Bugs:**
- Login occasionally crashes (unknown cause)
- Network connection errors (403s/no profile found)
- Need investigation and fixes

---

## Known Issues & Challenges

### Critical Issues

**1. Login Crashes:**
- **Symptom:** Intermittent login failures
- **Cause:** Unknown - needs investigation
- **Impact:** User experience degradation
- **Status:** Under investigation

**2. 403 Errors / No Profile Found:**
- **Symptom:** Frequent 403 forbidden responses
- **Cause:** Possibly auth token issues or missing profiles
- **Impact:** Users blocked from accessing features
- **Status:** Needs debugging

**3. Network Connection Errors:**
- **Symptom:** "No network connection" errors in production
- **Cause:** CORS or API Gateway configuration
- **Impact:** API calls fail intermittently
- **Status:** Monitoring in CloudWatch

### Medium Priority Issues

**1. Email Verification:**
- SMTP not configured (stub implementation)
- Users cannot verify email addresses
- Workaround: Manual database updates

**2. Real-time Features:**
- No WebSocket implementation yet
- Notifications rely on polling (not real-time)
- Messages don't update instantly

**3. Video Processing:**
- Media pipeline incomplete
- No video transcoding
- Large files may cause issues

### Technical Debt

**1. Schema Drift Risk:**
- Two Prisma schemas must stay in sync
- Manual synchronization required
- Risk of production/dev divergence

**2. Test Coverage:**
- 45% overall coverage
- Some critical paths untested
- E2E tests incomplete

**3. WAF Detached:**
- Web Application Firewall not active
- Security risk in production
- Needs reattachment plan

**4. CSP Report-Only:**
- Content Security Policy not enforced
- Still gathering violation reports
- Needs to be enabled

---

## Development Workflow

### Local Development Setup

**Prerequisites:**
- Node.js 20.x
- npm 10.x+
- AWS CLI configured
- PostgreSQL (local or remote)

**Setup Steps:**
```powershell
# 1. Clone repository
git clone https://github.com/gcolon75/Project-Valine.git
cd Project-Valine

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies
cd serverless
npm install
cd ..

# 4. Configure environment variables
cp .env.example .env
cp serverless/.env.example serverless/.env
# Edit .env files with actual values

# 5. Generate Prisma client
cd serverless
npx prisma generate
cd ..

# 6. Run frontend dev server
npm run dev
# Opens at http://localhost:5173
```

### Git Workflow

**Branch Naming:**
```
feature/<feature-name>
fix/<bug-description>
hotfix/<urgent-fix>
docs/<doc-change>
```

**Commit Convention:**
```
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, test, chore
Examples:
- feat(auth): add 2FA support
- fix(posts): resolve comment API error
- docs(api): update endpoint documentation
```

**Pull Request Process:**
1. Create feature branch
2. Implement changes
3. Run tests: `npm test`
4. Create PR against `main`
5. Wait for CI checks to pass
6. Request review
7. Address feedback
8. Merge after approval

### Testing

**Frontend Tests:**
```powershell
# Run all tests
npm test

# With coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

**Backend Tests:**
```powershell
cd serverless
npm test
```

---

## Key Resources & Links

### Production URLs
- **Frontend:** https://dkmxy676d3vgc.cloudfront.net
- **API:** https://ce73w43mga.execute-api.us-west-2.amazonaws.com (⚠️ Verify: `.deploy/last-api-base.txt`)
- **S3 Bucket:** valine-frontend-prod
- **Media Bucket:** valine-media-uploads

### Documentation
- **Project Bible:** docs/PROJECT_BIBLE.md
- **Deployment Guide:** docs/DEPLOYMENT_BIBLE.md
- **Contractor Onboarding:** docs/CONTRACTOR_ONBOARDING.md
- **API Reference:** docs/API_REFERENCE.md
- **Troubleshooting:** docs/TROUBLESHOOTING.md
- **Architecture:** docs/ARCHITECTURE.md

### External Resources
- **GitHub Repository:** https://github.com/gcolon75/Project-Valine
- **AWS Console:** https://console.aws.amazon.com/
- **Prisma Docs:** https://www.prisma.io/docs/
- **React Docs:** https://react.dev/
- **Vite Docs:** https://vitejs.dev/

---

## Interview Questions to Ask

### Project Scope & Vision

1. **What are the top 3 priorities for the next 3 months?**
   - Understanding immediate goals

2. **Who is the target user base? How many users are we expecting?**
   - Helps understand scale requirements

3. **What are the main pain points users are experiencing currently?**
   - Identifies critical bugs to fix

4. **Are there any features we should deprioritize or remove?**
   - Understand scope management

### Technical Questions

5. **Why was serverless architecture chosen over traditional servers?**
   - Understand architectural decisions

6. **What's the long-term plan for real-time features (WebSockets)?**
   - Future infrastructure needs

7. **Are there any performance issues we should be aware of?**
   - Identify optimization opportunities

8. **What's the disaster recovery plan? Backup strategy?**
   - Business continuity

9. **Why two Prisma schemas (api/ and serverless/)?**
   - Understand development vs production setup

10. **What's the plan for the WAF reattachment?**
    - Security roadmap

### Process & Workflow

11. **What's the deployment frequency? Staging → Production process?**
    - Understand release cadence

12. **Who reviews and approves pull requests?**
    - Code review process

13. **What's the incident response process if production goes down?**
    - On-call expectations

14. **Are there any compliance requirements (GDPR, CCPA, etc.)?**
    - Legal/regulatory constraints

15. **What's the testing strategy? Any automated testing requirements?**
    - Quality assurance expectations

### Team & Communication

16. **What's the team structure? Who are the key stakeholders?**
    - Organizational context

17. **What's the preferred communication channel (Slack, Discord, email)?**
    - Day-to-day communication

18. **What's the expected work schedule and availability?**
    - Work-life balance

19. **Are there any team meetings or standups?**
    - Collaboration structure

20. **What's the onboarding process for new contractors?**
    - Support and training

### Feature-Specific Questions

21. **For the allowlist system: Will this be permanent or temporary?**
    - Feature longevity

22. **What's the monetization strategy (if any)?**
    - Business model

23. **Are there any third-party integrations planned?**
    - External dependencies

24. **What's the media storage budget? Any file size limits?**
    - Infrastructure constraints

25. **Is there a design system or UI/UX guidelines?**
    - Frontend standards

### Questions About Remaining Work

26. **What's the priority order for the remaining tasks?**
    - Work sequencing

27. **Are there any blockers or dependencies I should know about?**
    - Risk assessment

28. **What's considered "done" for each feature?**
    - Definition of done

29. **How much time is allocated for each feature?**
    - Timeline expectations

30. **What happens if we encounter unexpected technical challenges?**
    - Flexibility and problem-solving

---

## Quick Technical Talking Points

**When discussing the architecture:**
- "We're using a serverless architecture on AWS with Lambda functions for cost efficiency and auto-scaling"
- "The frontend is a React SPA deployed to S3 and served via CloudFront for global performance"
- "We use Prisma ORM with PostgreSQL for type-safe database operations"

**When discussing security:**
- "We implement JWT authentication with short-lived access tokens and longer-lived refresh tokens"
- "The system has rate limiting, CSRF protection, and comprehensive audit logging"
- "Email allowlist is currently active with ghawk075@gmail.com and valinejustin@gmail.com"

**When discussing deployment:**
- "Frontend deploys to S3 bucket valine-frontend-prod with CloudFront invalidation"
- "Backend uses Serverless Framework to deploy to AWS Lambda"
- "Database migrations use Prisma Migrate from the serverless/prisma directory"

**When discussing testing:**
- "We have 107 automated tests with 45% code coverage"
- "E2E tests use Playwright for critical user flows"
- "CI/CD runs on GitHub Actions with automated quality checks"

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-09  
**Prepared For:** Technical Interview - Project Valine Contractor Position  
**Maintained By:** Project Valine Team

---

*This document is your comprehensive technical reference for interviews. Review it thoroughly before any technical discussions about the project.*
