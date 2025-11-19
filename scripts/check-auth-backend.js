#!/usr/bin/env node

/**
 * Auth Backend Diagnostics Script
 * 
 * This script performs comprehensive checks on the auth backend to diagnose
 * connectivity issues like DNS resolution failures (net::ERR_NAME_NOT_RESOLVED).
 * 
 * Usage:
 *   node scripts/check-auth-backend.js --domain fb9pxd6m09.execute-api.us-west-2.amazonaws.com
 *   node scripts/check-auth-backend.js --domain api.valine.com --timeout 10000
 * 
 * Exit codes:
 *   0 - All checks passed
 *   1 - DNS resolution failure
 *   2 - TCP connection failure
 *   3 - HTTP request failure
 */

import dns from 'dns';
import { promisify } from 'util';
import net from 'net';
import https from 'https';
import http from 'http';

const lookup = promisify(dns.lookup);
const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

// Parse command-line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    domain: null,
    timeout: 10000,
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--domain' && i + 1 < args.length) {
      config.domain = args[i + 1];
      i++;
    } else if (args[i] === '--timeout' && i + 1 < args.length) {
      config.timeout = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--verbose' || args[i] === '-v') {
      config.verbose = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!config.domain) {
    console.error('Error: --domain parameter is required\n');
    printHelp();
    process.exit(1);
  }

  return config;
}

function printHelp() {
  console.log(`
Auth Backend Diagnostics

Usage:
  node scripts/check-auth-backend.js --domain <hostname> [options]

Options:
  --domain <hostname>   API Gateway hostname (required)
                        Example: fb9pxd6m09.execute-api.us-west-2.amazonaws.com
  --timeout <ms>        Request timeout in milliseconds (default: 10000)
  --verbose, -v         Show detailed output
  --help, -h            Show this help message

Examples:
  node scripts/check-auth-backend.js --domain fb9pxd6m09.execute-api.us-west-2.amazonaws.com
  node scripts/check-auth-backend.js --domain api.valine.com --timeout 5000 --verbose

Exit Codes:
  0 - All checks passed
  1 - DNS resolution failure
  2 - TCP connection failure
  3 - HTTP request failure
`);
}

// DNS Resolution Check
async function checkDNS(domain, verbose) {
  console.log('\n=== DNS Resolution Check ===');
  console.log(`Resolving: ${domain}\n`);

  try {
    // Try dns.lookup (uses system resolver)
    const lookupResult = await lookup(domain);
    console.log(`✓ DNS lookup successful`);
    console.log(`  Address: ${lookupResult.address}`);
    console.log(`  Family: IPv${lookupResult.family}`);

    // Try resolve4 for IPv4
    try {
      const ipv4Addresses = await resolve4(domain);
      console.log(`✓ IPv4 addresses: ${ipv4Addresses.join(', ')}`);
    } catch (err) {
      if (verbose) console.log(`  No IPv4 addresses found: ${err.message}`);
    }

    // Try resolve6 for IPv6
    try {
      const ipv6Addresses = await resolve6(domain);
      console.log(`✓ IPv6 addresses: ${ipv6Addresses.join(', ')}`);
    } catch (err) {
      if (verbose) console.log(`  No IPv6 addresses found: ${err.message}`);
    }

    return { success: true, addresses: [lookupResult.address] };
  } catch (err) {
    console.error(`✗ DNS resolution failed`);
    console.error(`  Error: ${err.code} - ${err.message}`);
    console.error(`\nCommon causes:`);
    console.error(`  1. Domain name typo or incorrect hostname`);
    console.error(`  2. API Gateway endpoint deleted or stage removed`);
    console.error(`  3. DNS record not created or propagation in progress`);
    console.error(`  4. Local DNS server or network issues`);
    console.error(`\nTroubleshooting steps:`);
    console.error(`  - Verify domain in environment variables (VITE_API_BASE)`);
    console.error(`  - Run: nslookup ${domain}`);
    console.error(`  - Run: dig ${domain}`);
    console.error(`  - Check AWS API Gateway: aws apigateway get-rest-apis`);
    console.error(`  - Check Route53 records if using custom domain`);
    return { success: false, error: err };
  }
}

// TCP Connection Check
async function checkTCP(domain, addresses, timeout, verbose) {
  console.log('\n=== TCP Connection Check ===');
  console.log(`Testing connection to port 443 (HTTPS)\n`);

  const results = [];

  for (const address of addresses) {
    const result = await new Promise((resolve) => {
      const socket = new net.Socket();
      const startTime = Date.now();

      socket.setTimeout(timeout);

      socket.on('connect', () => {
        const duration = Date.now() - startTime;
        console.log(`✓ TCP connection successful to ${address}:443 (${duration}ms)`);
        socket.destroy();
        resolve({ success: true, address, duration });
      });

      socket.on('timeout', () => {
        console.error(`✗ TCP connection timeout to ${address}:443`);
        socket.destroy();
        resolve({ success: false, address, error: 'timeout' });
      });

      socket.on('error', (err) => {
        console.error(`✗ TCP connection failed to ${address}:443`);
        console.error(`  Error: ${err.code} - ${err.message}`);
        resolve({ success: false, address, error: err });
      });

      if (verbose) console.log(`  Connecting to ${address}:443...`);
      socket.connect(443, address);
    });

    results.push(result);
  }

  const allSuccess = results.every(r => r.success);

  if (!allSuccess) {
    console.error(`\nCommon causes:`);
    console.error(`  1. Firewall blocking outbound HTTPS (port 443)`);
    console.error(`  2. API Gateway endpoint not deployed or deleted`);
    console.error(`  3. Security group or network ACL blocking traffic`);
    console.error(`  4. WAF or CloudFront blocking the connection`);
  }

  return { success: allSuccess, results };
}

// HTTPS Request Check
async function checkHTTPS(domain, path, method, timeout, verbose) {
  return new Promise((resolve) => {
    const options = {
      hostname: domain,
      port: 443,
      path: path,
      method: method,
      timeout: timeout,
      headers: {
        'User-Agent': 'Valine-Auth-Diagnostics/1.0',
        'Accept': 'application/json'
      }
    };

    if (verbose) {
      console.log(`  Request: ${method} https://${domain}${path}`);
    }

    const startTime = Date.now();
    const req = https.request(options, (res) => {
      const duration = Date.now() - startTime;
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        const result = {
          success: res.statusCode >= 200 && res.statusCode < 500,
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          body: body,
          duration: duration
        };
        resolve(result);
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'timeout',
        message: `Request timeout after ${timeout}ms`
      });
    });

    req.on('error', (err) => {
      resolve({
        success: false,
        error: err.code,
        message: err.message,
        fullError: err
      });
    });

    req.end();
  });
}

// Check /auth/me endpoint
async function checkAuthMe(domain, timeout, verbose) {
  console.log('\n=== HTTPS GET /auth/me ===');
  
  const result = await checkHTTPS(domain, '/auth/me', 'GET', timeout, verbose);

  if (result.success) {
    console.log(`✓ GET /auth/me responded with ${result.statusCode} (${result.duration}ms)`);
    console.log(`  Status: ${result.statusCode} ${result.statusMessage}`);
    console.log(`  Content-Type: ${result.headers['content-type']}`);
    if (result.headers['cache-control']) {
      console.log(`  Cache-Control: ${result.headers['cache-control']}`);
    }
    if (verbose && result.body) {
      console.log(`  Body preview: ${result.body.substring(0, 200)}${result.body.length > 200 ? '...' : ''}`);
    }
  } else {
    console.error(`✗ GET /auth/me failed`);
    if (result.error) {
      console.error(`  Error: ${result.error} - ${result.message}`);
      if (result.fullError && verbose) {
        console.error(`  Full error:`, result.fullError);
      }
    }
  }

  return result;
}

// Check OPTIONS /auth/login (CORS)
async function checkAuthLoginOptions(domain, timeout, verbose) {
  console.log('\n=== HTTPS OPTIONS /auth/login (CORS Check) ===');
  
  const result = await checkHTTPS(domain, '/auth/login', 'OPTIONS', timeout, verbose);

  if (result.success) {
    console.log(`✓ OPTIONS /auth/login responded with ${result.statusCode} (${result.duration}ms)`);
    console.log(`  Status: ${result.statusCode} ${result.statusMessage}`);
    
    const corsHeaders = [
      'access-control-allow-origin',
      'access-control-allow-methods',
      'access-control-allow-headers',
      'access-control-allow-credentials',
      'access-control-max-age'
    ];

    console.log(`  CORS Headers:`);
    corsHeaders.forEach(header => {
      if (result.headers[header]) {
        console.log(`    ${header}: ${result.headers[header]}`);
      }
    });

    if (!result.headers['access-control-allow-origin']) {
      console.warn(`  ⚠ Warning: No CORS headers found. Frontend may have CORS issues.`);
    }
  } else {
    console.error(`✗ OPTIONS /auth/login failed`);
    if (result.error) {
      console.error(`  Error: ${result.error} - ${result.message}`);
      if (result.fullError && verbose) {
        console.error(`  Full error:`, result.fullError);
      }
    }
  }

  return result;
}

// Check HEAD / (root endpoint)
async function checkRoot(domain, timeout, verbose) {
  console.log('\n=== HTTPS HEAD / (Root Check) ===');
  
  const result = await checkHTTPS(domain, '/', 'HEAD', timeout, verbose);

  if (result.success) {
    console.log(`✓ HEAD / responded with ${result.statusCode} (${result.duration}ms)`);
    console.log(`  Status: ${result.statusCode} ${result.statusMessage}`);
    if (result.headers['server']) {
      console.log(`  Server: ${result.headers['server']}`);
    }
  } else {
    console.error(`✗ HEAD / failed`);
    if (result.error) {
      console.error(`  Error: ${result.error} - ${result.message}`);
    }
  }

  return result;
}

// Main execution
async function main() {
  const config = parseArgs();

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         Auth Backend Diagnostics                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nTarget: ${config.domain}`);
  console.log(`Timeout: ${config.timeout}ms`);

  let exitCode = 0;

  // Step 1: DNS Resolution
  const dnsResult = await checkDNS(config.domain, config.verbose);
  if (!dnsResult.success) {
    console.log('\n❌ DIAGNOSTIC FAILED: DNS resolution failed');
    console.log('\nRecommended actions:');
    console.log('  1. Check VITE_API_BASE environment variable');
    console.log('  2. Verify API Gateway endpoint exists in AWS console');
    console.log('  3. Check Route53 DNS records if using custom domain');
    console.log('  4. Run local DNS diagnostics (nslookup, dig)');
    process.exit(1);
  }

  // Step 2: TCP Connectivity
  const tcpResult = await checkTCP(config.domain, dnsResult.addresses, config.timeout, config.verbose);
  if (!tcpResult.success) {
    console.log('\n❌ DIAGNOSTIC FAILED: TCP connection failed');
    console.log('\nRecommended actions:');
    console.log('  1. Check firewall and security groups');
    console.log('  2. Verify API Gateway deployment');
    console.log('  3. Check WAF rules if CloudFront is in front');
    console.log('  4. Test from different network to isolate local issues');
    process.exit(2);
  }

  // Step 3: HTTPS Requests
  const rootResult = await checkRoot(config.domain, config.timeout, config.verbose);
  const authMeResult = await checkAuthMe(config.domain, config.timeout, config.verbose);
  const optionsResult = await checkAuthLoginOptions(config.domain, config.timeout, config.verbose);

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                 Diagnostic Summary                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nDNS Resolution:       ${dnsResult.success ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`TCP Connection:       ${tcpResult.success ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Root Endpoint:        ${rootResult.success ? '✓ PASS' : '✗ FAIL'} (${rootResult.statusCode || 'N/A'})`);
  console.log(`Auth /me Endpoint:    ${authMeResult.success ? '✓ PASS' : '✗ FAIL'} (${authMeResult.statusCode || 'N/A'})`);
  console.log(`CORS Check:           ${optionsResult.success ? '✓ PASS' : '✗ FAIL'} (${optionsResult.statusCode || 'N/A'})`);

  if (!rootResult.success || !authMeResult.success || !optionsResult.success) {
    exitCode = 3;
    console.log('\n⚠ Some HTTP checks failed. This may be expected if:');
    console.log('  - The endpoint requires authentication (401/403)');
    console.log('  - The API is configured differently');
    console.log('  - CORS is handled by CloudFront instead of API Gateway');
    console.log('\nReview the details above and check:');
    console.log('  - API Gateway stage deployment');
    console.log('  - CloudFront/WAF configuration if applicable');
    console.log('  - Backend Lambda function logs in CloudWatch');
  } else {
    console.log('\n✅ All diagnostics passed! Backend is reachable.');
  }

  console.log('\nFor more troubleshooting guidance, see:');
  console.log('  docs/AUTH_BACKEND_INVESTIGATION.md\n');

  process.exit(exitCode);
}

main().catch((err) => {
  console.error('\n❌ Unexpected error:', err);
  process.exit(1);
});
