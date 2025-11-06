# Environment Variables Matrix

## Overview
Comprehensive matrix of all environment variables used across Project Valine environments, with security classifications and configuration guidance.

**Last Updated**: 2025-11-05  
**Owner**: DevOps & Security Team  
**Applies To**: Development, Staging, Production

---

## Table of Contents
- [Variable Classification](#variable-classification)
- [Frontend Variables](#frontend-variables)
- [Backend/API Variables](#backend-api-variables)
- [Database Variables](#database-variables)
- [Third-Party Services](#third-party-services)
- [Security & Auth](#security--auth)
- [Monitoring & Logging](#monitoring--logging)
- [Configuration by Environment](#configuration-by-environment)

---

## Variable Classification

### Security Levels

| Level | Description | Examples | Storage |
|-------|-------------|----------|---------|
| 🔴 **SECRET** | Sensitive credentials | API keys, tokens, passwords | AWS Secrets Manager / Parameter Store |
| 🟡 **PRIVATE** | Internal config | Service URLs, feature flags | Environment variables |
| 🟢 **PUBLIC** | Safe to expose | Public API endpoints, CDN URLs | Committed to repo (.env.example) |

### Naming Conventions

```bash
# Format: {SCOPE}_{SERVICE}_{PURPOSE}
VITE_API_BASE            # Frontend variable (VITE_ prefix for Vite access)
API_JWT_SECRET           # Backend variable (no prefix)
DATABASE_URL             # Standard convention
AWS_ACCESS_KEY_ID        # Third-party service convention
```

---

## Frontend Variables

### Build-time Variables (Vite)
All frontend variables must be prefixed with `VITE_` to be accessible in the browser.

| Variable | Level | Default (Dev) | Description |
|----------|-------|---------------|-------------|
| `VITE_API_BASE` | 🟢 | `http://localhost:3001` | Backend API base URL |
| `VITE_API_INTEGRATION` | 🟢 | `false` | Enable real API vs MSW mocks |
| `VITE_API_USE_CREDENTIALS` | 🟢 | `false` | Send cookies with API requests |
| `VITE_USE_MSW` | 🟢 | `false` | Enable Mock Service Worker |
| `VITE_ENABLE_PROFILE_LINKS_API` | 🟢 | `false` | Enable profile links backend integration |
| `VITE_CDN_URL` | 🟢 | `https://cdn.valine.app` | CDN for static assets |
| `VITE_MEDIA_BUCKET` | 🟢 | `valine-media-dev` | S3 bucket for media uploads |
| `VITE_SANITY_PROJECT_ID` | 🟢 | *(required)* | Sanity.io project ID |
| `VITE_SANITY_DATASET` | 🟢 | `development` | Sanity.io dataset name |
| `VITE_SANITY_API_VERSION` | 🟢 | `2023-05-03` | Sanity.io API version |
| `VITE_GOOGLE_ANALYTICS_ID` | 🟢 | *(optional)* | Google Analytics tracking ID |
| `VITE_SENTRY_DSN` | 🟡 | *(optional)* | Sentry error tracking DSN |
| `VITE_ENABLE_CSP` | 🟢 | `false` | Enable Content Security Policy |
| `VITE_APP_VERSION` | 🟢 | *(auto)* | Application version (from package.json) |

**Example `.env.local`** (Development):
```bash
# API Configuration
VITE_API_BASE=http://localhost:3001
VITE_API_INTEGRATION=false
VITE_USE_MSW=true

# Sanity CMS
VITE_SANITY_PROJECT_ID=abc123xyz
VITE_SANITY_DATASET=development

# Optional
VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

---

## Backend/API Variables

### Core Configuration

| Variable | Level | Default (Dev) | Description |
|----------|-------|---------------|-------------|
| `NODE_ENV` | 🟢 | `development` | Environment: development, staging, production |
| `PORT` | 🟢 | `3001` | Server port |
| `API_BASE_URL` | 🟢 | `http://localhost:3001` | Full API URL (for callbacks) |
| `CORS_ORIGIN` | 🟡 | `http://localhost:5173` | Allowed CORS origins (comma-separated) |
| `CORS_CREDENTIALS` | 🟢 | `true` | Allow credentials in CORS |
| `LOG_LEVEL` | 🟢 | `debug` | Logging level: debug, info, warn, error |
| `ENABLE_REQUEST_LOGGING` | 🟢 | `true` | Log all HTTP requests |

**Example `.env`** (Backend Development):
```bash
NODE_ENV=development
PORT=3001
API_BASE_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:5173,http://localhost:4173
LOG_LEVEL=debug
```

---

## Database Variables

| Variable | Level | Default (Dev) | Description |
|----------|-------|---------------|-------------|
| `DATABASE_URL` | 🔴 | *(required)* | PostgreSQL connection string |
| `DATABASE_POOL_MIN` | 🟢 | `2` | Minimum pool connections |
| `DATABASE_POOL_MAX` | 🟢 | `10` | Maximum pool connections |
| `DATABASE_TIMEOUT` | 🟢 | `30000` | Query timeout (ms) |
| `DATABASE_SSL` | 🟢 | `false` (dev), `true` (prod) | Require SSL for database |
| `REDIS_URL` | 🔴 | *(optional)* | Redis connection string (caching) |
| `REDIS_TTL` | 🟢 | `3600` | Default Redis TTL (seconds) |

**Connection String Format**:
```bash
# PostgreSQL
DATABASE_URL=postgresql://username:password@host:5432/database?schema=public

# With SSL (production)
DATABASE_URL=postgresql://username:password@host:5432/database?schema=public&sslmode=require

# Redis
REDIS_URL=redis://username:password@host:6379/0
```

**Development**:
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/valine_dev
```

**Production** (use AWS RDS):
```bash
# Store in AWS Secrets Manager
aws secretsmanager create-secret \
  --name /valine/prod/database-url \
  --secret-string "postgresql://valine_user:SECURE_PASSWORD@valine-prod.cluster-abc123.us-east-1.rds.amazonaws.com:5432/valine"
```

---

## Third-Party Services

### AWS

| Variable | Level | Default | Description |
|----------|-------|---------|-------------|
| `AWS_REGION` | 🟢 | `us-east-1` | AWS region |
| `AWS_ACCESS_KEY_ID` | 🔴 | *(required for local)* | AWS access key (use IAM roles in prod) |
| `AWS_SECRET_ACCESS_KEY` | 🔴 | *(required for local)* | AWS secret key |
| `AWS_S3_BUCKET` | 🟢 | `valine-media-dev` | S3 bucket for media |
| `AWS_CLOUDFRONT_DOMAIN` | 🟢 | *(optional)* | CloudFront distribution domain |

### Email Service (SendGrid / SES)

| Variable | Level | Default | Description |
|----------|-------|---------|-------------|
| `EMAIL_PROVIDER` | 🟢 | `sendgrid` | Email provider: sendgrid, ses, smtp |
| `SENDGRID_API_KEY` | 🔴 | *(optional)* | SendGrid API key |
| `AWS_SES_REGION` | 🟢 | `us-east-1` | SES region |
| `EMAIL_FROM` | 🟢 | `noreply@valine.app` | Default sender email |
| `EMAIL_FROM_NAME` | 🟢 | `Valine` | Default sender name |

### Sanity.io (CMS)

| Variable | Level | Default | Description |
|----------|-------|---------|-------------|
| `SANITY_PROJECT_ID` | 🟢 | *(required)* | Sanity project ID |
| `SANITY_DATASET` | 🟢 | `production` | Sanity dataset |
| `SANITY_API_TOKEN` | 🔴 | *(optional)* | Sanity API token (for write operations) |
| `SANITY_API_VERSION` | 🟢 | `2023-05-03` | Sanity API version |

### Analytics & Monitoring

| Variable | Level | Default | Description |
|----------|-------|---------|-------------|
| `GOOGLE_ANALYTICS_ID` | 🟢 | *(optional)* | Google Analytics tracking ID |
| `SENTRY_DSN` | 🟡 | *(optional)* | Sentry error tracking DSN |
| `SENTRY_ENVIRONMENT` | 🟢 | `${NODE_ENV}` | Sentry environment label |
| `SENTRY_TRACES_SAMPLE_RATE` | 🟢 | `0.1` | Performance monitoring sample rate |
| `CLOUDWATCH_LOG_GROUP` | 🟢 | `/aws/lambda/valine-api-${stage}` | CloudWatch log group |

---

## Security & Auth

### JWT & Sessions

| Variable | Level | Default | Description |
|----------|-------|---------|-------------|
| `JWT_SECRET` | 🔴 | *(required)* | JWT signing secret (32+ chars) |
| `JWT_EXPIRY` | 🟢 | `7d` | JWT expiration time |
| `JWT_REFRESH_EXPIRY` | 🟢 | `30d` | Refresh token expiration |
| `SESSION_SECRET` | 🔴 | *(required)* | Session cookie secret |
| `SESSION_COOKIE_NAME` | 🟢 | `valine_session` | Session cookie name |
| `SESSION_COOKIE_SECURE` | 🟢 | `true` (prod) | Require HTTPS for cookies |
| `SESSION_COOKIE_SAME_SITE` | 🟢 | `lax` | SameSite cookie attribute |

**Generate Secrets**:
```bash
# Generate JWT secret
openssl rand -base64 32

# Or with Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Encryption

| Variable | Level | Default | Description |
|----------|-------|---------|-------------|
| `ENCRYPTION_KEY` | 🔴 | *(required)* | Master encryption key (32 bytes) |
| `ENCRYPTION_ALGORITHM` | 🟢 | `aes-256-gcm` | Encryption algorithm |

### Rate Limiting

| Variable | Level | Default | Description |
|----------|-------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | 🟢 | `60000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX_REQUESTS` | 🟢 | `100` | Max requests per window |
| `RATE_LIMIT_SKIP_SUCCESSFUL` | 🟢 | `false` | Count only failed requests |
| `LOGIN_RATE_LIMIT_MAX` | 🟢 | `5` | Max login attempts per minute |
| `API_RATE_LIMIT_MAX` | 🟢 | `1000` | Max API requests per minute |

### CSP & Security Headers

| Variable | Level | Default | Description |
|----------|-------|---------|-------------|
| `ENABLE_CSP` | 🟢 | `false` (dev), `true` (prod) | Enable Content Security Policy |
| `CSP_REPORT_ONLY` | 🟢 | `true` (staging), `false` (prod) | CSP report-only mode |
| `CSP_REPORT_URI` | 🟢 | `/api/csp-report` | CSP violation report endpoint |

---

## Monitoring & Logging

| Variable | Level | Default | Description |
|----------|-------|---------|-------------|
| `LOG_LEVEL` | 🟢 | `info` | Logging level |
| `LOG_FORMAT` | 🟢 | `json` | Log format: json, pretty |
| `ENABLE_AUDIT_LOGS` | 🟢 | `true` | Enable audit logging |
| `ENABLE_PERFORMANCE_MONITORING` | 🟢 | `true` (prod) | Enable performance tracking |
| `METRICS_PORT` | 🟢 | `9090` | Prometheus metrics port |

---

## Configuration by Environment

### Development

**Frontend** (`.env.local`):
```bash
# API
VITE_API_BASE=http://localhost:3001
VITE_API_INTEGRATION=false
VITE_USE_MSW=true

# Services
VITE_SANITY_PROJECT_ID=abc123xyz
VITE_SANITY_DATASET=development
VITE_CDN_URL=http://localhost:5173

# Features
VITE_ENABLE_CSP=false
```

**Backend** (`.env`):
```bash
# Core
NODE_ENV=development
PORT=3001
API_BASE_URL=http://localhost:3001

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/valine_dev

# Security (dev keys only!)
JWT_SECRET=dev_jwt_secret_change_in_production
ENCRYPTION_KEY=dev_encryption_key_change_in_prod

# Logging
LOG_LEVEL=debug
LOG_FORMAT=pretty
```

### Staging

**Frontend** (Amplify environment variables):
```bash
VITE_API_BASE=https://api-staging.valine.app
VITE_API_INTEGRATION=true
VITE_SANITY_PROJECT_ID=abc123xyz
VITE_SANITY_DATASET=staging
VITE_CDN_URL=https://cdn-staging.valine.app
VITE_ENABLE_CSP=true
VITE_SENTRY_DSN=https://...@sentry.io/...
```

**Backend** (AWS Lambda environment variables):
```bash
NODE_ENV=staging
API_BASE_URL=https://api-staging.valine.app
CORS_ORIGIN=https://staging.valine.app

# Database (from Secrets Manager)
DATABASE_URL=arn:aws:secretsmanager:us-east-1:123456789:secret:valine-staging-db

# Security (from Secrets Manager)
JWT_SECRET=arn:aws:secretsmanager:us-east-1:123456789:secret:valine-staging-jwt
ENCRYPTION_KEY=arn:aws:secretsmanager:us-east-1:123456789:secret:valine-staging-enc

# Email
EMAIL_PROVIDER=ses
AWS_SES_REGION=us-east-1
EMAIL_FROM=noreply-staging@valine.app

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=staging
LOG_LEVEL=info

# CSP
ENABLE_CSP=true
CSP_REPORT_ONLY=true
```

### Production

**Frontend** (Amplify environment variables):
```bash
VITE_API_BASE=https://api.valine.app
VITE_API_INTEGRATION=true
VITE_SANITY_PROJECT_ID=abc123xyz
VITE_SANITY_DATASET=production
VITE_CDN_URL=https://cdn.valine.app
VITE_ENABLE_CSP=true
VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
VITE_SENTRY_DSN=https://...@sentry.io/...
```

**Backend** (AWS Lambda environment variables):
```bash
NODE_ENV=production
API_BASE_URL=https://api.valine.app
CORS_ORIGIN=https://valine.app,https://www.valine.app

# Database (from Secrets Manager)
DATABASE_URL=arn:aws:secretsmanager:us-east-1:123456789:secret:valine-prod-db
DATABASE_SSL=true
DATABASE_POOL_MAX=20

# Security (from Secrets Manager)
JWT_SECRET=arn:aws:secretsmanager:us-east-1:123456789:secret:valine-prod-jwt
JWT_EXPIRY=7d
ENCRYPTION_KEY=arn:aws:secretsmanager:us-east-1:123456789:secret:valine-prod-enc

# Email
EMAIL_PROVIDER=ses
AWS_SES_REGION=us-east-1
EMAIL_FROM=noreply@valine.app

# Rate Limiting (stricter in prod)
LOGIN_RATE_LIMIT_MAX=3
API_RATE_LIMIT_MAX=500

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.05
LOG_LEVEL=warn
LOG_FORMAT=json
ENABLE_AUDIT_LOGS=true

# CSP
ENABLE_CSP=true
CSP_REPORT_ONLY=false
CSP_REPORT_URI=/api/csp-report

# Session
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAME_SITE=strict
```

---

## Secret Management

### AWS Secrets Manager

**Store Secret**:
```bash
# Create secret
aws secretsmanager create-secret \
  --name /valine/prod/jwt-secret \
  --description "JWT signing secret for production" \
  --secret-string "$(openssl rand -base64 32)"

# Retrieve secret (for Lambda)
aws secretsmanager get-secret-value \
  --secret-id /valine/prod/jwt-secret \
  --query SecretString \
  --output text
```

**Lambda Function Access**:
```javascript
// Retrieve from Secrets Manager
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager"

async function getSecret(secretName) {
  const client = new SecretsManagerClient({ region: process.env.AWS_REGION })
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName })
  )
  return response.SecretString
}

// Cache in Lambda runtime
let cachedJwtSecret = null

export async function getJwtSecret() {
  if (!cachedJwtSecret) {
    cachedJwtSecret = await getSecret(process.env.JWT_SECRET)
  }
  return cachedJwtSecret
}
```

### AWS Systems Manager Parameter Store

**Alternative to Secrets Manager** (cheaper for non-rotating secrets):
```bash
# Store parameter
aws ssm put-parameter \
  --name /valine/prod/api-url \
  --value "https://api.valine.app" \
  --type String

# Store encrypted parameter
aws ssm put-parameter \
  --name /valine/prod/database-url \
  --value "postgresql://..." \
  --type SecureString
```

---

## Security Best Practices

### DO ✅
- Use Secrets Manager for all sensitive credentials
- Rotate secrets regularly (JWT, encryption keys)
- Use IAM roles instead of access keys in AWS
- Never commit secrets to version control
- Use different secrets for each environment
- Generate random secrets with adequate entropy
- Enable encryption at rest for all secrets
- Audit secret access regularly

### DON'T ❌
- Hardcode secrets in application code
- Use same secrets across environments
- Share secrets via insecure channels (email, Slack)
- Log secrets (even partially)
- Use weak or predictable secrets
- Store secrets in plain text files
- Grant broad access to secret storage

---

## Validation & Testing

### Check Required Variables

```bash
#!/bin/bash
# scripts/check-env.sh

REQUIRED_VARS=(
  "DATABASE_URL"
  "JWT_SECRET"
  "ENCRYPTION_KEY"
)

missing=()
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    missing+=("$var")
  fi
done

if [ ${#missing[@]} -ne 0 ]; then
  echo "Error: Missing required environment variables:"
  printf '  - %s\n' "${missing[@]}"
  exit 1
fi

echo "✓ All required environment variables are set"
```

### Validate Secret Format

```javascript
// Validate JWT secret entropy
function validateJwtSecret(secret) {
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters')
  }
  
  // Check for placeholder values
  const forbidden = ['change', 'secret', 'dev', 'test', 'example']
  if (forbidden.some(word => secret.toLowerCase().includes(word))) {
    throw new Error('JWT_SECRET appears to be a placeholder value')
  }
}

// Validate database URL
function validateDatabaseUrl(url) {
  try {
    const parsed = new URL(url)
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
      throw new Error('DATABASE_URL must be a PostgreSQL connection string')
    }
    if (process.env.NODE_ENV === 'production' && !url.includes('sslmode=require')) {
      console.warn('Warning: DATABASE_URL does not require SSL in production')
    }
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL: ${error.message}`)
  }
}
```

---

## Troubleshooting

### Issue: Missing Environment Variable

**Error**: `process.env.DATABASE_URL is undefined`

**Solution**:
1. Check `.env` file exists and variable is defined
2. Restart development server to reload environment
3. Verify variable name spelling
4. Check if variable requires `VITE_` prefix (frontend)

### Issue: Secret Not Found in AWS

**Error**: `ResourceNotFoundException: Secret not found`

**Solution**:
1. Verify secret name/ARN is correct
2. Check IAM role has `secretsmanager:GetSecretValue` permission
3. Ensure secret exists in the correct region
4. Use AWS CLI to list secrets: `aws secretsmanager list-secrets`

### Issue: CORS Errors

**Error**: `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solution**:
1. Check `CORS_ORIGIN` matches frontend URL exactly
2. Ensure protocol (http/https) matches
3. Include port number if not standard (80/443)
4. For multiple origins, use comma-separated list

---

## Related Documentation
- [Deployment Guide](../deployment/deployment-guide.md)
- [Security Best Practices](../qa/security.md)
- [AWS Setup Guide](../deployment/aws-guide.md)
- [Secrets Management](./secrets-management.md)

---

**Version**: 1.0  
**Review Schedule**: Quarterly and before major releases  
**Last Reviewed**: 2025-11-05
