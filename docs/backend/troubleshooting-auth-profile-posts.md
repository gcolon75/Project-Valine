# Troubleshooting Runbook: Auth, Profile, Posts & Feed

**Last Updated:** 2025-12-09  
**Purpose:** Practical commands and procedures for debugging common issues in Project-Valine.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Authentication Issues](#authentication-issues)
3. [Profile Issues](#profile-issues)
4. [Education Issues](#education-issues)
5. [Post & Feed Issues](#post--feed-issues)
6. [Connection/Follow Issues](#connectionfollow-issues)
7. [Lambda/Serverless Issues](#lambdaserverless-issues)
8. [Database Inspection](#database-inspection)

---

## Prerequisites

### Required Tools

```powershell
# PostgreSQL client (psql)
sudo apt-get install postgresql-client

# AWS CLI (for Lambda logs)
pip install awscli

# jq (for JSON parsing)
sudo apt-get install jq
```

### Environment Setup

```powershell
# Set DATABASE_URL (from .env or AWS Parameter Store)
$env:DATABASE_URL = "postgresql://user:pass@host:5432/dbname?sslmode=require"

# Verify connection
psql $DATABASE_URL -c "SELECT NOW();"
```

---

## Authentication Issues

### Issue: "Edit Profile is blank" or "Profile not found on save"

**Symptoms:**
- Profile edit page loads empty
- Save button doesn't work
- 404 errors on profile endpoints

**Debug Steps:**

#### 1. Check if user exists

```powershell
psql $DATABASE_URL -c "SELECT id, email, username, \"displayName\" FROM users WHERE email = 'ghawk075@gmail.com';"
```

**Expected Output:**
```
                  id                  |      email       | username | displayName
--------------------------------------+------------------+----------+-------------
 550e8400-e29b-41d4-a716-446655440000 | ghawk075@gmail.com| ghawk   | Greg Hawk
```

#### 2. Check if profile exists for user

```powershell
# Replace <user-id> with the id from step 1
psql $DATABASE_URL -c "SELECT id, \"userId\", \"vanityUrl\", title, bio FROM profiles WHERE \"userId\" = '<user-id>';"
```

**Expected Output:**
```
                  id                  |               userId               | vanityUrl |    title     |     bio
--------------------------------------+------------------------------------+-----------+--------------+-------------
 660e8400-e29b-41d4-a716-446655440001 | 550e8400-e29b-41d4-a716-446655440000| ghawk     | Lead Actor   | My bio...
```

**If profile is missing:**

```powershell
# Create profile manually
psql $DATABASE_URL << 'SQL'
INSERT INTO profiles (id, "userId", "vanityUrl", roles, tags, privacy)
VALUES (
  gen_random_uuid(),
  '<user-id>',
  '<username>',
  ARRAY[]::text[],
  ARRAY[]::text[],
  '{}'::jsonb
)
RETURNING id, "vanityUrl";
SQL
```

#### 3. Verify profile can be fetched via API

```powershell
# Get profile by user ID
Invoke-RestMethod -Uri "https://api.projectvaline.com/profiles/<user-id>" -Method Get -Headers @{
    "Authorization" = "Bearer <token>"
    "Authorization" = "Bearer <token>"
}
```

**Expected:** Profile JSON with all fields populated.

#### 4. Check Lambda logs for errors

```powershell
# Tail logs for profile handler
aws logs tail /aws/lambda/pv-api-prod-getProfileById --since 10m --follow

# Or get specific function logs
aws logs tail /aws/lambda/pv-api-prod-updateProfile --since 10m
```

**Look for:**
- Database connection errors
- Authorization failures
- Validation errors

---

### Issue: "Login fails with 401" or "Token invalid"

**Symptoms:**
- Login returns "Invalid credentials"
- Token expires immediately
- Auth endpoints return 401

**Debug Steps:**

#### 1. Verify user credentials

```powershell
# Check if user exists and is active
psql $DATABASE_URL -c "SELECT id, email, username, status, \"emailVerified\" FROM users WHERE email = 'user@example.com';"
```

**Check:**
- `status` should be `'active'`
- `emailVerified` should be `true` (if verification is required)

#### 2. Test login endpoint directly

```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Post -Headers @{
    "Content-Type" = "application/json"
} -Body '{ "email": "user@example.com", "password": "password123" }' -ContentType 'application/json'
```

**Expected Response:**
```json
{
  "user": { ... },
  "token": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."
}
```

#### 3. Check email allowlist (if enabled)

```powershell
# Check backend environment variable
aws lambda get-function-configuration \
  --function-name pv-api-prod-login \
  --query 'Environment.Variables.ALLOWED_USER_EMAILS'
```

**If allowlist is set**, verify user's email is in the list.

#### 4. Verify JWT secret is set

```powershell
# Check JWT secret is configured
aws lambda get-function-configuration \
  --function-name pv-api-prod-login \
  --query 'Environment.Variables.AUTH_JWT_SECRET'
```

**Expected:** Should return a long random string (not "undefined" or empty).

#### 5. Test token validity

```powershell
# Decode JWT (without verification)
echo "<your-jwt-token>" | cut -d. -f2 | base64 -d | jq '.'
```

**Check:**
- `exp` (expiration) is in the future
- `userId` matches expected user
- `iat` (issued at) is recent

---

## Profile Issues

### Issue: "Profile fields not saving" (title, bio, roles, etc.)

**Symptoms:**
- PATCH `/profiles/:id` returns 200 but changes don't persist
- Fields revert to old values on refresh

**Debug Steps:**

#### 1. Check update endpoint response

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/profiles/user_123" -Method Patch -Headers @{
    "Authorization" = "Bearer <token>"
    "Content-Type" = "application/json"
} -Body '{ "title": "Senior Voice Actor", "bio": "Updated bio content" }' -ContentType 'application/json'
```

**Expected:** Returns updated profile with new `title` and `bio`.

#### 2. Verify database was updated

```powershell
psql $DATABASE_URL -c "SELECT id, title, bio, \"updatedAt\" FROM profiles WHERE id = '<profile-id>';"
```

**Check:**
- `title` and `bio` match what you sent
- `updatedAt` is recent

#### 3. Check for validation errors in Lambda logs

```powershell
aws logs tail /aws/lambda/pv-api-prod-updateProfile --since 5m
```

**Look for:**
- Prisma validation errors
- Field length limits exceeded
- Type mismatches (e.g., sending string instead of array)

#### 4. Test with minimal payload

```powershell
# Send only one field at a time to isolate issue
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/auth/login" -Method Patch -Headers @{
    "Authorization" = "Bearer <token>"
    "Content-Type" = "application/json"
} -Body '{ "title": "Test Title" }' -ContentType 'application/json'
```

---

### Issue: "Profile links not working"

**Symptoms:**
- Links don't save
- 404 on `/profiles/:id/links`
- Links return empty array

**Debug Steps:**

#### 1. Check if profile_links table has data

```powershell
psql $DATABASE_URL -c "SELECT * FROM profile_links WHERE \"profileId\" = '<profile-id>' ORDER BY position;"
```

**Expected:** Array of links with `id`, `label`, `url`, `type`, `position`.

#### 2. Add a link manually (for testing)

```powershell
psql $DATABASE_URL << 'SQL'
INSERT INTO profile_links (id, "userId", "profileId", label, url, type, position)
VALUES (
  gen_random_uuid(),
  '<user-id>',
  '<profile-id>',
  'IMDb',
  'https://www.imdb.com/name/nm1234567/',
  'social',
  0
)
RETURNING *;
SQL
```

#### 3. Test GET endpoint

```powershell
Invoke-RestMethod -Uri "https://api.projectvaline.com/profiles/<profile-id>/links" -Method Get -Headers @{
    "Authorization" = "Bearer <token>"
}
```

#### 4. Test POST endpoint

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/profiles/username" -Method Post -Headers @{
    "Authorization" = "Bearer <token>"
    "Content-Type" = "application/json"
} -Body '{ "label": "LinkedIn", "url": "https://www.linkedin.com/in/username/", "type": "social" }' -ContentType 'application/json'
```

---

## Education Issues

### Issue: "Education: something went wrong" or entries not saving

**Symptoms:**
- POST returns 500 or 400
- Education entries don't appear on profile
- "Something went wrong" error message

**Debug Steps:**

#### 1. Check education records in database

```powershell
psql $DATABASE_URL -c "SELECT * FROM education WHERE \"profileId\" = '<profile-id>' ORDER BY \"startYear\" DESC;"
```

**Expected Columns:**
- `id`, `profileId`, `institution`, `program`, `startYear`, `endYear`, `achievements`

#### 2. Verify profile exists (education requires valid profile)

```powershell
psql $DATABASE_URL -c "SELECT id FROM profiles WHERE id = '<profile-id>';"
```

**If no results:** Profile doesn't exist - create it first.

#### 3. Test adding education via API

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/profiles/user_123" -Method Post -Headers @{
    "Authorization" = "Bearer <token>"
    "Content-Type" = "application/json"
} -Body '{ "institution": "Juilliard School", "program": "BFA in Drama", "startYear": 2018, "endYear": 2022, "achievements": "Dean' -ContentType 'application/json'
```

**Common Errors:**
- `400`: Missing required fields (`institution` or `program`)
- `403`: Not authorized (wrong user or no auth token)
- `500`: Database constraint violation

#### 4. Check Lambda logs for validation errors

```powershell
aws logs tail /aws/lambda/pv-api-prod-createEducation --since 5m
```

#### 5. Add education entry manually (for testing)

```powershell
psql $DATABASE_URL << 'SQL'
INSERT INTO education (id, "profileId", institution, program, "startYear", "endYear", achievements)
VALUES (
  gen_random_uuid(),
  '<profile-id>',
  'Yale School of Drama',
  'MFA in Acting',
  2019,
  2022,
  'Outstanding Performance Award'
)
RETURNING *;
SQL
```

#### 6. Verify via GET endpoint

```powershell
Invoke-RestMethod -Uri "https://api.projectvaline.com/profiles/<profile-id>/education" -Method Get -Headers @{
    "Authorization" = "Bearer <token>"
}
```

---

## Post & Feed Issues

### Issue: "Post not appearing in feed" or "Explore feed empty"

**Symptoms:**
- Created post doesn't show in `/feed` or `/posts`
- Public posts not visible in Explore
- Post visible on profile but not in feeds

**Debug Steps:**

#### 1. Check if post exists in database

```powershell
psql $DATABASE_URL -c "SELECT id, content, visibility, \"authorId\", \"createdAt\" FROM posts WHERE \"authorId\" = '<user-id>' ORDER BY \"createdAt\" DESC LIMIT 10;"
```

**Expected:**
- `visibility` should be `'PUBLIC'` for Explore feed
- `visibility` can be `'FOLLOWERS'` for personalized feed

#### 2. Test creating a post

```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Authorization" = "Bearer <token>"
    "Content-Type" = "application/json"
} -Body '{ "content": "Test post for debugging", "tags": ["test"], "visibility": "PUBLIC" }' -ContentType 'application/json'
```

**Expected Response:**
```json
{
  "id": "post-uuid",
  "content": "Test post for debugging",
  "authorId": "user-uuid",
  "visibility": "PUBLIC",
  "createdAt": "2024-01-01T12:00:00.000Z"
}
```

#### 3. Test public feed endpoint (Explore)

```powershell
Invoke-RestMethod -Uri "https://api.projectvaline.com/posts" -Method Get
```

**Expected:** Number > 0 (if any public posts exist).

#### 4. Test personalized feed endpoint

```powershell
Invoke-RestMethod -Uri "https://api.projectvaline.com/feed" -Method Get -Headers @{
    "Authorization" = "Bearer <token>"
}
```

**Expected:**
- Shows posts from followed users
- Includes own posts

#### 5. Check connection status (for FOLLOWERS-only posts)

```powershell
# Check if connection exists between users
psql $DATABASE_URL -c "SELECT id, \"senderId\", \"receiverId\", status FROM connection_requests WHERE (\"senderId\" = '<user-a>' AND \"receiverId\" = '<user-b>') OR (\"senderId\" = '<user-b>' AND \"receiverId\" = '<user-a>');"
```

**For FOLLOWERS posts to appear:**
- Connection request must exist
- `status` must be `'accepted'`

#### 6. Check Lambda logs for feed handler

```powershell
aws logs tail /aws/lambda/pv-api-prod-listPosts --since 5m
aws logs tail /aws/lambda/pv-api-prod-getFeed --since 5m
```

---

### Issue: "Post not visible on profile page"

**Debug Steps:**

#### 1. Check posts for specific user

```powershell
psql $DATABASE_URL -c "SELECT id, content, visibility, \"createdAt\" FROM posts WHERE \"authorId\" = '<user-id>' ORDER BY \"createdAt\" DESC;"
```

#### 2. Test profile posts endpoint

```powershell
Invoke-RestMethod -Uri "https://api.projectvaline.com/profiles/<user-id>/posts" -Method Get -Headers @{
    "Authorization" = "Bearer <token>"
}
```

**Note:** Endpoint may not exist - check backend handler routing.

**Alternative:** Frontend may fetch all posts and filter client-side:

```powershell
Invoke-RestMethod -Uri "https://api.projectvaline.com/posts" -Method Get
```

---

## Connection/Follow Issues

### Issue: "Follow request not working" or "Can't accept connection"

**Symptoms:**
- Send follow request returns error
- Accept/reject doesn't update status
- Requests don't appear in list

**Debug Steps:**

#### 1. Check connection requests

```powershell
# All requests for a user
psql $DATABASE_URL -c "SELECT id, \"senderId\", \"receiverId\", status, \"createdAt\" FROM connection_requests WHERE \"receiverId\" = '<user-id>' OR \"senderId\" = '<user-id>' ORDER BY \"createdAt\" DESC;"
```

#### 2. Test sending a follow request

```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Authorization" = "Bearer <token>"
    "Content-Type" = "application/json"
} -Body '{ "receiverId": "<target-user-id>", "message": "Test connection request" }' -ContentType 'application/json'
```

**Common Errors:**
- `400`: Cannot send request to yourself
- `409`: Request already exists

#### 3. Test accepting a request

```powershell
Invoke-RestMethod -Uri "https://your-api.execute-api.us-west-2.amazonaws.com/posts" -Method Post -Headers @{
    "Authorization" = "Bearer <token>"
}
```

**Expected:** Request status changes to `'accepted'`.

#### 4. Verify status in database

```powershell
psql $DATABASE_URL -c "SELECT id, status, \"updatedAt\" FROM connection_requests WHERE id = '<request-id>';"
```

**Expected:**
- `status` = `'accepted'` (or `'rejected'`)
- `updatedAt` is recent

#### 5. Check Lambda logs

```powershell
aws logs tail /aws/lambda/pv-api-prod-sendConnectionRequest --since 5m
aws logs tail /aws/lambda/pv-api-prod-approveConnectionRequest --since 5m
```

---

## Lambda/Serverless Issues

### Get Lambda function configuration

```powershell
# List all Lambda functions
aws lambda list-functions --query 'Functions[?contains(FunctionName, `pv-api`)].FunctionName' --output table

# Get specific function config
aws lambda get-function-configuration \
  --function-name pv-api-prod-<handler-name> \
  | jq '.Environment.Variables'
```

**Check for:**
- `DATABASE_URL` is set
- `AUTH_JWT_SECRET` is set
- `ALLOWED_USER_EMAILS` matches expected value
- `NODE_ENV` is `'production'` for prod

---

### Tail Lambda logs in real-time

```powershell
# Tail logs (requires awslogs or AWS CLI v2)
aws logs tail /aws/lambda/pv-api-prod-<function-name> --follow --since 5m

# Filter for errors only
aws logs tail /aws/lambda/pv-api-prod-<function-name> --follow --since 5m --filter-pattern "ERROR"
```

---

### Get recent Lambda errors

```powershell
# Get last 50 log events with errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/pv-api-prod-<function-name> \
  --filter-pattern "ERROR" \
  --max-items 50 \
  --query 'events[].message' \
  --output text
```

---

### Test Lambda function directly

```powershell
# Invoke function with test payload
aws lambda invoke \
  --function-name pv-api-prod-health \
  --payload '{}' \
  response.json

Get-Content response.json | jq '.'
```

---

## Database Inspection

### Common Queries

#### Get user by email

```powershell
psql $DATABASE_URL -c "SELECT id, email, username, \"displayName\", status FROM users WHERE email = '<email>';"
```

#### Get user with profile

```powershell
psql $DATABASE_URL << 'SQL'
SELECT 
  u.id as user_id,
  u.email,
  u.username,
  p.id as profile_id,
  p."vanityUrl",
  p.title,
  p.bio
FROM users u
LEFT JOIN profiles p ON p."userId" = u.id
WHERE u.email = '<email>';
SQL
```

#### Count posts by user

```powershell
psql $DATABASE_URL -c "SELECT COUNT(*) as post_count FROM posts WHERE \"authorId\" = '<user-id>';"
```

#### Get recent activity

```powershell
psql $DATABASE_URL << 'SQL'
SELECT 
  'post' as type,
  id,
  content as summary,
  "createdAt"
FROM posts
WHERE "authorId" = '<user-id>'
UNION ALL
SELECT 
  'connection_request' as type,
  id,
  CONCAT('Request to ', "receiverId") as summary,
  "createdAt"
FROM connection_requests
WHERE "senderId" = '<user-id>'
ORDER BY "createdAt" DESC
LIMIT 20;
SQL
```

#### Check for orphaned records

```powershell
# Profiles without users
psql $DATABASE_URL -c 'SELECT p.id, p."userId" FROM profiles p LEFT JOIN users u ON p."userId" = u.id WHERE u.id IS NULL;'

# Education without profiles
psql $DATABASE_URL -c 'SELECT e.id, e."profileId" FROM education e LEFT JOIN profiles p ON e."profileId" = p.id WHERE p.id IS NULL;'
```

---

### Database Health Checks

#### Connection test

```powershell
psql $DATABASE_URL -c "SELECT version();"
```

#### Check table sizes

```powershell
psql $DATABASE_URL << 'SQL'
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
SQL
```

#### Check for missing indexes

```powershell
psql $DATABASE_URL << 'SQL'
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
SQL
```

---

## Emergency Procedures

### Reset user password (manual)

```powershell
# Generate bcrypt hash (requires bcrypt tool or Node.js)
node -e "console.log(require('bcrypt').hashSync('NewPassword123!', 10));"

# Update password hash in database
psql $DATABASE_URL -c "UPDATE users SET \"passwordHash\" = '<hashed-password>' WHERE email = '<user-email>';"
```

### Invalidate all refresh tokens for user

```powershell
psql $DATABASE_URL -c "UPDATE refresh_tokens SET \"invalidatedAt\" = NOW() WHERE \"userId\" = '<user-id>' AND \"invalidatedAt\" IS NULL;"
```

### Delete user account (with cascade)

```powershell
# WARNING: This deletes user and all related data
psql $DATABASE_URL -c "DELETE FROM users WHERE id = '<user-id>';"
```

**Note:** Prisma cascade deletes will remove:
- Profile
- Posts
- Education entries
- Connection requests
- Sessions
- Refresh tokens
- Etc.

---

## Additional Resources

- [System Handbook](../PROJECT_VALINE_SYSTEM_HANDBOOK.md)
- [Environment Variables Checklist](../ENV_CHECKLIST.md)
- [API Documentation](../../serverless/API_DOCUMENTATION.md)
- [Prisma Schema](../../api/prisma/schema.prisma)

---

**Last Updated:** 2025-12-09  
**Maintainers:** Project-Valine Team
