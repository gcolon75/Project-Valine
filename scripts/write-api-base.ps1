#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Write the current production API base URL to .deploy/last-api-base.txt

.DESCRIPTION
    This script discovers the current production API base URL and writes it to
    .deploy/last-api-base.txt for use as the single source of truth.
    
    Discovery priority:
    1. Query AWS Serverless stack info (if AWS CLI available and authenticated)
    2. Read from .env.production VITE_API_BASE value
    3. Use provided -ApiBase parameter value
    
    After writing, also updates .env.production with the discovered value.

.PARAMETER ApiBase
    Optional: Explicitly provide the API base URL to write

.PARAMETER SkipEnvUpdate
    Skip updating .env.production file

.EXAMPLE
    .\scripts\write-api-base.ps1
    Discovers API base and writes to .deploy/last-api-base.txt

.EXAMPLE
    .\scripts\write-api-base.ps1 -ApiBase "https://ce73w43mga.execute-api.us-west-2.amazonaws.com"
    Writes the specified API base to .deploy/last-api-base.txt

.NOTES
    This script should be run after backend deployment to capture the actual
    deployed API Gateway endpoint.
    
    Exit codes:
    0 = Success
    1 = Error (API base not found or write failed)
#>

param(
    [string]$ApiBase = "",
    [switch]$SkipEnvUpdate = $false
)

$ErrorActionPreference = "Stop"

# Output functions
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Ok { Write-Host "[OK] $args" -ForegroundColor Green }
function Write-Err { Write-Host "[ERROR] $args" -ForegroundColor Red }

# Get repository root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   Write API Base to Source of Truth       " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# If ApiBase not provided, discover it
if (-not $ApiBase) {
    Write-Info "Discovering API base URL..."
    
    try {
        $ApiBase = & (Join-Path $ScriptDir "get-api-base.ps1")
        if ($LASTEXITCODE -ne 0 -or -not $ApiBase) {
            Write-Err "Failed to discover API base"
            exit 1
        }
        Write-Ok "API base discovered: $ApiBase"
    } catch {
        Write-Err "Failed to discover API base: $_"
        exit 1
    }
} else {
    Write-Info "Using provided API base: $ApiBase"
    
    # Validate format
    if ($ApiBase -notmatch "^https://[a-z0-9]+\.execute-api\.us-west-2\.amazonaws\.com$") {
        Write-Err "Invalid API base format. Expected: https://<id>.execute-api.us-west-2.amazonaws.com"
        exit 1
    }
    Write-Ok "API base format validated"
}

Write-Host ""

# Ensure .deploy directory exists
$DeployDir = Join-Path $RepoRoot ".deploy"
if (-not (Test-Path $DeployDir)) {
    Write-Info "Creating .deploy directory..."
    New-Item -ItemType Directory -Path $DeployDir -Force | Out-Null
    Write-Ok ".deploy directory created"
} else {
    Write-Info ".deploy directory exists"
}

# Write to .deploy/last-api-base.txt
$FilePath = Join-Path $DeployDir "last-api-base.txt"
Write-Info "Writing to $FilePath ..."
try {
    Set-Content -Path $FilePath -Value $ApiBase -NoNewline -Force
    Write-Ok "API base written to file"
} catch {
    Write-Err "Failed to write to file: $_"
    exit 1
}

# Verify write
$written = Get-Content $FilePath -Raw
if ($written.Trim() -ne $ApiBase) {
    Write-Err "Verification failed: written content does not match"
    exit 1
}
Write-Ok "Verification passed"

Write-Host ""

# Update .env.production if not skipped
if (-not $SkipEnvUpdate) {
    $EnvPath = Join-Path $RepoRoot ".env.production"
    Write-Info "Updating .env.production..."
    
    if (Test-Path $EnvPath) {
        # Read existing content
        $lines = Get-Content $EnvPath
        $updated = $false
        $newLines = @()
        
        foreach ($line in $lines) {
            if ($line -match "^VITE_API_BASE=") {
                $newLines += "VITE_API_BASE=$ApiBase"
                $updated = $true
            } else {
                $newLines += $line
            }
        }
        
        # If VITE_API_BASE not found, add it
        if (-not $updated) {
            $newLines += "VITE_API_BASE=$ApiBase"
        }
        
        # Write back
        $newLines | Set-Content -Path $EnvPath
        Write-Ok ".env.production updated"
    } else {
        # Create new .env.production
        Set-Content -Path $EnvPath -Value "VITE_API_BASE=$ApiBase"
        Write-Ok ".env.production created"
    }
} else {
    Write-Info "Skipping .env.production update (SkipEnvUpdate specified)"
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "   Success                                  " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Info "API base written to: $FilePath"
Write-Info "Value: $ApiBase"
Write-Host ""
Write-Info "Next steps:"
Write-Info "  1. Build frontend: npm run build"
Write-Info "  2. Deploy frontend: aws s3 sync dist/ s3://valine-frontend-prod --delete"
Write-Info "  3. Invalidate CloudFront: aws cloudfront create-invalidation --distribution-id <id> --paths '/*'"
Write-Host ""

exit 0
