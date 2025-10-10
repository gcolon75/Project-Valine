# Orchestrator Code Consolidation Plan

## Executive Summary

This document outlines the plan to consolidate the orchestrator code into a single canonical location and properly separate concerns between the product application (Project-Valine) and the AI orchestrator (ghawk75-ai-agent).

## Current State

### Project-Valine Repository (This Repo)
- **Location**: `gcolon75/Project-Valine`
- **Contains**:
  - ✅ Product application (React client, serverless backend, Sanity CMS)
  - ✅ Guardrails (`.github/` templates, CODEOWNERS, CodeQL)
  - ⚠️  **Orchestrator code** in `orchestrator/` directory (SHOULD NOT BE HERE)

### Expected Canonical Location
- **Repository**: `ghawk75-ai-agent`
- **Path**: `orchestrator/`
- **Purpose**: Single source of truth for AI orchestrator code
- **Status**: Repository exists but needs orchestrator code migrated from Project-Valine

## Architecture Principle

**Separation of Concerns**:
1. **Project-Valine**: Product application + Guardrails only
2. **ghawk75-ai-agent**: Orchestrator application code only

## Current Verification Status

### ✅ Guardrails (Project-Valine)
All required guardrail files are present and properly configured:
- `.github/pull_request_template.md` - PR template with checklist
- `.github/CODEOWNERS` - Code ownership definitions
- `.github/workflows/codeql.yml` - Security scanning (updated to include Python)

### ✅ Orchestrator Code Quality (Currently in Project-Valine)
All orchestrator files present and valid:
- `orchestrator/template.yaml` - SAM infrastructure template
- `orchestrator/requirements.txt` - Python dependencies
- `orchestrator/.gitignore` - Prevents secret commits
- `orchestrator/samconfig.toml.example` - Configuration template (no secrets)
- `orchestrator/README.md` - Comprehensive documentation
- `orchestrator/deploy.sh` - Deployment script
- `orchestrator/app/__init__.py` - Application root
- `orchestrator/app/handlers/discord_handler.py` - Discord slash commands
- `orchestrator/app/handlers/github_handler.py` - GitHub webhooks
- `orchestrator/app/services/github.py` - GitHub API client
- `orchestrator/app/services/discord.py` - Discord API client
- `orchestrator/app/services/run_store.py` - DynamoDB operations
- `orchestrator/app/orchestrator/graph.py` - Workflow orchestration

**Python Syntax**: ✅ All files compile without errors
**Security**: ✅ No hardcoded secrets found
**Configuration**: ✅ samconfig.toml.example uses placeholders only

## Migration Plan

### Step 1: Prepare ghawk75-ai-agent Repository
**Assignee**: Repository owner with access to ghawk75-ai-agent

1. Clone or access the `ghawk75-ai-agent` repository
2. Create `orchestrator/` directory structure if not present
3. Set up proper `.gitignore` to exclude secrets and SAM artifacts

### Step 2: Copy Orchestrator Code
**Assignee**: Repository owner

Execute this migration script in the ghawk75-ai-agent repository:

```bash
# From ghawk75-ai-agent root
mkdir -p orchestrator

# Copy all orchestrator files from Project-Valine
# (Assuming both repos are cloned side-by-side)
cp -r ../Project-Valine/orchestrator/* orchestrator/

# Verify all files copied
ls -la orchestrator/
```

Files to migrate:
- All Python application code (`app/` directory)
- Infrastructure template (`template.yaml`)
- Dependencies (`requirements.txt`)
- Configuration templates (`samconfig.toml.example`, `.env.example`)
- Documentation (`README.md`, `*.md` files)
- Scripts (`deploy.sh`, `register_discord_commands.sh`)
- Security (``.gitignore``)

### Step 3: Update ghawk75-ai-agent Repository
**Assignee**: Repository owner

1. Create PR in ghawk75-ai-agent with migrated orchestrator code
2. Add CODEOWNERS file for orchestrator directory
3. Set up CI/CD workflow (see Step 7 below)
4. Merge PR after review

### Step 4: Remove Orchestrator from Project-Valine
**Assignee**: Repository owner

⚠️ **ONLY after Step 3 is complete**

1. Create feature branch in Project-Valine
2. Remove `orchestrator/` directory entirely:
   ```bash
   git rm -r orchestrator/
   ```
3. Update main README to reference ghawk75-ai-agent
4. Create PR with removal
5. Merge after verification

### Step 5: Update Project-Valine Documentation
**Changes needed in Project-Valine**:

Update `README.md` to reference external orchestrator:

```markdown
### AI Orchestrator

The AI orchestrator has been moved to its canonical location for better separation of concerns:
- **Repository**: https://github.com/ghawk75-ai-agent
- **Documentation**: See ghawk75-ai-agent/orchestrator/README.md
- **Purpose**: Automated workflow management via Discord and GitHub integration

For orchestrator deployment and configuration, please refer to the ghawk75-ai-agent repository.
```

### Step 6: Deployment (In ghawk75-ai-agent)
**Prerequisites**:
- AWS Account with appropriate permissions
- AWS SAM CLI installed
- Discord Bot Token and Public Key
- GitHub Personal Access Token
- GitHub Webhook Secret (generated)

**Deployment Steps** (execute in ghawk75-ai-agent/orchestrator):

1. **Configure Secrets**:
   ```bash
   cd orchestrator
   cp samconfig.toml.example samconfig.toml
   # Edit samconfig.toml with actual credentials
   ```

2. **Build and Deploy**:
   ```bash
   sam build
   sam deploy --guided
   ```

3. **Note Outputs**:
   - DiscordWebhookUrl: For Discord Interactions Endpoint
   - GitHubWebhookUrl: For GitHub webhook configuration
   - RunStateTableName: DynamoDB table name

4. **Register Discord Commands**:
   ```bash
   ./register_discord_commands.sh
   ```

5. **Configure Integrations**:
   - Discord: Set Interactions Endpoint to DiscordWebhookUrl
   - GitHub: Add webhook with GitHubWebhookUrl to Project-Valine repository

### Step 7: CI/CD for Orchestrator (In ghawk75-ai-agent)
**Location**: `ghawk75-ai-agent/.github/workflows/orchestrator-ci.yml`

Create workflow with:
- Python linting (flake8 or ruff)
- Basic tests (pytest)
- SAM build validation
- Manual approval gate for production deployment

Example workflow structure:
```yaml
name: Orchestrator CI

on:
  pull_request:
    paths:
      - 'orchestrator/**'
  push:
    branches:
      - main
    paths:
      - 'orchestrator/**'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd orchestrator
          pip install -r requirements.txt
          pip install flake8 pytest
      - name: Lint with flake8
        run: |
          cd orchestrator
          flake8 app/ --max-line-length=120
      - name: Run tests
        run: |
          cd orchestrator
          pytest tests/ || echo "No tests yet"
  
  build:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/setup-sam@v2
      - name: SAM Build
        run: |
          cd orchestrator
          sam build
```

### Step 8: End-to-End Testing
**After deployment, verify**:

1. **Discord /plan command**:
   - Type `/plan` in Discord server
   - Verify bot responds
   - Check CloudWatch logs for execution

2. **Discord /status command**:
   - Type `/status` in Discord
   - Verify response

3. **GitHub webhook**:
   - Create test issue with `ready` label
   - Verify webhook delivery (GitHub webhook UI)
   - Check CloudWatch logs

4. **DynamoDB**:
   ```bash
   aws dynamodb scan --table-name valine-orchestrator-runs-dev --limit 10
   ```

### Step 9: Monitoring and Operations (In AWS)

Set up for production:

1. **Log Retention**:
   ```bash
   # Set retention to 30 days
   aws logs put-retention-policy \
     --log-group-name /aws/lambda/valine-orchestrator-discord-prod \
     --retention-in-days 30
   
   aws logs put-retention-policy \
     --log-group-name /aws/lambda/valine-orchestrator-github-prod \
     --retention-in-days 30
   ```

2. **CloudWatch Alarms** (Optional):
   - Lambda Errors > threshold
   - Lambda Throttles > 0
   - DynamoDB Throttles > 0
   - API Gateway 5xx errors > threshold

3. **Dashboard** (Optional):
   - Create CloudWatch dashboard with key metrics
   - Lambda invocations, errors, duration
   - DynamoDB read/write capacity
   - API Gateway request count and latency

## Security Checklist

### ✅ Completed
- [x] No secrets in git history (verified with grep)
- [x] samconfig.toml in .gitignore
- [x] samconfig.toml.example uses placeholders only
- [x] Python code compiles without syntax errors

### 🔄 To Verify After Deployment
- [ ] Discord Public Key correctly configured
- [ ] GitHub webhook signature verification working
- [ ] Lambda execution role has minimal necessary permissions
- [ ] API Gateway endpoints use HTTPS only
- [ ] Secrets stored in AWS Secrets Manager or Parameter Store (production)
- [ ] Regular token rotation schedule established

## Timeline and Ownership

| Phase | Owner | Timeline | Status |
|-------|-------|----------|--------|
| Phase 1: Current State Verification | Completed | ✅ Done | 
| Phase 2: Prepare ghawk75-ai-agent | Repo Owner | TBD | Blocked - Need access |
| Phase 3: Migrate Code | Repo Owner | TBD | Blocked - Need access |
| Phase 4: Remove from Project-Valine | Repo Owner | After Phase 3 | Pending |
| Phase 5: Update Documentation | Repo Owner | After Phase 3 | Pending |
| Phase 6: Deploy Orchestrator | DevOps/Owner | After Phase 3 | Blocked - Need credentials |
| Phase 7: CI/CD Setup | DevOps/Owner | After Phase 3 | Blocked - Need access |
| Phase 8: Testing | QA/Owner | After Phase 6 | Blocked - Need deployment |
| Phase 9: Monitoring | DevOps/Owner | After Phase 6 | Blocked - Need deployment |

## Current Blockers

### Cannot Proceed Without:
1. **Access to ghawk75-ai-agent repository** - Required to migrate orchestrator code
2. **AWS Credentials** - Required for deployment
3. **Discord Credentials** - Required for Discord integration testing
   - Application ID
   - Bot Token
   - Public Key
4. **GitHub Token** - Required for GitHub integration testing
5. **Repository Permissions** - Required to create PRs and merge in ghawk75-ai-agent

### What CAN Be Done in Project-Valine:
- ✅ Update CodeQL to scan Python (COMPLETED)
- ✅ Verify guardrails are in place (COMPLETED)
- ✅ Document consolidation plan (THIS DOCUMENT)
- ✅ Prepare migration guide (THIS DOCUMENT)
- ⏳ Create PR to document the plan (IN PROGRESS)

## Acceptance Criteria

### For Consolidation:
- [ ] Orchestrator code exists in ghawk75-ai-agent/orchestrator ONLY
- [ ] Project-Valine contains NO orchestrator application code
- [ ] Project-Valine README references ghawk75-ai-agent for orchestrator
- [ ] Both repositories have proper .gitignore for secrets

### For Deployment:
- [ ] Orchestrator deployed to AWS via SAM
- [ ] Discord slash commands registered and responding
- [ ] GitHub webhook configured and receiving events
- [ ] DynamoDB table created and accessible
- [ ] CloudWatch logs showing successful executions

### For CI/CD:
- [ ] CI/CD workflow in ghawk75-ai-agent for orchestrator
- [ ] Linting and tests running on PR
- [ ] Green checks required before merge
- [ ] Manual approval gate for production deployments

### For Testing:
- [ ] `/plan` command tested successfully
- [ ] `/status` command tested successfully  
- [ ] GitHub webhook delivers events successfully
- [ ] At least one full workflow execution completed
- [ ] Logs confirm proper operation

## Next Actions

**Immediate** (Can do in Project-Valine):
1. ✅ Update CodeQL to include Python - COMPLETED
2. ✅ Document consolidation plan - COMPLETED
3. Create PR with documentation updates - IN PROGRESS

**Requires Access** (Blocked):
1. Access ghawk75-ai-agent repository
2. Execute migration steps 2-4
3. Deploy orchestrator (requires AWS credentials)
4. Set up CI/CD in ghawk75-ai-agent
5. Perform end-to-end testing

**Recommendation**: 
Request access to ghawk75-ai-agent repository and gather required credentials (Discord, GitHub, AWS) before proceeding with actual migration and deployment.

## Support and Questions

For questions or issues during migration:
1. Review this consolidation plan
2. Check orchestrator/README.md for deployment details
3. Consult CloudWatch logs for debugging
4. Review AWS SAM documentation: https://docs.aws.amazon.com/serverless-application-model/

## References

- Orchestrator Implementation Summary: `orchestrator/IMPLEMENTATION_SUMMARY.md`
- Orchestrator README: `orchestrator/README.md`
- Deployment Checklist: `orchestrator/DEPLOYMENT_CHECKLIST.md`
- Integration Guide: `orchestrator/INTEGRATION_GUIDE.md`
- Testing Guide: `orchestrator/TESTING_GUIDE.md`
