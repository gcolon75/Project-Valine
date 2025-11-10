/**
 * Authentication Routes
 * Handles login, email verification, and current user
 */
import { Router } from 'express';
import { getPrismaClient } from '../utils/prismaClient.js';
import { comparePassword, normalizeEmail } from '../utils/passwordHash.js';
import { generateAccessToken, requireAuth, isTokenExpired } from '../utils/jwtToken.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

/**
 * POST /api/auth/login - Authenticate user
 * 
 * Request body:
 *   - email: string (required)
 *   - password: string (required)
 * 
 * Response:
 *   - 200: Login successful, returns JWT token
 *   - 400: Validation error
 *   - 401: Invalid credentials
 *   - 403: Email not verified
 *   - 429: Rate limit exceeded
 */
router.post('/auth/login', loginRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Email and password are required',
      });
    }
    
    const prisma = getPrismaClient();
    const normalized = normalizeEmail(email);
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { normalizedEmail: normalized },
    });
    
    if (!user) {
      // Don't reveal whether user exists
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }
    
    // Verify password
    const isValid = await comparePassword(password, user.password);
    
    if (!isValid) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }
    
    // Check if email is verified
    if (!user.emailVerifiedAt) {
      return res.status(403).json({
        code: 'email_not_verified',
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address before logging in',
      });
    }
    
    // Generate JWT token
    const token = generateAccessToken(user);
    
    // Create session record (optional - for tracking)
    await prisma.session.create({
      data: {
        userId: user.id,
        token: token.substring(0, 32), // Store first 32 chars as session ID
        ipAddress: req.ip || null,
        userAgent: req.get('user-agent') || null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });
    
    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        username: user.username,
      },
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Login failed',
    });
  }
});

/**
 * POST /api/auth/verify-email - Verify email with token
 * 
 * Request body:
 *   - token: string (required)
 * 
 * Response:
 *   - 200: Email verified successfully
 *   - 400: Invalid or missing token
 *   - 410: Token expired
 */
router.post('/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Verification token is required',
      });
    }
    
    const prisma = getPrismaClient();
    
    // Find verification token
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });
    
    if (!verificationToken) {
      return res.status(400).json({
        error: 'INVALID_TOKEN',
        message: 'Invalid verification token',
      });
    }
    
    // Check if token is expired
    if (isTokenExpired(verificationToken.expiresAt)) {
      // Delete expired token
      await prisma.emailVerificationToken.delete({
        where: { token },
      });
      
      return res.status(410).json({
        error: 'TOKEN_EXPIRED',
        message: 'Verification token has expired',
      });
    }
    
    // Update user - mark email as verified
    await prisma.user.update({
      where: { id: verificationToken.userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        status: 'active', // Activate account
      },
    });
    
    // Delete used verification token
    await prisma.emailVerificationToken.delete({
      where: { token },
    });
    
    console.log(`Email verified for user: ${verificationToken.user.email}`);
    
    return res.status(200).json({
      ok: true,
      message: 'Email verified successfully',
    });
    
  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Verification failed',
    });
  }
});

/**
 * GET /api/auth/me - Get current authenticated user
 * 
 * Headers:
 *   - Authorization: Bearer <token>
 * 
 * Response:
 *   - 200: User data
 *   - 401: Unauthorized
 */
router.get('/auth/me', requireAuth, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        bio: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
      },
    });
    
    if (!user) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }
    
    return res.status(200).json({ user });
    
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to get user data',
    });
  }
});

export default router;
