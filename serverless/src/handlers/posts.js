import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';

export const createPost = async (event) => {
  try {
    const { content, media, authorId, mediaId, tags, visibility } = JSON.parse(event.body || '{}');
    
    if (!content || !authorId) {
      return error('content and authorId are required', 400);
    }

    // Validate visibility if provided
    const validVisibilities = ['PUBLIC', 'FOLLOWERS'];
    const postVisibility = visibility || 'PUBLIC';
    if (!validVisibilities.includes(postVisibility)) {
      return error('visibility must be either PUBLIC or FOLLOWERS', 400);
    }

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
        return error('Media not found', 404);
      }

      // Verify media belongs to the author (via profile ownership)
      if (mediaRecord.profile.userId !== authorId) {
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
        tags: tags || [],
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
    
    return json(responsePost, 201);
  } catch (e) {
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
