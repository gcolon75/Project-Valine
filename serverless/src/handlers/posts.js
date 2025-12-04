import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserIdFromEvent } from '../utils/tokenManager.js';

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

export const createPost = async (event) => {
  const route = 'POST /posts';
  
  try {
    // Check authentication first
    const authUserId = getUserIdFromEvent(event);
    if (!authUserId) {
      log('auth_failure', { route, reason: 'missing_or_invalid_token' });
      return error('Unauthorized - valid access token required', 401);
    }
    
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (parseError) {
      log('parse_error', { route, userId: authUserId, error: parseError.message });
      return error('Invalid JSON in request body', 400);
    }
    
    const { content, media, authorId, mediaId, tags, visibility, audioUrl, price } = body;
    
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
      return error('content and authorId are required', 400);
    }
    
    // Verify the authenticated user matches the authorId
    if (authUserId !== authorId) {
      log('auth_mismatch', { route, userId: authUserId, authorId });
      return error('Forbidden - you can only create posts for yourself', 403);
    }

    // Validate visibility if provided
    const validVisibilities = ['PUBLIC', 'FOLLOWERS'];
    const postVisibility = visibility || 'PUBLIC';
    if (!validVisibilities.includes(postVisibility)) {
      log('validation_error', { route, userId: authUserId, reason: 'invalid_visibility', value: visibility });
      return error('visibility must be either PUBLIC or FOLLOWERS', 400);
    }
    
    // Validate tags is an array if provided
    const safeTags = Array.isArray(tags) ? tags : [];

    const prisma = getPrisma();

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
        return error('Media not found', 404);
      }

      // Verify media belongs to the author (via profile ownership)
      if (mediaRecord.profile.userId !== authorId) {
        log('media_ownership_error', { route, userId: authUserId, mediaId });
        return error('Forbidden - media does not belong to user', 403);
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
        return error('Price must be a valid number', 400);
      }
      if (parsedPrice < 0) {
        log('validation_error', { route, userId: authUserId, reason: 'negative_price', value: price });
        return error('Price cannot be negative', 400);
      }
      postPrice = parsedPrice;
    }

    const post = await prisma.post.create({
      data: { 
        content, 
        media: media || [], 
        tags: safeTags,
        authorId,
        mediaId: mediaId || null,
        visibility: postVisibility,
        audioUrl: audioUrl || null,
        price: postPrice,
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
    return error('Server error: ' + e.message, 500);
  }
};

export const listPosts = async (event) => {
  try {
    const { limit = '20', cursor } = event.queryStringParameters || {};
    
    const prisma = getPrisma();
    const posts = await prisma.post.findMany({
      take: parseInt(limit),
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
      include: { 
        author: { 
          select: { id: true, username: true, displayName: true, avatar: true } 
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
    
    // Attach media to posts
    const postsWithMedia = posts.map(post => {
      if (post.mediaId && mediaMap[post.mediaId]) {
        return { ...post, mediaAttachment: mediaMap[post.mediaId] };
      }
      return post;
    });
    
    return json(postsWithMedia);
  } catch (e) {
    console.error(e);
    return error('Server error: ' + e.message, 500);
  }
};

export const getPost = async (event) => {
  try {
    const id = event.pathParameters?.id;
    
    if (!id) {
      return error('id is required', 400);
    }

    const prisma = getPrisma();
    const post = await prisma.post.findUnique({
      where: { id },
      include: { 
        author: { 
          select: { id: true, username: true, displayName: true, avatar: true } 
        } 
      },
    });
    
    if (!post) {
      return error('Post not found', 404);
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
    
    return json(responsePost);
  } catch (e) {
    console.error(e);
    return error('Server error: ' + e.message, 500);
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
      return error('Unauthorized - valid access token required', 401);
    }
    
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (parseError) {
      log('parse_error', { route, userId: authUserId, error: parseError.message });
      return error('Invalid JSON in request body', 400);
    }
    
    const { filename, contentType } = body;
    
    if (!filename) {
      return error('filename is required', 400);
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
      return error('Server configuration error', 500);
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
    return error('Server error: ' + e.message, 500);
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
      return error('Unauthorized - valid access token required', 401);
    }
    
    const postId = event.pathParameters?.id;
    if (!postId) {
      return error('Post ID is required', 400);
    }
    
    const prisma = getPrisma();
    
    // Find the post
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, price: true }
    });
    
    if (!post) {
      return error('Post not found', 404);
    }
    
    // Can't request access to your own post
    if (post.authorId === authUserId) {
      return error('You cannot request access to your own post', 400);
    }
    
    // For now, just log the request and return success
    // In a full implementation, this would create a request record
    log('post_access_requested', { 
      route, 
      userId: authUserId, 
      postId, 
      postAuthorId: post.authorId,
      price: post.price 
    });
    
    return json({ 
      success: true, 
      message: 'Access request sent to post owner',
      postId,
      price: post.price
    });
  } catch (e) {
    log('post_access_request_error', { route, error: e.message, stack: e.stack });
    console.error(e);
    return error('Server error: ' + e.message, 500);
  }
};
