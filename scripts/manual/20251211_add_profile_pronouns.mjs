// scripts/manual/20251211_add_profile_pronouns.mjs
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to DB...');
  // Sanity check
  const version = await prisma.$queryRawUnsafe('SELECT version();');
  console.log('DB version:', version[0]?.version || version);

  console.log('\nAdding pronouns column to "profiles" (if missing)...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "profiles"
    ADD COLUMN IF NOT EXISTS "pronouns" TEXT;
  `);

  console.log('Done. Verifying columns on "profiles"...');
  const cols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'profiles'
    ORDER BY ordinal_position;
  `);

  console.table(cols);
}

main()
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
