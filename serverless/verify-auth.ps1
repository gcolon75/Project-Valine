# Verification script for auth.js correctness
# Run this before deployment to ensure the file is ready
# Usage: .\verify-auth.ps1

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Auth.js Pre-Deployment Verification" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

$authFile = "src\handlers\auth.js"
$errors = 0

# Check file exists
Write-Host "Checking file exists..." -NoNewline
if (-not (Test-Path $authFile)) {
    Write-Host " ERROR" -ForegroundColor Red
    Write-Host "  $authFile not found" -ForegroundColor Red
    exit 1
}
Write-Host " OK" -ForegroundColor Green

# Check Node.js syntax
Write-Host "Checking Node.js syntax..." -NoNewline
$syntaxCheck = node --check $authFile 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host " ERROR" -ForegroundColor Red
    Write-Host "  Syntax check failed:" -ForegroundColor Red
    Write-Host "  $syntaxCheck" -ForegroundColor Red
    $errors++
} else {
    Write-Host " OK" -ForegroundColor Green
}

# Check for duplicate exports
Write-Host "Checking for duplicate exports..." -NoNewline
$duplicateExports = (Select-String -Path $authFile -Pattern "^export async function" | Measure-Object).Count
if ($duplicateExports -gt 0) {
    Write-Host " ERROR" -ForegroundColor Red
    Write-Host "  Found $duplicateExports 'export async function' statements" -ForegroundColor Red
    Write-Host "  These cause duplicate export errors. Remove 'export' keyword." -ForegroundColor Red
    $errors++
} else {
    Write-Host " OK" -ForegroundColor Green
}

# Check for single export block
Write-Host "Checking for single export block..." -NoNewline
$exportBlocks = (Select-String -Path $authFile -Pattern "^export \{" | Measure-Object).Count
if ($exportBlocks -ne 1) {
    Write-Host " ERROR" -ForegroundColor Red
    Write-Host "  Expected exactly 1 export block, found $exportBlocks" -ForegroundColor Red
    $errors++
} else {
    Write-Host " OK" -ForegroundColor Green
}

# Check for logging line
Write-Host "Checking for logging line..." -NoNewline
$loggingLines = (Select-String -Path $authFile -Pattern "\[LOGIN\] Raw body length:" | Measure-Object).Count
if ($loggingLines -lt 1) {
    Write-Host " WARNING" -ForegroundColor Yellow
    Write-Host "  Logging line not found. This is needed for debugging." -ForegroundColor Yellow
} else {
    Write-Host " OK" -ForegroundColor Green
}

# Verify all required handlers are defined
Write-Host "Verifying all required handlers are defined..." -NoNewline
$requiredHandlers = @(
    "login",
    "register",
    "me",
    "refresh",
    "logout",
    "verifyEmail",
    "resendVerification",
    "setup2FA",
    "enable2FA",
    "verify2FA",
    "disable2FA"
)

$content = Get-Content $authFile -Raw
$missingHandlers = @()
foreach ($handler in $requiredHandlers) {
    if (-not ($content -match "async function $handler")) {
        $missingHandlers += $handler
        $errors++
    }
}

if ($missingHandlers.Count -gt 0) {
    Write-Host " ERROR" -ForegroundColor Red
    Write-Host "  Missing handlers: $($missingHandlers -join ', ')" -ForegroundColor Red
} else {
    Write-Host " OK" -ForegroundColor Green
}

# Verify handler exports
Write-Host "Verifying handler exports..." -NoNewline
$exportSection = $content -split "export \{" | Select-Object -Last 1 | Split-String "}" | Select-Object -First 1
$missingExports = @()
foreach ($handler in $requiredHandlers) {
    if (-not ($exportSection -match $handler)) {
        $missingExports += $handler
        $errors++
    }
}

if ($missingExports.Count -gt 0) {
    Write-Host " ERROR" -ForegroundColor Red
    Write-Host "  Missing exports: $($missingExports -join ', ')" -ForegroundColor Red
} else {
    Write-Host " OK" -ForegroundColor Green
}

# Check for required imports
Write-Host "Checking for required imports..." -NoNewline
$requiredImports = @(
    "getPrisma",
    "getCorsHeaders",
    "bcrypt",
    "authenticator",
    "generateAccessToken",
    "generateRefreshToken"
)

$missingImports = @()
foreach ($import in $requiredImports) {
    if (-not ($content -match $import)) {
        $missingImports += $import
        $errors++
    }
}

if ($missingImports.Count -gt 0) {
    Write-Host " ERROR" -ForegroundColor Red
    Write-Host "  Missing imports: $($missingImports -join ', ')" -ForegroundColor Red
} else {
    Write-Host " OK" -ForegroundColor Green
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan

if ($errors -eq 0) {
    Write-Host "All verification checks passed!" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host ""
    
    $asyncFunctions = (Select-String -Path $authFile -Pattern "^async function" | Measure-Object).Count
    $lineCount = (Get-Content $authFile | Measure-Object -Line).Lines
    
    Write-Host "Handler count: $asyncFunctions async functions" -ForegroundColor Gray
    Write-Host "File size: $lineCount lines" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Ready for deployment!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Install serverless globally:" -ForegroundColor White
    Write-Host "     npm install -g serverless" -ForegroundColor Gray
    Write-Host "  2. Deploy:" -ForegroundColor White
    Write-Host "     serverless deploy --stage prod --region us-west-2 --force" -ForegroundColor Gray
    Write-Host "  3. Test login endpoint (see DEPLOYMENT_INSTRUCTIONS.md)" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "Verification FAILED with $errors error(s)" -ForegroundColor Red
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Please fix the errors above before deploying." -ForegroundColor Red
    Write-Host "See DEPLOYMENT_INSTRUCTIONS.md for help." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
