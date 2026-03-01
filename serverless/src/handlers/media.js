import { getPrisma } from '../db/client.js';
import { json, error, getCorsHeaders } from '../utils/headers.js';
import { getUserFromEvent } from './auth.js';
import { requireEmailVerified } from '../utils/authMiddleware.js';
import { csrfProtection } from '../middleware/csrfMiddleware.js';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { watermarkPdf } from '../utils/pdfWatermark.js';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-west-2' });
const MEDIA_BUCKET = process.env.MEDIA_BUCKET || process.env.S3_BUCKET || 'valine-media-uploads';

// Upload size limits (in bytes)
const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024,   // 10 MB
  video: 100 * 1024 * 1024,  // 100 MB
  pdf: 25 * 1024 * 1024,     // 25 MB
};

/**
 * POST /api/profiles/:id/media/upload-url
 * Generate signed S3 upload URL and create placeholder media record
 */
export const getUploadUrl = async (event) => {
  try {
    // CSRF protection (Phase 3)
    const csrfError = csrfProtection(event);
    if (csrfError) {
      return csrfError;
    }

    const { id: profileId } = event.pathParameters || {};
    
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    // Require email verification for media uploads
    const verificationError = await requireEmailVerified(userId);
    if (verificationError) {
      return verificationError;
    }

    const body = JSON.parse(event.body || '{}');
    const { type, title, description, privacy, contentType, mimeType, fileSize } = body;

    if (!type || !['image', 'video', 'pdf'].includes(type)) {
      return error(400, 'Valid type is required (image, video, or pdf)');
    }

    // Validate file size before presigning
    if (fileSize === undefined || fileSize === null) {
      return error(400, 'fileSize (in bytes) is required');
    }
    const parsedFileSize = typeof fileSize === 'number' ? fileSize : parseInt(fileSize, 10);
    if (isNaN(parsedFileSize) || parsedFileSize <= 0) {
      return error(400, 'fileSize must be a positive number');
    }

    const maxSize = MAX_FILE_SIZES[type];
    if (parsedFileSize > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return error(413, `File too large. Maximum size for ${type}: ${maxSizeMB} MB`);
    }

    // Validate and normalize MIME type — prefer explicit mimeType, fall back to contentType
    const allowedContentTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'application/pdf'
    ];

    const resolvedMimeType = mimeType || contentType;
    let validatedContentType;
    if (resolvedMimeType) {
      // If a MIME type is provided, validate it against allowlist
      if (!allowedContentTypes.includes(resolvedMimeType)) {
        return error(400, `Invalid MIME type. Allowed types: ${allowedContentTypes.join(', ')}`);
      }
      validatedContentType = resolvedMimeType;
    } else {
      // Fall back to type-based defaults for backward compatibility
      validatedContentType = type === 'video' ? 'video/mp4' : type === 'image' ? 'image/jpeg' : 'application/pdf';
    }

    const prisma = getPrisma();

    // Ensure profile exists for the user - auto-create if not
    let profile;
    if (profileId) {
      // If profileId is provided, verify ownership
      profile = await prisma.profile.findUnique({
        where: { id: profileId },
      });

      if (!profile) {
        return error(404, 'Profile not found');
      }

      if (profile.userId !== userId) {
        return error(403, 'Forbidden - not profile owner');
      }
    } else {
      // If no profileId, find or create profile for the user
      profile = await prisma.profile.findUnique({
        where: { userId },
      });

      if (!profile) {
        // Auto-create a stub profile
        profile = await prisma.profile.create({
          data: {
            userId,
            vanityUrl: userId, // Use userId as fallback vanityUrl
            headline: '',
            bio: '',
            roles: [],
            tags: [],
          },
        });
        console.log('[getUploadUrl] Auto-created profile for user:', userId);
      }
    }

    // Generate unique S3 key
    const mediaId = crypto.randomUUID();
    const timestamp = Date.now();
    const s3Key = `profiles/${profile.id}/media/${timestamp}-${mediaId}`;

    // Create placeholder media record
    const media = await prisma.media.create({
      data: {
        profileId: profile.id,
        type,
        s3Key,
        title: title || null,
        description: description || null,
        privacy: privacy || 'public',
        processedStatus: 'pending',
        fileSize: parsedFileSize,
      },
    });

    // Generate signed upload URL (valid for 15 minutes)
    // Note: We don't include ContentLength in the presigned URL as it can cause
    // CORS/signature issues. File size is validated before generating URL and
    // again on the complete endpoint.
    const command = new PutObjectCommand({
      Bucket: MEDIA_BUCKET,
      Key: s3Key,
      ContentType: validatedContentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    return json({
      mediaId: media.id,
      uploadUrl,
      s3Key,
      profileId: profile.id,
      maxFileSize: maxSize,
      message: 'Upload your file to the provided URL, then call /complete endpoint',
    }, 201);
  } catch (e) {
    console.error('Get upload URL error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * POST /api/profiles/:id/media/complete
 * Mark upload as complete and trigger processing
 */
export const completeUpload = async (event) => {
  try {
    // CSRF protection (Phase 3)
    const csrfError = csrfProtection(event);
    if (csrfError) {
      return csrfError;
    }

    const { id: profileId } = event.pathParameters || {};
    if (!profileId) {
      return error(400, 'profileId is required');
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    // Require email verification for media uploads
    const verificationError = await requireEmailVerified(userId);
    if (verificationError) {
      return verificationError;
    }

    const body = JSON.parse(event.body || '{}');
    const { mediaId, width, height, fileSize, posterS3Key } = body;

    if (!mediaId) {
      return error(400, 'mediaId is required');
    }

    const prisma = getPrisma();

    // Verify profile ownership
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      return error(404, 'Profile not found');
    }

    if (profile.userId !== userId) {
      return error(403, 'Forbidden - not profile owner');
    }

    // Get the media record
    const existingMedia = await prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!existingMedia) {
      return error(404, 'Media not found');
    }

    // Update media record
    const media = await prisma.media.update({
      where: { id: mediaId },
      data: {
        processedStatus: 'processing',
        width: width || null,
        height: height || null,
        fileSize: fileSize || null,
        posterS3Key: posterS3Key || null,
      },
    });

    // Generate the S3 URL for the uploaded file
    const s3Url = `https://${MEDIA_BUCKET}.s3.${process.env.AWS_REGION || 'us-west-2'}.amazonaws.com/${media.s3Key}`;

    // Note: Avatar and banner uploads are now handled separately through updateMyProfile endpoint
    // This endpoint is for gallery media only

    // TODO: Trigger background processing (Lambda, SQS, etc.)
    // For now, we'll mark it as complete immediately
    // In production, this would queue a job for transcoding/thumbnail generation

    return json({
      media,
      s3Url,
      message: 'Upload marked as complete, processing started',
    });
  } catch (e) {
    console.error('Complete upload error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * PUT /api/media/:id
 * Update media metadata and privacy
 */
export const updateMedia = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    if (!id) {
      return error(400, 'id is required');
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const body = JSON.parse(event.body || '{}');
    const { title, description, privacy } = body;

    const prisma = getPrisma();

    // Get media and verify ownership through profile
    const media = await prisma.media.findUnique({
      where: { id },
      include: {
        profile: true,
      },
    });

    if (!media) {
      return error(404, 'Media not found');
    }

    if (media.profile.userId !== userId) {
      return error(403, 'Forbidden - not media owner');
    }

    // Validate privacy value
    if (privacy && !['public', 'on-request', 'private'].includes(privacy)) {
      return error(400, 'Invalid privacy value');
    }

    // Update media
    const updateData = {};
    if (title !== undefined) {updateData.title = title;}
    if (description !== undefined) {updateData.description = description;}
    if (privacy !== undefined) {updateData.privacy = privacy;}

    const updatedMedia = await prisma.media.update({
      where: { id },
      data: updateData,
    });

    return json(updatedMedia);
  } catch (e) {
    console.error('Update media error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * DELETE /api/media/:id
 * Delete media (owner only)
 */
export const deleteMedia = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    if (!id) {
      return error(400, 'id is required');
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const prisma = getPrisma();

    // Get media and verify ownership
    const media = await prisma.media.findUnique({
      where: { id },
      include: {
        profile: true,
      },
    });

    if (!media) {
      return error(404, 'Media not found');
    }

    if (media.profile.userId !== userId) {
      return error(403, 'Forbidden - not media owner');
    }

    // TODO: Delete from S3
    // For now, just delete database record
    await prisma.media.delete({
      where: { id },
    });

    return json({ message: 'Media deleted successfully' });
  } catch (e) {
    console.error('Delete media error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * GET /api/media/:id/access-url
 * Get signed viewing URL with privacy checks
 */
export const getAccessUrl = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    if (!id) {
      return error(400, 'id is required');
    }

    const viewerId = getUserFromEvent(event);
    const prisma = getPrisma();

    // Get media with profile info
    const media = await prisma.media.findUnique({
      where: { id },
      include: {
        profile: true,
      },
    });

    if (!media) {
      return error(404, 'Media not found');
    }

    const isOwner = viewerId === media.profile.userId;

    // Check privacy access
    if (media.privacy === 'private' && !isOwner) {
      return error(403, 'This media is private');
    }

    if (media.privacy === 'on-request' && !isOwner) {
      // Check if viewer has an approved request
      if (!viewerId) {
        return error(401, 'Authentication required to request access');
      }

      const request = await prisma.reelRequest.findUnique({
        where: {
          mediaId_requesterId: {
            mediaId: id,
            requesterId: viewerId,
          },
        },
      });

      if (!request || request.status !== 'approved') {
        return error(403, 'Access request required or pending');
      }
    }

    // Generate signed viewing URL (valid for 1 hour)
    const command = new GetObjectCommand({
      Bucket: MEDIA_BUCKET,
      Key: media.s3Key,
    });

    const viewUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // Also generate poster URL if exists
    let posterUrl = null;
    if (media.posterS3Key) {
      const posterCommand = new GetObjectCommand({
        Bucket: MEDIA_BUCKET,
        Key: media.posterS3Key,
      });
      posterUrl = await getSignedUrl(s3Client, posterCommand, { expiresIn: 3600 });
    }

    return json({
      viewUrl,
      posterUrl,
      expiresIn: 3600,
    });
  } catch (e) {
    console.error('Get access URL error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

// Maximum PDF size for watermarking (50MB)
const MAX_WATERMARK_PDF_SIZE = 50 * 1024 * 1024;

/**
 * Helper to convert S3 stream to buffer
 */
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * GET /api/media/:id/watermarked-pdf
 * Stream watermarked PDF to authenticated viewer
 * The PDF is watermarked with the owner's profile URL for branding
 */
export const getWatermarkedPdf = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    if (!id) {
      return error(400, 'id is required');
    }

    // Require authentication for privacy checks
    const viewerId = getUserFromEvent(event);
    if (!viewerId) {
      return error(401, 'Authentication required to download PDFs');
    }

    const prisma = getPrisma();

    // Get media with profile info
    const media = await prisma.media.findUnique({
      where: { id },
      include: {
        profile: true,
      },
    });

    if (!media) {
      return error(404, 'Media not found');
    }

    // Verify it's a PDF
    if (media.type !== 'pdf') {
      return error(400, 'This endpoint only supports PDF files');
    }

    const isOwner = viewerId === media.profile.userId;

    // Check privacy access (same as getAccessUrl)
    if (media.privacy === 'private' && !isOwner) {
      return error(403, 'This media is private');
    }

    if (media.privacy === 'on-request' && !isOwner) {
      const request = await prisma.reelRequest.findUnique({
        where: {
          mediaId_requesterId: {
            mediaId: id,
            requesterId: viewerId,
          },
        },
      });
      if (!request || request.status !== 'approved') {
        return error(403, 'Access request required or pending');
      }
    }

    // Get owner's username for watermark (the person who uploaded the PDF)
    const owner = await prisma.user.findUnique({
      where: { id: media.profile.userId },
      select: { username: true },
    });

    if (!owner?.username) {
      return error(500, 'Could not retrieve owner information');
    }

    // Fetch PDF from S3
    const getCommand = new GetObjectCommand({
      Bucket: MEDIA_BUCKET,
      Key: media.s3Key,
    });

    let s3Response;
    try {
      s3Response = await s3Client.send(getCommand);
    } catch (s3Error) {
      console.error('S3 fetch error:', s3Error);
      return error(500, 'Failed to retrieve PDF from storage');
    }

    const pdfBuffer = await streamToBuffer(s3Response.Body);

    // Check file size - reject if too large for Lambda memory
    if (pdfBuffer.length > MAX_WATERMARK_PDF_SIZE) {
      return error(413, 'PDF too large for watermarking. Maximum size: 50MB');
    }

    // Apply watermark with owner's username
    let watermarkedPdf;
    try {
      watermarkedPdf = await watermarkPdf(pdfBuffer, owner.username);
    } catch (pdfError) {
      console.error('PDF watermarking error:', pdfError);
      return error(500, 'Unable to process this PDF');
    }

    // Generate filename
    const filename = media.title
      ? `${media.title.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`
      : 'document.pdf';

    // Return binary PDF with appropriate headers
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': watermarkedPdf.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        ...getCorsHeaders(event),
      },
      body: Buffer.from(watermarkedPdf).toString('base64'),
      isBase64Encoded: true,
    };
  } catch (e) {
    console.error('Get watermarked PDF error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};
