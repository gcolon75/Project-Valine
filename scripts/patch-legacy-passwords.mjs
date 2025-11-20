/**
 * One-time migration: copy legacy 'password' column into 'passwordHash'
 * ONLY if passwordHash is NULL/empty and password looks like a bcrypt hash.
 *
 * Usage:
 *   cd /home/runner/work/Project-Valine/Project-Valine
 *   DATABASE_URL=postgresql://... node scripts/patch-legacy-passwords.mjs
 *
 * NOTE: DELETE THIS SCRIPT AFTER EXECUTING IN PRODUCTION
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Check if string looks like a bcrypt hash
 * @param {string} str - String to check
 * @returns {boolean} True if looks like bcrypt hash
 */
function looksHashed(str) {
  return typeof str === 'string' && str.startsWith('$2') && str.length > 20;
}

async function run() {
  console.log('[patch-legacy-passwords] Starting migration...');
  
  try {
    // Find users with missing or empty passwordHash
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { passwordHash: null },
          { passwordHash: '' }
        ]
      },
      select: { 
        id: true, 
        email: true, 
        password: true, 
        passwordHash: true 
      }
    });

    console.log(`[patch] Found ${users.length} user(s) with missing passwordHash`);

    let migrated = 0;
    let skipped = 0;

    for (const u of users) {
      if (!u.passwordHash && looksHashed(u.password)) {
        await prisma.user.update({
          where: { id: u.id },
          data: { passwordHash: u.password }
        });
        migrated++;
        console.log(`[patch] ✓ Migrated user=${u.email}`);
      } else {
        skipped++;
        console.log(`[patch] ✗ Skipped user=${u.email} (no valid legacy password)`);
      }
    }

    console.log(`\n[patch-legacy-passwords] Migration completed successfully.`);
    console.log(`  Migrated: ${migrated} user(s)`);
    console.log(`  Skipped:  ${skipped} user(s)`);
    console.log(`\nNOTE: After verifying production login works, remove the legacy fallback from auth.js`);
    console.log(`      and DELETE this script (patch-legacy-passwords.mjs).`);
  } catch (error) {
    console.error('[patch-legacy-passwords] Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
