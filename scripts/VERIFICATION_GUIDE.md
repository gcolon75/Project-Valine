# Project-Valine Deployment Verification Guide

This guide explains how to use the `verify-deployment.sh` script to validate your Project-Valine frontend deployment and Discord integrations.

## Overview

The verification script performs comprehensive checks on:

1. **GitHub Actions and Repository**: Workflow files, environment examples, and configuration
2. **S3 and CloudFront**: Deployment artifacts, caching headers, and distribution status
3. **Frontend and API**: URL reachability, health endpoints, and API connectivity
4. **Discord Integrations**: Webhook functionality and bot message capabilities

## Prerequisites

### Required Tools

- `bash` (version 4.0+)
- `curl` (for HTTP checks)
- `jq` (for JSON processing)
- `aws` CLI (for S3/CloudFront checks, optional)

Install missing tools:

```bash
# On Ubuntu/Debian
sudo apt-get install curl jq awscli

# On macOS
brew install curl jq awscli

# On Windows (WSL)
sudo apt install curl jq awscli
```

### AWS Credentials (Optional)

For S3 and CloudFront verification, you need AWS credentials with read access to:

- S3 bucket (read and head-object permissions)
- CloudFront distributions (read permissions)

Configure AWS credentials:

```bash
aws configure
# Or use environment variables:
# export AWS_ACCESS_KEY_ID=your-key
# export AWS_SECRET_ACCESS_KEY=your-secret
# export AWS_REGION=us-west-2
```

If you don't have AWS credentials, use the `--skip-aws` flag to skip AWS checks.

## Usage

### Basic Usage

Run the script with all parameters:

```bash
./scripts/verify-deployment.sh \
  --frontend-url YOUR_CLOUDFRONT_DOMAIN \
  --s3-bucket YOUR_S3_BUCKET \
  --cloudfront-id YOUR_DISTRIBUTION_ID \
  --api-base YOUR_API_BASE_URL \
  --discord-webhook-url YOUR_WEBHOOK_URL \
  --discord-bot-token YOUR_BOT_TOKEN \
  --discord-channel-id YOUR_CHANNEL_ID
```

### Quick Start Examples

#### 1. Verify GitHub and Frontend Only (No AWS Credentials)

```bash
./scripts/verify-deployment.sh \
  --frontend-url d1234567890.cloudfront.net \
  --api-base https://abc123.execute-api.us-west-2.amazonaws.com \
  --skip-aws \
  --skip-discord
```

#### 2. Verify Everything with AWS Credentials

```bash
./scripts/verify-deployment.sh \
  --s3-bucket my-valine-frontend-bucket \
  --cloudfront-id E1234567890ABC \
  --api-base https://abc123.execute-api.us-west-2.amazonaws.com \
  --discord-webhook-url "https://discord.com/api/webhooks/123/abc" \
  --discord-bot-token "Bot.token.here" \
  --discord-channel-id "1234567890123456789"
```

#### 3. Verify AWS Infrastructure Only

```bash
./scripts/verify-deployment.sh \
  --s3-bucket my-valine-frontend-bucket \
  --cloudfront-id E1234567890ABC \
  --skip-discord
```

#### 4. Verify Discord Only

```bash
./scripts/verify-deployment.sh \
  --discord-webhook-url "https://discord.com/api/webhooks/123/abc" \
  --discord-bot-token "Bot.token.here" \
  --discord-channel-id "1234567890123456789" \
  --skip-aws
```

## Command Line Options

| Option | Description | Required |
|--------|-------------|----------|
| `--frontend-url URL` | CloudFront domain (auto-detected if `--cloudfront-id` provided) | No |
| `--s3-bucket BUCKET` | S3 bucket name for frontend assets | No |
| `--cloudfront-id ID` | CloudFront distribution ID | No |
| `--api-base URL` | API base URL (e.g., `https://xxx.execute-api.us-west-2.amazonaws.com`) | No |
| `--discord-bot-token TOKEN` | Discord bot token for bot verification | No |
| `--discord-channel-id ID` | Discord channel ID for bot message test | No |
| `--discord-webhook-url URL` | Discord webhook URL for webhook test | No |
| `--skip-aws` | Skip AWS S3/CloudFront checks | No |
| `--skip-discord` | Skip Discord verification checks | No |
| `--help` | Show help message | No |

## What Gets Checked

### A) GitHub Actions and Repository Checks

✓ Workflow file existence (`.github/workflows/client-deploy.yml`)  
✓ Root `.env.example` contains `VITE_API_BASE`  
✓ Orchestrator `.env.example` contains Discord configuration  
ℹ Note about required GitHub secrets (presence check not possible from script)

### B) S3 and CloudFront Verification

✓ S3 bucket exists and is accessible  
✓ `index.html` and `assets/` directory present  
✓ HTML files have `Cache-Control: no-cache`  
✓ Asset files have `Cache-Control: public, max-age=300`  
✓ CloudFront distribution exists and status is "Deployed"  
✓ Recent CloudFront invalidations completed  
✓ CloudFront domain name retrieved

### C) Frontend Reachability and API Wiring

✓ Frontend URL returns HTTP 200  
✓ Frontend serves valid HTML content  
✓ API `/health` endpoint returns HTTP 200 with JSON  
✓ API `/hello` endpoint returns HTTP 200 with JSON  
✓ API responses contain expected JSON structure

### D) Discord Verification

✓ Webhook successfully posts to Discord channel  
✓ Bot token is valid and can authenticate  
✓ Bot can send messages to specified channel  
✓ Proper error handling for permissions and rate limits

## Understanding the Output

### Status Indicators

- 🟢 **✓ PASS**: Check completed successfully
- 🔴 **✗ FAIL**: Check failed, requires attention
- 🟡 **⊘ SKIP**: Check skipped (missing parameters or flag set)
- 🔵 **ℹ INFO**: Additional information
- 🟡 **⚠ WARNING**: Non-critical issue detected

### Example Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Project-Valine Deployment Verification
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Repository: gcolon75/Project-Valine
Region: us-west-2
Timestamp: 2025-10-15 20:12:24 UTC

▶ A) GitHub Actions and Repository Checks

ℹ INFO: Checking workflow file: .github/workflows/client-deploy.yml
✓ PASS: Workflow file exists: .github/workflows/client-deploy.yml
✓ PASS: Root .env.example contains VITE_API_BASE
✓ PASS: orchestrator/.env.example contains Discord configuration

▶ B) S3 and CloudFront Verification

✓ PASS: S3 bucket exists and is accessible: my-bucket
✓ PASS: index.html found in S3 bucket
✓ PASS: HTML file has correct Cache-Control: no-cache
✓ PASS: CloudFront distribution exists: E1234567890ABC

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Verification Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Passed: 15
Failed: 0
Skipped: 3

Success Rate: 100% (15/15)

✓ All checks passed!
```

## Getting Required Values

### From GitHub Secrets (Repository Settings)

1. Go to `https://github.com/gcolon75/Project-Valine/settings/secrets/actions`
2. Note the secret names (values are not visible):
   - `S3_BUCKET`
   - `CLOUDFRONT_DISTRIBUTION_ID`
   - `VITE_API_BASE`
   - `FRONTEND_BASE_URL` (optional)
   - `DISCORD_BOT_TOKEN` (if configured)
   - `DISCORD_WEBHOOK_URL` (if configured)

### From AWS Console

**S3 Bucket:**
```bash
aws s3 ls | grep valine
# Or check CloudFormation/CDK outputs
```

**CloudFront Distribution ID:**
```bash
aws cloudfront list-distributions \
  --query 'DistributionList.Items[*].[Id,DomainName]' \
  --output table
```

**CloudFront Domain:**
```bash
aws cloudfront get-distribution --id YOUR_DISTRIBUTION_ID \
  --query 'Distribution.DomainName' \
  --output text
```

### From Discord Developer Portal

**Bot Token:**
1. Go to https://discord.com/developers/applications
2. Select your application → Bot → Token
3. Click "Reset Token" or "Copy" (keep this secret!)

**Channel ID:**
1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click on the channel → Copy ID

**Webhook URL:**
1. Go to channel settings → Integrations → Webhooks
2. Create or edit webhook → Copy Webhook URL

### From API Gateway

**API Base URL:**
```bash
aws apigateway get-rest-apis \
  --query 'items[*].[id,name]' \
  --output table

# Then construct: https://{api-id}.execute-api.{region}.amazonaws.com/{stage}
# Example: https://abc123.execute-api.us-west-2.amazonaws.com/prod
```

Or check the CloudFormation/SAM outputs:
```bash
aws cloudformation describe-stacks \
  --stack-name your-stack-name \
  --query 'Stacks[0].Outputs'
```

## Troubleshooting

### Common Issues

#### 1. "AWS CLI not found"

**Solution:** Install AWS CLI
```bash
# Ubuntu/Debian
sudo apt-get install awscli

# macOS
brew install awscli
```

#### 2. "No AWS credentials configured"

**Solution:** Configure AWS credentials or skip AWS checks
```bash
aws configure
# Or use --skip-aws flag
```

#### 3. "S3 bucket not accessible"

**Causes:**
- Incorrect bucket name
- No read permissions
- Wrong AWS account/region

**Solution:**
```bash
# Verify bucket exists
aws s3 ls s3://your-bucket-name

# Check your AWS identity
aws sts get-caller-identity
```

#### 4. "CloudFront distribution not found"

**Causes:**
- Incorrect distribution ID
- Distribution in different region (CloudFront is global, but API calls go to us-east-1)

**Solution:**
```bash
# List all distributions
aws cloudfront list-distributions --output table
```

#### 5. "Frontend returned HTTP 403"

**Causes:**
- S3 bucket policy doesn't allow CloudFront access
- Origin Access Identity (OAI) misconfigured

**Solution:** Check CloudFront origin settings and S3 bucket policy

#### 6. "Discord webhook test failed"

**Causes:**
- Invalid webhook URL
- Webhook deleted or disabled
- Network connectivity issues

**Solution:** Verify webhook URL in Discord channel settings

#### 7. "Discord bot authentication failed (HTTP 401)"

**Causes:**
- Invalid bot token
- Token format incorrect (should start with "Bot " or be raw token)

**Solution:** Regenerate token in Discord Developer Portal

#### 8. "Discord bot permission denied (HTTP 403)"

**Causes:**
- Bot not invited to server
- Bot missing "Send Messages" permission
- Channel permissions deny bot access

**Solution:** Re-invite bot with proper permissions or adjust channel settings

## Integration with CI/CD

### GitHub Actions Integration

Add a verification step to your workflow:

```yaml
- name: Verify Deployment
  run: |
    ./scripts/verify-deployment.sh \
      --s3-bucket ${{ secrets.S3_BUCKET }} \
      --cloudfront-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
      --api-base ${{ secrets.VITE_API_BASE }} \
      --discord-webhook-url ${{ secrets.DISCORD_DEPLOY_WEBHOOK }}
```

### Post-Deployment Verification

Run after successful deployment to ensure everything is working:

```yaml
- name: Deploy to Production
  run: ./deploy.sh
  
- name: Wait for Deployment
  run: sleep 30

- name: Verify Deployment
  run: ./scripts/verify-deployment.sh --all-parameters-here
  continue-on-error: true
  
- name: Notify on Failure
  if: failure()
  run: |
    # Send notification to Discord/Slack
```

## Rate Limits and Best Practices

### Discord API Rate Limits

- The script includes 2-second delays between Discord requests
- Don't run verification too frequently (max once per minute)
- Use webhooks for notifications (higher rate limits)

### AWS API Rate Limits

- S3 and CloudFront APIs have generous rate limits
- Script makes minimal API calls
- Safe to run multiple times per hour

### Best Practices

1. **Store sensitive values securely**
   - Use GitHub Secrets for CI/CD
   - Use environment variables locally
   - Never commit tokens/secrets to git

2. **Run verification after deployments**
   - Immediately after deployment completes
   - Before announcing deployment to users
   - As part of smoke testing

3. **Use selective checks**
   - Use `--skip-aws` if only verifying Discord
   - Use `--skip-discord` if only verifying infrastructure
   - Saves time and API calls

4. **Monitor verification results**
   - Log verification output
   - Alert on failures
   - Track success rates over time

## Support

For issues or questions:

1. Check the [main README](../README.md)
2. Review [INTEGRATION_GUIDE.md](../orchestrator/docs/getting-started/INTEGRATION_GUIDE.md) for Discord setup
3. See [TESTING_GUIDE.md](../orchestrator/TESTING_GUIDE.md) for orchestrator testing
4. Open an issue on GitHub: https://github.com/gcolon75/Project-Valine/issues

## License

This verification script is part of the Project-Valine repository and follows the same license.
