#!/bin/bash

# API v1 → v2 Cutover Script
# Usage: ./api-cutover.sh [phase|rollback] [--dry-run]

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENV_FILE="apps/web/.env.local"
DOCKER_COMPOSE_FILE="docker-compose.local.yml"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    # Check if services are running
    if ! docker ps | grep -q "entrip-api-local"; then
        log_warning "API v1 is not running"
    fi

    if ! docker ps | grep -q "entrip-api-v2-local"; then
        log_warning "API v2 is not running"
    fi

    log_success "Prerequisites check complete"
}

# Health check function
health_check() {
    local url=$1
    local name=$2

    log_info "Checking health of $name..."

    if curl -f -s "${url}/api/health" > /dev/null 2>&1; then
        log_success "$name is healthy"
        return 0
    else
        log_error "$name health check failed"
        return 1
    fi
}

# Set migration phase
set_migration_phase() {
    local phase=$1
    local dry_run=$2

    log_info "Setting migration phase to: $phase"

    if [ "$dry_run" == "--dry-run" ]; then
        log_warning "DRY RUN: Would set API_MIGRATION_PHASE=$phase in $ENV_FILE"
    else
        # Update .env.local file
        if grep -q "API_MIGRATION_PHASE" "$ENV_FILE"; then
            sed -i "s/API_MIGRATION_PHASE=.*/API_MIGRATION_PHASE=$phase/" "$ENV_FILE"
        else
            echo "API_MIGRATION_PHASE=$phase" >> "$ENV_FILE"
        fi

        log_success "Migration phase set to $phase"

        # Restart web service
        log_info "Restarting web service..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" restart web
        log_success "Web service restarted"
    fi
}

# Execute cutover phase
execute_cutover() {
    local phase=$1
    local dry_run=$2

    case $phase in
        1)
            log_info "Phase 1: Migrating read-only endpoints to v2"
            log_info "Endpoints: GET /bookings, /calendar, /users, /finance"

            # Health checks
            health_check "http://localhost:4001" "API v1"
            health_check "http://localhost:4002" "API v2"

            set_migration_phase 1 "$dry_run"
            ;;

        2)
            log_info "Phase 2: Migrating authentication endpoints to v2"
            log_info "Endpoints: /auth/verify, /auth/refresh, /auth/logout"

            health_check "http://localhost:4002" "API v2"
            set_migration_phase 2 "$dry_run"
            ;;

        3)
            log_info "Phase 3: Migrating all write operations to v2"
            log_info "Endpoints: POST/PUT/DELETE for all resources"

            health_check "http://localhost:4002" "API v2"
            set_migration_phase 3 "$dry_run"
            ;;

        rollback)
            log_warning "Rolling back to v1 only"
            set_migration_phase 0 "$dry_run"
            ;;

        *)
            log_error "Invalid phase: $phase"
            echo "Usage: $0 [1|2|3|rollback] [--dry-run]"
            exit 1
            ;;
    esac
}

# Validation tests
run_validation_tests() {
    log_info "Running validation tests..."

    # Test login
    response=$(curl -s -X POST http://localhost:4001/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"companyCode":"J1","username":"admin@j1.com","password":"pass1234"}' \
        | grep -o '"success":true')

    if [ "$response" == '"success":true' ]; then
        log_success "Login test passed"
    else
        log_error "Login test failed"
        return 1
    fi

    return 0
}

# Main execution
main() {
    local phase=${1:-1}
    local dry_run=$2

    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}   API v1 → v2 Migration Tool${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo

    check_prerequisites

    if [ "$phase" != "rollback" ]; then
        log_info "Current status:"
        echo -e "  API v1: ${GREEN}http://localhost:4001${NC}"
        echo -e "  API v2: ${GREEN}http://localhost:4002${NC}"
        echo
    fi

    execute_cutover "$phase" "$dry_run"

    if [ "$dry_run" != "--dry-run" ] && [ "$phase" != "rollback" ]; then
        sleep 5  # Wait for services to stabilize

        if run_validation_tests; then
            log_success "Migration phase $phase completed successfully!"
        else
            log_error "Validation failed. Consider rollback."
            exit 1
        fi
    fi

    echo
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}   Migration Complete${NC}"
    echo -e "${GREEN}========================================${NC}"
}

# Execute main function with all arguments
main "$@"