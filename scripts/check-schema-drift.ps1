# Check Prisma Schema Drift
# Wrapper script that calls the canonical Node.js schema drift checker
# Usage: powershell -ExecutionPolicy Bypass -File scripts/check-schema-drift.ps1

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Prisma Schema Drift Check" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Find the Node.js script relative to this script's location
$RepoRoot = Split-Path -Parent $PSScriptRoot
$NodeScript = Join-Path $RepoRoot "scripts/check-schema-drift.mjs"

# Verify the Node.js script exists
if (-not (Test-Path $NodeScript)) {
    Write-Host "❌ ERROR: Node.js drift checker not found at $NodeScript" -ForegroundColor Red
    exit 1
}

# Check if Node.js is available
try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Node.js not found"
    }
} catch {
    Write-Host "❌ ERROR: Node.js is required but not found in PATH" -ForegroundColor Red
    Write-Host "   Please install Node.js 20.x from https://nodejs.org" -ForegroundColor Gray
    exit 1
}

# Run the canonical Node.js drift checker
Write-Host "Running canonical schema drift checker..." -ForegroundColor Yellow
Write-Host ""

try {
    node $NodeScript
    $exitCode = $LASTEXITCODE
    exit $exitCode
} catch {
    Write-Host "❌ ERROR: Failed to run drift checker: $_" -ForegroundColor Red
    exit 1
}
