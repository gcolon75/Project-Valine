# Project Valine — Automation Playbook (Fast-Track Consolidation)
Updated: 2025-11-10 21:11:18 UTC

Purpose
- Provide agents a self-running, phase-by-phase plan to consolidate backends, wire auth, and complete profile/media/settings/search flows with minimal human intervention.
- Target: hours, not days. Emphasize small PRs, strict checklists, and automated validations.

Outcomes
- One canonical backend (Serverless) for production/staging.
- Real authentication flows end-to-end (register, login, me, verify email, resend).
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
- CI must pass: typecheck, lint, unit, integration (vitest), build, e2e (if applicable).
- Smoke test must pass: ./scripts/deployment/test-endpoints.sh
- Analyzer checks: scripts/analyze-orchestration-run.mjs must report auth success if applicable.
- Do not modify unrelated code. Keep atomic commits.

Prerequisites (Owner once; agents read-only)
- Secrets and envs are already configured:
  - JWT_SECRET: set
  - DATABASE_URL: set (postgresql://USER:PASSWORD@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/DB)
  - AWS_REGION: us-west-2
  - S3_BUCKET: set (the repo code now falls back from MEDIA_BUCKET to S3_BUCKET)
  - VITE_API_BASE: set for staging/prod
  - VITE_ENABLE_AUTH: should be set to true in staging/prod (owner action if not already)
- Prisma generation path is canonical: api/prisma/schema.prisma
- Serverless is the deployed API; Express remains dev-only or archived.

Recently Completed (Merged PRs)
- PR #205 — Docs: Account Creation MVP (Initial Signup Endpoint): https://github.com/gcolon75/Project-Valine/pull/205
- PR #204 — Add signup and login form skeleton with client-side validation: https://github.com/gcolon75/Project-Valine/pull/204
- PR #203 — Account Creation MVP: Secure signup/login/verify with E2E tests and analyzer integration: https://github.com/gcolon75/Project-Valine/pull/203

Delta Summary (what’s done vs. remaining)
- Done:
  - Backend: /auth/register, /auth/login, /auth/verify-email implemented and tested (PR #203).
  - Frontend: Signup/Login forms with validation present (PR #204).
  - Docs: Initial account creation docs (PR #205).
  - S3 bucket variable mapping: code now falls back to S3_BUCKET if MEDIA_BUCKET missing.
  - Repo secrets updated and available.
- Remaining/Verify:
  - Confirm /auth/me returns expected user shape for AuthContext (quick validation).
  - Confirm /auth/resend-verification (if not present) — small lightweight addition or validate existing.
  - Flip VITE_ENABLE_AUTH=true on staging/prod (if not already).
  - Continue with media/profile/settings/search integration and cleanup phases (agents will handle).

How agents run this playbook
- Execute phases in order (skip those marked Completed).
- Open a PR per phase.
- Use the Success Criteria for merge decision.
- If a phase introduces new environment variables, document in PR and add to docs/deployment.

Time Target
- Total agent runtime (excluding review): ~3–5 hours.

---

## Phase 0 — Repository Prep and Flags

Branch: automaton/phase-00-repo-prep

Goal
- Ensure environment flags and configs are consistent so subsequent phases can run unattended.

Agent Tasks
- Verify .env.local.example includes:
  - VITE_ENABLE_AUTH=false (dev default)
  - VITE_API_BASE=<placeholder>
- Add docs/agents/ENV_CHECKLIST.md listing API/Frontend envs (JWT_SECRET, DATABASE_URL, AWS_REGION, S3_BUCKET, VITE_*).
- Ensure scripts/deployment/test-endpoints.sh references /auth/login and treats 400/401 as “endpoint accessible” (not 404).
- Add README note clarifying:
  - Serverless is canonical backend for staging/prod.
  - Express routes are dev stubs only (legacy).

Deliverables
- docs/agents/ENV_CHECKLIST.md
- README additions (Deployment/Backends note)
- Passing CI

Success Criteria
- Lint/tests/build pass
- ENV checklist present and accurate

Rollback
- Docs-only, no runtime risk

Time Budget: 20–30 min

---

## Phase 1 — Canonicalize Backend (Serverless) and Deprecate Express

Branch: automaton/phase-01-canonicalize-backend

Goal
- Make Serverless the single production API. Mark Express routes as legacy/dev-only to avoid drift.

Agent Tasks
- Add banner to server/ (or docs) indicating: “Legacy dev server; do not deploy to staging/prod.”
- Ensure docs/deployment and docs/security point to Serverless as authoritative.
- Confirm serverless/serverless.yml exposes:
  - /auth/register, /auth/login, /auth/me, /auth/verify-email, /auth/resend-verification (if present)
  - Profiles, media, settings, search, reels, reel-requests
- Create docs/backend/canonical-backend.md summarizing the decision.

Deliverables
- docs/backend/canonical-backend.md
- Docs updates

Success Criteria
- Smoke test reaches Serverless /auth/login (400/401 acceptable for bad creds)
- Analyzer sees no missing auth endpoints

Rollback
- Docs-only or minimal YAML changes

Time Budget: 30–45 min

---

## Phase 2 — Serverless Auth Parity (Validation) — COMPLETED (PR #203)

Branch: automaton/phase-02-auth-parity-validation

Status: Completed by PR #203. This phase is now a validation/fix-up pass.

Goal
- Validate /auth/register, /auth/login, /auth/me, /auth/verify-email in Serverless; apply tiny fixes if gaps remain.

Agent Tasks
- Quick validations:
  - verify bcrypt hashing/comparison
  - verify JWT is signed with JWT_SECRET
  - confirm GET /auth/me returns the expected user shape
  - ensure error codes: 401 for invalid creds, 409 for conflicts, 403 for gated unverified
- If tiny fixes needed, open a small PR.

Deliverables
- Short validation PR only if necessary
- cURL evidence outputs in PR

Success Criteria
- cURL for register/login/me/verify return expected payloads and codes
- Analyzer detects token in login responses or success indicators

Time Budget: 20–30 min (only if fixes needed)

---

## Phase 3 — Email Verification: Resend Support — COMPLETED / VERIFY (PR #203)

Branch: automaton/phase-03-auth-resend

Status: PR #203 included email verification and analyzer integration. If resend endpoint is absent, implement a lightweight POST /auth/resend-verification now.

Goal
- Ensure POST /auth/resend-verification exists and is documented.

Agent Tasks
- Validate existence of POST /auth/resend-verification (auth required; unverified only).
- If missing, implement small handler that logs email in dev and uses SMTP when EMAIL_ENABLED=true.
- Update docs/runbooks/email-verification.md to reference serverless endpoints.

Deliverables
- Small handler PR (if needed)
- Docs update
- cURL/console evidence

Success Criteria
- Resend returns success; unverified user receives a new token (logged in dev)
- VerifyEmail flow works end-to-end

Time Budget: 20–30 min (if not already done)

---

## Phase 4 — Frontend Auth Integration (Post-Merge Wire-Up)

Branch: automaton/phase-04-frontend-auth-wireup

Status: Signup/login UI and docs present (PR #204 and #205); this phase is focused on wiring VerifyEmail and ensuring staging uses real auth.

Goal
- Ensure the app uses real auth in staging/prod; VerifyEmail page calls backend; dev-bypass remains local only.

Agent Tasks
- AuthContext.jsx: confirm when VITE_ENABLE_AUTH === 'true' it calls getCurrentUser() on mount.
- authService.js: verify POST /auth/login, /auth/register; GET /auth/me; POST /auth/verify-email; POST /auth/resend-verification wired.
- VerifyEmail.jsx: remove simulation; call real endpoints; handle success/expired/invalid/already_verified states; include “Resend” CTA.
- Login.jsx/Join.jsx: keep detailed error messages for 401/429/403 verify.
- Tests: confirm vitest/MSW or e2e coverage for these flows.

Deliverables
- Updated src/services/authService.js, src/pages/VerifyEmail.jsx, small tweaks in AuthContext.jsx and Login/Join as needed
- Docs refresh in docs/frontend/api-integration-complete.md

Success Criteria
- With VITE_ENABLE_AUTH=true (staging), app initializes with /auth/me and routes correctly
- Successful register/login -> dashboard/onboarding
- VerifyEmail end-to-end works

Rollback
- Revert frontend diffs

Time Budget: 30–45 min

---

## Phase 5 — Media Upload Integration (Presign + Complete)

Branch: automaton/phase-05-media-integration

Goal
- Wire MediaUploader to Serverless presign/complete endpoints; ensure profile ownership checks and S3 CORS are correct.

Agent Tasks
- Use endpoints:
  - POST /profiles/:id/media/upload-url (auth)
  - PUT file to signed S3 URL
  - POST /profiles/:id/media/complete { mediaId, metadata }
- Frontend:
  - In ProfileEdit.jsx, replace the TODO with a real upload handler.
- Note: Backend now falls back from MEDIA_BUCKET → S3_BUCKET, so ensure S3_BUCKET is set in envs.

Deliverables
- src/pages/ProfileEdit.jsx handlers
- Optional: src/services/mediaService.js

Success Criteria
- Upload completes; media record updated to processing/complete
- No CORS failures; correct Content-Type on S3 PUT
- Evidence: cURL presign+complete flow + UI demo

Rollback
- Revert UI/service changes

Time Budget: 45–60 min

---

## Phase 6 — Profiles & Links (Batch Update + Validation)

Branch: automaton/phase-06-profiles-links

Goal
- Ensure ProfileEdit uses serverless profile endpoints; client-side link validation matches backend; batch link update works.

Agent Tasks
- Align client link editor with backend validators:
  - Label (1–40), URL http/https, type ∈ {website, imdb, showreel, other}, max 20 links
- Ensure ProfileEdit save calls the appropriate serverless endpoint (PUT /profiles/:id or PATCH).
- Verify vanity URL constraints and uniqueness error handling.
- Tests: unit tests for urlValidation.js; e2e happy path for links add/update/delete.

Deliverables
- ProfileEdit save wiring + any service function adjustments
- Tests for urlValidation and links editor

Success Criteria
- Invalid link blocked client-side; no request sent
- Valid save updates backend; GET shows ordered links
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
- Account export:
  - Serverless route: /api/account/export (present); wire a “Download Data” action
- Account deletion:
  - Prefer Serverless route: DELETE /api/account (require confirmPassword) — align with serverless handler
- Frontend Settings.jsx: wire buttons; add spinners and toasts

Deliverables
- src/pages/Settings.jsx wiring for export + delete
- Optional services for settings/privacy

Success Criteria
- Export returns JSON package per docs; user can download
- Deletion flow requires password; returns success; user is logged out
- cURL for export/delete succeed with token

Rollback
- Revert Settings code

Time Budget: 45–60 min

---

## Phase 8 — Search, Reels, Reel Requests Polishing

Branch: automaton/phase-08-search-reels

Goal
- Ensure frontend services use serverless search/reels endpoints; expose reel-request flows where applicable.

Agent Tasks
- Search services call serverless GET /search and /search/users
- Reels services call serverless endpoints; like/bookmark state matches server response when auth is on
- Optional: UI to POST /reels/:id/request for on-request media; list/approve/deny flows if in scope

Deliverables
- src/services/reelsService.js alignment (if needed)
- Optional: UI for requesting access

Success Criteria
- Reels feed loads from serverless in staging
- Like/bookmark reflect server state with auth enabled
- Reel-request endpoints reachable; happy-path works

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
  - docs/security/guide.md and docs/security/implementation.md with serverless specifics
  - docs/backend/profile-implementation.md curl examples verified
- Ensure scripts/analyze-orchestration-run.mjs recognizes auth success from logs
- Confirm ./scripts/deployment/test-endpoints.sh passes on staging
- Add deprecation note in server/src/* READMEs pointing to Serverless
- Open issues for future epics (OAuth, 2FA UI, distributed rate limiting)

Deliverables
- Doc updates; analyzer tweaks (only if necessary)

Success Criteria
- Analyzer reports success
- Smoke tests green
- CI all green

Rollback
- Docs only; minimal risk

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

## Minimal Owner Actions (Now)

You have already provided the secrets and set the S3_BUCKET. Only these are required now:
1) Confirm VITE_ENABLE_AUTH=true for staging/prod (flip this in your envs if not already set).
2) Merge and/or approve agent PRs as they pass CI (or enable auto-merge for the agent).
3) (Optional) Ensure SMTP/EMAIL secrets are present if you want real emails in staging.

That’s it — the agent can run the playbook now.

---

## Quick Validation Commands (for PR evidence)

- Login (expect 401 for invalid creds, not 404):
  curl -s -o /dev/null -w "%{http_code}\n" -X POST "$API_BASE/auth/login" -H "Content-Type: application/json" -d '{"email": "x@x.com", "password": "x"}'

- Register:
  curl -s "$API_BASE/auth/register" -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"test123","username":"testuser","displayName":"Test User"}' | jq

- Me:
  curl -s "$API_BASE/auth/me" -H "Authorization: Bearer $TOKEN" | jq

- Verify Email:
  curl -s "$API_BASE/auth/verify-email" -H "Content-Type: application/json" -d '{"token":"<token>"}' | jq

- Resend Verification:
  curl -s "$API_BASE/auth/resend-verification" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}' | jq

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