import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserFromEvent } from './auth.js';

/**
 * GET /api/profiles/:id/credits
 * List credits for a profile
 */
export const listCredits = async (event) => {
  try {
    const { id: profileId } = event.pathParameters || {};
    if (!profileId) {
      return error('profileId is required', 400);
    }

    const prisma = getPrisma();

    // Verify profile exists
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      return error('Profile not found', 404);
    }

    const credits = await prisma.credit.findMany({
      where: { profileId },
      orderBy: [
        { year: 'desc' },
        { orderIndex: 'asc' },
      ],
    });

    return json(credits);
  } catch (e) {
    console.error('List credits error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

/**
 * POST /api/profiles/:id/credits
 * Add credit to profile (owner only)
 */
export const createCredit = async (event) => {
  try {
    const { id: profileId } = event.pathParameters || {};
    if (!profileId) {
      return error('profileId is required', 400);
    }

    const userId = getUserFromEvent(event);
    if (!userId) {
      return error('Unauthorized', 401);
    }

    const body = JSON.parse(event.body || '{}');
    const { title, role, company, year, description, orderIndex, metadata } = body;

    if (!title || !role) {
      return error('title and role are required', 400);
    }

    const prisma = getPrisma();

    // Verify profile ownership
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      return error('Profile not found', 404);
    }

    if (profile.userId !== userId) {
      return error('Forbidden - not profile owner', 403);
    }

    const credit = await prisma.credit.create({
      data: {
        profileId,
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
    console.error('Create credit error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

/**
 * PUT /api/credits/:id
 * Update credit (owner only)
 */
export const updateCredit = async (event) => {
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
    const { title, role, company, year, description, orderIndex, metadata } = body;

    const prisma = getPrisma();

    // Get credit and verify ownership
    const credit = await prisma.credit.findUnique({
      where: { id },
      include: {
        profile: true,
      },
    });

    if (!credit) {
      return error('Credit not found', 404);
    }

    if (credit.profile.userId !== userId) {
      return error('Forbidden - not credit owner', 403);
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
    console.error('Update credit error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

/**
 * DELETE /api/credits/:id
 * Delete credit (owner only)
 */
export const deleteCredit = async (event) => {
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

    // Get credit and verify ownership
    const credit = await prisma.credit.findUnique({
      where: { id },
      include: {
        profile: true,
      },
    });

    if (!credit) {
      return error('Credit not found', 404);
    }

    if (credit.profile.userId !== userId) {
      return error('Forbidden - not credit owner', 403);
    }

    await prisma.credit.delete({
      where: { id },
    });

    return json({ message: 'Credit deleted successfully' });
  } catch (e) {
    console.error('Delete credit error:', e);
    return error('Server error: ' + e.message, 500);
  }
};
