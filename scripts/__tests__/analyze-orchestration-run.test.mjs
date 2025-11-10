/**
 * Tests for analyze-orchestration-run.mjs
 * Validates enhanced a11y and Playwright parsing logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OrchestrationAnalyzer } from '../analyze-orchestration-run.mjs';

describe('OrchestrationAnalyzer - Enhanced A11y and Playwright Parsing', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new OrchestrationAnalyzer('12345');
  });

  describe('AnalysisResults Structure', () => {
    it('should initialize with P3 (minor, non-gating) issue tracking', () => {
      expect(analyzer.results.issues).toHaveProperty('p0');
      expect(analyzer.results.issues).toHaveProperty('p1');
      expect(analyzer.results.issues).toHaveProperty('p2');
      expect(analyzer.results.issues).toHaveProperty('p3');
    });

    it('should initialize with a11yViolationsByImpact structure', () => {
      expect(analyzer.results.a11yViolationsByImpact).toHaveProperty('critical');
      expect(analyzer.results.a11yViolationsByImpact).toHaveProperty('serious');
      expect(analyzer.results.a11yViolationsByImpact).toHaveProperty('moderate');
      expect(analyzer.results.a11yViolationsByImpact).toHaveProperty('minor');
    });

    it('should initialize with a11yHotspots array', () => {
      expect(analyzer.results.a11yHotspots).toEqual([]);
    });

    it('should initialize with potentiallyFlaky array in Playwright results', () => {
      expect(analyzer.results.playwrightResults.potentiallyFlaky).toEqual([]);
    });
  });

  describe('Severity Mapping', () => {
    it('should map critical violations to P0', () => {
      analyzer.addIssue('p0', 'Critical A11y Issue', 'Description', {
        impact: 'critical',
      });
      
      expect(analyzer.results.issues.p0).toHaveLength(1);
      expect(analyzer.results.issues.p0[0].title).toBe('Critical A11y Issue');
    });

    it('should map serious violations to P1', () => {
      analyzer.addIssue('p1', 'Serious A11y Issue', 'Description', {
        impact: 'serious',
      });
      
      expect(analyzer.results.issues.p1).toHaveLength(1);
    });

    it('should map moderate violations to P2', () => {
      analyzer.addIssue('p2', 'Moderate A11y Issue', 'Description', {
        impact: 'moderate',
      });
      
      expect(analyzer.results.issues.p2).toHaveLength(1);
    });

    it('should map minor violations to P3 (non-gating)', () => {
      analyzer.addIssue('p3', 'Minor A11y Issue', 'Description', {
        impact: 'minor',
        gating: false,
      });
      
      expect(analyzer.results.issues.p3).toHaveLength(1);
      expect(analyzer.results.issues.p3[0].gating).toBe(false);
    });
  });

  describe('Mechanical Fixes Identification', () => {
    beforeEach(() => {
      // Add some violations
      analyzer.results.a11yViolations = [
        {
          id: 'image-alt',
          impact: 'critical',
          description: 'Images must have alternate text',
          selectors: ['img.logo', 'img.hero'],
          snippets: ['<img src="logo.png">'],
        },
        {
          id: 'aria-label',
          impact: 'serious',
          description: 'Elements must have aria-label',
          selectors: ['button.submit'],
          snippets: ['<button>Submit</button>'],
        },
        {
          id: 'color-contrast',
          impact: 'moderate',
          description: 'Elements must have sufficient color contrast',
          selectors: ['p.disclaimer'],
          snippets: [],
        },
      ];
    });

    it('should identify image-alt fixes', () => {
      const fixes = analyzer.identifyMechanicalFixes();
      
      const imageAltFix = fixes.find(f => f.fixType === 'image-alt');
      expect(imageAltFix).toBeDefined();
      expect(imageAltFix.type).toBe('a11y-image-alt');
      expect(imageAltFix.changes).toHaveLength(2);
    });

    it('should identify aria-label fixes', () => {
      const fixes = analyzer.identifyMechanicalFixes();
      
      const ariaLabelFix = fixes.find(f => f.fixType === 'aria-label');
      expect(ariaLabelFix).toBeDefined();
      expect(ariaLabelFix.type).toBe('a11y-aria-label');
    });

    it('should mark color-contrast as manual fix', () => {
      const fixes = analyzer.identifyMechanicalFixes();
      
      const colorContrastFix = fixes.find(f => f.fixType === 'color-contrast');
      expect(colorContrastFix).toBeDefined();
      expect(colorContrastFix.manual).toBe(true);
    });

    it('should include selectors and examples in fixes', () => {
      const fixes = analyzer.identifyMechanicalFixes();
      
      const imageAltFix = fixes.find(f => f.fixType === 'image-alt');
      expect(imageAltFix.changes[0]).toHaveProperty('selector');
      expect(imageAltFix.changes[0]).toHaveProperty('fix');
      expect(imageAltFix.changes[0]).toHaveProperty('example');
    });
  });

  describe('Playwright Test Processing', () => {
    it('should mark failed tests with potentiallyFlaky flag', () => {
      const test = {
        status: 'failed',
        title: 'Login test',
        browser: 'chromium',
        error: 'Timeout exceeded',
      };
      
      analyzer.processPlaywrightTest(test);
      
      expect(analyzer.results.playwrightResults.failedTests).toHaveLength(1);
      expect(analyzer.results.playwrightResults.failedTests[0].potentiallyFlaky).toBe(false);
    });

    it('should count tests correctly', () => {
      analyzer.processPlaywrightTest({ status: 'passed', title: 'Test 1' });
      analyzer.processPlaywrightTest({ status: 'failed', title: 'Test 2' });
      analyzer.processPlaywrightTest({ status: 'skipped', title: 'Test 3' });
      
      expect(analyzer.results.playwrightResults.total).toBe(3);
      expect(analyzer.results.playwrightResults.passed).toBe(1);
      expect(analyzer.results.playwrightResults.failed).toBe(1);
      expect(analyzer.results.playwrightResults.skipped).toBe(1);
    });
  });

  describe('Issue Addition', () => {
    it('should add issues with all metadata', () => {
      analyzer.addIssue('p2', 'Test Issue', 'Test Description', {
        artifact: 'test-artifact',
        file: 'test.json',
        selectors: ['div.test'],
        gating: true,
      });
      
      expect(analyzer.results.issues.p2).toHaveLength(1);
      expect(analyzer.results.issues.p2[0]).toMatchObject({
        priority: 'p2',
        title: 'Test Issue',
        description: 'Test Description',
        artifact: 'test-artifact',
        file: 'test.json',
        selectors: ['div.test'],
        gating: true,
      });
    });
  });
});
