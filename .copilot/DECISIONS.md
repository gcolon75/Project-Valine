# Architectural Decision Log

This document records significant architectural and implementation decisions for Project Valine.

## Decision #004: Create Persistent Copilot Knowledge Base
**Date:** 2025-11-24  
**Context:** AI agents lose context between sessions  
**Decision:** Create `.copilot/` directory with structured knowledge files  
**Rationale:**  
- Provides persistent context for AI agents
- Documents decisions for future reference
- Tracks changes and task history
- Reduces repeated work by agents
**Implementation:**
- `.copilot/README.md` - Quick overview
- `.copilot/CHANGELOG.md` - PR history
- `.copilot/DECISIONS.md` - This file
- `.copilot/AGENT_TASKS.md` - Task registry
- `.copilot/REPO_STRUCTURE.md` - Structure guide

## Decision #003: Dev Bypass Mode for Local Development
**Date:** 2025-11-24  
**Context:** Need rapid UI/UX iteration without authentication friction  
**Decision:** Add `VITE_DEV_BYPASS_AUTH` flag that auto-logs in as mock user  
**Rationale:**  
- Speeds up frontend development
- No need to register/login for every UI change
- Only works in dev mode (protection against prod usage)
- Visual indicator prevents confusion
**Alternatives Considered:**  
- Keep authentication always enabled (rejected - too slow for UI work)
- Use test accounts (rejected - still requires login flow)
- Disable auth entirely in dev (rejected - might miss auth-related bugs)
**Implementation:**
- `src/lib/devBypass.js` - Core logic
- `src/components/DevModeIndicator.jsx` - Visual indicator
- Triple-gate security (env flag + DEV mode + localhost)

## Decision #002: Allowlist-Only Registration
**Date:** 2025-11-24  
**Context:** Production should be invite-only initially  
**Decision:** `ENABLE_REGISTRATION=false` + `ALLOWED_USER_EMAILS` env var  
**Rationale:**  
- Control user base during beta
- Prevent spam/abuse
- Easy to open up later
- Cost control for API usage
**Implementation:** 
- Backend rejects non-allowlisted emails with 403
- Frontend shows restriction notice
- Admin scripts for account provisioning
**Alternatives Considered:**
- Open registration (rejected - no spam protection)
- Invite codes (rejected - adds complexity)
- Manual approval (rejected - too slow)

## Decision #001: Migrations Before Backend Deployment
**Date:** 2025-11-24  
**Context:** Backend code expects new schema structure  
**Decision:** Always run `npx prisma migrate deploy` BEFORE `serverless deploy`  
**Rationale:**  
- Backend code assumes new columns exist
- Deploying code first causes runtime errors
- Migrations are safer to run first (additive changes)
- Rollback is simpler if migration fails before code deploy
**Alternatives Considered:**  
- Deploy code first (rejected - causes crashes)
- Run migrations and deploy atomically (too complex)
- Database version checks in code (adds latency)
**Implementation:**
- Documented in PRODUCTION_DEPLOYMENT_GUIDE.md
- CI/CD runs migrations in separate step
- Verification scripts check schema before deploy

---

## Template for New Decisions

```markdown
## Decision #NNN: Title
**Date:** YYYY-MM-DD  
**Context:** What problem or need prompted this decision?  
**Decision:** What did we decide to do?  
**Rationale:** Why did we choose this approach?  
**Alternatives Considered:** What other options were evaluated?  
**Implementation:** How is this implemented?
```
