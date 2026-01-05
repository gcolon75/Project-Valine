# Rotate JWT Secret Runbook

## Overview
Operational procedures for safely rotating the `AUTH_JWT_SECRET` in production Project Valine deployment. This runbook covers both zero-downtime and maintenance window approaches, including graceful session migration and emergency rotation scenarios.

**Last Updated**: 2025-11-12  
**Owner**: Security & Operations Team  
**Risk Level**: High  
**Estimated Time**: 15-30 minutes (zero-downtime) or 5-10 minutes (maintenance window)

---

## Table of Contents
- [When to Rotate JWT Secret](#when-to-rotate-jwt-secret)
- [Prerequisites](#prerequisites)
- [Approach 1: Zero-Downtime Rotation (Recommended)](#approach-1-zero-downtime-rotation-recommended)
- [Approach 2: Maintenance Window (Immediate Invalidation)](#approach-2-maintenance-window-immediate-invalidation)
- [Emergency Rotation](#emergency-rotation)
- [Verification Steps](#verification-steps)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

---

## When to Rotate JWT Secret

### Required Scenarios (Immediate Action)
- 🚨 **Security Breach**: Secret exposed in logs, version control, or public repository
- 🚨 **Compromised Access**: Unauthorized access detected or suspected
- 🚨 **Insider Threat**: Employee/contractor with access has left the organization
- 🚨 **Compliance Requirement**: Regulatory audit or security policy mandate

### Recommended Scenarios (Planned Action)
- 📅 **Scheduled Rotation**: Every 90 days as security best practice
- 📅 **Major Incident**: After security incident investigation
- 📅 **Infrastructure Change**: Before/after major deployment or migration
- 📅 **Access Audit**: When reviewing and revoking user sessions

---

## Prerequisites

### Required Access
- [x] AWS CLI configured with appropriate IAM permissions
- [x] AWS Lambda:UpdateFunctionConfiguration permission
- [x] AWS Lambda:GetFunctionConfiguration permission
- [x] AWS CloudWatch:GetLogEvents permission (for monitoring)

### Required Tools
```powershell
# Verify AWS CLI
aws --version
aws sts get-caller-identity

# Verify OpenSSL (for secret generation)
openssl version
```

### Communication Plan
> 📢 **Important**: Notify users before rotating JWT secret if using maintenance window approach.

**Notification Template:**
```
Subject: Scheduled Maintenance - Project Valine

We will be performing scheduled security maintenance on [DATE] at [TIME].

Impact: All users will be logged out and need to sign in again.
Duration: Approximately 5 minutes
Downtime: None (service remains available)

Thank you for your patience.
```

---

## Approach 1: Zero-Downtime Rotation (Recommended)

This approach allows both old and new JWTs to be valid during a grace period, preventing immediate session invalidation.

> ⚠️ **Note**: This requires code changes to support dual-secret verification. If not implemented, use Approach 2.

### Step 1: Generate New Secret

```powershell
# Generate a cryptographically secure 256-bit secret
NEW_SECRET=$(openssl rand -base64 32)

# Display the new secret (save this securely!)
echo "New JWT Secret: $NEW_SECRET"

# Store in password manager or AWS Secrets Manager
aws secretsmanager create-secret \
  --name valine/prod/jwt-secret-new \
  --description "New JWT secret for rotation" \
  --secret-string "$NEW_SECRET" \
  --region us-west-2
```

**Expected Output:**
```json
{
  "ARN": "arn:aws:secretsmanager:us-west-2:123456789012:secret:valine/prod/jwt-secret-new-AbCdEf",
  "Name": "valine/prod/jwt-secret-new",
  "VersionId": "EXAMPLE-1234-5678-9012-ABCDEFGHIJKL"
}
```

### Step 2: Get Current Secret

```powershell
# Retrieve current JWT secret
OLD_SECRET=$(aws lambda get-function-configuration \
  --function-name valine-api-prod \
  --region us-west-2 \
  --query 'Environment.Variables.AUTH_JWT_SECRET' \
  --output text)

echo "Current JWT Secret: $OLD_SECRET"

# Backup current secret
aws secretsmanager create-secret \
  --name valine/prod/jwt-secret-old \
  --description "Previous JWT secret (backup)" \
  --secret-string "$OLD_SECRET" \
  --region us-west-2
```

### Step 3: Configure Dual-Secret Support

> ⚠️ **Code Requirement**: This step assumes your backend supports `AUTH_JWT_SECRET_SECONDARY` for dual verification.

```powershell
# Update Lambda with both secrets
aws lambda update-function-configuration \
  --function-name valine-api-prod \
  --region us-west-2 \
  --environment "Variables={
    AUTH_JWT_SECRET=$NEW_SECRET,
    AUTH_JWT_SECRET_SECONDARY=$OLD_SECRET,
    ALLOWED_USER_EMAILS=$(aws lambda get-function-configuration \
      --function-name valine-api-prod \
      --region us-west-2 \
      --query 'Environment.Variables.ALLOWED_USER_EMAILS' \
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

### Step 4: Wait for Grace Period

```powershell
# Grace period allows old tokens to be used while new ones are issued
# Recommended: 7 days (refresh token TTL)

# Set reminder for grace period end
echo "Grace period ends: $(date -d '+7 days' -Iseconds)"

# Monitor token usage
aws logs filter-log-events \
  --log-group-name /aws/lambda/valine-api-prod \
  --region us-west-2 \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern '"JWT verification"' \
  | jq '.events[] | select(.message | contains("secondary"))'
```

**Expected Behavior During Grace Period:**
- New logins → Tokens signed with `$NEW_SECRET`
- Existing sessions → Tokens verified with `$OLD_SECRET` (secondary)
- Token refresh → New tokens signed with `$NEW_SECRET`

### Step 5: Remove Old Secret

After grace period (7+ days), remove the secondary secret:

```powershell
# Remove secondary secret
aws lambda update-function-configuration \
  --function-name valine-api-prod \
  --region us-west-2 \
  --environment "Variables={
    AUTH_JWT_SECRET=$NEW_SECRET,
    ALLOWED_USER_EMAILS=$(aws lambda get-function-configuration \
      --function-name valine-api-prod \
      --region us-west-2 \
      --query 'Environment.Variables.ALLOWED_USER_EMAILS' \
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

### Step 6: Verify Rotation Complete

```powershell
# Confirm only new secret is active
aws lambda get-function-configuration \
  --function-name valine-api-prod \
  --region us-west-2 \
  --query 'Environment.Variables.AUTH_JWT_SECRET' \
  --output text
```

---

## Approach 2: Maintenance Window (Immediate Invalidation)

This approach immediately invalidates all sessions. Use this for emergency rotations or if dual-secret support is not implemented.

### Step 1: Announce Maintenance

```powershell
# Send notification to users
# (Use your notification system or email)

echo "Maintenance window: $(date -Iseconds) - All users will be logged out"
```

### Step 2: Generate New Secret

```powershell
# Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

echo "New JWT Secret: $NEW_SECRET"

# Store securely
aws secretsmanager create-secret \
  --name valine/prod/jwt-secret \
  --description "Production JWT secret" \
  --secret-string "$NEW_SECRET" \
  --region us-west-2 \
  --overwrite
```

### Step 3: Update Lambda Configuration

```powershell
# Backup current configuration
aws lambda get-function-configuration \
  --function-name valine-api-prod \
  --region us-west-2 \
  > /tmp/lambda-config-backup-$(date +%s).json

# Update with new secret
aws lambda update-function-configuration \
  --function-name valine-api-prod \
  --region us-west-2 \
  --environment "Variables={
    AUTH_JWT_SECRET=$NEW_SECRET,
    ALLOWED_USER_EMAILS=$(aws lambda get-function-configuration \
      --function-name valine-api-prod \
      --region us-west-2 \
      --query 'Environment.Variables.ALLOWED_USER_EMAILS' \
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

**Expected Output:**
```json
{
  "FunctionName": "valine-api-prod",
  "LastModified": "2025-11-12T15:30:00.000+0000",
  "State": "Pending"
}
```

### Step 4: Wait for Deployment

```powershell
# Monitor deployment status
while true; do
  STATE=$(aws lambda get-function-configuration \
    --function-name valine-api-prod \
    --region us-west-2 \
    --query 'State' \
    --output text)
  
  echo "$(date -Iseconds) - State: $STATE"
  
  if [ "$STATE" = "Active" ]; then
    echo "Deployment complete!"
    break
  fi
  
  sleep 5
done
```

### Step 5: Verify All Sessions Invalidated

```powershell
# Test with old token (should fail)
OLD_TOKEN="<previous-access-token>"

Invoke-RestMethod -Uri "https://api.valine.app/profile/me" -Method Get -Headers @{
    "Authorization" = "Bearer $OLD_TOKEN"
    "Content-Type" = "application/json"
}
```

**Expected Response:**
```json
{
  "error": "Invalid token",
  "statusCode": 401
}
```

---

## Emergency Rotation

For immediate security threats (leaked secret, active breach):

### Quick Rotation Script

```powershell
#!/bin/bash
set -e

echo "🚨 EMERGENCY JWT SECRET ROTATION 🚨"
echo "This will LOG OUT ALL USERS immediately!"
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

# Generate new secret
NEW_SECRET=$(openssl rand -base64 32)
echo "New secret generated: ${NEW_SECRET:0:10}..."

# Update Lambda
aws lambda update-function-configuration \
  --function-name valine-api-prod \
  --region us-west-2 \
  --environment "Variables={
    AUTH_JWT_SECRET=$NEW_SECRET,
    ALLOWED_USER_EMAILS=$(aws lambda get-function-configuration \
      --function-name valine-api-prod \
      --region us-west-2 \
      --query 'Environment.Variables.ALLOWED_USER_EMAILS' \
      --output text),
    DATABASE_URL=$(aws lambda get-function-configuration \
      --function-name valine-api-prod \
      --region us-west-2 \
      --query 'Environment.Variables.DATABASE_URL' \
      --output text),
    NODE_ENV=production,
    ENABLE_REGISTRATION=false
  }"

# Wait for deployment
echo "Waiting for deployment..."
sleep 30

# Verify
CURRENT=$(aws lambda get-function-configuration \
  --function-name valine-api-prod \
  --region us-west-2 \
  --query 'Environment.Variables.AUTH_JWT_SECRET' \
  --output text)

if [ "${CURRENT:0:10}" = "${NEW_SECRET:0:10}" ]; then
  echo "✅ Rotation complete!"
  echo "📧 Notify users to re-login"
else
  echo "❌ Rotation failed - verify manually"
  exit 1
fi
```

**Save as:** `/tmp/emergency-jwt-rotation.sh`

```powershell
# Note: chmod not needed in PowerShell
./tmp/emergency-jwt-rotation.sh
```

---

## Verification Steps

### Test 1: New Logins Work

```powershell
# User logs in with credentials
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{ "email": "owner@example.com", "password": "SecurePassword123!" }' -ContentType 'application/json'
```

### Test 2: New Tokens Are Valid

```powershell
# Use new token to access protected endpoint
Invoke-RestMethod -Uri "https://api.valine.app/profile/me" -Method Get -Headers @{
    "Authorization" = "Bearer $NEW_TOKEN"
    "Content-Type" = "application/json"
}
```

**Expected Response:**
```json
{
  "id": "usr_123",
  "email": "owner@example.com",
  "username": "owner"
}
```

### Test 3: Old Tokens Are Invalid (Approach 2 Only)

```powershell
# Try using old token
OLD_TOKEN="<token-from-before-rotation>"

Invoke-RestMethod -Uri "https://api.valine.app/profile/me" -Method Get -Headers @{
    "Authorization" = "Bearer $OLD_TOKEN"
    "Content-Type" = "application/json"
}
```

**Expected Response:**
```json
{
  "error": "Invalid token",
  "statusCode": 401
}
```

### Test 4: Token Refresh Works

```powershell
# Refresh token to get new access token
REFRESH_TOKEN="<refresh-token>"

Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{\' -ContentType 'application/json'
```

**Expected Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Test 5: Monitor Logs for Errors

```powershell
# Check for JWT verification errors
aws logs tail /aws/lambda/valine-api-prod \
  --region us-west-2 \
  --since 10m \
  --filter-pattern "error"
```

**Expected Output:**
- No JWT verification errors
- Old tokens showing "Invalid signature" (Approach 2 only)

---

## Rollback Procedures

### Scenario: Rotation Caused Widespread Issues

If the rotation causes unexpected problems:

```powershell
# Retrieve backup secret
BACKUP_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id valine/prod/jwt-secret-old \
  --region us-west-2 \
  --query 'SecretString' \
  --output text)

# Restore old secret
aws lambda update-function-configuration \
  --function-name valine-api-prod \
  --region us-west-2 \
  --environment "Variables={
    AUTH_JWT_SECRET=$BACKUP_SECRET,
    ALLOWED_USER_EMAILS=$(aws lambda get-function-configuration \
      --function-name valine-api-prod \
      --region us-west-2 \
      --query 'Environment.Variables.ALLOWED_USER_EMAILS' \
      --output text),
    DATABASE_URL=$(aws lambda get-function-configuration \
      --function-name valine-api-prod \
      --region us-west-2 \
      --query 'Environment.Variables.DATABASE_URL' \
      --output text),
    NODE_ENV=production,
    ENABLE_REGISTRATION=false
  }"

echo "⚠️ Rolled back to previous JWT secret"
echo "⚠️ Old user sessions should work again"
```

> 🚨 **Security Warning**: Only rollback if absolutely necessary. Investigate why the new secret failed.

---

## Troubleshooting

### Issue: All Users Suddenly Logged Out

**Symptoms:**
- Users report "Invalid token" errors
- Widespread 401 responses

**Diagnosis:**
```powershell
# Check if secret was changed recently
aws lambda get-function-configuration \
  --function-name valine-api-prod \
  --region us-west-2 \
  --query 'LastModified' \
  --output text
```

**Solution:**
- This is expected after Approach 2 rotation
- Notify users to re-login
- If unexpected, check audit logs for unauthorized changes

### Issue: Some Tokens Valid, Others Invalid

**Symptoms:**
- Intermittent 401 errors
- Some users can login, others can't

**Diagnosis:**
```powershell
# Check for dual-secret configuration
aws lambda get-function-configuration \
  --function-name valine-api-prod \
  --region us-west-2 \
  --query 'Environment.Variables' \
  | jq 'keys | map(select(contains("JWT")))'
```

**Solution:**
- If `AUTH_JWT_SECRET_SECONDARY` exists → Grace period active (expected)
- If only `AUTH_JWT_SECRET` → Old tokens will fail (expected in Approach 2)

### Issue: Cannot Generate New Secret

**Symptoms:**
```
openssl: command not found
```

**Solution:**
```powershell
# Alternative: Use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Alternative: Use Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Alternative: Online generator (use with caution)
# https://generate-secret.now.sh/32
```

### Issue: Lambda Update Fails

**Symptoms:**
```
An error occurred (InvalidParameterValueException): 
Environment variables cannot exceed 4 KB
```

**Solution:**
```powershell
# Store secret in AWS Secrets Manager instead
aws secretsmanager create-secret \
  --name valine/prod/jwt-secret \
  --secret-string "$NEW_SECRET" \
  --region us-west-2

# Update Lambda to reference Secrets Manager
# (Requires code changes to fetch secret at runtime)
```

---

## Monitoring & Alerts

### CloudWatch Metrics

```powershell
# Monitor 401 error rate
aws cloudwatch put-metric-alarm \
  --alarm-name valine-high-401-rate \
  --alarm-description "High rate of 401 Unauthorized errors" \
  --metric-name 4XXError \
  --namespace AWS/ApiGateway \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --region us-west-2
```

### Log Insights Queries

```powershell
# Detect failed JWT verifications
aws logs start-query \
  --log-group-name /aws/lambda/valine-api-prod \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, @message | filter @message like /JWT.*invalid|token.*expired/ | stats count() by bin(5m)' \
  --region us-west-2
```

### Post-Rotation Audit

Document the rotation:

```powershell
# Create audit record
Get-Content >> /var/log/valine/jwt-rotations.log << EOF
---
Date: $(date -Iseconds)
Operator: $(aws sts get-caller-identity --query Arn --output text)
Approach: [Zero-Downtime | Maintenance Window | Emergency]
Reason: [Scheduled | Breach | Compliance]
Old Secret Hash: $(echo -n "$OLD_SECRET" | sha256sum | cut -d' ' -f1)
New Secret Hash: $(echo -n "$NEW_SECRET" | sha256sum | cut -d' ' -f1)
Impact: [Number] users logged out
Status: Success
EOF
```

---

## Related Runbooks

- [Add User](./add-user.md) - User access management
- [Update IP Allowlist](./update-ip-allowlist.md) - Network-level security
- [Email Verification](./email-verification.md) - User verification flows
- [2FA Enablement](./2fa-enablement.md) - Two-factor authentication

---

## Security Best Practices

1. **Never log JWT secrets** - Redact from logs and error messages
2. **Store secrets securely** - Use AWS Secrets Manager or Parameter Store
3. **Rotate regularly** - Schedule rotation every 90 days
4. **Monitor for leaks** - Use tools like GitHub secret scanning
5. **Document rotations** - Keep audit trail of all changes
6. **Test in staging** - Verify rotation procedure before production

---

## Change Log

| Date | Change | Operator |
|------|--------|----------|
| 2025-11-12 | Initial runbook creation | Documentation Agent |

