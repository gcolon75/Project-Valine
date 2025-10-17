#!/bin/bash
# Example usage of the Phase-5 Triage Automation Agent (auto_triage_pr58.py)
# This script demonstrates all major usage patterns as specified in the problem statement

set -e  # Exit on error

REPO="gcolon75/Project-Valine"
PR_NUMBER=58
WORKFLOW_FILE=".github/workflows/phase5-triage-agent.yml"

echo "========================================="
echo "Phase-5 Triage Automation Agent Examples"
echo "========================================="
echo ""

# Example 1: Dry run (safe testing)
echo "Example 1: Dry Run Mode"
echo "------------------------"
echo "Test the automation without making any changes"
echo ""
echo "Command:"
echo "  python orchestrator/scripts/auto_triage_pr58.py \\"
echo "    --repo $REPO \\"
echo "    --pr $PR_NUMBER \\"
echo "    --mode apply-fixes \\"
echo "    --allow-invasive \\"
echo "    --dry-run"
echo ""
read -p "Press Enter to run (or Ctrl+C to skip)..."
python orchestrator/scripts/auto_triage_pr58.py \
  --repo "$REPO" \
  --pr "$PR_NUMBER" \
  --mode apply-fixes \
  --allow-invasive \
  --dry-run || echo "Dry run completed with exit code $?"
echo ""
echo "✓ Dry run complete. No changes were made."
echo ""

# Example 2: Triage only (no fixes)
echo "Example 2: Triage Only Mode"
echo "----------------------------"
echo "Analyze failures without applying any fixes"
echo ""
echo "Command:"
echo "  python orchestrator/scripts/auto_triage_pr58.py \\"
echo "    --repo $REPO \\"
echo "    --pr $PR_NUMBER \\"
echo "    --mode triage-only"
echo ""
read -p "Press Enter to run (or Ctrl+C to skip)..."
python orchestrator/scripts/auto_triage_pr58.py \
  --repo "$REPO" \
  --pr "$PR_NUMBER" \
  --mode triage-only || echo "Triage completed with exit code $?"
echo ""
echo "✓ Triage complete. Review the report in /tmp/phase5-triage-logs/final_report.md"
echo ""

# Example 3: Apply fixes (conservative)
echo "Example 3: Apply Fixes (Conservative)"
echo "--------------------------------------"
echo "Apply fixes with strict limits (max 10 files, 500 lines)"
echo "Creates draft PR if limits are exceeded"
echo ""
echo "Command:"
echo "  python orchestrator/scripts/auto_triage_pr58.py \\"
echo "    --repo $REPO \\"
echo "    --pr $PR_NUMBER \\"
echo "    --mode apply-fixes"
echo ""
read -p "Press Enter to run (or Ctrl+C to skip)..."
python orchestrator/scripts/auto_triage_pr58.py \
  --repo "$REPO" \
  --pr "$PR_NUMBER" \
  --mode apply-fixes || echo "Apply fixes completed with exit code $?"
echo ""
echo "✓ Fixes applied (if any). PR created as draft if changes exceeded limits."
echo ""

# Example 4: Apply invasive fixes
echo "Example 4: Apply Invasive Fixes"
echo "--------------------------------"
echo "Apply fixes with no file/line limits"
echo "This is the mode specified in the problem statement for PR #58"
echo ""
echo "Command:"
echo "  python orchestrator/scripts/auto_triage_pr58.py \\"
echo "    --repo $REPO \\"
echo "    --pr $PR_NUMBER \\"
echo "    --mode apply-fixes \\"
echo "    --allow-invasive"
echo ""
read -p "Press Enter to run (or Ctrl+C to skip)..."
python orchestrator/scripts/auto_triage_pr58.py \
  --repo "$REPO" \
  --pr "$PR_NUMBER" \
  --mode apply-fixes \
  --allow-invasive || echo "Apply invasive fixes completed with exit code $?"
echo ""
echo "✓ Invasive fixes applied (if any). PR created with invasive-changes label."
echo ""

# Example 5: Using environment variables for auth
echo "Example 5: Using Environment Variables"
echo "---------------------------------------"
echo "Authenticate using GITHUB_TOKEN environment variable"
echo ""
echo "Setup:"
echo "  export GITHUB_TOKEN=\"your_token_here\""
echo "  # Do NOT paste tokens into chat or logs!"
echo ""
echo "Command:"
echo "  python orchestrator/scripts/auto_triage_pr58.py \\"
echo "    --repo $REPO \\"
echo "    --pr $PR_NUMBER \\"
echo "    --mode apply-fixes"
echo ""
echo "Note: Token must have 'repo' and 'workflow' scopes"
echo ""

# Example 6: Custom workflow file
echo "Example 6: Custom Workflow File"
echo "--------------------------------"
echo "Analyze a different workflow file"
echo ""
echo "Command:"
echo "  python orchestrator/scripts/auto_triage_pr58.py \\"
echo "    --repo $REPO \\"
echo "    --pr $PR_NUMBER \\"
echo "    --workflow-file .github/workflows/custom-workflow.yml \\"
echo "    --mode apply-fixes"
echo ""

# Example 7: Fallback to existing triage agent
echo "Example 7: Fallback to Existing Agent"
echo "--------------------------------------"
echo "When no workflow runs are found, the script automatically falls back"
echo "to using the existing Phase-5 triage agent directly"
echo ""
echo "This happens automatically, but you can also run it manually:"
echo ""
echo "Command:"
echo "  python orchestrator/scripts/phase5_triage_agent.py run \\"
echo "    --repo $REPO \\"
echo "    --failure-ref $PR_NUMBER \\"
echo "    --auto-fix \\"
echo "    --allow-invasive \\"
echo "    --verbose"
echo ""

# Example 8: Complete end-to-end workflow
echo "Example 8: Complete End-to-End Workflow"
echo "----------------------------------------"
echo "This is the complete workflow specified in the problem statement:"
echo ""
echo "Step 1: Check authentication"
echo "  gh auth status"
echo ""
echo "Step 2: Run automation agent"
echo "  python orchestrator/scripts/auto_triage_pr58.py \\"
echo "    --repo $REPO \\"
echo "    --pr $PR_NUMBER \\"
echo "    --mode apply-fixes \\"
echo "    --allow-invasive"
echo ""
echo "Step 3: Review the PR"
echo "  gh pr list --repo $REPO --label auto-triage"
echo ""
echo "Step 4: Monitor CI"
echo "  gh run watch --repo $REPO"
echo ""
echo "Step 5: Merge (after approval)"
echo "  gh pr merge <pr-number> --squash"
echo ""

echo "========================================="
echo "Examples Complete"
echo "========================================="
echo ""
echo "Output files location: /tmp/phase5-triage-logs/"
echo ""
echo "Files generated:"
echo "  - run-{RUN_ID}-logs.txt       # Concatenated logs (secrets redacted)"
echo "  - final_report.md             # Complete triage report"
echo "  - run-{RUN_ID}-logs/          # Raw log files"
echo ""
echo "For more information:"
echo "  - Quick start: AUTO_TRIAGE_QUICKSTART.md"
echo "  - Complete guide: AUTO_TRIAGE_AUTOMATION_GUIDE.md"
echo ""
