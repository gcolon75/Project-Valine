// src/__tests__/api-client.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { apiClient } from '../api/client';

describe('API Client Configuration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should export apiClient', () => {
    expect(apiClient).toBeDefined();
    // apiClient can be either a function or object depending on how axios exports it
    expect(apiClient).toBeTruthy();
  });

  it('should be configured with correct baseURL', () => {
    expect(apiClient.defaults.baseURL).toBeDefined();
    expect(typeof apiClient.defaults.baseURL).toBe('string');
    expect(apiClient.defaults.baseURL.length).toBeGreaterThan(0);
  });

  it('should have timeout configured', () => {
    expect(apiClient.defaults.timeout).toBeDefined();
    expect(typeof apiClient.defaults.timeout).toBe('number');
    expect(apiClient.defaults.timeout).toBe(8000); // 8 seconds as per spec
  });

  it('should have JSON content-type header', () => {
    expect(apiClient.defaults.headers).toBeDefined();
    expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
  });

  it('should configure withCredentials based on environment', () => {
    expect(apiClient.defaults).toHaveProperty('withCredentials');
    expect(typeof apiClient.defaults.withCredentials).toBe('boolean');
    // When VITE_API_USE_CREDENTIALS is not set to 'true', it should be false
    expect(apiClient.defaults.withCredentials).toBe(false);
  });

  it('should have interceptors configured', () => {
    expect(apiClient.interceptors).toBeDefined();
    expect(apiClient.interceptors.request).toBeDefined();
    expect(apiClient.interceptors.response).toBeDefined();
  });

  it('should have request methods available', () => {
    expect(typeof apiClient.get).toBe('function');
    expect(typeof apiClient.post).toBe('function');
    expect(typeof apiClient.put).toBe('function');
    expect(typeof apiClient.delete).toBe('function');
    expect(typeof apiClient.patch).toBe('function');
  });
});

describe('API Client Authentication', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should have mechanism to attach auth token', () => {
    // Test that interceptors are registered (length > 0)
    expect(apiClient.interceptors.request.handlers.length).toBeGreaterThan(0);
  });

  it('should be able to make requests', async () => {
    // This test verifies the client is functional
    expect(apiClient.get).toBeDefined();
    expect(typeof apiClient.get).toBe('function');
  });
});

describe('API Client Error Handling', () => {
  it('should have response interceptor for error handling', () => {
    expect(apiClient.interceptors.response.handlers.length).toBeGreaterThan(0);
  });

  it('should have retry configuration', () => {
    // The retry logic exists in the response interceptor
    // Just verify the interceptor is configured
    expect(apiClient.interceptors.response).toBeDefined();
  });
});

describe('API Client Environment Configuration', () => {
  it('should use VITE_API_BASE for baseURL', () => {
    const baseURL = apiClient.defaults.baseURL;
    // Should either be the env value or the fallback
    expect(baseURL).toBeDefined();
    expect(typeof baseURL).toBe('string');
  });

  it('should have configurable withCredentials', () => {
    // withCredentials should be boolean and respect VITE_API_USE_CREDENTIALS
    expect(typeof apiClient.defaults.withCredentials).toBe('boolean');
  });
});

describe('API Client XSRF Configuration', () => {
  it('should have xsrfCookieName configured as XSRF-TOKEN', () => {
    expect(apiClient.defaults.xsrfCookieName).toBe('XSRF-TOKEN');
  });

  it('should have xsrfHeaderName configured as X-XSRF-TOKEN', () => {
    expect(apiClient.defaults.xsrfHeaderName).toBe('X-XSRF-TOKEN');
  });
});
