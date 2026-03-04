/**
 * S3 Orphan Cleanup Script
 *
 * Cleans up:
 * 1. Media records stuck in 'pending' status for >24 hours (failed uploads)
 * 2. Orphaned avatar/banner S3 keys — User.avatar/banner URLs that no longer
 *    correspond to the most recent Media record for that user.
 *
 * Run: node serverless/src/scripts/cleanupOrphanedMedia.js [--dry-run]
 * Or schedule as a Lambda via EventBridge (see serverless.yml: cleanupOrphanedMedia)
 *
 * --dry-run: Log what would be deleted but do not delete anything.
 */

import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-west-2' });
const MEDIA_BUCKET = process.env.MEDIA_BUCKET || process.env.S3_BUCKET || 'valine-media-uploads';
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');

// How long a 'pending' upload can exist before considered orphaned (24 hours)
const ORPHAN_THRESHOLD_HOURS = 24;

async function deleteS3Object(key) {
  if (!key) return false;

  if (DRY_RUN) {
    console.log(`  [dry-run] Would delete S3 key: ${key}`);
    return true;
  }

  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: MEDIA_BUCKET,
      Key: key,
    }));
    return true;
  } catch (err) {
    console.error(`  Failed to delete S3 object ${key}:`, err.message);
    return false;
  }
}

/**
 * Extract S3 key from a full URL or return the value as-is if it's already a key.
 */
function extractS3Key(urlOrKey) {
  if (!urlOrKey) return null;
  try {
    const url = new URL(urlOrKey);
    // Remove leading slash from pathname
    return url.pathname.replace(/^\//, '');
  } catch {
    // Not a URL — treat as raw key
    return urlOrKey;
  }
}

async function cleanupOrphanedMedia() {
  const totalDeleted = { pending: 0, orphanedAvatar: 0 };
  const totalSkipped = { dryRun: 0 };
  const totalFailed = { pending: 0, orphanedAvatar: 0 };

  console.log('=== S3 Orphan Cleanup Script ===');
  console.log(`Bucket: ${MEDIA_BUCKET}`);
  console.log(`Threshold: ${ORPHAN_THRESHOLD_HOURS} hours`);
  if (DRY_RUN) {
    console.log('Mode: DRY RUN — nothing will be deleted');
  }
  console.log('');

  // -----------------------------------------------------------------------
  // Phase 1: Media records stuck in 'pending' status for >24 hours
  // -----------------------------------------------------------------------
  console.log('--- Phase 1: Pending orphaned media records ---');
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - ORPHAN_THRESHOLD_HOURS);

  const orphanedMedia = await prisma.media.findMany({
    where: {
      processedStatus: 'pending',
      createdAt: {
        lt: cutoffDate,
      },
    },
    select: {
      id: true,
      s3Key: true,
      createdAt: true,
      profileId: true,
    },
  });

  console.log(`Found ${orphanedMedia.length} orphaned media records\n`);

  for (const media of orphanedMedia) {
    console.log(`Processing: ${media.id}`);
    console.log(`  S3 Key: ${media.s3Key}`);
    console.log(`  Created: ${media.createdAt.toISOString()}`);

    const s3Deleted = await deleteS3Object(media.s3Key);

    if (DRY_RUN) {
      totalSkipped.dryRun++;
      console.log('  [dry-run] DB record skipped\n');
      continue;
    }

    try {
      await prisma.media.delete({
        where: { id: media.id },
      });
      console.log(`  DB record deleted`);

      if (s3Deleted) {
        console.log(`  S3 object deleted`);
      } else {
        console.log(`  S3 object not found or already deleted`);
      }
      totalDeleted.pending++;
    } catch (dbErr) {
      console.error(`  Failed to delete DB record:`, dbErr.message);
      totalFailed.pending++;
    }

    console.log('');
  }

  // -----------------------------------------------------------------------
  // Phase 2: Orphaned avatar/banner keys (User.avatar differs from latest Media)
  // -----------------------------------------------------------------------
  console.log('--- Phase 2: Orphaned avatar/banner S3 keys ---');

  const usersWithMedia = await prisma.user.findMany({
    where: {
      OR: [
        { avatar: { not: null } },
        { profile: { bannerUrl: { not: null } } },
      ],
    },
    select: {
      id: true,
      avatar: true,
      profile: {
        select: {
          bannerUrl: true,
          media: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { s3Key: true, url: true },
          },
        },
      },
    },
  });

  for (const user of usersWithMedia) {
    const latestMedia = user.profile?.media?.[0];

    if (!latestMedia) continue;

    const currentAvatarKey = extractS3Key(user.avatar);
    const latestMediaKey = latestMedia.s3Key || extractS3Key(latestMedia.url);

    // If the user's avatar S3 key differs from the latest media record, the old key is orphaned
    if (
      currentAvatarKey &&
      latestMediaKey &&
      currentAvatarKey !== latestMediaKey &&
      !user.avatar?.includes(latestMediaKey)
    ) {
      console.log(`User ${user.id}: orphaned avatar key detected`);
      console.log(`  Current: ${currentAvatarKey}`);
      console.log(`  Latest media: ${latestMediaKey}`);

      const deleted = await deleteS3Object(currentAvatarKey);

      if (DRY_RUN) {
        totalSkipped.dryRun++;
      } else if (deleted) {
        totalDeleted.orphanedAvatar++;
      } else {
        totalFailed.orphanedAvatar++;
      }
    }
  }

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  const deletedTotal = totalDeleted.pending + totalDeleted.orphanedAvatar;
  const failedTotal = totalFailed.pending + totalFailed.orphanedAvatar;
  console.log('');
  console.log(`Orphan cleanup complete: deleted ${deletedTotal}, failed ${failedTotal} (dry-run: ${DRY_RUN ? totalSkipped.dryRun : 0})`);

  return { deleted: deletedTotal, failed: failedTotal, dryRun: DRY_RUN };
}

/**
 * Lambda handler for scheduled EventBridge invocation.
 * Export name: cleanupHandler
 */
export async function cleanupHandler(event, context) {
  try {
    const result = await cleanupOrphanedMedia();
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error('Orphan cleanup Lambda failed:', err);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly (CLI usage)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  cleanupOrphanedMedia()
    .then(({ deleted, failed }) => {
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Cleanup failed:', err);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}

export { cleanupOrphanedMedia };
