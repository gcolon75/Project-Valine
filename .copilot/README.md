# Project Valine - Copilot Knowledge Base

**Last Updated:** 2025-11-24  
**Production Status:** 🟡 Staging  
**Next Deployment:** TBD  

## Quick Links

- [Deployment Guide](../PRODUCTION_DEPLOYMENT_GUIDE.md)
- [Change Log](./CHANGELOG.md)
- [Recent Decisions](./DECISIONS.md)
- [Repository Structure](./REPO_STRUCTURE.md)
- [Agent Tasks](./AGENT_TASKS.md)

## Current State

### Production Infrastructure
- **API:** https://ce73w43mga.execute-api.us-west-2.amazonaws.com
- **Frontend:** https://dkmxy676d3vgc.cloudfront.net
- **Database:** RDS PostgreSQL (us-west-2)

### Recent Activity
- **2025-11-24:** Repository organization and deployment streamlining
- **2025-11-24:** PR #267 - Deployment documentation added
- **2025-11-24:** PR #266 - Verification scripts added
- **2025-11-21:** Schema migrations for user fields

### Active Users
- ghawk075@gmail.com (Owner)
- [FRIEND_EMAIL] (TBD)

## How to Deploy

### UX Changes Only
```bash
export VITE_API_BASE=https://ce73w43mga.execute-api.us-west-2.amazonaws.com
export S3_BUCKET=your-bucket
export CLOUDFRONT_DISTRIBUTION_ID=your-dist-id
./scripts/deploy-ux-only.sh
```

### Full Deployment
See [PRODUCTION_DEPLOYMENT_GUIDE.md](../PRODUCTION_DEPLOYMENT_GUIDE.md)

## Quick Reference

### Environment Files
| File | Purpose |
|------|---------|
| `.env.example` | Template for all env vars |
| `.env.local.example` | Template for local dev |
| `client/.env.local.example` | Template for client-only dev |
| `serverless/.env.example` | Template for backend |

### Key Scripts
| Script | Purpose |
|--------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `./scripts/deploy-ux-only.sh` | Deploy frontend only |
| `scripts/provision-production-accounts.mjs` | Create user accounts |
| `scripts/admin-upsert-user.mjs` | Create/update users |
| `scripts/admin-set-password.mjs` | Reset user password |
| `scripts/verify-production-deployment.mjs` | Verify production |

### Feature Flags
| Flag | Purpose |
|------|---------|
| `VITE_DEV_BYPASS_AUTH` | Enable dev bypass mode |
| `VITE_ENABLE_AUTH` | Require authentication |
| `VITE_ENABLE_REGISTRATION` | Show registration UI |
| `ENABLE_REGISTRATION` | Backend registration control |

## For AI Agents

When working on this repository:

1. **Check existing docs first** - Many guides exist in the root directory
2. **Use existing scripts** - Don't recreate functionality that exists
3. **Follow patterns** - JSX for components, MJS for scripts
4. **Test locally** - Use `npm run dev` and `npm run build`
5. **Update this knowledge base** - Add decisions and changes

### Common Tasks

**Add a new page:**
1. Create in `src/pages/`
2. Add route in `src/routes/`
3. Test with `npm run dev`

**Add a new component:**
1. Create in `src/components/`
2. Export from relevant index if exists
3. Test in storybook or page

**Add a new API endpoint:**
1. Add handler in `serverless/src/handlers/`
2. Add route in `serverless/serverless.yml`
3. Deploy with `cd serverless && npx serverless deploy`

**Create user account:**
1. Set `DATABASE_URL`
2. Run `node scripts/provision-production-accounts.mjs --email=EMAIL --password=PASS --name=NAME`

## Agent Instructions

Comprehensive documentation for each agent team member:

- **Frontend Agent:** [docs/frontend/agent-instructions.md](../docs/frontend/agent-instructions.md)
  - React + Tailwind CSS patterns, dark mode, API integration, auth flow
- **Backend Agent:** [docs/backend/agent-instructions.md](../docs/backend/agent-instructions.md)
  - AWS Lambda handlers, Prisma ORM, JWT auth, media uploads
- **DevOps Agent:** [docs/devops/agent-instructions.md](../docs/devops/agent-instructions.md)
  - AWS deployment, infrastructure overview, common issues
- **Database Agent:** [docs/database/agent-instructions.md](../docs/database/agent-instructions.md)
  - PostgreSQL operations, Prisma migrations, schema reference
- **Testing Agent:** [docs/testing/agent-instructions.md](../docs/testing/agent-instructions.md)
  - API testing patterns, E2E testing with Playwright
- **Deployment Runbook:** [docs/ops/DEPLOYMENT_RUNBOOK.md](../docs/ops/DEPLOYMENT_RUNBOOK.md)
  - Step-by-step deployment guide, troubleshooting, rollback procedures
