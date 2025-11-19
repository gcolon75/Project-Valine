#!/usr/bin/env node

/**
 * Frontend Deployment Script with Asset Retention
 * 
 * Purpose: Deploy frontend build to S3 with proper MIME types and retain previous bundles
 * 
 * Usage:
 *   node scripts/deploy-frontend.js --bucket bucket-name --distribution E1234567890ABC
 *   or use environment variables S3_BUCKET and CLOUDFRONT_DISTRIBUTION_ID
 * 
 * Features:
 * - Builds frontend (npm ci && npm run build)
 * - Parses dist/index.html for module script and stylesheet
 * - Uploads with correct Content-Type & Cache-Control
 * - Retains previous JS/CSS bundles for RETENTION_DAYS (default 7)
 * - Prunes bundles older than retention period
 * - Optional CloudFront invalidation
 * - Generates deploy-report.json
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';
import { execSync } from 'child_process';
import { parseArgs } from 'util';

// Parse command line arguments
const { values: args } = parseArgs({
  options: {
    bucket: { type: 'string', short: 'b', default: process.env.S3_BUCKET },
    distribution: { type: 'string', short: 'd', default: process.env.CLOUDFRONT_DISTRIBUTION_ID },
    'dist-dir': { type: 'string', default: 'dist' },
    'retention-days': { type: 'string', default: '7' },
    'skip-build': { type: 'boolean', default: false },
    'skip-invalidation': { type: 'boolean', default: false },
    profile: { type: 'string', default: process.env.AWS_PROFILE }
  }
});

const S3_BUCKET = args.bucket;
const CLOUDFRONT_DIST_ID = args.distribution;
const DIST_DIR = args['dist-dir'];
const RETENTION_DAYS = parseInt(args['retention-days'], 10);
const SKIP_BUILD = args['skip-build'];
const SKIP_INVALIDATION = args['skip-invalidation'];
const AWS_PROFILE = args.profile;

// Console colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

function success(msg) { console.log(`${colors.green}${msg}${colors.reset}`); }
function info(msg) { console.log(`${colors.cyan}${msg}${colors.reset}`); }
function warn(msg) { console.log(`${colors.yellow}${msg}${colors.reset}`); }
function error(msg) { console.log(`${colors.red}${msg}${colors.reset}`); }

success('========================================');
success('Frontend Deployment Script');
success('========================================');
info(`Retention Policy: ${RETENTION_DAYS} days`);
console.log('');

// Validate required parameters
if (!S3_BUCKET) {
  error('Error: S3 bucket name is required');
  console.log('Usage: node deploy-frontend.js --bucket <bucket-name> [--distribution <id>]');
  console.log('   or: Set environment variables S3_BUCKET and CLOUDFRONT_DISTRIBUTION_ID');
  process.exit(1);
}

success(`✓ S3 Bucket: ${S3_BUCKET}`);
if (CLOUDFRONT_DIST_ID) {
  success(`✓ CloudFront Distribution: ${CLOUDFRONT_DIST_ID}`);
} else {
  warn('⚠ No CloudFront distribution ID (invalidation will be skipped)');
}
console.log('');

// Build AWS CLI profile argument
const awsProfileArgs = AWS_PROFILE ? ['--profile', AWS_PROFILE] : [];
if (AWS_PROFILE) {
  info(`Using AWS profile: ${AWS_PROFILE}`);
}

// Helper to run AWS CLI commands
function runAwsCommand(args, options = {}) {
  const cmdArgs = [...args, ...awsProfileArgs];
  const cmd = `aws ${cmdArgs.join(' ')}`;
  
  try {
    const result = execSync(cmd, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
    return { success: true, output: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Step 1: Build frontend (unless skipped)
if (!SKIP_BUILD) {
  info('Step 1: Building frontend...');
  
  // Check if node_modules exists
  try {
    statSync('node_modules');
  } catch {
    info('Installing dependencies...');
    try {
      execSync('npm ci', { stdio: 'inherit' });
    } catch (err) {
      error('npm ci failed');
      process.exit(1);
    }
  }
  
  // Build
  try {
    execSync('npm run build', { stdio: 'inherit' });
    success('✓ Build completed');
  } catch (err) {
    error('Build failed');
    process.exit(1);
  }
  
  // Generate SRI hashes
  info('Generating SRI hashes...');
  try {
    execSync('node scripts/generate-sri.js', { stdio: 'inherit' });
    success('✓ SRI hashes generated');
  } catch (err) {
    error('SRI generation failed');
    process.exit(1);
  }
  
  // Verify SRI hashes
  info('Verifying SRI hashes...');
  try {
    execSync('node scripts/verify-sri.js', { stdio: 'inherit' });
    success('✓ SRI verification passed');
  } catch (err) {
    error('❌ SRI verification failed - deployment aborted');
    error('   This prevents deploying bundles with mismatched integrity hashes');
    error('   Fix: Ensure build is complete and files are not modified after SRI generation');
    process.exit(1);
  }
} else {
  warn('⚠ Skipping build (--skip-build flag set)');
  warn('⚠ SRI verification skipped - ensure hashes are current');
}

// Verify dist directory exists
try {
  statSync(DIST_DIR);
} catch {
  error(`Error: ${DIST_DIR} directory not found`);
  process.exit(1);
}

// Step 2: Parse dist/index.html for bundle names
info('Step 2: Parsing index.html for bundles...');
const indexHtmlPath = join(DIST_DIR, 'index.html');
let indexHtml;
try {
  indexHtml = readFileSync(indexHtmlPath, 'utf8');
} catch {
  error(`Error: index.html not found in ${DIST_DIR}`);
  process.exit(1);
}

// Extract module script src
const moduleScriptMatch = indexHtml.match(/<script\s+type="module"[^>]+src="([^"]+)"/);
if (!moduleScriptMatch) {
  error('Error: Could not find module script in index.html');
  process.exit(1);
}
const moduleBundle = moduleScriptMatch[1];
success(`✓ Module bundle: ${moduleBundle}`);

// Extract stylesheet href
const stylesheetMatch = indexHtml.match(/<link\s+rel="stylesheet"[^>]+href="([^"]+)"/);
const mainCss = stylesheetMatch ? stylesheetMatch[1] : '';
if (mainCss) {
  success(`✓ Main CSS: ${mainCss}`);
}

// Step 3: List existing bundles in S3 for retention management
info('Step 3: Checking existing bundles in S3...');
const existingBundles = [];
try {
  const result = runAwsCommand([
    's3api', 'list-objects-v2',
    '--bucket', S3_BUCKET,
    '--prefix', 'assets/index-',
    '--output', 'json'
  ], { silent: true });
  
  if (result.success) {
    const s3Objects = JSON.parse(result.output);
    if (s3Objects.Contents) {
      s3Objects.Contents.forEach(obj => {
        existingBundles.push({
          key: obj.Key,
          lastModified: new Date(obj.LastModified)
        });
      });
      info(`Found ${existingBundles.length} existing bundle(s) in S3`);
    }
  }
} catch (err) {
  warn(`⚠ Could not list existing bundles: ${err.message}`);
}

// Step 4: Upload files with correct Content-Type and Cache-Control
info('Step 4: Uploading files to S3...');

// Define content type mappings
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.xml': 'application/xml',
  '.txt': 'text/plain'
};

// Recursively get all files
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = join(dirPath, file);
    if (statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });
  
  return arrayOfFiles;
}

const files = getAllFiles(DIST_DIR);

files.forEach(filePath => {
  const relativePath = relative(DIST_DIR, filePath).replace(/\\/g, '/');
  const s3Key = relativePath;
  
  // Determine content type
  const ext = extname(filePath).toLowerCase();
  const contentType = contentTypes[ext] || 'application/octet-stream';
  
  // Determine cache control
  let cacheControl;
  if (ext === '.html') {
    cacheControl = 'no-cache, no-store, must-revalidate';
  } else if (ext === '.json' && filePath.endsWith('manifest.json')) {
    cacheControl = 'public, max-age=300';
  } else if (ext === '.js' || ext === '.css') {
    cacheControl = 'public, max-age=31536000, immutable';
  } else {
    cacheControl = 'public, max-age=31536000, immutable';
  }
  
  // Upload
  const result = runAwsCommand([
    's3api', 'put-object',
    '--bucket', S3_BUCKET,
    '--key', s3Key,
    '--body', filePath,
    '--content-type', contentType,
    '--cache-control', cacheControl
  ], { silent: true });
  
  if (result.success) {
    info(`  ✓ ${s3Key} (${contentType}, ${cacheControl})`);
  } else {
    error(`  ✗ Failed to upload ${s3Key}`);
  }
});

success('✓ Upload completed');

// Step 5: Prune old bundles
info(`Step 5: Pruning old bundles (retention: ${RETENTION_DAYS} days)...`);
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

const currentBundleKey = moduleBundle.replace(/^\//, '');
const prunedBundles = [];

existingBundles.forEach(bundle => {
  const bundleKey = bundle.key;
  const bundleAge = bundle.lastModified;
  
  // Don't delete the current bundle
  if (bundleKey === currentBundleKey) {
    info(`  → Keeping current bundle: ${bundleKey}`);
    return;
  }
  
  // Delete if older than retention period
  const ageInDays = Math.floor((new Date() - bundleAge) / (1000 * 60 * 60 * 24));
  if (bundleAge < cutoffDate) {
    warn(`  ✗ Deleting old bundle: ${bundleKey} (age: ${ageInDays} days)`);
    const result = runAwsCommand([
      's3api', 'delete-object',
      '--bucket', S3_BUCKET,
      '--key', bundleKey
    ], { silent: true });
    
    if (result.success) {
      prunedBundles.push(bundleKey);
    }
  } else {
    info(`  → Keeping bundle: ${bundleKey} (age: ${ageInDays} days)`);
  }
});

if (prunedBundles.length > 0) {
  success(`✓ Pruned ${prunedBundles.length} old bundle(s)`);
} else {
  info('No bundles to prune');
}

// Step 6: Invalidate CloudFront (optional)
if (!SKIP_INVALIDATION && CLOUDFRONT_DIST_ID) {
  info('Step 6: Invalidating CloudFront cache...');
  
  // Invalidate critical paths
  const pathsToInvalidate = ['/index.html', '/theme-init.js', moduleBundle];
  if (mainCss) {
    pathsToInvalidate.push(mainCss);
  }
  
  const result = runAwsCommand([
    'cloudfront', 'create-invalidation',
    '--distribution-id', CLOUDFRONT_DIST_ID,
    '--paths',
    ...pathsToInvalidate
  ], { silent: true });
  
  if (result.success) {
    success(`✓ CloudFront invalidation created for: ${pathsToInvalidate.join(' ')}`);
  } else {
    error('✗ CloudFront invalidation failed');
  }
} else {
  warn('⚠ Skipping CloudFront invalidation');
}

// Step 7: Generate deployment report
info('Step 7: Generating deployment report...');
const report = {
  timestamp: new Date().toISOString(),
  s3Bucket: S3_BUCKET,
  moduleBundle,
  mainCss,
  prunedBundles,
  retentionDays: RETENTION_DAYS,
  cloudFrontDistribution: CLOUDFRONT_DIST_ID
};

const reportPath = 'deploy-report.json';
writeFileSync(reportPath, JSON.stringify(report, null, 2));
success(`✓ Deployment report: ${reportPath}`);

console.log('');
success('========================================');
success('Deployment completed successfully!');
success('========================================');
info(`Module bundle: ${moduleBundle}`);
if (mainCss) {
  info(`Main CSS: ${mainCss}`);
}
info(`Pruned bundles: ${prunedBundles.length}`);
