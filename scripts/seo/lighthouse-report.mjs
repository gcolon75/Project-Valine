#!/usr/bin/env node
/**
 * Lighthouse SEO Report - Run Lighthouse audit focused on SEO
 * Outputs: seo-report.json and seo-report.md
 * Requires: Playwright (already in devDependencies)
 */

import { chromium } from '@playwright/test';
import { writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OUTPUT_JSON = join(__dirname, '../../seo-report.json');
const OUTPUT_MD = join(__dirname, '../../seo-report.md');

// Note: Full Lighthouse requires lighthouse npm package
// This is a simplified version that checks key SEO elements using Playwright
// For production, install lighthouse: npm install -D lighthouse

/**
 * Basic SEO audit using Playwright
 * Checks presence of key SEO elements
 */
async function runSEOAudit(url = 'http://localhost:3000') {
  console.log('Running SEO audit...');
  console.log(`Target URL: ${url}`);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle' });

    const audit = {
      url,
      timestamp: new Date().toISOString(),
      checks: {},
      score: 0,
      passed: 0,
      failed: 0,
    };

    // Check title tag
    const title = await page.title();
    audit.checks.titleTag = {
      pass: title && title.length > 0 && title.length <= 60,
      value: title,
      requirement: 'Title exists and <= 60 characters',
    };

    // Check meta description
    const metaDesc = await page.getAttribute('meta[name="description"]', 'content');
    audit.checks.metaDescription = {
      pass: metaDesc && metaDesc.length >= 50 && metaDesc.length <= 160,
      value: metaDesc,
      requirement: 'Description 50-160 characters',
    };

    // Check canonical link
    const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
    audit.checks.canonical = {
      pass: !!canonical,
      value: canonical,
      requirement: 'Canonical link present',
    };

    // Check viewport meta
    const viewport = await page.getAttribute('meta[name="viewport"]', 'content');
    audit.checks.viewport = {
      pass: !!viewport,
      value: viewport,
      requirement: 'Viewport meta tag present',
    };

    // Check Open Graph tags
    const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content');
    const ogDescription = await page.getAttribute('meta[property="og:description"]', 'content');
    const ogImage = await page.getAttribute('meta[property="og:image"]', 'content');
    audit.checks.openGraph = {
      pass: !!(ogTitle && ogDescription && ogImage),
      value: { title: ogTitle, description: ogDescription, image: ogImage },
      requirement: 'OG title, description, and image present',
    };

    // Check Twitter Card tags
    const twitterCard = await page.getAttribute('meta[name="twitter:card"]', 'content');
    const twitterTitle = await page.getAttribute('meta[name="twitter:title"]', 'content');
    audit.checks.twitterCard = {
      pass: !!(twitterCard && twitterTitle),
      value: { card: twitterCard, title: twitterTitle },
      requirement: 'Twitter card and title present',
    };

    // Check structured data (JSON-LD)
    const structuredData = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      return scripts.map(s => {
        try {
          return JSON.parse(s.textContent);
        } catch {
          return null;
        }
      }).filter(Boolean);
    });
    audit.checks.structuredData = {
      pass: structuredData.length > 0,
      value: `${structuredData.length} schema(s)`,
      requirement: 'JSON-LD structured data present',
    };

    // Check single h1
    const h1Count = await page.locator('h1').count();
    audit.checks.h1Tag = {
      pass: h1Count === 1,
      value: `${h1Count} h1 tag(s)`,
      requirement: 'Exactly one h1 tag',
    };

    // Check lang attribute
    const htmlLang = await page.getAttribute('html', 'lang');
    audit.checks.htmlLang = {
      pass: !!htmlLang,
      value: htmlLang,
      requirement: 'HTML lang attribute present',
    };

    // Check manifest
    const manifest = await page.getAttribute('link[rel="manifest"]', 'href');
    audit.checks.manifest = {
      pass: !!manifest,
      value: manifest,
      requirement: 'Web app manifest present',
    };

    // Calculate score
    const totalChecks = Object.keys(audit.checks).length;
    audit.passed = Object.values(audit.checks).filter(c => c.pass).length;
    audit.failed = totalChecks - audit.passed;
    audit.score = Math.round((audit.passed / totalChecks) * 100);

    await browser.close();

    return audit;
  } catch (error) {
    await browser.close();
    throw error;
  }
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(audit) {
  const status = (pass) => pass ? '✓' : '✗';
  
  let markdown = `# SEO Audit Report

**URL**: ${audit.url}  
**Timestamp**: ${audit.timestamp}  
**Score**: ${audit.score}/100 (${audit.passed}/${audit.passed + audit.failed} checks passed)

## Results

| Check | Status | Requirement | Value |
|-------|--------|-------------|-------|
`;

  for (const [name, check] of Object.entries(audit.checks)) {
    const value = typeof check.value === 'object' 
      ? JSON.stringify(check.value).substring(0, 50) + '...'
      : (check.value || 'N/A').toString().substring(0, 50);
    
    markdown += `| ${name} | ${status(check.pass)} | ${check.requirement} | ${value} |\n`;
  }

  markdown += `\n## Summary

- **Passed**: ${audit.passed} checks
- **Failed**: ${audit.failed} checks
- **Score**: ${audit.score}/100

${audit.score >= 90 ? '✓ **SEO score meets target (≥90)**' : '⚠ **SEO score below target (target: ≥90)**'}
`;

  return markdown;
}

/**
 * Main execution
 */
async function main() {
  const url = process.argv[2] || 'http://localhost:3000';

  try {
    const audit = await runSEOAudit(url);

    // Write JSON report
    writeFileSync(OUTPUT_JSON, JSON.stringify(audit, null, 2));
    console.log(`✓ JSON report saved: ${OUTPUT_JSON}`);

    // Write Markdown report
    const markdown = generateMarkdownReport(audit);
    writeFileSync(OUTPUT_MD, markdown);
    console.log(`✓ Markdown report saved: ${OUTPUT_MD}`);

    console.log(`\nSEO Score: ${audit.score}/100`);
    console.log(`Passed: ${audit.passed}/${audit.passed + audit.failed}`);

    // Exit with appropriate code
    if (audit.score < 90) {
      console.warn('⚠ SEO score below target (90)');
      process.exit(1);
    }

    console.log('✓ SEO audit passed');
  } catch (error) {
    console.error('✗ SEO audit failed:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runSEOAudit, generateMarkdownReport };
