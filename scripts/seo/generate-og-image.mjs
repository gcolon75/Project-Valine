#!/usr/bin/env node
/**
 * Generate OG Image - Creates Open Graph social preview image
 * Uses sharp to resize/optimize hero image for social sharing
 * Output: public/og-default.png (1200x630px, optimal OG size)
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PUBLIC_DIR = join(__dirname, '../../public');
const SOURCE_IMAGE = join(PUBLIC_DIR, 'assets/hero.jpg');
const OUTPUT_IMAGE = join(PUBLIC_DIR, 'og-default.png');

// OG image optimal dimensions
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

/**
 * Generate OG image from source
 */
async function generateOGImage() {
  try {
    // Check if source exists
    if (!existsSync(SOURCE_IMAGE)) {
      console.warn('⚠ Source image not found, creating placeholder');
      await createPlaceholder();
      return;
    }

    // Resize and optimize image
    await sharp(SOURCE_IMAGE)
      .resize(OG_WIDTH, OG_HEIGHT, {
        fit: 'cover',
        position: 'center',
      })
      .png({ quality: 85 })
      .toFile(OUTPUT_IMAGE);

    console.log('✓ OG image generated successfully');
    console.log(`  Location: ${OUTPUT_IMAGE}`);
    console.log(`  Size: ${OG_WIDTH}x${OG_HEIGHT}px`);
  } catch (error) {
    console.error('✗ Failed to generate OG image:', error.message);
    console.warn('⚠ Creating placeholder instead');
    await createPlaceholder();
  }
}

/**
 * Create a simple placeholder OG image
 * Used when source image is unavailable or processing fails
 */
async function createPlaceholder() {
  try {
    // Create a simple gradient background with text overlay
    const svg = `
      <svg width="${OG_WIDTH}" height="${OG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#474747;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#0CCE6B;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#grad)"/>
        <text x="50%" y="45%" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="white">
          Project Valine
        </text>
        <text x="50%" y="60%" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" fill="white" opacity="0.9">
          Artists &amp; Seekers Unite
        </text>
      </svg>
    `;

    await sharp(Buffer.from(svg))
      .png()
      .toFile(OUTPUT_IMAGE);

    console.log('✓ Placeholder OG image created');
    console.log(`  Location: ${OUTPUT_IMAGE}`);
  } catch (error) {
    console.error('✗ Failed to create placeholder:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateOGImage();
}

export { generateOGImage };
