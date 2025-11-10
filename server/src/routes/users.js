/**
 * User Routes - Account Creation and Management
 * Handles signup, verification, and user management
 */
import { Router } from 'express';
import { getPrismaClient } from '../utils/prismaClient.js';
import { hashPassword, normalizeEmail, validateEmail, validatePasswordStrength } from '../utils/passwordHash.js';
import { generateVerificationToken } from '../utils/jwtToken.js';
import { signupRateLimiter } from '../middleware/rateLimiter.js';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

/**
 * POST /api/users - Create a new user account
 * 
 * Request body:
 *   - email: string (required)
 *   - password: string (required, min 8 chars)
 * 
 * Response:
 *   - 201: User created, verification required
 *   - 400: Validation error
 *   - 409: Email already exists
 *   - 429: Rate limit exceeded
 */
router.post('/users', signupRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Email and password are required',
      });
    }
    
    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid email format',
      });
    }
    
    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: passwordValidation.message,
      });
    }
    
    // Normalize email
    const normalized = normalizeEmail(email);
    
    const prisma = getPrismaClient();
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { normalizedEmail: normalized },
    });
    
    if (existingUser) {
      return res.status(409).json({
        error: 'EMAIL_EXISTS',
        message: 'An account with this email already exists',
      });
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Generate verification token
    const { token, expiresAt } = generateVerificationToken();
    
    // Create user with pending status
    const user = await prisma.user.create({
      data: {
        email,
        normalizedEmail: normalized,
        password: passwordHash,
        username: `user_${Date.now()}`, // Auto-generate username for MVP
        displayName: email.split('@')[0], // Use email prefix as display name
        status: 'pending',
        emailVerified: false,
      },
    });
    
    // Create verification token
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });
    
    // For MVP: Log verification URL and write to file for E2E tests
    const verificationUrl = `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
    
    console.log('='.repeat(80));
    console.log('EMAIL VERIFICATION TOKEN (MVP - Not sent via email)');
    console.log('='.repeat(80));
    console.log(`User: ${email}`);
    console.log(`Token: ${token}`);
    console.log(`Verification URL: ${verificationUrl}`);
    console.log(`Expires: ${expiresAt.toISOString()}`);
    console.log('='.repeat(80));
    
    // Write verification token to file for E2E tests
    try {
      const outputDir = path.join(process.cwd(), 'analysis-output');
      await fs.mkdir(outputDir, { recursive: true });
      
      const tokenFile = path.join(outputDir, `verification-token-${user.id}.json`);
      await fs.writeFile(tokenFile, JSON.stringify({
        userId: user.id,
        email,
        token,
        verificationUrl,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
      }, null, 2));
      
      console.log(`Verification token written to: ${tokenFile}`);
    } catch (error) {
      console.error('Failed to write verification token file:', error);
      // Non-fatal - continue with signup
    }
    
    return res.status(201).json({
      message: 'verification_required',
      verifyHint: `Check server logs or analysis-output/ for verification token (email not sent in MVP)`,
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
      },
    });
    
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to create account',
    });
  }
});

export default router;
