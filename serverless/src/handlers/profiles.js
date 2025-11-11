import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserFromEvent } from './auth.js';
import { requireEmailVerified } from '../utils/authMiddleware.js';
import { csrfProtection } from '../middleware/csrfMiddleware.js';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
};

// Validation constants
const VALID_LINK_TYPES = ['website', 'imdb', 'showreel', 'other'];
const MAX_PROFILE_LINKS = 20;
const MAX_LABEL_LENGTH = 40;
const MAX_URL_LENGTH = 2048;

/**
 * Validate a single profile link
 */
function validateLink(link) {
  const errors = {};
  
  if (!link || typeof link !== 'object') {
    return { valid: false, errors: { _form: 'Invalid link object' } };
  }
  
  // Validate label
  if (!link.label || typeof link.label !== 'string' || link.label.trim() === '') {
    errors.label = 'Label is required';
  } else if (link.label.length < 1 || link.label.length > MAX_LABEL_LENGTH) {
    errors.label = `Label must be 1-${MAX_LABEL_LENGTH} characters`;
  }
  
  // Validate URL
  if (!link.url || typeof link.url !== 'string' || link.url.trim() === '') {
    errors.url = 'URL is required';
  } else if (link.url.length > MAX_URL_LENGTH) {
    errors.url = `URL must be ${MAX_URL_LENGTH} characters or less`;
  } else {
    try {
      const parsed = new URL(link.url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        errors.url = 'URL must use http:// or https:// protocol';
      }
    } catch {
      errors.url = 'Invalid URL format';
    }
  }
  
  // Validate type
  if (!link.type || typeof link.type !== 'string') {
    errors.type = 'Type is required';
  } else if (!VALID_LINK_TYPES.includes(link.type)) {
    errors.type = `Type must be one of: ${VALID_LINK_TYPES.join(', ')}`;
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate array of profile links
 */
function validateLinks(links) {
  if (!Array.isArray(links)) {
    return { valid: false, message: 'Links must be an array' };
  }
  
  if (links.length > MAX_PROFILE_LINKS) {
    return { 
      valid: false, 
      message: `Maximum of ${MAX_PROFILE_LINKS} links allowed (received ${links.length})` 
    };
  }
  
  // Validate each link
  for (let i = 0; i < links.length; i++) {
    const validation = validateLink(links[i]);
    if (!validation.valid) {
      return {
        valid: false,
        message: `Link ${i + 1} validation failed: ${JSON.stringify(validation.errors)}`
      };
    }
  }
  
  return { valid: true };
}

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
        links: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            label: true,
            url: true,
            type: true,
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
        links: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            label: true,
            url: true,
            type: true,
            position: true,
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
    // CSRF protection (Phase 3)
    const csrfError = csrfProtection(event);
    if (csrfError) {
      return csrfError;
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error('Unauthorized', 401);
    }

    // Require email verification for profile creation
    const verificationError = await requireEmailVerified(userId);
    if (verificationError) {
      return verificationError;
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
    // CSRF protection (Phase 3)
    const csrfError = csrfProtection(event);
    if (csrfError) {
      return csrfError;
    }

    const { id } = event.pathParameters || {};
    if (!id) {
      return error('id is required', 400);
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error('Unauthorized', 401);
    }

    // Require email verification for profile updates
    const verificationError = await requireEmailVerified(userId);
    if (verificationError) {
      return verificationError;
    }

    const body = JSON.parse(event.body || '{}');
    const { vanityUrl, headline, title, bio, roles, location, tags, socialLinks, privacy, links } = body;

    const prisma = getPrisma();

    // Check profile exists and user owns it
    const existingProfile = await prisma.profile.findUnique({
      where: { id },
      include: {
        links: true,
      },
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
        return error('Vanity URL is already taken', 409);
      }
    }

    // Validate links if provided
    if (links !== undefined) {
      const linksValidation = validateLinks(links);
      if (!linksValidation.valid) {
        return error(linksValidation.message, 400);
      }
    }

    // Update profile with transaction to handle links atomically
    const profile = await prisma.$transaction(async (tx) => {
      // Update profile fields
      const updateData = {};
      if (vanityUrl !== undefined) updateData.vanityUrl = vanityUrl;
      if (headline !== undefined) updateData.headline = headline;
      if (title !== undefined) updateData.title = title;
      if (bio !== undefined) updateData.bio = bio;
      if (roles !== undefined) updateData.roles = roles;
      if (location !== undefined) updateData.location = location;
      if (tags !== undefined) updateData.tags = tags;
      if (socialLinks !== undefined) updateData.socialLinks = socialLinks;
      if (privacy !== undefined) updateData.privacy = privacy;

      const updatedProfile = await tx.profile.update({
        where: { id },
        data: updateData,
      });

      // Handle links update if provided
      if (links !== undefined) {
        // Delete all existing links for this profile
        await tx.profileLink.deleteMany({
          where: { profileId: id },
        });

        // Create new links with positions
        if (links.length > 0) {
          await tx.profileLink.createMany({
            data: links.map((link, index) => ({
              profileId: id,
              userId: userId,
              label: link.label.trim(),
              url: link.url.trim(),
              type: link.type,
              position: index,
            })),
          });
        }
      }

      // Return updated profile with all relations
      return tx.profile.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
          links: {
            orderBy: { position: 'asc' },
            select: {
              id: true,
              label: true,
              url: true,
              type: true,
              position: true,
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
