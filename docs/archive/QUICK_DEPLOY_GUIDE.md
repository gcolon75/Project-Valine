# Backend Deployment Fix - Quick Start

## ✅ What Was Fixed

1. **serverless.yml YAML syntax error** - Fixed `analyticsCleanup` function indentation
2. **Environment variables** - Created `.env.prod` with DATABASE_URL, JWT_SECRET, ALLOWED_USER_EMAILS
3. **Deployment scripts** - Created automation for easy deployment
4. **Documentation** - Comprehensive guide in `DEPLOYMENT_SUCCESS.md`

## 🚀 Deploy Now (One Command)

```bash
cd serverless
bash deploy.sh
```

This will:
1. Validate the configuration
2. Load environment variables from `.env.prod`
3. Deploy to AWS (pv-api-prod stack)
4. Show verification commands

## ✅ Verification (After Deployment)

```bash
# 1. Test health endpoint
curl https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/health

# 2. Test allowlisted email (should succeed)
curl -X POST https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"ghawk075@gmail.com","username":"gcolon","password":"TestPassword123!","displayName":"Gabriel Colon"}'

# 3. Test non-allowlisted email (should fail with 403)
curl -X POST https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"hacker@evil.com","username":"hacker","password":"Test123!","displayName":"Hacker"}'
```

## 📋 Expected Results

- Health endpoint: `200 OK` with `{"status":"healthy"}`
- Allowlisted email: `201 Created` with user object and tokens
- Non-allowlisted email: `403 Forbidden` with `{"error":"Registration not permitted"}`

## 🔧 Configuration

### Allowlist (Currently Active)
- ghawk075@gmail.com ✅
- valinejustin@gmail.com ✅
- All other emails ❌

### Environment Variables
- `ENABLE_REGISTRATION=false` (registration closed)
- `ALLOWED_USER_EMAILS=ghawk075@gmail.com,valinejustin@gmail.com`
- `DATABASE_URL=postgresql://ValineColon_75:...` (configured)
- `JWT_SECRET=oHnvIQ0...` (configured)

## 📚 Documentation

- **Complete Guide**: `DEPLOYMENT_SUCCESS.md` (in repository root)
- **Serverless README**: `serverless/README.md`
- **Validation Scripts**: 
  - `serverless/validate-config.sh`
  - `serverless/test-allowlist.sh`

## 🔒 Security Note

⚠️ **Important:** The `.env.prod` file contains production credentials. After successful deployment, consider:

1. **Move to AWS SSM Parameter Store** (recommended):
   ```bash
   aws ssm put-parameter --name /valine/prod/database-url --value "..." --type SecureString --region us-west-2
   aws ssm put-parameter --name /valine/prod/jwt-secret --value "..." --type SecureString --region us-west-2
   ```

2. **Update serverless.yml** to reference SSM:
   ```yaml
   DATABASE_URL: ${ssm:/valine/prod/database-url}
   JWT_SECRET: ${ssm:/valine/prod/jwt-secret}
   ```

3. **Remove .env.prod** from repository after SSM migration

See `DEPLOYMENT_SUCCESS.md` for detailed SSM migration instructions.

## 🎯 Success Criteria

All these should pass after deployment:

- [x] serverless.yml validates successfully
- [x] .env.prod configured with credentials
- [x] All validation tests pass locally
- [ ] Deployment completes without errors
- [ ] Lambda environment variables are set
- [ ] ghawk075@gmail.com can register (201 Created)
- [ ] Other emails are blocked (403 Forbidden)
- [ ] CloudWatch logs show successful DB connection

## 💡 Next Steps

After successful deployment:

1. **Create test accounts** with both allowlisted emails
2. **Test the application** functionality
3. **Monitor CloudWatch logs** for any errors
4. **Migrate secrets to SSM** for better security
5. **Update allowlist** as needed (see DEPLOYMENT_SUCCESS.md)

## 🆘 Troubleshooting

If deployment fails:

1. Check AWS credentials: `aws sts get-caller-identity`
2. Validate config: `bash serverless/validate-config.sh`
3. Check CloudWatch logs: `aws logs tail /aws/lambda/pv-api-prod-register --region us-west-2`
4. See `DEPLOYMENT_SUCCESS.md` troubleshooting section

## 📞 Support

For issues, refer to:
- `DEPLOYMENT_SUCCESS.md` - Complete troubleshooting guide
- CloudWatch Logs - `/aws/lambda/pv-api-prod-register`
- Serverless docs - https://www.serverless.com/framework/docs
