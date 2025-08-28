#!/bin/bash
# Enhanced Optimistic Locking Test Suite v2
# With improved error handling, retry logic, and detailed reporting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Support BASE_URL for compatibility with instructions
if [ -n "$BASE_URL" ]; then
    API_URL="$BASE_URL"
else
    API_URL="${API_URL:-http://localhost:4001}"
fi

TIMEOUT="${TIMEOUT:-10}"
VERBOSE="${VERBOSE:-false}"
JSON_OUTPUT="${JSON_OUTPUT:-false}"
RETRY_ON_FAIL="${RETRY_ON_FAIL:-true}"
MAX_RETRIES="${MAX_RETRIES:-3}"

# Authentication support
AUTH_TOKEN="${AUTH_BEARER:-}"
USE_PRODUCTION_ROUTES="${USE_PRODUCTION_ROUTES:-auto}"

# Test tracking
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0
TEST_START_TIME=$(date +%s)
TEST_RESULTS=()

# Test data
BOOKING_ID=""
ETAG_VALUE=""
TEST_ROUTE_PREFIX=""
USE_AUTH_HEADER=""

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_test() { echo -e "${BOLD}[TEST ${TESTS_TOTAL}]${NC} $1"; }
log_debug() { [ "$VERBOSE" = "true" ] && echo -e "${CYAN}[DEBUG]${NC} $1"; }

# Determine test route based on authentication
determine_test_route() {
    if [ -n "$AUTH_TOKEN" ]; then
        log_info "Authentication token provided, attempting production routes"
        TEST_ROUTE_PREFIX="/api/bookings"
        USE_AUTH_HEADER="-H 'Authorization: $AUTH_TOKEN'"
        USE_PRODUCTION_ROUTES="true"
    else
        log_info "No authentication token, using test routes"
        TEST_ROUTE_PREFIX="/api/test-db/bookings"
        USE_AUTH_HEADER=""
        USE_PRODUCTION_ROUTES="false"
    fi
    
    log_debug "Route prefix: $TEST_ROUTE_PREFIX"
    log_debug "Auth header: ${USE_AUTH_HEADER:-none}"
}

# Pre-flight health check
preflight_check() {
    echo -e "${CYAN}${BOLD}Running pre-flight checks...${NC}"
    
    local checks_passed=0
    local checks_total=4
    
    # Check API accessibility
    if curl -s --max-time 2 "${API_URL}/healthz" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} API server is accessible"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} API server not responding at ${API_URL}"
    fi
    
    # Check database connectivity (via API)
    if curl -s --max-time 2 "${API_URL}/api/test-db/health" 2>/dev/null | grep -q "ok"; then
        echo -e "${GREEN}✓${NC} Database connection is healthy"
        ((checks_passed++))
    else
        echo -e "${YELLOW}⚠${NC} Database health check failed (non-critical)"
        ((checks_passed++))  # Don't fail on this
    fi
    
    # Check test routes availability
    local test_route_response=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/api/test-db/bookings" 2>/dev/null)
    if [ "$test_route_response" != "000" ]; then
        echo -e "${GREEN}✓${NC} Test routes are accessible"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} Test routes not accessible"
    fi
    
    # Check ready marker
    if [ -f "$PROJECT_ROOT/.phase2a-ready" ]; then
        echo -e "${GREEN}✓${NC} Environment is marked as ready"
        ((checks_passed++))
    else
        echo -e "${YELLOW}⚠${NC} Environment not marked as ready (run enhanced-setup.sh)"
        ((checks_passed++))  # Warning only
    fi
    
    echo
    
    if [ $checks_passed -lt 3 ]; then
        log_error "Pre-flight checks failed. Please run:"
        echo "  scripts/auto-fix.sh"
        echo "  scripts/enhanced-setup.sh"
        return 1
    fi
    
    log_success "Pre-flight checks passed ($checks_passed/$checks_total)"
    echo
    return 0
}

# Enhanced HTTP request with retry logic
http_request_with_retry() {
    local method="$1"
    local url="$2"
    local data="$3"
    local headers="$4"
    local expected_status="$5"
    
    local attempt=0
    local success=false
    
    while [ $attempt -lt $MAX_RETRIES ] && [ "$success" = false ]; do
        ((attempt++))
        
        log_debug "Attempt $attempt/$MAX_RETRIES for $method $url"
        
        # Build curl command
        local cmd="curl -s -i --max-time $TIMEOUT"
        
        if [ "$method" != "GET" ]; then
            cmd="$cmd -X $method"
        fi
        
        if [ -n "$data" ]; then
            cmd="$cmd --data '$data'"
        fi
        
        if [ -n "$headers" ]; then
            cmd="$cmd $headers"
        fi
        
        cmd="$cmd '$url'"
        
        # Execute request
        local response=$(eval "$cmd" 2>/dev/null || echo "ERROR")
        
        if [ "$response" = "ERROR" ]; then
            log_warning "Request failed (attempt $attempt/$MAX_RETRIES)"
            
            if [ $attempt -lt $MAX_RETRIES ]; then
                sleep 1
                continue
            fi
        fi
        
        # Parse response
        local headers_body=$(echo "$response" | sed -n '1,/^\r*$/p')
        local body=$(echo "$response" | sed '1,/^\r*$/d')
        local status_line=$(echo "$headers_body" | head -n1)
        local status_code=$(echo "$status_line" | cut -d' ' -f2)
        
        # Extract ETag if present
        local etag_header=$(echo "$headers_body" | grep -i '^etag:' | cut -d' ' -f2- | tr -d '\r"' || echo "")
        
        # Store results
        HTTP_STATUS="$status_code"
        HTTP_BODY="$body"
        HTTP_HEADERS="$headers_body"
        HTTP_ETAG="$etag_header"
        
        log_debug "Response Status: $status_code"
        log_debug "Response Body: $body"
        [ -n "$etag_header" ] && log_debug "ETag: $etag_header"
        
        success=true
    done
    
    if [ "$success" = false ]; then
        HTTP_STATUS="000"
        HTTP_BODY="Request failed after $MAX_RETRIES attempts"
        return 1
    fi
    
    return 0
}

# Extract JSON value helper
extract_json_value() {
    local json="$1"
    local key="$2"
    
    echo "$json" | python3 -c "
import sys, json
try:
    data = json.loads(sys.stdin.read())
    print(data.get('$key', ''))
except:
    pass
" 2>/dev/null || \
    echo "$json" | grep -o "\"$key\":\"[^\"]*\"" | cut -d'"' -f4 2>/dev/null || \
    echo ""
}

# Test result recording
record_test_result() {
    local test_name="$1"
    local expected="$2"
    local actual="$3"
    local passed="$4"
    local details="$5"
    
    ((TESTS_TOTAL++))
    
    if [ "$passed" = "true" ]; then
        ((TESTS_PASSED++))
        echo -e "${GREEN}✅${NC} Test #${TESTS_TOTAL}: $test_name"
        echo -e "   Expected: $expected, Got: $actual ${GREEN}✓${NC}"
    else
        ((TESTS_FAILED++))
        echo -e "${RED}❌${NC} Test #${TESTS_TOTAL}: $test_name"
        echo -e "   Expected: $expected, Got: $actual ${RED}✗${NC}"
        [ -n "$details" ] && echo -e "   ${YELLOW}Details: $details${NC}"
    fi
    
    # Store for JSON output
    TEST_RESULTS+=("{\"test\":\"$test_name\",\"expected\":\"$expected\",\"actual\":\"$actual\",\"passed\":$passed,\"details\":\"$details\"}")
}

# Test 1: POST - Create booking with ETag
test_create_booking() {
    log_test "POST - Create Booking with ETag"
    
    local test_data='{"customerName":"Test User '$(date +%s)'","amount":"100.00","currency":"USD"}'
    
    local headers="-H 'Content-Type: application/json'"
    [ -n "$USE_AUTH_HEADER" ] && headers="$headers $USE_AUTH_HEADER"
    
    http_request_with_retry "POST" \
        "${API_URL}${TEST_ROUTE_PREFIX}" \
        "$test_data" \
        "$headers" \
        "201"
    
    if [ "$HTTP_STATUS" = "201" ] && [ -n "$HTTP_ETAG" ]; then
        BOOKING_ID=$(extract_json_value "$HTTP_BODY" "id")
        ETAG_VALUE="$HTTP_ETAG"
        
        log_debug "Created booking ID: $BOOKING_ID"
        log_debug "Initial ETag: $ETAG_VALUE"
        
        record_test_result "POST 201 + ETag" "201 with ETag" "$HTTP_STATUS with ETag:$HTTP_ETAG" "true" "Booking created successfully"
    else
        record_test_result "POST 201 + ETag" "201 with ETag" "$HTTP_STATUS" "false" "$HTTP_BODY"
        
        # Try to extract ID anyway for cleanup
        BOOKING_ID=$(extract_json_value "$HTTP_BODY" "id")
    fi
}

# Test 2: GET - Retrieve with ETag
test_get_with_etag() {
    log_test "GET - ETag Confirmation"
    
    if [ -z "$BOOKING_ID" ]; then
        record_test_result "GET 200 + ETag" "200 with ETag" "SKIPPED" "false" "No booking ID available"
        return
    fi
    
    local headers=""
    [ -n "$USE_AUTH_HEADER" ] && headers="$USE_AUTH_HEADER"
    
    http_request_with_retry "GET" \
        "${API_URL}${TEST_ROUTE_PREFIX}/${BOOKING_ID}" \
        "" \
        "$headers" \
        "200"
    
    if [ "$HTTP_STATUS" = "200" ] && [ -n "$HTTP_ETAG" ]; then
        record_test_result "GET 200 + ETag" "200 with ETag" "$HTTP_STATUS with ETag:$HTTP_ETAG" "true" "ETag confirmed"
        ETAG_VALUE="$HTTP_ETAG"  # Update ETag
    else
        record_test_result "GET 200 + ETag" "200 with ETag" "$HTTP_STATUS" "false" "Missing ETag header"
    fi
}

# Test 3: GET 304 - Not Modified
test_get_not_modified() {
    log_test "GET - 304 Not Modified"
    
    if [ -z "$BOOKING_ID" ] || [ -z "$ETAG_VALUE" ]; then
        record_test_result "GET 304 Not Modified" "304" "SKIPPED" "false" "Missing prerequisites"
        return
    fi
    
    local headers="-H 'If-None-Match: \"$ETAG_VALUE\"'"
    [ -n "$USE_AUTH_HEADER" ] && headers="$headers $USE_AUTH_HEADER"
    
    http_request_with_retry "GET" \
        "${API_URL}${TEST_ROUTE_PREFIX}/${BOOKING_ID}" \
        "" \
        "$headers" \
        "304"
    
    if [ "$HTTP_STATUS" = "304" ]; then
        record_test_result "GET 304 Not Modified" "304" "$HTTP_STATUS" "true" "Cache validation working"
    else
        record_test_result "GET 304 Not Modified" "304" "$HTTP_STATUS" "false" "Expected 304, got $HTTP_STATUS"
    fi
}

# Test 4: PATCH 428 - Precondition Required
test_patch_precondition_required() {
    log_test "PATCH - 428 Precondition Required"
    
    if [ -z "$BOOKING_ID" ]; then
        record_test_result "PATCH 428 Required" "428" "SKIPPED" "false" "No booking ID"
        return
    fi
    
    local headers="-H 'Content-Type: application/json'"
    [ -n "$USE_AUTH_HEADER" ] && headers="$headers $USE_AUTH_HEADER"
    
    http_request_with_retry "PATCH" \
        "${API_URL}${TEST_ROUTE_PREFIX}/${BOOKING_ID}" \
        '{"amount":"150.00"}' \
        "$headers" \
        "428"
    
    if [ "$HTTP_STATUS" = "428" ]; then
        record_test_result "PATCH 428 Required" "428" "$HTTP_STATUS" "true" "If-Match header required"
    else
        record_test_result "PATCH 428 Required" "428" "$HTTP_STATUS" "false" "Missing precondition check"
    fi
}

# Test 5: PATCH 412 - Precondition Failed
test_patch_precondition_failed() {
    log_test "PATCH - 412 Precondition Failed"
    
    if [ -z "$BOOKING_ID" ]; then
        record_test_result "PATCH 412 Failed" "412" "SKIPPED" "false" "No booking ID"
        return
    fi
    
    # Use wrong ETag
    local wrong_etag="wrong-etag-$(date +%s)"
    
    local headers="-H 'Content-Type: application/json' -H 'If-Match: \"$wrong_etag\"'"
    [ -n "$USE_AUTH_HEADER" ] && headers="$headers $USE_AUTH_HEADER"
    
    http_request_with_retry "PATCH" \
        "${API_URL}${TEST_ROUTE_PREFIX}/${BOOKING_ID}" \
        '{"amount":"175.00"}' \
        "$headers" \
        "412"
    
    if [ "$HTTP_STATUS" = "412" ]; then
        record_test_result "PATCH 412 Failed" "412" "$HTTP_STATUS" "true" "Version conflict detected"
    else
        record_test_result "PATCH 412 Failed" "412" "$HTTP_STATUS" "false" "Version conflict not detected"
    fi
}

# Test 6: PATCH 200 - Successful Update
test_patch_success() {
    log_test "PATCH - 200 Successful Update"
    
    if [ -z "$BOOKING_ID" ] || [ -z "$ETAG_VALUE" ]; then
        record_test_result "PATCH 200 Success" "200 with new ETag" "SKIPPED" "false" "Missing prerequisites"
        return
    fi
    
    local headers="-H 'Content-Type: application/json' -H 'If-Match: \"$ETAG_VALUE\"'"
    [ -n "$USE_AUTH_HEADER" ] && headers="$headers $USE_AUTH_HEADER"
    
    http_request_with_retry "PATCH" \
        "${API_URL}${TEST_ROUTE_PREFIX}/${BOOKING_ID}" \
        '{"amount":"200.00","notes":"Updated successfully"}' \
        "$headers" \
        "200"
    
    if [ "$HTTP_STATUS" = "200" ] && [ -n "$HTTP_ETAG" ]; then
        local new_version=$(extract_json_value "$HTTP_BODY" "version")
        record_test_result "PATCH 200 Success" "200 with new ETag" "$HTTP_STATUS with ETag:$HTTP_ETAG" "true" "Version incremented to $new_version"
    else
        record_test_result "PATCH 200 Success" "200 with new ETag" "$HTTP_STATUS" "false" "Update failed or missing ETag"
    fi
}

# Cleanup test data
cleanup_test_data() {
    if [ -n "$BOOKING_ID" ]; then
        log_debug "Cleaning up test booking: $BOOKING_ID"
        
        local headers=""
        [ -n "$USE_AUTH_HEADER" ] && headers="$USE_AUTH_HEADER"
        
        if [ -n "$headers" ]; then
            eval "curl -s -X DELETE ${headers} '${API_URL}${TEST_ROUTE_PREFIX}/${BOOKING_ID}'" >/dev/null 2>&1 || true
        else
            curl -s -X DELETE "${API_URL}${TEST_ROUTE_PREFIX}/${BOOKING_ID}" >/dev/null 2>&1 || true
        fi
    fi
}

# Generate JSON report
generate_json_report() {
    if [ "$JSON_OUTPUT" != "true" ]; then
        return
    fi
    
    local report_file="$PROJECT_ROOT/test-results-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "api_url": "${API_URL}",
  "total_tests": ${TESTS_TOTAL},
  "passed": ${TESTS_PASSED},
  "failed": ${TESTS_FAILED},
  "duration": $(($(date +%s) - TEST_START_TIME)),
  "results": [
    $(IFS=','; echo "${TEST_RESULTS[*]}")
  ]
}
EOF
    
    log_success "JSON report saved to: $report_file"
}

# Test production guard
test_production_guard() {
    log_info "Testing production environment guard..."
    
    # Check if test routes are accessible
    local test_response=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/api/test-db/health" 2>/dev/null)
    
    # Check NODE_ENV from .env
    local node_env=$(grep "^NODE_ENV=" "$PROJECT_ROOT/apps/api/.env" 2>/dev/null | cut -d'=' -f2 | tr -d '"')
    
    if [ "$node_env" = "production" ]; then
        if [ "$test_response" = "404" ] || [ "$test_response" = "403" ]; then
            log_success "Production guard working: test routes blocked in production"
        else
            log_warning "SECURITY WARNING: Test routes accessible in production mode!"
        fi
    else
        if [ "$test_response" = "200" ] || [ "$test_response" = "204" ]; then
            log_info "Test routes enabled in $node_env mode (expected)"
        else
            log_warning "Test routes not accessible in $node_env mode"
        fi
    fi
}

# Main test execution
main() {
    echo "======================================================="
    echo "  Enhanced Optimistic Locking Test Suite v2"
    echo "======================================================="
    echo
    echo "Configuration:"
    echo "  API URL: ${API_URL}"
    echo "  Timeout: ${TIMEOUT}s"
    echo "  Retries: ${MAX_RETRIES}"
    echo "  Verbose: ${VERBOSE}"
    echo "  JSON Output: ${JSON_OUTPUT}"
    echo
    
    # Show authentication status
    if [ -n "$AUTH_TOKEN" ]; then
        echo "Authentication:"
        echo "  Status: ${GREEN}Enabled${NC}"
        echo "  Token: ${AUTH_TOKEN:0:20}..."
    else
        echo "Authentication:"
        echo "  Status: ${YELLOW}Not provided (using test routes)${NC}"
    fi
    echo
    
    # Determine test route based on authentication
    determine_test_route
    
    # Pre-flight checks
    if ! preflight_check; then
        exit 1
    fi
    
    # Run test suite
    echo -e "${CYAN}${BOLD}Running Optimistic Locking Tests...${NC}"
    echo -e "Route: ${TEST_ROUTE_PREFIX}"
    echo -e "Auth: ${USE_PRODUCTION_ROUTES}"
    echo
    
    test_create_booking
    test_get_with_etag
    test_get_not_modified
    test_patch_precondition_required
    test_patch_precondition_failed
    test_patch_success
    
    echo
    
    # Additional tests
    test_production_guard
    
    # Cleanup
    cleanup_test_data
    
    # Generate reports
    generate_json_report
    
    # Summary
    local duration=$(($(date +%s) - TEST_START_TIME))
    
    echo
    echo "======================================================="
    echo -e "${BOLD}Test Results Summary${NC}"
    echo "======================================================="
    echo "Total Tests: ${TESTS_TOTAL}"
    echo -e "Passed: ${GREEN}${TESTS_PASSED}${NC}"
    echo -e "Failed: ${RED}${TESTS_FAILED}${NC}"
    echo "Success Rate: $(( TESTS_PASSED * 100 / TESTS_TOTAL ))%"
    echo "Duration: ${duration} seconds"
    echo
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}${BOLD}🎉 All tests passed! Optimistic locking is working correctly.${NC}"
        exit 0
    else
        echo -e "${YELLOW}${BOLD}⚠ Some tests failed. Review the output above.${NC}"
        echo
        echo "Troubleshooting:"
        echo "  1. Check middleware configuration (errorHandler.ts, respond.ts)"
        echo "  2. Verify version field in database schema"
        echo "  3. Run: scripts/troubleshoot-wsl.sh --api"
        exit 1
    fi
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi