import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserFromEvent } from './auth.js';

/**
 * GET /feed
 * Get aggregated posts from followed users for the authenticated user's feed
 */
export const getFeed = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error('Unauthorized', 401);
    }

    const { limit = '20', cursor } = event.queryStringParameters || {};
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const prisma = getPrisma();
    
    // Get all users that the current user follows (accepted connection requests where current user is sender)
    const following = await prisma.connectionRequest.findMany({
      where: {
        senderId: userId,
        status: 'accepted'
      },
      select: { receiverId: true }
    });
    
    const followedUserIds = following.map(f => f.receiverId);
    
    // Include the user's own posts in their feed
    const authorIds = [userId, ...followedUserIds];
    
    // Fetch posts from followed users and self
    const posts = await prisma.post.findMany({
      where: {
        authorId: { in: authorIds },
        visibility: 'PUBLIC'  // Only show public posts in feed
      },
      take: parsedLimit,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatar: true }
        }
      }
    });
    
    // Collect all mediaIds that need to be fetched
    const mediaIds = posts
      .filter(post => post.mediaId)
      .map(post => post.mediaId);
    
    // Fetch all media records in a single query
    let mediaMap = {};
    if (mediaIds.length > 0) {
      const mediaRecords = await prisma.media.findMany({
        where: { id: { in: mediaIds } }
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
    
    return json({
      posts: postsWithMedia,
      nextCursor: posts.length > 0 ? posts[posts.length - 1].id : null,
      followingCount: followedUserIds.length
    });
  } catch (e) {
    console.error('getFeed error:', e);
    return error('Server error: ' + e.message, 500);
  }
};
