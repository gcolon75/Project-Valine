# Deployment & Integration Guide
## All 7 Backend Security Phases

This guide provides step-by-step instructions for deploying and integrating all 7 phases of the backend security and tooling roadmap.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Phase 1: Email Verification](#phase-1-email-verification)
3. [Phase 2: Session Audits & 2FA](#phase-2-session-audits--2fa)
4. [Phase 3: CSRF Protection](#phase-3-csrf-protection)
5. [Phase 4: PR Intelligence](#phase-4-pr-intelligence)
6. [Phase 5: Flaky Test Detector](#phase-5-flaky-test-detector)
7. [Phase 6: Schema Diff Analyzer](#phase-6-schema-diff-analyzer)
8. [Phase 7: Synthetic Journey](#phase-7-synthetic-journey)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required

- **Database:** PostgreSQL 12+ with connection string
- **Node.js:** v18+ for Lambda runtime
- **Prisma:** Already included in dependencies

### Optional (per phase)

- **SMTP Server:** For email verification (Phase 1)
- **Redis:** For advanced rate limiting (optional)
- **GitHub Actions:** For PR Intelligence (Phase 4)

---

## Phase 1: Email Verification

### Goal
Block unverified users from write operations and provide rate-limited email verification resend.

### Deployment Steps

#### 1. Apply Database Migration

```bash
cd serverless

# Apply migration
psql $DATABASE_URL -f prisma/migrations/20251111191723_add_email_verification/migration.sql

# Verify schema
npx prisma generate
```

#### 2. Configure Environment Variables

Add to `.env` or deployment environment:

```bash
# Phase 1: Email Verification
EMAIL_ENABLED=false  # Set to true when SMTP configured
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-smtp-password-or-api-key
FROM_EMAIL=noreply@yourdomain.com
FRONTEND_URL=https://yourapp.com
```

#### 3. Test in Development

```bash
# Start local server
npm run dev

# Run verification tests
./test-phase1-verification.sh

# Or run manual tests
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"TestPass123!"}'
```

#### 4. Deploy to Staging

```bash
# Deploy with serverless
serverless deploy --stage staging

# Or deploy with your CI/CD pipeline
```

#### 5. Enable Email Verification

Once SMTP is configured and tested:

```bash
# Update environment variable
EMAIL_ENABLED=true

# Redeploy
serverless deploy --stage staging
```

#### 6. Monitor

- **Verification Rate:** Track % of users verifying emails
- **Rate Limit Hits:** Monitor for abuse (should be <1%)
- **Resend Requests:** Normal = 1-2 per user

### Rollback

```bash
# Option 1: Disable feature flag
EMAIL_ENABLED=false

# Option 2: Database rollback
psql $DATABASE_URL -f prisma/migrations/20251111191723_add_email_verification/rollback.sql
```

---

## Phase 2: Session Audits & 2FA

### Goal
Implement refresh token rotation, session management, and 2FA scaffold.

### Deployment Steps

#### 1. Apply Database Migration

```bash
cd serverless

# Apply migration
psql $DATABASE_URL -f prisma/migrations/20251111193653_add_session_audits_2fa/migration.sql

# Verify schema
npx prisma generate
```

#### 2. Configure Environment Variables

```bash
# Phase 2: 2FA
TWO_FACTOR_ENABLED=false  # Set to true when ready
```

#### 3. Test Session Management

```bash
# Login to create session
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}' \
  -c cookies.txt | jq -r '.user.id')

# List sessions
curl -s http://localhost:3000/auth/sessions \
  -b cookies.txt | jq

# Refresh token (should rotate)
curl -X POST http://localhost:3000/auth/refresh \
  -b cookies.txt \
  -c cookies-new.txt
```

#### 4. Test 2FA (when enabled)

```bash
# Setup 2FA
curl -X POST http://localhost:3000/auth/2fa/setup \
  -b cookies.txt | jq

# Save the secret and scan QR code
# Generate code with authenticator app

# Enable 2FA
curl -X POST http://localhost:3000/auth/2fa/enable \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"code":"123456"}'
```

#### 5. Deploy to Production

```bash
serverless deploy --stage prod
```

#### 6. Enable 2FA (gradual rollout)

```bash
# Enable for testing
TWO_FACTOR_ENABLED=true

# Monitor adoption and error rates
# Roll out to all users
```

### Rollback

```bash
# Option 1: Disable feature flag
TWO_FACTOR_ENABLED=false

# Option 2: Database rollback
psql $DATABASE_URL -f prisma/migrations/20251111193653_add_session_audits_2fa/rollback.sql
```

---

## Phase 3: CSRF Protection

### Goal
Prevent CSRF attacks on state-changing endpoints.

### Deployment Steps

#### 1. Frontend Integration

Update frontend to read and send CSRF tokens:

```javascript
// Read CSRF token from cookie
const getCsrfToken = () => {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? match[1] : null;
};

// Add to all POST/PUT/PATCH/DELETE requests
fetch('/api/profiles', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': getCsrfToken(),
  },
  credentials: 'include',
  body: JSON.stringify(data),
});
```

#### 2. Test CSRF Protection

```bash
# Login to get CSRF token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}' \
  -c cookies.txt -v

# Extract CSRF token
CSRF_TOKEN=$(grep XSRF-TOKEN cookies.txt | awk '{print $7}')

# Test without CSRF token (should fail with 403)
curl -X POST http://localhost:3000/profiles \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"vanityUrl":"test","headline":"Test"}' \
  -v

# Test with CSRF token (should succeed)
curl -X POST http://localhost:3000/profiles \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -b cookies.txt \
  -d '{"vanityUrl":"test","headline":"Test"}' \
  -v
```

#### 3. Deploy Backend

```bash
# Deploy with CSRF disabled
CSRF_ENABLED=false
serverless deploy --stage staging
```

#### 4. Deploy Frontend

Deploy updated frontend with CSRF token handling.

#### 5. Enable CSRF Protection

```bash
# Enable after frontend is deployed
CSRF_ENABLED=true
serverless deploy --stage staging

# Monitor for errors
# If issues, disable and investigate
```

### Rollback

```bash
# Disable feature flag (no database changes)
CSRF_ENABLED=false
serverless deploy
```

---

## Phase 4: PR Intelligence

### Goal
Capture PR metadata from GitHub Actions for analysis.

### Deployment Steps

#### 1. Apply Database Migration

```bash
cd serverless
psql $DATABASE_URL -f prisma/migrations/20251111201848_add_pr_intel_test_runs/migration.sql
npx prisma generate
```

#### 2. Generate Webhook Secret

```bash
# Generate strong secret
SECRET=$(openssl rand -hex 32)
echo "PR_INTEL_WEBHOOK_SECRET=$SECRET"
```

#### 3. Configure Environment

```bash
PR_INTEL_ENABLED=true
PR_INTEL_WEBHOOK_SECRET=your-generated-secret
```

#### 4. Create GitHub Action

Create `.github/workflows/pr-analysis.yml`:

```yaml
name: PR Analysis

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Analyze PR
        run: |
          # Count changed files
          FILES=$(git diff --name-only origin/${{ github.base_ref }}...HEAD | wc -l)
          
          # Count sensitive paths (example)
          SENSITIVE=$(git diff --name-only origin/${{ github.base_ref }}...HEAD | grep -E '(auth|password|secret)' | wc -l || echo 0)
          
          # Calculate risk score
          RISK=$(echo "$FILES * 0.5 + $SENSITIVE * 2" | bc)
          
          # Generate payload
          PAYLOAD=$(cat <<EOF
          {
            "prNumber": ${{ github.event.pull_request.number }},
            "changedFilesCount": $FILES,
            "sensitivePathsCount": $SENSITIVE,
            "riskScore": $RISK
          }
          EOF
          )
          
          # Generate HMAC signature
          SIGNATURE="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "${{ secrets.PR_INTEL_WEBHOOK_SECRET }}" | cut -d' ' -f2)"
          
          # Send to endpoint
          curl -X POST ${{ secrets.API_BASE_URL }}/internal/pr-intel/ingest \
            -H "Content-Type: application/json" \
            -H "X-Hub-Signature-256: $SIGNATURE" \
            -d "$PAYLOAD"
```

#### 5. Configure GitHub Secrets

In your repository settings, add:
- `PR_INTEL_WEBHOOK_SECRET` - The secret you generated
- `API_BASE_URL` - Your API base URL

#### 6. Test

Create a test PR and verify the workflow runs and data is ingested.

### Rollback

```bash
PR_INTEL_ENABLED=false
```

---

## Phase 5: Flaky Test Detector

### Goal
Track test execution history to detect flaky tests.

### Deployment Steps

#### 1. Database Already Migrated

Migration shared with Phase 4 (already applied if you completed Phase 4).

#### 2. Configure Environment

```bash
FLAKY_DETECTOR_ENABLED=true
```

#### 3. Update CI to Send Test Results

Add to your test runner (example with Jest):

```yaml
- name: Run Tests
  run: npm test -- --json --outputFile=test-results.json

- name: Send Test Results
  if: always()
  run: |
    # Parse and send to endpoint
    curl -X POST ${{ secrets.API_BASE_URL }}/internal/tests/ingest \
      -H "Content-Type: application/json" \
      -d @test-results-formatted.json
```

#### 4. Query Flaky Tests

```bash
# Get flaky candidates
curl "http://localhost:3000/internal/tests/flaky-candidates?minRuns=10" | jq
```

### Rollback

```bash
FLAKY_DETECTOR_ENABLED=false
```

---

## Phase 6: Schema Diff Analyzer

### Goal
Analyze Prisma schema changes and assess migration risk.

### Deployment Steps

#### 1. Configure Environment

```bash
SCHEMA_DIFF_ENABLED=true
```

#### 2. Integrate into CI/CD

Example workflow step:

```yaml
- name: Analyze Schema Changes
  run: |
    # Get schema from main branch
    git show origin/main:prisma/schema.prisma > schema-base.prisma
    
    # Get current schema
    cp prisma/schema.prisma schema-target.prisma
    
    # Analyze diff
    RESULT=$(curl -X POST ${{ secrets.API_BASE_URL }}/internal/schema/diff \
      -H "Content-Type: application/json" \
      -d "{\"baseSchema\":\"$(cat schema-base.prisma | jq -Rs .)\",\"targetSchema\":\"$(cat schema-target.prisma | jq -Rs .)\"}")
    
    echo "$RESULT" | jq
    
    # Check risk score
    RISK=$(echo "$RESULT" | jq -r '.riskScore')
    if [ "$RISK" -gt 50 ]; then
      echo "::warning::High risk schema change detected (score: $RISK)"
    fi
```

### Rollback

```bash
SCHEMA_DIFF_ENABLED=false
```

---

## Phase 7: Synthetic Journey

### Goal
Validate deployments with end-to-end journey tests.

### Deployment Steps

#### 1. Configure Environment

```bash
SYNTHETIC_JOURNEY_ENABLED=true
API_BASE_URL=https://your-api.com
```

#### 2. Run Journey

```bash
# Test deployment
curl -X POST https://your-api.com/internal/journey/run \
  -H "Content-Type: application/json" \
  -d '{"scenarios":["register","verify","login","createProfile","logout"]}' \
  | jq
```

#### 3. Integrate into Deployment Pipeline

```yaml
- name: Run Synthetic Journey
  run: |
    RESULT=$(curl -X POST ${{ secrets.API_BASE_URL }}/internal/journey/run \
      -H "Content-Type: application/json" \
      -d '{"scenarios":["register","verify","login","logout"]}')
    
    STATUS=$(echo "$RESULT" | jq -r '.journey.status')
    
    if [ "$STATUS" != "passed" ]; then
      echo "::error::Synthetic journey failed"
      exit 1
    fi
```

### Rollback

```bash
SYNTHETIC_JOURNEY_ENABLED=false
```

---

## Monitoring & Maintenance

### Key Metrics to Monitor

#### Phase 1: Email Verification
- Verification rate (target: >70%)
- Resend rate limit hits (<1%)
- Verification token expiry rate

#### Phase 2: Sessions & 2FA
- Active sessions per user (1-3 average)
- 2FA adoption rate
- Session invalidation failures

#### Phase 3: CSRF
- CSRF validation failures (distinguish attack vs misconfiguration)
- Frontend integration errors

#### Phases 4-7: Internal Tooling
- PR analysis coverage (100% of PRs)
- Test ingestion success rate (>99%)
- Flaky test detection accuracy

### Logging

All phases log important events:

```bash
# View logs
serverless logs -f functionName --tail

# Or use CloudWatch
```

### Alerts

Set up alerts for:
- Rate limit abuse (Phase 1)
- Session invalidation failures (Phase 2)
- CSRF validation failures spike (Phase 3)
- Webhook authentication failures (Phase 4)

---

## Troubleshooting

### Common Issues

#### Email Verification Not Working
- Check `EMAIL_ENABLED=true`
- Verify SMTP credentials
- Check email logs for errors
- Test SMTP connection separately

#### 2FA Codes Not Validating
- Ensure `TWO_FACTOR_ENABLED=true`
- Check server time is synchronized (NTP)
- Verify otplib is installed: `npm list otplib`

#### CSRF Tokens Not Working
- Ensure `CSRF_ENABLED=true`
- Check frontend is sending `X-CSRF-Token` header
- Verify cookies are being set (check browser dev tools)
- Check cookie domain settings

#### PR Intelligence Not Receiving Data
- Verify `PR_INTEL_WEBHOOK_SECRET` matches in GitHub and backend
- Check GitHub Action logs
- Test HMAC signature generation manually

#### Tests Not Being Ingested
- Check `FLAKY_DETECTOR_ENABLED=true`
- Verify test results format matches expected schema
- Check CI logs for ingestion errors

### Getting Help

- Check `PHASE_*_README.md` files for phase-specific details
- Review test files for usage examples
- Check CloudWatch logs for errors

---

## Security Best Practices

1. **Secrets Management**
   - Never commit secrets to git
   - Use environment variables or secrets manager
   - Rotate secrets regularly

2. **Database Backups**
   - Backup before each migration
   - Test rollback procedures

3. **Monitoring**
   - Set up alerts for suspicious activity
   - Monitor rate limit hits
   - Track failed authentication attempts

4. **Updates**
   - Keep dependencies updated
   - Review security advisories
   - Test updates in staging first

---

## Support

For issues or questions:
1. Check this guide
2. Review phase-specific README files
3. Check test files for examples
4. Review CloudWatch logs
5. Contact team lead

---

**Last Updated:** 2025-11-11  
**Version:** 1.0.0  
**All Phases:** 1-7 Complete
