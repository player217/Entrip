# MCP 자동 설치 및 설정 가이드

이 문서는 MCP 서버를 자동으로 설치/연결하기 위한 최소 설정 방법을 정리합니다. agents.md의 요약본을 실무 절차 중심으로 재구성했습니다.

## 1) 사전 확인
- OS/쉘 환경 확인: Windows PowerShell, WSL(Ubuntu), macOS, Linux 중 어디에서 동작하는지 파악합니다.
- Docker/Node/Pnpm 설치 여부 확인(컨테이너 우선 권장).

## 2) 설정 파일 위치
- Windows(네이티브): `C:\\Users\\<사용자명>\\.codex\\config.toml`
- WSL/Linux/macOS: `~/.codex/config.toml`

> 파일/디렉터리가 없으면 먼저 디렉터리를 생성하세요: `mkdir -p ~/.codex`

## 3) 기본 예시 설정 (~/.codex/config.toml)
```toml
[mcp_servers.brightData]
command = "npx"
args    = ["-y", "@brightdata/mcp"]
env     = { API_TOKEN = "bd_your_api_key_here" }

[mcp_servers.playwright]
command = "npx"
args    = ["@playwright/mcp@latest"]
```

## 4) 설치/연결 확인
PowerShell(Windows) 또는 셸(WSL/macOS/Linux)에서 다음을 실행해 로그를 확인합니다:
```powershell
$env:RUST_LOG="codex=debug"; codex "/mcp"
```

## 5) 보안/키 관리
- 실제 배포 전까지 문서의 API 키 값은 더미(가짜)로 설정하고, 운영 시에만 올바른 값을 입력하세요.
- 요청받은 MCP만 설치합니다(이미 설치된 MCP 오류가 보여도 무시).

## 6) 자동 설정 스크립트 사용(선택)
레포에 포함된 스크립트를 사용하면 사용자 홈 디렉터리에 기본 설정 파일을 생성합니다.
```bash
bash scripts/setup-mcp-config.sh --provider brightData --api-token bd_XXXX --yes
```

옵션:
- `--provider <name>`: brightData | playwright (복수 호출 가능)
- `--api-token <token>`: brightData API 토큰
- `--yes`: 프롬프트 없이 진행

스크립트는 기존 `~/.codex/config.toml`가 있을 경우 백업(`config.toml.bak`) 후 병합/추가합니다.

---
- 문제가 있으면 agents.md의 MCP 섹션을 먼저 확인하세요.
- Windows PowerShell을 사용할 경우, 관리자 권한 또는 실행 정책(ExecutionPolicy)으로 인해 실패할 수 있으니 `Set-ExecutionPolicy Bypass -Scope Process`로 일시 완화 후 재실행하세요.

