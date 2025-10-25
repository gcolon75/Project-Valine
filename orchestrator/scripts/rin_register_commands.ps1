#Requires -Version 5.1
<#
.SYNOPSIS
    Register Discord slash commands for Rin bot (staging only) using safe guild upsert.

.DESCRIPTION
    This script registers Discord slash commands for the Rin bot in the staging guild.
    It performs safe upsert operations (no mass wipe) and handles rate limiting.
    
    Scope: STAGING ONLY - Guild commands for instant visibility
    Bot: Rin (unified orchestrator bot)
    Commands: 19 total including /ux-update

.PARAMETER CheckOnly
    Only verify authentication and list existing commands without making changes.

.PARAMETER AppId
    Discord Application ID. If not provided, reads from $env:STAGING_DISCORD_APPLICATION_ID.

.PARAMETER BotToken
    Discord Bot Token. If not provided, reads from $env:STAGING_DISCORD_BOT_TOKEN.

.PARAMETER GuildId
    Discord Guild (Server) ID. If not provided, reads from $env:STAGING_DISCORD_GUILD_ID.

.PARAMETER EvidenceDir
    Directory to save evidence JSON. Default: ./discord_cmd_evidence

.EXAMPLE
    # Check only (verify auth and list commands)
    .\rin_register_commands.ps1 -CheckOnly

.EXAMPLE
    # Register commands using environment variables
    $env:STAGING_DISCORD_APPLICATION_ID = "1428568840958251109"
    $env:STAGING_DISCORD_BOT_TOKEN = "your_token_here"
    $env:STAGING_DISCORD_GUILD_ID = "1407810581532250233"
    .\rin_register_commands.ps1

.EXAMPLE
    # Register commands with inline parameters
    .\rin_register_commands.ps1 -AppId "1428568840958251109" -BotToken "token" -GuildId "1407810581532250233"

.NOTES
    Environment Variables (in order of preference):
    - Primary: STAGING_DISCORD_APPLICATION_ID, STAGING_DISCORD_BOT_TOKEN, STAGING_DISCORD_GUILD_ID
    - Back-compat: DISCORD_APPLICATION_ID, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID_STAGING (if staging vars not set)
    
    Commands Registered:
    1. plan          - Create daily plan from GitHub issues
    2. approve       - Approve and execute a plan
    3. status        - Show workflow status (with count option)
    4. ship          - Finalize and ship a run
    5. verify-latest - Verify latest deployment
    6. verify-run    - Verify specific run
    7. diagnose      - Infrastructure diagnostics
    8. deploy-client - Trigger client deployment
    9. set-frontend  - Update frontend URL (admin)
    10. set-api-base - Update API base URL (admin)
    11. agents       - List available agents
    12. status-digest - Aggregated workflow status
    13. relay-send   - Post message to channel (admin)
    14. relay-dm     - Post as bot (admin)
    15. triage       - Auto-diagnose CI/CD failures (with pr option)
    16. debug-last   - Show debug info (feature-flagged)
    17. update-summary - Generate project summary
    18. uptime-check - Check service health
    19. ux-update    - Interactive UX updates (with command, description, conversation_id, confirm options)
#>

[CmdletBinding()]
param(
    [switch]$CheckOnly,
    
    [string]$AppId,
    
    [string]$BotToken,
    
    [string]$GuildId,
    
    [string]$EvidenceDir = "./discord_cmd_evidence"
)

# Force UTF-8 encoding for proper output
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# ============================================================================
# Helper Functions
# ============================================================================

function Redact-Token {
    param([string]$Token)
    if ([string]::IsNullOrEmpty($Token)) { return "****" }
    if ($Token.Length -le 4) { return "****" }
    return "***" + $Token.Substring($Token.Length - 4)
}

function Write-Status {
    param(
        [string]$Message,
        [ValidateSet('Info', 'Success', 'Warning', 'Error')]
        [string]$Level = 'Info'
    )
    
    $emoji = switch ($Level) {
        'Info'    { 'ℹ️' }
        'Success' { '✅' }
        'Warning' { '⚠️' }
        'Error'   { '❌' }
    }
    
    $color = switch ($Level) {
        'Info'    { 'Cyan' }
        'Success' { 'Green' }
        'Warning' { 'Yellow' }
        'Error'   { 'Red' }
    }
    
    Write-Host "$emoji $Message" -ForegroundColor $color
}

function Invoke-DiscordApiWithRetry {
    param(
        [string]$Uri,
        [string]$Method = 'GET',
        [hashtable]$Headers,
        [object]$Body,
        [int]$MaxRetries = 5
    )
    
    $retryCount = 0
    $backoffSeconds = 1
    
    while ($retryCount -lt $MaxRetries) {
        try {
            $params = @{
                Uri = $Uri
                Method = $Method
                Headers = $Headers
                ContentType = 'application/json'
                ErrorAction = 'Stop'
            }
            
            if ($Body) {
                $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress)
            }
            
            $response = Invoke-RestMethod @params
            return @{
                Success = $true
                Data = $response
                StatusCode = 200
            }
        }
        catch {
            $statusCode = $null
            if ($_.Exception.Response) {
                $statusCode = [int]$_.Exception.Response.StatusCode
            }
            
            # Handle rate limiting (429)
            if ($statusCode -eq 429) {
                $retryAfter = 1
                try {
                    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
                    if ($errorResponse.retry_after) {
                        $retryAfter = [math]::Ceiling($errorResponse.retry_after)
                    }
                }
                catch {
                    $retryAfter = $backoffSeconds
                }
                
                Write-Status "Rate limited (429). Waiting $retryAfter seconds before retry $($retryCount + 1)/$MaxRetries..." -Level Warning
                Start-Sleep -Seconds $retryAfter
                $retryCount++
                $backoffSeconds = [math]::Min($backoffSeconds * 2, 60)
                continue
            }
            
            # For other errors, return failure
            return @{
                Success = $false
                Error = $_.Exception.Message
                StatusCode = $statusCode
                Response = $_.ErrorDetails.Message
            }
        }
    }
    
    # Max retries exceeded
    return @{
        Success = $false
        Error = "Max retries ($MaxRetries) exceeded due to rate limiting"
        StatusCode = 429
    }
}

# ============================================================================
# Configuration
# ============================================================================

Write-Host "`n🎮 Rin Command Registration Tool (Staging Guild Commands)" -ForegroundColor Magenta
Write-Host "=" * 70 -ForegroundColor DarkGray
Write-Host ""

# Resolve environment variables with fallbacks
if (-not $AppId) {
    $AppId = $env:STAGING_DISCORD_APPLICATION_ID
    if (-not $AppId) {
        $AppId = $env:DISCORD_APPLICATION_ID
    }
}

if (-not $BotToken) {
    $BotToken = $env:STAGING_DISCORD_BOT_TOKEN
    if (-not $BotToken) {
        $BotToken = $env:DISCORD_BOT_TOKEN
    }
}

if (-not $GuildId) {
    $GuildId = $env:STAGING_DISCORD_GUILD_ID
    if (-not $GuildId) {
        $GuildId = $env:DISCORD_GUILD_ID_STAGING
    }
}

# Validate required parameters
if (-not $AppId) {
    Write-Status "Missing Application ID. Set one of:" -Level Error
    Write-Host "  - STAGING_DISCORD_APPLICATION_ID (preferred)" -ForegroundColor Red
    Write-Host "  - DISCORD_APPLICATION_ID (back-compat)" -ForegroundColor Red
    Write-Host "  - Or pass -AppId parameter" -ForegroundColor Red
    exit 1
}

if (-not $BotToken) {
    Write-Status "Missing Bot Token. Set one of:" -Level Error
    Write-Host "  - STAGING_DISCORD_BOT_TOKEN (preferred)" -ForegroundColor Red
    Write-Host "  - DISCORD_BOT_TOKEN (back-compat)" -ForegroundColor Red
    Write-Host "  - Or pass -BotToken parameter" -ForegroundColor Red
    exit 1
}

if (-not $GuildId) {
    Write-Status "Missing Guild ID. Set one of:" -Level Error
    Write-Host "  - STAGING_DISCORD_GUILD_ID (preferred)" -ForegroundColor Red
    Write-Host "  - DISCORD_GUILD_ID_STAGING (back-compat)" -ForegroundColor Red
    Write-Host "  - Or pass -GuildId parameter" -ForegroundColor Red
    exit 1
}

Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  App ID:    $AppId" -ForegroundColor Gray
Write-Host "  Bot Token: $(Redact-Token $BotToken)" -ForegroundColor Gray
Write-Host "  Guild ID:  $GuildId" -ForegroundColor Gray
Write-Host "  Mode:      $(if ($CheckOnly) { 'Check Only' } else { 'Register Commands' })" -ForegroundColor Gray
Write-Host ""

# Prepare evidence output
$evidencePath = Join-Path $EvidenceDir "rin_registration_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
if (-not (Test-Path $EvidenceDir)) {
    New-Item -ItemType Directory -Path $EvidenceDir -Force | Out-Null
}

$evidence = @{
    timestamp = (Get-Date).ToUniversalTime().ToString('o')
    app_id = $AppId
    guild_id = $GuildId
    mode = if ($CheckOnly) { 'check_only' } else { 'register' }
    checks = @()
    commands = @()
}

# Setup API headers
$headers = @{
    'Authorization' = "Bot $BotToken"
    'Content-Type' = 'application/json'
}

$baseUrl = "https://discord.com/api/v10"

# ============================================================================
# Step 1: Verify Bot Authentication
# ============================================================================

Write-Status "Step 1: Verifying bot authentication..." -Level Info

$authResult = Invoke-DiscordApiWithRetry -Uri "$baseUrl/users/@me" -Headers $headers

if (-not $authResult.Success) {
    Write-Status "Bot authentication failed!" -Level Error
    Write-Host "  Error: $($authResult.Error)" -ForegroundColor Red
    $evidence.checks += @{
        name = 'bot_auth'
        status = 'FAIL'
        error = $authResult.Error
    }
    $evidence | ConvertTo-Json -Depth 10 | Out-File -FilePath $evidencePath -Encoding utf8
    Write-Status "Evidence saved to: $evidencePath" -Level Info
    exit 1
}

$botInfo = $authResult.Data
Write-Status "Bot authenticated: @$($botInfo.username) (ID: $($botInfo.id))" -Level Success
$evidence.checks += @{
    name = 'bot_auth'
    status = 'PASS'
    bot_username = $botInfo.username
    bot_id = $botInfo.id
}

# ============================================================================
# Step 2: Verify Guild Membership
# ============================================================================

Write-Status "Step 2: Verifying guild membership..." -Level Info

$guildResult = Invoke-DiscordApiWithRetry -Uri "$baseUrl/guilds/$GuildId" -Headers $headers

if (-not $guildResult.Success) {
    Write-Status "Guild verification failed! Bot may not be in the server." -Level Error
    Write-Host "  Error: $($guildResult.Error)" -ForegroundColor Red
    $evidence.checks += @{
        name = 'guild_membership'
        status = 'FAIL'
        error = $guildResult.Error
    }
    $evidence | ConvertTo-Json -Depth 10 | Out-File -FilePath $evidencePath -Encoding utf8
    Write-Status "Evidence saved to: $evidencePath" -Level Info
    exit 1
}

$guildInfo = $guildResult.Data
Write-Status "Guild verified: $($guildInfo.name) (ID: $($guildInfo.id))" -Level Success
$evidence.checks += @{
    name = 'guild_membership'
    status = 'PASS'
    guild_name = $guildInfo.name
    guild_id = $guildInfo.id
}

# ============================================================================
# Step 3: List Existing Guild Commands
# ============================================================================

Write-Status "Step 3: Listing existing guild commands..." -Level Info

$listResult = Invoke-DiscordApiWithRetry -Uri "$baseUrl/applications/$AppId/guilds/$GuildId/commands" -Headers $headers

if (-not $listResult.Success) {
    Write-Status "Failed to list commands!" -Level Error
    Write-Host "  Error: $($listResult.Error)" -ForegroundColor Red
    $evidence.checks += @{
        name = 'list_commands'
        status = 'FAIL'
        error = $listResult.Error
    }
    $evidence | ConvertTo-Json -Depth 10 | Out-File -FilePath $evidencePath -Encoding utf8
    Write-Status "Evidence saved to: $evidencePath" -Level Info
    exit 1
}

$existingCommands = $listResult.Data
Write-Status "Found $($existingCommands.Count) existing commands" -Level Success

if ($existingCommands.Count -gt 0) {
    Write-Host "`nExisting commands:" -ForegroundColor Cyan
    foreach ($cmd in $existingCommands) {
        Write-Host "  - $($cmd.name) (ID: $($cmd.id))" -ForegroundColor Gray
    }
}

$evidence.checks += @{
    name = 'list_commands'
    status = 'PASS'
    existing_count = $existingCommands.Count
}

# If check-only mode, exit here
if ($CheckOnly) {
    Write-Host ""
    Write-Status "Check-only mode complete. No commands registered." -Level Success
    $evidence | ConvertTo-Json -Depth 10 | Out-File -FilePath $evidencePath -Encoding utf8
    Write-Status "Evidence saved to: $evidencePath" -Level Info
    exit 0
}

# ============================================================================
# Step 4: Define Expected Commands
# ============================================================================

Write-Host ""
Write-Status "Step 4: Preparing command definitions..." -Level Info

# Import from Python module for consistency
$pythonCode = @"
import sys
import json
sys.path.insert(0, '../')
from app.agents.discord_slash_cmd_agent import DiscordSlashCommandAgent
commands = DiscordSlashCommandAgent.DEFAULT_EXPECTED_COMMANDS
print(json.dumps(commands))
"@

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$orchestratorDir = Split-Path -Parent $scriptDir

try {
    $commandsJson = python3 -c $pythonCode 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Python script failed: $commandsJson"
    }
    $expectedCommands = $commandsJson | ConvertFrom-Json
    Write-Status "Loaded $($expectedCommands.Count) command definitions" -Level Success
}
catch {
    Write-Status "Failed to load command definitions from Python module" -Level Error
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Falling back to manual definitions..." -ForegroundColor Yellow
    
    # Fallback: manually define critical commands if Python import fails
    $expectedCommands = @(
        @{ name = "status"; description = "Show workflow status"; type = 1; options = @(@{ name = "count"; description = "Number of runs (1-3)"; type = 4; required = $false; min_value = 1; max_value = 3 }) },
        @{ name = "diagnose"; description = "Infrastructure diagnostics"; type = 1; options = @() },
        @{ name = "triage"; description = "Auto-diagnose CI/CD failures"; type = 1; options = @(@{ name = "pr"; description = "PR number or run ID"; type = 4; required = $true }) },
        @{ name = "debug-last"; description = "Show debug info"; type = 1; options = @() },
        @{ name = "ux-update"; description = "Interactive UX updates"; type = 1; options = @(
            @{ name = "command"; description = "UX command"; type = 3; required = $false },
            @{ name = "description"; description = "Plain English description"; type = 3; required = $false },
            @{ name = "conversation_id"; description = "Conversation ID"; type = 3; required = $false },
            @{ name = "confirm"; description = "Confirmation"; type = 3; required = $false }
        )}
    )
    Write-Status "Using $($expectedCommands.Count) fallback command definitions" -Level Warning
}

# ============================================================================
# Step 5: Upsert Commands (Safe, No Mass Wipe)
# ============================================================================

Write-Host ""
Write-Status "Step 5: Upserting commands (safe, no mass wipe)..." -Level Info

$registered = 0
$skipped = 0
$failed = 0

foreach ($cmd in $expectedCommands) {
    $cmdName = $cmd.name
    
    # Check if command already exists
    $existing = $existingCommands | Where-Object { $_.name -eq $cmdName }
    
    if ($existing) {
        Write-Host "  - $cmdName (already exists, updating...)" -ForegroundColor Gray -NoNewline
        $method = 'PATCH'
        $uri = "$baseUrl/applications/$AppId/guilds/$GuildId/commands/$($existing.id)"
    }
    else {
        Write-Host "  - $cmdName (new, creating...)" -ForegroundColor Cyan -NoNewline
        $method = 'POST'
        $uri = "$baseUrl/applications/$AppId/guilds/$GuildId/commands"
    }
    
    # Prepare command payload (remove null/empty fields)
    $payload = @{
        name = $cmd.name
        description = $cmd.description
        type = $cmd.type
    }
    
    if ($cmd.options -and $cmd.options.Count -gt 0) {
        $payload.options = $cmd.options
    }
    
    # Send upsert request
    $upsertResult = Invoke-DiscordApiWithRetry -Uri $uri -Method $method -Headers $headers -Body $payload
    
    if ($upsertResult.Success) {
        Write-Host " ✅" -ForegroundColor Green
        $registered++
        $evidence.commands += @{
            name = $cmdName
            status = 'SUCCESS'
            method = $method
            id = $upsertResult.Data.id
        }
    }
    else {
        Write-Host " ❌" -ForegroundColor Red
        Write-Host "    Error: $($upsertResult.Error)" -ForegroundColor Red
        $failed++
        $evidence.commands += @{
            name = $cmdName
            status = 'FAIL'
            method = $method
            error = $upsertResult.Error
        }
    }
    
    # Small delay to avoid rate limits
    Start-Sleep -Milliseconds 200
}

# ============================================================================
# Summary
# ============================================================================

Write-Host ""
Write-Host "=" * 70 -ForegroundColor DarkGray
Write-Host "Registration Summary:" -ForegroundColor Magenta
Write-Host "  Registered/Updated: $registered" -ForegroundColor Green
Write-Host "  Failed:             $failed" -ForegroundColor $(if ($failed -gt 0) { 'Red' } else { 'Gray' })
Write-Host "  Total Processed:    $($expectedCommands.Count)" -ForegroundColor Cyan

$evidence.summary = @{
    registered = $registered
    failed = $failed
    total = $expectedCommands.Count
}

# Save evidence
$evidence | ConvertTo-Json -Depth 10 | Out-File -FilePath $evidencePath -Encoding utf8
Write-Host ""
Write-Status "Evidence saved to: $evidencePath" -Level Success

# Final status
if ($failed -eq 0) {
    Write-Host ""
    Write-Status "All commands registered successfully! 🎉" -Level Success
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Go to Discord server: $($guildInfo.name)" -ForegroundColor Gray
    Write-Host "  2. Type '/' in any channel" -ForegroundColor Gray
    Write-Host "  3. Verify commands appear: /status, /triage, /ux-update, etc." -ForegroundColor Gray
    Write-Host "  4. Test: /status count:2" -ForegroundColor Gray
    Write-Host "  5. Test: /ux-update description:`"Make the navbar blue`"" -ForegroundColor Gray
    Write-Host ""
    exit 0
}
else {
    Write-Host ""
    Write-Status "Some commands failed to register. Check errors above." -Level Warning
    Write-Host ""
    exit 1
}
