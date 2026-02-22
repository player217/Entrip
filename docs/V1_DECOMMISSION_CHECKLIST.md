# V1 Decommission Checklist

## Goal
- Retire `apps/api-legacy` (v1) safely after v2 parity is verified.
- Keep rollback path until explicit completion sign-off.

## Exit Criteria (all required)
1. Traffic path
- All web/API proxy paths route to v2 only.
- No production route resolves to `/api/v1/*`.
2. Data/contract parity
- Core flows pass on v2: auth, bookings CRUD, team bookings, finance, messages.
- Contract tests cover legacy DTO compatibility where required.
3. Runtime reliability
- `smoke:v2` passes on staging and production for 7 consecutive days.
- No unresolved P1/P2 incidents attributed to v2 route/service/data mismatches.
4. Operations
- On-call runbook uses v2-only commands and checks.
- Rollback policy documented and tested at least once.
5. Integrations
- External/linked programs confirmed against v2 auth/session/status contracts.
- WebSocket/event consumers validated against current topics and payloads.

## Phase Plan

### Phase A - Freeze and Observe
1. Freeze new features in v1 (`apps/api-legacy`) except critical fixes.
2. Keep v2 cutover gates mandatory in CI.
3. Capture baseline metrics:
- v2 error rate
- p95 latency
- DB/Redis failures
- crawler/fx-free health

### Phase B - Contract Closure
1. Expand contract tests for:
- auth proxy
- bookings/team-bookings mapping
- fx/flights/messages proxy routes
2. Add integration test matrix per company code (`entrip`, `j1`, `startour`, `happytravel`).
3. Confirm no v1 fallback flags remain:
- `USE_V1_BOOKINGS`
- `BOOKING_API_MODE=v1`
- `TEAM_BOOKING_API_MODE=v1`

### Phase C - Rollback Drill
1. Run rollback simulation in staging:
- inject controlled failure
- recover service via documented procedure
2. Record MTTR and unresolved gaps.
3. Update runbook and incident checklist.

### Phase D - Decommission Execution
1. Disable v1 deployment path in CI/CD.
2. Remove v1 runtime service from compose/deploy manifests (after sign-off).
3. Archive v1 docs and mark as read-only.
4. Remove remaining v1-only environment variables.

### Phase E - Post-Cut Monitoring
1. 14-day intensified monitoring window.
2. Weekly review:
- gate pass rate
- incident count
- integration partner issues
3. Final sign-off and closure report.

## Required Sign-offs
1. Backend owner (v2 API)
2. Frontend owner (proxy/route mapping)
3. QA owner (parity test report)
4. Ops/SRE owner (runbook + rollback drill)
5. Product owner (business flow acceptance)

## Current Status (as of 2026-02-22)
- v2 cutover gates exist and pass locally.
- Local runtime rebuild is automated (`pnpm run ops:rebuild:v2`).
- Full v1 retirement is not complete yet.

## Verification Snapshot (2026-02-22)
- PASS `pnpm run verify:v2-cutover`
- PASS `pnpm run verify:schema:v2`
- PASS `DATABASE_URL=postgresql://entrip:entrip@localhost:5432/entrip pnpm run verify:schema:v2:db`
- PASS `pnpm --filter @entrip/web test -- app/api/v2 app/api/auth route.v2-mapping.test.ts`
  - 14 suites, 26 tests passed
- PASS `SMOKE_BASE_URL=http://localhost:4002 pnpm run smoke:v2`
  - `/api/v2/health` 200
  - protected contract (`200/401/403`) maintained in no-login mode

## Remaining Mandatory Work
1. Staging/production DB drift verification (`verify:schema:v2:db`).
2. 7-day consecutive staging+production smoke evidence.
3. Multi-company integration matrix evidence (`entrip`, `j1`, `startour`, `happytravel`).
4. WebSocket/event consumer compatibility evidence.
5. Rollback drill record (MTTR + runbook update).

### Execution Helper
- Use `scripts/verify-v2-targets.ps1` to run target-by-target schema/smoke gates and emit timestamped evidence:
  - `powershell -ExecutionPolicy Bypass -File scripts/verify-v2-targets.ps1 -TargetsFile <private-targets.json>`
  - report: `artifacts/v2-gates/v2-gates-<timestamp>.md`
