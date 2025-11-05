#!/usr/bin/env node

/**
 * UX Audit to GitHub Issues Converter
 * 
 * Converts UX_AUDIT_FINDINGS.csv and UX_AUDIT_SUMMARY.json into GitHub issue drafts.
 * Can generate JSON payloads or directly create GitHub issues using gh CLI.
 * 
 * Usage:
 *   node scripts/ux-audit-to-issues.mjs [options]
 * 
 * Options:
 *   --severity <levels>     Filter by severity: high, medium, low (comma-separated)
 *   --category <types>      Filter by category: Accessibility, Responsive, etc.
 *   --page <names>          Filter by specific page names
 *   --output <file>         Output JSON file (default: ux-audit-issues.json)
 *   --create                Create GitHub issues (requires gh CLI)
 *   --dry-run               Preview issues without creating
 *   --limit <n>             Limit number of issues to process
 *   --delay <ms>            Delay between API calls (default: 1000ms)
 *   --help                  Show this help message
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  severity: null,
  category: null,
  page: null,
  output: 'ux-audit-issues.json',
  create: false,
  dryRun: false,
  limit: null,
  delay: 1000,
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--severity':
      options.severity = args[++i]?.split(',').map(s => s.trim().toLowerCase());
      break;
    case '--category':
      options.category = args[++i]?.split(',').map(c => c.trim());
      break;
    case '--page':
      options.page = args[++i]?.split(',').map(p => p.trim());
      break;
    case '--output':
      options.output = args[++i];
      break;
    case '--create':
      options.create = true;
      break;
    case '--dry-run':
      options.dryRun = true;
      break;
    case '--limit':
      options.limit = parseInt(args[++i], 10);
      break;
    case '--delay':
      options.delay = parseInt(args[++i], 10);
      break;
    case '--help':
      console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, 20).join('\n'));
      process.exit(0);
    default:
      if (args[i].startsWith('--')) {
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
      }
  }
}

// Severity mapping
const severityMap = {
  critical: 'high priority',
  high: 'high priority',
  medium: 'medium priority',
  low: 'low priority',
};

// Category to label mapping
const categoryLabelMap = {
  Accessibility: 'accessibility',
  Responsive: 'responsive',
  Color: 'design-tokens',
  Spacing: 'design-tokens',
  'Visual Hierarchy': 'design-tokens',
};

// Load audit findings
function loadAuditFindings() {
  const csvPath = path.join(rootDir, 'UX_AUDIT_FINDINGS.csv');
  const jsonPath = path.join(rootDir, 'UX_AUDIT_SUMMARY.json');

  if (!fs.existsSync(csvPath)) {
    console.error('❌ UX_AUDIT_FINDINGS.csv not found. Run: npm run ux:audit');
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',');
  
  const findings = lines.slice(1).map(line => {
    // Simple CSV parsing (may need improvement for complex cases)
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const finding = {};
    headers.forEach((header, i) => {
      finding[header.trim()] = values[i] || '';
    });
    return finding;
  });

  let summary = {};
  if (fs.existsSync(jsonPath)) {
    summary = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  }

  return { findings, summary };
}

// Filter findings based on options
function filterFindings(findings) {
  let filtered = findings;

  if (options.severity) {
    filtered = filtered.filter(f => 
      options.severity.includes(f.Severity.toLowerCase())
    );
  }

  if (options.category) {
    filtered = filtered.filter(f =>
      options.category.some(cat => 
        f.Category.toLowerCase().includes(cat.toLowerCase())
      )
    );
  }

  if (options.page) {
    filtered = filtered.filter(f =>
      options.page.some(page =>
        f.Page.toLowerCase().includes(page.toLowerCase())
      )
    );
  }

  if (options.limit) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered;
}

// Group findings by component/page to avoid duplicates
function groupFindings(findings) {
  const groups = new Map();
  
  findings.forEach(finding => {
    const key = `${finding.Page}-${finding.Category}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(finding);
  });
  
  return Array.from(groups.values());
}

// Generate issue title
function generateIssueTitle(finding) {
  const categoryPrefix = {
    'Accessibility': '[A11y]',
    'Responsive': '[Responsive]',
    'Color': '[Design]',
    'Spacing': '[Design]',
    'Visual Hierarchy': '[Design]',
  }[finding.Category] || `[${finding.Category}]`;

  // Create a concise title
  let title = finding.Issue;
  if (title.length > 60) {
    title = title.substring(0, 57) + '...';
  }

  return `${categoryPrefix} ${title} - ${finding.Page}`;
}

// Generate issue body
function generateIssueBody(findings) {
  const firstFinding = findings[0];
  const affectedFiles = [...new Set(findings.map(f => f.File))];
  
  let body = `**Category:** ${firstFinding.Category}\n`;
  body += `**Severity:** ${firstFinding.Severity}\n`;
  body += `**Affected File(s):** ${affectedFiles.map(f => `\`${f}\``).join(', ')}\n\n`;
  
  body += `## Description\n\n`;
  body += `${firstFinding.Issue}\n\n`;
  
  if (findings.length > 1) {
    body += `**Note:** This issue affects ${findings.length} locations on this page.\n\n`;
  }
  
  body += `## Current Behavior\n\n`;
  body += `${firstFinding.Evidence}\n\n`;
  
  body += `## Expected Behavior\n\n`;
  body += `${firstFinding.Recommendation}\n\n`;
  
  body += `## Reproduction Steps\n\n`;
  body += `1. Navigate to the ${firstFinding.Page} page\n`;
  body += `2. ${getReproductionStep(firstFinding)}\n`;
  body += `3. Observe the issue\n\n`;
  
  body += `## Suggested Fix\n\n`;
  body += `${getCodeSuggestion(firstFinding)}\n\n`;
  
  body += `## Acceptance Criteria\n\n`;
  body += getAcceptanceCriteria(firstFinding);
  
  if (affectedFiles.length > 1) {
    body += `\n\n## Related Files\n\n`;
    affectedFiles.forEach(file => {
      body += `- \`${file}\`\n`;
    });
  }
  
  body += `\n\n## Additional Context\n\n`;
  body += `Generated from UX Deep Audit findings.\n`;
  body += `Severity: ${firstFinding.Severity}\n`;
  
  return body;
}

// Get reproduction step based on category
function getReproductionStep(finding) {
  const steps = {
    'Accessibility': 'Use keyboard navigation (Tab key) or screen reader',
    'Responsive': 'Resize browser window to mobile width (375px) or use DevTools device emulator',
    'Color': 'Inspect the element styles and look for hardcoded color values',
    'Spacing': 'Inspect the element and check for inline styles or inconsistent spacing',
    'Visual Hierarchy': 'Review the visual prominence and arrangement of elements',
  };
  return steps[finding.Category] || 'Inspect the page';
}

// Get code suggestion based on category and issue
function getCodeSuggestion(finding) {
  const category = finding.Category;
  const issue = finding.Issue.toLowerCase();
  
  if (category === 'Responsive' && issue.includes('breakpoint')) {
    return `Add Tailwind responsive classes to main containers:

\`\`\`jsx
// Before
<div className="flex gap-6 p-8">

// After  
<div className="flex flex-col md:flex-row gap-4 md:gap-6 p-4 md:p-8">
\`\`\`

Apply responsive classes to:
- Layout containers: \`flex-col md:flex-row\`
- Padding/margins: \`p-4 md:p-6 lg:p-8\`
- Gaps: \`gap-4 md:gap-6\`
- Typography: \`text-base md:text-lg\``;
  }
  
  if (category === 'Accessibility' && issue.includes('focus')) {
    return `Add focus-visible styles to interactive elements:

\`\`\`jsx
// Links
<a 
  href="..."
  className="focus-visible:outline-2 focus-visible:outline-primary-600 
             focus-visible:outline-offset-2 rounded"
>

// Buttons
<button 
  className="focus-visible:ring-2 focus-visible:ring-primary-600 
             focus-visible:ring-offset-2"
>
\`\`\``;
  }
  
  if (category === 'Accessibility' && issue.includes('h1')) {
    return `Add a descriptive H1 heading at the top of the page:

\`\`\`jsx
function ${finding.Page}() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-neutral-900 mb-6">
        ${finding.Page}
      </h1>
      {/* Rest of page content */}
    </div>
  );
}
\`\`\`

For visually hidden H1 (if design doesn't show it):
\`\`\`jsx
<h1 className="sr-only">${finding.Page}</h1>
\`\`\``;
  }
  
  if (category === 'Color' && issue.includes('hardcoded')) {
    return `Replace hardcoded hex colors with Tailwind utilities:

\`\`\`jsx
// Before
<div style={{ color: '#474747', backgroundColor: '#0CCE6B' }}>

// After
<div className="text-neutral-700 bg-primary-600">
\`\`\`

Common mappings:
- \`#474747\` → \`text-neutral-700\`
- \`#0CCE6B\` → \`text-primary-600\` or \`bg-primary-600\`
- \`#1a1a1a\` → \`text-neutral-900\``;
  }
  
  if (category === 'Spacing' && issue.includes('inline')) {
    return `Replace inline spacing styles with Tailwind utilities:

\`\`\`jsx
// Before
<div style={{ padding: '24px', margin: '16px 0' }}>

// After
<div className="p-6 my-4">
\`\`\``;
  }
  
  return `Follow the recommendation: ${finding.Recommendation}`;
}

// Get acceptance criteria
function getAcceptanceCriteria(finding) {
  const criteria = [];
  
  if (finding.Category === 'Responsive') {
    criteria.push('- [ ] Page displays correctly on mobile (375px)');
    criteria.push('- [ ] Page displays correctly on tablet (768px)');
    criteria.push('- [ ] Page displays correctly on desktop (1280px+)');
    criteria.push('- [ ] No horizontal scrolling on any breakpoint');
  }
  
  if (finding.Category === 'Accessibility') {
    if (finding.Issue.includes('focus')) {
      criteria.push('- [ ] All interactive elements have focus-visible styles');
      criteria.push('- [ ] Focus indicators have 3:1 contrast ratio');
      criteria.push('- [ ] Keyboard navigation works correctly');
      criteria.push('- [ ] Test with Tab key navigation');
    }
    if (finding.Issue.includes('H1')) {
      criteria.push('- [ ] H1 element added to page');
      criteria.push('- [ ] H1 accurately describes page content');
      criteria.push('- [ ] Heading hierarchy is correct');
    }
    criteria.push('- [ ] Verify with axe DevTools or Lighthouse');
  }
  
  if (finding.Category === 'Color') {
    criteria.push('- [ ] All hardcoded colors replaced');
    criteria.push('- [ ] Light mode appearance maintained');
    criteria.push('- [ ] Dark mode support verified');
  }
  
  if (finding.Category === 'Spacing') {
    criteria.push('- [ ] Inline styles removed');
    criteria.push('- [ ] Tailwind utilities used consistently');
    criteria.push('- [ ] Visual appearance unchanged');
  }
  
  criteria.push('- [ ] Re-run UX audit to verify fix');
  criteria.push('- [ ] Visual regression test passes');
  
  return criteria.join('\n');
}

// Generate labels for issue
function generateLabels(finding) {
  const labels = ['ux-audit'];
  
  // Add priority label
  const severity = finding.Severity.toLowerCase();
  if (severityMap[severity]) {
    labels.push(severityMap[severity]);
  }
  
  // Add category label
  if (categoryLabelMap[finding.Category]) {
    labels.push(categoryLabelMap[finding.Category]);
  }
  
  return labels;
}

// Create GitHub issue using gh CLI
async function createGitHubIssue(issuePayload) {
  if (options.dryRun) {
    console.log('\n📝 [DRY RUN] Would create issue:');
    console.log(`   Title: ${issuePayload.title}`);
    console.log(`   Labels: ${issuePayload.labels.join(', ')}`);
    return { success: true, dryRun: true };
  }

  try {
    // Write body to temp file
    const tempFile = path.join('/tmp', `issue-${Date.now()}.md`);
    fs.writeFileSync(tempFile, issuePayload.body);
    
    const labelsArg = issuePayload.labels.map(l => `--label "${l}"`).join(' ');
    const cmd = `gh issue create --title "${issuePayload.title}" --body-file "${tempFile}" ${labelsArg}`;
    
    const result = execSync(cmd, { 
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Clean up temp file
    fs.unlinkSync(tempFile);
    
    const issueUrl = result.trim();
    console.log(`✅ Created: ${issueUrl}`);
    
    return { success: true, url: issueUrl };
  } catch (error) {
    console.error(`❌ Failed to create issue: ${issuePayload.title}`);
    console.error(`   Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Sleep function for rate limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main execution
async function main() {
  console.log('🔍 UX Audit to GitHub Issues Converter\n');
  
  // Load findings
  console.log('📂 Loading audit findings...');
  const { findings, summary } = loadAuditFindings();
  console.log(`   Found ${findings.length} total findings`);
  
  if (summary.summary) {
    console.log(`   High: ${summary.summary.high}, Medium: ${summary.summary.medium}, Low: ${summary.summary.low}`);
  }
  
  // Filter findings
  console.log('\n🔎 Filtering findings...');
  const filtered = filterFindings(findings);
  console.log(`   ${filtered.length} findings match criteria`);
  
  if (filtered.length === 0) {
    console.log('\n⚠️  No findings match the specified criteria.');
    process.exit(0);
  }
  
  // Group findings to avoid duplicates
  console.log('\n📊 Grouping findings...');
  const groups = groupFindings(filtered);
  console.log(`   ${groups.length} unique issues identified`);
  
  // Generate issue payloads
  console.log('\n📝 Generating issue payloads...');
  const issuePayloads = [];
  
  for (const group of groups) {
    const firstFinding = group[0];
    const payload = {
      title: generateIssueTitle(firstFinding),
      body: generateIssueBody(group),
      labels: generateLabels(firstFinding),
      metadata: {
        page: firstFinding.Page,
        category: firstFinding.Category,
        severity: firstFinding.Severity,
        affectedFiles: [...new Set(group.map(f => f.File))],
      },
    };
    issuePayloads.push(payload);
  }
  
  console.log(`   Generated ${issuePayloads.length} issue payloads`);
  
  // Save to JSON file
  const outputPath = path.join(rootDir, options.output);
  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalFindings: findings.length,
      filteredFindings: filtered.length,
      issuesGenerated: issuePayloads.length,
      filters: options,
    },
    issues: issuePayloads,
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n💾 Saved issue payloads to: ${options.output}`);
  
  // Create GitHub issues if requested
  if (options.create) {
    console.log('\n🚀 Creating GitHub issues...');
    
    // Check if gh CLI is available
    try {
      execSync('gh --version', { stdio: 'ignore' });
    } catch {
      console.error('❌ GitHub CLI (gh) not found. Install from: https://cli.github.com/');
      process.exit(1);
    }
    
    const results = [];
    for (let i = 0; i < issuePayloads.length; i++) {
      const payload = issuePayloads[i];
      console.log(`\n[${i + 1}/${issuePayloads.length}] Creating issue...`);
      console.log(`   ${payload.title}`);
      
      const result = await createGitHubIssue(payload);
      results.push({ ...payload.metadata, ...result });
      
      // Rate limiting delay
      if (i < issuePayloads.length - 1 && !options.dryRun) {
        await sleep(options.delay);
      }
    }
    
    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log('\n\n📊 Summary:');
    console.log(`   ✅ Successful: ${successful}`);
    if (failed > 0) {
      console.log(`   ❌ Failed: ${failed}`);
    }
    
    if (options.dryRun) {
      console.log('\n💡 This was a dry run. Use --create without --dry-run to actually create issues.');
    }
  } else {
    console.log('\n💡 To create these issues in GitHub, run:');
    console.log(`   node scripts/ux-audit-to-issues.mjs --create`);
    console.log('\n   Or for a dry run:');
    console.log(`   node scripts/ux-audit-to-issues.mjs --create --dry-run`);
  }
  
  console.log('\n✨ Done!\n');
}

// Run main function
main().catch(error => {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
