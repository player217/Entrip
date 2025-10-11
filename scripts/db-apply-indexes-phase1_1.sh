#!/usr/bin/env bash
set -euo pipefail

DB_URL="${DATABASE_URL:-postgresql://entrip:entrip@localhost:5432/entrip}"

echo "Applying Phase 1.1 add-only indexes concurrently to: $DB_URL"

psql "$DB_URL" -v ON_ERROR_STOP=1 -c 'SELECT 1' >/dev/null

psql "$DB_URL" -v ON_ERROR_STOP=1 -f scripts/db-add-indexes-phase1_1.sql

echo "Done."

