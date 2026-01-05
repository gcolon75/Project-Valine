# Media/S3 Agent

**Status**: ✅ Specification Complete  
**Date**: December 2025  
**Type**: Specialized Agent

## Overview

The Media/S3 Agent handles all file upload and download operations for the Project-Valine platform. It manages presigned URLs, video/image processing, and secure media access control.

## Capabilities

### 1. File Uploads
- **Presigned URL Generation**: Generate secure S3 upload URLs
- **Multi-part Uploads**: Handle large files with chunked uploads
- **Progress Tracking**: Real-time upload progress monitoring
- **File Validation**: Verify file types, sizes, and integrity
- **Metadata Extraction**: Extract and store file metadata

### 2. Presigned URLs
- **Upload URLs**: Time-limited PUT URLs for secure uploads
- **Download URLs**: Time-limited GET URLs for secure downloads
- **Access Control**: Role-based URL generation
- **URL Expiration**: Configurable expiration times
- **Request Signatures**: Verify URL authenticity

### 3. Media Processing
- **Image Optimization**: Resize and compress images
- **Video Transcoding**: Convert videos to web-friendly formats
- **Thumbnail Generation**: Create thumbnails for previews
- **Format Conversion**: Convert between media formats
- **Watermarking**: Add watermarks to protected content

## Supported File Types

### Images
| Format | Max Size | Processing |
|--------|----------|------------|
| JPEG | 10 MB | Resize, compress, thumbnails |
| PNG | 10 MB | Resize, compress, thumbnails |
| WebP | 10 MB | Resize, compress, thumbnails |
| GIF | 5 MB | First frame thumbnail |

### Videos
| Format | Max Size | Processing |
|--------|----------|------------|
| MP4 | 500 MB | Transcode, thumbnails |
| MOV | 500 MB | Convert to MP4, thumbnails |
| WebM | 500 MB | Transcode, thumbnails |
| MKV | 500 MB | Convert to MP4, thumbnails |

### Documents
| Format | Max Size | Processing |
|--------|----------|------------|
| PDF | 50 MB | Thumbnail generation |
| DOC/DOCX | 25 MB | Metadata extraction |
| TXT | 5 MB | None |

## S3 Bucket Structure

```
valine-media-{env}/
├── uploads/                    # Raw uploads (temporary)
│   └── {userId}/{uploadId}/
├── media/                      # Processed media
│   └── {mediaId}/
│       ├── original.{ext}     # Original file
│       ├── optimized.{ext}    # Optimized version
│       └── thumbnails/
│           ├── small.jpg      # 150x150
│           ├── medium.jpg     # 300x300
│           └── large.jpg      # 600x600
├── avatars/                    # Profile images
│   └── {userId}/
│       ├── original.jpg
│       └── cropped.jpg
└── temp/                       # Temporary files (auto-cleaned)
```

## API Endpoints

### Upload Flow

```
POST /profiles/{id}/media/upload-url
  → Returns: { mediaId, uploadUrl, s3Key }

PUT {uploadUrl}
  → Upload file directly to S3

POST /profiles/{id}/media/complete
  → Body: { mediaId, metadata }
  → Returns: { media object with URLs }
```

### Access Flow

```
GET /media/{id}/access-url
  → Returns: { downloadUrl, expiresAt }
  
GET /media/{id}
  → Returns: { media metadata }
```

## Public API

### `getUploadUrl(options: UploadOptions): Promise<UploadUrlResult>`

Generates a presigned URL for uploading media.

```typescript
interface UploadOptions {
  profileId: string;
  type: 'image' | 'video' | 'pdf' | 'document';
  filename: string;
  contentType: string;
  privacy: 'public' | 'on-request' | 'private';
  title?: string;
  description?: string;
}

interface UploadUrlResult {
  mediaId: string;           // Unique media identifier
  uploadUrl: string;         // Presigned PUT URL
  s3Key: string;             // S3 object key
  expiresAt: string;         // URL expiration (ISO-8601)
  maxSize: number;           // Maximum file size in bytes
}
```

### `completeUpload(options: CompleteOptions): Promise<MediaRecord>`

Marks an upload as complete and triggers processing.

```typescript
interface CompleteOptions {
  profileId: string;
  mediaId: string;
  fileSize?: number;
  width?: number;            // For images
  height?: number;           // For images
  duration?: number;         // For videos (seconds)
}

interface MediaRecord {
  id: string;
  profileId: string;
  type: 'image' | 'video' | 'pdf' | 'document';
  status: 'processing' | 'ready' | 'failed';
  privacy: 'public' | 'on-request' | 'private';
  originalUrl: string;
  optimizedUrl?: string;
  thumbnailUrls?: {
    small: string;
    medium: string;
    large: string;
  };
  metadata: {
    filename: string;
    contentType: string;
    fileSize: number;
    width?: number;
    height?: number;
    duration?: number;
  };
  createdAt: string;
  updatedAt: string;
}
```

### `getAccessUrl(mediaId: string, options?: AccessOptions): Promise<AccessUrlResult>`

Generates a presigned URL for downloading media.

```typescript
interface AccessOptions {
  requesterId?: string;      // User requesting access
  expiresIn?: number;        // URL lifetime in seconds (default: 3600)
  disposition?: 'inline' | 'attachment';
}

interface AccessUrlResult {
  downloadUrl: string;
  expiresAt: string;
  contentType: string;
  filename: string;
}
```

### `uploadToS3(url: string, file: File, options?: S3Options): Promise<void>`

Uploads file directly to S3 using presigned URL.

```typescript
interface S3Options {
  contentType: string;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;      // For cancellation
}
```

## Usage Examples

### Complete Upload Flow

```javascript
import { MediaS3Agent } from '@valine/agents';

const agent = new MediaS3Agent();

async function uploadMedia(file, profileId) {
  // Step 1: Get presigned upload URL
  const { mediaId, uploadUrl, expiresAt } = await agent.getUploadUrl({
    profileId,
    type: getMediaType(file),
    filename: file.name,
    contentType: file.type,
    privacy: 'public',
    title: 'My Demo Reel'
  });

  // Step 2: Upload directly to S3
  await agent.uploadToS3(uploadUrl, file, {
    contentType: file.type,
    onProgress: (progress) => {
      console.log(`Upload progress: ${progress}%`);
    }
  });

  // Step 3: Complete upload and trigger processing
  const media = await agent.completeUpload({
    profileId,
    mediaId,
    fileSize: file.size
  });

  return media;
}
```

### Access Protected Content

```javascript
async function downloadMedia(mediaId, requesterId) {
  // Get presigned download URL
  const { downloadUrl, filename } = await agent.getAccessUrl(mediaId, {
    requesterId,
    expiresIn: 3600,          // 1 hour
    disposition: 'attachment'
  });

  // Trigger download
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  link.click();
}
```

### Image with Preview

```javascript
async function uploadImageWithPreview(file, profileId) {
  // Validate file
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Image must be less than 10MB');
  }

  // Get dimensions
  const dimensions = await getImageDimensions(file);

  // Upload
  const { mediaId, uploadUrl } = await agent.getUploadUrl({
    profileId,
    type: 'image',
    filename: file.name,
    contentType: file.type,
    privacy: 'public'
  });

  await agent.uploadToS3(uploadUrl, file, {
    contentType: file.type
  });

  // Complete with metadata
  const media = await agent.completeUpload({
    profileId,
    mediaId,
    fileSize: file.size,
    width: dimensions.width,
    height: dimensions.height
  });

  return media;
}
```

## Privacy and Access Control

### Visibility Levels

| Level | Description | Access |
|-------|-------------|--------|
| `public` | Anyone can view | Direct URL access |
| `on-request` | Must request access | Approved users only |
| `private` | Owner only | Owner and admins |

### Access Request Flow

```
1. User sees blurred preview of on-request content
2. User clicks "Request Access"
3. Owner receives notification
4. Owner approves/denies request
5. If approved, user can download content
```

### API for Access Requests

```typescript
// Request access
POST /media/{id}/request-access
  → Body: { reason?: string }
  → Returns: { requestId, status: 'pending' }

// List access requests (for owner)
GET /profiles/{id}/access-requests
  → Returns: { requests: [...] }

// Approve/deny request
PATCH /access-requests/{id}
  → Body: { status: 'approved' | 'denied' }
  → Returns: { request }
```

## Configuration

### Environment Variables

```powershell
# S3 Configuration
S3_BUCKET_NAME=valine-media-production
S3_REGION=us-east-1
S3_UPLOAD_EXPIRY=3600        # Upload URL lifetime (seconds)
S3_DOWNLOAD_EXPIRY=3600      # Download URL lifetime (seconds)

# File Limits
MEDIA_MAX_IMAGE_SIZE=10485760     # 10 MB
MEDIA_MAX_VIDEO_SIZE=524288000    # 500 MB
MEDIA_MAX_DOCUMENT_SIZE=52428800  # 50 MB

# Processing
MEDIA_ENABLE_THUMBNAILS=true
MEDIA_ENABLE_OPTIMIZATION=true
MEDIA_THUMBNAIL_SIZES=150,300,600

# CDN
CDN_ENABLED=true
CDN_DOMAIN=cdn.valine.com
```

### CORS Configuration

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "https://app.valine.com",
        "https://staging.valine.com"
      ],
      "AllowedMethods": ["GET", "PUT", "POST"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

## Processing Pipeline

### Image Processing

```
Upload → Validate → Store Original → Process →
├── Optimize (lossy compression)
├── Generate thumbnails (150, 300, 600)
├── Extract metadata (EXIF)
└── Update database record
```

### Video Processing

```
Upload → Validate → Store Original → Transcode →
├── Convert to MP4 (H.264)
├── Generate thumbnails (multiple frames)
├── Extract metadata (duration, dimensions)
└── Update database record
```

## Error Handling

### Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `INVALID_FILE_TYPE` | File type not supported | Use supported format |
| `FILE_TOO_LARGE` | File exceeds size limit | Compress or split file |
| `UPLOAD_EXPIRED` | Presigned URL expired | Request new URL |
| `UPLOAD_FAILED` | S3 upload failed | Retry upload |
| `PROCESSING_FAILED` | Media processing failed | Contact support |
| `ACCESS_DENIED` | No permission to access | Request access |

### Retry Strategy

```javascript
const uploadConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  retryOn: ['UPLOAD_FAILED', 'NETWORK_ERROR']
};
```

## Metrics and Monitoring

### Key Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Upload Success Rate | Successful uploads | > 99% |
| Processing Time | Time to process media | < 30s images, < 5m videos |
| Storage Usage | Total S3 storage | Monitor growth |
| CDN Hit Rate | Cache hit percentage | > 90% |

### CloudWatch Alarms

```yaml
- Name: UploadFailureRate
  Metric: valine.media.upload.failures
  Threshold: > 5%
  Period: 5 minutes

- Name: ProcessingBacklog
  Metric: valine.media.processing.queue
  Threshold: > 100
  Period: 15 minutes
```

## Safety Constraints

1. **File Validation**: All uploads validated for type and content
2. **Size Limits**: Strict file size limits enforced
3. **Virus Scanning**: Optional ClamAV integration
4. **Rate Limiting**: Upload rate limits per user
5. **Signed URLs**: All access through signed URLs
6. **Encryption**: Server-side encryption (AES-256)

## Cost Optimization

### S3 Lifecycle Rules

```yaml
Rules:
  - Name: TempCleanup
    Prefix: temp/
    ExpirationDays: 1
    
  - Name: UploadCleanup
    Prefix: uploads/
    ExpirationDays: 7
    
  - Name: InfrequentAccess
    Prefix: media/
    TransitionDays: 90
    StorageClass: STANDARD_IA
```

### CDN Integration

- CloudFront distribution for public content
- Cache-Control headers for optimal caching
- Origin Shield to reduce origin requests

## Troubleshooting

### Common Issues

**Issue**: Upload fails with CORS error
- Verify CORS configuration on S3 bucket
- Check request origin matches allowed origins
- Ensure Content-Type header is set

**Issue**: Presigned URL expired
- Check system clock synchronization
- Increase URL expiration time
- Request new URL before upload

**Issue**: Processing stuck
- Check Lambda timeout settings
- Review CloudWatch logs for errors
- Verify S3 event notifications

## Future Enhancements

- [ ] Resumable uploads for large files
- [ ] Client-side encryption
- [ ] AI-powered content moderation
- [ ] Adaptive bitrate video streaming
- [ ] Real-time collaboration on documents

## Related Documentation

- [Media Upload Integration](/docs/MEDIA_UPLOAD_INTEGRATION.md)
- [Image Optimization Guide](/docs/IMAGE_OPTIMIZATION_GUIDE.md)
- [API Reference](/docs/api/media.md)
- [Backend Agent](/docs/agents/backend-implementation.md)

---

**Status**: ✅ Specification Complete  
**Owner**: Platform Team  
**Review Cycle**: Monthly
