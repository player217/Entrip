#!/bin/sh
# docker-entrypoint-v2.sh - Docker container entrypoint for API v2

set -e

echo "🔄 Starting API v2 server initialization..."

# 1. Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
until PGPASSWORD=entrip psql -h postgres -p 5432 -U entrip -d entrip -c '\q' 2>/dev/null; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 1
done
echo "✅ PostgreSQL is ready!"

# 2. Generate Prisma client for v2 API (packages/api)
echo "🔧 Generating Prisma client for API v2..."
cd /app/packages/api
npx prisma generate

# 3. (Optional) Dev-only auto DB reset and seed if explicitly enabled
if [ "${NODE_ENV}" = "development" ] && [ "${API_AUTO_DB_RESET}" = "true" ]; then
  echo "🧪 Dev flag API_AUTO_DB_RESET=true detected — resetting schema and seeding..."
  npx prisma db push --force-reset
  npx prisma db seed || echo "⚠️  Prisma seed returned non-zero; continuing"
fi

# Optional: prepare test database if explicitly requested
if [ "${API_TEST_DB_PREPARE}" = "true" ] && command -v test-db.prepare.sh >/dev/null 2>&1; then
  echo "🧪 Preparing test database via test-db.prepare.sh ..."
  DATABASE_URL=${DATABASE_URL_TEST:-$DATABASE_URL} test-db.prepare.sh || echo "⚠️ test-db.prepare.sh failed; continuing"
fi

# 4. Start the development server for v2 API
echo "🟢 Starting API v2 development server..."
exec pnpm exec ts-node-dev --respawn --transpile-only src/index.ts
