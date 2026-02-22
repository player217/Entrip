# Entrip v2 Runtime Rebuild Runbook

## Scope
- Target stack: `postgres`, `redis`, `api-v2`, `crawler`, `fx-free`, `web`, `workspace`
- Target mode: v2-only cutover (`BOOKING_API_MODE=v2`, `TEAM_BOOKING_API_MODE=v2`)
- Goal: deterministic restart, health validation, and cutover gate verification

## Preconditions
1. Run in repository root: `C:\Users\PC\Documents\project\Entrip`
2. Docker Desktop is running.
3. Required ports are free: `3000`, `4002`, `5432`, `6379`, `8001`, `4010`
4. Local DB credentials are unchanged:
- `postgresql://entrip:entrip@localhost:5432/entrip`

## One-command rebuild (Windows PowerShell)
1. Standard rebuild:
```powershell
pnpm run ops:rebuild:v2
```
2. Rebuild + prune old entrip networks:
```powershell
pnpm run ops:rebuild:v2:prune
```

## What the rebuild script does
1. Starts compose services in dependency order.
2. Waits until services are running and not unhealthy.
3. Optionally removes unused `*entrip*` Docker networks except `entrip_entrip-net`.
4. Runs endpoint checks:
- `http://localhost:3000`
- `http://localhost:4002/health`
- `http://localhost:4002/api/v2/health`
- `http://localhost:8001/health`
- `http://localhost:4010/health`
- `http://localhost:3000/api/auth/verify` (`200` or `401`)
5. Runs cutover and schema gates:
- `pnpm run verify:v2-cutover`
- `pnpm run verify:schema:v2:db`
- `SMOKE_BASE_URL=http://localhost:4002 pnpm run smoke:v2`

## Manual validation checklist
1. `docker compose -f docker-compose.dev.yml ps`
- Expect all 7 services `Up`
- Expect health check enabled services to be `healthy`
2. `docker network ls --format "{{.Name}}" | findstr /I entrip`
- Expect only `entrip_entrip-net` during steady state
3. Authentication proxy contract:
- `GET /api/auth/verify` returns `401` when logged out
4. API contract:
- `GET /api/v2/health` returns `200`

## Incident handling
1. Web failed but backend healthy:
- Check `docker logs --tail 300 entrip-web-local`
- Verify `web` env uses `api-v2:4000`, `crawler:8001`, `fx-free:4010`
2. Schema gate failed:
- Run migration status with explicit DB URL:
```powershell
$env:DATABASE_URL='postgresql://entrip:entrip@localhost:5432/entrip'
pnpm exec prisma migrate status --schema packages/api/prisma/schema.prisma
```
3. Baseline drift (`P3005` or baseline migration issue):
- Use migration recovery flow from `docs/V2_MIGRATION_CHECKLIST.md`
4. Smoke failed:
- Re-run with retries/timeouts:
```powershell
$env:SMOKE_BASE_URL='http://localhost:4002'
$env:SMOKE_TIMEOUT_MS='12000'
$env:SMOKE_RETRIES='3'
pnpm run smoke:v2
```

## Remaining critical work (post-rebuild)
1. CI required gate hardening:
- Enforce `verify:v2-cutover`, `verify:schema:v2`, `verify:schema:v2:db`, `smoke:v2` as branch protection checks.
- Required workflow baseline: `.github/workflows/v2-cutover-gates.yml`
2. v1 retirement readiness:
- Freeze rollback policy and finalize v1 decommission checklist.
- Canonical checklist: `docs/V1_DECOMMISSION_CHECKLIST.md`
3. Contract coverage expansion:
- Add auth/booking/team-booking plus `fx/flights/messages` proxy contract tests.
4. Observability:
- Alert rules for API 5xx, DB connect failures, Redis failures, crawler/fx-free health degradation.
5. Secret hygiene:
- Replace all placeholder keys in runtime environments and CI secrets before production usage.

## Date stamped baseline
- Verified baseline window: `2026-02-22`
- Expected primary network: `entrip_entrip-net`
