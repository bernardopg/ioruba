<#
.SYNOPSIS
  Ioruba installer for Windows.

.DESCRIPTION
  Detects the architecture, downloads the matching installer from the latest
  GitHub release (or a tag passed with -Version), verifies it against
  SHA256SUMS.txt when available, and runs it.

.EXAMPLE
  irm https://raw.githubusercontent.com/bernardopg/ioruba/main/scripts/install.ps1 | iex

.EXAMPLE
  .\install.ps1 -Version v1.1.0 -Type nsis
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
function Write-Warn($msg) { Write-Host "! $msg" -ForegroundColor Yellow }

$apiBase = "https://api.github.com/repos/$Repo/releases"
$apiUrl = if ($Version -eq "latest") { "$apiBase/latest" } else { "$apiBase/tags/$Version" }

Write-Step "Querying $Repo release: $Version"
$release = Invoke-RestMethod -Uri $apiUrl -Headers @{ "User-Agent" = "ioruba-installer" }

# Architecture token used in tauri Windows asset names.
$arch = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "arm64" } else { "x64" }

function Get-Asset($pattern) {
  $release.assets | Where-Object { $_.name -match $pattern } | Select-Object -First 1
}

if ($Type -eq "msi") {
  $archPattern = "_$arch.*\.msi$"
  $anyPattern = "\.msi$"
} else {
  $archPattern = "_$arch.*setup\.exe$"
  $anyPattern = "setup\.exe$"
}
$asset = Get-Asset $archPattern
if (-not $asset) { $asset = Get-Asset $anyPattern }
if (-not $asset) { throw "No matching $Type installer found in release $Version." }

$tmp = Join-Path $env:TEMP ("ioruba-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmp | Out-Null
try {
  $installerPath = Join-Path $tmp $asset.name
  Write-Step "Downloading $($asset.name)"
  Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $installerPath

  # Verify against SHA256SUMS.txt when the release ships one.
  $sums = Get-Asset "SHA256SUMS\.txt$"
  if ($sums) {
    $sumsPath = Join-Path $tmp "SHA256SUMS.txt"
    Invoke-WebRequest -Uri $sums.browser_download_url -OutFile $sumsPath
    $line = Select-String -Path $sumsPath -Pattern ([regex]::Escape($asset.name)) | Select-Object -First 1
    if ($line) {
      $expected = ($line.Line -split '\s+')[0].ToLower()
      $actual = (Get-FileHash -Path $installerPath -Algorithm SHA256).Hash.ToLower()
      if ($expected -ne $actual) { throw "Checksum mismatch for $($asset.name)." }
      Write-Step "Checksum verified for $($asset.name)."
    } else {
      Write-Warn "No checksum entry for $($asset.name); skipping."
    }
  } else {
    Write-Warn "No SHA256SUMS.txt in this release; skipping checksum verification."
  }

  Write-Step "Running installer"
  if ($Type -eq "msi") {
    Start-Process msiexec.exe -ArgumentList "/i", "`"$installerPath`"", "/qb" -Wait
  } else {
    Start-Process $installerPath -Wait
  }
  Write-Host "✓ Ioruba installed." -ForegroundColor Green
} finally {
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
