# Route to Function Mapping

## Current Production Status (2025-12-27)

### Working Endpoints (200 ✅)
| Route | Lambda Function | Handler Path | Auth Method |
|-------|----------------|--------------|-------------|
| `GET /auth/me` | `authRouter` | `src/handlers/authRouter.js` → `auth.me` | `getUserIdFromEvent` |
| `GET /unread-counts` | `notificationsRouter` | `src/handlers/notificationsRouter.js` → `notifications.getUnreadCounts` | `getUserFromEvent` (optional) |

### Failing Endpoints (401 ❌)
| Route | Lambda Function | Handler Path | Auth Method |
|-------|----------------|--------------|-------------|
| `GET /me/profile` | `profilesRouter` | `src/handlers/profilesRouter.js` → `profiles.getMyProfile` | `getUserFromEvent` |
| `GET /me/preferences` | `getPreferences` | `src/handlers/settings.js` → `getPreferences` | `getUserFromEvent` |
| `PUT /me/preferences` | `updatePreferences` | `src/handlers/settings.js` → `updatePreferences` | `getUserFromEvent` |
| `GET /feed` | `getFeed` | `src/handlers/feed.js` → `getFeed` | `getUserFromEvent` |

## Authentication Flow

All endpoints use the same authentication chain:

1. **Handler calls**: `getUserFromEvent(event)` or directly `getUserIdFromEvent(event)`
2. **getUserFromEvent** (in `auth.js`): Wrapper that calls `getUserIdFromEvent`
3. **getUserIdFromEvent** (in `tokenManager.js`): 
   - Calls `extractToken(event, 'access')`
   - Verifies token with `verifyToken(token)`
   - Extracts user ID from decoded token

### Token Extraction Priority (tokenManager.js:extractToken)

```javascript
1. event.cookies[] array (HTTP API v2 format)
2. event.multiValueHeaders.cookie (REST API format)
3. event.headers.cookie (Traditional format)
4. event.headers.authorization (Bearer token fallback)
```

## Environment Variables (Consistent Across All Functions)

Based on analysis of `env-pv-api-prod-*.json` files:

- ✅ `JWT_SECRET`: Same across all functions
- ✅ `DATABASE_URL`: Same across all functions
- ✅ `ALLOWED_USER_EMAILS`: Same across all functions
- ✅ `FRONTEND_URL`: Same across all functions
- ✅ `COOKIE_DOMAIN`: Same across all functions
- ✅ `NODE_ENV`: `production` for all functions

## Hypothesis: Root Cause Analysis

Since the code and environment variables are identical, the 401 regression is likely caused by:

### Theory #1: Cookie Parsing Edge Case (MOST LIKELY)
- The `extractToken` function may not handle all AWS Lambda event formats consistently
- Potential issues:
  - Leading/trailing spaces in cookie values
  - Different event structure between HTTP API v2 and REST API
  - Cookie array vs string handling

### Theory #2: Lambda Cold Start + Token Timing
- Some functions may be hitting cold start timing issues
- Token might be expiring during request routing
- Less likely since `/auth/me` works consistently

### Theory #3: API Gateway Routing Differences
- Different routes might use different API Gateway configurations
- `/auth/*` routes might have different middleware or integration settings
- Cookies might not be forwarded consistently to all Lambda functions

## Next Steps

1. ✅ Document route mapping (this file)
2. ⏳ Add enhanced logging to `extractToken` in tokenManager.js
3. ⏳ Add correlation IDs to all auth failures
4. ⏳ Deploy with enhanced logging
5. ⏳ Capture CloudWatch logs for failing requests
6. ⏳ Identify exact extraction branch being used
7. ⏳ Implement fix based on findings
