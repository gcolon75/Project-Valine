import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserFromEvent } from './auth.js';

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

    // Get user's profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      // Return empty array if no profile exists yet
      return json([]);
    }

    const education = await prisma.education.findMany({
      where: { profileId: profile.id },
      orderBy: [
        { endYear: 'desc' },
        { startYear: 'desc' },
      ],
    });

    return json(education);
  } catch (e) {
    console.error('List education error:', e);
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

    if (!institution || !program) {
      return error(400, 'institution and program are required');
    }

    // Validate year fields if provided
    if (startYear !== undefined && startYear !== null) {
      if (!Number.isInteger(startYear) || startYear < 1900 || startYear > 2100) {
        return error(400, 'startYear must be a valid year between 1900 and 2100');
      }
    }

    if (endYear !== undefined && endYear !== null) {
      if (!Number.isInteger(endYear) || endYear < 1900 || endYear > 2100) {
        return error(400, 'endYear must be a valid year between 1900 and 2100');
      }
    }

    if (startYear !== undefined && startYear !== null && 
        endYear !== undefined && endYear !== null && 
        startYear > endYear) {
      return error(400, 'startYear cannot be after endYear');
    }

    const prisma = getPrisma();

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
        startYear: startYear || null,
        endYear: endYear || null,
        achievements: achievements || null,
      },
    });

    return json(education, 201);
  } catch (e) {
    console.error('Create education error:', e);
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

    // Validate year fields if provided
    if (startYear !== undefined && startYear !== null) {
      if (!Number.isInteger(startYear) || startYear < 1900 || startYear > 2100) {
        return error(400, 'startYear must be a valid year between 1900 and 2100');
      }
    }

    if (endYear !== undefined && endYear !== null) {
      if (!Number.isInteger(endYear) || endYear < 1900 || endYear > 2100) {
        return error(400, 'endYear must be a valid year between 1900 and 2100');
      }
    }

    if (startYear !== undefined && startYear !== null && 
        endYear !== undefined && endYear !== null && 
        startYear > endYear) {
      return error(400, 'startYear cannot be after endYear');
    }

    const prisma = getPrisma();

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
      updateData.startYear = startYear;
    }
    if (endYear !== undefined) {
      updateData.endYear = endYear;
    }
    if (achievements !== undefined) {
      updateData.achievements = achievements;
    }

    const updatedEducation = await prisma.education.update({
      where: { id },
      data: updateData,
    });

    return json(updatedEducation);
  } catch (e) {
    console.error('Update education error:', e);
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
