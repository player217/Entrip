# Testing Guide (Container-first)

This project favors container-first testing to ensure consistent environments across Windows/macOS/Linux.

## Quick Commands

- API-only tests (isolated DB):
  - `pnpm test:api:container`
- Full monorepo tests (shared → ui → web → api):
  - `pnpm test:full:container`

Both commands use `docker-compose.dev.yml` with an ephemeral test database `entrip_test` inside the `postgres` service.

## Test Isolation & Flakiness

- Rate limiting is isolated per run via `RATE_LIMIT_PREFIX` and per-test via `X-Test-Run-Id` headers.
- Cache middleware can be disabled during tests with:
  - `NODE_ENV=test` and `CACHE_DISABLE_IN_TEST=true`
  - Already set for `test:api:container` in root `package.json`.
  - If you need it for the full suite, use: `pnpm test:full:container:nocache`.

## Database Preparation

- The helper `scripts/test-db.prepare.sh` creates `entrip_test` and applies Prisma schema.
- Safety guard: refuses to run unless `DATABASE_URL` contains `entrip_test`.
- To reduce noise (e.g., Prisma P3005 on non-empty schemas), the script:
  1) tries `prisma migrate deploy`, and if it fails,
  2) falls back to `prisma db push --accept-data-loss` (safe for test DB only).

## Windows Notes

- When running locally on Windows, prefer WSL2 or containerized tests to avoid Prisma engine path issues.
- `docker-compose -f docker-compose.dev.yml up --build -d` will bring up `postgres`, `redis`, and API containers.

## Team Bookings Tests

- Tests seed data per test (`beforeEach`) to avoid conflicts with the global cleanup hook.
- Auth headers use both `Cookie: auth-token=<token>` and `Authorization: Bearer <token>` to mirror real requests.

## Browser E2E (Playwright)

- Config lives at `apps/web/playwright.config.ts`.
- Use existing web server by setting `USE_EXISTING_WEB=true` to avoid port conflicts:
  - `USE_EXISTING_WEB=true pnpm -C apps/web test:e2e tests/e2e/booking-cross-user.spec.ts`
- Chromium runs with `--no-sandbox --disable-dev-shm-usage` for container compatibility.
- Demo credentials (company code must match exactly):
  - Company: `entrip`
  - Admin: `admin@entrip.com` / `pass1234`
  - Manager: `manager1@entrip.com` / `pass1234`
- Cross-user visibility scenario:
  1) Admin logs in and creates a booking via `/api/bookings` proxy.
  2) Navigate to `/list-monthly` and verify the new booking appears.
  3) Logout and login as `manager1@entrip.com` (same company).
  4) Verify the same booking is visible.

### Notes (2025-10-12)

- Multi-company E2E stability and fix:
  - Root cause: the v2 register endpoint schema did not include `companyCode`, and the body validator `validateBody()` replaced `req.body` with a parsed object that stripped unknown keys. Users were being created with default `ENTRIP_MAIN` company, causing cross-company visibility checks to fail.
  - Fix: Added optional `companyCode` to `RegisterDto` (see `packages/api/src/routes/auth/dtos/Register.dto.ts`). After restart, browser E2E for `j1`, `startour`, and `happytravel` passes when run serially (`--workers=1`).
  - Tip: For E2E, keep specs serial when switching sessions to avoid cookie races, and set `X-Test-Run-Id` headers to isolate rate-limits.

### Dev Toggles and WSL Notes

- Dev toggles used during local/E2E runs:
  - Web: set `NEXT_AUTH_V2=true` so web proxy uses v2 auth endpoints and preserves multiple `Set-Cookie` headers.
  - API v2: set `FX_ENABLE=true` (and optionally `FX_TTL_SEC`, `FX_REQUIRED_SYMBOLS`) to expose the free FX endpoints.
- WSL bind mounts: seeing paths like `/mnt/wsl/docker-desktop-bind-mounts/...` is expected when Docker Desktop shares files into Linux; it is not an error. Prefer running container-first tests to avoid host path quirks.

Quick commands

- Start stack: `docker compose -f docker-compose.dev.yml up -d postgres redis api-v2 crawler web`
- API tests (container-first): `pnpm -s test:api:container`
- Full tests (container-first): `pnpm -s test:full:container`
