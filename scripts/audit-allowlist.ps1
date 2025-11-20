#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Audits Lambda function environment variables for ALLOWED_USER_EMAILS.

.DESCRIPTION
    This script queries all Lambda functions in the pv-api-prod stack and
    verifies that ALLOWED_USER_EMAILS is properly configured on auth-related
    functions (register, login, me, refresh, logout).
    
    Output includes:
    - Function name
    - ALLOWED_USER_EMAILS value (or blank if missing)
    - Status (OK / MISSING / PARTIAL)
    
.PARAMETER Region
    AWS region (default: us-west-2)

.PARAMETER Stage
    Deployment stage prefix (default: prod)

.PARAMETER RequiredEmails
    Comma-separated list of required emails (default: ghawk075@gmail.com,valinejustin@gmail.com)

.EXAMPLE
    .\audit-allowlist.ps1
    
.EXAMPLE
    .\audit-allowlist.ps1 -Region us-east-1 -Stage staging
#>

[CmdletBinding()]
param(
    [Parameter()]
    [string]$Region = "us-west-2",
    
    [Parameter()]
    [string]$Stage = "prod",
    
    [Parameter()]
    [string]$RequiredEmails = "ghawk075@gmail.com,valinejustin@gmail.com"
)

$ErrorActionPreference = 'Stop'

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Lambda Environment Variable Audit: ALLOWED_USER_EMAILS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is available
Write-Host "Checking AWS CLI..." -ForegroundColor Yellow
try {
    $awsVersion = aws --version 2>&1
    Write-Host "✓ AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Error "AWS CLI not found. Please install AWS CLI to use this script."
}

# Define auth functions that must have ALLOWED_USER_EMAILS
$authFunctions = @(
    "register",
    "login",
    "me",
    "refresh",
    "logout"
)

Write-Host "Querying Lambda functions in region $Region..." -ForegroundColor Yellow
Write-Host ""

# Build results table
$results = @()
$hasErrors = $false

foreach ($funcName in $authFunctions) {
    $fullName = "pv-api-$Stage-$funcName"
    
    try {
        # Get function configuration
        $configJson = aws lambda get-function-configuration `
            --function-name $fullName `
            --region $Region `
            2>&1
        
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Function not found: $fullName"
            $results += [PSCustomObject]@{
                FunctionName = $fullName
                AllowedEmails = "N/A"
                Status = "NOT_FOUND"
            }
            $hasErrors = $true
            continue
        }
        
        # Parse JSON
        $config = $configJson | ConvertFrom-Json
        $envVars = $config.Environment.Variables
        
        # Check for ALLOWED_USER_EMAILS
        if ($envVars.PSObject.Properties.Name -contains 'ALLOWED_USER_EMAILS') {
            $emailValue = $envVars.ALLOWED_USER_EMAILS
            
            # Validate against required emails
            $requiredList = $RequiredEmails -split ',' | ForEach-Object { $_.Trim() }
            $actualList = $emailValue -split ',' | ForEach-Object { $_.Trim() }
            
            $missingEmails = $requiredList | Where-Object { $actualList -notcontains $_ }
            
            if ($missingEmails.Count -eq 0 -and $actualList.Count -ge 2) {
                $status = "OK"
            } elseif ($actualList.Count -gt 0) {
                $status = "PARTIAL"
                $hasErrors = $true
            } else {
                $status = "EMPTY"
                $hasErrors = $true
            }
            
            $results += [PSCustomObject]@{
                FunctionName = $fullName
                AllowedEmails = $emailValue
                Status = $status
            }
        } else {
            $results += [PSCustomObject]@{
                FunctionName = $fullName
                AllowedEmails = ""
                Status = "MISSING"
            }
            $hasErrors = $true
        }
        
    } catch {
        Write-Warning "Error querying $fullName : $_"
        $results += [PSCustomObject]@{
            FunctionName = $fullName
            AllowedEmails = "ERROR"
            Status = "ERROR"
        }
        $hasErrors = $true
    }
}

# Display results
Write-Host "Audit Results:" -ForegroundColor Cyan
Write-Host ""
$results | Format-Table -AutoSize -Property FunctionName, AllowedEmails, Status

# Summary
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

$okCount = ($results | Where-Object { $_.Status -eq "OK" }).Count
$totalCount = $authFunctions.Count

if ($hasErrors) {
    Write-Host "✗ Audit FAILED: $okCount/$totalCount functions properly configured" -ForegroundColor Red
    Write-Host ""
    Write-Host "Issues found:" -ForegroundColor Yellow
    
    $missing = $results | Where-Object { $_.Status -eq "MISSING" }
    if ($missing.Count -gt 0) {
        Write-Host "  - MISSING: $($missing.Count) function(s) lack ALLOWED_USER_EMAILS" -ForegroundColor Yellow
    }
    
    $partial = $results | Where-Object { $_.Status -eq "PARTIAL" }
    if ($partial.Count -gt 0) {
        Write-Host "  - PARTIAL: $($partial.Count) function(s) have incomplete email list" -ForegroundColor Yellow
    }
    
    $empty = $results | Where-Object { $_.Status -eq "EMPTY" }
    if ($empty.Count -gt 0) {
        Write-Host "  - EMPTY: $($empty.Count) function(s) have empty ALLOWED_USER_EMAILS" -ForegroundColor Yellow
    }
    
    $notFound = $results | Where-Object { $_.Status -eq "NOT_FOUND" }
    if ($notFound.Count -gt 0) {
        Write-Host "  - NOT_FOUND: $($notFound.Count) function(s) not deployed" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Remediation:" -ForegroundColor Cyan
    Write-Host "  1. Redeploy backend: .\scripts\deploy-backend.ps1" -ForegroundColor Gray
    Write-Host "  2. OR use emergency patch: .\scripts\patch-allowlist-env.ps1 -Emails '$RequiredEmails'" -ForegroundColor Gray
    Write-Host ""
    
    exit 1
} else {
    Write-Host "✓ Audit PASSED: All $totalCount auth functions properly configured" -ForegroundColor Green
    Write-Host ""
    Write-Host "Required emails present: $RequiredEmails" -ForegroundColor Gray
    Write-Host ""
    exit 0
}
