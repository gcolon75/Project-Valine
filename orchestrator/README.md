# Project Valine AI Orchestrator

An AWS Lambda-based orchestrator that integrates Discord slash commands with GitHub webhooks to manage automated workflows for the Project Valine repository.

## Architecture

The orchestrator consists of:

- **Discord Handler**: Lambda function that handles Discord slash commands (`/plan`, `/approve`, `/status`, `/ship`, `/verify-latest`, `/verify-run`, `/diagnose`)
- **GitHub Webhook Handler**: Lambda function that processes GitHub events (issues, PRs, check suites)
- **Orchestrator Graph**: Core workflow logic that coordinates between services
- **Services Layer**: Interfaces for GitHub API, Discord API, DynamoDB state storage, and GitHub Actions dispatching
- **Verification Module**: Deploy verification system for GitHub Actions workflow runs
- **Diagnose Dispatcher**: On-demand workflow triggering with correlation tracking and result parsing

## Prerequisites

- AWS Account with appropriate permissions
- AWS SAM CLI installed ([Installation Guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html))
- Python 3.11 or later
- Discord Bot and Application configured
- GitHub Personal Access Token or GitHub App

## Step 1: Configure Secrets

Before deploying, you need to gather the following credentials:

### Discord Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application (or use existing)
3. Go to "Bot" section:
   - Copy the **Bot Token**
   - Enable necessary intents (Server Members Intent, Message Content Intent)
4. Go to "General Information":
   - Copy the **Public Key**

### GitHub Setup

1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Create a token with scopes: `repo`, `write:discussion`, `workflow`
3. Copy the **Personal Access Token**
4. Generate a random string for webhook secret:
   ```bash
   python3 -c "import secrets; print(secrets.token_hex(32))"
   ```

### Update samconfig.toml

Copy the example configuration and edit with your credentials:

```bash
cp samconfig.toml.example samconfig.toml
```

Edit `orchestrator/samconfig.toml` and replace the placeholder values:

```toml
parameter_overrides = [
  "Stage=\"dev\"",
  "DiscordPublicKey=\"YOUR_DISCORD_PUBLIC_KEY\"",
  "DiscordBotToken=\"YOUR_DISCORD_BOT_TOKEN\"",
  "GitHubToken=\"YOUR_GITHUB_TOKEN\"",
  "GitHubWebhookSecret=\"YOUR_GITHUB_WEBHOOK_SECRET\""
]
```

**Important**: The `samconfig.toml` file is in `.gitignore` to prevent accidental secret commits. Never commit actual secrets to the repository. Use AWS Secrets Manager or Parameter Store in production.

## Step 2: Build and Deploy

Navigate to the orchestrator directory and build:

```bash
cd orchestrator
sam build
```

Deploy the orchestrator (guided mode for first deployment):

```bash
sam deploy --guided
```

During guided deployment:
- Stack Name: Accept default or customize
- AWS Region: Choose your preferred region (default: us-west-2)
- Confirm changes: Yes
- Allow SAM CLI IAM role creation: Yes
- Save arguments to config file: Yes

After deployment completes, note the output values:
- **DiscordWebhookUrl**: Use this for Discord interactions endpoint
- **GitHubWebhookUrl**: Use this for GitHub webhook
- **RunStateTableName**: DynamoDB table name

For subsequent deployments (after samconfig.toml is saved):

```bash
sam build && sam deploy
```

## Step 3: Configure Discord Slash Commands

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to "OAuth2" > "URL Generator":
   - Select scopes: `bot`, `applications.commands`
   - Select bot permissions: `Send Messages`, `Create Public Threads`, `Send Messages in Threads`
   - Copy the generated URL and use it to invite the bot to your server

4. Register slash commands using Discord API:

```bash
# Set your application ID and bot token
APP_ID="your_application_id"
BOT_TOKEN="your_bot_token"

# Register /plan command
curl -X POST "https://discord.com/api/v10/applications/${APP_ID}/commands" \
  -H "Authorization: Bot ${BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "plan",
    "description": "Create a daily plan from ready GitHub issues"
  }'

# Register /approve command
curl -X POST "https://discord.com/api/v10/applications/${APP_ID}/commands" \
  -H "Authorization: Bot ${BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "approve",
    "description": "Approve and execute a plan",
    "options": [{
      "name": "run_id",
      "description": "Run ID to approve",
      "type": 3,
      "required": true
    }]
  }'

# Register /status command
curl -X POST "https://discord.com/api/v10/applications/${APP_ID}/commands" \
  -H "Authorization: Bot ${BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "status",
    "description": "Check orchestrator status",
    "options": [{
      "name": "run_id",
      "description": "Optional run ID for specific status",
      "type": 3,
      "required": false
    }]
  }'

# Register /ship command
curl -X POST "https://discord.com/api/v10/applications/${APP_ID}/commands" \
  -H "Authorization: Bot ${BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ship",
    "description": "Finalize and ship a completed run",
    "options": [{
      "name": "run_id",
      "description": "Run ID to ship",
      "type": 3,
      "required": true
    }]
  }'
```

5. Set the Interactions Endpoint URL:
   - In Discord Developer Portal > General Information
   - Set **Interactions Endpoint URL** to your **DiscordWebhookUrl** from SAM output
   - Discord will verify the endpoint (must be deployed first)

## Step 4: Configure GitHub Webhook

1. Go to your GitHub repository settings
2. Navigate to "Webhooks" > "Add webhook"
3. Configure the webhook:
   - **Payload URL**: Your **GitHubWebhookUrl** from SAM output
   - **Content type**: `application/json`
   - **Secret**: The webhook secret you configured in samconfig.toml
   - **Events**: Select individual events:
     - Issues
     - Issue comments
     - Pull requests
     - Check suites
   - **Active**: ✓ Checked

4. Save the webhook

GitHub will send a test ping event. Check the webhook delivery to verify it was received successfully.

## Step 5: Testing

### Test Discord Commands

1. In your Discord server, try the following commands:
   - `/plan` - Create a daily plan from ready GitHub issues
   - `/verify-latest` - Verify the latest Client Deploy workflow run
   - `/verify-run <run_id>` - Verify a specific workflow run
2. Check CloudWatch Logs for the Lambda execution:
   ```bash
   aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow
   ```

### Test Deploy Verification

The `/verify-latest` and `/verify-run` commands perform comprehensive checks:
- GitHub Actions workflow status and step durations
- Frontend endpoint availability (root and index.html)
- API endpoint health (/health and /hello)
- Cache-Control header validation

Example usage:
```
/verify-latest
/verify-latest diagnose:true
/verify-run 12345678
```

### On-Demand Diagnose Workflow

The `/diagnose` command triggers the "Diagnose on Demand" workflow via GitHub Actions, providing comprehensive infrastructure diagnostics:

**Features:**
- Repository/workflow dispatch triggers (supports both methods)
- Correlation ID tracking for end-to-end tracing
- OIDC AWS credential checks
- S3 bucket access verification
- CloudFront distribution status
- API endpoint health checks (/health, /hello)
- Structured JSON output with machine-readable results
- Artifact upload with diagnostic summary

**Usage:**
```
/diagnose
/diagnose frontend_url:https://example.com
/diagnose api_base:https://api.example.com
/verify-latest diagnose:true
```

**Workflow Details:**
- File: `.github/workflows/diagnose-dispatch.yml`
- Triggered by: `repository_dispatch` (type: `diagnose.request`) or `workflow_dispatch`
- Run name includes correlation_id and requester for easy identification
- Outputs both human-readable summary and JSON block in GITHUB_STEP_SUMMARY
- Respects rate limits with exponential backoff
- Timeout: ~180 seconds for polling completion

**Response Messages:**
- 🟡 Starting - Initial acknowledgment with correlation ID
- ⏳ Running - Link to GitHub Actions run
- 🟢 OK - All checks passed with evidence
- 🔴 Failed - Detailed failure reasons with actionable fixes

### Quality-of-Life Commands (Phase 3)

The orchestrator includes streamlined commands for deployment visibility and operations:

#### `/status [count]`
Shows the last 1-3 workflow runs for "Client Deploy" and "Diagnose on Demand" with outcomes, durations, and links.

**Parameters:**
- `count` (optional): Number of runs to show (1-3, default: 2)

**Example:**
```
/status
/status count:3
```

**Response Format:**
```
📊 Status (last 2)

Client Deploy:
🟢 success • 2h ago • 82s • [run](url)
🔴 failure • 3h ago • 95s • [run](url)

Diagnose on Demand:
🟢 success • 1h ago • 25s • [run](url)
🟡 running • 5m ago • N/A • [run](url)
```

#### `/deploy-client [api_base] [wait]`
Triggers the "Client Deploy" workflow via workflow_dispatch.

**Parameters:**
- `api_base` (optional): Override API base URL (must be https). If omitted, uses the VITE_API_BASE secret.
- `wait` (optional): Wait for deployment completion (default: false)

**Example:**
```
/deploy-client
/deploy-client api_base:https://api.example.com
/deploy-client api_base:https://api.example.com wait:true
```

**Response:**
- 🟡 Initial acknowledgment with run link
- ⏳ Tracking run status (if wait enabled)
- 🟢 Success or 🔴 Failure (if wait enabled and completes within 3 minutes)

**Guardrails:**
- URL validation enforces https scheme
- Private IPs and localhost rejected by default (unless SAFE_LOCAL flag is set)
- Optional domain allowlist support via ALLOWED_DOMAINS

#### Admin Commands (Feature-Flagged)

The following commands are **OFF by default** and require explicit configuration:

##### `/set-frontend <url> [confirm]`
Updates the FRONTEND_BASE_URL repository variable (or secret if preferred).

**Requirements:**
- User must be in ADMIN_USER_IDS or have a role in ADMIN_ROLE_IDS
- ALLOW_SECRET_WRITES=true must be set
- `confirm:true` must be passed

**Example:**
```
/set-frontend url:https://example.com confirm:true
```

**Response:**
- ✅ Updated FRONTEND_BASE_URL (fingerprint …abcd)
- ❌ Not allowed (admin only) / Confirmation required / Feature disabled

##### `/set-api-base <url> [confirm]`
Updates the VITE_API_BASE repository secret.

**Requirements:**
- Same as `/set-frontend`
- Never echoes the secret value back

**Example:**
```
/set-api-base url:https://api.example.com confirm:true
```

**Security Features:**
- Secrets are never logged or echoed in responses
- Only fingerprint (last 4 chars of hash) is shown for confirmation
- Two-step confirmation required (confirm:true option)
- Admin allowlist enforcement
- Feature flag must be explicitly enabled

**Configuration:**
To enable admin commands, set these environment variables:
```bash
ALLOW_SECRET_WRITES=true
ADMIN_USER_IDS=discord_user_id_1,discord_user_id_2
ADMIN_ROLE_IDS=discord_role_id_1,discord_role_id_2
```

**GitHub Token Permissions:**
For secret/variable updates, the GitHub token requires:
- `repo` scope (for variable updates)
- Repository administration permissions (for secret updates)

### Test GitHub Webhook

1. Create a test issue in your repository with the `ready` label
2. Check CloudWatch Logs for the GitHub webhook Lambda:
   ```bash
   aws logs tail /aws/lambda/valine-orchestrator-github-dev --follow
   ```

### Verify DynamoDB

Check that the DynamoDB table was created:

```bash
aws dynamodb describe-table --table-name valine-orchestrator-runs-dev
```

## Step 6: Monitoring and Logs

### View Lambda Logs

```bash
# Discord handler logs
aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow

# GitHub handler logs
aws logs tail /aws/lambda/valine-orchestrator-github-dev --follow
```

### View API Gateway Logs

```bash
# Get API Gateway ID
aws apigateway get-rest-apis --query "items[?name=='valine-orchestrator-api-dev'].id" --output text

# Enable CloudWatch logging in API Gateway console if needed
```

### Query DynamoDB

```bash
# Scan all runs
aws dynamodb scan --table-name valine-orchestrator-runs-dev

# Get specific run
aws dynamodb get-item --table-name valine-orchestrator-runs-dev \
  --key '{"run_id": {"S": "your-run-id"}}'
```

## Troubleshooting

### Discord interaction verification fails

- Verify the Public Key is correct in samconfig.toml
- Check CloudWatch Logs for signature verification errors
- Ensure the Lambda function has been deployed before setting the interactions endpoint

### GitHub webhook signature verification fails

- Verify the webhook secret matches in both GitHub and samconfig.toml
- Check that the webhook is using the correct content type (application/json)
- Review CloudWatch Logs for signature verification details

### Lambda function timeout

- Increase timeout in template.yaml (Globals > Function > Timeout)
- Check for network issues accessing GitHub/Discord APIs
- Review CloudWatch Logs for performance bottlenecks

### DynamoDB access denied

- Verify the Lambda execution role has DynamoDB permissions
- Check that the table name in environment variables matches the actual table

## Development

### Local Testing

Install dependencies:

```bash
cd orchestrator
pip install -r requirements.txt
```

Run tests (if implemented):

```bash
pytest tests/
```

### Update and Redeploy

After making changes to the code:

```bash
sam build
sam deploy
```

### Clean Up

To delete the stack and all resources:

```bash
sam delete
```

## Security Best Practices

1. **Never commit secrets**: Use AWS Secrets Manager or Parameter Store for production
2. **Use least privilege**: Review and restrict IAM permissions
3. **Enable AWS WAF**: Protect API Gateway endpoints
4. **Rotate tokens**: Regularly rotate Discord bot tokens and GitHub tokens
5. **Monitor logs**: Set up CloudWatch alarms for errors and anomalies
6. **Use VPC**: Consider deploying Lambdas in a VPC for additional security

## AI Agent Prompts

The `agent-prompts/` directory contains ready-to-use AI agent prompts for various orchestrator tasks:

### Deploy Verifier Agent
- **File:** `agent-prompts/deploy_verifier.md`
- **Purpose:** Verify Client Deploy workflow runs and generate Discord-ready summaries
- **Usage:** Post-deployment validation with evidence-backed status reporting

### Phase 2 QA Checker Agent
- **File:** `agent-prompts/phase2_qa_checker.md`
- **Purpose:** Validate Phase 2 "Diagnose on Demand" feature implementation
- **Usage:** PR review validation for repository/workflow dispatch, Discord integration, correlation tracking, and safety guardrails
- **Acceptance Matrix:** 7 categories with comprehensive evidence requirements

### Phase 3 QA Checker Agent
- **File:** `agent-prompts/phase3_qa_checker.md`
- **Purpose:** Validate Phase 3 quality-of-life commands implementation (/status, /deploy-client, admin setters)
- **Usage:** PR review validation for command handlers, URL validators, admin authorization, and security guardrails
- **Acceptance Matrix:** 7 categories covering command behavior, guardrails, UX, and tests

These prompts are designed for AI-assisted code review and deployment validation. They include:
- Detailed system prompts with role definitions
- User prompt templates with placeholder values
- Acceptance criteria checklists
- Evidence gathering guidelines
- Output format templates
- Security and operational guidance

## Next Steps

- Implement full orchestrator graph logic in `app/orchestrator/graph.py`
- Add error handling and retry logic
- Implement task execution workflow
- Add comprehensive tests
- Set up CI/CD pipeline for automated deployments
- Configure CloudWatch alarms and dashboards
- Implement issue labeling automation
- Add support for custom workflows and rules

## Support

For issues or questions:
1. Check CloudWatch Logs for error details
2. Review the GitHub repository issues
3. Consult AWS SAM documentation: https://docs.aws.amazon.com/serverless-application-model/
