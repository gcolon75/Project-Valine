# Security Implementation Summary

> **📌 Backend Note:** Security features are implemented in the **Serverless backend** (`/serverless`). This is the canonical production API. See [Canonical Backend Decision](../backend/canonical-backend.md).

## Overview

This document provides a high-level summary of the account security and privacy hardening implementation for Project Valine's serverless backend.

## Quick Start

### 1. Install Dependencies

```powershell
cd serverless
npm install
```

### 2. Generate Prisma Client

```powershell
cd ../api
npx prisma generate
```

### 3. Run Database Migration

```powershell
cd ../api
npx prisma migrate deploy
```

### 4. Configure Environment

Create a `.env` file in the project root:

```powershell
# Required
DATABASE_URL="postgresql://username:password@host:5432/valine_db"
JWT_SECRET="$(openssl rand -base64 32)"

# Optional
EMAIL_ENABLED=false  # Set to true for production SMTP
FRONTEND_URL=http://localhost:5173
AWS_REGION=us-west-2
STAGE=dev
```

**Required variables:**
- `JWT_SECRET` - Strong random string for JWT signing (32+ characters)
- `DATABASE_URL` - PostgreSQL connection string

**Optional (disabled by default):**
- `EMAIL_ENABLED=true` - Enable SMTP email sending (default: console logs)
- `FRONTEND_URL` - Frontend URL for email verification links
- `STAGE` - Deployment stage (dev, staging, prod)

**Generate strong JWT_SECRET:**
```powershell
openssl rand -base64 32
```

### 5. Deploy to AWS

```powershell
cd serverless
npx serverless deploy --stage dev
```

Or use the deployment script:
```powershell
./scripts/deployment/deploy-backend.sh --stage dev --region us-west-2
```

## Features Implemented

### ✅ Email Verification
- **Status:** Fully implemented in serverless backend
- Tokens expire in 24 hours (crypto-based, 32 bytes)
- Automatic email on registration (console logs in dev, SMTP in prod)
- Resend verification endpoint with auth required
- Single-use tokens (deleted after verification)
- Expired token cleanup

**Endpoints:**
- `POST /auth/verify-email` - Verify email with token
- `POST /auth/resend-verification` - Resend verification (requires auth)

### ✅ Password Security
- **Status:** Fully implemented with bcrypt
- bcryptjs with 10 salt rounds
- Constant-time comparison (protects against timing attacks)
- Passwords never stored in plaintext or logs
- Automatic salt generation per password
- Minimum 6 characters (recommend increasing to 12+)

**Implementation:** `/serverless/src/handlers/auth.js`

### ✅ JWT-Based Authentication
- **Status:** Fully implemented
- Token expiration: 7 days
- HS256 algorithm (HMAC with SHA-256)
- Stateless (no server-side session tracking)
- Bearer token in Authorization header
- User ID embedded in JWT payload

**Endpoints:**
- `POST /auth/register` - Register with auto JWT issuance
- `POST /auth/login` - Login and receive JWT
- `GET /auth/me` - Get current user (requires JWT)

### ⏳ Password Reset
- **Status:** Not yet implemented
- Planned: Time-bound tokens (1 hour expiration)
- Planned: Session invalidation on reset
- Planned: Rate limiting

**Future Endpoints:**
- `POST /auth/request-password-reset` - Request reset token
- `POST /auth/reset-password` - Complete password reset

### ⏳ Two-Factor Authentication (2FA)
- **Status:** Not yet implemented
- Planned: TOTP-based (Google Authenticator compatible)
- Planned: QR code generation
- Planned: Recovery codes
- Planned: Feature flag controlled

**Future Endpoints:**
- `POST /auth/2fa/enroll` - Start 2FA enrollment
- `POST /auth/2fa/verify` - Verify 2FA code
- `POST /auth/2fa/disable` - Disable 2FA

### ⏳ Session Management
- **Status:** JWT-only (stateless), no database tracking
- Current: JWT expiration handles session lifecycle
- Future: Optional database session tracking
- Future: Session revocation endpoint

### ⏳ CSRF Protection
- **Status:** Not required for JWT-only auth
- Note: CSRF protection primarily for cookie-based auth
- JWT in Authorization header inherently CSRF-resistant
- No implementation needed for current architecture

### ⏳ Rate Limiting
- **Status:** Not yet implemented in serverless
- Recommended: AWS API Gateway rate limiting
- Future: Distributed rate limiting with Redis/ElastiCache
- Priority: High for auth endpoints

**Recommended Limits:**
- Registration: 3 per hour per IP
- Login: 5 per 15 minutes per IP + account
- Resend verification: 3 per hour per user
- Password reset: 3 per hour per email

### ✅ Security Headers
- **Status:** Implemented in handler utilities
- X-Content-Type-Options: nosniff
- Content-Type: application/json
- CORS headers via serverless.yml
- API Gateway handles additional headers

**Implementation:** `/serverless/src/utils/headers.js`

### ⏳ Audit Logging
- **Status:** Basic console logging only
- Current: Auth events logged to CloudWatch
- Future: Structured audit log table
- Future: User-accessible audit log endpoint

**Future Features:**
- Database audit log storage
- IP and user agent tracking
- 90-day retention
- User query endpoint

### ✅ Privacy Features
- **Status:** Export and delete implemented
- Account data export (JSON format)
- Account deletion with cascade
- Privacy settings (GDPR compliant)

**Endpoints:**
- `POST /account/export` - Export all user data
- `DELETE /account` - Delete account and data

**Implementation:** `/serverless/src/handlers/settings.js`

### ✅ Input Validation
- **Status:** Implemented for profiles and auth
- Email format validation (regex)
- Password length enforcement (6+ chars)
- Profile link URL validation
- String length limits enforced
- Platform whitelist for social links

**Implementation:** 
- `/serverless/src/handlers/auth.js` (auth validation)
- `/serverless/src/handlers/profiles.js` (profile validation)

## API Endpoints

### Authentication (Implemented)

| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/auth/register` | POST | ✅ Implemented | Register new user with email verification |
| `/auth/login` | POST | ✅ Implemented | Login and receive JWT token |
| `/auth/me` | GET | ✅ Implemented | Get current user profile (requires JWT) |
| `/auth/verify-email` | POST | ✅ Implemented | Verify email with token |
| `/auth/resend-verification` | POST | ✅ Implemented | Resend verification email (requires JWT) |

### Authentication (Planned)

| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/auth/logout` | POST | ⏳ Planned | Logout (useful for audit logging) |
| `/auth/request-password-reset` | POST | ⏳ Planned | Request password reset token |
| `/auth/reset-password` | POST | ⏳ Planned | Complete password reset |
| `/auth/2fa/enroll` | POST | ⏳ Planned | Start 2FA enrollment |
| `/auth/2fa/verify` | POST | ⏳ Planned | Verify 2FA code |
| `/auth/2fa/disable` | POST | ⏳ Planned | Disable 2FA |

### Privacy (Implemented)

| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/account/export` | POST | ✅ Implemented | Export all user data (GDPR) |
| `/account` | DELETE | ✅ Implemented | Delete account and all data |

### Privacy (Planned)

| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/privacy/sessions` | GET | ⏳ Planned | List active sessions |
| `/privacy/sessions/:id` | DELETE | ⏳ Planned | Revoke specific session |
| `/privacy/audit-log` | GET | ⏳ Planned | View security audit log |

## Implementation Files

### Serverless Backend

**Handlers (Implemented):**
- **auth.js** - Registration, login, email verification (JWT + bcrypt)
- **settings.js** - Account export, deletion, privacy settings
- **profiles.js** - Profile management with input validation

**Utilities:**
- **headers.js** - Response helpers with security headers
- **db/client.js** - Prisma client singleton

**Configuration:**
- **serverless.yml** - Function definitions and API Gateway routes
- **handler.js** - Main entry point

### Database Schema

**Implemented Tables:**
- `User` - User accounts with emailVerified, password hash
- `EmailVerificationToken` - Email verification tokens (24h expiry)
- `UserSettings` - Privacy and notification preferences
- `Profile` - Extended user profiles

**Planned Tables:**
- `PasswordResetToken` - Password reset tokens (1h expiry)
- `TwoFactorRecoveryCode` - 2FA recovery codes
- `Session` - Optional session tracking
- `AuditLog` - Security audit trail

**User Model Fields:**
- ✅ `email`, `normalizedEmail`
- ✅ `password` (bcrypt hash)
- ✅ `emailVerified`, `emailVerifiedAt`
- ⏳ `twoFactorEnabled`, `twoFactorSecret` (planned)

## Security Best Practices

### Passwords (Implemented)
- ✅ bcrypt hashing (10 salt rounds)
- ✅ Never logged or stored in plain text
- ✅ Constant-time comparison (bcrypt.compare)
- ⏳ Strong password requirements (currently 6+ chars, should increase to 12+)

### Tokens (Implemented)
- ✅ Cryptographically secure random generation (crypto.randomBytes)
- ✅ Time-bound expiration (24h for email verification)
- ✅ Single-use for verification tokens (deleted after use)
- ✅ Secure transmission (HTTPS required in production)

### Sessions (Implemented)
- ✅ JWT with 7-day expiration
- ✅ Stateless authentication (no server-side session)
- ✅ HS256 signing algorithm
- ⏳ Refresh token rotation (not yet implemented)
- ⏳ Session invalidation on sensitive changes (not yet implemented)

### Rate Limiting (Recommended)
- ⏳ Use AWS API Gateway throttling
- ⏳ Per-endpoint limits (auth endpoints)
- ⏳ Distributed rate limiting with Redis (future)
- ⏳ IP-based and account-based tracking
| `/auth/reset-password` | POST | Reset password with token |

### Two-Factor Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/2fa/enroll` | POST | Start 2FA enrollment (get QR code) |
| `/api/2fa/verify-enrollment` | POST | Complete 2FA enrollment |
| `/api/2fa/disable` | POST | Disable 2FA |
| `/api/2fa/regenerate-recovery-codes` | POST | Regenerate recovery codes |
| `/api/2fa/status` | GET | Check 2FA status |

### Privacy

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/privacy/export` | GET | Export all user data |
| `/api/privacy/delete-account` | POST | Delete account immediately |
| `/api/privacy/request-deletion` | POST | Request account deletion with grace period |
| `/api/privacy/audit-log` | GET | Get user audit log |
| `/api/privacy/sessions` | GET | List active sessions |
| `/api/privacy/sessions/:sessionId` | DELETE | Revoke specific session |

## Architecture

### Utilities

- **crypto.js** - Password hashing, JWT, token generation
- **twoFactor.js** - TOTP generation and verification
- **email.js** - Email templates and sending
- **auditLog.js** - Audit logging with retention

### Middleware

- **auth.js** - JWT authentication
- **authRateLimit.js** - Brute-force protection
- **csrf.js** - CSRF token handling
- **security.js** - Security headers (helmet)
- **rateLimit.js** - General rate limiting (existing)

### Database Schema

New tables:
- `email_verification_tokens` - Email verification
- `password_reset_tokens` - Password reset
- `two_factor_recovery_codes` - 2FA recovery
- `sessions` - Session tracking (optional)
- `audit_logs` - Security audit trail

User model additions:
- `emailVerified` - Email verification status
- `twoFactorEnabled` - 2FA enrollment status
- `twoFactorSecret` - TOTP secret (encrypted)

## Security Best Practices

### Passwords
- ✅ Bcrypt hashing (cost factor: 10)
- ✅ Never logged or stored in plain text
- ✅ Strong password requirements (enforced client-side)

### Tokens
- ✅ Cryptographically secure random generation
- ✅ Time-bound expiration
- ✅ Single-use for sensitive operations
- ✅ Secure transmission (HTTPS required in production)

### Sessions
- ✅ JWT with short expiration
- ✅ Refresh token rotation (optional)
- ✅ Session invalidation on sensitive changes
- ✅ IP and user agent tracking

### Rate Limiting
- ✅ Multiple tracking keys (IP + account)
- ✅ Exponential backoff
- ✅ Clear error messages with retry-after
- ✅ Account lockout after threshold

### Audit Logging
- ✅ Comprehensive action logging
- ✅ PII sanitization
- ✅ Retention policy enforcement
- ✅ User-accessible logs

## Configuration Matrix

| Feature | Env Var | Default | Production |
|---------|---------|---------|------------|
| CSRF Protection | `CSRF_ENABLED` | false | true (if using cookies) |
| Session Tracking | `USE_SESSION_TRACKING` | false | true (recommended) |
| 2FA | `FEATURE_2FA_ENABLED` | false | true (gradual rollout) |
| Email | `EMAIL_ENABLED` | false | true (with SMTP) |
| CSP Enforcement | `CSP_REPORT_ONLY` | true | false (after testing) |

## Deployment Checklist

### Pre-deployment

- [ ] Generate strong `JWT_SECRET` (32+ random characters)
- [ ] Generate strong `TOTP_ENCRYPTION_KEY` (32+ random characters)
- [ ] Configure SMTP credentials for email sending
- [ ] Set `BASE_URL` to production URL
- [ ] Review and customize CSP directives
- [ ] Configure `API_DOMAINS` for CSP

### Deployment

- [ ] Run database migration: `npx prisma migrate deploy`
- [ ] Deploy server with new environment variables
- [ ] Verify health endpoint: `GET /health`
- [ ] Test authentication flow
- [ ] Monitor error logs

### Post-deployment

- [ ] Enable email verification for new users
- [ ] Gradually enable 2FA (feature flag)
- [ ] Monitor CSP reports
- [ ] Enable CSP enforcement after validation
- [ ] Set up audit log cleanup cron job

## Testing

### Run Tests

```powershell
# All tests
npm run test

# Server tests only
cd server
npm run test:server

# With coverage
npm run test:coverage
```

### Manual Testing

See `docs/SECURITY_GUIDE.md` for detailed testing procedures.

### Security Testing

1. **Rate Limiting**: Attempt multiple failed logins
2. **CSRF Protection**: Try mutating request without token
3. **Session Management**: Verify session invalidation
4. **2FA**: Test enrollment and verification flow
5. **Password Reset**: Test token expiration
6. **Email Verification**: Test verification flow

## Monitoring

### Metrics to Track

- Failed login attempts per hour
- Rate limit hits per endpoint
- 2FA enrollment rate
- Password reset requests per day
- Account deletions per week
- Audit log volume

### Alerts

- Unusual spike in failed logins (possible attack)
- High rate limit hits (possible DoS)
- Spike in password resets (possible breach)
- CSRF token rejections (possible attack)

## Troubleshooting

### Common Issues

**Email not sending**
- Check `EMAIL_ENABLED=true`
- Verify SMTP credentials
- Check email service logs
- In development, emails log to console

**2FA not working**
- Ensure `FEATURE_2FA_ENABLED=true`
- Check `TOTP_ENCRYPTION_KEY` is set
- Verify time synchronization
- Try recovery codes

**Rate limiting too aggressive**
- Adjust limits in `authRateLimit` middleware
- Clear rate limits: `clearAllRateLimits()`
- Use Redis for production (distributed)

**CSRF errors**
- Ensure token in cookie
- Include token in `X-CSRF-Token` header
- Check `CSRF_ENABLED=true`
- Verify same-site cookies

## Performance Considerations

### Rate Limiting
- In-memory store (single instance only)
- Use Redis for multi-instance deployments
- Automatic cleanup every minute

### Audit Logging
- Asynchronous writes (non-blocking)
- Indexed queries for performance
- Scheduled cleanup job recommended
- Consider log aggregation service

### Session Tracking
- Optional feature (disabled by default)
- Adds database queries per request
- Use caching layer (Redis) in production
- Consider stateless JWT for high traffic

### Email Sending
- Asynchronous (non-blocking)
- Queue recommended for high volume
- Retry logic for failures
- Monitor bounce rates

## Roadmap

### Phase 1 (Completed)
- ✅ Email verification
- ✅ Password reset
- ✅ Basic authentication
- ✅ Rate limiting
- ✅ Security headers
- ✅ Audit logging
- ✅ Privacy features

### Phase 2 (Future)
- [ ] Distributed rate limiting (Redis)
- [ ] Advanced anomaly detection
- [ ] Passwordless authentication
- [ ] Social authentication (OAuth)
- [ ] Hardware token support (WebAuthn)

### Phase 3 (Future)
- [ ] Advanced fraud detection
- [ ] Risk-based authentication
- [ ] Behavioral biometrics
- [ ] Threat intelligence integration

## Support

For questions or issues:
- Documentation: `docs/SECURITY_GUIDE.md`
- Issues: GitHub Issues
- Security: security@valine.app

## License

This security implementation is part of Project Valine and follows the same license.

---

Last Updated: November 5, 2024
Version: 1.0.0
