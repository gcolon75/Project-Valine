/**
 * S3 Orphan Cleanup Script
 *
 * Cleans up:
 * 1. Media records stuck in 'pending' status for >24 hours (failed uploads)
 * 2. Associated S3 objects
 *
 * Run: node serverless/src/scripts/cleanupOrphanedMedia.js
 * Or schedule as a cron job / Lambda
 */

import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-west-2' });
const MEDIA_BUCKET = process.env.MEDIA_BUCKET || process.env.S3_BUCKET || 'valine-media-uploads';
const prisma = new PrismaClient();

// How long a 'pending' upload can exist before considered orphaned (24 hours)
const ORPHAN_THRESHOLD_HOURS = 24;

async function deleteS3Object(key) {
  if (!key) return false;

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

async function cleanupOrphanedMedia() {
  console.log('=== S3 Orphan Cleanup Script ===');
  console.log(`Bucket: ${MEDIA_BUCKET}`);
  console.log(`Threshold: ${ORPHAN_THRESHOLD_HOURS} hours\n`);

  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - ORPHAN_THRESHOLD_HOURS);

  // Find orphaned media records (pending status, created before cutoff)
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

  if (orphanedMedia.length === 0) {
    console.log('Nothing to clean up.');
    return { deleted: 0, failed: 0 };
  }

  let deleted = 0;
  let failed = 0;

  for (const media of orphanedMedia) {
    console.log(`Processing: ${media.id}`);
    console.log(`  S3 Key: ${media.s3Key}`);
    console.log(`  Created: ${media.createdAt.toISOString()}`);

    // Delete S3 object
    const s3Deleted = await deleteS3Object(media.s3Key);

    // Delete database record (even if S3 delete failed - record is orphaned anyway)
    try {
      await prisma.media.delete({
        where: { id: media.id },
      });
      console.log(`  DB record deleted`);

      if (s3Deleted) {
        console.log(`  S3 object deleted`);
        deleted++;
      } else {
        console.log(`  S3 object not found or already deleted`);
        deleted++; // Still count as success since DB cleaned up
      }
    } catch (dbErr) {
      console.error(`  Failed to delete DB record:`, dbErr.message);
      failed++;
    }

    console.log('');
  }

  console.log('=== Summary ===');
  console.log(`Cleaned up: ${deleted}`);
  console.log(`Failed: ${failed}`);

  return { deleted, failed };
}

// Run if executed directly
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
