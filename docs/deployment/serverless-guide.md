# Project Valine Backend Deployment Guide

> **📌 Note:** This guide covers deployment of the **canonical Serverless backend** for staging and production. This is the only backend that should be deployed to AWS environments. See [Canonical Backend Decision](../backend/canonical-backend.md) for details.

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** configured with credentials
3. **Node.js** 20.x or higher
4. **PostgreSQL Database** (local or cloud)
5. **Serverless Framework** (installed via npm)

## Quick Start

### 1. Configure Environment Variables

Create a `.env` file in the project root:

```powershell
# Database URL (required)
DATABASE_URL="postgresql://username:password@host:5432/valine_db"

# AWS Configuration
AWS_REGION=us-west-2
STAGE=dev

# JWT Secret (optional, defaults to dev key)
JWT_SECRET=your-secret-key-for-production
```

**Important:** Never commit `.env` files to version control!

### 2. Install Dependencies

```powershell
cd serverless
npm install
```

### 3. Generate Prisma Client

```powershell
cd ../api
npx prisma generate
cd ../serverless
```

### 4. Run Database Migrations

```powershell
cd ../api
npx prisma migrate deploy
cd ../serverless
```

### 5. Deploy to AWS

```powershell
# Deploy using the deployment script
cd ..
./scripts/deployment/deploy-backend.sh --stage dev --region us-west-2

# Or deploy directly with serverless
cd serverless
npx serverless deploy --stage dev --region us-west-2
```

### 6. Get Your API URL

After deployment, Serverless will output your API Gateway URL:

```
endpoints:
  GET - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/health
  GET - https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev/meta
  ...
```

Your **API_BASE** is: `https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev`

---

## Detailed Setup

### Database Setup

#### Option 1: AWS RDS (Recommended for Production)

1. Create PostgreSQL RDS instance in AWS Console
2. Configure security group to allow Lambda access
3. Get connection string from RDS console
4. Format: `postgresql://username:password@endpoint:5432/database?sslmode=require`

#### Option 2: Local PostgreSQL (Development)

```powershell
# Install PostgreSQL
brew install postgresql  # macOS
sudo apt install postgresql  # Ubuntu

# Create database
createdb valine_db

# Set DATABASE_URL
$env:DATABASE_URL = "postgresql://localhost:5432/valine_db"
```

#### Option 3: Supabase (Free Tier)

1. Create project at [supabase.com](https://supabase.com)
2. Get connection string from Settings > Database
3. Use connection pooler URL for better Lambda performance

### AWS Credentials Setup

#### Method 1: AWS CLI Profile

```powershell
# Configure AWS CLI
aws configure

# Or use named profile
aws configure --profile valine-dev

# Deploy with profile
AWS_PROFILE=valine-dev npx serverless deploy
```

#### Method 2: Environment Variables

```powershell
$env:AWS_ACCESS_KEY_ID = "your-access-key"
$env:AWS_SECRET_ACCESS_KEY = "your-secret-key"
$env:AWS_REGION = "us-west-2"
```

#### Method 3: IAM Role (CI/CD)

For GitHub Actions or other CI/CD, use IAM roles with OIDC.

---

## Database Migrations

### Create a New Migration

```powershell
cd api
npx prisma migrate dev --name add_feature_name
```

This will:
1. Generate SQL migration file
2. Apply migration to your development database
3. Regenerate Prisma Client

### Apply Migrations (Production)

```powershell
cd api
npx prisma migrate deploy
```

**Note:** Always test migrations in staging before production!

### Reset Database (Development Only)

```powershell
cd api
npx prisma migrate reset
```

**Warning:** This will delete all data!

---

## Environment-Specific Deployment

### Required Environment Variables

All deployments require these environment variables:

- **DATABASE_URL** - PostgreSQL connection string (required)
- **JWT_SECRET** - Secret key for JWT signing (production should use strong random value)
- **AWS_REGION** - AWS region for deployment (default: us-west-2)
- **STAGE** - Deployment stage: dev, staging, or prod

Optional variables:
- **EMAIL_ENABLED** - Set to `true` to enable SMTP email sending (default: false, logs to console)
- **FRONTEND_URL** - Frontend URL for email verification links (default: http://localhost:5173)

### Development

```powershell
$env:STAGE = "dev"
$env:DATABASE_URL = "postgresql://localhost:5432/valine_dev"
$env:JWT_SECRET = "dev-secret-key-change-in-production"
npx serverless deploy --stage dev
```

### Staging

```powershell
$env:STAGE = "staging"
$env:DATABASE_URL = "postgresql://...staging_db"
$env:JWT_SECRET = "$(openssl rand -base64 32)"
npx serverless deploy --stage staging
```

### Production

```powershell
$env:STAGE = "prod"
$env:DATABASE_URL = "postgresql://...prod_db"
$env:JWT_SECRET = "your-production-secret-key"
$env:EMAIL_ENABLED = "true"
$env:FRONTEND_URL = "https://valine.app"
npx serverless deploy --stage prod
```

**Security Note:** Always use a strong, randomly generated JWT_SECRET in staging and production. Generate one with:
```powershell
openssl rand -base64 32
```

---

## Verifying Deployment

### 1. Test Health Endpoint

```powershell
$env:API_BASE = "https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev"
Invoke-RestMethod -Uri "$API_BASE/health" -Method Get
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": 1699000000000,
  "service": "Project Valine API",
  "version": "1.0.0"
}
```

### 2. Test Meta Endpoint

```powershell
Invoke-RestMethod -Uri "$API_BASE/meta" -Method Get
```

This will show all available endpoints.

### 3. Test Authentication

The serverless backend implements a complete authentication system with email verification. All endpoints use JWT-based authentication with bcrypt password hashing.

#### Available Auth Endpoints

1. **POST /auth/register** - Register new user with email verification
2. **POST /auth/login** - Login and receive JWT token
3. **GET /auth/me** - Get current user profile (requires auth)
4. **POST /auth/verify-email** - Verify email with token
5. **POST /auth/resend-verification** - Resend verification email (requires auth)

#### Example: Register a New User

```powershell
Invoke-RestMethod -Uri "-X" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{ "email": "test@example.com", "password": "securePass123", "username": "testuser", "displayName": "Test User" }' -ContentType 'application/json'```

**Response (201 Created):**
```json
{
  "user": {
    "id": "cm123abc",
    "username": "testuser",
    "email": "test@example.com",
    "displayName": "Test User",
    "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=testuser",
    "emailVerified": false,
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Registration successful. Please check your email to verify your account."
}
```

**Note:** A verification email will be logged to console (dev) or sent via SMTP (production). The user receives a limited-access JWT token immediately.

#### Example: Login

```powershell
Invoke-RestMethod -Uri "-X" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{ "email": "test@example.com", "password": "securePass123" }' -ContentType 'application/json'```

**Response (200 OK):**
```json
{
  "user": {
    "id": "cm123abc",
    "username": "testuser",
    "email": "test@example.com",
    "displayName": "Test User",
    "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=testuser",
    "role": "USER",
    "emailVerified": false,
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Note:** Login works even if email is not verified, but `emailVerified` field indicates status.

#### Example: Get Current User

```powershell
# Save the token from login/register response
$env:TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get current user profile
Invoke-RestMethod -Uri "$API_BASE/auth/me" -Method Get -Headers @{
    "Authorization" = "Bearer $TOKEN"
}```

**Response (200 OK):**
```json
{
  "user": {
    "id": "cm123abc",
    "username": "testuser",
    "email": "test@example.com",
    "displayName": "Test User",
    "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=testuser",
    "bio": null,
    "role": "USER",
    "emailVerified": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "_count": {
      "posts": 0,
      "reels": 0,
      "sentRequests": 0,
      "receivedRequests": 0
    }
  }
}
```

#### Example: Verify Email

```powershell
# Token comes from verification email link
Invoke-RestMethod -Uri "-X" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{ "token": "abc123def456..." }' -ContentType 'application/json'```

**Response (200 OK):**
```json
{
  "message": "Email verified successfully",
  "verified": true
}
```

#### Example: Resend Verification Email

```powershell
Invoke-RestMethod -Uri "-X" -Method Post -Headers @{
    "Authorization" = "Bearer $TOKEN"
}```

**Response (200 OK):**
```json
{
  "message": "Verification email sent successfully. Please check your email.",
  "email": "test@example.com"
}
```

#### Error Responses

**400 Bad Request** - Missing or invalid fields:
```json
{
  "error": "email, password, username, and displayName are required"
}
```

**401 Unauthorized** - Invalid credentials or token:
```json
{
  "error": "Invalid email or password"
}
```

**409 Conflict** - User already exists:
```json
{
  "error": "User with this email or username already exists"
}
```

### 4. Run Full Test Suite

Use the provided test script:

```powershell
./scripts/deployment/test-endpoints.sh
```

---

## Updating Frontend Configuration

After deployment, update your frontend `.env` file:

```powershell
# In client/.env or .env.local
VITE_API_BASE=https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev
```

Restart your frontend dev server to pick up the new environment variable.

---

## Monitoring & Debugging

### CloudWatch Logs

View Lambda logs in AWS CloudWatch:

```powershell
# View logs for a specific function
npx serverless logs -f login --stage dev --tail

# View logs for all functions
npx serverless logs -f register --stage dev --tail
```

### API Gateway Logs

Enable in AWS Console:
1. Go to API Gateway console
2. Select your API
3. Enable CloudWatch Logs
4. Set log level to INFO or ERROR

### Common Issues

#### Issue: Database Connection Timeout

**Solution:**
- Ensure Lambda has VPC access if database is in VPC
- Use connection pooling URL for RDS
- Check security group rules

#### Issue: Cold Start Performance

**Solution:**
- Use provisioned concurrency for critical functions
- Keep Lambda warm with scheduled pings
- Optimize Prisma client initialization

#### Issue: CORS Errors

**Solution:**
- Verify `cors: true` in serverless.yml
- Check headers in response
- Ensure frontend uses correct origin

---

## Performance Optimization

### 1. Lambda Configuration

Update `serverless.yml`:

```yaml
provider:
  memorySize: 512  # Increase for better performance
  timeout: 30      # Adjust based on needs
```

### 2. Database Connection Pooling

In production, limit Prisma connections:

```javascript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connection_limit=5'
    }
  }
});
```

### 3. Provisioned Concurrency

For high-traffic endpoints:

```yaml
functions:
  listReels:
    handler: src/handlers/reels.listReels
    provisionedConcurrency: 2
```

---

## Security Best Practices

### 1. Environment Variables

- Never commit `.env` files
- Use AWS Systems Manager Parameter Store for production secrets
- Rotate JWT secrets regularly

### 2. Database Security

- Use SSL/TLS connections (`?sslmode=require`)
- Limit database user permissions
- Enable RDS encryption at rest

### 3. API Security

- Implement rate limiting (API Gateway)
- Add request validation
- Enable AWS WAF for production

### 4. JWT Security

- Use strong secrets (32+ characters)
- Set appropriate expiration times
- Consider refresh tokens for production

---

## Rollback

If deployment fails or has issues:

```powershell
# List deployments
npx serverless deploy list

# Rollback to previous version
npx serverless rollback --timestamp TIMESTAMP
```

---

## Cleanup

To remove all deployed resources:

```powershell
npx serverless remove --stage dev
```

**Warning:** This will delete:
- All Lambda functions
- API Gateway
- CloudWatch logs
- IAM roles

It will NOT delete:
- Your database
- S3 buckets (if any)

---

## CI/CD Setup

### GitHub Actions Example

Create `.github/workflows/deploy-backend.yml`:

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'serverless/**'
      - 'api/prisma/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd serverless
          npm install
          cd ../api
          npm install
      
      - name: Generate Prisma Client
        run: |
          cd api
          npx prisma generate
      
      - name: Deploy
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
        run: |
          cd serverless
          npx serverless deploy --stage prod
```

---

## Cost Estimation

AWS costs for a typical deployment:

- **Lambda**: ~$0.20 per 1M requests (first 1M free)
- **API Gateway**: ~$3.50 per 1M requests (first 1M free)
- **RDS (db.t3.micro)**: ~$15/month (free tier eligible)
- **CloudWatch Logs**: ~$0.50 per GB

**Estimated monthly cost:** $0-20 for low traffic, $50-100 for moderate traffic

---

## Support & Resources

- **Documentation**: See `API_DOCUMENTATION.md`
- **Troubleshooting**: See `TROUBLESHOOTING.md` in project root
- **AWS Docs**: https://docs.aws.amazon.com/lambda/
- **Prisma Docs**: https://www.prisma.io/docs/
- **Serverless Docs**: https://www.serverless.com/framework/docs/

---

## Next Steps

After successful deployment:

1. ✅ Save your API_BASE URL
2. ✅ Update frontend configuration
3. ✅ Test all endpoints
4. ✅ Set up monitoring
5. ✅ Configure CI/CD
6. ✅ Plan for production deployment

For production deployment, see `DEPLOYMENT_CHECKLIST.md`.
