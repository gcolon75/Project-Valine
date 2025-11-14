# Manual Steps Required - MUST DO BEFORE MERGING

## ⚠️ CRITICAL: Run Database Migration First

**You MUST run this command before deploying the code:**

```bash
cd api
npx prisma migrate deploy
```

**Why**: The code now uses `passwordHash` field, but your database has `password`. The migration renames the column.

**What happens if you skip this**: All logins and registrations will fail with database errors.

---

## Deployment Steps (Total Time: ~10 minutes)

### Step 1: Run Migration (5 seconds)
```bash
cd /path/to/Project-Valine/api
npx prisma migrate deploy
```

**Expected output**:
```
✔ Generated Prisma Client
✔ Applied migration 20251114213703_rename_password_to_passwordhash
```

### Step 2: Deploy to AWS Lambda (2-5 minutes)
```bash
cd /path/to/Project-Valine/serverless
npx serverless deploy --stage prod --region us-west-2
```

**Expected output**:
```
✔ Service deployed to stack pv-api-prod
endpoints:
  POST - https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/register
  ...
```

### Step 3: Test the Allowlist (30 seconds)

**Test 1: Allowed email (should succeed)**
```bash
curl -X POST https://YOUR-API-URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"ghawk075@gmail.com","password":"TestPass123!"}'
```
Expected: HTTP 201 Created ✅

**Test 2: Non-allowed email (should fail)**
```bash
curl -X POST https://YOUR-API-URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"random@example.com","password":"TestPass123!"}'
```
Expected: HTTP 403 "Registration not permitted" ✅

---

## Current Allowlist Configuration

Only these emails can register:
- ghawk075@gmail.com
- valinejustin@gmail.com

Everyone else will get: **"Registration not permitted"**

---

## How to Change the Allowlist Later

1. Edit `serverless/serverless.yml` line 40:
   ```yaml
   ALLOWED_USER_EMAILS: "new-email@example.com,another@example.com"
   ```

2. Redeploy:
   ```bash
   cd serverless
   npx serverless deploy --stage prod --region us-west-2
   ```

**No code changes needed!**

---

## Troubleshooting

### Migration fails with "already exists"
The column might already be named `passwordHash`. Check your database:
```sql
\d users  -- PostgreSQL
```
If column is already `passwordHash`, skip the migration.

### Deployment fails with "credentials not found"
Make sure AWS credentials are configured:
```bash
aws configure
```

### Registration returns "Server error"
1. Check DATABASE_URL environment variable is set
2. Check CloudWatch logs:
   ```bash
   aws logs tail /aws/lambda/pv-api-prod-register --region us-west-2 --follow
   ```

### "Registration not permitted" for allowed email
1. Verify email is lowercase in ALLOWED_USER_EMAILS
2. No spaces after commas in the list
3. Check Lambda environment variables in AWS Console

---

## Additional Documentation

- **Start here**: `QUICK_DEPLOY.md` - Quick reference
- **Full guide**: `ALLOWLIST_DEPLOYMENT_GUIDE.md` - Complete instructions
- **Technical details**: `EXECUTION_SUMMARY.md` - What was fixed

---

## After Deployment Checklist

- [ ] Migration completed successfully
- [ ] Deployment completed successfully  
- [ ] Tested registration with ghawk075@gmail.com (should work)
- [ ] Tested registration with valinejustin@gmail.com (should work)
- [ ] Tested registration with random email (should fail)
- [ ] Checked CloudWatch logs for errors

---

## Questions?

The allowlist feature is now **production-ready**. If you encounter issues:
1. Check CloudWatch logs for detailed error messages
2. Verify migration ran successfully
3. Confirm environment variables are set correctly

**Status**: ✅ Ready to deploy in under 10 minutes!
