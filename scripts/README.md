# Scripts Directory

This directory contains utility scripts for Project-Valine deployment, verification, and maintenance.

## Verification Scripts

### verify-deployment.sh

**Purpose**: Comprehensive deployment verification for frontend, backend, and Discord integrations.

**Quick Start**:
```bash
# Show help
./scripts/verify-deployment.sh --help

# Verify GitHub repository structure only
./scripts/verify-deployment.sh --skip-aws --skip-discord

# Verify with all parameters
./scripts/verify-deployment.sh \
  --s3-bucket YOUR_BUCKET \
  --cloudfront-id YOUR_DIST_ID \
  --api-base YOUR_API_URL \
  --discord-webhook-url YOUR_WEBHOOK \
  --discord-bot-token YOUR_TOKEN \
  --discord-channel-id YOUR_CHANNEL_ID
```

**What it checks**:
- ✓ GitHub Actions workflow files
- ✓ Environment configuration files
- ✓ S3 bucket deployment and caching headers
- ✓ CloudFront distribution and invalidations
- ✓ Frontend URL accessibility
- ✓ API health endpoints (`/health` and `/hello`)
- ✓ Discord webhook functionality
- ✓ Discord bot authentication and messaging

**Documentation**: See [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) for detailed usage.

### verify-deployment-example.sh

**Purpose**: Interactive examples demonstrating different usage scenarios of verify-deployment.sh.

**Quick Start**:
```bash
./scripts/verify-deployment-example.sh
```

**What it demonstrates**:
- Example 1: Repository structure verification (no credentials needed)
- Example 2: Frontend and API verification
- Example 3: Full AWS verification
- Example 4: Discord integration verification
- Example 5: Using environment variables
- Example 6: CI/CD integration

## AWS Scripts

### put-ssm-params.sh

**Purpose**: Store parameters in AWS Systems Manager Parameter Store.

**Quick Start**:
```bash
./scripts/put-ssm-params.sh <stage> <region> <json-file>

# Example
./scripts/put-ssm-params.sh dev us-west-2 scripts/ssm-params.example.json
```

**Parameters**:
- `stage`: Deployment stage (dev, prod, etc.)
- `region`: AWS region (default: us-west-2)
- `json-file`: JSON file with parameter key-value pairs

## Development Scripts

### check-imports.mjs

**Purpose**: Check and validate import statements in the project.

**Quick Start**:
```bash
node scripts/check-imports.mjs
```

### who-is-my-app.mjs

**Purpose**: Identify and analyze application structure and components.

**Quick Start**:
```bash
node scripts/who-is-my-app.mjs
```

### wire-original-router.mjs

**Purpose**: Wire up the original router configuration.

**Quick Start**:
```bash
node scripts/wire-original-router.mjs
```

### start-dev.ps1

**Purpose**: PowerShell script to start development server on Windows.

**Quick Start** (PowerShell):
```powershell
.\scripts\start-dev.ps1
```

## Configuration Files

### ssm-params.example.json

Example JSON file showing the structure for SSM parameters. Copy and modify this file with your actual values:

```json
{
  "PARAM_NAME_1": "value1",
  "PARAM_NAME_2": "value2"
}
```

## Usage in CI/CD

### GitHub Actions Integration

Add verification to your workflow:

```yaml
jobs:
  deploy:
    steps:
      - name: Deploy Frontend
        run: |
          # Your deployment commands here
          
      - name: Verify Deployment
        run: |
          ./scripts/verify-deployment.sh \
            --s3-bucket ${{ secrets.S3_BUCKET }} \
            --cloudfront-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --api-base ${{ secrets.VITE_API_BASE }}
            
      - name: Notify on Success
        if: success()
        run: |
          # Send success notification
          
      - name: Notify on Failure
        if: failure()
        run: |
          # Send failure notification
```

### Post-Deployment Hook

Create a post-deployment verification hook:

```bash
#!/bin/bash
# post-deploy-hook.sh

set -e

echo "Deployment completed. Running verification..."

./scripts/verify-deployment.sh \
  --s3-bucket "$S3_BUCKET" \
  --cloudfront-id "$CLOUDFRONT_ID" \
  --api-base "$API_BASE" \
  --discord-webhook-url "$DISCORD_WEBHOOK"

if [ $? -eq 0 ]; then
  echo "✓ Verification passed!"
  # Send success notification
else
  echo "✗ Verification failed!"
  # Send failure notification and potentially rollback
  exit 1
fi
```

## Best Practices

1. **Secure Credentials**: Never commit credentials to git. Use environment variables or GitHub Secrets.

2. **Regular Verification**: Run verification after every deployment to catch issues early.

3. **Selective Checks**: Use skip flags (`--skip-aws`, `--skip-discord`) when you don't need full verification.

4. **Error Handling**: The verification script exits with code 1 on failures, making it suitable for CI/CD pipelines.

5. **Rate Limits**: The script includes delays between Discord API calls to respect rate limits.

## Troubleshooting

### Common Issues

**"AWS CLI not found"**
```bash
# Install AWS CLI
# Ubuntu/Debian
sudo apt-get install awscli

# macOS
brew install awscli
```

**"No AWS credentials configured"**
```bash
# Configure AWS credentials
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
export AWS_REGION=us-west-2
```

**"jq: command not found"**
```bash
# Install jq
# Ubuntu/Debian
sudo apt-get install jq

# macOS
brew install jq
```

**"Permission denied"**
```bash
# Make scripts executable
chmod +x scripts/*.sh
```

## Contributing

When adding new scripts:

1. Add appropriate shebang (`#!/usr/bin/env bash` or `#!/usr/bin/env node`)
2. Make scripts executable (`chmod +x script-name.sh`)
3. Add help/usage documentation
4. Update this README with the new script
5. Follow existing naming conventions
6. Include error handling (`set -e` for bash scripts)

## Support

For issues or questions:
- See [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) for detailed verification documentation
- Check [main README](../README.md) for project overview
- Review [orchestrator documentation](../orchestrator/README.md) for Discord integration
- Open an issue on GitHub: https://github.com/gcolon75/Project-Valine/issues
