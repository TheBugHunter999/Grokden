#Requires -Version 5.1
<#
.SYNOPSIS
  Fix the Grokden desktop shortcut icon on Windows.

.DESCRIPTION
  Windows often keeps the old shortcut icon even after reinstalling.
  This script removes stale shortcuts, rebuilds them using icon.ico,
  and refreshes the shell icon cache.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Test-InstallDir {
    param([string]$Dir)

    if ([string]::IsNullOrWhiteSpace($Dir)) {
        return $false
    }

    $normalized = $Dir.Trim().Trim('"').TrimEnd('\')
    foreach ($exeName in @('grokden.exe', 'AetherForge.exe', 'AetherForgeTest.exe', 'aetherforge.exe')) {
        if (Test-Path -LiteralPath (Join-Path $normalized $exeName)) {
            return $true
        }
    }
    return $false
}

function Get-RegistryInstallDir {
    param([string]$KeyPath)

    if (-not (Test-Path -LiteralPath $KeyPath)) {
        return $null
    }

    $props = Get-ItemProperty -LiteralPath $KeyPath -ErrorAction SilentlyContinue
    if (-not $props) {
        return $null
    }

    foreach ($name in @('InstallDir', 'InstallLocation', 'DisplayIcon')) {
        if (-not ($props.PSObject.Properties.Name -contains $name)) {
            continue
        }

        $value = [string]$props.$name
        if ([string]::IsNullOrWhiteSpace($value)) {
            continue
        }

        if ($name -eq 'DisplayIcon') {
            $value = $value.Trim('"')
            if ($value.EndsWith(',0')) {
                $value = $value.Substring(0, $value.Length - 2)
            }
            $value = Split-Path $value -Parent
        }

        if (Test-InstallDir $value) {
            return $value.Trim().Trim('"').TrimEnd('\')
        }
    }

    try {
        $default = (Get-Item -LiteralPath $KeyPath).GetValue('')
        if (Test-InstallDir ([string]$default)) {
            return ([string]$default).Trim().Trim('"').TrimEnd('\')
        }
    }
    catch {
        # Ignore missing default value.
    }

    return $null
}

function Get-GrokdenInstallDir {
    $registryKeys = @(
        'HKCU:\Software\Grokden\Grokden',
        'HKLM:\Software\Grokden\Grokden',
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Grokden',
        'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Grokden',
        'HKCU:\Software\AetherForge\AetherForge',
        'HKLM:\Software\AetherForge\AetherForge',
        'HKCU:\Software\AetherForge\AetherForgeTest',
        'HKLM:\Software\AetherForge\AetherForgeTest',
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\AetherForge',
        'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\AetherForge',
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\AetherForgeTest',
        'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\AetherForgeTest'
    )

    foreach ($key in $registryKeys) {
        $installDir = Get-RegistryInstallDir -KeyPath $key
        if ($installDir) {
            return $installDir
        }
    }

    $candidates = @(
        (Join-Path $env:LOCALAPPDATA 'Programs\Grokden'),
        (Join-Path $env:ProgramFiles 'Grokden'),
        (Join-Path ${env:ProgramFiles(x86)} 'Grokden'),
        (Join-Path $env:LOCALAPPDATA 'Programs\AetherForge'),
        (Join-Path $env:ProgramFiles 'AetherForge'),
        (Join-Path ${env:ProgramFiles(x86)} 'AetherForge'),
        (Join-Path $env:LOCALAPPDATA 'Programs\AetherForgeTest'),
        (Join-Path $env:ProgramFiles 'AetherForgeTest'),
        (Join-Path ${env:ProgramFiles(x86)} 'AetherForgeTest')
    )

    foreach ($dir in $candidates) {
        if (Test-InstallDir $dir) {
            return $dir
        }
    }

    throw 'Could not find Grokden install folder. Install Grokden first, then run this script again.'
}

function New-GrokdenShortcut {
    param(
        [string]$ShortcutPath,
        [string]$ExePath,
        [string]$IconPath
    )

    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($ShortcutPath)
    $shortcut.TargetPath = $ExePath
    $shortcut.WorkingDirectory = Split-Path $ExePath -Parent
    $shortcut.Description = 'Grokden'
    $shortcut.IconLocation = "$IconPath,0"
    $shortcut.Save()
}

function Clear-ShellIconCache {
    $explorerCache = Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\Explorer'
    Get-ChildItem -LiteralPath $explorerCache -Filter 'iconcache*' -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
    Get-ChildItem -LiteralPath $explorerCache -Filter 'thumbcache*' -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

    $legacyCache = Join-Path $env:LOCALAPPDATA 'IconCache.db'
    if (Test-Path -LiteralPath $legacyCache) {
        Remove-Item -LiteralPath $legacyCache -Force -ErrorAction SilentlyContinue
    }

    if (Get-Command ie4uinit.exe -ErrorAction SilentlyContinue) {
        & ie4uinit.exe -show | Out-Null
    }
}

$installDir = Get-GrokdenInstallDir
$exe = @(
    (Join-Path $installDir 'grokden.exe'),
    (Join-Path $installDir 'AetherForge.exe'),
    (Join-Path $installDir 'AetherForgeTest.exe'),
    (Join-Path $installDir 'aetherforge.exe')
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
$icon = Join-Path $installDir 'resources\icon.ico'

if ([string]::IsNullOrWhiteSpace($exe) -or -not (Test-Path -LiteralPath $exe)) {
    throw "Missing executable in install folder: $installDir"
}

if (-not (Test-Path -LiteralPath $icon)) {
    $icon = $exe
    Write-Host "Using executable icon because resources\icon.ico was not found."
}

$userDesktop = [Environment]::GetFolderPath('Desktop')
$publicDesktop = [Environment]::GetFolderPath('CommonDesktopDirectory')
$userShortcut = Join-Path $userDesktop 'Grokden.lnk'
$publicShortcut = Join-Path $publicDesktop 'Grokden.lnk'

# Keep one shortcut on the signed-in user's desktop only.
foreach ($duplicate in @($publicShortcut)) {
    if (-not (Test-Path -LiteralPath $duplicate)) {
        continue
    }

    try {
        Remove-Item -LiteralPath $duplicate -Force
        Write-Host "Removed duplicate public shortcut: $duplicate"
    }
    catch {
        Write-Warning "Could not remove $duplicate ($($_.Exception.Message)). Delete it manually if you still see two icons."
    }
}

if (Test-Path -LiteralPath $userShortcut) {
    Remove-Item -LiteralPath $userShortcut -Force
    Write-Host "Removed old shortcut: $userShortcut"
}

New-GrokdenShortcut -ShortcutPath $userShortcut -ExePath $exe -IconPath $icon
Write-Host "Created shortcut: $userShortcut"
Write-Host "  Target: $exe"
Write-Host "  Icon:   $icon"

Clear-ShellIconCache
Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
Start-Process explorer.exe

Write-Host ''
Write-Host 'Desktop shortcut icon refresh complete.'