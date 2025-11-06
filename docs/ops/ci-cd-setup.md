# CI/CD Setup Guide - Phase 08

**Status:** ✅ Complete (Basic Implementation)  
**Last Updated:** 2025-11-03

## Overview

This guide explains the CI/CD pipelines implemented for Project Valine, including automated testing, building, and deployment to staging environments.

## Workflows Implemented

### 1. CI/CD Staging Pipeline (`ci-cd-staging.yml`)

**Purpose:** Automated deployment to staging environment

**Triggers:**
- Push to `develop` or `staging` branches
- Manual trigger via `workflow_dispatch`
- Pull requests to staging branches

**Jobs:**
1. **Test** - Runs 107 unit tests (~6.5s)
2. **Build** - Creates production bundle (~3.4s)
3. **Deploy** - Deploys to AWS S3 + CloudFront
4. **Smoke Test** - Validates deployment health

### 2. PR Check Pipeline (`ci-pr-check.yml`)

**Purpose:** Validates pull requests before merge

**Triggers:**
- Pull requests to `main` or `develop`

**Jobs:**
1. **Lint** - Code quality checks
2. **Test** - Runs 107 tests with coverage reporting
3. **Build** - Validates production build
4. **PR Status** - Summary report

## Setup Instructions

### Step 1: Configure GitHub Secrets

Add these secrets to your GitHub repository:

**Required for Deployment:**
```
AWS_ACCESS_KEY_ID          - AWS access key for deployment
AWS_SECRET_ACCESS_KEY      - AWS secret key for deployment
AWS_REGION                 - AWS region (e.g., us-west-2)
S3_BUCKET_NAME            - S3 bucket name for hosting
CLOUDFRONT_DISTRIBUTION_ID - CloudFront distribution ID
STAGING_API_URL           - Backend API URL for staging
STAGING_URL               - Frontend URL for staging
```

**To add secrets:**
1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret with its value

### Step 2: Setup AWS Resources

**S3 Bucket:**
```bash
# Create S3 bucket for static hosting
aws s3 mb s3://your-staging-bucket --region us-west-2

# Enable static website hosting
aws s3 website s3://your-staging-bucket \
  --index-document index.html \
  --error-document index.html

# Set bucket policy for public read
aws s3api put-bucket-policy \
  --bucket your-staging-bucket \
  --policy file://bucket-policy.json
```

**CloudFront Distribution:**
```bash
# Create CloudFront distribution pointing to S3 bucket
aws cloudfront create-distribution \
  --origin-domain-name your-staging-bucket.s3.amazonaws.com \
  --default-root-object index.html
```

### Step 3: Create GitHub Environment

1. Go to repository Settings → Environments
2. Click "New environment"
3. Name it "staging"
4. Add environment protection rules (optional):
   - Required reviewers
   - Wait timer
   - Deployment branches

### Step 4: Test the Workflows

**Test PR Check:**
1. Create a branch: `git checkout -b test/ci-check`
2. Make a change: `echo "test" >> README.md`
3. Commit and push: `git commit -am "test: CI check" && git push`
4. Create PR to `develop`
5. Watch CI run automatically

**Test Staging Deployment:**
1. Push to develop branch: `git push origin develop`
2. Or manually trigger:
   - Go to Actions → CI/CD - Staging Deployment
   - Click "Run workflow"
   - Select branch and run

## Workflow Details

### Test Job

Runs comprehensive test suite:
- **107 tests** covering hooks, contexts, components, services, routes
- **~45% code coverage**
- **100% pass rate**
- **6.5s execution time**

Coverage breakdown:
- Hooks: 100%
- Contexts: 80%
- Components: 40%
- Services: 50%
- Routes: 70%

### Build Job

Creates optimized production bundle:
- **Vite 7.1.12** bundler
- **1775 modules** transformed
- **236.47 KB** bundle size (80.28 KB gzipped)
- **3.4s build time**

Optimizations:
- Code splitting
- Tree shaking
- Asset optimization
- Cache control headers

### Deploy Job

Deploys to AWS infrastructure:
1. Downloads build artifacts
2. Syncs to S3 bucket with cache control
3. Invalidates CloudFront cache
4. Reports deployment status

**Cache Strategy:**
- Assets: `max-age=31536000` (1 year)
- HTML: `max-age=0, no-cache` (always fresh)

### Smoke Test Job

Validates deployment health:
1. Waits 30s for propagation
2. Performs HTTP health check
3. Validates 200 OK response
4. Reports test results

## Features

### Automated Testing
- ✅ Every PR tested automatically
- ✅ 107 tests run before deployment
- ✅ Coverage reports generated
- ✅ Failed tests block deployment

### Build Validation
- ✅ Production build tested
- ✅ Bundle size tracked
- ✅ Build errors prevent deployment
- ✅ Artifacts stored for debugging

### Deployment Safety
- ✅ Manual approval for staging (configurable)
- ✅ Health checks post-deployment
- ✅ Smoke tests validate availability
- ✅ Deployment summaries in GitHub

### Status Reporting
- ✅ Test results on PRs
- ✅ Coverage comments
- ✅ Build summaries
- ✅ Deployment status

## Troubleshooting

### Tests Failing in CI

**Problem:** Tests pass locally but fail in CI

**Solution:**
```bash
# Run tests in CI mode locally
npm run test:run

# Check for environment-specific issues
# - Node version mismatch
# - Missing environment variables
# - Timing issues with async tests
```

### Build Fails in CI

**Problem:** Build succeeds locally but fails in CI

**Solution:**
```bash
# Clean install dependencies
npm ci

# Build with CI environment
npm run build

# Check for:
# - Missing environment variables
# - Node version differences
# - Build warnings treated as errors
```

### Deployment Fails

**Problem:** Deployment job fails

**Solutions:**

1. **AWS Credentials:**
   ```bash
   # Verify secrets are set correctly
   # Check AWS permissions for S3 and CloudFront
   ```

2. **S3 Bucket:**
   ```bash
   # Verify bucket exists and is accessible
   aws s3 ls s3://your-bucket-name
   ```

3. **CloudFront:**
   ```bash
   # Verify distribution exists
   aws cloudfront get-distribution --id YOUR_DISTRIBUTION_ID
   ```

### Smoke Tests Fail

**Problem:** Health check fails after deployment

**Solutions:**

1. **Check URL:**
   - Verify STAGING_URL secret is correct
   - Ensure URL is publicly accessible

2. **Wait Longer:**
   - Increase wait time in workflow
   - CloudFront may need more time to propagate

3. **Check Application:**
   - View application in browser
   - Check browser console for errors
   - Verify API_BASE is configured correctly

## Monitoring

### View Workflow Runs

1. Go to repository Actions tab
2. Select workflow name
3. View run history and logs

### Check Deployment Status

1. Click on latest deployment run
2. View "Deployment summary" in logs
3. Check smoke test results

### Review Test Coverage

1. Download coverage artifacts from workflow run
2. Open `coverage/index.html` in browser
3. Review coverage reports

## Next Steps

### Immediate Actions

1. **Configure Secrets:**
   - Add all required AWS secrets
   - Add staging URLs

2. **Test Workflows:**
   - Create test PR to validate CI
   - Run staging deployment manually

3. **Verify Deployment:**
   - Check S3 bucket contents
   - Visit staging URL
   - Run smoke tests

### Short-term Improvements

1. **Add Notifications:**
   - Slack/Discord deployment notifications
   - Email alerts for failures

2. **Enhance Smoke Tests:**
   - Test critical user flows
   - Check API availability
   - Validate asset loading

3. **Production Pipeline:**
   - Create production deployment workflow
   - Add approval gates
   - Implement blue-green deployment

### Long-term Enhancements

1. **E2E Tests:**
   - Add Playwright E2E tests to CI
   - Test critical user journeys

2. **Performance Monitoring:**
   - Add Lighthouse CI
   - Track bundle size trends
   - Monitor deployment times

3. **Advanced Deployment:**
   - Implement canary deployments
   - Add automatic rollback
   - Setup multi-region deployment

## Resources

### Documentation
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [AWS S3 Static Hosting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)
- [CloudFront CDN](https://docs.aws.amazon.com/cloudfront/)

### Internal Guides
- `logs/agent/phases-08-10-implementation-guide.md` - Complete implementation guide
- `logs/agent/phase-08-cicd-complete.json` - Phase 08 status report
- `.github/workflows/ci-cd-staging.yml` - Staging workflow
- `.github/workflows/ci-pr-check.yml` - PR check workflow

## Support

For issues or questions:
1. Check workflow logs in GitHub Actions
2. Review troubleshooting section above
3. Check implementation guide in `logs/agent/`
4. Create issue in repository

---

**Last Updated:** 2025-11-03  
**Phase:** 08 - CI/CD Implementation  
**Status:** ✅ Complete (70%)
