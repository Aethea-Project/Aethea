param(
  [switch]$Production = $false,
  [switch]$WithTools = $false,
  [switch]$StartTunnel = $false,
  [switch]$DevMode = $false
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot "common.ps1")

Write-Host "Starting Aethea dev/server stack..." -ForegroundColor Yellow

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $projectRoot

try {
  # 1) Check Docker availability
  Write-Step "Checking Docker"
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker CLI not found. Please install Docker Desktop."
  }

  # 2) Ensure Docker daemon is ready
  Ensure-DockerReady
  Write-Success "Docker is running."

  # 3) Start Docker Compose stack
  Write-Step "Starting Docker Compose services"
  
  if ($DevMode) {
    Write-Info "Dev mode: Starting services in watch mode..."
    Write-Info "Backend will run on http://localhost:3001"
    Write-Info "Web will run on http://localhost:5173"
    Write-Info "Press Ctrl+C to stop."
    
    # Start backend and web dev servers
    $backendJob = Start-Job -ScriptBlock {
      Set-Location $using:projectRoot
      Push-Location backend
      npm run dev
      Pop-Location
    }
    
    $webJob = Start-Job -ScriptBlock {
      Set-Location $using:projectRoot
      Push-Location web
      npm run dev
      Pop-Location
    }
    
    Write-Success "Dev servers started in background jobs."
    Write-Host "`nTo view backend logs: Receive-Job $($backendJob.Id) -Keep"
    Write-Host "To view web logs: Receive-Job $($webJob.Id) -Keep"
    Write-Host "To stop: Get-Job | Stop-Job; Get-Job | Remove-Job"
    
  } else {
    # Docker Compose mode
    $composeArgs = @("compose", "up", "-d")
    
    if ($Production) {
      $composeArgs += @("--profile", "prod")
      Write-Info "Starting with production profile..."
    }
    
    if ($WithTools) {
      $composeArgs += @("--profile", "tools")
      Write-Info "Starting with tools profile (pgAdmin, RedisInsight, MailHog)..."
    }
    
    & docker $composeArgs
    
    if ($LASTEXITCODE -ne 0) {
      throw "Docker Compose failed to start services."
    }
    
    Write-Success "Docker Compose services started successfully."

    # Apply database migrations after backend is up
    Write-Step "Applying database migrations"
    & docker compose exec -T backend npx prisma migrate deploy
    if ($LASTEXITCODE -ne 0) {
      throw "Prisma migration failed."
    }
    Write-Success "Database migrations applied successfully."
    
    # 4) Wait for services to be healthy
    Write-Step "Checking service health"
    Write-Info "Waiting for services to be ready (15s)..."
    Start-Sleep -Seconds 15
    
    # Check running containers
    $containers = docker compose ps --format json | ConvertFrom-Json
    Write-Host "`nRunning containers:"
    $containers | ForEach-Object {
      Write-Host "  - $($_.Name) [$($_.State)]" -ForegroundColor $(if ($_.State -eq 'running') { 'Green' } else { 'Yellow' })
    }
  }

  # 5) Optional: Start Cloudflare Tunnel
  if ($StartTunnel) {
    Write-Step "Starting Cloudflare Tunnel"
    $cloudflaredSvc = Get-Service -Name cloudflared -ErrorAction SilentlyContinue
    if ($cloudflaredSvc) {
      if ($cloudflaredSvc.Status -ne 'Running') {
        Start-Service -Name cloudflared
        Write-Success "Cloudflare Tunnel service started."
      } else {
        Write-Info "Cloudflare Tunnel service already running."
      }
    } else {
      Write-Info "Cloudflare Tunnel service not installed. Skipping."
    }
  }

  # 6) Show access URLs
  Write-Step "Services Ready"
  
  if ($DevMode) {
    Write-Host "`nFrontend (Dev):  http://localhost:5173" -ForegroundColor Green
    Write-Host "Backend API (Dev): http://localhost:3001" -ForegroundColor Green
  } else {
    Write-Host "`nFrontend:  http://localhost:80" -ForegroundColor Green
    Write-Host "Backend API: http://localhost:3001" -ForegroundColor Green
    Write-Host "Health Check: http://localhost:3001/health" -ForegroundColor Green
    
    if ($WithTools) {
      Write-Host "`nTools:" -ForegroundColor Cyan
      Write-Host "  - pgAdmin:      http://localhost:5050 (admin@aethea.local / admin123)" -ForegroundColor Gray
      Write-Host "  - RedisInsight: http://localhost:8001" -ForegroundColor Gray
      Write-Host "  - MailHog:      http://localhost:8025" -ForegroundColor Gray
    }
  }
  
  if ($StartTunnel) {
    Write-Host "`nCloudflare Tunnel: Check tunnel URL in cloudflared logs" -ForegroundColor Magenta
  }
  
  Write-Host "`nAethea stack is running!" -ForegroundColor Yellow
  Write-Host "To stop: npm run docker:down (or .\scripts\pause-server.ps1)" -ForegroundColor Cyan
  
  if ($DevMode) {
    Write-Host "`nDev mode tips:" -ForegroundColor Yellow
    Write-Host "- Web auto-reloads on file changes (Vite HMR)" -ForegroundColor Gray
    Write-Host "- Backend auto-restarts on file changes (tsx watch)" -ForegroundColor Gray
    Write-Host "- Use Get-Job to see running dev servers" -ForegroundColor Gray
  }

} catch {
  Write-Host "`nError: $_" -ForegroundColor Red
  exit 1
} finally {
  Pop-Location
}
