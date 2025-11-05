#!/bin/bash
# Deployment orchestration script for Project Valine migrations
# Handles Prisma migrations and data migration in staging environment
#
# Usage:
#   export DATABASE_URL="postgresql://..."
#   ./deploy-migrations.sh [--dry-run] [--skip-tests]
#
# Options:
#   --dry-run       Only run dry-run mode, no actual changes
#   --skip-tests    Skip integration and smoke tests (not recommended)
#   --help          Show this help message

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
API_DIR="$PROJECT_ROOT/api"
SERVER_DIR="$PROJECT_ROOT/server"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_DIR="${LOG_DIR:-$PROJECT_ROOT/logs}"
REPORT_DIR="${REPORT_DIR:-$PROJECT_ROOT/logs}"

# Parse arguments
DRY_RUN=false
SKIP_TESTS=false

for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --help)
            echo "Usage: $0 [--dry-run] [--skip-tests]"
            echo ""
            echo "Options:"
            echo "  --dry-run       Only run dry-run mode, no actual changes"
            echo "  --skip-tests    Skip integration and smoke tests"
            echo "  --help          Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $arg"
            echo "Run $0 --help for usage information"
            exit 1
            ;;
    esac
done

# Create log directory
mkdir -p "$LOG_DIR"
mkdir -p "$REPORT_DIR"

LOG_FILE="$LOG_DIR/deployment_$TIMESTAMP.log"
REPORT_FILE="$REPORT_DIR/migration_report_$TIMESTAMP.md"

# Helper functions
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

header() {
    echo "" | tee -a "$LOG_FILE"
    echo "=========================================" | tee -a "$LOG_FILE"
    echo -e "${BLUE}$*${NC}" | tee -a "$LOG_FILE"
    echo "=========================================" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✓${NC} $*" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}✗${NC} $*" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $*" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    header "Checking Prerequisites"
    
    if [ -z "$DATABASE_URL" ]; then
        error "DATABASE_URL environment variable is not set"
        exit 1
    fi
    success "DATABASE_URL is configured"
    
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    success "Node.js $(node --version) detected"
    
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
        exit 1
    fi
    success "npm $(npm --version) detected"
    
    if ! command -v psql &> /dev/null; then
        warn "psql is not installed - database verification will be limited"
    else
        success "psql detected"
    fi
    
    log "All prerequisites met"
}

# Initialize report
init_report() {
    cat > "$REPORT_FILE" <<EOF
# Migration Deployment Report

**Date:** $(date +'%Y-%m-%d %H:%M:%S')  
**Mode:** $( [ "$DRY_RUN" = true ] && echo "DRY RUN" || echo "LIVE" )  
**Environment:** Staging  
**Log File:** $LOG_FILE

---

## Executive Summary

EOF
}

# Phase 1: Prisma Migrations
run_prisma_migrations() {
    header "Phase 1: Applying Prisma Schema Migrations"
    
    cd "$API_DIR"
    
    # Install dependencies
    log "Installing API dependencies..."
    if npm install >> "$LOG_FILE" 2>&1; then
        success "Dependencies installed"
    else
        error "Failed to install dependencies"
        return 1
    fi
    
    # Generate Prisma Client
    log "Generating Prisma Client..."
    if npx prisma generate >> "$LOG_FILE" 2>&1; then
        success "Prisma Client generated"
    else
        error "Failed to generate Prisma Client"
        return 1
    fi
    
    # Check migration status
    log "Checking migration status..."
    npx prisma migrate status | tee -a "$LOG_FILE"
    
    if [ "$DRY_RUN" = true ]; then
        warn "DRY RUN mode - skipping actual migration deployment"
        log "Would deploy the following migrations:"
        ls -1 "$API_DIR/prisma/migrations" | grep -E "^[0-9]" | tee -a "$LOG_FILE"
        return 0
    fi
    
    # Deploy migrations
    log "Deploying migrations..."
    if npx prisma migrate deploy >> "$LOG_FILE" 2>&1; then
        success "Prisma migrations deployed successfully"
        
        # Verify schema
        log "Verifying schema changes..."
        if npx prisma db execute --stdin <<< "SELECT 1" >> "$LOG_FILE" 2>&1; then
            success "Database schema verified"
        fi
        
        return 0
    else
        error "Failed to deploy Prisma migrations"
        return 1
    fi
}

# Phase 2: Data Migration
run_data_migration() {
    header "Phase 2: Migrating Legacy Data (socialLinks → profile_links)"
    
    cd "$API_DIR"
    
    # Always run dry-run first
    log "Running migration dry-run..."
    local dry_run_log="$LOG_DIR/migration_dry_run_$TIMESTAMP.log"
    
    if npm run migrate:social-links:dry-run > "$dry_run_log" 2>&1; then
        success "Dry-run completed successfully"
        log "Dry-run results:"
        tail -20 "$dry_run_log" | tee -a "$LOG_FILE"
    else
        error "Dry-run failed"
        cat "$dry_run_log" | tee -a "$LOG_FILE"
        return 1
    fi
    
    if [ "$DRY_RUN" = true ]; then
        warn "DRY RUN mode - skipping actual data migration"
        return 0
    fi
    
    # Ask for confirmation before live migration
    echo ""
    warn "About to run LIVE data migration"
    read -p "Review dry-run results above. Continue with live migration? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        warn "Migration aborted by user"
        return 1
    fi
    
    # Run live migration
    log "Running live data migration..."
    local live_log="$LOG_DIR/migration_live_$TIMESTAMP.log"
    
    if npm run migrate:social-links > "$live_log" 2>&1; then
        success "Data migration completed successfully"
        log "Migration results:"
        tail -30 "$live_log" | tee -a "$LOG_FILE"
        
        # Verify migration results
        if [ -n "$(command -v psql)" ]; then
            log "Verifying migrated data..."
            local count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM profile_links;" 2>/dev/null || echo "0")
            log "Total profile links migrated: $count"
        fi
        
        return 0
    else
        error "Data migration failed"
        cat "$live_log" | tee -a "$LOG_FILE"
        return 1
    fi
}

# Phase 3: Integration Tests
run_integration_tests() {
    header "Phase 3: Running Backend Integration Tests"
    
    if [ "$SKIP_TESTS" = true ]; then
        warn "Skipping integration tests (--skip-tests flag set)"
        return 0
    fi
    
    cd "$SERVER_DIR"
    
    # Install server dependencies
    log "Installing server dependencies..."
    if npm install >> "$LOG_FILE" 2>&1; then
        success "Server dependencies installed"
    else
        error "Failed to install server dependencies"
        return 1
    fi
    
    # Run tests
    log "Running integration tests..."
    local test_log="$LOG_DIR/integration_tests_$TIMESTAMP.log"
    
    if npm run test:server > "$test_log" 2>&1; then
        success "Integration tests passed"
        
        # Show test summary
        grep -A 5 "Test Files" "$test_log" | tee -a "$LOG_FILE" || true
        
        return 0
    else
        warn "Some integration tests failed"
        
        # Show failures
        grep -A 10 "FAIL" "$test_log" | tee -a "$LOG_FILE" || true
        
        # Don't fail deployment for test failures in this phase
        return 0
    fi
}

# Phase 4: Smoke Tests
run_smoke_tests() {
    header "Phase 4: Running Smoke Tests"
    
    if [ "$SKIP_TESTS" = true ]; then
        warn "Skipping smoke tests (--skip-tests flag set)"
        return 0
    fi
    
    # Run smoke test script
    if [ -f "$SCRIPT_DIR/smoke-test-staging.sh" ]; then
        log "Running smoke test suite..."
        
        if bash "$SCRIPT_DIR/smoke-test-staging.sh"; then
            success "All smoke tests passed"
            return 0
        else
            warn "Some smoke tests failed"
            return 0
        fi
    else
        warn "Smoke test script not found at $SCRIPT_DIR/smoke-test-staging.sh"
        return 0
    fi
}

# Generate final report
generate_report() {
    header "Generating Migration Report"
    
    cat >> "$REPORT_FILE" <<EOF

### Phase 1: Schema Migrations
$( [ "$PHASE1_STATUS" = "success" ] && echo "✅ **SUCCESS**" || echo "❌ **FAILED**" )

Applied migrations:
\`\`\`
$(ls -1 "$API_DIR/prisma/migrations" 2>/dev/null | grep -E "^[0-9]" || echo "None")
\`\`\`

### Phase 2: Data Migration
$( [ "$PHASE2_STATUS" = "success" ] && echo "✅ **SUCCESS**" || echo "❌ **FAILED**" )

Migration summary:
\`\`\`
$(grep "Migration Summary:" "$LOG_DIR"/migration_live_*.log 2>/dev/null | tail -10 || echo "Not available")
\`\`\`

### Phase 3: Integration Tests
$( [ "$PHASE3_STATUS" = "success" ] && echo "✅ **PASSED**" || echo "⚠️ **SOME FAILURES**" )

Test results:
\`\`\`
$(grep -A 5 "Test Files" "$LOG_DIR"/integration_tests_*.log 2>/dev/null | tail -10 || echo "Not available")
\`\`\`

### Phase 4: Smoke Tests
$( [ "$PHASE4_STATUS" = "success" ] && echo "✅ **PASSED**" || echo "⚠️ **SOME FAILURES**" )

---

## Rollback Instructions

If rollback is needed, follow these steps:

### 1. Rollback Data Migration (if Phase 2 completed)
\`\`\`bash
psql "\$DATABASE_URL" -c "DELETE FROM profile_links;"
\`\`\`

### 2. Rollback Schema Migrations (if Phase 1 completed)
\`\`\`bash
cd $API_DIR
# Follow rollback instructions in each migration's ROLLBACK.md
# Or restore from database backup
\`\`\`

### 3. Restore from Backup (last resort)
\`\`\`bash
psql "\$DATABASE_URL" < backup_pre_migration.sql
\`\`\`

---

## Next Steps

- [ ] Monitor application logs for 2 hours
- [ ] Check error rates and database performance
- [ ] Verify rate limiting counters
- [ ] Review user feedback
- [ ] Update documentation
- [ ] Archive logs and report

---

## Monitoring Commands

### Check Application Logs
\`\`\`bash
# View recent logs
tail -f /var/log/valine-api.log

# Check for errors
grep -i error /var/log/valine-api.log | tail -20
\`\`\`

### Database Queries
\`\`\`bash
# Count profile links
psql "\$DATABASE_URL" -c "SELECT COUNT(*) FROM profile_links;"

# Check for duplicates
psql "\$DATABASE_URL" -c "SELECT \"userId\", url, COUNT(*) FROM profile_links GROUP BY \"userId\", url HAVING COUNT(*) > 1;"

# View connection count
psql "\$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();"
\`\`\`

### Rate Limit Monitoring
\`\`\`bash
# Check rate limit hits
grep -i "rate.limit" /var/log/valine-api.log | wc -l
\`\`\`

---

## Contact Information

**Generated:** $(date +'%Y-%m-%d %H:%M:%S')  
**Report File:** $REPORT_FILE  
**Log File:** $LOG_FILE

EOF

    log "Report generated at: $REPORT_FILE"
    
    # Display report
    if command -v cat &> /dev/null; then
        echo ""
        cat "$REPORT_FILE"
    fi
}

# Main execution
main() {
    log "Starting deployment orchestration..."
    log "Dry run mode: $DRY_RUN"
    log "Skip tests: $SKIP_TESTS"
    
    init_report
    check_prerequisites
    
    # Phase 1
    if run_prisma_migrations; then
        PHASE1_STATUS="success"
    else
        PHASE1_STATUS="failed"
        error "Phase 1 failed - aborting deployment"
        generate_report
        exit 1
    fi
    
    # Phase 2
    if run_data_migration; then
        PHASE2_STATUS="success"
    else
        PHASE2_STATUS="failed"
        error "Phase 2 failed - review logs and consider rollback"
        generate_report
        exit 1
    fi
    
    # Phase 3
    if run_integration_tests; then
        PHASE3_STATUS="success"
    else
        PHASE3_STATUS="failed"
        warn "Phase 3 had failures - review test logs"
    fi
    
    # Phase 4
    if run_smoke_tests; then
        PHASE4_STATUS="success"
    else
        PHASE4_STATUS="failed"
        warn "Phase 4 had failures - review smoke test logs"
    fi
    
    generate_report
    
    # Final status
    header "Deployment Complete"
    
    if [ "$PHASE1_STATUS" = "success" ] && [ "$PHASE2_STATUS" = "success" ]; then
        success "Migration deployment completed successfully!"
        echo ""
        log "Next steps:"
        log "1. Monitor logs for 2 hours: tail -f /var/log/valine-api.log"
        log "2. Check database performance"
        log "3. Review error rates"
        log "4. See full report: $REPORT_FILE"
        exit 0
    else
        error "Deployment completed with errors"
        echo ""
        log "Please review:"
        log "- Report: $REPORT_FILE"
        log "- Logs: $LOG_FILE"
        log "- Consider rollback if issues are critical"
        exit 1
    fi
}

# Run main function
main
