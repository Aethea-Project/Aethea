param(
  [switch]$GeneratePrisma = $true
)

$ErrorActionPreference = 'Stop'

Write-Host "Installing workspace dependencies..." -ForegroundColor Yellow

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $projectRoot

try {
  # Single workspace-aware install from the root
  npm install
  if ($LASTEXITCODE -ne 0) {
    throw "npm install failed."
  }

  if ($GeneratePrisma) {
    Push-Location backend
    npx prisma generate
    if ($LASTEXITCODE -ne 0) {
      throw "Prisma client generation failed."
    }
    Pop-Location
  }

  Write-Host "Dependencies installed successfully." -ForegroundColor Green
} catch {
  Write-Host "Error: $_" -ForegroundColor Red
  exit 1
} finally {
  Pop-Location
}
