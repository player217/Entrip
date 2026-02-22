## Docker Build Issues and Prisma Version Mismatch

This guide documents common build/runtime issues observed after bumping Prisma versions across the monorepo and how to resolve them in a container-first workflow.

### Symptoms
- `Prisma Client version mismatch` or engine errors at runtime in API containers.
- `node_modules/.prisma` artifacts from the host leak into containers.
- Legacy API (v1) and API v2 using different Prisma engine versions.

### Root Causes
- Cached Docker layers built with older `prisma` / `@prisma/client` versions.
- Bind-mounted workspace mixing host artifacts with container install.
- Out-of-sync `prisma generate` for the service image being run.

### Fix Checklist
1) Ensure versions are aligned in all workspaces
   - Root `package.json` and `apps/api/package.json` and `packages/api/package.json` should use the same versions:
     - `prisma`: `^6.16.3`
     - `@prisma/client`: `^6.16.3`

2) Rebuild images without cache
```bash
docker-compose -f docker-compose.dev.yml build --no-cache api api-v2
```

3) Make sure Prisma Client is generated inside containers
   - API v2 uses entrypoint to run `prisma generate` on startup: `scripts/docker-entrypoint-v2.sh`.
   - For API v1, rebuild image to regenerate client during Docker build.

4) Avoid host `.prisma` artifacts leaking into containers
   - Prefer container-first testing (`pnpm test:full:container`).
   - If issues persist, clean host artifacts:
```bash
pnpm run clean && rm -rf node_modules **/.prisma
```

### Verified Commands
- Start services: `pnpm dev:docker:detached`
- Full tests in container: `pnpm test:full:container`
- API-only tests in container: `pnpm test:api:container`

### Notes
- On Windows/WSL, prefer container-first for Prisma engines stability.
- If Postgres hostname differs on host, use the container network name `postgres` for tests.

