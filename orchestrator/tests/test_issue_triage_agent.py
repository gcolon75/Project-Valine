#!/usr/bin/env python3
"""
Test script for Issue Triage Agent

Tests the core logic without making actual API calls.
"""

import sys
import os

# Add the scripts directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

# Mock the issue data
def test_summarize_issue():
    """Test issue summarization."""
    from issue_triage_agent import summarize_issue
    
    issue = {
        'title': 'Fix typo in README',
        'number': 42,
        'labels': [
            {'name': 'documentation'},
            {'name': 'good-first-issue'}
        ]
    }
    
    summary = summarize_issue(issue)
    expected = "#42: Fix typo in README [documentation/good-first-issue]"
    
    assert summary == expected, f"Expected '{expected}', got '{summary}'"
    print("✓ test_summarize_issue passed")

def test_auto_fix_typo():
    """Test auto-fix detection for typo issues."""
    from issue_triage_agent import try_auto_fix
    
    issue = {
        'title': 'Fix typo in README',
        'number': 42,
        'body': 'There is a spelling mistake on line 10',
        'labels': [{'name': 'documentation'}],
        'user': {'login': 'testuser'}
    }
    
    result = try_auto_fix(issue)
    assert "typo" in result.lower() or "fix" in result.lower()
    print(f"✓ test_auto_fix_typo passed: {result}")

def test_auto_fix_bug():
    """Test auto-fix detection for bug issues."""
    from issue_triage_agent import try_auto_fix
    
    issue = {
        'title': 'Login button not working',
        'number': 43,
        'body': 'When I click the login button, nothing happens',
        'labels': [{'name': 'bug'}],
        'user': {'login': 'testuser'}
    }
    
    result = try_auto_fix(issue)
    assert "bug" in result.lower() or "pr" in result.lower()
    print(f"✓ test_auto_fix_bug passed: {result}")

def test_auto_fix_feature():
    """Test auto-fix detection for feature requests."""
    from issue_triage_agent import try_auto_fix
    
    issue = {
        'title': 'Add dark mode',
        'number': 44,
        'body': 'It would be great to have a dark mode option',
        'labels': [{'name': 'feature'}],
        'user': {'login': 'testuser'}
    }
    
    result = try_auto_fix(issue)
    assert "feature" in result.lower() or "enhancement" in result.lower() or "proposal" in result.lower()
    print(f"✓ test_auto_fix_feature passed: {result}")

def test_auto_fix_missing_info():
    """Test auto-fix detection for issues missing information."""
    from issue_triage_agent import try_auto_fix
    
    issue = {
        'title': 'Bug in the app',
        'number': 45,
        'body': '',  # Empty body
        'labels': [],
        'user': {'login': 'testuser'}
    }
    
    result = try_auto_fix(issue)
    assert "more" in result.lower() or "info" in result.lower() or "details" in result.lower()
    print(f"✓ test_auto_fix_missing_info passed: {result}")

def test_summarize_unlabeled():
    """Test summarization of unlabeled issues."""
    from issue_triage_agent import summarize_issue
    
    issue = {
        'title': 'Some issue',
        'number': 99,
        'labels': []
    }
    
    summary = summarize_issue(issue)
    assert "unlabeled" in summary
    print(f"✓ test_summarize_unlabeled passed: {summary}")

def main():
    """Run all tests."""
    print("Running Issue Triage Agent tests...")
    print("=" * 60)
    
    tests = [
        test_summarize_issue,
        test_auto_fix_typo,
        test_auto_fix_bug,
        test_auto_fix_feature,
        test_auto_fix_missing_info,
        test_summarize_unlabeled
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"✗ {test.__name__} failed: {e}")
            failed += 1
    
    print("=" * 60)
    print(f"Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("All tests passed! ✅")
        return 0
    else:
        print("Some tests failed. ❌")
        return 1

if __name__ == '__main__':
    sys.exit(main())
