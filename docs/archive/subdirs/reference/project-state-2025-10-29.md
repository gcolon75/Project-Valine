# Project Valine — State of the System (as of 2025-10-29)

## 🚀 Deployments
- Natural Language UX Agent is live and standardized
- PR #125: Task worker, dry-run preview, LLM parsing (feature-flagged, off by default)
- PR #126: All deployment scripts and agent prompts standardized, only one canonical script remains
- Successfully deployed to: valine-orchestrator-staging (us-west-2)
- Last deployment: 2025-10-27 17:06:40 (UPDATE_COMPLETE)

## 👷‍♂️ Agents & Workflows
- Task schema/worker is fully implemented, role-based permissions in place
- Dry-run preview generator using AST for React/JSX is active
- LLM intent parsing (GPT-4o-mini) available, daily cost cap enabled (off by default)
- Evidence logging and confirmation flow working across Discord and PR flows

## 🛡️ Safety & Controls
- LLM parsing is feature-flagged and disabled by default (zero OpenAI costs in normal usage)
- All PRs created as draft, never auto-merged
- Cost controls: $10/day LLM budget, pre-call estimation, fallback to regex if quota exceeded
- Graceful degradation: LLM failures fall back to structured parsing

## 🗂️ Repository Structure
- All obsolete deployment scripts/prompts removed
- Canonical files:
  - `orchestrator/agent-prompts/natural_language_ux_agent.md`
  - `orchestrator/deploy-natural-ux-agent.ps1`
- Documentation updated for agent prompt and deployment usage
- Evidence directory: `orchestrator/evidence/` for task logs

## 🔗 Key Endpoints (LIVE)
- **Discord Webhook:** https://oocr9ahsyk.execute-api.us-west-2.amazonaws.com/dev/discord
- **GitHub Webhook:** https://oocr9ahsyk.execute-api.us-west-2.amazonaws.com/dev/github/webhook
- **Lambda Functions:** 
  - valine-orchestrator-discord-dev
  - valine-orchestrator-github-dev
- **DynamoDB Tables:**
  - valine-orchestrator-runs-dev
  - ux-agent-conversations

## 💰 Cost Analysis
- **Current:** $0/month (LLM disabled)
- **With LLM enabled:** ~$0.10-0.50/month for typical usage
- **Per request:** ~$0.0002 (GPT-4o-mini)
- **Safety cap:** $10/day maximum

## 🧪 Testing Commands
Test the Discord integration with:
```
/ux-update section:header text:"Test message"
/status
/diagnose
```

## 📊 Recent Activity
- ✅ PR #123: Orchestrator folder reorganization (merged)
- ✅ PR #125: Agents-as-employees workflow with LLM parsing (merged, deployed)
- ✅ PR #126: Deployment script standardization (merged)
- ✅ Deployment successful: 2025-10-27 17:06:40 UTC

## 📝 Next Steps
- [ ] Monitor CloudWatch logs for errors: `/aws/lambda/valine-orchestrator-discord-dev`
- [ ] Test Discord integration with `/ux-update` command
- [ ] Gradually enable LLM parsing in dev for natural-language flows
- [ ] Expand dry-run and evidence coverage for additional agents
- [ ] Review cost and usage monthly

## 🔍 Verification Commands
```powershell
# Check stack status
aws cloudformation describe-stacks --stack-name valine-orchestrator-staging

# View logs
aws logs tail /aws/lambda/valine-orchestrator-discord-dev --follow
```

## Stack Details
- **Name:** valine-orchestrator-staging
- **Region:** us-west-2
- **Runtime:** python3.11

## Feature Flags
- **UseLLMParsing:** false (default)
- **OpenAIApiKey:** "" (optional)

**Last updated:** 2025-10-29 20:30:46 UTC
