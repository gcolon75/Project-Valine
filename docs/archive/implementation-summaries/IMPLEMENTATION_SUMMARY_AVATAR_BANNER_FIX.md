# Avatar/Banner Upload Fix - Implementation Summary

## Problem Statement

Users experienced issues when uploading and saving profile avatars and banners:

1. **401 Unauthorized errors** when Chrome "Disable cache" was enabled
2. **Stale avatar/banner images** persisting after upload and save
3. **Stale profile data** shown after saving changes
4. **Avatar not persisting** - showed old image after leaving and re-entering profile page
5. **Multiple GET requests** racing after save, potentially overwriting fresh data

## Root Causes Identified

### 1. Credentials Not Sent Consistently
**Problem**: `withCredentials` was conditional based on environment variables
```javascript
withCredentials: import.meta.env.VITE_ENABLE_AUTH === 'true' || import.meta.env.VITE_API_USE_CREDENTIALS === 'true'
```
**Impact**: When env vars were not set or in different environments, cookies weren't sent, causing 401 errors

### 2. No Cache-Control Headers
**Problem**: Backend didn't send cache-prevention headers on profile endpoints
**Impact**: Browser cached profile responses, showing stale data after updates

### 3. Image URLs Not Cache-Busted
**Problem**: Avatar/banner URLs were static (no version/timestamp)
**Impact**: Browser served cached images even after new uploads

### 4. Avatar Using Data URLs
**Problem**: ImageCropper component returned base64 data URLs instead of uploading to S3
**Impact**: 
- Huge payloads sent to backend (several MB)
- Data URLs not properly persisted in database
- Avatar disappeared after save

### 5. Field Name Mismatch
**Problem**: Frontend sent `avatar` but backend expected `avatarUrl`
**Impact**: Avatar field was silently ignored by backend

## Solutions Implemented

### 1. Always Send Credentials
**File**: `src/services/api.js`
```javascript
// Before
withCredentials: import.meta.env.VITE_ENABLE_AUTH === 'true' || import.meta.env.VITE_API_USE_CREDENTIALS === 'true'

// After  
withCredentials: true  // Always enable for cookie-based auth
```
**Impact**: Fixes 401 errors when cache is disabled

### 2. Add No-Cache Headers
**Files**: 
- `serverless/src/utils/headers.js` - Added `jsonNoCache()` helper
- `serverless/src/handlers/profiles.js` - Use for GET/PATCH `/me/profile`

```javascript
export function jsonNoCache(data, statusCode = 200, extra = {}) {
  return json(data, statusCode, {
    ...extra,
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
}
```
**Impact**: Browser never caches profile data

### 3. Implement Cache-Busting for Images
**New File**: `src/utils/imageUtils.js`
```javascript
export const getCacheBustedImageUrl = (url, version) => {
  if (!url) return url;
  const versionParam = version || Date.now();
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${versionParam}`;
};
```

**Updated**: `src/pages/Profile.jsx`
```javascript
src={getCacheBustedAvatarUrl(displayData.avatar, displayData)}
src={getCacheBustedBannerUrl(displayData.bannerUrl, displayData)}
```

**Backend**: Added `updatedAt` timestamp to profile responses
**Impact**: Browser fetches new images after each update

### 4. Fix Avatar Upload Flow
**File**: `src/pages/ProfileEdit.jsx`

**Before**:
- Used `ImageCropper` which returned data URL
- `handleAvatarUpload(imageUrl)` immediately set form state

**After**:
- Use `AvatarUploader` which provides blob
- `handleAvatarUpload(file, onProgress)` uploads to S3 first
- Follows same pattern as banner upload

```javascript
const handleAvatarUpload = async (file, onProgress) => {
  const toastId = toast.loading('Uploading avatar...');
  
  try {
    const targetProfileId = profileId || user?.id || 'me';
    const result = await uploadMedia(targetProfileId, file, 'image', {
      title: 'Profile Avatar',
      description: 'Profile picture',
      privacy: 'public',
      onProgress,
    });

    if (result?.url || result?.viewUrl) {
      const avatarUrl = result.url || result.viewUrl;
      handleChange('avatar', avatarUrl);
    }
    
    toast.success('Avatar uploaded successfully!', { id: toastId });
    setShowImageCropper(false);
  } catch (error) {
    // Error handling...
  }
};
```
**Impact**: Avatar properly uploads to S3 and persists

### 5. Fix Field Name Mapping
**File**: `src/pages/ProfileEdit.jsx`
```javascript
const mapFormToProfileUpdate = (formData) => {
  return {
    // ... other fields
    avatarUrl: formData.avatar,  // Map frontend 'avatar' to backend 'avatarUrl'
    bannerUrl: formData.banner || formData.bannerUrl,
    // ... other fields
  };
};
```
**Impact**: Backend correctly receives and saves avatar URL

## Files Changed

### Frontend
1. `src/services/api.js` - Always send credentials
2. `src/utils/imageUtils.js` - New cache-busting utilities
3. `src/pages/Profile.jsx` - Apply cache-busting to image URLs
4. `src/pages/ProfileEdit.jsx` - Fix avatar upload and field mapping

### Backend
1. `serverless/src/utils/headers.js` - Add jsonNoCache() helper
2. `serverless/src/handlers/profiles.js` - Use no-cache headers, add updatedAt

### Documentation
1. `TEST_PLAN_AVATAR_BANNER_FIX.md` - Comprehensive test plan

## Testing Checklist

- [ ] Avatar uploads to S3 and persists after save
- [ ] Banner uploads to S3 and persists after save
- [ ] No 401 errors with Chrome "Disable cache" enabled
- [ ] Images include cache-busting query parameters
- [ ] Images update immediately (no stale cache)
- [ ] Profile data not cached by browser
- [ ] Single GET after PATCH (no race conditions)
- [ ] Uploads complete before save
- [ ] Small payloads (S3 URLs, not data URLs)

## Deployment Notes

### Frontend Deployment
1. Build with latest changes: `npm run build`
2. Deploy to CloudFront
3. Invalidate CloudFront cache for `/profile*` paths

### Backend Deployment
1. Deploy Lambda function with updated profile handler
2. No database migrations required
3. Test in staging first

### Environment Variables
No new environment variables required. Removed dependency on:
- `VITE_ENABLE_AUTH`
- `VITE_API_USE_CREDENTIALS`

## Verification Steps

1. Deploy backend changes
2. Deploy frontend changes
3. Clear browser cache completely
4. Test avatar upload and save
5. Test banner upload and save
6. Enable Chrome "Disable cache" and test again
7. Verify Network tab shows proper headers and URLs
8. Test in multiple browsers

## Known Limitations

1. Cache-busting uses `updatedAt` timestamp from backend
   - If backend doesn't update timestamp, cache-busting won't work
   - Consider adding dedicated `avatarUpdatedAt` and `bannerUpdatedAt` fields in future

2. AvatarUploader processes images client-side
   - Large images may take time to process
   - Progress indicator shows processing, not just upload

3. S3 upload requires proper CORS configuration
   - Ensure S3 bucket allows uploads from frontend origin
   - Verify presigned URLs are generated correctly

## Future Improvements

1. Add `avatarUpdatedAt` and `bannerUpdatedAt` fields to Profile model
2. Implement optimistic updates with rollback on failure
3. Add image compression before upload to reduce file sizes
4. Add cropping UI for banner images (not just avatar)
5. Implement retry logic for failed uploads
6. Add unit tests for cache-busting utilities
7. Add integration tests for upload flow

## References

- Problem statement: Original issue description
- Related PRs: [Link to PR when created]
- AWS S3 documentation: Presigned URLs
- MDN Web Docs: Cache-Control headers
- Axios documentation: withCredentials option
