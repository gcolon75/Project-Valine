/**
 * migrateFollowsToNetwork.js
 *
 * Converts ALL follow relationships into accepted network connections.
 * One-way follows become mutual connections (since there's no longer a
 * unidirectional follow concept — everything is a connection now).
 *
 * Safe to run multiple times (idempotent — skips pairs that already have
 * a ConnectionRequest in either direction).
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." node serverless/src/scripts/migrateFollowsToNetwork.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting follows → network migration...');

  const allFollows = await prisma.follow.findMany({
    select: { followerId: true, followingId: true }
  });

  console.log(`Found ${allFollows.length} total follow records`);

  // De-duplicate pairs (A→B and B→A both become one connection)
  const seen = new Set();
  const pairs = [];
  for (const { followerId: a, followingId: b } of allFollows) {
    const key = [a, b].sort().join(':');
    if (!seen.has(key)) {
      seen.add(key);
      pairs.push({ userA: a < b ? a : b, userB: a < b ? b : a });
    }
  }

  console.log(`Found ${pairs.length} unique follow pairs to convert`);

  let created = 0;
  let skipped = 0;

  for (const { userA, userB } of pairs) {
    const existing = await prisma.connectionRequest.findFirst({
      where: {
        OR: [
          { senderId: userA, receiverId: userB },
          { senderId: userB, receiverId: userA }
        ]
      }
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.$transaction([
      prisma.connectionRequest.create({
        data: { senderId: userA, receiverId: userB, status: 'accepted' }
      }),
      prisma.profile.update({
        where: { userId: userA },
        data: { networkCount: { increment: 1 } }
      }),
      prisma.profile.update({
        where: { userId: userB },
        data: { networkCount: { increment: 1 } }
      })
    ]);

    created++;
    if (created % 50 === 0) {
      console.log(`  ...created ${created} connections so far`);
    }
  }

  console.log(`\nDone. Created: ${created}, Skipped (already existed): ${skipped}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
