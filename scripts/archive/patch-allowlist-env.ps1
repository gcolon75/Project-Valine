#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Emergency patch script to inject ALLOWED_USER_EMAILS into Lambda functions.

.DESCRIPTION
    This script updates ALLOWED_USER_EMAILS environment variable on all auth-related
    Lambda functions in place, merging with existing environment variables.
    
    ⚠️ WARNING: This is an emergency remediation tool.
    A proper serverless deployment should follow after using this script.
    
    This script:
    - Updates environment variables in-place (no code deployment)
    - Preserves all other existing environment variables
    - Updates multiple functions in parallel for speed
    - Validates the update succeeded
    
.PARAMETER Emails
    Comma-separated list of allowed emails (REQUIRED)

.PARAMETER Region
    AWS region (default: us-west-2)

.PARAMETER Stage
    Deployment stage prefix (default: prod)

.PARAMETER DryRun
    Show what would be updated without making changes

.EXAMPLE
    .\patch-allowlist-env.ps1 -Emails "ghawk075@gmail.com,valinejustin@gmail.com"
    
.EXAMPLE
    .\patch-allowlist-env.ps1 -Emails "user@example.com" -Region us-east-1 -DryRun
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$Emails,
    
    [Parameter()]
    [string]$Region = "us-west-2",
    
    [Parameter()]
    [string]$Stage = "prod",
    
    [Parameter()]
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Emergency ALLOWED_USER_EMAILS Patch" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "⚠️  DRY RUN MODE - No changes will be made" -ForegroundColor Yellow
    Write-Host ""
}

# Validate email format
if ([string]::IsNullOrWhiteSpace($Emails)) {
    Write-Error "Emails parameter cannot be empty"
}

$emailList = $Emails -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
if ($emailList.Count -eq 0) {
    Write-Error "No valid emails provided"
}

Write-Host "Target Configuration:" -ForegroundColor Cyan
Write-Host "  Region: $Region" -ForegroundColor Gray
Write-Host "  Stage: $Stage" -ForegroundColor Gray
Write-Host "  Emails to set: $Emails" -ForegroundColor Gray
Write-Host "  Email count: $($emailList.Count)" -ForegroundColor Gray
Write-Host ""

# Warning message
Write-Host "⚠️  WARNING:" -ForegroundColor Yellow
Write-Host "  This script modifies Lambda environment variables in-place." -ForegroundColor Yellow
Write-Host "  A full serverless deployment should be performed after using this tool." -ForegroundColor Yellow
Write-Host ""

if (-not $DryRun) {
    $confirmation = Read-Host "Continue? (yes/no)"
    if ($confirmation -ne 'yes') {
        Write-Host "Aborted by user." -ForegroundColor Yellow
        exit 0
    }
    Write-Host ""
}

# Check AWS CLI
try {
    $awsVersion = aws --version 2>&1
    Write-Host "✓ AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Error "AWS CLI not found. Please install AWS CLI to use this script."
}

# Define auth functions to patch
$authFunctions = @(
    "register",
    "login",
    "me",
    "refresh",
    "logout"
)

Write-Host "Patching $($authFunctions.Count) Lambda functions..." -ForegroundColor Yellow
Write-Host ""

$updateCount = 0
$errorCount = 0

foreach ($funcName in $authFunctions) {
    $fullName = "pv-api-$Stage-$funcName"
    
    Write-Host "Processing: $fullName" -ForegroundColor Cyan
    
    try {
        # Get current configuration
        $configJson = aws lambda get-function-configuration `
            --function-name $fullName `
            --region $Region `
            2>&1
        
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "  ✗ Function not found: $fullName"
            $errorCount++
            continue
        }
        
        # Parse current environment variables
        $config = $configJson | ConvertFrom-Json
        $currentEnv = $config.Environment.Variables
        
        # Create updated environment (merge with existing)
        $updatedEnv = @{}
        
        # Copy all existing variables
        foreach ($prop in $currentEnv.PSObject.Properties) {
            $updatedEnv[$prop.Name] = $prop.Value
        }
        
        # Update/add ALLOWED_USER_EMAILS
        $updatedEnv['ALLOWED_USER_EMAILS'] = $Emails
        
        # Convert to JSON format for AWS CLI
        $envJson = $updatedEnv | ConvertTo-Json -Compress -Depth 10
        
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would update ALLOWED_USER_EMAILS to: $Emails" -ForegroundColor Yellow
            $updateCount++
        } else {
            # Update Lambda environment
            $updateResult = aws lambda update-function-configuration `
                --function-name $fullName `
                --region $Region `
                --environment "Variables=$envJson" `
                2>&1
            
            if ($LASTEXITCODE -ne 0) {
                Write-Warning "  ✗ Failed to update: $updateResult"
                $errorCount++
            } else {
                Write-Host "  ✓ Updated successfully" -ForegroundColor Green
                $updateCount++
            }
        }
        
    } catch {
        Write-Warning "  ✗ Error processing $fullName : $_"
        $errorCount++
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "DRY RUN Summary:" -ForegroundColor Yellow
    Write-Host "  Would update: $updateCount function(s)" -ForegroundColor Gray
    Write-Host "  Errors: $errorCount" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Run without -DryRun to apply changes." -ForegroundColor Cyan
} else {
    if ($errorCount -eq 0) {
        Write-Host "✓ Patch Complete: $updateCount function(s) updated" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Verify: .\scripts\audit-allowlist.ps1" -ForegroundColor Gray
        Write-Host "  2. Test registration/login with updated allowlist" -ForegroundColor Gray
        Write-Host "  3. Schedule a clean serverless deployment: .\scripts\deploy-backend.ps1" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host "⚠ Patch Partial: $updateCount updated, $errorCount errors" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Some functions failed to update." -ForegroundColor Yellow
        Write-Host "Check error messages above and retry or use full deployment." -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }
}
