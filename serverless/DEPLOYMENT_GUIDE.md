# Project Valine Backend Deployment Guide

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** configured with credentials
3. **Node.js** 20.x or higher
4. **PostgreSQL Database** (local or cloud)
5. **Serverless Framework** (installed via npm)

## Quick Start

### 1. Configure Environment Variables

Create a `.env` file in the project root:

```bash
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

```bash
cd serverless
npm install
```

### 3. Generate Prisma Client

```bash
cd ../api
npx prisma generate
cd ../serverless
```

### 4. Run Database Migrations

```bash
cd ../api
npx prisma migrate deploy
cd ../serverless
```

### 5. Deploy to AWS

```bash
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

```bash
# Install PostgreSQL
brew install postgresql  # macOS
sudo apt install postgresql  # Ubuntu

# Create database
createdb valine_db

# Set DATABASE_URL
export DATABASE_URL="postgresql://localhost:5432/valine_db"
```

#### Option 3: Supabase (Free Tier)

1. Create project at [supabase.com](https://supabase.com)
2. Get connection string from Settings > Database
3. Use connection pooler URL for better Lambda performance

### AWS Credentials Setup

#### Method 1: AWS CLI Profile

```bash
# Configure AWS CLI
aws configure

# Or use named profile
aws configure --profile valine-dev

# Deploy with profile
AWS_PROFILE=valine-dev npx serverless deploy
```

#### Method 2: Environment Variables

```bash
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_REGION=us-west-2
```

#### Method 3: IAM Role (CI/CD)

For GitHub Actions or other CI/CD, use IAM roles with OIDC.

---

## Database Migrations

### Create a New Migration

```bash
cd api
npx prisma migrate dev --name add_feature_name
```

This will:
1. Generate SQL migration file
2. Apply migration to your development database
3. Regenerate Prisma Client

### Apply Migrations (Production)

```bash
cd api
npx prisma migrate deploy
```

**Note:** Always test migrations in staging before production!

### Reset Database (Development Only)

```bash
cd api
npx prisma migrate reset
```

**Warning:** This will delete all data!

---

## Environment-Specific Deployment

### Development

```bash
export STAGE=dev
export DATABASE_URL="postgresql://localhost:5432/valine_dev"
npx serverless deploy --stage dev
```

### Staging

```bash
export STAGE=staging
export DATABASE_URL="postgresql://...staging_db"
npx serverless deploy --stage staging
```

### Production

```bash
export STAGE=prod
export DATABASE_URL="postgresql://...prod_db"
export JWT_SECRET="your-production-secret-key"
npx serverless deploy --stage prod
```

---

## Verifying Deployment

### 1. Test Health Endpoint

```bash
export API_BASE="https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev"
curl "$API_BASE/health"
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

```bash
curl "$API_BASE/meta"
```

This will show all available endpoints.

### 3. Test Authentication

```bash
# Register a test user
curl -X POST "$API_BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "username": "testuser",
    "displayName": "Test User"
  }'

# Save the token from response
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Test protected endpoint
curl "$API_BASE/auth/me" \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Run Full Test Suite

Use the provided test script:

```bash
./scripts/deployment/test-endpoints.sh
```

---

## Updating Frontend Configuration

After deployment, update your frontend `.env` file:

```bash
# In client/.env or .env.local
VITE_API_BASE=https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev
```

Restart your frontend dev server to pick up the new environment variable.

---

## Monitoring & Debugging

### CloudWatch Logs

View Lambda logs in AWS CloudWatch:

```bash
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

```bash
# List deployments
npx serverless deploy list

# Rollback to previous version
npx serverless rollback --timestamp TIMESTAMP
```

---

## Cleanup

To remove all deployed resources:

```bash
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
