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

    const seen = new Set();
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
      .filter(u => {
        if (blockedUserIds.has(u.userId)) return false;
        if (seen.has(u.userId)) return false;
        seen.add(u.userId);
        return true;
      });

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
// GET /discover/suggestions
// Suggested people: 2nd-degree connections first, then recent users as padding
// ---------------------------------------------------------------------------
export const getSuggestedUsers = async (event) => {
  try {
    const userId = getUserFromEvent(event); // optional — unauthenticated gets recent users
    const prisma = getPrisma();
    const LIMIT = 12;

    const excluded = new Set();

    if (userId) {
      excluded.add(userId);

      // My accepted connections
      const myConnections = await prisma.connectionRequest.findMany({
        where: { status: 'accepted', OR: [{ senderId: userId }, { receiverId: userId }] },
        select: { senderId: true, receiverId: true }
      });
      const myNetworkIds = myConnections.map(c => c.senderId === userId ? c.receiverId : c.senderId);
      myNetworkIds.forEach(id => excluded.add(id));

      // Pending requests — exclude these too
      const pending = await prisma.connectionRequest.findMany({
        where: { status: 'pending', OR: [{ senderId: userId }, { receiverId: userId }] },
        select: { senderId: true, receiverId: true }
      });
      pending.forEach(r => { excluded.add(r.senderId); excluded.add(r.receiverId); });

      // Blocked users
      const blocks = await prisma.block.findMany({
        where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
        select: { blockerId: true, blockedId: true }
      });
      blocks.forEach(b => { excluded.add(b.blockerId); excluded.add(b.blockedId); });

      // 2nd-degree suggestions
      if (myNetworkIds.length > 0) {
        const myNetworkSet = new Set(myNetworkIds);
        const excludedArr = Array.from(excluded);

        const secondDegree = await prisma.connectionRequest.findMany({
          where: {
            status: 'accepted',
            OR: [
              { senderId: { in: myNetworkIds }, receiverId: { notIn: excludedArr } },
              { receiverId: { in: myNetworkIds }, senderId: { notIn: excludedArr } }
            ]
          },
          include: {
            sender: {
              select: {
                id: true, username: true, displayName: true, avatar: true,
                profile: { select: { id: true, title: true, headline: true, vanityUrl: true, bannerUrl: true } }
              }
            },
            receiver: {
              select: {
                id: true, username: true, displayName: true, avatar: true,
                profile: { select: { id: true, title: true, headline: true, vanityUrl: true, bannerUrl: true } }
              }
            }
          }
        });

        // Build mutual map: targetUserId → { user, count, connectors: [{name, avatar}] }
        const mutualMap = new Map();
        for (const req of secondDegree) {
          const connectorIsSender = myNetworkSet.has(req.senderId);
          const targetUser = connectorIsSender ? req.receiver : req.sender;
          const connector = connectorIsSender ? req.sender : req.receiver;

          if (excluded.has(targetUser.id)) continue;

          if (!mutualMap.has(targetUser.id)) {
            mutualMap.set(targetUser.id, { user: targetUser, count: 0, connectors: [] });
          }
          const entry = mutualMap.get(targetUser.id);
          entry.count++;
          // Keep first two connectors for display
          if (entry.connectors.length < 2) {
            entry.connectors.push({ name: connector.displayName || connector.username || '', avatar: connector.avatar || null });
          }
        }

        const sorted = Array.from(mutualMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, LIMIT);

        const toItem = ({ user, count, connectors }) => ({
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
          bannerUrl: user.profile?.bannerUrl || null,
          title: user.profile?.title || user.profile?.headline || null,
          profileId: user.profile?.id || null,
          vanityUrl: user.profile?.vanityUrl || null,
          mutualCount: count,
          mutualFirst: connectors[0] || null
        });

        if (sorted.length >= LIMIT) {
          return json({ items: sorted.map(toItem) });
        }

        // Pad with generic recent users
        const alreadySuggestedIds = new Set(sorted.map(s => s.user.id));
        const paddingExcluded = Array.from(new Set([...excludedArr, ...alreadySuggestedIds]));
        const padding = await prisma.user.findMany({
          where: { id: { notIn: paddingExcluded }, onboardingComplete: true },
          take: LIMIT - sorted.length,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, username: true, displayName: true, avatar: true,
            profile: { select: { id: true, title: true, headline: true, vanityUrl: true, bannerUrl: true } }
          }
        });

        return json({
          items: [
            ...sorted.map(toItem),
            ...padding.map(u => ({
              id: u.id, username: u.username, displayName: u.displayName, avatar: u.avatar,
              bannerUrl: u.profile?.bannerUrl || null,
              title: u.profile?.title || u.profile?.headline || null,
              profileId: u.profile?.id || null, vanityUrl: u.profile?.vanityUrl || null,
              mutualCount: 0, mutualFirst: null
            }))
          ]
        });
      }
    }

    // No network or unauthenticated — return recent users
    const users = await prisma.user.findMany({
      where: { id: { notIn: Array.from(excluded) }, onboardingComplete: true },
      take: LIMIT,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, username: true, displayName: true, avatar: true,
        profile: { select: { id: true, title: true, headline: true, vanityUrl: true, bannerUrl: true } }
      }
    });

    return json({
      items: users.map(u => ({
        id: u.id, username: u.username, displayName: u.displayName, avatar: u.avatar,
        bannerUrl: u.profile?.bannerUrl || null,
        title: u.profile?.title || u.profile?.headline || null,
        profileId: u.profile?.id || null, vanityUrl: u.profile?.vanityUrl || null,
        mutualCount: 0, mutualFirst: null
      }))
    });
  } catch (e) {
    console.error('Get suggested users error:', e);
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
