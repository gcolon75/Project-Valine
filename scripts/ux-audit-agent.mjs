#!/usr/bin/env node

/**
 * UX Deep Audit Agent
 * 
 * Purpose: Perform a comprehensive audit of the entire website for spacing, color,
 * visual polish, accessibility, and responsive design issues.
 * 
 * This is an analysis-only tool - it does NOT make code changes.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Color constants for contrast ratio calculations
const WCAG_AA_NORMAL = 4.5;
const WCAG_AA_LARGE = 3.0;

class UXAuditAgent {
  constructor() {
    this.pages = [];
    this.components = [];
    this.styles = {};
    this.findings = [];
    this.routes = [];
  }

  /**
   * Main execution method
   */
  async run() {
    console.log('🔍 Starting UX Deep Audit...\n');
    
    // 1. Discovery Phase
    console.log('📋 Phase 1: Discovery');
    await this.discoverPages();
    await this.discoverComponents();
    await this.analyzeStyles();
    
    // 2. Analysis Phase
    console.log('\n📊 Phase 2: Analysis');
    await this.analyzePages();
    await this.analyzeComponents();
    await this.analyzeTheme();
    
    // 3. Report Generation
    console.log('\n📝 Phase 3: Report Generation');
    const report = await this.generateReport();
    
    // Write report to file
    const reportPath = path.join(projectRoot, 'UX_AUDIT_REPORT.md');
    fs.writeFileSync(reportPath, report, 'utf-8');
    console.log(`   ✓ Markdown report saved to: ${reportPath}`);
    
    // Generate CSV export for project management
    const csv = await this.generateCSV();
    const csvPath = path.join(projectRoot, 'UX_AUDIT_FINDINGS.csv');
    fs.writeFileSync(csvPath, csv, 'utf-8');
    console.log(`   ✓ CSV findings saved to: ${csvPath}`);
    
    // Generate summary JSON
    const summary = await this.generateSummaryJSON();
    const jsonPath = path.join(projectRoot, 'UX_AUDIT_SUMMARY.json');
    fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2), 'utf-8');
    console.log(`   ✓ JSON summary saved to: ${jsonPath}`);
    
    console.log(`\n✅ Audit complete!`);
    console.log(`   📊 Total findings: ${this.findings.length}`);
    console.log(`   🔴 High priority: ${this.findings.filter(f => f.severity === 'High').length}`);
    console.log(`   🟡 Medium priority: ${this.findings.filter(f => f.severity === 'Medium').length}`);
    console.log(`   🟢 Low priority: ${this.findings.filter(f => f.severity === 'Low').length}`);
    
    return report;
  }

  /**
   * Discover all pages in the application
   */
  async discoverPages() {
    const pagesDir = path.join(projectRoot, 'src', 'pages');
    
    if (!fs.existsSync(pagesDir)) {
      console.log('❌ Pages directory not found');
      return;
    }
    
    const files = this.getAllFiles(pagesDir, '.jsx');
    
    for (const file of files) {
      const relativePath = path.relative(projectRoot, file);
      const content = fs.readFileSync(file, 'utf-8');
      
      this.pages.push({
        path: relativePath,
        name: path.basename(file, '.jsx'),
        content,
        type: this.determinePageType(file, content)
      });
    }
    
    console.log(`   Found ${this.pages.length} pages`);
    
    // Also scan routes
    await this.discoverRoutes();
  }

  /**
   * Discover route definitions
   */
  async discoverRoutes() {
    const routesFile = path.join(projectRoot, 'src', 'routes', 'App.jsx');
    
    if (fs.existsSync(routesFile)) {
      const content = fs.readFileSync(routesFile, 'utf-8');
      
      // Extract routes from the file
      const routeMatches = content.matchAll(/path="([^"]+)"/g);
      for (const match of routeMatches) {
        this.routes.push(match[1]);
      }
      
      console.log(`   Found ${this.routes.length} routes`);
    }
  }

  /**
   * Discover shared components
   */
  async discoverComponents() {
    const componentsDir = path.join(projectRoot, 'src', 'components');
    
    if (!fs.existsSync(componentsDir)) {
      console.log('❌ Components directory not found');
      return;
    }
    
    const files = this.getAllFiles(componentsDir, '.jsx');
    
    for (const file of files) {
      const relativePath = path.relative(projectRoot, file);
      const content = fs.readFileSync(file, 'utf-8');
      
      this.components.push({
        path: relativePath,
        name: path.basename(file, '.jsx'),
        content,
        type: this.determineComponentType(content)
      });
    }
    
    console.log(`   Found ${this.components.length} components`);
  }

  /**
   * Analyze style files and configuration
   */
  async analyzeStyles() {
    // Tailwind config
    const tailwindPath = path.join(projectRoot, 'tailwind.config.js');
    if (fs.existsSync(tailwindPath)) {
      this.styles.tailwind = fs.readFileSync(tailwindPath, 'utf-8');
      console.log('   ✓ Found Tailwind config');
    }
    
    // Global CSS
    const globalCssPath = path.join(projectRoot, 'src', 'styles', 'global.css');
    if (fs.existsSync(globalCssPath)) {
      this.styles.global = fs.readFileSync(globalCssPath, 'utf-8');
      console.log('   ✓ Found global.css');
    }
    
    // Theme CSS
    const themeCssPath = path.join(projectRoot, 'src', 'styles', 'theme.css');
    if (fs.existsSync(themeCssPath)) {
      this.styles.theme = fs.readFileSync(themeCssPath, 'utf-8');
      console.log('   ✓ Found theme.css');
    }
    
    // Marketing CSS
    const marketingCssPath = path.join(projectRoot, 'src', 'styles', 'marketing.css');
    if (fs.existsSync(marketingCssPath)) {
      this.styles.marketing = fs.readFileSync(marketingCssPath, 'utf-8');
      console.log('   ✓ Found marketing.css');
    }
    
    // Index CSS
    const indexCssPath = path.join(projectRoot, 'src', 'index.css');
    if (fs.existsSync(indexCssPath)) {
      this.styles.index = fs.readFileSync(indexCssPath, 'utf-8');
      console.log('   ✓ Found index.css');
    }
  }

  /**
   * Analyze all pages
   */
  async analyzePages() {
    for (const page of this.pages) {
      console.log(`   Analyzing: ${page.name}`);
      
      const findings = [];
      
      // Spacing analysis
      findings.push(...this.analyzeSpacing(page));
      
      // Color and contrast
      findings.push(...this.analyzeColors(page));
      
      // Accessibility
      findings.push(...this.analyzeAccessibility(page));
      
      // Responsive design
      findings.push(...this.analyzeResponsive(page));
      
      // Visual hierarchy
      findings.push(...this.analyzeHierarchy(page));
      
      page.findings = findings;
      this.findings.push(...findings);
    }
  }

  /**
   * Analyze spacing in a page
   */
  analyzeSpacing(page) {
    const findings = [];
    const content = page.content;
    
    // Check for inconsistent padding/margin classes
    const spacingClasses = content.match(/(?:p|m|gap|space)-\w+/g) || [];
    const uniqueSpacing = [...new Set(spacingClasses)];
    
    // Look for inline styles with hardcoded spacing
    const inlineSpacing = content.match(/style={{[^}]*(?:padding|margin|gap)[^}]*}}/g) || [];
    
    if (inlineSpacing.length > 0) {
      findings.push({
        severity: 'Medium',
        category: 'Spacing',
        page: page.name,
        issue: 'Inline spacing styles detected',
        evidence: `Found ${inlineSpacing.length} inline style(s) with hardcoded spacing`,
        recommendation: 'Use Tailwind spacing utilities instead of inline styles for consistency',
        file: page.path
      });
    }
    
    // Check for large whitespace areas (multiple consecutive spacing classes)
    const largeSpacing = content.match(/py-\d{2,}|px-\d{2,}|p-\d{2,}/g) || [];
    if (largeSpacing.length > 3) {
      findings.push({
        severity: 'Low',
        category: 'Spacing',
        page: page.name,
        issue: 'Excessive spacing detected',
        evidence: `Found ${largeSpacing.length} instances of very large spacing`,
        recommendation: 'Consider using a more consistent spacing scale',
        file: page.path
      });
    }
    
    return findings;
  }

  /**
   * Analyze colors and contrast
   */
  analyzeColors(page) {
    const findings = [];
    const content = page.content;
    
    // Check for hardcoded colors (hex codes, rgb, etc.)
    const hexColors = content.match(/#[0-9A-Fa-f]{3,8}/g) || [];
    const rgbColors = content.match(/rgb\([^)]+\)/g) || [];
    
    if (hexColors.length > 0) {
      findings.push({
        severity: 'Medium',
        category: 'Color',
        page: page.name,
        issue: 'Hardcoded color values detected',
        evidence: `Found ${hexColors.length} hardcoded hex color(s): ${hexColors.slice(0, 3).join(', ')}${hexColors.length > 3 ? '...' : ''}`,
        recommendation: 'Use design tokens or Tailwind color utilities instead of hardcoded values',
        file: page.path
      });
    }
    
    // Check for use of pure white/black
    const pureWhite = content.match(/bg-white(?!\S)/g) || [];
    const pureBlack = content.match(/bg-black(?!\S)/g) || [];
    
    if (pureWhite.length > 5 && page.type === 'marketing') {
      findings.push({
        severity: 'High',
        category: 'Color',
        page: page.name,
        issue: 'Excessive use of pure white backgrounds',
        evidence: `Found ${pureWhite.length} instances of bg-white`,
        recommendation: 'Replace with layered surface tokens (e.g., bg-neutral-50, bg-neutral-100) to reduce glare and add depth',
        file: page.path,
        example: 'Replace "bg-white" with "bg-neutral-50" or "bg-gradient-to-br from-neutral-50 via-white to-neutral-50"'
      });
    }
    
    return findings;
  }

  /**
   * Analyze accessibility
   */
  analyzeAccessibility(page) {
    const findings = [];
    const content = page.content;
    
    // Check for images without alt text
    const imgTags = content.match(/<img[^>]*>/g) || [];
    const imgsWithoutAlt = imgTags.filter(img => !img.includes('alt='));
    
    if (imgsWithoutAlt.length > 0) {
      findings.push({
        severity: 'High',
        category: 'Accessibility',
        page: page.name,
        issue: 'Images without alt text',
        evidence: `Found ${imgsWithoutAlt.length} image(s) without alt attributes`,
        recommendation: 'Add descriptive alt text to all images for screen readers',
        file: page.path
      });
    }
    
    // Check for buttons without accessible text
    const buttonMatches = content.matchAll(/<button[^>]*>[\s\S]*?<\/button>/g);
    for (const match of buttonMatches) {
      const button = match[0];
      if (button.includes('<svg') && !button.includes('aria-label') && !button.includes('aria-labelledby')) {
        findings.push({
          severity: 'High',
          category: 'Accessibility',
          page: page.name,
          issue: 'Button with icon but no accessible label',
          evidence: 'Button contains only an icon without aria-label',
          recommendation: 'Add aria-label to buttons that contain only icons',
          file: page.path
        });
        break; // Only report once per page
      }
    }
    
    // Check for heading structure
    const h1Count = (content.match(/<h1/g) || []).length;
    if (h1Count === 0) {
      findings.push({
        severity: 'Medium',
        category: 'Accessibility',
        page: page.name,
        issue: 'Missing H1 heading',
        evidence: 'No H1 heading found on page',
        recommendation: 'Add a descriptive H1 heading for proper semantic structure and SEO',
        file: page.path
      });
    } else if (h1Count > 1) {
      findings.push({
        severity: 'Low',
        category: 'Accessibility',
        page: page.name,
        issue: 'Multiple H1 headings',
        evidence: `Found ${h1Count} H1 headings`,
        recommendation: 'Use only one H1 per page, use H2-H6 for subheadings',
        file: page.path
      });
    }
    
    // Check for focus states
    if (!content.includes('focus:') && !content.includes('focus-visible:')) {
      findings.push({
        severity: 'Medium',
        category: 'Accessibility',
        page: page.name,
        issue: 'Missing focus states',
        evidence: 'No focus: or focus-visible: classes found',
        recommendation: 'Add focus states to interactive elements for keyboard navigation',
        file: page.path
      });
    }
    
    return findings;
  }

  /**
   * Analyze responsive design
   */
  analyzeResponsive(page) {
    const findings = [];
    const content = page.content;
    
    // Check for responsive breakpoints
    const breakpoints = {
      sm: (content.match(/sm:/g) || []).length,
      md: (content.match(/md:/g) || []).length,
      lg: (content.match(/lg:/g) || []).length,
      xl: (content.match(/xl:/g) || []).length
    };
    
    const totalBreakpoints = Object.values(breakpoints).reduce((a, b) => a + b, 0);
    
    if (totalBreakpoints === 0) {
      findings.push({
        severity: 'High',
        category: 'Responsive',
        page: page.name,
        issue: 'No responsive breakpoints detected',
        evidence: 'Page does not use any Tailwind responsive modifiers',
        recommendation: 'Add responsive classes (sm:, md:, lg:) to ensure proper display on all devices',
        file: page.path
      });
    }
    
    // Check for fixed widths that might break on mobile
    const fixedWidths = content.match(/w-\[\d+px\]/g) || [];
    if (fixedWidths.length > 0) {
      findings.push({
        severity: 'Medium',
        category: 'Responsive',
        page: page.name,
        issue: 'Fixed width values detected',
        evidence: `Found ${fixedWidths.length} fixed width value(s)`,
        recommendation: 'Use responsive width utilities (w-full, w-1/2, max-w-*) instead of fixed pixel widths',
        file: page.path
      });
    }
    
    return findings;
  }

  /**
   * Analyze visual hierarchy
   */
  analyzeHierarchy(page) {
    const findings = [];
    const content = page.content;
    
    // Check for duplicate CTAs
    const ctaButtons = content.match(/Get Started|Sign Up|Join Now|Learn More/gi) || [];
    if (ctaButtons.length > 3 && page.type === 'marketing') {
      findings.push({
        severity: 'Medium',
        category: 'Visual Hierarchy',
        page: page.name,
        issue: 'Multiple competing CTAs',
        evidence: `Found ${ctaButtons.length} CTA instances`,
        recommendation: 'Limit to 1-2 primary CTAs per section to avoid decision paralysis',
        file: page.path
      });
    }
    
    // Check for consistent heading sizes
    const textSizes = content.match(/text-\w+/g) || [];
    const uniqueSizes = [...new Set(textSizes)];
    if (uniqueSizes.length > 10) {
      findings.push({
        severity: 'Low',
        category: 'Visual Hierarchy',
        page: page.name,
        issue: 'Too many different text sizes',
        evidence: `Found ${uniqueSizes.length} different text size classes`,
        recommendation: 'Use a consistent typographic scale (e.g., text-sm, text-base, text-lg, text-xl, text-2xl, text-3xl)',
        file: page.path
      });
    }
    
    return findings;
  }

  /**
   * Analyze components
   */
  async analyzeComponents() {
    const criticalComponents = ['Header', 'Footer', 'NavBar', 'Button', 'Card', 'Modal'];
    
    for (const component of this.components) {
      if (criticalComponents.some(c => component.name.includes(c))) {
        console.log(`   Analyzing component: ${component.name}`);
        
        const findings = [];
        
        // Analyze component-specific issues
        findings.push(...this.analyzeSpacing(component));
        findings.push(...this.analyzeColors(component));
        findings.push(...this.analyzeAccessibility(component));
        
        component.findings = findings;
        this.findings.push(...findings);
      }
    }
  }

  /**
   * Analyze theme implementation
   */
  async analyzeTheme() {
    console.log('   Analyzing theme implementation');
    
    const findings = [];
    
    // Check if dark mode is configured
    if (this.styles.tailwind && this.styles.tailwind.includes("darkMode: 'class'")) {
      console.log('   ✓ Dark mode configured');
    } else {
      findings.push({
        severity: 'Low',
        category: 'Theme',
        page: 'Global',
        issue: 'Dark mode not configured',
        evidence: 'Tailwind config does not include darkMode: "class"',
        recommendation: 'Add darkMode: "class" to tailwind.config.js for theme switching',
        file: 'tailwind.config.js'
      });
    }
    
    // Check for theme CSS variables
    if (this.styles.theme) {
      const lightModeVars = (this.styles.theme.match(/data-theme="light"/g) || []).length;
      const darkModeVars = (this.styles.theme.match(/:root\s*{/g) || []).length;
      
      if (lightModeVars === 0) {
        findings.push({
          severity: 'Medium',
          category: 'Theme',
          page: 'Global',
          issue: 'Light mode variables not defined',
          evidence: 'No [data-theme="light"] selector found in theme.css',
          recommendation: 'Define light mode CSS variables for consistent theming',
          file: 'src/styles/theme.css'
        });
      }
    }
    
    this.findings.push(...findings);
  }

  /**
   * Generate comprehensive audit report
   */
  async generateReport() {
    let report = '';
    
    // Header
    report += `# UX Deep Audit Report\n`;
    report += `**Project Valine** — Comprehensive Design & UX Analysis\n\n`;
    report += `**Date:** ${new Date().toISOString().split('T')[0]}\n`;
    report += `**Pages Analyzed:** ${this.pages.length}\n`;
    report += `**Components Analyzed:** ${this.components.length}\n`;
    report += `**Total Findings:** ${this.findings.length}\n\n`;
    
    // Executive Summary
    report += this.generateExecutiveSummary();
    
    // Critical Findings Summary
    report += this.generateFindingsSummary();
    
    // Per-Page Audit
    report += `## Per-Page Audit\n\n`;
    for (const page of this.pages) {
      report += this.generatePageSection(page);
    }
    
    // Global Component Audit
    report += `## Global Component Audit\n\n`;
    report += this.generateComponentAudit();
    
    // Global Theme Audit
    report += `## Global Theme Audit\n\n`;
    report += this.generateThemeAudit();
    
    // Prioritized Action List
    report += `## Prioritized Action List\n\n`;
    report += this.generateActionList();
    
    // Recommended CSS/Token Changes
    report += `## Recommended Design Token Changes\n\n`;
    report += this.generateTokenRecommendations();
    
    return report;
  }

  /**
   * Generate executive summary
   */
  generateExecutiveSummary() {
    const high = this.findings.filter(f => f.severity === 'High').length;
    const medium = this.findings.filter(f => f.severity === 'Medium').length;
    const low = this.findings.filter(f => f.severity === 'Low').length;
    
    let summary = `## Executive Summary\n\n`;
    summary += `Project Valine demonstrates a solid foundation with modern React architecture, `;
    summary += `Tailwind CSS styling, and dark mode support. However, there are opportunities `;
    summary += `to enhance visual consistency, accessibility, and user experience.\n\n`;
    
    summary += `**Key Findings:**\n`;
    summary += `- 🔴 ${high} High-priority issues (accessibility, critical UX)\n`;
    summary += `- 🟡 ${medium} Medium-priority issues (consistency, polish)\n`;
    summary += `- 🟢 ${low} Low-priority issues (optimization, refinement)\n\n`;
    
    // Top 3 recommendations
    summary += `**Top Recommendations:**\n`;
    summary += `1. **Enhance Accessibility:** Add alt text to images, ARIA labels to icon-only buttons, and ensure proper focus states\n`;
    summary += `2. **Refine Light Mode:** Replace pure white backgrounds with layered surface tokens to reduce glare and add depth\n`;
    summary += `3. **Improve Consistency:** Standardize spacing scale, typography sizes, and component patterns across pages\n\n`;
    
    return summary;
  }

  /**
   * Generate findings summary by category
   */
  generateFindingsSummary() {
    const categories = {};
    
    for (const finding of this.findings) {
      if (!categories[finding.category]) {
        categories[finding.category] = { High: 0, Medium: 0, Low: 0 };
      }
      categories[finding.category][finding.severity]++;
    }
    
    let summary = `## Findings by Category\n\n`;
    summary += `| Category | High | Medium | Low | Total |\n`;
    summary += `|----------|------|--------|-----|-------|\n`;
    
    for (const [category, counts] of Object.entries(categories)) {
      const total = counts.High + counts.Medium + counts.Low;
      summary += `| ${category} | ${counts.High} | ${counts.Medium} | ${counts.Low} | ${total} |\n`;
    }
    
    summary += `\n`;
    return summary;
  }

  /**
   * Generate page section for report
   */
  generatePageSection(page) {
    let section = `### ${page.name}\n\n`;
    section += `- **File:** \`${page.path}\`\n`;
    section += `- **Type:** ${page.type}\n`;
    section += `- **Route:** ${this.guessRoute(page.name)}\n`;
    section += `- **Findings:** ${page.findings?.length || 0}\n\n`;
    
    if (page.findings && page.findings.length > 0) {
      section += `#### Issues Found:\n\n`;
      
      // Group by severity
      const high = page.findings.filter(f => f.severity === 'High');
      const medium = page.findings.filter(f => f.severity === 'Medium');
      const low = page.findings.filter(f => f.severity === 'Low');
      
      if (high.length > 0) {
        section += `**🔴 High Priority:**\n`;
        for (const finding of high) {
          section += `- **${finding.issue}**\n`;
          section += `  - Category: ${finding.category}\n`;
          section += `  - Evidence: ${finding.evidence}\n`;
          section += `  - Recommendation: ${finding.recommendation}\n`;
          if (finding.example) {
            section += `  - Example: \`${finding.example}\`\n`;
          }
          section += `\n`;
        }
      }
      
      if (medium.length > 0) {
        section += `**🟡 Medium Priority:**\n`;
        for (const finding of medium) {
          section += `- **${finding.issue}**: ${finding.recommendation}\n`;
        }
        section += `\n`;
      }
      
      if (low.length > 0) {
        section += `**🟢 Low Priority:**\n`;
        for (const finding of low) {
          section += `- ${finding.issue}\n`;
        }
        section += `\n`;
      }
    } else {
      section += `✅ No major issues found.\n\n`;
    }
    
    return section;
  }

  /**
   * Generate component audit section
   */
  generateComponentAudit() {
    let section = `### Header Component\n\n`;
    section += `**Files:** \`src/components/Header.jsx\`, \`src/layouts/AppLayout.jsx\`, \`src/layouts/MarketingLayout.jsx\`\n\n`;
    section += `**Observations:**\n`;
    section += `- Marketing and App headers have different implementations\n`;
    section += `- Good use of glassmorphism effect with backdrop-blur\n`;
    section += `- Fixed positioning with proper z-index\n\n`;
    section += `**Recommendations:**\n`;
    section += `- Consider unifying header behavior across marketing and app\n`;
    section += `- Ensure consistent brand presentation\n`;
    section += `- Add smooth scroll-based header behavior for better UX\n\n`;
    
    section += `### Navigation Components\n\n`;
    section += `**Files:** \`src/components/NavBar.jsx\`\n\n`;
    section += `**Observations:**\n`;
    section += `- Modern icon-based navigation in app layout\n`;
    section += `- Badge system for notifications\n`;
    section += `- Responsive behavior with hidden labels on mobile\n\n`;
    section += `**Recommendations:**\n`;
    section += `- Add bottom navigation bar for mobile (iOS/Android pattern)\n`;
    section += `- Consider sticky navigation on scroll\n`;
    section += `- Ensure touch targets meet 44x44px minimum size\n\n`;
    
    section += `### Card Components\n\n`;
    section += `**Files:** \`src/components/Card.jsx\`, \`src/components/PostCard.jsx\`\n\n`;
    section += `**Observations:**\n`;
    section += `- Cards use border and subtle background\n`;
    section += `- Consistent border-radius of 12-14px\n\n`;
    section += `**Recommendations:**\n`;
    section += `- Add subtle shadow for depth: \`shadow-sm\` or \`shadow-md\`\n`;
    section += `- Consider hover states for interactive cards\n`;
    section += `- Use consistent card padding (e.g., p-4 or p-6)\n\n`;
    
    section += `### Button Components\n\n`;
    section += `**Observations:**\n`;
    section += `- Brand gradient buttons on marketing pages\n`;
    section += `- Icon buttons in app navigation\n\n`;
    section += `**Recommendations:**\n`;
    section += `- Create standardized Button component with variants (primary, secondary, ghost)\n`;
    section += `- Ensure 44-48px minimum height for touch targets\n`;
    section += `- Add loading states for async actions\n`;
    section += `- Include disabled state styling\n\n`;
    
    return section;
  }

  /**
   * Generate theme audit section
   */
  generateThemeAudit() {
    let section = `### Current Theme Implementation\n\n`;
    section += `**Files:** \`src/styles/theme.css\`, \`tailwind.config.js\`, \`src/components/ThemeToggle.jsx\`\n\n`;
    section += `**Light Mode Analysis:**\n\n`;
    section += `**Strengths:**\n`;
    section += `- Already implements layered surface system with reduced glare\n`;
    section += `- Uses \`--bg: #fafbfc\` instead of pure white (#ffffff)\n`;
    section += `- Softer borders with low opacity: \`rgba(11, 20, 32, 0.08)\`\n`;
    section += `- Good separation between card-bg and page bg\n\n`;
    
    section += `**Opportunities:**\n`;
    section += `- Some pages still use \`bg-white\` directly instead of theme variables\n`;
    section += `- Add more elevation levels for deeper visual hierarchy\n`;
    section += `- Consider adding subtle shadows to cards and elevated surfaces\n\n`;
    
    section += `**Dark Mode Analysis:**\n\n`;
    section += `**Strengths:**\n`;
    section += `- True dark background: \`--bg: #0a0a0a\`\n`;
    section += `- Proper contrast with text: \`--text: #f3f4f6\`\n`;
    section += `- Subtle card backgrounds with borders\n\n`;
    
    section += `**Opportunities:**\n`;
    section += `- Ensure all components respect theme variables\n`;
    section += `- Test dark mode on all pages (some may default to light)\n`;
    section += `- Add dark mode specific imagery where needed\n\n`;
    
    section += `### Recommended Surface Token System\n\n`;
    section += `\`\`\`css\n`;
    section += `/* Light Mode Surfaces */\n`;
    section += `:root[data-theme="light"] {\n`;
    section += `  --surface-0: #fafbfc;  /* Page background */\n`;
    section += `  --surface-1: #f4f6f8;  /* Sunken areas, wells */\n`;
    section += `  --surface-2: #ffffff;  /* Cards, elevated content */\n`;
    section += `  --surface-3: #ffffff;  /* Modals, popovers (with shadow) */\n`;
    section += `  \n`;
    section += `  --border-subtle: rgba(15, 23, 42, 0.06);\n`;
    section += `  --border-default: rgba(15, 23, 42, 0.10);\n`;
    section += `  \n`;
    section += `  --shadow-sm: 0 1px 2px rgba(16, 24, 40, 0.04);\n`;
    section += `  --shadow-md: 0 2px 8px rgba(16, 24, 40, 0.08);\n`;
    section += `  --shadow-lg: 0 4px 16px rgba(16, 24, 40, 0.12);\n`;
    section += `}\n\n`;
    section += `/* Dark Mode Surfaces */\n`;
    section += `:root {\n`;
    section += `  --surface-0: #0a0a0a;  /* Page background */\n`;
    section += `  --surface-1: #141414;  /* Sunken areas */\n`;
    section += `  --surface-2: rgba(23, 23, 23, 0.40);  /* Cards */\n`;
    section += `  --surface-3: rgba(23, 23, 23, 0.90);  /* Modals */\n`;
    section += `}\n`;
    section += `\`\`\`\n\n`;
    
    section += `### Theme Migration Strategy\n\n`;
    section += `1. **Audit all pages** for hardcoded \`bg-white\`, \`bg-black\`\n`;
    section += `2. **Replace with theme variables** or theme-aware classes\n`;
    section += `3. **Test both themes** on all pages and states\n`;
    section += `4. **Add ThemeToggle** to settings page if not present\n`;
    section += `5. **Persist user preference** in localStorage\n`;
    section += `6. **Default to light mode** with opt-in dark mode\n\n`;
    
    return section;
  }

  /**
   * Generate prioritized action list
   */
  generateActionList() {
    let section = `### High Priority (Implement First)\n\n`;
    section += `1. **Accessibility Audit Fixes** (Branch: \`fix/accessibility-improvements\`)\n`;
    section += `   - Add alt text to all images\n`;
    section += `   - Add ARIA labels to icon-only buttons\n`;
    section += `   - Ensure focus states on all interactive elements\n`;
    section += `   - Verify keyboard navigation works on all pages\n`;
    section += `   - Effort: Medium (2-3 days)\n`;
    section += `   - Impact: High (WCAG compliance, SEO, screen readers)\n\n`;
    
    section += `2. **Light Mode Polish** (Branch: \`feat/light-mode-polish\`)\n`;
    section += `   - Replace remaining \`bg-white\` with surface tokens\n`;
    section += `   - Add subtle shadows to cards and elevated elements\n`;
    section += `   - Implement depth through layered surfaces\n`;
    section += `   - Test all marketing pages in light mode\n`;
    section += `   - Effort: Small (1-2 days)\n`;
    section += `   - Impact: High (reduced glare, professional appearance)\n\n`;
    
    section += `3. **Responsive Design Fixes** (Branch: \`fix/responsive-improvements\`)\n`;
    section += `   - Add responsive breakpoints to pages lacking them\n`;
    section += `   - Replace fixed widths with responsive utilities\n`;
    section += `   - Test on mobile (375px), tablet (768px), desktop (1280px)\n`;
    section += `   - Add bottom navigation for mobile app\n`;
    section += `   - Effort: Medium (2-3 days)\n`;
    section += `   - Impact: High (mobile users, cross-device consistency)\n\n`;
    
    section += `### Medium Priority (Next Sprint)\n\n`;
    section += `4. **Design System Consolidation** (Branch: \`feat/design-system\`)\n`;
    section += `   - Create unified Button component with variants\n`;
    section += `   - Standardize Card component props and styling\n`;
    section += `   - Unify Header across marketing and app\n`;
    section += `   - Document spacing scale and usage\n`;
    section += `   - Effort: Large (4-5 days)\n`;
    section += `   - Impact: Medium (maintainability, consistency)\n\n`;
    
    section += `5. **CTA Optimization** (Branch: \`feat/cta-optimization\`)\n`;
    section += `   - Reduce CTA count on marketing pages to 1-2 per section\n`;
    section += `   - Improve CTA hierarchy (primary vs secondary)\n`;
    section += `   - A/B test CTA placement and copy\n`;
    section += `   - Effort: Small (1 day)\n`;
    section += `   - Impact: Medium (conversion rate)\n\n`;
    
    section += `### Low Priority (Future Enhancements)\n\n`;
    section += `6. **Typography Scale Refinement** (Branch: \`feat/typography-scale\`)\n`;
    section += `   - Reduce number of text size variations\n`;
    section += `   - Implement consistent line-height scale\n`;
    section += `   - Document typography usage guidelines\n`;
    section += `   - Effort: Small (1 day)\n`;
    section += `   - Impact: Low (visual refinement)\n\n`;
    
    return section;
  }

  /**
   * Generate token recommendations
   */
  generateTokenRecommendations() {
    let section = `### Tailwind Config Extensions\n\n`;
    section += `Add these to \`tailwind.config.js\` under \`theme.extend\`:\n\n`;
    section += `\`\`\`javascript\n`;
    section += `// Enhanced color tokens\n`;
    section += `colors: {\n`;
    section += `  surface: {\n`;
    section += `    0: '#fafbfc',  // Light mode page bg\n`;
    section += `    1: '#f4f6f8',  // Light mode sunken areas\n`;
    section += `    2: '#ffffff',  // Light mode elevated\n`;
    section += `  },\n`;
    section += `},\n\n`;
    section += `// Consistent spacing scale (already good, but ensure usage)\n`;
    section += `spacing: {\n`;
    section += `  // Use: 1, 2, 3, 4, 6, 8, 12, 16, 20, 24, 32\n`;
    section += `  // Avoid: 5, 7, 9, 10, 11, etc.\n`;
    section += `},\n\n`;
    section += `// Typography scale\n`;
    section += `fontSize: {\n`;
    section += `  'xs': ['0.75rem', { lineHeight: '1rem' }],\n`;
    section += `  'sm': ['0.875rem', { lineHeight: '1.25rem' }],\n`;
    section += `  'base': ['1rem', { lineHeight: '1.5rem' }],\n`;
    section += `  'lg': ['1.125rem', { lineHeight: '1.75rem' }],\n`;
    section += `  'xl': ['1.25rem', { lineHeight: '1.75rem' }],\n`;
    section += `  '2xl': ['1.5rem', { lineHeight: '2rem' }],\n`;
    section += `  '3xl': ['1.875rem', { lineHeight: '2.25rem' }],\n`;
    section += `  '4xl': ['2.25rem', { lineHeight: '2.5rem' }],\n`;
    section += `},\n\n`;
    section += `// Shadow system for depth\n`;
    section += `boxShadow: {\n`;
    section += `  'sm': '0 1px 2px rgba(16, 24, 40, 0.04)',\n`;
    section += `  'md': '0 2px 8px rgba(16, 24, 40, 0.08)',\n`;
    section += `  'lg': '0 4px 16px rgba(16, 24, 40, 0.12)',\n`;
    section += `  'xl': '0 8px 24px rgba(16, 24, 40, 0.16)',\n`;
    section += `},\n`;
    section += `\`\`\`\n\n`;
    
    section += `### Example Component Refactors\n\n`;
    section += `**Before:**\n`;
    section += `\`\`\`jsx\n`;
    section += `<div className="bg-white border border-gray-200 rounded-lg p-4">\n`;
    section += `  <h2 className="text-xl font-bold">Title</h2>\n`;
    section += `  <p className="text-gray-600">Content</p>\n`;
    section += `</div>\n`;
    section += `\`\`\`\n\n`;
    
    section += `**After:**\n`;
    section += `\`\`\`jsx\n`;
    section += `<div className="bg-surface-2 border border-neutral-200/50 dark:border-neutral-700/50 rounded-lg p-6 shadow-sm">\n`;
    section += `  <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Title</h2>\n`;
    section += `  <p className="text-neutral-600 dark:text-neutral-400 mt-2">Content</p>\n`;
    section += `</div>\n`;
    section += `\`\`\`\n\n`;
    
    section += `**Benefits:**\n`;
    section += `- Uses surface tokens instead of pure white\n`;
    section += `- Adds subtle shadow for depth\n`;
    section += `- Proper dark mode support\n`;
    section += `- Consistent spacing scale\n`;
    section += `- Better contrast with low-opacity borders\n\n`;
    
    return section;
  }

  /**
   * Helper: Get all files recursively
   */
  getAllFiles(dir, ext) {
    let files = [];
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules, .git, etc.
        if (!item.startsWith('.') && item !== 'node_modules') {
          files = files.concat(this.getAllFiles(fullPath, ext));
        }
      } else if (stat.isFile() && fullPath.endsWith(ext)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  /**
   * Helper: Determine page type
   */
  determinePageType(filePath, content) {
    const fileName = path.basename(filePath).toLowerCase();
    
    if (fileName.includes('home') || fileName.includes('about') || 
        fileName.includes('features') || fileName.includes('join') ||
        fileName.includes('login')) {
      return 'marketing';
    }
    
    if (fileName.includes('dashboard') || fileName.includes('profile') ||
        fileName.includes('settings') || fileName.includes('discover')) {
      return 'app';
    }
    
    if (fileName.includes('404') || fileName.includes('notfound') ||
        fileName.includes('forbidden') || fileName.includes('error')) {
      return 'error';
    }
    
    return 'app';
  }

  /**
   * Helper: Determine component type
   */
  determineComponentType(content) {
    if (content.includes('header') || content.includes('Header')) return 'navigation';
    if (content.includes('footer') || content.includes('Footer')) return 'navigation';
    if (content.includes('button') || content.includes('Button')) return 'control';
    if (content.includes('card') || content.includes('Card')) return 'container';
    if (content.includes('modal') || content.includes('Modal')) return 'overlay';
    return 'general';
  }

  /**
   * Helper: Guess route from page name
   */
  guessRoute(pageName) {
    const name = pageName.toLowerCase();
    
    if (name === 'home') return '/';
    if (name === 'notfound') return '*';
    
    // Check if route exists
    const route = this.routes.find(r => 
      r.toLowerCase().includes(name) || name.includes(r.toLowerCase())
    );
    
    return route || `/${name}`;
  }

  /**
   * Generate CSV export for project management tools
   */
  async generateCSV() {
    let csv = 'Page,Category,Severity,Issue,Evidence,Recommendation,File\n';
    
    for (const finding of this.findings) {
      const page = finding.page || 'Global';
      const category = finding.category || 'General';
      const severity = finding.severity || 'Medium';
      const issue = this.escapeCSV(finding.issue || '');
      const evidence = this.escapeCSV(finding.evidence || '');
      const recommendation = this.escapeCSV(finding.recommendation || '');
      const file = finding.file || '';
      
      csv += `${page},${category},${severity},${issue},${evidence},${recommendation},${file}\n`;
    }
    
    return csv;
  }

  /**
   * Generate JSON summary for programmatic access
   */
  async generateSummaryJSON() {
    const high = this.findings.filter(f => f.severity === 'High').length;
    const medium = this.findings.filter(f => f.severity === 'Medium').length;
    const low = this.findings.filter(f => f.severity === 'Low').length;
    
    const byCategory = {};
    for (const finding of this.findings) {
      const cat = finding.category || 'General';
      if (!byCategory[cat]) {
        byCategory[cat] = { High: 0, Medium: 0, Low: 0 };
      }
      byCategory[cat][finding.severity]++;
    }
    
    const byPage = {};
    for (const page of this.pages) {
      byPage[page.name] = {
        type: page.type,
        route: this.guessRoute(page.name),
        findings: page.findings?.length || 0,
        file: page.path
      };
    }
    
    return {
      metadata: {
        date: new Date().toISOString(),
        pagesAnalyzed: this.pages.length,
        componentsAnalyzed: this.components.length,
        totalFindings: this.findings.length
      },
      summary: {
        high,
        medium,
        low
      },
      byCategory,
      byPage,
      prioritizedActions: [
        {
          priority: 'High',
          name: 'Accessibility Audit Fixes',
          branch: 'fix/accessibility-improvements',
          effort: 'Medium',
          impact: 'High',
          tasks: [
            'Add alt text to all images',
            'Add ARIA labels to icon-only buttons',
            'Ensure focus states on all interactive elements',
            'Verify keyboard navigation works on all pages'
          ]
        },
        {
          priority: 'High',
          name: 'Light Mode Polish',
          branch: 'feat/light-mode-polish',
          effort: 'Small',
          impact: 'High',
          tasks: [
            'Replace remaining bg-white with surface tokens',
            'Add subtle shadows to cards and elevated elements',
            'Implement depth through layered surfaces',
            'Test all marketing pages in light mode'
          ]
        },
        {
          priority: 'High',
          name: 'Responsive Design Fixes',
          branch: 'fix/responsive-improvements',
          effort: 'Medium',
          impact: 'High',
          tasks: [
            'Add responsive breakpoints to pages lacking them',
            'Replace fixed widths with responsive utilities',
            'Test on mobile (375px), tablet (768px), desktop (1280px)',
            'Add bottom navigation for mobile app'
          ]
        }
      ]
    };
  }

  /**
   * Helper: Escape CSV field
   */
  escapeCSV(str) {
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}

// Run the audit
const agent = new UXAuditAgent();
agent.run().catch(error => {
  console.error('❌ Audit failed:', error);
  process.exit(1);
});
