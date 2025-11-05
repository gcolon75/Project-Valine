# Deployment Scripts - Usage Examples

This document provides practical examples for using the migration deployment and testing scripts.

## Prerequisites

Before running any deployment scripts, ensure you have:

1. **Environment Variables Set:**
   ```bash
   export DATABASE_URL="postgresql://username:password@hostname:5432/database_name"
   export API_BASE="http://your-staging-api.example.com"
   # or for local testing
   export API_BASE="http://localhost:5000"
   ```

2. **Required Tools Installed:**
   - Node.js 18+ (`node --version`)
   - npm (`npm --version`)
   - PostgreSQL client - psql (`psql --version`)
   - curl (`curl --version`)

3. **Database Backup Created:**
   ```bash
   # Create backup before any migration
   pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

---

## Example 1: Full Migration Deployment (Dry Run)

**Scenario:** You want to see what would happen without making any actual changes.

```bash
cd /home/runner/work/Project-Valine/Project-Valine/scripts/deployment

# Set environment
export DATABASE_URL="postgresql://user:pass@localhost:5432/valine_staging"

# Run in dry-run mode
./deploy-migrations.sh --dry-run

# Review the output
# - Check which migrations would be applied
# - Review data migration preview
# - No actual changes are made
```

**Expected Output:**
```
=========================================
Phase 1: Applying Prisma Schema Migrations
=========================================
✓ Dependencies installed
✓ Prisma Client generated
⚠ DRY RUN mode - skipping actual migration deployment
Would deploy the following migrations:
  20251105004900_add_user_theme_preference
  20251105005100_add_profile_title
  20251105030800_add_profile_links_table
  20251105210000_add_profile_links_ordering

=========================================
Phase 2: Migrating Legacy Data
=========================================
⚠ DRY RUN mode - skipping actual data migration
...
```

---

## Example 2: Full Migration Deployment (Live)

**Scenario:** Deploy all migrations to staging environment with full validation.

```bash
cd /home/runner/work/Project-Valine/Project-Valine/scripts/deployment

# Set environment
export DATABASE_URL="postgresql://user:pass@staging-db.example.com:5432/valine_staging"
export API_BASE="http://staging-api.example.com"

# Run full deployment
./deploy-migrations.sh

# The script will:
# 1. Apply Prisma migrations
# 2. Show data migration dry-run
# 3. Prompt for confirmation
# 4. Run live data migration
# 5. Run integration tests
# 6. Run smoke tests
# 7. Generate report

# Review the generated report
cat ~/logs/migration_report_*.md
```

**Interactive Prompts:**
```
⚠ About to run LIVE data migration
Review dry-run results above. Continue with live migration? (yes/no): yes
```

**Expected Output:**
```
=========================================
Deployment Complete
=========================================
✓ Migration deployment completed successfully!

Next steps:
1. Monitor logs for 2 hours: tail -f /var/log/valine-api.log
2. Check database performance
3. Review error rates
4. See full report: /home/runner/work/Project-Valine/Project-Valine/logs/migration_report_20251105_220000.md
```

---

## Example 3: Quick Smoke Test Only

**Scenario:** Quickly verify that all critical endpoints are working after deployment.

```bash
cd /home/runner/work/Project-Valine/Project-Valine/scripts/deployment

# Set API endpoint
export API_BASE="http://staging-api.example.com"
export DATABASE_URL="postgresql://user:pass@staging-db:5432/valine_staging"

# Run smoke tests
./smoke-test-staging.sh

# View results
echo $?  # 0 = all passed, 1 = some failed
```

**Expected Output:**
```
=========================================
Starting Smoke Tests
=========================================
API Base URL: http://staging-api.example.com
Log file: /tmp/smoke_test_20251105_220000.log

Test Suite: Health Check
-----------------------------------------
✓ Health check endpoint - Status: 200
✓ Server is healthy and responding

Test Suite: Profile Management
-----------------------------------------
✓ GET /profiles/:userId - Profile retrieved successfully
✓ PATCH /profiles/:userId - Correctly requires authorization

Test Suite: Profile Links (New Feature)
-----------------------------------------
✓ GET /profiles/:userId/links - Endpoint is accessible
✓ Response contains 'links' array
✓ POST /profiles/:userId/links - Correctly requires authorization

...

=========================================
Smoke Test Summary
=========================================
Total Tests:  24
Passed:       24
Failed:       0

All tests passed!
```

---

## Example 4: Run Integration Tests Only

**Scenario:** Run backend integration tests after code changes.

```bash
cd /home/runner/work/Project-Valine/Project-Valine/scripts/deployment

# Set environment
export DATABASE_URL="postgresql://user:pass@localhost:5432/valine_test"
export API_URL="http://localhost:5000"

# Start the API server in background (if not running)
cd ../../server
npm install
npm run dev &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Run integration tests
cd ../scripts/deployment
./run-integration-tests.sh --verbose

# Stop server
kill $SERVER_PID

# View report
cat /tmp/integration_test_report_*.md
```

**Expected Output:**
```
=========================================
Running Integration Tests
=========================================
Test configuration:
  API_URL: http://localhost:5000
  DATABASE_URL: postgresql://user:pass@localh...

✓ All integration tests passed!

Summary:
  Passed: 45
  Failed: 0

Report generated: /tmp/integration_test_report_20251105_220000.md
```

---

## Example 5: Monitor Deployment (2 Hours)

**Scenario:** Monitor application health for 2 hours after migration deployment.

```bash
cd /home/runner/work/Project-Valine/Project-Valine/scripts/deployment

# Set environment
export DATABASE_URL="postgresql://user:pass@staging-db:5432/valine_staging"
export LOG_SOURCE="/var/log/valine-api.log"  # or "cloudwatch" or "pm2"

# Run monitoring (default 2 hours)
./monitor-deployment.sh

# Or specify custom duration (e.g., 30 minutes for testing)
./monitor-deployment.sh --duration 30

# The script will sample metrics every 5 minutes
# Press Ctrl+C to stop early if needed
```

**Expected Output:**
```
=========================================
Starting Post-Deployment Monitoring
=========================================
Duration: 120 minutes
Will sample metrics 24 times (every 5 minutes)

=========================================
Monitoring Iteration 1/24
=========================================
Sampling metrics (iteration 1)...
✓ No errors detected
Connections: 12
Active queries: 2
Slow queries: 0
Database size: 1024 MB
Profile links: 450

Sleeping for 5 minutes...
...

=========================================
Monitoring Complete
=========================================
✓ Monitoring completed successfully
Review the monitoring report for detailed findings

Report generated: /tmp/monitoring_report_20251105_220000.md
```

---

## Example 6: Local Development Testing

**Scenario:** Test migration scripts locally before deploying to staging.

```bash
# Setup local database
createdb valine_test

# Set local environment
export DATABASE_URL="postgresql://localhost:5432/valine_test"
export API_BASE="http://localhost:5000"

# Start API server
cd /home/runner/work/Project-Valine/Project-Valine/server
npm install
npm run dev &
SERVER_PID=$!

# Run migrations (dry-run first)
cd ../scripts/deployment
./deploy-migrations.sh --dry-run

# If dry-run looks good, run live
./deploy-migrations.sh

# Run smoke tests
./smoke-test-staging.sh

# Cleanup
kill $SERVER_PID
dropdb valine_test
```

---

## Example 7: Migration Rollback

**Scenario:** Something went wrong and you need to rollback.

```bash
# Option 1: Delete migrated data (keeps schema)
psql "$DATABASE_URL" -c "DELETE FROM profile_links;"

# Verify
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM profile_links;"  # Should be 0

# Option 2: Follow detailed rollback in runbook
cat /home/runner/work/Project-Valine/Project-Valine/scripts/deployment/MIGRATION_RUNBOOK.md

# Option 3: Full database restore (last resort)
psql "$DATABASE_URL" < backup_20251105_120000.sql
```

---

## Example 8: CI/CD Integration

**Scenario:** Run deployment scripts in CI/CD pipeline.

### GitHub Actions Example:

```yaml
name: Deploy Migrations

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Deploy Migrations
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
          API_BASE: ${{ secrets.STAGING_API_BASE }}
        run: |
          cd scripts/deployment
          ./deploy-migrations.sh
      
      - name: Monitor Deployment
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
        run: |
          cd scripts/deployment
          ./monitor-deployment.sh --duration 30
      
      - name: Upload Reports
        uses: actions/upload-artifact@v3
        with:
          name: migration-reports
          path: logs/*.md
```

### AWS CodePipeline Example:

```bash
#!/bin/bash
# buildspec.yml - build phase

export DATABASE_URL="${DATABASE_URL_PARAM}"
export API_BASE="${API_BASE_PARAM}"

cd scripts/deployment

# Run deployment
./deploy-migrations.sh

# Verify with smoke tests
./smoke-test-staging.sh

# Upload logs to S3
aws s3 cp logs/ s3://my-bucket/deployment-logs/ --recursive
```

---

## Example 9: Monitoring with CloudWatch

**Scenario:** Monitor deployment using AWS CloudWatch logs.

```bash
cd /home/runner/work/Project-Valine/Project-Valine/scripts/deployment

# Set environment for CloudWatch
export DATABASE_URL="postgresql://user:pass@prod-db.aws.com:5432/valine_prod"
export LOG_SOURCE="cloudwatch"

# Ensure AWS credentials are configured
aws configure list

# Run monitoring
./monitor-deployment.sh --duration 120

# The script will use AWS CLI to tail CloudWatch logs
# /aws/lambda/valine-api
```

---

## Example 10: Skip Tests During Emergency Deployment

**Scenario:** Emergency hotfix needs to be deployed quickly.

```bash
cd /home/runner/work/Project-Valine/Project-Valine/scripts/deployment

export DATABASE_URL="postgresql://user:pass@staging-db:5432/valine_staging"

# Skip tests to save time (NOT RECOMMENDED for normal deployments)
./deploy-migrations.sh --skip-tests

# Manually run smoke tests after
./smoke-test-staging.sh
```

---

## Troubleshooting

### Issue: DATABASE_URL not set

```bash
# Error: DATABASE_URL environment variable is not set

# Solution:
export DATABASE_URL="postgresql://user:password@host:5432/database"
```

### Issue: Permission denied

```bash
# Error: ./deploy-migrations.sh: Permission denied

# Solution:
chmod +x scripts/deployment/*.sh
```

### Issue: Tests failing

```bash
# Check if API is running
curl http://localhost:5000/health

# Check if database is accessible
psql "$DATABASE_URL" -c "SELECT 1"

# Review test logs
cat /tmp/integration_tests_*.log
cat /tmp/smoke_test_*.log
```

### Issue: Migration fails midway

```bash
# Check migration status
cd api
npx prisma migrate status

# Review logs
cat logs/deployment_*.log

# Follow rollback procedures in MIGRATION_RUNBOOK.md
```

---

## Best Practices

1. **Always create a database backup before migrations:**
   ```bash
   pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Run dry-run first:**
   ```bash
   ./deploy-migrations.sh --dry-run
   ```

3. **Review generated reports:**
   ```bash
   cat logs/migration_report_*.md
   ```

4. **Monitor for at least 2 hours:**
   ```bash
   ./monitor-deployment.sh --duration 120
   ```

5. **Test in lower environments first:**
   - Local → Dev → Staging → Production

6. **Keep logs for auditing:**
   ```bash
   # Archive logs
   tar -czf deployment_logs_$(date +%Y%m%d).tar.gz logs/
   ```

---

## Quick Reference

| Script | Purpose | Key Options |
|--------|---------|-------------|
| `deploy-migrations.sh` | Full migration deployment | `--dry-run`, `--skip-tests` |
| `smoke-test-staging.sh` | Quick endpoint validation | None |
| `run-integration-tests.sh` | Backend test suite | `--verbose` |
| `monitor-deployment.sh` | Post-deployment monitoring | `--duration MINUTES` |

**Required Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `API_BASE` or `API_URL` - API endpoint URL

**Generated Files:**
- `logs/deployment_*.log` - Deployment logs
- `logs/migration_report_*.md` - Migration reports
- `/tmp/smoke_test_*.log` - Smoke test logs
- `/tmp/integration_tests_*.log` - Integration test logs
- `/tmp/monitoring_report_*.md` - Monitoring reports

---

**Last Updated:** 2025-11-05  
**See Also:** [MIGRATION_RUNBOOK.md](./MIGRATION_RUNBOOK.md) | [README.md](./README.md)
