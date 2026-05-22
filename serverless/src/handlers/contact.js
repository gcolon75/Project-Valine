import { sendEmail } from '../utils/email.js';
import { json, error } from '../utils/headers.js';

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@joint-networking.com';

export async function submit(event) {
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return error(400, 'Invalid request body');
  }

  const { name, email, subject, message } = body;

  if (!name?.trim()) return error(400, 'Name is required');
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error(400, 'Valid email is required');
  if (!message?.trim()) return error(400, 'Message is required');

  const safeSubject = subject?.trim() || 'General';

  try {
    await sendEmail({
      to: SUPPORT_EMAIL,
      subject: `[Contact] ${safeSubject} — from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nSubject: ${safeSubject}\n\n${message}`,
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Subject:</strong> ${safeSubject}</p>
        <hr />
        <p>${message.replace(/\n/g, '<br />')}</p>
      `,
    });

    return json({ success: true });
  } catch (err) {
    console.error('[contact] Failed to send email:', err);
    return error(500, 'Failed to send message. Please email us directly at support@joint-networking.com.');
  }
}
