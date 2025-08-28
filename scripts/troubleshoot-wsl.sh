#!/bin/bash
# WSL/Docker Troubleshooting and Diagnostic Tool
# Advanced debugging for Phase 2A environment issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
API_URL="${API_URL:-http://localhost:4001}"
COMPOSE_FILE="docker-compose.local.yml"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_debug() { echo -e "${PURPLE}[DEBUG]${NC} $1"; }
log_section() { echo -e "${BOLD}=== $1 ===${NC}"; }

# System information
show_system_info() {
    log_section "System Information"
    
    echo "OS Information:"
    if [ -f /proc/version ]; then
        cat /proc/version
    else
        uname -a
    fi
    echo
    
    echo "WSL Information:"
    if command -v wsl.exe >/dev/null 2>&1; then
        wsl.exe --version 2>/dev/null || echo "WSL version not available"
        echo
        wsl.exe --status 2>/dev/null || echo "WSL status not available"
        echo
        wsl.exe -l -v 2>/dev/null || echo "WSL distributions not available"
    else
        echo "Not running in WSL environment or wsl.exe not available"
    fi
    echo
}

# Network diagnostics
show_network_info() {
    log_section "Network Diagnostics"
    
    echo "Network Interfaces:"
    ip addr show 2>/dev/null | grep -E '^[0-9]+:|inet ' | head -20 || \
    ifconfig 2>/dev/null | grep -E 'inet |^[a-z]' | head -20 || \
    echo "Network interface information not available"
    echo
    
    echo "Port Usage (Key Ports):"
    local ports=(3000 4000 4001 5432 6379 8001)
    for port in "${ports[@]}"; do
        local port_info=""
        
        # Try ss first (modern)
        if command -v ss >/dev/null 2>&1; then
            port_info=$(ss -tlnp 2>/dev/null | grep ":$port ")
        fi
        
        # Fall back to netstat
        if [ -z "$port_info" ] && command -v netstat >/dev/null 2>&1; then
            port_info=$(netstat -tlnp 2>/dev/null | grep ":$port ")
        fi
        
        if [ -n "$port_info" ]; then
            echo "  Port $port: $port_info"
        else
            echo "  Port $port: Not in use"
        fi
    done
    echo
    
    echo "DNS Resolution Test:"
    for host in localhost host.docker.internal; do
        if nslookup "$host" >/dev/null 2>&1; then
            local ip=$(nslookup "$host" 2>/dev/null | grep -A1 'Name:' | tail -1 | awk '{print $2}')
            echo "  $host: $ip"
        else
            echo "  $host: Resolution failed"
        fi
    done
    echo
}

# Docker diagnostics
show_docker_info() {
    log_section "Docker Diagnostics"
    
    echo "Docker Status:"
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon not accessible"
        echo "Troubleshooting steps:"
        echo "1. Ensure Docker Desktop is running"
        echo "2. Check WSL integration: Docker Desktop → Settings → Resources → WSL Integration"
        echo "3. Restart Docker Desktop"
        echo "4. Run: docker context use default"
        return 1
    fi
    
    echo "Docker Version:"
    docker version --format 'Client: {{.Client.Version}}, Server: {{.Server.Version}}' 2>/dev/null || echo "Version info unavailable"
    echo
    
    echo "Docker Context:"
    docker context ls 2>/dev/null || echo "Context list unavailable"
    echo
    
    echo "Docker System Info:"
    docker info --format 'OS: {{.OperatingSystem}}\nArchitecture: {{.Architecture}}\nCPUs: {{.NCPU}}\nMemory: {{.MemTotal}}' 2>/dev/null || echo "System info unavailable"
    echo
    
    cd "$PROJECT_ROOT" 2>/dev/null || return 1
    
    echo "Project Containers:"
    if [ -f "$COMPOSE_FILE" ]; then
        docker compose -f "$COMPOSE_FILE" ps --format 'table {{.Name}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || echo "Container status unavailable"
    else
        echo "docker-compose.local.yml not found"
    fi
    echo
    
    echo "Container Health Checks:"
    local containers=(entrip-postgres-local entrip-redis-local entrip-api-local)
    for container in "${containers[@]}"; do
        if docker ps --filter "name=$container" --format '{{.Names}}' | grep -q "$container"; then
            local health=$(docker inspect "$container" --format '{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
            echo "  $container: $health"
        else
            echo "  $container: Not running"
        fi
    done
    echo
}

# Database diagnostics
show_database_info() {
    log_section "Database Diagnostics"
    
    cd "$PROJECT_ROOT/apps/api" 2>/dev/null || {
        log_error "Cannot access apps/api directory"
        return 1
    }
    
    echo "Environment Configuration:"
    if [ -f ".env" ]; then
        echo "  .env file: Present"
        local db_url=$(grep "^DATABASE_URL=" .env 2>/dev/null | cut -d'=' -f2- | sed 's/^"//' | sed 's/"$//')
        if [ -n "$db_url" ]; then
            echo "  DATABASE_URL: $db_url"
            
            # Analyze DATABASE_URL for common issues
            if [[ "$db_url" == *"host.docker.internal"* ]]; then
                log_warning "Using host.docker.internal (Windows Docker specific)"
                log_info "For WSL, consider: postgresql://entrip:entrip@localhost:5432/entrip?schema=public"
            fi
            
            if [[ "$db_url" == *"localhost"* ]] || [[ "$db_url" == *"127.0.0.1"* ]]; then
                log_info "Using localhost connection (WSL friendly)"
            fi
        else
            log_error "DATABASE_URL not found in .env"
        fi
        
        local port=$(grep "^PORT=" .env 2>/dev/null | cut -d'=' -f2)
        echo "  PORT: ${port:-not set}"
        
        local node_env=$(grep "^NODE_ENV=" .env 2>/dev/null | cut -d'=' -f2)
        echo "  NODE_ENV: ${node_env:-not set}"
    else
        log_error ".env file not found"
    fi
    echo
    
    echo "Database Connectivity Test:"
    if command -v npx >/dev/null 2>&1; then
        if echo "SELECT 1 as test;" | npx prisma db execute --stdin >/dev/null 2>&1; then
            log_success "Database connection successful"
        else
            log_error "Database connection failed"
            echo "Common solutions:"
            echo "1. Check if PostgreSQL container is running and healthy"
            echo "2. Verify DATABASE_URL in .env file"
            echo "3. Try running: docker compose -f docker-compose.local.yml up -d postgres"
            echo "4. For WSL, use localhost instead of host.docker.internal"
        fi
    else
        log_warning "npx not available for database testing"
    fi
    echo
    
    echo "Prisma Status:"
    if [ -f "prisma/schema.prisma" ]; then
        echo "  schema.prisma: Present"
        if [ -d "node_modules/.prisma" ]; then
            echo "  Prisma client: Generated"
        else
            log_warning "Prisma client not generated - run: pnpm prisma generate"
        fi
    else
        log_error "prisma/schema.prisma not found"
    fi
    echo
}

# API server diagnostics
show_api_info() {
    log_section "API Server Diagnostics"
    
    echo "API Connectivity:"
    local endpoints=(
        "/healthz"
        "/api/v1/health" 
        "/docs"
        "/api/test-db/bookings"
    )
    
    for endpoint in "${endpoints[@]}"; do
        local url="$API_URL$endpoint"
        local status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo "ERROR")
        
        case $status in
            200|201) echo "  $endpoint: ✅ $status" ;;
            404) echo "  $endpoint: ℹ️ $status (not found - may be expected)" ;;
            401|403) echo "  $endpoint: 🔒 $status (auth required)" ;;
            ERROR) echo "  $endpoint: ❌ Connection failed" ;;
            *) echo "  $endpoint: ⚠️ $status" ;;
        esac
    done
    echo
    
    echo "API Response Headers (healthz):"
    local headers
    headers=$(curl -I -s --max-time 5 "$API_URL/healthz" 2>/dev/null | head -10 || echo "Failed to get headers")
    echo "$headers" | while read -r line; do
        echo "  $line"
    done
    echo
    
    echo "Test Route Accessibility:"
    local test_endpoints=(
        "/api/test-respond"
        "/api/test-db/bookings"
    )
    
    for endpoint in "${test_endpoints[@]}"; do
        local prod_status=$(NODE_ENV=production curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$API_URL$endpoint" 2>/dev/null || echo "ERROR")
        local dev_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$API_URL$endpoint" 2>/dev/null || echo "ERROR")
        
        echo "  $endpoint:"
        echo "    Development: $dev_status"
        echo "    Production:  $prod_status"
        
        if [ "$prod_status" = "404" ] && [ "$dev_status" != "404" ]; then
            echo "    ✅ Properly guarded (blocked in production)"
        elif [ "$prod_status" != "404" ] && [ "$dev_status" != "404" ]; then
            echo "    ⚠️ Not properly guarded (accessible in production)"
        fi
    done
    echo
}

# File system diagnostics
show_filesystem_info() {
    log_section "File System Diagnostics"
    
    cd "$PROJECT_ROOT" 2>/dev/null || {
        log_error "Cannot access project root: $PROJECT_ROOT"
        return 1
    }
    
    echo "Project Structure:"
    local required_paths=(
        "apps/api/src/routes/booking-2a.route.ts"
        "apps/api/src/routes/test-database.route.ts"
        "apps/api/src/middleware/errorHandler.ts"
        "apps/api/src/middleware/respond.ts"
        "apps/api/prisma/schema.prisma"
        "apps/api/.env"
        "docker-compose.local.yml"
    )
    
    for path in "${required_paths[@]}"; do
        if [ -f "$path" ]; then
            local size=$(stat -f%z "$path" 2>/dev/null || stat -c%s "$path" 2>/dev/null || echo "unknown")
            echo "  $path: ✅ ($size bytes)"
        else
            echo "  $path: ❌ Missing"
        fi
    done
    echo
    
    echo "File Permissions (apps/api/.env):"
    if [ -f "apps/api/.env" ]; then
        ls -la "apps/api/.env" | awk '{print "  " $1 " " $3 ":" $4 " " $9}'
    else
        echo "  .env file not found"
    fi
    echo
    
    echo "Line Ending Check (.env):"
    if [ -f "apps/api/.env" ]; then
        if file "apps/api/.env" 2>/dev/null | grep -q "CRLF"; then
            log_warning "CRLF line endings detected (Windows style)"
            log_info "Consider converting to LF: dos2unix apps/api/.env"
        else
            echo "  Line endings: Unix (LF) ✅"
        fi
    fi
    echo
}

# Performance diagnostics
show_performance_info() {
    log_section "Performance Diagnostics"
    
    echo "System Resources:"
    if command -v free >/dev/null 2>&1; then
        echo "Memory Usage:"
        free -h | while read -r line; do echo "  $line"; done
    fi
    echo
    
    if command -v df >/dev/null 2>&1; then
        echo "Disk Usage:"
        df -h . 2>/dev/null | while read -r line; do echo "  $line"; done
    fi
    echo
    
    echo "Docker Resource Usage:"
    if docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}' 2>/dev/null | grep -E 'entrip-|NAME'; then
        echo "Docker stats shown above"
    else
        echo "  No running containers or docker stats unavailable"
    fi
    echo
    
    echo "API Response Time Test:"
    for endpoint in "/healthz" "/api/test-db/bookings"; do
        local response_time
        response_time=$(curl -s -w "%{time_total}" -o /dev/null --max-time 10 "$API_URL$endpoint" 2>/dev/null || echo "failed")
        
        if [ "$response_time" != "failed" ]; then
            echo "  $endpoint: ${response_time}s"
        else
            echo "  $endpoint: Failed to measure"
        fi
    done
    echo
}

# Generate comprehensive report
generate_report() {
    log_section "Generating Diagnostic Report"
    
    local report_file="$PROJECT_ROOT/wsl-diagnostic-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "WSL/Docker Diagnostic Report"
        echo "Generated: $(date)"
        echo "Project Root: $PROJECT_ROOT"
        echo "API URL: $API_URL"
        echo "========================================"
        echo
        
        # Run all diagnostic functions
        show_system_info
        show_network_info
        show_docker_info
        show_database_info
        show_api_info
        show_filesystem_info
        show_performance_info
        
    } > "$report_file"
    
    log_success "Diagnostic report saved to: $report_file"
    echo
}

# Quick fixes
apply_quick_fixes() {
    log_section "Applying Quick Fixes"
    
    cd "$PROJECT_ROOT" 2>/dev/null || return 1
    
    echo "1. Converting .env line endings (if needed):"
    if [ -f "apps/api/.env" ] && file "apps/api/.env" 2>/dev/null | grep -q "CRLF"; then
        if command -v dos2unix >/dev/null 2>&1; then
            dos2unix "apps/api/.env"
            log_success "Converted .env to Unix line endings"
        else
            log_warning "dos2unix not available - line endings not converted"
        fi
    else
        echo "  No conversion needed"
    fi
    
    echo
    echo "2. Setting correct permissions:"
    chmod +x scripts/*.sh 2>/dev/null && echo "  Script permissions updated" || echo "  No script permission changes needed"
    
    echo
    echo "3. Docker context reset:"
    if docker context use default >/dev/null 2>&1; then
        log_success "Docker context set to default"
    else
        log_warning "Could not set Docker context"
    fi
    
    echo
}

# Main menu
show_menu() {
    echo "======================================================="
    echo "     WSL/Docker Troubleshooting Tool"
    echo "======================================================="
    echo
    echo "Select an option:"
    echo "1. Full system diagnostics"
    echo "2. Docker diagnostics only"
    echo "3. Database diagnostics only"
    echo "4. API server diagnostics only"
    echo "5. Apply quick fixes"
    echo "6. Generate comprehensive report"
    echo "7. Show all information"
    echo "8. Exit"
    echo
    read -p "Enter your choice (1-8): " choice
    
    case $choice in
        1) show_system_info; show_network_info ;;
        2) show_docker_info ;;
        3) show_database_info ;;
        4) show_api_info ;;
        5) apply_quick_fixes ;;
        6) generate_report ;;
        7) show_all_info ;;
        8) exit 0 ;;
        *) log_error "Invalid choice. Please select 1-8." ;;
    esac
}

# Show all information
show_all_info() {
    show_system_info
    show_network_info
    show_docker_info
    show_database_info
    show_api_info
    show_filesystem_info
    show_performance_info
}

# Main function
main() {
    if [ $# -eq 0 ]; then
        # Interactive mode
        while true; do
            show_menu
            echo
            read -p "Press Enter to continue or Ctrl+C to exit..."
            clear
        done
    else
        # Command line mode
        case "$1" in
            --system) show_system_info ;;
            --network) show_network_info ;;
            --docker) show_docker_info ;;
            --database) show_database_info ;;
            --api) show_api_info ;;
            --filesystem) show_filesystem_info ;;
            --performance) show_performance_info ;;
            --report) generate_report ;;
            --fix) apply_quick_fixes ;;
            --all) show_all_info ;;
            --help)
                echo "Usage: $0 [option]"
                echo "Options:"
                echo "  --system       System information"
                echo "  --network      Network diagnostics"
                echo "  --docker       Docker diagnostics"
                echo "  --database     Database diagnostics"
                echo "  --api          API server diagnostics"
                echo "  --filesystem   File system diagnostics"
                echo "  --performance  Performance diagnostics"
                echo "  --report       Generate comprehensive report"
                echo "  --fix          Apply quick fixes"
                echo "  --all          Show all information"
                echo "  --help         Show this help"
                echo
                echo "Run without arguments for interactive mode"
                ;;
            *)
                log_error "Unknown option: $1"
                echo "Use --help for available options"
                exit 1
                ;;
        esac
    fi
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi