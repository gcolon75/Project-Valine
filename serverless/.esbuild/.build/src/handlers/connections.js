import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';

const headers = { 'Access-Control-Allow-Origin': '*' };

export const sendRequest = async (event) => {
  try {
    const { senderId, receiverId, message } = JSON.parse(event.body || '{}');
    
    if (!senderId || !receiverId) {
      return error('senderId and receiverId are required', 400);
    }

    const prisma = getPrisma();
    const request = await prisma.connectionRequest.create({
      data: { senderId, receiverId, message },
      include: { sender: true, receiver: true },
    });
    
    return json(request, 201);
  } catch (e) {
    console.error(e);
    return error('Server error: ' + e.message, 500);
  }
};

export const listRequests = async (event) => {
  try {
    const { userId } = event.queryStringParameters || {};
    
    if (!userId) {
      return error('userId is required', 400);
    }

    const prisma = getPrisma();
    const requests = await prisma.connectionRequest.findMany({
      where: { receiverId: userId, status: 'pending' },
      include: { sender: true },
      orderBy: { createdAt: 'desc' },
    });
    
    return json(requests);
  } catch (e) {
    console.error(e);
    return error('Server error: ' + e.message, 500);
  }
};

export const approveRequest = async (event) => {
  try {
    const id = event.pathParameters?.id;
    
    if (!id) {
      return error('id is required', 400);
    }

    const prisma = getPrisma();
    const request = await prisma.connectionRequest.update({
      where: { id },
      data: { status: 'accepted' },
    });
    
    return json(request);
  } catch (e) {
    console.error(e);
    return error('Server error: ' + e.message, 500);
  }
};

export const rejectRequest = async (event) => {
  try {
    const id = event.pathParameters?.id;
    
    if (!id) {
      return error('id is required', 400);
    }

    const prisma = getPrisma();
    const request = await prisma.connectionRequest.update({
      where: { id },
      data: { status: 'rejected' },
    });
    
    return json(request);
  } catch (e) {
    console.error(e);
    return error('Server error: ' + e.message, 500);
  }
};
