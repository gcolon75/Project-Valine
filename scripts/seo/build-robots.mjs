#!/usr/bin/env node
/**
 * Build robots.txt - Generate robots.txt for search engine crawlers
 * Outputs to dist/robots.txt during build process
 * Environment-aware: staging disallows all except health check
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const SITE_DOMAIN = process.env.VITE_SITE_DOMAIN || 'https://projectvaline.com';
const ENVIRONMENT = process.env.NODE_ENV || 'production';
const IS_STAGING = process.env.VITE_IS_STAGING === 'true';
const OUTPUT_DIR = join(__dirname, '../../dist');
const OUTPUT_FILE = join(OUTPUT_DIR, 'robots.txt');

/**
 * Generate robots.txt content based on environment
 */
function generateRobotsTxt() {
  // Staging environment: disallow all crawling except health endpoint
  if (IS_STAGING || ENVIRONMENT === 'staging') {
    return `# Project Valine - Staging Environment
# Block all search engine crawlers on staging

User-agent: *
Disallow: /

# Allow health check endpoint (if applicable)
# Allow: /health
# Allow: /api/health

Sitemap: ${SITE_DOMAIN}/sitemap.xml
`;
  }

  // Production environment: allow marketing, disallow sensitive routes
  return `# Project Valine - Robots.txt
# Generated: ${new Date().toISOString()}

User-agent: *

# Allow public marketing pages
Allow: /
Allow: /join
Allow: /signup

# Disallow authenticated/sensitive routes
Disallow: /auth/*
Disallow: /login
Disallow: /login-page
Disallow: /signup-page
Disallow: /onboarding
Disallow: /internal/*
Disallow: /account/*
Disallow: /feed
Disallow: /messages
Disallow: /settings
Disallow: /profile/*
Disallow: /scripts/*
Disallow: /auditions/*
Disallow: /search
Disallow: /bookmarks
Disallow: /notifications
Disallow: /requests

# Disallow API endpoints
Disallow: /api/*

# Sitemap location
Sitemap: ${SITE_DOMAIN}/sitemap.xml
`;
}

/**
 * Write robots.txt to file
 */
function writeRobotsTxt() {
  try {
    // Ensure output directory exists
    mkdirSync(OUTPUT_DIR, { recursive: true });

    const robotsTxt = generateRobotsTxt();
    writeFileSync(OUTPUT_FILE, robotsTxt, 'utf-8');

    const env = IS_STAGING || ENVIRONMENT === 'staging' ? 'STAGING' : 'PRODUCTION';
    console.log(`✓ robots.txt generated successfully (${env})`);
    console.log(`  Location: ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('✗ Failed to generate robots.txt:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  writeRobotsTxt();
}

export { generateRobotsTxt, writeRobotsTxt };
