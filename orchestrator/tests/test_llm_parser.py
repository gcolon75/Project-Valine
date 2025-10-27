"""Tests for LLM Intent Parser."""

import unittest
import os
import json
from unittest.mock import Mock, MagicMock, patch


class TestLLMIntentParser(unittest.TestCase):
    """Test cases for LLMIntentParser."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Clear environment variables
        os.environ.pop('USE_LLM_PARSING', None)
        os.environ.pop('OPENAI_API_KEY', None)
    
    def test_initialization_disabled_by_default(self):
        """Test that LLM parsing is disabled by default."""
        from app.agents.ux_agent_modules.llm_intent_parser import LLMIntentParser
        
        parser = LLMIntentParser()
        
        self.assertFalse(parser.enabled)
        self.assertFalse(parser.is_available())
    
    def test_initialization_enabled_with_env_var(self):
        """Test enabling LLM parsing via environment variable."""
        os.environ['USE_LLM_PARSING'] = 'true'
        os.environ['OPENAI_API_KEY'] = 'test_key'
        
        with patch('app.agents.ux_agent_modules.llm_intent_parser.openai'):
            from app.agents.ux_agent_modules.llm_intent_parser import LLMIntentParser
            parser = LLMIntentParser()
            
            self.assertTrue(parser.enabled)
            # Will be False because openai is mocked but not initialized properly
            # In real tests, we'd mock the full client
    
    def test_initialization_with_parameters(self):
        """Test initialization with explicit parameters."""
        from app.agents.ux_agent_modules.llm_intent_parser import LLMIntentParser
        
        parser = LLMIntentParser(api_key='test_key', enable_llm=True)
        
        self.assertTrue(parser.enabled)
        self.assertEqual(parser.api_key, 'test_key')
    
    def test_parse_intent_skipped_when_disabled(self):
        """Test that parsing is skipped when LLM is disabled."""
        from app.agents.ux_agent_modules.llm_intent_parser import LLMIntentParser
        
        parser = LLMIntentParser(enable_llm=False)
        result = parser.parse_intent('Make the navbar blue')
        
        self.assertFalse(result['success'])
        self.assertTrue(result.get('skipped'))
        self.assertEqual(result['reason'], 'llm_disabled')
    
    def test_parse_intent_skipped_without_api_key(self):
        """Test that parsing is skipped without API key."""
        from app.agents.ux_agent_modules.llm_intent_parser import LLMIntentParser
        
        parser = LLMIntentParser(enable_llm=True, api_key='')
        result = parser.parse_intent('Make the navbar blue')
        
        self.assertFalse(result['success'])
        self.assertTrue(result.get('skipped'))
    
    @patch('app.agents.ux_agent_modules.llm_intent_parser.openai')
    def test_parse_intent_success(self, mock_openai_module):
        """Test successful intent parsing with mocked OpenAI."""
        from app.agents.ux_agent_modules.llm_intent_parser import LLMIntentParser
        
        # Mock OpenAI client and response
        mock_client = MagicMock()
        mock_openai_module.OpenAI.return_value = mock_client
        
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps({
            'action': 'update',
            'section': 'navbar',
            'updates': {'color': '#0000FF'},
            'confidence': 'high'
        })
        mock_response.usage.prompt_tokens = 100
        mock_response.usage.completion_tokens = 50
        
        mock_client.chat.completions.create.return_value = mock_response
        
        # Create parser with explicit client
        parser = LLMIntentParser(api_key='test_key', enable_llm=True)
        parser._openai_available = True
        parser.openai_client = mock_client  # Override client
        parser.openai_client = mock_client  # Override client
        
        # Parse intent
        result = parser.parse_intent('Make the navbar blue')
        
        self.assertTrue(result['success'])
        self.assertIn('intent', result)
        self.assertEqual(result['intent']['section'], 'navbar')
        self.assertEqual(result['intent']['updates']['color'], '#0000FF')
        self.assertIn('cost_usd', result)
        self.assertIn('input_tokens', result)
        self.assertIn('output_tokens', result)
    
    @patch('app.agents.ux_agent_modules.llm_intent_parser.openai')
    def test_parse_intent_with_markdown_json(self, mock_openai_module):
        """Test parsing JSON from markdown code block."""
        from app.agents.ux_agent_modules.llm_intent_parser import LLMIntentParser
        
        # Mock OpenAI client
        mock_client = MagicMock()
        mock_openai_module.OpenAI.return_value = mock_client
        
        # Response with markdown code block
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = '''Here is the parsed intent:
```json
{
  "action": "update",
  "section": "header",
  "updates": {"text": "Welcome"},
  "confidence": "high"
}
```
'''
        mock_response.usage.prompt_tokens = 100
        mock_response.usage.completion_tokens = 50
        
        mock_client.chat.completions.create.return_value = mock_response
        
        parser = LLMIntentParser(api_key='test_key', enable_llm=True)
        parser._openai_available = True
        parser.openai_client = mock_client  # Override client
        
        result = parser.parse_intent('Change header to Welcome')
        
        self.assertTrue(result['success'])
        self.assertEqual(result['intent']['section'], 'header')
    
    @patch('app.agents.ux_agent_modules.llm_intent_parser.openai')
    def test_parse_intent_clarification_needed(self, mock_openai_module):
        """Test parsing when clarification is needed."""
        from app.agents.ux_agent_modules.llm_intent_parser import LLMIntentParser
        
        mock_client = MagicMock()
        mock_openai_module.OpenAI.return_value = mock_client
        
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps({
            'action': 'clarify_needed',
            'section': None,
            'updates': None,
            'confidence': 'low',
            'clarification_questions': [
                'Which section do you want to update?',
                'What specifically do you want to change?'
            ]
        })
        mock_response.usage.prompt_tokens = 100
        mock_response.usage.completion_tokens = 50
        
        mock_client.chat.completions.create.return_value = mock_response
        
        parser = LLMIntentParser(api_key='test_key', enable_llm=True)
        parser._openai_available = True
        parser.openai_client = mock_client  # Override client
        
        result = parser.parse_intent('Update the page')
        
        self.assertTrue(result['success'])
        self.assertEqual(result['intent']['action'], 'clarify_needed')
        self.assertIsNone(result['intent']['section'])
    
    @patch('app.agents.ux_agent_modules.llm_intent_parser.openai')
    def test_cost_tracking(self, mock_openai_module):
        """Test cost tracking functionality."""
        from app.agents.ux_agent_modules.llm_intent_parser import LLMIntentParser
        
        mock_client = MagicMock()
        mock_openai_module.OpenAI.return_value = mock_client
        
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = '{"action": "update", "section": "navbar"}'
        mock_response.usage.prompt_tokens = 100
        mock_response.usage.completion_tokens = 50
        
        mock_client.chat.completions.create.return_value = mock_response
        
        parser = LLMIntentParser(api_key='test_key', enable_llm=True)
        parser._openai_available = True
        parser.openai_client = mock_client  # Override client
        
        # First call
        result1 = parser.parse_intent('Make navbar blue')
        self.assertTrue(result1['success'])
        
        # Check stats
        stats = parser.get_usage_stats()
        self.assertEqual(stats['call_count'], 1)
        self.assertGreater(parser.total_cost_today, 0)  # Check internal value, not rounded
        
        # Second call
        result2 = parser.parse_intent('Change header text')
        self.assertTrue(result2['success'])
        
        # Check updated stats
        stats = parser.get_usage_stats()
        self.assertEqual(stats['call_count'], 2)
        self.assertGreater(parser.total_cost_today, 0)
    
    @patch('app.agents.ux_agent_modules.llm_intent_parser.openai')
    def test_cost_limit_enforcement(self, mock_openai_module):
        """Test daily cost limit enforcement."""
        from app.agents.ux_agent_modules.llm_intent_parser import LLMIntentParser
        
        mock_client = MagicMock()
        mock_openai_module.OpenAI.return_value = mock_client
        
        parser = LLMIntentParser(api_key='test_key', enable_llm=True)
        parser._openai_available = True
        parser.openai_client = mock_client  # Override client
        
        # Set cost to max limit
        parser.total_cost_today = parser.MAX_DAILY_COST_USD
        
        result = parser.parse_intent('Make navbar blue')
        
        self.assertFalse(result['success'])
        self.assertTrue(result.get('skipped'))
        self.assertEqual(result['reason'], 'cost_limit_exceeded')
    
    @patch('app.agents.ux_agent_modules.llm_intent_parser.openai')
    def test_retry_on_failure(self, mock_openai_module):
        """Test retry mechanism on LLM call failure."""
        from app.agents.ux_agent_modules.llm_intent_parser import LLMIntentParser
        
        mock_client = MagicMock()
        mock_openai_module.OpenAI.return_value = mock_client
        
        # First two calls fail, third succeeds
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = '{"action": "update", "section": "navbar"}'
        mock_response.usage.prompt_tokens = 100
        mock_response.usage.completion_tokens = 50
        
        mock_client.chat.completions.create.side_effect = [
            Exception('API error'),
            Exception('API error'),
            mock_response
        ]
        
        parser = LLMIntentParser(api_key='test_key', enable_llm=True)
        parser._openai_available = True
        parser.openai_client = mock_client  # Override client
        
        result = parser.parse_intent('Make navbar blue')
        
        # Should succeed after retries
        self.assertTrue(result['success'])
        self.assertEqual(mock_client.chat.completions.create.call_count, 3)
    
    @patch('app.agents.ux_agent_modules.llm_intent_parser.openai')
    def test_retry_exhaustion(self, mock_openai_module):
        """Test behavior when all retries fail."""
        from app.agents.ux_agent_modules.llm_intent_parser import LLMIntentParser
        
        mock_client = MagicMock()
        mock_openai_module.OpenAI.return_value = mock_client
        
        # All calls fail
        mock_client.chat.completions.create.side_effect = Exception('API error')
        
        parser = LLMIntentParser(api_key='test_key', enable_llm=True)
        parser._openai_available = True
        parser.openai_client = mock_client  # Override client
        
        result = parser.parse_intent('Make navbar blue')
        
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], 'llm_call_failed')
    
    def test_estimate_cost(self):
        """Test cost estimation."""
        from app.agents.ux_agent_modules.llm_intent_parser import LLMIntentParser
        
        parser = LLMIntentParser()
        
        cost = parser._estimate_cost('Make the navbar blue')
        
        self.assertIsInstance(cost, float)
        self.assertGreater(cost, 0)
        self.assertLess(cost, 0.01)  # Should be very cheap per call
    
    def test_get_usage_stats(self):
        """Test usage statistics."""
        from app.agents.ux_agent_modules.llm_intent_parser import LLMIntentParser
        
        parser = LLMIntentParser(enable_llm=True, api_key='test_key')
        
        stats = parser.get_usage_stats()
        
        self.assertIn('enabled', stats)
        self.assertIn('available', stats)
        self.assertIn('call_count', stats)
        self.assertIn('total_cost_usd', stats)
        self.assertIn('remaining_budget_usd', stats)
        
        self.assertEqual(stats['call_count'], 0)
        self.assertEqual(stats['total_cost_usd'], 0.0)
    
    def test_system_prompt_generation(self):
        """Test system prompt contains necessary instructions."""
        from app.agents.ux_agent_modules.llm_intent_parser import LLMIntentParser
        
        parser = LLMIntentParser()
        prompt = parser._build_system_prompt()
        
        # Check for key elements
        self.assertIn('header', prompt)
        self.assertIn('footer', prompt)
        self.assertIn('navbar', prompt)
        self.assertIn('text', prompt)
        self.assertIn('color', prompt)
        self.assertIn('action', prompt)
        self.assertIn('section', prompt)
        self.assertIn('updates', prompt)
    
    def test_user_message_with_attachments(self):
        """Test user message building with attachments."""
        from app.agents.ux_agent_modules.llm_intent_parser import LLMIntentParser
        
        parser = LLMIntentParser()
        
        attachments = [
            {'type': 'image/png', 'url': 'https://example.com/image1.png'},
            {'type': 'image/jpeg', 'url': 'https://example.com/image2.jpg'}
        ]
        
        message = parser._build_user_message('Make it match this design', attachments)
        
        self.assertIn('Make it match this design', message)
        self.assertIn('2 file(s)', message)
        self.assertIn('image/png', message)


if __name__ == '__main__':
    unittest.main()
