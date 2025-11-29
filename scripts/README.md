# Scripts Directory

This directory contains utility scripts for Project-Valine deployment, verification, and maintenance.

## Table of Contents

- [API Base Validation](#api-base-validation)
- [Auth Backend Diagnostics](#auth-backend-diagnostics)
- [Verification Scripts](#verification-scripts)
- [Deployment Scripts](#deployment-scripts)
- [Build & Test Scripts](#build--test-scripts)

## API Base Validation

### scan-api-base.js

**Purpose**: Scan source code and built assets for stale or hard-coded API hosts.

**Quick Start**:
```bash
# Run scan
node scripts/scan-api-base.js

# Or via npm
npm run api:scan
```

**What it checks**:
- ✓ Known stale hosts (e.g., `fb9pxd6m09.execute-api.us-west-2.amazonaws.com`)
- ✓ Hard-coded execute-api host patterns
- ✓ Fallback patterns using `||` or ternary operators
- ✓ Environment variable usage tracking

**Exit Codes**:
- `0` - No stale hosts found
- `1` - Stale host detected or error

**Documentation**: See [docs/API_BASE_VALIDATION.md](../docs/API_BASE_VALIDATION.md) for complete guide.

### validate-api-base.js

**Purpose**: Validate API base configuration before build (DNS resolution, format check).

**Quick Start**:
```bash
# Run validation (uses VITE_API_BASE from .env.production)
node scripts/validate-api-base.js

# Or via npm
npm run api:validate

# With environment variable override
VITE_API_BASE=https://your-api.execute-api.us-west-2.amazonaws.com \
  node scripts/validate-api-base.js

# Allow DNS failure (for restricted networks)
ALLOW_API_BASE_DNS_FAILURE=true node scripts/validate-api-base.js

# Cross-check with expected API ID
STACK_API_ID=i72dxlcfcc node scripts/validate-api-base.js
```

**What it checks**:
- ✓ `VITE_API_BASE` is set
- ✓ URL format is valid
- ✓ DNS resolution succeeds
- ✓ Optional API Gateway ID match

**Exit Codes**:
- `0` - Validation passed
- `1` - Validation failed

**Integrated into**: Automatically runs during `npm run build` via prebuild script.

### analyze-api-base-history.js

**Purpose**: Analyze PR history for API base configuration changes.

**Quick Start**:
```bash
# Analyze last 25 merged PRs (default)
node scripts/analyze-api-base-history.js

# Or via npm
npm run api:history

# Analyze last 50 PRs
node scripts/analyze-api-base-history.js --count=50

# With GitHub token for higher rate limits
GITHUB_TOKEN=ghp_your_token node scripts/analyze-api-base-history.js
```

**Output**:
- Generates `reports/api-base-history.md`
- Lists PRs that modified `VITE_API_BASE`
- Identifies stale host references
- Summarizes execute-api occurrences

**Environment Variables**:
- `GITHUB_TOKEN` - GitHub personal access token (optional, increases rate limit)

### diff-bundles-api-base.js

**Purpose**: Compare production bundles to detect API hostname changes.

**Quick Start**:
```bash
# Auto-detect latest two bundles in dist/assets
node scripts/diff-bundles-api-base.js

# Or via npm
npm run api:diff-bundles

# Explicit bundle paths
node scripts/diff-bundles-api-base.js \
  dist/assets/index-abc123.js \
  dist/assets/index-def456.js
```

**Output**:
- JSON summary to stdout
- Markdown report at `reports/bundle-host-diff.md`
- Lists added, removed, and common execute-api hosts

**Use case**: Verify no stale hosts made it into production bundles after deployment.


## Auth Backend Diagnostics

### check-auth-backend.js

**Purpose**: Diagnose auth backend connectivity issues (DNS resolution, TCP connection, HTTP endpoints).

**Quick Start**:
```bash
# Basic usage
node scripts/check-auth-backend.js --domain fb9pxd6m09.execute-api.us-west-2.amazonaws.com

# With custom timeout and verbose output
node scripts/check-auth-backend.js --domain api.valine.com --timeout 5000 --verbose

# Show help
node scripts/check-auth-backend.js --help
```

**What it checks**:
- ✓ DNS resolution (dns.lookup, IPv4, IPv6)
- ✓ TCP connection to port 443 (HTTPS)
- ✓ HTTPS HEAD request to root (/)
- ✓ HTTPS GET request to /auth/me
- ✓ HTTPS OPTIONS request to /auth/login (CORS check)

**Exit Codes**:
- `0` - All checks passed
- `1` - DNS resolution failure
- `2` - TCP connection failure
- `3` - HTTP request failure

**Documentation**: See [docs/AUTH_BACKEND_INVESTIGATION.md](../docs/AUTH_BACKEND_INVESTIGATION.md) for detailed troubleshooting.

### check-auth-backend.ps1

**Purpose**: PowerShell version of auth backend diagnostics for Windows users.

**Quick Start**:
```powershell
# Basic usage
.\scripts\check-auth-backend.ps1 -Domain "fb9pxd6m09.execute-api.us-west-2.amazonaws.com"

# With custom timeout and verbose output
.\scripts\check-auth-backend.ps1 -Domain "api.valine.com" -Timeout 5 -Verbose
```

**What it checks**: Same as Node.js version (DNS, TCP, HTTP)

### test-auth-login.sh

**Purpose**: Test authentication by attempting login with test credentials.

**Quick Start**:
```bash
# Set credentials via environment variables
export TEST_EMAIL="user@example.com"
export TEST_PASSWORD="password123"
export API_BASE="https://fb9pxd6m09.execute-api.us-west-2.amazonaws.com"

# Run test
./scripts/test-auth-login.sh
```

**Security Warning**: Never commit credentials! Only use in secure local/CI environments.

### test-auth-login.ps1

**Purpose**: PowerShell version of auth login tester for Windows users.

**Quick Start**:
```powershell
# Set credentials
$env:TEST_EMAIL = "user@example.com"
$env:TEST_PASSWORD = "password123"
$env:API_BASE = "https://fb9pxd6m09.execute-api.us-west-2.amazonaws.com"

# Run test
.\scripts\test-auth-login.ps1

# Or use parameters
.\scripts\test-auth-login.ps1 -Email "user@example.com" -Password "password123" -ApiBase "https://api.valine.com"
```

## Verification Scripts

### verify-deployment.sh

**Purpose**: Comprehensive deployment verification for frontend, backend, and Discord integrations.

**Quick Start**:
```bash
# Show help
./scripts/verify-deployment.sh --help

# Verify GitHub repository structure only
./scripts/verify-deployment.sh --skip-aws --skip-discord

# Verify with all parameters
./scripts/verify-deployment.sh \
  --s3-bucket YOUR_BUCKET \
  --cloudfront-id YOUR_DIST_ID \
  --api-base YOUR_API_URL \
  --discord-webhook-url YOUR_WEBHOOK \
  --discord-bot-token YOUR_TOKEN \
  --discord-channel-id YOUR_CHANNEL_ID
```

**What it checks**:
- ✓ GitHub Actions workflow files
- ✓ Environment configuration files
- ✓ S3 bucket deployment and caching headers
- ✓ CloudFront distribution and invalidations
- ✓ Frontend URL accessibility
- ✓ API health endpoints (`/health` and `/hello`)
- ✓ Discord webhook functionality
- ✓ Discord bot authentication and messaging

**Documentation**: See [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) for detailed usage.

### verify-deployment-example.sh

**Purpose**: Interactive examples demonstrating different usage scenarios of verify-deployment.sh.

**Quick Start**:
```bash
./scripts/verify-deployment-example.sh
```

**What it demonstrates**:
- Example 1: Repository structure verification (no credentials needed)
- Example 2: Frontend and API verification
- Example 3: Full AWS verification
- Example 4: Discord integration verification
- Example 5: Using environment variables
- Example 6: CI/CD integration

## AWS Scripts

### put-ssm-params.sh

**Purpose**: Store parameters in AWS Systems Manager Parameter Store.

**Quick Start**:
```bash
./scripts/put-ssm-params.sh <stage> <region> <json-file>

# Example
./scripts/put-ssm-params.sh dev us-west-2 scripts/ssm-params.example.json
```

**Parameters**:
- `stage`: Deployment stage (dev, prod, etc.)
- `region`: AWS region (default: us-west-2)
- `json-file`: JSON file with parameter key-value pairs

## Development Scripts

### analyze-orchestration-run.mjs

**Purpose**: Post-run orchestration analysis agent that fetches and analyzes artifacts from GitHub Actions workflow runs.

**Quick Start**:
```bash
# Basic usage (requires GitHub CLI)
node scripts/analyze-orchestration-run.mjs <run-id>

# Use REST API mode (no GitHub CLI required)
node scripts/analyze-orchestration-run.mjs <run-id> --no-gh

# With JSON output and custom directory
node scripts/analyze-orchestration-run.mjs <run-id> --json --out-dir ./reports

# With executive summary
node scripts/analyze-orchestration-run.mjs <run-id> --summary ./exec-summary.md
```

**Artifact Retrieval Modes**:
- **CLI Mode** (default): Uses GitHub CLI (`gh`) for artifact retrieval
- **REST API Mode**: Uses GitHub REST API when `gh` is not available or `--no-gh` is specified

**REST API Requirements**:
- Environment variable `GITHUB_TOKEN` or `GH_TOKEN` with GitHub personal access token
- Required scopes: `actions:read`, `repo` (for private repositories)
- Falls back to unauthenticated requests (subject to lower rate limits)

**What it analyzes**:
- Health check results from verification artifacts
- Authentication checks and API responses
- Playwright test results (JSON preferred, HTML fallback)
- Accessibility violations (separated by impact: critical, serious, moderate, minor)
- Flakiness analysis for tests (< 20% failure rate)
- Security findings from CSP reports

**Outputs**:
- `CONSOLIDATED_ANALYSIS_REPORT.md` - Full analysis report
- `summary.json` - Machine-readable summary (with `--json`)
- Executive summary (with `--summary`)
- `draft-pr-payloads.json` - Suggested automated fixes
- `draft-github-issues.json` - Issues for non-trivial problems

**CLI Flags**:
- `--out-dir <path>` - Output directory (default: analysis-output)
- `--json` - Emit machine-readable summary.json
- `--summary <path>` - Write executive summary markdown
- `--fail-on <P0|P1|P2|none>` - Exit code policy (default: P0)
- `--log-level <info|debug>` - Logging verbosity
- `--no-gh` - Force REST API mode

**Exit Codes**:
- `0` - PROCEED: No critical issues
- `1` - CAUTION: High-priority issues detected
- `2` - BLOCK: Critical P0 issues present

**Rate Limiting**:
- REST API mode handles rate limiting gracefully
- Logs rate limit status and reset time
- Marks analysis as "degraded" rather than failing completely
- Authenticated requests have higher rate limits (5000/hour vs 60/hour)

**Security**:
- Path traversal protection for artifact extraction
- Size limits: 250MB max uncompressed, 10,000 files max
- Safe extraction with validation
- No external dependencies for extraction (uses built-in `unzip`)

**Documentation**: See inline help with `--help` for complete usage information.

### check-imports.mjs

**Purpose**: Check and validate import statements in the project.

**Quick Start**:
```bash
node scripts/check-imports.mjs
```

### who-is-my-app.mjs

**Purpose**: Identify and analyze application structure and components.

**Quick Start**:
```bash
node scripts/who-is-my-app.mjs
```

### wire-original-router.mjs

**Purpose**: Wire up the original router configuration.

**Quick Start**:
```bash
node scripts/wire-original-router.mjs
```

### start-dev.ps1

**Purpose**: PowerShell script to start development server on Windows.

**Quick Start** (PowerShell):
```powershell
.\scripts\start-dev.ps1
```

## Admin & User Management Scripts

### admin-set-password.mjs

**Purpose**: Reset or set a user's password directly in the database.

**Quick Start**:
```bash
# Set password for a specific user
DATABASE_URL="postgresql://..." node scripts/admin-set-password.mjs user@example.com newpassword123
```

### admin-upsert-user.mjs

**Purpose**: Create or update a user account with full control over all fields.

**Quick Start**:
```bash
# Create or update user
DATABASE_URL="postgresql://..." node scripts/admin-upsert-user.mjs \
  --email user@example.com \
  --password SecurePassword123! \
  --display-name "John Doe"

# Dry run (test mode, no database changes)
DATABASE_URL="postgresql://..." node scripts/admin-upsert-user.mjs \
  --email user@example.com \
  --password SecurePassword123! \
  --dry-run

# Skip if user already exists
DATABASE_URL="postgresql://..." node scripts/admin-upsert-user.mjs \
  --email user@example.com \
  --password SecurePassword123! \
  --skip-if-exists
```

### setup-test-users.mjs

**Purpose**: Create test user accounts for development and QA testing.

**Quick Start**:
```bash
DATABASE_URL="postgresql://..." node scripts/setup-test-users.mjs
```

### provision-production-accounts.mjs

**Purpose**: Provision initial production accounts with proper configuration.

**Quick Start**:
```bash
DATABASE_URL="postgresql://..." node scripts/provision-production-accounts.mjs
```

## Database & Migration Scripts

### prisma-optimize.mjs

**Purpose**: Optimize Prisma binaries for deployment (remove unused platform binaries).

**Quick Start**:
```bash
# For production (Linux only)
node scripts/prisma-optimize.mjs --prod

# For development (keep all platforms)
node scripts/prisma-optimize.mjs --dev
```

### add-profilecomplete-column.mjs

**Purpose**: Add the profileComplete column to the User table.

**Quick Start**:
```bash
DATABASE_URL="postgresql://..." node scripts/add-profilecomplete-column.mjs
```

### apply-missing-columns-migration.mjs

**Purpose**: Apply migrations for any missing database columns.

**Quick Start**:
```bash
DATABASE_URL="postgresql://..." node scripts/apply-missing-columns-migration.mjs
```

### verify-user-columns.mjs

**Purpose**: Verify that required user columns exist in the database.

**Quick Start**:
```bash
DATABASE_URL="postgresql://..." node scripts/verify-user-columns.mjs
```

## Security & Audit Scripts

### secret-audit.mjs

**Purpose**: Scan for accidentally committed secrets in the codebase.

**Quick Start**:
```bash
node scripts/secret-audit.mjs
```

### post-merge-security-audit.js

**Purpose**: Run comprehensive security audit after merging changes.

**Quick Start**:
```bash
node scripts/post-merge-security-audit.js
```

### validate-allowlist.js

**Purpose**: Validate the email allowlist configuration.

**Quick Start**:
```bash
node scripts/validate-allowlist.js
```

## Build & SRI Scripts

### prebuild.js

**Purpose**: Pre-build validation (runs before `npm run build`).

**Quick Start**:
```bash
node scripts/prebuild.js
# Automatically runs via: npm run build
```

### postbuild-validate.js

**Purpose**: Post-build validation to ensure build output is correct.

**Quick Start**:
```bash
node scripts/postbuild-validate.js
```

### generate-sri.js

**Purpose**: Generate Subresource Integrity (SRI) hashes for production bundles.

**Quick Start**:
```bash
# Generate SRI hashes after build
node scripts/generate-sri.js

# Or use the combined command
npm run build:sri
```

### verify-sri.js

**Purpose**: Verify that SRI hashes in index.html match the actual bundle files.

**Quick Start**:
```bash
node scripts/verify-sri.js
# Or: npm run verify:sri
```

## Verification & Diagnostics

### post-merge-comprehensive-verification.js

**Purpose**: Run comprehensive verification after merging PRs.

**Quick Start**:
```bash
node scripts/post-merge-comprehensive-verification.js
# Or: npm run verify:post-merge
```

### verify-predeploy.mjs

**Purpose**: Pre-deployment validation checks.

**Quick Start**:
```bash
node scripts/verify-predeploy.mjs
```

### verify-env-contract.mjs

**Purpose**: Validate environment variable configuration against requirements.

**Quick Start**:
```bash
node scripts/verify-env-contract.mjs
```

### verify-production-deployment.mjs

**Purpose**: Verify that production deployment is healthy.

**Quick Start**:
```bash
node scripts/verify-production-deployment.mjs --api-base https://your-api.execute-api.us-west-2.amazonaws.com
```

### verify-user-profiles.mjs

**Purpose**: Verify user profile data integrity.

**Quick Start**:
```bash
DATABASE_URL="postgresql://..." node scripts/verify-user-profiles.mjs
```

### verify-white-screen-fix.js

**Purpose**: Verify that white screen fixes are working correctly.

**Quick Start**:
```bash
node scripts/verify-white-screen-fix.js --domain your-domain.cloudfront.net
```

## CloudFront & Frontend Scripts

### diagnose-white-screen.js

**Purpose**: Diagnose white screen issues with detailed analysis.

**Quick Start**:
```bash
node scripts/diagnose-white-screen.js --domain your-domain.cloudfront.net
```

### check-cloudfront.js

**Purpose**: Check CloudFront distribution status and configuration.

**Quick Start**:
```bash
node scripts/check-cloudfront.js --distribution E123456789
```

### deploy-frontend.js

**Purpose**: Deploy frontend to S3 with CloudFront invalidation.

**Quick Start**:
```bash
node scripts/deploy-frontend.js --bucket valine-frontend-prod --distribution E123456789
```

## UX Audit Scripts

### ux-audit-agent.mjs

**Purpose**: Automated UX audit agent that analyzes pages for usability issues.

**Quick Start**:
```bash
node scripts/ux-audit-agent.mjs --url https://your-site.com
```

### ux-audit-to-issues.mjs

**Purpose**: Convert UX audit findings to GitHub issues.

**Quick Start**:
```bash
node scripts/ux-audit-to-issues.mjs --input ux-audit-results.json
```

## Test Analysis Scripts

### analyze-test-failures.mjs

**Purpose**: Analyze test failures and categorize them by type.

**Quick Start**:
```bash
# Run tests with JSON output, then analyze
npm test -- --reporter=json > test-results.json
node scripts/analyze-test-failures.mjs test-results.json
```

### generate-regression-report.mjs

**Purpose**: Generate regression test report from Playwright results.

**Quick Start**:
```bash
node scripts/generate-regression-report.mjs
```

## Image & Asset Optimization

### optimize-images.mjs

**Purpose**: Optimize images in the public directory.

**Quick Start**:
```bash
node scripts/optimize-images.mjs
```

## Configuration Files

### ssm-params.example.json

Example JSON file showing the structure for SSM parameters. Copy and modify this file with your actual values:

```json
{
  "PARAM_NAME_1": "value1",
  "PARAM_NAME_2": "value2"
}
```

## Usage in CI/CD

### GitHub Actions Integration

Add verification to your workflow:

```yaml
jobs:
  deploy:
    steps:
      - name: Deploy Frontend
        run: |
          # Your deployment commands here
          
      - name: Verify Deployment
        run: |
          ./scripts/verify-deployment.sh \
            --s3-bucket ${{ secrets.S3_BUCKET }} \
            --cloudfront-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --api-base ${{ secrets.VITE_API_BASE }}
            
      - name: Notify on Success
        if: success()
        run: |
          # Send success notification
          
      - name: Notify on Failure
        if: failure()
        run: |
          # Send failure notification
```

### Post-Deployment Hook

Create a post-deployment verification hook:

```bash
#!/bin/bash
# post-deploy-hook.sh

set -e

echo "Deployment completed. Running verification..."

./scripts/verify-deployment.sh \
  --s3-bucket "$S3_BUCKET" \
  --cloudfront-id "$CLOUDFRONT_ID" \
  --api-base "$API_BASE" \
  --discord-webhook-url "$DISCORD_WEBHOOK"

if [ $? -eq 0 ]; then
  echo "✓ Verification passed!"
  # Send success notification
else
  echo "✗ Verification failed!"
  # Send failure notification and potentially rollback
  exit 1
fi
```

## Best Practices

1. **Secure Credentials**: Never commit credentials to git. Use environment variables or GitHub Secrets.

2. **Regular Verification**: Run verification after every deployment to catch issues early.

3. **Selective Checks**: Use skip flags (`--skip-aws`, `--skip-discord`) when you don't need full verification.

4. **Error Handling**: The verification script exits with code 1 on failures, making it suitable for CI/CD pipelines.

5. **Rate Limits**: The script includes delays between Discord API calls to respect rate limits.

## Troubleshooting

### Common Issues

**"AWS CLI not found"**
```bash
# Install AWS CLI
# Ubuntu/Debian
sudo apt-get install awscli

# macOS
brew install awscli
```

**"No AWS credentials configured"**
```bash
# Configure AWS credentials
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
export AWS_REGION=us-west-2
```

**"jq: command not found"**
```bash
# Install jq
# Ubuntu/Debian
sudo apt-get install jq

# macOS
brew install jq
```

**"Permission denied"**
```bash
# Make scripts executable
chmod +x scripts/*.sh
```

## Contributing

When adding new scripts:

1. Add appropriate shebang (`#!/usr/bin/env bash` or `#!/usr/bin/env node`)
2. Make scripts executable (`chmod +x script-name.sh`)
3. Add help/usage documentation
4. Update this README with the new script
5. Follow existing naming conventions
6. Include error handling (`set -e` for bash scripts)

## Support

For issues or questions:
- See [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) for detailed verification documentation
- Check [main README](../README.md) for project overview
- Review [orchestrator documentation](../orchestrator/README.md) for Discord integration
- Open an issue on GitHub: https://github.com/gcolon75/Project-Valine/issues
