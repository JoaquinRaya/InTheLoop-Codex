param(
  [switch]$SkipHealthCheck
)

$ErrorActionPreference = "Stop"

if ($args -contains "--help" -or $args -contains "-h") {
  Write-Host "Usage: pnpm up:fresh [-- --SkipHealthCheck]"
  Write-Host "  --SkipHealthCheck  Skip waiting for http://localhost:3000/health"
  exit 0
}

function Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

Step "Checking Docker availability"
docker info --format "{{.ServerVersion}}" | Out-Null

Step "Stopping and removing existing stack (containers, project images, volumes, orphans)"
docker compose down --remove-orphans --rmi local --volumes

Step "Rebuilding images with no cache"
docker compose build --no-cache

Step "Starting fresh containers"
docker compose up -d --force-recreate

Step "Current container status"
docker compose ps

if (-not $SkipHealthCheck) {
  Step "Waiting for API health endpoint"

  $maxAttempts = 30
  $delaySeconds = 2
  $isHealthy = $false

  for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    try {
      $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get -TimeoutSec 3
      if ($response.status -eq "ok") {
        $isHealthy = $true
        break
      }
    } catch {
      Start-Sleep -Seconds $delaySeconds
    }
  }

  if (-not $isHealthy) {
    Write-Host ""
    Write-Host "API did not become healthy in time. Recent app logs:" -ForegroundColor Yellow
    docker compose logs app --tail 120
    throw "Fresh start failed health check."
  }
}

Write-Host ""
Write-Host "Fresh stack is up." -ForegroundColor Green
Write-Host "Admin UI:      http://localhost:3000/ui"
Write-Host "People Dash:   http://localhost:3000/dashboard"
