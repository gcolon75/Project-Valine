# Auth Handler Deployment Guide

This document provides deployment instructions for the authentication endpoints in Project Valine.

## Auth Endpoint to Handler Mapping

The following table shows the mapping between HTTP endpoints and their handler functions in `serverless.yml`:

| HTTP Endpoint | Handler Reference | Function in `src/handlers/auth.js` |
|--------------|-------------------|-----------------------------------|
| `POST /auth/register` | `src/handlers/auth.register` | `register` |
| `POST /auth/login` | `src/handlers/auth.login` | `login` |
| `GET /auth/me` | `src/handlers/auth.me` | `me` |
| `POST /auth/verify-email` | `src/handlers/auth.verifyEmail` | `verifyEmail` |
| `POST /auth/resend-verification` | `src/handlers/auth.resendVerification` | `resendVerification` |
| `POST /auth/refresh` | `src/handlers/auth.refresh` | `refresh` |
| `POST /auth/logout` | `src/handlers/auth.logout` | `logout` |
| `POST /auth/2fa/setup` | `src/handlers/auth.setup2FA` | `setup2FA` |
| `POST /auth/2fa/enable` | `src/handlers/auth.enable2FA` | `enable2FA` |
| `POST /auth/2fa/verify` | `src/handlers/auth.verify2FA` | `verify2FA` |
| `POST /auth/2fa/disable` | `src/handlers/auth.disable2FA` | `disable2FA` |
| `POST /auth/seed-restricted` | `src/handlers/auth.seedRestricted` | `seedRestricted` |
| `GET /auth/status` | `src/handlers/auth.authStatus` | `authStatus` |
| `GET /auth/diag` | `src/handlers/auth.authDiag` | `authDiag` |

## Prisma Client Generation

Before deploying, generate the Prisma client. From the repository root:

```powershell
cd serverless
npx prisma generate --schema prisma/schema.prisma
```

Or from anywhere in the repository:

```powershell
npx prisma generate --schema serverless/prisma/schema.prisma
```

## Deployment Commands (PowerShell)

### Prerequisites

Ensure AWS credentials are configured and the following environment variables are set:

```powershell
$env:DATABASE_URL = "postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require"
$env:JWT_SECRET = "your-jwt-secret"
$env:AWS_REGION = "us-west-2"
$env:STAGE = "prod"
```

### Deploy Backend

```powershell
# Navigate to serverless directory
cd serverless

# Install dependencies
npm ci

# Generate Prisma client
npx prisma generate --schema prisma/schema.prisma

# Deploy to AWS
npx serverless deploy --stage prod
```

### Deploy Frontend

```powershell
# Navigate to repository root
cd ..

# Build frontend
npm run build

# Sync to S3 (requires AWS CLI)
aws s3 sync dist/ s3://valine-frontend-prod --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

## Troubleshooting

### Runtime.HandlerNotFound Error

If you see errors like:
```json
{"errorType":"Runtime.HandlerNotFound","errorMessage":"src/handlers/auth.login is undefined or not exported"}
```

Check the following:

1. **Export names match**: Ensure `src/handlers/auth.js` exports all functions listed in `serverless.yml`
2. **esbuild format**: The `serverless.yml` should have `format: cjs` in the esbuild config
3. **Prisma client**: Run `npx prisma generate` before deploying

### Database Connection Issues

1. Verify `DATABASE_URL` has no spaces or invalid characters
2. Ensure the RDS security group allows connections from Lambda
3. Check CloudWatch logs for specific Prisma error codes

## Production Endpoints

- **Frontend**: https://dkmxy676d3vgc.cloudfront.net
- **API Base**: https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com
