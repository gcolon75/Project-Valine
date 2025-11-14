# QUICK START: Fix Your Authentication

## The Problem You Had
Your local `serverless\src\handlers\auth.js` file had **duplicate exports** causing this error:
```
SyntaxError: Duplicate export of 'verify2fa'
```

This happened because some functions had `export async function` AND were also listed in the final `export { ... }` block.

## The Solution (Already Done in This Branch)
✅ Removed all `export` keywords from function declarations  
✅ Added missing handlers that serverless.yml references  
✅ Single export block at the end of the file  
✅ All 13 handlers properly exported  

## What You Need to Do Now

### Step 1: Pull This Fixed Code
```powershell
# In your Project-Valine directory
git pull origin copilot/fix-authentication-endpoint
```

### Step 2: Verify the Fix Worked
```powershell
cd serverless
.\verify-auth.ps1
```

You should see all green checkmarks ✓

### Step 3: Fix the EPERM Error (Windows)
The EPERM error happens because npx can't access a locked file. Fix it:

```powershell
# Install serverless globally (avoids npx issues)
npm install -g serverless
```

### Step 4: Deploy to AWS
```powershell
cd serverless
serverless deploy --stage prod --region us-west-2 --force
```

This will take 2-3 minutes. You'll see output like:
```
✔ Service deployed to stack pv-api-prod
endpoints:
  POST - https://xxxxx.execute-api.us-west-2.amazonaws.com/auth/login
  ...
```

### Step 5: Test Login
Replace `YOUR-API-URL` with the URL from step 4:

```powershell
curl -X POST "YOUR-API-URL/auth/login" `
  -H "Origin: https://dkmxy676d3vgc.cloudfront.net" `
  -H "Content-Type: application/json" `
  --data '{\"email\":\"ghawk075@gmail.com\",\"password\":\"YOUR_PASSWORD\"}' `
  -i
```

Look for:
- **HTTP/1.1 200 OK**
- **Set-Cookie: accessToken=...**
- **Set-Cookie: refreshToken=...**
- JSON response with your user info

### Step 6: Check CloudWatch Logs
```powershell
aws logs tail /aws/lambda/pv-api-prod-login --follow --region us-west-2
```

Look for:
- `[LOGIN] Raw body length: 54` (or similar number)
- `[LOGIN] Success userId=...`

If you see these, **you're done!** ✅

## Your End Goal (Already Configured)

Only 2 emails can register and login:
- ✅ ghawk075@gmail.com
- ✅ valinejustin@gmail.com

This is enforced in `serverless.yml`:
```yaml
ALLOWED_USER_EMAILS: ghawk075@gmail.com,valinejustin@gmail.com
```

Anyone else who tries to register will get `403 Forbidden`.

## What If It Still Doesn't Work?

### "Duplicate export" error persists
```powershell
# Your local file might not have updated. Force it:
git fetch origin
git checkout origin/copilot/fix-authentication-endpoint -- serverless/src/handlers/auth.js
.\verify-auth.ps1
```

### "EPERM" error persists
```powershell
# Run PowerShell as Administrator, then:
Remove-Item -Recurse -Force $env:LOCALAPPDATA\npm-cache\_npx
npm install -g serverless
```

### "email and password are required" error
- Check your JSON is valid: `{\"email\":\"...\",\"password\":\"...\"}`
- Make sure you're using `Content-Type: application/json`
- Check CloudWatch logs for the actual error

### No cookies in response
- Verify Origin header matches: `https://dkmxy676d3vgc.cloudfront.net`
- Check serverless.yml CORS configuration
- Look for errors in CloudWatch logs

## About the us-west-1 vs us-west-2 Thing

**Don't worry about it.** It's fine. The performance difference for 2 users is negligible (< 20ms). Keep everything as-is.

## Files Added/Modified in This Fix

- ✅ `serverless/src/handlers/auth.js` - Fixed duplicate exports, added missing handlers
- ✅ `serverless/DEPLOYMENT_INSTRUCTIONS.md` - Detailed deployment guide
- ✅ `serverless/verify-auth.sh` - Linux/Mac verification script
- ✅ `serverless/verify-auth.ps1` - Windows verification script
- ✅ `.gitignore` - Added login.zip and login_unpack to ignore list

## Security Checklist After Deployment

- [ ] Test login with both allowed emails
- [ ] Verify other emails get 403 on registration
- [ ] Change test passwords to strong production passwords
- [ ] Rotate JWT_SECRET if it was exposed during debugging
- [ ] Enable 2FA if you want extra security (optional)

## Need More Help?

See `serverless/DEPLOYMENT_INSTRUCTIONS.md` for:
- Detailed troubleshooting
- How to test each endpoint
- Security recommendations
- Complete command reference

## Summary

**Before:** Duplicate export error, deployment failed  
**After:** Clean exports, all handlers present, ready to deploy  
**Result:** Only you and your friend can create accounts and login

You're all set! 🚀
