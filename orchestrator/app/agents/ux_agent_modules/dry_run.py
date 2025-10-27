"""
Dry-Run Preview Generation for UX Agent.

This module implements deterministic AST-based diff generation and preview
creation for UX update tasks. It does NOT use LLM parsing - this is purely
deterministic code analysis.

Key features:
- Parse React/JSX components to find target elements
- Generate unified diff format patches
- Create human-readable previews for Discord
- No external API calls (deterministic and fast)
"""

import os
import re
import json
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path


class DryRunGenerator:
    """
    Generates dry-run previews of UX changes without applying them.
    
    Uses deterministic pattern matching and simple AST parsing to:
    1. Locate target component/section in codebase
    2. Generate proposed changes as diffs
    3. Create preview messages for user confirmation
    """
    
    # Component file mappings (same as UX Agent)
    COMPONENT_MAPPINGS = {
        'header': {
            'file': 'src/components/Header.jsx',
            'component': 'Header',
            'patterns': {
                'text': r'(className="text-xl font-semibold[^>]*>)(.*?)(<\/Link>)',
                'brand': r'(<span>)(.*?)(<\/span>)'
            }
        },
        'footer': {
            'file': 'src/components/Footer.jsx',
            'component': 'Footer',
            'patterns': {
                'text': r'(&copy; \{new Date\(\)\.getFullYear\(\)\} )(.*?)(\. All rights reserved\.)'
            }
        },
        'navbar': {
            'file': 'src/components/NavBar.jsx',
            'component': 'NavBar',
            'patterns': {
                'brand': r'(<span>)(.*?)(<\/span>)',
                'text': r'(<span>)(.*?)(<\/span>)'
            }
        },
        'home': {
            'file': 'src/pages/Home.jsx',
            'component': 'Home',
            'patterns': {
                'hero-text': r'(<h1[^>]*>)(.*?)(<\/h1>)',
                'description': r'(<p className="mt-4[^>]*>)(.*?)(<\/p>)',
                'cta-text': r'(className="rounded-full bg-brand[^>]*>)(.*?)(<\/Link>)'
            }
        }
    }
    
    def __init__(self, repo_path: Optional[str] = None):
        """
        Initialize dry-run generator.
        
        Args:
            repo_path: Path to repository root (defaults to current directory)
        """
        self.repo_path = repo_path or os.getcwd()
    
    def generate_proposed_changes(self, task_json: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate proposed changes for a task without applying them.
        
        Args:
            task_json: Task dictionary from agent-task-schema
            
        Returns:
            Dictionary with proposed_changes array and preview_message
        """
        task_type = task_json.get('task_type')
        
        if task_type != 'ux_update':
            return {
                'success': False,
                'error': 'unsupported_task_type',
                'message': f'Dry-run preview only supports ux_update, got: {task_type}'
            }
        
        params = task_json.get('parameters', {})
        
        # Structured updates (section + properties)
        if params.get('target_section') and params.get('updates'):
            return self._generate_structured_preview(task_json)
        
        # Plain text description (requires clarification or LLM parsing)
        elif params.get('plain_text'):
            return {
                'success': False,
                'error': 'needs_clarification',
                'message': 'Plain text descriptions require LLM parsing or clarification. Please provide structured updates.',
                'clarification_needed': True
            }
        
        else:
            return {
                'success': False,
                'error': 'insufficient_parameters',
                'message': 'Task must include either target_section+updates or plain_text description'
            }
    
    def _generate_structured_preview(self, task_json: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate preview for structured UX update.
        
        Args:
            task_json: Task dictionary with target_section and updates
            
        Returns:
            Dictionary with proposed changes and preview
        """
        params = task_json['parameters']
        section = params['target_section']
        updates = params['updates']
        
        # Validate section
        if section not in self.COMPONENT_MAPPINGS:
            return {
                'success': False,
                'error': 'invalid_section',
                'message': f'Unknown section: {section}. Valid: {list(self.COMPONENT_MAPPINGS.keys())}'
            }
        
        component_info = self.COMPONENT_MAPPINGS[section]
        file_path = component_info['file']
        full_path = Path(self.repo_path) / file_path
        
        # Check if file exists
        if not full_path.exists():
            return {
                'success': False,
                'error': 'file_not_found',
                'message': f'Component file not found: {file_path}'
            }
        
        # Read current file content
        try:
            with open(full_path, 'r') as f:
                original_content = f.read()
        except Exception as e:
            return {
                'success': False,
                'error': 'file_read_error',
                'message': f'Could not read {file_path}: {str(e)}'
            }
        
        # Generate changes for each update
        proposed_changes = []
        modified_content = original_content
        
        for prop, value in updates.items():
            change_result = self._generate_single_change(
                section, prop, value, modified_content, file_path
            )
            
            if not change_result['success']:
                return change_result
            
            proposed_changes.append(change_result['change'])
            modified_content = change_result.get('modified_content', modified_content)
        
        # Generate unified diff
        diff = self._generate_unified_diff(file_path, original_content, modified_content)
        
        # Create preview message
        preview_message = self._create_preview_message(
            task_json, section, proposed_changes, diff
        )
        
        return {
            'success': True,
            'proposed_changes': proposed_changes,
            'preview_message': preview_message,
            'diff': diff
        }
    
    def _generate_single_change(
        self,
        section: str,
        prop: str,
        value: str,
        content: str,
        file_path: str
    ) -> Dict[str, Any]:
        """
        Generate a single change for a property update.
        
        Args:
            section: Section being updated
            prop: Property name
            value: New value
            content: Current file content
            file_path: Path to file
            
        Returns:
            Dictionary with change details
        """
        component_info = self.COMPONENT_MAPPINGS[section]
        patterns = component_info.get('patterns', {})
        
        if prop not in patterns:
            # Generic property - create placeholder
            return {
                'success': True,
                'change': {
                    'file': file_path,
                    'property': prop,
                    'value': value,
                    'diff': f'(Property {prop} update - manual implementation needed)',
                    'description': f'Update {section} {prop} to "{value}"',
                    'preview_html': f'<code>{prop}:</code> <strong>"{value}"</strong>'
                },
                'modified_content': content
            }
        
        # Use regex pattern to find and replace
        pattern = patterns[prop]
        match = re.search(pattern, content, re.DOTALL)
        
        if not match:
            return {
                'success': False,
                'error': 'pattern_not_found',
                'message': f'Could not find {prop} pattern in {file_path}'
            }
        
        # Generate replacement
        if len(match.groups()) >= 3:
            # Pattern has capture groups (prefix)(target)(suffix)
            replacement = f'{match.group(1)}{value}{match.group(3)}'
        else:
            # Fallback - just replace the whole match
            replacement = value
        
        # Apply replacement
        modified_content = content[:match.start()] + replacement + content[match.end():]
        
        # Extract context for diff
        old_line = match.group(0)
        new_line = replacement
        
        change = {
            'file': file_path,
            'property': prop,
            'value': value,
            'old_content': match.group(2) if len(match.groups()) >= 2 else match.group(0),
            'new_content': value,
            'diff': f'- {old_line}\n+ {new_line}',
            'description': f'Update {section} {prop} to "{value}"',
            'preview_html': self._generate_preview_html(section, prop, value)
        }
        
        return {
            'success': True,
            'change': change,
            'modified_content': modified_content
        }
    
    def _generate_unified_diff(
        self,
        file_path: str,
        original: str,
        modified: str
    ) -> str:
        """
        Generate unified diff format string.
        
        Args:
            file_path: Path to file
            original: Original content
            modified: Modified content
            
        Returns:
            Unified diff string
        """
        # Simple diff generation (line-by-line)
        orig_lines = original.splitlines(keepends=True)
        mod_lines = modified.splitlines(keepends=True)
        
        # For simplicity, just show the differences
        diff_lines = [
            f'--- a/{file_path}',
            f'+++ b/{file_path}',
            '@@ -1,{} +1,{} @@'.format(len(orig_lines), len(mod_lines))
        ]
        
        # Find changed lines (simple approach)
        max_len = max(len(orig_lines), len(mod_lines))
        for i in range(max_len):
            orig_line = orig_lines[i] if i < len(orig_lines) else None
            mod_line = mod_lines[i] if i < len(mod_lines) else None
            
            if orig_line != mod_line:
                if orig_line:
                    diff_lines.append(f'- {orig_line.rstrip()}')
                if mod_line:
                    diff_lines.append(f'+ {mod_line.rstrip()}')
            elif orig_line:  # Context line
                diff_lines.append(f'  {orig_line.rstrip()}')
        
        return '\n'.join(diff_lines)
    
    def _generate_preview_html(self, section: str, prop: str, value: str) -> str:
        """Generate HTML preview snippet."""
        if prop in ['text', 'brand', 'hero-text', 'cta-text']:
            return f'<span class="preview-text">{value}</span>'
        elif prop == 'color':
            return f'<div class="preview-color" style="background: {value};"></div>'
        elif prop in ['description']:
            return f'<p class="preview-desc">{value}</p>'
        else:
            return f'<code>{value}</code>'
    
    def _create_preview_message(
        self,
        task_json: Dict[str, Any],
        section: str,
        changes: List[Dict],
        diff: str
    ) -> str:
        """
        Create human-readable preview message for Discord.
        
        Args:
            task_json: Original task
            section: Section being updated
            changes: List of proposed changes
            diff: Unified diff string
            
        Returns:
            Formatted preview message
        """
        task_id = task_json['task_id']
        
        lines = [
            '🎨 **UX Update Preview (Dry-Run)**',
            '',
            f'**Task ID:** `{task_id}`',
            f'**Section:** `{section}`',
            '',
            '**Proposed Changes:**'
        ]
        
        for change in changes:
            desc = change['description']
            lines.append(f'• {desc}')
        
        lines.extend([
            '',
            '**Diff Preview:**',
            '```diff'
        ])
        
        # Include first 15 lines of diff
        diff_lines = diff.split('\n')[:15]
        lines.extend(diff_lines)
        if len(diff.split('\n')) > 15:
            lines.append('... (diff truncated)')
        lines.append('```')
        
        lines.extend([
            '',
            '✅ **Confirm to create draft PR**',
            '🚫 **Cancel to abort**',
            '💬 **Reply to modify**',
            '',
            f'_Evidence: `orchestrator/evidence/preview-{task_id}.md`_'
        ])
        
        return '\n'.join(lines)


def main():
    """CLI entry point for dry-run preview generation."""
    import sys
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate dry-run preview for UX task')
    parser.add_argument('--task', required=True, help='Path to task JSON file')
    parser.add_argument('--repo', default='.', help='Repository path')
    
    args = parser.parse_args()
    
    # Load task
    try:
        with open(args.task, 'r') as f:
            task = json.load(f)
    except Exception as e:
        print(f'Error loading task: {e}', file=sys.stderr)
        sys.exit(1)
    
    # Generate preview
    generator = DryRunGenerator(repo_path=args.repo)
    result = generator.generate_proposed_changes(task)
    
    if result['success']:
        print('✅ Preview generated successfully')
        print()
        print(result['preview_message'])
        print()
        print('Proposed changes:')
        print(json.dumps(result['proposed_changes'], indent=2))
    else:
        print(f'❌ Failed: {result.get("message", "Unknown error")}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
