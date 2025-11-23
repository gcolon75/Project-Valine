#!/usr/bin/env node

/**
 * Production Deployment Verification Script
 * Checks that production environment is properly configured
 */

import https from 'https';
import { URL } from 'url';

const CHECKS = {
  apiHealth: process.env.VITE_API_BASE,
  frontendUrl: process.env.FRONTEND_URL
};

// Validate required environment variables
if (!CHECKS.apiHealth || !CHECKS.frontendUrl) {
  console.error('\n❌ ERROR: Missing required environment variables\n');
  console.error('Please set the following environment variables:');
  if (!CHECKS.apiHealth) {
    console.error('  - VITE_API_BASE (e.g., https://your-api-gateway-url.execute-api.us-west-2.amazonaws.com)');
  }
  if (!CHECKS.frontendUrl) {
    console.error('  - FRONTEND_URL (e.g., https://your-cloudfront-domain.cloudfront.net)');
  }
  console.error('\nExample usage:');
  console.error('  export VITE_API_BASE="https://api.example.com"');
  console.error('  export FRONTEND_URL="https://example.com"');
  console.error('  node scripts/verify-production-deployment.mjs\n');
  process.exit(1);
}

async function checkApiHealth() {
  console.log('\n🔍 Checking API Health...');
  
  try {
    const url = new URL('/health', CHECKS.apiHealth);
    
    const response = await fetch(url.toString());
    const data = await response.json();
    
    console.log('✅ API Health:', data.status);
    console.log('   Secrets Status:', JSON.stringify(data.secretsStatus, null, 2));
    
    if (data.warnings && data.warnings.length > 0) {
      console.log('⚠️  Warnings:', data.warnings);
    }
    
    return data;
  } catch (error) {
    console.error('❌ API Health Check Failed:', error.message);
    return null;
  }
}

async function testLogin() {
  console.log('\n🔍 Testing Login Endpoint...');
  
  const testEmail = 'test@example.com';
  const testPassword = 'TestPassword123!';
  
  try {
    const url = new URL('/api/auth/login', CHECKS.apiHealth);
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Login endpoint responding');
    } else {
      console.log('⚠️  Login failed (expected for test credentials):', data.error);
    }
    
    return response.ok;
  } catch (error) {
    console.error('❌ Login Test Failed:', error.message);
    return false;
  }
}

async function checkFrontend() {
  console.log('\n🔍 Checking Frontend...');
  
  try {
    const response = await fetch(CHECKS.frontendUrl);
    
    if (response.ok) {
      console.log('✅ Frontend is accessible');
      console.log('   URL:', CHECKS.frontendUrl);
    } else {
      console.log('❌ Frontend returned:', response.status);
    }
    
    return response.ok;
  } catch (error) {
    console.error('❌ Frontend Check Failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║       Production Deployment Verification                          ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  
  const results = {
    apiHealth: await checkApiHealth(),
    loginTest: await testLogin(),
    frontend: await checkFrontend()
  };
  
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║       Summary                                                      ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  
  const allPassed = results.apiHealth && results.frontend;
  
  if (allPassed) {
    console.log('\n✅ All checks passed - production is healthy');
  } else {
    console.log('\n❌ Some checks failed - review errors above');
  }
  
  process.exit(allPassed ? 0 : 1);
}

main();
