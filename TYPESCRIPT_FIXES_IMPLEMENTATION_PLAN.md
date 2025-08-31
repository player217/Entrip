# 🎯 TypeScript 에러 해결 구현 계획서

> **작성일**: 2025-08-31  
> **목표**: 158개 TypeScript 에러 → 10개 이하로 단축  
> **예상 소요 시간**: 4-6시간  
> **성공률**: 70-80% 에러 해결

---

## 📋 **실행 계획 개요**

### 🎯 **목표 및 성공 지표**

| 지표 | 현재 | 목표 | 개선률 |
|------|------|------|--------|
| TypeScript 에러 | 158개 | ≤10개 | 94%+ |
| 빌드 성공률 | 실패 (무시 중) | 100% | - |
| 코드 품질 | implicit any 다수 | strict 모드 준비 | - |
| CI/CD | 타입 체크 비활성화 | 강제 활성화 | - |

### 🚀 **5단계 순차 실행 전략**

```
Phase 1: 경로 정합화 (20분) → 25개 에러 해결 예상
Phase 2: UI 타입 보강 (60분) → 80개 에러 해결 예상  
Phase 3: 폼 DTO 매핑 (30분) → 15개 에러 해결 예상
Phase 4: API 타입 안전화 (45분) → 20개 에러 해결 예상
Phase 5: CI 강제화 (15분) → 품질 보장 시스템 구축
```

---

## 🔧 **Phase 1: 경로/Alias 정합화**

### 🎯 **목표**: import 경로 통일 및 모듈 해상도 문제 해결

### 📝 **작업 내용**

#### A. tsconfig.json 경로 정리
```json
// 📁 apps/web/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],                    // 기존: ["./src/*", "./*"] 
      "@entrip/ui/*": ["../../packages/ui/src/*"],
      "@entrip/shared/*": ["../../packages/shared/src/*"]
    }
  }
}
```

**변경점**: `./*` 패턴 제거로 경로 혼재 해결

#### B. Import 경로 일괄 수정
```typescript
// ❌ 기존 (25개 에러 발생)
import BookingModal from '@/components/booking/BookingModal'
import { useBookings } from '@/hooks/useBookings'  
import { exportToExcel } from '@/utils/export'
import apiClient from '@/lib/api-client'

// ✅ 수정 후
import BookingModal from '@/components/booking/BookingModal'    // 경로 유지
import { useBookings } from '@/hooks/useBookings'              // 경로 유지
import { exportToExcel, exportToPDF } from '@/utils/export'    // 파일 생성 필요
import { apiClient } from '@/lib/api-client'                   // named export로 변경
```

#### C. 누락된 파일 생성
```typescript
// 📁 apps/web/src/utils/export.ts (신규 생성)
export function exportToExcel(data: any[], filename: string): void {
  // 구현 예정
}

export function exportToPDF(data: any[], filename: string): void {
  // 구현 예정  
}
```

### 🧪 **검증 방법**
```bash
# 경로 수정 후 즉시 확인
pnpm --filter @entrip/web run type-check | grep "Cannot find module" | wc -l
# 목표: 25개 → 0개
```

### ⚠️ **위험도**: LOW
- 기존 기능에 영향 없음
- webpack alias는 이미 올바르게 설정됨

---

## 🎨 **Phase 2: UI 컴포넌트 타입 보강**

### 🎯 **목표**: UI 라이브러리 컴포넌트 타입 정의 완성

### 📝 **작업 내용**

#### A. Button 컴포넌트 (이미 완성)
```typescript
// ✅ packages/ui/src/components/primitives/Button.tsx 
// 이미 올바른 타입 정의 완료
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
}
```

#### B. Input 컴포넌트 타입 보강
```typescript
// 📁 packages/ui/src/components/primitives/Input.tsx
import React, { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  variant?: 'default' | 'error';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, variant = 'default', ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && <label className="text-sm font-medium">{label}</label>}
        <input
          ref={ref}
          className={clsx(
            'w-full px-3 py-2 border rounded-md',
            variant === 'error' ? 'border-red-500' : 'border-gray-300',
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
```

#### C. Card 컴포넌트 타입 보강
```typescript
// 📁 packages/ui/src/components/primitives/Card.tsx
import React, { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({ 
  variant = 'default', 
  padding = 'md',
  className, 
  children, 
  ...props 
}) => {
  return (
    <div 
      className={clsx(
        'rounded-lg',
        {
          'bg-white shadow-sm border': variant === 'default',
          'bg-white border-2': variant === 'outlined', 
          'bg-white shadow-lg': variant === 'elevated',
        },
        {
          'p-0': padding === 'none',
          'p-2': padding === 'sm',
          'p-4': padding === 'md',
          'p-6': padding === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
```

#### D. Modal 컴포넌트 타입 보강  
```typescript
// 📁 packages/ui/src/components/primitives/Modal.tsx
import React, { ReactNode } from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className={clsx(
        'relative bg-white rounded-lg shadow-xl',
        {
          'max-w-sm': size === 'sm',
          'max-w-md': size === 'md', 
          'max-w-lg': size === 'lg',
          'max-w-4xl': size === 'xl',
        },
        className
      )}>
        {title && (
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
        )}
        <div className="px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  );
};
```

### 🧪 **검증 방법**
```bash
# UI 컴포넌트 타입 수정 후
pnpm --filter @entrip/web run type-check | grep "Property.*does not exist" | wc -l
# 목표: 80개 → 0개
```

### ⚠️ **위험도**: MEDIUM
- 컴포넌트 API 변경 가능성
- 기존 사용처에서 props 추가 필요할 수 있음

---

## 📝 **Phase 3: 폼 DTO 매핑 보완**

### 🎯 **목표**: API 요청 시 누락된 필드 매핑 추가

### 📝 **작업 내용**

#### A. 예약 생성/수정 payload 보완
```typescript
// 📁 apps/web/src/components/booking/BookingModal.tsx
const handleSubmit = (form: BookingFormData) => {
  const payload = {
    // 기존 필드들
    teamName: form.teamName,
    destination: form.destination,
    departureDate: form.departureDate,
    returnDate: form.returnDate,
    numberOfPeople: form.numberOfPeople,
    
    // 📈 누락 필드 추가
    contact: form.phoneNumber,   // ← 추가
    email: form.email,          // ← 추가
    notes: form.notes || '',
    status: 'pending' as const
  };
  
  // API 호출
  createBooking(payload);
};
```

#### B. 폼 스키마 보완
```typescript
// 📁 apps/web/src/components/BookingModalSchema.ts
import { z } from 'zod';

export const bookingSchema = z.object({
  teamName: z.string().min(1, '팀명을 입력하세요'),
  destination: z.string().min(1, '목적지를 입력하세요'),
  departureDate: z.string().min(1, '출발일을 선택하세요'),
  returnDate: z.string().min(1, '도착일을 선택하세요'),
  numberOfPeople: z.number().min(1, '인원을 입력하세요'),
  
  // 📈 누락 필드 추가
  phoneNumber: z.string().min(1, '연락처를 입력하세요'),  // ← 추가
  email: z.string().email('올바른 이메일을 입력하세요'),    // ← 추가
  notes: z.string().optional()
});

export type BookingFormData = z.infer<typeof bookingSchema>;
```

### 🧪 **검증 방법**
```bash
# 실제 예약 생성 테스트
curl -X POST http://localhost:4001/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"teamName":"테스트팀","contact":"010-1234-5678","email":"test@test.com",...}'
```

### ⚠️ **위험도**: LOW
- 기존 데이터에 영향 없음
- API는 이미 해당 필드 지원

---

## 🔗 **Phase 4: Axios/React Query 타입 안전화**

### 🎯 **목표**: API 호출 및 응답 타입 안전성 보장

### 📝 **작업 내용**

#### A. API 함수 타입 안전화
```typescript
// 📁 apps/web/src/hooks/useBookings.ts
import { useQuery, useMutation, UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// 📈 타입 정의
interface Booking {
  id: string;
  teamName: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  numberOfPeople: number;
  contact?: string;
  email?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
}

interface BookingsResponse {
  data: Booking[];
  total: number;
  page: number;
  limit: number;
}

// 📈 안전한 API 함수
async function fetchBookings(): Promise<Booking[]> {
  const response = await apiClient.get<BookingsResponse>('/api/bookings');
  return response.data.data; // AxiosResponse에서 데이터만 추출
}

async function createBooking(booking: Omit<Booking, 'id'>): Promise<Booking> {
  const response = await apiClient.post<Booking>('/api/bookings', booking);
  return response.data;
}

// 📈 타입 안전한 훅
export function useBookings(): UseQueryResult<Booking[], Error> {
  return useQuery({
    queryKey: ['bookings'],
    queryFn: fetchBookings
  });
}

export function useCreateBooking() {
  return useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      // 캐시 갱신
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    }
  });
}
```

#### B. React Query 타입 오류 수정
```typescript
// 📁 apps/web/src/features/calendar/hooks/useMonthlyReservations.ts
import { useQuery } from '@tanstack/react-query';

interface Reservation {
  id: string;
  date: string;
  title: string;
  // ... 기타 필드
}

// ❌ 기존 (타입 에러 발생)
const { data } = useQuery({
  queryKey: ['reservations'],
  queryFn: () => apiClient.get('/api/reservations') // AxiosResponse 반환
});

// ✅ 수정 후
async function fetchReservations(): Promise<Reservation[]> {
  const response = await apiClient.get<Reservation[]>('/api/reservations');
  return response.data; // 데이터만 반환
}

const { data } = useQuery<Reservation[]>({
  queryKey: ['reservations'],
  queryFn: fetchReservations
});
```

### 🧪 **검증 방법**
```bash
# API 타입 안전성 확인
pnpm --filter @entrip/web run type-check | grep "AxiosResponse.*not assignable" | wc -l
# 목표: 15개 → 0개
```

### ⚠️ **위험도**: MEDIUM  
- API 호출 로직 변경
- 런타임 동작 테스트 필요

---

## 🔒 **Phase 5: CI 타입 체크 강제화**

### 🎯 **목표**: 프로덕션 품질 보장 시스템 구축

### 📝 **작업 내용**

#### A. next.config.js 환경별 설정
```javascript
// 📁 apps/web/next.config.js
const isCI = process.env.CI === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

module.exports = {
  // 📈 환경별 차등 적용
  typescript: {
    ignoreBuildErrors: isDevelopment && !isCI  // 로컬 개발시만 무시, CI에서는 강제
  },
  
  eslint: {
    ignoreDuringBuilds: isDevelopment && !isCI // ESLint도 동일 정책
  }
};
```

#### B. package.json 스크립트 강화
```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "type-check:strict": "tsc --noEmit --strict",
    "lint": "next lint",
    "build": "next build",
    "build:ci": "npm run type-check && npm run lint && next build"
  }
}
```

#### C. GitHub Actions/CI 파이프라인 강화
```yaml
# 📁 .github/workflows/ci.yml (참고용)
name: CI
on: [push, pull_request]
jobs:
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm --filter @entrip/web run type-check
      - run: pnpm --filter @entrip/web run build
```

### 🧪 **검증 방법**
```bash
# CI 환경 시뮬레이션
CI=true pnpm --filter @entrip/web run build
# 목표: 타입 에러 시 빌드 실패
```

### ⚠️ **위험도**: HIGH
- CI/CD 파이프라인 영향
- 배포 프로세스 변경

---

## 📊 **진행 상황 추적**

### 🎯 **실시간 에러 추적 대시보드**
```bash
# Phase별 에러 감소 추적 스크립트
check_errors() {
  echo "=== TypeScript 에러 현황 ==="
  pnpm --filter @entrip/web run type-check 2>&1 | grep "error TS" | wc -l
  echo "=== 모듈 해상도 에러 ==="  
  pnpm --filter @entrip/web run type-check 2>&1 | grep "Cannot find module" | wc -l
  echo "=== Props 타입 에러 ==="
  pnpm --filter @entrip/web run type-check 2>&1 | grep "Property.*does not exist" | wc -l
}
```

### 📈 **성공 지표**
| Phase | 목표 에러 감소 | 시간 | 완료 기준 |
|-------|---------------|------|-----------|
| 1 | 25개 → 0개 | 20분 | 모듈 해상도 에러 0개 |
| 2 | 80개 → 0개 | 60분 | Props 타입 에러 0개 |  
| 3 | 15개 → 5개 | 30분 | DTO 매핑 완료 |
| 4 | 20개 → 5개 | 45분 | API 타입 안전성 확보 |
| 5 | 품질 보장 | 15분 | CI 빌드 성공 |

---

## ⚠️ **위험 관리 계획**

### 🚨 **주요 위험 요소**
1. **컴포넌트 API 변경** - 기존 사용처 영향
2. **빌드 시간 증가** - CI 파이프라인 지연
3. **개발 편의성 저하** - 엄격한 타입 검사

### 🛡️ **롤백 전략**
```bash
# 긴급 롤백 스크립트
git checkout HEAD~1 -- apps/web/next.config.js    # 설정 롤백
git checkout HEAD~1 -- apps/web/tsconfig.json     # 경로 롤백
pnpm --filter @entrip/web run build               # 빌드 확인
```

### 🔄 **단계별 검증점**
- **Phase 1 완료 후**: 모듈 해상도 에러 0개 확인
- **Phase 2 완료 후**: UI 컴포넌트 사용처 모두 정상 동작
- **Phase 3 완료 후**: 예약 생성/수정 기능 정상 동작  
- **Phase 4 완료 후**: API 호출 모두 정상 응답
- **Phase 5 완료 후**: CI 빌드 성공 확인

---

## 🎉 **예상 결과**

### 📈 **최종 달성 목표**
- **TypeScript 에러**: 158개 → **≤10개** (94% 감소)
- **빌드 성공률**: 0% → **100%**
- **개발 경험**: 타입 안전성으로 인한 개발 속도 향상
- **코드 품질**: strict 모드 준비 완료

### 🔮 **장기적 이익**
- 런타임 에러 50% 감소 예상
- 리팩토링 안전성 확보
- 신규 개발자 온보딩 시간 단축
- 유지보수 비용 절감

---

**📝 Note**: 이 계획은 현재 코드베이스 분석을 바탕으로 작성되었으며, 실제 실행 과정에서 세부 조정이 필요할 수 있습니다.