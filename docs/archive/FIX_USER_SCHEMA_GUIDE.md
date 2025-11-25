# Complete Database Schema Fix & User Account Setup Guide

This guide explains how to use the `fix-user-schema-complete.mjs` script to fix your database schema and create permanent user accounts.

## What This Script Does

The script performs the following operations:

1. **Database Connection Check** - Verifies connectivity to your PostgreSQL database
2. **Schema Verification** - Checks for and adds missing columns (`onboardingComplete`, `status`, `theme`)
3. **Prisma Client Regeneration** - Regenerates Prisma clients in both `api/` and `serverless/` directories
4. **User Account Creation** - Creates or updates user accounts with proper authentication
5. **Final Verification** - Confirms all changes were applied successfully

## Prerequisites

### One-Time Setup

1. **Install Dependencies** (if not already installed):
   ```bash
   cd api
   npm install
   cd ..
   ```

2. **Set Database URL**:
   - For Unix/Mac/Linux:
     ```bash
     export DATABASE_URL="postgresql://user:password@host:5432/database"
     ```
   
   - For Windows PowerShell:
     ```powershell
     $env:DATABASE_URL = "postgresql://user:password@host:5432/database"
     ```

## Usage

### Basic Command

```bash
node fix-user-schema-complete.mjs \
  --email "your@email.com" \
  --password "YourPassword!" \
  --display-name "Your Name"
```

### PowerShell Example

```powershell
# Set your database URL
$env:DATABASE_URL = "postgresql://ValineColon_75:YOUR_PASSWORD@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require"

# Run the script
node fix-user-schema-complete.mjs `
  --email "ghawk075@gmail.com" `
  --password "Test123!" `
  --display-name "Gabriel Colon"
```

### Unix/Mac Example

```bash
# Set your database URL
export DATABASE_URL="postgresql://ValineColon_75:YOUR_PASSWORD@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require"

# Run the script
node fix-user-schema-complete.mjs \
  --email "ghawk075@gmail.com" \
  --password "Test123!" \
  --display-name "Gabriel Colon"
```

## Parameters

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `--email` | Yes | User's email address | `user@example.com` |
| `--password` | Yes | User's password | `MySecurePass123!` |
| `--display-name` | Yes | User's display name | `"John Doe"` |

## Expected Output

When the script runs successfully, you'll see output similar to:

```
╔════════════════════════════════════════════════════════════════════╗
║  Project Valine - Complete Database Schema & User Account Setup   ║
╚════════════════════════════════════════════════════════════════════╝

══════════════════════════════════════════════════════════════════════
Phase 1: Database Connection Check
══════════════════════════════════════════════════════════════════════

ℹ️  Testing connection to PostgreSQL...
✅ Database connection successful
ℹ️  Connected to: postgres
ℹ️  As user: ValineColon_75

══════════════════════════════════════════════════════════════════════
Phase 2: Database Schema Verification
══════════════════════════════════════════════════════════════════════

✅ All required columns already exist

✅ Final schema verification:
  ℹ️  onboardingComplete: boolean (nullable: NO, default: false)
  ℹ️  status: character varying (nullable: NO, default: 'active')
  ℹ️  theme: character varying (nullable: YES, default: none)

══════════════════════════════════════════════════════════════════════
Phase 3: Regenerate Prisma Clients
══════════════════════════════════════════════════════════════════════

ℹ️  Regenerating Prisma Client in api/...
✅ api/ Prisma Client regenerated
ℹ️  Regenerating Prisma Client in serverless/...
✅ serverless/ Prisma Client regenerated

══════════════════════════════════════════════════════════════════════
Phase 4: Create User Account
══════════════════════════════════════════════════════════════════════

ℹ️  Creating account for: ghawk075@gmail.com
ℹ️  Creating new user account...
✅ User account created

✅ User Account Details:
  ℹ️  ID: f7a3b9c1-4d2e-5f6g-7h8i-9j0k1l2m3n4o
  ℹ️  Email: ghawk075@gmail.com
  ℹ️  Username: ghawk075
  ℹ️  Display Name: Gabriel Colon
  ℹ️  Onboarding Complete: false
  ℹ️  Status: active

══════════════════════════════════════════════════════════════════════
✅ Setup Complete!
══════════════════════════════════════════════════════════════════════

✅ Database schema is fixed
✅ Prisma Clients regenerated
✅ User account created/updated
✅ All verifications passed
```

## Next Steps After Running the Script

1. **Start Development Server**:
   ```bash
   npm run dev
   ```

2. **Visit the Application**:
   - Open your browser to `http://localhost:5173`

3. **Login with Your Credentials**:
   - Use the email and password you provided to the script

4. **Complete Onboarding** (first time only):
   - Add your headline
   - Write your bio
   - Select your roles
   - Choose tags (maximum 5)

5. **After Onboarding**:
   - Your profile is saved to the database
   - `onboardingComplete` is set to `TRUE`
   - You're redirected to `/dashboard`

6. **Future Logins**:
   - ✅ Skip onboarding automatically
   - ✅ Go straight to `/dashboard`
   - ✅ Your account is permanent!

## Troubleshooting

### Error: "DATABASE_URL environment variable not set"

**Solution**: Make sure you've exported the DATABASE_URL environment variable before running the script.

### Error: "Database connection failed"

**Possible causes**:
- Incorrect database credentials
- Database server is not accessible
- Firewall blocking the connection
- SSL/TLS configuration issues

**Solutions**:
- Verify your DATABASE_URL is correct
- Check if the database server is running
- Ensure your IP is whitelisted in the database firewall
- Try adding `?sslmode=require` to the connection string

### Error: "Prisma Client regeneration failed"

**Solution**: Make sure you're running the script from the project root directory where `api/` and `serverless/` directories exist.

### Script Updates Existing User

If a user with the same email already exists, the script will:
- Update the password to the new one provided
- Update the display name
- Keep all other user data intact

This is intentional and allows you to reset passwords or update account details.

## Security Notes

- **Never commit your DATABASE_URL** to version control
- **Use strong passwords** for user accounts
- **Store credentials securely** using environment variables or secret management tools
- The script uses **bcrypt hashing** for password security (10 rounds)

## Database Changes Made

The script adds the following columns to the `users` table if they don't exist:

| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| `onboardingComplete` | BOOLEAN | `false` | NO | Tracks whether user completed onboarding |
| `status` | VARCHAR(255) | `'active'` | NO | User account status (active/suspended/pending) |
| `theme` | VARCHAR(255) | NULL | YES | User's theme preference (light/dark) |

The script also creates performance indexes on:
- `onboardingComplete`
- `status`

## Support

If you encounter issues not covered in this guide, please:
1. Check the error message carefully
2. Verify all prerequisites are met
3. Review the troubleshooting section
4. Contact the development team with the full error output
