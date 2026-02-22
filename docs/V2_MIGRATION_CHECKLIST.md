## Entrip v2 전환 체크리스트 (완전 전환)

이 문서는 로컬/개발 환경에서 v2로 완전 전환했을 때 반드시 확인해야 할 항목을 요약합니다.

### 1) 환경변수
- Web
  - `BOOKING_API_MODE=v2`
  - `TEAM_BOOKING_API_MODE=v2`
  - `NEXT_PUBLIC_BOOKING_API_MODE=v2`
  - `NEXT_PUBLIC_TEAM_BOOKING_API_MODE=v2`
  - `API_V2_URL`(예: `http://localhost:4002`)
  - `API_MIGRATION_PHASE=3` (Strangler 라우트 사용 시)
- API v2 (packages/api)
  - `FX_ENABLE=true` (v2 환율 엔드포인트)
  - `CORS_ALLOWED_ORIGINS=http://localhost:3000`

### 2) Docker Compose(dev)
- `docker-compose.dev.yml` 의 `web` 서비스 환경변수:
  - `TEAM_BOOKING_API_MODE: v2`
  - `MIGRATION_PHASE: 3`, `API_MIGRATION_PHASE: 3`
- 컨테이너 기동: `docker compose -f docker-compose.dev.yml up -d postgres redis api-v2 web`

### 3) 웹 라우팅
- `/api/auth/login` → v2 로 전달(페이로드 `email/password/companyCode`)
- `/api/auth/verify` → v2 `/api/v2/auth/me` 사용
- `/api/exchange` → v2 `/api/v2/fx/exim` 1순위
- `/api/v2/*` 경로는 내부적으로 `API_V2_URL` 로 직접 프록시

### 4) 스모크 테스트
```bash
# v2 인증
curl -i -X POST "http://localhost:4002/api/v2/auth/login" \
  -H 'Content-Type: application/json' \
  --data '{"email":"admin@entrip.com","password":"pass1234","companyCode":"entrip"}'

# 웹 로그인(v2 경유)
curl -c /tmp/cj.txt -X POST "http://localhost:3000/api/auth/login" \
  -H 'Content-Type: application/json' \
  --data '{"email":"admin@entrip.com","password":"pass1234","companyCode":"entrip"}'

# 웹에서 v2 북킹 목록
curl -b /tmp/cj.txt "http://localhost:3000/api/v2/bookings?limit=5" | jq .

# v2 FX(EXIM 포맷)
curl "http://localhost:4002/api/v2/fx/exim?base=KRW&symbols=USD,EUR,JPY,CNY" | jq .

# 웹 EXIM(라벨 매핑 포함)
curl "http://localhost:3000/api/exchange" | jq .
```

### 5) 운영 반영 전 체크
- CORS: `CORS_ALLOWED_ORIGINS` 에 운영 도메인 CSV 로 주입
- Swagger: `/api-docs` 에서 v2 FX, Bookings, Finance 등 경로 확인
- (선택) v1 서비스 종료 전 단계적 런북: 장애 시 롤백 지침 정리


---

## 2026-02-22 Cutover Baseline (v2-only)

- All web auth proxy endpoints are pinned to v2:
  - `/api/auth/login` -> `/api/v2/auth/login`
  - `/api/auth/logout` -> `/api/v2/auth/logout`
  - `/api/auth/verify` -> `/api/v2/auth/me`
- `/api/v2/*` proxy must never route to `/api/v1/*`.
- Required compose flags:
  - `NEXT_PUBLIC_BOOKING_API_MODE: v2`
  - `NEXT_PUBLIC_TEAM_BOOKING_API_MODE: v2`
  - `BOOKING_API_MODE: v2`
  - `TEAM_BOOKING_API_MODE: v2`
  - `API_MIGRATION_PHASE: 3`
- Forbidden flags/tokens:
  - `USE_V1_BOOKINGS`
  - `BOOKING_API_MODE: v1`
  - `TEAM_BOOKING_API_MODE: v1`

### CI Gate
- `pnpm run verify:v2-cutover`
- `pnpm run verify:schema:v2`
- `pnpm run verify:schema:v2:db` (requires `DATABASE_URL`)
- `pnpm --filter @entrip/web test -- app/api/v2 app/api/auth`
- `pnpm --filter @entrip/web test -- route.v2-mapping.test.ts`

### Deployment Smoke Gate
- `SMOKE_BASE_URL=<staging-or-prod-url> pnpm run smoke:v2`
- Optional login checks:
  - `SMOKE_EMAIL`
  - `SMOKE_PASSWORD`
  - `SMOKE_COMPANY_CODE` (default: `entrip`)
- Optional reliability knobs:
  - `SMOKE_TIMEOUT_MS` (default: `8000`)
  - `SMOKE_RETRIES` (default: `2`)
- Without login credentials, protected endpoints are validated with `200/401/403` contract.

### Multi-target Evidence (staging + production)
- Copy `scripts/config/v2-gate-targets.example.json` to a private file and fill real URLs/DB URLs.
- Run:
  - `powershell -ExecutionPolicy Bypass -File scripts/verify-v2-targets.ps1 -TargetsFile <private-targets.json>`
- Output report:
  - `artifacts/v2-gates/v2-gates-<timestamp>.md`

### Rollback policy
- Do not re-enable v1 fallback flags.
- Handle incidents by fixing v2 route/service/data issues first.

### Remaining Risks (2026-02-22)
- DB migration drift against running DB:
  - 대응: `DATABASE_URL=postgresql://entrip:entrip@localhost:5432/entrip pnpm run verify:schema:v2:db`
- Missing smoke target env (`SMOKE_BASE_URL`) or unreachable v2 host:
  - 대응: `SMOKE_BASE_URL=http://localhost:4002 pnpm run smoke:v2`
- Auth/session contract mismatch for integrators (cookie + status contract):
  - 대응: `pnpm --filter @entrip/web test -- app/api/v2 app/api/auth route.v2-mapping.test.ts`

### DB Baseline Recovery (non-empty DB)
- Symptom: `P3005` (schema is not empty) or failed `20251011160327_baseline_v2_schema`.
- Recovery sequence (apply to target DB URL):
  - `pnpm --filter @entrip/api exec prisma migrate resolve --applied 20251011160327_baseline_v2_schema`
  - `pnpm --filter @entrip/api exec prisma migrate deploy`
  - `pnpm run verify:schema:v2:db`
- Validation note (2026-02-22): verified on `entrip_v2_gate2` local DB.

### Validation Snapshot (2026-02-22)
- PASS `pnpm run verify:v2-cutover`
- PASS `pnpm run verify:schema:v2`
- PASS `DATABASE_URL=postgresql://entrip:entrip@localhost:5432/entrip pnpm run verify:schema:v2:db`
- PASS `pnpm --filter @entrip/web test -- app/api/v2 app/api/auth route.v2-mapping.test.ts`
  - 14 suites, 26 tests passed
- PASS `SMOKE_BASE_URL=http://localhost:4002 pnpm run smoke:v2`
  - `/api/v2/health`: 200
  - protected endpoints: 401 contract confirmed
- Open items:
  - run `pnpm run verify:schema:v2:db` against staging/prod DB URL
  - run `SMOKE_BASE_URL=<staging-or-prod-url> pnpm run smoke:v2`
