"""
Test the Phase 3 QA Checker agent prompt for completeness and structure.

This test validates that the agent prompt document contains all required
sections and acceptance criteria for Phase 3 QoL commands validation.
"""

import os
import re
import unittest


class TestPhase3QAPrompt(unittest.TestCase):
    """Test the Phase 3 QA Checker agent prompt document."""

    @classmethod
    def setUpClass(cls):
        """Load the Phase 3 QA checker prompt document."""
        prompt_path = os.path.join(
            os.path.dirname(__file__),
            "..",
            "agent-prompts",
            "phase3_qa_checker.md"
        )
        with open(prompt_path, 'r') as f:
            cls.content = f.read()

    def test_file_exists(self):
        """Test that the phase3_qa_checker.md file exists."""
        prompt_path = os.path.join(
            os.path.dirname(__file__),
            "..",
            "agent-prompts",
            "phase3_qa_checker.md"
        )
        self.assertTrue(os.path.exists(prompt_path))

    def test_required_sections_exist(self):
        """Test that all required main sections are present."""
        required_sections = [
            "Purpose",
            "Role",
            "System Prompt",
            "Acceptance Matrix",
            "User Prompt Template",
            "Output Format Template",
            "Operational Guidance",
            "Example Usage",
            "Related Files",
            "Version History"
        ]
        
        for section in required_sections:
            with self.subTest(section=section):
                pattern = rf"^## {re.escape(section)}"
                self.assertIsNotNone(
                    re.search(pattern, self.content, re.MULTILINE),
                    f"Section '## {section}' not found"
                )

    def test_acceptance_criteria_exist(self):
        """Test that all acceptance criteria sections are present."""
        criteria = [
            "/status Behavior",
            "/deploy-client Behavior",
            "Admin Setters",
            "Guardrails and Safety",
            "UX and Formatting",
            "Tests, Docs, CI"
        ]
        
        for criterion in criteria:
            with self.subTest(criterion=criterion):
                self.assertIn(
                    criterion,
                    self.content,
                    f"Acceptance criterion '{criterion}' not found"
                )

    def test_phase3_features_mentioned(self):
        """Test that key Phase 3 features are mentioned in the prompt."""
        features = [
            "ALLOW_SECRET_WRITES",
            "ADMIN_USER_IDS",
            "ADMIN_ROLE_IDS",
            "confirm:true",
            "fingerprint",
            "api_base",
            "wait=true",
            "URLValidator",
            "AdminAuthenticator",
            "TimeFormatter",
            "list_workflow_runs",
            "trigger_client_deploy",
            "update_repo_variable",
            "update_repo_secret"
        ]
        
        for feature in features:
            with self.subTest(feature=feature):
                self.assertIn(
                    feature,
                    self.content,
                    f"Feature '{feature}' not mentioned"
                )

    def test_security_requirements_mentioned(self):
        """Test that security requirements are explicitly mentioned."""
        security_keywords = [
            "No secrets in logs",
            "URL validation",
            "HTTPS",
            "private IP",
            "localhost",
            "Rate limiting",
            "exponential backoff",
            "encrypt",
            "fingerprint",
            "two-factor"
        ]
        
        found_count = sum(1 for keyword in security_keywords if keyword in self.content)
        self.assertGreaterEqual(
            found_count,
            len(security_keywords) * 0.8,  # At least 80% must be present
            f"Only {found_count}/{len(security_keywords)} security keywords found"
        )

    def test_evidence_requirements_exist(self):
        """Test that evidence gathering requirements are specified."""
        evidence_patterns = [
            r"Evidence to gather:",
            r"File:.*orchestrator",
            r"Line references",
            r"Test file:",
            r"Example.*transcript"
        ]
        
        for pattern in evidence_patterns:
            with self.subTest(pattern=pattern):
                self.assertIsNotNone(
                    re.search(pattern, self.content, re.IGNORECASE),
                    f"Evidence pattern '{pattern}' not found"
                )

    def test_output_format_specified(self):
        """Test that output format template is specified."""
        output_markers = [
            "QA: Phase 3 QoL Commands Validation",
            "Status: [PASS | FAIL]",
            "Acceptance Checklist",
            "Evidence Summary",
            "Fixes Required",
            "Final Verdict"
        ]
        
        for marker in output_markers:
            with self.subTest(marker=marker):
                self.assertIn(
                    marker,
                    self.content,
                    f"Output format marker '{marker}' not found"
                )

    def test_example_usage_provided(self):
        """Test that example usage is provided."""
        self.assertIn("Example Usage", self.content)
        self.assertIn("Full Example with Real Values", self.content)
        self.assertIn("gcolon75/Project-Valine", self.content)

    def test_placeholder_values_documented(self):
        """Test that placeholder values are documented."""
        self.assertIn("Placeholder Values", self.content)
        self.assertIn("{{owner}}", self.content)
        self.assertIn("{{repo}}", self.content)
        self.assertIn("{{pr_url_or_number}}", self.content)

    def test_operational_constraints_specified(self):
        """Test that operational constraints are specified."""
        constraints = [
            "Rate Limiting",
            "Timeboxing",
            "Security Considerations"
        ]
        
        for constraint in constraints:
            with self.subTest(constraint=constraint):
                self.assertIn(
                    constraint,
                    self.content,
                    f"Constraint '{constraint}' not specified"
                )

    def test_file_structure_reasonable(self):
        """Test that the file has reasonable structure."""
        lines = self.content.split('\n')
        self.assertGreater(len(lines), 500, "Document should have >500 lines")
        self.assertLess(len(lines), 1000, "Document should have <1000 lines")
        
        # Count main sections (##)
        main_sections = len(re.findall(r'^## ', self.content, re.MULTILINE))
        self.assertGreater(main_sections, 10, "Should have >10 main sections")
        
        # Count subsections (###)
        subsections = len(re.findall(r'^### ', self.content, re.MULTILINE))
        self.assertGreater(subsections, 15, "Should have >15 subsections")

    def test_version_history_present(self):
        """Test that version history is present and dated."""
        self.assertIn("Version History", self.content)
        self.assertIn("v1.0", self.content)
        self.assertRegex(
            self.content,
            r"202[4-5]-\d{2}-\d{2}",
            "Should contain a date in format YYYY-MM-DD"
        )


if __name__ == '__main__':
    unittest.main()
