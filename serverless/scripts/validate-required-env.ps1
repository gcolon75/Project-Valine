# Validate Required Environment Variables
# Ensures all required environment variables are set before deployment
# Usage: powershell -ExecutionPolicy Bypass -File scripts/validate-required-env.ps1

param(
    [switch]$Strict = $false
)

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Environment Variables Validation" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Define required environment variables
$RequiredVars = @(
    @{
        Name = "DATABASE_URL"
        Description = "PostgreSQL connection string"
        ValidationPattern = "^postgresql://.+@.+:\d+/.+\?sslmode=require$"
        ValidationMessage = "Must be a valid PostgreSQL connection string with sslmode=require"
    },
    @{
        Name = "JWT_SECRET"
        Description = "JWT signing secret (minimum 32 characters)"
        MinLength = 32
        ValidationMessage = "Must be at least 32 characters long"
    },
    @{
        Name = "NODE_ENV"
        Description = "Node environment (development, test, production)"
        AllowedValues = @("development", "test", "production")
        ValidationMessage = "Must be one of: development, test, production"
    }
)

# Define important but optional environment variables (warnings only)
$ImportantVars = @(
    "FRONTEND_URL",
    "API_BASE_URL",
    "MEDIA_BUCKET",
    "ALLOWED_USER_EMAILS",
    "ENABLE_REGISTRATION",
    "COOKIE_DOMAIN"
)

$HasErrors = $false
$HasWarnings = $false

# Check required variables
Write-Host "Checking Required Variables..." -ForegroundColor Yellow
Write-Host ""

foreach ($var in $RequiredVars) {
    $value = [Environment]::GetEnvironmentVariable($var.Name)
    
    if ([string]::IsNullOrWhiteSpace($value)) {
        Write-Host "❌ MISSING: $($var.Name)" -ForegroundColor Red
        Write-Host "   Description: $($var.Description)" -ForegroundColor Gray
        Write-Host "   $($var.ValidationMessage)" -ForegroundColor Gray
        Write-Host ""
        $HasErrors = $true
        continue
    }
    
    # Check for spaces (common error in DATABASE_URL)
    if ($value -match '\s') {
        Write-Host "❌ INVALID: $($var.Name) contains spaces" -ForegroundColor Red
        Write-Host "   Spaces in URLs/secrets cause authentication failures" -ForegroundColor Gray
        Write-Host ""
        $HasErrors = $true
        continue
    }
    
    # Validate pattern if specified
    if ($var.ValidationPattern -and $value -notmatch $var.ValidationPattern) {
        Write-Host "❌ INVALID: $($var.Name)" -ForegroundColor Red
        Write-Host "   $($var.ValidationMessage)" -ForegroundColor Gray
        Write-Host ""
        $HasErrors = $true
        continue
    }
    
    # Validate allowed values if specified
    if ($var.AllowedValues -and $value -notin $var.AllowedValues) {
        Write-Host "❌ INVALID: $($var.Name) = '$value'" -ForegroundColor Red
        Write-Host "   $($var.ValidationMessage)" -ForegroundColor Gray
        Write-Host ""
        $HasErrors = $true
        continue
    }
    
    # Validate minimum length if specified
    if ($var.MinLength -and $value.Length -lt $var.MinLength) {
        Write-Host "❌ INVALID: $($var.Name) is too short" -ForegroundColor Red
        Write-Host "   $($var.ValidationMessage)" -ForegroundColor Gray
        Write-Host ""
        $HasErrors = $true
        continue
    }
    
    # Check for default/insecure values in production
    if ($env:NODE_ENV -eq "production") {
        if ($var.Name -eq "JWT_SECRET" -and ($value -eq "your-secret-key" -or $value -eq "default-secret")) {
            Write-Host "❌ INSECURE: $($var.Name) uses default value in production" -ForegroundColor Red
            Write-Host "   Generate a secure secret: node -e ""console.log(require('crypto').randomBytes(64).toString('hex'))""" -ForegroundColor Gray
            Write-Host ""
            $HasErrors = $true
            continue
        }
    }
    
    # Print safe truncated value (never print full secrets)
    $displayValue = if ($value.Length -gt 20) { $value.Substring(0, 20) + "..." } else { $value }
    if ($var.Name -match "SECRET|PASSWORD|TOKEN") {
        $displayValue = "***"
    }
    
    Write-Host "✅ $($var.Name) = $displayValue" -ForegroundColor Green
}

Write-Host ""

# Check important variables (warnings only)
if ($Strict) {
    Write-Host "Checking Important Variables (strict mode)..." -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($varName in $ImportantVars) {
        $value = [Environment]::GetEnvironmentVariable($varName)
        
        if ([string]::IsNullOrWhiteSpace($value)) {
            Write-Host "⚠️  NOT SET: $varName" -ForegroundColor Yellow
            $HasWarnings = $true
        } else {
            # Print safe truncated value
            $displayValue = if ($value.Length -gt 20) { $value.Substring(0, 20) + "..." } else { $value }
            Write-Host "✅ $varName = $displayValue" -ForegroundColor Green
        }
    }
    
    Write-Host ""
}

# Summary
Write-Host "=========================================" -ForegroundColor Cyan
if ($HasErrors) {
    Write-Host "❌ VALIDATION FAILED" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please set missing/invalid environment variables before deploying." -ForegroundColor Red
    Write-Host "See DEPLOYMENT_BIBLE.md for instructions." -ForegroundColor Gray
    Write-Host ""
    exit 1
} elseif ($HasWarnings) {
    Write-Host "⚠️  VALIDATION PASSED WITH WARNINGS" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Some optional variables are not set." -ForegroundColor Yellow
    Write-Host "Deployment will proceed with defaults." -ForegroundColor Gray
    Write-Host ""
    exit 0
} else {
    Write-Host "✅ VALIDATION PASSED" -ForegroundColor Green
    Write-Host ""
    Write-Host "All required environment variables are set correctly." -ForegroundColor Green
    Write-Host ""
    exit 0
}
