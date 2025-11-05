# Backend Agent - List Conversations API

## Overview

The `list_conversations` API provides a way to fetch the state of all active backend agent conversations. This is useful for monitoring ongoing work, debugging agent behavior, and building dashboards or management interfaces.

## API Signature

```python
def list_conversations(
    self,
    filters: Optional[Dict[str, Any]] = None,
    max_results: int = 200
) -> List[Dict[str, Any]]
```

## Parameters

### `filters` (Optional[Dict[str, Any]])

Optional dictionary of filters to apply to the results. Currently supported filter keys:

- **`status`**: List of status values to filter by. Valid statuses:
  - `in-progress` - Conversation is actively being worked on
  - `waiting` - Waiting for user input (e.g., clarification questions)
  - `interrupted` - Conversation was interrupted/paused
  - `draft-preview` - Draft preview is ready and waiting for confirmation
  - `completed` - Task has been completed (note: completed conversations are typically removed from the active list)

Example:
```python
# Filter by single status
filters = {'status': ['waiting']}

# Filter by multiple statuses
filters = {'status': ['in-progress', 'waiting', 'draft-preview']}
```

### `max_results` (int, default: 200)

Maximum number of results to return. Results are sorted by `last_activity_at` (most recent first) before applying the limit.

## Return Value

Returns a list of conversation objects. Each object contains:

| Field | Type | Description |
|-------|------|-------------|
| `conversation_id` | string | Unique identifier for the conversation |
| `task_id` | string | ID of the task being worked on |
| `task_name` | string | Human-readable name/summary of the task |
| `task_type` | string | Type of task (e.g., "api-endpoint", "validation", "migration") |
| `assigned_agent` | string | Always "backend_agent" for backend conversations |
| `status` | string | Current status (see status values above) |
| `preview_ready` | boolean | True if preview message has been generated |
| `checks_status` | string | Status of checks: "none", "passed", or "failed" |
| `draft_pr_payload_exists` | boolean | True if draft PR payload has been prepared |
| `artifacts_urls` | array of strings | URLs to any artifacts generated (e.g., preview links, reports) |
| `created_at` | string (ISO-8601) | Timestamp when conversation was created |
| `last_activity_at` | string (ISO-8601) | Timestamp of last activity in the conversation |

## Examples

### Example 1: List All Active Conversations

```python
from agents.backend_agent import BackendAgent

agent = BackendAgent(repo="gcolon75/Project-Valine")
conversations = agent.list_conversations()

print(f"Found {len(conversations)} active conversations")
for conv in conversations:
    print(f"  - {conv['task_name']} [{conv['status']}]")
```

### Example 2: Filter by Status

```python
# Get only conversations waiting for user input
waiting = agent.list_conversations(
    filters={'status': ['waiting']}
)

print(f"Conversations waiting for input: {len(waiting)}")
```

### Example 3: Get JSON Output (for APIs)

```python
import json

conversations = agent.list_conversations(
    filters={'status': ['in-progress', 'waiting', 'interrupted', 'draft-preview']}
)

# Return pure JSON
print(json.dumps(conversations, indent=2))
```

### Example 4: Limit Results

```python
# Get only the 10 most recent conversations
recent = agent.list_conversations(max_results=10)
```

## CLI Usage

A command-line interface is provided via `scripts/list_backend_conversations.py`:

```bash
# List all conversations (JSON output)
python scripts/list_backend_conversations.py

# Filter by status
python scripts/list_backend_conversations.py --status waiting

# Multiple statuses (comma-separated)
python scripts/list_backend_conversations.py --status "in-progress,waiting,draft-preview"

# Limit results
python scripts/list_backend_conversations.py --max-results 10

# Pretty format for humans
python scripts/list_backend_conversations.py --format pretty
```

## Use Cases

### 1. Monitoring Dashboard

Build a dashboard that shows all active conversations and their status:

```python
agent = BackendAgent(repo="your-org/your-repo")

# Get all active conversations
active = agent.list_conversations(
    filters={'status': ['in-progress', 'waiting', 'draft-preview']}
)

# Group by status
by_status = {}
for conv in active:
    status = conv['status']
    if status not in by_status:
        by_status[status] = []
    by_status[status].append(conv)

# Display stats
print(f"Total Active: {len(active)}")
print(f"  In Progress: {len(by_status.get('in-progress', []))}")
print(f"  Waiting: {len(by_status.get('waiting', []))}")
print(f"  Draft Preview: {len(by_status.get('draft-preview', []))}")
```

### 2. Debugging Agent Behavior

Find conversations that might be stuck:

```python
from datetime import datetime, timezone, timedelta

agent = BackendAgent(repo="your-org/your-repo")
all_convs = agent.list_conversations()

# Find conversations inactive for more than 1 hour
now = datetime.now(timezone.utc)
stale_threshold = now - timedelta(hours=1)

stale_convs = [
    conv for conv in all_convs
    if datetime.fromisoformat(conv['last_activity_at']) < stale_threshold
]

print(f"Found {len(stale_convs)} stale conversations (inactive > 1 hour)")
```

### 3. Auto-Resume Interrupted Work

```python
# Find interrupted conversations and offer to resume them
interrupted = agent.list_conversations(
    filters={'status': ['interrupted']}
)

for conv in interrupted:
    print(f"Resume work on: {conv['task_name']}?")
    # ... resume logic ...
```

## Notes

- Conversations are automatically removed from the active list when they are completed (user confirms and PR is prepared) or cancelled.
- The `artifacts_urls` field is currently empty but can be populated with URLs to preview links, generated reports, or other artifacts in future enhancements.
- Sorting by `last_activity_at` ensures the most recently active conversations appear first, which is useful for resuming work or monitoring progress.
- The API is designed to be non-mutating - calling `list_conversations` never modifies conversation state.

## Related Documentation

- [Backend Agent Overview](./backend_agent_overview.md) (if exists)
- [Backend Agent Task Definitions](./backend_agent_tasks.md) (if exists)
- See `examples/backend_agent_example.py` for complete workflow examples
- See `examples/list_conversations_demo.py` for comprehensive list_conversations examples
