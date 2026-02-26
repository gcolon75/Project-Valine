# Brendan's Kanban - Engineering Tasks

**Last Updated:** 2026-02-25
**Owner:** Brendan (Engineer/Coder)
**Focus:** All frontend, backend, and fullstack development tasks

---

## Quick Reference

### Database URL (NO SPACES)
```
postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require
```

### Deploy Commands (PowerShell)
```powershell
cd C:\Users\ghawk\Documents\GitHub\Project-Valine
git checkout main; git pull origin main

# Backend
cd serverless
npm ci
npx serverless deploy --stage prod --region us-west-2

# Frontend
cd ..
npm ci
npm run build
aws s3 sync dist/ s3://project-valine-frontend-prod --delete

# Migrations
cd api
npx prisma migrate deploy
npx prisma generate
```

### Key Endpoints
- Frontend: https://dkmxy676d3vgc.cloudfront.net
- API: https://ce73w43mga.execute-api.us-west-2.amazonaws.com

---

## Task Summary

| Priority | Total | Completed | In Progress | Not Started |
|----------|-------|-----------|-------------|-------------|
| P0 | 7 | 7 | 0 | 0 |
| P1 | 14 | 3 | 1 | 10 |
| P2 | 10 | 4 | 0 | 6 |
| **Total** | **31** | **14** | **1** | **16** |

---

## ✅ Completed Tasks (10)

### ✅ A2: Fix post 'View' button 404
**Status:** ✅ COMPLETED (PR #406)
**User Flow:** Flow 6 (View Post Detail)

**What was done:**
- Fixed routing so /posts/:id renders under AppLayout
- Clicking View button navigates correctly
- Direct URL and hard refresh work

**Files changed:**
- src/App.jsx - Added /posts/:id route at line 65
- src/pages/PostDetail.jsx - Updated component

**Verification:**
✅ Confirmed: src/App.jsx contains `<Route path="/posts/:id" element={<PostDetail />} />`

**Reference:** PR #406, docs/POST_VIEW_FIX_VERIFICATION.md

---

### ✅ A3: Fix onboarding user object extraction
**Status:** ✅ COMPLETED
**User Flow:** Flow 1 (Signup → Onboarding)

**What was done:**
- AuthContext now extracts user from /auth/me correctly
- `/auth/me` returns `{ user: {...} }`, extraction at line 53
- Onboarding flow works end-to-end

**Files changed:**
- src/context/AuthContext.jsx - Line 53: `setUser(userData.user)`

**Verification:**
✅ Confirmed: AuthContext.jsx line 53 contains proper user extraction

**Reference:** src/context/AuthContext.jsx

---

### ✅ A4: Fix pronouns & experiences not displaying
**Status:** ✅ COMPLETED
**User Flow:** Flow 2 (Edit Profile)

**What was done:**
- Pronouns and experiences now render on profile pages
- Display verified across all profile views
- Added conditional rendering with visibility toggles

**Files changed:**
- src/pages/Profile.jsx - Added pronouns display with icon
- src/components/ProfileCard.jsx - Updated to show pronouns

**Verification:**
✅ Confirmed: Profile.jsx contains pronouns display logic

**Reference:** src/pages/Profile.jsx

---

### ✅ A5: Fix image cropper too zoomed in
**Status:** ✅ COMPLETED
**User Flow:** Flow 7 (Upload Media)

**What was done:**
- Cropper starts at 100% zoom or fit-to-view
- User experience improved for avatar/banner uploads
- Added zoom state management and controls

**Files changed:**
- src/components/ImageCropper.jsx - Added baseScale and zoom state

**Verification:**
✅ Confirmed: ImageCropper.jsx contains zoom and baseScale state variables

**Reference:** src/components/ImageCropper.jsx

---

### ✅ A6-A8: Auth flow improvements
**Status:** ✅ COMPLETED
**User Flow:** Flow 1 (Signup), Flow 5 (Login)

**What was done:**
- A6: Enabled open registration with allowlist check
- A7: Auto-login after registration
- A8: User data resets on account switch

**Files changed:**
- serverless/src/handlers/auth.js - Allowlist validation
- src/pages/Join.jsx - Registration flow
- src/context/AuthContext.jsx - Session management

**Verification:**
✅ Confirmed: auth.js contains ALLOWED_USER_EMAILS logic

**Reference:** serverless/src/handlers/auth.js, src/context/AuthContext.jsx

---

### ✅ A9: Settings.jsx button component migration
**Status:** ✅ COMPLETED (PR #423)
**Priority:** P0 | **User Flow:** Flow 16 (Settings)

**What was done:**
- All 12 buttons in Settings.jsx now use Button component
- Consistent styling: primary, secondary, ghost variants
- Loading states work correctly (2FA, Export, Session Terminate)
- Accessibility improved with focus states

**Files changed:**
- src/pages/Settings.jsx - Migrated 12 inline buttons to Button component

**Verification:**
✅ Confirmed: All Settings.jsx buttons use <Button> component with proper variants

**Reference:** PR #423

---

### ✅ A10: Accessibility improvements (focus states + responsive)
**Status:** ✅ COMPLETED (PR #423)
**Priority:** P0 | **User Flow:** All flows

**What was done:**
- Added focus-visible states to all interactive elements
- Responsive breakpoints applied: sm: (640px), md: (768px), lg: (1024px)
- Mobile-first responsive design
- WCAG 2.1 AA compliance improved

**Files changed:**
- Multiple components and pages
- Enhanced keyboard navigation

**Verification:**
✅ Confirmed: Tab navigation works, focus rings visible, mobile responsive

**Reference:** PR #423

---

### ✅ B13: Notifications - Access request events
**Status:** ✅ COMPLETED (PR #422)
**Priority:** P1 | **User Flow:** Flow 4, Flow 13

**What was done:**
- Access request/approve/deny now generate notifications
- Unread count updates correctly
- Owner notified when user requests access
- Requester notified when owner approves/denies

**Files changed:**
- serverless/src/handlers/requests.js - Added notification triggers
- serverless/src/handlers/notifications.js - Event handling

**Verification:**
✅ Confirmed: Request access → owner gets notification; approve → requester gets notification

**Reference:** PR #422, docs/REPO_AUDIT_TRUTH_DOC.md §5.6

---

### ✅ B14: POSTS - Owner UI for access requests
**Status:** ✅ COMPLETED (PR #422)
**Priority:** P1 | **User Flow:** Flow 13

**What was done:**
- Created AccessRequests page for owners
- Owners can review pending requests with approve/deny actions
- Request status updates in real-time
- Requester sees updated status
- Fixed "Request Access" button calling wrong endpoint (now uses POST /api/posts/:id/request correctly)

**Files changed:**
- src/pages/AccessRequests.jsx (created)
- src/components/AccessRequestCard.jsx (created)
- src/components/PostCard.jsx - Fixed Request Access button API
- Post access control logic wired

**Verification:**
✅ Confirmed: Owner can approve/deny requests; requester can view gated content after approval

**Reference:** PR #422, docs/REPO_AUDIT_TRUTH_DOC.md §5.6

---

### ✅ B15: Profile layout improvements (LinkedIn-style)
**Status:** ✅ COMPLETED (PR #414)
**Priority:** P1 | **User Flow:** Flow 2 (Profile)

**What was done:**
- Profile redesigned with horizontal layout
- Avatar, bio, and stats displayed side-by-side
- Improved visual hierarchy
- Onboarding banner upload added

**Files changed:**
- src/pages/Profile.jsx - Layout redesign
- src/pages/Onboarding/* - Banner upload step

**Verification:**
✅ Confirmed: Profile displays in horizontal layout; banner upload works

**Reference:** PR #414

## 🚧 In Progress (1)

### 🚧 B12: Comments system for posts
**Status:** 🚧 IN PROGRESS
**Priority:** P1 | **Estimate:** L (24h+) | **User Flow:** Flow 8 (Like/Comment)

**What:** Full comments system (model + API + UI)

**Definition of Done:**
- ✅ Users can read/create comments on posts
- ✅ Pagination for large comment lists
- ✅ Content sanitization (XSS protection)
- ✅ Permissions enforced (private posts)
- ✅ Delete own comments

**API Endpoints:**
- POST /api/posts/:id/comments
- GET /api/posts/:id/comments
- DELETE /api/comments/:id

**Database Changes:**
```prisma
model Comment {
  id        String   @id @default(cuid())
  postId    String
  authorId  String
  content   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  post   Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  author User @relation(fields: [authorId], references: [id])
  
  @@index([postId])
  @@index([authorId])
}
```

**Files to Edit:**
- api/prisma/schema.prisma - Add Comment model
- serverless/src/handlers/comments.js (create new)
- src/components/CommentList.jsx (create new)
- src/components/CommentComposer.jsx (create new)
- src/pages/PostDetail.jsx - Integrate comments

**Testing:**
1. Create comment → appears in list
2. Load 100+ comments → pagination works
3. Try XSS payload → blocked
4. Load test endpoint

**Mermaid Diagram:**
```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant DB
    
    User->>Frontend: Click "Add Comment"
    Frontend->>API: POST /api/posts/:id/comments
    API->>DB: Insert Comment
    DB-->>API: Comment created
    API-->>Frontend: 201 + comment object
    Frontend-->>User: Comment appears in list
    
    User->>Frontend: Load comments
    Frontend->>API: GET /api/posts/:id/comments?page=1
    API->>DB: Query comments (paginated)
    DB-->>API: Comments array
    API-->>Frontend: 200 + comments + pagination
    Frontend-->>User: Comments list rendered
```

**Reference:** docs/REPO_AUDIT_TRUTH_DOC.md Top 10 #4, docs/USER_FLOWS.md Flow 8

---

## 📋 P0 Critical Tasks (2 remaining)

### P0-001: AUTH: Allowlist-only signup + full onboarding
**Status:** Not Started
**Priority:** P0 | **Estimate:** M (6-12h) | **User Flow:** Flow 1 (Signup → Onboarding)

**What:** Enforce allowlist at signup; require full onboarding before dashboard access.

**Definition of Done:**
- ✅ Only ALLOWED_USER_EMAILS can signup
- ✅ Non-allowlisted see "Joint is in closed beta"
- ✅ Onboarding cannot be skipped via URL
- ✅ Dashboard accessible only after onboarding complete
- ✅ No testing bypass in prod

**Files to Edit:**
- serverless/src/handlers/auth.js - Add allowlist check to signup
- src/pages/Join.jsx - Add client-side allowlist validation
- src/pages/Onboarding/OnboardingLayout.jsx - Remove bypass logic
- src/App.jsx - Add onboarding route guard

**API Changes:**
```javascript
// POST /auth/register
if (!ALLOWED_USER_EMAILS.includes(normalizedEmail)) {
  return {
    statusCode: 403,
    body: JSON.stringify({
      error: 'Joint is in closed beta. Request access at hello@joint.com'
    })
  };
}
```

**Testing:**
1. Try non-allowlisted email → blocked
2. Allowlisted email → proceeds to onboarding
3. Skip onboarding via URL → redirected
4. Complete onboarding → dashboard works

**Mermaid Diagram:**
```mermaid
flowchart TD
    A[User enters email] --> B{Email in allowlist?}
    B -->|No| C[Show: Joint is in closed beta]
    B -->|Yes| D[Create account]
    D --> E[Redirect to onboarding]
    E --> F{Onboarding complete?}
    F -->|No| G[Show onboarding steps]
    F -->|Yes| H[Redirect to dashboard]
    G --> I[User completes steps]
    I --> J[Set onboardingComplete=true]
    J --> H
```

**Reference:** docs/REPO_AUDIT_TRUTH_DOC.md §5.1, docs/USER_FLOWS.md Flow 1

---

### P0-002: STABILITY: Fix 'No network connection' errors
**Status:** Not Started
**Priority:** P0 | **Estimate:** M (4-6h) | **User Flow:** All flows

**What:** Eliminate spurious "no network" errors; clear messaging for real outages.

**Definition of Done:**
- ✅ No false "no network connection" errors during normal use
- ✅ Real API outages show: "Service temporarily unavailable. Retry in 30s"
- ✅ CORS configured correctly
- ✅ API base URL correct in all environments

**Files to Edit:**
- src/services/api.js - Improve error handling
- src/context/AuthContext.jsx - Better network error detection
- Verify CORS settings in API Gateway

**Code Changes:**
```javascript
// src/services/api.js
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // Network error
      if (navigator.onLine) {
        // Online but API unreachable
        throw new Error('Service temporarily unavailable. Please try again in 30 seconds.');
      } else {
        // Actually offline
        throw new Error('No internet connection. Please check your network.');
      }
    }
    throw error;
  }
);
```

**Testing:**
1. Normal usage → no false errors
2. Disconnect network → clear error message with retry
3. Reconnect → retry succeeds
4. Check browser console for CORS errors

**Reference:** docs/INTERVIEW_PREPARATION_SHEET.md

---

## 📋 P1 High Priority Tasks (13 remaining)

### P1-001: AUTH: Server-side onboarding enforcement
**Status:** Not Started
**Priority:** P1 | **Estimate:** M (4-6h) | **User Flow:** Flow 1
**Dependencies:** P0-001 (Allowlist signup)

**What:** Block API access until onboardingComplete=true

**Definition of Done:**
- ✅ Auth middleware rejects requests if onboardingComplete=false
- ✅ Error: 403 "Complete onboarding to continue"
- ✅ After onboarding → 200 responses

**Files:** serverless/src/middleware/auth.js

**Reference:** docs/REPO_AUDIT_TRUTH_DOC.md §5.3

---

### P1-002: AUTH: Password strength requirements
**Status:** Not Started
**Priority:** P1 | **Estimate:** S (2-4h) | **User Flow:** Flow 1, Flow 14

**What:** Enforce strong passwords server-side

**Definition of Done:**
- ✅ Passwords must be 8+ characters
- ✅ Include: uppercase, lowercase, number, special char
- ✅ Weak passwords → 400 error with clear message

**Files:** serverless/src/handlers/auth.js

**Reference:** docs/REPO_AUDIT_TRUTH_DOC.md Security concerns

---

### P1-003: AUTH: Email verification via SES
**Status:** Not Started
**Priority:** P1 | **Estimate:** M (8-16h) | **User Flow:** Flow 15
**Dependencies:** AWS SES verified sender domain

**What:** Send real verification emails; gate features until verified

**Definition of Done:**
- ✅ Signup triggers verification email via SES
- ✅ Email contains link with time-limited token
- ✅ /auth/verify-email?token=xxx validates token
- ✅ User.emailVerified=true after verification
- ✅ Unverified users cannot post/message

**Files:**
- serverless/src/handlers/auth.js
- src/pages/VerifyEmail.jsx
- api/prisma/schema.prisma (EmailVerificationToken table)

**Reference:** docs/REPO_AUDIT_TRUTH_DOC.md Top 10 #1, docs/USER_FLOWS.md Flow 15

---

### P1-004: AUTH: Password reset pages
**Status:** Not Started
**Priority:** P1 | **Estimate:** M (8h) | **User Flow:** Flow 14
**Dependencies:** SES wiring

**What:** Add ForgotPassword + ResetPassword pages

**Files:**
- src/pages/ForgotPassword.jsx (create)
- src/pages/ResetPassword.jsx (create)
- serverless/src/handlers/auth.js
- api/prisma/schema.prisma (PasswordResetToken table)

**Reference:** docs/CONTRACTOR_ONBOARDING.md, docs/USER_FLOWS.md Flow 14

---

### P1-005: POSTS: Likes data model alignment
**Status:** Not Started
**Priority:** P1 | **Estimate:** M (4-6h) | **User Flow:** Flow 8

**What:** Ensure post likes use correct relations (currently references Reel)

**Files:**
- api/prisma/schema.prisma - Fix Like model
- serverless/src/handlers/posts.js - Update queries

**Reference:** docs/REPO_AUDIT_TRUTH_DOC.md feature matrix

---

### P1-006: POSTS: Post editing UI
**Status:** Not Started
**Priority:** P1 | **Estimate:** S (4h) | **User Flow:** Flow 3
**Dependencies:** Backend PATCH /posts/:id endpoint

**What:** Add edit option in post menu

**Files:**
- src/components/PostCard.jsx - Add edit option
- src/components/PostComposer.jsx - Support edit mode

**Reference:** docs/REPO_AUDIT_TRUTH_DOC.md Dead UI table

---

### P1-007: Notifications: Access request events
**Status:** ✅ COMPLETED (PR #422) — see B13 in Completed Tasks above
**Priority:** P1 | **Estimate:** M (4-6h) | **User Flow:** Flow 4, Flow 13

**What:** Generate notifications when access requested/approved/denied

**Files:**
- serverless/src/handlers/requests.js
- serverless/src/handlers/notifications.js

**Reference:** docs/REPO_AUDIT_TRUTH_DOC.md §5.6 gap

---

### P1-008: POSTS: Owner UI for access requests
**Status:** ✅ COMPLETED (PR #422) — see B14 in Completed Tasks above
**Priority:** P1 | **Estimate:** M (4-6h) | **User Flow:** Flow 13

**What:** Owners can review pending access requests

**Files:**
- src/pages/AccessRequests.jsx (create)
- src/components/AccessRequestCard.jsx

**Reference:** docs/REPO_AUDIT_TRUTH_DOC.md §5.6

---

### P1-009: POSTS: Requester UI for access requests
**Status:** Not Started
**Priority:** P1 | **Estimate:** M (4-6h) | **User Flow:** Flow 4

**What:** Requesters can track all access requests

**Files:** src/pages/MyAccessRequests.jsx (create)

**Reference:** docs/REPO_AUDIT_TRUTH_DOC.md §5.6

---

### P1-010: Privacy: Private profile enforcement audit
**Status:** Not Started
**Priority:** P1 | **Estimate:** M (4-6h) | **User Flow:** Flow 16

**What:** Ensure PRIVATE profiles don't leak in search/explore/feed

**Files:**
- serverless/src/handlers/search.js
- serverless/src/handlers/feed.js
- serverless/src/handlers/profiles.js

**Reference:** docs/REPO_AUDIT_TRUTH_DOC.md Security concerns

---

### P1-011: MESSAGING: DM scope decision
**Status:** Not Started
**Priority:** P1 | **Estimate:** M (4-6h) | **User Flow:** Flow 12
**Dependencies:** Product decision

**What:** Restrict DMs to "share post only" OR explicitly allow freeform chat

**Files:**
- src/pages/Messages.jsx
- serverless/src/handlers/messages.js

**Reference:** docs/REPO_AUDIT_TRUTH_DOC.md §7.6

---

### P1-012: STABILITY: Investigate 403 errors
**Status:** Not Started
**Priority:** P1 | **Estimate:** M (4-6h) | **User Flow:** Flow 5, Flow 2

**What:** Fix false 403 errors and "No profile found" scenarios

**Files:**
- serverless/src/middleware/auth.js
- serverless/src/handlers/profiles.js

**Reference:** docs/INTERVIEW_PREPARATION_SHEET.md

---

### P1-013: STABILITY: Investigate login failures
**Status:** Not Started
**Priority:** P1 | **Estimate:** M (4-6h) | **User Flow:** Flow 5

**What:** Root cause intermittent login crashes

**Files:**
- serverless/src/handlers/auth.js
- src/pages/Login.jsx

**Reference:** docs/INTERVIEW_PREPARATION_SHEET.md

---

## 📋 P2 Medium Priority Tasks (10 remaining)

### P2-001: AUTH: 2FA UI enablement
**Status:** Not Started
**Priority:** P2 | **Estimate:** M (8h) | **User Flow:** Flow 16
**Dependencies:** Backend 2FA endpoints

**What:** Add 2FA enable/disable flow in Settings

**Files:** src/pages/Settings.jsx

**Reference:** docs/REPO_AUDIT_TRUTH_DOC.md Top 10 #3

---

### P2-002: SOCIAL: Disconnect/remove follower
**Status:** Not Started
**Priority:** P2 | **Estimate:** M (4-6h) | **User Flow:** Flow 9

**What:** Add endpoint + UI to remove a follower

**Files:**
- serverless/src/handlers/connections.js
- src/pages/Profile.jsx

**Reference:** docs/REPO_AUDIT_TRUTH_DOC.md Top 10 #9

---

### P2-003: CLEANUP: Docs drift fix
**Status:** Not Started
**Priority:** P2 | **Estimate:** S (2-4h)

**What:** Reconcile "6-step onboarding" vs actual steps

**Files:** All docs in docs/ directory

**Reference:** docs/REPO_AUDIT_TRUTH_DOC.md §8.5

---

### P2-004: MEDIA: Processing pipeline
**Status:** Not Started
**Priority:** P2 | **Estimate:** L (24h+) | **User Flow:** Flow 7
**Dependencies:** S3 events + Lambda FFmpeg

**What:** Automated thumbnail generation and video transcoding

**Files:** Create Lambda function for media processing

**Reference:** docs/REPO_AUDIT_TRUTH_DOC.md Top 10 #10

---

### P2-005: MODERATION: Moderation MVP
**Status:** Not Started
**Priority:** P2 | **Estimate:** L (24h+) | **User Flow:** Flow 17
**Dependencies:** Admin role, MODERATION_ENABLED flag

**What:** Reporting UI + admin review + ban toggle

**Files:** Create admin dashboard, reporting flow

**Reference:** docs/REPO_AUDIT_TRUTH_DOC.md Top 10 #8

---

### P2-006: Payment processing (Stripe) — Hide/feature-flag paid-post UI until payments exist
**Status:** ✅ DONE (feature-flagged, Stripe pending)
**Priority:** P2 | **Estimate:** L (24h+) | **User Flow:** Flow 4
**Dependencies:** Product/payment design

**What:** Feature-flagged paid post UI — "coming soon" notices replace live Pay buttons and price badges. Stripe integration deferred.

**Files changed:**
- src/pages/PostDetail.jsx — Pay button → "Paid access — coming soon"; price badge replaced
- src/pages/Post.jsx — Price input → static notice; price forced to 0
- serverless/src/handlers/payments.js (create — deferred)

**Reference:** docs/REPO_AUDIT_TRUTH_DOC.md Top 10 #5

---

### P2-007: CLEANUP: Remove /server directory
**Status:** ✅ DONE
**Priority:** P2 | **Estimate:** S (1-2h)

**What:** Archive legacy /server directory with notice file

**Files:** /server/ARCHIVED_SERVER_NOTICE.md (created)

**Reference:** docs/REPO_AUDIT_TRUTH_DOC.md §8.5

---

### P2-008: SEARCH: Hashtags click-to-search
**Status:** Not Started
**Priority:** P2 | **Estimate:** M (16h) | **User Flow:** Flow 10
**Dependencies:** Search improvements

**What:** Clicking hashtag filters results; autocomplete suggests tags

**Files:**
- src/components/HashtagLink.jsx (create)
- Search API improvements

**Reference:** docs/REPO_AUDIT_TRUTH_DOC.md Top 10 #7

---

### P2-009: SECURITY: CSRF strategy
**Status:** Not Started
**Priority:** P2 | **Estimate:** M (4-6h)
**Dependencies:** Auth cookie strategy

**What:** Decide and implement CSRF protections

**Files:** serverless/src/middleware/csrf.js (if needed)

**Reference:** docs/REPO_AUDIT_TRUTH_DOC.md Security concerns

---

### P2-010: @Mentions system
**Status:** Not Started
**Priority:** P2 | **Estimate:** M (16h) | **User Flow:** Flow 3, Flow 11
**Dependencies:** Mention model + parsing

**What:** Parse @mentions, notify users, autocomplete

**Files:**
- api/prisma/schema.prisma - Add Mention model
- src/components/PostComposer.jsx - Add autocomplete
- serverless/src/handlers/mentions.js (create)

**Reference:** docs/REPO_AUDIT_TRUTH_DOC.md Top 10 #7

---

### QA: Add smoke-test checklist for beta rollout
**Status:** ✅ DONE (PowerShell version added)
**Priority:** P0 | **Estimate:** S (1-2h)

**What:** PowerShell script that hits 4 critical prod endpoints and prints pass/fail for each.

**Files:** scripts/deployment/smoke-test.ps1 (created)

---

### PostCard visibility label fix (data model alignment)
**Status:** ✅ DONE
**Priority:** P2 | **Estimate:** XS (<1h)

**What:** Fix visibility label in PostCard.jsx — schema uses `FOLLOWERS_ONLY` not `private`. Changed "Private"/"On Request" to "Followers Only"/"Access Required".

**Files:** src/components/PostCard.jsx — visibility label updated

---

## User Flow Quick Reference

| Flow # | User Flow | Relevant Tasks |
|--------|-----------|----------------|
| 1 | Signup → Onboarding → Dashboard | P0-001, P1-001, P1-002 |
| 2 | Edit Profile | ✅ A4 (done) |
| 3 | Create Post | P1-006, P2-010 |
| 4 | Request Access | P1-007, P1-008, P1-009 |
| 5 | Login | P0-002, P1-012, P1-013 |
| 6 | View Post Detail | ✅ A2 (done) |
| 7 | Upload Media | ✅ A5 (done), P2-004 |
| 8 | Like/Comment | 🚧 B12 (in progress), P1-005 |
| 9 | Connect | P2-002 |
| 12 | Direct Messages | P1-011 |
| 15 | Email Verification | P1-003 |
| 16 | Privacy Settings | P1-010, P2-001 |
| 17 | Moderation | P2-005 |

---

## Support & Questions

**Documentation:**
- docs/USER_FLOWS.md - Complete user flows
- docs/CONTRACTOR_ONBOARDING.md - Onboarding guide
- docs/API_REFERENCE.md - API documentation

**Technical Lead:** Gabriel Colon
**Product Owner:** Justin Valine

---

**End of Brendan's Kanban**
