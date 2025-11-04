# Migration Guide - Profile & Settings Features

This guide walks through deploying the new profile and settings features to your Project Valine installation.

## Prerequisites

- PostgreSQL database with existing Project Valine schema
- AWS account with S3 bucket access
- Node.js 20.x
- Prisma CLI installed (`npm install -g prisma`)

## Step 1: Database Migration

### Development Environment

1. Navigate to the API directory:
```bash
cd api
```

2. Generate the migration:
```bash
npx prisma migrate dev --name add_profile_settings_models
```

3. Review the generated migration file in `api/prisma/migrations/`

4. Generate Prisma client:
```bash
npx prisma generate
```

### Production Environment

1. Set your production DATABASE_URL:
```bash
export DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
```

2. Deploy migrations:
```bash
cd api
npx prisma migrate deploy
```

3. Verify migration:
```bash
npx prisma migrate status
```

## Step 2: Set Up S3 Bucket

### Create S3 Bucket

1. Create a private S3 bucket for media uploads:
```bash
aws s3 mb s3://valine-media-uploads --region us-west-2
```

2. Enable versioning:
```bash
aws s3api put-bucket-versioning \
  --bucket valine-media-uploads \
  --versioning-configuration Status=Enabled
```

3. Configure CORS:

Create a file `cors.json`:
```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["PUT", "POST", "GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

Apply CORS configuration:
```bash
aws s3api put-bucket-cors \
  --bucket valine-media-uploads \
  --cors-configuration file://cors.json
```

4. Set bucket policy for Lambda access:

Create `bucket-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowLambdaAccess",
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::valine-media-uploads/*"
    }
  ]
}
```

Apply policy:
```bash
aws s3api put-bucket-policy \
  --bucket valine-media-uploads \
  --policy file://bucket-policy.json
```

### Configure CloudFront (Optional but Recommended)

1. Create CloudFront distribution:
```bash
aws cloudfront create-distribution \
  --origin-domain-name valine-media-uploads.s3.us-west-2.amazonaws.com \
  --default-root-object index.html
```

2. Note the CloudFront domain name for use in your application

## Step 3: Update Environment Variables

### Local Development

Update `.env`:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/valine"
MEDIA_BUCKET="valine-media-uploads"
AWS_REGION="us-west-2"
```

### Serverless Deployment

Update `serverless/.env` or set environment variables:
```bash
export DATABASE_URL="postgresql://..."
export MEDIA_BUCKET="valine-media-uploads"
export AWS_REGION="us-west-2"
export STAGE="prod"
```

## Step 4: Deploy Backend

1. Install dependencies:
```bash
cd serverless
npm install
```

2. Generate Prisma client:
```bash
npx prisma generate
```

3. Deploy to AWS:
```bash
npx serverless deploy --stage prod --region us-west-2
```

Or use the deployment script:
```bash
cd ..
./scripts/deployment/deploy-backend.sh --stage prod --region us-west-2
```

4. Note the API Gateway URL from deployment output

## Step 5: Update Frontend Configuration

Update your frontend API configuration to use the new API Gateway URL:

```javascript
// src/config/api.js
export const API_BASE_URL = process.env.VITE_API_URL || 'https://your-api-gateway-url.amazonaws.com/prod';
```

## Step 6: Test Deployment

### Test Health Endpoint

```bash
curl https://your-api-gateway-url.amazonaws.com/prod/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T00:00:00.000Z"
}
```

### Test Profile Creation

First, get an auth token (use existing login):
```bash
TOKEN=$(curl -X POST https://your-api-gateway-url.amazonaws.com/prod/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.token')
```

Create a profile:
```bash
curl -X POST https://your-api-gateway-url.amazonaws.com/prod/profiles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vanityUrl": "testuser",
    "headline": "Actor & Director",
    "roles": ["Actor", "Director"],
    "location": {"city": "Los Angeles", "state": "CA"}
  }'
```

### Test Media Upload Flow

1. Get upload URL:
```bash
UPLOAD_RESPONSE=$(curl -X POST https://your-api-gateway-url.amazonaws.com/prod/profiles/$PROFILE_ID/media/upload-url \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "video", "title": "Demo Reel"}')

UPLOAD_URL=$(echo $UPLOAD_RESPONSE | jq -r '.uploadUrl')
MEDIA_ID=$(echo $UPLOAD_RESPONSE | jq -r '.mediaId')
```

2. Upload file to S3:
```bash
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: video/mp4" \
  --upload-file test-video.mp4
```

3. Complete upload:
```bash
curl -X POST https://your-api-gateway-url.amazonaws.com/prod/profiles/$PROFILE_ID/media/complete \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"mediaId\": \"$MEDIA_ID\", \"width\": 1920, \"height\": 1080}"
```

### Run Full Test Suite

```bash
cd serverless
./test-profile-endpoints.sh https://your-api-gateway-url.amazonaws.com/prod $TOKEN
```

## Step 7: Monitor and Verify

### Check CloudWatch Logs

```bash
# List log groups
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/pv-api"

# Tail logs for a specific function
aws logs tail /aws/lambda/pv-api-prod-createProfile --follow
```

### Check Database

```bash
# Connect to database
psql $DATABASE_URL

# Verify new tables exist
\dt

# Check profiles
SELECT * FROM profiles LIMIT 5;

# Check media
SELECT * FROM media LIMIT 5;

# Check credits
SELECT * FROM credits LIMIT 5;
```

### Monitor S3 Bucket

```bash
# List objects
aws s3 ls s3://valine-media-uploads/profiles/ --recursive

# Check bucket size
aws s3 ls s3://valine-media-uploads --recursive --summarize
```

## Rollback Plan

If you need to rollback:

### Rollback Backend

```bash
cd serverless
npx serverless remove --stage prod --region us-west-2
```

### Rollback Database

1. Create a backup before migration:
```bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

2. Restore from backup:
```bash
psql $DATABASE_URL < backup-YYYYMMDD.sql
```

Or rollback specific migration:
```bash
cd api
npx prisma migrate resolve --rolled-back MIGRATION_NAME
```

### Cleanup S3

```bash
# List and delete uploaded files
aws s3 rm s3://valine-media-uploads/profiles/ --recursive

# Delete bucket (if needed)
aws s3 rb s3://valine-media-uploads --force
```

## Common Issues

### Issue: Prisma Client Not Found

**Solution:**
```bash
cd serverless
npx prisma generate
```

### Issue: S3 Access Denied

**Solution:** Verify IAM role has S3 permissions:
```json
{
  "Effect": "Allow",
  "Action": [
    "s3:GetObject",
    "s3:PutObject",
    "s3:DeleteObject"
  ],
  "Resource": "arn:aws:s3:::valine-media-uploads/*"
}
```

### Issue: CORS Errors

**Solution:** Verify CORS configuration on S3 bucket and API Gateway:
```bash
aws s3api get-bucket-cors --bucket valine-media-uploads
```

### Issue: Database Connection Errors

**Solution:** Verify DATABASE_URL is set correctly and connection pooling:
```bash
# Check connection
psql $DATABASE_URL -c "SELECT 1;"

# Update connection string with connection limit
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=5"
```

## Performance Optimization

### Database Indexes

The migration automatically creates indexes for:
- Profile vanity URLs
- Profile roles
- Media profile and type
- Credit years
- Search fields

Verify indexes:
```sql
SELECT tablename, indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('profiles', 'media', 'credits', 'user_settings', 'reel_requests');
```

### S3 and CloudFront

- Use CloudFront for media delivery
- Enable S3 Transfer Acceleration for faster uploads
- Configure appropriate cache policies

### Lambda Configuration

Update Lambda memory and timeout if needed:
```yaml
# serverless.yml
provider:
  memorySize: 1024
  timeout: 30
```

## Security Checklist

- [ ] Database connection uses SSL
- [ ] S3 bucket is private (not public)
- [ ] CloudFront uses signed URLs for private content
- [ ] API Gateway has rate limiting enabled
- [ ] Environment variables are encrypted at rest
- [ ] IAM roles follow least privilege principle
- [ ] Audit logging is enabled for private media access

## Next Steps

After successful deployment:

1. **Implement Background Processing:**
   - Set up Lambda or ECS for video transcoding
   - Configure SQS queues for async processing
   - Add SNS notifications for processing completion

2. **Add Search Indexing:**
   - Set up Elasticsearch/OpenSearch
   - Configure real-time indexing
   - Add search analytics

3. **Monitoring and Alerts:**
   - Set up CloudWatch alarms
   - Configure error notifications
   - Add performance dashboards

4. **Rate Limiting:**
   - Implement API throttling
   - Add rate limiting for request endpoints
   - Configure DDoS protection

5. **Backup Strategy:**
   - Set up automated database backups
   - Configure S3 versioning and lifecycle policies
   - Test restore procedures

## Support

For issues or questions:
- Check CloudWatch logs
- Review API documentation in `API_PROFILE_SETTINGS.md`
- Run test script: `./test-profile-endpoints.sh`
- Check Prisma migrations: `npx prisma migrate status`

## Changelog

- **2024-01-15:** Initial deployment guide
- Added profile, media, credits, settings, and search features
- S3 and CloudFront configuration
- Migration scripts and testing procedures
