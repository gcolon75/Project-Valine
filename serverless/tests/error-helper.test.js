/**
 * Tests for error() helper function
 * Validates correct signature and numeric status codes
 */

import { describe, it, expect } from 'vitest';
import { error } from '../src/utils/headers.js';

describe('error() Helper Function', () => {
  it('should return correct statusCode with default values', () => {
    const response = error();
    expect(response.statusCode).toBe(400);
    expect(typeof response.statusCode).toBe('number');
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Bad Request');
  });

  it('should accept statusCode as first parameter', () => {
    const response = error(403, 'Access denied');
    expect(response.statusCode).toBe(403);
    expect(typeof response.statusCode).toBe('number');
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Access denied');
  });

  it('should return numeric status codes for common errors', () => {
    const testCases = [
      { statusCode: 401, message: 'Unauthorized' },
      { statusCode: 403, message: 'Forbidden' },
      { statusCode: 404, message: 'Not found' },
      { statusCode: 429, message: 'Too many requests' },
      { statusCode: 500, message: 'Server error' },
      { statusCode: 503, message: 'Service unavailable' },
    ];

    for (const { statusCode, message } of testCases) {
      const response = error(statusCode, message);
      expect(response.statusCode).toBe(statusCode);
      expect(typeof response.statusCode).toBe('number');
      const body = JSON.parse(response.body);
      expect(body.error).toBe(message);
    }
  });

  it('should include CORS headers in response', () => {
    const response = error(400, 'Bad request');
    expect(response.headers).toBeDefined();
    expect(response.headers['Access-Control-Allow-Origin']).toBeDefined();
    expect(response.headers['Access-Control-Allow-Credentials']).toBe('true');
  });

  it('should include security headers', () => {
    const response = error(500, 'Server error');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(response.headers['strict-transport-security']).toBeDefined();
  });

  it('should accept extra headers', () => {
    const response = error(400, 'Bad request', { 'X-Custom-Header': 'test' });
    expect(response.headers['X-Custom-Header']).toBe('test');
  });

  it('should return JSON response with error field', () => {
    const response = error(404, 'Resource not found');
    expect(response.headers['content-type']).toBe('application/json');
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('error');
    expect(body.error).toBe('Resource not found');
  });
});
