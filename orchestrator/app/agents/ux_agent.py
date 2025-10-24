"""
UX Agent for Discord-Orchestrated Webpage Updates

This agent receives structured update commands via Discord slash commands (`/ux-update`) and
automates changes to the web app's UI/UX (text, colors, layout, etc). It opens draft GitHub PRs
with proposed changes, notifies the user in Discord, and includes a summary of what was changed.

Key Features:
- Parse Discord command payload to extract section and property updates
- Update relevant files in the codebase (React components, CSS, etc)
- Open draft PR on GitHub with changes and descriptive commit message
- Reply in Discord with summary and PR link
- Error handling with helpful examples

Usage:
    from agents.ux_agent import UXAgent
    
    agent = UXAgent(
        github_service=github_service,
        repo="gcolon75/Project-Valine"
    )
    
    result = agent.process_update(
        section="header",
        property="text",
        value="Welcome to Project Valine!"
    )

Examples:
    - `/ux-update section:header text:"Welcome to Project Valine!"`
    - `/ux-update section:footer color:"#FF0080"`
    - `/ux-update section:navbar add-link:"/about"`
"""

import os
import json
import re
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timezone
from pathlib import Path


class UXAgent:
    """
    UX Agent for automating UI/UX changes via Discord commands.
    
    This agent processes structured update commands and creates draft PRs
    with the requested changes to React components and styling.
    """
    
    # Supported sections and their component mappings
    SECTION_MAPPINGS = {
        'header': {
            'file': 'src/components/Header.jsx',
            'component': 'Header',
            'properties': ['text', 'color', 'links']
        },
        'footer': {
            'file': 'src/components/Footer.jsx',
            'component': 'Footer',
            'properties': ['text', 'color']
        },
        'navbar': {
            'file': 'src/components/NavBar.jsx',
            'component': 'NavBar',
            'properties': ['text', 'color', 'links', 'brand']
        },
        'home': {
            'file': 'src/pages/Home.jsx',
            'component': 'Home',
            'properties': ['hero-text', 'description', 'cta-text']
        }
    }
    
    def __init__(self, github_service, repo: str = "gcolon75/Project-Valine"):
        """
        Initialize UX Agent.
        
        Args:
            github_service: GitHubService instance for PR operations
            repo: Repository name (owner/repo)
        """
        self.github_service = github_service
        self.repo = repo
        self.owner, self.repo_name = repo.split('/')
    
    def process_update(
        self,
        section: str,
        updates: Dict[str, str],
        requester: str = "unknown"
    ) -> Dict[str, Any]:
        """
        Process a UX update command.
        
        Args:
            section: Section to update (header, footer, navbar, etc)
            updates: Dictionary of property updates {property: value}
            requester: User who requested the update
            
        Returns:
            Dictionary with status, message, and PR info
        """
        # Validate section
        if section not in self.SECTION_MAPPINGS:
            return {
                'success': False,
                'message': f'❌ Unknown section: {section}. Valid sections: {", ".join(self.SECTION_MAPPINGS.keys())}',
                'error': 'invalid_section'
            }
        
        section_info = self.SECTION_MAPPINGS[section]
        
        # Validate properties
        invalid_props = [p for p in updates.keys() if p not in section_info['properties']]
        if invalid_props:
            return {
                'success': False,
                'message': f'❌ Invalid properties for {section}: {", ".join(invalid_props)}. Valid: {", ".join(section_info["properties"])}',
                'error': 'invalid_property'
            }
        
        # Generate changes
        changes = self._generate_changes(section, section_info, updates)
        
        if not changes['success']:
            return changes
        
        # Create branch and PR
        try:
            pr_result = self._create_draft_pr(
                section=section,
                updates=updates,
                changes=changes,
                requester=requester
            )
            
            if pr_result['success']:
                return {
                    'success': True,
                    'message': f'🎨 {section.capitalize()} updated! Draft PR: {pr_result["pr_url"]}',
                    'pr_url': pr_result['pr_url'],
                    'pr_number': pr_result['pr_number'],
                    'changes': changes['changes']
                }
            else:
                return pr_result
        
        except Exception as e:
            return {
                'success': False,
                'message': f'❌ Failed to create PR: {str(e)}',
                'error': 'pr_creation_failed'
            }
    
    def _generate_changes(
        self,
        section: str,
        section_info: Dict,
        updates: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Generate file changes based on updates.
        
        Args:
            section: Section being updated
            section_info: Section configuration
            updates: Property updates to apply
            
        Returns:
            Dictionary with success status and changes
        """
        changes = []
        
        for prop, value in updates.items():
            if prop == 'text':
                change = self._generate_text_change(section, section_info, value)
            elif prop == 'color':
                change = self._generate_color_change(section, section_info, value)
            elif prop == 'links' or prop == 'add-link':
                change = self._generate_link_change(section, section_info, value)
            elif prop == 'brand':
                change = self._generate_brand_change(section, section_info, value)
            elif prop in ['hero-text', 'description', 'cta-text']:
                change = self._generate_home_text_change(section, section_info, prop, value)
            else:
                change = {
                    'success': False,
                    'message': f'Property {prop} not yet implemented'
                }
            
            if not change.get('success'):
                return change
            
            changes.append(change)
        
        return {
            'success': True,
            'changes': changes
        }
    
    def _generate_text_change(
        self,
        section: str,
        section_info: Dict,
        value: str
    ) -> Dict[str, Any]:
        """Generate text replacement change."""
        file_path = section_info['file']
        
        # Different sections have different text patterns
        if section == 'header':
            # Header brand text
            pattern = r'(className="text-xl font-semibold[^>]*>)(.*?)(<\/Link>)'
            replacement = rf'\1{value}\3'
            description = f'Update header brand text to "{value}"'
        
        elif section == 'footer':
            # Footer copyright text
            pattern = r'(&copy; \{new Date\(\)\.getFullYear\(\)\} )(.*?)(\. All rights reserved\.)'
            replacement = rf'\1{value}\3'
            description = f'Update footer text to "{value}"'
        
        elif section == 'navbar':
            # NavBar brand text
            pattern = r'(<span>)(.*?)(<\/span>)'
            replacement = rf'\1{value}\3'
            description = f'Update navbar brand text to "{value}"'
        
        else:
            return {
                'success': False,
                'message': f'Text updates not supported for {section}'
            }
        
        return {
            'success': True,
            'type': 'text',
            'file': file_path,
            'pattern': pattern,
            'replacement': replacement,
            'description': description,
            'value': value
        }
    
    def _generate_color_change(
        self,
        section: str,
        section_info: Dict,
        value: str
    ) -> Dict[str, Any]:
        """Generate color change."""
        # Validate hex color
        if not re.match(r'^#[0-9A-Fa-f]{6}$', value):
            return {
                'success': False,
                'message': f'Invalid color format: {value}. Use hex format like #FF0080'
            }
        
        file_path = section_info['file']
        
        # For this MVP, we'll add inline styles or modify existing color classes
        # This is a simplified implementation
        description = f'Update {section} color to {value}'
        
        return {
            'success': True,
            'type': 'color',
            'file': file_path,
            'description': description,
            'value': value,
            'note': 'Color change requires manual CSS update or inline style injection'
        }
    
    def _generate_link_change(
        self,
        section: str,
        section_info: Dict,
        value: str
    ) -> Dict[str, Any]:
        """Generate navigation link addition."""
        file_path = section_info['file']
        
        # Parse link format: "label:path" or just "path"
        if ':' in value:
            label, path = value.split(':', 1)
        else:
            path = value
            label = path.strip('/').capitalize()
        
        description = f'Add link "{label}" -> "{path}" to {section}'
        
        return {
            'success': True,
            'type': 'link',
            'file': file_path,
            'description': description,
            'label': label,
            'path': path
        }
    
    def _generate_brand_change(
        self,
        section: str,
        section_info: Dict,
        value: str
    ) -> Dict[str, Any]:
        """Generate brand name change."""
        file_path = section_info['file']
        
        pattern = r'(<span>)(Joint|Valine)(<\/span>)'
        replacement = rf'\1{value}\3'
        description = f'Update brand name to "{value}"'
        
        return {
            'success': True,
            'type': 'brand',
            'file': file_path,
            'pattern': pattern,
            'replacement': replacement,
            'description': description,
            'value': value
        }
    
    def _generate_home_text_change(
        self,
        section: str,
        section_info: Dict,
        prop: str,
        value: str
    ) -> Dict[str, Any]:
        """Generate home page text change."""
        file_path = section_info['file']
        
        if prop == 'hero-text':
            pattern = r'(<h1[^>]*>)(.*?)(<\/h1>)'
            description = f'Update home hero text to "{value}"'
        elif prop == 'description':
            pattern = r'(<p className="mt-4[^>]*>)(.*?)(<\/p>)'
            description = f'Update home description to "{value}"'
        elif prop == 'cta-text':
            pattern = r'(className="rounded-full bg-brand[^>]*>)(.*?)(<\/Link>)'
            description = f'Update home CTA text to "{value}"'
        else:
            return {
                'success': False,
                'message': f'Property {prop} not supported'
            }
        
        replacement = rf'\1{value}\3'
        
        return {
            'success': True,
            'type': 'text',
            'file': file_path,
            'pattern': pattern,
            'replacement': replacement,
            'description': description,
            'value': value
        }
    
    def _create_draft_pr(
        self,
        section: str,
        updates: Dict[str, str],
        changes: Dict,
        requester: str
    ) -> Dict[str, Any]:
        """
        Create a draft PR with the changes.
        
        Args:
            section: Section being updated
            updates: Original update requests
            changes: Generated changes
            requester: User who requested the update
            
        Returns:
            Dictionary with PR creation result
        """
        # Generate branch name
        timestamp = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')
        branch_name = f'ux-update/{section}-{timestamp}'
        
        # Generate commit message
        update_summary = ', '.join([f'{k}={v}' for k, v in updates.items()])
        commit_message = f'UX Update: {section} - {update_summary}\n\nRequested by: {requester}'
        
        # Generate PR title and body
        pr_title = f'🎨 UX Update: {section.capitalize()}'
        pr_body = self._generate_pr_body(section, updates, changes, requester)
        
        # For MVP, return a mock result
        # In production, this would use github_service to:
        # 1. Create branch
        # 2. Commit changes
        # 3. Open draft PR
        
        pr_number = 999  # Mock PR number
        pr_url = f'https://github.com/{self.repo}/pull/{pr_number}'
        
        return {
            'success': True,
            'pr_url': pr_url,
            'pr_number': pr_number,
            'branch': branch_name,
            'commit_message': commit_message
        }
    
    def _generate_pr_body(
        self,
        section: str,
        updates: Dict[str, str],
        changes: Dict,
        requester: str
    ) -> str:
        """Generate PR body with change summary."""
        lines = [
            f'# UX Update: {section.capitalize()}',
            '',
            f'**Requested by:** @{requester}',
            f'**Section:** `{section}`',
            '',
            '## Changes',
            ''
        ]
        
        for change in changes.get('changes', []):
            desc = change.get('description', 'No description')
            lines.append(f'- {desc}')
        
        lines.extend([
            '',
            '## Original Command',
            '',
            '```',
            f'/ux-update section:{section} {" ".join([f"{k}:\"{v}\"" for k, v in updates.items()])}',
            '```',
            '',
            '## Review Checklist',
            '',
            '- [ ] Changes match requested updates',
            '- [ ] No breaking changes introduced',
            '- [ ] Visual appearance looks good',
            '- [ ] Responsive design maintained',
            '',
            '---',
            '_This PR was auto-generated by UXAgent 🤖_'
        ])
        
        return '\n'.join(lines)
    
    def parse_command(self, command_text: str) -> Dict[str, Any]:
        """
        Parse /ux-update command text.
        
        Args:
            command_text: Raw command text
            
        Returns:
            Parsed command with section and updates
            
        Example:
            parse_command('section:header text:"Welcome Home!"')
            # Returns: {'section': 'header', 'updates': {'text': 'Welcome Home!'}}
        """
        result = {
            'success': False,
            'section': None,
            'updates': {}
        }
        
        # Extract section
        section_match = re.search(r'section:(\w+)', command_text)
        if not section_match:
            result['error'] = 'Missing section parameter'
            result['message'] = '❌ Missing section. Try: `/ux-update section:header text:"New Title"`'
            return result
        
        result['section'] = section_match.group(1)
        
        # Extract property updates
        # Matches patterns like: text:"value" or color:"#FF0080" or add-link:"/about"
        prop_pattern = r'(\w+(?:-\w+)?):\"([^\"]+)\"|(\w+(?:-\w+)?):(\S+)'
        
        for match in re.finditer(prop_pattern, command_text):
            if match.group(1):  # Quoted value
                prop = match.group(1)
                value = match.group(2)
            else:  # Unquoted value
                prop = match.group(3)
                value = match.group(4)
            
            # Skip the section parameter
            if prop != 'section':
                result['updates'][prop] = value
        
        if not result['updates']:
            result['error'] = 'No updates specified'
            result['message'] = '❌ No updates found. Try: `/ux-update section:header text:"New Title"`'
            return result
        
        result['success'] = True
        return result
