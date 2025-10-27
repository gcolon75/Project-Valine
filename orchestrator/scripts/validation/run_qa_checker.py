#!/usr/bin/env python3
"""
CLI script to run QA Checker agent for Phase 3 and Phase 4 PR validation.

IMPORTANT: Run this script from the orchestrator root directory:
    cd orchestrator
    python scripts/validation/run_qa_checker.py <pr1_number> <pr2_number> [options]

Usage:
    python scripts/validation/run_qa_checker.py <pr1_number> <pr2_number> [--repo REPO] [--post-reviews]

Examples:
    # Validate PRs and print results
    python scripts/validation/run_qa_checker.py 27 28

    # Validate PRs with custom repo
    python scripts/validation/run_qa_checker.py 27 28 --repo gcolon75/Project-Valine

    # Validate and post reviews to GitHub
    export GITHUB_TOKEN=ghp_xxxxx
    python scripts/validation/run_qa_checker.py 27 28 --post-reviews
"""
import os
import sys
import argparse
from app.agents.qa_checker import QAChecker


def main():
    parser = argparse.ArgumentParser(
        description='QA Checker for Phase 3 and Phase 4 PR validation',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Validate PRs and print results
  python run_qa_checker.py 27 28

  # Validate PRs with custom repo
  python run_qa_checker.py 27 28 --repo gcolon75/Project-Valine

  # Validate and post reviews to GitHub
  export GITHUB_TOKEN=ghp_xxxxx
  python run_qa_checker.py 27 28 --post-reviews

Environment Variables:
  GITHUB_TOKEN  GitHub personal access token (required)
  GITHUB_REPO   Default repository (default: gcolon75/Project-Valine)
        """
    )
    
    parser.add_argument('pr1', type=int, help='PR number for Phase 3 (deploy-client polish)')
    parser.add_argument('pr2', type=int, help='PR number for Phase 4 (multi-agent foundation)')
    parser.add_argument('--repo', type=str, default=None, help='Repository (owner/repo)')
    parser.add_argument('--post-reviews', action='store_true', help='Post reviews to GitHub')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    # Get GitHub token
    github_token = os.environ.get('GITHUB_TOKEN')
    if not github_token:
        print("❌ Error: GITHUB_TOKEN environment variable not set", file=sys.stderr)
        print("", file=sys.stderr)
        print("To set your GitHub token:", file=sys.stderr)
        print("  export GITHUB_TOKEN=ghp_your_token_here", file=sys.stderr)
        print("", file=sys.stderr)
        print("Or get a token from: https://github.com/settings/tokens", file=sys.stderr)
        sys.exit(1)
    
    # Get repository
    repo = args.repo or os.environ.get('GITHUB_REPO', 'gcolon75/Project-Valine')
    
    # Create checker
    checker = QAChecker(repo, github_token)
    
    print("=" * 80)
    print("QA Checker for Phase 3 Polish and Phase 4 Multi-Agent Foundation")
    print("=" * 80)
    print()
    print(f"📦 Repository: {repo}")
    print(f"🔍 PR #1 (Phase 3): {args.pr1}")
    print(f"🔍 PR #2 (Phase 4): {args.pr2}")
    print()
    
    # Validate PR1
    print("─" * 80)
    print(f"🔍 Validating PR #{args.pr1} - Deploy Client Polish...")
    print("─" * 80)
    result1 = checker.validate_pr1_deploy_client_polish(args.pr1)
    review1 = checker.format_review_comment(result1, "Phase 3 Polish — /deploy-client wait flow")
    print()
    print(review1)
    print()
    
    # Validate PR2
    print("─" * 80)
    print(f"🔍 Validating PR #{args.pr2} - Multi-Agent Foundation...")
    print("─" * 80)
    result2 = checker.validate_pr2_multi_agent_foundation(args.pr2)
    review2 = checker.format_review_comment(result2, "Phase 4 — Multi-Agent Foundation")
    print()
    print(review2)
    print()
    
    # Summary
    print("=" * 80)
    print("Summary")
    print("=" * 80)
    print(f"PR #{args.pr1} (Phase 3): {result1.status}")
    print(f"PR #{args.pr2} (Phase 4): {result2.status}")
    print()
    
    # Post reviews if requested
    if args.post_reviews:
        print("📝 Posting reviews to GitHub...")
        print()
        
        checker.post_review(args.pr1, review1, approve=(result1.status == "PASS"))
        checker.post_review(args.pr2, review2, approve=(result2.status == "PASS"))
        
        print()
        print("✅ Reviews posted to GitHub")
    else:
        print("ℹ️  To post reviews to GitHub, run with --post-reviews flag")
    
    print()
    
    # Exit with error code if any PR failed
    if result1.status == "FAIL" or result2.status == "FAIL":
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == '__main__':
    main()
