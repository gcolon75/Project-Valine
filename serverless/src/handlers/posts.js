import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';

const headers = { 'Access-Control-Allow-Origin': '*' };

export const createPost = async (event) => {
  try {
    const { content, media, authorId } = JSON.parse(event.body || '{}');
    
    if (!content || !authorId) {
      return error('content and authorId are required', 400);
    }

    const prisma = getPrisma();
    const post = await prisma.post.create({
      data: { content, media: media || [], authorId },
      include: { 
        author: { 
          select: { id: true, username: true, displayName: true, avatar: true } 
        } 
      },
    });
    
    return json(post, 201);
  } catch (e) {
    console.error(e);
    return error('Server error: ' + e.message, 500);
  }
};

export const listPosts = async (event) => {
  try {
    const { limit = '20', cursor } = event.queryStringParameters || {};
    
    const prisma = getPrisma();
    const posts = await prisma.post.findMany({
      take: parseInt(limit),
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
      include: { 
        author: { 
          select: { id: true, username: true, displayName: true, avatar: true } 
        } 
      },
    });
    
    return json(posts);
  } catch (e) {
    console.error(e);
    return error('Server error: ' + e.message, 500);
  }
};

export const getPost = async (event) => {
  try {
    const id = event.pathParameters?.id;
    
    if (!id) {
      return error('id is required', 400);
    }

    const prisma = getPrisma();
    const post = await prisma.post.findUnique({
      where: { id },
      include: { 
        author: { 
          select: { id: true, username: true, displayName: true, avatar: true } 
        } 
      },
    });
    
    if (!post) {
      return error('Post not found', 404);
    }
    
    return json(post);
  } catch (e) {
    console.error(e);
    return error('Server error: ' + e.message, 500);
  }
};
