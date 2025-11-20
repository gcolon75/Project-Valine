#!/usr/bin/env node

/**
 * Secret Audit Script
 * 
 * Scans the repository for accidentally committed secrets and sensitive data.
 * Detects patterns like AWS keys, GitHub tokens, Discord tokens, high-entropy strings, etc.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const REPO_ROOT = path.resolve(__dirname, '..');
const ALLOWLIST_FILE = path.join(REPO_ROOT, '.secret-allowlist');

// Directories to ignore
const IGNORE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '.venv',
  '__pycache__',
  'logs',
  '.serverless',
  'layers',
  'unzipped',
  'zip_inspect'
];

// File extensions to scan
const SCAN_EXTENSIONS = [
  '.js', '.mjs', '.ts', '.tsx', '.jsx',
  '.json', '.yml', '.yaml', '.md',
  '.txt', '.env', '.config',
  '.sh', '.bash', '.ps1'
];

// Detection patterns
const PATTERNS = {
  awsAccessKey: {
    pattern: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
    description: 'AWS Access Key',
    severity: 'critical'
  },
  awsSecretKey: {
    pattern: /aws(.{0,20})?['\"][0-9a-zA-Z/+]{40}['\"]/gi,
    description: 'AWS Secret Key',
    severity: 'critical'
  },
  githubPat: {
    pattern: /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,255}\b/g,
    description: 'GitHub Personal Access Token',
    severity: 'critical'
  },
  githubPatClassic: {
    pattern: /\bgithub_pat_[A-Za-z0-9_]{82}\b/g,
    description: 'GitHub Personal Access Token (classic)',
    severity: 'critical'
  },
  discordToken: {
    pattern: /[MN][A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}/g,
    description: 'Discord Bot Token',
    severity: 'critical'
  },
  discordWebhook: {
    pattern: /https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+/gi,
    description: 'Discord Webhook URL',
    severity: 'high'
  },
  genericSecret: {
    pattern: /(?:secret|password|passwd|pwd|token|api[_-]?key)[\s]*[=:]\s*['\"]([^'\"]{8,})['\""]/gi,
    description: 'Generic Secret Assignment',
    severity: 'medium'
  },
  privateKey: {
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
    description: 'Private Key',
    severity: 'critical'
  },
  jwtToken: {
    pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    description: 'JWT Token',
    severity: 'high'
  },
  connectionString: {
    pattern: /(?:postgres|mysql|mongodb):\/\/[^:]+:[^@]+@[^\/]+\/\w+/gi,
    description: 'Database Connection String with Credentials',
    severity: 'critical'
  }
};

// Calculate Shannon entropy (measure of randomness)
function calculateEntropy(str) {
  if (!str) return 0;
  
  const freq = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }
  
  let entropy = 0;
  const len = str.length;
  
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  
  return entropy;
}

// Check if string has high entropy (likely random/encoded)
function hasHighEntropy(str, threshold = 4.5) {
  if (str.length < 20) return false; // Too short to be meaningful
  if (str.length > 100) return false; // Too long, likely not a secret
  
  const entropy = calculateEntropy(str);
  return entropy >= threshold;
}

// Load allowlist from file
function loadAllowlist() {
  try {
    if (!fs.existsSync(ALLOWLIST_FILE)) {
      return [];
    }
    
    const content = fs.readFileSync(ALLOWLIST_FILE, 'utf-8');
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
  } catch (error) {
    console.warn(`Warning: Could not load allowlist: ${error.message}`);
    return [];
  }
}

// Check if a finding is allowlisted
function isAllowlisted(finding, allowlist) {
  const key = `${finding.file}:${finding.line}:${finding.match}`;
  return allowlist.some(pattern => {
    // Exact match
    if (pattern === key) return true;
    
    // File-based allowlist (file:*)
    if (pattern.endsWith(':*') && key.startsWith(pattern.slice(0, -1))) {
      return true;
    }
    
    // Pattern-based allowlist (allows wildcards)
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(key);
  });
}

// Scan a single file for secrets
function scanFile(filePath, allowlist) {
  const findings = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Check each pattern
    for (const [name, config] of Object.entries(PATTERNS)) {
      const matches = content.matchAll(config.pattern);
      
      for (const match of matches) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const finding = {
          file: path.relative(REPO_ROOT, filePath),
          line: lineNumber,
          column: match.index - content.lastIndexOf('\n', match.index),
          match: match[0],
          type: name,
          description: config.description,
          severity: config.severity
        };
        
        if (!isAllowlisted(finding, allowlist)) {
          findings.push(finding);
        }
      }
    }
    
    // High entropy check (separate pass to avoid duplicate detections)
    lines.forEach((line, idx) => {
      // Skip comments and common non-secret patterns
      if (line.trim().startsWith('//') || line.trim().startsWith('#')) {
        return;
      }
      
      // Extract quoted strings and check entropy
      const stringMatches = line.matchAll(/['"](.*?)['"]/g);
      for (const match of stringMatches) {
        const str = match[1];
        if (hasHighEntropy(str)) {
          const finding = {
            file: path.relative(REPO_ROOT, filePath),
            line: idx + 1,
            column: match.index,
            match: str.slice(0, 50), // Truncate for display
            type: 'highEntropy',
            description: 'High-entropy string (possible secret)',
            severity: 'low',
            entropy: calculateEntropy(str).toFixed(2)
          };
          
          if (!isAllowlisted(finding, allowlist)) {
            findings.push(finding);
          }
        }
      }
    });
  } catch (error) {
    // Skip files that can't be read (binary, permissions, etc.)
    if (error.code !== 'EISDIR') {
      console.warn(`Warning: Could not scan ${filePath}: ${error.message}`);
    }
  }
  
  return findings;
}

// Recursively scan directory
function scanDirectory(dir, allowlist) {
  const findings = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Skip ignored directories
      if (entry.isDirectory()) {
        if (IGNORE_DIRS.includes(entry.name)) {
          continue;
        }
        findings.push(...scanDirectory(fullPath, allowlist));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (SCAN_EXTENSIONS.includes(ext) || entry.name.startsWith('.env')) {
          findings.push(...scanFile(fullPath, allowlist));
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not scan directory ${dir}: ${error.message}`);
  }
  
  return findings;
}

// Format findings for output
function formatFindings(findings) {
  if (findings.length === 0) {
    return {
      summary: '✅ No secrets detected',
      findings: [],
      count: 0
    };
  }
  
  // Group by severity
  const bySeverity = {
    critical: findings.filter(f => f.severity === 'critical'),
    high: findings.filter(f => f.severity === 'high'),
    medium: findings.filter(f => f.severity === 'medium'),
    low: findings.filter(f => f.severity === 'low')
  };
  
  return {
    summary: `⚠️  ${findings.length} potential secret(s) detected`,
    bySeverity,
    findings,
    count: findings.length
  };
}

// Main function
function main() {
  console.log('🔍 Secret Audit - Scanning repository for secrets...\n');
  
  const allowlist = loadAllowlist();
  console.log(`Loaded ${allowlist.length} allowlist entries\n`);
  
  const findings = scanDirectory(REPO_ROOT, allowlist);
  const result = formatFindings(findings);
  
  // Output JSON if requested
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.count > 0 ? 1 : 0);
  }
  
  // Human-readable output
  console.log(result.summary);
  console.log('');
  
  if (result.count > 0) {
    // Show findings by severity
    for (const [severity, items] of Object.entries(result.bySeverity)) {
      if (items.length === 0) continue;
      
      const emoji = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '⚪'
      }[severity];
      
      console.log(`${emoji} ${severity.toUpperCase()}: ${items.length} finding(s)`);
      
      for (const finding of items) {
        console.log(`  ${finding.file}:${finding.line}:${finding.column}`);
        console.log(`    Type: ${finding.description}`);
        console.log(`    Match: ${finding.match.slice(0, 60)}${finding.match.length > 60 ? '...' : ''}`);
        if (finding.entropy) {
          console.log(`    Entropy: ${finding.entropy}`);
        }
        console.log('');
      }
    }
    
    console.log('\n💡 To allowlist false positives, add entries to .secret-allowlist');
    console.log('   Format: file:line:match or file:* for entire file\n');
    
    process.exit(1);
  } else {
    console.log('✅ No secrets detected - repository is clean!\n');
    process.exit(0);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { scanFile, scanDirectory, calculateEntropy, hasHighEntropy, PATTERNS };
