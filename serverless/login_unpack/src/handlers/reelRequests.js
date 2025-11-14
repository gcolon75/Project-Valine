import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserFromEvent } from './auth.js';

/**
 * POST /api/reels/:id/request
 * Request access to on-request reel
 */
export const createReelRequest = async (event) => {
  try {
    const { id: mediaId } = event.pathParameters || {};
    if (!mediaId) {
      return error('mediaId is required', 400);
    }

    const requesterId = getUserFromEvent(event);
    if (!requesterId) {
      return error('Unauthorized', 401);
    }

    const body = JSON.parse(event.body || '{}');
    const { message } = body;

    const prisma = getPrisma();

    // Get media and verify it's on-request
    const media = await prisma.media.findUnique({
      where: { id: mediaId },
      include: {
        profile: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!media) {
      return error('Media not found', 404);
    }

    if (media.privacy !== 'on-request') {
      return error('This media does not require access requests', 400);
    }

    const ownerId = media.profile.userId;

    // Check if user is owner
    if (requesterId === ownerId) {
      return error('You cannot request access to your own media', 400);
    }

    // Check if request already exists
    const existingRequest = await prisma.reelRequest.findUnique({
      where: {
        mediaId_requesterId: {
          mediaId,
          requesterId,
        },
      },
    });

    if (existingRequest) {
      if (existingRequest.status === 'approved') {
        return error('You already have access to this media', 400);
      }
      if (existingRequest.status === 'pending') {
        return error('You already have a pending request for this media', 400);
      }
      if (existingRequest.status === 'denied') {
        return error('Your previous request was denied', 400);
      }
    }

    // Create request
    const request = await prisma.reelRequest.create({
      data: {
        mediaId,
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
        media: {
          select: {
            id: true,
            type: true,
            title: true,
            posterS3Key: true,
          },
        },
      },
    });

    // TODO: Send notification to owner
    // Create notification for the owner
    await prisma.notification.create({
      data: {
        type: 'reel_request',
        message: `${request.requester.displayName} requested access to your ${media.type}`,
        recipientId: ownerId,
        triggererId: requesterId,
        metadata: {
          requestId: request.id,
          mediaId: mediaId,
        },
      },
    });

    return json(request, 201);
  } catch (e) {
    console.error('Create reel request error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

/**
 * GET /api/reel-requests
 * List reel requests (received by authenticated user)
 */
export const listReelRequests = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error('Unauthorized', 401);
    }

    const { status, type = 'received' } = event.queryStringParameters || {};
    const prisma = getPrisma();

    const where = type === 'sent' 
      ? { requesterId: userId }
      : { ownerId: userId };

    if (status) {
      where.status = status;
    }

    const requests = await prisma.reelRequest.findMany({
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
        media: {
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            posterS3Key: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return json(requests);
  } catch (e) {
    console.error('List reel requests error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

/**
 * POST /api/reel-requests/:id/approve
 * Approve reel request (owner only)
 */
export const approveReelRequest = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    if (!id) {
      return error('id is required', 400);
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error('Unauthorized', 401);
    }

    const body = JSON.parse(event.body || '{}');
    const { response } = body;

    const prisma = getPrisma();

    // Get request and verify ownership
    const request = await prisma.reelRequest.findUnique({
      where: { id },
      include: {
        media: true,
      },
    });

    if (!request) {
      return error('Request not found', 404);
    }

    if (request.ownerId !== userId) {
      return error('Forbidden - not media owner', 403);
    }

    if (request.status !== 'pending') {
      return error('Request has already been processed', 400);
    }

    // Approve request
    const updatedRequest = await prisma.reelRequest.update({
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
        media: {
          select: {
            id: true,
            type: true,
            title: true,
          },
        },
      },
    });

    // TODO: Send notification to requester
    // Create notification for the requester
    await prisma.notification.create({
      data: {
        type: 'reel_request_approved',
        message: `Your request to view "${request.media.title || 'a reel'}" has been approved`,
        recipientId: request.requesterId,
        triggererId: userId,
        metadata: {
          requestId: id,
          mediaId: request.mediaId,
        },
      },
    });

    return json(updatedRequest);
  } catch (e) {
    console.error('Approve reel request error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

/**
 * POST /api/reel-requests/:id/deny
 * Deny reel request (owner only)
 */
export const denyReelRequest = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    if (!id) {
      return error('id is required', 400);
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error('Unauthorized', 401);
    }

    const body = JSON.parse(event.body || '{}');
    const { response } = body;

    const prisma = getPrisma();

    // Get request and verify ownership
    const request = await prisma.reelRequest.findUnique({
      where: { id },
      include: {
        media: true,
      },
    });

    if (!request) {
      return error('Request not found', 404);
    }

    if (request.ownerId !== userId) {
      return error('Forbidden - not media owner', 403);
    }

    if (request.status !== 'pending') {
      return error('Request has already been processed', 400);
    }

    // Deny request
    const updatedRequest = await prisma.reelRequest.update({
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
        media: {
          select: {
            id: true,
            type: true,
            title: true,
          },
        },
      },
    });

    // TODO: Send notification to requester
    // Create notification for the requester
    await prisma.notification.create({
      data: {
        type: 'reel_request_denied',
        message: `Your request to view "${request.media.title || 'a reel'}" has been denied`,
        recipientId: request.requesterId,
        triggererId: userId,
        metadata: {
          requestId: id,
          mediaId: request.mediaId,
        },
      },
    });

    return json(updatedRequest);
  } catch (e) {
    console.error('Deny reel request error:', e);
    return error('Server error: ' + e.message, 500);
  }
};
