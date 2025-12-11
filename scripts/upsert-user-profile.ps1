<#
.SYNOPSIS
    Upsert a user and matching profile in the PostgreSQL database.

.DESCRIPTION
    This script creates or updates a user and their associated profile in the database.
    It generates UUIDs, hashes passwords with bcrypt (12 rounds), and sets all required fields.
    Uses upsert semantics (INSERT ... ON CONFLICT UPDATE) for both users and profiles.

.PARAMETER Email
    User's email address (required)

.PARAMETER Username
    Username for the account (optional, derived from email if not provided)

.PARAMETER DisplayName
    Display name for the user (optional, defaults to username)

.PARAMETER VanityUrl
    Vanity URL for the profile (optional, defaults to username)

.PARAMETER Headline
    Profile headline (optional)

.PARAMETER Bio
    Profile bio (optional)

.PARAMETER Password
    Plain text password to be hashed (required)

.PARAMETER DatabaseUrl
    PostgreSQL connection string (optional, uses $env:DATABASE_URL or default)

.EXAMPLE
    .\upsert-user-profile.ps1 -Email "ghawk75@gmail.com" -Password "SecurePass123!" -DisplayName "Gabriel Hawk" -Headline "Voice Actor" -Bio "Professional voice actor"

.EXAMPLE
    $env:DATABASE_URL = "postgresql://user:pass@host:5432/db?sslmode=require"
    .\upsert-user-profile.ps1 -Email "ghawk75@gmail.com" -Username "ghawk75" -Password "Test123!"

.NOTES
    Requirements:
    - Node.js installed (for UUID generation and bcrypt hashing)
    - Access to the PostgreSQL database
    - DATABASE_URL environment variable or -DatabaseUrl parameter
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Email,
    
    [Parameter(Mandatory=$false)]
    [string]$Username,
    
    [Parameter(Mandatory=$false)]
    [string]$DisplayName,
    
    [Parameter(Mandatory=$false)]
    [string]$VanityUrl,
    
    [Parameter(Mandatory=$false)]
    [string]$Headline = "",
    
    [Parameter(Mandatory=$false)]
    [string]$Bio = "",
    
    [Parameter(Mandatory=$true)]
    [string]$Password,
    
    [Parameter(Mandatory=$false)]
    [string]$DatabaseUrl
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Default DATABASE_URL (no spaces as per requirement)
# WARNING: This contains credentials for a development database.
# In production, always use $env:DATABASE_URL instead of this default.
$defaultDatabaseUrl = "postgresql://ValineColon_75:Crypt0J01nt75@project-valine-dev.c9aqq6yoiyvt.us-west-2.rds.amazonaws.com:5432/postgres?sslmode=require"

# Determine DATABASE_URL to use
if ($DatabaseUrl) {
    $dbUrl = $DatabaseUrl
} elseif ($env:DATABASE_URL) {
    $dbUrl = $env:DATABASE_URL
} else {
    $dbUrl = $defaultDatabaseUrl
    Write-Host "[INFO] Using default DATABASE_URL" -ForegroundColor Cyan
}

# Normalize email
$normalizedEmail = $Email.ToLower().Trim()

# Generate username from email if not provided
if (-not $Username) {
    $localPart = $normalizedEmail.Split('@')[0]
    $Username = $localPart -replace '[^a-z0-9]', '_'
    Write-Host "[INFO] Generated username: $Username" -ForegroundColor Cyan
}

# Set displayName if not provided
if (-not $DisplayName) {
    $DisplayName = $Username
}

# Set vanityUrl if not provided
if (-not $VanityUrl) {
    $VanityUrl = $Username.ToLower() -replace '[^a-z0-9_-]', '_'
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Yellow
Write-Host "USER/PROFILE UPSERT" -ForegroundColor Yellow
Write-Host "=" * 60 -ForegroundColor Yellow
Write-Host "Email:        $normalizedEmail" -ForegroundColor Cyan
Write-Host "Username:     $Username" -ForegroundColor Cyan
Write-Host "Display Name: $DisplayName" -ForegroundColor Cyan
Write-Host "Vanity URL:   $VanityUrl" -ForegroundColor Cyan
Write-Host "Headline:     $Headline" -ForegroundColor Cyan
Write-Host "Bio:          $Bio" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Yellow
Write-Host ""

# Create a Node.js script to generate UUIDs and hash password
$nodeScript = @"
const crypto = require('crypto');
const path = require('path');

// Try to load bcryptjs from serverless/node_modules first, using repo root,
// then fall back to root-level node_modules/bcryptjs.
let bcrypt;
try {
  const repoRoot = process.cwd();
  const bcryptPath = path.join(repoRoot, 'serverless', 'node_modules', 'bcryptjs');
  bcrypt = require(bcryptPath);
} catch (e) {
  try {
    bcrypt = require('bcryptjs');
  } catch (e2) {
    console.error('ERROR: bcryptjs not found.');
    console.error('Please run either:');
    console.error('  cd serverless && npm install');
    console.error('or');
    console.error('  npm install bcryptjs');
    process.exit(1);
  }
}

async function main() {
  const password = process.argv[2];
  const userId = crypto.randomUUID();
  const profileId = crypto.randomUUID();

  const passwordHash = await bcrypt.hash(password, 12);

  console.log(JSON.stringify({
    userId,
    profileId,
    passwordHash
  }));
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
"@

# Write the Node.js script to a temporary file
$tempScript = Join-Path $env:TEMP "upsert-user-helper.js"
$nodeScript | Out-File -FilePath $tempScript -Encoding UTF8

try {
    # Run the Node.js script to generate UUIDs and hash password
    Write-Host "[1/4] Generating UUIDs and hashing password..." -ForegroundColor Green
    $result = node $tempScript $Password 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to generate UUIDs or hash password:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        exit 1
    }
    
    $data = $result | ConvertFrom-Json
    $userId = $data.userId
    $profileId = $data.profileId
    $passwordHash = $data.passwordHash
    
    Write-Host "  User ID:     $userId" -ForegroundColor Gray
    Write-Host "  Profile ID:  $profileId" -ForegroundColor Gray
    Write-Host "  Password hashed successfully" -ForegroundColor Gray
    Write-Host ""
    
    # Get current timestamp in ISO 8601 format
    $now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    
    # Escape single quotes in strings for SQL
    $emailEscaped = $normalizedEmail -replace "'", "''"
    $usernameEscaped = $Username -replace "'", "''"
    $displayNameEscaped = $DisplayName -replace "'", "''"
    $vanityUrlEscaped = $VanityUrl -replace "'", "''"
    $headlineEscaped = $Headline -replace "'", "''"
    $bioEscaped = $Bio -replace "'", "''"
    $passwordHashEscaped = $passwordHash -replace "'", "''"
    
    # Build the SQL upsert statements
    $sql = @"
-- Upsert user and capture the ID
WITH upserted_user AS (
    INSERT INTO users (
        id,
        email,
        "normalizedEmail",
        username,
        "displayName",
        bio,
        "passwordHash",
        role,
        status,
        "emailVerified",
        "emailVerifiedAt",
        "onboardingComplete",
        "profileComplete",
        "createdAt",
        "updatedAt"
    )
    VALUES (
        '$userId',
        '$emailEscaped',
        '$emailEscaped',
        '$usernameEscaped',
        '$displayNameEscaped',
        '$bioEscaped',
        '$passwordHashEscaped',
        'artist',
        'active',
        true,
        '$now',
        true,
        true,
        '$now',
        '$now'
    )
    ON CONFLICT (email) DO UPDATE SET
        "passwordHash" = EXCLUDED."passwordHash",
        "displayName" = EXCLUDED."displayName",
        bio = EXCLUDED.bio,
        "emailVerified" = EXCLUDED."emailVerified",
        "emailVerifiedAt" = EXCLUDED."emailVerifiedAt",
        "onboardingComplete" = EXCLUDED."onboardingComplete",
        "profileComplete" = EXCLUDED."profileComplete",
        "updatedAt" = EXCLUDED."updatedAt"
    RETURNING id
)
-- Upsert profile using the user ID from above
INSERT INTO profiles (
    id,
    "userId",
    "vanityUrl",
    headline,
    bio,
    roles,
    tags,
    "createdAt",
    "updatedAt"
)
SELECT
    '$profileId',
    upserted_user.id,
    '$vanityUrlEscaped',
    '$headlineEscaped',
    '$bioEscaped',
    '{}',
    '{}',
    '$now',
    '$now'
FROM upserted_user
ON CONFLICT ("userId") DO UPDATE SET
    "vanityUrl" = EXCLUDED."vanityUrl",
    headline = EXCLUDED.headline,
    bio = EXCLUDED.bio,
    "updatedAt" = EXCLUDED."updatedAt"
RETURNING id;

-- Verification query
SELECT 
    u.id as user_id,
    u.email,
    u.username,
    u."displayName",
    u."emailVerified",
    u."onboardingComplete",
    u."profileComplete",
    u."createdAt",
    u."updatedAt",
    p.id as profile_id,
    p."vanityUrl",
    p.headline,
    p.bio
FROM users u
LEFT JOIN profiles p ON u.id = p."userId"
WHERE u.email = '$emailEscaped';
"@
    
    # Write SQL to temporary file
    $tempSql = Join-Path $env:TEMP "upsert-user.sql"
    $sql | Out-File -FilePath $tempSql -Encoding UTF8
    
    Write-Host "[2/4] Executing database upsert..." -ForegroundColor Green
    
    # Execute the SQL and capture output
    $env:PGPASSWORD = $null  # Clear any existing password
    
    $psqlOutput = & psql $dbUrl -f $tempSql 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Database upsert failed:" -ForegroundColor Red
        Write-Host $psqlOutput -ForegroundColor Red
        Write-Host ""
        Write-Host "[TROUBLESHOOTING]" -ForegroundColor Yellow
        Write-Host "1. Verify DATABASE_URL is correct" -ForegroundColor Yellow
        Write-Host "2. Ensure psql is installed and in PATH" -ForegroundColor Yellow
        Write-Host "3. Check database connectivity" -ForegroundColor Yellow
        Write-Host "4. Verify database schema matches expectations" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "[3/4] Upsert completed successfully" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "[4/4] Verification Results:" -ForegroundColor Green
    Write-Host $psqlOutput -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "=" * 60 -ForegroundColor Yellow
    Write-Host "SUCCESS! User and profile created/updated" -ForegroundColor Green
    Write-Host "=" * 60 -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Test login with: $normalizedEmail" -ForegroundColor Gray
    Write-Host "  2. Verify profile at: /profile/$VanityUrl" -ForegroundColor Gray
    Write-Host ""
    
} catch {
    Write-Host "[ERROR] Script failed: $_" -ForegroundColor Red
    exit 1
} finally {
    if (Test-Path $tempScript) {
        Remove-Item $tempScript -Force
    }
    if (Test-Path $tempSql) {
        Remove-Item $tempSql -Force
    }
}
