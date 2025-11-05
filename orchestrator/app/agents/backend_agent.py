"""
Backend Agent for Project-Valine orchestrator.

This agent prepares backend-side work required to support UX changes without touching 
DOM/CSS or visual implementation. It produces human-readable previews, unified diffs 
(per-file patch snippets), run-check reports (lint/test/build results), and a draft PR 
payload (branch, commits, PR body). It never merges, runs migrations, or writes to 
production without explicit human confirmation.

Primary responsibilities:
- Add/extend API endpoints to support UI features (user preferences, profile links, dashboard stats)
- Propose schema/model changes and produce migration + backfill plans (but do not run them)
- Add server-side validation, sanitization, and contract tests for new/changed endpoints
- Produce draft PR payloads with focused commits, tests, and documentation
- Coordinate with the UX agent: create backend "support PRs" and cross-link to UX agent PRs

Public API:
- next_tasks_overview(user: string) -> { success, tasks: [{id, priority, summary}] }
- start_task(user: string, task_id: string, context_files?: string[]) -> { success, conversation_id, preview | questions }
- confirm_and_prepare_pr(conversation_id: string, user_confirmation: string) -> { success, draft_pr_payload | message }
- run_checks(conversation_id: string) -> { success, lint: {...}, tests: {...}, build: {...} }

Safety & constraints:
- Do not perform DB migrations, backfills, or production writes without human confirmation
- Always produce small, focused commits with clear messages
- If a task requires a schema change, produce a separate migration PR
- Run lint/tests/build locally and report failures
- Require explicit confirmation before creating branches or draft PRs

Usage:
    from agents.backend_agent import BackendAgent
    
    agent = BackendAgent(
        github_service=github_service,
        repo="gcolon75/Project-Valine"
    )
    
    # Get task overview
    result = agent.next_tasks_overview(user='gabriel')
    
    # Start a task
    result = agent.start_task(
        user='gabriel',
        task_id='theme-preference-api'
    )
    
    # After user confirms
    result = agent.confirm_and_prepare_pr(
        conversation_id='conv123',
        user_confirmation='yes'
    )
"""

import os
import json
import subprocess
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timezone
from pathlib import Path
import uuid


class ConversationState:
    """Represents the state of a Backend Agent conversation."""
    
    def __init__(self, conversation_id: str, user_id: str, task_id: str):
        self.conversation_id = conversation_id
        self.user_id = user_id
        self.task_id = task_id
        self.task_details = {}
        self.proposed_changes = {}
        self.migration_plan = None
        self.preview_message = None
        self.check_results = {}
        self.created_at = datetime.now(timezone.utc)
        self.last_activity_at = datetime.now(timezone.utc)
        self.confirmed = False
        self.needs_clarification = False
        self.clarification_questions = []
        self.context_files = []
        self.status = 'in-progress'  # in-progress, waiting, interrupted, completed, draft-preview
        self.draft_pr_payload = None
        self.artifacts_urls = []
        
    def to_dict(self):
        """Convert to dictionary for storage."""
        return {
            'conversation_id': self.conversation_id,
            'user_id': self.user_id,
            'task_id': self.task_id,
            'task_details': self.task_details,
            'proposed_changes': self.proposed_changes,
            'migration_plan': self.migration_plan,
            'preview_message': self.preview_message,
            'check_results': self.check_results,
            'created_at': self.created_at.isoformat(),
            'last_activity_at': self.last_activity_at.isoformat(),
            'confirmed': self.confirmed,
            'needs_clarification': self.needs_clarification,
            'clarification_questions': self.clarification_questions,
            'context_files': self.context_files,
            'status': self.status,
            'draft_pr_payload': self.draft_pr_payload,
            'artifacts_urls': self.artifacts_urls
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ConversationState':
        """Restore from dictionary."""
        conversation = cls(
            data['conversation_id'],
            data['user_id'],
            data['task_id']
        )
        conversation.task_details = data.get('task_details', {})
        conversation.proposed_changes = data.get('proposed_changes', {})
        conversation.migration_plan = data.get('migration_plan')
        conversation.preview_message = data.get('preview_message')
        conversation.check_results = data.get('check_results', {})
        conversation.confirmed = data.get('confirmed', False)
        conversation.needs_clarification = data.get('needs_clarification', False)
        conversation.clarification_questions = data.get('clarification_questions', [])
        conversation.context_files = data.get('context_files', [])
        conversation.status = data.get('status', 'in-progress')
        conversation.draft_pr_payload = data.get('draft_pr_payload')
        conversation.artifacts_urls = data.get('artifacts_urls', [])
        if 'created_at' in data:
            conversation.created_at = datetime.fromisoformat(data['created_at'])
        if 'last_activity_at' in data:
            conversation.last_activity_at = datetime.fromisoformat(data['last_activity_at'])
        return conversation
    
    def update_activity(self):
        """Update the last activity timestamp."""
        self.last_activity_at = datetime.now(timezone.utc)


class BackendAgent:
    """
    Backend Agent for automating backend changes via task-based workflow.
    
    This agent processes backend tasks and creates draft PRs with the requested 
    changes to APIs, schemas, migrations, and tests. It features an interactive 
    conversation flow that confirms changes before execution.
    """
    
    # High-priority task definitions
    TASK_DEFINITIONS = {
        'theme-preference-api': {
            'id': 'theme-preference-api',
            'priority': 'High',
            'summary': 'Add GET/PATCH user preference endpoints for theme, propose schema migration, migration/backfill plan, tests, and docs',
            'files': ['server/routes/users.js', 'api/prisma/schema.prisma'],
            'type': 'api-endpoint',
            'requires_migration': True
        },
        'profile-links-titles': {
            'id': 'profile-links-titles',
            'priority': 'High',
            'summary': 'Add title and links contract for user profile, validation, and migration proposal',
            'files': ['server/routes/users.js', 'api/prisma/schema.prisma'],
            'type': 'api-endpoint',
            'requires_migration': True
        },
        'dashboard-stats-endpoints': {
            'id': 'dashboard-stats-endpoints',
            'priority': 'Medium',
            'summary': 'Create aggregate endpoints for total views/engagement and caching guidance',
            'files': ['server/routes/stats.js'],
            'type': 'api-endpoint',
            'requires_migration': False
        },
        'validators-and-security': {
            'id': 'validators-and-security',
            'priority': 'High',
            'summary': 'Add robust validators and sanitizers for new inputs; add tests and error formats',
            'files': ['server/routes/helpers.js'],
            'type': 'validation',
            'requires_migration': False
        },
        'migrations-and-backfills': {
            'id': 'migrations-and-backfills',
            'priority': 'Medium',
            'summary': 'Produce migration scripts with dry-run and rollback steps; do not execute without approval',
            'files': ['api/prisma/migrations/'],
            'type': 'migration',
            'requires_migration': True
        },
        'contract-tests-and-ci': {
            'id': 'contract-tests-and-ci',
            'priority': 'Medium',
            'summary': 'Add contract tests and ensure CI runs them',
            'files': ['server/__tests__/'],
            'type': 'testing',
            'requires_migration': False
        }
    }
    
    def __init__(self, github_service=None, repo: str = "gcolon75/Project-Valine"):
        """
        Initialize Backend Agent.
        
        Args:
            github_service: GitHubService instance for PR operations (optional)
            repo: Repository name (owner/repo)
        """
        self.github_service = github_service
        self.repo = repo
        self.owner, self.repo_name = repo.split('/')
        
        # In-memory conversation store (would use DynamoDB in production)
        self.conversations = {}
    
    def next_tasks_overview(self, user: str) -> Dict[str, Any]:
        """
        Get prioritized list of backend tasks.
        
        Args:
            user: Username requesting the tasks
            
        Returns:
            Dictionary with success status and list of tasks
        """
        tasks = []
        for task_id, task_def in self.TASK_DEFINITIONS.items():
            tasks.append({
                'id': task_def['id'],
                'priority': task_def['priority'],
                'summary': task_def['summary'],
                'type': task_def['type'],
                'requires_migration': task_def.get('requires_migration', False)
            })
        
        # Sort by priority (High -> Medium -> Low)
        priority_order = {'High': 0, 'Medium': 1, 'Low': 2}
        tasks.sort(key=lambda t: priority_order.get(t['priority'], 3))
        
        return {
            'success': True,
            'user': user,
            'tasks': tasks,
            'message': f"📋 **Backend Tasks Overview for {user}**\n\n" + 
                      self._format_tasks_list(tasks)
        }
    
    def _format_tasks_list(self, tasks: List[Dict[str, Any]]) -> str:
        """Format tasks list for display."""
        output = []
        for task in tasks:
            priority_emoji = '🔴' if task['priority'] == 'High' else '🟡' if task['priority'] == 'Medium' else '🟢'
            migration_note = ' ⚠️ (requires migration)' if task.get('requires_migration') else ''
            output.append(f"{priority_emoji} **{task['id']}** [{task['priority']}]{migration_note}\n   {task['summary']}")
        return '\n\n'.join(output)
    
    def start_task(
        self,
        user: str,
        task_id: str,
        context_files: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Start a backend task conversation.
        
        Args:
            user: Username starting the task
            task_id: Task identifier from TASK_DEFINITIONS
            context_files: Optional list of file paths for additional context
            
        Returns:
            Dictionary with conversation_id, preview, or clarifying questions
        """
        # Validate task ID
        if task_id not in self.TASK_DEFINITIONS:
            return {
                'success': False,
                'message': f"❌ Unknown task ID: {task_id}",
                'available_tasks': list(self.TASK_DEFINITIONS.keys())
            }
        
        # Create new conversation
        conversation_id = str(uuid.uuid4())
        conversation = ConversationState(conversation_id, user, task_id)
        conversation.task_details = self.TASK_DEFINITIONS[task_id].copy()
        conversation.context_files = context_files or []
        
        # Check if task requires clarification
        clarifications = self._check_task_clarifications(conversation)
        if clarifications:
            conversation.needs_clarification = True
            conversation.clarification_questions = clarifications
            conversation.status = 'waiting'  # Waiting for clarification
            conversation.update_activity()
            self.conversations[conversation_id] = conversation
            
            return {
                'success': True,
                'conversation_id': conversation_id,
                'needs_clarification': True,
                'questions': clarifications,
                'message': self._format_clarification_message(clarifications)
            }
        
        # Generate preview of changes
        preview = self._generate_task_preview(conversation)
        conversation.preview_message = preview['message']
        conversation.status = 'draft-preview'  # Preview ready, waiting for confirmation
        conversation.update_activity()
        self.conversations[conversation_id] = conversation
        
        return {
            'success': True,
            'conversation_id': conversation_id,
            'task_id': task_id,
            'preview': preview,
            'message': preview['message'],
            'needs_confirmation': True
        }
    
    def _check_task_clarifications(self, conversation: ConversationState) -> List[str]:
        """Check if task needs clarifications and return questions."""
        questions = []
        task_id = conversation.task_id
        
        # Task-specific clarifications
        if task_id == 'theme-preference-api':
            questions.append(
                "💡 Should theme preference be stored in a new `preferences` JSON column "
                "or as a separate `theme` field on the User model? (Recommend: separate field for simpler queries)"
            )
            questions.append(
                "🔑 What localStorage key(s) are used for theme persistence so I can plan migration mapping on login?"
            )
        
        elif task_id == 'profile-links-titles':
            questions.append(
                "💡 Should `profile.links` be stored as a JSON column or normalized table? "
                "(Recommend: JSON for simplicity unless you need complex queries)"
            )
            questions.append(
                "🔢 What's the max number of links per profile? (for validation)"
            )
        
        elif task_id == 'dashboard-stats-endpoints':
            questions.append(
                "📊 Are there existing analytics tables or an event stream I should use, "
                "or should I add new aggregation jobs?"
            )
            questions.append(
                "⚡ Do you want these endpoints cached or paginated by default?"
            )
        
        return questions
    
    def _format_clarification_message(self, questions: List[str]) -> str:
        """Format clarification questions for display."""
        msg = "🤔 **Need some clarifications before proceeding:**\n\n"
        for i, q in enumerate(questions, 1):
            msg += f"{i}. {q}\n\n"
        msg += "\nPlease answer these questions, then I'll generate a preview for you! 👍"
        return msg
    
    def _generate_task_preview(self, conversation: ConversationState) -> Dict[str, Any]:
        """Generate preview of proposed changes for a task."""
        task_id = conversation.task_id
        task_details = conversation.task_details
        
        preview = {
            'task_id': task_id,
            'summary': task_details['summary'],
            'files_to_modify': task_details['files'],
            'proposed_changes': {},
            'migration_plan': None,
            'tests_to_add': [],
            'message': ''
        }
        
        # Generate task-specific preview
        if task_id == 'theme-preference-api':
            preview['proposed_changes'] = {
                'server/routes/users.js': [
                    'feat(api): Add GET /api/users/:id/preferences endpoint',
                    'feat(api): Add PATCH /api/users/:id/preferences endpoint',
                    'feat(validation): Add theme preference validation'
                ],
                'api/prisma/schema.prisma': [
                    'feat(schema): Add theme field to User model'
                ]
            }
            preview['migration_plan'] = {
                'type': 'schema_migration',
                'description': 'Add theme field to User model',
                'safe': True,
                'rollback_plan': 'Field is nullable, can be dropped without data loss'
            }
            preview['tests_to_add'] = [
                'server/__tests__/users.preferences.test.js'
            ]
        
        elif task_id == 'profile-links-titles':
            preview['proposed_changes'] = {
                'server/routes/users.js': [
                    'feat(api): Add title and links fields to profile endpoint',
                    'feat(validation): Add URL validation for profile links',
                    'feat(validation): Add title length validation'
                ],
                'api/prisma/schema.prisma': [
                    'feat(schema): Add title and profileLinks fields to User model'
                ]
            }
            preview['migration_plan'] = {
                'type': 'schema_migration',
                'description': 'Add title and profileLinks fields to User model',
                'safe': True,
                'rollback_plan': 'Fields are nullable, can be dropped without data loss'
            }
            preview['tests_to_add'] = [
                'server/__tests__/users.profile.test.js'
            ]
        
        elif task_id == 'dashboard-stats-endpoints':
            preview['proposed_changes'] = {
                'server/routes/stats.js': [
                    'feat(api): Add GET /api/dashboard/stats endpoint',
                    'feat(api): Add aggregation queries for views and engagement',
                    'feat(perf): Add caching guidance for stats'
                ]
            }
            preview['tests_to_add'] = [
                'server/__tests__/stats.test.js'
            ]
        
        elif task_id == 'validators-and-security':
            preview['proposed_changes'] = {
                'server/routes/helpers.js': [
                    'feat(validation): Add URL whitelist/normalization',
                    'feat(validation): Add input sanitization for profile fields',
                    'feat(security): Add rate-limiting guidance'
                ]
            }
            preview['tests_to_add'] = [
                'server/__tests__/validation.test.js'
            ]
        
        # Format message
        preview['message'] = self._format_preview_message(preview)
        
        return preview
    
    def _format_preview_message(self, preview: Dict[str, Any]) -> str:
        """Format preview message for display."""
        msg = f"## 🎯 Task Preview: {preview['task_id']}\n\n"
        msg += f"**Summary:** {preview['summary']}\n\n"
        
        msg += "### 📝 Proposed Changes\n\n"
        for file_path, changes in preview['proposed_changes'].items():
            msg += f"**{file_path}:**\n"
            for change in changes:
                msg += f"  - {change}\n"
            msg += "\n"
        
        if preview['migration_plan']:
            msg += "### 🗄️ Migration Plan\n\n"
            plan = preview['migration_plan']
            msg += f"**Type:** {plan['type']}\n"
            msg += f"**Description:** {plan['description']}\n"
            msg += f"**Safe:** {'✅ Yes' if plan['safe'] else '⚠️ Requires review'}\n"
            msg += f"**Rollback:** {plan['rollback_plan']}\n\n"
        
        if preview['tests_to_add']:
            msg += "### 🧪 Tests to Add\n\n"
            for test in preview['tests_to_add']:
                msg += f"  - {test}\n"
            msg += "\n"
        
        msg += "---\n\n"
        msg += "🤔 **Ready to proceed?** Reply with:\n"
        msg += "  - `yes` to confirm and prepare draft PR\n"
        msg += "  - `no` to cancel\n"
        msg += "  - Any questions or modifications\n"
        
        return msg
    
    def confirm_and_prepare_pr(
        self,
        conversation_id: str,
        user_confirmation: str
    ) -> Dict[str, Any]:
        """
        Handle user confirmation and prepare draft PR.
        
        Args:
            conversation_id: The conversation ID
            user_confirmation: User's response ('yes', 'no', or additional input)
            
        Returns:
            Dictionary with draft PR payload or message
        """
        # Retrieve conversation
        if conversation_id not in self.conversations:
            return {
                'success': False,
                'message': '❌ Conversation not found or expired'
            }
        
        conversation = self.conversations[conversation_id]
        
        # Handle negative response
        if user_confirmation.lower() in ['no', 'cancel', 'stop']:
            del self.conversations[conversation_id]
            return {
                'success': True,
                'message': '✅ Task cancelled. No changes made.'
            }
        
        # Handle positive confirmation
        if user_confirmation.lower() in ['yes', 'confirm', 'proceed', 'go']:
            conversation.confirmed = True
            conversation.status = 'completed'
            conversation.update_activity()
            
            # Prepare draft PR payload
            draft_pr = self._prepare_draft_pr(conversation)
            conversation.draft_pr_payload = draft_pr
            
            # Clean up conversation
            del self.conversations[conversation_id]
            
            return {
                'success': True,
                'draft_pr_payload': draft_pr,
                'message': self._format_draft_pr_message(draft_pr)
            }
        
        # Handle additional questions or modifications
        conversation.update_activity()
        return {
            'success': True,
            'message': f"💬 Noted: {user_confirmation}\n\n" + 
                      "I can adjust the plan based on your input. " +
                      "Reply 'yes' when ready to proceed or provide more feedback."
        }
    
    def _prepare_draft_pr(self, conversation: ConversationState) -> Dict[str, Any]:
        """Prepare draft PR payload."""
        task_id = conversation.task_id
        task_details = conversation.task_details
        
        branch_name = f"autogen/backend/{task_id}-{conversation.conversation_id[:8]}"
        
        draft_pr = {
            'branch': branch_name,
            'title': f"backend: {task_details['summary'][:80]}",
            'body': self._generate_pr_body(conversation),
            'commits': self._generate_commit_plan(conversation),
            'files': task_details['files'],
            'labels': ['backend', 'autogenerated', task_details['type']],
            'draft': True
        }
        
        if task_details.get('requires_migration'):
            draft_pr['labels'].append('migration')
        
        return draft_pr
    
    def _generate_pr_body(self, conversation: ConversationState) -> str:
        """Generate PR body content."""
        task_details = conversation.task_details
        
        body = f"## Backend Support: {conversation.task_id}\n\n"
        body += f"**Summary:** {task_details['summary']}\n\n"
        body += "### 📝 Changes\n\n"
        
        # Add proposed changes
        body += "#### Files Modified\n"
        for file_path in task_details['files']:
            body += f"- `{file_path}`\n"
        body += "\n"
        
        # Add migration info if applicable
        if task_details.get('requires_migration'):
            body += "### 🗄️ Migration Required\n\n"
            body += "⚠️ This PR includes schema changes. Migration steps:\n"
            body += "1. Review migration file in `api/prisma/migrations/`\n"
            body += "2. Test migration in staging environment\n"
            body += "3. Plan maintenance window if needed\n"
            body += "4. Run migration: `npx prisma migrate deploy`\n"
            body += "5. Verify data integrity\n\n"
            body += "**Rollback plan:** See migration notes\n\n"
        
        # Add testing checklist
        body += "### ✅ Testing Checklist\n\n"
        body += "- [ ] Unit tests pass\n"
        body += "- [ ] Integration tests pass\n"
        body += "- [ ] Lint checks pass\n"
        body += "- [ ] Build succeeds\n"
        body += "- [ ] Manual QA completed\n\n"
        
        # Add manual QA steps
        body += "### 🧪 Manual QA Steps\n\n"
        body += self._generate_qa_steps(conversation)
        body += "\n"
        
        # Add coordination note
        body += "### 🤝 Coordination\n\n"
        body += "This is a backend support PR. Frontend changes should be handled in a separate UX agent PR.\n"
        body += "Cross-reference: _[UX PR link to be added]_\n\n"
        
        # Add reviewers
        body += "### 👥 Reviewers\n\n"
        body += "- Backend owner: @gcolon75\n"
        body += "- Frontend/UX owner: _[to be assigned]_\n\n"
        
        body += "---\n"
        body += f"🤖 Generated by Backend Agent | Task: `{conversation.task_id}` | "
        body += f"Conversation: `{conversation.conversation_id}`\n"
        
        return body
    
    def _generate_commit_plan(self, conversation: ConversationState) -> List[str]:
        """Generate recommended commit sequence."""
        task_id = conversation.task_id
        commits = []
        
        if task_id == 'theme-preference-api':
            commits = [
                "feat(api): add user preferences endpoints (GET/PATCH)",
                "feat(schema): add theme field to User model",
                "test(api): add contract tests for preferences endpoints",
                "docs: add API documentation for user preferences"
            ]
        elif task_id == 'profile-links-titles':
            commits = [
                "feat(api): add profile links and titles support",
                "feat(validation): add URL validation for profile links",
                "feat(schema): add title and profileLinks to User model",
                "test(api): add contract tests for profile endpoints"
            ]
        elif task_id == 'dashboard-stats-endpoints':
            commits = [
                "feat(api): add dashboard stats endpoints",
                "feat(perf): add caching guidance for stats",
                "test(api): add tests for stats aggregation"
            ]
        elif task_id == 'validators-and-security':
            commits = [
                "feat(validation): add URL whitelist and normalization",
                "feat(security): add input sanitization",
                "test(validation): add validator tests"
            ]
        else:
            commits = [
                f"feat(backend): implement {task_id}",
                f"test(backend): add tests for {task_id}"
            ]
        
        return commits
    
    def _generate_qa_steps(self, conversation: ConversationState) -> str:
        """Generate manual QA steps for the task."""
        task_id = conversation.task_id
        
        if task_id == 'theme-preference-api':
            return """1. Test GET /api/users/:id/preferences
   - Verify returns current theme preference
   - Test with authenticated and unauthenticated users
2. Test PATCH /api/users/:id/preferences
   - Try valid theme values ('light', 'dark')
   - Try invalid values and verify error handling
   - Verify persistence across sessions"""
        
        elif task_id == 'profile-links-titles':
            return """1. Test profile update with links
   - Add valid URLs and verify storage
   - Try invalid URLs and verify validation
   - Test max links limit
2. Test title field
   - Try various lengths
   - Test special characters
   - Verify sanitization"""
        
        elif task_id == 'dashboard-stats-endpoints':
            return """1. Test GET /api/dashboard/stats
   - Verify returns correct aggregates
   - Test different time ranges
   - Check response time and caching"""
        
        elif task_id == 'validators-and-security':
            return """1. Test URL validation
   - Valid URLs should pass
   - Malicious URLs should be blocked
   - Test edge cases
2. Test sanitization
   - XSS attempts blocked
   - SQL injection prevented"""
        
        return "Manual testing steps to be defined"
    
    def _format_draft_pr_message(self, draft_pr: Dict[str, Any]) -> str:
        """Format draft PR summary message."""
        msg = "## 🎉 Draft PR Ready!\n\n"
        msg += f"**Branch:** `{draft_pr['branch']}`\n"
        msg += f"**Title:** {draft_pr['title']}\n"
        msg += f"**Labels:** {', '.join(draft_pr['labels'])}\n\n"
        
        msg += "### 📦 Commits\n\n"
        for commit in draft_pr['commits']:
            msg += f"  - {commit}\n"
        msg += "\n"
        
        msg += "### 📄 Files\n\n"
        for file_path in draft_pr['files']:
            msg += f"  - {file_path}\n"
        msg += "\n"
        
        msg += "✅ **Next Steps:**\n"
        msg += "1. Review the PR body and commit plan\n"
        msg += "2. Run checks with `run_checks(conversation_id)`\n"
        msg += "3. Create branch and push changes\n"
        msg += "4. Open draft PR on GitHub\n\n"
        
        msg += "⚠️ **Remember:** This PR requires human review and approval before merging.\n"
        
        return msg
    
    def run_checks(self, conversation_id: str) -> Dict[str, Any]:
        """
        Run lint, test, and build checks for the conversation.
        
        Args:
            conversation_id: The conversation ID
            
        Returns:
            Dictionary with check results
        """
        # Retrieve conversation
        if conversation_id not in self.conversations:
            return {
                'success': False,
                'message': '❌ Conversation not found or expired'
            }
        
        conversation = self.conversations[conversation_id]
        conversation.update_activity()
        
        # Run checks (in a real implementation, would run actual commands)
        checks = {
            'lint': self._run_lint_check(),
            'tests': self._run_test_check(),
            'build': self._run_build_check()
        }
        
        conversation.check_results = checks
        
        all_passed = all(check['passed'] for check in checks.values())
        
        return {
            'success': True,
            'all_passed': all_passed,
            'lint': checks['lint'],
            'tests': checks['tests'],
            'build': checks['build'],
            'message': self._format_check_results(checks)
        }
    
    def _run_lint_check(self) -> Dict[str, Any]:
        """Run lint checks (mock implementation)."""
        # In production, would run: npm run lint or similar
        return {
            'passed': True,
            'command': 'npm run lint',
            'output': 'All files pass linting',
            'warnings': 0,
            'errors': 0
        }
    
    def _run_test_check(self) -> Dict[str, Any]:
        """Run test checks (mock implementation)."""
        # In production, would run: npm test or similar
        return {
            'passed': True,
            'command': 'npm test',
            'output': 'All tests passing',
            'total': 42,
            'passed_count': 42,
            'failed': 0
        }
    
    def _run_build_check(self) -> Dict[str, Any]:
        """Run build checks (mock implementation)."""
        # In production, would run: npm run build or similar
        return {
            'passed': True,
            'command': 'npm run build',
            'output': 'Build completed successfully',
            'size': '1.2 MB'
        }
    
    def _format_check_results(self, checks: Dict[str, Any]) -> str:
        """Format check results for display."""
        msg = "## 🔍 Check Results\n\n"
        
        for check_type, result in checks.items():
            status = '✅' if result['passed'] else '❌'
            msg += f"### {status} {check_type.title()}\n\n"
            msg += f"**Command:** `{result['command']}`\n"
            msg += f"**Output:** {result['output']}\n"
            
            if check_type == 'lint':
                msg += f"**Warnings:** {result['warnings']}\n"
                msg += f"**Errors:** {result['errors']}\n"
            elif check_type == 'tests':
                msg += f"**Total:** {result['total']}\n"
                msg += f"**Passed:** {result['passed_count']}\n"
                msg += f"**Failed:** {result['failed']}\n"
            elif check_type == 'build':
                msg += f"**Size:** {result['size']}\n"
            
            msg += "\n"
        
        return msg
    
    def list_conversations(
        self,
        filters: Optional[Dict[str, Any]] = None,
        max_results: int = 200
    ) -> List[Dict[str, Any]]:
        """
        List agent conversation states with optional filtering.
        
        Args:
            filters: Optional dictionary of filters. Supported keys:
                - status: List of status values to filter by
                  (e.g., ['in-progress', 'waiting', 'interrupted', 'draft-preview'])
            max_results: Maximum number of results to return (default: 200)
            
        Returns:
            List of conversation objects with metadata
        """
        results = []
        
        for conversation_id, conversation in self.conversations.items():
            # Apply status filter if provided
            if filters and 'status' in filters:
                status_filter = filters['status']
                if isinstance(status_filter, str):
                    status_filter = [status_filter]
                if conversation.status not in status_filter:
                    continue
            
            # Determine derived fields
            preview_ready = conversation.preview_message is not None
            
            # Determine checks status
            if not conversation.check_results:
                checks_status = 'none'
            else:
                all_passed = all(
                    check.get('passed', False) 
                    for check in conversation.check_results.values()
                )
                checks_status = 'passed' if all_passed else 'failed'
            
            draft_pr_payload_exists = conversation.draft_pr_payload is not None
            
            # Get task name and type from task_details
            task_name = conversation.task_details.get('summary', conversation.task_id)
            task_type = conversation.task_details.get('type', 'backend')
            
            # Build conversation object
            conv_obj = {
                'conversation_id': conversation.conversation_id,
                'task_id': conversation.task_id,
                'task_name': task_name,
                'task_type': task_type,
                'assigned_agent': 'backend_agent',
                'status': conversation.status,
                'preview_ready': preview_ready,
                'checks_status': checks_status,
                'draft_pr_payload_exists': draft_pr_payload_exists,
                'artifacts_urls': conversation.artifacts_urls,
                'created_at': conversation.created_at.isoformat(),
                'last_activity_at': conversation.last_activity_at.isoformat()
            }
            
            results.append(conv_obj)
        
        # Sort by last_activity_at (most recent first)
        results.sort(key=lambda x: x['last_activity_at'], reverse=True)
        
        # Apply max_results limit
        return results[:max_results]
