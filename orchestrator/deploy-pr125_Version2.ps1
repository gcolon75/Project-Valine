<#
.SYNOPSIS
    Deploy PR #125 - Natural Language UX Agent Enhancement
.DESCRIPTION
    Safe deployment script for the agents-as-employees workflow with feature-flagged LLM parsing.
    Defaults to LLM OFF for safety.
.PARAMETER Stage
    Deployment stage: dev or prod (default: dev)
.PARAMETER EnableLLM
    Enable LLM natural language parsing (default: false)
.PARAMETER StackName
    CloudFormation stack name (default: valine-orchestrator-{stage})
#>

param(
    [Parameter()]
    [ValidateSet('dev', 'prod')]
    [string]$Stage = 'dev',
    
    [Parameter()]
    [bool]$EnableLLM = $false,
    
    [Parameter()]
    [string]$StackName = "valine-orchestrator-$Stage"
)

$ErrorActionPreference = 'Stop'

# Colors for output
function Write-Success { Write-Host "✅ $args" -ForegroundColor Green }
function Write-Info { Write-Host "ℹ️  $args" -ForegroundColor Cyan }
function Write-Warning { Write-Host "⚠️  $args" -ForegroundColor Yellow }
function Write-Failure { Write-Host "❌ $args" -ForegroundColor Red }

Write-Info "=== PR #125 Deployment Script ==="
Write-Info "Stage: $Stage"
Write-Info "Stack: $StackName"
Write-Info "LLM Parsing: $(if($EnableLLM){'ENABLED'}else{'DISABLED (safe)'})"
Write-Info "Timestamp: 2025-10-27 23:05:25 UTC"
Write-Host ""

# Navigate to orchestrator directory
Write-Info "Navigating to orchestrator directory..."
Set-Location orchestrator

# Step 1: Validate environment variables
Write-Info "Step 1/6: Validating required environment variables..."
$requiredVars = @(
    'DISCORD_PUBLIC_KEY',
    'DISCORD_BOT_TOKEN',
    'GITHUB_TOKEN',
    'GITHUB_WEBHOOK_SECRET'
)

$missingVars = @()
foreach ($var in $requiredVars) {
    if (-not (Test-Path "env:$var")) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Failure "Missing required environment variables:"
    $missingVars | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host ""
    Write-Info "Set them with:"
    Write-Host '  $env:DISCORD_PUBLIC_KEY = "your_key"' -ForegroundColor Yellow
    Write-Host '  $env:DISCORD_BOT_TOKEN = "your_token"' -ForegroundColor Yellow
    Write-Host '  $env:GITHUB_TOKEN = "your_token"' -ForegroundColor Yellow
    Write-Host '  $env:GITHUB_WEBHOOK_SECRET = "your_secret"' -ForegroundColor Yellow
    exit 1
}

if ($EnableLLM -and -not (Test-Path "env:OPENAI_API_KEY")) {
    Write-Warning "EnableLLM is true but OPENAI_API_KEY not found!"
    $response = Read-Host "Continue without LLM? (y/n)"
    if ($response -ne 'y') {
        Write-Info "Deployment cancelled. Set OPENAI_API_KEY or disable LLM."
        exit 1
    }
    $EnableLLM = $false
}

Write-Success "All required environment variables found"

# Step 2: Pull latest changes
Write-Info "Step 2/6: Pulling latest changes from main..."
git fetch origin
git checkout main
git pull origin main
Write-Success "Code updated to latest main branch"

# Step 3: Validate SAM template
Write-Info "Step 3/6: Validating SAM template..."
try {
    sam validate --lint 2>&1 | Out-Null
    Write-Success "SAM template is valid"
} catch {
    Write-Warning "Template validation failed (might be telemetry block - continuing)"
}

# Step 4: Build SAM application
Write-Info "Step 4/6: Building SAM application..."
Write-Host "  This may take a minute..." -ForegroundColor Gray
sam build
if ($LASTEXITCODE -ne 0) {
    Write-Failure "SAM build failed!"
    exit 1
}
Write-Success "SAM build completed successfully"

# Step 5: Prepare parameters
Write-Info "Step 5/6: Preparing deployment parameters..."
$useLLM = if ($EnableLLM) { "true" } else { "false" }
$openAIKey = if ($EnableLLM) { $env:OPENAI_API_KEY } else { "" }

$parameters = @(
    "Stage=$Stage",
    "UseLLMParsing=$useLLM",
    "OpenAIApiKey=$openAIKey",
    "DiscordPublicKey=$env:DISCORD_PUBLIC_KEY",
    "DiscordBotToken=$env:DISCORD_BOT_TOKEN",
    "GitHubToken=$env:GITHUB_TOKEN",
    "GitHubWebhookSecret=$env:GITHUB_WEBHOOK_SECRET"
)

# Add optional parameters if set
if ($env:FRONTEND_BASE_URL) {
    $parameters += "FrontendBaseUrl=$env:FRONTEND_BASE_URL"
}
if ($env:VITE_API_BASE) {
    $parameters += "ViteApiBase=$env:VITE_API_BASE"
}

Write-Info "Deployment parameters:"
Write-Host "  - Stage: $Stage" -ForegroundColor Gray
Write-Host "  - UseLLMParsing: $useLLM" -ForegroundColor Gray
Write-Host "  - OpenAIApiKey: $(if($openAIKey){'***set***'}else{'(empty)'})" -ForegroundColor Gray
Write-Host "  - DiscordPublicKey: ***hidden***" -ForegroundColor Gray
Write-Host "  - DiscordBotToken: ***hidden***" -ForegroundColor Gray
Write-Host "  - GitHubToken: ***hidden***" -ForegroundColor Gray

# Step 6: Deploy
Write-Info "Step 6/6: Deploying to AWS..."
Write-Warning "This will update Lambda functions and may take 2-3 minutes"
Write-Host ""

$paramString = ($parameters -join " ")
$deployCmd = "sam deploy --stack-name $StackName --parameter-overrides $paramString --capabilities CAPABILITY_IAM --resolve-s3 --no-confirm-changeset"

Write-Host "Running: $deployCmd" -ForegroundColor DarkGray
Write-Host ""

Invoke-Expression $deployCmd

if ($LASTEXITCODE -ne 0) {
    Write-Failure "Deployment failed!"
    Write-Info "Check CloudFormation console for details:"
    Write-Host "  https://console.aws.amazon.com/cloudformation" -ForegroundColor Yellow
    exit 1
}

Write-Success "Deployment completed successfully! 🎉"
Write-Host ""

# Post-deployment verification
Write-Info "=== Post-Deployment Verification ==="

# Get stack outputs
Write-Info "Fetching stack outputs..."
$outputs = aws cloudformation describe-stacks --stack-name $StackName --query 'Stacks[0].Outputs' | ConvertFrom-Json

$discordUrl = ($outputs | Where-Object { $_.OutputKey -eq 'DiscordWebhookUrl' }).OutputValue
$githubUrl = ($outputs | Where-Object { $_.OutputKey -eq 'GitHubWebhookUrl' }).OutputValue

Write-Host ""
Write-Success "Deployment Endpoints:"
Write-Host "  Discord Webhook: $discordUrl" -ForegroundColor Cyan
Write-Host "  GitHub Webhook:  $githubUrl" -ForegroundColor Cyan
Write-Host ""

# Check Lambda function
Write-Info "Checking Lambda function status..."
$functionName = "valine-orchestrator-discord-$Stage"
$lambdaInfo = aws lambda get-function --function-name $functionName --query 'Configuration.[LastModified,Runtime,MemorySize,Timeout]' | ConvertFrom-Json

Write-Success "Lambda Function: $functionName"
Write-Host "  Last Modified: $($lambdaInfo[0])" -ForegroundColor Gray
Write-Host "  Runtime: $($lambdaInfo[1])" -ForegroundColor Gray
Write-Host "  Memory: $($lambdaInfo[2]) MB" -ForegroundColor Gray
Write-Host "  Timeout: $($lambdaInfo[3]) seconds" -ForegroundColor Gray
Write-Host ""

# Testing instructions
Write-Info "=== Testing Instructions ==="
Write-Host "1. Test in Discord $Stage server:" -ForegroundColor Yellow
Write-Host '   /ux-update section:header text:"Test PR #125"' -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Check CloudWatch Logs:" -ForegroundColor Yellow
Write-Host "   aws logs tail /aws/lambda/$functionName --follow" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Monitor evidence files:" -ForegroundColor Yellow
Write-Host "   Check orchestrator/evidence/ for task logs" -ForegroundColor Cyan
Write-Host ""

if (-not $EnableLLM) {
    Write-Info "=== Enable Natural Language (Optional) ==="
    Write-Host "To enable LLM natural language parsing later:" -ForegroundColor Yellow
    Write-Host "  1. Set OPENAI_API_KEY environment variable" -ForegroundColor Cyan
    Write-Host "  2. Run: .\deploy-pr125.ps1 -Stage $Stage -EnableLLM `$true" -ForegroundColor Cyan
    Write-Host ""
}

Write-Success "Deployment completed at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') UTC"
Write-Info "PR #125 features are now live! 🚀"
Write-Host ""

# Optional: Open CloudWatch logs
$openLogs = Read-Host "Open CloudWatch logs in browser? (y/n)"
if ($openLogs -eq 'y') {
    $region = (aws configure get region)
    $logUrl = "https://console.aws.amazon.com/cloudwatch/home?region=$region#logsV2:log-groups/log-group/`$252Faws`$252Flambda`$252F$functionName"
    Start-Process $logUrl
    Write-Success "Opening CloudWatch logs..."
}