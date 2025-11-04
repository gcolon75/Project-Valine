"""
FrontendAgent - orchestrator/app/agents/frontend_agent.py

Purpose:
- Analyze frontend/UI requests (mock or structured).
- Produce deterministic UI change previews (code snippet diffs).
- Produce a draft PR payload (mock by default) describing changes.

Notes:
- Safe by default: _does not_ push or create real PRs unless you explicitly ask.
- Designed to be lightweight and adapted to your repository paths (update SECTION_MAPPINGS).
"""
import re
import uuid
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

class FrontendConversation:
    def __init__(self, conversation_id: str, user: str):
        self.id = conversation_id
        self.user = user
        self.section = None
        self.updates: Dict[str, Any] = {}
        self.preview: Optional[Dict[str, Any]] = None
        self.created_at = datetime.now(timezone.utc).isoformat()
        self.confirmed = False

    def to_dict(self):
        return {
            "id": self.id,
            "user": self.user,
            "section": self.section,
            "updates": self.updates,
            "preview": self.preview,
            "created_at": self.created_at,
            "confirmed": self.confirmed
        }

class FrontendAgent:
    SECTION_MAPPINGS = {
        "header": { "file": "src/components/Header.jsx", "properties": ["text","color","links"] },
        "home":   { "file": "src/pages/Home.jsx", "properties": ["hero-text","cta-text","layout"] },
        "profile":{ "file": "src/pages/Profile.jsx", "properties": ["bio","avatar","layout"] }
    }

    def __init__(self, github_service=None, repo="gcolon75/Project-Valine"):
        self.github = github_service
        self.repo = repo
        # conversation store is in-memory for template; replace with DynamoDB or other persistence if desired
        self._conversations: Dict[str, FrontendConversation] = {}

    def start(self, user: str, section: Optional[str]=None, updates: Optional[Dict]=None) -> Dict[str, Any]:
        cid = str(uuid.uuid4())
        conv = FrontendConversation(cid, user)
        if section:
            conv.section = section
        if updates:
            conv.updates = updates
        # basic validation
        if conv.section and conv.section not in self.SECTION_MAPPINGS:
            return {"success": False, "message": f"Unknown section: {conv.section}"}
        conv.preview = self._generate_preview(conv)
        self._conversations[cid] = conv
        return {"success": True, "conversation_id": cid, "preview": conv.preview}

    def confirm(self, conversation_id: str, user_response: str) -> Dict[str, Any]:
        conv = self._conversations.get(conversation_id)
        if not conv:
            return {"success": False, "message": "Conversation not found"}
        if user_response.strip().lower() in ("yes","y","confirm"):
            conv.confirmed = True
            # produce a draft PR payload (mock)
            pr = self._make_draft_pr_payload(conv)
            conv.preview = {"final_pr": pr}
            return {"success": True, "pr": pr}
        else:
            return {"success": True, "message": "Cancelled or modified; send updated instructions"}

    def _generate_preview(self, conv: FrontendConversation) -> Dict[str,Any]:
        # generate a plain-language summary and small code snippet
        if not conv.section or not conv.updates:
            return {"success": False, "message": "Provide section and updates to preview."}
        mapping = self.SECTION_MAPPINGS.get(conv.section, {})
        file = mapping.get("file", "<unknown>")
        summary = f"Will update {conv.section} ({file}) with: {json.dumps(conv.updates)}"
        code_snippets = []
        for k,v in conv.updates.items():
            if k in ("text","hero-text","cta-text"):
                code_snippets.append({"language":"jsx","code":f"/* Update: {k} */\n{self._simple_element_for(k,v)}"})
            elif k == "color":
                code_snippets.append({"language":"css","code":f"/* Update color for {conv.section} */\n.{conv.section} {{ background: {v}; }}"})
            else:
                code_snippets.append({"language":"text","code":f"# {k}: {v}"})
        return {"success": True, "summary": summary, "file": file, "snippets": code_snippets}

    def _simple_element_for(self, prop: str, value: str) -> str:
        if "hero" in prop or "text" in prop:
            return f'<h1>{value}</h1>'
        return str(value)

    def _make_draft_pr_payload(self, conv: FrontendConversation) -> Dict[str,Any]:
        # returns a safe draft object; does not call GitHub
        branch = f"autogen/frontend/{{conv.id[:8]}}"
        title = f"UX: frontend update for {{conv.section}}"
        body = f"Auto-generated draft PR for {{conv.section}} by {{conv.user}}\n\nUpdates:\n{{json.dumps(conv.updates, indent=2)}}"
        changes = [{"file": self.SECTION_MAPPINGS[conv.section]["file"], "patch": "[PATCH PREVIEW] " + json.dumps(conv.updates)}]
        return {"branch": branch, "title": title, "body": body, "changes": changes}

    # Helper to list active conversations (for admin/debug)
    def list_conversations(self) -> List[Dict]:
        return [c.to_dict() for c in self._conversations.values()]