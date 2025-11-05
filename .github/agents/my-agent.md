---
name: "Backend Agent"
description: "Server-side agent to prepare backend changes that support frontend/UX work: API endpoints, schema migrations, validation, contract tests, backfills, and draft PR payloads. Safe-by-default: produces previews and draft PR payloads only; requires human confirmation to create branches/PRs or run migrations."
author: "gcolon75"
version: "0.1"
tags: ["backend","api","migration","UX-support","draft-pr"]
entrypoint: "orchestrator/app/agents/backend_agent.py"
requires:
  - "read: repository code"
  - "node/npm or repo build tool (for lint/tests/build checks)"
  - "optionally: GitHub token with limited scope for creating draft PRs (explicit confirm required)"
permissions:
  create_prs: false
  create_branches: false
  run_migrations: false
---
