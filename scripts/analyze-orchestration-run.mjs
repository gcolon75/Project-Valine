#!/usr/bin/env node

/**
 * Post-Run Orchestration Analysis Agent
 * 
 * This script fetches and analyzes artifacts from a GitHub Actions workflow run
 * of the orchestrate-verification-and-sweep workflow. It generates:
 * - Consolidated Markdown report
 * - P0/P1/P2 prioritized issues list
 * - Draft PR payloads for mechanical fixes
 * - Draft GitHub issues for non-trivial problems
 * 
 * Usage:
 *   node scripts/analyze-orchestration-run.mjs <run-id> [options]
 *   node scripts/analyze-orchestration-run.mjs 19125388400
 * 
 * CLI Flags:
 *   --out-dir <path>         Output directory for reports (default: analysis-output)
 *   --json                   Emit machine-readable summary.json file
 *   --summary <path>         Write executive summary markdown to specified path
 *   --fail-on <P0|P1|P2|none> Exit code policy based on severity (default: P0)
 *   --log-level <info|debug> Logging verbosity (default: info)
 *   --no-gh                  Force REST API artifact retrieval (stub mode)
 * 
 * Exit Codes:
 *   0 - PROCEED: No critical issues or below threshold
 *   1 - CAUTION: Multiple P1 issues, no P0
 *   2 - BLOCK: P0 critical issues present
 * 
 * Requirements:
 *   - GitHub CLI (gh) must be installed and authenticated
 *   - Run ID from the orchestrate-verification-and-sweep workflow
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const REPO_OWNER = 'gcolon75';
const REPO_NAME = 'Project-Valine';
const ARTIFACTS_DIR = path.join(process.cwd(), 'temp-artifacts');

// Security limits for artifact extraction
const MAX_UNCOMPRESSED_SIZE = 250 * 1024 * 1024; // 250MB
const MAX_FILE_COUNT = 10000;

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Logger utility with structured logging and timestamps
 */
class Logger {
  constructor(logLevel = 'info') {
    this.logLevel = logLevel;
    this.levels = { debug: 0, info: 1 };
  }

  timestamp() {
    return new Date().toISOString();
  }

  debug(message) {
    if (this.levels[this.logLevel] <= this.levels.debug) {
      console.log(`${colors.magenta}[${this.timestamp()}]${colors.reset} ${colors.blue}DEBUG${colors.reset} ${message}`);
    }
  }

  info(message) {
    console.log(`${colors.cyan}[${this.timestamp()}]${colors.reset} ${colors.blue}ℹ${colors.reset} ${message}`);
  }

  success(message) {
    console.log(`${colors.cyan}[${this.timestamp()}]${colors.reset} ${colors.green}✓${colors.reset} ${message}`);
  }

  warning(message) {
    console.log(`${colors.cyan}[${this.timestamp()}]${colors.reset} ${colors.yellow}⚠${colors.reset} ${message}`);
  }

  error(message) {
    console.log(`${colors.cyan}[${this.timestamp()}]${colors.reset} ${colors.red}✗${colors.reset} ${message}`);
  }

  section(message) {
    console.log(`\n${colors.cyan}[${this.timestamp()}]${colors.reset} ${colors.cyan}${colors.bright}${message}${colors.reset}`);
  }
}

/**
 * Analysis results storage
 */
class AnalysisResults {
  constructor() {
    this.summary = {
      runId: null,
      status: 'unknown',
      timestamp: new Date().toISOString(),
      artifactsFound: [],
      artifactsMissing: [],
    };
    this.healthChecks = [];
    this.authChecks = [];
    this.verificationSteps = [];
    this.playwrightResults = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      failedTests: [],
    };
    this.a11yViolations = [];
    this.securityFindings = [];
    this.cspReports = [];
    this.issues = {
      p0: [],
      p1: [],
      p2: [],
    };
    this.draftPRs = [];
    this.draftIssues = [];
  }
}

/**
 * Main orchestration analyzer
 */
class OrchestrationAnalyzer {
  constructor(runId, options = {}) {
    this.runId = runId;
    this.options = {
      outDir: options.outDir || path.join(process.cwd(), 'analysis-output'),
      emitJson: options.emitJson || false,
      summaryPath: options.summaryPath || null,
      failOn: options.failOn || 'P0',
      logLevel: options.logLevel || 'info',
      useGH: options.useGH !== false, // true by default unless --no-gh
    };
    this.logger = new Logger(this.options.logLevel);
    this.results = new AnalysisResults();
    this.results.summary.runId = runId;
    this.extractionStats = {
      totalSize: 0,
      fileCount: 0,
      sanitized: [],
    };
  }

  /**
   * Sanitize and validate extraction path for security
   */
  sanitizePath(archivePath, basePath) {
    this.logger.debug(`Sanitizing path: ${archivePath}`);
    
    // Reject absolute paths
    if (path.isAbsolute(archivePath)) {
      throw new Error(`Rejected absolute path in archive: ${archivePath}`);
    }
    
    // Reject drive letters (Windows)
    if (/^[a-zA-Z]:/.test(archivePath)) {
      throw new Error(`Rejected path with drive letter: ${archivePath}`);
    }
    
    // Reject paths with '..' components
    const normalized = path.normalize(archivePath);
    if (normalized.includes('..')) {
      throw new Error(`Rejected path with '..' traversal: ${archivePath}`);
    }
    
    // Build final path
    const finalPath = path.join(basePath, normalized);
    
    // Ensure final path is still within basePath
    const resolvedBase = path.resolve(basePath);
    const resolvedFinal = path.resolve(finalPath);
    
    if (!resolvedFinal.startsWith(resolvedBase)) {
      throw new Error(`Rejected path outside base directory: ${archivePath}`);
    }
    
    this.logger.debug(`Path sanitized: ${archivePath} -> ${finalPath}`);
    
    return {
      original: archivePath,
      sanitized: finalPath,
      safe: true,
    };
  }

  /**
   * Track extraction statistics and enforce limits
   */
  trackExtraction(filePath, size) {
    this.extractionStats.fileCount++;
    this.extractionStats.totalSize += size;
    
    this.logger.debug(`Extraction stats: ${this.extractionStats.fileCount} files, ${this.formatBytes(this.extractionStats.totalSize)}`);
    
    if (this.extractionStats.fileCount > MAX_FILE_COUNT) {
      throw new Error(`Extraction aborted: file count exceeds ${MAX_FILE_COUNT}`);
    }
    
    if (this.extractionStats.totalSize > MAX_UNCOMPRESSED_SIZE) {
      throw new Error(`Extraction aborted: total size exceeds ${this.formatBytes(MAX_UNCOMPRESSED_SIZE)}`);
    }
  }

  /**
   * Check if GitHub CLI is installed
   */
  async checkGitHubCLI() {
    if (!this.options.useGH) {
      this.logger.warning('--no-gh flag specified: REST API mode not yet implemented');
      this.logger.warning('Proceeding with GitHub CLI mode as fallback');
      this.logger.debug('REST API artifact retrieval is a stub for future implementation');
    }
    
    try {
      await execAsync('gh --version');
      this.logger.success('GitHub CLI is installed');
      return true;
    } catch (error) {
      this.logger.error('GitHub CLI (gh) is not installed or not in PATH');
      this.logger.info('Please install from: https://cli.github.com/');
      return false;
    }
  }

  /**
   * Get workflow run details
   */
  async getRunDetails() {
    this.logger.section('Phase A: Fetching Run Details');
    
    try {
      const { stdout } = await execAsync(
        `gh run view ${this.runId} --repo ${REPO_OWNER}/${REPO_NAME} --json conclusion,status,createdAt,displayTitle,event,workflowName`
      );
      
      const runDetails = JSON.parse(stdout);
      this.logger.success(`Run: ${runDetails.workflowName}`);
      this.logger.info(`Status: ${runDetails.status} | Conclusion: ${runDetails.conclusion || 'N/A'}`);
      this.logger.info(`Created: ${runDetails.createdAt}`);
      this.logger.info(`Event: ${runDetails.event} | Title: ${runDetails.displayTitle}`);
      
      this.results.summary.status = runDetails.conclusion || runDetails.status;
      this.results.summary.workflowName = runDetails.workflowName;
      this.results.summary.createdAt = runDetails.createdAt;
      
      return runDetails;
    } catch (error) {
      this.logger.error(`Failed to fetch run details: ${error.message}`);
      throw error;
    }
  }

  /**
   * List artifacts for the run
   */
  async listArtifacts() {
    this.logger.section('Listing Artifacts');
    
    try {
      const { stdout } = await execAsync(
        `gh run view ${this.runId} --repo ${REPO_OWNER}/${REPO_NAME} --json artifacts`
      );
      
      const data = JSON.parse(stdout);
      const artifacts = data.artifacts || [];
      
      this.logger.info(`Found ${artifacts.length} artifact(s)`);
      
      const expectedArtifacts = [
        'verification-and-smoke-artifacts',
        'playwright-report',
        'regression-and-a11y-artifacts',
      ];
      
      for (const expected of expectedArtifacts) {
        const found = artifacts.find(a => a.name === expected);
        if (found) {
          this.logger.success(`✓ ${expected} (${this.formatBytes(found.size_in_bytes)})`);
          this.results.summary.artifactsFound.push(expected);
        } else {
          this.logger.warning(`✗ ${expected} (not found)`);
          this.results.summary.artifactsMissing.push(expected);
        }
      }
      
      return artifacts;
    } catch (error) {
      this.logger.error(`Failed to list artifacts: ${error.message}`);
      throw error;
    }
  }

  /**
   * Download artifacts
   */
  async downloadArtifacts(artifacts) {
    this.logger.section('Downloading Artifacts');
    
    // Create artifacts directory
    await fs.mkdir(ARTIFACTS_DIR, { recursive: true });
    
    for (const artifact of artifacts) {
      try {
        this.logger.info(`Downloading: ${artifact.name}...`);
        
        // Download artifact using gh cli
        const artifactPath = path.join(ARTIFACTS_DIR, artifact.name);
        await execAsync(
          `gh run download ${this.runId} --name "${artifact.name}" --dir "${artifactPath}" --repo ${REPO_OWNER}/${REPO_NAME}`
        );
        
        this.logger.success(`Downloaded: ${artifact.name}`);
        
        // List contents
        await this.listArtifactContents(artifactPath, artifact.name);
      } catch (error) {
        this.logger.warning(`Failed to download ${artifact.name}: ${error.message}`);
      }
    }
  }

  /**
   * List contents of downloaded artifact
   */
  async listArtifactContents(artifactPath, artifactName) {
    try {
      const files = await this.getFileList(artifactPath);
      this.logger.info(`  ${artifactName} contains ${files.length} file(s)`);
      
      // Show first few files
      const preview = files.slice(0, 5);
      for (const file of preview) {
        const stats = await fs.stat(file);
        const relativePath = path.relative(artifactPath, file);
        this.logger.info(`    - ${relativePath} (${this.formatBytes(stats.size)})`);
      }
      
      if (files.length > 5) {
        this.logger.info(`    ... and ${files.length - 5} more file(s)`);
      }
    } catch (error) {
      this.logger.warning(`Failed to list artifact contents: ${error.message}`);
    }
  }

  /**
   * Recursively get all files in a directory
   */
  async getFileList(dir) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.getFileList(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore errors for missing directories
    }
    
    return files;
  }

  /**
   * Analyze verification artifacts
   */
  async analyzeVerificationArtifacts() {
    this.logger.section('Phase B: Analyzing Verification Artifacts');
    
    const verificationDir = path.join(ARTIFACTS_DIR, 'verification-and-smoke-artifacts');
    
    // Check health check results
    await this.analyzeHealthChecks(verificationDir);
    
    // Check auth results
    await this.analyzeAuthChecks(verificationDir);
    
    // Check verification reports
    await this.analyzeVerificationReports(verificationDir);
  }

  /**
   * Analyze health check results
   */
  async analyzeHealthChecks(baseDir) {
    this.logger.info('Analyzing health checks...');
    
    const healthFiles = [
      'logs/verification/health_status.txt',
      'logs/verification/health.json',
    ];
    
    for (const healthFile of healthFiles) {
      const filePath = path.join(baseDir, healthFile);
      
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        
        const healthCheck = {
          file: healthFile,
          status: 'unknown',
          content: content.trim(),
        };
        
        // Try to parse as JSON
        try {
          const json = JSON.parse(content);
          healthCheck.status = json.status || json.health || 'unknown';
          healthCheck.parsed = json;
        } catch {
          // Not JSON, check for status codes
          if (content.includes('200') || content.toLowerCase().includes('ok') || content.toLowerCase().includes('healthy')) {
            healthCheck.status = 'healthy';
          } else if (content.includes('401') || content.includes('403') || content.includes('404') || content.includes('500')) {
            healthCheck.status = 'unhealthy';
          }
        }
        
        this.results.healthChecks.push(healthCheck);
        
        if (healthCheck.status === 'healthy') {
          this.logger.success(`  Health check: ${healthCheck.status}`);
        } else {
          this.logger.warning(`  Health check: ${healthCheck.status}`);
          this.addIssue('p1', 'Health Check Failed', `Health endpoint returned: ${healthCheck.status}`, {
            artifact: 'verification-and-smoke-artifacts',
            file: healthFile,
            snippet: content.substring(0, 200),
          });
        }
      } catch (error) {
        this.logger.info(`  Health check file not found: ${healthFile}`);
      }
    }
  }

  /**
   * Analyze authentication checks
   */
  async analyzeAuthChecks(baseDir) {
    this.logger.info('Analyzing authentication checks...');
    
    const authFiles = [
      'logs/verification/login_response_parsed.txt',
      'logs/verification/login_response_raw.txt',
      'logs/verification/profile_link_create.json',
    ];
    
    for (const authFile of authFiles) {
      const filePath = path.join(baseDir, authFile);
      
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        
        const authCheck = {
          file: authFile,
          status: 'unknown',
          content: content.trim(),
        };
        
        // Check for success indicators
        if (content.includes('token') || content.includes('jwt') || content.includes('session')) {
          authCheck.status = 'success';
          authCheck.hasToken = true;
        } else if (content.includes('401') || content.includes('Unauthorized') || content.includes('Invalid credentials')) {
          authCheck.status = 'failed';
          authCheck.hasToken = false;
        }
        
        // Try to parse as JSON
        try {
          const json = JSON.parse(content);
          authCheck.parsed = json;
          
          if (json.token || json.access_token || json.jwt) {
            authCheck.status = 'success';
            authCheck.hasToken = true;
          }
        } catch {
          // Not JSON
        }
        
        this.results.authChecks.push(authCheck);
        
        if (authCheck.status === 'success') {
          this.logger.success(`  Auth check (${authFile}): ${authCheck.status}`);
        } else if (authCheck.status === 'failed') {
          this.logger.error(`  Auth check (${authFile}): ${authCheck.status}`);
          this.addIssue('p0', 'Authentication Failed', `Login endpoint failed to authenticate test user`, {
            artifact: 'verification-and-smoke-artifacts',
            file: authFile,
            snippet: content.substring(0, 200),
            recommendation: 'Check STAGING_URL, TEST_USER_EMAIL, and TEST_USER_PASSWORD secrets. Verify staging auth endpoint is working.',
          });
        } else {
          this.logger.info(`  Auth check (${authFile}): ${authCheck.status}`);
        }
      } catch (error) {
        this.logger.info(`  Auth file not found: ${authFile}`);
      }
    }
  }

  /**
   * Analyze verification reports
   */
  async analyzeVerificationReports(baseDir) {
    this.logger.info('Analyzing verification reports...');
    
    const reportFiles = [
      'REGRESSION_VERIFICATION_REPORT.md',
      'REGRESSION_SWEEP_REPORT.md',
      'logs/verification/verification-report.md',
    ];
    
    for (const reportFile of reportFiles) {
      const filePath = path.join(baseDir, reportFile);
      
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Extract failures from markdown
        const failures = this.extractFailuresFromMarkdown(content);
        
        if (failures.length > 0) {
          this.logger.warning(`  Found ${failures.length} failure(s) in ${reportFile}`);
          
          for (const failure of failures) {
            this.addIssue('p1', failure.title, failure.description, {
              artifact: 'verification-and-smoke-artifacts',
              file: reportFile,
            });
          }
        } else {
          this.logger.success(`  No failures in ${reportFile}`);
        }
        
        this.results.verificationSteps.push({
          file: reportFile,
          failures: failures.length,
          content: content.substring(0, 500),
        });
      } catch (error) {
        this.logger.info(`  Report not found: ${reportFile}`);
      }
    }
  }

  /**
   * Extract failures from markdown content
   */
  extractFailuresFromMarkdown(content) {
    const failures = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for failure indicators
      if (line.includes('❌') || line.includes('✗') || line.includes('FAIL') || 
          line.includes('ERROR') || line.toLowerCase().includes('failed')) {
        
        // Extract title (heading or line itself)
        let title = line.replace(/[❌✗]/g, '').replace(/#+\s*/, '').trim();
        if (!title) title = 'Unknown failure';
        
        // Try to get description from following lines
        let description = '';
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          if (lines[j].trim() && !lines[j].startsWith('#')) {
            description += lines[j] + ' ';
          }
        }
        
        failures.push({
          title,
          description: description.trim() || 'No description available',
        });
      }
    }
    
    return failures;
  }

  /**
   * Analyze Playwright results
   */
  async analyzePlaywrightResults() {
    this.logger.section('Analyzing Playwright Results');
    
    const playwrightDir = path.join(ARTIFACTS_DIR, 'playwright-report');
    
    // Look for test results JSON
    const resultsFiles = [
      path.join(playwrightDir, 'results.json'),
      path.join(playwrightDir, 'test-results.json'),
    ];
    
    let resultsFound = false;
    
    for (const resultsFile of resultsFiles) {
      try {
        const content = await fs.readFile(resultsFile, 'utf-8');
        const results = JSON.parse(content);
        
        this.processPlaywrightResults(results);
        resultsFound = true;
        break;
      } catch (error) {
        // Try next file
      }
    }
    
    if (!resultsFound) {
      // Try to parse from HTML report
      try {
        const htmlFile = path.join(playwrightDir, 'index.html');
        const html = await fs.readFile(htmlFile, 'utf-8');
        
        // Extract test counts from HTML
        const passedMatch = html.match(/(\d+)\s*passed/i);
        const failedMatch = html.match(/(\d+)\s*failed/i);
        const skippedMatch = html.match(/(\d+)\s*skipped/i);
        
        if (passedMatch) this.results.playwrightResults.passed = parseInt(passedMatch[1]);
        if (failedMatch) this.results.playwrightResults.failed = parseInt(failedMatch[1]);
        if (skippedMatch) this.results.playwrightResults.skipped = parseInt(skippedMatch[1]);
        
        this.results.playwrightResults.total = 
          this.results.playwrightResults.passed + 
          this.results.playwrightResults.failed + 
          this.results.playwrightResults.skipped;
        
        this.logger.info('Parsed Playwright results from HTML report');
      } catch (error) {
        this.logger.warning('Could not parse Playwright results');
      }
    }
    
    this.logger.info(`Playwright: ${this.results.playwrightResults.passed} passed, ${this.results.playwrightResults.failed} failed, ${this.results.playwrightResults.skipped} skipped`);
    
    if (this.results.playwrightResults.failed > 0) {
      for (const failedTest of this.results.playwrightResults.failedTests) {
        this.addIssue('p1', `Playwright Test Failed: ${failedTest.name}`, failedTest.error, {
          artifact: 'playwright-report',
          testName: failedTest.name,
          browser: failedTest.browser,
        });
      }
    }
  }

  /**
   * Process Playwright results JSON
   */
  processPlaywrightResults(results) {
    // Different formats possible
    if (results.suites) {
      // Playwright JSON reporter format
      this.processPlaywrightSuites(results.suites);
    } else if (Array.isArray(results)) {
      // Array of test results
      for (const test of results) {
        this.processPlaywrightTest(test);
      }
    }
  }

  /**
   * Process Playwright test suites
   */
  processPlaywrightSuites(suites) {
    for (const suite of suites) {
      if (suite.specs) {
        for (const spec of suite.specs) {
          this.processPlaywrightSpec(spec);
        }
      }
      
      if (suite.suites) {
        this.processPlaywrightSuites(suite.suites);
      }
    }
  }

  /**
   * Process individual Playwright spec
   */
  processPlaywrightSpec(spec) {
    this.results.playwrightResults.total++;
    
    const outcome = spec.ok ? 'passed' : 'failed';
    
    if (outcome === 'passed') {
      this.results.playwrightResults.passed++;
    } else {
      this.results.playwrightResults.failed++;
      
      this.results.playwrightResults.failedTests.push({
        name: spec.title || spec.name || 'Unknown test',
        browser: spec.project || 'unknown',
        error: spec.error || 'No error message',
      });
    }
  }

  /**
   * Process individual Playwright test
   */
  processPlaywrightTest(test) {
    this.results.playwrightResults.total++;
    
    if (test.status === 'passed') {
      this.results.playwrightResults.passed++;
    } else if (test.status === 'failed') {
      this.results.playwrightResults.failed++;
      
      this.results.playwrightResults.failedTests.push({
        name: test.title || test.name || 'Unknown test',
        browser: test.browser || 'unknown',
        error: test.error || test.message || 'No error message',
      });
    } else if (test.status === 'skipped') {
      this.results.playwrightResults.skipped++;
    }
  }

  /**
   * Analyze accessibility results
   */
  async analyzeAccessibilityResults() {
    this.logger.section('Analyzing Accessibility Results');
    
    const a11yDir = path.join(ARTIFACTS_DIR, 'regression-and-a11y-artifacts');
    
    // Look for axe results
    const a11yFiles = await this.findFiles(a11yDir, /axe.*\.json$/i);
    
    for (const a11yFile of a11yFiles) {
      try {
        const content = await fs.readFile(a11yFile, 'utf-8');
        const results = JSON.parse(content);
        
        if (results.violations && Array.isArray(results.violations)) {
          for (const violation of results.violations) {
            this.results.a11yViolations.push({
              id: violation.id,
              impact: violation.impact || 'unknown',
              description: violation.description,
              help: violation.help,
              helpUrl: violation.helpUrl,
              nodes: violation.nodes?.length || 0,
            });
            
            const severity = violation.impact === 'critical' ? 'p0' : 
                           violation.impact === 'serious' ? 'p1' : 'p2';
            
            this.addIssue(severity, `A11y Violation: ${violation.id}`, violation.description, {
              artifact: 'regression-and-a11y-artifacts',
              file: path.basename(a11yFile),
              impact: violation.impact,
              helpUrl: violation.helpUrl,
            });
          }
        }
        
        this.logger.info(`Found ${results.violations?.length || 0} a11y violation(s) in ${path.basename(a11yFile)}`);
      } catch (error) {
        this.logger.warning(`Failed to parse ${a11yFile}: ${error.message}`);
      }
    }
    
    if (this.results.a11yViolations.length > 0) {
      this.logger.warning(`Total a11y violations: ${this.results.a11yViolations.length}`);
    } else {
      this.logger.success('No a11y violations found');
    }
  }

  /**
   * Find files matching a pattern
   */
  async findFiles(dir, pattern) {
    const files = await this.getFileList(dir);
    return files.filter(f => pattern.test(path.basename(f)));
  }

  /**
   * Add an issue to the results
   */
  addIssue(priority, title, description, metadata = {}) {
    const issue = {
      priority,
      title,
      description,
      ...metadata,
    };
    
    this.results.issues[priority].push(issue);
  }

  /**
   * Generate consolidated report
   */
  async generateConsolidatedReport() {
    this.logger.section('Phase C: Generating Consolidated Report');
    
    const OUTPUT_DIR = this.options.outDir;
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    const reportPath = path.join(OUTPUT_DIR, 'CONSOLIDATED_ANALYSIS_REPORT.md');
    
    let report = `# Orchestration Run Analysis Report\n\n`;
    report += `**Run ID:** ${this.runId}\n`;
    report += `**Analysis Date:** ${new Date().toISOString()}\n`;
    report += `**Workflow:** ${this.results.summary.workflowName || 'orchestrate-verification-and-sweep'}\n`;
    report += `**Status:** ${this.results.summary.status}\n\n`;
    
    // Executive Summary
    report += `## Executive Summary\n\n`;
    
    const p0Count = this.results.issues.p0.length;
    const p1Count = this.results.issues.p1.length;
    const p2Count = this.results.issues.p2.length;
    
    if (p0Count === 0 && p1Count === 0) {
      report += `✅ **PASS** - No critical or high-priority issues detected.\n\n`;
    } else if (p0Count > 0) {
      report += `❌ **BLOCK** - ${p0Count} critical (P0) issue(s) must be resolved before deployment.\n\n`;
    } else {
      report += `⚠️ **CAUTION** - ${p1Count} high-priority (P1) issue(s) detected. Review required.\n\n`;
    }
    
    report += `### Quick Stats\n\n`;
    report += `- **Artifacts Found:** ${this.results.summary.artifactsFound.length}\n`;
    report += `- **Artifacts Missing:** ${this.results.summary.artifactsMissing.length}\n`;
    report += `- **Health Checks:** ${this.results.healthChecks.length}\n`;
    report += `- **Auth Checks:** ${this.results.authChecks.length}\n`;
    report += `- **Playwright Tests:** ${this.results.playwrightResults.total} (${this.results.playwrightResults.passed} passed, ${this.results.playwrightResults.failed} failed)\n`;
    report += `- **A11y Violations:** ${this.results.a11yViolations.length}\n`;
    report += `- **Issues:** P0: ${p0Count}, P1: ${p1Count}, P2: ${p2Count}\n\n`;
    
    // Artifacts section
    report += `## Artifacts\n\n`;
    report += `### Found\n\n`;
    for (const artifact of this.results.summary.artifactsFound) {
      report += `- ✅ ${artifact}\n`;
    }
    report += `\n`;
    
    if (this.results.summary.artifactsMissing.length > 0) {
      report += `### Missing\n\n`;
      for (const artifact of this.results.summary.artifactsMissing) {
        report += `- ❌ ${artifact}\n`;
      }
      report += `\n`;
    }
    
    // Health Checks
    if (this.results.healthChecks.length > 0) {
      report += `## Health Checks\n\n`;
      for (const check of this.results.healthChecks) {
        const icon = check.status === 'healthy' ? '✅' : '❌';
        report += `${icon} **${check.file}**: ${check.status}\n\n`;
        if (check.status !== 'healthy') {
          report += `\`\`\`\n${check.content.substring(0, 300)}\n\`\`\`\n\n`;
        }
      }
    }
    
    // Auth Checks
    if (this.results.authChecks.length > 0) {
      report += `## Authentication Checks\n\n`;
      for (const check of this.results.authChecks) {
        const icon = check.status === 'success' ? '✅' : check.status === 'failed' ? '❌' : '❓';
        report += `${icon} **${check.file}**: ${check.status}`;
        if (check.hasToken) {
          report += ` (token present)`;
        }
        report += `\n\n`;
        
        if (check.status === 'failed') {
          report += `\`\`\`\n${check.content.substring(0, 300)}\n\`\`\`\n\n`;
        }
      }
    }
    
    // Playwright Results
    if (this.results.playwrightResults.total > 0) {
      report += `## Playwright Test Results\n\n`;
      report += `- **Total:** ${this.results.playwrightResults.total}\n`;
      report += `- **Passed:** ${this.results.playwrightResults.passed}\n`;
      report += `- **Failed:** ${this.results.playwrightResults.failed}\n`;
      report += `- **Skipped:** ${this.results.playwrightResults.skipped}\n\n`;
      
      if (this.results.playwrightResults.failedTests.length > 0) {
        report += `### Failed Tests\n\n`;
        for (const test of this.results.playwrightResults.failedTests) {
          report += `- ❌ **${test.name}** (${test.browser})\n`;
          report += `  \`\`\`\n  ${test.error}\n  \`\`\`\n\n`;
        }
      }
    }
    
    // Accessibility
    if (this.results.a11yViolations.length > 0) {
      report += `## Accessibility Violations\n\n`;
      
      const bySeverity = {
        critical: [],
        serious: [],
        moderate: [],
        minor: [],
      };
      
      for (const violation of this.results.a11yViolations) {
        const severity = violation.impact || 'minor';
        if (!bySeverity[severity]) bySeverity[severity] = [];
        bySeverity[severity].push(violation);
      }
      
      for (const [severity, violations] of Object.entries(bySeverity)) {
        if (violations.length > 0) {
          report += `### ${severity.charAt(0).toUpperCase() + severity.slice(1)} (${violations.length})\n\n`;
          
          for (const violation of violations) {
            report += `- **${violation.id}**: ${violation.description}\n`;
            report += `  - Impact: ${violation.impact}\n`;
            report += `  - Nodes: ${violation.nodes}\n`;
            if (violation.helpUrl) {
              report += `  - [More info](${violation.helpUrl})\n`;
            }
            report += `\n`;
          }
        }
      }
    }
    
    // Prioritized Issues
    report += `## Prioritized Issues\n\n`;
    
    for (const priority of ['p0', 'p1', 'p2']) {
      const issues = this.results.issues[priority];
      
      if (issues.length > 0) {
        const label = priority === 'p0' ? 'P0 - Critical' : 
                     priority === 'p1' ? 'P1 - High Priority' : 
                     'P2 - Medium Priority';
        
        report += `### ${label} (${issues.length})\n\n`;
        
        for (const issue of issues) {
          report += `#### ${issue.title}\n\n`;
          report += `**Description:** ${issue.description}\n\n`;
          
          if (issue.artifact) {
            report += `**Artifact:** \`${issue.artifact}\`\n\n`;
          }
          
          if (issue.file) {
            report += `**File:** \`${issue.file}\`\n\n`;
          }
          
          if (issue.snippet) {
            report += `**Snippet:**\n\`\`\`\n${issue.snippet}\n\`\`\`\n\n`;
          }
          
          if (issue.recommendation) {
            report += `**Recommended Fix:** ${issue.recommendation}\n\n`;
          }
          
          report += `---\n\n`;
        }
      }
    }
    
    // Remediation Plan
    report += `## Remediation Plan\n\n`;
    
    if (p0Count > 0) {
      report += `### Immediate Actions Required (P0)\n\n`;
      report += `1. **BLOCK deployment** - Do not proceed to production\n`;
      report += `2. Address all P0 issues listed above\n`;
      report += `3. Re-run orchestration workflow\n`;
      report += `4. Verify all P0 issues are resolved\n\n`;
    }
    
    if (p1Count > 0) {
      report += `### High Priority Actions (P1)\n\n`;
      report += `1. Review all P1 issues\n`;
      report += `2. Create tracking issues for each P1 item\n`;
      report += `3. Consider gating deployment on P1 resolution\n`;
      report += `4. If deploying with P1 issues, ensure rollback plan is ready\n\n`;
    }
    
    if (p2Count > 0) {
      report += `### Medium Priority Actions (P2)\n\n`;
      report += `1. Review P2 issues for quick wins\n`;
      report += `2. Schedule fixes in upcoming sprint\n`;
      report += `3. Track in backlog\n\n`;
    }
    
    // Gating Recommendation
    report += `## Gating Recommendation\n\n`;
    
    if (p0Count > 0) {
      report += `🛑 **BLOCK** - Do not deploy to production. Critical issues must be resolved.\n\n`;
    } else if (p1Count > 3) {
      report += `⚠️ **CAUTION** - Multiple high-priority issues detected. Consider delaying deployment.\n\n`;
    } else if (p1Count > 0) {
      report += `⚠️ **REVIEW REQUIRED** - High-priority issues detected. Review before deployment decision.\n\n`;
    } else {
      report += `✅ **PROCEED** - No critical issues detected. Safe to proceed with deployment.\n\n`;
    }
    
    // Next Steps
    report += `## Next Steps\n\n`;
    
    if (this.results.summary.artifactsMissing.length > 0) {
      report += `1. **Missing Artifacts**: Re-run workflow or investigate why these artifacts were not generated:\n`;
      for (const artifact of this.results.summary.artifactsMissing) {
        report += `   - ${artifact}\n`;
      }
      report += `\n`;
    }
    
    if (p0Count > 0 || p1Count > 0) {
      report += `2. **Address Issues**: Fix prioritized issues (see sections above)\n`;
      report += `3. **Re-run Verification**: Run orchestration workflow again\n`;
      report += `4. **Re-analyze**: Run this analysis script on the new run\n\n`;
    }
    
    report += `## Commands Used\n\n`;
    report += `\`\`\`bash\n`;
    report += `# Fetch run details\n`;
    report += `gh run view ${this.runId} --repo ${REPO_OWNER}/${REPO_NAME}\n\n`;
    report += `# Download artifacts\n`;
    report += `gh run download ${this.runId} --repo ${REPO_OWNER}/${REPO_NAME}\n\n`;
    report += `# Analyze run\n`;
    report += `node scripts/analyze-orchestration-run.mjs ${this.runId}\n`;
    report += `\`\`\`\n\n`;
    
    report += `---\n\n`;
    report += `*Report generated by analyze-orchestration-run.mjs*\n`;
    
    await fs.writeFile(reportPath, report, 'utf-8');
    
    this.logger.success(`Consolidated report saved to: ${reportPath}`);
    
    return reportPath;
  }

  /**
   * Generate JSON summary
   */
  async generateJsonSummary() {
    if (!this.options.emitJson) {
      this.logger.debug('JSON summary generation skipped (--json not specified)');
      return;
    }

    this.logger.section('Generating JSON Summary');
    
    const OUTPUT_DIR = this.options.outDir;
    const summaryPath = path.join(OUTPUT_DIR, 'summary.json');
    
    const p0Count = this.results.issues.p0.length;
    const p1Count = this.results.issues.p1.length;
    const p2Count = this.results.issues.p2.length;
    
    const gatingDecision = this.computeGatingDecision(p0Count, p1Count, p2Count);
    
    const summary = {
      runId: this.runId,
      timestamp: new Date().toISOString(),
      status: this.results.summary.status,
      workflowName: this.results.summary.workflowName,
      gating: {
        decision: gatingDecision.decision,
        recommendation: gatingDecision.recommendation,
        exitCode: gatingDecision.exitCode,
      },
      artifacts: {
        found: this.results.summary.artifactsFound,
        missing: this.results.summary.artifactsMissing,
        degraded: this.results.summary.artifactsMissing.length > 0,
      },
      issues: {
        p0: p0Count,
        p1: p1Count,
        p2: p2Count,
        total: p0Count + p1Count + p2Count,
      },
      tests: {
        playwright: {
          total: this.results.playwrightResults.total,
          passed: this.results.playwrightResults.passed,
          failed: this.results.playwrightResults.failed,
          skipped: this.results.playwrightResults.skipped,
        },
        a11y: {
          violations: this.results.a11yViolations.length,
        },
      },
      healthChecks: this.results.healthChecks.length,
      authChecks: this.results.authChecks.length,
      extraction: {
        totalSize: this.extractionStats.totalSize,
        fileCount: this.extractionStats.fileCount,
        sanitizedPaths: this.extractionStats.sanitized.length,
      },
    };
    
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
    this.logger.success(`JSON summary saved to: ${summaryPath}`);
    
    return summaryPath;
  }

  /**
   * Generate executive summary markdown
   */
  async generateExecutiveSummary() {
    if (!this.options.summaryPath) {
      this.logger.debug('Executive summary generation skipped (--summary not specified)');
      return;
    }

    this.logger.section('Generating Executive Summary');
    
    const p0Count = this.results.issues.p0.length;
    const p1Count = this.results.issues.p1.length;
    const p2Count = this.results.issues.p2.length;
    
    const gatingDecision = this.computeGatingDecision(p0Count, p1Count, p2Count);
    
    let summary = `# Executive Summary - Run ${this.runId}\n\n`;
    summary += `**Date:** ${new Date().toISOString()}\n`;
    summary += `**Workflow:** ${this.results.summary.workflowName || 'orchestrate-verification-and-sweep'}\n`;
    summary += `**Status:** ${this.results.summary.status}\n\n`;
    
    summary += `## Gating Decision\n\n`;
    summary += `**${gatingDecision.decision}** - ${gatingDecision.recommendation}\n\n`;
    
    if (this.results.summary.artifactsMissing.length > 0) {
      summary += `⚠️ **DEGRADED**: Analysis performed with missing artifacts\n\n`;
    }
    
    summary += `## Issue Summary\n\n`;
    summary += `| Priority | Count | Description |\n`;
    summary += `|----------|-------|-------------|\n`;
    summary += `| P0 | ${p0Count} | Critical - Blocks deployment |\n`;
    summary += `| P1 | ${p1Count} | High - Review required |\n`;
    summary += `| P2 | ${p2Count} | Medium - Track in backlog |\n\n`;
    
    summary += `## Test Results\n\n`;
    summary += `- **Playwright:** ${this.results.playwrightResults.passed}/${this.results.playwrightResults.total} passed`;
    if (this.results.playwrightResults.failed > 0) {
      summary += ` (${this.results.playwrightResults.failed} failed)`;
    }
    summary += `\n`;
    summary += `- **Accessibility:** ${this.results.a11yViolations.length} violations\n\n`;
    
    if (this.results.summary.artifactsMissing.length > 0) {
      summary += `## Missing Artifacts\n\n`;
      for (const artifact of this.results.summary.artifactsMissing) {
        summary += `- ${artifact}\n`;
      }
      summary += `\n`;
    }
    
    summary += `## Recommended Actions\n\n`;
    
    if (p0Count > 0) {
      summary += `1. **BLOCK deployment** - Critical issues must be resolved\n`;
      summary += `2. Address all ${p0Count} P0 issue(s)\n`;
      summary += `3. Re-run verification workflow\n\n`;
    } else if (p1Count > 0) {
      summary += `1. Review all ${p1Count} P1 issue(s)\n`;
      summary += `2. Create tracking issues\n`;
      summary += `3. Assess deployment readiness\n\n`;
    } else {
      summary += `1. Review P2 issues for quick wins\n`;
      summary += `2. Proceed with deployment if all gates pass\n\n`;
    }
    
    summary += `---\n`;
    summary += `*Full report: CONSOLIDATED_ANALYSIS_REPORT.md*\n`;
    
    await fs.writeFile(this.options.summaryPath, summary, 'utf-8');
    this.logger.success(`Executive summary saved to: ${this.options.summaryPath}`);
    
    return this.options.summaryPath;
  }

  /**
   * Compute gating decision based on issue counts
   */
  computeGatingDecision(p0Count, p1Count, p2Count) {
    this.logger.debug(`Computing gating decision: P0=${p0Count}, P1=${p1Count}, P2=${p2Count}`);
    
    const degraded = this.results.summary.artifactsMissing.length > 0;
    let decision, recommendation, exitCode;
    
    if (p0Count > 0) {
      decision = '🛑 BLOCK';
      recommendation = 'Critical issues must be resolved before deployment';
      exitCode = 2;
      this.logger.debug(`Gating: BLOCK due to ${p0Count} P0 issue(s)`);
    } else if (p1Count > 3) {
      decision = '⚠️ CAUTION';
      recommendation = 'Multiple high-priority issues detected. Consider delaying deployment.';
      exitCode = 1;
      this.logger.debug(`Gating: CAUTION due to ${p1Count} P1 issue(s)`);
    } else if (p1Count > 0) {
      decision = '⚠️ REVIEW REQUIRED';
      recommendation = 'High-priority issues detected. Review before deployment decision.';
      exitCode = 1;
      this.logger.debug(`Gating: REVIEW due to ${p1Count} P1 issue(s)`);
    } else {
      decision = '✅ PROCEED';
      recommendation = 'No critical issues detected. Safe to proceed with deployment.';
      exitCode = 0;
      this.logger.debug('Gating: PROCEED - no critical issues');
    }
    
    if (degraded) {
      recommendation += ' (DEGRADED: missing expected artifacts)';
      this.logger.debug('Gating note: degraded analysis due to missing artifacts');
    }
    
    return { decision, recommendation, exitCode };
  }

  /**
   * Compute exit code based on fail-on policy
   */
  computeExitCode() {
    const p0Count = this.results.issues.p0.length;
    const p1Count = this.results.issues.p1.length;
    const p2Count = this.results.issues.p2.length;
    
    const failOn = this.options.failOn.toUpperCase();
    this.logger.debug(`Computing exit code with --fail-on=${failOn}: P0=${p0Count}, P1=${p1Count}, P2=${p2Count}`);
    
    if (failOn === 'NONE') {
      this.logger.debug('Exit code: 0 (--fail-on=none)');
      return 0;
    }
    
    // P0 always blocks unless fail-on is none
    if (p0Count > 0) {
      this.logger.debug(`Exit code: 2 (${p0Count} P0 issues present)`);
      return 2;
    }
    
    // Check P1 threshold
    if (failOn === 'P0' || failOn === 'P1') {
      if (p1Count > 3) {
        this.logger.debug(`Exit code: 1 (${p1Count} P1 issues, threshold exceeded)`);
        return 1;
      } else if (p1Count > 0 && failOn === 'P1') {
        this.logger.debug(`Exit code: 1 (${p1Count} P1 issues present, --fail-on=P1)`);
        return 1;
      }
    }
    
    // Check P2 threshold
    if (failOn === 'P2' && p2Count > 0) {
      this.logger.debug(`Exit code: 1 (${p2Count} P2 issues present, --fail-on=P2)`);
      return 1;
    }
    
    this.logger.debug('Exit code: 0 (no issues above threshold)');
    return 0;
  }

  /**
   * Generate draft PR payloads
   */
  async generateDraftPRs() {
    this.logger.section('Generating Draft PR Payloads');
    
    const OUTPUT_DIR = this.options.outDir;
    
    // Analyze issues for mechanical fixes
    const mechanicalFixes = this.identifyMechanicalFixes();
    
    if (mechanicalFixes.length === 0) {
      this.logger.info('No mechanical fixes identified');
      return;
    }
    
    const prPayloads = [];
    
    for (const fix of mechanicalFixes) {
      const payload = {
        branch: `fix/${fix.type}-${Date.now()}`,
        title: fix.title,
        description: fix.description,
        files: fix.files,
        labels: ['automated-fix', fix.priority],
      };
      
      prPayloads.push(payload);
      this.results.draftPRs.push(payload);
    }
    
    const prPayloadsPath = path.join(OUTPUT_DIR, 'draft-pr-payloads.json');
    await fs.writeFile(prPayloadsPath, JSON.stringify(prPayloads, null, 2), 'utf-8');
    
    this.logger.success(`Draft PR payloads saved to: ${prPayloadsPath}`);
    this.logger.info(`Generated ${prPayloads.length} draft PR(s)`);
  }

  /**
   * Identify mechanical fixes from issues
   */
  identifyMechanicalFixes() {
    const fixes = [];
    
    // Check for common fixable issues
    for (const violation of this.results.a11yViolations) {
      if (violation.id === 'image-alt' || violation.id === 'label' || violation.id === 'button-name') {
        fixes.push({
          type: 'a11y',
          title: `Fix a11y: ${violation.id}`,
          description: `Automated fix for accessibility violation: ${violation.description}`,
          priority: 'p2',
          files: [{
            path: 'identified during analysis',
            fix: `Add appropriate ${violation.id} attributes`,
          }],
        });
      }
    }
    
    return fixes;
  }

  /**
   * Generate draft issues
   */
  async generateDraftIssues() {
    this.logger.section('Generating Draft GitHub Issues');
    
    const OUTPUT_DIR = this.options.outDir;
    const issues = [];
    
    // Create issues for P0 and P1 items
    for (const priority of ['p0', 'p1']) {
      for (const issue of this.results.issues[priority]) {
        const draftIssue = {
          title: `[${priority.toUpperCase()}] ${issue.title}`,
          body: this.formatIssueBody(issue),
          labels: [priority, 'orchestration-failure', 'needs-triage'],
          priority,
        };
        
        issues.push(draftIssue);
        this.results.draftIssues.push(draftIssue);
      }
    }
    
    const issuesPath = path.join(OUTPUT_DIR, 'draft-github-issues.json');
    await fs.writeFile(issuesPath, JSON.stringify(issues, null, 2), 'utf-8');
    
    this.logger.success(`Draft issues saved to: ${issuesPath}`);
    this.logger.info(`Generated ${issues.length} draft issue(s)`);
  }

  /**
   * Format issue body
   */
  formatIssueBody(issue) {
    let body = `## Description\n\n${issue.description}\n\n`;
    
    if (issue.artifact) {
      body += `## Artifact\n\n\`${issue.artifact}\`\n\n`;
    }
    
    if (issue.file) {
      body += `## File\n\n\`${issue.file}\`\n\n`;
    }
    
    if (issue.snippet) {
      body += `## Evidence\n\n\`\`\`\n${issue.snippet}\n\`\`\`\n\n`;
    }
    
    if (issue.recommendation) {
      body += `## Recommended Fix\n\n${issue.recommendation}\n\n`;
    }
    
    body += `## Context\n\n`;
    body += `- **Run ID**: ${this.runId}\n`;
    body += `- **Detected**: ${new Date().toISOString()}\n`;
    body += `- **Workflow**: orchestrate-verification-and-sweep\n\n`;
    
    body += `---\n*Auto-generated by analyze-orchestration-run.mjs*\n`;
    
    return body;
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Print summary
   */
  printSummary() {
    this.logger.section('Analysis Complete');
    
    const OUTPUT_DIR = this.options.outDir;
    
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.bright}SUMMARY${colors.reset}`);
    console.log('='.repeat(60));
    
    console.log(`\n${colors.cyan}Run ID:${colors.reset} ${this.runId}`);
    console.log(`${colors.cyan}Status:${colors.reset} ${this.results.summary.status}`);
    
    console.log(`\n${colors.bright}Issues:${colors.reset}`);
    console.log(`  ${colors.red}P0 (Critical):${colors.reset} ${this.results.issues.p0.length}`);
    console.log(`  ${colors.yellow}P1 (High):${colors.reset} ${this.results.issues.p1.length}`);
    console.log(`  ${colors.blue}P2 (Medium):${colors.reset} ${this.results.issues.p2.length}`);
    
    console.log(`\n${colors.bright}Test Results:${colors.reset}`);
    console.log(`  Playwright: ${this.results.playwrightResults.passed}/${this.results.playwrightResults.total} passed`);
    console.log(`  A11y Violations: ${this.results.a11yViolations.length}`);
    
    console.log(`\n${colors.bright}Outputs:${colors.reset}`);
    console.log(`  📄 Consolidated Report: ${OUTPUT_DIR}/CONSOLIDATED_ANALYSIS_REPORT.md`);
    if (this.options.emitJson) {
      console.log(`  📊 JSON Summary: ${OUTPUT_DIR}/summary.json`);
    }
    if (this.options.summaryPath) {
      console.log(`  📝 Executive Summary: ${this.options.summaryPath}`);
    }
    console.log(`  📦 Draft PRs: ${OUTPUT_DIR}/draft-pr-payloads.json`);
    console.log(`  🎫 Draft Issues: ${OUTPUT_DIR}/draft-github-issues.json`);
    
    console.log(`\n${colors.bright}Recommendation:${colors.reset}`);
    
    const p0Count = this.results.issues.p0.length;
    const p1Count = this.results.issues.p1.length;
    
    if (p0Count > 0) {
      console.log(`  ${colors.red}🛑 BLOCK${colors.reset} - Critical issues must be resolved`);
    } else if (p1Count > 3) {
      console.log(`  ${colors.yellow}⚠️  CAUTION${colors.reset} - Multiple high-priority issues`);
    } else if (p1Count > 0) {
      console.log(`  ${colors.yellow}⚠️  REVIEW${colors.reset} - High-priority issues detected`);
    } else {
      console.log(`  ${colors.green}✅ PROCEED${colors.reset} - No critical issues`);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
  }

  /**
   * Run the complete analysis
   */
  async run() {
    try {
      this.logger.section(`Analyzing Run ID: ${this.runId}`);
      this.logger.debug(`Options: ${JSON.stringify(this.options, null, 2)}`);
      
      // Check prerequisites
      const hasGH = await this.checkGitHubCLI();
      if (!hasGH) {
        process.exit(1);
      }
      
      // Phase A: Fetch artifacts
      await this.getRunDetails();
      const artifacts = await this.listArtifacts();
      await this.downloadArtifacts(artifacts);
      
      // Phase B: Analyze
      await this.analyzeVerificationArtifacts();
      await this.analyzePlaywrightResults();
      await this.analyzeAccessibilityResults();
      
      // Phase C: Generate outputs
      await this.generateConsolidatedReport();
      await this.generateJsonSummary();
      await this.generateExecutiveSummary();
      await this.generateDraftPRs();
      await this.generateDraftIssues();
      
      // Print summary
      this.printSummary();
      
      // Compute exit code
      const exitCode = this.computeExitCode();
      
      this.logger.success('Analysis complete!');
      this.logger.info(`Exit code: ${exitCode} (based on --fail-on=${this.options.failOn})`);
      
      return exitCode;
      
    } catch (error) {
      this.logger.error(`Analysis failed: ${error.message}`);
      console.error(error);
      process.exit(1);
    }
  }
}

/**
 * Parse CLI arguments
 */
function parseArgs(args) {
  const options = {
    outDir: null,
    emitJson: false,
    summaryPath: null,
    failOn: 'P0',
    logLevel: 'info',
    useGH: true,
  };
  
  let runId = null;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--out-dir') {
      options.outDir = args[++i];
    } else if (arg === '--json') {
      options.emitJson = true;
    } else if (arg === '--summary') {
      options.summaryPath = args[++i];
    } else if (arg === '--fail-on') {
      options.failOn = args[++i];
    } else if (arg === '--log-level') {
      options.logLevel = args[++i];
    } else if (arg === '--no-gh') {
      options.useGH = false;
    } else if (!arg.startsWith('--') && !runId) {
      runId = arg;
    }
  }
  
  return { runId, options };
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
${colors.bright}Post-Run Orchestration Analysis Agent${colors.reset}

Analyzes GitHub Actions workflow runs and generates comprehensive reports.

${colors.cyan}Usage:${colors.reset}
  node scripts/analyze-orchestration-run.mjs <run-id> [options]

${colors.cyan}Arguments:${colors.reset}
  <run-id>                 GitHub Actions workflow run ID (required)

${colors.cyan}Options:${colors.reset}
  --out-dir <path>         Output directory for reports (default: analysis-output)
  --json                   Emit machine-readable summary.json file
  --summary <path>         Write executive summary markdown to specified path
  --fail-on <P0|P1|P2|none> Exit code policy based on severity (default: P0)
                           P0: exit 2 if P0 issues present
                           P1: exit 1 if P1 issues present
                           P2: exit 1 if P2 issues present
                           none: always exit 0
  --log-level <info|debug> Logging verbosity (default: info)
  --no-gh                  Force REST API artifact retrieval (stub mode)
  -h, --help               Show this help message

${colors.cyan}Examples:${colors.reset}
  # Basic usage
  node scripts/analyze-orchestration-run.mjs 19125388400

  # With JSON output and custom directory
  node scripts/analyze-orchestration-run.mjs 19125388400 --json --out-dir ./reports

  # With executive summary and debug logging
  node scripts/analyze-orchestration-run.mjs 19125388400 --summary ./exec-summary.md --log-level debug

  # Fail on P1 issues
  node scripts/analyze-orchestration-run.mjs 19125388400 --fail-on P1

${colors.cyan}Exit Codes:${colors.reset}
  0 - PROCEED: No critical issues or below threshold
  1 - CAUTION: High-priority issues detected
  2 - BLOCK: Critical P0 issues present

${colors.cyan}Requirements:${colors.reset}
  - GitHub CLI (gh) installed and authenticated
  - Valid run ID from orchestrate-verification-and-sweep workflow

${colors.cyan}Outputs:${colors.reset}
  - analysis-output/CONSOLIDATED_ANALYSIS_REPORT.md
  - analysis-output/summary.json (if --json specified)
  - Custom path (if --summary specified)
  - analysis-output/draft-pr-payloads.json
  - analysis-output/draft-github-issues.json

${colors.cyan}Artifacts Directory:${colors.reset}
  - temp-artifacts/ (downloaded artifacts, can be deleted after analysis)
    `);
    process.exit(0);
  }
  
  const { runId, options } = parseArgs(args);
  
  if (!runId) {
    console.error(`${colors.red}Error:${colors.reset} Run ID is required`);
    console.log('Usage: node scripts/analyze-orchestration-run.mjs <run-id> [options]');
    console.log('Run with --help for more information');
    process.exit(1);
  }
  
  if (!/^\d+$/.test(runId)) {
    console.error(`${colors.red}Error:${colors.reset} Invalid run ID. Must be a numeric value.`);
    console.log('Example: 19125388400');
    process.exit(1);
  }
  
  // Validate fail-on option
  const validFailOn = ['P0', 'P1', 'P2', 'NONE'];
  if (!validFailOn.includes(options.failOn.toUpperCase())) {
    console.error(`${colors.red}Error:${colors.reset} Invalid --fail-on value: ${options.failOn}`);
    console.log('Valid values: P0, P1, P2, none');
    process.exit(1);
  }
  
  // Validate log-level option
  const validLogLevels = ['info', 'debug'];
  if (!validLogLevels.includes(options.logLevel)) {
    console.error(`${colors.red}Error:${colors.reset} Invalid --log-level value: ${options.logLevel}`);
    console.log('Valid values: info, debug');
    process.exit(1);
  }
  
  const analyzer = new OrchestrationAnalyzer(runId, options);
  const exitCode = await analyzer.run();
  
  process.exit(exitCode);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

export { OrchestrationAnalyzer };
