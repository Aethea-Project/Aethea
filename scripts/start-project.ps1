param(
  [switch]$Production = $false,
  [switch]$WithTools = $false,
  [switch]$DevMode = $false,
  [switch]$StartTunnel = $false,
  [switch]$NoTunnel = $false
)

$ErrorActionPreference = 'Stop'

function Assert-DockerReady {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker CLI was not found. Install Docker Desktop and retry."
  }

  docker info 2>&1 | Out-Null
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

function Get-EnvFileValue {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [string]$ProjectRoot
  )

  $envFilePath = Join-Path $ProjectRoot ".env"
  if (-not (Test-Path $envFilePath)) {
    return $null
  }

  $line = Get-Content $envFilePath |
    Where-Object { $_ -match "^\s*$Name\s*=" } |
    Select-Object -First 1

  if ([string]::IsNullOrWhiteSpace($line)) {
    return $null
  }

  $parts = $line.Split('=', 2)
  if ($parts.Length -lt 2) {
    return $null
  }

  return $parts[1].Trim()
}

function Get-BackendHostPort {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectRoot
  )

  $fromProcess = [Environment]::GetEnvironmentVariable('BACKEND_PORT')
  if (-not [string]::IsNullOrWhiteSpace($fromProcess)) {
    return $fromProcess.Trim()
  }

  $fromEnvFile = Get-EnvFileValue -Name 'BACKEND_PORT' -ProjectRoot $ProjectRoot
  if (-not [string]::IsNullOrWhiteSpace($fromEnvFile)) {
    return $fromEnvFile
  }

  return '3001'
}

function Test-PortExcluded {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  $excludedRanges = netsh interface ipv4 show excludedportrange protocol=tcp 2>$null
  if ($LASTEXITCODE -ne 0 -or -not $excludedRanges) {
    return $false
  }

  foreach ($line in $excludedRanges) {
    if ($line -match '^\s*(\d+)\s+(\d+)\s*(\*?)\s*$') {
      $start = [int]$matches[1]
      $end = [int]$matches[2]
      if ($Port -ge $start -and $Port -le $end) {
        return $true
      }
    }
  }

  return $false
}

function Get-PortOwnerPid {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  $matches = netstat -ano | Select-String ":$Port"
  if (-not $matches) {
    return $null
  }

  foreach ($item in $matches) {
    $line = $item.Line.Trim()
    $parts = ($line -split '\s+')
    if ($parts.Length -ge 5) {
      $localAddress = $parts[1]
      $ownerPid = $parts[-1]
      if ($localAddress -match ":$Port$" -and $ownerPid -match '^\d+$') {
        return [int]$ownerPid
      }
    }
  }

  return $null
}

function Test-TunnelRunning {
  $containerId = docker ps --filter "name=aethea-tunnel" --filter "status=running" -q
  return ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($containerId))
}

Write-Host "Starting Aethea project..." -ForegroundColor Yellow

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$backendHostPortRaw = Get-BackendHostPort -ProjectRoot $projectRoot
$backendHostPort = [int]$backendHostPortRaw
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
  Assert-DockerReady

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
    if (Test-PortExcluded -Port $backendHostPort) {
      throw "Host port $backendHostPort is reserved by Windows (excluded port range). Change BACKEND_PORT in .env to a fixed free port (e.g. 3101), then retry."
    }

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
      $composeArgs += @("redis", "backend-prod", "web-prod")
      if ($shouldStartTunnel)  { $composeArgs += "cloudflared" }
      if ($WithTools)    { $composeArgs += @("pgadmin", "redisinsight", "mailhog") }
    }

    & docker $composeArgs
    if ($LASTEXITCODE -ne 0) {
      throw "Docker compose failed to start."
    }

    Write-Host "Waiting for services to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15

    $migrationService = if ($Production) { 'backend-prod' } else { 'backend' }
    $migrationScript = {
      param($serviceName, $rootPath)
      Set-Location $rootPath
      $output = & docker compose exec -T $serviceName npx prisma migrate deploy 2>&1
      [pscustomobject]@{
        ExitCode = $LASTEXITCODE
        Output   = ($output | Out-String)
      }
    }

    $migrationJob = Start-Job -ScriptBlock $migrationScript -ArgumentList $migrationService, $projectRoot.Path
    $jobCompleted = Wait-Job $migrationJob -Timeout 90

    if (-not $jobCompleted) {
      Stop-Job $migrationJob -ErrorAction SilentlyContinue
      Remove-Job $migrationJob -Force -ErrorAction SilentlyContinue
      Write-Host "Migration check timed out after 90s. Continuing startup (you can run migrations manually later)." -ForegroundColor Yellow
    } else {
      $migrationResult = Receive-Job $migrationJob
      Remove-Job $migrationJob -Force -ErrorAction SilentlyContinue

      if ($migrationResult.ExitCode -ne 0) {
        Write-Host $migrationResult.Output -ForegroundColor Yellow
        Write-Host "Migration step failed, but services are running. Run 'npm run docker:prisma:migrate' when ready." -ForegroundColor Yellow
      } else {
        if ($migrationResult.Output -match 'No pending migrations to apply') {
          Write-Host "Database migrations are up to date." -ForegroundColor DarkGray
        } else {
          Write-Host "Database migrations applied successfully." -ForegroundColor Green
        }
      }
    }

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
      Write-Host "Backend URL:   http://localhost:$backendHostPort" -ForegroundColor Green
      Write-Host "Health URL:    http://localhost:$backendHostPort/health" -ForegroundColor Green
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
