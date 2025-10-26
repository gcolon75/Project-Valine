# Windows PowerShell 5 compatible. ASCII only.
# Minimal GLOBAL slash command upsert for Rin using ONLY:
#   STAGING_DISCORD_APPLICATION_ID  (app id)
#   STAGING_DISCORD_BOT_TOKEN       (raw token; do NOT include the word "Bot")
#
# NOTE:
# - This uses the GLOBAL endpoint (applications/{app}/commands).
# - Global commands can take up to ~1 hour to appear in Discord. This is the tradeoff for simplicity.
# - If you want instant visibility later, switch to guild endpoint (needs GUILD_ID); not part of this minimal path.

[CmdletBinding()]
param(
  [string]$CommandName = "ux-update"
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Fail($m){ Write-Error $m; exit 1 }

$AppId = $env:STAGING_DISCORD_APPLICATION_ID
$Token = $env:STAGING_DISCORD_BOT_TOKEN
if (-not $AppId) { Fail "Missing STAGING_DISCORD_APPLICATION_ID" }
if (-not $Token) { Fail "Missing STAGING_DISCORD_BOT_TOKEN (raw token; do NOT include 'Bot ')" }
if ($Token -match '^\s*Bot\s+') { Fail "Token includes 'Bot '. Use raw token only." }

$Base = "https://discord.com/api/v10"
$H = @{ Authorization = "Bot $Token"; "Content-Type" = "application/json" }

function Invoke-Discord {
  param([ValidateSet("GET","POST","PATCH")] [string]$Method,[string]$Url,[object]$Body)
  $json = $null
  if ($PSBoundParameters.ContainsKey("Body")) {
    if ($Body -is [string]) { $json = $Body } else { $json = ($Body | ConvertTo-Json -Depth 20) }
  }
  try {
    $r = Invoke-WebRequest -Method $Method -Uri $Url -Headers $H -Body $json -UseBasicParsing -ErrorAction Stop
    $c = $r.Content
    if ($c -and $c.Trim().Length -gt 0) { try { return ($c | ConvertFrom-Json) } catch { return $c } }
    return $null
  } catch {
    $ex = $_.Exception
    $code = $null; $body = $null
    if ($ex.Response) {
      $code = $ex.Response.StatusCode.value__
      try { $body = (New-Object IO.StreamReader($ex.Response.GetResponseStream())).ReadToEnd() } catch {}
    }
    $codeStr = if ($code) { $code } else { "ERR" }
    $bodyStr = if ($body) { $body } else { $ex.Message }
    Fail ("HTTP {0} :: {1}" -f $codeStr, $bodyStr)
  }
}

# Define ux-update payload
$Ux = @{
  name="ux-update"; type=1;
  description="Interactive UX/UI updates with confirmation";
  options=@(
    @{ name="command"; description="Structured command"; type=3; required=$false },
    @{ name="description"; description="Plain English description"; type=3; required=$false },
    @{ name="conversation_id"; description="Conversation ID"; type=3; required=$false },
    @{ name="confirm"; description="Confirmation: yes/no/modify"; type=3; required=$false }
  )
}

# 1) Auth sanity
$me = Invoke-Discord -Method GET -Url "$Base/users/@me"
if ($me -is [string]) { Fail "Non-JSON from /users/@me" }
Write-Host ("Bot OK: @{0} (ID:{1})" -f $me.username, $me.id)

# 2) List GLOBAL commands, find existing ux-update
$existing = Invoke-Discord -Method GET -Url "$Base/applications/$AppId/commands"
if ($null -eq $existing) { $existing = @() } elseif ($existing -isnot [System.Collections.IEnumerable]) { $existing = @($existing) }
$ux = $existing | Where-Object { $_.name -eq "ux-update" }

# 3) Create or update globally
if ($ux -and $ux.id) {
  $null = Invoke-Discord -Method PATCH -Url "$Base/applications/$AppId/commands/$($ux.id)" -Body $Ux
  Write-Host "GLOBAL: Updated /ux-update"
} else {
  $null = Invoke-Discord -Method POST -Url "$Base/applications/$AppId/commands" -Body $Ux
  Write-Host "GLOBAL: Created /ux-update"
}

# 4) Final list (just to show something)
$final = Invoke-Discord -Method GET -Url "$Base/applications/$AppId/commands"
$names = $final | ForEach-Object { $_.name } | Sort-Object
Write-Host ("GLOBAL commands now: /{0}" -f ($names -join ", /"))
Write-Host "Heads-up: Global commands can take up to ~1 hour to appear in the Discord UI."
