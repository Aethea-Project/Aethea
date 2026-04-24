param(
  [switch]$AlsoQuitDockerDesktop = $false
)

$ErrorActionPreference = 'Stop'

Write-Host "Stopping Aethea project containers..." -ForegroundColor Yellow

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $projectRoot

try {
  # We use 'down' instead of 'stop' to clear out old container networks 
  # and ensure a fresh slate for the start script.
  docker compose down --remove-orphans
} catch {
  Write-Host "Failed to gracefully stop docker compose. $_" -ForegroundColor Yellow
} finally {
  Pop-Location
}

if ($AlsoQuitDockerDesktop) {
  Write-Host "Quitting Docker Desktop..." -ForegroundColor Yellow
  Stop-Process -Name "Docker Desktop" -Force -ErrorAction SilentlyContinue
  Stop-Process -Name "com.docker.backend" -Force -ErrorAction SilentlyContinue
}

Write-Host "Project stopped." -ForegroundColor Green
