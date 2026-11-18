#Requires -Version 5.1
[CmdletBinding()]
param(
    [Parameter(Position=0)][ValidateSet('start','stop','status','help','backup','backups','list','restore')][string]$Action = 'start',
    [Parameter(Position=1)][string]$Snapshot,
    [switch]$Yes,
    [switch]$ReplaceInstallation
)

$ErrorActionPreference = 'Stop'
$project = 'entrip-lan'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$composeFile = Join-Path $root 'compose.lan.yml'
$stateDir = Join-Path $root '.entrip-lan'
$envFile = Join-Path $stateDir 'server.env'
$loginFile = Join-Path $stateDir 'first-login.txt'
$dataFile = Join-Path $stateDir 'data\entrip.sqlite'
$activeMarker = Join-Path $stateDir 'sqlite-active.txt'
$backupDir = Join-Path $stateDir 'backups'

if ($Action -eq 'help') {
    Write-Host 'run.bat          Start Entrip and open the login page'
    Write-Host 'run.bat status   Show local server status'
    Write-Host 'run.bat stop     Stop services and preserve stored data'
    Write-Host 'run.bat backup   Create a consistent SQLite backup'
    Write-Host 'run.bat backups  List available backup versions'
    Write-Host 'run.bat restore NAME  Restore the selected backup after confirmation'
    Write-Host 'Use -Yes for an unattended, explicit restore, or -ReplaceInstallation for recovery from another installation.'
    exit 0
}

function Find-DockerFile([string]$RelativePath) {
    foreach ($folder in @("$env:ProgramFiles\Docker\Docker", "$env:LOCALAPPDATA\Programs\DockerDesktop")) {
        $candidate = Join-Path $folder $RelativePath
        if ([IO.File]::Exists($candidate)) { return $candidate }
    }
}

function Resolve-Docker {
    $command = Get-Command docker.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($command) { return $command.Source }
    $path = Find-DockerFile 'resources\bin\docker.exe'
    if ($path) { return $path }
    if ($Action -ne 'start') { throw 'Docker Desktop 실행 파일을 찾지 못했습니다.' }
    $winget = Get-Command winget.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($winget) {
        Write-Host '이 PC에서 Entrip 서버를 실행하려면 Docker Desktop의 Linux 컨테이너가 필요합니다.'
        if ((Read-Host 'Docker Desktop 설치 프로그램을 열까요? [Y/N]') -match '^(y|yes)$') {
            & $winget.Source install --exact --id Docker.DockerDesktop --source winget --interactive | Out-Host
            if ($LASTEXITCODE -ne 0) { throw 'Docker 설치를 완료한 후 run.bat을 다시 실행하세요. Windows에서 재시작을 요청하면 먼저 재시작하세요.' }
            $path = Find-DockerFile 'resources\bin\docker.exe'
            if ($path) { return $path }
        }
    }
    throw 'Windows용 Docker Desktop을 설치한 후 run.bat을 다시 실행하세요. 설치 안내: https://docs.docker.com/desktop/setup/install/windows-install/'
}

function Get-EnginePlatform {
    $ErrorActionPreference = 'Continue'
    $result = & $docker info --format '{{.OSType}}' 2>$null
    if ($LASTEXITCODE -eq 0) { return "$result".Trim() }
}

function Start-LocalEngine {
    if ($env:DOCKER_HOST) {
        if ($env:DOCKER_HOST -notlike 'npipe:////./pipe/*') { throw 'DOCKER_HOST가 원격 데몬을 가리킵니다. 호스트 PC의 Docker Desktop 컨텍스트를 선택하세요.' }
    }
    $endpoint = & $docker context inspect --format '{{.Endpoints.docker.Host}}'
    if ($LASTEXITCODE -ne 0 -or "$endpoint".Trim() -notlike 'npipe:////./pipe/*') {
        throw '로컬 Windows 파이프를 사용하는 Docker Desktop 컨텍스트를 선택한 후 다시 실행하세요.'
    }
    $platform = Get-EnginePlatform
    if (-not $platform -and $Action -in @('start','backup','backups','list','restore')) {
        $desktop = Find-DockerFile 'Docker Desktop.exe'
        if ($desktop) { Start-Process -FilePath $desktop }
        Write-Host 'Docker 엔진 준비를 기다립니다. 최초 실행 시 Docker Desktop의 초기 설정을 완료하세요.'
        $until = (Get-Date).AddMinutes(3)
        while (-not $platform -and (Get-Date) -lt $until) {
            Start-Sleep -Seconds 3
            $platform = Get-EnginePlatform
        }
    }
    if (-not $platform) { throw '로컬 Docker 엔진에 연결할 수 없습니다. Docker Desktop에서 WSL 2 또는 Hyper-V 및 가상화 상태를 확인하세요.' }
    if ($platform -ne 'linux') { throw 'Docker Desktop을 Linux 컨테이너 모드로 전환하고 다시 실행하세요.' }
    & $docker compose version
    if ($LASTEXITCODE -ne 0) { throw 'Docker Compose v2를 포함한 Docker Desktop이 필요합니다.' }
}

function New-Secret([int]$ByteCount) {
    $bytes = New-Object byte[] $ByteCount
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
    return [BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
}

function New-PrivateStateDirectory {
    $directory = [IO.Directory]::CreateDirectory($stateDir)
    $acl = $directory.GetAccessControl()
    $acl.SetAccessRuleProtection($true, $false)
    $identities = @([Security.Principal.WindowsIdentity]::GetCurrent().User,
                    [Security.Principal.SecurityIdentifier]::new('S-1-5-18'),
                    [Security.Principal.SecurityIdentifier]::new('S-1-5-32-544'))
    foreach ($identity in $identities) {
        $rule = [Security.AccessControl.FileSystemAccessRule]::new($identity, 'FullControl', 'ContainerInherit, ObjectInherit', 'None', 'Allow')
        $acl.SetAccessRule($rule)
    }
    $directory.SetAccessControl($acl)
}

function Read-Settings {
    if (-not [IO.File]::Exists($envFile)) {
        $existing = & $docker volume ls -q --filter "label=com.docker.compose.project=$project"
        if ($LASTEXITCODE -ne 0) { throw 'Docker 볼륨을 확인하지 못했습니다.' }
        $containers = & $docker ps -aq --filter "label=com.docker.compose.project=$project"
        if ($LASTEXITCODE -ne 0) { throw '기존 Entrip 컨테이너를 확인하지 못했습니다.' }
        if ($containers -or (Test-Path -LiteralPath $dataFile) -or (Test-Path -LiteralPath $activeMarker)) {
            throw '기존 설치가 있습니다. 기존 .entrip-lan 설정과 데이터가 있는 호스트 폴더에서 실행하세요.'
        }
        if ($existing) { throw "기존 Entrip 데이터 볼륨이 있습니다. 최초 설치 폴더에서 실행하거나 원래의 .entrip-lan\server.env를 복구하세요." }
        if ($Action -ne 'start') { throw '아직 이 위치에 Entrip 서버가 설치되지 않았습니다.' }
        New-PrivateStateDirectory
        $initialPort = 3000
        if ($env:ENTRIP_LAN_PORT) { $initialPort = [int]$env:ENTRIP_LAN_PORT }
        if ($initialPort -lt 1 -or $initialPort -gt 65535) { throw 'ENTRIP_LAN_PORT는 1~65535 범위여야 합니다.' }
        $values = @("ENTRIP_LAN_PORT=$initialPort",
                    "JWT_SECRET=$(New-Secret 40)", "JWT_REFRESH_SECRET=$(New-Secret 40)",
                    'ENTRIP_COMPANY_CODE=entrip', 'ENTRIP_ADMIN_EMAIL=admin@entrip.local',
                    "ENTRIP_ADMIN_PASSWORD=$(New-Secret 16)")
        $temp = "$envFile.$PID.tmp"
        try {
            [IO.File]::WriteAllLines($temp, $values, [Text.Encoding]::ASCII)
            [IO.File]::Move($temp, $envFile)
        } finally {
            if ([IO.File]::Exists($temp)) { [IO.File]::Delete($temp) }
        }
    }
    $settings = @{}
    foreach ($line in [IO.File]::ReadAllLines($envFile)) {
        if ($line -match '^([A-Z][A-Z0-9_]*)=(.*)$') { $settings[$Matches[1]] = $Matches[2].Trim() }
    }
    foreach ($key in @('ENTRIP_LAN_PORT','JWT_SECRET','JWT_REFRESH_SECRET','ENTRIP_COMPANY_CODE','ENTRIP_ADMIN_EMAIL','ENTRIP_ADMIN_PASSWORD')) {
        if (-not $settings[$key]) { throw "저장된 서버 설정에 $key 값이 없습니다. .entrip-lan\server.env를 복구하세요." }
        [Environment]::SetEnvironmentVariable($key, $settings[$key], 'Process')
    }
    if ([int]$settings.ENTRIP_LAN_PORT -lt 1 -or [int]$settings.ENTRIP_LAN_PORT -gt 65535) { throw '저장된 포트는 1~65535 범위여야 합니다.' }
    [Environment]::SetEnvironmentVariable('POSTGRES_PASSWORD', $settings.POSTGRES_PASSWORD, 'Process')
    $hash = [Security.Cryptography.SHA256]::Create()
    try { $env:ENTRIP_HOST_ID = [BitConverter]::ToString($hash.ComputeHash([Text.Encoding]::UTF8.GetBytes($settings.JWT_SECRET))).Replace('-', '').ToLowerInvariant() }
    finally { $hash.Dispose() }
    return $settings
}

function Get-LanAddresses {
    # Prefer adapters with an active default route. Direct Ethernet and local-only Wi-Fi are also usable.
    $networks = @(Get-NetIPConfiguration -ErrorAction Stop | Where-Object { $_.NetAdapter.Status -eq 'Up' } |
        Sort-Object @{Expression={ if ($_.IPv4DefaultGateway) { 0 } else { 1 } }}, InterfaceIndex)
    foreach ($nic in $networks) {
        if ($nic.InterfaceAlias -match '^(vEthernet|DockerNAT|Loopback)' -and -not $nic.IPv4DefaultGateway) { continue }
        foreach ($ip in $nic.IPv4Address) {
            if ($ip.IPAddress -and $ip.IPAddress -notmatch '^(127\.|169\.254\.|0\.)') { $ip.IPAddress }
        }
    }
}

function Open-LanFirewall([int]$Port) {
    try {
        $name = "Entrip-LAN-TCP-$Port"
        $existing = Get-NetFirewallRule -PolicyStore ActiveStore -Name $name -ErrorAction SilentlyContinue
        if ($existing -and $existing.Enabled -eq 'True') { return }
        Write-Host "같은 서브넷에서 접속할 TCP $Port 방화벽 규칙을 추가합니다. 관리자 권한 요청이 표시될 수 있습니다."
        $helper = Join-Path $PSScriptRoot 'Open-EntripLanPort.ps1'
        $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$helper`" -Port $Port"
        $child = Start-Process -FilePath "$PSHOME\powershell.exe" -ArgumentList $arguments -Verb RunAs -Wait -PassThru
        if ($child.ExitCode -ne 0) { throw '방화벽 규칙을 설정하지 못했습니다.' }
    } catch {
        Write-Warning "Windows 방화벽 예외를 확인하지 못했습니다. 다른 PC가 접속하지 못하면 run.bat을 다시 실행해 방화벽 권한을 허용하세요. (TCP $Port / Domain,Private / LocalSubnet)"
    }
}

function Wait-ForApplication([string]$LocalUrl) {
    $until = (Get-Date).AddMinutes(4)
    do {
        try {
            $health = Invoke-RestMethod -Method Get -Uri "$LocalUrl/health" -TimeoutSec 5
            $login = Invoke-WebRequest -Method Get -Uri "$LocalUrl/login" -UseBasicParsing -TimeoutSec 10
            if ($health.status -eq 'ok' -and $login.StatusCode -eq 200 -and $login.Content -match '<title[^>]*>[^<]*Entrip') { return }
        } catch { }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $until)
    & $docker @composeArgs ps -a | Out-Host
    throw '제한 시간 내 API와 로그인 화면을 확인하지 못했습니다. run.bat status로 서비스 상태를 확인하세요.'
}

function Invoke-Compose([string[]]$Command) {
    & $docker @composeArgs @Command | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "Docker 작업에 실패했습니다. 명령: compose $($Command[0])" }
}

function Get-LegacyVolume {
    $labeled = @(& $docker volume ls -q --filter "label=com.docker.compose.project=$project" --filter 'label=com.docker.compose.volume=postgres_data')
    if ($LASTEXITCODE -ne 0) { throw '기존 PostgreSQL 볼륨을 확인하지 못했습니다.' }
    $named = @(& $docker volume ls -q --filter "name=^(${project}_postgres_data)$")
    if ($LASTEXITCODE -ne 0) { throw '기존 PostgreSQL 볼륨 이름을 확인하지 못했습니다.' }
    $volumes = @(($labeled + $named) | Where-Object { $_ } | Select-Object -Unique)
    if ($volumes.Count -gt 1) { throw '기존 PostgreSQL 볼륨이 여러 개입니다. 하나의 원본을 식별한 뒤 다시 실행하세요.' }
    if ($volumes.Count) { return $volumes[0] }
}

function Assert-Installation {
    $previous = @(& $docker ps -aq --filter "label=com.docker.compose.project=$project" --filter 'label=com.docker.compose.service=api')
    if ($LASTEXITCODE -ne 0) { throw '기존 LAN 서버를 확인하지 못했습니다.' }
    foreach ($id in $previous) {
        $labelJson = & $docker inspect --format '{{json .Config.Labels}}' $id
        if ($LASTEXITCODE -ne 0) { throw '기존 서버 설정을 확인하지 못했습니다.' }
        $labels = ConvertFrom-Json -InputObject $labelJson
        $value = $labels.'io.entrip.host-id'
        if ($value -and $value -ne $env:ENTRIP_HOST_ID) {
            throw '다른 Entrip 설치가 이 PC에서 같은 프로젝트 이름을 사용합니다. 기존 설치 위치에서 실행하세요.'
        }
    }
}

function Set-SqliteActive {
    [IO.File]::WriteAllText($activeMarker, 'sqlite', [Text.Encoding]::ASCII)
    if ($settings.ENTRIP_SQLITE_EXPECTED -ne '1') {
        # Keep the expectation alongside the signing credentials, too. Copying only
        # server.env into an upgrade folder must not start an empty installation.
        [IO.File]::AppendAllText($envFile, "`r`nENTRIP_SQLITE_EXPECTED=1`r`n", [Text.Encoding]::ASCII)
        $settings.ENTRIP_SQLITE_EXPECTED = '1'
    }
}

function Ensure-BackupImage {
    $image = & $docker image ls -q --filter 'reference=entrip-lan-app:local' --filter 'label=io.entrip.storage=sqlite-v1'
    if ($LASTEXITCODE -ne 0) { throw '로컬 백업 도구 이미지를 확인하지 못했습니다.' }
    if (-not $image) { Invoke-Compose @('build','initialize') }
}

function Restore-Snapshot {
    if (-not $Snapshot -or [IO.Path]::GetFileName($Snapshot) -cne $Snapshot -or $Snapshot -notmatch '^entrip-[A-Za-z0-9_.-]+\.sqlite3$') {
        throw 'run.bat backups에 나온 파일명으로 run.bat restore 파일명을 실행하세요.'
    }
    if (-not (Test-Path -LiteralPath (Join-Path $backupDir $Snapshot) -PathType Leaf)) { throw '선택한 백업을 찾을 수 없습니다.' }
    if (-not $Yes) {
        Write-Host "현재 데이터베이스를 $Snapshot 시점으로 복구합니다. 서비스가 잠시 중지됩니다."
        if ((Read-Host '복구하려면 RESTORE를 입력하세요') -cne 'RESTORE') { Write-Host '복구를 취소했습니다.'; return }
    }
    Ensure-BackupImage
    Invoke-Compose @('run','--rm','--no-deps','-T','initialize','node','deploy/lan/initialize.cjs','--prepare-directories')
    $running = @(& $docker @composeArgs ps --services --status running)
    if ($LASTEXITCODE -ne 0) { throw '복구 전 실행 상태를 확인하지 못했습니다.' }
    $writers = @($running | Where-Object { $_ -eq 'api' -or $_ -eq 'backup' })
    Invoke-Compose @('stop','api','backup')
    $restoreCommand = @('run','--rm','--no-deps','-T','backup','python3','deploy/lan/sqlite/backup.py','restore','--name',$Snapshot)
    if ($ReplaceInstallation) { $restoreCommand += '--replace-installation' }
    Invoke-Compose $restoreCommand
    Invoke-Compose @('run','--rm','--no-deps','-T','initialize')
    Set-SqliteActive
    if ($writers.Count) { Invoke-Compose (@('up','-d','--no-deps') + $writers) }
    Write-Host "복구 완료: $Snapshot"
}

$lock = $null
try {
    Set-Location -LiteralPath $root
    $drive = [IO.DriveInfo]::new([IO.Path]::GetPathRoot($root))
    if ($root.StartsWith('\\') -or $drive.DriveType -eq 'Network') { throw '서버 ZIP을 이 PC의 로컬 디스크에 풀어 실행하세요. 직원 PC는 브라우저로 접속합니다.' }
    if (($Snapshot -or $Yes -or $ReplaceInstallation) -and $Action -ne 'restore') { throw '백업 파일명과 복구 옵션은 restore 명령에만 사용할 수 있습니다.' }
    if (-not [IO.File]::Exists($composeFile)) { throw 'compose.lan.yml 파일이 없습니다. ZIP 전체를 로컬 폴더에 압축 해제하세요.' }
    $lock = [Threading.Mutex]::new($false, 'Global\Entrip-Lan-Startup')
    try { $acquired = $lock.WaitOne(0) } catch [Threading.AbandonedMutexException] { $acquired = $true }
    if (-not $acquired) { throw '다른 Entrip 실행기가 작업 중입니다. 해당 창을 확인하세요.' }
    $docker = Resolve-Docker
    Start-LocalEngine
    $settings = Read-Settings
    Assert-Installation
    $port = [int]$settings.ENTRIP_LAN_PORT
    $addresses = @(Get-LanAddresses | Select-Object -Unique)
    $env:ENTRIP_LAN_HOST = if ($addresses.Count) { $addresses[0] } else { '127.0.0.1' }
    $origins = @('localhost','127.0.0.1') + $addresses
    $portSuffix = if ($port -eq 80) { '' } else { ":$port" }
    $env:ENTRIP_LAN_ORIGINS = ($origins | ForEach-Object { "http://$_$portSuffix" }) -join ','
    $composeArgs = @('compose', '--project-name', $project, '--env-file', $envFile, '-f', $composeFile)
    $legacy = Get-LegacyVolume
    if ($legacy) { $env:ENTRIP_LEGACY_VOLUME = $legacy }
    $env:ENTRIP_IMPORT_POSTGRES = 'false'
    if ($Action -eq 'status') {
        Invoke-Compose @('ps','-a')
        Write-Host "호스트 DB: $dataFile"
        Write-Host "호스트 백업: $backupDir"
        exit 0
    }
    if ($Action -eq 'stop') {
        Invoke-Compose @('stop')
        if ($legacy) { Invoke-Compose @('--profile','migrate','stop','postgres') }
        exit 0
    }
    if ($Action -in @('backup','backups','list')) {
        if (-not (Test-Path -LiteralPath $dataFile) -and $Action -eq 'backup') { throw '백업할 데이터베이스가 없습니다.' }
        Ensure-BackupImage
        $verb = if ($Action -eq 'backup') { 'backup' } else { 'list' }
        Invoke-Compose @('run','--rm','--no-deps','-T','backup','python3','deploy/lan/sqlite/backup.py',$verb)
        Write-Host "호스트 백업: $backupDir"
        exit 0
    }
    if ($Action -eq 'restore') { Restore-Snapshot; exit 0 }
    $sqliteExpected = (Test-Path -LiteralPath $activeMarker) -or $settings.ENTRIP_SQLITE_EXPECTED -eq '1'
    if ($sqliteExpected -and -not (Test-Path -LiteralPath $dataFile)) {
        throw '기존 SQLite 파일을 찾지 못했습니다. run.bat backups로 버전을 조회하고 run.bat restore 파일명으로 복구하세요.'
    }
    Write-Host '서버를 준비합니다. 최초 실행은 이미지 및 패키지 다운로드와 빌드로 시간이 걸립니다.'
    Invoke-Compose @('build')
    # Build first so a failed download cannot interrupt the running service. Quiesce
    # every application writer before importing, migrating or restarting SQLite.
    Invoke-Compose @('stop','api','backup')
    if ($legacy -and -not $sqliteExpected) {
        Write-Host '기존 PostgreSQL 볼륨을 확인했습니다. 원본을 보존한 상태로 데이터를 검증해 SQLite로 이전합니다.'
        try {
            if (-not (Test-Path -LiteralPath $dataFile)) {
                if (-not $settings.POSTGRES_PASSWORD) { throw '이전 PostgreSQL 설치의 원래 .entrip-lan\server.env를 복구하세요.' }
                Invoke-Compose @('--profile','migrate','up','-d','--wait','postgres')
            }
            Invoke-Compose @('run','--rm','--no-deps','-T','-e','ENTRIP_IMPORT_POSTGRES=true','initialize')
        } finally {
            Invoke-Compose @('--profile','migrate','stop','postgres')
        }
    }
    Invoke-Compose @('up','--no-build','-d')
    $localUrl = "http://127.0.0.1:$port"
    Wait-ForApplication $localUrl
    Set-SqliteActive
    Write-Host "호스트 DB: $dataFile"
    Write-Host "호스트 백업: $backupDir"
    if ($addresses.Count) { Open-LanFirewall $port }
    Write-Host "이 PC 접속: $localUrl"
    foreach ($address in $addresses) {
        $lanUrl = "http://${address}$portSuffix"
        try {
            $health = Invoke-RestMethod -Method Get -Uri "$lanUrl/health" -TimeoutSec 4
            if ($health.status -ne 'ok') { throw 'Unexpected gateway response' }
            Write-Host "같은 네트워크에서 접속: $lanUrl"
        } catch {
            Write-Warning "이 PC에서 LAN 주소 응답을 확인하지 못했습니다: $lanUrl. Windows 네트워크 프로필과 방화벽에서 이 포트를 확인하세요."
        }
    }
    if (-not $addresses.Count) { Write-Warning 'LAN IPv4 주소가 없습니다. 유선 또는 Wi-Fi에 연결한 뒤 run.bat을 다시 실행하세요.' }
    if (-not [IO.File]::Exists($loginFile)) {
        [IO.File]::WriteAllLines($loginFile, @("Company: $($settings.ENTRIP_COMPANY_CODE)", "Email: $($settings.ENTRIP_ADMIN_EMAIL)", "Initial password: $($settings.ENTRIP_ADMIN_PASSWORD)"), [Text.Encoding]::ASCII)
    }
    Write-Host "최초 관리자 로그인 정보: $loginFile"
    Write-Host '서버가 실행 중입니다. 이 창을 닫아도 계속 동작합니다. 중지하려면 run.bat stop을 실행하세요.'
    try { Start-Process -FilePath "$localUrl/login" } catch { Write-Warning "브라우저에서 $localUrl/login 을 여세요." }
} catch {
    Write-Host "[Entrip] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    if ($lock) {
        if ($acquired) { $lock.ReleaseMutex() }
        $lock.Dispose()
    }
}
