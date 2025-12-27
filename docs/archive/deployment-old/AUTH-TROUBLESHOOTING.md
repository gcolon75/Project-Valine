# Auth Troubleshooting Guide

This document describes common authentication issues in Project Valine's serverless backend and how to resolve them.

> **📚 For the complete backend deployment guide, see [docs/BACKEND-DEPLOYMENT.md](../docs/BACKEND-DEPLOYMENT.md)**

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

### The Fix (Current Architecture - Prisma Lambda Layer)

**As of December 2024**, Prisma is deployed via a **Lambda Layer** rather than bundled per-function. This approach:
- Keeps individual function zips small (< 10 MB each)
- Avoids the 250 MB Lambda unzipped limit
- Makes deployments fast (~1 minute vs 15-17 minutes)

```yaml
# serverless.yml
provider:
  layers:
    - { Ref: PrismaLambdaLayer }  # Attach to all functions

package:
  patterns:
    # Exclude Prisma from function bundles (provided by layer)
    - '!node_modules/@prisma/**'
    - '!node_modules/.prisma/**'

layers:
  prisma:
    package:
      artifact: layers/prisma-layer.zip
```

To build the layer before deployment:
```powershell
.\scripts\build-prisma-layer.ps1
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

> **Note:** As of December 2024, Prisma is deployed via a **Lambda Layer** rather than bundled in each function. See [docs/BACKEND-DEPLOYMENT.md](../docs/BACKEND-DEPLOYMENT.md) for the full details.

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
      - '.prisma/*'
      - '.prisma/client/*'
```

### Package Patterns (Lambda Layer Approach)
Prisma files are **excluded** from function bundles (provided by layer instead):

```yaml
package:
  patterns:
    # Exclude Prisma - provided via Lambda Layer
    - '!node_modules/@prisma/**'
    - '!node_modules/.prisma/**'
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

## Handler Null-Dereference Fixes (Dec 2024)

### Summary
Multiple handlers were crashing with `TypeError: Cannot read properties of null` when accessing relations on potentially null Prisma results.

### Fixed Handlers

#### 1. `updateMyProfile` (PATCH /me/profile)
**Error:** `Cannot read properties of null (reading 'user')`

**Root Cause:** When Prisma is in degraded mode (database unavailable), `getPrisma()` returns `null`. Handlers must check for this before accessing `prisma.model.method()`.

**Fix:** The handler now handles:
- Degraded mode (prisma is null)
- Auto-creates profile if it doesn't exist for the user
- Returns proper error codes instead of throwing

#### 2. `createEducation` / `updateEducation` / `deleteEducation`
**Error:** `Cannot read properties of null (reading 'profile')`

**Root Cause:** When fetching education with `include: { profile: true }`, the profile relation could be null for orphaned education entries (e.g., if profile was deleted but cascade didn't clean up education).

**Fix:** Added explicit null checks:
```javascript
if (!education.profile) {
  console.error('[updateEducation] Orphaned education entry - no profile:', { educationId: id, userId });
  return error(404, 'Education entry profile not found');
}
```

#### 3. `getUnreadCounts` (GET /unread-counts)
**Error:** `Cannot read properties of null (reading 'notification')`

**Root Cause:** When `getPrisma()` returns `null` (degraded mode), calling `prisma.notification.count()` crashes.

**Fix:** Added degraded mode handling to return zeros instead of crashing:
```javascript
const prisma = getPrisma();
if (!prisma) {
  console.warn('[getUnreadCounts] Prisma unavailable (degraded mode), returning zeros');
  return json({ notifications: 0, messages: 0 });
}
```

#### 4. `createPost` (POST /posts)
**Error:** `Cannot read properties of null (reading 'post')` / `Cannot read properties of null (reading 'profile')`

**Root Cause:** When validating media ownership with `include: { profile: true }`, the profile relation could be null for orphaned media entries.

**Fix:** Added explicit null check before accessing `mediaRecord.profile.userId`:
```javascript
if (!mediaRecord.profile) {
  log('media_orphaned', { route, userId: authUserId, mediaId, reason: 'no_profile' });
  return error(404, 'Media profile not found');
}
```

### Best Practices for Future Handlers

1. **Always check getPrisma() result:**
   ```javascript
   const prisma = getPrisma();
   if (!prisma) {
     return error(503, 'Database unavailable');
   }
   ```

2. **Check included relations before accessing:**
   ```javascript
   const record = await prisma.model.findUnique({
     where: { id },
     include: { relation: true }
   });
   if (!record) return error(404, 'Not found');
   if (!record.relation) return error(404, 'Relation not found');
   ```

3. **Use optional chaining for non-critical data:**
   ```javascript
   const ownerName = record.profile?.user?.displayName || 'Unknown';
   ```

---

## Onboarding Loop Fix (Dec 2024)

### Summary
Users were being redirected to onboarding on every login, even after completing it.

### Root Cause
The `onboardingComplete` flag was not being properly persisted due to:
1. Handler errors (500s) preventing the flag from being saved
2. Frontend not correctly reading the flag from the backend response

### Fix
1. Fixed all handler 500 errors that were preventing profile updates
2. Ensured `updateMyProfile` properly saves `onboardingComplete: true` when onboarding completes
3. Frontend `Protected` component correctly reads `user.onboardingComplete` from AuthContext

### Frontend Routing Logic (src/routes/App.jsx)
```javascript
function Protected({ children }) {
  const { user, isInitialized } = useAuth();
  
  if (!isInitialized) return null;
  if (!user) return <Navigate to="/login" replace />;
  
  // Only redirect to onboarding if flag is explicitly false
  if (user.onboardingComplete === false && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  
  return children;
}
```

---

## `/auth/me` Handler Null-Dereference Fix (Dec 2024)

### Summary
The `/auth/me` endpoint was returning 500 errors with the message `Cannot read properties of null (reading 'user')` when the Prisma client was unavailable (degraded mode).

### Symptoms
- `GET /auth/me` returned 500 Internal Server Error
- CloudWatch logs showed:
  ```json
  {"event":"me_request_received"}
  {"event":"me_token_decoded","userId":"..."}
  {"event":"me_db_error","error":"Cannot read properties of null (reading 'user')"}
  ```
- JWT was successfully decoded (userId present), but database access failed

### Root Cause
The `me()` handler in `src/handlers/auth.js` called `getPrisma()` and immediately accessed `prisma.user.findUnique()` without checking if `getPrisma()` returned `null`. When Prisma is in degraded mode (database unavailable), `getPrisma()` returns `null`, causing a `TypeError` when trying to access `.user` on null.

**Broken pattern:**
```javascript
const prisma = getPrisma();
// prisma could be null here!
const user = await prisma.user.findUnique({ where: { id: userId } });
```

### Fix
Added null check for `getPrisma()` result and return 503 "DATABASE_UNAVAILABLE" instead of crashing:

```javascript
const prisma = getPrisma();
if (!prisma) {
  logStructured(correlationId, 'me_prisma_unavailable', {
    userId,
    prismaDegraded: isPrismaDegraded()
  }, 'error');
  return error(503, 'DATABASE_UNAVAILABLE', { correlationId });
}
```

### Additional Hardening
The same fix was applied to other auth handlers that had the same vulnerability:
- `refresh` - token refresh endpoint
- `setup2FA` - 2FA setup
- `enable2FA` - 2FA enable
- `verify2FA` - 2FA verification
- `disable2FA` - 2FA disable
- `seedRestricted` - admin seed endpoint

### Debugging Tips
1. Check CloudWatch logs for `me_prisma_unavailable` or `me_db_error` events
2. Verify database connectivity via `/auth/diag` endpoint (`prismaDegraded` field)
3. Confirm `DATABASE_URL` environment variable is correctly set in Lambda
4. Check for Prisma client initialization errors in Lambda cold start logs

---

## Remaining 500 Fixes - Profile, Education, Preferences, Posts (Dec 2024)

### Summary
Multiple handlers were still returning 500 errors because they called `getPrisma()` but did not check if the result was `null` (indicating degraded mode / database unavailable).

### Affected Handlers

#### Profile Handlers (`src/handlers/profiles.js`)
- `getProfileByVanity` - GET /profiles/{vanityUrl}
- `getProfileById` - GET /profiles/id/{id}
- `createProfile` - POST /profiles
- `updateProfile` - PUT /profiles/id/{id}
- `updateMyProfile` - PATCH /me/profile
- `getMyProfile` - GET /me/profile
- `deleteProfile` - DELETE /profiles/id/{id}

#### Education Handlers (`src/handlers/education.js`)
- `listEducation` - GET /me/profile/education
- `createEducation` - POST /me/profile/education
- `updateEducation` - PUT /me/profile/education/{id}
- `deleteEducation` - DELETE /me/profile/education/{id}

#### Settings Handlers (`src/handlers/settings.js`)
- `getPreferences` - GET /me/preferences
- `updatePreferences` - PUT/PATCH /me/preferences

#### Posts Handlers (`src/handlers/posts.js`)
- `createPost` - POST /posts
- `listPosts` - GET /posts
- `getPost` - GET /posts/{id}

### Fix Applied
Added null check for `getPrisma()` in each handler:

```javascript
const prisma = getPrisma();

// Handle degraded mode (database unavailable)
if (!prisma) {
  console.error('[handlerName] Prisma unavailable (degraded mode)');
  return error(503, 'Database unavailable');
}
```

For list endpoints (`listPosts`, `listEducation`), return empty arrays instead of 503:

```javascript
if (!prisma) {
  console.warn('[listPosts] Prisma unavailable (degraded mode), returning empty array');
  return json([]);
}
```

### Onboarding Flow Stabilization

The onboarding loop was caused by:
1. Backend handlers returning 500s, preventing `onboardingComplete` flag from being saved
2. Frontend reading `user.onboardingComplete === false` from failed /auth/me or /me/profile calls

**Solution:**
1. Fixed all handler 500s so profile updates succeed
2. The `updateMyProfile` handler properly saves `onboardingComplete: true` when explicitly passed
3. The `getMyProfile` handler returns `onboardingComplete` from the user record
4. Frontend `Protected` component correctly routes based on `user.onboardingComplete`

### "Reading" Option Removal

Per user request, the "Reading" content type was removed from:
1. `src/pages/Post.jsx` - CONTENT_TYPES, ACCEPTED_TYPES, MAX_FILE_SIZES
2. `src/constants/tags.js` - ALLOWED_TAGS, TAG_CATEGORIES
3. `serverless/src/handlers/profiles.js` - ALLOWED_TAGS

Legacy posts with "Reading" tags will still display; they are not blocked.

### Performance/Deploy Time Observations

Deployment takes ~1200-1300 seconds due to:
1. Large Lambda bundle size (~95MB) with ~465 CloudFormation resources
2. Many individual Lambda functions (individually packaged)
3. Prisma client and native binaries included in each package

Optimizations applied:
- Prisma client reuse via singleton pattern in `getPrisma()`
- `versionFunctions: false` to reduce CloudFormation resource count
- `excludeDevDependencies: true` in package config

Further optimization would require architectural changes (consolidating functions, using layers, etc.) which is out of scope for this fix.

---

## Degraded Mode Always Active - Prisma Initialization Fix (Dec 2024)

### Summary
`getPrisma()` was returning `null` for all requests in production Lambda, causing widespread 503 "Database unavailable" errors on `/me/profile`, `/posts`, `/me/preferences`, `/me/profile/education`, and other DB-backed endpoints. Health and meta endpoints (which don't use Prisma) worked correctly.

### Symptoms
- CloudWatch logs consistently showed: `[getMyProfile] Prisma unavailable (degraded mode)`
- All DB-dependent handlers returned 503 "Database unavailable"
- `/auth/diag` showed `prismaDegraded: true`
- Deploy times increased significantly (~1200-1300 seconds)
- `DATABASE_URL` was correctly set in Lambda environment

### Root Cause
The `db/client.js` was too aggressive in enabling `degradedMode`:

1. **Automatic degraded mode on any initialization failure:** Once `degradedMode` was set to `true` (either from URL validation failure or catch block), it never recovered
2. **Overly strict URL validation:** Valid URLs could be rejected by transient validation issues
3. **Permanent error caching:** `prismaInitError` prevented any retry attempts even if the underlying issue was fixed

The combination meant that a single transient failure during Lambda cold start would permanently lock the function into degraded mode until the next deployment.

### Fix Applied
1. **Removed automatic `degradedMode = true` from initialization failures:**
   - `validateDatabaseUrl` failures now log error but don't set `degradedMode`
   - Catch block in `getPrisma()` now stores error but doesn't set `degradedMode`
   - `initPrismaAsync()` connection test no longer sets `degradedMode` on failure

2. **Added `resetPrismaState()` helper:**
   - Allows clearing cached client and error state for reconnection attempts

3. **`degradedMode` is now ONLY activated by explicit `setDegradedMode(true)` call:**
   - Used for intentional failover scenarios (testing, manual override)
   - Not triggered automatically by transient errors

4. **Fixed esbuild external pattern for Prisma:**
   - Changed `.prisma` to `.prisma/*` and `.prisma/client/*` for proper glob matching

5. **Simplified deploy script:**
   - Removed build:layer dependency, runs `prisma generate` directly before deploy
   - Deploy command: `npm run prisma:generate && serverless deploy`

### Key Principle
> Transient initialization failures should NOT permanently lock Lambda functions into degraded mode. Handlers should return appropriate error codes (503) per-request, allowing retries when the underlying issue (network, DB availability) resolves.

### Verification Steps
After deployment:
1. `GET /auth/diag` → `prismaDegraded: false`
2. `GET /me/profile` → 200 with user profile data
3. `GET /posts?limit=20` → 200 with posts array
4. `PATCH /me/profile` → 200 on profile update
5. `GET /me/preferences` → 200 with user preferences

### PowerShell Validation Commands
```powershell
cd C:\Users\ghawk\Documents\GitHub\Project-Valine
git checkout main
git pull origin main
cd .\serverless
npm ci
npx serverless deploy --stage prod --region us-west-2
```

---

## Related Files

- `serverless.yml` - esbuild and package configuration
- `src/db/client.js` - Prisma client initialization with error handling
- `src/handlers/auth.js` - Authentication handlers
- `src/handlers/profiles.js` - Profile update handlers
- `src/handlers/education.js` - Education CRUD handlers
- `src/handlers/notifications.js` - Notification handlers
- `src/handlers/posts.js` - Post creation handlers
- `src/handlers/settings.js` - Settings and preferences handlers
- `src/utils/tokenManager.js` - JWT generation and cookie formatting
- `src/middleware/csrfMiddleware.js` - CSRF token handling
- `prisma/schema.prisma` - Database schema and binary targets
