# Project Valine AWS Deployment Guide

This comprehensive guide walks you through deploying Project Valine backend to AWS with step-by-step instructions, including database setup and endpoint testing.

## 🎯 Overview

**What you'll deploy:**
- PostgreSQL Database (Supabase recommended for dev)
- AWS Lambda Functions (Node.js 20.x runtime)
- AWS API Gateway (HTTP API)
- Infrastructure via Serverless Framework

**Estimated time:** 30-45 minutes for complete setup

---

## 📋 Prerequisites

Before starting, ensure you have:

- [x] **Node.js** 20.x or later (`node --version`)
- [x] **npm** 9.x or later (`npm --version`)
- [x] **AWS CLI** installed and configured (`aws --version`)
- [x] **AWS Account** with appropriate permissions
- [x] **Git** for repository access
- [x] **curl** for API testing

### AWS Permissions Required

Your IAM user/role needs these permissions:
- Lambda: Create, Update, Invoke functions
- API Gateway: Create and manage HTTP APIs
- CloudWatch: Create log groups and streams
- IAM: Create roles for Lambda execution
- SSM: Put/Get parameters (for DATABASE_URL storage)

---

## Step 1: Choose and Setup Database

### Option A: Supabase (RECOMMENDED for Development)

**Why Supabase?**
- Free tier: 500MB database, 2GB bandwidth
- Built-in connection pooling (pgBouncer)
- SSL enabled by default
- Perfect for serverless Lambda
- No credit card required

**Setup Instructions:**

1. **Create Supabase Account:**
   ```
   Go to: https://supabase.com
   Click "Start your project"
   Sign up with GitHub (recommended)
   ```

2. **Create New Project:**
   ```
   - Organization: Create new or select existing
   - Project Name: project-valine-dev
   - Database Password: Generate strong password (save this!)
   - Region: Choose closest to your users (e.g., us-west-2)
   - Pricing Plan: Free
   - Click "Create new project"
   ```

3. **Get Connection String:**
   ```
   After project is created (~2 minutes):
   - Go to Project Settings → Database
   - Find "Connection string" section
   - Select "URI" tab
   - Copy the connection string (uses connection pooler)
   - Format: postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-west-2.pooler.supabase.com:6543/postgres
   ```

4. **Export DATABASE_URL:**
   ```bash
   # Replace [YOUR-PASSWORD] with your actual password
   export DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-west-2.pooler.supabase.com:6543/postgres"
   
   # Verify it's set
   echo $DATABASE_URL
   ```

5. **Test Connection:**
   ```bash
   # Install psql if needed: sudo apt-get install postgresql-client
   psql "$DATABASE_URL" -c "SELECT version();"
   ```

### Option B: AWS RDS (For Production/Advanced Users)

**Cost:** ~$15-20/month minimum

**Setup Instructions:**

1. **Create RDS Instance:**
   ```bash
   aws rds create-db-instance \
     --db-instance-identifier valine-dev-db \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --engine-version 15.4 \
     --master-username valineadmin \
     --master-user-password 'YourStrongPassword123!' \
     --allocated-storage 20 \
     --publicly-accessible \
     --region us-west-2
   
   # Wait for instance to be available (5-10 minutes)
   aws rds wait db-instance-available \
     --db-instance-identifier valine-dev-db \
     --region us-west-2
   ```

2. **Get Endpoint:**
   ```bash
   aws rds describe-db-instances \
     --db-instance-identifier valine-dev-db \
     --query 'DBInstances[0].Endpoint.Address' \
     --output text \
     --region us-west-2
   ```

3. **Export DATABASE_URL:**
   ```bash
   export DATABASE_URL="postgresql://valineadmin:YourStrongPassword123!@YOUR-RDS-ENDPOINT.us-west-2.rds.amazonaws.com:5432/postgres"
   ```

4. **Update Security Group:**
   ```bash
   # Allow your IP to connect for initial setup
   RDS_SG=$(aws rds describe-db-instances \
     --db-instance-identifier valine-dev-db \
     --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' \
     --output text \
     --region us-west-2)
   
   MY_IP=$(curl -s https://checkip.amazonaws.com)
   
   aws ec2 authorize-security-group-ingress \
     --group-id $RDS_SG \
     --protocol tcp \
     --port 5432 \
     --cidr $MY_IP/32 \
     --region us-west-2
   ```

---

## Step 2: Store DATABASE_URL in AWS SSM Parameter Store

AWS Systems Manager Parameter Store securely stores your database credentials.

### Create SSM Parameters

1. **Create parameters JSON file:**
   ```bash
   cd /home/runner/work/Project-Valine/Project-Valine
   
   # Copy example and edit
   cp scripts/ssm-params.example.json scripts/ssm-params-dev.json
   ```

2. **Edit parameters file:**
   ```bash
   # Edit scripts/ssm-params-dev.json
   nano scripts/ssm-params-dev.json
   ```
   
   Update with your values:
   ```json
   {
     "database_url": "postgresql://postgres.[YOUR-REF]:[PASSWORD]@aws-0-us-west-2.pooler.supabase.com:6543/postgres",
     "jwt_secret": "your-random-jwt-secret-min-32-chars",
     "bucket_name": "valine-uploads-dev",
     "allowed_origins": "http://localhost:5173,https://your-domain.com"
   }
   ```

3. **Store parameters in AWS SSM:**
   ```bash
   ./scripts/put-ssm-params.sh dev us-west-2 scripts/ssm-params-dev.json
   ```

4. **Verify parameters were stored:**
   ```bash
   aws ssm get-parameter \
     --name "/valine/dev/database_url" \
     --with-decryption \
     --region us-west-2 \
     --query 'Parameter.Value' \
     --output text
   ```

### Alternative: Use Environment Variable Only

If you prefer not to use SSM Parameter Store for now:

```bash
# Just keep DATABASE_URL in your environment
export DATABASE_URL="your-connection-string"

# Make sure it persists for your shell session
echo "export DATABASE_URL='your-connection-string'" >> ~/.bashrc
source ~/.bashrc
```

---

## Step 3: Setup Database Schema

Run the database setup script to create tables and apply migrations:

```bash
cd /home/runner/work/Project-Valine/Project-Valine

# Ensure DATABASE_URL is set
echo $DATABASE_URL

# Run setup script
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

🚀 Running database migrations...
✓ Migrations completed

🔍 Verifying database schema...
✓ Database setup complete!

Expected tables created:
  - users
  - posts
  - connection_requests
  - scripts
  - auditions

✅ Database is ready!
```

### Verify Database Setup

Open Prisma Studio to inspect your database:

```bash
cd api
npx prisma studio
```

Visit http://localhost:5555 and verify these tables exist:
- ✅ users
- ✅ posts
- ✅ connection_requests
- ✅ scripts
- ✅ auditions

---

## Step 4: Deploy Backend to AWS

### Configure AWS Credentials

```bash
# If not already configured
aws configure

# Verify credentials
aws sts get-caller-identity
```

### Deploy Serverless Backend

```bash
cd /home/runner/work/Project-Valine/Project-Valine

# Ensure DATABASE_URL is set
echo $DATABASE_URL

# Deploy to dev stage in us-west-2
./scripts/deployment/deploy-backend.sh --stage dev --region us-west-2
```

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

[Serverless output...]

✅ Backend deployed successfully!

endpoints:
  POST - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/users
  GET - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/users/{username}
  PUT - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/users/{id}
  POST - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/posts
  GET - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/posts
  POST - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/connections/request
  GET - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/connections/requests
  POST - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/connections/requests/{id}/approve
  POST - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/connections/requests/{id}/reject
```

### Save Your API Base URL

```bash
# Extract base URL from deployment output
export API_BASE="https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev"

# Save for future sessions
echo "export API_BASE='$API_BASE'" >> ~/.bashrc
source ~/.bashrc
```

---

## Step 5: Test All Endpoints

### Automated Testing Script

```bash
# Ensure API_BASE is set
echo $API_BASE

# Run comprehensive test suite
./scripts/deployment/test-endpoints.sh
```

### Manual Testing with curl

#### Test 1: Health Check

```bash
curl -X GET "$API_BASE/health" | jq '.'
```

**Expected Response:**
```json
{
  "ok": true,
  "status": "healthy"
}
```

#### Test 2: Create User

```bash
curl -X POST "$API_BASE/users" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@valine.com",
    "displayName": "John Doe",
    "bio": "Voice actor and content creator",
    "avatar": "https://i.pravatar.cc/150?img=12",
    "role": "artist"
  }' | jq '.'
```

**Expected Response (201 Created):**
```json
{
  "id": "uuid-here",
  "username": "johndoe",
  "email": "john@valine.com",
  "displayName": "John Doe",
  "bio": "Voice actor and content creator",
  "avatar": "https://i.pravatar.cc/150?img=12",
  "role": "artist",
  "createdAt": "2025-10-30T00:00:00.000Z",
  "updatedAt": "2025-10-30T00:00:00.000Z"
}
```

**Save the user ID:**
```bash
USER_ID="uuid-from-response"
```

#### Test 3: Get User Profile

```bash
curl -X GET "$API_BASE/users/johndoe" | jq '.'
```

**Expected Response (200 OK):**
```json
{
  "id": "uuid-here",
  "username": "johndoe",
  "email": "john@valine.com",
  "displayName": "John Doe",
  "bio": "Voice actor and content creator",
  "avatar": "https://i.pravatar.cc/150?img=12",
  "role": "artist",
  "posts": [],
  "_count": {
    "posts": 0
  },
  "createdAt": "2025-10-30T00:00:00.000Z",
  "updatedAt": "2025-10-30T00:00:00.000Z"
}
```

#### Test 4: Update User Profile

```bash
curl -X PUT "$API_BASE/users/$USER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "John \"The Voice\" Doe",
    "bio": "Professional voice actor with 10+ years experience",
    "avatar": "https://i.pravatar.cc/150?img=13"
  }' | jq '.'
```

**Expected Response (200 OK):**
```json
{
  "id": "uuid-here",
  "username": "johndoe",
  "email": "john@valine.com",
  "displayName": "John \"The Voice\" Doe",
  "bio": "Professional voice actor with 10+ years experience",
  "avatar": "https://i.pravatar.cc/150?img=13",
  ...
}
```

#### Test 5: Create Post

```bash
curl -X POST "$API_BASE/posts" \
  -H "Content-Type: application/json" \
  -d "{
    \"content\": \"Just finished recording for an amazing new project! Can't wait to share more details soon. #VoiceActing #ProjectValine\",
    \"media\": [\"https://picsum.photos/seed/post1/800/600\"],
    \"authorId\": \"$USER_ID\"
  }" | jq '.'
```

**Expected Response (201 Created):**
```json
{
  "id": "post-uuid",
  "content": "Just finished recording for an amazing new project!...",
  "media": ["https://picsum.photos/seed/post1/800/600"],
  "authorId": "user-uuid",
  "createdAt": "2025-10-30T00:00:00.000Z"
}
```

**Save the post ID:**
```bash
POST_ID="post-uuid-from-response"
```

#### Test 6: List Posts (Feed)

```bash
curl -X GET "$API_BASE/posts?limit=10" | jq '.'
```

**Expected Response (200 OK):**
```json
{
  "items": [
    {
      "id": "post-uuid",
      "content": "Just finished recording...",
      "media": ["https://picsum.photos/seed/post1/800/600"],
      "authorId": "user-uuid",
      "author": {
        "id": "user-uuid",
        "username": "johndoe",
        "displayName": "John \"The Voice\" Doe",
        "avatar": "https://i.pravatar.cc/150?img=13"
      },
      "createdAt": "2025-10-30T00:00:00.000Z"
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

#### Test 7: Create Second User (for Connection Requests)

```bash
curl -X POST "$API_BASE/users" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "janedoe",
    "email": "jane@valine.com",
    "displayName": "Jane Doe",
    "bio": "Audio engineer and producer",
    "avatar": "https://i.pravatar.cc/150?img=5",
    "role": "observer"
  }' | jq '.'
```

**Save the second user ID:**
```bash
USER2_ID="uuid-from-response"
```

#### Test 8: Send Connection Request

```bash
curl -X POST "$API_BASE/connections/request" \
  -H "Content-Type: application/json" \
  -d "{
    \"senderId\": \"$USER_ID\",
    \"receiverId\": \"$USER2_ID\",
    \"message\": \"Hey! I saw your work and would love to collaborate on a project.\"
  }" | jq '.'
```

**Expected Response (201 Created):**
```json
{
  "id": "request-uuid",
  "senderId": "user1-uuid",
  "receiverId": "user2-uuid",
  "status": "pending",
  "message": "Hey! I saw your work...",
  "createdAt": "2025-10-30T00:00:00.000Z"
}
```

**Save the request ID:**
```bash
REQUEST_ID="request-uuid-from-response"
```

#### Test 9: List Connection Requests (Received)

```bash
curl -X GET "$API_BASE/connections/requests?userId=$USER2_ID&type=received" | jq '.'
```

**Expected Response (200 OK):**
```json
{
  "requests": [
    {
      "id": "request-uuid",
      "senderId": "user1-uuid",
      "sender": {
        "id": "user1-uuid",
        "username": "johndoe",
        "displayName": "John \"The Voice\" Doe",
        "avatar": "https://i.pravatar.cc/150?img=13"
      },
      "receiverId": "user2-uuid",
      "status": "pending",
      "message": "Hey! I saw your work...",
      "createdAt": "2025-10-30T00:00:00.000Z"
    }
  ]
}
```

#### Test 10: List Connection Requests (Sent)

```bash
curl -X GET "$API_BASE/connections/requests?userId=$USER_ID&type=sent" | jq '.'
```

#### Test 11: Approve Connection Request

```bash
curl -X POST "$API_BASE/connections/requests/$REQUEST_ID/approve" \
  -H "Content-Type: application/json" | jq '.'
```

**Expected Response (200 OK):**
```json
{
  "id": "request-uuid",
  "senderId": "user1-uuid",
  "receiverId": "user2-uuid",
  "status": "accepted",
  "message": "Hey! I saw your work...",
  "createdAt": "2025-10-30T00:00:00.000Z"
}
```

#### Test 12: Create and Reject Another Request

```bash
# Send another request
curl -X POST "$API_BASE/connections/request" \
  -H "Content-Type: application/json" \
  -d "{
    \"senderId\": \"$USER2_ID\",
    \"receiverId\": \"$USER_ID\",
    \"message\": \"Thanks for connecting! Let's work together.\"
  }" | jq '.'

# Get the new request ID from response
REQUEST_ID_2="new-request-uuid"

# Reject it
curl -X POST "$API_BASE/connections/requests/$REQUEST_ID_2/reject" \
  -H "Content-Type: application/json" | jq '.'
```

**Expected Response (200 OK):**
```json
{
  "id": "new-request-uuid",
  "status": "rejected",
  ...
}
```

---

## Step 6: View Logs and Monitor

### View Lambda Function Logs

```bash
cd /home/runner/work/Project-Valine/Project-Valine/serverless

# View logs for specific function
npx serverless logs -f getUser --stage dev --region us-west-2 --tail

# View logs for all functions
npx serverless logs -f createUser --stage dev --tail
npx serverless logs -f createPost --stage dev --tail
npx serverless logs -f sendConnectionRequest --stage dev --tail
```

### Check API Gateway Metrics

```bash
# Get API ID
API_ID=$(aws apigatewayv2 get-apis \
  --query "Items[?Name=='pv-api-dev'].ApiId" \
  --output text \
  --region us-west-2)

# View recent metrics
echo "API Gateway ID: $API_ID"
echo "View metrics: https://console.aws.amazon.com/apigateway/home?region=us-west-2#/apis/$API_ID/metrics"
```

---

## Step 7: Configure Frontend (Optional)

If you want to test with the frontend:

```bash
cd /home/runner/work/Project-Valine/Project-Valine

# Configure frontend with API URL
./scripts/deployment/configure-frontend.sh --api-url "$API_BASE"

# Install dependencies and run
npm install
npm run dev
```

Visit http://localhost:5173 to test the full application.

---

## 📊 Cost Estimates

### Supabase Free Tier (Development)
- Database: **$0/month**
- 500MB storage
- 2GB bandwidth
- Perfect for development and testing

### AWS Lambda + API Gateway (Development)
- Lambda: **~$0.20** per million requests
- API Gateway: **~$1.00** per million requests
- With light testing: **<$1/month**

### Total Development Cost
- **$0-5/month** with Supabase free tier and AWS Lambda

### Production Costs (estimated)
- Supabase Pro: **$25/month** (8GB database, 250GB bandwidth)
- Lambda + API Gateway (10K requests/day): **~$10-15/month**
- **Total: ~$40/month** for production-ready setup

---

## 🔧 Troubleshooting

### Issue: Database connection timeout

**Solution:**
```bash
# Test database connectivity
psql "$DATABASE_URL" -c "SELECT 1;"

# For Supabase, ensure you're using the pooler URL (port 6543)
# Format: postgresql://postgres.[REF]:[PASS]@aws-0-region.pooler.supabase.com:6543/postgres
```

### Issue: Lambda function timeout

**Solution:**
Edit `serverless/serverless.yml`:
```yaml
provider:
  timeout: 30  # Increase from default 6 seconds
```

### Issue: CORS errors in frontend

**Solution:**
Verify headers in all handlers include:
```javascript
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
}
```

### Issue: "Module not found: @prisma/client"

**Solution:**
```bash
cd api
npx prisma generate
cd ../serverless
npm install
```

### Issue: Deployment fails with AWS credentials error

**Solution:**
```bash
# Reconfigure AWS CLI
aws configure

# Verify credentials
aws sts get-caller-identity

# Check IAM permissions include Lambda, API Gateway, CloudWatch, IAM
```

---

## 🎉 Success Checklist

After following this guide, you should have:

- [x] PostgreSQL database setup (Supabase or RDS)
- [x] DATABASE_URL configured and tested
- [x] Database schema migrated (5 tables created)
- [x] Serverless backend deployed to AWS Lambda
- [x] API Gateway endpoints accessible
- [x] All endpoints tested with curl
- [x] Users can be created and retrieved
- [x] Posts can be created and listed
- [x] Connection requests working end-to-end
- [x] Logs accessible via CloudWatch

---

## 🚀 Next Steps

1. **Add Authentication:** Implement JWT token validation
2. **Set up CI/CD:** Automate deployments with GitHub Actions
3. **Add Monitoring:** Set up CloudWatch dashboards and alarms
4. **Implement Rate Limiting:** Protect API from abuse
5. **Add Caching:** Use API Gateway caching or Redis
6. **Deploy Frontend:** Deploy React app to S3 + CloudFront
7. **Set up Custom Domain:** Add Route 53 DNS and SSL certificates
8. **Add More Features:** Comments, likes, search, notifications

---

## 📚 Additional Resources

- [DEPLOYMENT.md](overview.md) - Original deployment documentation
- [API_REFERENCE.md](../api/reference.md) - API endpoint documentation
- [Serverless Framework Docs](https://www.serverless.com/framework/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)

---

**Last Updated:** October 30, 2025  
**Repository:** https://github.com/gcolon75/Project-Valine
