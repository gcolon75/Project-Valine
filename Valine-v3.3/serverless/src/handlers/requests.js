import { getPrisma } from '../db/client.js';
import { verifyIdToken } from '../utils/verifyCognito.js';
import { json, error } from '../utils/headers.js';

const region = process.env.COGNITO_REGION;
const userPoolId = process.env.COGNITO_POOL_ID;
const audience = process.env.COGNITO_CLIENT_ID;

export const handler = async (event) => {
  try {
    const method = event.requestContext?.http?.method;
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader?.startsWith('Bearer ')) return error('Missing token', 401);
    const token = authHeader.slice(7);
    const user = await verifyIdToken(token, { region, userPoolId, audience });

    const prisma = getPrisma();

    if (method === 'GET') {
      const list = await prisma.accessRequest.findMany({
        where: { requesterId: user.sub },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return json(list);
    }

    if (method === 'POST') {
      const { scriptId } = JSON.parse(event.body || '{}');
      if (!scriptId) return error('scriptId is required', 422);
      const created = await prisma.accessRequest.create({ data: { scriptId, requesterId: user.sub, status: 'PENDING' } });
      return json(created, 201);
    }

    // Approve / Reject routes
    const id = event.pathParameters?.id;
    if (method === 'POST' && id && event.rawPath?.endsWith('/approve')) {
      const updated = await prisma.accessRequest.update({ where: { id }, data: { status: 'APPROVED' } });
      return json(updated);
    }
    if (method === 'POST' && id && event.rawPath?.endsWith('/reject')) {
      const updated = await prisma.accessRequest.update({ where: { id }, data: { status: 'REJECTED' } });
      return json(updated);
    }

    return error('Method Not Allowed', 405);
  } catch (e) {
    console.error(e);
    return error('Server error', 500);
  }
};
