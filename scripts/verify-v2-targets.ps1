param(
    [Parameter(Mandatory = $true)]
    [string]$TargetsFile,
    [string]$OutDir = "artifacts/v2-gates",
    [switch]$SkipCutover
)

$ErrorActionPreference = "Stop"

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [scriptblock]$Action
    )

    Write-Host ""
    Write-Host "==> $Name"
    & $Action
}

if (-not (Test-Path -LiteralPath $TargetsFile)) {
    throw "Targets file not found: $TargetsFile"
}

$targets = Get-Content -LiteralPath $TargetsFile -Encoding UTF8 | ConvertFrom-Json
if (-not $targets -or $targets.Count -eq 0) {
    throw "No targets in file: $TargetsFile"
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$reportPath = Join-Path $OutDir "v2-gates-$timestamp.md"

$report = New-Object System.Collections.Generic.List[string]
$report.Add("# v2 Gate Verification Report")
$report.Add("")
$report.Add("- generated_at: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz")")
$report.Add("- targets_file: $TargetsFile")
$report.Add("")

if (-not $SkipCutover) {
    try {
        Invoke-Step -Name "Global cutover guard (verify:v2-cutover)" -Action {
            pnpm run verify:v2-cutover
        }
        $report.Add("## Global")
        $report.Add("")
        $report.Add("- verify:v2-cutover: PASS")
        $report.Add("")
    }
    catch {
        $report.Add("## Global")
        $report.Add("")
        $report.Add("- verify:v2-cutover: FAIL")
        $report.Add("- reason: $($_.Exception.Message)")
        $report.Add("")
        $report | Set-Content -LiteralPath $reportPath -Encoding UTF8
        throw
    }
}

$failCount = 0

foreach ($target in $targets) {
    $name = [string]$target.name
    $baseUrl = [string]$target.smokeBaseUrl
    $dbUrl = [string]$target.databaseUrl

    if ([string]::IsNullOrWhiteSpace($name)) {
        throw "Target is missing 'name'"
    }
    if ([string]::IsNullOrWhiteSpace($baseUrl)) {
        throw "Target '$name' is missing 'smokeBaseUrl'"
    }
    if ([string]::IsNullOrWhiteSpace($dbUrl)) {
        throw "Target '$name' is missing 'databaseUrl'"
    }

    Write-Host ""
    Write-Host "## Target: $name"

    $schemaPass = $false
    $smokePass = $false
    $schemaErr = ""
    $smokeErr = ""

    try {
        Invoke-Step -Name "[$name] verify:schema:v2:db" -Action {
            $env:DATABASE_URL = $dbUrl
            pnpm run verify:schema:v2:db
        }
        $schemaPass = $true
    }
    catch {
        $schemaErr = $_.Exception.Message
        $failCount++
    }

    try {
        Invoke-Step -Name "[$name] smoke:v2" -Action {
            $env:SMOKE_BASE_URL = $baseUrl
            pnpm run smoke:v2
        }
        $smokePass = $true
    }
    catch {
        $smokeErr = $_.Exception.Message
        $failCount++
    }

    $report.Add("## Target: $name")
    $report.Add("")
    $report.Add("- smoke_base_url: $baseUrl")
    $report.Add("- verify:schema:v2:db: " + ($(if ($schemaPass) { "PASS" } else { "FAIL" })))
    if (-not $schemaPass -and $schemaErr) {
        $report.Add("- verify:schema:v2:db_error: $schemaErr")
    }
    $report.Add("- smoke:v2: " + ($(if ($smokePass) { "PASS" } else { "FAIL" })))
    if (-not $smokePass -and $smokeErr) {
        $report.Add("- smoke:v2_error: $smokeErr")
    }
    $report.Add("")
}

$report.Add("## Summary")
$report.Add("")
if ($failCount -eq 0) {
    $report.Add("- result: PASS")
}
else {
    $report.Add("- result: FAIL")
    $report.Add("- failed_checks: $failCount")
}
$report.Add("")

$report | Set-Content -LiteralPath $reportPath -Encoding UTF8
Write-Host ""
Write-Host "Report written: $reportPath"

if ($failCount -gt 0) {
    throw "v2 gate verification failed. See report: $reportPath"
}
