# Pull Request: Contractor Onboarding Document

## Summary

This PR adds a comprehensive contractor onboarding document (`docs/CONTRACTOR_ONBOARDING.md`) and updates the documentation navigation in `docs/README.md`. The onboarding guide is designed to help temporary contractors quickly understand the project, set up their environment, and complete remaining features.

## Changes Made

### 1. Created `docs/CONTRACTOR_ONBOARDING.md`

A complete onboarding guide (1,200+ lines) covering:
- **Welcome & Goals**: Clear mission statement and current feature status
- **10-Minute Orientation**: ASCII architecture diagram and repository map with actual file paths
- **Getting Access**: GitHub, AWS permissions checklist, and environment variable names (no values)
- **Local Setup**: Step-by-step PowerShell commands for frontend and backend
- **Deploy & Verify**: Links to DEPLOYMENT_BIBLE.md (no duplication)
- **Debugging Flow**: CloudWatch logs, troubleshooting links
- **Feature Implementation Guide**: Detailed table mapping features to frontend/backend files, DB tables, API endpoints, with current status and testing procedures
- **Working Agreements**: Branch naming, PR expectations, commit style, documentation update rules
- **Security & Data Handling**: No secrets policy, secret scanning procedures
- **Appendix**: Links to all 8 canonical docs, archive directory, external resources

### 2. Updated `docs/README.md`

Added "New Contributors / Contractors" section with link to the onboarding doc, positioned before the "Quick Start Guide" section. Clarified that the onboarding doc is a navigation aid, not part of the 8 canonical docs.

## Key Features

✅ **All terminal commands are PowerShell** (no bash)  
✅ **No secrets or credentials** (placeholders only)  
✅ **Links to canonical docs** (no duplication of content)  
✅ **All file paths verified** to exist in repository  
✅ **Feature status table** with actual implementation status based on code inspection  
✅ **Security follow-up section** for reporting discovered secrets  
✅ **8 canonical docs unchanged** (onboarding is a navigation aid)

## Verification Checklist

- [x] All file paths mentioned in the document exist
- [x] All PowerShell commands have valid syntax
- [x] No secrets or credentials included
- [x] Links to canonical docs are accurate
- [x] Feature status table reflects actual codebase
- [x] "8 canonical docs" claim in README.md unchanged

---

## Day-0 Checklist for Project Owner

Before handing this to the contractor, complete the following:

### ☐ GitHub Access
- [ ] Grant contractor read/write access to repository: https://github.com/gcolon75/Project-Valine
- [ ] Add contractor to appropriate team (if using GitHub Teams)
- [ ] Verify contractor has 2FA enabled on their GitHub account
- [ ] Share branch workflow expectations (create feature branches, PR against main)

### ☐ Environment Variable Values (Secure Channel Required)

**⚠️ CRITICAL: Share these via encrypted channel only (1Password, AWS Secrets Manager, encrypted email)**

**Frontend (.env):**
```powershell
VITE_API_BASE=https://wkndtj22ab.execute-api.us-west-2.amazonaws.com
VITE_ALLOWED_USER_EMAILS=<comma-separated-list-of-allowed-emails>
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_2FA=true
```

**Backend (serverless/.env):**
```powershell
DATABASE_URL=postgresql://USERNAME:PASSWORD@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require
JWT_SECRET=<32-character-secret>
JWT_REFRESH_SECRET=<32-character-secret>
FRONTEND_URL=https://dkmxy676d3vgc.cloudfront.net
ALLOWED_USER_EMAILS=<same-as-frontend>
MEDIA_BUCKET_NAME=valine-media-uploads
```

**Note:** Environment variable NAMES are in the onboarding doc. VALUES should NEVER be in git or docs.

### ☐ AWS Access

**IAM User or Role for Contractor:**
- [ ] Create IAM user with programmatic access (Access Key ID + Secret Access Key)
- [ ] Attach policies (minimum required):
  - `CloudWatchLogsReadOnlyAccess` - View Lambda logs
  - `AWSLambda_ReadOnlyAccess` - View Lambda functions (or `AWSLambda_FullAccess` if deploying)
  - `AmazonS3FullAccess` - Upload to frontend bucket and media bucket
  - `CloudFrontFullAccess` - Create cache invalidations
  - `IAMReadOnlyAccess` - View roles and policies
- [ ] Optional: Grant deploy permissions if contractor will deploy:
  - `CloudFormationFullAccess`
  - `AWSLambda_FullAccess`
  - `AmazonAPIGatewayAdministrator`
- [ ] Share AWS credentials via secure channel (1Password, AWS Secrets Manager)
- [ ] Set up AWS CLI profile: `aws configure --profile valine-contractor`

**Minimum Scope (Read-Only for Debugging):**
- CloudWatch Logs: Read Lambda execution logs
- S3: List/read `valine-frontend-prod` and `valine-media-uploads` buckets
- Lambda: Describe functions, view configuration
- API Gateway: View endpoints and stages

**Full Scope (If Contractor Will Deploy):**
- All of the above, plus:
- Lambda: Create, update, delete functions
- S3: Upload to `valine-frontend-prod` and `valine-media-uploads`
- CloudFront: Create cache invalidations
- CloudFormation: Create, update, delete stacks

### ☐ Staging/Test Access

- [ ] **Staging URL:** Provide staging environment URL (if different from production)
- [ ] **Test Account:** Create test account with credentials:
  - Email: `contractor-test@example.com` (or similar)
  - Password: (share securely)
- [ ] **Email Allowlist:** Add contractor's test email to `ALLOWED_USER_EMAILS` environment variable
- [ ] **Staging Database:** If contractor needs direct database access, provide connection string (securely)

### ☐ Communication Channels

- [ ] Add contractor to Slack/Discord channel (if applicable)
- [ ] Share on-call schedule (if contractor is expected to be on-call)
- [ ] Provide emergency contact information
- [ ] Set up regular check-in meetings (daily standups or weekly syncs)

### ☐ Contract Deliverables & Milestones

**Define expected deliverables and acceptance criteria:**

#### Milestone 1: Profile Edit Fixes (Week 1)
- [ ] **Deliverable:** Fix avatar/banner upload
  - **Acceptance Test:** User can upload avatar, changes persist, old images replaced
- [ ] **Deliverable:** Fix profile form validation errors
  - **Acceptance Test:** Invalid inputs show appropriate error messages
- [ ] **Deliverable:** Add profile links (social media) UI
  - **Acceptance Test:** User can add/edit/delete profile links (Twitter, LinkedIn, etc.)

#### Milestone 2: Social Features (Week 2)
- [ ] **Deliverable:** Follow/unfollow UI
  - **Acceptance Test:** User can send connection request, accept/reject requests, see connections list
- [ ] **Deliverable:** Connection notifications
  - **Acceptance Test:** User receives notification when someone follows them or accepts their request

#### Milestone 3: Notifications System (Week 3)
- [ ] **Deliverable:** Notification bell with badge
  - **Acceptance Test:** Unread count displays, updates in real-time (polling)
- [ ] **Deliverable:** Notification list page
  - **Acceptance Test:** User can view all notifications, mark as read, delete
- [ ] **Deliverable:** Notification triggers for likes/comments/follows
  - **Acceptance Test:** User receives notifications for relevant actions

#### Milestone 4: Password Reset (Week 4)
- [ ] **Deliverable:** Forgot password page
  - **Acceptance Test:** User can request password reset, receives email with token
- [ ] **Deliverable:** Reset password page
  - **Acceptance Test:** User can set new password using token, redirected to login
- [ ] **Deliverable:** Token expiry and validation
  - **Acceptance Test:** Expired/invalid tokens show appropriate error messages

#### Milestone 5: Post Interactions (Week 5)
- [ ] **Deliverable:** Post sharing feature
  - **Acceptance Test:** User can share posts, share count displays, shared posts appear in feed
- [ ] **Deliverable:** Verify liking/commenting UI
  - **Acceptance Test:** User can like/unlike, comment, edit/delete own comments

### ☐ Success Criteria

**Definition of "Done" for Contractor Engagement:**
- [ ] All features listed in Feature Implementation Guide are complete (✅ status)
- [ ] All acceptance tests pass in staging environment
- [ ] Code reviews completed and approved
- [ ] No critical or high-priority bugs remaining
- [ ] All new features have frontend + backend tests
- [ ] Documentation updated (canonical docs) for new features
- [ ] Deployment to production successful with no rollbacks

### ☐ Offboarding Plan

**When contractor completes work:**
- [ ] Revoke AWS access (delete IAM user or deactivate credentials)
- [ ] Revoke GitHub repository access
- [ ] Delete or disable test accounts
- [ ] Knowledge transfer session (record video or document handoff notes)
- [ ] Final code review and merge of outstanding PRs

---

## Testing Performed

- [x] Verified all file paths exist in repository
- [x] Verified PowerShell command syntax
- [x] Scanned for secrets (none found)
- [x] Verified links to canonical docs are accurate
- [x] Inspected codebase to determine feature implementation status

## Related Issues

None (this is a documentation addition)

## Screenshots

N/A (documentation only)

---

**Ready for review!** ��
