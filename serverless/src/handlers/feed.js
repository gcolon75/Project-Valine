import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserFromEvent } from './auth.js';

/**
 * GET /feed
 * Get aggregated posts from followed users for the authenticated user's feed
 * 
 * Visibility semantics (Instagram + LinkedIn hybrid):
 * - PUBLIC posts: visible to everyone (followers, non-followers, explore)
 * - FOLLOWERS_ONLY posts: visible only to followers + author's own profile
 * 
 * Feed composition for current user:
 * - All posts from self (PUBLIC and FOLLOWERS_ONLY visibility)
 * - PUBLIC and FOLLOWERS_ONLY posts from users that current user follows
 * 
 * Note: "following" means current user sent an accepted connection request (senderId = current user)
 * 
 * Returns:
 * - PUBLIC posts from followed users
 * - FOLLOWERS_ONLY posts from followed users (current user is a follower)
 * - All posts from self (PUBLIC and FOLLOWERS_ONLY)
 */
export const getFeed = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
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
    
    // Fetch posts with visibility rules:
    // - Self's posts: any visibility (PUBLIC or FOLLOWERS_ONLY)
    // - Followed users' posts: PUBLIC or FOLLOWERS_ONLY
    const posts = await prisma.post.findMany({
      where: {
        OR: [
          // Self's posts with any visibility
          { authorId: userId },
          // Followed users' public posts
          {
            authorId: { in: followedUserIds },
            visibility: { in: ['PUBLIC', 'FOLLOWERS_ONLY'] }
          }
        ]
      },
      take: parsedLimit,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatar: true }
        },
        _count: {
          select: { likes: true, comments: true }
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
    
    // Get user's likes for these posts
    const postIds = posts.map(p => p.id);
    const userLikes = await prisma.like.findMany({
      where: {
        userId,
        postId: { in: postIds }
      },
      select: { postId: true }
    });
    const likedPostIds = new Set(userLikes.map(l => l.postId));

    // Attach media and like status to posts
    const postsWithMedia = posts.map(post => {
      const enrichedPost = {
        ...post,
        isLiked: likedPostIds.has(post.id),
        likes: post._count?.likes || 0,
        comments: post._count?.comments || 0
      };
      if (post.mediaId && mediaMap[post.mediaId]) {
        enrichedPost.mediaAttachment = mediaMap[post.mediaId];
      }
      return enrichedPost;
    });

    return json({
      posts: postsWithMedia,
      nextCursor: posts.length > 0 ? posts[posts.length - 1].id : null,
      followingCount: followedUserIds.length
    });
  } catch (e) {
    console.error('getFeed error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};
