<#
setup-valine-ses.ps1

Purpose:
  - Collect SES/SMTP credentials and other required environment variables.
  - Optionally write a local serverless/.env file for local testing.
  - Optionally push secrets to AWS SSM Parameter Store (requires AWS CLI configured).
  - Optionally deploy the serverless stack (requires serverless + Node in ./serverless).
  - Run an end-to-end test flow (register -> verify -> login -> profile update -> sessions) using PowerShell web requests.
  - All interactions prompt for sensitive input securely. Nothing is sent externally by this script.

Usage:
  - Interactive:
      PS> ./setup-valine-ses.ps1
  - Non-interactive (example):
      PS> ./setup-valine-ses.ps1 -WriteLocal -PushToSsm -DeployServerless

Notes:
  - This script writes secrets to a local .env file only if you choose -WriteLocal. For production use SSM/Secrets Manager.
  - Ensure AWS CLI is installed & configured if you use -PushToSsm or SES CLI test.
  - Ensure you verified the FROM_EMAIL and (if in sandbox) the recipient in SES prior to using the E2E test.
  - The script does not read or expose your GitHub secrets; keep your real secrets secure.
#>

param(
    [string]$ApiBase = "https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com",
    [string]$FrontendUrl = "https://dkmxy676d3vgc.cloudfront.net",
    [string]$ServerlessEnvPath = ".\serverless\.env",
    [switch]$WriteLocal,
    [switch]$PushToSsm,
    [switch]$DeployServerless
)

function Read-SecureStringAsPlainText {
    param([System.Security.SecureString]$s)
    if (-not $s) { return "" }
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToGlobalAllocUnicode($s)
    try { [Runtime.InteropServices.Marshal]::PtrToStringUni($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeGlobalAllocUnicode($ptr) }
}

function Generate-JWTSecret {
    $bytes = New-Object byte[] 48
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

function Write-EnvFile {
    param($Path, $Lines)
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $Lines | Out-File -FilePath $Path -Encoding ascii -Force
    Write-Host "Wrote env file to: $Path"
}

function AwsCliExists { return (Get-Command aws -ErrorAction SilentlyContinue) -ne $null }

Write-Host "`n=== Project Valine: SES/SMTP wiring & E2E tester (PowerShell) ===`n"

# Prompt for values
$ApiBaseInput = Read-Host "API base URL (press Enter to accept default $ApiBase)" -ErrorAction SilentlyContinue
if (-not [string]::IsNullOrWhiteSpace($ApiBaseInput)) { $ApiBase = $ApiBaseInput }
if ([string]::IsNullOrWhiteSpace($ApiBase)) { $ApiBase = "https://i72dxlcfcc.execute-api.us-west-2.amazonaws.com" }

# Validate API base URL DNS resolution (warning only)
Write-Host ""
Write-Host "Validating API base URL..." -ForegroundColor Cyan
try {
    $hostname = ([System.Uri]$ApiBase).Host
    $resolved = [System.Net.Dns]::GetHostAddresses($hostname)
    if ($resolved.Count -gt 0) {
        Write-Host "✓ DNS resolution successful: $hostname -> $($resolved[0])" -ForegroundColor Green
    } else {
        Write-Warning "⚠ Could not resolve hostname: $hostname"
        Write-Warning "  The API may not be reachable. Verify the URL is correct."
    }
} catch {
    Write-Warning "⚠ Could not validate API URL: $_"
    Write-Warning "  Proceeding anyway, but the API may not be reachable."
}
Write-Host ""

$FrontendUrl = Read-Host "FRONTEND URL (press Enter to accept default $FrontendUrl)" -ErrorAction SilentlyContinue
if ([string]::IsNullOrWhiteSpace($FrontendUrl)) { $FrontendUrl = "https://dkmxy676d3vgc.cloudfront.net" }

$DatabaseUrl = Read-Host "DATABASE_URL (postgres connection string) (leave blank if not ready)" -ErrorAction SilentlyContinue

# SMTP / SES info
$FromEmail = Read-Host "FROM_EMAIL (SES-verified address; e.g. ghawk075@gmail.com)" -ErrorAction SilentlyContinue
if ([string]::IsNullOrWhiteSpace($FromEmail)) { Write-Error "FROM_EMAIL is required. Exiting."; exit 1 }

$SmtpHost = Read-Host "SMTP host (press Enter for SES default 'email-smtp.us-west-2.amazonaws.com')" -ErrorAction SilentlyContinue
if ([string]::IsNullOrWhiteSpace($SmtpHost)) { $SmtpHost = "email-smtp.us-west-2.amazonaws.com" }

$smtpPortInput = Read-Host "SMTP port (press Enter for 587)" -ErrorAction SilentlyContinue
if ([string]::IsNullOrWhiteSpace($smtpPortInput)) { $SmtpPort = 587 } else { $SmtpPort = [int]$smtpPortInput }

$SmtpUser = Read-Host "SMTP USER (SES SMTP username)" -ErrorAction SilentlyContinue
if ([string]::IsNullOrWhiteSpace($SmtpUser)) { Write-Error "SMTP_USER is required. Exiting."; exit 1 }

$SmtpPassSecure = Read-Host "SMTP PASS (SES SMTP password) - input hidden" -AsSecureString
$SmtpPass = Read-SecureStringAsPlainText $SmtpPassSecure
if ([string]::IsNullOrWhiteSpace($SmtpPass)) { Write-Error "SMTP_PASS is required. Exiting."; exit 1 }

$generateJwt = Read-Host "Generate a strong JWT_SECRET for you? (Y/n)"
if ($generateJwt -in @("","Y","y")) {
    $JwtSecret = Generate-JWTSecret
    Write-Host "Generated JWT_SECRET (stored in memory only)"
} else {
    $JwtSecret = Read-Host "Enter JWT_SECRET (leave blank to auto-generate)"
    if ([string]::IsNullOrWhiteSpace($JwtSecret)) { $JwtSecret = Generate-JWTSecret; Write-Host "Generated JWT_SECRET." }
}

# Confirm (do not echo secrets)
Write-Host "`nConfiguration summary (secrets hidden):"
Write-Host "  API_BASE_URL = $ApiBase"
Write-Host "  FRONTEND_URL = $FrontendUrl"
if ($DatabaseUrl) { Write-Host "  DATABASE_URL = (provided)" } else { Write-Host "  DATABASE_URL = (empty)" }
Write-Host "  FROM_EMAIL = $FromEmail"
Write-Host "  SMTP_HOST = $SmtpHost"
Write-Host "  SMTP_PORT = $SmtpPort"
Write-Host "  SMTP_USER = $SmtpUser"
Write-Host "  COOKIE_DOMAIN = dkmxy676d3vgc.cloudfront.net"
Write-Host "  CSRF_ENABLED = true"
Write-Host ""

# Write local env if requested
if ($WriteLocal.IsPresent) {
    $envLines = @(
        "AWS_REGION=us-west-2",
        "STAGE=prod",
        "NODE_ENV=production",
        "API_BASE_URL=$ApiBase",
        "FRONTEND_URL=$FrontendUrl",
        "COOKIE_DOMAIN=dkmxy676d3vgc.cloudfront.net"
    )
    if ($DatabaseUrl) { $envLines += "DATABASE_URL=$DatabaseUrl" }
    $envLines += "JWT_SECRET=$JwtSecret"
    $envLines += "EMAIL_ENABLED=true"
    $envLines += "SMTP_HOST=$SmtpHost"
    $envLines += "SMTP_PORT=$SmtpPort"
    $envLines += "SMTP_USER=$SmtpUser"
    $envLines += "SMTP_PASS=$SmtpPass"
    $envLines += "FROM_EMAIL=$FromEmail"
    $envLines += "CSRF_ENABLED=true"
    $envLines += "RATE_LIMITING_ENABLED=true"
    $envLines += "TWO_FACTOR_ENABLED=false"

    Write-EnvFile -Path $ServerlessEnvPath -Lines $envLines
}

# Push to SSM if requested (AWS CLI must be configured)
if ($PushToSsm.IsPresent) {
    if (-not (AwsCliExists)) {
        Write-Warning "AWS CLI not found. Install/configure aws cli to use SSM push. Skipping."
    } else {
        Write-Host "Pushing sensitive values to SSM Parameter Store (/valine/prod/) as SecureString..."
        try {
            aws ssm put-parameter --name "/valine/prod/JWT_SECRET" --value $JwtSecret --type "SecureString" --overwrite --region us-west-2 | Out-Null
            aws ssm put-parameter --name "/valine/prod/SMTP_PASS" --value $SmtpPass --type "SecureString" --overwrite --region us-west-2 | Out-Null
            if ($DatabaseUrl) { aws ssm put-parameter --name "/valine/prod/DATABASE_URL" --value $DatabaseUrl --type "SecureString" --overwrite --region us-west-2 | Out-Null }
            Write-Host "SSM parameters stored (check AWS Console > Systems Manager > Parameter Store)."
        } catch {
            Write-Error "Failed pushing to SSM: $_"
        }
    }
}

# Optional serverless deploy
if ($DeployServerless.IsPresent) {
    if (-not (Test-Path "./serverless")) {
        Write-Warning "serverless/ directory not found. Skipping deploy."
    } else {
        if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
            Write-Warning "npx not found. Install Node.js and npx to run serverless deploy."
        } else {
            Push-Location ./serverless
            Write-Host "Installing dependencies (npm ci)..."
            npm ci
            Write-Host "Deploying with serverless (prod)..."
            npx serverless deploy --stage prod
            if ($LASTEXITCODE -ne 0) { Write-Error "Serverless deploy failed with exit code $LASTEXITCODE." }
            else { Write-Host "Serverless deploy finished." }
            Pop-Location
        }
    }
}

# SES send test via AWS CLI (if available)
if (AwsCliExists) {
    $doSesTest = Read-Host "Run SES test (aws ses send-email) now to $FromEmail? (y/N)"
    if ($doSesTest -in @("y","Y")) {
        try {
            aws ses send-email --region us-west-2 --from "$FromEmail" --destination "ToAddresses=$FromEmail" --message "Subject={Data=Project Valine SES test},Body={Text={Data=This is a test email from SES via AWS CLI}}" 2>&1 | Write-Host
            Write-Host "If the command completed, check $FromEmail inbox for the test message."
        } catch {
            Write-Error "SES test send failed: $_"
        }
    }
} else {
    Write-Host "AWS CLI not installed - cannot run SES CLI test. You can test by registering in the app after deploy."
}

# ---------- E2E test flow function ----------
function Run-E2E {
    param($ApiBaseUrl, $FrontendUrl, $TestEmail, $TestPass)

    Write-Host "`nRunning E2E: register -> (verify) -> login -> profile update -> sessions"

    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

    # 1) Register
    $regObj = @{ email = $TestEmail; password = $TestPass; displayName = "PS-Tester" }
    $regBody = $regObj | ConvertTo-Json
    try {
        $regResp = Invoke-WebRequest -Uri "$ApiBaseUrl/auth/register" -Method Post -ContentType "application/json" -Body $regBody -WebSession $session -Headers @{ Origin = $FrontendUrl } -ErrorAction Stop
        Write-Host "Register HTTP status: $($regResp.StatusCode)"
    } catch {
        Write-Error "Registration failed: $_"
        return
    }

    Write-Host "`nCheck your inbox ($TestEmail) for the verification link or token."
    $token = Read-Host "Paste verification token here (or press Enter if you clicked the link)"
    if ($token) {
        try {
            $verifyPayload = @{ token = $token } | ConvertTo-Json
            $vr = Invoke-RestMethod -Uri "$ApiBaseUrl/auth/verify-email" -Method Post -ContentType "application/json" -Body $verifyPayload -ErrorAction Stop
            Write-Host "Verify response: $($vr | ConvertTo-Json -Depth 2)"
        } catch {
            Write-Error "Verify call failed: $_"
        }
    } else {
        Write-Host "Waiting for you to click the emailed verification link. Press Enter when done."
        Read-Host
    }

    # 2) Login
    try {
        $loginPayload = @{ email = $TestEmail; password = $TestPass } | ConvertTo-Json
        Invoke-WebRequest -Uri "$ApiBaseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginPayload -WebSession $session -Headers @{ Origin = $FrontendUrl } -ErrorAction Stop | Out-Null
        Write-Host "Login succeeded."
    } catch {
        Write-Error "Login failed: $_"
        return
    }

    # 3) Extract XSRF token
    $cookieJar = $session.Cookies.GetCookies($ApiBaseUrl)
    $xsrf = ($cookieJar | Where-Object { $_.Name -eq "XSRF-TOKEN" }) | Select-Object -ExpandProperty Value -ErrorAction SilentlyContinue
    if (-not $xsrf) { Write-Warning "XSRF-TOKEN cookie not found; CSRF-protected writes may fail." } else { Write-Host "XSRF token present." }

    # 4) Profile update
    if ($xsrf) {
        try {
            $updatePayload = @{ headline = "Verified via PS Script"; displayName = "PS-Tester" } | ConvertTo-Json
            $put = Invoke-WebRequest -Uri "$ApiBaseUrl/profiles/me" -Method Put -ContentType "application/json" -Body $updatePayload -WebSession $session -Headers @{ Origin = $FrontendUrl; "X-CSRF-Token" = $xsrf } -ErrorAction Stop
            Write-Host "Profile update: $($put.StatusCode)"
        } catch {
            Write-Error "Profile update failed: $_"
        }
    }

    # 5) Sessions
    try {
        $s = Invoke-WebRequest -Uri "$ApiBaseUrl/auth/sessions" -Method Get -WebSession $session -Headers @{ Origin = $FrontendUrl; "X-CSRF-Token" = $xsrf } -ErrorAction Stop
        Write-Host "Sessions response:"
        $s.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5 | Write-Host
    } catch {
        Write-Warning "Sessions listing failed: $_"
    }

    Write-Host "`nE2E complete."
}

$runE2E = Read-Host "Run the E2E flow now using FROM_EMAIL as the test user? (Y/n)"
if ($runE2E -in @("","Y","y")) {
    $testPass = Read-Host "Enter a test password (or press Enter to use 'Str0ng!Pass123')"
    if ([string]::IsNullOrWhiteSpace($testPass)) { $testPass = "Str0ng!Pass123" }
    Run-E2E -ApiBaseUrl $ApiBase -FrontendUrl $FrontendUrl -TestEmail $FromEmail -TestPass $testPass
}

Write-Host "`nScript finished. If any step failed, collect CloudWatch logs for your auth Lambda(s) and send me the error text and I will help parse them."