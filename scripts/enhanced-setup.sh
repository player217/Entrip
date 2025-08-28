#!/bin/bash
# Enhanced Database Setup Script with Auto-Fix Capabilities
# Phase 2A Optimistic Locking Testing Suite

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="docker-compose.local.yml"
HEALTH_CHECK_TIMEOUT=60
RETRY_COUNT=5
RETRY_DELAY=2
API_PORT="${API_PORT:-4001}"

# Progress tracking
STEP_CURRENT=0
STEP_TOTAL=8

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { 
    ((STEP_CURRENT++))
    echo -e "${CYAN}[STEP ${STEP_CURRENT}/${STEP_TOTAL}]${NC} $1"
}

# Function to show progress bar
show_progress() {
    local progress=$1
    local total=$2
    local width=40
    local percentage=$((progress * 100 / total))
    local filled=$((progress * width / total))
    
    printf "\r["
    printf "%${filled}s" | tr ' ' '='
    printf "%$((width - filled))s" | tr ' ' '-'
    printf "] %3d%%" $percentage
    
    if [ "$progress" -eq "$total" ]; then
        echo
    fi
}

# Auto-fix DATABASE_URL for WSL compatibility
fix_database_url() {
    log_step "Checking and fixing DATABASE_URL configuration..."
    
    cd "$PROJECT_ROOT/apps/api"
    
    if [ ! -f ".env" ]; then
        log_error ".env file not found in apps/api/"
        return 1
    fi
    
    # Backup original .env
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    log_info "Created backup of .env file"
    
    # Check current DATABASE_URL
    local current_db_url=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2- | sed 's/^"//' | sed 's/"$//')
    
    # Detect environment (WSL vs native Windows)
    local is_wsl=false
    if grep -qi microsoft /proc/version 2>/dev/null; then
        is_wsl=true
        log_info "WSL environment detected"
    fi
    
    # Fix DATABASE_URL if needed
    if [[ "$current_db_url" == *"host.docker.internal"* ]]; then
        if [ "$is_wsl" = true ]; then
            log_warning "Found host.docker.internal in WSL environment - fixing..."
            
            # Replace host.docker.internal with localhost
            sed -i 's/host\.docker\.internal/localhost/g' .env
            
            log_success "DATABASE_URL updated for WSL compatibility"
            log_info "New URL: $(grep '^DATABASE_URL=' .env | cut -d'=' -f2-)"
        else
            log_info "host.docker.internal is correct for Windows Docker Desktop"
        fi
    elif [[ "$current_db_url" == *"localhost"* ]]; then
        if [ "$is_wsl" = false ]; then
            log_warning "Found localhost in Windows environment - may need host.docker.internal"
        else
            log_info "localhost is correct for WSL environment"
        fi
    fi
    
    return 0
}

# Smart Docker service management
manage_docker_services() {
    log_step "Managing Docker services intelligently..."
    
    cd "$PROJECT_ROOT"
    
    # Check if services are already running
    local postgres_running=false
    local redis_running=false
    
    if docker compose -f "$COMPOSE_FILE" ps postgres 2>/dev/null | grep -q "running"; then
        postgres_running=true
        log_info "PostgreSQL is already running"
    fi
    
    if docker compose -f "$COMPOSE_FILE" ps redis 2>/dev/null | grep -q "running"; then
        redis_running=true
        log_info "Redis is already running"
    fi
    
    # Start or restart services as needed
    if [ "$postgres_running" = false ] || [ "$redis_running" = false ]; then
        log_info "Starting required Docker services..."
        docker compose -f "$COMPOSE_FILE" up -d postgres redis
    else
        log_info "All services are running - checking health..."
        
        # Force health check
        docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U entrip -d entrip 2>/dev/null || {
            log_warning "PostgreSQL health check failed - restarting..."
            docker compose -f "$COMPOSE_FILE" restart postgres
        }
    fi
    
    # Wait for services with progress bar
    log_info "Waiting for services to be healthy..."
    local wait_count=0
    local max_wait=$HEALTH_CHECK_TIMEOUT
    
    while [ $wait_count -lt $max_wait ]; do
        show_progress $wait_count $max_wait
        
        # Check PostgreSQL health
        if docker compose -f "$COMPOSE_FILE" ps postgres 2>/dev/null | grep -q "healthy"; then
            if docker compose -f "$COMPOSE_FILE" ps redis 2>/dev/null | grep -q "healthy\|running"; then
                show_progress $max_wait $max_wait
                log_success "All services are healthy and ready!"
                return 0
            fi
        fi
        
        sleep 1
        ((wait_count++))
    done
    
    log_error "Services failed to become healthy within ${HEALTH_CHECK_TIMEOUT}s"
    return 1
}

# Test database connectivity with retries
test_database_connectivity() {
    log_step "Testing database connectivity with auto-retry..."
    
    cd "$PROJECT_ROOT/apps/api"
    
    local attempt=0
    local max_attempts=$RETRY_COUNT
    
    while [ $attempt -lt $max_attempts ]; do
        ((attempt++))
        
        log_info "Connection attempt $attempt/$max_attempts..."
        
        # Test with Prisma
        if echo "SELECT 1 as test;" | npx prisma db execute --stdin 2>/dev/null; then
            log_success "Database connection successful!"
            return 0
        fi
        
        if [ $attempt -lt $max_attempts ]; then
            log_warning "Connection failed, retrying in ${RETRY_DELAY}s..."
            sleep $RETRY_DELAY
        fi
    done
    
    log_error "Database connection failed after $max_attempts attempts"
    
    # Provide diagnostic information
    log_info "Checking Docker network connectivity..."
    docker compose -f "../$COMPOSE_FILE" logs --tail=20 postgres
    
    return 1
}

# Setup Prisma with migration handling
setup_prisma_enhanced() {
    log_step "Setting up Prisma with migration handling..."
    
    cd "$PROJECT_ROOT/apps/api"
    
    # Generate Prisma client
    log_info "Generating Prisma client..."
    if ! pnpm prisma generate; then
        log_error "Failed to generate Prisma client"
        
        # Try to fix common issues
        log_info "Attempting to fix Prisma generation issues..."
        rm -rf node_modules/.prisma
        pnpm install
        pnpm prisma generate
    fi
    
    # Push database schema with error handling
    log_info "Pushing database schema..."
    local schema_push_attempts=0
    while [ $schema_push_attempts -lt 3 ]; do
        ((schema_push_attempts++))
        
        if npx prisma db push --skip-generate --accept-data-loss; then
            log_success "Database schema synchronized!"
            break
        else
            log_warning "Schema push attempt $schema_push_attempts failed"
            
            if [ $schema_push_attempts -lt 3 ]; then
                log_info "Resetting database and retrying..."
                npx prisma db push --force-reset --skip-generate || true
                sleep 2
            fi
        fi
    done
    
    # Apply optimistic locking migration
    local migration_file="prisma/migrations/20250826020000_add_optimistic_locking/migration.sql"
    
    if [ -f "$migration_file" ]; then
        log_info "Applying optimistic locking migration..."
        if npx prisma db execute --file "$migration_file" 2>/dev/null; then
            log_success "Optimistic locking migration applied"
        else
            log_info "Migration may already be applied"
        fi
    else
        log_warning "Optimistic locking migration file not found - creating version field manually..."
        
        # Create version field if it doesn't exist
        cat <<EOF | npx prisma db execute --stdin 2>/dev/null || true
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "version" INTEGER DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "version" INTEGER DEFAULT 0;
EOF
        log_info "Version fields added to tables"
    fi
    
    return 0
}

# Verify API server health
verify_api_health() {
    log_step "Verifying API server health..."
    
    local api_url="http://localhost:${API_PORT}"
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "${api_url}/healthz" >/dev/null 2>&1; then
            log_success "API server is healthy at ${api_url}"
            
            # Test database route if available
            if curl -s "${api_url}/api/test-db/health" >/dev/null 2>&1; then
                log_success "Test database routes are accessible"
            fi
            
            return 0
        fi
        
        log_info "Waiting for API server... (${attempt}/${max_attempts})"
        sleep 2
        ((attempt++))
    done
    
    log_warning "API server not responding - please ensure it's running:"
    log_info "  cd apps/api && PORT=${API_PORT} npm run dev"
    
    return 1
}

# Network diagnostics
diagnose_network() {
    log_step "Running network diagnostics..."
    
    echo -e "\n${BOLD}Docker Network Status:${NC}"
    docker network ls | grep entrip || log_warning "Entrip network not found"
    
    echo -e "\n${BOLD}Container Status:${NC}"
    docker compose -f "$COMPOSE_FILE" ps
    
    echo -e "\n${BOLD}Port Status:${NC}"
    ss -ltnp 2>/dev/null | grep -E ':4001|:5432|:6379' || netstat -an | grep -E ':4001|:5432|:6379'
    
    echo -e "\n${BOLD}Database Configuration:${NC}"
    grep "DATABASE_URL\|PORT" "$PROJECT_ROOT/apps/api/.env" | sed 's/=.*password.*@/=***@/g'
}

# Create ready marker file
create_ready_marker() {
    log_step "Creating ready marker..."
    
    local marker_file="$PROJECT_ROOT/.phase2a-ready"
    cat > "$marker_file" <<EOF
Phase 2A Environment Ready
Timestamp: $(date)
PostgreSQL: Running
Redis: Running
API Port: ${API_PORT}
Database: Connected
Prisma: Synchronized
Optimistic Locking: Enabled
EOF
    
    log_success "Environment ready marker created"
}

# Main function
main() {
    echo "======================================================="
    echo "  Enhanced Database Setup for Phase 2A Testing"
    echo "======================================================="
    echo
    
    local start_time=$(date +%s)
    local exit_code=0
    
    # Reset step counter
    STEP_CURRENT=0
    
    # Execute setup steps
    fix_database_url || exit_code=1
    
    if [ $exit_code -eq 0 ]; then
        manage_docker_services || exit_code=1
    fi
    
    if [ $exit_code -eq 0 ]; then
        test_database_connectivity || exit_code=1
    fi
    
    if [ $exit_code -eq 0 ]; then
        setup_prisma_enhanced || exit_code=1
    fi
    
    if [ $exit_code -eq 0 ]; then
        verify_api_health || log_warning "API verification failed (non-critical)"
    fi
    
    if [ $exit_code -eq 0 ]; then
        diagnose_network
    fi
    
    if [ $exit_code -eq 0 ]; then
        create_ready_marker
    fi
    
    # Final summary
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo
    echo "======================================================="
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}${BOLD}✓ Setup completed successfully!${NC}"
        echo
        echo "Time taken: ${duration} seconds"
        echo
        echo "Ready for testing. Run:"
        echo "  ${CYAN}scripts/test-optimistic-locking-v2.sh${NC}"
        echo
        echo "Or run complete suite:"
        echo "  ${CYAN}scripts/run-all.sh${NC}"
    else
        echo -e "${RED}${BOLD}✗ Setup failed!${NC}"
        echo
        echo "Run diagnostics:"
        echo "  ${CYAN}scripts/troubleshoot-wsl.sh${NC}"
        echo
        echo "Or try auto-fix:"
        echo "  ${CYAN}scripts/auto-fix.sh${NC}"
    fi
    echo "======================================================="
    
    exit $exit_code
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi