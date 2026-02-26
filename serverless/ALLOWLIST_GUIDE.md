# Allowlist Management Guide

## Overview

The allowlist feature restricts user registration to a pre-approved list of email addresses. This is ideal for:
- Private beta testing
- Internal team access
- Staged rollout
- Exclusive communities

## How It Works

The allowlist is implemented in `serverless/src/handlers/auth.js`:

```javascript
const enableRegistration = (process.env.ENABLE_REGISTRATION || 'false') === 'true';
const allowListRaw = process.env.ALLOWED_USER_EMAILS || '';
const allowed = allowListRaw
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

if (!enableRegistration) {
  // Registration closed to public — require email in allowlist
  if (allowed.length === 0) {
    return error(403, 'Registration not permitted');
  }
  if (!allowed.includes(email.toLowerCase())) {
    return error(403, 'Registration not permitted');
  }
}
```

### Key Points

1. **When `ENABLE_REGISTRATION=false`** (default):
   - Only emails in `ALLOWED_USER_EMAILS` can register
   - All other registration attempts receive HTTP 403
   - If `ALLOWED_USER_EMAILS` is empty, ALL registrations are blocked

2. **When `ENABLE_REGISTRATION=true`**:
   - Anyone can register
   - `ALLOWED_USER_EMAILS` is ignored

3. **Email matching**:
   - Case-insensitive (user@EXAMPLE.com = user@example.com)
   - Trimmed whitespace
   - Exact match required

## Default Allowlist

By default (configured in `serverless.yml`):

```yaml
environment:
  ENABLE_REGISTRATION: ${env:ENABLE_REGISTRATION, "false"}
  ALLOWED_USER_EMAILS: ${env:ALLOWED_USER_EMAILS, "ghawk075@gmail.com,valinejustin@gmail.com"}
```

Only these emails can register:
- ghawk075@gmail.com
- valinejustin@gmail.com

## Managing the Allowlist

### Method 1: Update and Redeploy (Recommended)

**Pros:** 
- Changes are version-controlled
- Documented in serverless.yml
- Consistent across environments

**Steps:**

1. Set the environment variable:
   ```bash
   export ALLOWED_USER_EMAILS="user1@example.com,user2@example.com,user3@example.com"
   ```

2. Deploy:
   ```bash
   cd serverless
   npx serverless deploy --stage prod --region us-west-2
   ```

3. Verify:
   ```bash
   aws lambda get-function-configuration \
     --function-name pv-api-prod-register \
     --region us-west-2 \
     --query 'Environment.Variables.ALLOWED_USER_EMAILS'
   ```

### Method 2: Update via serverless.yml

Edit `serverless/serverless.yml` line 44:

```yaml
ALLOWED_USER_EMAILS: ${env:ALLOWED_USER_EMAILS, "email1@example.com,email2@example.com,email3@example.com"}
```

Then deploy:
```bash
npx serverless deploy --stage prod --region us-west-2
```

### Method 3: AWS Lambda Console (No Code Deploy)

**Pros:**
- Immediate changes
- No code deployment
- Good for emergency additions

**Cons:**
- Not version-controlled
- Can be overwritten by code deploy
- Harder to audit

**Steps:**

1. Go to [AWS Lambda Console](https://console.aws.amazon.com/lambda)
2. Select region: **us-west-2**
3. Find function: **pv-api-prod-register**
4. Click **Configuration** tab
5. Click **Environment variables**
6. Click **Edit**
7. Find `ALLOWED_USER_EMAILS`
8. Update value: `email1@example.com,email2@example.com,email3@example.com`
9. Click **Save**

Changes are **effective immediately** - no restart needed.

### Method 4: AWS CLI

```bash
aws lambda update-function-configuration \
  --function-name pv-api-prod-register \
  --region us-west-2 \
  --environment "Variables={ALLOWED_USER_EMAILS=user1@example.com,user2@example.com}"
```

**Note:** This overwrites ALL environment variables. Better to use the console or redeploy.

## Email Format Requirements

### ✅ Valid Formats

```bash
# Single email
ALLOWED_USER_EMAILS="user@example.com"

# Multiple emails (no spaces)
ALLOWED_USER_EMAILS="user1@example.com,user2@example.com,user3@example.com"

# Case doesn't matter (all converted to lowercase)
ALLOWED_USER_EMAILS="User@Example.com,ANOTHER@SITE.COM"
```

### ❌ Invalid Formats

```bash
# Spaces after commas (will be trimmed, but avoid)
ALLOWED_USER_EMAILS="user1@example.com, user2@example.com"

# Empty entries (will be filtered out)
ALLOWED_USER_EMAILS="user1@example.com,,user2@example.com"

# Missing @ or invalid email (will be added but won't match valid emails)
ALLOWED_USER_EMAILS="notanemail,user@example.com"
```

## Common Scenarios

### Adding a New User

**Via Environment Variable + Deploy:**
```bash
# Current list
export CURRENT_LIST="ghawk075@gmail.com,valinejustin@gmail.com"

# Add new user
export ALLOWED_USER_EMAILS="${CURRENT_LIST},newuser@example.com"

# Deploy
cd serverless
npx serverless deploy --stage prod --region us-west-2
```

**Via AWS Console:**
1. Get current value from Lambda console
2. Append `,newuser@example.com`
3. Save

### Removing a User

```bash
# Update list without the user
export ALLOWED_USER_EMAILS="ghawk075@gmail.com,valinejustin@gmail.com"

# Deploy
npx serverless deploy --stage prod --region us-west-2
```

**Note:** Removing from allowlist doesn't delete existing accounts. It only prevents new registrations.

### Temporarily Allow Multiple Beta Testers

```bash
# Add all beta testers
export ALLOWED_USER_EMAILS="ghawk075@gmail.com,valinejustin@gmail.com,beta1@example.com,beta2@example.com,beta3@example.com"

# Deploy
npx serverless deploy --stage prod --region us-west-2

# After beta, remove beta testers
export ALLOWED_USER_EMAILS="ghawk075@gmail.com,valinejustin@gmail.com"

# Deploy again
npx serverless deploy --stage prod --region us-west-2
```

### Opening Public Registration

When ready to allow anyone to register:

```bash
# Method 1: Environment variable
export ENABLE_REGISTRATION="true"
npx serverless deploy --stage prod --region us-west-2

# Method 2: AWS Console
# Lambda → pv-api-prod-register → Configuration → Environment variables
# Set ENABLE_REGISTRATION = true
```

Once `ENABLE_REGISTRATION=true`, the `ALLOWED_USER_EMAILS` list is ignored.

### Closing Registration Completely

Block all new registrations (even allowlisted):

```bash
# Set empty allowlist
export ALLOWED_USER_EMAILS=""
export ENABLE_REGISTRATION="false"

# Deploy
npx serverless deploy --stage prod --region us-west-2
```

All registration attempts will receive HTTP 403.

## Testing the Allowlist

### Test Allowed Email

```bash
API_URL="https://ce73w43mga.execute-api.us-west-2.amazonaws.com"

curl -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ghawk075@gmail.com",
    "password": "SecurePass123!"
  }'
```

**Expected:** HTTP 201 Created

### Test Non-Allowed Email

```bash
curl -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "random@example.com",
    "password": "SecurePass123!"
  }'
```

**Expected:** HTTP 403 Forbidden
```json
{
  "error": "Registration not permitted"
}
```

### Test Case Insensitivity

```bash
# If allowlist has "user@example.com"
curl -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "USER@EXAMPLE.COM",
    "password": "SecurePass123!"
  }'
```

**Expected:** HTTP 201 Created (emails are normalized to lowercase)

## Monitoring

### Check Current Allowlist

```bash
# Via AWS CLI
aws lambda get-function-configuration \
  --function-name pv-api-prod-register \
  --region us-west-2 \
  --query 'Environment.Variables.ALLOWED_USER_EMAILS'
```

### Monitor Registration Attempts

```bash
# Tail register function logs
aws logs tail /aws/lambda/pv-api-prod-register \
  --region us-west-2 \
  --follow
```

**Log messages:**

✅ **Allowed registration:**
```
[REGISTER] Created userId=abc-123-def
```

❌ **Blocked registration:**
```
[REGISTER] Email not allowlisted
```

❌ **Empty allowlist:**
```
[REGISTER] Registration closed and no allowlist configured
```

## Security Notes

### Email Privacy

The allowlist is visible to:
- Developers with access to serverless.yml
- AWS users with Lambda function read permissions
- Anyone who can view CloudWatch logs (email addresses appear in logs)

**Recommendations:**
- Use environment variables for sensitive allowlists
- Restrict AWS IAM access to Lambda functions
- Consider using SSM Parameter Store for allowlist (requires code change)

### Account Security

**Important:** The allowlist only controls registration, not login.

Once an account is created:
- User can always log in (even if removed from allowlist)
- Account must be deleted separately if needed
- Consider implementing account suspension features

### Preventing Enumeration

The current implementation returns the same error for:
- Non-allowlisted emails
- Emails already registered

This prevents attackers from enumerating the allowlist.

**Example:**
- Existing user tries to register → HTTP 409 "Email already registered"
- Non-allowlisted email tries to register → HTTP 403 "Registration not permitted"

This tells them the email is allowlisted but taken, which is acceptable.

## Troubleshooting

### "Registration not permitted" for Allowlisted Email

**Check:**

1. Email is in the list:
   ```bash
   aws lambda get-function-configuration \
     --function-name pv-api-prod-register \
     --region us-west-2 \
     --query 'Environment.Variables.ALLOWED_USER_EMAILS'
   ```

2. No extra spaces:
   ```bash
   # Wrong
   ALLOWED_USER_EMAILS="user1@example.com, user2@example.com"
   
   # Right
   ALLOWED_USER_EMAILS="user1@example.com,user2@example.com"
   ```

3. Case matches (actually doesn't matter, but check):
   ```bash
   # Both work
   ALLOWED_USER_EMAILS="User@Example.com"
   ALLOWED_USER_EMAILS="user@example.com"
   ```

4. Recent deployment updated the function:
   ```bash
   aws lambda get-function-configuration \
     --function-name pv-api-prod-register \
     --region us-west-2 \
     --query 'LastModified'
   ```

### Everyone Can Register (Allowlist Not Working)

**Check `ENABLE_REGISTRATION`:**

```bash
aws lambda get-function-configuration \
  --function-name pv-api-prod-register \
  --region us-west-2 \
  --query 'Environment.Variables.ENABLE_REGISTRATION'
```

If it's `"true"`, the allowlist is ignored.

**Fix:**
```bash
# Via redeploy
export ENABLE_REGISTRATION="false"
npx serverless deploy --stage prod --region us-west-2

# Or via AWS Console
# Set ENABLE_REGISTRATION = false
```

### No One Can Register

**Check both variables:**

```bash
aws lambda get-function-configuration \
  --function-name pv-api-prod-register \
  --region us-west-2 \
  --query 'Environment.Variables.{ENABLE_REGISTRATION:ENABLE_REGISTRATION,ALLOWED_USER_EMAILS:ALLOWED_USER_EMAILS}'
```

If `ALLOWED_USER_EMAILS` is empty and `ENABLE_REGISTRATION` is false, all registrations are blocked.

**Fix:**
```bash
export ALLOWED_USER_EMAILS="user1@example.com,user2@example.com"
export ENABLE_REGISTRATION="false"
npx serverless deploy --stage prod --region us-west-2
```

## Best Practices

1. **Use environment variables** - Don't hardcode emails in serverless.yml
2. **Document changes** - Keep a list of who was added/removed and when
3. **Test after changes** - Verify allowlist works after updating
4. **Monitor logs** - Watch for unexpected blocked registrations
5. **Plan for scale** - Consider moving to database-backed allowlist if you need 100+ emails
6. **Communicate with users** - Let allowlisted users know they can register

## Future Improvements

Consider these enhancements:

1. **SSM Parameter Store** - Store allowlist in AWS SSM for easier updates
2. **Database-backed allowlist** - Store in Prisma database for larger lists
3. **Invitation codes** - Generate unique codes instead of email lists
4. **Time-limited allowlist** - Emails expire after certain date
5. **Allowlist API** - Endpoint to add/remove emails programmatically
6. **Audit log** - Track who was added/removed and when
7. **Domain allowlist** - Allow all emails from specific domains (e.g., @company.com)

## Summary

| Method | Speed | Persistence | Best For |
|--------|-------|-------------|----------|
| Environment variable + deploy | ~2 min | Permanent | Regular updates |
| Edit serverless.yml + deploy | ~2 min | Version controlled | Documented changes |
| AWS Console | Instant | Until next deploy | Emergency adds |
| AWS CLI | Instant | Until next deploy | Automation |

**Recommendation:** Use environment variable + deploy for most changes, AWS Console for emergencies only.
