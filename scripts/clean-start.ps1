param(
  [switch]$DevMode = $false
)

$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot
$stopScript = Join-Path $scriptDir "stop-project.ps1"
$startScript = Join-Path $scriptDir "start-project.ps1"
$projectRoot = Resolve-Path (Join-Path $scriptDir "..")

Write-Host "--- Aethea Clean Start ---" -ForegroundColor Cyan
Write-Host "This will delete all Docker volumes (database data), node_modules, and rebuild from scratch." -ForegroundColor Yellow
Write-Host ""

# 1. Stop the project
Write-Host "Step 1: Stopping current instance..." -ForegroundColor Yellow
& $stopScript

# 2. Deep Clean
Write-Host "Step 2: Deep Cleaning Cache & Data..." -ForegroundColor Yellow
Push-Location $projectRoot

Write-Host "  -> Removing Docker volumes, networks, and local images..." -ForegroundColor DarkGray
# Remove volumes (-v), orphans, and local images to force a full clean slate
docker compose down -v --remove-orphans --rmi local 2>$null

Write-Host "  -> Removing node_modules and dist folders..." -ForegroundColor DarkGray
$dirs = @(
  "node_modules", 
  "backend\node_modules", 
  "web\node_modules", 
  "core\node_modules",
  "backend\dist", 
  "web\dist",
  "core\dist",
  "web\.vite",
  "backend\src\generated"
)
foreach ($dir in $dirs) {
  $fullPath = Join-Path $projectRoot $dir
  if (Test-Path $fullPath) {
    Remove-Item -Recurse -Force $fullPath -ErrorAction SilentlyContinue
  }
}

# Also remove lockfile so overrides are freshly resolved
$lockFile = Join-Path $projectRoot "package-lock.json"
if (Test-Path $lockFile) {
  Remove-Item -Force $lockFile -ErrorAction SilentlyContinue
}

Write-Host "  -> Cleaning npm cache..." -ForegroundColor DarkGray
$prevErrorAction = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
npm cache clean --force 2>$null

Write-Host "  -> Installing base dependencies..." -ForegroundColor DarkGray
npm install
$ErrorActionPreference = $prevErrorAction

Pop-Location

# 3. Start the project
Write-Host "Step 3: Rebuilding and Starting..." -ForegroundColor Yellow
if ($DevMode) {
  # If DevMode, we just use the regular dev start since it uses local node_modules we just installed
  & $startScript -DevMode
} else {
  # HardRefresh runs docker compose build --no-cache
  & $startScript -HardRefresh
}

Write-Host "--- Clean Start Complete ---" -ForegroundColor Green
