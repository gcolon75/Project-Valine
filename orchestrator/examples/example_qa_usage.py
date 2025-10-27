#!/usr/bin/env python3
"""
Example usage of the QA Checker agent.

This script demonstrates how to use the QA Checker programmatically
to validate Phase 3 and Phase 4 PRs.
"""
import os
from app.agents.qa_checker import QAChecker, PRValidationResult


def example_basic_usage():
    """Example 1: Basic usage - validate two PRs."""
    print("=" * 80)
    print("Example 1: Basic Usage")
    print("=" * 80)
    print()
    
    # Set up (you would need actual token and PR numbers)
    github_token = os.environ.get('GITHUB_TOKEN', 'dummy-token-for-example')
    repo = "gcolon75/Project-Valine"
    pr1_number = 27  # Replace with actual PR number
    pr2_number = 28  # Replace with actual PR number
    
    # Create checker
    checker = QAChecker(repo, github_token)
    
    print(f"Repository: {repo}")
    print(f"PR #1 (Phase 3): {pr1_number}")
    print(f"PR #2 (Phase 4): {pr2_number}")
    print()
    
    # Note: This is just for demonstration. In real usage, you would:
    # result1 = checker.validate_pr1_deploy_client_polish(pr1_number)
    # result2 = checker.validate_pr2_multi_agent_foundation(pr2_number)
    
    print("✓ QA checker initialized")
    print("✓ Use validate_pr1_deploy_client_polish() for Phase 3")
    print("✓ Use validate_pr2_multi_agent_foundation() for Phase 4")
    print()


def example_custom_validation():
    """Example 2: Custom validation result."""
    print("=" * 80)
    print("Example 2: Custom Validation Result")
    print("=" * 80)
    print()
    
    # Create a validation result manually
    result = PRValidationResult()
    
    # Add some checks
    result.add_check("Workflow YAML Modified", True, "Found client-deploy.yml")
    result.add_check("Correlation ID Input", True, "correlation_id input present")
    result.add_check("Run Name Updated", True, "run-name includes correlation_id")
    result.add_check("Dispatcher Implementation", True, "trigger_client_deploy found")
    result.add_check("Polling Logic", False, "poll_run_conclusion not implemented")
    
    # Add evidence
    result.add_evidence("Files Changed", {
        'workflow': '.github/workflows/client-deploy.yml',
        'dispatcher': 'app/services/github_actions_dispatcher.py',
        'handler': 'app/handlers/discord_handler.py'
    })
    
    # Add fixes (for failed checks)
    result.add_fix(
        "Implement poll_run_conclusion method in GitHubActionsDispatcher",
        "app/services/github_actions_dispatcher.py",
        line_number=664
    )
    
    print(f"Status: {result.status}")
    print(f"Checks: {len(result.checks)} total")
    print(f"  - Passed: {sum(1 for c in result.checks if c['passed'])}")
    print(f"  - Failed: {sum(1 for c in result.checks if not c['passed'])}")
    print(f"Evidence items: {len(result.evidence)}")
    print(f"Required fixes: {len(result.fixes)}")
    print()
    
    # Format as review comment
    checker = QAChecker("owner/repo", "token")
    review = checker.format_review_comment(result, "Example PR Title")
    
    print("Review Comment Preview:")
    print("-" * 80)
    # Print first 500 characters of review
    preview = review[:500] + "..." if len(review) > 500 else review
    print(preview)
    print()


def example_check_methods():
    """Example 3: Understanding check methods."""
    print("=" * 80)
    print("Example 3: Check Methods")
    print("=" * 80)
    print()
    
    print("Phase 3 (PR1) Check Methods:")
    print("  1. _check_workflow_inputs() - Validates workflow YAML changes")
    print("  2. _check_dispatcher_implementation() - Validates dispatcher code")
    print("  3. _check_discord_handler_wait_flow() - Validates Discord handler")
    print("  4. _check_guardrails() - Validates safety measures")
    print("  5. _check_tests_and_docs() - Validates tests and documentation")
    print()
    
    print("Phase 4 (PR2) Check Methods:")
    print("  1. _check_agent_registry() - Validates registry.py")
    print("  2. _check_agents_command() - Validates /agents command")
    print("  3. _check_status_digest_command() - Validates /status-digest command")
    print("  4. _check_multi_agent_guardrails() - Validates safety")
    print("  5. _check_multi_agent_tests_and_docs() - Validates tests/docs")
    print()
    
    print("Each check method:")
    print("  • Analyzes PR file patches")
    print("  • Looks for required keywords/patterns")
    print("  • Adds passing/failing checks to result")
    print("  • Adds fixes for failing checks")
    print()


def example_review_workflow():
    """Example 4: Complete review workflow."""
    print("=" * 80)
    print("Example 4: Complete Review Workflow")
    print("=" * 80)
    print()
    
    print("Step 1: Initialize QA Checker")
    print("  → checker = QAChecker(repo, github_token)")
    print()
    
    print("Step 2: Validate Phase 3 PR")
    print("  → result1 = checker.validate_pr1_deploy_client_polish(pr1)")
    print("  → Checks workflow inputs, dispatcher, handler, guardrails, tests")
    print()
    
    print("Step 3: Validate Phase 4 PR")
    print("  → result2 = checker.validate_pr2_multi_agent_foundation(pr2)")
    print("  → Checks registry, commands, guardrails, tests")
    print()
    
    print("Step 4: Format Review Comments")
    print("  → review1 = checker.format_review_comment(result1, title1)")
    print("  → review2 = checker.format_review_comment(result2, title2)")
    print()
    
    print("Step 5: Post Reviews (Optional)")
    print("  → checker.post_review(pr1, review1, approve=(result1.status=='PASS'))")
    print("  → checker.post_review(pr2, review2, approve=(result2.status=='PASS'))")
    print()
    
    print("Step 6: Review Results")
    print("  → If PASS: PR is approved automatically")
    print("  → If FAIL: PR gets request changes with actionable fixes")
    print()


def example_cli_usage():
    """Example 5: CLI usage."""
    print("=" * 80)
    print("Example 5: CLI Usage")
    print("=" * 80)
    print()
    
    print("Basic validation (print results only):")
    print("  $ python run_qa_checker.py 27 28")
    print()
    
    print("With custom repository:")
    print("  $ python run_qa_checker.py 27 28 --repo myorg/myrepo")
    print()
    
    print("Post reviews to GitHub:")
    print("  $ export GITHUB_TOKEN=ghp_xxxxx")
    print("  $ python run_qa_checker.py 27 28 --post-reviews")
    print()
    
    print("Verbose output:")
    print("  $ python run_qa_checker.py 27 28 --verbose")
    print()
    
    print("Help:")
    print("  $ python run_qa_checker.py --help")
    print()


def main():
    """Run all examples."""
    examples = [
        example_basic_usage,
        example_custom_validation,
        example_check_methods,
        example_review_workflow,
        example_cli_usage
    ]
    
    print()
    print("╔" + "═" * 78 + "╗")
    print("║" + " " * 20 + "QA Checker Agent - Usage Examples" + " " * 25 + "║")
    print("╚" + "═" * 78 + "╝")
    print()
    
    for i, example_func in enumerate(examples, 1):
        example_func()
        
        if i < len(examples):
            print()
            input("Press Enter to continue to next example...")
            print()
    
    print()
    print("=" * 80)
    print("All Examples Complete!")
    print("=" * 80)
    print()
    print("For more information, see:")
    print("  • docs/guides/agents/QA_CHECKER_GUIDE.md - Comprehensive guide")
    print("  • run_qa_checker.py - CLI script")
    print("  • tests/test_qa_checker.py - Unit tests")
    print()


if __name__ == '__main__':
    main()
