# Project Valine Deployment Runbook

This document provides unified deployment procedures for Project Valine's backend and frontend.

---

## Infrastructure IDs

| Resource | Value |
|----------|-------|
| S3 Bucket | s3://valine-frontend-prod |
| CloudFront Distribution | E16LPJDBIL5DEE |
| API Base URL | https://wkndtj22ab.execute-api.us-west-2.amazonaws.com |
| Database URL | postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require |
| Prisma Layer ARN | arn:aws:lambda:us-west-2:579939802800:layer:prisma:12 |
| AWS Region | us-west-2 |

---

## Prerequisites

- AWS CLI configured with appropriate credentials
- Node.js 18+ and npm installed
- Git access to the repository
- PowerShell (Windows) or Bash (Linux/macOS)

---

## Backend Deployment

### Step 1: Pull Latest Code

```powershell
cd <path-to-Project-Valine>
git checkout main
git pull origin main
```

### Step 2: Install Dependencies

```powershell
cd serverless
npm ci
```

### Step 3: Deploy to Production

```powershell
npx serverless deploy --stage prod --region us-west-2
```

### Step 4: Verify Prisma Layer

After deployment, verify the correct Prisma layer is attached:

```powershell
aws lambda get-function-configuration `
    --function-name pv-api-prod-updateMyProfile `
    --region us-west-2 `
    --query "Layers[].Arn"
```

Expected output:
```json
["arn:aws:lambda:us-west-2:579939802800:layer:prisma:12"]
```

---

## Prisma Layer Rebuild

When the Prisma schema changes, rebuild the layer before deploying:

### Windows (PowerShell)

```powershell
cd <path-to-Project-Valine>\serverless
.\scripts\build-prisma-layer.ps1
npx serverless deploy --stage prod --region us-west-2
```

### Linux/macOS (Bash)

```powershell
cd serverless
./scripts/build-prisma-layer.sh
npx serverless deploy --stage prod --region us-west-2
```

### When to Rebuild

- After adding/removing fields in `schema.prisma`
- After adding new models
- After upgrading Prisma version
- After running `npm ci` or dependency updates

---

## Frontend Deployment

### Step 1: Install Dependencies

```powershell
cd <path-to-Project-Valine>
npm ci
```

### Step 2: Build Production Bundle

```powershell
npm run build
```

### Step 3: Sync to S3

```powershell
aws s3 sync dist/ s3://valine-frontend-prod --delete
```

### Step 4: Invalidate CloudFront Cache

```powershell
aws cloudfront create-invalidation `
    --distribution-id E16LPJDBIL5DEE `
    --paths "/*"
```

### Full Frontend Deploy (One-liner)

```powershell
npm ci; npm run build; aws s3 sync dist/ s3://valine-frontend-prod --delete; aws cloudfront create-invalidation --distribution-id E16LPJDBIL5DEE --paths "/*"
```

---

## Environment Configuration

### Backend Environment Variables

Set in Lambda via Serverless Framework or AWS Console:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for JWT signing |
| `ALLOWED_USER_EMAILS` | Comma-separated allowlist |
| `ENABLE_REGISTRATION` | `true` or `false` |

### Frontend Environment Variables

Set in `.env.production` before build:

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE` | API base URL |
| `VITE_ALLOWED_USER_EMAILS` | Frontend allowlist |
| `VITE_ENABLE_REGISTRATION` | `true` or `false` |

---

## Troubleshooting

### Issue: "PrismaClientValidationError: Unknown arg"

**Cause:** Prisma layer is out-of-date after schema changes.

**Solution:**
```powershell
cd serverless
.\scripts\build-prisma-layer.ps1
npx serverless deploy --stage prod --region us-west-2
```

### Issue: "Cannot find module '.prisma/client/default'"

**Cause:** The Prisma Lambda Layer is missing the newer "default" bundle required by recent Prisma versions. This occurs when the layer was built with selective file copying instead of full directory copying.

**Symptoms:**
- `Runtime.ImportModuleError: Cannot find module '.prisma/client/default'`
- Login and profile endpoints return 500 errors
- CloudWatch logs show require stack including `/opt/nodejs/node_modules/@prisma/client/default.js`

**Solution:**
```powershell
# Full layer rebuild and deploy
cd C:\Users\ghawk\Documents\GitHub\Project-Valine\serverless
npm ci
npx prisma generate --schema=prisma\schema.prisma
powershell -ExecutionPolicy Bypass -File .\scripts\build-prisma-layer.ps1

# Validate layer before deploy (optional but recommended)
bash scripts/validate-layer.sh

# Deploy
npx serverless deploy --stage prod --region us-west-2
```

**Verification:**
```powershell
# Check layer is attached
aws lambda get-function-configuration `
  --function-name pv-api-prod-login `
  --region us-west-2 `
  --query "Layers[].Arn"

# Test login endpoint
$api = "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com"
$body = @{ email = "ghawk075@gmail.com"; password = "Test123!" } | ConvertTo-Json
Invoke-WebRequest -Uri "$api/auth/login" -Method POST -Body $body -ContentType "application/json"
```

### Issue: "403 Forbidden" on API Requests

**Cause:** Missing CSRF token or not in allowlist.

**Solution:**
1. Verify `x-csrf-token` header is included in requests
2. Check `ALLOWED_USER_EMAILS` includes the user's email
3. Ensure cookies are being sent with requests

### Issue: "Layer artifact not found"

**Cause:** `prisma-layer.zip` was not built.

**Solution:**
```powershell
cd serverless
.\scripts\build-prisma-layer.ps1
```

### Issue: "500 Internal Server Error" on Login

**Cause:** Database connection issue or missing environment variable.

**Solution:**
1. Verify `DATABASE_URL` is set correctly
2. Check RDS security group allows Lambda access
3. Tail logs for specific error:
   ```powershell
   aws logs tail /aws/lambda/pv-api-prod-login --region us-west-2 --follow
   ```

### Issue: "500 Internal Server Error" on Profile Endpoints

**Cause:** Missing profile record for user, or null handling issues with new fields (bannerUrl, budgetMin, budgetMax).

**Solution:**
1. Profile endpoints now auto-create profiles for authenticated users
2. Check logs for specific Prisma errors:
   ```powershell
   aws logs tail /aws/lambda/pv-api-prod-getMyProfile --region us-west-2 --follow
   ```
3. If schema mismatch, rebuild and redeploy layer (see "Cannot find module '.prisma/client/default'" above)

### Issue: Frontend Shows Old Content After Deploy

**Cause:** CloudFront cache not invalidated.

**Solution:**
```powershell
aws cloudfront create-invalidation `
    --distribution-id E16LPJDBIL5DEE `
    --paths "/*"
```

### Issue: "Email not in allowlist"

**Cause:** User email not in `ALLOWED_USER_EMAILS`.

**Solution:**
1. Update Lambda environment variable
2. Redeploy backend
3. See [ALLOWED_USERS.md](./ALLOWED_USERS.md) for detailed instructions

---

## Safe Backend Redeploy (PowerShell)

When deploying backend changes, especially after Prisma schema updates:

```powershell
# 1. Navigate to serverless directory
cd C:\Users\ghawk\Documents\GitHub\Project-Valine\serverless

# 2. Clean install dependencies
npm ci

# 3. Generate Prisma client (important after schema changes)
npx prisma generate --schema=prisma\schema.prisma

# 4. Rebuild layer (includes .prisma/client/default bundle)
powershell -ExecutionPolicy Bypass -File .\scripts\build-prisma-layer.ps1

# 5. Validate layer contents (optional but recommended)
bash scripts/validate-layer.sh

# 6. Deploy to production
npx serverless deploy --stage prod --region us-west-2

# 7. Verify layer is attached correctly
aws lambda get-function-configuration `
  --function-name pv-api-prod-login `
  --region us-west-2 `
  --query "Layers[].Arn"
```

---

## Log Tailing

### Backend Logs

```powershell
# Login function
aws logs tail /aws/lambda/pv-api-prod-login --region us-west-2 --follow

# Profile update function
aws logs tail /aws/lambda/pv-api-prod-updateMyProfile --region us-west-2 --follow

# All API logs
aws logs tail /aws/lambda/pv-api-prod --region us-west-2 --follow
```

### CloudFront Logs

CloudFront logs are stored in S3. Check the distribution settings for the log bucket.

---

## Rollback Procedures

### Backend Rollback

```powershell
# Revert to previous commit
git checkout main
git revert HEAD
git push origin main

# Redeploy
cd serverless
npx serverless deploy --stage prod --region us-west-2
```

### Frontend Rollback

```powershell
# Revert to previous commit
git checkout main
git revert HEAD
git push origin main

# Rebuild and deploy
npm ci
npm run build
aws s3 sync dist/ s3://valine-frontend-prod --delete
aws cloudfront create-invalidation --distribution-id E16LPJDBIL5DEE --paths "/*"
```

---

## Health Checks

### API Health

```powershell
Invoke-WebRequest -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/health" -Method GET
```

### Frontend Health

```powershell
Invoke-WebRequest -Uri "https://dkmxy676d3vgc.cloudfront.net" -Method GET
```

### Database Connection

```powershell
# From a Lambda function or local environment with DB access
npx prisma db pull
```

---

## Related Documentation

- [ALLOWED_USERS.md](./ALLOWED_USERS.md) – User allowlist management
- [docs/allowlist.md](./docs/allowlist.md) – Allowlist configuration details
- [serverless/layers/README.md](./serverless/layers/README.md) – Prisma layer build instructions
- [docs/postmortem-2025-11-30.md](./docs/postmortem-2025-11-30.md) – Recent incident postmortem
- [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md) – Detailed deployment guide
