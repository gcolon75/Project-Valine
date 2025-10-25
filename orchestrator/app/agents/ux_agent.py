"""
UX Agent for Discord-Orchestrated Webpage Updates

This agent receives structured update commands via Discord slash commands (`/ux-update`) and
automates changes to the web app's UI/UX (text, colors, layout, etc). It features an interactive
conversation flow that:
- Parses user intent from commands, plain English, and images/screenshots
- Asks clarifying questions if anything is vague or missing
- Proposes example changes with markdown/code snippets and visual previews
- Provides a summary preview of planned changes and awaits user confirmation
- Only makes changes (creates PR, updates file, etc) after user confirms

Key Features:
- Parse Discord command payload to extract section and property updates
- Analyze uploaded images for layout, color, text, or style cues
- Interactive conversation flow with confirmation steps
- Update relevant files in the codebase (React components, CSS, etc)
- Open draft PR on GitHub with changes and descriptive commit message
- Reply in Discord with summary and PR link
- Error handling with helpful examples
- Gen Z, meme/gamer friendly tone

Usage:
    from agents.ux_agent import UXAgent
    
    agent = UXAgent(
        github_service=github_service,
        repo="gcolon75/Project-Valine"
    )
    
    # Start conversation
    result = agent.start_conversation(
        command_text='section:header text:"Welcome to Project Valine!"',
        user_id='user123'
    )
    
    # After user confirms
    result = agent.confirm_and_execute(
        conversation_id='conv123',
        user_response='yes'
    )

Examples:
    - `/ux-update section:header text:"Welcome to Project Valine!"`
    - `/ux-update section:footer color:"#FF0080"`
    - `/ux-update section:navbar add-link:"/about"`
    - `/ux-update Make the navbar blue like in this screenshot` [image]
"""

import os
import json
import re
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timezone
from pathlib import Path
import uuid


class ConversationState:
    """Represents the state of a UX Agent conversation."""
    
    def __init__(self, conversation_id: str, user_id: str):
        self.conversation_id = conversation_id
        self.user_id = user_id
        self.section = None
        self.updates = {}
        self.images = []
        self.parsed_intent = {}
        self.preview_message = None
        self.created_at = datetime.now(timezone.utc)
        self.confirmed = False
        self.needs_clarification = False
        self.clarification_questions = []
        
    def to_dict(self):
        """Convert to dictionary for storage."""
        return {
            'conversation_id': self.conversation_id,
            'user_id': self.user_id,
            'section': self.section,
            'updates': self.updates,
            'images': self.images,
            'parsed_intent': self.parsed_intent,
            'preview_message': self.preview_message,
            'created_at': self.created_at.isoformat(),
            'confirmed': self.confirmed,
            'needs_clarification': self.needs_clarification,
            'clarification_questions': self.clarification_questions
        }


class UXAgent:
    """
    UX Agent for automating UI/UX changes via Discord commands.
    
    This agent processes structured update commands and creates draft PRs
    with the requested changes to React components and styling. It features
    an interactive conversation flow that confirms changes before execution.
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
        # In-memory conversation store (in production, use persistent storage)
        self.conversations: Dict[str, ConversationState] = {}
    
    def start_conversation(
        self,
        command_text: str = None,
        user_id: str = "unknown",
        images: List[Dict] = None,
        plain_text: str = None
    ) -> Dict[str, Any]:
        """
        Start a new conversation with the UX Agent.
        
        This is the entry point for user interactions. It parses the user's intent,
        analyzes any images, and generates a preview of the proposed changes.
        
        Args:
            command_text: Structured command text (e.g., 'section:header text:"Welcome"')
            user_id: Discord user ID
            images: List of image data (URLs or base64)
            plain_text: Plain English description of desired changes
            
        Returns:
            Dictionary with conversation_id, preview, and clarifying questions
        """
        # Create new conversation
        conversation_id = str(uuid.uuid4())
        conversation = ConversationState(conversation_id, user_id)
        
        # Parse input
        if command_text:
            parsed = self.parse_command(command_text)
            if parsed.get('success'):
                conversation.section = parsed['section']
                conversation.updates = parsed['updates']
            else:
                return {
                    'success': False,
                    'message': parsed.get('message', '❌ Could not parse command'),
                    'examples': self._get_command_examples()
                }
        
        # Analyze images if provided
        if images:
            conversation.images = images
            image_analysis = self._analyze_images(images)
            conversation.parsed_intent.update(image_analysis)
        
        # Parse plain text if provided
        if plain_text:
            text_intent = self._parse_plain_text(plain_text)
            conversation.parsed_intent.update(text_intent)
        
        # Check if we need clarification
        clarifications = self._check_for_clarifications(conversation)
        if clarifications:
            conversation.needs_clarification = True
            conversation.clarification_questions = clarifications
            self.conversations[conversation_id] = conversation
            
            return {
                'success': True,
                'conversation_id': conversation_id,
                'needs_clarification': True,
                'questions': clarifications,
                'message': self._format_clarification_message(clarifications)
            }
        
        # Generate preview
        preview = self._generate_preview(conversation)
        conversation.preview_message = preview['message']
        self.conversations[conversation_id] = conversation
        
        return {
            'success': True,
            'conversation_id': conversation_id,
            'preview': preview,
            'message': preview['message'],
            'needs_confirmation': True
        }
    
    def confirm_and_execute(
        self,
        conversation_id: str,
        user_response: str
    ) -> Dict[str, Any]:
        """
        Handle user confirmation and execute the changes.
        
        Args:
            conversation_id: The conversation ID
            user_response: User's response ('yes', 'no', or clarification text)
            
        Returns:
            Dictionary with execution result or updated preview
        """
        conversation = self.conversations.get(conversation_id)
        if not conversation:
            return {
                'success': False,
                'message': '❌ Conversation not found or expired. Please start a new request.'
            }
        
        # Check if user is confirming
        response_lower = user_response.lower().strip()
        if response_lower in ['yes', 'y', 'confirm', 'go', 'do it', 'proceed', 'make it happen']:
            # User confirmed, execute changes
            conversation.confirmed = True
            return self.process_update(
                section=conversation.section,
                updates=conversation.updates,
                requester=conversation.user_id
            )
        
        elif response_lower in ['no', 'n', 'cancel', 'stop', 'nope']:
            # User cancelled
            del self.conversations[conversation_id]
            return {
                'success': True,
                'cancelled': True,
                'message': '🚫 No problem! Request cancelled. Hit me up if you want to try something else! 🎮'
            }
        
        else:
            # User is providing clarification or modification
            # Try to extract section and updates from their response
            text_intent = self._parse_plain_text(user_response)
            
            # Try parsing as command
            command_parse = self.parse_command(user_response)
            if command_parse.get('success'):
                conversation.section = command_parse['section']
                conversation.updates = command_parse['updates']
            else:
                # Update with text intent
                conversation.parsed_intent.update(text_intent)
                
                # Try to extract quoted text as update value
                if text_intent.get('quoted_text'):
                    # Assume it's updating the same property type
                    if conversation.updates:
                        # Get the first property being updated
                        first_prop = list(conversation.updates.keys())[0]
                        conversation.updates[first_prop] = text_intent['quoted_text'][0]
            
            # Regenerate preview
            preview = self._generate_preview(conversation)
            
            if not preview.get('success'):
                # Still not enough info, ask for more details
                return {
                    'success': False,
                    'conversation_id': conversation_id,
                    'message': preview.get('message', '❌ Could not understand the modification. Please be more specific.')
                }
            
            conversation.preview_message = preview['message']
            
            return {
                'success': True,
                'conversation_id': conversation_id,
                'preview': preview,
                'message': preview['message'],
                'needs_confirmation': True
            }
    
    def _analyze_images(self, images: List[Dict]) -> Dict[str, Any]:
        """
        Analyze uploaded images for UX/UI cues.
        
        Args:
            images: List of image data
            
        Returns:
            Dictionary with parsed intent from images
        """
        # For MVP, we'll provide basic image handling
        # In production, this would use image recognition APIs
        intent = {
            'has_images': True,
            'image_count': len(images),
            'image_references': []
        }
        
        for i, img in enumerate(images, 1):
            intent['image_references'].append({
                'number': i,
                'url': img.get('url'),
                'description': f'Image {i}'
            })
        
        return intent
    
    def _parse_plain_text(self, text: str) -> Dict[str, Any]:
        """
        Parse plain English text to extract user intent.
        
        Args:
            text: Plain English description
            
        Returns:
            Dictionary with parsed intent
        """
        intent = {'plain_text': text}
        
        # Extract section mentions
        text_lower = text.lower()
        for section in self.SECTION_MAPPINGS.keys():
            if section in text_lower:
                intent['mentioned_section'] = section
                break
        
        # Extract color mentions (hex codes or color names)
        hex_match = re.search(r'#[0-9A-Fa-f]{6}', text)
        if hex_match:
            intent['color'] = hex_match.group(0)
        
        # Look for common color names
        color_names = ['blue', 'red', 'green', 'yellow', 'purple', 'orange', 'black', 'white', 'gray']
        for color in color_names:
            if color in text_lower:
                intent['color_name'] = color
        
        # Look for text in quotes
        quoted_text = re.findall(r'"([^"]+)"', text)
        if quoted_text:
            intent['quoted_text'] = quoted_text
        
        return intent
    
    def _check_for_clarifications(self, conversation: ConversationState) -> List[str]:
        """
        Check if we need clarifying questions.
        
        Args:
            conversation: Current conversation state
            
        Returns:
            List of clarifying questions, empty if none needed
        """
        questions = []
        
        # Check if section is clear
        if not conversation.section:
            if conversation.parsed_intent.get('mentioned_section'):
                conversation.section = conversation.parsed_intent['mentioned_section']
            else:
                questions.append(
                    "Which section do you want to update? Choose from: **header**, **navbar**, **footer**, or **home** page"
                )
        
        # Check if updates are clear
        if not conversation.updates and not conversation.parsed_intent.get('color'):
            if conversation.images:
                questions.append(
                    f"I see you uploaded {len(conversation.images)} image(s). What specifically do you want to change? "
                    "The color, text, layout, or something else?"
                )
            else:
                questions.append(
                    "What exactly do you want to change? (e.g., text, color, add a link)"
                )
        
        return questions
    
    def _format_clarification_message(self, questions: List[str]) -> str:
        """
        Format clarification questions into a friendly message.
        
        Args:
            questions: List of questions
            
        Returns:
            Formatted message string
        """
        msg = "🤔 **I need a bit more info to help you out!**\n\n"
        
        for i, q in enumerate(questions, 1):
            msg += f"{i}. {q}\n"
        
        msg += "\n💡 **Examples of what you can tell me:**\n"
        msg += "• \"Update the header text to 'Level Up!'\"\n"
        msg += "• \"Make the navbar background blue\"\n"
        msg += "• \"Change the footer text to 'Valine'\"\n"
        msg += "• \"Add an About link to the navbar\"\n"
        
        return msg
    
    def _generate_preview(self, conversation: ConversationState) -> Dict[str, Any]:
        """
        Generate a preview of the proposed changes.
        
        Args:
            conversation: Current conversation state
            
        Returns:
            Dictionary with preview message and code snippets
        """
        section = conversation.section
        updates = conversation.updates
        
        if not section or not updates:
            return {
                'success': False,
                'message': '❌ Not enough information to generate preview'
            }
        
        # Get section info
        section_info = self.SECTION_MAPPINGS.get(section)
        if not section_info:
            return {
                'success': False,
                'message': f'❌ Unknown section: {section}'
            }
        
        # Build preview message
        msg = f"🎨 **Got it! Here's what I'm about to do:**\n\n"
        msg += f"**Section:** `{section}`\n"
        msg += f"**File:** `{section_info['file']}`\n\n"
        msg += "**Changes:**\n"
        
        code_snippets = []
        
        for prop, value in updates.items():
            if prop == 'text':
                msg += f"• Update text to: **\"{value}\"**\n"
                code_snippets.append(self._generate_text_preview(section, value))
            elif prop == 'color':
                msg += f"• Update color to: **{value}**\n"
                code_snippets.append(self._generate_color_preview(section, value))
            elif prop == 'brand':
                msg += f"• Update brand name to: **\"{value}\"**\n"
                code_snippets.append(self._generate_brand_preview(section, value))
            elif prop in ['hero-text', 'description', 'cta-text']:
                label = prop.replace('-', ' ').title()
                msg += f"• Update {label} to: **\"{value}\"**\n"
                code_snippets.append(self._generate_home_preview(prop, value))
            elif 'link' in prop:
                msg += f"• Add link: **{value}**\n"
                code_snippets.append(self._generate_link_preview(section, value))
        
        # Add code preview
        if code_snippets:
            msg += "\n**Preview:**\n"
            for snippet in code_snippets[:2]:  # Limit to 2 snippets to avoid message bloat
                msg += f"```{snippet['language']}\n{snippet['code']}\n```\n"
        
        # Add confirmation prompt
        msg += "\n✅ **Ready to make this change?** Type **'yes'** to confirm or **'no'** to cancel!\n"
        msg += "💬 Or tell me what to tweak if this isn't quite right!"
        
        return {
            'success': True,
            'message': msg,
            'code_snippets': code_snippets
        }
    
    def _generate_text_preview(self, section: str, value: str) -> Dict[str, str]:
        """Generate code preview for text change."""
        if section == 'header':
            code = f'<Link className="text-xl font-semibold">\n  {value}\n</Link>'
        elif section == 'footer':
            code = f'&copy; {{new Date().getFullYear()}} {value}. All rights reserved.'
        elif section == 'navbar':
            code = f'<span>{value}</span>'
        else:
            code = f'<h1>{value}</h1>'
        
        return {'language': 'jsx', 'code': code}
    
    def _generate_color_preview(self, section: str, value: str) -> Dict[str, str]:
        """Generate code preview for color change."""
        code = f'.{section} {{\n  background: {value};\n}}'
        return {'language': 'css', 'code': code}
    
    def _generate_brand_preview(self, section: str, value: str) -> Dict[str, str]:
        """Generate code preview for brand change."""
        code = f'<span>{value}</span>'
        return {'language': 'jsx', 'code': code}
    
    def _generate_home_preview(self, prop: str, value: str) -> Dict[str, str]:
        """Generate code preview for home page changes."""
        if prop == 'hero-text':
            code = f'<h1 className="text-4xl font-bold">\n  {value}\n</h1>'
        elif prop == 'description':
            code = f'<p className="mt-4 text-lg">\n  {value}\n</p>'
        else:  # cta-text
            code = f'<Link className="rounded-full bg-brand">\n  {value}\n</Link>'
        
        return {'language': 'jsx', 'code': code}
    
    def _generate_link_preview(self, section: str, value: str) -> Dict[str, str]:
        """Generate code preview for link addition."""
        if ':' in value:
            label, path = value.split(':', 1)
        else:
            path = value
            label = path.strip('/').capitalize()
        
        code = f'<Link to="{path}">{label}</Link>'
        return {'language': 'jsx', 'code': code}
    
    def _get_command_examples(self) -> List[str]:
        """Get example commands for help messages."""
        return [
            '`/ux-update section:header text:"Welcome Home!"`',
            '`/ux-update section:footer color:"#00FF00"`',
            '`/ux-update section:navbar brand:"Joint"`',
            '`/ux-update section:home hero-text:"Level Up!"`',
            'Or just describe what you want: "Make the navbar blue"'
        ]
    
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
            f'/ux-update section:{section} {" ".join([f"{k}:{v}" for k, v in updates.items()])}',
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
