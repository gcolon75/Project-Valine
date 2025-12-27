# Production Account Creation Guide

## Prerequisites

1. RDS database is running
2. All secrets rotated from development
3. Serverless backend deployed
4. Frontend deployed to S3/CloudFront

## Steps

### 1. Set Production Database URL

```powershell
# Use PRODUCTION RDS endpoint
$env:DATABASE_URL = "postgresql://ValineColon_75:NEW_PRODUCTION_PASSWORD@project-valine-prod.REGION.rds.amazonaws.com:5432/postgres?sslmode=require"
```

### 2. Run Schema Migration

```powershell
node fix-user-schema-complete.mjs \
  --email "ghawk075@gmail.com" \
  --password "YourProductionPassword123!" \
  --display-name "Gabriel Colon"
```

### 3. Verify Account Created

```powershell
# Test login via API
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{ "email": "ghawk075@gmail.com", "password": "YourProductionPassword123!" }' -ContentType 'application/json'
```

### 4. Test Frontend Login

1. Visit: `https://YOUR_DOMAIN.com`
2. Login with:
   - Email: `ghawk075@gmail.com`
   - Password: `YourProductionPassword123!`
3. Should redirect to onboarding or dashboard

## Troubleshooting

If login fails:

1. Check browser console for errors
2. Check Network tab for failed requests
3. Run: `node scripts/verify-production-deployment.mjs`
4. Check AWS CloudWatch logs for Lambda errors

---

## Deployment Checklist

### Before Deployment

- [ ] All secrets rotated (JWT_SECRET, DATABASE_URL password)
- [ ] GitHub Secrets updated with production values
- [ ] `FRONTEND_URL` set to production domain
- [ ] `VITE_API_BASE` set to API Gateway URL
- [ ] RDS security group allows Lambda connections

### Deploy Backend

```powershell
cd serverless

# Deploy to production
npx serverless deploy --stage production

# Verify deployment
Invoke-RestMethod -Uri "https://YOUR_API_URL/health" -Method Get
```

### Deploy Frontend

```powershell
# Set production environment variables
$env:VITE_API_BASE = "https://YOUR_API_URL"
$env:NODE_ENV = "production"

# Build
npm run build

# Deploy to S3
aws s3 sync client/dist/ s3://YOUR_S3_BUCKET/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

### Create Production Account

```powershell
# Set production DATABASE_URL
$env:DATABASE_URL = "postgresql://USER:PASS@prod-rds-endpoint:5432/postgres"

# Run account creation
node fix-user-schema-complete.mjs \
  --email "ghawk075@gmail.com" \
  --password "ProductionPassword123!" \
  --display-name "Gabriel Colon"
```

### Verify Deployment

```powershell
# Run verification script
node scripts/verify-production-deployment.mjs

# Should show:
# ✅ API Health: ok
# ✅ Frontend is accessible
# ✅ All checks passed
```

## Emergency Rollback

If deployment breaks production:

```powershell
# Rollback backend
cd serverless
npx serverless rollback --timestamp PREVIOUS_TIMESTAMP

# Rollback frontend (restore previous S3 version)
aws s3 sync s3://YOUR_BUCKET_NAME/backup/ s3://YOUR_BUCKET_NAME/ --delete
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

## Common Issues & Fixes

### Issue 1: CORS Error

**Symptom:**
```
Access to fetch at 'https://api.domain.com/api/auth/login' from origin 'https://domain.com' 
has been blocked by CORS policy
```

**Fix:** Update API Gateway CORS configuration or Lambda response headers:

```javascript
// In serverless functions, ensure headers include:
{
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}
```

Deploy fix:

```powershell
cd serverless
npx serverless deploy
```

### Issue 2: Wrong API Endpoint

**Symptom:**
```
Failed to fetch
net::ERR_NAME_NOT_RESOLVED
```

**Fix:**

1. Check `.env` file used for build:
```env
VITE_API_BASE=https://YOUR_ACTUAL_API_GATEWAY_URL
```

2. Rebuild and redeploy frontend:
```powershell
# Set correct API URL
$env:VITE_API_BASE = "https://YOUR_API_GATEWAY_URL"

# Build
npm run build

# Deploy
aws s3 sync client/dist/ s3://YOUR_S3_BUCKET/ --delete
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

### Issue 3: Invalid JWT_SECRET

**Symptom:**
```json
{
  "error": "SECURITY ERROR: Default JWT_SECRET must not be used in production"
}
```

**Fix:**

1. Generate new secure JWT secret:
```powershell
openssl rand -base64 32
```

2. Update GitHub Secret `JWT_SECRET`

3. Redeploy backend:
```powershell
cd serverless
npx serverless deploy
```

### Issue 4: Database Connection Error

**Symptom:**
```
Database connection failed
```

**Fix:**

1. Verify `DATABASE_URL` in AWS Lambda environment variables
2. Check RDS security group allows Lambda connections
3. Verify RDS instance is running
4. Test connection from Lambda:
```powershell
# Run verification script
node scripts/verify-env-contract.mjs
```

### Issue 5: User Account Doesn't Exist in Production

**Symptom:**
```json
{
  "error": "Invalid credentials"
}
```

**Fix:**

Production database may not have your user account. You need to run the account creation script against production database:

```powershell
# Set PRODUCTION database URL
$env:DATABASE_URL = "postgresql://USER:PASS@production-rds-endpoint:5432/postgres?sslmode=require"

# Run the schema fix script
node fix-user-schema-complete.mjs \
  --email "ghawk075@gmail.com" \
  --password "Test123!" \
  --display-name "Gabriel Colon"
```

### Issue 6: ALLOWED_USER_EMAILS Not Set

**Symptom:**
```json
{
  "error": "Email not in allowlist"
}
```

**Fix:**

1. Check GitHub Secret `ALLOWED_USER_EMAILS`
2. Should contain: `ghawk075@gmail.com`
3. Redeploy if changed

## Acceptance Criteria

- [ ] Live site loads without errors
- [ ] Login works with production credentials
- [ ] User can complete onboarding
- [ ] Dashboard accessible after onboarding
- [ ] No CORS errors in browser console
- [ ] API health endpoint returns `ok`
- [ ] `secretsStatus.jwtSecretValid` is `true`
- [ ] No `insecureDefaults` warnings

## Success Metrics

- ✅ Login success rate: 100%
- ✅ API response time: < 500ms
- ✅ Zero browser console errors
- ✅ All health checks passing
- ✅ User can access dashboard
