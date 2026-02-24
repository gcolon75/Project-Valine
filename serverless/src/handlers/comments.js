import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserFromEvent } from './auth.js';

// XSS sanitization - strip HTML tags and dangerous content
function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';

  return text
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove javascript: URLs
    .replace(/javascript:/gi, '')
    // Remove on* event handlers
    .replace(/on\w+\s*=/gi, '')
    // Remove data: URLs (can contain scripts)
    .replace(/data:/gi, '')
    // Normalize whitespace
    .trim();
}

// Validate comment content
function validateComment(text) {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: 'Comment text is required' };
  }

  const sanitized = sanitizeText(text);

  if (sanitized.length === 0) {
    return { valid: false, error: 'Comment cannot be empty' };
  }

  if (sanitized.length > 2000) {
    return { valid: false, error: 'Comment must be 2000 characters or less' };
  }

  return { valid: true, sanitized };
}

/**
 * GET /api/posts/:postId/comments
 * List comments for a post with pagination, sorted by likes
 */
export const getPostComments = async (event) => {
  try {
    const { postId } = event.pathParameters || {};
    if (!postId) {
      return error(400, 'postId is required');
    }

    const { limit = '20', cursor, includeReplies = 'false' } = event.queryStringParameters || {};
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const showReplies = includeReplies === 'true';
    const userId = getUserFromEvent(event); // Optional - for isLiked

    const prisma = getPrisma();

    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!post) {
      return error(404, 'Post not found');
    }

    // Fetch top-level comments (no parent), sorted by like count
    const comments = await prisma.comment.findMany({
      where: {
        postId,
        parentId: null, // Only top-level comments
      },
      take: parsedLimit,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: [
        { likes: { _count: 'desc' } }, // Most liked first
        { createdAt: 'desc' }, // Then by newest
      ],
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
        _count: {
          select: { likes: true, replies: true },
        },
        ...(userId && {
          likes: {
            where: { userId },
            select: { id: true },
          },
        }),
        ...(showReplies && {
          replies: {
            take: 3, // Preview of replies
            orderBy: [
              { likes: { _count: 'desc' } },
              { createdAt: 'asc' },
            ],
            include: {
              author: {
                select: { id: true, username: true, displayName: true, avatar: true },
              },
              _count: {
                select: { likes: true, replies: true },
              },
              ...(userId && {
                likes: {
                  where: { userId },
                  select: { id: true },
                },
              }),
            },
          },
        }),
      },
    });

    // Transform to include isLiked and likeCount
    const transformedComments = comments.map(comment => ({
      ...comment,
      likeCount: comment._count?.likes || 0,
      replyCount: comment._count?.replies || 0,
      isLiked: userId ? (comment.likes?.length > 0) : false,
      likes: undefined, // Remove raw likes array
      replies: comment.replies?.map(reply => ({
        ...reply,
        likeCount: reply._count?.likes || 0,
        replyCount: reply._count?.replies || 0,
        isLiked: userId ? (reply.likes?.length > 0) : false,
        likes: undefined,
      })),
    }));

    // Get total count for pagination info
    const totalCount = await prisma.comment.count({
      where: { postId, parentId: null },
    });

    return json({
      comments: transformedComments,
      totalCount,
      nextCursor: comments.length === parsedLimit ? comments[comments.length - 1]?.id : null,
    });
  } catch (e) {
    console.error('getPostComments error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * GET /api/comments/:commentId/replies
 * Get replies to a specific comment, sorted by likes
 */
export const getCommentReplies = async (event) => {
  try {
    const { commentId } = event.pathParameters || {};
    if (!commentId) {
      return error(400, 'commentId is required');
    }

    const { limit = '20', cursor } = event.queryStringParameters || {};
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const userId = getUserFromEvent(event); // Optional - for isLiked

    const prisma = getPrisma();

    // Verify parent comment exists
    const parentComment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });

    if (!parentComment) {
      return error(404, 'Comment not found');
    }

    const replies = await prisma.comment.findMany({
      where: { parentId: commentId },
      take: parsedLimit,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: [
        { likes: { _count: 'desc' } }, // Most liked first
        { createdAt: 'asc' }, // Then by oldest (conversation order)
      ],
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
        _count: {
          select: { likes: true, replies: true },
        },
        ...(userId && {
          likes: {
            where: { userId },
            select: { id: true },
          },
        }),
      },
    });

    // Transform to include isLiked and likeCount
    const transformedReplies = replies.map(reply => ({
      ...reply,
      likeCount: reply._count?.likes || 0,
      replyCount: reply._count?.replies || 0,
      isLiked: userId ? (reply.likes?.length > 0) : false,
      likes: undefined, // Remove raw likes array
    }));

    return json({
      replies: transformedReplies,
      nextCursor: replies.length === parsedLimit ? replies[replies.length - 1]?.id : null,
    });
  } catch (e) {
    console.error('getCommentReplies error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * POST /api/posts/:postId/comments
 * Create a new comment on a post
 */
export const createComment = async (event) => {
  try {
    const { postId } = event.pathParameters || {};
    if (!postId) {
      return error(400, 'postId is required');
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const body = JSON.parse(event.body || '{}');
    const { text, parentId } = body;

    // Validate and sanitize
    const validation = validateComment(text);
    if (!validation.valid) {
      return error(400, validation.error);
    }

    const prisma = getPrisma();

    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });

    if (!post) {
      return error(404, 'Post not found');
    }

    // If replying, verify parent comment exists and belongs to same post
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { id: true, postId: true },
      });

      if (!parentComment) {
        return error(404, 'Parent comment not found');
      }

      if (parentComment.postId !== postId) {
        return error(400, 'Parent comment does not belong to this post');
      }
    }

    // Create comment with sanitized text
    const comment = await prisma.comment.create({
      data: {
        text: validation.sanitized,
        postId,
        authorId: userId,
        parentId: parentId || null,
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
      },
    });

    // Create notification for post author (if not self)
    if (post.authorId !== userId) {
      try {
        await prisma.notification.create({
          data: {
            type: 'comment',
            message: 'commented on your post',
            recipientId: post.authorId,
            triggererId: userId,
            metadata: { postId, commentId: comment.id },
          },
        });
      } catch (notifErr) {
        console.warn('Failed to create comment notification:', notifErr.message);
      }
    }

    // Parse @mentions and notify mentioned users
    const mentionRegex = /@(\w+)/g;
    const mentions = [...validation.sanitized.matchAll(mentionRegex)].map(m => m[1]);

    if (mentions.length > 0) {
      try {
        // Look up mentioned users by username
        const mentionedUsers = await prisma.user.findMany({
          where: {
            username: { in: mentions },
            id: { notIn: [userId, post.authorId] }, // Don't notify self or post author (already notified)
          },
          select: { id: true, username: true },
        });

        // Create notifications for each mentioned user
        for (const mentionedUser of mentionedUsers) {
          await prisma.notification.create({
            data: {
              type: 'mention',
              message: 'mentioned you in a comment',
              recipientId: mentionedUser.id,
              triggererId: userId,
              metadata: { postId, commentId: comment.id },
            },
          });
        }
      } catch (mentionErr) {
        console.warn('Failed to create mention notifications:', mentionErr.message);
      }
    }

    return json(comment, 201);
  } catch (e) {
    console.error('createComment error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * PUT /api/comments/:commentId
 * Update a comment (author only)
 */
export const updateComment = async (event) => {
  try {
    const { commentId } = event.pathParameters || {};
    if (!commentId) {
      return error(400, 'commentId is required');
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const body = JSON.parse(event.body || '{}');
    const { text } = body;

    // Validate and sanitize
    const validation = validateComment(text);
    if (!validation.valid) {
      return error(400, validation.error);
    }

    const prisma = getPrisma();

    // Get comment and verify ownership
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true },
    });

    if (!comment) {
      return error(404, 'Comment not found');
    }

    if (comment.authorId !== userId) {
      return error(403, 'Forbidden - not comment author');
    }

    // Update comment
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: { text: validation.sanitized },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
      },
    });

    return json(updatedComment);
  } catch (e) {
    console.error('updateComment error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * DELETE /api/comments/:commentId
 * Delete a comment (author or post owner)
 */
export const deleteComment = async (event) => {
  try {
    const { commentId } = event.pathParameters || {};
    if (!commentId) {
      return error(400, 'commentId is required');
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const prisma = getPrisma();

    // Get comment with post info
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          select: { authorId: true },
        },
      },
    });

    if (!comment) {
      return error(404, 'Comment not found');
    }

    // Allow deletion by comment author OR post owner
    const isCommentAuthor = comment.authorId === userId;
    const isPostOwner = comment.post?.authorId === userId;

    if (!isCommentAuthor && !isPostOwner) {
      return error(403, 'Forbidden - not authorized to delete this comment');
    }

    // Get the postId before deleting
    const postId = comment.postId;

    // Delete comment (cascades to replies)
    await prisma.comment.delete({
      where: { id: commentId },
    });

    // Get updated comment count
    const commentCount = await prisma.comment.count({
      where: { postId },
    });

    return json({ message: 'Comment deleted successfully', commentCount });
  } catch (e) {
    console.error('deleteComment error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * GET /api/posts/:postId/comments/count
 * Get comment count for a post
 */
export const getCommentCount = async (event) => {
  try {
    const { postId } = event.pathParameters || {};
    if (!postId) {
      return error(400, 'postId is required');
    }

    const prisma = getPrisma();

    const count = await prisma.comment.count({
      where: { postId },
    });

    return json({ postId, count });
  } catch (e) {
    console.error('getCommentCount error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * POST /api/comments/:commentId/like
 * Like a comment
 */
export const likeComment = async (event) => {
  try {
    const { commentId } = event.pathParameters || {};
    if (!commentId) {
      return error(400, 'commentId is required');
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const prisma = getPrisma();

    // Check if comment exists
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, postId: true },
    });

    if (!comment) {
      return error(404, 'Comment not found');
    }

    // Check if already liked
    const existingLike = await prisma.commentLike.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId,
        },
      },
    });

    if (existingLike) {
      return error(400, 'Comment already liked');
    }

    // Create like
    await prisma.commentLike.create({
      data: {
        commentId,
        userId,
      },
    });

    // Create notification for comment author (if not self)
    if (comment.authorId !== userId) {
      try {
        await prisma.notification.create({
          data: {
            type: 'comment_like',
            message: 'liked your comment',
            recipientId: comment.authorId,
            triggererId: userId,
            metadata: { commentId, postId: comment.postId },
          },
        });
      } catch (notifErr) {
        console.warn('Failed to create comment like notification:', notifErr.message);
      }
    }

    // Get updated like count
    const likeCount = await prisma.commentLike.count({
      where: { commentId },
    });

    return json({ success: true, likeCount, isLiked: true });
  } catch (e) {
    console.error('likeComment error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * DELETE /api/comments/:commentId/like
 * Unlike a comment
 */
export const unlikeComment = async (event) => {
  try {
    const { commentId } = event.pathParameters || {};
    if (!commentId) {
      return error(400, 'commentId is required');
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const prisma = getPrisma();

    // Check if like exists
    const existingLike = await prisma.commentLike.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId,
        },
      },
    });

    if (!existingLike) {
      return error(404, 'Like not found');
    }

    // Delete like
    await prisma.commentLike.delete({
      where: {
        commentId_userId: {
          commentId,
          userId,
        },
      },
    });

    // Get updated like count
    const likeCount = await prisma.commentLike.count({
      where: { commentId },
    });

    return json({ success: true, likeCount, isLiked: false });
  } catch (e) {
    console.error('unlikeComment error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};
