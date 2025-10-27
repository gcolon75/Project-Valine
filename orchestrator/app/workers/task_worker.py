"""
Task Worker for Agent-as-Employee Workflow.

This module implements the core task processing logic for the agents-as-employees
workflow. It validates task requests, generates previews, and coordinates with
other services to apply changes.

Key responsibilities:
- Validate task structure and permissions
- Generate dry-run previews of proposed changes
- Coordinate with UX Agent, LLM parser, and other agents
- Persist task state and evidence
- Create draft PRs after confirmation
"""

import json
import os
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from pathlib import Path


class TaskWorker:
    """
    Worker that processes agent task requests.
    
    Follows the lifecycle: proposed → awaiting_confirmation → in_progress → completed/failed
    """
    
    # Role permissions mapping
    ROLE_PERMISSIONS = {
        'admin': ['ux_update', 'code_change', 'documentation', 'infrastructure'],
        'pm': ['ux_update', 'code_change', 'documentation'],
        'developer': ['ux_update', 'documentation'],
        'contributor': []  # Contributors can propose but not execute
    }
    
    def __init__(self, evidence_dir: Optional[str] = None):
        """
        Initialize the task worker.
        
        Args:
            evidence_dir: Directory to store task evidence files
        """
        self.evidence_dir = evidence_dir or self._get_default_evidence_dir()
        self._ensure_evidence_dir()
    
    def _get_default_evidence_dir(self) -> str:
        """Get default evidence directory path."""
        # Use orchestrator/evidence in production, /tmp in tests
        base_dir = Path(__file__).parent.parent.parent
        return str(base_dir / 'evidence')
    
    def _ensure_evidence_dir(self):
        """Ensure evidence directory exists."""
        Path(self.evidence_dir).mkdir(parents=True, exist_ok=True)
    
    def validate_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate task structure and permissions.
        
        Args:
            task: Task dictionary following agent-task-schema
            
        Returns:
            Dictionary with validation result
        """
        # Check required fields
        required_fields = ['task_id', 'task_type', 'requested_by', 'parameters']
        missing_fields = [f for f in required_fields if f not in task]
        
        if missing_fields:
            return {
                'valid': False,
                'error': 'missing_fields',
                'message': f'Missing required fields: {", ".join(missing_fields)}'
            }
        
        # Validate task_id format (UUID v4)
        try:
            uuid.UUID(task['task_id'], version=4)
        except (ValueError, AttributeError):
            return {
                'valid': False,
                'error': 'invalid_task_id',
                'message': f'Invalid task_id format: {task.get("task_id")}. Must be UUID v4.'
            }
        
        # Validate task_type
        valid_task_types = ['ux_update', 'code_change', 'documentation', 'infrastructure']
        if task['task_type'] not in valid_task_types:
            return {
                'valid': False,
                'error': 'invalid_task_type',
                'message': f'Invalid task_type: {task["task_type"]}. Must be one of: {valid_task_types}'
            }
        
        # Validate requested_by structure
        requested_by = task.get('requested_by', {})
        if not isinstance(requested_by, dict) or 'role' not in requested_by:
            return {
                'valid': False,
                'error': 'invalid_requested_by',
                'message': 'requested_by must include role field'
            }
        
        # Check role permissions
        role = requested_by['role']
        task_type = task['task_type']
        
        if role not in self.ROLE_PERMISSIONS:
            return {
                'valid': False,
                'error': 'invalid_role',
                'message': f'Invalid role: {role}'
            }
        
        allowed_types = self.ROLE_PERMISSIONS[role]
        if task_type not in allowed_types:
            return {
                'valid': False,
                'error': 'insufficient_permissions',
                'message': f'Role {role} cannot execute {task_type}. Allowed: {allowed_types}'
            }
        
        return {
            'valid': True,
            'message': 'Task validation successful'
        }
    
    def process_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a task request.
        
        This is the main entry point for task processing. It validates the task,
        generates previews (if dry_run), and sets up for confirmation.
        
        Args:
            task: Task dictionary following agent-task-schema
            
        Returns:
            Dictionary with processing result
        """
        # Validate task
        validation = self.validate_task(task)
        if not validation['valid']:
            return {
                'success': False,
                'status': 'failed',
                'error': validation['error'],
                'message': validation['message']
            }
        
        # Set timestamps
        if 'created_at' not in task:
            task['created_at'] = datetime.now(timezone.utc).isoformat()
        task['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # Check if this is a dry run (default: true)
        dry_run = task.get('parameters', {}).get('dry_run', True)
        
        if dry_run:
            # Generate preview and proposed changes
            result = self._generate_preview(task)
            
            if result['success']:
                # Update task with proposed changes
                task['proposed_changes'] = result['proposed_changes']
                task['status'] = 'awaiting_confirmation'
                
                # Save evidence
                self._save_task_evidence(task)
                self._save_preview_evidence(task, result['preview_message'])
                
                return {
                    'success': True,
                    'status': 'awaiting_confirmation',
                    'task_id': task['task_id'],
                    'conversation_id': task.get('conversation_id'),
                    'preview': result['preview_message'],
                    'proposed_changes': result['proposed_changes'],
                    'message': result['preview_message']
                }
            else:
                task['status'] = 'failed'
                task['error'] = {
                    'code': result.get('error', 'preview_generation_failed'),
                    'message': result.get('message', 'Failed to generate preview')
                }
                self._save_task_evidence(task)
                return result
        else:
            # Non-dry-run execution (should only happen after confirmation)
            # This is a placeholder for now
            task['status'] = 'in_progress'
            self._save_task_evidence(task)
            
            return {
                'success': True,
                'status': 'in_progress',
                'task_id': task['task_id'],
                'message': 'Task execution started (placeholder)'
            }
    
    def _generate_preview(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate preview of proposed changes.
        
        This is a placeholder implementation. In production, this would:
        - Parse intent (structured or via LLM)
        - Analyze target files
        - Generate diffs
        - Create preview message
        
        Args:
            task: Task dictionary
            
        Returns:
            Dictionary with preview result
        """
        task_type = task['task_type']
        
        if task_type == 'ux_update':
            return self._generate_ux_preview(task)
        else:
            return {
                'success': False,
                'error': 'unsupported_task_type',
                'message': f'Task type {task_type} preview not yet implemented'
            }
    
    def _generate_ux_preview(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate preview for UX update task.
        
        Args:
            task: Task dictionary
            
        Returns:
            Dictionary with preview details
        """
        params = task.get('parameters', {})
        
        # Build preview message
        preview_lines = [
            '🎨 **UX Update Preview**',
            '',
            f'**Task ID:** `{task["task_id"]}`',
            ''
        ]
        
        # Generate placeholder proposed changes
        proposed_changes = []
        
        if params.get('target_section'):
            section = params['target_section']
            updates = params.get('updates', {})
            
            preview_lines.append(f'**Section:** `{section}`')
            preview_lines.append('**Changes:**')
            
            for prop, value in updates.items():
                preview_lines.append(f'  • Update {prop} to: **"{value}"**')
                
                # Create placeholder proposed change
                proposed_changes.append({
                    'file': f'src/components/{section.capitalize()}.jsx',
                    'diff': '(placeholder diff)',
                    'description': f'Update {section} {prop} to "{value}"'
                })
        
        elif params.get('plain_text'):
            preview_lines.append(f'**Description:** {params["plain_text"]}')
            preview_lines.append('')
            preview_lines.append('*Analysis pending - clarification may be needed*')
            
            # For now, return placeholder
            proposed_changes.append({
                'file': '(to be determined)',
                'diff': '(analysis pending)',
                'description': params['plain_text']
            })
        
        preview_lines.extend([
            '',
            '✅ **Ready to proceed?** React with confirmation to create draft PR.',
            '🚫 **Cancel?** React to cancel this request.',
            '💬 **Modify?** Provide updated instructions.'
        ])
        
        preview_message = '\n'.join(preview_lines)
        
        return {
            'success': True,
            'preview_message': preview_message,
            'proposed_changes': proposed_changes
        }
    
    def _save_task_evidence(self, task: Dict[str, Any]):
        """Save task state to evidence file."""
        task_id = task['task_id']
        evidence_file = Path(self.evidence_dir) / f'task-{task_id}.json'
        
        with open(evidence_file, 'w') as f:
            json.dump(task, f, indent=2)
    
    def _save_preview_evidence(self, task: Dict[str, Any], preview_message: str):
        """Save preview to evidence file."""
        task_id = task['task_id']
        preview_file = Path(self.evidence_dir) / f'preview-{task_id}.md'
        
        with open(preview_file, 'w') as f:
            f.write(preview_message)
        
        # Update task with evidence path
        if 'evidence' not in task:
            task['evidence'] = {}
        task['evidence']['preview_file'] = str(preview_file)
