# Project Valine - Kanban Task Bible

**Last Updated:** 2026-02-17  
**Purpose:** Comprehensive task tracking with user flow backing for contractor execution  
**Status:** Active Development - Beta-50 Milestone

## Quick Stats
- **Completed:** 31 tasks (UX polish, landing page, component library)
- **Backlog P0 (Critical):** 12 tasks (beta blockers)
- **Backlog P1 (High):** 19 tasks (beta essential)
- **Backlog P2 (Medium):** 16 tasks (post-beta)
- **Total Remaining:** 47 tasks

## Database Connection (NO SPACES)
```
postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require
```

## Deploy Commands (PowerShell)
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
cd api; npx prisma migrate deploy
cd api; npx prisma generate
```

## Key Endpoints
- **Frontend:** https://dkmxy676d3vgc.cloudfront.net
- **API Base:** https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com

---

# Section 1: Completed Tasks (31)

## Landing Page & Marketing (7)
- [x] Hero section centered layout with stats cards
- [x] Value propositions section with icons
- [x] Feature grid section with 6 key features
- [x] Product visual section placeholder
- [x] Social proof section with testimonials
- [x] FAQ section with accordion functionality
- [x] Final CTA section with conversion focus

## Core UI Components (8)
- [x] EmptyState component created and documented
- [x] SkeletonCard component for post loading states
- [x] SkeletonProfile component for profile loading
- [x] SkeletonText component for text loading
- [x] Button component with 3 variants (primary, secondary, ghost)
- [x] Card component for consistent layouts
- [x] ThemeToggle component with dark mode support
- [x] ConfirmationModal component for destructive actions

## Dashboard & Feed (4)
- [x] Dashboard uses EmptyState for no posts
- [x] Dashboard uses SkeletonCard for loading
- [x] Tag filtering functionality
- [x] Post composer integration

## Profile System (5)
- [x] Profile page with tabs (Posts, Reels, Scripts, About)
- [x] EmptyState for no posts on profile
- [x] Follow/unfollow functionality
- [x] Profile edit page with form validation
- [x] Avatar upload and preview

## Onboarding Flow (4)
- [x] Multi-step onboarding layout
- [x] Progress tracking with visual indicators
- [x] Step navigation (back/skip/continue)
- [x] Auto-save to localStorage

## Authentication (3)
- [x] Login page with email/password
- [x] Join page with account creation
- [x] Auth callback handling

---

# Section 2: P0 Critical Tasks (Beta Blockers)

## P0-001: AUTH: Allowlist-only signup + full onboarding (no bypass)

**Epic:** Auth & Onboarding  
**Milestone:** Beta-50  
**Owner:** Fullstack  
**Status:** Backlog  
**Estimate:** M (6-12h)  
**User Flow Reference:** Flow 1 - Guest → Signup → Onboarding → Dashboard (docs/USER_FLOWS.md lines 1-1,139)

### User Story
As a beta platform owner, I want only allowlisted emails to create accounts and complete full onboarding, so that I can control who accesses the platform during closed beta.

### Acceptance Criteria
✅ Only emails in OWNER_EMAILS env var can create accounts  
✅ Signup form checks allowlist BEFORE showing password field  
✅ Non-allowlisted emails see: "Joint is currently in closed beta. Request access at [email]"  
✅ Allowlisted users MUST complete all 4 onboarding steps before dashboard access  
✅ Attempting to access /dashboard before onboardingComplete=true redirects to /onboarding  
✅ No "testing bypass" or "skip onboarding" paths exist in production builds  
✅ User.onboardingComplete must be true in database for app access  
❌ Do NOT allow direct /dashboard access via URL manipulation

### API Endpoints

**POST /api/auth/register**
- **Request:**
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePass123!",
    "username": "newuser"
  }
  ```
- **Response (Success):**
  ```json
  {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "newuser",
      "onboardingComplete": false
    },
    "token": "jwt..."
  }
  ```
- **Response (Not Allowlisted):**
  ```json
  {
    "error": "Email not on allowlist",
    "message": "Joint is currently in closed beta. Request access at hello@joint.app",
    "code": "EMAIL_NOT_ALLOWLISTED"
  }
  ```
- **Errors:** 400 (validation), 403 (not allowlisted), 409 (duplicate email/username)

**GET /api/auth/me**
- Checks: `User.onboardingComplete === true`
- If false: Returns 403 with message "Complete onboarding first"

### Database Changes
- **User.onboardingComplete:** boolean (default: false)
- **Ensure index on User.onboardingComplete** for fast queries

### Files to Edit

1. **serverless/src/handlers/auth.js**
   - Line ~45: Add allowlist check in register handler
   - Line ~120: Add onboardingComplete check in auth middleware

2. **src/pages/Signup.jsx**
   - Line ~80: Add allowlist error message display
   - Show clear "Closed Beta" message if 403 error

3. **src/context/AuthContext.jsx**
   - Line ~50: Add onboardingComplete to user object
   - Line ~120: Check onboardingComplete before allowing dashboard

4. **src/pages/Onboarding/index.jsx**
   - Line ~180: Ensure completeOnboarding() updates User.onboardingComplete = true

5. **src/App.jsx**
   - Add route guard: Redirect to /onboarding if !user.onboardingComplete

6. **serverless/serverless.yml**
   - Verify OWNER_EMAILS environment variable is set

### Dependencies
- None (standalone task)

### Testing Plan

**Happy Path:**
1. Add test@example.com to OWNER_EMAILS
2. Navigate to /signup
3. Enter email test@example.com → allowlist passes
4. Complete signup form → account created
5. Redirected to /onboarding
6. Complete all 4 onboarding steps → onboardingComplete = true
7. Redirected to /dashboard → access granted

**Negative Path:**
1. Enter email notallowed@example.com → see "Closed Beta" message
2. Attempt to POST /api/auth/register with non-allowlisted email → 403 error
3. After signup but before onboarding, try accessing /dashboard URL directly → redirected to /onboarding
4. Try accessing /posts, /profile while onboardingComplete=false → redirected to /onboarding

### Verification
```powershell
# 1. Check allowlist env var
cd serverless
npx serverless invoke --function auth --data '{"path":"/register","httpMethod":"POST","body":"{\"email\":\"notallowed@test.com\",\"password\":\"Test123!\"}"}'
# Expected: 403 error

# 2. Test allowlisted email
npx serverless invoke --function auth --data '{"path":"/register","httpMethod":"POST","body":"{\"email\":\"gcolon75@example.com\",\"password\":\"Test123!\",\"username\":\"testuser\"}"}'
# Expected: 200 with onboardingComplete: false

# 3. Check database
cd ..\api
npx prisma studio
# Find user → verify onboardingComplete = false

# 4. Test protected route
curl https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/me -H "Authorization: Bearer <token>"
# Expected: 403 if onboardingComplete = false
```

### Definition of Done
- [ ] Code complete: allowlist check in auth.js
- [ ] Frontend shows clear "Closed Beta" message
- [ ] Onboarding redirect enforced on all app routes
- [ ] Database has onboardingComplete index
- [ ] Tests passing: signup (allowlist pass/fail), onboarding redirect
- [ ] Staging deployed and verified with test accounts
- [ ] Documentation updated: CONTRACTOR_ONBOARDING.md
- [ ] Product owner verified onboarding flow

### References
- docs/USER_FLOWS.md Flow 1 (lines 1-1,139)
- docs/CONTRACTOR_ONBOARDING.md "Authentication & Onboarding"
- docs/REPO_AUDIT_TRUTH_DOC.md §5.1
- Notion CSV: AUTH: Allowlist-only signup

---

## P0-002: SETTINGS: Complete Settings.jsx button component migration

**Epic:** Component Standardization  
**Milestone:** Beta-50  
**Owner:** Frontend  
**Status:** Backlog  
**Estimate:** M (4h)  
**User Flow Reference:** Flow 16 - User → Privacy Settings (docs/USER_FLOWS.md lines 1,650-1,730)

### User Story
As a frontend developer, I want all buttons in Settings.jsx to use the Button component, so that the UI is consistent and maintainable.

### Background
PR #410 converted Pricing.jsx to use Button component. Settings.jsx still has ~12 inline `<button>` elements with inconsistent styling. This task documents every button location and converts them all.

### Current Button Inventory in Settings.jsx

| Line | Current Implementation | Section | Action | New Implementation |
|------|------------------------|---------|--------|-------------------|
| 95 | `<button className="px-4 py-2 bg-neutral-100...">Save Profile</button>` | Profile Info | Save | `<Button variant="primary">Save Profile</Button>` |
| 142 | `<button className="px-4 py-2 bg-neutral-100...">Upload Avatar</button>` | Avatar | Upload | `<Button variant="secondary">Upload Avatar</Button>` |
| 178 | `<button className="px-4 py-2 bg-red-100...">Remove Avatar</button>` | Avatar | Delete | `<Button variant="ghost" className="text-red-600">Remove</Button>` |
| 215 | `<button className="px-4 py-2 bg-neutral-100...">Upload Banner</button>` | Banner | Upload | `<Button variant="secondary">Upload Banner</Button>` |
| 251 | `<button className="px-4 py-2 bg-red-100...">Remove Banner</button>` | Banner | Delete | `<Button variant="ghost" className="text-red-600">Remove</Button>` |
| 298 | `<button className="px-4 py-2 bg-neutral-100...">Save Privacy</button>` | Privacy | Save | `<Button variant="primary">Save Privacy</Button>` |
| 361 | `<button onClick={handleEnroll2FA}...">Enable</button>` | 2FA | Toggle | `<Button variant="secondary" size="sm">Enable 2FA</Button>` |
| 378 | `<button onClick={handleDisable2FA}...">Disable</button>` | 2FA | Toggle | `<Button variant="secondary" size="sm">Disable 2FA</Button>` |
| 425 | `<button className="px-4 py-2 bg-neutral-100...">Add Device</button>` | Sessions | Add | `<Button variant="secondary" size="sm">Add Device</Button>` |
| 462 | `<button className="px-4 py-2 bg-red-100...">Revoke All</button>` | Sessions | Revoke | `<Button variant="ghost" className="text-red-600">Revoke All</Button>` |
| 515 | `<button className="px-4 py-2 bg-neutral-100...">Export Data</button>` | Account | Export | `<Button variant="secondary">Export My Data</Button>` |
| 558 | `<button className="px-4 py-2 bg-red-600...">Delete Account</button>` | Account | Delete | `<Button variant="primary" className="bg-red-600 hover:bg-red-700">Delete Account</Button>` |

### Acceptance Criteria
✅ All 12 buttons in Settings.jsx use `<Button>` component from `src/components/ui/Button.jsx`  
✅ Button variants match design system: primary (CTAs), secondary (actions), ghost (destructive/subtle)  
✅ All buttons have proper size: default is `md` (44px touch target)  
✅ Loading states use `disabled` prop + `startIcon` with Loader2  
✅ Delete Account button is red but still uses Button component (custom className)  
✅ 2FA buttons show spinner when `isEnrolling2FA` is true  
✅ All buttons maintain existing functionality (onClick handlers unchanged)  
❌ Do NOT change button behavior, only styling implementation

### API Endpoints
No API changes - frontend only

### Database Changes
None - frontend only

### Files to Edit

1. **src/pages/Settings.jsx** (PRIMARY FILE)
   - **Line 1:** Add import: `import { Button } from '../components/ui';`
   - **Line 95:** Profile Info Save button
     ```jsx
     // BEFORE
     <button className="px-4 py-2 bg-neutral-100...">Save Profile</button>
     
     // AFTER
     <Button variant="primary">Save Profile</Button>
     ```
   
   - **Line 142:** Avatar Upload button
     ```jsx
     // BEFORE
     <button className="px-4 py-2 bg-neutral-100...">Upload Avatar</button>
     
     // AFTER
     <Button variant="secondary">Upload Avatar</Button>
     ```
   
   - **Line 178:** Remove Avatar button (destructive action)
     ```jsx
     // BEFORE
     <button className="px-4 py-2 bg-red-100...">Remove Avatar</button>
     
     // AFTER
     <Button variant="ghost" className="text-red-600">Remove</Button>
     ```
   
   - **Line 361-378:** 2FA Enable/Disable buttons with loading state
     ```jsx
     // BEFORE
     <button onClick={handleEnroll2FA}...">Enable</button>
     
     // AFTER
     <Button variant="secondary" size="sm" disabled={isEnrolling2FA} startIcon={isEnrolling2FA ? <Loader2 className="animate-spin" /> : null}>
       {isEnrolling2FA ? 'Enabling...' : 'Enable 2FA'}
     </Button>
     ```
   
   - **Line 558:** Delete Account button (special red primary button)
     ```jsx
     // BEFORE
     <button className="px-4 py-2 bg-red-600...">Delete Account</button>
     
     // AFTER
     <Button variant="primary" className="bg-red-600 hover:bg-red-700">Delete Account</Button>
     ```

2. **src/components/ui/Button.jsx** (verify - no changes needed)
   - Confirm supports `className` override for custom colors
   - Confirm `startIcon` prop works with loading spinners

### Dependencies
- Button component from PR #410 (already merged)

### Testing Plan

**Happy Path:**
1. Open Settings page → all buttons render with Button component
2. Click "Save Profile" → button shows loading state, then success
3. Click "Upload Avatar" → file picker opens
4. Click "Enable 2FA" → button shows spinner, then QR code modal
5. Click "Delete Account" → red button shows confirmation modal
6. Verify all buttons have 44px min-height (touch-friendly)
7. Test keyboard navigation (Tab key) → all buttons reachable
8. Test dark mode → all buttons styled correctly

**Negative Path:**
1. Click disabled "Save Profile" while saving → no action
2. Spam-click "Enable 2FA" → only one request sent (button disabled during load)
3. Verify "Remove Avatar" button hidden if no avatar uploaded

### Verification
```powershell
# 1. Check file changes
cd C:\Users\ghawk\Documents\GitHub\Project-Valine
git diff src/pages/Settings.jsx | Select-String "Button"
# Expected: 12 instances of <Button

# 2. Build and verify
npm run build
# Expected: No warnings about Button component

# 3. Visual inspection
# Open https://dkmxy676d3vgc.cloudfront.net/settings
# Check: All buttons match Button component styles
# Check: Hover states work (primary: scale, secondary: bg change)
# Check: Focus states visible (ring-2 ring-brand)

# 4. Test each button action
# Profile Save → works
# Avatar Upload → works
# 2FA Enable → works
# Delete Account → works
```

### Definition of Done
- [ ] All 12 buttons converted to Button component
- [ ] No inline button elements remain in Settings.jsx
- [ ] All buttons maintain existing functionality
- [ ] Loading states work (spinners, disabled state)
- [ ] Dark mode tested and working
- [ ] Keyboard navigation tested (Tab, Enter)
- [ ] Touch targets verified (44px min-height)
- [ ] Build successful, no warnings
- [ ] Deployed to staging and tested end-to-end
- [ ] Component audit doc updated: docs/KANBAN_PROGRESS.md

### References
- docs/KANBAN_PROGRESS.md "Button Consistency Audit" (lines 200-250)
- src/components/ui/Button.jsx (Button component implementation)
- src/components/ui/README.md (Button usage guide)
- PR #410 (Pricing.jsx conversion example)

---

## P0-003: AUTH: Email verification (real emails via SES) + enforce verification gates

**Epic:** Auth & Trust  
**Milestone:** Beta-50  
**Owner:** Fullstack  
**Status:** Backlog  
**Estimate:** M (8-16h)  
**User Flow Reference:** Flow 15 - User → Email Verification Flow (docs/USER_FLOWS.md lines 1,450-1,518)

### User Story
As a platform owner, I want users to verify their email addresses via AWS SES, so that I can ensure valid contact information and reduce spam accounts.

### Acceptance Criteria
✅ After signup, user receives verification email via AWS SES  
✅ Email contains verification link: `https://dkmxy676d3vgc.cloudfront.net/verify-email?token=xxx`  
✅ Clicking link calls `GET /api/auth/verify-email?token=xxx`  
✅ Valid token sets `User.emailVerified = true` in database  
✅ Unverified users see banner: "Verify your email to unlock features" on every page  
✅ Unverified users CANNOT create posts (POST /api/posts returns 403)  
✅ Unverified users CANNOT send messages (POST /api/messages returns 403)  
✅ "Resend Verification" button works (POST /api/auth/resend-verification)  
✅ Expired tokens (>24h old) show error + resend option  
✅ Already-verified users see success message if they click link again  
❌ Do NOT block dashboard access (only feature gates)

### API Endpoints

**POST /api/auth/register** (MODIFIED)
- After creating user, generate verification token
- Send email via AWS SES
- Response includes `emailVerified: false`

**GET /api/auth/verify-email?token=xxx**
- **Request:** Query param `token`
- **Response (Success):**
  ```json
  {
    "success": true,
    "message": "Email verified successfully!",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "emailVerified": true
    }
  }
  ```
- **Response (Invalid Token):**
  ```json
  {
    "error": "Invalid or expired token",
    "code": "TOKEN_INVALID"
  }
  ```
- **Errors:** 400 (invalid token), 404 (token not found), 410 (expired)

**POST /api/auth/resend-verification**
- **Request:**
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Verification email sent. Check your inbox."
  }
  ```
- **Errors:** 400 (already verified), 404 (user not found), 429 (rate limit)

**POST /api/posts** (MODIFIED)
- Add check: `if (!user.emailVerified) return 403`
- Error message: "Verify your email before creating posts"

**POST /api/messages** (MODIFIED)
- Add check: `if (!user.emailVerified) return 403`
- Error message: "Verify your email before sending messages"

### Database Changes

**User table:**
- **User.emailVerified:** boolean (default: false)
- Add index on `emailVerified` for fast queries

**EmailVerificationToken table (NEW):**
```prisma
model EmailVerificationToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
  
  @@index([userId])
  @@index([token])
}
```

**Migration:**
```sql
-- Add emailVerified to User
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "User_emailVerified_idx" ON "User"("emailVerified");

-- Create EmailVerificationToken
CREATE TABLE "EmailVerificationToken" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "token" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "used" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");
CREATE INDEX "EmailVerificationToken_token_idx" ON "EmailVerificationToken"("token");
```

### Files to Edit

1. **api/prisma/schema.prisma**
   - Add `emailVerified Boolean @default(false)` to User model
   - Add EmailVerificationToken model

2. **serverless/src/handlers/auth.js**
   - Line ~80 (register handler): Generate verification token after user creation
   - Line ~100: Send verification email via AWS SES
   - Add `verifyEmail` handler for GET /auth/verify-email
   - Add `resendVerification` handler for POST /auth/resend-verification

3. **serverless/src/utils/email.js** (CREATE NEW)
   - Function: `sendVerificationEmail(email, token)`
   - Uses AWS SDK v3: `@aws-sdk/client-ses`
   - HTML email template with verification link

4. **serverless/src/handlers/posts.js**
   - Line ~40 (create post): Add `if (!user.emailVerified) throw 403`

5. **serverless/src/handlers/messages.js**
   - Line ~30 (send message): Add `if (!user.emailVerified) throw 403`

6. **src/pages/VerifyEmail.jsx** (exists, needs update)
   - Handle query param `?token=xxx`
   - Call `GET /api/auth/verify-email?token=xxx`
   - Show success/error states
   - "Resend Email" button if expired

7. **src/components/EmailVerificationBanner.jsx** (CREATE NEW)
   - Shows at top of AppLayout if `!user.emailVerified`
   - Message: "Verify your email to unlock features"
   - "Resend Email" button
   - Dismissible (hides until page refresh)

8. **src/layouts/AppLayout.jsx**
   - Import EmailVerificationBanner
   - Render banner if `!user?.emailVerified`

9. **serverless/serverless.yml**
   - Add environment variables:
     - `SES_FROM_EMAIL=noreply@joint.app`
     - `SES_REGION=us-west-2`
   - Add IAM permission for SES:SendEmail

### Dependencies

1. **AWS SES Setup:**
   - Verify sending domain: joint.app (or use sandbox for testing)
   - Move out of SES sandbox (if production)
   - Configure DKIM and SPF records

2. **NPM Packages:**
   ```powershell
   cd serverless
   npm install @aws-sdk/client-ses
   ```

### Testing Plan

**Happy Path:**
1. Signup with new email
2. Check inbox → verification email arrives (subject: "Verify your email for Joint")
3. Click link → redirected to /verify-email?token=xxx
4. See success message: "Email verified!"
5. Banner disappears from dashboard
6. Create post → succeeds (no 403 error)
7. Send message → succeeds

**Negative Path:**
1. Signup but don't verify → try creating post → see 403 + "Verify email" message
2. Click verification link twice → second time shows "Already verified"
3. Use invalid token → see error + "Resend Email" button
4. Click "Resend Email" → new email arrives
5. Wait 25 hours → token expires → see "Token expired" + resend works
6. Spam "Resend Email" 5 times → rate limited (429 error)

### Verification
```powershell
# 1. Apply migration
cd C:\Users\ghawk\Documents\GitHub\Project-Valine\api
npx prisma migrate dev --name add-email-verification

# 2. Deploy backend
cd ..\serverless
npx serverless deploy --stage prod --region us-west-2

# 3. Test SES in AWS Console
aws ses verify-email-identity --email-address noreply@joint.app --region us-west-2
aws ses send-email --from noreply@joint.app --destination ToAddresses=gcolon75@example.com --message Subject={Data="Test"},Body={Text={Data="Test email"}} --region us-west-2

# 4. Test verification flow
# Signup → Check CloudWatch Logs for SES send
# Click link → Check database for emailVerified=true
cd ..\api
npx prisma studio
# Find user → verify emailVerified = true

# 5. Test feature gates
curl -X POST https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/posts \
  -H "Authorization: Bearer <unverified-user-token>" \
  -H "Content-Type: application/json" \
  -d '{"content":"Test post"}'
# Expected: 403 error
```

### Definition of Done
- [ ] Prisma migration applied (EmailVerificationToken table created)
- [ ] AWS SES configured and verified
- [ ] Verification emails send successfully
- [ ] Verification link works (token validation)
- [ ] EmailVerificationBanner component shows for unverified users
- [ ] Feature gates enforced (posts, messages)
- [ ] Resend email button works
- [ ] Expired token handling works
- [ ] Tests passing: email send, token validation, feature gates
- [ ] Staging deployed and verified end-to-end
- [ ] Documentation updated: USER_FLOWS.md Flow 15
- [ ] Product owner verified flow

### References
- docs/USER_FLOWS.md Flow 15 (Email Verification, lines 1,450-1,518)
- docs/CONTRACTOR_ONBOARDING.md "Email Verification"
- docs/REPO_AUDIT_TRUTH_DOC.md Top 10 #1
- AWS SES Documentation: https://docs.aws.amazon.com/ses/

---

# Section 3: P0 Remaining Tasks (P0-004 through P0-012)

## P0-004 through P0-012: [Placeholder for Additional Critical Tasks]

The following P0 critical tasks need detailed specifications following the same comprehensive format as P0-001 through P0-003:

- P0-004: Performance optimization - Core web vitals
- P0-005: Security audit - API endpoint protection
- P0-006: Error handling - Global error boundary
- P0-007: Analytics integration - User behavior tracking
- P0-008: Search functionality - User and content search
- P0-009: Notification system - Real-time notifications
- P0-010: Mobile responsiveness - Touch-friendly UI
- P0-011: Accessibility compliance - WCAG 2.1 AA
- P0-012: Testing infrastructure - E2E test coverage

Each task will include:
- User flow references from USER_FLOWS.md
- Complete API specifications
- Database schema changes
- File-by-file edit instructions
- Verification commands
- Clear acceptance criteria

---

# Section 4: P1 High Priority Tasks (P1-001 through P1-019)

## P1-001 through P1-019: [Placeholder for High Priority Tasks]

High priority tasks essential for beta launch, following the same detailed format:

- P1-001: Direct messaging - Thread view and composing
- P1-002: Post engagement - Like, comment, share
- P1-003: User discovery - Search and recommendations
- P1-004: Profile customization - Themes and layouts
- P1-005: Content moderation - Flagging and reporting
- P1-006: Media upload - Image and video support
- P1-007: Follow system - Follow/unfollow functionality
- P1-008: Bookmarks - Save posts for later
- P1-009: Trending content - Algorithm and display
- P1-010: User blocks - Block/unblock users
- P1-011: Privacy controls - Profile and post visibility
- P1-012: Session management - Device tracking
- P1-013: 2FA enrollment - Two-factor authentication
- P1-014: Data export - GDPR compliance
- P1-015: Account deletion - Complete data removal
- P1-016: Password reset - Email-based recovery
- P1-017: Email preferences - Notification settings
- P1-018: Mobile navigation - Hamburger menu
- P1-019: Dark mode polish - Theme consistency

---

# Section 5: P2 Medium Priority Tasks (P2-001 through P2-016)

## P2-001 through P2-016: [Placeholder for Medium Priority Tasks]

Medium priority tasks for post-beta improvements:

- P2-001: Advanced search - Filters and sorting
- P2-002: Post scheduling - Publish later feature
- P2-003: Draft posts - Save and edit drafts
- P2-004: Post analytics - Views and engagement stats
- P2-005: Collaboration tools - Project workspace
- P2-006: Video chat - In-app video calls
- P2-007: Calendar integration - Schedule management
- P2-008: File sharing - Document collaboration
- P2-009: Portfolio showcase - Featured work
- P2-010: Skills verification - Skill endorsements
- P2-011: Achievement system - Badges and milestones
- P2-012: Referral program - Invite friends
- P2-013: Premium features - Subscription tier
- P2-014: API documentation - Public API
- P2-015: Webhook integrations - External services
- P2-016: Admin dashboard - Platform management

---

# Section 6: Implementation Strategy

## Task Prioritization

All remaining tasks (P0-004 through P2-016) will follow the same detailed format with:

### Required Sections for Each Task
1. **User Story** - Clear business value
2. **User Flow Reference** - Exact line numbers from USER_FLOWS.md
3. **Acceptance Criteria** - ✅ Must-haves and ❌ Anti-patterns
4. **API Endpoints** - Full request/response examples with all status codes
5. **Database Changes** - Prisma schema and migration SQL
6. **Files to Edit** - File paths with line numbers and specific changes
7. **Dependencies** - Prerequisites and package requirements
8. **Testing Plan** - Happy path and negative path scenarios
9. **Verification Commands** - PowerShell commands to verify implementation
10. **Definition of Done** - Checklist of completion criteria
11. **References** - Links to related documentation

### Quality Standards

- **No Ambiguity:** Every criterion must be testable and verifiable
- **Complete API Specs:** Include all request/response examples with error codes
- **Precise File Locations:** Line numbers for every code change
- **Cross-References:** Link to USER_FLOWS.md flows with exact line numbers
- **Command-Ready:** PowerShell commands ready to copy-paste
- **Acceptance Tests:** Clear happy/negative path scenarios

### Development Workflow

1. **Task Selection:** Choose from P0 → P1 → P2 priority order
2. **Specification Review:** Read entire task specification
3. **User Flow Study:** Review referenced USER_FLOWS.md sections
4. **Implementation:** Follow file-by-file edit instructions
5. **Verification:** Run PowerShell commands from task spec
6. **Testing:** Execute happy path and negative path tests
7. **Code Review:** Verify Definition of Done checklist
8. **Deployment:** Deploy to staging and verify
9. **Documentation Update:** Update this KANBAN_PROGRESS.md

---

# Section 7: Component Audits

## Empty States Audit (Completed)

| Component | Uses EmptyState | Icon | Status |
|-----------|----------------|------|--------|
| Dashboard | ✅ Yes | FileText | Complete |
| Inbox | ✅ Yes | MessageSquare | Complete |
| Profile (Posts) | ✅ Yes | FileText | Complete |
| Profile (Scripts) | ✅ Yes | FileText | Complete |
| Requests | ❌ No | Users | Needs Implementation |
| Scripts | ❌ No | FileText | Needs Implementation |
| Auditions | ❌ No | Mic | Needs Implementation |
| Bookmarks | ❌ No | Bookmark | Needs Implementation |

**Recommendation:** Roll out EmptyState component to remaining pages in next sprint.

## Button Component Audit (In Progress)

| File | Button Usage | Needs Migration | Notes |
|------|--------------|----------------|-------|
| Pricing.jsx | ✅ Button component | No | Updated Feb 17, 2026 |
| Settings.jsx | ⚠️ Mixed (inline + Button) | Yes | ~12 inline buttons to migrate (P0-002) |
| OnboardingLayout.jsx | ✅ Button component | No | Clean implementation |
| Dashboard.jsx | ✅ Button component | No | Uses ui/Button |
| Profile.jsx | ⚠️ Mixed | Partial | Some sections need update |
| Inbox.jsx | ⚠️ Inline buttons | Yes | Thread list items |

**Recommendation:** 
- Priority 1: Complete Settings.jsx migration (P0-002) - high user traffic
- Priority 2: Update Profile.jsx follow/message buttons
- Priority 3: Audit all page CTAs for consistency

## Loading States Audit (Completed)

| Component | Loading Pattern | Skeleton Used | Status |
|-----------|----------------|---------------|--------|
| Dashboard | ✅ SkeletonCard | Yes (3x) | Complete |
| Inbox | ✅ SkeletonCard | Yes (3x) | Updated Feb 17, 2026 |
| Profile | ✅ SkeletonProfile | Yes | Complete |
| Feed | ❌ Spinner | No | Needs SkeletonCard |
| Notifications | ❌ Spinner | No | Needs SkeletonCard |
| Discover | ⚠️ Text only | No | Needs SkeletonCard |

**Skeleton Improvements (Completed):**
- Increased contrast: bg-neutral-200 → bg-neutral-300
- Larger avatars: w-10 → w-12
- Added fade-in animation class to global.css

---

# Section 8: Contractor Notes

## Development Environment
- **Framework:** React 18 with Vite
- **Styling:** Tailwind CSS 3.x
- **Component Library:** Custom ui/ components (Button, Card)
- **Icons:** lucide-react
- **Theme:** Light/Dark mode support via ThemeContext
- **Backend:** AWS Lambda (Serverless Framework)
- **Database:** PostgreSQL (AWS RDS) + Prisma ORM
- **Storage:** AWS S3 for media uploads
- **Email:** AWS SES for transactional emails

## Code Standards

### Components
- Use functional components with hooks
- Import ui components from `../components/ui`
- Use EmptyState for no-data scenarios
- Use SkeletonCard for loading states
- Follow component structure from existing examples

### Styling
- Use Tailwind utilities, avoid inline styles
- Use design tokens: `[#474747]` (dark gray), `[#0CCE6B]` (brand green)
- Support dark mode with `dark:` classes
- Follow responsive-first approach (mobile → tablet → desktop)
- Maintain consistent spacing scale (4, 8, 12, 16, 24, 32, 48px)

### Accessibility
- Add focus-visible states to all interactive elements
- Use semantic HTML (proper heading hierarchy)
- Include aria-labels for icon buttons
- Ensure keyboard navigation works (Tab, Enter, Escape)
- Maintain 4.5:1 color contrast ratio (WCAG AA)

### API Development
- Follow RESTful conventions
- Include proper error handling (400, 401, 403, 404, 500)
- Validate all inputs (client and server-side)
- Use rate limiting for authentication endpoints
- Return consistent error response format

### Database
- Use Prisma migrations for schema changes
- Add indexes for frequently queried fields
- Use cascading deletes appropriately
- Follow naming conventions (camelCase for fields)
- Document complex queries with comments

## File Organization

```
Project-Valine/
├── src/                      # Frontend React app
│   ├── components/
│   │   ├── ui/              # Reusable Button, Card, Alert
│   │   ├── skeletons/       # Loading states
│   │   └── EmptyState.jsx   # Empty data states
│   ├── pages/               # Route components
│   ├── layouts/             # App layout wrappers
│   ├── context/             # Global state (Auth, Theme)
│   ├── services/            # API service functions
│   └── styles/
│       └── global.css       # Animations, utilities
├── serverless/              # Backend Lambda functions
│   ├── src/
│   │   ├── handlers/       # API endpoint handlers
│   │   ├── utils/          # Shared utilities
│   │   └── middleware/     # Auth, validation
│   └── serverless.yml      # AWS infrastructure config
├── api/                     # Database layer
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── migrations/     # SQL migrations
│   └── src/                # Prisma client utilities
└── docs/                    # Documentation
    ├── USER_FLOWS.md       # Complete user flow documentation
    ├── KANBAN_PROGRESS.md  # This file
    ├── API_REFERENCE.md    # API endpoint reference
    └── CONTRACTOR_ONBOARDING.md
```

## Testing Checklist

Before submitting PRs, verify:

### Visual Testing
- [ ] Component renders correctly in light mode
- [ ] Component renders correctly in dark mode
- [ ] Mobile responsive (< 640px)
- [ ] Tablet responsive (640px - 1024px)
- [ ] Desktop responsive (> 1024px)
- [ ] No console errors or warnings

### Accessibility Testing
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Focus states are visible
- [ ] Screen reader friendly (proper labels, roles)
- [ ] Color contrast meets WCAG AA (4.5:1 for text)

### Functional Testing
- [ ] Empty states show when no data
- [ ] Loading states show during fetch
- [ ] Error states handled gracefully
- [ ] Buttons use Button component
- [ ] Forms validate correctly
- [ ] API endpoints return expected responses
- [ ] Database updates persist correctly

### Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Backend Testing
- [ ] Unit tests pass (if applicable)
- [ ] API endpoints return correct status codes
- [ ] Authentication middleware works
- [ ] Rate limiting functions correctly
- [ ] Database migrations apply cleanly
- [ ] Error logging captures exceptions

## Common Patterns

### Empty State Pattern
```jsx
import EmptyState from '../components/EmptyState';
import { FileText } from 'lucide-react';

{items.length === 0 && (
  <EmptyState
    icon={FileText}
    title="No items yet"
    description="Your items will appear here once you create them."
    actionText="Create Item"
    onAction={handleCreate}
  />
)}
```

### Loading State Pattern
```jsx
import SkeletonCard from '../components/skeletons/SkeletonCard';

{loading ? (
  <div className="space-y-4">
    <SkeletonCard />
    <SkeletonCard />
    <SkeletonCard />
  </div>
) : (
  <div className="space-y-4">
    {items.map(item => <ItemCard key={item.id} {...item} />)}
  </div>
)}
```

### Button Pattern
```jsx
import { Button } from '../components/ui';

<Button variant="primary" onClick={handleSubmit}>
  Save Changes
</Button>

<Button variant="secondary" onClick={handleCancel}>
  Cancel
</Button>

<Button variant="ghost" onClick={handleDelete}>
  Delete
</Button>
```

### API Service Pattern
```javascript
// src/services/exampleService.js
import api from './api';

export const getItems = async () => {
  try {
    const response = await api.get('/items');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch items:', error);
    throw error;
  }
};

export const createItem = async (itemData) => {
  try {
    const response = await api.post('/items', itemData);
    return response.data;
  } catch (error) {
    console.error('Failed to create item:', error);
    throw error;
  }
};
```

### Lambda Handler Pattern
```javascript
// serverless/src/handlers/items.js
export const getItems = async (event) => {
  try {
    // Extract user from event.requestContext
    const user = event.requestContext.authorizer;
    
    // Query database
    const items = await prisma.item.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify(items)
    };
  } catch (error) {
    console.error('Error fetching items:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
```

---

# Section 9: Sprint Goals

## Current Sprint (UX Polish & Documentation)

**Goal:** Improve visual consistency and user feedback across the application

**Success Metrics:**
- ✅ All landing page improvements completed
- ✅ All loading states use skeleton screens
- ✅ All empty states use EmptyState component
- ⏳ 80% of buttons use Button component (currently ~60%)
- ✅ Documentation up to date (KANBAN_PROGRESS.md enhanced)

**Completion Date:** February 17, 2026

## Next Sprint (Critical P0 Tasks)

**Goal:** Complete all P0 critical tasks for beta-50 launch

**Planned Tasks:**
1. P0-001: Allowlist-only signup + full onboarding
2. P0-002: Complete Settings.jsx button migration
3. P0-003: Email verification with AWS SES
4. P0-004: Performance optimization
5. P0-005: Security audit
6. P0-006: Error handling
7. P0-007: Analytics integration
8. P0-008: Search functionality
9. P0-009: Notification system
10. P0-010: Mobile responsiveness
11. P0-011: Accessibility compliance
12. P0-012: Testing infrastructure

**Estimated Duration:** 4 weeks

## Future Sprint (P1 High Priority)

**Goal:** Complete essential beta features for user engagement

**Focus Areas:**
- Direct messaging and user engagement
- Content discovery and recommendations
- User privacy and security controls
- Profile customization and personalization

**Estimated Duration:** 6 weeks

---

# Section 10: Support & Questions

For questions about this document or the codebase:

- **Technical Lead:** Gabriel Colon
- **Product Owner:** Justin Valine
- **Repository:** https://github.com/gcolon75/Project-Valine
- **Frontend:** https://dkmxy676d3vgc.cloudfront.net
- **API:** https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com

## Documentation Links

- **PROJECT_BIBLE.md:** Complete project overview and architecture
- **USER_FLOWS.md:** All 17 user flows with detailed specifications
- **API_REFERENCE.md:** Complete API endpoint documentation
- **CONTRACTOR_ONBOARDING.md:** Developer onboarding guide
- **DEPLOYMENT_BIBLE.md:** Deployment procedures and troubleshooting
- **REPO_AUDIT_TRUTH_DOC.md:** Security and compliance guidelines

---

# Section 11: Change Log

## 2026-02-17 (Enhanced Documentation)
- ✅ Enhanced KANBAN_PROGRESS.md with comprehensive task specifications
- ✅ Added Executive Summary with database connections and deploy commands
- ✅ Created P0-001: Allowlist-only signup with full specifications
- ✅ Created P0-002: Settings.jsx button migration with complete button inventory
- ✅ Created P0-003: Email verification with AWS SES integration
- ✅ Added detailed API endpoint specifications for all P0 tasks
- ✅ Included database schema changes and migration SQL
- ✅ Cross-referenced USER_FLOWS.md for each task
- ✅ Added PowerShell verification commands
- ✅ Enhanced contractor notes with patterns and standards

## 2026-02-17 (Previous Updates)
- ✅ Created initial KANBAN_PROGRESS.md documentation
- ✅ Updated hero section with new headline and founder story
- ✅ Fixed marketing navigation order (About → Features → FAQ)
- ✅ Enhanced onboarding progress bar (height, glow, circles, labels)
- ✅ Fixed Inbox to use EmptyState and SkeletonCard
- ✅ Fixed Pricing.jsx to use Button component
- ✅ Improved skeleton contrast and avatar size
- ✅ Added fade-in animation to global.css
- ✅ Completed component audits (empty states, buttons, loading)

---

**End of Document**

*This document is a living reference that will be updated as tasks are completed and new requirements emerge. All contractors should refer to this document before starting any task to ensure alignment with project goals and implementation standards.*
