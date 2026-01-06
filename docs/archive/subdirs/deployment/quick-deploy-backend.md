# Quick Deploy - Backend API

## 🚀 5-Minute Deployment Guide

### Prerequisites
- ✅ AWS Account + credentials configured
- ✅ PostgreSQL database URL
- ✅ Node.js 20.x installed

### Step 1: Set Environment (30 seconds)
```powershell
$env:DATABASE_URL = "postgresql://user:password@host:5432/database"
$env:AWS_REGION = "us-west-2"
$env:STAGE = "dev"
```

### Step 2: Install & Setup (2 minutes)
```powershell
# Install dependencies
cd serverless && npm install && cd ../api && npm install && cd ..

# Generate Prisma Client
cd api && npx prisma generate && cd ..

# Run migrations
cd api && npx prisma migrate deploy && cd ..
```

### Step 3: Deploy (2 minutes)
```powershell
cd serverless
npx serverless deploy --stage dev --region us-west-2
```

### Step 4: Get API URL (30 seconds)
Copy the API URL from deployment output:
```
https://abc123xyz.execute-api.us-west-2.amazonaws.com/dev
```

### Step 5: Test (30 seconds)
```powershell
$env:API_BASE = "your-api-url-here"
Invoke-RestMethod -Uri "$API_BASE/health" -Method Get
```

### Step 6: Configure Frontend (30 seconds)
```powershell
echo "VITE_API_BASE=$API_BASE" > client/.env
```

---

## 📝 Quick Commands

```powershell
# Full deployment from project root
$env:DATABASE_URL = "postgresql://..."
cd api && npx prisma generate && npx prisma migrate deploy && cd ../serverless
npm install && npx serverless deploy --stage dev

# Test endpoints
$env:API_BASE = "https://..."
Invoke-RestMethod -Uri "$API_BASE/health" -Method Get
cd serverless && ./test-endpoints.sh "$API_BASE"

# View logs
npx serverless logs -f register --tail

# Remove deployment
npx serverless remove --stage dev
```

---

## 📚 Full Documentation

- **API Reference**: `serverless/API_DOCUMENTATION.md`
- **Deployment Guide**: `BACKEND_DEPLOYMENT_INSTRUCTIONS.md`
- **Summary**: `BACKEND_PHASE_02_SUMMARY.md`

---

## 🎯 What You Get

28 fully functional API endpoints:
- Authentication (register, login, me)
- Reels (CRUD, likes, bookmarks, comments)
- Conversations & Messages
- Notifications
- Users & Posts
- Connection Requests
- Health & Meta

JWT authentication, CORS enabled, pagination, error handling - all included!

---

**Need help?** See `BACKEND_DEPLOYMENT_INSTRUCTIONS.md` for detailed step-by-step guide.
