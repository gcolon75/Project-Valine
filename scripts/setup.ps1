#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Setup script for Project Valine serverless dependencies

.DESCRIPTION
    Installs serverless/ project dependencies deterministically using npm ci.
    Falls back to npm install if no lockfile exists.
    This script ensures serverless-esbuild and other plugins are installed.

.EXAMPLE
    .\scripts\setup.ps1

.EXAMPLE
    pwsh -ExecutionPolicy Bypass -File scripts/setup.ps1
#>

param()

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Colors for output
function Write-Info { Write-Host "ℹ️ $args" -ForegroundColor Cyan }
function Write-Ok { Write-Host "✅ $args" -ForegroundColor Green }
function Write-Warn { Write-Host "⚠️  $args" -ForegroundColor Yellow }
function Write-Err { Write-Host "❌ $args" -ForegroundColor Red }

Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Project Valine - Setup Script               ║" -ForegroundColor Cyan
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host ""

# Resolve paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$ServerlessDir = Join-Path $RepoRoot "serverless"

Write-Info "Repository root: $RepoRoot"
Write-Info "Serverless directory: $ServerlessDir"
Write-Host ""

# Check if serverless directory exists
if (-not (Test-Path $ServerlessDir)) {
    Write-Err "Serverless directory not found at: $ServerlessDir"
    exit 1
}

# Navigate to serverless directory
Push-Location $ServerlessDir
try {
    Write-Info "Installing serverless/ dependencies..."
    Write-Host ""

    # Check if package.json exists
    if (-not (Test-Path "package.json")) {
        Write-Err "package.json not found in serverless/ directory"
        exit 1
    }

    # Check if package-lock.json exists
    $hasLockfile = Test-Path "package-lock.json"
    
    if ($hasLockfile) {
        Write-Info "Found package-lock.json - using npm ci for deterministic install"
        Write-Host ""
        
        try {
            npm ci
            if ($LASTEXITCODE -ne 0) {
                throw "npm ci failed with exit code $LASTEXITCODE"
            }
            Write-Ok "Dependencies installed successfully with npm ci"
        } catch {
            Write-Err "npm ci failed: $($_.Exception.Message)"
            Write-Warn "Falling back to npm install..."
            npm install
            if ($LASTEXITCODE -ne 0) {
                throw "npm install also failed"
            }
            Write-Ok "Dependencies installed successfully with npm install (fallback)"
        }
    } else {
        Write-Warn "No package-lock.json found - using npm install"
        Write-Warn "Consider committing package-lock.json for deterministic builds"
        Write-Host ""
        
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed with exit code $LASTEXITCODE"
        }
        Write-Ok "Dependencies installed successfully with npm install"
    }

    Write-Host ""
    Write-Info "Verifying critical plugins..."
    
    # Verify serverless-esbuild is installed
    $esbuildPath = "node_modules/serverless-esbuild"
    if (Test-Path $esbuildPath) {
        Write-Ok "serverless-esbuild plugin found"
    } else {
        Write-Err "serverless-esbuild plugin not found after installation"
        Write-Warn "Check package.json devDependencies for serverless-esbuild"
        exit 1
    }

    # Verify serverless is installed
    $serverlessPath = "node_modules/serverless"
    if (Test-Path $serverlessPath) {
        Write-Ok "serverless framework found"
    } else {
        Write-Err "serverless framework not found after installation"
        exit 1
    }

    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║   Setup Complete!                              ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Ok "serverless/ project is ready for deployment"
    Write-Info "Next: Run deploy.ps1 or npx serverless@3 deploy"
    Write-Host ""

} catch {
    Write-Err "Setup failed: $($_.Exception.Message)"
    Pop-Location
    exit 1
} finally {
    Pop-Location
}

exit 0
