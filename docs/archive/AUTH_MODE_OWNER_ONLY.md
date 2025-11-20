# Owner-Only Authentication Mode

This guide explains the owner-only authentication mode, where registration is restricted to allowlisted email addresses. This is the recommended production configuration for single-owner or small-team deployments.

## Overview

**Owner-only mode** combines:
1. **Registration disabled** (`ENABLE_REGISTRATION=false`)
2. **Email allowlist** (`ALLOWED_USER_EMAILS` with owner email(s))
3. **Strict allowlist enforcement** (`STRICT_ALLOWLIST=1` in production)

This ensures only pre-approved users can register and access the application.

## Configuration

### Environment Variables

```bash
# Required
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=<strong-secret-32+-characters>
ALLOWED_USER_EMAILS=ghawk075@gmail.com,approved@example.com

# Auth Mode
ENABLE_REGISTRATION=false
STRICT_ALLOWLIST=1

# Optional
COOKIE_DOMAIN=.your-domain.com
FRONTEND_URL=https://your-domain.com
```

### Serverless (.env) Configuration

Create `serverless/.env`:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/valine_prod

# Authentication
JWT_SECRET=your-production-secret-at-least-32-characters-long
ALLOWED_USER_EMAILS=ghawk075@gmail.com
ENABLE_REGISTRATION=false
STRICT_ALLOWLIST=1

# Deployment
NODE_ENV=production
COOKIE_DOMAIN=.your-domain.com
FRONTEND_URL=https://your-domain.com
```

## Deployment Workflow

### Initial Owner Setup

1. **Configure Environment**:
   ```bash
   cd serverless
   cp .env.example .env
   # Edit .env with your settings
   ```

2. **Run Pre-Deployment Checks**:
   ```bash
   node ../scripts/verify-predeploy.mjs
   ```

3. **Optimize Prisma for Production**:
   ```bash
   node ../scripts/prisma-optimize.mjs --prod
   npm run prisma:generate
   ```

4. **Deploy**:
   ```bash
   npm run deploy
   ```

5. **Register Owner Account**:
   ```bash
   curl -X POST https://api.your-domain.com/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "ghawk075@gmail.com",
       "password": "SecurePassword123!",
       "username": "owner"
     }'
   ```

6. **Verify Login**:
   ```bash
   curl -i -X POST https://api.your-domain.com/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "ghawk075@gmail.com",
       "password": "SecurePassword123!"
     }'
   ```

   Expected: `200 OK` with `Set-Cookie` headers containing `access_token` and `refresh_token`.

### Adding Additional Users

1. **Add Email to Allowlist**:
   ```bash
   # In serverless/.env or environment variable
   ALLOWED_USER_EMAILS=ghawk075@gmail.com,newuser@example.com
   ```

2. **Redeploy** (if using .env file):
   ```bash
   cd serverless
   npm run deploy
   ```

3. **New User Registers**:
   ```bash
   curl -X POST https://api.your-domain.com/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "newuser@example.com",
       "password": "SecurePassword456!",
       "username": "newuser"
     }'
   ```

## Security Features

### Allowlist Enforcement

- **Pre-registration check**: Email verified against allowlist before database query
- **Registration block**: Non-allowlisted emails receive `403 Access denied`
- **Login block**: Non-allowlisted emails cannot login even if account exists
- **Structured logging**: All denials logged with `correlationId` for audit trails

### Strict Mode Protection

When `STRICT_ALLOWLIST=1`:
- Requires at least 2 emails in allowlist (prevents accidental lockout)
- Returns `503 Service temporarily unavailable` if misconfigured
- Logs structured error: `allowlist_misconfigured`

**Disable for single-user dev/testing**:
```bash
STRICT_ALLOWLIST=0
ALLOWED_USER_EMAILS=ghawk075@gmail.com
```

### Response Headers

All auth responses include diagnostic headers:
- `X-Auth-Mode: owner-only` - Indicates current authentication mode
- `X-Service-Version: 0.0.1` - Service version
- `X-Correlation-ID: <uuid>` - Request tracing ID

## Troubleshooting

### Common Issues

#### 1. Registration Returns 403

**Error**: `Access denied: email not in allowlist`

**Solution**:
```bash
# Verify allowlist
grep ALLOWED_USER_EMAILS serverless/.env

# Add email (case-insensitive, comma-separated)
ALLOWED_USER_EMAILS=ghawk075@gmail.com,newuser@example.com
```

#### 2. Strict Mode Returns 503

**Error**: `Service temporarily unavailable: configuration error`

**Cause**: `STRICT_ALLOWLIST=1` but allowlist has < 2 emails

**Solutions**:
```bash
# Option 1: Add second email
ALLOWED_USER_EMAILS=ghawk075@gmail.com,backup@example.com

# Option 2: Disable strict mode (dev/testing only)
STRICT_ALLOWLIST=0
```

#### 3. Login Returns 500

**Error**: `[LOGIN] User missing password hash`

**Cause**: Legacy user account from before `passwordHash` standardization

**Solution**:
```bash
# One-time migration
DATABASE_URL=postgresql://... node scripts/patch-legacy-passwords.mjs

# After migration, remove fallback code from auth.js
```

#### 4. Cookies Not Set / Lost Sessions

**Causes**:
- Missing `COOKIE_DOMAIN` in production
- HTTP instead of HTTPS (production requires Secure flag)
- Domain mismatch

**Solution**:
```bash
# Production
NODE_ENV=production
COOKIE_DOMAIN=.your-domain.com  # Note leading dot

# Development
NODE_ENV=development
# No COOKIE_DOMAIN needed for localhost
```

### Diagnostic Commands

```bash
# Check health endpoint
curl https://api.your-domain.com/health

# Test owner login with verbose output
curl -i -X POST https://api.your-domain.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ghawk075@gmail.com","password":"..."}'

# Check CloudWatch logs (AWS)
aws logs tail /aws/lambda/pv-api-prod-login --region us-west-2 --since 5m

# View structured logs with correlation ID
aws logs filter-log-events \
  --log-group-name /aws/lambda/pv-api-prod-login \
  --filter-pattern '{ $.correlationId = * }'
```

## Migration from Open Registration

If migrating from open registration mode:

1. **Backup Database**:
   ```bash
   pg_dump $DATABASE_URL > backup.sql
   ```

2. **Export Existing Users**:
   ```bash
   psql $DATABASE_URL -c "SELECT email FROM users" > existing-users.txt
   ```

3. **Create Allowlist**:
   ```bash
   # Combine existing users into comma-separated list
   ALLOWED_USER_EMAILS=user1@example.com,user2@example.com,...
   ```

4. **Update Configuration**:
   ```bash
   ENABLE_REGISTRATION=false
   STRICT_ALLOWLIST=1
   ```

5. **Deploy & Test**:
   ```bash
   npm run deploy
   # Test login for existing users
   ```

## Monitoring & Audit

### Structured Logs

All authentication events include:
- `correlationId`: Request tracing ID
- `event`: Event type (login_denied, registration_denied, etc.)
- `timestamp`: ISO 8601 timestamp
- `email`: Redacted email (te***@example.com)
- `reason`: Denial reason

### Event Types

- `login_denied` - Login blocked by allowlist
- `registration_denied` - Registration blocked by allowlist
- `allowlist_misconfigured` - Strict mode violation
- `rate_limit_exceeded` - Too many attempts
- `2fa_verified` - 2FA successful
- `2fa_code_invalid` - 2FA failure

### CloudWatch Insights Queries

```sql
-- Count denials by reason
fields @timestamp, event, reason
| filter event = "login_denied" or event = "registration_denied"
| stats count() by reason

-- Trace specific request
fields @timestamp, event, correlationId, email
| filter correlationId = "550e8400-e29b-41d4-a716-446655440000"
| sort @timestamp asc
```

## Best Practices

1. **Never commit secrets**: Use environment variables or parameter store
2. **Rotate JWT secret periodically**: Invalidates all existing sessions
3. **Use strong passwords**: Enforce minimum complexity in client
4. **Enable 2FA**: For all owner accounts
5. **Monitor denial logs**: Alert on suspicious patterns
6. **Backup allowlist**: Document approved emails separately
7. **Test before production**: Verify owner can login after deployment
8. **Use correlation IDs**: Reference in support requests for faster debugging

## Related Documentation

- [AUTH_RECOVERY_CHECKLIST.md](./AUTH_RECOVERY_CHECKLIST.md) - Troubleshooting guide
- [ALLOWLIST_DEPLOYMENT_GUIDE.md](./ALLOWLIST_DEPLOYMENT_GUIDE.md) - Detailed allowlist setup
- [scripts/verify-predeploy.mjs](./scripts/verify-predeploy.mjs) - Pre-deployment validation
- [scripts/patch-legacy-passwords.mjs](./scripts/patch-legacy-passwords.mjs) - Password migration

## Support

For issues not covered in this guide:
1. Check [AUTH_RECOVERY_CHECKLIST.md](./AUTH_RECOVERY_CHECKLIST.md)
2. Review CloudWatch logs with correlation ID
3. Run `node scripts/verify-predeploy.mjs` for configuration issues
4. Create GitHub issue with correlation ID and redacted logs
