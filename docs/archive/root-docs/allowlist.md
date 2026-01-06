> **ARCHIVED:** 2026-01-05
> **Reason:** Consolidated into canonical documentation
> **See:** [Documentation Index](../README.md) for current docs

---
# Allowlist Configuration

This document describes the allowlist configuration for Project Valine's production environment.

---

## Overview

Project Valine uses an email allowlist to restrict registration and login to approved users only. This is enforced at both the frontend (for UX) and backend (for security).

---

## Current Configuration

| Setting | Value |
|---------|-------|
| `ENABLE_REGISTRATION` | `false` |
| Allowlist Status | Active |
| Enforcement | Backend (authoritative) + Frontend (UX) |

---

## Allowed Users

The current list of allowed users is maintained in:

📄 **[ALLOWED_USERS.md](../ALLOWED_USERS.md)** (repository root)

This document contains:
- List of approved email addresses
- User roles and status
- Instructions for adding/removing users

---

## Environment Variables

### Backend (Lambda)

```env
ENABLE_REGISTRATION=false
ALLOWED_USER_EMAILS=ghawk075@gmail.com,[SECOND_EMAIL]
```

These are set as Lambda environment variables via:
1. Serverless Framework configuration
2. AWS Lambda Console
3. GitHub Actions secrets

### Frontend (Vite)

```env
VITE_ENABLE_REGISTRATION=false
VITE_ALLOWED_USER_EMAILS=ghawk075@gmail.com,[SECOND_EMAIL]
```

These are set in `.env.production` before building.

---

## How It Works

### Backend Enforcement (Primary)

1. User attempts to login or register
2. Backend checks if email is in `ALLOWED_USER_EMAILS`
3. If not present, returns `403 Forbidden`
4. This is the **authoritative security control**

### Frontend Enforcement (UX)

1. Frontend checks `VITE_ALLOWED_USER_EMAILS` on load
2. Hides "Get Started" button if allowlist is active
3. Shows restriction notice on `/join` page
4. Prevents unnecessary API calls

---

## Updating the Allowlist

### Step 1: Update Backend

```powershell
aws lambda update-function-configuration `
    --function-name pv-api-prod-login `
    --region us-west-2 `
    --environment "Variables={ALLOWED_USER_EMAILS=ghawk075@gmail.com,new@email.com,ENABLE_REGISTRATION=false}"
```

Or update via Serverless deploy:

```powershell
cd serverless
npx serverless deploy --stage prod --region us-west-2
```

### Step 2: Update Frontend

1. Edit `.env.production`:
   ```env
   VITE_ALLOWED_USER_EMAILS=ghawk075@gmail.com,new@email.com
   ```

2. Rebuild and deploy:
   ```powershell
   npm run build
   aws s3 sync dist/ s3://valine-frontend-prod --delete
   aws cloudfront create-invalidation --distribution-id E16LPJDBIL5DEE --paths "/*"
   ```

### Step 3: Update Documentation

Update [ALLOWED_USERS.md](../ALLOWED_USERS.md) with the new user information.

---

## Security Considerations

### Why Use an Allowlist?

1. **Controlled Beta** – Limit access during development and testing
2. **Cost Control** – Prevent unauthorized API usage and database growth
3. **Quality Control** – Manage user experience with known users
4. **Easy Expansion** – Simple to add users when ready

### Important Notes

- Backend enforcement is the **only** security boundary
- Frontend enforcement is for UX only (can be bypassed)
- Always update backend **before** frontend
- Verify changes in production after deployment

---

## Opening Registration

When ready to allow public registration:

1. Set `ENABLE_REGISTRATION=true` on backend
2. Remove or clear `ALLOWED_USER_EMAILS`
3. Update frontend environment variables
4. Consider adding:
   - Email verification
   - Rate limiting
   - CAPTCHA protection

---

## Troubleshooting

### "Email not in allowlist" Error

1. Verify email is in `ALLOWED_USER_EMAILS` (check Lambda env vars)
2. Ensure exact match (emails are case-sensitive)
3. Redeploy backend if recently changed
4. Check for typos or extra whitespace

### Frontend Still Shows Restriction

1. Verify `.env.production` is updated
2. Rebuild the frontend (`npm run build`)
3. Sync to S3 and invalidate CloudFront
4. Hard refresh browser (Ctrl+Shift+R)

---

## Related Documentation

- [ALLOWED_USERS.md](../ALLOWED_USERS.md) – Detailed user management
- [RUNBOOK.md](../RUNBOOK.md) – Deployment procedures
- [PRODUCTION_ACCOUNT_SETUP.md](../PRODUCTION_ACCOUNT_SETUP.md) – Account provisioning
