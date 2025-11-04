"""
DocsAgent - orchestrator/app/agents/docs_agent.py

Purpose:
- Generate or update documentation artifacts: READMEs, migration guides, API docs, and archive old docs.
- Produce deterministic documentation drafts and a draft PR payload.

Capabilities
- Create new pages under docs/
- Archive existing docs to docs/archive/
- Produce a draft PR payload describing documentation changes
- Validate basic Markdown formatting before producing drafts
"""
import uuid
import json
from datetime import datetime,timezone
from typing import Dict, Any, List, Optional

class DocsConversation:
    def __init__(self, conversation_id: str, user: str):
        self.id = conversation_id
        self.user = user
        self.path = None
        self.content_md = None
        self.action = None  # 'create' | 'archive' | 'update'
        self.preview: Optional[Dict[str, Any]] = None
        self.created_at = datetime.now(timezone.utc).isoformat()
        self.confirmed = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user": self.user,
            "path": self.path,
            "action": self.action,
            "created_at": self.created_at,
            "confirmed": self.confirmed
        }

class DocsAgent:
    DEFAULT_DOCS_DIR = "docs"
    ARCHIVE_DIR = "docs/archive"

    def __init__(self, github_service=None, repo: str = "gcolon75/Project-Valine"):
        self.github = github_service
        self.repo = repo
        # in-memory store for the template; replace with persistent store in prod
        self._conversations: Dict[str, DocsConversation] = {}

    def start_create(self, user: str, path: str, content_md: str) -> Dict[str, Any]:
        cid = str(uuid.uuid4())
        conv = DocsConversation(cid, user)
        conv.path = path
        conv.content_md = content_md
        conv.action = "create"
        conv.preview = self._generate_preview(conv)
        self._conversations[cid] = conv
        return {"success": True, "conversation_id": cid, "preview": conv.preview}

    def start_archive(self, user: str, path: str, archive_suffix: Optional[str] = None) -> Dict[str, Any]:
        cid = str(uuid.uuid4())
        conv = DocsConversation(cid, user)
        conv.path = path
        conv.action = "archive"
        archive_name = f"{path.rsplit('/',1)[-1].rsplit('.',1)[0]}-{archive_suffix or datetime.now(timezone.utc).strftime('%Y%m%d')}.md"
        archive_path = f"{self.ARCHIVE_DIR}/{archive_name}"
        conv.preview = {"action": "archive", "from": path, "to": archive_path}
        self._conversations[cid] = conv
        return {"success": True, "conversation_id": cid, "preview": conv.preview}

    def confirm(self, conversation_id: str, user_response: str) -> Dict[str, Any]:
        conv = self._conversations.get(conversation_id)
        if not conv:
            return {"success": False, "message": "Conversation not found"}
        if user_response.strip().lower() in ("yes","y","confirm"):
            conv.confirmed = True
            pr = self._make_draft_pr_payload(conv)
            conv.preview = {"final_pr": pr}
            return {"success": True, "pr": pr}
        return {"success": True, "message": "Cancelled or awaiting changes"}

    def _generate_preview(self, conv: DocsConversation) -> Dict[str, Any]:
        if conv.action == "create":
            summary = f"Create docs page at {conv.path}"
            # simple sanity check for markdown headings
            head_count = conv.content_md.count("\n#")
            return {"success": True, "summary": summary, "head_count": head_count}
        return {"success": True, "summary": f"{conv.action} action for {conv.path}"}

    def _make_draft_pr_payload(self, conv: DocsConversation) -> Dict[str, Any]:
        branch = f"autogen/docs/{{conv.id[:8]}}"
        title = f"docs: {{conv.action}} {{conv.path}}"
        body = f"Auto-generated docs {{conv.action}} by {{conv.user}}\n\nPath: {{conv.path}}"
        changes = []
        if conv.action == "create":
            changes.append({"file": conv.path, "content": conv.content_md})
        elif conv.action == "archive":
            # indicate move action in change list
            changes.append({"file": conv.path, "action": "archive", "archive_to": conv.preview.get("to") if conv.preview else None})
        return {"branch": branch, "title": title, "body": body, "changes": changes}

    def list_conversations(self) -> List[Dict[str, Any]]:
        return [c.to_dict() for c in self._conversations.values()]