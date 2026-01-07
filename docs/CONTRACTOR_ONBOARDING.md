# Project Valine - Contractor Onboarding Guide

**Version:** 1.0  
**Last Updated:** 2026-01-07  
**Purpose:** Onboard temporary contractors to complete remaining features and bug fixes

---

## ⚠️ Important: This is NOT Canonical Documentation

This document is a **navigation aid** that links to canonical sources of truth. When in doubt, always refer to the 8 canonical documents listed in the [Appendix](#appendix-canonical-documentation).

---

## Table of Contents

1. [Welcome & Goals](#1-welcome--goals)
2. [10-Minute Orientation](#2-10-minute-orientation)
3. [Getting Access](#3-getting-access)
4. [Local Setup](#4-local-setup)
5. [Deploy & Verify](#5-deploy--verify)
6. [Debugging Flow](#6-debugging-flow)
7. [Feature Implementation Guide](#7-feature-implementation-guide)
8. [Working Agreements](#8-working-agreements)
9. [Security & Data Handling](#9-security--data-handling)
10. [Appendix](#10-appendix)

---

## 1. Welcome & Goals

### What You're Here to Finish

Welcome, contractor! Project Valine (code name "Joint") is a LinkedIn-style professional networking platform for creative professionals in the entertainment industry. The platform is **83% complete** (Phases 00-08 of 13 done), and your role is to complete remaining features and fix outstanding bugs.

**Your Mission:**
- Fix profile edit issues (media uploads, form validation, etc.)
- Implement/complete profile connections and social features (follow/unfollow)
- Build/complete notifications system
- Implement password reset workflow
- Complete sharing, liking, and commenting features
- Fix any related bugs discovered during implementation

**Current Status:**
- ✅ Authentication (JWT, login, register) - COMPLETE
- ✅ Database schema (15 tables) - COMPLETE
- ✅ Frontend foundation (React + Vite) - COMPLETE
- ✅ Backend API (Serverless Lambda) - COMPLETE
- ✅ CI/CD pipelines - COMPLETE
- 🔄 Profile editing (partial - needs fixes)
- 🔄 Social features (partial - follow/unfollow implemented, needs testing)
- 🔄 Notifications (handler exists, needs frontend integration)
- ⏳ Password reset (backend ready, frontend needed)
- ⏳ Sharing/Liking/Commenting (posts exist, interactions need completion)

---

## 2. 10-Minute Orientation

### What is Project Valine (Joint)?

Joint is a **professional networking platform** for voice actors, writers, and artists to:
- Build professional profiles with portfolios and credits
- Connect and collaborate with other creatives
- Share scripts, auditions, and creative content
- Manage projects and discover opportunities

### High-Level Architecture (ASCII Diagram)

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
└────────────┬────────────────────────┬────────────────────────┘
             │                        │
             │ Static Assets          │ API Requests
             ▼                        ▼
    ┌─────────────────┐    ┌──────────────────────────┐
    │   S3 Bucket     │    │   API Gateway (REST)     │
    │ (Frontend SPA)  │    │  Region: us-west-2       │
    │                 │    └───────────┬──────────────┘
    │ • React 18      │                │
    │ • Vite build    │                │ Lambda Invoke
    │ • Tailwind CSS  │                ▼
    └─────────────────┘    ┌──────────────────────────┐
                           │   Lambda Functions       │
                           │   (Node.js 20.x)         │
                           │                          │
                           │ • Auth Handler           │
                           │ • Users Handler          │
                           │ • Posts Handler          │
                           │ • Media Handler          │
                           │ • Notifications Handler  │
                           │ • Social/Connections     │
                           └────┬─────────────────┬───┘
                                │                 │
                    ┌───────────┴──────┐          │
                    ▼                  ▼          ▼
            ┌──────────────┐  ┌─────────────┐  ┌──────────┐
            │ RDS (Postgres)│  │ S3 (Media)  │  │ DynamoDB │
            │ 15 tables     │  │ Uploads     │  │ (Bot)    │
            └──────────────┘  └─────────────┘  └──────────┘

┌─────────────────────────────────────────────────────────────┐
│         Discord Bot (Orchestrator - Optional)                │
│         Python 3.11, AWS SAM, slash commands                 │
└─────────────────────────────────────────────────────────────┘
```

### Repository Map: Where Things Live

**Root directory:** `/home/runner/work/Project-Valine/Project-Valine`

```
Project-Valine/
├── src/                           # Frontend source code (React)
│   ├── components/                # UI components
│   │   ├── ui/                   # Base components (Button, Input, etc.)
│   │   └── features/             # Feature-specific components
│   ├── pages/                    # Page components (routes)
│   │   ├── ProfileEdit.jsx       # Profile editing page ⚠️ NEEDS FIXES
│   │   ├── Profile.jsx           # User profile view
│   │   └── ...
│   ├── routes/                   # Route definitions
│   │   └── App.jsx              # Main router config
│   ├── services/                 # API service layer
│   │   └── api.js               # Axios API client
│   ├── context/                  # React Context providers
│   │   └── AuthContext.jsx      # Auth state management
│   └── hooks/                    # Custom React hooks
│
├── serverless/                    # Backend (PRODUCTION - Canonical)
│   ├── src/
│   │   ├── handlers/             # Lambda function handlers
│   │   │   ├── auth.js          # Authentication endpoints
│   │   │   ├── users.js         # User CRUD operations
│   │   │   ├── posts.js         # Posts CRUD
│   │   │   ├── connections.js   # Follow/unfollow ⚠️ NEEDS TESTING
│   │   │   ├── notifications.js # Notifications ⚠️ NEEDS FRONTEND
│   │   │   ├── media.js         # File uploads (presigned URLs)
│   │   │   └── social.js        # Social features
│   │   ├── middleware/          # Express-style middleware
│   │   ├── db/                  # Prisma client
│   │   └── utils/               # Helper functions
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema (CANONICAL)
│   │   └── migrations/          # Migration history
│   ├── serverless.yml           # Serverless Framework config
│   └── package.json             # Backend dependencies
│
├── api/                          # Development Prisma (keep in sync!)
│   └── prisma/
│       ├── schema.prisma        # Must match serverless/prisma/schema.prisma
│       └── migrations/          # Migration history
│
├── orchestrator/                 # Discord Bot (Python 3.11, optional)
│   ├── app/
│   │   ├── handlers/            # Lambda handlers
│   │   └── agents/              # Bot agents
│   └── template.yaml            # AWS SAM config
│
├── docs/                         # Documentation (READ THESE!)
│   ├── PROJECT_BIBLE.md         # Master reference ⭐ START HERE
│   ├── ARCHITECTURE.md          # System architecture
│   ├── API_REFERENCE.md         # API endpoints
│   ├── DEPLOYMENT_BIBLE.md      # Deployment guide
│   ├── TROUBLESHOOTING.md       # Common issues
│   ├── OPERATIONS.md            # Ops runbook
│   └── archive/                 # Historical docs (read-only)
│
├── scripts/                      # Utility scripts
│   ├── deployment/              # Deploy automation
│   └── admin/                   # Admin utilities
│
├── tests/                        # Test suites
│   ├── e2e/                     # Playwright E2E tests
│   └── manual/                  # Manual test procedures
│
├── .github/
│   └── workflows/               # CI/CD pipelines
│
├── package.json                  # Frontend dependencies
├── vite.config.js               # Vite configuration
└── tailwind.config.js           # Tailwind CSS config
```

**Key Entry Points:**
- **Frontend Router:** `src/routes/App.jsx` - defines all routes
- **API Service Layer:** `src/services/api.js` - Axios client for backend calls
- **Backend Main Handler:** `serverless/handler.js` - Lambda entry point
- **Backend Routes:** `serverless/src/handlers/*.js` - individual endpoint handlers
- **Database Schema:** `serverless/prisma/schema.prisma` (production) and `api/prisma/schema.prisma` (dev - must match!)

---

## 3. Getting Access

### Checklist: What You Need Before Starting

#### ☐ GitHub Access
- [ ] Repository access granted: https://github.com/gcolon75/Project-Valine
- [ ] Branch protection rules understood (see [Working Agreements](#8-working-agreements))
- [ ] Two-factor authentication enabled on your GitHub account

#### ☐ AWS Access (Minimum Required)
- [ ] AWS CLI configured with credentials
- [ ] **Read access:**
  - CloudWatch Logs (view Lambda logs)
  - API Gateway (view endpoints)
  - S3 (view bucket contents)
- [ ] **Deploy access (if needed):**
  - Lambda (update functions)
  - CloudFormation (stack management)
  - S3 (upload frontend builds)
  - CloudFront (create invalidations)
- [ ] **Media access (if touching uploads):**
  - S3 bucket `valine-media-uploads` (read/write)

**Least-privilege recommendation:**
```powershell
# Configure AWS CLI (PowerShell)
aws configure
# Provide Access Key ID, Secret Access Key, Region: us-west-2
```

**AWS Policies Needed:**
- CloudWatchLogsReadOnlyAccess
- AWSLambda_FullAccess (if deploying)
- AmazonS3FullAccess (for frontend bucket and media uploads)
- CloudFrontFullAccess (for cache invalidation)
- IAMReadOnlyAccess (for viewing roles)

#### ☐ Environment Variables (NAMES ONLY - Values Provided Separately)

**Frontend (.env or .env.production):**
```powershell
VITE_API_BASE=<PROVIDED_BY_OWNER>
VITE_ALLOWED_USER_EMAILS=<PROVIDED_BY_OWNER>
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_2FA=true
```

**Backend (serverless.yml environment section):**
```yaml
DATABASE_URL=<PROVIDED_BY_OWNER>
JWT_SECRET=<PROVIDED_BY_OWNER>
JWT_REFRESH_SECRET=<PROVIDED_BY_OWNER>
FRONTEND_URL=<PROVIDED_BY_OWNER>
ALLOWED_USER_EMAILS=<PROVIDED_BY_OWNER>
MEDIA_BUCKET_NAME=valine-media-uploads
```

⚠️ **CRITICAL:** Values for these variables are **NEVER in docs or code**. Obtain them securely from the project owner via encrypted channel (1Password, AWS Secrets Manager, etc.).

**For detailed environment configuration, see:** [docs/PROJECT_BIBLE.md - Section 8: Environment Configuration](./PROJECT_BIBLE.md#environment-configuration)

#### ☐ Staging/Test Access
- [ ] Staging environment URL: <PROVIDED_BY_OWNER>
- [ ] Test account credentials: <PROVIDED_BY_OWNER>
- [ ] Email allowlist: Confirm your test email is added to `ALLOWED_USER_EMAILS`
- [ ] Database access (if needed): Connection string provided securely

---

## 4. Local Setup

### Prerequisites

| Tool | Version | Check Command | Install |
|------|---------|---------------|---------|
| Node.js | 20.x | `node --version` | https://nodejs.org |
| npm | 10.x+ | `npm --version` | (included with Node.js) |
| PowerShell | 5.1+ or 7+ | `$PSVersionTable.PSVersion` | (Windows built-in or https://github.com/PowerShell/PowerShell) |
| AWS CLI | 2.x+ | `aws --version` | https://aws.amazon.com/cli/ |
| Git | 2.x+ | `git --version` | https://git-scm.com |

### Step 1: Clone Repository

```powershell
# Clone the repository
git clone https://github.com/gcolon75/Project-Valine.git
cd Project-Valine

# Verify you're on the correct branch
git status
git branch
```

### Step 2: Install Frontend Dependencies

```powershell
# Install frontend dependencies (from root)
npm install

# Verify installation
npm list --depth=0
```

### Step 3: Install Backend Dependencies

```powershell
# Navigate to serverless directory
cd serverless

# Install backend dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Return to root
cd ..
```

### Step 4: Configure Environment Variables

```powershell
# Copy example files
Copy-Item .env.example .env
Copy-Item serverless\.env.example serverless\.env

# Edit .env files with values provided by owner
# Use any text editor (VSCode, Notepad, etc.)
code .env
code serverless\.env
```

**⚠️ Never commit these .env files!** They are in `.gitignore`.

### Step 5: Run Frontend Dev Server

```powershell
# Start frontend dev server (from root)
npm run dev

# Output should show:
#   VITE v7.x.x  ready in XXX ms
#   ➜  Local:   http://localhost:5173/
#   ➜  Network: use --host to expose
```

**Open browser:** http://localhost:5173

### Step 6: Run Backend Locally (Optional)

```powershell
# Navigate to serverless directory
cd serverless

# Option 1: Deploy to AWS (recommended for testing against real infra)
npm run deploy

# Option 2: Run serverless offline (NOT IMPLEMENTED - backend requires AWS)
# Backend is serverless-only, no local dev server available
# You must deploy to staging environment to test backend changes

# Return to root
cd ..
```

**Note:** Backend is designed for serverless deployment. For development, deploy to a staging environment rather than running locally.

### Step 7: Run Tests

```powershell
# Frontend tests (from root)
npm test

# Run with coverage
npm run test:coverage

# Backend tests (from serverless directory)
cd serverless
npm test
cd ..

# E2E tests (Playwright)
npm run test:e2e
```

**Expected results:**
- Frontend: ~107 tests passing
- Backend: Tests should pass (verify with `npm test`)
- E2E: Accessibility and visual tests

### Troubleshooting Local Setup

**Issue: "Module not found" errors**
```powershell
# Clear node_modules and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

**Issue: Prisma client errors**
```powershell
cd serverless
npm run prisma:generate
cd ..
```

**Issue: Port 5173 already in use**
```powershell
# Kill process on port 5173
Get-NetTCPConnection -LocalPort 5173 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Or run on different port
npm run dev -- --port 3000
```

**For more troubleshooting:** [docs/TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## 5. Deploy & Verify

**⚠️ IMPORTANT:** Do NOT duplicate deployment instructions here. Always refer to the canonical source.

**For complete deployment procedures, see:**
- **[docs/DEPLOYMENT_BIBLE.md](./DEPLOYMENT_BIBLE.md)** - Complete deployment guide (PowerShell only)

**Quick Deploy Reference (PowerShell):**

```powershell
# Frontend deployment
npm run build
aws s3 sync dist/ s3://valine-frontend-prod --delete
aws cloudfront create-invalidation --distribution-id E16LPJDBIL5DEE --paths "/*"

# Backend deployment
cd serverless
npm run deploy
cd ..
```

**Post-deployment verification:**
```powershell
# Check API health
Invoke-RestMethod -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/health" -Method Get

# Check frontend
Invoke-RestMethod -Uri "https://dkmxy676d3vgc.cloudfront.net/" -Method Get

# Check CloudFront distribution status
aws cloudfront get-distribution --id E16LPJDBIL5DEE | ConvertFrom-Json | Select-Object -ExpandProperty Distribution | Select-Object -ExpandProperty Status
```

---

## 6. Debugging Flow

### Viewing Logs

#### CloudWatch Logs (AWS)

```powershell
# View Lambda logs (real-time tail)
aws logs tail /aws/lambda/pv-api-prod-api --follow

# View logs from last hour
aws logs tail /aws/lambda/pv-api-prod-api --since 1h

# Search for specific errors
aws logs filter-log-events --log-group-name /aws/lambda/pv-api-prod-api --filter-pattern "ERROR"
```

**CloudWatch Console:** https://console.aws.amazon.com/cloudwatch/home?region=us-west-2#logsV2:log-groups

#### Frontend Console Logs

```powershell
# Frontend logs are in browser console
# Open DevTools: F12 or Ctrl+Shift+I
# Check Console tab for errors
```

### Common Failures & Quick Checks

| Symptom | Quick Check | Fix Link |
|---------|-------------|----------|
| White screen / blank page | Check CloudFront function, SPA routing | [TROUBLESHOOTING.md - White Screen](./TROUBLESHOOTING.md#1-white-screen--blank-page) |
| Login fails / 503 errors | Check Lambda logs, database connection | [TROUBLESHOOTING.md - Login Failures](./TROUBLESHOOTING.md#2-login-failures--503-errors) |
| API connection failures | Check `VITE_API_BASE` env var, CORS | [TROUBLESHOOTING.md - API Connection](./TROUBLESHOOTING.md#4-api-connection-failures) |
| Email allowlist blocks user | Check `ALLOWED_USER_EMAILS` env var | [TROUBLESHOOTING.md - Email Allowlist](./TROUBLESHOOTING.md#3-email-allowlist-issues) |
| Database migration fails | Check migration status, rollback if needed | [TROUBLESHOOTING.md - Database Migrations](./TROUBLESHOOTING.md#5-database-migration-failures) |

**For complete troubleshooting guide:**
- **[docs/TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues and fixes
- **[docs/OPERATIONS.md](./OPERATIONS.md)** - Operations runbook and monitoring

---

## 7. Feature Implementation Guide

### Feature Status & File Map

| Feature | Status | Frontend Files | Backend Handler/Routes | DB Tables | API Endpoints | Notes |
|---------|--------|----------------|------------------------|-----------|---------------|-------|
| **Profile Edit (Basic)** | ✅ Implemented | `src/pages/ProfileEdit.jsx`<br>`src/components/ProfileForm.jsx` | `serverless/src/handlers/users.js`<br>`serverless/src/handlers/profiles.js` | `users`<br>`profiles` | `PATCH /users/me`<br>`PATCH /profiles/:id` | Basic fields work |
| **Profile Edit (Media)** | ⚠️ Partial | `src/pages/ProfileEdit.jsx`<br>(avatar/banner upload components) | `serverless/src/handlers/media.js`<br>`serverless/src/handlers/uploads.js` | `users.avatar`<br>`users.banner` | `POST /media/upload`<br>`POST /media/confirm` | Presigned URLs implemented, needs testing |
| **Profile Links/Social** | ⚠️ Partial | Need to verify existence in ProfileEdit | `serverless/src/handlers/profilesRouter.js` | `profileLinks` | `POST /profiles/:id/links`<br>`DELETE /profiles/:id/links/:linkId` | Schema exists, needs UI |
| **Follow/Unfollow** | ✅ Implemented | Need to find/create UI components | `serverless/src/handlers/connections.js`<br>`serverless/src/handlers/social.js` | `connectionRequests` | `POST /connections/request`<br>`POST /connections/accept`<br>`POST /connections/reject` | Backend done, needs frontend integration |
| **Notifications** | ⚠️ Partial | Need UI components | `serverless/src/handlers/notifications.js`<br>`serverless/src/handlers/notificationsRouter.js` | `notifications` | `GET /notifications`<br>`PATCH /notifications/:id/read` | Backend exists, needs frontend |
| **Password Reset** | ⚠️ Partial | Need UI (forgot/reset pages) | `serverless/src/handlers/auth.js`<br>(forgot-password, reset-password routes) | `passwordResetTokens` | `POST /auth/forgot-password`<br>`POST /auth/reset-password` | Backend ready, frontend missing |
| **Post Sharing** | ⏳ Missing | Need share button/modal | Need to implement in posts handler | May need `shares` table | `POST /posts/:id/share` | To be designed |
| **Post Liking** | ✅ Implemented | Check posts components | `serverless/src/handlers/posts.js` | `likes` | `POST /posts/:id/like`<br>`DELETE /posts/:id/like` | Schema exists, verify UI |
| **Post Commenting** | ✅ Implemented | Check posts components | `serverless/src/handlers/posts.js` | `comments` | `GET /posts/:id/comments`<br>`POST /posts/:id/comments`<br>`PATCH /comments/:id`<br>`DELETE /comments/:id` | Schema exists, verify UI |

**For API endpoint details, see:** [docs/API_REFERENCE.md](./API_REFERENCE.md)

### Feature Implementation Workflow

For each feature you implement or fix, follow this workflow:

#### 1. Profile Edit Media Uploads

**Current Status:** Partial - presigned URL flow implemented, needs testing and fixes

**Definition of Done:**
- [ ] User can upload avatar image
- [ ] User can upload banner image  
- [ ] Images are resized/optimized before upload
- [ ] Old images are replaced (not duplicated)
- [ ] Upload progress indicator shown
- [ ] Errors are handled gracefully
- [ ] Changes persist after page refresh

**Frontend Files:**
- `src/pages/ProfileEdit.jsx` - Main profile edit page
- `src/components/ImageUpload.jsx` (if exists) - Image upload component

**Backend Handler:**
- `serverless/src/handlers/media.js` - Presigned URL generation
- `serverless/src/handlers/users.js` - Update user avatar/banner fields

**How to Test Locally:**
```powershell
# 1. Start frontend dev server
npm run dev

# 2. Login to app at http://localhost:5173
# 3. Navigate to profile edit page: /profile-edit
# 4. Click avatar upload button
# 5. Select an image file
# 6. Verify upload progress indicator appears
# 7. Verify avatar updates in UI
# 8. Refresh page and verify avatar persists

# Check backend logs for errors
aws logs tail /aws/lambda/pv-api-prod-api --follow
```

**How to Test in Staging:**
```powershell
# 1. Deploy to staging (if backend changes made)
cd serverless
npm run deploy -- --stage staging
cd ..

# 2. Deploy frontend to staging
npm run build
aws s3 sync dist/ s3://valine-frontend-staging --delete

# 3. Test using staging URL (provided by owner)
```

**Common Pitfalls:**
- ⚠️ Presigned URLs expire after 15 minutes
- ⚠️ File size limit is 50 MB (enforced by backend)
- ⚠️ S3 bucket CORS must be configured (check `cors.json`)
- ⚠️ Image MIME types must be validated (`image/jpeg`, `image/png`, `image/gif`)

**Related Canonical Docs:**
- [PROJECT_BIBLE.md - File Upload](./PROJECT_BIBLE.md#file-storage-s3)
- [API_REFERENCE.md - Media Endpoints](./API_REFERENCE.md#media-endpoints)

---

#### 2. Follow/Unfollow (Connections)

**Current Status:** Backend implemented, frontend needs UI components

**Definition of Done:**
- [ ] User can send connection request to another user
- [ ] User can accept/reject incoming connection requests
- [ ] User can see list of connections (followers/following)
- [ ] User can unfollow/disconnect from another user
- [ ] Connection status is reflected in profile view
- [ ] Notifications sent on connection request/accept

**Frontend Files (to create/modify):**
- `src/pages/Profile.jsx` - Add follow/unfollow button
- `src/components/ConnectionButton.jsx` (create) - Follow/unfollow button component
- `src/pages/Connections.jsx` (create) - List of connections
- `src/services/api.js` - Add API calls for connections

**Backend Handler:**
- `serverless/src/handlers/connections.js` - Connection request logic
- `serverless/src/handlers/social.js` - Social graph queries

**Database Table:**
- `connectionRequests` table with fields:
  - `id`, `senderId`, `receiverId`, `status` (pending/accepted/rejected), `createdAt`

**API Endpoints:**
```powershell
# Send connection request
Invoke-RestMethod -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/connections/request" `
  -Method POST `
  -Headers @{Authorization="Bearer $token"} `
  -Body '{"receiverId":"user-uuid"}' `
  -ContentType 'application/json'

# Accept connection request
Invoke-RestMethod -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/connections/accept" `
  -Method POST `
  -Headers @{Authorization="Bearer $token"} `
  -Body '{"requestId":"request-uuid"}' `
  -ContentType 'application/json'

# Reject connection request
Invoke-RestMethod -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/connections/reject" `
  -Method POST `
  -Headers @{Authorization="Bearer $token"} `
  -Body '{"requestId":"request-uuid"}' `
  -ContentType 'application/json'

# Get my connections
Invoke-RestMethod -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/connections" `
  -Method GET `
  -Headers @{Authorization="Bearer $token"}
```

**How to Test Locally:**
```powershell
# 1. Create two test accounts (if allowlist permits)
# 2. Login as User A
# 3. Navigate to User B's profile
# 4. Click "Connect" button
# 5. Logout, login as User B
# 6. See connection request notification/list
# 7. Accept or reject request
# 8. Verify connection appears in both users' connection lists
```

**Common Pitfalls:**
- ⚠️ Cannot send connection request to self
- ⚠️ Cannot send duplicate connection requests (check status first)
- ⚠️ Accepted connections should update both `senderId` and `receiverId` records
- ⚠️ Notifications should be created on request and acceptance

**Related Canonical Docs:**
- [PROJECT_BIBLE.md - Networking Features](./PROJECT_BIBLE.md#networking-features)
- [API_REFERENCE.md - Social Endpoints](./API_REFERENCE.md#social-endpoints)

---

#### 3. Notifications System

**Current Status:** Backend handler exists, frontend integration needed

**Definition of Done:**
- [ ] User sees notification badge with unread count
- [ ] User can view notification list
- [ ] Notifications marked as read when clicked
- [ ] Real-time notifications (polling or WebSocket)
- [ ] Different notification types (connection, like, comment, etc.)
- [ ] User can delete/clear notifications

**Frontend Files (to create/modify):**
- `src/components/NotificationBell.jsx` (create) - Notification bell icon with badge
- `src/pages/Notifications.jsx` (create) - Notification list page
- `src/components/NotificationItem.jsx` (create) - Individual notification component
- `src/services/api.js` - Add notification API calls
- `src/hooks/useNotifications.jsx` (create) - Custom hook for polling

**Backend Handler:**
- `serverless/src/handlers/notifications.js` - Notification CRUD
- `serverless/src/handlers/notificationsRouter.js` - Router

**Database Table:**
- `notifications` table with fields:
  - `id`, `recipientId`, `triggererId`, `type`, `message`, `read`, `createdAt`

**API Endpoints:**
```powershell
# Get my notifications
Invoke-RestMethod -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/notifications" `
  -Method GET `
  -Headers @{Authorization="Bearer $token"}

# Mark notification as read
Invoke-RestMethod -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/notifications/{id}/read" `
  -Method PATCH `
  -Headers @{Authorization="Bearer $token"}

# Delete notification
Invoke-RestMethod -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/notifications/{id}" `
  -Method DELETE `
  -Headers @{Authorization="Bearer $token"}
```

**How to Test Locally:**
```powershell
# 1. Trigger a notification (e.g., send connection request)
# 2. Check notification badge updates in UI
# 3. Click notification bell to view list
# 4. Click a notification to mark as read
# 5. Verify badge count decreases
# 6. Verify notification list updates in real-time (polling every 30s)
```

**Common Pitfalls:**
- ⚠️ Polling interval should be reasonable (30-60 seconds, not 1 second)
- ⚠️ Notification triggers must be implemented in relevant handlers (connections, posts, etc.)
- ⚠️ Unread count should be cached or computed efficiently
- ⚠️ Old notifications should be auto-deleted after 30 days (optional)

**Related Canonical Docs:**
- [PROJECT_BIBLE.md - Notifications System](./PROJECT_BIBLE.md#notifications-system)

---

#### 4. Password Reset Workflow

**Current Status:** Backend ready, frontend pages needed

**Definition of Done:**
- [ ] User can request password reset from login page
- [ ] User receives email with reset link
- [ ] User can set new password using reset token
- [ ] Reset token expires after 1 hour
- [ ] User is redirected to login after successful reset
- [ ] Appropriate error messages for invalid/expired tokens

**Frontend Files (to create/modify):**
- `src/pages/ForgotPassword.jsx` (create) - Request reset form
- `src/pages/ResetPassword.jsx` (create) - Reset password form (with token from URL)
- `src/routes/App.jsx` - Add routes for forgot/reset pages
- `src/services/api.js` - Add password reset API calls

**Backend Handler:**
- `serverless/src/handlers/auth.js` - Already has `forgot-password` and `reset-password` routes

**Database Table:**
- `passwordResetTokens` table with fields:
  - `id`, `userId`, `token`, `expiresAt`, `used`, `createdAt`

**API Endpoints:**
```powershell
# Request password reset
Invoke-RestMethod -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/auth/forgot-password" `
  -Method POST `
  -Body '{"email":"user@example.com"}' `
  -ContentType 'application/json'

# Reset password with token
Invoke-RestMethod -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/auth/reset-password" `
  -Method POST `
  -Body '{"token":"reset-token-from-email","newPassword":"NewPass123!"}' `
  -ContentType 'application/json'
```

**How to Test Locally:**
```powershell
# 1. Navigate to /forgot-password
# 2. Enter email address
# 3. Submit form
# 4. Check email for reset link (or check database for token if email not configured)
# 5. Click reset link (should go to /reset-password?token=xxx)
# 6. Enter new password
# 7. Submit form
# 8. Verify redirect to login page
# 9. Login with new password
```

**Common Pitfalls:**
- ⚠️ Email service may not be configured in dev (check `SMTP_*` env vars)
- ⚠️ Reset tokens expire after 1 hour (check `expiresAt` field)
- ⚠️ Used tokens should be marked as `used=true` to prevent reuse
- ⚠️ Password must meet strength requirements (8+ chars, uppercase, lowercase, number, special)

**Related Canonical Docs:**
- [PROJECT_BIBLE.md - Password Security](./PROJECT_BIBLE.md#password-security)
- [API_REFERENCE.md - Auth Endpoints](./API_REFERENCE.md#auth-endpoints)

---

#### 5. Post Sharing

**Current Status:** Not implemented

**Definition of Done:**
- [ ] User can share a post to their own feed
- [ ] Shared post shows original author
- [ ] Shared post appears in sharer's profile
- [ ] Share count displayed on original post
- [ ] User can un-share a post

**Frontend Files (to create/modify):**
- `src/components/ShareButton.jsx` (create) - Share button component
- `src/components/PostCard.jsx` - Add share button to post card
- `src/services/api.js` - Add share API calls

**Backend Handler:**
- `serverless/src/handlers/posts.js` - Add share endpoint

**Database Changes:**
- Option 1: Add `shares` table with `userId`, `postId`, `createdAt`
- Option 2: Add `originalPostId` field to `posts` table (if repost model)

**API Endpoint (to implement):**
```powershell
# Share a post
Invoke-RestMethod -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/posts/{postId}/share" `
  -Method POST `
  -Headers @{Authorization="Bearer $token"}

# Unshare a post
Invoke-RestMethod -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/posts/{postId}/share" `
  -Method DELETE `
  -Headers @{Authorization="Bearer $token"}
```

**How to Test Locally:**
```powershell
# 1. Navigate to feed or another user's profile
# 2. Find a post
# 3. Click share button
# 4. Verify shared post appears in your feed
# 5. Verify share count increments on original post
# 6. Click unshare button
# 7. Verify share count decrements
```

**Common Pitfalls:**
- ⚠️ Cannot share own post (optional business rule)
- ⚠️ Cannot share same post twice (check for existing share)
- ⚠️ Shared posts should link back to original post
- ⚠️ Deleting original post should delete all shares (cascade)

**Related Canonical Docs:**
- [PROJECT_BIBLE.md - Content Management](./PROJECT_BIBLE.md#content-management)

---

#### 6. Post Liking & Commenting

**Current Status:** Backend implemented, verify frontend UI

**Definition of Done:**
- [ ] User can like/unlike posts
- [ ] Like count displayed on posts
- [ ] User can see who liked a post
- [ ] User can comment on posts
- [ ] Comments displayed under posts
- [ ] User can edit/delete own comments

**Frontend Files:**
- `src/components/LikeButton.jsx` - Like button component
- `src/components/CommentList.jsx` - Comment list component
- `src/components/CommentForm.jsx` - Comment input form
- `src/pages/PostDetail.jsx` - Individual post view with comments

**Backend Handler:**
- `serverless/src/handlers/posts.js` - Like and comment endpoints

**Database Tables:**
- `likes` table with `userId`, `postId`, `createdAt`
- `comments` table with `id`, `postId`, `authorId`, `content`, `createdAt`

**API Endpoints:**
```powershell
# Like a post
Invoke-RestMethod -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/posts/{postId}/like" `
  -Method POST `
  -Headers @{Authorization="Bearer $token"}

# Unlike a post
Invoke-RestMethod -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/posts/{postId}/like" `
  -Method DELETE `
  -Headers @{Authorization="Bearer $token"}

# Get comments
Invoke-RestMethod -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/posts/{postId}/comments" `
  -Method GET

# Add comment
Invoke-RestMethod -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/posts/{postId}/comments" `
  -Method POST `
  -Headers @{Authorization="Bearer $token"} `
  -Body '{"content":"Great post!"}' `
  -ContentType 'application/json'

# Delete comment
Invoke-RestMethod -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/comments/{commentId}" `
  -Method DELETE `
  -Headers @{Authorization="Bearer $token"}
```

**How to Test Locally:**
```powershell
# 1. Navigate to feed
# 2. Find a post
# 3. Click like button
# 4. Verify like count increments
# 5. Click like button again (unlike)
# 6. Verify like count decrements
# 7. Add a comment
# 8. Verify comment appears in list
# 9. Edit/delete own comment
# 10. Verify changes persist
```

**Common Pitfalls:**
- ⚠️ Cannot like same post twice (check for existing like)
- ⚠️ Comment content must be sanitized (XSS prevention)
- ⚠️ Empty comments should be rejected
- ⚠️ Only comment author can edit/delete their comments

**Related Canonical Docs:**
- [PROJECT_BIBLE.md - Content Management](./PROJECT_BIBLE.md#content-management)
- [API_REFERENCE.md - Post Endpoints](./API_REFERENCE.md#post-endpoints)

---

## 8. Working Agreements

### Branch Naming Convention

```
feature/<feature-name>     # New features
fix/<bug-description>      # Bug fixes
hotfix/<urgent-fix>        # Production hotfixes
docs/<doc-change>          # Documentation updates
refactor/<component>       # Code refactoring
test/<test-name>           # Test additions
```

**Examples:**
```
feature/password-reset-flow
fix/profile-edit-avatar-upload
hotfix/auth-token-expiry
docs/update-api-reference
```

### Pull Request (PR) Expectations

**Before Creating a PR:**
- [ ] All tests pass (`npm test` and `cd serverless && npm test`)
- [ ] Code is linted (`npm run lint` if linter exists)
- [ ] Commit messages are clear and descriptive
- [ ] Branch is up-to-date with `main` (rebase if needed)
- [ ] No secrets or credentials in code or commit history

**PR Description Should Include:**
- **What:** Brief description of changes
- **Why:** Reason for the change (feature request, bug fix, etc.)
- **How:** Implementation details (if complex)
- **Testing:** How you tested the changes
- **Screenshots:** If UI changes, include before/after screenshots
- **Related Issues:** Link to GitHub issues or tasks

**PR Review Process:**
1. Create PR against `main` branch
2. Assign reviewer (project owner or designated reviewer)
3. Wait for automated checks to pass (CI/CD)
4. Address review comments
5. Reviewer approves and merges

### Commit Style

**Use conventional commits:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, no logic change)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**Examples:**
```powershell
git commit -m "feat(profile): add avatar upload functionality"
git commit -m "fix(auth): resolve token expiry bug"
git commit -m "docs(api): update password reset endpoint documentation"
```

### When to Update Docs

**Update canonical docs when:**
- ✅ Adding new API endpoints → Update `docs/API_REFERENCE.md`
- ✅ Changing database schema → Update `docs/PROJECT_BIBLE.md` (section 4)
- ✅ Adding new deployment steps → Update `docs/DEPLOYMENT_BIBLE.md`
- ✅ Discovering new known issues → Update `docs/TROUBLESHOOTING.md`
- ✅ Changing architecture/infrastructure → Update `docs/ARCHITECTURE.md`
- ✅ Adding new features → Update `docs/PROJECT_BIBLE.md` (roadmap section)

**Do NOT update this onboarding doc** for every change. This doc is a navigation aid, not canonical truth. Link to canonical docs instead.

---

## 9. Security & Data Handling

### No Secrets Policy

**NEVER commit secrets to git:**
- ❌ Database credentials
- ❌ JWT secrets
- ❌ API keys
- ❌ AWS access keys
- ❌ Email service passwords
- ❌ Any token or password

**Use placeholders instead:**
```powershell
# ❌ WRONG
DATABASE_URL=postgresql://username:password@host.rds.amazonaws.com:5432/db

# ✅ CORRECT
DATABASE_URL=<PROVIDED_BY_OWNER>
```

**Where secrets belong:**
- Local development: `.env` files (in `.gitignore`)
- CI/CD: GitHub Secrets
- Production: AWS Systems Manager Parameter Store or Secrets Manager

### Secret Scanning

**Before committing:**
```powershell
# Run secret audit script
node scripts/secret-audit.mjs

# Check git status
git status

# Verify no .env files are staged
git diff --cached
```

**If you accidentally commit a secret:**
1. **Stop immediately**
2. Notify project owner
3. Rotate the compromised secret immediately
4. Use `git reset` to remove commit (if not pushed)
5. If pushed, contact owner for history rewrite

### Security Follow-up

**⚠️ CRITICAL:** During this project, if you discover any secrets in code or docs:

1. **Do NOT share them publicly** (Slack, email, etc.)
2. **Document the locations:** Create a "Security Follow-up" section in your PR
3. **List file paths:** E.g., `serverless/.env.prod` contains DATABASE_URL
4. **Propose redactions:** Suggest replacing with placeholders
5. **Notify owner immediately:** Via secure channel

**Example Security Follow-up Section in PR:**
```markdown
## Security Follow-up

### Secrets Found
- `serverless/.env.prod` - Contains DATABASE_URL, JWT_SECRET
- `docs/README.md` (line 170) - Contains full DATABASE_URL connection string

### Proposed Redactions
1. Remove `serverless/.env.prod` from git tracking
2. Replace line 170 in `docs/README.md` with placeholder format
3. Rotate secrets after redaction
```

**For security policies, see:** [docs/PROJECT_BIBLE.md - Security](./PROJECT_BIBLE.md#authentication--security)

---

## 10. Appendix

### A. Canonical Documentation (8 Core Docs)

**Always refer to these as sources of truth:**

1. **[docs/PROJECT_BIBLE.md](./PROJECT_BIBLE.md)** ⭐  
   Complete master reference: architecture, database, API, deployment, environment, testing, roadmap

2. **[docs/DEPLOYMENT_BIBLE.md](./DEPLOYMENT_BIBLE.md)**  
   Canonical deployment guide (PowerShell only): one-button deploy, prerequisites, post-deploy verification, rollback

3. **[docs/ARCHITECTURE.md](./ARCHITECTURE.md)**  
   High-level system architecture: components, data flow, security, scalability, disaster recovery

4. **[docs/OPERATIONS.md](./OPERATIONS.md)**  
   Operations runbook: on-call procedures, monitoring, alerts, incident response, maintenance

5. **[docs/API_REFERENCE.md](./API_REFERENCE.md)**  
   Complete API documentation: all endpoints with PowerShell examples, error codes, rate limiting

6. **[docs/TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**  
   Common issues & fixes: white screen, login failures, allowlist issues, API connection, database migrations

7. **[docs/DUPLICATE_USER_MITIGATION.md](./DUPLICATE_USER_MITIGATION.md)**  
   Duplicate user records fix: root cause, mitigation, cleanup procedures, testing

8. **[docs/README.md](./README.md)**  
   Documentation index: navigation hub for all docs, quick start guide, production endpoints

### B. Archived Documentation

**Location:** `docs/archive/`

**Purpose:** Historical reference only. Do NOT use for current development.

**Contents:**
- Old deployment guides
- Postmortems and incident reports
- Investigation and archaeology docs
- Fix summaries
- Deprecated runbooks
- Historical reference material

**When to reference archive:**
- Understanding past decisions
- Learning from previous incidents
- Historical context for features

**⚠️ Always verify information against canonical docs** - archived docs may be outdated.

### C. Related Files

**Root-level documentation:**
- `README.md` - Main project readme
- `CHANGELOG.md` - Version history
- `CONTRIBUTING.md` - Contribution guidelines
- `SECURITY.md` - Security policies

**Backend-specific:**
- `serverless/README.md` - Backend-specific readme
- `serverless/serverless.yml` - Serverless Framework configuration

**Orchestrator-specific:**
- `orchestrator/README.md` - Discord bot documentation
- `orchestrator/template.yaml` - AWS SAM configuration

### D. External Resources

**Technology Documentation:**
- React: https://react.dev
- Vite: https://vitejs.dev
- Prisma: https://www.prisma.io/docs
- Serverless Framework: https://www.serverless.com/framework/docs
- AWS Lambda: https://docs.aws.amazon.com/lambda
- AWS API Gateway: https://docs.aws.amazon.com/apigateway
- PostgreSQL: https://www.postgresql.org/docs
- Tailwind CSS: https://tailwindcss.com/docs

**PowerShell Resources:**
- PowerShell Documentation: https://docs.microsoft.com/powershell
- PowerShell GitHub: https://github.com/PowerShell/PowerShell

### E. Support & Contact

**GitHub:**
- Repository: https://github.com/gcolon75/Project-Valine
- Issues: https://github.com/gcolon75/Project-Valine/issues
- Pull Requests: https://github.com/gcolon75/Project-Valine/pulls

**Project Owner:**
- Contact via GitHub issues or secure channel provided

**Discord Bot (if available):**
- Use `/help` command for available operations

---

## Quick Reference Card

**Essential Commands (PowerShell):**

```powershell
# Clone and setup
git clone https://github.com/gcolon75/Project-Valine.git
cd Project-Valine
npm install
cd serverless && npm install && cd ..

# Run locally
npm run dev                          # Frontend dev server
cd serverless && npm run deploy      # Deploy backend to staging

# Test
npm test                             # Frontend tests
cd serverless && npm test            # Backend tests
npm run test:e2e                     # E2E tests

# Build and deploy
npm run build                        # Build frontend
aws s3 sync dist/ s3://valine-frontend-prod --delete
aws cloudfront create-invalidation --distribution-id E16LPJDBIL5DEE --paths "/*"

# View logs
aws logs tail /aws/lambda/pv-api-prod-api --follow

# Check health
Invoke-RestMethod -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/health" -Method Get
```

**Key File Locations:**
- Frontend: `src/pages/`, `src/components/`
- Backend: `serverless/src/handlers/`
- Database: `serverless/prisma/schema.prisma`, `api/prisma/schema.prisma` (keep in sync!)
- Routes: `src/routes/App.jsx`
- API Client: `src/services/api.js`

**Most Important Docs:**
1. **[PROJECT_BIBLE.md](./PROJECT_BIBLE.md)** - Read this first!
2. **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - When things break
3. **[API_REFERENCE.md](./API_REFERENCE.md)** - For API endpoints

---

**Last Updated:** 2026-01-07  
**Maintainer:** Project Valine Team  
**Status:** Active - For Contractors

---

*Remember: This is a navigation document. Always refer to canonical docs for authoritative information.*
