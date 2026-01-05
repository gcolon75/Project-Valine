> **ARCHIVED:** 2026-01-05
> **Reason:** Consolidated into canonical documentation
> **See:** [Documentation Index](./README.md) for current docs

---
# Manual Test Plan: PR #366 Frontend Fixes

## Overview
This document provides step-by-step instructions to manually test the fixes for avatar upload and cache issues in PR #366.

## Prerequisites
- Local development environment running
- User account with authentication
- Browser DevTools open (Network and Console tabs)

## Test 1: Avatar Upload Modal Cleanup

### Goal
Verify that only AvatarUploader modal appears (no ImageCropper) and works correctly.

### Steps
1. Navigate to `/profile/edit`
2. Scroll to "Profile Images" section
3. Click the "Upload Photo" button (or "Change Photo" if avatar exists)

### Expected Results
- ✅ AvatarUploader modal appears (white modal with drag-and-drop area)
- ✅ No ImageCropper component renders
- ✅ Modal shows "Upload Profile Picture" title
- ✅ Can drag-and-drop or click to select image
- ✅ Modal closes when clicking X or "Cancel"

### Failure Indicators
- ❌ Two modals appear simultaneously
- ❌ Old ImageCropper component shows
- ❌ Modal title is duplicated
- ❌ Modal doesn't close properly

---

## Test 2: Avatar Upload and Save Workflow

### Goal
Verify that uploaded avatar URL is correctly saved with the right field name.

### Steps
1. Open Browser DevTools → Console tab
2. Navigate to `/profile/edit`
3. Click "Upload Photo"
4. Select a valid image file (JPEG, PNG, or WebP, < 5MB)
5. Wait for upload to complete
6. Click "Save Changes"
7. Check console for log message

### Expected Results
- ✅ Image uploads successfully
- ✅ Toast notification: "Avatar uploaded successfully!"
- ✅ Preview shows uploaded image
- ✅ Console log shows:
  ```
  [ProfileEdit] PATCH /me/profile payload: {
    avatarUrl: "https://...",  // Should be a full URL, not null
    bannerUrl: "...",
    displayName: "...",
    username: "...",
    title: "...",
    allFields: [...]
  }
  ```
- ✅ `avatarUrl` field is present and contains uploaded URL
- ✅ Toast notification: "Profile saved!"

### Failure Indicators
- ❌ Upload fails with 401 error (auth issue)
- ❌ Console log shows `avatarUrl: null` after upload
- ❌ Console log shows wrong field name (e.g., `avatar` instead of `avatarUrl`)
- ❌ Save fails with validation error

---

## Test 3: Backend PATCH Request Verification

### Goal
Verify the PATCH request payload contains correct field names.

### Steps
1. Open Browser DevTools → Network tab
2. Filter for "Fetch/XHR" requests
3. Navigate to `/profile/edit`
4. Upload a new avatar
5. Click "Save Changes"
6. Find the PATCH request to `/me/profile`
7. Click on the request → "Payload" or "Request" tab

### Expected Results
- ✅ Request URL: `PATCH /me/profile`
- ✅ Request payload contains:
  ```json
  {
    "avatarUrl": "https://...",
    "displayName": "...",
    "username": "...",
    ...
  }
  ```
- ✅ Field name is `avatarUrl` (not `avatar`)
- ✅ Response status: 200 OK

### Failure Indicators
- ❌ Field name is `avatar` instead of `avatarUrl`
- ❌ `avatarUrl` is missing from payload
- ❌ Response status: 400 Bad Request (validation error)

---

## Test 4: No-Cache Headers Verification

### Goal
Verify that profile data is not cached and fresh data is fetched after save.

### Steps
1. Open Browser DevTools → Network tab
2. Navigate to `/profile/edit`
3. Upload a new avatar
4. Click "Save Changes"
5. Find the GET request to `/me/profile` (triggered by `refreshUser()`)
6. Click on the request → "Headers" tab
7. Check Response Headers

### Expected Results
- ✅ GET request to `/me/profile` appears after save
- ✅ Response headers include:
  ```
  Cache-Control: no-store, no-cache, must-revalidate, max-age=0
  Pragma: no-cache
  Expires: 0
  ```
- ✅ Response body contains updated `avatarUrl`
- ✅ `updatedAt` timestamp is recent (within last few seconds)

### Failure Indicators
- ❌ Response cached (304 Not Modified)
- ❌ Cache-Control header allows caching
- ❌ Response body shows old avatar URL
- ❌ `updatedAt` timestamp is stale

---

## Test 5: Immediate Avatar Display After Save

### Goal
Verify that the new avatar appears immediately without page refresh.

### Steps
1. Navigate to `/profile/edit`
2. Note the current avatar (if any)
3. Upload a new avatar
4. Click "Save Changes"
5. Wait for success toast
6. Click browser back button or navigate to `/profile`
7. Check the avatar in the profile view

### Expected Results
- ✅ After save, redirected to `/profile` (or back to previous page)
- ✅ New avatar appears immediately
- ✅ No need to manually refresh page (Ctrl+R)
- ✅ Image URL includes cache-busting param: `?v=<timestamp>`

### Failure Indicators
- ❌ Old avatar still shows after save
- ❌ Need to manually refresh page to see new avatar
- ❌ Image URL has no cache-busting param
- ❌ Browser shows cached image

---

## Test 6: Cache-Busting URL Format

### Goal
Verify that avatar images use cache-busted URLs when displayed.

### Steps
1. Navigate to `/profile` (not `/profile/edit`)
2. Open Browser DevTools → Elements tab
3. Find the avatar `<img>` element
4. Check the `src` attribute

### Expected Results
- ✅ Avatar `src` has format: `https://...?v=<timestamp>`
- ✅ Query parameter `v` is present
- ✅ Timestamp value is a number (Unix timestamp)
- ✅ Changing avatar and reloading shows different `v` value

### Failure Indicators
- ❌ Avatar `src` has no query parameter
- ❌ Same `v` value after avatar change
- ❌ Browser shows stale cached image

---

## Test 7: Credentials (Cookies) Sent with Requests

### Goal
Verify that requests include authentication cookies.

### Steps
1. Open Browser DevTools → Network tab
2. Navigate to `/profile/edit`
3. Upload an avatar
4. Click "Save Changes"
5. Find the PATCH `/me/profile` request
6. Click on the request → "Headers" tab
7. Check "Request Headers" section

### Expected Results
- ✅ Request includes `Cookie` header with `access_token` and/or `refresh_token`
- ✅ OR: Request includes `Authorization: Bearer <token>` header
- ✅ Response status: 200 OK (not 401 Unauthorized)

### Failure Indicators
- ❌ No `Cookie` or `Authorization` header
- ❌ Response status: 401 Unauthorized
- ❌ CORS error in console

---

## Test 8: Disable Cache DevTools Test

### Goal
Verify that the "Disable cache → 401" bug is fixed.

### Steps
1. Open Browser DevTools → Network tab
2. **Check "Disable cache" checkbox** at the top
3. Navigate to `/profile/edit`
4. Upload an avatar
5. Click "Save Changes"
6. Check console and network tab for errors

### Expected Results
- ✅ All requests succeed (no 401 errors)
- ✅ PATCH `/me/profile` returns 200 OK
- ✅ GET `/me/profile` returns 200 OK
- ✅ Avatar saves and displays correctly

### Failure Indicators
- ❌ 401 Unauthorized error
- ❌ Requests fail when cache is disabled
- ❌ Console error: "Unauthorized"

---

## Regression Tests

### Test 9: Banner Upload Still Works
1. Navigate to `/profile/edit`
2. Upload a banner image
3. Click "Save Changes"
4. Verify banner updates correctly

### Test 10: Profile Edit Without Avatar Change
1. Navigate to `/profile/edit`
2. Change display name or bio (without touching avatar)
3. Click "Save Changes"
4. Verify profile updates correctly
5. Console log should show `avatarUrl` unchanged (not null)

---

## Success Criteria

All tests must pass for the fix to be considered successful:
- ✅ No ImageCropper component renders
- ✅ AvatarUploader works correctly
- ✅ PATCH payload uses `avatarUrl` field name
- ✅ Backend receives correct field
- ✅ No-cache headers present in responses
- ✅ Avatar displays immediately after save
- ✅ Cache-busting query params work
- ✅ Credentials sent with all requests
- ✅ "Disable cache" mode doesn't cause 401 errors

## Known Issues (Not in Scope)

These issues are **not** related to PR #366 fixes:
- DNS resolution issues in build environment (environmental)
- Backend API Gateway URL configuration (infrastructure)
- Missing npm dependencies in CI (CI configuration)

## Reporting Issues

If any test fails, report with:
1. Test number and name
2. Actual behavior observed
3. Browser console errors (if any)
4. Network tab screenshot
5. Steps to reproduce
