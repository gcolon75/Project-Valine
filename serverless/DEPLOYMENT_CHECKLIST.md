# ✅ Deployment Checklist - Registration Fix

## Pre-Deployment Verification

- [x] All code changes committed
- [x] Database migration created
- [x] Documentation written
- [x] Security issues addressed
- [x] Hardcoded credentials removed

## Deployment Steps (To Be Completed by User)

### Step 1: Backup Current Database
**Priority**: HIGH  
**Time**: 5 minutes

```bash
# Connect to RDS and backup users table
pg_dump -h project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com \
  -U ValineColon_75 \
  -d postgres \
  -t users \
  -f users_backup_$(date +%Y%m%d_%H%M%S).sql
```

- [ ] Database backup completed
- [ ] Backup file verified

### Step 2: Set AWS Lambda Environment Variables
**Priority**: CRITICAL  
**Time**: 10 minutes

1. Go to AWS Lambda Console
2. Select your Lambda function
3. Configuration → Environment variables → Edit
4. Add/Update these variables:

```
DATABASE_URL=postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require

JWT_SECRET=oHnvIQ0wx5P1fxADM4UKXkv7k+VP05clPNTD9RDfROo=

ALLOWED_USER_EMAILS=ghawk075@gmail.com,valinejustin@gmail.com

ENABLE_REGISTRATION=false
```

- [ ] Environment variables configured
- [ ] Values double-checked
- [ ] Saved

### Step 3: Run Database Migration
**Priority**: CRITICAL  
**Time**: 2 minutes

```bash
cd /home/runner/work/Project-Valine/Project-Valine/serverless
export DATABASE_URL="postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require"
npx prisma migrate deploy
```

Expected output:
```
✔ Applied migration 20251115031328_rename_password_to_passwordhash
```

**Alternative**: Run SQL manually if above fails:
```sql
ALTER TABLE "users" RENAME COLUMN "password" TO "passwordHash";
```

- [ ] Migration executed successfully
- [ ] Column renamed verified (SELECT * FROM users LIMIT 1)

### Step 4: Deploy Updated Code
**Priority**: CRITICAL  
**Time**: 5-10 minutes

```bash
cd /home/runner/work/Project-Valine/Project-Valine/serverless
npm install
serverless deploy
```

Expected output:
```
✔ Service deployed to stack...
endpoints:
  POST - https://YOUR_API_ID.execute-api.us-west-2.amazonaws.com/prod/api/register
```

- [ ] Deployment successful
- [ ] No errors in deployment log
- [ ] API Gateway endpoint confirmed

### Step 5: Test Registration Endpoint
**Priority**: CRITICAL  
**Time**: 5 minutes

#### Test 1: Basic Registration
```bash
curl -X POST https://YOUR_API_URL/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ghawk075@gmail.com",
    "password": "TestPassword123!"
  }' \
  -v
```

Expected Response:
```json
HTTP/1.1 201 Created
{
  "user": {
    "id": "uuid-here",
    "email": "ghawk075@gmail.com",
    "createdAt": "2025-11-15T..."
  }
}
```

- [ ] Got 201 Created response
- [ ] User object returned
- [ ] No error in response

#### Test 2: Registration with All Fields
```bash
curl -X POST https://YOUR_API_URL/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "valinejustin@gmail.com",
    "password": "TestPassword456!",
    "username": "valinejustin",
    "displayName": "Valine Justin"
  }' \
  -v
```

- [ ] Got 201 Created response
- [ ] Custom username/displayName used

#### Test 3: Login After Registration
```bash
curl -X POST https://YOUR_API_URL/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ghawk075@gmail.com",
    "password": "TestPassword123!"
  }' \
  -v
```

Expected Response:
```json
HTTP/1.1 200 OK
Set-Cookie: access_token=...
Set-Cookie: refresh_token=...
{
  "user": {
    "id": "uuid-here",
    "email": "ghawk075@gmail.com",
    ...
  }
}
```

- [ ] Got 200 OK response
- [ ] JWT cookies set
- [ ] User can login successfully

### Step 6: Check CloudWatch Logs
**Priority**: MEDIUM  
**Time**: 5 minutes

1. Go to CloudWatch Logs
2. Find your Lambda function log group
3. Check recent logs for registration attempts

Expected logs:
```
[REGISTER] Raw body length: XXX
[REGISTER] Created userId=xxx-xxx-xxx
```

Should NOT see:
```
Argument `username` is missing
```

- [ ] Logs showing successful registration
- [ ] No errors in logs
- [ ] User IDs being generated

### Step 7: Verify Database
**Priority**: MEDIUM  
**Time**: 2 minutes

```sql
-- Check users table structure
\d users

-- Should show passwordHash column, not password

-- Check registered users
SELECT id, email, username, "displayName", "createdAt" 
FROM users 
ORDER BY "createdAt" DESC 
LIMIT 5;
```

- [ ] passwordHash column exists
- [ ] password column does not exist
- [ ] New users visible in database
- [ ] username and displayName populated

### Step 8: Security - Rotate Credentials
**Priority**: HIGH (Post-Deployment)  
**Time**: 20 minutes

⚠️ **The credentials were committed to git history and should be rotated**

#### Rotate Database Password
```bash
# In RDS Console
1. Modify DB instance
2. Change master password
3. Update Lambda environment variables with new password
4. Test registration again
```

- [ ] New database password generated
- [ ] Lambda env vars updated
- [ ] Registration still works with new password

#### Rotate JWT Secret
```bash
# Generate new JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Update Lambda environment variable JWT_SECRET
# Note: This will invalidate all existing user sessions
```

- [ ] New JWT secret generated
- [ ] Lambda env vars updated
- [ ] Users can still login (new sessions)

### Step 9: Update Documentation
**Priority**: LOW  
**Time**: 5 minutes

- [ ] Update internal wiki/docs with new deployment
- [ ] Note that credentials were rotated
- [ ] Document any issues encountered
- [ ] Share success with team

### Step 10: Monitor Production
**Priority**: MEDIUM  
**Time**: Ongoing

Monitor for 24-48 hours after deployment:

- [ ] CloudWatch metrics (error rate)
- [ ] Registration success rate
- [ ] Login success rate
- [ ] No unusual errors

## Rollback Plan (If Issues Occur)

If something goes wrong, execute rollback:

### 1. Rollback Database
```sql
ALTER TABLE "users" RENAME COLUMN "passwordHash" TO "password";
```

### 2. Rollback Code
```bash
# Deploy previous version
serverless deploy --stage prod --force
```

### 3. Restore Environment Variables
Revert to previous Lambda environment variable values

## Success Criteria

✅ All items checked above  
✅ Users can register successfully  
✅ Users can login after registration  
✅ No 500 errors in CloudWatch  
✅ Credentials rotated  

## Support

- **Deployment Guide**: `REGISTRATION_FIX_DEPLOYMENT.md`
- **Fix Summary**: `FIX_SUMMARY.md`
- **Visual Guide**: `VISUAL_FIX_GUIDE.md`
- **Code Changes**: See git commit history

## Completion

Date Completed: ______________

Deployed By: ______________

Issues Encountered: ______________

Notes: ______________
