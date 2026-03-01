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
 * Get all DM threads for the current user (including group chats)
 */
export const getThreads = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const { limit = '50', cursor } = event.queryStringParameters || {};
    const prisma = getPrisma();

    // Find threads where user is either userA/userB (1:1) OR a participant (group)
    const threads = await prisma.messageThread.findMany({
      where: {
        OR: [
          { userAId: userId },
          { userBId: userId },
          { participants: { some: { userId } } }
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
        participants: {
          include: {
            user: {
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

    // Transform threads to include the other participant(s) and unread count
    const items = await Promise.all(itemsToReturn.map(async (thread) => {
      const lastMessage = thread.messages[0];

      if (thread.isGroup) {
        // Group chat - get all participants except current user
        const otherParticipants = thread.participants
          .filter(p => p.userId !== userId)
          .map(p => ({
            userId: p.user.id,
            username: p.user.username,
            displayName: p.user.displayName,
            avatar: p.user.avatar,
            title: p.user.profile?.title,
            role: p.role
          }));

        // Count unread messages (messages not sent by current user that haven't been read)
        const unreadCount = await prisma.directMessage.count({
          where: {
            threadId: thread.id,
            senderId: { not: userId },
            readAt: null
          }
        });

        return {
          id: thread.id,
          isGroup: true,
          name: thread.name,
          participants: otherParticipants,
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
      } else {
        // 1:1 chat
        const otherUser = thread.userAId === userId ? thread.userB : thread.userA;

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
          isGroup: false,
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
      }
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

    // Phase 2: Check recipient's message permission
    const recipientProfile = await prisma.profile.findUnique({
      where: { userId: recipientUserId },
      select: {
        messagePermission: true
      }
    });

    if (recipientProfile) {
      // NO_ONE: Reject all except self (shouldn't happen)
      if (recipientProfile.messagePermission === 'NO_ONE') {
        return error(403, 'This user has disabled direct messages');
      }

      // FOLLOWERS_ONLY: Check if requester follows recipient
      if (recipientProfile.messagePermission === 'FOLLOWERS_ONLY') {
        const isFollowing = await prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: userId,
              followingId: recipientUserId
            }
          }
        });

        if (!isFollowing) {
          return error(403, 'You must follow this user to send them messages');
        }
      }

      // EVERYONE: Allow (default behavior)
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
 * POST /me/messages/threads/group
 * Create a new group chat
 * Body: { name: string, participantIds: string[] }
 */
export const createGroupThread = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const { name, participantIds } = JSON.parse(event.body || '{}');

    if (!name || name.trim().length === 0) {
      return error(400, 'Group name is required');
    }

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length < 1) {
      return error(400, 'At least one other participant is required');
    }

    if (participantIds.length > 50) {
      return error(400, 'Maximum 50 participants allowed');
    }

    // Remove duplicates and the creator from participant list
    const uniqueParticipantIds = [...new Set(participantIds)].filter(id => id !== userId);

    if (uniqueParticipantIds.length === 0) {
      return error(400, 'At least one other participant is required');
    }

    const prisma = getPrisma();

    // Verify all participants exist
    const users = await prisma.user.findMany({
      where: { id: { in: uniqueParticipantIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        profile: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    if (users.length !== uniqueParticipantIds.length) {
      return error(400, 'One or more participants not found');
    }

    // Check if any participant has blocked the creator
    const blocks = await prisma.block.findMany({
      where: {
        OR: [
          { blockerId: userId, blockedId: { in: uniqueParticipantIds } },
          { blockerId: { in: uniqueParticipantIds }, blockedId: userId }
        ]
      }
    });

    if (blocks.length > 0) {
      return error(403, 'Cannot add blocked users to group');
    }

    // Create the group thread with participants
    const thread = await prisma.messageThread.create({
      data: {
        isGroup: true,
        name: name.trim(),
        participants: {
          create: [
            // Creator is admin
            { userId, role: 'admin' },
            // Other participants are members
            ...uniqueParticipantIds.map(id => ({ userId: id, role: 'member' }))
          ]
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                profile: {
                  select: {
                    id: true,
                    title: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const participants = thread.participants.map(p => ({
      userId: p.user.id,
      username: p.user.username,
      displayName: p.user.displayName,
      avatar: p.user.avatar,
      title: p.user.profile?.title,
      role: p.role
    }));

    return json({
      id: thread.id,
      isGroup: true,
      name: thread.name,
      participants,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt
    }, 201);
  } catch (e) {
    console.error('Create group thread error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * GET /me/messages/threads/{threadId}
 * Get messages in a DM thread (supports both 1:1 and group chats)
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
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                profile: {
                  select: {
                    title: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!thread) {
      return error(404, 'Thread not found');
    }

    // Check authorization based on thread type
    const isParticipant = thread.isGroup
      ? thread.participants.some(p => p.userId === userId)
      : thread.userAId === userId || thread.userBId === userId;

    if (!isParticipant) {
      return error(403, 'Not authorized to view this thread');
    }

    // Get messages with sender info for group chats
    const messages = await prisma.directMessage.findMany({
      where: { threadId },
      take: parseInt(limit) + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        },
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

    // Mark all messages from other users as read
    await prisma.directMessage.updateMany({
      where: {
        threadId,
        senderId: { not: userId },
        readAt: null
      },
      data: {
        readAt: new Date()
      }
    });

    // Build response based on thread type
    let threadData;
    if (thread.isGroup) {
      const participants = thread.participants.map(p => ({
        userId: p.user.id,
        username: p.user.username,
        displayName: p.user.displayName,
        avatar: p.user.avatar,
        title: p.user.profile?.title,
        role: p.role
      }));

      threadData = {
        id: thread.id,
        isGroup: true,
        name: thread.name,
        participants
      };
    } else {
      const otherUser = thread.userAId === userId ? thread.userB : thread.userA;
      threadData = {
        id: thread.id,
        isGroup: false,
        otherUser: {
          userId: otherUser.id,
          username: otherUser.username,
          displayName: otherUser.displayName,
          avatar: otherUser.avatar
        }
      };
    }

    // Transform messages to include sender info
    const transformedMessages = itemsToReturn.reverse().map(msg => ({
      id: msg.id,
      body: msg.body,
      senderId: msg.senderId,
      sender: msg.sender,
      createdAt: msg.createdAt,
      readAt: msg.readAt,
      forwardedPost: msg.forwardedPost
    }));

    return json({
      thread: threadData,
      messages: transformedMessages,
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
 * Send a message in a DM thread (supports both 1:1 and group chats)
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
      where: { id: threadId },
      include: {
        participants: true
      }
    });

    if (!thread) {
      return error(404, 'Thread not found');
    }

    // Check authorization based on thread type
    const isParticipant = thread.isGroup
      ? thread.participants.some(p => p.userId === userId)
      : thread.userAId === userId || thread.userBId === userId;

    if (!isParticipant) {
      return error(403, 'Not authorized to send messages in this thread');
    }

    // For 1:1 chats, check if blocked
    if (!thread.isGroup) {
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
          sender: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true
            }
          },
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

    // Create notifications for recipients
    try {
      if (thread.isGroup) {
        // Notify all other participants in group
        const otherParticipants = thread.participants.filter(p => p.userId !== userId);
        for (const participant of otherParticipants) {
          await createNotification(prisma, {
            type: 'MESSAGE',
            message: `sent a message in ${thread.name}`,
            recipientId: participant.userId,
            triggererId: userId,
            messageThreadId: threadId,
            messageId: message.id,
            metadata: { isGroup: true, groupName: thread.name }
          });
        }
      } else {
        // Notify the other user in 1:1 chat
        const otherUserId = thread.userAId === userId ? thread.userBId : thread.userAId;
        await createNotification(prisma, {
          type: 'MESSAGE',
          message: 'sent you a message',
          recipientId: otherUserId,
          triggererId: userId,
          messageThreadId: threadId,
          messageId: message.id,
          metadata: {}
        });
      }
    } catch (notifError) {
      console.error('Failed to create message notification:', notifError);
      // Don't fail the request if notification fails
    }

    return json({
      message: {
        id: message.id,
        body: message.body,
        senderId: message.senderId,
        sender: message.sender,
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
