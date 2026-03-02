param(
  [switch]$AlsoQuitDockerDesktop = $false,
  [switch]$StopTunnel = $true
)

$ErrorActionPreference = 'SilentlyContinue'

Write-Host "Stopping Aethea project..." -ForegroundColor Yellow

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

Push-Location $projectRoot
if (Get-Command docker -ErrorAction SilentlyContinue) {
  docker compose down | Out-Host
}
Pop-Location

$projectPathPattern = [Regex]::Escape($projectRoot.Path)
$nodeProcesses = Get-CimInstance Win32_Process -Filter "name = 'node.exe'" |
  Where-Object { $_.CommandLine -match $projectPathPattern }

if ($nodeProcesses) {
  $nodeProcesses | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force
  }
}

if ($StopTunnel) {
  Get-Process -Name cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
  $svc = Get-Service -Name cloudflared -ErrorAction SilentlyContinue
  if ($svc -and $svc.Status -ne 'Stopped') {
    Stop-Service -Name cloudflared -Force
  }
}

if ($AlsoQuitDockerDesktop) {
  @('Docker Desktop', 'com.docker.backend', 'com.docker.build', 'com.docker.proxy', 'vpnkit') |
    ForEach-Object {
      Get-Process -Name $_ -ErrorAction SilentlyContinue | Stop-Process -Force
    }
}

Write-Host "Project stopped." -ForegroundColor Green
