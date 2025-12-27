# Deployment Instructions for Project Valine Auth System

## Current Goal
Enable ONLY 2 specific email addresses to create accounts and login:
- ghawk075@gmail.com
- valinejustin@gmail.com

## Prerequisites
1. AWS credentials configured
2. Node.js 20.x installed
3. Database URL configured
4. JWT_SECRET configured

## Quick Deployment Steps (Windows PowerShell)

### 1. Fix Local File (if you see duplicate export error)

Your current local file has a duplicate export. Pull the latest version from GitHub:

```powershell
# Save any local changes first
git stash

# Pull the latest fixed version
git pull origin copilot/fix-authentication-endpoint

# Or if you want to start fresh
git fetch origin
git checkout origin/copilot/fix-authentication-endpoint -- serverless/src/handlers/auth.js
```

### 2. Verify the File is Correct

```powershell
# This should show NO "export async function" lines
findstr /N /C:"export async function" serverless\src\handlers\auth.js

# This should return NOTHING (no output means no error)
node --check serverless/src/handlers/auth.js

# This should show the logging line once
findstr /C:"[LOGIN] Raw body length:" serverless\src\handlers\auth.js
```

### 3. Fix the EPERM Deployment Error

The EPERM error is a Windows-specific issue with npx. Fix it by:

**Option A: Install Serverless Globally (Recommended)**
```powershell
npm install -g serverless
cd serverless
serverless deploy --stage prod --region us-west-2 --force
```

**Option B: Clear NPX Cache**
```powershell
# Run PowerShell as Administrator
Remove-Item -Recurse -Force $env:LOCALAPPDATA\npm-cache\_npx
npm install -g serverless
cd serverless
serverless deploy --stage prod --region us-west-2 --force
```

**Option C: Use npm scripts**
```powershell
cd serverless
npm install
npm run deploy
```

### 4. Deploy to AWS

```powershell
cd serverless
serverless deploy --stage prod --region us-west-2 --force
```

This will:
- Package your Lambda functions
- Upload to AWS
- Create/update API Gateway endpoints
- Set environment variables including ALLOWED_USER_EMAILS

### 5. Verify Deployment

After deployment completes, you'll see output like:
```
endpoints:
  POST - https://xxxxx.execute-api.us-west-2.amazonaws.com/auth/login
  POST - https://xxxxx.execute-api.us-west-2.amazonaws.com/auth/register
  GET - https://xxxxx.execute-api.us-west-2.amazonaws.com/auth/me
```

Test the login endpoint:

```powershell
# Create a test account (if not already created)
curl -X POST "https://YOUR-API-URL/auth/register" `
  -H "Origin: https://dkmxy676d3vgc.cloudfront.net" `
  -H "Content-Type: application/json" `
  --data '{\"email\":\"ghawk075@gmail.com\",\"password\":\"YOUR_PASSWORD\"}'

# Test login
curl -X POST "https://YOUR-API-URL/auth/login" `
  -H "Origin: https://dkmxy676d3vgc.cloudfront.net" `
  -H "Content-Type: application/json" `
  --data '{\"email\":\"ghawk075@gmail.com\",\"password\":\"YOUR_PASSWORD\"}' `
  -i
```

You should see:
- HTTP 200 status
- Set-Cookie headers for accessToken, refreshToken, csrfToken
- JSON body with user info and csrfToken

### 6. Check CloudWatch Logs

```powershell
aws logs tail /aws/lambda/pv-api-prod-login --follow --region us-west-2
```

Look for:
- `[LOGIN] Raw body length: XX` (confirms new code is deployed)
- `[LOGIN] Success userId=XXX` (confirms login worked)

## Important Notes About Regions

You mentioned some things are in us-west-1 and others in us-west-2. This is FINE for:
- Lambda functions in different regions
- DynamoDB tables in different regions
- S3 buckets in different regions

It only matters if you need low-latency cross-region communication. For your use case (just you and one friend), the performance difference is negligible.

## Environment Variables Already Configured

In `serverless.yml`, these are already set:
```yaml
ALLOWED_USER_EMAILS: ghawk075@gmail.com,valinejustin@gmail.com
```

This means ONLY these 2 emails can register. Anyone else will get a 403 error.

## Current Auth Handler Structure

The auth.js file now exports these handlers:
- `login` - Login endpoint
- `register` - Registration endpoint (restricted to allowed emails)
- `me` - Get current user info
- `refresh` - Refresh access token
- `logout` - Logout and clear cookies
- `verifyEmail` - Email verification (stub for now)
- `resendVerification` - Resend verification email (stub for now)
- `setup2FA` - Setup 2FA for a user
- `enable2FA` - Enable 2FA after verification
- `verify2FA` - Verify a 2FA code
- `disable2FA` - Disable 2FA for a user

## Troubleshooting

### "Duplicate export" error
- Pull the latest code from GitHub (the fix is already committed)
- Make sure you don't have `export async function` anywhere
- Only one `export { ... }` block at the end

### EPERM error on Windows
- Install serverless globally: `npm install -g serverless`
- Or clear npx cache and try again
- Or run PowerShell as Administrator

### "email and password are required" error
- Check that your request body is valid JSON
- Make sure Content-Type header is `application/json`
- Verify the body is not base64-encoded

### Cookies not being set
- Check CORS headers - Origin must match allowedOrigins in serverless.yml
- Verify you're using the correct API Gateway URL
- Check CloudWatch logs for errors

## Next Steps After Successful Deployment

1. Test login with both allowed email addresses
2. Verify that other emails get 403 on registration
3. Test the /auth/me endpoint with cookies
4. Set up 2FA if desired (optional)
5. Change test passwords to production passwords
6. Rotate JWT_SECRET if it was exposed during testing

## Security Notes

- JWT_SECRET should be a strong random string
- ALLOWED_USER_EMAILS restricts registration to only your 2 emails
- Passwords are hashed with bcrypt (12 rounds)
- Access tokens expire after 15 minutes
- Refresh tokens expire after 7 days
- All cookies are HttpOnly and Secure in production
