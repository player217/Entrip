#!/bin/bash
# Automatic Problem Resolution Tool for WSL/Docker Environment
# Phase 2A Optimistic Locking Testing Suite

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="docker-compose.local.yml"
FIX_COUNT=0
TOTAL_FIXES=0

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[FIXED]${NC} $1"; ((FIX_COUNT++)); }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_fix() { echo -e "${MAGENTA}[FIXING]${NC} $1"; ((TOTAL_FIXES++)); }

# Fix DATABASE_URL issues
fix_database_url() {
    log_fix "Checking DATABASE_URL configuration..."
    
    local env_file="$PROJECT_ROOT/apps/api/.env"
    
    if [ ! -f "$env_file" ]; then
        log_error ".env file not found - creating from template..."
        
        cat > "$env_file" <<EOF
# Database - PostgreSQL (Docker container)
DATABASE_URL="postgresql://entrip:entrip@localhost:5432/entrip?schema=public"

# API
PORT=4001
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000

# JWT
JWT_SECRET=your-secret-key-here

# WebSocket
WS_URL=ws://localhost:4001
EOF
        log_success "Created .env file with correct configuration"
        return 0
    fi
    
    # Detect environment
    local is_wsl=false
    local is_docker=false
    
    if grep -qi microsoft /proc/version 2>/dev/null; then
        is_wsl=true
    fi
    
    if [ -f /.dockerenv ]; then
        is_docker=true
    fi
    
    # Backup current .env
    cp "$env_file" "$env_file.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Read current DATABASE_URL
    local current_url=$(grep "^DATABASE_URL=" "$env_file" | cut -d'=' -f2- | sed 's/^"//' | sed 's/"$//')
    
    # Determine correct host
    local correct_host=""
    if [ "$is_docker" = true ]; then
        correct_host="postgres"  # Container-to-container
    elif [ "$is_wsl" = true ]; then
        correct_host="localhost"  # WSL to host
    else
        correct_host="host.docker.internal"  # Windows to Docker
    fi
    
    # Fix DATABASE_URL
    if [[ "$current_url" == *"host.docker.internal"* ]] && [ "$is_wsl" = true ]; then
        sed -i "s/host\.docker\.internal/$correct_host/g" "$env_file"
        log_success "Fixed DATABASE_URL for WSL: host.docker.internal → $correct_host"
    elif [[ "$current_url" == *"localhost"* ]] && [ "$is_wsl" = false ] && [ "$is_docker" = false ]; then
        sed -i "s/@localhost:/@host.docker.internal:/g" "$env_file"
        log_success "Fixed DATABASE_URL for Windows: localhost → host.docker.internal"
    elif [[ "$current_url" == *"postgres:5432"* ]] && [ "$is_docker" = false ]; then
        sed -i "s/@postgres:/@$correct_host:/g" "$env_file"
        log_success "Fixed DATABASE_URL: postgres → $correct_host"
    else
        log_info "DATABASE_URL appears correct for current environment"
    fi
    
    # Fix PORT if needed
    if ! grep -q "^PORT=" "$env_file"; then
        echo "PORT=4001" >> "$env_file"
        log_success "Added missing PORT configuration"
    fi
    
    return 0
}

# Fix Docker network issues
fix_docker_network() {
    log_fix "Checking Docker network configuration..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running - attempting to start..."
        
        # Try to start Docker Desktop (Windows)
        if command -v powershell.exe >/dev/null 2>&1; then
            powershell.exe -Command "Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe'" 2>/dev/null || true
            log_info "Attempted to start Docker Desktop - waiting 10s..."
            sleep 10
        fi
        
        # Check again
        if ! docker info >/dev/null 2>&1; then
            log_error "Docker still not accessible - please start Docker Desktop manually"
            return 1
        fi
    fi
    
    # Check Docker context
    local current_context=$(docker context show 2>/dev/null)
    
    if [ "$current_context" != "default" ]; then
        log_warning "Docker context is '$current_context' - switching to default..."
        docker context use default 2>/dev/null || true
        log_success "Switched Docker context to default"
    fi
    
    # Clean up stopped containers
    local stopped_containers=$(docker ps -aq -f status=exited -f name=entrip 2>/dev/null)
    
    if [ -n "$stopped_containers" ]; then
        log_info "Removing stopped Entrip containers..."
        docker rm $stopped_containers >/dev/null 2>&1
        log_success "Cleaned up stopped containers"
    fi
    
    # Check network
    if ! docker network ls | grep -q "entrip"; then
        log_info "Creating Entrip Docker network..."
        docker network create entrip 2>/dev/null || true
        log_success "Created Docker network"
    fi
    
    return 0
}

# Fix Prisma client issues
fix_prisma_client() {
    log_fix "Checking Prisma client..."
    
    cd "$PROJECT_ROOT/apps/api"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        pnpm install
        log_success "Dependencies installed"
    fi
    
    # Regenerate Prisma client
    if [ ! -d "node_modules/.prisma/client" ]; then
        log_info "Prisma client not found - generating..."
        pnpm prisma generate
        log_success "Prisma client generated"
    else
        # Force regeneration if there are issues
        local prisma_version=$(npx prisma --version 2>/dev/null | head -n1)
        
        if [ -z "$prisma_version" ]; then
            log_warning "Prisma seems broken - regenerating..."
            rm -rf node_modules/.prisma
            pnpm prisma generate
            log_success "Prisma client regenerated"
        fi
    fi
    
    return 0
}

# Fix port conflicts
fix_port_conflicts() {
    log_fix "Checking for port conflicts..."
    
    local ports=(5432 6379 4001)
    local fixed_any=false
    
    for port in "${ports[@]}"; do
        # Check if port is in use by non-Docker process
        local pid=$(lsof -ti:$port 2>/dev/null | grep -v "^$$" | head -n1)
        
        if [ -n "$pid" ]; then
            local process_name=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
            
            # Don't kill Docker processes
            if [[ "$process_name" != *"docker"* ]] && [[ "$process_name" != *"com.docker"* ]]; then
                log_warning "Port $port is occupied by $process_name (PID: $pid)"
                
                # Ask before killing
                if [ "$AUTO_FIX" = "true" ]; then
                    kill -9 $pid 2>/dev/null || true
                    log_success "Freed port $port"
                    fixed_any=true
                else
                    log_info "Run with AUTO_FIX=true to automatically free ports"
                fi
            fi
        fi
    done
    
    if [ "$fixed_any" = false ]; then
        log_info "No port conflicts found"
    fi
    
    return 0
}

# Fix file permissions
fix_permissions() {
    log_fix "Checking file permissions..."
    
    # Fix script permissions
    chmod +x "$SCRIPT_DIR"/*.sh 2>/dev/null || true
    
    # Fix .env permissions
    if [ -f "$PROJECT_ROOT/apps/api/.env" ]; then
        chmod 600 "$PROJECT_ROOT/apps/api/.env"
        log_success "Fixed .env file permissions"
    fi
    
    # Fix node_modules permissions if needed
    if [ -d "$PROJECT_ROOT/apps/api/node_modules" ]; then
        local bad_perms=$(find "$PROJECT_ROOT/apps/api/node_modules" -type f ! -perm -u+r 2>/dev/null | head -n1)
        
        if [ -n "$bad_perms" ]; then
            log_warning "Found permission issues in node_modules - fixing..."
            chmod -R u+rw "$PROJECT_ROOT/apps/api/node_modules" 2>/dev/null || true
            log_success "Fixed node_modules permissions"
        fi
    fi
    
    return 0
}

# Fix line endings (CRLF to LF)
fix_line_endings() {
    log_fix "Checking line endings..."
    
    # Check if dos2unix is available
    if ! command -v dos2unix >/dev/null 2>&1; then
        log_info "dos2unix not found - skipping line ending fixes"
        return 0
    fi
    
    # Fix script files
    local scripts_fixed=0
    for script in "$SCRIPT_DIR"/*.sh; do
        if file "$script" | grep -q "CRLF"; then
            dos2unix "$script" 2>/dev/null
            ((scripts_fixed++))
        fi
    done
    
    if [ $scripts_fixed -gt 0 ]; then
        log_success "Fixed line endings in $scripts_fixed script files"
    fi
    
    # Fix .env files
    if [ -f "$PROJECT_ROOT/apps/api/.env" ]; then
        if file "$PROJECT_ROOT/apps/api/.env" | grep -q "CRLF"; then
            dos2unix "$PROJECT_ROOT/apps/api/.env" 2>/dev/null
            log_success "Fixed line endings in .env file"
        fi
    fi
    
    return 0
}

# Reset Docker containers
reset_docker_containers() {
    log_fix "Resetting Docker containers..."
    
    cd "$PROJECT_ROOT"
    
    # Stop and remove containers
    log_info "Stopping existing containers..."
    docker compose -f "$COMPOSE_FILE" down --volumes 2>/dev/null || true
    
    # Remove orphaned volumes
    local orphaned_volumes=$(docker volume ls -qf dangling=true | grep entrip 2>/dev/null || true)
    
    if [ -n "$orphaned_volumes" ]; then
        log_info "Removing orphaned volumes..."
        docker volume rm $orphaned_volumes 2>/dev/null || true
        log_success "Cleaned up Docker volumes"
    fi
    
    # Restart containers
    log_info "Starting fresh containers..."
    docker compose -f "$COMPOSE_FILE" up -d postgres redis
    
    # Wait for health
    local wait_count=0
    while [ $wait_count -lt 30 ]; do
        if docker compose -f "$COMPOSE_FILE" ps postgres 2>/dev/null | grep -q "healthy"; then
            log_success "Docker containers reset successfully"
            return 0
        fi
        sleep 1
        ((wait_count++))
    done
    
    log_warning "Containers started but may not be fully healthy yet"
    return 0
}

# Create missing directories
fix_directory_structure() {
    log_fix "Checking directory structure..."
    
    local required_dirs=(
        "$PROJECT_ROOT/apps/api/prisma/migrations"
        "$PROJECT_ROOT/scripts"
        "$PROJECT_ROOT/logs"
    )
    
    for dir in "${required_dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            log_success "Created missing directory: $dir"
        fi
    done
    
    return 0
}

# Quick health check
quick_health_check() {
    echo
    echo -e "${CYAN}${BOLD}Running quick health check...${NC}"
    echo
    
    local health_score=0
    local max_score=5
    
    # Check Docker
    if docker info >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Docker is running"
        ((health_score++))
    else
        echo -e "${RED}✗${NC} Docker is not running"
    fi
    
    # Check PostgreSQL
    if docker compose -f "$COMPOSE_FILE" ps postgres 2>/dev/null | grep -q "running"; then
        echo -e "${GREEN}✓${NC} PostgreSQL container is running"
        ((health_score++))
    else
        echo -e "${RED}✗${NC} PostgreSQL container is not running"
    fi
    
    # Check Redis
    if docker compose -f "$COMPOSE_FILE" ps redis 2>/dev/null | grep -q "running"; then
        echo -e "${GREEN}✓${NC} Redis container is running"
        ((health_score++))
    else
        echo -e "${RED}✗${NC} Redis container is not running"
    fi
    
    # Check .env file
    if [ -f "$PROJECT_ROOT/apps/api/.env" ]; then
        echo -e "${GREEN}✓${NC} .env file exists"
        ((health_score++))
    else
        echo -e "${RED}✗${NC} .env file missing"
    fi
    
    # Check API connectivity
    if curl -s "http://localhost:4001/healthz" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} API server is responding"
        ((health_score++))
    else
        echo -e "${YELLOW}⚠${NC} API server not responding (may need to start manually)"
    fi
    
    echo
    echo "Health Score: ${health_score}/${max_score}"
    
    if [ $health_score -eq $max_score ]; then
        echo -e "${GREEN}${BOLD}Environment is fully healthy!${NC}"
    elif [ $health_score -ge 3 ]; then
        echo -e "${YELLOW}${BOLD}Environment is partially healthy${NC}"
    else
        echo -e "${RED}${BOLD}Environment needs attention${NC}"
    fi
    
    return 0
}

# Main auto-fix function
main() {
    echo "======================================================="
    echo "  Automatic Problem Resolution Tool"
    echo "  Phase 2A Testing Environment"
    echo "======================================================="
    echo
    
    # Parse arguments
    local reset_containers=false
    
    for arg in "$@"; do
        case $arg in
            --reset)
                reset_containers=true
                ;;
            --auto)
                export AUTO_FIX=true
                ;;
            *)
                ;;
        esac
    done
    
    # Run fixes
    fix_directory_structure
    fix_database_url
    fix_docker_network
    fix_prisma_client
    fix_port_conflicts
    fix_permissions
    fix_line_endings
    
    # Optional reset
    if [ "$reset_containers" = true ]; then
        reset_docker_containers
    fi
    
    # Health check
    quick_health_check
    
    # Summary
    echo
    echo "======================================================="
    echo -e "${BOLD}Fix Summary:${NC}"
    echo "  Total issues checked: $TOTAL_FIXES"
    echo "  Issues fixed: $FIX_COUNT"
    echo
    
    if [ $FIX_COUNT -gt 0 ]; then
        echo -e "${GREEN}${BOLD}✓ Applied $FIX_COUNT fixes successfully!${NC}"
        echo
        echo "Next steps:"
        echo "  1. Run setup: ${CYAN}scripts/enhanced-setup.sh${NC}"
        echo "  2. Run tests: ${CYAN}scripts/test-optimistic-locking-v2.sh${NC}"
    else
        echo -e "${BLUE}${BOLD}No fixes were needed - environment appears healthy!${NC}"
        echo
        echo "Ready to test:"
        echo "  ${CYAN}scripts/test-optimistic-locking-v2.sh${NC}"
    fi
    echo "======================================================="
    
    exit 0
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi