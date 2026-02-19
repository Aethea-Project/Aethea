function Write-Step($message) {
  Write-Host "`n=== $message ===" -ForegroundColor Cyan
}

function Write-Info($message) {
  Write-Host $message -ForegroundColor Yellow
}

function Write-Success($message) {
  Write-Host $message -ForegroundColor Green
}

function Write-Warn($message) {
  Write-Host $message -ForegroundColor DarkYellow
}

function Ensure-DockerReady {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker CLI was not found. Install Docker Desktop and retry."
  }

  $dockerInfo = docker info 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Success "Docker daemon is ready."
    return
  }

  Write-Info "Docker Desktop is not running. Starting it automatically..."

  $candidatePaths = @(
    "C:\Program Files\Docker\Docker\Docker Desktop.exe",
    "C:\Program Files\Docker\Docker\Docker Desktop Launcher.exe",
    "$env:LOCALAPPDATA\Programs\Docker\Docker\Docker Desktop.exe"
  )

  $dockerDesktopPath = $candidatePaths | Where-Object { Test-Path $_ } | Select-Object -First 1

  if ($dockerDesktopPath) {
    Start-Process $dockerDesktopPath
  } else {
    Start-Process "Docker Desktop" -ErrorAction SilentlyContinue
  }

  $retries = 18
  for ($i = 0; $i -lt $retries; $i++) {
    Start-Sleep -Seconds 5
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
      Write-Success "Docker daemon is ready."
      return
    }
    Write-Info "Waiting for Docker daemon... ($($i + 1)/$retries)"
  }

  throw "Docker daemon did not become ready in time. Open Docker Desktop manually then rerun setup."
}

function Ensure-CloudflaredInstalled {
  if (Get-Command cloudflared -ErrorAction SilentlyContinue) {
    Write-Success "cloudflared is already installed."
    return
  }

  Write-Info "cloudflared is not installed. Installing via winget..."
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw "cloudflared is missing and winget is not available. Install cloudflared manually from Cloudflare docs."
  }

  winget install --id Cloudflare.cloudflared -e --accept-source-agreements --accept-package-agreements
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to install cloudflared using winget."
  }

  if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    throw "cloudflared installation finished but command is not available yet. Restart terminal and rerun setup."
  }

  Write-Success "cloudflared installed successfully."
}
