param(
  [switch]$StartAfterSetup = $true,
  [switch]$Production = $false,
  [switch]$WithTools = $false,
  [switch]$DevMode = $false
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot "common.ps1")

function Copy-IfMissing($sourcePath, $targetPath) {
  if (-not (Test-Path $targetPath)) {
    Copy-Item $sourcePath $targetPath
    Write-Host "Created: $targetPath" -ForegroundColor Green
  } else {
    Write-Host "Exists:  $targetPath" -ForegroundColor DarkYellow
  }
}

Write-Host "Aethea first-time setup is starting..." -ForegroundColor Yellow

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

try {
  Push-Location $projectRoot

  Write-Step "Checking required tools"
  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm was not found. Install Node.js (v18+) and retry."
  }

  Ensure-DockerReady
  Ensure-CloudflaredInstalled

  Write-Step "Installing dependencies"
  npm install
  if ($LASTEXITCODE -ne 0) {
    throw "npm install failed."
  }

  Write-Step "Creating .env files from examples (if missing)"
  Copy-IfMissing (Join-Path $projectRoot ".env.docker.example") (Join-Path $projectRoot ".env")
  Copy-IfMissing (Join-Path $projectRoot "backend/.env.example") (Join-Path $projectRoot "backend/.env")
  Copy-IfMissing (Join-Path $projectRoot "web/.env.example") (Join-Path $projectRoot "web/.env")

  Write-Host "`nImportant:" -ForegroundColor Yellow
  Write-Host "- Fill secrets in backend/.env and web/.env (Supabase, Turnstile, Google Maps key)." -ForegroundColor Gray
  Write-Host "- Keep your cloudflared tunnel JSON file outside git and mounted via docker-compose." -ForegroundColor Gray

  if ($StartAfterSetup) {
    Write-Step "Starting stack"
    $startArgs = @(
      "-ExecutionPolicy", "Bypass",
      "-File", (Join-Path $PSScriptRoot "start-server.ps1")
    )

    if ($Production) { $startArgs += "-Production" }
    if ($WithTools) { $startArgs += "-WithTools" }
    if ($DevMode) { $startArgs += "-DevMode" }

    & powershell @startArgs
    if ($LASTEXITCODE -ne 0) {
      throw "start-server.ps1 failed."
    }
  } else {
    Write-Host "`nSetup finished. You can start later with: npm run start:server" -ForegroundColor Cyan
  }

  Write-Host "`nFirst-time setup completed." -ForegroundColor Green
} catch {
  Write-Host "`nError: $_" -ForegroundColor Red
  exit 1
} finally {
  Pop-Location
}
