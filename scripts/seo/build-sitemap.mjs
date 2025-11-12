#!/usr/bin/env node
/**
 * Build Sitemap - Generate sitemap.xml for public routes
 * Outputs to dist/sitemap.xml during build process
 * Static approach: enumerates known public routes
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const SITE_DOMAIN = process.env.VITE_SITE_DOMAIN || 'https://projectvaline.com';
const OUTPUT_DIR = join(__dirname, '../../dist');
const OUTPUT_FILE = join(OUTPUT_DIR, 'sitemap.xml');

// Public routes to include in sitemap
// Priority: 1.0 (highest) to 0.1 (lowest)
// ChangeFreq: always, hourly, daily, weekly, monthly, yearly, never
const PUBLIC_ROUTES = [
  { 
    path: '/', 
    priority: 1.0, 
    changefreq: 'weekly',
    includeInSitemap: true,
  },
  { 
    path: '/#features', 
    priority: 0.8, 
    changefreq: 'monthly',
    includeInSitemap: false, // Anchors typically not in sitemap
  },
  { 
    path: '/#about', 
    priority: 0.8, 
    changefreq: 'monthly',
    includeInSitemap: false, // Anchors typically not in sitemap
  },
  { 
    path: '/#faq', 
    priority: 0.7, 
    changefreq: 'monthly',
    includeInSitemap: false, // Anchors typically not in sitemap
  },
  { 
    path: '/join', 
    priority: 0.9, 
    changefreq: 'monthly',
    includeInSitemap: true,
  },
  // Future pages - uncomment when implemented
  // { 
  //   path: '/privacy', 
  //   priority: 0.5, 
  //   changefreq: 'yearly',
  //   includeInSitemap: true,
  // },
  // { 
  //   path: '/terms', 
  //   priority: 0.5, 
  //   changefreq: 'yearly',
  //   includeInSitemap: true,
  // },
];

/**
 * Generate sitemap XML
 */
function generateSitemap() {
  const buildTime = new Date().toISOString();
  
  // Filter routes to include only those marked for sitemap
  const routes = PUBLIC_ROUTES.filter(route => route.includeInSitemap);

  const urlEntries = routes.map(route => {
    const url = `${SITE_DOMAIN}${route.path}`.replace(/\/$/, ''); // Remove trailing slash
    return `  <url>
    <loc>${url}</loc>
    <lastmod>${buildTime}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`;
  }).join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

  return sitemap;
}

/**
 * Write sitemap to file
 */
function writeSitemap() {
  try {
    // Ensure output directory exists
    mkdirSync(OUTPUT_DIR, { recursive: true });

    const sitemap = generateSitemap();
    writeFileSync(OUTPUT_FILE, sitemap, 'utf-8');

    console.log('✓ Sitemap generated successfully');
    console.log(`  Location: ${OUTPUT_FILE}`);
    console.log(`  Routes: ${PUBLIC_ROUTES.filter(r => r.includeInSitemap).length}`);
  } catch (error) {
    console.error('✗ Failed to generate sitemap:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  writeSitemap();
}

export { generateSitemap, writeSitemap };
