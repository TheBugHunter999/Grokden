#Requires -Version 5.1
<#
.SYNOPSIS
  Verify Grokden release artifacts after `npm run tauri build`.

.DESCRIPTION
  Checks that NSIS and MSI installers exist under src-tauri/target/release/bundle,
  prints SHA-256 checksums for each installer, and confirms the release binary
  (grokden.exe) was produced.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$ReleaseDir = Join-Path $RepoRoot 'src-tauri\target\release'
$BundleDir = Join-Path $ReleaseDir 'bundle'
$NsisDir = Join-Path $BundleDir 'nsis'
$MsiDir = Join-Path $BundleDir 'msi'
$BinaryPath = Join-Path $ReleaseDir 'grokden.exe'

$failures = [System.Collections.Generic.List[string]]::new()

function Write-Check {
    param(
        [string]$Label,
        [bool]$Passed,
        [string]$Detail = ''
    )

    if ($Passed) {
        Write-Host "[OK]   $Label" -ForegroundColor Green
        if ($Detail) {
            Write-Host "       $Detail"
        }
    }
    else {
        Write-Host "[FAIL] $Label" -ForegroundColor Red
        if ($Detail) {
            Write-Host "       $Detail"
        }
        $script:failures.Add($Label) | Out-Null
    }
}

function Get-FileSha256 {
    param([string]$Path)
    $hash = Get-FileHash -Path $Path -Algorithm SHA256
    return $hash.Hash.ToLowerInvariant()
}

function Format-FileSize {
    param([long]$Bytes)
    if ($Bytes -ge 1MB) {
        return '{0:N2} MB' -f ($Bytes / 1MB)
    }
    if ($Bytes -ge 1KB) {
        return '{0:N2} KB' -f ($Bytes / 1KB)
    }
    return "$Bytes B"
}

Write-Host ''
Write-Host 'Grokden release verification' -ForegroundColor Cyan
Write-Host "Repository: $RepoRoot"
Write-Host ''

# Release binary
if (Test-Path -LiteralPath $BinaryPath) {
    $binaryInfo = Get-Item -LiteralPath $BinaryPath
    $binaryHash = Get-FileSha256 -Path $BinaryPath
    Write-Check -Label 'Release binary (grokden.exe)' -Passed $true -Detail (
        "Size: $(Format-FileSize $binaryInfo.Length)  SHA256: $binaryHash"
    )
}
else {
    Write-Check -Label 'Release binary (grokden.exe)' -Passed $false -Detail (
        "Expected at: src-tauri\target\release\grokden.exe. Run npm run tauri build first."
    )
}

Write-Host ''
Write-Host 'Installer bundles' -ForegroundColor Cyan

# Bundle root
if (-not (Test-Path -LiteralPath $BundleDir)) {
    Write-Check -Label 'Bundle directory' -Passed $false -Detail (
        'Expected at: src-tauri\target\release\bundle\'
    )
}
else {
    Write-Check -Label 'Bundle directory' -Passed $true
}

# NSIS installer
$nsisFiles = @()
if (Test-Path -LiteralPath $NsisDir) {
    $nsisFiles = @(Get-ChildItem -LiteralPath $NsisDir -File -Filter '*.exe' -ErrorAction SilentlyContinue)
}

if ($nsisFiles.Count -eq 0) {
    Write-Check -Label 'NSIS installer (.exe)' -Passed $false -Detail (
        'No .exe found in src-tauri\target\release\bundle\nsis\'
    )
}
else {
    foreach ($file in $nsisFiles) {
        $hash = Get-FileSha256 -Path $file.FullName
        Write-Check -Label "NSIS installer ($($file.Name))" -Passed $true -Detail (
            "Size: $(Format-FileSize $file.Length)  SHA256: $hash"
        )
    }
}

# MSI installer
$msiFiles = @()
if (Test-Path -LiteralPath $MsiDir) {
    $msiFiles = @(Get-ChildItem -LiteralPath $MsiDir -File -Filter '*.msi' -ErrorAction SilentlyContinue)
}

if ($msiFiles.Count -eq 0) {
    Write-Check -Label 'MSI installer (.msi)' -Passed $false -Detail (
        'No .msi found in src-tauri\target\release\bundle\msi\'
    )
}
else {
    foreach ($file in $msiFiles) {
        $hash = Get-FileSha256 -Path $file.FullName
        Write-Check -Label "MSI installer ($($file.Name))" -Passed $true -Detail (
            "Size: $(Format-FileSize $file.Length)  SHA256: $hash"
        )
    }
}

Write-Host ''
if ($failures.Count -eq 0) {
    Write-Host 'All release checks passed.' -ForegroundColor Green
    exit 0
}

Write-Host "$($failures.Count) check(s) failed." -ForegroundColor Red
exit 1