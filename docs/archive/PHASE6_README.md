# Phase 6: Account Persistence Infrastructure - README

## Overview

This phase implements the account persistence infrastructure for the Joint platform, enabling admin user creation and profile management through onboarding.

## Components Implemented

### 6A: Admin User Creation Script

**File:** `scripts/admin-upsert-user.mjs`

A safe, production-ready script for creating or updating user accounts in owner-only mode.

#### Features
- ✅ Email validation
- ✅ Password strength validation (min 8 chars, uppercase, lowercase, numbers)
- ✅ Username generation from email
- ✅ Dry-run mode support
- ✅ Production confirmation prompts
- ✅ Skip-if-exists flag
- ✅ Prisma integration for user and profile creation
- ✅ Automatic profile creation with vanity URL

#### Usage Examples

```bash
# Dry run (test mode - no database changes)
DATABASE_URL="postgresql://..." node scripts/admin-upsert-user.mjs \
  --email friend@example.com \
  --password SecurePass123! \
  --display-name "Friend Name" \
  --dry-run

# Actual creation
DATABASE_URL="postgresql://..." node scripts/admin-upsert-user.mjs \
  --email friend@example.com \
  --password SecurePass123! \
  --display-name "Friend Name"

# Skip if user already exists
DATABASE_URL="postgresql://..." node scripts/admin-upsert-user.mjs \
  --email existing@example.com \
  --password NewPass123! \
  --skip-if-exists

# In production (requires confirmation)
NODE_ENV=production DATABASE_URL="postgresql://..." \
  node scripts/admin-upsert-user.mjs \
  --email prod@example.com \
  --password SecurePass123! \
  --display-name "Production User"
```

#### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--email` | Yes | User email address |
| `--password` | Yes | Password (min 8 chars, must contain uppercase, lowercase, numbers) |
| `--display-name` | No | Display name (defaults to username from email) |
| `--dry-run` | No | Test mode - no database changes |
| `--skip-if-exists` | No | Skip operation if user already exists |

#### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NODE_ENV` | No | Environment (production requires confirmation) |
| `ALLOWED_USER_EMAILS` | No | Comma-separated allowlist |

### 6B: Profile Update Endpoint

**Endpoint:** `PATCH /api/me/profile`

A new API endpoint for updating the current user's profile during onboarding or settings updates.

#### Request

```bash
curl -X PATCH https://your-api-url/me/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "John Doe",
    "username": "johndoe",
    "headline": "Voice Actor & Director",
    "bio": "Professional voice actor with 10 years experience",
    "roles": ["Voice Actor", "Director"],
    "tags": ["Comedy", "Drama", "Commercial"],
    "avatarUrl": "https://example.com/avatar.jpg"
  }'
```

#### Supported Fields

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `displayName` | string | - | User's display name |
| `username` | string | 3-30 chars, alphanumeric + `_` `-`, unique | Unique username |
| `headline` | string | max 100 chars | Profile headline |
| `bio` | string | max 500 chars | Profile bio |
| `roles` | array | must be in ALLOWED_ROLES | User's roles |
| `tags` | array | max 5, must be in ALLOWED_TAGS | Profile tags |
| `avatarUrl` | string | URL | Avatar image URL |
| `bannerUrl` | string | URL | Banner image URL |

#### Allowed Roles

- Voice Actor
- Writer
- Director
- Producer
- Editor
- Sound Designer
- Casting Director

#### Response

```json
{
  "id": "profile-id",
  "userId": "user-id",
  "username": "johndoe",
  "displayName": "John Doe",
  "avatar": "https://example.com/avatar.jpg",
  "vanityUrl": "johndoe",
  "headline": "Voice Actor & Director",
  "bio": "Professional voice actor...",
  "roles": ["Voice Actor", "Director"],
  "tags": ["Comedy", "Drama", "Commercial"],
  "links": [],
  "onboardingComplete": true
}
```

#### Authentication

Requires a valid JWT token in the Authorization header.

#### Error Responses

| Status | Description |
|--------|-------------|
| 400 | Validation failed (see errors array in response) |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Access denied (not in allowlist, if STRICT_ALLOWLIST=1) |
| 409 | Username already taken |
| 500 | Server error |

### 6C: Onboarding Completion Flag

**Field:** `User.onboardingComplete` (Boolean)

A flag to track whether a user has completed the onboarding process.

#### Behavior

- Automatically set to `true` when user updates their profile with:
  - `displayName` AND `username` (basic info)
  - At least one of: `headline`, `bio`, `roles`, or `tags` (profile info)

- Frontend should redirect to `/dashboard` when `user.onboardingComplete === true`

#### Database Schema Change

```sql
ALTER TABLE "users" ADD COLUMN "onboardingComplete" BOOLEAN NOT NULL DEFAULT false;
```

See `PHASE6_MIGRATION_GUIDE.md` for migration instructions.

## Files Modified/Created

### Created
- ✅ `scripts/admin-upsert-user.mjs` - Admin user creation script
- ✅ `PHASE6_MIGRATION_GUIDE.md` - Migration guide
- ✅ `PHASE6_README.md` - This file
- ✅ `api/prisma/migrations/20251121203439_add_onboarding_complete/migration.sql` - Migration file

### Modified
- ✅ `serverless/src/handlers/profiles.js` - Added `updateMyProfile` function
- ✅ `serverless/serverless.yml` - Added `PATCH /me/profile` endpoint
- ✅ `api/prisma/schema.prisma` - Added `onboardingComplete` field to User model

## Deployment Checklist

### Pre-deployment

- [ ] Review and test admin script with `--dry-run`
- [ ] Backup production database
- [ ] Review migration SQL
- [ ] Test in staging environment

### Deployment Steps

1. **Deploy Schema Changes**
   ```bash
   cd api
   npx prisma migrate deploy
   npx prisma migrate status
   ```

2. **Deploy Serverless API**
   ```bash
   cd serverless
   npm install
   npm run deploy
   ```

3. **Verify Deployment**
   ```bash
   # Test health endpoint
   curl https://your-api-url/health
   
   # Test new endpoint (requires auth)
   curl -X PATCH https://your-api-url/me/profile \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"headline": "Test"}'
   ```

4. **Create Test User** (if needed)
   ```bash
   DATABASE_URL="postgresql://..." node scripts/admin-upsert-user.mjs \
     --email test@example.com \
     --password TestPass123! \
     --display-name "Test User"
   ```

### Post-deployment

- [ ] Verify migration applied successfully
- [ ] Test admin script in production
- [ ] Test profile update endpoint
- [ ] Verify onboardingComplete flag behavior
- [ ] Monitor logs for errors

## Testing

### Unit Tests

```bash
# Test profile update endpoint
cd serverless
npm test -- profiles.test.js
```

### Integration Tests

```bash
# Test admin script
DATABASE_URL="postgresql://localhost/test_db" \
  node scripts/admin-upsert-user.mjs \
  --email test@test.com \
  --password Test123! \
  --dry-run

# Test API endpoint
curl -X PATCH http://localhost:3000/me/profile \
  -H "Authorization: Bearer TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Test User",
    "headline": "Test Headline",
    "bio": "Test Bio",
    "roles": ["Voice Actor"],
    "tags": ["Comedy"]
  }'
```

## Security Considerations

### Admin Script
- ✅ Requires `DATABASE_URL` environment variable
- ✅ Production confirmation prompts
- ✅ Password strength validation
- ✅ Bcrypt password hashing (cost factor 10)

### API Endpoint
- ✅ JWT authentication required
- ✅ Allowlist check (if `STRICT_ALLOWLIST=1`)
- ✅ Input validation on all fields
- ✅ Unique constraint on username
- ✅ SQL injection protection (Prisma)

### Migration
- ✅ Non-destructive (adds column with default value)
- ✅ Rollback procedure documented
- ✅ No data loss risk

## Rollback Plan

If issues occur:

1. **Rollback Migration**
   ```sql
   ALTER TABLE "users" DROP COLUMN "onboardingComplete";
   ```

2. **Remove Endpoint** (or disable in serverless.yml)
   ```yaml
   # Comment out in serverless.yml:
   # updateMyProfile:
   #   handler: src/handlers/profiles.updateMyProfile
   #   events:
   #     - httpApi:
   #         path: /me/profile
   #         method: patch
   ```

3. **Redeploy**
   ```bash
   cd serverless
   npm run deploy
   ```

## Monitoring

Watch for:
- Failed password validations
- Username conflicts
- Onboarding completion rate
- Profile update errors

Logs will show:
- `[updateMyProfile] User ID: ...`
- `[updateMyProfile] Update fields: ...`
- `[updateMyProfile] Marking onboarding as complete`
- `[admin-upsert-user] User created/updated successfully`

## Support

For issues or questions:
1. Check logs in CloudWatch (AWS Lambda)
2. Review `PHASE6_MIGRATION_GUIDE.md`
3. Test with `--dry-run` flag
4. Verify database connection and credentials

## Related Documentation

- `AGENT_IMPLEMENTATION_SPEC.md` - Phase 6 specification
- `PHASE6_MIGRATION_GUIDE.md` - Migration procedures
- `serverless/API_DOCUMENTATION.md` - API reference
- `src/constants/tags.js` - Tag validation
