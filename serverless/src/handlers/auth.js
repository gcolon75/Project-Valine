import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Password hashing with bcrypt
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Password comparison with bcrypt
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

// Extract user from authorization header
export const getUserFromEvent = (event) => {
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader) return null;
  
  const token = authHeader.replace('Bearer ', '');
  const decoded = verifyToken(token);
  return decoded?.userId || null;
};

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

    // Generate JWT token
    const token = generateToken(user.id);

    return json({
      user,
      token,
      message: 'Registration successful. Please check your email to verify your account.'
    }, 201);
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
    const { password: _, ...userWithoutPassword } = user;

    // Generate JWT token
    const token = generateToken(user.id);

    return json({
      user: userWithoutPassword,
      token
    });
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
  
  if (EMAIL_ENABLED) {
    // TODO: Implement SMTP email sending when EMAIL_ENABLED=true
    // For now, just log that we would send an email
    console.log(`[EMAIL] Would send verification email to ${email} via SMTP`);
    console.log(`[EMAIL] Verification URL: ${verificationUrl}`);
  } else {
    // Development mode - log to console
    console.log('=== EMAIL VERIFICATION ===');
    console.log(`To: ${email}`);
    console.log(`Subject: Verify your Project Valine account`);
    console.log(`Hi ${username},`);
    console.log(`Please verify your email address by clicking the link below:`);
    console.log(verificationUrl);
    console.log(`This link will expire in 24 hours.`);
    console.log('==========================');
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

    return json({
      message: 'Verification email sent successfully. Please check your email.',
      email: user.email
    });
  } catch (e) {
    console.error('Resend verification error:', e);
    return error('Server error: ' + e.message, 500);
  }
};
