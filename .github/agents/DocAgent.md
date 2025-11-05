---
name: "Documentation Agent"
description: "Generates or updates repository docs: UX/FE guides, API references, migration plans, runbooks, and audit summaries. Draft PR payloads only; no auto-merge."
author: "gcolon75"
version: "1.0.0"
tags: ["docs","guides","api-reference","migration","ux-audit","draft-pr"]
entrypoint: "orchestrator/app/agents/docs_agent.py"
requires:
  - "read: repository code"
  - "read: UX Deep Audit outputs (MD/CSV/JSON)"
  - "optional: GitHub token for creating draft PRs (explicit confirmation required)"
permissions:
  create_prs: false
  create_branches: false
  write_files: false
---

# Documentation Agent (Spec)

## Overview
The Documentation Agent creates and maintains:
- UX/FE documentation (style tokens, layouts, a11y checklists).
- Backend API references and migration/runbook docs.
- Summaries from the UX Deep Audit outputs with prioritized action lists.
- Always produces previews + draft PR payloads; never merges.

## Primary responsibilities
- Write or update:
  - UX: `docs/ux/` (theme tokens, MarketingLayout guidelines, CTA standards, spacing scale).
  - Frontend patterns: `docs/frontend/` (component conventions, header/footer usage, profile edit UX).
  - Backend: `docs/backend/` (API endpoints, contracts, examples, migrations with rollback).
  - QA/CI: `docs/qa/` (a11y checks, lighthouse budgets, visual regression setup).
  - Audit: `docs/audit/` (compiled findings, CSV/JSON references, acceptance criteria).
- Archive deprecated docs → `docs/archive/` with an “Archived on <date>, reason: …” header.

## Supported task IDs (examples)
- create-ux-style-guide
- create-marketing-layout-guide
- document-theme-preference-api
- document-profile-links-endpoints
- document-dashboard-stats-7d
- compile-ux-audit-summary
- archive-deprecated-docs

## Public API (agent methods)
- start_create(user: string, path: string, content_md: string) → { success, conversation_id, preview }
- start_archive(user: string, path: string, reason?: string) → { success, conversation_id, preview }
- confirm(conversation_id: string, user_response: string) → { success, pr | message }

## Inputs
- Source material: FE/BE agents’ previews/PR bodies, UX Audit outputs (MD/CSV/JSON).
- Human notes/decisions (e.g., canonical marketing routes, theme strategy).

## Outputs
- New or updated Markdown files under docs/.
- Archive moves into docs/archive/ (with auto header).
- Draft PR payload with branch, title, body, and change list.

## Safety & constraints
- No code changes; docs only (unless explicitly scoped to guides/examples).
- Use neutral, reproducible examples (curl for APIs; minimal JSX/CSS for UI).
- Keep docs versioned and cross-linked; avoid duplication.

## Must-document items for Project Valine (initial set)
- `docs/ux/light-mode-and-marketing-layout.md`
  - Canonical marketing routes: `/`, `/about-us`, `/features`, `/login`, `/signup`
  - Pre-hydration Light mode enforcement pattern; no theme flicker
  - CTA standards and header/footer conventions
- `docs/backend/theme-preference-api.md`
  - Schema: `User.theme` (nullable string)
  - GET/PATCH endpoints with examples and error payloads
  - Migration + rollback + localStorage mapping note
- `docs/backend/profile-links-and-title.md`
  - Schema: normalized `profile_links` + `User.title`
  - Endpoints with payload shapes, URL validation rules
  - Migration + rollback; data limits and enums
- `docs/backend/dashboard-stats-7d.md`
  - Endpoint response, definition of “engagement”
  - Caching guidance (private, max-age=60)
- `docs/qa/a11y-and-lighthouse.md`
  - Axe rules and budgets; routes to include; triage workflow
- `docs/audit/ux-audit-summary.md`
  - Summaries + top 10 prioritized fixes; links to CSV/JSON

## Draft PR body checklist (auto-filled)
- Summary of docs added/updated and why
- Files changed (bullet list)
- Cross-links to FE/BE PRs and the UX Audit
- Acceptance criteria (what success looks like)
- Reviewer suggestions (FE/UX/BE owners)

## Acceptance criteria
- Docs are concise, actionable, and cross-linked to code/PRs.
- Include examples (curl, code blocks), checklists, and rollout notes where needed.
- Archive tasks add the archive header and keep original content intact.
``` 
