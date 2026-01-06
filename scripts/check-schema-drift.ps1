# Check Prisma Schema Drift
# Compares api/prisma/schema.prisma with serverless/prisma/schema.prisma
# to ensure they remain synchronized
# Usage: powershell -ExecutionPolicy Bypass -File scripts/check-schema-drift.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================="
Write-Host "Prisma Schema Drift Check"
Write-Host "========================================="

$RepoRoot = Split-Path -Parent $PSScriptRoot
$ApiSchema = Join-Path $RepoRoot "api/prisma/schema.prisma"
$ServerlessSchema = Join-Path $RepoRoot "serverless/prisma/schema.prisma"

# Verify both schemas exist
if (-not (Test-Path $ApiSchema)) {
    Write-Host "❌ ERROR: api/prisma/schema.prisma not found" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $ServerlessSchema)) {
    Write-Host "❌ ERROR: serverless/prisma/schema.prisma not found" -ForegroundColor Red
    exit 1
}

Write-Host "Comparing schemas..."
Write-Host "  API: $ApiSchema"
Write-Host "  Serverless: $ServerlessSchema"
Write-Host ""

# Read both schemas
$apiContent = Get-Content $ApiSchema -Raw
$serverlessContent = Get-Content $ServerlessSchema -Raw

# Normalize whitespace for comparison (handle differences in blank lines)
$apiNormalized = $apiContent -replace '\r\n', "`n" -replace '\n+', "`n" -replace '^\s+', '' -replace '\s+$', ''
$serverlessNormalized = $serverlessContent -replace '\r\n', "`n" -replace '\n+', "`n" -replace '^\s+', '' -replace '\s+$', ''

# Check if schemas are identical (ignoring minor formatting differences)
if ($apiNormalized -eq $serverlessNormalized) {
    Write-Host "✅ PASS: Schemas are synchronized" -ForegroundColor Green
    exit 0
}

# If not identical, show detailed differences
Write-Host "❌ FAIL: Schema drift detected" -ForegroundColor Red
Write-Host ""
Write-Host "Schemas differ. Running detailed comparison..."
Write-Host ""

# Use git diff for better output (if available)
$gitAvailable = $null -ne (Get-Command git -ErrorAction SilentlyContinue)
if ($gitAvailable) {
    Write-Host "Differences (git diff format):" -ForegroundColor Yellow
    git diff --no-index --color=always $ApiSchema $ServerlessSchema | Out-Host
} else {
    # Fallback: Show basic comparison
    Write-Host "Git not available. Showing basic comparison:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "API Schema character count: $($apiContent.Length)"
    Write-Host "Serverless Schema character count: $($serverlessContent.Length)"
    
    # Show first difference location
    $minLen = [Math]::Min($apiContent.Length, $serverlessContent.Length)
    for ($i = 0; $i -lt $minLen; $i++) {
        if ($apiContent[$i] -ne $serverlessContent[$i]) {
            $contextStart = [Math]::Max(0, $i - 50)
            $contextEnd = [Math]::Min($apiContent.Length, $i + 50)
            Write-Host ""
            Write-Host "First difference at character $i" -ForegroundColor Yellow
            Write-Host "API context: '$($apiContent.Substring($contextStart, $contextEnd - $contextStart))'"
            Write-Host "Serverless context: '$($serverlessContent.Substring($contextStart, $contextEnd - $contextStart))'"
            break
        }
    }
}

Write-Host ""
Write-Host "========================================="
Write-Host "ACTION REQUIRED:"
Write-Host "Update api/prisma/schema.prisma or serverless/prisma/schema.prisma"
Write-Host "to synchronize both schemas."
Write-Host "========================================="

exit 1
