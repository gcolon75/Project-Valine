import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserFromEvent } from './auth.js';
import crypto from 'crypto';

/**
 * GET /scripts
 * List all scripts with pagination
 */
export const listScripts = async (event) => {
  try {
    const { limit = '50', cursor } = event.queryStringParameters || {};
    const prisma = getPrisma();
    
    const scripts = await prisma.scripts.findMany({
      take: parseInt(limit, 10),
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          select: { id: true, username: true, displayName: true, avatar: true }
        }
      }
    });
    
    return json(scripts);
  } catch (e) {
    console.error('listScripts error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

/**
 * POST /scripts
 * Create a new script
 */
export const createScript = async (event) => {
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
    
    const script = await prisma.scripts.create({
      data: {
        id: crypto.randomUUID(),
        title,
        summary,
        authorId: userId,
        updatedAt: new Date()
      },
      include: {
        users: {
          select: { id: true, username: true, displayName: true, avatar: true }
        }
      }
    });
    
    return json(script, 201);
  } catch (e) {
    console.error('createScript error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

/**
 * GET /scripts/{id}
 * Get a single script by ID
 */
export const getScript = async (event) => {
  try {
    const id = event.pathParameters?.id;
    
    if (!id) {
      return error('id is required', 400);
    }

    const prisma = getPrisma();
    
    const script = await prisma.scripts.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true, username: true, displayName: true, avatar: true }
        }
      }
    });
    
    if (!script) {
      return error('Script not found', 404);
    }
    
    return json(script);
  } catch (e) {
    console.error('getScript error:', e);
    return error('Server error: ' + e.message, 500);
  }
};
