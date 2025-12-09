# Quick Start - User/Profile Upsert

This guide shows how to quickly create the `ghawk75@gmail.com` user as specified in the requirements.

## Prerequisites

```bash
# Install dependencies (one time)
cd serverless
npm install
npm run prisma:generate
cd ..
```

## Create the User

### Using Node.js (Recommended)

```bash
# Basic usage - creates user with generated username
node scripts/upsert-user-profile.mjs \
  --email "ghawk75@gmail.com" \
  --password "YourSecurePassword123!"

# Full usage - with all profile details
node scripts/upsert-user-profile.mjs \
  --email "ghawk75@gmail.com" \
  --username "ghawk75" \
  --display-name "Gabriel Colon" \
  --vanity-url "ghawk75" \
  --headline "Voice & Stage Actor" \
  --bio "Passionate about voice acting and theater. Always looking for new opportunities to collaborate." \
  --password "YourSecurePassword123!"
```

### Using PowerShell

```powershell
# Basic usage
.\scripts\upsert-user-profile.ps1 `
  -Email "ghawk75@gmail.com" `
  -Password "YourSecurePassword123!"

# Full usage
.\scripts\upsert-user-profile.ps1 `
  -Email "ghawk75@gmail.com" `
  -Username "ghawk75" `
  -DisplayName "Gabriel Colon" `
  -VanityUrl "ghawk75" `
  -Headline "Voice & Stage Actor" `
  -Bio "Passionate about voice acting and theater. Always looking for new opportunities to collaborate." `
  -Password "YourSecurePassword123!"
```

## With Custom Database URL

If you don't want to use the default DATABASE_URL:

### Node.js
```bash
export DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
node scripts/upsert-user-profile.mjs \
  --email "ghawk75@gmail.com" \
  --password "YourSecurePassword123!"
```

### PowerShell
```powershell
$env:DATABASE_URL = "postgresql://user:pass@host:5432/db?sslmode=require"
.\scripts\upsert-user-profile.ps1 `
  -Email "ghawk75@gmail.com" `
  -Password "YourSecurePassword123!"
```

## Expected Output

```
============================================================
USER/PROFILE UPSERT
============================================================
Email:        ghawk75@gmail.com
Username:     ghawk75
Display Name: Gabriel Colon
Vanity URL:   ghawk75
Headline:     Voice & Stage Actor
Bio:          Passionate about voice acting and theater...
============================================================

[1/4] Generating UUIDs and hashing password...
  User ID:     xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  Profile ID:  yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
  Password hashed successfully

[2/4] Executing database upsert...
  User upserted successfully
  Profile upserted successfully

[3/4] Upsert completed successfully

[4/4] Verification Results:

User Record:
  ID:                  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  Email:               ghawk75@gmail.com
  Username:            ghawk75
  Display Name:        Gabriel Colon
  Email Verified:      true
  Onboarding Complete: true
  Profile Complete:    true
  Created At:          2024-12-09T04:45:00.000Z
  Updated At:          2024-12-09T04:45:00.000Z

Profile Record:
  ID:          yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
  User ID:     xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  Vanity URL:  ghawk75
  Headline:    Voice & Stage Actor
  Bio:         Passionate about voice acting and theater...
  Created At:  2024-12-09T04:45:00.000Z
  Updated At:  2024-12-09T04:45:00.000Z

============================================================
SUCCESS! User and profile created/updated
============================================================

Next steps:
  1. Test login with: ghawk75@gmail.com
  2. Verify profile at: /profile/ghawk75
```

## Verify in Database

```bash
# Using psql
psql "$DATABASE_URL" -c "SELECT id, email, username, \"emailVerified\", \"onboardingComplete\" FROM users WHERE email = 'ghawk75@gmail.com';"

psql "$DATABASE_URL" -c "SELECT p.id, p.\"userId\", p.\"vanityUrl\", p.headline FROM profiles p JOIN users u ON p.\"userId\" = u.id WHERE u.email = 'ghawk75@gmail.com';"
```

## Troubleshooting

### Error: Missing dependencies
```bash
cd serverless && npm install && npm run prisma:generate
```

### Error: Cannot reach database
Check that DATABASE_URL is correct and the database is accessible.

### Error: psql not found (PowerShell only)
Install PostgreSQL client tools or use the Node.js version instead.

## Documentation

- Full documentation: `scripts/README.md`
- Testing guide: `scripts/UPSERT_USER_TESTING.md`
- Implementation details: `scripts/UPSERT_USER_IMPLEMENTATION.md`
