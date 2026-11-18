#Requires -Version 5.1
#Requires -RunAsAdministrator
param([Parameter(Mandatory)][ValidateRange(1,65535)][int]$Port)
$ErrorActionPreference = 'Stop'
try {
    $name = "Entrip-LAN-TCP-$Port"
    if (-not (Get-NetFirewallRule -Name $name -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -Name $name -DisplayName "Entrip LAN TCP $Port" -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port -RemoteAddress LocalSubnet -Profile Domain,Private | Out-Null
    }
    Enable-NetFirewallRule -Name $name | Out-Null
} catch {
    Write-Error $_ -ErrorAction Continue
    exit 1
}
