# Project Valine - Complete Kanban Task Tracker

**Last Updated:** 2024-02-17  
**Purpose:** Comprehensive task tracking with user flow backing for contractor execution  
**Status:** Active Development - Beta-50 Milestone

---

## Quick Stats

- **Total Tasks:** 43
- **P0 Critical:** 12 tasks (beta blockers)
- **P1 High:** 15 tasks (beta essential)
- **P2 Medium:** 15 tasks (post-beta enhancements)
- **Blocked:** 1 task (awaiting product decision)
- **Done:** 1 task (Post View 404 fix, PR #406)

---

## Key Infrastructure

### Database URL Template (NO SPACES)

```
postgresql://{{DB_USER}}:{{DB_PASSWORD}}@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require
```

**Note:** Replace `{{DB_USER}}` and `{{DB_PASSWORD}}` with actual credentials from environment variables or secure configuration.

### PowerShell Deploy Commands

```powershell
cd C:\Users\ghawk\Documents\GitHub\Project-Valine
git checkout main; git pull origin main

# Backend
cd serverless; npm ci; npx serverless deploy --stage prod --region us-west-2

# Frontend
cd ..\; npm ci; npm run build; aws s3 sync dist/ s3://project-valine-frontend-prod --delete

# CloudFront Invalidation
aws cloudfront create-invalidation --distribution-id E16LPJDBIL5DEE --paths "/*"

# Migrations
cd api; npx prisma migrate deploy; npx prisma generate
```

### Key Endpoints

- **Frontend:** https://dkmxy676d3vgc.cloudfront.net
- **API Base:** https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com

---

## User Flow Coverage Matrix

This matrix maps the 43 Kanban tasks to the 17 user flows documented in `docs/USER_FLOWS.md`.

| Flow # | Flow Name | Related Tasks |
|--------|-----------|---------------|
| **Flow 1** | Guest → Signup → Onboarding → Dashboard | P0-003, P0-002, P1-001, P1-002, BLOCKED-001 |
| **Flow 2** | User → Edit Profile → Save → View Profile | P0-011, P0-002, BLOCKED-001 |
| **Flow 3** | User → Create Post → Feed Appears | P1-011, P2-014 |
| **Flow 4** | User → Request Access → Owner Approves | P1-007, P1-009, P1-015, P2-006 |
| **Flow 5** | User Login → Dashboard (Returning User) | P0-005, P0-011, P0-012, P0-002 |
| **Flow 6** | User → View Post Detail | P0-001, P1-014, DONE-001 |
| **Flow 7** | User → Upload Media (Avatar/Banner with S3) | P0-007, P0-008, P0-009, P2-004, P2-012 |
| **Flow 8** | User → View Feed → Like/Comment on Post | P1-010, P1-012 |
| **Flow 9** | User → Connect with Another User | P2-002 |
| **Flow 10** | User → Search/Discover Users | P2-008 |
| **Flow 11** | User → View Notifications → Mark as Read | P1-007, P2-014 |
| **Flow 12** | User → Send Direct Message | P1-006 |
| **Flow 13** | Owner → Manage Access Requests | P1-007, P1-008 |
| **Flow 14** | User → Password Reset Flow | P1-002, P1-004 |
| **Flow 15** | User → Email Verification Flow | P1-003 |
| **Flow 16** | User → Privacy Settings | P1-013, P2-001 |
| **Flow 17** | Admin → Moderation Flow | P2-005 |
| **All Flows** | Cross-cutting concerns | P0-002, P0-004, P0-010, P0-006 |

---

## Complete Task List (43 Tasks)

### P0 CRITICAL (12 tasks)

#### P0-001: CloudFront SPA deep-link fix

**User Flow:** Flow 6 (User → View Post Detail)  
**Owner:** DevOps  
**Estimate:** S (2-4h)  
**Status:** Backlog

**Issue:**  
Direct URLs to posts (e.g., `https://dkmxy676d3vgc.cloudfront.net/post/123`) return 404 errors because CloudFront doesn't know how to route SPA paths.

**Files:**
- CloudFront distribution error responses configuration
- S3 bucket routing rules

**Definition of Done:**
- All application routes (`/profile/user`, `/post/123`, `/settings`, etc.) return `index.html`
- React Router handles client-side routing
- No 404 errors on direct URL access or page refresh
- CloudFormation/Terraform config updated if applicable

**Testing Checklist:**
- [ ] Direct navigate to `/profile/testuser` → page loads
- [ ] Direct navigate to `/post/123` → post detail loads
- [ ] Direct navigate to `/settings` → settings page loads
- [ ] Refresh any page → page reloads correctly
- [ ] 404 only shown for truly non-existent content

---

#### P0-002: Smoke test checklist

**User Flow:** All flows  
**Owner:** QA/Fullstack  
**Estimate:** M (4-8h)  
**Status:** Backlog

**Issue:**  
No documented smoke test checklist exists for verifying all 17 user flows after deployment.

**Definition of Done:**
- Runnable checklist document created in `docs/QA_SMOKE_TEST.md`
- Covers all 17 user flows from `docs/USER_FLOWS.md`
- Each flow has 3-5 key verification steps
- Includes expected outcomes and failure indicators
- Can be executed in under 30 minutes

**Testing Checklist:**
- [ ] Execute checklist on staging environment
- [ ] All 17 flows pass
- [ ] Document passes peer review
- [ ] Added to deployment runbook

---

#### P0-003: Allowlist signup enforcement

**User Flow:** Flow 1 (Guest → Signup → Onboarding → Dashboard)  
**Owner:** Backend  
**Estimate:** M (6-12h)  
**Status:** Backlog

**Issue:**  
Signup endpoint doesn't enforce allowlist checking, allowing unauthorized signups during beta.

**Files:**
- `serverless/src/handlers/auth.js`
- `.env` files (add `OWNER_EMAILS` or `ALLOWLIST_EMAILS`)

**Definition of Done:**
- `POST /api/auth/signup` checks email against allowlist before creating account
- Non-allowlisted emails receive clear 403 error with message: "Beta access is currently restricted. Request an invite at [email]"
- Allowlist configurable via environment variable (comma-separated emails)
- `User.onboardingComplete` flag enforced (defaults to `false`)
- Server-side validation prevents onboarding bypass

**API Contract:**
```json
// Request
POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "username": "cooluser"
}

// Response (403 - Not Allowlisted)
{
  "error": "BETA_RESTRICTED",
  "message": "Beta access is currently restricted. Request an invite at beta@joint.app"
}

// Response (201 - Success)
{
  "user": { "id": "uuid", "email": "...", "onboardingComplete": false },
  "token": "jwt..."
}
```

**Testing Checklist:**
- [ ] Non-allowlist email → 403 error
- [ ] Allowlist email → 201 success
- [ ] Empty allowlist → all signups blocked
- [ ] Allowlist with multiple emails → all work
- [ ] Case-insensitive email matching

---

#### P0-004: Load test Prisma connections

**User Flow:** All flows  
**Owner:** Backend/DevOps  
**Estimate:** L (8-16h)  
**Status:** Backlog

**Issue:**  
Prisma connection pool exhaustion under concurrent load causes 500 errors and timeouts.

**Definition of Done:**
- Load test performed with Artillery or k6 simulating 100+ concurrent users
- Prisma connection pool configured appropriately (`connection_limit` in database URL)
- CloudWatch dashboards created for connection metrics
- Alerts configured for connection pool exhaustion
- System sustains 100+ concurrent users without errors
- Documentation added to `docs/DEPLOYMENT.md` with connection pool settings

**Testing Checklist:**
- [ ] Baseline test: 10 concurrent users → 0 errors
- [ ] Stress test: 50 concurrent users → < 1% error rate
- [ ] Peak test: 100 concurrent users → < 5% error rate
- [ ] Connection pool metrics visible in CloudWatch
- [ ] Alert triggers when 80% pool capacity reached

---

#### P0-005: Fix deploy bot API base URL

**User Flow:** Flow 5 (User Login → Dashboard)  
**Owner:** DevOps  
**Estimate:** XS (1-2h)  
**Status:** Backlog

**Issue:**  
Production builds have hardcoded `localhost:3000` API base URL instead of production API Gateway URL.

**Files:**
- `vite.config.js`
- `.env.production`
- Build scripts

**Definition of Done:**
- `VITE_API_BASE_URL` environment variable properly injected at build time
- Production builds use `https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com`
- Development builds use `http://localhost:3000`
- Build logs show correct API URL being used
- No hardcoded URLs in source code

**Testing Checklist:**
- [ ] `npm run build` → check `dist/assets/*.js` for correct API URL
- [ ] Deploy to staging → frontend calls staging API
- [ ] Deploy to production → frontend calls production API
- [ ] Login on production → no CORS errors, successful auth

---

#### P0-006: Fix vite build error

**User Flow:** Deploy process  
**Owner:** Frontend/DevOps  
**Estimate:** S (2-4h)  
**Status:** Backlog

**Issue:**  
`npm run build` fails with module resolution errors or dependency issues.

**Definition of Done:**
- `npm run build` completes with 0 errors
- All ES modules resolve correctly
- No TypeScript errors (if applicable)
- Build output is under 2MB gzipped
- Build succeeds on CI/CD pipeline

**Testing Checklist:**
- [ ] Clean install: `rm -rf node_modules package-lock.json && npm install`
- [ ] `npm run build` → exit code 0
- [ ] `dist/` directory contains all assets
- [ ] No console errors when loading production build locally
- [ ] CI/CD pipeline runs build successfully

---

#### P0-007: Backend upload validation

**User Flow:** Flow 7 (User → Upload Media)  
**Owner:** Backend  
**Estimate:** M (6-12h)  
**Status:** Backlog

**Issue:**  
Upload endpoint doesn't validate file types, sizes, or dimensions server-side, allowing malicious uploads.

**Files:**
- `serverless/src/handlers/upload.js`
- `serverless/src/validators/upload.js` (create)

**Definition of Done:**
- Server-side validation for:
  - File type: Only allow `image/jpeg`, `image/png`, `image/webp`, `image/gif`
  - File size: Max 10MB for images
  - Dimensions: Max 4096x4096 pixels
  - MIME type matches file extension
- Reject invalid uploads with clear error messages
- Malware scanning integration (optional for MVP, document for future)

**API Contract:**
```json
// Response (400 - Invalid File)
{
  "error": "INVALID_FILE",
  "message": "File must be an image (JPEG, PNG, WebP, or GIF)",
  "details": {
    "receivedType": "application/pdf",
    "maxSize": "10MB",
    "receivedSize": "15MB"
  }
}
```

**Testing Checklist:**
- [ ] Upload 100MB file → 400 error
- [ ] Upload .exe file → 400 error
- [ ] Upload .pdf file → 400 error
- [ ] Upload valid 5MB JPEG → 200 success
- [ ] Upload valid PNG → 200 success
- [ ] File with spoofed extension (.jpg actually .exe) → rejected

---

#### P0-008: S3 orphan cleanup job

**User Flow:** Flow 7 (User → Upload Media)  
**Owner:** Backend/DevOps  
**Estimate:** M (6-12h)  
**Status:** Backlog

**Issue:**  
Deleted user profiles leave orphaned files in S3, wasting storage and incurring costs.

**Definition of Done:**
- Lambda function created to find and delete orphaned S3 files
- Runs daily via EventBridge schedule
- Compares S3 keys with `User.avatarUrl`, `User.bannerUrl`, `Post.mediaUrls`
- Deletes files not referenced in database
- Logs deleted files for audit trail
- CloudWatch alerts on failures

**Files:**
- `serverless/src/handlers/s3Cleanup.js` (create)
- `serverless/serverless.yml` (add scheduled function)

**Testing Checklist:**
- [ ] Upload avatar → delete user → file cleaned within 24h
- [ ] Upload banner → change banner → old file cleaned
- [ ] Active files not deleted
- [ ] Cleanup logs visible in CloudWatch
- [ ] Dry-run mode works (logs without deleting)

---

#### P0-009: Avatar+banner race condition fix

**User Flow:** Flow 7 (User → Upload Media)  
**Owner:** Backend  
**Estimate:** S (2-4h)  
**Status:** Backlog

**Issue:**  
Simultaneous uploads of avatar and banner cause database write conflicts, resulting in data corruption or lost uploads.

**Files:**
- `serverless/src/handlers/upload.js`
- `serverless/src/services/uploadService.js`

**Definition of Done:**
- Implement pessimistic locking or transaction isolation for profile updates
- Add `User.version` field for optimistic locking (alternative approach)
- Queued upload processing to prevent race conditions
- Retry logic for conflicting updates
- No data corruption under concurrent upload scenarios

**DB Migration:**
```sql
ALTER TABLE "User" ADD COLUMN "version" INTEGER DEFAULT 0;
```

**Testing Checklist:**
- [ ] Upload avatar and banner simultaneously → both succeed
- [ ] Rapid-fire 5 avatar uploads → last upload wins, no corruption
- [ ] Concurrent profile edits → no data loss
- [ ] Load test with 10 concurrent uploads per user → all succeed

---

#### P0-010: Network connection error handling

**User Flow:** All flows  
**Owner:** Frontend  
**Estimate:** M (4-8h)  
**Status:** Backlog

**Issue:**  
Poor network conditions cause silent failures or confusing error states. Users don't know if request failed due to network or server issues.

**Files:**
- `src/services/api.js`
- `src/components/ErrorBoundary.jsx`
- `src/hooks/useNetworkStatus.js` (create)

**Definition of Done:**
- Detect offline/online status with `navigator.onLine`
- Show clear "You're offline" message when network unavailable
- Retry failed requests automatically (exponential backoff)
- Distinguish between network errors and server errors in UI
- Toast notifications for network state changes
- Graceful degradation (show cached data if available)

**Error Messages:**
- Network error: "Connection lost. Retrying..."
- Timeout: "Request timed out. Please check your connection."
- Server error: "Something went wrong. Please try again."

**Testing Checklist:**
- [ ] Disable network → see offline indicator
- [ ] Make request while offline → clear error message
- [ ] Re-enable network → auto-retry and succeed
- [ ] Slow 3G simulation → appropriate timeout handling
- [ ] Intermittent connection → exponential backoff works

---

#### P0-011: 403 errors investigation

**User Flow:** Flow 5 (User Login → Dashboard), Flow 2 (Edit Profile)  
**Owner:** Backend  
**Estimate:** M (4-8h)  
**Status:** Backlog

**Issue:**  
Users report random 403 Forbidden errors on valid authenticated requests, causing logout or access denial.

**Definition of Done:**
- Root cause identified and documented
- Fix implemented (e.g., JWT refresh logic, cookie issues, CORS misconfiguration)
- Comprehensive logging added for 403 responses
- CloudWatch dashboard for 403 error rate
- Error rate reduced to < 0.1%

**Investigation Steps:**
1. Review API Gateway authorizer logs
2. Check JWT expiration handling
3. Verify cookie domain/path settings
4. Test CORS preflight requests
5. Check rate limiting configuration

**Testing Checklist:**
- [ ] Reproduce 403 error reliably
- [ ] Implement fix
- [ ] 100 consecutive authenticated requests → 0 errors
- [ ] Token expiration handled gracefully
- [ ] Cross-domain requests work correctly

---

#### P0-012: Login failures investigation

**User Flow:** Flow 5 (User Login → Dashboard)  
**Owner:** Backend  
**Estimate:** M (4-8h)  
**Status:** Backlog

**Issue:**  
Intermittent login failures with valid credentials, causing user frustration and support tickets.

**Definition of Done:**
- Root cause identified and documented
- Fix implemented
- Login success rate > 99.9%
- Logging added for failed login attempts
- Monitoring dashboard for login metrics

**Potential Causes:**
- Database connection timeouts
- Password hash comparison issues
- Session store problems
- Race conditions in token generation

**Testing Checklist:**
- [ ] 100 consecutive logins with valid credentials → 100 successes
- [ ] Concurrent logins from same account → all succeed
- [ ] Login after password change → succeeds
- [ ] Login with special characters in password → succeeds
- [ ] CloudWatch logs show clear error messages for failures

---

### P1 HIGH (15 tasks)

#### P1-001: Server-side onboarding enforcement

**User Flow:** Flow 1 (Guest → Signup → Onboarding → Dashboard)  
**Owner:** Backend  
**Estimate:** S (2-4h)  
**Status:** Backlog

**Issue:**  
Users can skip onboarding by manipulating client-side state or directly navigating to protected routes.

**Files:**
- `serverless/src/middleware/auth.js`
- API endpoints that should be gated

**Definition of Done:**
- All API endpoints (except auth) check `User.onboardingComplete === true`
- Endpoints return 403 with `ONBOARDING_REQUIRED` error if incomplete
- Frontend redirects to `/onboarding` on 403 responses
- Onboarding completion sets flag via `PATCH /api/users/me/onboarding`

**API Contract:**
```json
// Response (403 - Onboarding Incomplete)
{
  "error": "ONBOARDING_REQUIRED",
  "message": "Please complete onboarding to access this feature",
  "redirectTo": "/onboarding"
}
```

**Testing Checklist:**
- [ ] Skip onboarding → API returns 403 on post creation
- [ ] Complete onboarding → API allows access
- [ ] Direct API call with incomplete onboarding → 403
- [ ] Frontend redirects to onboarding on 403

---

#### P1-002: Password strength validation

**User Flow:** Flow 1 (Signup), Flow 14 (Password Reset)  
**Owner:** Backend/Frontend  
**Estimate:** S (2-4h)  
**Status:** Backlog

**Issue:**  
Weak passwords allowed, creating security vulnerability.

**Files:**
- `serverless/src/validators/auth.js`
- `src/components/PasswordInput.jsx`
- `src/utils/validation.js`

**Definition of Done:**
- Password requirements enforced:
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - At least 1 special character (!@#$%^&*)
- Real-time client-side validation with visual feedback
- Server-side validation on signup and password reset
- Clear error messages for each requirement

**Visual Feedback:**
- ✅ Green checkmark for met requirements
- ❌ Red X for unmet requirements
- Progress bar showing password strength

**Testing Checklist:**
- [ ] "password" → rejected (no uppercase, number, special char)
- [ ] "Password1!" → accepted (meets all requirements)
- [ ] "Pass1!" → rejected (too short)
- [ ] Client shows requirements in real-time
- [ ] Server rejects weak passwords

---

#### P1-003: Email verification with SES

**User Flow:** Flow 15 (Email Verification)  
**Owner:** Backend  
**Estimate:** L (8-16h)  
**Status:** Backlog

**Issue:**  
Email verification currently uses mock implementation. Real email sending needed for production.

**Files:**
- `serverless/src/services/emailService.js`
- `serverless/src/handlers/auth.js`

**Definition of Done:**
- AWS SES configured and verified for sending domain
- Verification emails sent on signup
- Email template designed (branded, mobile-responsive)
- Verification link format: `https://joint.app/verify-email?token={token}`
- `GET /api/auth/verify-email` endpoint verifies token and sets `User.emailVerified = true`
- Unverified users see banner: "Please verify your email"
- Resend verification email functionality

**Database:**
```sql
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN "verificationToken" TEXT;
ALTER TABLE "User" ADD COLUMN "verificationTokenExpiry" TIMESTAMP;
```

**Testing Checklist:**
- [ ] Signup → receive verification email within 1 minute
- [ ] Click link → email verified, redirect to dashboard
- [ ] Expired token → clear error message, option to resend
- [ ] Invalid token → 400 error
- [ ] Resend email → new token sent

---

#### P1-004: Password reset pages

**User Flow:** Flow 14 (Password Reset)  
**Owner:** Frontend/Backend  
**Estimate:** M (6-12h)  
**Status:** Backlog

**Issue:**  
No UI exists for password reset flow.

**Files:**
- `src/pages/ForgotPassword.jsx` (create)
- `src/pages/ResetPassword.jsx` (create)
- `serverless/src/handlers/auth.js`

**Definition of Done:**
- Forgot Password page at `/forgot-password`
  - Email input
  - "Send Reset Link" button
  - Success message: "Check your email for reset instructions"
- Reset Password page at `/reset-password?token={token}`
  - New password input (with strength validation)
  - Confirm password input
  - "Reset Password" button
  - Redirect to login on success
- Email sent with reset link (expires in 1 hour)
- `POST /api/auth/forgot-password` endpoint
- `POST /api/auth/reset-password` endpoint

**API Contract:**
```json
// Request: Forgot Password
POST /api/auth/forgot-password
{ "email": "user@example.com" }

// Response: 200
{ "message": "If an account exists, you'll receive a reset email" }

// Request: Reset Password
POST /api/auth/reset-password
{ "token": "abc123", "newPassword": "NewSecure1!" }

// Response: 200
{ "message": "Password reset successful. Please log in." }
```

**Testing Checklist:**
- [ ] Enter email → receive reset email
- [ ] Click link → reset password page loads
- [ ] Set new password → redirect to login
- [ ] Login with new password → success
- [ ] Expired token → error message with resend option
- [ ] Invalid token → 400 error

---

#### P1-005: Staging environment setup

**User Flow:** All flows  
**Owner:** DevOps  
**Estimate:** L (8-16h)  
**Status:** Backlog

**Issue:**  
No staging environment exists, forcing testing directly in production.

**Definition of Done:**
- Separate AWS account or organization unit for staging
- Staging infrastructure deployed:
  - CloudFront distribution
  - S3 bucket for frontend
  - API Gateway for backend
  - RDS database (smaller instance)
  - Lambda functions
- Staging domain: `staging.joint.app` or similar
- Separate environment variables for staging
- CI/CD pipeline deploys to staging automatically on `develop` branch
- Staging data seeded with test users and content

**Testing Checklist:**
- [ ] Deploy to staging via CI/CD
- [ ] Staging URL loads frontend
- [ ] Staging API responds correctly
- [ ] Database isolated from production
- [ ] Can test destructive operations safely

---

#### P1-006: DM scope decision

**User Flow:** Flow 12 (Direct Messages)  
**Owner:** Product/Backend  
**Estimate:** XS (1-2h)  
**Status:** Backlog

**Issue:**  
Unclear whether to build custom DM system or integrate third-party solution (Sendbird, Stream, etc.).

**Definition of Done:**
- Decision document created: `docs/DECISIONS/DM_ARCHITECTURE.md`
- Document includes:
  - Requirements (real-time, read receipts, media sharing, etc.)
  - Build vs. buy analysis
  - Cost comparison (development time vs. subscription)
  - Technical complexity assessment
  - Recommendation with rationale
- Stakeholder approval received

**Testing Checklist:**
- [ ] Document reviewed by engineering lead
- [ ] Document reviewed by product manager
- [ ] Cost projections validated
- [ ] Decision recorded in architecture decision records (ADR)

---

#### P1-007: Access request notifications

**User Flow:** Flow 4 (Request Access), Flow 11 (Notifications), Flow 13 (Manage Requests)  
**Owner:** Backend  
**Estimate:** M (6-12h)  
**Status:** Backlog

**Issue:**  
Content owners don't receive notifications when someone requests access to their private content.

**Files:**
- `serverless/src/handlers/accessRequests.js`
- `serverless/src/services/notificationService.js` (create)

**Definition of Done:**
- `POST /api/access-requests` creates notification for content owner
- Notification model in database
- `GET /api/notifications` endpoint returns unread notifications
- Notification types: `ACCESS_REQUEST`, `ACCESS_APPROVED`, `ACCESS_DENIED`
- Real-time updates via polling or WebSocket (polling for MVP)

**Database:**
```sql
CREATE TABLE "Notification" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id"),
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "read" BOOLEAN DEFAULT FALSE,
  "metadata" JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
```

**API Contract:**
```json
// GET /api/notifications
{
  "notifications": [
    {
      "id": "notif-123",
      "type": "ACCESS_REQUEST",
      "title": "Access Request",
      "message": "John Doe requested access to your content",
      "read": false,
      "metadata": { "requestId": "req-456", "userId": "user-789" },
      "createdAt": "2024-02-17T10:30:00Z"
    }
  ]
}
```

**Testing Checklist:**
- [ ] Request access → owner receives notification
- [ ] Approve request → requester receives notification
- [ ] Deny request → requester receives notification
- [ ] GET /api/notifications returns unread notifications
- [ ] Mark as read → notification marked read

---

#### P1-008: Owner UI for access requests

**User Flow:** Flow 13 (Owner → Manage Access Requests)  
**Owner:** Frontend  
**Estimate:** M (6-12h)  
**Status:** Backlog

**Issue:**  
Content owners have no UI to view and manage access requests.

**Files:**
- `src/pages/Requests.jsx` (create)
- `src/components/AccessRequestCard.jsx` (create)

**Definition of Done:**
- Requests page at `/requests`
- List all pending access requests
- Filter by status: All, Pending, Approved, Denied
- Each request shows:
  - Requester profile picture and name
  - Request date
  - Optional message from requester
  - Approve and Deny buttons
- Approve action → grants access, sends notification
- Deny action → sends notification with optional reason
- Empty state when no requests

**Testing Checklist:**
- [ ] Navigate to `/requests` → see pending requests
- [ ] Approve request → requester gains access
- [ ] Deny request → requester receives notification
- [ ] Filter by status → correct requests shown
- [ ] No requests → see empty state

---

#### P1-009: Requester UI for access requests

**User Flow:** Flow 4 (User → Request Access)  
**Owner:** Frontend  
**Estimate:** S (2-4h)  
**Status:** Backlog

**Issue:**  
Users viewing private profiles have no way to request access.

**Files:**
- `src/pages/Profile.jsx`
- `src/components/PrivateProfileView.jsx` (create)

**Definition of Done:**
- When viewing private profile (not following):
  - Show lock icon
  - Show "Request Access" button
  - Hide posts and private information
- "Request Access" button → modal with optional message
- Submit request → button changes to "Pending"
- User receives notification when request is approved/denied
- Can cancel pending request

**Testing Checklist:**
- [ ] View private profile → see "Request Access" button
- [ ] Click "Request Access" → modal appears
- [ ] Submit request → button shows "Pending"
- [ ] Request approved → gain access to profile
- [ ] Request denied → button returns to "Request Access"

---

#### P1-010: Likes data model fix

**User Flow:** Flow 8 (Like/Comment on Post)  
**Owner:** Backend  
**Estimate:** S (2-4h)  
**Status:** Backlog

**Issue:**  
Like table missing unique constraint on `(userId, postId)`, allowing duplicate likes.

**Database Migration:**
```sql
-- Remove duplicate likes first
DELETE FROM "Like" a USING "Like" b
WHERE a.id < b.id 
AND a."userId" = b."userId" 
AND a."postId" = b."postId";

-- Add unique constraint
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_postId_unique" UNIQUE ("userId", "postId");
```

**Files:**
- `api/prisma/schema.prisma`
- `api/prisma/migrations/` (new migration)

**Definition of Done:**
- Unique constraint added to `Like` table
- Duplicate likes cleaned up in database
- Like endpoint is idempotent (multiple like requests don't create duplicates)
- Unlike functionality works correctly

**Testing Checklist:**
- [ ] Like post twice → only one like recorded
- [ ] Unlike post → like removed
- [ ] Like count accurate
- [ ] Database constraint enforced

---

#### P1-011: Post editing UI

**User Flow:** Flow 3 (Create Post)  
**Owner:** Frontend  
**Estimate:** M (6-12h)  
**Status:** Backlog

**Issue:**  
Users cannot edit posts after publishing.

**Files:**
- `src/pages/PostEdit.jsx` (create)
- `src/components/PostDropdown.jsx`
- `serverless/src/handlers/posts.js`

**Definition of Done:**
- Edit button on owned posts (in dropdown menu)
- Edit page at `/post/:id/edit`
- Pre-populated form with existing content
- Save updates via `PATCH /api/posts/:id`
- "Edited" indicator on edited posts
- Redirect to post detail on save

**API Contract:**
```json
// PATCH /api/posts/:id
{
  "content": "Updated post content",
  "visibility": "PUBLIC"
}

// Response: 200
{
  "post": {
    "id": "post-123",
    "content": "Updated post content",
    "edited": true,
    "updatedAt": "2024-02-17T10:30:00Z"
  }
}
```

**Testing Checklist:**
- [ ] Click edit on owned post → navigate to edit page
- [ ] Form shows existing content
- [ ] Update content → save → changes appear
- [ ] Post shows "Edited" indicator
- [ ] Cannot edit other users' posts

---

#### P1-012: Comments system

**User Flow:** Flow 8 (View Feed → Like/Comment on Post)  
**Owner:** Fullstack  
**Estimate:** XL (16-24h)  
**Status:** Backlog

**Issue:**  
No comments functionality exists.

**Database:**
```sql
CREATE TABLE "Comment" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id"),
  "postId" TEXT NOT NULL REFERENCES "Post"("id"),
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");
```

**Files:**
- `src/components/CommentList.jsx` (create)
- `src/components/CommentForm.jsx` (create)
- `serverless/src/handlers/comments.js` (create)

**Definition of Done:**
- Add comment via form at bottom of post
- View comments sorted by newest first
- Delete own comments
- Comment count shown on post card
- `POST /api/posts/:id/comments` endpoint
- `GET /api/posts/:id/comments` endpoint (paginated)
- `DELETE /api/comments/:id` endpoint

**API Contract:**
```json
// POST /api/posts/:id/comments
{ "text": "Great post!" }

// Response: 201
{
  "comment": {
    "id": "comment-123",
    "userId": "user-456",
    "postId": "post-789",
    "text": "Great post!",
    "user": { "username": "johndoe", "avatarUrl": "..." },
    "createdAt": "2024-02-17T10:30:00Z"
  }
}
```

**Testing Checklist:**
- [ ] Add comment → appears in list
- [ ] View post with comments → comments load
- [ ] Delete own comment → removed
- [ ] Cannot delete others' comments
- [ ] Comment count updates correctly
- [ ] Pagination works for 100+ comments

---

#### P1-013: Private profile access audit

**User Flow:** Flow 16 (Privacy Settings)  
**Owner:** Backend  
**Estimate:** M (4-8h)  
**Status:** Backlog

**Issue:**  
Unclear if private profiles leak data through API endpoints when accessed by non-followers.

**Definition of Done:**
- Audit all API endpoints that return user data
- Private profiles return minimal data to non-followers:
  - Username
  - Display name
  - Avatar
  - Bio (configurable)
  - NO posts, followers, following counts, email, etc.
- Document privacy levels in `docs/PRIVACY_LEVELS.md`
- Add integration tests for private profile access

**Endpoints to Audit:**
- `GET /api/users/:username`
- `GET /api/users/:id/posts`
- `GET /api/users/:id/followers`
- `GET /api/users/:id/following`

**Testing Checklist:**
- [ ] View private profile as non-follower → minimal data
- [ ] View private profile as follower → full data
- [ ] API returns 403 for private posts
- [ ] Search results respect privacy settings
- [ ] Direct API calls respect privacy

---

#### P1-014: Playwright E2E tests

**User Flow:** Flow 6 (View Post Detail) + others  
**Owner:** QA/Frontend  
**Estimate:** L (8-16h)  
**Status:** Backlog

**Issue:**  
No automated end-to-end tests exist for critical user flows.

**Files:**
- `tests/e2e/` (create directory)
- `tests/e2e/auth.spec.js`
- `tests/e2e/posts.spec.js`
- `tests/e2e/profile.spec.js`
- `playwright.config.js`

**Definition of Done:**
- Playwright installed and configured
- 10+ E2E tests covering critical paths:
  1. Signup flow
  2. Login flow
  3. Create post
  4. View post detail
  5. Edit profile
  6. Upload avatar
  7. Follow user
  8. Like post
  9. Search users
  10. Logout
- Tests run in CI/CD pipeline
- Screenshots captured on failure

**Testing Checklist:**
- [ ] All tests pass locally
- [ ] All tests pass in CI/CD
- [ ] Tests run in under 5 minutes
- [ ] Failure screenshots saved
- [ ] Tests documented in README

---

#### P1-015: Hide paid-post UI elements

**User Flow:** Flow 4 (Request Access)  
**Owner:** Frontend  
**Estimate:** XS (1-2h)  
**Status:** Backlog

**Issue:**  
UI shows "Premium" and "Paid Post" features that are not part of MVP.

**Files:**
- `src/components/PostCard.jsx`
- `src/pages/PostDetail.jsx`
- `src/components/PostComposer.jsx`

**Definition of Done:**
- Remove or hide all references to:
  - "Premium" badges
  - "Pay to view" buttons
  - "Set price" fields in post composer
  - Premium tier UI elements
- Keep code but feature-flag for future use

**Testing Checklist:**
- [ ] No "Premium" badges visible on posts
- [ ] No "Pay to view" buttons
- [ ] Post composer doesn't show pricing options
- [ ] Profile doesn't show premium tier

---

### P2 MEDIUM (15 tasks)

#### P2-001: 2FA UI implementation

**User Flow:** Flow 16 (Privacy Settings)  
**Owner:** Frontend/Backend  
**Estimate:** L (8-16h)  
**Status:** Backlog

**Issue:**  
Two-factor authentication UI doesn't exist.

**Files:**
- `src/pages/Settings.jsx`
- `src/components/TwoFactorSetup.jsx` (create)
- `serverless/src/handlers/2fa.js` (create)

**Definition of Done:**
- Settings page has "Two-Factor Authentication" section
- Setup flow:
  1. Click "Enable 2FA"
  2. Scan QR code with authenticator app
  3. Enter verification code
  4. Show backup codes (download/print)
  5. 2FA enabled
- Login requires TOTP code when enabled
- Backup codes can be used once
- Disable 2FA with password confirmation

**Database:**
```sql
ALTER TABLE "User" ADD COLUMN "twoFactorEnabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN "twoFactorSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "backupCodes" TEXT[];
```

**Testing Checklist:**
- [ ] Enable 2FA → scan QR code → verify
- [ ] Login with 2FA → requires code
- [ ] Use backup code → works once
- [ ] Disable 2FA → no longer required
- [ ] Invalid code → error message

---

#### P2-002: Disconnect follower feature

**User Flow:** Flow 9 (Connect with Another User)  
**Owner:** Fullstack  
**Estimate:** M (6-12h)  
**Status:** Backlog

**Issue:**  
Users cannot remove followers from their followers list.

**Files:**
- `src/pages/FollowersList.jsx`
- `serverless/src/handlers/users.js`

**Definition of Done:**
- Followers list page shows "Remove" button for each follower
- `DELETE /api/users/:id/followers/:followerId` endpoint
- Removed follower loses access to FOLLOWERS_ONLY content
- Removed follower can re-follow if desired
- Notification sent to removed follower (optional)

**API Contract:**
```json
// DELETE /api/users/me/followers/:followerId
// Response: 204 No Content
```

**Testing Checklist:**
- [ ] Remove follower → they lose access
- [ ] Removed follower can re-follow
- [ ] FOLLOWERS_ONLY posts no longer visible to removed follower
- [ ] Follower count decrements

---

#### P2-003: Docs drift fix

**User Flow:** Documentation  
**Owner:** Documentation  
**Estimate:** M (4-8h)  
**Status:** Backlog

**Issue:**  
Documentation out of sync with current codebase.

**Files:**
- `docs/*.md` (all documentation files)

**Definition of Done:**
- All documentation reviewed and updated
- Remove outdated information
- Add missing features to docs
- Verify code examples work
- Update screenshots if applicable
- Add last updated dates to docs

**Documentation to Review:**
- `docs/API_REFERENCE.md`
- `docs/DEPLOYMENT.md`
- `docs/CONTRACTOR_ONBOARDING.md`
- `docs/USER_FLOWS.md`
- `README.md`

**Testing Checklist:**
- [ ] Follow onboarding doc → no broken steps
- [ ] Run API examples → all work
- [ ] Verify deployment steps → successful deploy
- [ ] Check links → no 404s

---

#### P2-004: Media processing pipeline

**User Flow:** Flow 7 (Upload Media)  
**Owner:** Backend/DevOps  
**Estimate:** XL (16-24h)  
**Status:** Backlog

**Issue:**  
Large uploaded images not optimized, causing slow load times.

**Definition of Done:**
- Lambda function triggered on S3 upload
- Image processing:
  - Resize to multiple sizes (thumbnail, medium, large)
  - Convert to WebP format
  - Generate blurhash for lazy loading
  - Compress to target file size
- Processed images stored back in S3
- Database updated with image URLs and metadata

**AWS Services:**
- Lambda with Sharp library for image processing
- S3 event triggers
- S3 output bucket or folders

**Testing Checklist:**
- [ ] Upload 10MB image → auto-resized to <1MB
- [ ] Thumbnail generated
- [ ] WebP format created
- [ ] Original preserved (optional)
- [ ] Processing completes in <10 seconds

---

#### P2-005: Moderation MVP

**User Flow:** Flow 17 (Admin → Moderation)  
**Owner:** Fullstack  
**Estimate:** XL (16-24h)  
**Status:** Backlog

**Issue:**  
No moderation tools exist for handling abuse.

**Database:**
```sql
CREATE TABLE "Report" (
  "id" TEXT PRIMARY KEY,
  "reporterId" TEXT NOT NULL REFERENCES "User"("id"),
  "targetType" TEXT NOT NULL, -- 'POST' | 'USER' | 'COMMENT'
  "targetId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT DEFAULT 'PENDING', -- 'PENDING' | 'REVIEWED' | 'ACTIONED'
  "createdAt" TIMESTAMP DEFAULT NOW()
);

ALTER TABLE "User" ADD COLUMN "banned" BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN "bannedReason" TEXT;
ALTER TABLE "User" ADD COLUMN "bannedAt" TIMESTAMP;
```

**Files:**
- `src/pages/admin/Reports.jsx` (create)
- `src/components/ReportModal.jsx` (create)
- `serverless/src/handlers/reports.js` (create)

**Definition of Done:**
- Report button on posts, profiles, comments
- Admin dashboard at `/admin/reports`
- Actions: Dismiss, Warn, Ban User, Delete Content
- Banned users cannot login
- Email notification sent to banned users

**Testing Checklist:**
- [ ] Report post → appears in admin dashboard
- [ ] Ban user → user cannot login
- [ ] Delete content → content removed
- [ ] Dismiss report → marked as reviewed

---

#### P2-006: Stripe payments integration

**User Flow:** Flow 4 (Request Access - Premium Content)  
**Owner:** Backend  
**Estimate:** XL (24-32h)  
**Status:** Backlog

**Issue:**  
No payment processing for premium content access.

**Files:**
- `serverless/src/handlers/stripe.js` (create)
- `serverless/src/services/stripeService.js` (create)
- `src/pages/Checkout.jsx` (create)

**Definition of Done:**
- Stripe account configured
- Create subscription endpoint
- Checkout page with Stripe Elements
- Webhook handling for payment events
- Grant access on successful payment
- Subscription management (cancel, upgrade)

**Database:**
```sql
CREATE TABLE "Subscription" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id"),
  "stripeSubscriptionId" TEXT UNIQUE,
  "status" TEXT NOT NULL, -- 'ACTIVE' | 'CANCELED' | 'PAST_DUE'
  "currentPeriodEnd" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
```

**API Endpoints:**
- `POST /api/stripe/create-checkout-session`
- `POST /api/stripe/webhook`
- `GET /api/subscriptions/me`
- `POST /api/subscriptions/cancel`

**Testing Checklist:**
- [ ] Create subscription → redirect to Stripe Checkout
- [ ] Complete payment → access granted
- [ ] Webhook received → database updated
- [ ] Cancel subscription → access revoked at period end
- [ ] Handle failed payments

---

#### P2-007: Remove /server directory cleanup

**User Flow:** Cleanup  
**Owner:** DevOps  
**Estimate:** XS (1h)  
**Status:** Backlog

**Issue:**  
Obsolete `/server` directory exists in repository, causing confusion.

**Definition of Done:**
- Delete `/server` directory
- Update documentation to remove references
- Verify build still succeeds
- Update CI/CD if needed

**Testing Checklist:**
- [ ] Delete `/server` directory
- [ ] `npm run build` succeeds
- [ ] `npm run dev` succeeds
- [ ] CI/CD pipeline succeeds
- [ ] No broken imports

---

#### P2-008: Hashtags and search

**User Flow:** Flow 10 (Search/Discover Users)  
**Owner:** Fullstack  
**Estimate:** L (8-16h)  
**Status:** Backlog

**Issue:**  
No hashtag or content search functionality.

**Database:**
```sql
CREATE TABLE "Hashtag" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT UNIQUE NOT NULL,
  "count" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "PostHashtag" (
  "postId" TEXT NOT NULL REFERENCES "Post"("id") ON DELETE CASCADE,
  "hashtagId" TEXT NOT NULL REFERENCES "Hashtag"("id") ON DELETE CASCADE,
  PRIMARY KEY ("postId", "hashtagId")
);

CREATE INDEX "PostHashtag_hashtagId_idx" ON "PostHashtag"("hashtagId");
```

**Files:**
- `src/pages/Search.jsx`
- `src/pages/HashtagFeed.jsx` (create)
- `serverless/src/handlers/search.js` (create)

**Definition of Done:**
- Detect hashtags in post content (#example)
- Create hashtag records on post creation
- Search page at `/search`
- Hashtag feed at `/hashtag/:name`
- `GET /api/search/hashtags/:tag` endpoint
- `GET /api/search?q=query` endpoint (posts and users)

**Testing Checklist:**
- [ ] Post with #test → hashtag created
- [ ] Search #test → post appears
- [ ] Click hashtag → hashtag feed page
- [ ] Search for user → user appears
- [ ] Trending hashtags displayed

---

#### P2-009: CSRF protection strategy

**User Flow:** Security  
**Owner:** Backend  
**Estimate:** M (6-12h)  
**Status:** Backlog

**Issue:**  
No CSRF protection on state-changing requests.

**Files:**
- `serverless/src/middleware/csrf.js` (create)
- `src/services/api.js`

**Definition of Done:**
- Generate CSRF tokens on login
- Include CSRF token in all POST/PUT/PATCH/DELETE requests
- Validate CSRF tokens on backend
- Return 403 on invalid tokens
- Double-submit cookie pattern or synchronizer tokens

**Implementation:**
- Store CSRF token in httpOnly cookie
- Include token in request headers: `X-CSRF-Token`
- Validate token on backend before processing

**Testing Checklist:**
- [ ] Login → CSRF token set
- [ ] POST request without token → 403
- [ ] POST request with valid token → success
- [ ] Cross-site form submission → blocked

---

#### P2-010: CSP enforcement

**User Flow:** Security  
**Owner:** DevOps  
**Estimate:** S (2-4h)  
**Status:** Backlog

**Issue:**  
No Content-Security-Policy headers configured.

**Definition of Done:**
- CSP header configured on CloudFront/API Gateway
- Allow scripts from same origin and CDNs
- Block inline scripts (use nonces if needed)
- Allow images from S3 and trusted sources
- Report CSP violations to logging endpoint

**Example CSP:**
```
Content-Security-Policy: 
  default-src 'self'; 
  script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; 
  style-src 'self' 'unsafe-inline'; 
  img-src 'self' https://project-valine-assets.s3.amazonaws.com data:; 
  font-src 'self' data:; 
  connect-src 'self' https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com;
  report-uri /api/csp-report
```

**Testing Checklist:**
- [ ] CSP header present in responses
- [ ] No CSP violations in browser console
- [ ] External resources load correctly
- [ ] Inline scripts blocked (if configured)

---

#### P2-011: WAF re-attach to CloudFront

**User Flow:** Security  
**Owner:** DevOps  
**Estimate:** S (2-4h)  
**Status:** Backlog

**Issue:**  
AWS WAF not attached to CloudFront distribution.

**Definition of Done:**
- WAF Web ACL created or existing one identified
- WAF rules configured:
  - Rate limiting (1000 req/5min per IP)
  - SQL injection protection
  - XSS protection
  - Geo-blocking (optional)
- WAF attached to CloudFront distribution
- CloudWatch dashboard for WAF metrics

**Testing Checklist:**
- [ ] WAF attached to CloudFront
- [ ] Rate limit triggered after 1000 requests
- [ ] SQL injection attempt blocked
- [ ] XSS attempt blocked
- [ ] WAF logs visible in CloudWatch

---

#### P2-012: Presigned URL expiry handling

**User Flow:** Flow 7 (Upload Media)  
**Owner:** Backend/Frontend  
**Estimate:** S (2-4h)  
**Status:** Backlog

**Issue:**  
Presigned upload URLs expire after 1 hour, causing failed uploads if user waits too long.

**Files:**
- `serverless/src/handlers/upload.js`
- `src/services/uploadService.js`

**Definition of Done:**
- Detect expired presigned URLs on upload failure
- Automatically request new presigned URL
- Retry upload with new URL
- User sees "Refreshing upload link..." message
- No data loss on URL expiry

**Testing Checklist:**
- [ ] Get presigned URL → wait 1 hour → upload fails → auto-renew → succeeds
- [ ] User sees progress indicator during renewal
- [ ] Expired URL error handled gracefully
- [ ] Multiple retries eventually fail with clear message

---

#### P2-013: Rate-limiting monitoring

**User Flow:** Security  
**Owner:** Backend/DevOps  
**Estimate:** M (4-8h)  
**Status:** Backlog

**Issue:**  
No monitoring or alerting for rate limit violations.

**Definition of Done:**
- CloudWatch dashboard for rate limiting metrics
- Metrics tracked:
  - Rate limit hits per endpoint
  - Top IP addresses hitting limits
  - 429 response rate
- Alerts configured for:
  - Spike in 429 responses (>100/min)
  - Single IP hitting multiple endpoints
- Logs include rate limit metadata

**Testing Checklist:**
- [ ] Trigger rate limit → metric appears in dashboard
- [ ] Alert fired when threshold exceeded
- [ ] Dashboard shows top limited IPs
- [ ] Logs contain rate limit context

---

#### P2-014: @Mentions system

**User Flow:** Flow 3 (Create Post), Flow 11 (Notifications)  
**Owner:** Fullstack  
**Estimate:** L (8-16h)  
**Status:** Backlog

**Issue:**  
No @mention functionality for notifying users.

**Database:**
```sql
CREATE TABLE "Mention" (
  "id" TEXT PRIMARY KEY,
  "postId" TEXT REFERENCES "Post"("id") ON DELETE CASCADE,
  "commentId" TEXT REFERENCES "Comment"("id") ON DELETE CASCADE,
  "mentionedUserId" TEXT NOT NULL REFERENCES "User"("id"),
  "mentionedByUserId" TEXT NOT NULL REFERENCES "User"("id"),
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX "Mention_mentionedUserId_idx" ON "Mention"("mentionedUserId");
```

**Files:**
- `src/components/MentionInput.jsx` (create)
- `serverless/src/handlers/mentions.js` (create)

**Definition of Done:**
- Autocomplete when typing @username in post/comment
- Search users as you type (minimum 2 characters)
- Highlight mentions in post/comment display
- Create notification for mentioned user
- Click mention → navigate to mentioned user's profile

**Testing Checklist:**
- [ ] Type @joh → see autocomplete suggestions
- [ ] Select user → mention added
- [ ] Post with mention → mentioned user receives notification
- [ ] Click mention → navigate to profile
- [ ] Mentions highlighted in display

---

#### P2-015: (Reserved for future priority item)

**Owner:** TBD  
**Estimate:** TBD  
**Status:** Backlog

**Definition of Done:**  
TBD - Reserved for emerging high-priority tasks during development.

---

### BLOCKED (1 task)

#### BLOCKED-001: Beta roles taxonomy

**User Flow:** Flow 1 (Signup/Onboarding), Flow 2 (Edit Profile)  
**Owner:** Product  
**Estimate:** M (4-8h)  
**Status:** Blocked - Awaiting Product Decision

**Issue:**  
User roles and tiers not defined (Creator, Fan, Producer, Studio, etc.).

**Blocker:**  
Product team needs to finalize user role taxonomy before implementation.

**Definition of Done:**
- Document created: `docs/DECISIONS/USER_ROLES.md`
- Document defines:
  - Role names and descriptions
  - Permissions for each role
  - Feature access matrix
  - Default role for new users
  - Role change workflow
- Stakeholder approval received

**Testing Checklist:**
- [ ] Document reviewed by product team
- [ ] Document reviewed by engineering team
- [ ] Roles align with business model
- [ ] Implementation plan created

---

### DONE (1 task)

#### DONE-001: Fix post View 404 error

**User Flow:** Flow 6 (User → View Post Detail)  
**Completed:** 2024-02-15  
**Owner:** Backend  
**PR:** #406

**Issue:**  
`GET /api/posts/:id` endpoint returned 404 for valid post IDs.

**Root Cause:**  
Incorrect route handler configuration in `serverless.yml`. Handler path was pointing to non-existent file.

**Fix:**  
Corrected handler path in `serverless.yml`:
```yaml
# Before
functions:
  getPost:
    handler: src/handlers/post.getPost  # Wrong path

# After
functions:
  getPost:
    handler: src/handlers/posts.getPost  # Correct path
```

**Verification:**
- All post detail pages load successfully
- Direct API calls to `/api/posts/:id` return 200
- No 404 errors in CloudWatch logs for valid post IDs

---

## Contractor Quick Reference

### Most Critical Tasks (Start Here)

These are the highest-impact tasks for beta launch:

1. **P0-003: Allowlist signup enforcement** - Blocks beta launch, must be completed first
2. **P0-001: CloudFront SPA deep-link fix** - Breaks user experience, high visibility issue
3. **P0-010: Network connection error handling** - User trust issue, affects all flows
4. **P0-004: Load test Prisma connections** - Scalability risk, could cause downtime

### Setup Steps

```bash
# 1. Clone repository
git clone https://github.com/your-org/Project-Valine.git
cd Project-Valine

# 2. Copy environment file
cp .env.example .env
# Get credentials from team lead or secure vault

# 3. Install dependencies
npm install              # Root dependencies
cd serverless && npm install && cd ..
cd api && npm install && cd ..

# 4. Generate Prisma client
cd api
npx prisma generate

# 5. Start development server
cd ..
npm run dev
# Frontend: http://localhost:5173
# Backend: http://localhost:3000 (if running locally)
```

### Deploy Checklist

1. **Test locally** - Verify changes work on `localhost:5173`
2. **Git commit + push** - `git add . && git commit -m "..." && git push`
3. **Run deploy commands** - Use PowerShell commands from Infrastructure section
4. **Verify staging** - Test on staging environment (when available)
5. **Run smoke test** - Execute checklist from P0-002
6. **Deploy to production** - Repeat deploy commands for prod stage

### Getting Help

- **Slack:** #project-valine-dev
- **Documentation:**
  - Contractor Onboarding: `docs/CONTRACTOR_ONBOARDING.md`
  - API Reference: `docs/API_REFERENCE.md`
  - User Flows: `docs/USER_FLOWS.md`
  - This Document: `docs/KANBAN_PROGRESS.md`
- **Code Questions:** Tag `@tech-lead` in Slack
- **Product Questions:** Tag `@product-manager` in Slack
- **Emergency:** Contact team lead directly

### Common Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run test                   # Run tests
npm run lint                   # Lint code

# Backend (serverless)
cd serverless
npx serverless deploy --stage dev        # Deploy to dev
npx serverless deploy --stage prod       # Deploy to prod
npx serverless logs -f functionName      # View logs

# Database (api)
cd api
npx prisma migrate dev                   # Create migration
npx prisma migrate deploy                # Apply migrations
npx prisma studio                        # GUI for database
npx prisma generate                      # Regenerate client
```

---

## Change Log

- **2024-02-17:** Complete rewrite with all 43 tasks detailed, user flow matrix added, contractor quick reference enhanced
- **2024-02-17:** Added comprehensive task specifications with DoD, testing checklists, file paths, and API contracts
- **2024-02-15:** Initial Kanban created with basic task structure

---

**END OF DOCUMENT**
