# Smoke Test Checklist - Project Valine

**Purpose:** Run before every production deploy to catch critical regressions.

**Duration:** ~5 minutes

**Rollback Triggers:** Any ❌ result requires immediate investigation or rollback.

---

## Pre-Deploy Verification

- [ ] Backend deployed successfully (no errors in CloudWatch)
- [ ] Frontend build completed (`dist/` generated)
- [ ] Database migrations applied (`npx prisma migrate deploy`)
- [ ] Environment variables verified (no missing secrets)
- [ ] CloudFront invalidation triggered (`/*`)

---

## Critical User Flows (5 minutes)

### 1. Authentication
- [ ] **Signup** with allowlisted email → account created
- [ ] **Login** with existing account → dashboard loads
- [ ] **Logout** → redirected to home page
- [ ] **Session persistence** → refresh page while logged in → still logged in

### 2. Profile
- [ ] **View profile** → profile page loads with correct data
- [ ] **Edit profile** → changes persist after save
- [ ] **Upload avatar** → image uploads and displays

### 3. Posts
- [ ] **Create post** → post appears in feed
- [ ] **View post detail** → click "View" → /posts/:id loads
- [ ] **Like post** → like count increases
- [ ] **Delete post** → post removed from feed

### 4. Navigation
- [ ] **Dashboard** → loads feed
- [ ] **Messages** → inbox loads
- [ ] **Notifications** → notification list loads
- [ ] **Settings** → settings page loads

### 5. Deep Links
- [ ] Hard refresh on `/dashboard` → page loads (not 404)
- [ ] Hard refresh on `/posts/:id` → post detail loads (not 404)
- [ ] Open deep link in incognito → works

---

## API Health Checks

Run these commands in PowerShell:

```powershell
# Health check
curl https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/health

# Auth endpoint
curl https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com/auth/me `
  -H "Cookie: accessToken=YOUR_TOKEN"
```

```powershell
# Test database connection
cd C:\Users\ghawk\Documents\GitHub\Project-Valine\api
npx prisma db execute --stdin <<EOF
SELECT 1;
EOF
```

---

## Rollback Procedure

```powershell
# Backend rollback
cd C:\Users\ghawk\Documents\GitHub\Project-Valine\serverless
npx serverless rollback --stage prod --region us-west-2 --timestamp <PREVIOUS_TIMESTAMP>

# Frontend rollback
# Restore previous S3 version or re-deploy previous commit
git checkout <PREVIOUS_COMMIT>
npm ci
npm run build
aws s3 sync dist/ s3://valine-frontend-prod --delete
aws cloudfront create-invalidation --distribution-id E16LPJDBIL5DEE --paths "/*"
```

---

## Key Endpoints

- Frontend: https://dkmxy676d3vgc.cloudfront.net
- API: https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com

---

## References

- `docs/DEPLOYMENT_BIBLE.md` - Full deployment process
- `docs/USER_FLOWS.md` - User flows for context
- `docs/KANBAN_PROGRESS.md` - Current task status
