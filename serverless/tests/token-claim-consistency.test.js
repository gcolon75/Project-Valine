/**
 * Tests for token claim consistency and backward compatibility
 * Verifies getUserIdFromDecoded handles both 'sub' and legacy 'userId' claims
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  getUserIdFromDecoded,
  getUserIdFromEvent
} from '../src/utils/tokenManager.js';

const TEST_USER_ID = 'test-user-123';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

describe('Token Claim Consistency & Backward Compatibility', () => {
  let originalNodeEnv;
  
  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
  });
  
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });
  
  describe('getUserIdFromDecoded helper', () => {
    it('should extract userId from modern token with sub claim', () => {
      const payload = { sub: TEST_USER_ID, type: 'access' };
      const userId = getUserIdFromDecoded(payload);
      expect(userId).toBe(TEST_USER_ID);
    });
    
    it('should extract userId from legacy token with userId claim', () => {
      const payload = { userId: TEST_USER_ID, type: 'access' };
      const userId = getUserIdFromDecoded(payload);
      expect(userId).toBe(TEST_USER_ID);
    });
    
    it('should prefer sub over userId when both present', () => {
      const payload = { 
        sub: 'new-user-id', 
        userId: 'old-user-id', 
        type: 'access' 
      };
      const userId = getUserIdFromDecoded(payload);
      expect(userId).toBe('new-user-id');
    });
    
    it('should return null for null payload', () => {
      const userId = getUserIdFromDecoded(null);
      expect(userId).toBeNull();
    });
    
    it('should return null for undefined payload', () => {
      const userId = getUserIdFromDecoded(undefined);
      expect(userId).toBeNull();
    });
    
    it('should return null for payload without sub or userId', () => {
      const payload = { type: 'access', iat: 123456 };
      const userId = getUserIdFromDecoded(payload);
      expect(userId).toBeNull();
    });
  });
  
  describe('Modern token generation', () => {
    it('should generate access token with sub claim (not userId)', () => {
      const token = generateAccessToken(TEST_USER_ID);
      const decoded = jwt.verify(token, JWT_SECRET);
      
      expect(decoded.sub).toBe(TEST_USER_ID);
      expect(decoded.userId).toBeUndefined();
      expect(decoded.type).toBe('access');
    });
    
    it('should generate refresh token with sub claim', () => {
      const token = generateRefreshToken(TEST_USER_ID);
      const decoded = jwt.verify(token, JWT_SECRET);
      
      expect(decoded.sub).toBe(TEST_USER_ID);
      expect(decoded.userId).toBeUndefined();
      expect(decoded.type).toBe('refresh');
      expect(decoded.jti).toBeDefined(); // JWT ID for rotation
    });
  });
  
  describe('Legacy token compatibility', () => {
    it('should verify and extract userId from legacy access token', () => {
      // Simulate old token format
      const legacyToken = jwt.sign(
        { userId: TEST_USER_ID, type: 'access' },
        JWT_SECRET,
        { expiresIn: '30m' }
      );
      
      const decoded = verifyToken(legacyToken);
      expect(decoded).toBeTruthy();
      
      const userId = getUserIdFromDecoded(decoded);
      expect(userId).toBe(TEST_USER_ID);
    });
    
    it('should verify and extract userId from legacy refresh token', () => {
      const legacyToken = jwt.sign(
        { userId: TEST_USER_ID, type: 'refresh', jti: 'legacy-jti' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      const decoded = verifyToken(legacyToken);
      expect(decoded).toBeTruthy();
      
      const userId = getUserIdFromDecoded(decoded);
      expect(userId).toBe(TEST_USER_ID);
    });
  });
  
  describe('getUserIdFromEvent integration', () => {
    it('should extract userId from event with modern token in cookie', () => {
      const token = generateAccessToken(TEST_USER_ID);
      const event = {
        headers: {
          cookie: `access_token=${token}`
        }
      };
      
      const userId = getUserIdFromEvent(event);
      expect(userId).toBe(TEST_USER_ID);
    });
    
    it('should extract userId from event with legacy token in cookie', () => {
      const legacyToken = jwt.sign(
        { userId: TEST_USER_ID, type: 'access' },
        JWT_SECRET,
        { expiresIn: '30m' }
      );
      
      const event = {
        headers: {
          cookie: `access_token=${legacyToken}`
        }
      };
      
      const userId = getUserIdFromEvent(event);
      expect(userId).toBe(TEST_USER_ID);
    });
    
    it('should extract userId from event with modern token in Authorization header', () => {
      const token = generateAccessToken(TEST_USER_ID);
      const event = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };
      
      const userId = getUserIdFromEvent(event);
      expect(userId).toBe(TEST_USER_ID);
    });
    
    it('should return null for event without token', () => {
      const event = { headers: {} };
      const userId = getUserIdFromEvent(event);
      expect(userId).toBeNull();
    });
    
    it('should return null for invalid token', () => {
      const event = {
        headers: {
          cookie: 'access_token=invalid.token.here'
        }
      };
      
      const userId = getUserIdFromEvent(event);
      expect(userId).toBeNull();
    });
    
    it('should return null for refresh token (type mismatch)', () => {
      const refreshToken = generateRefreshToken(TEST_USER_ID);
      const event = {
        headers: {
          cookie: `access_token=${refreshToken}` // wrong type
        }
      };
      
      const userId = getUserIdFromEvent(event);
      expect(userId).toBeNull();
    });
  });
});
