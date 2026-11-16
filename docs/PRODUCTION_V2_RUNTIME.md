# Entrip v2 production runtime

The production source configuration was reconciled on 2026-11-17. **Docker image builds, container startup and production TLS have not been executed in this environment.** YAML syntax, referenced build contexts/mounts and the snapshot reader were checked. Treat this as deployment configuration to validate on a Docker host, not an already deployed service.

## Services and routing

- PostgreSQL keeps the existing `postgres_data` volume and the `./backups` mount. `migrate` runs only `prisma migrate deploy`; no reset or demo seed runs in production.
- API v2 runs from `packages/api`, port 4002. Web runs from `apps/web`, port 3000.
- nginx listens on container port 80, bound to `127.0.0.1:8080` by default. Put the existing HTTPS reverse proxy/load balancer in front and overwrite `X-Forwarded-Proto` with `https`.
- `/api/v2/*` and `/socket.io/*` go to API v2. Web owns `/api/auth/*`, `/api/exchange` and page routes. The Socket.IO upgrade headers and long read timeout are configured explicitly.
- One API instance is configured. Do not scale it until Socket.IO uses a shared adapter; the existing realtime rooms are in process memory.
- Legacy API and monitoring are separate opt-in profiles (`legacy`, `monitoring`). They are not required by the default v2 application. The legacy image and monitoring deployment remain unverified.

## Required environment

Use a local, untracked environment file; do not commit credentials.

| Variable | Purpose |
| --- | --- |
| `POSTGRES_PASSWORD` | Existing/new database password |
| `POSTGRES_USER`, `POSTGRES_DB` | Default `entrip`; keep the existing installation's values |
| `DATABASE_URL` | Optional full PostgreSQL connection URL, required if the password contains URL-reserved characters; URL-encode the password |
| `JWT_SECRET` | Random secret, at least 32 characters |
| `JWT_REFRESH_SECRET` | A distinct random secret, at least 32 characters |
| `PUBLIC_APP_URL` | Exact public HTTPS origin, used for CORS and the compiled browser WebSocket URL |
| `NGINX_BIND`, `NGINX_HTTP_PORT` | Defaults `127.0.0.1`, `8080`; adapt to the TLS terminator's network |

Changing `PUBLIC_APP_URL` requires rebuilding the web image because `NEXT_PUBLIC_WS_URL` is compiled by Next.js. Production authentication uses secure cookies, so a plain HTTP browser URL is not a valid production login check.

Before starting, preserve a database backup and review migrations against the existing database. Then validate the concrete deployment configuration on the Docker host:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml config --quiet
docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Verify HTTPS login, booking create/reopen, two independent users exchanging messages, and account approval before considering deployment complete. The default stack does not seed demo credentials or provision a production administrator.

## Flight and exchange data

The included crawler container serves the repository's **2025-07-29 historical schedule snapshot**. It does not collect new schedules. The UI preserves the snapshot timestamp and marks it as old; missing or unreadable data returns 503 instead of fabricated flights. Replace the configured `CRAWLER_API_URL` with a maintained source when current schedules are needed. The read-only JSON mount is preserved.

`fx-free` uses configured public exchange providers. API v2 receives `FX_FREE_URL=http://fx-free:4010`; Web also has `INTERNAL_FX_FREE_URL` as an explicitly configured fallback. Provider failures return unavailable, with no static price replacement. JPY displays per 100 yen. EXIM fee fields are not treated as daily price changes.

The source can be checked locally with:

```bash
python3 scripts/verification/verify-flight-snapshot.py
```
