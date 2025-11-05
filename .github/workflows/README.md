# GitHub Actions Workflows

This directory contains all CI/CD workflows for Project Valine.

## Overview

Our CI/CD pipeline is organized into focused workflows that run different checks and deployments:

### Core CI Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **ci-pr-check.yml** | PR to main/develop | Lint, test, build validation |
| **accessibility-audit.yml** | PR, weekly (Mon), manual | Automated a11y testing with axe-core |
| **lighthouse-ci.yml** | PR, weekly (Wed), manual | Performance monitoring with budgets |
| **visual-regression.yml** | PR, manual | Screenshot comparison testing |
| **bundle-analysis.yml** | PR, weekly (Fri), manual | Bundle size monitoring |
| **security-audit.yml** | PR, daily, push to main | Dependency and secret scanning |

### Deployment Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **client-deploy.yml** | Push to main | Deploy frontend to production |
| **backend-deploy.yml** | Manual | Deploy backend services |
| **ci-cd-staging.yml** | Push to develop | Deploy to staging environment |

### Specialized Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **codeql.yml** | Push, PR, schedule | Security code scanning |
| **operational-readiness.yml** | Schedule, manual | Comprehensive readiness checks |
| **bot-smoke.yml** | Manual | Discord bot integration tests |

## Quick Start

### Running Workflows Manually

```bash
# Using GitHub CLI
gh workflow run accessibility-audit.yml
gh workflow run lighthouse-ci.yml
gh workflow run visual-regression.yml
gh workflow run bundle-analysis.yml
gh workflow run security-audit.yml

# Or via GitHub UI:
# Actions tab → Select workflow → Run workflow button
```

### Viewing Results

**PR Comments**: Most workflows post results as PR comments

**Job Summaries**: All workflows generate summaries visible in the Actions tab

**Artifacts**: Detailed reports available as downloadable artifacts:
- Accessibility: `axe-accessibility-results`
- Lighthouse: `lighthouse-results`
- Visual: `visual-snapshots`
- Bundle: `bundle-analysis`
- Security: `security-audit-reports`

## Workflow Details

### ci-pr-check.yml
**Purpose**: Pre-merge validation

**Jobs**:
1. Lint & Format Check
2. Test Suite (107+ tests)
3. Build Check
4. PR Status Summary

**Success Criteria**:
- All tests pass
- Build completes
- No critical lint errors

### accessibility-audit.yml
**Purpose**: WCAG 2.1 Level AA compliance

**Coverage**:
- Marketing pages: Home, Features, About, Login, Join
- Standards: WCAG 2.0/2.1 A/AA

**Output**:
- Violation count by severity
- Detailed violation reports
- Action items for fixes

**Schedule**: Mondays 9 AM UTC

### lighthouse-ci.yml
**Purpose**: Performance monitoring

**Metrics**:
- Performance score ≥ 80
- FCP ≤ 2.0s
- LCP ≤ 3.0s
- CLS ≤ 0.1
- TBT ≤ 300ms

**Output**:
- Scores for each page
- Core Web Vitals
- Optimization suggestions

**Schedule**: Wednesdays 9 AM UTC

### visual-regression.yml
**Purpose**: Detect visual changes

**Coverage**:
- Pages: Home, Features, About, Login, Join
- Viewports: Mobile (375px), Tablet (768px), Desktop (1280px)
- Themes: Light and Dark mode

**Output**:
- Screenshot comparisons
- Diff images for changes
- Pass/fail status

**Note**: First run creates baseline snapshots

### bundle-analysis.yml
**Purpose**: Control bundle sizes

**Budgets**:
- Total JS: 300 KB
- Total CSS: 60 KB
- Largest JS: 250 KB
- Largest CSS: 50 KB

**Output**:
- Size breakdown by file
- Budget violations
- Optimization recommendations

**Schedule**: Fridays 9 AM UTC

### security-audit.yml
**Purpose**: Security monitoring

**Checks**:
- npm audit (vulnerabilities)
- Secret pattern scanning
- Outdated package detection

**Output**:
- Vulnerability summary by severity
- Secret scan results
- Update recommendations

**Schedule**: Daily 8 AM UTC

## Configuration

### Performance Budgets

Edit budgets in respective workflow files:

```yaml
# lighthouse-ci.yml
assertions:
  "categories:performance": ["error", {"minScore": 0.8}]
  "largest-contentful-paint": ["error", {"maxNumericValue": 3000}]
  
# bundle-analysis.yml
budgets = {
  totalJS: 300,    # KB
  totalCSS: 60,    # KB
}
```

### Scheduled Runs

Current schedule:
- **Daily**: Security audit (8 AM UTC)
- **Monday**: Accessibility audit (9 AM UTC)
- **Wednesday**: Lighthouse CI (9 AM UTC)
- **Friday**: Bundle analysis (9 AM UTC)

To modify, edit the `cron` expression:
```yaml
schedule:
  - cron: '0 9 * * 1'  # Minute Hour Day Month Weekday
```

### Notification Settings

Workflows post comments on PRs by default. To disable:

```yaml
# Comment out or remove the "Comment on PR" step
- name: Comment on PR
  if: github.event_name == 'pull_request'
  # ...
```

## Troubleshooting

### Workflow Fails

**Check**:
1. Workflow logs in Actions tab
2. Recent changes to workflow file
3. Dependency updates
4. Environmental issues

**Common Issues**:
- Node version mismatch
- Missing dependencies
- Timeout (increase timeout value)
- Permission issues (check workflow permissions)

### Artifacts Not Generated

**Causes**:
- Workflow failed before artifact step
- Artifact path incorrect
- No files matching pattern

**Solution**:
```yaml
# Ensure step runs even on failure
- name: Upload artifacts
  if: always()
  # ...
```

### Manual Trigger Not Available

**Requirements**:
- Workflow must have `workflow_dispatch` trigger
- Must have write permissions to repository

**Fix**:
```yaml
on:
  workflow_dispatch:  # Add this
  pull_request:
    # ...
```

## Best Practices

### For Developers

1. **Run locally first**: Test changes before pushing
   ```bash
   npm test
   npm run build
   ```

2. **Check CI status**: Wait for all checks to pass

3. **Review artifacts**: Download reports for detailed issues

4. **Address failures promptly**: Don't merge with failing checks

### For Reviewers

1. **Check workflow status**: All green before approving
2. **Review comments**: Check automated feedback
3. **Download artifacts**: Review detailed reports if needed
4. **Validate changes**: Ensure changes make sense

### For Maintainers

1. **Monitor trends**: Track bundle size, performance over time
2. **Update budgets**: Keep realistic and achievable
3. **Review schedules**: Adjust frequency as needed
4. **Maintain workflows**: Keep dependencies updated

## Adding New Workflows

### Checklist

- [ ] Define clear purpose
- [ ] Set appropriate triggers (PR, schedule, manual)
- [ ] Add `workflow_dispatch` for manual runs
- [ ] Implement artifact uploads for debugging
- [ ] Generate summary with `$GITHUB_STEP_SUMMARY`
- [ ] Add PR comment (if applicable)
- [ ] Document in this README
- [ ] Test with manual dispatch
- [ ] Update docs/qa/ci-overview.md

### Template

```yaml
name: Workflow Name

on:
  pull_request:
    branches: [main, develop]
  workflow_dispatch:
  schedule:
    - cron: '0 9 * * 1'  # Weekly on Monday

env:
  NODE_VERSION: '20'

jobs:
  job-name:
    name: Job Display Name
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install
        run: npm ci
      
      - name: Run checks
        run: npm run check
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: results
          path: results/
      
      - name: Generate summary
        if: always()
        run: |
          echo "## Results" >> $GITHUB_STEP_SUMMARY
          # Add summary content
```

## Workflow Dependencies

### Shared Setup Steps

Most workflows use:
1. `actions/checkout@v4` - Clone repository
2. `actions/setup-node@v4` - Setup Node.js
3. `npm ci` - Install dependencies (with cache)

### Common Caching Strategy

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: ${{ env.NODE_VERSION }}
    cache: 'npm'  # Caches node_modules based on package-lock.json
```

### Build Artifacts

Multiple workflows build the app. Consider:
- Caching build output
- Reusing build between jobs
- Separate build job if needed

## Monitoring & Alerts

### GitHub Notifications

Configure in: Settings → Notifications

Options:
- Email on workflow failure
- Mobile push notifications
- Slack/Discord webhooks

### Setting Up Alerts

```yaml
# Example: Slack notification on failure
- name: Notify on failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "Workflow failed: ${{ github.workflow }}"
      }
```

## Security

### Secrets Management

**DO**:
- Use GitHub Secrets for credentials
- Mask secrets in logs with `::add-mask::`
- Use least privilege permissions

**DON'T**:
- Print secrets in logs
- Commit secrets in workflow files
- Share secrets between repositories unnecessarily

### Permissions

Workflows have minimal permissions by default:

```yaml
permissions:
  contents: read
  actions: read

# Request write only when needed
jobs:
  deploy:
    permissions:
      contents: write
      deployments: write
```

## Resources

- **Documentation**: See `docs/qa/ci-overview.md`
- **GitHub Actions Docs**: docs.github.com/actions
- **Workflow Syntax**: docs.github.com/actions/reference/workflow-syntax-for-github-actions

---

**Last Updated**: 2025-11-05  
**Maintained By**: Operational Readiness Team
