# Profile Links Migration Guide

## Overview

This guide provides step-by-step instructions for deploying the new normalized profile links feature. The migration introduces a dedicated `profile_links` table to replace the JSON-based `socialLinks` field in the profiles table.

## What's New

### Schema Changes
- **New Table**: `profile_links` for normalized link storage
- **New Field**: `title` on User profiles (already migrated in previous release)

### API Changes
- **GET /profiles/:userId**: Now includes `links` array
- **PATCH /profiles/:userId**: Accepts `links` array for batch updates
- **New Endpoints**: 
  - `GET /profiles/:userId/links`
  - `POST /profiles/:userId/links`
  - `PATCH /profiles/:userId/links/:linkId`
  - `DELETE /profiles/:userId/links/:linkId`

## Migration Steps

### Phase 1: Database Schema Update

1. **Backup Database**
   ```bash
   # PostgreSQL
   pg_dump -h localhost -U username valine_db > backup_$(date +%Y%m%d).sql
   ```

2. **Apply Migration**
   ```bash
   cd api
   npx prisma migrate deploy
   ```

   This will apply migration `20251105030800_add_profile_links_table` which:
   - Creates `profile_links` table
   - Adds foreign keys to `users` and `profiles`
   - Creates indexes for performance

3. **Verify Migration**
   ```bash
   # Check table exists
   psql -h localhost -U username -d valine_db -c "\d profile_links"
   
   # Verify indexes
   psql -h localhost -U username -d valine_db -c "\di profile_links*"
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

### Phase 3: Data Migration (Optional)

If you have existing `socialLinks` data in profiles, you can migrate it:

```javascript
// Migration script (run once)
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateProfileLinks() {
  const profiles = await prisma.profile.findMany({
    where: {
      socialLinks: { not: null }
    }
  })
  
  for (const profile of profiles) {
    const socialLinks = profile.socialLinks
    const links = []
    
    // Convert JSON socialLinks to normalized links
    if (socialLinks.website) {
      links.push({
        userId: profile.userId,
        profileId: profile.id,
        label: 'Website',
        url: socialLinks.website,
        type: 'website'
      })
    }
    
    if (socialLinks.imdb) {
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
