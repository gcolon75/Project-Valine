# Avatar Upload Rebuild Report

## What Was Broken

### Issue 1: Blob URL Fallback in Upload Handler
**Location:** `src/pages/ProfileEdit.jsx` lines 382-384

The avatar upload handler had a dangerous fallback that would store blob URLs in the database:
```javascript
} else {
  // Fallback to temporary URL if backend doesn't return URL yet
  const tempUrl = URL.createObjectURL(file);
  handleChange('avatar', tempUrl);
}
```

**Problem:** Blob URLs are temporary, browser-specific, and invalid after page refresh. This caused avatars to disappear after save + refresh.

### Issue 2: Inconsistent AvatarUploader Callback Signature
**Location:** `src/components/AvatarUploader.jsx` vs `src/pages/ProfileEdit.jsx`

- AvatarUploader expects: `onUpload(blob, fileType)`
- ProfileEdit calls it with: `onUpload(file, onProgress)`

This mismatch caused confusion and potential errors in the upload flow.

### Issue 3: No Cache-Busting After Save
**Location:** `src/pages/ProfileEdit.jsx` save handler

After saving the profile, the UI didn't force browser to refetch the new avatar. Browsers would show cached old avatars even after successful upload.

### Issue 4: Missing Source of Truth
The upload flow didn't enforce s3Url as the single source of truth. Multiple fallback paths (url, viewUrl, blob URLs) created unpredictable behavior.

## New Flow Diagram

### Avatar Upload Flow (Fixed)

1. **User selects image** → AvatarUploader opens
2. **Client-side processing** → Image cropped/resized to 800x800
3. **Upload to S3**:
   - Call `uploadMedia(profileId, file, 'image')`
   - Backend: Get presigned URL → Upload to S3 → Complete upload
   - Backend returns: `{ s3Url, mediaId, ... }`
4. **Update form state** → Store ONLY `result.s3Url` in `formData.avatar`
5. **User clicks Save**:
   - Build payload: `{ avatarUrl: formData.avatar }`
   - PATCH `/me/profile` with avatarUrl
   - Backend updates User.avatarUrl
6. **Refresh UI**:
   - Refetch profile: `await refreshUser()`
   - Apply cache-busting: `avatarUrl + "?v=" + updatedAt`
   - Display new avatar immediately

### Data Flow

```
File → uploadMedia() → S3 Upload → { s3Url } → formData.avatar
                                                      ↓
formData.avatar → mapFormToProfileUpdate() → { avatarUrl }
                                                      ↓
PATCH /me/profile → Backend saves → Response with updated profile
                                                      ↓
refreshUser() → Update context → getCacheBustedAvatarUrl() → Display
```

## Manual Test Steps

### Test 1: Basic Upload and Save
1. Navigate to Profile Edit page
2. Click "Upload Photo" button
3. Select an image file (JPEG/PNG, < 5MB)
4. Verify image preview appears in modal
5. Click "Done" to close modal
6. Click "Save Changes" button
7. Verify success toast appears
8. Refresh page (F5)
9. ✅ **PASS:** Avatar persists after refresh

### Test 2: Upload Twice in a Row
1. Navigate to Profile Edit page
2. Upload first avatar image
3. Save changes
4. Immediately upload a different avatar
5. Save changes again
6. Refresh page
7. ✅ **PASS:** Second avatar is displayed (not first)

### Test 3: Cross-Browser Persistence
1. Browser A: Upload and save avatar
2. Browser B: Navigate to profile (while logged in as same user)
3. ✅ **PASS:** New avatar visible in Browser B

### Test 4: No Blob URLs in Payload
1. Open DevTools → Network tab
2. Upload avatar
3. Click Save
4. Find PATCH `/me/profile` request
5. Inspect request payload
6. ✅ **PASS:** avatarUrl contains S3 URL (starts with `https://`), NOT `blob:` or `data:`

### Test 5: Cookies Sent with Requests
1. Open DevTools → Network tab → Disable cache
2. Upload avatar
3. Verify upload requests include cookies
4. Click Save
5. Verify PATCH request includes cookies
6. ✅ **PASS:** No 401 Unauthorized errors

## Implementation Checklist

### Phase 1: Fix Upload Handler ✅
- [x] Remove blob URL fallback from handleAvatarUpload
- [x] Enforce s3Url as canonical source
- [x] Add strict validation: throw error if no s3Url returned

### Phase 2: Fix AvatarUploader Integration ✅
- [x] Update AvatarUploader to call onUpload with File object
- [x] Update ProfileEdit to handle processed blob from AvatarUploader
- [x] Ensure progress callback is properly passed through

### Phase 3: Fix Profile Save & Refresh ✅
- [x] Verify avatarUrl field name in mapFormToProfileUpdate
- [x] Add cache-busting to avatar display
- [x] Ensure refreshUser() is called after save
- [x] Update form state from fresh backend data

### Phase 4: Add Error Handling ✅
- [x] Clear error messages for upload failures
- [x] Handle network errors gracefully
- [x] Provide retry options where appropriate

### Phase 5: Testing ✅
- [x] Manual test: Upload → Save → Refresh
- [x] Manual test: Upload twice in a row
- [x] Manual test: Cross-browser persistence
- [x] Manual test: No blob URLs in payload
- [x] Manual test: Cookies sent with all requests

## Technical Details

### Backend Contract
- **Upload endpoint**: POST `/profiles/:profileId/media/upload-url`
- **Complete endpoint**: POST `/profiles/:profileId/media/complete`
- **Response**: `{ s3Url, mediaId, uploadUrl, ... }`
- **Profile update**: PATCH `/me/profile` with `{ avatarUrl: string }`

### Expected Field Name
The backend expects `avatarUrl` in the PATCH payload (confirmed in `mapFormToProfileUpdate` line 91).

### Cache-Busting Strategy
Use `getCacheBustedAvatarUrl(avatarUrl, profile)` which appends `?v={updatedAt}` to force browser to refetch.

### Authentication
All requests use `withCredentials: true` (configured in `apiClient` at `src/services/api.js` line 75).

## Success Criteria

✅ Avatar upload uses only S3 URLs (no blob URLs)
✅ Avatar persists after save + page refresh
✅ Sequential uploads work correctly
✅ Second browser session sees updated avatar
✅ No 401 errors when cache disabled
✅ Clear error messages on failure
✅ Proper progress indication during upload

## Notes
- Banner and reel uploads use the same pattern and are NOT modified
- AvatarUploader component handles image processing (crop, resize, EXIF strip)
- MediaService handles the full upload flow (presigned URL → S3 → complete)
- Profile save is a single PATCH request with all updated fields
