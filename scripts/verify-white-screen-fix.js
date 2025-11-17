#!/usr/bin/env node

/**
 * Comprehensive verification script for white screen fix
 * Verifies all key components are working correctly
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

console.log('🔍 Running comprehensive verification...\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (e) {
    console.error(`❌ ${name}`);
    console.error(`   ${e.message}`);
    failed++;
  }
}

// Test 1: ErrorBoundary exists and is properly exported
test('ErrorBoundary component exists', () => {
  const path = join(rootDir, 'src/components/ErrorBoundary.jsx');
  if (!existsSync(path)) throw new Error('ErrorBoundary.jsx not found');
  
  const content = readFileSync(path, 'utf8');
  if (!content.includes('export default ErrorBoundary')) {
    throw new Error('ErrorBoundary not properly exported');
  }
  if (!content.includes('componentDidCatch')) {
    throw new Error('ErrorBoundary missing componentDidCatch');
  }
  if (!content.includes('window.__errorInstrumentation')) {
    throw new Error('ErrorBoundary not logging to error instrumentation');
  }
});

// Test 2: ErrorBoundary is imported in main.jsx
test('ErrorBoundary imported in main.jsx', () => {
  const path = join(rootDir, 'src/main.jsx');
  const content = readFileSync(path, 'utf8');
  
  if (!content.includes('import ErrorBoundary from "./components/ErrorBoundary"')) {
    throw new Error('ErrorBoundary not imported');
  }
  if (!content.includes('<ErrorBoundary>')) {
    throw new Error('ErrorBoundary not used in render');
  }
});

// Test 3: theme-init.js has error instrumentation
test('theme-init.js has error instrumentation', () => {
  const path = join(rootDir, 'public/theme-init.js');
  const content = readFileSync(path, 'utf8');
  
  if (!content.includes('window.addEventListener(\'error\'')) {
    throw new Error('Missing global error handler');
  }
  if (!content.includes('window.addEventListener(\'unhandledrejection\'')) {
    throw new Error('Missing unhandled rejection handler');
  }
  if (!content.includes('window.__errorInstrumentation')) {
    throw new Error('Missing error instrumentation API');
  }
  if (!content.includes('MAX_ERRORS_PER_WINDOW')) {
    throw new Error('Missing rate limiting');
  }
});

// Test 4: Observability handler accepts client errors
test('Observability handler accepts client errors', () => {
  const path = join(rootDir, 'serverless/src/handlers/observability.js');
  const content = readFileSync(path, 'utf8');
  
  if (!content.includes('source === \'client\'')) {
    throw new Error('Handler not checking for client source');
  }
  if (!content.includes('errors && Array.isArray(errors)')) {
    throw new Error('Handler not checking for batched errors');
  }
});

// Test 5: postbuild validation script exists
test('postbuild validation script exists', () => {
  const path = join(rootDir, 'scripts/postbuild-validate.js');
  if (!existsSync(path)) throw new Error('postbuild-validate.js not found');
  
  const content = readFileSync(path, 'utf8');
  if (!content.includes('localPathPatterns')) {
    throw new Error('Missing local path validation');
  }
  if (!content.includes('moduleScriptRegex')) {
    throw new Error('Missing module script validation');
  }
});

// Test 6: package.json includes postbuild validation
test('package.json includes postbuild validation', () => {
  const path = join(rootDir, 'package.json');
  let content = readFileSync(path, 'utf8');
  
  // Remove BOM if present
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  
  const pkg = JSON.parse(content);
  
  if (!pkg.scripts.postbuild) {
    throw new Error('postbuild script not defined');
  }
  if (!pkg.scripts.postbuild.includes('postbuild-validate')) {
    throw new Error('postbuild script does not run validation');
  }
});

// Test 7: vite.config.js has source maps enabled
test('vite.config.js has source maps enabled', () => {
  const path = join(rootDir, 'vite.config.js');
  const content = readFileSync(path, 'utf8');
  
  if (!content.includes('sourcemap: true')) {
    throw new Error('Source maps not enabled');
  }
  if (!content.includes('build:')) {
    throw new Error('Build configuration missing');
  }
});

// Test 8: Deployment scripts exist
test('Deployment scripts exist', () => {
  const bashScript = join(rootDir, 'scripts/deploy-static-with-mime.sh');
  const psScript = join(rootDir, 'scripts/deploy-static-with-mime.ps1');
  
  if (!existsSync(bashScript)) throw new Error('Bash deploy script not found');
  if (!existsSync(psScript)) throw new Error('PowerShell deploy script not found');
  
  const bashContent = readFileSync(bashScript, 'utf8');
  if (!bashContent.includes('--content-type')) {
    throw new Error('Bash script missing Content-Type headers');
  }
  if (!bashContent.includes('cloudfront create-invalidation')) {
    throw new Error('Bash script missing CloudFront invalidation');
  }
});

// Test 9: Documentation exists
test('Documentation exists', () => {
  const deployDoc = join(rootDir, 'docs/DEPLOYMENT.md');
  const testDoc = join(rootDir, 'docs/WHITE_SCREEN_FIX_TESTING.md');
  const summary = join(rootDir, 'WHITE_SCREEN_FIX_SUMMARY.md');
  
  if (!existsSync(deployDoc)) throw new Error('DEPLOYMENT.md not found');
  if (!existsSync(testDoc)) throw new Error('WHITE_SCREEN_FIX_TESTING.md not found');
  if (!existsSync(summary)) throw new Error('WHITE_SCREEN_FIX_SUMMARY.md not found');
});

// Test 10: ErrorBoundary tests exist and are comprehensive
test('ErrorBoundary tests exist', () => {
  const path = join(rootDir, 'src/components/__tests__/ErrorBoundary.test.jsx');
  if (!existsSync(path)) throw new Error('ErrorBoundary.test.jsx not found');
  
  const content = readFileSync(path, 'utf8');
  if (!content.includes('renders children when there is no error')) {
    throw new Error('Missing happy path test');
  }
  if (!content.includes('renders error UI when child component throws')) {
    throw new Error('Missing error rendering test');
  }
  if (!content.includes('logs error to error instrumentation')) {
    throw new Error('Missing error logging test');
  }
});

// Test 11: Build output exists and is valid (if dist exists)
if (existsSync(join(rootDir, 'dist'))) {
  test('Build output is valid', () => {
    const indexPath = join(rootDir, 'dist/index.html');
    if (!existsSync(indexPath)) throw new Error('dist/index.html not found');
    
    const content = readFileSync(indexPath, 'utf8');
    
    // Check for corrupted tags
    if (/C:\\/i.test(content)) {
      throw new Error('dist/index.html contains local paths (C:\\)');
    }
    if (/cd=""/i.test(content)) {
      throw new Error('dist/index.html contains malformed attributes');
    }
    
    // Check for proper module script
    const moduleScriptRegex = /<script\s+type=["']module["'][^>]*>/i;
    if (!moduleScriptRegex.test(content)) {
      throw new Error('dist/index.html missing module script tag');
    }
    
    // Check for src attribute
    const srcRegex = /<script\s+type=["']module["'][^>]*src=["']\/assets\/[^"']+\.js["']/i;
    if (!srcRegex.test(content)) {
      throw new Error('Module script tag missing proper src attribute');
    }
  });
  
  test('Source maps are generated', () => {
    const assetsDir = join(rootDir, 'dist/assets');
    if (!existsSync(assetsDir)) throw new Error('dist/assets not found');
    
    const files = readdirSync(assetsDir);
    const sourceMaps = files.filter(f => f.endsWith('.js.map'));
    
    if (sourceMaps.length === 0) {
      throw new Error('No source maps found in dist/assets');
    }
  });
}

console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

if (failed > 0) {
  console.log('\n❌ Verification failed');
  process.exit(1);
} else {
  console.log('\n✅ All verifications passed!');
  process.exit(0);
}
