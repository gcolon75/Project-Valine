/**
 * migrateFollowsToNetwork.js
 *
 * Converts mutual follow relationships into accepted network connections.
 * Safe to run multiple times (idempotent — skips pairs that already have a ConnectionRequest).
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." node serverless/src/scripts/migrateFollowsToNetwork.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting follows → network migration...');

  // Find all follows
  const allFollows = await prisma.follow.findMany({
    select: { followerId: true, followingId: true }
  });

  console.log(`Found ${allFollows.length} total follow records`);

  // Build a set for quick mutual-follow lookup
  const followSet = new Set(allFollows.map(f => `${f.followerId}:${f.followingId}`));

  // Find mutual pairs (only process each pair once: A < B lexicographically)
  const mutualPairs = allFollows.filter(f =>
    f.followerId < f.followingId && followSet.has(`${f.followingId}:${f.followerId}`)
  );

  console.log(`Found ${mutualPairs.length} mutual follow pairs to convert`);

  let created = 0;
  let skipped = 0;

  for (const pair of mutualPairs) {
    const { followerId: userA, followingId: userB } = pair;

    // Check if a ConnectionRequest already exists between them
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

    // Create accepted connection + update both networkCounts atomically
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
