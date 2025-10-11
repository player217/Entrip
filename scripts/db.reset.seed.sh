#!/usr/bin/env bash
set -euo pipefail

# Reset and reseed the v1 (apps/api) database running in Docker

CONTAINER_NAME="entrip-api-local"
DB_URL_DEV="postgresql://entrip:entrip@postgres:5432/entrip"
TIMEOUT_SECS=${TIMEOUT_SECS:-300}
AUTO_START=${AUTO_START:-0}

log() { printf "[db.reset.seed] %s\n" "$*"; }
fail() { printf "[db.reset.seed][ERROR] %s\n" "$*" >&2; exit 1; }

# 1) Preconditions
if ! command -v docker >/dev/null 2>&1; then
  fail "docker not found. Please install/start Docker Desktop."
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  if [[ "$AUTO_START" = "1" ]]; then
    log "Container ${CONTAINER_NAME} not running. Autostarting deps (postgres/redis/api)..."
    # Prefer docker compose if available, otherwise docker-compose
    if command -v docker compose >/dev/null 2>&1; then COMPOSE="docker compose"; else COMPOSE="docker-compose"; fi
    $COMPOSE -f docker-compose.dev.yml up -d postgres redis api
  else
    fail "Container ${CONTAINER_NAME} not running. Start stack first: docker compose -f docker-compose.dev.yml up -d postgres redis api"
  fi
fi

# 2) Wait healthy (bounded)
log "Waiting for ${CONTAINER_NAME} to be healthy (timeout ${TIMEOUT_SECS}s)..."
start_ts=$(date +%s)
while true; do
  health=$(docker inspect -f '{{.State.Health.Status}}' "${CONTAINER_NAME}" 2>/dev/null || echo "unknown")
  [[ "$health" = "healthy" ]] && break
  now=$(date +%s)
  if (( now - start_ts > TIMEOUT_SECS )); then
    fail "Container not healthy after ${TIMEOUT_SECS}s (status=$health). Check logs: docker logs ${CONTAINER_NAME} --tail 200"
  fi
  sleep 2
done

# 3) Reset + seed (bounded, with clear progress)
log "Running prisma db push (force reset)..."
if ! timeout ${TIMEOUT_SECS}s docker exec \
  -e DATABASE_URL="${DB_URL_DEV}" \
  -e PRISMA_HIDE_UPDATE_MESSAGE=true \
  -e npm_config_yes=true \
  "${CONTAINER_NAME}" sh -lc 'cd /app/apps/api && npx prisma db push --accept-data-loss --force-reset'; then
  fail "prisma db push timed out or failed. See: docker logs ${CONTAINER_NAME} --tail 200"
fi

log "Running prisma db seed... (this can take ~1–3 minutes)"
if ! timeout ${TIMEOUT_SECS}s docker exec \
  -e DATABASE_URL="${DB_URL_DEV}" \
  -e PRISMA_HIDE_UPDATE_MESSAGE=true \
  "${CONTAINER_NAME}" sh -lc 'cd /app/apps/api && npx prisma db seed'; then
  fail "prisma db seed timed out or failed. Try: docker exec ${CONTAINER_NAME} sh -lc '\''cd /app/apps/api && npx prisma db seed'\'''"
fi

log "Completed reseed for v1 API."
