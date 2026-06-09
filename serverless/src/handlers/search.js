import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserFromEvent } from './auth.js';

/**
 * GET /api/search
 * Search profiles by name, role, tags, location
 */
export const searchProfiles = async (event) => {
  try {
    const { query, role, location, limit = '20', cursor } = event.queryStringParameters || {};

    if (!query && !role && !location) {
      return error('At least one search parameter (query, role, or location) is required', 400);
    }

    const prisma = getPrisma();

    // Build search conditions
    const where = {
      AND: [],
    };

    // Text search in multiple fields
    if (query) {
      where.OR = [
        { vanityUrl: { contains: query, mode: 'insensitive' } },
        { headline: { contains: query, mode: 'insensitive' } },
        { bio: { contains: query, mode: 'insensitive' } },
        { tags: { has: query } },
        {
          user: {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { displayName: { contains: query, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    // Filter by role
    if (role) {
      where.AND.push({
        roles: { has: role },
      });
    }

    // Filter by location (city, state, or country)
    if (location) {
      where.AND.push({
        location: {
          path: ['$'],
          string_contains: location,
        },
      });
    }

    // Only show public profiles in search
    where.AND.push({
      privacy: {
        path: ['visibility'],
        equals: 'public',
      },
    });

    // Clean up empty AND array
    if (where.AND.length === 0) {
      delete where.AND;
    }

    const profiles = await prisma.profile.findMany({
      where,
      take: parseInt(limit) + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            media: true,
            credits: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = profiles.length > parseInt(limit);
    const itemsToReturn = hasMore ? profiles.slice(0, -1) : profiles;
    const nextCursor = hasMore ? itemsToReturn[itemsToReturn.length - 1].id : null;

    return json({
      items: itemsToReturn,
      nextCursor,
      hasMore,
      query: {
        query,
        role,
        location,
      },
    });
  } catch (e) {
    console.error('Search profiles error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

/**
 * GET /api/search/users
 * Search users by username or display name
 */
export const searchUsers = async (event) => {
  try {
    const { query, limit = '20', cursor } = event.queryStringParameters || {};

    if (!query) {
      return error('query parameter is required', 400);
    }

    const requesterId = getUserFromEvent(event);
    const prisma = getPrisma();

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: parseInt(limit) + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        bio: true,
        role: true,
        createdAt: true,
        profile: {
          select: {
            id: true,
            visibility: true,
            title: true,
            headline: true,
            bannerUrl: true,
          },
        },
      },
      distinct: ['id'],
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = users.length > parseInt(limit);
    const itemsToReturn = hasMore ? users.slice(0, -1) : users;
    const nextCursor = hasMore ? itemsToReturn[itemsToReturn.length - 1].id : null;

    // Sort to prioritize exact username matches
    const queryLower = query.toLowerCase();
    const sortedUsers = itemsToReturn.sort((a, b) => {
      const aExact = a.username?.toLowerCase() === queryLower;
      const bExact = b.username?.toLowerCase() === queryLower;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return 0;
    });

    // Add mutual connection data for authenticated users
    let finalUsers = sortedUsers;
    if (requesterId && sortedUsers.length > 0) {
      const myConnections = await prisma.connectionRequest.findMany({
        where: { status: 'accepted', OR: [{ senderId: requesterId }, { receiverId: requesterId }] },
        select: {
          senderId: true, receiverId: true,
          sender: { select: { id: true, displayName: true, username: true, avatar: true } },
          receiver: { select: { id: true, displayName: true, username: true, avatar: true } }
        }
      });

      const myNetworkSet = new Set();
      const myNetworkMap = new Map();
      myConnections.forEach(c => {
        const other = c.senderId === requesterId ? c.receiver : c.sender;
        myNetworkSet.add(other.id);
        myNetworkMap.set(other.id, other);
      });

      if (myNetworkSet.size > 0) {
        const resultUserIds = sortedUsers.map(u => u.id);
        const myNetworkArr = Array.from(myNetworkSet);

        // Find connections between my network members and the search result users
        const mutualConnections = await prisma.connectionRequest.findMany({
          where: {
            status: 'accepted',
            OR: [
              { senderId: { in: myNetworkArr }, receiverId: { in: resultUserIds } },
              { receiverId: { in: myNetworkArr }, senderId: { in: resultUserIds } }
            ]
          },
          select: { senderId: true, receiverId: true }
        });

        const resultUserIdSet = new Set(resultUserIds);
        const mutualMap = new Map();
        for (const conn of mutualConnections) {
          const isMyNetworkSender = myNetworkSet.has(conn.senderId);
          const resultUserId = isMyNetworkSender ? conn.receiverId : conn.senderId;
          const connectorId = isMyNetworkSender ? conn.senderId : conn.receiverId;
          if (!resultUserIdSet.has(resultUserId)) continue;
          if (!mutualMap.has(resultUserId)) mutualMap.set(resultUserId, []);
          mutualMap.get(resultUserId).push(connectorId);
        }

        finalUsers = sortedUsers.map(u => {
          const connectorIds = mutualMap.get(u.id) || [];
          const mutualCount = new Set(connectorIds).size;
          const firstConnector = connectorIds[0] ? myNetworkMap.get(connectorIds[0]) : null;
          return {
            ...u,
            mutualCount,
            mutualFirst: firstConnector ? { name: firstConnector.displayName || firstConnector.username, avatar: firstConnector.avatar } : null
          };
        });
      }
    }

    return json({
      items: finalUsers,
      nextCursor,
      hasMore,
    });
  } catch (e) {
    console.error('Search users error:', e);
    return error('Server error: ' + e.message, 500);
  }
};
