#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Deploys the Project Valine backend (serverless functions) to AWS.

.DESCRIPTION
    This script performs a safe, retryable deployment of the backend serverless
    functions with proper error handling for Windows environments (EPERM issues).
    
    Features:
    - Node version verification
    - Automatic dependency installation
    - Preflight checks with serverless info
    - Retry logic for transient failures
    - Post-deployment environment audit

.PARAMETER MaxRetries
    Maximum number of deployment retry attempts (default: 2)

.PARAMETER SkipAudit
    Skip post-deployment environment variable audit

.EXAMPLE
    .\deploy-backend.ps1
    
.EXAMPLE
    .\deploy-backend.ps1 -MaxRetries 3 -SkipAudit
#>

[CmdletBinding()]
param(
    [Parameter()]
    [int]$MaxRetries = 2,
    
    [Parameter()]
    [switch]$SkipAudit
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$serverlessDir = Join-Path $projectRoot "serverless"

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Project Valine Backend Deployment (Windows)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify Node.js version
Write-Host "[1/6] Verifying Node.js version..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js version: $nodeVersion" -ForegroundColor Green
    
    # Extract major version
    $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($majorVersion -lt 18) {
        Write-Error "Node.js 18 or higher required. Found: $nodeVersion"
    }
} catch {
    Write-Error "Node.js not found. Please install Node.js 18 or higher."
}

# Step 2: Navigate to serverless directory
Write-Host "[2/6] Navigating to serverless directory..." -ForegroundColor Yellow
if (-not (Test-Path $serverlessDir)) {
    Write-Error "Serverless directory not found: $serverlessDir"
}
Set-Location $serverlessDir
Write-Host "✓ Changed directory to: $serverlessDir" -ForegroundColor Green

# Step 3: Install dependencies if missing
Write-Host "[3/6] Checking dependencies..." -ForegroundColor Yellow
$nodeModulesPath = Join-Path $serverlessDir "node_modules"
if (-not (Test-Path $nodeModulesPath)) {
    Write-Host "  Installing dependencies (npm ci)..." -ForegroundColor Cyan
    try {
        npm ci
        Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
    } catch {
        Write-Warning "npm ci failed, trying npm install..."
        npm install
        Write-Host "✓ Dependencies installed via npm install" -ForegroundColor Green
    }
} else {
    Write-Host "✓ Dependencies already installed" -ForegroundColor Green
}

# Step 4: Preflight check with serverless info
Write-Host "[4/6] Running preflight check..." -ForegroundColor Yellow
try {
    $infoOutput = npx serverless info 2>&1
    Write-Host "✓ Serverless preflight check passed" -ForegroundColor Green
    Write-Host "  Current deployment info:" -ForegroundColor Gray
    Write-Host $infoOutput -ForegroundColor Gray
} catch {
    Write-Warning "Preflight check failed (might be first deployment): $_"
}

# Step 5: Deploy with retry logic
Write-Host "[5/6] Deploying serverless functions..." -ForegroundColor Yellow
$deploySuccess = $false
$attempt = 0

while (-not $deploySuccess -and $attempt -le $MaxRetries) {
    $attempt++
    
    if ($attempt -gt 1) {
        Write-Host "  Retry attempt $attempt of $MaxRetries..." -ForegroundColor Cyan
        Start-Sleep -Seconds 5
    }
    
    try {
        Write-Host "  Executing: npx serverless deploy" -ForegroundColor Cyan
        npx serverless deploy --verbose
        $deploySuccess = $true
        Write-Host "✓ Deployment successful!" -ForegroundColor Green
    } catch {
        $errorMsg = $_.Exception.Message
        
        # Check for known transient errors
        if ($errorMsg -match "EPERM|EBUSY|EACCES") {
            Write-Warning "Transient file system error detected: $errorMsg"
            if ($attempt -le $MaxRetries) {
                Write-Host "  Will retry..." -ForegroundColor Yellow
            } else {
                Write-Error "Max retries exceeded. Deployment failed with file system error."
            }
        } elseif ($errorMsg -match "NetworkingError|ETIMEDOUT|ECONNRESET") {
            Write-Warning "Network error detected: $errorMsg"
            if ($attempt -le $MaxRetries) {
                Write-Host "  Will retry..." -ForegroundColor Yellow
            } else {
                Write-Error "Max retries exceeded. Deployment failed with network error."
            }
        } else {
            # Non-retryable error
            Write-Error "Deployment failed: $errorMsg"
        }
    }
}

# Step 6: Post-deployment audit
if (-not $SkipAudit) {
    Write-Host "[6/6] Running post-deployment environment audit..." -ForegroundColor Yellow
    $auditScript = Join-Path $scriptDir "audit-allowlist.ps1"
    
    if (Test-Path $auditScript) {
        try {
            & $auditScript
        } catch {
            Write-Warning "Audit script failed: $_"
            Write-Host "  You can run it manually: $auditScript" -ForegroundColor Yellow
        }
    } else {
        Write-Warning "Audit script not found at: $auditScript"
        Write-Host "  Skipping environment variable audit." -ForegroundColor Yellow
    }
} else {
    Write-Host "[6/6] Skipping post-deployment audit (SkipAudit flag set)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Verify health endpoint: curl https://your-api/health" -ForegroundColor Gray
Write-Host "  2. Check allowlist fields in health response" -ForegroundColor Gray
Write-Host "  3. Test registration with allowed/blocked emails" -ForegroundColor Gray
Write-Host ""
