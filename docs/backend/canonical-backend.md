# Canonical Backend Decision: Serverless Framework

**Date:** 2025-11-10  
**Status:** Active  
**Decision Makers:** Project Valine Team

## Summary

The **Serverless backend** (located in `/serverless`) is the canonical, production-grade API for Project Valine. All staging and production deployments must use this backend. The Express server in `/server` is maintained only for local development and testing.

## Decision

**We have chosen Serverless Framework as our canonical backend** for the following reasons:

### 1. Production Architecture

- **Auto-scaling**: AWS Lambda automatically scales based on demand
- **High availability**: Built-in redundancy across multiple availability zones
- **Serverless**: No infrastructure to maintain or patch
- **Cost-effective**: Pay only for actual usage, not idle capacity

### 2. AWS Integration

- **Native AWS services**: Direct integration with RDS, S3, SES, CloudWatch
- **API Gateway**: Built-in rate limiting, throttling, and request validation
- **Security**: IAM roles, VPC integration, encryption at rest and in transit
- **Monitoring**: CloudWatch Logs and X-Ray tracing out of the box

### 3. Development Workflow

- **Infrastructure as Code**: `serverless.yml` defines all resources
- **Easy deployment**: Single command deploys entire stack
- **Environment management**: Separate dev/staging/prod environments
- **Rollback capability**: Quick rollback to previous versions if needed

### 4. Security & Compliance

- **Hardened for production**: Security best practices built-in
- **Secrets management**: Integration with AWS Secrets Manager and SSM
- **HTTPS only**: All endpoints are TLS-encrypted
- **CORS properly configured**: Fine-grained control over allowed origins

## Implementation Status

### Completed Migrations ✅

All core API routes have been migrated to Serverless:

#### Authentication & Account Management
- `POST /auth/register` - User registration with email verification
- `POST /auth/login` - User login with JWT token
- `GET /auth/me` - Get current user profile
- `POST /auth/verify-email` - Email verification
- `POST /auth/resend-verification` - Resend verification email
- `POST /auth/logout` - User logout (token invalidation)

#### User Profiles
- `GET /profiles/:id` - Get user profile by ID
- `PATCH /profiles/:id` - Update user profile
- `GET /profiles/:id/links` - Get profile links
- `PUT /profiles/:id/links` - Batch update profile links

#### Media Management
- `POST /profiles/:id/media/upload-url` - Get S3 presigned URL for upload
- `POST /profiles/:id/media/complete` - Complete media upload and create record
- `GET /profiles/:id/media` - List user's media files
- `DELETE /profiles/:id/media/:mediaId` - Delete media file

#### Settings & Privacy
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update user settings
- `GET /api/account/export` - Export user data (GDPR compliance)
- `DELETE /api/account` - Delete user account

#### Content & Discovery
- `GET /search` - Global search
- `GET /search/users` - User-specific search
- `GET /reels` - List reels with filtering
- `GET /reels/:id` - Get specific reel
- `POST /reels/:id/like` - Like/unlike a reel
- `POST /reels/:id/request` - Request access to reel

### Express Server Status

The Express server (`/server`) is maintained for:

- **Local development**: Fast iteration without AWS deployment
- **Unit testing**: Integration tests for API logic
- **Prototyping**: Trying out new features before Serverless implementation

**It should NOT be deployed to staging or production.**

## Deployment Guidelines

### ✅ Correct: Deploy Serverless

```bash
# Deploy to staging
cd serverless
npx serverless deploy --stage staging

# Deploy to production
npx serverless deploy --stage prod
```

### ❌ Incorrect: Deploy Express

```bash
# DO NOT DO THIS
cd server
node index.js  # Only for local dev, never deploy
```

## Environment Configuration

### Serverless (Production/Staging)

Required environment variables (set via AWS SSM Parameter Store or Secrets Manager):

```yaml
# In serverless.yml or SSM
JWT_SECRET: ${ssm:/valine/${self:provider.stage}/JWT_SECRET}
DATABASE_URL: ${ssm:/valine/${self:provider.stage}/DATABASE_URL}
AWS_REGION: us-west-2
S3_BUCKET: ${ssm:/valine/${self:provider.stage}/S3_BUCKET}
```

### Express (Local Development Only)

Set in `server/.env`:

```bash
JWT_SECRET=dev-secret-change-in-production
DATABASE_URL=postgresql://user:pass@localhost:5432/valine_dev
AWS_REGION=us-west-2
S3_BUCKET=valine-media-dev-local
```

## Testing Strategy

### Serverless (Staging/Production)

```bash
# Run smoke tests against deployed API
export API_BASE="https://your-api.execute-api.us-west-2.amazonaws.com/staging"
./scripts/deployment/test-endpoints.sh

# Check orchestration analyzer
node scripts/analyze-orchestration-run.mjs
```

### Express (Local Development)

```bash
# Run unit tests
cd server
npm test

# Start local server
npm start
```

## Migration History

- **2025-11-08**: Completed authentication endpoints migration (PR #203)
- **2025-11-09**: Completed profile and media endpoints migration
- **2025-11-10**: Phase 1 - Officially declared Serverless as canonical backend

## Future Considerations

### Planned Enhancements

1. **Distributed rate limiting**: Add Redis/ElastiCache for cross-Lambda rate limiting
2. **OAuth integration**: Add social login (Google, GitHub, etc.)
3. **2FA UI**: Extend existing 2FA backend with frontend flows
4. **WebSocket support**: Real-time notifications via API Gateway WebSocket

### Express Server Future

The Express server will:

- **Continue**: Serve as local development tool
- **Not expand**: New features go in Serverless only
- **Eventually deprecate**: May archive when local Serverless Offline is sufficient

## Documentation References

- [Environment Variables Checklist](../agents/ENV_CHECKLIST.md)
- [Serverless Deployment Guide](../deployment/serverless-guide.md)
- [Security Guide](../security/guide.md)
- [Express Server README](../../server/README.md)

## Approval & Sign-off

This decision is effective immediately. All new API development must target the Serverless backend.

**Questions?** See [Contributing Guide](../../CONTRIBUTING.md) or open an issue.
