#!/bin/bash
# WSL/Docker Environment Validation Script
# Enhanced Phase 2A Optimistic Locking Testing Suite

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
API_PORT="${API_PORT:-4001}"
API_URL="http://localhost:${API_PORT}"

# Logging functions
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

# Check if we're running in WSL
check_wsl_environment() {
    log_info "Checking WSL environment..."
    
    if ! grep -qi microsoft /proc/version 2>/dev/null; then
        log_warning "Not running in WSL environment. Some checks may not apply."
        return 1
    fi
    
    log_success "Running in WSL environment"
    
    # Check WSL version
    if command -v wsl.exe >/dev/null 2>&1; then
        wsl.exe --status 2>/dev/null || log_warning "Could not get WSL status"
        wsl.exe -l -v 2>/dev/null || log_warning "Could not list WSL distributions"
    fi
    
    return 0
}

# Check Docker availability and configuration
check_docker_environment() {
    log_info "Checking Docker environment..."
    
    # Check Docker daemon
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon not accessible. Please start Docker Desktop."
        return 1
    fi
    
    # Check Docker context
    docker context ls 2>/dev/null || log_warning "Could not list Docker contexts"
    
    # Check Docker version and OS
    docker info --format '{{.ServerVersion}} {{.Server}}\n{{.OperatingSystem}}' 2>/dev/null || {
        log_error "Could not get Docker info"
        return 1
    }
    
    log_success "Docker environment accessible"
    return 0
}

# Check port availability
check_port_availability() {
    log_info "Checking port availability..."
    
    local ports=(4000 4001 5432 6379)
    local port_issues=false
    
    for port in "${ports[@]}"; do
        if ss -ltnp 2>/dev/null | grep -q ":${port} " || netstat -an 2>/dev/null | grep -q ":${port} "; then
            log_info "Port ${port} is in use (expected for running services)"
        else
            log_warning "Port ${port} is not in use"
        fi
    done
    
    return 0
}

# Validate project structure
check_project_structure() {
    log_info "Validating project structure..."
    
    local required_files=(
        "docker-compose.local.yml"
        "apps/api/.env"
        "apps/api/src/routes/booking-2a.route.ts"
        "apps/api/src/routes/test-database.route.ts"
        "apps/api/src/middleware/errorHandler.ts"
        "apps/api/src/middleware/respond.ts"
    )
    
    local missing_files=()
    
    cd "$PROJECT_ROOT"
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -gt 0 ]; then
        log_error "Missing required files:"
        for file in "${missing_files[@]}"; do
            echo "  - $file"
        done
        return 1
    fi
    
    log_success "All required project files present"
    return 0
}

# Check database configuration
check_database_config() {
    log_info "Checking database configuration..."
    
    cd "$PROJECT_ROOT/apps/api"
    
    # Check .env file
    if [ ! -f ".env" ]; then
        log_error ".env file not found"
        return 1
    fi
    
    # Check DATABASE_URL
    if ! grep -q "^DATABASE_URL=" .env; then
        log_error "DATABASE_URL not found in .env"
        return 1
    fi
    
    local db_url=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2- | sed 's/^"//' | sed 's/"$//')
    log_info "Database URL: ${db_url}"
    
    # Check if using host.docker.internal (Windows-specific)
    if [[ "$db_url" == *"host.docker.internal"* ]]; then
        log_warning "Using host.docker.internal - may need localhost for WSL"
        log_info "Consider updating to: postgresql://entrip:entrip@localhost:5432/entrip?schema=public"
    fi
    
    return 0
}

# Main validation function
main() {
    echo "======================================================="
    echo "  WSL/Docker Environment Validation for Phase 2A"
    echo "======================================================="
    echo
    
    local exit_code=0
    
    # Run all checks
    check_wsl_environment || exit_code=1
    echo
    
    check_docker_environment || exit_code=1
    echo
    
    check_port_availability
    echo
    
    check_project_structure || exit_code=1
    echo
    
    check_database_config || exit_code=1
    echo
    
    # Summary
    echo "======================================================="
    if [ $exit_code -eq 0 ]; then
        log_success "Environment validation completed successfully!"
        echo
        log_info "Next steps:"
        echo "  1. Run: cd /mnt/c/Users/PC/Documents/project/Entrip"
        echo "  2. Run: docker compose -f docker-compose.local.yml up -d postgres redis"
        echo "  3. Run: cd apps/api && pnpm prisma generate && npx prisma db push"
        echo "  4. Run: scripts/test-optimistic-locking.sh"
    else
        log_error "Environment validation failed!"
        echo
        log_info "Please fix the issues above before proceeding."
    fi
    echo "======================================================="
    
    exit $exit_code
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi