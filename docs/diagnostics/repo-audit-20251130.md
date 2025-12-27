# Repository Audit Report - 2025-11-30

## Executive Summary

This audit identified the root cause of 401 authentication failures and profile persistence issues in the Project Valine application. The primary issue is that **AWS HTTP API v2 provides cookies in `event.cookies` (an array) rather than only in `event.headers.cookie`**, and the current `tokenManager.js` only reads from the headers.

### Key Findings

| Area | Severity | Issue | Status |
|------|----------|-------|--------|
| Auth/Cookies | **P0** | `extractToken` doesn't read `event.cookies` array (HTTP API v2) | **FIXED** |
| CORS | **P1** | Inconsistent credential header types (boolean vs string) | **FIXED** |
| Logging | **P1** | Missing diagnostic logging for cookie/auth detection | **FIXED** |
| Profile | **P2** | Field mappings correct; issue was auth cookies not being read | Resolved by auth fix |
| Onboarding | **P2** | Flags handled correctly in `updateMyProfile` | No change needed |

---

## Detailed Findings

### 1. Authentication & Cookie Handling

#### Issue: HTTP API v2 Cookie Extraction (P0 - CRITICAL)

**File**: `serverless/src/utils/tokenManager.js`  
**Line**: 120

**Problem**: The `extractToken` function only reads cookies from `event.headers.cookie`:
```javascript
const cookies = parseCookies(event.headers?.cookie || event.headers?.Cookie || '');
```

**Root Cause**: AWS HTTP API v2 (used by this project per `serverless.yml`) provides cookies in two ways:
1. `event.headers.cookie` - raw cookie header string (traditional)
2. `event.cookies` - **array of individual cookie strings** (HTTP API v2 format)

When browsers send cookies with `withCredentials: true` (enabled in `src/services/api.js:75`), API Gateway may parse them into `event.cookies` array. If the handler only checks headers, authentication fails.

**CloudWatch Symptom**: `[updateMyProfile] UNAUTHORIZED - No user ID from token`

**Fix Applied**: Modified `extractToken` to also check `event.cookies` array before falling back to headers.

#### Verification: Frontend axios Configuration

**File**: `src/services/api.js:75`  
**Status**: ✅ Correctly configured

```javascript
withCredentials: import.meta.env.VITE_ENABLE_AUTH === 'true' || import.meta.env.VITE_API_USE_CREDENTIALS === 'true'
```

**File**: `.env.production`  
**Status**: ✅ Correctly configured with `VITE_ENABLE_AUTH=true` and `VITE_API_USE_CREDENTIALS=true`

---

### 2. CORS Headers

#### Issue: Inconsistent Credential Header Types (P1)

**Files affected**:
- `serverless/src/handlers/profiles.js:19` - uses `true` (boolean)
- `serverless/src/handlers/reports.js:16` - uses `true` (boolean)
- `serverless/src/handlers/moderation.js:15` - uses `true` (boolean)

**Problem**: HTTP headers must be strings. Using boolean `true` instead of string `'true'` may cause browsers to reject the CORS preflight.

**Correct implementations** (for reference):
- `serverless/src/utils/headers.js:68` - uses `'true'` (string) ✅
- `serverless/src/utils/corsHeaders.js:24` - uses `'true'` (string) ✅

**Fix Applied**: Updated handlers to use string `'true'`.

#### CORS Configuration in serverless.yml

**Status**: ✅ Correctly configured

```yaml
httpApi:
  cors:
    allowedOrigins:
      - https://dkmxy676d3vgc.cloudfront.net
      - http://localhost:5173
      - http://localhost:3000
    allowedHeaders:
      - Content-Type
      - Authorization
      - X-CSRF-Token
      - X-Requested-With
      - Cookie
    allowCredentials: true
```

---

### 3. Profile Persistence

#### Schema Analysis

**File**: `serverless/prisma/schema.prisma`

Profile model fields (lines 216-237):
- `headline` ✅
- `title` ✅ (added in previous PR)
- `bio` ✅
- `roles` (String[]) ✅
- `tags` (String[]) ✅
- `location` (Json) ✅
- `socialLinks` (Json) ✅

User model fields (lines 10-52):
- `onboardingComplete` (Boolean) ✅
- `profileComplete` (Boolean) ✅
- `displayName` ✅
- `avatar` ✅

#### Handler Field Mapping

**File**: `serverless/src/handlers/profiles.js`

`updateMyProfile` (lines 685-992) correctly handles:
- `displayName` → User.displayName
- `headline` → Profile.headline
- `title` → Profile.title
- `bio` → Profile.bio
- `roles` → Profile.roles (no mapping from `primaryRoles`)
- `tags` → Profile.tags (no mapping from `skills`)
- `onboardingComplete` → User.onboardingComplete
- `profileComplete` → User.profileComplete

**Note**: No `primaryRoles`→`roles` or `skills`→`tags` mapping needed as frontend sends correct field names.

#### Frontend Field Mapping

**File**: `src/pages/Onboarding/index.jsx:125-134`

```javascript
const updates = {
  displayName: onboardingData.displayName || '',
  headline: onboardingData.headline || '',
  bio: onboardingData.bio || '',
  roles: onboardingData.roles || [],
  tags: onboardingData.tags || [],
  avatarUrl: onboardingData.avatar || null,
  profileComplete: true,
  onboardingComplete: true,
};
```

**Status**: ✅ Field names match backend expectations exactly.

---

### 4. Onboarding & Refresh Flow

#### Onboarding Flag Handling

**File**: `serverless/src/handlers/profiles.js:883-946`

The handler correctly implements:
1. Explicit values from request take priority
2. `undefined` values preserve current DB state (no accidental resets)
3. Schema update errors are handled gracefully

**Status**: ✅ No issues found

#### Token Refresh

**File**: `serverless/src/handlers/auth.js:679-704`

The `refresh` handler correctly:
1. Extracts refresh token from cookies
2. Verifies token validity
3. Generates new access token
4. Returns new access cookie

**Frontend refresh handling**:
- `src/services/api.js:139-148` - dispatches `auth:unauthorized` event on 401
- `src/context/AuthContext.jsx:167-180` - `refreshUser` function fetches `/me/profile`

**TODO**: Consider adding automatic token refresh on 401 before failing the request.

---

### 5. Environment Configuration

#### JWT_SECRET

**File**: `serverless/src/utils/tokenManager.js:18-34`

Correctly validates that default secret is not used in production:
```javascript
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'dev-secret-key-change-in-production') {
  throw new Error('SECURITY ERROR: Default JWT_SECRET must not be used in production...');
}
```

**Status**: ✅ Properly configured

#### Cookie Domain

**File**: `serverless.yml:59`

```yaml
COOKIE_DOMAIN: ${env:COOKIE_DOMAIN, ".cloudfront.net"}
```

**File**: `serverless/src/utils/tokenManager.js:161-177`

Correctly generates cookies without explicit Domain attribute for cross-origin compatibility:
```javascript
// Don't set Domain - let browser set it to the API domain for cross-site cookies
```

**Status**: ✅ Properly configured

---

### 6. Missing Tests

#### Critical Auth Flow Tests Needed

- [ ] Test `extractToken` with `event.cookies` array format
- [ ] Integration test for cross-origin cookie flow (frontend → API Gateway)
- [ ] Test 401 handling and token refresh cycle

#### Profile Persistence Tests Needed

- [ ] End-to-end test: onboarding flow → logout → login → verify data persisted
- [ ] Test `onboardingComplete` flag preservation during profile edits

---

## Repro Steps for Verification

### cURL Command to Test Cookie Auth

```powershell
# Step 1: Login and capture cookies
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Post -Headers @{
    "Content-Type" = "application/json"
    "Origin" = "https://dkmxy676d3vgc.cloudfront.net"
    "Origin" = "https://dkmxy676d3vgc.cloudfront.net"
} -Body '{"email":"your-email@example.com","password":"your-password"}' -ContentType 'application/json'
```

### PowerShell Command (Windows)

```powershell
# Login
$loginResponse = Invoke-WebRequest -Uri "https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"your-email@example.com","password":"your-password"}' `
  -SessionVariable session

# Test profile endpoint
Invoke-WebRequest -Uri "https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/me/profile" `
  -Method GET `
  -WebSession $session
```

---

## Changes Made

### 1. tokenManager.js - Cookie Extraction Fix

Added support for HTTP API v2 `event.cookies` array:

```javascript
// serverless/src/utils/tokenManager.js - extractToken function
// Now reads from:
// 1. event.cookies array (HTTP API v2 format) - checked first
// 2. event.headers.cookie (traditional format) - fallback
// 3. Authorization header (for tooling/testing)
```

### 2. Diagnostic Logging Added

Added diagnostic logging to protected handlers:
- `serverless/src/handlers/profiles.js` - getMyProfile, updateMyProfile
- `serverless/src/handlers/settings.js` - getPreferences

Logs include (redacted):
- Presence of `event.cookies` array
- Presence of `event.headers.cookie`
- Presence of `Authorization` header
- Extracted user ID (or null)

### 3. CORS Header Fixes

Updated handlers to use string `'true'` for `Access-Control-Allow-Credentials`:
- `serverless/src/handlers/profiles.js`
- `serverless/src/handlers/reports.js`
- `serverless/src/handlers/moderation.js`

---

## Validation Checklist

After deployment, verify:

- [ ] `/me/profile` returns 200 (not 401)
- [ ] CloudWatch logs show `[AUTH_DIAG]` entries with cookie detection
- [ ] Profile save persists after logout/login cycle
- [ ] No more 401s for `/me/preferences` in browser console
- [ ] Onboarding flow completes and `onboardingComplete` flag is set

---

## Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| Cookie extraction update | Low | Backward compatible - still checks headers as fallback |
| Diagnostic logging | Low | Logs only presence/absence, not actual values |
| CORS header type fix | Low | Corrects potential browser rejection |

---

## Next Steps (TODOs)

1. **P1**: Add integration tests for `event.cookies` array format
2. **P2**: Consider automatic token refresh on 401 in `src/services/api.js`
3. **P2**: Add structured logging with correlation IDs to all protected endpoints
4. **P3**: Review and update docs/backend/AUTH_FLOW.md with HTTP API v2 details
