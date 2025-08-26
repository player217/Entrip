# Integration Resilience System

이 문서는 Entrip 외부 API 통합 복원력 시스템의 구현 가이드입니다.

## 📖 개요

이 시스템은 외부 API 연동 실패에 대한 포괄적인 복원력 패턴을 구현합니다:

- **Circuit Breaker Pattern**: 장애 전파 방지
- **Retry Logic with Exponential Backoff**: 일시적 장애 복구
- **Multi-Provider Fallback**: 1차/2차 공급자 전환
- **Stale-While-Error Caching**: 오래된 데이터라도 서비스 연속성 유지
- **Comprehensive Monitoring**: 상세한 메트릭과 헬스체크

## 🏗️ 아키텍처

```
외부 API 요청
    ↓
1. 캐시 확인 (신선한 데이터)
    ↓ (캐시 미스)
2. Circuit Breaker 확인
    ↓ (허용)
3. HTTP Client + Retry
    ↓ (실패)
4. 2차 공급자 시도
    ↓ (실패)
5. Stale 캐시 폴백
    ↓ (없음)
6. 최종 실패
```

## 🚀 사용법

### FX 환율 서비스

```typescript
import { FxService } from '../integrations/fx/fx.service';

const fxService = new FxService();

// 환율 조회
try {
  const result = await fxService.getRates('USD');
  
  console.log('환율 데이터:', result.rates);
  console.log('캐시 상태:', result.cache); // 'HIT' | 'MISS' | 'STALE'
  console.log('데이터 소스:', result.source);
  
} catch (error) {
  console.error('환율 서비스 불가:', error.message);
}

// 단일 환율 조회
try {
  const rate = await fxService.getRate('USD', 'KRW');
  console.log('USD to KRW:', rate);
} catch (error) {
  console.error('환율 조회 실패:', error.message);
}
```

### 항공편 서비스

```typescript
import { FlightService } from '../integrations/flights/flights.service';

const flightService = new FlightService();

// 항공편 검색
try {
  const result = await flightService.searchFlights({
    departure: 'ICN',
    arrival: 'NRT',
    date: '2024-12-01'
  });
  
  console.log('항공편 목록:', result.data);
  console.log('캐시 상태:', result.cache);
  
} catch (error) {
  console.error('항공편 서비스 불가:', error.message);
}

// 실시간 항공편 상태
try {
  const status = await flightService.getFlightStatus('KE001', '2024-12-01');
  console.log('항공편 상태:', status.data);
} catch (error) {
  console.error('항공편 상태 조회 실패:', error.message);
}
```

### Express 앱에 통합

```typescript
// app.ts
import express from 'express';
import healthRoutes from './routes/health.route';
import { externalCallLoggingMiddleware } from './middleware/external-logging';
import { initializeMetricsCollection } from './metrics/integrations';

const app = express();

// 외부 호출 로깅 미들웨어 적용
app.use(externalCallLoggingMiddleware());

// 헬스체크 라우트 등록
app.use('/health', healthRoutes);

// 메트릭 수집 초기화
initializeMetricsCollection();

export default app;
```

## 📊 모니터링 및 헬스체크

### 헬스체크 엔드포인트

```bash
# 기본 헬스체크
GET /health

# 통합 서비스 상태
GET /health/integrations

# 상세 통계 (최근 60분)
GET /health/integrations/stats?minutes=60

# Circuit Breaker 상태
GET /health/integrations/circuits

# 캐시 상태
GET /health/integrations/cache

# Prometheus 메트릭
GET /health/metrics
```

### 헬스체크 응답 예시

```json
{
  "status": "healthy",
  "services": {
    "fx": {
      "service": "fx",
      "providers": [
        {
          "providerName": "fx_primary",
          "status": "HEALTHY",
          "circuitState": "CLOSED",
          "isHealthy": true
        }
      ],
      "overall": "HEALTHY"
    },
    "flights": {
      "service": "flights", 
      "overall": "DEGRADED"
    }
  },
  "timestamp": "2024-12-01T10:00:00.000Z"
}
```

## 🔧 설정

### 환경 변수

```bash
# .env
ODCLOUD_API_KEY=your_odcloud_api_key
KAC_API_KEY=your_kac_api_key
FX_PRIMARY_API_KEY=your_primary_fx_api_key
FX_SECONDARY_API_KEY=your_secondary_fx_api_key

DATABASE_URL=postgresql://user:password@localhost:5432/entrip
```

### Circuit Breaker 설정

```typescript
// 다양한 프로필 사용
const criticalCircuit = createCircuitBreaker('critical_service', CircuitBreakerProfiles.CRITICAL);
const standardCircuit = createCircuitBreaker('normal_service', CircuitBreakerProfiles.STANDARD);
const fastCircuit = createCircuitBreaker('cache_service', CircuitBreakerProfiles.FAST);

// 커스텀 설정
const customCircuit = createCircuitBreaker('custom_service', {
  failThreshold: 3,
  openTimeoutMs: 30_000,
  halfOpenMaxCalls: 2
});
```

### Retry Policy 설정

```typescript
// 보수적 재시도 (중요한 작업)
const result = await withRetry(apiCall, CONSERVATIVE_RETRY_POLICY);

// 기본 재시도
const result = await withRetry(apiCall, DEFAULT_RETRY_POLICY);

// 공격적 재시도 (비중요한 작업)
const result = await withRetry(apiCall, AGGRESSIVE_RETRY_POLICY);

// 커스텀 재시도
const result = await withRetry(apiCall, {
  retries: 5,
  baseDelayMs: 100,
  maxDelayMs: 5000,
  retryOn: (status, err) => status >= 500 || err?.code === 'ECONNABORTED'
});
```

## 🧪 테스트

```bash
# 통합 테스트 실행
npm test -- integration.test.ts

# 특정 테스트 케이스
npm test -- --testNamePattern="Circuit Breaker"

# 테스트 커버리지
npm run test:coverage
```

### 테스트 시나리오

1. **Circuit Breaker 동작**
   - 정상 상태: 호출 허용
   - 장애 발생: 임계치 초과 시 Circuit 오픈
   - 복구 시도: Half-Open 상태에서 프로브 테스트

2. **Retry Logic**
   - 5xx 에러: 재시도
   - 4xx 에러: 즉시 실패
   - 네트워크 타임아웃: 재시도

3. **Fallback Chain**
   - 신선한 캐시 → 1차 공급자 → 2차 공급자 → Stale 캐시 → 실패

4. **동시성 처리**
   - 동시 요청 시 캐시 효율성
   - Circuit Breaker 상태 일관성

## 📈 성능 고려사항

### 캐시 전략

- **FX 환율**: 24시간 TTL (일일 갱신)
- **항공편 스케줄**: 1시간 TTL (시간별 갱신)
- **실시간 상태**: 5분 TTL (실시간성 우선)
- **Stale 데이터**: 최대 7일 허용

### Circuit Breaker 임계값

- **Critical Services**: 8회 실패, 2분 오픈
- **Standard Services**: 5회 실패, 1분 오픈
- **Fast Services**: 3회 실패, 30초 오픈

### 메트릭 수집

- **Response Time**: P50, P95, P99 추적
- **Error Rate**: 5분, 1시간 윈도우
- **Cache Hit Rate**: 서비스별, 공급자별
- **Circuit Breaker State**: 실시간 상태

## 🚨 운영 가이드

### 일반적인 문제 해결

#### 환율 서비스 "STALE" 표시 증가

1. `/health/integrations` 확인
2. `fx_primary` DOWN & circuit open 확인
3. 로그에서 429/5xx 비율 확인
4. 한도 초과면 쿼터/키 교체
5. 임시로 TTL 연장: `UPDATE fx_rate_cache SET ttl_sec = 172800` (48시간)
6. 복구 후 circuit 수동 reset: `POST /health/integrations/circuits/fx_primary/reset`

#### 항공편 지연 알림 누락

1. Outbox 정상/WS ack 비율 확인
2. Outbox 재시도 큐 적체 시 워커 스케일아웃
3. 클라이언트 ack 로그에서 미수신 evtId 재요청

### 알람 설정

```yaml
# prometheus alerts
groups:
- name: integration_alerts
  rules:
  - alert: HighExternalAPIErrorRate
    expr: rate(external_request_errors_total[5m]) > 0.1
    labels:
      severity: warning
    annotations:
      description: "External API error rate > 10% for {{ $labels.provider }}"

  - alert: CircuitBreakerOpen
    expr: circuit_breaker_open > 0
    labels:
      severity: critical
    annotations:
      description: "Circuit breaker open for {{ $labels.provider }}"

  - alert: CacheHitRateLow
    expr: cache_hit_rate < 50
    labels:
      severity: warning
    annotations:
      description: "Cache hit rate < 50% for {{ $labels.provider }}"
```

## 🔄 마이그레이션 가이드

### 기존 코드에서 업그레이드

1. **Database 스키마 적용**
```bash
npx prisma db push
```

2. **기존 환율 API 호출 교체**
```typescript
// Before
const response = await axios.get('https://api.exchangerate.com/rates');

// After  
const fxService = new FxService();
const result = await fxService.getRates('USD');
```

3. **기존 항공편 API 호출 교체**
```typescript
// Before
const response = await axios.get('https://api.odcloud.kr/...');

// After
const flightService = new FlightService();
const result = await flightService.searchFlights({ departure: 'ICN' });
```

4. **헬스체크 라우트 추가**
```typescript
import healthRoutes from './routes/health.route';
app.use('/health', healthRoutes);
```

### 점진적 배포

1. **Phase 1**: 스키마 및 기본 구조 배포
2. **Phase 2**: Circuit Breaker와 캐시 활성화  
3. **Phase 3**: 기존 API 호출을 새 서비스로 교체
4. **Phase 4**: 모니터링 및 알람 설정
5. **Phase 5**: 성능 최적화 및 튜닝

## 📝 로그 샘플

```bash
# 정상 동작
[INFO] Circuit breaker: SUCCESS for fx_primary, circuit reset to CLOSED
[INFO] FX rates cache HIT for USD, age: 300s

# 장애 발생  
[WARN] Circuit breaker: FAILURE for fx_primary, error count: 3/5
[INFO] Using stale FX cache for USD, age: 7200s

# Circuit 오픈
[ERROR] Circuit breaker: OPENED for fx_primary, will retry after 2024-12-01T11:00:00.000Z
```

이 시스템을 통해 외부 API 장애에도 안정적인 서비스 연속성을 확보할 수 있습니다.