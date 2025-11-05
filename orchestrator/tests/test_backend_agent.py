"""
Tests for BackendAgent.
"""
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "app"))

from agents.backend_agent import BackendAgent, ConversationState


class TestConversationState(unittest.TestCase):
    """Test suite for ConversationState."""
    
    def test_init(self):
        """Test ConversationState initialization."""
        state = ConversationState('conv123', 'user456', 'theme-preference-api')
        
        self.assertEqual(state.conversation_id, 'conv123')
        self.assertEqual(state.user_id, 'user456')
        self.assertEqual(state.task_id, 'theme-preference-api')
        self.assertFalse(state.confirmed)
        self.assertFalse(state.needs_clarification)
        self.assertEqual(state.clarification_questions, [])
        self.assertEqual(state.context_files, [])
    
    def test_to_dict(self):
        """Test conversion to dictionary."""
        state = ConversationState('conv123', 'user456', 'theme-preference-api')
        state.confirmed = True
        state.needs_clarification = True
        state.clarification_questions = ['Question 1?']
        
        data = state.to_dict()
        
        self.assertEqual(data['conversation_id'], 'conv123')
        self.assertEqual(data['user_id'], 'user456')
        self.assertEqual(data['task_id'], 'theme-preference-api')
        self.assertTrue(data['confirmed'])
        self.assertTrue(data['needs_clarification'])
        self.assertEqual(data['clarification_questions'], ['Question 1?'])
    
    def test_from_dict(self):
        """Test restoration from dictionary."""
        data = {
            'conversation_id': 'conv123',
            'user_id': 'user456',
            'task_id': 'theme-preference-api',
            'confirmed': True,
            'needs_clarification': False,
            'clarification_questions': [],
            'context_files': ['file1.js'],
            'task_details': {'priority': 'High'},
            'proposed_changes': {'file1.js': ['change1']},
            'check_results': {'lint': {'passed': True}}
        }
        
        state = ConversationState.from_dict(data)
        
        self.assertEqual(state.conversation_id, 'conv123')
        self.assertEqual(state.user_id, 'user456')
        self.assertEqual(state.task_id, 'theme-preference-api')
        self.assertTrue(state.confirmed)
        self.assertEqual(state.context_files, ['file1.js'])
        self.assertEqual(state.task_details, {'priority': 'High'})


class TestBackendAgent(unittest.TestCase):
    """Test suite for BackendAgent."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.agent = BackendAgent(repo="test/repo")
    
    def test_init(self):
        """Test BackendAgent initialization."""
        self.assertEqual(self.agent.repo, "test/repo")
        self.assertEqual(self.agent.owner, "test")
        self.assertEqual(self.agent.repo_name, "repo")
        self.assertIsNone(self.agent.github_service)
        self.assertIsInstance(self.agent.conversations, dict)
    
    def test_init_with_github_service(self):
        """Test BackendAgent initialization with GitHub service."""
        mock_service = Mock()
        agent = BackendAgent(github_service=mock_service, repo="test/repo")
        
        self.assertEqual(agent.github_service, mock_service)
    
    def test_next_tasks_overview(self):
        """Test getting task overview."""
        result = self.agent.next_tasks_overview(user='testuser')
        
        self.assertTrue(result['success'])
        self.assertEqual(result['user'], 'testuser')
        self.assertIn('tasks', result)
        self.assertIsInstance(result['tasks'], list)
        self.assertGreater(len(result['tasks']), 0)
        
        # Check task structure
        task = result['tasks'][0]
        self.assertIn('id', task)
        self.assertIn('priority', task)
        self.assertIn('summary', task)
        self.assertIn('type', task)
        self.assertIn('requires_migration', task)
    
    def test_next_tasks_overview_priority_ordering(self):
        """Test that tasks are ordered by priority."""
        result = self.agent.next_tasks_overview(user='testuser')
        tasks = result['tasks']
        
        # High priority tasks should come first
        high_priority_tasks = [t for t in tasks if t['priority'] == 'High']
        if high_priority_tasks:
            self.assertEqual(tasks[0]['priority'], 'High')
    
    def test_start_task_invalid_id(self):
        """Test starting a task with invalid ID."""
        result = self.agent.start_task(user='testuser', task_id='invalid-task')
        
        self.assertFalse(result['success'])
        self.assertIn('Unknown task ID', result['message'])
        self.assertIn('available_tasks', result)
    
    def test_start_task_valid_id(self):
        """Test starting a task with valid ID."""
        result = self.agent.start_task(user='testuser', task_id='validators-and-security')
        
        self.assertTrue(result['success'])
        self.assertIn('conversation_id', result)
        
        # Should either need clarification or confirmation
        if result.get('needs_clarification'):
            self.assertIn('questions', result)
            self.assertIsInstance(result['questions'], list)
        else:
            self.assertTrue(result.get('needs_confirmation'))
            self.assertIn('preview', result)
    
    def test_start_task_with_clarifications(self):
        """Test starting a task that needs clarifications."""
        result = self.agent.start_task(user='testuser', task_id='theme-preference-api')
        
        self.assertTrue(result['success'])
        self.assertIn('conversation_id', result)
        
        # Theme preference task should ask clarifications
        self.assertTrue(result.get('needs_clarification'))
        self.assertIn('questions', result)
        self.assertGreater(len(result['questions']), 0)
    
    def test_start_task_stores_conversation(self):
        """Test that starting a task stores conversation state."""
        result = self.agent.start_task(user='testuser', task_id='validators-and-security')
        
        conversation_id = result['conversation_id']
        self.assertIn(conversation_id, self.agent.conversations)
        
        conversation = self.agent.conversations[conversation_id]
        self.assertEqual(conversation.user_id, 'testuser')
        self.assertEqual(conversation.task_id, 'validators-and-security')
    
    def test_start_task_with_context_files(self):
        """Test starting a task with context files."""
        context_files = ['file1.js', 'file2.js']
        result = self.agent.start_task(
            user='testuser',
            task_id='validators-and-security',
            context_files=context_files
        )
        
        conversation_id = result['conversation_id']
        conversation = self.agent.conversations[conversation_id]
        self.assertEqual(conversation.context_files, context_files)
    
    def test_confirm_and_prepare_pr_invalid_conversation(self):
        """Test confirming with invalid conversation ID."""
        result = self.agent.confirm_and_prepare_pr(
            conversation_id='invalid-id',
            user_confirmation='yes'
        )
        
        self.assertFalse(result['success'])
        self.assertIn('not found', result['message'])
    
    def test_confirm_and_prepare_pr_cancel(self):
        """Test cancelling a task."""
        # Start a task first
        start_result = self.agent.start_task(user='testuser', task_id='validators-and-security')
        conversation_id = start_result['conversation_id']
        
        # Cancel it
        result = self.agent.confirm_and_prepare_pr(
            conversation_id=conversation_id,
            user_confirmation='no'
        )
        
        self.assertTrue(result['success'])
        self.assertIn('cancelled', result['message'].lower())
        
        # Conversation should be cleaned up
        self.assertNotIn(conversation_id, self.agent.conversations)
    
    def test_confirm_and_prepare_pr_yes(self):
        """Test confirming a task and preparing PR."""
        # Start a task first
        start_result = self.agent.start_task(user='testuser', task_id='validators-and-security')
        conversation_id = start_result['conversation_id']
        
        # Confirm it
        result = self.agent.confirm_and_prepare_pr(
            conversation_id=conversation_id,
            user_confirmation='yes'
        )
        
        self.assertTrue(result['success'])
        self.assertIn('draft_pr_payload', result)
        
        # Check PR payload structure
        pr = result['draft_pr_payload']
        self.assertIn('branch', pr)
        self.assertIn('title', pr)
        self.assertIn('body', pr)
        self.assertIn('commits', pr)
        self.assertIn('files', pr)
        self.assertIn('labels', pr)
        self.assertTrue(pr['draft'])
        
        # Branch should follow naming convention
        self.assertTrue(pr['branch'].startswith('autogen/backend/'))
        
        # Labels should include backend
        self.assertIn('backend', pr['labels'])
        
        # Conversation should be cleaned up
        self.assertNotIn(conversation_id, self.agent.conversations)
    
    def test_confirm_and_prepare_pr_additional_input(self):
        """Test providing additional input instead of yes/no."""
        # Start a task first
        start_result = self.agent.start_task(user='testuser', task_id='validators-and-security')
        conversation_id = start_result['conversation_id']
        
        # Provide additional input
        result = self.agent.confirm_and_prepare_pr(
            conversation_id=conversation_id,
            user_confirmation='Can we also add rate limiting?'
        )
        
        self.assertTrue(result['success'])
        self.assertNotIn('draft_pr_payload', result)
        self.assertIn('Noted', result['message'])
        
        # Conversation should still exist
        self.assertIn(conversation_id, self.agent.conversations)
    
    def test_run_checks_invalid_conversation(self):
        """Test running checks with invalid conversation ID."""
        result = self.agent.run_checks(conversation_id='invalid-id')
        
        self.assertFalse(result['success'])
        self.assertIn('not found', result['message'])
    
    def test_run_checks_success(self):
        """Test running checks successfully."""
        # Start a task first
        start_result = self.agent.start_task(user='testuser', task_id='validators-and-security')
        conversation_id = start_result['conversation_id']
        
        # Run checks
        result = self.agent.run_checks(conversation_id=conversation_id)
        
        self.assertTrue(result['success'])
        self.assertIn('lint', result)
        self.assertIn('tests', result)
        self.assertIn('build', result)
        self.assertIn('all_passed', result)
        
        # Check structure of individual checks
        lint = result['lint']
        self.assertIn('passed', lint)
        self.assertIn('command', lint)
        self.assertIn('output', lint)
        
        tests = result['tests']
        self.assertIn('passed', tests)
        self.assertIn('total', tests)
        
        build = result['build']
        self.assertIn('passed', build)
    
    def test_task_definitions_complete(self):
        """Test that all task definitions are properly structured."""
        for task_id, task_def in BackendAgent.TASK_DEFINITIONS.items():
            self.assertIn('id', task_def)
            self.assertIn('priority', task_def)
            self.assertIn('summary', task_def)
            self.assertIn('files', task_def)
            self.assertIn('type', task_def)
            self.assertIn('requires_migration', task_def)
            
            # Priority should be valid
            self.assertIn(task_def['priority'], ['High', 'Medium', 'Low'])
            
            # Files should be a list
            self.assertIsInstance(task_def['files'], list)
    
    def test_draft_pr_migration_task(self):
        """Test draft PR for a task that requires migration."""
        # Start a task that requires migration
        start_result = self.agent.start_task(user='testuser', task_id='theme-preference-api')
        
        # Skip clarifications for testing - directly prepare PR
        conversation_id = start_result['conversation_id']
        conversation = self.agent.conversations[conversation_id]
        conversation.needs_clarification = False
        
        # Confirm and get PR
        result = self.agent.confirm_and_prepare_pr(
            conversation_id=conversation_id,
            user_confirmation='yes'
        )
        
        self.assertTrue(result['success'])
        pr = result['draft_pr_payload']
        
        # Should have migration label
        self.assertIn('migration', pr['labels'])
        
        # PR body should mention migration
        self.assertIn('Migration', pr['body'])
    
    def test_preview_generation(self):
        """Test that preview generation works for different tasks."""
        for task_id in ['validators-and-security', 'dashboard-stats-endpoints']:
            result = self.agent.start_task(user='testuser', task_id=task_id)
            
            if not result.get('needs_clarification'):
                self.assertIn('preview', result)
                preview = result['preview']
                
                self.assertIn('task_id', preview)
                self.assertIn('summary', preview)
                self.assertIn('proposed_changes', preview)
                self.assertIn('message', preview)
                
                # Message should contain key sections
                self.assertIn('Task Preview', preview['message'])
                self.assertIn('Proposed Changes', preview['message'])


class TestBackendAgentIntegration(unittest.TestCase):
    """Integration tests for BackendAgent workflows."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.agent = BackendAgent(repo="test/repo")
    
    def test_full_workflow_without_clarifications(self):
        """Test complete workflow for a task without clarifications."""
        # 1. Get task overview
        overview = self.agent.next_tasks_overview(user='testuser')
        self.assertTrue(overview['success'])
        
        # 2. Start a task
        start = self.agent.start_task(user='testuser', task_id='validators-and-security')
        self.assertTrue(start['success'])
        conversation_id = start['conversation_id']
        
        # 3. Run checks
        checks = self.agent.run_checks(conversation_id=conversation_id)
        self.assertTrue(checks['success'])
        
        # 4. Confirm and prepare PR
        confirm = self.agent.confirm_and_prepare_pr(
            conversation_id=conversation_id,
            user_confirmation='yes'
        )
        self.assertTrue(confirm['success'])
        self.assertIn('draft_pr_payload', confirm)
    
    def test_full_workflow_with_clarifications(self):
        """Test complete workflow for a task with clarifications."""
        # 1. Start a task that needs clarifications
        start = self.agent.start_task(user='testuser', task_id='theme-preference-api')
        self.assertTrue(start['success'])
        
        if start.get('needs_clarification'):
            # Clarifications needed - this is expected
            self.assertIn('questions', start)
            self.assertGreater(len(start['questions']), 0)


if __name__ == '__main__':
    unittest.main()
