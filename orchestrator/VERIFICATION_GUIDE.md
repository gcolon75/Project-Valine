# Deploy Verification Guide

This guide explains how to use the deploy verification commands in the Project Valine orchestrator.

## Overview

The orchestrator provides two Discord slash commands for verifying Client Deploy workflow runs:

- `/verify-latest [run_url]` - Verify the latest Client Deploy run (or a specific run if URL provided)
- `/verify-run <run_id>` - Verify a specific workflow run by ID

These commands perform comprehensive checks on:
1. **GitHub Actions**: Workflow status, step durations (build, S3 sync, CloudFront invalidation)
2. **Frontend**: HTTP checks on root and index.html, Cache-Control header validation
3. **API**: HTTP checks on /health and /hello endpoints

## Setup

### Required Secrets/Variables

The verification commands require the following environment variables to be configured in the SAM deployment:

```toml
# In samconfig.toml
parameter_overrides = [
  "FrontendBaseUrl=\"https://your-frontend-domain.com\"",
  "ViteApiBase=\"https://your-api-domain.com\""
]
```

Or set via AWS SAM CLI:
```bash
sam deploy --parameter-overrides \
  FrontendBaseUrl="https://your-frontend.com" \
  ViteApiBase="https://api.your-domain.com"
```

### GitHub Token Permissions

The GitHub token configured in the orchestrator must have:
- `repo:read` - To access workflow runs
- `actions:read` - To read Actions workflow data

## Usage

### Command: /verify-latest

Verifies the latest Client Deploy workflow run on the main branch.

**Syntax:**
```
/verify-latest
/verify-latest [run_url]
```

**Parameters:**
- `run_url` (optional): GitHub Actions run URL to verify instead of latest

**Examples:**
```
/verify-latest
/verify-latest https://github.com/gcolon75/Project-Valine/actions/runs/12345678
```

**Response:**
```
✅ Client deploy OK | Frontend: https://example.com | API: https://api.example.com | cf: ok | build: 45.2s

✅ Actions: success | build: 45.2s | s3 sync: 12.5s | cf invalidation: ok
✅ Frontend: 200 OK | index.html: 200 OK | cache-control=no-cache
✅ API: /health 200 | /hello 200
```

### Command: /verify-run

Verifies a specific workflow run by its ID.

**Syntax:**
```
/verify-run <run_id>
```

**Parameters:**
- `run_id` (required): GitHub Actions run ID (numeric)

**Example:**
```
/verify-run 12345678
```

**Finding Run IDs:**
1. Go to GitHub Actions tab in your repository
2. Click on a workflow run
3. The run ID is in the URL: `https://github.com/owner/repo/actions/runs/[RUN_ID]`

## Response Format

### Success Response

When all checks pass:
```
✅ Client deploy OK | Frontend: https://example.com | API: https://api.example.com | cf: ok | build: 45.2s
```

Checklist:
- `✅ Actions: success | build: 45.2s | s3 sync: 12.5s | cf invalidation: ok`
- `✅ Frontend: 200 OK | index.html: 200 OK | cache-control=no-cache`
- `✅ API: /health 200 | /hello 200`

### Failure Response

When checks fail:
```
❌ Client deploy check failed | Actions failed | run: https://github.com/...
```

Checklist with actionable fixes:
- `❌ Actions: failure | build: N/A | s3 sync: N/A | cf invalidation: missing`
- `✅ Frontend: 200 OK | index.html: 200 OK | cache-control=no-cache`
- `❌ API: /health 500 | /hello 500`

**Suggested Fixes:**
- Check VITE_API_BASE secret is set correctly
- Confirm API /health and /hello endpoints are deployed and reachable

## Troubleshooting

### Error: "No Client Deploy workflow run found"

**Cause:** No workflow runs exist for "Client Deploy" on the main branch.

**Solution:**
1. Verify the workflow name in `.github/workflows/client-deploy.yml` is "Client Deploy"
2. Check that at least one run has been executed on the main branch
3. Manually trigger the workflow if needed

### Error: "Invalid run URL format"

**Cause:** The provided run URL is not in the correct format.

**Solution:** Use the full GitHub Actions run URL format:
```
https://github.com/owner/repo/actions/runs/12345678
```

### Error: "Frontend base URL not provided"

**Cause:** The `FRONTEND_BASE_URL` environment variable is not set in the Lambda function.

**Solution:**
1. Update samconfig.toml with `FrontendBaseUrl` parameter
2. Redeploy the orchestrator: `sam build && sam deploy`

### Error: "API checks failed"

**Possible Causes:**
1. API endpoints are not deployed or not reachable
2. VITE_API_BASE secret is incorrect
3. Network/firewall blocking Lambda to API communication

**Solutions:**
1. Verify API is deployed and accessible: `curl https://your-api.com/health`
2. Check VITE_API_BASE environment variable in Lambda
3. Ensure Lambda has internet access (not in VPC, or VPC has NAT gateway)

### Error: "Cache-Control header missing or incorrect"

**Cause:** index.html is not being served with the correct Cache-Control header.

**Solution:**
1. Check the "Sync to S3 (HTML, no-cache)" step in the workflow
2. Verify the S3 sync command includes: `--cache-control "no-cache"`
3. Re-run the deployment to update the header

## Configuration

### Step Name Patterns

The verifier uses regex patterns to match workflow steps. These are defined in:
`orchestrator/app/config/verification_config.py`

Default patterns:
```python
STEP_PATTERNS = {
    'build': r'(?i)(build|vite build|npm run build|yarn build)',
    's3_sync': r'(?i)(s3 sync|aws s3 sync|upload|sync to s3)',
    'cloudfront_invalidation': r'(?i)(cloudfront.*invalidat|invalidat.*cloudfront)'
}
```

To customize patterns, update the config file and redeploy.

### Timeouts and Retries

HTTP checks use these defaults:
- Timeout: 10 seconds per request
- Max retries: 1
- Retry delay: 2 seconds

To adjust, modify `orchestrator/app/config/verification_config.py`.

## Testing

### Unit Tests

Run unit tests for the verification modules:

```bash
cd orchestrator
pip install -r requirements.txt
python -m pytest tests/ -v
```

### Integration Testing

1. Deploy the orchestrator to AWS
2. Register the Discord commands: `bash register_discord_commands.sh`
3. In Discord, run `/verify-latest`
4. Check CloudWatch Logs for detailed output:
   ```bash
   aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow
   ```

## Architecture

### Modules

1. **verification_config.py**: Configuration constants
2. **github_actions.py**: Fetches workflow runs and calculates step durations
3. **http_checker.py**: Performs HTTP health checks with retries
4. **message_composer.py**: Formats Discord messages with one-liner and checklist
5. **verifier.py**: Main orchestrator coordinating all checks

### Flow

```
Discord Command → discord_handler.py
                        ↓
                  DeployVerifier
                        ↓
        ┌───────────────┼───────────────┐
        ↓               ↓               ↓
GitHubActionsVerifier HTTPChecker MessageComposer
        ↓               ↓               ↓
    Run Info      Frontend/API    Discord Message
                   Health          (One-liner +
                                    Checklist)
```

## Security Considerations

- **No AWS Credentials**: The bot does NOT have AWS access in Phase 1. It only performs HTTP checks and reads GitHub Actions data.
- **Rate Limits**: HTTP checks use timeouts and limited retries to respect rate limits.
- **Input Validation**: Run IDs and URLs are validated before processing.
- **Least Privilege**: GitHub token only needs `repo:read` and `actions:read`.

## Future Enhancements (Phase 2)

Not included in this implementation:
- AWS credentials for direct S3/CloudFront checks
- Automatic re-deployment on failure
- Historical trend analysis
- Custom webhook triggers

## Support

For issues or questions:
1. Check CloudWatch Logs for detailed error messages
2. Review the GitHub Actions workflow logs
3. Verify all required environment variables are set
4. Consult this guide's troubleshooting section
