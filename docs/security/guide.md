# Project Valine Security Guide

> **📌 Backend Note:** All security features documented here are implemented in the **Serverless backend** (`/serverless`), which is the canonical production API. See [Canonical Backend Decision](../backend/canonical-backend.md).

## Overview

This guide covers the comprehensive security features implemented in Project Valine, including authentication, authorization, data protection, and privacy controls.

## Table of Contents

- [Features Overview](#features-overview)
- [Authentication](#authentication)
- [Two-Factor Authentication (2FA)](#two-factor-authentication-2fa)
- [Password Security](#password-security)
- [Email Verification](#email-verification)
- [Session Management](#session-management)
- [CSRF Protection](#csrf-protection)
- [Rate Limiting](#rate-limiting)
- [Security Headers](#security-headers)
- [Audit Logging](#audit-logging)
- [Privacy Features](#privacy-features)
- [Configuration](#configuration)
- [Migration Guide](#migration-guide)
- [Threat Model](#threat-model)
- [Rollback Procedures](#rollback-procedures)

## Features Overview

### Core Security Features

- ✅ **Email Verification**: Signup with email verification tokens
- ✅ **Password Reset**: Time-bound password reset with secure tokens
- ✅ **Secure Sessions**: JWT-based authentication with optional session tracking
- ✅ **CSRF Protection**: Anti-CSRF tokens for cookie-based auth
- ✅ **Brute-Force Protection**: Rate limiting for auth endpoints (IP + account-based)
- ✅ **2FA (TOTP)**: Two-factor authentication with recovery codes (feature flag)
- ✅ **Security Headers**: CSP, HSTS, X-Frame-Options, and more
- ✅ **Audit Logging**: Track all security-sensitive actions
- ✅ **Privacy Controls**: Data export and account deletion

### Security Posture

- **Defense in Depth**: Multiple layers of security controls
- **Principle of Least Privilege**: Features disabled by default
- **Secure by Design**: Security built into core architecture
- **Compliance Ready**: GDPR-compliant data handling

## Authentication

### Serverless Backend Implementation

Project Valine uses a **serverless architecture** for authentication, deployed on AWS Lambda with API Gateway. The implementation is in `/serverless/src/handlers/auth.js`.

**Key Technologies:**
- **bcrypt** - Password hashing (10 rounds)
- **jsonwebtoken** - JWT token generation and validation
- **PostgreSQL** - User data and verification tokens
- **Email verification** - Crypto-based tokens with 24-hour expiry

**Security Features:**
- Passwords hashed with bcrypt before storage (never stored in plaintext)
- JWT tokens signed with HS256 algorithm
- Email verification tokens use crypto.randomBytes (32 bytes)
- Protection against timing attacks (bcrypt.compare)
- XSS prevention through JWT-only auth (no session cookies)

### Registration

**Endpoint**: `POST /auth/register`

```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "SecurePassword123!",
  "displayName": "User Name"
}
```

**Features**:
- Password hashing with bcrypt (10 rounds)
- Automatic email verification token generation (24-hour expiry)
- Email format validation (RFC-compliant regex)
- Password minimum length: 6 characters
- Duplicate email/username detection
- Returns JWT for immediate limited access
- Default avatar generation (Dicebear API)

**Validation:**
- Email must be valid format (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
- Password must be at least 6 characters
- Username and displayName are required
- Email is normalized (lowercase, trimmed)

**Response (201 Created):**
```json
{
  "user": {
    "id": "cm123abc",
    "username": "testuser",
    "email": "test@example.com",
    "displayName": "Test User",
    "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=testuser",
    "emailVerified": false,
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Registration successful. Please check your email to verify your account."
}
```

**Error Responses:**
- **400** - Missing required fields or validation failure
- **409** - User with email or username already exists
- **500** - Server error

### Login

**Endpoint**: `POST /auth/login`

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Features**:
- Email-based authentication
- bcrypt password comparison (constant-time)
- Supports login with unverified email (status included in response)
- JWT token generation (7-day expiry)
- Password never returned in response
- Audit logging (console logs for dev)

**Response (200 OK):**
```json
{
  "user": {
    "id": "cm123abc",
    "username": "testuser",
    "email": "test@example.com",
    "displayName": "Test User",
    "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=testuser",
    "role": "USER",
    "emailVerified": false,
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- **400** - Missing email or password
- **401** - Invalid email or password
- **500** - Server error

**Note:** Login currently allows access with unverified email. To enforce verification, add middleware check on protected routes.

### Get Current User

**Endpoint**: `GET /auth/me`

**Headers**: `Authorization: Bearer <token>`

**Features**:
- JWT token verification
- Returns user profile with aggregated counts
- Does not expose password or sensitive fields
- Includes post/reel/request statistics

**Response (200 OK):**
```json
{
  "user": {
    "id": "cm123abc",
    "username": "testuser",
    "email": "test@example.com",
    "displayName": "Test User",
    "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=testuser",
    "bio": null,
    "role": "USER",
    "emailVerified": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "_count": {
      "posts": 0,
      "reels": 0,
      "sentRequests": 0,
      "receivedRequests": 0
    }
  }
}
```

**Error Responses:**
- **401** - Unauthorized (no token or invalid token)
- **404** - User not found
- **500** - Server error

## Two-Factor Authentication (2FA)

### Enrollment

**1. Start Enrollment**

**Endpoint**: `POST /api/2fa/enroll`

Returns QR code and secret for authenticator app setup.

**2. Verify and Complete**

**Endpoint**: `POST /api/2fa/verify-enrollment`

```json
{
  "code": "123456"
}
```

Returns recovery codes (save these securely!).

### Managing 2FA

**Disable 2FA**

**Endpoint**: `POST /api/2fa/disable`

```json
{
  "password": "your-password",
  "code": "123456" // Optional
}
```

**Regenerate Recovery Codes**

**Endpoint**: `POST /api/2fa/regenerate-recovery-codes`

```json
{
  "password": "your-password"
}
```

**Check Status**

**Endpoint**: `GET /api/2fa/status`

### Recovery Codes

- 8 recovery codes generated on enrollment
- Each code can be used once
- Format: `XXXX-XXXX-XXXX`
- Store securely offline
- Regenerate if compromised

## Password Security

### Serverless Backend Implementation

Password security in the serverless backend uses industry-standard bcrypt hashing with proper salt rounds and protection against timing attacks.

**Implementation Details:**
- **Library:** bcryptjs (JavaScript implementation of bcrypt)
- **Salt Rounds:** 10 (provides strong security with acceptable performance)
- **Hashing:** `bcrypt.hash(password, 10)` - automatic salt generation
- **Comparison:** `bcrypt.compare(password, hash)` - constant-time comparison
- **Storage:** Only hashed password stored in database (never plaintext)

**Security Features:**
- Protection against rainbow table attacks (per-password salt)
- Protection against timing attacks (constant-time comparison)
- Adaptive hashing (can increase rounds as hardware improves)
- No password in logs or error messages

**Code Reference:** `/serverless/src/handlers/auth.js`

### Current Password Requirements

- **Minimum length:** 6 characters (enforced in registration)
- **Validation:** Basic length check only
- **Future Enhancements:** Consider adding complexity requirements (uppercase, lowercase, numbers, special characters)

**Recommendation for Production:**
- Minimum 12 characters
- At least one uppercase, one lowercase, one number
- Optional: Special character requirement
- Password strength meter in frontend

### Password Reset Flow

**Note:** Password reset functionality is not yet implemented in the serverless backend. Current implementation only includes registration, login, and email verification.

**Planned Implementation:**

**1. Request Reset**

**Endpoint**: `POST /auth/request-password-reset` (not yet implemented)

```json
{
  "email": "user@example.com"
}
```

- Should always return success (prevents user enumeration)
- Token expires in 1 hour
- Rate limited: 3 requests per hour

**2. Complete Reset**

**Endpoint**: `POST /auth/reset-password` (not yet implemented)

```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePassword123!"
}
```

- Should invalidate all existing sessions
- Mark token as used
- Log audit event
- Rehash password with bcrypt

**Implementation Priority:** Medium - add after 2FA and profile link validation are complete.

## Email Verification

### Serverless Implementation

Email verification is implemented in the serverless backend with crypto-based tokens and PostgreSQL storage.

**Database Schema:**
- Table: `EmailVerificationToken`
- Fields: `id`, `userId`, `token`, `expiresAt`, `createdAt`
- Token: 32-byte random hex string
- Expiry: 24 hours from creation

**Implementation Details:**
- Token generation: `crypto.randomBytes(32).toString('hex')`
- Tokens are single-use (deleted after verification)
- Expired tokens are automatically rejected and cleaned up
- Email sending: Console logs (dev) or SMTP (production with EMAIL_ENABLED=true)

### Verification Flow

**1. Automatic on Registration**

- Token generated with 24-hour expiration
- Verification email sent automatically (logged to console in dev)
- User receives JWT and can login with limited access
- Frontend should check `emailVerified` status

**2. Verify Email**

**Endpoint**: `POST /auth/verify-email`

```json
{
  "token": "abc123def456..."
}
```

**Response (200 OK):**
```json
{
  "message": "Email verified successfully",
  "verified": true
}
```

**3. Resend Verification**

**Endpoint**: `POST /auth/resend-verification`

**Headers**: `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "message": "Verification email sent successfully. Please check your email.",
  "email": "test@example.com"
}
```

**Rate Limiting Recommendation:** Add rate limiting to prevent abuse (suggested: 3 requests per hour per user)

### Email Configuration

**Development Mode (EMAIL_ENABLED=false or undefined):**
- Verification emails logged to console
- Includes full email content and verification URL

**Production Mode (EMAIL_ENABLED=true):**
- Emails sent via SMTP (implementation required)
- FRONTEND_URL environment variable used for verification links

### Unverified User Restrictions

Currently, users can login with unverified email. To restrict access, add middleware checks to protected routes:

```javascript
// Add middleware to protected routes in auth handler
export const requireEmailVerification = async (event) => {
  const userId = getUserFromEvent(event);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user.emailVerified) {
    return error('Email verification required', 403);
  }
};
```

**Recommended Approach:** Allow login but show banner prompting verification, with some features requiring verification.

## Session Management

### JWT-Based Sessions

**Default Configuration**:
- JWT expiration: 7 days
- No server-side tracking (stateless)
- Token in `Authorization: Bearer <token>` header

### Database Session Tracking

**Enable**: Set `USE_SESSION_TRACKING=true`

**Features**:
- Session table with IP and user agent
- Last activity tracking
- Manual session revocation
- Automatic cleanup on password reset

**Endpoints**:

- `GET /api/privacy/sessions` - List active sessions
- `DELETE /api/privacy/sessions/:sessionId` - Revoke session

### Session Security

- Rotate sessions on sensitive changes
- Invalidate on logout
- Expire after inactivity
- Track IP and user agent

## CSRF Protection

### Overview

CSRF protection defends against cross-site request forgery attacks when using cookie-based authentication.

### Configuration

**Enable**: Set `CSRF_ENABLED=true`

**How It Works**:
1. Server generates CSRF token on safe requests (GET)
2. Token stored in cookie (readable by client)
3. Client includes token in header for mutating requests
4. Server validates token matches

### Implementation

**Client Side**:
```javascript
// Get CSRF token from cookie
const csrfToken = document.cookie
  .split('; ')
  .find(row => row.startsWith('csrf-token='))
  ?.split('=')[1]

// Include in request headers
fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
})
```

**Server Side**:
```javascript
import { verifyCSRFToken } from './middleware/csrf.js'

router.post('/api/endpoint', verifyCSRFToken, handler)
```

## Rate Limiting

### Authentication Rate Limits

**Login**:
- 5 attempts per 15 minutes per IP
- 5 attempts per 15 minutes per email
- 15-minute block after exceeding limit

**Registration**:
- 3 attempts per hour per IP
- Prevents automated account creation

**Password Reset**:
- 3 requests per hour per IP
- Prevents email flooding

### Rate Limit Responses

**Status Code**: `429 Too Many Requests`

**Response**:
```json
{
  "error": "AUTH_RATE_LIMIT_EXCEEDED",
  "message": "Too many authentication attempts. Please try again later.",
  "retryAfter": 900,
  "resetTime": "2024-11-05T23:30:00.000Z"
}
```

**Headers**:
- `Retry-After`: Seconds until retry allowed

### Custom Rate Limits

```javascript
import { rateLimitMiddleware } from './middleware/rateLimit.js'

router.post('/api/endpoint', 
  rateLimitMiddleware({ 
    windowMs: 60000, 
    maxRequests: 10 
  }),
  handler
)
```

## Security Headers

### Headers Applied

**Content Security Policy (CSP)**:
- Default: Report-only mode
- Prevents XSS attacks
- Configurable via `CSP_REPORT_ONLY` and `API_DOMAINS`

**HTTP Strict Transport Security (HSTS)**:
- Max age: 1 year
- Include subdomains
- Preload ready

**X-Frame-Options**:
- Value: `DENY`
- Prevents clickjacking

**X-Content-Type-Options**:
- Value: `nosniff`
- Prevents MIME sniffing

**Referrer-Policy**:
- Value: `strict-origin-when-cross-origin`
- Privacy-preserving referrer

**Permissions-Policy**:
- Restricts: geolocation, microphone, camera, payment

### Configuration

Edit `server/src/middleware/security.js` to customize.

**CSP Configuration**:
```javascript
// Add allowed domains
API_DOMAINS=https://api.example.com,https://cdn.example.com

// Enable enforcement
CSP_REPORT_ONLY=false

// Add report endpoint
CSP_REPORT_URI=https://csp-reports.example.com
```

## Audit Logging

### What's Logged

**Authentication**:
- Login attempts (success/failure)
- Logout
- Password changes
- Password resets
- Email verification

**2FA**:
- Enrollment/unenrollment
- Recovery code usage

**Profile**:
- Profile updates
- Email changes

**Privacy**:
- Data exports
- Account deletions

### Log Structure

```json
{
  "id": "log-id",
  "userId": "user-id",
  "action": "auth.login",
  "resource": "user",
  "resourceId": "user-id",
  "changes": {
    "method": "POST",
    "body": { "email": "user@example.com" }
  },
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "metadata": {
    "sessionId": "session-id"
  },
  "createdAt": "2024-11-05T23:00:00.000Z"
}
```

### Accessing Audit Logs

**Endpoint**: `GET /api/privacy/audit-log`

**Query Parameters**:
- `limit`: Max logs to return (default: 50)
- `offset`: Pagination offset
- `action`: Filter by action type

**Example**:
```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Get -Headers @{
    "Authorization" = "Bearer <token>"
}```

### Retention Policy

- Default: 90 days
- Configurable: `AUDIT_LOG_RETENTION_DAYS`
- Automatic cleanup via cron job (implement separately)

### Privacy Considerations

- User agents stored for security
- IP addresses for fraud detection
- Sensitive data (passwords) never logged
- Users can view their own logs

## Input Validation & XSS Prevention

### Profile Link Validation

The serverless backend implements strict validation for user profile links to prevent XSS attacks and ensure data quality.

**Validation Rules (from `/serverless/src/handlers/profiles.js`):**

1. **URL Format:** Must be valid HTTP/HTTPS URLs
2. **Allowed Platforms:** Whitelist of approved social platforms
3. **Maximum Links:** Limited to prevent abuse
4. **Sanitization:** All URLs validated before storage

**Supported Platforms:**
- Instagram, Twitter/X, LinkedIn, Facebook
- YouTube, TikTok, Vimeo
- IMDb, Casting Networks, Actors Access
- Personal website

**Example Validation:**
```javascript
const validPlatforms = [
  'instagram', 'twitter', 'linkedin', 'facebook',
  'youtube', 'tiktok', 'vimeo', 'imdb',
  'castingnetworks', 'actorsaccess', 'website'
];

// Each link validated for:
// - Valid platform key
// - Valid URL format
// - Appropriate URL structure for platform
```

**Security Benefits:**
- Prevents JavaScript injection via malicious URLs
- Protects against phishing links
- Ensures consistent data format
- Limits attack surface

### XSS Prevention Strategy

**Backend (Serverless):**
1. **JWT-Only Authentication:** No session cookies, reduces XSS attack surface
2. **Input Validation:** All user inputs validated before storage
3. **URL Sanitization:** Profile links, media URLs validated
4. **No HTML in API:** All responses are JSON (Content-Type: application/json)
5. **CORS Headers:** Proper origin validation

**Frontend Responsibilities:**
1. React's automatic XSS protection (JSX escaping)
2. DOMPurify for any user-generated HTML (if needed)
3. CSP headers (Content Security Policy)
4. Never use `dangerouslySetInnerHTML` without sanitization

**API Response Headers:**
```javascript
{
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
}
```

### String Length Validation

All text fields have maximum length limits enforced in the backend:

- **Username:** 30 characters
- **Display Name:** 100 characters
- **Bio:** 500 characters
- **Headline:** 200 characters
- **Location fields:** 100 characters each
- **URLs:** 2048 characters (browser standard)

**Benefits:**
- Prevents database overflow
- Limits payload size
- Reduces DoS risk
- Improves UI consistency

## Privacy Features

### Data Export

**Endpoint**: `GET /api/privacy/export`

**Returns**: Complete user data in JSON format

**Includes**:
- Profile information
- Posts and reels
- Comments and likes
- Connections and messages
- Settings and preferences
- Audit log (last 90 days)

**GDPR Compliance**: Fulfills data portability requirements

### Account Deletion

**Immediate Deletion**

**Endpoint**: `POST /api/privacy/delete-account`

```json
{
  "password": "your-password",
  "confirmation": "DELETE"
}
```

- Permanent and immediate
- Cascading deletes all related data
- Audit log entry before deletion

**Deletion Request (with grace period)**

**Endpoint**: `POST /api/privacy/request-deletion`

```json
{
  "password": "your-password"
}
```

- 30-day grace period
- Allows cancellation
- Account marked for deletion
- Email notification sent

### Data Anonymization

For legal/audit requirements:
- Replace PII with anonymized values
- Preserve audit trail integrity
- Mark as deleted but retain structure

## Configuration

### Environment Variables

```powershell
# JWT
JWT_SECRET=<strong-random-string>
JWT_EXPIRES_IN=7d

# Security Features
CSRF_ENABLED=false
USE_SESSION_TRACKING=false
FEATURE_2FA_ENABLED=false
TOTP_ENCRYPTION_KEY=<strong-random-string>

# Email
EMAIL_ENABLED=false
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
FROM_EMAIL=noreply@valine.app
BASE_URL=https://valine.app

# CSP
CSP_REPORT_ONLY=true
API_DOMAINS=https://api.valine.app

# Audit
AUDIT_LOG_RETENTION_DAYS=90
```

### Feature Flags

**Gradual Rollout Strategy**:

1. **Phase 1**: Deploy with all features disabled
2. **Phase 2**: Enable email verification
3. **Phase 3**: Enable rate limiting (already active)
4. **Phase 4**: Enable session tracking
5. **Phase 5**: Enable CSRF for cookie auth
6. **Phase 6**: Enable 2FA (beta users)
7. **Phase 7**: Enforce CSP (report-only → enforce)

## Migration Guide

### Database Migration

**Run Migration**:
```powershell
cd api
npx prisma migrate deploy
```

**What's Created**:
- Email verification tokens table
- Password reset tokens table
- 2FA recovery codes table
- Sessions table
- Audit logs table
- New user fields: `emailVerified`, `twoFactorEnabled`, `twoFactorSecret`

### Backfill Existing Users

**Set existing users as verified**:
```sql
UPDATE users SET "emailVerified" = true WHERE "createdAt" < NOW();
```

**Or require re-verification**:
```sql
-- Keep emailVerified = false for all users
-- They'll need to verify on next login
```

### Application Updates

**Update Dependencies**:
```powershell
cd server
npm install bcryptjs jsonwebtoken otplib qrcode express-rate-limit helmet crypto-js nodemailer
```

**Update Server Code**:
- Import new routes in `src/index.js` (done)
- Apply security middleware (done)
- Configure environment variables

**Test All Endpoints**:
```powershell
cd server
npm test
```

### Frontend Updates

**Add UI for**:
- Email verification prompt
- 2FA enrollment flow
- Password reset flow
- Security settings page
- Privacy controls

## Threat Model

### Threats Mitigated

**Authentication**:
- ✅ Credential stuffing (rate limiting)
- ✅ Brute force attacks (rate limiting + account lockout)
- ✅ Session hijacking (secure JWT, session tracking)
- ✅ Password reuse (bcrypt hashing, reset flow)

**Authorization**:
- ✅ Privilege escalation (role-based access)
- ✅ Email verification bypass (middleware enforcement)

**Injection**:
- ✅ SQL injection (Prisma ORM)
- ✅ XSS (CSP headers, React XSS protection)
- ✅ CSRF (anti-CSRF tokens)

**Data Protection**:
- ✅ Data exfiltration (rate limiting, audit logs)
- ✅ Unauthorized access (authentication, authorization)
- ✅ Man-in-the-middle (HSTS, secure cookies)

**Privacy**:
- ✅ Data retention violations (audit log cleanup)
- ✅ GDPR non-compliance (export, deletion)

### Residual Risks

**Known Limitations**:
- In-memory rate limiting (use Redis in production)
- Email verification not enforced everywhere (add middleware)
- No IP geolocation blocking
- No anomaly detection
- No advanced threat detection

**Recommendations**:
1. Use Redis for distributed rate limiting
2. Add IP geolocation and blocking
3. Implement anomaly detection
4. Add WAF (CloudFlare, AWS WAF)
5. Set up security monitoring (Sentry, DataDog)

## Rollback Procedures

### Emergency Disable

**1. Disable All Security Features**:
```powershell
# In production environment
CSRF_ENABLED=false
USE_SESSION_TRACKING=false
FEATURE_2FA_ENABLED=false
EMAIL_ENABLED=false
```

**2. Restart Server**:
```powershell
npm run start
```

### Database Rollback

**Rollback Migration**:
```powershell
cd api
npx prisma migrate resolve --rolled-back 20251105225000_add_security_features
```

**Manual Rollback SQL**:
```sql
-- Remove new columns
ALTER TABLE users DROP COLUMN "emailVerified";
ALTER TABLE users DROP COLUMN "twoFactorEnabled";
ALTER TABLE users DROP COLUMN "twoFactorSecret";

-- Drop new tables
DROP TABLE email_verification_tokens;
DROP TABLE password_reset_tokens;
DROP TABLE two_factor_recovery_codes;
DROP TABLE sessions;
DROP TABLE audit_logs;
```

### Gradual Rollback

**Phase 1**: Disable 2FA
```powershell
FEATURE_2FA_ENABLED=false
```

**Phase 2**: Disable CSRF
```powershell
CSRF_ENABLED=false
```

**Phase 3**: Disable session tracking
```powershell
USE_SESSION_TRACKING=false
```

**Phase 4**: Disable email verification requirement
- Remove `requireEmailVerification` middleware from routes

### Recovery Steps

1. Notify users of security changes
2. Document rollback reason
3. Monitor for issues
4. Plan re-deployment with fixes
5. Update runbooks

## Support and Troubleshooting

### Common Issues

**Email Not Sending**:
- Check `EMAIL_ENABLED=true`
- Verify SMTP credentials
- Check email service logs
- Test with development mode (console logging)

**2FA Not Working**:
- Verify `FEATURE_2FA_ENABLED=true`
- Check time synchronization
- Ensure TOTP_ENCRYPTION_KEY is set
- Test with recovery codes

**Rate Limiting Too Aggressive**:
- Adjust limits in middleware
- Use Redis for distributed tracking
- Implement IP whitelisting

**CSP Blocking Resources**:
- Check browser console
- Update CSP directives
- Start with report-only mode

### Debug Mode

```powershell
# Enable verbose logging
NODE_ENV=development
DEBUG=*

# Check security configuration
Invoke-RestMethod -Uri "http://localhost:5000/" -Method Get
```

### Contact

For security issues:
- Email: security@valine.app
- Open issue: github.com/gcolon75/Project-Valine/issues
- Security advisory: Use GitHub Security Advisories

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [GDPR Compliance](https://gdpr.eu/)
- [Prisma Security Best Practices](https://www.prisma.io/docs/guides/security)

---

Last Updated: November 5, 2024
Version: 1.0.0
