#!/usr/bin/env node
/**
 * Assert proper headers for CloudFront-served assets
 * 
 * This script verifies that critical assets are served with correct
 * Content-Type and Cache-Control headers from CloudFront.
 * 
 * Usage: node scripts/assert-headers.js --domain <cloudfront-domain> --bundle <bundle-path>
 * 
 * Example:
 *   node scripts/assert-headers.js --domain dkmxy676d3vgc.cloudfront.net --bundle /assets/index-yrgN6q4Q.js
 * 
 * Environment variables:
 *   CLOUDFRONT_DOMAIN - CloudFront distribution domain
 *   BUNDLE_PATH - Path to main JavaScript bundle
 */

import https from 'https';
import http from 'http';

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (flag) => {
  const index = args.indexOf(flag);
  return index !== -1 && args[index + 1] ? args[index + 1] : null;
};

const domain = getArg('--domain') || process.env.CLOUDFRONT_DOMAIN;
const bundlePath = getArg('--bundle') || process.env.BUNDLE_PATH;

if (!domain) {
  console.error('❌ CloudFront domain required');
  console.error('Usage: node scripts/assert-headers.js --domain <domain> --bundle <bundle-path>');
  console.error('   or: set CLOUDFRONT_DOMAIN and BUNDLE_PATH environment variables');
  process.exit(1);
}

console.log('=== CloudFront Header Verification ===');
console.log(`Domain: ${domain}`);
console.log(`Bundle: ${bundlePath || '(not specified - will skip bundle check)'}\n`);

// Helper to make HEAD request and check headers
function checkHeaders(path, expectedContentType, expectedCacheControl) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: domain,
      path: path,
      method: 'HEAD',
      headers: {
        'User-Agent': 'CloudFront-Header-Verification/1.0'
      }
    };

    const protocol = domain.includes('localhost') || domain.includes('127.0.0.1') ? http : https;

    const req = protocol.request(options, (res) => {
      const contentType = res.headers['content-type'] || '';
      const cacheControl = res.headers['cache-control'] || '';
      const statusCode = res.statusCode;

      const result = {
        path,
        statusCode,
        contentType,
        cacheControl,
        expectedContentType,
        expectedCacheControl,
        contentTypeMatch: contentType.toLowerCase().includes(expectedContentType.toLowerCase()),
        cacheControlMatch: cacheControl.toLowerCase().includes(expectedCacheControl.toLowerCase()),
      };

      resolve(result);
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Run checks
async function runChecks() {
  const checks = [
    {
      path: '/index.html',
      expectedContentType: 'text/html',
      expectedCacheControl: 'no-cache',
      description: 'index.html (must be no-cache)'
    },
    {
      path: '/manifest.json',
      expectedContentType: 'application/json',
      expectedCacheControl: 'public',
      description: 'manifest.json (short cache)'
    }
  ];

  // Add bundle check if bundle path provided
  if (bundlePath) {
    checks.push({
      path: bundlePath,
      expectedContentType: 'application/javascript',
      expectedCacheControl: 'immutable',
      description: 'JavaScript bundle (immutable cache)'
    });
  }

  let allPassed = true;
  const results = [];

  for (const check of checks) {
    try {
      console.log(`Checking: ${check.description}`);
      console.log(`  Path: ${check.path}`);
      
      const result = await checkHeaders(
        check.path,
        check.expectedContentType,
        check.expectedCacheControl
      );
      
      results.push(result);

      // Verify status code
      if (result.statusCode !== 200) {
        console.log(`  ❌ Status: ${result.statusCode} (expected 200)`);
        allPassed = false;
      } else {
        console.log(`  ✓ Status: ${result.statusCode}`);
      }

      // Verify Content-Type
      if (!result.contentTypeMatch) {
        console.log(`  ❌ Content-Type: ${result.contentType}`);
        console.log(`     Expected: ${result.expectedContentType}`);
        allPassed = false;
      } else {
        console.log(`  ✓ Content-Type: ${result.contentType}`);
      }

      // Verify Cache-Control
      if (!result.cacheControlMatch) {
        console.log(`  ❌ Cache-Control: ${result.cacheControl}`);
        console.log(`     Expected to contain: ${result.expectedCacheControl}`);
        allPassed = false;
      } else {
        console.log(`  ✓ Cache-Control: ${result.cacheControl}`);
      }

      console.log('');
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}\n`);
      allPassed = false;
    }
  }

  // Summary
  console.log('='.repeat(50));
  if (allPassed) {
    console.log('✅ All header checks passed!');
    console.log('='.repeat(50));
    console.log('');
    console.log('Assets are being served with correct headers:');
    console.log('- HTML: no-cache (users always get latest)');
    console.log('- Bundles: immutable (aggressive caching)');
    console.log('- Manifest: short cache (PWA updates)');
    console.log('');
    process.exit(0);
  } else {
    console.log('❌ Some header checks failed!');
    console.log('='.repeat(50));
    console.log('');
    console.log('Required actions:');
    console.log('1. Verify S3 object metadata is set correctly');
    console.log('2. Create/invalidate CloudFront cache if needed');
    console.log('3. Run deployment script with correct header settings');
    console.log('');
    process.exit(1);
  }
}

runChecks().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
