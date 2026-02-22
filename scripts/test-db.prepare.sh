#!/usr/bin/env bash
set -euo pipefail

# Prepare a dedicated test database for packages/api tests
# Usage: DATABASE_URL=postgresql://entrip:entrip@localhost:5432/entrip_test scripts/test-db.prepare.sh

DB_URL_DEFAULT="postgresql://entrip:entrip@localhost:5432/entrip_test"
DB_URL="${DATABASE_URL:-$DB_URL_DEFAULT}"

echo "[test-db.prepare] Using DATABASE_URL=$DB_URL"

# Safety guard: only operate on dedicated test DBs
if [[ "$DB_URL" != *"entrip_test"* ]]; then
  echo "[test-db.prepare] ERROR: Refusing to run against non-test database. Expected DATABASE_URL to contain 'entrip_test'." >&2
  exit 1
fi

# Try local psql first; if fails, attempt docker container
if command -v psql >/dev/null 2>&1; then
  echo "[test-db.prepare] Creating database (local psql)..."
  psql "${DB_URL%/*}/postgres" -v ON_ERROR_STOP=1 -c "CREATE DATABASE entrip_test;" || true
else
  echo "[test-db.prepare] Local psql not found; trying docker container entrip-postgres-local..."
  docker exec entrip-postgres-local sh -lc "psql -U entrip -d postgres -c 'CREATE DATABASE entrip_test;'" || true
fi

echo "[test-db.prepare] Applying migrations (packages/api)..."
(
  cd packages/api
  set +e
  DATABASE_URL="$DB_URL" npx prisma migrate deploy 2>deploy.err
  DEPLOY_EXIT=$?
  if [ $DEPLOY_EXIT -ne 0 ]; then
    echo "[test-db.prepare] prisma migrate deploy failed (likely P3005 on non-empty schema); proceeding with db push"
    # Show brief one-line error to reduce log noise
    head -n 1 deploy.err || true
  else
    echo "[test-db.prepare] prisma migrate deploy succeeded"
  fi
  rm -f deploy.err
  # Sync schema regardless; db push is idempotent for tests
  DATABASE_URL="$DB_URL" npx prisma db push --accept-data-loss
  set -e
  DATABASE_URL="$DB_URL" npx prisma generate
)

echo "[test-db.prepare] Done."
