/**
 * Session management endpoints (Phase 2)
 * Provides session listing and revocation capabilities
 */

import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserIdFromEvent, extractToken, verifyToken } from '../utils/tokenManager.js';

/**
 * GET /auth/sessions
 * List active refresh token sessions for authenticated user
 */
export const listSessions = async (event) => {
  try {
    const userId = getUserIdFromEvent(event);
    
    if (!userId) {
      return error('Unauthorized - No valid token provided', 401);
    }

    const prisma = getPrisma();
    
    // Get current JTI from refresh token to mark current session
    const refreshToken = extractToken(event, 'refresh');
    const decoded = refreshToken ? verifyToken(refreshToken) : null;
    const currentJti = decoded?.jti;
    
    // Get all active (non-invalidated, non-expired) refresh tokens for user
    const sessions = await prisma.refreshToken.findMany({
      where: {
        userId,
        invalidatedAt: null,
        expiresAt: {
          gt: new Date() // Not expired
        }
      },
      select: {
        id: true,
        jti: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true
      },
      orderBy: {
        lastUsedAt: 'desc'
      }
    });

    // Map sessions to safe response format (don't expose JTI directly)
    const safeSessions = sessions.map(session => ({
      id: session.id,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      expiresAt: session.expiresAt,
      isCurrent: session.jti === currentJti
    }));

    return json({
      sessions: safeSessions,
      total: safeSessions.length
    });
  } catch (e) {
    console.error('List sessions error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

/**
 * POST /auth/logout-session
 * Invalidate a specific session by session ID
 * Body: { sessionId: string }
 */
export const logoutSession = async (event) => {
  try {
    const userId = getUserIdFromEvent(event);
    
    if (!userId) {
      return error('Unauthorized - No valid token provided', 401);
    }

    const { sessionId } = JSON.parse(event.body || '{}');
    
    if (!sessionId) {
      return error('sessionId is required', 400);
    }

    const prisma = getPrisma();
    
    // Find the session
    const session = await prisma.refreshToken.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        userId: true,
        invalidatedAt: true
      }
    });

    if (!session) {
      return error('Session not found', 404);
    }

    // Verify user owns this session
    if (session.userId !== userId) {
      return error('Forbidden - not session owner', 403);
    }

    // Check if already invalidated
    if (session.invalidatedAt) {
      return json({
        message: 'Session already invalidated'
      });
    }

    // Invalidate the session
    await prisma.refreshToken.update({
      where: { id: sessionId },
      data: { invalidatedAt: new Date() }
    });

    return json({
      message: 'Session invalidated successfully',
      sessionId
    });
  } catch (e) {
    console.error('Logout session error:', e);
    return error('Server error: ' + e.message, 500);
  }
};
