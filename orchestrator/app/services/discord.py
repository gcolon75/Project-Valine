"""
Discord service for interacting with Discord API.
Provides functions to post messages, create threads, and manage Discord interactions.
"""
import os
import json
import requests


class DiscordService:
    """Service for Discord API interactions."""
    
    def __init__(self, bot_token=None):
        """Initialize Discord service with bot token."""
        self.bot_token = bot_token or os.environ.get('DISCORD_BOT_TOKEN')
        if not self.bot_token:
            raise ValueError('Discord bot token is required')
        self.base_url = 'https://discord.com/api/v10'
        self.headers = {
            'Authorization': f'Bot {self.bot_token}',
            'Content-Type': 'application/json'
        }
    
    def send_message(self, channel_id, content, embeds=None):
        """
        Send a message to a Discord channel.
        
        Args:
            channel_id: Discord channel ID
            content: Message content
            embeds: Optional list of embed objects
        
        Returns:
            Response JSON if successful, None otherwise
        """
        url = f'{self.base_url}/channels/{channel_id}/messages'
        payload = {'content': content}
        if embeds:
            payload['embeds'] = embeds
        
        try:
            response = requests.post(url, headers=self.headers, json=payload)
            response.raise_for_status()
            print(f'Message sent to channel {channel_id}')
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f'Error sending message to channel {channel_id}: {str(e)}')
            return None
    
    def create_thread(self, channel_id, name, message_id=None, auto_archive_duration=1440):
        """
        Create a thread in a channel.
        
        Args:
            channel_id: Discord channel ID
            name: Thread name
            message_id: Optional message ID to create thread from
            auto_archive_duration: Auto archive duration in minutes (1440 = 1 day)
        
        Returns:
            Thread channel object if successful, None otherwise
        """
        if message_id:
            url = f'{self.base_url}/channels/{channel_id}/messages/{message_id}/threads'
            payload = {
                'name': name,
                'auto_archive_duration': auto_archive_duration
            }
        else:
            url = f'{self.base_url}/channels/{channel_id}/threads'
            payload = {
                'name': name,
                'auto_archive_duration': auto_archive_duration,
                'type': 11  # PUBLIC_THREAD
            }
        
        try:
            response = requests.post(url, headers=self.headers, json=payload)
            response.raise_for_status()
            thread = response.json()
            print(f'Thread created: {thread.get("id")} - {name}')
            return thread
        except requests.exceptions.RequestException as e:
            print(f'Error creating thread: {str(e)}')
            return None
    
    def post_to_thread(self, thread_id, content, embeds=None):
        """
        Post a message to a thread.
        
        Args:
            thread_id: Discord thread ID
            content: Message content
            embeds: Optional list of embed objects
        
        Returns:
            Response JSON if successful, None otherwise
        """
        return self.send_message(thread_id, content, embeds)
    
    def create_embed(self, title, description, color=0x5865F2, fields=None, footer=None):
        """
        Create a Discord embed object.
        
        Args:
            title: Embed title
            description: Embed description
            color: Embed color (integer)
            fields: List of field objects {name, value, inline}
            footer: Footer object {text, icon_url}
        
        Returns:
            Embed dictionary
        """
        embed = {
            'title': title,
            'description': description,
            'color': color
        }
        
        if fields:
            embed['fields'] = fields
        if footer:
            embed['footer'] = footer
        
        return embed
    
    def send_plan_proposal(self, channel_id, issues, thread_name='Daily Plan'):
        """
        Send a daily plan proposal to Discord.
        
        Args:
            channel_id: Discord channel ID
            issues: List of GitHub issue objects
            thread_name: Name for the thread
        
        Returns:
            Thread object if successful, None otherwise
        """
        # Create initial message
        content = f'📋 **Daily Plan Proposal** - {len(issues)} issues ready'
        
        # Create embed with issue list
        fields = []
        for issue in issues[:10]:  # Limit to first 10 issues
            fields.append({
                'name': f'#{issue.number}: {issue.title}',
                'value': f'[View Issue]({issue.html_url})',
                'inline': False
            })
        
        if len(issues) > 10:
            fields.append({
                'name': 'More issues...',
                'value': f'And {len(issues) - 10} more',
                'inline': False
            })
        
        embed = self.create_embed(
            title='Ready Issues',
            description='Issues with the `ready` label',
            color=0x00FF00,
            fields=fields
        )
        
        # Send message and create thread
        message = self.send_message(channel_id, content, embeds=[embed])
        if message:
            thread = self.create_thread(
                channel_id,
                thread_name,
                message_id=message.get('id')
            )
            return thread
        
        return None
    
    def update_thread_with_progress(self, thread_id, progress_info):
        """
        Post a progress update to a thread.
        
        Args:
            thread_id: Discord thread ID
            progress_info: Dictionary with progress information
        
        Returns:
            Response JSON if successful, None otherwise
        """
        content = '🔄 **Progress Update**'
        
        fields = []
        if 'completed' in progress_info:
            fields.append({
                'name': 'Completed',
                'value': str(progress_info['completed']),
                'inline': True
            })
        if 'in_progress' in progress_info:
            fields.append({
                'name': 'In Progress',
                'value': str(progress_info['in_progress']),
                'inline': True
            })
        if 'pending' in progress_info:
            fields.append({
                'name': 'Pending',
                'value': str(progress_info['pending']),
                'inline': True
            })
        
        embed = self.create_embed(
            title='Current Status',
            description=progress_info.get('message', 'Status update'),
            color=0xFFFF00,
            fields=fields
        )
        
        return self.post_to_thread(thread_id, content, embeds=[embed])
