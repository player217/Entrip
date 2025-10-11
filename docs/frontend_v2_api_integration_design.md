# Frontend v2 API Integration Design
**날짜**: 2025-09-28
**프로젝트**: Entrip Travel Management System Frontend → v2 API Integration

## 🎯 개요

기존 프론트엔드(apps/web)를 v2 API(packages/api)와 연동하는 통합 설계입니다. 현재 v1 API(apps/api)에서 v2 API로의 점진적 전환을 지원합니다.

## 📊 현재 상태 분석

### 기존 API 클라이언트 현황
```typescript
// 1. axiosInstance (apps/web/src/lib/axios.ts) - 주력 사용
- baseURL: '/' (Next.js API Routes 프록시)
- 인증: localStorage token + Bearer header
- 사용처: useBookings, 대부분의 API 호출

// 2. api (apps/web/src/lib/api.ts) - 보조 사용
- SSR/CSR 구분 처리
- HttpOnly 쿠키 인증
- 사용처: login, auth-store

// 3. fetcher (apps/web/src/lib/fetcher.ts) - SWR 전용
- 네이티브 fetch 기반
- localStorage token 사용

// 4. apiClient (packages/shared) - 미사용
- 현재 Web에서 import 없음
```

### v2 API 준비 상태
```yaml
packages/api 현황:
- Port: 4002 (Docker: api-v2)
- 아키텍처: DDD/Clean Architecture
- 테스트: 완전한 테스트 커버리지
- 인증: JWT 토큰 전용
- 모델: 32개 (v1 28개 + 4개 추가)
- WebSocket: 별도 구현 필요
```

## 🔄 마이그레이션 전략

### Phase 1: 인프라 준비
- **Dual API 지원**: v1과 v2 동시 지원
- **라우터 계층**: API 버전별 라우팅
- **인증 통합**: v1/v2 공통 인증 시스템

### Phase 2: 점진적 API 전환
- **모델별 전환**: User → Booking → Message 순서
- **기능별 검증**: 각 기능 단위로 v2 이전 후 검증
- **Fallback 보장**: v2 실패 시 v1으로 자동 복구

### Phase 3: v1 제거
- **v1 의존성 제거**: v1 전용 코드 정리
- **성능 최적화**: v2 전용 기능 활용
- **문서화**: v2 API 사용법 정리

## 🏗️ 아키텍처 설계

### 1. API Router 계층
```typescript
// apps/web/src/lib/apiRouter.ts
export class ApiRouter {
  constructor(
    private v1Client: AxiosInstance,
    private v2Client: AxiosInstance,
    private config: ApiRouterConfig
  ) {}

  async request<T>(endpoint: string, options: RequestOptions): Promise<T> {
    const version = this.getApiVersion(endpoint);

    switch (version) {
      case 'v2':
        return this.requestWithFallback(endpoint, options);
      case 'v1':
      default:
        return this.v1Client.request<T>(endpoint, options);
    }
  }

  private async requestWithFallback<T>(
    endpoint: string,
    options: RequestOptions
  ): Promise<T> {
    try {
      // v2 API 요청 시도
      return await this.v2Client.request<T>(endpoint, options);
    } catch (error) {
      if (this.shouldFallbackToV1(error)) {
        this.logger.warn(`v2 API failed, falling back to v1: ${endpoint}`);
        return await this.v1Client.request<T>(endpoint, options);
      }
      throw error;
    }
  }

  private getApiVersion(endpoint: string): 'v1' | 'v2' {
    // 엔드포인트별 버전 매핑
    const v2Endpoints = [
      '/api/bookings',
      '/api/users',
      '/api/calendar-events',
      '/api/finance-records'
    ];

    return v2Endpoints.some(v2Endpoint => endpoint.startsWith(v2Endpoint))
      ? 'v2'
      : 'v1';
  }
}
```

### 2. 통합 API 클라이언트
```typescript
// apps/web/src/lib/apiClient.ts
export class UnifiedApiClient {
  private router: ApiRouter;
  private v1Client: AxiosInstance;
  private v2Client: AxiosInstance;

  constructor() {
    this.v1Client = this.createV1Client();
    this.v2Client = this.createV2Client();
    this.router = new ApiRouter(this.v1Client, this.v2Client, {
      fallbackEnabled: true,
      retryAttempts: 3,
      timeoutMs: 10000
    });
  }

  private createV1Client(): AxiosInstance {
    return axios.create({
      baseURL: '/', // 기존 프록시 패턴 유지
      headers: {
        'Content-Type': 'application/json'
      },
      interceptors: {
        request: [authInterceptor],
        response: [errorHandler]
      }
    });
  }

  private createV2Client(): AxiosInstance {
    return axios.create({
      baseURL: process.env.NODE_ENV === 'production'
        ? '/api/v2'
        : 'http://localhost:4002/api',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': '2.0'
      },
      interceptors: {
        request: [authInterceptor, versionInterceptor],
        response: [errorHandler, metricsCollector]
      }
    });
  }

  // 공통 API 메서드
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.router.request<T>(url, { method: 'GET', ...config });
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.router.request<T>(url, { method: 'POST', data, ...config });
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.router.request<T>(url, { method: 'PUT', data, ...config });
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.router.request<T>(url, { method: 'DELETE', ...config });
  }
}
```

### 3. Next.js API Routes 프록시 확장
```typescript
// apps/web/app/api/v2/[...path]/route.ts
export async function GET(request: NextRequest) {
  return handleV2Proxy(request, 'GET');
}

export async function POST(request: NextRequest) {
  return handleV2Proxy(request, 'POST');
}

export async function PUT(request: NextRequest) {
  return handleV2Proxy(request, 'PUT');
}

export async function DELETE(request: NextRequest) {
  return handleV2Proxy(request, 'DELETE');
}

async function handleV2Proxy(request: NextRequest, method: string) {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').slice(3); // Remove /api/v2
    const targetPath = '/' + pathSegments.join('/');
    const queryString = url.search;

    const targetUrl = `http://api-v2:4002/api${targetPath}${queryString}`;

    const response = await fetch(targetUrl, {
      method,
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        'X-Forwarded-For': request.ip || '',
        'X-Forwarded-Proto': url.protocol.slice(0, -1)
      },
      body: method !== 'GET' && method !== 'HEAD'
        ? await request.text()
        : undefined
    });

    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });

  } catch (error) {
    console.error('v2 API Proxy Error:', error);
    return NextResponse.json(
      { error: 'v2 API Proxy Error', message: error.message },
      { status: 500 }
    );
  }
}
```

## 📱 Hook 통합 전략

### 1. 통합 useBookings Hook
```typescript
// apps/web/src/hooks/useBookings.ts (기존 파일 업데이트)
export function useBookings(config: UseBookingsConfig = {}) {
  const apiClient = useApiClient();
  const { apiVersion = 'auto' } = config;

  // SWR 설정
  const { data, error, mutate, isLoading } = useSWR(
    ['/api/bookings', apiVersion],
    async ([url, version]) => {
      if (version === 'v2' || (version === 'auto' && isV2Available())) {
        return apiClient.get<BookingResponse>(url, { version: 'v2' });
      } else {
        return apiClient.get<BookingResponse>(url, { version: 'v1' });
      }
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
      errorRetryCount: 3
    }
  );

  // WebSocket 실시간 업데이트 (v1, v2 공통)
  useWebSocketBookingEvents(mutate);

  // CRUD 작업
  const createBooking = useCallback(async (booking: CreateBookingDto) => {
    const result = await apiClient.post<Booking>('/api/bookings', booking);

    // 성공 시 캐시 업데이트
    mutate();

    return result;
  }, [apiClient, mutate]);

  const updateBooking = useCallback(async (id: string, updates: UpdateBookingDto) => {
    const result = await apiClient.put<Booking>(`/api/bookings/${id}`, updates);

    // Optimistic update
    mutate(
      (current) => current?.map(booking =>
        booking.id === id ? { ...booking, ...updates } : booking
      ),
      false
    );

    return result;
  }, [apiClient, mutate]);

  return {
    bookings: data?.data || [],
    isLoading,
    error,
    mutate,
    createBooking,
    updateBooking,
    deleteBooking: (id: string) => apiClient.delete(`/api/bookings/${id}`)
  };
}
```

### 2. API 버전 감지 Hook
```typescript
// apps/web/src/hooks/useApiVersion.ts
export function useApiVersion() {
  const [v2Available, setV2Available] = useState<boolean | null>(null);
  const [v2Features, setV2Features] = useState<string[]>([]);

  useEffect(() => {
    const checkV2Availability = async () => {
      try {
        const response = await fetch('/api/v2/health', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const healthData = await response.json();
          setV2Available(true);
          setV2Features(healthData.features || []);
        } else {
          setV2Available(false);
        }
      } catch (error) {
        setV2Available(false);
      }
    };

    checkV2Availability();
  }, []);

  return {
    v2Available,
    v2Features,
    isV2Ready: v2Available === true,
    shouldUseV2: (endpoint: string) => {
      if (v2Available !== true) return false;

      const v2Endpoints = [
        'bookings',
        'calendar-events',
        'finance-records',
        'approval-steps'
      ];

      return v2Endpoints.some(ep => endpoint.includes(ep));
    }
  };
}
```

### 3. 실시간 동기화 통합
```typescript
// apps/web/src/hooks/useWebSocketIntegration.ts
export function useWebSocketIntegration() {
  const socket = useSocket();
  const { v2Available } = useApiVersion();

  useEffect(() => {
    if (!socket) return;

    // v1/v2 공통 이벤트 구독
    const handleBookingUpdate = (event: BookingEvent) => {
      // SWR 캐시 무효화
      mutate('/api/bookings');

      // v2 전용 이벤트 처리
      if (v2Available && event.version === 'v2') {
        handleV2SpecificEvent(event);
      }
    };

    socket.on('booking:created', handleBookingUpdate);
    socket.on('booking:updated', handleBookingUpdate);
    socket.on('booking:deleted', handleBookingUpdate);

    // v2 전용 이벤트
    if (v2Available) {
      socket.on('calendar-event:created', handleCalendarEvent);
      socket.on('finance-record:updated', handleFinanceRecord);
      socket.on('approval-step:completed', handleApprovalStep);
    }

    return () => {
      socket.off('booking:created', handleBookingUpdate);
      socket.off('booking:updated', handleBookingUpdate);
      socket.off('booking:deleted', handleBookingUpdate);

      if (v2Available) {
        socket.off('calendar-event:created', handleCalendarEvent);
        socket.off('finance-record:updated', handleFinanceRecord);
        socket.off('approval-step:completed', handleApprovalStep);
      }
    };
  }, [socket, v2Available]);
}
```

## 🎨 UI 컴포넌트 적응

### 1. 기능 플래그 기반 렌더링
```typescript
// apps/web/src/components/features/FeatureGuard.tsx
interface FeatureGuardProps {
  feature: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export function FeatureGuard({ feature, fallback, children }: FeatureGuardProps) {
  const { v2Features } = useApiVersion();

  const isFeatureAvailable = v2Features.includes(feature);

  if (!isFeatureAvailable) {
    return fallback || null;
  }

  return <>{children}</>;
}

// 사용 예시
<FeatureGuard
  feature="multi-step-approvals"
  fallback={<SimpleApprovalComponent />}
>
  <MultiStepApprovalComponent />
</FeatureGuard>
```

### 2. 적응형 예약 컴포넌트
```typescript
// apps/web/src/features/bookings/BookingForm.tsx
export function BookingForm({ booking, mode }: BookingFormProps) {
  const { shouldUseV2 } = useApiVersion();
  const [useV2Features, setUseV2Features] = useState(false);

  useEffect(() => {
    setUseV2Features(shouldUseV2('bookings'));
  }, [shouldUseV2]);

  return (
    <form onSubmit={handleSubmit}>
      {/* 기본 필드들 (v1/v2 공통) */}
      <BookingBasicFields booking={booking} />

      {/* v2 전용 기능들 */}
      {useV2Features && (
        <FeatureGuard feature="advanced-booking">
          <BookingAdvancedFields booking={booking} />
          <EmergencyContactField />
          <SpecialRequestsField />
          <TagsField />
          <CustomFieldsEditor />
        </FeatureGuard>
      )}

      {/* 칼렌더 통합 (v2 전용) */}
      {useV2Features && (
        <FeatureGuard feature="calendar-integration">
          <CalendarEventCreator bookingId={booking.id} />
        </FeatureGuard>
      )}

      {/* 다단계 승인 (v2 전용) */}
      {useV2Features && (
        <FeatureGuard feature="multi-step-approvals">
          <ApprovalWorkflowDesigner />
        </FeatureGuard>
      )}
    </form>
  );
}
```

### 3. 성능 최적화된 목록 컴포넌트
```typescript
// apps/web/src/features/bookings/BookingList.tsx
export function BookingList() {
  const { bookings, isLoading } = useBookings({
    apiVersion: 'auto',
    pagination: { page: 1, limit: 50 }
  });

  const { v2Features } = useApiVersion();

  // v2 전용 기능들
  const hasAdvancedFiltering = v2Features.includes('advanced-filtering');
  const hasRealTimeUpdates = v2Features.includes('real-time-updates');

  return (
    <div className="booking-list">
      {/* 필터링 */}
      {hasAdvancedFiltering ? (
        <AdvancedBookingFilters />
      ) : (
        <BasicBookingFilters />
      )}

      {/* 실시간 업데이트 인디케이터 */}
      {hasRealTimeUpdates && <RealTimeStatusIndicator />}

      {/* 목록 */}
      <VirtualizedList
        items={bookings}
        renderItem={({ booking }) => (
          <BookingCard
            booking={booking}
            showV2Features={v2Features.length > 0}
          />
        )}
        isLoading={isLoading}
      />
    </div>
  );
}
```

## 📈 모니터링 및 분석

### 1. API 버전 사용량 추적
```typescript
// apps/web/src/lib/analytics.ts
export class ApiUsageAnalytics {
  static trackApiCall(endpoint: string, version: 'v1' | 'v2', success: boolean) {
    // Google Analytics 또는 자체 분석 시스템
    gtag('event', 'api_call', {
      endpoint,
      version,
      success,
      timestamp: Date.now()
    });
  }

  static trackV2FeatureUsage(feature: string, userId: string) {
    gtag('event', 'v2_feature_usage', {
      feature,
      userId,
      timestamp: Date.now()
    });
  }

  static trackFallbackEvent(endpoint: string, error: string) {
    gtag('event', 'api_fallback', {
      endpoint,
      error,
      timestamp: Date.now()
    });
  }
}
```

### 2. 성능 메트릭 수집
```typescript
// apps/web/src/lib/performanceMonitor.ts
export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map();

  static recordApiLatency(endpoint: string, latency: number, version: string) {
    const key = `${endpoint}_${version}`;
    const existing = this.metrics.get(key) || [];
    existing.push(latency);

    // 최근 100개 요청만 유지
    if (existing.length > 100) {
      existing.shift();
    }

    this.metrics.set(key, existing);
  }

  static getAverageLatency(endpoint: string, version: string): number {
    const key = `${endpoint}_${version}`;
    const latencies = this.metrics.get(key) || [];

    if (latencies.length === 0) return 0;

    return latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
  }

  static generateReport(): PerformanceReport {
    const report: PerformanceReport = {
      timestamp: Date.now(),
      endpoints: {}
    };

    for (const [key, latencies] of this.metrics.entries()) {
      const [endpoint, version] = key.split('_');

      if (!report.endpoints[endpoint]) {
        report.endpoints[endpoint] = {};
      }

      report.endpoints[endpoint][version] = {
        averageLatency: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
        requestCount: latencies.length,
        p95: this.calculatePercentile(latencies, 95),
        p99: this.calculatePercentile(latencies, 99)
      };
    }

    return report;
  }
}
```

## 🔄 마이그레이션 로드맵

### Week 1: 인프라 구축
- [ ] API Router 구현
- [ ] v2 프록시 라우트 추가
- [ ] 통합 API 클라이언트 구현
- [ ] 기본 모니터링 시스템 구축

### Week 2: 핵심 기능 이전
- [ ] useBookings Hook v2 대응
- [ ] 예약 CRUD 기능 v2 연동
- [ ] 실시간 동기화 v2 지원
- [ ] 사용자 인증 v2 통합

### Week 3: 고급 기능 활용
- [ ] 캘린더 통합 기능 구현
- [ ] 다단계 승인 UI 개발
- [ ] 고급 필터링 기능 추가
- [ ] 성능 최적화 적용

### Week 4: 검증 및 최적화
- [ ] 전체 기능 테스트
- [ ] 성능 벤치마크
- [ ] 사용자 피드백 수집
- [ ] v1 제거 준비

## 🎯 성공 지표

### 기술적 지표
- **API 응답 시간**: v2가 v1 대비 평균 30% 향상
- **에러율**: 0.1% 이하 유지
- **Fallback 발생률**: 1% 이하
- **v2 기능 사용률**: 신규 기능 50% 이상 활용

### 비즈니스 지표
- **사용자 만족도**: v2 기능에 대한 긍정적 피드백
- **생산성 향상**: 새로운 기능으로 인한 업무 효율성 증대
- **시스템 안정성**: 다운타임 0건 달성
- **개발 속도**: 새 기능 개발 속도 40% 향상

---
**문서 버전**: 1.0.0
**작성일**: 2025-09-28
**상태**: 📋 **설계 완료**