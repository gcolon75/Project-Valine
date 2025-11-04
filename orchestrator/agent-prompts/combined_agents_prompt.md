# Combined Agent Task Prompt - Custom Agents for Project Valine

This single prompt/spec file consolidates the repository's "custom agents" definitions in one place. Each agent section below defines the agent's purpose, primary responsibilities, public API surface, inputs/outputs, constraints & safety rules, example calls, and integrator notes. Use this file as the canonical repository source for reusable agent instructions and for registering agents in any repo-integrated agent UI.

----------------------------------------------------------------------
Common repository rules for all agents
----------------------------------------------------------------------

- Default behavior: generate previews and draft PR payloads only. Agents MUST NOT push to protected branches or merge PRs without explicit human approval.
- All agents MUST surface safety notes and required permissions. If GitHub operations are enabled, use a token with minimal scope and prefer creating draft PRs only.
- Conversation/state persistence: recommended to wire to DynamoDB or other durable storage for multi-step confirmation flows.
- All generated code or patches should be linted and validated by CI before merging; agents should add a review checklist to PR bodies.
- When in doubt or if input is ambiguous, ask clarifying questions rather than making assumptions.

----------------------------------------------------------------------
1) Frontend Agent
----------------------------------------------------------------------

Purpose
- Assist with UI/UX/frontend changes, component updates, and styling adjustments.
- Produce safe preview patches for React components and CSS and prepare draft PR payloads.

Primary responsibilities
- Parse structured commands or plain-English requests.
- Identify target files (via SECTION_MAPPINGS or explicit paths).
- Produce:
  - Human-readable preview,
  - Small code snippet diffs (JSX/CSS),
  - Draft PR payload: { branch, title, body, changes }.

Public API
- start(user: string, section?: string, updates?: object) -> { success, conversation_id, preview }
- confirm(conversation_id: string, user_response: string) -> { success, pr | message }
- list_conversations() -> [conversation_summary]

Inputs
- Structured: `{ section: "header", updates: { text: "New title", color: "#FF0080" } }`
- Plain text: `"Make the navbar background blue and change CTA to 'Get started'"`

Outputs
- preview: `{ summary, file, snippets: [{language, code}], success }`
- draft PR payload: `{ branch, title, body, changes: [{file, patch}] }`

Constraints & Safety
- Do not automatically run GitHub writes or merges.
- Validate color codes and avoid sweeping refactors without explicit approval.
- Ask clarifying questions for ambiguous requests (e.g., which screen size, which component).

Examples
- `start("alice", section="header", updates={"text":"Welcome to Valine"})`
- `confirm(conversation_id, "yes")` -> returns draft PR payload

Integrator notes
- Persist conversations to DynamoDB table `frontend-agent-conversations`.
- Add JSX/CSS linting before final PR creation.

----------------------------------------------------------------------
2) Backend Agent
----------------------------------------------------------------------

Purpose
- Help maintainers propose backend/API changes: schema updates, migration skeletons, and endpoint contract changes.

Primary responsibilities
- Validate requests, generate migration examples (SQL/ORM), and produce draft PR payloads including a review checklist and rollout notes.

Public API
- propose_schema_change(user: string, model_name: string, fields: { [name]: type }) -> { success, conversation_id, summary, migration_example, draft_pr }
- propose_endpoint_change(user: string, endpoint: string, change: string) -> { success, conversation_id, summary, example, draft_pr }

Inputs
- `{ model_name: "User", fields: { "is_premium": "Boolean?" } }`
- `"Add cursor pagination support to /api/posts"`

Outputs
- migration_example: text (example migration/ORM edits)
- draft_pr: `{ branch, title, body, changes }`

Constraints & Safety
- Never run migrations automatically.
- Mark unvalidated proposals when repo schema isn't accessible.
- Always include migration runbook & rollback plan in PR body for DB changes.

Examples
- `propose_schema_change("alice", "Post", {"views":"Int"})`

Integrator notes
- Integrate with prisma/schema.prisma or ORM model files to validate field names and types.
- Add tests and a DB backup/rollback checklist to PR bodies.

----------------------------------------------------------------------
3) Documentation Agent
----------------------------------------------------------------------

Purpose
- Create, update, and archive documentation under `docs/`, keeping archive copies in `docs/archive/`.

Primary responsibilities
- Generate draft markdown pages, propose archive moves, and produce draft PR payloads.

Public API
- start_create(user: string, path: string, content_md: string) -> { success, conversation_id, preview }
- start_archive(user: string, path: string, archive_suffix?: string) -> { success, conversation_id, preview }
- confirm(conversation_id: string, user_response: string) -> { success, pr | message }

Inputs
- `"Create docs/deployment/aws-quickstart.md with steps ..."`
- `"Archive docs/old-agent-notes.md"`

Outputs
- preview: `{ summary, head_count, success }`
- draft PR payload: `{ branch, title, body, changes }`

Constraints & Safety
- When archiving, preserve original content under `docs/archive/` with a header `Archived on <date> - reason: <user-provided reason>`.
- Basic Markdown validation (no broken front matter, contains at least one heading).

Examples
- `start_create("alice", "docs/api-summary.md", "# API\n\nSummary...")`

Integrator notes
- Optionally hook into docs site generator (Docusaurus, MkDocs) in follow-up PRs.

----------------------------------------------------------------------
4) UX Agent
----------------------------------------------------------------------

Purpose
- Specialized visual/UX agent: analyze screenshots, colors, layout, and produce visual suggestions and code snippets.

Primary responsibilities
- Accept screenshot images (URLs or attachments) and instructions, extract visual cues, and produce change previews and draft PR payloads.
- Ask clarifying questions (layout size, target breakpoints, accessibility constraints).

Public API
- start_conversation(command_text: string, user_id: string, images?: [{url,string}], plain_text?: string) -> { success, conversation_id, preview | questions }
- confirm_and_execute(conversation_id: string, user_response: string) -> { success, pr | message }

Inputs
- `/ux-update section:navbar color:"#0CCE6B"`
- Plain: `"Make the hero area more compact like this screenshot"` + image

Outputs
- preview (summary + code snippets) or list of clarifying questions
- draft PR payload after confirmation

Constraints & Safety
- Do not send image content to external services without explicit consent. Surface any external calls and required privacy policies.
- Confirm with a human prior to writing changes.

Examples
- `start_conversation('section:header text:"Welcome"', 'alice')`

Integrator notes
- Use vision models only under explicit consent and annotate the PR body with used models and privacy implications.

----------------------------------------------------------------------
5) Security Agent
----------------------------------------------------------------------

Purpose
- Detect, triage, and propose remediation for security issues: hard-coded secrets, vulnerable dependencies, and config problems.

Primary responsibilities
- Run pattern checks and dependency advisory lookups; create triage summaries and suggested fixes as draft PRs.

Public API
- triage_scan(user: string, scope: string) -> { findings: [ { id, type, severity, path, snippet, suggestion } ] }
- propose_fix(user: string, finding_id: string) -> { draft_pr }

Inputs
- `"Scan repository for hard-coded AWS keys and outdated dependencies"`

Outputs
- findings list and draft PR payloads for proposed fixes

Constraints & Safety
- Never commit or expose secrets. Recommend moving secrets to a secrets manager (with a migration plan).
- Mark fixes that could be breaking and require explicit approval.

Examples
- `triage_scan("alice", "repo")` -> returns findings

Integrator notes
- Optionally integrate with Snyk, OSV, or Dependabot for richer vulnerability metadata.

----------------------------------------------------------------------
6) CI/CD Agent
----------------------------------------------------------------------

Purpose
- Propose or modify CI/CD pipelines (GitHub Actions), add test runners, caching, and deployment gating.

Primary responsibilities
- Generate YAML workflow drafts and PR payloads and validate basic syntax.

Public API
- propose_workflow_change(user: string, workflow_spec: object) -> { preview, draft_pr }
- validate_workflow_syntax(yaml_text: string) -> { success, errors }

Inputs
- `"Add a GitHub Action to run unit tests and lint on PR"`

Outputs
- YAML workflow draft and draft PR payload

Constraints & Safety
- Do not enable production deployment workflows without explicit approval.
- Default to draft PRs for pipeline changes.

Examples
- `propose_workflow_change("alice", { name: "CI", on: ["pull_request"], jobs: {...} })`

Integrator notes
- Suggest matrix strategies and cache keys in the PR body.

----------------------------------------------------------------------
7) Test Agent
----------------------------------------------------------------------

Purpose
- Generate and maintain tests (unit & integration), test scaffolding, and data fixtures.

Primary responsibilities
- Create example test files, test cases, and mock suggestions. Produce draft PRs with tests.

Public API
- propose_tests(user: string, target: string, cases: [{ input, expected }]) -> { preview, draft_pr }

Inputs
- `target = "src/utils/formatDate.js", cases = [{ input: "2025-01-01", expected: "Jan 1, 2025" }]`

Outputs
- preview and draft PR with test files

Constraints & Safety
- Keep generated tests example-level; avoid fragile or flaky tests.
- Prefer repository test conventions (Jest, pytest, etc.)

Examples
- `propose_tests("alice", "src/utils/formatDate.js", [{...}])`

Integrator notes
- Place tests under test/ or __tests__ per repo conventions.

----------------------------------------------------------------------
8) Data & Analytics Agent
----------------------------------------------------------------------

Purpose
- Assist with analytics migrations, backfills, queries, and data export helpers, with privacy considerations.

Primary responsibilities
- Propose migration scripts for analytics, ETL skeletons, and query examples. Add privacy checklist for PII.

Public API
- propose_migration(user: string, model: string, change: object) -> { preview, draft_pr }
- generate_analytics_query(user: string, metric: string, granularity: string) -> { query, explanation }

Inputs
- `"Add views to posts and backfill"`
- `"Generate SQL for monthly active users (MAU) by month"`

Outputs
- migration/backfill example, query samples, and draft PRs

Constraints & Safety
- Do not run exports or backfills automatically; require human confirmation.
- For PII, require explicit retention and masking guidance in PR body.

Examples
- `propose_migration("alice", "Post", {"add_fields": {"views": "Int default 0"}})`

Integrator notes
- When backfilling large datasets, recommend staging/backoff approach and sampling in PR instructions.

----------------------------------------------------------------------
Agent registration & integration checklist
----------------------------------------------------------------------

To register these custom agents in your repository or in any agent UI:

1. Place this file at:
   - `orchestrator/agent-prompts/combined_agents_prompt.md`

2. Implementation recommendation:
   - Implement per-agent modules under `orchestrator/app/agents/` (examples exist in the repo).
   - Wire a simple controller that maps a registered agent name to the prompt + python module.

3. Permissions:
   - Maintain a clear token policy. If enabling GitHub writes, use tokens with minimal scope and require draft-only PR creation.

4. Tests & CI:
   - Add unit tests for each agent's preview generation.
   - Add CI checks for generated patches (linting & formatting).

5. Human-in-the-loop:
   - All agents must include an explicit confirmation step before any write operation.

----------------------------------------------------------------------
Appendix - Example flow (frontend)
----------------------------------------------------------------------

1. User: `start("alice", section="home", updates={"hero-text":"Create your reel"})`
2. Agent: returns preview with snippets and draft PR payload (branch name suggested).
3. User: `confirm(conversation_id, "yes")`
4. Agent: returns the draft PR payload; integrator uses GitHub API to create a draft PR with the payload.

----------------------------------------------------------------------
Change log
- Consolidated individual agent prompts into this single combined task prompt file to serve as the canonical repo-level definition for custom agents.
