# Backend Deployment Instructions - Project Valine

## 🎯 Overview

This document provides complete instructions to deploy the Project Valine serverless backend API to AWS and obtain the dev `API_BASE` URL for frontend integration.

## 📋 Prerequisites Checklist

Before deploying, ensure you have:

- [ ] AWS Account with appropriate permissions (Lambda, API Gateway, CloudWatch)
- [ ] AWS CLI installed and configured (`aws configure`)
- [ ] Node.js 20.x or higher installed
- [ ] PostgreSQL database (AWS RDS, Supabase, or local)
- [ ] Database connection string (DATABASE_URL)
- [ ] Git repository cloned locally

## 🚀 Step-by-Step Deployment

### Step 1: Set Up Database

#### Option A: AWS RDS (Production-Ready)

1. **Create RDS PostgreSQL Instance:**
   ```powershell
   # Via AWS Console or CLI
   aws rds create-db-instance \
     --db-instance-identifier valine-db-dev \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --master-username admin \
     --master-user-password YOUR_PASSWORD \
     --allocated-storage 20 \
     --publicly-accessible
   ```

2. **Get Connection String:**
   ```
   postgresql://admin:YOUR_PASSWORD@valine-db-dev.xxxxx.us-west-2.rds.amazonaws.com:5432/postgres
   ```

#### Option B: Supabase (Free Tier, Recommended for Dev)

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Navigate to: Settings > Database > Connection string > Connection pooling
4. Copy the connection string (URI format)

#### Option C: Local PostgreSQL (Development Only)

```powershell
# Install PostgreSQL
brew install postgresql  # macOS
sudo apt install postgresql  # Ubuntu

# Create database
createdb valine_db

# Connection string
$env:DATABASE_URL = "postgresql://localhost:5432/valine_db"
```

### Step 2: Configure Environment Variables

Create `.env` file in project root:

```powershell
Get-Content > .env << 'EOF'
# Database (REQUIRED)
DATABASE_URL=postgresql://user:password@host:5432/valine_db

# AWS Configuration (REQUIRED)
AWS_REGION=us-west-2
STAGE=dev

# JWT Secret (Optional - auto-generated for dev)
JWT_SECRET=change-this-in-production-to-something-secure
EOF
```

**Important:** Add `.env` to `.gitignore` to prevent committing secrets!

### Step 3: Install Dependencies

```powershell
# Install serverless dependencies
cd serverless
npm install

# Install Prisma dependencies
cd ../api
npm install

cd ..
```

### Step 4: Generate Prisma Client

```powershell
cd api
npx prisma generate
cd ..
```

### Step 5: Run Database Migration

The Prisma schema has been updated with all required models. Create and apply the migration:

```powershell
cd api

# Create migration (generates SQL)
npx prisma migrate dev --name add_auth_reels_conversations_notifications

# This will:
# 1. Generate migration SQL files
# 2. Apply migration to your database
# 3. Regenerate Prisma Client
```

**Migration includes:**
- Add `password` field to users table
- Create `reels` table with video content
- Create `comments` table for reel comments
- Create `likes` table for reel likes
- Create `bookmarks` table for saved reels
- Create `conversations` table for messaging
- Create `conversation_participants` table
- Create `messages` table
- Create `notifications` table
- Add indexes for performance

**If migration fails**, you can apply manually:

```sql
-- Run these SQL commands in your PostgreSQL database

-- Add password field to users
ALTER TABLE users ADD COLUMN password TEXT NOT NULL DEFAULT 'changeme';

-- Create reels table
CREATE TABLE reels (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  video_url TEXT NOT NULL,
  thumbnail TEXT,
  caption TEXT,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reels_author ON reels(author_id);
CREATE INDEX idx_reels_created_at ON reels(created_at);

-- Create comments table
CREATE TABLE comments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  text TEXT NOT NULL,
  reel_id TEXT NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_comments_reel ON comments(reel_id);
CREATE INDEX idx_comments_author ON comments(author_id);

-- Create likes table
CREATE TABLE likes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  reel_id TEXT NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(reel_id, user_id)
);
CREATE INDEX idx_likes_reel ON likes(reel_id);
CREATE INDEX idx_likes_user ON likes(user_id);

-- Create bookmarks table
CREATE TABLE bookmarks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  reel_id TEXT NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(reel_id, user_id)
);
CREATE INDEX idx_bookmarks_reel ON bookmarks(reel_id);
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);

-- Create conversations table
CREATE TABLE conversations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT,
  last_message TEXT,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create conversation_participants table
CREATE TABLE conversation_participants (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);
CREATE INDEX idx_conv_participants_user ON conversation_participants(user_id);

-- Create messages table
CREATE TABLE messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  text TEXT NOT NULL,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- Create notifications table
CREATE TABLE notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  triggerer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_recipient_read ON notifications(recipient_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
```

### Step 6: Deploy to AWS

```powershell
cd serverless

# Set environment variables (if not in .env)
$env:DATABASE_URL = "your-database-url"
$env:AWS_REGION = "us-west-2"
$env:STAGE = "dev"

# Deploy using deployment script (recommended)
cd ..
./scripts/deployment/deploy-backend.sh --stage dev --region us-west-2

# OR deploy directly with serverless
cd serverless
npx serverless deploy --stage dev --region us-west-2 --verbose
```

**Deployment will take 3-5 minutes.**

### Step 7: Get Your API_BASE URL

After successful deployment, Serverless Framework will output:

```
✔ Service deployed to stack pv-api-dev

endpoints:
  GET - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/health
  GET - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/meta
  POST - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/auth/register
  POST - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/auth/login
  ...
```

**Your API_BASE URL is:**
```
https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev
```

**Save this URL!** You'll need it for frontend configuration.

### Step 8: Verify Deployment

Test your API endpoints:

```powershell
# Set your API URL
$env:API_BASE = "https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev"

# Test health endpoint
Invoke-RestMethod -Uri "$API_BASE/health" -Method Get

# Expected response:
# {"status":"ok","timestamp":1699000000000,"service":"Project Valine API","version":"1.0.0"}

# Test meta endpoint (shows all available endpoints)
Invoke-RestMethod -Uri "$API_BASE/meta" -Method Get

# Run full test suite
cd serverless
./test-endpoints.sh "$API_BASE"
```

### Step 9: Configure Frontend

Update your frontend environment variables:

```powershell
# In client/.env or .env.local
Get-Content > client/.env << EOF
VITE_API_BASE=https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev
EOF
```

Restart your frontend development server to pick up the new environment variable.

### Step 10: Create Test Data (Optional)

Create test users and content:

```powershell
# Register a test user
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/register" -Method Post -Headers @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
} -Body '{ "email": "test@example.com", "password": "test123", "username": "testuser", "displayName": "Test User" }' -ContentType 'application/json'
```

## 📝 Dev API_BASE URL Format

Your dev API_BASE URL will follow this pattern:

```
https://{API_ID}.execute-api.{REGION}.amazonaws.com/{STAGE}
```

Example:
```
https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev
```

Components:
- `{API_ID}`: Auto-generated by AWS API Gateway (e.g., `abc123xyz`)
- `{REGION}`: Your AWS region (e.g., `us-west-2`)
- `{STAGE}`: Deployment stage (e.g., `dev`, `staging`, `prod`)

## 🔐 Dev Credentials

### JWT Authentication

**For development**, the backend uses these defaults:
- **JWT Secret**: `dev-secret-key-change-in-production` (auto-generated if not set)
- **Token Expiration**: 7 days
- **Algorithm**: HS256

**To set custom JWT secret:**
```powershell
$env:JWT_SECRET = "your-custom-secret-key-min-32-chars"
```

### Authentication Flow

1. **Register** or **Login** to get JWT token
2. **Include token** in Authorization header for protected endpoints
3. **Token format**: `Authorization: Bearer <token>`

Example:
```powershell
# Login
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/register" -Method Post -Headers @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $TOKEN"
} -Body '{"email":"test@example.com","password":"test123"}' -ContentType 'application/json'
```

## 📚 Complete API Reference

See `serverless/API_DOCUMENTATION.md` for:
- All 28 endpoint details
- Request/response examples
- curl commands for each endpoint
- Error codes and handling
- Pagination guide
- Authentication guide

## 🧪 Testing Endpoints

### Manual Testing

```powershell
$env:API_BASE = "your-api-url"

# Health check
Invoke-RestMethod -Uri "$API_BASE/health" -Method Get

# API metadata
Invoke-RestMethod -Uri "$API_BASE/meta" -Method Get

# Register user
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/register" -Method Post -Headers @{
    "Content-Type" = "application/json"
    "Content-Type" = "application/json"
    "Authorization" = "Bearer YOUR_TOKEN"
    "Authorization" = "Bearer YOUR_TOKEN"
    "Content-Type" = "application/json"
} -Body '{"email":"user@example.com","password":"pass123","username":"user","displayName":"User"}' -ContentType 'application/json'
```

### Automated Testing

Use the provided test script:

```powershell
cd serverless
./test-endpoints.sh "$API_BASE"
```

This will:
- Test all endpoints
- Create test data
- Verify responses
- Report results

## 🔧 Troubleshooting

### Issue: DATABASE_URL not set

**Solution:**
```powershell
$env:DATABASE_URL = "postgresql://user:password@host:5432/database"
```

### Issue: AWS credentials not found

**Solution:**
```powershell
# Configure AWS CLI
aws configure

# Or set environment variables
$env:AWS_ACCESS_KEY_ID = "your-key"
$env:AWS_SECRET_ACCESS_KEY = "your-secret"
$env:AWS_REGION = "us-west-2"
```

### Issue: Prisma Client generation fails

**Solution:**
```powershell
cd api
npm install
npx prisma generate
```

### Issue: Database connection timeout

**Solutions:**
- Verify database is running and accessible
- Check DATABASE_URL format
- For RDS: Ensure security group allows Lambda access
- For local DB: Use `host.docker.internal` instead of `localhost` in some cases

### Issue: Lambda deployment timeout

**Solutions:**
- Increase timeout in `serverless.yml`: `timeout: 30`
- Check database connectivity
- Review CloudWatch logs: `npx serverless logs -f functionName`

### Issue: CORS errors in frontend

**Solutions:**
- Verify `cors: true` in `serverless.yml`
- Check API_BASE URL is correct in frontend
- Clear browser cache
- Check that all handler responses include CORS headers

### Issue: 502 Bad Gateway

**Possible causes:**
- Database connection failed
- Lambda timeout
- Unhandled error in handler

**Debug:**
```powershell
npx serverless logs -f functionName --tail
```

## 📊 Monitoring & Logs

### View Lambda Logs

```powershell
# Tail logs for specific function
npx serverless logs -f register --tail

# View recent logs
npx serverless logs -f login --startTime 10m
```

### AWS CloudWatch Console

1. Go to AWS CloudWatch Console
2. Navigate to Logs > Log Groups
3. Find `/aws/lambda/pv-api-dev-*` log groups
4. View log streams

### Metrics

Monitor in CloudWatch:
- Lambda invocations
- Error rates
- Duration
- Throttles

## 💰 Cost Estimate

**AWS Free Tier (first 12 months):**
- 1M Lambda requests/month (free)
- 1M API Gateway requests/month (free)
- 400,000 GB-seconds compute time (free)

**Beyond free tier:**
- Lambda: $0.20 per 1M requests
- API Gateway: $3.50 per 1M requests
- CloudWatch Logs: $0.50 per GB
- RDS (db.t3.micro): ~$15/month

**Estimated dev cost:** $0-5/month with low traffic

## 🎯 Next Steps After Deployment

1. ✅ Save your API_BASE URL
2. ✅ Update frontend `.env` with API_BASE
3. ✅ Test all endpoints with curl or test script
4. ✅ Create test users and data
5. ✅ Verify frontend can connect to backend
6. ✅ Set up monitoring alerts
7. ✅ Plan staging/production deployment

## 📞 Support

**Documentation:**
- API Reference: `serverless/API_DOCUMENTATION.md`
- Deployment Guide: `serverless/DEPLOYMENT_GUIDE.md`
- Serverless README: `serverless/README.md`

**Issues:**
- GitHub: [Project Valine Issues](https://github.com/gcolon75/Project-Valine/issues)

**Resources:**
- AWS Lambda: https://docs.aws.amazon.com/lambda/
- Serverless Framework: https://www.serverless.com/framework/docs/
- Prisma: https://www.prisma.io/docs/

## 🔒 Security Notes

**Development Environment:**
- JWT secret is auto-generated (change for production!)
- Password hashing uses SHA-256 (use bcrypt for production)
- CORS allows all origins (restrict for production)
- No rate limiting (add for production)

**Production Recommendations:**
- Use AWS Secrets Manager for DATABASE_URL
- Use strong JWT secret (32+ characters)
- Implement bcrypt for password hashing
- Configure specific CORS origins
- Add rate limiting via API Gateway
- Enable AWS WAF
- Use SSL/TLS for database connections
- Implement request validation
- Add audit logging
- Set up automated backups

## ✅ Deployment Checklist

- [ ] Database created and accessible
- [ ] DATABASE_URL configured
- [ ] AWS credentials configured
- [ ] Dependencies installed (npm install)
- [ ] Prisma Client generated
- [ ] Database migration applied
- [ ] Serverless deployed successfully
- [ ] API_BASE URL obtained
- [ ] Health endpoint responding
- [ ] Test user created
- [ ] Frontend configured with API_BASE
- [ ] All endpoints tested

---

## Quick Reference

### Essential URLs

After deployment, you'll have:

```
API_BASE: https://{API_ID}.execute-api.us-west-2.amazonaws.com/dev

Health:     GET  {API_BASE}/health
Meta:       GET  {API_BASE}/meta
Register:   POST {API_BASE}/auth/register
Login:      POST {API_BASE}/auth/login
Me:         GET  {API_BASE}/auth/me
Reels:      GET  {API_BASE}/reels
```

### Quick Deploy Commands

```powershell
# Full deployment from scratch
$env:DATABASE_URL = "postgresql://..."
cd api && npx prisma generate && npx prisma migrate deploy && cd ..
cd serverless && npm install && npx serverless deploy --stage dev
```

### Quick Test Commands

```powershell
$env:API_BASE = "https://..."
Invoke-RestMethod -Uri "$API_BASE/health" -Method Get
Invoke-RestMethod -Uri "$API_BASE/meta" -Method Get
cd serverless && ./test-endpoints.sh "$API_BASE"
```

---

**Good luck with your deployment! 🚀**
