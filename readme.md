# Entrip - 여행사 통합 관리 시스템

![coverage](./coverage/coverage-badge.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)

## 개요
Entrip은 여행사의 예약 관리, 결재, 계좌 관리, 통계 등 업무 전반을 관리하는 종합 솔루션입니다.

## 주요 기능
- 📅 **예약 관리**: 캘린더/리스트 뷰, 예약 등록/수정
- 💰 **정산 관리**: 입출금 내역, 수익률 계산
- 📊 **통계 대시보드**: 실시간 운영 현황, 매출 분석
- ✅ **결재 시스템**: 전자 결재, 이체 집행
- 💬 **커뮤니케이션**: 실시간 메신저, 메일 연동
- 🌍 **부가 기능**: 환율 정보, 항공 노선 검색, 지도 연동

## 기술 스택
- **Frontend**: React 18, TypeScript, Next.js 14
- **Backend**: Express, TypeScript, Swagger UI
- **UI**: Tailwind CSS, 자체 디자인 시스템
- **상태 관리**: Zustand
- **차트**: Recharts
- **빌드 도구**: Turborepo, pnpm workspaces
- **개발 도구**: Storybook, ESLint, Prettier

## 시작하기

### 필수 요구사항
- Node.js 18.0.0 이상
- pnpm 8.0.0 이상

### 설치
```bash
# 저장소 클론
git clone https://github.com/player217/Entrip.git
cd Entrip

# 의존성 설치
pnpm install

# 디자인 토큰 빌드
pnpm run build:tokens
```

### 🚀 Quick Start

#### 모든 서비스 한 번에 시작
```bash
# npm-run-all을 사용한 병렬 실행
pnpm dev:all

# 또는 PowerShell 스크립트 사용 (Windows)
.\scripts\dev.ps1 start
```

#### 서비스 확인
- 🌐 **Web App**: http://localhost:3000
- 🔧 **API v1**: http://localhost:4001/api/health
- 🆕 **API v2**: http://localhost:4002/api/v2/health
- 📚 **Storybook**: http://localhost:6006 (별도 실행: `pnpm storybook`)

#### 개별 서비스 실행
```bash
pnpm dev:web        # 웹 애플리케이션
pnpm dev:api-v1     # API v1 (레거시)
pnpm dev:api-v2     # API v2 (신규)
```

#### 상태 확인
```bash
# Node.js 스크립트
pnpm status

# 또는 PowerShell
.\scripts\dev.ps1 status
```

#### Prisma 문제 해결
```bash
# Windows에서 파일 잠금 문제 발생 시
pnpm fix:prisma

# 또는 WSL 사용 (권장)
wsl
cd /mnt/c/Users/PC/Documents/project/Entrip
pnpm prisma:generate
```

#### 모든 서비스 중지
```bash
.\scripts\dev.ps1 stop
```

## API 문서

API 문서는 개발 환경에서 Swagger UI를 통해 제공됩니다:

```bash
# API 서버 시작
pnpm dev:api

# Swagger UI 접속
http://localhost:4000/docs
```

**참고**: Swagger UI는 개발 환경(`NODE_ENV !== 'production'`)에서만 활성화됩니다.

## 프로젝트 구조
```
Entrip/
├── apps/
│   ├── web/                   # Next.js 메인 애플리케이션
│   └── api/                   # Express API 서버
├── packages/
│   ├── design-tokens/        # 디자인 토큰 시스템
│   ├── ui/                   # 공통 UI 컴포넌트
│   └── shared/               # 공유 유틸리티, 타입
├── .github/workflows/        # CI/CD 설정
├── .storybook/               # Storybook 설정
└── docs/                     # 개발 문서
```

## 개발 현황

### 완료된 작업 ✅
- [x] 프로젝트 구조 설정 (Turborepo)
- [x] 디자인 토큰 시스템
- [x] 기본 UI 컴포넌트 (Button, Input, Card)
- [x] 복합 컴포넌트 (ChartCard, DataGrid, CalendarMonth)
- [x] Storybook 설정
- [x] TypeScript, ESLint, Prettier 설정
- [x] Express API 서버 구축
- [x] Swagger UI 통합 (개발환경)
- [x] GitHub Actions CI/CD

### 진행 예정 📋
- [ ] JWT 인증 시스템
- [ ] 대시보드 페이지
- [ ] 예약 관리 기능
- [ ] 결재 시스템
- [ ] 데이터베이스 연동
- [ ] 실시간 기능 (WebSocket)

## 기여하기
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 라이선스
이 프로젝트는 비공개 프로젝트입니다.

## 문의
프로젝트 관련 문의사항은 Issues를 통해 남겨주세요.
