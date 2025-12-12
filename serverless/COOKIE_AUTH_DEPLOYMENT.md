# Cookie Authentication Deployment Guide

## Overview

This document explains how cookie-based authentication works with AWS API Gateway HTTP API v2 and CloudFront, and provides guidance for deployment and troubleshooting.

## Architecture

```
Browser → CloudFront (dkmxy676d3vgc.cloudfront.net) 
       → API Gateway HTTP API v2 (*.execute-api.*.amazonaws.com)
       → Lambda Functions
```

## Cookie Handling: HTTP API v2 vs REST API

### API Gateway HTTP API v2 (Current)

HTTP API v2 automatically parses cookies from the `Cookie` header and provides them in **both** formats:

1. **event.cookies** - Array format (recommended for HTTP API v2)
   ```javascript
   event.cookies = [
     "access_token=eyJhbGc...",
     "refresh_token=eyJhbGc...",
     "session_id=abc123"
   ]
   ```

2. **event.headers.cookie** - String format (traditional)
   ```javascript
   event.headers.cookie = "access_token=eyJhbGc...; refresh_token=eyJhbGc...; session_id=abc123"
   ```

### REST API / ALB (Legacy)

Traditional REST API and ALB only provide cookies as a header string:

```javascript
event.headers.cookie = "access_token=eyJhbGc...; refresh_token=eyJhbGc..."
```

## Authentication Flow

### Token Extraction Priority

The `extractToken()` function in `src/utils/tokenManager.js` supports all formats with the following priority:

1. **event.cookies[]** - HTTP API v2 array format (checked first)
2. **event.headers.cookie** or **event.headers.Cookie** - Traditional header format
3. **Authorization: Bearer** - Fallback for development/tooling (access tokens only)

### Example: Production Request

```javascript
// CloudFront sends request to API Gateway HTTP API v2
const event = {
  requestContext: {
    http: {
      method: 'GET',
      path: '/auth/me'
    }
  },
  cookies: [
    "access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  ],
  headers: {
    origin: 'https://dkmxy676d3vgc.cloudfront.net',
    'user-agent': 'Mozilla/5.0...'
  }
};

// extractToken finds token in event.cookies[0]
const token = extractToken(event, 'access');
// → "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

const userId = getUserIdFromEvent(event);
// → "user-id-123"
```

## Cookie Generation

### Cross-Origin Cookie Requirements

For cookies to work across CloudFront (frontend) and API Gateway (backend):

1. **SameSite=None** - Required for cross-site cookies
2. **Secure** - Required when using SameSite=None
3. **HttpOnly** - Prevents JavaScript access (security)
4. **No Domain attribute** - Creates host-only cookie scoped to API domain

### Why Host-Only Cookies?

Setting `Domain=.execute-api.amazonaws.com` or `Domain=cloudfront.net` **will fail** because:

- The API response comes from `*.execute-api.*.amazonaws.com`, not from CloudFront
- Browser rejects Set-Cookie with Domain that doesn't match the response domain
- Host-only cookies (no Domain attribute) work correctly for cross-origin requests with `SameSite=None; Secure`

### Example Cookie Generation

```javascript
// Production cookie (SameSite=None, Secure, no Domain)
generateAccessTokenCookie(token)
// → "access_token=eyJhbGc...; HttpOnly; Path=/; SameSite=None; Max-Age=1800; Secure"

// Development cookie (SameSite=Lax, no Secure)
generateAccessTokenCookie(token)
// → "access_token=eyJhbGc...; HttpOnly; Path=/; SameSite=Lax; Max-Age=1800"
```

## CORS Configuration

### Invalid Configuration (WILL FAIL)

```javascript
// ❌ Wildcard origin with credentials - browsers reject this
{
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': 'true'
}
```

### Valid Configuration (CORRECT)

```javascript
// ✅ Exact origin with credentials
import { getCorsHeaders } from '../utils/headers.js';

const headers = {
  'Content-Type': 'application/json',
  ...getCorsHeaders(event)  // Returns exact origin from allowlist
};

// Result:
{
  'Access-Control-Allow-Origin': 'https://dkmxy676d3vgc.cloudfront.net',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-CSRF-Token,X-Requested-With,Cookie'
}
```

### Allowed Origins

The `getCorsHeaders()` function checks the request origin against an allowlist:

- **Production**: `FRONTEND_URL` env var + `https://dkmxy676d3vgc.cloudfront.net`
- **Development**: Above + `http://localhost:3000`, `http://localhost:5173`

If origin is not in allowlist, defaults to `FRONTEND_URL`.

## Environment Variables

### Required for Production

```bash
# Frontend URL (CloudFront distribution)
FRONTEND_URL=https://dkmxy676d3vgc.cloudfront.net

# JWT secret (MUST be set, strong random value)
JWT_SECRET=your-production-jwt-secret-here

# Node environment
NODE_ENV=production
```

### Optional Cookie Configuration

```bash
# COOKIE_DOMAIN should NOT be set in production
# Omitting it creates host-only cookies (recommended)
# COOKIE_DOMAIN=  # Leave unset or empty

# CSRF protection (recommended for production)
CSRF_ENABLED=true
```

## Troubleshooting

### 401 Unauthorized Errors

**Symptom**: Frontend receives 401 on `/auth/me`, `/me/profile`, etc.

**Diagnosis**:
1. Check CloudWatch logs for auth diagnostics:
   ```
   [getMyProfile] [AUTH_DIAG] {
     hasCookiesArray: true,
     cookiesArrayLength: 2,
     hasHeaderCookie: false,
     hasAuthHeader: false
   }
   [getMyProfile] UNAUTHORIZED - No user ID from token
   ```

2. If `hasCookiesArray: true` but still unauthorized:
   - Verify `extractToken()` is being used (not custom cookie parsing)
   - Check token expiry (access tokens expire in 30 minutes)
   - Verify JWT_SECRET matches across deployments

**Solution**: Code now supports both `event.cookies[]` and `event.headers.cookie`.

### CORS Errors

**Symptom**: Browser console shows CORS policy error

```
Access to fetch at 'https://...execute-api.us-west-2.amazonaws.com/auth/me' 
from origin 'https://dkmxy676d3vgc.cloudfront.net' has been blocked by CORS policy: 
The value of the 'Access-Control-Allow-Origin' header in the response must not be 
the wildcard '*' when the request's credentials mode is 'include'.
```

**Solution**: Replace hardcoded CORS headers with `getCorsHeaders(event)`:

```javascript
// Before (incorrect)
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': 'true'
};

// After (correct)
import { getCorsHeaders } from '../utils/headers.js';
const headers = {
  'Content-Type': 'application/json',
  ...getCorsHeaders(event)
};
```

### Cookies Not Being Set

**Symptom**: Login succeeds (200) but cookies not stored in browser

**Diagnosis**:
1. Check browser DevTools → Application → Cookies
2. Check Network tab → Response Headers for `Set-Cookie` (may be redacted)
3. Verify CloudFront is forwarding cookies (CloudFront cache policy)

**Common Causes**:
- `Domain` attribute set incorrectly → Remove Domain attribute
- Missing `Secure` flag in production → Add `Secure` flag
- `SameSite=Strict` or `SameSite=Lax` → Use `SameSite=None; Secure` for cross-origin

**Solution**: Current implementation uses host-only cookies with `SameSite=None; Secure` in production.

### Token Extraction Fails

**Symptom**: `getUserIdFromEvent()` returns null even when cookies present

**Diagnosis**:
1. Verify token format in cookies array:
   ```javascript
   console.log('cookies:', event.cookies);
   // Expected: ["access_token=eyJhbGc...", "refresh_token=eyJhbGc..."]
   ```

2. Verify token hasn't expired:
   ```javascript
   const decoded = verifyToken(token);
   console.log('Decoded:', decoded);
   // Check exp field
   ```

**Solution**: Use `getCookieHeader(event)` helper to normalize cookie extraction.

## Testing

### Unit Tests

Run cookie extraction tests:
```bash
cd serverless
npm test cookie-extraction-v2.test.js
```

### Integration Testing

Test with real events:

```javascript
// HTTP API v2 format
const event = {
  cookies: [`access_token=${yourToken}`],
  headers: { origin: 'https://dkmxy676d3vgc.cloudfront.net' }
};

const userId = getUserIdFromEvent(event);
console.log('User ID:', userId);
```

### Manual Testing

1. **Login via frontend** (sets cookies via `/auth/login`)
2. **Check browser cookies** (DevTools → Application → Cookies)
3. **Test authenticated endpoint** (`/auth/me`, `/me/profile`)
4. **Check CloudWatch logs** for auth diagnostics

### Local Development

For local testing with Authorization header:

```bash
# Get token
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' \
  | jq -r '.csrfToken')

# Use token in subsequent requests
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

## Migration from REST API to HTTP API v2

If migrating from REST API (v1) to HTTP API v2:

1. **No code changes required** - `extractToken()` supports both formats
2. **Verify event structure** in logs - look for `event.cookies` array
3. **Update CloudWatch insights queries** if filtering on cookie headers
4. **Test thoroughly** - both formats should work during transition

## Security Considerations

### Do's ✅

- Use `HttpOnly` cookies for auth tokens
- Use `Secure` flag in production
- Use `SameSite=None` for cross-origin cookies
- Validate JWT signature with strong `JWT_SECRET`
- Set appropriate `Max-Age` (30 min for access, 7 days for refresh)
- Use `getCorsHeaders(event)` for CORS (exact origin, not wildcard)

### Don'ts ❌

- Don't set `Domain` attribute for cross-origin cookies
- Don't use wildcard (`*`) CORS origin with credentials
- Don't log cookie values (use diagnostics without values)
- Don't use default/weak `JWT_SECRET` in production
- Don't disable `HttpOnly` (allows JavaScript access to tokens)
- Don't use `SameSite=Strict` (blocks cross-origin requests)

## References

- [AWS API Gateway HTTP API v2 Cookie Format](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html#http-api-develop-integrations-lambda.v2)
- [MDN: Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [MDN: SameSite cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [MDN: CORS with credentials](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#requests_with_credentials)

## Support

For issues or questions:
1. Check CloudWatch logs for auth diagnostics
2. Review this guide for common issues
3. Run unit tests to verify token extraction
4. Check browser DevTools for CORS/cookie errors
