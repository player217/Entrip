#Requires -Version 5.1
# Exercise the actual batch entry point and native argv quoting without modifying
# the Windows runner's Docker engine, network settings, or existing Entrip data.
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$fixture = Join-Path ([IO.Path]::GetTempPath()) ('Entrip 검증 ' + [Guid]::NewGuid().ToString('N'))
$bin = Join-Path $fixture 'bin'
$state = Join-Path $fixture '.entrip-lan'
$scriptDir = Join-Path $fixture 'scripts\windows'
$log = Join-Path $fixture 'docker-args.txt'
$bat = Join-Path $fixture 'run.bat'
$name = 'entrip-manual-20261118T180000-0123456789ab.sqlite3'
$data = Join-Path $state 'data\entrip.sqlite'
$snapshot = Join-Path $state "backups\$name"
$mock = @'
using System;
using System.IO;
class DockerFixture {
    static bool Has(string[] args, string flag) { return Array.IndexOf(args, flag) >= 0; }
    static int Main(string[] args) {
        File.AppendAllText(Environment.GetEnvironmentVariable("ENTRIP_TEST_MOCK_LOG"),
                           string.Join("\t",args) + Environment.NewLine);
        if (args.Length == 0 || Has(args, "down")) return 90;
        if (args[0] == "context") Console.WriteLine("npipe:////./pipe/docker_engine");
        else if (args[0] == "info") Console.WriteLine("linux");
        else if (args[0] == "image") Console.WriteLine("fixture-image");
        else if (args[0] == "inspect") Console.WriteLine("{}");
        else if (args[0] == "volume") {
            if (Environment.GetEnvironmentVariable("ENTRIP_TEST_MOCK_LEGACY") == "1")
                Console.WriteLine("entrip-lan_postgres_data");
        } else if (args[0] == "ps") Console.WriteLine("entrip-fixture");
        else if (args[0] == "compose") {
            if (Has(args, "--services")) Console.WriteLine("api\nbackup");
            if (Has(args, "restore") && Environment.GetEnvironmentVariable("ENTRIP_TEST_MOCK_FAIL") == "1") return 71;
            if (Has(args, "--no-build")) return 72; // halt before browser/firewall prompts
        } else return 91;
        return 0;
    }
}
'@

function Run-Launcher([string[]]$Arguments, [bool]$Success) {
    [IO.File]::WriteAllText($log, '')
    $message = & $bat @Arguments 2>&1
    $code = $LASTEXITCODE
    if (($code -eq 0) -ne $Success) { throw "Unexpected batch exit $code for $($Arguments[0]): $message" }
    Get-Content -LiteralPath $log -Encoding UTF8
}

function Assert-Order([string[]]$Trace, [string[]]$Expected) {
    $commands = @($Trace | Where-Object { $_ -like 'compose*' } | ForEach-Object {
        $fields = @($_ -split "\t")
        $index = [array]::IndexOf($fields,'-f')
        if ($index -ge 0) {
            $expectedPath = Join-Path $fixture 'compose.lan.yml'
            if ($fields[$index+1] -ne $expectedPath) {
                throw "Compose path differs. Expected '$expectedPath', received '$($fields[$index+1])'. Arguments: $($fields -join ' | ')"
            }
            $fields[($index+2)..($fields.Count-1)] -join ' '
        }
    })
    if (($commands -join '|') -ne ($Expected -join '|')) {
        throw "Unexpected Docker commands: $($commands -join ' / ')"
    }
}

$oldPath = $env:PATH
$oldHost = $env:DOCKER_HOST
$oldPause = $env:ENTRIP_NO_PAUSE
try {
    [void][IO.Directory]::CreateDirectory($bin)
    [void][IO.Directory]::CreateDirectory($scriptDir)
    [void][IO.Directory]::CreateDirectory((Split-Path $snapshot))
    [void][IO.Directory]::CreateDirectory((Split-Path $data))
    Copy-Item (Join-Path $repo 'run.bat') $fixture
    Copy-Item (Join-Path $repo 'compose.lan.yml') $fixture
    Copy-Item (Join-Path $repo 'scripts\windows\*.ps1') $scriptDir
    Add-Type -TypeDefinition $mock -Language CSharp -OutputAssembly (Join-Path $bin 'docker.exe') -OutputType ConsoleApplication
    $env:PATH = "$bin;$oldPath"
    $env:DOCKER_HOST = $null
    $env:ENTRIP_NO_PAUSE = '1'
    $env:ENTRIP_TEST_MOCK_LOG = $log
    $env:ENTRIP_TEST_MOCK_LEGACY = $null
    $env:ENTRIP_TEST_MOCK_FAIL = $null
    $settings = @('ENTRIP_LAN_PORT=3000','ENTRIP_COMPANY_CODE=fixture','ENTRIP_ADMIN_EMAIL=admin@example.test')
    foreach ($key in @('JWT_SECRET','JWT_REFRESH_SECRET','ENTRIP_ADMIN_PASSWORD','POSTGRES_PASSWORD')) {
        $settings += "$key=$([Guid]::NewGuid().ToString('N'))"
    }
    [IO.File]::WriteAllLines((Join-Path $state 'server.env'),$settings,[Text.Encoding]::ASCII)
    [IO.File]::WriteAllText($data,'fixture')
    [IO.File]::WriteAllText($snapshot,'fixture')

    $prefix = 'run --rm --no-deps -T backup python3 deploy/lan/sqlite/backup.py'
    Assert-Order (Run-Launcher @('backup') $true) @("$prefix backup")
    Assert-Order (Run-Launcher @('backups') $true) @("$prefix list")
    Assert-Order (Run-Launcher @('restore',$name,'-Yes') $true) @(
        'run --rm --no-deps -T initialize node deploy/lan/initialize.cjs --prepare-directories',
        'ps --services --status running','stop api backup',"$prefix restore --name $name",
        'run --rm --no-deps -T initialize','up -d --no-deps api backup'
    )
    $env:ENTRIP_TEST_MOCK_FAIL = '1'
    Assert-Order (Run-Launcher @('restore',$name,'-Yes') $false) @(
        'run --rm --no-deps -T initialize node deploy/lan/initialize.cjs --prepare-directories',
        'ps --services --status running','stop api backup',"$prefix restore --name $name"
    )
    $env:ENTRIP_TEST_MOCK_FAIL = $null
    Remove-Item -LiteralPath $data
    Remove-Item -LiteralPath (Join-Path $state 'sqlite-active.txt')
    # An operator may copy just server.env into an upgrade directory. A known
    # installation must stop even when the companion marker was lost as well.
    if ((Get-Content -LiteralPath (Join-Path $state 'server.env')) -notcontains 'ENTRIP_SQLITE_EXPECTED=1') {
        throw 'SQLite expectation was not persisted with the server settings.'
    }
    Assert-Order (Run-Launcher @('start') $false) @()
    Assert-Order (Run-Launcher @('restore',$name,'-Yes') $true) @(
        'run --rm --no-deps -T initialize node deploy/lan/initialize.cjs --prepare-directories',
        'ps --services --status running','stop api backup',"$prefix restore --name $name",
        'run --rm --no-deps -T initialize','up -d --no-deps api backup'
    )
    # Now simulate an actual previous PostgreSQL installation.
    Remove-Item -LiteralPath (Join-Path $state 'sqlite-active.txt')
    [IO.File]::WriteAllLines((Join-Path $state 'server.env'),$settings,[Text.Encoding]::ASCII)
    Remove-Item -LiteralPath $snapshot
    $env:ENTRIP_TEST_MOCK_LEGACY = '1'
    Assert-Order (Run-Launcher @('start') $false) @(
        'build','stop api backup','--profile migrate up -d --wait postgres',
        'run --rm --no-deps -T -e ENTRIP_IMPORT_POSTGRES=true initialize',
        '--profile migrate stop postgres','up --no-build -d'
    )
    Write-Output 'Windows batch dispatch for SQLite backup, restore, failed restore and legacy import passed.'
} finally {
    $env:PATH = $oldPath
    $env:DOCKER_HOST = $oldHost
    $env:ENTRIP_NO_PAUSE = $oldPause
    $env:ENTRIP_TEST_MOCK_LOG = $null
    $env:ENTRIP_TEST_MOCK_LEGACY = $null
    $env:ENTRIP_TEST_MOCK_FAIL = $null
    if (Test-Path -LiteralPath $fixture) { Remove-Item -LiteralPath $fixture -Recurse -Force }
}
