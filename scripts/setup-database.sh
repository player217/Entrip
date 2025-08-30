#!/bin/bash
# Database Setup and Testing Script for WSL Environment
# Handles both Docker and direct PostgreSQL connections

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="docker-compose.local.yml"
HEALTH_CHECK_TIMEOUT=60
RETRY_COUNT=5
RETRY_DELAY=2

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if Docker services are running
check_docker_services() {
    log_info "Checking Docker services status..."
    
    cd "$PROJECT_ROOT"
    
    local services_to_check=("postgres" "redis")
    local missing_services=()
    
    for service in "${services_to_check[@]}"; do
        if ! docker compose -f "$COMPOSE_FILE" ps "$service" | grep -q "running"; then
            missing_services+=("$service")
        fi
    done
    
    if [ ${#missing_services[@]} -gt 0 ]; then
        log_warning "Missing services: ${missing_services[*]}"
        return 1
    fi
    
    log_success "All required services are running"
    return 0
}

# Start Docker services
start_docker_services() {
    log_info "Starting Docker services..."
    
    cd "$PROJECT_ROOT"
    
    # Start postgres and redis
    docker compose -f "$COMPOSE_FILE" up -d postgres redis
    
    log_info "Waiting for services to be healthy..."
    
    # Wait for postgres to be healthy
    local postgres_healthy=false
    for ((i=1; i<=HEALTH_CHECK_TIMEOUT; i++)); do
        if docker compose -f "$COMPOSE_FILE" ps postgres | grep -q "healthy"; then
            postgres_healthy=true
            break
        fi
        
        if [ $((i % 10)) -eq 0 ]; then
            log_info "Still waiting for PostgreSQL... (${i}s)"
        fi
        
        sleep 1
    done
    
    if [ "$postgres_healthy" = false ]; then
        log_error "PostgreSQL failed to become healthy within ${HEALTH_CHECK_TIMEOUT}s"
        docker compose -f "$COMPOSE_FILE" logs postgres
        return 1
    fi
    
    # Wait for redis to be healthy
    local redis_healthy=false
    for ((i=1; i<=30; i++)); do
        if docker compose -f "$COMPOSE_FILE" ps redis | grep -q "healthy"; then
            redis_healthy=true
            break
        fi
        sleep 1
    done
    
    if [ "$redis_healthy" = false ]; then
        log_error "Redis failed to become healthy"
        docker compose -f "$COMPOSE_FILE" logs redis
        return 1
    fi
    
    log_success "All services are healthy and ready"
    return 0
}

# Test database connectivity
test_database_connection() {
    log_info "Testing database connectivity..."
    
    cd "$PROJECT_ROOT/apps/api"
    
    # Check if .env exists and has DATABASE_URL
    if [ ! -f ".env" ]; then
        log_error ".env file not found in apps/api/"
        return 1
    fi
    
    local db_url=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2- | sed 's/^"//' | sed 's/"$//')
    
    if [ -z "$db_url" ]; then
        log_error "DATABASE_URL not found in .env"
        return 1
    fi
    
    # Test connection using npx prisma db execute
    log_info "Testing Prisma database connection..."
    
    local test_query="SELECT 1 as test;"
    
    if echo "$test_query" | npx prisma db execute --stdin 2>/dev/null; then
        log_success "Database connection successful"
    else
        log_error "Database connection failed"
        log_info "DATABASE_URL: ${db_url}"
        
        # Try to diagnose the issue
        if [[ "$db_url" == *"host.docker.internal"* ]]; then
            log_warning "Detected host.docker.internal in DATABASE_URL"
            log_info "For WSL, consider changing to localhost:5432"
            log_info "Current: $db_url"
            log_info "Try: postgresql://entrip:entrip@localhost:5432/entrip?schema=public"
        fi
        
        return 1
    fi
    
    return 0
}

# Setup Prisma
setup_prisma() {
    log_info "Setting up Prisma..."
    
    cd "$PROJECT_ROOT/apps/api"
    
    # Generate Prisma client
    log_info "Generating Prisma client..."
    if ! pnpm prisma generate; then
        log_error "Failed to generate Prisma client"
        return 1
    fi
    
    # Push database schema
    log_info "Pushing database schema..."
    if ! npx prisma db push --skip-generate; then
        log_error "Failed to push database schema"
        return 1
    fi
    
    # Apply optimistic locking migration if it exists
    local migration_file="prisma/migrations/20250826020000_add_optimistic_locking/migration.sql"
    
    if [ -f "$migration_file" ]; then
        log_info "Applying optimistic locking migration..."
        if npx prisma db execute --file "$migration_file"; then
            log_success "Optimistic locking migration applied"
        else
            log_warning "Failed to apply optimistic locking migration (may already be applied)"
        fi
    else
        log_warning "Optimistic locking migration file not found: $migration_file"
    fi
    
    log_success "Prisma setup completed"
    return 0
}

# Verify API server
verify_api_server() {
    log_info "Verifying API server connectivity..."
    
    local api_url="${API_URL:-http://localhost:4001}"
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "${api_url}/healthz" >/dev/null 2>&1; then
            log_success "API server is responsive at ${api_url}"
            return 0
        fi
        
        log_info "Attempt ${attempt}/${max_attempts}: API server not ready, waiting..."
        sleep 2
        ((attempt++))
    done
    
    log_error "API server not responsive after ${max_attempts} attempts"
    log_info "Please ensure the API server is running:"
    log_info "  cd apps/api && PORT=4001 npm run dev"
    
    return 1
}

# Show connection diagnostics
show_diagnostics() {
    echo
    log_info "=== Connection Diagnostics ==="
    
    cd "$PROJECT_ROOT"
    
    # Docker containers status
    echo "Docker containers:"
    docker compose -f "$COMPOSE_FILE" ps
    echo
    
    # Port status
    echo "Port status:"
    ss -ltnp 2>/dev/null | grep -E ':4000|:4001|:5432|:6379' || echo "No relevant ports found"
    echo
    
    # Database URL
    if [ -f "apps/api/.env" ]; then
        echo "Database configuration:"
        grep "DATABASE_URL\|PORT\|NODE_ENV" apps/api/.env || echo "No relevant config found"
    fi
    
    echo
}

# Main function
main() {
    echo "======================================================="
    echo "     Database Setup and Testing for Phase 2A"
    echo "======================================================="
    echo
    
    local exit_code=0
    
    # Check if services are already running
    if check_docker_services; then
        log_info "Services already running, skipping startup"
    else
        start_docker_services || exit_code=1
    fi
    
    if [ $exit_code -eq 0 ]; then
        test_database_connection || exit_code=1
    fi
    
    if [ $exit_code -eq 0 ]; then
        setup_prisma || exit_code=1
    fi
    
    if [ $exit_code -eq 0 ]; then
        verify_api_server || {
            log_warning "API server verification failed, but database setup completed"
        }
    fi
    
    # Show diagnostics regardless of success/failure
    show_diagnostics
    
    # Summary
    echo "======================================================="
    if [ $exit_code -eq 0 ]; then
        log_success "Database setup completed successfully!"
        echo
        log_info "Ready for optimistic locking tests. Run:"
        echo "  scripts/test-optimistic-locking.sh"
    else
        log_error "Database setup failed!"
        echo
        log_info "Check the diagnostics above and resolve any issues."
    fi
    echo "======================================================="
    
    return $exit_code
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi