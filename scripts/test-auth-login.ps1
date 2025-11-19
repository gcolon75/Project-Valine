<#
.SYNOPSIS
Test Auth Login Script (PowerShell)

.DESCRIPTION
This script tests authentication by attempting to log in with credentials
provided via environment variables. Use this to verify that test accounts
can authenticate successfully.

SECURITY WARNING: Never commit credentials to the repository!
Only use this script in secure local or CI environments.

.PARAMETER Email
User email address (can also be set via $env:TEST_EMAIL)

.PARAMETER Password
User password (can also be set via $env:TEST_PASSWORD)

.PARAMETER ApiBase
API base URL (can also be set via $env:API_BASE)

.EXAMPLE
$env:TEST_EMAIL = "user@example.com"
$env:TEST_PASSWORD = "password123"
$env:API_BASE = "https://fb9pxd6m09.execute-api.us-west-2.amazonaws.com"
.\scripts\test-auth-login.ps1

.EXAMPLE
.\scripts\test-auth-login.ps1 -Email "user@example.com" -Password "password123" -ApiBase "https://api.valine.com"
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$Email,
    
    [Parameter(Mandatory=$false)]
    [string]$Password,
    
    [Parameter(Mandatory=$false)]
    [string]$ApiBase
)

# Use environment variables if parameters not provided
if (-not $Email) { $Email = $env:TEST_EMAIL }
if (-not $Password) { $Password = $env:TEST_PASSWORD }
if (-not $ApiBase) { $ApiBase = $env:API_BASE }

# Check for required inputs
if (-not $Email) {
    Write-Host "Error: Email not provided" -ForegroundColor Red
    Write-Host "`nUsage:"
    Write-Host "  `$env:TEST_EMAIL = `"user@example.com`""
    Write-Host "  `$env:TEST_PASSWORD = `"password123`""
    Write-Host "  `$env:API_BASE = `"https://your-api-domain.com`" (optional)"
    Write-Host "  .\scripts\test-auth-login.ps1"
    Write-Host "`nOr:"
    Write-Host "  .\scripts\test-auth-login.ps1 -Email `"user@example.com`" -Password `"password123`" -ApiBase `"https://api.valine.com`""
    exit 1
}

if (-not $Password) {
    Write-Host "Error: Password not provided" -ForegroundColor Red
    Write-Host "`nUsage:"
    Write-Host "  `$env:TEST_EMAIL = `"user@example.com`""
    Write-Host "  `$env:TEST_PASSWORD = `"password123`""
    Write-Host "  `$env:API_BASE = `"https://your-api-domain.com`" (optional)"
    Write-Host "  .\scripts\test-auth-login.ps1"
    exit 1
}

# Default API base if not provided
if (-not $ApiBase) {
    # Try to read from .env.production
    if (Test-Path ".env.production") {
        $envContent = Get-Content ".env.production"
        $apiBaseLine = $envContent | Where-Object { $_ -match "VITE_API_BASE=" }
        if ($apiBaseLine) {
            $ApiBase = $apiBaseLine -replace 'VITE_API_BASE=', '' -replace '"', '' -replace "'", ''
        }
    }
    
    if (-not $ApiBase) {
        Write-Host "Warning: API_BASE not set, using default" -ForegroundColor Yellow
        $ApiBase = "http://localhost:4000"
    }
}

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         Test Auth Login                                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Base: $ApiBase"
Write-Host "Email: $Email"
Write-Host "Password: ******* (hidden)"
Write-Host ""

# Security warning
Write-Host "⚠ SECURITY WARNING ⚠" -ForegroundColor Yellow
Write-Host "This script sends credentials over the network."
Write-Host "Only use in secure test/development environments."
Write-Host "Never commit credentials to version control."
Write-Host ""

# Test login
Write-Host "Attempting login..."
Write-Host ""

$loginUrl = "$ApiBase/auth/login"
$payload = @{
    email = $Email
    password = $Password
} | ConvertTo-Json

try {
    # Make request
    $response = Invoke-WebRequest -Uri $loginUrl `
        -Method POST `
        -ContentType "application/json" `
        -Body $payload `
        -UseBasicParsing `
        -ErrorAction Stop
    
    $statusCode = $response.StatusCode
    Write-Host "HTTP Status: $statusCode"
    Write-Host ""
    
    if ($statusCode -eq 200 -or $statusCode -eq 201) {
        Write-Host "✓ Login successful!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Response:"
        
        $jsonResponse = $response.Content | ConvertFrom-Json
        $jsonResponse | ConvertTo-Json -Depth 10 | Write-Host
        Write-Host ""
        
        # Extract token if present
        if ($jsonResponse.token) {
            $token = $jsonResponse.token
            $tokenPreview = $token.Substring(0, [Math]::Min(20, $token.Length))
            Write-Host "Token (first 20 chars): $tokenPreview..."
        } else {
            Write-Host "Note: Response does not include a token (may be using HttpOnly cookies)"
        }
        
        # Extract user info if present
        if ($jsonResponse.user -and $jsonResponse.user.id) {
            Write-Host "User ID: $($jsonResponse.user.id)"
        } elseif ($jsonResponse.id) {
            Write-Host "User ID: $($jsonResponse.id)"
        }
        
        exit 0
    }
}
catch {
    $statusCode = $null
    if ($_.Exception.Response) {
        $statusCode = [int]$_.Exception.Response.StatusCode
    }
    
    Write-Host "HTTP Status: $statusCode" -ForegroundColor Red
    Write-Host ""
    
    if ($statusCode -eq 401) {
        Write-Host "✗ Login failed: Invalid credentials (401 Unauthorized)" -ForegroundColor Red
        Write-Host ""
        
        # Try to get response body
        try {
            $responseBody = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($responseBody)
            $responseText = $reader.ReadToEnd()
            Write-Host "Response:"
            $responseText | ConvertFrom-Json | ConvertTo-Json | Write-Host
        } catch {
            Write-Host $_.Exception.Message
        }
        
        Write-Host ""
        Write-Host "Possible causes:"
        Write-Host "  - Incorrect email or password"
        Write-Host "  - Account doesn't exist"
        Write-Host "  - Account is disabled or locked"
        exit 1
    }
    elseif ($statusCode -eq 403) {
        Write-Host "✗ Login failed: Forbidden (403)" -ForegroundColor Red
        Write-Host ""
        
        try {
            $responseBody = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($responseBody)
            $responseText = $reader.ReadToEnd()
            Write-Host "Response:"
            $responseText | ConvertFrom-Json | ConvertTo-Json | Write-Host
        } catch {
            Write-Host $_.Exception.Message
        }
        
        Write-Host ""
        Write-Host "Possible causes:"
        Write-Host "  - Account requires email verification"
        Write-Host "  - Account is suspended"
        Write-Host "  - IP-based restriction (WAF/allowlist)"
        exit 1
    }
    elseif ($_.Exception.Message -match "Unable to connect" -or $_.Exception.Message -match "No such host") {
        Write-Host "✗ Connection failed: Could not reach API" -ForegroundColor Red
        Write-Host ""
        Write-Host "Error: $($_.Exception.Message)"
        Write-Host ""
        Write-Host "Possible causes:"
        Write-Host "  - API endpoint is down or unreachable"
        Write-Host "  - DNS resolution failure"
        Write-Host "  - Network/firewall blocking connection"
        Write-Host "  - Incorrect API_BASE URL"
        Write-Host ""
        
        $domain = $ApiBase -replace 'https://', '' -replace 'http://', '' -replace '/', ''
        Write-Host "Run diagnostics:"
        Write-Host "  .\scripts\check-auth-backend.ps1 -Domain `"$domain`""
        exit 1
    }
    else {
        Write-Host "✗ Login failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        
        try {
            $responseBody = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($responseBody)
            $responseText = $reader.ReadToEnd()
            Write-Host "Response:"
            Write-Host $responseText
        } catch {
            Write-Host "Could not read response body"
        }
        
        exit 1
    }
}
