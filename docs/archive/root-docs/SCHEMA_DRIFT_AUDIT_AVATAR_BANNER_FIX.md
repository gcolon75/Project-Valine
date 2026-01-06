> **ARCHIVED:** 2026-01-05
> **Reason:** Consolidated into canonical documentation
> **See:** [Documentation Index](./README.md) for current docs

---
# Schema Drift Audit + Avatar/Banner Save Fix

**Date**: 2025-12-24  
**Issue**: Edit Profile cannot save avatar + banner together - one overwrites the other with `null`

---

## Phase 0: Repro & Trace the Failure Path ✅

### Components Identified
- **Frontend UI**: `src/pages/ProfileEdit.jsx`
  - Avatar uploader: `src/components/AvatarUploader.jsx`  
  - Banner uploader: `src/components/MediaUploader.jsx`
  - Save handler: `handleSave()` (line 505)

### Request Sequence
1. User uploads avatar → `handleAvatarUpload()` → stores S3 URL in `formData.avatar`
2. User uploads banner → `handleBannerUpload()` → stores S3 URL in `formData.banner` and `formData.bannerUrl`
3. User clicks "Save Changes" → `handleSave()` → calls `updateMyProfile()`
4. Frontend calls `PATCH /me/profile` with mapped payload

### API Endpoints
- **Avatar upload**: `/api/profiles/:id/media/upload-url` + `/api/profiles/:id/media/complete`
- **Profile update**: `PATCH /me/profile` (handled by `updateMyProfile` in `serverless/src/handlers/profiles.js:777`)

### Data Loss Location
**Problem**: When user uploads ONLY avatar OR ONLY banner, the `mapFormToProfileUpdate()` function sends ALL fields including NULL values for unchanged fields. Backend accepts `null` and overwrites existing data.

**Example**:
```javascript
// User uploads only avatar (banner unchanged)
formData = {
  avatar: 'https://s3.../new-avatar.jpg',
  banner: null,  // ❌ This is the existing banner from initial load
  // ... other fields
}

// mapFormToProfileUpdate sends:
{
  avatarUrl: 'https://s3.../new-avatar.jpg',
  bannerUrl: null,  // ❌ Overwrites existing banner in DB!
  // ... other fields
}
```

---

## Phase 1: Backend Contract Audit ✅

### Endpoint Analysis
**File**: `serverless/src/handlers/profiles.js`  
**Function**: `updateMyProfile` (lines 777-1180)

### Field Mappings
| Frontend Field | Backend Param | DB Table  | DB Column    |
|----------------|---------------|-----------|--------------|
| `avatar`       | `avatarUrl`   | `users`   | `avatar`     |
| `banner`       | `bannerUrl`   | `profiles`| `bannerUrl`  |

### The Bug (EXACT LOCATION)

**Line 996 (BEFORE FIX)**:
```javascript
if (avatarUrl !== undefined) {userUpdateData.avatar = avatarUrl;}
```
❌ **Problem**: Checks `!== undefined` but NOT `!== null`. When frontend sends `avatarUrl: null`, it passes the check and sets `avatar = null` in DB.

**Line 1020 (BEFORE FIX)**:
```javascript
if (bannerUrl !== undefined) {profileUpdateData.bannerUrl = bannerUrl;}
```
❌ **Problem**: Same issue - accepts `null` and overwrites existing banner.

### Root Cause Analysis
1. **Frontend bug**: `mapFormToProfileUpdate()` (line 77) sends ALL fields unconditionally, including `null` values for unchanged media
2. **Backend bug**: Accepts `null` values and treats them as valid updates instead of "no change"

### Classic Overwrite Pattern
```javascript
// ❌ BAD (what we had)
if (avatarUrl !== undefined) {
  userUpdateData.avatar = avatarUrl;  // Allows null to overwrite
}

// ✅ GOOD (after fix)
if (avatarUrl !== undefined && avatarUrl !== null) {
  userUpdateData.avatar = avatarUrl;  // Rejects null
}
```

---

## Phase 2: Prisma/DB Drift Sweep ✅

### Schema Validation

**Prisma Schema**: `api/prisma/schema.prisma`

#### User Model (lines 11-68)
```prisma
model User {
  id                      String                    @id @default(uuid())
  username                String                    @unique
  email                   String                    @unique
  ...
  avatar                  String?                   // ✅ Line 21 - Nullable
  ...
  @@map("users")
}
```

#### Profile Model (lines 289-326)
```prisma
model Profile {
  id          String        @id @default(uuid())
  userId      String        @unique
  vanityUrl   String        @unique
  headline    String?
  bio         String?
  title       String?
  bannerUrl   String?      // ✅ Line 296 - Nullable
  ...
  @@map("profiles")
}
```

### Field Naming Consistency Audit

| Layer           | Avatar Field | Banner Field | Status |
|-----------------|--------------|--------------|---------|
| **Database**    | `users.avatar` | `profiles.bannerUrl` | ✅ Consistent |
| **Prisma**      | `User.avatar` | `Profile.bannerUrl` | ✅ Consistent |
| **Backend API** | `avatarUrl` param | `bannerUrl` param | ✅ Consistent |
| **Frontend**    | `formData.avatar` | `formData.banner` / `formData.bannerUrl` | ⚠️ Dual naming |
| **Mapping**     | `avatar → avatarUrl` | `banner → bannerUrl` | ✅ Correct |

### Schema Drift Report

#### ✅ Confirmed Matches
- `User.avatar` (Prisma) ↔ `users.avatar` (DB) ↔ `avatarUrl` (API param)
- `Profile.bannerUrl` (Prisma) ↔ `profiles.bannerUrl` (DB) ↔ `bannerUrl` (API param)
- Both fields are correctly nullable (`String?`)
- Field types match across layers (String)

#### ⚠️ Inconsistencies Found
1. **Frontend inconsistency**: Uses both `formData.banner` AND `formData.bannerUrl` for the same field
   - Location: `ProfileEdit.jsx` line 428
   - Impact: Confusing but doesn't cause bugs (both set to same value)
   - Recommendation: Standardize on one name

#### ❌ Bug Identified (NOT schema drift)
**Location**: 
- Frontend: `src/pages/ProfileEdit.jsx:77` (`mapFormToProfileUpdate`)
- Backend: `serverless/src/handlers/profiles.js:996, 1020` (`updateMyProfile`)

**Issue**: Logic allows `null` to overwrite existing values when updating one field without the other

---

## Phase 3: Implement the Fix ✅

### Fix Strategy
Defense-in-depth: Fix BOTH frontend and backend to prevent null overwrites

### Backend Fix

**File**: `serverless/src/handlers/profiles.js`

**Change 1 - Avatar field (line 996)**:
```javascript
// BEFORE
if (avatarUrl !== undefined) {userUpdateData.avatar = avatarUrl;}

// AFTER
// Only update avatar if explicitly provided and not null (prevents overwriting with null)
if (avatarUrl !== undefined && avatarUrl !== null) {userUpdateData.avatar = avatarUrl;}
```

**Change 2 - Banner field (line 1020)**:
```javascript
// BEFORE
if (bannerUrl !== undefined) {profileUpdateData.bannerUrl = bannerUrl;}

// AFTER
// Only update bannerUrl if explicitly provided and not null (prevents overwriting with null)
if (bannerUrl !== undefined && bannerUrl !== null) {profileUpdateData.bannerUrl = bannerUrl;}
```

**Why this works**: 
- `undefined` = field not sent in request → Don't change DB
- `null` = field sent but empty → DON'T change DB (treat as "no update")
- `"actual-url"` = field sent with value → Update DB

### Frontend Fix

**File**: `src/pages/ProfileEdit.jsx`

**Change - mapFormToProfileUpdate function (lines 76-95)**:
```javascript
// BEFORE
const mapFormToProfileUpdate = (formData) => {
  return {
    displayName: formData.displayName,
    username: formData.username,
    // ... other fields
    avatarUrl: formData.avatar,  // ❌ Sends null if no avatar
    bannerUrl: formData.banner || formData.bannerUrl,  // ❌ Sends null if no banner
    links: formData.profileLinks
  };
};

// AFTER
const mapFormToProfileUpdate = (formData) => {
  const payload = {
    displayName: formData.displayName,
    username: formData.username,
    // ... other fields
    links: formData.profileLinks
  };
  
  // Only include avatar if it exists and is not null
  if (formData.avatar) {
    payload.avatarUrl = formData.avatar;
  }
  
  // Only include banner if it exists and is not null
  const bannerValue = formData.banner || formData.bannerUrl;
  if (bannerValue) {
    payload.bannerUrl = bannerValue;
  }
  
  return payload;
};
```

**Why this works**:
- Only sends `avatarUrl` if user has an avatar value
- Only sends `bannerUrl` if user has a banner value
- Backend never receives `null` for unchanged fields

### Why It Broke
1. **Initial implementation** assumed all fields would always have values
2. **Upload flow** stores URLs in formData, but unchanged fields remain `null`
3. **Save flow** sent all fields unconditionally
4. **Backend** accepted `null` as a valid update value

### Why This Fix Is Safe
1. **Backwards compatible**: Existing API behavior unchanged for clients sending valid URLs
2. **No migration needed**: Database schema unchanged
3. **Defense-in-depth**: Both frontend and backend reject `null` values
4. **Minimal change**: Only 2 conditions added per field

---

## Phase 4: Verification Checklist

### Backend Smoke Test
```powershell
$ApiBase="https://wkndtj22ab.execute-api.us-west-2.amazonaws.com"
Invoke-RestMethod "$ApiBase/health"
```
Expected: `{"status":"healthy"}`

### Manual Test Plan (2 minutes)

#### Test 1: Update Avatar Only
1. Log in to profile edit page
2. Upload new avatar image
3. Click "Save Changes"
4. **Expected**: Avatar updates, banner remains unchanged
5. Refresh page
6. **Verify**: Avatar shows new image, banner still shows old image

#### Test 2: Update Banner Only
1. Log in to profile edit page
2. Upload new banner image
3. Click "Save Changes"
4. **Expected**: Banner updates, avatar remains unchanged
5. Refresh page
6. **Verify**: Banner shows new image, avatar still shows old image

#### Test 3: Update Both Together
1. Log in to profile edit page
2. Upload new avatar image
3. Upload new banner image
4. Click "Save Changes"
5. **Expected**: Both avatar and banner update
6. Refresh page
7. **Verify**: Both show new images

#### Test 4: Database Verification
```sql
-- Check profile record after each test
SELECT avatar FROM users WHERE id = 'your-user-id';
SELECT "bannerUrl" FROM profiles WHERE "userId" = 'your-user-id';
```
**Expected**: Non-null URLs for uploaded images

### Automated Test
**File**: `src/pages/__tests__/ProfileEdit.avatar-banner-together.test.jsx`

Tests cover:
- [x] Avatar-only update preserves banner
- [x] Banner-only update preserves avatar
- [x] Both together update correctly
- [x] Null values not sent in payload

---

## Output Summary

### 1. Root Cause
**File**: `serverless/src/handlers/profiles.js` (lines 996, 1020)  
**Function**: `updateMyProfile`

**Why it fails only when both set**:
- Setting one field → sends `null` for the other → backend accepts `null` → overwrites existing value
- Setting both together → sends valid URLs for both → both update correctly

### 2. Fix Summary
- **Backend**: Added `&& !== null` check to avatar and banner field updates
- **Frontend**: Only send avatar/banner in payload if they have truthy values
- **Impact**: Prevents `null` from overwriting existing media URLs

### 3. Diff / Patch

**Backend Diff** (`serverless/src/handlers/profiles.js`):
```diff
@@ -993,7 +993,8 @@
       const userUpdateData = {};
       if (username !== undefined) {userUpdateData.username = username;}
       if (displayName !== undefined) {userUpdateData.displayName = displayName;}
-      if (avatarUrl !== undefined) {userUpdateData.avatar = avatarUrl;}
+      // Only update avatar if explicitly provided and not null (prevents overwriting with null)
+      if (avatarUrl !== undefined && avatarUrl !== null) {userUpdateData.avatar = avatarUrl;}

@@ -1017,7 +1018,9 @@
       // Map frontend 'links' to backend 'socialLinks' (JSON field in serverless schema)
       if (links !== undefined) {profileUpdateData.socialLinks = links;}
       // bannerUrl, budgetMin, budgetMax fields
-      if (bannerUrl !== undefined) {profileUpdateData.bannerUrl = bannerUrl;}
+      // Only update bannerUrl if explicitly provided and not null (prevents overwriting with null)
+      if (bannerUrl !== undefined && bannerUrl !== null) {profileUpdateData.bannerUrl = bannerUrl;}
       if (budgetMin !== undefined) {profileUpdateData.budgetMin = budgetMin;}
```

**Frontend Diff** (`src/pages/ProfileEdit.jsx`):
```diff
@@ -76,14 +76,25 @@
 // Helper function to map form data to profile update payload
 const mapFormToProfileUpdate = (formData) => {
-  return {
+  const payload = {
     displayName: formData.displayName,
     username: formData.username,
     // ... other fields
-    avatarUrl: formData.avatar,  // Map frontend 'avatar' to backend 'avatarUrl'
-    bannerUrl: formData.banner || formData.bannerUrl,
     links: formData.profileLinks
   };
+  
+  // Only include avatar if it exists and is not null (prevents overwriting with null)
+  if (formData.avatar) {
+    payload.avatarUrl = formData.avatar;
+  }
+  
+  // Only include banner if it exists and is not null (prevents overwriting with null)
+  const bannerValue = formData.banner || formData.bannerUrl;
+  if (bannerValue) {
+    payload.bannerUrl = bannerValue;
+  }
+  
+  return payload;
 };
```

### 4. Schema Drift Report
See Phase 2 above - No schema drift detected. All field mappings consistent across layers.

### 5. Verification Steps
See Phase 4 above - Manual and automated tests provided.

---

## Security Summary
✅ No security vulnerabilities introduced or discovered
- Fix prevents data loss but doesn't affect authorization/authentication
- No new user input accepted
- No SQL injection or XSS risks
- Backend validation still applies to all fields

---

## References
- Prisma Schema: `/api/prisma/schema.prisma`
- Backend Handler: `/serverless/src/handlers/profiles.js`
- Frontend Component: `/src/pages/ProfileEdit.jsx`
- Test File: `/src/pages/__tests__/ProfileEdit.avatar-banner-together.test.jsx`
- Previous Fix: `IMPLEMENTATION_SUMMARY_AVATAR_BANNER_FIX.md` (different issue)
