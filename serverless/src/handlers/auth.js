import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { rateLimit } from '../middleware/rateLimit.js';
import {
  generateAccessToken,
  generateRefreshToken,
  generateAccessTokenCookie,
  generateRefreshTokenCookie,
  generateClearCookieHeaders,
  extractToken,
  verifyToken,
  getUserIdFromEvent
} from '../utils/tokenManager.js';

// Password hashing with bcrypt
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Password comparison with bcrypt
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Export for backward compatibility
export const getUserFromEvent = getUserIdFromEvent;

export const register = async (event) => {
  try {
    const { email, password, username, displayName } = JSON.parse(event.body || '{}');
    
    if (!email || !password || !username || !displayName) {
      return error('email, password, username, and displayName are required', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return error('Invalid email format', 400);
    }

    // Validate password length
    if (password.length < 6) {
      return error('Password must be at least 6 characters', 400);
    }

    const prisma = getPrisma();
    
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      return error('User with this email or username already exists', 409);
    }

    // Create user with hashed password
    const hashedPassword = await hashPassword(password);
    
    // Create normalized email
    const normalizedEmail = email.toLowerCase().trim();
    
    const user = await prisma.user.create({
      data: {
        email,
        normalizedEmail,
        password: hashedPassword,
        username,
        displayName,
        emailVerified: false,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}` // Default avatar
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatar: true,
        emailVerified: true,
        createdAt: true
      }
    });

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry
    
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt
      }
    });

    // Send verification email (log in dev, SMTP in production)
    await sendVerificationEmail(user.email, verificationToken, user.username);

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Set HttpOnly cookies
    const accessCookie = generateAccessTokenCookie(accessToken);
    const refreshCookie = generateRefreshTokenCookie(refreshToken);

    return {
      statusCode: 201,
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Set-Cookie': accessCookie,
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin'
      },
      multiValueHeaders: {
        'Set-Cookie': [accessCookie, refreshCookie]
      },
      body: JSON.stringify({
        user,
        message: 'Registration successful. Please check your email to verify your account.'
      })
    };
  } catch (e) {
    console.error('Register error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

export const login = async (event) => {
  try {
    const { email, password } = JSON.parse(event.body || '{}');
    
    if (!email || !password) {
      return error('email and password are required', 400);
    }

    const prisma = getPrisma();
    
    // Find user by email
    const user = await prisma.user.findFirst({
      where: {
        email
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatar: true,
        role: true,
        password: true,
        emailVerified: true,
        twoFactorEnabled: true,
        createdAt: true
      }
    });

    if (!user) {
      return error('Invalid email or password', 401);
    }

    // Compare password with bcrypt
    const passwordMatch = await comparePassword(password, user.password);
    
    if (!passwordMatch) {
      return error('Invalid email or password', 401);
    }

    // Check if email is verified (optional enforcement - can be enabled later)
    // For now, we'll allow login but include verification status
    if (!user.emailVerified) {
      // Return 403 if you want to enforce email verification before login
      // For now, we'll just include the status in the response
      console.log(`User ${user.email} logged in with unverified email`);
    }

    // Remove password from response
    const { password: _, twoFactorEnabled, ...userWithoutPassword } = user;

    // TODO: If twoFactorEnabled is true, return 2FA challenge instead
    // For now, we'll just proceed with normal login

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Decode refresh token to get JTI
    const decoded = verifyToken(refreshToken);
    const jti = decoded?.jti;

    if (jti) {
      // Persist refresh token in database
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          jti,
          expiresAt,
          lastUsedAt: new Date()
        }
      });
    }

    // Set HttpOnly cookies
    const accessCookie = generateAccessTokenCookie(accessToken);
    const refreshCookie = generateRefreshTokenCookie(refreshToken);

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Set-Cookie': accessCookie,
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin'
      },
      multiValueHeaders: {
        'Set-Cookie': [accessCookie, refreshCookie]
      },
      body: JSON.stringify({
        user: userWithoutPassword,
        requiresTwoFactor: twoFactorEnabled && false // TODO: Implement 2FA flow
      })
    };
  } catch (e) {
    console.error('Login error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

export const me = async (event) => {
  try {
    const userId = getUserFromEvent(event);
    
    if (!userId) {
      return error('Unauthorized - No valid token provided', 401);
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatar: true,
        bio: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            reels: true,
            sentRequests: true,
            receivedRequests: true
          }
        }
      }
    });

    if (!user) {
      return error('User not found', 404);
    }

    return json({ user });
  } catch (e) {
    console.error('Me error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

// Helper function to send verification email
const sendVerificationEmail = async (email, token, username) => {
  const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true';
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verificationUrl = `${FRONTEND_URL}/verify-email?token=${token}`;
  
  // Mask token in logs (show first 8 and last 4 characters)
  const maskedToken = token.length > 12 
    ? `${token.substring(0, 8)}...${token.substring(token.length - 4)}`
    : '***masked***';
  
  if (EMAIL_ENABLED) {
    // TODO: Implement SMTP email sending when EMAIL_ENABLED=true
    // For production, integrate with SMTP provider (e.g., SendGrid, AWS SES)
    console.log(`[EMAIL] Sending verification email to ${email} via SMTP`);
    console.log(`[EMAIL] Token: ${maskedToken}`);
    // In production, send actual email here
    // await smtpTransport.sendMail({ ... });
  } else {
    // Development mode - log to console (but mask sensitive token)
    console.log('=== EMAIL VERIFICATION (DEV MODE) ===');
    console.log(`To: ${email}`);
    console.log(`Subject: Verify your Project Valine account`);
    console.log(`Hi ${username},`);
    console.log(`Please verify your email address by clicking the link below:`);
    console.log(verificationUrl);
    console.log(`Token (masked): ${maskedToken}`);
    console.log(`This link will expire in 24 hours.`);
    console.log('=====================================');
  }
};

// POST /auth/verify-email
export const verifyEmail = async (event) => {
  try {
    const { token } = JSON.parse(event.body || '{}');
    
    if (!token) {
      return error('Verification token is required', 400);
    }

    const prisma = getPrisma();
    
    // Find the verification token
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!verificationToken) {
      return error('Invalid verification token', 400);
    }

    // Check if token has expired
    if (new Date() > verificationToken.expiresAt) {
      // Delete expired token
      await prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id }
      });
      return error('Verification token has expired. Please request a new one.', 400);
    }

    // Check if user is already verified
    if (verificationToken.user.emailVerified) {
      // Delete the token since it's no longer needed
      await prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id }
      });
      return json({
        message: 'Email address already verified',
        alreadyVerified: true
      });
    }

    // Mark user as verified
    await prisma.user.update({
      where: { id: verificationToken.userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date()
      }
    });

    // Delete the used token
    await prisma.emailVerificationToken.delete({
      where: { id: verificationToken.id }
    });

    return json({
      message: 'Email verified successfully',
      verified: true
    });
  } catch (e) {
    console.error('Verify email error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

// POST /auth/resend-verification
export const resendVerification = async (event) => {
  try {
    // Apply rate limiting for email verification resend
    const rateLimitResult = await rateLimit(event, '/auth/resend-verification');
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    const userId = getUserFromEvent(event);
    
    if (!userId) {
      return error('Unauthorized - No valid token provided', 401);
    }

    const prisma = getPrisma();
    
    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        emailVerified: true
      }
    });

    if (!user) {
      return error('User not found', 404);
    }

    // Check if already verified
    if (user.emailVerified) {
      return error('Email address is already verified', 400);
    }

    // Delete any existing verification tokens for this user
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id }
    });

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry
    
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt
      }
    });

    // Send verification email
    await sendVerificationEmail(user.email, verificationToken, user.username);

    const response = json({
      message: 'Verification email sent successfully. Please check your email.',
      email: user.email
    });

    // Add rate limit headers
    if (event.rateLimitHeaders) {
      response.headers = {
        ...response.headers,
        ...event.rateLimitHeaders
      };
    }

    return response;
  } catch (e) {
    console.error('Resend verification error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

// POST /auth/refresh - Refresh access token using refresh token
export const refresh = async (event) => {
  try {
    // Extract refresh token from cookie
    const refreshToken = extractToken(event, 'refresh');
    
    if (!refreshToken) {
      return error('Refresh token required', 401);
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken);
    
    if (!decoded || decoded.type !== 'refresh') {
      return error('Invalid refresh token', 401);
    }

    const prisma = getPrisma();
    
    // Check if refresh token exists and is not invalidated
    const oldJti = decoded.jti;
    if (oldJti) {
      const storedToken = await prisma.refreshToken.findUnique({
        where: { jti: oldJti }
      });

      if (!storedToken) {
        return error('Invalid refresh token', 401);
      }

      if (storedToken.invalidatedAt) {
        return error('Refresh token has been invalidated', 401);
      }

      // Check if expired
      if (new Date() > storedToken.expiresAt) {
        return error('Refresh token has expired', 401);
      }
    }
    
    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true }
    });

    if (!user) {
      return error('User not found', 404);
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user.id);
    
    // Rotate refresh token (generate new one for security)
    const newRefreshToken = generateRefreshToken(user.id);
    const newDecoded = verifyToken(newRefreshToken);
    const newJti = newDecoded?.jti;

    // Database transaction: invalidate old token and create new one
    if (oldJti && newJti) {
      await prisma.$transaction([
        // Invalidate old refresh token
        prisma.refreshToken.update({
          where: { jti: oldJti },
          data: { invalidatedAt: new Date() }
        }),
        // Create new refresh token
        prisma.refreshToken.create({
          data: {
            userId: user.id,
            jti: newJti,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            lastUsedAt: new Date()
          }
        })
      ]);
    }

    // Set new cookies
    const accessCookie = generateAccessTokenCookie(newAccessToken);
    const refreshCookie = generateRefreshTokenCookie(newRefreshToken);

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Set-Cookie': accessCookie,
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin'
      },
      multiValueHeaders: {
        'Set-Cookie': [accessCookie, refreshCookie]
      },
      body: JSON.stringify({
        message: 'Token refreshed successfully'
      })
    };
  } catch (e) {
    console.error('Refresh token error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

// POST /auth/logout - Clear authentication cookies and invalidate refresh token
export const logout = async (event) => {
  try {
    // Extract refresh token to invalidate it
    const refreshToken = extractToken(event, 'refresh');
    
    if (refreshToken) {
      const decoded = verifyToken(refreshToken);
      const jti = decoded?.jti;
      
      if (jti) {
        const prisma = getPrisma();
        
        // Invalidate the refresh token in database
        try {
          await prisma.refreshToken.update({
            where: { jti },
            data: { invalidatedAt: new Date() }
          });
        } catch (err) {
          // Token might not exist in database, that's okay
          console.log('Refresh token not found for invalidation:', jti);
        }
      }
    }

    // Generate cookie clearing headers
    const clearCookies = generateClearCookieHeaders();

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin'
      },
      multiValueHeaders: {
        'Set-Cookie': clearCookies
      },
      body: JSON.stringify({
        message: 'Logged out successfully'
      })
    };
  } catch (e) {
    console.error('Logout error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

// ========== 2FA Endpoints (Phase 2) ==========

/**
 * Simple TOTP implementation for 2FA
 * In production, consider using a library like 'otplib' or 'speakeasy'
 */

// Generate base32 secret for TOTP
const generateTOTPSecret = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 32; i++) {
    secret += chars[Math.floor(Math.random() * chars.length)];
  }
  return secret;
};

// Verify TOTP code (simplified - for production use a proper library)
const verifyTOTPCode = (secret, code) => {
  // TODO: Implement proper TOTP verification with time-based counter
  // For now, this is a placeholder that always returns true if TWO_FACTOR_ENABLED feature flag is off
  // In production, use a library like 'otplib' or implement RFC 6238
  const TWO_FACTOR_ENABLED = process.env.TWO_FACTOR_ENABLED === 'true';
  
  if (!TWO_FACTOR_ENABLED) {
    return true; // Feature flag disabled, bypass verification
  }
  
  // Placeholder verification (replace with actual TOTP implementation)
  console.warn('[2FA] TOTP verification not fully implemented. Use a library like otplib in production.');
  return code && code.length === 6; // Basic validation
};

/**
 * POST /auth/2fa/setup
 * Generate provisional 2FA secret and QR code URL
 */
export const setup2FA = async (event) => {
  try {
    const TWO_FACTOR_ENABLED = process.env.TWO_FACTOR_ENABLED === 'true';
    
    if (!TWO_FACTOR_ENABLED) {
      return error('2FA feature is not enabled', 404);
    }

    const userId = getUserIdFromEvent(event);
    
    if (!userId) {
      return error('Unauthorized - No valid token provided', 401);
    }

    const prisma = getPrisma();
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        twoFactorEnabled: true
      }
    });

    if (!user) {
      return error('User not found', 404);
    }

    if (user.twoFactorEnabled) {
      return error('2FA is already enabled for this account', 400);
    }

    // Generate new TOTP secret
    const secret = generateTOTPSecret();
    
    // Generate otpauth URL for QR code
    const appName = 'Project Valine';
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(user.email)}?secret=${secret}&issuer=${encodeURIComponent(appName)}`;

    // Store secret temporarily (not enabled yet)
    // TODO: Encrypt the secret before storing
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret }
    });

    return json({
      secret,
      otpauthUrl,
      message: 'Scan the QR code with your authenticator app, then call /auth/2fa/enable with a verification code'
    });
  } catch (e) {
    console.error('2FA setup error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

/**
 * POST /auth/2fa/enable
 * Enable 2FA after verifying a code
 * Body: { code: string }
 */
export const enable2FA = async (event) => {
  try {
    const TWO_FACTOR_ENABLED = process.env.TWO_FACTOR_ENABLED === 'true';
    
    if (!TWO_FACTOR_ENABLED) {
      return error('2FA feature is not enabled', 404);
    }

    const userId = getUserIdFromEvent(event);
    
    if (!userId) {
      return error('Unauthorized - No valid token provided', 401);
    }

    const { code } = JSON.parse(event.body || '{}');
    
    if (!code) {
      return error('Verification code is required', 400);
    }

    const prisma = getPrisma();
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        twoFactorEnabled: true,
        twoFactorSecret: true
      }
    });

    if (!user) {
      return error('User not found', 404);
    }

    if (user.twoFactorEnabled) {
      return error('2FA is already enabled', 400);
    }

    if (!user.twoFactorSecret) {
      return error('No 2FA setup found. Call /auth/2fa/setup first.', 400);
    }

    // Verify the code
    const isValid = verifyTOTPCode(user.twoFactorSecret, code);
    
    if (!isValid) {
      return error('Invalid verification code', 400);
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true }
    });

    return json({
      message: '2FA enabled successfully',
      enabled: true
    });
  } catch (e) {
    console.error('2FA enable error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

/**
 * POST /auth/2fa/verify
 * Verify 2FA code during login (called after password verification)
 * Body: { code: string, userId: string (from temporary session) }
 */
export const verify2FA = async (event) => {
  try {
    const TWO_FACTOR_ENABLED = process.env.TWO_FACTOR_ENABLED === 'true';
    
    if (!TWO_FACTOR_ENABLED) {
      return error('2FA feature is not enabled', 404);
    }

    const { code, userId } = JSON.parse(event.body || '{}');
    
    if (!code || !userId) {
      return error('code and userId are required', 400);
    }

    const prisma = getPrisma();
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        twoFactorEnabled: true,
        twoFactorSecret: true
      }
    });

    if (!user) {
      return error('User not found', 404);
    }

    if (!user.twoFactorEnabled) {
      return error('2FA is not enabled for this user', 400);
    }

    // Verify the code
    const isValid = verifyTOTPCode(user.twoFactorSecret, code);
    
    if (!isValid) {
      return error('Invalid verification code', 401);
    }

    return json({
      message: '2FA verified successfully',
      verified: true
    });
  } catch (e) {
    console.error('2FA verify error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

/**
 * POST /auth/2fa/disable
 * Disable 2FA for the authenticated user
 * Body: { code: string } - requires valid 2FA code to disable
 */
export const disable2FA = async (event) => {
  try {
    const TWO_FACTOR_ENABLED = process.env.TWO_FACTOR_ENABLED === 'true';
    
    if (!TWO_FACTOR_ENABLED) {
      return error('2FA feature is not enabled', 404);
    }

    const userId = getUserIdFromEvent(event);
    
    if (!userId) {
      return error('Unauthorized - No valid token provided', 401);
    }

    const { code } = JSON.parse(event.body || '{}');
    
    if (!code) {
      return error('Verification code is required to disable 2FA', 400);
    }

    const prisma = getPrisma();
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        twoFactorEnabled: true,
        twoFactorSecret: true
      }
    });

    if (!user) {
      return error('User not found', 404);
    }

    if (!user.twoFactorEnabled) {
      return error('2FA is not enabled', 400);
    }

    // Verify the code before disabling
    const isValid = verifyTOTPCode(user.twoFactorSecret, code);
    
    if (!isValid) {
      return error('Invalid verification code', 401);
    }

    // Disable 2FA and clear secret
    await prisma.user.update({
      where: { id: userId },
      data: { 
        twoFactorEnabled: false,
        twoFactorSecret: null
      }
    });

    return json({
      message: '2FA disabled successfully',
      enabled: false
    });
  } catch (e) {
    console.error('2FA disable error:', e);
    return error('Server error: ' + e.message, 500);
  }
};
