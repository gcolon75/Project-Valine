import { getPrisma } from '../db/client.js';

function emailTemplate({ firstName, heading, body, cta }) {
  const ctaBlock = cta ? `
    <tr>
      <td align="center" style="padding:24px 0 0;">
        <a href="${cta.url}" style="display:inline-block;background:linear-gradient(to right,#474747,#0CCE6B);color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:8px;">${cta.label}</a>
      </td>
    </tr>` : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td align="center" style="background:linear-gradient(to right,#474747,#0CCE6B);padding:32px 40px;">
              <div style="display:inline-block;background:#ffffff;border-radius:12px;padding:12px 24px;">
                <img src="${LOGO_DATA_URL}" alt="Joint Networking" width="220" style="display:block;max-width:220px;">
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 16px;font-size:24px;color:#111827;">${heading}</h1>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#374151;">Hi ${firstName},</p>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#374151;">${body}</p>
              ${ctaBlock ? `<table width="100%" cellpadding="0" cellspacing="0">${ctaBlock}</table>` : ''}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
                © ${new Date().getFullYear()} Joint Networking · <a href="https://joint-networking.com" style="color:#0CCE6B;text-decoration:none;">joint-networking.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
import { json, error } from '../utils/headers.js';
import { getUserIdFromEvent } from '../utils/tokenManager.js';
import { sendEmail, LOGO_DATA_URL } from '../utils/email.js';

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

    // Send confirmation email (awaited so Lambda doesn't cut it off before sending)
    try {
      await sendEmail({
        to: normalizedEmail,
        subject: "You're on the Joint Networking waitlist!",
        html: emailTemplate({
          firstName: entry.firstName,
          heading: "You're on the list!",
          body: `Thanks for signing up, <strong>${entry.firstName}</strong>! You're now on the Joint Networking waitlist.<br><br>We'll send you an email as soon as your account is approved.`,
          cta: null,
        }),
        text: `Hi ${entry.firstName},\n\nThanks for signing up! You're now on the Joint Networking waitlist.\n\nWe'll send you an email as soon as your account is approved.\n\n— The Joint Networking Team`,
      });
    } catch (e) {
      console.error('[waitlist] confirmation email failed:', e.message);
    }

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

      // Send approval email (awaited so Lambda doesn't cut it off before sending)
      try {
        await sendEmail({
          to: entry.email,
          subject: "You've been approved for Joint Networking!",
          html: emailTemplate({
            firstName: entry.firstName,
            heading: "You've been approved!",
            body: `Congratulations, <strong>${entry.firstName}</strong>! And thank you for becoming one of the first members of Joint Networking, ensuring you premium access and a free account.<br><br>Click below to create your account and get started.`,
            cta: { label: 'Create Your Account', url: 'https://joint-networking.com/join' },
          }),
          text: `Hi ${entry.firstName},\n\nCongratulations! And thank you for becoming one of the first members of Joint Networking, ensuring you premium access and a free account.\n\nCreate your account at https://joint-networking.com/join.\n\nWelcome aboard!\n\n— The Joint Networking Team`,
        });
      } catch (e) {
        console.error('[waitlist] approval email failed:', e.message);
      }
    }

    return json(entry, 200, { event });
  } catch (e) {
    if (e.code === 'P2025') return error(404, 'Waitlist entry not found', { event });
    console.error(e);
    return error(500, 'Server error: ' + e.message, { event });
  }
};
