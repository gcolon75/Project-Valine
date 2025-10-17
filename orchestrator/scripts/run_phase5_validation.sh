#!/bin/bash
# Phase 5 Staging Validation Double-Check Runner
# 
# This script executes the complete Phase 5 staging validation workflow
# as defined in the problem statement. It validates observability features,
# collects evidence, and updates documentation.
#
# Prerequisites:
# - AWS credentials configured with appropriate IAM permissions
# - Python 3.8+ with dependencies installed
# - GitHub CLI authenticated (for PR creation)
# - Discord staging bot configured
#
# Usage:
#   ./run_phase5_validation.sh [--skip-revert] [--dry-run]
#
# Environment variables (optional):
#   STAGING_DISCORD_BOT_TOKEN - Discord bot token for staging
#   STAGING_GITHUB_TOKEN - GitHub token with repo access
#   AWS_PROFILE - AWS profile to use (default: use current credentials)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_FILE="$SCRIPT_DIR/staging_config_phase5.json"
VALIDATOR_SCRIPT="$SCRIPT_DIR/phase5_staging_validator.py"
EVIDENCE_DIR="$SCRIPT_DIR/validation_evidence"

# Parse arguments
SKIP_REVERT=false
DRY_RUN=false

for arg in "$@"; do
  case $arg in
    --skip-revert)
      SKIP_REVERT=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help)
      echo "Usage: $0 [--skip-revert] [--dry-run]"
      echo ""
      echo "Options:"
      echo "  --skip-revert  Skip reverting flags to safe defaults after validation"
      echo "  --dry-run      Show what would be done without making changes"
      echo "  --help         Show this help message"
      exit 0
      ;;
  esac
done

# Helper functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

run_step() {
  local step_name="$1"
  local step_cmd="$2"
  
  echo ""
  log_info "========================================"
  log_info "STEP: $step_name"
  log_info "========================================"
  
  if [ "$DRY_RUN" = true ]; then
    log_info "DRY RUN: Would execute: $step_cmd"
    return 0
  fi
  
  if eval "$step_cmd"; then
    log_success "$step_name completed"
    return 0
  else
    log_error "$step_name failed"
    return 1
  fi
}

# Main validation workflow
main() {
  log_info "Starting Phase 5 Staging Validation Double-Check"
  log_info "Problem Statement: Re-verify Phase 5 setup end-to-end in staging"
  echo ""
  
  # Check prerequisites
  log_info "Checking prerequisites..."
  
  if [ ! -f "$CONFIG_FILE" ]; then
    log_error "Configuration file not found: $CONFIG_FILE"
    exit 1
  fi
  
  if [ ! -f "$VALIDATOR_SCRIPT" ]; then
    log_error "Validator script not found: $VALIDATOR_SCRIPT"
    exit 1
  fi
  
  if ! command -v python3 &> /dev/null; then
    log_error "Python 3 not found"
    exit 1
  fi
  
  if ! command -v aws &> /dev/null; then
    log_error "AWS CLI not found"
    exit 1
  fi
  
  log_success "Prerequisites check passed"
  
  # Display configuration
  log_info "Configuration:"
  log_info "  Config file: $CONFIG_FILE"
  log_info "  Evidence dir: $EVIDENCE_DIR"
  log_info "  Skip revert: $SKIP_REVERT"
  log_info "  Dry run: $DRY_RUN"
  echo ""
  
  # Step 1: Preflight checks
  run_step "Step 1: Preflight Checks" \
    "python3 '$VALIDATOR_SCRIPT' preflight --config '$CONFIG_FILE'"
  
  # Step 2: Verify IAM permissions
  run_step "Step 2: Verify IAM Permissions" \
    "python3 '$VALIDATOR_SCRIPT' verify-iam --config '$CONFIG_FILE'"
  
  # Step 3: Read current SSM values (baseline)
  run_step "Step 3: Read Current SSM Values" \
    "python3 '$VALIDATOR_SCRIPT' read-ssm --config '$CONFIG_FILE'"
  
  # Step 4: Enable and validate /debug-last command
  run_step "Step 4a: Enable Debug Command" \
    "python3 '$VALIDATOR_SCRIPT' enable-debug --config '$CONFIG_FILE'"
  
  log_warning "Manual testing required for /debug-last command:"
  log_warning "  1. Execute a staging command (e.g., /diagnose)"
  log_warning "  2. Immediately run /debug-last"
  log_warning "  3. Verify: ephemeral response, trace_id present, secrets redacted"
  log_warning "  4. Record trace_id for evidence collection"
  echo ""
  read -p "Press Enter when manual testing is complete..."
  
  run_step "Step 4b: Validate Debug Command" \
    "python3 '$VALIDATOR_SCRIPT' validate-debug --config '$CONFIG_FILE'"
  
  # Step 5: Enable and validate alerts
  run_step "Step 5a: Enable Alerts" \
    "python3 '$VALIDATOR_SCRIPT' enable-alerts --config '$CONFIG_FILE' --channel-id 1428102811832553554"
  
  log_warning "Manual testing required for alerts:"
  log_warning "  1. Trigger a controlled failure in staging"
  log_warning "  2. Verify alert posts to channel 1428102811832553554"
  log_warning "  3. Verify alert contains: severity, cause, trace_id, links"
  log_warning "  4. Trigger same failure again within 5 min"
  log_warning "  5. Verify dedupe suppresses second alert"
  echo ""
  read -p "Press Enter when manual testing is complete..."
  
  run_step "Step 5b: Validate Alerts" \
    "python3 '$VALIDATOR_SCRIPT' validate-alerts --config '$CONFIG_FILE'"
  
  # Step 6: Collect evidence
  run_step "Step 6: Collect CloudWatch Logs Evidence" \
    "python3 '$VALIDATOR_SCRIPT' collect-logs --config '$CONFIG_FILE'"
  
  # Step 7: Revert flags to safe defaults
  if [ "$SKIP_REVERT" = false ]; then
    run_step "Step 7: Revert Flags to Safe Defaults" \
      "python3 '$VALIDATOR_SCRIPT' revert-flags --config '$CONFIG_FILE'"
  else
    log_warning "Skipping flag revert (--skip-revert specified)"
  fi
  
  # Step 8: Update documentation
  run_step "Step 8: Update PHASE5_VALIDATION.md" \
    "python3 '$VALIDATOR_SCRIPT' update-docs --config '$CONFIG_FILE'"
  
  # Generate executive summary
  run_step "Generate Executive Summary" \
    "python3 '$VALIDATOR_SCRIPT' generate-summary --config '$CONFIG_FILE'"
  
  echo ""
  log_success "========================================"
  log_success "Phase 5 Validation Complete!"
  log_success "========================================"
  echo ""
  
  log_info "Evidence collected in: $EVIDENCE_DIR"
  log_info "Next steps:"
  log_info "  1. Review validation evidence and reports"
  log_info "  2. Create docs branch: git checkout -b staging/phase5-validation-evidence"
  log_info "  3. Add evidence: git add orchestrator/scripts/validation_evidence PHASE5_VALIDATION.md"
  log_info "  4. Commit: git commit -m 'Phase 5 staging validation evidence'"
  log_info "  5. Push: git push origin staging/phase5-validation-evidence"
  log_info "  6. Create PR: gh pr create --title 'Phase 5 Staging Validation Evidence'"
  echo ""
  
  if [ -f "$EVIDENCE_DIR/executive_summary.md" ]; then
    log_info "Executive Summary:"
    cat "$EVIDENCE_DIR/executive_summary.md"
  fi
}

# Run main function
main "$@"
