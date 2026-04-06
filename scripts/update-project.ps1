param(
  [ValidateSet('all', 'backend', 'web')]
  [string]$Service = 'all',
  [switch]$Production = $false,
  [switch]$NoBuild = $false,
  [switch]$WithDeps = $false,
  [switch]$ForceRecreate = $false,
  [switch]$SkipMigrations = $false
)

$ErrorActionPreference = 'Stop'

function Assert-DockerReady {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker CLI was not found. Install Docker Desktop and retry."
  }

  docker info *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "Docker daemon is not ready. Start Docker Desktop first."
  }
}

Write-Host "Updating Aethea Docker services..." -ForegroundColor Yellow

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $projectRoot

try {
  Assert-DockerReady

  $composeArgs = @("compose")
  if ($Production) {
    $composeArgs += @("--profile", "prod")
  }

  $composeArgs += @("up", "-d")

  if (-not $NoBuild) {
    $composeArgs += "--build"
  }

  if (-not $WithDeps) {
    $composeArgs += "--no-deps"
  }

  if ($ForceRecreate) {
    $composeArgs += "--force-recreate"
  }

  $targetServices = switch ($Service) {
    'backend' { if ($Production) { @('backend-prod') } else { @('backend') } }
    'web' { if ($Production) { @('web-prod') } else { @('web') } }
    default {
      if ($Production) {
        @('backend-prod', 'web-prod')
      } else {
        @('backend', 'web')
      }
    }
  }

  $composeArgs += $targetServices

  Write-Host "Running: docker $($composeArgs -join ' ')" -ForegroundColor DarkGray
  & docker $composeArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Docker service update failed."
  }

  $shouldRunMigrations = (-not $SkipMigrations) -and ($Service -in @('all', 'backend'))
  if ($shouldRunMigrations) {
    $migrationService = if ($Production) { 'backend-prod' } else { 'backend' }

    Write-Host "Applying Prisma migrations in $migrationService..." -ForegroundColor Yellow
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
    $migrationDone = Wait-Job $migrationJob -Timeout 120

    if (-not $migrationDone) {
      Stop-Job $migrationJob -ErrorAction SilentlyContinue
      Remove-Job $migrationJob -Force -ErrorAction SilentlyContinue
      Write-Host "Migration check timed out after 120s. Services are updated; run migrations manually if needed." -ForegroundColor Yellow
    } else {
      $migrationResult = Receive-Job $migrationJob
      Remove-Job $migrationJob -Force -ErrorAction SilentlyContinue

      if ($migrationResult.ExitCode -ne 0) {
        Write-Host $migrationResult.Output -ForegroundColor Yellow
        Write-Host "Migration step failed. Services were updated, but you may need to run migrations manually." -ForegroundColor Yellow
      } elseif ($migrationResult.Output -match 'No pending migrations to apply') {
        Write-Host "Database migrations are up to date." -ForegroundColor DarkGray
      } else {
        Write-Host "Database migrations applied successfully." -ForegroundColor Green
      }
    }
  }

  Write-Host "Docker services updated successfully." -ForegroundColor Green
} catch {
  Write-Host "Error: $_" -ForegroundColor Red
  exit 1
} finally {
  Pop-Location
}
