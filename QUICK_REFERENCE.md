# Project Valine - Quick Reference Card

**Copy this and share with new AI agents for instant context!**

---

## 60-Second Overview

**Project**: Project Valine - LinkedIn for Voice Actors  
**Tech Stack**: React + AWS Lambda + Discord Bots  
**Status**: Phase 6 Complete, Lambda deployment pending  
**Repository**: gcolon75/Project-Valine

### Architecture
```
Frontend (React + Vite)
    ↓
AWS S3 + CloudFront
    ↓
API Gateway
    ↓
Lambda Functions (Node.js + Python)
    ↓
DynamoDB + S3

Discord Bot (Slash Commands)
    ↓
Lambda Orchestrator
    ↓
GitHub Actions Workflows
```

### Key Features
- ✅ Professional networking platform
- ✅ Script and audition management
- ✅ Discord bot automation ("AI employees")
- ✅ CI/CD via GitHub Actions
- ✅ Serverless AWS infrastructure

### Current Status
- ✅ Frontend complete
- ✅ Backend structure complete
- ✅ Orchestrator code complete
- ✅ API Gateway endpoint obtained
- ⏳ Lambda functions need deployment
- ⏳ Discord commands need registration

### Next Actions
1. Deploy orchestrator: `cd orchestrator && sam build && sam deploy --guided`
2. Register commands: `./register_discord_commands.sh`
3. Test `/agents`, `/status`, `/triage` commands

### Discord Commands (Once Deployed)
- `/agents` - List available agents
- `/status` - Check workflow runs
- `/triage <pr>` - Auto-diagnose failures
- `/diagnose` - Run infrastructure checks
- `/verify-latest` - Verify deployments
- `/deploy-client` - Trigger deployments

### Key Files
- `PROJECT_VALINE_SUMMARY.md` - Full documentation (1,168 lines)
- `orchestrator/template.yaml` - Lambda definitions
- `orchestrator/README.md` - Orchestrator setup
- `.github/workflows/` - CI/CD automation

### Quick Commands
```bash
# Frontend dev
npm install && npm run dev

# Deploy orchestrator
cd orchestrator && sam build && sam deploy

# Register Discord commands
cd orchestrator && ./register_discord_commands.sh
```

### Tech Details
- **Frontend**: React 18, Vite 5, Tailwind CSS
- **Backend**: Node.js 20.x Lambda functions
- **Orchestrator**: Python 3.11 Lambda functions
- **Database**: DynamoDB (NoSQL)
- **Storage**: S3 buckets
- **CDN**: CloudFront
- **CI/CD**: GitHub Actions
- **Bot**: Discord slash commands
- **Monitoring**: CloudWatch

### Documentation Structure
```
PROJECT_VALINE_SUMMARY.md       ← Read this for full context
HOW_TO_USE_SUMMARY.md           ← How to use the summary
orchestrator/README.md          ← Orchestrator setup
README.md                       ← Main project README
```

### Common Questions

**Q: What is Project Valine?**  
A: LinkedIn-style platform for voice actors and creatives.

**Q: What's special about it?**  
A: Discord bots act as automated "employees" managing workflows.

**Q: What tech stack?**  
A: React frontend, AWS serverless backend, Discord/GitHub integration.

**Q: What's the current blocker?**  
A: Need to deploy Lambda functions (code ready, just needs deployment).

**Q: How long to deploy?**  
A: ~30 min to deploy, ~30 min to test = 1 hour total.

**Q: Where to start?**  
A: Read `PROJECT_VALINE_SUMMARY.md` for full context.

### Important URLs
- **Repo**: https://github.com/gcolon75/Project-Valine
- **Discord Dev Portal**: https://discord.com/developers/applications
- **AWS Console**: https://console.aws.amazon.com

### Environment Variables (Needed for Deployment)
```bash
# Discord
DISCORD_PUBLIC_KEY=<from developer portal>
DISCORD_BOT_TOKEN=<from developer portal>
DISCORD_APPLICATION_ID=<from developer portal>

# GitHub
GITHUB_TOKEN=<personal access token>
GITHUB_WEBHOOK_SECRET=<random string>

# AWS (automatically via OIDC)
AWS_REGION=us-west-2
```

### File Locations
```
/src                  - React client
/serverless           - Node.js API
/orchestrator         - Python orchestrator
/orchestrator/app     - Lambda handlers
/.github/workflows    - CI/CD pipelines
```

### Deployment Flow
```
1. Make changes
2. Push to GitHub
3. GitHub Actions builds
4. Deploys to S3/Lambda
5. CloudFront serves
6. Discord bot monitors
```

### Security Notes
- ✅ All secrets in GitHub Secrets / AWS SSM
- ✅ OIDC for AWS credentials (no long-lived tokens)
- ✅ Signature verification for Discord/GitHub
- ✅ Automatic secret redaction in logs
- ✅ Admin authorization for sensitive commands

### Monitoring
- **Logs**: CloudWatch Logs
- **Metrics**: CloudWatch Metrics
- **Alerts**: Discord alerts (configurable)
- **Tracing**: Trace IDs for correlation

### Development Workflow
```bash
# Local development
npm run dev

# Build
npm run build

# Deploy frontend (via GitHub Actions)
git push

# Deploy orchestrator (manual)
cd orchestrator && sam deploy
```

### Support
- **Issues**: GitHub Issues
- **Docs**: PROJECT_VALINE_SUMMARY.md
- **Guides**: orchestrator/README.md
- **Quick Fixes**: orchestrator/QUICK_START_STAGING.md

---

**For detailed information, read PROJECT_VALINE_SUMMARY.md (34KB, 20 min read)**

**Last Updated**: October 23, 2025  
**Version**: 1.0
