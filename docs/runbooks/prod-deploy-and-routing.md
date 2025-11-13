# Production Deployment & Routing Runbook

## Overview

**Canonical production operations guide** for Project Valine infrastructure, deployment procedures, routing configuration, security hardening, and operational maintenance. This runbook consolidates all production-critical procedures including the local dev bypass feature documented in Section 12.

**Last Updated**: 2025-11-13  
**Owner**: Operations & Security Team  
**Risk Level**: Critical  
**Audience**: DevOps, Platform Engineers, Security Engineers

---

## Table of Contents

1. [Production Architecture](#1-production-architecture)
2. [Infrastructure Components](#2-infrastructure-components)
3. [Deployment Procedures](#3-deployment-procedures)
4. [Routing & DNS Configuration](#4-routing--dns-configuration)
5. [Security Hardening](#5-security-hardening)
6. [WAF Configuration & IP Allowlist Management](#6-waf-configuration--ip-allowlist-management)
7. [JWT Secret Rotation](#7-jwt-secret-rotation)
8. [Monitoring & Alerting](#8-monitoring--alerting)
9. [Incident Response](#9-incident-response)
10. [Backup & Recovery](#10-backup--recovery)
11. [Performance Optimization](#11-performance-optimization)
12. [Local Dev Bypass](#12-local-dev-bypass)
13. [WAF Detachment Procedures](#13-waf-detachment-procedures)
14. [Post-Deployment Verification](#14-post-deployment-verification)

---

## 1. Production Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ User Browser                                                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ CloudFront CDN (Edge Layer)                                  │
│ - Distribution ID: dkmxy676d3vgc                            │
│ - Custom Domain: projectvaline.com (future)                 │
│ - WAF: Rate limiting, geo-blocking (optional IP gating)    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ S3 Static Hosting (Frontend)                                │
│ - Bucket: valine-frontend-prod                             │
│ - React SPA with client-side routing                       │
└─────────────────────────────────────────────────────────────┘
                      │
                      ↓ (API Calls)
┌─────────────────────────────────────────────────────────────┐
│ API Gateway HTTP API                                         │
│ - API ID: i72dxlcfcc                                        │
│ - Region: us-west-2                                         │
│ - Resource Policy: Optional IP restrictions                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ AWS Lambda Functions (Backend)                               │
│ - Runtime: Node.js 20.x                                     │
│ - Serverless Framework deployment                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ RDS PostgreSQL Database                                      │
│ - Private subnet (no internet access)                      │
│ - Prisma ORM for queries                                   │
└─────────────────────────────────────────────────────────────┘
```

### Defense-in-Depth Layers

**Layer 1**: Edge Protection (CloudFront WAF - rate limiting, DDoS protection)  
**Layer 2**: Application Enforcement (email allowlist, registration lockdown)  
**Layer 3**: Session Security (JWT tokens, HttpOnly cookies, CSRF protection)  
**Layer 4**: Local Dev Bypass (localhost-only UX iteration tool with build guards)

---

## 2. Infrastructure Components

### CloudFront Distribution

| Property | Value |
|----------|-------|
| Distribution ID | `dkmxy676d3vgc` |
| Domain | `dkmxy676d3vgc.cloudfront.net` |
| Custom Domain | `projectvaline.com` (future) |
| SSL Certificate | AWS-managed (*.cloudfront.net) |
| Origin | S3 bucket: `valine-frontend-prod` |
| Cache Policy | CachingOptimized (recommended) |
| Origin Protocol | HTTPS only |

**Verification:**
```bash
aws cloudfront get-distribution --id dkmxy676d3vgc \
  --query 'Distribution.{Status:Status,DomainName:DomainName,Origins:Origins}'
```

### API Gateway

| Property | Value |
|----------|-------|
| API Type | HTTP API (v2) |
| API ID | `i72dxlcfcc` |
| Region | `us-west-2` |
| Stage | `$default` |
| CORS | Enabled (specific origins) |
| Endpoint | `https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com` |

**Verification:**
```bash
aws apigatewayv2 get-api --api-id i72dxlcfcc \
  --query '{Name:Name,ProtocolType:ProtocolType,ApiEndpoint:ApiEndpoint}'
```

### Lambda Functions

Deployed via Serverless Framework from `serverless/serverless.yml`:

- **Auth Functions**: login, register, logout, refresh, 2FA
- **User Functions**: createUser, getUser, updateUser
- **Content Functions**: reels, posts, comments
- **Internal Tooling**: PR Intel, test analytics, observability

**Deployment Command:**
```bash
cd serverless
serverless deploy --stage prod --region us-west-2
```

### RDS PostgreSQL

| Property | Value |
|----------|-------|
| Engine | PostgreSQL 15.x |
| Instance Class | db.t3.micro (development) / db.t3.small (production) |
| Storage | 20GB General Purpose SSD |
| Backup Retention | 7 days |
| Multi-AZ | Disabled (single-user app) |

**Connection String Format:**
```
postgresql://username:password@endpoint:5432/dbname?schema=public
```

---

## 3. Deployment Procedures

### Frontend Deployment

See dedicated runbook: [`docs/runbooks/frontend-deployment.md`](./frontend-deployment.md)

**Quick Reference:**
```bash
# 1. Set environment variables in .env.production
VITE_API_BASE=https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com
VITE_ENABLE_REGISTRATION=false
VITE_ENABLE_DEV_BYPASS=false  # CRITICAL: Must be false

# 2. Build
npm run build

# 3. Deploy to S3
aws s3 sync dist/ s3://valine-frontend-prod/ --delete

# 4. Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id dkmxy676d3vgc \
  --paths "/*"
```

### Backend Deployment

```bash
# 1. Set environment variables
export AWS_REGION=us-west-2
export STAGE=prod
export DATABASE_URL=postgresql://...
export JWT_SECRET=$(openssl rand -base64 32)
export ALLOWED_USER_EMAILS=owner@example.com,friend@example.com
export ENABLE_REGISTRATION=false

# 2. Deploy Lambda functions
cd serverless
npm install
serverless deploy --stage prod

# 3. Verify deployment
curl https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/health

# Expected: {"status":"healthy","timestamp":"..."}
```

### Database Migrations

```bash
cd serverless

# Run migrations (creates/updates tables)
npx prisma migrate deploy

# Verify schema
npx prisma db pull
npx prisma generate
```

**⚠️ CRITICAL**: Always backup database before migrations:
```bash
pg_dump -h <endpoint> -U <user> -d <dbname> > backup-$(date +%Y%m%d).sql
```

---

## 4. Routing & DNS Configuration

### Current Setup

**Frontend:** `https://dkmxy676d3vgc.cloudfront.net` → S3 bucket  
**API:** `https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com` → Lambda

### Future Custom Domain Setup

**Step 1: Request SSL Certificate**
```bash
aws acm request-certificate \
  --domain-name projectvaline.com \
  --subject-alternative-names www.projectvaline.com \
  --validation-method DNS \
  --region us-east-1  # CloudFront requires us-east-1
```

**Step 2: Configure CloudFront**
```bash
# Update distribution to use custom domain
aws cloudfront update-distribution --id dkmxy676d3vgc \
  --distribution-config file://cf-config-custom-domain.json
```

**Step 3: Update DNS (Route 53 or external registrar)**
```
projectvaline.com.       A       ALIAS dkmxy676d3vgc.cloudfront.net
www.projectvaline.com.   CNAME   dkmxy676d3vgc.cloudfront.net
```

**Step 4: Update CORS in API**
```bash
# Update serverless.yml
FRONTEND_URL=https://projectvaline.com
COOKIE_DOMAIN=.projectvaline.com
```

---

## 5. Security Hardening

### Access Control Configuration

**Registration Lockdown:**
```bash
# serverless/serverless.yml
ENABLE_REGISTRATION=false
```

**Email Allowlist (Post-Auth Gate):**
```bash
# serverless/serverless.yml
ALLOWED_USER_EMAILS=owner@example.com,friend@example.com
```

**Behavior:**
- User authenticates with valid credentials → password verified
- Middleware checks email against `ALLOWED_USER_EMAILS`
- If NOT in list → 403 Forbidden (no session created)
- If in list → JWT tokens issued, session established

**To add a user:**
See [`docs/runbooks/add-user.md`](./add-user.md)

### JWT Configuration

**Token Lifetimes:**
- Access Token: 30 minutes
- Refresh Token: 7 days

**Secret Management:**
```bash
# Generate strong secret (256 bits)
openssl rand -base64 32

# Set in environment
export JWT_SECRET=<generated-secret>

# Future: Migrate to AWS Secrets Manager
aws secretsmanager create-secret \
  --name valine/prod/jwt-secret \
  --secret-string "$(openssl rand -base64 32)"
```

**Rotation:** See [Section 7: JWT Secret Rotation](#7-jwt-secret-rotation)

### Cookie Security

**Production Flags:**
```javascript
{
  httpOnly: true,              // ✅ No JavaScript access
  secure: true,                // ✅ HTTPS only
  sameSite: 'Strict',          // ✅ CSRF protection
  domain: '.cloudfront.net',   // Scoped to application
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
}
```

### CORS Policy

**Allowed Origins:**
```bash
FRONTEND_URL=https://dkmxy676d3vgc.cloudfront.net
# Future: https://projectvaline.com
```

**Implementation:**
```javascript
// Strict origin validation (no wildcards)
const allowedOrigins = [process.env.FRONTEND_URL];
if (!allowedOrigins.includes(origin)) {
  return error('CORS policy violation', 403);
}
```

---

## 6. WAF Configuration & IP Allowlist Management

### Legacy IP Allowlist (Deprecated - See Section 13 for Removal)

**⚠️ DEPRECATION NOTICE**: Static IP allowlisting at the edge is being retired in favor of application-level email allowlist enforcement. This provides better flexibility for remote access while maintaining security.

**Current WAF Setup (If Still Active):**

CloudFront WAF WebACL: `AllowOnlyMyIP-CloudFront`  
API Gateway Resource Policy: IP-based Deny rules

**To Update Owner IP (Legacy - If Not Yet Detached):**

```bash
# 1. Get current IP set
aws wafv2 get-ip-set \
  --scope CLOUDFRONT \
  --id <ip-set-id> \
  --name valine-owner-ips \
  --region us-east-1

# 2. Update IP addresses
aws wafv2 update-ip-set \
  --scope CLOUDFRONT \
  --id <ip-set-id> \
  --addresses <new-owner-ip>/32 <friend-ip>/32 \
  --lock-token <lock-token-from-get> \
  --region us-east-1
```

**Resource Policy Update (Legacy):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": "arn:aws:execute-api:us-west-2:*:i72dxlcfcc/*",
      "Condition": {
        "NotIpAddress": {
          "aws:SourceIp": ["<owner-ip>/32", "<friend-ip>/32"]
        }
      }
    }
  ]
}
```

### Recommended WAF Configuration (Post-Detachment)

Use WAF for rate limiting and basic threat protection, NOT static IP gating:

```bash
# Create rate-based rule (100 req/5min per IP)
aws wafv2 create-web-acl \
  --scope CLOUDFRONT \
  --name valine-rate-limit \
  --default-action Allow={} \
  --rules file://waf-rate-limit-rules.json \
  --region us-east-1
```

**Example Rate Limit Rule:**
```json
{
  "Name": "RateLimitRule",
  "Priority": 1,
  "Statement": {
    "RateBasedStatement": {
      "Limit": 100,
      "AggregateKeyType": "IP"
    }
  },
  "Action": {
    "Block": {}
  },
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "RateLimitMetric"
  }
}
```

---

## 7. JWT Secret Rotation

**Frequency:** Every 90 days or after suspected compromise

See dedicated runbook: [`docs/runbooks/rotate-jwt-secret.md`](./rotate-jwt-secret.md)

**Zero-Downtime Procedure:**

1. Generate new secret: `JWT_SECRET_NEW=$(openssl rand -base64 32)`
2. Add to environment (both old and new accepted during transition)
3. Update token verification to try both secrets
4. Wait 7 days (refresh token TTL)
5. Remove old secret
6. Rename `JWT_SECRET_NEW` → `JWT_SECRET`

**Redeploy Lambda:**
```bash
cd serverless
serverless deploy function -f login --stage prod
serverless deploy function -f me --stage prod
serverless deploy function -f refresh --stage prod
```

---

## 8. Monitoring & Alerting

### CloudWatch Metrics

**Lambda Metrics:**
- Invocations
- Errors
- Duration
- Throttles

**API Gateway Metrics:**
- Request Count
- 4XX Errors
- 5XX Errors
- Latency

**Dashboard Creation:**
```bash
aws cloudwatch put-dashboard \
  --dashboard-name Valine-Production \
  --dashboard-body file://cloudwatch-dashboard.json
```

### Log Insights Queries

**Failed Login Attempts:**
```sql
fields @timestamp, @message
| filter @message like /login failed/
| stats count() as attempts by sourceIp
| sort attempts desc
| limit 20
```

**High Error Rate:**
```sql
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() as errors by bin(5m)
```

### Alerting

**SNS Topic Setup:**
```bash
aws sns create-topic --name valine-prod-alerts

aws sns subscribe \
  --topic-arn arn:aws:sns:us-west-2:...:valine-prod-alerts \
  --protocol email \
  --notification-endpoint ops@projectvaline.com
```

**CloudWatch Alarms:**
```bash
# High 5XX error rate
aws cloudwatch put-metric-alarm \
  --alarm-name valine-high-errors \
  --alarm-description "API 5XX error rate > 5%" \
  --metric-name 5XXError \
  --namespace AWS/ApiGateway \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-west-2:...:valine-prod-alerts
```

---

## 9. Incident Response

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| **P0** | Complete outage | 15 minutes |
| **P1** | Degraded performance | 1 hour |
| **P2** | Minor issue | 4 hours |
| **P3** | Cosmetic bug | Next release |

### Incident Checklist

- [ ] Identify affected components (frontend/backend/database)
- [ ] Check CloudWatch logs and metrics
- [ ] Verify AWS service health: https://status.aws.amazon.com
- [ ] Rollback if recent deployment caused issue
- [ ] Communicate status to stakeholders
- [ ] Document incident in post-mortem

### Common Issues

**Issue: API Gateway 403 Forbidden**

**Cause:** IP not in allowlist (if legacy WAF still active)

**Solution:**
1. Verify source IP: `curl https://ifconfig.me`
2. Update WAF IP set (see Section 6) OR detach WAF (see Section 13)
3. Verify: `curl https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/health`

**Issue: JWT Token Invalid**

**Cause:** Secret mismatch or token expired

**Solution:**
1. Check `JWT_SECRET` in Lambda environment
2. Verify token not expired: decode at jwt.io
3. Re-login to get fresh token

**Issue: Database Connection Timeout**

**Cause:** RDS instance stopped or network issue

**Solution:**
1. Start RDS instance: `aws rds start-db-instance --db-instance-identifier valine-prod`
2. Verify security group allows Lambda access
3. Check CloudWatch logs for connection errors

---

## 10. Backup & Recovery

### Database Backups

**Automated Backups:**
- Retention: 7 days
- Backup window: 03:00-04:00 UTC
- Encryption: Enabled (AWS KMS)

**Manual Snapshot:**
```bash
aws rds create-db-snapshot \
  --db-instance-identifier valine-prod \
  --db-snapshot-identifier valine-manual-$(date +%Y%m%d)
```

**Restore from Snapshot:**
```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier valine-restored \
  --db-snapshot-identifier valine-manual-20251113
```

### Frontend Backups

**Before each deployment:**
```bash
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)

aws s3 sync s3://valine-frontend-prod/ \
  s3://valine-frontend-backups/backup-${BACKUP_DATE}/
```

**Restore:**
```bash
aws s3 sync s3://valine-frontend-backups/backup-20251113_120000/ \
  s3://valine-frontend-prod/ \
  --delete
```

### Lambda Code Backups

**Serverless Framework automatically versions:**
```bash
# List versions
aws lambda list-versions-by-function --function-name pv-api-prod-login

# Rollback to previous version
aws lambda update-function-code \
  --function-name pv-api-prod-login \
  --s3-bucket serverless-deployments \
  --s3-key pv-api/prod/...
```

---

## 11. Performance Optimization

### CloudFront Caching

**Static Assets:**
- Cache-Control: `public, max-age=31536000, immutable`
- Compress: Gzip, Brotli
- File types: JS, CSS, images, fonts

**index.html:**
- Cache-Control: `no-cache, no-store, must-revalidate`
- Ensures users always get latest version

### Lambda Optimization

**Cold Start Reduction:**
- Provisioned concurrency (if needed): `aws lambda put-provisioned-concurrency-config`
- Keep dependencies minimal
- Use esbuild for tree-shaking

**Database Connection Pooling:**
```javascript
// Prisma connection pooling
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connection_limit=5'
    }
  }
});
```

### API Gateway Throttling

**Protect backend from overload:**
```bash
aws apigatewayv2 update-stage \
  --api-id i72dxlcfcc \
  --stage-name $default \
  --throttle-settings RateLimit=1000,BurstLimit=2000
```

---

## 12. Local Dev Bypass

### Overview

The **Dev Bypass** feature enables rapid UX iteration during local development by bypassing authentication. This is a **localhost-only**, **frontend-only** feature with multiple security safeguards to prevent accidental production exposure.

⚠️ **CRITICAL**: Dev Bypass MUST be disabled in all production deployments.

### Triple-Gate Security Architecture

**Gate 1: Hostname Check (Runtime)**
```javascript
window.location.hostname === 'localhost'
```
Button only renders when accessed via `localhost`. Accessing via IP (`127.0.0.1`) or production domain hides the button.

**Gate 2: Environment Flag (Runtime)**
```javascript
import.meta.env.VITE_ENABLE_DEV_BYPASS === 'true'
```
Must explicitly enable in `.env.local`. Default is `false` in all environments.

**Gate 3: Build Guard (Build Time)**
```javascript
// scripts/prebuild.js
if (VITE_ENABLE_DEV_BYPASS === 'true' && 
    /cloudfront\.net|projectvaline\.com/.test(VITE_FRONTEND_URL)) {
  throw new Error('Build failed: Dev bypass enabled for production domain!');
}
```
Build **fails** if dev bypass is enabled AND `VITE_FRONTEND_URL` contains production domains.

### Enabling Dev Bypass Locally

**Step 1: Set Environment Variables**

Create `.env.local`:
```bash
VITE_ENABLE_DEV_BYPASS=true
VITE_FRONTEND_URL=http://localhost:5173
```

**Step 2: Start Development Server**
```bash
npm run dev
```

**Step 3: Access Login Page**

Navigate to `http://localhost:5173/login`

A purple/pink gradient "Dev Bypass" button appears below the login form.

### How It Works

**When Dev Bypass Button Clicked:**

1. Creates mock user object:
```javascript
{
  id: 'dev-user',
  email: 'dev@local',
  username: 'dev-bypass',
  displayName: 'Dev Bypass User',
  onboardingComplete: true,
  profileComplete: true,
  emailVerified: true,
  roles: ['DEV_BYPASS']
}
```

2. Saves to `localStorage` under key `devUserSession`
3. No backend token generated (pure frontend session)
4. Redirects to `/dashboard`
5. Shows prominent warning banner: "DEV SESSION (NO REAL AUTH) - Localhost Only"

**On Logout:**
- Clears `devUserSession` from localStorage
- Returns to login page

**On Page Reload:**
- Dev session restored from localStorage (if on localhost)

### Pre-Production Checklist

Before deploying to production, verify:

- [ ] `VITE_ENABLE_DEV_BYPASS=false` in `.env.production`
- [ ] `VITE_FRONTEND_URL` points to production domain
- [ ] Run `npm run build` locally to test prebuild guard
- [ ] Verify no "Dev Bypass" button in production build preview
- [ ] Check DEV SESSION banner never appears in production

### Backend Dev Bypass Stub (Future)

A backend endpoint stub exists at `serverless/src/handlers/devBypass.js` but is **NOT wired** to API Gateway and **NOT enabled**. This stub documents future implementation if server-side dev bypass is needed.

**Environment Variable:**
```bash
# serverless/serverless.yml
DEV_BYPASS_ENABLED=false  # Always false, disabled by default
```

**Reference in docs:** Disabled by default; use only for ephemeral local backend testing.

### Troubleshooting

**Problem:** Dev Bypass button not showing on localhost

**Solutions:**
1. Verify `VITE_ENABLE_DEV_BYPASS=true` in `.env.local`
2. Ensure accessing via `http://localhost:5173` (not `http://127.0.0.1:5173`)
3. Restart dev server
4. Clear browser cache and localStorage

**Problem:** Build fails with "Dev bypass enabled for production domain"

**Solution:** Set `VITE_ENABLE_DEV_BYPASS=false` in `.env.production`

**Problem:** DEV SESSION banner stuck after disabling

**Solution:**
1. Open DevTools → Application → Local Storage
2. Delete `devUserSession` key
3. Reload page

---

## 13. WAF Detachment Procedures

This section documents how to retire the legacy static IP allowlist at the CloudFront and API Gateway layers, transitioning to application-level email allowlist enforcement.

### Why Detach IP Allowlist?

**Limitations of Edge IP Gating:**
- Requires manual updates when user IP changes (dynamic ISPs)
- Prevents legitimate remote access for authorized users
- Does not scale for multiple authorized users
- VPN/mobile access blocked

**Benefits of App-Level Email Allowlist:**
- Access from any IP with valid credentials
- Centralized user management (add/remove emails)
- Better audit trail (CloudWatch logs show who logged in)
- Scales to multiple authorized users

### Pre-Detachment Checklist

- [ ] Verify `ALLOWED_USER_EMAILS` is configured in `serverless/serverless.yml`
- [ ] Test email allowlist enforcement (see Section 14)
- [ ] Backup current WAF and resource policy configurations
- [ ] Schedule maintenance window (minimal downtime expected)
- [ ] Notify authorized users of upcoming change

### Step 1: Detach CloudFront WAF WebACL

**Via AWS Console:**

1. Navigate to CloudFront → Distributions → `dkmxy676d3vgc`
2. Go to "Security" tab
3. Click "Edit" under "AWS WAF web ACL"
4. Select "No associated web ACL"
5. Click "Save changes"

**Via AWS CLI:**

```bash
# Get current distribution config
aws cloudfront get-distribution-config \
  --id dkmxy676d3vgc \
  > cf-config.json

# Edit cf-config.json: Remove "WebACLId" field

# Update distribution
aws cloudfront update-distribution \
  --id dkmxy676d3vgc \
  --if-match <ETag-from-get-config> \
  --distribution-config file://cf-config-updated.json
```

**Verification:**
```bash
aws cloudfront get-distribution --id dkmxy676d3vgc \
  --query 'Distribution.DistributionConfig.WebACLId'

# Expected: null or empty
```

### Step 2: Remove API Gateway Resource Policy IP Restrictions

**Via AWS Console:**

1. Navigate to API Gateway → APIs → `i72dxlcfcc`
2. Go to "Authorization" → "Resource Policy"
3. Remove the Deny statement with `NotIpAddress` condition
4. Save changes and deploy

**Via AWS CLI:**

```bash
# Get current resource policy
aws apigatewayv2 get-api --api-id i72dxlcfcc \
  --query 'Policy' > api-policy.json

# Edit api-policy.json: Remove IP-based Deny statement

# Update policy
aws apigatewayv2 update-api \
  --api-id i72dxlcfcc \
  --policy file://api-policy-updated.json
```

**Example Updated Policy (Allow All):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": "arn:aws:execute-api:us-west-2:*:i72dxlcfcc/*"
    }
  ]
}
```

### Step 3: (Optional) Configure WAF for Rate Limiting Only

Instead of completely removing WAF, configure it for DDoS protection and rate limiting without static IP gating:

```bash
# Create new rate-limit-only WebACL
aws wafv2 create-web-acl \
  --scope CLOUDFRONT \
  --name valine-rate-limit-only \
  --default-action Allow={} \
  --rules file://rate-limit-rules.json \
  --region us-east-1

# Associate with CloudFront
aws cloudfront update-distribution \
  --id dkmxy676d3vgc \
  --distribution-config file://cf-config-with-rate-limit.json
```

### Step 4: Update Documentation

- [ ] Update SECURITY.md Layer 1 to reflect retirement
- [ ] Update this runbook to mark legacy sections as deprecated
- [ ] Notify team via Slack/email
- [ ] Update deployment checklist to remove IP update steps

---

## 14. Post-Deployment Verification

### Comprehensive Verification Checklist

After any production deployment or WAF detachment, perform these manual checks.

See detailed manual verification guide: [`docs/runbooks/verify-auth-hardening.md`](./verify-auth-hardening.md)

#### Public Access Verification (Post-WAF Detachment)

- [ ] Access frontend from non-allowlisted IP
- [ ] Confirm login page loads (no 403 at edge)
- [ ] Verify static assets load correctly

**Test:**
```bash
# From any IP (not owner IP)
curl -I https://dkmxy676d3vgc.cloudfront.net

# Expected: HTTP/2 200
```

#### Email Allowlist Enforcement

- [ ] Login with allowlisted email + valid password → 200 OK
- [ ] Login with non-allowlisted email + valid password → 403 Forbidden
- [ ] Login with invalid credentials → 401 Unauthorized

**Test Script:**
```bash
# Allowlisted user (should succeed)
curl -X POST https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"validpassword"}' \
  -v

# Expected: 200 OK, Set-Cookie headers present

# Non-allowlisted user (should fail)
curl -X POST https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"hacker@evil.com","password":"validpassword"}' \
  -v

# Expected: 403 Forbidden, "not authorized" message
```

#### Dev Bypass Absence in Production

- [ ] Access production login page
- [ ] Verify no "Dev Bypass" button visible
- [ ] Check browser console for no dev bypass warnings

**Browser Test:**
1. Open `https://dkmxy676d3vgc.cloudfront.net/login`
2. Open DevTools Console (F12)
3. Run: `console.log(import.meta.env.VITE_ENABLE_DEV_BYPASS)`
4. Expected: `undefined` or `"false"`

#### Cookie Security Flags

- [ ] Access production site and login
- [ ] Open DevTools → Application → Cookies
- [ ] Verify `access_token` and `refresh_token` cookies have:
  - `HttpOnly` flag set
  - `Secure` flag set (HTTPS only)
  - `SameSite=Strict` or `SameSite=Lax`

#### CORS Verification

- [ ] API returns correct `Access-Control-Allow-Origin` header
- [ ] Credentials allowed only for whitelisted origins

**Test:**
```bash
curl -X OPTIONS https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/login \
  -H "Origin: https://dkmxy676d3vgc.cloudfront.net" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Expected headers:
# access-control-allow-origin: https://dkmxy676d3vgc.cloudfront.net
# access-control-allow-credentials: true
```

#### Performance & Availability

- [ ] CloudFront cache hit ratio > 80% (static assets)
- [ ] API Gateway latency < 500ms (p95)
- [ ] Lambda cold starts < 2 seconds
- [ ] RDS connections stable (no timeouts)

**CloudWatch Metrics Check:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name CacheHitRate \
  --dimensions Name=DistributionId,Value=dkmxy676d3vgc \
  --start-time 2025-11-13T00:00:00Z \
  --end-time 2025-11-13T23:59:59Z \
  --period 3600 \
  --statistics Average
```

---

## Related Runbooks

- [Frontend Deployment](./frontend-deployment.md) - Detailed frontend deployment procedures
- [Add User](./add-user.md) - User access management
- [Rotate JWT Secret](./rotate-jwt-secret.md) - JWT secret rotation procedures
- [Update IP Allowlist](./update-ip-allowlist.md) - Legacy IP allowlist management (deprecated)
- [Verify Auth Hardening](./verify-auth-hardening.md) - Manual security verification steps

---

## Change Log

| Date | Change | Operator |
|------|--------|----------|
| 2025-11-13 | Initial comprehensive production runbook created | Documentation Agent |
| 2025-11-13 | Added Section 12: Local Dev Bypass | Documentation Agent |
| 2025-11-13 | Added Section 13: WAF Detachment Procedures | Documentation Agent |
| 2025-11-13 | Added Section 14: Post-Deployment Verification | Documentation Agent |

---

**Document Version**: 1.0  
**Next Review**: 2025-12-13 (monthly reviews recommended)
