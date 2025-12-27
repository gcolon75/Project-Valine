# Project Valine - Deployment Guide

This guide walks you through deploying the Project Valine serverless backend to AWS and connecting it to the frontend.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Phase 1: Database Setup](#phase-1-database-setup)
- [Phase 2: Backend Deployment](#phase-2-backend-deployment)
- [Phase 3: API Testing](#phase-3-api-testing)
- [Phase 4: Frontend Configuration](#phase-4-frontend-configuration)
- [Phase 5: Production Deployment](#phase-5-production-deployment)
- [Troubleshooting](#troubleshooting)
- [Reference](#reference)

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 20.x or later
- **npm** 9.x or later
- **AWS CLI** configured with credentials
- **Serverless Framework** 3.x (`npm install -g serverless@3`)
- **Database** (PostgreSQL recommended, or SQLite for local dev)
- **AWS Account** with appropriate permissions

### AWS Permissions Required

Your IAM role/user needs:
- Lambda: Create, Update, Invoke functions
- API Gateway: Create and manage HTTP APIs
- CloudWatch: Create log groups and streams
- IAM: Create roles for Lambda execution

## Quick Start

For experienced users, here's the TL;DR:

```powershell
# 1. Setup database
$env:DATABASE_URL = "postgresql://user:password@host:5432/valine_db"
./scripts/deployment/setup-database.sh

# 2. Deploy backend
./scripts/deployment/deploy-backend.sh --stage dev --region us-west-2

# 3. Test endpoints
$env:API_BASE = "https://your-api-gateway-url.amazonaws.com/dev"
./scripts/deployment/test-endpoints.sh

# 4. Configure frontend
./scripts/deployment/configure-frontend.sh --api-url "$API_BASE"

# 5. Run frontend locally
npm run dev
```

## Phase 1: Database Setup

### Step 1: Choose Your Database

**For Production (Recommended):**
```powershell
# PostgreSQL
$env:DATABASE_URL = "postgresql://username:password@host:5432/valine_db"

# MySQL (also supported)
$env:DATABASE_URL = "mysql://username:password@host:3306/valine_db"
```

**For Local Development:**
```powershell
# SQLite (simpler, but not recommended for production)
$env:DATABASE_URL = "file:./dev.db"
```

### Step 2: Run Database Setup Script

```powershell
./scripts/deployment/setup-database.sh
```

This script will:
- Install Prisma dependencies
- Generate the Prisma Client
- Run database migrations
- Create all required tables

### Step 3: Verify Database Schema

```powershell
cd api
npx prisma studio
```

This opens a GUI at http://localhost:5555 where you can inspect:
- ✅ `users` table
- ✅ `posts` table
- ✅ `connection_requests` table
- ✅ `scripts` table
- ✅ `auditions` table

### Manual Migration (Alternative)

If you prefer to run migrations manually:

```powershell
cd api
npm install
npx prisma generate
npx prisma migrate deploy  # For production
# OR
npx prisma migrate dev --name add_social_features  # For development
```

## Phase 2: Backend Deployment

### Step 1: Configure Environment

Ensure your database URL is set:

```powershell
$env:DATABASE_URL = "postgresql://user:password@host:5432/valine_db"
$env:AWS_REGION = "us-west-2"  # Optional, defaults to us-west-2"
$env:STAGE = "dev"  # Optional, defaults to dev"
```

### Step 2: Deploy to AWS

**Using the deployment script (recommended):**

```powershell
./scripts/deployment/deploy-backend.sh --stage dev --region us-west-2
```

**Or manually:**

```powershell
cd serverless
npm install
cd ../api && npx prisma generate && cd ../serverless
npx serverless deploy --stage dev --region us-west-2 --verbose
```

### Step 3: Save Your API Gateway URL

The deployment output will show your API endpoints:

```
endpoints:
  POST - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/users
  GET  - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/users/{username}
  ...
```

**Save the base URL** (everything before `/users`):
```powershell
$env:API_BASE = "https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev"
```

## Phase 3: API Testing

### Automated Testing

```powershell
$env:API_BASE = "https://your-api-gateway-url.amazonaws.com/dev"
./scripts/deployment/test-endpoints.sh
```

This tests:
- ✅ Health check endpoint
- ✅ User creation
- ✅ User profile retrieval
- ✅ Post creation
- ✅ Post listing

### Manual Testing

#### 1. Health Check

```powershell
Invoke-RestMethod -Uri "$API_BASE/health" -Method Get
# Expected: {"ok":true,"status":"healthy"}
```

#### 2. Create a User

```powershell
Invoke-RestMethod -Uri "-X" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{ "username": "testuser", "email": "test@valine.com", "displayName": "Test User", "bio": "This is a test account", "avatar": "https://i.pravatar.cc/150?img=1" }' -ContentType 'application/json'```

#### 3. Get User Profile

```powershell
Invoke-RestMethod -Uri "$API_BASE/users/testuser" -Method Get
```

#### 4. Create a Post

```powershell
# Replace USER_ID with the id from user creation response
Invoke-RestMethod -Uri "-X" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{ "content": "Hello from Project Valine!", "media": ["https://picsum.photos/400/300"], "authorId": "YOUR_USER_ID_HERE" }' -ContentType 'application/json'```

#### 5. List Posts

```powershell
Invoke-RestMethod -Uri "$API_BASE/posts?limit=10" -Method Get
```

#### 6. Send Connection Request

```powershell
# Create a second user first, then:
Invoke-RestMethod -Uri "-X" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{ "senderId": "USER1_ID", "receiverId": "USER2_ID", "message": "Let' -ContentType 'application/json'```

#### 7. List Connection Requests

```powershell
Invoke-RestMethod -Uri "$API_BASE/connections/requests?userId=USER2_ID" -Method Get
```

#### 8. Approve Connection Request

```powershell
Invoke-RestMethod -Uri "-X" -Method Post
```

## Phase 4: Frontend Configuration

### Step 1: Configure API Base URL

**Using the configuration script:**

```powershell
./scripts/deployment/configure-frontend.sh --api-url "$API_BASE"
```

**Or manually create `.env`:**

```powershell
Get-Content > .env << EOF
VITE_API_BASE=https://your-api-gateway-url.amazonaws.com/dev
EOF
```

### Step 2: Test Locally

```powershell
npm install
npm run dev
```

Visit http://localhost:5173 and test:

- ✅ Profile page: http://localhost:5173/profile/testuser
- ✅ Dashboard: http://localhost:5173/dashboard
- ✅ Connection requests: http://localhost:5173/requests

### Step 3: Verify Integration

1. **Profile Page**: Check that real user data loads from the API
2. **Dashboard**: Verify posts appear in the feed
3. **Requests Page**: Confirm connection requests display
4. **Network Tab**: Ensure API calls are succeeding (200/201 status codes)

### Step 4: Build for Production

```powershell
npm run build
```

Test the production build:

```powershell
npm run preview
```

## Phase 5: Production Deployment

### Backend Production Deployment

```powershell
# Set production database URL
$env:DATABASE_URL = "postgresql://prod-user:prod-pass@prod-host:5432/valine_prod"

# Deploy to production stage
./scripts/deployment/deploy-backend.sh --stage prod --region us-west-2
```

### Frontend Production Deployment

The frontend deploys automatically via GitHub Actions when you push to `main`.

**Option 1: Set GitHub Secret**

```powershell
# Using GitHub CLI
gh secret set VITE_API_BASE \
  --body "https://prod-api-url.amazonaws.com/prod" \
  --repo gcolon75/Project-Valine
```

**Option 2: Manual in GitHub**

1. Go to Settings → Secrets and variables → Actions
2. Add `VITE_API_BASE` with your production API URL
3. Push to main branch

**Option 3: Use GitHub Actions Workflow Dispatch**

1. Go to Actions → "Client Deploy"
2. Click "Run workflow"
3. Enter your API base URL
4. Click "Run workflow"

### Database Migration in Production

```powershell
cd api
$env:DATABASE_URL = "postgresql://prod-user:prod-pass@prod-host:5432/valine_prod"
npx prisma migrate deploy
```

## Troubleshooting

### Issue: "Cannot connect to database"

**Check your DATABASE_URL format:**

```powershell
# PostgreSQL
postgresql://username:password@host:port/database

# With SSL (recommended for production)
postgresql://username:password@host:port/database?sslmode=require

# MySQL
mysql://username:password@host:port/database
```

**Verify database allows connections:**
- Check security groups (AWS RDS)
- Verify network access
- Test connection with psql/mysql client

**For Lambda in VPC:**
- Ensure Lambda has VPC configuration
- Security groups allow outbound to database
- Database security group allows inbound from Lambda

### Issue: "Module not found: @prisma/client"

**Solution 1: Regenerate Prisma Client**

```powershell
cd api
npx prisma generate
cd ../serverless
npm install
```

**Solution 2: Install in both locations**

```powershell
cd api && npm install && npx prisma generate
cd ../serverless && npm install
```

### Issue: "CORS error in browser"

**Verify CORS headers in handlers:**

All handlers should include:
```javascript
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
}
```

**For production, restrict origin:**
```javascript
'Access-Control-Allow-Origin': 'https://your-domain.com'
```

### Issue: "Cold start timeout"

**Solution 1: Increase Lambda timeout**

Edit `serverless.yml`:
```yaml
provider:
  timeout: 30  # seconds (default is 6)
```

**Solution 2: Use provisioned concurrency**

```yaml
functions:
  getUser:
    handler: src/handlers/users.getUser
    provisionedConcurrency: 2
```

### Issue: "Prisma connection pool exhausted"

**Solution: Use Prisma Data Proxy or connection pooling**

Update `api/prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}
```

### Issue: "Frontend shows Loading... forever"

1. **Check browser console** for errors
2. **Verify API_BASE URL** in `.env`
3. **Test API directly** with curl
4. **Check CORS** in Network tab
5. **View Lambda logs:**

```powershell
cd serverless
npx serverless logs -f getUser --stage dev --tail
```

### Issue: Deployment fails with AWS credentials error

**Verify AWS credentials:**

```powershell
aws sts get-caller-identity
```

**Configure AWS CLI if needed:**

```powershell
aws configure
```

**For GitHub Actions:**
- Ensure OIDC is configured
- Verify IAM role ARN is correct
- Check role has necessary permissions

## Reference

### Useful Commands

```powershell
# Database
npx prisma migrate dev          # Create and apply migration
npx prisma migrate deploy       # Apply migrations (production)
npx prisma studio               # Open database GUI
npx prisma db push              # Sync schema without migration

# Serverless
npx serverless deploy           # Deploy all functions
npx serverless deploy function -f getUser  # Deploy single function
npx serverless logs -f getUser --tail      # View logs
npx serverless remove           # Delete stack
npx serverless info             # Show deployment info

# Frontend
npm run dev                     # Local development
npm run build                   # Production build
npm run preview                 # Preview build locally

# Testing
./scripts/deployment/test-endpoints.sh       # Test API
Invoke-RestMethod -Uri "-X" -Method Post -Body '...' -ContentType 'application/json'
```

### Environment Variables

**Backend (Lambda):**
- `DATABASE_URL` - Database connection string (required)
- `STAGE` - Deployment stage (dev/staging/prod)
- `AWS_REGION` - AWS region

**Frontend:**
- `VITE_API_BASE` - API Gateway base URL (required)
- `VITE_API_STRIP_LEGACY_API_PREFIX` - Strip '/api' prefix from paths (default: false)
- `VITE_ANALYTICS_ENABLED` - Enable analytics tracking (default: false)
- `VITE_API_USE_CREDENTIALS` - Enable cookies for auth (default: false)
- `VITE_ENABLE_AUTH` - Use HttpOnly cookie auth (default: false)
- `VITE_ENABLE_REGISTRATION` - Show registration UI (default: false)
- `VITE_ENABLE_DEV_BYPASS` - Enable dev bypass on localhost (default: false, must be false in production)

**GitHub Actions:**
- `VITE_API_BASE` - Secret/Variable for frontend API URL
- `S3_BUCKET` - S3 bucket for frontend hosting
- `CLOUDFRONT_DISTRIBUTION_ID` - CloudFront distribution

### Architecture

```
Frontend (React + Vite)
    ↓
API Gateway (HTTP API)
    ↓
Lambda Functions (Node.js 20.x)
    ↓
Prisma ORM
    ↓
Database (PostgreSQL/MySQL)
```

### Endpoints

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/health` | handler.js | Health check |
| POST | `/users` | users.createUser | Create user |
| GET | `/users/{username}` | users.getUser | Get user profile |
| PUT | `/users/{id}` | users.updateUser | Update user |
| POST | `/posts` | posts.createPost | Create post |
| GET | `/posts` | posts.listPosts | List posts |
| POST | `/connections/request` | connections.sendRequest | Send connection request |
| GET | `/connections/requests` | connections.listRequests | List requests |
| POST | `/connections/requests/{id}/approve` | connections.approveRequest | Approve request |
| POST | `/connections/requests/{id}/reject` | connections.rejectRequest | Reject request |

### Cost Estimates

**AWS Services (us-west-2):**
- Lambda: ~$0.20 per million requests
- API Gateway: ~$1.00 per million requests
- RDS (db.t3.micro): ~$15/month
- CloudWatch Logs: ~$0.50/GB

**Total estimated cost for development:**
- Low traffic: $5-10/month
- Medium traffic (100K requests): $20-30/month

## Support

For issues or questions:
- Check [Troubleshooting](#troubleshooting) section
- Review [GitHub Issues](https://github.com/gcolon75/Project-Valine/issues)
- See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines

## Next Steps

After deployment:

1. ✅ **Add Authentication** - Implement JWT token validation
2. ✅ **Rate Limiting** - Protect API from abuse
3. ✅ **Monitoring** - Set up CloudWatch dashboards
4. ✅ **Error Tracking** - Integrate Sentry or similar
5. ✅ **Performance** - Add caching and connection pooling
6. ✅ **Features** - Comments, likes, search, notifications
7. ✅ **Testing** - Add integration and E2E tests
8. ✅ **Documentation** - API documentation with Swagger/OpenAPI

---

**Deployment Time:** 1-2 hours for complete setup and testing

Last Updated: October 29, 2025
