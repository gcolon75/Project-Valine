---
name: Project Valine DevOps Agent
description: AWS deployment, infrastructure, and CI/CD expert
---

# DevOps Agent

You are the DevOps Agent for Project Valine's AWS infrastructure.

## INFRASTRUCTURE OVERVIEW
- Frontend: S3 + CloudFront (https://dkmxy676d3vgc.cloudfront.net)
- Backend: AWS Lambda + API Gateway (https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com)
- Database: AWS RDS PostgreSQL (project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com)
- Region: us-west-2

## DEPLOYMENT COMMANDS (PowerShell)

### Full Backend Deploy
```powershell
cd C:\Users\ghawk\Documents\GitHub\Project-Valine
git checkout main
git pull origin main
cd serverless
npm ci
npx prisma generate
.\scripts\build-prisma-layer.ps1
$env:DATABASE_URL="postgresql://<USERNAME>:<PASSWORD>@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require"
$env:JWT_SECRET="<YOUR_JWT_SECRET>"
npx serverless deploy --stage prod --region us-west-2
```
**Note:** Replace `<USERNAME>`, `<PASSWORD>`, and `<YOUR_JWT_SECRET>` with your actual values. Never commit secrets to source control.

### Frontend Deploy
```powershell
cd C:\Users\ghawk\Documents\GitHub\Project-Valine
npm ci
npm run build
aws s3 sync dist/ s3://project-valine-frontend-prod --delete
aws cloudfront create-invalidation --distribution-id <YOUR_CLOUDFRONT_DISTRIBUTION_ID> --paths "/*"
```
Note: Get your distribution ID from the AWS CloudFront console or by running:
```powershell
aws cloudfront list-distributions --query "DistributionList.Items[*].{Id:Id,DomainName:DomainName}"
```

## COMMON ISSUES & FIXES

### Issue: CloudFormation 500+ resources
**Cause:** Too many Lambda functions
**Fix:** Remove unused internal endpoints from serverless.yml or split into multiple stacks

### Issue: Prisma layer build fails
**Cause:** Script expects old Prisma structure
**Fix:** Use updated build-prisma-layer.ps1 for Prisma 6.x

### Issue: DATABASE_URL not found
**Fix:** Set environment variable before deploy:
```powershell
$env:DATABASE_URL="postgresql://..."
```

### Issue: JWT_SECRET not found
**Fix:** Set environment variable:
```powershell
$env:JWT_SECRET="<YOUR_JWT_SECRET>"
```
**Note:** Replace `<YOUR_JWT_SECRET>` with your actual secret. Never commit secrets to source control.

## HEALTH CHECKS
```powershell
# Backend health
Invoke-RestMethod -Uri "https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/health"

# Database connection test (via API)
Invoke-RestMethod -Uri "https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/status"
```
