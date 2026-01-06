# Deployment Checklist

Use this checklist to ensure a successful deployment of Project Valine.

## Pre-Deployment Checklist

### Prerequisites

- [ ] Node.js 20.x or later installed
- [ ] npm 9.x or later installed
- [ ] AWS CLI installed and configured
- [ ] Serverless Framework 3.x installed globally (`npm i -g serverless@3`)
- [ ] AWS credentials configured with appropriate permissions
- [ ] Database provisioned (PostgreSQL/MySQL recommended)
- [ ] Database connection string available

### Configuration

- [ ] DATABASE_URL environment variable documented
- [ ] AWS_REGION decided (default: us-west-2)
- [ ] Deployment stage decided (dev/staging/prod)
- [ ] GitHub secrets configured for CI/CD (if using)

## Phase 1: Database Setup

- [ ] Set DATABASE_URL environment variable
  ```powershell
$env:DATABASE_URL = "postgresql://user:password@host:5432/valine_db"
  ```
- [ ] Run database setup script
  ```powershell
  ./scripts/deployment/setup-database.sh
  ```
- [ ] Verify Prisma client generated successfully
- [ ] Verify migrations applied successfully
- [ ] Verify database tables created:
  - [ ] `users` table exists
  - [ ] `posts` table exists
  - [ ] `connection_requests` table exists
  - [ ] `scripts` table exists
  - [ ] `auditions` table exists
- [ ] Test database connection with Prisma Studio (optional)
  ```powershell
  cd api && npx prisma studio
  ```

## Phase 2: Backend Deployment

- [ ] Navigate to serverless directory or use deployment script
- [ ] Run deployment script
  ```powershell
  ./scripts/deployment/deploy-backend.sh --stage dev --region us-west-2
  ```
- [ ] Deployment completed without errors
- [ ] API Gateway URL obtained from deployment output
- [ ] Save API Gateway base URL
  ```powershell
$env:API_BASE = "https://YOUR-API-ID.execute-api.us-west-2.amazonaws.com/dev"
  ```
- [ ] All Lambda functions deployed:
  - [ ] api (health/hello/requests)
  - [ ] createUser
  - [ ] getUser
  - [ ] updateUser
  - [ ] createPost
  - [ ] listPosts
  - [ ] sendConnectionRequest
  - [ ] listConnectionRequests
  - [ ] approveConnectionRequest
  - [ ] rejectConnectionRequest

## Phase 3: API Testing

- [ ] Set API_BASE environment variable
- [ ] Run API testing script
  ```powershell
  ./scripts/deployment/test-endpoints.sh
  ```
- [ ] Health check endpoint returns 200
- [ ] Test user created successfully (201)
- [ ] Test user profile retrieved (200)
- [ ] Test post created successfully (201)
- [ ] Test posts listed successfully (200)
- [ ] Manual testing completed (if needed):
  - [ ] Create user via curl
  - [ ] Get user profile via curl
  - [ ] Create post via curl
  - [ ] List posts via curl
  - [ ] Send connection request via curl
  - [ ] List connection requests via curl
  - [ ] Approve connection request via curl

## Phase 4: Frontend Configuration

- [ ] Run frontend configuration script
  ```powershell
  ./scripts/deployment/configure-frontend.sh --api-url "$API_BASE"
  ```
- [ ] .env file created/updated with VITE_API_BASE
- [ ] Verify .env file contents
  ```powershell
  Get-Content .env
  ```
- [ ] API connectivity test passed (if curl available)

## Phase 5: Frontend Testing

- [ ] Install frontend dependencies (if not already done)
  ```powershell
  npm install
  ```
- [ ] Start development server
  ```powershell
  npm run dev
  ```
- [ ] Frontend loads at http://localhost:5173
- [ ] Test profile page
  - [ ] Navigate to `/profile/testuser`
  - [ ] Profile loads with real data from API
  - [ ] Avatar displays correctly
  - [ ] Display name shows correctly
  - [ ] Bio displays correctly
  - [ ] Posts section shows test post
- [ ] Test dashboard
  - [ ] Navigate to `/dashboard`
  - [ ] Feed shows posts from API
  - [ ] Test post appears in feed
  - [ ] Author information displays
  - [ ] Media renders correctly
  - [ ] Timestamp displays
- [ ] Test connection requests page
  - [ ] Navigate to `/requests`
  - [ ] Connection requests display (if any)
  - [ ] Accept button functional
  - [ ] API calls succeed in Network tab
- [ ] Test graceful degradation
  - [ ] Stop API or set invalid VITE_API_BASE
  - [ ] Reload dashboard
  - [ ] Verify fallback to mock data (no crash)
  - [ ] No critical errors in console
- [ ] Browser console has no errors

## Phase 6: Production Build

- [ ] Build frontend for production
  ```powershell
  npm run build
  ```
- [ ] Build completed successfully
- [ ] Preview production build
  ```powershell
  npm run preview
  ```
- [ ] Production build works correctly

## Phase 7: Production Deployment

### Backend Production

- [ ] Set production DATABASE_URL
  ```powershell
$env:DATABASE_URL = "postgresql://prod-user:prod-pass@prod-host:5432/valine_prod"
  ```
- [ ] Run production database migrations
  ```powershell
  cd api
  npx prisma migrate deploy
  ```
- [ ] Deploy backend to production stage
  ```powershell
  ./scripts/deployment/deploy-backend.sh --stage prod --region us-west-2
  ```
- [ ] Save production API URL
- [ ] Test production API endpoints

### Frontend Production

- [ ] Set VITE_API_BASE GitHub secret/variable
  - [ ] Using GitHub CLI: `gh secret set VITE_API_BASE --body "..."`
  - [ ] Or manually in GitHub Settings → Secrets and variables → Actions
- [ ] Trigger frontend deployment
  - [ ] Push to main branch, or
  - [ ] Manually trigger workflow in GitHub Actions, or
  - [ ] Use Discord bot command (if available)
- [ ] Verify deployment succeeded
- [ ] Test production frontend URL

## Post-Deployment Verification

### Backend Verification

- [ ] All API endpoints respond correctly
- [ ] Lambda functions have no errors in CloudWatch
- [ ] Database connections working
- [ ] CORS headers configured correctly
- [ ] No cold start timeout issues
- [ ] API response times acceptable (<2s)

### Frontend Verification

- [ ] Frontend loads correctly
- [ ] All pages accessible
- [ ] API integration working
- [ ] No console errors
- [ ] Network requests succeed
- [ ] Images/media load correctly
- [ ] Navigation works

### Infrastructure Verification

- [ ] Lambda functions exist in AWS Console
- [ ] API Gateway configured correctly
- [ ] CloudWatch logs available
- [ ] Database accessible from Lambda
- [ ] S3 bucket configured (for frontend)
- [ ] CloudFront distribution working (for frontend)

## Security Review

- [ ] CORS restricted to actual domain (not `*`) in production
- [ ] DATABASE_URL not exposed in frontend
- [ ] No secrets committed to git
- [ ] Environment variables properly configured
- [ ] AWS IAM permissions minimal and appropriate
- [ ] Database uses SSL connection in production

## Monitoring Setup

- [ ] CloudWatch logs enabled for all Lambda functions
- [ ] CloudWatch alarms configured:
  - [ ] Error rate alarm
  - [ ] Latency alarm
  - [ ] Invocation count alarm
- [ ] CloudWatch dashboard created (optional)
- [ ] Error tracking configured (e.g., Sentry)
- [ ] Log retention period set appropriately

## Documentation

- [ ] Deployment documented for team
- [ ] API endpoints documented
- [ ] Environment variables documented
- [ ] Troubleshooting guide available
- [ ] Runbook created for common issues

## Rollback Plan

- [ ] Previous version tagged in git
- [ ] Rollback procedure documented
- [ ] Database migration rollback tested
- [ ] Quick rollback command available:
  ```powershell
  # Backend
  cd serverless && npx serverless deploy --stage prod --verbose
  
  # Frontend
  # Trigger previous version deployment
  ```

## Success Criteria

All of these should be true:

- [x] ✅ Backend API accessible at AWS API Gateway URL
- [x] ✅ Database tables created and queryable
- [x] ✅ All test API calls return expected responses
- [x] ✅ Frontend loads real data from backend
- [x] ✅ Profile page displays user information
- [x] ✅ Dashboard shows post feed
- [x] ✅ Connection requests functional
- [x] ✅ No breaking errors in production
- [x] ✅ CloudWatch logs show successful invocations
- [x] ✅ No security vulnerabilities exposed

## Common Issues and Solutions

### Issue: Database connection failed
- [ ] Verify DATABASE_URL format
- [ ] Check database allows connections from Lambda IPs
- [ ] Verify security group rules
- [ ] Test connection with psql/mysql client

### Issue: Module not found: @prisma/client
- [ ] Run `cd api && npx prisma generate`
- [ ] Run `cd serverless && npm install`
- [ ] Redeploy backend

### Issue: CORS errors in browser
- [ ] Verify CORS headers in handler functions
- [ ] Check API Gateway CORS configuration
- [ ] Test with OPTIONS request

### Issue: Lambda timeout
- [ ] Increase timeout in serverless.yml (default 6s → 30s)
- [ ] Check database query performance
- [ ] Consider Prisma Data Proxy for connection pooling

### Issue: Frontend shows "Loading..." forever
- [ ] Check browser console for errors
- [ ] Verify VITE_API_BASE in .env
- [ ] Test API directly with curl
- [ ] Check Lambda logs in CloudWatch

## Notes

- Keep this checklist updated as deployment process evolves
- Use for both initial deployment and updates
- Share with team members
- Document any issues encountered and solutions

## Estimated Time

- Development deployment: 30-60 minutes
- Production deployment: 1-2 hours (with testing)
- Subsequent deployments: 10-15 minutes

---

Last Updated: October 29, 2025
