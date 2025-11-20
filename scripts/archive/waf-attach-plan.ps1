# scripts/waf-attach-plan.ps1
# Dry-run script to preview WAF WebACL association with CloudFront distribution
# Does NOT make any changes - shows current vs planned state only

param(
    [Parameter(Mandatory=$false)]
    [string]$DistributionId,
    
    [Parameter(Mandatory=$false)]
    [string]$WebAclArn,
    
    [switch]$Help
)

# Color output functions
function Write-Success { param($Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "✗ $Message" -ForegroundColor Red }
function Write-Warning { param($Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }
function Write-Info { param($Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }
function Write-Header { param($Message) Write-Host "`n========================================" -ForegroundColor Blue; Write-Host "$Message" -ForegroundColor Blue; Write-Host "========================================`n" -ForegroundColor Blue }

if ($Help) {
    Write-Host @"
WAF Attach Plan (Dry-Run)

Usage:
    .\scripts\waf-attach-plan.ps1 [-DistributionId <id>] [-WebAclArn <arn>]

Options:
    -DistributionId    CloudFront distribution ID to check
    -WebAclArn        Planned WebACL ARN to associate (optional)
    -Help             Show this help message

Description:
    This script performs a DRY RUN to show:
    - Current WAF WebACL association (if any)
    - Planned WebACL association (if provided)
    - Impact analysis

    NO CHANGES ARE MADE - this is for planning only.

Examples:
    # Check current WAF status
    .\scripts\waf-attach-plan.ps1 -DistributionId E1234567890ABC

    # Preview planned association
    .\scripts\waf-attach-plan.ps1 -DistributionId E1234567890ABC -WebAclArn arn:aws:wafv2:...

Requirements:
    - AWS CLI installed and configured
    - AWS credentials with CloudFront read permissions
"@
    exit 0
}

Write-Header "WAF Attach Plan (Dry-Run Only)"

# Check if AWS CLI is available
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Error "AWS CLI not found"
    Write-Info "Install AWS CLI: https://aws.amazon.com/cli/"
    exit 1
}

# Check AWS credentials
try {
    $null = aws sts get-caller-identity 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "AWS credentials not configured"
        Write-Info "Run: aws configure"
        exit 0
    }
} catch {
    Write-Warning "AWS credentials not configured"
    Write-Info "Run: aws configure"
    exit 0
}

# Get distribution ID from environment if not provided
if (-not $DistributionId) {
    Write-Warning "No distribution ID provided"
    Write-Info "Usage: .\scripts\waf-attach-plan.ps1 -DistributionId <id>"
    Write-Info "   Or set CLOUDFRONT_DISTRIBUTION_ID environment variable"
    
    if ($env:CLOUDFRONT_DISTRIBUTION_ID) {
        $DistributionId = $env:CLOUDFRONT_DISTRIBUTION_ID
        Write-Info "Using CLOUDFRONT_DISTRIBUTION_ID from environment: $DistributionId"
    } else {
        exit 1
    }
}

Write-Info "Distribution ID: $DistributionId"
Write-Host ""

# Fetch current distribution configuration
Write-Info "Fetching distribution configuration..."
try {
    $distConfig = aws cloudfront get-distribution --id $DistributionId 2>&1 | ConvertFrom-Json
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to fetch distribution configuration"
        Write-Host $distConfig
        exit 1
    }
} catch {
    Write-Error "Failed to parse distribution configuration"
    Write-Host $_.Exception.Message
    exit 1
}

Write-Success "Distribution found"
Write-Host ""

# Extract current WAF association
$currentWebAclId = $distConfig.Distribution.DistributionConfig.WebACLId

Write-Header "Current State"

if ($currentWebAclId) {
    Write-Info "WebACL ID: $currentWebAclId"
    Write-Success "WAF is currently ATTACHED"
    
    # Try to get WebACL details
    try {
        $webAclDetails = aws wafv2 get-web-acl --scope CLOUDFRONT --id $currentWebAclId --region us-east-1 2>&1 | ConvertFrom-Json
        
        if ($LASTEXITCODE -eq 0) {
            Write-Info "WebACL Name: $($webAclDetails.WebACL.Name)"
            Write-Info "WebACL Description: $($webAclDetails.WebACL.Description)"
            Write-Info "Rules Count: $($webAclDetails.WebACL.Rules.Count)"
        }
    } catch {
        Write-Warning "Could not fetch WebACL details"
    }
} else {
    Write-Warning "No WAF WebACL currently attached"
    Write-Info "Distribution is using CloudFront default security only"
}

Write-Host ""

# Show planned state if WebAclArn provided
if ($WebAclArn) {
    Write-Header "Planned State"
    
    Write-Info "Planned WebACL ARN: $WebAclArn"
    
    # Try to get details of planned WebACL
    try {
        # Extract WebACL ID from ARN
        $webAclId = ($WebAclArn -split '/')[-1]
        $webAclDetails = aws wafv2 get-web-acl --scope CLOUDFRONT --id $webAclId --region us-east-1 2>&1 | ConvertFrom-Json
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Planned WebACL found"
            Write-Info "  Name: $($webAclDetails.WebACL.Name)"
            Write-Info "  Description: $($webAclDetails.WebACL.Description)"
            Write-Info "  Rules: $($webAclDetails.WebACL.Rules.Count)"
            
            Write-Host ""
            Write-Info "Rules breakdown:"
            foreach ($rule in $webAclDetails.WebACL.Rules) {
                Write-Host "  - $($rule.Name) (Priority: $($rule.Priority))"
            }
        } else {
            Write-Error "Could not fetch planned WebACL details"
        }
    } catch {
        Write-Warning "Could not fetch planned WebACL details"
    }
    
    Write-Host ""
    
    # Show impact
    Write-Header "Impact Analysis"
    
    if ($currentWebAclId -eq $WebAclArn) {
        Write-Success "No change - same WebACL already attached"
    } elseif ($currentWebAclId) {
        Write-Warning "This will REPLACE the existing WebACL"
        Write-Info "  Current: $currentWebAclId"
        Write-Info "  New:     $WebAclArn"
    } else {
        Write-Info "This will ATTACH a new WebACL (currently none attached)"
        Write-Info "  New:     $WebAclArn"
    }
    
    Write-Host ""
    Write-Header "Next Steps"
    Write-Host "This was a DRY RUN - no changes were made"
    Write-Host ""
    Write-Info "To apply this change:"
    Write-Host "  1. Review the WAF rules in AWS Console"
    Write-Host "  2. Test WebACL in COUNT mode first (24-48 hours)"
    Write-Host "  3. Update distribution with WebACL:"
    Write-Host "     aws cloudfront get-distribution-config --id $DistributionId > dist-config.json"
    Write-Host "     # Edit dist-config.json to add WebACLId"
    Write-Host "     aws cloudfront update-distribution --id $DistributionId --if-match <ETAG> --distribution-config file://dist-config.json"
    Write-Host "  4. Monitor CloudWatch metrics"
    Write-Host "  5. See infra/waf/README.md for detailed rollout plan"
} else {
    Write-Header "Next Steps"
    Write-Info "To plan a WebACL association, run:"
    Write-Host "  .\scripts\waf-attach-plan.ps1 -DistributionId $DistributionId -WebAclArn <arn>"
    Write-Host ""
    Write-Info "See infra/waf/README.md for:"
    Write-Host "  - Recommended allow rules"
    Write-Host "  - Phased rollout plan"
    Write-Host "  - Terraform/CloudFormation templates"
}

Write-Host ""
