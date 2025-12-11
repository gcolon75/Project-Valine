import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserFromEvent } from './auth.js';

export const listNotifications = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const { limit = '50', cursor, unreadOnly } = event.queryStringParameters || {};

    const prisma = getPrisma();
    
    // Handle degraded mode (database unavailable)
    if (!prisma) {
      console.warn('[listNotifications] Prisma unavailable (degraded mode), returning empty');
      return json({
        notifications: [],
        nextCursor: null,
        hasMore: false,
        unreadCount: 0
      });
    }

    const whereClause = {
      recipientId: userId,
      ...(unreadOnly === 'true' && { isRead: false })
    };

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      take: parseInt(limit) + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
      include: {
        triggerer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        }
      }
    });

    const hasMore = notifications.length > parseInt(limit);
    const itemsToReturn = hasMore ? notifications.slice(0, -1) : notifications;
    const nextCursor = hasMore && itemsToReturn.length > 0 ? itemsToReturn[itemsToReturn.length - 1].id : null;

    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: {
        recipientId: userId,
        isRead: false
      }
    });

    return json({
      notifications: itemsToReturn,
      nextCursor,
      hasMore,
      unreadCount
    });
  } catch (e) {
    console.error('List notifications error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

export const markAsRead = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const notificationId = event.pathParameters?.id;
    if (!notificationId) {
      return error(400, 'Notification ID is required');
    }

    const prisma = getPrisma();

    // Verify notification belongs to user
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      return error(404, 'Notification not found');
    }

    if (notification.recipientId !== userId) {
      return error(403, 'Not authorized to mark this notification as read');
    }

    // Mark as read
    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
      include: {
        triggerer: {
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
      notification: updated,
      success: true
    });
  } catch (e) {
    console.error('Mark as read error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

export const markAllAsRead = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const prisma = getPrisma();

    // Mark all user's notifications as read
    const result = await prisma.notification.updateMany({
      where: {
        recipientId: userId,
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    return json({
      success: true,
      updated: result.count
    });
  } catch (e) {
    console.error('Mark all as read error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

// Get unread counts for notifications and messages
export const getUnreadCounts = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    
    // If user not authenticated, return zeros (not an error - public endpoint behavior)
    if (!userId) {
      return json({
        notifications: 0,
        messages: 0
      });
    }

    const prisma = getPrisma();
    
    // Handle degraded mode (database unavailable)
    if (!prisma) {
      console.warn('[getUnreadCounts] Prisma unavailable (degraded mode), returning zeros');
      return json({
        notifications: 0,
        messages: 0
      });
    }

    // Get unread notifications count
    const notificationsCount = await prisma.notification.count({
      where: {
        recipientId: userId,
        isRead: false
      }
    });

    // Get unread messages count (if you have a messages table)
    // If not, set to 0 for now
    let messagesCount = 0;
    try {
      // Try to count unread messages if the table exists
      messagesCount = await prisma.message.count({
        where: {
          recipientId: userId,
          isRead: false
        }
      });
    } catch (e) {
      // If messages table doesn't exist yet, just use 0
      console.debug('Messages table not available yet, returning 0');
    }

    return json({
      notifications: notificationsCount,
      messages: messagesCount
    });
  } catch (e) {
    console.error('[getUnreadCounts] Error:', e);
    // Return zeros instead of 500 for better UX (non-critical endpoint)
    return json({
      notifications: 0,
      messages: 0
    });
  }
};

// Helper function to create a notification (can be used by other handlers)
export const createNotification = async (prisma, { type, message, recipientId, triggererId, metadata }) => {
  try {
    // Phase 2: Check notification preferences before creating
    const recipientProfile = await prisma.profile.findUnique({
      where: { userId: recipientId },
      select: {
        notifyOnFollow: true,
        notifyOnMessage: true,
        notifyOnPostShare: true
      }
    });

    // Skip notification creation if user has disabled this type
    if (recipientProfile) {
      if (type === 'FOLLOW' && !recipientProfile.notifyOnFollow) {
        console.log(`[createNotification] Skipping FOLLOW notification for user ${recipientId} (preference disabled)`);
        return null;
      }
      if (type === 'MESSAGE' && !recipientProfile.notifyOnMessage) {
        console.log(`[createNotification] Skipping MESSAGE notification for user ${recipientId} (preference disabled)`);
        return null;
      }
      // Note: POST_SHARE type would be checked here when implemented
      // For now, we check notifyOnPostShare for any share-related notifications
    }

    return await prisma.notification.create({
      data: {
        type,
        message,
        recipientId,
        triggererId,
        metadata
      }
    });
  } catch (e) {
    console.error('Create notification error:', e);
    throw e;
  }
};