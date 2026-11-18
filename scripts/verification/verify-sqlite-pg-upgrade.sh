#!/usr/bin/env bash
# Create a genuine prior-version PG volume and import into a separate SQLite data directory.
set -euo pipefail
: "${LAN_SMOKE_DISPOSABLE:?}" "${RUNNER_TEMP:?}" "${COMPOSE_ENV_FILES:?}"
[[ "$LAN_SMOKE_DISPOSABLE" == 1 ]]
export COMPOSE_ENV_FILES="$(realpath "$COMPOSE_ENV_FILES")"
workspace="$(mktemp -d "$RUNNER_TEMP/entrip-migrate-XXXXXX")"
cp compose.lan.yml "$workspace/"
cd "$workspace"
export COMPOSE_FILE=compose.lan.yml
export COMPOSE_PROJECT_NAME="entrip-upgrade-${GITHUB_RUN_ID:?}-${GITHUB_RUN_ATTEMPT:?}"
export ENTRIP_LEGACY_VOLUME="${COMPOSE_PROJECT_NAME}_postgres_data"
export POSTGRES_PASSWORD="$(openssl rand -hex 32)"
echo "::add-mask::$POSTGRES_PASSWORD"
if docker volume inspect "$ENTRIP_LEGACY_VOLUME" >/dev/null 2>&1; then
  echo 'Expected a new disposable test volume' >&2
  exit 1
fi
docker volume create "$ENTRIP_LEGACY_VOLUME" >/dev/null
cleanup() {
  docker compose --profile migrate down || true
  docker volume rm "$ENTRIP_LEGACY_VOLUME" >/dev/null
}
trap cleanup EXIT
docker compose --profile migrate up -d --wait postgres
docker compose run -T --rm --no-deps -e "DATABASE_URL=postgresql://entrip:$POSTGRES_PASSWORD@postgres:5432/entrip" initialize \
  node node_modules/prisma/build/index.js migrate deploy --schema packages/api/prisma/schema.prisma
query_pg() { docker compose exec -T postgres psql -X -v ON_ERROR_STOP=1 -U entrip -d entrip "$@"; }
query_pg <<'SQL'
INSERT INTO "User" ("id", "email", "name", "password", "role", "companyCode", "updatedAt", "version")
VALUES ('10000000-0000-4000-8000-000000000001','previous@example.test','이전 관리자','hash-from-old-host','ADMIN','old-team',CURRENT_TIMESTAMP,7);
SQL
docker compose run -T --rm --no-deps -e ENTRIP_IMPORT_POSTGRES=true initialize
[[ "$(query_pg -Atqc 'SELECT count(*) FROM "User"')" = 1 ]]
docker compose --profile migrate stop postgres
docker compose run -T --rm --no-deps initialize
docker compose run -T --rm --no-deps backup python3 - <<'PY'
import os, sqlite3
from pathlib import Path

with sqlite3.connect(Path(os.environ["ENTRIP_SQLITE_PATH"]).as_uri() + "?mode=ro", uri=True) as db:
    assert db.execute("PRAGMA integrity_check").fetchall() == [("ok",)]
    assert db.execute("PRAGMA foreign_key_check").fetchall() == []
    users = db.execute('SELECT id,email,name,password,role,companyCode,version FROM "User"').fetchall()
    assert users == [("10000000-0000-4000-8000-000000000001","previous@example.test","이전 관리자",
                      "hash-from-old-host","ADMIN","old-team",7)]
PY
echo 'The prior PostgreSQL account, company, version and password hash survived import and restart.'
