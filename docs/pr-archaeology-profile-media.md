# PR Archaeology: Profile Media Upload Flow

**Date**: 2024-12-24  
**Investigator**: GitHub Copilot Agent  
**Purpose**: Document the evolution of avatar/banner upload UI and identify why previous fixes failed

---

## Executive Summary

### Current State (As of Dec 2024)
- **ProfileEdit** uses `AvatarUploader` component (dropbox-style upload)
- **Onboarding** uses `ImageCropper` component (select → preview → save)
- **Problem**: AvatarUploader doesn't provide crop/scale/position UX
- **Error**: "TypeError: n is not a function" at mediaService.js:246 in production builds

### Historical Timeline

#### Era 1: ImageCropper (Original Design)
**Component**: `src/components/ImageCropper.jsx`
**Usage**: Onboarding flow
**Characteristics**:
- User selects file
- Shows preview with zoom slider (0.5x - 2x)
- Provides rotation button (90° increments)
- Returns **data URL** directly (base64 encoded)
- **Issue**: No actual canvas-based cropping - just CSS transforms for preview
- **Issue**: Returns data URLs, not uploaded S3 URLs

**Code Evidence**:
```javascript
// ImageCropper.jsx line 28-33
const handleSave = () => {
  if (!image) return;
  // In a real implementation, this would crop the image using canvas
  // For now, we'll just pass back the original image
  onSave(image);  // ❌ Returns data URL, not S3 URL
};
```

#### Era 2: AvatarUploader (Current Implementation)
**Component**: `src/components/AvatarUploader.jsx`
**Usage**: ProfileEdit for avatar upload
**Characteristics**:
- Drag-and-drop or click to upload
- Client-side image processing (resize to 800x800, center crop)
- Strips EXIF metadata for privacy
- Creates processed blob
- Calls upload handler with blob
- **Issue**: No crop/scale/position UI - automatic center crop only
- **Issue**: Callback signature mismatch in production builds

**Code Evidence**:
```javascript
// AvatarUploader.jsx line 145-148
// Call onUpload with processed blob
if (onUpload) {
  await onUpload(processedBlob, file.type);  // ⚠️ Passes blob + type
}
```

```javascript
// ProfileEdit.jsx line 370-384
const handleAvatarUpload = async (file, onProgress) => {
  // ...
  const result = await uploadMedia(targetProfileId, file, 'image', {
    title: 'Profile Avatar',
    description: 'Profile picture',
    privacy: 'public',
    onProgress,  // ⚠️ onProgress callback passed but may be minified as 'n'
  });
};
```

---

## Previous Fix Attempts - Why They Failed

### PR #372: Avatar/Banner Together Fix
**Date**: ~Dec 2024  
**Branch**: `copilot/fix-edit-profile-avatar-banner`  
**Files Changed**:
- `serverless/src/handlers/profiles.js` (2 lines)
- `src/pages/ProfileEdit.jsx` (13 lines)

**What It Fixed**:
✅ Prevented avatar/banner from overwriting each other with null  
✅ Backend now rejects `null` values (only accepts `undefined` or valid URLs)  
✅ Frontend omits fields from payload when not changed

**What It Didn't Fix**:
❌ Still uses AvatarUploader (no crop/scale UX)  
❌ "TypeError: n is not a function" runtime error  
❌ No canvas-based cropping implementation

**Root Cause Missed**:
- Focused on null/undefined payload issues
- Didn't address UX regression (removed cropper)
- Didn't fix minification/callback issues in mediaService.js

**Evidence**:
```javascript
// FINAL_IMPLEMENTATION_SUMMARY.md lines 73-102
// Backend Fix (2 lines)
- if (avatarUrl !== undefined) {userUpdateData.avatar = avatarUrl;}
+ if (avatarUrl !== undefined && avatarUrl !== null) {userUpdateData.avatar = avatarUrl;}
```

### Earlier Attempt: Cache-Busting & Credential Fix
**Doc**: `IMPLEMENTATION_SUMMARY_AVATAR_BANNER_FIX.md`  
**What It Fixed**:
✅ 401 errors with Chrome "Disable cache"  
✅ Stale image caching (added cache-busting params)  
✅ Avatar upload flow (S3 URLs instead of data URLs)  
✅ Field name mapping (avatar → avatarUrl)

**What It Didn't Fix**:
❌ Still replaced ImageCropper with AvatarUploader  
❌ No crop/scale/position UI restored  
❌ Production build minification issues

**Root Cause Missed**:
- Fixed the upload pipeline (S3 integration)
- Fixed field mapping and caching
- But replaced the cropper UI with auto-crop dropbox uploader
- Didn't test production builds thoroughly

**Evidence**:
```javascript
// IMPLEMENTATION_SUMMARY_AVATAR_BANNER_FIX.md lines 93-127
// Before:
// - Used `ImageCropper` which returned data URL
// - `handleAvatarUpload(imageUrl)` immediately set form state
//
// After:
// - Use `AvatarUploader` which provides blob
// - `handleAvatarUpload(file, onProgress)` uploads to S3 first
```

---

## Root Causes Identified

### 1. UX Regression: Removed Cropper
**When**: During S3 upload integration (likely same PR as cache-busting fix)  
**Why**: ImageCropper only returned data URLs, not compatible with S3 upload flow  
**Impact**: Users lost ability to crop/scale/position their images

**Pattern**:
```
Old Flow (Onboarding):
  Select File → ImageCropper (zoom/rotate) → Save → Data URL stored

New Flow (ProfileEdit):
  Select File → AvatarUploader (auto-crop) → Upload to S3 → S3 URL stored
```

**Missing Step**: Integrate cropper UI with S3 upload pipeline

### 2. Production Build Minification Error
**Error**: `TypeError: n is not a function at mediaService.js:246`  
**Stack**: mediaService.js:246 → ProfileEdit.jsx:379 → AvatarUploader.jsx:147/174

**Root Cause Analysis**:
```javascript
// mediaService.js line 246 (source)
if (onProgress) onProgress(0);

// After minification (hypothesized):
if (n) n(0);  // 'n' becomes the parameter name for onProgress
```

**Why It Fails**:
1. Callback passed from AvatarUploader → ProfileEdit → uploadMedia
2. Callback signature: `(file, onProgress)` vs `(progress)`
3. Minifier renames `onProgress` to `n`
4. When `onProgress` is `undefined` or wrong type, guard fails
5. Or: `file.type` is passed as second arg but treated as callback

**Evidence from code**:
```javascript
// AvatarUploader.jsx line 147
await onUpload(processedBlob, file.type);  // ⚠️ Second arg is string

// ProfileEdit.jsx line 370
const handleAvatarUpload = async (file, onProgress) => {
  // 'file' is actually processedBlob from AvatarUploader
  // 'onProgress' is actually file.type (string!)
  
  const result = await uploadMedia(targetProfileId, file, 'image', {
    onProgress,  // ❌ Passing a string as callback!
  });
};
```

**SMOKING GUN**: Callback signature mismatch!
- AvatarUploader calls `onUpload(blob, fileType)` with 2 args
- But ProfileEdit expects `handleAvatarUpload(file, onProgress)` 
- The `fileType` string gets passed as `onProgress` callback
- When mediaService.js tries to call `onProgress(0)`, it's calling a string!

### 3. ImageCropper Incomplete Implementation
**Issue**: ImageCropper has UI for zoom/rotate but doesn't actually crop

**Evidence**:
```javascript
// ImageCropper.jsx line 28-33
const handleSave = () => {
  if (!image) return;
  
  // In a real implementation, this would crop the image using canvas
  // For now, we'll just pass back the original image
  onSave(image);
};
```

**Impact**: Can't just "restore" ImageCropper - it needs to be completed first

---

## Code Patterns That Caused Regressions

### Pattern 1: Callback Signature Mismatch
```javascript
// ❌ Bad: Mismatched signatures
Component.onUpload(blob, metadata);
Handler(file, callback) { ... }

// ✅ Good: Consistent signatures
Component.onUpload({ blob, metadata });
Handler({ blob, metadata }) { ... }
```

### Pattern 2: Undefined Payload Fields
```javascript
// ❌ Bad: Always send all fields
const payload = {
  avatarUrl: formData.avatar,  // Could be null
  bannerUrl: formData.banner   // Could be null
};

// ✅ Good: Only send present fields
const payload = { ...otherFields };
if (formData.avatar) payload.avatarUrl = formData.avatar;
if (formData.banner) payload.bannerUrl = formData.banner;
```

### Pattern 3: Data URLs vs S3 URLs
```javascript
// ❌ Bad: Return data URL directly
const handleSave = () => {
  onSave(imageDataUrl);  // base64 string
};

// ✅ Good: Upload to S3 first, return URL
const handleSave = async () => {
  const result = await uploadToS3(processedBlob);
  onSave(result.url);  // S3 URL string
};
```

### Pattern 4: Missing Canvas Cropping
```javascript
// ❌ Bad: CSS transform only (not persisted)
<img style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }} />

// ✅ Good: Canvas-based crop (creates new blob)
canvas.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, targetW, targetH);
canvas.toBlob((blob) => { /* upload this */ });
```

---

## Recommended Fix Strategy

### Phase 1: Fix Callback Signature Mismatch
**Priority**: CRITICAL (blocks all uploads)

1. Change AvatarUploader callback to match expected signature:
```javascript
// AvatarUploader.jsx
if (onUpload) {
  await onUpload(processedBlob);  // Remove file.type param
}
```

2. Or: Change ProfileEdit to handle metadata separately:
```javascript
// ProfileEdit.jsx
const handleAvatarUpload = async (file, metadata) => {
  const result = await uploadMedia(targetProfileId, file, 'image', {
    title: 'Profile Avatar',
    description: 'Profile picture',
    privacy: 'public',
    onProgress: (p) => console.log(`Upload progress: ${p}%`),
  });
};
```

### Phase 2: Implement Canvas-Based Cropping
**Priority**: HIGH (restores expected UX)

1. Enhance ImageCropper with real canvas cropping:
   - Add draggable crop box (like react-easy-crop)
   - Implement canvas.drawImage with crop coordinates
   - Return blob instead of data URL

2. Add crop/scale state to ProfileEdit:
   - Show cropper modal when user selects file
   - User adjusts crop/zoom/position
   - "Apply" generates blob
   - Then upload blob to S3

3. Create BannerCropper variant:
   - Wide aspect ratio (e.g. 4:1)
   - Same crop/zoom/position UI
   - Different target dimensions

### Phase 3: Add Defensive Guards
**Priority**: MEDIUM (prevents future issues)

1. Validate callbacks before invoking:
```javascript
if (typeof onProgress === 'function') {
  onProgress(value);
}
```

2. Validate file/blob inputs:
```javascript
if (!(file instanceof Blob) && !(file instanceof File)) {
  throw new Error('Invalid file input');
}
```

3. Add minification test:
   - Build production bundle
   - Test upload flow in preview mode
   - Verify callbacks work when minified

---

## Files Requiring Changes

### Frontend (High Priority)
1. `src/components/ImageCropper.jsx` - Add canvas cropping logic
2. `src/components/AvatarUploader.jsx` - Fix callback signature OR deprecate
3. `src/pages/ProfileEdit.jsx` - Integrate cropper UI, fix callback handling
4. `src/services/mediaService.js` - Add defensive callback guards

### Backend (Medium Priority)
5. `serverless/src/handlers/profiles.js` - Already fixed in PR #372

### Documentation
6. `docs/pr-archaeology-profile-media.md` - This file
7. `docs/runbooks/profile-media-upload-pipeline.md` - New file
8. `docs/troubleshooting/media-upload-errors.md` - New file

---

## Test Plan

### Manual Tests (Required Before Deploy)

**A. Avatar Only (with crop/scale):**
1. ProfileEdit → Choose avatar file
2. Cropper modal appears
3. Adjust zoom/position
4. Click Apply → blob generated
5. Click Save → uploads to S3, PATCH succeeds
6. Result: avatar updates, banner unchanged, no console errors

**B. Banner Only (with crop/scale):**
1. Same as above for banner
2. Result: banner updates, avatar unchanged

**C. Both Together:**
1. Crop/upload avatar
2. Crop/upload banner
3. Save both
4. Result: both persist correctly

**D. Upload Failure:**
1. Disable network
2. Try to upload
3. Result: Clear error shown, no PATCH with undefined values

**E. Production Build:**
1. `npm run build`
2. `npm run preview`
3. Test A/B/C above
4. Result: No "TypeError: n is not a function"

---

## Lessons Learned

### What Went Wrong
1. ❌ Replaced cropper with auto-crop without stakeholder review
2. ❌ Didn't complete ImageCropper canvas implementation
3. ❌ Callback signature mismatch not caught in dev mode
4. ❌ Production build not tested thoroughly
5. ❌ Minification issues not considered

### What Should Have Been Done
1. ✅ Keep cropper UI, integrate with S3 upload
2. ✅ Complete canvas-based cropping before deploying
3. ✅ Use consistent callback signatures
4. ✅ Add type checking for callbacks
5. ✅ Test production builds before merging

### Preventive Measures
1. ✅ Always test production builds
2. ✅ Document callback signatures in JSDoc
3. ✅ Add runtime type validation for callbacks
4. ✅ E2E tests that exercise upload flow
5. ✅ Stakeholder review for UX changes

---

## References

- **FINAL_IMPLEMENTATION_SUMMARY.md** - PR #372 details
- **IMPLEMENTATION_SUMMARY_AVATAR_BANNER_FIX.md** - Earlier fix attempt
- **ImageCropper.jsx** - Original cropper component (incomplete)
- **AvatarUploader.jsx** - Current dropbox-style uploader
- **ProfileEdit.jsx** - Profile edit page with upload handlers
- **mediaService.js** - S3 upload pipeline

---

**Status**: ✅ COMPLETE - Analysis done, fix strategy ready  
**Next Step**: Implement Phase 1 (Fix callback signature)  
**Risk**: LOW - Minimal code changes, well-understood root cause  
**Timeline**: 2-4 hours for full implementation + testing

---

_End of PR Archaeology Report_
