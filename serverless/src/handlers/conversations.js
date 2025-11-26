import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserFromEvent } from './auth.js';

export const listConversations = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const { limit = '20', cursor } = event.queryStringParameters || {};

    const prisma = getPrisma();

    // Get conversations where user is a participant
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId
          }
        }
      },
      take: parseInt(limit) + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { lastMessageAt: 'desc' },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true
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

    const hasMore = conversations.length > parseInt(limit);
    const itemsToReturn = hasMore ? conversations.slice(0, -1) : conversations;
    const nextCursor = hasMore ? itemsToReturn[itemsToReturn.length - 1].id : null;

    // Transform to include other participants (excluding current user)
    const items = itemsToReturn.map(conv => ({
      id: conv.id,
      title: conv.title,
      lastMessage: conv.lastMessage,
      lastMessageAt: conv.lastMessageAt,
      participants: conv.participants
        .filter(p => p.userId !== userId)
        .map(p => p.user),
      messageCount: conv._count.messages,
      createdAt: conv.createdAt
    }));

    return json({
      items,
      nextCursor,
      hasMore
    });
  } catch (e) {
    console.error('List conversations error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

export const getMessages = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const conversationId = event.pathParameters?.id;
    if (!conversationId) {
      return error(400, 'Conversation ID is required');
    }

    const { limit = '50', cursor } = event.queryStringParameters || {};

    const prisma = getPrisma();

    // Verify user is a participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId
        }
      }
    });

    if (!participant) {
      return error(403, 'Not authorized to view this conversation');
    }

    // Get messages
    const messages = await prisma.message.findMany({
      where: { conversationId },
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
        }
      }
    });

    const hasMore = messages.length > parseInt(limit);
    const itemsToReturn = hasMore ? messages.slice(0, -1) : messages;
    const nextCursor = hasMore ? itemsToReturn[itemsToReturn.length - 1].id : null;

    return json({
      messages: itemsToReturn.reverse(), // Show oldest first
      nextCursor,
      hasMore
    });
  } catch (e) {
    console.error('Get messages error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

export const sendMessage = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const conversationId = event.pathParameters?.id;
    if (!conversationId) {
      return error(400, 'Conversation ID is required');
    }

    const { text } = JSON.parse(event.body || '{}');
    if (!text || text.trim().length === 0) {
      return error(400, 'Message text is required');
    }

    const prisma = getPrisma();

    // Verify user is a participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId
        }
      }
    });

    if (!participant) {
      return error(403, 'Not authorized to send messages in this conversation');
    }

    // Create message and update conversation
    const message = await prisma.message.create({
      data: {
        text: text.trim(),
        conversationId,
        senderId: userId
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        }
      }
    });

    // Update conversation last message
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: text.trim().substring(0, 100),
        lastMessageAt: new Date()
      }
    });

    return json({
      message
    }, 201);
  } catch (e) {
    console.error('Send message error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

export const createConversation = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const { participantIds, title } = JSON.parse(event.body || '{}');
    
    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return error(400, 'participantIds array is required');
    }

    const prisma = getPrisma();

    // Create conversation with participants
    const conversation = await prisma.conversation.create({
      data: {
        title,
        participants: {
          create: [
            { userId }, // Creator
            ...participantIds.map(id => ({ userId: id }))
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
                avatar: true
              }
            }
          }
        }
      }
    });

    return json({
      id: conversation.id,
      title: conversation.title,
      participants: conversation.participants
        .filter(p => p.userId !== userId)
        .map(p => p.user),
      createdAt: conversation.createdAt
    }, 201);
  } catch (e) {
    console.error('Create conversation error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};
