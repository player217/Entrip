#Requires -Version 5.1
[CmdletBinding()]
param([ValidateSet('start','stop','status','help')][string]$Action = 'start')

$ErrorActionPreference = 'Stop'
$project = 'entrip-lan'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$composeFile = Join-Path $root 'compose.lan.yml'
$stateDir = Join-Path $root '.entrip-lan'
$envFile = Join-Path $stateDir 'server.env'
$loginFile = Join-Path $stateDir 'first-login.txt'

if ($Action -eq 'help') {
    Write-Host 'run.bat          Start Entrip and open the login page'
    Write-Host 'run.bat status   Show local server status'
    Write-Host 'run.bat stop     Stop services and preserve stored data'
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
    if (-not $platform -and $Action -eq 'start') {
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
        if ($existing) { throw "기존 Entrip 데이터 볼륨이 있습니다. 최초 설치 폴더에서 실행하거나 원래의 .entrip-lan\server.env를 복구하세요." }
        if ($Action -ne 'start') { throw '아직 이 위치에 Entrip 서버가 설치되지 않았습니다.' }
        New-PrivateStateDirectory
        $initialPort = 3000
        if ($env:ENTRIP_LAN_PORT) { $initialPort = [int]$env:ENTRIP_LAN_PORT }
        if ($initialPort -lt 1 -or $initialPort -gt 65535) { throw 'ENTRIP_LAN_PORT는 1~65535 범위여야 합니다.' }
        $values = @("ENTRIP_LAN_PORT=$initialPort", "POSTGRES_PASSWORD=$(New-Secret 24)",
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
    foreach ($key in @('ENTRIP_LAN_PORT','POSTGRES_PASSWORD','JWT_SECRET','JWT_REFRESH_SECRET','ENTRIP_COMPANY_CODE','ENTRIP_ADMIN_EMAIL','ENTRIP_ADMIN_PASSWORD')) {
        if (-not $settings[$key]) { throw "저장된 서버 설정에 $key 값이 없습니다. .entrip-lan\server.env를 복구하세요." }
        [Environment]::SetEnvironmentVariable($key, $settings[$key], 'Process')
    }
    if ([int]$settings.ENTRIP_LAN_PORT -lt 1 -or [int]$settings.ENTRIP_LAN_PORT -gt 65535) { throw '저장된 포트는 1~65535 범위여야 합니다.' }
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

$lock = $null
try {
    Set-Location -LiteralPath $root
    if (-not [IO.File]::Exists($composeFile)) { throw 'compose.lan.yml 파일이 없습니다. ZIP 전체를 로컬 폴더에 압축 해제하세요.' }
    $lock = [Threading.Mutex]::new($false, 'Local\Entrip-Lan-Startup')
    try { $acquired = $lock.WaitOne(0) } catch [Threading.AbandonedMutexException] { $acquired = $true }
    if (-not $acquired) { throw '다른 Entrip 실행기가 작업 중입니다. 해당 창을 확인하세요.' }
    $docker = Resolve-Docker
    Start-LocalEngine
    $settings = Read-Settings
    $port = [int]$settings.ENTRIP_LAN_PORT
    $addresses = @(Get-LanAddresses | Select-Object -Unique)
    $env:ENTRIP_LAN_HOST = if ($addresses.Count) { $addresses[0] } else { '127.0.0.1' }
    $origins = @('localhost','127.0.0.1') + $addresses
    $portSuffix = if ($port -eq 80) { '' } else { ":$port" }
    $env:ENTRIP_LAN_ORIGINS = ($origins | ForEach-Object { "http://$_$portSuffix" }) -join ','
    $composeArgs = @('compose', '--project-name', $project, '--env-file', $envFile, '-f', $composeFile)
    if ($Action -eq 'status') {
        & $docker @composeArgs ps -a
        exit $LASTEXITCODE
    }
    if ($Action -eq 'stop') {
        & $docker @composeArgs stop
        exit $LASTEXITCODE
    }
    Write-Host '서버를 준비합니다. 최초 실행은 이미지 및 패키지 다운로드와 빌드로 시간이 걸립니다.'
    & $docker @composeArgs up --build -d
    if ($LASTEXITCODE -ne 0) {
        & $docker @composeArgs ps -a | Out-Host
        throw "서버 시작에 실패했습니다. 위 오류를 확인하세요. 포트가 사용 중이면 .entrip-lan\server.env 의 ENTRIP_LAN_PORT를 수정한 뒤 다시 실행하세요."
    }
    $localUrl = "http://127.0.0.1:$port"
    Wait-ForApplication $localUrl
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
