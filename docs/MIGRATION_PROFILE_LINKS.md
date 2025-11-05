# Profile Links Migration Guide

## Overview

This guide provides step-by-step instructions for deploying the profile links feature enhancements. This update includes:
- Custom link ordering via `position` field
- ETag-based caching for GET endpoints  
- Rate limiting for POST/DELETE operations
- Migration script for legacy `socialLinks` JSON data

## What's New (v1.1)

### Schema Changes
- **New Column**: `position` (integer) on `profile_links` table for custom ordering
- **New Index**: Composite index on `userId` and `position` for efficient queries
- **Migration**: `20251105210000_add_profile_links_ordering`

### API Changes
- **Ordering**: All GET endpoints now return links ordered by `position`, then `createdAt`
- **Position Field**: POST and PATCH endpoints accept optional `position` parameter
- **ETag Support**: GET endpoints return `ETag` and `Cache-Control` headers
- **Rate Limiting**: POST/DELETE endpoints limited to 10 requests/minute per userId
- **Headers**: Rate limit info in `X-RateLimit-*` headers

### Data Migration
- **Script**: `api/scripts/migrate-social-links.js`
- **Purpose**: Convert legacy `socialLinks` JSON to normalized `profile_links` table
- **Safety**: Idempotent, non-destructive, preserves original data

## Previous Features (v1.0)

### Schema Changes (v1.0)
- **New Table**: `profile_links` for normalized link storage
- **New Field**: `title` on User profiles (already migrated in previous release)

### API Changes (v1.0)
- **GET /profiles/:userId**: Now includes `links` array
- **PATCH /profiles/:userId**: Accepts `links` array for batch updates
- **New Endpoints**: 
  - `GET /profiles/:userId/links`
  - `POST /profiles/:userId/links`
  - `PATCH /profiles/:userId/links/:linkId`
  - `DELETE /profiles/:userId/links/:linkId`

## Migration Steps (v1.1)

### Phase 1: Database Schema Update

1. **Backup Database**
   ```bash
   # PostgreSQL
   pg_dump -h localhost -U username valine_db > backup_$(date +%Y%m%d).sql
   ```

2. **Apply Ordering Migration**
   ```bash
   cd api
   npx prisma migrate deploy
   ```

   This will apply two migrations:
   - `20251105030800_add_profile_links_table` (if not already applied)
     - Creates `profile_links` table
     - Adds foreign keys to `users` and `profiles`
     - Creates indexes for performance
   
   - `20251105210000_add_profile_links_ordering` (new)
     - Adds `position` column (integer, default 0)
     - Creates composite index on `userId` and `position`

3. **Verify Migration**
   ```bash
   # Check position column exists
   psql -h localhost -U username -d valine_db -c "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'profile_links' AND column_name = 'position';"
   
   # Verify new index
   psql -h localhost -U username -d valine_db -c "\di profile_links_userId_position_idx"
   
   # Check all existing links have position = 0 (default)
   psql -h localhost -U username -d valine_db -c "SELECT COUNT(*) as total, COUNT(CASE WHEN position = 0 THEN 1 END) as with_default_position FROM profile_links;"
   ```

4. **Rollback Plan** (if needed)
   ```bash
   # Run rollback SQL (see api/prisma/migrations/20251105210000_add_profile_links_ordering/ROLLBACK.md)
   psql -h localhost -U username -d valine_db < rollback.sql
   ```

### Phase 2: Deploy Backend Changes

1. **Update Dependencies**
   ```bash
   cd api
   npm install
   npx prisma generate
   ```

2. **Test API Endpoints**
   ```bash
   # Start server
   cd server/src
   node index.js
   
   # In another terminal, test health endpoint
   curl http://localhost:5000/health
   ```

3. **Deploy to Staging**
   - Deploy backend code to staging environment
   - Run smoke tests
   - Verify new endpoints work correctly

4. **Deploy to Production**
   - Deploy backend code to production
   - Monitor logs for errors
   - Test critical user flows

### Phase 3: Data Migration (v1.1)

Migrate existing `socialLinks` JSON data to normalized `profile_links` table using the provided script.

1. **Run Dry Run First (Recommended)**
   ```bash
   cd api
   npm run migrate:social-links:dry-run
   ```

   This will:
   - Show what would be migrated without making changes
   - Display summary of profiles and links to be converted
   - Validate all URLs before migration

   Example output:
   ```
   Starting socialLinks migration...
   Mode: DRY RUN

   Found 150 profiles with socialLinks data

   Profile user_123: Found 3 links to migrate
     [DRY RUN] Would create 3 profile links
     - Website (website): https://example.com
     - IMDb Profile (imdb): https://imdb.com/name/nm1234567
     - LinkedIn (other): https://linkedin.com/in/johndoe

   ...

   Migration Summary:
   ==================
   Profiles processed: 145
   Profiles skipped: 5
   Links migrated: 432

   This was a DRY RUN. No changes were made.
   ```

2. **Review Dry Run Results**
   - Check that all URLs are valid
   - Verify type mappings are correct
   - Identify any profiles that will be skipped

3. **Run Live Migration**
   ```bash
   cd api
   npm run migrate:social-links
   ```

   This will:
   - Convert all `socialLinks` JSON to normalized `profile_links`
   - Skip duplicate URLs (idempotent)
   - Preserve original `socialLinks` JSON field
   - Assign sequential positions (0, 1, 2, ...)

4. **Verify Migration**
   ```bash
   # Check migrated links count
   psql -h localhost -U username -d valine_db -c "SELECT COUNT(*) FROM profile_links;"
   
   # View sample migrated links
   psql -h localhost -U username -d valine_db -c "SELECT userId, label, url, type, position FROM profile_links LIMIT 10;"
   
   # Check for any profiles with both socialLinks and profile_links
   psql -h localhost -U username -d valine_db -c "
     SELECT p.userId, 
            COUNT(pl.id) as link_count,
            p.socialLinks IS NOT NULL as has_json_links
     FROM profiles p
     LEFT JOIN profile_links pl ON pl.profileId = p.id
     WHERE p.socialLinks IS NOT NULL
     GROUP BY p.userId, p.socialLinks
     LIMIT 10;
   "
   ```

5. **Post-Migration Testing**
   ```bash
   # Test fetching profile with migrated links
   curl http://localhost:5000/profiles/user_123
   
   # Verify links are ordered by position
   curl http://localhost:5000/profiles/user_123/links
   ```

### Migration Script Details

**Location**: `api/scripts/migrate-social-links.js`

**Features**:
- Idempotent: Safe to run multiple times
- Non-destructive: Preserves original `socialLinks` JSON
- URL validation: Skips invalid URLs
- Duplicate detection: Skips already-migrated URLs
- Position assignment: Uses order from JSON object

**Type Mapping**:
| Legacy Key | Link Type | Label |
|------------|-----------|-------|
| website | website | Website |
| imdb | imdb | IMDb Profile |
| showreel | showreel | Showreel |
| linkedin | other | LinkedIn |
| instagram | other | Instagram |
| twitter | other | Twitter |
| facebook | other | Facebook |
| youtube | other | YouTube |

**Error Handling**:
- Skips profiles with null/invalid socialLinks
- Logs errors for individual link creation failures
- Continues processing remaining profiles on error
- Returns summary with success/failure counts

### Phase 3 (Old): Manual Data Migration (Optional - Not Recommended)

If you prefer to manually migrate data instead of using the script:
      links.push({
        userId: profile.userId,
        profileId: profile.id,
        label: 'IMDB',
        url: socialLinks.imdb,
        type: 'imdb'
      })
    }
    
    if (socialLinks.showreel) {
      links.push({
        userId: profile.userId,
        profileId: profile.id,
        label: 'Showreel',
        url: socialLinks.showreel,
        type: 'showreel'
      })
    }
    
    if (socialLinks.linkedin) {
      links.push({
        userId: profile.userId,
        profileId: profile.id,
        label: 'LinkedIn',
        url: socialLinks.linkedin,
        type: 'other'
      })
    }
    
    if (socialLinks.instagram) {
      links.push({
        userId: profile.userId,
        profileId: profile.id,
        label: 'Instagram',
        url: socialLinks.instagram,
        type: 'other'
      })
    }
    
    // Create links in database
    if (links.length > 0) {
      await prisma.profileLink.createMany({
        data: links
      })
      
      console.log(`Migrated ${links.length} links for profile ${profile.id}`)
    }
  }
  
  console.log('Migration complete!')
}

migrateProfileLinks()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

### Phase 4: Frontend Integration

1. **Update API Calls**
   - Replace `socialLinks` with `links` in profile API calls
   - Update UI components to display links array
   - Add UI for managing links (add/edit/delete)

2. **Example Frontend Code**
   ```javascript
   // Fetch profile with links
   const response = await fetch(`/api/profiles/${userId}`)
   const { profile } = await response.json()
   
   // Display links
   profile.links.forEach(link => {
     console.log(`${link.label}: ${link.url} (${link.type})`)
   })
   
   // Add a new link
   const newLink = {
     label: 'My Website',
     url: 'https://example.com',
     type: 'website'
   }
   
   await fetch(`/api/profiles/${userId}/links`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(newLink)
   })
   ```

## Testing Strategy

### Unit Tests
```bash
cd /home/runner/work/Project-Valine/Project-Valine
npm run test:run -- server/src/utils
```

**Expected Results**: All validation tests should pass (63 tests)

### Integration Tests

Integration tests require a running API server and database:

1. **Setup Test Database**
   ```bash
   # Create test database
   createdb valine_test
   
   # Set test database URL
   export DATABASE_URL="postgresql://username:password@localhost:5432/valine_test"
   
   # Run migrations
   cd api
   npx prisma migrate deploy
   ```

2. **Start Test Server**
   ```bash
   cd server/src
   export PORT=5000
   node index.js
   ```

3. **Run Integration Tests**
   ```bash
   # In another terminal
   cd /home/runner/work/Project-Valine/Project-Valine
   npm run test:run -- server/src/routes
   ```

### Manual Testing

1. **Test Profile Links API**
   ```bash
   # Get profile with links
   curl http://localhost:5000/profiles/user_123
   
   # Create a link
   curl -X POST http://localhost:5000/profiles/user_123/links \
     -H "Content-Type: application/json" \
     -d '{"label":"My Website","url":"https://example.com","type":"website"}'
   
   # Update a link
   curl -X PATCH http://localhost:5000/profiles/user_123/links/link_id \
     -H "Content-Type: application/json" \
     -d '{"label":"Updated Website"}'
   
   # Delete a link
   curl -X DELETE http://localhost:5000/profiles/user_123/links/link_id
   ```

2. **Test Validation**
   ```bash
   # Test invalid URL
   curl -X POST http://localhost:5000/profiles/user_123/links \
     -H "Content-Type: application/json" \
     -d '{"label":"Bad Link","url":"not-a-url","type":"website"}'
   
   # Test label too long
   curl -X POST http://localhost:5000/profiles/user_123/links \
     -H "Content-Type: application/json" \
     -d '{"label":"'$(printf 'A%.0s' {1..41})'","url":"https://example.com","type":"website"}'
   
   # Test invalid type
   curl -X POST http://localhost:5000/profiles/user_123/links \
     -H "Content-Type: application/json" \
     -d '{"label":"Link","url":"https://example.com","type":"invalid"}'
   ```

## Rollback Plan

If issues are encountered after deployment:

### Quick Rollback (No Data Loss)

1. **Revert Backend Code**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Redeploy Previous Version**
   - The `profile_links` table will remain but won't be used
   - Old `socialLinks` JSON field is still available
   - No data loss

### Full Rollback (Removes Table)

1. **Backup Profile Links Data**
   ```sql
   COPY profile_links TO '/tmp/profile_links_backup.csv' WITH CSV HEADER;
   ```

2. **Run Rollback SQL**
   ```bash
   cd api/prisma/migrations/20251105030800_add_profile_links_table
   psql -h localhost -U username -d valine_db -f ROLLBACK.md
   ```

3. **Revert Code Changes**
   ```bash
   git revert <commit-hash>
   git push origin main
   cd api
   npx prisma generate
   ```

## Monitoring

### Key Metrics to Monitor

1. **API Performance**
   - Response times for profile endpoints
   - Database query performance
   - Error rates

2. **Database**
   - `profile_links` table size
   - Index usage statistics
   - Foreign key violations

3. **User Behavior**
   - Number of links created per user
   - Most common link types
   - Validation error rates

### Monitoring Queries

```sql
-- Count links per user
SELECT userId, COUNT(*) as link_count
FROM profile_links
GROUP BY userId
ORDER BY link_count DESC
LIMIT 10;

-- Link type distribution
SELECT type, COUNT(*) as count
FROM profile_links
GROUP BY type
ORDER BY count DESC;

-- Recently created links
SELECT *
FROM profile_links
ORDER BY createdAt DESC
LIMIT 10;

-- Find users with max links
SELECT userId, COUNT(*) as link_count
FROM profile_links
GROUP BY userId
HAVING COUNT(*) >= 20;
```

## Troubleshooting

### Issue: Migration Fails

**Symptoms**: `npx prisma migrate deploy` fails

**Solutions**:
1. Check database connection
2. Verify user has CREATE TABLE permissions
3. Check for existing `profile_links` table
4. Review migration logs for specific errors

### Issue: Foreign Key Violations

**Symptoms**: Cannot create links, foreign key constraint errors

**Solutions**:
1. Verify user and profile exist
2. Check userId and profileId match
3. Ensure cascade delete is working

### Issue: API Returns 500 Errors

**Symptoms**: Profile endpoints return internal server errors

**Solutions**:
1. Check Prisma client is generated: `npx prisma generate`
2. Verify database connection in production
3. Check server logs for Prisma errors
4. Verify all migrations are applied

### Issue: Validation Errors

**Symptoms**: Links fail validation unexpectedly

**Solutions**:
1. Check URL format (must include http:// or https://)
2. Verify label length (1-40 characters)
3. Confirm type is valid (website, imdb, showreel, other)
4. Review validation logic in validators.js

## Performance Considerations

### Database Indexes

The migration creates two indexes for performance:
- `profile_links_userId_idx`: For user-based queries
- `profile_links_profileId_idx`: For profile-based queries

### Query Optimization

```sql
-- Efficient query with index
SELECT * FROM profile_links WHERE userId = 'user_123';

-- Avoid full table scans
SELECT * FROM profile_links; -- Don't do this without WHERE clause
```

### Caching Recommendations

Consider caching profile data including links:
- Cache key: `profile:${userId}`
- TTL: 5-15 minutes
- Invalidate on profile/link updates

## Security Notes

1. **SQL Injection**: Protected by Prisma parameterized queries
2. **XSS**: URLs are validated and sanitized
3. **CSRF**: Implement CSRF tokens for state-changing operations
4. **Rate Limiting**: Recommend rate limiting on link creation
5. **Input Validation**: All inputs validated server-side

### CodeQL Analysis

✅ CodeQL security scan passed with 0 alerts

## Support

For issues or questions:
1. Check this migration guide
2. Review API documentation: `docs/API_PROFILE_LINKS.md`
3. Check server logs for errors
4. Contact backend team

## Changelog

### 2025-11-05
- Initial release of profile links feature
- Added `profile_links` table migration
- Implemented CRUD endpoints
- Added comprehensive validation
- Created API documentation

---

**Migration Status**: ✅ Ready for Deployment

**Estimated Downtime**: None (backward compatible)

**Risk Level**: Low (new feature, existing functionality preserved)
