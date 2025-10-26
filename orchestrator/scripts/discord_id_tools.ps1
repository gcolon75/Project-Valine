param(
  [Parameter(Mandatory=$true)][string]$GitHubToken,
  [Parameter(Mandatory=$true)][string]$AppId,        # Discord Application ID (numeric)
  [Parameter(Mandatory=$true)][string]$BotToken,     # RAW bot token (no 'Bot ' prefix)
  [Parameter(Mandatory=$true)][string]$GuildId,      # Discord Guild ID to verify
  [string]$Owner = "gcolon75",
  [string]$Repo  = "Project-Valine"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Redact([string]$s, [int]$keep=4) {
  if ([string]::IsNullOrWhiteSpace($s)) { return "<empty>" }
  if ($s.Length -le $keep) { return ("*" * $s.Length) }
  return ("*" * ($s.Length - $keep)) + $s.Substring($s.Length - $keep)
}

function Invoke-Http {
  param(
    [ValidateSet("GET","POST","PUT","PATCH","DELETE")] [string]$Method,
    [string]$Url,
    [hashtable]$Headers,
    [string]$Body
  )
  try {
    if ($PSBoundParameters.ContainsKey("Body")) {
      $resp = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -Body $Body -UseBasicParsing -ErrorAction Stop
    } else {
      $resp = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -UseBasicParsing -ErrorAction Stop
    }
    $status = [int]$resp.StatusCode
    $content = $resp.Content
  } catch {
    $ex = $_.Exception
    $status = 0; $content = $ex.Message
    if ($ex.Response) {
      try {
        $status = [int]$ex.Response.StatusCode.value__
        $reader = New-Object IO.StreamReader($ex.Response.GetResponseStream())
        $content = $reader.ReadToEnd()
      } catch {}
    }
  }
  $json = $null
  if ($content -and $content.Trim().Length -gt 0) {
    try { $json = $content | ConvertFrom-Json } catch {}
  }
  [pscustomobject]@{ StatusCode=$status; Body=$content; Json=$json }
}

Write-Host "=== Repo config: variables & secrets (names only for secrets) ===`n"

$ghHeaders = @{
  "Authorization" = "token $GitHubToken"
  "Accept"        = "application/vnd.github+json"
  "User-Agent"    = "pv-verify"
}

# List variables
$varsUrl = "https://api.github.com/repos/$Owner/$Repo/actions/variables?per_page=100"
$varsResp = Invoke-Http -Method GET -Url $varsUrl -Headers $ghHeaders
if ($varsResp.StatusCode -ge 200 -and $varsResp.StatusCode -lt 300) {
  $vars = @()
  if ($varsResp.Json -and $varsResp.Json.variables) { $vars = $varsResp.Json.variables }
  Write-Host "Variables present: " + (($vars | Select-Object -ExpandProperty name) -join ", ")
} else {
  Write-Host "Failed to list variables: HTTP $($varsResp.StatusCode)"
}

# Helper to get variable value by name
function Get-RepoVar([string]$name) {
  $u = "https://api.github.com/repos/$Owner/$Repo/actions/variables/$name"
  $r = Invoke-Http -Method GET -Url $u -Headers $ghHeaders
  if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 300 -and $r.Json) {
    return $r.Json.value
  }
  return $null
}

$varAppId  = Get-RepoVar "STAGING_DISCORD_APPLICATION_ID"
$varGuild  = Get-RepoVar "STAGING_DISCORD_GUILD_ID"
$varChanId = Get-RepoVar "DISCORD_TARGET_CHANNEL_ID"

Write-Host ("STAGING_DISCORD_APPLICATION_ID = {0}" -f ($varAppId ?? "<unset>"))
Write-Host ("STAGING_DISCORD_GUILD_ID      = {0}" -f ($varGuild ?? "<unset>"))
Write-Host ("DISCORD_TARGET_CHANNEL_ID     = {0}" -f ($varChanId ?? "<unset>"))

# List secrets (names only)
$secretsUrl = "https://api.github.com/repos/$Owner/$Repo/actions/secrets?per_page=100"
$secResp = Invoke-Http -Method GET -Url $secretsUrl -Headers $ghHeaders
if ($secResp.StatusCode -ge 200 -and $secResp.StatusCode -lt 300) {
  $names = @()
  if ($secResp.Json -and $secResp.Json.secrets) { $names = $secResp.Json.secrets | Select-Object -ExpandProperty name }
  Write-Host "Secrets present (names only): " + ($names -join ", ")
  if ($names -notcontains "STAGING_DISCORD_BOT_TOKEN") {
    Write-Warning "Missing STAGING_DISCORD_BOT_TOKEN secret"
  }
} else {
  Write-Host "Failed to list secrets: HTTP $($secResp.StatusCode)"
}

Write-Host "`n=== Discord: token/app sanity ==="
$discordHeaders = @{
  "Authorization" = "Bot $BotToken"
  "Content-Type"  = "application/json"
}

$meResp = Invoke-Http -Method GET -Url "https://discord.com/api/v10/oauth2/applications/@me" -Headers $discordHeaders
if ($meResp.StatusCode -eq 200 -and $meResp.Json) {
  $appInfoId = [string]$meResp.Json.id
  $appName   = [string]$meResp.Json.name
  Write-Host ("Bot authenticated: {0} (ID: ***{1})" -f $appName, ($appInfoId.Substring([Math]::Max(0,$appInfoId.Length-4))))
  if ($appInfoId -ne $AppId) {
    Write-Error ("Token/App mismatch. Token belongs to {0}, expected {1}" -f $appInfoId, $AppId)
    exit 1
  } else {
    Write-Host "✅ Token matches provided App ID"
  }
} elseif ($meResp.StatusCode -in 401,403) {
  Write-Error ("Auth failed (HTTP {0}) — token invalid or missing scopes" -f $meResp.StatusCode)
  exit 1
} else {
  Write-Error ("Unexpected auth response: HTTP {0} Body: {1}" -f $meResp.StatusCode, $meResp.Body)
  exit 1
}

Write-Host "`n=== Discord: bot guild membership check ==="
$guildsResp = Invoke-Http -Method GET -Url "https://discord.com/api/v10/users/@me/guilds" -Headers $discordHeaders
if ($guildsResp.StatusCode -eq 200 -and $guildsResp.Json) {
  $guilds = @($guildsResp.Json)
  $inGuild = $false
  foreach ($g in $guilds) {
    if ([string]$g.id -eq $GuildId) { $inGuild = $true; $guildName = $g.name; break }
  }
  if ($inGuild) {
    Write-Host ("✅ Bot is a member of guild: {0} (ID: {1})" -f $guildName, $GuildId)
  } else {
    Write-Warning ("Bot is NOT a member of guild ID {0}. That's a guaranteed 50001 Missing Access on guild registration." -f $GuildId)
    # Show a few guilds it is in
    $preview = $guilds | Select-Object -First 5 | ForEach-Object { "$($_.name) (ID:$($_.id))" }
    if ($preview.Count -gt 0) {
      Write-Host "Bot is currently in these guilds (first 5):"
      $preview | ForEach-Object { Write-Host " - $_" }
    }
  }
} else {
  Write-Error ("Failed to list bot guilds: HTTP {0} Body: {1}" -f $guildsResp.StatusCode, $guildsResp.Body)
}

Write-Host "`n=== Discord: command endpoint access test ==="
$guildEndpoint = "https://discord.com/api/v10/applications/$AppId/guilds/$GuildId/commands"
$guildCmds = Invoke-Http -Method GET -Url $guildEndpoint -Headers $discordHeaders
if ($guildCmds.StatusCode -eq 200) {
  $count = 0
  try { $count = @($guildCmds.Json).Count } catch {}
  Write-Host ("Guild command list accessible (HTTP 200). Current count: {0}" -f $count)
} elseif ($guildCmds.StatusCode -eq 403 -and $guildCmds.Json -and $guildCmds.Json.code -eq 50001) {
  Write-Warning "Guild endpoint says: Missing Access (50001). Likely not invited with applications.commands or bot not in guild."
} else {
  Write-Host ("Guild endpoint response: HTTP {0} Body: {1}" -f $guildCmds.StatusCode, $guildCmds.Body)
}

Write-Host "`n=== Discord: global endpoint access test (optional) ==="
$globalEndpoint = "https://discord.com/api/v10/applications/$AppId/commands"
$globalCmds = Invoke-Http -Method GET -Url $globalEndpoint -Headers $discordHeaders
if ($globalCmds.StatusCode -eq 200) {
  $count = 0
  try { $count = @($globalCmds.Json).Count } catch {}
  Write-Host ("Global command list accessible (HTTP 200). Current count: {0}" -f $count)
} elseif ($globalCmds.StatusCode -eq 403) {
  Write-Warning ("Global endpoint access denied (HTTP 403). Body: {0}" -f $globalCmds.Body)
} else {
  Write-Host ("Global endpoint response: HTTP {0} Body: {1}" -f $globalCmds.StatusCode, $globalCmds.Body)
}

Write-Host "`n=== Invite URL (fix Missing Access fast) ==="
$invite = "https://discord.com/api/oauth2/authorize?client_id=$AppId&scope=bot%20applications.commands&permissions=0&guild_id=$GuildId&disable_guild_select=true"
Write-Host $invite

Write-Host "`n=== Summary ==="
Write-Host ("Repo var AppId: {0}" -f ($varAppId ?? "<unset>"))
Write-Host ("Repo var Guild : {0}" -f ($varGuild ?? "<unset>"))
Write-Host ("Secrets (names) contain STAGING_DISCORD_BOT_TOKEN: {0}" -f ($(($secResp.Json.secrets | Where-Object name -eq "STAGING_DISCORD_BOT_TOKEN").Count -gt 0)))
Write-Host ("Token↔App match: ✅")
Write-Host ("Guild membership: {0}" -f ($(if ($guildName) { "✅ ($guildName)" } else { "❌ not present" })))
Write-Host "If 'Guild membership' is ❌, open the invite URL above in your browser, authorize, then re-run the workflow in guild mode."