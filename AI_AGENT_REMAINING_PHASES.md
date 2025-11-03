# Project Valine — Remaining Phases for Autonomous Agent
**Generated:** 2025-11-03 16:49:45 UTC  
**For:** Frontend Development Agent / Full-stack Agent  
**Author:** gcolon75 (instructions for the agent)

This file contains the remaining phase-by-phase work the agent should run autonomously. The agent should create branches and PRs for each phase, run builds and tests, fix what it can, and open issues when blocked. Follow the conventions and failure-handling rules listed below.

---

## Current status (context)
- Marketing pages: Home, About, Features, Join, Login — redesigned, branded (Outer Space Grey + Emerald), glassmorphism headers and footer. Routes present.
- AppLayout/header: glassmorphism app header with Reels nav and app-specific nav.
- Reels feed: vertical video feed implemented with keyboard and touch swipe, like/bookmark/share UI, mute toggle, progress indicators, basic playback with `<video>`.
- Dashboard: brand colors applied, Reels CTA added, PostComposer quick actions and stats widget (mock data).
- Profile: gradient cover, gradient avatar border, tabs (Posts / Reels / Scripts / About).
- Requests / Discover / Settings / Messages / Notifications: modernized UIs created and wired to mocks.
- Dev-bypass login and dev sign-up present (gated to dev env).
- 404: custom marketing-style 404 page implemented.
- PRs up to Phase 140 merged; initial automation and build plan file created.

Net: UI/UX polished across marketing + app pages; Reels functional with mocked data. Remaining work focuses on backend wiring, persistence, auth, tests, CI/CD, hardening, and production readiness.

---

## Conventions (mandatory)
- Branch naming: `automaton/phase-<NN>-<short-slug>`
- PR title: `Phase <NN>: <short description>`
- Commit message: `feat(ui): <short description> (phase <NN>) — automated by agent`
- Checkpoint commit before each phase: `chore: checkpoint before phase <NN> — automated agent checkpoint`
- Tests: Jest + React Testing Library for unit tests; Playwright for E2E.
- Diagnostics/logs: `logs/agent/phase-<NN>-report.json`
- Never push directly to `main`. Always open PRs for review & merge.

If the agent is blocked (missing API endpoints, credentials), it must:
- Create a detailed GitHub issue with diagnostics and expected API shape
- Save diagnostics to `logs/agent/<phase>-report.json`
- Stop that phase and notify maintainers

---

# Remaining Phases (detailed)

## Phase 00 — Preflight & repo snapshot (10–30m)
Branch: `automaton/phase-00-preflight`

Actions:
- Run `npm ci`, `npm run build`, `npm run lint`, `npm run test`
- Programmatic smoke-run (headless) on key routes: `/`, `/about`, `/features`, `/login`, `/join`, `/dashboard`, `/reels`, `/profile/developer`, `/404`
- Capture console errors, failed imports, broken assets
- Commit checkpoint and open PR: "Phase 00: preflight snapshot — automated by agent" with logs attached

Deliverable:
- PR with logs and checklist; trivial fixes allowed in this phase

---

## Phase 01 — Automated manual-verification & quick fixes (1–2 hours)
Branch: `automaton/phase-01-smoke-fixes`

Actions:
- Run a Playwright smoke script verifying:
  - correct header on public vs app pages
  - link navigation (About/Features/Login/Join)
  - Reels keyboard (↑/↓), swipe, mute, like, comment modal open
- Collect console logs and deterministic failures
- Fix deterministic issues (imports, assets, small layout regressions)
- Add unit tests for any fixed components (Header, NotFound, NavItem)

Deliverable:
- PR with fixes and smoke test report

---

## Phase 02 — API integration (dev environment) (2–4 hours)
Branch: `automaton/phase-02-api-integration`

Precondition:
- Dev API_BASE must be available. If missing, create issue asking for API URL/credentials with diagnostics and expected endpoints.

Actions:
- Create `src/api/client.js` (axios/fetch wrapper) with centralized error handling, timeouts, and retry/backoff
- Replace mocked data sources (Reels, Posts, Profiles, Messages, Notifications) with real API calls to API_BASE
- Implement `useApiFallback` hook: on network errors use seeded mock data and write diagnostics to `logs/agent-diagnostics.json`
- Add msw integration stubs for CI to run deterministic tests
- Add `env.local.example` or update README with how to set `VITE_API_BASE` / `.env.local`

Deliverable:
- PR that wires frontend to API with graceful fallback and integration tests using msw

---

## Phase 03 — Authentication & protect app routes (4–8 hours)
Branch: `automaton/phase-03-auth`

Actions:
- Inspect backend for auth endpoints; if missing, open issue with expected contracts (`POST /auth/login`, `POST /auth/register`, `GET /auth/me`)
- Implement `AuthProvider`:
  - `login(email,password) → POST /auth/login` (persist token)
  - `register(...) → POST /auth/register`
  - `me() → GET /auth/me`
  - `logout()` clears token and redirects to `/login`
- Prefer an HttpOnly cookie flow (coordinate with backend); if unavailable, use localStorage with code comments and TODO for secure replacement
- Protect app routes (Dashboard, Reels, Messages, Settings, Profile edit) — redirect to `/login` when unauthenticated
- Replace dev-bypass: keep a development-only helper gated by `import.meta.env.DEV` and document removal steps
- Add unit tests for `AuthProvider` (mock axios)

Deliverable:
- PR with authentication wiring, protected routes, migration notes

---

## Phase 04 — Persist engagement (likes/bookmarks/comments) (3–6 hours)
Branch: `automaton/phase-04-engagement`

Actions:
- Integrate persistent endpoints:
  - POST `/reels/:id/like` (toggle)
  - POST `/reels/:id/bookmark`
  - POST `/reels/:id/comments`
  - GET `/reels/:id/comments`
- Implement optimistic UI updates with rollback on error and toast feedback
- Ensure counts sync with server response on confirmation
- Add unit tests verifying optimistic update and rollback

Deliverable:
- PR persisting engagement actions

---

## Phase 05 — Messaging & notifications integration (4–8 hours)
Branch: `automaton/phase-05-messaging`

Actions:
- Wire Messages UI to:
  - GET `/conversations`
  - GET `/conversations/:id/messages`
  - POST `/conversations/:id/messages`
- Wire Notifications to:
  - GET `/notifications`
  - PATCH `/notifications/:id/read` or bulk `PATCH /notifications/mark-all`
- Implement polling fallback (exponential backoff); wire WebSocket/SSE if backend supports it
- Update app header/unread badges in real-time (poll or socket)
- Add tests (mocked API) for messaging flows

Deliverable:
- PR connecting messaging & notifications

---

## Phase 06 — Reels hardening, analytics & accessibility (2–4 hours)
Branch: `automaton/phase-06-reels-hardening`

Actions:
- Ensure `<video>` uses `muted`, `playsInline`, `preload="metadata"`, `autoPlay` with robust play/pause on active change
- Add `videoRef` and `useEffect` to pause when not active, handle play() promise rejections
- Add analytics events: `reel_view`, `reel_play`, `reel_mute`, `reel_like`, `reel_share` (send to analytics API or a mock endpoint)
- Add ARIA attributes, keyboard focus handlers, and captions/subtitles support (if available)
- Add Playwright E2E tests for autoplay/mute, navigation, like/bookmark

Deliverable:
- PR with playback hardening, instrumentation, and accessibility improvements

---

## Phase 07 — Tests (unit + E2E suite) (4–8 hours)
Branch: `automaton/phase-07-tests`

Actions:
- Add Jest unit tests for:
  - Header / NavItem
  - Reels controls (like/bookmark toggle logic)
  - PostComposer quick actions
  - AuthProvider (login/logout flows)
  - StatCard component
- Add Playwright E2E tests for:
  - Register/login → profile setup → create post
  - Login → watch Reels → like/comment
  - Navigation & header correctness
- Add GH Actions workflow step to run tests in PRs

Deliverable:
- PR adding tests and CI workflow updates

---

## Phase 08 — CI/CD & staging deploy + smoke tests (2–4 hours)
Branch: `automaton/phase-08-ci`

Actions:
- Ensure GH Actions build and test steps exist; add staging deploy job:
  - Build frontend
  - Deploy to S3 + CloudFront OR Vercel (repo’s existing method)
  - Deploy backend (serverless) to dev/staging stage
- After deploy, run automated smoke tests against staging (health, sample endpoints, Reels navigation)
- Add environment variable documentation and instructions for secret storage (SSM, GitHub Secrets)

Deliverable:
- PR with CI/CD pipeline, staging deploy, and smoke tests

---

## Phase 09 — Performance & accessibility sweep (4–6 hours)
Branch: `automaton/phase-09-optimize`

Actions:
- Run Lighthouse programmatically against staging and collect report
- Optimize images (WebP placeholders), lazy-load below-the-fold content (skeletons remain)
- Code-split heavy routes (Reels) and lazy-load them
- Fix major accessibility issues flagged by axe (contrast, labels, tab order)
- Optionally add lightweight perf budgets to CI

Deliverable:
- PR with optimizations and Lighthouse/axe reports in `logs/agent/`

---

## Phase 10 — Remove dev-bypass, cleanup & production readiness (1–2 hours)
Branch: `automaton/phase-10-cleanup`

Actions:
- Remove dev-bypass code (or fully gate and add a removal checklist)
- Remove debug-only logs and console statements
- Update README: how to set `VITE_API_BASE`, local dev instructions, feature-flag notes
- Draft `RELEASE_NOTES.md` for production rollout

Deliverable:
- PR performing cleanup and release notes

---

## Phase 11 — Observability, analytics & runbook (2–4 hours)
Branch: `automaton/phase-11-monitoring`

Actions:
- Integrate Sentry (frontend) and add docs for DSN configuration
- Configure backend CloudWatch alarms/dashboards for error rate & latency
- Add an ops runbook `ops/RUNBOOK.md` covering rollback commands, `serverless remove`, and contact points
- Ensure PII is scrubbed in logs

Deliverable:
- PR adding monitoring and runbook

---

## Phase 12 — Backlog, issues & roadmap (ongoing)
Branch: `automaton/phase-12-backlog`

Actions:
- Create GitHub issues for remaining features (uploads, search, follow system, moderation)
- Prioritize and label issues (priority/area/estimate)
- Create milestone for next sprint and link issues

Deliverable:
- PR adding backlog.md or issues created via automation

---

# Failures & rollback
- If CI fails: agent attempts quick autofixes (linter autofix, missing imports). If unresolved after two attempts, attach diagnostics and create an issue titled `blocked: CI failure in phase-<NN>` with logs.
- If blocked by missing backend endpoints or secrets: create issue `blocked: missing endpoint <name> or secret <NAME>` with example request/response and diagnostics; stop the phase.
- All diagnostics saved to `logs/agent/phase-<NN>-report.json` and attached to PR.

---

# Start instructions (for the agent)
1. Create branch `automaton/phase-00-preflight`.
2. Run preflight steps and open PR: "Phase 00: preflight snapshot — automated by agent".
3. Continue sequentially through phases; open one PR per phase.
4. If blocked, create a detailed GitHub issue and stop that phase.

---

# Reporting & artifacts
- Diagnostic logs: `logs/agent/phase-<NN>-report.json`
- PR description must include:
  - Summary of changes
  - Test results (unit + e2e)
  - Manual verification checklist
  - Rollback steps
- Append release notes entry to `RELEASE_NOTES.md` for each merged phase

---

End of file — agent should proceed autonomously, following this plan, producing one PR per phase, and creating issues when blocked.