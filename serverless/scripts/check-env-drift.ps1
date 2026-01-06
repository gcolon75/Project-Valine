#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Detect environment drift before deployment

.DESCRIPTION
    Validates critical environment variables (NODE_ENV, JWT_SECRET, ALLOWED_USER_EMAILS)
    before deployment to prevent production issues. Checks for:
    - NODE_ENV is set to "production" for prod stage
    - JWT_SECRET is not using default/placeholder values
    - ALLOWED_USER_EMAILS is set and contains valid production emails
    - DATABASE_URL is properly formatted with no spaces

.PARAMETER Stage
    Deployment stage (prod, staging, dev). Default: prod

.PARAMETER FailFast
    Exit immediately on first validation error. Default: false

.EXAMPLE
    .\scripts\check-env-drift.ps1 -Stage prod

.EXAMPLE
    .\scripts\check-env-drift.ps1 -Stage prod -FailFast
#>

param(
    [string]$Stage = "prod",
    [switch]$FailFast = $false
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Colors for output
function Write-Info { Write-Host "ℹ️ $args" -ForegroundColor Cyan }
function Write-Ok { Write-Host "✅ $args" -ForegroundColor Green }
function Write-Warn { Write-Host "⚠️  $args" -ForegroundColor Yellow }
function Write-Err { Write-Host "❌ $args" -ForegroundColor Red }

Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Environment Drift Detection                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Info "Stage: $Stage"
Write-Host ""

$errorCount = 0

# ===== NODE_ENV Check =====
Write-Info "Checking NODE_ENV..."
$nodeEnv = [Environment]::GetEnvironmentVariable("NODE_ENV")

if ([string]::IsNullOrWhiteSpace($nodeEnv)) {
    Write-Err "NODE_ENV is not set"
    Write-Warn "Set NODE_ENV=production for production deployments"
    $errorCount++
    if ($FailFast) { exit 1 }
} elseif ($Stage -eq "prod" -and $nodeEnv -ne "production") {
    Write-Err "NODE_ENV is '$nodeEnv' but should be 'production' for prod stage"
    Write-Warn "Incorrect NODE_ENV causes SameSite=Lax cookies that break cross-site auth"
    Write-Warn "Set with: `$env:NODE_ENV = 'production'"
    $errorCount++
    if ($FailFast) { exit 1 }
} else {
    Write-Ok "NODE_ENV = $nodeEnv"
}

# ===== JWT_SECRET Check =====
Write-Info "Checking JWT_SECRET..."
$jwtSecret = [Environment]::GetEnvironmentVariable("JWT_SECRET")

$defaultSecrets = @(
    "VALIDATION_PLACEHOLDER_DO_NOT_USE_IN_PRODUCTION",
    "your-secret-key-here",
    "change-me",
    "default-secret",
    "jwt-secret",
    "secret"
)

if ([string]::IsNullOrWhiteSpace($jwtSecret)) {
    Write-Err "JWT_SECRET is not set"
    Write-Warn "Generate with: node -e `"console.log(require('crypto').randomBytes(64).toString('hex'))`""
    $errorCount++
    if ($FailFast) { exit 1 }
} elseif ($jwtSecret.Length -lt 32) {
    Write-Err "JWT_SECRET is too short (${jwtSecret.Length} characters, minimum 32)"
    $errorCount++
    if ($FailFast) { exit 1 }
} elseif ($Stage -eq "prod" -and $defaultSecrets -contains $jwtSecret) {
    Write-Err "JWT_SECRET is using a default/placeholder value"
    Write-Warn "Never use placeholder secrets in production!"
    $errorCount++
    if ($FailFast) { exit 1 }
} else {
    Write-Ok "JWT_SECRET = [REDACTED] (${jwtSecret.Length} characters)"
}

# ===== ALLOWED_USER_EMAILS Check =====
Write-Info "Checking ALLOWED_USER_EMAILS..."
$allowedEmails = [Environment]::GetEnvironmentVariable("ALLOWED_USER_EMAILS")

$placeholderPatterns = @(
    "validation-placeholder",
    "example.invalid",
    "user1@example.com",
    "user2@example.com",
    "test@test.com"
)

if ([string]::IsNullOrWhiteSpace($allowedEmails)) {
    Write-Err "ALLOWED_USER_EMAILS is not set"
    Write-Warn "Set to a comma-separated list of production user emails"
    Write-Warn "Example: `$env:ALLOWED_USER_EMAILS = 'ghawk075@gmail.com,user@example.com'"
    $errorCount++
    if ($FailFast) { exit 1 }
} else {
    $hasPlaceholder = $false
    foreach ($pattern in $placeholderPatterns) {
        if ($allowedEmails -like "*$pattern*") {
            Write-Err "ALLOWED_USER_EMAILS contains placeholder email: $pattern"
            $hasPlaceholder = $true
        }
    }
    
    if ($hasPlaceholder) {
        Write-Warn "Remove placeholder emails before deploying to production"
        $errorCount++
        if ($FailFast) { exit 1 }
    } else {
        $emailCount = ($allowedEmails -split ',').Count
        Write-Ok "ALLOWED_USER_EMAILS = $emailCount email(s) configured"
        
        # Show first email for verification (if not too sensitive)
        if ($Stage -eq "prod") {
            $firstEmail = ($allowedEmails -split ',')[0].Trim()
            Write-Info "First email: $firstEmail"
        }
    }
}

# ===== DATABASE_URL Check =====
Write-Info "Checking DATABASE_URL..."
$databaseUrl = [Environment]::GetEnvironmentVariable("DATABASE_URL")

if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
    Write-Err "DATABASE_URL is not set"
    $errorCount++
    if ($FailFast) { exit 1 }
} elseif ($databaseUrl -like "*VALIDATION_ONLY*" -or $databaseUrl -like "*validation-only*") {
    Write-Err "DATABASE_URL is using a validation placeholder"
    Write-Warn "Set to actual production database URL"
    $errorCount++
    if ($FailFast) { exit 1 }
} elseif ($databaseUrl -like "* *") {
    Write-Err "DATABASE_URL contains spaces - this will cause connection errors"
    Write-Warn "Remove all spaces from DATABASE_URL"
    $errorCount++
    if ($FailFast) { exit 1 }
} elseif (-not ($databaseUrl -like "postgresql://*")) {
    Write-Err "DATABASE_URL does not start with 'postgresql://'"
    $errorCount++
    if ($FailFast) { exit 1 }
} else {
    # Extract host from DATABASE_URL for display (hide password)
    if ($databaseUrl -match "postgresql://[^:]+:[^@]+@([^/:]+)") {
        $dbHost = $matches[1]
        Write-Ok "DATABASE_URL = postgresql://***@$dbHost/***"
    } else {
        Write-Ok "DATABASE_URL = [REDACTED]"
    }
}

# ===== Optional: FRONTEND_URL Check =====
Write-Info "Checking FRONTEND_URL (optional)..."
$frontendUrl = [Environment]::GetEnvironmentVariable("FRONTEND_URL")

if ([string]::IsNullOrWhiteSpace($frontendUrl)) {
    Write-Warn "FRONTEND_URL is not set (will use default from serverless.yml)"
} elseif ($Stage -eq "prod" -and ($frontendUrl -notlike "*cloudfront.net*" -or $frontendUrl -notlike "https://*")) {
    Write-Warn "FRONTEND_URL may not be the production URL: $frontendUrl"
    Write-Info "Expected: https://dkmxy676d3vgc.cloudfront.net"
} else {
    Write-Ok "FRONTEND_URL = $frontendUrl"
}

# ===== Optional: API_BASE_URL Check =====
Write-Info "Checking API_BASE_URL (optional)..."
$apiBaseUrl = [Environment]::GetEnvironmentVariable("API_BASE_URL")

if ([string]::IsNullOrWhiteSpace($apiBaseUrl)) {
    Write-Warn "API_BASE_URL is not set (will use default from serverless.yml)"
} elseif ($Stage -eq "prod" -and $apiBaseUrl -notlike "*execute-api*amazonaws.com*") {
    Write-Warn "API_BASE_URL may not be the production API Gateway: $apiBaseUrl"
} else {
    Write-Ok "API_BASE_URL = $apiBaseUrl"
}

# ===== Summary =====
Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor $(if ($errorCount -eq 0) { "Green" } else { "Red" })
Write-Host "║   Environment Drift Check Results             ║" -ForegroundColor $(if ($errorCount -eq 0) { "Green" } else { "Red" })
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor $(if ($errorCount -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($errorCount -eq 0) {
    Write-Ok "All environment checks passed!"
    Write-Ok "Safe to deploy to $Stage"
    Write-Host ""
    exit 0
} else {
    Write-Err "Found $errorCount environment issue(s)"
    Write-Warn "Fix the issues above before deploying to prevent 401 errors"
    Write-Host ""
    Write-Info "To set environment variables:"
    Write-Info "  Option 1: Load from .env.prod file in serverless/"
    Write-Info "  Option 2: Set manually with `$env:VARIABLE_NAME = 'value'"
    Write-Host ""
    exit 1
}
