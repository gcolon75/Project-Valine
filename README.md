# Project Valine

A collaborative platform for voice actors, writers, and artists to create and share scripts, auditions, and creative content.

> 📖 **New to Project Valine?** Check out [PROJECT_VALINE_SUMMARY.md](PROJECT_VALINE_SUMMARY.md) for a comprehensive overview of the project, architecture, current status, and next steps. Perfect for onboarding new team members or AI agents!

## 🔥 Current Status

### Discord Command Registration - GitHub Actions Workflow 🎮
**Easy mode activated!** Register Discord slash commands via GitHub Actions - no local scripts needed.

**Quick Start: Trigger via GitHub UI**
1. Go to [Register Discord Commands Workflow](.github/workflows/register-staging-slash-commands.yml)
2. Click "Run workflow"
3. Enter your Discord App ID + Bot Token
4. Choose mode: `global` (1h propagation) or `guild` (instant)
5. Watch commands register! ✅

**Trigger via GitHub CLI:**
```bash
# Global registration (commands appear in ~1 hour)
gh workflow run register-staging-slash-commands.yml \
  -f app_id="YOUR_APP_ID" \
  -f bot_token="YOUR_BOT_TOKEN" \
  -f mode="global"

# Guild registration (commands appear instantly)
gh workflow run register-staging-slash-commands.yml \
  -f app_id="YOUR_APP_ID" \
  -f bot_token="YOUR_BOT_TOKEN" \
  -f guild_id="YOUR_GUILD_ID" \
  -f mode="guild"
```

**Trigger via curl:**
```bash
curl -X POST \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/gcolon75/Project-Valine/actions/workflows/register-staging-slash-commands.yml/dispatches \
  -d '{"ref":"main","inputs":{"app_id":"YOUR_APP_ID","bot_token":"YOUR_BOT_TOKEN","mode":"global"}}'
```

**What it does:**
- ✅ Validates bot token matches app ID
- ✅ Registers all 19 Discord slash commands
- ✅ Handles rate limits with automatic retry
- ✅ Shows clear error messages with invite URLs on missing permissions
- ✅ Generates summary with command counts and next steps

**No local scripts required!** Everything runs in CI.

---

## 🔥 Recent Updates (Oct 2025)

### AWS Auto-Deployer - DeployBot Active 🚀
Push code → Lambda deploys automatically. Zero manual AWS setup needed!

**What's new:**
- 🤖 **Auto-deploy on merge**: Push to main → DeployBot speedruns to AWS
- 💬 **Discord notifications**: Get deploy status in your Discord channel
- 🛠️ **Gamer-style errors**: Clear troubleshooting guidance when deploys fail
- 🔄 **Repeatable config**: Uses same settings as last successful deploy

**How to use:**
```bash
git push origin main  # DeployBot handles the rest!
```

**Documentation:** [orchestrator/docs/AWS_AUTO_DEPLOYER.md](orchestrator/docs/AWS_AUTO_DEPLOYER.md)

---

### Discord Bot Endpoint - OPERATIONAL ✅
The bot respawned successfully after defeating the S3 Cache Boss 💀

**What was broken:**
- Lambda kept loading stale code from S3 (skill issue from AWS caching)
- Discord endpoint validation failing with `Runtime.ImportModuleError: No module named 'app'`
- Manual cache clearing required every deploy (pain)

**What we fixed:**
- 🎯 **Timestamp cache-buster** forces fresh artifacts on every deploy ([PR #88](https://github.com/gcolon75/Project-Valine/pull/88))
- 🔍 **Automated health checks** catch broken deploys in CI ([PR #90](https://github.com/gcolon75/Project-Valine/pull/90))
- 📚 **Recovery playbook** for manual troubleshooting ([PR #89](https://github.com/gcolon75/Project-Valine/pull/89))

**Current status:** Bot is live, endpoint validated, ready for slash commands 🎮

**Technical details:**
- `scripts/generate-deploy-stamp.sh` injects timestamp into every build
- `scripts/test-discord-endpoint.sh` validates Lambda health post-deploy
- [orchestrator/docs/LAMBDA_DEPLOY_RECOVERY.md](orchestrator/docs/LAMBDA_DEPLOY_RECOVERY.md) has emergency commands

See [CHANGELOG.md](CHANGELOG.md) for the full story.

## Features

- **Client Application**: React + Vite client with authentication and role-based access
- **Serverless Backend**: AWS Lambda functions with API Gateway
- **AI Orchestrator**: Automated workflow management via Discord and GitHub integration
- **Content Management**: Sanity CMS for structured content

## Quickstart

### Client Development

```bash
npm install
npm run dev   # opens on http://localhost:3000
```

### Backend Deployment

See `serverless/` and `infra/` directories for serverless function deployment.

### AI Orchestrator - DeployBot Enabled 🚀

⚠️ **Note**: The orchestrator code is currently in this repository but is planned to be migrated to its canonical location at `ghawk75-ai-agent/orchestrator` for better separation of concerns. See [docs/archive/ORCHESTRATOR_CONSOLIDATION.md](docs/archive/ORCHESTRATOR_CONSOLIDATION.md) for the migration plan.

The orchestrator manages automated workflows between Discord and GitHub:

**Auto-Deploy (Zero Hassle):**
```bash
git push origin main  # DeployBot speedruns to AWS Lambda automatically!
# ✅ No AWS keys needed
# ✅ Discord notifications
# ✅ Repeatable config
```

**Manual Deploy (If Needed):**
```bash
cd orchestrator
sam deploy --guided  # Follow prompts
```

📚 **Full guide:** [orchestrator/docs/AWS_AUTO_DEPLOYER.md](orchestrator/docs/AWS_AUTO_DEPLOYER.md)

## Project Structure

- `/src` - React client application
- `/serverless` - API Lambda functions
- `/infra` - Infrastructure as code
- `/orchestrator` - AI workflow orchestrator (Discord + GitHub integration)
- `/sanity` - Sanity CMS configuration
- `/api` - API utilities and Prisma schema
- `/.github` - GitHub workflows and templates

## Routes

### Public Pages
- `/` - Home page
- `/about` - About page
- `/login` - Authentication

### Authenticated Pages
- `/feed` - Main content feed
- `/search` - Search functionality
- `/messages` - Messaging system
- `/bookmarks` - Saved content
- `/notifications` - User notifications
- `/settings` - User settings
- `/profile/:id` - User profiles
- `/scripts/*` - Script management
- `/auditions/*` - Audition management
- `/requests` - Access requests

## Development

- Both `npm run dev` and `npm start` work (they run Vite)
- Build with `npm run build`, preview with `npm run preview`
- Edit pages in `src/pages/` and routes in `src/App.jsx`

## Deployment Verification

The repository includes a comprehensive verification script to validate deployments:

```bash
./scripts/verify-deployment.sh --help
```

This script checks:
- GitHub Actions workflows and configuration files
- S3 and CloudFront deployment status
- Frontend accessibility and API health endpoints
- Discord bot and webhook integration

See [scripts/VERIFICATION_GUIDE.md](scripts/VERIFICATION_GUIDE.md) for detailed usage instructions.

## Documentation

> 📁 **Organized Documentation**: Most documentation has been moved to the `/docs` directory for better organization. See [docs/README.md](docs/README.md) for the complete structure.

### Getting Started
- **[Project Summary](PROJECT_VALINE_SUMMARY.md)** - Comprehensive overview of Project Valine: architecture, current status, goals, and next steps

### Troubleshooting
- [Discord Issues](docs/troubleshooting/discord/) - Discord bot debugging, slash command fixes, and endpoint diagnostics

### Diagnostics & Reports  
- [Phase Reports](docs/diagnostics/) - Phase 5/6 validation, implementation summaries, and verification reports
- [Deployment Verification](docs/diagnostics/DEPLOYMENT_VERIFICATION.md) - Comprehensive deployment verification system

### Archive
- [Historical Documentation](docs/archive/) - Completed phases, old summaries, and deprecated guides

### Orchestrator (Current Location - To Be Migrated)
- [Orchestrator Documentation](orchestrator/README.md) - AI workflow automation
- [Integration Guide](orchestrator/INTEGRATION_GUIDE.md) - Discord and GitHub setup
- [Testing Guide](orchestrator/TESTING_GUIDE.md) - End-to-end testing
- [Orchestrator Consolidation Plan](docs/archive/ORCHESTRATOR_CONSOLIDATION.md) - Migration plan to ghawk75-ai-agent

### Deployment & Verification
- [Deployment Verification](docs/diagnostics/DEPLOYMENT_VERIFICATION.md) - Comprehensive deployment verification system
- [Verification Guide](scripts/VERIFICATION_GUIDE.md) - Detailed verification usage and troubleshooting

### AI Agents
- [UX Designer Agent](.github/agents/ux-designer.md) - User experience improvements and implementation
- [Quick Start Guide](.github/agents/QUICK_START.md) - Quick reference for using the UX Designer agent
- [Agent Templates](.github/agents/templates/) - Reusable templates for PRs, RFCs, and documentation

### Other Documentation
- [Sanity Setup](SANITY_SETUP.md) - CMS configuration
- [UX Changes](CHANGES.md) - Log of user experience improvements and design changes
