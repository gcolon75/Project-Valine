# Cookie Auth 401 Fix - Deployment Guide

## Quick Start

This guide provides step-by-step instructions to deploy the cookie authentication fix that resolves persistent 401 errors.

## Prerequisites

- PowerShell 5.1 or later
- Node.js 20.x
- AWS CLI configured with appropriate credentials
- Access to the Project Valine repository

## Pre-Deployment Checklist

- [ ] Review CloudWatch logs for current 401 error rate
- [ ] Backup current Lambda function configurations
- [ ] Verify environment variables are set correctly
- [ ] Confirm Prisma schema is up to date
- [ ] Test changes locally if possible

## Deployment Steps

### 1. Prepare Environment

```powershell
# Clone or update repository
cd C:\path\to\Project-Valine
git pull origin main  # or your branch

# Navigate to serverless directory
cd serverless

# Verify Node.js version
node --version  # Should be v20.x
```

### 2. Install Dependencies

```powershell
# Clean install dependencies (recommended for production)
Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
npm ci

# Or update existing dependencies
npm install
```

### 3. Generate Prisma Client

```powershell
# Generate Prisma client for Lambda
npm run prisma:generate

# Verify generation succeeded
Test-Path node_modules\.prisma\client\index.js
# Should return: True
```

### 4. Build Prisma Lambda Layer (if needed)

**Only required if**:
- First deployment
- Prisma version changed
- Schema changed significantly

```powershell
# Build layer using PowerShell script
npm run build:layer:powershell

# Verify layer was created
Test-Path layers\prisma-layer.zip
# Should return: True

# Check layer size (should be ~93MB compressed)
(Get-Item layers\prisma-layer.zip).Length / 1MB
```

### 5. Run Tests

```powershell
# Run all tests
npm test

# Or run specific cookie extraction tests
npm test -- cookie-extraction-v2.test.js

# Expected: ✓ 38 tests passing
```

### 6. Deploy to Production

```powershell
# Deploy with explicit stage and region
npx serverless deploy --stage prod --region us-west-2

# Expected output:
# ✔ Service deployed to stack pv-api-prod
# 
# endpoints:
#   GET - https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/health
#   ...
# 
# functions:
#   authRouter: pv-api-prod-authRouter
#   profilesRouter: pv-api-prod-profilesRouter
#   ...
```

**Deployment typically takes 2-5 minutes.**

### 7. Verify Deployment

```powershell
# Check deployment info
npx serverless info --stage prod --region us-west-2

# Expected:
# service: pv-api
# stage: prod
# region: us-west-2
# stack: pv-api-prod
# ...
```

## Post-Deployment Verification

### 1. Health Check

```powershell
# Test health endpoint (no auth required)
$response = Invoke-RestMethod -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/health" -Method Get
$response | ConvertTo-Json

# Expected: { "status": "ok", "timestamp": "..." }
```

### 2. Check CloudWatch Logs

```powershell
# Open CloudWatch Logs in browser
Start-Process "https://console.aws.amazon.com/cloudwatch/home?region=us-west-2#logsV2:log-groups"

# Look for log groups:
# - /aws/lambda/pv-api-prod-authRouter
# - /aws/lambda/pv-api-prod-profilesRouter
# - /aws/lambda/pv-api-prod-getUploadUrl
```

### 3. Test Authentication Flow

**Browser Testing**:
1. Open `https://dkmxy676d3vgc.cloudfront.net` in Incognito/Private window
2. Open DevTools → Network tab
3. Log in with test credentials
4. Verify cookies are set:
   - `access_token` (HttpOnly)
   - `refresh_token` (HttpOnly)
   - `XSRF-TOKEN`
5. Navigate to profile edit
6. Attempt avatar upload
7. Check Network tab - should see 200 responses (not 401)

**PowerShell Testing** (requires valid token):
```powershell
# Login and capture cookies
$loginBody = @{
    email = "test@example.com"
    password = "your-password"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod `
    -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/auth/login" `
    -Method Post `
    -Body $loginBody `
    -ContentType "application/json" `
    -SessionVariable session

# Test /me/profile endpoint
$profileResponse = Invoke-RestMethod `
    -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/me/profile" `
    -Method Get `
    -WebSession $session

$profileResponse | ConvertTo-Json

# Expected: User profile data (200 OK)
```

### 4. Monitor for 401 Errors

```powershell
# Check recent logs for 401 errors (requires AWS CLI)
aws logs tail /aws/lambda/pv-api-prod-profilesRouter --follow --filter-pattern "401"

# Should see significantly fewer 401 errors
```

### 5. Review Diagnostic Logs

Look for extraction diagnostics in CloudWatch:
```
[extractToken] {
  tokenType: 'access',
  hasCookiesArray: true,
  hasHeadersCookie: false,
  hasMultiValueHeaders: false,
  cookiesArrayLength: 2
}
[extractToken] Found in event.cookies[]
```

## Troubleshooting

### Issue: Deployment Fails

**Error**: `Deployment failed: An error occurred`

**Solution**:
```powershell
# Check AWS credentials
aws sts get-caller-identity

# Check Serverless config
npx serverless print --stage prod --region us-west-2

# Try deploy with verbose output
npx serverless deploy --stage prod --region us-west-2 --verbose
```

### Issue: Still Seeing 401 Errors

**Check 1**: Verify cookies are being sent
```powershell
# Check browser DevTools → Network → Request Headers
# Should see: Cookie: access_token=...; refresh_token=...
```

**Check 2**: Check CloudWatch logs
```powershell
# Look for extraction diagnostics
aws logs tail /aws/lambda/pv-api-prod-profilesRouter --follow
```

**Check 3**: Verify JWT secret is set
```powershell
# Check Lambda environment variables
aws lambda get-function-configuration --function-name pv-api-prod-profilesRouter | ConvertFrom-Json | Select-Object -ExpandProperty Environment
```

**Check 4**: Test token extraction
- Diagnostic logs should show which source found cookies
- If logs show "Token not found", cookies aren't reaching Lambda

### Issue: Prisma Layer Too Large

**Error**: `Unzipped size must be smaller than 262144000 bytes`

**Solution**:
```powershell
# Remove node_modules before building layer
Remove-Item layers\nodejs\node_modules -Recurse -Force -ErrorAction SilentlyContinue

# Rebuild with production dependencies only
cd layers\nodejs
npm ci --omit=dev
cd ..\..

# Re-zip layer
npm run build:layer:powershell
```

### Issue: Environment Variables Missing

**Check variables**:
```powershell
# List all environment variables for a function
aws lambda get-function-configuration `
    --function-name pv-api-prod-profilesRouter `
    --query 'Environment.Variables' `
    --output json
```

**Update variables** (if needed):
```powershell
# Update via Serverless Framework
npx serverless deploy --stage prod --region us-west-2 --update-config

# Or update directly via AWS CLI
aws lambda update-function-configuration `
    --function-name pv-api-prod-profilesRouter `
    --environment "Variables={JWT_SECRET=your-secret,DATABASE_URL=your-url,...}"
```

## Rollback Procedure

If deployment causes issues:

### Option 1: Quick Rollback (Recommended)

```powershell
# Serverless Framework stores previous versions
npx serverless rollback --stage prod --region us-west-2

# Confirm rollback
npx serverless info --stage prod --region us-west-2
```

### Option 2: Deploy Previous Version

```powershell
# Checkout previous commit
git log --oneline  # Find commit hash before changes
git checkout <commit-hash>

# Deploy
cd serverless
npx serverless deploy --stage prod --region us-west-2

# Return to current branch
git checkout main
```

### Option 3: Manual Function Update

```powershell
# Get previous function code from S3
aws s3 ls s3://pv-api-prod-serverlessdeploymentbucket-*/

# Download previous deployment package
aws s3 cp s3://bucket-name/path/to/previous/package.zip ./previous.zip

# Update function
aws lambda update-function-code `
    --function-name pv-api-prod-profilesRouter `
    --zip-file fileb://previous.zip
```

## Success Metrics

After successful deployment, you should see:

- ✅ 401 error rate drops to near zero for authenticated endpoints
- ✅ Avatar/banner uploads succeed
- ✅ Profile API returns 200
- ✅ Feed API returns 200
- ✅ CloudWatch logs show cookie extraction working
- ✅ No increase in error rates for other endpoints

## Monitoring Post-Deployment

### First 24 Hours

**Monitor these metrics**:
1. Lambda error rate (CloudWatch Metrics)
2. API Gateway 4xx/5xx errors
3. Application logs for 401 errors
4. User reports of login/upload issues

**CloudWatch Alarm** (optional):
```powershell
# Create alarm for high 4xx errors
aws cloudwatch put-metric-alarm `
    --alarm-name "pv-api-prod-high-4xx-errors" `
    --alarm-description "Alert on high 4xx errors" `
    --metric-name 4XXError `
    --namespace AWS/ApiGateway `
    --statistic Sum `
    --period 300 `
    --threshold 100 `
    --comparison-operator GreaterThanThreshold `
    --evaluation-periods 2
```

### Ongoing Monitoring

- Check CloudWatch dashboards daily for first week
- Review error logs weekly
- Monitor user feedback channels
- Track avatar upload success rate

## Additional Resources

- **Technical Documentation**: `docs/backend/cookie-auth-401-fix.md`
- **Test Coverage**: `serverless/tests/cookie-extraction-v2.test.js`
- **Related Docs**:
  - `serverless/COOKIE_AUTH_DEPLOYMENT.md`
  - `docs/backend/troubleshooting-auth-profile-posts.md`
- **AWS Documentation**:
  - [Lambda Deployment](https://docs.aws.amazon.com/lambda/latest/dg/deploying-lambda-apps.html)
  - [API Gateway HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html)

## Support

For deployment issues:
1. Check CloudWatch logs first
2. Review troubleshooting section above
3. Consult team documentation
4. Test in staging environment if available

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-25 | 1.0 | Initial deployment guide for multiValueHeaders fix |
