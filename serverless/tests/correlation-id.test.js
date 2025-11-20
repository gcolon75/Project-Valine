/**
 * Tests for correlation ID generation and structured logging
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateCorrelationId,
  createStructuredLog,
  logStructured
} from '../src/utils/correlationId.js';

describe('Correlation ID Utilities', () => {
  describe('generateCorrelationId', () => {
    it('should generate a valid UUID v4', () => {
      const id = generateCorrelationId();
      
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });
    
    it('should generate unique IDs', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();
      const id3 = generateCorrelationId();
      
      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });
    
    it('should generate IDs consistently', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateCorrelationId());
      }
      
      // All 100 should be unique
      expect(ids.size).toBe(100);
    });
  });
  
  describe('createStructuredLog', () => {
    it('should create log with correlationId and event', () => {
      const correlationId = 'test-correlation-id';
      const event = 'login_denied';
      
      const log = createStructuredLog(correlationId, event);
      
      expect(log.correlationId).toBe(correlationId);
      expect(log.event).toBe(event);
      expect(log.timestamp).toBeDefined();
    });
    
    it('should include metadata in log', () => {
      const correlationId = 'test-id';
      const event = 'registration_denied';
      const metadata = {
        email: 'test@example.com',
        reason: 'not_in_allowlist'
      };
      
      const log = createStructuredLog(correlationId, event, metadata);
      
      expect(log.email).toBe(metadata.email);
      expect(log.reason).toBe(metadata.reason);
    });
    
    it('should include valid ISO timestamp', () => {
      const log = createStructuredLog('id', 'event');
      
      const timestamp = new Date(log.timestamp);
      expect(timestamp.toISOString()).toBe(log.timestamp);
    });
    
    it('should handle empty metadata', () => {
      const log = createStructuredLog('id', 'event', {});
      
      expect(log.correlationId).toBe('id');
      expect(log.event).toBe('event');
      expect(log.timestamp).toBeDefined();
    });
  });
  
  describe('logStructured', () => {
    let consoleLogSpy;
    let consoleWarnSpy;
    let consoleErrorSpy;
    
    beforeEach(() => {
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });
    
    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
    
    it('should log to console.log by default (info level)', () => {
      const correlationId = 'test-id';
      const event = 'test_event';
      
      logStructured(correlationId, event);
      
      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      
      expect(loggedData.correlationId).toBe(correlationId);
      expect(loggedData.event).toBe(event);
    });
    
    it('should log to console.warn for warn level', () => {
      logStructured('id', 'warning_event', {}, 'warn');
      
      expect(consoleWarnSpy).toHaveBeenCalledOnce();
      const loggedData = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
      
      expect(loggedData.event).toBe('warning_event');
    });
    
    it('should log to console.error for error level', () => {
      logStructured('id', 'error_event', {}, 'error');
      
      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      const loggedData = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      
      expect(loggedData.event).toBe('error_event');
    });
    
    it('should include metadata in logged output', () => {
      const metadata = {
        userId: '123',
        email: 'test@example.com'
      };
      
      logStructured('id', 'event', metadata);
      
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedData.userId).toBe(metadata.userId);
      expect(loggedData.email).toBe(metadata.email);
    });
    
    it('should output valid JSON', () => {
      logStructured('id', 'event', { key: 'value' });
      
      const loggedString = consoleLogSpy.mock.calls[0][0];
      expect(() => JSON.parse(loggedString)).not.toThrow();
    });
  });
  
  describe('Correlation ID in request flow', () => {
    it('should maintain same correlationId across multiple logs', () => {
      const correlationId = generateCorrelationId();
      
      const log1 = createStructuredLog(correlationId, 'request_start');
      const log2 = createStructuredLog(correlationId, 'validation_passed');
      const log3 = createStructuredLog(correlationId, 'request_complete');
      
      expect(log1.correlationId).toBe(correlationId);
      expect(log2.correlationId).toBe(correlationId);
      expect(log3.correlationId).toBe(correlationId);
    });
  });
});
