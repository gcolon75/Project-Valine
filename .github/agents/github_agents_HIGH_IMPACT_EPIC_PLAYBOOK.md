# High-Impact Epic — Security, Reliability, and Orchestrator Upgrade
Updated: 2025-11-11

Objective
Execute six high-impact improvements, plus critical fixes from the System Review, via small, sequential PRs. Make the platform production-ready with stronger security, proactive health, and a modular Discord orchestrator.

Scope
Pre-Phase: Critical Fixes from Review
A) Permission Matrix + RBAC for Discord sensitive commands
B) Daily Health Snapshot + Scheduled Post
C) HttpOnly Cookie Auth + /auth/refresh
D) Global Rate Limiting (Redis) for auth/write endpoints
E) Modularize Discord Handler + Introduce State Store
F) Release Conductor MVP (post-deploy verification + promote/rollback)

Guardrails
- Branch: automaton/epic-<phase-slug>
- PR title: “[Automaton] Epic <Phase>: <goal>”
- PR must include: changes, checklist, test evidence (curl outputs/screenshots), rollback notes
- CI required: lint, tests, build; smoke script; analyzer where applicable
- Keep changes minimal and focused per PR

Environment/Secrets
- Already set: JWT_SECRET, DATABASE_URL, AWS_REGION, S3_BUCKET, VITE_API_BASE
- New (as needed):
  - REDIS_URL (for rate limiting/state store if choosing Redis)
  - DISCORD_STATUS_CHANNEL_ID (for health snapshot posts)
  - COOKIE_DOMAIN (prod), FRONTEND_BASE_URL (existing), SameSite policy
  - ADMIN_ROLE_IDS (comma-separated Discord role IDs for RBAC)

Deliverables per phase
- Code + tests
- Docs updates (docs/security, docs/deployment, docs/orchestrator)
- PR evidence (curl, screenshots)

Readiness Check (pre-run)
- VITE_ENABLE_AUTH=true in staging/prod
- System review merged (PR #208)
- Agent permissions to create PRs

-------------------------------------------------------------------------------

Pre-Phase — Critical Fixes (from System Review)

Goal
Address security and parity gaps before enhancements.

Tasks
- Fix password verification in account deletion:
  - Ensure DELETE /account checks bcrypt.compare() and returns 401 on mismatch.
- Enforce email verification:
  - Gate protected actions for unverified users; ensure middleware checks user.emailVerified.
- Implement/confirm POST /auth/resend-verification:
  - If missing, add endpoint; in dev/log mode prints token; in staging uses SMTP if enabled.
- Sync Discord registry vs implemented commands:
  - Update agents/registry to reflect actual slash commands, or hide non-implemented routes.
- VITE_ENABLE_AUTH usage:
  - Confirm frontend honors flag; ensure staging=true, local=false.

Success Criteria
- Curl delete-account invalid password → 401
- Resend endpoint returns success; token logs in dev or emails in staging
- Unverified user blocked from protected actions with 403 + clear message
- Registry and handler commands aligned; tests updated

Rollback
- Revert touched files

-------------------------------------------------------------------------------

Phase A — Permission Matrix + RBAC (Discord)

Goal
Restrict sensitive commands (/deploy-client, /ship, /triage, /verify-run) to specific Discord roles.

Tasks
- Add config: orchestrator/config/permission_matrix.json
  - Map command → allowedRoleIds[]
- Implement RBAC check in command dispatch:
  - Extract member roles from interaction; deny if not allowed
  - Return ephemeral error with guidance
- Tests:
  - Unit: allowed vs denied role
  - Integration: mock interaction payloads

Docs
- docs/orchestrator/permissions.md (how to set role IDs, override)

Success Criteria
- Non-authorized user gets clean 403-style ephemeral message
- Authorized user proceeds normally
- Tests pass

Rollback
- Disable RBAC check (feature flag) or revert changes

-------------------------------------------------------------------------------

Phase B — Daily Health Snapshot + Schedule

Goal
Proactively post a daily health summary (latency, error %, test pass rate) to a Discord channel and support on-demand `/status-digest`.

Tasks
- Add HealthSnapshot service:
  - Gather metrics: ping API endpoints, compute p50/p95 latency; fetch CI summary; count errors if possible
- Command: /status-digest
  - Post embed with trend arrows vs 7-day avg (persist tiny rolling window in state store)
- Scheduler:
  - CloudWatch rule or GitHub Actions cron calls a small lambda/function to post summary daily at 09:00 UTC
- Env: DISCORD_STATUS_CHANNEL_ID

Docs
- docs/orchestrator/health_snapshot.md (fields, schedule, channel)

Success Criteria
- Manual /status-digest posts a structured embed
- Scheduled post appears daily
- No secrets in logs

Rollback
- Disable schedule; command remains manual

-------------------------------------------------------------------------------

Phase C — HttpOnly Cookie Auth + Refresh

Goal
Harden auth: move tokens to HttpOnly cookies and add refresh rotation.

Tasks
- Backend:
  - POST /auth/login: set HttpOnly Secure SameSite=Lax cookie with short-lived access token; return minimal user JSON
  - POST /auth/refresh: issue new access token if refresh cookie valid
  - POST /auth/logout: clear cookies
  - Validate JWT from cookie by default; keep Authorization header fallback for tooling
- Frontend:
  - authService: remove localStorage usage when VITE_ENABLE_AUTH=true; rely on cookies
  - CSRF: add lightweight CSRF header/token for state-changing requests (double-submit or SameSite=Lax acceptable MVP)
- Tests:
  - Curl flows for login/refresh/logout; check Set-Cookie headers

Docs
- docs/security/cookie_auth.md (cookie flags, rotation, CSRF)

Success Criteria
- Access token not stored in JS; login/refresh/logout flows work
- Protected routes OK; refresh before expiry works
- Existing analyzer/smoke unchanged (or adapted)

Rollback
- Feature flag to use header tokens; revert cookie behavior if needed

-------------------------------------------------------------------------------

Phase D — Global Rate Limiting (Redis)

Goal
Add simple, global, per-identifier rate limiting for auth and write endpoints.

Tasks
- Choose identifier: IP (X-Forwarded-For) + userId when available
- Implement rateLimit middleware:
  - Key pattern rl:<route>:<identifier>
  - Allow N per window; set TTL; respond 429 with Retry-After
- Scope: /auth/*, POST/PUT/DELETE API routes (profiles, media complete, settings)
- Env: REDIS_URL (or use AWS ElastiCache); provide in-memory fallback for local dev

Docs
- docs/security/rate_limiting.md (thresholds, keys)

Success Criteria
- Exceeding limits returns 429; normal use unaffected
- Tests simulate burst and confirm backoff

Rollback
- Disable via env flag RATE_LIMITING_ENABLED=false

-------------------------------------------------------------------------------

Phase E — Modularize Discord Handler + State Store

Goal
Split monolithic handler into command modules and add a StateStore for multi-step flows (buttons, confirmations, release IDs).

Tasks
- Create orchestrator/app/commands/<command>.py modules
- Dispatcher routes interaction by command name and message component custom_id prefixes
- StateStore:
  - Backed by Redis or Postgres (table conversation_states)
  - API: put(key, value, ttl), get(key), delete(key)
- Update tests accordingly

Docs
- docs/orchestrator/architecture.md (modules, state store)

Success Criteria
- Existing commands function as before
- Button flows persist state across interactions
- Tests pass

Rollback
- Keep old handler behind feature flag OR revert

-------------------------------------------------------------------------------

Phase F — Release Conductor MVP

Goal
Orchestrate a deploy verification with promote/rollback actions.

Tasks
- Command: /ship [--env staging|prod] [--strategy canary|full]
- Flow:
  1) Trigger deploy (existing workflow)
  2) Run verification checks: critical endpoint ping, synthetic login, search, media presign sanity
  3) Post embed summary with buttons: Promote / Rollback / Details
  4) On Promote: trigger full rollout
  5) On Rollback: trigger previous version or blue/green switch (best available)
- Use StateStore to track deployId, results, decision

Docs
- docs/orchestrator/release_conductor.md (KPIs, thresholds, buttons)

Success Criteria
- After /ship, bot posts verification summary
- Buttons work, message updates and removes buttons post-action
- Logs include correlation_id for traceability

Rollback
- Restrict to staging; hide command behind RBAC

-------------------------------------------------------------------------------

Acceptance Evidence (per PR)
- Curl/HTTP transcripts (cookies, 401/403/429 cases)
- Discord screenshots of embeds/buttons
- Test output counts
- Short rollback instruction

Minimal Owner Actions
- Provide DISCORD_STATUS_CHANNEL_ID and ADMIN_ROLE_IDS
- Provide REDIS_URL (or approve local fallback for dev)
- Approve PRs or enable auto-merge

Exit Criteria (Epic)
- Critical fixes merged and verified
- RBAC enforced on sensitive commands
- Daily health snapshot posting automatically
- Cookie-based auth with refresh live on staging
- Rate limiting effective on auth/write endpoints
- Discord modularization + state store in place
- Release Conductor MVP working on staging

Now execute this epic playbook phases in order.