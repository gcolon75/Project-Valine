# Staging: Enable Safe First Account Creation

This guide enables safe first-account creation and login on staging, with email verification, rate limiting, and session management.

## Overview

This document provides the exact steps to:
1. Apply database migrations
2. Configure environment variables
3. Test account creation, verification, and login flows
4. Verify security controls (rate limiting, CSRF, session management)

## Prerequisites

- PostgreSQL database accessible (staging)
- SMTP credentials for email verification (or use dev mode logging)
- Redis instance for rate limiting (optional but recommended)
- Node.js 20.x and npm installed
- Serverless Framework CLI installed

## 1. Database Migrations

Apply the following migrations in order. All migrations are idempotent (safe to run multiple times).

### Migration Files

Located in `serverless/prisma/migrations/`:

1. **20251111191723_add_email_verification**
   - Adds email verification fields to users table
   - Creates email_verification_tokens table
   - Adds normalizedEmail unique index

2. **20251111193653_add_session_audits_2fa**
   - Adds 2FA fields to users table
   - Creates refresh_tokens table for session tracking
   - Adds session management indexes

3. **20251111201848_add_pr_intel_test_runs**
   - Creates pr_intelligence table
   - Creates test_runs table
   - Adds performance tracking indexes

### Apply Migrations

```bash
cd serverless

# Ensure DATABASE_URL is set
export DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

# Generate Prisma client
npm run prisma:generate

# Apply migrations to database
npx prisma migrate deploy

# Verify migrations applied
npx prisma migrate status
```

Expected output:
```
Database schema is up to date!
```

## 2. Environment Configuration

### Required Environment Variables

Create or update `serverless/.env` with the following:

```bash
# Database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE

# JWT Authentication
JWT_SECRET=your-secure-random-jwt-secret-at-least-32-chars

# Frontend URL (for CORS and email links)
FRONTEND_URL=https://staging.projectvaline.com

# Cookie Configuration
COOKIE_DOMAIN=.projectvaline.com  # Note: leading dot for cross-subdomain
NODE_ENV=production
STAGE=staging

# Email Verification (REQUIRED for account creation)
EMAIL_ENABLED=true
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
FROM_EMAIL=noreply@projectvaline.com

# Security Features
TWO_FACTOR_ENABLED=false           # Enable later after initial testing
CSRF_ENABLED=false                 # Enable when frontend sends X-CSRF-Token
RATE_LIMITING_ENABLED=true         # MUST be true for production
REDIS_URL=redis://your-redis-host:6379  # For rate limiting

# Feature Flags (optional - can be disabled for initial testing)
PR_INTEL_ENABLED=false
FLAKY_DETECTOR_ENABLED=false
SCHEMA_DIFF_ENABLED=false
SYNTHETIC_JOURNEY_ENABLED=false
```

### Critical Security Settings

⚠️ **MUST CONFIGURE**:
- `RATE_LIMITING_ENABLED=true` - Prevents abuse of verification emails and auth endpoints
- `EMAIL_ENABLED=true` - Required for account verification
- `JWT_SECRET` - Use a cryptographically random string (32+ chars)
- `REDIS_URL` - Required for rate limiting to work

⏳ **ENABLE LATER** (after frontend ready):
- `CSRF_ENABLED=false` - Set to true when frontend sends X-CSRF-Token header
- `TWO_FACTOR_ENABLED=false` - Set to true when ready to enable 2FA

### Development Mode (No SMTP)

If testing without SMTP credentials, set:
```bash
EMAIL_ENABLED=false
```

Verification tokens will be logged to console instead of emailed. Extract from logs:
```
=== EMAIL VERIFICATION (DEV MODE) ===
To: user@example.com
Subject: Verify your Project Valine account
Hi username,
Please verify your email address by clicking the link below:
http://localhost:5173/verify-email?token=abc123...xyz789
Token (masked): abc123...xyz789
This link will expire in 24 hours.
=====================================
```

## 3. Deploy API (if using AWS Lambda)

```bash
cd serverless

# Deploy to staging
export STAGE=staging
npm run deploy

# Note the API Gateway URL from output
# Example: https://abc123xyz.execute-api.us-west-2.amazonaws.com/staging
```

## 4. Endpoint Sanity Tests

### Test Setup

```bash
# Set API base URL
export API_BASE="https://your-api-gateway-url.amazonaws.com/staging"

# Or for local testing with serverless-offline:
export API_BASE="http://localhost:3000"
```

### Test 1: Register New Account (Expect 201)

```bash
curl -X POST "$API_BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePass123!",
    "username": "testuser",
    "displayName": "Test User"
  }' \
  -c cookies.txt \
  -v
```

**Expected Response:**
- Status: `201 Created`
- Headers: `Set-Cookie: accessToken=...` (HttpOnly)
- Body includes: `emailVerified: false`
- Message: "Please check your email to verify your account"

**Verification:**
- Check email inbox (or server logs if EMAIL_ENABLED=false)
- Extract verification token from email/logs

### Test 2: Resend Verification Email with Rate Limiting

First 5 requests should succeed. 6th and beyond should get rate limited.

```bash
# Requests 1-5: Should succeed (200 OK)
for i in {1..5}; do
  echo "Request $i:"
  curl -X POST "$API_BASE/auth/resend-verification" \
    -b cookies.txt \
    -v 2>&1 | grep -E "(< HTTP|X-RateLimit)"
  sleep 1
done

# Request 6+: Should be rate limited (429 Too Many Requests)
echo "Request 6 (should be rate limited):"
curl -X POST "$API_BASE/auth/resend-verification" \
  -b cookies.txt \
  -v 2>&1 | grep -E "(< HTTP|X-RateLimit|Retry-After)"
```

**Expected Response for 6th Request:**
- Status: `429 Too Many Requests`
- Headers:
  - `X-RateLimit-Limit: 5`
  - `X-RateLimit-Remaining: 0`
  - `Retry-After: <seconds>`

### Test 3: Verify Email (Expect 200)

```bash
# Use token from email/logs
TOKEN="your-verification-token-from-email"

curl -X POST "$API_BASE/auth/verify-email" \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\"}" \
  -v
```

**Expected Response:**
- Status: `200 OK`
- Body: `{ "message": "Email verified successfully", "verified": true }`

### Test 4: Login (Expect Set-Cookie Headers)

```bash
curl -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePass123!"
  }' \
  -c cookies.txt \
  -v 2>&1 | grep -E "(< HTTP|Set-Cookie)"
```

**Expected Response:**
- Status: `200 OK`
- Headers must include:
  - `Set-Cookie: accessToken=...` (HttpOnly, Secure if HTTPS)
  - `Set-Cookie: refreshToken=...` (HttpOnly, Secure if HTTPS)
  - `Set-Cookie: csrfToken=...` (if CSRF_ENABLED=true)
- Body includes: `user` object with email, username, displayName

### Test 5: Get Current User (Expect 200)

```bash
curl -X GET "$API_BASE/auth/me" \
  -b cookies.txt \
  -v
```

**Expected Response:**
- Status: `200 OK`
- Body: `{ "user": { "id": "...", "email": "...", "emailVerified": true, ... } }`

### Test 6: Protected Write Endpoint

Example: Update user profile/bio (if endpoint exists)

```bash
# Note: This may vary based on your API structure
curl -X PATCH "$API_BASE/users/me" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"bio": "Updated bio from staging test"}' \
  -v
```

**Expected Response:**
- Status: `200 OK` (or `204 No Content`)
- If CSRF_ENABLED=true, may get 403 without X-CSRF-Token header

### Test 7: List Sessions (Expect Current Session)

```bash
curl -X GET "$API_BASE/auth/sessions" \
  -b cookies.txt \
  -v
```

**Expected Response:**
- Status: `200 OK`
- Body: `{ "sessions": [ { "id": "...", "createdAt": "...", "isCurrent": true } ], "total": 1 }`

## 5. Security Verification

### ✅ Email Verification Flow
- [ ] New accounts have `emailVerified: false`
- [ ] Verification tokens expire after 24 hours
- [ ] Expired tokens return error with message to request new one
- [ ] Tokens are single-use (deleted after verification)
- [ ] Tokens use cryptographically secure random (crypto.randomBytes, not Math.random)

### ✅ Rate Limiting
- [ ] `/auth/resend-verification` limited to 5 requests per 15 minutes
- [ ] 6th request returns 429 with Retry-After header
- [ ] Rate limits are user-specific (not IP-based for this endpoint)
- [ ] Rate limit counters stored in Redis (or in-memory if Redis unavailable)

### ✅ Session Management
- [ ] Login creates refresh token in database
- [ ] Refresh tokens have 7-day expiry
- [ ] Old refresh tokens invalidated on logout
- [ ] Multiple sessions can coexist (tracked in refresh_tokens table)
- [ ] Users can list and revoke individual sessions

### ✅ 2FA Security (When Enabled)
- [ ] 2FA uses otplib (RFC 6238 compliant TOTP)
- [ ] No Math.random usage for secret generation
- [ ] Secrets generated with authenticator.generateSecret()
- [ ] 2FA endpoints gated behind TWO_FACTOR_ENABLED flag
- [ ] Currently disabled (TWO_FACTOR_ENABLED=false) for initial rollout

### ✅ No Insecure Randomness
- [x] Verified: No Math.random in auth handlers
- [x] Verified: Email tokens use crypto.randomBytes(32)
- [x] Verified: JWT JTI uses uuid v4
- [x] Verified: TOTP secrets use otplib.authenticator.generateSecret()

## 6. Troubleshooting

### "User already exists" Error
```bash
# Check if user exists in database
psql $DATABASE_URL -c "SELECT id, email, username, \"emailVerified\" FROM users WHERE email = 'testuser@example.com';"

# If needed, delete test user
psql $DATABASE_URL -c "DELETE FROM users WHERE email = 'testuser@example.com';"
```

### Verification Email Not Received

**If EMAIL_ENABLED=true:**
1. Check SMTP credentials are correct
2. Check spam folder
3. Verify FROM_EMAIL domain is authorized in SMTP provider
4. Check server logs for SMTP errors

**If EMAIL_ENABLED=false (dev mode):**
1. Check server logs for console output
2. Look for "=== EMAIL VERIFICATION (DEV MODE) ===" block
3. Extract token from logged URL

### Rate Limiting Not Working

1. Verify `RATE_LIMITING_ENABLED=true`
2. Check Redis connection:
   ```bash
   redis-cli -u $REDIS_URL ping
   # Should return: PONG
   ```
3. If Redis unavailable, rate limiting falls back to in-memory (resets on server restart)

### "Invalid refresh token" After Logout

Expected behavior. Logout invalidates refresh tokens. User must login again.

### CSRF Token Errors (403 Forbidden)

If `CSRF_ENABLED=true`, frontend must send X-CSRF-Token header:
```bash
# Extract CSRF token from cookie
CSRF_TOKEN=$(grep csrfToken cookies.txt | awk '{print $7}')

# Include in request
curl -X POST "$API_BASE/some/protected/endpoint" \
  -b cookies.txt \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '...'
```

## 7. Next Steps

After successful first account creation:

1. **Enable CSRF Protection** (when frontend ready):
   ```bash
   CSRF_ENABLED=true
   ```

2. **Enable 2FA** (optional, for high-security accounts):
   ```bash
   TWO_FACTOR_ENABLED=true
   ```

3. **Monitor Rate Limiting**:
   - Review Redis logs for rate limit hits
   - Adjust limits in `serverless/src/middleware/rateLimit.js` if needed

4. **Setup Monitoring**:
   - CloudWatch alarms for 4xx/5xx errors
   - Email delivery monitoring
   - Redis connection health checks

5. **Production Hardening**:
   - Rotate JWT_SECRET regularly
   - Setup SMTP email monitoring
   - Configure CDN/WAF for DDoS protection
   - Enable CloudWatch Logs retention

## 8. Rollback Plan

If issues arise, rollback by:

1. **Disable new registrations** (API Gateway throttling to 0):
   ```bash
   aws apigateway update-stage \
     --rest-api-id YOUR_API_ID \
     --stage-name staging \
     --patch-operations op=replace,path=/throttle/rateLimit,value=0
   ```

2. **Revert migrations** (if database issues):
   ```bash
   # NOTE: Migrations are additive. Rolling back will DROP tables!
   # Only do this if no production data exists.
   
   # Rollback last migration
   cd serverless
   npx prisma migrate resolve --rolled-back 20251111201848_add_pr_intel_test_runs
   
   # Apply down migration manually if needed
   psql $DATABASE_URL < rollback.sql
   ```

3. **Disable email verification requirement**:
   - Update code to allow login without emailVerified=true
   - Deploy hotfix

## Summary

This guide provides a safe, tested path to enable first-account creation on staging with:
- ✅ Idempotent database migrations
- ✅ Email verification with rate limiting
- ✅ Secure session management
- ✅ No insecure randomness (verified: only crypto.randomBytes and otplib)
- ✅ Feature flags for gradual rollout (2FA, CSRF)
- ✅ Comprehensive test suite with curl examples

For support, check server logs and refer to the troubleshooting section above.
