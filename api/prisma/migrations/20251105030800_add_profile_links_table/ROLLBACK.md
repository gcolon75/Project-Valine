# Rollback Instructions for Profile Links Migration

## Overview
This migration adds the `profile_links` table for normalized storage of user profile links (website, IMDB, showreel, etc.).

## Rollback SQL

To rollback this migration, execute the following SQL:

```sql
-- Drop foreign key constraints
ALTER TABLE "profile_links" DROP CONSTRAINT "profile_links_profileId_fkey";
ALTER TABLE "profile_links" DROP CONSTRAINT "profile_links_userId_fkey";

-- Drop indexes
DROP INDEX "profile_links_profileId_idx";
DROP INDEX "profile_links_userId_idx";

-- Drop table
DROP TABLE "profile_links";
```

## Data Preservation

Before rolling back, if you need to preserve data:

1. Export profile_links data:
```sql
COPY profile_links TO '/tmp/profile_links_backup.csv' WITH CSV HEADER;
```

2. Or export as JSON:
```sql
SELECT json_agg(row_to_json(profile_links.*)) 
FROM profile_links;
```

## Impact Assessment

- **Breaking Change**: Yes, if API consumers are using the new profile links endpoints
- **Data Loss**: All profile links will be deleted
- **Fallback**: Application can fall back to the existing `socialLinks` JSON field in the profiles table

## Steps to Rollback

1. Stop the application
2. Run the rollback SQL above
3. Revert the Prisma schema changes
4. Regenerate Prisma client: `npx prisma generate`
5. Restart the application

## Notes

- Ensure no active connections to the profile_links table before rollback
- If data migration has occurred from socialLinks JSON to profile_links, you may need to restore the JSON data
- Consider keeping the migration for at least one release cycle before removing
