# Quick Deployment Reference Card

## TL;DR - 3 Commands to Deploy

```bash
# 1. Run migration (from repo root)
cd api && npx prisma migrate deploy

# 2. Deploy (from repo root)
cd ../serverless && npx serverless deploy --stage prod --region us-west-2

# 3. Test
curl -X POST https://YOUR-API-URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"ghawk075@gmail.com","password":"Test123!"}'
```

**Expected Result**: HTTP 201 Created ✅

## What Was Fixed

- ✅ Schema field name (password → passwordHash)
- ✅ Prisma client with Linux binaries
- ✅ serverless.yml YAML errors
- ✅ Package configuration

## Current Allowlist

Only these emails can register:
- ghawk075@gmail.com
- valinejustin@gmail.com

Everyone else gets: `403 Registration not permitted`

## Change Allowlist

Edit `serverless/serverless.yml` line 40:
```yaml
ALLOWED_USER_EMAILS: "email1@gmail.com,email2@gmail.com,email3@gmail.com"
```

Then redeploy (command 2 above).

## Open Public Registration

Edit `serverless/serverless.yml` line 38:
```yaml
ENABLE_REGISTRATION: "true"
```

Then redeploy.

## Troubleshooting

### "Registration not permitted" for allowed email
- Check email is lowercase in ALLOWED_USER_EMAILS
- No spaces after commas in the CSV list
- Verify environment variable deployed to Lambda

### "Server error" on registration
- Run migration first (command 1 above)
- Check DATABASE_URL is set correctly
- Tail logs: `aws logs tail /aws/lambda/pv-api-prod-register --follow`

### Package too large
- Current: 150MB (under 250MB limit) ✅
- If needed in future: Use Lambda Layers

## Full Documentation

- `ALLOWLIST_DEPLOYMENT_GUIDE.md` - Complete instructions
- `EXECUTION_SUMMARY.md` - What was fixed and why

## Status

✅ READY FOR PRODUCTION DEPLOYMENT

**Estimated deployment time: 10 minutes**
