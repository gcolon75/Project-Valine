# Orchestrator Documentation Index

Welcome to the Project Valine Orchestrator documentation! This directory contains organized documentation for the Discord bot orchestrator system.

## 📚 Documentation Structure

### 🚀 Getting Started
Start here for initial setup and integration:
- [**QUICK_START_STAGING.md**](getting-started/QUICK_START_STAGING.md) - Quick staging environment setup
- [**INTEGRATION_GUIDE.md**](getting-started/INTEGRATION_GUIDE.md) - Complete Discord and GitHub integration guide

### 📖 Guides

#### 🤖 Agent Guides
Documentation for all agent personalities and automated systems:
- [**backend_agent.md**](backend_agent.md) - Backend Agent for API endpoints, migrations, validation, and tests
- [**ISSUE_TRIAGE_AGENT_GUIDE.md**](guides/agents/ISSUE_TRIAGE_AGENT_GUIDE.md) - Automated issue analysis and triage
- [**ISSUE_TRIAGE_QUICK_REF.md**](guides/agents/ISSUE_TRIAGE_QUICK_REF.md) - Quick reference for issue triage
- [**OPERATIONAL_READINESS_AGENT_GUIDE.md**](guides/agents/OPERATIONAL_READINESS_AGENT_GUIDE.md) - Operational readiness monitoring
- [**OPERATIONAL_READINESS_AGENT_QUICK_REF.md**](guides/agents/OPERATIONAL_READINESS_AGENT_QUICK_REF.md) - Quick reference
- [**PHASE5_TRIAGE_AGENT_GUIDE.md**](guides/agents/PHASE5_TRIAGE_AGENT_GUIDE.md) - Phase 5 triage implementation
- [**PHASE5_TRIAGE_AUTOMATION_GUIDE.md**](guides/agents/PHASE5_TRIAGE_AUTOMATION_GUIDE.md) - Automation workflows
- [**PHASE5_TRIAGE_QUICK_REF.md**](guides/agents/PHASE5_TRIAGE_QUICK_REF.md) - Quick reference
- [**QA_CHECKER_GUIDE.md**](guides/agents/QA_CHECKER_GUIDE.md) - Automated PR validation system
- [**QA_CHECKER_QUICK_START.md**](guides/agents/QA_CHECKER_QUICK_START.md) - Quick start for QA checker
- [**SUMMARY_AGENT_GUIDE.md**](guides/agents/SUMMARY_AGENT_GUIDE.md) - Summary generation agent
- [**UPTIME_GUARDIAN_GUIDE.md**](guides/agents/UPTIME_GUARDIAN_GUIDE.md) - Uptime monitoring system
- [**UX_AGENT_README.md**](guides/agents/UX_AGENT_README.md) - UX Agent comprehensive guide
- [**UX_AGENT_QUICKSTART.md**](guides/agents/UX_AGENT_QUICKSTART.md) - UX Agent quick start
- [**UX_AGENT_DEPLOYMENT_CHECKLIST.md**](guides/agents/UX_AGENT_DEPLOYMENT_CHECKLIST.md) - Deployment checklist
- [**UX_AGENT_FLOW_DIAGRAM.md**](guides/agents/UX_AGENT_FLOW_DIAGRAM.md) - Flow diagrams and architecture
- [**UX_AGENT_IMPLEMENTATION_SUMMARY.md**](guides/agents/UX_AGENT_IMPLEMENTATION_SUMMARY.md) - Implementation details

#### 💬 Discord Integration Guides
Discord bot setup, slash commands, and troubleshooting:
- [**BOT_UNIFIER_GUIDE.md**](guides/discord/BOT_UNIFIER_GUIDE.md) - Unified bot architecture overview
- [**DISCORD_SLASH_CMD_AGENT.md**](guides/discord/DISCORD_SLASH_CMD_AGENT.md) - Slash command implementation
- [**DISCORD_SLASH_CMD_QUICK_REF.md**](guides/discord/DISCORD_SLASH_CMD_QUICK_REF.md) - Quick reference
- [**DYNAMODB_CONVERSATIONS.md**](guides/discord/DYNAMODB_CONVERSATIONS.md) - Conversation state management
- [**SLASH_COMMANDS_FIX_GUIDE.md**](guides/discord/SLASH_COMMANDS_FIX_GUIDE.md) - Troubleshooting slash commands
- [**START_HERE_DISCORD_ISSUES.md**](guides/discord/START_HERE_DISCORD_ISSUES.md) - Common Discord issues

#### ⚙️ Operations Guides
Operational procedures and workflows:
- [**RUNBOOK.md**](guides/operations/RUNBOOK.md) - Comprehensive operational procedures
- [**CI_CD_WORKFLOW_TEMPLATE.yml**](guides/operations/CI_CD_WORKFLOW_TEMPLATE.yml) - CI/CD workflow template

### 🔍 Reference
Technical references and command documentation:
- [**commands/TRIAGE_COMMAND_REFERENCE.md**](reference/commands/TRIAGE_COMMAND_REFERENCE.md) - Triage command reference

### 🔧 Troubleshooting
Debugging and issue resolution:
- [**DISCORD_TROUBLESHOOTING.md**](troubleshooting/DISCORD_TROUBLESHOOTING.md) - General Discord troubleshooting
- [**DISCORD_DEPLOYMENT_TROUBLESHOOTING.md**](troubleshooting/DISCORD_DEPLOYMENT_TROUBLESHOOTING.md) - Deployment issues

### 📦 Additional Documentation
- [**AWS_AUTO_DEPLOYER.md**](AWS_AUTO_DEPLOYER.md) - Automated AWS deployment system
- [**DEPLOYBOT_QUICK_START.md**](DEPLOYBOT_QUICK_START.md) - DeployBot quick start
- [**DEPLOYBOT_SECRETS_SETUP.md**](DEPLOYBOT_SECRETS_SETUP.md) - Secret configuration
- [**IMPLEMENTATION_SUMMARY.md**](IMPLEMENTATION_SUMMARY.md) - Overall implementation summary
- [**LAMBDA_DEPLOY_RECOVERY.md**](LAMBDA_DEPLOY_RECOVERY.md) - Lambda deployment recovery

### 🗄️ Deprecated Documentation
Historical documentation moved to [deprecated/](deprecated/) folder.

## 🎯 Quick Links by Use Case

### I want to...

**Set up the orchestrator for the first time:**
1. Start with [INTEGRATION_GUIDE.md](getting-started/INTEGRATION_GUIDE.md)
2. Follow [AWS_AUTO_DEPLOYER.md](AWS_AUTO_DEPLOYER.md) for deployment
3. Check [DEPLOYBOT_SECRETS_SETUP.md](DEPLOYBOT_SECRETS_SETUP.md) for secrets configuration

**Set up a staging environment:**
- Read [QUICK_START_STAGING.md](getting-started/QUICK_START_STAGING.md)

**Understand the bot architecture:**
- Check [BOT_UNIFIER_GUIDE.md](guides/discord/BOT_UNIFIER_GUIDE.md)

**Troubleshoot Discord issues:**
- Start with [START_HERE_DISCORD_ISSUES.md](guides/discord/START_HERE_DISCORD_ISSUES.md)
- See [DISCORD_TROUBLESHOOTING.md](troubleshooting/DISCORD_TROUBLESHOOTING.md) for common issues

**Configure automated agents:**
- Backend Agent: [backend_agent.md](backend_agent.md)
- UX Agent: [UX_AGENT_README.md](guides/agents/UX_AGENT_README.md)
- QA Checker: [QA_CHECKER_GUIDE.md](guides/agents/QA_CHECKER_GUIDE.md)
- Issue Triage: [ISSUE_TRIAGE_AGENT_GUIDE.md](guides/agents/ISSUE_TRIAGE_AGENT_GUIDE.md)

**Understand operational procedures:**
- Read [RUNBOOK.md](guides/operations/RUNBOOK.md)

**Work with slash commands:**
- [DISCORD_SLASH_CMD_AGENT.md](guides/discord/DISCORD_SLASH_CMD_AGENT.md)
- [DISCORD_SLASH_CMD_QUICK_REF.md](guides/discord/DISCORD_SLASH_CMD_QUICK_REF.md)

## 🔗 Related Documentation

- [Main Orchestrator README](../README.md) - Orchestrator overview
- [Scripts Documentation](../scripts/README.md) - Available scripts
- [Examples](../examples/) - Example usage scripts

## 📝 Contributing

When adding new documentation:
1. Place it in the appropriate subdirectory
2. Update this index with a link and description
3. Update cross-references in related documents
4. Follow the naming conventions: Use UPPERCASE_WITH_UNDERSCORES.md

## 📄 License

All documentation is part of Project Valine and follows the project's license.
