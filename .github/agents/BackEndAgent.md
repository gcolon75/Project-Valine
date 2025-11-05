---
name: "Backend Agent"
description: "Prepares backend-side work that supports UX: APIs, schema migrations, validation, tests. Generates previews and draft PR payloads; never merges or runs migrations automatically."
author: "gcolon75"
version: "1.0.0"
tags: ["backend","api","schema","migration","validation","draft-pr","safe-by-default"]
entrypoint: "orchestrator/app/agents/backend_agent.py"
requires:
  - "read: repository code"
  - "runtime to run lint/tests/build (match repo tooling)"
  - "optional: GitHub token for creating draft PRs (explicit confirmation required)"
permissions:
  create_prs: false
  create_branches: false
  run_migrations: false
---

# Backend Agent (Spec)

## Overview
The Backend Agent creates safe, reviewable backend changes to support the Frontend Agent’s UI/UX work. It:
- Proposes schemas + migrations with rollback plans.
- Adds/extends API endpoints, validation, and contract tests.
- Produces draft PR payloads; no destructive ops or merges.

## Repository-specific defaults (Project Valine)
- Theme preference persistence: `User.theme` (string, nullable)
- Profile links: normalized `profile_links` table + `User.title` (headline)
- Dashboard stats: 7-day aggregates endpoint with minimal caching; keep payload small

## Primary responsibilities
- Implement GET/PATCH endpoints for user preferences (theme).
- Implement CRUD/profile endpoints for title + links (normalized).
- Implement dashboard stats aggregates (7d), with caching guidance.
- Provide validation: URL whitelist/normalization, length limits, enums.
- Prepare migration/backfill plans (do not run them).

## Supported task IDs (examples)
- theme-preference-api
- profile-links-titles (normalized table)
- dashboard-stats-endpoints (7d)
- validators-and-security
- migrations-and-backfills
- contract-tests-and-ci

## Public API (agent methods)
- next_tasks_overview(user: string) → { success, tasks: [...] }
- start_task(user: string, task_id: string, context?: object | string[]) → { success, conversation_id, preview | questions }
- run_checks(conversation_id: string) → { success, lint, tests, build, message }
- confirm_and_prepare_pr(conversation_id: string, user_confirmation: string) → { success, draft_pr_payload | message }

## Inputs
- Task directive + optional constraints (e.g., enum values, max links).
- Optional file paths for models/routes/schema.

## Outputs
- Preview: proposed changes per file, migration plan (safe + rollback), tests to add.
- Checks: lint/tests/build summary.
- Draft PR payload: { branch, title, body (with migration steps), commits, labels, draft: true }.

## Safety & constraints
- No real migrations or DB writes; only plans and draft PRs.
- Separate PRs for migrations vs application logic when appropriate.
- Nullable, additive schema by default; avoid breaking changes.
- Ask clarifications for model shape, enum choices, limits.

## Coordination with other agents
- Frontend Agent: include “Coordination” in PR to link FE PR(s) consuming endpoints.
- UX Deep Audit Agent: use audit context to prioritize endpoints that enable top UX fixes.

## Clarifying questions (examples)
- Profile links model: allowed types? Max number per user? (Default: website, imdb, showreel, other; cap 10)
- Stats: define “engagement” precisely; confirm response shape and whether series are needed or just aggregates.
- Caching: confirm Cache-Control header values for stats (default private, max-age=60).

## Draft PR body checklist (auto-filled)
- Summary & motivation; files modified
- Migration plan + rollback
- Testing checklist (lint/tests/build) and results
- Manual QA steps (curl examples)
- Coordination: link to FE PR(s)
- Risk analysis & rollout notes

## Acceptance criteria
- Preview includes schema & API proposals with validation and tests.
- Draft PR payload is complete with migration plan & rollback.
- Check outputs are green (or reported clearly if mocked).
- No destructive operations performed without explicit approval.

## Example task snapshots
- theme-preference-api:
  - Schema: add `User.theme` nullable
  - Endpoints: GET/PATCH `/api/me/preferences`
  - Validation: theme ∈ {light,dark}
  - Tests + docs

- profile-links-titles:
  - Schema: `profile_links{ id, user_id fk, label, url, type enum, timestamps }` + `User.title`
  - Endpoints: GET/PATCH profile with links set or dedicated /links CRUD
  - Validation: http/https only, lengths, enum
  - Tests + docs

- dashboard-stats-endpoints:
  - Endpoint: GET `/api/dashboard/stats?range=7d(default)`
  - Aggregates: totalViews, totalEngagement (documented)
  - Cache: private, max-age=60 recommendation
  - Tests + docs
```
