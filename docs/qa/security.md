# Security Best Practices

Security guidelines and practices for Project Valine development.

## Overview

Security is everyone's responsibility. This guide covers:
- Dependency security
- Secret management
- Code security patterns
- CI/CD security checks

## Dependency Security

### Automated Audits

The `security-audit.yml` workflow runs:
- **Daily** at 8 AM UTC
- **On PR** when package.json changes
- **On push** to main branch
- **Manual** via workflow_dispatch

**What it checks**:
- Known vulnerabilities in dependencies (npm audit)
- Secret patterns in code
- Outdated packages

### Manual Dependency Checks

```bash
# Run npm audit
npm audit

# See only high/critical
npm audit --audit-level=high

# Get JSON output for parsing
npm audit --json

# Check specific package
npm view <package-name> versions
```

### Understanding Severity Levels

| Severity | Description | Action |
|----------|-------------|--------|
| **Critical** | Exploitable, high impact | Fix immediately |
| **High** | Likely exploitable | Fix within days |
| **Moderate** | May be exploitable | Fix within weeks |
| **Low** | Low impact or hard to exploit | Fix during maintenance |
| **Info** | Informational only | Review as needed |

### Fixing Vulnerabilities

#### Automatic Fixes
```bash
# Try automatic fix (may update dependencies)
npm audit fix

# See what would be fixed without changing anything
npm audit fix --dry-run

# Force fix (may introduce breaking changes)
npm audit fix --force
```

**⚠️ Warning**: Always test after `npm audit fix`, especially with `--force`

#### Manual Fixes
```bash
# Update specific package
npm install package@latest

# Check if update fixes vulnerability
npm audit

# If vulnerability persists, check if it's in a transitive dependency
npm ls vulnerable-package
```

#### When Fix Isn't Available

1. **Check if it affects your code**:
   - Is the vulnerable function used?
   - Is the package in devDependencies only?

2. **Workarounds**:
   - Use different package (preferred)
   - Override with npm resolutions (package.json)
   - Document accepted risk

3. **Document the decision**:
   ```markdown
   ## Security Exception
   
   **Package**: vulnerable-package@1.2.3
   **Vulnerability**: CVE-2024-XXXXX
   **Severity**: Moderate
   **Reason**: Not exploitable in our use case (used only in tests)
   **Review Date**: 2025-11-05
   **Reviewer**: @username
   ```

### Dependency Best Practices

**DO**:
- ✅ Keep dependencies up to date
- ✅ Review dependency changes in PRs
- ✅ Use exact versions for critical packages
- ✅ Audit new dependencies before adding
- ✅ Remove unused dependencies
- ✅ Use npm ci in CI/CD (not npm install)

**DON'T**:
- ❌ Ignore security warnings
- ❌ Add dependencies without checking size/security
- ❌ Use deprecated packages
- ❌ Run npm install as root
- ❌ Commit package-lock.json conflicts without resolving

### Checking Before Adding

```bash
# Before: npm install new-package

# Check size
npx bundlephobia new-package

# Check for known issues
npm view new-package

# Check recent activity
# Visit github.com/owner/new-package

# Check security advisories
# Visit github.com/advisories?query=new-package

# Then install
npm install new-package
```

## Secret Management

### What Are Secrets?

- API keys
- Access tokens
- Private keys
- Passwords
- Database URLs
- OAuth credentials

### Never Commit Secrets

**❌ Bad Examples**:
```js
// NEVER DO THIS
const API_KEY = 'sk_live_1234567890abcdef';
const DB_URL = 'mongodb://user:password@host:27017/db';
const SECRET = 'my-secret-key-12345';
```

**✅ Good Examples**:
```js
// Use environment variables
const API_KEY = import.meta.env.VITE_API_KEY;
const DB_URL = process.env.DATABASE_URL;

// With fallback for development
const API_KEY = import.meta.env.VITE_API_KEY || 'dev_key_for_testing';
```

### Environment Variables

#### Local Development (.env)
```bash
# .env (ignored by git)
VITE_API_BASE=http://localhost:3000
VITE_SANITY_PROJECT_ID=your-project-id
VITE_SANITY_DATASET=production

# Never commit .env
# Commit .env.example instead
```

#### .env.example
```bash
# .env.example (committed to git)
VITE_API_BASE=https://api.example.com
VITE_SANITY_PROJECT_ID=your-project-id
VITE_SANITY_DATASET=production
# Copy this file to .env and fill in your values
```

#### CI/CD Secrets (GitHub Actions)
```yaml
# .github/workflows/workflow.yml
jobs:
  build:
    steps:
      - name: Build
        env:
          VITE_API_KEY: ${{ secrets.API_KEY }}
        run: npm run build
```

**Setting Secrets**:
1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add name and value
4. Use in workflows with `${{ secrets.SECRET_NAME }}`

### Secret Scanning

Our CI runs automated secret scanning on every commit:

**Patterns detected**:
- API keys (api_key, api-key, etc.)
- Access tokens
- Private keys
- Database URLs with credentials
- AWS keys (AKIA...)
- OAuth tokens

**If secrets are found**:
1. Immediately revoke/rotate the secret
2. Remove from git history (see below)
3. Add to .gitignore
4. Use environment variables instead

### Removing Secrets from Git History

**⚠️ Warning**: Rewriting history affects all collaborators

```bash
# Using git-filter-repo (recommended)
pip install git-filter-repo
git filter-repo --path path/to/secret/file --invert-paths

# Or using BFG Repo-Cleaner
java -jar bfg.jar --delete-files secret-file.txt

# After cleanup:
git push --force
```

**Then**:
1. Notify all collaborators to re-clone
2. Rotate the exposed secret immediately
3. Review access logs for unauthorized use

### Preventing Secret Commits

#### Pre-commit Hook
```bash
# Install husky
npm install --save-dev husky

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run check-secrets"
```

```json
// package.json
{
  "scripts": {
    "check-secrets": "git diff --cached --name-only | xargs grep -i 'api_key\\|secret\\|password' && exit 1 || exit 0"
  }
}
```

#### Git Secrets Tool
```bash
# Install git-secrets
# macOS: brew install git-secrets
# Ubuntu: apt-get install git-secrets

# Set up for repo
git secrets --install
git secrets --register-aws

# Scan
git secrets --scan
```

## Code Security

### Input Validation

**Always validate and sanitize user input**:

```jsx
// ❌ Vulnerable to XSS
function UserProfile({ bio }) {
  return <div dangerouslySetInnerHTML={{ __html: bio }} />;
}

// ✅ Safe - React escapes by default
function UserProfile({ bio }) {
  return <div>{bio}</div>;
}

// ✅ If HTML is needed, sanitize first
import DOMPurify from 'dompurify';

function UserProfile({ bio }) {
  const cleanBio = DOMPurify.sanitize(bio);
  return <div dangerouslySetInnerHTML={{ __html: cleanBio }} />;
}
```

### API Security

#### Authentication Headers
```js
// ✅ Use Authorization header
const response = await fetch('/api/user', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

// ❌ Don't pass tokens in URL
// GET /api/user?token=abc123
```

#### CORS Configuration
```js
// Server-side (example)
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

// Not: origin: '*' in production
```

#### Rate Limiting
```js
// Implement on API side
// Example: express-rate-limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### XSS Prevention

React provides good default protection, but be careful with:

**Dangerous patterns**:
```jsx
// ❌ Direct HTML insertion
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ❌ Direct href from user input
<a href={userProvidedURL}>Link</a>

// ❌ eval() or new Function()
eval(userCode);

// ❌ innerHTML
element.innerHTML = userContent;
```

**Safe patterns**:
```jsx
// ✅ Let React handle escaping
<div>{userContent}</div>

// ✅ Validate URLs
const isSafeUrl = (url) => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

{isSafeUrl(url) && <a href={url}>Link</a>}

// ✅ Sanitize HTML if needed
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(dirty);
```

### CSRF Prevention

For state-changing operations:

```js
// Backend should verify origin
app.use((req, res, next) => {
  const origin = req.get('origin');
  if (ALLOWED_ORIGINS.includes(origin)) {
    next();
  } else {
    res.status(403).send('Forbidden');
  }
});

// Use CSRF tokens for forms
// (Many frameworks handle this automatically)
```

### SQL Injection Prevention

If using raw SQL (prefer ORMs):

```js
// ❌ Vulnerable
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ Use parameterized queries
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId]);

// ✅ Or use ORM (Prisma, TypeORM, etc.)
const user = await prisma.user.findUnique({
  where: { id: userId },
});
```

## CI/CD Security

### Workflow Permissions

Limit workflow permissions:

```yaml
# .github/workflows/workflow.yml
permissions:
  contents: read  # Only read access by default
  actions: read
  
# Request write only when needed
jobs:
  specific-job:
    permissions:
      contents: write  # Only for this job
```

### Secrets in Workflows

```yaml
# ✅ Good
env:
  API_KEY: ${{ secrets.API_KEY }}

# ❌ Bad - exposes in logs
run: echo "API_KEY=${{ secrets.API_KEY }}"

# ✅ Good - use secret masking
run: |
  echo "::add-mask::${{ secrets.API_KEY }}"
  echo "Key is now masked in logs"
```

### Third-Party Actions

```yaml
# ✅ Pin to specific commit (most secure)
uses: actions/checkout@8f4b7f84864484a7bf31766abe9204da3cbe65b3

# ✅ Pin to major version (good balance)
uses: actions/checkout@v4

# ❌ Avoid latest (can break or introduce vulnerabilities)
uses: actions/checkout@main
```

### Dependabot

Enable Dependabot for automated security updates:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

## Security Checklist

### For Developers

**Before committing**:
- [ ] No secrets in code
- [ ] User input validated/sanitized
- [ ] Dependencies audited (npm audit)
- [ ] No console.logs with sensitive data
- [ ] .env files in .gitignore

**In code**:
- [ ] Use environment variables for config
- [ ] Validate all user input
- [ ] Sanitize HTML from user content
- [ ] Use HTTPS for API calls
- [ ] Handle errors without exposing details

### For Code Reviews

- [ ] No secrets visible in diff
- [ ] New dependencies checked for security
- [ ] User input properly validated
- [ ] API calls use authentication
- [ ] Error messages don't leak information

### For Production Deploys

- [ ] All secrets configured in environment
- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Monitoring and logging active
- [ ] Latest security patches applied

## Security Headers

Configure on server/CDN:

```
# Content Security Policy
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'

# Prevent clickjacking
X-Frame-Options: SAMEORIGIN

# Prevent MIME sniffing
X-Content-Type-Options: nosniff

# Force HTTPS
Strict-Transport-Security: max-age=31536000; includeSubDomains

# XSS Protection (deprecated but still helpful)
X-XSS-Protection: 1; mode=block

# Referrer Policy
Referrer-Policy: strict-origin-when-cross-origin
```

For Vite, add via plugin or hosting platform configuration.

## Incident Response

### If Security Issue Discovered

1. **Assess severity**:
   - Can it be exploited?
   - What data is at risk?
   - Who is affected?

2. **Immediate actions**:
   - Rotate compromised credentials
   - Block attack vectors
   - Document timeline

3. **Fix and deploy**:
   - Create fix in private (don't disclose in public PR)
   - Test thoroughly
   - Deploy to production

4. **Communicate**:
   - Notify affected users
   - Publish security advisory
   - Document lessons learned

### Reporting Security Issues

**DO NOT** open public issues for security vulnerabilities.

Instead:
1. Email security contact (if available)
2. Use GitHub private security advisory
3. Provide details privately

## Resources

### Tools
- **npm audit**: Built into npm
- **Snyk**: snyk.io (vulnerability scanning)
- **Dependabot**: GitHub feature
- **OWASP ZAP**: owasp.org/www-project-zap/
- **git-secrets**: github.com/awslabs/git-secrets

### Standards
- **OWASP Top 10**: owasp.org/www-project-top-ten/
- **CWE**: Common Weakness Enumeration
- **CVE**: Common Vulnerabilities and Exposures

### Learning
- **OWASP**: owasp.org
- **Web Security Academy**: portswigger.net/web-security
- **Security Headers**: securityheaders.com

### Advisories
- **GitHub Advisories**: github.com/advisories
- **npm Advisories**: npmjs.com/advisories
- **Snyk Vulnerability DB**: snyk.io/vuln

---

## Project Valine Specifics

### Current Security Measures
- ✅ Daily dependency audits (security-audit.yml)
- ✅ Secret pattern scanning
- ✅ .env files in .gitignore
- ✅ Environment variable usage

### Identified Needs
- [ ] Set up Dependabot
- [ ] Configure security headers
- [ ] Add rate limiting to API
- [ ] Implement CSP (Content Security Policy)
- [ ] Set up security monitoring

### Contact
For security issues, contact: [Add security contact]

---

**Last Updated**: 2025-11-05  
**Maintained By**: Operational Readiness Team
