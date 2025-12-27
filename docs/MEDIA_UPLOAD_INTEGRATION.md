# Media Upload Integration Documentation

## Overview

This document describes the Phase 5 media upload integration for Project Valine, including the complete flow from frontend to S3 via presigned URLs.

## Architecture

### Upload Flow

```
User selects file → Frontend validates
                ↓
          Get presigned URL from backend
                ↓
          Upload directly to S3 (PUT)
                ↓
          Mark upload complete in backend
                ↓
          Media record updated to "processing"
```

### Components

1. **Frontend (React + Vite)**
   - `src/services/mediaService.js` - API client for media operations
   - `src/components/MediaUploader.jsx` - File upload UI component
   - `src/pages/ProfileEdit.jsx` - Profile editing with media upload

2. **Backend (Serverless)**
   - `POST /profiles/:id/media/upload-url` - Generate presigned URL
   - `POST /profiles/:id/media/complete` - Mark upload complete
   - `PUT /media/:id` - Update media metadata
   - `DELETE /media/:id` - Delete media

3. **Storage (AWS S3)**
   - Bucket: `MEDIA_BUCKET` or `S3_BUCKET` environment variable
   - Direct upload via presigned URLs
   - Files stored at: `profiles/{profileId}/media/{timestamp}-{mediaId}`

## API Reference

### Get Upload URL

```javascript
const { mediaId, uploadUrl, s3Key } = await getUploadUrl(
  profileId,   // User's profile ID
  'video',     // Media type: 'image', 'video', or 'pdf'
  'Demo Reel', // Optional title
  'My latest work', // Optional description
  'public'     // Privacy: 'public', 'on-request', or 'private'
);
```

**Backend Endpoint:**
```
POST /profiles/{id}/media/upload-url
Authorization: Bearer <token>

Request Body:
{
  "type": "video",
  "title": "Demo Reel",
  "description": "My latest work",
  "privacy": "public"
}

Response:
{
  "mediaId": "uuid",
  "uploadUrl": "https://s3.amazonaws.com/...",
  "s3Key": "profiles/uuid/media/timestamp-uuid",
  "message": "Upload your file to the provided URL"
}
```

### Upload to S3

```javascript
await uploadToS3(
  uploadUrl,    // Presigned URL from backend
  file,         // File object
  'video',      // Media type
  (progress) => console.log(`${progress}%`) // Progress callback
);
```

**S3 Upload:**
```
PUT <presigned-url>
Content-Type: video/mp4

Body: <binary file data>
```

### Complete Upload

```javascript
const result = await completeUpload(
  profileId,
  mediaId,
  {
    width: 1920,
    height: 1080,
    fileSize: 10485760
  }
);
```

**Backend Endpoint:**
```
POST /profiles/{id}/media/complete
Authorization: Bearer <token>

Request Body:
{
  "mediaId": "uuid",
  "width": 1920,
  "height": 1080,
  "fileSize": 10485760
}

Response:
{
  "media": {
    "id": "uuid",
    "processedStatus": "processing",
    ...
  },
  "message": "Upload marked as complete, processing started"
}
```

### Full Upload Helper

The `uploadMedia` function combines all three steps:

```javascript
const result = await uploadMedia(
  profileId,
  file,
  'image',
  {
    title: 'Profile Banner',
    description: 'Cover banner',
    privacy: 'public',
    onProgress: (progress) => console.log(`${progress}%`)
  }
);
```

## Content-Type Mapping

| Media Type | Default Content-Type | Notes |
|------------|---------------------|-------|
| `image` | `image/jpeg` | Uses file.type if available |
| `video` | `video/mp4` | Uses file.type if available |
| `pdf` | `application/pdf` | For documents |

**Important:** Always set the correct `Content-Type` header when uploading to S3. The presigned URL is generated with a specific content type, and the upload will fail if the header doesn't match.

## File Size Limits

- **Images:** 10 MB maximum
- **Videos:** 500 MB maximum
- **PDFs:** 10 MB maximum

File size validation occurs on the frontend before upload to provide immediate feedback.

## Progress Tracking

The upload process reports progress in three phases:

1. **0-10%:** Getting presigned URL from backend
2. **10-90%:** Uploading to S3 (with real-time progress)
3. **90-100%:** Marking upload complete in backend

Example:
```javascript
await uploadMedia(profileId, file, 'video', {
  onProgress: (percent) => {
    if (percent < 10) console.log('Preparing upload...');
    else if (percent < 90) console.log('Uploading to cloud...');
    else console.log('Finalizing...');
  }
});
```

## Error Handling

### Common Errors

#### 403 Forbidden
```javascript
try {
  await uploadMedia(profileId, file, 'image');
} catch (error) {
  // error.message: "You do not have permission to upload to this profile"
}
```

**Cause:** User is not the profile owner
**Solution:** Verify ownership before showing upload UI

#### 413 File Too Large
```javascript
try {
  await uploadMedia(profileId, largeFile, 'image');
} catch (error) {
  // error.message: "File size must be less than 10MB"
}
```

**Cause:** File exceeds size limit
**Solution:** Validate file size before upload

#### Network Errors
```javascript
try {
  await uploadToS3(uploadUrl, file, 'video', onProgress);
} catch (error) {
  // error.message: "Network error during upload. Please check your connection..."
}
```

**Cause:** Network interruption during S3 upload
**Solution:** Offer retry option to user

#### Timeout
```javascript
try {
  await uploadToS3(uploadUrl, file, 'video', onProgress);
} catch (error) {
  // error.message: "Upload timed out. Please try again."
}
```

**Cause:** Upload took longer than 10 minutes
**Solution:** Check file size and network speed

### CORS Issues

If you encounter CORS errors when uploading to S3, verify:

1. **S3 Bucket CORS Configuration:**
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://yourdomain.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

2. **Presigned URL Expiration:**
   - URLs are valid for 15 minutes
   - Start upload immediately after getting URL

3. **Content-Type Match:**
   - Ensure Content-Type header matches presigned URL
   - Use `getContentType(file, mediaType)` helper

## Usage Examples

### ProfileEdit.jsx - Banner Upload

```javascript
const handleBannerUpload = async (file, onProgress) => {
  if (!user?.id) {
    toast.error('You must be logged in to upload media');
    return;
  }

  setUploadingBanner(true);
  const toastId = toast.loading('Uploading banner...');

  try {
    await uploadMedia(user.id, file, 'image', {
      title: 'Profile Banner',
      privacy: 'public',
      onProgress,
    });

    toast.success('Banner uploaded successfully!', { id: toastId });
  } catch (error) {
    toast.error(error.message || 'Failed to upload banner', { id: toastId });
    throw error;
  } finally {
    setUploadingBanner(false);
  }
};
```

### ProfileEdit.jsx - Reel Upload

```javascript
const handleReelUpload = async (file, onProgress) => {
  if (!user?.id) {
    toast.error('You must be logged in to upload media');
    return;
  }

  setUploadingReel(true);
  const toastId = toast.loading('Uploading reel...');

  try {
    await uploadMedia(user.id, file, 'video', {
      title: formData.reelPrivacy === 'public' ? 'Demo Reel' : 'Private Reel',
      privacy: formData.reelPrivacy,
      onProgress,
    });

    toast.success('Reel uploaded successfully!', { id: toastId });
  } catch (error) {
    toast.error(error.message || 'Failed to upload reel', { id: toastId });
    throw error;
  } finally {
    setUploadingReel(false);
  }
};
```

### MediaUploader Component Usage

```jsx
<MediaUploader
  onUpload={handleBannerUpload}
  acceptedTypes="image/*"
  uploadType="image"
  maxSize={10}
  allowRetry={true}
/>
```

## Testing

### Unit Tests

Run tests with:
```powershell
npm test src/services/__tests__/mediaService.test.js
npm test src/pages/__tests__/ProfileEdit.upload.test.jsx
```

### Manual Testing

1. **Get presigned URL:**
```powershell
PROFILE_ID="your-profile-id"
TOKEN="your-auth-token"

Invoke-RestMethod -Uri "-X" -Method Post -Headers @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
} -Body '{"type": "video", "title": "Demo Reel"}' -ContentType 'application/json'```

2. **Upload to S3:**
```powershell
Invoke-RestMethod -Uri "-X" -Method Put -Headers @{
    "Content-Type" = "video/mp4"
}```

3. **Mark complete:**
```powershell
Invoke-RestMethod -Uri "-X" -Method Post -Headers @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
} -Body '{\' -ContentType 'application/json'```

## Security Considerations

### Ownership Validation

- Backend verifies profile ownership before generating presigned URLs
- Frontend checks `user.id === profileId` before upload
- Upload UI only shown to profile owner

### File Validation

- Frontend validates file type and size before upload
- Backend validates type parameter
- S3 enforces content-type matching

### URL Expiration

- Presigned URLs expire after 15 minutes
- Prevents URL sharing/reuse
- Frontend should upload immediately after getting URL

### Privacy Settings

- Media can be `public`, `on-request`, or `private`
- Privacy affects who can view the media after upload
- Set via `privacy` parameter in upload request

## Future Enhancements

### Planned Features

1. **Background Processing**
   - Video transcoding
   - Thumbnail generation
   - Multiple quality versions

2. **Media Gallery**
   - View all uploaded media
   - Organize into collections
   - Batch operations

3. **Advanced Features**
   - Drag-and-drop upload
   - Multiple file upload
   - Resume interrupted uploads
   - Client-side compression

### Migration Path

When backend processing is added:

1. Media status will transition: `pending` → `processing` → `complete`
2. Webhook notifications for processing completion
3. CDN URLs for optimized delivery
4. Automatic cleanup of failed/stale uploads

## Troubleshooting

### Upload fails immediately

- Check file size and type
- Verify user is authenticated
- Confirm user owns the profile

### Upload progress stalls

- Check network connection
- Verify presigned URL hasn't expired
- Check browser console for errors

### Upload succeeds but media not visible

- Check media `processedStatus` in database
- Verify privacy settings
- Check media URL is accessible

### CORS errors

- Verify S3 bucket CORS configuration
- Check allowed origins include your domain
- Ensure Content-Type header matches

## Support

For issues or questions:
1. Check browser console for errors
2. Review backend logs for API errors
3. Verify S3 bucket configuration
4. Check network tab for failed requests
