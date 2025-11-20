// Replaces @jest/globals import with vitest
import { describe, it, expect } from 'vitest';
import {
  generateAccessTokenCookie,
  generateRefreshTokenCookie
} from '../src/utils/tokenManager.js';

describe('Cookie Hardening (production)', () => {
  it('should use SameSite=Strict in production', () => {
    process.env.NODE_ENV = 'production';
    const cookie = generateAccessTokenCookie('fake-jwt-token');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('HttpOnly');
  });
});