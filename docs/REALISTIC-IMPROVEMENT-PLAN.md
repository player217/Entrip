# Entrip 현실적 개선 계획서

## 📊 현재 상황 분석 (2025-09-17)

### ✅ 작동 중
- **API v1**: http://localhost:4001 (정상)
- **Database**: 사용자 시딩 완료, 로그인 가능
- **Strangler Fig Router**: 구현 완료, Phase 2 설정

### ❌ 작동 안함
- **API v2**: http://localhost:4002 (404 오류)
- **Web App**: http://localhost:3000 (연결 불가)
- **Prisma Generation**: Windows 파일 잠금 문제

### 🎯 **핵심 문제**: 개발 환경이 불완전한 상태

## 🔴 즉시 해결 계획 (Priority 1)

### 1. 개발 환경 복구 (Today)

#### 1.1 Web App 시작
```powershell
# 현재 디렉토리에서
cd apps/web
pnpm dev
```
**목표**: 3000 포트에서 웹앱 접근 가능

#### 1.2 API v2 헬스체크 수정
```typescript
// packages/api/src/routes/health/health.controller.ts
export const healthCheck = (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    environment: process.env.NODE_ENV || "development"
  });
};

// packages/api/src/routes/index.ts
import { healthCheck } from './health/health.controller';

router.get('/health', healthCheck);  // /api/health가 아닌 /health로 등록
```

#### 1.3 통합 테스트
```bash
# 모든 서비스가 작동하는지 확인
curl http://localhost:3000      # Web App
curl http://localhost:4001/api/health  # API v1
curl http://localhost:4002/health      # API v2 (수정 후)
```

## 🟡 핵심 개선 계획 (Priority 2)

### 2. Prisma 문제 근본 해결 (This Week)

#### 2.1 WSL2 기반 개발 환경 전환 (권장)
```powershell
# WSL2 설치 및 Ubuntu 설정
wsl --install -d Ubuntu-22.04
wsl --set-version Ubuntu-22.04 2

# WSL 내부에서 프로젝트 설정
cd /mnt/c/Users/PC/Documents/project/Entrip
sudo apt update
sudo apt install nodejs npm
npm install -g pnpm
pnpm install
pnpm prisma:generate  # Windows 파일 잠금 문제 없음
```

**장점**: Prisma 바이너리 문제 완전 해결, 리눅스 네이티브 성능

#### 2.2 대안: Docker Workspace 사용
```yaml
# docker-compose.workspace.yml
version: '3.8'
services:
  workspace:
    image: node:18-alpine
    volumes:
      - .:/workspace
      - /workspace/node_modules
    working_dir: /workspace
    command: sh
    stdin_open: true
    tty: true

# 사용법
docker-compose -f docker-compose.workspace.yml run workspace
# 컨테이너 내부에서: pnpm prisma:generate
```

### 3. 기존 구조와 통합된 관리 도구

#### 3.1 현실적 PowerShell 스크립트
```powershell
# scripts/dev.ps1 - 기존 워크플로우 존중
param(
    [string]$Action = "start",
    [switch]$WSL
)

function Start-DevServices {
    if ($WSL) {
        # WSL에서 실행
        wsl -d Ubuntu-22.04 "cd /mnt/c/Users/PC/Documents/project/Entrip && pnpm dev"
    } else {
        # Windows 네이티브 (현재 방식)
        Write-Host "Starting services on Windows..."
        Start-Process -NoNewWindow powershell -ArgumentList "cd '$PWD/apps/web'; pnpm dev"
        Start-Process -NoNewWindow powershell -ArgumentList "cd '$PWD/apps/api'; pnpm dev"
        Start-Process -NoNewWindow powershell -ArgumentList "cd '$PWD/packages/api'; pnpm dev"
    }
}

function Stop-DevServices {
    Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "All Node.js processes stopped"
}

function Test-Services {
    $services = @{
        "Web App" = "http://localhost:3000"
        "API v1" = "http://localhost:4001/api/health"
        "API v2" = "http://localhost:4002/health"
    }

    foreach ($name in $services.Keys) {
        try {
            $response = Invoke-RestMethod -Uri $services[$name] -TimeoutSec 3
            Write-Host "✅ $name: Running" -ForegroundColor Green
        } catch {
            Write-Host "❌ $name: Not responding" -ForegroundColor Red
        }
    }
}

switch ($Action) {
    "start" { Start-DevServices }
    "stop" { Stop-DevServices }
    "test" { Test-Services }
    "status" { Test-Services }
}
```

## 🟢 중기 개선 계획 (Priority 3)

### 4. Docker 환경 통합 (Next Week)

#### 4.1 기존 docker-compose.local.yml 개선
```yaml
# 현재 파일에 서비스 추가만 진행
services:
  # 기존 postgres, api, web 유지

  # v2 API 추가
  api-v2:
    build:
      context: .
      dockerfile: packages/api/Dockerfile.dev
    container_name: entrip-api-v2-local
    environment:
      DATABASE_URL: postgresql://entrip:entrip@postgres:5432/entrip
      PORT: 4000
    ports:
      - "4002:4000"
    depends_on:
      postgres:
        condition: service_healthy

  # Redis 추가 (필요시)
  redis:
    image: redis:7-alpine
    container_name: entrip-redis-local
    ports:
      - "6379:6379"
```

### 5. CI/CD 최소화 버전

#### 5.1 GitHub Actions 기본 설정
```yaml
# .github/workflows/basic-ci.yml
name: Basic CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: entrip
          POSTGRES_PASSWORD: entrip
          POSTGRES_DB: entrip_test
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Generate Prisma Client
        run: pnpm prisma:generate

      - name: Run tests
        run: pnpm test
        env:
          DATABASE_URL: postgresql://entrip:entrip@localhost:5432/entrip_test
```

## 📅 현실적 타임라인

### Day 1 (오늘)
- [ ] Web app 시작 (pnpm dev)
- [ ] API v2 health 엔드포인트 수정
- [ ] 모든 서비스 작동 확인

### Day 2-3 (이번 주)
- [ ] WSL2 설치 및 프로젝트 이동
- [ ] Prisma 문제 해결 검증
- [ ] PowerShell 관리 스크립트 배포

### Week 2
- [ ] Docker 환경 개선
- [ ] API v2 기능 보완
- [ ] 기본 CI/CD 설정

### Week 3-4
- [ ] 성능 최적화
- [ ] 문서화 개선
- [ ] 팀 온보딩

## 🎯 성공 지표

### 즉시 목표
- ✅ 모든 개발 서비스가 로컬에서 실행
- ✅ 로그인 기능 정상 작동
- ✅ Prisma 생성 에러 0건

### 단기 목표
- 개발 환경 구축 시간: 2시간 → 10분
- Prisma 관련 오류: 100% → 0%
- API v2 기본 기능 완성

### 중기 목표
- CI/CD 파이프라인 안정성: 95%+
- 팀 개발 생산성: 30% 향상
- 배포 자동화 완성

## 💡 핵심 원칙

1. **점진적 개선**: 한 번에 모든 것을 바꾸지 않음
2. **기존 존중**: 현재 팀의 워크플로우를 최대한 보존
3. **실용적 접근**: 완벽함보다는 작동하는 해결책 우선
4. **검증 우선**: 각 단계마다 정상 작동 확인

## 🚨 위험 요소 및 대응

### 위험 1: WSL2 전환 복잡성
**대응**: Docker workspace 대안 준비

### 위험 2: 팀원 저항
**대응**: 선택적 적용, 강제하지 않음

### 위험 3: 기존 환경 파괴
**대응**: 백업 후 진행, 롤백 계획 수립

---

**작성일**: 2025-09-17
**현재 상황**: API v1 작동, Web/v2 미작동
**첫 번째 목표**: 완전한 개발 환경 복구