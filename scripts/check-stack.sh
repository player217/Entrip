#!/bin/bash
# Entrip Docker Stack Health Check

echo "Entrip Docker Stack Health Check"
echo "================================="
echo ""

# Check if docker compose file exists
if [ ! -f "docker-compose.dev.yml" ]; then
    echo "❌ docker-compose.dev.yml not found"
    exit 1
fi

# Get service status
services=$(docker compose -f docker-compose.dev.yml ps --format json)
errors=()
healthy=0
total=0

# Process each service
while IFS= read -r line; do
    if [ -z "$line" ]; then
        continue
    fi
    
    total=$((total + 1))
    name=$(echo "$line" | jq -r '.Name')
    state=$(echo "$line" | jq -r '.State')
    status=$(echo "$line" | jq -r '.Status // ""')
    
    if [ "$state" = "running" ]; then
        if [[ "$status" == *"healthy"* ]]; then
            healthy=$((healthy + 1))
            echo "✅ $name: HEALTHY"
        elif [[ "$status" == *"unhealthy"* ]]; then
            errors+=("$name is unhealthy")
            echo "❌ $name: UNHEALTHY"
        else
            echo "⚠️  $name: running (no health check)"
        fi
    else
        errors+=("$name is not running (state: $state)")
        echo "❌ $name: NOT RUNNING"
    fi
done <<< "$services"

echo ""
echo "Summary:"
echo "--------"
echo "Healthy services: $healthy"
echo "Total services: $total"

if [ ${#errors[@]} -gt 0 ]; then
    echo "Errors: ${#errors[@]}"
    for error in "${errors[@]}"; do
        echo "  - $error"
    done
    echo ""
    echo "❌ Stack unhealthy"
    exit 1
else
    echo ""
    echo "✅ All containers healthy"
    exit 0
fi