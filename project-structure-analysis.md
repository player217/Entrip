# Entrip 프로젝트 구조 분석 보고서

## 1. 프로젝트 개요

**프로젝트명**: Entrip  
**유형**: Monorepo (pnpm workspace)  
**주요 기술 스택**: TypeScript, Next.js 14, React 18, Prisma, Express

---

## 2. 루트 레벨 구성

### 2.1 `/package.json`
- **역할**: Monorepo 루트 패키지 정의
- **기술 스택**: pnpm workspaces, Turborepo
- **주요 스크립트**:
  - `dev`: 전체 개발 서버 실행
  - `build`: 토큰 빌드 → TypeScript 빌드 → 번들링
  - `type-check`: 전체 타입 체크
- **Workspace 구성**:
  ```json
  "workspaces": ["apps/*", "packages/*"]
  ```

### 2.2 `/tsconfig.json`
- **역할**: 프로젝트 레퍼런스 루트 설정
- **구성**:
  - Project References로 각 패키지 연결
  - 빌드 순서: design-tokens → shared → ui → api → web

### 2.3 `/tsconfig.base.json`
- **역할**: 공통 TypeScript 설정
- **주요 설정**:
  - `target`: ES2020
  - `strict`: true
  - `exactOptionalPropertyTypes`: true
  - `paths`: 패키지 별칭 설정

---

## 3. 패키지 구조

### 3.1 Design Tokens (`/packages/design-tokens`)

#### package.json
- **버전**: 0.1.0
- **빌드 도구**: Style Dictionary
- **출력**: CSS 변수, Tailwind 토큰, TypeScript 타입

#### tsconfig.json
- **특징**: 
  - `composite`: true (프로젝트 레퍼런스)
  - `declaration`: true (타입 정의 생성)
- **출력 디렉토리**: `./dist`

#### 역할
- 디자인 시스템 토큰 관리
- 색상, 간격, 타이포그래피 정의
- Tailwind CSS 설정 생성

---

### 3.2 Shared (`/packages/shared`)

#### package.json
- **버전**: 0.1.0
- **주요 의존성**: zustand, axios, date-fns, zod
- **exports**: 
  - `.`: 서버/클라이언트 공통
  - `./client`: 클라이언트 전용 (hooks, stores)

#### tsconfig.json
- **특징**:
  - `references`: design-tokens 참조
  - `verbatimModuleSyntax`: false
  - `exactOptionalPropertyTypes`: false (완화됨)

#### 주요 구성 요소

##### 타입 정의 (`/types`)
- `booking.ts`: 예약 관련 타입 (Booking, BookingEvent, BookingStatus enum)
- `booking-adapter.ts`: BookingEvent ↔ Booking 변환
- `team-booking.ts`: 팀 예약 타입
- `log.ts`: 로깅 타입

##### 서비스 (`/services`)
- `bookingService.ts`: 예약 CRUD API 호출
- `teamBookingService.ts`: 팀 예약 API 호출

##### 스토어 (`/stores`)
- `booking-store.ts`: Zustand 예약 상태 관리
- `teamBookingStore.ts`: 팀 예약 상태 관리
- `modalStore.ts`: 모달 상태 관리
- `workspaceStore.ts`: 워크스페이스/탭 관리

##### 유틸리티 (`/utils`)
- `logger.ts`: 구조화된 로깅
- `dateUtils.ts`: 날짜 포맷팅
- `priceFormatter.ts`: 가격 포맷팅

---

### 3.3 UI (`/packages/ui`)

#### package.json
- **버전**: 0.1.0
- **빌드 도구**: tsup (번들링), tsc (타입)
- **주요 의존성**: React, Radix UI, Tailwind, Recharts

#### tsconfig.json
- **문제점**: 
  - `@entrip/shared` 경로 매핑 실패
  - `noEmitOnError`: false
- **references**: shared, design-tokens

#### 컴포넌트 구조

##### Primitives (기본 컴포넌트)
- `Button.tsx`: 기본 버튼
- `Input.tsx`: 입력 필드
- `Modal.tsx`: 모달 컨테이너
- `Card.tsx`: 카드 레이아웃
- `Icon.tsx`: 아이콘 래퍼

##### Compounds (복합 컴포넌트)
- `CalendarMonth.tsx`: 월간 캘린더 (Booking[] 받음)
- `BookingModal/`: 예약 생성/수정 모달
- `QuickBookingModal/`: 빠른 예약 모달
- `StatusTag.tsx`: 상태 표시 태그
- `DataGrid.tsx`: 데이터 테이블

##### Feedback (피드백 컴포넌트)
- `Loader.tsx`: 로딩 인디케이터
- `Skeleton.tsx`: 스켈레톤 로더
- `ErrorState.tsx`: 에러 상태 표시

---

### 3.4 API (`/packages/api`)

#### package.json
- **이름**: @entrip/api-legacy
- **기술 스택**: Express, Prisma, Socket.io
- **문제**: @prisma/client가 devDependencies에 있음

#### tsconfig.json
- **특징**:
  - Prisma 타입 생성 포함
  - `skipLibCheck`: true

#### Prisma Schema
- **위치**: `/prisma/schema.prisma`
- **모델**: User, Booking, Team, Flight 등
- **enum**: BookingStatus, BookingType, UserRole

#### 주요 라우트
- `/auth`: 인증 (JWT)
- `/bookings`: 예약 CRUD
- `/flights`: 항공편 조회
- `/export`: 데이터 내보내기

---

### 3.5 Apps

#### 3.5.1 Web (`/apps/web`)

##### package.json
- **프레임워크**: Next.js 14.1.0
- **주요 기능**: 
  - App Router 사용
  - React Query (데이터 페칭)
  - SWR (일부 사용)

##### tsconfig.json
- **문제**: UI 컴포넌트 타입 인식 실패
- **특이사항**: `/src/types/ui-components.d.ts` 수동 생성

##### 주요 페이지
- `/booking`: 예약 관리
- `/calendar-performance`: 성능 테스트
- `/dashboard`: 대시보드
- `/stats`: 통계

#### 3.5.2 API (`/apps/api`)

##### package.json
- **역할**: Legacy API 서버
- **포트**: 3001
- **특징**: Express + Prisma 직접 사용

---

## 4. 타입 정의 파일 분석

### 4.1 글로벌 타입

#### `/types/global.d.ts`
```typescript
// 전역 타입 정의
declare global {
  interface Window {
    // 커스텀 전역 객체
  }
}
```

#### `/types/express-rate-limit.d.ts`
```typescript
declare module 'express-rate-limit';
```

### 4.2 생성된 타입

#### Prisma 타입
- 위치: `/packages/api/src/generated/prisma/`
- 문제: pnpm 환경에서 경로 불일치

#### API 타입
- 위치: `/packages/shared/src/generated/api.d.ts`
- 생성: OpenAPI 스키마에서 자동 생성

---

## 5. 데이터 흐름

### 5.1 타입 흐름
```
Prisma Schema → @prisma/client → API Service → Shared Types → UI Components → Web Pages
```

### 5.2 빌드 순서
```
1. design-tokens (Style Dictionary)
2. shared (TypeScript 컴파일)
3. ui (tsup 번들링)
4. api (TypeScript 컴파일)
5. web (Next.js 빌드)
```

### 5.3 문제점

#### 타입 불일치
- BookingEvent vs Booking 혼용
- BookingType enum 불일치 (GOLF 없음)
- exactOptionalPropertyTypes 충돌

#### 모듈 해석
- @entrip/shared 경로 해석 실패
- Prisma 타입 찾기 실패
- tsconfig paths 작동 안 함

#### 빌드 시스템
- 순환 의존성 가능성
- 타입 체크와 번들링 혼재
- noEmitOnError 비활성화로 인한 부분 빌드

---

## 6. 권장 개선사항

### 6.1 즉시 수정
1. @prisma/client를 dependencies로 이동
2. UI 패키지 import를 상대 경로로 변경
3. BookingType enum 통일

### 6.2 구조 개선
1. 타입 전용 패키지 분리 고려
2. 빌드 스크립트 단순화
3. Project References 재구성

### 6.3 장기 개선
1. API 패키지 통합 (legacy 제거)
2. 타입 생성 자동화
3. 모노레포 도구 최적화 (Nx 고려)

---

## 7. 하드코딩 문제 리스트

### 7.1 API 서비스 레이어 (`/apps/api/src/services/booking.service.ts`)

#### 문자열 하드코딩
- **14번 줄**: `'admin@entrip.com'` - 기본 관리자 이메일
- **20번 줄**: `'admin@entrip.com'` - 관리자 생성 이메일
- **21번 줄**: `'Admin User'` - 기본 관리자 이름
- **22번 줄**: `'hashed_password'` - 기본 비밀번호 (보안 위험!)
- **23번 줄**: `'ADMIN'` - 관리자 역할
- **34번 줄**: `'Default Team'` - 기본 팀명
- **35번 줄**: `'TBD'` - 기본 목적지
- **40번 줄**: `'KRW'` - 기본 통화
- **227번 줄**: `'PACKAGE'` - 기본 예약 타입 (enum 대신 문자열)
- **234번 줄**: `'PENDING'` - 기본 상태 (enum 대신 문자열)
- **236번 줄**: `'KRW'` - 기본 통화

#### 매직 넘버
- **8번 줄**: `BK${Date.now()}` - 예약번호 생성 패턴
- **220번 줄**: `BK${Date.now()}${Math.floor(Math.random() * 1000)}` - 벌크 예약번호
- **232번 줄**: `3` - 하드코딩된 숙박일수
- **233번 줄**: `4` - 하드코딩된 여행일수
- **96번 줄**: `10` - 기본 페이지 크기

#### 대소문자 변환
- **70번 줄**: `query.type.toUpperCase()` - enum 값 변환
- **71번 줄**: `query.status.toUpperCase()` - enum 값 변환
- **234번 줄**: `booking.status?.toUpperCase()` - enum 값 변환

### 7.2 UI 컴포넌트 하드코딩

#### 경로 하드코딩 (`/packages/ui/src/components/compounds/BookingFilters/BookingFilters.tsx`)
- **2번 줄**: `'../../../../shared/dist'` - 상대 경로 하드코딩

### 7.3 테스트 파일 하드코딩

#### 이메일/사용자 정보
- 다수 테스트 파일: `'admin@entrip.com'` - 테스트용 관리자 이메일
- E2E 테스트: `'ADMIN'` - 테스트용 역할

### 7.4 설정 파일 하드코딩

#### 포트/URL
- **swagger.ts 17번 줄**: `'http://localhost:3001/api/v1'` - 개발 서버 URL
- **swagger.ts 21번 줄**: `'https://api.entrip.co.kr/v1'` - 프로덕션 URL
- **playwright.config.ts 21번 줄**: `'http://localhost:3000'` - 테스트 baseURL
- **app.ts 9번 줄**: `3001` - 기본 포트

#### 환경 설정
- **다수 파일**: `'KRW'` - 기본 통화 코드 (총 50개 이상)

### 7.5 권장 개선사항

#### 즉시 수정 필요 (보안/중요)
1. `'hashed_password'` → 환경변수 또는 안전한 기본값
2. 관리자 이메일 → 환경변수로 관리
3. enum 문자열 하드코딩 → import한 enum 사용

#### 구조 개선 필요
1. 통화 코드 → 중앙 상수 파일로 관리
2. 기본값들 → 설정 파일로 분리
3. URL/포트 → 환경변수 사용

#### 장기 개선
1. 예약번호 생성 로직 → 전용 서비스로 분리
2. 날짜 계산 로직 → 유틸리티 함수로 추출
3. 페이지네이션 기본값 → 설정 가능하게 변경

---

## 8. 주요 파일별 입출력 데이터 상세

### 8.1 API 서비스 (`/apps/api/src/services/booking.service.ts`)

#### createBooking 함수
- **입력**: 
  ```typescript
  dto: {
    createdBy?: string;      // 생성자 ID (옵션)
    client?: string;         // 고객명 (client 또는 customerName)
    customerName?: string;   // 고객명 
    teamName?: string;       // 팀명 (기본: 'Default Team')
    destination?: string;    // 목적지 (기본: 'TBD')
    bookingType: string;     // 예약 타입 (필수)
    startDate: string;       // 출발일 (ISO 문자열)
    endDate: string;         // 도착일 (ISO 문자열)
    paxCount?: number;       // 인원수 (기본: 1)
    nights?: number;         // 숙박일수 (기본: 1)
    days?: number;           // 여행일수 (기본: 2)
    price?: number;          // 가격 (price 또는 totalPrice)
    totalPrice?: number;     // 총 가격
    currency?: string;       // 통화 (기본: 'KRW')
    notes?: string;          // 메모
    bookingStatus?: string;  // 상태 (bookingStatus 또는 status)
    status?: string;         // 상태
  }
  ```
- **출력**: Prisma Booking 객체 (생성된 예약 정보)

#### listBookings 함수
- **입력**:
  ```typescript
  query: {
    type?: string;           // 예약 타입 필터 (대소문자 무관)
    status?: string;         // 상태 필터 (대소문자 무관)
    startDate?: string;      // 출발일 필터
    client?: string;         // 고객명 필터 (부분 일치)
    keyword?: string;        // 통합 검색 (예약번호, 고객명, 팀명, 목적지)
    skip?: number;           // 페이지네이션 시작점 (기본: 0)
    take?: number;           // 페이지 크기 (기본: 10)
  }
  ```
- **출력**:
  ```typescript
  {
    data: Array<{
      ...Booking,
      client: string;        // customerName을 client로 매핑
      price: number;         // totalPrice를 price로 매핑
      user?: {               // 생성자 정보
        id: string;
        email: string;
        name: string;
        role: string;
      }
    }>,
    pagination: {
      page: number;          // 현재 페이지 (1부터 시작)
      limit: number;         // 페이지 크기
      total: number;         // 전체 개수
      totalPages: number;    // 전체 페이지 수
    }
  }
  ```

#### bulkCreateBookings 함수
- **입력**:
  ```typescript
  bookings: Array<{
    customerName: string;       // 고객명 (필수)
    teamName?: string;          // 팀명 (기본: customerName)
    bookingType?: string;       // 예약 타입 (기본: 'PACKAGE')
    destination: string;        // 목적지 (필수)
    departureDate: string;      // 출발일 (startDate로 변환)
    returnDate: string;         // 도착일 (endDate로 변환)
    numberOfPeople?: number;    // 인원수 (paxCount로 변환, 기본: 1)
    status?: string;            // 상태 (대문자 변환, 기본: 'PENDING')
    totalPrice?: number;        // 가격 (기본: 0)
    notes?: string;             // 메모 (기본: '')
  }>,
  userId: string               // 생성자 ID (필수)
  ```
- **출력**: `Array<Booking>` - 생성된 예약 객체 배열

### 8.2 UI 컴포넌트

#### BookingFilters 컴포넌트 (`/packages/ui/src/components/compounds/BookingFilters/BookingFilters.tsx`)
- **Props 입력**:
  ```typescript
  {
    filters: {
      keyword?: string;      // 통합 검색어
      client?: string;       // 고객명 필터
      type?: BookingType;    // 예약 타입 필터
      status?: BookingStatus;// 상태 필터
      dateFrom?: string;     // 시작일 필터
      dateTo?: string;       // 종료일 필터
    },
    onFiltersChange: (filters: Partial<BookingFilters>) => void,
    onReset: () => void
  }
  ```
- **이벤트 출력**: 필터 변경 시 `onFiltersChange` 콜백 호출

#### BookingList 컴포넌트 (`/packages/ui/src/components/compounds/BookingList/BookingList.tsx`)
- **Props 입력**:
  ```typescript
  {
    bookings: Array<{
      id: string;
      bookingNumber: string;
      teamName: string;
      customerName: string;
      bookingType: BookingType;
      status: BookingStatus;
      destination: string;
      startDate: string;
      endDate: string;
      paxCount: number;
      nights: number;
      days: number;
      totalPrice: number;
      depositAmount?: number;
      user?: {
        name: string;
        role: string;
      }
    }>,
    loading?: boolean,
    onEdit?: (id: string) => void,
    onDelete?: (id: string) => void,
    onStatusChange?: (id: string, status: BookingStatus) => void
  }
  ```
- **이벤트 출력**: 수정/삭제/상태변경 버튼 클릭 시 해당 콜백 호출

---

## 9. 기술 스택 요약

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript 5.4
- Tailwind CSS
- Zustand (상태 관리)
- React Query & SWR (데이터 페칭)

### Backend
- Express 4
- Prisma ORM
- Socket.io
- JWT 인증

### 개발 도구
- pnpm (패키지 매니저)
- Turborepo (빌드 시스템)
- tsup (번들러)
- Style Dictionary (디자인 토큰)
- Vitest & Playwright (테스트)

### 인프라
- Docker 지원
- OpenTelemetry (모니터링)
- GitHub Actions (CI/CD)