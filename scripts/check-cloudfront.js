#!/usr/bin/env node

/**
 * CloudFront Diagnostic Script
 * 
 * Purpose: Check CloudFront distribution status, invalidations, and asset delivery
 * 
 * Usage:
 *   node scripts/check-cloudfront.js --distribution E1234567890ABC --bundle /assets/index-yrgN6q4Q.js
 *   or use environment variables CLOUDFRONT_DISTRIBUTION_ID, BUNDLE_PATH, CLOUDFRONT_DOMAIN
 */

import { execSync } from 'child_process';
import { parseArgs } from 'util';
import https from 'https';

// Parse command line arguments
const { values: args } = parseArgs({
  options: {
    distribution: { type: 'string', short: 'd', default: process.env.CLOUDFRONT_DISTRIBUTION_ID },
    bundle: { type: 'string', short: 'b', default: process.env.BUNDLE_PATH },
    domain: { type: 'string', default: process.env.CLOUDFRONT_DOMAIN },
    profile: { type: 'string', default: process.env.AWS_PROFILE }
  }
});

const DISTRIBUTION_ID = args.distribution;
let BUNDLE_PATH = args.bundle;
let CLOUDFRONT_DOMAIN = args.domain;
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
success('CloudFront Diagnostic Script');
success('========================================');
console.log('');

// Validate parameters
if (!DISTRIBUTION_ID) {
  error('Error: CloudFront distribution ID is required');
  console.log('Usage: node check-cloudfront.js --distribution <id> [--bundle <path>] [--domain <domain>]');
  process.exit(1);
}

success(`✓ Distribution ID: ${DISTRIBUTION_ID}`);
if (BUNDLE_PATH) {
  info(`Bundle path: ${BUNDLE_PATH}`);
}
if (CLOUDFRONT_DOMAIN) {
  info(`CloudFront domain: ${CLOUDFRONT_DOMAIN}`);
}
console.log('');

// Build AWS CLI profile argument
const awsProfileArgs = AWS_PROFILE ? ['--profile', AWS_PROFILE] : [];
if (AWS_PROFILE) {
  info(`Using AWS profile: ${AWS_PROFILE}`);
  console.log('');
}

// Helper to run AWS CLI commands
function runAwsCommand(args) {
  const cmdArgs = [...args, ...awsProfileArgs];
  const cmd = `aws ${cmdArgs.join(' ')}`;
  
  try {
    const result = execSync(cmd, { encoding: 'utf8' });
    return { success: true, output: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Helper to make HTTPS requests
function httpsRequest(url, method = 'GET', maxBytes = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: method,
      headers: {
        'User-Agent': 'CloudFront-Diagnostic-Script/1.0'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      let bytesRead = 0;
      
      res.on('data', (chunk) => {
        if (maxBytes && bytesRead + chunk.length > maxBytes) {
          // Only read up to maxBytes
          const remainingBytes = maxBytes - bytesRead;
          data += chunk.toString('utf8', 0, remainingBytes);
          bytesRead = maxBytes;
          req.destroy(); // Stop receiving more data
        } else {
          data += chunk;
          bytesRead += chunk.length;
        }
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

// 1. Get distribution configuration
info('1. Distribution Configuration');
info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const result = runAwsCommand([
  'cloudfront', 'get-distribution',
  '--id', DISTRIBUTION_ID,
  '--output', 'json'
]);

if (result.success) {
  try {
    const distConfig = JSON.parse(result.output);
    const status = distConfig.Distribution.Status;
    const domainName = distConfig.Distribution.DomainName;
    const enabled = distConfig.Distribution.DistributionConfig.Enabled;
    const webAclId = distConfig.Distribution.DistributionConfig.WebACLId;
    const customErrors = distConfig.Distribution.DistributionConfig.CustomErrorResponses.Items || [];
    
    success(`Status: ${status}`);
    info(`Domain Name: ${domainName}`);
    info(`Enabled: ${enabled}`);
    
    if (webAclId) {
      warn(`WAF WebACL ID: ${webAclId}`);
      warn('⚠ WAF is attached - may block asset requests!');
    } else {
      success('✓ No WAF attached');
    }
    
    if (customErrors.length > 0) {
      warn('Custom Error Responses:');
      customErrors.forEach(errorResponse => {
        warn(`  ${errorResponse.ErrorCode} → ${errorResponse.ResponseCode} ${errorResponse.ResponsePagePath}`);
      });
      warn('⚠ Custom error responses may mask real errors!');
    } else {
      success('✓ No custom error responses');
    }
    
    // Save domain for later use
    if (!CLOUDFRONT_DOMAIN) {
      CLOUDFRONT_DOMAIN = domainName;
    }
  } catch (err) {
    error(`Failed to parse distribution configuration: ${err.message}`);
  }
} else {
  error(`Failed to get distribution configuration: ${result.error}`);
}
console.log('');

// 2. List recent invalidations
info('2. Recent Invalidations (last 10)');
info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const invResult = runAwsCommand([
  'cloudfront', 'list-invalidations',
  '--distribution-id', DISTRIBUTION_ID,
  '--max-items', '10',
  '--output', 'json'
]);

if (invResult.success) {
  try {
    const invalidations = JSON.parse(invResult.output);
    
    if (invalidations.InvalidationList && invalidations.InvalidationList.Items) {
      invalidations.InvalidationList.Items.forEach(inv => {
        info(`  ${inv.Id} - ${inv.Status} (created: ${inv.CreateTime})`);
      });
    } else {
      info('  No recent invalidations');
    }
  } catch (err) {
    warn(`Could not parse invalidations: ${err.message}`);
  }
} else {
  warn(`Could not list invalidations: ${invResult.error}`);
}
console.log('');

// 3. Test bundle delivery (if bundle path and domain provided)
if (BUNDLE_PATH && CLOUDFRONT_DOMAIN) {
  info('3. Testing Bundle Delivery');
  info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const bundleUrl = `https://${CLOUDFRONT_DOMAIN}${BUNDLE_PATH}`;
  info(`Testing: ${bundleUrl}`);
  
  try {
    // HEAD request
    const headResponse = await httpsRequest(bundleUrl, 'HEAD');
    
    const statusCode = headResponse.statusCode;
    const contentType = headResponse.headers['content-type'];
    const cacheControl = headResponse.headers['cache-control'];
    const xCache = headResponse.headers['x-cache'];
    
    success(`Status Code: ${statusCode}`);
    
    if (contentType && contentType.includes('application/javascript')) {
      success(`✓ Content-Type: ${contentType}`);
    } else {
      error(`✗ Content-Type: ${contentType} (expected application/javascript)`);
    }
    
    if (cacheControl) {
      info(`Cache-Control: ${cacheControl}`);
    }
    
    if (xCache) {
      info(`X-Cache: ${xCache}`);
    }
    
    // GET first bytes
    console.log('');
    info('Fetching first 100 bytes...');
    
    const getResponse = await httpsRequest(bundleUrl, 'GET', 100);
    const firstBytes = getResponse.body;
    
    if (firstBytes.match(/^<!DOCTYPE|^<html/i)) {
      error('✗ CRITICAL: Response starts with HTML!');
      error(`First 100 bytes: ${firstBytes}`);
      error('This indicates CloudFront is serving index.html instead of the JS bundle');
    } else if (firstBytes.match(/^import |^export |^function |^var |^const |^let |^\/\*|^\/\//)) {
      success('✓ Response appears to be JavaScript');
      info(`First 100 bytes: ${firstBytes}`);
    } else {
      warn('⚠ Response format unclear');
      info(`First 100 bytes: ${firstBytes}`);
    }
  } catch (err) {
    error(`Request failed: ${err.message}`);
    error('This may indicate a 403 (WAF block) or 404 (missing file)');
  }
} else {
  warn('3. Skipping bundle delivery test (BundlePath or CloudFrontDomain not provided)');
}
console.log('');

// 4. Test other critical paths
info('4. Testing Critical Paths');
info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (CLOUDFRONT_DOMAIN) {
  const criticalPaths = ['/index.html', '/theme-init.js', '/manifest.json'];
  
  for (const path of criticalPaths) {
    const url = `https://${CLOUDFRONT_DOMAIN}${path}`;
    try {
      const response = await httpsRequest(url, 'HEAD');
      const statusCode = response.statusCode;
      const contentType = response.headers['content-type'];
      
      if (statusCode === 200) {
        success(`  ✓ ${path} - ${statusCode} (${contentType})`);
      } else {
        warn(`  ⚠ ${path} - ${statusCode}`);
      }
    } catch (err) {
      error(`  ✗ ${path} - FAILED`);
    }
  }
} else {
  warn('  Skipping (CloudFrontDomain not provided)');
}

console.log('');
success('========================================');
success('Diagnostic check completed');
success('========================================');
