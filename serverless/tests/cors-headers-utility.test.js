/**
 * Tests for new CORS headers utility
 * Verifies the standalone corsHeaders module functions correctly
 */

import { getCorsHeaders, addCorsHeaders } from '../src/utils/corsHeaders.js';

describe('CORS Headers Utility Tests', () => {
  const originalFrontendUrl = process.env.FRONTEND_URL;
  const originalFrontendBaseUrl = process.env.FRONTEND_BASE_URL;

  afterEach(() => {
    if (originalFrontendUrl !== undefined) {
      process.env.FRONTEND_URL = originalFrontendUrl;
    } else {
      delete process.env.FRONTEND_URL;
    }
    if (originalFrontendBaseUrl !== undefined) {
      process.env.FRONTEND_BASE_URL = originalFrontendBaseUrl;
    } else {
      delete process.env.FRONTEND_BASE_URL;
    }
  });

  describe('getCorsHeaders', () => {
    test('should return headers with allowed origin when origin matches', () => {
      process.env.FRONTEND_URL = 'https://example.com';
      
      const headers = getCorsHeaders('https://example.com');
      
      expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com');
      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
      expect(headers['Access-Control-Allow-Methods']).toContain('GET');
      expect(headers['Access-Control-Allow-Methods']).toContain('POST');
    });

    test('should default to first allowed origin when origin does not match', () => {
      process.env.FRONTEND_URL = 'https://example.com';
      
      const headers = getCorsHeaders('https://evil.com');
      
      expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com');
    });

    test('should allow localhost origins', () => {
      process.env.FRONTEND_URL = 'https://example.com';
      
      const headers = getCorsHeaders('http://localhost:5173');
      
      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
    });

    test('should include all necessary CORS headers', () => {
      process.env.FRONTEND_URL = 'https://example.com';
      
      const headers = getCorsHeaders('https://example.com');
      
      expect(headers['Access-Control-Allow-Origin']).toBeDefined();
      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
      expect(headers['Access-Control-Allow-Methods']).toBeDefined();
      expect(headers['Access-Control-Allow-Headers']).toContain('Content-Type');
      expect(headers['Access-Control-Allow-Headers']).toContain('Authorization');
      expect(headers['Access-Control-Max-Age']).toBe('86400');
    });

    test('should handle wildcard origin', () => {
      process.env.FRONTEND_URL = '*';
      
      const headers = getCorsHeaders('https://any-origin.com');
      
      expect(headers['Access-Control-Allow-Origin']).toBe('https://any-origin.com');
    });

    test('should handle missing environment variables', () => {
      delete process.env.FRONTEND_URL;
      delete process.env.FRONTEND_BASE_URL;
      
      const headers = getCorsHeaders('http://localhost:5173');
      
      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
    });
  });

  describe('addCorsHeaders', () => {
    test('should add CORS headers to response object', () => {
      process.env.FRONTEND_URL = 'https://example.com';
      
      const response = {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ success: true })
      };
      
      const event = {
        headers: {
          origin: 'https://example.com'
        }
      };
      
      const updatedResponse = addCorsHeaders(response, event);
      
      expect(updatedResponse.headers['Content-Type']).toBe('application/json');
      expect(updatedResponse.headers['Access-Control-Allow-Origin']).toBe('https://example.com');
      expect(updatedResponse.headers['Access-Control-Allow-Credentials']).toBe('true');
    });

    test('should handle event with uppercase Origin header', () => {
      process.env.FRONTEND_URL = 'https://example.com';
      
      const response = {
        statusCode: 200,
        headers: {}
      };
      
      const event = {
        headers: {
          Origin: 'https://example.com'
        }
      };
      
      const updatedResponse = addCorsHeaders(response, event);
      
      expect(updatedResponse.headers['Access-Control-Allow-Origin']).toBe('https://example.com');
    });

    test('should work without event object', () => {
      process.env.FRONTEND_URL = 'https://example.com';
      
      const response = {
        statusCode: 200,
        headers: {}
      };
      
      const updatedResponse = addCorsHeaders(response, null);
      
      expect(updatedResponse.headers['Access-Control-Allow-Origin']).toBe('https://example.com');
    });
  });
});
