import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserFromEvent } from './auth.js';

export const listReels = async (event) => {
  try {
    const { limit = '20', cursor } = event.queryStringParameters || {};
    const userId = getUserFromEvent(event); // Optional - for isLiked/isBookmarked

    const prisma = getPrisma();
    
    // Fetch one extra to check if there are more
    const reels = await prisma.reel.findMany({
      take: parseInt(limit) + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        },
        ...(userId && {
          likes: {
            where: { userId },
            select: { id: true }
          },
          bookmarks: {
            where: { userId },
            select: { id: true }
          }
        })
      }
    });

    const hasMore = reels.length > parseInt(limit);
    const itemsToReturn = hasMore ? reels.slice(0, -1) : reels;
    const nextCursor = hasMore ? itemsToReturn[itemsToReturn.length - 1].id : null;

    // Transform to match expected response format
    const items = itemsToReturn.map(reel => ({
      id: reel.id,
      videoUrl: reel.videoUrl,
      thumbnail: reel.thumbnail,
      caption: reel.caption,
      author: reel.author,
      likes: reel._count.likes,
      comments: reel._count.comments,
      isLiked: userId ? reel.likes.length > 0 : false,
      isBookmarked: userId ? reel.bookmarks.length > 0 : false,
      createdAt: reel.createdAt
    }));

    return json({
      items,
      nextCursor,
      hasMore
    });
  } catch (e) {
    console.error('List reels error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

export const toggleLike = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error('Unauthorized', 401);
    }

    const reelId = event.pathParameters?.id;
    if (!reelId) {
      return error('Reel ID is required', 400);
    }

    const prisma = getPrisma();

    // Check if reel exists
    const reel = await prisma.reel.findUnique({
      where: { id: reelId }
    });

    if (!reel) {
      return error('Reel not found', 404);
    }

    // Check if already liked
    const existingLike = await prisma.like.findUnique({
      where: {
        reelId_userId: {
          reelId,
          userId
        }
      }
    });

    if (existingLike) {
      // Unlike
      await prisma.like.delete({
        where: { id: existingLike.id }
      });
    } else {
      // Like
      await prisma.like.create({
        data: {
          reelId,
          userId
        }
      });
    }

    // Get updated like count
    const likesCount = await prisma.like.count({
      where: { reelId }
    });

    return json({
      success: true,
      likes: likesCount,
      isLiked: !existingLike
    });
  } catch (e) {
    console.error('Toggle like error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

export const toggleBookmark = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error('Unauthorized', 401);
    }

    const reelId = event.pathParameters?.id;
    if (!reelId) {
      return error('Reel ID is required', 400);
    }

    const prisma = getPrisma();

    // Check if reel exists
    const reel = await prisma.reel.findUnique({
      where: { id: reelId }
    });

    if (!reel) {
      return error('Reel not found', 404);
    }

    // Check if already bookmarked
    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        reelId_userId: {
          reelId,
          userId
        }
      }
    });

    if (existingBookmark) {
      // Remove bookmark
      await prisma.bookmark.delete({
        where: { id: existingBookmark.id }
      });
    } else {
      // Add bookmark
      await prisma.bookmark.create({
        data: {
          reelId,
          userId
        }
      });
    }

    return json({
      success: true,
      isBookmarked: !existingBookmark
    });
  } catch (e) {
    console.error('Toggle bookmark error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

export const getComments = async (event) => {
  try {
    const reelId = event.pathParameters?.id;
    if (!reelId) {
      return error('Reel ID is required', 400);
    }

    const { limit = '50', cursor } = event.queryStringParameters || {};

    const prisma = getPrisma();

    const comments = await prisma.comment.findMany({
      where: { reelId },
      take: parseInt(limit) + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        }
      }
    });

    const hasMore = comments.length > parseInt(limit);
    const commentsToReturn = hasMore ? comments.slice(0, -1) : comments;
    const nextCursor = hasMore ? commentsToReturn[commentsToReturn.length - 1].id : null;

    return json({
      comments: commentsToReturn,
      nextCursor,
      hasMore
    });
  } catch (e) {
    console.error('Get comments error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

export const createComment = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error('Unauthorized', 401);
    }

    const reelId = event.pathParameters?.id;
    if (!reelId) {
      return error('Reel ID is required', 400);
    }

    const { text } = JSON.parse(event.body || '{}');
    if (!text || text.trim().length === 0) {
      return error('Comment text is required', 400);
    }

    const prisma = getPrisma();

    // Check if reel exists
    const reel = await prisma.reel.findUnique({
      where: { id: reelId }
    });

    if (!reel) {
      return error('Reel not found', 404);
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        text: text.trim(),
        reelId,
        authorId: userId
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        }
      }
    });

    return json({
      comment
    }, 201);
  } catch (e) {
    console.error('Create comment error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

export const createReel = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error('Unauthorized', 401);
    }

    const { videoUrl, thumbnail, caption } = JSON.parse(event.body || '{}');
    if (!videoUrl) {
      return error('videoUrl is required', 400);
    }

    const prisma = getPrisma();

    const reel = await prisma.reel.create({
      data: {
        videoUrl,
        thumbnail,
        caption,
        authorId: userId
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    });

    return json({
      id: reel.id,
      videoUrl: reel.videoUrl,
      thumbnail: reel.thumbnail,
      caption: reel.caption,
      author: reel.author,
      likes: reel._count.likes,
      comments: reel._count.comments,
      isLiked: false,
      isBookmarked: false,
      createdAt: reel.createdAt
    }, 201);
  } catch (e) {
    console.error('Create reel error:', e);
    return error('Server error: ' + e.message, 500);
  }
};
