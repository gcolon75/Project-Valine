#!/usr/bin/env node

/**
 * scan-api-base.js
 * 
 * Scans source code and built dist (if present) for:
 * - Hard-coded execute-api host patterns
 * - Fallback assignment lines that set a default base if env var is missing
 * - Known stale hosts
 * 
 * Exit codes:
 * - 0: No stale hosts found
 * - 1: Stale host found or critical error
 * 
 * Usage:
 *   node scripts/scan-api-base.js [--help]
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Known stale hosts that should never appear
const STALE_HOSTS = [
  'fb9pxd6m09.execute-api.us-west-2.amazonaws.com',
  'https://fb9pxd6m09.execute-api.us-west-2.amazonaws.com'
];

// Current valid host (for reference)
const VALID_HOST = 'ce73w43mga.execute-api.us-west-2.amazonaws.com';

// Patterns to search for
const PATTERNS = {
  executeApiHost: /https?:\/\/[A-Za-z0-9_-]+\.execute-api\.[A-Za-z0-9_.-]+/g,
  fallbackPattern: /(\|\||:)\s*['"`]https?:\/\/[^'"`]+execute-api[^'"`]+['"`]/g,
  envVarUsage: /VITE_API_BASE|API_BASE|API_URL/g
};

const findings = {
  staleHosts: [],
  hardcodedHosts: [],
  fallbacks: [],
  envUsage: []
};

function showHelp() {
  console.log(`
Usage: node scripts/scan-api-base.js [options]

Scans source and dist for API base configuration issues.

Options:
  --help    Show this help message

Exit Codes:
  0: No stale hosts found
  1: Stale host found or critical error

Examples:
  node scripts/scan-api-base.js
  npm run scan:api-base
`);
  process.exit(0);
}

function walkDir(dir, fileList = [], baseDir = dir) {
  const files = readdirSync(dir);
  
  files.forEach(file => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, .git, and other unnecessary directories
      if (['node_modules', '.git', '.github', 'coverage', 'test-results', 'playwright-report'].includes(file)) {
        return;
      }
      walkDir(filePath, fileList, baseDir);
    } else {
      // Only scan relevant file types
      if (/\.(js|jsx|ts|tsx|mjs|cjs|json|md|ps1|sh)$/.test(file)) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

function scanFile(filePath, baseDir) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const relativePath = relative(baseDir, filePath);
    
    // Check for stale hosts
    STALE_HOSTS.forEach(staleHost => {
      if (content.includes(staleHost)) {
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes(staleHost)) {
            findings.staleHosts.push({
              file: relativePath,
              line: idx + 1,
              content: line.trim(),
              host: staleHost
            });
          }
        });
      }
    });
    
    // Check for execute-api hosts (hard-coded)
    const hostMatches = content.matchAll(PATTERNS.executeApiHost);
    for (const match of hostMatches) {
      const host = match[0];
      // Skip if it's a stale host (already captured) or a comment/doc
      if (STALE_HOSTS.some(s => host.includes(s))) continue;
      
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes(host) && !line.trim().startsWith('//') && !line.trim().startsWith('*') && !line.trim().startsWith('#')) {
          // Check if it's not in a variable assignment or env usage
          if (!/VITE_API_BASE|API_BASE|API_URL/.test(line)) {
            findings.hardcodedHosts.push({
              file: relativePath,
              line: idx + 1,
              content: line.trim(),
              host: host
            });
          }
        }
      });
    }
    
    // Check for fallback patterns
    const fallbackMatches = content.matchAll(PATTERNS.fallbackPattern);
    for (const match of fallbackMatches) {
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes(match[0])) {
          findings.fallbacks.push({
            file: relativePath,
            line: idx + 1,
            content: line.trim()
          });
        }
      });
    }
    
    // Track env variable usage (for reporting)
    const envMatches = content.matchAll(PATTERNS.envVarUsage);
    for (const match of envMatches) {
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes(match[0]) && !line.trim().startsWith('//') && !line.trim().startsWith('*') && !line.trim().startsWith('#')) {
          findings.envUsage.push({
            file: relativePath,
            line: idx + 1,
            content: line.trim()
          });
        }
      });
    }
  } catch (err) {
    console.warn(`Warning: Could not read file ${filePath}: ${err.message}`);
  }
}

function printFindings() {
  console.log('\n🔍 API Base Configuration Scan Results\n');
  console.log('═'.repeat(60));
  
  if (findings.staleHosts.length > 0) {
    console.log('\n❌ STALE HOSTS FOUND (CRITICAL):');
    console.log('─'.repeat(60));
    findings.staleHosts.forEach(f => {
      console.log(`  ${f.file}:${f.line}`);
      console.log(`    Host: ${f.host}`);
      console.log(`    Line: ${f.content}`);
      console.log('');
    });
  }
  
  if (findings.hardcodedHosts.length > 0) {
    console.log('\n⚠️  HARD-CODED HOSTS (REVIEW RECOMMENDED):');
    console.log('─'.repeat(60));
    // Deduplicate by file:line
    const unique = new Map();
    findings.hardcodedHosts.forEach(f => {
      const key = `${f.file}:${f.line}`;
      if (!unique.has(key)) {
        unique.set(key, f);
      }
    });
    unique.forEach(f => {
      console.log(`  ${f.file}:${f.line}`);
      console.log(`    Host: ${f.host}`);
      console.log(`    Line: ${f.content}`);
      console.log('');
    });
  }
  
  if (findings.fallbacks.length > 0) {
    console.log('\n⚠️  FALLBACK PATTERNS (REVIEW RECOMMENDED):');
    console.log('─'.repeat(60));
    // Deduplicate
    const unique = new Map();
    findings.fallbacks.forEach(f => {
      const key = `${f.file}:${f.line}`;
      if (!unique.has(key)) {
        unique.set(key, f);
      }
    });
    unique.forEach(f => {
      console.log(`  ${f.file}:${f.line}`);
      console.log(`    Line: ${f.content}`);
      console.log('');
    });
  }
  
  console.log('\nℹ️  ENVIRONMENT VARIABLE USAGE:');
  console.log('─'.repeat(60));
  // Show unique files using env vars
  const uniqueFiles = [...new Set(findings.envUsage.map(f => f.file))];
  console.log(`  Found in ${uniqueFiles.length} file(s):`);
  uniqueFiles.slice(0, 10).forEach(file => {
    console.log(`    - ${file}`);
  });
  if (uniqueFiles.length > 10) {
    console.log(`    ... and ${uniqueFiles.length - 10} more`);
  }
  
  console.log('\n' + '═'.repeat(60));
  
  if (findings.staleHosts.length > 0) {
    console.log('\n❌ SCAN FAILED: Stale hosts detected!');
    console.log(`\nFound ${findings.staleHosts.length} occurrence(s) of stale API hosts.`);
    console.log('\nAction required:');
    console.log('  1. Update hard-coded references to use environment variables');
    console.log(`  2. Ensure VITE_API_BASE is set to the correct host: ${VALID_HOST}`);
    console.log('  3. Re-run this scan to verify\n');
    return 1;
  }
  
  if (findings.hardcodedHosts.length > 0) {
    console.log('\n⚠️  Warning: Found hard-coded execute-api hosts');
    console.log('   These may be documentation or examples.');
    console.log('   Review the findings above to ensure they are intentional.\n');
  }
  
  console.log('\n✅ No stale hosts detected');
  console.log(`   Valid host configured: ${VALID_HOST}\n`);
  return 0;
}

function main() {
  if (process.argv.includes('--help')) {
    showHelp();
  }
  
  console.log('🔍 Scanning for API base configuration issues...\n');
  
  const dirsToScan = [
    join(rootDir, 'src'),
    join(rootDir, 'scripts'),
    join(rootDir, 'docs'),
    join(rootDir, 'dist'),
    join(rootDir) // Root level files like .ps1, .sh
  ];
  
  const filesToScan = [];
  
  dirsToScan.forEach(dir => {
    try {
      if (statSync(dir).isDirectory()) {
        walkDir(dir, filesToScan, rootDir);
      }
    } catch (err) {
      // Directory doesn't exist, skip
    }
  });
  
  // Also scan root-level files
  try {
    const rootFiles = readdirSync(rootDir);
    rootFiles.forEach(file => {
      const filePath = join(rootDir, file);
      try {
        if (statSync(filePath).isFile() && /\.(ps1|sh|md)$/.test(file)) {
          filesToScan.push(filePath);
        }
      } catch (err) {
        // Skip
      }
    });
  } catch (err) {
    // Skip
  }
  
  console.log(`   Scanning ${filesToScan.length} files...\n`);
  
  filesToScan.forEach(file => {
    scanFile(file, rootDir);
  });
  
  const exitCode = printFindings();
  process.exit(exitCode);
}

main();
