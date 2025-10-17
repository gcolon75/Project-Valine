#!/bin/bash
# Example usage patterns for Phase 5 Triage Agent automation
# This script demonstrates various ways to invoke the triage agent

set -e

REPO="gcolon75/Project-Valine"

echo "=== Phase 5 Triage Agent - Example Usage ==="
echo ""

# Ensure GITHUB_TOKEN is set
if [ -z "$GITHUB_TOKEN" ]; then
    echo "ERROR: GITHUB_TOKEN environment variable is not set"
    echo "Please set it with: export GITHUB_TOKEN='your_token'"
    exit 1
fi

echo "Repository: $REPO"
echo ""

# Example 1: Triage-only mode (safe, no modifications)
echo "Example 1: Triage-only mode for PR #58"
echo "Command: python phase5_triage_agent.py run --repo $REPO --failure-ref 58"
echo ""
# Uncomment to run:
# python phase5_triage_agent.py run --repo "$REPO" --failure-ref 58

# Example 2: Auto-fix mode (applies fixes, creates PR)
echo "Example 2: Auto-fix mode for PR #58"
echo "Command: python phase5_triage_agent.py run --repo $REPO --failure-ref 58 --auto-fix"
echo ""
# Uncomment to run:
# python phase5_triage_agent.py run --repo "$REPO" --failure-ref 58 --auto-fix

# Example 3: Auto-fix with invasive changes allowed
echo "Example 3: Auto-fix with invasive fixes for PR #58"
echo "Command: python phase5_triage_agent.py run --repo $REPO --failure-ref 58 --auto-fix --allow-invasive"
echo ""
# Uncomment to run:
# python phase5_triage_agent.py run --repo "$REPO" --failure-ref 58 --auto-fix --allow-invasive

# Example 4: Dry run (preview changes without applying)
echo "Example 4: Dry run mode for PR #58"
echo "Command: python phase5_triage_agent.py run --repo $REPO --failure-ref 58 --auto-fix --dry-run"
echo ""
# Uncomment to run:
# python phase5_triage_agent.py run --repo "$REPO" --failure-ref 58 --auto-fix --dry-run

# Example 5: Triage a workflow run by ID
echo "Example 5: Triage a failed workflow run"
echo "Command: python phase5_triage_agent.py run --repo $REPO --failure-ref 1234567890 --auto-fix"
echo ""
# Uncomment to run:
# python phase5_triage_agent.py run --repo "$REPO" --failure-ref 1234567890 --auto-fix

# Example 6: Using a config file
echo "Example 6: Using a config file"
echo "First, generate a default config:"
echo "  python phase5_triage_agent.py generate-config --output my_config.json"
echo "Then edit my_config.json and run:"
echo "  python phase5_triage_agent.py run --config my_config.json"
echo ""

# Example 7: Via GitHub Actions workflow dispatch
echo "Example 7: Trigger via GitHub Actions (using gh CLI)"
echo "Command: gh workflow run phase5-triage-agent.yml --ref main --field pr_number=58 --field mode=apply-fixes"
echo ""
# Uncomment to run:
# gh workflow run phase5-triage-agent.yml \
#   --ref main \
#   --field pr_number=58 \
#   --field mode=apply-fixes \
#   --field allow_invasive_fixes=false

# Example 8: Via GitHub API
echo "Example 8: Trigger via GitHub API"
cat << 'EOF'
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/gcolon75/Project-Valine/actions/workflows/phase5-triage-agent.yml/dispatches \
  -d '{
    "ref": "main",
    "inputs": {
      "pr_number": "58",
      "mode": "apply-fixes",
      "allow_invasive_fixes": "true"
    }
  }'
EOF
echo ""

echo "=== End of Examples ==="
echo ""
echo "To run any example, uncomment the corresponding line in this script."
echo "Or copy the command and run it directly in your terminal."
echo ""
echo "For more information, see: PHASE5_TRIAGE_AUTOMATION_GUIDE.md"
