# Project Valine — Automation Playbook (Fast-Track Consolidation)

Purpose
- Give agents a clear, self-running, phase-by-phase plan to consolidate backends, wire auth, and complete profile/media/settings/search flows with minimal human intervention.
- Target: hours, not days. Emphasize small PRs, strict checklists, and automated validations.

Outcomes
- One canonical backend (Serverless) for production/staging.
- Real authentication flows end-to-end (register, login, me, verify email, resend, logout).
- Frontend uses real auth in staging/prod; dev-bypass only locally.
- Profiles, media uploads, settings/privacy, reels, reel-requests, search wired to Serverless.
- Legacy Express routes clearly deprecated or archived.
- CI, smoke tests, and orchestration analyzer show green.

Guardrails (apply to every phase)
- Branch naming: automaton/<phase-slug>
- PR title: “[Automaton] <Phase n>: <short goal>”
- PR description must include:
  - What changed
  - Checklist (all boxes checked)
  - Test evidence (command outputs, screenshots if applicable)
  - Rollback notes
- CI must pass: typecheck, lint, unit, integration (vitest), build, e2e if applicable
- Smoke test must pass: ./scripts/deployment/test-endpoints.sh
- Analyzer checks: scripts/analyze-orchestration-run.mjs must report auth success if applicable
- Do not modify unrelated code. Keep atomic commits.

Prerequisites (Owner once; agents read-only)
- Confirm/Set repository/environment variables for staging/prod:
  - API (Serverless) JWT secret: JWT_SECRET
  - DATABASE_URL
  - AWS_REGION (e.g., us-west-2), MEDIA_BUCKET
  - EMAIL_ENABLED (true/false), SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL
  - FRONTEND: VITE_API_BASE (staging), VITE_ENABLE_AUTH (staging/prod true; dev false)
- Ensure prisma generation path is canonical: api/prisma/schema.prisma
- Keep Serverless as the deployed API; Express remains dev-only or archived.

How agents run this playbook
- Execute phases in order.
- Open a PR per phase.
- Use the Success Criteria for merge decision.
- If a phase introduces new environment variables, document in PR and add to docs/deployment.

---

## Phase 0 — Repository Prep and Flags

Branch: automaton/phase-00-repo-prep

Goal
- Ensure environment flags and configs are consistent so subsequent phases can run unattended.

Agent Tasks
- Verify .env.local.example includes:
  - VITE_ENABLE_AUTH=false (dev)
  - VITE_API_BASE=<placeholder>
- Verify docs/frontend/api-integration-complete.md references VITE_ENABLE_AUTH behavior.
- Add docs/agents/ENV_CHECKLIST.md with required env keys for API and frontend.
- Ensure scripts/deployment/test-endpoints.sh references /auth/login and handles 400/401 as accessible.
- Add a short README note clarifying:
  - Serverless is the canonical backend for staging/prod
  - Express routes are dev stubs only

Deliverables
- docs/agents/ENV_CHECKLIST.md (keys + descriptions)
- README.md note under Deployment/Backends
- Passing CI

Success Criteria
- Lint, tests, build pass
- ENV checklist present and accurate

Rollback
- Purely docs; no runtime risk.

Time Budget: 20–30 min

---

## Phase 1 — Canonicalize Backend (Serverless) and Deprecate Express

Branch: automaton/phase-01-canonicalize-backend

Goal
- Make Serverless the single production API. Mark Express routes as legacy/dev-only to avoid drift.

Agent Tasks
- Add a banner at server/ README or root docs: “Legacy dev server; do not deploy to staging/prod.”
- In docs/deployment/*, ensure Serverless endpoints are featured, Express endpoints labeled legacy.
- Confirm serverless/README.md already lists auth, profiles, media, settings, search, reels handlers; add any missing index/links.
- Ensure serverless/serverless.yml includes routes for:
  - /auth/register, /auth/login, /auth/me, (later: /auth/verify-email, /auth/resend-verification)
  - Existing: profiles, media, settings, search, reels, reel-requests
- Add a migration note: docs/backend/canonical-backend.md summarizing the decision.

Deliverables
- docs/backend/canonical-backend.md
- Docs updates, no functional code change unless routing missing

Success Criteria
- Smoke test can reach Serverless /auth/login (400/401 acceptable for empty creds)
- Analyzer doesn’t fail on missing endpoints

Rollback
- Docs-only; minimal risk.

Time Budget: 30–45 min

---

## Phase 2 — Serverless Auth Parity (Register/Login/Me + Bcrypt + JWT)

Branch: automaton/phase-02-auth-parity

Goal
- Ensure serverless/src/handlers/auth.js implements secure register/login/me with bcrypt + JWT, matching frontend contracts.

Agent Tasks
- Fix hashing if needed:
  - Use bcrypt (await hashPassword) and persist hashed password
- Token:
  - Sign JWT with process.env.JWT_SECRET
  - Return { user, token } on register/login; implement GET /auth/me
- Conflict checks:
  - Unique email/username on register; return 409 if taken
- Tests:
  - Unit/integration handler tests (if test harness present) OR include cURL commands with sample outputs in PR
- Docs: Update docs/security/guide.md to explicitly call out serverless endpoints (if currently generic)

Deliverables
- Updated serverless/src/handlers/auth.js
- Docs with endpoint contracts
- Evidence: cURL outputs for register/login/me

Success Criteria
- Vitest (if present) passes
- test-endpoints.sh shows /auth/login accessible (non-404) and sample login works with a seeded user
- Analyzer logs show token present in login response samples

Rollback
- Revert handler file

Time Budget: 45–60 min

---

## Phase 3 — Email Verification (Verify + Resend) on Serverless

Branch: automaton/phase-03-auth-verify

Goal
- Port email verification and resend endpoints to Serverless, matching the Express implementation semantics.

Agent Tasks
- Implement endpoints in Serverless:
  - POST /auth/verify-email { token }
  - POST /auth/resend-verification (auth required)
- Token:
  - Generate 32-byte token (hex), 24-hour expiry
  - Store token (plaintext or hashed—prefer hashed) in Prisma model (create model if missing)
- Email:
  - Use server/src/utils/email.js patterns to create serverless util OR reuse via shared package folder
  - Dev mode: log email content to console if EMAIL_ENABLED!=true
- Rate limiting (basic): place a TODO or light in-memory guard if infra not ready
- Docs: Update docs/runbooks/email-verification.md to include Serverless paths
- Test evidence: cURL verify/resend; console shows email payload in dev mode

Deliverables
- serverless/src/handlers/auth.js (verify/resend handlers) or serverless/src/handlers/authSecurity.js
- Possibly serverless/src/utils/email.js
- Prisma migration if adding emailVerificationToken table (commit migration files)

Success Criteria
- POST /auth/resend-verification returns success for an authenticated, unverified user
- POST /auth/verify-email with valid token marks emailVerified true
- Frontend can now wire VerifyEmail.jsx (Phase 4)

Rollback
- Revert handlers + migration

Time Budget: 60–90 min (includes migration)

---

## Phase 4 — Frontend Auth Integration (Staging/Prod)

Branch: automaton/phase-04-frontend-auth-integration

Goal
- Wire the frontend to real auth in non-dev. Keep dev-bypass for local.

Agent Tasks
- AuthContext.jsx:
  - Confirm when VITE_ENABLE_AUTH === 'true' it calls getCurrentUser() on mount
- authService.js:
  - Ensure POST /auth/login, /auth/register; GET /auth/me; POST /auth/logout (if implemented); store token in localStorage (temporary)
- VerifyEmail.jsx:
  - Replace simulation with POST /auth/verify-email; show success/failure states
  - Add “resend verification” CTA to POST /auth/resend-verification
- Login.jsx / Join.jsx:
  - Show specific error messages for 401/429/403 verify
- Protected routes already present; confirm they redirect unauthenticated when authEnabled
- Tests: update Vitest for AuthContext; include MSW mocks if present

Deliverables
- Updated src/services/authService.js, src/context/AuthContext.jsx, src/pages/VerifyEmail.jsx, Login/Join tweaks
- Docs: docs/frontend/api-integration-complete.md add verify/resend references

Success Criteria
- With VITE_ENABLE_AUTH=true, app initializes by calling /auth/me
- Successful register/login leads to dashboard/onboarding
- VerifyEmail flow works against serverless in dev-mode (emails logged) or staging (SMTP configured)

Rollback
- Revert changed files

Time Budget: 45–60 min

---

## Phase 5 — Media Upload Integration (Presign + Complete)

Branch: automaton/phase-05-media-integration

Goal
- Wire MediaUploader to Serverless presign/complete endpoints; ensure profile ownership checks.

Agent Tasks
- Use serverless endpoints:
  - POST /profiles/:id/media/upload-url (auth)
  - PUT file to returned S3 URL
  - POST /profiles/:id/media/complete with mediaId + metadata
- Frontend:
  - In ProfileEdit.jsx, replace TODO with real upload handler calling the API
  - Handle progress and error states (already simulated in component)
- Ensure MEDIA_BUCKET, CORS, content types are correct
- Docs: Add minimal usage example in docs/backend/profile-implementation.md and serverless/API_PROFILE_SETTINGS.md cross-link

Deliverables
- src/pages/ProfileEdit.jsx upload handlers
- Possibly a small src/services/mediaService.js

Success Criteria
- Upload flow completes; media record updated to processing/complete
- No CORS failures; correct content-type on PUT to S3
- Test evidence: cURL flow shows presign + complete; sample success responses

Rollback
- Revert UI handlers

Time Budget: 45–60 min

---

## Phase 6 — Profiles & Links (Batch Update + Validation)

Branch: automaton/phase-06-profiles-links

Goal
- Ensure ProfileEdit uses serverless profile endpoints; client-side link validation matches backend; batch link update works.

Agent Tasks
- Align frontend link editor output with backend validators:
  - Label (1–40), URL http/https, type in website|imdb|showreel|other, max 20 links
- Ensure ProfileEdit save action calls the appropriate serverless endpoint (PUT /profiles/id/{id} or PATCH route if provided)
- Verify vanity URL constraints and uniqueness error handling
- Tests: add unit tests for urlValidation.js; e2e happy path for adding/updating links

Deliverables
- Updated ProfileEdit save handlers, any service function adjustments
- Tests for urlValidation and UI link editor integration

Success Criteria
- Saving with invalid link shows client-side error and no request sent
- Saving valid links updates backend; GET shows ordered links
- Max links error surfaced gracefully

Rollback
- Revert UI changes

Time Budget: 45 min

---

## Phase 7 — Settings & Privacy (Export + Delete)

Branch: automaton/phase-07-settings-privacy

Goal
- Wire Settings page to serverless settings endpoints; implement account export and deletion flow.

Agent Tasks
- GET/PUT /api/settings
- POST /api/account/export (or GET /api/privacy/export if that’s the canonical; standardize to serverless endpoints already present)
- DELETE /api/account (immediate delete) OR POST /privacy/delete-account (Express legacy). Prefer Serverless:
  - serverless/src/handlers/settings.js::deleteAccount exists (takes confirmPassword)
- Update Settings.jsx buttons to call these endpoints, show spinners and toasts.
- Docs: Update docs/security/guide.md and serverless/API_PROFILE_SETTINGS.md with final chosen routes

Deliverables
- src/pages/Settings.jsx wiring for export + delete
- Optional: small services for settings/privacy

Success Criteria
- Export returns JSON package per docs
- Delete requires password confirmation; returns success and logs out
- Smoke: curl to export/delete endpoints succeed with token

Rollback
- Revert Settings changes

Time Budget: 45–60 min

---

## Phase 8 — Search, Reels, Reel Requests Polishing

Branch: automaton/phase-08-search-reels

Goal
- Verify frontend services use serverless search/reels endpoints; expose reel-request flows.

Agent Tasks
- search.js (serverless) already implemented; ensure frontend search page uses it
- reels.js and reelRequests.js (serverless):
  - Ensure getReels and toggle actions call serverless endpoints
  - Optionally add UI for requesting access to on-request media
- Tests: e2e “navigate reels, like/unlike” (Playwright or Vitest+MSW)

Deliverables
- src/services/reelsService.js alignment if needed
- Optional small UI addition for “Request access”

Success Criteria
- Reels feed loads from serverless in staging
- Like/bookmark reflect server state when auth enabled
- Reel-request endpoints reachable; happy-path succeeds

Rollback
- Revert service/UI changes

Time Budget: 45 min

---

## Phase 9 — Cleanup, Docs, and CI/Analyzer Pass

Branch: automaton/phase-09-cleanup-docs

Goal
- Remove ambiguity, unify docs, ensure analyzer and smoke tests pass, and leave breadcrumbs for future work.

Agent Tasks
- Update:
  - docs/deployment/serverless-guide.md with final auth endpoints
  - docs/security/implementation.md and guide.md for serverless specifics
  - docs/backend/profile-implementation.md cross-check endpoints and curl examples
- Ensure scripts/analyze-orchestration-run.mjs recognizes auth success from logs
- Confirm scripts/deployment/smoke-test-staging.sh passes on staging
- Add a deprecation note in server/src/ routes READMEs pointing to Serverless
- Optional: open issues for future phase (OAuth, 2FA UI, distributed rate limiting)

Deliverables
- Doc updates, analyzer tweaks if needed

Success Criteria
- Analyzer reports success
- Smoke tests green
- CI all green

Rollback
- Docs only; minimal risk.

Time Budget: 30–45 min

---

## Definition of Done (Project)

All of the following must be true:
- Serverless backend is the canonical staging/prod API; Express marked legacy/dev only.
- Auth: register/login/me/verify/resend wired; bcrypt+JWT live; frontend uses them when VITE_ENABLE_AUTH=true.
- Profiles/media/settings/search/reels/reel-requests: frontend calls serverless endpoints; flows tested.
- Media uploads working via S3 presign+complete; no CORS issues.
- Settings export/delete wired; flows confirmed via curl.
- CI, smoke tests, analyzer all green.
- Docs updated, env checklist present.

---

## Minimal Owner Actions

You only need to:
1) Ensure environment variables are set in staging/prod:
   - JWT_SECRET, DATABASE_URL, AWS_REGION, MEDIA_BUCKET
   - EMAIL_ENABLED/SMTP_* if you want real emails in staging
   - VITE_API_BASE (frontend), VITE_ENABLE_AUTH=true for staging/prod
2) Merge PRs as they pass the checklists (or enable auto-merge if allowed).
3) Run smoke script once post-deploy: ./scripts/deployment/test-endpoints.sh

Agents handle the rest.

---

## Quick Validation Commands (for PR evidence)

- Login (expect 401 for invalid creds, not 404):
  curl -s -o /dev/null -w "%{http_code}\n" -X POST "$API_BASE/auth/login" -H "Content-Type: application/json" -d '{"email": "x@x.com", "password": "x"}'

- Register:
  curl -s "$API_BASE/auth/register" -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"test123","username":"testuser","displayName":"Test User"}' | jq

- Me:
  curl -s "$API_BASE/auth/me" -H "Authorization: Bearer $TOKEN" | jq

- Verify Email:
  curl -s "$API_BASE/auth/verify-email" -H "Content-Type: application/json" -d '{"token":"<token-from-email-or-log>"}' | jq

- Presign upload:
  curl -s -X POST "$API_BASE/profiles/$PROFILE_ID/media/upload-url" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"type":"video","title":"Demo Reel"}' | jq

- Complete upload:
  curl -s -X POST "$API_BASE/profiles/$PROFILE_ID/media/complete" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"mediaId\":\"$MEDIA_ID\"}" | jq

- Export data:
  curl -s "$API_BASE/account/export" -H "Authorization: Bearer $TOKEN" | jq

---

## Notes on Security and Future Work

- Token storage: Frontend currently uses localStorage as interim. Prefer HttpOnly cookies in a future phase (backend support + CSRF).
- Rate limiting: Add distributed RL (Redis) in follow-up epic if needed.
- 2FA UI: Server-side primitives exist; add frontend UI in a separate phase.

---

End of Playbook.