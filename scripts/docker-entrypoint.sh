#!/bin/sh
# docker-entrypoint.sh - Docker container entrypoint with migration support

set -e

echo "🔄 Starting API server initialization..."

# 1. Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
until PGPASSWORD=entrip psql -h postgres -p 5432 -U entrip -d entrip -c '\q' 2>/dev/null; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 1
done
echo "✅ PostgreSQL is ready!"

# 2. Run migrations
echo "🔍 Checking migration status..."
cd /app/apps/api

# Check if tables exist
TABLE_COUNT=$(PGPASSWORD=entrip psql -h postgres -p 5432 -U entrip -d entrip -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null || echo "0")

if [ "$TABLE_COUNT" -gt "1" ]; then
    echo "✅ Database schema exists (found $TABLE_COUNT tables)"
    echo "📊 Running migration status check..."
    npx prisma migrate status || true
else
    echo "⚠️ Database is empty, running migrations..."
    npx prisma migrate deploy

    # Run seed data in development
    if [ "$NODE_ENV" = "development" ]; then
        echo "🌱 Seeding development data..."
        npx prisma db seed || echo "Seed might not be configured yet"
    fi
fi

# 3. Start the development server
echo "🟢 Starting development server..."
cd /app
exec pnpm --filter @entrip/api-legacy dev