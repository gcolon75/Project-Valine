# Future Work & Enhancements

> **Purpose:** This document tracks planned enhancements and future epics for Project Valine.
> 
> **Status:** Living document - updated as priorities evolve
> 
> **Last Updated:** November 2024

---

## High Priority

### 1. OAuth Social Login Integration

**Epic:** Add social authentication providers (Google, GitHub, LinkedIn)

**Why:** Reduces friction in signup/login flow, improves conversion rates

**Scope:**
- Google OAuth 2.0 integration
- GitHub OAuth integration
- LinkedIn OAuth (for professional networking)
- Link/unlink social accounts
- Merge accounts with same email

**Technical Requirements:**
- OAuth 2.0 implementation in serverless backend
- Store OAuth tokens securely (encrypted)
- Handle OAuth callback endpoints
- Update Prisma schema with OAuth provider fields
- Frontend: Social login buttons
- Handle OAuth errors and edge cases

**Estimated Effort:** 2-3 weeks

**Dependencies:**
- Google Cloud Platform OAuth app setup
- GitHub OAuth app registration
- LinkedIn Developer account

**References:**
- [OAuth 2.0 Specification](https://oauth.net/2/)
- [Passport.js](http://www.passportjs.org/) (reference, but use native implementation)
- [AWS Cognito OAuth](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-social-idp.html) (alternative approach)

**Security Considerations:**
- Validate OAuth state parameter (CSRF protection)
- Secure storage of OAuth refresh tokens
- Handle token expiration and refresh
- Privacy: Ask user permission before fetching OAuth data

**Acceptance Criteria:**
- [ ] User can sign up with Google/GitHub/LinkedIn
- [ ] User can link existing account to social provider
- [ ] User can unlink social provider
- [ ] Handle email conflicts gracefully
- [ ] OAuth tokens stored securely and refreshed
- [ ] Audit logging for OAuth events

---

### 2. Two-Factor Authentication (2FA) UI

**Epic:** Complete 2FA implementation with frontend UI

**Why:** Enhanced account security for users, industry standard for professional platforms

**Scope:**
- Backend: TOTP generation and verification (planned, not implemented)
- QR code generation for authenticator apps
- Recovery code generation and storage
- 2FA enrollment flow UI
- 2FA verification during login UI
- Recovery code usage flow
- 2FA settings management page

**Technical Requirements:**
- Backend endpoints (not yet implemented):
  - `POST /auth/2fa/enroll` - Start enrollment, return QR code
  - `POST /auth/2fa/verify-enrollment` - Complete enrollment with code
  - `POST /auth/2fa/disable` - Disable 2FA
  - `POST /auth/2fa/regenerate-recovery-codes` - Generate new codes
- Frontend components:
  - QR code display component
  - TOTP code input (6-digit)
  - Recovery code display and download
  - 2FA settings toggle
- Database: Store encrypted TOTP secrets and recovery codes
- Use industry-standard libraries:
  - Backend: `otplib` or `speakeasy` for TOTP
  - Frontend: `qrcode.react` for QR display

**User Flow:**
1. User enables 2FA in settings
2. System generates TOTP secret and QR code
3. User scans QR with authenticator app (Google Authenticator, Authy, 1Password)
4. User enters 6-digit code to verify setup
5. System shows recovery codes (user must save)
6. Future logins require TOTP code

**Estimated Effort:** 3-4 weeks

**Dependencies:**
- TOTP library selection and security review
- Database schema updates (User.twoFactorSecret, TwoFactorRecoveryCode table)
- Encryption key management for TOTP secrets

**Security Considerations:**
- Encrypt TOTP secrets at rest (use TOTP_ENCRYPTION_KEY env var)
- Recovery codes: 8 codes, single-use, bcrypt hashed
- Rate limit TOTP verification attempts (5 per 15 min)
- Audit log all 2FA events (enable, disable, verify success/fail)
- Time-based code validation (30-second window, ±1 window tolerance)

**Acceptance Criteria:**
- [ ] User can enable 2FA with QR code
- [ ] User can verify 2FA enrollment with code
- [ ] User must enter TOTP code during login
- [ ] User can use recovery code if TOTP unavailable
- [ ] User can disable 2FA (requires password + current code)
- [ ] User can regenerate recovery codes
- [ ] TOTP secrets stored encrypted
- [ ] Rate limiting prevents brute force

**References:**
- [TOTP RFC 6238](https://tools.ietf.org/html/rfc6238)
- [Google Authenticator](https://github.com/google/google-authenticator)
- [Authy](https://authy.com/)

---

### 3. Password Reset Flow

**Epic:** Implement forgot password / password reset functionality

**Why:** Essential user experience feature, reduces support burden

**Scope:**
- "Forgot Password" link on login page
- Email with time-bound reset link (1-hour expiry)
- Password reset form with validation
- Session invalidation after reset
- Audit logging

**Technical Requirements:**
- Backend endpoints:
  - `POST /auth/request-password-reset` - Send reset email
  - `POST /auth/reset-password` - Complete reset with token
- Database: PasswordResetToken table (token, userId, expiresAt)
- Email template for password reset
- Frontend: Forgot password page + reset password page
- Token generation: crypto.randomBytes(32)
- Password validation (enforce minimum 12 chars in reset flow)

**User Flow:**
1. User clicks "Forgot Password" on login
2. User enters email address
3. System sends reset email (always shows success to prevent enumeration)
4. User clicks link in email (format: /reset-password?token=...)
5. User enters new password (with confirmation)
6. System validates token, updates password, invalidates sessions
7. User redirected to login

**Estimated Effort:** 1-2 weeks

**Security Considerations:**
- Always return success (prevent user enumeration)
- Rate limit: 3 requests per hour per IP
- Token expires in 1 hour
- Single-use tokens (delete after use or expiry)
- Invalidate all sessions on password reset
- Require strong password (12+ chars, complexity)
- Audit log password reset attempts

**Acceptance Criteria:**
- [ ] User can request password reset by email
- [ ] User receives email with reset link
- [ ] Reset link expires in 1 hour
- [ ] User can set new password with token
- [ ] Old password no longer works
- [ ] All sessions invalidated
- [ ] Audit log tracks reset events

---

## Medium Priority

### 4. Distributed Rate Limiting with Redis

**Epic:** Implement distributed rate limiting using Redis/ElastiCache

**Why:** Current serverless backend has no rate limiting; vulnerable to abuse and DDoS

**Scope:**
- AWS ElastiCache (Redis) setup
- Rate limiting middleware for auth endpoints
- Configurable rate limits per endpoint
- IP-based and user-based tracking
- Exponential backoff for repeated violations
- Admin endpoint to view/clear rate limits

**Technical Requirements:**
- AWS ElastiCache Redis cluster (production)
- Local Redis for development
- Rate limiting library: `rate-limiter-flexible` or custom implementation
- Environment variables: REDIS_URL, RATE_LIMIT_ENABLED
- Track by IP address and user ID (authenticated requests)
- Sliding window algorithm (more accurate than fixed window)

**Rate Limit Recommendations:**
- `POST /auth/register` - 3 per hour per IP
- `POST /auth/login` - 10 per hour per IP, 5 per 15 min per account (after email identified)
- `POST /auth/resend-verification` - 3 per hour per user
- `POST /auth/request-password-reset` - 3 per hour per IP
- `POST /auth/2fa/verify` - 5 per 15 min per account
- General API: 100 requests per 15 min per user

**Estimated Effort:** 2-3 weeks

**Dependencies:**
- AWS ElastiCache setup and security group configuration
- VPC configuration for Lambda to access ElastiCache
- Redis client library (ioredis)

**Acceptance Criteria:**
- [ ] Rate limits enforced on all auth endpoints
- [ ] Proper 429 responses with Retry-After header
- [ ] IP-based and user-based tracking
- [ ] Redis connection pooling and error handling
- [ ] Graceful degradation if Redis unavailable
- [ ] Admin can view current rate limit status
- [ ] CloudWatch metrics for rate limit hits

**Cost Considerations:**
- ElastiCache t3.micro: ~$12-15/month
- VPC NAT gateway for Lambda: ~$32/month (if needed)
- Alternative: Use DynamoDB for rate limiting (serverless, but slower)

---

### 5. Email Service Integration (SMTP/SES)

**Epic:** Implement production email sending with Amazon SES

**Why:** Current implementation only logs emails to console; production needs real emails

**Scope:**
- Amazon SES setup and domain verification
- Email templates (HTML + plain text)
- Email sending abstraction layer
- Template system for verification, password reset, notifications
- Bounce and complaint handling
- Email preferences (unsubscribe links)

**Technical Requirements:**
- AWS SES setup and domain verification (DNS records)
- Email library: `nodemailer` with SES transport
- HTML email templates with responsive design
- Plain text fallbacks for all emails
- Environment variable: EMAIL_ENABLED=true, SES_REGION, FROM_EMAIL
- Unsubscribe links and preference management
- Handle SES bounces and complaints (SNS → Lambda)

**Email Types:**
1. Email Verification (implemented, needs templating)
2. Password Reset (not yet implemented)
3. Reel Request Notification
4. Reel Request Approved/Denied
5. Welcome Email
6. Account Deletion Confirmation

**Estimated Effort:** 2 weeks

**Dependencies:**
- Domain ownership for SES verification
- DNS access to add verification records
- SES sandbox exit request (for production)

**Acceptance Criteria:**
- [ ] SES domain verified and out of sandbox
- [ ] All email types have HTML + plain text templates
- [ ] Emails sent successfully in production
- [ ] Bounce and complaint handling implemented
- [ ] Unsubscribe links work
- [ ] Email preferences stored in UserSettings
- [ ] CloudWatch logs for email events

**Cost Considerations:**
- SES: $0.10 per 1,000 emails
- First 62,000 emails/month free (if from EC2/Lambda)

---

### 6. Media Processing Pipeline

**Epic:** Implement video transcoding and thumbnail generation

**Why:** Videos uploaded by users need to be optimized for web playback

**Scope:**
- Video transcoding to web formats (H.264, WebM)
- Thumbnail/poster generation from video
- Multiple quality levels (360p, 720p, 1080p)
- Progress tracking and status updates
- S3 lifecycle policies for originals

**Technical Requirements:**
- AWS MediaConvert or AWS Elemental MediaLive
- S3 event notification → Lambda → MediaConvert job
- Update Media.status field (processing, completed, failed)
- Store multiple URLs (original, 360p, 720p, 1080p, poster)
- CloudWatch events for job completion
- Frontend: Show processing status, play when ready

**User Flow:**
1. User uploads video via presigned URL
2. S3 triggers Lambda on ObjectCreated event
3. Lambda creates MediaConvert job
4. MediaConvert transcodes video to multiple formats
5. Outputs saved to S3 (different folder)
6. Lambda updates Media record with new URLs and status
7. Frontend polls or uses WebSocket for status updates

**Estimated Effort:** 3-4 weeks

**Dependencies:**
- AWS MediaConvert setup and IAM permissions
- S3 bucket structure for outputs
- Database schema updates (Media.videoUrls JSON field)

**Acceptance Criteria:**
- [ ] Videos transcoded to H.264 (MP4) for broad compatibility
- [ ] Multiple quality levels generated
- [ ] Poster frame extracted at 2-second mark
- [ ] Media.status updated correctly
- [ ] Failed jobs handled gracefully
- [ ] User can see processing progress
- [ ] Original video retained or deleted per policy

**Cost Considerations:**
- MediaConvert: ~$0.015 per minute of video
- Example: 5-minute video = $0.075
- S3 storage for multiple versions

---

## Low Priority / Nice to Have

### 7. Analytics & Insights Dashboard

**Epic:** User analytics for profile views, reel requests, engagement

**Why:** Users want to know who's viewing their work

**Scope:**
- Track profile views (anonymized)
- Track reel requests by time period
- Track media views
- User dashboard with charts
- Admin analytics for platform health

**Estimated Effort:** 3-4 weeks

---

### 8. Real-Time Notifications

**Epic:** WebSocket-based real-time notifications

**Why:** Improve user experience with instant updates

**Scope:**
- WebSocket API (AWS API Gateway WebSocket)
- Real-time reel request notifications
- Real-time messages
- Connection management
- Presence indicators

**Estimated Effort:** 4-5 weeks

---

### 9. Advanced Search with Elasticsearch

**Epic:** Implement full-text search with Elasticsearch

**Why:** Current PostgreSQL search is limited; doesn't support fuzzy matching, relevance ranking

**Scope:**
- AWS Elasticsearch Service setup
- Index profiles, users, media
- Search with filters, facets, relevance scoring
- Autocomplete suggestions
- Search analytics

**Estimated Effort:** 3-4 weeks

---

### 10. Mobile App (React Native)

**Epic:** Native mobile apps for iOS and Android

**Why:** Better mobile UX, push notifications, offline support

**Scope:**
- React Native app setup
- Share code with web (API client, business logic)
- Platform-specific UI components
- Push notifications (FCM, APNs)
- App store deployment

**Estimated Effort:** 8-12 weeks (ongoing)

---

## Technical Debt & Infrastructure

### 11. Comprehensive Test Suite

**Epic:** Increase test coverage for serverless backend

**Scope:**
- Unit tests for all handlers
- Integration tests for API flows
- E2E tests with Playwright
- Contract tests for API
- Target: 80% code coverage

**Estimated Effort:** 4-6 weeks (ongoing)

---

### 12. CI/CD Pipeline Improvements

**Epic:** Automate deployment and testing

**Scope:**
- GitHub Actions for serverless deploy
- Automated E2E tests on PR
- Database migration automation
- Staging environment automation
- Rollback procedures

**Estimated Effort:** 2-3 weeks

---

### 13. Monitoring & Alerting

**Epic:** Production monitoring with CloudWatch and alerts

**Scope:**
- CloudWatch dashboards for Lambda metrics
- Alarms for errors, latency, throttling
- X-Ray tracing for request analysis
- Cost monitoring and budgets
- PagerDuty or similar for on-call

**Estimated Effort:** 1-2 weeks

---

### 14. API Documentation with OpenAPI

**Epic:** Generate interactive API docs from OpenAPI spec

**Scope:**
- OpenAPI 3.0 specification for all endpoints
- Swagger UI or Redoc for interactive docs
- Auto-generate from code (annotations)
- Example requests/responses
- Versioning strategy

**Estimated Effort:** 2-3 weeks

---

## How to Use This Document

**For Product Owners:**
- Review and prioritize epics based on business goals
- Move items between priority levels as needed
- Add new epics to "Low Priority" section

**For Developers:**
- Use this as reference when planning sprints
- Update estimates as work progresses
- Link GitHub issues to specific epics

**For Documentation Agent:**
- Create detailed specs for each epic when prioritized
- Update this document as epics are completed
- Archive completed epics in historical docs

---

## Completed Epics

Completed work will be moved here with completion date:

- **✅ Email Verification** - Completed Nov 2024
- **✅ JWT Authentication** - Completed Nov 2024
- **✅ Profile Management** - Completed Nov 2024
- **✅ Media Upload (S3 Presigned URLs)** - Completed Nov 2024
- **✅ Privacy Controls (Export/Delete)** - Completed Nov 2024
- **✅ Search & Discovery** - Completed Nov 2024
- **✅ Reel Request Workflow** - Completed Nov 2024

---

## Related Documentation

- [Serverless Deployment Guide](./serverless-guide.md)
- [Security Implementation](../security/implementation.md)
- [Backend API Reference](../backend/profile-implementation.md)
- [Canonical Backend Decision](../backend/canonical-backend.md)

---

**Questions or Suggestions?**

Open an issue with label `epic-proposal` to suggest new work or discuss priorities.
