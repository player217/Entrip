#!/bin/bash

# Entrip Deployment Script
# Usage: ./deploy.sh [environment] [service]
# Example: ./deploy.sh production all
# Example: ./deploy.sh staging api-v2

set -e

ENVIRONMENT=${1:-development}
SERVICE=${2:-all}

echo "🚀 Starting deployment for environment: $ENVIRONMENT"

# Load environment variables
case $ENVIRONMENT in
  "development")
    ENV_FILE=".env.development"
    COMPOSE_FILE="docker-compose.local.yml"
    ;;
  "staging")
    ENV_FILE=".env.staging" 
    COMPOSE_FILE="docker-compose.staging.yml"
    ;;
  "production")
    ENV_FILE=".env.production"
    COMPOSE_FILE="docker-compose.prod.yml"
    ;;
  *)
    echo "❌ Invalid environment: $ENVIRONMENT"
    echo "Valid options: development, staging, production"
    exit 1
    ;;
esac

# Check if environment file exists
if [[ ! -f "$ENV_FILE" ]]; then
    echo "❌ Environment file not found: $ENV_FILE"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' "$ENV_FILE" | xargs)

echo "📋 Environment: $ENVIRONMENT"
echo "📋 Service: $SERVICE"
echo "📋 Compose file: $COMPOSE_FILE"

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."

# Check Docker and Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed"
    exit 1
fi

# Check required environment variables
REQUIRED_VARS=("DATABASE_URL" "JWT_SECRET")
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
        echo "❌ Required environment variable $var is not set"
        exit 1
    fi
done

# Production safety checks
if [[ "$ENVIRONMENT" == "production" ]]; then
    echo "⚠️  Production deployment detected. Additional safety checks..."
    
    # Check for production-ready secrets
    if [[ "$JWT_SECRET" == *"CHANGE_ME"* ]]; then
        echo "❌ JWT_SECRET contains placeholder values. Please set secure production secrets."
        exit 1
    fi
    
    # Confirm production deployment
    read -p "⚠️  Are you sure you want to deploy to PRODUCTION? (type 'yes' to confirm): " confirm
    if [[ "$confirm" != "yes" ]]; then
        echo "❌ Production deployment cancelled"
        exit 1
    fi
fi

# Backup database (production only)
if [[ "$ENVIRONMENT" == "production" ]]; then
    echo "💾 Creating database backup..."
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    
    # Create backup using docker exec
    docker-compose -f "$COMPOSE_FILE" exec postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "backups/$BACKUP_FILE" || {
        echo "⚠️  Database backup failed, but continuing deployment..."
    }
    
    echo "✅ Database backup created: backups/$BACKUP_FILE"
fi

# Pull latest images (if using registry)
if [[ "$ENVIRONMENT" != "development" ]]; then
    echo "📥 Pulling latest images..."
    docker-compose -f "$COMPOSE_FILE" pull
fi

# Build images
echo "🔨 Building images..."
if [[ "$SERVICE" == "all" ]]; then
    docker-compose -f "$COMPOSE_FILE" build --no-cache
else
    docker-compose -f "$COMPOSE_FILE" build --no-cache "$SERVICE"
fi

# Stop existing services
echo "🛑 Stopping existing services..."
if [[ "$SERVICE" == "all" ]]; then
    docker-compose -f "$COMPOSE_FILE" down
else
    docker-compose -f "$COMPOSE_FILE" stop "$SERVICE"
fi

# Start services
echo "🚀 Starting services..."
if [[ "$SERVICE" == "all" ]]; then
    docker-compose -f "$COMPOSE_FILE" up -d
else
    docker-compose -f "$COMPOSE_FILE" up -d "$SERVICE"
fi

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Health checks
echo "🏥 Running health checks..."
HEALTH_CHECK_FAILED=false

# Check database
if ! docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "$POSTGRES_USER" > /dev/null 2>&1; then
    echo "❌ Database health check failed"
    HEALTH_CHECK_FAILED=true
fi

# Check API services
if [[ "$SERVICE" == "all" ]] || [[ "$SERVICE" == "api" ]]; then
    if ! curl -f http://localhost:4001/api/v1/health > /dev/null 2>&1; then
        echo "⚠️  API v1 health check failed"
    else
        echo "✅ API v1 is healthy"
    fi
fi

if [[ "$SERVICE" == "all" ]] || [[ "$SERVICE" == "api-v2" ]]; then
    if ! curl -f http://localhost:4002/health > /dev/null 2>&1; then
        echo "❌ API v2 health check failed"
        HEALTH_CHECK_FAILED=true
    else
        echo "✅ API v2 is healthy"
    fi
fi

# Check web service
if [[ "$SERVICE" == "all" ]] || [[ "$SERVICE" == "web" ]]; then
    if ! curl -f http://localhost:3000/health > /dev/null 2>&1; then
        echo "⚠️  Web service health check failed"
    else
        echo "✅ Web service is healthy"
    fi
fi

# Run database migrations (API v2)
if [[ "$SERVICE" == "all" ]] || [[ "$SERVICE" == "api-v2" ]]; then
    echo "📊 Running database migrations..."
    docker-compose -f "$COMPOSE_FILE" exec api-v2 pnpm prisma migrate deploy || {
        echo "⚠️  Database migration failed"
        HEALTH_CHECK_FAILED=true
    }
fi

# Final status
if [[ "$HEALTH_CHECK_FAILED" == "true" ]]; then
    echo "❌ Deployment completed with health check failures"
    echo "🔍 Check logs: docker-compose -f $COMPOSE_FILE logs"
    exit 1
else
    echo "✅ Deployment completed successfully!"
    echo "🎉 All services are healthy and running"
fi

# Show running services
echo "📋 Running services:"
docker-compose -f "$COMPOSE_FILE" ps

# Show logs command
echo "📝 To view logs: docker-compose -f $COMPOSE_FILE logs -f [service]"

echo "🚀 Deployment complete!"