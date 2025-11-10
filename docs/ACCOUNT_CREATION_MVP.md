# Account Creation MVP

## Overview

This document describes the Account Creation MVP feature for Project Valine, which provides user signup, email verification, and authentication endpoints.

**Status:** MVP Implementation  
**Last Updated:** November 10, 2025

## Features

- ✅ User signup with email and password
- ✅ Secure password hashing (bcryptjs with 12 rounds)
- ✅ Email normalization and uniqueness validation
- ✅ Email verification tokens (24-hour expiry)
- ✅ JWT-based authentication (24-hour tokens)
- ✅ Rate limiting (10 signups/min, 5 logins/min per IP)
- ✅ Protected endpoints with authentication
- ✅ E2E test coverage with Playwright
- ✅ Unit test coverage for utilities

## API Endpoints

### POST /api/users - Create Account

Create a new user account with email verification.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response (201 Created):**
```json
{
  "message": "verification_required",
  "verifyHint": "Check server logs or analysis-output/ for verification token",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "status": "pending"
  }
}
```

**Error Responses:**
- `400` - Validation error (invalid email format, password too short)
- `409` - Email already exists
- `429` - Rate limit exceeded (10 signups/min per IP)

**Validation Rules:**
- Email must be valid format
- Password must be at least 8 characters
- Email is normalized (lowercase, trimmed) for uniqueness

---

### POST /api/auth/verify-email - Verify Email

Verify email address using the token from signup.

**Request:**
```json
{
  "token": "64-character-hex-token"
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "message": "Email verified successfully"
}
```

**Error Responses:**
- `400` - Invalid token
- `410` - Token expired (24-hour expiry)

**Notes:**
- Token is single-use (deleted after verification)
- User status changes from "pending" to "active"
- `emailVerifiedAt` timestamp is set

---

### POST /api/auth/login - Login

Authenticate with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response (200 OK):**
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "displayName": "User Name",
    "username": "username"
  }
}
```

**Error Responses:**
- `400` - Validation error
- `401` - Invalid email or password
- `403` - Email not verified (code: `email_not_verified`)
- `429` - Rate limit exceeded (5 logins/min per IP)

**Security:**
- Credentials are checked in constant time
- Error messages don't reveal if email exists
- Session is created for tracking

---

### GET /api/auth/me - Get Current User

Get authenticated user's information.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "username": "username",
    "displayName": "User Name",
    "avatar": "https://...",
    "bio": "...",
    "role": "artist",
    "status": "active",
    "emailVerified": true,
    "createdAt": "2025-11-10T19:00:00.000Z"
  }
}
```

**Error Responses:**
- `401` - Unauthorized (missing or invalid token)
- `404` - User not found

---

## Environment Variables

### Required

```bash
# Database connection (PostgreSQL recommended)
DATABASE_URL=postgresql://user:password@host:5432/valine_db

# JWT secret for authentication tokens
# Generate with: openssl rand -base64 32
AUTH_JWT_SECRET=your-256-bit-secret-key-here
```

### Optional

```bash
# JWT token expiration (default: 24h)
JWT_EXPIRATION=24h

# Frontend base URL for verification links
FRONTEND_BASE_URL=http://localhost:5173

# Email sending (default: false for MVP)
EMAIL_ENABLED=false
```

## Local Development Setup

### 1. Install Dependencies

```bash
# Root dependencies
npm install

# Server dependencies
cd server
npm install
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and set:
# - DATABASE_URL (your PostgreSQL connection string)
# - AUTH_JWT_SECRET (generate with: openssl rand -base64 32)
```

### 3. Run Database Migrations

```bash
cd api
npx prisma migrate deploy
npx prisma generate
```

### 4. Start the Server

```bash
cd server
npm run dev
# Server runs on http://localhost:5000
```

### 5. Start the Frontend (Optional)

```bash
# In another terminal, from project root
npm run dev
# Frontend runs on http://localhost:5173
```

### 6. Test the API

```bash
# Sign up
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123"}'

# Check server logs for verification token

# Verify email
curl -X POST http://localhost:5000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"<token-from-logs>"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123"}'

# Get current user
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <token-from-login>"
```

## Email Verification (MVP Implementation)

**Current Implementation (MVP):**
- Verification tokens are logged to server console
- Tokens are written to `analysis-output/verification-token-<userId>.json`
- E2E tests read tokens from this directory
- No actual email is sent

**Production TODO:**
- Integrate email service (SendGrid, AWS SES, etc.)
- Send verification emails with clickable links
- Add email templates
- Implement resend verification email endpoint
- Add email preferences and notifications

## Security Considerations

### Password Security

- **Hashing Algorithm:** bcryptjs with 12 salt rounds
- **Minimum Length:** 8 characters (enforced)
- **Storage:** Only hashed passwords stored in database
- **Future Enhancements:** 
  - Password complexity requirements
  - Check against common password breach lists
  - Password strength meter on frontend

### Email Normalization

- Emails are normalized (lowercase, trimmed) to prevent duplicates
- Case-insensitive uniqueness enforced via `normalizedEmail` field
- Prevents signup with `User@Example.com` if `user@example.com` exists

### JWT Tokens

- **Algorithm:** HS256 (HMAC with SHA-256)
- **Expiration:** 24 hours (configurable)
- **Issuer:** `project-valine`
- **Payload:** User ID, email, type
- **Secret:** Must be 256+ bits for production
- **Future Enhancements:**
  - Refresh tokens for longer sessions
  - Token rotation on critical actions
  - Revocation list for compromised tokens

### Rate Limiting

**Current Implementation (MVP):**
- In-memory rate limiting (per server instance)
- Signup: 10 requests/minute per IP
- Login: 5 requests/minute per IP
- Automatic cleanup to prevent memory leaks

**Production TODO:**
- Distributed rate limiting (Redis, Memcached)
- Per-user rate limits (not just IP)
- CAPTCHA integration for suspicious activity
- Progressive delays on repeated failures

### Token Security

- Verification tokens: 32 bytes random (cryptographically secure)
- 24-hour expiration for email verification
- Single-use tokens (deleted after verification)
- Tokens never logged in production (only in dev/test)

### Headers and Transport

- CORS configured for frontend origin
- Helmet.js for security headers
- HTTPS required in production
- httpOnly cookies option available (JWT preferred for MVP)

## Testing

### Unit Tests

Located in `server/src/__tests__/`:

```bash
cd server
npm test

# Coverage report
npm run test:coverage
```

**Test Files:**
- `passwordHash.test.js` - Password hashing, normalization, validation
- `jwtToken.test.js` - Token generation, verification, expiration

### E2E Tests (Playwright)

Located in `tests/e2e/`:

```bash
# Install Playwright
npx playwright install

# Run E2E tests
npx playwright test tests/e2e/signup.spec.ts
npx playwright test tests/e2e/login-duplicate-email.spec.ts
npx playwright test tests/e2e/login-unverified.spec.ts

# View HTML report
npx playwright show-report
```

**Test Scenarios:**
- ✅ Full signup and verification flow
- ✅ Login after verification
- ✅ Protected endpoint access with JWT
- ✅ Duplicate email prevention
- ✅ Case-insensitive email uniqueness
- ✅ Email format validation
- ✅ Password strength validation
- ✅ Login blocked before verification
- ✅ Invalid credentials handling
- ✅ Rate limiting enforcement

### Integration with Analyzer

The Playwright tests output JSON results to `test-results/results.json`, which is consumed by the orchestration analyzer:

```bash
# Run analyzer on workflow run
node scripts/analyze-orchestration-run.mjs <run-id> \
  --out-dir analysis-output \
  --json \
  --fail-on P0
```

## Database Schema Changes

### User Model Updates

**Added Fields:**
- `normalizedEmail` (String, unique) - Lowercase, trimmed email
- `emailVerifiedAt` (DateTime, nullable) - Verification timestamp
- `status` (String) - User status: "pending" | "active" | "suspended"

**Existing Models Used:**
- `EmailVerificationToken` - Stores verification tokens
- `Session` - Tracks JWT sessions

### Migration

Migration: `20251110195138_add_account_creation_fields`

```bash
cd api
npx prisma migrate deploy
```

**Rollback:** See `api/prisma/migrations/.../ROLLBACK.md`

## Workflow Integration

### CI/CD Pipeline

The E2E tests run in GitHub Actions workflow:

```yaml
- name: Run Account Creation Tests
  run: npx playwright test tests/e2e/
  env:
    VITE_API_BASE: ${{ secrets.STAGING_URL }}
    FRONTEND_BASE_URL: ${{ secrets.FRONTEND_BASE_URL }}
```

### Secrets Required

- `AUTH_JWT_SECRET` - JWT signing key (new)
- `STAGING_URL` - API base URL for staging tests (existing)
- `FRONTEND_BASE_URL` - Frontend URL for verification links (existing)
- `ORCHESTRATION_BOT_PAT` - For posting PR comments (existing, optional)

### Analyzer Artifacts

Tests produce artifacts consumed by analyzer:
- `test-results/results.json` - Playwright test results
- `analysis-output/verification-token-*.json` - Verification tokens (test only)

## Production Deployment Checklist

Before deploying to production:

- [ ] **Secrets Management**
  - [ ] Generate strong JWT secret (256+ bits)
  - [ ] Store `AUTH_JWT_SECRET` in AWS Secrets Manager or Parameter Store
  - [ ] Rotate secrets regularly
  - [ ] Never log secrets in production

- [ ] **Database**
  - [ ] Run migrations on production database
  - [ ] Backup database before migration
  - [ ] Test rollback procedure

- [ ] **Email Integration**
  - [ ] Configure email service (SendGrid, SES, etc.)
  - [ ] Set `EMAIL_ENABLED=true`
  - [ ] Test email delivery
  - [ ] Configure SPF/DKIM records

- [ ] **Security Hardening**
  - [ ] Enable HTTPS only
  - [ ] Configure CORS for production domain
  - [ ] Implement distributed rate limiting (Redis)
  - [ ] Add CAPTCHA for signup/login
  - [ ] Enable security monitoring

- [ ] **Monitoring**
  - [ ] Configure CloudWatch alarms
  - [ ] Track signup/login metrics
  - [ ] Monitor rate limit hits
  - [ ] Alert on authentication failures

## Future Enhancements

### Short-term (Next Sprint)

- [ ] Password reset flow
- [ ] Resend verification email endpoint
- [ ] Email templates and branding
- [ ] Account deletion/deactivation
- [ ] Login history and device tracking

### Medium-term

- [ ] Social login (Google, GitHub)
- [ ] Two-factor authentication (2FA)
- [ ] Password complexity requirements
- [ ] Passwordless login (magic links)
- [ ] Account recovery options

### Long-term

- [ ] OAuth 2.0 provider for third-party apps
- [ ] Single Sign-On (SSO) integration
- [ ] Advanced fraud detection
- [ ] Security audit logging
- [ ] GDPR compliance tools

## Troubleshooting

### Common Issues

**"AUTH_JWT_SECRET environment variable is required"**
- Set `AUTH_JWT_SECRET` in your `.env` file
- Generate with: `openssl rand -base64 32`

**"Failed to read verification token file"**
- Ensure server has write permissions to `analysis-output/`
- Check server logs for verification token
- For E2E tests, wait for file to be written

**"Email already exists"**
- Email normalization is case-insensitive
- Check for existing accounts with same email
- Try different email address

**Rate limit exceeded**
- Wait 60 seconds and try again
- In production, implement per-user rate limits
- Consider CAPTCHA for repeated failures

**Invalid or expired token**
- Verification tokens expire after 24 hours
- Request new verification email (when implemented)
- Check token is copied correctly (64 hex characters)

## Support

For issues or questions:
- Check server logs for detailed error messages
- Review test output for E2E test failures
- Open GitHub issue with reproduction steps
- Contact development team

---

**Last Updated:** November 10, 2025  
**Version:** 1.0.0 (MVP)
