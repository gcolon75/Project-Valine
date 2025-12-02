---
name: Project Valine Database Agent
description: PostgreSQL, Prisma ORM, and migration expert
---

# Database Agent

## DATABASE INFO
- Type: PostgreSQL on AWS RDS
- Host: project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com
- Port: 5432
- Database: postgres
- Schema location: serverless/prisma/schema.prisma

## COMMON OPERATIONS

### Run Migrations
```powershell
cd C:\Users\ghawk\Documents\GitHub\Project-Valine\serverless
$env:DATABASE_URL="postgresql://<USERNAME>:<PASSWORD>@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require"
npx prisma migrate deploy
```
**Note:** Replace `<USERNAME>` and `<PASSWORD>` with your actual database credentials. Never commit credentials to source control.

### Generate Prisma Client
```powershell
npx prisma generate
```

### Query Database Directly
```powershell
@"
import pg from 'pg';
const { Client } = pg;
const c = new Client({
  connectionString: 'postgresql://<USERNAME>:<PASSWORD>@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres',
  ssl: { rejectUnauthorized: true }
});
c.connect()
  .then(() => c.query('YOUR SQL HERE'))
  .then(r => { console.log(r.rows); c.end(); })
  .catch(e => { console.error(e); c.end(); });
"@ | Out-File -Encoding utf8 query.js
node query.js
```
**Note:** Replace `<USERNAME>` and `<PASSWORD>` with your actual database credentials. The `ssl: { rejectUnauthorized: true }` setting validates SSL certificates (recommended for production). Use `rejectUnauthorized: false` only for local testing with self-signed certificates.

### Add Column to Existing Table
```sql
ALTER TABLE "tablename" ADD COLUMN IF NOT EXISTS "columnName" TEXT;
```

## CURRENT TABLES
Based on the Prisma schema (serverless/prisma/schema.prisma):
- users, profiles, posts, reels, comments, likes, bookmarks
- connection_requests, conversations, conversation_participants, messages
- notifications, media, credits, education
- user_settings, reel_requests, refresh_tokens, email_verification_tokens
- moderation_reports, moderation_actions, analytics_events
- audit_logs, auditions, scripts, sessions
- password_reset_tokens, profile_links, two_factor_recovery_codes
- pr_intelligence, test_runs
