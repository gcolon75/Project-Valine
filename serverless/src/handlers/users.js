import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';

export const createUser = async (event) => {
  try {
    const { username, email, displayName, bio, avatar, role } = JSON.parse(event.body || '{}');
    
    if (!username || !email || !displayName) {
      return error('username, email, and displayName are required', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const prisma = getPrisma();
    const user = await prisma.user.create({
      data: { 
        username, 
        email: normalizedEmail, 
        normalizedEmail: normalizedEmail,
        displayName, 
        bio, 
        avatar, 
        role 
      },
    });
    
    return json(user, 201);
  } catch (e) {
    console.error(e);
    return error('Server error: ' + e.message, 500);
  }
};

export const getUser = async (event) => {
  try {
    const username = event.pathParameters?.username;
    
    if (!username) {
      return error('username is required', 400);
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { username },
      include: { 
        posts: { orderBy: { createdAt: 'desc' }, take: 20 },
        _count: { select: { posts: true } }
      },
    });
    
    if (!user) {
      return error('User not found', 404);
    }
    
    return json(user);
  } catch (e) {
    console.error(e);
    return error('Server error: ' + e.message, 500);
  }
};

export const updateUser = async (event) => {
  try {
    const id = event.pathParameters?.id;
    const { displayName, bio, avatar } = JSON.parse(event.body || '{}');
    
    if (!id) {
      return error('id is required', 400);
    }

    const prisma = getPrisma();
    const user = await prisma.user.update({
      where: { id },
      data: { displayName, bio, avatar },
    });
    
    return json(user);
  } catch (e) {
    console.error(e);
    return error('Server error: ' + e.message, 500);
  }
};
