# Agent Task Schema

This document defines the canonical JSON schema for agent task requests in Project Valine's "agents-as-employees" workflow.

## Purpose

This schema enables structured task delegation from Project Managers (or other authorized roles) to AI agent workers. Each task follows a lifecycle: proposed → awaiting_confirmation → in_progress → completed/failed.

## JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["task_id", "task_type", "requested_by", "parameters"],
  "properties": {
    "task_id": {
      "type": "string",
      "description": "Unique identifier for the task (UUID v4)",
      "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
    },
    "task_type": {
      "type": "string",
      "enum": ["ux_update", "code_change", "documentation", "infrastructure"],
      "description": "Type of task being requested"
    },
    "requested_by": {
      "type": "object",
      "required": ["user_id", "role"],
      "properties": {
        "user_id": {
          "type": "string",
          "description": "Discord user ID or GitHub username"
        },
        "role": {
          "type": "string",
          "enum": ["admin", "pm", "developer", "contributor"],
          "description": "Role of the requester (determines permissions)"
        }
      }
    },
    "parameters": {
      "type": "object",
      "description": "Task-specific parameters",
      "properties": {
        "dry_run": {
          "type": "boolean",
          "default": true,
          "description": "If true, only generate preview without applying changes"
        },
        "target_section": {
          "type": "string",
          "description": "For UX updates: section to modify (header, footer, navbar, etc)"
        },
        "updates": {
          "type": "object",
          "description": "Map of property names to new values"
        },
        "plain_text": {
          "type": "string",
          "description": "Natural language description of desired changes"
        },
        "attachments": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "url": {"type": "string"},
              "type": {"type": "string"}
            }
          },
          "description": "Images or files attached to the request"
        },
        "use_llm_parsing": {
          "type": "boolean",
          "default": false,
          "description": "Enable LLM-based intent parsing (requires feature flag)"
        }
      }
    },
    "conversation_id": {
      "type": "string",
      "description": "For multi-turn conversations, links to previous context"
    },
    "status": {
      "type": "string",
      "enum": ["proposed", "awaiting_confirmation", "in_progress", "completed", "failed", "cancelled"],
      "default": "proposed",
      "description": "Current status of the task"
    },
    "proposed_changes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["file", "diff", "description"],
        "properties": {
          "file": {
            "type": "string",
            "description": "Relative path to file being changed"
          },
          "diff": {
            "type": "string",
            "description": "Unified diff format of proposed change"
          },
          "description": {
            "type": "string",
            "description": "Human-readable description of change"
          },
          "preview_html": {
            "type": "string",
            "description": "Optional HTML preview for Discord/UI"
          }
        }
      },
      "description": "List of proposed file changes (populated after analysis)"
    },
    "pr_draft": {
      "type": "object",
      "properties": {
        "url": {"type": "string"},
        "number": {"type": "integer"},
        "branch": {"type": "string"}
      },
      "description": "Draft PR details after confirmation"
    },
    "evidence": {
      "type": "object",
      "properties": {
        "preview_file": {"type": "string"},
        "log_file": {"type": "string"},
        "cost_estimate": {
          "type": "object",
          "properties": {
            "llm_calls": {"type": "integer"},
            "estimated_cost_usd": {"type": "number"}
          }
        }
      },
      "description": "Paths to evidence files and metadata"
    },
    "created_at": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of task creation"
    },
    "updated_at": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of last update"
    },
    "error": {
      "type": "object",
      "properties": {
        "code": {"type": "string"},
        "message": {"type": "string"},
        "details": {"type": "object"}
      },
      "description": "Error information if task failed"
    }
  }
}
```

## Example Task

### UX Update Task (Structured Command)

```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "task_type": "ux_update",
  "requested_by": {
    "user_id": "discord:123456789",
    "role": "pm"
  },
  "parameters": {
    "dry_run": true,
    "target_section": "header",
    "updates": {
      "text": "Welcome to Project Valine!"
    }
  },
  "status": "proposed",
  "created_at": "2025-10-27T21:54:59.705Z"
}
```

### UX Update Task (Natural Language)

```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440001",
  "task_type": "ux_update",
  "requested_by": {
    "user_id": "discord:987654321",
    "role": "developer"
  },
  "parameters": {
    "dry_run": true,
    "plain_text": "Make the dashboard header match the profile page style",
    "use_llm_parsing": true,
    "attachments": [
      {
        "url": "https://cdn.discordapp.com/attachments/...",
        "type": "image/png"
      }
    ]
  },
  "status": "proposed",
  "created_at": "2025-10-27T22:00:00.000Z"
}
```

## Workflow States

1. **proposed**: Task created, awaiting initial analysis
2. **awaiting_confirmation**: Analysis complete, preview generated, waiting for user approval
3. **in_progress**: User confirmed, changes being applied
4. **completed**: Changes applied successfully, PR created
5. **failed**: Task failed with error details
6. **cancelled**: User cancelled the task

## Role Permissions

- **admin**: Can execute all task types, including infrastructure changes
- **pm**: Can execute ux_update, code_change, documentation tasks
- **developer**: Can execute ux_update, documentation tasks (with approval)
- **contributor**: Can propose tasks (always require approval)

## Validation Rules

1. All tasks must have valid `task_id` (UUID v4 format)
2. `requested_by.role` must be checked against allowed operations
3. `dry_run` must be true on first pass (except for admin with explicit override)
4. `proposed_changes` must be populated before status can change to `awaiting_confirmation`
5. Tasks that modify >5 files require PM confirmation
6. Infrastructure changes always require PM confirmation

## Evidence Requirements

Every task must produce evidence files:
- `orchestrator/evidence/preview-{task_id}.md`: Preview of changes for user review
- `orchestrator/evidence/task-{task_id}.json`: Complete task record
- `orchestrator/evidence/task-run-{task_id}.json`: Execution log with timing and commands

## Integration Points

- **Discord Handler**: Creates initial task from `/ux-update` command
- **Task Worker**: Processes task, generates previews, applies changes
- **GitHub Service**: Creates branches and draft PRs
- **DynamoDB**: Stores conversation state for multi-turn flows
