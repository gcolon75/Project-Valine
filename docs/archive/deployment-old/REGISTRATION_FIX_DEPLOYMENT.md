# Registration Endpoint Fix - Deployment Guide

## Issues Fixed

This update fixes the following critical issues that were causing 500 errors on the registration endpoint:

1. **Variable name mismatches in register function**:
   - Fixed `body.email` → `data.email`
   - Fixed `hashedPassword` → `passwordHash`
   - Added extraction of `username` and `displayName` from request body

2. **Schema field name inconsistency**:
   - Renamed `password` field to `passwordHash` in Prisma schema
   - Created migration to rename database column

3. **Missing required fields**:
   - Added auto-generation of `username` from email if not provided
   - Added auto-generation of `displayName` from email if not provided

4. **Security issues**:
   - Removed hardcoded credentials from `.env.prod`
   - Added `.env.prod` to `.gitignore`

## Required Deployment Steps

### Step 1: Set Environment Variables in AWS Lambda

The `.env.prod` file now has placeholders. You MUST set these environment variables in AWS Lambda Console:

1. Go to AWS Lambda Console
2. Select your function
3. Go to Configuration → Environment variables
4. Set the following variables:

```
DATABASE_URL=postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require
JWT_SECRET=oHnvIQ0wx5P1fxADM4UKXkv7k+VP05clPNTD9RDfROo=
```

**IMPORTANT**: These credentials should be rotated for production use!

### Step 2: Run Database Migration

The database schema needs to be updated to rename the `password` column to `passwordHash`.

**Option A: Using Prisma Migrate (Recommended)**

```bash
cd serverless
npx prisma migrate deploy
```

**Option B: Manual SQL (if migrate deploy fails)**

Connect to your RDS database and run:

```sql
ALTER TABLE "users" RENAME COLUMN "password" TO "passwordHash";
```

### Step 3: Deploy Updated Code

```bash
cd serverless
npm install
serverless deploy
```

### Step 4: Test Registration

Test the registration endpoint with:

```bash
curl -X POST https://YOUR_API_GATEWAY_URL/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ghawk075@gmail.com",
    "password": "YourSecurePassword123!",
    "username": "ghawk075",
    "displayName": "G Hawk"
  }'
```

Or without username/displayName (will auto-generate from email):

```bash
curl -X POST https://YOUR_API_GATEWAY_URL/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ghawk075@gmail.com",
    "password": "YourSecurePassword123!"
  }'
```

## What Changed

### serverless/src/handlers/auth.js
- Fixed variable references in `register` function
- Added extraction of `username` and `displayName` from request body
- Added auto-generation of these fields from email if not provided
- All fields now properly passed to `prisma.user.create()`

### serverless/prisma/schema.prisma
- Renamed `password` field to `passwordHash` in User model
- Now matches what the authentication code expects

### serverless/prisma/migrations/20251115031328_rename_password_to_passwordhash/
- Added migration SQL to rename database column

### .gitignore
- Added `.env.prod` to prevent committing sensitive credentials

### serverless/.env.prod
- Replaced hardcoded credentials with placeholders
- Added warnings to use environment variables

## Verification

After deployment, check CloudWatch logs for the register endpoint. You should see:

```
[REGISTER] Raw body length: XXX
[REGISTER] Created userId=XXXX-XXXX-XXXX
```

Instead of the previous error:
```
Argument `username` is missing
```

## Security Notes

1. **Rotate credentials**: The hardcoded credentials in this guide should be rotated
2. **Use AWS Secrets Manager**: For production, consider using AWS Secrets Manager for sensitive values
3. **Enable MFA**: Enable MFA on your AWS account
4. **Audit access**: Review who has access to Lambda environment variables
