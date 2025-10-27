"""
LLM Intent Parsing Module for UX Agent.

This module provides natural language intent extraction using OpenAI's LLM.
It is feature-flagged and only activates when:
1. USE_LLM_PARSING environment variable is set to "true"
2. OPENAI_API_KEY environment variable is provided

When disabled or unavailable, it gracefully falls back to structured parsing.

Key features:
- Feature-flagged LLM calls
- Cost estimation and rate limiting
- Robust error handling and retries
- Detailed logging for debugging
"""

import os
import time
import json
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timezone

# Try to import openai, but don't fail if it's not available
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    openai = None
    OPENAI_AVAILABLE = False


class LLMIntentParser:
    """
    Parses natural language UX update requests using LLM.
    
    This parser extracts structured intent from plain text descriptions
    like "Make the navbar blue" or "Change the header to match the profile page".
    """
    
    # Pricing (approximate, as of Oct 2025)
    # GPT-4o-mini: $0.15 per 1M input tokens, $0.60 per 1M output tokens
    COST_PER_INPUT_TOKEN = 0.15 / 1_000_000
    COST_PER_OUTPUT_TOKEN = 0.60 / 1_000_000
    
    # Rate limiting
    MAX_DAILY_COST_USD = 10.00  # Daily budget cap
    MAX_RETRIES = 3
    RETRY_DELAY_SECONDS = 2
    
    def __init__(self, api_key: Optional[str] = None, enable_llm: Optional[bool] = None):
        """
        Initialize LLM intent parser.
        
        Args:
            api_key: OpenAI API key (defaults to OPENAI_API_KEY env var)
            enable_llm: Enable LLM parsing (defaults to USE_LLM_PARSING env var)
        """
        self.api_key = api_key or os.environ.get('OPENAI_API_KEY', '')
        
        # Check feature flag
        use_llm_env = os.environ.get('USE_LLM_PARSING', 'false').lower()
        if enable_llm is None:
            self.enabled = use_llm_env in ['true', '1', 'yes']
        else:
            self.enabled = enable_llm
        
        # Cost tracking
        self.total_cost_today = 0.0
        self.call_count = 0
        
        # Lazy-load openai
        self.openai_client = None
        self._openai_available = False
        
        if self.enabled and self.api_key:
            self._initialize_openai()
    
    def _initialize_openai(self):
        """Lazy-initialize OpenAI client."""
        if not OPENAI_AVAILABLE or openai is None:
            print('Warning: openai package not installed. LLM parsing disabled.')
            self._openai_available = False
            return
            
        try:
            self.openai_client = openai.OpenAI(api_key=self.api_key)
            self._openai_available = True
        except Exception as e:
            print(f'Warning: Failed to initialize OpenAI client: {e}')
            self._openai_available = False
    
    def is_available(self) -> bool:
        """Check if LLM parsing is available."""
        return self.enabled and self._openai_available and bool(self.api_key)
    
    def parse_intent(
        self,
        plain_text: str,
        attachments: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Parse natural language intent into structured UX update request.
        
        Args:
            plain_text: Natural language description
            attachments: Optional list of image/file attachments
            
        Returns:
            Dictionary with parsed intent or error
        """
        # Check if LLM is available
        if not self.is_available():
            return {
                'success': False,
                'skipped': True,
                'reason': 'llm_disabled',
                'message': 'LLM parsing is disabled or unavailable'
            }
        
        # Check cost limit
        if self.total_cost_today >= self.MAX_DAILY_COST_USD:
            return {
                'success': False,
                'skipped': True,
                'reason': 'cost_limit_exceeded',
                'message': f'Daily cost limit of ${self.MAX_DAILY_COST_USD} exceeded'
            }
        
        # Estimate cost before calling
        estimated_cost = self._estimate_cost(plain_text, attachments)
        if self.total_cost_today + estimated_cost > self.MAX_DAILY_COST_USD:
            return {
                'success': False,
                'skipped': True,
                'reason': 'would_exceed_cost_limit',
                'message': f'Request would exceed daily cost limit (${self.MAX_DAILY_COST_USD})'
            }
        
        # Call LLM with retries
        for attempt in range(self.MAX_RETRIES):
            try:
                result = self._call_llm(plain_text, attachments)
                
                # Track cost
                actual_cost = result.get('cost_usd', estimated_cost)
                self.total_cost_today += actual_cost
                self.call_count += 1
                
                return result
                
            except Exception as e:
                if attempt < self.MAX_RETRIES - 1:
                    print(f'LLM call failed (attempt {attempt + 1}/{self.MAX_RETRIES}): {e}')
                    time.sleep(self.RETRY_DELAY_SECONDS * (attempt + 1))
                else:
                    return {
                        'success': False,
                        'error': 'llm_call_failed',
                        'message': f'LLM call failed after {self.MAX_RETRIES} attempts: {str(e)}'
                    }
    
    def _call_llm(
        self,
        plain_text: str,
        attachments: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Call OpenAI LLM to parse intent.
        
        Args:
            plain_text: Natural language description
            attachments: Optional attachments
            
        Returns:
            Parsed intent dictionary
        """
        # Build prompt
        system_prompt = self._build_system_prompt()
        user_message = self._build_user_message(plain_text, attachments)
        
        # Call OpenAI
        response = self.openai_client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_message}
            ],
            temperature=0.1,  # Low temperature for consistent extraction
            max_tokens=500
        )
        
        # Extract response
        content = response.choices[0].message.content
        
        # Calculate cost
        input_tokens = response.usage.prompt_tokens
        output_tokens = response.usage.completion_tokens
        cost_usd = (
            input_tokens * self.COST_PER_INPUT_TOKEN +
            output_tokens * self.COST_PER_OUTPUT_TOKEN
        )
        
        # Parse JSON response
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code block
            if '```json' in content:
                json_str = content.split('```json')[1].split('```')[0].strip()
                parsed = json.loads(json_str)
            elif '```' in content:
                json_str = content.split('```')[1].split('```')[0].strip()
                parsed = json.loads(json_str)
            else:
                return {
                    'success': False,
                    'error': 'invalid_llm_response',
                    'message': 'LLM returned invalid JSON',
                    'raw_content': content
                }
        
        # Validate structure
        if not isinstance(parsed, dict):
            return {
                'success': False,
                'error': 'invalid_intent_structure',
                'message': 'LLM response is not a dictionary'
            }
        
        return {
            'success': True,
            'intent': parsed,
            'cost_usd': cost_usd,
            'input_tokens': input_tokens,
            'output_tokens': output_tokens,
            'model': 'gpt-4o-mini'
        }
    
    def _build_system_prompt(self) -> str:
        """Build system prompt for LLM."""
        return """You are an expert at parsing natural language UX update requests.

Extract structured information from user descriptions of UI changes.

Valid sections: header, footer, navbar, home
Valid properties: text, color, brand, hero-text, description, cta-text, links

Return JSON with:
- action: "update" or "clarify_needed"
- section: which section to update (or null if unclear)
- updates: object mapping properties to new values (or null if unclear)
- confidence: "high", "medium", or "low"
- clarification_questions: array of questions if more info needed

Examples:

Input: "Make the navbar blue"
Output: {"action": "update", "section": "navbar", "updates": {"color": "#0000FF"}, "confidence": "medium"}

Input: "Change the header text to Welcome"
Output: {"action": "update", "section": "header", "updates": {"text": "Welcome"}, "confidence": "high"}

Input: "Update the page"
Output: {"action": "clarify_needed", "section": null, "updates": null, "confidence": "low", "clarification_questions": ["Which section do you want to update?", "What specifically do you want to change?"]}
"""
    
    def _build_user_message(
        self,
        plain_text: str,
        attachments: Optional[List[Dict]] = None
    ) -> str:
        """Build user message for LLM."""
        message = f'User request: "{plain_text}"'
        
        if attachments:
            message += f'\n\nAttachments: {len(attachments)} file(s)'
            for i, att in enumerate(attachments, 1):
                message += f'\n  {i}. {att.get("type", "unknown")} - {att.get("url", "")}'
        
        return message
    
    def _estimate_cost(
        self,
        plain_text: str,
        attachments: Optional[List[Dict]] = None
    ) -> float:
        """
        Estimate cost of LLM call.
        
        Args:
            plain_text: Input text
            attachments: Optional attachments
            
        Returns:
            Estimated cost in USD
        """
        # Rough estimate: ~4 characters per token
        system_prompt_tokens = len(self._build_system_prompt()) // 4
        user_message_tokens = len(self._build_user_message(plain_text, attachments)) // 4
        input_tokens = system_prompt_tokens + user_message_tokens
        
        # Estimate output tokens (assume JSON response ~100 tokens)
        output_tokens = 100
        
        cost = (
            input_tokens * self.COST_PER_INPUT_TOKEN +
            output_tokens * self.COST_PER_OUTPUT_TOKEN
        )
        
        return cost
    
    def get_usage_stats(self) -> Dict[str, Any]:
        """Get usage statistics."""
        return {
            'enabled': self.enabled,
            'available': self.is_available(),
            'call_count': self.call_count,
            'total_cost_usd': round(self.total_cost_today, 4),
            'remaining_budget_usd': round(self.MAX_DAILY_COST_USD - self.total_cost_today, 4)
        }
