# Security Implementation Summary

> **📌 Backend Note:** Security features are implemented in the **Serverless backend** (`/serverless`). The Express server (`/server`) mentioned in some legacy sections is for local development only. See [Canonical Backend Decision](../backend/canonical-backend.md).

## Overview

This document provides a high-level summary of the account security and privacy hardening implementation for Project Valine.

## Quick Start

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Run Database Migration

```bash
cd ../api
npx prisma migrate deploy
```

### 3. Configure Environment

Copy and edit the environment file:

```bash
cd ../server
cp .env.example .env
```

Required variables:
- `JWT_SECRET` - Strong random string for JWT signing
- `TOTP_ENCRYPTION_KEY` - Strong random string for 2FA secret encryption
- `DATABASE_URL` - PostgreSQL connection string

Optional (disabled by default):
- `CSRF_ENABLED=true` - Enable CSRF protection
- `USE_SESSION_TRACKING=true` - Enable database session tracking
- `FEATURE_2FA_ENABLED=true` - Enable two-factor authentication
- `EMAIL_ENABLED=true` - Enable email sending (requires SMTP config)

### 4. Start Server

```bash
npm start
```

## Features Implemented

### ✅ Email Verification
- Tokens expire in 24 hours
- Automatic email on registration
- Resend verification endpoint
- Middleware to restrict unverified users

### ✅ Password Reset
- Time-bound tokens (1 hour expiration)
- Secure token generation
- Session invalidation on reset
- Email templates included

### ✅ Two-Factor Authentication (2FA)
- TOTP-based (compatible with Google Authenticator, Authy, etc.)
- QR code generation for easy setup
- 8 recovery codes per enrollment
- Feature flag controlled

### ✅ Session Management
- JWT-based (default, stateless)
- Optional database session tracking
- Session revocation
- IP and user agent tracking

### ✅ CSRF Protection
- Token generation and validation
- Cookie + header verification
- Safe method bypass
- Feature flag controlled

### ✅ Rate Limiting
- Authentication endpoints protected
- IP-based and account-based tracking
- Exponential backoff
- Structured 429 responses

### ✅ Security Headers
- Content Security Policy (CSP) - report-only by default
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy

### ✅ Audit Logging
- All security-sensitive actions logged
- IP and user agent tracking
- 90-day retention (configurable)
- User-accessible audit log endpoint

### ✅ Privacy Features
- Complete data export (GDPR compliant)
- Account deletion with confirmation
- Optional grace period for deletion
- Session management and revocation

## API Endpoints

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | Register new user with email verification |
| `/auth/login` | POST | Login with optional 2FA |
| `/auth/logout` | POST | Logout and invalidate session |
| `/auth/verify-email` | POST | Verify email with token |
| `/auth/resend-verification` | POST | Resend verification email |
| `/auth/request-password-reset` | POST | Request password reset token |
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

```bash
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
