param(
  [switch]$Rebuild = $false
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
if ($Rebuild) {
  & $startScript -Build
} else {
  & $startScript
}

Write-Host "--- Refresh Complete ---" -ForegroundColor Green
