// src/services/__tests__/api.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import apiClient from '../api';

describe('API Client', () => {
  beforeEach(() => {
    // Clear any stored tokens
    localStorage.clear();
  });

  describe('Authentication', () => {
    it('should include auth token in request headers when available', async () => {
      // Mock localStorage properly
      const mockGetItem = (key) => key === 'auth_token' ? 'test-token-123' : null;
      global.localStorage.getItem.mockImplementation(mockGetItem);
      
      let capturedAuthHeader = null;
      server.use(
        http.get('http://localhost:4000/test', ({ request }) => {
          capturedAuthHeader = request.headers.get('authorization');
          return HttpResponse.json({ success: true });
        })
      );

      await apiClient.get('/test');

      expect(capturedAuthHeader).toBe('Bearer test-token-123');
    });

    it('should work without auth token', async () => {
      const response = await apiClient.get('http://localhost:3001/health');
      expect(response.data).toEqual({ ok: true, status: 'healthy' });
    });
  });

  describe('Retry Logic', () => {
    it('should retry on 500 error and succeed', async () => {
      let attemptCount = 0;
      
      server.use(
        http.get('http://localhost:4000/test-retry', () => {
          attemptCount++;
          if (attemptCount < 2) {
            return HttpResponse.json(
              { error: 'Server error' },
              { status: 500 }
            );
          }
          return HttpResponse.json({ success: true, attempts: attemptCount });
        })
      );

      const response = await apiClient.get('/test-retry');
      
      expect(response.data.success).toBe(true);
      expect(attemptCount).toBeGreaterThan(1);
    });

    it('should retry on 503 error', async () => {
      let attemptCount = 0;
      
      server.use(
        http.get('http://localhost:4000/test-503', () => {
          attemptCount++;
          if (attemptCount < 2) {
            return HttpResponse.json(
              { error: 'Service unavailable' },
              { status: 503 }
            );
          }
          return HttpResponse.json({ success: true });
        })
      );

      const response = await apiClient.get('/test-503');
      expect(response.data.success).toBe(true);
    });

    it('should not retry on 404 error', async () => {
      let attemptCount = 0;
      
      server.use(
        http.get('http://localhost:4000/test-404', () => {
          attemptCount++;
          return HttpResponse.json(
            { error: 'Not found' },
            { status: 404 }
          );
        })
      );

      try {
        await apiClient.get('/test-404');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }

      expect(attemptCount).toBe(1);
    });

    it('should stop retrying after max attempts', async () => {
      let attemptCount = 0;
      
      server.use(
        http.get('http://localhost:4000/test-max-retry', () => {
          attemptCount++;
          return HttpResponse.json(
            { error: 'Always fails' },
            { status: 500 }
          );
        })
      );

      try {
        await apiClient.get('/test-max-retry');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(500);
        // Should attempt once + 3 retries = 4 total
        expect(attemptCount).toBe(4);
      }
    }, 15000); // Increase timeout for retry delays
  });

  describe('Timeout', () => {
    it('should have a default timeout configured', () => {
      expect(apiClient.defaults.timeout).toBe(30000);
    });
  });

  describe('Base URL', () => {
    it('should use VITE_API_BASE from env', () => {
      expect(apiClient.defaults.baseURL).toBeDefined();
    });
  });

  describe('Content Type', () => {
    it('should set JSON content type by default', () => {
      expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
    });
  });
});
