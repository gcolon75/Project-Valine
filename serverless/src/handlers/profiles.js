import { getPrisma } from '../db/client.js';
import { json, error, getCorsHeaders, jsonNoCache } from '../utils/headers.js';
import { getUserFromEvent } from './auth.js';
import { requireEmailVerified } from '../utils/authMiddleware.js';
import { csrfProtection } from '../middleware/csrfMiddleware.js';
import { logAuthDiagnostics } from '../utils/correlationId.js';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-west-2' });
const MEDIA_BUCKET = process.env.MEDIA_BUCKET || process.env.S3_BUCKET || 'valine-media-uploads';

/**
 * Extract S3 key from a full S3 URL
 * Handles both path-style and virtual-hosted-style URLs
 */
function extractS3KeyFromUrl(url) {
  if (!url || typeof url !== 'string') return null;

  try {
    const parsed = new URL(url);
    // Virtual-hosted style: bucket.s3.region.amazonaws.com/key
    // Path style: s3.region.amazonaws.com/bucket/key
    if (parsed.hostname.includes('s3') && parsed.hostname.includes('amazonaws.com')) {
      // Remove leading slash
      let key = parsed.pathname.slice(1);
      // For path-style URLs, remove bucket name prefix
      if (parsed.hostname.startsWith('s3.')) {
        const parts = key.split('/');
        parts.shift(); // Remove bucket name
        key = parts.join('/');
      }
      return key || null;
    }
  } catch {
    // Not a valid URL
  }
  return null;
}

/**
 * Delete an S3 object by key (fire-and-forget, logs errors)
 */
async function deleteS3Object(key) {
  if (!key) return;

  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: MEDIA_BUCKET,
      Key: key,
    }));
    console.log('[S3 Cleanup] Deleted old object:', key);
  } catch (err) {
    // Log but don't fail - cleanup is best-effort
    console.error('[S3 Cleanup] Failed to delete:', key, err.message);
  }
}
import {
  isModerationEnabled,
  scanProfilePayload,
  scanLink,
  formatIssuesForResponse,
  getProfanityAction,
  inferCategoryFromIssues,
  getSeverityFromCategory,
  redactPII,
} from '../utils/moderation.js';

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

    // Handle degraded mode (database unavailable)
    if (!prisma) {
      console.error('[getProfileByVanity] Prisma unavailable (degraded mode)');
      return error(503, 'Database unavailable');
    }

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

    // Phase 2: Apply profile visibility enforcement
    const isOwner = viewerId === profile.userId;
    
    // Check if profile is FOLLOWERS_ONLY and viewer is not a follower
    if (!isOwner && profile.visibility === 'FOLLOWERS_ONLY' && viewerId) {
      // Check if viewer follows this profile
      const isFollower = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: profile.userId
          }
        }
      });

      if (!isFollower) {
        // Return limited profile view
        return json({
          id: profile.id,
          vanityUrl: profile.vanityUrl,
          headline: profile.headline,
          user: {
            id: profile.user.id,
            username: profile.user.username,
            displayName: profile.user.displayName,
            avatar: profile.user.avatar
          },
          visibility: 'FOLLOWERS_ONLY',
          restricted: true,
          message: 'This profile is only visible to followers'
        });
      }
    } else if (!isOwner && profile.visibility === 'FOLLOWERS_ONLY' && !viewerId) {
      // Unauthenticated user viewing FOLLOWERS_ONLY profile
      return json({
        id: profile.id,
        vanityUrl: profile.vanityUrl,
        headline: profile.headline,
        user: {
          id: profile.user.id,
          username: profile.user.username,
          displayName: profile.user.displayName,
          avatar: profile.user.avatar
        },
        visibility: 'FOLLOWERS_ONLY',
        restricted: true,
        message: 'This profile is only visible to followers'
      });
    }

    // Apply privacy filtering (legacy privacy field)
    const privacy = profile.privacy || {};

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

    // Handle degraded mode (database unavailable)
    if (!prisma) {
      console.error('[getProfileById] Prisma unavailable (degraded mode)');
      return error(503, 'Database unavailable');
    }

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

    // Get follower/following counts
    const [followersCount, followingCount] = await Promise.all([
      prisma.connectionRequest.count({
        where: { receiverId: profile.userId, status: 'accepted' }
      }),
      prisma.connectionRequest.count({
        where: { senderId: profile.userId, status: 'accepted' }
      })
    ]);

    // Add stats to response
    const responseProfile = {
      ...profile,
      stats: {
        followers: followersCount,
        following: followingCount
      }
    };

    return json(responseProfile);
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

    // Handle degraded mode (database unavailable)
    if (!prisma) {
      console.error('[createProfile] Prisma unavailable (degraded mode)');
      return error(503, 'Database unavailable');
    }

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

    // Moderation scanning (if enabled)
    if (isModerationEnabled()) {
      const scanResult = scanProfilePayload({ headline, bio, socialLinks });
      
      if (!scanResult.ok) {
        const action = getProfanityAction();
        
        if (action === 'block') {
          // Block the update and return error
          console.log('[Moderation] Profile update blocked:', {
            userId: redactPII(userId),
            issues: scanResult.issues,
          });
          
          // Create a moderation report for this
          try {
            const category = inferCategoryFromIssues(scanResult.issues);
            const severity = getSeverityFromCategory(category);
            
            await prisma.moderationReport.create({
              data: {
                reporterId: userId, // Self-report from system
                targetType: 'profile',
                targetId: id,
                category,
                description: `Automatic report: ${scanResult.issues.map(i => i.reason).join(', ')}`,
                status: 'open',
                severity,
              },
            });
          } catch (reportErr) {
            console.error('[Moderation] Failed to create auto-report:', reportErr);
          }
          
          return json(formatIssuesForResponse(scanResult.issues), 422, { event });
        } else {
          // Warn mode: allow update but create low-severity report
          console.log('[Moderation] Profile update warning:', {
            userId: redactPII(userId),
            issues: scanResult.issues,
          });
          
          try {
            const category = inferCategoryFromIssues(scanResult.issues);
            
            await prisma.moderationReport.create({
              data: {
                reporterId: userId, // Self-report from system
                targetType: 'profile',
                targetId: id,
                category,
                description: `Warning: ${scanResult.issues.map(i => i.reason).join(', ')}`,
                status: 'open',
                severity: 1, // Low severity for warnings
              },
            });
          } catch (reportErr) {
            console.error('[Moderation] Failed to create warning report:', reportErr);
          }
        }
      }
    }

    const prisma = getPrisma();

    // Handle degraded mode (database unavailable)
    if (!prisma) {
      console.error('[updateProfile] Prisma unavailable (degraded mode)');
      return error(503, 'Database unavailable');
    }

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
      
      // Moderation scanning for links (if enabled)
      if (isModerationEnabled()) {
        for (let i = 0; i < links.length; i++) {
          const linkScanResult = scanLink(links[i]);
          
          if (!linkScanResult.ok) {
            const action = getProfanityAction();
            
            if (action === 'block') {
              console.log('[Moderation] Link blocked:', {
                userId: redactPII(userId),
                linkIndex: i,
                issues: linkScanResult.issues,
              });
              
              return json(
                {
                  ...formatIssuesForResponse(linkScanResult.issues),
                  message: `Link ${i + 1} blocked by moderation rules`,
                },
                422,
                { event }
              );
            }
          }
        }
      }
    }

    // Update profile with transaction to handle links atomically
    const profile = await prisma.$transaction(async (tx) => {
      // Update profile fields
      const updateData = {};
      if (vanityUrl !== undefined) {updateData.vanityUrl = vanityUrl;}
      if (headline !== undefined) {updateData.headline = headline;}
      if (title !== undefined) {updateData.title = title;}
      if (bio !== undefined) {updateData.bio = bio;}
      if (roles !== undefined) {updateData.roles = roles;}
      if (location !== undefined) {updateData.location = location;}
      if (tags !== undefined) {updateData.tags = tags;}
      if (socialLinks !== undefined) {updateData.socialLinks = socialLinks;}
      if (privacy !== undefined) {updateData.privacy = privacy;}

      const _updatedProfile = await tx.profile.update({
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

// Allowed roles for profile updates (synced with frontend ProfileEdit.jsx)
const ALLOWED_ROLES = [
  'Actor',
  'Voice Actor',
  'Playwright',
  'Director',
  'Producer',
  'Composer',
  'Designer',
  'Technician',
  'Writer',
  'Editor',
  'Sound Designer',
  'Casting Director',
];

// Allowed tags (synced with frontend ProfileEdit.jsx skillSuggestions)
const ALLOWED_TAGS = [
  // From frontend skillSuggestions
  'Voice Acting',
  'Stage Acting',
  'Classical Theater',
  'Contemporary',
  'Musical Theater',
  'Improvisation',
  'Dialects',
  'Voice Over',
  'Character Voices',
  'Narration',
  'Audiobook',
  'Commercial VO',
  'Animation',
  'Video Games',
  'Singing',
  'Dance',
  'Combat/Stunts',
  'Motion Capture',
  'On-Camera',
  'Directing',
  'Playwriting',
  // Legacy tags for backwards compatibility
  'Monologue',
  'Drama',
  'Comedy',
  'Improv',
  'Character',
  'Stage',
  'SciFi',
  'Fantasy',
  'Horror',
  'Romance',
  'Thriller',
  'Action',
  'Commercial',
  'Podcast',
  'VoiceOver',
  'Reel',
  'ShortFilm',
  'Feature',
  'Pilot',
  'ColdRead',
  'Dialect',
  'Producing',
  'Editing',
  'Casting',
];

const MAX_TAGS = 5;

/**
 * PATCH /api/me/profile - Update current user's profile
 * 
 * This endpoint is designed for onboarding flow and profile updates.
 * It updates both User and Profile records for the authenticated user.
 * 
 * CRITICAL FIELD MAPPINGS (to ensure consistency across frontend/backend):
 * - User model: displayName, username, avatar (via avatarUrl param)
 * - Profile model: title (professional title), headline, bio, bannerUrl, roles, tags, socialLinks (via links param)
 * - Profile is resolved via userId (NOT profileId) to ensure consistency
 * 
 * Supported fields:
 * - displayName (User): string, required
 * - username (User): 3-30 chars, alphanumeric + underscore/hyphen, unique
 * - headline (Profile): max 100 chars
 * - title (Profile): string, professional title (e.g., "Senior Voice Actor", "Producer")
 * - bio (Profile): max 500 chars
 * - roles (Profile): array, must be in ALLOWED_ROLES
 * - tags (Profile): array, max 5, validated against ALLOWED_TAGS
 * - avatarUrl (User): string, URL to avatar image
 * - bannerUrl (Profile): string, URL to banner image
 */
export const updateMyProfile = async (event) => {
  try {
    // Log auth diagnostics for debugging
    logAuthDiagnostics('updateMyProfile', event);
    
    // Get authenticated user ID
    const userId = getUserFromEvent(event);
    if (!userId) {
      console.log('[updateMyProfile] UNAUTHORIZED - No user ID from token');
      return error(401, 'Unauthorized');
    }

    console.log('[updateMyProfile] START', { userId });

    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (err) {
      console.log('[updateMyProfile] Invalid JSON body');
      return error(400, 'Invalid JSON');
    }

    const { 
      displayName, 
      username, 
      headline, 
      title,
      bio, 
      roles: rolesFromBody, 
      tags: tagsFromBody,
      // Frontend field mappings (primaryRoles → roles, skills → tags)
      primaryRoles,
      skills,
      links,
      avatarUrl, 
      bannerUrl,
      budgetMin,
      budgetMax,
      onboardingComplete,
      profileComplete,
      // New profile fields
      pronouns,
      location,
      availabilityStatus,
      showPronouns,
      showLocation,
      showAvailability,
      // Privacy & messaging preferences (Phase 2)
      visibility,
      messagePermission,
      isSearchable,
      // Notification preferences (Phase 2)
      notifyOnFollow,
      notifyOnMessage,
      notifyOnPostShare
    } = body;

    // Map frontend fields to backend fields with explicit backend names taking precedence
    const roles = rolesFromBody !== undefined ? rolesFromBody : primaryRoles;
    const tags = tagsFromBody !== undefined ? tagsFromBody : skills;

    console.log('[updateMyProfile] Request body:', {
      bodyFields: Object.keys(body),
      headline: headline,
      title: title,
      bio: bio ? bio.substring(0, 50) + '...' : null,
      hasDisplayName: !!displayName,
      hasUsername: !!username
    });

    // Diagnostic log: field mappings for debugging
    console.log('[updateMyProfile] Field mappings:', {
      rolesSource: rolesFromBody !== undefined ? 'roles' : (primaryRoles !== undefined ? 'primaryRoles' : 'none'),
      tagsSource: tagsFromBody !== undefined ? 'tags' : (skills !== undefined ? 'skills' : 'none'),
      rolesCount: Array.isArray(roles) ? roles.length : 0,
      tagsCount: Array.isArray(tags) ? tags.length : 0,
      hasLinks: links !== undefined,
      hasTitle: title !== undefined,
      hasBannerUrl: bannerUrl !== undefined,
      hasBudgetMin: budgetMin !== undefined,
      hasBudgetMax: budgetMax !== undefined,
    });

    // Early Prisma availability check (before any DB operations)
    const prisma = getPrisma();
    if (!prisma) {
      console.error('[updateMyProfile] Prisma unavailable (degraded mode)');
      return error(503, 'Database unavailable');
    }

    // Validation
    const errors = [];

    // Avatar URL validation - reject blob: URLs
    if (avatarUrl !== undefined && avatarUrl !== null && typeof avatarUrl === 'string') {
      if (avatarUrl.startsWith('blob:')) {
        errors.push('avatarUrl cannot be a blob: URL. Blob URLs are temporary browser-local URLs that cannot be persisted. Please use the S3 URL returned from the upload completion.');
      }
    }

    // Banner URL validation - reject blob: URLs
    if (bannerUrl !== undefined && bannerUrl !== null && typeof bannerUrl === 'string') {
      if (bannerUrl.startsWith('blob:')) {
        errors.push('bannerUrl cannot be a blob: URL. Blob URLs are temporary browser-local URLs that cannot be persisted. Please use the S3 URL returned from the upload completion.');
      }
    }

    // Username validation
    if (username !== undefined) {
      // Check alphanumeric + underscore/hyphen
      if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
        errors.push('Username must be 3-30 characters (alphanumeric, underscore, hyphen)');
      } else {
        // Check uniqueness
        const existing = await prisma.user.findFirst({
          where: { 
            username, 
            id: { not: userId } 
          },
        });
        
        if (existing) {
          errors.push('Username already taken');
        }
      }
    }

    // Headline validation
    if (headline !== undefined && headline !== null && headline.length > 100) {
      errors.push('Headline must be 100 characters or less');
    }

    // Bio validation
    if (bio !== undefined && bio !== null && bio.length > 500) {
      errors.push('Bio must be 500 characters or less');
    }

    // Roles validation (allows custom "Other: xxx" roles)
    if (roles !== undefined) {
      if (!Array.isArray(roles)) {
        errors.push('Roles must be an array');
      } else {
        const invalidRoles = roles.filter(r => !ALLOWED_ROLES.includes(r) && !r.startsWith('Other:'));
        if (invalidRoles.length > 0) {
          errors.push(`Invalid roles: ${invalidRoles.join(', ')}`);
        }
      }
    }

    // Tags validation
    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        errors.push('Tags must be an array');
      } else if (tags.length > MAX_TAGS) {
        errors.push(`Maximum ${MAX_TAGS} tags allowed`);
      } else {
        // Validate each tag against allowed list
        const invalidTags = tags.filter(tag => !ALLOWED_TAGS.includes(tag));
        if (invalidTags.length > 0) {
          errors.push(`Invalid tags: ${invalidTags.join(', ')}`);
        }
      }
    }

    // Budget validation
    if (budgetMin !== undefined && budgetMin !== null) {
      if (!Number.isInteger(budgetMin) || budgetMin < 0) {
        errors.push('budgetMin must be a non-negative integer');
      }
    }

    if (budgetMax !== undefined && budgetMax !== null) {
      if (!Number.isInteger(budgetMax) || budgetMax < 0) {
        errors.push('budgetMax must be a non-negative integer');
      }
    }

    if (budgetMin !== undefined && budgetMax !== undefined && 
        budgetMin !== null && budgetMax !== null && 
        budgetMin > budgetMax) {
      errors.push('budgetMin cannot be greater than budgetMax');
    }

    // Privacy & messaging validation (Phase 2)
    if (visibility !== undefined && !['PUBLIC', 'FOLLOWERS_ONLY'].includes(visibility)) {
      errors.push('visibility must be PUBLIC or FOLLOWERS_ONLY');
    }

    if (messagePermission !== undefined && !['EVERYONE', 'FOLLOWERS_ONLY', 'NO_ONE'].includes(messagePermission)) {
      errors.push('messagePermission must be EVERYONE, FOLLOWERS_ONLY, or NO_ONE');
    }

    if (isSearchable !== undefined && typeof isSearchable !== 'boolean') {
      errors.push('isSearchable must be a boolean');
    }

    // Notification preferences validation (Phase 2)
    if (notifyOnFollow !== undefined && typeof notifyOnFollow !== 'boolean') {
      errors.push('notifyOnFollow must be a boolean');
    }

    if (notifyOnMessage !== undefined && typeof notifyOnMessage !== 'boolean') {
      errors.push('notifyOnMessage must be a boolean');
    }

    if (notifyOnPostShare !== undefined && typeof notifyOnPostShare !== 'boolean') {
      errors.push('notifyOnPostShare must be a boolean');
    }

    if (errors.length > 0) {
      console.log('[updateMyProfile] Validation errors:', errors);
      return error(400, 'Validation failed', { errors });
    }

    // Check allowlist (owner-only mode)
    const strictAllowlist = process.env.STRICT_ALLOWLIST === '1';
    if (strictAllowlist) {
      const allowedEmails = (process.env.ALLOWED_USER_EMAILS || '').split(',').map(e => e.trim());
      const user = await prisma.user.findUnique({ where: { id: userId } });
      
      if (!allowedEmails.includes(user.email)) {
        console.log('[updateMyProfile] User not in allowlist:', user.email);
        return error(403, 'Access denied - not in allowlist');
      }
    }

    // Update user and profile
    try {
      // Capture old avatar/banner URLs for S3 cleanup
      const currentUser = await prisma.user.findUnique({ where: { id: userId } });
      const currentProfile = await prisma.profile.findUnique({ where: { userId } });
      const oldAvatarUrl = currentUser?.avatar;
      const oldBannerUrl = currentProfile?.bannerUrl;

      // Prepare user update data
      const userUpdateData = {};
      if (username !== undefined) {userUpdateData.username = username;}
      if (displayName !== undefined) {userUpdateData.displayName = displayName;}
      // Only update avatar if explicitly provided and not null (prevents overwriting with null)
      if (avatarUrl !== undefined && avatarUrl !== null) {userUpdateData.avatar = avatarUrl;}

      // Update user if there are changes
      let updatedUser;
      if (Object.keys(userUpdateData).length > 0) {
        console.log('[updateMyProfile] Updating user fields:', Object.keys(userUpdateData));
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: userUpdateData,
        });
      } else {
        updatedUser = await prisma.user.findUnique({ where: { id: userId } });
      }

      // Prepare profile update data
      const profileUpdateData = {};
      if (headline !== undefined) {profileUpdateData.headline = headline;}
      if (title !== undefined) {profileUpdateData.title = title;}
      if (bio !== undefined) {profileUpdateData.bio = bio;}
      if (roles !== undefined) {profileUpdateData.roles = roles;}
      if (tags !== undefined) {profileUpdateData.tags = tags;}
      // Map frontend 'links' to backend 'socialLinks' (JSON field in serverless schema)
      if (links !== undefined) {profileUpdateData.socialLinks = links;}
      // bannerUrl, budgetMin, budgetMax fields
      // Only update bannerUrl if explicitly provided and not null (prevents overwriting with null)
      if (bannerUrl !== undefined && bannerUrl !== null) {profileUpdateData.bannerUrl = bannerUrl;}
      if (budgetMin !== undefined) {profileUpdateData.budgetMin = budgetMin;}
      if (budgetMax !== undefined) {profileUpdateData.budgetMax = budgetMax;}
      // New profile fields
      if (pronouns !== undefined) {profileUpdateData.pronouns = pronouns;}
      if (location !== undefined) {profileUpdateData.location = location;}
      if (availabilityStatus !== undefined) {profileUpdateData.availabilityStatus = availabilityStatus;}
      if (showPronouns !== undefined) {profileUpdateData.showPronouns = showPronouns;}
      if (showLocation !== undefined) {profileUpdateData.showLocation = showLocation;}
      if (showAvailability !== undefined) {profileUpdateData.showAvailability = showAvailability;}
      // Privacy & messaging preferences (Phase 2)
      if (visibility !== undefined) {profileUpdateData.visibility = visibility;}
      if (messagePermission !== undefined) {profileUpdateData.messagePermission = messagePermission;}
      if (isSearchable !== undefined) {profileUpdateData.isSearchable = isSearchable;}
      // Notification preferences (Phase 2)
      if (notifyOnFollow !== undefined) {profileUpdateData.notifyOnFollow = notifyOnFollow;}
      if (notifyOnMessage !== undefined) {profileUpdateData.notifyOnMessage = notifyOnMessage;}
      if (notifyOnPostShare !== undefined) {profileUpdateData.notifyOnPostShare = notifyOnPostShare;}

      // Get or create profile
      // Note: Profile model uses socialLinks (Json) field in serverless schema
      let profile = await prisma.profile.findUnique({
        where: { userId },
      });

      if (!profile) {
        // Create profile if it doesn't exist
        console.log('[updateMyProfile] Creating new profile for user');
        profile = await prisma.profile.create({
          data: {
            userId,
            vanityUrl: updatedUser.username || userId,
            headline: headline || '',
            title: title || '',
            bio: bio || '',
            roles: roles || [],
            tags: tags || [],
            socialLinks: links || null,
            bannerUrl: bannerUrl || null,
            budgetMin: budgetMin || null,
            budgetMax: budgetMax || null,
            pronouns: pronouns || null,
            location: location || null,
            availabilityStatus: availabilityStatus || null,
            showPronouns: showPronouns !== undefined ? showPronouns : true,
            showLocation: showLocation !== undefined ? showLocation : true,
            showAvailability: showAvailability !== undefined ? showAvailability : true,
            // Privacy & messaging preferences (Phase 2) - defaults from schema
            visibility: visibility || 'PUBLIC',
            messagePermission: messagePermission || 'EVERYONE',
            isSearchable: isSearchable !== undefined ? isSearchable : true,
            // Notification preferences (Phase 2) - defaults from schema
            notifyOnFollow: notifyOnFollow !== undefined ? notifyOnFollow : true,
            notifyOnMessage: notifyOnMessage !== undefined ? notifyOnMessage : true,
            notifyOnPostShare: notifyOnPostShare !== undefined ? notifyOnPostShare : true,
          },
        });
        console.log('[updateMyProfile] PROFILE CREATED', {
          profileId: profile.id,
          title: profile.title,
          headline: profile.headline
        });
      } else if (Object.keys(profileUpdateData).length > 0) {
        // Update profile
        console.log('[updateMyProfile] Updating profile fields:', Object.keys(profileUpdateData));
        profile = await prisma.profile.update({
          where: { userId },
          data: profileUpdateData,
        });
        console.log('[updateMyProfile] PROFILE UPDATED', {
          profileId: profile.id,
          title: profile.title,
          headline: profile.headline
        });
      } else {
        console.log('[updateMyProfile] Profile exists, no profile fields to update (user fields may have been updated)');
      }

      // Handle onboardingComplete and profileComplete flags
      // Key principle: Explicit values from request take priority, undefined means keep current DB value
      // This prevents profile edits from accidentally resetting onboarding status
      
      console.log('[updateMyProfile] Flags from request:', {
        onboardingComplete: onboardingComplete,
        profileComplete: profileComplete,
      });
      
      console.log('[updateMyProfile] Current DB flags:', {
        onboardingComplete: updatedUser.onboardingComplete,
        profileComplete: updatedUser.profileComplete,
      });
      
      // Determine final flag values based on explicit request or keep existing
      let finalOnboardingComplete = updatedUser.onboardingComplete; // Current DB value
      let finalProfileComplete = updatedUser.profileComplete; // Current DB value
      
      // Explicit values from request take absolute priority
      if (onboardingComplete === true) {
        finalOnboardingComplete = true;
      } else if (onboardingComplete === false) {
        finalOnboardingComplete = false;
      }
      // If undefined, keep current value (don't auto-detect for onboarding)
      
      if (profileComplete === true) {
        finalProfileComplete = true;
      } else if (profileComplete === false) {
        finalProfileComplete = false;
      }
      // If undefined, keep current value (don't auto-detect for profile)
      
      // Prepare status update data if values have changed
      const statusUpdateData = {};
      if (finalOnboardingComplete !== updatedUser.onboardingComplete) {
        statusUpdateData.onboardingComplete = finalOnboardingComplete;
      }
      if (finalProfileComplete !== updatedUser.profileComplete) {
        statusUpdateData.profileComplete = finalProfileComplete;
      }
      
      console.log('[updateMyProfile] Final flags to save:', {
        onboardingComplete: finalOnboardingComplete,
        profileComplete: finalProfileComplete,
        willUpdate: Object.keys(statusUpdateData).length > 0,
      });
      
      // Update status flags if needed
      if (Object.keys(statusUpdateData).length > 0) {
        console.log('[updateMyProfile] Updating status flags:', statusUpdateData);
        try {
          updatedUser = await prisma.user.update({
            where: { id: userId },
            data: statusUpdateData,
          });
        } catch (updateErr) {
          // Handle schema-related errors gracefully when fields don't exist
          // P2009: Unknown field in Prisma query
          // Re-throw connection or other critical errors
          if (updateErr.code === 'P2009' || 
              (updateErr.message && updateErr.message.includes('Unknown field'))) {
            console.warn('[updateMyProfile] Could not update status flags (fields may not exist):', updateErr.message);
          } else {
            throw updateErr;
          }
        }
      }

      // Return combined profile data
      // Use socialLinks from profile for links (maps frontend 'links' field)
      const response = {
        id: profile.id,
        userId: updatedUser.id,
        username: updatedUser.username || null,
        displayName: updatedUser.displayName || updatedUser.name || null,
        avatar: updatedUser.avatar || null,
        vanityUrl: profile.vanityUrl,
        headline: profile.headline || null,
        title: profile.title || null,
        bio: profile.bio || null,
        roles: profile.roles || [],
        tags: profile.tags || [],
        links: profile.socialLinks || [],
        bannerUrl: profile.bannerUrl || null,
        budgetMin: profile.budgetMin || null,
        budgetMax: profile.budgetMax || null,
        onboardingComplete: updatedUser.onboardingComplete || false,
        profileComplete: updatedUser.profileComplete || false,
        // Timestamp for cache-busting images
        updatedAt: profile.updatedAt || updatedUser.updatedAt || new Date().toISOString(),
      };

      console.log('[updateMyProfile] RESPONSE', {
        profileId: response.id,
        title: response.title,
        headline: response.headline,
        onboardingComplete: response.onboardingComplete
      });

      // S3 cleanup: Delete old avatar/banner if replaced with new URL
      // Fire-and-forget - don't block the response
      if (avatarUrl && oldAvatarUrl && avatarUrl !== oldAvatarUrl) {
        const oldAvatarKey = extractS3KeyFromUrl(oldAvatarUrl);
        if (oldAvatarKey) {
          deleteS3Object(oldAvatarKey).catch(() => {}); // Ignore errors
          console.log('[updateMyProfile] Queued old avatar for deletion:', oldAvatarKey);
        }
      }
      if (bannerUrl && oldBannerUrl && bannerUrl !== oldBannerUrl) {
        const oldBannerKey = extractS3KeyFromUrl(oldBannerUrl);
        if (oldBannerKey) {
          deleteS3Object(oldBannerKey).catch(() => {}); // Ignore errors
          console.log('[updateMyProfile] Queued old banner for deletion:', oldBannerKey);
        }
      }

      return jsonNoCache(response);

    } catch (dbError) {
      console.error('[updateMyProfile] Database error:', dbError);
      
      // Handle specific Prisma errors with appropriate status codes
      if (dbError.code === 'P2002') {
        // Unique constraint violation
        return error(409, 'Username or vanity URL already taken');
      }
      
      if (dbError.code === 'P2009' || dbError.code === 'P2011' || dbError.code === 'P2012') {
        // P2009: Unknown field in query
        // P2011: Null constraint violation
        // P2012: Missing required value
        return error(400, 'Validation error: ' + dbError.message);
      }
      
      if (dbError.code === 'P2025') {
        // Record not found (profile doesn't exist)
        return error(404, 'Profile not found');
      }
      
      throw dbError;
    }

  } catch (e) {
    console.error('[updateMyProfile] Error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * GET /api/me/profile - Get current user's profile
 * 
 * This endpoint returns the authenticated user's profile data, combining
 * user and profile information with graceful fallbacks for missing fields.
 * 
 * CRITICAL: Profile is resolved via userId (NOT profileId) to ensure consistency.
 * Auto-creates profile if it doesn't exist to prevent "Profile not found" errors.
 * 
 * Returns:
 * - id: Profile ID
 * - userId: User ID
 * - email: User email
 * - username: User username
 * - displayName: User display name
 * - avatar: User avatar URL
 * - title: Profile professional title (e.g., "Senior Voice Actor", "Producer")
 * - headline: Profile headline
 * - bio: Profile bio
 * - roles: Profile roles array
 * - tags: Profile tags array
 * - links: Profile links array (mapped from socialLinks JSON field)
 * - bannerUrl: Profile banner URL
 * - onboardingComplete: Whether user has completed onboarding
 * - profileComplete: Whether user's profile is complete
 * - createdAt: User creation timestamp
 */
export const getMyProfile = async (event) => {
  try {
    // Log auth diagnostics for debugging
    logAuthDiagnostics('getMyProfile', event);
    
    // Get authenticated user ID
    const userId = getUserFromEvent(event);
    if (!userId) {
      console.log('[getMyProfile] UNAUTHORIZED - No user ID from token');
      return error(401, 'Unauthorized');
    }

    console.log('[getMyProfile] User ID:', userId);

    const prisma = getPrisma();

    // Handle degraded mode (database unavailable)
    if (!prisma) {
      console.error('[getMyProfile] Prisma unavailable (degraded mode)');
      return error(503, 'Database unavailable');
    }

    // Fetch user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.log('[getMyProfile] User not found:', userId);
      return error(404, 'User not found');
    }

    // Fetch profile data with education, credits (experience), and gallery media
    let profile = null;
    let education = [];
    let credits = [];
    let gallery = [];
    try {
      profile = await prisma.profile.findUnique({
        where: { userId },
        include: {
          education: {
            orderBy: [
              { endYear: 'desc' },
              { startYear: 'desc' },
            ],
          },
          credits: {
            orderBy: [
              { year: 'desc' },
              { orderIndex: 'asc' },
            ],
          },
          media: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      
      // Auto-create profile if it doesn't exist (harden owner routes)
      if (!profile) {
        console.log('[getMyProfile] Auto-creating profile for user:', userId);
        profile = await prisma.profile.create({
          data: {
            userId,
            // Use nullish coalescing to preserve empty strings if explicitly set
            vanityUrl: user.username ?? userId,
            headline: null,
            bio: null,
            roles: [],
            tags: [],
          },
        });
        console.log('[getMyProfile] Profile auto-created:', profile.id);
      }
      
      education = profile.education || [];
      credits = profile.credits || [];
      gallery = profile.media || [];
    } catch (profileErr) {
      // Handle schema-related errors gracefully when Profile model may not exist
      // P2021: Table does not exist in the database
      // P2025: Record not found (profile doesn't exist for this user)
      // Re-throw connection or other critical errors
      if (profileErr.code === 'P2021' || profileErr.code === 'P2025' ||
          (profileErr.message && (profileErr.message.includes('does not exist') || 
           profileErr.message.includes('Unknown model')))) {
        console.warn('[getMyProfile] Could not fetch/create profile (model may not exist):', profileErr.message);
        // Continue without profile data - profile will be null
      } else {
        throw profileErr;
      }
    }

    // Get follower/following counts from the Profile model (updated by Follow system)
    // Fallback to 0 if profile doesn't exist yet
    const followersCount = profile?.followersCount || 0;
    const followingCount = profile?.followingCount || 0;

    // Construct response with graceful fallbacks
    // Use socialLinks from profile for links (maps frontend 'links' field)
    const response = {
      // Profile ID (null if no profile yet)
      id: profile?.id || null,
      userId: user.id,
      email: user.email,
      username: user.username || null,
      displayName: user.displayName || user.name || null,
      avatar: user.avatar || null,
      // Profile-specific fields
      vanityUrl: profile?.vanityUrl || null,
      headline: profile?.headline || null,
      title: profile?.title || null,
      bio: profile?.bio || null,
      roles: profile?.roles || [],
      tags: profile?.tags || [],
      links: profile?.socialLinks || [],
      bannerUrl: profile?.bannerUrl || null,
      budgetMin: profile?.budgetMin || null,
      budgetMax: profile?.budgetMax || null,
      pronouns: profile?.pronouns || null,
      location: profile?.location || null,
      availabilityStatus: profile?.availabilityStatus || null,
      showPronouns: profile?.showPronouns !== undefined ? profile.showPronouns : true,
      showLocation: profile?.showLocation !== undefined ? profile.showLocation : true,
      showAvailability: profile?.showAvailability !== undefined ? profile.showAvailability : true,
      education: education,
      credits: credits,
      gallery: gallery,
      // Follower/following counts (top-level for easy access)
      followersCount: followersCount,
      followingCount: followingCount,
      // Stats (legacy format, kept for backward compatibility)
      stats: {
        followers: followersCount,
        following: followingCount,
      },
      // Status fields
      onboardingComplete: user.onboardingComplete || false,
      profileComplete: user.profileComplete || false,
      createdAt: user.createdAt,
      // Timestamp for cache-busting images
      updatedAt: profile?.updatedAt || user.updatedAt || new Date().toISOString(),
      // Privacy & messaging preferences (Phase 2)
      visibility: profile?.visibility || 'PUBLIC',
      messagePermission: profile?.messagePermission || 'EVERYONE',
      isSearchable: profile?.isSearchable !== undefined ? profile.isSearchable : true,
      // Notification preferences (Phase 2)
      notifyOnFollow: profile?.notifyOnFollow !== undefined ? profile.notifyOnFollow : true,
      notifyOnMessage: profile?.notifyOnMessage !== undefined ? profile.notifyOnMessage : true,
      notifyOnPostShare: profile?.notifyOnPostShare !== undefined ? profile.notifyOnPostShare : true,
    };

    console.log('[getMyProfile] RESPONSE', {
      profileId: response.id,
      title: response.title,
      headline: response.headline,
      hasProfile: !!profile,
      educationCount: education.length,
      galleryCount: gallery.length
    });
    return jsonNoCache(response);

  } catch (e) {
    console.error('[getMyProfile] Error:', e);
    return error(500, 'Server error: ' + e.message);
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

    // Handle degraded mode (database unavailable)
    if (!prisma) {
      console.error('[deleteProfile] Prisma unavailable (degraded mode)');
      return error(503, 'Database unavailable');
    }

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


/**
 * GET /me/profile/experience
 * List experience (credits) for the current user
 */
export const listMyExperience = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const prisma = getPrisma();
    if (!prisma) {
      console.error('[listMyExperience] Prisma unavailable');
      return error(503, 'Database unavailable');
    }

    // Get user's profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return json([]);
    }

    // Get credits for this profile
    const credits = await prisma.credit.findMany({
      where: { profileId: profile.id },
      orderBy: [
        { year: 'desc' },
        { orderIndex: 'asc' },
      ],
    });

    return json(credits);
  } catch (e) {
    console.error('List my experience error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * POST /me/profile/experience
 * Create experience (credit) for the current user
 */
export const createMyExperience = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const body = JSON.parse(event.body || '{}');
    const { title, role, company, year, description, orderIndex, metadata } = body;

    if (!title || !role) {
      return error(400, 'title and role are required');
    }

    const prisma = getPrisma();
    if (!prisma) {
      console.error('[createMyExperience] Prisma unavailable');
      return error(503, 'Database unavailable');
    }

    // Get user's profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return error(404, 'Profile not found');
    }

    // Create credit
    const credit = await prisma.credit.create({
      data: {
        profileId: profile.id,
        title,
        role,
        company: company || null,
        year: year || null,
        description: description || null,
        orderIndex: orderIndex || 0,
        metadata: metadata || {},
      },
    });

    return json(credit, 201);
  } catch (e) {
    console.error('Create my experience error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * PUT /me/profile/experience/{id}
 * Update experience (credit) for the current user
 */
export const updateMyExperience = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const { id } = event.pathParameters || {};
    if (!id) {
      return error(400, 'id is required');
    }

    const body = JSON.parse(event.body || '{}');
    const { title, role, company, year, description, orderIndex, metadata } = body;

    const prisma = getPrisma();
    if (!prisma) {
      console.error('[updateMyExperience] Prisma unavailable');
      return error(503, 'Database unavailable');
    }

    // Get credit and verify ownership
    const credit = await prisma.credit.findUnique({
      where: { id },
      include: {
        profile: true,
      },
    });

    if (!credit) {
      return error(404, 'Experience not found');
    }

    if (credit.profile.userId !== userId) {
      return error(403, 'Forbidden - not experience owner');
    }

    // Update credit
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (role !== undefined) updateData.role = role;
    if (company !== undefined) updateData.company = company;
    if (year !== undefined) updateData.year = year;
    if (description !== undefined) updateData.description = description;
    if (orderIndex !== undefined) updateData.orderIndex = orderIndex;
    if (metadata !== undefined) updateData.metadata = metadata;

    const updatedCredit = await prisma.credit.update({
      where: { id },
      data: updateData,
    });

    return json(updatedCredit);
  } catch (e) {
    console.error('Update my experience error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * DELETE /me/profile/experience/{id}
 * Delete experience (credit) for the current user
 */
export const deleteMyExperience = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const { id } = event.pathParameters || {};
    if (!id) {
      return error(400, 'id is required');
    }

    const prisma = getPrisma();
    if (!prisma) {
      console.error('[deleteMyExperience] Prisma unavailable');
      return error(503, 'Database unavailable');
    }

    // Get credit and verify ownership
    const credit = await prisma.credit.findUnique({
      where: { id },
      include: {
        profile: true,
      },
    });

    if (!credit) {
      return error(404, 'Experience not found');
    }

    if (credit.profile.userId !== userId) {
      return error(403, 'Forbidden - not experience owner');
    }

    await prisma.credit.delete({
      where: { id },
    });

    return json({ message: 'Experience deleted successfully' });
  } catch (e) {
    console.error('Delete my experience error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};
