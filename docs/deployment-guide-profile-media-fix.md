# Profile Media Upload Fix - Deployment Guide

**Date**: 2024-12-24  
**PR**: Profile Media Upload Flow Fix & Crop/Scale UX Restoration  
**Risk Level**: LOW  
**Estimated Time**: 15-20 minutes  

---

## Summary of Changes

### What's Fixed
✅ **Callback signature mismatch** causing "TypeError: n is not a function"  
✅ **Crop/scale UX restored** - users can now adjust images before upload  
✅ **Upload state management** - Save button disabled during uploads  
✅ **Defensive guards** - typeof checks prevent crashes  
✅ **Enhanced ImageCropper** - real canvas-based cropping with drag-to-position  

### Files Changed
**Frontend** (3 files):
- `src/services/mediaService.js` - Added defensive type guards
- `src/components/ImageCropper.jsx` - Complete rewrite with canvas cropping
- `src/pages/ProfileEdit.jsx` - Integrated ImageCropper, upload state tracking

**Documentation** (3 files):
- `docs/pr-archaeology-profile-media.md` - Root cause analysis
- `docs/schema-validation-profile-media.md` - Schema audit
- `docs/troubleshooting-profile-media-upload.md` - Troubleshooting guide

**Backend**: No changes (PR #372 already fixed null handling)

---

## Pre-Deployment Checklist

### Local Testing

- [ ] **Build succeeds**:
  ```powershell
  npm install
  ALLOW_API_BASE_DNS_FAILURE=true npm run build
  ```

- [ ] **Production preview works**:
  ```powershell
  npm run preview
  # Open http://localhost:4173
  ```

- [ ] **Avatar upload test**:
  - Click "Upload Photo"
  - ImageCropper modal opens
  - Select file → preview shows
  - Drag to reposition, zoom slider works
  - Click "Apply & Save" → processes image
  - Upload succeeds → avatar shows in form
  - Click "Save Changes" → PATCH succeeds
  - Navigate to /profile → avatar displays

- [ ] **Banner upload test**:
  - Click "Upload Banner"
  - ImageCropper modal opens (4:1 aspect ratio)
  - Same flow as avatar
  - Banner displays correctly

- [ ] **Both together test**:
  - Upload avatar → success
  - Upload banner → success
  - Save → both persist

- [ ] **Upload failure test**:
  - Disable network
  - Try upload → shows error
  - Re-enable network → can retry
  - Save button remains disabled during upload

- [ ] **Console check**:
  - No "TypeError: n is not a function"
  - No unhandled promise rejections
  - PATCH payload looks correct

### Code Review

- [ ] Review PR diff
- [ ] Check no secrets/tokens committed
- [ ] Verify defensive guards in place
- [ ] Confirm ImageCropper returns File blob
- [ ] Verify ProfileEdit uses ImageCropper
- [ ] Check upload state tracking complete

---

## Deployment Steps

### Step 1: Deploy Frontend

```powershell
# 1. Ensure clean working directory
git status

# 2. Pull latest from feature branch
git checkout copilot/fix-profile-media-upload-flow
git pull origin copilot/fix-profile-media-upload-flow

# 3. Install dependencies (if needed)
npm install

# 4. Build for production
ALLOW_API_BASE_DNS_FAILURE=true npm run build

# 5. Verify dist/ directory created
ls -la dist/

# 6. Deploy to hosting (adjust for your setup)
# For S3/CloudFront:
aws s3 sync dist/ s3://your-frontend-bucket/ --delete

# For Vercel:
# vercel --prod

# For Netlify:
# netlify deploy --prod

# 7. Invalidate CDN cache
# For CloudFront:
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/index.html" "/assets/*" "/profile*"
```

**Expected Outcome**:
- Build completes without errors
- dist/ folder contains minified JS/CSS
- Deployment succeeds
- CDN invalidation completes

### Step 2: Verify Deployment

```powershell
# 1. Check deployed version
Invoke-RestMethod -Uri "https://your-domain.com/" -Method Get
# Should see new asset hash

# 2. Test in browser
# Open https://your-domain.com/profile/edit
# (Make sure to hard refresh: Ctrl+Shift+R)

# 3. Check console - should be clean
# Open DevTools → Console
# No errors should appear on page load

# 4. Test upload flow
# Follow "Avatar upload test" from Pre-Deployment Checklist
```

**Expected Outcome**:
- New assets loaded (check hash in URL)
- No console errors
- Upload flow works end-to-end

### Step 3: Monitor

```powershell
# 1. Watch CloudWatch logs (if using AWS Lambda backend)
aws logs tail /aws/lambda/pv-api-prod-me --follow

# 2. Monitor error rate
# Check CloudWatch dashboard for:
# - 5xx errors (should remain low)
# - Upload requests (should succeed)
# - PATCH /me/profile (should return 200)

# 3. Check S3 upload metrics
# CloudWatch → S3 → Bucket metrics
# - PUT requests (should increase)
# - 4xx errors (should be 0)
```

**Monitor For**: 1-2 hours after deployment

**Alert Thresholds**:
- 5xx error rate > 1% → investigate immediately
- Upload failure rate > 5% → check S3/backend
- Client-side errors spiking → check browser console

---

## Post-Deployment Testing

### Manual Test Plan (5 minutes)

**Test A: Avatar Only**
1. Log in as test user
2. Go to /profile/edit
3. Click "Upload Photo"
4. Select avatar image
5. Drag to reposition, zoom in
6. Click "Apply & Save"
7. Verify upload progress shown
8. Wait for "Avatar uploaded successfully!"
9. Verify avatar shows in form
10. Click "Save Changes"
11. Wait for redirect to /profile
12. Verify avatar displays correctly
13. Verify banner unchanged (if had one)

**Result**: ✅ PASS / ❌ FAIL (describe issue)

**Test B: Banner Only**
1. Click "Upload Banner"
2. Select banner image (landscape preferred)
3. Drag to reposition, zoom to fit
4. Click "Apply & Save"
5. Wait for "Banner uploaded successfully!"
6. Click "Save Changes"
7. Verify banner displays on profile
8. Verify avatar unchanged

**Result**: ✅ PASS / ❌ FAIL (describe issue)

**Test C: Both Together**
1. Upload new avatar → success
2. Upload new banner → success
3. Save → both persist
4. Refresh page → both display

**Result**: ✅ PASS / ❌ FAIL (describe issue)

**Test D: Error Handling**
1. Disable network
2. Try upload → see error toast
3. Re-enable network
4. Retry → succeeds
5. Verify no console errors

**Result**: ✅ PASS / ❌ FAIL (describe issue)

### Automated Checks (Optional)

```javascript
// Playwright/Cypress test
describe('Profile Media Upload', () => {
  it('uploads avatar with cropper', async () => {
    await page.goto('/profile/edit');
    await page.click('button:has-text("Upload Photo")');
    
    // Wait for cropper modal
    await page.waitForSelector('text=Crop Avatar');
    
    // Upload file
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-avatar.jpg');
    
    // Wait for preview
    await page.waitForSelector('img[alt="Preview"]');
    
    // Adjust zoom
    await page.locator('input[type="range"]').fill('1.5');
    
    // Apply
    await page.click('button:has-text("Apply & Save")');
    
    // Wait for success
    await page.waitForSelector('text=Avatar uploaded successfully');
    
    // Save profile
    await page.click('button:has-text("Save Changes")');
    
    // Verify redirect
    await page.waitForURL('/profile');
    
    // Verify avatar displays
    const avatar = await page.locator('img[alt*="avatar"]');
    expect(await avatar.isVisible()).toBe(true);
  });
});
```

---

## Rollback Plan

### If Issues Detected

**Scenario 1: Upload completely broken**
```powershell
# 1. Revert to previous deployment
git revert HEAD~5..HEAD  # Revert last 5 commits
npm run build
# Deploy reverted build

# 2. Or: redeploy previous version
aws s3 sync s3://backup-bucket/previous-version/ s3://frontend-bucket/ --delete

# 3. Invalidate CDN
aws cloudfront create-invalidation --distribution-id ID --paths "/*"
```

**Scenario 2: Cropper not working but old flow needed**
```powershell
# Quick fix: Temporarily hide cropper button
# Add to ProfileEdit.jsx:
const DISABLE_CROPPER = true;
if (DISABLE_CROPPER) {
  // Use old MediaUploader for banner
  // Disable avatar upload button
}

# Redeploy with fix
npm run build && deploy
```

**Scenario 3: Backend errors after frontend deploy**
```powershell
# Check if backend needs update
# If backend out of sync with frontend expectations:

# 1. Check which fields frontend sends
Select-String "PATCH /me/profile payload" cloudwatch-logs

# 2. Update backend to handle new fields
# (Should not be needed - backend already flexible)

# 3. If critical: rollback frontend to match backend
```

### Rollback Verification

After rollback:
- [ ] Upload flow works (even if not cropper)
- [ ] No console errors
- [ ] PATCH /me/profile returns 200
- [ ] Avatar/banner save and display

---

## Success Criteria

Deployment is successful when:

✅ **Functional**:
- Avatar upload works with cropper
- Banner upload works with cropper
- Both can be uploaded together
- Uploads show progress
- Failures show clear errors
- Save button disabled during upload
- No TypeError in console

✅ **Performance**:
- Page load time < 3s
- Upload complete < 10s (for typical image)
- No memory leaks (cropper cleans up)

✅ **Monitoring**:
- 5xx error rate < 0.1%
- Upload success rate > 95%
- No client-side error spikes

✅ **User Experience**:
- Intuitive cropper UI
- Drag-to-reposition smooth
- Zoom slider responsive
- Clear progress indication
- Helpful error messages

---

## Common Deployment Issues

### Issue: Build fails with "MODULE_NOT_FOUND"
**Cause**: Missing dependency  
**Fix**: `npm install` and rebuild

### Issue: Cache not invalidated
**Cause**: Old assets still served by CDN  
**Fix**: 
```powershell
# Clear browser cache (Ctrl+Shift+Delete)
# Force CDN invalidation
aws cloudfront create-invalidation --distribution-id ID --paths "/*"
```

### Issue: Environment variables not set
**Cause**: .env file missing in build environment  
**Fix**: Set environment variables in CI/CD or hosting platform

### Issue: CORS errors after deploy
**Cause**: S3 bucket CORS not configured  
**Fix**: Update S3 bucket CORS policy to allow frontend origin

---

## Communication Template

### Pre-Deployment Announcement

**Subject**: Scheduled Deployment - Profile Media Upload Fix

**Body**:
```
Hi team,

We'll be deploying a fix for the profile media upload flow today at [TIME].

What's changing:
- Fixed "TypeError" error during avatar/banner upload
- Restored crop/scale UI for better image control
- Improved error handling and user feedback

Expected downtime: None (rolling deployment)
Testing window: [TIME] to [TIME]

Please report any issues to #engineering-alerts

Thanks!
```

### Post-Deployment Announcement

**Subject**: Deployed - Profile Media Upload Fix

**Body**:
```
Hi team,

The profile media upload fix has been deployed successfully.

Changes live:
- New crop/scale UI for avatar and banner uploads
- Better error messages and progress tracking
- No more TypeError crashes

Verification:
- All automated tests: ✅ PASS
- Manual testing: ✅ PASS
- Monitoring: ✅ Normal

Please clear your browser cache (Ctrl+Shift+R) to see the new UI.

Report any issues to #engineering-alerts

Thanks!
```

---

## Appendix: Quick Commands

### Build & Deploy
```powershell
npm run build && npm run deploy
```

### Test Locally
```powershell
npm run preview
```

### Check Logs
```powershell
aws logs tail /aws/lambda/pv-api-prod-me --follow
```

### Invalidate Cache
```powershell
aws cloudfront create-invalidation --distribution-id XXX --paths "/*"
```

### Rollback
```powershell
git revert HEAD~5..HEAD && npm run build && npm run deploy
```

---

**Status**: ✅ Ready for deployment  
**Approved By**: [Name, Date]  
**Deployed By**: [Name, Date]  
**Verified By**: [Name, Date]

---

_End of Deployment Guide_
