# Production User Allowlist

## Overview

Project Valine uses an email allowlist to control who can register and login in production. This document tracks allowed users and provides guidance for managing access.

## Current Allowed Users

| Email | Name | Role | Status | Account Created |
|-------|------|------|--------|----------------|
| ghawk075@gmail.com | Gabriel Colon | Owner | ✅ Active | [Use account provisioning] |
| [FRIEND_EMAIL] | [Friend Name] | User | ⏳ Pending | Not Yet |

> **Note:** Replace `[FRIEND_EMAIL]` and `[Friend Name]` with actual values when ready to provision.

## How the Allowlist Works

### Frontend Enforcement (VITE_ALLOWED_USER_EMAILS)

The frontend performs client-side validation to improve UX:
- Hides "Get Started" button when allowlist is active
- Shows restriction notice on `/join` page
- Validates email before API calls

Set in `.env`:
```env
VITE_ALLOWED_USER_EMAILS=ghawk075@gmail.com,[FRIEND_EMAIL]
```

### Backend Enforcement (ALLOWED_USER_EMAILS)

The backend performs authoritative server-side validation:
- Returns 403 for non-allowlisted emails
- Enforced on both registration and login
- **This is the primary security control**

Set in Lambda environment variables:
```env
ALLOWED_USER_EMAILS=ghawk075@gmail.com,[FRIEND_EMAIL]
```

## Adding Users

### Step 1: Update Environment Variables

1. **GitHub Secrets** (for CI/CD):
   - Go to repository Settings → Secrets → Actions
   - Update `ALLOWED_USER_EMAILS` secret
   - Add new email, comma-separated

2. **Lambda Environment** (for immediate effect):
   ```bash
   aws lambda update-function-configuration \
     --function-name project-valine-prod-api \
     --environment "Variables={ALLOWED_USER_EMAILS=ghawk075@gmail.com,new@email.com,...}"
   ```

### Step 2: Update Frontend Build

1. Update `.env.production`:
   ```env
   VITE_ALLOWED_USER_EMAILS=ghawk075@gmail.com,new@email.com
   ```

2. Rebuild and deploy frontend:
   ```bash
   npm run build
   ./scripts/deploy-ux-only.sh
   ```

### Step 3: Provision User Account

Use the admin script to create the account:

```bash
export DATABASE_URL="postgresql://..."

node scripts/admin-upsert-user.mjs \
  --email new@email.com \
  --password SecurePassword123! \
  --display-name "New User Name"
```

### Step 4: Update This Document

Add a new row to the "Current Allowed Users" table:

```markdown
| new@email.com | New User | User | ✅ Active | [Date] |
```

## Removing Users

### Step 1: Remove from Allowlist

1. Update `ALLOWED_USER_EMAILS` in:
   - GitHub Secrets
   - Lambda environment variables
   - `.env.production`

2. Redeploy backend and frontend

### Step 2: (Optional) Deactivate Account

Set user status to 'inactive' in database:

```sql
UPDATE users 
SET status = 'inactive' 
WHERE email = 'removed@email.com';
```

### Step 3: Update This Document

Remove or mark the user as inactive in the table.

## Configuration Reference

### Backend Configuration

```env
# serverless/.env.prod (or Lambda env vars)
ALLOWED_USER_EMAILS=ghawk075@gmail.com,[FRIEND_EMAIL]
ENABLE_REGISTRATION=false
```

### Frontend Configuration

```env
# .env.production
VITE_ALLOWED_USER_EMAILS=ghawk075@gmail.com,[FRIEND_EMAIL]
VITE_ENABLE_REGISTRATION=false
```

### GitHub Secrets

| Secret | Purpose |
|--------|---------|
| `ALLOWED_USER_EMAILS` | Backend allowlist |
| `VITE_ALLOWED_USER_EMAILS` | Frontend allowlist |

## Security Considerations

### Why Allowlist?

1. **Controlled Beta**: Limit access during beta testing
2. **Cost Control**: Prevent unauthorized API usage
3. **Quality Control**: Manage user experience
4. **Easy Expansion**: Simple to add users when ready

### Future Options

When ready to open registration:

1. Set `ENABLE_REGISTRATION=true`
2. Clear `ALLOWED_USER_EMAILS` or remove the check
3. Implement email verification
4. Add rate limiting
5. Add CAPTCHA if needed

## Troubleshooting

### "Email not in allowlist" Error

1. Verify email is in `ALLOWED_USER_EMAILS` (backend)
2. Verify email matches exactly (case-sensitive)
3. Redeploy backend if recently changed
4. Check Lambda environment variables in AWS Console

### User Can't Register Despite Being in Allowlist

1. Check `ENABLE_REGISTRATION` is not `false`
2. Verify no typos in email
3. Check backend logs for specific error
4. Ensure account doesn't already exist

### Frontend Shows Restriction Notice

1. Update `VITE_ALLOWED_USER_EMAILS` 
2. Rebuild and redeploy frontend
3. Clear CloudFront cache:
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id $CLOUDFRONT_ID \
     --paths "/*"
   ```

## Related Documentation

- [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md)
- [PRODUCTION_ACCOUNT_SETUP.md](./PRODUCTION_ACCOUNT_SETUP.md)
- [scripts/admin-upsert-user.mjs](./scripts/admin-upsert-user.mjs)
- [serverless/ALLOWLIST_GUIDE.md](./serverless/ALLOWLIST_GUIDE.md)
