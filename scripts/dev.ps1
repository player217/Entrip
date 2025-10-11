# Entrip Development Management Script with PID Tracking
# Provides precise process control with PID management
param([string]$Action = 'help', [string]$Service = '')

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$PidFile = Join-Path $ProjectRoot '.entrip-pids.json'
$Script:ServicePIDs = @{}

# Load existing PIDs if available
function Load-PIDs {
    if (Test-Path $PidFile) {
        try {
            $Script:ServicePIDs = Get-Content $PidFile | ConvertFrom-Json -AsHashtable
            return $true
        } catch {
            Write-Host "⚠️  Could not load PID file, starting fresh" -ForegroundColor Yellow
            $Script:ServicePIDs = @{}
        }
    }
    return $false
}

# Save PIDs to file
function Save-PIDs {
    try {
        $Script:ServicePIDs | ConvertTo-Json | Set-Content $PidFile
    } catch {
        Write-Host "⚠️  Could not save PID file" -ForegroundColor Yellow
    }
}

# Check if a process is running
function Test-ProcessRunning {
    param([int]$Pid)
    try {
        $process = Get-Process -Id $Pid -ErrorAction SilentlyContinue
        return $null -ne $process
    } catch {
        return $false
    }
}

# Stop a specific process and its children
function Stop-ProcessTree {
    param([int]$Pid, [string]$Name)

    if (Test-ProcessRunning $Pid) {
        try {
            # Stop child processes first
            Get-CimInstance Win32_Process -Filter "ParentProcessId = $Pid" |
                ForEach-Object {
                    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
                }

            # Stop parent process
            Stop-Process -Id $Pid -Force -ErrorAction Stop
            Write-Host "✅ Stopped $Name (PID: $Pid)" -ForegroundColor Yellow
            return $true
        } catch {
            Write-Host "⚠️  Could not stop $Name (PID: $Pid): $_" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "ℹ️  $Name (PID: $Pid) is not running" -ForegroundColor Gray
        return $false
    }
}

function Start-Services {
    Write-Host "`n🚀 Starting services..." -ForegroundColor Cyan

    # Check for existing processes
    Load-PIDs
    $existingServices = @()
    foreach ($service in $Script:ServicePIDs.Keys) {
        if (Test-ProcessRunning $Script:ServicePIDs[$service]) {
            $existingServices += $service
        }
    }

    if ($existingServices.Count -gt 0) {
        Write-Host "⚠️  Services already running: $($existingServices -join ', ')" -ForegroundColor Yellow
        Write-Host "   Use 'stop' first or 'restart' to restart all services" -ForegroundColor Gray
        return
    }

    # Start Web service
    $webProcess = Start-Process -WindowStyle Hidden -PassThru powershell `
        -ArgumentList "-NoProfile", "-Command", "cd '$ProjectRoot\apps\web'; pnpm dev"
    $Script:ServicePIDs['web'] = $webProcess.Id
    Write-Host "  📦 Web App started (PID: $($webProcess.Id))" -ForegroundColor Green

    # Start API v1 service
    $apiV1Process = Start-Process -WindowStyle Hidden -PassThru powershell `
        -ArgumentList "-NoProfile", "-Command", "cd '$ProjectRoot\apps\api'; pnpm dev"
    $Script:ServicePIDs['api-v1'] = $apiV1Process.Id
    Write-Host "  🔧 API v1 started (PID: $($apiV1Process.Id))" -ForegroundColor Green

    # Start API v2 service
    $apiV2Process = Start-Process -WindowStyle Hidden -PassThru powershell `
        -ArgumentList "-NoProfile", "-Command", "cd '$ProjectRoot\packages\api'; pnpm dev"
    $Script:ServicePIDs['api-v2'] = $apiV2Process.Id
    Write-Host "  🆕 API v2 started (PID: $($apiV2Process.Id))" -ForegroundColor Green

    # Save PIDs to file
    Save-PIDs

    Write-Host "`n✅ All services started. Wait 5-10 seconds for initialization." -ForegroundColor Green
    Write-Host "   Run '.\dev.ps1 status' to check service health" -ForegroundColor Gray
}

function Stop-Services {
    Write-Host "`n🛑 Stopping services..." -ForegroundColor Cyan

    Load-PIDs

    if ($Script:ServicePIDs.Count -eq 0) {
        Write-Host "ℹ️  No PID file found. Attempting fallback cleanup..." -ForegroundColor Yellow

        # Fallback: Stop all Node processes (less precise)
        $nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
        if ($nodeProcesses) {
            $nodeProcesses | Stop-Process -Force
            Write-Host "✅ Stopped $($nodeProcesses.Count) Node.js process(es)" -ForegroundColor Yellow
        } else {
            Write-Host "ℹ️  No Node.js processes found" -ForegroundColor Gray
        }
    } else {
        $stopped = 0
        foreach ($service in $Script:ServicePIDs.Keys) {
            if (Stop-ProcessTree -Pid $Script:ServicePIDs[$service] -Name $service) {
                $stopped++
            }
        }
        Write-Host "`n✅ Stopped $stopped service(s)" -ForegroundColor Green
    }

    # Clean up PID file
    if (Test-Path $PidFile) {
        Remove-Item $PidFile -Force
    }
}

function Stop-Service {
    param([string]$ServiceName)

    if ([string]::IsNullOrWhiteSpace($ServiceName)) {
        Write-Host "❌ Please specify a service name: web, api-v1, or api-v2" -ForegroundColor Red
        return
    }

    Load-PIDs

    if ($Script:ServicePIDs.ContainsKey($ServiceName)) {
        if (Stop-ProcessTree -Pid $Script:ServicePIDs[$ServiceName] -Name $ServiceName) {
            # Remove from PIDs and save
            $Script:ServicePIDs.Remove($ServiceName)
            if ($Script:ServicePIDs.Count -gt 0) {
                Save-PIDs
            } else {
                # No services left, remove PID file
                if (Test-Path $PidFile) {
                    Remove-Item $PidFile -Force
                }
            }
            Write-Host "✅ Service '$ServiceName' stopped successfully" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ Service '$ServiceName' not found in running services" -ForegroundColor Red
        Write-Host "   Available services: web, api-v1, api-v2" -ForegroundColor Gray
    }
}

function Restart-Services {
    Write-Host "`n🔄 Restarting services..." -ForegroundColor Cyan
    Stop-Services
    Start-Sleep -Seconds 2
    Start-Services
}

function Test-Status {
    Write-Host "`n📊 Service Status:" -ForegroundColor Cyan

    # Check PIDs first
    Load-PIDs
    Write-Host "`n  Process Status:" -ForegroundColor White
    if ($Script:ServicePIDs.Count -gt 0) {
        foreach ($service in $Script:ServicePIDs.Keys) {
            $pid = $Script:ServicePIDs[$service]
            if (Test-ProcessRunning $pid) {
                Write-Host "    ✅ $service (PID: $pid) - Process running" -ForegroundColor Green
            } else {
                Write-Host "    ❌ $service (PID: $pid) - Process not found" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "    ℹ️  No PID tracking file found" -ForegroundColor Gray
    }

    # Check HTTP endpoints
    Write-Host "`n  HTTP Health Check:" -ForegroundColor White
    $services = @(
        @{Name="Web App"; Url="http://localhost:3000"; Timeout=2000},
        @{Name="API v1"; Url="http://localhost:4001/api/health"; Timeout=2000},
        @{Name="API v2"; Url="http://localhost:4002/api/v2/health"; Timeout=2000}
    )

    foreach ($svc in $services) {
        try {
            $response = Invoke-WebRequest -Uri $svc.Url -TimeoutSec 2 -UseBasicParsing
            if ($svc.Name -eq "Web App" -and $response.StatusCode -eq 307) {
                Write-Host "    ✅ $($svc.Name): Running (Auth redirect active)" -ForegroundColor Green
            } else {
                Write-Host "    ✅ $($svc.Name): Running" -ForegroundColor Green
            }
        } catch {
            Write-Host "    ❌ $($svc.Name): Not responding" -ForegroundColor Red
        }
    }

    Write-Host ""
}

function Show-Help {
    Write-Host "`n📚 Entrip Development Manager" -ForegroundColor Cyan
    Write-Host "================================" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Usage: .\dev.ps1 [action] [options]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Actions:" -ForegroundColor Green
    Write-Host "  start       - Start all services with PID tracking"
    Write-Host "  stop        - Stop all services using PID tracking"
    Write-Host "  restart     - Restart all services"
    Write-Host "  status      - Check process and HTTP status"
    Write-Host "  stop-one    - Stop a specific service"
    Write-Host "  fix-prisma  - Fix Prisma file lock issues"
    Write-Host "  help        - Show this help message"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Green
    Write-Host "  .\dev.ps1 start                  # Start all services"
    Write-Host "  .\dev.ps1 stop                   # Stop all services"
    Write-Host "  .\dev.ps1 stop-one web           # Stop only web service"
    Write-Host "  .\dev.ps1 stop-one api-v1        # Stop only API v1"
    Write-Host "  .\dev.ps1 restart                # Restart all services"
    Write-Host "  .\dev.ps1 status                 # Check service health"
    Write-Host ""
    Write-Host "Services:" -ForegroundColor Green
    Write-Host "  web    - Next.js web application (port 3000)"
    Write-Host "  api-v1 - Legacy API server (port 4001)"
    Write-Host "  api-v2 - New API server (port 4002)"
    Write-Host ""
    Write-Host "PID Tracking:" -ForegroundColor Yellow
    Write-Host "  PIDs are saved to .entrip-pids.json for precise control"
    Write-Host "  This prevents stopping unrelated Node.js processes"
    Write-Host ""
}

# Main switch
switch ($Action.ToLower()) {
    'start' { Start-Services }
    'stop' { Stop-Services }
    'restart' { Restart-Services }
    'status' { Test-Status }
    'stop-one' { Stop-Service -ServiceName $Service }
    'fix-prisma' {
        Write-Host "`n🔧 Fixing Prisma issues..." -ForegroundColor Cyan
        Stop-Services

        # Use the new Prisma manager for safe cleanup
        $prismaManager = Join-Path $ProjectRoot "scripts\prisma-manager.js"
        if (Test-Path $prismaManager) {
            Write-Host "Using Prisma Manager for safe cleanup..." -ForegroundColor Yellow
            & node $prismaManager force-cleanup
            & node $prismaManager generate
        } else {
            # Fallback to old method
            Write-Host "Fallback: Removing .prisma directory..." -ForegroundColor Yellow
            Remove-Item -Path "$ProjectRoot\node_modules\.prisma" -Recurse -Force -ErrorAction SilentlyContinue
            & pnpm prisma:generate
        }

        Write-Host "✅ Prisma cleanup completed" -ForegroundColor Green
    }
    'help' { Show-Help }
    default {
        Write-Host "❌ Unknown action: $Action" -ForegroundColor Red
        Show-Help
    }
}