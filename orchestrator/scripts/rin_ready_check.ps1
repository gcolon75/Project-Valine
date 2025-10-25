# Windows PowerShell 5 compatible, ASCII-only (no emojis), staging-only.
# Verifies Rin bot auth, guild membership, and that all 19 guild commands are registered.

[CmdletBinding()]
param(
  [string]$AppId    = $env:STAGING_DISCORD_APPLICATION_ID,
  [string]$GuildId  = $env:STAGING_DISCORD_GUILD_ID,
  [string]$BotToken = $env:STAGING_DISCORD_BOT_TOKEN
)

# Legacy fallbacks for staging
if (-not $AppId)    { $AppId    = $env:DISCORD_APPLICATION_ID }
if (-not $GuildId)  { $GuildId  = $env:DISCORD_GUILD_ID_STAGING }
if (-not $BotToken) { $BotToken = $env:DISCORD_BOT_TOKEN }

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
# Ensure TLS 1.2 for Discord API on older Windows
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Redact($s) {
  if ([string]::IsNullOrEmpty($s)) { return "" }
  if ($s.Length -le 4) { return "***" }
  return "***" + $s.Substring($s.Length - 4)
}

if (-not $AppId -or -not $GuildId -or -not $BotToken) {
  Write-Error "Missing env. Set STAGING_DISCORD_APPLICATION_ID, STAGING_DISCORD_GUILD_ID, STAGING_DISCORD_BOT_TOKEN"
  exit 1
}

$BaseUrl = "https://discord.com/api/v10"
$Headers = @{
  "Authorization" = "Bot $BotToken"
  "Content-Type"  = "application/json"
}

Write-Host ("Rin Ready Check -- AppId: {0}  GuildId: {1}  Token: {2}" -f $AppId, $GuildId, (Redact $BotToken))

function Invoke-Discord {
  param(
    [ValidateSet("GET","POST","PATCH")] [string]$Method,
    [string]$Url,
    [object]$Body,
    [int]$TimeoutSec = 30
  )

  $json = $null
  if ($PSBoundParameters.ContainsKey("Body")) {
    if ($Body -is [string]) { $json = $Body } else { $json = ($Body | ConvertTo-Json -Depth 10) }
  }

  for ($i = 0; $i -lt 6; $i++) {
    try {
      $resp = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -Body $json -TimeoutSec $TimeoutSec -ErrorAction Stop
      $content = $resp.Content
      if ($content -and $content.Trim().Length -gt 0) {
        try {
          return ($content | ConvertFrom-Json)
        } catch {
          return $content
        }
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

# 1) Bot auth
try {
  $me = Invoke-Discord -Method GET -Url "$BaseUrl/users/@me"
  if ($me -is [string]) { throw ("Non-JSON response from /users/@me: {0}" -f $me) }
  Write-Host ("Bot: {0}  ID: {1}" -f $me.username, $me.id)
} catch {
  Write-Error ("Bot auth failed. {0}" -f $_)
  exit 1
}

# 2) Guild membership
try {
  $guilds = Invoke-Discord -Method GET -Url "$BaseUrl/users/@me/guilds"
  if ($guilds -is [string]) { throw ("Non-JSON response from /users/@me/guilds: {0}" -f $guilds) }

  $inGuild   = $false
  $guildName = ""
  foreach ($g in $guilds) {
    if ($g.id -eq $GuildId) { $inGuild = $true; $guildName = $g.name; break }
  }
  if (-not $inGuild) {
    $invite = ("https://discord.com/api/oauth2/authorize?client_id={0}" -f $AppId) + `
              "&scope=bot%20applications.commands&permissions=0"
    Write-Error ("Rin is not in guild {0}. Invite this URL: {1}" -f $GuildId, $invite)
    exit 2
  }
  Write-Host ("Guild: {0}  ({1})" -f $guildName, $GuildId)
} catch {
  Write-Error ("Failed to query guilds. {0}" -f $_)
  exit 1
}

# 3) Registered command set -- expected 19 (staging), including ux-update
$expected = @(
  "plan","approve","status","ship",
  "verify-latest","verify-run","diagnose","deploy-client",
  "set-frontend","set-api-base","agents","status-digest",
  "relay-send","relay-dm","triage","debug-last",
  "update-summary","uptime-check","ux-update"
)

try {
  $cmds = Invoke-Discord -Method GET -Url "$BaseUrl/applications/$AppId/guilds/$GuildId/commands"
  if ($cmds -is [string]) { throw ("Non-JSON response from guild commands: {0}" -f $cmds) }

  # Normalize to array
  if ($null -eq $cmds) { $cmds = @() }
  elseif ($cmds -isnot [System.Collections.IEnumerable]) { $cmds = @($cmds) }

  $names = $cmds | ForEach-Object { $_.name } | Sort-Object
  $joined = "/" + ($names -join ", /")
  Write-Host ("Registered ({0}): {1}" -f $names.Count, $joined)

  $missing = $expected | Where-Object { $_ -notin $names }
  if ($missing.Count -eq 0) {
    Write-Host "READY: All expected commands present."
    exit 0
  } else {
    Write-Warning ("Not ready -- missing: {0}" -f ($missing -join ", "))
    exit 3
  }
} catch {
  Write-Error ("Failed to list guild commands. {0}" -f $_)
  exit 1
}