#!/usr/bin/env bash
set -euo pipefail

echo "== Prisma Status (v1: apps/api-legacy) =="
pushd apps/api-legacy >/dev/null
  npx prisma --version || true
  npx prisma validate || true
  npx prisma migrate status || true
popd >/dev/null

echo
echo "== Prisma Status (v2: packages/api) =="
pushd packages/api >/dev/null
  npx prisma --version || true
  npx prisma validate || true
  npx prisma migrate status || true
  echo
  if [ -f prisma/migrations/phase1_preview.sql ]; then
    echo "-- phase1_preview.sql present: $(wc -l < prisma/migrations/phase1_preview.sql) lines"
  else
    echo "-- phase1_preview.sql not found (run migrate diff inside container to generate)"
  fi
popd >/dev/null

echo "Done."
