#!/usr/bin/env node

/**
 * White Screen Diagnostic Script
 * 
 * Performs comprehensive checks to diagnose white screen issues:
 * - CloudFront route tests for representative extension-less paths
 * - Asset 404 test
 * - Bundle HEAD + first-byte checks (MIME type, cache headers)
 * - Optional S3 metadata checks if AWS credentials present
 * 
 * Exit codes:
 * 0 - All checks passed
 * 1 - One or more checks failed
 * 
 * Usage:
 *   node scripts/diagnose-white-screen.js --domain example.com
 *   node scripts/diagnose-white-screen.js --domain example.com --bundle /assets/index-xyz.js
 *   node scripts/diagnose-white-screen.js --domain example.com --bucket my-bucket --distribution-id E123
 * 
 * Note: If --bundle is omitted, the script will auto-detect the bundle path from the remote index.html
 */

import https from 'https';
import http from 'http';
import { spawn } from 'child_process';

const args = process.argv.slice(2);
const config = {
  domain: getArg('--domain'),
  bundle: getArg('--bundle'),
  bucket: getArg('--bucket'),
  distributionId: getArg('--distribution-id'),
  verbose: args.includes('--verbose') || args.includes('-v')
};

function getArg(name) {
  const index = args.indexOf(name);
  return index !== -1 && args[index + 1] ? args[index + 1] : null;
}

// Test paths (extension-less SPA routes)
const TEST_PATHS = [
  '/',
  '/join',
  '/login',
  '/feed',
  '/about',
  '/settings'
];

// Expected to 404
const EXPECTED_404_PATH = '/this-should-not-exist-404-test.js';

let passCount = 0;
let failCount = 0;

function log(message, type = 'info') {
  const colors = {
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    info: '\x1b[36m',
    reset: '\x1b[0m'
  };
  
  const prefix = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  console.log(`${colors[type]}${prefix[type]} ${message}${colors.reset}`);
}

function logVerbose(message) {
  if (config.verbose) {
    console.log(`   ${message}`);
  }
}

async function httpGet(url, followRedirect = true) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (res) => {
      // Follow redirects
      if (followRedirect && (res.statusCode === 301 || res.statusCode === 302)) {
        const redirectUrl = res.headers.location;
        logVerbose(`Following redirect to ${redirectUrl}`);
        return httpGet(redirectUrl, followRedirect).then(resolve).catch(reject);
      }

      let data = '';
      res.on('data', (chunk) => {
        // Only collect first 1KB for efficiency
        if (data.length < 1024) {
          data += chunk;
        }
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data.substring(0, 1024)
        });
      });
    }).on('error', reject);
  });
}

async function httpHead(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'HEAD'
    };
    
    const req = protocol.request(options, (res) => {
      resolve({
        statusCode: res.statusCode,
        headers: res.headers
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function execCommand(command, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args);
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || stdout));
      }
    });
  });
}

async function testSpaRoute(domain, path) {
  const url = `https://${domain}${path}`;
  logVerbose(`Testing ${url}`);
  
  try {
    const response = await httpGet(url);
    
    if (response.statusCode === 200) {
      const contentType = response.headers['content-type'] || '';
      
      if (contentType.includes('text/html')) {
        log(`${path} → 200 HTML`, 'success');
        passCount++;
        return true;
      } else {
        log(`${path} → 200 but wrong content-type: ${contentType}`, 'error');
        failCount++;
        return false;
      }
    } else {
      log(`${path} → ${response.statusCode} (expected 200)`, 'error');
      failCount++;
      return false;
    }
  } catch (error) {
    log(`${path} → Error: ${error.message}`, 'error');
    failCount++;
    return false;
  }
}

async function test404Path(domain, path) {
  const url = `https://${domain}${path}`;
  logVerbose(`Testing 404 path ${url}`);
  
  try {
    const response = await httpGet(url, false);
    
    if (response.statusCode === 404 || response.statusCode === 403) {
      log(`404 test → ${response.statusCode} (correct)`, 'success');
      passCount++;
      return true;
    } else {
      log(`404 test → ${response.statusCode} (expected 404)`, 'error');
      failCount++;
      return false;
    }
  } catch (error) {
    log(`404 test → Error: ${error.message}`, 'error');
    failCount++;
    return false;
  }
}

async function extractBundleUrl(domain) {
  try {
    const response = await httpGet(`https://${domain}/`);
    const html = response.data;
    
    // Look for module script
    const moduleScriptRegex = /<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/i;
    const match = html.match(moduleScriptRegex);
    
    if (match && match[1]) {
      const bundlePath = match[1];
      logVerbose(`Found bundle: ${bundlePath}`);
      return bundlePath;
    }
    
    log('Could not extract bundle URL from index.html', 'warning');
    return null;
  } catch (error) {
    log(`Failed to fetch index.html: ${error.message}`, 'error');
    return null;
  }
}

async function testBundle(domain, bundlePath) {
  const url = `https://${domain}${bundlePath}`;
  logVerbose(`Testing bundle ${url}`);
  
  try {
    const response = await httpHead(url);
    
    if (response.statusCode !== 200) {
      log(`Bundle → ${response.statusCode} (expected 200)`, 'error');
      failCount++;
      return false;
    }
    
    const contentType = response.headers['content-type'] || '';
    const cacheControl = response.headers['cache-control'] || '';
    
    let bundleOk = true;
    
    // Check MIME type - accept both application/javascript and text/javascript but warn about text/javascript
    if (contentType.includes('application/javascript')) {
      logVerbose(`Bundle MIME type: ${contentType} ✓`);
    } else if (contentType.includes('text/javascript')) {
      log(`Bundle → MIME type is text/javascript (prefer application/javascript): ${contentType}`, 'warning');
      logVerbose(`Note: Both are valid, but application/javascript is the modern standard`);
    } else if (contentType.includes('text/html')) {
      log(`Bundle → Wrong MIME type (HTML instead of JS): ${contentType}`, 'error');
      bundleOk = false;
    } else {
      log(`Bundle → Unexpected MIME type: ${contentType}`, 'warning');
    }
    
    // Check cache headers
    if (cacheControl.includes('immutable') || cacheControl.includes('max-age')) {
      logVerbose(`Bundle cache-control: ${cacheControl} ✓`);
    } else {
      log(`Bundle → Missing immutable cache: ${cacheControl}`, 'warning');
    }
    
    if (bundleOk) {
      log(`Bundle checks → OK`, 'success');
      passCount++;
    } else {
      failCount++;
    }
    
    return bundleOk;
  } catch (error) {
    log(`Bundle test → Error: ${error.message}`, 'error');
    failCount++;
    return false;
  }
}

async function testS3Metadata(bucket, key) {
  if (!bucket) {
    log('S3 checks skipped (no bucket specified)', 'info');
    return true;
  }
  
  logVerbose(`Checking S3 metadata for s3://${bucket}/${key}`);
  
  try {
    const output = await execCommand('aws', [
      's3api',
      'head-object',
      '--bucket',
      bucket,
      '--key',
      key
    ]);
    
    const metadata = JSON.parse(output);
    const contentType = metadata.ContentType || '';
    const cacheControl = metadata.CacheControl || '';
    
    logVerbose(`S3 ContentType: ${contentType}`);
    logVerbose(`S3 CacheControl: ${cacheControl}`);
    
    if (key.endsWith('.js') && !contentType.includes('javascript')) {
      log(`S3 metadata → Wrong ContentType for ${key}: ${contentType}`, 'error');
      failCount++;
      return false;
    }
    
    log(`S3 metadata → OK`, 'success');
    passCount++;
    return true;
  } catch (error) {
    log(`S3 metadata check → Skipped (AWS CLI not available or no permissions)`, 'info');
    return true; // Don't fail if S3 checks aren't available
  }
}

async function testCloudFrontFunction(distributionId) {
  if (!distributionId) {
    log('CloudFront function check skipped (no distribution ID)', 'info');
    return true;
  }
  
  logVerbose(`Checking CloudFront distribution ${distributionId}`);
  
  try {
    const output = await execCommand('aws', [
      'cloudfront',
      'get-distribution-config',
      '--id',
      distributionId
    ]);
    
    const config = JSON.parse(output);
    const defaultBehavior = config.DistributionConfig?.DefaultCacheBehavior;
    
    if (!defaultBehavior) {
      log('CloudFront config → Could not find default behavior', 'error');
      failCount++;
      return false;
    }
    
    // Check for viewer-request function
    const functionAssociations = defaultBehavior.FunctionAssociations?.Items || [];
    const hasViewerRequest = functionAssociations.some(
      item => item.EventType === 'viewer-request'
    );
    
    if (hasViewerRequest) {
      log('CloudFront → viewer-request function attached ✓', 'success');
      passCount++;
    } else {
      log('CloudFront → No viewer-request function (SPA routing may fail)', 'error');
      failCount++;
      return false;
    }
    
    // Check for error responses
    const errorResponses = config.DistributionConfig?.CustomErrorResponses?.Items || [];
    const has404Mapping = errorResponses.some(
      item => item.ErrorCode === 404 && item.ResponsePagePath === '/index.html'
    );
    
    if (has404Mapping) {
      log('CloudFront → Warning: 404→/index.html error mapping active (should use function instead)', 'warning');
    }
    
    return hasViewerRequest;
  } catch (error) {
    log('CloudFront check → Skipped (AWS CLI not available or no permissions)', 'info');
    return true; // Don't fail if CloudFront checks aren't available
  }
}

async function main() {
  console.log('\n🔍 White Screen Diagnostic Tool\n');
  console.log('='.repeat(50));
  
  if (!config.domain) {
    console.error('❌ Error: --domain is required');
    console.error('\nUsage:');
    console.error('  node diagnose-white-screen.js --domain example.com');
    console.error('  node diagnose-white-screen.js --domain example.com --bundle /assets/index-xyz.js');
    console.error('  node diagnose-white-screen.js --domain example.com --bucket my-bucket --distribution-id E123');
    console.error('\nOptions:');
    console.error('  --domain <domain>              Domain to test (required)');
    console.error('  --bundle <path>                Bundle path (optional, auto-detected from remote index.html if omitted)');
    console.error('  --bucket <bucket>              S3 bucket name (optional, enables S3 checks)');
    console.error('  --distribution-id <id>         CloudFront distribution ID (optional)');
    console.error('  --verbose, -v                  Verbose output');
    process.exit(1);
  }
  
  console.log(`Domain: ${config.domain}`);
  if (config.bucket) console.log(`Bucket: ${config.bucket}`);
  if (config.distributionId) console.log(`Distribution: ${config.distributionId}`);
  console.log('='.repeat(50));
  console.log('');
  
  // Test 1: SPA Routes
  console.log('📍 Testing SPA routes...');
  for (const path of TEST_PATHS) {
    await testSpaRoute(config.domain, path);
  }
  console.log('');
  
  // Test 2: 404 Path
  console.log('🚫 Testing 404 handling...');
  await test404Path(config.domain, EXPECTED_404_PATH);
  console.log('');
  
  // Test 3: Bundle
  console.log('📦 Testing JavaScript bundle...');
  let bundlePath = config.bundle;
  
  // Auto-detect bundle path from remote index.html if not provided
  if (!bundlePath) {
    logVerbose('Bundle path not provided, attempting auto-detection from remote index.html');
    bundlePath = await extractBundleUrl(config.domain);
  }
  
  if (bundlePath) {
    await testBundle(config.domain, bundlePath);
    
    // Test 4: S3 Metadata (if bucket specified)
    if (config.bucket) {
      console.log('');
      console.log('☁️  Testing S3 metadata...');
      const s3Key = bundlePath.startsWith('/') ? bundlePath.substring(1) : bundlePath;
      await testS3Metadata(config.bucket, s3Key);
    }
  }
  console.log('');
  
  // Test 5: CloudFront Configuration
  if (config.distributionId) {
    console.log('🌐 Testing CloudFront configuration...');
    await testCloudFrontFunction(config.distributionId);
    console.log('');
  }
  
  // Summary
  console.log('='.repeat(50));
  console.log(`\n📊 Results: ${passCount} passed, ${failCount} failed\n`);
  
  if (failCount === 0) {
    log('All checks passed! ✨', 'success');
    process.exit(0);
  } else {
    log(`${failCount} check(s) failed. Review the errors above.`, 'error');
    console.log('\n💡 Common fixes:');
    console.log('  - Deploy with correct MIME types (scripts/deploy-static-with-mime.sh)');
    console.log('  - Attach SPA rewrite function to CloudFront viewer-request');
    console.log('  - Invalidate CloudFront cache (aws cloudfront create-invalidation)');
    console.log('  - Verify S3 bucket policy allows public read');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
