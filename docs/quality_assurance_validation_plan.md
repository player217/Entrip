# Quality Assurance & Validation Plan
**날짜**: 2025-09-28
**프로젝트**: Entrip Travel Management System v2 Quality Assurance

## 🎯 개요

V2 마이그레이션의 품질 보증 및 검증 계획입니다. 데이터 무결성, 기능 호환성, 성능, 보안 등 전 영역에 걸친 체계적인 검증을 수행합니다.

## 📊 검증 범위 및 기준

### 1. 데이터 무결성 검증
```yaml
기준:
- 데이터 손실: 0건
- 데이터 불일치: 0건
- 관계 무결성: 100% 보장
- 타입 일치성: 100% 보장

검증 대상:
- 32개 모델 전체
- v1→v2 데이터 변환
- 실시간 동기화
- 백업/복구 시나리오
```

### 2. 기능 호환성 검증
```yaml
기준:
- v1 기능 100% 호환
- 신규 기능 정상 작동
- API 응답 일관성
- UI/UX 사용성 유지

검증 대상:
- 예약 CRUD 작업
- 메시징 시스템
- 실시간 동기화
- 인증/권한 시스템
```

### 3. 성능 검증
```yaml
기준:
- API 응답 시간: 평균 <100ms
- 데이터베이스 쿼리: <50ms
- 실시간 업데이트: <500ms
- 동시 사용자: 100명 지원

부하 테스트:
- 1,000개 예약 동시 처리
- 50명 동시 접속
- 실시간 메시징 50개/초
```

### 4. 보안 검증
```yaml
기준:
- SQL Injection: 방어 100%
- XSS 공격: 방어 100%
- 인증 우회: 방어 100%
- 데이터 암호화: 민감정보 100%

검증 영역:
- API 엔드포인트 보안
- 데이터베이스 접근 제어
- 파일 업로드 보안
- 세션 관리
```

## 🧪 테스트 전략

### Phase 1: 단위 테스트 (Unit Testing)
```typescript
// packages/api/src/__tests__/
describe('BookingService', () => {
  it('should create booking with v2 schema', async () => {
    const booking = await bookingService.create({
      companyCode: 'TEST',
      customerName: '홍길동',
      type: 'PACKAGE',
      status: 'PENDING'
    });

    expect(booking.id).toBeDefined();
    expect(booking.companyCode).toBe('TEST');
    expect(booking.status).toBe('PENDING'); // 대문자 enum 확인
  });

  it('should handle enum transformation correctly', () => {
    const v1Status = 'pending';
    const v2Status = EnumTransformer.transformBookingStatus(v1Status);

    expect(v2Status).toBe('PENDING');
  });

  it('should validate required fields', async () => {
    await expect(bookingService.create({}))
      .rejects.toThrow('companyCode is required');
  });
});
```

### Phase 2: 통합 테스트 (Integration Testing)
```typescript
// packages/api/src/__tests__/integration/
describe('Booking API Integration', () => {
  beforeEach(async () => {
    await setupTestDatabase();
    await seedTestData();
  });

  it('should handle complete booking workflow', async () => {
    // 1. 예약 생성
    const booking = await request(app)
      .post('/api/bookings')
      .send(testBookingData)
      .expect(201);

    // 2. 항공편 추가
    await request(app)
      .post('/api/flights')
      .send({ bookingId: booking.body.id, ...testFlightData })
      .expect(201);

    // 3. 예약 조회 (관계 포함)
    const response = await request(app)
      .get(`/api/bookings/${booking.body.id}?include=flights`)
      .expect(200);

    expect(response.body.flights).toHaveLength(1);
  });

  it('should maintain data consistency across transactions', async () => {
    const booking = await request(app)
      .post('/api/bookings')
      .send(testBookingData)
      .expect(201);

    // 동시에 여러 업데이트 시도
    const updates = Array.from({ length: 10 }, (_, i) =>
      request(app)
        .put(`/api/bookings/${booking.body.id}`)
        .send({ notes: `Update ${i}` })
    );

    const results = await Promise.allSettled(updates);
    const successCount = results.filter(r => r.status === 'fulfilled').length;

    expect(successCount).toBeGreaterThan(0);

    // 최종 상태 확인
    const final = await request(app)
      .get(`/api/bookings/${booking.body.id}`)
      .expect(200);

    expect(final.body.version).toBeGreaterThan(1);
  });
});
```

### Phase 3: E2E 테스트 (End-to-End Testing)
```typescript
// tests/e2e/booking.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Booking Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'pass1234');
    await page.click('[data-testid=login-button]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should create booking with v2 features', async ({ page }) => {
    // 예약 생성 페이지로 이동
    await page.goto('/booking/new');

    // 기본 정보 입력
    await page.fill('[data-testid=customer-name]', '홍길동');
    await page.selectOption('[data-testid=booking-type]', 'PACKAGE');

    // v2 전용 기능 테스트
    await page.fill('[data-testid=emergency-contact]', '010-1234-5678');
    await page.fill('[data-testid=special-requests]', '창가 좌석 요청');

    // 태그 추가 (v2 기능)
    await page.click('[data-testid=add-tag]');
    await page.fill('[data-testid=tag-input]', 'VIP');
    await page.press('[data-testid=tag-input]', 'Enter');

    // 저장
    await page.click('[data-testid=save-booking]');

    // 성공 메시지 확인
    await expect(page.locator('[data-testid=success-message]'))
      .toContainText('예약이 생성되었습니다');

    // 목록에서 확인
    await page.goto('/booking');
    await expect(page.locator('[data-testid=booking-list]'))
      .toContainText('홍길동');
  });

  test('should sync real-time updates via WebSocket', async ({ page, context }) => {
    // 두 개의 페이지 열기 (다른 사용자 시뮬레이션)
    const page2 = await context.newPage();

    await page.goto('/booking');
    await page2.goto('/booking');

    // Page 1에서 예약 생성
    await page.goto('/booking/new');
    await page.fill('[data-testid=customer-name]', '실시간테스트');
    await page.click('[data-testid=save-booking]');

    // Page 2에서 실시간 업데이트 확인
    await expect(page2.locator('[data-testid=booking-list]'))
      .toContainText('실시간테스트', { timeout: 5000 });
  });

  test('should handle v1/v2 API failover', async ({ page }) => {
    // v2 API 비활성화 시뮬레이션 (Network 차단)
    await page.route('**/api/v2/**', route => route.abort());

    await page.goto('/booking');

    // v1 API로 fallback되어 정상 작동해야 함
    await expect(page.locator('[data-testid=booking-list]')).toBeVisible();

    // v2 전용 기능은 숨겨져야 함
    await expect(page.locator('[data-testid=v2-features]')).not.toBeVisible();
  });
});
```

### Phase 4: 성능 테스트 (Performance Testing)
```typescript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export let errorRate = new Rate('errors');

export let options = {
  stages: [
    { duration: '2m', target: 10 },  // 점진적 증가
    { duration: '5m', target: 50 },  // 50명 동시 사용자
    { duration: '2m', target: 100 }, // 피크 부하
    { duration: '2m', target: 0 },   // 점진적 감소
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% 요청이 500ms 이내
    http_req_failed: ['rate<0.01'],   // 에러율 1% 미만
  },
};

export default function() {
  // 로그인
  const loginResponse = http.post('http://localhost:4002/api/auth/login', {
    email: 'test@example.com',
    password: 'pass1234'
  });

  check(loginResponse, {
    'login successful': (r) => r.status === 200
  });

  const authToken = loginResponse.json('token');

  // 예약 목록 조회
  const bookingsResponse = http.get('http://localhost:4002/api/bookings', {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  check(bookingsResponse, {
    'bookings retrieved': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 500
  }) || errorRate.add(1);

  // 예약 생성
  const createResponse = http.post('http://localhost:4002/api/bookings', {
    companyCode: 'TEST',
    customerName: `User-${__VU}-${__ITER}`,
    type: 'PACKAGE',
    status: 'PENDING'
  }, {
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  });

  check(createResponse, {
    'booking created': (r) => r.status === 201
  }) || errorRate.add(1);

  sleep(1);
}
```

## 📋 검증 체크리스트

### 데이터 무결성 검증
```bash
# 1. 스키마 검증
cd packages/api
DATABASE_URL="postgresql://entrip:entrip@localhost:5432/entrip" pnpm prisma validate

# 2. 데이터 카운트 검증
psql -U entrip entrip -c "
SELECT
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes
FROM pg_stat_user_tables
ORDER BY tablename;
"

# 3. 관계 무결성 검증
psql -U entrip entrip -c "
-- 고아 레코드 확인
SELECT 'Flight' as table_name, COUNT(*) as orphaned_count
FROM \"Flight\" f
LEFT JOIN \"Booking\" b ON f.\"bookingId\" = b.id
WHERE b.id IS NULL
UNION ALL
SELECT 'Hotel', COUNT(*)
FROM \"Hotel\" h
LEFT JOIN \"Booking\" b ON h.\"bookingId\" = b.id
WHERE b.id IS NULL;
"

# 4. Enum 값 검증
psql -U entrip entrip -c "
SELECT DISTINCT status FROM \"Booking\"
WHERE status NOT IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'CANCELLED', 'COMPLETED');
"
```

### 기능 검증 스크립트
```typescript
// scripts/functional-validation.ts
async function validateBookingWorkflow() {
  console.log('🧪 Booking Workflow Validation');

  // 1. 예약 생성
  const booking = await api.post('/api/bookings', {
    companyCode: 'TEST',
    customerName: '검증테스트',
    type: 'PACKAGE',
    status: 'PENDING'
  });

  assert(booking.status === 'PENDING', 'Booking status should be PENDING');
  console.log('✅ Booking creation: PASS');

  // 2. 항공편 추가
  const flight = await api.post('/api/flights', {
    bookingId: booking.id,
    flightNumber: 'TEST001',
    departureTime: new Date().toISOString()
  });

  assert(flight.bookingId === booking.id, 'Flight should be linked to booking');
  console.log('✅ Flight creation: PASS');

  // 3. 예약 업데이트
  const updated = await api.put(`/api/bookings/${booking.id}`, {
    status: 'CONFIRMED'
  });

  assert(updated.status === 'CONFIRMED', 'Booking status should be updated');
  assert(updated.version > booking.version, 'Version should be incremented');
  console.log('✅ Booking update: PASS');

  // 4. 관계 조회
  const withRelations = await api.get(`/api/bookings/${booking.id}?include=flights`);

  assert(withRelations.flights.length === 1, 'Should include related flights');
  console.log('✅ Relation query: PASS');

  // 5. 정리
  await api.delete(`/api/bookings/${booking.id}`);
  console.log('✅ Cleanup: PASS');

  console.log('🎉 All booking workflow tests passed!');
}
```

### 성능 벤치마크
```bash
# API 응답 시간 측정
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:4002/api/bookings"

# 데이터베이스 쿼리 성능
psql -U entrip entrip -c "
EXPLAIN ANALYZE
SELECT b.*, u.name as user_name, f.\"flightNumber\"
FROM \"Booking\" b
JOIN \"User\" u ON b.\"userId\" = u.id
LEFT JOIN \"Flight\" f ON f.\"bookingId\" = b.id
WHERE b.\"companyCode\" = 'j1'
ORDER BY b.\"createdAt\" DESC
LIMIT 50;
"

# 동시 접속 테스트
ab -n 1000 -c 50 -H "Authorization: Bearer $TOKEN" http://localhost:4002/api/bookings
```

### 보안 검증
```bash
# 1. SQL Injection 테스트
curl -X GET "http://localhost:4002/api/bookings?search='; DROP TABLE \"Booking\"; --"

# 2. XSS 테스트
curl -X POST "http://localhost:4002/api/bookings" \
  -H "Content-Type: application/json" \
  -d '{"customerName": "<script>alert(\"XSS\")</script>"}'

# 3. 인증 우회 테스트
curl -X GET "http://localhost:4002/api/bookings" # 토큰 없이

# 4. 권한 상승 테스트
curl -X GET "http://localhost:4002/api/admin/users" \
  -H "Authorization: Bearer $USER_TOKEN" # 일반 사용자 토큰으로
```

## 📊 품질 메트릭 대시보드

### 실시간 모니터링
```typescript
// scripts/quality-monitor.ts
class QualityMonitor {
  private metrics = {
    apiResponseTime: new Map<string, number[]>(),
    errorRate: new Map<string, number>(),
    databaseQueryTime: new Map<string, number[]>(),
    activeUsers: 0,
    memoryUsage: 0
  };

  startMonitoring() {
    setInterval(() => {
      this.collectMetrics();
      this.generateReport();
    }, 30000); // 30초마다
  }

  async collectMetrics() {
    // API 응답 시간
    const apiHealth = await this.checkApiHealth();
    this.metrics.apiResponseTime.set('health', [apiHealth.responseTime]);

    // 데이터베이스 성능
    const dbMetrics = await this.checkDatabasePerformance();
    this.metrics.databaseQueryTime.set('bookings', dbMetrics.bookingsQueryTime);

    // 시스템 리소스
    this.metrics.memoryUsage = process.memoryUsage().heapUsed;
    this.metrics.activeUsers = await this.getActiveUserCount();
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      api: {
        avgResponseTime: this.calculateAverage(this.metrics.apiResponseTime.get('health') || []),
        errorRate: this.metrics.errorRate.get('api') || 0
      },
      database: {
        avgQueryTime: this.calculateAverage(this.metrics.databaseQueryTime.get('bookings') || [])
      },
      system: {
        memoryUsage: Math.round(this.metrics.memoryUsage / 1024 / 1024) + 'MB',
        activeUsers: this.metrics.activeUsers
      }
    };

    console.log('📊 Quality Metrics Report:', JSON.stringify(report, null, 2));

    // 임계값 초과 시 알림
    if (report.api.avgResponseTime > 500) {
      this.sendAlert(`API response time exceeded: ${report.api.avgResponseTime}ms`);
    }

    if (report.api.errorRate > 0.01) {
      this.sendAlert(`Error rate exceeded: ${report.api.errorRate * 100}%`);
    }
  }
}
```

## 🎯 검증 일정

### Week 1: 기본 검증
- [ ] 데이터 무결성 검증
- [ ] 스키마 호환성 확인
- [ ] 기본 CRUD 기능 테스트
- [ ] 단위 테스트 실행

### Week 2: 고급 검증
- [ ] 통합 테스트 실행
- [ ] 성능 벤치마크
- [ ] 보안 취약점 스캔
- [ ] 실시간 동기화 테스트

### Week 3: 사용자 검증
- [ ] E2E 테스트 실행
- [ ] 사용자 수용 테스트
- [ ] 부하 테스트
- [ ] 장애 복구 테스트

### Week 4: 최종 검증
- [ ] 통합 품질 리포트
- [ ] 성능 최적화
- [ ] 보안 강화
- [ ] 프로덕션 배포 준비

## ✅ 최종 승인 기준

### 필수 조건 (Pass/Fail)
- [ ] 데이터 손실 0건
- [ ] 기능 호환성 100%
- [ ] 보안 취약점 0건
- [ ] 성능 기준 달성

### 권장 조건 (점수 기반)
- [ ] 응답 시간 개선 (30점)
- [ ] 사용자 만족도 (25점)
- [ ] 코드 품질 (25점)
- [ ] 문서화 완성도 (20점)

### 배포 승인 조건
- 필수 조건 100% 달성
- 권장 조건 80점 이상
- 팀 리드 최종 승인

---
**문서 버전**: 1.0.0
**작성일**: 2025-09-28
**상태**: 📋 **검증 계획 완료**