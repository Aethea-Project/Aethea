param(
  [switch]$Production = $false,
  [switch]$WithTools = $false,
  [switch]$StartTunnel = $false,
  [switch]$DevMode = $false,
  [switch]$AlsoQuitDockerDesktop = $false
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot "common.ps1")

Write-Info "Restarting Aethea stack..."

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

try {
  Push-Location $projectRoot

  Write-Step "Stopping current stack"
  $quitDocker = $AlsoQuitDockerDesktop.IsPresent
  & (Join-Path $PSScriptRoot "pause-server.ps1") -AlsoQuitDockerDesktop:$quitDocker

  Write-Step "Starting stack"
  $startArgs = @(
    "-ExecutionPolicy", "Bypass",
    "-File", (Join-Path $PSScriptRoot "start-server.ps1")
  )

  if ($Production.IsPresent) { $startArgs += "-Production" }
  if ($WithTools.IsPresent) { $startArgs += "-WithTools" }
  if ($StartTunnel.IsPresent) { $startArgs += "-StartTunnel" }
  if ($DevMode.IsPresent) { $startArgs += "-DevMode" }

  & powershell @startArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to start stack after shutdown."
  }

  Write-Success "`nRestart completed successfully."
} catch {
  Write-Host "`nError: $_" -ForegroundColor Red
  exit 1
} finally {
  Pop-Location
}
