#Requires -Version 5.1
<#
.SYNOPSIS
  Publish Grokden Windows installers to GitHub Releases.

.DESCRIPTION
  Requires GitHub CLI (gh) and an authenticated session:
    gh auth login

  Run after a successful signed release build:
    .\scripts\load-signing-env.ps1
    npm run tauri build
    .\scripts\verify-release.ps1
    .\scripts\publish-release.ps1

  Optional parameters:
    -Tag v0.1.7
    -Title "Grokden 0.1.7"
    -Draft
    -Prerelease
#>
[CmdletBinding()]
param(
    [string]$Tag,
    [string]$Title,
    [switch]$Draft,
    [switch]$Prerelease
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$SigningLoader = Join-Path $PSScriptRoot 'load-signing-env.ps1'
if (Test-Path -LiteralPath $SigningLoader) {
    . $SigningLoader
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$ConfPath = Join-Path $RepoRoot 'src-tauri\tauri.conf.json'
$Conf = Get-Content -LiteralPath $ConfPath -Raw | ConvertFrom-Json
$version = $Conf.version

if (-not $Tag) { $Tag = "v$version" }
if (-not $Title) { $Title = "Grokden $version" }

$Nsis = Join-Path $RepoRoot "src-tauri\target\release\bundle\nsis\Grokden_${version}_x64-setup.exe"
$NsisSig = "$Nsis.sig"
$Msi = Join-Path $RepoRoot "src-tauri\target\release\bundle\msi\Grokden_${version}_x64_en-US.msi"
$MsiSig = "$Msi.sig"

function Require-File {
    param([string]$Path, [string]$Hint)
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Missing file: $Path. $Hint"
    }
}

Require-File -Path $Nsis -Hint 'Run: npm run tauri build'
Require-File -Path $Msi -Hint 'Run: npm run tauri build'
Require-File -Path $NsisSig -Hint 'Set TAURI_SIGNING_PRIVATE_KEY and rebuild for updater signatures'

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw 'GitHub CLI (gh) is not installed. Install with: winget install GitHub.cli'
}

$auth = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    throw @"
Not logged in to GitHub. Run once:
  gh auth login
Choose: GitHub.com -> HTTPS -> Login with a web browser
"@
}

function Get-Sha256([string]$Path) {
    (Get-FileHash -Path $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

$nsisHash = Get-Sha256 $Nsis
$msiHash = Get-Sha256 $Msi

$releaseNotes = @"
Grokden $version - Windows desktop workspace for Grok CLI.

## What's new

- **Terminal reliability** - improved PTY output delivery, startup detection, and resize handling
- **Terminal debug tooling** - `window.__GROKDEN_TERMINAL_DEBUG__` registry for diagnosing output issues
- **Canvas & Memory Galaxy** - expanded canvas mode and cosmic memory visualization polish
- **Theme refinements** - updated palette tokens for Premium Grok, Midnight, and dark themes
- **Welcome & layout** - smoother panel transitions and refreshed welcome experience
- Signed in-app auto-updater (NSIS), parallel agents, git worktree bridge

## Requirements

Install Grok CLI before using Grokden:

**Windows (PowerShell):**
```
irm https://x.ai/cli/install.ps1 | iex
```

**macOS / Linux:**
```
curl -fsSL https://x.ai/cli/install.sh | bash
```

Grokden also needs the Microsoft Edge WebView2 runtime. The installers below install it automatically if it is missing (internet required during setup).

## Downloads

| File | Use |
|------|-----|
| Grokden_${version}_x64-setup.exe | Recommended for most users (NSIS setup wizard + auto-update) |
| Grokden_${version}_x64_en-US.msi | For IT / enterprise deployment (Windows Installer) |

## SHA-256 checksums

- NSIS: ``$nsisHash``
- MSI: ``$msiHash``

## After install

1. Launch Grokden from the Start menu.
2. Open a folder.
3. Use **Launch Grok CLI** or **Parallel Agents** from the top bar.
"@

$latestJson = @{
    version = $version
    notes = "- Terminal reliability and debug tooling`n- Canvas and Memory Galaxy polish`n- Theme and welcome refinements`n- Signed auto-updater (NSIS)"
    pub_date = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
    platforms = @{
        'windows-x86_64' = @{
            signature = (Get-Content -LiteralPath $NsisSig -Raw).Trim()
            url = "https://github.com/TheBugHunter999/Grokden/releases/download/$Tag/Grokden_${version}_x64-setup.exe"
        }
    }
} | ConvertTo-Json -Depth 5

# Tauri expects asset named exactly latest.json (releases/latest/download/latest.json)
$latestDir = Join-Path $RepoRoot 'scripts\tmp-release'
New-Item -ItemType Directory -Force -Path $latestDir | Out-Null
$latestPath = Join-Path $latestDir 'latest.json'
$notesPath = Join-Path $env:TEMP "grokden-release-notes.md"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($latestPath, $latestJson, $utf8NoBom)
[System.IO.File]::WriteAllText($notesPath, $releaseNotes, $utf8NoBom)

$assets = @($Nsis, $NsisSig, $Msi, $latestPath)
if (Test-Path -LiteralPath $MsiSig) {
    $assets = @($Nsis, $NsisSig, $Msi, $MsiSig, $latestPath)
}

$ghArgs = @('release', 'create', $Tag) + $assets + @('--title', $Title, '--notes-file', $notesPath)

if ($Draft) { $ghArgs += '--draft' }
if ($Prerelease) { $ghArgs += '--prerelease' }

Write-Host "Publishing $Tag to GitHub Releases..." -ForegroundColor Cyan
& gh @ghArgs
if ($LASTEXITCODE -ne 0) {
    throw "gh release create failed with exit code $LASTEXITCODE"
}

Write-Host ''
Write-Host "Release published: https://github.com/TheBugHunter999/Grokden/releases/tag/$Tag" -ForegroundColor Green
Write-Host "Updater manifest: https://github.com/TheBugHunter999/Grokden/releases/latest/download/latest.json" -ForegroundColor Green