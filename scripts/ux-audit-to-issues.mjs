#!/usr/bin/env node

/**
 * UX Audit to GitHub Issues Converter
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Help text
const HELP_TEXT = `
UX Audit to GitHub Issues Converter

Converts UX_AUDIT_FINDINGS.csv and UX_AUDIT_SUMMARY.json into GitHub issue drafts.
Can generate JSON payloads or directly create GitHub issues using gh CLI.

Usage:
  node scripts/ux-audit-to-issues.mjs [options]

Options:
  --severity <levels>     Filter by severity: high, medium, low (comma-separated)
  --category <types>      Filter by category: Accessibility, Responsive, etc.
  --page <names>          Filter by specific page names
  --output <file>         Output JSON file (default: ux-audit-issues.json)
  --roadmap <file>        Generate roadmap summary file (default: UX_AUDIT_ROADMAP.md)
  --create                Create GitHub issues (requires gh CLI)
  --create-milestones     Create GitHub milestones (requires gh CLI)
  --dry-run               Preview issues without creating
  --limit <n>             Limit number of issues to process
  --delay <ms>            Delay between API calls (default: 1000ms)
  --help                  Show this help message

Examples:
  npm run ux:audit-to-issues -- --severity high,medium
  npm run ux:audit-to-issues -- --severity high,medium --create-milestones --dry-run
  npm run ux:audit-to-issues -- --severity high --limit 10 --create
  npm run ux:audit-to-issues -- --category responsive --create --dry-run
`;

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  severity: null,
  category: null,
  page: null,
  output: 'ux-audit-issues.json',
  roadmap: 'UX_AUDIT_ROADMAP.md',
  create: false,
  createMilestones: false,
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
    case '--roadmap':
      options.roadmap = args[++i];
      break;
    case '--create':
      options.create = true;
      break;
    case '--create-milestones':
      options.createMilestones = true;
      break;
    case '--dry-run':
      options.dryRun = true;
      break;
    case '--limit':
      {
        const limitValue = parseInt(args[++i], 10);
        if (isNaN(limitValue) || limitValue < 1) {
          console.error('Error: --limit must be a positive integer');
          process.exit(1);
        }
        options.limit = limitValue;
      }
      break;
    case '--delay':
      {
        const delayValue = parseInt(args[++i], 10);
        if (isNaN(delayValue) || delayValue < 0) {
          console.error('Error: --delay must be a non-negative integer');
          process.exit(1);
        }
        options.delay = delayValue;
      }
      break;
    case '--help':
      console.log(HELP_TEXT);
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

// Constants for title formatting
const MAX_TITLE_LENGTH = 60;
const TITLE_TRUNCATE_LENGTH = 57; // MAX - 3 for "..."

/**
 * Sanitize a page name for use in JavaScript identifiers (function names, etc.)
 * Only allows alphanumeric characters to ensure valid JavaScript identifiers.
 * 
 * @param {string} pageName - The page name from audit findings
 * @returns {string} Sanitized name safe for use as JavaScript identifier
 */
function sanitizeForIdentifier(pageName) {
  // JavaScript identifiers must start with letter, _, or $ and contain only alphanumeric, _, $
  // We use a strict alphanumeric-only approach for simplicity
  const sanitized = pageName.replace(/[^a-zA-Z0-9]/g, '');
  // Provide unique fallback if all chars removed, using original length for context
  return sanitized || `UnknownPage${pageName.length}`;
}

/**
 * Sanitize a page title for use in JSX/HTML content.
 * Uses a whitelist approach to only allow safe characters.
 * Allows: letters, numbers, spaces, hyphens, underscores
 * 
 * @param {string} pageTitle - The page title from audit findings
 * @returns {string} Sanitized title safe for use in JSX/HTML
 */
function sanitizeForDisplay(pageTitle) {
  // Whitelist approach: only allow known-safe characters
  // Letters, numbers, spaces, hyphens, underscores
  const sanitized = pageTitle.replace(/[^a-zA-Z0-9 \-_]/g, '').trim();
  // Provide context-aware fallback if all chars removed
  return sanitized || `Unknown Page (${pageTitle.length} chars)`;
}

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
    // CSV parsing with proper quote handling
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"' && nextChar === '"' && inQuotes) {
        // Escaped quote: "" becomes "
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        // Toggle quote state
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

  // Create a concise title using constants
  let title = finding.Issue;
  if (title.length > MAX_TITLE_LENGTH) {
    title = title.substring(0, TITLE_TRUNCATE_LENGTH) + '...';
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
    // Use sanitization functions to ensure safe output
    const pageName = sanitizeForIdentifier(finding.Page);
    const pageTitle = sanitizeForDisplay(finding.Page);
    
    return `Add a descriptive H1 heading at the top of the page:

\`\`\`jsx
function ${pageName}() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-neutral-900 mb-6">
        ${pageTitle}
      </h1>
      {/* Rest of page content */}
    </div>
  );
}
\`\`\`

For visually hidden H1 (if design doesn't show it):
\`\`\`jsx
<h1 className="sr-only">${pageTitle}</h1>
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

  let tempFile;
  try {
    // Write body to temp file using OS temp directory
    tempFile = path.join(os.tmpdir(), `issue-${Date.now()}.md`);
    fs.writeFileSync(tempFile, issuePayload.body);
    
    // Build command args array - safe from shell injection
    const args = [
      'issue', 'create',
      '--title', issuePayload.title,
      '--body-file', tempFile
    ];
    
    // Add labels
    issuePayload.labels.forEach(label => {
      args.push('--label', label);
    });
    
    // Use spawnSync with args array to prevent shell injection
    const result = spawnSync('gh', args, { 
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    if (result.error) {
      throw result.error;
    }
    
    if (result.status !== 0) {
      throw new Error(result.stderr || 'gh command failed');
    }
    
    const issueUrl = result.stdout.trim();
    console.log(`✅ Created: ${issueUrl}`);
    
    return { success: true, url: issueUrl };
  } catch (error) {
    console.error(`❌ Failed to create issue: ${issuePayload.title}`);
    console.error(`   Error: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    // Always clean up temp file
    if (tempFile && fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
      } catch (cleanupError) {
        console.warn(`⚠️  Failed to clean up temp file: ${tempFile}`);
      }
    }
  }
}

// Sleep function for rate limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate milestone definitions
function generateMilestones(issuePayloads) {
  const milestones = [];
  
  // Group by severity
  const highPriority = issuePayloads.filter(p => p.metadata.severity === 'High');
  const mediumPriority = issuePayloads.filter(p => p.metadata.severity === 'Medium');
  
  if (highPriority.length > 0) {
    milestones.push({
      title: 'UX Polish - Sprint 1',
      description: `High priority UX improvements from Deep Audit. Focuses on critical responsive design issues and high-impact accessibility fixes.\n\nIncludes ${highPriority.length} issues:\n- Responsive design fixes\n- Critical accessibility improvements\n- High-impact visual improvements`,
      dueDate: getSprintDueDate(1),
      state: 'open',
      issues: highPriority.length,
    });
  }
  
  if (mediumPriority.length > 0) {
    milestones.push({
      title: 'UX Polish - Sprint 2',
      description: `Medium priority UX improvements from Deep Audit. Enhances overall user experience with accessibility, design token adoption, and polish.\n\nIncludes ${mediumPriority.length} issues:\n- Accessibility enhancements\n- Design token migration\n- Visual hierarchy improvements`,
      dueDate: getSprintDueDate(2),
      state: 'open',
      issues: mediumPriority.length,
    });
  }
  
  return milestones;
}

// Calculate sprint due date (2 weeks per sprint from today)
function getSprintDueDate(sprintNumber) {
  const date = new Date();
  date.setDate(date.getDate() + (sprintNumber * 14));
  return date.toISOString().split('T')[0];
}

// Generate roadmap summary
function generateRoadmapSummary(issuePayloads) {
  const categories = {};
  const severities = { High: [], Medium: [], Low: [] };
  
  // Organize by category and severity
  issuePayloads.forEach(payload => {
    const cat = payload.metadata.category;
    const sev = payload.metadata.severity;
    
    if (!categories[cat]) {
      categories[cat] = { High: 0, Medium: 0, Low: 0 };
    }
    categories[cat][sev]++;
    severities[sev].push(payload);
  });
  
  let roadmap = `# UX Audit Roadmap and Milestones\n\n`;
  roadmap += `**Generated:** ${new Date().toISOString().split('T')[0]}\n\n`;
  roadmap += `## Executive Summary\n\n`;
  roadmap += `This roadmap addresses ${issuePayloads.length} UX issues identified in the Deep Audit, `;
  roadmap += `organized into sprints by severity and impact.\n\n`;
  
  // Overview stats
  roadmap += `### Overview\n\n`;
  roadmap += `| Severity | Count | Sprint Assignment |\n`;
  roadmap += `|----------|-------|-------------------|\n`;
  roadmap += `| High     | ${severities.High.length} | Sprint 1 |\n`;
  roadmap += `| Medium   | ${severities.Medium.length} | Sprint 2 |\n`;
  roadmap += `| Low      | ${severities.Low.length} | Backlog |\n\n`;
  
  // By category breakdown
  roadmap += `### Issues by Category\n\n`;
  roadmap += `| Category | High | Medium | Low | Total |\n`;
  roadmap += `|----------|------|--------|-----|-------|\n`;
  Object.entries(categories).forEach(([cat, counts]) => {
    const total = counts.High + counts.Medium + counts.Low;
    roadmap += `| ${cat} | ${counts.High} | ${counts.Medium} | ${counts.Low} | ${total} |\n`;
  });
  roadmap += `\n`;
  
  // Milestones
  roadmap += `## Milestones\n\n`;
  
  if (severities.High.length > 0) {
    roadmap += `### 🎯 Sprint 1: High Priority (UX Polish - Sprint 1)\n\n`;
    roadmap += `**Due Date:** ${getSprintDueDate(1)}\n\n`;
    roadmap += `**Focus Areas:**\n`;
    roadmap += `- Responsive design fixes (critical for mobile users)\n`;
    roadmap += `- High-impact accessibility improvements\n`;
    roadmap += `- Critical visual/interaction issues\n\n`;
    roadmap += `**Issues (${severities.High.length}):**\n\n`;
    
    const highByCategory = {};
    severities.High.forEach(issue => {
      const cat = issue.metadata.category;
      if (!highByCategory[cat]) highByCategory[cat] = [];
      highByCategory[cat].push(issue);
    });
    
    Object.entries(highByCategory).forEach(([cat, issues]) => {
      roadmap += `#### ${cat} (${issues.length})\n\n`;
      issues.forEach(issue => {
        roadmap += `- [ ] ${issue.title}\n`;
        roadmap += `  - Files: ${issue.metadata.affectedFiles.join(', ')}\n`;
      });
      roadmap += `\n`;
    });
  }
  
  if (severities.Medium.length > 0) {
    roadmap += `### 🎯 Sprint 2: Medium Priority (UX Polish - Sprint 2)\n\n`;
    roadmap += `**Due Date:** ${getSprintDueDate(2)}\n\n`;
    roadmap += `**Focus Areas:**\n`;
    roadmap += `- Accessibility enhancements (focus states, headings)\n`;
    roadmap += `- Design token migration (replace hardcoded colors)\n`;
    roadmap += `- Visual hierarchy and consistency improvements\n\n`;
    roadmap += `**Issues (${severities.Medium.length}):**\n\n`;
    
    const medByCategory = {};
    severities.Medium.forEach(issue => {
      const cat = issue.metadata.category;
      if (!medByCategory[cat]) medByCategory[cat] = [];
      medByCategory[cat].push(issue);
    });
    
    Object.entries(medByCategory).forEach(([cat, issues]) => {
      roadmap += `#### ${cat} (${issues.length})\n\n`;
      issues.forEach(issue => {
        roadmap += `- [ ] ${issue.title}\n`;
        roadmap += `  - Files: ${issue.metadata.affectedFiles.join(', ')}\n`;
      });
      roadmap += `\n`;
    });
  }
  
  // Project board recommendations
  roadmap += `## Project Board Recommendations\n\n`;
  roadmap += `### Column Structure\n\n`;
  roadmap += `1. **📋 Todo** - All issues start here\n`;
  roadmap += `2. **🏗️ In Progress** - Issues actively being worked on\n`;
  roadmap += `3. **👀 Review** - PRs submitted, awaiting review\n`;
  roadmap += `4. **✅ Done** - Completed and merged\n\n`;
  
  roadmap += `### Initial Assignment Strategy\n\n`;
  roadmap += `**Sprint 1 (High Priority):**\n`;
  roadmap += `- Assign responsive issues to frontend specialist\n`;
  roadmap += `- Assign accessibility issues to a11y champion\n`;
  roadmap += `- Target: Complete within 2 weeks\n\n`;
  
  roadmap += `**Sprint 2 (Medium Priority):**\n`;
  roadmap += `- Start after Sprint 1 completion\n`;
  roadmap += `- Can run in parallel if team capacity allows\n`;
  roadmap += `- Focus on design consistency and polish\n\n`;
  
  // Sequencing recommendations
  roadmap += `## Sequencing Recommendations\n\n`;
  roadmap += `### Phase 1: Foundation (Sprint 1)\n`;
  roadmap += `Priority order within sprint:\n\n`;
  roadmap += `1. **Responsive fixes** - Highest user impact, affects mobile experience\n`;
  roadmap += `2. **Critical accessibility** - Legal/compliance requirements\n`;
  roadmap += `3. **High-impact visual issues** - User-facing polish\n\n`;
  
  roadmap += `### Phase 2: Enhancement (Sprint 2)\n`;
  roadmap += `Priority order within sprint:\n\n`;
  roadmap += `1. **Focus states** - Complete accessibility baseline\n`;
  roadmap += `2. **Design tokens** - Enable consistent theming\n`;
  roadmap += `3. **Visual hierarchy** - Improve overall UX polish\n\n`;
  
  // Labels and owners
  roadmap += `## Labels and Owners\n\n`;
  roadmap += `### Recommended Labels\n`;
  roadmap += `- \`ux-audit\` - All issues from this audit\n`;
  roadmap += `- \`high priority\` / \`medium priority\` / \`low priority\` - Severity-based\n`;
  roadmap += `- \`accessibility\` - A11y issues\n`;
  roadmap += `- \`responsive\` - Mobile/tablet issues\n`;
  roadmap += `- \`design-tokens\` - Color, spacing, hierarchy issues\n\n`;
  
  roadmap += `### Suggested Owners\n`;
  roadmap += `- **Accessibility issues:** Assign to team member with a11y expertise\n`;
  roadmap += `- **Responsive issues:** Assign to frontend/CSS specialist\n`;
  roadmap += `- **Design token issues:** Coordinate with design system owner\n\n`;
  
  // Success criteria
  roadmap += `## Success Criteria\n\n`;
  roadmap += `- [ ] All High priority issues resolved in Sprint 1\n`;
  roadmap += `- [ ] All Medium priority issues resolved in Sprint 2\n`;
  roadmap += `- [ ] Re-run UX audit shows improvement in scores\n`;
  roadmap += `- [ ] Lighthouse accessibility score improves\n`;
  roadmap += `- [ ] Mobile responsiveness validated on real devices\n`;
  roadmap += `- [ ] Design token adoption reaches 90%+\n\n`;
  
  return roadmap;
}

// Create GitHub milestone
async function createGitHubMilestone(milestone) {
  if (options.dryRun) {
    console.log('\n📝 [DRY RUN] Would create milestone:');
    console.log(`   Title: ${milestone.title}`);
    console.log(`   Due: ${milestone.dueDate}`);
    return { success: true, dryRun: true };
  }

  try {
    const args = [
      'api', 'repos/:owner/:repo/milestones',
      '--method', 'POST',
      '-f', `title=${milestone.title}`,
      '-f', `description=${milestone.description}`,
      '-f', `due_on=${milestone.dueDate}T23:59:59Z`,
      '-f', `state=${milestone.state}`
    ];
    
    const result = spawnSync('gh', args, {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    if (result.error) {
      throw result.error;
    }
    
    if (result.status !== 0) {
      throw new Error(result.stderr || 'gh command failed');
    }
    
    const milestoneData = JSON.parse(result.stdout);
    console.log(`✅ Created milestone: ${milestone.title} (#${milestoneData.number})`);
    
    return { success: true, number: milestoneData.number, url: milestoneData.html_url };
  } catch (error) {
    console.error(`❌ Failed to create milestone: ${milestone.title}`);
    console.error(`   Error: ${error.message}`);
    return { success: false, error: error.message };
  }
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
  
  // Generate roadmap summary
  console.log('\n📊 Generating roadmap summary...');
  const roadmapContent = generateRoadmapSummary(issuePayloads);
  const roadmapPath = path.join(rootDir, options.roadmap);
  fs.writeFileSync(roadmapPath, roadmapContent);
  console.log(`💾 Saved roadmap to: ${options.roadmap}`);
  
  // Generate milestones
  const milestones = generateMilestones(issuePayloads);
  console.log(`\n📌 Generated ${milestones.length} milestone definitions`);
  
  // Create GitHub milestones if requested
  if (options.createMilestones) {
    console.log('\n🚀 Creating GitHub milestones...');
    
    // Check if gh CLI is available
    try {
      execSync('gh --version', { stdio: 'ignore' });
    } catch {
      console.error('❌ GitHub CLI (gh) not found. Install from: https://cli.github.com/');
      process.exit(1);
    }
    
    for (const milestone of milestones) {
      const result = await createGitHubMilestone(milestone);
      if (!result.dryRun) {
        await sleep(options.delay);
      }
    }
    
    if (options.dryRun) {
      console.log('\n💡 This was a dry run. Use --create-milestones without --dry-run to actually create milestones.');
    }
  } else {
    console.log('\n💡 To create milestones in GitHub, run:');
    console.log(`   node scripts/ux-audit-to-issues.mjs --create-milestones`);
    console.log('\n   Milestones will be:');
    milestones.forEach(m => {
      console.log(`   - ${m.title} (${m.issues} issues, due ${m.dueDate})`);
    });
  }
  
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
  
  console.log('\n\n📚 Generated Artifacts:');
  console.log(`   - Issue payloads: ${options.output}`);
  console.log(`   - Roadmap summary: ${options.roadmap}`);
  console.log(`   - Milestones: ${milestones.length} definitions`);
  
  console.log('\n✨ Done!\n');
}

// Run main function
main().catch(error => {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
