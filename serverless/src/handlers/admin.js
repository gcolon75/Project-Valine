import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserIdFromEvent } from '../utils/tokenManager.js';

/**
 * Verifies the request is from an authenticated admin user.
 * Returns the user record or null if unauthorized.
 */
async function requireAdmin(event, prisma) {
  const userId = getUserIdFromEvent(event);
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user || user.role !== 'admin') return null;
  return user;
}

/**
 * GET /admin/allowed-emails
 * Returns the full list of allowed emails.
 */
export const getAdminAllowedEmails = async (event) => {
  try {
    const prisma = getPrisma();
    const admin = await requireAdmin(event, prisma);
    if (!admin) return error(403, 'Forbidden', { event });

    const emails = await prisma.allowedEmail.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, addedBy: true, createdAt: true },
    });

    return json(emails, 200, { event });
  } catch (e) {
    console.error(e);
    return error(500, 'Server error: ' + e.message, { event });
  }
};

/**
 * POST /admin/allowed-emails
 * Body: { email: string }
 * Adds an email to the allowlist.
 */
export const addAdminAllowedEmail = async (event) => {
  try {
    const prisma = getPrisma();
    const admin = await requireAdmin(event, prisma);
    if (!admin) return error(403, 'Forbidden', { event });

    const { email } = JSON.parse(event.body || '{}');
    if (!email || typeof email !== 'string') {
      return error(400, 'email is required', { event });
    }

    const normalized = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return error(400, 'Invalid email format', { event });
    }

    const record = await prisma.allowedEmail.upsert({
      where: { email: normalized },
      update: {},
      create: { email: normalized, addedBy: admin.id },
    });

    return json(record, 201, { event });
  } catch (e) {
    console.error(e);
    return error(500, 'Server error: ' + e.message, { event });
  }
};

/**
 * DELETE /admin/allowed-emails/{email}
 * Removes an email from the allowlist.
 */
export const deleteAdminAllowedEmail = async (event) => {
  try {
    const prisma = getPrisma();
    const admin = await requireAdmin(event, prisma);
    if (!admin) return error(403, 'Forbidden', { event });

    const emailParam = event.pathParameters?.email;
    if (!emailParam) return error(400, 'email path parameter is required', { event });

    const normalized = decodeURIComponent(emailParam).toLowerCase().trim();

    await prisma.allowedEmail.delete({ where: { email: normalized } });

    return json({ message: 'Email removed from allowlist' }, 200, { event });
  } catch (e) {
    if (e.code === 'P2025') {
      return error(404, 'Email not found in allowlist', { event });
    }
    console.error(e);
    return error(500, 'Server error: ' + e.message, { event });
  }
};
