param(
    [string]$Repo = "",
    [string]$ValuesFile = "scripts/config/v2-evidence-secrets.local.json"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Repo)) {
    $Repo = (gh repo view --json nameWithOwner -q .nameWithOwner).Trim()
}

if (-not (Test-Path -LiteralPath $ValuesFile)) {
    throw "Values file not found: $ValuesFile"
}

$raw = Get-Content -LiteralPath $ValuesFile -Encoding UTF8 -Raw
$cfg = $raw | ConvertFrom-Json

$required = @(
    "STAGING_URL",
    "STAGING_DATABASE_URL",
    "PRODUCTION_URL",
    "PRODUCTION_DATABASE_URL"
)

foreach ($k in $required) {
    $v = [string]$cfg.$k
    if ([string]::IsNullOrWhiteSpace($v)) {
        throw "Missing required key in values file: $k"
    }
}

foreach ($k in $required) {
    $v = [string]$cfg.$k
    gh secret set $k --repo $Repo --body $v | Out-Null
    Write-Host "set: $k"
}

Write-Host ""
Write-Host "Secret setup completed for $Repo"
Write-Host "Run preflight:"
Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/check-v2-evidence-secrets.ps1 -Repo $Repo"
