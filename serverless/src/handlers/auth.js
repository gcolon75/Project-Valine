import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Simple password hashing (in production, use bcrypt)
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
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
    const hashedPassword = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
        displayName,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}` // Default avatar
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatar: true,
        createdAt: true
      }
    });

    // Generate JWT token
    const token = generateToken(user.id);

    return json({
      user,
      token
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
    const hashedPassword = hashPassword(password);
    
    // Find user by email and password
    const user = await prisma.user.findFirst({
      where: {
        email,
        password: hashedPassword
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatar: true,
        role: true,
        createdAt: true
      }
    });

    if (!user) {
      return error('Invalid email or password', 401);
    }

    // Generate JWT token
    const token = generateToken(user.id);

    return json({
      user,
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
