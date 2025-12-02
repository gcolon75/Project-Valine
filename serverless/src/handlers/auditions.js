import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserFromEvent } from './auth.js';
import crypto from 'crypto';

/**
 * GET /auditions
 * List all auditions with pagination
 */
export const listAuditions = async (event) => {
  try {
    const { limit = '50', cursor } = event.queryStringParameters || {};
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const prisma = getPrisma();
    
    const auditions = await prisma.auditions.findMany({
      take: parsedLimit,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          select: { id: true, username: true, displayName: true, avatar: true }
        }
      }
    });
    
    return json(auditions);
  } catch (e) {
    console.error('listAuditions error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

/**
 * POST /auditions
 * Create a new audition
 */
export const createAudition = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    if (!userId) {
      return error('Unauthorized', 401);
    }

    const { title, summary = '' } = JSON.parse(event.body || '{}');
    
    if (!title) {
      return error('title is required', 400);
    }

    const prisma = getPrisma();
    
    const audition = await prisma.auditions.create({
      data: {
        id: crypto.randomUUID(),
        title,
        summary,
        hostId: userId,
        updatedAt: new Date()
      },
      include: {
        users: {
          select: { id: true, username: true, displayName: true, avatar: true }
        }
      }
    });
    
    return json(audition, 201);
  } catch (e) {
    console.error('createAudition error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

/**
 * GET /auditions/{id}
 * Get a single audition by ID
 */
export const getAudition = async (event) => {
  try {
    const id = event.pathParameters?.id;
    
    if (!id) {
      return error('id is required', 400);
    }

    const prisma = getPrisma();
    
    const audition = await prisma.auditions.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true, username: true, displayName: true, avatar: true }
        }
      }
    });
    
    if (!audition) {
      return error('Audition not found', 404);
    }
    
    return json(audition);
  } catch (e) {
    console.error('getAudition error:', e);
    return error('Server error: ' + e.message, 500);
  }
};
