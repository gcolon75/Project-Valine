import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserFromEvent } from './auth.js';

const YEAR_MIN = 1900;
// Allow future-dated education entries (planned programs) up to this many years ahead
const YEAR_FUTURE_BUFFER = 10;
const getYearMax = () => new Date().getFullYear() + YEAR_FUTURE_BUFFER;

const coerceYear = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return { value: null };
  }

  const parsed = typeof value === 'string' ? Number(value) : value;
  if (!Number.isInteger(parsed)) {
    return { error: `${fieldName} must be a valid year integer` };
  }

  const yearMax = getYearMax();
  if (parsed < YEAR_MIN || parsed > yearMax) {
    return { error: `${fieldName} must be a valid year between ${YEAR_MIN} and ${yearMax}` };
  }

  return { value: parsed };
};

/**
 * GET /me/profile/education
 * List education entries for authenticated user
 */
export const listEducation = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const prisma = getPrisma();

    // Handle degraded mode (database unavailable)
    if (!prisma) {
      console.warn('[listEducation] Prisma unavailable (degraded mode), returning empty array');
      return json([]);
    }

    // Get user's profile
    let profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      // No profile exists yet - return empty education array
      // Profile will be created when user accesses /me/profile or updates profile
      console.log('[listEducation] No profile exists for user, returning empty array:', userId);
      return json([]);
    }

    const education = await prisma.education.findMany({
      where: { profileId: profile.id },
      orderBy: [
        { endYear: 'desc' },
        { startYear: 'desc' },
      ],
    });

    return json(education || []);
  } catch (e) {
    console.error('List education error:', e);
    // Return empty array instead of 500 for recoverable errors
    if (e.code === 'P2021' || e.code === 'P2025') {
      console.warn('[listEducation] Prisma error (table/record issue), returning empty array:', e.message);
      return json([]);
    }
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * POST /me/profile/education
 * Create education entry for authenticated user
 */
export const createEducation = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const body = JSON.parse(event.body || '{}');
    const { institution, program, startYear, endYear, achievements } = body;

    // Enhanced logging: incoming payload (sanitized for security)
    console.log('[createEducation] Incoming payload:', {
      userId: userId.substring(0, 8) + '...',
      institution: institution ? institution.substring(0, 30) : null,
      program: program ? program.substring(0, 30) : null,
      startYear,
      endYear,
      hasAchievements: !!achievements
    });

    if (!institution || !program) {
      console.log('[createEducation] Validation failed: missing required fields');
      return error(400, 'institution and program are required');
    }

    // Parse and validate startYear with detailed logging
    const normalizedStartYear = coerceYear(startYear, 'startYear');
    if (normalizedStartYear.error) {
      console.log('[createEducation] startYear validation failed:', {
        raw: startYear,
        type: typeof startYear,
        error: normalizedStartYear.error
      });
      return error(400, normalizedStartYear.error);
    }

    // Parse and validate endYear with detailed logging
    const normalizedEndYear = coerceYear(endYear, 'endYear');
    if (normalizedEndYear.error) {
      console.log('[createEducation] endYear validation failed:', {
        raw: endYear,
        type: typeof endYear,
        error: normalizedEndYear.error
      });
      return error(400, normalizedEndYear.error);
    }

    console.log('[createEducation] Year validation passed:', {
      startYear: normalizedStartYear.value,
      endYear: normalizedEndYear.value
    });

    if (normalizedStartYear.value !== null &&
        normalizedEndYear.value !== null &&
        normalizedStartYear.value > normalizedEndYear.value) {
      console.log('[createEducation] Year range validation failed:', {
        startYear: normalizedStartYear.value,
        endYear: normalizedEndYear.value
      });
      return error(400, 'startYear cannot be after endYear');
    }

    const prisma = getPrisma();

    // Handle degraded mode (database unavailable)
    if (!prisma) {
      console.error('[createEducation] Prisma unavailable (degraded mode)');
      return error(503, 'Database unavailable');
    }

    // Get user's profile (or create one if it doesn't exist)
    let profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      // Auto-create profile if it doesn't exist
      profile = await prisma.profile.create({
        data: {
          userId,
          vanityUrl: userId,
          headline: '',
          bio: '',
          roles: [],
          tags: [],
        },
      });
    }

    const education = await prisma.education.create({
      data: {
        profileId: profile.id,
        institution,
        program,
        startYear: normalizedStartYear.value,
        endYear: normalizedEndYear.value,
        achievements: achievements || null,
      },
    });

    console.log('[createEducation] Education entry created successfully:', {
      id: education.id,
      profileId: profile.id
    });

    return json(education, 201);
  } catch (e) {
    console.error('[createEducation] Error:', {
      message: e.message,
      code: e.code,
      meta: e.meta
    });
    
    // Handle specific Prisma errors with user-friendly messages
    if (e.code === 'P2025') {
      return error(404, 'Profile not found. Please ensure your profile exists before adding education.');
    }
    
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * PUT /me/profile/education/:id
 * Update education entry (validate ownership)
 */
export const updateEducation = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    if (!id) {
      return error(400, 'id is required');
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const body = JSON.parse(event.body || '{}');
    const { institution, program, startYear, endYear, achievements } = body;

    // Enhanced logging: incoming payload (sanitized)
    console.log('[updateEducation] Incoming payload:', {
      educationId: id,
      userId: userId.substring(0, 8) + '...',
      institution: institution ? institution.substring(0, 30) : undefined,
      program: program ? program.substring(0, 30) : undefined,
      startYear,
      endYear,
      hasAchievements: achievements !== undefined
    });

    // Parse and validate startYear with detailed logging
    const normalizedStartYear = coerceYear(startYear, 'startYear');
    if (normalizedStartYear.error) {
      console.log('[updateEducation] startYear validation failed:', {
        raw: startYear,
        type: typeof startYear,
        error: normalizedStartYear.error
      });
      return error(400, normalizedStartYear.error);
    }

    // Parse and validate endYear with detailed logging
    const normalizedEndYear = coerceYear(endYear, 'endYear');
    if (normalizedEndYear.error) {
      console.log('[updateEducation] endYear validation failed:', {
        raw: endYear,
        type: typeof endYear,
        error: normalizedEndYear.error
      });
      return error(400, normalizedEndYear.error);
    }

    if (normalizedStartYear.value !== null &&
        normalizedEndYear.value !== null &&
        normalizedStartYear.value > normalizedEndYear.value) {
      console.log('[updateEducation] Year range validation failed:', {
        startYear: normalizedStartYear.value,
        endYear: normalizedEndYear.value
      });
      return error(400, 'startYear cannot be after endYear');
    }

    const prisma = getPrisma();

    // Handle degraded mode (database unavailable)
    if (!prisma) {
      console.error('[updateEducation] Prisma unavailable (degraded mode)');
      return error(503, 'Database unavailable');
    }

    // Get education and verify ownership through profile
    const education = await prisma.education.findUnique({
      where: { id },
      include: {
        profile: true,
      },
    });

    if (!education) {
      return error(404, 'Education entry not found');
    }

    // Guard against orphaned education entries (profile may have been deleted)
    if (!education.profile) {
      console.error('[updateEducation] Orphaned education entry - no profile:', { educationId: id, userId });
      return error(404, 'Education entry profile not found');
    }

    if (education.profile.userId !== userId) {
      return error(403, 'Forbidden - not education owner');
    }

    // Update education
    const updateData = {};
    if (institution !== undefined) {
      updateData.institution = institution;
    }
    if (program !== undefined) {
      updateData.program = program;
    }
    if (startYear !== undefined) {
      updateData.startYear = normalizedStartYear.value;
    }
    if (endYear !== undefined) {
      updateData.endYear = normalizedEndYear.value;
    }
    if (achievements !== undefined) {
      updateData.achievements = achievements;
    }

    const updatedEducation = await prisma.education.update({
      where: { id },
      data: updateData,
    });

    console.log('[updateEducation] Education entry updated successfully:', {
      id: updatedEducation.id,
      updated: Object.keys(updateData)
    });

    return json(updatedEducation);
  } catch (e) {
    console.error('[updateEducation] Error:', {
      message: e.message,
      code: e.code,
      meta: e.meta
    });
    
    // Handle specific Prisma errors with user-friendly messages
    if (e.code === 'P2025') {
      return error(404, 'Education entry not found or has been deleted.');
    }
    
    return error(500, 'Server error: ' + e.message);
  }
};

/**
 * DELETE /me/profile/education/:id
 * Delete education entry (validate ownership)
 */
export const deleteEducation = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    if (!id) {
      return error(400, 'id is required');
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    const prisma = getPrisma();

    // Handle degraded mode (database unavailable)
    if (!prisma) {
      console.error('[deleteEducation] Prisma unavailable (degraded mode)');
      return error(503, 'Database unavailable');
    }

    // Get education and verify ownership
    const education = await prisma.education.findUnique({
      where: { id },
      include: {
        profile: true,
      },
    });

    if (!education) {
      return error(404, 'Education entry not found');
    }

    // Guard against orphaned education entries (profile may have been deleted)
    if (!education.profile) {
      console.error('[deleteEducation] Orphaned education entry - no profile:', { educationId: id, userId });
      return error(404, 'Education entry profile not found');
    }

    if (education.profile.userId !== userId) {
      return error(403, 'Forbidden - not education owner');
    }

    await prisma.education.delete({
      where: { id },
    });

    return json({ message: 'Education entry deleted successfully' });
  } catch (e) {
    console.error('Delete education error:', e);
    return error(500, 'Server error: ' + e.message);
  }
};
