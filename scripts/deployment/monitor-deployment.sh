#!/bin/bash
# Post-deployment monitoring script
# Monitors application logs, database metrics, and rate limits for 2 hours
#
# Usage:
#   export DATABASE_URL="postgresql://..."
#   export LOG_SOURCE="/var/log/valine-api.log" or "cloudwatch" or "pm2"
#   ./monitor-deployment.sh [--duration MINUTES]
#
# Options:
#   --duration MINUTES    Monitor duration in minutes (default: 120)
#   --help               Show this help message

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_DIR="${LOG_DIR:-/tmp}"
MONITOR_LOG="$LOG_DIR/deployment_monitor_$TIMESTAMP.log"
METRICS_FILE="$LOG_DIR/deployment_metrics_$TIMESTAMP.json"

# Default monitoring duration: 2 hours (120 minutes)
DURATION_MINUTES=120
LOG_SOURCE="${LOG_SOURCE:-/var/log/valine-api.log}"

# Parse arguments
for arg in "$@"; do
    case $arg in
        --duration)
            DURATION_MINUTES="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [--duration MINUTES]"
            echo ""
            echo "Options:"
            echo "  --duration MINUTES    Monitor duration in minutes (default: 120)"
            echo "  --help               Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  DATABASE_URL    PostgreSQL connection string"
            echo "  LOG_SOURCE      Log file path, 'cloudwatch', or 'pm2'"
            exit 0
            ;;
    esac
done

# Helper functions
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$MONITOR_LOG"
}

header() {
    echo "" | tee -a "$MONITOR_LOG"
    echo "=========================================" | tee -a "$MONITOR_LOG"
    echo -e "${BLUE}$*${NC}" | tee -a "$MONITOR_LOG"
    echo "=========================================" | tee -a "$MONITOR_LOG"
}

success() {
    echo -e "${GREEN}✓${NC} $*" | tee -a "$MONITOR_LOG"
}

error() {
    echo -e "${RED}✗${NC} $*" | tee -a "$MONITOR_LOG"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $*" | tee -a "$MONITOR_LOG"
}

# Initialize metrics file
init_metrics() {
    cat > "$METRICS_FILE" <<EOF
{
  "monitoring_start": "$(date -Iseconds)",
  "duration_minutes": $DURATION_MINUTES,
  "samples": []
}
EOF
}

# Collect application logs
collect_app_logs() {
    local sample_size="${1:-50}"
    
    if [ "$LOG_SOURCE" = "cloudwatch" ]; then
        # AWS CloudWatch
        if command -v aws &> /dev/null; then
            aws logs tail /aws/lambda/valine-api --since 5m --format short 2>/dev/null | tail -n "$sample_size"
        else
            echo "AWS CLI not available"
        fi
    elif [ "$LOG_SOURCE" = "pm2" ]; then
        # PM2 logs
        if command -v pm2 &> /dev/null; then
            pm2 logs valine-api --nostream --lines "$sample_size" 2>/dev/null
        else
            echo "PM2 not available"
        fi
    elif [ -f "$LOG_SOURCE" ]; then
        # File-based logs
        tail -n "$sample_size" "$LOG_SOURCE" 2>/dev/null || echo "Log file not accessible"
    else
        echo "No log source available"
    fi
}

# Count errors in logs
count_errors() {
    local logs="$1"
    echo "$logs" | grep -i -E "(error|exception|fatal|critical)" | wc -l
}

# Check database metrics
check_database_metrics() {
    if [ -z "$DATABASE_URL" ]; then
        echo "DATABASE_URL not set"
        return 1
    fi
    
    if ! command -v psql &> /dev/null; then
        echo "psql not available"
        return 1
    fi
    
    # Connection count
    local connections=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();" 2>/dev/null | xargs)
    
    # Active queries
    local active_queries=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND datname = current_database();" 2>/dev/null | xargs)
    
    # Slow queries (> 1 second)
    local slow_queries=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM pg_stat_activity WHERE (now() - pg_stat_activity.query_start) > interval '1 second' AND state = 'active';" 2>/dev/null | xargs)
    
    # Database size
    local db_size=$(psql "$DATABASE_URL" -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));" 2>/dev/null | xargs)
    
    # Profile links count
    local profile_links_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM profile_links;" 2>/dev/null | xargs)
    
    echo "Connections: $connections"
    echo "Active queries: $active_queries"
    echo "Slow queries: $slow_queries"
    echo "Database size: $db_size"
    echo "Profile links: $profile_links_count"
}

# Check rate limits
check_rate_limits() {
    local logs="$1"
    local rate_limit_hits=$(echo "$logs" | grep -i "rate.limit\|429\|too.many.requests" | wc -l)
    echo "$rate_limit_hits"
}

# Sample metrics
sample_metrics() {
    local iteration=$1
    
    log "Sampling metrics (iteration $iteration)..."
    
    # Collect logs
    local app_logs=$(collect_app_logs 100)
    
    # Count errors
    local error_count=$(count_errors "$app_logs")
    
    # Database metrics
    local db_metrics=$(check_database_metrics)
    
    # Rate limit hits
    local rate_limit_hits=$(check_rate_limits "$app_logs")
    
    # Create sample entry
    local sample=$(cat <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "iteration": $iteration,
  "errors": $error_count,
  "rate_limit_hits": $rate_limit_hits,
  "database": {
    $(echo "$db_metrics" | sed 's/: /": "/g' | sed 's/^/"/g' | sed 's/$/",/g' | head -n-1)
    $(echo "$db_metrics" | sed 's/: /": "/g' | sed 's/^/"/g' | sed 's/$/"/g' | tail -n1)
  }
}
EOF
)
    
    # Append to metrics file (simple append to array)
    # This is a simplified approach; in production, use jq
    
    log "Errors found: $error_count"
    log "Rate limit hits: $rate_limit_hits"
    
    if [ "$error_count" -gt 10 ]; then
        error "High error count detected: $error_count errors in last 5 minutes"
        # Show recent errors
        echo "$app_logs" | grep -i -E "(error|exception)" | tail -5
    elif [ "$error_count" -gt 0 ]; then
        warn "Errors detected: $error_count errors in last 5 minutes"
    else
        success "No errors detected"
    fi
    
    if [ "$rate_limit_hits" -gt 0 ]; then
        warn "Rate limit hits detected: $rate_limit_hits in last 5 minutes"
    fi
}

# Generate monitoring report
generate_monitoring_report() {
    local report_file="$LOG_DIR/monitoring_report_$TIMESTAMP.md"
    
    cat > "$report_file" <<EOF
# Post-Deployment Monitoring Report

**Date:** $(date +'%Y-%m-%d %H:%M:%S')  
**Duration:** $DURATION_MINUTES minutes  
**Log Source:** $LOG_SOURCE

---

## Summary

Monitoring completed successfully.

### Key Findings

EOF
    
    # Analyze logs for summary
    local total_errors=$(grep -c "Errors found:" "$MONITOR_LOG" 2>/dev/null || echo "0")
    local total_rate_limit_hits=$(grep "Rate limit hits:" "$MONITOR_LOG" | awk '{sum+=$NF} END {print sum}')
    
    cat >> "$report_file" <<EOF
- **Total error samples:** $total_errors
- **Total rate limit hits:** ${total_rate_limit_hits:-0}
- **Monitoring log:** $MONITOR_LOG
- **Metrics file:** $METRICS_FILE

### Database Status

$(check_database_metrics)

### Recent Application Logs

\`\`\`
$(collect_app_logs 20)
\`\`\`

### Error Summary

\`\`\`
$(collect_app_logs 200 | grep -i -E "(error|exception|fatal|critical)" | tail -10 || echo "No errors found")
\`\`\`

### Recommendations

EOF
    
    # Add recommendations based on findings
    if [ "$total_errors" -gt 50 ]; then
        cat >> "$report_file" <<EOF
- ⚠️ **High error rate detected** - investigate immediately
- Review error logs in detail
- Consider rollback if errors are critical
EOF
    elif [ "$total_errors" -gt 10 ]; then
        cat >> "$report_file" <<EOF
- ⚠️ **Moderate error rate** - monitor closely
- Review specific error patterns
EOF
    else
        cat >> "$report_file" <<EOF
- ✅ **Error rate is normal** - continue monitoring
EOF
    fi
    
    if [ "${total_rate_limit_hits:-0}" -gt 100 ]; then
        cat >> "$report_file" <<EOF
- ⚠️ **High rate limit activity** - review rate limit configuration
- Check for potential abuse or DoS attempts
EOF
    fi
    
    cat >> "$report_file" <<EOF

---

**Report generated:** $(date +'%Y-%m-%d %H:%M:%S')  
**Report file:** $report_file  
**Contact:** DevOps team for escalation

EOF
    
    log "Monitoring report generated: $report_file"
    echo ""
    cat "$report_file"
}

# Main monitoring loop
main() {
    header "Starting Post-Deployment Monitoring"
    
    log "Duration: $DURATION_MINUTES minutes"
    log "Log source: $LOG_SOURCE"
    log "Monitoring log: $MONITOR_LOG"
    log "Metrics file: $METRICS_FILE"
    
    init_metrics
    
    # Calculate number of iterations (sample every 5 minutes)
    local iterations=$((DURATION_MINUTES / 5))
    local sleep_seconds=$((5 * 60))
    
    log "Will sample metrics $iterations times (every 5 minutes)"
    
    for i in $(seq 1 $iterations); do
        header "Monitoring Iteration $i/$iterations"
        
        sample_metrics "$i"
        
        if [ "$i" -lt "$iterations" ]; then
            log "Sleeping for 5 minutes..."
            log "Press Ctrl+C to stop monitoring early"
            sleep "$sleep_seconds" &
            wait $!
        fi
    done
    
    header "Monitoring Complete"
    
    generate_monitoring_report
    
    success "Monitoring completed successfully"
    log "Review the monitoring report for detailed findings"
}

# Run main
main
