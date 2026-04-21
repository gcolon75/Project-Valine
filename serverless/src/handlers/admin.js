import { getPrisma } from '../db/client.js';
import { json, error } from '../utils/headers.js';
import { getUserIdFromEvent } from '../utils/tokenManager.js';
import { sendEmail } from '../utils/email.js';

function approvalEmailHtml(firstName) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td align="center" style="background:linear-gradient(to right,#474747,#0CCE6B);padding:32px 40px;">
              <div style="display:inline-block;background:#ffffff;border-radius:12px;padding:12px 24px;">
                <img src="https://joint-networking.com/assets/logo-email.png" alt="Joint Networking" width="220" style="display:block;max-width:220px;">
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 16px;font-size:24px;color:#111827;">You've been approved!</h1>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#374151;">Hi ${firstName},</p>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#374151;">Congratulations, <strong>${firstName}</strong>! And thank you for becoming one of the first members of Joint Networking, ensuring you premium access and a free account.<br><br>Click below to create your account and get started.</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:24px 0 0;">
                    <a href="https://joint-networking.com/join" style="display:inline-block;background:linear-gradient(to right,#474747,#0CCE6B);color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:8px;">Create Your Account</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
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

    // Look up first name from waitlist if available, otherwise use generic greeting
    const waitlistEntry = await prisma.waitlistEntry.findUnique({ where: { email: normalized } });
    const firstName = waitlistEntry?.firstName || 'there';

    try {
      await sendEmail({
        to: normalized,
        subject: "You've been approved for Joint Networking!",
        html: approvalEmailHtml(firstName),
        text: `Hi ${firstName},\n\nCongratulations! And thank you for becoming one of the first members of Joint Networking, ensuring you premium access and a free account.\n\nCreate your account at https://joint-networking.com/join.\n\nWelcome aboard!\n\n— The Joint Networking Team`,
      });
    } catch (e) {
      console.error('[admin] approval email failed:', e.message);
    }

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
