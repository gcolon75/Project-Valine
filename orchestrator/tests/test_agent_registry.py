"""
Tests for agent registry.
Tests agent definitions and registry functions.
"""
import unittest
from app.agents.registry import get_agents, get_agent_by_id, AgentInfo


class TestAgentRegistry(unittest.TestCase):
    """Test cases for agent registry."""

    def test_get_agents_returns_list(self):
        """Test that get_agents returns a list."""
        agents = get_agents()
        self.assertIsInstance(agents, list)
        self.assertGreater(len(agents), 0)

    def test_all_agents_have_required_fields(self):
        """Test that all agents have required fields."""
        agents = get_agents()
        for agent in agents:
            self.assertIsInstance(agent, AgentInfo)
            self.assertIsInstance(agent.id, str)
            self.assertIsInstance(agent.name, str)
            self.assertIsInstance(agent.description, str)
            self.assertIsInstance(agent.command, str)
            
            # Ensure non-empty
            self.assertTrue(agent.id)
            self.assertTrue(agent.name)
            self.assertTrue(agent.description)
            self.assertTrue(agent.command)
            
            # Command should start with /
            self.assertTrue(agent.command.startswith('/'))

    def test_required_agents_exist(self):
        """Test that required agents are defined."""
        agents = get_agents()
        agent_ids = [agent.id for agent in agents]
        
        required_agents = [
            'deploy_verifier',
            'diagnose_runner',
            'status_reporter',
            'deploy_client'
        ]
        
        for required_id in required_agents:
            self.assertIn(required_id, agent_ids)

    def test_agent_ids_are_unique(self):
        """Test that agent IDs are unique."""
        agents = get_agents()
        agent_ids = [agent.id for agent in agents]
        
        self.assertEqual(len(agent_ids), len(set(agent_ids)))

    def test_get_agent_by_id_success(self):
        """Test getting agent by ID."""
        agent = get_agent_by_id('deploy_verifier')
        
        self.assertIsNotNone(agent)
        self.assertEqual(agent.id, 'deploy_verifier')
        self.assertEqual(agent.name, 'Deploy Verifier')
        self.assertIn('verify', agent.command.lower())

    def test_get_agent_by_id_not_found(self):
        """Test getting agent by non-existent ID."""
        agent = get_agent_by_id('nonexistent_agent')
        self.assertIsNone(agent)

    def test_deploy_verifier_agent(self):
        """Test deploy_verifier agent details."""
        agent = get_agent_by_id('deploy_verifier')
        
        self.assertEqual(agent.command, '/verify-latest')
        self.assertIn('deployment', agent.description.lower())

    def test_diagnose_runner_agent(self):
        """Test diagnose_runner agent details."""
        agent = get_agent_by_id('diagnose_runner')
        
        self.assertEqual(agent.command, '/diagnose')
        self.assertIn('diagnostic', agent.description.lower())

    def test_status_reporter_agent(self):
        """Test status_reporter agent details."""
        agent = get_agent_by_id('status_reporter')
        
        self.assertEqual(agent.command, '/status')
        self.assertIn('status', agent.description.lower())

    def test_deploy_client_agent(self):
        """Test deploy_client agent details."""
        agent = get_agent_by_id('deploy_client')
        
        self.assertEqual(agent.command, '/deploy-client')
        self.assertIn('deploy', agent.description.lower())


if __name__ == '__main__':
    unittest.main()
