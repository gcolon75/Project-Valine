import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserIdFromEvent } from '../utils/tokenManager.js';
import { sendEmail } from '../utils/email.js';

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
 * POST /waitlist
 * Public — submit a waitlist entry.
 * Body: { firstName, lastName, email, phone }
 */
export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;
  const path = event.requestContext?.http?.path || event.path || '';

  if (method === 'POST' && path === '/waitlist') return submitWaitlist(event);
  if (method === 'GET' && path === '/admin/waitlist') return getWaitlist(event);
  if (method === 'PATCH' && path.startsWith('/admin/waitlist/')) return updateWaitlistStatus(event);

  return error(404, 'Not found', { event });
};

async function submitWaitlist(event) {
  try {
    const prisma = getPrisma();
    const { firstName, lastName, email, interest } = JSON.parse(event.body || '{}');

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
      return error(400, 'All fields are required', { event });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return error(400, 'Invalid email format', { event });
    }

    const existing = await prisma.waitlistEntry.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return error(409, 'This email is already on the waitlist', { event });
    }

    const entry = await prisma.waitlistEntry.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        interest: interest?.trim() || null,
      },
    });

    // Send confirmation email (non-blocking — don't fail the request if email fails)
    sendEmail({
      to: normalizedEmail,
      subject: "You're on the Joint Networking waitlist!",
      html: `<p>Hi ${entry.firstName},</p>
<p>Thanks for signing up! You're now on the Joint Networking waitlist.</p>
<p>We'll send you an email as soon as your account is approved.</p>
<p>— The Joint Networking Team</p>`,
      text: `Hi ${entry.firstName},\n\nThanks for signing up! You're now on the Joint Networking waitlist.\n\nWe'll send you an email as soon as your account is approved.\n\n— The Joint Networking Team`,
    }).catch(e => console.error('[waitlist] confirmation email failed:', e.message));

    return json({ message: 'Added to waitlist', id: entry.id }, 201, { event });
  } catch (e) {
    console.error(e);
    return error(500, 'Server error: ' + e.message, { event });
  }
};

/**
 * GET /admin/waitlist
 * Admin only — list all waitlist entries.
 */
async function getWaitlist(event) {
  try {
    const prisma = getPrisma();
    const admin = await requireAdmin(event, prisma);
    if (!admin) return error(403, 'Forbidden', { event });

    const entries = await prisma.waitlistEntry.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return json(entries, 200, { event });
  } catch (e) {
    console.error(e);
    return error(500, 'Server error: ' + e.message, { event });
  }
};

/**
 * PATCH /admin/waitlist/{id}
 * Admin only — approve or deny a waitlist entry.
 * Body: { status: 'approved' | 'denied' }
 */
async function updateWaitlistStatus(event) {
  try {
    const prisma = getPrisma();
    const admin = await requireAdmin(event, prisma);
    if (!admin) return error(403, 'Forbidden', { event });

    const id = event.pathParameters?.id;
    if (!id) return error(400, 'id path parameter is required', { event });

    const { status } = JSON.parse(event.body || '{}');
    if (!['approved', 'denied'].includes(status)) {
      return error(400, 'status must be approved or denied', { event });
    }

    const entry = await prisma.waitlistEntry.update({
      where: { id },
      data: { status },
    });

    if (status === 'approved') {
      await prisma.allowedEmail.upsert({
        where: { email: entry.email },
        update: {},
        create: { email: entry.email, addedBy: 'waitlist' },
      });

      // Send approval email (non-blocking)
      sendEmail({
        to: entry.email,
        subject: "You've been approved for Joint Networking!",
        html: `<p>Hi ${entry.firstName},</p>
<p>Congratulations! And thank you for becoming one of the first members of Joint Networking — ensuring you premium access and a free account.</p>
<p>You can now create your account at <a href="https://joint-networking.com/join">joint-networking.com/join</a>.</p>
<p>Welcome aboard!</p>
<p>— The Joint Networking Team</p>`,
        text: `Hi ${entry.firstName},\n\nCongratulations! And thank you for becoming one of the first members of Joint Networking — ensuring you premium access and a free account.\n\nYou can now create your account at https://joint-networking.com/join.\n\nWelcome aboard!\n\n— The Joint Networking Team`,
      }).catch(e => console.error('[waitlist] approval email failed:', e.message));
    }

    return json(entry, 200, { event });
  } catch (e) {
    if (e.code === 'P2025') return error(404, 'Waitlist entry not found', { event });
    console.error(e);
    return error(500, 'Server error: ' + e.message, { event });
  }
};
