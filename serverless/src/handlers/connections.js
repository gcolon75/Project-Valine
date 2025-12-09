import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserFromEvent } from './auth.js';

export const sendRequest = async (event) => {
  try {
    const senderId = getUserFromEvent(event);
    if (!senderId) {
      return error(401, 'Unauthorized');
    }

    const { targetUserId, message } = JSON.parse(event.body || '{}');
    const receiverId = targetUserId;
    
    if (!receiverId) {
      return error(400, 'targetUserId is required');
    }

    if (receiverId === senderId) {
      return error(400, 'Cannot send connection request to yourself');
    }

    const prisma = getPrisma();
    const existing = await prisma.connectionRequest.findUnique({
      where: {
        senderId_receiverId: {
          senderId,
          receiverId,
        },
      },
    });
    
    if (existing) {
      const hydrated = await prisma.connectionRequest.findUnique({
        where: { id: existing.id },
        include: { sender: true, receiver: true },
      });

      if (existing.status !== 'pending') {
        return json(hydrated);
      }

      // Refresh updatedAt for pending requests to show latest activity
      const refreshed = await prisma.connectionRequest.update({
        where: { id: existing.id },
        data: { updatedAt: new Date() },
        include: { sender: true, receiver: true },
      });
      return json(refreshed);
    }

    const request = await prisma.connectionRequest.create({
      data: { senderId, receiverId, message, status: 'pending' },
      include: { sender: true, receiver: true },
    });
    
    return json(request, 201);
  } catch (e) {
    console.error(e);
    return error(500, 'Server error: ' + e.message);
  }
};

export const listRequests = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const prisma = getPrisma();
    const requests = await prisma.connectionRequest.findMany({
      where: { receiverId: userId, status: 'pending' },
      include: { sender: true },
      orderBy: { createdAt: 'desc' },
    });
    
    return json(requests);
  } catch (e) {
    console.error(e);
    return error(500, 'Server error: ' + e.message);
  }
};

export const approveRequest = async (event) => {
  try {
    const id = event.pathParameters?.id;
    
    if (!id) {
      return error(400, 'id is required');
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const prisma = getPrisma();
    const existing = await prisma.connectionRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      return error(404, 'Request not found');
    }

    if (existing.receiverId !== userId) {
      return error(403, 'Forbidden - not request recipient');
    }

    const request = await prisma.connectionRequest.update({
      where: { id },
      data: { status: 'accepted' },
    });
    
    return json(request);
  } catch (e) {
    console.error(e);
    return error(500, 'Server error: ' + e.message);
  }
};

export const rejectRequest = async (event) => {
  try {
    const id = event.pathParameters?.id;
    
    if (!id) {
      return error(400, 'id is required');
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const prisma = getPrisma();
    const existing = await prisma.connectionRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      return error(404, 'Request not found');
    }

    if (existing.receiverId !== userId) {
      return error(403, 'Forbidden - not request recipient');
    }

    const request = await prisma.connectionRequest.update({
      where: { id },
      data: { status: 'rejected' },
    });
    
    return json(request);
  } catch (e) {
    console.error(e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * POST /connections/follow
 * Follow or unfollow a user (toggle)
 * 
 * Follow semantics:
 * - When user A follows user B: creates connection_request(senderId=A, receiverId=B, status='accepted')
 * - User A is "following" user B (A.sentRequests includes this record)
 * - User B has user A as a "follower" (B.receivedRequests includes this record)
 * - User A will see user B's FOLLOWERS and PUBLIC posts in their feed
 * 
 * Body: { targetUserId: string }
 */
export const followUser = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const { targetUserId } = JSON.parse(event.body || '{}');
    
    if (!targetUserId) {
      return error(400, 'targetUserId is required');
    }

    if (userId === targetUserId) {
      return error(400, 'Cannot follow yourself');
    }

    const prisma = getPrisma();

    // Check if there's an existing connection request (follow)
    const existingRequest = await prisma.connectionRequest.findUnique({
      where: {
        senderId_receiverId: {
          senderId: userId,
          receiverId: targetUserId,
        },
      },
    });

    if (existingRequest) {
      // Unfollow - delete the connection request
      await prisma.connectionRequest.delete({
        where: { id: existingRequest.id },
      });
      return json({ isFollowing: false, message: 'Unfollowed successfully' });
    } else {
      // Follow - create a new connection request with accepted status
      await prisma.connectionRequest.create({
        data: {
          senderId: userId,
          receiverId: targetUserId,
          status: 'accepted', // Auto-accept for follow functionality
        },
      });
      return json({ isFollowing: true, message: 'Followed successfully' }, 201);
    }
  } catch (e) {
    console.error('Follow user error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * GET /connections/status/{userId}
 * Get connection status with a user
 * 
 * Connection semantics:
 * - isFollowing: current user follows target user (current is sender, target is receiver, status='accepted')
 * - isFollowedBy: target user follows current user (target is sender, current is receiver, status='accepted')
 * 
 * Returns: { isFollowing: boolean, isFollowedBy: boolean }
 */
export const getConnectionStatus = async (event) => {
  try {
    const currentUserId = getUserFromEvent(event);
    if (!currentUserId) {
      return error(401, 'Unauthorized');
    }

    const targetUserId = event.pathParameters?.userId;
    
    if (!targetUserId) {
      return error(400, 'userId is required');
    }

    const prisma = getPrisma();

    // Check if current user follows target user
    const followingRequest = await prisma.connectionRequest.findUnique({
      where: {
        senderId_receiverId: {
          senderId: currentUserId,
          receiverId: targetUserId,
        },
      },
    });

    // Check if target user follows current user
    const followerRequest = await prisma.connectionRequest.findUnique({
      where: {
        senderId_receiverId: {
          senderId: targetUserId,
          receiverId: currentUserId,
        },
      },
    });

    const isFollowing = !!followingRequest && followingRequest.status === 'accepted';
    const isFollowedBy = !!followerRequest && followerRequest.status === 'accepted';

    return json({
      isFollowing,
      isFollowedBy,
    });
  } catch (e) {
    console.error('Get connection status error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * POST /connections/unfollow
 * Unfollow a user
 * Body: { targetUserId: string }
 */
export const unfollowUser = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return error(400, 'Invalid JSON in request body');
    }

    const { targetUserId } = body;
    
    if (!targetUserId) {
      return error(400, 'targetUserId is required');
    }

    const prisma = getPrisma();

    // Delete the connection request where current user is following target
    const result = await prisma.connectionRequest.deleteMany({
      where: {
        senderId: userId,
        receiverId: targetUserId,
        status: 'accepted'
      }
    });

    if (result.count === 0) {
      return json({ success: false, message: 'No connection found to unfollow' });
    }

    return json({ success: true, message: 'Unfollowed successfully' });
  } catch (e) {
    console.error('Unfollow user error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};
