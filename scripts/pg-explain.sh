#!/usr/bin/env bash
set -euo pipefail

DB_URL="${DATABASE_URL:-postgresql://entrip:entrip@localhost:5432/entrip}"
FILE="${1:-scripts/pg-explain.sql}"

echo "Running EXPLAINs from $FILE against $DB_URL"
psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$FILE"

