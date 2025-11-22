# Deployment Guide: Fix Missing User Columns

## Problem
The `users` table in PostgreSQL is missing three columns that exist in the Prisma schema:
- `onboardingComplete` (Boolean)
- `status` (String)
- `theme` (String)

## Solution
Run the migration application script that directly executes SQL against PostgreSQL.

## Steps

### 1. Install Dependencies
```bash
cd api
npm install pg
```

### 2. Set Database URL
```bash
export DATABASE_URL="postgresql://ValineColon_75:PASSWORD@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require"
```

### 3. Verify Current State (Optional)
```bash
node scripts/verify-user-columns.mjs
# Should show missing columns
```

### 4. Apply Migration
```bash
node scripts/apply-missing-columns-migration.mjs
```

### 5. Verify Fix
```bash
node scripts/verify-user-columns.mjs
# Should show all columns exist
```

### 6. Regenerate Prisma Client
```bash
cd api
npx prisma generate

cd ../serverless
npx prisma generate
```

### 7. Test User Creation
```bash
node scripts/admin-upsert-user.mjs \
  --email "ghawk075@gmail.com" \
  --password "Test123!" \
  --display-name "Gabriel Colon"
```

## Expected Output

```
🔄 Applying missing columns migration...

✅ Connected to database

📄 Executing migration SQL...

✅ Migration executed successfully

📊 Verification Results:
========================

✅ All 3 columns exist:

  - onboardingComplete
    Type: boolean
    Nullable: NO
    Default: false

  - status
    Type: character varying
    Nullable: NO
    Default: 'active'::character varying

  - theme
    Type: character varying
    Nullable: YES
    Default: none

✅ Migration marked as applied in Prisma history

🎉 Migration completed successfully!
```

## Rollback (if needed)

```sql
ALTER TABLE users DROP COLUMN IF EXISTS "onboardingComplete";
ALTER TABLE users DROP COLUMN IF EXISTS status;
ALTER TABLE users DROP COLUMN IF EXISTS theme;
```

## Why This Works

- **Direct SQL execution**: Bypasses Prisma's migration system
- **Idempotent**: Uses DO blocks with IF NOT EXISTS checks
- **Verification**: Confirms columns exist after execution
- **Updates Prisma history**: Marks migration as applied to prevent future drift

## Security Notes

- The default connection string in the scripts is for **development purposes only**
- Always use environment variables for credentials in production
- The password shown in the problem statement should be rotated after this fix
- SSL mode is set to `require` for secure connections
