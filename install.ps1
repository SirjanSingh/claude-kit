<#
.SYNOPSIS
    Installs the claude-kit skills, hooks and statusline into your Claude Code config.

.DESCRIPTION
    Copies (or links) everything under skills/ into ~/.claude/skills/, and optionally
    installs the statusline. Existing files are never silently overwritten: anything that
    would be replaced is backed up to <name>.bak-<yyyy-MM-dd> first.

.PARAMETER Link
    Create directory junctions instead of copying, so `git pull` updates your skills in
    place. Junctions do not need administrator rights on Windows.

.PARAMETER Statusline
    Also install statusline/statusline.js and point settings.json at it.

.PARAMETER Skills
    Install only the named skills instead of all of them.

.PARAMETER WhatIf
    Show what would happen without changing anything.

.EXAMPLE
    .\install.ps1
    .\install.ps1 -Link -Statusline
    .\install.ps1 -Skills wrap,codebase-map
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [switch]$Link,
    [switch]$Statusline,
    [string[]]$Skills
)

$ErrorActionPreference = 'Stop'
$repoRoot  = Split-Path -Parent $MyInvocation.MyCommand.Path
$claudeDir = Join-Path $env:USERPROFILE '.claude'
$skillsDir = Join-Path $claudeDir 'skills'
$stamp     = Get-Date -Format 'yyyy-MM-dd'

function Write-Step { param([string]$Msg) Write-Host "  $Msg" }

if (-not (Test-Path $claudeDir)) {
    throw "No Claude Code config found at $claudeDir. Install and run Claude Code once first."
}
if (-not (Test-Path $skillsDir)) {
    New-Item -ItemType Directory -Path $skillsDir -Force | Out-Null
}

# --- skills ---------------------------------------------------------------
$source = Get-ChildItem (Join-Path $repoRoot 'skills') -Directory -ErrorAction SilentlyContinue
if ($Skills) {
    $source = $source | Where-Object { $Skills -contains $_.Name }
    $missing = $Skills | Where-Object { $source.Name -notcontains $_ }
    if ($missing) { throw "No such skill(s) in this repo: $($missing -join ', ')" }
}

Write-Host ""
Write-Host "Installing $($source.Count) skill(s) into $skillsDir" -ForegroundColor Cyan

foreach ($skill in $source) {
    $target = Join-Path $skillsDir $skill.Name

    if (Test-Path $target) {
        # A junction from a previous -Link run is safe to drop; a real directory is not.
        $existing = Get-Item $target -Force
        if ($existing.LinkType) {
            if ($PSCmdlet.ShouldProcess($target, 'remove stale link')) {
                # Remove-Item on a junction deletes the link, not the target.
                [System.IO.Directory]::Delete($existing.FullName, $false)
            }
        }
        else {
            $backup = "$target.bak-$stamp"
            if ($PSCmdlet.ShouldProcess($target, "back up to $backup")) {
                if (Test-Path $backup) { Remove-Item $backup -Recurse -Force }
                Move-Item $target $backup
                Write-Step "backed up existing $($skill.Name) -> $(Split-Path $backup -Leaf)"
            }
        }
    }

    if ($Link) {
        if ($PSCmdlet.ShouldProcess($target, 'create junction')) {
            New-Item -ItemType Junction -Path $target -Target $skill.FullName | Out-Null
            Write-Step "linked  $($skill.Name)"
        }
    }
    else {
        if ($PSCmdlet.ShouldProcess($target, 'copy')) {
            Copy-Item $skill.FullName $target -Recurse
            Write-Step "copied  $($skill.Name)"
        }
    }
}

# --- statusline -----------------------------------------------------------
if ($Statusline) {
    Write-Host ""
    Write-Host "Installing statusline" -ForegroundColor Cyan

    $src = Join-Path $repoRoot 'statusline\statusline.js'
    if (-not (Test-Path $src)) { throw "statusline/statusline.js not found in repo." }

    $dest = Join-Path $claudeDir 'statusline.js'
    if (Test-Path $dest) {
        $backup = "$dest.bak-$stamp"
        if ($PSCmdlet.ShouldProcess($dest, "back up to $backup")) {
            Copy-Item $dest $backup -Force
            Write-Step "backed up existing statusline.js"
        }
    }
    if ($PSCmdlet.ShouldProcess($dest, 'install')) {
        Copy-Item $src $dest -Force
        Write-Step "installed statusline.js"
    }

    $settingsPath = Join-Path $claudeDir 'settings.json'
    if (Test-Path $settingsPath) {
        if ($PSCmdlet.ShouldProcess($settingsPath, 'point statusLine at statusline.js')) {
            Copy-Item $settingsPath "$settingsPath.bak-$stamp" -Force
            $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json
            $cmd = "node `"$dest`""
            $line = [PSCustomObject]@{ type = 'command'; command = $cmd }
            if ($settings.PSObject.Properties.Name -contains 'statusLine') {
                $settings.statusLine = $line
            }
            else {
                $settings | Add-Member -NotePropertyName statusLine -NotePropertyValue $line
            }
            $settings | ConvertTo-Json -Depth 32 | Set-Content $settingsPath -Encoding utf8
            Write-Step "settings.json statusLine -> $cmd"
        }
    }
    else {
        Write-Step "no settings.json found; add this yourself:"
        Write-Host '      "statusLine": { "type": "command", "command": "node \"~/.claude/statusline.js\"" }'
    }
}

Write-Host ""
Write-Host "Done. Restart Claude Code (or run /doctor) to pick up the changes." -ForegroundColor Green
if (-not $Statusline) {
    Write-Host "Tip: re-run with -Statusline to install the usage-aware status line too."
}
