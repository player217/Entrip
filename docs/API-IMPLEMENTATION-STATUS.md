# API 구현 현황 상세 보고서

*Last Updated: 2025-01-13*  
*Version: 1.0.0*

## 📊 API 현황 요약

| 모듈 | 핵심 엔드포인트 | 커버 범위 | 비고 |
|------|----------------|-----------|------|
| **Auth** | `/auth/*` (register·login·refresh·logout·me) | 기본 토큰 플로우 완비 | 리프레시 토큰 저장 방식 확인 필요 |
| **예약(Bookings)** | `GET /bookings` `POST /bookings` `PUT /bookings/{id}` `PATCH /bookings/{id}/status` `DELETE /bookings/{id}` | CRUD + 상태 변경 | 검색·필터 파라미터 최소 (page·limit) |
| **캘린더** | `GET /calendar` `POST /calendar` `PUT /calendar/{id}` 등 | 월별 조회, 이벤트 CRUD | 팀·색상·All-day 지원 |
| **계정(Accounts)** | 전체 CRUD | 역할·상태별 필터 | RBAC 토대 존재 |
| **재무(Finance)** | CRUD + `/finance/stats` + 승인(approve) | 통화·환율·승인 워크플로 | 환율 저장 로직은 미정 |
| **결재(Approvals)** | 신청·액션·통계 | 다단계 승인 스텝 구조 | finance·기타 대상 연결 |
| **기타** | Payments / Messaging / Mail / Notifications 카테고리만 선언 | 실제 엔드포인트 없음 | 추후 추가 필요 |

**→ 결론:** 예약·캘린더·재무·결재까지 **핵심 API 골격은 이미 구현**되어 있습니다. 이제는 "비즈니스 로직·DB 연계·프런트 바인딩"이 핵심 과제입니다.

## 🔍 상세 API 구현 현황

### 1. 인증 (Auth) API
```typescript
// packages/shared/src/lib/api-endpoints.ts
auth: {
  register: { method: 'POST', url: '/auth/register' },
  login: { method: 'POST', url: '/auth/login' },
  refresh: { method: 'POST', url: '/auth/refresh' },
  logout: { method: 'POST', url: '/auth/logout' },
  me: { method: 'GET', url: '/auth/me' }
}
```
- **구현 상태**: MSW Mock 핸들러 구현 완료
- **토큰 관리**: JWT Bearer Token 방식
- **쿠키**: `auth-token` 이름으로 저장
- **미들웨어**: `apps/web/src/middleware.ts`에서 처리

### 2. 예약 (Bookings) API
```typescript
bookings: {
  list: { method: 'GET', url: '/bookings' },
  get: { method: 'GET', url: '/bookings/:id' },
  create: { method: 'POST', url: '/bookings' },
  update: { method: 'PUT', url: '/bookings/:id' },
  delete: { method: 'DELETE', url: '/bookings/:id' },
  updateStatus: { method: 'PATCH', url: '/bookings/:id/status' }
}
```
- **구현 상태**: 전체 CRUD + 상태 변경 Mock 구현
- **필터링**: page, limit 파라미터만 지원
- **검색**: 키워드, 날짜 범위, 상태별 필터 미구현
- **관련 훅**: `useBookings()`, `useCreateBooking()`, `useUpdateBooking()`

### 3. 팀 예약 (Team Bookings) API
```typescript
teamBookings: {
  list: { method: 'GET', url: '/team-bookings' },
  get: { method: 'GET', url: '/team-bookings/:id' },
  create: { method: 'POST', url: '/team-bookings' },
  update: { method: 'PUT', url: '/team-bookings/:id' },
  delete: { method: 'DELETE', url: '/team-bookings/:id' },
  stats: { method: 'GET', url: '/team-bookings/stats' }
}
```
- **구현 상태**: 전체 CRUD + 통계 Mock 구현
- **특징**: 팀별 예약 관리 특화
- **통계**: 월별/팀별 예약 현황

### 4. 캘린더 (Calendar) API
```typescript
calendar: {
  monthly: { method: 'GET', url: '/calendar/monthly' },
  events: { method: 'GET', url: '/calendar/events' },
  createEvent: { method: 'POST', url: '/calendar/events' },
  updateEvent: { method: 'PUT', url: '/calendar/events/:id' },
  deleteEvent: { method: 'DELETE', url: '/calendar/events/:id' }
}
```
- **구현 상태**: 월별 조회, 이벤트 CRUD Mock 구현
- **특징**: 팀별 색상 구분, All-day 이벤트 지원
- **성능**: 대량 이벤트 조회 최적화 필요

### 5. 재무 (Finance) API
```typescript
finance: {
  list: { method: 'GET', url: '/finance' },
  get: { method: 'GET', url: '/finance/:id' },
  create: { method: 'POST', url: '/finance' },
  update: { method: 'PUT', url: '/finance/:id' },
  delete: { method: 'DELETE', url: '/finance/:id' },
  stats: { method: 'GET', url: '/finance/stats' },
  approve: { method: 'POST', url: '/finance/:id/approve' }
}
```
- **구현 상태**: CRUD + 승인 워크플로 Mock 구현
- **특징**: 다중 통화 지원, 환율 연동
- **승인**: 단계별 승인 프로세스

### 6. 결재 (Approvals) API
```typescript
approvals: {
  list: { method: 'GET', url: '/approvals' },
  get: { method: 'GET', url: '/approvals/:id' },
  create: { method: 'POST', url: '/approvals' },
  approve: { method: 'POST', url: '/approvals/:id/approve' },
  reject: { method: 'POST', url: '/approvals/:id/reject' },
  stats: { method: 'GET', url: '/approvals/stats' }
}
```
- **구현 상태**: 결재 신청/승인/반려 Mock 구현
- **특징**: 다단계 승인, 위임 기능
- **연동**: Finance 모듈과 연계

### 7. 미구현 API 모듈
```typescript
// 엔드포인트 정의만 존재, 실제 구현 없음
payments: {},      // 결제 관리
messaging: {},     // 메시징
mail: {},         // 이메일
notifications: {} // 알림
```

## 🔧 기술적 구현 상세

### API Client 구성
```typescript
// packages/shared/src/lib/api-client.ts
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});
```

### MSW Mock 핸들러
```typescript
// packages/shared/src/mocks/handlers/
- auth.handlers.ts
- bookings.handlers.ts
- team-bookings.handlers.ts
- calendar.handlers.ts
- finance.handlers.ts
- approvals.handlers.ts
```

### SWR Hooks 패턴
```typescript
// packages/shared/src/hooks/useBookings.ts
export function useBookings(page = 1, limit = 10) {
  const { data, error, isLoading, mutate } = useSWR(
    [`/bookings`, page, limit],
    () => bookingService.getBookings({ page, limit }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
  // ...
}
```

## 📋 데이터 모델 현황

### Booking 스키마
```typescript
interface Booking {
  id: string;
  teamId: string;
  teamName: string;
  customerName: string;
  customerPhone: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  adultCount: number;
  childCount: number;
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
}
```

### TeamBooking 스키마
```typescript
interface TeamBooking {
  id: string;
  teamCode: string;
  teamName: string;
  departureDate: string;
  returnDate: string;
  destination: string;
  nights: number;
  days: number;
  productType: string;
  // ... 60+ fields
}
```

## 🚀 개발 우선순위 로드맵

### 1단계: 데이터 모델 & 서비스 로직 보강
1. **Prisma/TypeORM 스키마**를 API 스키마와 1:1 매핑
   - Booking ↔ Team ↔ Customer 관계
   - Finance 승인/취소 트랜잭션

2. **Role-based Access Guard**
   - Admin / Staff / Viewer 별 권한 미들웨어

3. **상태 전이 검증**
   - 예약: pending → confirmed → done / cancelled
   - 결재·재무: pending ↔ approved / rejected

### 2단계: 고급 쿼리 & 검색
1. `/bookings` 필터 확장
   - 기간, 타입, 거래처, 상태, 키워드

2. `/calendar` 월간·주간 대량 조회 최적화
   - 인덱스 & cursor-pagination

3. 풀텍스트 검색(팀명, 메모 등) → Pg `GIN` 인덱스

### 3단계: 프런트엔드 연동
1. **OpenAPI 코드-젠**으로 타입 안전 클라이언트 생성 (`openapi-typescript`)
2. SWR/React-Query 로 `bookings`·`calendar` 데이터스트림 교체
3. 모달 폼 → `react-hook-form + Zod` 스키마 연결
4. 캘린더 Drag-and-Drop → `PATCH /bookings/{id}` 실시간 반영
5. 토큰 만료 시 `/auth/refresh` 자동 호출(Hydration)

### 4단계: 통합 테스트 & 품질 보증
1. **Jest + Supertest** 단위·통합 테스트
2. **Playwright** E2E: 예약 등록→수정→취소 시나리오
3. **k6 부하**: 동시 100건 예약 입력

### 5단계: 남은 API 갭 채우기
- **Itinerary · Payment · AuditLog · Document Upload** 엔드포인트 설계
- **Notifications / Mail / Messenger** 실제 전송 로직 연결
- 환율 시계열 저장용 `/forex/*` 서브-모듈 (외부 API 수집)

### 6단계: DevOps & CI
- `prisma migrate deploy` 자동화
- Staging → Canary → Prod GitHub Actions 워크플로
- `.env.example`에 새 환경변수(EMAIL_SMTP, PUSH_KEY 등) 명세

## ✋ 즉시 실행 가능한 작업

1. **DB 스키마**를 OpenAPI 정의와 맞춰 작성 후 마이그레이션
2. **bookingsService** / **calendarService** 실제 구현 (트랜잭션 포함)
3. **프런트 토큰 컨텍스트** 세팅 → 로그인 후 전체 API 요청 테스트
4. `/bookings` 필터 파라미터 확장 PR 작성
5. QA가 E2E 스크립트 초안 작성 시작

> 위 순서대로 진행하면 **UI는 그대로 두고도** 예약 등록·조회·수정이 실제 데이터베이스와 완전히 연동되어 "실전 배포 가능한 최소 기능셋(MVP)"을 달성할 수 있습니다. 이후 부가 모듈(문서 출력·OCR·호텔 크롤링)은 별도 레포에서 계속 진행하면 됩니다.

## 📈 진행률 추적

### API 엔드포인트별 구현 상태
- ✅ 완료 (Mock 구현)
- 🔄 진행 중
- ⏳ 계획됨
- ❌ 미구현

| 엔드포인트 | Mock | Service | DB | Test | 문서 |
|-----------|------|---------|-----|------|-----|
| Auth | ✅ | ⏳ | ⏳ | ⏳ | ⏳ |
| Bookings | ✅ | ⏳ | ⏳ | ⏳ | ⏳ |
| Team Bookings | ✅ | ⏳ | ⏳ | ⏳ | ⏳ |
| Calendar | ✅ | ⏳ | ⏳ | ⏳ | ⏳ |
| Finance | ✅ | ⏳ | ⏳ | ⏳ | ⏳ |
| Approvals | ✅ | ⏳ | ⏳ | ⏳ | ⏳ |
| Accounts | ✅ | ⏳ | ⏳ | ⏳ | ⏳ |
| Payments | ❌ | ❌ | ❌ | ❌ | ❌ |
| Messaging | ❌ | ❌ | ❌ | ❌ | ❌ |
| Mail | ❌ | ❌ | ❌ | ❌ | ❌ |
| Notifications | ❌ | ❌ | ❌ | ❌ | ❌ |

---

*이 문서는 API 구현 현황을 추적하고 개발 우선순위를 관리하기 위해 작성되었습니다.*