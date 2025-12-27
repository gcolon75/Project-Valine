# Add User to Production Runbook

## Overview
Operational procedures for adding additional users (the friend) to production Project Valine deployment. This runbook covers both environment variable and database approaches for enabling user access.

**Last Updated**: 2025-11-12  
**Owner**: Security & Operations Team  
**Risk Level**: Medium  
**Estimated Time**: 10-15 minutes

---

## Table of Contents
- [Prerequisites](#prerequisites)
- [Method A: Environment Variable (Recommended)](#method-a-environment-variable-recommended)
- [Method B: Database Flag (If Migration Exists)](#method-b-database-flag-if-migration-exists)
- [Verification Steps](#verification-steps)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Access
- [x] AWS CLI configured with appropriate IAM permissions
- [x] AWS Lambda:UpdateFunctionConfiguration permission
- [x] Database access (for Method B)
- [x] User's registered email address

### Required Tools
```powershell
# Verify AWS CLI is installed and configured
aws --version
aws sts get-caller-identity

# Verify database access (for Method B)
psql --version
```

### Important Notes
> ⚠️ **Security Reminder**: Users must first register an account through the `/auth/register` endpoint (when `ENABLE_REGISTRATION=true`) before being added to the allowlist.

> 📋 **Current Limitation**: Registration is typically disabled in production (`ENABLE_REGISTRATION=false`). You may need to temporarily enable it or create the account manually via database.

---

## Method A: Environment Variable (Recommended)

This method uses the `ALLOWED_USER_EMAILS` environment variable to control post-authentication access. This is the **recommended approach** as it doesn't require database changes.

### Step 1: Get Current Allowlist

```powershell
# Get current Lambda environment variables
aws lambda get-function-configuration \
  --function-name valine-api-prod \
  --region us-west-2 \
  --query 'Environment.Variables.ALLOWED_USER_EMAILS' \
  --output text
```

**Expected Output:**
```
owner@example.com
```

### Step 2: Add Friend's Email

```powershell
# Set new allowlist (comma-separated, no spaces)
aws lambda update-function-configuration \
  --function-name valine-api-prod \
  --region us-west-2 \
  --environment "Variables={
    ALLOWED_USER_EMAILS=owner@example.com,friend@example.com,
    AUTH_JWT_SECRET=$(aws lambda get-function-configuration \
      --function-name valine-api-prod \
      --region us-west-2 \
      --query 'Environment.Variables.AUTH_JWT_SECRET' \
      --output text),
    DATABASE_URL=$(aws lambda get-function-configuration \
      --function-name valine-api-prod \
      --region us-west-2 \
      --query 'Environment.Variables.DATABASE_URL' \
      --output text),
    NODE_ENV=production,
    ENABLE_REGISTRATION=false
  }"
```

> ⚠️ **Important**: When updating Lambda environment variables, you must provide ALL variables. Missing variables will be deleted. The example above preserves critical variables.

**Alternative: Using AWS Console**
1. Navigate to AWS Lambda Console
2. Select function: `valine-api-prod`
3. Go to Configuration → Environment variables
4. Click "Edit"
5. Update `ALLOWED_USER_EMAILS` to: `owner@example.com,friend@example.com`
6. Click "Save"

### Step 3: Wait for Deployment

```powershell
# Monitor function update status
aws lambda get-function-configuration \
  --function-name valine-api-prod \
  --region us-west-2 \
  --query 'State' \
  --output text
```

**Expected States:**
- `Pending` → Update in progress
- `Active` → Update complete (usually 30-60 seconds)

### Step 4: Verify Update

```powershell
# Confirm new allowlist
aws lambda get-function-configuration \
  --function-name valine-api-prod \
  --region us-west-2 \
  --query 'Environment.Variables.ALLOWED_USER_EMAILS' \
  --output text
```

**Expected Output:**
```
owner@example.com,friend@example.com
```

---

## Method B: Database Flag (If Migration Exists)

This method uses a database `enabled` field on the `Users` table. **Note**: This requires a database migration to add the `enabled` column.

### Prerequisites Check

```powershell
# Connect to database
$env:DATABASE_URL = "postgresql://user:password@host:5432/valine_db"

# Check if 'enabled' column exists
psql "$DATABASE_URL" -c "
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'User' 
  AND column_name = 'enabled';
"
```

**If column doesn't exist:**
```
(0 rows)
```
→ Skip this method, use Method A instead.

**If column exists:**
```
 column_name | data_type | is_nullable 
-------------+-----------+-------------
 enabled     | boolean   | YES
```
→ Proceed with steps below.

### Step 1: Find User Record

```powershell
# Find user by email
psql "$DATABASE_URL" -c "
SELECT id, email, username, enabled, \"createdAt\" 
FROM \"User\" 
WHERE email = 'friend@example.com';
"
```

**Expected Output:**
```
         id          |       email        | username | enabled |         createdAt          
---------------------+--------------------+----------+---------+----------------------------
 usr_abc123def456    | friend@example.com | frienduser | f     | 2025-11-12 15:30:00+00
```

### Step 2: Enable User Account

```sql
-- Update enabled flag
psql "$DATABASE_URL" -c "
UPDATE \"User\" 
SET enabled = true, 
    \"updatedAt\" = CURRENT_TIMESTAMP 
WHERE email = 'friend@example.com' 
RETURNING id, email, enabled;
"
```

**Expected Output:**
```
         id          |       email        | enabled 
---------------------+--------------------+---------
 usr_abc123def456    | friend@example.com | t
```

### Step 3: Verify Database Change

```powershell
psql "$DATABASE_URL" -c "
SELECT id, email, username, enabled 
FROM \"User\" 
WHERE email = 'friend@example.com';
"
```

**Expected Output:**
```
         id          |       email        | username | enabled 
---------------------+--------------------+----------+---------
 usr_abc123def456    | friend@example.com | frienduser | t
```

---

## Verification Steps

### Test 1: User Can Login

```powershell
# Test login endpoint
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{ "email": "friend@example.com", "password": "TheirSecurePassword123!" }' -ContentType 'application/json'
```

**Expected Response (Success):**
```json
{
  "success": true,
  "user": {
    "id": "usr_abc123def456",
    "email": "friend@example.com",
    "username": "frienduser"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Expected Response (Before Adding User):**
```json
{
  "error": "Access denied: email not in allowlist",
  "statusCode": 403
}
```

### Test 2: User Can Access Protected Endpoints

```powershell
# Get access token from login response
ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Test authenticated endpoint
Invoke-RestMethod -Uri "https://api.valine.app/profile/me" -Method Get -Headers @{
    "Authorization" = "Bearer $ACCESS_TOKEN"
    "Content-Type" = "application/json"
}
```

**Expected Response:**
```json
{
  "id": "usr_abc123def456",
  "email": "friend@example.com",
  "username": "frienduser",
  "displayName": "Friend User",
  "bio": null,
  "avatar": null
}
```

### Test 3: Verify CloudWatch Logs

```powershell
# Check Lambda logs for successful authentication
aws logs tail /aws/lambda/valine-api-prod \
  --region us-west-2 \
  --since 5m \
  --filter-pattern "friend@example.com"
```

**Expected Log Entries:**
```
2025-11-12T15:45:00.000Z [INFO] Login attempt: friend@example.com
2025-11-12T15:45:00.100Z [INFO] Email allowlist check: PASSED
2025-11-12T15:45:00.200Z [INFO] JWT tokens issued for user: usr_abc123def456
```

---

## Rollback Procedures

### Rollback Method A: Remove from Allowlist

```powershell
# Remove friend's email from allowlist
aws lambda update-function-configuration \
  --function-name valine-api-prod \
  --region us-west-2 \
  --environment "Variables={
    ALLOWED_USER_EMAILS=owner@example.com,
    AUTH_JWT_SECRET=$(aws lambda get-function-configuration \
      --function-name valine-api-prod \
      --region us-west-2 \
      --query 'Environment.Variables.AUTH_JWT_SECRET' \
      --output text),
    DATABASE_URL=$(aws lambda get-function-configuration \
      --function-name valine-api-prod \
      --region us-west-2 \
      --query 'Environment.Variables.DATABASE_URL' \
      --output text),
    NODE_ENV=production,
    ENABLE_REGISTRATION=false
  }"
```

**Verification:**
```powershell
# Confirm rollback
aws lambda get-function-configuration \
  --function-name valine-api-prod \
  --region us-west-2 \
  --query 'Environment.Variables.ALLOWED_USER_EMAILS' \
  --output text
```

**Expected Output:**
```
owner@example.com
```

### Rollback Method B: Disable Database Flag

```sql
-- Disable user account
psql "$DATABASE_URL" -c "
UPDATE \"User\" 
SET enabled = false, 
    \"updatedAt\" = CURRENT_TIMESTAMP 
WHERE email = 'friend@example.com' 
RETURNING id, email, enabled;
"
```

### Invalidate Active Sessions (Optional)

If you need to immediately revoke access:

```powershell
# Rotate JWT secret (see rotate-jwt-secret.md runbook)
# This invalidates ALL active sessions for ALL users
```

> ⚠️ **Warning**: Rotating JWT secret logs out all users, including the owner.

---

## Troubleshooting

### Issue: User Can't Login After Being Added

**Symptoms:**
```json
{
  "error": "Invalid credentials",
  "statusCode": 401
}
```

**Diagnosis:**
```powershell
# Check if user account exists
psql "$DATABASE_URL" -c "
SELECT id, email, username, email_verified 
FROM \"User\" 
WHERE email = 'friend@example.com';
"
```

**Solutions:**

1. **No account found** → User needs to register first
   ```powershell
   # Temporarily enable registration
   aws lambda update-function-configuration \
     --function-name valine-api-prod \
     --region us-west-2 \
     --environment "Variables={ENABLE_REGISTRATION=true,...}"
   
   # User registers via /auth/register
   
   # Disable registration again
   aws lambda update-function-configuration \
     --function-name valine-api-prod \
     --region us-west-2 \
     --environment "Variables={ENABLE_REGISTRATION=false,...}"
   ```

2. **Email not verified** → Mark as verified
   ```sql
   UPDATE "User" 
   SET email_verified = true 
   WHERE email = 'friend@example.com';
   ```

3. **Wrong password** → User needs to use password reset flow

### Issue: Environment Variable Update Fails

**Symptoms:**
```
An error occurred (InvalidParameterValueException): 
Environment variable cannot exceed 4 KB
```

**Solution:**
- Move large environment variables to AWS Systems Manager Parameter Store
- Reference parameters in Lambda configuration

```powershell
# Store DATABASE_URL in Parameter Store
aws ssm put-parameter \
  --name /valine/prod/database-url \
  --value "$DATABASE_URL" \
  --type SecureString \
  --region us-west-2

# Update Lambda to use parameter
# (Requires code changes to fetch from SSM)
```

### Issue: User Gets 403 After Successful Login

**Symptoms:**
```json
{
  "error": "Access denied: email not in allowlist",
  "statusCode": 403
}
```

**Diagnosis:**
```powershell
# Check current allowlist
aws lambda get-function-configuration \
  --function-name valine-api-prod \
  --region us-west-2 \
  --query 'Environment.Variables.ALLOWED_USER_EMAILS' \
  --output text
```

**Common Causes:**
1. **Typo in email address** → Check for extra spaces, case sensitivity
2. **Lambda update didn't deploy** → Wait for `State: Active`
3. **Cached configuration** → Wait 60 seconds for Lambda to pick up new config

**Solution:**
```powershell
# Force Lambda to restart with new config
aws lambda update-function-configuration \
  --function-name valine-api-prod \
  --region us-west-2 \
  --description "Force config refresh - $(date +%s)"
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

```powershell
# Monitor failed login attempts
aws logs filter-log-events \
  --log-group-name /aws/lambda/valine-api-prod \
  --region us-west-2 \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern '"Access denied"'
```

### Recommended CloudWatch Alarms

1. **High 403 Error Rate**
   - Metric: 403 response count
   - Threshold: > 10 in 5 minutes
   - Action: Notify ops team

2. **Failed Allowlist Checks**
   - Metric: Custom log metric filter
   - Pattern: "email not in allowlist"
   - Threshold: > 5 in 5 minutes

### Audit Log

Keep a record of user additions:

```powershell
# Document in ops log
echo "$(date -Iseconds) - Added friend@example.com to production allowlist - Operator: $(aws sts get-caller-identity --query Arn --output text)" >> /var/log/valine/user-additions.log
```

---

## Related Runbooks

- [Rotate JWT Secret](./rotate-jwt-secret.md) - Invalidate all sessions
- [Update IP Allowlist](./update-ip-allowlist.md) - Network-level access control
- [Email Verification](./email-verification.md) - User verification flows
- [2FA Enablement](./2fa-enablement.md) - Two-factor authentication

---

## Change Log

| Date | Change | Operator |
|------|--------|----------|
| 2025-11-12 | Initial runbook creation | Documentation Agent |

