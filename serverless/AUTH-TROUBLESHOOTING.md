# Auth Troubleshooting Guide

This document describes common authentication issues in Project Valine's serverless backend and how to resolve them.

## Table of Contents
- [Root Cause: HTTP 500 on Auth Endpoints (Dec 2024)](#root-cause-http-500-on-auth-endpoints-dec-2024)
- [Cookie Configuration for HTTP API v2](#cookie-configuration-for-http-api-v2)
- [Prisma Client Bundling for Lambda](#prisma-client-bundling-for-lambda)
- [Common Symptoms and Solutions](#common-symptoms-and-solutions)

---

## Root Cause: HTTP 500 on Auth Endpoints (Dec 2024)

### Summary
The production auth endpoints (`/auth/login`, `/auth/me`, `/auth/logout`) were returning 500 errors while diagnostic endpoints (`/auth/status`, `/auth/diag`) worked correctly.

### Root Cause
**Improper Prisma client bundling for AWS Lambda.** The `serverless-esbuild` plugin was attempting to bundle `@prisma/client`, which failed because:

1. esbuild cannot properly bundle Prisma's native query engine binaries (`.so.node` files)
2. When Lambda tried to instantiate `PrismaClient`, it couldn't find the native binaries
3. This caused silent failures or cryptic errors in Lambda logs

### Why Diagnostic Endpoints Worked
The `/auth/status` and `/auth/diag` endpoints don't instantiate `PrismaClient` - they only check configuration and call `isPrismaDegraded()`, which doesn't require the native binaries.

### The Fix
1. Mark `@prisma/client` and `.prisma` as external in the esbuild config
2. Include `node_modules/.prisma/**` and `node_modules/@prisma/client/**` in the package patterns

```yaml
# serverless.yml
custom:
  esbuild:
    external:
      - aws-sdk
      - '@prisma/client'  # CRITICAL: Must be external for Lambda
      - .prisma

package:
  patterns:
    - 'node_modules/.prisma/**'        # Include generated client
    - 'node_modules/@prisma/client/**' # Include Prisma package
```

---

## Cookie Configuration for HTTP API v2

### HTTP API v2 Cookie Response Format
AWS HTTP API v2 uses a `cookies` array in the response (not `multiValueHeaders`):

```javascript
// Correct for HTTP API v2
return {
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'https://your-frontend.com',
    'Access-Control-Allow-Credentials': 'true'
  },
  body: JSON.stringify({ user: { id: '123', email: 'user@example.com' } }),
  cookies: [
    'access_token=eyJ...; HttpOnly; Path=/; SameSite=None; Secure; Max-Age=1800',
    'refresh_token=eyJ...; HttpOnly; Path=/; SameSite=None; Secure; Max-Age=604800',
    'XSRF-TOKEN=abc123; Path=/; SameSite=None; Secure; Max-Age=900'
  ]
};
```

### Cookie Extraction in HTTP API v2
HTTP API v2 parses cookies into `event.cookies` array:

```javascript
// event.cookies format: ["access_token=abc123", "refresh_token=xyz789"]
export const extractToken = (event, tokenType = 'access') => {
  const cookieName = tokenType === 'access' ? 'access_token' : 'refresh_token';
  
  // HTTP API v2: Try event.cookies array first
  if (Array.isArray(event.cookies) && event.cookies.length > 0) {
    const prefix = `${cookieName}=`;
    for (const cookie of event.cookies) {
      if (cookie.startsWith(prefix)) {
        return cookie.substring(prefix.length);
      }
    }
  }
  
  // Fallback to traditional headers.cookie string
  // ...
};
```

### Cross-Origin Cookie Requirements (CloudFront → API Gateway)
For cookies to work across CloudFront (frontend) and API Gateway (backend):

1. **SameSite=None** - Required for cross-site requests
2. **Secure** - Required when using SameSite=None
3. **No Domain attribute** - Let the browser scope the cookie to the API domain
4. **CORS credentials** - `Access-Control-Allow-Credentials: true`

```javascript
const cookie = `access_token=${token}; HttpOnly; Path=/; SameSite=None; Secure; Max-Age=1800`;
```

---

## Prisma Client Bundling for Lambda

### Binary Targets
The Prisma schema must include the correct binary target for Amazon Linux 2023 (Lambda runtime):

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}
```

### esbuild Configuration
`@prisma/client` must be marked as external because:
- It contains native binaries that esbuild can't bundle
- The generated client references files at specific paths
- Bundling breaks the client's internal module resolution

```yaml
custom:
  esbuild:
    bundle: true
    external:
      - aws-sdk
      - '@prisma/client'
      - .prisma
```

### Package Patterns
Include the Prisma files in the Lambda deployment:

```yaml
package:
  patterns:
    - 'node_modules/.prisma/**'
    - 'node_modules/@prisma/client/**'
```

### DATABASE_URL Format
The DATABASE_URL must be a valid PostgreSQL connection string with NO SPACES:

```
postgresql://user:password@host:port/database?sslmode=require
```

Special characters in the password must be URL-encoded:
- `@` → `%40`
- `#` → `%23`
- `:` → `%3A`

---

## Common Symptoms and Solutions

### 500 Internal Server Error on Auth Endpoints

**Symptoms:**
- `/auth/login`, `/auth/me`, `/auth/logout` return 500
- `/auth/status`, `/auth/diag` work correctly
- No new Lambda logs (crash before logging)

**Likely Cause:** Prisma client not bundled correctly

**Solution:**
1. Mark `@prisma/client` as external in esbuild
2. Include Prisma files in package patterns
3. Verify `rhel-openssl-3.0.x` is in binaryTargets

### Cookies Not Being Set

**Symptoms:**
- Login returns 200 but no cookies
- Network inspector shows no Set-Cookie headers

**Likely Cause:** Using REST API v1 response format

**Solution:**
Use the HTTP API v2 `cookies` array:
```javascript
return {
  statusCode: 200,
  cookies: ['cookie1=value; ...', 'cookie2=value; ...'],
  body: JSON.stringify(data)
};
```

### "CORS error" or Cookies Not Sent on Subsequent Requests

**Symptoms:**
- Login works, but `/auth/me` returns 401
- Cookies visible in browser but not sent

**Likely Cause:** CORS or SameSite misconfiguration

**Solution:**
1. Ensure `SameSite=None; Secure` on all cookies
2. Don't set `Domain` attribute (let browser handle it)
3. Include `Access-Control-Allow-Credentials: true` in responses
4. Frontend must use `credentials: 'include'` in fetch calls

### "DATABASE_UNAVAILABLE" or Prisma Initialization Errors

**Symptoms:**
- 503 errors with "DATABASE_UNAVAILABLE"
- Lambda logs show Prisma initialization errors

**Likely Cause:** Invalid DATABASE_URL or missing binaries

**Solution:**
1. Check DATABASE_URL format (no spaces, correct encoding)
2. Verify Prisma was generated: `npx prisma generate`
3. Check binaryTargets includes `rhel-openssl-3.0.x`

---

## Verification Checklist

After deploying, verify:

1. **`GET /auth/status`** returns configuration info
2. **`GET /auth/diag`** shows `prismaDegraded: false`
3. **`POST /auth/login`** with valid credentials returns 200 with cookies
4. **`GET /auth/me`** with cookies returns user info
5. **`POST /auth/logout`** clears cookies

---

## Related Files

- `serverless.yml` - esbuild and package configuration
- `src/db/client.js` - Prisma client initialization with error handling
- `src/handlers/auth.js` - Authentication handlers
- `src/utils/tokenManager.js` - JWT generation and cookie formatting
- `src/middleware/csrfMiddleware.js` - CSRF token handling
- `prisma/schema.prisma` - Database schema and binary targets
