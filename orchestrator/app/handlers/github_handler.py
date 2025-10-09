"""
GitHub webhook handler for Project Valine orchestrator.
Handles events: issues, issue_comment, pull_request, check_suite
"""
import json
import os
import hmac
import hashlib


def verify_github_signature(payload_body, signature_header, secret):
    """Verify GitHub webhook signature."""
    if not signature_header:
        return False
    
    hash_object = hmac.new(
        secret.encode('utf-8'),
        msg=payload_body.encode('utf-8'),
        digestmod=hashlib.sha256
    )
    expected_signature = 'sha256=' + hash_object.hexdigest()
    return hmac.compare_digest(expected_signature, signature_header)


def handle_issues_event(payload):
    """Handle GitHub issues events."""
    action = payload.get('action')
    issue = payload.get('issue', {})
    issue_number = issue.get('number')
    issue_title = issue.get('title')
    
    print(f"Issue event: {action} - #{issue_number}: {issue_title}")
    
    # TODO: Implement issue handling logic
    # - Check if issue has 'ready' label
    # - Add to orchestrator queue if appropriate
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': f'Issue event processed: {action}'})
    }


def handle_issue_comment_event(payload):
    """Handle GitHub issue comment events."""
    action = payload.get('action')
    comment = payload.get('comment', {})
    issue = payload.get('issue', {})
    
    print(f"Issue comment event: {action} on issue #{issue.get('number')}")
    
    # TODO: Implement comment handling logic
    # - Check for special commands in comments
    # - Update orchestrator state based on feedback
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': f'Comment event processed: {action}'})
    }


def handle_pull_request_event(payload):
    """Handle GitHub pull request events."""
    action = payload.get('action')
    pr = payload.get('pull_request', {})
    pr_number = pr.get('number')
    pr_title = pr.get('title')
    
    print(f"PR event: {action} - #{pr_number}: {pr_title}")
    
    # TODO: Implement PR handling logic
    # - Track PR status
    # - Update Discord threads with PR updates
    # - Trigger checks or reviews
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': f'PR event processed: {action}'})
    }


def handle_check_suite_event(payload):
    """Handle GitHub check suite events."""
    action = payload.get('action')
    check_suite = payload.get('check_suite', {})
    status = check_suite.get('status')
    conclusion = check_suite.get('conclusion')
    
    print(f"Check suite event: {action} - status: {status}, conclusion: {conclusion}")
    
    # TODO: Implement check suite handling logic
    # - Monitor CI/CD pipeline status
    # - Update orchestrator state
    # - Notify Discord on failures
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': f'Check suite event processed: {action}'})
    }


def handler(event, context):
    """
    Main Lambda handler for GitHub webhook events.
    
    Verifies GitHub signature and routes events to appropriate handlers.
    """
    try:
        # Get webhook secret from environment
        webhook_secret = os.environ.get('GITHUB_WEBHOOK_SECRET')
        if not webhook_secret:
            return {
                'statusCode': 500,
                'body': json.dumps({'error': 'GitHub webhook secret not configured'})
            }
        
        # Extract signature and body
        signature = event.get('headers', {}).get('x-hub-signature-256')
        body = event.get('body', '')
        
        # Verify signature
        if not verify_github_signature(body, signature, webhook_secret):
            return {
                'statusCode': 401,
                'body': json.dumps({'error': 'Invalid webhook signature'})
            }
        
        # Parse payload
        payload = json.loads(body)
        event_type = event.get('headers', {}).get('x-github-event')
        
        print(f"Received GitHub event: {event_type}")
        
        # Route to appropriate handler
        if event_type == 'issues':
            return handle_issues_event(payload)
        elif event_type == 'issue_comment':
            return handle_issue_comment_event(payload)
        elif event_type == 'pull_request':
            return handle_pull_request_event(payload)
        elif event_type == 'check_suite':
            return handle_check_suite_event(payload)
        else:
            print(f"Unhandled event type: {event_type}")
            return {
                'statusCode': 200,
                'body': json.dumps({'message': f'Event type {event_type} acknowledged but not handled'})
            }
    
    except Exception as e:
        print(f'Error handling GitHub webhook: {str(e)}')
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'})
        }
