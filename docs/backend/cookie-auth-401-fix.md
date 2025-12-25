# Cookie Authentication 401 Fix - Technical Documentation

## Overview

This document details the fix for persistent 401 Unauthorized errors in cookie-based authentication, particularly affecting:
- `POST /profiles/{id}/media/upload-url` (avatar/banner uploads)
- `GET /me/profile` (user profile retrieval)
- `GET /feed` (feed data)

## Problem Statement

### Symptoms
Users experienced 401 Unauthorized errors even after successful login with valid cookies:
- Browser confirmed sending cookies (`access_token`, `refresh_token`, `XSRF-TOKEN`)
- Login response included user data and CSRF token
- No `Authorization` header present (expected with HttpOnly cookies)
- Cookie header visible in browser DevTools

### Environment
- **Frontend**: React + Vite at `https://dkmxy676d3vgc.cloudfront.net`
- **Backend**: AWS Lambda + API Gateway HTTP API v2 at `https://wkndtj22ab.execute-api.us-west-2.amazonaws.com`
- **Auth Method**: HttpOnly cookies with SameSite=None; Secure
- **Framework**: Serverless Framework v3

## Root Cause

### Initial Implementation
The `extractToken` function in `tokenManager.js` checked:
1. `event.cookies[]` (HTTP API v2 format)
2. `event.headers.cookie` (REST API format)
3. `Authorization` header (fallback)

### The Gap
AWS API Gateway can provide cookies in **three different locations** depending on integration type and configuration:
- **HTTP API v2**: `event.cookies[]` (array of cookie strings)
- **REST API with multiValue**: `event.multiValueHeaders.cookie` (array)
- **REST API single value**: `event.headers.cookie` (string)

The missing support for `event.multiValueHeaders` meant that some API Gateway configurations could not extract cookies, causing authentication failures.

## Solution

### Code Changes

#### Enhanced `extractToken` Function
Added support for `event.multiValueHeaders.cookie` with proper priority ordering:

```javascript
// Priority order:
// 1. event.cookies[] (HTTP API v2)
// 2. event.multiValueHeaders.cookie (REST API with multiValue)
// 3. event.headers.cookie (REST API single value)
// 4. Authorization header (tooling/testing)

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
  
  // REST API: Check multiValueHeaders.cookie (array of cookie strings)
  const multiValueCookie = event.multiValueHeaders?.cookie || event.multiValueHeaders?.Cookie;
  if (Array.isArray(multiValueCookie) && multiValueCookie.length > 0) {
    const combinedCookies = multiValueCookie.join('; ');
    const cookies = parseCookies(combinedCookies);
    if (cookies[cookieName]) {
      return cookies[cookieName];
    }
  }
  
  // Traditional format: Parse from headers.cookie string
  const headerCookie = event.headers?.cookie || event.headers?.Cookie || '';
  if (headerCookie) {
    const cookies = parseCookies(headerCookie);
    if (cookies[cookieName]) {
      return cookies[cookieName];
    }
  }
  
  // Fallback to Authorization header for access tokens
  if (tokenType === 'access') {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
  }
  
  return null;
};
```

#### Enhanced `getCookieHeader` Function
Added multiValueHeaders support:

```javascript
export const getCookieHeader = (event) => {
  // Priority: cookies[] → multiValueHeaders → headers.cookie
  
  if (Array.isArray(event?.cookies) && event.cookies.length > 0) {
    return event.cookies.join('; ');
  }
  
  const multiValueCookie = event?.multiValueHeaders?.cookie || event?.multiValueHeaders?.Cookie;
  if (Array.isArray(multiValueCookie) && multiValueCookie.length > 0) {
    return multiValueCookie.join('; ');
  }
  
  const headerCookie = event?.headers?.cookie || event?.headers?.Cookie;
  if (headerCookie) {
    return headerCookie;
  }
  
  return '';
};
```

#### Diagnostic Logging
Added safe diagnostic logging (no secrets) to track cookie extraction:

```javascript
console.log('[extractToken]', {
  tokenType,
  hasCookiesArray: Array.isArray(event.cookies) && event.cookies.length > 0,
  hasHeadersCookie: !!(event.headers?.cookie || event.headers?.Cookie),
  hasMultiValueHeaders: !!(event.multiValueHeaders?.cookie || event.multiValueHeaders?.Cookie),
  cookiesArrayLength: hasCookiesArray ? event.cookies.length : 0
});
```

### Testing

#### Test Coverage
38 test cases in `serverless/tests/cookie-extraction-v2.test.js`:

**getCookieHeader tests** (11 tests):
- Single value headers.cookie
- Array-based cookies[]
- Array-based multiValueHeaders.cookie
- Priority ordering
- Case variations (Cookie vs cookie)

**extractToken tests** (15 tests):
- HTTP API v2 cookies[] extraction
- multiValueHeaders extraction
- headers.cookie extraction
- Authorization header fallback
- Priority ordering
- Token type handling (access vs refresh)

**Integration tests** (12 tests):
- getUserIdFromEvent scenarios
- Real-world event structures (CloudFront, REST API, local dev)
- Invalid token handling
- Missing token scenarios

All tests passing: ✅ 38/38

### Files Modified

1. **serverless/src/utils/tokenManager.js**
   - Added multiValueHeaders support
   - Added diagnostic logging
   - Enhanced documentation

2. **serverless/tests/cookie-extraction-v2.test.js**
   - Added multiValueHeaders test cases
   - Enhanced priority order tests
   - Added getCookieHeader tests

## Deployment

### Prerequisites
```powershell
# Navigate to serverless directory
cd serverless

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Build Prisma Lambda layer (if needed)
npm run build:layer:powershell
```

### Deploy to Production
```powershell
# Deploy with Serverless Framework
npx serverless deploy --stage prod --region us-west-2

# Verify deployment
npx serverless info --stage prod --region us-west-2
```

### Verification Steps

#### 1. Check CloudWatch Logs
After deployment, look for diagnostic logging in CloudWatch:
```
[extractToken] {
  tokenType: 'access',
  hasCookiesArray: true,
  hasHeadersCookie: false,
  hasMultiValueHeaders: false,
  cookiesArrayLength: 2
}
[extractToken] Found in event.cookies[]
```

#### 2. Test Critical Endpoints

**Test Profile Retrieval**:
```powershell
# Should return 200 with user profile
curl -X GET https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/me/profile `
  -H "Cookie: access_token=YOUR_TOKEN" `
  -b cookies.txt
```

**Test Media Upload URL**:
```powershell
# Should return 200 with presigned URL
curl -X POST https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/profiles/PROFILE_ID/media/upload-url `
  -H "Cookie: access_token=YOUR_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{"type":"image","title":"Test","privacy":"public"}' `
  -b cookies.txt
```

**Test Feed**:
```powershell
# Should return 200 with feed data
curl -X GET https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/feed `
  -H "Cookie: access_token=YOUR_TOKEN" `
  -b cookies.txt
```

#### 3. Browser Testing
1. Navigate to `https://dkmxy676d3vgc.cloudfront.net`
2. Log in with valid credentials
3. Open DevTools → Network tab
4. Verify:
   - Login sets cookies (access_token, refresh_token, XSRF-TOKEN)
   - Subsequent requests include Cookie header
   - Endpoints return 200 (not 401)
5. Test avatar upload:
   - Go to profile edit
   - Upload an avatar
   - Should succeed without 401 errors

## Architecture Notes

### Cookie Flow
```
┌─────────────────┐
│   Browser       │
│  (CloudFront)   │
└────────┬────────┘
         │ Cookie: access_token=...
         │ Cookie: refresh_token=...
         ▼
┌─────────────────────────────────┐
│  API Gateway HTTP API v2        │
│  Parses cookies → event.cookies │
└────────┬────────────────────────┘
         │ event.cookies = [
         │   "access_token=...",
         │   "refresh_token=..."
         │ ]
         ▼
┌──────────────────────────────────┐
│  Lambda Function                 │
│  tokenManager.extractToken()     │
│  → Checks cookies[], multiValue, │
│     headers.cookie, Authorization│
└──────────────────────────────────┘
```

### API Gateway Integration Types

| Integration | Cookies Location | Supported |
|-------------|------------------|-----------|
| HTTP API v2 | `event.cookies[]` | ✅ Yes |
| REST API (multiValue) | `event.multiValueHeaders.cookie` | ✅ Yes (NEW) |
| REST API (single) | `event.headers.cookie` | ✅ Yes |
| Authorization header | `event.headers.authorization` | ✅ Yes |

## Monitoring

### Key Metrics to Watch

1. **401 Error Rate**: Should drop significantly post-deployment
2. **Media Upload Success Rate**: Should increase
3. **Profile API Success Rate**: Should increase

### CloudWatch Log Insights Queries

**Track cookie extraction sources**:
```
fields @timestamp, @message
| filter @message like /\[extractToken\] Found in/
| stats count() by @message
| sort count desc
```

**Find authentication failures**:
```
fields @timestamp, @message
| filter @message like /Unauthorized/ or @message like /401/
| sort @timestamp desc
| limit 100
```

**Track cookie extraction diagnostics**:
```
fields @timestamp, @message
| filter @message like /\[extractToken\]/
| parse @message /hasCookiesArray: (?<hasCookies>[^,]+), hasHeadersCookie: (?<hasHeaders>[^,]+), hasMultiValueHeaders: (?<hasMulti>[^,]+)/
| stats count() by hasCookies, hasHeaders, hasMulti
```

## Rollback Plan

If issues arise after deployment:

```powershell
# Option 1: Rollback to previous version
npx serverless rollback --stage prod --region us-west-2

# Option 2: Deploy specific version
npx serverless deploy --stage prod --region us-west-2 --version PREVIOUS_VERSION
```

## Future Considerations

### Potential Optimizations
1. **Remove logging in production**: Set `NODE_ENV=production` to suppress diagnostic logs
2. **Caching**: Consider caching parsed cookies within request context
3. **Metrics**: Add CloudWatch custom metrics for cookie extraction method distribution

### Related Work
- **CSRF Protection**: Already implemented in `csrfMiddleware.js`
- **Token Refresh**: Refresh token rotation handled in `authRouter.js`
- **Session Management**: Consider Redis-backed sessions for scale

## References

- **AWS Documentation**: 
  - [API Gateway HTTP API v2 Format](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html)
  - [REST API Event Format](https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html)
- **Related Files**:
  - `serverless/src/utils/tokenManager.js` - Token extraction utilities
  - `serverless/src/handlers/auth.js` - Authentication handlers
  - `serverless/src/handlers/media.js` - Media upload handlers
  - `serverless/src/utils/authMiddleware.js` - Auth middleware
- **Tests**:
  - `serverless/tests/cookie-extraction-v2.test.js` - Cookie extraction tests
  - `serverless/tests/auth-cookies.test.js` - Auth cookie tests

## Change History

| Date | Author | Change |
|------|--------|--------|
| 2025-12-25 | Copilot Agent | Initial implementation: Added multiValueHeaders support and diagnostic logging |

## Support

For issues or questions:
1. Check CloudWatch logs for diagnostic output
2. Review test cases in `cookie-extraction-v2.test.js`
3. Verify API Gateway integration type matches expected format
4. Consult `troubleshooting-auth-profile-posts.md` for auth troubleshooting
