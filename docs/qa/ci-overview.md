# CI/CD Overview

This document provides an overview of the Continuous Integration and Continuous Deployment (CI/CD) workflows for Project Valine.

## Table of Contents

- [Workflow Summary](#workflow-summary)
- [Quality Gates](#quality-gates)
- [Workflow Triggers](#workflow-triggers)
- [Local Development](#local-development)
- [Troubleshooting](#troubleshooting)

## Workflow Summary

### Core CI Workflows

#### 1. Pull Request Check (`ci-pr-check.yml`)
**Purpose:** Validates every PR before merge

**Jobs:**
- **Lint & Format Check**: Runs linting if configured
- **Test Suite**: Runs 107+ unit and integration tests with coverage
- **Build Check**: Validates production build and checks bundle size
- **PR Status Summary**: Aggregates results and provides summary

**When it runs:**
- On PR open, synchronize, or reopen
- Targets: `main` and `develop` branches

**Success criteria:**
- All tests pass
- Build completes successfully
- Code coverage meets thresholds (~45% current baseline)

---

#### 2. Accessibility Audit (`accessibility-audit.yml`)
**Purpose:** Automated accessibility testing using axe-core

**Coverage:**
- **Marketing pages**: Home, Features, About, Login, Join
- **WCAG Standards**: 2.0 Level A/AA and 2.1 Level A/AA
- **Impact levels**: Critical, Serious, Moderate, Minor

**When it runs:**
- On PR with changes to source files
- Weekly schedule (Mondays at 9 AM UTC)
- Manual dispatch

**Success criteria:**
- No critical accessibility violations
- Serious violations documented and prioritized
- See [Accessibility Checklist](./a11y-checklist.md) for guidance

---

#### 3. Lighthouse CI (`lighthouse-ci.yml`)
**Purpose:** Performance monitoring and budgets

**Metrics tracked:**
- Performance score (target: ≥ 80)
- First Contentful Paint (FCP ≤ 2.0s)
- Largest Contentful Paint (LCP ≤ 3.0s)
- Cumulative Layout Shift (CLS ≤ 0.1)
- Total Blocking Time (TBT ≤ 300ms)
- Speed Index (≤ 3.0s)

**Pages audited:**
- Marketing routes: `/`, `/features`, `/about-us`, `/login`, `/join`

**When it runs:**
- On PR with changes to source files
- Weekly schedule (Wednesdays at 9 AM UTC)
- Manual dispatch

**Success criteria:**
- All performance budgets met
- No regressions in Core Web Vitals
- See [Lighthouse Guide](./lighthouse.md) for details

---

#### 4. Visual Regression Testing (`visual-regression.yml`)
**Purpose:** Detect unintended visual changes

**Coverage:**
- **Pages**: Home, Features, About, Login, Join
- **Viewports**: Mobile (375px), Tablet (768px), Desktop (1280px)
- **Themes**: Light and Dark mode

**When it runs:**
- On PR with changes to UI files
- Manual dispatch for baseline updates

**Success criteria:**
- No unexpected visual differences
- Intentional changes documented
- Baselines updated when needed

---

#### 5. Bundle Analysis (`bundle-analysis.yml`)
**Purpose:** Monitor and control bundle sizes

**Budgets:**
- Total JavaScript: 300 KB
- Total CSS: 60 KB
- Largest JS file: 250 KB
- Largest CSS file: 50 KB

**When it runs:**
- On PR with changes to source or config
- Weekly schedule (Fridays at 9 AM UTC)
- Manual dispatch

**Success criteria:**
- Bundle sizes within budgets
- No significant size increases
- See [Bundle Optimization](./bundle-optimization.md) for tips

---

#### 6. Security & Dependency Audit (`security-audit.yml`)
**Purpose:** Identify and track security vulnerabilities

**Checks:**
- **NPM Audit**: Known vulnerabilities in dependencies
- **Secret Scanning**: Common secret patterns in code
- **Outdated Packages**: Update recommendations

**When it runs:**
- On PR with package changes
- Daily schedule (8 AM UTC)
- On push to `main`
- Manual dispatch

**Success criteria:**
- No critical or high vulnerabilities in production dependencies
- No secrets committed to repository
- Security issues tracked and addressed

---

## Quality Gates

### Required for Merge
✅ All tests passing (107+ tests)  
✅ Build successful  
✅ No critical accessibility violations  
✅ Bundle sizes within budgets  

### Recommended for Merge
⚠️ No high-severity security vulnerabilities  
⚠️ Performance budgets met  
⚠️ No unintended visual regressions  

### Monitored (Non-blocking)
📊 Code coverage trends  
📊 Bundle size trends  
📊 Performance score trends  

---

## Workflow Triggers

### Automatic Triggers

| Event | Workflows Triggered |
|-------|-------------------|
| PR opened/updated | ci-pr-check, accessibility-audit, lighthouse-ci, visual-regression, bundle-analysis |
| Package.json changed | ci-pr-check, bundle-analysis, security-audit |
| Push to main | security-audit |
| Daily schedule | security-audit |
| Weekly schedule | accessibility-audit (Mon), lighthouse-ci (Wed), bundle-analysis (Fri) |

### Manual Triggers

All workflows support `workflow_dispatch` for manual execution:

```bash
# Via GitHub UI: Actions tab → Select workflow → Run workflow

# Via GitHub CLI
gh workflow run accessibility-audit.yml
gh workflow run lighthouse-ci.yml
gh workflow run visual-regression.yml
gh workflow run bundle-analysis.yml
gh workflow run security-audit.yml
```

---

## Local Development

### Running Tests Locally

```bash
# Run all tests
npm run test:run

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm test

# Run tests with UI
npm run test:ui
```

### Running Build Checks

```bash
# Build the application
npm run build

# Preview the build
npm run preview

# Run performance audit
npm run perf:audit

# Run build + performance audit
npm run build:analyze
```

### Running Accessibility Checks

```bash
# Install dependencies
npm ci

# Build and preview
npm run build
npm run preview &

# In another terminal, run axe checks
# (Install @axe-core/playwright first)
npm install --no-save @axe-core/playwright
node scripts/run-axe-audit.js  # If script exists
```

### Running Lighthouse Locally

```bash
# Install Lighthouse CI
npm install --no-save @lhci/cli

# Build and start preview server
npm run build
npm run preview &

# Run Lighthouse
npx lhci autorun --config=lighthouserc.json
```

---

## Troubleshooting

### Test Failures

**Issue**: Tests failing in CI but passing locally

**Solutions**:
1. Ensure dependencies are in sync: `npm ci` (not `npm install`)
2. Check for timezone or environment differences
3. Look for race conditions in async tests
4. Verify test timeouts are sufficient

**Issue**: Coverage below threshold

**Solutions**:
1. Check coverage report: `npm run test:coverage`
2. Focus on critical paths first
3. Add tests for new features
4. Update coverage thresholds if baseline changes

### Build Failures

**Issue**: Build failing with memory errors

**Solutions**:
1. Increase Node memory: `NODE_OPTIONS=--max-old-space-size=4096 npm run build`
2. Check for circular dependencies
3. Clear build cache: `rm -rf dist node_modules && npm ci`

**Issue**: Bundle size exceeded

**Solutions**:
1. Run bundle analysis: `npm run build:analyze`
2. Check for large dependencies
3. Implement code splitting
4. Use dynamic imports for route-based splitting
5. See [Bundle Optimization](./bundle-optimization.md)

### Accessibility Failures

**Issue**: Axe violations found

**Solutions**:
1. Review violation details in artifacts
2. See [Accessibility Checklist](./a11y-checklist.md)
3. Test with screen readers
4. Use browser DevTools accessibility audit

### Performance Issues

**Issue**: Lighthouse scores below budget

**Solutions**:
1. Check Core Web Vitals metrics
2. Optimize images (WebP/AVIF)
3. Reduce JavaScript bundle size
4. Implement lazy loading
5. See [Lighthouse Guide](./lighthouse.md)

### Security Vulnerabilities

**Issue**: NPM audit finds vulnerabilities

**Solutions**:
1. Run `npm audit fix` for automatic fixes
2. Check if vulnerabilities affect production code
3. Review breaking changes before major updates
4. Consider alternative packages for unfixable issues
5. Document accepted risks with justification

---

## Best Practices

### For Developers

1. **Run tests before pushing**: `npm run test:run`
2. **Keep PRs focused**: Easier to review and test
3. **Write tests for new features**: Maintain or improve coverage
4. **Check bundle size impact**: Run `npm run build:analyze`
5. **Test accessibility**: Use keyboard navigation and screen readers
6. **Monitor CI feedback**: Address failures promptly

### For Reviewers

1. **Check CI status**: All workflows should pass
2. **Review test coverage**: New code should be tested
3. **Verify accessibility**: Check for ARIA labels and keyboard navigation
4. **Monitor bundle size**: Ensure no unexpected increases
5. **Security check**: Review dependency updates

### For Maintainers

1. **Update baselines**: Keep performance budgets realistic
2. **Review trends**: Monitor coverage, bundle size, and performance over time
3. **Update dependencies**: Keep security patches current
4. **Improve workflows**: Optimize CI for speed and reliability
5. **Document exceptions**: When bypassing checks, document why

---

## Related Documentation

- [Accessibility Checklist](./a11y-checklist.md)
- [Lighthouse Performance Guide](./lighthouse.md)
- [Bundle Optimization Strategies](./bundle-optimization.md)
- [Security Best Practices](./security.md)

---

## Workflow Maintenance

### Updating Workflows

When modifying workflows:

1. Test changes in a feature branch first
2. Use `workflow_dispatch` for manual testing
3. Monitor first few runs after merge
4. Update documentation to reflect changes

### Adding New Workflows

Checklist for new workflows:

- [ ] Define clear purpose and success criteria
- [ ] Set appropriate triggers (PR, schedule, manual)
- [ ] Implement artifact uploads for debugging
- [ ] Add summary generation to `$GITHUB_STEP_SUMMARY`
- [ ] Include PR comments for visibility
- [ ] Document in this guide
- [ ] Test with `workflow_dispatch`

---

## Support

For questions or issues with CI/CD:

1. Check workflow logs in Actions tab
2. Review this documentation
3. Check existing issues/PRs for similar problems
4. Open an issue with workflow logs and context

---

**Last Updated**: 2025-11-05  
**Maintained By**: Operational Readiness Team
