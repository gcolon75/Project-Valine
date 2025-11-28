import { json } from '../utils/headers.js';
import { validateSecret, isInsecureDefault } from '../utils/redaction.js';
import { isPrismaDegraded } from '../db/client.js';

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

/* ---------------------- Secrets Status Helper ---------------------- */

function getSecretsStatus() {
  const insecureDefaults = [];
  
  // Check JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET;
  const jwtSecretValid = jwtSecret && !isInsecureDefault('JWT_SECRET', jwtSecret);
  if (jwtSecret && !jwtSecretValid) {
    insecureDefaults.push('JWT_SECRET');
  }
  
  // Check Discord configuration
  const discordConfigured = !!(
    process.env.DISCORD_BOT_TOKEN ||
    process.env.DISCORD_WEBHOOK ||
    process.env.DISCORD_PUBLIC_KEY
  );
  
  // Check SMTP configuration
  const smtpConfigured = !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
  
  // Check Database configuration
  const databaseConfigured = !!process.env.DATABASE_URL;
  
  // Check for test credentials in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.TEST_USER_PASSWORD) {
      insecureDefaults.push('TEST_USER_PASSWORD');
    }
  }
  
  return {
    jwtSecretValid,
    discordConfigured,
    smtpConfigured,
    databaseConfigured,
    insecureDefaults: insecureDefaults.length > 0 ? insecureDefaults : undefined
  };
}

/* ---------------------- Handler ---------------------- */

export const handler = async () => {
  const allowlistInfo = getAllowlistInfo();
  const secretsStatus = getSecretsStatus();
  
  // Check Prisma degraded status
  const prismaDegraded = isPrismaDegraded();
  
  const response = {
    status: 'ok',
    timestamp: Date.now(),
    service: 'Project Valine API',
    version: '1.0.0',
    prismaDegraded,
    ...allowlistInfo,
    secretsStatus
  };

  // Add warnings if misconfigured
  const warnings = [];
  if (allowlistInfo.allowlistMisconfigured) {
    warnings.push('ALLOWLIST_MISCONFIGURED');
  }
  if (secretsStatus.insecureDefaults && secretsStatus.insecureDefaults.length > 0) {
    warnings.push('INSECURE_DEFAULTS_DETECTED');
  }
  if (!secretsStatus.jwtSecretValid) {
    warnings.push('JWT_SECRET_INVALID');
  }
  if (prismaDegraded) {
    warnings.push('PRISMA_DEGRADED');
  }
  
  if (warnings.length > 0) {
    response.warnings = warnings;
  }

  return json(response);
};
