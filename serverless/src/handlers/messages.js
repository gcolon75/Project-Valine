// serverless/src/handlers/messages.js
import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserFromEvent } from './auth.js';
import { createNotification } from './notifications.js';

/**
 * Helper to ensure userAId < userBId for consistent thread lookups
 */
const normalizeThreadUsers = (userA, userB) => {
  return userA < userB
    ? { userAId: userA, userBId: userB }
    : { userAId: userB, userBId: userA };
};

/**
 * GET /me/messages/threads
 * Get all DM threads for the current user
 */
export const getThreads = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const { limit = '50', cursor } = event.queryStringParameters || {};
    const prisma = getPrisma();

    // Find threads where user is either userA or userB
    const threads = await prisma.messageThread.findMany({
      where: {
        OR: [
          { userAId: userId },
          { userBId: userId }
        ]
      },
      take: parseInt(limit) + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { updatedAt: 'desc' },
      include: {
        userA: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            profile: {
              select: {
                id: true,
                vanityUrl: true,
                title: true
              }
            }
          }
        },
        userB: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            profile: {
              select: {
                id: true,
                vanityUrl: true,
                title: true
              }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            forwardedPost: {
              select: {
                id: true,
                content: true,
                createdAt: true,
                author: {
                  select: {
                    username: true,
                    displayName: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      }
    });

    const hasMore = threads.length > parseInt(limit);
    const itemsToReturn = hasMore ? threads.slice(0, -1) : threads;
    const nextCursor = hasMore && itemsToReturn.length > 0 ? itemsToReturn[itemsToReturn.length - 1].id : null;

    // Transform threads to include the other participant and unread count
    const items = await Promise.all(itemsToReturn.map(async (thread) => {
      const otherUser = thread.userAId === userId ? thread.userB : thread.userA;
      const lastMessage = thread.messages[0];

      // Count unread messages (messages sent by other user that haven't been read)
      const unreadCount = await prisma.directMessage.count({
        where: {
          threadId: thread.id,
          senderId: otherUser.id,
          readAt: null
        }
      });

      return {
        id: thread.id,
        otherUser: {
          userId: otherUser.id,
          username: otherUser.username,
          displayName: otherUser.displayName,
          avatar: otherUser.avatar,
          title: otherUser.profile?.title,
          profileId: otherUser.profile?.id,
          vanityUrl: otherUser.profile?.vanityUrl
        },
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          body: lastMessage.body,
          senderId: lastMessage.senderId,
          createdAt: lastMessage.createdAt,
          readAt: lastMessage.readAt,
          forwardedPost: lastMessage.forwardedPost
        } : null,
        unreadCount,
        messageCount: thread._count.messages,
        updatedAt: thread.updatedAt,
        createdAt: thread.createdAt
      };
    }));

    return json({
      items,
      nextCursor,
      hasMore
    });
  } catch (e) {
    console.error('Get threads error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * POST /me/messages/threads
 * Create or get existing DM thread with another user
 * Body: { recipientUserId: string }
 */
export const createThread = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const { recipientUserId } = JSON.parse(event.body || '{}');
    if (!recipientUserId) {
      return error(400, 'recipientUserId is required');
    }

    if (userId === recipientUserId) {
      return error(400, 'Cannot create thread with yourself');
    }

    const prisma = getPrisma();

    // Check if either user has blocked the other
    const blockExists = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: recipientUserId },
          { blockerId: recipientUserId, blockedId: userId }
        ]
      }
    });

    if (blockExists) {
      return error(403, 'Cannot create thread with this user');
    }

    // Normalize user IDs for consistent lookup
    const { userAId, userBId } = normalizeThreadUsers(userId, recipientUserId);

    // Try to find existing thread
    let thread = await prisma.messageThread.findUnique({
      where: {
        userAId_userBId: { userAId, userBId }
      },
      include: {
        userA: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            profile: {
              select: {
                id: true,
                vanityUrl: true,
                title: true
              }
            }
          }
        },
        userB: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            profile: {
              select: {
                id: true,
                vanityUrl: true,
                title: true
              }
            }
          }
        }
      }
    });

    // If thread doesn't exist, create it
    if (!thread) {
      thread = await prisma.messageThread.create({
        data: {
          userAId,
          userBId
        },
        include: {
          userA: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              profile: {
                select: {
                  id: true,
                  vanityUrl: true,
                  title: true
                }
              }
            }
          },
          userB: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              profile: {
                select: {
                  id: true,
                  vanityUrl: true,
                  title: true
                }
              }
            }
          }
        }
      });
    }

    const otherUser = thread.userAId === userId ? thread.userB : thread.userA;

    return json({
      id: thread.id,
      otherUser: {
        userId: otherUser.id,
        username: otherUser.username,
        displayName: otherUser.displayName,
        avatar: otherUser.avatar,
        title: otherUser.profile?.title,
        profileId: otherUser.profile?.id,
        vanityUrl: otherUser.profile?.vanityUrl
      },
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt
    }, thread.createdAt === thread.updatedAt ? 201 : 200);
  } catch (e) {
    console.error('Create thread error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * GET /me/messages/threads/{threadId}
 * Get messages in a DM thread
 */
export const getThread = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const threadId = event.pathParameters?.threadId;
    if (!threadId) {
      return error(400, 'threadId is required');
    }

    const { limit = '50', cursor } = event.queryStringParameters || {};
    const prisma = getPrisma();

    // Verify user is a participant
    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
      include: {
        userA: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        },
        userB: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        }
      }
    });

    if (!thread) {
      return error(404, 'Thread not found');
    }

    if (thread.userAId !== userId && thread.userBId !== userId) {
      return error(403, 'Not authorized to view this thread');
    }

    // Get messages
    const messages = await prisma.directMessage.findMany({
      where: { threadId },
      take: parseInt(limit) + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
      include: {
        forwardedPost: {
          select: {
            id: true,
            content: true,
            media: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    const hasMore = messages.length > parseInt(limit);
    const itemsToReturn = hasMore ? messages.slice(0, -1) : messages;
    const nextCursor = hasMore && itemsToReturn.length > 0 ? itemsToReturn[itemsToReturn.length - 1].id : null;

    // Mark all messages from the other user as read
    const otherUserId = thread.userAId === userId ? thread.userBId : thread.userAId;
    await prisma.directMessage.updateMany({
      where: {
        threadId,
        senderId: otherUserId,
        readAt: null
      },
      data: {
        readAt: new Date()
      }
    });

    const otherUser = thread.userAId === userId ? thread.userB : thread.userA;

    return json({
      thread: {
        id: thread.id,
        otherUser: {
          userId: otherUser.id,
          username: otherUser.username,
          displayName: otherUser.displayName,
          avatar: otherUser.avatar
        }
      },
      messages: itemsToReturn.reverse(), // Show oldest first
      nextCursor,
      hasMore
    });
  } catch (e) {
    console.error('Get thread error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * POST /me/messages/threads/{threadId}/messages
 * Send a message in a DM thread
 * Body: { body: string, forwardedPostId?: string }
 */
export const sendMessage = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const threadId = event.pathParameters?.threadId;
    if (!threadId) {
      return error(400, 'threadId is required');
    }

    const { body: messageBody, forwardedPostId } = JSON.parse(event.body || '{}');
    // Body is optional when forwarding a post
    if ((!messageBody || messageBody.trim().length === 0) && !forwardedPostId) {
      return error(400, 'Message body or forwardedPostId is required');
    }

    const prisma = getPrisma();

    // Verify user is a participant
    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId }
    });

    if (!thread) {
      return error(404, 'Thread not found');
    }

    if (thread.userAId !== userId && thread.userBId !== userId) {
      return error(403, 'Not authorized to send messages in this thread');
    }

    // Check if blocked
    const otherUserId = thread.userAId === userId ? thread.userBId : thread.userAId;
    const blockExists = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: otherUserId },
          { blockerId: otherUserId, blockedId: userId }
        ]
      }
    });

    if (blockExists) {
      return error(403, 'Cannot send message to this user');
    }

    // If forwardedPostId is provided, verify it exists
    if (forwardedPostId) {
      const post = await prisma.post.findUnique({
        where: { id: forwardedPostId }
      });
      if (!post) {
        return error(404, 'Forwarded post not found');
      }
    }

    // Create message and update thread
    const message = await prisma.$transaction(async (tx) => {
      const msg = await tx.directMessage.create({
        data: {
          threadId,
          senderId: userId,
          body: messageBody ? messageBody.trim() : '',
          forwardedPostId: forwardedPostId || null
        },
        include: {
          forwardedPost: {
            select: {
              id: true,
              content: true,
              media: true,
              createdAt: true,
              author: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatar: true
                }
              }
            }
          }
        }
      });

      // Update thread updatedAt
      await tx.messageThread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() }
      });

      return msg;
    });

    // Create notification for the other user
    try {
      await createNotification(prisma, {
        type: 'MESSAGE',
        message: 'sent you a message',
        recipientId: otherUserId,
        triggererId: userId,
        messageThreadId: threadId,
        messageId: message.id,
        metadata: {}
      });
    } catch (notifError) {
      console.error('Failed to create message notification:', notifError);
      // Don't fail the request if notification fails
    }

    return json({
      message: {
        id: message.id,
        body: message.body,
        senderId: message.senderId,
        createdAt: message.createdAt,
        readAt: message.readAt,
        forwardedPost: message.forwardedPost
      }
    }, 201);
  } catch (e) {
    console.error('Send message error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};
