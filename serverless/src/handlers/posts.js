import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserIdFromEvent } from '../utils/tokenManager.js';
import { createNotification } from './notifications.js';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Structured log helper for observability
 * Limits data size in production to prevent excessive logging
 * @param {string} event - Event name
 * @param {object} data - Log data
 */
const log = (event, data) => {
  // In production, sanitize sensitive data and limit stack trace exposure
  const sanitizedData = { ...data };
  if (isProduction && sanitizedData.stack) {
    // Only include first line of stack in production
    sanitizedData.stack = sanitizedData.stack.split('\n')[0];
  }
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    ...sanitizedData
  }));
};

/**
 * POST /posts
 * Create a new post for the authenticated user
 * 
 * Visibility semantics (Instagram + LinkedIn hybrid):
 * - PUBLIC: Post visible to everyone (appears in Explore, followers' feeds, author's profile)
 * - FOLLOWERS: Post visible only to followers + on author's own profile (not in Explore)
 * 
 * Post distribution:
 * - Author's profile posts tab: shows all posts (PUBLIC and FOLLOWERS)
 * - Followers' dashboard feeds: shows posts based on visibility (PUBLIC and FOLLOWERS)
 * - Explore feed: shows only PUBLIC posts
 * 
 * @param {Object} body - { content, authorId, visibility?, mediaId?, tags?, audioUrl?, price? }
 * @returns {Object} Created post with author details
 */
export const createPost = async (event) => {
  const route = 'POST /posts';
  
  try {
    // Check authentication first
    const authUserId = getUserIdFromEvent(event);
    if (!authUserId) {
      log('auth_failure', { route, reason: 'missing_or_invalid_token' });
      return error(401, 'Unauthorized - valid access token required');
    }
    
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (parseError) {
      log('parse_error', { route, userId: authUserId, error: parseError.message });
      return error(400, 'Invalid JSON in request body');
    }
    
    const { 
      content, 
      media, 
      authorId, 
      mediaId, 
      tags, 
      visibility, 
      audioUrl, 
      price,
      thumbnailUrl,
      requiresAccess,
      allowDownload,
      isFree
    } = body;
    
    // Log incoming request (payload size for observability)
    log('create_post_request', { 
      route, 
      userId: authUserId,
      payloadSize: event.body?.length || 0,
      hasMediaId: !!mediaId,
      tagCount: Array.isArray(tags) ? tags.length : 0,
      visibility: visibility || 'PUBLIC'
    });
    
    if (!content || !authorId) {
      log('validation_error', { route, userId: authUserId, reason: 'missing_required_fields' });
      return error(400, 'content and authorId are required');
    }
    
    // Verify the authenticated user matches the authorId
    if (authUserId !== authorId) {
      log('auth_mismatch', { route, userId: authUserId, authorId });
      return error(403, 'Forbidden - you can only create posts for yourself');
    }

    // Validate visibility if provided
    const validVisibilities = ['PUBLIC', 'FOLLOWERS_ONLY'];
    const postVisibility = visibility || 'PUBLIC';
    if (!validVisibilities.includes(postVisibility)) {
      log('validation_error', { route, userId: authUserId, reason: 'invalid_visibility', value: visibility });
      return error(400, 'visibility must be either PUBLIC or FOLLOWERS_ONLY');
    }
    
    // Validate tags is an array if provided
    const safeTags = Array.isArray(tags) ? tags : [];

    const prisma = getPrisma();

    // Handle degraded mode (database unavailable)
    if (!prisma) {
      log('prisma_unavailable', { route, userId: authUserId, reason: 'degraded_mode' });
      return error(503, 'Database unavailable');
    }

    // If mediaId is provided, validate it exists and belongs to the user
    let mediaAttachment = null;
    if (mediaId) {
      const mediaRecord = await prisma.media.findUnique({
        where: { id: mediaId },
        include: {
          profile: true,
        },
      });

      if (!mediaRecord) {
        log('media_not_found', { route, userId: authUserId, mediaId });
        return error(404, 'Media not found');
      }

      // Guard against orphaned media entries (profile may have been deleted)
      if (!mediaRecord.profile) {
        log('media_orphaned', { route, userId: authUserId, mediaId, reason: 'no_profile' });
        return error(404, 'Media profile not found');
      }

      // Verify media belongs to the author (via profile ownership)
      if (mediaRecord.profile.userId !== authorId) {
        log('media_ownership_error', { route, userId: authUserId, mediaId });
        return error(403, 'Forbidden - media does not belong to user');
      }
      
      // Store the media record (without profile) for the response
      const { profile: _profile, ...mediaWithoutProfile } = mediaRecord;
      mediaAttachment = mediaWithoutProfile;
    }

    // Parse and validate price
    let postPrice = 0;
    if (price !== undefined && price !== null && price !== '') {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice)) {
        log('validation_error', { route, userId: authUserId, reason: 'invalid_price', value: price });
        return error(400, 'Price must be a valid number');
      }
      if (parsedPrice < 0) {
        log('validation_error', { route, userId: authUserId, reason: 'negative_price', value: price });
        return error(400, 'Price cannot be negative');
      }
      postPrice = parsedPrice;
    }

    // Determine isFree based on price if not explicitly set
    const postIsFree = isFree !== undefined ? isFree : (!postPrice || postPrice === 0);
    
    const post = await prisma.post.create({
      data: { 
        content, 
        media: media || [], 
        tags: safeTags,
        authorId,
        mediaId: mediaId || null,
        visibility: postVisibility,
        // audioUrl removed - not in Post schema
        price: (postPrice && postPrice > 0) ? postPrice : null,
        isFree: postIsFree,
        thumbnailUrl: thumbnailUrl || null,
        requiresAccess: requiresAccess || false,
        allowDownload: allowDownload || false,
      },
      include: { 
        author: { 
          select: { id: true, username: true, displayName: true, avatar: true } 
        } 
      },
    });
    
    // Include media attachment in response if present
    const responsePost = mediaAttachment ? { ...post, mediaAttachment } : post;
    
    log('create_post_success', { route, userId: authUserId, postId: post.id });
    return json(responsePost, 201);
  } catch (e) {
    log('create_post_error', { route, error: e.message, stack: e.stack });
    console.error(e);
    
    // Return 400 for validation errors
    if (e.name === 'PrismaClientValidationError' || e.message?.includes('Unknown argument')) {
      return error(400, 'Invalid post data: ' + e.message);
    }
    
    return error(500, 'Server error: ' + e.message);
  }
};

export const listPosts = async (event) => {
  try {
    const { limit = '20', cursor, authorId } = event.queryStringParameters || {};
    
    const prisma = getPrisma();

    // Handle degraded mode (database unavailable)
    if (!prisma) {
      console.warn('[listPosts] Prisma unavailable (degraded mode), returning empty array');
      return json([]);
    }

    // Build where clause
    const where = {};
    if (authorId) {
      where.authorId = authorId;
    }

    // Get authenticated user ID for like status
    const authUserId = getUserIdFromEvent(event);

    const posts = await prisma.post.findMany({
      where,
      take: parseInt(limit),
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatar: true }
        },
        _count: {
          select: { comments: true }
        }
      },
    });

    // Collect all mediaIds that need to be fetched
    const mediaIds = posts
      .filter(post => post.mediaId)
      .map(post => post.mediaId);

    // Fetch all media records in a single query
    let mediaMap = {};
    if (mediaIds.length > 0) {
      const mediaRecords = await prisma.media.findMany({
        where: { id: { in: mediaIds } },
      });
      mediaMap = mediaRecords.reduce((acc, media) => {
        acc[media.id] = media;
        return acc;
      }, {});
    }

    // Get user's likes for these posts (gracefully handle if PostLike table doesn't exist yet)
    const postIds = posts.map(p => p.id);
    let likedPostIds = new Set();
    if (authUserId && postIds.length > 0) {
      try {
        const userLikes = await prisma.postLike.findMany({
          where: {
            userId: authUserId,
            postId: { in: postIds }
          },
          select: { postId: true }
        });
        likedPostIds = new Set(userLikes.map(l => l.postId));
      } catch (e) {
        // PostLike table may not exist yet - continue without like data
        console.warn('PostLike query failed (table may not exist):', e.message);
      }
    }

    // Get like counts for posts (gracefully handle if PostLike table doesn't exist)
    let likeCounts = {};
    try {
      const counts = await prisma.postLike.groupBy({
        by: ['postId'],
        where: { postId: { in: postIds } },
        _count: { postId: true }
      });
      likeCounts = counts.reduce((acc, c) => {
        acc[c.postId] = c._count.postId;
        return acc;
      }, {});
    } catch (e) {
      console.warn('PostLike count failed (table may not exist):', e.message);
    }

    // Attach media, like status, and counts to posts
    const postsWithMedia = posts.map(post => {
      const enrichedPost = {
        ...post,
        isLiked: likedPostIds.has(post.id),
        likes: likeCounts[post.id] || 0,
        comments: post._count?.comments || 0
      };
      if (post.mediaId && mediaMap[post.mediaId]) {
        enrichedPost.mediaAttachment = mediaMap[post.mediaId];
      }
      return enrichedPost;
    });

    return json(postsWithMedia);
  } catch (e) {
    console.error(e);
    return error(500, 'Server error: ' + e.message);
  }
};

export const getPost = async (event) => {
  const route = 'GET /posts/{id}';
  
  try {
    const id = event.pathParameters?.id;
    
    if (!id) {
      return error(400, 'id is required');
    }

    const authUserId = getUserIdFromEvent(event);
    
    const prisma = getPrisma();

    // Handle degraded mode (database unavailable)
    if (!prisma) {
      console.error('[getPost] Prisma unavailable (degraded mode)');
      return error(503, 'Database unavailable');
    }

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatar: true }
        },
        _count: {
          select: { comments: true }
        }
      },
    });

    if (!post) {
      return error(404, 'Post not found');
    }
    
    // Fetch media attachment if present
    let responsePost = post;
    if (post.mediaId) {
      const mediaRecord = await prisma.media.findUnique({
        where: { id: post.mediaId },
      });
      if (mediaRecord) {
        responsePost = { ...post, mediaAttachment: mediaRecord };
      }
    }
    
    // Check if user has access to the post content
    const isOwner = authUserId === post.authorId;
    let hasAccess = isOwner; // Owner always has access
    let accessStatus = 'granted';
    let pendingRequest = null;
    
    if (!isOwner && post.requiresAccess) {
      // Check if user has been granted access
      if (authUserId) {
        const grant = await prisma.accessGrant.findUnique({
          where: {
            postId_userId: {
              postId: id,
              userId: authUserId
            }
          }
        });
        
        if (grant) {
          // Check if grant has expired
          if (!grant.expiresAt || grant.expiresAt > new Date()) {
            hasAccess = true;
          } else {
            accessStatus = 'expired';
          }
        } else {
          // Check if there's a pending request
          const request = await prisma.accessRequest.findUnique({
            where: {
              postId_requesterId: {
                postId: id,
                requesterId: authUserId
              }
            }
          });
          
          if (request) {
            pendingRequest = {
              id: request.id,
              status: request.status,
              createdAt: request.createdAt
            };
            
            if (request.status === 'PENDING') {
              accessStatus = 'pending';
            } else if (request.status === 'DENIED') {
              accessStatus = 'denied';
            }
          } else {
            accessStatus = 'not_requested';
          }
        }
      } else {
        accessStatus = 'not_authenticated';
      }
    }
    
    // Check if current user has liked the post (gracefully handle if PostLike table doesn't exist)
    let isLiked = false;
    if (authUserId) {
      try {
        const existingLike = await prisma.postLike.findUnique({
          where: {
            postId_userId: {
              postId: id,
              userId: authUserId
            }
          }
        });
        isLiked = !!existingLike;
      } catch (e) {
        // PostLike table may not exist yet
        console.warn('PostLike query failed (table may not exist):', e.message);
      }
    }

    // Get like count (gracefully handle if PostLike table doesn't exist)
    let likesCount = 0;
    try {
      likesCount = await prisma.postLike.count({
        where: { postId: id }
      });
    } catch (e) {
      console.warn('PostLike count failed (table may not exist):', e.message);
    }

    // Add access information and counts to response
    responsePost = {
      ...responsePost,
      hasAccess,
      accessStatus,
      pendingRequest,
      isLiked,
      likesCount,
      commentsCount: post._count?.comments || 0
    };

    log('get_post_success', { route, postId: id, userId: authUserId, hasAccess, accessStatus });
    return json(responsePost);
  } catch (e) {
    log('get_post_error', { route, error: e.message, stack: e.stack });
    console.error(e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * Get presigned URL for audio file upload
 * POST /posts/audio-upload-url
 */
export const getAudioUploadUrl = async (event) => {
  const route = 'POST /posts/audio-upload-url';
  
  try {
    const authUserId = getUserIdFromEvent(event);
    if (!authUserId) {
      log('auth_failure', { route, reason: 'missing_or_invalid_token' });
      return error(401, 'Unauthorized - valid access token required');
    }
    
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (parseError) {
      log('parse_error', { route, userId: authUserId, error: parseError.message });
      return error(400, 'Invalid JSON in request body');
    }
    
    const { filename, contentType } = body;
    
    if (!filename) {
      return error(400, 'filename is required');
    }
    
    // Validate content type
    const validAudioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a'];
    const validContentType = contentType && validAudioTypes.includes(contentType) ? contentType : 'audio/mpeg';
    
    // Dynamic import for AWS SDK (Lambda provides this)
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    
    const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-west-2' });
    const bucket = process.env.S3_BUCKET || process.env.MEDIA_BUCKET;
    
    if (!bucket) {
      log('config_error', { route, reason: 'missing_s3_bucket' });
      return error(500, 'Server configuration error');
    }
    
    // Generate unique S3 key for audio file
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `audio/${authUserId}/${timestamp}-${sanitizedFilename}`;
    
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: validContentType,
    });
    
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    
    // Construct the public URL for the audio file
    const audioUrl = `https://${bucket}.s3.${process.env.AWS_REGION || 'us-west-2'}.amazonaws.com/${key}`;
    
    log('audio_upload_url_generated', { route, userId: authUserId, key });
    
    return json({ uploadUrl, audioKey: key, audioUrl });
  } catch (e) {
    log('audio_upload_url_error', { route, error: e.message, stack: e.stack });
    console.error(e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * Request access to a paid post
 * POST /posts/{id}/request
 */
export const requestPostAccess = async (event) => {
  const route = 'POST /posts/{id}/request';
  
  try {
    const authUserId = getUserIdFromEvent(event);
    if (!authUserId) {
      log('auth_failure', { route, reason: 'missing_or_invalid_token' });
      return error(401, 'Unauthorized - valid access token required');
    }
    
    const postId = event.pathParameters?.id;
    if (!postId) {
      return error(400, 'Post ID is required');
    }
    
    let body = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch (parseError) {
      // Message is optional, so empty body is OK
    }
    
    const { message } = body;
    
    const prisma = getPrisma();
    
    if (!prisma) {
      log('prisma_unavailable', { route, userId: authUserId, reason: 'degraded_mode' });
      return error(503, 'Database unavailable');
    }
    
    // Find the post
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { 
        id: true, 
        authorId: true, 
        price: true, 
        isFree: true,
        requiresAccess: true
        // Note: content excluded for security - users without access shouldn't see it
      },
      include: {
        author: {
          select: { id: true, email: true, username: true, displayName: true }
        }
      }
    });
    
    if (!post) {
      return error(404, 'Post not found');
    }
    
    // Can't request access to your own post
    if (post.authorId === authUserId) {
      return error(400, 'You cannot request access to your own post');
    }
    
    // Check if access request already exists
    const existingRequest = await prisma.accessRequest.findUnique({
      where: {
        postId_requesterId: {
          postId,
          requesterId: authUserId
        }
      }
    });
    
    if (existingRequest) {
      if (existingRequest.status === 'PENDING') {
        return error(400, 'You already have a pending access request for this post');
      } else if (existingRequest.status === 'APPROVED') {
        return error(400, 'You already have access to this post');
      } else if (existingRequest.status === 'DENIED') {
        // Allow re-requesting after denial
        await prisma.accessRequest.update({
          where: { id: existingRequest.id },
          data: {
            status: 'PENDING',
            message,
            updatedAt: new Date()
          }
        });
        
        log('post_access_re_requested', { 
          route, 
          userId: authUserId, 
          postId, 
          postAuthorId: post.authorId,
          price: post.price 
        });
        
        return json({ 
          success: true, 
          message: 'Access request re-submitted to post owner',
          postId,
          price: post.price,
          isFree: post.isFree
        });
      }
    }
    
    // Create new access request
    const accessRequest = await prisma.accessRequest.create({
      data: {
        postId,
        requesterId: authUserId,
        message: message || null,
        status: 'PENDING'
      }
    });
    
    // TODO: Send email notification to post author
    // This would integrate with your email service (e.g., SES, SendGrid)
    // Example:
    // await sendEmail({
    //   to: post.author.email,
    //   subject: `Access request for your post`,
    //   body: `${authUser.displayName} has requested access to your post.`
    // });
    
    log('post_access_requested', { 
      route, 
      userId: authUserId, 
      postId, 
      postAuthorId: post.authorId,
      price: post.price,
      requestId: accessRequest.id
    });
    
    return json({ 
      success: true, 
      message: 'Access request sent to post owner',
      postId,
      price: post.price,
      isFree: post.isFree,
      requestId: accessRequest.id
    });
  } catch (e) {
    log('post_access_request_error', { route, error: e.message, stack: e.stack });
    console.error(e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * DELETE /posts/{id}
 * Delete a post (owner only)
 * Also deletes any related access requests
 * 
 * @param {Object} event - Lambda event with pathParameters.id
 * @returns {Object} Success response or error
 */
export const deletePost = async (event) => {
  const route = 'DELETE /posts/{id}';
  
  try {
    const authUserId = getUserIdFromEvent(event);
    if (!authUserId) {
      log('auth_failure', { route, reason: 'missing_or_invalid_token' });
      return error(401, 'Unauthorized - valid access token required');
    }
    
    const postId = event.pathParameters?.id;
    if (!postId) {
      log('validation_error', { route, userId: authUserId, reason: 'missing_post_id' });
      return error(400, 'Post ID is required');
    }
    
    log('delete_post_request', { route, userId: authUserId, postId });
    
    const prisma = getPrisma();
    
    if (!prisma) {
      log('prisma_unavailable', { route, userId: authUserId, reason: 'degraded_mode' });
      return error(503, 'Database unavailable');
    }
    
    // Find the post and verify ownership
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true }
    });
    
    if (!post) {
      log('post_not_found', { route, userId: authUserId, postId });
      return error(404, 'Post not found');
    }
    
    // Verify the authenticated user is the post owner
    if (post.authorId !== authUserId) {
      log('auth_forbidden', { route, userId: authUserId, postId, ownerId: post.authorId });
      return error(403, 'Forbidden - you can only delete your own posts');
    }
    
    // Note: Since there's no PostAccessRequest model in the schema yet,
    // we'll just delete the post. When PostAccessRequest is added later,
    // we should add: await prisma.postAccessRequest.deleteMany({ where: { postId } });
    
    // Delete the post (cascade will handle related data)
    await prisma.post.delete({
      where: { id: postId }
    });
    
    log('post_deleted', { route, userId: authUserId, postId });
    
    return json({ success: true, message: 'Post deleted successfully' }, 200);
  } catch (e) {
    log('delete_post_error', { route, error: e.message, stack: e.stack });
    console.error(e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * Grant or deny access to a post
 * POST /posts/{id}/grant
 * Body: { requestId, action: 'approve' | 'deny' }
 */
export const grantAccess = async (event) => {
  const route = 'POST /posts/{id}/grant';
  
  try {
    const authUserId = getUserIdFromEvent(event);
    if (!authUserId) {
      log('auth_failure', { route, reason: 'missing_or_invalid_token' });
      return error(401, 'Unauthorized - valid access token required');
    }
    
    const postId = event.pathParameters?.id;
    if (!postId) {
      return error(400, 'Post ID is required');
    }
    
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (parseError) {
      log('parse_error', { route, userId: authUserId, error: parseError.message });
      return error(400, 'Invalid JSON in request body');
    }
    
    const { requestId, action } = body;
    
    if (!requestId || !action) {
      return error(400, 'requestId and action are required');
    }
    
    if (!['approve', 'deny'].includes(action)) {
      return error(400, 'action must be either "approve" or "deny"');
    }
    
    const prisma = getPrisma();
    
    if (!prisma) {
      log('prisma_unavailable', { route, userId: authUserId, reason: 'degraded_mode' });
      return error(503, 'Database unavailable');
    }
    
    // Find the post and verify ownership
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true }
    });
    
    if (!post) {
      return error(404, 'Post not found');
    }
    
    if (post.authorId !== authUserId) {
      return error(403, 'Forbidden - only the post owner can grant or deny access');
    }
    
    // Find the access request
    const accessRequest = await prisma.accessRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: {
          select: { id: true, username: true, email: true, displayName: true }
        }
      }
    });
    
    if (!accessRequest) {
      return error(404, 'Access request not found');
    }
    
    if (accessRequest.postId !== postId) {
      return error(400, 'Access request does not belong to this post');
    }
    
    if (accessRequest.status !== 'PENDING') {
      return error(400, `Access request has already been ${accessRequest.status.toLowerCase()}`);
    }
    
    // Update the request status
    const newStatus = action === 'approve' ? 'APPROVED' : 'DENIED';
    
    await prisma.accessRequest.update({
      where: { id: requestId },
      data: { status: newStatus }
    });
    
    // If approved, create an access grant
    if (action === 'approve') {
      await prisma.accessGrant.create({
        data: {
          postId,
          userId: accessRequest.requesterId,
          grantedAt: new Date()
        }
      });
    }
    
    log('access_grant_processed', { 
      route, 
      userId: authUserId, 
      postId,
      requestId,
      action,
      requesterId: accessRequest.requesterId
    });
    
    return json({ 
      success: true, 
      message: `Access ${action === 'approve' ? 'granted' : 'denied'}`,
      requestId,
      status: newStatus
    });
  } catch (e) {
    log('grant_access_error', { route, error: e.message, stack: e.stack });
    console.error(e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * List access requests for user's posts
 * GET /users/{id}/requests
 */
export const getUserRequests = async (event) => {
  const route = 'GET /users/{id}/requests';
  
  try {
    const authUserId = getUserIdFromEvent(event);
    if (!authUserId) {
      log('auth_failure', { route, reason: 'missing_or_invalid_token' });
      return error(401, 'Unauthorized - valid access token required');
    }
    
    const userId = event.pathParameters?.id;
    if (!userId) {
      return error(400, 'User ID is required');
    }
    
    // Can only view your own requests
    if (userId !== authUserId) {
      return error(403, 'Forbidden - you can only view your own requests');
    }
    
    const prisma = getPrisma();
    
    if (!prisma) {
      log('prisma_unavailable', { route, userId: authUserId, reason: 'degraded_mode' });
      return error(503, 'Database unavailable');
    }
    
    const { status = 'PENDING' } = event.queryStringParameters || {};
    
    // Find all posts owned by the user
    const posts = await prisma.post.findMany({
      where: { authorId: userId },
      select: { id: true }
    });
    
    const postIds = posts.map(p => p.id);
    
    // Find access requests for these posts
    const requests = await prisma.accessRequest.findMany({
      where: {
        postId: { in: postIds },
        ...(status && { status: status.toUpperCase() })
      },
      include: {
        post: {
          select: {
            id: true,
            content: true,
            price: true,
            isFree: true,
            createdAt: true
          }
        },
        requester: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    log('user_requests_fetched', { route, userId, count: requests.length, status });
    
    return json({ requests });
  } catch (e) {
    log('get_user_requests_error', { route, error: e.message, stack: e.stack });
    console.error(e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * Process payment for post access (stub)
 * POST /posts/{id}/pay
 */
export const payForAccess = async (event) => {
  const route = 'POST /posts/{id}/pay';
  
  try {
    const authUserId = getUserIdFromEvent(event);
    if (!authUserId) {
      log('auth_failure', { route, reason: 'missing_or_invalid_token' });
      return error(401, 'Unauthorized - valid access token required');
    }
    
    const postId = event.pathParameters?.id;
    if (!postId) {
      return error(400, 'Post ID is required');
    }
    
    const prisma = getPrisma();
    
    if (!prisma) {
      log('prisma_unavailable', { route, userId: authUserId, reason: 'degraded_mode' });
      return error(503, 'Database unavailable');
    }
    
    // Find the post
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { 
        id: true, 
        authorId: true, 
        price: true, 
        isFree: true 
      }
    });
    
    if (!post) {
      return error(404, 'Post not found');
    }
    
    if (post.isFree) {
      return error(400, 'This post is free and does not require payment');
    }
    
    if (!post.price || post.price <= 0) {
      return error(400, 'This post does not have a valid price');
    }
    
    // TODO: Integrate with payment processor (Stripe, etc.)
    // For now, this is a stub that simulates successful payment
    
    // Automatically grant access after payment
    const existingGrant = await prisma.accessGrant.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: authUserId
        }
      }
    });
    
    if (existingGrant) {
      return error(400, 'You already have access to this post');
    }
    
    await prisma.accessGrant.create({
      data: {
        postId,
        userId: authUserId,
        grantedAt: new Date()
      }
    });
    
    log('payment_processed', { 
      route, 
      userId: authUserId, 
      postId,
      price: post.price
    });
    
    return json({ 
      success: true, 
      message: 'Payment processed successfully',
      postId,
      price: post.price
    });
  } catch (e) {
    log('pay_for_access_error', { route, error: e.message, stack: e.stack });
    console.error(e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * POST /posts/:id/like
 * Like a post
 */
export const likePost = async (event) => {
  const route = 'POST /posts/{id}/like';

  try {
    const userId = getUserIdFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const postId = event.pathParameters?.id;
    if (!postId) {
      return error(400, 'Post ID is required');
    }

    const prisma = getPrisma();

    if (!prisma) {
      return error(503, 'Database unavailable');
    }

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, content: true }
    });

    if (!post) {
      return error(404, 'Post not found');
    }

    // Check if already liked
    const existingLike = await prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId
        }
      }
    });

    if (existingLike) {
      return error(400, 'Post already liked');
    }

    // Create like
    await prisma.postLike.create({
      data: {
        postId,
        userId
      }
    });

    // Create notification for post author (only if liker is not the author)
    if (post.authorId !== userId) {
      try {
        await createNotification(prisma, {
          type: 'LIKE',
          message: 'liked your post',
          recipientId: post.authorId,
          triggererId: userId,
          metadata: { postId, postPreview: post.content?.substring(0, 100) }
        });
      } catch (notifErr) {
        console.error('Failed to create like notification:', notifErr);
      }
    }

    // Get updated like count
    const likeCount = await prisma.postLike.count({
      where: { postId }
    });

    log('like_post_success', { route, postId, userId });
    return json({ success: true, likesCount: likeCount });
  } catch (e) {
    log('like_post_error', { route, error: e.message, stack: e.stack });
    console.error(e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * DELETE /posts/:id/like
 * Unlike a post
 */
export const unlikePost = async (event) => {
  const route = 'DELETE /posts/{id}/like';

  try {
    const userId = getUserIdFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const postId = event.pathParameters?.id;
    if (!postId) {
      return error(400, 'Post ID is required');
    }

    const prisma = getPrisma();

    if (!prisma) {
      return error(503, 'Database unavailable');
    }

    // Check if like exists
    const existingLike = await prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId
        }
      }
    });

    if (!existingLike) {
      return error(404, 'Like not found');
    }

    // Delete like
    await prisma.postLike.delete({
      where: {
        postId_userId: {
          postId,
          userId
        }
      }
    });

    // Get updated like count
    const likeCount = await prisma.postLike.count({
      where: { postId }
    });

    log('unlike_post_success', { route, postId, userId });
    return json({ success: true, likesCount: likeCount });
  } catch (e) {
    log('unlike_post_error', { route, error: e.message, stack: e.stack });
    console.error(e);
    return error(500, 'Server error: ' + e.message);
  }
};
