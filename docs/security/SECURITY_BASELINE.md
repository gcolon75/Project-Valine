# Security Baseline Documentation

**Phase 1: Security Verification Consolidation**  
**Project Valine - Full Site Completion & Production Readiness Playbook**

> **Document Status:** Active Baseline  
> **Last Updated:** 2025-11-11  
> **Phase:** 1 of Production Readiness  
> **Owner:** Security Team

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [Current Security State](#current-security-state)
- [Security Feature Inventory](#security-feature-inventory)
  - [Email Verification](#email-verification)
  - [Two-Factor Authentication (2FA)](#two-factor-authentication-2fa)
  - [CSRF Protection](#csrf-protection)
  - [Rate Limiting](#rate-limiting)
  - [Session Management](#session-management)
  - [Password Reset](#password-reset)
  - [Secure Cookies](#secure-cookies)
  - [Content Security Policy](#content-security-policy)
  - [Audit Logging](#audit-logging)
- [Fail-Fast Requirements](#fail-fast-requirements)
- [Testing Matrix](#testing-matrix)
- [Activation Procedures](#activation-procedures)
- [Rollback Procedures](#rollback-procedures)
- [Security Checklist](#security-checklist)
- [References](#references)

---

## Executive Summary

This document establishes the security baseline for Project Valine's serverless backend. It consolidates all implemented security features, documents activation procedures for feature flags, and provides comprehensive testing matrices for security verification.

### Key Security Posture

- **Authentication:** ✅ Implemented (JWT + bcrypt)
- **Email Verification:** ✅ Implemented, disabled by default
- **2FA/TOTP:** ✅ Implemented, disabled by default
- **CSRF Protection:** ✅ Implemented, disabled by default
- **Rate Limiting:** ✅ Enabled (RATE_LIMITING_ENABLED=true)
- **Session Management:** ✅ Implemented (JWT-based)
- **Password Reset:** ✅ Implemented
- **Secure Cookies:** ✅ Implemented (HttpOnly, SameSite=Lax)
- **CSP:** 🟡 Report-only mode
- **Secret Rotation:** ❌ No documented procedure
- **Audit Logging:** 🟡 Partial (CloudWatch only)

---

## Current Security State

### Phase 0 Inventory Results

| Feature | Status | Flag | Default | Notes |
|---------|--------|------|---------|-------|
| Email Verification | ✅ Implemented | `EMAIL_ENABLED` | `false` | Tokens logged to console in dev |
| 2FA (TOTP) | ✅ Implemented | `TWO_FACTOR_ENABLED` | `false` | Ready for gradual rollout |
| CSRF Protection | ✅ Implemented | `CSRF_ENABLED` | `false` | For cookie-based auth |
| Rate Limiting | ✅ Enabled | `RATE_LIMITING_ENABLED` | `true` | Redis-backed, in-memory fallback |
| Session Tracking | ✅ Implemented | `USE_SESSION_TRACKING` | `false` | Optional database tracking |
| Password Reset | ✅ Implemented | N/A | N/A | Time-bound tokens |
| Secure Cookies | ✅ Implemented | N/A | N/A | HttpOnly, Secure (prod) |
| CSP | 🟡 Report-only | `CSP_REPORT_ONLY` | `true` | Testing phase |
| JWT Secret | ⚠️ Required | `JWT_SECRET` | Fail-fast | Must be set |
| Audit Logging | 🟡 Basic | N/A | N/A | CloudWatch only |

### Backend Implementation

**Location:** `/serverless/src/`

**Key Files:**
- `handlers/auth.js` - Authentication, registration, email verification
- `middleware/rateLimit.js` - Rate limiting with Redis
- `middleware/csrfMiddleware.js` - CSRF token management
- `utils/tokenManager.js` - JWT and cookie management
- `handlers/settings.js` - Privacy features (export, delete)

---

## Security Feature Inventory

### Email Verification

#### Status: ✅ Implemented

**Feature Flag:** `EMAIL_ENABLED`  
**Default:** `false` (console logging mode)  
**Location:** `serverless/src/handlers/auth.js`

#### Implementation Details

- **Token Generation:** `crypto.randomBytes(32).toString('hex')` (256-bit random)
- **Token Expiry:** 24 hours from creation
- **Storage:** `EmailVerificationToken` table (PostgreSQL)
- **Single-use:** Tokens deleted after successful verification
- **Auto-cleanup:** Expired tokens rejected and removed

#### Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/auth/verify-email` | POST | No | Verify email with token |
| `/auth/resend-verification` | POST | Yes | Resend verification email |

#### Email Modes

**Development Mode (`EMAIL_ENABLED=false`):**
```powershell
# Verification emails logged to console
[EmailVerification] Token: abc123def456...
[EmailVerification] Link: http://localhost:5173/verify-email?token=abc123def456...
```

**Production Mode (`EMAIL_ENABLED=true`):**
- Requires SMTP configuration
- Sends actual emails via configured provider
- Uses `FRONTEND_URL` for verification links

#### Testing Procedures

**Positive Test - Successful Verification:**
```powershell
# 1. Register a new user
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/register" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{ "email": "test@example.com", "password": "SecurePass123!", "username": "testuser", "displayName": "Test User" }' -ContentType 'application/json'
```

**Negative Test - Expired Token:**
```powershell
# Use a token older than 24 hours
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/verify-email" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{"token": "expired-token-123"}' -ContentType 'application/json'
```

**Negative Test - Invalid Token:**
```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/verify-email" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{"token": "invalid-token"}' -ContentType 'application/json'
```

**Rate Limit Test - Resend Verification:**
```powershell
# Resend verification multiple times rapidly
for i in {1..15}; do
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Authorization" = "Bearer <token>"
    "Content-Type" = "application/json"
}
```

---

### Two-Factor Authentication (2FA)

#### Status: ✅ Implemented

**Feature Flag:** `TWO_FACTOR_ENABLED`  
**Default:** `false`  
**Location:** `serverless/src/handlers/auth.js`, `serverless/src/middleware/2fa.js`

#### Implementation Details

- **Algorithm:** TOTP (Time-based One-Time Password)
- **Library:** `otplib` with `authenticator` strategy
- **Window:** 30-second time steps
- **Recovery Codes:** 8 codes, single-use, format `XXXX-XXXX-XXXX`
- **Secret Storage:** Encrypted in database
- **Encryption:** `TOTP_ENCRYPTION_KEY` environment variable

#### Enrollment Flow

**Step 1: Start Enrollment**
```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Authorization" = "Bearer <token>"
    "Content-Type" = "application/json"
}
```

**Step 2: Verify and Complete**
```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Authorization" = "Bearer <token>"
    "Content-Type" = "application/json"
} -Body '{"code": "123456"}' -ContentType 'application/json'
```

#### Testing Procedures

**Positive Test - Successful Enrollment:**
```powershell
# 1. Enroll
TOKEN="<valid-jwt>"
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
} -Body '{\' -ContentType 'application/json'
```

**Negative Test - Invalid Code:**
```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
} -Body '{"code": "000000"}' -ContentType 'application/json'
```

**Negative Test - Expired Code:**
```powershell
# Wait >30 seconds, use old code
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
} -Body '{"code": "<old-code>"}' -ContentType 'application/json'
```

---

### CSRF Protection

#### Status: ✅ Implemented

**Feature Flag:** `CSRF_ENABLED`  
**Default:** `false`  
**Location:** `serverless/src/middleware/csrfMiddleware.js`

#### Implementation Details

- **Token Generation:** `crypto.randomBytes(32).toString('hex')`
- **Storage:** Dual-submit cookie pattern
- **Cookie Name:** `csrf-token` (readable by client)
- **Header Name:** `X-CSRF-Token`
- **Validation:** Token must match between cookie and header
- **Scope:** Applied to POST, PUT, PATCH, DELETE requests

#### CSRF Flow

**1. Get CSRF Token (Safe Request):**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/auth/me" -Method Get -Headers @{
    "Authorization" = "Bearer <token>"
}
```

**2. Use CSRF Token (Mutating Request):**
```powershell
CSRF_TOKEN=$(Select-String csrf-token cookies.txt | awk '{print $7}')

Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Authorization" = "Bearer <token>"
    "X-CSRF-Token" = "$CSRF_TOKEN"
    "Content-Type" = "application/json"
} -Body '{"headline": "Updated Headline"}' -ContentType 'application/json'
```

#### Testing Procedures

**Positive Test - Valid CSRF Token:**
```powershell
# 1. Get token from safe endpoint
Invoke-RestMethod -Uri "http://localhost:3001/auth/me" -Method Get -Headers @{
    "Authorization" = "Bearer <token>"
    "Authorization" = "Bearer <token>"
    "X-CSRF-Token" = "$CSRF"
} -Body '{"theme": "dark"}' -ContentType 'application/json'
```

**Negative Test - Missing CSRF Token:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/me/preferences" -Method Post -Headers @{
    "Authorization" = "Bearer <token>"
    "Content-Type" = "application/json"
} -Body '{"theme": "dark"}' -ContentType 'application/json'
```

**Negative Test - Invalid CSRF Token:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/me/preferences" -Method Post -Headers @{
    "Authorization" = "Bearer <token>"
    "X-CSRF-Token" = "invalid-token-123"
    "Content-Type" = "application/json"
} -Body '{"theme": "dark"}' -ContentType 'application/json'
```

**Note:** CSRF protection is currently disabled by default (`CSRF_ENABLED=false`). When enabled, it applies to cookie-based authentication flows.

---

### Rate Limiting

#### Status: ✅ Enabled

**Feature Flag:** `RATE_LIMITING_ENABLED`  
**Default:** `true`  
**Location:** `serverless/src/middleware/rateLimit.js`

#### Implementation Details

- **Storage:** Redis (production), In-memory (fallback)
- **Redis URL:** `REDIS_URL` environment variable
- **Identifier:** User ID (authenticated), IP address (unauthenticated)
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Response:** `429 Too Many Requests` with `Retry-After` header

#### Rate Limit Thresholds

| Endpoint Type | Limit | Window | Identifier |
|---------------|-------|--------|------------|
| Authentication (`/auth/*`) | 10 requests | 15 minutes | IP or User |
| Write Operations (POST/PUT/PATCH/DELETE) | 100 requests | 1 hour | IP or User |
| Read Operations (GET) | 1000 requests | 1 hour | IP or User |
| Health Check (`/health`, `/meta`) | Unlimited | N/A | None |

#### Specific Endpoint Limits

**Login:**
- 10 attempts per 15 minutes per IP
- 10 attempts per 15 minutes per email
- Block duration: 15 minutes

**Registration:**
- 10 attempts per 15 minutes per IP
- Prevents automated account creation

**Email Verification Resend:**
- 10 requests per 15 minutes per user

#### Testing Procedures

**Positive Test - Within Limit:**
```powershell
# Make requests within limit
for i in {1..5}; do
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{"email":"test@example.com","password":"wrong"}' -ContentType 'application/json'
```

**Negative Test - Exceed Limit:**
```powershell
# Exceed auth endpoint limit (10/15min)
for i in {1..12}; do
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{"email":"test@example.com","password":"wrong"}' -ContentType 'application/json'
```

**Response Headers Test:**
```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{"email":"test@example.com","password":"test123"}' -ContentType 'application/json'
```

**Redis Failover Test:**
```powershell
# Stop Redis (simulated)
# Rate limiting should fall back to in-memory

Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{"email":"test@example.com","password":"test123"}' -ContentType 'application/json'
```

---

### Session Management

#### Status: ✅ Implemented

**Feature Flag:** `USE_SESSION_TRACKING`  
**Default:** `false` (JWT-only, stateless)  
**Location:** `serverless/src/utils/tokenManager.js`

#### JWT-Based Sessions (Default)

**Configuration:**
- Token Type: JWT (JSON Web Token)
- Algorithm: HS256 (HMAC with SHA-256)
- Access Token Expiry: 30 minutes
- Refresh Token Expiry: 7 days
- Storage: HttpOnly cookies (production), localStorage (dev)
- Stateless: No server-side session tracking by default

**Token Structure:**
```json
{
  "userId": "cm123abc",
  "type": "access",
  "iat": 1699564800,
  "exp": 1699566600
}
```

#### Database Session Tracking (Optional)

**Enable:** Set `USE_SESSION_TRACKING=true`

**Features:**
- Session table with IP and user agent
- Last activity tracking
- Manual session revocation
- Automatic cleanup on password reset

**Endpoints (when enabled):**
- `GET /api/privacy/sessions` - List active sessions
- `DELETE /api/privacy/sessions/:sessionId` - Revoke session

#### Testing Procedures

**Positive Test - JWT Session:**
```powershell
# 1. Login
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{"email":"test@example.com","password":"SecurePass123!"}' -ContentType 'application/json'
```

**Positive Test - Token Refresh:**
```powershell
# Wait 31 minutes or manually expire access token

# Refresh token
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Post```

**Negative Test - Expired Access Token:**
```powershell
# Use expired access token
Invoke-RestMethod -Uri "http://localhost:3001/auth/me" -Method Get -Headers @{
    "Authorization" = "Bearer <expired-token>"
}
```

**Negative Test - Invalid Token:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/auth/me" -Method Get -Headers @{
    "Authorization" = "Bearer invalid.token.here"
}
```

#### Session Revocation Test

**Logout:**
```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post```

---

### Password Reset

#### Status: ✅ Implemented

**Location:** `serverless/src/handlers/auth.js`

#### Implementation Details

- **Token Generation:** `crypto.randomBytes(32).toString('hex')`
- **Token Expiry:** 1 hour from request
- **Storage:** `PasswordResetToken` table
- **Single-use:** Tokens deleted after successful reset
- **Rate Limiting:** 10 requests per 15 minutes per IP
- **Email:** Sent via SMTP (if `EMAIL_ENABLED=true`)

#### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/request-password-reset` | POST | Request reset token |
| `/auth/reset-password` | POST | Complete password reset |

#### Flow Diagram

```
User                     API                      Database
  |                       |                           |
  |-- Request Reset ----->|                           |
  |   {email}             |--- Check user exists ---->|
  |                       |<-- User data --------------|
  |                       |--- Generate token -------->|
  |                       |--- Send email ------------>|
  |<-- Success ----------|                           |
  |                       |                           |
  |-- Reset Password ---->|                           |
  |   {token, password}   |--- Validate token -------->|
  |                       |<-- Token data -------------|
  |                       |--- Hash password --------->|
  |                       |--- Update user ----------->|
  |                       |--- Delete token ---------->|
  |<-- Success ----------|                           |
```

#### Testing Procedures

**Positive Test - Full Reset Flow:**
```powershell
# 1. Request password reset
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Content-Type" = "application/json"
    "Content-Type" = "application/json"
    "Content-Type" = "application/json"
} -Body '{"email": "test@example.com"}' -ContentType 'application/json'
```

**Negative Test - Expired Token:**
```powershell
# Use token older than 1 hour
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{ "token": "expired-token-123", "newPassword": "NewPassword123!" }' -ContentType 'application/json'
```

**Negative Test - Reused Token:**
```powershell
# Use same token twice
TOKEN="abc123def456..."

# First use (should succeed)
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Content-Type" = "application/json"
    "Content-Type" = "application/json"
} -Body '{\' -ContentType 'application/json'
```

**Negative Test - Non-existent Email:**
```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{"email": "nonexistent@example.com"}' -ContentType 'application/json'
```

**Rate Limit Test:**
```powershell
# Attempt 12 password reset requests
for i in {1..12}; do
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{"email": "test@example.com"}' -ContentType 'application/json'
```

---

### Secure Cookies

#### Status: ✅ Implemented

**Location:** `serverless/src/utils/tokenManager.js`

#### Cookie Attributes

All authentication cookies use the following security flags:

```
HttpOnly    - Prevents JavaScript access (XSS protection)
Secure      - HTTPS only (enabled when NODE_ENV=production)
SameSite    - Lax (CSRF protection)
Path        - / (available to all routes)
Max-Age     - Token lifetime in seconds
Domain      - Configurable via COOKIE_DOMAIN (optional)
```

#### Cookie Configuration

**Development:**
```
access_token=<jwt>; HttpOnly; Path=/; SameSite=Lax; Max-Age=1800
refresh_token=<jwt>; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800
```

**Production:**
```
access_token=<jwt>; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=1800
refresh_token=<jwt>; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=604800
```

#### Testing Procedures

**Verify Cookie Attributes:**
```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{"email":"test@example.com","password":"SecurePass123!"}' -ContentType 'application/json'
```

**Verify HttpOnly (JavaScript Cannot Access):**
```javascript
// In browser console after login
console.log(document.cookie);

// Expected: Empty string or no auth cookies visible
// access_token and refresh_token should NOT appear
```

**Verify SameSite Protection:**
```html
<!-- Attempt CSRF attack from different origin -->
<form action="https://api.valine.com/api/settings" method="POST">
  <input name="theme" value="dark">
  <input type="submit">
</form>

<!-- Expected: Cookies not sent with cross-site POST (SameSite=Lax) -->
```

**Verify Secure Flag (Production):**
```powershell
# In production with HTTPS
Invoke-RestMethod -Uri "https://api.valine.com/auth/login" -Method Get -Headers @{
    "Content-Type" = "application/json"
} -Body '{"email":"test@example.com","password":"SecurePass123!"}' -ContentType 'application/json'
```

---

### Content Security Policy

#### Status: 🟡 Report-only Mode

**Feature Flag:** `CSP_REPORT_ONLY`  
**Default:** `true` (report-only mode)  
**Location:** Frontend `index.html`, API Gateway headers

#### Current CSP Directives

```
Content-Security-Policy-Report-Only:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://api.projectvaline.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

#### Testing Procedures

**Monitor CSP Violations:**
```powershell
# Check browser console for CSP reports
# Open: Chrome DevTools > Console > Filter: "CSP"

# Expected: Violations logged but not blocked (report-only)
```

**Test Resource Loading:**
```powershell
# Verify allowed resources load correctly
Invoke-WebRequest -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Get

# Expected: 200 OK

# Verify blocked resources are reported
# Attempt to load script from unauthorized domain
# Expected: Loaded (report-only) but violation reported
```

**Activation Test (when ready):**
```powershell
# Set CSP_REPORT_ONLY=false in production
# Monitor for broken functionality
# Review violation reports
# Adjust directives as needed
```

---

### Audit Logging

#### Status: 🟡 Partial (CloudWatch only)

**Location:** CloudWatch Logs, Console logs (development)

#### What's Logged

**Authentication Events:**
- Login attempts (success/failure)
- Registration
- Logout
- Email verification
- Password resets
- 2FA enrollment/verification

**Currently NOT Logged:**
- Profile updates
- Settings changes
- Privacy actions (export, delete)
- Session revocations

#### Log Format

```json
{
  "timestamp": "2025-11-11T21:00:00.000Z",
  "level": "info",
  "action": "auth.login",
  "userId": "cm123abc",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "success": true,
  "metadata": {
    "email": "test@example.com"
  }
}
```

#### Testing Procedures

**Verify Login Logging:**
```powershell
# 1. Login
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{"email":"test@example.com","password":"SecurePass123!"}' -ContentType 'application/json'
```

**Verify Failed Login Logging:**
```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{"email":"test@example.com","password":"wrongpassword"}' -ContentType 'application/json'
```

**Note:** Full audit logging implementation (database-backed, user-queryable) is planned for Phase 2.

---

## Fail-Fast Requirements

### Critical Environment Variables

The following environment variables are **REQUIRED** for the application to start. Missing values will cause the application to fail immediately with a clear error message.

#### JWT_SECRET

**Purpose:** Signs and verifies JWT tokens  
**Requirement:** MUST be set before application start  
**Format:** Strong random string (minimum 32 characters, recommend 64+)

**Validation:**
```javascript
// serverless/src/utils/tokenManager.js
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET === 'dev-secret-key-change-in-production') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET must be set in production');
  }
  console.warn('WARNING: Using development JWT_SECRET. DO NOT use in production!');
}
```

**Generate Secure Secret:**
```powershell
# Method 1: OpenSSL
openssl rand -base64 64

# Method 2: Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# Method 3: /dev/urandom
head -c 64 /dev/urandom | base64
```

**Testing:**
```powershell
# Test fail-fast on missing JWT_SECRET (production)
unset JWT_SECRET
NODE_ENV=production npm start

# Expected: Application fails to start
# Error: "FATAL: JWT_SECRET must be set in production"

# Test warning on dev secret (production)
$env:JWT_SECRET = "dev-secret-key-change-in-production"
NODE_ENV=production npm start

# Expected: Application fails to start or logs critical warning
```

#### DATABASE_URL

**Purpose:** PostgreSQL connection string  
**Requirement:** MUST be set before application start  
**Format:** `postgresql://username:password@host:port/database`

**Validation:**
```javascript
// serverless/src/db/client.js
if (!process.env.DATABASE_URL) {
  throw new Error('FATAL: DATABASE_URL environment variable is required');
}
```

**Testing:**
```powershell
# Test fail-fast on missing DATABASE_URL
unset DATABASE_URL
npm start

# Expected: Application fails to start
# Error: "FATAL: DATABASE_URL environment variable is required"
```

### Optional but Recommended

#### REDIS_URL (Rate Limiting)

**Purpose:** Redis connection for distributed rate limiting  
**Warning:** Falling back to in-memory on multi-instance deployment breaks rate limiting

**Validation:**
```javascript
if (!process.env.REDIS_URL && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: REDIS_URL not set. Rate limiting will use in-memory store (not distributed)');
}
```

#### TOTP_ENCRYPTION_KEY (2FA)

**Purpose:** Encrypts 2FA secrets in database  
**Required When:** `TWO_FACTOR_ENABLED=true`

**Validation:**
```javascript
if (process.env.TWO_FACTOR_ENABLED === 'true' && !process.env.TOTP_ENCRYPTION_KEY) {
  throw new Error('FATAL: TOTP_ENCRYPTION_KEY required when 2FA is enabled');
}
```

---

## Testing Matrix

### Authentication Endpoints Test Matrix

| Endpoint | Method | Test Case | Input | Expected Output | Expected Status |
|----------|--------|-----------|-------|-----------------|-----------------|
| `/auth/register` | POST | Valid registration | Valid email, password, username | User created, JWT returned | 201 |
| `/auth/register` | POST | Duplicate email | Existing email | Error message | 409 |
| `/auth/register` | POST | Weak password | Password < 6 chars | Error message | 400 |
| `/auth/register` | POST | Invalid email | Malformed email | Error message | 400 |
| `/auth/register` | POST | Missing fields | Incomplete data | Error message | 400 |
| `/auth/login` | POST | Valid credentials | Correct email/password | JWT returned | 200 |
| `/auth/login` | POST | Invalid password | Wrong password | Error message | 401 |
| `/auth/login` | POST | Non-existent user | Unknown email | Error message | 401 |
| `/auth/login` | POST | Rate limit exceeded | 11+ failed attempts | Rate limit error | 429 |
| `/auth/verify-email` | POST | Valid token | Correct token | Email verified | 200 |
| `/auth/verify-email` | POST | Expired token | Token > 24h old | Error message | 400 |
| `/auth/verify-email` | POST | Invalid token | Random string | Error message | 400 |
| `/auth/verify-email` | POST | Reused token | Already used token | Error message | 400 |
| `/auth/me` | GET | Valid JWT | Valid token | User data | 200 |
| `/auth/me` | GET | Invalid JWT | Bad token | Unauthorized | 401 |
| `/auth/me` | GET | Expired JWT | Expired token | Unauthorized | 401 |
| `/auth/me` | GET | No token | Missing header | Unauthorized | 401 |
| `/auth/refresh` | POST | Valid refresh token | Valid cookie | New tokens | 200 |
| `/auth/refresh` | POST | Invalid refresh token | Bad cookie | Unauthorized | 401 |
| `/auth/refresh` | POST | Expired refresh token | Expired cookie | Unauthorized | 401 |
| `/auth/logout` | POST | Authenticated | Valid token | Cookies cleared | 200 |

### CSRF Protection Test Scenarios

| Scenario | CSRF Header | Cookie Present | Expected Result |
|----------|-------------|----------------|-----------------|
| Valid request with CSRF token | Present & matches | Yes | 200 OK |
| Valid request without CSRF (flag disabled) | Absent | Yes | 200 OK |
| Missing CSRF token (flag enabled) | Absent | Yes | 403 Forbidden |
| Invalid CSRF token (flag enabled) | Present but wrong | Yes | 403 Forbidden |
| CSRF token mismatch (flag enabled) | Different from cookie | Yes | 403 Forbidden |
| No CSRF cookie | Present | No | 403 Forbidden |
| Safe method (GET) | Absent | Yes | 200 OK |

### Rate Limit Verification Tests

| Test | Endpoint | Requests | Timeframe | Expected Behavior |
|------|----------|----------|-----------|-------------------|
| Auth endpoint normal use | `/auth/login` | 5 | 15 min | All succeed |
| Auth endpoint limit | `/auth/login` | 11 | 15 min | 1-10 succeed, 11+ blocked |
| Write endpoint normal | `/api/profiles` | 50 | 1 hour | All succeed |
| Write endpoint limit | `/api/profiles` | 101 | 1 hour | 1-100 succeed, 101+ blocked |
| Read endpoint normal | `/api/profiles/:id` | 500 | 1 hour | All succeed |
| Read endpoint limit | `/api/profiles/:id` | 1001 | 1 hour | 1-1000 succeed, 1001+ blocked |
| Health check unlimited | `/health` | 10000 | 1 hour | All succeed |
| Rate limit headers | `/auth/login` | 1 | N/A | X-RateLimit-* headers present |
| Retry-After header | `/auth/login` | 11 | 15 min | Retry-After header on 429 |
| Rate limit reset | `/auth/login` | 10, wait 16 min, 1 | 16 min | All succeed |

### Session Management Tests

| Test | Action | Expected Result |
|------|--------|-----------------|
| Login | POST /auth/login | access_token and refresh_token cookies set |
| Authenticated request | GET /auth/me with cookie | User data returned |
| Expired access token | GET /auth/me with expired | 401 Unauthorized |
| Token refresh | POST /auth/refresh | New access_token and refresh_token |
| Logout | POST /auth/logout | Cookies cleared |
| Reuse after logout | GET /auth/me after logout | 401 Unauthorized |
| Invalid token | GET /auth/me with invalid | 401 Unauthorized |
| No token | GET /auth/me without cookie | 401 Unauthorized |
| Refresh token rotation | POST /auth/refresh twice | First succeeds, second fails |

---

## Activation Procedures

### Enabling EMAIL_ENABLED Flag

**Purpose:** Enable actual email sending via SMTP  
**Current State:** `false` (console logging mode)  
**Target State:** `true` (SMTP emails)

#### Pre-Activation Checklist

- [ ] SMTP server configured and accessible
- [ ] SMTP credentials stored securely (AWS Secrets Manager)
- [ ] `FRONTEND_URL` environment variable set correctly
- [ ] Email templates tested
- [ ] Bounce/complaint handling configured
- [ ] Email verification flow tested end-to-end

#### Activation Steps

**Step 1: Configure SMTP Settings**
```powershell
# Set in serverless.yml or AWS Systems Manager Parameter Store
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=<stored-in-secrets-manager>
SMTP_FROM=noreply@valine.app
```

**Step 2: Test Email Sending (Staging)**
```powershell
# Deploy to staging with EMAIL_ENABLED=false
serverless deploy --stage staging

# Test email in dev mode (logs)
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{ "email": "test@example.com", "username": "testuser", "displayName": "Test", "password": "SecurePass123!" }' -ContentType 'application/json'
```

**Step 3: Enable Email Sending (Staging)**
```powershell
# Update serverless.yml or parameter store
EMAIL_ENABLED=true

# Deploy
serverless deploy --stage staging

# Test actual email sending
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{"email":"real@example.com","username":"test","displayName":"Test","password":"SecurePass123!"}' -ContentType 'application/json'
```

**Step 4: Monitor and Validate**
```powershell
# Monitor CloudWatch Logs for email errors
aws logs tail /aws/lambda/valine-staging-auth --follow

# Check for:
# - SMTP connection errors
# - Authentication failures
# - Bounce rates
# - Delivery times
```

**Step 5: Production Rollout**
```powershell
# After successful staging validation

# Update production environment
EMAIL_ENABLED=true

# Deploy
serverless deploy --stage prod

# Monitor closely for first 24 hours
# Test with internal accounts first
```

#### Rollback Procedure

```powershell
# Set EMAIL_ENABLED=false
EMAIL_ENABLED=false

# Redeploy
serverless deploy --stage prod

# Verification emails will return to console logging
# Users can still verify via manual token entry if needed
```

---

### Enabling TWO_FACTOR_ENABLED Flag

**Purpose:** Enable 2FA/TOTP authentication  
**Current State:** `false` (disabled)  
**Target State:** `true` (enabled for users who enroll)

#### Pre-Activation Checklist

- [ ] `TOTP_ENCRYPTION_KEY` generated and stored securely
- [ ] 2FA enrollment flow tested thoroughly
- [ ] Recovery code system tested
- [ ] User documentation prepared
- [ ] Support team trained on 2FA issues
- [ ] Recovery process documented

#### Activation Steps

**Step 1: Generate Encryption Key**
```powershell
# Generate strong encryption key
TOTP_ENCRYPTION_KEY=$(openssl rand -base64 32)

# Store in AWS Secrets Manager
aws secretsmanager create-secret \
  --name valine/prod/totp-encryption-key \
  --secret-string "$TOTP_ENCRYPTION_KEY"
```

**Step 2: Update Environment Configuration**
```powershell
# serverless.yml or parameter store
TOTP_ENCRYPTION_KEY=${ssm:/valine/prod/totp-encryption-key~true}
TWO_FACTOR_ENABLED=false  # Keep disabled for testing
```

**Step 3: Test 2FA Flow (Staging)**
```powershell
# Deploy to staging
serverless deploy --stage staging

# Test enrollment
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $TOKEN"
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
} -Body '{"email":"test@example.com","password":"SecurePass123!"}' -ContentType 'application/json'
```

**Step 4: Beta Rollout (Gradual)**
```powershell
# Enable for beta users only
TWO_FACTOR_ENABLED=true
FEATURE_2FA_BETA=true  # If implementing beta flag

# Deploy
serverless deploy --stage prod

# Monitor:
# - Enrollment success rate
# - Login failures
# - Recovery code usage
# - Support tickets
```

**Step 5: Full Rollout**
```powershell
# After 2-4 weeks of beta testing
TWO_FACTOR_ENABLED=true

# Announce to all users via email/in-app notification
# Provide documentation and support
```

#### Rollback Procedure

```powershell
# Disable 2FA enrollment (keeps existing enabled)
TWO_FACTOR_ENABLED=false

# Redeploy
serverless deploy --stage prod

# Users with 2FA already enabled can still use it
# New enrollments are blocked
# To fully disable: Add flag to skip 2FA verification
```

---

### Enabling CSRF_ENABLED Flag

**Purpose:** Enable CSRF protection for cookie-based auth  
**Current State:** `false`  
**Target State:** `true` (when using cookie auth)  
**Dependency:** Cookie-based authentication

#### Pre-Activation Checklist

- [ ] Cookie-based authentication enabled and tested
- [ ] Frontend updated to handle CSRF tokens
- [ ] `X-Requested-With` header added to API calls
- [ ] CSRF token refresh logic implemented
- [ ] All API endpoints tested with CSRF
- [ ] Error handling for CSRF failures

#### Activation Steps

**Step 1: Verify Frontend Integration**
```javascript
// Ensure frontend is sending X-CSRF-Token header
// client/src/lib/api.js should include:

axios.interceptors.request.use((config) => {
  // Get CSRF token from cookie
  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf-token='))
    ?.split('=')[1];
  
  // Add to mutating requests
  if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  
  return config;
});
```

**Step 2: Test CSRF Protection (Staging)**
```powershell
# Deploy with CSRF enabled
CSRF_ENABLED=true
serverless deploy --stage staging

# Test positive case
Invoke-RestMethod -Uri "https://staging-api/auth/me" -Method Get -Headers @{
    "Authorization" = "Bearer $TOKEN"
    "Authorization" = "Bearer $TOKEN"
    "X-CSRF-Token" = "$CSRF"
    "Authorization" = "Bearer $TOKEN"
} -Body '{"theme":"dark"}' -ContentType 'application/json'
```

**Step 3: Enable in Production**
```powershell
# Update environment
CSRF_ENABLED=true

# Deploy
serverless deploy --stage prod

# Monitor error rates
# Watch for legitimate requests being blocked
```

#### Rollback Procedure

```powershell
# Disable CSRF protection
CSRF_ENABLED=false

# Redeploy
serverless deploy --stage prod

# Applications will continue to send CSRF tokens
# Server will ignore them (no validation)
```

---

### Moving CSP from Report-Only to Enforcement

**Purpose:** Enforce Content Security Policy  
**Current State:** Report-only mode  
**Target State:** Enforcement mode

#### Pre-Activation Checklist

- [ ] CSP reports reviewed for 30+ days
- [ ] All violations addressed or whitelisted
- [ ] No critical violations in last 7 days
- [ ] External resources inventory verified
- [ ] Nonce implementation for inline scripts (if needed)
- [ ] Browser compatibility tested

#### Activation Steps

**Step 1: Analyze CSP Reports (Ongoing)**
```powershell
# Review browser console violations
# Check for patterns:
# - Unauthorized scripts
# - Inline style violations
# - External resource blocks
# - Frame embedding attempts

# Categorize violations:
# - False positives (whitelist)
# - Legitimate issues (fix)
# - Attack attempts (monitor)
```

**Step 2: Address Violations**
```powershell
# Common fixes:

# 1. Inline styles → Extract to CSS files
# Before: <div style="color: red;">
# After: <div class="text-red-500">

# 2. Inline scripts → External files
# Before: <script>doSomething();</script>
# After: <script src="/js/app.js"></script>

# 3. eval() usage → Refactor
# Before: eval(userCode)
# After: Use Function constructor or avoid dynamic execution

# 4. External resources → Whitelist in CSP
# Add to connect-src: https://api.trusted-service.com
```

**Step 3: Test Enforcement (Staging)**
```powershell
# Update CSP to enforcement mode (staging)
CSP_REPORT_ONLY=false

# Deploy
serverless deploy --stage staging

# Functional testing:
# - Login flow
# - Content creation
# - Media upload
# - External API calls
# - Font loading
# - Image display

# Check for console errors
# Verify no functionality broken
```

**Step 4: Gradual Production Rollout**
```powershell
# Option A: Enable for 10% of users (A/B test)
# Requires feature flag system

# Option B: Enable for specific user agents (test browsers)
# Requires custom CSP middleware

# Option C: Full rollout (recommended after thorough staging test)
CSP_REPORT_ONLY=false
serverless deploy --stage prod

# Monitor closely for 48 hours
# Watch error rates and user reports
```

#### Rollback Procedure

```powershell
# Revert to report-only mode
CSP_REPORT_ONLY=true

# Redeploy immediately
serverless deploy --stage prod --force

# Violations will be reported but not blocked
# Functionality restored immediately
```

---

## Rollback Procedures

### Emergency Disable - All Security Features

**When to Use:**
- Critical production issue related to security feature
- Widespread authentication failures
- Immediate mitigation required

**Procedure:**
```powershell
# 1. Disable all optional security features
$env:EMAIL_ENABLED = "false"
$env:TWO_FACTOR_ENABLED = "false"
$env:CSRF_ENABLED = "false"
$env:USE_SESSION_TRACKING = "false"

# 2. Keep essential features (rate limiting is safe to keep)
$env:RATE_LIMITING_ENABLED = "true"

# 3. CSP to report-only
$env:CSP_REPORT_ONLY = "true"

# 4. Deploy immediately
serverless deploy --stage prod --force

# 5. Verify basic auth still works
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{"email":"test@example.com","password":"test123"}' -ContentType 'application/json'
```

### Selective Feature Rollback

#### Rollback Email Verification
```powershell
EMAIL_ENABLED=false
serverless deploy --stage prod

# Effect: Emails logged to console instead of sent
# Impact: Minimal - verification tokens still work
```

#### Rollback 2FA
```powershell
TWO_FACTOR_ENABLED=false
serverless deploy --stage prod

# Effect: New enrollments disabled, existing 2FA still enforced
# Impact: Users with 2FA can't disable or re-enroll
```

#### Rollback CSRF Protection
```powershell
CSRF_ENABLED=false
serverless deploy --stage prod

# Effect: CSRF tokens generated but not validated
# Impact: None if using JWT in Authorization header
```

#### Rollback Rate Limiting
```powershell
RATE_LIMITING_ENABLED=false
serverless deploy --stage prod

# Effect: All rate limits removed
# Impact: Increased risk of brute force and DoS
# Use ONLY in emergency
```

### Database Rollback

**Not Required** - All security features are flag-based, no schema changes for disabling.

**If Database Rollback Needed (schema changes):**
```powershell
# Example: Reverting migration that added 2FA columns
cd api
npx prisma migrate resolve --rolled-back 20241105_add_2fa_fields

# Manual SQL rollback
psql $DATABASE_URL << EOF
ALTER TABLE "User" DROP COLUMN "twoFactorEnabled";
ALTER TABLE "User" DROP COLUMN "twoFactorSecret";
DROP TABLE "TwoFactorRecoveryCode";
EOF
```

### Recovery Steps After Rollback

**1. Incident Documentation**
```powershell
# Document in incident log:
# - What was rolled back
# - Why (root cause)
# - When
# - Who authorized
# - Impact assessment
```

**2. Root Cause Analysis**
```powershell
# Investigate:
# - CloudWatch logs
# - Error patterns
# - User reports
# - Metrics/dashboards

# Identify:
# - Configuration error
# - Code bug
# - Environment issue
# - User behavior pattern
```

**3. Fix and Re-deploy**
```powershell
# Fix root cause
# Test in staging thoroughly
# Gradual re-rollout (not immediate full deployment)

# Example: 10% → 50% → 100% over days
```

### Communication Templates

**Internal Alert (Slack/Teams):**
```
🚨 SECURITY FEATURE ROLLBACK - PROD

Feature: [EMAIL_ENABLED / TWO_FACTOR_ENABLED / etc]
Status: ROLLED BACK
Reason: [Brief description]
Impact: [User-facing impact]
Action: [What was done]
ETA Fix: [Estimated re-deployment time]
Incident Lead: @username
```

**User-Facing Notice (if needed):**
```
We've temporarily disabled [feature name] to address a technical issue.
Your account security is not affected. We'll notify you when the feature is restored.
Expected resolution: [timeframe]
```

---

## Security Checklist

### Pre-Production Deployment

#### Required (Fail-Fast)
- [ ] `JWT_SECRET` set to strong random value (64+ chars)
- [ ] `JWT_SECRET` different from development default
- [ ] `DATABASE_URL` configured and accessible
- [ ] `NODE_ENV=production` set

#### Highly Recommended
- [ ] `REDIS_URL` configured for distributed rate limiting
- [ ] `EMAIL_ENABLED=true` with SMTP configured
- [ ] `TOTP_ENCRYPTION_KEY` generated and stored securely
- [ ] SSL/TLS certificates valid and not expiring soon
- [ ] Security headers verified in API responses
- [ ] CSP tested thoroughly in report-only mode

#### Security Features
- [ ] Rate limiting enabled (`RATE_LIMITING_ENABLED=true`)
- [ ] Email verification tested end-to-end
- [ ] Password reset flow tested
- [ ] Session management tested (login/logout/refresh)
- [ ] Secure cookie attributes verified (HttpOnly, Secure, SameSite)
- [ ] 2FA enrollment and verification tested (if enabled)
- [ ] CSRF protection tested (if enabled)

#### Monitoring & Logging
- [ ] CloudWatch Logs configured and accessible
- [ ] Audit log entries verified for auth events
- [ ] Error tracking configured (Sentry/similar)
- [ ] Rate limit metrics monitored
- [ ] Failed login alerts configured
- [ ] API response time monitoring

#### Testing
- [ ] All authentication endpoints tested (see Testing Matrix)
- [ ] Rate limits verified for all endpoint types
- [ ] CSRF protection tested (if enabled)
- [ ] Session expiry and refresh tested
- [ ] Password complexity requirements enforced
- [ ] Email verification token expiry tested
- [ ] 2FA recovery code tested (if enabled)

#### Documentation
- [ ] Environment variables documented
- [ ] Runbook for common issues created
- [ ] Incident response plan reviewed
- [ ] Rollback procedures tested in staging
- [ ] User-facing security docs updated

#### Secrets Management
- [ ] No secrets in code or config files
- [ ] AWS Secrets Manager or Parameter Store used
- [ ] Secret rotation schedule defined
- [ ] Backup of encryption keys stored securely
- [ ] Access to secrets limited (least privilege)

### Post-Deployment Verification

#### Within 1 Hour
- [ ] Login flow working for test accounts
- [ ] Registration working for new accounts
- [ ] Email verification emails being sent (if enabled)
- [ ] Rate limiting functioning (test with repeated requests)
- [ ] No 5xx errors in CloudWatch
- [ ] API response times within SLA

#### Within 24 Hours
- [ ] Monitor failed login attempts
- [ ] Check for unusual rate limit hits
- [ ] Review CSP violation reports
- [ ] Verify no CSRF errors (if enabled)
- [ ] Check email delivery rate
- [ ] Review user-reported issues

#### Within 1 Week
- [ ] Analyze authentication metrics
- [ ] Review audit logs for anomalies
- [ ] Check for password reset abuse
- [ ] Monitor 2FA enrollment rate (if enabled)
- [ ] Assess rate limit effectiveness
- [ ] Plan CSP enforcement (if ready)

---

## References

### Internal Documentation

- [Security Guide](./guide.md) - Comprehensive security features
- [Implementation Summary](./implementation.md) - Technical details
- [Rate Limiting](./rate_limiting.md) - Rate limit configuration
- [Cookie Auth](./cookie_auth.md) - HttpOnly cookie implementation
- [CSP Policy](./csp-policy.md) - Content Security Policy details
- [CSP Rollout Plan](./csp-rollout-plan.md) - CSP deployment strategy
- [Incident Response](./incident-response-auth-abuse.md) - Auth abuse handling
- [Environment Variables](./environment-variables.md) - All configuration options

### External Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Web security risks
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [CSP Level 3](https://www.w3.org/TR/CSP3/)

### Security Standards & Compliance

- [GDPR Compliance](https://gdpr.eu/) - Data protection requirements
- [PCI DSS](https://www.pcisecuritystandards.org/) - Payment card security (if applicable)
- [SOC 2](https://www.aicpa.org/soc) - Service organization controls
- [ISO 27001](https://www.iso.org/isoiec-27001-information-security.html) - Information security management

---

**Document Version:** 1.0.0  
**Last Review:** 2025-11-11  
**Next Review:** 2025-12-11  
**Owner:** Security Team  
**Status:** Active
