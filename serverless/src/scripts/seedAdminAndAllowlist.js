/**
 * One-time setup script:
 * 1. Sets brenny.sullivan@gmail.com user role to 'admin'
 * 2. Seeds AllowedEmail table from ALLOWED_USER_EMAILS env var
 *
 * Run from the serverless/ directory:
 *   DATABASE_URL="..." node --experimental-vm-modules src/scripts/seedAdminAndAllowlist.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'brenny.sullivan@gmail.com';

async function main() {
  // 1. Set admin role
  const admin = await prisma.user.updateMany({
    where: { normalizedEmail: ADMIN_EMAIL.toLowerCase() },
    data: { role: 'admin' },
  });
  console.log(`Admin role set for ${ADMIN_EMAIL}: ${admin.count} user(s) updated`);

  // 2. Seed allowlist from env var
  const raw = process.env.ALLOWED_USER_EMAILS || '';
  const emails = raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

  if (emails.length === 0) {
    console.log('No emails in ALLOWED_USER_EMAILS — skipping allowlist seed');
    return;
  }

  let seeded = 0;
  for (const email of emails) {
    await prisma.allowedEmail.upsert({
      where: { email },
      update: {},
      create: { email },
    });
    seeded++;
    console.log(`  Seeded: ${email}`);
  }
  console.log(`Allowlist seeded: ${seeded} email(s)`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
