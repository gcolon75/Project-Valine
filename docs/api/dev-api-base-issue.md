# GitHub Issue Template: Blocked - Missing Dev API_BASE

**Title:** `blocked: missing dev API_BASE - DATABASE_URL not configured`

**Labels:** `blocked`, `deployment`, `database`, `backend`, `phase-02`, `critical`

**Body:**

## Summary

The dev backend cannot be deployed because the `DATABASE_URL` environment variable is not configured in the GitHub Actions deployment workflow. This blocks Phase 02B backend verification.

## Problem

Backend deployment is failing with error:
```
Cannot resolve variable at "provider.environment.DATABASE_URL": Value not found at "env" source
```

**Last failed deployment:**
- Run ID: #19054613492
- Date: 2025-11-04T01:19:23Z
- Workflow: [Backend Deploy](https://github.com/gcolon75/Project-Valine/actions/runs/19054613492)

## Impact

- ❌ Cannot verify 28 implemented API endpoints against live environment
- ❌ Cannot obtain dev API_BASE URL for frontend integration
- ❌ CORS configuration cannot be validated
- ❌ Authentication flow cannot be tested end-to-end
- ❌ API performance metrics unavailable
- ❌ Frontend remains on MSW mocks instead of real backend

## Root Cause

The `serverless/serverless.yml` configuration requires `DATABASE_URL` for Prisma ORM:

```yaml
provider:
  environment:
    DATABASE_URL: ${env:DATABASE_URL}
```

This environment variable is not set in the GitHub Actions deployment environment.

## Solution Options

### Option 1: Use AWS RDS (Recommended for long-term)

**Cost:** ~$15/month for db.t3.micro

1. Create RDS PostgreSQL instance:
   ```powershell
   aws rds create-db-instance \
     --db-instance-identifier valine-dev-db \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --master-username valine \
     --master-user-password <secure-password> \
     --allocated-storage 20 \
     --region us-west-2
   ```

2. Get connection string and add to GitHub Secrets:
   ```
   DATABASE_URL=postgresql://valine:<password>@<endpoint>:5432/valine_dev
   ```

### Option 2: Use Supabase (Free Tier Available)

**Cost:** Free for dev usage

1. Create project at [supabase.com](https://supabase.com)
2. Get connection string from Settings → Database
3. Add to GitHub Secrets:
   ```
   DATABASE_URL=postgresql://postgres.[project-ref]:[password]@[host]/postgres
   ```

### Option 3: Use Railway.app (Free Tier Available)

**Cost:** Free for dev usage

1. Create project at [railway.app](https://railway.app)
2. Add PostgreSQL service
3. Copy DATABASE_URL and add to GitHub Secrets

### Option 4: Use Neon (Serverless Postgres, Free Tier)

**Cost:** Free for dev usage

1. Create project at [neon.tech](https://neon.tech)
2. Get connection string
3. Add to GitHub Secrets

## Implementation Steps

### 1. Configure GitHub Secret

Navigate to: [Project Settings → Secrets → Actions](https://github.com/gcolon75/Project-Valine/settings/secrets/actions)

Add secret:
- **Name:** `DATABASE_URL`
- **Value:** `postgresql://user:password@host:5432/database`

### 2. Update Workflow (if needed)

The workflow should already reference the secret. Verify in `.github/workflows/backend-deploy.yml`:

```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### 3. Run Database Migrations

After deploying, run migrations:

```powershell
cd api
npx prisma migrate deploy
```

Or use the deployment script:
```powershell
./scripts/deployment/setup-database.sh
```

### 4. Deploy Backend

Trigger deployment:
- Manual: [Run Backend Deploy Workflow](https://github.com/gcolon75/Project-Valine/actions/workflows/backend-deploy.yml)
- Automatic: Push to `main` branch

### 5. Verify Deployment

Check deployment output for API_BASE URL:
```
https://<api-id>.execute-api.us-west-2.amazonaws.com/prod
```

Test health endpoint:
```powershell
Invoke-RestMethod -Uri "https://<api-id>.execute-api.us-west-2.amazonaws.com/prod/health" -Method Get
```

### 6. Update Frontend

Configure frontend with API_BASE:
```powershell
# Create .env file
echo "VITE_API_BASE=https://<api-id>.execute-api.us-west-2.amazonaws.com/prod" > .env
```

Or set GitHub secret for automatic deployment:
- **Name:** `VITE_API_BASE`
- **Value:** `https://<api-id>.execute-api.us-west-2.amazonaws.com/prod`

## Verification Checklist

After deployment, verify:

- [ ] Backend deploys successfully
- [ ] API_BASE URL obtained
- [ ] `/health` endpoint responds
- [ ] `/meta` endpoint lists all endpoints
- [ ] Register test user works
- [ ] Login returns JWT token
- [ ] Authenticated endpoints work with token
- [ ] CORS headers present
- [ ] Frontend can connect to API

## Sample curl Commands

Once deployed, test with:

```powershell
# Set API_BASE
$env:API_BASE = "https://your-api.execute-api.us-west-2.amazonaws.com/prod"

# Health check
Invoke-RestMethod -Uri "$API_BASE/health" -Method Get

# Register test user
Invoke-RestMethod -Uri "-X" -Method Post -Headers @{
    "Content-Type" = "application/json"
    "Content-Type" = "application/json"
    "Authorization" = "Bearer YOUR_TOKEN"
} -Body '{ "email": "test@example.com", "password": "testpass123", "username": "testuser", "displayName": "Test User" }' -ContentType 'application/json'```

## Related Files

- Backend code: [PR #146](https://github.com/gcolon75/Project-Valine/pull/146)
- Deployment guide: [DEPLOYMENT.md](https://github.com/gcolon75/Project-Valine/blob/main/DEPLOYMENT.md)
- API documentation: [serverless/API_DOCUMENTATION.md](https://github.com/gcolon75/Project-Valine/blob/main/serverless/API_DOCUMENTATION.md)
- Verification artifacts: Branch `automaton/phase-02-backend-verify`
  - `logs/agent/backend-phase-02-summary.txt`
  - `logs/agent/backend-endpoints-check.json`
  - `docs/api-dev.md`

## Estimated Resolution Time

- Database setup: 15-30 minutes
- Configure secret: 5 minutes
- Deployment: 5-10 minutes
- Verification: 15-20 minutes

**Total: 45-75 minutes**

## Priority

**Critical** - Blocks Phase 02B verification and frontend-backend integration

---

**Note to Repository Owner:** Please create this issue in the GitHub repository. The agent cannot create issues directly but has prepared this template for you.
