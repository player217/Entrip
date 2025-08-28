#!/bin/bash
# Master Orchestration Script for Phase 2A Testing
# Executes complete testing workflow with intelligent coordination

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
UNDERLINE='\033[4m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs"
LOG_FILE="$LOG_DIR/phase2a-$(date +%Y%m%d-%H%M%S).log"
TOTAL_STEPS=5
CURRENT_STEP=0
START_TIME=$(date +%s)

# Command line options
SKIP_VALIDATION=false
SKIP_FIX=false
SKIP_SETUP=false
AUTO_FIX=false
VERBOSE=false
JSON_OUTPUT=false
RESET_CONTAINERS=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-validation)
            SKIP_VALIDATION=true
            shift
            ;;
        --skip-fix)
            SKIP_FIX=true
            shift
            ;;
        --skip-setup)
            SKIP_SETUP=true
            shift
            ;;
        --auto)
            AUTO_FIX=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            export VERBOSE=true
            shift
            ;;
        --json)
            JSON_OUTPUT=true
            export JSON_OUTPUT=true
            shift
            ;;
        --reset)
            RESET_CONTAINERS=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Create log directory
mkdir -p "$LOG_DIR"

# Logging functions
log_to_file() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log_info() { 
    echo -e "${BLUE}[INFO]${NC} $1"
    log_to_file "INFO: $1"
}

log_success() { 
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    log_to_file "SUCCESS: $1"
}

log_warning() { 
    echo -e "${YELLOW}[WARNING]${NC} $1"
    log_to_file "WARNING: $1"
}

log_error() { 
    echo -e "${RED}[ERROR]${NC} $1"
    log_to_file "ERROR: $1"
}

log_step() {
    ((CURRENT_STEP++))
    echo
    echo -e "${CYAN}${BOLD}[STEP ${CURRENT_STEP}/${TOTAL_STEPS}] $1${NC}"
    echo "=========================================="
    log_to_file "STEP ${CURRENT_STEP}/${TOTAL_STEPS}: $1"
}

# Show help
show_help() {
    cat <<EOF
${BOLD}Master Orchestration Script for Phase 2A Testing${NC}

${UNDERLINE}Usage:${NC}
  $0 [OPTIONS]

${UNDERLINE}Options:${NC}
  --skip-validation    Skip environment validation step
  --skip-fix          Skip auto-fix step
  --skip-setup        Skip database setup step
  --auto              Enable automatic fixes without prompting
  --verbose           Enable verbose output
  --json              Output test results in JSON format
  --reset             Reset Docker containers before starting
  --help              Show this help message

${UNDERLINE}Examples:${NC}
  # Run complete workflow
  $0

  # Run with automatic fixes and verbose output
  $0 --auto --verbose

  # Skip validation and fixes, go straight to testing
  $0 --skip-validation --skip-fix

  # Reset everything and start fresh
  $0 --reset --auto

${UNDERLINE}Steps Executed:${NC}
  1. Environment Validation
  2. Automatic Problem Resolution
  3. Database Setup
  4. Optimistic Locking Tests
  5. Results Summary

EOF
}

# Show banner
show_banner() {
    echo
    echo "======================================================="
    echo -e "${CYAN}${BOLD}   Phase 2A Optimistic Locking Test Suite${NC}"
    echo -e "${CYAN}${BOLD}        Master Orchestration Script${NC}"
    echo "======================================================="
    echo
    echo "Configuration:"
    echo "  Skip Validation: ${SKIP_VALIDATION}"
    echo "  Skip Fix: ${SKIP_FIX}"
    echo "  Skip Setup: ${SKIP_SETUP}"
    echo "  Auto Fix: ${AUTO_FIX}"
    echo "  Verbose: ${VERBOSE}"
    echo "  JSON Output: ${JSON_OUTPUT}"
    echo "  Reset Containers: ${RESET_CONTAINERS}"
    echo
    echo "Log file: ${LOG_FILE}"
    echo
}

# Check script existence
check_script() {
    local script="$1"
    if [ ! -f "$SCRIPT_DIR/$script" ]; then
        log_error "Required script not found: $script"
        log_info "Please ensure all scripts are present in: $SCRIPT_DIR"
        exit 1
    fi
    
    # Make executable
    chmod +x "$SCRIPT_DIR/$script" 2>/dev/null || true
}

# Pre-flight checks
preflight_checks() {
    log_info "Performing pre-flight checks..."
    
    # Check required scripts
    local required_scripts=(
        "validate-wsl-environment.sh"
        "auto-fix.sh"
        "enhanced-setup.sh"
        "test-optimistic-locking-v2.sh"
    )
    
    for script in "${required_scripts[@]}"; do
        check_script "$script"
    done
    
    log_success "All required scripts found"
    
    # Check Docker
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi
    
    log_success "Docker is running"
    
    # Check Node.js/npm/pnpm
    if ! command -v pnpm >/dev/null 2>&1; then
        log_warning "pnpm not found. Installing..."
        npm install -g pnpm
    fi
    
    log_success "Pre-flight checks completed"
}

# Step 1: Environment Validation
run_validation() {
    if [ "$SKIP_VALIDATION" = true ]; then
        log_info "Skipping validation (--skip-validation flag)"
        return 0
    fi
    
    log_step "Environment Validation"
    
    if "$SCRIPT_DIR/validate-wsl-environment.sh" 2>&1 | tee -a "$LOG_FILE"; then
        log_success "Environment validation completed successfully"
        return 0
    else
        log_warning "Environment validation found issues"
        return 1
    fi
}

# Step 2: Auto-fix
run_autofix() {
    if [ "$SKIP_FIX" = true ]; then
        log_info "Skipping auto-fix (--skip-fix flag)"
        return 0
    fi
    
    log_step "Automatic Problem Resolution"
    
    local fix_args=""
    [ "$AUTO_FIX" = true ] && fix_args="--auto"
    [ "$RESET_CONTAINERS" = true ] && fix_args="$fix_args --reset"
    
    if "$SCRIPT_DIR/auto-fix.sh" $fix_args 2>&1 | tee -a "$LOG_FILE"; then
        log_success "Auto-fix completed successfully"
        return 0
    else
        log_warning "Auto-fix encountered issues"
        return 1
    fi
}

# Step 3: Database Setup
run_setup() {
    if [ "$SKIP_SETUP" = true ]; then
        log_info "Skipping setup (--skip-setup flag)"
        return 0
    fi
    
    log_step "Database Setup and Configuration"
    
    if "$SCRIPT_DIR/enhanced-setup.sh" 2>&1 | tee -a "$LOG_FILE"; then
        log_success "Database setup completed successfully"
        return 0
    else
        log_error "Database setup failed"
        return 1
    fi
}

# Step 4: Run Tests
run_tests() {
    log_step "Optimistic Locking Tests"
    
    local test_args=""
    [ "$VERBOSE" = true ] && test_args="$test_args --verbose"
    [ "$JSON_OUTPUT" = true ] && test_args="$test_args --json"
    
    # Export for test script
    export VERBOSE
    export JSON_OUTPUT
    
    if "$SCRIPT_DIR/test-optimistic-locking-v2.sh" $test_args 2>&1 | tee -a "$LOG_FILE"; then
        log_success "All tests passed!"
        return 0
    else
        log_error "Some tests failed"
        return 1
    fi
}

# Step 5: Summary
show_summary() {
    log_step "Execution Summary"
    
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))
    
    echo -e "${BOLD}Execution Results:${NC}"
    echo "================================"
    
    # Parse test results from log
    local tests_passed=$(grep -c "✅" "$LOG_FILE" 2>/dev/null || echo "0")
    local tests_failed=$(grep -c "❌" "$LOG_FILE" 2>/dev/null || echo "0")
    local warnings=$(grep -c "WARNING" "$LOG_FILE" 2>/dev/null || echo "0")
    
    echo "Tests Passed: ${GREEN}${tests_passed}${NC}"
    echo "Tests Failed: ${RED}${tests_failed}${NC}"
    echo "Warnings: ${YELLOW}${warnings}${NC}"
    echo "Duration: ${duration} seconds"
    echo
    
    # Check for JSON report
    local json_report=$(ls -t "$PROJECT_ROOT"/test-results-*.json 2>/dev/null | head -n1)
    if [ -n "$json_report" ]; then
        echo "JSON Report: ${json_report}"
    fi
    
    echo "Full Log: ${LOG_FILE}"
    echo
    
    if [ $tests_failed -eq 0 ] && [ $tests_passed -gt 0 ]; then
        echo -e "${GREEN}${BOLD}✨ SUCCESS! All tests passed. Optimistic locking is working correctly!${NC}"
        return 0
    elif [ $tests_passed -gt 0 ]; then
        echo -e "${YELLOW}${BOLD}⚠ PARTIAL SUCCESS: Some tests passed, but issues remain.${NC}"
        return 1
    else
        echo -e "${RED}${BOLD}✗ FAILURE: Tests did not pass. Please review the log.${NC}"
        return 1
    fi
}

# Error handler
handle_error() {
    local step="$1"
    log_error "Failed at step: $step"
    echo
    echo -e "${RED}${BOLD}Execution failed at: $step${NC}"
    echo
    echo "Troubleshooting suggestions:"
    echo "  1. Review the log file: ${LOG_FILE}"
    echo "  2. Run diagnostics: scripts/troubleshoot-wsl.sh"
    echo "  3. Try manual fix: scripts/auto-fix.sh --reset"
    echo "  4. Check Docker: docker compose -f docker-compose.local.yml ps"
    echo
    exit 1
}

# Main execution
main() {
    show_banner
    
    # Create marker for start
    echo "RUN_ALL_START: $(date)" > "$PROJECT_ROOT/.run-all-marker"
    
    # Pre-flight checks
    preflight_checks || handle_error "Pre-flight checks"
    
    # Execute workflow
    run_validation || log_warning "Validation had issues, continuing..."
    run_autofix || log_warning "Auto-fix had issues, continuing..."
    run_setup || handle_error "Database setup"
    run_tests || log_warning "Some tests failed"
    
    # Show summary
    show_summary
    
    # Clean marker
    rm -f "$PROJECT_ROOT/.run-all-marker"
    
    echo
    echo "======================================================="
    echo -e "${CYAN}${BOLD}Execution Complete${NC}"
    echo "======================================================="
    
    # Exit with appropriate code
    if [ $tests_failed -eq 0 ] 2>/dev/null; then
        exit 0
    else
        exit 1
    fi
}

# Trap errors
trap 'handle_error "Unexpected error"' ERR

# Run main function
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main
fi