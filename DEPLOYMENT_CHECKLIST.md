# Production Deployment Checklist

**Last Updated:** November 12, 2025  
**Security Hardening:** ✅ Complete

---

## Pre-Deployment: Environment Configuration

### Backend Environment Variables (Lambda)

Set these in AWS Lambda environment or `serverless.yml`:

```bash
# Core Settings
NODE_ENV=production
STAGE=prod
AWS_REGION=us-west-2

# Database
DATABASE_URL=postgresql://user:pass@host:5432/valine_db?sslmode=require

# Authentication
JWT_SECRET=<generate-with-openssl-rand-base64-32>
ENABLE_REGISTRATION=false
ALLOWED_USER_EMAILS=owner@example.com

# Frontend
FRONTEND_URL=https://dkmxy676d3vgc.cloudfront.net

# Security
CSRF_ENABLED=true
RATE_LIMITING_ENABLED=true
TWO_FACTOR_ENABLED=false

# Optional
COOKIE_DOMAIN=
EMAIL_ENABLED=false
```

### Frontend Environment Variables (Build Time)

Set these before running `npm run build`:

```bash
NODE_ENV=production
VITE_API_BASE=https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com
VITE_ENABLE_REGISTRATION=false
VITE_ENABLE_AUTH=true
VITE_CSRF_ENABLED=true
```

---

## Deployment Steps

### 1. Backend Deployment

```bash
cd serverless

# Set environment variables
export NODE_ENV=production
export ENABLE_REGISTRATION=false
export ALLOWED_USER_EMAILS=owner@example.com
export JWT_SECRET=$(openssl rand -base64 32)

# Deploy
npm install
npx serverless deploy --stage prod --region us-west-2

# Verify
curl https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/health
```

**Expected Output:**
```json
{"ok":true,"status":"healthy"}
```

### 2. Frontend Deployment

```bash
# Set environment variables
export NODE_ENV=production
export VITE_API_BASE=https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com
export VITE_ENABLE_REGISTRATION=false

# Build (will validate API base)
npm run build

# Deploy to S3
aws s3 sync dist/ s3://your-frontend-bucket --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id dkmxy676d3vgc \
  --paths "/*"
```

### 3. Infrastructure Verification

**CloudFront Error Responses:**
```bash
# Verify SPA routing is configured
aws cloudfront get-distribution-config --id dkmxy676d3vgc \
  | jq '.DistributionConfig.CustomErrorResponses'
```

**Expected:** 403 → 200 /index.html, 404 → 200 /index.html

**WAF IP Allowlist:**
```bash
# Verify owner IP is in allowlist
aws wafv2 get-ip-set --scope CLOUDFRONT --id YOUR_IP_SET_ID --name owner-ip-allowlist
```

---

## Post-Deployment Verification

### 1. Security Tests

**Registration Disabled:**
```bash
curl -X POST https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","username":"test","displayName":"Test"}'
```
**Expected:** `{"error":"Registration is currently disabled"}` (403)

**Email Allowlist:**
```bash
# Login with allowed email (should succeed)
curl -X POST https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"correct-password"}' \
  -c cookies.txt

# Login with non-allowed email (should fail)
curl -X POST https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"hacker@evil.com","password":"correct-password"}'
```
**Expected:** `{"error":"Account not authorized for access"}` (403)

**Cookie Flags:**
```bash
# Check Set-Cookie headers from login
curl -v -X POST https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"correct-password"}' 2>&1 | grep -i "set-cookie"
```
**Expected:**
- `HttpOnly`
- `Secure`
- `SameSite=Strict`

**CORS Headers:**
```bash
curl -v https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/health \
  -H "Origin: https://dkmxy676d3vgc.cloudfront.net" 2>&1 | grep -i "access-control"
```
**Expected:**
- `Access-Control-Allow-Origin: https://dkmxy676d3vgc.cloudfront.net`
- `Access-Control-Allow-Credentials: true`
- NO wildcard (*)

### 2. Frontend Tests

**Signup UI Hidden:**
- Visit `https://dkmxy676d3vgc.cloudfront.net/login`
- Verify "Sign Up" link is NOT visible
- Verify `/register` route returns 404 or redirects

**API Base Correct:**
- Open browser DevTools → Network tab
- Login to site
- Verify API calls go to `i72dxlcfcc.execute-api.us-west-2.amazonaws.com`
- Verify NO calls to `cloudfront.net` for API requests

**SPA Routing:**
- Visit `https://dkmxy676d3vgc.cloudfront.net/dashboard` directly
- Should load React app, NOT S3 XML error

### 3. CloudWatch Logs

```bash
# Check for auth events
aws logs filter-log-events \
  --log-group-name /aws/lambda/pv-api-prod-login \
  --filter-pattern "Login" \
  --start-time $(date -u -d '10 minutes ago' +%s)000
```

**Look for:**
- `Login attempt failed: User not found`
- `Login blocked: Email X not in allowlist`
- NO passwords in logs

---

## Security Acceptance Criteria

Before going live, verify ALL of these are true:

- [ ] `ENABLE_REGISTRATION=false` in production Lambda
- [ ] `ALLOWED_USER_EMAILS` contains only owner email
- [ ] Registration endpoint returns 403
- [ ] Login with non-allowed email returns 403
- [ ] Cookies have `HttpOnly; Secure; SameSite=Strict`
- [ ] CORS restricted to production domain (no wildcard)
- [ ] Frontend signup UI is hidden
- [ ] Frontend API base points to API Gateway (not CloudFront)
- [ ] CloudFront error responses: 403/404 → 200 /index.html
- [ ] WAF IP allowlist active on CloudFront
- [ ] API Gateway resource policy restricts to owner IP
- [ ] JWT_SECRET is strong (256 bits)
- [ ] `CSRF_ENABLED=true` in production
- [ ] All tests pass (`npm test` in serverless/ and root/)

---

## Rollback Procedure

If issues are found after deployment:

### Backend Rollback
```bash
cd serverless
npx serverless rollback --timestamp PREVIOUS_TIMESTAMP --stage prod
```

### Frontend Rollback
```bash
# Restore previous S3 version
aws s3 sync s3://your-frontend-bucket-backup/ s3://your-frontend-bucket/ --delete

# Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id dkmxy676d3vgc --paths "/*"
```

### Emergency: Disable All Access
```bash
# Remove owner IP from WAF allowlist (blocks all access)
aws wafv2 update-ip-set --scope CLOUDFRONT --id YOUR_IP_SET_ID \
  --addresses ""
```

---

## Common Issues

### Issue: Login returns 403 for owner
**Cause:** Email not in `ALLOWED_USER_EMAILS`  
**Fix:** Add owner email to allowlist, redeploy Lambda

### Issue: Frontend API calls get 404
**Cause:** `VITE_API_BASE` points to CloudFront instead of API Gateway  
**Fix:** Rebuild with correct API base, redeploy

### Issue: CORS error in browser
**Cause:** Origin not in allowed list  
**Fix:** Add CloudFront domain to `FRONTEND_URL` or allowed origins

### Issue: SPA deep links show S3 XML error
**Cause:** CloudFront error responses not configured  
**Fix:** Add custom error responses in CloudFront settings

---

## Maintenance

**Weekly:**
- Review CloudWatch logs for failed login attempts
- Check IP allowlist is current

**Monthly:**
- Rotate JWT_SECRET (see `docs/runbooks/rotate-jwt-secret.md`)
- Review security audit logs

**As Needed:**
- Update IP allowlist when owner IP changes (`docs/runbooks/update-ip-allowlist.md`)
- Add second user (`docs/runbooks/add-user.md`)

---

## Support

- **Security Policy:** [SECURITY.md](SECURITY.md)
- **Security Audit:** [SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md)
- **Runbooks:** [docs/runbooks/](docs/runbooks/)
- **Issues:** [GitHub Issues](https://github.com/gcolon75/Project-Valine/issues)

---

**Status:** ✅ Production Ready  
**Last Security Review:** November 12, 2025  
**Next Review:** December 12, 2025
