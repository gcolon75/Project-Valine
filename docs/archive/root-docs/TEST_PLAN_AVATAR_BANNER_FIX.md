> **ARCHIVED:** 2026-01-05
> **Reason:** Consolidated into canonical documentation
> **See:** [Documentation Index](./README.md) for current docs

---
# Avatar/Banner Upload Fix - Test Plan

## Overview
This test plan covers the fixes for avatar/banner upload issues, including credential handling, caching, and upload flow improvements.

## Pre-Testing Setup
1. Ensure backend is deployed with latest changes
2. Clear browser cache completely
3. Test in Chrome with DevTools Network tab open
4. Have Chrome "Disable cache" checkbox ready to toggle

## Test Cases

### Test 1: Avatar Upload and Persistence
**Objective**: Verify avatar uploads to S3 and persists after save

**Steps**:
1. Navigate to `/profile-edit`
2. Click "Upload Photo" button for avatar
3. Select an image file (JPEG, PNG, or WebP, < 5MB)
4. Wait for upload to complete (should show "Avatar uploaded successfully!")
5. Verify preview shows the new avatar
6. Click "Save Changes"
7. Wait for "Profile saved!" message
8. Navigate to `/profile` page

**Expected Results**:
- Avatar upload shows progress indicator
- Upload completes and returns S3 URL (not data URL)
- Avatar preview updates immediately
- After save, profile page shows new avatar
- Network tab shows PATCH `/me/profile` with avatarUrl field containing S3 URL
- Avatar URL includes cache-busting parameter `?v=<timestamp>`

**Pass/Fail**: ___

### Test 2: Banner Upload and Persistence
**Objective**: Verify banner uploads to S3 and persists after save

**Steps**:
1. Navigate to `/profile-edit`
2. Click to upload banner image
3. Select an image file (< 10MB)
4. Wait for upload to complete
5. Verify preview shows the new banner
6. Click "Save Changes"
7. Navigate to `/profile` page

**Expected Results**:
- Banner upload shows progress indicator
- Upload completes and returns S3 URL
- Banner preview updates immediately
- After save, profile page shows new banner
- Network tab shows PATCH `/me/profile` with bannerUrl field
- Banner URL includes cache-busting parameter `?v=<timestamp>`

**Pass/Fail**: ___

### Test 3: No 401 Errors with Cache Disabled
**Objective**: Verify credentials are sent even when browser cache is disabled

**Steps**:
1. Open Chrome DevTools → Network tab
2. Enable "Disable cache" checkbox
3. Ensure you're logged in
4. Navigate to `/profile-edit`
5. Make a small change (e.g., edit bio)
6. Click "Save Changes"
7. Check Network tab for all requests

**Expected Results**:
- PATCH `/me/profile` returns 200 OK (not 401)
- GET `/me/profile` after save returns 200 OK (not 401)
- All requests include credentials (check Request Headers for Cookie)
- No "Unauthorized" errors in UI

**Pass/Fail**: ___

### Test 4: Cache-Busting Works for Images
**Objective**: Verify images don't show stale cached versions

**Steps**:
1. Upload and save an avatar
2. Note the avatar URL (should include `?v=<timestamp1>`)
3. Wait 2 seconds
4. Upload and save a different avatar
5. Note the new avatar URL (should include `?v=<timestamp2>`)
6. Verify timestamp2 > timestamp1
7. Check that new avatar is displayed (not cached old one)

**Expected Results**:
- Each avatar/banner URL includes unique version parameter
- Version parameter updates after each save
- Browser fetches new image (Network tab shows 200, not "from cache")
- No stale images displayed

**Pass/Fail**: ___

### Test 5: No Cache Headers on Profile Endpoints
**Objective**: Verify profile data is not cached by browser

**Steps**:
1. Navigate to `/profile`
2. Open DevTools → Network tab
3. Find GET `/me/profile` request
4. Check Response Headers

**Expected Results**:
- Response includes `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`
- Response includes `Pragma: no-cache`
- Response includes `Expires: 0`
- Subsequent requests to `/me/profile` are not served from cache

**Pass/Fail**: ___

### Test 6: Single Refresh After Save
**Objective**: Verify profile is only fetched once after save (no race conditions)

**Steps**:
1. Navigate to `/profile-edit`
2. Make a change and click "Save Changes"
3. Monitor Network tab

**Expected Results**:
- PATCH `/me/profile` → 200 OK
- Exactly ONE GET `/me/profile` after PATCH
- No duplicate or racing GET requests
- Profile page loads with updated data

**Pass/Fail**: ___

### Test 7: Upload Complete Before Save
**Objective**: Verify uploads finish before PATCH is sent

**Steps**:
1. Navigate to `/profile-edit`
2. Upload avatar (use larger file to see timing)
3. Immediately try to click "Save Changes"
4. Observe behavior

**Expected Results**:
- "Save Changes" button should be enabled immediately after upload completes
- PATCH request includes the uploaded avatar URL (not data URL or temp URL)
- No errors about missing or incomplete uploads

**Pass/Fail**: ___

### Test 8: Data URL Not Sent to Backend
**Objective**: Verify avatar is uploaded as URL, not base64 data

**Steps**:
1. Navigate to `/profile-edit`
2. Upload an avatar
3. Click "Save Changes"
4. In Network tab, find PATCH `/me/profile`
5. Click on it → Payload tab
6. Check the `avatarUrl` field

**Expected Results**:
- `avatarUrl` is a short S3 URL (e.g., `https://...amazonaws.com/...`)
- `avatarUrl` is NOT a long data URL starting with `data:image/jpeg;base64,...`
- Payload size is small (< 10KB typically)

**Pass/Fail**: ___

## Browser Testing Matrix

Test all scenarios in multiple browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (if available)
- [ ] Edge (if available)

## Edge Cases to Test

1. **Large files**: Upload 4.9MB avatar, verify it works
2. **Network interruption**: Start upload, disconnect network, verify error handling
3. **Multiple rapid saves**: Save profile twice quickly, verify no race conditions
4. **Invalid file types**: Try uploading PDF/GIF, verify rejection
5. **Session expiry**: Let session expire, try to save, verify proper auth error

## Success Criteria

All test cases must pass for the fix to be considered complete:
- ✅ Avatar/banner uploads persist correctly
- ✅ No 401 errors with cache disabled
- ✅ No stale cached images
- ✅ No stale cached profile data
- ✅ Single refresh after save
- ✅ Uploads complete before save
- ✅ S3 URLs (not data URLs) sent to backend

## Troubleshooting

If tests fail:
1. Check browser console for errors
2. Check Network tab for failed requests
3. Verify backend is deployed with latest code
4. Check cookies are being set and sent
5. Verify CORS configuration allows credentials
6. Check API Gateway and Lambda logs

## Notes

- Remember to test with actual CloudFront/production URLs
- Test with both HTTP and HTTPS
- Verify cookie domain settings match environment
- Check that cookies have Secure flag in production
