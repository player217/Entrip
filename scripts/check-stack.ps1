# Entrip Docker Stack Health Check
$ErrorActionPreference = "Stop"

Write-Host "Entrip Docker Stack Health Check" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Get docker compose services
$services = docker compose -f docker-compose.dev.yml ps --format json | ConvertFrom-Json
$errors = @()
$healthy = @()

foreach ($service in $services) {
    if ($service.State -eq "running") {
        # Check if service has health check
        if ($service.Status -like "*healthy*") {
            $healthy += $service.Name
            Write-Host "✅ $($service.Name): HEALTHY" -ForegroundColor Green
        } elseif ($service.Status -like "*unhealthy*") {
            $errors += "$($service.Name) is unhealthy"
            Write-Host "❌ $($service.Name): UNHEALTHY" -ForegroundColor Red
        } else {
            Write-Host "⚠️  $($service.Name): running (no health check)" -ForegroundColor Yellow
        }
    } else {
        $errors += "$($service.Name) is not running (state: $($service.State))"
        Write-Host "❌ $($service.Name): NOT RUNNING" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "--------" -ForegroundColor Cyan
Write-Host "Healthy services: $($healthy.Count)" -ForegroundColor Green

if ($errors.Count -gt 0) {
    Write-Host "Errors: $($errors.Count)" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "  - $error" -ForegroundColor Red
    }
    Write-Error "Unhealthy: $($errors -join ', ')"
    exit 1
} else {
    Write-Host ""
    Write-Host "✅ All containers healthy" -ForegroundColor Green
    exit 0
}