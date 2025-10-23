# Project-Valine Deployment Verification

This document provides an overview of the deployment verification system for Project-Valine.

## Overview

The Project-Valine repository now includes a comprehensive verification system to validate deployments across all components:

- **Frontend**: React + Vite application deployed to S3 and CloudFront
- **Backend API**: Lambda functions accessible via API Gateway
- **Discord Integration**: Bot and webhook functionality
- **Infrastructure**: AWS resources (S3, CloudFront, API Gateway)

## Quick Start

### Minimal Verification (No Credentials Required)

Verify repository configuration and files:

```bash
./scripts/verify-deployment.sh --skip-aws --skip-discord
```

**Output**:
- ✓ GitHub Actions workflow files
- ✓ Environment configuration files (.env.example)
- ✓ Discord configuration templates

### Full Verification (AWS Credentials Required)

Verify complete deployment:

```bash
./scripts/verify-deployment.sh \
  --s3-bucket your-bucket-name \
  --cloudfront-id E1234567890ABC \
  --api-base https://api-id.execute-api.us-west-2.amazonaws.com \
  --discord-webhook-url "https://discord.com/api/webhooks/..." \
  --discord-bot-token "your-bot-token" \
  --discord-channel-id "1234567890"
```

**Output**:
- ✓ All repository checks
- ✓ S3 bucket contents and caching headers
- ✓ CloudFront distribution status and invalidations
- ✓ Frontend URL accessibility (HTTP 200)
- ✓ API health endpoints (`/health`, `/hello`)
- ✓ Discord webhook and bot functionality

## What Gets Verified

### A) GitHub Actions and Repository

| Check | Description | Pass Criteria |
|-------|-------------|---------------|
| Workflow File | `.github/workflows/client-deploy.yml` exists | File present |
| Root Config | `.env.example` contains `VITE_API_BASE` | Variable defined |
| Discord Config | `orchestrator/.env.example` has Discord vars | Both `DISCORD_PUBLIC_KEY` and `DISCORD_BOT_TOKEN` present |

### B) S3 and CloudFront (Requires AWS Credentials)

| Check | Description | Pass Criteria |
|-------|-------------|---------------|
| S3 Bucket Access | Bucket exists and readable | `aws s3 ls` succeeds |
| Frontend Files | `index.html` and `assets/` present | Files exist in bucket |
| HTML Caching | HTML files have no-cache header | `Cache-Control: no-cache` |
| Asset Caching | Asset files have public cache header | `Cache-Control: public, max-age=300` |
| Distribution Status | CloudFront distribution exists | Status is "Deployed" |
| Invalidations | Recent invalidations completed | At least one invalidation found |
| Domain Name | CloudFront domain retrieved | Valid domain name |

### C) Frontend and API

| Check | Description | Pass Criteria |
|-------|-------------|---------------|
| Frontend HTTP | Frontend URL returns 200 | HTTP status 200 |
| Frontend Content | Valid HTML served | HTML tags present |
| API Health | `/health` endpoint responds | HTTP 200 with JSON |
| API Hello | `/hello` endpoint responds | HTTP 200 with message |
| JSON Structure | API responses valid | Contains expected fields |

### D) Discord Integration

| Check | Description | Pass Criteria |
|-------|-------------|---------------|
| Webhook POST | Webhook accepts messages | HTTP 204 or 200 |
| Bot Auth | Bot token valid | HTTP 200 from Discord API |
| Bot Message | Bot can send messages | Message posted successfully |
| Channel Access | Bot has channel permissions | No 403 errors |

## Exit Codes

- **0**: All checks passed (or all skipped)
- **1**: One or more checks failed

Use in CI/CD pipelines:

```bash
if ./scripts/verify-deployment.sh $ARGS; then
  echo "Deployment verified successfully"
else
  echo "Deployment verification failed"
  exit 1
fi
```

## Documentation

| Document | Purpose |
|----------|---------|
| [scripts/verify-deployment.sh](scripts/verify-deployment.sh) | Main verification script |
| [scripts/VERIFICATION_GUIDE.md](scripts/VERIFICATION_GUIDE.md) | Detailed usage guide and troubleshooting |
| [scripts/verify-deployment-example.sh](scripts/verify-deployment-example.sh) | Interactive examples |
| [scripts/README.md](scripts/README.md) | Scripts directory overview |

## Common Use Cases

### 1. Post-Deployment Verification

After deploying via GitHub Actions:

```yaml
# .github/workflows/client-deploy.yml
jobs:
  deploy:
    steps:
      # ... deployment steps ...
      
      - name: Verify Deployment
        run: |
          ./scripts/verify-deployment.sh \
            --s3-bucket ${{ secrets.S3_BUCKET }} \
            --cloudfront-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --api-base ${{ secrets.VITE_API_BASE }}
```

### 2. Manual Verification

For manual deployment verification:

```bash
# Set environment variables
export S3_BUCKET="my-valine-frontend"
export CLOUDFRONT_ID="E1234567890ABC"
export API_BASE="https://api.execute-api.us-west-2.amazonaws.com"

# Run verification
./scripts/verify-deployment.sh \
  --s3-bucket "$S3_BUCKET" \
  --cloudfront-id "$CLOUDFRONT_ID" \
  --api-base "$API_BASE"
```

### 3. Scheduled Health Check

Create a cron job for periodic verification:

```bash
# Run every hour
0 * * * * cd /path/to/Project-Valine && ./scripts/verify-deployment.sh --skip-discord
```

### 4. Discord-Only Verification

Test Discord integration separately:

```bash
./scripts/verify-deployment.sh \
  --discord-webhook-url "$WEBHOOK_URL" \
  --discord-bot-token "$BOT_TOKEN" \
  --discord-channel-id "$CHANNEL_ID" \
  --skip-aws
```

## Integration Patterns

### Pre-Production Validation

```bash
#!/bin/bash
# Validate staging before promoting to production

echo "Validating staging deployment..."
./scripts/verify-deployment.sh \
  --s3-bucket "$STAGING_BUCKET" \
  --cloudfront-id "$STAGING_CF_ID" \
  --api-base "$STAGING_API" \
  --skip-discord

if [ $? -eq 0 ]; then
  echo "Staging validated. Promoting to production..."
  # Promotion logic here
else
  echo "Staging validation failed. Aborting promotion."
  exit 1
fi
```

### Rollback Detection

```bash
#!/bin/bash
# Check if rollback is needed after deployment

DEPLOY_TIME=$(date +%s)

# Wait for deployment to propagate
sleep 30

if ! ./scripts/verify-deployment.sh $ARGS; then
  echo "Deployment verification failed. Initiating rollback..."
  # Rollback logic here
  exit 1
fi
```

### Multi-Region Verification

```bash
#!/bin/bash
# Verify deployments across multiple regions

REGIONS=("us-west-2" "us-east-1" "eu-west-1")

for region in "${REGIONS[@]}"; do
  echo "Verifying $region..."
  ./scripts/verify-deployment.sh \
    --s3-bucket "valine-$region" \
    --cloudfront-id "${CF_IDS[$region]}" \
    --api-base "https://api-$region.amazonaws.com"
done
```

## Monitoring and Alerting

### Success Metrics

Track verification results over time:

```bash
# Log verification results
RESULT_FILE="/var/log/valine-verification.log"
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S")

./scripts/verify-deployment.sh $ARGS > /tmp/verify.log 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "$TIMESTAMP: PASS" >> "$RESULT_FILE"
else
  echo "$TIMESTAMP: FAIL" >> "$RESULT_FILE"
  # Send alert
fi
```

### Alert Integration

Send alerts on verification failure:

```bash
#!/bin/bash
# verify-and-alert.sh

if ! ./scripts/verify-deployment.sh $ARGS; then
  # Send to Slack
  curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"❌ Deployment verification failed"}' \
    "$SLACK_WEBHOOK_URL"
  
  # Send to Discord
  curl -X POST -H 'Content-type: application/json' \
    --data '{"content":"❌ Deployment verification failed"}' \
    "$DISCORD_WEBHOOK_URL"
  
  exit 1
fi
```

## Best Practices

1. **Run After Every Deployment**: Make verification part of your deployment process
2. **Use in CI/CD**: Integrate with GitHub Actions for automated verification
3. **Secure Credentials**: Use GitHub Secrets and environment variables
4. **Selective Checks**: Use skip flags when full verification isn't needed
5. **Regular Testing**: Run periodic health checks to catch drift
6. **Log Results**: Keep a history of verification results
7. **Alert on Failures**: Set up notifications for verification failures

## Troubleshooting

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "AWS CLI not found" | AWS CLI not installed | `sudo apt-get install awscli` or `brew install awscli` |
| "No AWS credentials" | Credentials not configured | Run `aws configure` or set environment variables |
| "S3 bucket not accessible" | Wrong bucket name or no permissions | Verify bucket name and IAM permissions |
| "CloudFront 403" | S3 bucket policy issue | Check CloudFront Origin Access Identity |
| "API 000 error" | Network/DNS issue | Verify API URL and network connectivity |
| "Discord 401" | Invalid bot token | Regenerate token in Discord Developer Portal |
| "Discord 403" | Missing permissions | Re-invite bot with proper permissions |

See [scripts/VERIFICATION_GUIDE.md](scripts/VERIFICATION_GUIDE.md) for detailed troubleshooting.

## Security Considerations

1. **Never Commit Secrets**: Use environment variables or GitHub Secrets
2. **Limit Token Scope**: Discord bot should have minimal required permissions
3. **Rotate Credentials**: Regularly rotate AWS credentials and Discord tokens
4. **Audit Logs**: Monitor who runs verifications and when
5. **Rate Limiting**: Script includes delays for Discord API rate limits

## Support

- **Documentation**: [scripts/VERIFICATION_GUIDE.md](scripts/VERIFICATION_GUIDE.md)
- **Examples**: [scripts/verify-deployment-example.sh](scripts/verify-deployment-example.sh)
- **Issues**: https://github.com/gcolon75/Project-Valine/issues
- **Main README**: [README.md](README.md)

## License

This verification system is part of the Project-Valine repository and follows the same license.
