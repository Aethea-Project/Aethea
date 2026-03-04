param(
  [switch]$StartServices = $false,
  [switch]$WithTools = $false,
  [switch]$DevMode = $false
)

$ErrorActionPreference = 'Stop'

function Ensure-Command($name, $installHint) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "$name is required. $installHint"
  }
}

function Ensure-DockerReady {
  Ensure-Command "docker" "Install Docker Desktop and retry."

  docker info *> $null
  if ($LASTEXITCODE -eq 0) {
    return
  }

  Write-Host "Docker Desktop is not running. Starting it..." -ForegroundColor Yellow

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

  for ($i = 0; $i -lt 18; $i++) {
    Start-Sleep -Seconds 5
    docker info *> $null
    if ($LASTEXITCODE -eq 0) {
      return
    }
  }

  throw "Docker daemon did not become ready in time. Start Docker Desktop manually and retry setup."
}

function Copy-IfMissing($sourcePath, $targetPath) {
  if (-not (Test-Path $targetPath) -and (Test-Path $sourcePath)) {
    Copy-Item $sourcePath $targetPath
    Write-Host "Created: $targetPath" -ForegroundColor Green
  }
}

Write-Host "Running Aethea team setup..." -ForegroundColor Yellow

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $projectRoot

try {
  Ensure-Command "node" "Install Node.js 24 LTS and retry."
  Ensure-Command "npm" "Install npm 11+ and retry."

  $nodeVersion = (& node -v).TrimStart('v')
  $npmVersion = (& npm -v)

  if ([version]$nodeVersion -lt [version]"24.0.0") {
    throw "Node.js 24+ is required. Detected v$nodeVersion"
  }

  if ([version]$npmVersion -lt [version]"11.0.0") {
    throw "npm 11+ is required. Detected v$npmVersion"
  }

  Write-Host "Detected Node.js v$nodeVersion" -ForegroundColor Cyan
  Write-Host "Detected npm v$npmVersion" -ForegroundColor Cyan

  Ensure-DockerReady

  Write-Host "Preparing environment files..." -ForegroundColor Yellow
  Copy-IfMissing (Join-Path $projectRoot ".env.docker.example") (Join-Path $projectRoot ".env")
  Copy-IfMissing (Join-Path $projectRoot "backend/.env.example") (Join-Path $projectRoot "backend/.env")
  Copy-IfMissing (Join-Path $projectRoot "web/.env.example") (Join-Path $projectRoot "web/.env")

  Write-Host "Installing dependencies and generating Prisma client..." -ForegroundColor Yellow
  & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "install-dependencies.ps1")
  if ($LASTEXITCODE -ne 0) {
    throw "install-dependencies.ps1 failed."
  }

  if ($StartServices) {
    Write-Host "Starting project services..." -ForegroundColor Yellow
    $startArgs = @(
      "-ExecutionPolicy", "Bypass",
      "-File", (Join-Path $PSScriptRoot "start-project.ps1")
    )

    if ($WithTools) { $startArgs += "-WithTools" }
    if ($DevMode) { $startArgs += "-DevMode" }

    & powershell @startArgs
    if ($LASTEXITCODE -ne 0) {
      throw "start-project.ps1 failed."
    }
  } else {
    Write-Host "Setup complete. Start project with: npm run start:server" -ForegroundColor Green
  }
} catch {
  Write-Host "Error: $_" -ForegroundColor Red
  exit 1
} finally {
  Pop-Location
}
