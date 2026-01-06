# Environment Variables Checklist

This document lists all environment variables required for Project Valine across backend (API) and frontend deployments.

## Backend Environment Variables (Serverless/Lambda)

### Required

- **`JWT_SECRET`**: Secret key for signing JWT tokens
  - **Example**: `your-secret-key-here-change-in-production`
  - **Environment**: All (dev, staging, prod)
  - **Security**: Must be unique per environment; keep secure

- **`DATABASE_URL`**: PostgreSQL connection string
  - **Format**: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`
  - **Example**: `postgresql://user:password@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/valine_db`
  - **Environment**: All (dev, staging, prod)
  - **Security**: Contains credentials; never commit to source control

- **`AWS_REGION`**: AWS region for services
  - **Example**: `us-west-2`
  - **Environment**: All (dev, staging, prod)
  - **Default**: `us-west-2`

- **`S3_BUCKET`**: S3 bucket name for media storage
  - **Example**: `project-valine-media-dev`
  - **Environment**: All (dev, staging, prod)
  - **Note**: Code falls back from `MEDIA_BUCKET` to `S3_BUCKET` if the former is not set

### Optional

- **`MEDIA_BUCKET`**: Alternative name for S3 media bucket (deprecated; use `S3_BUCKET`)
  - **Example**: `project-valine-media-dev`
  - **Note**: If both are set, `MEDIA_BUCKET` takes precedence

- **`EMAIL_ENABLED`**: Enable SMTP email sending
  - **Example**: `true` or `false`
  - **Default**: `false` (emails logged to console in dev)
  - **Environment**: Staging, prod (optional in dev)

- **`SMTP_HOST`**: SMTP server hostname (required if `EMAIL_ENABLED=true`)
  - **Example**: `smtp.sendgrid.net`

- **`SMTP_PORT`**: SMTP server port (required if `EMAIL_ENABLED=true`)
  - **Example**: `587`

- **`SMTP_USER`**: SMTP username (required if `EMAIL_ENABLED=true`)
  - **Example**: `apikey`

- **`SMTP_PASSWORD`**: SMTP password (required if `EMAIL_ENABLED=true`)
  - **Security**: Keep secure; never commit to source control

- **`FROM_EMAIL`**: Email address for outgoing emails
  - **Example**: `noreply@valine.com`

- **`STAGE`**: Deployment stage
  - **Example**: `dev`, `staging`, `prod`
  - **Default**: `dev`

## Frontend Environment Variables (Vite)

### Required

- **`VITE_API_BASE`**: Backend API base URL
  - **Local Development**: `http://localhost:3001`
  - **Staging**: `https://your-api-id.execute-api.us-west-2.amazonaws.com/dev`
  - **Production**: `https://your-api-id.execute-api.us-west-2.amazonaws.com/prod`
  - **Environment**: All (dev, staging, prod)

- **`VITE_ENABLE_AUTH`**: Enable real authentication enforcement
  - **Example**: `false` (dev), `true` (staging, prod)
  - **Default**: `false` (allows dev bypass)
  - **Environment**: All (dev, staging, prod)
  - **Note**: Set to `true` in staging/prod to enforce real authentication

### Optional

- **`VITE_SANITY_PROJECT_ID`**: Sanity CMS project ID (if using Sanity)
  - **Example**: `abc123xyz`

- **`VITE_SANITY_DATASET`**: Sanity dataset name (if using Sanity)
  - **Example**: `production`

## How to Set Environment Variables

### Local Development

1. Copy the example file:
   ```powershell
   cp .env.local.example .env
   ```

2. Update the values in `.env` with your local/dev settings

3. Restart the dev server after changing environment variables

### Serverless Backend (AWS Lambda)

Environment variables are set via:

1. **AWS Systems Manager (SSM) Parameter Store** (recommended for secrets):
   ```powershell
   aws ssm put-parameter \
     --name "/valine/dev/JWT_SECRET" \
     --type "SecureString" \
     --value "your-secret-key"
   ```

2. **serverless.yml environment section**:
   ```yaml
   provider:
     environment:
       AWS_REGION: us-west-2
       S3_BUCKET: ${ssm:/valine/${self:provider.stage}/S3_BUCKET}
   ```

3. **Serverless Framework CLI** (for deployment):
   ```powershell
   npx serverless deploy --stage dev
   ```

### Frontend (Vite/AWS Amplify)

1. **Local**: Set in `.env` file
2. **Amplify Console**: Set in "Environment variables" section of the app settings
3. **CI/CD**: Set in GitHub Secrets or pipeline environment

## Security Best Practices

- ✅ **Never commit** `.env` files to version control
- ✅ **Use different values** for JWT_SECRET across environments
- ✅ **Use SSM Parameter Store** or Secrets Manager for sensitive values in AWS
- ✅ **Rotate secrets** periodically (especially JWT_SECRET, database passwords)
- ✅ **Use HTTPS** for all API_BASE URLs in staging/prod
- ✅ **Enable EMAIL_ENABLED** only when SMTP credentials are properly configured

## Verification

To verify environment variables are set correctly:

```powershell
# Backend (Serverless)
cd serverless
npx serverless invoke local -f getUser --data '{"pathParameters":{"userId":"test"}}'

# Frontend (Local)
npm run dev
# Check console for API connection status

# Deployed API
./scripts/deployment/test-endpoints.sh
```

## Troubleshooting

### Frontend can't connect to API
- Check `VITE_API_BASE` is set correctly
- Verify backend is running (local) or deployed (staging/prod)
- Check browser console for CORS errors

### Authentication not working
- Verify `JWT_SECRET` is set in backend environment
- Check `VITE_ENABLE_AUTH` is set to `true` in staging/prod
- Ensure `DATABASE_URL` is accessible from Lambda

### Email verification not working
- Check `EMAIL_ENABLED=true` in backend
- Verify SMTP credentials (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`)
- Check logs for email sending errors

## References

- [.env.local.example](../../.env.local.example) - Frontend environment variables
- [serverless.yml](../../serverless/serverless.yml) - Backend deployment configuration
- [Deployment Guide](../deployment/serverless-guide.md) - Full deployment instructions
