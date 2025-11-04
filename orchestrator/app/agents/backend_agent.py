"""
BackendAgent - orchestrator/app/agents/backend_agent.py

Purpose:
- Analyze backend/API change requests and produce migration / API-change previews.
- Create safe draft PR payloads (mock by default).
"""
import uuid
import json
from datetime import datetime, timezone
from typing import Dict, Any

class BackendAgent:
    def __init__(self, github_service=None, repo="gcolon75/Project-Valine"):
        self.github = github_service
        self.repo = repo

    def propose_schema_change(self, user: str, model_name: str, fields: Dict[str,str]) -> Dict[str,Any]:
        """
        Propose a schema/model change (e.g., add a field to a Prisma model).
        Returns preview and draft PR payload (mock).
        """
        cid = str(uuid.uuid4())
        summary = f"Proposed schema change: add/modify model {model_name} -> fields {fields}"
        migration_example = self._generate_migration_example(model_name, fields)
        pr = self._draft_pr_payload(cid, user, f"db/schema: propose {model_name}", summary, [{"file":"prisma/schema.prisma","patch":migration_example}])
        return {"success": True, "conversation_id": cid, "summary": summary, "migration_example": migration_example, "draft_pr": pr}

    def propose_endpoint_change(self, user: str, endpoint: str, change: str) -> Dict[str,Any]:
        """
        Propose an endpoint contract change.
        """
        cid = str(uuid.uuid4())
        summary = f"Proposed endpoint change for {endpoint}: {change}"
        example_code = f"# Example change for {endpoint}\n# {change}"
        pr = self._draft_pr_payload(cid, user, f"api: propose change {endpoint}", summary, [{"file":f"serverless/src/handlers/{endpoint}.js","patch":example_code}])
        return {"success": True, "conversation_id": cid, "summary": summary, "example": example_code, "draft_pr": pr}

    def _generate_migration_example(self, model_name: str, fields: Dict[str,str]) -> str:
        lines = [f"// Migration example for {model_name}"]
        for name,typ in fields.items():
            lines.append(f"// add field: {name} {typ}")
        return "\n".join(lines)

    def _draft_pr_payload(self, cid: str, user: str, title: str, description: str, changes: list) -> Dict[str,Any]:
        branch = f"autogen/backend/{cid[:8]}"
        body = f"{description}\n\nRequested by: {user}"
        return {"branch": branch, "title": title, "body": body, "changes": changes}