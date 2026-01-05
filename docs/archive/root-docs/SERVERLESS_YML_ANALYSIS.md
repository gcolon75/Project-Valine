> **ARCHIVED:** 2026-01-05
> **Reason:** Consolidated into canonical documentation
> **See:** [Documentation Index](./README.md) for current docs

---
# serverless.yml Analysis - Avatar/Banner Fix

## Analysis Date
2025-12-24

## Request
User asked to double-check `serverless.yml` to ensure it doesn't need updates related to the avatar/banner fix.

## Changes Made in PR
The avatar/banner fix made changes to:
1. `serverless/src/handlers/profiles.js` - Added null checks (2 lines)
2. `src/pages/ProfileEdit.jsx` - Conditional field inclusion (13 lines)

## serverless.yml Review

### ✅ Handler Configuration - No Changes Needed

**Profile Router Configuration** (Lines 544-596):
```yaml
profilesRouter:
  handler: src/handlers/profilesRouter.handler
  layers:
    - { Ref: PrismaV2LambdaLayer }
  events:
    # Profile endpoints
    - httpApi:
        path: /profiles/{vanityUrl}
        method: get
    - httpApi:
        path: /profiles/id/{id}
        method: get
    - httpApi:
        path: /profiles
        method: post
    - httpApi:
        path: /profiles/id/{id}
        method: put
    - httpApi:
        path: /profiles/id/{id}
        method: delete
    - httpApi:
        path: /me/profile        # ✅ GET endpoint present
        method: get
    - httpApi:
        path: /me/profile        # ✅ PATCH endpoint present
        method: patch
```

**Status**: ✅ CORRECT
- The `/me/profile` PATCH endpoint is already configured
- Routes to `profilesRouter.handler` which calls `updateMyProfile` function
- Handler path is correct: `src/handlers/profilesRouter.handler`
- Prisma layer is correctly attached

### ✅ Media Upload Configuration - No Changes Needed

**Media Endpoints** (Lines 598-615):
```yaml
getUploadUrl:
  handler: src/handlers/media.getUploadUrl
  layers:
    - { Ref: PrismaV2LambdaLayer }
  events:
    - httpApi:
        path: /profiles/{id}/media/upload-url
        method: post

completeUpload:
  handler: src/handlers/media.completeUpload
  layers:
    - { Ref: PrismaV2LambdaLayer }
  events:
    - httpApi:
        path: /profiles/{id}/media/complete
        method: post
```

**Status**: ✅ CORRECT
- Media upload endpoints are properly configured
- Used by avatar/banner uploads
- Handlers correctly reference media.js functions

### ✅ Environment Variables - No Changes Needed

**Media-Related Variables** (Lines 36-85):
```yaml
environment:
  MEDIA_BUCKET: ${env:MEDIA_BUCKET, "valine-media-uploads"}  # ✅ Present
  ANALYTICS_ALLOWED_EVENTS: "...,media_upload,..."           # ✅ Includes media_upload
  # ... other variables
```

**Status**: ✅ CORRECT
- `MEDIA_BUCKET` is configured for S3 uploads
- Analytics tracking includes `media_upload` event
- No avatar/banner-specific environment variables needed

### ✅ CORS Configuration - No Changes Needed

**CORS Headers** (Lines 16-35):
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
      - Cookie          # ✅ Required for auth
    allowedMethods:
      - GET
      - POST
      - PUT
      - PATCH           # ✅ Required for /me/profile
      - DELETE
      - OPTIONS
    allowCredentials: true  # ✅ Required for cookie auth
```

**Status**: ✅ CORRECT
- PATCH method is enabled (required for profile updates)
- Cookie header is allowed (required for authentication)
- Credentials are enabled

### ✅ Function Exports - Verified

**profiles.js Exports**:
```javascript
export const updateMyProfile = async (event) => { ... }  // Line 777
export const getMyProfile = async (event) => { ... }     // Line 1258
```

**profilesRouter.js Routes**:
```javascript
// PATCH /me/profile
if (method === 'PATCH' && path === '/me/profile') {
  return profiles.updateMyProfile(event, context);  // ✅ Correct
}
```

**Status**: ✅ CORRECT
- Functions are properly exported
- Router correctly imports and calls them

## Performance Considerations

### Default Lambda Settings
The `serverless.yml` uses AWS Lambda defaults:
- **Timeout**: 6 seconds (AWS default)
- **Memory**: 1024 MB (AWS default)
- **Runtime**: nodejs20.x

### Avatar/Banner Fix Impact
The fix adds minimal logic (null checks only):
- **Code Change**: 2 lines in backend
- **Performance Impact**: Negligible (~1-2ms at most)
- **Memory Impact**: None
- **Timeout Risk**: None

**Recommendation**: No timeout or memory adjustments needed.

## Conclusion

### ✅ NO CHANGES REQUIRED

The `serverless.yml` is **correctly configured** for the avatar/banner fix:

1. ✅ `/me/profile` PATCH endpoint exists and routes correctly
2. ✅ Media upload endpoints are properly configured
3. ✅ Environment variables are appropriate
4. ✅ CORS settings allow PATCH requests with credentials
5. ✅ Handler paths and exports are correct
6. ✅ Prisma layer is attached to all database functions
7. ✅ Performance settings are adequate

### Why No Changes Are Needed

The fix is a **pure logic change** within existing handlers:
- No new endpoints added
- No new environment variables needed
- No handler path changes
- No function signature changes
- No external dependencies added
- No performance characteristics changed

### Deployment Impact

**When deploying**:
```powershell
cd serverless
npm run deploy
```

The deployment will:
- ✅ Bundle the updated `profiles.js` with null checks
- ✅ Use existing `serverless.yml` configuration
- ✅ Deploy without any config changes
- ✅ Work immediately with no additional setup

## Files Reviewed

- ✅ `serverless/serverless.yml` (842 lines) - Full review
- ✅ `serverless/src/handlers/profiles.js` - Export verification
- ✅ `serverless/src/handlers/profilesRouter.js` - Routing verification
- ✅ Handler paths and function references

## Verification Commands

To verify the configuration after deployment:

```powershell
# Check if endpoints respond
$ApiBase="https://wkndtj22ab.execute-api.us-west-2.amazonaws.com"

# Health check
Invoke-RestMethod "$ApiBase/health"

# Profile endpoint (requires auth)
$headers = @{ "Authorization" = "Bearer YOUR_TOKEN" }
Invoke-RestMethod "$ApiBase/me/profile" -Headers $headers
```

---

**Summary**: serverless.yml is correctly configured and requires **NO UPDATES** for the avatar/banner fix to work.
