# UX Deployment Checklist

A quick reference guide for deploying frontend/UX changes to production.

## Pre-Deployment

### Code Review
- [ ] Visual review in dev mode (`npm run dev`)
- [ ] Test all new/changed screens
- [ ] Check responsive design (mobile, tablet, desktop)
- [ ] Verify accessibility (keyboard nav, screen readers)
- [ ] No console errors in browser DevTools
- [ ] Build passes locally (`npm run build`)

### Environment Check
- [ ] `VITE_DEV_BYPASS_AUTH` is NOT `true`
- [ ] `VITE_ENABLE_DEV_BYPASS` is NOT `true`
- [ ] `VITE_API_BASE` points to production API
- [ ] `VITE_FRONTEND_URL` matches production domain

## Deployment

### Quick Deploy (One Command)

```powershell
# Set environment variables
$env:VITE_API_BASE = "https://YOUR_API_GATEWAY_URL"
$env:S3_BUCKET = "your-s3-bucket-name"
$env:CLOUDFRONT_DISTRIBUTION_ID = "your-distribution-id"

# Run deployment
./scripts/deploy-ux-only.sh
```

### Manual Deploy Steps

If you need more control:

```powershell
# 1. Set environment
$env:NODE_ENV = "production"
$env:VITE_API_BASE = "https://YOUR_API_URL"

# 2. Build
npm run build

# 3. Upload to S3
aws s3 sync dist s3://$S3_BUCKET --delete

# 4. Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
  --paths "/*"
```

## Post-Deployment

### Immediate Verification
- [ ] Visit live site in incognito window
- [ ] Check that pages load without errors
- [ ] Open browser DevTools → Console → No errors
- [ ] Open browser DevTools → Network → No failed requests
- [ ] Test login flow (if authentication pages changed)

### Functionality Testing
- [ ] Test changed pages/features
- [ ] Test on mobile device or responsive mode
- [ ] Verify forms submit correctly
- [ ] Check navigation works

### Performance
- [ ] Lighthouse score acceptable (Performance > 80)
- [ ] No visible layout shifts
- [ ] Images load properly

## Rollback (if needed)

### Quick Rollback

```powershell
# Checkout previous working commit
git checkout PREVIOUS_COMMIT_SHA

# Rebuild and redeploy
./scripts/deploy-ux-only.sh

# Return to main branch
git checkout main
```

### Manual Rollback

```powershell
# If you have a backup in S3:
aws s3 sync s3://YOUR_BUCKET/backup/ s3://YOUR_BUCKET/ --delete
aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
  --paths "/*"
```

## Common Issues

### White Screen

1. Check browser console for errors
2. Verify `VITE_API_BASE` is correct
3. Check S3 bucket contains `index.html`
4. Verify CloudFront origin is configured correctly

### API Errors

1. Verify `VITE_API_BASE` matches production API
2. Check CORS configuration on backend
3. Verify API Gateway is healthy
4. Check Lambda function logs in CloudWatch

### Old Version Still Showing

1. CloudFront cache may not be invalidated
2. Run invalidation again:
   ```powershell
   aws cloudfront create-invalidation \
     --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
     --paths "/*"
   ```
3. Wait 5-10 minutes for propagation
4. Clear browser cache (Ctrl+Shift+R)

### Assets Not Loading

1. Check S3 bucket permissions
2. Verify CloudFront distribution is enabled
3. Check for mixed content (HTTP vs HTTPS)
4. Verify file paths in built bundle

## Environment Variables Reference

| Variable | Production Value | Purpose |
|----------|------------------|---------|
| `VITE_API_BASE` | `https://xxx.execute-api.region.amazonaws.com` | Backend API URL |
| `VITE_FRONTEND_URL` | `https://xxx.cloudfront.net` | Frontend URL for CORS |
| `VITE_ENABLE_AUTH` | `true` | Enable authentication |
| `VITE_DEV_BYPASS_AUTH` | `false` | MUST be false in prod |
| `VITE_ENABLE_DEV_BYPASS` | `false` | MUST be false in prod |
| `S3_BUCKET` | Your bucket name | S3 bucket for hosting |
| `CLOUDFRONT_DISTRIBUTION_ID` | Your distribution ID | CloudFront distribution |

## Related Documentation

- [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md) - Full deployment guide
- [DEV_MODE.md](./DEV_MODE.md) - Development mode documentation
- [scripts/deploy-ux-only.sh](./scripts/deploy-ux-only.sh) - Deployment script
