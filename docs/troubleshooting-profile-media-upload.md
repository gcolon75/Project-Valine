# Profile Media Upload - Troubleshooting Guide

**Date**: 2024-12-24  
**Component**: Avatar/Banner Upload System  
**Purpose**: Diagnose and fix common profile media upload issues

---

## Quick Diagnosis

### Symptom: "TypeError: n is not a function"

**Error Location**: mediaService.js:246 (production build)  
**Root Cause**: Callback signature mismatch or onProgress not a function  
**Status**: ✅ **FIXED** in this PR

**What Was Wrong**:
```javascript
// Before (broken):
AvatarUploader called: onUpload(blob, "image/jpeg")  // string as 2nd arg
ProfileEdit expected: (file, onProgress) { ... }     // treated string as callback
mediaService called: onProgress(0)                   // called string(0) → TypeError!
```

**Fix Applied**:
```javascript
// After (working):
AvatarUploader calls: onUpload(blob, progressCallback)  // function as 2nd arg
mediaService guards: typeof onProgress === 'function'   // defensive check
```

**Verification**:
1. Build production: `npm run build`
2. Test upload flow
3. Check console - no TypeError

---

### Symptom: "PATCH /me/profile returns 500"

**Possible Causes**:

**Cause 1**: Backend receiving undefined/null for required fields
- **Fix**: Ensure frontend omits undefined fields (mapFormToProfileUpdate)
- **Status**: ✅ Fixed in PR #372

**Cause 2**: Backend attempting to set null for non-nullable fields
- **Fix**: Add null checks in backend handler
- **Status**: ✅ Fixed in PR #372

**Cause 3**: Schema drift - field in code but not in database
- **Fix**: Run migration, regenerate Prisma client
- **See**: docs/schema-validation-profile-media.md

**Debug Steps**:
```bash
# 1. Check Lambda logs
aws logs tail /aws/lambda/pv-api-dev-me --follow

# 2. Look for Prisma errors
# P2022 = Unknown field
# P2025 = Record not found
# P2003 = Foreign key constraint

# 3. Check actual PATCH payload
# Look for ProfileEdit console.log output:
# "[ProfileEdit] PATCH /me/profile payload: ..."
```

---

### Symptom: Upload fails but no clear error message

**Possible Causes**:

**Cause 1**: S3 presigned URL request fails
- **Symptoms**: Upload never starts, progress stays at 0%
- **Debug**: Check network tab for /media/upload-url request
- **Common Issues**:
  - 401/403: Not authenticated or no permission
  - 404: Profile not found
  - 500: Backend error generating presigned URL

**Cause 2**: S3 upload fails (CORS, network, etc.)
- **Symptoms**: Upload starts but fails mid-way
- **Debug**: Check network tab for PUT to S3 URL
- **Common Issues**:
  - CORS error: S3 bucket not configured for frontend origin
  - Network timeout: File too large or slow connection
  - 403 Forbidden: Presigned URL expired or invalid

**Cause 3**: Complete upload request fails
- **Symptoms**: Upload reaches 100% but then errors
- **Debug**: Check network tab for /media/complete request
- **Common Issues**:
  - Media record not found (wrong mediaId)
  - Permission denied
  - Backend processing failure

**Fix**:
1. Check each step in network tab
2. Look at response status and error message
3. Fix authentication if 401/403
4. Check S3 CORS if CORS error
5. Increase timeout if large file

---

### Symptom: Avatar/banner saved but not showing

**Possible Causes**:

**Cause 1**: Browser caching old image
- **Fix**: Cache-busting already implemented (imageUtils.js)
- **Verify**: Check if URL has `?v=timestamp` query param
- **Workaround**: Hard refresh (Ctrl+Shift+R)

**Cause 2**: Upload succeeded but URL not saved to database
- **Debug**:
  ```sql
  SELECT id, avatar FROM users WHERE id = 'user-id';
  SELECT id, bannerUrl FROM profiles WHERE userId = 'user-id';
  ```
- **Common Issues**:
  - URL was null/undefined when PATCH sent
  - Backend rejected null value
  - User updated different profile

**Cause 3**: Image uploaded to S3 but not accessible
- **Debug**: Copy image URL from database, visit in browser
- **Common Issues**:
  - S3 bucket not public (or presigned URL expired)
  - Image deleted from S3
  - Wrong S3 URL format

---

### Symptom: Cropper not appearing

**Possible Causes**:

**Cause 1**: ImageCropper not imported
- **Fix**: Check ProfileEdit.jsx imports ImageCropper
- **Status**: ✅ Fixed in this PR

**Cause 2**: State not set to show cropper
- **Debug**: Check showAvatarUploader / showBannerCropper state
- **Fix**: Ensure button onClick sets state to true

**Cause 3**: Modal z-index issue
- **Debug**: Check if modal is rendered but hidden
- **Fix**: ImageCropper has z-50, should be on top

---

### Symptom: Cropped image looks wrong

**Possible Causes**:

**Cause 1**: Aspect ratio calculation error
- **Debug**: Check ImageCropper aspectRatio prop
- **Expected**: 1 for avatar (square), 4 for banner (4:1)
- **Fix**: Verify prop value in ProfileEdit.jsx

**Cause 2**: Canvas crop coordinates off
- **Debug**: Check ImageCropper handleSave canvas logic
- **Common Issues**:
  - Scale factor calculation error
  - Position offset not accounted for
  - Container rect vs image rect mismatch

**Cause 3**: Image quality loss
- **Note**: Images converted to JPEG at 92% quality
- **Fix**: Increase quality in ImageCropper (canvas.toBlob quality param)

---

## Error Messages Reference

### Frontend Errors

**"File size must be less than 10MB"**
- **Cause**: Image file too large
- **Fix**: Compress image or choose smaller file
- **Limit**: 10MB for images, 500MB for videos

**"Invalid file type"**
- **Cause**: File is not JPEG, PNG, or WebP
- **Fix**: Convert image to supported format

**"Failed to get upload URL"**
- **Cause**: Backend API error getting presigned URL
- **Check**: Network tab, backend logs
- **Common**: 401 (not logged in), 404 (profile not found)

**"Upload failed with status XXX"**
- **Cause**: S3 upload request failed
- **Check**: Network tab for S3 PUT request
- **Common**: CORS error, timeout, 403 forbidden

**"Failed to complete upload"**
- **Cause**: Backend error marking upload complete
- **Check**: Network tab /media/complete request
- **Common**: Media record not found, permission denied

**"Please wait for uploads to complete before saving"**
- **Cause**: User clicked Save while upload in progress
- **Fix**: Wait for "Avatar uploaded successfully!" toast
- **Status**: ✅ Prevented in this PR (Save button disabled)

### Backend Errors

**"Profile ID is required"**
- **Cause**: profileId not passed to uploadMedia()
- **Fix**: Ensure targetProfileId is set in upload handler

**"Valid type is required (image, video, or pdf)"**
- **Cause**: Invalid media type parameter
- **Fix**: Pass 'image', 'video', or 'pdf' to uploadMedia()

**"You do not have permission to upload to this profile"**
- **Cause**: Trying to upload to someone else's profile
- **Fix**: Only upload to own profile (use 'me' or user.id)

**Prisma P2022: "Unknown field"**
- **Cause**: Schema drift - field in code but not in database
- **Fix**: Run migration, regenerate Prisma client

**Prisma P2025: "Record not found"**
- **Cause**: Trying to update non-existent record
- **Common**: Profile not created yet for user
- **Fix**: Ensure profile creation in onboarding

---

## Diagnostic Workflows

### Workflow 1: Avatar Upload Not Working

```
Step 1: Check if cropper opens
  → No: Check state, imports, button onClick
  → Yes: Go to Step 2

Step 2: Select file, check if preview shows
  → No: Check file format, browser console
  → Yes: Go to Step 3

Step 3: Click "Apply & Save", check upload progress
  → Stuck at 0%: Backend error getting URL (check logs)
  → Progresses then fails: S3 upload error (check network)
  → Reaches 100% then fails: Complete request error (check logs)
  → Success: Go to Step 4

Step 4: Check if avatar shows in form
  → No: Check formData.avatar state
  → Yes: Go to Step 5

Step 5: Click Save, check PATCH request
  → 500 error: Backend validation error (check logs)
  → 200 success: Go to Step 6

Step 6: Navigate to profile, check if avatar shows
  → No: Check cache-busting, database value
  → Yes: ✅ Working!
```

### Workflow 2: Banner Upload Not Working

Same as Workflow 1, but for banner:
- Check showBannerCropper state
- Verify aspect ratio = 4 (not 1)
- Check formData.banner and formData.bannerUrl
- Check profiles.bannerUrl in database

### Workflow 3: Production Build Issues

```
Step 1: Build for production
  $ npm run build

Step 2: Preview production build
  $ npm run preview

Step 3: Test upload flow in preview
  → TypeError: See "TypeError: n is not a function" section
  → Other error: Check browser console, source maps

Step 4: Check minified code
  $ grep -A 5 "onProgress" dist/assets/*.js
  → Should see typeof checks

Step 5: Verify in deployed environment
  → Test on actual production URL
  → Check CloudWatch logs
```

---

## Prevention Checklist

### Before Each Deploy

- [ ] Run linter: `npm run lint`
- [ ] Build production: `npm run build`
- [ ] Test in preview: `npm run preview`
- [ ] Test avatar upload with crop
- [ ] Test banner upload with crop
- [ ] Test both together
- [ ] Test upload failure scenario (network off)
- [ ] Check console for errors
- [ ] Verify PATCH payload in console
- [ ] Run backend tests if available
- [ ] Check CloudWatch logs for any errors

### After Each Deploy

- [ ] Clear browser cache
- [ ] Test avatar upload
- [ ] Test banner upload  
- [ ] Verify images show immediately (cache-busting works)
- [ ] Check image URLs have cache-buster param
- [ ] Test in multiple browsers
- [ ] Test with network throttling
- [ ] Monitor CloudWatch logs for 1 hour
- [ ] Check error rate in dashboard

---

## Monitoring Queries

### CloudWatch Insights

**Query 1: Upload Errors**
```
fields @timestamp, @message
| filter @message like /media upload/i 
  or @message like /uploadMedia/i
  or @message like /TypeError/
| sort @timestamp desc
| limit 100
```

**Query 2: PATCH /me/profile Errors**
```
fields @timestamp, @message, statusCode
| filter resource = "PATCH /me/profile"
| filter statusCode >= 400
| sort @timestamp desc
| limit 100
```

**Query 3: Avatar/Banner Null Issues**
```
fields @timestamp, @message
| filter @message like /avatarUrl/i or @message like /bannerUrl/i
| filter @message like /null/ or @message like /undefined/
| sort @timestamp desc
| limit 50
```

---

## Contact & Escalation

### Internal Resources
- **Schema docs**: docs/schema-validation-profile-media.md
- **PR archaeology**: docs/pr-archaeology-profile-media.md
- **Code**: src/components/ImageCropper.jsx, src/pages/ProfileEdit.jsx

### External References
- **Prisma errors**: https://www.prisma.io/docs/reference/api-reference/error-reference
- **S3 CORS**: https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html
- **AWS Lambda logs**: CloudWatch Logs console

---

**Last Updated**: 2024-12-24  
**Maintained By**: Development Team  
**Related PRs**: #372 (avatar/banner fix), current PR (complete fix)

---

_End of Troubleshooting Guide_
