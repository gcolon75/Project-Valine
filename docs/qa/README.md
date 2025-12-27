# Quality Assurance Documentation

> **Note**: This documentation uses PowerShell commands. Archived documentation may contain bash examples for historical reference.


Comprehensive guides for maintaining code quality, performance, accessibility, and security in Project Valine.

## 📋 Overview

This directory contains documentation for:
- **CI/CD Workflows**: Automated testing and deployment
- **Accessibility**: WCAG 2.1 compliance
- **Performance**: Core Web Vitals optimization
- **Bundle Management**: Keeping assets lean
- **Security**: Vulnerability prevention

## 🚀 Quick Links

### Getting Started
- **[CI/CD Overview](ci-overview.md)** - Start here to understand all workflows
- **[Workflow README](../../.github/workflows/README.md)** - GitHub Actions reference

### Specific Guides
- **[Accessibility Checklist](a11y-checklist.md)** - WCAG 2.1 AA compliance
- **[Lighthouse Guide](lighthouse.md)** - Performance optimization
- **[Bundle Optimization](bundle-optimization.md)** - Bundle size management
- **[Security Best Practices](security.md)** - Security guidelines

## 📊 CI/CD Workflows

### Core Quality Gates

| Workflow | Purpose | Runs On |
|----------|---------|---------|
| **ci-pr-check.yml** | Lint, test, build | Every PR |
| **accessibility-audit.yml** | A11y testing | PR, Weekly (Mon) |
| **lighthouse-ci.yml** | Performance | PR, Weekly (Wed) |
| **visual-regression.yml** | Visual testing | PR, Manual |
| **bundle-analysis.yml** | Bundle size | PR, Weekly (Fri) |
| **security-audit.yml** | Security scan | PR, Daily, Push |

### Running Workflows

```powershell
# Via GitHub CLI
gh workflow run accessibility-audit.yml
gh workflow run lighthouse-ci.yml
gh workflow run visual-regression.yml
gh workflow run bundle-analysis.yml
gh workflow run security-audit.yml

# Or via GitHub UI:
# Actions tab → Select workflow → Run workflow
```

### Viewing Results

- **PR Comments**: Most workflows post results to PRs
- **Job Summaries**: View in Actions tab
- **Artifacts**: Download detailed reports from workflow runs

## ♿ Accessibility

### Standards
- **WCAG 2.1 Level AA** compliance target
- **Automated testing** with axe-core
- **Manual testing** with keyboard and screen readers

### Key Requirements
- All images have alt text
- Proper heading hierarchy
- Keyboard navigation support
- Color contrast ratios met
- ARIA labels where needed

### Resources
- [Accessibility Checklist](a11y-checklist.md) - Full compliance guide
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe DevTools](https://www.deque.com/axe/devtools/)

## 🚀 Performance

### Core Web Vitals

| Metric | Budget | Description |
|--------|--------|-------------|
| **LCP** | ≤ 3.0s | Largest Contentful Paint |
| **FCP** | ≤ 2.0s | First Contentful Paint |
| **CLS** | ≤ 0.1 | Cumulative Layout Shift |
| **TBT** | ≤ 300ms | Total Blocking Time |

### Performance Score
- **Target**: ≥ 80/100
- **Stretch Goal**: ≥ 90/100

### Optimization Tips
- Optimize images (WebP/AVIF)
- Implement code splitting
- Lazy load below-the-fold content
- Minimize JavaScript bundles
- Use CDN for static assets

### Resources
- [Lighthouse Guide](lighthouse.md) - Complete performance optimization
- [web.dev](https://web.dev/) - Performance best practices

## 📦 Bundle Management

### Current Budgets

| Asset | Budget |
|-------|--------|
| Total JavaScript | 300 KB |
| Total CSS | 60 KB |
| Largest JS file | 250 KB |
| Largest CSS file | 50 KB |

### Optimization Strategies
- **Code Splitting**: Lazy load routes and heavy components
- **Tree Shaking**: Import only what's needed
- **Dependency Audit**: Remove unused packages
- **Dynamic Imports**: Load on demand

### Monitoring
```powershell
# Analyze current bundle
npm run build:analyze

# Run performance audit
npm run perf:audit
```

### Resources
- [Bundle Optimization Guide](bundle-optimization.md) - Detailed strategies
- [Bundlephobia](https://bundlephobia.com/) - Check package sizes

## 🔒 Security

### Automated Checks
- **Daily npm audit** for vulnerabilities
- **Secret scanning** for committed credentials
- **Dependency updates** monitoring

### Best Practices
- Never commit secrets
- Use environment variables
- Keep dependencies updated
- Validate user input
- Sanitize HTML output

### Severity Levels

| Level | Action |
|-------|--------|
| **Critical** | Fix immediately |
| **High** | Fix within days |
| **Moderate** | Fix within weeks |
| **Low** | Fix during maintenance |

### Resources
- [Security Best Practices](security.md) - Complete security guide
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [npm audit docs](https://docs.npmjs.com/cli/v8/commands/npm-audit)

## 🧪 Testing

### Test Coverage
- **Current**: ~45% coverage
- **Target**: ≥ 50% coverage
- **Tests**: 107+ passing tests

### Running Tests
```powershell
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:ui
```

### Test Structure
```
src/
├── components/__tests__/
├── services/__tests__/
├── context/__tests__/
├── hooks/__tests__/
└── routes/__tests__/
```

## 📈 Monitoring & Metrics

### What We Track
- **Test pass rate** (currently 100%)
- **Code coverage** (currently ~45%)
- **Bundle sizes** (JS and CSS)
- **Performance scores** (Lighthouse)
- **Accessibility violations** (axe-core)
- **Security vulnerabilities** (npm audit)

### Trends to Watch
- Bundle size increases
- Performance regressions
- Test coverage decreases
- New security vulnerabilities

## 🛠️ Development Workflow

### Before Committing
```powershell
# 1. Run tests
npm run test:run

# 2. Check build
npm run build

# 3. Run linter (if configured)
npm run lint
```

### In Pull Requests
1. All CI checks pass
2. No critical accessibility issues
3. Bundle sizes within budgets
4. No high/critical security vulnerabilities
5. Tests added for new features

### Code Review Checklist
- [ ] Tests pass
- [ ] Build successful
- [ ] No accessibility violations
- [ ] Bundle size acceptable
- [ ] Security audit clean
- [ ] Code coverage maintained or improved

## 📚 Additional Resources

### Documentation
- [CI/CD Overview](ci-overview.md) - Complete workflow documentation
- [Workflow README](../../.github/workflows/README.md) - GitHub Actions reference
- [Contributing Guide](../../CONTRIBUTING.md) - Development standards

### External Resources
- **Performance**: [web.dev](https://web.dev/), [WebPageTest](https://www.webpagetest.org/)
- **Accessibility**: [A11y Project](https://www.a11yproject.com/), [WebAIM](https://webaim.org/)
- **Security**: [OWASP](https://owasp.org/), [Snyk](https://snyk.io/)
- **Testing**: [Vitest](https://vitest.dev/), [Testing Library](https://testing-library.com/)

## 🤝 Contributing

Found an issue or have a suggestion?

1. Check existing [issues](https://github.com/gcolon75/Project-Valine/issues)
2. Open a new issue with details
3. Or submit a pull request

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## 📞 Support

Need help with quality assurance?

1. Check the relevant guide in this directory
2. Review workflow logs in Actions tab
3. Search existing GitHub issues
4. Open a new issue with details

---

**Last Updated**: 2025-11-05  
**Maintained By**: Operational Readiness Team
