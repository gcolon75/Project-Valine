# Project Valine - Deployment Runbook

## Quick Reference
| Resource | Value |
|----------|-------|
| Frontend | https://dkmxy676d3vgc.cloudfront.net |
| API | https://wkndtj22ab.execute-api.us-west-2.amazonaws.com |
| DB Host | project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com |
| S3 Bucket | valine-frontend-prod |
| AWS Region | us-west-2 |

**Note:** To find your CloudFront Distribution ID, run:
```powershell
aws cloudfront list-distributions --query "DistributionList.Items[?contains(DomainName, 'cloudfront.net')].{Id:Id,DomainName:DomainName}" --output table
```

## Pre-Deployment Checklist
- [ ] On `main` branch
- [ ] All changes committed and pushed
- [ ] `npm ci` completed without errors
- [ ] Prisma client generated
- [ ] Environment variables set

## Backend Deployment

### Step 1: Prepare Environment
```powershell
cd C:\Users\ghawk\Documents\GitHub\Project-Valine
git checkout main
git pull origin main
cd serverless
npm ci
```

### Step 2: Generate Prisma Client
```powershell
npx prisma generate
```

### Step 3: Build Prisma Layer
```powershell
.\scripts\build-prisma-layer.ps1
```
Expected output: "Layer created: layers/prisma-layer.zip (XX MB)"

### Step 4: Set Environment Variables
```powershell
$env:DATABASE_URL="postgresql://<USERNAME>:<PASSWORD>@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require"
$env:JWT_SECRET="<YOUR_JWT_SECRET>"
```
**Note:** Replace `<USERNAME>`, `<PASSWORD>`, and `<YOUR_JWT_SECRET>` with your actual values. Never commit secrets to source control.

### Step 5: Deploy
```powershell
npx serverless deploy --stage prod --region us-west-2
```

### Step 6: Verify
```powershell
Invoke-RestMethod -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/health"
```

## Frontend Deployment

### Step 1: Build
```powershell
cd C:\Users\ghawk\Documents\GitHub\Project-Valine
npm ci
npm run build
```

### Step 2: Deploy to S3
```powershell
aws s3 sync dist/ s3://valine-frontend-prod --delete
```

### Step 3: Invalidate CloudFront
```powershell
aws cloudfront create-invalidation --distribution-id <YOUR_CLOUDFRONT_DISTRIBUTION_ID> --paths "/*"
```
Note: Get your distribution ID from the AWS CloudFront console or by running:
```powershell
aws cloudfront list-distributions --query "DistributionList.Items[*].{Id:Id,DomainName:DomainName}"
```

## Database Migrations

### Apply Pending Migrations
```powershell
cd serverless
$env:DATABASE_URL="postgresql://..."
npx prisma migrate deploy
```

### Add Column Manually
```powershell
@"
import pg from 'pg';
const { Client } = pg;
const c = new Client({
  connectionString: 'postgresql://...',
  ssl: { rejectUnauthorized: false }
});
c.connect()
  .then(() => c.query('ALTER TABLE "tablename" ADD COLUMN IF NOT EXISTS "column" TYPE;'))
  .then(() => { console.log('Done'); c.end(); })
  .catch(e => { console.error(e); c.end(); });
"@ | Out-File -Encoding utf8 migrate.js
node migrate.js
```

## Troubleshooting

### Error: CloudFormation 500+ resources
**Solution:** Remove unused functions from serverless.yml
Current count: ~451/500

### Error: Prisma layer build fails
**Solution:** Ensure Prisma 6.x compatible script is used
Run: `npx prisma generate` before building layer

### Error: JWT_SECRET not found
**Solution:** Set environment variable before deploy
```powershell
$env:JWT_SECRET="<YOUR_JWT_SECRET>"
```
**Note:** Replace `<YOUR_JWT_SECRET>` with your actual secret.

### Error: Database connection failed
**Solutions:**
1. Check DATABASE_URL has no spaces
2. Verify SSL mode: `?sslmode=require`
3. Check RDS security group allows your IP

### Error: CORS errors in browser
**Solutions:**
1. Verify API Gateway CORS in serverless.yml
2. Check handler returns CORS headers
3. Verify frontend uses correct API URL

## Rollback Procedures

### Backend Rollback
```powershell
# List previous deployments
npx serverless deploy list --stage prod

# Rollback to previous version
npx serverless rollback --timestamp TIMESTAMP --stage prod
```

### Frontend Rollback
```powershell
# S3 versioning must be enabled
aws s3api list-object-versions --bucket valine-frontend-prod --prefix index.html
```

## Post-Deployment Verification

### API Health
```powershell
Invoke-RestMethod -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/health"
```

### Auth System
```powershell
Invoke-RestMethod -Uri "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com/auth/status"
```

### Frontend
Open https://dkmxy676d3vgc.cloudfront.net in browser
- [ ] Page loads
- [ ] Login works
- [ ] Dark mode toggles
- [ ] API calls succeed
