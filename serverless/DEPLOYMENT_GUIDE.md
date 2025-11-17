# Serverless Deployment Guide - Allowlist Registration

## Overview

This guide walks through deploying the Project Valine API with **allowlist-based registration** to AWS Lambda using the Serverless Framework.

### Key Features

- **Allowlist-based registration**: Only specified emails can create accounts
- **Environment-based configuration**: Easy to manage without code changes
- **Prisma with Lambda**: Optimized Prisma layer for AWS Lambda
- **Production-ready**: Validated configuration and deployment scripts

### Default Allowlist

By default, only these emails can register:
- `ghawk075@gmail.com`
- `valinejustin@gmail.com`

## Prerequisites

### 1. AWS Credentials

Configure AWS CLI credentials with permissions for:
- Lambda function deployment
- API Gateway
- CloudFormation
- S3 (for deployment artifacts)
- CloudWatch Logs

```bash
aws configure
# Or set environment variables:
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-west-2"
```

### 2. Database

You need a PostgreSQL database accessible from AWS Lambda. Options:
- AWS RDS PostgreSQL
- AWS Aurora Serverless (PostgreSQL)
- External PostgreSQL instance with public access

Get the connection string in this format:
```
postgresql://username:password@hostname:5432/database_name
```

### 3. JWT Secret

Generate a secure JWT secret:
```bash
# Option 1: OpenSSL
openssl rand -base64 32

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Save this value - you'll need it for deployment.

## Installation

### 1. Install Dependencies

From the `serverless/` directory:

```bash
cd serverless
npm ci
```

This installs:
- `serverless` - Serverless Framework
- `serverless-esbuild` - Bundler plugin
- `@prisma/client` - Database client
- Other dependencies

### 2. Build Prisma Layer

The Prisma layer contains the database client and Lambda-compatible binary:

```bash
./build-prisma-layer.sh
```

**Expected output:**
```
✓ Prisma layer built successfully!
Layer location: /home/runner/work/Project-Valine/Project-Valine/serverless/layers/prisma-layer.zip
Layer size: 93M
```

**Note:** This only needs to be run when:
- First time setup
- Prisma schema changes
- Upgrading Prisma version

## Configuration

### Environment Variables

Set these before deploying:

```bash
# Required
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
export JWT_SECRET="your-generated-jwt-secret"

# Optional (these have defaults in serverless.yml)
export ALLOWED_USER_EMAILS="ghawk075@gmail.com,valinejustin@gmail.com"
export ENABLE_REGISTRATION="false"
export STAGE="prod"
export AWS_REGION="us-west-2"
```

### Allowlist Configuration

The allowlist is configured via the `ALLOWED_USER_EMAILS` environment variable:

```bash
# Single email
export ALLOWED_USER_EMAILS="user@example.com"

# Multiple emails (comma-separated, no spaces)
export ALLOWED_USER_EMAILS="user1@example.com,user2@example.com,user3@example.com"
```

**Important:**
- Use lowercase emails
- No spaces after commas
- Emails are case-insensitive during validation

### Registration Modes

Control who can register with `ENABLE_REGISTRATION`:

```bash
# Allowlist mode (default) - only allowlisted emails can register
export ENABLE_REGISTRATION="false"

# Open registration - anyone can register
export ENABLE_REGISTRATION="true"
```

## Deployment

### 1. Validate Configuration

Before deploying, validate your setup:

```bash
./validate-deployment.sh
```

This checks:
- Required files exist
- Dependencies installed
- Serverless config is valid
- Handler files exist
- Prisma layer is built
- Environment variables set

**If validation fails**, fix the reported issues before continuing.

### 2. Run Database Migration

**CRITICAL:** Apply database migrations before deploying code changes:

```bash
cd ../api
npx prisma migrate deploy
```

This applies any pending migrations to your production database.

### 3. Deploy to AWS

From the `serverless/` directory:

```bash
# Standard deployment
npx serverless deploy --stage prod --region us-west-2

# Verbose output (for debugging)
npx serverless deploy --stage prod --region us-west-2 --verbose
```

**Deployment time:** 2-5 minutes

**Expected output:**
```
✔ Service deployed to stack pv-api-prod

endpoints:
  GET - https://xxxxx.execute-api.us-west-2.amazonaws.com/health
  POST - https://xxxxx.execute-api.us-west-2.amazonaws.com/auth/register
  POST - https://xxxxx.execute-api.us-west-2.amazonaws.com/auth/login
  ...

functions:
  health: pv-api-prod-health
  register: pv-api-prod-register
  login: pv-api-prod-login
  ...

layers:
  prisma: arn:aws:lambda:us-west-2:...:layer:pv-api-prod-prisma:1
```

Save the API endpoint URL - you'll need it for testing and frontend configuration.

## Testing

### 1. Health Check

Verify the API is running:

```bash
API_URL="https://xxxxx.execute-api.us-west-2.amazonaws.com"
curl $API_URL/health
```

Expected: `{"status":"ok"}`

### 2. Test Allowlist - Allowed Email

Try registering with an allowlisted email:

```bash
curl -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ghawk075@gmail.com",
    "password": "SecurePassword123!"
  }'
```

**Expected:** HTTP 201 Created
```json
{
  "user": {
    "id": "uuid-here",
    "email": "ghawk075@gmail.com",
    "createdAt": "2024-11-17T..."
  }
}
```

### 3. Test Allowlist - Non-Allowed Email

Try registering with a non-allowlisted email:

```bash
curl -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "random@example.com",
    "password": "SecurePassword123!"
  }'
```

**Expected:** HTTP 403 Forbidden
```json
{
  "error": "Registration not permitted"
}
```

### 4. Test Login

After successful registration, test login:

```bash
curl -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ghawk075@gmail.com",
    "password": "SecurePassword123!"
  }'
```

**Expected:** HTTP 200 OK with Set-Cookie headers

## Managing the Allowlist

### Adding/Removing Emails

#### Option 1: Update Environment Variable and Redeploy

1. Update the environment variable:
   ```bash
   export ALLOWED_USER_EMAILS="ghawk075@gmail.com,valinejustin@gmail.com,newuser@example.com"
   ```

2. Redeploy:
   ```bash
   npx serverless deploy --stage prod --region us-west-2
   ```

#### Option 2: Update via AWS Console (No Code Deploy)

1. Go to AWS Lambda Console
2. Find function: `pv-api-prod-register`
3. Go to **Configuration** → **Environment variables**
4. Edit `ALLOWED_USER_EMAILS`
5. Save changes

**Note:** Changes are effective immediately, no code deployment needed.

#### Option 3: Update via serverless.yml

Edit `serverless/serverless.yml`:

```yaml
provider:
  environment:
    ALLOWED_USER_EMAILS: ${env:ALLOWED_USER_EMAILS, "email1@example.com,email2@example.com,email3@example.com"}
```

Then redeploy.

### Opening Public Registration

When ready to allow anyone to register:

```bash
export ENABLE_REGISTRATION="true"
npx serverless deploy --stage prod --region us-west-2
```

Or update the Lambda environment variable directly in AWS Console.

## Monitoring

### CloudWatch Logs

View Lambda logs for debugging:

```bash
# Register function
aws logs tail /aws/lambda/pv-api-prod-register --region us-west-2 --follow

# Login function
aws logs tail /aws/lambda/pv-api-prod-login --region us-west-2 --follow
```

### Key Log Messages

**Successful allowlist check:**
```
[REGISTER] Created userId=abc-123
```

**Blocked registration:**
```
[REGISTER] Email not allowlisted
```

**Database errors:**
```
PrismaClientKnownRequestError: ...
```

**Prisma initialization errors:**
```
PrismaClientInitializationError: ...
```

## Troubleshooting

### Issue: "Registration not permitted" for Allowed Email

**Cause:** Email not in allowlist or formatting issue

**Fix:**
1. Check the email is in `ALLOWED_USER_EMAILS`
2. Ensure no spaces after commas
3. Use lowercase
4. Verify environment variable was deployed:
   ```bash
   aws lambda get-function-configuration \
     --function-name pv-api-prod-register \
     --region us-west-2 \
     --query 'Environment.Variables.ALLOWED_USER_EMAILS'
   ```

### Issue: "PrismaClientInitializationError"

**Cause:** Missing Prisma binary or database connection issue

**Fix:**
1. Verify layer is deployed:
   ```bash
   aws lambda get-function-configuration \
     --function-name pv-api-prod-register \
     --region us-west-2 \
     --query 'Layers'
   ```
2. Rebuild and redeploy layer:
   ```bash
   ./build-prisma-layer.sh
   npx serverless deploy --stage prod --region us-west-2
   ```
3. Check DATABASE_URL is correct

### Issue: "Server error" / "Internal Server Error"

**Cause:** Various - check CloudWatch logs

**Debug:**
```bash
# Get recent errors
aws logs filter-pattern /aws/lambda/pv-api-prod-register \
  --region us-west-2 \
  --filter-pattern "ERROR"

# Tail live logs
aws logs tail /aws/lambda/pv-api-prod-register \
  --region us-west-2 \
  --follow
```

### Issue: Deployment Fails with esbuild Error

**Cause:** Corrupted build artifacts or malformed config

**Fix:**
1. Clean build artifacts:
   ```bash
   rm -rf .esbuild .serverless
   ```
2. Validate config:
   ```bash
   ./validate-deployment.sh
   ```
3. Try deployment again

### Issue: Package Too Large

**Current size:** ~93MB (well under 250MB Lambda limit)

**If needed:**
- Lambda Layers are already used for Prisma
- Individual packaging is enabled
- Further optimization not necessary

## Files Reference

### Key Files

- `serverless/serverless.yml` - Main deployment configuration
- `serverless/build-prisma-layer.sh` - Prisma layer build script
- `serverless/validate-deployment.sh` - Pre-deployment validation
- `serverless/layers/prisma-layer.zip` - Prisma Lambda layer (93MB)
- `api/prisma/schema.prisma` - Database schema

### Build Artifacts (Gitignored)

- `serverless/.esbuild/` - esbuild output
- `serverless/.serverless/` - Serverless Framework build artifacts

## Security Notes

### Environment Variables

**Never commit these to git:**
- `DATABASE_URL` - Contains database credentials
- `JWT_SECRET` - Used for token signing

**Safe to commit (with defaults):**
- `ALLOWED_USER_EMAILS` - Default allowlist in serverless.yml
- `ENABLE_REGISTRATION` - Defaults to "false"

### Database Migrations

**Always run migrations before code deployment:**
```bash
cd api
npx prisma migrate deploy
```

This ensures schema changes are applied before code expects them.

### Prisma Client

The Prisma client is generated with:
- `native` - For local development
- `rhel-openssl-3.0.x` - For AWS Lambda

Both are included in the layer for compatibility.

## Support

For issues or questions:

1. Check CloudWatch Logs for error details
2. Run `./validate-deployment.sh` to check configuration
3. Review this guide's Troubleshooting section
4. Check serverless.yml for configuration

## Quick Reference

```bash
# One-time setup
cd serverless
npm ci
./build-prisma-layer.sh

# Before each deployment
export DATABASE_URL="postgresql://..."
export JWT_SECRET="your-secret"
./validate-deployment.sh
cd ../api && npx prisma migrate deploy && cd ../serverless

# Deploy
npx serverless deploy --stage prod --region us-west-2

# Monitor
aws logs tail /aws/lambda/pv-api-prod-register --region us-west-2 --follow

# Update allowlist
# Via environment variable
export ALLOWED_USER_EMAILS="email1@example.com,email2@example.com"
npx serverless deploy --stage prod --region us-west-2

# Via AWS Console
# Lambda → pv-api-prod-register → Configuration → Environment variables
```
