# User Testing Guide

This guide covers testing procedures for Project Valine, including account creation and feature testing.

## Account Creation

### Prerequisites
- DATABASE_URL environment variable set
- Node.js installed
- Backend deployed (for production testing)

### Create Owner Account
```powershell
# Replace YOUR_USER, YOUR_PASS, YOUR_HOST, YOUR_DATABASE with real values
$env:DATABASE_URL = "postgresql://YOUR_USER:YOUR_PASS@YOUR_HOST:5432/YOUR_DATABASE?sslmode=require"

node scripts/provision-production-accounts.mjs \
  --email=ghawk075@gmail.com \
  --password=YourSecurePassword123! \
  --name="Gabriel Colon"
```

### Create Friend Account
```powershell
node scripts/provision-production-accounts.mjs \
  --email=[FRIEND_EMAIL] \
  --password=FriendSecurePassword123! \
  --name="[Friend Name]"
```

### Alternative: Using admin-upsert-user.mjs
```powershell
node scripts/admin-upsert-user.mjs \
  --email=ghawk075@gmail.com \
  --password=YourSecurePassword123! \
  --display-name="Gabriel Colon"
```

## Local Development Testing

### 1. Quick Start with Dev Bypass
```powershell
# Copy dev environment
cp client/.env.local.example client/.env.local

# Start dev server
npm run dev

# You're auto-logged in as Dev User
```

### 2. Test with Real Auth
```powershell
# Update .env.local
VITE_ENABLE_DEV_BYPASS=false
VITE_ENABLE_AUTH=true
VITE_API_BASE=http://localhost:3001

# Start backend (separate terminal)
cd serverless
npm run dev

# Start frontend
npm run dev

# Use real credentials to login
```

## Testing Checklist

### Registration & Login

- [ ] Visit frontend URL
- [ ] Try to register with allowlisted email → Should succeed
- [ ] Try to register with non-allowlisted email → Should fail with appropriate message
- [ ] Login with created account
- [ ] Verify redirected to onboarding (first time) or dashboard

### Onboarding Flow

- [ ] Complete onboarding form
- [ ] Select role/interests
- [ ] Set profile picture (if available)
- [ ] Verify onboarding completion flag is set

### Profile Management

- [ ] View own profile
- [ ] Edit profile (bio, headline, location)
- [ ] Edit profile links (social media)
- [ ] Upload profile picture (if implemented)
- [ ] Verify changes persist after logout/login

### Dashboard & Navigation

- [ ] Dashboard loads without errors
- [ ] Navigation works (all menu items)
- [ ] Mobile navigation works
- [ ] Logout works correctly

### Post Creation (if implemented)

- [ ] Create text-only post
- [ ] View post in feed
- [ ] Edit post (if implemented)
- [ ] Delete post (if implemented)

### Notifications

- [ ] View notifications page
- [ ] Mark notifications as read (if implemented)

## Weekly Testing Schedule

### Monday-Tuesday
- Account creation & profiles
- Onboarding flow
- Profile editing

### Wednesday-Thursday
- Post creation & feed
- Navigation & dashboard
- Mobile responsiveness

### Friday
- Full user journey (register → profile → posts)
- Cross-browser testing
- Performance check

## Testing Environments

### Local Development
```
Frontend: http://localhost:5173
Backend: http://localhost:3001
Database: Local PostgreSQL or SQLite
```

### Staging
```
Frontend: https://[staging-cloudfront].cloudfront.net
Backend: https://[staging-api].execute-api.us-west-2.amazonaws.com
Database: Staging RDS instance
```

### Production
```
Frontend: https://dkmxy676d3vgc.cloudfront.net
Backend: https://wkndtj22ab.execute-api.us-west-2.amazonaws.com
Database: Production RDS instance
```

## Verification Scripts

### Health Check
```powershell
# Test API health
Invoke-RestMethod -Uri "https://YOUR_API_URL/health" -Method Get
```

### Login Test
```powershell
# Test login endpoint
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{"email":"ghawk075@gmail.com","password":"YourPassword123!"}' -ContentType 'application/json'
```

### Full Verification
```powershell
# Run comprehensive verification
node scripts/verify-production-deployment.mjs
```

## Browser Testing

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] iOS Safari
- [ ] Chrome for Android

### Responsive Breakpoints
- [ ] Mobile (< 640px)
- [ ] Tablet (640px - 1024px)
- [ ] Desktop (> 1024px)

## Accessibility Testing

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Enter/Space activates buttons/links
- [ ] Escape closes modals
- [ ] Focus visible on all elements

### Screen Reader
- [ ] Page titles announce correctly
- [ ] Form labels read properly
- [ ] Error messages announced
- [ ] Navigation structure clear

## Performance Testing

### Lighthouse Audit
```powershell
npm run seo:audit
```

### Key Metrics
- [ ] Performance score > 80
- [ ] First Contentful Paint < 2s
- [ ] Time to Interactive < 5s
- [ ] No CLS (Cumulative Layout Shift) issues

## Troubleshooting

### Login Fails
1. Check browser console for errors
2. Verify email is in allowlist
3. Check Network tab for API errors
4. Verify backend is running
5. Check CORS configuration

### White Screen
1. Check browser console for errors
2. Verify build completed successfully
3. Check VITE_API_BASE is correct
4. Clear browser cache

### Profile Not Saving
1. Check Network tab for API errors
2. Verify authentication token is valid
3. Check backend logs
4. Verify database connection

## Related Documentation

- [DEV_MODE.md](./DEV_MODE.md) - Development mode
- [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md) - Deployment
- [ALLOWED_USERS.md](./ALLOWED_USERS.md) - User allowlist
- [scripts/verify-production-deployment.mjs](./scripts/verify-production-deployment.mjs) - Verification script
