import { json } from '../utils/headers.js';

export const handler = async () => {
  // Check allowlist configuration
  const allowedEmails = (process.env.ALLOWED_USER_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  const allowlistActive = allowedEmails.length > 0;
  const allowlistCount = allowedEmails.length;
  
  // Validate allowlist contains required emails
  const requiredEmails = ['ghawk075@gmail.com', 'valinejustin@gmail.com'];
  const allowlistMisconfigured = allowlistActive && !requiredEmails.every(email => allowedEmails.includes(email.toLowerCase()));
  
  return json({
    status: 'ok',
    timestamp: Date.now(),
    service: 'Project Valine API',
    version: '1.0.0',
    allowlistActive,
    allowlistCount,
    allowlistMisconfigured
  });
};
