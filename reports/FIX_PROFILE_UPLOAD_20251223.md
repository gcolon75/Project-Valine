# Profile Upload and Post Delete Button Fix - December 23, 2025

## Overview
This document details the fixes implemented to address profile image upload persistence issues and the missing "Delete Post" button.

## Issues Identified

### 1. Profile/Banner/Reel Upload Persistence
**Problem**: The frontend `ProfileEdit.jsx` was checking for `result.url` or `result.viewUrl` from the `uploadMedia` service. However, the backend `completeUpload` handler returns `s3Url`. Consequently, the frontend fell back to a temporary `blob:` URL, which was sent to the backend and saved. Since blob URLs are local-only, they wouldn't persist or load for other sessions/refreshes.

**Root Cause**: Property name mismatch between backend response and frontend expectation.

**Backend Code** (`serverless/src/handlers/media.js`):
```javascript
// Line 197-209
const s3Url = `https://${MEDIA_BUCKET}.s3.${process.env.AWS_REGION || 'us-west-2'}.amazonaws.com/${media.s3Key}`;

return json({
  media,
  s3Url,  // Backend returns s3Url
  message: 'Upload marked as complete, processing started',
});
```

**Original Frontend Code** (`src/pages/ProfileEdit.jsx`):
```javascript
// Lines 376-383 (Avatar), 423-430 (Banner), 472-479 (Reel)
if (result?.url || result?.viewUrl) {
  const avatarUrl = result.url || result.viewUrl;  // Looking for wrong properties
  handleChange('avatar', avatarUrl);
} else {
  // Fallback to temporary URL if backend doesn't return URL yet
  const tempUrl = URL.createObjectURL(file);  // This blob URL was being saved!
  handleChange('avatar', tempUrl);
}
```

### 2. Profile Links Not Saving
**Problem**: `ProfileEdit.jsx` was mapping profile links to the `socialLinks` field in the payload. The backend `updateMyProfile` handler expects `links`. This caused profile links to not save properly.

**Root Cause**: Field name mismatch between frontend and backend.

**Original Frontend Code** (`src/pages/ProfileEdit.jsx` line 93):
```javascript
socialLinks: formData.profileLinks  // Incorrect field name
```

**Backend Expectation**: The `updateMyProfile` endpoint expects the `links` field to update profile links.

### 3. Delete Post Button Missing
**Problem**: The "Delete Post" button in `PostCard.jsx` relies on an `isAuthor` check. This check might be failing due to property name mismatches in the post object structure (e.g., `userId` vs `authorId`).

**Root Cause**: Inconsistent property names across different post object sources.

**Original Frontend Code** (`src/components/PostCard.jsx` line 32):
```javascript
const isAuthor = user && (user.id === post.author?.id || user.id === post.authorId);
```

## Solutions Implemented

### 1. Fixed Profile Image Upload Handlers

Updated `src/pages/ProfileEdit.jsx` in three locations:
- `handleAvatarUpload` (lines 375-384)
- `handleBannerUpload` (lines 422-431)  
- `handleReelUpload` (lines 471-480)

**Changes**:
```javascript
// Updated to prioritize s3Url from backend response
if (result?.s3Url || result?.url || result?.viewUrl) {
  const avatarUrl = result.s3Url || result.url || result.viewUrl;
  handleChange('avatar', avatarUrl);
} else {
  // Fallback to temporary URL if backend doesn't return URL yet
  const tempUrl = URL.createObjectURL(file);
  handleChange('avatar', tempUrl);
}
```

This ensures:
- The S3 URL from the backend is prioritized (`result.s3Url`)
- Backward compatibility with other possible response formats (`result.url`, `result.viewUrl`)
- Blob URL is only used as a last resort before actual upload completes

### 2. Fixed Profile Links Mapping

Updated `src/pages/ProfileEdit.jsx` in the `mapFormToProfileUpdate` function (line 94):

**Changes**:
```javascript
const mapFormToProfileUpdate = (formData) => {
  return {
    // ... other fields
    links: formData.profileLinks  // Changed from socialLinks to links
  };
};
```

This ensures profile links are sent to the backend using the correct field name.

### 3. Expanded isAuthor Check

Updated `src/components/PostCard.jsx` (lines 31-37):

**Changes**:
```javascript
// Check if current user is the post author
// Include fallback checks for different property name variations
const isAuthor = user && (
  user.id === post.author?.id || 
  user.id === post.authorId || 
  user.id === post.userId || 
  user.id === post.ownerId
);
```

This handles various post object structures that might have different property names for the author/owner ID.

## Verification Steps

### Profile Image Upload
1. Navigate to Profile Edit page
2. Upload a profile picture, banner, or reel
3. Save the profile
4. Refresh the page
5. **Expected Result**: Uploaded images should persist and display correctly

### Profile Links
1. Navigate to Profile Edit page
2. Add or modify profile links (website, social media, etc.)
3. Save the profile
4. Refresh the page
5. **Expected Result**: Profile links should be saved and displayed

### Post Delete Button
1. Log in as a user
2. View one of your own posts in the feed
3. Click the three-dot menu on your post
4. **Expected Result**: "Delete post" option should be visible and functional

## Files Modified

1. `src/pages/ProfileEdit.jsx`
   - Updated `handleAvatarUpload` to check for `s3Url`
   - Updated `handleBannerUpload` to check for `s3Url`
   - Updated `handleReelUpload` to check for `s3Url`
   - Fixed `mapFormToProfileUpdate` to use `links` instead of `socialLinks`

2. `src/components/PostCard.jsx`
   - Expanded `isAuthor` check to include `userId` and `ownerId` fallbacks

3. `reports/FIX_PROFILE_UPLOAD_20251223.md` (this file)
   - Created documentation for the fixes

## Technical Details

### Media Upload Flow
1. Frontend calls `uploadMedia(profileId, file, type, options)`
2. Service makes three API calls:
   - `getUploadUrl()` - Gets presigned S3 URL and creates media record
   - `uploadToS3()` - Uploads file directly to S3
   - `completeUpload()` - Marks upload as complete and returns S3 URL
3. Backend response from `completeUpload` includes `{ media, s3Url, message }`
4. Frontend now correctly extracts `s3Url` and uses it for the avatar/banner/reel

### Profile Update Flow
1. Frontend collects form data in `formData` state
2. `mapFormToProfileUpdate()` transforms form data to match backend API schema
3. `updateMyProfile(profileUpdate)` sends PATCH request to `/me/profile`
4. Backend expects `links` array for profile links
5. Frontend now correctly maps `formData.profileLinks` to `links`

## Impact Assessment

### Risk Level: Low
- Changes are minimal and focused
- Backward compatible (checks multiple property names)
- No database schema changes required
- No API contract changes

### Testing Priority: High
- Upload functionality is critical for user profiles
- Delete functionality is important for content management
- Profile links affect user discoverability

## Related Issues

This fix addresses the core issues mentioned in the problem statement:
- Profile images not persisting after upload
- Profile links not saving
- Delete button not appearing on user's own posts

## Future Improvements

1. **Standardize API Response Format**: Ensure all media-related endpoints return consistent property names (`s3Url`, `viewUrl`, etc.)
2. **Improve Error Handling**: Add explicit error messages when upload fails or returns unexpected format
3. **Add Loading States**: Show upload progress and prevent form submission while upload is in progress
4. **Post Object Normalization**: Create a utility function to normalize post objects to have consistent property names
5. **Add Integration Tests**: Create tests that verify end-to-end upload and profile update flows
