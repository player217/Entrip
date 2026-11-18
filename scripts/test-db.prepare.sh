#!/usr/bin/env bash
set -euo pipefail
: "${TEST_DATABASE_URL:?Set TEST_DATABASE_URL to a dedicated existing *_test database}"
export DATABASE_URL="$TEST_DATABASE_URL"
node -e 'const u = new URL(process.env.DATABASE_URL); if (!u.pathname.endsWith("_test")) throw Error("Refusing non-test database")'
if [[ "$DATABASE_URL" == file:* ]]; then
  node packages/api/prisma/prepare-sqlite.cjs
  corepack pnpm exec prisma migrate deploy --schema packages/api/prisma/sqlite/schema.prisma
  test_file=$(node -e 'process.stdout.write(require("node:url").fileURLToPath(process.env.DATABASE_URL))')
  python3 deploy/lan/sqlite/history.py "$test_file"
  corepack pnpm exec prisma generate --schema packages/api/prisma/sqlite/schema.prisma
  exit 0
fi
corepack pnpm exec prisma migrate deploy --schema packages/api/prisma/schema.prisma
corepack pnpm run prisma:generate:v2
