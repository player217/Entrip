# SuperClaude Entry Point

@COMMANDS.md
@FLAGS.md
@PRINCIPLES.md
@RULES.md
@MCP.md
@PERSONAS.md
@ORCHESTRATOR.md
@MODES.md

# Entrip Project Structure Reference

## 🚀 Git 푸시 가이드

### 원격 저장소에 푸시할 때
원격 저장소에 푸시할 때, 먼저 HTTP 버퍼 크기를 늘리고 조금씩 나누어 푸시할 것. 에러 시 작은 변경사항만 포함하는 새 커밋을 만들어 푸시할 것.

```bash
# Git HTTP 설정 (글로벌 적용)
# HTTP 버퍼 크기: 500MB로 증가
git config --global http.postBuffer 524288000

# 느린 연결 허용: 1KB/s
git config --global http.lowSpeedLimit 1000

# 타임아웃: 10분
git config --global http.lowSpeedTime 600

# 작은 커밋으로 나누어 푸시
git push origin main
```

### GitHub CLI 사용
GitHub CLI 설치했어. gh 명령어 사용 가능해. 이걸로 GitHub 처리해줘.
(https://cli.github.com 에서 GitHub CLI 설치하시면 원활히 GitHub 작동됩니다. 영상에서는 빠져있지만, 이 설정 추천드립니다.)

```bash
# GitHub CLI로 PR 생성, 이슈 관리 등 가능
gh pr create
gh issue list
gh repo view
```

### Git 저장소 관리 규칙
- **.git이 존재하지 않으면 Git 저장소 초기화할 것** (`git init`)
- **파일 생성 또는 수정 시**: 파일 생성 또는 수정한 후, `git add`와 `commit` 수행할 것
- **파일 삭제 시**: `git rm` 및 `commit` 사용할 것

```bash
# Git 저장소 확인 및 초기화
if [ ! -d ".git" ]; then
  git init
fi

# 파일 작업 후 커밋
git add .
git commit -m "설명적인 커밋 메시지"

# 파일 삭제 시
git rm <파일명>
git commit -m "Remove <파일명>"
```

## ⚠️ CRITICAL: File Duplicate Prevention

**NEVER DELETE FILES WITHOUT COMPLETE ANALYSIS**

Many files appear to be "duplicates" but serve completely different purposes:

### API Client Files - **각각 다른 목적**

1. **`packages/shared/src/lib/apiClient.ts`** (공유 표준)
   - 워크스페이스 전체 공유 클라이언트
   - API_ENDPOINTS 객체 포함
   - handleApiError 함수 제공
   - accessToken 기반 인증

2. **`apps/web/src/lib/axios.ts`** (웹앱 프록시)
   - Next.js API 라우트 프록시 사용 (`baseURL: '/'`)
   - Docker 네트워킹 문제 해결 핵심
   - auth-token 기반, withCredentials: true
   - 401 → 자동 /login 리다이렉트

3. **`apps/web/lib/api.ts`** (개발 임시)
   - localhost:4001 직접 연결 (개발용)
   - 401 리다이렉트 비활성화
   - TEMPORARY 파일

4. **`apps/web/src/lib/api.ts`** (프로덕션)
   - HttpOnly 쿠키 기반 인증
   - middleware.ts 리다이렉트 처리
   - 중복 리다이렉트 방지

### useBookings Hook - **두 가지 구현**

1. **`packages/shared/src/hooks/useBookings.ts`** (표준 SWR)
   - apiClient 사용
   - API_ENDPOINTS 사용
   - useSWRMutation 패턴
   - 완전한 CRUD

2. **`apps/web/src/hooks/useBookings.ts`** (웹앱 확장)
   - axiosInstance (프록시) 사용
   - WebSocket 실시간 업데이트 통합
   - 디버깅 기능 추가
   - socket 이벤트 구독

## 🏗️ Project Architecture Overview

### Monorepo Structure (pnpm + Turbo)
```
Entrip/ (v0.1.0-rc.1)
├── apps/api/        @entrip/api-legacy - 프로덕션 API (현재 운영)
├── apps/web/        @entrip/web - Next.js 14.1.0 프론트엔드
├── packages/api/    @entrip/api - 새로운 API 구조 (개발 중)
├── packages/shared/ @entrip/shared - 공통 타입, API 클라이언트, 훅
├── packages/ui/     @entrip/ui - UI 컴포넌트 라이브러리
└── packages/design-tokens/ @entrip/design-tokens - 디자인 토큰
```

### ⚠️ 이중 API 구조 - 마이그레이션 진행 중
```
현재 상황: apps/api (레거시) → packages/api (새 구조)로 점진적 이전

apps/api (@entrip/api-legacy):
- 2025-07-14부터 프로덕션 운영
- WebSocket, 메시징 시스템 포함
- 16개 Prisma 모델 (복잡한 구조)
- Docker 컨테이너로 실행 중

packages/api (@entrip/api):  
- 2025-07-13 개발 시작
- DDD/Clean Architecture
- 6개 Prisma 모델 (핵심만)
- 테스트 커버리지 포함
```

### Build Sequence
```
1. packages/design-tokens → CSS variables
2. packages/ui → Component library  
3. packages/shared → Business logic
4. apps/web → Web application
5. apps/api → API server
```

### Critical TypeScript Path
```json
// packages/ui/package.json
{
  "types": "./dist/src/index.d.ts"  // ⚠️ 틀리면 148개 타입 에러!
}
```

### Docker Networking Solution
```
Browser → Next.js API Routes (/api/*) → Docker API (http://api:4000)
```
- `apps/web/app/api/bookings/route.ts` - 예약 API 프록시
- `apps/web/app/api/exchange/route.ts` - 환율 API 프록시

### Database Schema (Prisma)
```prisma
model User {
  companyCode String  // 회사별 구분 (필수)
  role        UserRole
}

model Booking {
  companyCode String  // 회사별 구분 (필수)
  status      BookingStatus
}
```

## 🚨 File Deletion Rules

**BEFORE DELETING ANY FILE:**

1. **Read the complete file** to understand its purpose
2. **Compare functionality**, not just similar names
3. **Check imports** - what depends on this file?
4. **Verify environment usage** - dev vs prod vs Docker
5. **Confirm authentication method** - token vs cookie vs proxy
6. **Test after deletion** - does everything still work?

**NEVER DELETE:**
- API client files (각각 다른 환경/인증)
- Hook files (표준 vs 확장 버전)
- Proxy routes (Docker 네트워킹 필수)
- Type declaration files (빌드 에러 방지)

**Remember: Every file serves a unique purpose in this monorepo!**

---

## 📊 Entrip 프로젝트 심층 분석 (2025-08-24)

### 🎯 분석 계획 및 진행 상황
```
Phase 1: 전체 아키텍처 분석 ✅ 완료
Phase 2: Backend 시스템 분석 ✅ 완료  
Phase 3: Frontend 시스템 분석 ⏳ 대기
Phase 4: 공유 라이브러리 분석 ⏳ 대기
Phase 5: 통합 패턴 분석 ⏳ 대기
Phase 6: 문제점 및 개선 기회 ⏳ 대기
```

### 📈 1단계: 전체 아키텍처 분석 결과

#### 의존성 그래프
```
@entrip/web → @entrip/shared, @entrip/ui, @entrip/design-tokens
@entrip/api-legacy → @entrip/shared
@entrip/ui → @entrip/design-tokens
@entrip/api (새 버전) → 독립적 (마이그레이션 중)
```

#### Docker 컨테이너 구성
```
entrip-web-local     :3000      → Next.js (apps/web)
entrip-api-local     :4001→4000 → Express (apps/api 사용)
entrip-postgres-local:5432      → PostgreSQL
entrip-crawler-local :8001      → Python FastAPI 크롤러
```

#### 핵심 발견: 이름과 실제의 불일치
- `@entrip/api` (packages/api) = 새 버전 (개발 중)
- `@entrip/api-legacy` (apps/api) = 현재 프로덕션
- **postinstall이 packages/api를 참조하나 Docker는 apps/api 사용**

### 🔧 2단계: Backend 시스템 분석 결과

#### API 시스템 비교표
| 구분 | apps/api (프로덕션) | packages/api (새 구조) |
|------|-------------------|---------------------|
| 아키텍처 | 플랫 구조 | DDD/Clean Architecture |
| 라우트 | 9개 단일 파일 | 6개 도메인 폴더 |
| 테스트 | 거의 없음 | 완전한 테스트 커버리지 |
| WebSocket | ✅ 지원 | ❌ 없음 |
| 메시징 | ✅ 지원 | ❌ 없음 |
| 인증 | 쿠키 + 토큰 | 토큰 전용 |

#### 데이터베이스 모델 차이
```
apps/api:     16개 모델 (User, Booking, Message, Conversation...)
packages/api:  6개 모델 (Booking, CalendarEvent, FinanceRecord...)
```

#### WebSocket 실시간 기능 (apps/api만)
- booking:create/update/delete - 예약 실시간 동기화
- message:send/receive - 실시간 채팅
- presence:update - 온라인 상태
- flight:update - 항공편 정보 업데이트

#### Python 크롤러 시스템
```
FastAPI (:8001)
├── korean_flight_schedules.json (캐시 데이터)
├── /airport/{code}/schedule (공항별 조회)
└── real_crawler.py (실시간 크롤링)
```

### 🚀 마이그레이션 전략 추론
1. packages/api로 점진적 이전 중
2. 도메인별 마이그레이션 (accounts → bookings → ...)
3. WebSocket은 별도 서비스로 분리 예정
4. 두 시스템 병렬 운영 기간 필요

### 💻 3단계: Frontend 시스템 심층 분석 결과

#### Next.js App Router 구조
```
app/
├── (main)/           # 인증된 사용자 그룹 (15개 페이지)
│   ├── booking/      # 예약 관리
│   ├── calendar-performance/  # 캘린더 성능
│   ├── flight-schedule/       # 항공편
│   ├── reservations/          # 예약 목록
│   └── [기타 11개 라우트]
├── dashboard/        # 별도 대시보드 (legacy?)
└── login/           # 로그인 페이지
```

#### 4개 API 클라이언트 실제 사용 현황
| 클라이언트 | 경로 | 사용처 | 상태 |
|----------|------|--------|------|
| axiosInstance | src/lib/axios.ts | useBookings, SWR fetcher | ✅ 주력 |
| api | src/lib/api.ts | login, auth-store | ⚠️ 일부 |
| api | lib/api.ts | 중복 auth-store | ❌ 거의 안씀 |
| apiClient | @entrip/shared | 없음 | ❌ 미사용 |

#### 상태 관리 시스템
```typescript
Zustand Stores (3개):
1. auth-store (2개 버전 중복!)
   - lib/auth-store.ts vs src/lib/auth-store.ts
2. messenger-store (WebSocket 메시징)
3. workspace-store (UI 상태)

SWR + WebSocket 실시간 동기화:
- useBookings() + socket events
- 자동 캐시 무효화 (mutate)

React Query:
- Provider 설정됨 but 실제 사용 제한적
```

#### 캘린더 시스템 아키텍처
```
features/calendar/
├── MonthlyCalendarView  # 월간 (메인)
├── WeekView            # 주간 데스크톱
├── WeekViewMobile      # 주간 모바일
├── CalendarVirtual     # 가상화
└── components/
    ├── CalendarGrid    # 그리드
    ├── CalendarDayCell # 일별 셀
    └── ReservationBadge # 예약 배지
```

#### 발견된 주요 문제점
1. **중복 auth-store 파일** (lib vs src/lib)
2. **Build 에러 무시 설정** (ESLint, TypeScript)
3. **미들웨어 비활성화** (TEMPORARY 주석)
4. **API 클라이언트 혼재** (4개 중 1-2개만 사용)
5. **임시 데이터 변환 코드** (매니저 랜덤, 원가 계산)

### 📦 4단계: 공유 라이브러리 완전 심층 분석 결과

#### packages/shared 아키텍처 (50개 파일)
```
src/
├── types/        # 타입 정의 (6개)
├── stores/       # Zustand stores (5개)
├── hooks/        # React hooks (4개)
├── services/     # API 서비스 (2개)
├── lib/          # 라이브러리 (3개)
├── utils/        # 유틸리티 (4개)
├── data/         # 정적 데이터 (4개)
└── mocks/        # MSW mocking (3개)
```

**3-tier Export 전략**:
1. index.ts: 서버 안전 exports
2. client.ts: 클라이언트 전용 ('use client')
3. server.ts: 서버 전용

#### packages/ui 컴포넌트 시스템 (73개 컴포넌트)
```
├── primitives/ (9개): Button, Input, Card, Icon, Modal
├── compounds/ (54개): CalendarMonth/Week, DataGrid, QuickBookingModal
└── feedback/ (4개): Loader, ErrorState, Skeleton, Spinner
```

#### 타입 시스템 문제
```typescript
Booking 관련 5개 타입 중복:
1. Booking (새 구조, 19개 필드)
2. NewTeamPayload (레거시, 28개 필드)
3. LegacyBooking (호환용)
4. BookingEvent (캘린더용, 21개 필드)
5. BookingEntry (별칭)
```

#### Hook 중복 구현 문제
```typescript
// packages/shared/src/hooks/useBookings.ts
- apiClient 사용 (localhost:4000)
- API_ENDPOINTS 사용

// apps/web/src/hooks/useBookings.ts
- axiosInstance 사용 (프록시 경유)
- WebSocket 통합
```

#### 발견된 핵심 문제점
1. **apiClient 미사용**: Web 앱에서 전혀 import 안함
2. **Hook 중복**: 같은 이름 다른 구현 (useBookings)
3. **타입 시스템 혼재**: Booking 관련 5개 타입
4. **Store 분산**: shared vs web에 분산
5. **Build 전략 불일치**: ui(tsup) vs shared(tsc)

## Phase 5: Integration Patterns Deep Analysis (통합 패턴 심층 분석)

### 1. API 통합 아키텍처

#### 1.1 Web App의 4개 API 클라이언트 체계
```
1. axiosInstance (apps/web/src/lib/axios.ts)
   - Web의 주요 API 클라이언트
   - baseURL: '/' (프록시 패턴)
   - 서버 환경: http://api:4000
   - 인증: localStorage token + Bearer header
   - 401 처리: localStorage 정리만 (리다이렉트는 middleware.ts)

2. api (apps/web/src/lib/api.ts)  
   - 또 다른 axios 인스턴스
   - SSR/CSR 구분 처리
   - SSR: http://api:4000 (Docker 네트워크)
   - CSR: http://localhost:4001 (브라우저)
   - HttpOnly 쿠키 인증 (withCredentials: true)

3. fetcher (apps/web/src/lib/fetcher.ts)
   - 네이티브 fetch 기반
   - localStorage token 사용
   - 상대 경로를 절대 경로로 변환
   - FetchError 커스텀 에러 클래스

4. apiClient (packages/shared) 
   - Web에서 사용 안함!
   - shared의 hooks에서만 사용
   - Web은 자체 hooks 구현 사용
```

#### 1.2 Next.js API Routes 프록시 패턴
```
Browser → Next.js API Routes → Docker API (http://api:4000)

구현된 프록시 라우트:
- /api/bookings → apps/api:4000/api/bookings
- /api/messages/[...path] → 동적 경로 프록시
- /api/auth/login → 인증 프록시
- /api/exchange → 환율 API
- /api/health → 헬스체크
```

### 2. WebSocket 실시간 통합

#### 2.1 Socket.io 구현 (apps/web/src/lib/socket.ts)
```typescript
초기화:
- 토큰: Cookies.get('auth-token') || localStorage
- WS_URL: 
  - Server: ws://api:4000
  - Client: http://localhost:4001
- 인증: auth.token in handshake

이벤트 구독:
- booking:create/update/delete
- booking:bulk-create/bulk-delete  
- flight:delay (항공편 지연)
- watch:flight/unwatch:flight
```

#### 2.2 SWR + WebSocket 동기화
```typescript
// apps/web/src/hooks/useBookings.ts
- SWR로 초기 데이터 로드
- WebSocket 이벤트로 mutate() 호출
- 실시간 캐시 갱신
- 5개 이벤트 타입 처리
```

### 3. 인증 통합 패턴

#### 3.1 다중 인증 메커니즘
```
1. HttpOnly Cookie (주요)
   - 서버에서 설정
   - credentials: 'include'로 자동 전송
   
2. localStorage Token (보조)
   - axios interceptor에서 사용
   - Bearer header 추가
   
3. Zustand Store (상태)
   - useAuthStore 
   - persist middleware로 localStorage 동기화
   - user, isAuthenticated 상태 관리
```

#### 3.2 인증 플로우
```
로그인:
1. /api/auth/login POST
2. 서버: HttpOnly cookie 설정
3. 클라이언트: localStorage token 저장
4. Zustand: 인증 상태 업데이트

인증 확인:
1. middleware.ts: cookie 체크 (현재 비활성)
2. /api/auth/verify GET
3. 401 응답: localStorage 정리
4. 리다이렉트: middleware.ts가 단일 책임

로그아웃:
1. /api/auth/logout POST
2. 서버: cookie 제거
3. 클라이언트: localStorage, Zustand 정리
4. 리다이렉트: 현재 주석 처리 (개발 중)
```

### 4. Docker 네트워킹 패턴

#### 4.1 서비스 간 통신
```yaml
docker-compose.local.yml:
- postgres:5432 → 5432 (호스트)
- api:4000 → 4001 (호스트)
- crawler:8001 → 8001 (호스트)
- web:3000 → 3000 (호스트)

내부 네트워크:
- web → api: http://api:4000
- api → postgres: postgres://postgres:5432
- web → crawler: http://crawler:8001
```

#### 4.2 환경 변수 설정
```
Web 서비스:
- NEXT_PUBLIC_API_URL: http://localhost:4001 (브라우저)
- INTERNAL_API_URL: http://api:4000 (SSR)
- NEXT_PUBLIC_CRAWLER_API_URL: http://crawler:8001
```

### 5. 데이터 플로우 패턴

#### 5.1 패키지 간 import 패턴
```
Web이 사용하는 것:
- @entrip/shared: 타입, logger, 일부 store
- @entrip/ui: 컴포넌트
- @entrip/design-tokens: (간접 사용)

Web이 사용 안하는 것:
- @entrip/api: 전혀 import 없음
- @entrip/shared의 apiClient: 자체 구현 사용
- @entrip/shared의 useBookings: 자체 구현 사용
```

#### 5.2 상태 관리 통합
```
Zustand Stores:
- auth-store.ts (Web 자체)
- messenger-store.ts (Web 자체)  
- modalStore (shared/client)
- workspaceStore (shared/client)

SWR 캐싱:
- 예약 데이터: useBookings
- 환율 데이터: useExchangeRates
- WebSocket으로 실시간 무효화
```

### 6. 빌드 및 배포 통합

#### 6.1 Turbo 빌드 파이프라인
```json
의존성 체인:
- shared → ui → web
- shared → api (독립적)
- design-tokens → ui

빌드 출력:
- web: .next/**
- ui: dist/**
- shared: dist/**
- api: dist/**
```

#### 6.2 TypeScript Project References
```
apps/web/tsconfig.json:
- references: [shared, design-tokens, ui, api]
- composite: true (빌드 최적화)
- tsBuildInfoFile: 증분 빌드
```

### 7. 발견된 통합 패턴 특징

#### 7.1 의도적 분리
- packages/api는 완전히 독립적 (import 없음)
- Web은 shared의 일부만 선택적 사용
- 각 앱이 자체 API 클라이언트 구현

#### 7.2 중복 허용 전략
- 같은 이름의 hook 다른 구현 (useBookings)
- 4개의 API 클라이언트 공존
- 각 환경에 최적화된 구현

#### 7.3 프록시 우선 접근
- 브라우저는 항상 Next.js API Routes 경유
- Docker 네트워킹 복잡도 숨김
- CORS 문제 원천 차단

#### 7.4 실시간 동기화 보장
- WebSocket + SWR mutate 조합
- 5가지 예약 이벤트 타입 처리
- 항공편 지연 실시간 알림

### 8. 통합 패턴 평가

#### 강점
1. 명확한 관심사 분리
2. 환경별 최적화 가능
3. Docker 네트워킹 추상화
4. 실시간 동기화 완벽 구현

#### 약점
1. API 클라이언트 중복 (4개)
2. 인증 메커니즘 복잡 (cookie + token)
3. packages/api 활용도 0%
4. 같은 이름 다른 구현 혼란 가능

## Phase 6: 문제 및 개선 기회 심층 분석

### 1. 아키텍처 수준 문제점

#### 1.1 중복 구현 문제
```
심각도: 🔴 HIGH

발견된 중복:
1. useBookings hook 3개 버전
   - packages/shared/src/hooks/useBookings.ts
   - apps/web/src/hooks/useBookings.ts  
   - apps/web/src/features/bookings/api.ts

2. API 클라이언트 4개
   - axiosInstance (web)
   - api (web)
   - fetcher (web)
   - apiClient (shared - 미사용)

3. 인증 메커니즘 혼재
   - HttpOnly Cookie
   - localStorage Token
   - Zustand Store
```

#### 1.2 미완성/임시 코드
```
심각도: 🟡 MEDIUM

TEMPORARY/TODO 발견:
- middleware.ts: "TEMPORARY: Skip ALL auth checks"
- auth-store.ts: "TEMPORARY: Skip redirect for development"
- 30개 이상의 TODO 주석
- 미구현 기능들 (메신저, 환율 표시 등)
```

#### 1.3 패키지 활용도 문제
```
심각도: 🟡 MEDIUM

문제점:
- packages/api: 완전 미사용 (import 0건)
- packages/shared: 부분 사용 (apiClient 미사용)
- 공통 컴포넌트 미활용
```

### 2. 코드 품질 문제

#### 2.1 타입 안전성 문제
```
심각도: 🟡 MEDIUM

발견된 문제:
- any 타입 사용: 20+ 건
- 타입 캐스팅: as any 다수
- Booking 관련 5개 타입 혼재
  * Booking
  * NewTeamPayload
  * LegacyBooking
  * BookingEvent
  * BookingEntry
```

#### 2.2 하드코딩된 값
```
심각도: 🟡 MEDIUM

문제 영역:
- 로그인 페이지: 비밀번호 하드코딩
  password: 'pass1234'
- API URL 하드코딩
- 타임아웃 값 하드코딩 (10000ms)
```

#### 2.3 에러 처리 부재
```
심각도: 🟡 MEDIUM

문제점:
- try-catch 누락 영역 존재
- 에러 메시지 일관성 부족
- 에러 복구 전략 미흡
```

### 3. 성능 문제

#### 3.1 과도한 리렌더링
```
심각도: 🟡 MEDIUM

원인:
- WebSocket 이벤트마다 전체 mutate()
- 최적화되지 않은 useEffect
- React.memo 미사용
```

#### 3.2 번들 크기 최적화 부재
```
심각도: 🟢 LOW

현재 상태:
- 코드 스플리팅 부재
- 동적 import 미사용
- 트리 셰이킹 미최적화
```

#### 3.3 데이터 페칭 비효율
```
심각도: 🟡 MEDIUM

문제점:
- 예약 데이터 take=1000 (과도한 로드)
- 캐싱 전략 미흡
- Prefetch 미사용
```

### 4. 보안 취약점

#### 4.1 인증/인가 문제
```
심각도: 🔴 HIGH

발견된 문제:
- middleware.ts 인증 비활성화
- 토큰 검증 로직 미구현
- localStorage 토큰 노출
- 하드코딩된 비밀번호
```

#### 4.2 데이터 보호 부재
```
심각도: 🟡 MEDIUM

문제점:
- 민감 정보 로깅 (console.log)
- XSS 방어 미흡
- CSRF 보호 미구현
```

### 5. 개선 기회 및 우선순위

#### 📌 Priority 1: 보안 강화 (긴급)
```
1. middleware.ts 인증 활성화
2. 토큰 검증 로직 구현
3. 하드코딩된 비밀번호 제거
4. localStorage → HttpOnly Cookie 전환

예상 작업량: 2-3일
영향도: 🔴 CRITICAL
```

#### 📌 Priority 2: 아키텍처 정리 (중요)
```
1. API 클라이언트 통합 (4개 → 1개)
2. useBookings 통합 (3개 → 1개)
3. Booking 타입 시스템 정리
4. packages/api 활용 또는 제거

예상 작업량: 3-4일
영향도: 🟡 HIGH
```

#### 📌 Priority 3: 성능 최적화 (일반)
```
1. React.memo 적용
2. 코드 스플리팅 구현
3. SWR 캐싱 전략 개선
4. 페이지네이션 구현

예상 작업량: 2-3일
영향도: 🟡 MEDIUM
```

#### 📌 Priority 4: 코드 품질 개선 (일반)
```
1. TypeScript strict mode 적용
2. any 타입 제거
3. 에러 처리 표준화
4. 테스트 커버리지 확대

예상 작업량: 지속적
영향도: 🟢 MEDIUM
```

#### 📌 Priority 5: 기능 완성 (선택)
```
1. 메신저 기능 구현
2. 환율 표시 기능 완성
3. TODO 항목 해결
4. 미구현 UI 완성

예상 작업량: 기능별 1-2일
영향도: 🟢 LOW
```

### 6. 권장 액션 플랜

#### Phase 1 (Week 1): 보안 긴급 조치
- [ ] middleware.ts 인증 복구
- [ ] 토큰 검증 API 구현
- [ ] 하드코딩 제거

#### Phase 2 (Week 2): 핵심 아키텍처 정리
- [ ] API 클라이언트 통합
- [ ] Hook 중복 제거
- [ ] 타입 시스템 통합

#### Phase 3 (Week 3): 성능 및 품질
- [ ] 성능 최적화 적용
- [ ] TypeScript 강화
- [ ] 테스트 추가

#### Phase 4 (Week 4+): 지속적 개선
- [ ] 기능 완성
- [ ] 문서화
- [ ] 모니터링 구축

### 7. 기대 효과

#### 정량적 효과
- 보안 취약점: 5개 → 0개
- 코드 중복: 30% 감소
- 번들 크기: 20% 감소
- 타입 안전성: 95% 커버리지

#### 정성적 효과
- 유지보수성 향상
- 개발 속도 증가
- 버그 감소
- 팀 생산성 향상

---

## 💱 환율 API 시스템 통합 (2025-09-12)

### 📌 외부 환율 API 연동 완료

#### 1. 구현 사항
- **외부 API 연동**: exchangerate-api.com (Primary) / fixer.io (Secondary)
- **Resilience Pattern**: Circuit Breaker + Retry + Cache + Fallback
- **실시간 환율 제공**: KRW 기준 USD, EUR, JPY, CNY 환율

#### 2. 데이터베이스 스키마 추가
```sql
-- FxRateCache: 환율 캐시 테이블
CREATE TABLE "FxRateCache" (
  base VARCHAR(10),
  quote VARCHAR(10),
  rate DECIMAL(20,6),
  source VARCHAR(50),
  fetchedAt TIMESTAMP,
  ttlSec INTEGER
);

-- IntegrationProvider: 외부 API 제공자 관리
CREATE TABLE "IntegrationProvider" (
  name VARCHAR(50) PRIMARY KEY,
  baseUrl VARCHAR(255),
  status "ProviderStatus"
);

-- ExternalCallLog: API 호출 로그
CREATE TABLE "ExternalCallLog" (
  providerName VARCHAR(50),
  endpoint VARCHAR(255),
  method VARCHAR(10),
  statusCode INTEGER,
  errorType VARCHAR(50),
  durationMs INTEGER,
  requestHash VARCHAR(100)
);
```

#### 3. 시스템 아키텍처
```
Browser → Next.js (/api/exchange) → Backend FxService → External APIs
                                           ↓
                                    FxRateCache (DB)
```

#### 4. 임시 조치 사항 (개선 필요)
- **Direct SQL 사용**: Prisma migration 충돌로 인한 직접 SQL 실행
- **console.log 사용**: Logger가 서버 사이드에서 작동 안함
- **Next.js 빌드 캐시**: Production 빌드가 변경사항 반영 안함

#### 5. 환율 데이터 정확도
- 외부 API (exchangerate-api.com) vs 실제 은행 환율 비교
- 약 0.5-1% 차이 (정상 범위 - API는 중간 시장 환율 제공)
- 실시간 업데이트 with 24시간 캐싱

#### 6. 해결 필요 사항
1. **Prisma Migration 정상화**: schema.prisma와 DB 동기화
2. **Logger 복구**: 서버 사이드 로깅 시스템 수정
3. **Next.js 빌드**: 프로덕션 빌드 재생성으로 변경사항 반영
4. **캐싱 최적화**: TTL 및 stale-while-revalidate 전략 개선
