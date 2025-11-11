// src/services/__tests__/twoFactorService.test.js
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { 
  enroll2FA, 
  verifyEnrollment, 
  disable2FA, 
  get2FAStatus,
  regenerateRecoveryCodes
} from '../twoFactorService';

describe('TwoFactorService', () => {
  describe('enroll2FA', () => {
    it('should initiate 2FA enrollment', async () => {
      const mockResponse = {
        success: true,
        message: '2FA enrollment initiated',
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        secret: 'JBSWY3DPEHPK3PXP',
        manualEntryKey: 'JBSWY3DPEHPK3PXP'
      };

      server.use(
        http.post('http://localhost:4000/2fa/enroll', () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await enroll2FA();

      expect(result.success).toBe(true);
      expect(result.qrCode).toBeDefined();
      expect(result.secret).toBeDefined();
      expect(result.manualEntryKey).toBe('JBSWY3DPEHPK3PXP');
    });

    it('should handle enrollment errors', async () => {
      server.use(
        http.post('http://localhost:4000/2fa/enroll', () => {
          return HttpResponse.json(
            {
              error: 'ALREADY_ENABLED',
              message: '2FA is already enabled for this account'
            },
            { status: 400 }
          );
        })
      );

      await expect(enroll2FA()).rejects.toThrow();
    });
  });

  describe('verifyEnrollment', () => {
    it('should verify enrollment with valid code', async () => {
      const mockResponse = {
        success: true,
        message: '2FA enabled successfully',
        recoveryCodes: [
          'AAAA-BBBB-CCCC-DDDD',
          'EEEE-FFFF-GGGG-HHHH',
          'IIII-JJJJ-KKKK-LLLL'
        ]
      };

      server.use(
        http.post('http://localhost:4000/2fa/verify-enrollment', () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await verifyEnrollment('123456');

      expect(result.success).toBe(true);
      expect(result.recoveryCodes).toHaveLength(3);
    });

    it('should reject invalid code', async () => {
      server.use(
        http.post('http://localhost:4000/2fa/verify-enrollment', () => {
          return HttpResponse.json(
            {
              error: 'INVALID_CODE',
              message: 'Invalid verification code'
            },
            { status: 401 }
          );
        })
      );

      await expect(verifyEnrollment('000000')).rejects.toThrow();
    });

    it('should require code parameter', async () => {
      server.use(
        http.post('http://localhost:4000/2fa/verify-enrollment', ({ request }) => {
          return request.json().then(body => {
            if (!body.code) {
              return HttpResponse.json(
                {
                  error: 'MISSING_CODE',
                  message: 'Verification code is required'
                },
                { status: 400 }
              );
            }
            return HttpResponse.json({ success: true });
          });
        })
      );

      await expect(verifyEnrollment('')).rejects.toThrow();
    });
  });

  describe('disable2FA', () => {
    it('should disable 2FA with valid password', async () => {
      server.use(
        http.post('http://localhost:4000/2fa/disable', () => {
          return HttpResponse.json({
            success: true,
            message: '2FA disabled successfully'
          });
        })
      );

      const result = await disable2FA('correct-password');

      expect(result.success).toBe(true);
    });

    it('should reject invalid password', async () => {
      server.use(
        http.post('http://localhost:4000/2fa/disable', () => {
          return HttpResponse.json(
            {
              error: 'INVALID_PASSWORD',
              message: 'Invalid password'
            },
            { status: 401 }
          );
        })
      );

      await expect(disable2FA('wrong-password')).rejects.toThrow();
    });
  });

  describe('get2FAStatus', () => {
    it('should get 2FA status when enabled', async () => {
      server.use(
        http.get('http://localhost:4000/2fa/status', () => {
          return HttpResponse.json({
            enabled: true
          });
        })
      );

      const result = await get2FAStatus();

      expect(result.enabled).toBe(true);
    });

    it('should get 2FA status when disabled', async () => {
      server.use(
        http.get('http://localhost:4000/2fa/status', () => {
          return HttpResponse.json({
            enabled: false
          });
        })
      );

      const result = await get2FAStatus();

      expect(result.enabled).toBe(false);
    });
  });

  describe('regenerateRecoveryCodes', () => {
    it('should regenerate recovery codes', async () => {
      const mockResponse = {
        success: true,
        recoveryCodes: [
          'AAAA-1111-BBBB-2222',
          'CCCC-3333-DDDD-4444',
          'EEEE-5555-FFFF-6666'
        ]
      };

      server.use(
        http.post('http://localhost:4000/2fa/regenerate-recovery-codes', () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const result = await regenerateRecoveryCodes('password');

      expect(result.success).toBe(true);
      expect(result.recoveryCodes).toHaveLength(3);
    });

    it('should require valid password', async () => {
      server.use(
        http.post('http://localhost:4000/2fa/regenerate-recovery-codes', () => {
          return HttpResponse.json(
            {
              error: 'INVALID_PASSWORD',
              message: 'Invalid password'
            },
            { status: 401 }
          );
        })
      );

      await expect(regenerateRecoveryCodes('wrong')).rejects.toThrow();
    });
  });
});
