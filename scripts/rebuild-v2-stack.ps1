param(
    [switch]$PruneUnusedNetworks,
    [int]$TimeoutSec = 180
)

$ErrorActionPreference = "Stop"

function Invoke-Step {
    param(
        [string]$Name,
        [scriptblock]$Action
    )
    Write-Host ""
    Write-Host "[STEP] $Name" -ForegroundColor Cyan
    & $Action
}

function Assert-HttpStatus {
    param(
        [string]$Url,
        [int[]]$Allowed = @(200)
    )
    $status = 0
    try {
        $status = (Invoke-WebRequest -UseBasicParsing $Url -TimeoutSec 15).StatusCode
    } catch {
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            $status = [int]$_.Exception.Response.StatusCode
        } else {
            throw "Request failed: $Url ($($_.Exception.Message))"
        }
    }

    if ($Allowed -notcontains $status) {
        throw "Unexpected status for $Url : $status (allowed: $($Allowed -join ','))"
    }
    Write-Host "OK $Url -> $status" -ForegroundColor Green
}

function Wait-ForServices {
    param([int]$TimeoutSeconds)

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $items = docker compose -f docker-compose.dev.yml ps --format json | ConvertFrom-Json
        if (-not $items) {
            Start-Sleep -Seconds 2
            continue
        }

        $bad = @()
        foreach ($item in $items) {
            if ($item.State -ne "running") {
                $bad += "$($item.Name)=state:$($item.State)"
                continue
            }
            if ($item.Status -like "*unhealthy*") {
                $bad += "$($item.Name)=unhealthy"
            }
        }

        if ($bad.Count -eq 0) {
            Write-Host "All compose services are running." -ForegroundColor Green
            return
        }

        Write-Host "Waiting services: $($bad -join ' | ')" -ForegroundColor Yellow
        Start-Sleep -Seconds 3
    }

    throw "Timeout waiting for compose services to become stable ($TimeoutSeconds sec)."
}

Write-Host "Entrip v2 runtime rebuild" -ForegroundColor Cyan
Write-Host "project: $(Get-Location)" -ForegroundColor DarkGray

Invoke-Step "Bring up compose stack" {
    docker compose -f docker-compose.dev.yml up -d postgres redis api-v2 crawler fx-free web workspace | Out-Host
}

Invoke-Step "Wait for container stability" {
    Wait-ForServices -TimeoutSeconds $TimeoutSec
}

Invoke-Step "Optional prune unused entrip networks" {
    if (-not $PruneUnusedNetworks) {
        Write-Host "Skipped. Use -PruneUnusedNetworks to enable." -ForegroundColor DarkYellow
        return
    }

    $networkNames = docker network ls --format "{{.Name}}" | Where-Object { $_ -like "*entrip*" }
    foreach ($n in $networkNames) {
        if ($n -eq "entrip_entrip-net") {
            continue
        }
        try {
            docker network rm $n | Out-Null
            Write-Host "Removed network: $n" -ForegroundColor Green
        } catch {
            Write-Host "Skip network (in use or already gone): $n" -ForegroundColor DarkYellow
        }
    }
}

Invoke-Step "HTTP health checks" {
    Assert-HttpStatus -Url "http://localhost:3000" -Allowed @(200)
    Assert-HttpStatus -Url "http://localhost:4002/health" -Allowed @(200)
    Assert-HttpStatus -Url "http://localhost:4002/api/v2/health" -Allowed @(200)
    Assert-HttpStatus -Url "http://localhost:8001/health" -Allowed @(200)
    Assert-HttpStatus -Url "http://localhost:4010/health" -Allowed @(200)
    Assert-HttpStatus -Url "http://localhost:3000/api/auth/verify" -Allowed @(200, 401)
}

Invoke-Step "v2 cutover gate" {
    pnpm run verify:v2-cutover | Out-Host
}

Invoke-Step "Schema gate (local DB)" {
    $dbUrl = $env:DATABASE_URL
    if ([string]::IsNullOrWhiteSpace($dbUrl)) {
        $env:DATABASE_URL = "postgresql://entrip:entrip@localhost:5432/entrip"
    }
    pnpm run verify:schema:v2:db | Out-Host
}

Invoke-Step "Smoke gate (local api-v2)" {
    $env:SMOKE_BASE_URL = "http://localhost:4002"
    pnpm run smoke:v2 | Out-Host
}

Write-Host ""
Write-Host "Entrip v2 rebuild + verification completed." -ForegroundColor Green
