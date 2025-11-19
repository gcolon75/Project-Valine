#!/usr/bin/env node
// scripts/verify-sri.js
// Verifies that SRI hashes in dist/index.html match the actual file hashes

import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '..', 'dist');
const INDEX_HTML = path.join(DIST_DIR, 'index.html');

// Calculate SHA384 hash for a file
function calculateSHA384(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha384');
  hashSum.update(fileBuffer);
  return hashSum.digest('base64');
}

// Extract SRI hashes from index.html
function extractSRIHashes() {
  const html = fs.readFileSync(INDEX_HTML, 'utf8');
  const hashes = [];
  
  // Match script tags with integrity attribute
  const scriptRegex = /<script[^>]+src="([^"]+)"[^>]+integrity="sha384-([^"]+)"[^>]*>/g;
  let match;
  
  while ((match = scriptRegex.exec(html)) !== null) {
    const srcPath = match[1].startsWith('/') ? match[1].slice(1) : match[1];
    hashes.push({
      type: 'script',
      ref: match[1],
      path: path.join(DIST_DIR, srcPath),
      expectedHash: match[2]
    });
  }
  
  // Match link tags with integrity attribute
  const linkRegex = /<link[^>]+href="([^"]+)"[^>]+integrity="sha384-([^"]+)"[^>]*>/g;
  
  while ((match = linkRegex.exec(html)) !== null) {
    const hrefPath = match[1].startsWith('/') ? match[1].slice(1) : match[1];
    hashes.push({
      type: 'link',
      ref: match[1],
      path: path.join(DIST_DIR, hrefPath),
      expectedHash: match[2]
    });
  }
  
  return hashes;
}

// Verify all SRI hashes
function verifySRI(hashes) {
  let allValid = true;
  
  console.log('🔍 Verifying SRI hashes...\n');
  
  for (const item of hashes) {
    if (!fs.existsSync(item.path)) {
      console.error(`❌ File not found: ${item.path}`);
      allValid = false;
      continue;
    }
    
    const actualHash = calculateSHA384(item.path);
    const isValid = actualHash === item.expectedHash;
    
    if (isValid) {
      console.log(`✅ ${item.type.toUpperCase()}: ${item.ref}`);
      console.log(`   Hash matches: sha384-${actualHash.substring(0, 20)}...`);
    } else {
      console.error(`❌ ${item.type.toUpperCase()}: ${item.ref}`);
      console.error(`   Expected: sha384-${item.expectedHash.substring(0, 20)}...`);
      console.error(`   Actual:   sha384-${actualHash.substring(0, 20)}...`);
      allValid = false;
    }
    console.log('');
  }
  
  return allValid;
}

// Main execution
try {
  if (!fs.existsSync(DIST_DIR)) {
    console.error(`❌ Dist directory not found: ${DIST_DIR}`);
    console.error('   Run "npm run build" first');
    process.exit(1);
  }
  
  if (!fs.existsSync(INDEX_HTML)) {
    console.error(`❌ index.html not found: ${INDEX_HTML}`);
    process.exit(1);
  }
  
  const hashes = extractSRIHashes();
  
  if (hashes.length === 0) {
    console.warn('⚠️  No SRI hashes found in index.html');
    console.warn('   Run "npm run build:sri" to generate them');
    process.exit(1);
  }
  
  const allValid = verifySRI(hashes);
  
  if (allValid) {
    console.log('✅ All SRI hashes are valid!');
    process.exit(0);
  } else {
    console.error('❌ SRI verification failed!');
    console.error('   Some hashes do not match. This could indicate:');
    console.error('   1. Files were modified after SRI generation');
    console.error('   2. Build process is non-deterministic');
    console.error('   3. Files were corrupted');
    console.error('\n   Run "npm run build:sri" to regenerate SRI hashes');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ SRI verification error:', error.message);
  process.exit(1);
}
