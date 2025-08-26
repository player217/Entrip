#!/bin/bash
# Entrip Docker Stack Health Check (Simple Version)

echo "Entrip Docker Stack Health Check"
echo "================================="
echo ""

# Check docker compose status
docker-compose -f docker-compose.dev.yml ps

echo ""
echo "Checking service health..."
echo ""

# Check specific services
api_health=$(docker inspect entrip-api --format='{{.State.Health.Status}}' 2>/dev/null || echo "not_found")
postgres_health=$(docker inspect entrip-postgres --format='{{.State.Health.Status}}' 2>/dev/null || echo "not_found")
tempo_health=$(docker inspect entrip-tempo --format='{{.State.Health.Status}}' 2>/dev/null || echo "not_found")

errors=0

# Check API
if [ "$api_health" = "healthy" ]; then
    echo "✅ entrip-api: HEALTHY"
else
    echo "❌ entrip-api: $api_health"
    errors=$((errors + 1))
fi

# Check PostgreSQL
if [ "$postgres_health" = "healthy" ]; then
    echo "✅ entrip-postgres: HEALTHY"
else
    echo "❌ entrip-postgres: $postgres_health"
    errors=$((errors + 1))
fi

# Check Tempo
if [ "$tempo_health" = "healthy" ] || [ "$tempo_health" = "none" ]; then
    echo "✅ entrip-tempo: RUNNING"
else
    echo "❌ entrip-tempo: $tempo_health"
    errors=$((errors + 1))
fi

# Check API endpoint
echo ""
echo "Testing API endpoint..."
if curl -sf http://localhost:4000/healthz > /dev/null; then
    echo "✅ API healthz endpoint: OK"
else
    echo "❌ API healthz endpoint: FAILED"
    errors=$((errors + 1))
fi

echo ""
if [ $errors -eq 0 ]; then
    echo "✅ All containers healthy"
    exit 0
else
    echo "❌ $errors services unhealthy"
    exit 1
fi