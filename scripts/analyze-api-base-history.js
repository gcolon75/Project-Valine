#!/usr/bin/env node

/**
 * analyze-api-base-history.js
 * 
 * Retrieves last N merged PRs via GitHub API and analyzes them for:
 * - VITE_API_BASE changes
 * - References to fb9pxd6m09 (stale host)
 * - execute-api occurrences
 * 
 * Generates a markdown report at reports/api-base-history.md
 * 
 * Usage:
 *   node scripts/analyze-api-base-history.js [--count=25] [--help]
 * 
 * Environment variables:
 *   GITHUB_TOKEN: GitHub personal access token (optional, increases rate limit)
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const reportsDir = join(rootDir, 'reports');

const REPO_OWNER = 'gcolon75';
const REPO_NAME = 'Project-Valine';

function showHelp() {
  console.log(`
Usage: node scripts/analyze-api-base-history.js [options]

Analyzes recent PR history for API base configuration changes.

Options:
  --count=N  Number of merged PRs to analyze (default: 25)
  --help     Show this help message

Environment Variables:
  GITHUB_TOKEN  GitHub personal access token (optional, increases rate limit)

Output:
  reports/api-base-history.md

Examples:
  node scripts/analyze-api-base-history.js
  node scripts/analyze-api-base-history.js --count=50
`);
  process.exit(0);
}

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(new Error(`Failed to parse JSON: ${err.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

async function getMergedPRs(count = 25) {
  const headers = {
    'User-Agent': 'Project-Valine-API-Base-Analyzer',
    'Accept': 'application/vnd.github.v3+json'
  };
  
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }
  
  const perPage = Math.min(count, 100);
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls?state=closed&per_page=${perPage}&sort=updated&direction=desc`;
  
  console.log(`📡 Fetching merged PRs from GitHub API...`);
  
  try {
    const prs = await httpsGet(url, headers);
    
    // Filter only merged PRs
    const merged = prs.filter(pr => pr.merged_at !== null);
    
    console.log(`   Found ${merged.length} merged PRs (requested ${count})\n`);
    
    return merged.slice(0, count);
  } catch (err) {
    console.error(`❌ Error fetching PRs: ${err.message}`);
    
    if (err.message.includes('403') || err.message.includes('rate limit')) {
      console.error('\nRate limit exceeded. Set GITHUB_TOKEN environment variable to increase limit.');
    }
    
    throw err;
  }
}

async function analyzePR(pr) {
  const headers = {
    'User-Agent': 'Project-Valine-API-Base-Analyzer',
    'Accept': 'application/vnd.github.v3.diff'
  };
  
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }
  
  try {
    // Fetch PR diff (as text, not JSON)
    const diff = await new Promise((resolve, reject) => {
      https.get(pr.url, { headers }, (res) => {
        let data = '';
        
        res.on('data', chunk => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      }).on('error', reject);
    });
    
    const findings = {
      viteApiBase: [],
      staleHost: [],
      executeApi: []
    };
    
    const lines = diff.split('\n');
    
    lines.forEach((line, idx) => {
      if (line.includes('VITE_API_BASE')) {
        findings.viteApiBase.push({ line: idx + 1, content: line });
      }
      
      if (line.includes('fb9pxd6m09')) {
        findings.staleHost.push({ line: idx + 1, content: line });
      }
      
      if (line.includes('execute-api') && !line.includes('fb9pxd6m09')) {
        findings.executeApi.push({ line: idx + 1, content: line });
      }
    });
    
    return findings;
  } catch (err) {
    console.warn(`   Warning: Could not fetch diff for PR #${pr.number}: ${err.message}`);
    return null;
  }
}

function generateReport(prs, analyses) {
  let report = `# API Base Configuration History Report

Generated: ${new Date().toISOString()}

## Summary

Analyzed ${prs.length} merged PRs for API base configuration changes.

### Search Patterns
- \`VITE_API_BASE\` - Environment variable references
- \`fb9pxd6m09\` - Stale API host
- \`execute-api\` - AWS API Gateway references

## Findings

`;

  let hasFindings = false;
  
  prs.forEach((pr, idx) => {
    const analysis = analyses[idx];
    
    if (!analysis) {
      return; // Skip if diff fetch failed
    }
    
    const hasViteApiBase = analysis.viteApiBase.length > 0;
    const hasStaleHost = analysis.staleHost.length > 0;
    const hasExecuteApi = analysis.executeApi.length > 0;
    
    if (hasViteApiBase || hasStaleHost || hasExecuteApi) {
      hasFindings = true;
      
      report += `### PR #${pr.number}: ${pr.title}

- **Merged:** ${pr.merged_at}
- **Author:** @${pr.user.login}
- **URL:** ${pr.html_url}

`;

      if (hasStaleHost) {
        report += `**⚠️ STALE HOST REFERENCES FOUND (${analysis.staleHost.length}):**\n\n`;
        analysis.staleHost.slice(0, 5).forEach(finding => {
          report += `\`\`\`diff\n${finding.content}\n\`\`\`\n\n`;
        });
        if (analysis.staleHost.length > 5) {
          report += `_... and ${analysis.staleHost.length - 5} more occurrences_\n\n`;
        }
      }
      
      if (hasViteApiBase) {
        report += `**VITE_API_BASE changes (${analysis.viteApiBase.length}):**\n\n`;
        analysis.viteApiBase.slice(0, 3).forEach(finding => {
          report += `\`\`\`diff\n${finding.content}\n\`\`\`\n\n`;
        });
        if (analysis.viteApiBase.length > 3) {
          report += `_... and ${analysis.viteApiBase.length - 3} more occurrences_\n\n`;
        }
      }
      
      if (hasExecuteApi) {
        report += `**execute-api references (${analysis.executeApi.length}):**\n\n`;
        // Just show count, not all occurrences
        report += `Found ${analysis.executeApi.length} references to execute-api hosts.\n\n`;
      }
      
      report += `---\n\n`;
    }
  });
  
  if (!hasFindings) {
    report += `No API base configuration changes found in the analyzed PRs.\n\n`;
  }
  
  report += `## Recommendations

1. **Review stale host references:** Any occurrence of \`fb9pxd6m09\` should be updated or removed.
2. **Verify VITE_API_BASE:** Ensure the environment variable is set to the correct production host.
3. **Check hard-coded hosts:** Look for execute-api references that should use environment variables.

## Next Steps

Run the following scripts to validate current configuration:

\`\`\`bash
# Scan for stale hosts in current code
node scripts/scan-api-base.js

# Validate API base DNS resolution
node scripts/validate-api-base.js
\`\`\`
`;

  return report;
}

async function main() {
  if (process.argv.includes('--help')) {
    showHelp();
  }
  
  let count = 25;
  const countArg = process.argv.find(arg => arg.startsWith('--count='));
  if (countArg) {
    count = parseInt(countArg.split('=')[1], 10);
    if (isNaN(count) || count < 1) {
      console.error('Error: --count must be a positive integer');
      process.exit(1);
    }
  }
  
  console.log('🔍 Analyzing API Base Configuration History\n');
  console.log('═'.repeat(60));
  console.log(`   Repository: ${REPO_OWNER}/${REPO_NAME}`);
  console.log(`   PRs to analyze: ${count}`);
  console.log('');
  
  try {
    const prs = await getMergedPRs(count);
    
    console.log('📊 Analyzing PR diffs...\n');
    
    const analyses = [];
    for (let i = 0; i < prs.length; i++) {
      const pr = prs[i];
      process.stdout.write(`   [${i + 1}/${prs.length}] PR #${pr.number}...`);
      
      const analysis = await analyzePR(pr);
      analyses.push(analysis);
      
      if (analysis) {
        const totalFindings = 
          analysis.viteApiBase.length + 
          analysis.staleHost.length + 
          analysis.executeApi.length;
        
        if (totalFindings > 0) {
          console.log(` ${totalFindings} finding(s)`);
        } else {
          console.log(' ✓');
        }
      } else {
        console.log(' (skipped)');
      }
      
      // Rate limiting: small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n📝 Generating report...\n');
    
    const report = generateReport(prs, analyses);
    
    // Ensure reports directory exists
    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir, { recursive: true });
    }
    
    const reportPath = join(reportsDir, 'api-base-history.md');
    writeFileSync(reportPath, report, 'utf-8');
    
    console.log(`✅ Report generated: ${reportPath}\n`);
    
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
  }
}

main();
