# Post-Merge Verification Guide

> **Note**: This documentation uses PowerShell commands. Archived documentation may contain bash examples for historical reference.


## Quick Reference

### Run Verification

```powershell
# Quick run
npm run verify:post-merge

# Or directly
node scripts/post-merge-comprehensive-verification.js
```

### View Results

```powershell
# Main report
Get-Content logs/verification/verification-report.md

# Draft PRs
Get-Content logs/verification/artifacts/draft-prs.json

# Vulnerability details
Get-Content logs/verification/artifacts/npm-audit.json
```

## What Gets Verified

### 1. PR Acceptance Criteria (155-185)
- ✅ Checks git log for merged PRs
- ✅ Validates each PR has required checks
- ✅ Links to commit pointers

### 2. Database Migrations
- ✅ Prisma migrations exist and are valid
- ✅ ProfileLink model present
- ✅ User theme field present
- ✅ Legacy migration scripts exist

### 3. Security Implementation
- ✅ Security middleware files
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ Auth routes (2FA, privacy)
- ✅ Security test coverage

### 4. Content Security Policy
- ✅ CSP configuration detected
- ✅ Report-only mode status
- ✅ Directive validation
- ✅ Report URI configuration

### 5. Vulnerabilities
- ✅ npm audit for dependencies
- ✅ Secret pattern scanning
- ✅ Severity classification
- ✅ False positive filtering

### 6. Audit Logs
- ✅ Audit log middleware
- ✅ Database model verification
- ✅ Retention policies

### 7. Test Suites
- ✅ Unit tests execution
- ✅ Integration tests
- ✅ E2E Playwright tests
- ✅ Test artifacts collection

### 8. Recommendations
- ✅ Prioritized fix list
- ✅ Suggested branch names
- ✅ Affected files list

## Understanding the Report

### PR Verification Matrix

```markdown
| PR # | Status | Merged | Checks | Pointer |
|------|--------|--------|--------|---------|
| #155 | merged | ✅     | 3      | abc1234 |
```

**Status Values:**
- `merged` - PR successfully merged
- `unknown` - PR not found in git log
- `not_found` - No merge commit found

### Migration Status

```markdown
- [x] Prisma migrations exist
- [x] profile_links migration present
- [ ] Data integrity check
```

**Pass**: All required migrations present  
**Partial**: Some migrations missing  
**Fail**: Critical migrations missing

### Security Tests

```markdown
- [x] Security file: csrf.js
- [x] Security test: csrf.test.js
- [ ] Security test: auth.test.js
```

**Pass**: File/test exists  
**Warn**: File missing but not critical  
**Fail**: Critical security component missing

### Recommendations Priority

- **Critical**: Immediate action required (security)
- **High**: Fix within 1 week
- **Medium**: Fix within sprint
- **Low**: Nice to have

## Common Scenarios

### Scenario 1: After Merging PRs

```powershell
# Run verification
npm run verify:post-merge

# Review report
less logs/verification/verification-report.md

# If recommendations exist
Get-Content logs/verification/artifacts/draft-prs.json
```

### Scenario 2: Before Production Deploy

```powershell
# Clean previous results
rm -rf logs/verification

# Run fresh verification
npm run verify:post-merge

# Check for critical issues
Select-String -i "critical" logs/verification/verification-report.md
```

### Scenario 3: Security Audit

```powershell
# Run verification
npm run verify:post-merge

# Check secret scan results
Select-String -A 20 "Secret Scan" logs/verification/verification-report.md

# Review vulnerabilities
Get-Content logs/verification/artifacts/npm-audit.json
```

### Scenario 4: CI/CD Integration

The verification runs automatically on:
- Push to `main` branch
- Manual workflow dispatch

```yaml
# .github/workflows/post-merge-verification.yml
on:
  push:
    branches: [main]
  workflow_dispatch:
```

## Troubleshooting

### Issue: "npm audit failed"

**Solution**: Update package-lock.json

```powershell
npm install
npm audit fix
npm run verify:post-merge
```

### Issue: "No PRs detected"

**Cause**: PRs must mention #155-185 in commit message

**Check**:
```powershell
git log --all --Select-String="#155" --oneline
```

### Issue: "Tests timeout"

**Solution**: Increase timeout or skip tests

```javascript
// In post-merge-comprehensive-verification.js
// Increase timeout value
timeout: 300  // 5 minutes
```

### Issue: "Secret false positives"

**Solution**: Review and update patterns

```javascript
// In post-merge-comprehensive-verification.js
const patterns = [
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
  // Add exclusions or adjust patterns
]
```

## Advanced Usage

### Custom PR Range

Edit script to verify different range:

```javascript
// In validatePRAcceptanceCriteria()
const prRange = Array.from({ length: 31 }, (_, i) => 155 + i)
// Change to:
const prRange = Array.from({ length: 20 }, (_, i) => 200 + i) // 200-219
```

### Skip Certain Checks

Comment out steps in `main()`:

```javascript
async function main() {
  await validatePRAcceptanceCriteria()
  await validateMigrations()
  // await executeSecurityValidation()  // Skip security
  // ...
}
```

### Custom Report Format

Modify `generateReport()` to change output format:

```javascript
// Add custom sections
report += `\n## Custom Metrics\n`
report += `- Custom check: ${customValue}\n`
```

## Integration Examples

### Pre-commit Hook

```powershell
# .git/hooks/pre-push
#!/bin/bash
npm run verify:post-merge
if [ $? -ne 0 ]; then
  echo "Verification failed. Fix issues before pushing."
  exit 1
fi
```

### Jenkins Pipeline

```groovy
stage('Post-Merge Verification') {
  steps {
    sh 'npm run verify:post-merge'
    archiveArtifacts 'logs/verification/**'
  }
}
```

### GitLab CI

```yaml
verification:
  stage: test
  script:
    - npm install
    - npm run verify:post-merge
  artifacts:
    paths:
      - logs/verification/
    expire_in: 30 days
```

## Best Practices

### 1. Run After Major Merges

```powershell
# After merging feature branch
git checkout main
git pull origin main
npm run verify:post-merge
```

### 2. Review Security Findings Privately

```powershell
# Check for secrets (private review)
Get-Content logs/verification/artifacts/draft-prs.json | \
  jq '.[] | select(.priority=="critical")'
```

### 3. Track Verification History

```powershell
# Save report with timestamp
cp logs/verification/verification-report.md \
   docs/verification-reports/report-$(date +%Y%m%d).md
```

### 4. Automate Fix PRs

```powershell
# Use draft PRs as templates
Get-Content logs/verification/artifacts/draft-prs.json | \
  jq -r '.[0] | "git checkout -b \(.branch)"'
```

## Metrics and KPIs

Track these over time:

- **PR Merge Rate**: Merged PRs / Total PRs
- **Security Test Coverage**: Security tests / Total security files
- **Vulnerability Trend**: Vulnerabilities over time
- **Migration Health**: Pass rate of migration checks
- **Recommendation Backlog**: Open recommendations

## Support

- **Documentation**: `scripts/POST_MERGE_VERIFICATION_README.md`
- **Issues**: GitHub Issues
- **Examples**: This guide

---

**Version**: 1.0.0  
**Last Updated**: 2025-11-06  
**Task ID**: be-post-merge-comprehensive-verification-155-185
