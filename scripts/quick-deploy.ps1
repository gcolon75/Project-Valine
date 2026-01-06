#!/usr/bin/env pwsh
<#
.SYNOPSIS
    One-command production deployment for Project Valine

.DESCRIPTION
    Performs a complete production deployment in a single command:
    - Backend: validates environment, builds Prisma layer if needed, deploys serverless
    - Frontend: builds and syncs to S3 bucket valine-frontend-prod
    
    Windows PowerShell 5.1 compatible.

.PARAMETER SkipBackend
    Skip backend deployment (serverless)

.PARAMETER SkipFrontend
    Skip frontend deployment (S3 sync)

.EXAMPLE
    .\scripts\quick-deploy.ps1
    
.EXAMPLE
    .\scripts\quick-deploy.ps1 -SkipBackend

.NOTES
    Requires:
    - Node.js 20.x
    - npm 10.x+
    - AWS CLI 2.x+
    - Environment variables: NODE_ENV, JWT_SECRET, DATABASE_URL, ALLOWED_USER_EMAILS
#>

param(
    [switch]$SkipBackend = $false,
    [switch]$SkipFrontend = $false
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Output functions (PowerShell 5.1 compatible - no Unicode)
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Ok { Write-Host "[OK] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Err { Write-Host "[ERROR] $args" -ForegroundColor Red }

# Constants
$Stage = "prod"
$Region = "us-west-2"
$FrontendBucket = "valine-frontend-prod"

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   Project Valine - Quick Deploy to Prod    " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Info "Stage: $Stage"
Write-Info "Region: $Region"
Write-Info "Frontend Bucket: s3://$FrontendBucket"
Write-Host ""

# Get repository root (script is in scripts/)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$ServerlessDir = Join-Path $RepoRoot "serverless"

Write-Info "Repository Root: $RepoRoot"
Write-Info "Serverless Directory: $ServerlessDir"
Write-Host ""

# ===== BACKEND DEPLOYMENT =====
if (-not $SkipBackend) {
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host "   BACKEND DEPLOYMENT                        " -ForegroundColor Cyan
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Navigate to serverless directory
    Write-Info "Navigating to serverless directory..."
    Push-Location $ServerlessDir
    try {
        # Install dependencies
        Write-Info "Installing backend dependencies..."
        npm ci
        if ($LASTEXITCODE -ne 0) {
            Write-Err "npm ci failed"
            exit 1
        }
        Write-Ok "Dependencies installed"
        Write-Host ""
        
        # Test serverless configuration
        Write-Info "Validating serverless configuration..."
        npx serverless@3 print --stage $Stage --region $Region > $null
        if ($LASTEXITCODE -ne 0) {
            Write-Err "serverless print failed - check serverless.yml syntax"
            exit 1
        }
        Write-Ok "Serverless configuration valid"
        Write-Host ""
        
        # Check environment drift
        Write-Info "Checking environment drift..."
        & "$ServerlessDir\scripts\check-env-drift.ps1" -Stage $Stage
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Environment drift detected - fix issues and retry"
            exit 1
        }
        Write-Ok "Environment checks passed"
        Write-Host ""
        
        # Check if Prisma layer exists
        $PrismaLayerPath = Join-Path $ServerlessDir "layers\prisma-layer.zip"
        if (-not (Test-Path $PrismaLayerPath)) {
            Write-Warn "Prisma layer not found: $PrismaLayerPath"
            Write-Info "Building Prisma layer..."
            & "$ServerlessDir\scripts\build-prisma-layer.ps1"
            if ($LASTEXITCODE -ne 0) {
                Write-Err "Failed to build Prisma layer"
                exit 1
            }
            Write-Ok "Prisma layer built successfully"
            Write-Host ""
            
            # Re-validate serverless config after building layer
            Write-Info "Re-validating serverless configuration..."
            npx serverless@3 print --stage $Stage --region $Region > $null
            if ($LASTEXITCODE -ne 0) {
                Write-Err "serverless print failed after building layer"
                exit 1
            }
            Write-Ok "Configuration re-validated"
            Write-Host ""
        } else {
            Write-Ok "Prisma layer found: $PrismaLayerPath"
            Write-Host ""
        }
        
        # Deploy serverless
        Write-Info "Deploying backend to AWS Lambda..."
        Write-Info "This may take several minutes..."
        npx serverless@3 deploy --stage $Stage --region $Region
        if ($LASTEXITCODE -ne 0) {
            Write-Err "serverless deploy failed"
            exit 1
        }
        Write-Ok "Backend deployed successfully"
        Write-Host ""
        
    } finally {
        Pop-Location
    }
} else {
    Write-Warn "Skipping backend deployment (SkipBackend specified)"
    Write-Host ""
}

# ===== FRONTEND DEPLOYMENT =====
if (-not $SkipFrontend) {
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host "   FRONTEND DEPLOYMENT                       " -ForegroundColor Cyan
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Navigate to repository root
    Write-Info "Navigating to repository root..."
    Push-Location $RepoRoot
    try {
        # Install dependencies
        Write-Info "Installing frontend dependencies..."
        npm ci
        if ($LASTEXITCODE -ne 0) {
            Write-Err "npm ci failed"
            exit 1
        }
        Write-Ok "Dependencies installed"
        Write-Host ""
        
        # Build frontend
        Write-Info "Building frontend..."
        Write-Info "This may take a few minutes..."
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Err "npm run build failed"
            exit 1
        }
        Write-Ok "Frontend build complete"
        Write-Host ""
        
        # Verify dist directory exists
        $DistDir = Join-Path $RepoRoot "dist"
        if (-not (Test-Path $DistDir)) {
            Write-Err "dist directory not found: $DistDir"
            exit 1
        }
        Write-Ok "dist directory verified"
        Write-Host ""
        
        # Sync to S3
        Write-Info "Syncing to s3://$FrontendBucket ..."
        aws s3 sync dist/ "s3://$FrontendBucket" --delete
        if ($LASTEXITCODE -ne 0) {
            Write-Err "aws s3 sync failed"
            exit 1
        }
        Write-Ok "Frontend synced to S3"
        Write-Host ""
        
    } finally {
        Pop-Location
    }
} else {
    Write-Warn "Skipping frontend deployment (SkipFrontend specified)"
    Write-Host ""
}

# ===== DEPLOYMENT COMPLETE =====
Write-Host "=============================================" -ForegroundColor Green
Write-Host "   DEPLOYMENT COMPLETE                       " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Ok "Backend: Deployed to AWS Lambda ($Stage, $Region)"
Write-Ok "Frontend: Synced to s3://$FrontendBucket"
Write-Host ""
Write-Info "Frontend URL: https://dkmxy676d3vgc.cloudfront.net"
Write-Info "API URL: https://wkndtj22ab.execute-api.us-west-2.amazonaws.com"
Write-Host ""
Write-Info "Next steps (if migrations required):"
Write-Info "  cd api"
Write-Info "  npx prisma migrate deploy"
Write-Info "  npx prisma generate"
Write-Host ""
Write-Ok "Deploy successful!"
Write-Host ""
exit 0
