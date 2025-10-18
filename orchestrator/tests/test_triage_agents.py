"""
Tests for triage AI agents.
"""

import unittest
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from triage_agents import DevAgent, OpsAgent, AnalystAgent


class TestDevAgent(unittest.TestCase):
    """Test DevAgent functionality."""
    
    def setUp(self):
        self.agent = DevAgent()
    
    def test_analyze_missing_dependency(self):
        """Test analysis of missing dependency error."""
        failure = {
            "type": "missing_dependency",
            "message": "ModuleNotFoundError: No module named 'requests'",
            "file": "orchestrator/scripts/auto_triage_pr58.py",
            "line": 42
        }
        
        result = self.agent.analyze(failure)
        
        # Should have some confidence boost
        self.assertIn("confidence_boost", result)
        self.assertGreaterEqual(result["confidence_boost"], 0)
        
        # Should have insights and recommendations
        self.assertIn("insights", result)
        self.assertIn("recommendations", result)
        self.assertIsInstance(result["insights"], list)
        self.assertIsInstance(result["recommendations"], list)
    
    def test_extract_package_name(self):
        """Test package name extraction from error messages."""
        test_cases = [
            ("ModuleNotFoundError: No module named 'requests'", "requests"),
            ("ImportError: No module named 'boto3'", "boto3"),
            ("No module named 'PyGithub'", "PyGithub"),
        ]
        
        for message, expected in test_cases:
            result = self.agent._extract_package_name(message)
            self.assertEqual(result, expected, f"Failed for message: {message}")
    
    def test_non_dependency_failure(self):
        """Test that agent skips non-dependency failures."""
        failure = {
            "type": "test_failure",
            "message": "AssertionError: test failed"
        }
        
        result = self.agent.analyze(failure)
        
        # Should return empty result for non-dependency failures
        self.assertEqual(result["confidence_boost"], 0)
        self.assertEqual(result["insights"], [])


class TestOpsAgent(unittest.TestCase):
    """Test OpsAgent functionality."""
    
    def setUp(self):
        self.agent = OpsAgent()
    
    def test_analyze_existing_package(self):
        """Test analysis of a known existing package."""
        failure = {
            "type": "missing_dependency",
            "message": "ModuleNotFoundError: No module named 'requests'",
        }
        
        result = self.agent.analyze(failure)
        
        # Should find requests on PyPI
        self.assertIn("confidence_boost", result)
        # Requests exists, so should have positive boost
        self.assertGreaterEqual(result["confidence_boost"], 0)
        
        # Should have insights
        self.assertIn("insights", result)
        self.assertGreater(len(result["insights"]), 0)
    
    def test_analyze_nonexistent_package(self):
        """Test analysis of a package that doesn't exist."""
        failure = {
            "type": "missing_dependency",
            "message": "ModuleNotFoundError: No module named 'this_package_definitely_does_not_exist_12345'",
        }
        
        result = self.agent.analyze(failure)
        
        # Should have negative boost or zero
        self.assertLessEqual(result["confidence_boost"], 0)
        
        # Should have insights indicating not found
        self.assertIn("insights", result)
        insights_text = " ".join(result["insights"])
        self.assertIn("not found", insights_text.lower())
    
    def test_extract_package_name(self):
        """Test package name extraction."""
        message = "ModuleNotFoundError: No module named 'requests'"
        result = self.agent._extract_package_name(message)
        self.assertEqual(result, "requests")


class TestAnalystAgent(unittest.TestCase):
    """Test AnalystAgent functionality."""
    
    def setUp(self):
        self.agent = AnalystAgent()
    
    def test_clear_error_message(self):
        """Test that clear error messages get higher confidence."""
        failure_clear = {
            "type": "missing_dependency",
            "message": "ModuleNotFoundError: No module named 'requests'",
            "file": "test.py",
            "line": 10
        }
        
        failure_unclear = {
            "type": "unknown",
            "message": "Some vague error occurred during build process",
        }
        
        result_clear = self.agent.analyze(failure_clear)
        result_unclear = self.agent.analyze(failure_unclear)
        
        # Clear error should have higher confidence
        self.assertGreater(
            result_clear.get("final_confidence", 0),
            result_unclear.get("final_confidence", 0)
        )
    
    def test_file_and_line_boost(self):
        """Test that having file and line number increases confidence."""
        failure_with_location = {
            "type": "missing_dependency",
            "message": "ModuleNotFoundError: No module named 'requests'",
            "file": "orchestrator/test.py",
            "line": 42
        }
        
        failure_without_location = {
            "type": "missing_dependency",
            "message": "ModuleNotFoundError: No module named 'requests'",
        }
        
        result_with = self.agent.analyze(failure_with_location)
        result_without = self.agent.analyze(failure_without_location)
        
        # With location should have higher confidence
        self.assertGreater(
            result_with.get("final_confidence", 0),
            result_without.get("final_confidence", 0)
        )
    
    def test_priority_classification(self):
        """Test priority classification based on confidence."""
        high_conf_failure = {
            "type": "missing_dependency",
            "message": "ModuleNotFoundError: No module named 'requests'",
            "file": "test_module.py",
            "line": 10,
            "context": "Some context here to help debug"
        }
        
        result = self.agent.analyze(high_conf_failure)
        
        # Should have insights
        insights = result.get("insights", [])
        self.assertGreater(len(insights), 0)
        
        # Should classify priority
        insights_text = " ".join(insights)
        self.assertTrue(
            any(priority in insights_text for priority in ["Quick win", "Medium priority", "Needs review"])
        )


class TestAgentIntegration(unittest.TestCase):
    """Test agents working together."""
    
    def test_all_agents_on_same_failure(self):
        """Test running all three agents on the same failure."""
        failure = {
            "type": "missing_dependency",
            "message": "ModuleNotFoundError: No module named 'requests'",
            "file": "orchestrator/scripts/test.py",
            "line": 42,
            "context": "import requests\nrequests.get('http://example.com')"
        }
        
        agents = [
            DevAgent(),
            OpsAgent(),
            AnalystAgent()
        ]
        
        all_insights = []
        total_boost = 0
        
        for agent in agents:
            result = agent.analyze(failure)
            all_insights.extend(result.get("insights", []))
            total_boost += result.get("confidence_boost", 0)
        
        # All agents should provide insights
        self.assertGreater(len(all_insights), 0)
        
        # Combined boost should be reasonable
        self.assertGreaterEqual(total_boost, 0)


if __name__ == '__main__':
    unittest.main()
