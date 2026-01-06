> **ARCHIVED:** 2026-01-05
> **Reason:** Consolidated into canonical documentation
> **See:** [Documentation Index](../README.md) for current docs

---
# Access Control Allowlist

## Overview

Project Valine uses an **email-based allowlist** to restrict account creation and application access to pre-approved users only. This security measure ensures that only authorized individuals can register, authenticate, and access protected features.

## Rationale

The allowlist system provides:

1. **Security**: Prevents unauthorized account creation and access
2. **Privacy**: Limits exposure of user data to known, trusted users
3. **Control**: Maintains a curated, invite-only user base
4. **Compliance**: Ensures only approved individuals access the platform

This approach is ideal for:
- Private beta testing
- Internal company applications
- Restricted-access professional networks
- Compliance-sensitive environments

## How It Works

### Backend Enforcement

The backend (serverless Lambda functions) enforces the allowlist at two critical points:

1. **Registration** (`POST /auth/register`)
   - Checks email against `ALLOWED_USER_EMAILS` environment variable
   - Rejects registration attempts for non-allowlisted emails with `403 Forbidden`
   - Returns error: `"Access denied: email not in allowlist"`
   - No database writes occur for rejected registrations

2. **Login** (`POST /auth/login`)
   - Defense-in-depth check for existing users
   - Blocks login for non-allowlisted emails even if account exists
   - Returns error: `"Account not authorized for access"`

### Frontend Gating

The frontend provides a better user experience by:

1. **Hiding Registration UI**
   - "Get Started" button removed from marketing pages when allowlist active
   - `/join` route displays a friendly restriction notice instead of signup form

2. **Client-Side Validation**
   - Pre-checks email before submitting registration/login requests
   - Shows immediate feedback via toast messages
   - Reduces unnecessary API calls

3. **Polling Suppression**
   - Unauthenticated users don't trigger background API polling
   - Prevents network spam for `/unread-counts` and similar endpoints

### Build-Time Validation

The build process validates allowlist configuration:

- `scripts/validate-allowlist.js` runs during `npm run prebuild`
- Ensures required emails are present: `ghawk075@gmail.com`, `valinejustin@gmail.com`
- Fails build if production deployment lacks proper allowlist
- Prevents accidental misconfiguration in production

## Configuration

### Backend Configuration

Set the `ALLOWED_USER_EMAILS` environment variable in your serverless deployment:

**serverless.yml** (already configured):
```yaml
provider:
  environment:
    ALLOWED_USER_EMAILS: ${env:ALLOWED_USER_EMAILS, "ghawk075@gmail.com,valinejustin@gmail.com"}
```

**AWS Lambda Environment Variables** (for production):
1. Go to AWS Lambda Console
2. Select your function (e.g., `pv-api-prod-register`)
3. Configuration → Environment variables
4. Set key: `ALLOWED_USER_EMAILS`
5. Set value: `ghawk075@gmail.com,valinejustin@gmail.com`

**Local Development** (`.env` file):
```powershell
ALLOWED_USER_EMAILS=ghawk075@gmail.com,valinejustin@gmail.com
```

### Frontend Configuration

Set the `VITE_ALLOWED_USER_EMAILS` environment variable:

**Production** (`.env.production`):
```powershell
VITE_ALLOWED_USER_EMAILS=ghawk075@gmail.com,valinejustin@gmail.com
```

**Development** (`.env` or `.env.local`):
```powershell
# Optional in development - leave empty to allow open registration locally
VITE_ALLOWED_USER_EMAILS=ghawk075@gmail.com,valinejustin@gmail.com
```

### Format

- Comma-separated list of email addresses
- Case-insensitive (normalized to lowercase)
- Whitespace is automatically trimmed
- Empty string = no allowlist enforcement

**Valid Examples**:
```powershell
# Two users
ALLOWED_USER_EMAILS=ghawk075@gmail.com,valinejustin@gmail.com

# With whitespace (automatically trimmed)
ALLOWED_USER_EMAILS=ghawk075@gmail.com, valinejustin@gmail.com

# Single user
ALLOWED_USER_EMAILS=ghawk075@gmail.com

# No allowlist (open registration - NOT recommended for production)
ALLOWED_USER_EMAILS=
```

## Adding or Removing Allowed Emails

### To Add a New User

1. **Update Backend Environment Variable**:
   ```powershell
   ALLOWED_USER_EMAILS=ghawk075@gmail.com,valinejustin@gmail.com,newuser@example.com
   ```

2. **Update Frontend Environment Variable**:
   ```powershell
   VITE_ALLOWED_USER_EMAILS=ghawk075@gmail.com,valinejustin@gmail.com,newuser@example.com
   ```

3. **Update Build Validation** (if making this a permanent required email):
   Edit `scripts/validate-allowlist.js`:
   ```javascript
   const REQUIRED_EMAILS = [
     'ghawk075@gmail.com',
     'valinejustin@gmail.com',
     'newuser@example.com'  // Add here
   ];
   ```

4. **Deploy Changes**:
   - Backend: Redeploy serverless functions with new env var
   - Frontend: Rebuild and redeploy with new env var

### To Remove a User

1. **Remove from Backend Environment Variable**:
   ```powershell
   ALLOWED_USER_EMAILS=ghawk075@gmail.com
   ```

2. **Remove from Frontend Environment Variable**:
   ```powershell
   VITE_ALLOWED_USER_EMAILS=ghawk075@gmail.com
   ```

3. **Deploy Changes** (same as adding)

**Note**: Removing a user from the allowlist prevents new logins but does NOT delete their existing account data. To fully remove a user, also delete their database records.

## Health Check

The `/health` endpoint returns allowlist status:

```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/health" -Method Get
```

**Response**:
```json
{
  "status": "ok",
  "timestamp": 1700000000000,
  "service": "Project Valine API",
  "version": "1.0.0",
  "allowlistActive": true,
  "allowlistCount": 2,
  "allowlistMisconfigured": false
}
```

**Fields**:
- `allowlistActive`: `true` if allowlist is configured (length > 0)
- `allowlistCount`: Number of emails in allowlist
- `allowlistMisconfigured`: `true` if required emails are missing

## Observability

### Structured Logging

Registration and login denials are logged with structured JSON:

**Registration Denial**:
```json
{
  "event": "registration_denied",
  "email": "unauthorized@example.com",
  "reason": "email_not_in_allowlist",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "allowlistCount": 2
}
```

**Login Denial**:
```json
{
  "event": "login_denied",
  "email": "unauthorized@example.com",
  "reason": "email_not_in_allowlist",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "allowlistCount": 2
}
```

### Monitoring

Use CloudWatch Logs Insights to query denial events:

```
fields @timestamp, @message
| filter @message like /registration_denied/ or @message like /login_denied/
| sort @timestamp desc
| limit 100
```

## Security Considerations

### Defense in Depth

1. **Backend is Source of Truth**
   - Frontend checks are for UX only
   - All security enforcement happens on backend
   - Never trust client-side validation

2. **Pre-Database Validation**
   - Allowlist checked BEFORE any DB writes
   - Prevents creation of unauthorized accounts
   - Minimizes attack surface

3. **Login Defense**
   - Even if unauthorized account exists, login is blocked
   - Handles edge cases (e.g., allowlist added after account creation)

### Best Practices

- **Never commit allowlist to version control** if it contains sensitive emails
- Use environment variables or AWS Systems Manager Parameter Store
- Rotate allowlist as needed without code changes
- Monitor denial logs for unauthorized access attempts
- Test allowlist in staging before production deployment

## Troubleshooting

### Build Fails: "Missing required emails"

**Cause**: `VITE_ALLOWED_USER_EMAILS` is not set or missing required emails.

**Fix**:
1. Set environment variable before build:
   ```powershell
$env:VITE_ALLOWED_USER_EMAILS = "ghawk075@gmail.com,valinejustin@gmail.com"
   npm run build
   ```
2. Or add to `.env.production` file

### User Cannot Register: "Access denied"

**Cause**: User's email is not in allowlist.

**Fix**:
1. Verify email spelling matches allowlist exactly
2. Check backend env var `ALLOWED_USER_EMAILS`
3. Check frontend env var `VITE_ALLOWED_USER_EMAILS`
4. Redeploy if environment variables changed

### Allowlist Not Working

**Cause**: Environment variable not set correctly.

**Debugging**:
1. Check health endpoint: `Invoke-RestMethod -Uri ".../health"`
2. Verify `allowlistActive: true` and `allowlistCount > 0`
3. Check Lambda environment variables in AWS Console
4. Check CloudWatch logs for allowlist parsing errors

### "Get Started" Button Still Shows

**Cause**: Frontend environment variable not set.

**Fix**:
1. Set `VITE_ALLOWED_USER_EMAILS` in `.env.production`
2. Rebuild frontend: `npm run build`
3. Redeploy static assets

## Rollback Plan

If allowlist causes issues:

### Quick Reference

For detailed rollback procedures, see the [Allowlist Deployment Runbook](ALLOWLIST_DEPLOYMENT_RUNBOOK.md#rollback).

### Immediate Rollback (Backend Only)

1. **Remove allowlist env var**:
   ```powershell
   # AWS Lambda Console
   # Delete ALLOWED_USER_EMAILS environment variable
   # OR set to empty string
   ```

2. **Redeploy serverless**:
   ```powershell
   cd serverless/login_unpack
   npm run deploy
   ```

This restores open registration while keeping all other features intact.

### Full Rollback (Backend + Frontend)

1. Remove backend env var (as above)
2. Remove frontend env var from `.env.production`
3. Rebuild and redeploy frontend

### Git Revert

Revert this entire PR:
```powershell
git revert <this-pr-merge-commit>
git push origin main
```

Then redeploy both backend and frontend.

## Testing

### Manual Testing

1. **Test Allowlisted Email**:
   ```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{"email":"ghawk075@gmail.com","password":"test123","username":"test","displayName":"Test User"}' -ContentType 'application/json'
```

2. **Test Non-Allowlisted Email**:
   ```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{"email":"unauthorized@example.com","password":"test123","username":"test2","displayName":"Test User 2"}' -ContentType 'application/json'
```

3. **Test Frontend**:
   - Visit `/join` → Should show restriction notice (if allowlist active)
   - Marketing header → "Get Started" button should be hidden
   - Check browser console → No `/unread-counts` polling when unauthenticated

### Automated Tests

Run test suites:
```powershell
# Backend tests
cd serverless/login_unpack
npm test

# Frontend tests
npm run test:run
```

## References

- **Deployment Runbook**: [ALLOWLIST_DEPLOYMENT_RUNBOOK.md](ALLOWLIST_DEPLOYMENT_RUNBOOK.md) - Complete deployment and troubleshooting guide
- Backend: `serverless/login_unpack/src/handlers/auth.js`
- Frontend: `src/utils/allowlistConfig.js`
- Validation: `scripts/validate-allowlist.js`
- Health: `serverless/login_unpack/src/handlers/health.js`
- Environment: `.env.example`, `serverless.yml`
- Deployment Scripts: `scripts/deploy-backend.ps1`, `scripts/deploy-backend.sh`
- Audit Tools: `scripts/audit-allowlist.ps1`, `scripts/patch-allowlist-env.ps1`

## Support

For questions or issues:
1. Check this documentation
2. Review health endpoint response
3. Check CloudWatch logs for denial events
4. Contact system administrator
