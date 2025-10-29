# Deployment Scripts

Automated scripts for deploying Project Valine backend and configuring the frontend.

## Scripts Overview

### 1. setup-database.sh

Sets up the database schema and runs migrations.

**Usage:**
```bash
export DATABASE_URL="postgresql://user:password@host:5432/valine_db"
./scripts/deployment/setup-database.sh
```

**What it does:**
- Installs Prisma dependencies in `/api`
- Generates Prisma Client
- Runs database migrations (dev or production mode based on DATABASE_URL)
- Verifies schema setup

**Requirements:**
- `DATABASE_URL` environment variable must be set
- Node.js 20.x or later
- Network access to database

### 2. deploy-backend.sh

Deploys the serverless backend to AWS.

**Usage:**
```bash
export DATABASE_URL="postgresql://user:password@host:5432/valine_db"
./scripts/deployment/deploy-backend.sh --stage dev --region us-west-2
```

**Options:**
- `--stage STAGE` - Deployment stage (default: dev)
- `--region REGION` - AWS region (default: us-west-2)
- `--help` - Show help message

**What it does:**
- Installs serverless dependencies
- Generates Prisma Client
- Deploys Lambda functions and API Gateway
- Shows API endpoint URLs

**Requirements:**
- `DATABASE_URL` environment variable must be set
- AWS credentials configured
- Serverless Framework installed (`npm i -g serverless@3`)

### 3. test-endpoints.sh

Tests the deployed backend API endpoints.

**Usage:**
```bash
export API_BASE="https://abc123.execute-api.us-west-2.amazonaws.com/dev"
./scripts/deployment/test-endpoints.sh
```

**What it does:**
- Tests health check endpoint
- Creates a test user
- Retrieves user profile
- Creates a test post
- Lists posts from the feed
- Reports success/failure for each test

**Requirements:**
- `API_BASE` environment variable must be set
- Backend must be deployed and accessible
- `curl` command available

### 4. configure-frontend.sh

Configures the frontend to connect to the deployed backend.

**Usage:**
```bash
./scripts/deployment/configure-frontend.sh --api-url https://abc123.execute-api.us-west-2.amazonaws.com/dev
```

**Options:**
- `--api-url URL` - API Gateway URL from backend deployment
- `--help` - Show help message

**Interactive mode:**
If `--api-url` is not provided, the script will prompt for the URL.

**What it does:**
- Creates/updates `.env` file with `VITE_API_BASE`
- Updates `.env.example` template
- Backs up existing `.env` to `.env.backup`
- Tests API connectivity (if curl available)

**Requirements:**
- Run from project root or scripts will find the root automatically
- API Gateway URL from backend deployment

## Complete Deployment Workflow

Here's the recommended order for complete deployment:

```bash
# Step 1: Setup database
export DATABASE_URL="postgresql://user:password@host:5432/valine_db"
./scripts/deployment/setup-database.sh

# Step 2: Deploy backend
./scripts/deployment/deploy-backend.sh --stage dev --region us-west-2

# Step 3: Save the API Gateway URL from the deployment output
export API_BASE="https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev"

# Step 4: Test the API
./scripts/deployment/test-endpoints.sh

# Step 5: Configure frontend
./scripts/deployment/configure-frontend.sh --api-url "$API_BASE"

# Step 6: Test frontend locally
cd /home/runner/work/Project-Valine/Project-Valine
npm run dev
```

## Environment Variables

### Required for Backend Deployment

- `DATABASE_URL` - Database connection string
  ```bash
  # PostgreSQL
  export DATABASE_URL="postgresql://user:pass@host:5432/db"
  
  # MySQL
  export DATABASE_URL="mysql://user:pass@host:3306/db"
  
  # SQLite (dev only)
  export DATABASE_URL="file:./dev.db"
  ```

### Optional for Backend Deployment

- `STAGE` - Deployment stage (default: dev)
  ```bash
  export STAGE="prod"
  ```

- `AWS_REGION` - AWS region (default: us-west-2)
  ```bash
  export AWS_REGION="us-east-1"
  ```

### Required for API Testing

- `API_BASE` - Base URL of deployed API Gateway
  ```bash
  export API_BASE="https://abc123.execute-api.us-west-2.amazonaws.com/dev"
  ```

## Troubleshooting

### Script Permission Denied

If you get a permission error:
```bash
chmod +x scripts/deployment/*.sh
```

### Database Connection Failed

Check your DATABASE_URL format:
```bash
echo $DATABASE_URL
# Should show: postgresql://user:pass@host:5432/dbname
```

Test database connectivity:
```bash
# PostgreSQL
psql "$DATABASE_URL" -c "SELECT 1;"

# MySQL
mysql -h host -u user -ppass dbname -e "SELECT 1;"
```

### AWS Deployment Failed

Verify AWS credentials:
```bash
aws sts get-caller-identity
```

Check Serverless Framework installation:
```bash
serverless --version
# Should show version 3.x
```

### API Tests Failing

1. Check if API_BASE is correct:
   ```bash
   echo $API_BASE
   curl $API_BASE/health
   ```

2. View Lambda logs:
   ```bash
   cd serverless
   npx serverless logs -f getUser --stage dev --tail
   ```

3. Check API Gateway in AWS Console:
   - Verify endpoints are deployed
   - Check integration with Lambda
   - Test invocation manually

### Frontend Not Connecting

1. Verify `.env` file exists and has correct URL:
   ```bash
   cat .env
   ```

2. Restart dev server after changing `.env`:
   ```bash
   npm run dev
   ```

3. Check browser console for CORS errors
4. Verify API responds to OPTIONS requests (CORS preflight)

## Production Deployment

For production, use different stages and restrict CORS:

```bash
# Backend production
export DATABASE_URL="postgresql://prod-user:prod-pass@prod-host:5432/prod_db"
./scripts/deployment/deploy-backend.sh --stage prod --region us-west-2

# Frontend production
# Set GitHub secret VITE_API_BASE to production API URL
# Then push to main branch for automatic deployment
```

## Manual Alternatives

If you prefer not to use the scripts:

### Manual Database Setup
```bash
cd api
npm install
npx prisma generate
npx prisma migrate deploy
```

### Manual Backend Deploy
```bash
cd serverless
npm install
cd ../api && npx prisma generate && cd ../serverless
npx serverless deploy --stage dev --region us-west-2
```

### Manual API Test
```bash
curl https://api-url/health
curl -X POST https://api-url/users -H "Content-Type: application/json" -d '{"username":"test","email":"test@example.com","displayName":"Test"}'
```

### Manual Frontend Config
```bash
echo 'VITE_API_BASE=https://your-api-url.amazonaws.com/dev' > .env
npm run dev
```

## CI/CD Integration

These scripts can be used in CI/CD pipelines:

### GitHub Actions Example
```yaml
- name: Deploy Backend
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
  run: ./scripts/deployment/deploy-backend.sh --stage prod --region us-west-2

- name: Test API
  env:
    API_BASE: ${{ secrets.API_BASE }}
  run: ./scripts/deployment/test-endpoints.sh
```

### AWS CodePipeline
```bash
#!/bin/bash
set -e
export DATABASE_URL="${DATABASE_URL_PARAM}"
./scripts/deployment/setup-database.sh
./scripts/deployment/deploy-backend.sh --stage $STAGE --region $REGION
```

## See Also

- [Main Deployment Guide](../../DEPLOYMENT.md) - Comprehensive deployment documentation
- [README](../../README.md) - Project overview
- [CONTRIBUTING](../../CONTRIBUTING.md) - Development guidelines

## Support

If you encounter issues:
1. Check the [Troubleshooting](#troubleshooting) section above
2. Review the [main deployment guide](../../DEPLOYMENT.md)
3. Check [GitHub Issues](https://github.com/gcolon75/Project-Valine/issues)
4. Ensure all prerequisites are installed and configured

---

Last Updated: October 29, 2025
