<#
.SYNOPSIS
  Ioruba installer for Windows.

.DESCRIPTION
  Detects the architecture, downloads the matching installer from the latest
  GitHub release (or a tag passed with -Version), verifies it against
  SHA256SUMS.txt, and runs it. Installation fails closed if the checksum file
  or the exact asset entry is unavailable.

.EXAMPLE
  irm https://raw.githubusercontent.com/bernardopg/ioruba/main/scripts/install.ps1 | iex

.EXAMPLE
  .\install.ps1 -Version v1.8.2 -Type nsis
#>
[CmdletBinding()]
param(
  [string]$Version = "latest",
  [ValidateSet("msi", "nsis")]
  [string]$Type = "msi",
  [string]$Repo = $env:IORUBA_REPO
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrEmpty($Repo)) { $Repo = "bernardopg/ioruba" }

function Write-Step($msg) { Write-Host "▸ $msg" -ForegroundColor Cyan }

function Get-ExactChecksum([string]$Path, [string]$AssetName) {
  foreach ($line in Get-Content -Path $Path) {
    if ($line -notmatch '^([0-9a-fA-F]{64})\s+\*?(.+)$') { continue }

    $name = $Matches[2].Trim()
    if ($name.StartsWith('./')) { $name = $name.Substring(2) }
    if ($name -eq $AssetName) { return $Matches[1].ToLower() }
  }

  return $null
}

$apiBase = "https://api.github.com/repos/$Repo/releases"
$apiUrl = if ($Version -eq "latest") { "$apiBase/latest" } else { "$apiBase/tags/$Version" }

Write-Step "Querying $Repo release: $Version"
$release = Invoke-RestMethod -Uri $apiUrl -Headers @{ "User-Agent" = "ioruba-installer" }

# Architecture token used in Tauri Windows asset names. Never fall back to an
# arbitrary architecture: an x64 installer on ARM64 is not a valid substitute.
$arch = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "arm64" } else { "x64" }

function Get-Asset($pattern, [string]$Description) {
  $matches = @($release.assets | Where-Object { $_.name -match $pattern })
  if ($matches.Count -gt 1) {
    $names = ($matches | ForEach-Object { $_.name }) -join ", "
    throw "Ambiguous $Description in release $Version: $names"
  }
  if ($matches.Count -eq 1) { return $matches[0] }
  return $null
}

if ($Type -eq "msi") {
  $archPattern = "_$arch.*\.msi$"
} else {
  $archPattern = "_$arch.*setup\.exe$"
}
$asset = Get-Asset $archPattern "$arch $Type installer"
if (-not $asset) {
  $available = ($release.assets | ForEach-Object { $_.name }) -join ", "
  throw "No $arch $Type installer found in release $Version. Available assets: $available"
}

$tmp = Join-Path $env:TEMP ("ioruba-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmp | Out-Null
try {
  $installerPath = Join-Path $tmp $asset.name
  Write-Step "Downloading $($asset.name)"
  Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $installerPath

  $sums = Get-Asset "SHA256SUMS\.txt$" "checksum asset"
  if (-not $sums) {
    throw "No SHA256SUMS.txt in release $Version. Refusing to install an unverified asset."
  }

  $sumsPath = Join-Path $tmp "SHA256SUMS.txt"
  Invoke-WebRequest -Uri $sums.browser_download_url -OutFile $sumsPath
  $expected = Get-ExactChecksum -Path $sumsPath -AssetName $asset.name
  if (-not $expected) {
    throw "No checksum entry for $($asset.name). Refusing to install an unverified asset."
  }

  $actual = (Get-FileHash -Path $installerPath -Algorithm SHA256).Hash.ToLower()
  if ($expected -ne $actual) { throw "Checksum mismatch for $($asset.name)." }
  Write-Step "Checksum verified for $($asset.name)."

  Write-Step "Running installer"
  if ($Type -eq "msi") {
    $process = Start-Process msiexec.exe -ArgumentList "/i", "`"$installerPath`"", "/qb" -Wait -PassThru
  } else {
    $process = Start-Process $installerPath -Wait -PassThru
  }
  if ($process.ExitCode -notin @(0, 3010)) {
    throw "Installer exited with code $($process.ExitCode)."
  }
  Write-Host "✓ Ioruba installed." -ForegroundColor Green
} finally {
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
