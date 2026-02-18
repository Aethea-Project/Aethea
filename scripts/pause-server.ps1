param(
  [switch]$AlsoQuitDockerDesktop = $true,
  [switch]$StopCloudflaredService = $true
)

$ErrorActionPreference = 'SilentlyContinue'

function Write-Step($message) {
  Write-Host "`n=== $message ===" -ForegroundColor Cyan
}

Write-Host "Pausing Aethea dev/server stack..." -ForegroundColor Yellow

# 1) Stop Docker Compose stack for this project
Write-Step "Stopping Docker Compose services"
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $projectRoot
if (Get-Command docker -ErrorAction SilentlyContinue) {
  docker compose down | Out-Host
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Docker Compose services stopped." -ForegroundColor Green
  } else {
    Write-Host "Docker Compose was not running or returned a non-zero code." -ForegroundColor DarkYellow
  }
} else {
  Write-Host "Docker CLI not found. Skipping compose shutdown." -ForegroundColor DarkYellow
}
Pop-Location

# 2) Stop Node dev processes for this project only
Write-Step "Stopping project Node processes"
$projectPathPattern = [Regex]::Escape($projectRoot.Path)
$nodeProcesses = Get-CimInstance Win32_Process -Filter "name = 'node.exe'" |
  Where-Object { $_.CommandLine -match $projectPathPattern }

if ($nodeProcesses) {
  $nodeProcesses | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force
    Write-Host "Stopped node.exe PID $($_.ProcessId)" -ForegroundColor Green
  }
} else {
  Write-Host "No project node.exe processes found." -ForegroundColor DarkYellow
}

# 3) Stop cloudflared processes
Write-Step "Stopping cloudflared"
$cloudflaredProcesses = Get-Process -Name cloudflared -ErrorAction SilentlyContinue
if ($cloudflaredProcesses) {
  $cloudflaredProcesses | Stop-Process -Force
  Write-Host "Stopped cloudflared process(es)." -ForegroundColor Green
} else {
  Write-Host "No cloudflared process found." -ForegroundColor DarkYellow
}

if ($StopCloudflaredService) {
  $svc = Get-Service -Name cloudflared -ErrorAction SilentlyContinue
  if ($svc -and $svc.Status -ne 'Stopped') {
    Stop-Service -Name cloudflared -Force
    Write-Host "Stopped cloudflared Windows service." -ForegroundColor Green
  }
}

# 4) Optional: fully quit Docker Desktop to free more resources
if ($AlsoQuitDockerDesktop) {
  Write-Step "Stopping Docker Desktop processes"
  @('Docker Desktop','com.docker.backend','com.docker.build','com.docker.proxy','vpnkit') |
    ForEach-Object {
      Get-Process -Name $_ -ErrorAction SilentlyContinue | Stop-Process -Force
    }
  Write-Host "Docker Desktop processes stopped (if running)." -ForegroundColor Green
}

Write-Host "`nDone. Your local server/tunnel stack is paused." -ForegroundColor Yellow
Write-Host "When ready to resume: npm run docker:up (or npm run docker:tunnel for tunnel only)." -ForegroundColor Cyan
