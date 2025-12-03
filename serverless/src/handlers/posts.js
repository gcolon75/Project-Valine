import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserIdFromEvent } from '../utils/tokenManager.js';

/**
 * Structured log helper for observability
 * @param {string} event - Event name
 * @param {object} data - Log data
 */
const log = (event, data) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    ...data
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
    
    const { content, media, authorId, mediaId, tags, visibility } = body;
    
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

    const post = await prisma.post.create({
      data: { 
        content, 
        media: media || [], 
        tags: safeTags,
        authorId,
        mediaId: mediaId || null,
        visibility: postVisibility,
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
