# Audit Lambda Environment Variables
# Lists Lambda functions and checks for missing required environment variables
# Usage: powershell -ExecutionPolicy Bypass -File scripts/audit-lambda-env.ps1 [-Region us-west-2] [-Stage prod]

param(
  [string]$Stage  = $(if ($env:STAGE) { $env:STAGE } else { "prod" }),
  [string]$Region = $(if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-west-2" })
)

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Lambda Environment Variables Audit" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Region: $Region" -ForegroundColor Gray
Write-Host "Stage:  $Stage" -ForegroundColor Gray
Write-Host ""

# Check if AWS CLI is available
try {
    $awsVersion = aws --version 2>&1
    Write-Host "✅ AWS CLI available: $($awsVersion.Split()[0])" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ AWS CLI not found. Please install AWS CLI and configure credentials." -ForegroundColor Red
    exit 1
}

# Define required environment variables to check
$RequiredVars = @(
    "DATABASE_URL",
    "JWT_SECRET",
    "NODE_ENV"
)

# Define important optional variables
$ImportantVars = @(
    "FRONTEND_URL",
    "API_BASE_URL",
    "MEDIA_BUCKET"
)

# Get list of Lambda functions for our service
Write-Host "Fetching Lambda functions for pv-api-$Stage..." -ForegroundColor Yellow

try {
    $functionsJson = aws lambda list-functions --region $Region --output json 2>&1 | ConvertFrom-Json
    $functions = $functionsJson.Functions | Where-Object { $_.FunctionName -like "pv-api-$Stage-*" }
    
    if ($functions.Count -eq 0) {
        Write-Host "⚠️  No Lambda functions found matching 'pv-api-$Stage-*'" -ForegroundColor Yellow
        Write-Host "   Make sure the service is deployed and AWS credentials are configured correctly." -ForegroundColor Gray
        exit 0
    }
    
    Write-Host "✅ Found $($functions.Count) Lambda functions" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Failed to list Lambda functions: $_" -ForegroundColor Red
    Write-Host "   Make sure AWS credentials are configured and you have permissions." -ForegroundColor Gray
    exit 1
}

# Sample a few key functions (checking all would be slow and redundant)
$functionsToCheck = $functions | Where-Object { 
    $_.FunctionName -match "(authRouter|profilesRouter|health)" 
} | Select-Object -First 3

if ($functionsToCheck.Count -eq 0) {
    # If no specific functions found, just check the first 3
    $functionsToCheck = $functions | Select-Object -First 3
}

Write-Host "Checking environment variables for sample functions..." -ForegroundColor Yellow
Write-Host ""

$HasIssues = $false

foreach ($func in $functionsToCheck) {
    $funcName = $func.FunctionName
    Write-Host "──────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host "Function: $funcName" -ForegroundColor Cyan
    Write-Host ""
    
    try {
        # Get function configuration
        $configJson = aws lambda get-function-configuration --function-name $funcName --region $Region --output json 2>&1 | ConvertFrom-Json
        $envVars = $configJson.Environment.Variables
        
        if (-not $envVars) {
            Write-Host "❌ No environment variables configured!" -ForegroundColor Red
            $HasIssues = $true
            Write-Host ""
            continue
        }
        
        # Check required variables
        $missingRequired = @()
        foreach ($varName in $RequiredVars) {
            $value = $envVars.$varName
            if ([string]::IsNullOrWhiteSpace($value)) {
                $missingRequired += $varName
            }
        }
        
        # Check important variables
        $missingImportant = @()
        foreach ($varName in $ImportantVars) {
            $value = $envVars.$varName
            if ([string]::IsNullOrWhiteSpace($value)) {
                $missingImportant += $varName
            }
        }
        
        if ($missingRequired.Count -gt 0) {
            Write-Host "❌ Missing REQUIRED variables:" -ForegroundColor Red
            foreach ($var in $missingRequired) {
                Write-Host "   - $var" -ForegroundColor Red
            }
            $HasIssues = $true
        } else {
            Write-Host "✅ All required variables present" -ForegroundColor Green
        }
        
        if ($missingImportant.Count -gt 0) {
            Write-Host "⚠️  Missing important variables:" -ForegroundColor Yellow
            foreach ($var in $missingImportant) {
                Write-Host "   - $var" -ForegroundColor Yellow
            }
        }
        
        # Check for spaces in DATABASE_URL (common error)
        if ($envVars.DATABASE_URL -and $envVars.DATABASE_URL -match '\s') {
            Write-Host "❌ DATABASE_URL contains spaces - this will cause connection failures" -ForegroundColor Red
            $HasIssues = $true
        }
        
        Write-Host ""
    } catch {
        Write-Host "❌ Failed to get configuration: $_" -ForegroundColor Red
        $HasIssues = $true
        Write-Host ""
    }
}

# Summary
Write-Host "=========================================" -ForegroundColor Cyan
if ($HasIssues) {
    Write-Host "❌ ISSUES DETECTED" -ForegroundColor Red
    Write-Host ""
    Write-Host "Some Lambda functions are missing required environment variables." -ForegroundColor Red
    Write-Host "This can cause 503 errors and other runtime failures." -ForegroundColor Red
    Write-Host ""
    Write-Host "To fix:" -ForegroundColor Yellow
    Write-Host "  1. Set missing environment variables locally" -ForegroundColor Gray
    Write-Host "  2. Run: cd serverless && .\scripts\deploy.ps1 -Stage $Stage -Region $Region" -ForegroundColor Gray
    Write-Host ""
    exit 1
} else {
    Write-Host "✅ AUDIT PASSED" -ForegroundColor Green
    Write-Host ""
    Write-Host "All sampled Lambda functions have required environment variables." -ForegroundColor Green
    Write-Host ""
    exit 0
}
