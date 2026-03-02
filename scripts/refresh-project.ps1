param(
  [switch]$Production = $false,
  [switch]$WithTools = $false,
  [switch]$DevMode = $false,
  [switch]$StartTunnel = $false,
  [switch]$AlsoQuitDockerDesktop = $false
)

$ErrorActionPreference = 'Stop'

$stopScript = Join-Path $PSScriptRoot 'stop-project.ps1'
$startScript = Join-Path $PSScriptRoot 'start-project.ps1'

Write-Host "Refreshing Aethea project..." -ForegroundColor Yellow

try {
  & powershell -ExecutionPolicy Bypass -File $stopScript -AlsoQuitDockerDesktop:$AlsoQuitDockerDesktop
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to stop project during refresh."
  }

  $startArgs = @(
    '-ExecutionPolicy', 'Bypass',
    '-File', $startScript
  )
  if ($Production)  { $startArgs += '-Production' }
  if ($WithTools)   { $startArgs += '-WithTools' }
  if ($DevMode)     { $startArgs += '-DevMode' }
  if ($StartTunnel) { $startArgs += '-StartTunnel' }

  & powershell @startArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to start project during refresh."
  }

  Write-Host "Project refreshed successfully." -ForegroundColor Green
} catch {
  Write-Host "Error: $_" -ForegroundColor Red
  exit 1
}
