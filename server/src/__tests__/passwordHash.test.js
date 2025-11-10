/**
 * Unit tests for password hashing utilities
 */
import { describe, it, expect } from 'vitest';
import { 
  hashPassword, 
  comparePassword, 
  normalizeEmail, 
  validatePasswordStrength,
  validateEmail 
} from '../utils/passwordHash.js';

describe('Password Hashing', () => {
  it('should hash a password', async () => {
    const password = 'TestPassword123!';
    const hash = await hashPassword(password);
    
    expect(hash).toBeTruthy();
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are ~60 chars
  });
  
  it('should not hash the same password to the same value (salt)', async () => {
    const password = 'TestPassword123!';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    
    expect(hash1).not.toBe(hash2);
  });
  
  it('should correctly compare password with hash', async () => {
    const password = 'TestPassword123!';
    const hash = await hashPassword(password);
    
    const isValid = await comparePassword(password, hash);
    expect(isValid).toBe(true);
  });
  
  it('should reject incorrect password', async () => {
    const password = 'TestPassword123!';
    const hash = await hashPassword(password);
    
    const isValid = await comparePassword('WrongPassword', hash);
    expect(isValid).toBe(false);
  });
  
  it('should reject password shorter than 8 characters', async () => {
    await expect(hashPassword('short')).rejects.toThrow('at least 8 characters');
  });
  
  it('should reject empty password', async () => {
    await expect(hashPassword('')).rejects.toThrow();
  });
  
  it('should reject non-string password', async () => {
    await expect(hashPassword(null)).rejects.toThrow();
    await expect(hashPassword(undefined)).rejects.toThrow();
    await expect(hashPassword(123)).rejects.toThrow();
  });
});

describe('Email Normalization', () => {
  it('should normalize email to lowercase', () => {
    expect(normalizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
    expect(normalizeEmail('User@Example.Com')).toBe('user@example.com');
  });
  
  it('should trim whitespace', () => {
    expect(normalizeEmail('  test@example.com  ')).toBe('test@example.com');
    expect(normalizeEmail('\ttest@example.com\n')).toBe('test@example.com');
  });
  
  it('should handle both lowercase and trim', () => {
    expect(normalizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com');
  });
  
  it('should reject empty email', () => {
    expect(() => normalizeEmail('')).toThrow();
    expect(() => normalizeEmail(null)).toThrow();
    expect(() => normalizeEmail(undefined)).toThrow();
  });
});

describe('Password Validation', () => {
  it('should accept password with 8+ characters', () => {
    const result = validatePasswordStrength('password123');
    expect(result.valid).toBe(true);
  });
  
  it('should reject password with less than 8 characters', () => {
    const result = validatePasswordStrength('short');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('at least 8 characters');
  });
  
  it('should reject empty password', () => {
    const result = validatePasswordStrength('');
    expect(result.valid).toBe(false);
  });
  
  it('should reject null/undefined password', () => {
    expect(validatePasswordStrength(null).valid).toBe(false);
    expect(validatePasswordStrength(undefined).valid).toBe(false);
  });
});

describe('Email Validation', () => {
  it('should accept valid email formats', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test.user@example.co.uk')).toBe(true);
    expect(validateEmail('user+tag@example.com')).toBe(true);
  });
  
  it('should reject invalid email formats', () => {
    expect(validateEmail('notanemail')).toBe(false);
    expect(validateEmail('missing@domain')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
  });
  
  it('should reject empty/null email', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail(null)).toBe(false);
    expect(validateEmail(undefined)).toBe(false);
  });
});
