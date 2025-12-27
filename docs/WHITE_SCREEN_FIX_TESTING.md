# White Screen Fix - Testing and Verification Guide

## Overview

This document provides step-by-step instructions to test and verify the white screen fixes and error instrumentation implemented in this PR.

## Prerequisites

- Access to AWS account with S3 and CloudFront
- Node.js and npm installed
- AWS CLI configured
- A test environment separate from production

## Testing Checklist

### 1. Build Validation Tests

#### Test 1.1: Normal Build
```powershell
npm run build
```

**Expected Result:**
- Build completes successfully
- Post-build validation passes with message: "✅ Build validation passed - output looks good!"
- `dist/index.html` contains properly formatted `<script type="module" src="/assets/index-[hash].js">` tag
- No local filesystem paths (C:\, C:/) in index.html

#### Test 1.2: Simulated Corrupted Build
```powershell
# After build, manually corrupt the index.html
echo '<script type="module" cd="" c:\temp\frontend-fixts="" index-cdu5hbqs.js=""></script>' > dist/index.html

# Run validation
node scripts/postbuild-validate.js
```

**Expected Result:**
- Validation fails with error: "BUILD VALIDATION FAILED: Module script tag has malformed attributes"
- Exit code 1

#### Test 1.3: Source Maps Generated
```powershell
npm run build
ls -la dist/assets/*.js.map
```

**Expected Result:**
- Source map files (.js.map) exist for each JavaScript bundle
- Source maps have correct references to original source files

### 2. Error Boundary Tests

#### Test 2.1: Unit Tests
```powershell
npm test -- ErrorBoundary.test.jsx --run
```

**Expected Result:**
- All 7 tests pass
- No console errors (except expected error logs from testing)

#### Test 2.2: Manual UI Test
Create a test component that throws an error:

1. Edit `src/pages/Discover.jsx` temporarily:
```jsx
// Add at the top of the component
if (window.location.search.includes('test-error')) {
  throw new Error('Test error for ErrorBoundary');
}
```

2. Start dev server:
```powershell
npm run dev
```

3. Navigate to `http://localhost:3000/discover?test-error=1`

**Expected Result:**
- Page shows ErrorBoundary fallback UI with:
  - Red warning icon
  - "Oops! Something went wrong" heading
  - Friendly error message
  - "Try Again" and "Reload Page" buttons
  - "Back to Home" link
  - Error details (in development mode)

4. Click "Try Again" - page attempts to re-render
5. Click "Reload Page" - page reloads
6. Click "Back to Home" - navigates to home page

**Remember to remove the test error code after testing!**

### 3. Client-Side Error Instrumentation Tests

#### Test 3.1: Error Logging in Browser Console

1. Start dev server: `npm run dev`
2. Open browser DevTools Console
3. In the console, trigger an error:
```javascript
throw new Error('Test client error');
```

4. Check the console for error batching logs (should appear after 5 seconds or when batch is full)

**Expected Result:**
- Error is captured by global error handler
- After 5 seconds, you may see a POST request to `/internal/observability/log` (will fail in dev if backend not running)

#### Test 3.2: Unhandled Promise Rejection

1. In browser console:
```javascript
Promise.reject(new Error('Test promise rejection'));
```

**Expected Result:**
- Unhandled rejection is captured
- Error is batched and sent to backend

#### Test 3.3: Manual Error Logging

1. In browser console:
```javascript
window.__errorInstrumentation.logError(new Error('Manual test error'), { 
  custom: 'context',
  user: 'test-user'
});
```

**Expected Result:**
- Error is logged with custom context
- Batched and sent to backend

### 4. Backend Error Logging Tests

**Note:** Requires backend to be deployed

#### Test 4.1: Single Error Log
```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{ "level": "error", "message": "Test error from curl", "context": {"source": "manual-test"} }' -ContentType 'application/json'
```

**Expected Result:**
- Returns 204 status code
- Check CloudWatch logs for the entry:
```powershell
aws logs tail /aws/lambda/pv-api-prod-logEvent --follow
```

#### Test 4.2: Batched Client Errors
```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{ "source": "client", "timestamp": "' -ContentType 'application/json'
```

**Expected Result:**
- Returns 204 status code
- CloudWatch logs show batched errors with all details

### 5. Deployment Tests

#### Test 5.1: Deploy Script Dry Run

Check the deploy script is executable and has correct syntax:
```powershell
bash -n scripts/deploy-static-with-mime.sh
echo $?  # Should output 0
```

#### Test 5.2: Deploy to Test S3 Bucket

**IMPORTANT:** Use a test bucket, not production!

```powershell
# Create test bucket if needed
aws s3 mb s3://test-valine-frontend

# Deploy
S3_BUCKET=test-valine-frontend \
./scripts/deploy-static-with-mime.sh
```

**Expected Result:**
- Script uploads all files successfully
- Shows progress for each step
- Skips CloudFront invalidation (if distribution ID not provided)

#### Test 5.3: Verify MIME Types

```powershell
# Check index.html
aws s3api head-object --bucket test-valine-frontend --key index.html

# Check a JS file (replace hash)
aws s3api head-object --bucket test-valine-frontend --key assets/index-[hash].js

# Check CSS file
aws s3api head-object --bucket test-valine-frontend --key assets/index-[hash].css
```

**Expected Results:**
- `index.html`:
  - ContentType: `text/html; charset=utf-8`
  - CacheControl: `no-cache, no-store, must-revalidate`
  
- JS files:
  - ContentType: `application/javascript; charset=utf-8`
  - CacheControl: `public, max-age=31536000, immutable`
  
- CSS files:
  - ContentType: `text/css; charset=utf-8`
  - CacheControl: `public, max-age=31536000, immutable`

#### Test 5.4: CloudFront Deployment with Invalidation

```powershell
S3_BUCKET=test-valine-frontend \
CLOUDFRONT_DISTRIBUTION_ID=E1234567890ABC \
./scripts/deploy-static-with-mime.sh
```

**Expected Result:**
- Deployment completes successfully
- CloudFront invalidation created
- Invalidation ID displayed
- Can check status with provided AWS CLI command

### 6. End-to-End Browser Tests

#### Test 6.1: Fresh Browser (No Cache)

1. Deploy to test environment
2. Open browser in Incognito/Private mode
3. Navigate to your test URL
4. Open DevTools → Network tab
5. Check responses:

**Expected Results:**
- `index.html`: Status 200, Content-Type: `text/html`
- `assets/*.js`: Status 200, Content-Type: `application/javascript`
- `assets/*.css`: Status 200, Content-Type: `text/css`
- No "Unexpected token '<'" errors in console
- No MIME type errors in console
- Application loads successfully

#### Test 6.2: Cached Browser

1. Reload page (Ctrl+R or Cmd+R)
2. Check Network tab

**Expected Results:**
- `index.html`: Status 200 (not cached due to no-cache header)
- `assets/*.js`: Status 304 (from browser cache) or 200 (from CloudFront cache)
- No errors, application works

#### Test 6.3: Hard Refresh

1. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. Check Network tab

**Expected Results:**
- All assets fetch fresh (Status 200)
- Application works correctly

### 7. Error Monitoring in Production

After deploying to production:

#### Test 7.1: Monitor Client Errors

```powershell
# Tail CloudWatch logs
aws logs tail /aws/lambda/pv-api-prod-logEvent --follow
```

In another terminal, visit your site and trigger an error (e.g., manually in console):
```javascript
window.__errorInstrumentation.logError(new Error('Production test error'), {
  test: true
});
```

**Expected Result:**
- Error appears in CloudWatch logs within 5-30 seconds
- Log includes: timestamp, source:client, url, userAgent, error details

### 8. Rollback Test

If something goes wrong:

```powershell
# List S3 versions
aws s3api list-object-versions \
  --bucket your-bucket \
  --prefix index.html

# Copy previous version (use a version ID from above)
aws s3api copy-object \
  --bucket your-bucket \
  --copy-source your-bucket/index.html?versionId=VERSION_ID \
  --key index.html

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

**Expected Result:**
- Previous version restored
- CloudFront serves old version after invalidation completes

## Common Issues and Solutions

### Issue: "vite: command not found" during build
**Solution:** Run `npm install` first

### Issue: Deploy script fails with "AWS CLI not found"
**Solution:** Install AWS CLI: https://aws.amazon.com/cli/

### Issue: Deploy script fails with "Access Denied"
**Solution:** 
- Check AWS credentials: `aws sts get-caller-identity`
- Verify S3 bucket permissions
- Verify CloudFront distribution permissions

### Issue: Error instrumentation not sending errors
**Solution:**
- Check browser DevTools Network tab for failed requests
- Verify API_BASE is set correctly in environment
- Check CORS settings allow POST to /internal/observability/log

### Issue: Source maps not loading in production
**Solution:**
- Ensure source maps uploaded to S3
- Check Content-Type is `application/json`
- Verify source map files have correct CORS headers

## Success Criteria

✅ All tests pass  
✅ Build generates clean index.html with no local paths  
✅ ErrorBoundary catches and displays errors gracefully  
✅ Client errors are batched and sent to backend  
✅ Backend logs client errors to CloudWatch  
✅ Deployment script sets correct MIME types  
✅ CloudFront invalidation works  
✅ No white screen issues for external users  
✅ Source maps available for debugging  

## Additional Notes

- Keep this document updated as new tests are added
- Always test in a non-production environment first
- Monitor CloudWatch logs after deployment for any unexpected errors
- Consider setting up automated E2E tests for critical paths
