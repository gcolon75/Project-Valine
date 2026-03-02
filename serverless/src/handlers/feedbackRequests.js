import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserFromEvent } from './auth.js';

/**
 * POST /posts/:id/feedback-request
 * Request to give feedback on a PDF post
 */
export const createFeedbackRequest = async (event) => {
  try {
    const { id: postId } = event.pathParameters || {};
    if (!postId) {
      return error(400, 'postId is required');
    }

    const requesterId = getUserFromEvent(event);
    if (!requesterId) {
      return error(401, 'Unauthorized');
    }

    const body = JSON.parse(event.body || '{}');
    const { message } = body;

    const prisma = getPrisma();

    // Get post and verify it allows feedback
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    if (!post) {
      return error(404, 'Post not found');
    }

    if (!post.allowFeedback) {
      return error(400, 'This post does not allow feedback requests');
    }

    const ownerId = post.authorId;

    // Check if user is owner
    if (requesterId === ownerId) {
      return error(400, 'You cannot request feedback on your own post');
    }

    // Check if request already exists
    const existingRequest = await prisma.feedbackRequest.findUnique({
      where: {
        postId_requesterId: {
          postId,
          requesterId,
        },
      },
    });

    if (existingRequest) {
      if (existingRequest.status === 'approved') {
        return error(400, 'You already have access to give feedback on this post');
      }
      if (existingRequest.status === 'pending') {
        return error(400, 'You already have a pending feedback request for this post');
      }
      if (existingRequest.status === 'denied') {
        return error(400, 'Your previous feedback request was denied');
      }
    }

    // Create request
    const request = await prisma.feedbackRequest.create({
      data: {
        postId,
        requesterId,
        ownerId,
        message: message || null,
        status: 'pending',
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
          },
        },
      },
    });

    // Create notification for the owner
    await prisma.notification.create({
      data: {
        type: 'feedback_request',
        message: `${request.requester.displayName || request.requester.username} requested to give feedback on your PDF "${post.title || 'Untitled'}"`,
        recipientId: ownerId,
        triggererId: requesterId,
        metadata: {
          requestId: request.id,
          postId: postId,
        },
      },
    });

    return json(request, 201);
  } catch (e) {
    console.error('Create feedback request error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * GET /feedback-requests
 * List feedback requests (received or sent by authenticated user)
 */
export const listFeedbackRequests = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const { status, type = 'received' } = event.queryStringParameters || {};
    const prisma = getPrisma();

    const where = type === 'sent'
      ? { requesterId: userId }
      : { ownerId: userId };

    if (status) {
      where.status = status;
    }

    const requests = await prisma.feedbackRequest.findMany({
      where,
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            content: true,
            thumbnailUrl: true,
            mediaId: true,
          },
        },
        _count: {
          select: {
            annotations: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return json(requests);
  } catch (e) {
    console.error('List feedback requests error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * GET /feedback-requests/:id
 * Get a single feedback request with details
 */
export const getFeedbackRequest = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    if (!id) {
      return error(400, 'id is required');
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const prisma = getPrisma();

    const request = await prisma.feedbackRequest.findUnique({
      where: { id },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            content: true,
            thumbnailUrl: true,
            mediaId: true,
            mediaAttached: {
              select: {
                id: true,
                s3Key: true,
                type: true,
              },
            },
          },
        },
        annotations: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!request) {
      return error(404, 'Feedback request not found');
    }

    // Only owner or requester can view
    if (request.ownerId !== userId && request.requesterId !== userId) {
      return error(403, 'Forbidden');
    }

    return json(request);
  } catch (e) {
    console.error('Get feedback request error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * POST /feedback-requests/:id/approve
 * Approve feedback request (owner only)
 */
export const approveFeedbackRequest = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    if (!id) {
      return error(400, 'id is required');
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const body = JSON.parse(event.body || '{}');
    const { response } = body;

    const prisma = getPrisma();

    // Get request and verify ownership
    const request = await prisma.feedbackRequest.findUnique({
      where: { id },
      include: {
        post: true,
      },
    });

    if (!request) {
      return error(404, 'Request not found');
    }

    if (request.ownerId !== userId) {
      return error(403, 'Forbidden - not post owner');
    }

    if (request.status !== 'pending') {
      return error(400, 'Request has already been processed');
    }

    // Approve request
    const updatedRequest = await prisma.feedbackRequest.update({
      where: { id },
      data: {
        status: 'approved',
        response: response || null,
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Create notification for the requester
    await prisma.notification.create({
      data: {
        type: 'feedback_request_approved',
        message: `Your feedback request for "${request.post.title || 'a PDF'}" has been approved`,
        recipientId: request.requesterId,
        triggererId: userId,
        metadata: {
          requestId: id,
          postId: request.postId,
        },
      },
    });

    return json(updatedRequest);
  } catch (e) {
    console.error('Approve feedback request error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * POST /feedback-requests/:id/deny
 * Deny feedback request (owner only)
 */
export const denyFeedbackRequest = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    if (!id) {
      return error(400, 'id is required');
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const body = JSON.parse(event.body || '{}');
    const { response } = body;

    const prisma = getPrisma();

    // Get request and verify ownership
    const request = await prisma.feedbackRequest.findUnique({
      where: { id },
      include: {
        post: true,
      },
    });

    if (!request) {
      return error(404, 'Request not found');
    }

    if (request.ownerId !== userId) {
      return error(403, 'Forbidden - not post owner');
    }

    if (request.status !== 'pending') {
      return error(400, 'Request has already been processed');
    }

    // Deny request
    const updatedRequest = await prisma.feedbackRequest.update({
      where: { id },
      data: {
        status: 'denied',
        response: response || null,
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Create notification for the requester
    await prisma.notification.create({
      data: {
        type: 'feedback_request_denied',
        message: `Your feedback request for "${request.post.title || 'a PDF'}" has been denied`,
        recipientId: request.requesterId,
        triggererId: userId,
        metadata: {
          requestId: id,
          postId: request.postId,
        },
      },
    });

    return json(updatedRequest);
  } catch (e) {
    console.error('Deny feedback request error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * GET /feedback-requests/:id/annotations
 * Get all annotations for a feedback request
 */
export const getAnnotations = async (event) => {
  try {
    const { id: feedbackRequestId } = event.pathParameters || {};
    if (!feedbackRequestId) {
      return error(400, 'feedbackRequestId is required');
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const prisma = getPrisma();

    // Get request and verify access
    const request = await prisma.feedbackRequest.findUnique({
      where: { id: feedbackRequestId },
    });

    if (!request) {
      return error(404, 'Feedback request not found');
    }

    // Only owner or requester can view annotations
    if (request.ownerId !== userId && request.requesterId !== userId) {
      return error(403, 'Forbidden');
    }

    const annotations = await prisma.feedbackAnnotation.findMany({
      where: { feedbackRequestId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
      orderBy: [
        { pageNumber: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return json(annotations);
  } catch (e) {
    console.error('Get annotations error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * POST /feedback-requests/:id/annotations
 * Create an annotation (only approved requester can create)
 */
export const createAnnotation = async (event) => {
  try {
    const { id: feedbackRequestId } = event.pathParameters || {};
    if (!feedbackRequestId) {
      return error(400, 'feedbackRequestId is required');
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const body = JSON.parse(event.body || '{}');
    const { type, pageNumber, selectionData, highlightedText, content, positionX, positionY } = body;

    if (!type || !content) {
      return error(400, 'type and content are required');
    }

    if (!['HIGHLIGHT', 'PAGE_COMMENT', 'GENERAL_COMMENT'].includes(type)) {
      return error(400, 'Invalid annotation type');
    }

    const prisma = getPrisma();

    // Get request and verify it's approved
    const request = await prisma.feedbackRequest.findUnique({
      where: { id: feedbackRequestId },
      include: {
        post: true,
      },
    });

    if (!request) {
      return error(404, 'Feedback request not found');
    }

    if (request.status !== 'approved') {
      return error(403, 'Feedback request is not approved');
    }

    // Only the requester can create annotations
    if (request.requesterId !== userId) {
      return error(403, 'Only the approved feedback requester can create annotations');
    }

    // Create annotation
    const annotation = await prisma.feedbackAnnotation.create({
      data: {
        feedbackRequestId,
        authorId: userId,
        type,
        pageNumber: pageNumber || null,
        selectionData: selectionData || null,
        highlightedText: highlightedText || null,
        content,
        positionX: positionX || null,
        positionY: positionY || null,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    // Notify the post owner of new feedback
    await prisma.notification.create({
      data: {
        type: 'new_feedback',
        message: `${annotation.author.displayName || annotation.author.username} left feedback on your PDF "${request.post.title || 'Untitled'}"`,
        recipientId: request.ownerId,
        triggererId: userId,
        metadata: {
          requestId: feedbackRequestId,
          postId: request.postId,
          annotationId: annotation.id,
        },
      },
    });

    return json(annotation, 201);
  } catch (e) {
    console.error('Create annotation error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * PUT /annotations/:id
 * Update an annotation (author only)
 */
export const updateAnnotation = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    if (!id) {
      return error(400, 'id is required');
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const body = JSON.parse(event.body || '{}');
    const { content, selectionData, highlightedText, positionX, positionY } = body;

    const prisma = getPrisma();

    // Get annotation and verify ownership
    const annotation = await prisma.feedbackAnnotation.findUnique({
      where: { id },
    });

    if (!annotation) {
      return error(404, 'Annotation not found');
    }

    if (annotation.authorId !== userId) {
      return error(403, 'Forbidden - not annotation author');
    }

    // Update annotation
    const updatedAnnotation = await prisma.feedbackAnnotation.update({
      where: { id },
      data: {
        ...(content !== undefined && { content }),
        ...(selectionData !== undefined && { selectionData }),
        ...(highlightedText !== undefined && { highlightedText }),
        ...(positionX !== undefined && { positionX }),
        ...(positionY !== undefined && { positionY }),
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    return json(updatedAnnotation);
  } catch (e) {
    console.error('Update annotation error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * DELETE /annotations/:id
 * Delete an annotation (author only)
 */
export const deleteAnnotation = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    if (!id) {
      return error(400, 'id is required');
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const prisma = getPrisma();

    // Get annotation and verify ownership
    const annotation = await prisma.feedbackAnnotation.findUnique({
      where: { id },
    });

    if (!annotation) {
      return error(404, 'Annotation not found');
    }

    if (annotation.authorId !== userId) {
      return error(403, 'Forbidden - not annotation author');
    }

    // Delete annotation
    await prisma.feedbackAnnotation.delete({
      where: { id },
    });

    return json({ deleted: true });
  } catch (e) {
    console.error('Delete annotation error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * GET /posts/:id/feedback-status
 * Get the current user's feedback request status for a post
 */
export const getFeedbackStatus = async (event) => {
  try {
    const { id: postId } = event.pathParameters || {};
    if (!postId) {
      return error(400, 'postId is required');
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const prisma = getPrisma();

    const request = await prisma.feedbackRequest.findUnique({
      where: {
        postId_requesterId: {
          postId,
          requesterId: userId,
        },
      },
      select: {
        id: true,
        status: true,
        message: true,
        response: true,
        createdAt: true,
      },
    });

    return json({
      hasRequest: !!request,
      request: request || null,
    });
  } catch (e) {
    console.error('Get feedback status error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};
