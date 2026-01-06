# Security Agent

**Status**: ✅ Specification Complete  
**Date**: December 2025  
**Type**: Specialized Agent

## Overview

The Security Agent provides automated security scanning, vulnerability detection, and compliance monitoring for the Project-Valine platform. It handles secrets scanning, dependency vulnerability analysis, and authentication issue detection.

## Capabilities

### 1. Secrets Scanning
- **Code Repository Scanning**: Detect hardcoded secrets in source code
- **Environment File Validation**: Verify `.env` files are not committed
- **API Key Detection**: Identify exposed API keys, tokens, and credentials
- **Pattern Matching**: Custom regex patterns for project-specific secrets
- **Pre-commit Hooks**: Block commits containing secrets

### 2. Dependency Vulnerability Analysis
- **NPM Audit**: Scan JavaScript dependencies for known vulnerabilities
- **CVE Database Integration**: Check against National Vulnerability Database
- **SBOM Generation**: Create Software Bill of Materials
- **Transitive Dependency Scanning**: Analyze nested dependencies
- **Update Recommendations**: Suggest safe version upgrades

### 3. Authentication Security
- **Session Analysis**: Monitor session management security
- **Token Validation**: Verify JWT implementation and expiration
- **CSRF Protection**: Ensure CSRF tokens are properly implemented
- **Rate Limiting**: Verify rate limiting on auth endpoints
- **Brute Force Detection**: Identify potential brute force attempts

## Vulnerability Severity Levels

| Level | Description | Action Required | SLA |
|-------|-------------|-----------------|-----|
| Critical | Remote code execution, auth bypass | Immediate fix | 24 hours |
| High | Data exposure, privilege escalation | Priority fix | 72 hours |
| Medium | XSS, CSRF, information disclosure | Scheduled fix | 7 days |
| Low | Minor issues, best practice violations | Best effort | 30 days |

## Scanning Targets

### Source Code
```
src/               # Frontend source
server/            # Backend source
api/               # API layer
serverless/        # Lambda functions
scripts/           # Build/deploy scripts
```

### Configuration Files
```
.env*              # Environment files
*.config.js        # Configuration
serverless.yml     # Serverless config
package*.json      # Dependencies
```

### Excluded Paths
```
node_modules/      # Dependencies (scanned separately)
.git/              # Git directory
dist/              # Build output
coverage/          # Test coverage
```

## Secret Patterns

### Built-in Patterns

| Pattern Name | Description | Example |
|--------------|-------------|---------|
| AWS Keys | AWS access key IDs | `AKIA...` |
| AWS Secrets | AWS secret access keys | 40-char base64 |
| GitHub Tokens | GitHub personal access tokens | `ghp_...` |
| JWT Tokens | JSON Web Tokens | `eyJ...` |
| API Keys | Generic API keys | `api_key_...` |
| Private Keys | RSA/EC private keys | `-----BEGIN...` |
| Database URLs | Connection strings with credentials | `postgres://user:pass@...` |

### Custom Patterns

```javascript
// .secret-patterns.json
{
  "patterns": [
    {
      "name": "VALINE_API_KEY",
      "pattern": "valine_[a-zA-Z0-9]{32}",
      "severity": "high"
    },
    {
      "name": "DISCORD_WEBHOOK",
      "pattern": "https://discord\\.com/api/webhooks/[0-9]+/[a-zA-Z0-9_-]+",
      "severity": "high"
    }
  ]
}
```

## Dependency Scanning

### Supported Ecosystems

| Ecosystem | Tool | Config File |
|-----------|------|-------------|
| npm | npm audit | package.json, package-lock.json |
| pip | safety | requirements.txt |
| Go | govulncheck | go.mod |
| Docker | Trivy | Dockerfile |

### Vulnerability Database Sources

- GitHub Advisory Database
- National Vulnerability Database (NVD)
- OSS Index (Sonatype)
- Snyk Vulnerability Database

## Public API

### `scanSecrets(options: ScanOptions): ScanResult`

Scans repository for exposed secrets.

```typescript
interface ScanOptions {
  paths: string[];           // Paths to scan
  exclude?: string[];        // Patterns to exclude
  customPatterns?: Pattern[];// Additional patterns
  ignoreFile?: string;       // Path to allowlist file
}

interface ScanResult {
  findings: Finding[];
  scannedFiles: number;
  duration: number;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

interface Finding {
  file: string;
  line: number;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  match: string;             // Redacted match
  recommendation: string;
}
```

### `auditDependencies(options: AuditOptions): AuditResult`

Audits dependencies for known vulnerabilities.

```typescript
interface AuditOptions {
  ecosystem: 'npm' | 'pip' | 'go';
  production?: boolean;      // Only production deps
  ignoreAdvisories?: string[]; // Advisory IDs to ignore
}

interface AuditResult {
  vulnerabilities: Vulnerability[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  fixAvailable: boolean;
  recommendations: Recommendation[];
}

interface Vulnerability {
  id: string;                // CVE or advisory ID
  package: string;
  installedVersion: string;
  patchedVersion: string | null;
  severity: string;
  title: string;
  description: string;
  references: string[];
}
```

### `checkAuthSecurity(options: AuthCheckOptions): AuthCheckResult`

Analyzes authentication implementation for security issues.

```typescript
interface AuthCheckOptions {
  endpoints?: string[];      // Auth endpoints to check
  checkSession?: boolean;
  checkTokens?: boolean;
  checkRateLimiting?: boolean;
}

interface AuthCheckResult {
  issues: AuthIssue[];
  recommendations: string[];
  score: number;             // 0-100 security score
  breakdown: {
    session: number;
    tokens: number;
    rateLimiting: number;
    csrf: number;
  };
}
```

## Usage Examples

### Secrets Scanning

```javascript
import { SecurityAgent } from '@valine/agents';

const agent = new SecurityAgent();

// Scan for secrets
const secretsScan = await agent.scanSecrets({
  paths: ['src/', 'server/', 'api/'],
  exclude: ['**/*.test.js', '**/mocks/**'],
  ignoreFile: '.secret-allowlist'
});

if (secretsScan.findings.length > 0) {
  console.error('❌ Secrets detected!');
  secretsScan.findings.forEach(finding => {
    console.error(`  ${finding.file}:${finding.line} - ${finding.type}`);
  });
  process.exit(1);
}
```

### Dependency Audit

```javascript
// Audit npm dependencies
const audit = await agent.auditDependencies({
  ecosystem: 'npm',
  production: true,
  ignoreAdvisories: ['GHSA-xxxxx'] // Known false positive
});

console.log(`Found ${audit.summary.total} vulnerabilities`);
console.log(`  Critical: ${audit.summary.critical}`);
console.log(`  High: ${audit.summary.high}`);

if (audit.fixAvailable) {
  console.log('\nRun `npm audit fix` to resolve issues');
}
```

### Auth Security Check

```javascript
// Check authentication security
const authCheck = await agent.checkAuthSecurity({
  endpoints: ['/auth/login', '/auth/register', '/auth/reset-password'],
  checkSession: true,
  checkTokens: true,
  checkRateLimiting: true
});

console.log(`Security Score: ${authCheck.score}/100`);

if (authCheck.issues.length > 0) {
  authCheck.issues.forEach(issue => {
    console.warn(`⚠️ ${issue.type}: ${issue.description}`);
  });
}
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM

jobs:
  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Scan for secrets
        run: npm run security:secrets
        
      - name: Upload results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: secrets-scan-report
          path: reports/secrets-scan.json

  dependency-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Audit dependencies
        run: npm audit --audit-level=high
        
      - name: Generate SBOM
        run: npm run security:sbom
```

## Configuration

### Environment Variables

```powershell
# Security Agent Configuration
SECURITY_SCAN_ENABLED=true
SECURITY_FAIL_ON_HIGH=true
SECURITY_FAIL_ON_CRITICAL=true

# Secrets Scanning
SECRETS_SCAN_PATHS=src,server,api
SECRETS_ALLOWLIST_FILE=.secret-allowlist
SECRETS_CUSTOM_PATTERNS_FILE=.secret-patterns.json

# Dependency Scanning
DEPENDENCY_SCAN_PRODUCTION_ONLY=false
DEPENDENCY_IGNORE_ADVISORIES=

# Authentication Checks
AUTH_CHECK_ENDPOINTS=/auth/login,/auth/register
AUTH_RATE_LIMIT_THRESHOLD=100
```

### Allowlist File

```yaml
# .secret-allowlist
# Paths and patterns that are allowed/ignored

# Test fixtures
tests/fixtures/*

# Example files
*.example
*.sample

# Specific false positives
src/constants/error-codes.js:42  # Not a real API key
docs/examples/auth-flow.md:15   # Documentation example
```

## Compliance Mapping

| Framework | Controls | Coverage |
|-----------|----------|----------|
| OWASP Top 10 | A01-A10 | 90% |
| SOC 2 | CC6, CC7 | 85% |
| PCI DSS | Req 3, 6 | 80% |
| GDPR | Art. 32 | 75% |

## Safety Constraints

1. **Read-Only Operations**: Agent only reads and reports, never modifies code
2. **No Network Access**: Scans local files only, no external data exfiltration
3. **Redacted Output**: Sensitive findings are partially redacted in reports
4. **Audit Logging**: All scans are logged for compliance
5. **Rate Limiting**: Scans are throttled to prevent resource exhaustion

## Metrics and Reporting

### Key Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Secrets Found | Number of exposed secrets | 0 |
| Critical Vulns | Critical vulnerabilities | 0 |
| High Vulns | High-severity vulnerabilities | < 5 |
| Security Score | Overall security posture | > 85 |
| Scan Duration | Time to complete scan | < 5 min |

### Report Generation

```javascript
// Generate security report
const report = await agent.generateReport({
  format: 'html',        // html, json, markdown
  includeDetails: true,
  outputPath: 'reports/security-report.html'
});
```

## Troubleshooting

### Common Issues

**Issue**: Too many false positives
- Review and update `.secret-allowlist`
- Adjust pattern sensitivity
- Check for test data in scanned paths

**Issue**: Slow scan performance
- Exclude `node_modules/` and build directories
- Use `--production` flag for dependency audits
- Run incremental scans on changed files

**Issue**: Missing vulnerabilities
- Update vulnerability database
- Check ignored advisories list
- Verify all ecosystems are scanned

## Future Enhancements

- [ ] SAST (Static Application Security Testing)
- [ ] DAST (Dynamic Application Security Testing)
- [ ] Container image scanning
- [ ] Infrastructure as Code scanning
- [ ] Real-time monitoring integration
- [ ] Security score trending

## Related Documentation

- [Security Policy](/SECURITY.md)
- [Account Creation Security](/docs/ACCOUNT_CREATION_SECURITY.md)
- [Backend Agent Hardening](/docs/agents/hardening-implementation.md)
- [Observability Guide](/docs/OBSERVABILITY_V2.md)

---

**Status**: ✅ Specification Complete  
**Owner**: Security Team  
**Review Cycle**: Monthly
