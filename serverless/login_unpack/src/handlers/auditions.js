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
      const list = await prisma.audition.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
      return json(list);
    }

    if (method === 'POST') {
      const { title, summary = '', isDraft = true } = JSON.parse(event.body || '{}');
      if (!title) return error('title is required', 422);

      const created = await prisma.audition.create({
        data: {
          title,
          summary,
          isDraft,
          owner: {
            connectOrCreate: {
              where: { id: user.sub },
              create: { id: user.sub, email: user.email ?? `${user.sub}@unknown`, role: 'artist' },
            },
          },
        },
      });
      return json(created, 201);
    }

    return error('Method Not Allowed', 405);
  } catch (e) {
    console.error(e);
    return error('Server error', 500);
  }
};
