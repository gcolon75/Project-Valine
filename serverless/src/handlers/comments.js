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
 * List comments for a post with pagination
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

    const prisma = getPrisma();

    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!post) {
      return error(404, 'Post not found');
    }

    // Fetch top-level comments (no parent)
    const comments = await prisma.comment.findMany({
      where: {
        postId,
        parentId: null, // Only top-level comments
      },
      take: parsedLimit,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
        ...(showReplies && {
          replies: {
            take: 3, // Preview of replies
            orderBy: { createdAt: 'asc' },
            include: {
              author: {
                select: { id: true, username: true, displayName: true, avatar: true },
              },
            },
          },
          _count: {
            select: { replies: true },
          },
        }),
      },
    });

    // Get total count for pagination info
    const totalCount = await prisma.comment.count({
      where: { postId, parentId: null },
    });

    return json({
      comments,
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
 * Get replies to a specific comment
 */
export const getCommentReplies = async (event) => {
  try {
    const { commentId } = event.pathParameters || {};
    if (!commentId) {
      return error(400, 'commentId is required');
    }

    const { limit = '20', cursor } = event.queryStringParameters || {};
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

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
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
      },
    });

    return json({
      replies,
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

    // TODO: Create notification for post author (if not self)
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

    // Delete comment (cascades to replies)
    await prisma.comment.delete({
      where: { id: commentId },
    });

    return json({ message: 'Comment deleted successfully' });
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
