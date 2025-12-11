// serverless/src/handlers/social.js
import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserFromEvent } from './auth.js';
import { createNotification } from './notifications.js';

/**
 * POST /profiles/{profileId}/follow
 * Follow a user using the new Follow model
 */
export const followProfile = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const targetProfileId = event.pathParameters?.profileId;
    if (!targetProfileId) {
      return error(400, 'profileId is required');
    }

    const prisma = getPrisma();

    // Get the target user from their profile ID
    const targetProfile = await prisma.profile.findUnique({
      where: { id: targetProfileId },
      select: { userId: true }
    });

    if (!targetProfile) {
      return error(404, 'Profile not found');
    }

    const targetUserId = targetProfile.userId;

    if (userId === targetUserId) {
      return error(400, 'Cannot follow yourself');
    }

    // Check if either user has blocked the other
    const blockExists = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: userId }
        ]
      }
    });

    if (blockExists) {
      return error(403, 'Cannot follow this user');
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId
        }
      }
    });

    if (existingFollow) {
      return json({ isFollowing: true, message: 'Already following this user' });
    }

    // Create follow relationship
    await prisma.follow.create({
      data: {
        followerId: userId,
        followingId: targetUserId
      }
    });

    // Update follower counts
    await prisma.$transaction([
      prisma.profile.update({
        where: { userId: targetUserId },
        data: { followersCount: { increment: 1 } }
      }),
      prisma.profile.update({
        where: { userId },
        data: { followingCount: { increment: 1 } }
      })
    ]);

    // Create notification for the followed user
    try {
      await createNotification(prisma, {
        type: 'FOLLOW',
        message: 'started following you',
        recipientId: targetUserId,
        triggererId: userId,
        metadata: {}
      });
    } catch (notifError) {
      console.error('Failed to create follow notification:', notifError);
      // Don't fail the request if notification fails
    }

    return json({ isFollowing: true, message: 'Successfully followed user' }, 201);
  } catch (e) {
    console.error('Follow profile error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * DELETE /profiles/{profileId}/follow
 * Unfollow a user
 */
export const unfollowProfile = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const targetProfileId = event.pathParameters?.profileId;
    if (!targetProfileId) {
      return error(400, 'profileId is required');
    }

    const prisma = getPrisma();

    // Get the target user from their profile ID
    const targetProfile = await prisma.profile.findUnique({
      where: { id: targetProfileId },
      select: { userId: true }
    });

    if (!targetProfile) {
      return error(404, 'Profile not found');
    }

    const targetUserId = targetProfile.userId;

    // Delete follow relationship
    const result = await prisma.follow.deleteMany({
      where: {
        followerId: userId,
        followingId: targetUserId
      }
    });

    if (result.count === 0) {
      return json({ isFollowing: false, message: 'Not following this user' });
    }

    // Update follower counts
    await prisma.$transaction([
      prisma.profile.update({
        where: { userId: targetUserId },
        data: { followersCount: { decrement: 1 } }
      }),
      prisma.profile.update({
        where: { userId },
        data: { followingCount: { decrement: 1 } }
      })
    ]);

    return json({ isFollowing: false, message: 'Successfully unfollowed user' });
  } catch (e) {
    console.error('Unfollow profile error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * GET /profiles/{profileId}/followers
 * Get followers list for a profile
 */
export const getProfileFollowers = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    // Not required to be authenticated to view followers

    const targetProfileId = event.pathParameters?.profileId;
    if (!targetProfileId) {
      return error(400, 'profileId is required');
    }

    const prisma = getPrisma();

    // Get the target user from their profile ID
    const targetProfile = await prisma.profile.findUnique({
      where: { id: targetProfileId },
      select: { userId: true }
    });

    if (!targetProfile) {
      return error(404, 'Profile not found');
    }

    const targetUserId = targetProfile.userId;

    // Get followers
    const followers = await prisma.follow.findMany({
      where: { followingId: targetUserId },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            profile: {
              select: {
                id: true,
                title: true,
                vanityUrl: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Check if viewing user is blocked by any of these users or has blocked them
    let blockedUserIds = [];
    if (userId) {
      const blocks = await prisma.block.findMany({
        where: {
          OR: [
            { blockerId: userId },
            { blockedId: userId }
          ]
        },
        select: {
          blockerId: true,
          blockedId: true
        }
      });

      blockedUserIds = blocks.flatMap(b => [b.blockerId, b.blockedId]);
    }

    // Filter out blocked users
    const items = followers
      .filter(f => !blockedUserIds.includes(f.follower.id))
      .map(f => ({
        userId: f.follower.id,
        username: f.follower.username,
        displayName: f.follower.displayName,
        avatar: f.follower.avatar,
        title: f.follower.profile?.title,
        profileId: f.follower.profile?.id,
        vanityUrl: f.follower.profile?.vanityUrl,
        followedAt: f.createdAt
      }));

    return json({ items, count: items.length });
  } catch (e) {
    console.error('Get profile followers error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * GET /profiles/{profileId}/following
 * Get following list for a profile
 */
export const getProfileFollowing = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    // Not required to be authenticated to view following

    const targetProfileId = event.pathParameters?.profileId;
    if (!targetProfileId) {
      return error(400, 'profileId is required');
    }

    const prisma = getPrisma();

    // Get the target user from their profile ID
    const targetProfile = await prisma.profile.findUnique({
      where: { id: targetProfileId },
      select: { userId: true }
    });

    if (!targetProfile) {
      return error(404, 'Profile not found');
    }

    const targetUserId = targetProfile.userId;

    // Get following
    const following = await prisma.follow.findMany({
      where: { followerId: targetUserId },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            profile: {
              select: {
                id: true,
                title: true,
                vanityUrl: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Check if viewing user is blocked by any of these users or has blocked them
    let blockedUserIds = [];
    if (userId) {
      const blocks = await prisma.block.findMany({
        where: {
          OR: [
            { blockerId: userId },
            { blockedId: userId }
          ]
        },
        select: {
          blockerId: true,
          blockedId: true
        }
      });

      blockedUserIds = blocks.flatMap(b => [b.blockerId, b.blockedId]);
    }

    // Filter out blocked users
    const items = following
      .filter(f => !blockedUserIds.includes(f.following.id))
      .map(f => ({
        userId: f.following.id,
        username: f.following.username,
        displayName: f.following.displayName,
        avatar: f.following.avatar,
        title: f.following.profile?.title,
        profileId: f.following.profile?.id,
        vanityUrl: f.following.profile?.vanityUrl,
        followedAt: f.createdAt
      }));

    return json({ items, count: items.length });
  } catch (e) {
    console.error('Get profile following error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * GET /me/followers
 * Get current user's followers
 */
export const getMyFollowers = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const prisma = getPrisma();

    // Get user's profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!profile) {
      return error(404, 'Profile not found');
    }

    // Reuse the getProfileFollowers logic
    const modifiedEvent = {
      ...event,
      pathParameters: { profileId: profile.id }
    };

    return getProfileFollowers(modifiedEvent);
  } catch (e) {
    console.error('Get my followers error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * GET /me/following
 * Get current user's following list
 */
export const getMyFollowing = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const prisma = getPrisma();

    // Get user's profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!profile) {
      return error(404, 'Profile not found');
    }

    // Reuse the getProfileFollowing logic
    const modifiedEvent = {
      ...event,
      pathParameters: { profileId: profile.id }
    };

    return getProfileFollowing(modifiedEvent);
  } catch (e) {
    console.error('Get my following error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * POST /profiles/{profileId}/block
 * Block a user
 */
export const blockProfile = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const targetProfileId = event.pathParameters?.profileId;
    if (!targetProfileId) {
      return error(400, 'profileId is required');
    }

    const prisma = getPrisma();

    // Get the target user from their profile ID
    const targetProfile = await prisma.profile.findUnique({
      where: { id: targetProfileId },
      select: { userId: true }
    });

    if (!targetProfile) {
      return error(404, 'Profile not found');
    }

    const targetUserId = targetProfile.userId;

    if (userId === targetUserId) {
      return error(400, 'Cannot block yourself');
    }

    // Check if already blocked
    const existingBlock = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: userId,
          blockedId: targetUserId
        }
      }
    });

    if (existingBlock) {
      return json({ isBlocked: true, message: 'Already blocked this user' });
    }

    // Create block and remove follow relationships in a transaction
    await prisma.$transaction(async (tx) => {
      // Create block
      await tx.block.create({
        data: {
          blockerId: userId,
          blockedId: targetUserId
        }
      });

      // Remove follow relationships both ways
      const followsToDelete = await tx.follow.findMany({
        where: {
          OR: [
            { followerId: userId, followingId: targetUserId },
            { followerId: targetUserId, followingId: userId }
          ]
        }
      });

      if (followsToDelete.length > 0) {
        await tx.follow.deleteMany({
          where: {
            OR: [
              { followerId: userId, followingId: targetUserId },
              { followerId: targetUserId, followingId: userId }
            ]
          }
        });

        // Update follower counts for each deleted follow
        for (const follow of followsToDelete) {
          await tx.profile.update({
            where: { userId: follow.followingId },
            data: { followersCount: { decrement: 1 } }
          });
          await tx.profile.update({
            where: { userId: follow.followerId },
            data: { followingCount: { decrement: 1 } }
          });
        }
      }
    });

    return json({ isBlocked: true, message: 'Successfully blocked user' }, 201);
  } catch (e) {
    console.error('Block profile error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * DELETE /profiles/{profileId}/block
 * Unblock a user
 */
export const unblockProfile = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const targetProfileId = event.pathParameters?.profileId;
    if (!targetProfileId) {
      return error(400, 'profileId is required');
    }

    const prisma = getPrisma();

    // Get the target user from their profile ID
    const targetProfile = await prisma.profile.findUnique({
      where: { id: targetProfileId },
      select: { userId: true }
    });

    if (!targetProfile) {
      return error(404, 'Profile not found');
    }

    const targetUserId = targetProfile.userId;

    // Delete block relationship
    const result = await prisma.block.deleteMany({
      where: {
        blockerId: userId,
        blockedId: targetUserId
      }
    });

    if (result.count === 0) {
      return json({ isBlocked: false, message: 'User was not blocked' });
    }

    return json({ isBlocked: false, message: 'Successfully unblocked user' });
  } catch (e) {
    console.error('Unblock profile error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * GET /me/blocks
 * Get list of users current user has blocked
 */
export const getMyBlocks = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const prisma = getPrisma();

    const blocks = await prisma.block.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            profile: {
              select: {
                id: true,
                title: true,
                vanityUrl: true
              }
            }
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

/**
 * GET /profiles/{profileId}/status
 * Get connection status with a profile (following, blocked, etc.)
 */
export const getProfileStatus = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return json({
        isFollowing: false,
        isFollowedBy: false,
        isBlocked: false,
        isBlockedBy: false
      });
    }

    const targetProfileId = event.pathParameters?.profileId;
    if (!targetProfileId) {
      return error(400, 'profileId is required');
    }

    const prisma = getPrisma();

    // Get the target user from their profile ID
    const targetProfile = await prisma.profile.findUnique({
      where: { id: targetProfileId },
      select: { 
        userId: true,
        visibility: true,
        messagePermission: true
      }
    });

    if (!targetProfile) {
      return error(404, 'Profile not found');
    }

    const targetUserId = targetProfile.userId;

    // Get follow status
    const [following, followedBy, blocking, blockedBy] = await Promise.all([
      prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: targetUserId
          }
        }
      }),
      prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: targetUserId,
            followingId: userId
          }
        }
      }),
      prisma.block.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: userId,
            blockedId: targetUserId
          }
        }
      }),
      prisma.block.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: targetUserId,
            blockedId: userId
          }
        }
      })
    ]);

    return json({
      isFollowing: !!following,
      isFollowedBy: !!followedBy,
      isBlocked: !!blocking,
      isBlockedBy: !!blockedBy,
      // Phase 2: Privacy & messaging preferences
      visibility: targetProfile.visibility || 'PUBLIC',
      messagePermission: targetProfile.messagePermission || 'EVERYONE'
    });
  } catch (e) {
    console.error('Get profile status error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};
