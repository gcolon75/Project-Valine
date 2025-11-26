import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserFromEvent } from './auth.js';
import { requireEmailVerified } from '../utils/authMiddleware.js';
import { csrfProtection } from '../middleware/csrfMiddleware.js';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-west-2' });
const MEDIA_BUCKET = process.env.MEDIA_BUCKET || process.env.S3_BUCKET || 'valine-media-uploads';

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
    const { type, title, description, privacy } = body;

    if (!type || !['image', 'video', 'pdf'].includes(type)) {
      return error(400, 'Valid type is required (image, video, or pdf)');
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

    // Generate unique S3 key
    const mediaId = crypto.randomUUID();
    const timestamp = Date.now();
    const s3Key = `profiles/${profileId}/media/${timestamp}-${mediaId}`;

    // Create placeholder media record
    const media = await prisma.media.create({
      data: {
        profileId,
        type,
        s3Key,
        title: title || null,
        description: description || null,
        privacy: privacy || 'public',
        processedStatus: 'pending',
      },
    });

    // Generate signed upload URL (valid for 15 minutes)
    const command = new PutObjectCommand({
      Bucket: MEDIA_BUCKET,
      Key: s3Key,
      ContentType: type === 'video' ? 'video/mp4' : type === 'image' ? 'image/jpeg' : 'application/pdf',
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    return json({
      mediaId: media.id,
      uploadUrl,
      s3Key,
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
    const { mediaId, width, height, fileSize } = body;

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

    // Update media record
    const media = await prisma.media.update({
      where: { id: mediaId },
      data: {
        processedStatus: 'processing',
        width: width || null,
        height: height || null,
        fileSize: fileSize || null,
      },
    });

    // TODO: Trigger background processing (Lambda, SQS, etc.)
    // For now, we'll mark it as complete immediately
    // In production, this would queue a job for transcoding/thumbnail generation

    return json({
      media,
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
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (privacy !== undefined) updateData.privacy = privacy;

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
