#!/usr/bin/env node

/**
 * Image Optimization Script
 * Optimizes images in public/assets/ to WebP format
 * Based on IMAGE_OPTIMIZATION_GUIDE.md from PR #144
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const assetsDir = path.join(__dirname, '../public/assets');

// Image configuration based on IMAGE_OPTIMIZATION_GUIDE.md
const imageConfigs = [
  {
    input: 'hero.jpg',
    output: 'hero.webp',
    maxWidth: 1920,
    quality: 80,
    targetSizeKB: 200
  },
  {
    input: 'login-artist.png',
    output: 'login-artist.webp',
    maxWidth: 1200,
    quality: 80,
    targetSizeKB: 200
  },
  {
    input: 'login-observer.png',
    output: 'login-observer.webp',
    maxWidth: 1200,
    quality: 80,
    targetSizeKB: 200
  },
  {
    input: 'login-seeker.png',
    output: 'login-seeker.webp',
    maxWidth: 1200,
    quality: 80,
    targetSizeKB: 200
  },
  {
    input: 'logo.png',
    output: 'logo.webp',
    maxWidth: 512,
    quality: 90, // Higher quality for logo
    targetSizeKB: 100
  },
  {
    input: 'pattern.jpg',
    output: 'pattern.webp',
    maxWidth: 1920,
    quality: 80,
    targetSizeKB: 200
  }
];

// Helper to format bytes
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Helper to calculate reduction percentage
function calcReduction(before, after) {
  return ((1 - after / before) * 100).toFixed(1);
}

async function optimizeImage(config) {
  const inputPath = path.join(assetsDir, config.input);
  const outputPath = path.join(assetsDir, config.output);

  try {
    // Check if input exists
    if (!fs.existsSync(inputPath)) {
      console.log(`⚠️  ${config.input} not found, skipping...`);
      return null;
    }

    const inputStats = fs.statSync(inputPath);
    const inputSizeBytes = inputStats.size;

    console.log(`\n🔄 Processing ${config.input}...`);
    console.log(`   Original: ${formatBytes(inputSizeBytes)}`);

    // Get image metadata
    const metadata = await sharp(inputPath).metadata();
    console.log(`   Dimensions: ${metadata.width}x${metadata.height}`);

    // Process image
    let pipeline = sharp(inputPath);

    // Resize if needed (maintain aspect ratio)
    if (metadata.width > config.maxWidth) {
      pipeline = pipeline.resize(config.maxWidth, null, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Convert to WebP with quality settings
    pipeline = pipeline.webp({
      quality: config.quality,
      effort: 6 // Higher effort for better compression
    });

    // Save optimized image
    await pipeline.toFile(outputPath);

    const outputStats = fs.statSync(outputPath);
    const outputSizeBytes = outputStats.size;
    const reduction = calcReduction(inputSizeBytes, outputSizeBytes);

    console.log(`   Optimized: ${formatBytes(outputSizeBytes)}`);
    console.log(`   Reduction: ${reduction}% smaller`);

    // Check if meets target
    const targetBytes = config.targetSizeKB * 1024;
    const meetsTarget = outputSizeBytes <= targetBytes;
    const status = meetsTarget ? '✅' : '⚠️';
    console.log(`   ${status} Target: < ${config.targetSizeKB} KB (${meetsTarget ? 'met' : 'exceeded'})`);

    return {
      name: config.input,
      originalSize: inputSizeBytes,
      optimizedSize: outputSizeBytes,
      reduction: parseFloat(reduction),
      meetsTarget,
      output: config.output
    };

  } catch (error) {
    console.error(`❌ Error processing ${config.input}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🖼️  Image Optimization Tool');
  console.log('============================');
  console.log('Based on IMAGE_OPTIMIZATION_GUIDE.md from PR #144\n');

  const results = [];
  
  for (const config of imageConfigs) {
    const result = await optimizeImage(config);
    if (result) {
      results.push(result);
    }
  }

  // Summary
  console.log('\n\n📊 Optimization Summary');
  console.log('========================\n');

  const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalOptimized = results.reduce((sum, r) => sum + r.optimizedSize, 0);
  const totalReduction = calcReduction(totalOriginal, totalOptimized);

  console.log(`Total images processed: ${results.length}`);
  console.log(`Original total size: ${formatBytes(totalOriginal)}`);
  console.log(`Optimized total size: ${formatBytes(totalOptimized)}`);
  console.log(`Total reduction: ${totalReduction}% (${formatBytes(totalOriginal - totalOptimized)} saved)`);

  const allMeetTarget = results.every(r => r.meetsTarget);
  console.log(`\n${allMeetTarget ? '✅' : '⚠️'} Target goals: ${allMeetTarget ? 'All met!' : 'Some exceeded'}`);

  // Individual results
  console.log('\nDetailed Results:');
  console.log('─────────────────────────────────────────────────────');
  results.forEach(r => {
    const status = r.meetsTarget ? '✅' : '⚠️';
    console.log(`${status} ${r.name.padEnd(25)} ${formatBytes(r.originalSize).padEnd(12)} → ${formatBytes(r.optimizedSize).padEnd(12)} (${r.reduction}% reduction)`);
  });

  // Save results to JSON
  const reportPath = path.join(__dirname, '../logs/agent/phase-13-optimization-results.json');
  const report = {
    timestamp: new Date().toISOString(),
    totalOriginalBytes: totalOriginal,
    totalOptimizedBytes: totalOptimized,
    totalReductionPercent: parseFloat(totalReduction),
    bytesSaved: totalOriginal - totalOptimized,
    images: results,
    allTargetsMet: allMeetTarget
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📝 Results saved to: ${reportPath}`);

  console.log('\n✨ Optimization complete!\n');
}

main().catch(console.error);
