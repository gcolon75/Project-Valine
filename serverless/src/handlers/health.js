import { json } from '../utils/headers.js';

/* ---------------------- Allowlist Helper ---------------------- */

function getAllowlistInfo() {
  const allowListRaw = process.env.ALLOWED_USER_EMAILS || '';
  const allowlist = allowListRaw
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  
  const requiredEmails = ['ghawk075@gmail.com', 'valinejustin@gmail.com'];
  const allowlistActive = allowlist.length > 0;
  const allowlistCount = allowlist.length;
  // Misconfigured if we expect exactly 2 emails but don't have them
  const allowlistMisconfigured = allowlistActive && allowlistCount < 2;
  
  return {
    allowlistActive,
    allowlistCount,
    allowlistMisconfigured,
    requiredEmails: allowlistMisconfigured ? requiredEmails : undefined
  };
}

/* ---------------------- Handler ---------------------- */

export const handler = async () => {
  const allowlistInfo = getAllowlistInfo();
  
  const response = {
    status: 'ok',
    timestamp: Date.now(),
    service: 'Project Valine API',
    version: '1.0.0',
    ...allowlistInfo
  };

  // Add warnings if misconfigured
  if (allowlistInfo.allowlistMisconfigured) {
    response.warnings = ['ALLOWLIST_MISCONFIGURED'];
  }

  return json(response);
};
