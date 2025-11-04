# Quick Deploy Reference - Phase 1.2

**Goal:** Deploy Project Valine backend to AWS in 30-45 minutes.

---

## Prerequisites

```bash
# Verify prerequisites
node --version          # Should be 20.x or later
aws sts get-caller-identity  # Should show your AWS account
```

---

## Step 1: Supabase Database (10 min)

1. **Create Account:** Go to [supabase.com](https://supabase.com) → Sign up with GitHub
2. **Create Project:** 
   - Name: `project-valine-dev`
   - Region: Choose closest to you (us-west-1 for West Coast)
   - Password: Generate and save
   - Plan: Free tier
3. **Get Connection String:**
   - Settings → Database → Connection string
   - Use **Transaction pooler** (port 6543, NOT 5432)
   - Copy URI tab
4. **Save and Test:**
   ```bash
   export DATABASE_URL="postgresql://postgres.[REF]:[PASS]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
   echo $DATABASE_URL  # Verify it's set
   psql "$DATABASE_URL" -c "SELECT version();"  # Test connection
   ```

---

## Step 2: Setup Database (5 min)

```bash
cd ~/Project-Valine  # Or wherever your repo is
export DATABASE_URL="..."  # From Step 1
./scripts/deployment/setup-database.sh
```

**Expected:** ✅ Database is ready! (5 tables created)

**Verify (optional):**
```bash
cd api
npx prisma studio  # Opens http://localhost:5555
```

---

## Step 3: Deploy Backend (10 min)

```bash
cd ~/Project-Valine
export DATABASE_URL="..."  # Make sure it's still set
./scripts/deployment/deploy-backend.sh --stage dev --region us-west-2
```

**Expected:** ✅ Backend deployed successfully! + API Gateway URL

**Save API URL:**
```bash
export API_BASE="https://[API-ID].execute-api.us-west-2.amazonaws.com/dev"
echo $API_BASE  # Verify
```

---

## Step 4: Test Endpoints (5 min)

```bash
export API_BASE="..."  # From Step 3
./scripts/deployment/test-endpoints.sh
```

**Expected:** ✅ All tests passing

**Quick manual test:**
```bash
curl "$API_BASE/health"
# Should return: {"ok":true,"status":"healthy"}
```

---

## Troubleshooting

### Database Issues
```bash
# Wrong port? Check for :6543 not :5432
echo $DATABASE_URL | grep ":6543"

# Test connection
psql "$DATABASE_URL" -c "SELECT 1;"
```

### AWS Issues
```bash
# Check credentials
aws sts get-caller-identity

# View logs
cd serverless
npx serverless logs -f createUser --stage dev --tail
```

### API Issues
```bash
# Test health endpoint
curl "$API_BASE/health"

# Check specific endpoint
curl -v "$API_BASE/users/testuser"
```

---

## Success Checklist

- [ ] Database connection works
- [ ] 5 tables exist (users, posts, connection_requests, scripts, auditions)
- [ ] Backend deployed to AWS
- [ ] API Gateway URL saved
- [ ] Health check returns 200
- [ ] Can create users (POST /users returns 201)
- [ ] Can list posts (GET /posts returns 200)

---

## Full Documentation

For detailed step-by-step instructions with screenshots and explanations:
- **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** - Complete deployment guide
- **[scripts/deployment/README.md](scripts/deployment/README.md)** - Script documentation

---

## Common Commands

```bash
# View Lambda logs
cd serverless
npx serverless logs -f FUNCTION_NAME --stage dev --tail

# Redeploy after changes
./scripts/deployment/deploy-backend.sh --stage dev --region us-west-2

# Test specific endpoint
curl -X POST "$API_BASE/users" -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","displayName":"Test User"}'

# View database in browser
cd api
npx prisma studio
```

---

**Estimated Time:** 30-45 minutes total

**Last Updated:** October 30, 2025
