"""
DynamoDB service for storing and retrieving orchestrator run state.
"""
import os
import time
import json
import boto3
from decimal import Decimal


class DecimalEncoder(json.JSONEncoder):
    """Helper class to convert Decimal to int/float for JSON serialization."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)


class RunStore:
    """Service for managing orchestrator run state in DynamoDB."""
    
    def __init__(self, table_name=None):
        """Initialize RunStore with DynamoDB table."""
        self.table_name = table_name or os.environ.get('RUN_TABLE_NAME')
        if not self.table_name:
            raise ValueError('DynamoDB table name is required')
        
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table(self.table_name)
    
    def create_run(self, run_id, plan_data, discord_thread_id=None, github_issues=None):
        """
        Create a new orchestrator run.
        
        Args:
            run_id: Unique run identifier
            plan_data: Dictionary containing plan information
            discord_thread_id: Optional Discord thread ID
            github_issues: Optional list of GitHub issue numbers
        
        Returns:
            Created run item
        """
        now = int(time.time())
        item = {
            'run_id': run_id,
            'created_at': now,
            'updated_at': now,
            'status': 'pending',
            'plan_data': plan_data,
            'discord_thread_id': discord_thread_id,
            'github_issues': github_issues or [],
            'completed_tasks': [],
            'failed_tasks': []
        }
        
        try:
            self.table.put_item(Item=item)
            print(f'Run created: {run_id}')
            return item
        except Exception as e:
            print(f'Error creating run {run_id}: {str(e)}')
            return None
    
    def get_run(self, run_id):
        """
        Get a run by ID.
        
        Args:
            run_id: Run identifier
        
        Returns:
            Run item if found, None otherwise
        """
        try:
            response = self.table.get_item(Key={'run_id': run_id})
            item = response.get('Item')
            if item:
                # Convert Decimal types for easier handling
                return json.loads(json.dumps(item, cls=DecimalEncoder))
            return None
        except Exception as e:
            print(f'Error getting run {run_id}: {str(e)}')
            return None
    
    def update_run_status(self, run_id, status, message=None):
        """
        Update the status of a run.
        
        Args:
            run_id: Run identifier
            status: New status ('pending', 'in_progress', 'completed', 'failed')
            message: Optional status message
        
        Returns:
            True if successful, False otherwise
        """
        now = int(time.time())
        update_expr = 'SET #status = :status, updated_at = :updated_at'
        expr_values = {
            ':status': status,
            ':updated_at': now
        }
        expr_names = {'#status': 'status'}
        
        if message:
            update_expr += ', status_message = :message'
            expr_values[':message'] = message
        
        try:
            self.table.update_item(
                Key={'run_id': run_id},
                UpdateExpression=update_expr,
                ExpressionAttributeValues=expr_values,
                ExpressionAttributeNames=expr_names
            )
            print(f'Run {run_id} status updated to {status}')
            return True
        except Exception as e:
            print(f'Error updating run {run_id} status: {str(e)}')
            return False
    
    def add_completed_task(self, run_id, task_info):
        """
        Add a completed task to a run.
        
        Args:
            run_id: Run identifier
            task_info: Dictionary with task information
        
        Returns:
            True if successful, False otherwise
        """
        now = int(time.time())
        try:
            self.table.update_item(
                Key={'run_id': run_id},
                UpdateExpression='SET updated_at = :updated_at, completed_tasks = list_append(if_not_exists(completed_tasks, :empty_list), :task)',
                ExpressionAttributeValues={
                    ':updated_at': now,
                    ':task': [task_info],
                    ':empty_list': []
                }
            )
            print(f'Task added to run {run_id}: {task_info}')
            return True
        except Exception as e:
            print(f'Error adding completed task to run {run_id}: {str(e)}')
            return False
    
    def add_failed_task(self, run_id, task_info):
        """
        Add a failed task to a run.
        
        Args:
            run_id: Run identifier
            task_info: Dictionary with task information (should include error details)
        
        Returns:
            True if successful, False otherwise
        """
        now = int(time.time())
        try:
            self.table.update_item(
                Key={'run_id': run_id},
                UpdateExpression='SET updated_at = :updated_at, failed_tasks = list_append(if_not_exists(failed_tasks, :empty_list), :task)',
                ExpressionAttributeValues={
                    ':updated_at': now,
                    ':task': [task_info],
                    ':empty_list': []
                }
            )
            print(f'Failed task added to run {run_id}: {task_info}')
            return True
        except Exception as e:
            print(f'Error adding failed task to run {run_id}: {str(e)}')
            return False
    
    def get_active_runs(self, limit=10):
        """
        Get active runs (pending or in_progress status).
        
        Args:
            limit: Maximum number of runs to return
        
        Returns:
            List of active run items
        """
        try:
            # Scan for active runs (in production, consider using a GSI for better performance)
            response = self.table.scan(
                FilterExpression='#status IN (:pending, :in_progress)',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':pending': 'pending',
                    ':in_progress': 'in_progress'
                },
                Limit=limit
            )
            items = response.get('Items', [])
            return json.loads(json.dumps(items, cls=DecimalEncoder))
        except Exception as e:
            print(f'Error getting active runs: {str(e)}')
            return []
    
    def get_recent_runs(self, limit=10):
        """
        Get recent runs ordered by creation time.
        
        Args:
            limit: Maximum number of runs to return
        
        Returns:
            List of recent run items
        """
        try:
            response = self.table.scan(Limit=limit)
            items = response.get('Items', [])
            # Sort by created_at descending
            items.sort(key=lambda x: x.get('created_at', 0), reverse=True)
            return json.loads(json.dumps(items[:limit], cls=DecimalEncoder))
        except Exception as e:
            print(f'Error getting recent runs: {str(e)}')
            return []
