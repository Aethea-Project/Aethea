param(
  [switch]$Production = $false,
  [switch]$WithTools = $false,
  [switch]$DevMode = $false,
  [switch]$StartTunnel = $false,
  [switch]$NoTunnel = $false
)

$ErrorActionPreference = 'Stop'

function Ensure-DockerReady {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker CLI was not found. Install Docker Desktop and retry."
  }

  $dockerInfo = docker info 2>&1
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

  $retries = 18
  for ($i = 0; $i -lt $retries; $i++) {
    Start-Sleep -Seconds 5
    docker info *> $null
    if ($LASTEXITCODE -eq 0) {
      return
    }
  }

  throw "Docker daemon did not become ready in time."
}

function Get-BooleanEnvValue {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  $rawValue = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($rawValue)) {
    return $false
  }

  $normalized = $rawValue.Trim().ToLowerInvariant()
  return @('1', 'true', 'yes', 'y', 'on') -contains $normalized
}

function Test-TunnelRunning {
  $containerId = docker ps --filter "name=aethea-tunnel" --filter "status=running" -q
  return ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($containerId))
}

Write-Host "Starting Aethea project..." -ForegroundColor Yellow

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$autoStartTunnel = Get-BooleanEnvValue -Name "AUTO_START_TUNNEL"
$shouldStartTunnel = (-not $DevMode) -and (-not $NoTunnel)

if ($PSBoundParameters.ContainsKey('StartTunnel')) {
  $shouldStartTunnel = $StartTunnel -and (-not $NoTunnel) -and (-not $DevMode)
}

if ($autoStartTunnel -and (-not $NoTunnel) -and (-not $DevMode)) {
  $shouldStartTunnel = $true
}

if ($shouldStartTunnel -and -not $StartTunnel -and $autoStartTunnel) {
  Write-Host "AUTO_START_TUNNEL is enabled. Cloudflare tunnel will be started." -ForegroundColor Cyan
} elseif ($shouldStartTunnel -and -not $StartTunnel -and (-not $autoStartTunnel)) {
  Write-Host "Cloudflare tunnel auto-start is ON by default. Use -NoTunnel to disable it for this run." -ForegroundColor Cyan
} elseif ($NoTunnel) {
  Write-Host "Cloudflare tunnel is disabled for this run (-NoTunnel)." -ForegroundColor Yellow
}

Push-Location $projectRoot

try {
  Ensure-DockerReady

  if ($shouldStartTunnel) {
    $defaultTunnelCredPath = Join-Path $projectRoot "cloudflared/credentials/de687480-54da-4632-a55e-b3d1b4a8575d.json"
    $configuredTunnelCredPath = $env:CLOUDFLARED_CREDENTIALS_FILE
    $tunnelCredPath = if ([string]::IsNullOrWhiteSpace($configuredTunnelCredPath)) {
      $defaultTunnelCredPath
    } else {
      $configuredTunnelCredPath
    }

    if (-not (Test-Path $tunnelCredPath)) {
      throw "Cloudflare tunnel credentials not found at '$tunnelCredPath'. Set CLOUDFLARED_CREDENTIALS_FILE in .env or place credentials at '$defaultTunnelCredPath'."
    }
  }

  if ($DevMode) {
    Write-Host "Dev mode: launching backend/web watchers in separate windows..." -ForegroundColor Cyan

    # Launch as detached processes so they survive after this script exits.
    # Start-Job would be killed when the parent PowerShell session (e.g. npm) exits.
    Start-Process powershell -ArgumentList @(
      '-ExecutionPolicy', 'Bypass',
      '-NoExit',
      '-Command', "Set-Location '$($projectRoot.Path)\backend'; Write-Host 'Backend dev server' -ForegroundColor Cyan; npm run dev"
    )

    Start-Process powershell -ArgumentList @(
      '-ExecutionPolicy', 'Bypass',
      '-NoExit',
      '-Command', "Set-Location '$($projectRoot.Path)\web'; Write-Host 'Web dev server' -ForegroundColor Cyan; npm run dev"
    )

    Write-Host "Backend dev window opened." -ForegroundColor Green
    Write-Host "Web dev window opened." -ForegroundColor Green
    Write-Host "Frontend URL:  http://localhost:5173" -ForegroundColor Green
    Write-Host "Backend URL:   http://localhost:3001" -ForegroundColor Green
  } else {
    # Stop conflicting services before starting (prevents port collisions)
    if ($Production) {
      docker compose stop backend web *>$null
    } else {
      docker compose stop backend-prod web-prod *>$null
    }

    $composeArgs = @("compose")
    if ($Production) { $composeArgs += @("--profile", "prod") }
    if ($WithTools) { $composeArgs += @("--profile", "tools") }
    if ($shouldStartTunnel) { $composeArgs += @("--profile", "tunnel") }
    $composeArgs += @("up", "-d")

    # Explicitly name services to avoid starting dev+prod together
    if ($Production) {
      $composeArgs += @("postgres", "redis", "backend-prod", "web-prod")
      if ($shouldStartTunnel)  { $composeArgs += "cloudflared" }
      if ($WithTools)    { $composeArgs += @("pgadmin", "redisinsight", "mailhog") }
    }

    & docker $composeArgs
    if ($LASTEXITCODE -ne 0) {
      throw "Docker compose failed to start."
    }

    Write-Host "Waiting for services to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15

    Push-Location backend
    npx prisma migrate deploy
    if ($LASTEXITCODE -ne 0) {
      throw "Prisma migrate deploy failed."
    }
    Pop-Location

    $tunnelIsRunning = if ($shouldStartTunnel) { $true } else { Test-TunnelRunning }

    if ($tunnelIsRunning) {
      Write-Host "Frontend URL:  https://aethea.me" -ForegroundColor Green
      Write-Host "Backend URL:   https://api.aethea.me" -ForegroundColor Green
      Write-Host "Health URL:    https://api.aethea.me/health" -ForegroundColor Green
    } else {
      if ($Production) {
        Write-Host "Frontend URL:  http://localhost" -ForegroundColor Green
      } else {
        Write-Host "Frontend URL:  http://localhost:5173" -ForegroundColor Green
      }
      Write-Host "Backend URL:   http://localhost:3001" -ForegroundColor Green
      Write-Host "Health URL:    http://localhost:3001/health" -ForegroundColor Green
      Write-Host "Public tunnel is OFF. Use -StartTunnel or npm run start:server:tunnel to enable aethea.me." -ForegroundColor Yellow
    }
  }

  Write-Host "Project started successfully." -ForegroundColor Green
} catch {
  Write-Host "Error: $_" -ForegroundColor Red
  exit 1
} finally {
  Pop-Location
}
