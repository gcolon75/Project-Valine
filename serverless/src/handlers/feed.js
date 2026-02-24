import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserFromEvent } from './auth.js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-west-2' });
const MEDIA_BUCKET = process.env.MEDIA_BUCKET || process.env.S3_BUCKET || 'valine-media-uploads';

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
          select: { comments: true }
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

      // Generate signed URLs for poster images
      for (const media of mediaRecords) {
        let posterUrl = null;
        if (media.posterS3Key) {
          try {
            const command = new GetObjectCommand({
              Bucket: MEDIA_BUCKET,
              Key: media.posterS3Key,
            });
            posterUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
          } catch (e) {
            console.warn('Failed to generate poster URL:', e.message);
          }
        }
        mediaMap[media.id] = { ...media, posterUrl };
      }
    }
    
    // Get user's likes for these posts (gracefully handle if PostLike table doesn't exist yet)
    const postIds = posts.map(p => p.id);
    let likedPostIds = new Set();
    try {
      const userLikes = await prisma.postLike.findMany({
        where: {
          userId,
          postId: { in: postIds }
        },
        select: { postId: true }
      });
      likedPostIds = new Set(userLikes.map(l => l.postId));
    } catch (e) {
      // PostLike table may not exist yet - continue without like data
      console.warn('PostLike query failed (table may not exist):', e.message);
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
