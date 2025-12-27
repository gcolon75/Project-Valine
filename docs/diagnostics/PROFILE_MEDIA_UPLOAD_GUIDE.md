# Profile Edit & Media Upload Diagnostic Guide

**Last Updated:** 2025-12-27  
**Status:** Investigation Required  
**Priority:** Medium

## Overview

This document provides engineering guidance for diagnosing and fixing profile edit and media upload failures observed in production. It includes current observed failures, likely root causes, affected endpoints, and PowerShell verification checklists.

---

## Current Observed Failures

### Profile Update Failures
- **Symptom:** Profile edits (bio, display name, etc.) fail to persist
- **Error Pattern:** Typically returns 500 or 422 status codes
- **User Impact:** Users cannot update their profiles

### Media Upload Failures
- **Symptom:** Avatar/banner uploads fail or show as "broken" after upload
- **Error Pattern:** Either upload initiation fails or completion fails
- **User Impact:** Users cannot update profile pictures or banners

---

## Likely Root Causes

### 1. Authentication Issues (RESOLVED)
- **Issue:** Cross-site cookies were using `SameSite=Lax` instead of `SameSite=None`
- **Impact:** Browsers blocked auth cookies on XHR/fetch requests from CloudFront → API Gateway
- **Status:** ✅ FIXED in this PR (cookies now use `SameSite=None; Secure` in production)

### 2. CORS Misconfigurations
- **Issue:** Missing or incorrect CORS headers for specific endpoints
- **Impact:** Browsers block requests due to CORS policy violations
- **Check:**
  - `Access-Control-Allow-Origin` must include CloudFront domain
  - `Access-Control-Allow-Credentials: true` must be set
  - `Access-Control-Allow-Methods` must include PUT, PATCH for updates

### 3. S3 Presigned URL Issues
- **Issue:** Presigned URLs may expire before upload completes
- **Issue:** Incorrect Content-Type or ACL settings
- **Impact:** Direct S3 uploads fail even though URL generation succeeds
- **Check:**
  - Presigned URL expiration time (should be 10-15 minutes)
  - Content-Type header matches between presigned URL and actual upload
  - S3 bucket CORS configuration allows CloudFront origin

### 4. Database Schema Drift
- **Issue:** Profile or media tables missing expected columns
- **Issue:** Foreign key constraints failing
- **Impact:** Updates succeed at API level but fail at database level
- **Check:**
  - Run schema validation
  - Check for pending migrations
  - Verify all profile/media columns exist

### 5. Missing Environment Variables
- **Issue:** `MEDIA_BUCKET` not set or incorrect
- **Impact:** Media upload endpoints cannot generate S3 URLs
- **Status:** Now validated at startup (added in this PR)

---

## Affected Endpoints & Handlers

### Profile Update Endpoints

#### `PATCH /me/profile`
- **Handler:** `serverless/src/handlers/profilesRouter.handler`
- **Purpose:** Update current user's profile (bio, displayName, etc.)
- **Authentication:** Required (cookie-based)
- **Common Failures:**
  - 401: Auth token not sent (should be fixed by this PR)
  - 422: Validation error (invalid field values)
  - 500: Database error (schema issues, constraint violations)

#### `PUT /profiles/id/{id}`
- **Handler:** `serverless/src/handlers/profilesRouter.handler`
- **Purpose:** Admin endpoint to update any profile
- **Authentication:** Required (admin role)
- **Common Failures:** Same as above

### Media Upload Endpoints

#### `POST /profiles/{id}/media/upload-url` (getUploadUrl)
- **Handler:** `serverless/src/handlers/media.getUploadUrl`
- **Purpose:** Generate presigned S3 URL for media upload
- **Authentication:** Required
- **Request Body:**
  ```json
  {
    "fileName": "avatar.jpg",
    "fileType": "image/jpeg",
    "mediaType": "avatar"  // or "banner"
  }
  ```
- **Response:**
  ```json
  {
    "uploadUrl": "https://s3.amazonaws.com/...",
    "mediaId": "uuid",
    "expiresIn": 900
  }
  ```
- **Common Failures:**
  - 401: Auth token not sent (should be fixed by this PR)
  - 400: Missing or invalid parameters
  - 500: S3 client error (check MEDIA_BUCKET env var)

#### `POST /profiles/{id}/media/complete` (completeUpload)
- **Handler:** `serverless/src/handlers/media.completeUpload`
- **Purpose:** Mark media upload as complete and update profile
- **Authentication:** Required
- **Request Body:**
  ```json
  {
    "mediaId": "uuid",
    "s3Key": "profiles/123/avatar.jpg"
  }
  ```
- **Common Failures:**
  - 401: Auth token not sent (should be fixed by this PR)
  - 404: Media record not found in database
  - 500: Database update failed

#### `PUT /media/{id}` (updateMedia)
- **Handler:** `serverless/src/handlers/media.updateMedia`
- **Purpose:** Update media metadata
- **Authentication:** Required

#### `DELETE /media/{id}` (deleteMedia)
- **Handler:** `serverless/src/handlers/media.deleteMedia`
- **Purpose:** Delete media from S3 and database
- **Authentication:** Required

---

## PowerShell Verification Checklist

### Prerequisites
```powershell
# Set base URL
$API_BASE = "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com"

# Login first to get auth cookies
$loginBody = @{
    email = "your-email@example.com"
    password = "your-password"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod `
    -Uri "$API_BASE/auth/login" `
    -Method POST `
    -Body $loginBody `
    -ContentType "application/json" `
    -SessionVariable session

# Session variable now contains auth cookies
```

### Test 1: Verify Authentication Works
```powershell
# Test /auth/me endpoint (should return user info)
$meResponse = Invoke-RestMethod `
    -Uri "$API_BASE/auth/me" `
    -Method GET `
    -WebSession $session

Write-Host "✅ Auth working: User ID = $($meResponse.user.id)"
```

### Test 2: Get Current Profile
```powershell
# Get current user's profile
$profileResponse = Invoke-RestMethod `
    -Uri "$API_BASE/me/profile" `
    -Method GET `
    -WebSession $session

Write-Host "Current Profile:"
$profileResponse | ConvertTo-Json -Depth 3
```

### Test 3: Update Profile
```powershell
# Update profile bio
$updateBody = @{
    bio = "Updated bio - test at $(Get-Date)"
    displayName = "Test User Updated"
} | ConvertTo-Json

try {
    $updateResponse = Invoke-RestMethod `
        -Uri "$API_BASE/me/profile" `
        -Method PATCH `
        -Body $updateBody `
        -ContentType "application/json" `
        -WebSession $session
    
    Write-Host "✅ Profile updated successfully"
    $updateResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Profile update failed:"
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Error: $($_.Exception.Message)"
}
```

### Test 4: Get Upload URL for Avatar
```powershell
# Get presigned URL for avatar upload
$profileId = $meResponse.user.id
$uploadUrlBody = @{
    fileName = "test-avatar.jpg"
    fileType = "image/jpeg"
    mediaType = "avatar"
} | ConvertTo-Json

try {
    $uploadUrlResponse = Invoke-RestMethod `
        -Uri "$API_BASE/profiles/$profileId/media/upload-url" `
        -Method POST `
        -Body $uploadUrlBody `
        -ContentType "application/json" `
        -WebSession $session
    
    Write-Host "✅ Got upload URL:"
    Write-Host "Media ID: $($uploadUrlResponse.mediaId)"
    Write-Host "URL expires in: $($uploadUrlResponse.expiresIn) seconds"
    
    # Save for next test
    $mediaId = $uploadUrlResponse.mediaId
    $uploadUrl = $uploadUrlResponse.uploadUrl
} catch {
    Write-Host "❌ Failed to get upload URL:"
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Error: $($_.Exception.Message)"
}
```

### Test 5: Upload File to S3
```powershell
# Upload actual file to S3 (requires a test image file)
$testFilePath = "C:\path\to\test-image.jpg"

if (Test-Path $testFilePath) {
    try {
        $fileBytes = [System.IO.File]::ReadAllBytes($testFilePath)
        
        Invoke-RestMethod `
            -Uri $uploadUrl `
            -Method PUT `
            -Body $fileBytes `
            -ContentType "image/jpeg"
        
        Write-Host "✅ File uploaded to S3 successfully"
    } catch {
        Write-Host "❌ S3 upload failed:"
        Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
        Write-Host "Error: $($_.Exception.Message)"
    }
} else {
    Write-Host "⚠️  Test file not found at: $testFilePath"
    Write-Host "Create a small test image to continue"
}
```

### Test 6: Complete Upload
```powershell
# Mark upload as complete
$completeBody = @{
    mediaId = $mediaId
    s3Key = "profiles/$profileId/avatar/test-avatar.jpg"
} | ConvertTo-Json

try {
    $completeResponse = Invoke-RestMethod `
        -Uri "$API_BASE/profiles/$profileId/media/complete" `
        -Method POST `
        -Body $completeBody `
        -ContentType "application/json" `
        -WebSession $session
    
    Write-Host "✅ Upload marked as complete"
    $completeResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Failed to complete upload:"
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Error: $($_.Exception.Message)"
}
```

### Test 7: Verify Profile Shows New Media
```powershell
# Get profile again to verify media is attached
$verifyResponse = Invoke-RestMethod `
    -Uri "$API_BASE/me/profile" `
    -Method GET `
    -WebSession $session

if ($verifyResponse.avatarUrl) {
    Write-Host "✅ Avatar URL set: $($verifyResponse.avatarUrl)"
} else {
    Write-Host "⚠️  Avatar URL not set on profile"
}
```

---

## Diagnostic Commands

### Check Environment Variables
```powershell
# Via AWS CLI
aws lambda get-function-configuration --function-name pv-api-prod-getUploadUrl --query 'Environment.Variables'
aws lambda get-function-configuration --function-name pv-api-prod-completeUpload --query 'Environment.Variables'
```

### Check S3 Bucket CORS
```powershell
# Get bucket CORS configuration
aws s3api get-bucket-cors --bucket valine-media-uploads
```

Expected CORS config:
```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedOrigins": [
        "https://dkmxy676d3vgc.cloudfront.net",
        "http://localhost:5173"
      ],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

### Check Database Schema
```bash
# Connect to database and verify tables
psql $DATABASE_URL -c "\d profiles"
psql $DATABASE_URL -c "\d media"

# Check for missing columns
psql $DATABASE_URL -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles' ORDER BY ordinal_position;"
```

---

## Next Steps for Investigation

1. **Verify Auth Fix:**
   - Run Tests 1-3 from PowerShell checklist
   - Confirm no more 401 errors
   - Check browser cookies show `SameSite=None; Secure`

2. **Test Upload Flow:**
   - Run Tests 4-7 from PowerShell checklist
   - Identify exact step where upload fails
   - Check CloudWatch logs for both Lambda functions

3. **Check S3 Configuration:**
   - Verify CORS rules on media bucket
   - Verify presigned URL expiration is adequate
   - Test direct S3 upload with curl/PowerShell

4. **Database Investigation:**
   - Run schema checks
   - Look for constraint violation errors in logs
   - Verify foreign keys are valid

5. **Monitor CloudWatch:**
   ```bash
   # Get recent errors from upload endpoints
   aws logs tail /aws/lambda/pv-api-prod-getUploadUrl --follow
   aws logs tail /aws/lambda/pv-api-prod-completeUpload --follow
   ```

---

## Known Issues & Workarounds

### Issue: Upload URL Expires Too Quickly
- **Workaround:** Increase presigned URL expiration in `getUploadUrl` handler
- **Fix:** Update expiration from 900s (15min) to 1800s (30min) for large files

### Issue: Content-Type Mismatch
- **Symptom:** S3 returns 403 Forbidden on upload
- **Cause:** Content-Type in PUT request doesn't match presigned URL
- **Fix:** Ensure client sends exact Content-Type specified in presigned URL

---

## References

- [AWS S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [Browser Cookie SameSite Attribute](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [CORS Configuration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)
