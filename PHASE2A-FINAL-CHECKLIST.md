# Phase 2A Final Checklist - Production Routes

**Status**: Test routes ✅ 6/6 PASS | Production routes pending DB

## P0 - 즉시 확정 조건 (실 DB + 실 라우트)

### ✅ 1. Docker/DB 기동
```bash
# Docker Desktop 실행 후
docker compose -f docker-compose.local.yml up -d postgres redis

# 헬스 확인
docker compose -f docker-compose.local.yml ps
# postgres와 redis가 "healthy" 상태 확인
```

### ✅ 2. .env 확인 (WSL용)
```bash
# apps/api/.env
DATABASE_URL="postgresql://entrip:entrip@localhost:5432/entrip?schema=public"
# WSL이면 localhost, Windows면 host.docker.internal
```

### ✅ 3. Prisma 동기화
```bash
cd apps/api
pnpm prisma generate
npx prisma db push
npx prisma db execute --file prisma/migrations/20250826020000_add_optimistic_locking/migration.sql
```

### ✅ 4. JWT 토큰 생성
```bash
# apps/api에서 실행
export JWT_TOKEN=$(node -e "const jwt=require('jsonwebtoken'); const secret='your-secret-key-here'; const token=jwt.sign({ userId:'dev-admin', companyCode:'ENTRIP_MAIN', role:'ADMIN' }, secret, { algorithm:'HS256', expiresIn:'15m'}); console.log(token)")
export AUTH_BEARER="Bearer $JWT_TOKEN"
export BASE_URL=http://localhost:4001
```

### ✅ 5. 실 라우트 검증 (/api/bookings)

#### Test 1: POST - 201 + ETag
```bash
curl -i -X POST "$BASE_URL/api/bookings" \
 -H "Authorization: $AUTH_BEARER" \
 -H "Content-Type: application/json" \
 -H "Idempotency-Key: bk-$(date +%s)" \
 --data '{"code":"BK-PROD1","amount":"100.00","currency":"USD","customerName":"WSL User"}'
```
**Expected**: HTTP 201 + ETag:"1"

#### Test 2: GET with If-None-Match - 304
```bash
# ID와 ETAG를 이전 응답에서 추출
export BOOKING_ID="<ID_FROM_POST>"
export ETAG="1"

curl -i "$BASE_URL/api/bookings/$BOOKING_ID" \
 -H "Authorization: $AUTH_BEARER" \
 -H "If-None-Match: \"$ETAG\""
```
**Expected**: HTTP 304 Not Modified

#### Test 3: PATCH without If-Match - 428
```bash
curl -i -X PATCH "$BASE_URL/api/bookings/$BOOKING_ID" \
 -H "Authorization: $AUTH_BEARER" \
 -H "Content-Type: application/json" \
 --data '{"amount":"150.00"}'
```
**Expected**: HTTP 428 Precondition Required

#### Test 4: PATCH with wrong If-Match - 412
```bash
curl -i -X PATCH "$BASE_URL/api/bookings/$BOOKING_ID" \
 -H "Authorization: $AUTH_BEARER" \
 -H "If-Match: \"999\"" \
 -H "Content-Type: application/json" \
 --data '{"amount":"175.00"}'
```
**Expected**: HTTP 412 Precondition Failed

#### Test 5: PATCH with correct If-Match - 200 + new ETag
```bash
curl -i -X PATCH "$BASE_URL/api/bookings/$BOOKING_ID" \
 -H "Authorization: $AUTH_BEARER" \
 -H "If-Match: \"$ETAG\"" \
 -H "Content-Type: application/json" \
 --data '{"amount":"200.00"}'
```
**Expected**: HTTP 200 + ETag:"2"

## P1 - 안정화/운영 품질 보강

### 1. Outbox 에러 가드
```bash
# apps/api/.env
OUTBOX_ENABLED=false

# 또는 코드에서 (outbox-dispatcher.ts)
if (process.env.OUTBOX_ENABLED === 'false') return;
```

### 2. 프로덕션 가드 확인
```bash
NODE_ENV=production npm run dev
curl http://localhost:4001/api/test-db/health
# Expected: 404 또는 403
```

### 3. OpenAPI 문서 보강
- GET /bookings/{id}: If-None-Match header, 304 response
- PATCH /bookings/{id}: If-Match header, 412/428 responses
- All 2xx responses: ETag header 명시

### 4. CI 게이트 추가
```yaml
# .github/workflows/test.yml
- name: Optimistic Locking Smoke Test
  run: |
    ./scripts/test-optimistic-locking-v2.sh --json
    test $(jq '.passed' < test-results.json) -eq 6
```

## 위험/롤백 포인트

| 이슈 | 원인 | 해결 |
|------|------|------|
| DB 연결 실패 | Docker 미실행 | 테스트 라우트 사용 (이미 100% PASS) |
| JWT 401 | 클레임 누락 | userId, companyCode, role 확인 |
| 428/412 안 나옴 | ApiError 처리 | errorHandler.ts 확인 |

## PR 마무리 체크

- [ ] scripts/*.sh 파일들 커밋
- [ ] errorHandler.ts ApiError instanceof 확인
- [ ] PR 설명에 테스트 결과 캡처 (5줄)
- [ ] 환경별 설정 문서화

## ✅ 최종 판정 기준

```
POST 201 + ETag:"1" .............. [  ]
GET 304 Not Modified ............ [  ]
PATCH 428 Required .............. [  ]
PATCH 412 Failed ................ [  ]
PATCH 200 + ETag:"2" ............ [  ]

All Pass → GO Decision
```

---

**현재 상태**: 
- 테스트 라우트: ✅ 6/6 PASS (검증 완료)
- 프로덕션 라우트: ⏳ DB 기동 대기

**다음 단계**: Docker 실행 → 위 명령어 순서대로 실행 → 로그 확인