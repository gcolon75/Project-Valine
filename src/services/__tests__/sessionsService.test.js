// src/services/__tests__/sessionsService.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { getSessions, revokeSession } from '../sessionsService';

describe('SessionsService', () => {
  describe('getSessions', () => {
    it('should fetch active sessions', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          lastActivity: '2024-01-15T10:00:00Z',
          createdAt: '2024-01-15T08:00:00Z',
          expiresAt: '2024-01-22T08:00:00Z'
        },
        {
          id: 'session-2',
          ipAddress: '192.168.1.2',
          userAgent: 'Chrome/120.0',
          lastActivity: '2024-01-14T15:00:00Z',
          createdAt: '2024-01-14T14:00:00Z',
          expiresAt: '2024-01-21T14:00:00Z'
        }
      ];

      server.use(
        http.get('http://localhost:4000/privacy/sessions', () => {
          return HttpResponse.json({
            success: true,
            sessions: mockSessions
          });
        })
      );

      const result = await getSessions();

      expect(result.success).toBe(true);
      expect(result.sessions).toHaveLength(2);
      expect(result.sessions[0].id).toBe('session-1');
    });

    it('should handle empty sessions list', async () => {
      server.use(
        http.get('http://localhost:4000/privacy/sessions', () => {
          return HttpResponse.json({
            success: true,
            sessions: [],
            message: 'Session tracking is not enabled'
          });
        })
      );

      const result = await getSessions();

      expect(result.success).toBe(true);
      expect(result.sessions).toHaveLength(0);
    });

    it('should handle API errors', async () => {
      server.use(
        http.get('http://localhost:4000/privacy/sessions', () => {
          return HttpResponse.json(
            {
              error: 'SESSIONS_FAILED',
              message: 'Failed to retrieve sessions'
            },
            { status: 500 }
          );
        })
      );

      await expect(getSessions()).rejects.toThrow();
    }, 15000); // Increase timeout for retry logic
  });

  describe('revokeSession', () => {
    it('should revoke a session successfully', async () => {
      server.use(
        http.delete('http://localhost:4000/privacy/sessions/session-1', () => {
          return HttpResponse.json({
            success: true,
            message: 'Session revoked successfully'
          });
        })
      );

      const result = await revokeSession('session-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Session revoked successfully');
    });

    it('should handle session not found', async () => {
      server.use(
        http.delete('http://localhost:4000/privacy/sessions/invalid-session', () => {
          return HttpResponse.json(
            {
              error: 'SESSION_NOT_FOUND',
              message: 'Session not found'
            },
            { status: 404 }
          );
        })
      );

      await expect(revokeSession('invalid-session')).rejects.toThrow();
    });

    it('should handle unauthorized revocation', async () => {
      server.use(
        http.delete('http://localhost:4000/privacy/sessions/other-user-session', () => {
          return HttpResponse.json(
            {
              error: 'SESSION_NOT_FOUND',
              message: 'Session not found'
            },
            { status: 404 }
          );
        })
      );

      await expect(revokeSession('other-user-session')).rejects.toThrow();
    });
  });
});
