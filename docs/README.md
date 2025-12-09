# Project Valine Documentation

**Welcome to the Project Valine documentation hub!** This index provides quick access to all documentation organized by category.

📍 **New here?** Start with:
- **[COMPREHENSIVE_SUMMARY.md](../COMPREHENSIVE_SUMMARY.md)** - Complete project overview for agents & new chat sessions
- **[Project Status](../PROJECT_STATUS.md)** - Executive overview of readiness, security, and QA

---

## Quick Links

| Category | Description | Key Documents |
|----------|-------------|---------------|
| 🚀 [Getting Started](#getting-started) | Quickstart guides and setup | Setup, Quickstart, Contributing |
| 🔒 [Security](#security) | Security implementation and policies | CSP, Rate Limiting, Incident Response |
| 📊 [API Reference](#api-reference) | Backend API documentation | Endpoints, Contracts, Integration |
| 🧪 [QA & Testing](#qa--testing) | Testing strategies and coverage | Unit Tests, E2E, Accessibility |
| 🎨 [UX & Design](#ux--design) | UX audit findings and design system | Audit Reports, Transformation Plan |
| 🖥️ [Frontend](#frontend) | Frontend architecture and components | Hardening, API Integration, Review |
| 🗄️ [Backend](#backend) | Backend implementation and migrations | Profile Links, Theme API, Migrations |
| 🤖 [Agents](#agents) | AI agent documentation | Backend Agent, Hardening, Tasks |
| ✅ [Verification](#verification) | Post-merge verification and regression testing | Verification Guide, Regression Tests |
| 🚀 [Operations](#operations) | Deployment, monitoring, and runbooks | AWS Deployment, CI/CD, Monitoring |
| 📖 [Reference](#reference) | Project summaries and historical docs | Implementation Summaries, Roadmap |
| 🗃️ [Archive](#archive) | Deprecated and historical documentation | Merged Summaries, Phase Closeouts |

---

## Getting Started

Essential guides to get Project Valine up and running.

### Core Setup
- **[COMPREHENSIVE_SUMMARY](../COMPREHENSIVE_SUMMARY.md)** - Complete project overview for agents & new sessions
- **[Project Status](../PROJECT_STATUS.md)** - Current state, readiness, and next steps
- **[System Handbook](PROJECT_VALINE_SYSTEM_HANDBOOK.md)** - ⭐ **NEW!** Complete system reference: architecture, database, API, workflows, troubleshooting
- **[Environment Variables Checklist](ENV_CHECKLIST.md)** - ⭐ **NEW!** Complete env var reference for all environments
- **[README](../README.md)** - Project overview and high-level features
- **[CONTRIBUTING](../CONTRIBUTING.md)** - Contribution guidelines
- **[CHANGELOG](../CHANGELOG.md)** - Release notes and changes

### Quickstart Guides
- [Quickstart README](quickstart/README.md) - Get started in minutes
- [Agents Quickstart](quickstart/agents.md) - Set up AI agents
- [Operational Readiness](quickstart/operational-readiness.md) - Production deployment prep
- [Orchestrator Setup](quickstart/orchestrator.md) - Discord bot orchestration
- [Phase 5 Super Agent](quickstart/phase5-super-agent.md) - Advanced automation

### Setup Guides
- [Supabase Setup](guides/supabase-setup.md) - Configure Supabase backend
- [Sanity CMS Setup](guides/sanity-setup.md) - Set up Sanity content management
- [Profile Settings](guides/profile-settings.md) - User profile configuration
- [Next Steps](guides/next-steps.md) - Manual actions after deployment

---

## Security

Comprehensive security documentation covering authentication, authorization, CSP, and incident response.

### Security Policies
- **[Security Guide](security/guide.md)** - Overview of security measures
- **[CSP Policy](security/csp-policy.md)** - Content Security Policy configuration
- **[CSP Rollout Plan](security/rollout-plan.md)** - Phased CSP enforcement strategy
- **[Environment Variables](security/environment-variables.md)** - Secure configuration management

### Security Implementation
- [Implementation Summary](security/implementation.md) - Detailed security implementation
- [Rollout Summary](security/rollout-summary.md) - Security rollout progress
- [Epic Summary](security/epic-summary.md) - Security epic completion report
- [Consolidated Audit Report](security/consolidated-audit-report.md) - Full security audit findings
- [Docs Delivery](security/docs-delivery.md) - Security documentation deliverables

### Incident Response
- [Incident Response: Auth Abuse](security/incident-response-auth-abuse.md) - Runbook for authentication attacks

### Testing
- [Security Testing](qa/security.md) - Security test coverage and strategies
- CSP Compliance Tests: `tests/e2e/csp-compliance.spec.ts`
- Negative Flow Tests: `tests/e2e/negative-flows.spec.ts`

---

## API Reference

Backend API documentation including endpoints, contracts, and integration guides.

### Core API Docs
- **[API Reference](api/reference.md)** - Complete API endpoint reference
- **[Development Guide](api/development.md)** - Local API development setup
- **[Integration Guide](api/integration-guide.md)** - Frontend-backend integration
- **[Contract Testing](api/contract.md)** - API contract definitions and tests

### Specific APIs
- [Profile Links API](backend/api-profile-links.md) - Profile links endpoints and schemas
- [Theme Preference API](backend/theme-preference-api.md) - User theme preference management
- [Dashboard API](api/dashboard.md) - Dashboard stats and aggregations
- [Preferences API](api/preferences.md) - User preferences endpoints
- [Profiles API](api/profiles.md) - User profile CRUD operations

### Issues & Troubleshooting
- [Dev API Base Issue](api/dev-api-base-issue.md) - API base URL configuration

---

## QA & Testing

Testing infrastructure, strategies, and quality assurance documentation.

### Testing Overview
- **[QA README](qa/README.md)** - Overview of QA processes
- [CI Overview](qa/ci-overview.md) - Continuous integration testing

### Testing Strategies
- [Accessibility Checklist](qa/a11y-checklist.md) - WCAG AA compliance checklist
- [Lighthouse](qa/lighthouse.md) - Performance and accessibility audits
- [Bundle Optimization](qa/bundle-optimization.md) - Frontend bundle size optimization
- [Security Testing](qa/security.md) - Security test coverage

### Test Suites
- **Unit Tests:** 107 tests, 45% coverage (run `npm test`)
- **E2E Tests (Playwright):**
  - `tests/e2e/accessibility-sweep.spec.ts` - WCAG AA compliance
  - `tests/e2e/visual-regression.spec.ts` - Cross-browser screenshots
  - `tests/e2e/csp-compliance.spec.ts` - CSP violation detection
  - `tests/e2e/negative-flows.spec.ts` - Error handling

### Test Results
- Test reports: `playwright-report/index.html`
- Accessibility: `test-results/accessibility/results.json`
- Visual regression: `test-results/visual-regression/`

---

## UX & Design

UX audit findings, transformation plans, and design system documentation.

### UX Audit
- **[UX Audit README](ux/README.md)** - Overview of UX audit process
- [Audit Report](ux/audit-report.md) - Comprehensive UX audit findings
- [Implementation Summary](ux/implementation-summary.md) - UX improvements implemented
- [Findings (CSV)](ux/findings.csv) - Structured audit data
- [Summary (JSON)](ux/summary.json) - Machine-readable summary

### UX Agent
- [UX Agent](ux/agent.md) - Automated UX audit agent documentation
- [Examples](ux/examples.md) - UX audit examples
- [Audit to Issues Guide](ux/audit-to-issues-guide.md) - Convert audit findings to GitHub issues
- [Audit to Issues Examples](ux/audit-to-issues-examples.md) - Example issue generation
- [Audit to Issues README](ux/audit-to-issues-readme.md) - Automation workflow

### Planning
- [Transformation Plan](ux/transformation-plan.md) - UX improvement roadmap
- [Issues Summary](ux/issues-summary.md) - Prioritized UX issues
- [Task Completion](ux/task-completion-issues.md) - Completed UX tasks

---

## Frontend

Frontend architecture, component documentation, and hardening reports.

### Architecture & Patterns
- [Agent Instructions](frontend/agent-instructions.md) - Frontend agent guidelines
- [API Integration](frontend/api-integration-complete.md) - Backend integration patterns
- [Hardening Report](frontend/hardening-report.md) - Security hardening implementation
- [Implementation Summary](frontend/implementation-summary-hardening.md) - Frontend hardening details

### Code Review
- [Review Agent Prompt](frontend/review-agent-prompt.md) - Automated code review agent
- [Review Report](frontend/review-report.md) - Frontend code review findings

### Design System
- [Image Optimization Guide](IMAGE_OPTIMIZATION_GUIDE.md) - Image optimization best practices

---

## Backend

Backend implementation details, API documentation, and database migrations.

### Implementation
- [Agent Instructions](backend/agent-instructions.md) - Backend agent guidelines
- [Profile Implementation](backend/profile-implementation.md) - User profile backend

### API Documentation
- [Profile Links API](backend/api-profile-links.md) - Profile links endpoints
- [Theme Preference API](backend/theme-preference-api.md) - Theme preference management
- [Profile Links Implementation](backend/profile-links-implementation.md) - Implementation details
- [Profile Links TODO](backend/profile-links-todo.md) - Remaining work

### Troubleshooting & Operations
- **[Troubleshooting Runbook](backend/troubleshooting-auth-profile-posts.md)** - ⭐ **NEW!** Practical commands for debugging auth, profiles, posts, feed, connections

### Database & Migrations
- [Profile Links Migration](backend/migration-profile-links.md) - Migration guide and rollback
- [Profile Schema](backend/profile-schema.json) - JSON schema for profile data

---

## Agents

AI agent documentation covering backend agents, hardening, and task automation.

### Agent Documentation
- [Backend Agent Implementation](agents/backend-implementation.md) - Backend agent architecture
- [Backend Tasks](agents/backend-tasks.md) - Task automation with agents
- [Hardening Implementation](agents/hardening-implementation.md) - Security hardening via agents
- [Conversation State](agents/conversation-state.md) - Agent conversation management

### Running Agents
- [Agents Quickstart](quickstart/agents.md) - Quick setup guide
- [Orchestrator Setup](quickstart/orchestrator.md) - Discord bot orchestration

---

## Verification

Post-merge verification scripts, regression testing, and quality gates.

### Verification Guides
- **[Verification Guide](verification/guide.md)** - Post-merge verification process
- [Implementation](verification/implementation.md) - Verification implementation details
- [Verification Report (PR 186)](verification/verification-report-pr186.md) - PR 186 verification results

### Regression Testing
- **[Regression Sweep README](verification/regression-sweep-readme.md)** - E2E regression test suite
- [Regression Sweep Deliverables](verification/regression-sweep-deliverables.md) - Test infrastructure (PR 187)

### Running Verification
```bash
# Run post-merge verification
npm run verify:post-merge

# View report
cat logs/verification/verification-report.md

# Run regression tests
npm run test:e2e
```

---

## Operations

Deployment guides, CI/CD setup, monitoring, and operational runbooks.

### Deployment
- **[Deployment Index](ops/deployment-index.md)** - Overview of deployment options
- [AWS Deployment Quickstart](ops/aws-deployment-quickstart.md) - Deploy to AWS
- [Deployment Flow](ops/deployment-flow.md) - Deployment workflow and rollback
- [CI/CD Setup](ops/ci-cd-setup.md) - Configure automated deployments

### Detailed Deployment Guides
- [Overview](deployment/overview.md) - Deployment architecture
- [Deployment Guide](deployment/deployment-guide.md) - Step-by-step deployment
- [Backend Instructions](deployment/backend-instructions.md) - Backend deployment
- [Quick Deploy](deployment/quick-deploy.md) - Fast deployment script
- [Quick Deploy Backend](deployment/quick-deploy-backend.md) - Backend-only deploy
- [Serverless Guide](deployment/serverless-guide.md) - AWS Lambda deployment
- [AWS Guide](deployment/aws-guide.md) - Comprehensive AWS setup
- [Checklist](deployment/checklist.md) - Pre-deployment checklist
- [Release Checklist](deployment/release-checklist.md) - Release readiness

### Monitoring & Observability
- [CloudWatch Setup](ops/cloudwatch-setup.md) - AWS CloudWatch configuration
- [Sentry Setup](ops/sentry-setup.md) - Error tracking with Sentry
- [Execution Guide](ops/execution-guide.md) - Production execution

### Operational Readiness
- [Readiness Summary](ops/readiness-summary.md) - Production readiness checklist
- [Operational Readiness](quickstart/operational-readiness.md) - Deployment prerequisites

### Runbooks
- [2FA Enablement](runbooks/2fa-enablement.md) - Enable two-factor authentication
- [Email Verification](runbooks/email-verification.md) - Email verification flow
- [Password Reset](runbooks/password-reset.md) - Password reset process
- **[Auth Backend Investigation](AUTH_BACKEND_INVESTIGATION.md)** - Troubleshoot auth connectivity issues (DNS, network errors)
- **[White Screen Runbook](white-screen-runbook.md)** - Diagnose and fix frontend loading issues

### Troubleshooting
- [Troubleshooting README](troubleshooting/README.md) - Common issues
- **Discord Bot Troubleshooting:**
  - [Discord README](troubleshooting/discord/DISCORD_README.md)
  - [Discord Quickref](troubleshooting/discord/DISCORD_QUICKREF.md)
  - [Discord Flowchart](troubleshooting/discord/DISCORD_FLOWCHART.md)
  - [Discord Endpoint Diagnostic](troubleshooting/discord/DISCORD_ENDPOINT_DIAGNOSTIC.md)
  - [Discord Fix Summary](troubleshooting/discord/DISCORD_FIX_SUMMARY.md)
  - [Discord Slash Commands Fix](troubleshooting/discord/DISCORD_SLASH_COMMANDS_FIX_PR.md)
  - [Discord Slash Commands Deployment Fix](troubleshooting/discord/DISCORD_SLASH_COMMANDS_DEPLOYMENT_FIX.md)
  - [Discord Slash Command Agent](troubleshooting/discord/DISCORD_SLASH_CMD_AGENT_SUMMARY.md)

---

## Reference

Project summaries, release notes, roadmaps, and historical documentation.

### Project Status
- **[Current Status](reference/project-status.md)** - Legacy status document (see [PROJECT_STATUS.md](../PROJECT_STATUS.md))
- [Project Summary](reference/project-summary.md) - Project overview
- [Project State (2025-10-29)](reference/project-state-2025-10-29.md) - Historical snapshot

### Planning & Roadmap
- [Roadmap](reference/roadmap.md) - Feature roadmap
- [Changes](reference/changes.md) - UX-specific change log
- [Release Notes](reference/release-notes.md) - Release history
- [Next Steps](NEXT_STEPS.md) - Immediate next actions

### Implementation Summaries
- [Implementation Summary](reference/implementation-summary.md) - Comprehensive implementation report
- [Task Completion Summary](reference/task-completion-summary.md) - Task tracking
- [Discord Button Implementation](reference/discord-button-implementation.md) - Discord integration

### Privacy & Data Management
- [Data Deletion](privacy/data-deletion.md) - User data deletion process
- [Data Export](privacy/data-export.md) - User data export API

### Additional Docs
- [Reorganization Summary](REORGANIZATION_SUMMARY.md) - Docs reorganization notes
- [Summary](SUMMARY.md) - General project summary
- [Troubleshooting](TROUBLESHOOTING.md) - General troubleshooting

---

## Archive

Deprecated, merged, and historical documentation. **Not recommended for current development.**

### Recent Archives
- [PR Summary](archive/PR_SUMMARY.md)
- [Triage Automation Summary](archive/TRIAGE_AUTOMATION_SUMMARY.md)
- [Orchestrator Consolidation](archive/ORCHESTRATOR_CONSOLIDATION.md)

### Historical Documents
- [Autonomous Agent Summary](archive/historical/AUTONOMOUS_AGENT_SUMMARY-20251104.md)
- [AI Agent Build Plan](archive/historical/AI_AGENT_BUILD_PLAN-20251104.md)
- [Implementation Summary (Phase 3-4)](archive/historical/IMPLEMENTATION_SUMMARY_PHASE3_4-20251104.md)
- [Phase 5 Summary](archive/historical/IMPLEMENTATION_SUMMARY_PHASE5-20251104.md)
- [Phase 6 Summary](archive/historical/PHASE6_IMPLEMENTATION_SUMMARY-20251104.md)
- [Backend Phase 2 Summary](archive/historical/BACKEND_PHASE_02_SUMMARY-20251104.md)
- [Agent Wrapup](archive/historical/AGENT_WRAPUP-20251104.md)

### Merged Summaries
- [Project Valine Summary (Merged)](archive/merged/PROJECT_VALINE_SUMMARY-merged-20251104.md)
- [Project Summary (Merged)](archive/merged/PROJECT_SUMMARY-merged-20251104.md)

### Slash Commands (Archived)
- [PR Description Slash Commands](archive/PR_DESCRIPTION_SLASH_COMMANDS.md)
- [Staging Slash Commands](archive/STAGING_SLASH_COMMANDS_IMPLEMENTATION.md)
- [Quickstart Slash Commands](archive/QUICKSTART_SLASH_COMMANDS.md)

### Diagnostics (Historical)
See `diagnostics/` folder for phase-specific validation and closeout reports.

---

## Contributing to Documentation

### Adding New Documentation
1. Choose the appropriate section (security, backend, frontend, etc.)
2. Create a descriptive filename (kebab-case: `my-new-doc.md`)
3. Update this index (`docs/README.md`) with a link
4. Update related navigation links
5. Run link checker to verify

### Maintaining Documentation
- Review quarterly for accuracy
- Archive outdated docs to `docs/archive/`
- Update cross-references when moving files
- Keep [PROJECT_STATUS.md](../PROJECT_STATUS.md) current

### Documentation Standards
- Use Markdown with consistent formatting
- Include code examples where applicable
- Add navigation links (back to index)
- Use relative links (e.g., `../PROJECT_STATUS.md`)
- Test links with `markdown-link-check`

---

## Need Help?

- 🐛 **Found a bug?** Open an issue: [GitHub Issues](https://github.com/gcolon75/Project-Valine/issues)
- 💬 **Questions?** Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- 📖 **Confused?** Start with [COMPREHENSIVE_SUMMARY.md](../COMPREHENSIVE_SUMMARY.md) or [Project Status](../PROJECT_STATUS.md)
- 🤝 **Want to contribute?** See [CONTRIBUTING.md](../CONTRIBUTING.md)

---

**Last Updated:** 2025-11-29  
**Documentation Version:** 1.1 (Added COMPREHENSIVE_SUMMARY.md reference)
