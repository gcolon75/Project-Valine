# Migration Runbook - Profile Links Migration

## Overview
This runbook guides the deployment of database migrations for Project Valine, specifically the migration from legacy socialLinks JSON to the normalized profile_links table.

## Prerequisites

- [ ] Database backup completed and verified
- [ ] Staging environment accessible
- [ ] DATABASE_URL environment variable configured
- [ ] Node.js 18+ and npm installed
- [ ] Prisma CLI available (`npm i -g prisma@latest`)
- [ ] Access to application logs and metrics

## Pre-Migration Checklist

### 1. Verify Environment
```bash
# Check database connection
psql "$DATABASE_URL" -c "SELECT version();"

# Verify Prisma client version
cd /home/runner/work/Project-Valine/Project-Valine/api
npx prisma version

# Check current schema status
npx prisma migrate status
```

### 2. Create Database Backup
```bash
# PostgreSQL backup
pg_dump "$DATABASE_URL" > backup_pre_migration_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_pre_migration_*.sql
```

### 3. Document Current State
```bash
# Count profiles with socialLinks
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM profiles WHERE \"socialLinks\" IS NOT NULL;"

# Sample existing data
psql "$DATABASE_URL" -c "SELECT id, \"userId\", \"socialLinks\" FROM profiles WHERE \"socialLinks\" IS NOT NULL LIMIT 3;"
```

## Migration Phases

### Phase 1: Apply Prisma Schema Migrations (5-10 minutes)

#### Step 1.1: Generate Prisma Client
```bash
cd /home/runner/work/Project-Valine/Project-Valine/api
npm install
npx prisma generate
```

Expected output: ✔ Generated Prisma Client

#### Step 1.2: Review Pending Migrations
```bash
npx prisma migrate status
```

Expected migrations to apply:
- `20251105004900_add_user_theme_preference`
- `20251105005100_add_profile_title`
- `20251105030800_add_profile_links_table`
- `20251105210000_add_profile_links_ordering`

#### Step 1.3: Deploy Migrations
```bash
npx prisma migrate deploy
```

Expected output: 
```
✔ Applied migration: 20251105004900_add_user_theme_preference
✔ Applied migration: 20251105005100_add_profile_title
✔ Applied migration: 20251105030800_add_profile_links_table
✔ Applied migration: 20251105210000_add_profile_links_ordering
```

#### Step 1.4: Verify Schema Changes
```bash
# Verify new columns exist
psql "$DATABASE_URL" -c "\d users"  # Should show 'theme' column
psql "$DATABASE_URL" -c "\d profiles"  # Should show 'title' column
psql "$DATABASE_URL" -c "\d profile_links"  # Should show table structure
```

**Rollback for Phase 1:** See [Rollback Procedures](#rollback-procedures)

### Phase 2: Data Migration - socialLinks to profile_links (10-20 minutes)

#### Step 2.1: Dry Run Migration
```bash
cd /home/runner/work/Project-Valine/Project-Valine/api
npm run migrate:social-links:dry-run > /tmp/migration_dry_run_$(date +%Y%m%d_%H%M%S).log
```

Review output:
- Number of profiles to migrate
- Links per profile
- Any validation errors or warnings

#### Step 2.2: Validate Dry Run Results
```bash
# Check the log file
tail -50 /tmp/migration_dry_run_*.log

# Expected format:
# Profile user_123: Found 3 links to migrate
#   [DRY RUN] Would create 3 profile links
#   - Website (website): https://example.com
#   - IMDb Profile (imdb): https://imdb.com/name/...
#   - Showreel (showreel): https://vimeo.com/...
```

**Decision Point:** 
- ✅ If dry run looks correct, proceed to Step 2.3
- ❌ If errors found, investigate and fix before proceeding

#### Step 2.3: Execute Migration
```bash
npm run migrate:social-links > /tmp/migration_live_$(date +%Y%m%d_%H%M%S).log 2>&1
```

Monitor progress in real-time:
```bash
tail -f /tmp/migration_live_*.log
```

#### Step 2.4: Verify Data Migration
```bash
# Count migrated profile links
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM profile_links;"

# Check sample migrated data
psql "$DATABASE_URL" -c "SELECT pl.*, p.\"userId\" FROM profile_links pl JOIN profiles p ON pl.\"profileId\" = p.id LIMIT 5;"

# Verify no duplicate URLs per user
psql "$DATABASE_URL" -c "SELECT \"userId\", url, COUNT(*) as cnt FROM profile_links GROUP BY \"userId\", url HAVING COUNT(*) > 1;"
```

Expected: 0 duplicate URLs

**Rollback for Phase 2:** Migration is non-destructive; original socialLinks preserved. To revert, simply delete profile_links rows.

### Phase 3: Backend Integration Tests (15-20 minutes)

#### Step 3.1: Install Server Dependencies
```bash
cd /home/runner/work/Project-Valine/Project-Valine/server
npm install
```

#### Step 3.2: Run Integration Tests
```bash
# Set test environment variables
export DATABASE_URL="$DATABASE_URL"
export API_URL="http://localhost:5000"

# Run tests
npm run test:server
```

Expected: All tests pass (or note which tests are expected to fail)

#### Step 3.3: Review Test Results
```bash
# Check for test failures
grep -E "(FAIL|✗)" /tmp/test_results_*.log

# Count passed/failed tests
grep -c "✓" /tmp/test_results_*.log
grep -c "✗" /tmp/test_results_*.log
```

### Phase 4: Smoke Tests (10-15 minutes)

Run comprehensive smoke tests covering:
- Authentication endpoints
- Profile CRUD operations
- Profile links management
- Theme preferences
- Dashboard stats

```bash
cd /home/runner/work/Project-Valine/Project-Valine/scripts/deployment
./smoke-test-staging.sh
```

See detailed smoke test procedures in [smoke-test-staging.sh](./smoke-test-staging.sh)

### Phase 5: Monitoring and Validation (2 hours)

#### Step 5.1: Monitor Application Logs
```bash
# If using AWS CloudWatch
aws logs tail /aws/lambda/valine-api --follow --since 2h

# If using journalctl
journalctl -u valine-api -f --since "2 hours ago"

# If using PM2
pm2 logs valine-api --lines 100 --raw
```

#### Step 5.2: Check Error Rates
```bash
# Count 5xx errors in last 2 hours
grep "500\|502\|503\|504" /var/log/nginx/access.log | wc -l

# Check for database errors
grep -i "prisma\|database\|sql" /var/log/valine-api.log | grep -i error
```

#### Step 5.3: Verify Database Metrics
```bash
# Check connection pool
psql "$DATABASE_URL" -c "SELECT count(*) as connections FROM pg_stat_activity WHERE datname = current_database();"

# Check slow queries (> 1 second)
psql "$DATABASE_URL" -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE (now() - pg_stat_activity.query_start) > interval '1 second';"
```

#### Step 5.4: Monitor Rate Limits
```bash
# Check rate limit counters (if using Redis)
redis-cli INFO stats | grep instantaneous_ops

# Check for rate limit hits in logs
grep -i "rate.limit" /var/log/valine-api.log | tail -20
```

## Success Criteria

✅ All Prisma migrations applied successfully
✅ Data migration completed without data loss
✅ All socialLinks migrated to profile_links table
✅ Backend integration tests passing (>95%)
✅ All smoke tests passing
✅ No significant increase in error rates (< 0.1%)
✅ Database performance stable (query time < 100ms p95)
✅ No rate limit violations detected
✅ 2-hour monitoring period completed without incidents

## Rollback Procedures

### Critical: When to Rollback
Rollback if any of these occur:
- Migration script fails and cannot be fixed quickly
- Data corruption detected
- Error rate exceeds 5%
- Database performance degrades significantly (>500ms p95)
- Critical functionality broken

### Rollback Phase 2 (Data Migration)
```bash
# 1. Stop the migration if still running
pkill -f migrate-social-links.js

# 2. Delete migrated profile links (keeps original socialLinks intact)
psql "$DATABASE_URL" -c "DELETE FROM profile_links;"

# 3. Verify
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM profile_links;"  # Should be 0

# 4. Verify socialLinks still exist
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM profiles WHERE \"socialLinks\" IS NOT NULL;"
```

### Rollback Phase 1 (Schema Migrations)

**Option A: Use Prisma Migration Rollback**
```bash
cd /home/runner/work/Project-Valine/Project-Valine/api/prisma/migrations

# Rollback ordering migration
cd 20251105210000_add_profile_links_ordering
cat ROLLBACK.md  # Follow rollback instructions

# Rollback profile_links table
cd ../20251105030800_add_profile_links_table
cat ROLLBACK.md  # Follow rollback instructions

# Rollback profile title
cd ../20251105005100_add_profile_title
cat ROLLBACK.md  # Follow rollback instructions

# Rollback theme preference
cd ../20251105004900_add_user_theme_preference
cat ROLLBACK.md  # Follow rollback instructions
```

**Option B: Full Database Restore (Last Resort)**
```bash
# 1. Stop application
systemctl stop valine-api  # or pm2 stop all

# 2. Restore from backup
psql "$DATABASE_URL" < backup_pre_migration_*.sql

# 3. Verify restoration
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM profiles;"

# 4. Restart application
systemctl start valine-api  # or pm2 restart all
```

## Post-Migration Tasks

### Immediate (within 24 hours)
- [ ] Update monitoring dashboards with new metrics
- [ ] Document any issues encountered
- [ ] Send migration summary report to stakeholders
- [ ] Archive migration logs

### Short-term (within 1 week)
- [ ] Review application performance over 7 days
- [ ] Collect user feedback on profile features
- [ ] Optimize database indexes if needed
- [ ] Plan deprecation of socialLinks JSON field (future)

### Long-term (within 1 month)
- [ ] Add profile_links to regular backup procedures
- [ ] Update documentation for new profile features
- [ ] Train support team on new profile structure

## Contact Information

**On-Call Engineer:** [Your contact]
**Database Team:** [DBA contact]
**DevOps Team:** [DevOps contact]

## Appendix

### A. Migration Timeline
Total estimated time: 3-4 hours
- Phase 1: 10 min (schema migrations)
- Phase 2: 20 min (data migration)
- Phase 3: 20 min (integration tests)
- Phase 4: 15 min (smoke tests)
- Phase 5: 2 hours (monitoring)
- Buffer: 30 min (contingency)

### B. Database Schema Changes

**users table:**
- Added: `theme` VARCHAR (nullable)

**profiles table:**
- Added: `title` VARCHAR (nullable)

**profile_links table (new):**
- `id` UUID PRIMARY KEY
- `userId` UUID FOREIGN KEY → users(id)
- `profileId` UUID FOREIGN KEY → profiles(id)
- `label` VARCHAR(40)
- `url` TEXT
- `type` ENUM('website', 'imdb', 'showreel', 'other')
- `position` INTEGER
- `createdAt` TIMESTAMP
- `updatedAt` TIMESTAMP

### C. Useful SQL Queries

```sql
-- Check migration status
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;

-- Count profiles by link count
SELECT COUNT(pl."profileId") as link_count, COUNT(DISTINCT pl."profileId") as profiles
FROM profile_links pl
GROUP BY pl."profileId";

-- Find profiles with most links
SELECT p."userId", COUNT(pl.id) as num_links
FROM profiles p
JOIN profile_links pl ON pl."profileId" = p.id
GROUP BY p."userId"
ORDER BY num_links DESC
LIMIT 10;

-- Verify link types distribution
SELECT type, COUNT(*) as count
FROM profile_links
GROUP BY type
ORDER BY count DESC;
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-05  
**Next Review:** After migration completion
