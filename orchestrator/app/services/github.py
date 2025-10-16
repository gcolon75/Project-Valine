"""
GitHub service for interacting with GitHub API.
Provides functions to comment on issues, open PRs, and manage repository operations.
"""
import os
from github import Github, GithubException


class GitHubService:
    """Service for GitHub API interactions."""
    
    def __init__(self, token=None):
        """Initialize GitHub service with access token."""
        self.token = token or os.environ.get('GITHUB_TOKEN')
        if not self.token:
            raise ValueError('GitHub token is required')
        self.client = Github(self.token)
    
    def get_repository(self, repo_name='gcolon75/Project-Valine'):
        """Get a repository object."""
        try:
            return self.client.get_repo(repo_name)
        except GithubException as e:
            print(f'Error getting repository {repo_name}: {str(e)}')
            raise
    
    def get_issues_with_label(self, label='ready', repo_name='gcolon75/Project-Valine', state='open'):
        """
        Get all issues with a specific label.
        
        Args:
            label: Label to filter by
            repo_name: Full repository name (owner/repo)
            state: Issue state ('open', 'closed', 'all')
        
        Returns:
            List of issue objects
        """
        try:
            repo = self.get_repository(repo_name)
            issues = repo.get_issues(state=state, labels=[label])
            return list(issues)
        except GithubException as e:
            print(f'Error fetching issues with label {label}: {str(e)}')
            return []
    
    def comment_on_issue(self, issue_number, comment_body, repo_name='gcolon75/Project-Valine'):
        """
        Add a comment to an issue.
        
        Args:
            issue_number: Issue number
            comment_body: Comment text
            repo_name: Full repository name
        
        Returns:
            Comment object if successful, None otherwise
        """
        try:
            repo = self.get_repository(repo_name)
            issue = repo.get_issue(issue_number)
            comment = issue.create_comment(comment_body)
            print(f'Comment added to issue #{issue_number}')
            return comment
        except GithubException as e:
            print(f'Error commenting on issue #{issue_number}: {str(e)}')
            return None
    
    def create_pull_request(self, title, body, head, base='main', repo_name='gcolon75/Project-Valine'):
        """
        Create a new pull request.
        
        Args:
            title: PR title
            body: PR description
            head: Branch containing changes
            base: Base branch to merge into
            repo_name: Full repository name
        
        Returns:
            PullRequest object if successful, None otherwise
        """
        try:
            repo = self.get_repository(repo_name)
            pr = repo.create_pull(
                title=title,
                body=body,
                head=head,
                base=base
            )
            print(f'Pull request created: #{pr.number}')
            return pr
        except GithubException as e:
            print(f'Error creating pull request: {str(e)}')
            return None
    
    def comment_on_pull_request(self, pr_number, comment_body, repo_name='gcolon75/Project-Valine'):
        """
        Add a comment to a pull request.
        
        Args:
            pr_number: PR number
            comment_body: Comment text
            repo_name: Full repository name
        
        Returns:
            Comment object if successful, None otherwise
        """
        try:
            repo = self.get_repository(repo_name)
            pr = repo.get_pull(pr_number)
            comment = pr.create_issue_comment(comment_body)
            print(f'Comment added to PR #{pr_number}')
            return comment
        except GithubException as e:
            print(f'Error commenting on PR #{pr_number}: {str(e)}')
            return None
    
    def update_issue_labels(self, issue_number, labels, repo_name='gcolon75/Project-Valine'):
        """
        Update labels on an issue.
        
        Args:
            issue_number: Issue number
            labels: List of label names
            repo_name: Full repository name
        
        Returns:
            True if successful, False otherwise
        """
        try:
            repo = self.get_repository(repo_name)
            issue = repo.get_issue(issue_number)
            issue.set_labels(*labels)
            print(f'Labels updated on issue #{issue_number}')
            return True
        except GithubException as e:
            print(f'Error updating labels on issue #{issue_number}: {str(e)}')
            return False
    
    def get_pull_request(self, pr_number, repo_name='gcolon75/Project-Valine'):
        """
        Get a pull request by number.
        
        Args:
            pr_number: PR number
            repo_name: Full repository name
        
        Returns:
            PullRequest object if found, None otherwise
        """
        try:
            repo = self.get_repository(repo_name)
            return repo.get_pull(pr_number)
        except GithubException as e:
            print(f'Error fetching PR #{pr_number}: {str(e)}')
            return None
    
    def merge_pull_request(self, pr_number, commit_message=None, repo_name='gcolon75/Project-Valine'):
        """
        Merge a pull request.
        
        Args:
            pr_number: PR number
            commit_message: Optional merge commit message
            repo_name: Full repository name
        
        Returns:
            True if successful, False otherwise
        """
        try:
            repo = self.get_repository(repo_name)
            pr = repo.get_pull(pr_number)
            result = pr.merge(commit_message=commit_message)
            print(f'PR #{pr_number} merged: {result.merged}')
            return result.merged
        except GithubException as e:
            print(f'Error merging PR #{pr_number}: {str(e)}')
            return False
    
    def update_repo_variable(self, variable_name, variable_value, repo_name='gcolon75/Project-Valine'):
        """
        Update or create a repository variable.
        
        Args:
            variable_name: Name of the variable
            variable_value: Value to set
            repo_name: Full repository name
        
        Returns:
            dict with 'success' (bool) and 'message' (str)
        """
        try:
            import requests
            
            owner, repo = repo_name.split('/')
            url = f'https://api.github.com/repos/{owner}/{repo}/actions/variables/{variable_name}'
            
            headers = {
                'Authorization': f'token {self.token}',
                'Accept': 'application/vnd.github.v3+json'
            }
            
            payload = {
                'name': variable_name,
                'value': variable_value
            }
            
            # Try to update first (PATCH)
            response = requests.patch(url, headers=headers, json=payload, timeout=10)
            
            if response.status_code == 204:
                print(f'Repository variable {variable_name} updated successfully')
                return {
                    'success': True,
                    'message': f'Variable {variable_name} updated successfully'
                }
            elif response.status_code == 404:
                # Variable doesn't exist, create it (POST)
                create_url = f'https://api.github.com/repos/{owner}/{repo}/actions/variables'
                response = requests.post(create_url, headers=headers, json=payload, timeout=10)
                
                if response.status_code == 201:
                    print(f'Repository variable {variable_name} created successfully')
                    return {
                        'success': True,
                        'message': f'Variable {variable_name} created successfully'
                    }
                else:
                    print(f'Failed to create variable: {response.status_code} - {response.text}')
                    return {
                        'success': False,
                        'message': f'Failed to create variable (status {response.status_code})'
                    }
            else:
                print(f'Failed to update variable: {response.status_code} - {response.text}')
                return {
                    'success': False,
                    'message': f'Failed to update variable (status {response.status_code})'
                }
        
        except Exception as e:
            print(f'Error updating repository variable: {str(e)}')
            return {
                'success': False,
                'message': f'Error: {str(e)}'
            }
    
    def update_repo_secret(self, secret_name, secret_value, repo_name='gcolon75/Project-Valine'):
        """
        Update or create a repository secret.
        Requires libsodium for encryption.
        
        Args:
            secret_name: Name of the secret
            secret_value: Value to set (will be encrypted)
            repo_name: Full repository name
        
        Returns:
            dict with 'success' (bool) and 'message' (str)
        """
        try:
            import requests
            from nacl import encoding, public
            
            owner, repo = repo_name.split('/')
            
            headers = {
                'Authorization': f'token {self.token}',
                'Accept': 'application/vnd.github.v3+json'
            }
            
            # Get the repository's public key
            pub_key_url = f'https://api.github.com/repos/{owner}/{repo}/actions/secrets/public-key'
            pub_key_response = requests.get(pub_key_url, headers=headers, timeout=10)
            
            if pub_key_response.status_code != 200:
                print(f'Failed to get public key: {pub_key_response.status_code}')
                return {
                    'success': False,
                    'message': f'Failed to get repository public key (status {pub_key_response.status_code})'
                }
            
            pub_key_data = pub_key_response.json()
            public_key = pub_key_data['key']
            key_id = pub_key_data['key_id']
            
            # Encrypt the secret value
            public_key_obj = public.PublicKey(public_key.encode('utf-8'), encoding.Base64Encoder())
            sealed_box = public.SealedBox(public_key_obj)
            encrypted = sealed_box.encrypt(secret_value.encode('utf-8'))
            encrypted_value = encoding.Base64Encoder().encode(encrypted).decode('utf-8')
            
            # Update/create the secret
            secret_url = f'https://api.github.com/repos/{owner}/{repo}/actions/secrets/{secret_name}'
            payload = {
                'encrypted_value': encrypted_value,
                'key_id': key_id
            }
            
            response = requests.put(secret_url, headers=headers, json=payload, timeout=10)
            
            if response.status_code in [201, 204]:
                print(f'Repository secret {secret_name} updated successfully')
                return {
                    'success': True,
                    'message': f'Secret {secret_name} updated successfully'
                }
            else:
                print(f'Failed to update secret: {response.status_code} - {response.text}')
                return {
                    'success': False,
                    'message': f'Failed to update secret (status {response.status_code})'
                }
        
        except Exception as e:
            print(f'Error updating repository secret: {str(e)}')
            return {
                'success': False,
                'message': f'Error: {str(e)}'
            }
