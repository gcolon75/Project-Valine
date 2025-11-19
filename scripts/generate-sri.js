#!/usr/bin/env node
// scripts/generate-sri.js
// Generates SHA384 Subresource Integrity hashes for main JS and CSS bundles
// and injects them into dist/index.html

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

// Find the main JS and CSS files in dist
function findMainAssets() {
  const indexHtml = fs.readFileSync(INDEX_HTML, 'utf8');
  
  // Match script src with type="module" (main entry point)
  const jsMatch = indexHtml.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/);
  
  // Match link rel="stylesheet" (main CSS)
  const cssMatch = indexHtml.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/);
  
  const assets = {};
  
  if (jsMatch && jsMatch[1]) {
    const jsPath = jsMatch[1].startsWith('/') ? jsMatch[1].slice(1) : jsMatch[1];
    assets.js = {
      ref: jsMatch[1],
      path: path.join(DIST_DIR, jsPath)
    };
  }
  
  if (cssMatch && cssMatch[1]) {
    const cssPath = cssMatch[1].startsWith('/') ? cssMatch[1].slice(1) : cssMatch[1];
    assets.css = {
      ref: cssMatch[1],
      path: path.join(DIST_DIR, cssPath)
    };
  }
  
  return assets;
}

// Inject integrity and crossorigin attributes into index.html
function injectSRI(assets) {
  let html = fs.readFileSync(INDEX_HTML, 'utf8');
  
  if (assets.js) {
    if (!fs.existsSync(assets.js.path)) {
      console.error(`❌ JS bundle not found: ${assets.js.path}`);
      process.exit(1);
    }
    
    const jsHash = calculateSHA384(assets.js.path);
    const integrity = `sha384-${jsHash}`;
    
    console.log(`✅ JS bundle: ${assets.js.ref}`);
    console.log(`   Integrity: ${integrity}`);
    
    // Add integrity and crossorigin to script tag
    html = html.replace(
      new RegExp(`(<script[^>]+src="${assets.js.ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*)(>)`),
      `$1 integrity="${integrity}" crossorigin="anonymous"$2`
    );
  }
  
  if (assets.css) {
    if (!fs.existsSync(assets.css.path)) {
      console.error(`❌ CSS bundle not found: ${assets.css.path}`);
      process.exit(1);
    }
    
    const cssHash = calculateSHA384(assets.css.path);
    const integrity = `sha384-${cssHash}`;
    
    console.log(`✅ CSS bundle: ${assets.css.ref}`);
    console.log(`   Integrity: ${integrity}`);
    
    // Add integrity and crossorigin to link tag
    html = html.replace(
      new RegExp(`(<link[^>]+href="${assets.css.ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*)(>)`),
      `$1 integrity="${integrity}" crossorigin="anonymous"$2`
    );
  }
  
  fs.writeFileSync(INDEX_HTML, html, 'utf8');
  console.log(`\n✅ SRI attributes injected into ${INDEX_HTML}`);
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
  
  console.log('🔐 Generating SRI hashes...\n');
  
  const assets = findMainAssets();
  
  if (!assets.js && !assets.css) {
    console.error('❌ No main JS or CSS bundles found in index.html');
    process.exit(1);
  }
  
  injectSRI(assets);
  
  console.log('\n✅ SRI generation complete!');
} catch (error) {
  console.error('❌ SRI generation failed:', error.message);
  process.exit(1);
}
