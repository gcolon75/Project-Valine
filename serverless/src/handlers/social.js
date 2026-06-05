// serverless/src/handlers/social.js
import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserFromEvent } from './auth.js';
import { createNotification } from './notifications.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve profileId path param → targetUserId */
async function resolveProfile(prisma, profileId) {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { userId: true, visibility: true, messagePermission: true }
  });
  return profile;
}

/** Find a ConnectionRequest between two users (either direction) */
async function findConnection(prisma, userA, userB) {
  return prisma.connectionRequest.findFirst({
    where: {
      OR: [
        { senderId: userA, receiverId: userB },
        { senderId: userB, receiverId: userA }
      ]
    }
  });
}

// ---------------------------------------------------------------------------
// POST /profiles/{profileId}/connect
// Send a network connection request
// ---------------------------------------------------------------------------
export const connectProfile = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) return error(401, 'Unauthorized');

    const targetProfileId = event.pathParameters?.profileId;
    if (!targetProfileId) return error(400, 'profileId is required');

    const prisma = getPrisma();
    const targetProfile = await resolveProfile(prisma, targetProfileId);
    if (!targetProfile) return error(404, 'Profile not found');

    const targetUserId = targetProfile.userId;
    if (userId === targetUserId) return error(400, 'Cannot connect with yourself');

    // Block check
    const blockExists = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: userId }
        ]
      }
    });
    if (blockExists) return error(403, 'Cannot connect with this user');

    // Existing connection check
    const existing = await findConnection(prisma, userId, targetUserId);
    if (existing) {
      if (existing.status === 'accepted') {
        return json({ networkStatus: 'connected', message: 'Already connected' });
      }
      if (existing.status === 'pending') {
        // If the OTHER user already sent a request, auto-accept
        if (existing.senderId === targetUserId) {
          await prisma.$transaction([
            prisma.connectionRequest.update({
              where: { id: existing.id },
              data: { status: 'accepted' }
            }),
            prisma.profile.update({
              where: { userId },
              data: { networkCount: { increment: 1 } }
            }),
            prisma.profile.update({
              where: { userId: targetUserId },
              data: { networkCount: { increment: 1 } }
            })
          ]);
          try {
            await createNotification(prisma, {
              type: 'NETWORK_ACCEPT',
              message: 'accepted your connection request',
              recipientId: targetUserId,
              triggererId: userId,
              metadata: {}
            });
          } catch (e) { console.error('Notification error:', e); }
          return json({ networkStatus: 'connected', message: 'Connection accepted' }, 201);
        }
        // Own pending request still exists
        return json({ networkStatus: 'pending_sent', message: 'Request already sent' });
      }
      // Was rejected — allow re-send
      await prisma.connectionRequest.update({
        where: { id: existing.id },
        data: { status: 'pending', senderId: userId, receiverId: targetUserId }
      });
    } else {
      await prisma.connectionRequest.create({
        data: { senderId: userId, receiverId: targetUserId, status: 'pending' }
      });
    }

    // Notify receiver — include sender's profileId so they can accept/decline inline
    try {
      const senderProfile = await prisma.profile.findUnique({
        where: { userId },
        select: { id: true }
      });
      await createNotification(prisma, {
        type: 'NETWORK_REQUEST',
        message: 'wants to connect with you',
        recipientId: targetUserId,
        triggererId: userId,
        metadata: { senderProfileId: senderProfile?.id }
      });
    } catch (e) { console.error('Notification error:', e); }

    return json({ networkStatus: 'pending_sent', message: 'Connection request sent' }, 201);
  } catch (e) {
    console.error('Connect profile error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

// ---------------------------------------------------------------------------
// DELETE /profiles/{profileId}/connect
// Cancel a pending request OR remove an accepted connection
// ---------------------------------------------------------------------------
export const disconnectProfile = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) return error(401, 'Unauthorized');

    const targetProfileId = event.pathParameters?.profileId;
    if (!targetProfileId) return error(400, 'profileId is required');

    const prisma = getPrisma();
    const targetProfile = await resolveProfile(prisma, targetProfileId);
    if (!targetProfile) return error(404, 'Profile not found');

    const targetUserId = targetProfile.userId;
    const existing = await findConnection(prisma, userId, targetUserId);

    if (!existing) {
      return json({ networkStatus: 'none', message: 'No connection found' });
    }

    if (existing.status === 'accepted') {
      // Remove connection and decrement both counts
      await prisma.$transaction([
        prisma.connectionRequest.delete({ where: { id: existing.id } }),
        prisma.profile.update({
          where: { userId },
          data: { networkCount: { decrement: 1 } }
        }),
        prisma.profile.update({
          where: { userId: targetUserId },
          data: { networkCount: { decrement: 1 } }
        })
      ]);
      return json({ networkStatus: 'none', message: 'Removed from network' });
    }

    if (existing.status === 'pending' && existing.senderId === userId) {
      // Cancel own pending request
      await prisma.connectionRequest.delete({ where: { id: existing.id } });
      return json({ networkStatus: 'none', message: 'Request cancelled' });
    }

    return json({ networkStatus: 'pending_received', message: 'Cannot cancel — request was received, not sent' });
  } catch (e) {
    console.error('Disconnect profile error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

// ---------------------------------------------------------------------------
// POST /profiles/{profileId}/connect/accept
// Accept an incoming connection request
// ---------------------------------------------------------------------------
export const acceptNetworkRequest = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) return error(401, 'Unauthorized');

    const targetProfileId = event.pathParameters?.profileId;
    if (!targetProfileId) return error(400, 'profileId is required');

    const prisma = getPrisma();
    const targetProfile = await resolveProfile(prisma, targetProfileId);
    if (!targetProfile) return error(404, 'Profile not found');

    const targetUserId = targetProfile.userId;

    // Find the request where TARGET sent to ME
    const request = await prisma.connectionRequest.findFirst({
      where: { senderId: targetUserId, receiverId: userId, status: 'pending' }
    });

    if (!request) return error(404, 'No pending request found');

    await prisma.$transaction([
      prisma.connectionRequest.update({
        where: { id: request.id },
        data: { status: 'accepted' }
      }),
      prisma.profile.update({
        where: { userId },
        data: { networkCount: { increment: 1 } }
      }),
      prisma.profile.update({
        where: { userId: targetUserId },
        data: { networkCount: { increment: 1 } }
      })
    ]);

    try {
      await createNotification(prisma, {
        type: 'NETWORK_ACCEPT',
        message: 'accepted your connection request',
        recipientId: targetUserId,
        triggererId: userId,
        metadata: {}
      });
    } catch (e) { console.error('Notification error:', e); }

    return json({ networkStatus: 'connected', message: 'Connection accepted' });
  } catch (e) {
    console.error('Accept network request error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

// ---------------------------------------------------------------------------
// POST /profiles/{profileId}/connect/decline
// Decline an incoming connection request
// ---------------------------------------------------------------------------
export const declineNetworkRequest = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) return error(401, 'Unauthorized');

    const targetProfileId = event.pathParameters?.profileId;
    if (!targetProfileId) return error(400, 'profileId is required');

    const prisma = getPrisma();
    const targetProfile = await resolveProfile(prisma, targetProfileId);
    if (!targetProfile) return error(404, 'Profile not found');

    const targetUserId = targetProfile.userId;

    const request = await prisma.connectionRequest.findFirst({
      where: { senderId: targetUserId, receiverId: userId, status: 'pending' }
    });

    if (!request) return error(404, 'No pending request found');

    await prisma.connectionRequest.update({
      where: { id: request.id },
      data: { status: 'rejected' }
    });

    return json({ networkStatus: 'none', message: 'Request declined' });
  } catch (e) {
    console.error('Decline network request error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

// ---------------------------------------------------------------------------
// GET /profiles/{profileId}/network
// List accepted network connections for a profile
// ---------------------------------------------------------------------------
export const getProfileNetwork = async (event) => {
  try {
    const userId = getUserFromEvent(event);

    const targetProfileId = event.pathParameters?.profileId;
    if (!targetProfileId) return error(400, 'profileId is required');

    const prisma = getPrisma();
    const targetProfile = await resolveProfile(prisma, targetProfileId);
    if (!targetProfile) return error(404, 'Profile not found');

    const targetUserId = targetProfile.userId;

    // Find all accepted connections involving this user
    const connections = await prisma.connectionRequest.findMany({
      where: {
        status: 'accepted',
        OR: [
          { senderId: targetUserId },
          { receiverId: targetUserId }
        ]
      },
      include: {
        sender: {
          select: {
            id: true, username: true, displayName: true, avatar: true,
            profile: { select: { id: true, title: true, vanityUrl: true } }
          }
        },
        receiver: {
          select: {
            id: true, username: true, displayName: true, avatar: true,
            profile: { select: { id: true, title: true, vanityUrl: true } }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Get blocks involving the viewing user
    let blockedUserIds = new Set();
    if (userId) {
      const blocks = await prisma.block.findMany({
        where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
        select: { blockerId: true, blockedId: true }
      });
      blocks.forEach(b => { blockedUserIds.add(b.blockerId); blockedUserIds.add(b.blockedId); });
    }

    const items = connections
      .map(c => {
        const other = c.senderId === targetUserId ? c.receiver : c.sender;
        return {
          userId: other.id,
          username: other.username,
          displayName: other.displayName,
          avatar: other.avatar,
          title: other.profile?.title,
          profileId: other.profile?.id,
          vanityUrl: other.profile?.vanityUrl,
          connectedAt: c.updatedAt
        };
      })
      .filter(u => !blockedUserIds.has(u.userId));

    return json({ items, count: items.length });
  } catch (e) {
    console.error('Get profile network error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

// ---------------------------------------------------------------------------
// GET /profiles/{profileId}/status
// Get network status with a profile
// ---------------------------------------------------------------------------
export const getProfileStatus = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return json({
        networkStatus: 'none',
        isBlocked: false,
        isBlockedBy: false,
        visibility: 'PUBLIC',
        messagePermission: 'EVERYONE'
      });
    }

    const targetProfileId = event.pathParameters?.profileId;
    if (!targetProfileId) return error(400, 'profileId is required');

    const prisma = getPrisma();
    const targetProfile = await resolveProfile(prisma, targetProfileId);
    if (!targetProfile) return error(404, 'Profile not found');

    const targetUserId = targetProfile.userId;

    const [connection, blocking, blockedBy] = await Promise.all([
      findConnection(prisma, userId, targetUserId),
      prisma.block.findUnique({
        where: { blockerId_blockedId: { blockerId: userId, blockedId: targetUserId } }
      }),
      prisma.block.findUnique({
        where: { blockerId_blockedId: { blockerId: targetUserId, blockedId: userId } }
      })
    ]);

    let networkStatus = 'none';
    if (connection) {
      if (connection.status === 'accepted') {
        networkStatus = 'connected';
      } else if (connection.status === 'pending') {
        networkStatus = connection.senderId === userId ? 'pending_sent' : 'pending_received';
      }
    }

    return json({
      networkStatus,
      isBlocked: !!blocking,
      isBlockedBy: !!blockedBy,
      visibility: targetProfile.visibility || 'PUBLIC',
      messagePermission: targetProfile.messagePermission || 'EVERYONE'
    });
  } catch (e) {
    console.error('Get profile status error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

// ---------------------------------------------------------------------------
// POST /profiles/{profileId}/block
// Block a user (also removes any network connection)
// ---------------------------------------------------------------------------
export const blockProfile = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) return error(401, 'Unauthorized');

    const targetProfileId = event.pathParameters?.profileId;
    if (!targetProfileId) return error(400, 'profileId is required');

    const prisma = getPrisma();
    const targetProfile = await resolveProfile(prisma, targetProfileId);
    if (!targetProfile) return error(404, 'Profile not found');

    const targetUserId = targetProfile.userId;
    if (userId === targetUserId) return error(400, 'Cannot block yourself');

    const existingBlock = await prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: targetUserId } }
    });
    if (existingBlock) return json({ isBlocked: true, message: 'Already blocked this user' });

    await prisma.$transaction(async (tx) => {
      await tx.block.create({ data: { blockerId: userId, blockedId: targetUserId } });

      // Remove network connection if exists
      const connection = await tx.connectionRequest.findFirst({
        where: {
          status: 'accepted',
          OR: [
            { senderId: userId, receiverId: targetUserId },
            { senderId: targetUserId, receiverId: userId }
          ]
        }
      });
      if (connection) {
        await tx.connectionRequest.delete({ where: { id: connection.id } });
        await tx.profile.update({ where: { userId }, data: { networkCount: { decrement: 1 } } });
        await tx.profile.update({ where: { userId: targetUserId }, data: { networkCount: { decrement: 1 } } });
      }

      // Remove any pending requests too
      await tx.connectionRequest.deleteMany({
        where: {
          status: 'pending',
          OR: [
            { senderId: userId, receiverId: targetUserId },
            { senderId: targetUserId, receiverId: userId }
          ]
        }
      });
    });

    return json({ isBlocked: true, message: 'Successfully blocked user' }, 201);
  } catch (e) {
    console.error('Block profile error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

// ---------------------------------------------------------------------------
// DELETE /profiles/{profileId}/block
// ---------------------------------------------------------------------------
export const unblockProfile = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) return error(401, 'Unauthorized');

    const targetProfileId = event.pathParameters?.profileId;
    if (!targetProfileId) return error(400, 'profileId is required');

    const prisma = getPrisma();
    const targetProfile = await resolveProfile(prisma, targetProfileId);
    if (!targetProfile) return error(404, 'Profile not found');

    const result = await prisma.block.deleteMany({
      where: { blockerId: userId, blockedId: targetProfile.userId }
    });

    return json({ isBlocked: false, message: result.count > 0 ? 'Successfully unblocked user' : 'User was not blocked' });
  } catch (e) {
    console.error('Unblock profile error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

// ---------------------------------------------------------------------------
// GET /me/blocks
// ---------------------------------------------------------------------------
export const getMyBlocks = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) return error(401, 'Unauthorized');

    const prisma = getPrisma();
    const blocks = await prisma.block.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: {
            id: true, username: true, displayName: true, avatar: true,
            profile: { select: { id: true, title: true, vanityUrl: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const items = blocks.map(b => ({
      userId: b.blocked.id,
      username: b.blocked.username,
      displayName: b.blocked.displayName,
      avatar: b.blocked.avatar,
      title: b.blocked.profile?.title,
      profileId: b.blocked.profile?.id,
      vanityUrl: b.blocked.profile?.vanityUrl,
      blockedAt: b.createdAt
    }));

    return json({ items, count: items.length });
  } catch (e) {
    console.error('Get my blocks error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

// ---------------------------------------------------------------------------
// Deprecated stubs (kept for backward compat — return 410 Gone)
// ---------------------------------------------------------------------------
export const followProfile = async () =>
  error(410, 'The follow system has been replaced with the Network system. Use POST /profiles/:id/connect');

export const unfollowProfile = async () =>
  error(410, 'The follow system has been replaced with the Network system. Use DELETE /profiles/:id/connect');

export const getProfileFollowers = async () =>
  error(410, 'Use GET /profiles/:id/network instead');

export const getProfileFollowing = async () =>
  error(410, 'Use GET /profiles/:id/network instead');

export const getMyFollowers = async () =>
  error(410, 'Use GET /profiles/:id/network instead');

export const getMyFollowing = async () =>
  error(410, 'Use GET /profiles/:id/network instead');
