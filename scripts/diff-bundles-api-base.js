#!/usr/bin/env node

/**
 * diff-bundles-api-base.js
 * 
 * Compares two bundle files to detect API hostname changes.
 * Can auto-detect latest two bundles or accept explicit paths.
 * 
 * Outputs:
 * - JSON summary
 * - Markdown report at reports/bundle-host-diff.md
 * 
 * Usage:
 *   node scripts/diff-bundles-api-base.js [bundle1] [bundle2] [--help]
 * 
 * If no bundle paths provided, automatically picks latest two index-*.js in dist/assets
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const reportsDir = join(rootDir, 'reports');

// Regex to extract execute-api hostnames from bundles
const EXECUTE_API_PATTERN = /https:\/\/[A-Za-z0-9_-]+\.execute-api\.[A-Za-z0-9._-]+/g;

function showHelp() {
  console.log(`
Usage: node scripts/diff-bundles-api-base.js [bundle1] [bundle2] [options]

Compares two bundles to detect API hostname changes.

Arguments:
  bundle1   Path to first bundle (older)
  bundle2   Path to second bundle (newer)
  
  If omitted, automatically picks latest two index-*.js in dist/assets

Options:
  --help    Show this help message

Output:
  - JSON summary to stdout
  - Markdown report to reports/bundle-host-diff.md

Examples:
  node scripts/diff-bundles-api-base.js
  node scripts/diff-bundles-api-base.js dist/assets/index-abc123.js dist/assets/index-def456.js
`);
  process.exit(0);
}

function findLatestBundles(distDir) {
  const assetsDir = join(distDir, 'assets');
  
  if (!existsSync(assetsDir)) {
    return [];
  }
  
  const files = readdirSync(assetsDir)
    .filter(f => f.startsWith('index-') && f.endsWith('.js'))
    .map(f => {
      const path = join(assetsDir, f);
      const stat = statSync(path);
      return { path, name: f, mtime: stat.mtime };
    })
    .sort((a, b) => b.mtime - a.mtime); // Newest first
  
  return files.slice(0, 2).map(f => f.path);
}

function extractHosts(bundlePath) {
  try {
    const content = readFileSync(bundlePath, 'utf-8');
    const matches = content.match(EXECUTE_API_PATTERN) || [];
    
    // Deduplicate
    const unique = [...new Set(matches)];
    
    return unique;
  } catch (err) {
    throw new Error(`Failed to read bundle ${bundlePath}: ${err.message}`);
  }
}

function diffHosts(hosts1, hosts2) {
  const set1 = new Set(hosts1);
  const set2 = new Set(hosts2);
  
  const removed = hosts1.filter(h => !set2.has(h));
  const added = hosts2.filter(h => !set1.has(h));
  const common = hosts1.filter(h => set2.has(h));
  
  return { removed, added, common };
}

function generateReport(bundle1, bundle2, hosts1, hosts2, diff) {
  const report = `# Bundle API Host Diff Report

Generated: ${new Date().toISOString()}

## Bundles Compared

**Bundle 1 (Older):** \`${basename(bundle1)}\`  
**Bundle 2 (Newer):** \`${basename(bundle2)}\`

## Summary

- **Hosts in Bundle 1:** ${hosts1.length}
- **Hosts in Bundle 2:** ${hosts2.length}
- **Added:** ${diff.added.length}
- **Removed:** ${diff.removed.length}
- **Common:** ${diff.common.length}

## Detailed Findings

### ✅ Common Hosts (${diff.common.length})

${diff.common.length > 0 ? diff.common.map(h => `- \`${h}\``).join('\n') : '_None_'}

### ➕ Added Hosts (${diff.added.length})

${diff.added.length > 0 ? diff.added.map(h => `- \`${h}\` ⚠️`).join('\n') : '_None_'}

### ➖ Removed Hosts (${diff.removed.length})

${diff.removed.length > 0 ? diff.removed.map(h => `- \`${h}\` ✓`).join('\n') : '_None_'}

## Interpretation

${diff.added.length > 0 ? `
⚠️ **Action Required:** New API hosts detected in the latest bundle.

Verify that these hosts are intentional and match your deployment configuration.

**New hosts:**
${diff.added.map(h => `  - ${h}`).join('\n')}

**Check your configuration:**
- Ensure \`VITE_API_BASE\` is set correctly in \`.env.production\`
- Verify the hosts resolve via DNS
- Run \`node scripts/validate-api-base.js\` to validate
` : ''}

${diff.removed.length > 0 && diff.added.length === 0 ? `
✅ **Good:** Host(s) were removed but none added. This may indicate:
- Migration from old to new API host (verify the new host is in "common")
- Cleanup of stale references

**Removed hosts:**
${diff.removed.map(h => `  - ${h}`).join('\n')}
` : ''}

${diff.added.length === 0 && diff.removed.length === 0 ? `
✅ **No changes detected:** The API hosts are identical between bundles.
` : ''}

## Recommendations

1. **Review added hosts:** Ensure they match your deployment configuration
2. **Verify DNS resolution:** Run \`node scripts/validate-api-base.js\`
3. **Check for stale hosts:** Run \`node scripts/scan-api-base.js\`
4. **Update documentation:** If hosts changed intentionally, update deployment docs

## Next Steps

\`\`\`bash
# Validate current API base configuration
node scripts/validate-api-base.js

# Scan for stale hosts in source code
node scripts/scan-api-base.js

# Re-run this diff after making changes
node scripts/diff-bundles-api-base.js
\`\`\`
`;

  return report;
}

function main() {
  if (process.argv.includes('--help')) {
    showHelp();
  }
  
  console.log('🔍 Analyzing Bundle API Hosts\n');
  console.log('═'.repeat(60));
  
  let bundle1, bundle2;
  
  // Parse arguments
  const args = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
  
  if (args.length >= 2) {
    bundle1 = args[0];
    bundle2 = args[1];
    
    console.log('   Using provided bundle paths');
  } else {
    console.log('   Auto-detecting latest bundles...');
    
    const distDir = join(rootDir, 'dist');
    const bundles = findLatestBundles(distDir);
    
    if (bundles.length < 2) {
      console.error('\n❌ Error: Could not find at least 2 bundles in dist/assets');
      console.error('\nPlease provide bundle paths explicitly:');
      console.error('  node scripts/diff-bundles-api-base.js <bundle1> <bundle2>\n');
      process.exit(1);
    }
    
    bundle1 = bundles[1]; // Older
    bundle2 = bundles[0]; // Newer
  }
  
  console.log(`   Bundle 1: ${basename(bundle1)}`);
  console.log(`   Bundle 2: ${basename(bundle2)}`);
  console.log('');
  
  // Extract hosts
  console.log('📊 Extracting API hosts...\n');
  
  let hosts1, hosts2;
  try {
    hosts1 = extractHosts(bundle1);
    console.log(`   Bundle 1: ${hosts1.length} unique host(s)`);
    
    hosts2 = extractHosts(bundle2);
    console.log(`   Bundle 2: ${hosts2.length} unique host(s)`);
    console.log('');
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}\n`);
    process.exit(1);
  }
  
  // Compute diff
  const diff = diffHosts(hosts1, hosts2);
  
  console.log('📈 Diff Summary:\n');
  console.log(`   Common:  ${diff.common.length}`);
  console.log(`   Added:   ${diff.added.length}`);
  console.log(`   Removed: ${diff.removed.length}`);
  console.log('');
  
  if (diff.added.length > 0) {
    console.log('⚠️  New hosts detected:');
    diff.added.forEach(h => console.log(`     + ${h}`));
    console.log('');
  }
  
  if (diff.removed.length > 0) {
    console.log('✓ Hosts removed:');
    diff.removed.forEach(h => console.log(`     - ${h}`));
    console.log('');
  }
  
  // Generate report
  console.log('📝 Generating report...\n');
  
  const report = generateReport(bundle1, bundle2, hosts1, hosts2, diff);
  
  // Ensure reports directory exists
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
  }
  
  const reportPath = join(reportsDir, 'bundle-host-diff.md');
  writeFileSync(reportPath, report, 'utf-8');
  
  console.log(`✅ Report saved: ${reportPath}\n`);
  
  // Output JSON summary
  const jsonSummary = {
    timestamp: new Date().toISOString(),
    bundles: {
      older: basename(bundle1),
      newer: basename(bundle2)
    },
    hosts: {
      bundle1: hosts1,
      bundle2: hosts2
    },
    diff: {
      common: diff.common,
      added: diff.added,
      removed: diff.removed
    }
  };
  
  console.log('JSON Summary:');
  console.log(JSON.stringify(jsonSummary, null, 2));
  console.log('');
  
  console.log('═'.repeat(60));
  
  if (diff.added.length > 0) {
    console.log('\n⚠️  Warning: New API hosts detected in the latest bundle');
    console.log('   Review the report for details.\n');
  } else {
    console.log('\n✅ No new API hosts detected\n');
  }
}

main();
