# Windows PowerShell 5 compatible. ASCII only.
# Rin (staging) — Check env, verify bot & guild, list commands, optional safe upsert registration.

[CmdletBinding()]
param(
  [switch]$Register,                         # If set, upsert missing/updated commands
  [string]$AppId    = $env:STAGING_DISCORD_APPLICATION_ID,
  [string]$GuildId  = $env:STAGING_DISCORD_GUILD_ID,
  [string]$BotToken = $env:STAGING_DISCORD_BOT_TOKEN
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Fallbacks for legacy names (staging-first)
if (-not $AppId)    { $AppId    = $env:DISCORD_APPLICATION_ID }
if (-not $GuildId)  { $GuildId  = $env:STAGING_GUILD_ID }
if (-not $GuildId)  { $GuildId  = $env:DISCORD_GUILD_ID_STAGING }
if (-not $BotToken) { $BotToken = $env:DISCORD_BOT_TOKEN }

function Redact($s) {
  if ([string]::IsNullOrEmpty($s)) { return "" }
  if ($s.Length -le 4) { return "***" }
  return "***" + $s.Substring($s.Length - 4)
}
function Read-PlainSecret($prompt = "Enter STAGING_DISCORD_BOT_TOKEN") {
  $sec = Read-Host -AsSecureString -Prompt $prompt
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

# Prompt for token if still missing
if (-not $BotToken) {
  $BotToken = Read-PlainSecret
}

if (-not $AppId -or -not $GuildId -or -not $BotToken) {
  Write-Error "Missing env. Need STAGING_DISCORD_APPLICATION_ID, STAGING_DISCORD_GUILD_ID, STAGING_DISCORD_BOT_TOKEN (or STAGING_GUILD_ID, DISCORD_* fallbacks)."
  exit 1
}

$BaseUrl = "https://discord.com/api/v10"
$Headers = @{
  "Authorization" = "Bot $BotToken"
  "Content-Type"  = "application/json"
}

Write-Host ("Rin (staging) -- AppId:{0}  GuildId:{1}  Token:{2}" -f $AppId, $GuildId, (Redact $BotToken))

function Invoke-Discord {
  param(
    [ValidateSet("GET","POST","PATCH","PUT","DELETE")] [string]$Method,
    [string]$Url,
    [object]$Body,
    [int]$TimeoutSec = 30
  )
  $json = $null
  if ($PSBoundParameters.ContainsKey("Body")) {
    if ($Body -is [string]) { $json = $Body } else { $json = ($Body | ConvertTo-Json -Depth 20) }
  }

  for ($i = 0; $i -lt 6; $i++) {
    try {
      $resp = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -Body $json -TimeoutSec $TimeoutSec -ErrorAction Stop
      $content = $resp.Content
      if ($content -and $content.Trim().Length -gt 0) {
        try { return ($content | ConvertFrom-Json) } catch { return $content }
      } else {
        return $null
      }
    } catch {
      $ex = $_.Exception
      $statusCode = $null
      if ($ex.Response) { $statusCode = $ex.Response.StatusCode.value__ }
      if ($statusCode -eq 429) {
        $retryAfter = 1
        try {
          $raw = (New-Object IO.StreamReader($ex.Response.GetResponseStream())).ReadToEnd()
          $obj = $raw | ConvertFrom-Json
          if ($obj.retry_after) { $retryAfter = [int][math]::Ceiling([double]$obj.retry_after) }
        } catch {}
        Start-Sleep -Seconds $retryAfter
        continue
      } else {
        throw
      }
    }
  }
  throw ("Rate limited too many times: {0} {1}" -f $Method, $Url)
}

function Get-BotInfo {
  return Invoke-Discord -Method GET -Url "$BaseUrl/users/@me"
}
function Get-Guilds {
  return Invoke-Discord -Method GET -Url "$BaseUrl/users/@me/guilds"
}
function Get-GuildCommands {
  param([string]$AppId,[string]$GuildId)
  return Invoke-Discord -Method GET -Url "$BaseUrl/applications/$AppId/guilds/$GuildId/commands"
}
function Upsert-Command {
  param([string]$AppId,[string]$GuildId,[hashtable]$Cmd,[array]$Existing)
  $name = $Cmd.name
  $match = $null
  foreach ($c in $Existing) { if ($c.name -eq $name) { $match = $c; break } }
  if ($match -and $match.id) {
    $url = "$BaseUrl/applications/$AppId/guilds/$GuildId/commands/$($match.id)"
    $null = Invoke-Discord -Method PATCH -Url $url -Body $Cmd
    return "patched"
  } else {
    $url = "$BaseUrl/applications/$AppId/guilds/$GuildId/commands"
    $null = Invoke-Discord -Method POST -Url $url -Body $Cmd
    return "created"
  }
}

# Target command set (19), aligned with tests and /ux-update spec
function Get-TargetCommands {
  $status = @{
    name="status"; type=1; description="Show recent workflow runs";
    options=@(@{ name="count"; description="Number of runs (1-3)"; type=4; required=$false; min_value=1; max_value=3 })
  }
  $triage = @{
    name="triage"; type=1; description="Analyze a PR with triage agents";
    options=@(
      @{ name="pr"; description="Pull Request number"; type=4; required=$true },
      @{ name="create_pr"; description="Create draft fix PR"; type=5; required=$false }
    )
  }
  $ux = @{
    name="ux-update"; type=1; description="Interactive UX/UI updates with confirmation";
    options=@(
      @{ name="command"; description="Structured command"; type=3; required=$false },
      @{ name="description"; description="Plain English description"; type=3; required=$false },
      @{ name="conversation_id"; description="Conversation ID"; type=3; required=$false },
      @{ name="confirm"; description="Confirmation: yes/no/modify"; type=3; required=$false }
    )
  }
  return @(
    @{ name="plan"; type=1; description="Create a daily plan from ready issues" },
    @{ name="approve"; type=1; description="Approve and start execution of a plan" },
    $status,
    @{ name="ship"; type=1; description="Finalize and ship a completed run" },
    @{ name="verify-latest"; type=1; description="Verify latest deployment health" },
    @{ name="verify-run"; type=1; description="Verify a specific workflow run" },
    @{ name="diagnose"; type=1; description="Run a quick staging diagnostic" },
    @{ name="deploy-client"; type=1; description="Trigger client deploy workflow" },
    @{ name="set-frontend"; type=1; description="Set frontend base URL" },
    @{ name="set-api-base"; type=1; description="Set API base URL" },
    @{ name="agents"; type=1; description="List available agents" },
    @{ name="status-digest"; type=1; description="Post status digest" },
    @{ name="relay-send"; type=1; description="Relay message to channel (with audit)" },
    @{ name="relay-dm"; type=1; description="Relay message via DM (with audit)" },
    $triage,
    @{ name="debug-last"; type=1; description="Show last run debug info (redacted)" },
    @{ name="update-summary"; type=1; description="Update project summary" },
    @{ name="uptime-check"; type=1; description="Run uptime health check" },
    $ux
  )
}

# 1) Bot auth
try {
  $me = Get-BotInfo
  if ($me -is [string]) { throw ("Non-JSON response from /users/@me: {0}" -f $me) }
  Write-Host ("Bot: @{0}  ID: {1}" -f $me.username, $me.id)
} catch {
  Write-Error ("Bot auth failed. {0}" -f $_)
  exit 1
}

# 2) Guild membership
try {
  $guilds = Get-Guilds
  if ($guilds -is [string]) { throw ("Non-JSON response from /users/@me/guilds: {0}" -f $guilds) }
  $inGuild = $false; $guildName = ""
  foreach ($g in $guilds) { if ($g.id -eq $GuildId) { $inGuild = $true; $guildName = $g.name; break } }
  if (-not $inGuild) {
    $invite = ("https://discord.com/api/oauth2/authorize?client_id={0}" -f $AppId) + "&scope=bot%20applications.commands&permissions=0"
    Write-Error ("Rin is not in guild {0}. Invite with: {1}" -f $GuildId, $invite)
    exit 2
  }
  Write-Host ("Guild: {0}  ({1})" -f $guildName, $GuildId)
} catch {
  Write-Error ("Failed to query guilds. {0}" -f $_)
  exit 1
}

# 3) Check registered commands
$expected = @(
  "plan","approve","status","ship","verify-latest","verify-run","diagnose","deploy-client",
  "set-frontend","set-api-base","agents","status-digest","relay-send","relay-dm",
  "triage","debug-last","update-summary","uptime-check","ux-update"
)

try {
  $existing = Get-GuildCommands -AppId $AppId -GuildId $GuildId
  if ($existing -is [string]) { throw ("Non-JSON response from guild commands: {0}" -f $existing) }
  if ($null -eq $existing) { $existing = @() } elseif ($existing -isnot [System.Collections.IEnumerable]) { $existing = @($existing) }

  $names = $existing | ForEach-Object { $_.name } | Sort-Object
  $joined = "/" + ($names -join ", /")
  Write-Host ("Registered ({0}): {1}" -f $names.Count, $joined)

  $missing = $expected | Where-Object { $_ -notin $names }
  if ($missing.Count -eq 0) {
    Write-Host "READY: All expected commands present."
    if (-not $Register) { exit 0 }
  } else {
    Write-Warning ("Missing: {0}" -f ($missing -join ", "))
    if (-not $Register) {
      Write-Host "Tip: re-run with -Register to upsert missing commands."
      exit 3
    }
  }
} catch {
  Write-Error ("Failed to list guild commands. {0}" -f $_)
  exit 1
}

# 4) Upsert (only if -Register)
if ($Register) {
  $targets = Get-TargetCommands
  $results = @()
  try {
    # Refresh existing list
    $existing = Get-GuildCommands -AppId $AppId -GuildId $GuildId
    if ($null -eq $existing) { $existing = @() } elseif ($existing -isnot [System.Collections.IEnumerable]) { $existing = @($existing) }

    foreach ($cmd in $targets) {
      try {
        $action = Upsert-Command -AppId $AppId -GuildId $GuildId -Cmd $cmd -Existing $existing
        $results += [pscustomobject]@{ name=$cmd.name; action=$action; status="ok" }
        # refresh existing after upsert
        $existing = Get-GuildCommands -AppId $AppId -GuildId $GuildId
        if ($null -eq $existing) { $existing = @() } elseif ($existing -isnot [System.Collections.IEnumerable]) { $existing = @($existing) }
      } catch {
        $results += [pscustomobject]@{ name=$cmd.name; action="error"; status=$_.Exception.Message }
      }
    }

    # Evidence path: repoRoot/discord_cmd_evidence
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $repoRoot  = Resolve-Path (Join-Path $scriptDir "..\..")
    $evidDir   = Join-Path $repoRoot "discord_cmd_evidence"
    if (-not (Test-Path -LiteralPath $evidDir)) { New-Item -ItemType Directory -Path $evidDir -Force | Out-Null }
    $stamp   = (Get-Date).ToString("yyyyMMdd-HHmmss")
    $outPath = Join-Path $evidDir ("rin_upsert_{0}.json" -f $stamp)
    ($results | ConvertTo-Json -Depth 10) | Out-File -LiteralPath $outPath -Encoding utf8
    Write-Host ("Upsert complete. Evidence: {0}" -f $outPath)

    # Final list
    $final = Get-GuildCommands -AppId $AppId -GuildId $GuildId
    if ($null -eq $final) { $final = @() } elseif ($final -isnot [System.Collections.IEnumerable]) { $final = @($final) }
    $finalNames = $final | ForEach-Object { $_.name } | Sort-Object
    $joined2 = "/" + ($finalNames -join ", /")
    Write-Host ("Now registered ({0}): {1}" -f $finalNames.Count, $joined2)

    # Ready verdict
    $missing2 = $expected | Where-Object { $_ -notin $finalNames }
    if ($missing2.Count -eq 0) {
      Write-Host "READY: All expected commands present after upsert."
      exit 0
    } else {
      Write-Warning ("Still missing: {0}" -f ($missing2 -join ", "))
      exit 3
    }
  } catch {
    Write-Error ("Registration failed. {0}" -f $_)
    exit 1
  }
}