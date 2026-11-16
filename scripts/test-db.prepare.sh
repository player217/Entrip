#!/usr/bin/env bash
set -euo pipefail
: "${TEST_DATABASE_URL:?Set TEST_DATABASE_URL to a dedicated existing *_test database}"
export DATABASE_URL="$TEST_DATABASE_URL"
node -e 'if (!new URL(process.env.DATABASE_URL).pathname.endsWith("_test")) throw Error("Refusing non-test database")'
corepack pnpm exec prisma migrate deploy --schema packages/api/prisma/schema.prisma
corepack pnpm run prisma:generate:v2
