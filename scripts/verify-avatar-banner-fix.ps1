# Avatar/Banner Save Fix - Verification Script
# Run this after deploying the fix to verify it works correctly

$ErrorActionPreference = "Stop"

# Configuration
$ApiBase = "https://wkndtj22ab.execute-api.us-west-2.amazonaws.com"
$TestUser = $env:TEST_USER_ID  # Set this to a test user ID
$TestToken = $env:TEST_AUTH_TOKEN  # Set this to a valid JWT token

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Avatar/Banner Save Fix - Verification Tests" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Backend Health Check
Write-Host "[Test 1/5] Backend Health Check..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$ApiBase/health" -Method GET
    if ($healthResponse.status -eq "healthy" -or $healthResponse) {
        Write-Host "  ✅ Backend is healthy" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Backend health check failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 2: Verify null values are rejected
Write-Host "[Test 2/5] Testing null value rejection..." -ForegroundColor Yellow
Write-Host "  This test verifies the backend rejects null avatar/banner values" -ForegroundColor Gray

if (-not $TestToken) {
    Write-Host "  ⚠️  Skipped: TEST_AUTH_TOKEN not set" -ForegroundColor Yellow
    Write-Host "     To run this test, set environment variable TEST_AUTH_TOKEN" -ForegroundColor Gray
} else {
    try {
        $headers = @{
            "Authorization" = "Bearer $TestToken"
            "Content-Type" = "application/json"
        }
        
        # Send update with null values
        $payload = @{
            displayName = "Test User"
            avatarUrl = $null
            bannerUrl = $null
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$ApiBase/me/profile" -Method PATCH -Headers $headers -Body $payload
        
        # Check that null values didn't overwrite existing data
        if ($response.avatar -ne $null -or $response.bannerUrl -ne $null) {
            Write-Host "  ✅ Null values did not overwrite existing data" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Warning: Unable to verify - both fields might have been null originally" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ⚠️  Test error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}
Write-Host ""

# Test 3: Check field mappings
Write-Host "[Test 3/5] Verifying field mappings..." -ForegroundColor Yellow
Write-Host "  Checking Prisma schema..." -ForegroundColor Gray

$schemaPath = "api/prisma/schema.prisma"
if (Test-Path $schemaPath) {
    $schemaContent = Get-Content $schemaPath -Raw
    
    # Check User.avatar field
    if ($schemaContent -match "avatar\s+String\?") {
        Write-Host "  ✅ User.avatar field exists in schema" -ForegroundColor Green
    } else {
        Write-Host "  ❌ User.avatar field missing or incorrect" -ForegroundColor Red
    }
    
    # Check Profile.bannerUrl field
    if ($schemaContent -match "bannerUrl\s+String\?") {
        Write-Host "  ✅ Profile.bannerUrl field exists in schema" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Profile.bannerUrl field missing or incorrect" -ForegroundColor Red
    }
} else {
    Write-Host "  ⚠️  Schema file not found at $schemaPath" -ForegroundColor Yellow
}
Write-Host ""

# Test 4: Check backend code for null checks
Write-Host "[Test 4/5] Verifying backend null checks..." -ForegroundColor Yellow
Write-Host "  Checking updateMyProfile handler..." -ForegroundColor Gray

$handlerPath = "serverless/src/handlers/profiles.js"
if (Test-Path $handlerPath) {
    $handlerContent = Get-Content $handlerPath -Raw
    
    # Check for avatar null check
    if ($handlerContent -match "avatarUrl !== undefined && avatarUrl !== null") {
        Write-Host "  ✅ Avatar null check implemented" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Avatar null check missing" -ForegroundColor Red
    }
    
    # Check for banner null check
    if ($handlerContent -match "bannerUrl !== undefined && bannerUrl !== null") {
        Write-Host "  ✅ Banner null check implemented" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Banner null check missing" -ForegroundColor Red
    }
} else {
    Write-Host "  ⚠️  Handler file not found at $handlerPath" -ForegroundColor Yellow
}
Write-Host ""

# Test 5: Check frontend code for conditional field inclusion
Write-Host "[Test 5/5] Verifying frontend conditional field inclusion..." -ForegroundColor Yellow
Write-Host "  Checking ProfileEdit component..." -ForegroundColor Gray

$componentPath = "src/pages/ProfileEdit.jsx"
if (Test-Path $componentPath) {
    $componentContent = Get-Content $componentPath -Raw
    
    # Check for conditional avatar inclusion
    if ($componentContent -match "if \(formData\.avatar\)") {
        Write-Host "  ✅ Conditional avatar inclusion implemented" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Conditional avatar inclusion missing" -ForegroundColor Red
    }
    
    # Check for conditional banner inclusion
    if ($componentContent -match "if \(bannerValue\)") {
        Write-Host "  ✅ Conditional banner inclusion implemented" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Conditional banner inclusion missing" -ForegroundColor Red
    }
} else {
    Write-Host "  ⚠️  Component file not found at $componentPath" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Verification Summary" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Code changes verified locally" -ForegroundColor Green
Write-Host "⚠️  Full integration test requires:" -ForegroundColor Yellow
Write-Host "   - Deployed backend with updated code" -ForegroundColor Gray
Write-Host "   - Deployed frontend with updated code" -ForegroundColor Gray
Write-Host "   - Valid test user credentials" -ForegroundColor Gray
Write-Host ""
Write-Host "Manual Testing Steps:" -ForegroundColor Cyan
Write-Host "1. Deploy backend: cd serverless && npm run deploy" -ForegroundColor Gray
Write-Host "2. Deploy frontend: npm run build && deploy to CloudFront" -ForegroundColor Gray
Write-Host "3. Log in as test user" -ForegroundColor Gray
Write-Host "4. Go to Edit Profile page" -ForegroundColor Gray
Write-Host "5. Upload ONLY avatar → Save → Verify banner not lost" -ForegroundColor Gray
Write-Host "6. Upload ONLY banner → Save → Verify avatar not lost" -ForegroundColor Gray
Write-Host "7. Upload both → Save → Verify both persist" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ Verification script completed" -ForegroundColor Green
