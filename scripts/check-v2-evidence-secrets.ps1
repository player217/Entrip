param(
    [string]$Repo = "",
    [switch]$Json
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Repo)) {
    $Repo = (gh repo view --json nameWithOwner -q .nameWithOwner).Trim()
}

if ([string]::IsNullOrWhiteSpace($Repo)) {
    throw "Unable to resolve repository. Pass -Repo <owner/name>."
}

$required = @(
    "STAGING_URL",
    "STAGING_DATABASE_URL",
    "PRODUCTION_URL",
    "PRODUCTION_DATABASE_URL"
)

$existing = @()
$jsonNames = gh secret list --repo $Repo --json name --jq ".[].name"
if (-not [string]::IsNullOrWhiteSpace($jsonNames)) {
    $existing = @(
        $jsonNames -split "`r?`n" |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
        ForEach-Object { $_.Trim() }
    )
}

$missing = @()
foreach ($name in $required) {
    if ($existing -notcontains $name) {
        $missing += $name
    }
}

$result = [PSCustomObject]@{
    repository = $Repo
    required = $required
    existing = $existing
    missing = $missing
    ready = ($missing.Count -eq 0)
}

if ($Json) {
    $result | ConvertTo-Json -Depth 4
}
else {
    Write-Host "Repository: $Repo"
    Write-Host ""
    Write-Host "Required secrets:"
    foreach ($name in $required) {
        $state = if ($existing -contains $name) { "OK" } else { "MISSING" }
        Write-Host ("- {0}: {1}" -f $name, $state)
    }

    Write-Host ""
    if ($result.ready) {
        Write-Host "Ready: YES"
    }
    else {
        Write-Host "Ready: NO"
        Write-Host "Missing secrets:"
        foreach ($name in $missing) {
            Write-Host "- $name"
        }
    }
}

if (-not $result.ready) {
    exit 2
}
