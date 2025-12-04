import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';

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
      },
      distinct: ['id'],  // Dedupe by id (username is already unique per DB constraint)
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

    return json({
      items: sortedUsers,
      nextCursor,
      hasMore,
    });
  } catch (e) {
    console.error('Search users error:', e);
    return error('Server error: ' + e.message, 500);
  }
};
