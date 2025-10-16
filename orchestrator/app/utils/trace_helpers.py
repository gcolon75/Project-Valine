"""
Helper functions for trace management in command handlers.
"""
import os
from typing import Optional
from app.utils.trace_store import get_trace_store, ExecutionTrace
from app.utils.logger import SecretRedactor


def format_trace_for_discord(trace: ExecutionTrace, max_steps: int = 10) -> str:
    """
    Format an execution trace for Discord display.
    
    Args:
        trace: ExecutionTrace to format
        max_steps: Maximum number of steps to display
        
    Returns:
        Formatted string for Discord message
    """
    content = f'🔍 **Debug Trace: {trace.command}**\n\n'
    
    # Basic info
    content += f'**Trace ID:** `{trace.trace_id[:16]}...`\n'
    content += f'**Started:** <t:{int(trace.started_at.timestamp())}:R>\n'
    
    if trace.completed_at:
        duration_ms = (trace.completed_at - trace.started_at).total_seconds() * 1000
        content += f'**Duration:** {duration_ms:.0f}ms\n'
    else:
        content += f'**Status:** In progress\n'
    
    # Error info if present
    if trace.error:
        error_msg = SecretRedactor.redact(trace.error['message'])
        # Truncate long error messages
        if len(error_msg) > 200:
            error_msg = error_msg[:200] + '...'
        content += f'\n❌ **Error:** {trace.error["type"]}\n'
        content += f'```\n{error_msg}\n```\n'
    
    # Steps
    if trace.steps:
        content += f'\n**Steps ({len(trace.steps)}):**\n'
        for i, step in enumerate(trace.steps[:max_steps]):
            status_icon = '✅' if step['status'] == 'completed' else '🔄' if step['status'] == 'started' else '❌'
            duration_str = f" ({step['duration_ms']:.0f}ms)" if 'duration_ms' in step else ""
            content += f'{status_icon} {step["name"]}{duration_str}\n'
        
        if len(trace.steps) > max_steps:
            content += f'... and {len(trace.steps) - max_steps} more\n'
    
    # Workflow run URLs
    if trace.run_urls:
        content += f'\n**Workflow Runs:**\n'
        for url in trace.run_urls[:3]:  # Show max 3 URLs
            content += f'• [View Run]({url})\n'
    
    # Metadata
    if trace.metadata:
        important_keys = ['workflow', 'correlation_id', 'status']
        metadata_items = []
        for key in important_keys:
            if key in trace.metadata:
                value = trace.metadata[key]
                # Redact if needed
                if isinstance(value, str):
                    value = SecretRedactor.redact(value)
                metadata_items.append(f'{key}: {value}')
        
        if metadata_items:
            content += f'\n**Details:** {", ".join(metadata_items)}\n'
    
    return content


def should_enable_debug_cmd() -> bool:
    """
    Check if /debug-last command should be enabled.
    
    Returns:
        True if enabled, False otherwise
    """
    # Check environment variable
    enable_debug = os.environ.get('ENABLE_DEBUG_CMD', 'true').lower()
    return enable_debug in ('true', '1', 'yes')


def should_enable_json_logging() -> bool:
    """
    Check if JSON logging should be enabled.
    
    Returns:
        True if enabled, False otherwise
    """
    enable_json = os.environ.get('ENABLE_JSON_LOGGING', 'true').lower()
    return enable_json in ('true', '1', 'yes')
