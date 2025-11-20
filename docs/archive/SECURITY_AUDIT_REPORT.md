# Project Valine - Comprehensive Security Audit Report

**Date:** November 12, 2025  
**Repository:** gcolon75/Project-Valine  
**Branch:** main (default)  
**Region:** us-west-2 (Oregon)  
**Reviewer:** GitHub Copilot Security Agent  
**Report Version:** 2.0 (Comprehensive)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Map](#1-architecture-map)
3. [Authentication & Authorization Flow Audit](#2-authentication--authorization-flow-audit)
4. [Risks and Gaps (Prioritized P0-P3)](#3-risks-and-gaps-prioritized-p0-p3)
5. [Concrete Fixes](#4-concrete-fixes)
6. [Acceptance Criteria](#5-acceptance-criteria)
7. [Prior Session Accomplishments](#6-prior-session-accomplishments)
8. [Action Plan (Ordered by Phase)](#7-action-plan-ordered-by-phase)
9. [Files to Create/Modify](#8-files-to-createmodify)
10. [Appendix: Testing Checklist](#appendix-testing-checklist)

---

## Executive Summary

### Current Security Posture

Project Valine is a LinkedIn-style collaborative platform for voice actors, writers, and artists. The application has been deployed with AWS infrastructure and implements several security best practices:

**✅ Strengths:**
- JWT-based authentication with HttpOnly cookies
- bcrypt password hashing (10 rounds)
- CloudFront Global WAF with IP allowlist (owner IP)
- API Gateway HTTP API (i72dxlcfcc) with resource policy IP restrictions
- CSRF middleware available (though disabled by default)
- Rate limiting middleware available
- Secure cookie flags in production (Secure, HttpOnly)
- Email verification flow implemented

**⚠️ Infrastructure Protection:**
- CloudFront Distribution: **dkmxy676d3vgc** (Global WAF IP allowlist)
- API Gateway HTTP API: **i72dxlcfcc** (us-west-2, resource policy /32 IP lock)
- REST API (legacy): **oocr9ahsyk** (Regional WAF)
- CloudFront default root object: `index.html`

### Critical Finding

**CRITICAL SECURITY GAP:** Production access control relies **entirely** on infrastructure-level IP restrictions. There are **NO application-level controls** to enforce:
1. Who can register accounts
2. Which registered users can login
3. Email-based access allowlisting

This violates the core requirement: **"Only the owner can log in to the live site."**

**Risk:** If the IP allowlist fails, is misconfigured, or is bypassed:
- Anyone can register an account (`POST /auth/register`)
- Any registered user can login and obtain session cookies
- No secondary verification layer exists

### Proposed Hardening

This report details surgical, feature-flagged changes to implement **defense in depth**:

1. **Registration Control:** `ENABLE_REGISTRATION=false` environment variable with backend enforcement
2. **Email Allowlist:** `ALLOWED_USER_EMAILS` post-authentication check
3. **Cookie Security:** Upgrade `SameSite=Lax` → `Strict` in production
4. **CORS Hardening:** Replace wildcard `*` with dynamic `FRONTEND_URL` origin
5. **Frontend Validation:** Build-time API base URL checks
6. **CSRF Protection:** Enable by default in production
7. **Rate Limiting:** Apply to registration endpoint
8. **Audit Logging:** Track authentication events

**Design Principles:**
- ✅ Minimal code changes (surgical edits only)
- ✅ Feature-flagged (development workflows preserved)
- ✅ Backward compatible (graceful degradation)
- ✅ Observable (logging + monitoring)
- ✅ Testable (unit + integration tests)

---

## 1. Architecture Map

### 1.1 Frontend (React + Vite)

**Location:** `/` (repository root)  
**Build Output:** `/dist`  
**Deployment:** S3 → CloudFront (dkmxy676d3vgc)

**Environment Variables:**
```bash
VITE_API_BASE=https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com  # Production API
VITE_ENABLE_AUTH=true                    # Enable HttpOnly cookie auth
VITE_CSRF_ENABLED=true                   # Enable CSRF protection
VITE_ENABLE_REGISTRATION=false           # 🆕 Proposed: Hide signup UI
VITE_USE_MSW=false                       # Disable mocks in production
```

**Key Files:**
- `src/services/authService.js` - API calls for login/register/logout
- `src/context/AuthContext.jsx` - Global auth state management
- `src/pages/Login.jsx` - Login page (includes signup link)
- `src/App.jsx` - Routing (signup route conditionally rendered)
- `vite.config.js` - Build configuration

**Current Issues:**
1. ❌ No `VITE_ENABLE_REGISTRATION` flag (signup UI always visible)
2. ❌ No build-time validation of `VITE_API_BASE` (could ship broken URL)
3. ⚠️ Authorization header fallback in production (XSS risk if token stolen)

---

### 1.2 Backend (Serverless + AWS Lambda)

**Location:** `/serverless`  
**Runtime:** Node.js 20.x  
**Framework:** Serverless Framework v3  
**API Gateway:** HTTP API `i72dxlcfcc` (us-west-2)

**Environment Variables:**
```bash
# Authentication
JWT_SECRET=<generated-secret>             # Required, currently in env vars (should migrate to Secrets Manager)
ENABLE_REGISTRATION=false                 # 🆕 Proposed: Disable registration in prod
ALLOWED_USER_EMAILS=owner@example.com     # 🆕 Proposed: Email allowlist

# Security Features
CSRF_ENABLED=false                        # Currently disabled (should enable in prod)
RATE_LIMITING_ENABLED=true                # Enabled
TWO_FACTOR_ENABLED=false                  # Optional feature

# Infrastructure
DATABASE_URL=postgresql://...             # RDS Postgres connection
FRONTEND_URL=https://dkmxy676d3vgc.cloudfront.net  # For CORS
COOKIE_DOMAIN=                            # Empty for same-domain cookies
NODE_ENV=production                       # production | development
```

**Key Files:**
- `serverless.yml` - Infrastructure as code (Lambda functions, API Gateway, env vars)
- `src/handlers/auth.js` - Authentication handlers (register, login, logout, refresh)
- `src/middleware/csrfMiddleware.js` - CSRF token generation and validation
- `src/middleware/rateLimit.js` - Rate limiting middleware
- `src/utils/tokenManager.js` - JWT token generation, cookie management
- `src/utils/headers.js` - CORS headers (currently wildcard `*`)

**Authentication Endpoints:**
```
POST   /auth/register          - Create new user account
POST   /auth/login             - Authenticate and issue tokens
POST   /auth/logout            - Clear auth cookies
POST   /auth/refresh           - Rotate tokens with refresh token
GET    /auth/me                - Get current user info
POST   /auth/verify-email      - Verify email with token
POST   /auth/resend-verification - Resend verification email
```

**Current Issues:**
1. ❌ Registration always enabled (no `ENABLE_REGISTRATION` check)
2. ❌ No email allowlist check in login handler
3. ❌ CORS set to wildcard `*` with `credentials=true` (invalid/unsafe)
4. ⚠️ `SameSite=Lax` (should be `Strict` in production for CSRF protection)
5. ⚠️ CSRF disabled by default
6. ⚠️ No rate limiting on `/auth/register`
7. ⚠️ No authentication event logging

---

### 1.3 Database (PostgreSQL + Prisma)

**Schema Location:** `serverless/prisma/schema.prisma`  
**Provider:** PostgreSQL (RDS)  
**ORM:** Prisma Client

**Users Table Schema:**
```prisma
model User {
  id              String   @id @default(uuid())
  username        String   @unique
  email           String   @unique
  normalizedEmail String?  @unique     // Lowercase for case-insensitive lookups
  password        String                // bcrypt hash
  displayName     String
  emailVerified   Boolean  @default(false)
  emailVerifiedAt DateTime?
  twoFactorEnabled Boolean @default(false)
  twoFactorSecret  String?              // TOTP secret (encrypted)
  role            String   @default("artist")  // 'artist' | 'observer'
  // ... additional fields
}
```

**Missing Field (Proposed):**
```prisma
enabled         Boolean  @default(true)  // 🆕 Per-user access control flag
```

**Current Issues:**
1. ❌ No `enabled` field for granular user access control
2. ⚠️ `emailVerified` exists but not enforced on login
3. ⚠️ No account lockout tracking (brute force protection)

---

### 1.4 Infrastructure (AWS)

**Frontend Delivery:**
- **S3 Bucket:** Static assets (build artifacts from `/dist`)
- **CloudFront:** Distribution `dkmxy676d3vgc`
  - Origin Access Control (OAC) to S3
  - Global WAF: IP allowlist (owner only)
  - Default Root Object: `index.html`
  - ⚠️ Error Pages: 403/404 → `/index.html` (200) **NOT CONFIRMED**

**Backend API:**
- **API Gateway HTTP API:** `i72dxlcfcc` (us-west-2)
  - Resource Policy: IP allowlist (/32 CIDR)
  - CORS: Enabled (currently wildcard `*`)
- **Lambda Functions:** Node.js 20.x (serverless/src/handlers/*)
- **RDS PostgreSQL:** Database (connection via `DATABASE_URL`)

**Legacy (Not Currently Used):**
- **REST API:** `oocr9ahsyk` (Regional WAF)

**Current Issues:**
1. ⚠️ CloudFront SPA error handling not confirmed (403/404 → 200 /index.html)
2. ❌ JWT_SECRET in environment variables (should use AWS Secrets Manager)
3. ⚠️ No CloudWatch alarms for failed auth attempts
4. ⚠️ No security headers (CSP, HSTS, X-Frame-Options) on CloudFront

---

## 2. Authentication & Authorization Flow Audit

### 2.1 Registration Flow: `POST /auth/register`

**Current Implementation:**
```javascript
// serverless/src/handlers/auth.js
export const register = async (event) => {
  const { email, password, username, displayName } = JSON.parse(event.body);
  
  // 1. Validate inputs (email format, password length ≥6)
  // 2. Check if user exists (by email or username)
  // 3. Hash password with bcrypt (10 rounds)
  // 4. Create user in database
  // 5. Generate email verification token (24h expiry)
  // 6. Send verification email (if EMAIL_ENABLED=true)
  // 7. Issue JWT access + refresh tokens
  // 8. Set HttpOnly cookies
  // 9. Return user object
}
```

**Security Analysis:**

✅ **Strengths:**
- Email format validation
- Password complexity (min 6 chars)
- bcrypt hashing (industry standard)
- Email verification flow (though not enforced)
- Duplicate user/email check

❌ **Critical Issues:**
1. **No registration gate:** Anyone who bypasses IP allowlist can register
2. **No CAPTCHA:** Vulnerable to automated registration attacks
3. **No rate limiting:** Can spam registrations
4. **Email verification not enforced:** Can login with unverified email

⚠️ **Recommendations:**
- Add `ENABLE_REGISTRATION` flag (default `false` in prod)
- Apply rate limiting (5 registrations per hour per IP)
- Consider CAPTCHA for public deployment
- Enforce email verification on login

---

### 2.2 Login Flow: `POST /auth/login`

**Current Implementation:**
```javascript
// serverless/src/handlers/auth.js
export const login = async (event) => {
  const { email, password } = JSON.parse(event.body);
  
  // 1. Validate inputs
  // 2. Find user by normalized email
  // 3. Compare password with bcrypt
  // 4. Generate access token (30m) + refresh token (7d)
  // 5. Set HttpOnly cookies (SameSite=Lax, Secure in prod)
  // 6. Generate CSRF token (if CSRF_ENABLED=true)
  // 7. Return user object
}
```

**Cookie Configuration:**
```javascript
// Access Token Cookie
access_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=1800; Secure (prod)

// Refresh Token Cookie
refresh_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800; Secure (prod)

// CSRF Token Cookie (non-HttpOnly, readable by JS)
XSRF-TOKEN=${token}; Path=/; SameSite=Lax; Max-Age=900; Secure (prod)
```

**Security Analysis:**

✅ **Strengths:**
- HttpOnly cookies (XSS protection)
- Secure flag in production (HTTPS only)
- Token expiry (access: 30m, refresh: 7d)
- bcrypt comparison (timing-safe)

❌ **Critical Issues:**
1. **No email allowlist check:** Any registered user can login
2. **Email verification not enforced:** `emailVerified=false` users can login
3. **No account lockout:** Unlimited password attempts (brute force risk)
4. **No authentication logging:** No audit trail for failed logins

⚠️ **Moderate Issues:**
1. **SameSite=Lax:** Allows cookies on top-level GET navigations (CSRF risk)
   - Should be `Strict` in production
2. **Authorization header fallback:** Accepts `Bearer` tokens (XSS risk if stolen)
   - Should disable in production
3. **No 2FA enforcement:** Available but not required

---

### 2.3 CORS Configuration

**Current Implementation:**
```javascript
// serverless/src/utils/headers.js
export function json(data, statusCode = 200, extra = {}) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',               // ❌ WILDCARD
      'Access-Control-Allow-Credentials': 'true',       // ❌ INVALID WITH *
      // ... security headers
    },
    body: JSON.stringify(data),
  };
}
```

**Security Analysis:**

❌ **CRITICAL ISSUE: Invalid CORS Configuration**

Per [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS):
> When responding to a credentialed request, the server **must** specify an origin in the value of the `Access-Control-Allow-Origin` header, instead of specifying the "`*`" wildcard.

**Current state:** `Access-Control-Allow-Origin: *` + `Access-Control-Allow-Credentials: true`  
**Browser behavior:** **Credentials are blocked** (cookies won't be sent/received)  
**Production impact:** Authentication likely broken OR wildcard is ignored

**Fix Required:**
```javascript
// Dynamic origin from FRONTEND_URL
'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:5173',
'Access-Control-Allow-Credentials': 'true',
```

---

### 2.4 CSRF Protection

**Current Implementation:**
```javascript
// serverless/src/middleware/csrfMiddleware.js
const CSRF_ENABLED = process.env.CSRF_ENABLED === 'true';  // Default: FALSE

export const csrfProtection = (event) => {
  if (!CSRF_ENABLED) return null;  // ❌ Disabled by default
  
  const method = event.requestContext?.http?.method;
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return null;  // GET is safe
  }
  
  // Extract XSRF-TOKEN from cookie and X-CSRF-Token from header
  const cookieToken = extractCsrfTokenFromCookie(event.headers?.cookie);
  const headerToken = extractCsrfTokenFromHeader(event.headers);
  
  // Timing-safe comparison
  if (!verifyCsrfToken(cookieToken, headerToken)) {
    return { statusCode: 403, body: JSON.stringify({ error: 'CSRF validation failed' }) };
  }
  
  return null;  // Valid
};
```

**Security Analysis:**

✅ **Strengths:**
- Proper double-submit cookie pattern
- Timing-safe comparison (prevents timing attacks)
- Only protects state-changing methods

❌ **Critical Issue:**
- **CSRF protection disabled by default** (`CSRF_ENABLED=false`)
- With `SameSite=Lax`, CSRF is still possible on GET requests that trigger state changes

⚠️ **Recommendation:**
- Enable CSRF in production: `CSRF_ENABLED=true`
- Upgrade cookies to `SameSite=Strict` (eliminates CSRF on all methods)

---

## 3. Risks and Gaps (Prioritized P0-P3)

### P0 - Critical (Immediate Action Required)

| # | Risk | Impact | Likelihood | Mitigation |
|---|------|--------|------------|------------|
| **P0-1** | **No post-authentication email allowlist** | Any registered user can login if IP allowlist fails | High (if IP bypass) | Implement `ALLOWED_USER_EMAILS` check in login handler |
| **P0-2** | **Registration always enabled** | Attackers can create accounts if IP allowlist bypassed | High (if IP bypass) | Add `ENABLE_REGISTRATION=false` flag with 403 response |
| **P0-3** | **Invalid CORS configuration** | Wildcard `*` with credentials violates spec, auth likely broken | High | Replace with dynamic origin from `FRONTEND_URL` |

**Risk Score:** 🔴 **CRITICAL**  
**Recommendation:** Address in Phase 1 (2-3 hours)

---

### P1 - High (Address Before Production Hardening)

| # | Risk | Impact | Likelihood | Mitigation |
|---|------|--------|------------|------------|
| **P1-1** | **No frontend API base validation** | Could deploy frontend pointing to wrong API or localhost | Medium | Add Vite plugin to validate `VITE_API_BASE` at build time |
| **P1-2** | **Sign-up UI always visible** | Confusing UX, social engineering risk (phishing lookalike sites) | Medium | Add `VITE_ENABLE_REGISTRATION` flag to hide signup UI |
| **P1-3** | **CloudFront SPA error handling unconfirmed** | 403/404 may not redirect to `/index.html`, breaking deep links | Medium | Verify and configure custom error responses |
| **P1-4** | **Email verification not enforced** | Users can login with unverified emails (account takeover via email) | Medium | Add `emailVerified` check in login handler |

**Risk Score:** 🟠 **HIGH**  
**Recommendation:** Address in Phase 2 (1-2 hours)

---

### P2 - Medium (Harden After P0/P1)

| # | Risk | Impact | Likelihood | Mitigation |
|---|------|--------|------------|------------|
| **P2-1** | **SameSite=Lax vs Strict** | CSRF possible on GET requests that mutate state | Low (with IP allowlist) | Upgrade to `SameSite=Strict` in production |
| **P2-2** | **CSRF disabled by default** | No protection against CSRF if `SameSite=Lax` | Low (with IP allowlist) | Set `CSRF_ENABLED=true` in production |
| **P2-3** | **No rate limiting on registration** | Automated account creation if registration enabled | Medium | Apply `rateLimit` middleware to `/auth/register` |
| **P2-4** | **No brute-force protection** | Unlimited password attempts on login | Medium | Implement account lockout after N failed attempts |
| **P2-5** | **No auth event logging** | No audit trail for security incidents | Low | Add CloudWatch logging for auth events |

**Risk Score:** 🟡 **MEDIUM**  
**Recommendation:** Address in Phase 1 (bundled with P0 fixes)

---

### P3 - Low (Nice to Have)

| # | Risk | Impact | Likelihood | Mitigation |
|---|------|--------|------------|------------|
| **P3-1** | **Authorization header fallback in prod** | If token stolen via XSS, can be used in API calls | Very Low | Disable Bearer token auth in production |
| **P3-2** | **No security headers** | Missing CSP, HSTS, X-Frame-Options | Low | Add via CloudFront custom headers |
| **P3-3** | **JWT_SECRET in env vars** | Exposed in Lambda console, CloudFormation | Low | Migrate to AWS Secrets Manager |
| **P3-4** | **No CloudWatch alarms** | No alerts for suspicious auth activity | Low | Create alarms for failed login spikes |
| **P3-5** | **No session tracking** | Can't revoke individual sessions remotely | Very Low | Implement session table with JTI tracking |

**Risk Score:** 🟢 **LOW**  
**Recommendation:** Address in Phase 4 (post-launch hardening)

---

## 4. Concrete Fixes

### Fix 1: Disable Registration in Production

**Objective:** Prevent account creation in production via feature flag.

**Backend Changes:**

```yaml
# serverless/serverless.yml
provider:
  environment:
    ENABLE_REGISTRATION: ${env:ENABLE_REGISTRATION, "false"}  # Default FALSE
```

```javascript
// serverless/src/handlers/auth.js (top of register function)
export const register = async (event) => {
  // 🆕 Check if registration is enabled
  const ENABLE_REGISTRATION = process.env.ENABLE_REGISTRATION === 'true';
  
  if (!ENABLE_REGISTRATION) {
    return error('Registration is currently disabled', 403);
  }
  
  // ... existing registration logic
}
```

**Frontend Changes:**

```bash
# .env.example
VITE_ENABLE_REGISTRATION=false  # Hide signup UI in production
```

```jsx
// src/pages/Login.jsx (hide signup link)
{import.meta.env.VITE_ENABLE_REGISTRATION === 'true' && (
  <p className="text-sm text-center text-gray-600 dark:text-gray-400">
    Don't have an account?{' '}
    <Link to="/signup" className="text-purple-600 hover:underline">
      Sign up
    </Link>
  </p>
)}
```

```jsx
// src/App.jsx (conditional route)
{import.meta.env.VITE_ENABLE_REGISTRATION === 'true' && (
  <Route path="/signup" element={<Signup />} />
)}
```

**Testing:**
- ✅ `ENABLE_REGISTRATION=false` → `POST /auth/register` returns 403
- ✅ Frontend hides signup link and disables `/signup` route
- ✅ Development (`ENABLE_REGISTRATION=true`) still works

---

### Fix 2: Post-Authentication Email Allowlist

**Objective:** Restrict login to approved email addresses.

**Option A: Environment Variable (Recommended for MVP)**

```yaml
# serverless/serverless.yml
provider:
  environment:
    ALLOWED_USER_EMAILS: ${env:ALLOWED_USER_EMAILS, ""}  # Comma-separated list
```

```javascript
// serverless/src/handlers/auth.js (in login function, after password verification)
export const login = async (event) => {
  // ... existing code (find user, verify password)
  
  // 🆕 Check email allowlist
  const ALLOWED_USER_EMAILS = process.env.ALLOWED_USER_EMAILS || '';
  if (ALLOWED_USER_EMAILS) {
    const allowedEmails = ALLOWED_USER_EMAILS.split(',').map(e => e.trim().toLowerCase());
    const userEmail = user.normalizedEmail || user.email.toLowerCase();
    
    if (!allowedEmails.includes(userEmail)) {
      console.warn(`Login attempt from unauthorized email: ${userEmail}`);
      return error('Access denied: Your account is not authorized to login', 403);
    }
  }
  
  // ... existing code (generate tokens, set cookies)
}
```

**Option B: Database Field (Long-term Solution)**

```prisma
// serverless/prisma/schema.prisma
model User {
  // ... existing fields
  enabled Boolean @default(true)  // 🆕 Per-user access control
}
```

```javascript
// serverless/src/handlers/auth.js (in login function)
if (!user.enabled) {
  console.warn(`Login attempt from disabled user: ${user.email}`);
  return error('Your account has been disabled. Please contact support.', 403);
}
```

**Migration:**
```bash
# Add enabled column (default true for existing users)
npx prisma migrate dev --name add_user_enabled_flag
```

**Testing:**
- ✅ Owner email in allowlist → Login succeeds
- ✅ Other emails → Login fails with 403 "Access denied"
- ✅ Empty allowlist → All users can login (backward compatible)

---

### Fix 3: Cookie & CORS Hardening

**Objective:** Secure cookies and fix invalid CORS configuration.

**3.1 Upgrade SameSite to Strict**

```javascript
// serverless/src/utils/tokenManager.js
export const generateAccessTokenCookie = (token) => {
  const maxAge = 30 * 60;
  const sameSite = IS_PRODUCTION ? 'Strict' : 'Lax';  // 🆕 Strict in prod
  
  let cookie = `access_token=${token}; HttpOnly; Path=/; SameSite=${sameSite}; Max-Age=${maxAge}`;
  
  if (IS_PRODUCTION) {
    cookie += '; Secure';
  }
  
  if (COOKIE_DOMAIN) {
    cookie += `; Domain=${COOKIE_DOMAIN}`;
  }
  
  return cookie;
};

// Apply same change to generateRefreshTokenCookie()
```

**3.2 Fix CORS (Dynamic Origin)**

```javascript
// serverless/src/utils/headers.js
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export function json(data, statusCode = 200, extra = {}) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': FRONTEND_URL,  // 🆕 Dynamic origin (no wildcard)
      'Access-Control-Allow-Credentials': 'true',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'camera=(), microphone=(), geolocation=()',
      'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
      ...extra,
    },
    body: JSON.stringify(data),
  };
}
```

**Testing:**
- ✅ Production: Cookies have `SameSite=Strict; Secure`
- ✅ Development: Cookies have `SameSite=Lax` (allows localhost testing)
- ✅ CORS header matches `FRONTEND_URL` (no wildcard)

---

### Fix 4: Frontend API Base Validation

**Objective:** Prevent deploying frontend with misconfigured API URL.

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// 🆕 Validation plugin
const validateApiBase = () => ({
  name: 'validate-api-base',
  buildStart() {
    const apiBase = process.env.VITE_API_BASE;
    const nodeEnv = process.env.NODE_ENV || 'development';
    
    if (!apiBase) {
      throw new Error('VITE_API_BASE is required');
    }
    
    // Production checks
    if (nodeEnv === 'production') {
      if (apiBase.includes('localhost') || apiBase.includes('127.0.0.1')) {
        throw new Error('VITE_API_BASE cannot point to localhost in production');
      }
      
      if (apiBase.includes('cloudfront.net') && !apiBase.includes('execute-api')) {
        console.warn('⚠️  WARNING: VITE_API_BASE points to CloudFront (should be API Gateway)');
      }
      
      // Ensure HTTPS
      if (!apiBase.startsWith('https://')) {
        throw new Error('VITE_API_BASE must use HTTPS in production');
      }
    }
    
    console.log(`✅ API Base validated: ${apiBase}`);
  }
});

export default defineConfig({
  plugins: [
    react(),
    validateApiBase()  // 🆕 Add validation
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  server: { port: 3000, open: true },
  preview: { port: 3000 }
});
```

**Testing:**
- ✅ Build with `VITE_API_BASE=http://localhost:3001` in prod → Fails
- ✅ Build with `VITE_API_BASE=https://i72dxlcfcc.execute-api...` → Passes
- ✅ Missing `VITE_API_BASE` → Fails with clear error

---

### Fix 5: Enable Rate Limiting on Registration

**Objective:** Prevent automated account creation.

```javascript
// serverless/src/handlers/auth.js
import { rateLimit } from '../middleware/rateLimit.js';

export const register = async (event) => {
  // 🆕 Apply rate limiting (5 registrations per hour per IP)
  const rateLimitResult = await rateLimit(event, {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,  // 1 hour
    keyPrefix: 'registration'
  });
  
  if (rateLimitResult.isRateLimited) {
    return error('Too many registration attempts. Please try again later.', 429);
  }
  
  // Check registration flag
  const ENABLE_REGISTRATION = process.env.ENABLE_REGISTRATION === 'true';
  if (!ENABLE_REGISTRATION) {
    return error('Registration is currently disabled', 403);
  }
  
  // ... existing registration logic
}
```

**Testing:**
- ✅ 6th registration attempt within 1 hour → 429 Too Many Requests
- ✅ After 1 hour → Rate limit resets

---

### Fix 6: Authentication Event Logging

**Objective:** Create audit trail for security monitoring.

```javascript
// 🆕 serverless/src/utils/authLogger.js
export const logAuthEvent = (event, user, success, reason = null) => {
  const ip = event.requestContext?.http?.sourceIp || 
             event.headers?.['x-forwarded-for']?.split(',')[0] || 
             'unknown';
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: event.requestContext?.http?.path || event.path,
    method: event.requestContext?.http?.method || event.httpMethod,
    email: user?.email || 'unknown',
    userId: user?.id || null,
    success,
    reason,
    ip,
    userAgent: event.headers?.['user-agent'] || 'unknown'
  };
  
  if (success) {
    console.log('[AUTH SUCCESS]', JSON.stringify(logEntry));
  } else {
    console.warn('[AUTH FAILURE]', JSON.stringify(logEntry));
  }
  
  // Future: Send to CloudWatch Logs Insights or external SIEM
};
```

```javascript
// serverless/src/handlers/auth.js (in login function)
import { logAuthEvent } from '../utils/authLogger.js';

export const login = async (event) => {
  const { email, password } = JSON.parse(event.body || '{}');
  
  const user = await prisma.user.findUnique({
    where: { normalizedEmail: email.toLowerCase() }
  });
  
  if (!user) {
    logAuthEvent(event, { email }, false, 'User not found');  // 🆕
    return error('Invalid credentials', 401);
  }
  
  const isValidPassword = await comparePassword(password, user.password);
  
  if (!isValidPassword) {
    logAuthEvent(event, user, false, 'Invalid password');  // 🆕
    return error('Invalid credentials', 401);
  }
  
  // Check email allowlist
  const ALLOWED_USER_EMAILS = process.env.ALLOWED_USER_EMAILS || '';
  if (ALLOWED_USER_EMAILS) {
    const allowedEmails = ALLOWED_USER_EMAILS.split(',').map(e => e.trim().toLowerCase());
    if (!allowedEmails.includes(user.normalizedEmail || user.email.toLowerCase())) {
      logAuthEvent(event, user, false, 'Email not in allowlist');  // 🆕
      return error('Access denied', 403);
    }
  }
  
  logAuthEvent(event, user, true);  // 🆕
  
  // ... generate tokens, set cookies
}
```

**Testing:**
- ✅ Failed login → CloudWatch log: `[AUTH FAILURE] { reason: "Invalid password", ... }`
- ✅ Successful login → CloudWatch log: `[AUTH SUCCESS] { email: "owner@example.com", ... }`

---

## 5. Acceptance Criteria

### Backend Security

- [ ] `ENABLE_REGISTRATION=false` in production `.env`
- [ ] `POST /auth/register` returns `403 Forbidden` when disabled
- [ ] `ALLOWED_USER_EMAILS` environment variable set to owner email
- [ ] Login checks email allowlist and rejects unauthorized users with `403`
- [ ] Cookies use `SameSite=Strict` in production (`NODE_ENV=production`)
- [ ] Cookies use `SameSite=Lax` in development (for localhost testing)
- [ ] CORS `Access-Control-Allow-Origin` set to `FRONTEND_URL` (no wildcard)
- [ ] `CSRF_ENABLED=true` in production
- [ ] Rate limiting applied to `/auth/register` (5 requests/hour/IP)
- [ ] Authentication events logged to CloudWatch with email, IP, success/failure

### Frontend Security

- [ ] `VITE_ENABLE_REGISTRATION=false` in production `.env`
- [ ] Signup link hidden when flag is `false`
- [ ] `/signup` route disabled when flag is `false`
- [ ] Build fails if `VITE_API_BASE` is missing
- [ ] Build fails if `VITE_API_BASE` points to localhost in production
- [ ] Build warns if `VITE_API_BASE` points to CloudFront instead of API Gateway

### Testing & Validation

- [ ] Unit tests pass for registration disabled (403 response)
- [ ] Unit tests pass for email allowlist (authorized/unauthorized)
- [ ] Integration tests pass for cookie flags in production mode
- [ ] Integration tests pass for CORS headers
- [ ] Manual test: Owner login succeeds
- [ ] Manual test: Non-owner login fails with 403
- [ ] Manual test: Signup UI hidden when flag is false
- [ ] CloudWatch logs show authentication events

### Documentation

- [ ] `SECURITY.md` created with overview of security architecture
- [ ] `docs/runbooks/add-user.md` created with steps to add authorized emails
- [ ] `docs/runbooks/rotate-jwt-secret.md` created
- [ ] `docs/runbooks/update-ip-allowlist.md` created
- [ ] `docs/runbooks/frontend-deployment.md` created with pre-deployment checks
- [ ] `.env.example` updated with new security flags and comments
- [ ] `README.md` updated with link to `SECURITY.md`

---

## 6. Prior Session Accomplishments

**Infrastructure Hardening (Completed):**
- ✅ CloudFront Distribution `dkmxy676d3vgc` configured with Global WAF
- ✅ Global WAF IP allowlist set to owner IP only
- ✅ API Gateway HTTP API `i72dxlcfcc` created in `us-west-2`
- ✅ API Gateway resource policy configured with `/32` IP allowlist
- ✅ REST API `oocr9ahsyk` configured with Regional WAF (legacy)
- ✅ CloudFront default root object set to `index.html`
- ✅ Frontend environment variable `VITE_API_BASE` pointed to API Gateway domain
- ✅ Region confirmed as `us-west-2` (Oregon)

**Authentication Features (Completed):**
- ✅ JWT-based authentication with HttpOnly cookies
- ✅ bcrypt password hashing (10 rounds)
- ✅ Email verification flow (token generation + email sending)
- ✅ Refresh token rotation (7-day expiry)
- ✅ CSRF middleware implemented (available but disabled)
- ✅ Rate limiting middleware implemented
- ✅ 2FA support (TOTP-based, optional)

**Gaps Identified:**
- ❌ No application-level registration control
- ❌ No post-authentication email allowlist
- ❌ CORS wildcard with credentials (invalid)
- ❌ No frontend build validation
- ❌ No auth event logging

---

## 7. Action Plan (Ordered by Phase)

### Phase 1: Backend Hardening (Priority: CRITICAL)
**Estimated Time:** 2-3 hours

**Tasks:**
1. Add `ENABLE_REGISTRATION` environment variable to `serverless.yml`
2. Add `ALLOWED_USER_EMAILS` environment variable to `serverless.yml`
3. Implement registration gate in `src/handlers/auth.js` (check flag, return 403)
4. Implement email allowlist check in `login` handler
5. Harden cookies: `SameSite=Strict` in production (`src/utils/tokenManager.js`)
6. Fix CORS: Replace wildcard with dynamic origin (`src/utils/headers.js`)
7. Enable CSRF by default in production (`CSRF_ENABLED=true`)
8. Add rate limiting to registration endpoint (`src/handlers/auth.js`)
9. Create `src/utils/authLogger.js` and integrate into auth handlers
10. Update `.env.example` with new flags and documentation

**Deliverables:**
- Modified: `serverless.yml`, `src/handlers/auth.js`, `src/utils/tokenManager.js`, `src/utils/headers.js`
- Created: `src/utils/authLogger.js`
- Tests: `tests/auth-security.test.js` (registration disabled, email allowlist)

---

### Phase 2: Frontend Hardening (Priority: HIGH)
**Estimated Time:** 1-2 hours

**Tasks:**
1. Add `VITE_ENABLE_REGISTRATION` to `.env.example`
2. Hide signup UI in `src/pages/Login.jsx` when flag is `false`
3. Conditionally render `/signup` route in `src/App.jsx`
4. Add API base validation plugin to `vite.config.js`
5. Test build with various `VITE_API_BASE` values
6. Update `README.md` with security setup instructions

**Deliverables:**
- Modified: `src/pages/Login.jsx`, `src/App.jsx`, `vite.config.js`, `.env.example`, `README.md`
- Tests: Build validation tests (manual)

---

### Phase 3: Testing & Validation (Priority: HIGH)
**Estimated Time:** 1-2 hours

**Tasks:**
1. Write unit test: Registration disabled returns 403
2. Write unit test: Email allowlist (owner pass, other fail)
3. Write integration test: Cookie flags in production mode
4. Write integration test: CORS headers match `FRONTEND_URL`
5. Manual test: Deploy backend with flags, verify registration 403
6. Manual test: Owner login succeeds, other emails fail
7. Manual test: Frontend hides signup UI
8. Check CloudWatch logs for auth events

**Deliverables:**
- Created: `serverless/tests/registration-disabled.test.js`
- Created: `serverless/tests/email-allowlist.test.js`
- Created: `serverless/tests/cookie-cors-hardening.test.js`

---

### Phase 4: Documentation (Priority: MEDIUM)
**Estimated Time:** 1-2 hours

**Tasks:**
1. Create `SECURITY.md` with security architecture overview
2. Create `docs/runbooks/add-user.md` (how to add emails to allowlist)
3. Create `docs/runbooks/rotate-jwt-secret.md` (secret rotation procedure)
4. Create `docs/runbooks/update-ip-allowlist.md` (WAF/API Gateway IP updates)
5. Create `docs/runbooks/frontend-deployment.md` (pre-deployment checklist)
6. Update `README.md` with link to `SECURITY.md`
7. Document environment variables in `.env.example`

**Deliverables:**
- Created: `SECURITY.md`, 4 runbooks in `docs/runbooks/`
- Modified: `README.md`, `.env.example`

---

### Phase 5: Infrastructure Verification (Priority: MEDIUM)
**Estimated Time:** 30 minutes

**Tasks:**
1. Verify CloudFront custom error responses: 403 → 200 `/index.html`
2. Verify CloudFront custom error responses: 404 → 200 `/index.html`
3. Test SPA deep linking (e.g., `/dashboard` direct navigation)
4. Check built `dist/` folder for correct `VITE_API_BASE` in JavaScript bundles
5. Verify S3 bucket policy (OAC permissions)

**Deliverables:**
- Verified CloudFront configuration
- Confirmed SPA routing works

---

### Phase 6: Deployment & Validation (Priority: CRITICAL)
**Estimated Time:** 30-60 minutes

**Tasks:**
1. Set production environment variables:
   - `ENABLE_REGISTRATION=false`
   - `ALLOWED_USER_EMAILS=owner@example.com`
   - `CSRF_ENABLED=true`
   - `NODE_ENV=production`
   - `FRONTEND_URL=https://dkmxy676d3vgc.cloudfront.net`
2. Deploy backend: `cd serverless && npm run deploy`
3. Set frontend environment variables:
   - `VITE_API_BASE=https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com`
   - `VITE_ENABLE_REGISTRATION=false`
   - `VITE_ENABLE_AUTH=true`
   - `NODE_ENV=production`
4. Build frontend: `npm run build`
5. Deploy frontend: Upload `dist/` to S3, invalidate CloudFront cache
6. Manual test: Owner login (should succeed)
7. Manual test: Create test user, try login (should fail with 403)
8. Manual test: Try registration (should return 403)
9. Manual test: Check browser DevTools → Network → Cookies (should see `SameSite=Strict; Secure`)
10. Manual test: Check CORS headers in response (should match CloudFront URL)

**Deliverables:**
- Production deployment with all security hardening applied
- Manual validation checklist completed

---

## 8. Files to Create/Modify

### Files to Create

**Backend:**
```
serverless/src/utils/authLogger.js              # Authentication event logging utility
serverless/tests/registration-disabled.test.js   # Test registration feature flag
serverless/tests/email-allowlist.test.js         # Test email allowlist enforcement
serverless/tests/cookie-cors-hardening.test.js   # Test cookie/CORS security
```

**Documentation:**
```
SECURITY.md                                      # Security architecture overview
docs/runbooks/add-user.md                        # Add user to email allowlist
docs/runbooks/rotate-jwt-secret.md               # Rotate JWT_SECRET procedure
docs/runbooks/update-ip-allowlist.md             # Update WAF/API Gateway IPs
docs/runbooks/frontend-deployment.md             # Frontend deployment checklist
```

### Files to Modify

**Backend:**
```
serverless/serverless.yml                        # Add ENABLE_REGISTRATION, ALLOWED_USER_EMAILS
serverless/src/handlers/auth.js                  # Add gates, allowlist, rate limiting, logging
serverless/src/utils/tokenManager.js             # Upgrade SameSite to Strict in production
serverless/src/utils/headers.js                  # Fix CORS (dynamic origin, no wildcard)
```

**Frontend:**
```
vite.config.js                                   # Add API base validation plugin
src/pages/Login.jsx                              # Hide signup link when flag is false
src/App.jsx                                      # Conditionally render /signup route
.env.example                                     # Add security flags with documentation
README.md                                        # Link to SECURITY.md
```

**Configuration:**
```
.env.example                                     # Document ENABLE_REGISTRATION, ALLOWED_USER_EMAILS, etc.
```

---

## Appendix: Testing Checklist

### Unit Tests

```bash
# Backend (Jest)
cd serverless
npm test

# Test cases:
- [ ] Registration disabled: POST /auth/register → 403
- [ ] Registration enabled: POST /auth/register → 201 (creates user)
- [ ] Email allowlist (owner): POST /auth/login → 200 (issues tokens)
- [ ] Email allowlist (other): POST /auth/login → 403 (access denied)
- [ ] Cookie flags (production): SameSite=Strict; Secure
- [ ] Cookie flags (development): SameSite=Lax; no Secure
- [ ] CORS header: Access-Control-Allow-Origin matches FRONTEND_URL
- [ ] CSRF validation: Missing header → 403
- [ ] CSRF validation: Valid header → 200
- [ ] Rate limiting: 6th request → 429
```

### Integration Tests

```bash
# Frontend (Playwright or Cypress)
npm run test:e2e

# Test cases:
- [ ] Signup UI hidden when VITE_ENABLE_REGISTRATION=false
- [ ] /signup route returns 404 when flag is false
- [ ] Login with owner email succeeds
- [ ] Login with other email fails (403 error shown)
- [ ] Browser stores HttpOnly cookies (not accessible via document.cookie)
```

### Manual Tests (Production)

```bash
# 1. Test registration disabled
curl -X POST https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","username":"testuser","displayName":"Test User"}'
# Expected: HTTP 403, body: {"error":"Registration is currently disabled"}

# 2. Test owner login (success)
curl -X POST https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"ownerpassword"}' \
  -v
# Expected: HTTP 200, Set-Cookie headers with SameSite=Strict; Secure

# 3. Test non-owner login (fail)
curl -X POST https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"other@example.com","password":"password123"}' \
  -v
# Expected: HTTP 403, body: {"error":"Access denied: Your account is not authorized to login"}

# 4. Test CORS headers
curl -H "Origin: https://dkmxy676d3vgc.cloudfront.net" \
  https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/health \
  -v | grep "Access-Control-Allow-Origin"
# Expected: Access-Control-Allow-Origin: https://dkmxy676d3vgc.cloudfront.net (no wildcard)

# 5. Test frontend build validation
VITE_API_BASE=http://localhost:3001 NODE_ENV=production npm run build
# Expected: Build fails with error "VITE_API_BASE cannot point to localhost in production"
```

### CloudWatch Logs Verification

```bash
# Check authentication logs in CloudWatch
aws logs tail /aws/lambda/pv-api-prod-login --follow

# Expected log entries:
[AUTH SUCCESS] {"timestamp":"2025-11-12T20:33:42.417Z","event":"/auth/login","email":"owner@example.com","success":true,"ip":"1.2.3.4"}
[AUTH FAILURE] {"timestamp":"2025-11-12T20:34:15.123Z","event":"/auth/login","email":"other@example.com","success":false,"reason":"Email not in allowlist","ip":"5.6.7.8"}
```

---

## Summary

This comprehensive security audit report provides:

1. ✅ **Complete architecture map** of frontend, backend, database, and infrastructure
2. ✅ **Detailed authentication flow analysis** with security strengths and gaps
3. ✅ **Prioritized risk matrix** (P0-P3) with 15 identified risks
4. ✅ **Concrete, implementable fixes** with code examples
5. ✅ **Clear acceptance criteria** for validation
6. ✅ **Phased action plan** (6 phases, 8-12 hours total)
7. ✅ **Testing checklist** for unit, integration, and manual tests

**Next Steps:**
1. Review this report with stakeholders
2. Approve Phase 1 (Backend Hardening) for immediate implementation
3. Create GitHub issues for each phase
4. Assign ownership and timelines
5. Schedule deployment window for production hardening

**Contact:**
For questions or clarifications, please open a GitHub issue or contact the security team.

---

**Document Control:**
- **Created:** November 12, 2025
- **Last Updated:** November 12, 2025
- **Next Review:** After Phase 1 deployment
- **Classification:** Internal Use Only
