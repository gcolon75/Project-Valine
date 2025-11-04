import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserFromEvent } from './auth.js';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
};

/**
 * GET /api/profiles/:vanityUrl
 * Get profile by vanity URL with privacy filtering
 */
export const getProfileByVanity = async (event) => {
  try {
    const { vanityUrl } = event.pathParameters || {};
    if (!vanityUrl) {
      return error('vanityUrl is required', 400);
    }

    const viewerId = getUserFromEvent(event); // May be null for unauthenticated
    const prisma = getPrisma();

    const profile = await prisma.profile.findUnique({
      where: { vanityUrl },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            createdAt: true,
          },
        },
        media: {
          where: {
            // Filter media based on privacy
            OR: [
              { privacy: 'public' },
              ...(viewerId ? [{ privacy: 'on-request' }] : []),
            ],
          },
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            posterS3Key: true,
            privacy: true,
            duration: true,
            width: true,
            height: true,
            processedStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        credits: {
          orderBy: [{ year: 'desc' }, { orderIndex: 'asc' }],
        },
        _count: {
          select: {
            media: true,
            credits: true,
          },
        },
      },
    });

    if (!profile) {
      return error('Profile not found', 404);
    }

    // Apply privacy filtering
    const privacy = profile.privacy || {};
    const isOwner = viewerId === profile.userId;

    // Filter profile data based on privacy settings
    const filteredProfile = {
      id: profile.id,
      vanityUrl: profile.vanityUrl,
      headline: profile.headline,
      bio: profile.bio,
      roles: profile.roles,
      location: profile.location,
      tags: profile.tags,
      socialLinks: profile.socialLinks,
      user: profile.user,
      media: profile.media,
      credits: profile.credits,
      counts: profile._count,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };

    // Remove sensitive fields based on privacy
    if (!isOwner && privacy.visibility === 'private') {
      return error('This profile is private', 403);
    }

    return json(filteredProfile);
  } catch (e) {
    console.error('Get profile error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

/**
 * GET /api/profiles/:id
 * Get profile by ID (full access for owner)
 */
export const getProfileById = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    if (!id) {
      return error('id is required', 400);
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error('Unauthorized', 401);
    }

    const prisma = getPrisma();

    const profile = await prisma.profile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
            avatar: true,
            createdAt: true,
          },
        },
        media: {
          orderBy: { createdAt: 'desc' },
        },
        credits: {
          orderBy: [{ year: 'desc' }, { orderIndex: 'asc' }],
        },
        _count: {
          select: {
            media: true,
            credits: true,
          },
        },
      },
    });

    if (!profile) {
      return error('Profile not found', 404);
    }

    // Check if user is owner
    if (profile.userId !== userId) {
      return error('Forbidden - not profile owner', 403);
    }

    return json(profile);
  } catch (e) {
    console.error('Get profile by ID error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

/**
 * POST /api/profiles
 * Create a new profile for authenticated user
 */
export const createProfile = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error('Unauthorized', 401);
    }

    const body = JSON.parse(event.body || '{}');
    const { vanityUrl, headline, bio, roles, location, tags, socialLinks } = body;

    if (!vanityUrl) {
      return error('vanityUrl is required', 400);
    }

    // Validate vanity URL format (alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(vanityUrl)) {
      return error('vanityUrl must contain only letters, numbers, hyphens, and underscores', 400);
    }

    const prisma = getPrisma();

    // Check if user already has a profile
    const existingProfile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      return error('User already has a profile', 400);
    }

    // Check if vanity URL is taken
    const existingVanity = await prisma.profile.findUnique({
      where: { vanityUrl },
    });

    if (existingVanity) {
      return error('Vanity URL is already taken', 400);
    }

    const profile = await prisma.profile.create({
      data: {
        userId,
        vanityUrl,
        headline: headline || '',
        bio: bio || '',
        roles: roles || [],
        location: location || {},
        tags: tags || [],
        socialLinks: socialLinks || {},
        privacy: {
          visibility: 'public',
          showEmail: false,
          showPhone: false,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    return json(profile, 201);
  } catch (e) {
    console.error('Create profile error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

/**
 * PUT /api/profiles/:id
 * Update profile (owner only)
 */
export const updateProfile = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    if (!id) {
      return error('id is required', 400);
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error('Unauthorized', 401);
    }

    const body = JSON.parse(event.body || '{}');
    const { vanityUrl, headline, bio, roles, location, tags, socialLinks, privacy } = body;

    const prisma = getPrisma();

    // Check profile exists and user owns it
    const existingProfile = await prisma.profile.findUnique({
      where: { id },
    });

    if (!existingProfile) {
      return error('Profile not found', 404);
    }

    if (existingProfile.userId !== userId) {
      return error('Forbidden - not profile owner', 403);
    }

    // If changing vanity URL, check if new one is available
    if (vanityUrl && vanityUrl !== existingProfile.vanityUrl) {
      if (!/^[a-zA-Z0-9_-]+$/.test(vanityUrl)) {
        return error('vanityUrl must contain only letters, numbers, hyphens, and underscores', 400);
      }

      const existingVanity = await prisma.profile.findUnique({
        where: { vanityUrl },
      });

      if (existingVanity) {
        return error('Vanity URL is already taken', 400);
      }
    }

    // Update profile
    const updateData = {};
    if (vanityUrl !== undefined) updateData.vanityUrl = vanityUrl;
    if (headline !== undefined) updateData.headline = headline;
    if (bio !== undefined) updateData.bio = bio;
    if (roles !== undefined) updateData.roles = roles;
    if (location !== undefined) updateData.location = location;
    if (tags !== undefined) updateData.tags = tags;
    if (socialLinks !== undefined) updateData.socialLinks = socialLinks;
    if (privacy !== undefined) updateData.privacy = privacy;

    const profile = await prisma.profile.update({
      where: { id },
      data: updateData,
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
    });

    return json(profile);
  } catch (e) {
    console.error('Update profile error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

/**
 * DELETE /api/profiles/:id
 * Delete profile (owner only)
 */
export const deleteProfile = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    if (!id) {
      return error('id is required', 400);
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error('Unauthorized', 401);
    }

    const prisma = getPrisma();

    // Check profile exists and user owns it
    const existingProfile = await prisma.profile.findUnique({
      where: { id },
    });

    if (!existingProfile) {
      return error('Profile not found', 404);
    }

    if (existingProfile.userId !== userId) {
      return error('Forbidden - not profile owner', 403);
    }

    // Delete profile (cascades to media and credits)
    await prisma.profile.delete({
      where: { id },
    });

    return json({ message: 'Profile deleted successfully' });
  } catch (e) {
    console.error('Delete profile error:', e);
    return error('Server error: ' + e.message, 500);
  }
};
