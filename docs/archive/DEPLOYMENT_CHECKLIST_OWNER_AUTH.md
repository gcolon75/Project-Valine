# Owner-Only Auth Deployment Checklist

Use this checklist to track deployment progress and ensure all steps are completed.

## Pre-Deployment

- [ ] Review code changes in PR
- [ ] Verify AWS credentials configured locally
- [ ] Backup current Lambda environment variables
- [ ] Backup current frontend build (S3 version IDs)

## Backend Deployment

- [ ] Set Lambda environment variables:
  - [ ] `DATABASE_URL` (PostgreSQL connection string)
  - [ ] `JWT_SECRET` (secure 256-bit string)
  - [ ] `NODE_ENV=production`
  - [ ] `FRONTEND_URL=https://dkmxy676d3vgc.cloudfront.net`
  - [ ] `API_BASE_URL=https://dkmxy676d3vgc.cloudfront.net/api`
  - [ ] `COOKIE_DOMAIN=dkmxy676d3vgc.cloudfront.net`
  - [ ] `ENABLE_REGISTRATION=false`
  - [ ] `ALLOWED_USER_EMAILS=ghawk075@gmail.com`
  - [ ] `CSRF_ENABLED=false`

- [ ] Deploy serverless backend:
  ```bash
  cd serverless
  npm ci
  npx prisma generate
  serverless deploy --stage prod --region us-west-2 --verbose
  ```

- [ ] Verify deployment:
  - [ ] No errors in deployment output
  - [ ] All functions deployed successfully
  - [ ] Check Lambda logs for Prisma initialization (no errors)

## CloudFront Configuration

- [ ] Verify CloudFront function `stripApiPrefix`:
  - [ ] Function exists
  - [ ] Function is **PUBLISHED** (LIVE)
  - [ ] Code is correct (strips /api prefix)

- [ ] Verify CloudFront behavior `/api/*`:
  - [ ] Origin: API Gateway
  - [ ] Cache Policy: CachingDisabled
  - [ ] Origin Request Policy: AllViewerExceptHostHeader
  - [ ] Function association: Viewer Request → stripApiPrefix

- [ ] Invalidate CloudFront cache:
  ```bash
  aws cloudfront create-invalidation --distribution-id E16LPJDBIL5DEE --paths "/*"
  ```
  - [ ] Wait for Status: Completed
  - [ ] Record invalidation ID: _______________

## Frontend Deployment

- [ ] Build frontend with production env:
  ```bash
  NODE_ENV=production npm run build
  ```
  - [ ] Verify dist/ directory created
  - [ ] Check build output for errors

- [ ] Deploy to S3:
  ```bash
  aws s3 sync dist/ s3://valine-frontend-prod --delete --exclude "index.html"
  aws s3 cp dist/index.html s3://valine-frontend-prod/index.html --cache-control "no-cache"
  ```

- [ ] Invalidate CloudFront cache again:
  ```bash
  aws cloudfront create-invalidation --distribution-id E16LPJDBIL5DEE --paths "/*"
  ```
  - [ ] Wait for Status: Completed

## Testing & Verification

### API Routing Tests

- [ ] Test health endpoint returns JSON:
  ```bash
  curl -v https://dkmxy676d3vgc.cloudfront.net/api/health
  ```
  - [ ] Status: 200
  - [ ] Content-Type: application/json
  - [ ] Body: `{"status":"ok"}`

### Owner Registration (SHOULD SUCCEED)

- [ ] Register owner account:
  ```bash
  curl -v -X POST https://dkmxy676d3vgc.cloudfront.net/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"ghawk075@gmail.com","password":"<password>","username":"gcolon75","displayName":"Guillermo Colon"}' \
    -c cookies.txt
  ```
  - [ ] Status: 201
  - [ ] Set-Cookie: access_token present
  - [ ] Set-Cookie: refresh_token present
  - [ ] Cookies have HttpOnly flag
  - [ ] Cookies have Secure flag
  - [ ] Cookie Domain: dkmxy676d3vgc.cloudfront.net

### Non-Owner Registration (SHOULD FAIL)

- [ ] Attempt non-owner registration:
  ```bash
  curl -v -X POST https://dkmxy676d3vgc.cloudfront.net/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"hacker@evil.com","password":"password","username":"hacker","displayName":"Hacker"}'
  ```
  - [ ] Status: 403
  - [ ] Error: "Registration is currently disabled"
  - [ ] No Set-Cookie headers

### Owner Login (SHOULD SUCCEED)

- [ ] Login as owner:
  ```bash
  curl -v -X POST https://dkmxy676d3vgc.cloudfront.net/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"ghawk075@gmail.com","password":"<password>"}' \
    -c cookies.txt
  ```
  - [ ] Status: 200
  - [ ] Set-Cookie headers present
  - [ ] Response contains user object

### Browser Testing

- [ ] Open browser in Incognito mode
- [ ] Navigate to: https://dkmxy676d3vgc.cloudfront.net
- [ ] Site loads successfully
- [ ] Attempt non-owner registration:
  - [ ] Click "Sign Up"
  - [ ] Enter non-owner email
  - [ ] Verify error message displayed
- [ ] Login as owner:
  - [ ] Click "Sign In"
  - [ ] Enter owner credentials
  - [ ] Login succeeds
  - [ ] Redirected to dashboard
- [ ] Check DevTools → Application → Cookies:
  - [ ] `access_token` cookie present
  - [ ] `refresh_token` cookie present
  - [ ] HttpOnly: ✓
  - [ ] Secure: ✓
  - [ ] SameSite: Strict
  - [ ] Domain: dkmxy676d3vgc.cloudfront.net
- [ ] Test authenticated functionality:
  - [ ] Create profile
  - [ ] Upload media
  - [ ] Create post
  - [ ] All succeed

### Lambda Logs Review

- [ ] Check register handler logs:
  ```bash
  aws logs tail /aws/lambda/pv-api-prod-register --follow --region us-west-2
  ```
  - [ ] See: "Registration allowed for allowlisted email: ghawk075@gmail.com"
  - [ ] See: "Registration blocked: ..." for non-owner attempts

- [ ] Check login handler logs:
  ```bash
  aws logs tail /aws/lambda/pv-api-prod-login --follow --region us-west-2
  ```
  - [ ] No Prisma initialization errors
  - [ ] See successful login for owner
  - [ ] See blocked login for non-owner (if tested)

## Evidence Collection

- [ ] CloudFront screenshots:
  - [ ] Behaviors tab showing /api/* configuration
  - [ ] Function associations showing stripApiPrefix
  - [ ] Invalidation completion

- [ ] API test transcripts:
  - [ ] Owner registration (201 with cookies)
  - [ ] Non-owner registration (403)
  - [ ] Owner login (200 with cookies)
  - [ ] Headers showing JSON content-type

- [ ] Lambda logs:
  - [ ] No Prisma errors
  - [ ] Registration allowlist enforcement logs
  - [ ] Login allowlist enforcement logs

- [ ] Browser screenshots:
  - [ ] DevTools showing cookies
  - [ ] Successful owner login
  - [ ] Failed non-owner attempt
  - [ ] Authenticated dashboard access

- [ ] Environment config:
  - [ ] Lambda env vars (redacted sensitive values)
  - [ ] Showing ALLOWED_USER_EMAILS=ghawk075@gmail.com

## Post-Deployment

- [ ] Monitor CloudWatch for errors (first 30 minutes)
- [ ] Test from multiple browsers/devices
- [ ] Document any issues encountered
- [ ] Update deployment documentation with actual timestamps
- [ ] Create GitHub issue to rotate JWT_SECRET (security note)

## Rollback (If Needed)

- [ ] Rollback backend:
  ```bash
  serverless rollback --timestamp <timestamp> --stage prod
  ```
- [ ] Restore S3 frontend to previous version
- [ ] Restore Lambda environment variables
- [ ] Invalidate CloudFront cache
- [ ] Document rollback reason and timestamp

---

**Deployment Started:** _______________ UTC  
**Deployment Completed:** _______________ UTC  
**Deployed By:** _______________  
**Status:** ⬜ Success / ⬜ Partial / ⬜ Rolled Back  
**Issues Encountered:** _______________  
**Evidence Location:** _______________
