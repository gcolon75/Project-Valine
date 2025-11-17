#!/usr/bin/env node

/**
 * Post-build validation script
 * 
 * Validates the production build output to prevent deployment of corrupted files:
 * - Ensures index.html doesn't contain local filesystem paths (C:\, C:/)
 * - Ensures module script tags have proper src attributes
 * - Validates that referenced JS files actually exist
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');

console.log('🔍 Running post-build validation...');

// Check if dist exists
if (!existsSync(distDir)) {
  console.error('❌ BUILD VALIDATION FAILED: dist directory not found');
  process.exit(1);
}

// Read index.html
const indexPath = join(distDir, 'index.html');
if (!existsSync(indexPath)) {
  console.error('❌ BUILD VALIDATION FAILED: dist/index.html not found');
  process.exit(1);
}

const indexHtml = readFileSync(indexPath, 'utf-8');

// Check for local filesystem paths
const localPathPatterns = [
  /C:\\/i,           // Windows absolute path
  /C:\//i,           // Windows absolute path (forward slash)
  /[A-Z]:\\/,        // Any drive letter
  /cd=""/i,          // Malformed attribute
  /c:\\temp/i,       // Temp directory reference
];

let hasErrors = false;

for (const pattern of localPathPatterns) {
  if (pattern.test(indexHtml)) {
    console.error(`❌ BUILD VALIDATION FAILED: index.html contains local filesystem path matching ${pattern}`);
    console.error('   This indicates a corrupted build output.');
    hasErrors = true;
  }
}

// Check module script tags
const moduleScriptRegex = /<script\s+type=["']module["'][^>]*>/gi;
const matches = indexHtml.match(moduleScriptRegex);

if (!matches || matches.length === 0) {
  console.error('❌ BUILD VALIDATION FAILED: No module script tags found in index.html');
  hasErrors = true;
} else {
  console.log(`✓ Found ${matches.length} module script tag(s)`);
  
  matches.forEach((tag, idx) => {
    // Check for src attribute
    const srcMatch = tag.match(/src=["']([^"']+)["']/);
    
    if (!srcMatch) {
      console.error(`❌ BUILD VALIDATION FAILED: Module script tag #${idx + 1} missing src attribute`);
      console.error(`   Tag: ${tag}`);
      hasErrors = true;
      return;
    }
    
    const src = srcMatch[1];
    console.log(`✓ Module script #${idx + 1} src: ${src}`);
    
    // Check for malformed attributes
    if (tag.includes('cd=""') || tag.includes('cd="') || /\s+c:\\/.test(tag)) {
      console.error(`❌ BUILD VALIDATION FAILED: Module script tag #${idx + 1} has malformed attributes`);
      console.error(`   Tag: ${tag}`);
      hasErrors = true;
      return;
    }
    
    // Validate referenced file exists (for relative paths)
    if (src.startsWith('/') && !src.startsWith('//') && !src.startsWith('http')) {
      const filePath = join(distDir, src.substring(1));
      if (!existsSync(filePath)) {
        console.error(`❌ BUILD VALIDATION FAILED: Referenced file does not exist: ${src}`);
        console.error(`   Expected at: ${filePath}`);
        hasErrors = true;
      } else {
        console.log(`✓ Referenced file exists: ${src}`);
      }
    }
  });
}

// Check for proper asset references
const assetRegex = /\/(assets\/[^"']+\.js)/g;
let assetMatch;
const assets = [];
while ((assetMatch = assetRegex.exec(indexHtml)) !== null) {
  assets.push(assetMatch[1]);
}

console.log(`✓ Found ${assets.length} asset reference(s)`);

// Validate assets exist
assets.forEach(asset => {
  const assetPath = join(distDir, asset);
  if (!existsSync(assetPath)) {
    console.warn(`⚠️  Warning: Asset file not found: ${asset}`);
    console.warn(`   Expected at: ${assetPath}`);
    // Don't fail build for this, just warn
  }
});

if (hasErrors) {
  console.error('\n═══════════════════════════════════════════════════');
  console.error('❌ BUILD VALIDATION FAILED');
  console.error('═══════════════════════════════════════════════════');
  console.error('The build output contains errors that would cause');
  console.error('white screen or module loading failures in production.');
  console.error('Please fix the build process before deploying.');
  console.error('═══════════════════════════════════════════════════\n');
  process.exit(1);
}

console.log('\n✅ Build validation passed - output looks good!\n');
