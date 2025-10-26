# Windows PowerShell 5 compatible. ASCII only.
# Upserts ONLY the /ux-update command to your staging guild.
# Uses env vars:
# - STAGING_DISCORD_APPLICATION_ID  (Rin app id)
# - STAGING_GUILD_ID                (staging guild/server id)
# - STAGING_DISCORD_BOT_TOKEN       (raw token; do NOT include the word 'Bot ')

[CmdletBinding()]
param()

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Fail($m){ Write-Error $m; exit 1 }

$AppId   = $env:STAGING_DISCORD_APPLICATION_ID
$GuildId = $env:STAGING_GUILD_ID
$Token   = $env:STAGING_DISCORD_BOT_TOKEN

if (-not $AppId)   { Fail "Missing STAGING_DISCORD_APPLICATION_ID" }
if (-not $GuildId) { Fail "Missing STAGING_GUILD_ID" }
if (-not $Token)   { Fail "Missing STAGING_DISCORD_BOT_TOKEN (raw token; do NOT include 'Bot ')" }
if ($Token -match '^\s*Bot\s+') { Fail "Token includes 'Bot '. Use raw token only from Discord Developer Portal." }

$Base = "https://discord.com/api/v10"
$Headers = @{ "Authorization" = "Bot $Token"; "Content-Type" = "application/json" }

function Invoke-Discord {
  param([string]$Method,[string]$Url,[object]$Body)
  $json = $null
  if ($PSBoundParameters.ContainsKey("Body")) {
    if ($Body -is [string]) { $json = $Body } else { $json = ($Body | ConvertTo-Json -Depth 20) }
  }
  for ($i=0; $i -lt 6; $i++) {
    try {
      $resp = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -Body $json -UseBasicParsing -ErrorAction Stop
      $c = $resp.Content
      if ($c -and $c.Trim().Length -gt 0) { try { return ($c | ConvertFrom-Json) } catch { return $c } } else { return $null }
    } catch {
      $ex = $_.Exception
      $code = $null
      if ($ex.Response) { $code = $ex.Response.StatusCode.value__ }
      if ($code -eq 429) {
        $retryAfter = 1
        try {
          $raw = (New-Object IO.StreamReader($ex.Response.GetResponseStream())).ReadToEnd()
          $obj = $raw | ConvertFrom-Json
          if ($obj.retry_after) { $retryAfter = [int][math]::Ceiling([double]$obj.retry_after) }
        } catch {}
        Start-Sleep -Seconds $retryAfter
        continue
      } elseif ($code -eq 401) {
        Fail "401 Unauthorized. Token invalid OR token includes 'Bot '. Use the raw token string."
      } elseif ($code -eq 403) {
        Fail "403 Forbidden. Ensure the bot is in the guild and was invited with bot + applications.commands scopes."
      } else {
        throw
      }
    }
  }
  Fail "Rate limited too many times: $Method $Url"
}

# 1) Bot auth
$me = Invoke-Discord -Method GET -Url "$Base/users/@me"
if ($me -is [string]) { Fail "Non-JSON from /users/@me: $me" }
Write-Host ("Bot OK: @{0}  ID: {1}" -f $me.username, $me.id)

# 2) Guild membership
$guilds = Invoke-Discord -Method GET -Url "$Base/users/@me/guilds"
if ($guilds -is [string]) { Fail "Non-JSON from /users/@me/guilds: $guilds" }
$inGuild = $false; $guildName = ""
foreach ($g in $guilds) { if ($g.id -eq $GuildId) { $inGuild=$true; $guildName=$g.name; break } }
if (-not $inGuild) {
  $invite = "https://discord.com/api/oauth2/authorize?client_id=$AppId&scope=bot%20applications.commands&permissions=0"
  Fail ("Bot is not in guild $GuildId. Invite with: $invite")
}
Write-Host ("Guild OK: {0} ({1})" -f $guildName, $GuildId)

# 3) Upsert /ux-update
$UxCmd = @{
  name="ux-update"; type=1;
  description="Interactive UX/UI updates with confirmation";
  options=@(
    @{ name="command"; description="Structured command"; type=3; required=$false },
    @{ name="description"; description="Plain English description"; type=3; required=$false },
    @{ name="conversation_id"; description="Conversation ID"; type=3; required=$false },
    @{ name="confirm"; description="Confirmation: yes/no/modify"; type=3; required=$false }
  )
}

$existing = Invoke-Discord -Method GET -Url "$Base/applications/$AppId/guilds/$GuildId/commands"
if ($null -eq $existing) { $existing = @() } elseif ($existing -isnot [System.Collections.IEnumerable]) { $existing = @($existing) }
$ux = $existing | Where-Object { $_.name -eq "ux-update" }

if ($ux -and $ux.id) {
  $null = Invoke-Discord -Method PATCH -Url "$Base/applications/$AppId/guilds/$GuildId/commands/$($ux.id)" -Body $UxCmd
  Write-Host "Updated /ux-update"
} else {
  $null = Invoke-Discord -Method POST -Url "$Base/applications/$AppId/guilds/$GuildId/commands" -Body $UxCmd
  Write-Host "Created /ux-update"
}

# 4) Verify
$final = Invoke-Discord -Method GET -Url "$Base/applications/$AppId/guilds/$GuildId/commands"
$names = $final | ForEach-Object { $_.name } | Sort-Object
Write-Host ("Guild commands now: /{0}" -f ($names -join ", /"))
if ($names -notcontains "ux-update") { Fail "Not ready: /ux-update missing after upsert." }