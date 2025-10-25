[CmdletBinding()]
param(
  [string]$AppId   = $env:STAGING_DISCORD_APPLICATION_ID,
  [string]$GuildId = $env:STAGING_DISCORD_GUILD_ID,
  [string]$BotToken = $env:STAGING_DISCORD_BOT_TOKEN
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Redact($s){ if([string]::IsNullOrEmpty($s)){return ""} if($s.Length -le 4){"***"}else{"***" + $s.Substring($s.Length-4)} }

if (-not $AppId)   { $AppId   = $env:DISCORD_APPLICATION_ID }
if (-not $GuildId) { $GuildId = $env:DISCORD_GUILD_ID_STAGING }
if (-not $BotToken){ $BotToken= $env:DISCORD_BOT_TOKEN }

if (-not $AppId -or -not $GuildId -or -not $BotToken) {
  Write-Error "Missing env. Set STAGING_DISCORD_APPLICATION_ID, STAGING_DISCORD_GUILD_ID, STAGING_DISCORD_BOT_TOKEN"
  exit 1
}

$BaseUrl = "https://discord.com/api/v10"
$Headers = @{
  "Authorization" = "Bot $BotToken"
  "Content-Type"  = "application/json"
}

Write-Host "Rin Verify — AppId: $AppId  GuildId: $GuildId  Token: $(Redact $BotToken)"

function Invoke-Discord {
  param([string]$Method,[string]$Url,[int]$TimeoutSec=30)
  for ($i=0; $i -lt 6; $i++) {
    try {
      return (Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -TimeoutSec $TimeoutSec -ErrorAction Stop).Content | ConvertFrom-Json
    } catch {
      $ex = $_.Exception
      if ($ex.Response -and $ex.Response.StatusCode.value__ -eq 429) {
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
  throw "Rate limited too many times: $Method $Url"
}

try {
  $me = Invoke-Discord -Method GET -Url "$BaseUrl/users/@me"
  Write-Host ("✅ Bot: @{0} (ID: {1})" -f $me.username, $me.id)
} catch {
  Write-Error "Bot auth failed. $_"; exit 1
}

try {
  $guilds = Invoke-Discord -Method GET -Url "$BaseUrl/users/@me/guilds"
  $inGuild = $false; $guildName = ""
  foreach ($g in $guilds) { if ($g.id -eq $GuildId) { $inGuild = $true; $guildName = $g.name; break } }
  if (-not $inGuild) {
    $invite = "https://discord.com/api/oauth2/authorize?client_id=$AppId&scope=bot%20applications.commands&permissions=0"
    Write-Error "Rin is not in guild $GuildId. Invite: $invite"
    exit 2
  }
  Write-Host "✅ Guild: $guildName ($GuildId)"
} catch {
  Write-Error "Failed to query guilds. $_"; exit 1
}

try {
  $cmds = Invoke-Discord -Method GET -Url "$BaseUrl/applications/$AppId/guilds/$GuildId/commands"
  $names = $cmds | ForEach-Object { $_.name } | Sort-Object
  Write-Host "🧩 Registered commands ($($names.Count)):`n  /$([string]::Join("`, /", $names))"

  $expected = @(
    "ux-update","debug-last","diagnose","status","triage",
    "plan","approve","ship","verify-latest","verify-run",
    "deploy-client","set-frontend","set-api-base","agents","status-digest",
    "relay-send","relay-dm","update-summary","uptime-check"
  )

  $missing = $expected | Where-Object { $_ -notin $names }
  if ($missing.Count -gt 0) {
    Write-Warning "Missing expected commands: $([string]::Join(', ', $missing))"
    exit 3
  } else {
    Write-Host "✅ Expected set present (19/19). GG."
  }
} catch {
  Write-Error "Failed to list guild commands. $_"; exit 1
}