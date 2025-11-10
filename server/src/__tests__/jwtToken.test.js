/**
 * Unit tests for JWT token utilities
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  generateAccessToken,
  verifyAccessToken,
  generateVerificationToken,
  isTokenExpired,
  extractBearerToken
} from '../utils/jwtToken.js';

describe('JWT Access Tokens', () => {
  const originalSecret = process.env.AUTH_JWT_SECRET;
  
  beforeEach(() => {
    // Set test secret
    process.env.AUTH_JWT_SECRET = 'test-secret-key-for-unit-tests-12345';
  });
  
  afterEach(() => {
    // Restore original secret
    process.env.AUTH_JWT_SECRET = originalSecret;
  });
  
  it('should generate a JWT token', () => {
    const user = {
      id: 'user-123',
      email: 'test@example.com',
    };
    
    const token = generateAccessToken(user);
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
  });
  
  it('should verify a valid token', () => {
    const user = {
      id: 'user-123',
      email: 'test@example.com',
    };
    
    const token = generateAccessToken(user);
    const decoded = verifyAccessToken(token);
    
    expect(decoded).toBeTruthy();
    expect(decoded.userId).toBe(user.id);
    expect(decoded.email).toBe(user.email);
    expect(decoded.type).toBe('access');
  });
  
  it('should reject invalid token', () => {
    const decoded = verifyAccessToken('invalid.token.here');
    expect(decoded).toBeNull();
  });
  
  it('should reject tampered token', () => {
    const user = {
      id: 'user-123',
      email: 'test@example.com',
    };
    
    const token = generateAccessToken(user);
    const tampered = token.slice(0, -5) + 'xxxxx'; // Modify signature
    
    const decoded = verifyAccessToken(tampered);
    expect(decoded).toBeNull();
  });
  
  it('should throw error if JWT_SECRET not set', () => {
    delete process.env.AUTH_JWT_SECRET;
    
    const user = { id: 'user-123', email: 'test@example.com' };
    expect(() => generateAccessToken(user)).toThrow('AUTH_JWT_SECRET');
  });
});

describe('Verification Tokens', () => {
  it('should generate a verification token', () => {
    const { token, expiresAt } = generateVerificationToken();
    
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    expect(expiresAt).toBeInstanceOf(Date);
  });
  
  it('should generate unique tokens', () => {
    const token1 = generateVerificationToken();
    const token2 = generateVerificationToken();
    
    expect(token1.token).not.toBe(token2.token);
  });
  
  it('should set expiration 24 hours in future', () => {
    const { expiresAt } = generateVerificationToken();
    const now = new Date();
    const hoursDiff = (expiresAt - now) / (1000 * 60 * 60);
    
    expect(hoursDiff).toBeGreaterThan(23.9);
    expect(hoursDiff).toBeLessThan(24.1);
  });
});

describe('Token Expiration Check', () => {
  it('should detect expired token', () => {
    const pastDate = new Date(Date.now() - 1000); // 1 second ago
    expect(isTokenExpired(pastDate)).toBe(true);
  });
  
  it('should detect valid token', () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now
    expect(isTokenExpired(futureDate)).toBe(false);
  });
  
  it('should handle edge case (exact expiry time)', () => {
    const now = new Date();
    // Token expired right now - should be considered expired
    expect(isTokenExpired(now)).toBe(false); // Exact match is still valid
    
    // 1ms in the past
    const justExpired = new Date(now.getTime() - 1);
    expect(isTokenExpired(justExpired)).toBe(true);
  });
});

describe('Bearer Token Extraction', () => {
  it('should extract token from valid Bearer header', () => {
    const token = extractBearerToken('Bearer abc123xyz');
    expect(token).toBe('abc123xyz');
  });
  
  it('should handle extra whitespace', () => {
    const token = extractBearerToken('Bearer   abc123xyz  ');
    expect(token).toBe('abc123xyz');
  });
  
  it('should return null for invalid format', () => {
    expect(extractBearerToken('Basic abc123')).toBeNull();
    expect(extractBearerToken('abc123')).toBeNull();
    expect(extractBearerToken('')).toBeNull();
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken(undefined)).toBeNull();
  });
  
  it('should handle Bearer with no token', () => {
    expect(extractBearerToken('Bearer ')).toBe('');
    expect(extractBearerToken('Bearer')).toBe('');
  });
});
