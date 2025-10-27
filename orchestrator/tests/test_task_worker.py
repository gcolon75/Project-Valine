"""Tests for Task Worker."""

import unittest
import json
import uuid
import tempfile
import shutil
from pathlib import Path
from datetime import datetime


class TestTaskWorker(unittest.TestCase):
    """Test cases for TaskWorker."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Create temporary evidence directory
        self.temp_dir = tempfile.mkdtemp()
        
        # Import after setting up temp dir
        from app.workers.task_worker import TaskWorker
        self.worker = TaskWorker(evidence_dir=self.temp_dir)
    
    def tearDown(self):
        """Clean up test fixtures."""
        # Remove temporary directory
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def _create_valid_task(self, **overrides) -> dict:
        """Helper to create a valid task with optional overrides."""
        task = {
            'task_id': str(uuid.uuid4()),
            'task_type': 'ux_update',
            'requested_by': {
                'user_id': 'test_user',
                'role': 'pm'
            },
            'parameters': {
                'dry_run': True,
                'target_section': 'header',
                'updates': {
                    'text': 'Test Title'
                }
            }
        }
        task.update(overrides)
        return task
    
    def test_validate_task_valid(self):
        """Test validation of valid task."""
        task = self._create_valid_task()
        result = self.worker.validate_task(task)
        
        self.assertTrue(result['valid'])
        self.assertEqual(result['message'], 'Task validation successful')
    
    def test_validate_task_missing_fields(self):
        """Test validation fails for missing required fields."""
        task = {
            'task_id': str(uuid.uuid4()),
            'task_type': 'ux_update'
            # Missing requested_by and parameters
        }
        result = self.worker.validate_task(task)
        
        self.assertFalse(result['valid'])
        self.assertEqual(result['error'], 'missing_fields')
        self.assertIn('requested_by', result['message'])
    
    def test_validate_task_invalid_task_id(self):
        """Test validation fails for invalid task_id format."""
        task = self._create_valid_task()
        task['task_id'] = 'not-a-uuid'
        result = self.worker.validate_task(task)
        
        self.assertFalse(result['valid'])
        self.assertEqual(result['error'], 'invalid_task_id')
    
    def test_validate_task_invalid_task_type(self):
        """Test validation fails for invalid task_type."""
        task = self._create_valid_task()
        task['task_type'] = 'invalid_type'
        result = self.worker.validate_task(task)
        
        self.assertFalse(result['valid'])
        self.assertEqual(result['error'], 'invalid_task_type')
    
    def test_validate_task_invalid_role(self):
        """Test validation fails for invalid role."""
        task = self._create_valid_task()
        task['requested_by']['role'] = 'invalid_role'
        result = self.worker.validate_task(task)
        
        self.assertFalse(result['valid'])
        self.assertEqual(result['error'], 'invalid_role')
    
    def test_validate_task_insufficient_permissions(self):
        """Test validation fails when role lacks permissions."""
        task = self._create_valid_task()
        task['task_type'] = 'infrastructure'
        task['requested_by']['role'] = 'developer'  # developers can't do infrastructure
        result = self.worker.validate_task(task)
        
        self.assertFalse(result['valid'])
        self.assertEqual(result['error'], 'insufficient_permissions')
    
    def test_role_permissions_admin(self):
        """Test admin can execute all task types."""
        for task_type in ['ux_update', 'code_change', 'documentation', 'infrastructure']:
            task = self._create_valid_task()
            task['task_type'] = task_type
            task['requested_by']['role'] = 'admin'
            result = self.worker.validate_task(task)
            
            self.assertTrue(result['valid'], f'Admin should be able to execute {task_type}')
    
    def test_role_permissions_pm(self):
        """Test PM can execute most task types except infrastructure."""
        allowed_types = ['ux_update', 'code_change', 'documentation']
        for task_type in allowed_types:
            task = self._create_valid_task()
            task['task_type'] = task_type
            task['requested_by']['role'] = 'pm'
            result = self.worker.validate_task(task)
            
            self.assertTrue(result['valid'], f'PM should be able to execute {task_type}')
        
        # PM cannot do infrastructure
        task = self._create_valid_task()
        task['task_type'] = 'infrastructure'
        task['requested_by']['role'] = 'pm'
        result = self.worker.validate_task(task)
        
        self.assertFalse(result['valid'])
    
    def test_role_permissions_developer(self):
        """Test developer has limited permissions."""
        allowed_types = ['ux_update', 'documentation']
        for task_type in allowed_types:
            task = self._create_valid_task()
            task['task_type'] = task_type
            task['requested_by']['role'] = 'developer'
            result = self.worker.validate_task(task)
            
            self.assertTrue(result['valid'], f'Developer should be able to execute {task_type}')
        
        # Developer cannot do code_change or infrastructure
        for denied_type in ['code_change', 'infrastructure']:
            task = self._create_valid_task()
            task['task_type'] = denied_type
            task['requested_by']['role'] = 'developer'
            result = self.worker.validate_task(task)
            
            self.assertFalse(result['valid'], f'Developer should NOT be able to execute {denied_type}')
    
    def test_role_permissions_contributor(self):
        """Test contributor cannot execute any task types."""
        for task_type in ['ux_update', 'code_change', 'documentation', 'infrastructure']:
            task = self._create_valid_task()
            task['task_type'] = task_type
            task['requested_by']['role'] = 'contributor'
            result = self.worker.validate_task(task)
            
            self.assertFalse(result['valid'], f'Contributor should NOT be able to execute {task_type}')
    
    def test_process_task_dry_run_success(self):
        """Test processing task in dry run mode."""
        task = self._create_valid_task()
        result = self.worker.process_task(task)
        
        self.assertTrue(result['success'])
        self.assertEqual(result['status'], 'awaiting_confirmation')
        self.assertIn('preview', result)
        self.assertIn('proposed_changes', result)
        self.assertEqual(result['task_id'], task['task_id'])
    
    def test_process_task_validation_failure(self):
        """Test processing invalid task."""
        task = self._create_valid_task()
        task['task_id'] = 'invalid'
        result = self.worker.process_task(task)
        
        self.assertFalse(result['success'])
        self.assertEqual(result['status'], 'failed')
        self.assertIn('error', result)
    
    def test_process_task_creates_evidence_files(self):
        """Test that processing creates evidence files."""
        task = self._create_valid_task()
        result = self.worker.process_task(task)
        
        self.assertTrue(result['success'])
        
        # Check task evidence file exists
        task_file = Path(self.temp_dir) / f'task-{task["task_id"]}.json'
        self.assertTrue(task_file.exists())
        
        # Check preview evidence file exists
        preview_file = Path(self.temp_dir) / f'preview-{task["task_id"]}.md'
        self.assertTrue(preview_file.exists())
        
        # Verify task file content
        with open(task_file, 'r') as f:
            saved_task = json.load(f)
            self.assertEqual(saved_task['task_id'], task['task_id'])
            self.assertEqual(saved_task['status'], 'awaiting_confirmation')
            self.assertIn('proposed_changes', saved_task)
            self.assertIn('created_at', saved_task)
            self.assertIn('updated_at', saved_task)
    
    def test_process_task_adds_timestamps(self):
        """Test that processing adds timestamps to task."""
        task = self._create_valid_task()
        # Don't include timestamps in initial task
        result = self.worker.process_task(task)
        
        self.assertTrue(result['success'])
        
        # Load saved task and check timestamps
        task_file = Path(self.temp_dir) / f'task-{task["task_id"]}.json'
        with open(task_file, 'r') as f:
            saved_task = json.load(f)
            self.assertIn('created_at', saved_task)
            self.assertIn('updated_at', saved_task)
            
            # Verify timestamp format
            datetime.fromisoformat(saved_task['created_at'].replace('Z', '+00:00'))
            datetime.fromisoformat(saved_task['updated_at'].replace('Z', '+00:00'))
    
    def test_generate_ux_preview_with_structured_updates(self):
        """Test UX preview generation with structured updates."""
        task = self._create_valid_task()
        result = self.worker._generate_ux_preview(task)
        
        self.assertTrue(result['success'])
        self.assertIn('preview_message', result)
        self.assertIn('proposed_changes', result)
        self.assertGreater(len(result['proposed_changes']), 0)
        
        # Check preview message content
        preview = result['preview_message']
        self.assertIn('UX Update Preview', preview)
        self.assertIn(task['task_id'], preview)
        self.assertIn('header', preview)
        self.assertIn('Test Title', preview)
    
    def test_generate_ux_preview_with_plain_text(self):
        """Test UX preview generation with plain text description."""
        task = self._create_valid_task()
        task['parameters'] = {
            'dry_run': True,
            'plain_text': 'Make the dashboard header match the profile page'
        }
        result = self.worker._generate_ux_preview(task)
        
        self.assertTrue(result['success'])
        self.assertIn('preview_message', result)
        self.assertIn('proposed_changes', result)
        
        # Check preview includes plain text
        preview = result['preview_message']
        self.assertIn('Make the dashboard header', preview)
    
    def test_generate_preview_unsupported_task_type(self):
        """Test preview generation for unsupported task type."""
        task = self._create_valid_task()
        task['task_type'] = 'infrastructure'
        task['requested_by']['role'] = 'admin'  # Valid role for infrastructure
        result = self.worker._generate_preview(task)
        
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], 'unsupported_task_type')
    
    def test_evidence_dir_creation(self):
        """Test that evidence directory is created if it doesn't exist."""
        # Create worker with non-existent directory
        new_temp_dir = tempfile.mkdtemp()
        shutil.rmtree(new_temp_dir)  # Remove it
        evidence_path = Path(new_temp_dir) / 'evidence'
        
        from app.workers.task_worker import TaskWorker
        worker = TaskWorker(evidence_dir=str(evidence_path))
        
        # Directory should be created
        self.assertTrue(evidence_path.exists())
        
        # Clean up
        shutil.rmtree(new_temp_dir, ignore_errors=True)
    
    def test_proposed_changes_structure(self):
        """Test that proposed changes have correct structure."""
        task = self._create_valid_task()
        result = self.worker.process_task(task)
        
        self.assertTrue(result['success'])
        self.assertIn('proposed_changes', result)
        
        for change in result['proposed_changes']:
            self.assertIn('file', change)
            self.assertIn('diff', change)
            self.assertIn('description', change)


if __name__ == '__main__':
    unittest.main()
