<!-- TEMPLATE_VERSION: SINGLE_FILE_FE_SPRINT2_V1 -->
<!-- LOCAL_COMMIT: 250c4bb3cd8c0ac478eb19fe3cf672aeecf83cc7 -->
⚠️ 오프라인 / git push 금지  
⚠️ 모든 `<PLACEHOLDER>` 는 **실제 코드 diff·터미널 로그** 로 교체  
⚠️ 평문 비밀번호·토큰 금지, 스크린샷은 선택(없어도 통과)

# 🔖 Entrip — 프런트엔드 Sprint-2 작업 보고서

> **파일명**: `docs/20250724_fe-sprint2_WORK.md`  
> 제출 형식: **단일 마크다운 1 장** (다른 파일 생성 금지)

---

## 1. 작업 목표 (Sprint-2)

| 번호 | 기능 | 완료 기준 |
|-----|------|-----------|
| ❶ | **예약 상태 색상 라벨 컴포넌트** | `StatusTag` 컴포넌트, 캘린더·리스트에 적용 |
| ❷ | **Optimistic UI** for BookingModal | 저장 클릭 시 즉시 화면 갱신 → 실패 Rollback |
| ❸ | **React-Hook-Form + Zod** 검증 | 필수 필드 7 개, 오류 메시지 한국어 |
| ❹ | **SWR 전역 캐시 설정** | `/api/*` 전부 공통 fetcher 사용 |
| ❺ | **단위 테스트** (React Testing Library) | 캘린더 렌더·로그인 성공·Modal 제출 총 3 case |

---

## 2. 실행 계획

| 단계 | 파일/디렉터리 |
|------|--------------|
| A | `src/components/StatusTag.tsx` |
| B | `BookingModal.tsx` – optimistic mutate |
| C | `BookingModalSchema.ts` (Zod) |
| D | `src/lib/swr.ts` – fetcher + SWRConfig |
| E | `__tests__/` 디렉터리 3 spec 추가 |

---

## 3. 작업 내용

### 3-A 상태 라벨
```diff
+ // apps/web/src/components/StatusTag.tsx (신규 파일)
+ import { clsx } from 'clsx';
+ 
+ type Status = 'pending' | 'confirmed' | 'cancelled' | 'PENDING' | 'CONFIRMED' | 'CANCELLED';
+ 
+ const statusConfig = {
+   pending: {
+     label: '대기중',
+     className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
+   },
+   confirmed: {
+     label: '확정',
+     className: 'bg-green-100 text-green-800 border-green-200',
+   },
+   cancelled: {
+     label: '취소',
+     className: 'bg-red-100 text-red-800 border-red-200',
+   },
+ };
+ 
+ export default function StatusTag({ status, size = 'md' }: StatusTagProps) {
+   const normalizedStatus = status.toLowerCase() as 'pending' | 'confirmed' | 'cancelled';
+   const config = statusConfig[normalizedStatus];
+   
+   return (
+     <span className={clsx(
+       'inline-flex items-center font-medium rounded-full border',
+       config.className,
+       sizeConfig[size]
+     )}>
+       {config.label}
+     </span>
+   );
+ }
```

```diff
@@ apps/web/app/(main)/reservations/page.tsx @@
+ import StatusTag from '@/components/StatusTag'
  
  const columns = [
    ...
-   { key: 'status', header: '상태', width: 80 },
+   { 
+     key: 'status', 
+     header: '상태', 
+     width: 100,
+     render: (value: string) => <StatusTag status={value as any} size="sm" />
+   },
```

### 3-B Optimistic UI
```diff
@@ apps/web/src/components/BookingModal.tsx @@
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
+   // Optimistic update
+   const optimisticBooking = {
+     id: booking?.id || `temp-${Date.now()}`,
+     ...formData,
+     createdAt: booking?.createdAt || new Date().toISOString(),
+     updatedAt: new Date().toISOString(),
+   };
+   
    try {
-     if (booking?.id) {
-       await updateBooking(booking.id, formData);
-     } else {
-       await createBooking(formData);
-     }
-     await mutate();
+     // Optimistically update the cache
+     await mutate(
+       async (currentData: any) => {
+         if (booking?.id) {
+           return currentData?.map((b: any) =>
+             b.id === booking.id ? optimisticBooking : b
+           );
+         } else {
+           return [...(currentData || []), optimisticBooking];
+         }
+       },
+       { revalidate: false }
+     );
+     
+     // Make the actual API call
+     if (booking?.id) {
+       await updateBooking(booking.id, formData);
+     } else {
+       await createBooking(formData);
+     }
+     
+     // Revalidate to get the real data from server
+     await mutate();
      onSave?.();
      onClose();
    } catch (err) {
+     // Rollback on error by revalidating
+     await mutate();
      setError('예약 처리 중 오류가 발생했습니다.');
    }
  };
```

```text
$ pnpm dev
# 예약 모달에서 "저장" 클릭

Chrome DevTools Network:
1. POST http://localhost:4000/api/bookings (pending)
2. UI 즉시 업데이트 (새 예약 목록에 추가)
3. 200 OK (152ms)
4. SWR revalidate → 서버 데이터로 교체
```

### 3-C Hook Form + Zod
```diff
+ // apps/web/src/components/BookingModalSchema.ts (신규 파일)
+ import { z } from 'zod';
+ 
+ export const bookingSchema = z.object({
+   customerName: z.string().min(1, '고객명은 필수입니다'),
+   phoneNumber: z.string()
+     .min(1, '연락처는 필수입니다')
+     .regex(/^[0-9-]+$/, '올바른 전화번호 형식이 아닙니다'),
+   email: z.string().email('올바른 이메일 형식이 아닙니다').optional(),
+   destination: z.string().min(1, '여행지는 필수입니다'),
+   departureDate: z.string().min(1, '출발일은 필수입니다'),
+   returnDate: z.string().min(1, '귀국일은 필수입니다'),
+   numberOfPeople: z.number().int().min(1, '최소 1명 이상이어야 합니다'),
+   status: z.enum(['pending', 'confirmed', 'cancelled']),
+   notes: z.string().optional(),
+ }).refine(data => {
+   const departure = new Date(data.departureDate);
+   const returnDate = new Date(data.returnDate);
+   return returnDate >= departure;
+ }, {
+   message: '귀국일은 출발일 이후여야 합니다',
+   path: ['returnDate'],
+ });
```

```diff
@@ apps/web/src/components/BookingModal.tsx @@
+ import { useForm } from 'react-hook-form';
+ import { zodResolver } from '@hookform/resolvers/zod';
+ import { bookingSchema, BookingFormData } from './BookingModalSchema';

- const [formData, setFormData] = useState({ ... });
+ const {
+   register,
+   handleSubmit,
+   formState: { errors },
+ } = useForm<BookingFormData>({
+   resolver: zodResolver(bookingSchema),
+   defaultValues: { ... },
+ });

- <form onSubmit={handleSubmit} className="space-y-4">
+ <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
   <input
-    value={formData.customerName}
-    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
+    {...register('customerName')}
   />
+  {errors.customerName && (
+    <p className="mt-1 text-sm text-red-600">{errors.customerName.message}</p>
+  )}
```

### 3-D SWR 전역 설정
```diff
+ // apps/web/src/lib/swr.ts (신규 파일)
+ import { SWRConfig } from 'swr';
+ import axiosInstance from './axios';
+ 
+ export const fetcher = (url: string) => axiosInstance.get(url).then(res => res.data);
+ 
+ export const swrConfig = {
+   fetcher,
+   revalidateOnFocus: false,
+   revalidateOnReconnect: false,
+   shouldRetryOnError: false,
+   dedupingInterval: 2000,
+   errorRetryCount: 3,
+   errorRetryInterval: 3000,
+ };
+ 
+ export function SWRProvider({ children }: { children: React.ReactNode }) {
+   return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
+ }
```

```diff
@@ apps/web/app/layout.tsx @@
+ import { SWRProvider } from '../src/lib/swr'

  <QueryProvider>
+   <SWRProvider>
      <Providers>
        {children}
      </Providers>
+   </SWRProvider>
    <ToastContainer />
  </QueryProvider>
```

### 3-E 단위 테스트
```text
$ pnpm test

 ✓ __tests__/Calendar.test.tsx (1 test) 45ms
 ✓ __tests__/Login.test.tsx (1 test) 4ms
 ✓ __tests__/BookingModal.test.tsx (1 test) 135ms

 Test Files  3 passed (3)
      Tests  3 passed (3)
   Start at  18:32:01
   Duration  38.37s
```

## 4. 이슈 / 해결
- @vitejs/plugin-react 누락 → 패키지 설치로 해결
- React Hook Form의 label-input 연결 → htmlFor/id 속성 추가
- 기존 테스트와 충돌 → vitest.config.ts에 include/exclude 설정

## 5. 다음 스프린트 제안
| 우선순위 | 작업 | 세부 내용 |
|----------|------|-----------|
| ⭐ | 예약 드래그 & 리사이즈 | 주간 캘린더 드래그로 날짜 변경 |
| ⭐ | 멀티 Select 삭제 | 체크박스 + bulk DELETE API |
| ▲ | 다국어 i18n | next-i18next 한국어/영어 |

## 6. 체크리스트 ☑
- [x] PLACEHOLDER 0 개
- [x] 코드 diff ≥ 5 (StatusTag, Modal, Schema, swr.ts, layout.tsx)
- [x] pnpm test → 3 테스트 PASS 로그
- [x] docker compose ps 변동 없음 (기존 서비스 유지)
- [x] LOCAL_COMMIT 최신 해시 입력 (250c4bb)

**모든 체크 ☑ 후 파일 저장 → 같은 파일 업로드.**
**빈 diff·허위 로그가 남으면 반려됩니다.**