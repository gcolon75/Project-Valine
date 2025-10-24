"""
Tests for UX Agent functionality.
"""
import unittest
from unittest.mock import Mock, MagicMock
from app.agents.ux_agent import UXAgent, ConversationState


class TestUXAgent(unittest.TestCase):
    """Test cases for UX Agent."""

    def setUp(self):
        """Set up test fixtures."""
        self.mock_github_service = Mock()
        self.agent = UXAgent(
            github_service=self.mock_github_service,
            repo="gcolon75/Project-Valine"
        )

    def test_parse_command_valid_header_text(self):
        """Test parsing valid header text update command."""
        command = 'section:header text:"Welcome Home!"'
        result = self.agent.parse_command(command)
        
        self.assertTrue(result['success'])
        self.assertEqual(result['section'], 'header')
        self.assertEqual(result['updates']['text'], 'Welcome Home!')

    def test_parse_command_valid_footer_color(self):
        """Test parsing valid footer color update command."""
        command = 'section:footer color:"#FF0080"'
        result = self.agent.parse_command(command)
        
        self.assertTrue(result['success'])
        self.assertEqual(result['section'], 'footer')
        self.assertEqual(result['updates']['color'], '#FF0080')

    def test_parse_command_valid_navbar_link(self):
        """Test parsing valid navbar link addition command."""
        command = 'section:navbar add-link:"/about"'
        result = self.agent.parse_command(command)
        
        self.assertTrue(result['success'])
        self.assertEqual(result['section'], 'navbar')
        self.assertEqual(result['updates']['add-link'], '/about')

    def test_parse_command_missing_section(self):
        """Test parsing command without section parameter."""
        command = 'text:"Welcome Home!"'
        result = self.agent.parse_command(command)
        
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], 'Missing section parameter')
        self.assertIn('Missing section', result['message'])

    def test_parse_command_no_updates(self):
        """Test parsing command without any updates."""
        command = 'section:header'
        result = self.agent.parse_command(command)
        
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], 'No updates specified')

    def test_parse_command_multiple_updates(self):
        """Test parsing command with multiple updates."""
        command = 'section:header text:"New Title" color:"#00FF00"'
        result = self.agent.parse_command(command)
        
        self.assertTrue(result['success'])
        self.assertEqual(result['section'], 'header')
        self.assertEqual(result['updates']['text'], 'New Title')
        self.assertEqual(result['updates']['color'], '#00FF00')

    def test_process_update_invalid_section(self):
        """Test processing update with invalid section."""
        result = self.agent.process_update(
            section='invalid-section',
            updates={'text': 'Test'},
            requester='testuser'
        )
        
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], 'invalid_section')
        self.assertIn('Unknown section', result['message'])

    def test_process_update_invalid_property(self):
        """Test processing update with invalid property for section."""
        result = self.agent.process_update(
            section='header',
            updates={'invalid-prop': 'Test'},
            requester='testuser'
        )
        
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], 'invalid_property')
        self.assertIn('Invalid properties', result['message'])

    def test_process_update_valid_header_text(self):
        """Test processing valid header text update."""
        result = self.agent.process_update(
            section='header',
            updates={'text': 'Welcome to Project Valine!'},
            requester='testuser'
        )
        
        self.assertTrue(result['success'])
        self.assertIn('pr_url', result)
        self.assertIn('pr_number', result)
        self.assertIn('changes', result)

    def test_process_update_valid_footer_text(self):
        """Test processing valid footer text update."""
        result = self.agent.process_update(
            section='footer',
            updates={'text': 'Project Valine'},
            requester='testuser'
        )
        
        self.assertTrue(result['success'])
        self.assertIn('Draft PR', result['message'])

    def test_process_update_valid_navbar_brand(self):
        """Test processing valid navbar brand update."""
        result = self.agent.process_update(
            section='navbar',
            updates={'brand': 'Joint'},
            requester='testuser'
        )
        
        self.assertTrue(result['success'])
        self.assertIn('pr_url', result)

    def test_process_update_valid_home_hero_text(self):
        """Test processing valid home hero text update."""
        result = self.agent.process_update(
            section='home',
            updates={'hero-text': 'Your Creative Hub'},
            requester='testuser'
        )
        
        self.assertTrue(result['success'])
        self.assertIn('pr_url', result)

    def test_generate_text_change_header(self):
        """Test generating text change for header."""
        section_info = self.agent.SECTION_MAPPINGS['header']
        result = self.agent._generate_text_change('header', section_info, 'New Title')
        
        self.assertTrue(result['success'])
        self.assertEqual(result['type'], 'text')
        self.assertEqual(result['file'], 'src/components/Header.jsx')
        self.assertIn('pattern', result)
        self.assertIn('replacement', result)

    def test_generate_color_change_valid(self):
        """Test generating color change with valid hex color."""
        section_info = self.agent.SECTION_MAPPINGS['footer']
        result = self.agent._generate_color_change('footer', section_info, '#FF0080')
        
        self.assertTrue(result['success'])
        self.assertEqual(result['type'], 'color')
        self.assertEqual(result['value'], '#FF0080')

    def test_generate_color_change_invalid(self):
        """Test generating color change with invalid color format."""
        section_info = self.agent.SECTION_MAPPINGS['footer']
        result = self.agent._generate_color_change('footer', section_info, 'red')
        
        self.assertFalse(result['success'])
        self.assertIn('Invalid color format', result['message'])

    def test_generate_link_change_with_label(self):
        """Test generating link change with label."""
        section_info = self.agent.SECTION_MAPPINGS['navbar']
        result = self.agent._generate_link_change('navbar', section_info, 'About:/about')
        
        self.assertTrue(result['success'])
        self.assertEqual(result['type'], 'link')
        self.assertEqual(result['label'], 'About')
        self.assertEqual(result['path'], '/about')

    def test_generate_link_change_without_label(self):
        """Test generating link change without label."""
        section_info = self.agent.SECTION_MAPPINGS['navbar']
        result = self.agent._generate_link_change('navbar', section_info, '/about')
        
        self.assertTrue(result['success'])
        self.assertEqual(result['type'], 'link')
        self.assertEqual(result['label'], 'About')
        self.assertEqual(result['path'], '/about')

    def test_section_mappings(self):
        """Test that section mappings are properly defined."""
        self.assertIn('header', self.agent.SECTION_MAPPINGS)
        self.assertIn('footer', self.agent.SECTION_MAPPINGS)
        self.assertIn('navbar', self.agent.SECTION_MAPPINGS)
        self.assertIn('home', self.agent.SECTION_MAPPINGS)
        
        # Check header mapping
        header = self.agent.SECTION_MAPPINGS['header']
        self.assertEqual(header['file'], 'src/components/Header.jsx')
        self.assertIn('text', header['properties'])
        self.assertIn('color', header['properties'])

    def test_pr_body_generation(self):
        """Test PR body generation."""
        updates = {'text': 'New Title'}
        changes = {
            'changes': [
                {'description': 'Update header brand text to "New Title"'}
            ]
        }
        
        body = self.agent._generate_pr_body('header', updates, changes, 'testuser')
        
        self.assertIn('UX Update: Header', body)
        self.assertIn('@testuser', body)
        self.assertIn('Update header brand text', body)
        self.assertIn('/ux-update', body)
        self.assertIn('Review Checklist', body)


class TestConversationFlow(unittest.TestCase):
    """Test cases for conversation flow and confirmation."""

    def setUp(self):
        """Set up test fixtures."""
        self.mock_github_service = Mock()
        self.agent = UXAgent(
            github_service=self.mock_github_service,
            repo="gcolon75/Project-Valine"
        )

    def test_start_conversation_with_valid_command(self):
        """Test starting conversation with valid command."""
        result = self.agent.start_conversation(
            command_text='section:header text:"Level Up!"',
            user_id='user123'
        )
        
        self.assertTrue(result['success'])
        self.assertIn('conversation_id', result)
        self.assertIn('preview', result)
        self.assertTrue(result['needs_confirmation'])
        self.assertIn('Level Up!', result['message'])

    def test_start_conversation_needs_clarification(self):
        """Test conversation that needs clarification."""
        result = self.agent.start_conversation(
            plain_text='Make it blue',
            user_id='user123'
        )
        
        self.assertTrue(result['success'])
        self.assertTrue(result.get('needs_clarification', False))
        self.assertIn('questions', result)
        self.assertGreater(len(result['questions']), 0)

    def test_start_conversation_with_images(self):
        """Test conversation with image attachments."""
        images = [
            {'url': 'https://example.com/image1.png'},
            {'url': 'https://example.com/image2.png'}
        ]
        
        result = self.agent.start_conversation(
            plain_text='Make the navbar like in the screenshot',
            user_id='user123',
            images=images
        )
        
        self.assertTrue(result['success'])
        # Should need clarification about what specifically to change
        self.assertTrue(result.get('needs_clarification', False))

    def test_confirm_and_execute_yes(self):
        """Test confirming and executing changes."""
        # Start conversation
        conv_result = self.agent.start_conversation(
            command_text='section:header text:"Test Title"',
            user_id='user123'
        )
        
        conv_id = conv_result['conversation_id']
        
        # Confirm
        result = self.agent.confirm_and_execute(
            conversation_id=conv_id,
            user_response='yes'
        )
        
        self.assertTrue(result['success'])
        self.assertIn('pr_url', result)

    def test_confirm_and_execute_no(self):
        """Test cancelling a conversation."""
        # Start conversation
        conv_result = self.agent.start_conversation(
            command_text='section:header text:"Test Title"',
            user_id='user123'
        )
        
        conv_id = conv_result['conversation_id']
        
        # Cancel
        result = self.agent.confirm_and_execute(
            conversation_id=conv_id,
            user_response='no'
        )
        
        self.assertTrue(result['success'])
        self.assertTrue(result.get('cancelled', False))
        self.assertIn('cancelled', result['message'].lower())

    def test_confirm_and_execute_modification(self):
        """Test modifying request during confirmation."""
        # Start conversation
        conv_result = self.agent.start_conversation(
            command_text='section:header text:"Test Title"',
            user_id='user123'
        )
        
        conv_id = conv_result['conversation_id']
        
        # Modify
        result = self.agent.confirm_and_execute(
            conversation_id=conv_id,
            user_response='Actually make it "New Title" instead'
        )
        
        self.assertTrue(result['success'])
        self.assertTrue(result.get('needs_confirmation', False))
        self.assertIn('preview', result)

    def test_parse_plain_text_with_section(self):
        """Test parsing plain text with section mention."""
        intent = self.agent._parse_plain_text('Update the navbar to blue')
        
        self.assertEqual(intent['mentioned_section'], 'navbar')
        self.assertEqual(intent['color_name'], 'blue')

    def test_parse_plain_text_with_hex_color(self):
        """Test parsing plain text with hex color."""
        intent = self.agent._parse_plain_text('Change to #FF0080')
        
        self.assertEqual(intent['color'], '#FF0080')

    def test_parse_plain_text_with_quoted_text(self):
        """Test parsing plain text with quoted content."""
        intent = self.agent._parse_plain_text('Set header to "Welcome Home!"')
        
        self.assertIn('Welcome Home!', intent['quoted_text'])

    def test_generate_preview_with_text_update(self):
        """Test generating preview for text update."""
        conversation = ConversationState('conv123', 'user123')
        conversation.section = 'header'
        conversation.updates = {'text': 'Level Up!'}
        
        preview = self.agent._generate_preview(conversation)
        
        self.assertTrue(preview['success'])
        self.assertIn('Level Up!', preview['message'])
        self.assertIn('jsx', preview['code_snippets'][0]['language'])

    def test_generate_preview_with_color_update(self):
        """Test generating preview for color update."""
        conversation = ConversationState('conv123', 'user123')
        conversation.section = 'footer'
        conversation.updates = {'color': '#FF0080'}
        
        preview = self.agent._generate_preview(conversation)
        
        self.assertTrue(preview['success'])
        self.assertIn('#FF0080', preview['message'])
        self.assertIn('css', preview['code_snippets'][0]['language'])

    def test_conversation_state_to_dict(self):
        """Test converting conversation state to dictionary."""
        conversation = ConversationState('conv123', 'user123')
        conversation.section = 'header'
        conversation.updates = {'text': 'Test'}
        
        data = conversation.to_dict()
        
        self.assertEqual(data['conversation_id'], 'conv123')
        self.assertEqual(data['user_id'], 'user123')
        self.assertEqual(data['section'], 'header')
        self.assertEqual(data['updates'], {'text': 'Test'})

    def test_get_command_examples(self):
        """Test getting command examples."""
        examples = self.agent._get_command_examples()
        
        self.assertIsInstance(examples, list)
        self.assertGreater(len(examples), 0)
        self.assertTrue(any('header' in ex for ex in examples))
        self.assertTrue(any('footer' in ex for ex in examples))


# Command handler tests are integration tests that require full environment
# They are tested separately in the integration test suite


if __name__ == '__main__':
    unittest.main()
