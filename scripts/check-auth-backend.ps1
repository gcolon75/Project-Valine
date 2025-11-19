<#
.SYNOPSIS
Auth Backend Diagnostics Script (PowerShell)

.DESCRIPTION
This script performs comprehensive checks on the auth backend to diagnose
connectivity issues like DNS resolution failures (net::ERR_NAME_NOT_RESOLVED).

.PARAMETER Domain
API Gateway hostname (required)
Example: fb9pxd6m09.execute-api.us-west-2.amazonaws.com

.PARAMETER Timeout
Request timeout in seconds (default: 10)

.PARAMETER Verbose
Show detailed output

.EXAMPLE
.\scripts\check-auth-backend.ps1 -Domain "fb9pxd6m09.execute-api.us-west-2.amazonaws.com"

.EXAMPLE
.\scripts\check-auth-backend.ps1 -Domain "api.valine.com" -Timeout 5 -Verbose

.NOTES
Exit codes:
  0 - All checks passed
  1 - DNS resolution failure
  2 - TCP connection failure
  3 - HTTP request failure
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Domain,
    
    [Parameter(Mandatory=$false)]
    [int]$Timeout = 10,
    
    [Parameter(Mandatory=$false)]
    [switch]$Verbose
)

# Enable strict mode
$ErrorActionPreference = "Continue"

function Write-Header {
    param([string]$Text)
    Write-Host "`n=== $Text ===" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Text)
    Write-Host "✓ $Text" -ForegroundColor Green
}

function Write-Failure {
    param([string]$Text)
    Write-Host "✗ $Text" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Text)
    Write-Host "⚠ $Text" -ForegroundColor Yellow
}

# DNS Resolution Check
function Test-DNSResolution {
    param([string]$Domain, [bool]$VerboseOutput)
    
    Write-Header "DNS Resolution Check"
    Write-Host "Resolving: $Domain`n"
    
    try {
        # Try Resolve-DnsName (preferred method on Windows)
        if (Get-Command Resolve-DnsName -ErrorAction SilentlyContinue) {
            $dnsResult = Resolve-DnsName -Name $Domain -Type A -ErrorAction Stop
            
            if ($dnsResult) {
                Write-Success "DNS resolution successful"
                foreach ($record in $dnsResult) {
                    if ($record.Type -eq "A") {
                        Write-Host "  IP Address: $($record.IPAddress)"
                    }
                }
                
                # Also try IPv6
                try {
                    $dnsResultV6 = Resolve-DnsName -Name $Domain -Type AAAA -ErrorAction SilentlyContinue
                    if ($dnsResultV6) {
                        foreach ($record in $dnsResultV6) {
                            if ($record.Type -eq "AAAA") {
                                Write-Host "  IPv6 Address: $($record.IPAddress)"
                            }
                        }
                    }
                } catch {
                    if ($VerboseOutput) {
                        Write-Host "  No IPv6 addresses found"
                    }
                }
                
                $addresses = $dnsResult | Where-Object { $_.Type -eq "A" } | Select-Object -ExpandProperty IPAddress
                return @{
                    Success = $true
                    Addresses = $addresses
                }
            }
        }
        # Fallback to .NET DNS resolution
        else {
            $dnsResult = [System.Net.Dns]::GetHostAddresses($Domain)
            if ($dnsResult) {
                Write-Success "DNS resolution successful"
                foreach ($address in $dnsResult) {
                    Write-Host "  IP Address: $($address.IPAddressToString)"
                }
                
                return @{
                    Success = $true
                    Addresses = $dnsResult | ForEach-Object { $_.IPAddressToString }
                }
            }
        }
        
        throw "No DNS results found"
    }
    catch {
        Write-Failure "DNS resolution failed"
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "`nCommon causes:" -ForegroundColor Yellow
        Write-Host "  1. Domain name typo or incorrect hostname"
        Write-Host "  2. API Gateway endpoint deleted or stage removed"
        Write-Host "  3. DNS record not created or propagation in progress"
        Write-Host "  4. Local DNS server or network issues"
        Write-Host "`nTroubleshooting steps:" -ForegroundColor Yellow
        Write-Host "  - Verify domain in environment variables (VITE_API_BASE)"
        Write-Host "  - Run: nslookup $Domain"
        Write-Host "  - Run: Resolve-DnsName -Name $Domain"
        Write-Host "  - Check AWS API Gateway: aws apigateway get-rest-apis"
        Write-Host "  - Check Route53 records if using custom domain"
        
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

# TCP Connection Check
function Test-TCPConnection {
    param(
        [string]$Domain,
        [string[]]$Addresses,
        [int]$TimeoutSeconds,
        [bool]$VerboseOutput
    )
    
    Write-Header "TCP Connection Check"
    Write-Host "Testing connection to port 443 (HTTPS)`n"
    
    $allSuccess = $true
    
    foreach ($address in $Addresses) {
        try {
            if ($VerboseOutput) {
                Write-Host "  Connecting to $address`:443..."
            }
            
            $tcpClient = New-Object System.Net.Sockets.TcpClient
            $startTime = Get-Date
            
            $connect = $tcpClient.BeginConnect($address, 443, $null, $null)
            $wait = $connect.AsyncWaitHandle.WaitOne(($TimeoutSeconds * 1000), $false)
            
            if ($wait) {
                $tcpClient.EndConnect($connect)
                $duration = ((Get-Date) - $startTime).TotalMilliseconds
                Write-Success "TCP connection successful to $address`:443 ($([math]::Round($duration))ms)"
                $tcpClient.Close()
            }
            else {
                Write-Failure "TCP connection timeout to $address`:443"
                $allSuccess = $false
                $tcpClient.Close()
            }
        }
        catch {
            Write-Failure "TCP connection failed to $address`:443"
            Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
            $allSuccess = $false
        }
    }
    
    if (-not $allSuccess) {
        Write-Host "`nCommon causes:" -ForegroundColor Yellow
        Write-Host "  1. Firewall blocking outbound HTTPS (port 443)"
        Write-Host "  2. API Gateway endpoint not deployed or deleted"
        Write-Host "  3. Security group or network ACL blocking traffic"
        Write-Host "  4. WAF or CloudFront blocking the connection"
    }
    
    return @{
        Success = $allSuccess
    }
}

# HTTPS Request Check
function Test-HTTPSRequest {
    param(
        [string]$Domain,
        [string]$Path,
        [string]$Method,
        [int]$TimeoutSeconds,
        [bool]$VerboseOutput
    )
    
    $uri = "https://$Domain$Path"
    
    if ($VerboseOutput) {
        Write-Host "  Request: $Method $uri"
    }
    
    try {
        $startTime = Get-Date
        
        $response = Invoke-WebRequest -Uri $uri -Method $Method -TimeoutSec $TimeoutSeconds -UseBasicParsing -ErrorAction Stop
        
        $duration = ((Get-Date) - $startTime).TotalMilliseconds
        
        return @{
            Success = $true
            StatusCode = $response.StatusCode
            StatusDescription = $response.StatusDescription
            Headers = $response.Headers
            Content = $response.Content
            Duration = [math]::Round($duration)
        }
    }
    catch {
        $statusCode = $null
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        
        return @{
            Success = $false
            Error = $_.Exception.Message
            StatusCode = $statusCode
            FullError = $_
        }
    }
}

# Check /auth/me endpoint
function Test-AuthMe {
    param([string]$Domain, [int]$TimeoutSeconds, [bool]$VerboseOutput)
    
    Write-Header "HTTPS GET /auth/me"
    
    $result = Test-HTTPSRequest -Domain $Domain -Path "/auth/me" -Method "GET" -TimeoutSeconds $TimeoutSeconds -VerboseOutput $VerboseOutput
    
    if ($result.Success -or $result.StatusCode) {
        $statusCode = $result.StatusCode
        if ($statusCode -ge 200 -and $statusCode -lt 500) {
            Write-Success "GET /auth/me responded with $statusCode ($($result.Duration)ms)"
            Write-Host "  Status: $statusCode $($result.StatusDescription)"
            if ($result.Headers -and $result.Headers.ContainsKey('Content-Type')) {
                Write-Host "  Content-Type: $($result.Headers['Content-Type'])"
            }
            if ($result.Headers -and $result.Headers.ContainsKey('Cache-Control')) {
                Write-Host "  Cache-Control: $($result.Headers['Cache-Control'])"
            }
            if ($VerboseOutput -and $result.Content) {
                $preview = $result.Content.Substring(0, [Math]::Min(200, $result.Content.Length))
                Write-Host "  Body preview: $preview$(if($result.Content.Length -gt 200){'...'} else {''})"
            }
        } else {
            Write-Failure "GET /auth/me failed with status $statusCode"
        }
    }
    else {
        Write-Failure "GET /auth/me failed"
        Write-Host "  Error: $($result.Error)" -ForegroundColor Red
    }
    
    return $result
}

# Check OPTIONS /auth/login (CORS)
function Test-AuthLoginOptions {
    param([string]$Domain, [int]$TimeoutSeconds, [bool]$VerboseOutput)
    
    Write-Header "HTTPS OPTIONS /auth/login (CORS Check)"
    
    $result = Test-HTTPSRequest -Domain $Domain -Path "/auth/login" -Method "OPTIONS" -TimeoutSeconds $TimeoutSeconds -VerboseOutput $VerboseOutput
    
    if ($result.Success -or $result.StatusCode) {
        $statusCode = $result.StatusCode
        if ($statusCode -ge 200 -and $statusCode -lt 500) {
            Write-Success "OPTIONS /auth/login responded with $statusCode ($($result.Duration)ms)"
            Write-Host "  Status: $statusCode $($result.StatusDescription)"
            
            Write-Host "  CORS Headers:"
            $corsHeaders = @(
                'Access-Control-Allow-Origin',
                'Access-Control-Allow-Methods',
                'Access-Control-Allow-Headers',
                'Access-Control-Allow-Credentials',
                'Access-Control-Max-Age'
            )
            
            $foundCorsHeaders = $false
            foreach ($header in $corsHeaders) {
                if ($result.Headers -and $result.Headers.ContainsKey($header)) {
                    Write-Host "    $header`: $($result.Headers[$header])"
                    $foundCorsHeaders = $true
                }
            }
            
            if (-not $foundCorsHeaders) {
                Write-Warning "Warning: No CORS headers found. Frontend may have CORS issues."
            }
        } else {
            Write-Failure "OPTIONS /auth/login failed with status $statusCode"
        }
    }
    else {
        Write-Failure "OPTIONS /auth/login failed"
        Write-Host "  Error: $($result.Error)" -ForegroundColor Red
    }
    
    return $result
}

# Check HEAD / (root endpoint)
function Test-Root {
    param([string]$Domain, [int]$TimeoutSeconds, [bool]$VerboseOutput)
    
    Write-Header "HTTPS HEAD / (Root Check)"
    
    $result = Test-HTTPSRequest -Domain $Domain -Path "/" -Method "HEAD" -TimeoutSeconds $TimeoutSeconds -VerboseOutput $VerboseOutput
    
    if ($result.Success -or $result.StatusCode) {
        $statusCode = $result.StatusCode
        if ($statusCode -ge 200 -and $statusCode -lt 500) {
            Write-Success "HEAD / responded with $statusCode ($($result.Duration)ms)"
            Write-Host "  Status: $statusCode $($result.StatusDescription)"
            if ($result.Headers -and $result.Headers.ContainsKey('Server')) {
                Write-Host "  Server: $($result.Headers['Server'])"
            }
        } else {
            Write-Failure "HEAD / failed with status $statusCode"
        }
    }
    else {
        Write-Failure "HEAD / failed"
        Write-Host "  Error: $($result.Error)" -ForegroundColor Red
    }
    
    return $result
}

# Main execution
function Main {
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║         Auth Backend Diagnostics                           ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host "`nTarget: $Domain"
    Write-Host "Timeout: $Timeout seconds"
    
    $exitCode = 0
    
    # Step 1: DNS Resolution
    $dnsResult = Test-DNSResolution -Domain $Domain -VerboseOutput $Verbose
    if (-not $dnsResult.Success) {
        Write-Host "`n❌ DIAGNOSTIC FAILED: DNS resolution failed" -ForegroundColor Red
        Write-Host "`nRecommended actions:" -ForegroundColor Yellow
        Write-Host "  1. Check VITE_API_BASE environment variable"
        Write-Host "  2. Verify API Gateway endpoint exists in AWS console"
        Write-Host "  3. Check Route53 DNS records if using custom domain"
        Write-Host "  4. Run local DNS diagnostics (nslookup, Resolve-DnsName)"
        exit 1
    }
    
    # Step 2: TCP Connectivity
    $tcpResult = Test-TCPConnection -Domain $Domain -Addresses $dnsResult.Addresses -TimeoutSeconds $Timeout -VerboseOutput $Verbose
    if (-not $tcpResult.Success) {
        Write-Host "`n❌ DIAGNOSTIC FAILED: TCP connection failed" -ForegroundColor Red
        Write-Host "`nRecommended actions:" -ForegroundColor Yellow
        Write-Host "  1. Check firewall and security groups"
        Write-Host "  2. Verify API Gateway deployment"
        Write-Host "  3. Check WAF rules if CloudFront is in front"
        Write-Host "  4. Test from different network to isolate local issues"
        exit 2
    }
    
    # Step 3: HTTPS Requests
    $rootResult = Test-Root -Domain $Domain -TimeoutSeconds $Timeout -VerboseOutput $Verbose
    $authMeResult = Test-AuthMe -Domain $Domain -TimeoutSeconds $Timeout -VerboseOutput $Verbose
    $optionsResult = Test-AuthLoginOptions -Domain $Domain -TimeoutSeconds $Timeout -VerboseOutput $Verbose
    
    # Summary
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║                 Diagnostic Summary                         ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    
    $rootStatus = if ($rootResult.Success -or ($rootResult.StatusCode -ge 200 -and $rootResult.StatusCode -lt 500)) { "✓ PASS" } else { "✗ FAIL" }
    $authMeStatus = if ($authMeResult.Success -or ($authMeResult.StatusCode -ge 200 -and $authMeResult.StatusCode -lt 500)) { "✓ PASS" } else { "✗ FAIL" }
    $optionsStatus = if ($optionsResult.Success -or ($optionsResult.StatusCode -ge 200 -and $optionsResult.StatusCode -lt 500)) { "✓ PASS" } else { "✗ FAIL" }
    
    Write-Host "`nDNS Resolution:       $(if($dnsResult.Success){'✓ PASS'}else{'✗ FAIL'})"
    Write-Host "TCP Connection:       $(if($tcpResult.Success){'✓ PASS'}else{'✗ FAIL'})"
    Write-Host "Root Endpoint:        $rootStatus ($($rootResult.StatusCode))"
    Write-Host "Auth /me Endpoint:    $authMeStatus ($($authMeResult.StatusCode))"
    Write-Host "CORS Check:           $optionsStatus ($($optionsResult.StatusCode))"
    
    $httpChecksPassed = ($rootResult.Success -or ($rootResult.StatusCode -ge 200 -and $rootResult.StatusCode -lt 500)) -and
                        ($authMeResult.Success -or ($authMeResult.StatusCode -ge 200 -and $authMeResult.StatusCode -lt 500)) -and
                        ($optionsResult.Success -or ($optionsResult.StatusCode -ge 200 -and $optionsResult.StatusCode -lt 500))
    
    if (-not $httpChecksPassed) {
        $exitCode = 3
        Write-Host "`n⚠ Some HTTP checks failed. This may be expected if:" -ForegroundColor Yellow
        Write-Host "  - The endpoint requires authentication (401/403)"
        Write-Host "  - The API is configured differently"
        Write-Host "  - CORS is handled by CloudFront instead of API Gateway"
        Write-Host "`nReview the details above and check:" -ForegroundColor Yellow
        Write-Host "  - API Gateway stage deployment"
        Write-Host "  - CloudFront/WAF configuration if applicable"
        Write-Host "  - Backend Lambda function logs in CloudWatch"
    }
    else {
        Write-Host "`n✅ All diagnostics passed! Backend is reachable." -ForegroundColor Green
    }
    
    Write-Host "`nFor more troubleshooting guidance, see:"
    Write-Host "  docs/AUTH_BACKEND_INVESTIGATION.md`n"
    
    exit $exitCode
}

# Run main function
Main
