# AWS Deployment Quick Start

Fast-track guide to deploy Project Valine backend to AWS in 30 minutes.

## TL;DR

```powershell
# 1. Setup database (Supabase recommended)
$env:DATABASE_URL = "postgresql://postgres.[REF]:[PASS]@aws-0-us-west-2.pooler.supabase.com:6543/postgres"

# 2. Run database migrations
./scripts/deployment/setup-database.sh

# 3. Deploy to AWS
./scripts/deployment/deploy-backend.sh --stage dev --region us-west-2

# 4. Test endpoints
$env:API_BASE = "https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev"
./scripts/deployment/test-endpoints.sh
```

---

## Prerequisites Checklist

- [ ] Node.js 20.x or later installed
- [ ] AWS CLI installed and configured (`aws configure`)
- [ ] AWS account with Lambda/API Gateway permissions
- [ ] Database chosen (see recommendation below)

**Check prerequisites:**
```powershell
node --version   # Should be v20.x or later
aws --version    # Should show version
aws sts get-caller-identity  # Should show your AWS account
```

---

## Step 1: Choose Database (2 minutes)

### Recommended: Supabase Free Tier

**Why?** Free, instant setup, perfect for serverless Lambda functions.

1. Go to https://supabase.com
2. Sign up (use GitHub)
3. Create new project
   - Name: `project-valine-dev`
   - Password: Generate strong password
   - Region: `us-west-2`
   - Plan: Free
4. Wait ~2 minutes for project creation
5. Get connection string:
   - Settings → Database → Connection string
   - Choose "URI" tab
   - Copy the **pooler** connection string (port 6543)

**Connection string format:**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-west-2.pooler.supabase.com:6543/postgres
```

**Export to environment:**
```powershell
$env:DATABASE_URL = "your-connection-string-here"

# Verify
echo $DATABASE_URL
```

**Alternative:** See [DATABASE_PROVIDER_COMPARISON.md](./DATABASE_PROVIDER_COMPARISON.md) for RDS setup.

---

## Step 2: Setup Database Schema (5 minutes)

```powershell
cd /home/runner/work/Project-Valine/Project-Valine

# Ensure DATABASE_URL is set
echo $DATABASE_URL

# Run setup script
./scripts/deployment/setup-database.sh
```

**Expected output:**
```
✓ DATABASE_URL is set
✓ Dependencies installed
✓ Prisma Client generated
✓ Migrations completed
✓ Database setup complete!

Expected tables created:
  - users
  - posts
  - connection_requests
  - scripts
  - auditions
```

**Verify database:**
```powershell
cd api
npx prisma studio
# Opens http://localhost:5555 - check that 5 tables exist
```

---

## Step 3: Deploy Backend to AWS (10 minutes)

```powershell
cd /home/runner/work/Project-Valine/Project-Valine

# Ensure DATABASE_URL is still set
echo $DATABASE_URL

# Deploy to AWS
./scripts/deployment/deploy-backend.sh --stage dev --region us-west-2
```

**What happens:**
1. Installs dependencies
2. Generates Prisma Client
3. Packages Lambda functions
4. Creates API Gateway
5. Deploys to AWS

**Expected output:**
```
✅ Backend deployed successfully!

endpoints:
  POST - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/users
  GET  - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/users/{username}
  POST - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/posts
  GET  - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/posts
  ...
```

**Save your API URL:**
```powershell
# Copy the base URL from output above
$env:API_BASE = "https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev"

# Save for future sessions
echo "export API_BASE='$API_BASE'" >> ~/.bashrc
```

---

## Step 4: Test Endpoints (5 minutes)

### Automated Testing

```powershell
# Ensure API_BASE is set
echo $API_BASE

# Run test suite
./scripts/deployment/test-endpoints.sh
```

**Expected output:**
```
✓ Health check passed
✓ User created successfully
✓ Profile retrieved successfully
✓ Post created successfully
✓ Posts retrieved successfully
✅ API testing complete!
```

### Quick Manual Test

```powershell
# Test health endpoint
Invoke-RestMethod -Uri "$API_BASE/health" -Method Get
# Should return: {"ok":true,"status":"healthy"}

# Create a test user
Invoke-RestMethod -Uri "-X" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{ "username": "testuser", "email": "test@valine.com", "displayName": "Test User", "role": "artist" }' -ContentType 'application/json'```

---

## Step 5: Optional - Configure Frontend (5 minutes)

```powershell
cd /home/runner/work/Project-Valine/Project-Valine

# Configure frontend
./scripts/deployment/configure-frontend.sh --api-url "$API_BASE"

# Run frontend
npm install
npm run dev
```

Visit http://localhost:5173 to test the full application.

---

## Verification Checklist

After deployment, verify:

- [ ] Database has 5 tables (users, posts, connection_requests, scripts, auditions)
- [ ] API Gateway URL is accessible
- [ ] Health endpoint returns 200 OK
- [ ] Can create users via POST /users
- [ ] Can retrieve users via GET /users/{username}
- [ ] Can create posts via POST /posts
- [ ] Can list posts via GET /posts
- [ ] Can send connection requests
- [ ] Lambda logs visible in CloudWatch

---

## Troubleshooting

### Issue: "DATABASE_URL not set"

```powershell
# Set the environment variable
$env:DATABASE_URL = "your-connection-string"

# Make it persist
echo "export DATABASE_URL='your-connection-string'" >> ~/.bashrc
source ~/.bashrc
```

### Issue: "Cannot connect to database"

```powershell
# Test database connection
psql "$DATABASE_URL" -c "SELECT 1;"

# For Supabase, ensure you're using pooler URL (port 6543)
# Correct: ...pooler.supabase.com:6543/postgres
# Wrong:   ...supabase.co:5432/postgres
```

### Issue: AWS deployment fails

```powershell
# Check AWS credentials
aws sts get-caller-identity

# If not configured
aws configure
# Enter: Access Key ID, Secret Access Key, Region (us-west-2)
```

### Issue: API returns 500 errors

```powershell
# View Lambda logs
cd serverless
npx serverless logs -f getUser --stage dev --tail

# Check for error messages
```

### Issue: CORS errors in browser

Check that all handlers return proper headers:
```javascript
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
}
```

---

## Cost Estimate

**Development Setup:**
- Supabase Free Tier: $0/month
- AWS Lambda: ~$0.20/million requests
- API Gateway: ~$1.00/million requests
- With light testing: **<$1/month total**

**Production Estimate:**
- Supabase Pro: $25/month
- AWS Lambda + API Gateway: ~$10-15/month (moderate traffic)
- **Total: ~$40/month**

---

## Next Steps

1. **Secure the API** - Add JWT authentication
2. **Monitor** - Set up CloudWatch alarms
3. **CI/CD** - Automate deployments with GitHub Actions
4. **Custom Domain** - Add Route 53 DNS and SSL
5. **Rate Limiting** - Protect against abuse
6. **Caching** - Add API Gateway caching

---

## Useful Commands

```powershell
# View deployment info
cd serverless
npx serverless info --stage dev

# View logs
npx serverless logs -f getUser --stage dev --tail

# Remove deployment (cleanup)
npx serverless remove --stage dev

# Redeploy after code changes
./scripts/deployment/deploy-backend.sh --stage dev --region us-west-2

# Database management
cd api
npx prisma studio           # Open database GUI
npx prisma migrate dev      # Create new migration
npx prisma db push          # Quick schema sync (dev only)
```

---

## Full Documentation

For detailed information, see:
- [DEPLOYMENT_GUIDE_AWS.md](deployment/aws-guide.md) - Complete deployment guide with all curl examples
- [DATABASE_PROVIDER_COMPARISON.md](./DATABASE_PROVIDER_COMPARISON.md) - Database provider comparison
- [DEPLOYMENT.md](deployment/overview.md) - Original deployment documentation
- [API_REFERENCE.md](api/reference.md) - API endpoint reference

---

## Support

Having issues? Check:
1. [Troubleshooting section](#troubleshooting) above
2. [Full deployment guide](deployment/aws-guide.md)
3. [GitHub Issues](https://github.com/gcolon75/Project-Valine/issues)

---

**Deployment Time:** 30-45 minutes from start to finish  
**Last Updated:** October 30, 2025
