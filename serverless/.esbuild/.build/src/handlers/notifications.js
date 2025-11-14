import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserFromEvent } from './auth.js';

export const listNotifications = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error('Unauthorized', 401);
    }

    const { limit = '50', cursor, unreadOnly } = event.queryStringParameters || {};

    const prisma = getPrisma();

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
    const nextCursor = hasMore ? itemsToReturn[itemsToReturn.length - 1].id : null;

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
    return error('Server error: ' + e.message, 500);
  }
};

export const markAsRead = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error('Unauthorized', 401);
    }

    const notificationId = event.pathParameters?.id;
    if (!notificationId) {
      return error('Notification ID is required', 400);
    }

    const prisma = getPrisma();

    // Verify notification belongs to user
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      return error('Notification not found', 404);
    }

    if (notification.recipientId !== userId) {
      return error('Not authorized to mark this notification as read', 403);
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
    return error('Server error: ' + e.message, 500);
  }
};

export const markAllAsRead = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error('Unauthorized', 401);
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
    return error('Server error: ' + e.message, 500);
  }
};

// Helper function to create a notification (can be used by other handlers)
export const createNotification = async (prisma, { type, message, recipientId, triggererId, metadata }) => {
  try {
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
