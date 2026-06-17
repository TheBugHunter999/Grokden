#Requires -Version 5.1
<#
.SYNOPSIS
  Load Grokden Tauri updater signing environment variables.

.DESCRIPTION
  Dot-sources the local secrets file maintained outside the repo.
  See C:\Users\int_v\.grok\skills\grokden-release\SKILL.md
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$SecretsPath = Join-Path $env:USERPROFILE '.grok\secrets\grokden-tauri-signing.ps1'
if (-not (Test-Path -LiteralPath $SecretsPath)) {
    throw "Missing signing secrets: $SecretsPath"
}

. $SecretsPath

if (-not $env:TAURI_SIGNING_PRIVATE_KEY -or -not $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD) {
    throw 'Signing env incomplete after loading secrets file.'
}

Write-Host 'Loaded Grokden Tauri signing environment.' -ForegroundColor Green