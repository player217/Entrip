# API 클라이언트 및 Hook 통합 마이그레이션 가이드

## 📋 개요

이 문서는 분산된 API 클라이언트와 Hook을 통합된 시스템으로 마이그레이션하는 방법을 설명합니다.

## 🎯 변경 사항

### 1. API 클라이언트 통합
- **이전**: 4개의 다른 API 클라이언트 (`apiClient`, `axios`, `api`, `fetcher`)
- **현재**: 단일 통합 API 클라이언트 (`unifiedApiClient`)

### 2. useBookings Hook 통합
- **이전**: 3개의 다른 구현
- **현재**: 단일 통합 Hook with WebSocket 지원

### 3. 타입 시스템 정리
- **이전**: 5개의 Booking 관련 타입
- **현재**: Zod 기반 단일 타입 시스템

## 📦 새로운 모듈 위치

```typescript
// API 클라이언트
import { unifiedApiClient } from '@entrip/shared';

// WebSocket Manager
import { wsManager } from '@entrip/shared';

// useBookings Hook
import { useUnifiedBookings } from '@entrip/shared/client';

// Booking 타입 및 헬퍼
import { 
  BookingDTO, 
  BookingHelpers,
  validateBookingDTO 
} from '@entrip/shared';
```

## 🔄 마이그레이션 단계

### Step 1: API 클라이언트 교체

#### 이전 코드:
```typescript
// apps/web/src/lib/axios.ts
import { axiosInstance } from './axios';

const response = await axiosInstance.get('/api/bookings');
```

#### 새 코드:
```typescript
import { unifiedApiClient } from '@entrip/shared';

const response = await unifiedApiClient.get<BookingDTO[]>('/api/bookings');
```

### Step 2: useBookings Hook 교체

#### 이전 코드:
```typescript
// apps/web/src/hooks/useBookings.ts
import { useBookings } from '../hooks/useBookings';

function MyComponent() {
  const { bookings, isLoading } = useBookings();
}
```

#### 새 코드:
```typescript
import { useUnifiedBookings } from '@entrip/shared/client';

function MyComponent() {
  const { bookings, isLoading } = useUnifiedBookings(
    { month: '2025-01' },
    { enableRealtime: true }
  );
}
```

### Step 3: 타입 마이그레이션

#### 이전 코드:
```typescript
interface Booking {
  // ... 40개 필드
}

const booking: Booking = { ... };
```

#### 새 코드:
```typescript
import { BookingDTO, BookingHelpers } from '@entrip/shared';

const booking: BookingDTO = { ... };

// 헬퍼 함수 사용
const canCancel = BookingHelpers.canCancel(booking);
const duration = BookingHelpers.getDuration(booking);
```

## 🔌 WebSocket 통합

### WebSocket 연결 설정:
```typescript
import { wsManager } from '@entrip/shared';

// 컴포넌트 마운트 시
useEffect(() => {
  wsManager.connect();
  
  return () => {
    wsManager.disconnect();
  };
}, []);
```

### 실시간 동기화 활성화:
```typescript
const { bookings } = useUnifiedBookings(
  { companyCode: 'J1' },
  { 
    enableRealtime: true,
    onRealtimeUpdate: (event, data) => {
      console.log(`Booking ${event}:`, data);
    }
  }
);
```

## 🚨 주의 사항

### 1. HttpOnly 쿠키 기반 인증
- 모든 API 요청은 자동으로 HttpOnly 쿠키를 포함합니다
- localStorage 토큰은 더 이상 사용하지 않습니다

### 2. 401 처리
- 클라이언트는 리다이렉트하지 않고 세션만 정리합니다
- 실제 리다이렉트는 Next.js middleware가 처리합니다

### 3. WebSocket 토큰
- WebSocket은 별도의 단기 토큰을 사용합니다 (120초)
- 토큰은 자동으로 갱신됩니다

## 🧪 테스트

### 통합 테스트 실행:
```bash
# 패키지 테스트
pnpm --filter @entrip/shared test

# E2E 테스트
pnpm --filter @entrip/web test:e2e
```

### 수동 테스트 체크리스트:
- [ ] 로그인/로그아웃 정상 작동
- [ ] 예약 CRUD 작동
- [ ] WebSocket 실시간 동기화
- [ ] 401 에러 처리
- [ ] 타입 안전성

## 🚀 점진적 마이그레이션

Feature Flag를 사용한 점진적 전환:

```typescript
// feature-flags.ts
export const useUnifiedApi = process.env.NEXT_PUBLIC_USE_UNIFIED_API === 'true';

// 사용
import { useUnifiedApi } from '@/config/feature-flags';

const apiClient = useUnifiedApi 
  ? unifiedApiClient 
  : legacyApiClient;
```

## 📝 ESLint 규칙

레거시 import를 방지하는 ESLint 규칙이 설정되어 있습니다:

```json
{
  "no-restricted-imports": [
    "error",
    {
      "paths": [
        {
          "name": "axios",
          "message": "Use @entrip/shared/unified-api-client instead"
        }
      ]
    }
  ]
}
```

## 🆘 문제 해결

### 문제: TypeScript 에러
**해결**: `pnpm install` 후 `pnpm build` 실행

### 문제: WebSocket 연결 실패
**해결**: 
1. 백엔드 서버 실행 확인
2. WebSocket 포트(4001) 열려있는지 확인
3. 브라우저 개발자 도구에서 WebSocket 탭 확인

### 문제: 401 무한 루프
**해결**: 
1. middleware.ts 확인
2. 쿠키 설정 확인
3. 프록시 라우트 설정 확인

## 📚 참고 자료

- [통합 API 클라이언트 소스](packages/shared/src/lib/unified-api-client.ts)
- [통합 useBookings Hook](packages/shared/src/hooks/unified-use-bookings.ts)
- [Booking 타입 시스템](packages/shared/src/types/booking/)
- [WebSocket Manager](packages/shared/src/lib/websocket-manager.ts)

## ✅ 완료 체크리스트

- [ ] 모든 레거시 API 클라이언트 제거
- [ ] useBookings Hook 통합 완료
- [ ] 타입 시스템 마이그레이션
- [ ] WebSocket 통합 테스트
- [ ] 프로덕션 배포 준비

---

마이그레이션 관련 질문이나 이슈는 팀 채널에 공유해주세요.