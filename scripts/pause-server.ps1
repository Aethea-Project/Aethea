param(
  [switch]$AlsoQuitDockerDesktop = $true,
  [switch]$StopCloudflaredService = $true
)

$ErrorActionPreference = 'SilentlyContinue'

. (Join-Path $PSScriptRoot "common.ps1")

Write-Info "Pausing Aethea dev/server stack..."

# 1) Stop Docker Compose stack for this project
Write-Step "Stopping Docker Compose services"
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $projectRoot
if (Get-Command docker -ErrorAction SilentlyContinue) {
  docker compose down | Out-Host
  if ($LASTEXITCODE -eq 0) {
    Write-Success "Docker Compose services stopped."
  } else {
    Write-Warn "Docker Compose was not running or returned a non-zero code."
  }
} else {
  Write-Warn "Docker CLI not found. Skipping compose shutdown."
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
    Write-Success "Stopped node.exe PID $($_.ProcessId)"
  }
} else {
  Write-Warn "No project node.exe processes found."
}

# 3) Stop cloudflared processes
Write-Step "Stopping cloudflared"
$cloudflaredProcesses = Get-Process -Name cloudflared -ErrorAction SilentlyContinue
if ($cloudflaredProcesses) {
  $cloudflaredProcesses | Stop-Process -Force
  Write-Success "Stopped cloudflared process(es)."
} else {
  Write-Warn "No cloudflared process found."
}

if ($StopCloudflaredService) {
  $svc = Get-Service -Name cloudflared -ErrorAction SilentlyContinue
  if ($svc -and $svc.Status -ne 'Stopped') {
    Stop-Service -Name cloudflared -Force
    Write-Success "Stopped cloudflared Windows service."
  }
}

# 4) Optional: fully quit Docker Desktop to free more resources
if ($AlsoQuitDockerDesktop) {
  Write-Step "Stopping Docker Desktop processes"
  @('Docker Desktop','com.docker.backend','com.docker.build','com.docker.proxy','vpnkit') |
    ForEach-Object {
      Get-Process -Name $_ -ErrorAction SilentlyContinue | Stop-Process -Force
    }
  Write-Success "Docker Desktop processes stopped (if running)."
}

Write-Info "`nDone. Your local server/tunnel stack is paused."
Write-Step "Next"
Write-Info "When ready to resume: npm run docker:up (or npm run docker:tunnel for tunnel only)."
