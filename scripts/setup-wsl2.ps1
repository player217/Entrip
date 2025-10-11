# WSL2 Development Environment Setup Guide
# This script provides a comprehensive solution for Prisma file lock issues on Windows

Write-Host "`n=== WSL2 Development Environment Setup ===" -ForegroundColor Cyan
Write-Host "This guide helps resolve Prisma file lock issues fundamentally`n" -ForegroundColor Yellow

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.SecurityBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  Note: Some operations may require Administrator privileges" -ForegroundColor Yellow
}

# Step 1: Check WSL2 installation
Write-Host "Step 1: Checking WSL2 installation..." -ForegroundColor Green
$wslInstalled = $false
try {
    $wslVersion = wsl --list --verbose 2>$null
    if ($LASTEXITCODE -eq 0) {
        $wslInstalled = $true
        Write-Host "✅ WSL is installed" -ForegroundColor Green
        Write-Host $wslVersion
    }
} catch {
    # WSL not found
}

if (-not $wslInstalled) {
    Write-Host "❌ WSL2 is not installed" -ForegroundColor Red
    Write-Host "`nTo install WSL2, run as Administrator:" -ForegroundColor Yellow
    Write-Host "  wsl --install" -ForegroundColor Cyan
    Write-Host "`nAfter installation:" -ForegroundColor Yellow
    Write-Host "  1. Restart your computer" -ForegroundColor White
    Write-Host "  2. Run this script again" -ForegroundColor White
    exit 1
}

# Step 2: Check for Ubuntu distribution
Write-Host "`nStep 2: Checking for Ubuntu distribution..." -ForegroundColor Green
$hasUbuntu = $false
if ($wslVersion -match "Ubuntu") {
    $hasUbuntu = $true
    Write-Host "✅ Ubuntu is installed" -ForegroundColor Green
} else {
    Write-Host "❌ Ubuntu is not installed" -ForegroundColor Red
    Write-Host "`nTo install Ubuntu:" -ForegroundColor Yellow
    Write-Host "  wsl --install -d Ubuntu" -ForegroundColor Cyan
    Write-Host "`nOr install from Microsoft Store:" -ForegroundColor Yellow
    Write-Host "  Search for 'Ubuntu' in Microsoft Store" -ForegroundColor White
}

# Step 3: Provide WSL2 setup script
Write-Host "`nStep 3: WSL2 Development Setup" -ForegroundColor Green
Write-Host "Once Ubuntu is installed, run these commands inside WSL2:" -ForegroundColor Yellow

$wslSetupScript = @'
#!/bin/bash
# WSL2 Entrip Development Environment Setup

echo "=== Setting up Entrip development environment in WSL2 ==="

# Update packages
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js 18+ (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.bashrc

# Install build essentials for native modules
sudo apt-get install -y build-essential

# Navigate to project (adjust path as needed)
cd /mnt/c/Users/PC/Documents/project/Entrip

# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma:generate

echo "=== Setup complete! ==="
echo "To use WSL2 for development:"
echo "1. Open WSL2 terminal (wsl)"
echo "2. cd /mnt/c/Users/PC/Documents/project/Entrip"
echo "3. pnpm dev:all"
'@

# Save setup script
$wslSetupPath = Join-Path $PSScriptRoot "wsl-setup.sh"
$wslSetupScript | Out-File -FilePath $wslSetupPath -Encoding UTF8 -NoNewline

Write-Host "`n📋 WSL2 setup script saved to: $wslSetupPath" -ForegroundColor Cyan
Write-Host "`nTo run the setup in WSL2:" -ForegroundColor Yellow
Write-Host "  1. Open WSL2: wsl" -ForegroundColor White
Write-Host "  2. Navigate to project: cd /mnt/c/Users/PC/Documents/project/Entrip" -ForegroundColor White
Write-Host "  3. Run setup: bash scripts/wsl-setup.sh" -ForegroundColor White

# Step 4: Provide quick access commands
Write-Host "`n=== Quick Commands ===" -ForegroundColor Green
Write-Host "Open WSL2 in project directory:" -ForegroundColor Yellow
Write-Host "  wsl -d Ubuntu --cd /mnt/c/Users/PC/Documents/project/Entrip" -ForegroundColor Cyan

Write-Host "`nRun Entrip in WSL2:" -ForegroundColor Yellow
Write-Host "  wsl -d Ubuntu -e bash -c 'cd /mnt/c/Users/PC/Documents/project/Entrip && pnpm dev:all'" -ForegroundColor Cyan

Write-Host "`n=== Benefits of WSL2 ===" -ForegroundColor Green
Write-Host "✅ No Prisma file lock issues" -ForegroundColor White
Write-Host "✅ Faster file operations" -ForegroundColor White
Write-Host "✅ Native Linux toolchain" -ForegroundColor White
Write-Host "✅ Better compatibility with Node.js packages" -ForegroundColor White
Write-Host "✅ Consistent with production environment" -ForegroundColor White

Write-Host "`n💡 Tip: Use Windows Terminal for better WSL2 experience" -ForegroundColor Yellow
Write-Host "   Install from: Microsoft Store → Windows Terminal" -ForegroundColor Gray