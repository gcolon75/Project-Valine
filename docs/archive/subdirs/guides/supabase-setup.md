# Phase 1.2: Deploy Project Valine Backend to AWS

**Goal:** Get backend live on AWS with working API in 30-45 minutes.

This guide walks you through setting up Supabase database, running migrations, deploying to AWS, and testing all endpoints.

---

## Prerequisites

Before starting, ensure you have:

- [ ] Node.js 20.x or later installed (`node --version`)
- [ ] AWS CLI configured with credentials (`aws sts get-caller-identity`)
- [ ] Git repository cloned locally
- [ ] Terminal/command line access

---

## Task 1: Supabase Database Setup

### Step 1.1: Create Supabase Account

1. **Go to [supabase.com](https://supabase.com)**
2. **Sign up:**
   - **Recommended:** Use GitHub login (faster, integrates well with development)
   - Alternative: Use email signup
3. **Verify your email** (if using email signup)

✅ **Checkpoint:** You should see the Supabase dashboard

---

### Step 1.2: Create Project

1. **Click "New Project"** from the dashboard
2. **Fill in project details:**
   - **Name:** `project-valine-dev`
   - **Database Password:** Click "Generate a password" and save it securely
   - **Region:** 
     - **West Coast US:** `us-west-1` (N. California)
     - **East Coast US:** `us-east-1` (N. Virginia)
     - **Tip:** Choose the region closest to you for better performance
   - **Plan:** Free tier (perfect for development)
3. **Click "Create new project"**
4. **Wait 2-3 minutes** for the project to provision

✅ **Checkpoint:** Project status shows "Active" with a green indicator

---

### Step 1.3: Get Connection String

1. **Navigate to Project Settings:**
   - Click the ⚙️ (Settings) icon in the left sidebar
   - Select **"Database"** from the settings menu

2. **Find Connection String Section:**
   - Scroll down to "Connection string"
   - You'll see multiple tabs (URI, JDBC, etc.)

3. **⚠️ CRITICAL: Select the "URI" tab**

4. **⚠️ CRITICAL: Use Transaction Pooler (Port 6543)**
   - Look for "Connection pooling"
   - Select **"Transaction"** mode
   - The URL should use port **6543**, not 5432
   - Format: `postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`

5. **Copy the Connection String:**
   - Replace `[YOUR-PASSWORD]` with the password you saved in Step 1.2
   - The final string should look like:
     ```
     postgresql://postgres.abcdefghijklmnop:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
     ```

---

### Step 1.4: Save and Test Connection

1. **Save Connection String as Environment Variable:**
   ```powershell
$env:DATABASE_URL = "postgresql://postgres.[REF]:[PASS]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
   ```
   
   **Replace with your actual connection string!**

2. **Verify it's set:**
   ```powershell
   echo $DATABASE_URL
   ```
   
   **Expected:** Should display your full connection string

3. **Test Connection:**
   ```powershell
   psql "$DATABASE_URL" -c "SELECT version();"
   ```
   
   **Expected Output:**
   ```
   PostgreSQL 15.x.x on x86_64-pc-linux-gnu...
   ```

4. **If you don't have `psql` installed:**
   ```powershell
   # macOS
   brew install postgresql
   
   # Ubuntu/Debian
   sudo apt-get install postgresql-client
   
   # Windows (use WSL or download from postgresql.org)
   ```

✅ **Checkpoint:** Database connection successful, PostgreSQL version displayed

**Common Issues:**
- ❌ Connection refused → Check you're using port **6543** (pooler), not 5432
- ❌ Authentication failed → Double-check password is correct
- ❌ Timeout → Verify your IP isn't blocked (Supabase allows all IPs by default)

---

## Task 2: Run Database Migrations

Now that the database is working, let's set up the schema.

### Step 2.1: Navigate to Project Directory

```powershell
cd ~/Project-Valine  # Or wherever you cloned the repo
```

### Step 2.2: Ensure DATABASE_URL is Set

```powershell
# If you closed your terminal, set it again
$env:DATABASE_URL = "postgresql://postgres.[REF]:[PASS]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

# Verify
echo $DATABASE_URL
```

### Step 2.3: Run Database Setup Script

```powershell
./scripts/deployment/setup-database.sh
```

**Expected Output:**
```
🗄️  Project Valine - Database Setup
====================================

✓ DATABASE_URL is set

📦 Installing dependencies...
✓ Dependencies installed

🔧 Generating Prisma Client...
✓ Prisma Client generated

🚀 Setting up database schema...
Syncing schema to database...
✓ Database schema synced

🔍 Verifying database schema...
✓ Database setup complete!

Expected tables created:
  - users
  - posts
  - connection_requests
  - scripts
  - auditions

✅ Database is ready!

Next steps:
  1. Run 'npx prisma studio' to inspect your database
  2. Deploy the backend with './scripts/deployment/deploy-backend.sh'
```

### Step 2.4: Verify Tables Exist

**Option 1: Using Prisma Studio (Visual)**
```powershell
cd api
npx prisma studio
```
- Opens browser at `http://localhost:5555`
- Should see 5 tables: `users`, `posts`, `connection_requests`, `scripts`, `auditions`
- Press Ctrl+C to stop when done

**Option 2: Using psql (Command Line)**
```powershell
psql "$DATABASE_URL" -c "\dt"
```

**Expected Output:**
```
              List of relations
 Schema |         Name          | Type  |  Owner  
--------+-----------------------+-------+---------
 public | auditions             | table | postgres
 public | connection_requests   | table | postgres
 public | posts                 | table | postgres
 public | scripts               | table | postgres
 public | users                 | table | postgres
```

✅ **Checkpoint:** All 5 tables exist in database

**Common Issues:**
- ❌ Dependencies failed to install → Run `npm install` in `/api` manually
- ❌ Prisma generate failed → Check Node.js version is 20.x+
- ❌ Schema sync failed → Check DATABASE_URL is correct and database is accessible

---

## Task 3: Deploy Backend to AWS

Now let's deploy the Lambda functions and API Gateway.

### Step 3.1: Verify AWS Credentials

```powershell
aws sts get-caller-identity
```

**Expected Output:**
```json
{
    "UserId": "AIDAXXXXXXXXX",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/your-username"
}
```

**If this fails:**
- Configure AWS CLI: `aws configure`
- Provide your AWS Access Key ID and Secret Access Key
- Default region: `us-west-2`
- Default output format: `json`

### Step 3.2: Deploy to AWS

```powershell
# Make sure DATABASE_URL is still set
echo $DATABASE_URL

# If not set, set it again
$env:DATABASE_URL = "postgresql://postgres.[REF]:[PASS]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

# Deploy
./scripts/deployment/deploy-backend.sh --stage dev --region us-west-2
```

**This will take 3-5 minutes.** You'll see:

1. Installing dependencies...
2. Generating Prisma Client...
3. Deploying to AWS...
4. Creating CloudFormation stack...
5. Creating Lambda functions...
6. Creating API Gateway...

**Expected Output:**
```
🚀 Project Valine - Backend Deployment
======================================

Configuration:
  Stage:  dev
  Region: us-west-2

✓ DATABASE_URL is configured

📦 Installing dependencies...
✓ Dependencies installed

🔧 Generating Prisma Client for serverless...
✓ Prisma Client ready

☁️  Deploying to AWS...
   This may take a few minutes...

Service deployed to stack pv-api-dev (123s)

endpoints:
  GET  - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/health
  GET  - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/hello
  POST - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/users
  GET  - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/users/{username}
  PUT  - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/users/{id}
  POST - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/posts
  GET  - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/posts
  GET  - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/posts/{id}
  POST - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/connections/request
  GET  - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/connections/requests
  POST - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/connections/requests/{id}/approve
  POST - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/connections/requests/{id}/reject

functions:
  api: pv-api-dev-api (1.2 MB)
  createUser: pv-api-dev-createUser (1.2 MB)
  getUser: pv-api-dev-getUser (1.2 MB)
  ... (more functions)

✅ Backend deployed successfully!

📝 Save your API Gateway URL from the output above

Next steps:
  1. Test your endpoints with './scripts/deployment/test-endpoints.sh'
  2. Update frontend with './scripts/deployment/configure-frontend.sh'
```

### Step 3.3: Save API URL

```powershell
# Copy the base URL from the deployment output (everything before /health)
$env:API_BASE = "https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev"

# Verify
echo $API_BASE
```

**⚠️ Replace with YOUR actual API Gateway URL!**

✅ **Checkpoint:** Deployment successful, API Gateway URL obtained

**Common Issues:**
- ❌ AWS credentials not found → Run `aws configure`
- ❌ Insufficient permissions → Ensure your IAM user has Lambda, API Gateway, CloudFormation permissions
- ❌ CloudFormation stack failed → Check CloudWatch logs or run `npx serverless logs -f api --stage dev`
- ❌ Deployment timeout → Try again, AWS can be slow sometimes

---

## Task 4: Test All Endpoints

### Step 4.1: Quick Automated Test

```powershell
# Ensure API_BASE is set
echo $API_BASE

# Run tests
./scripts/deployment/test-endpoints.sh
```

**Expected Output:**
```
🧪 Project Valine - API Testing
===============================

✓ API_BASE: https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev

Test 1: Health Check
GET https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/health
✓ Health check passed
   Response: {"ok":true,"status":"healthy"}

Test 2: Create User
POST https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/users
✓ User created successfully
   User ID: 550e8400-e29b-41d4-a716-446655440000

Test 3: Get User Profile
GET https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/users/testuser
✓ Profile retrieved successfully
   Response: {"id":"550e8400-e29b-41d4-a716-446655440000","username":"testuser"...

Test 4: Create Post
POST https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/posts
✓ Post created successfully

Test 5: List Posts
GET https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/posts?limit=10
✓ Posts retrieved successfully
   Posts found: 1

======================================
✅ API testing complete!

Next steps:
  - Review the output above
  - Configure frontend with './scripts/deployment/configure-frontend.sh'
  - View logs: npx serverless logs -f getUser --stage dev --tail
```

### Step 4.2: Manual Tests (Optional)

If you want to test manually or the automated script had issues:

```powershell
# Set your API_BASE
$env:API_BASE = "https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev"

# Test 1: Health check
Invoke-RestMethod -Uri "$API_BASE/health" -Method Get
# Expected: {"ok":true,"status":"healthy"}

# Test 2: Create user
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Content-Type" = "application/json"
    "Content-Type" = "application/json"
} -Body '{ "username": "testuser", "email": "test@valine.com", "displayName": "Test User", "bio": "Voice actor", "role": "artist" }' -ContentType 'application/json'
```

✅ **Checkpoint:** All tests passing, all endpoints returning 200/201

**Common Issues:**
- ❌ 502 Bad Gateway → Lambda function error, check logs: `cd serverless && npx serverless logs -f getUser --stage dev --tail`
- ❌ 403 Forbidden → API Gateway configuration issue
- ❌ CORS errors → Headers should include `Access-Control-Allow-Origin: *`
- ❌ Database errors → Check Lambda has DATABASE_URL environment variable set

---

## Task 5: Troubleshooting (if needed)

### Database Connection Issues

**Verify DATABASE_URL format:**
```powershell
echo $DATABASE_URL
```

Must be: `postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres`

**Check port is 6543 (pooler), not 5432:**
```powershell
echo $DATABASE_URL | Select-String -o ":[0-9]*/" 
# Should show: :6543/
```

**Test connection:**
```powershell
psql "$DATABASE_URL" -c "SELECT 1;"
```

### AWS Deployment Issues

**Check AWS credentials:**
```powershell
aws sts get-caller-identity
```

**View CloudFormation stack:**
```powershell
aws cloudformation describe-stacks --stack-name pv-api-dev --region us-west-2
```

**View Lambda logs:**
```powershell
cd serverless
npx serverless logs -f createUser --stage dev --region us-west-2 --tail
```

### API Errors

**Check if Lambda has DATABASE_URL:**
```powershell
aws lambda get-function-configuration \
  --function-name pv-api-dev-createUser \
  --query 'Environment.Variables.DATABASE_URL' \
  --output text
```

**Test Lambda directly:**
```powershell
cd serverless
npx serverless invoke -f createUser --stage dev --data '{"body":"{\"username\":\"test2\",\"email\":\"test2@example.com\",\"displayName\":\"Test 2\"}"}'
```

**View all logs:**
```powershell
aws logs tail /aws/lambda/pv-api-dev-createUser --follow
```

### CORS Issues

**Test OPTIONS request:**
```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/api/endpoint" -Method Get -Headers @{
    "Origin" = "http://localhost:5173"
}
```

**Should see headers:**
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## Success Criteria Checklist

- [ ] Supabase database created and accessible
- [ ] 5 tables exist: `users`, `posts`, `connection_requests`, `scripts`, `auditions`
- [ ] Backend deployed to AWS Lambda
- [ ] API Gateway URL obtained and saved
- [ ] Health endpoint returns `{"ok":true,"status":"healthy"}`
- [ ] Can create users via API (POST /users returns 201)
- [ ] Can retrieve users via API (GET /users/{username} returns 200)
- [ ] Can create posts via API (POST /posts returns 201)
- [ ] Can list posts via API (GET /posts returns 200)
- [ ] All endpoints tested and working

---

## Next Steps

Once all tests pass, you're ready to:

1. **Configure Frontend:**
   ```powershell
   ./scripts/deployment/configure-frontend.sh --api-url "$API_BASE"
   ```

2. **Run Frontend Locally:**
   ```powershell
   npm run dev
   ```

3. **Test the Full Application:**
   - Open http://localhost:5173
   - Create an account
   - Make a post
   - Browse the feed

4. **Deploy Frontend to Production:**
   - Push changes to GitHub
   - GitHub Actions will deploy to AWS Amplify automatically

---

## Support

If you encounter issues:
1. Review the [Troubleshooting](#task-5-troubleshooting-if-needed) section
2. Check [scripts/deployment/README.md](scripts/deployment/README.md) for detailed script documentation
3. Review [DEPLOYMENT_GUIDE_AWS.md](../deployment/aws-guide.md) for comprehensive AWS setup
4. Check [GitHub Issues](https://github.com/gcolon75/Project-Valine/issues)

---

**Estimated Time:** 30-45 minutes

**Last Updated:** October 30, 2025
