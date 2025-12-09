# User Profile Upsert Script - Testing Guide

This guide explains how to test the user/profile upsert scripts.

## Prerequisites

1. **Install Dependencies** (if not already done):
   ```bash
   cd serverless
   npm install
   npm run prisma:generate
   cd ..
   ```

2. **Set DATABASE_URL** (optional - scripts use default if not set):
   ```bash
   # Linux/Mac
   export DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
   
   # Windows PowerShell
   $env:DATABASE_URL = "postgresql://user:pass@host:5432/db?sslmode=require"
   ```

## Testing the Node.js Script

### Basic Test (creates user with minimal info)

```bash
node scripts/upsert-user-profile.mjs \
  --email "ghawk75@gmail.com" \
  --password "Test123!"
```

Expected output:
```
USER/PROFILE UPSERT
============================================================
Email:        ghawk75@gmail.com
Username:     ghawk75
Display Name: ghawk75
Vanity URL:   ghawk75
Headline:     
Bio:          
============================================================

[1/4] Generating UUIDs and hashing password...
  User ID:     <uuid>
  Profile ID:  <uuid>
  Password hashed successfully

[2/4] Executing database upsert...
  User upserted successfully
  Profile upserted successfully

[3/4] Upsert completed successfully

[4/4] Verification Results:

User Record:
  ID:                  <uuid>
  Email:               ghawk75@gmail.com
  Username:            ghawk75
  Display Name:        ghawk75
  Email Verified:      true
  Onboarding Complete: true
  Profile Complete:    true
  Created At:          <timestamp>
  Updated At:          <timestamp>

Profile Record:
  ID:          <uuid>
  User ID:     <uuid>
  Vanity URL:  ghawk75
  Headline:    
  Bio:         
  Created At:  <timestamp>
  Updated At:  <timestamp>

============================================================
SUCCESS! User and profile created/updated
============================================================

Next steps:
  1. Test login with: ghawk75@gmail.com
  2. Verify profile at: /profile/ghawk75
```

### Full Test (with all parameters)

```bash
node scripts/upsert-user-profile.mjs \
  --email "ghawk75@gmail.com" \
  --username "ghawk75" \
  --display-name "Gabriel Hawk" \
  --vanity-url "ghawk75" \
  --headline "Voice & Stage Actor" \
  --bio "Passionate about voice acting and theater. Always looking for new opportunities to collaborate." \
  --password "Test123!"
```

## Testing the PowerShell Script

### Basic Test (Windows)

```powershell
.\scripts\upsert-user-profile.ps1 `
  -Email "ghawk75@gmail.com" `
  -Password "Test123!"
```

### Full Test (Windows)

```powershell
.\scripts\upsert-user-profile.ps1 `
  -Email "ghawk75@gmail.com" `
  -Username "ghawk75" `
  -DisplayName "Gabriel Hawk" `
  -VanityUrl "ghawk75" `
  -Headline "Voice & Stage Actor" `
  -Bio "Passionate about voice acting and theater. Always looking for new opportunities to collaborate." `
  -Password "Test123!"
```

## Verification

After running the script, verify the user was created correctly:

### Using psql

```bash
psql "$DATABASE_URL" -c "SELECT id, email, username, \"displayName\", \"emailVerified\", \"onboardingComplete\", \"profileComplete\" FROM users WHERE email = 'ghawk75@gmail.com';"

psql "$DATABASE_URL" -c "SELECT p.id, p.\"userId\", p.\"vanityUrl\", p.headline, p.bio FROM profiles p JOIN users u ON p.\"userId\" = u.id WHERE u.email = 'ghawk75@gmail.com';"
```

### Using Node.js

```javascript
// verify-user.mjs
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const user = await prisma.user.findUnique({
  where: { email: 'ghawk75@gmail.com' },
  include: { profile: true }
});

console.log('User:', user);
await prisma.$disconnect();
```

## Testing Upsert Behavior

The scripts use upsert semantics, so running them multiple times with the same email will update the existing record:

1. **First run**: Creates a new user and profile
   ```bash
   node scripts/upsert-user-profile.mjs \
     --email "test@example.com" \
     --password "InitialPass123!"
   ```

2. **Second run**: Updates the existing user (e.g., new password)
   ```bash
   node scripts/upsert-user-profile.mjs \
     --email "test@example.com" \
     --password "UpdatedPass123!"
   ```

The user ID and profile ID will remain the same, but the password hash and updatedAt timestamp will change.

## Troubleshooting

### Error: Missing required dependencies

**Solution**: Install dependencies in the serverless directory:
```bash
cd serverless
npm install
npm run prisma:generate
```

### Error: Cannot reach database

**Solution**: Verify DATABASE_URL is correct and the database is accessible:
```bash
# Test connection
psql "$DATABASE_URL" -c "SELECT version();"
```

### Error: Unique constraint violation

This can happen if:
- The email already exists (expected with upsert - should update instead)
- The username or vanityUrl already exists for a different user

**Solution**: Try with a different username or vanityUrl:
```bash
node scripts/upsert-user-profile.mjs \
  --email "ghawk75@gmail.com" \
  --username "ghawk75_alt" \
  --vanity-url "ghawk75-alt" \
  --password "Test123!"
```

## Success Criteria

✅ Script creates a user with:
- Non-null `id` (UUID)
- Non-null `passwordHash` (bcrypt hash)
- Non-null `createdAt` (current timestamp)
- Non-null `updatedAt` (current timestamp)
- `emailVerified = true`
- `emailVerifiedAt` set to current timestamp
- `onboardingComplete = true`
- `profileComplete = true`
- `role = 'artist'`
- `status = 'active'`

✅ Script creates a profile with:
- Non-null `id` (UUID)
- Non-null `userId` (matches user ID)
- Non-null `vanityUrl` (unique)
- Non-null `createdAt` (current timestamp)
- Non-null `updatedAt` (current timestamp)
- Empty arrays for `roles` and `tags`

✅ Verification query shows both records linked correctly
