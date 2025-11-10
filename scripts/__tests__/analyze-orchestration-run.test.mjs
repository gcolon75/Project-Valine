/**
 * Tests for analyze-orchestration-run.mjs
 * Validates enhanced a11y and Playwright parsing logic
 * Validates REST API artifact retrieval fallback
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrchestrationAnalyzer } from '../analyze-orchestration-run.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, 'fixtures');

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

  describe('Exit Code Behavior', () => {
    it('should return exit code 2 when P0 issues are present', () => {
      analyzer.options.failOn = 'P0';
      analyzer.addIssue('p0', 'Critical Issue', 'This is critical');
      
      const exitCode = analyzer.computeExitCode();
      expect(exitCode).toBe(2);
    });

    it('should return exit code 1 when multiple P1 issues are present (>3)', () => {
      analyzer.options.failOn = 'P0';
      // Add 4 P1 issues to exceed threshold
      analyzer.addIssue('p1', 'P1 Issue 1', 'Description 1');
      analyzer.addIssue('p1', 'P1 Issue 2', 'Description 2');
      analyzer.addIssue('p1', 'P1 Issue 3', 'Description 3');
      analyzer.addIssue('p1', 'P1 Issue 4', 'Description 4');
      
      const exitCode = analyzer.computeExitCode();
      expect(exitCode).toBe(1);
    });

    it('should return exit code 0 when no issues above threshold', () => {
      analyzer.options.failOn = 'P0';
      // Add some P2 and P3 issues that shouldn't trigger failure
      analyzer.addIssue('p2', 'P2 Issue', 'Moderate issue');
      analyzer.addIssue('p3', 'P3 Issue', 'Minor issue');
      
      const exitCode = analyzer.computeExitCode();
      expect(exitCode).toBe(0);
    });

    it('should return exit code 0 when fail-on is NONE', () => {
      analyzer.options.failOn = 'NONE';
      // Add P0, P1, P2 issues
      analyzer.addIssue('p0', 'Critical Issue', 'Description');
      analyzer.addIssue('p1', 'Serious Issue', 'Description');
      analyzer.addIssue('p2', 'Moderate Issue', 'Description');
      
      const exitCode = analyzer.computeExitCode();
      expect(exitCode).toBe(0);
    });

    it('should return exit code 1 when fail-on is P1 and any P1 issue exists', () => {
      analyzer.options.failOn = 'P1';
      analyzer.addIssue('p1', 'Single P1 Issue', 'Description');
      
      const exitCode = analyzer.computeExitCode();
      expect(exitCode).toBe(1);
    });

    it('should return exit code 1 when fail-on is P2 and any P2 issue exists', () => {
      analyzer.options.failOn = 'P2';
      analyzer.addIssue('p2', 'Single P2 Issue', 'Description');
      
      const exitCode = analyzer.computeExitCode();
      expect(exitCode).toBe(1);
    });

    it('should prioritize P0 over P1 issues', () => {
      analyzer.options.failOn = 'P1';
      analyzer.addIssue('p0', 'Critical Issue', 'Description');
      analyzer.addIssue('p1', 'Serious Issue', 'Description');
      
      const exitCode = analyzer.computeExitCode();
      expect(exitCode).toBe(2); // P0 takes precedence
    });
  });

  describe('Security - Path Traversal Protection', () => {
    it('should reject paths with ".." components', () => {
      const basePath = '/tmp/test-artifacts';
      
      expect(() => {
        analyzer.sanitizePath('../../../etc/passwd', basePath);
      }).toThrow('Rejected path with \'..\' traversal');
    });

    it('should reject paths that escape base directory', () => {
      const basePath = '/tmp/test-artifacts';
      
      expect(() => {
        analyzer.sanitizePath('subdir/../../other/file.txt', basePath);
      }).toThrow();
    });

    it('should accept safe relative paths within base directory', () => {
      const basePath = '/tmp/test-artifacts';
      const result = analyzer.sanitizePath('subdir/file.txt', basePath);
      
      expect(result.safe).toBe(true);
      expect(result.sanitized).toContain('test-artifacts');
      expect(result.sanitized).toContain('subdir/file.txt');
    });
  });

  describe('Security - Size Limits', () => {
    const MAX_UNCOMPRESSED_SIZE = 250 * 1024 * 1024; // 250MB
    const MAX_FILE_COUNT = 10000;

    beforeEach(() => {
      analyzer.extractionStats = {
        fileCount: 0,
        totalSize: 0,
      };
    });

    it('should reject when file count exceeds maximum', () => {
      // Simulate extracting MAX_FILE_COUNT + 1 files
      for (let i = 0; i < MAX_FILE_COUNT; i++) {
        analyzer.trackExtraction('file' + i, 100);
      }
      
      expect(() => {
        analyzer.trackExtraction('file-overflow', 100);
      }).toThrow(`Extraction aborted: file count exceeds ${MAX_FILE_COUNT}`);
    });

    it('should reject when total size exceeds maximum', () => {
      expect(() => {
        analyzer.trackExtraction('huge-file', MAX_UNCOMPRESSED_SIZE + 1);
      }).toThrow(/Extraction aborted: total size exceeds/);
    });

    it('should accept files within limits', () => {
      expect(() => {
        analyzer.trackExtraction('file1', 1024);
        analyzer.trackExtraction('file2', 2048);
        analyzer.trackExtraction('file3', 4096);
      }).not.toThrow();
      
      expect(analyzer.extractionStats.fileCount).toBe(3);
      expect(analyzer.extractionStats.totalSize).toBe(1024 + 2048 + 4096);
    });
  });

  describe('REST API Artifact Retrieval', () => {
    describe('Initialization', () => {
      it('should set retrievalMode to REST when --no-gh flag is used', () => {
        const restAnalyzer = new OrchestrationAnalyzer('12345', { useGH: false });
        expect(restAnalyzer.options.useGH).toBe(false);
        expect(restAnalyzer.results.summary.retrievalMode).toBe(null); // Not set until checkGitHubCLI is called
      });

      it('should default to CLI mode when useGH is not specified', () => {
        const cliAnalyzer = new OrchestrationAnalyzer('12345');
        expect(cliAnalyzer.options.useGH).toBe(true);
      });
    });

    describe('GitHub Token Detection', () => {
      it('should detect GITHUB_TOKEN environment variable', () => {
        const originalToken = process.env.GITHUB_TOKEN;
        process.env.GITHUB_TOKEN = 'test-token-123';
        
        const token = analyzer.getGitHubToken();
        expect(token).toBe('test-token-123');
        
        // Restore
        if (originalToken) {
          process.env.GITHUB_TOKEN = originalToken;
        } else {
          delete process.env.GITHUB_TOKEN;
        }
      });

      it('should detect GH_TOKEN environment variable as fallback', () => {
        const originalGithubToken = process.env.GITHUB_TOKEN;
        const originalGhToken = process.env.GH_TOKEN;
        
        delete process.env.GITHUB_TOKEN;
        process.env.GH_TOKEN = 'gh-token-456';
        
        const token = analyzer.getGitHubToken();
        expect(token).toBe('gh-token-456');
        
        // Restore
        if (originalGithubToken) {
          process.env.GITHUB_TOKEN = originalGithubToken;
        }
        if (originalGhToken) {
          process.env.GH_TOKEN = originalGhToken;
        } else {
          delete process.env.GH_TOKEN;
        }
      });

      it('should return undefined when no token is set', () => {
        const originalGithubToken = process.env.GITHUB_TOKEN;
        const originalGhToken = process.env.GH_TOKEN;
        
        delete process.env.GITHUB_TOKEN;
        delete process.env.GH_TOKEN;
        
        const token = analyzer.getGitHubToken();
        expect(token).toBeUndefined();
        
        // Restore
        if (originalGithubToken) {
          process.env.GITHUB_TOKEN = originalGithubToken;
        }
        if (originalGhToken) {
          process.env.GH_TOKEN = originalGhToken;
        }
      });
    });

    describe('checkGitHubCLI with REST fallback', () => {
      it('should use REST mode when --no-gh is specified', async () => {
        const restAnalyzer = new OrchestrationAnalyzer('12345', { useGH: false });
        const result = await restAnalyzer.checkGitHubCLI();
        
        expect(result).toBe(true);
        expect(restAnalyzer.useRestApi).toBe(true);
        expect(restAnalyzer.results.summary.retrievalMode).toBe('REST');
      });

      it('should set retrievalMode to CLI when gh is available', async () => {
        // This test requires gh to be installed, so we'll skip if not available
        const cliAnalyzer = new OrchestrationAnalyzer('12345', { useGH: true });
        
        try {
          await cliAnalyzer.checkGitHubCLI();
          
          if (!cliAnalyzer.useRestApi) {
            expect(cliAnalyzer.results.summary.retrievalMode).toBe('CLI');
          }
        } catch (error) {
          // gh not installed, should fallback to REST
          expect(cliAnalyzer.useRestApi).toBe(true);
          expect(cliAnalyzer.results.summary.retrievalMode).toBe('REST');
        }
      });
    });

    describe('Degraded Mode Detection', () => {
      it('should mark as degraded when REST API fails to fetch run details', async () => {
        const restAnalyzer = new OrchestrationAnalyzer('12345', { useGH: false });
        restAnalyzer.useRestApi = true;
        
        // Mock makeGitHubRequest to throw error
        restAnalyzer.makeGitHubRequest = vi.fn().mockRejectedValue(new Error('API Error'));
        
        await expect(restAnalyzer.getRunDetailsViaREST()).rejects.toThrow('API Error');
        expect(restAnalyzer.results.summary.degraded).toBe(true);
        expect(restAnalyzer.results.summary.degradedReason).toContain('Failed to fetch run details');
      });

      it('should mark as degraded when REST API fails to list artifacts', async () => {
        const restAnalyzer = new OrchestrationAnalyzer('12345', { useGH: false });
        restAnalyzer.useRestApi = true;
        
        // Mock makeGitHubRequest to throw error
        restAnalyzer.makeGitHubRequest = vi.fn().mockRejectedValue(new Error('API Error'));
        
        await expect(restAnalyzer.listArtifactsViaREST()).rejects.toThrow('API Error');
        expect(restAnalyzer.results.summary.degraded).toBe(true);
        expect(restAnalyzer.results.summary.degradedReason).toContain('Failed to list artifacts');
      });

      it('should mark as degraded on rate limit errors', async () => {
        const restAnalyzer = new OrchestrationAnalyzer('12345', { useGH: false });
        restAnalyzer.useRestApi = true;
        
        // Mock makeGitHubRequest to throw rate limit error
        restAnalyzer.makeGitHubRequest = vi.fn().mockRejectedValue(new Error('rate limit exceeded'));
        
        const mockArtifacts = [{ id: 1, name: 'test-artifact' }];
        
        // Mock downloadFile to fail with rate limit
        restAnalyzer.downloadFile = vi.fn().mockRejectedValue(new Error('rate limit exceeded'));
        
        await restAnalyzer.downloadArtifactsViaREST(mockArtifacts);
        
        expect(restAnalyzer.results.summary.degraded).toBe(true);
        expect(restAnalyzer.results.summary.degradedReason).toContain('Rate limited');
      });
    });

    describe('REST API Response Parsing', () => {
      it('should parse run details from REST API format', async () => {
        const mockRunData = await fs.readFile(
          path.join(fixturesDir, 'mock-run-details.json'),
          'utf-8'
        ).then(JSON.parse);
        
        const restAnalyzer = new OrchestrationAnalyzer('12345', { useGH: false });
        restAnalyzer.useRestApi = true;
        
        // Mock makeGitHubRequest
        restAnalyzer.makeGitHubRequest = vi.fn().mockResolvedValue(mockRunData);
        
        const result = await restAnalyzer.getRunDetailsViaREST();
        
        expect(result.workflowName).toBe('orchestrate-verification-and-sweep');
        expect(result.status).toBe('completed');
        expect(result.conclusion).toBe('success');
        expect(restAnalyzer.results.summary.status).toBe('success');
      });

      it('should parse artifacts list from REST API format', async () => {
        const mockArtifactsData = await fs.readFile(
          path.join(fixturesDir, 'mock-artifacts-list.json'),
          'utf-8'
        ).then(JSON.parse);
        
        const restAnalyzer = new OrchestrationAnalyzer('12345', { useGH: false });
        restAnalyzer.useRestApi = true;
        
        // Mock makeGitHubRequest
        restAnalyzer.makeGitHubRequest = vi.fn().mockResolvedValue(mockArtifactsData);
        
        const result = await restAnalyzer.listArtifactsViaREST();
        
        expect(result).toHaveLength(3);
        expect(result[0].name).toBe('verification-and-smoke-artifacts');
        expect(result[1].name).toBe('playwright-report');
        expect(result[2].name).toBe('regression-and-a11y-artifacts');
        
        expect(restAnalyzer.results.summary.artifactsFound).toHaveLength(3);
        expect(restAnalyzer.results.summary.artifactsMissing).toHaveLength(0);
      });
    });

    describe('JSON Summary with Retrieval Mode', () => {
      it('should include retrievalMode in summary JSON', () => {
        analyzer.results.summary.retrievalMode = 'REST';
        
        const p0Count = 0;
        const p1Count = 0;
        const p2Count = 0;
        
        const gatingDecision = analyzer.computeGatingDecision(p0Count, p1Count, p2Count);
        
        const summary = {
          runId: analyzer.runId,
          timestamp: new Date().toISOString(),
          status: analyzer.results.summary.status,
          workflowName: analyzer.results.summary.workflowName,
          retrievalMode: analyzer.results.summary.retrievalMode,
          gating: {
            decision: gatingDecision.decision,
            recommendation: gatingDecision.recommendation,
            exitCode: gatingDecision.exitCode,
          },
        };
        
        expect(summary.retrievalMode).toBe('REST');
      });

      it('should include degraded status in artifacts section', () => {
        analyzer.results.summary.degraded = true;
        analyzer.results.summary.degradedReason = 'Rate limited';
        
        const artifactsInfo = {
          found: analyzer.results.summary.artifactsFound,
          missing: analyzer.results.summary.artifactsMissing,
          degraded: analyzer.results.summary.degraded || analyzer.results.summary.artifactsMissing.length > 0,
          degradedReason: analyzer.results.summary.degradedReason,
        };
        
        expect(artifactsInfo.degraded).toBe(true);
        expect(artifactsInfo.degradedReason).toBe('Rate limited');
      });
    });
  });
});
