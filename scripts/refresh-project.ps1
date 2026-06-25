param(
  [switch]$Rebuild = $false,
  [switch]$HardRefresh = $false
)

$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot
$stopScript = Join-Path $scriptDir "stop-project.ps1"
$startScript = Join-Path $scriptDir "start-project.ps1"

Write-Host "--- Refreshing Aethea Project ---" -ForegroundColor Cyan

# 1. Stop the project
Write-Host "Step 1: Stopping current instance..." -ForegroundColor Yellow
& $stopScript

# 2. Start the project
Write-Host "Step 2: Starting fresh instance..." -ForegroundColor Yellow
if ($HardRefresh) {
  & $startScript -HardRefresh
}
else {
  # Default to rebuilding so code changes are always picked up when refreshing
  & $startScript -Rebuild
}

Write-Host "--- Refresh Complete ---" -ForegroundColor Green
