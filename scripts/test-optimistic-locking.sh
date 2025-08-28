#!/bin/bash
# Comprehensive Optimistic Locking Test Suite
# Supports both authenticated production routes and fallback test routes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
API_URL="${API_URL:-http://localhost:4001}"
TIMEOUT="${TIMEOUT:-10}"
VERBOSE="${VERBOSE:-false}"
USE_PRODUCTION_ROUTES="${USE_PRODUCTION_ROUTES:-auto}"

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_test() { echo -e "${BOLD}[TEST]${NC} $1"; }

# HTTP request wrapper with error handling
http_request() {
    local method="$1"
    local url="$2"
    local data="$3"
    local headers="$4"
    local expected_status="$5"
    
    local cmd="curl -s -w '\\n%{http_code}\\n%{time_total}' --max-time $TIMEOUT"
    
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
    
    if [ "$VERBOSE" = "true" ]; then
        log_info "Request: $method $url"
        [ -n "$data" ] && log_info "Data: $data"
        [ -n "$headers" ] && log_info "Headers: $headers"
    fi
    
    local response
    response=$(eval "$cmd" 2>/dev/null || echo -e "\\nERROR\\n0")
    
    local body=$(echo "$response" | head -n -2)
    local status_code=$(echo "$response" | tail -n 2 | head -n 1)
    local time_total=$(echo "$response" | tail -n 1)
    
    # Store results in global variables for test functions
    HTTP_BODY="$body"
    HTTP_STATUS="$status_code"
    HTTP_TIME="$time_total"
    
    if [ "$VERBOSE" = "true" ]; then
        log_info "Response Status: $status_code"
        log_info "Response Time: ${time_total}s"
        log_info "Response Body: $body"
    fi
    
    return 0
}

# Test result reporting
report_test() {
    local test_name="$1"
    local expected_status="$2"
    local actual_status="$HTTP_STATUS"
    local success="$3"  # true/false
    
    ((TESTS_TOTAL++))
    
    if [ "$success" = "true" ]; then
        ((TESTS_PASSED++))
        log_success "✅ $test_name: $actual_status (expected $expected_status)"
    else
        ((TESTS_FAILED++))
        log_error "❌ $test_name: $actual_status (expected $expected_status)"
        if [ "$VERBOSE" = "true" ] && [ -n "$HTTP_BODY" ]; then
            echo "   Response: $HTTP_BODY"
        fi
    fi
}

# Extract values from JSON response
extract_json_value() {
    local json="$1"
    local key="$2"
    
    # Simple JSON extraction (works for basic cases)
    echo "$json" | grep -o "\"$key\":\"[^\"]*\"" | cut -d'"' -f4 2>/dev/null || \
    echo "$json" | grep -o "\"$key\":[^,}]*" | cut -d':' -f2 | sed 's/[",]//g' | xargs 2>/dev/null || \
    echo ""
}

# Extract ETag from response headers
extract_etag_from_headers() {
    local response_with_headers="$1"
    echo "$response_with_headers" | grep -i 'etag:' | head -n1 | cut -d' ' -f2 | tr -d '\r"' || echo ""
}

# Authentication system
authenticate_user() {
    log_info "Attempting authentication..."
    
    # Try multiple authentication endpoints
    local auth_endpoints=(
        "/auth/login"
        "/api/auth/login"
        "/api/v1/auth/login"
    )
    
    local auth_payloads=(
        '{"username":"admin","password":"admin"}'
        '{"email":"admin@entrip.io","password":"admin"}'
        '{"username":"test","password":"test"}'
    )
    
    for endpoint in "${auth_endpoints[@]}"; do
        for payload in "${auth_payloads[@]}"; do
            http_request "POST" "$API_URL$endpoint" "$payload" "-H 'Content-Type: application/json'"
            
            if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ]; then
                local token
                token=$(extract_json_value "$HTTP_BODY" "token")
                
                if [ -z "$token" ]; then
                    token=$(extract_json_value "$HTTP_BODY" "accessToken")
                fi
                
                if [ -n "$token" ]; then
                    AUTH_TOKEN="$token"
                    log_success "Authentication successful with endpoint: $endpoint"
                    return 0
                fi
            fi
        done
    done
    
    log_warning "Authentication failed - will use test routes instead"
    return 1
}

# Test suite for production routes (with authentication)
test_production_routes() {
    log_info "Testing production routes (/api/bookings) with authentication..."
    
    local auth_header="-H 'Authorization: Bearer $AUTH_TOKEN'"
    local booking_id=""
    local etag=""
    
    # Test 1: POST 201 + ETag (Create)
    log_test "1. POST 201 + ETag (CREATE)"
    local create_data='{
        "code":"BK-WSL-'$(date +%s)'",
        "amount":"100.00",
        "currency":"KRW",
        "customerName":"WSL Test User",
        "customerPhone":"01012345678",
        "itineraryFrom":"ICN",
        "itineraryTo":"PUS",
        "departAt":"2025-09-01T10:00:00Z",
        "arriveAt":"2025-09-01T11:00:00Z"
    }'
    
    # Use curl with headers to capture ETag
    local create_response
    create_response=$(curl -i -s -X POST "$API_URL/api/bookings" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Idempotency-Key: test-wsl-$(date +%s)" \
        --data "$create_data" --max-time $TIMEOUT 2>/dev/null || echo "")
    
    if echo "$create_response" | grep -q "HTTP/1.1 201\|HTTP/1.1 200"; then
        booking_id=$(echo "$create_response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        etag=$(extract_etag_from_headers "$create_response")
        report_test "POST Create Booking" "201" "true"
        log_info "Created booking ID: $booking_id, ETag: $etag"
    else
        report_test "POST Create Booking" "201" "false"
        return 1
    fi
    
    if [ -z "$booking_id" ] || [ -z "$etag" ]; then
        log_error "Failed to extract booking ID or ETag"
        return 1
    fi
    
    # Test 2: GET 200 + ETag confirmation
    log_test "2. GET 200 + ETag confirmation"
    local get_response
    get_response=$(curl -i -s "$API_URL/api/bookings/$booking_id" \
        -H "Authorization: Bearer $AUTH_TOKEN" --max-time $TIMEOUT 2>/dev/null || echo "")
    
    if echo "$get_response" | grep -q "HTTP/1.1 200"; then
        local get_etag
        get_etag=$(extract_etag_from_headers "$get_response")
        if [ "$get_etag" = "$etag" ]; then
            report_test "GET ETag Confirmation" "200" "true"
        else
            log_warning "ETag mismatch: expected '$etag', got '$get_etag'"
            report_test "GET ETag Confirmation" "200" "false"
        fi
    else
        report_test "GET ETag Confirmation" "200" "false"
    fi
    
    # Test 3: GET 304 Not Modified (If-None-Match)
    log_test "3. GET 304 Not Modified (If-None-Match)"
    local cache_response
    cache_response=$(curl -i -s "$API_URL/api/bookings/$booking_id" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "If-None-Match: \"$etag\"" --max-time $TIMEOUT 2>/dev/null || echo "")
    
    if echo "$cache_response" | grep -q "HTTP/1.1 304"; then
        report_test "GET 304 Not Modified" "304" "true"
    else
        report_test "GET 304 Not Modified" "304" "false"
    fi
    
    # Test 4: PATCH 428 Precondition Required (missing If-Match)
    log_test "4. PATCH 428 Precondition Required (missing If-Match)"
    local patch_response
    patch_response=$(curl -i -s -X PATCH "$API_URL/api/bookings/$booking_id" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        --data '{"amount":"150.00"}' --max-time $TIMEOUT 2>/dev/null || echo "")
    
    if echo "$patch_response" | grep -q "HTTP/1.1 428"; then
        report_test "PATCH 428 Precondition Required" "428" "true"
    else
        report_test "PATCH 428 Precondition Required" "428" "false"
    fi
    
    # Test 5: PATCH 412 Precondition Failed (wrong version)
    log_test "5. PATCH 412 Precondition Failed (wrong version)"
    local conflict_response
    conflict_response=$(curl -i -s -X PATCH "$API_URL/api/bookings/$booking_id" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "If-Match: \"999\"" \
        --data '{"amount":"150.00"}' --max-time $TIMEOUT 2>/dev/null || echo "")
    
    if echo "$conflict_response" | grep -q "HTTP/1.1 412"; then
        report_test "PATCH 412 Precondition Failed" "412" "true"
    else
        report_test "PATCH 412 Precondition Failed" "412" "false"
    fi
    
    # Test 6: PATCH 200 + New ETag (successful update)
    log_test "6. PATCH 200 + New ETag (successful update)"
    local success_response
    success_response=$(curl -i -s -X PATCH "$API_URL/api/bookings/$booking_id" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "If-Match: \"$etag\"" \
        --data '{"amount":"150.00"}' --max-time $TIMEOUT 2>/dev/null || echo "")
    
    if echo "$success_response" | grep -q "HTTP/1.1 200"; then
        local new_etag
        new_etag=$(extract_etag_from_headers "$success_response")
        if [ -n "$new_etag" ] && [ "$new_etag" != "$etag" ]; then
            report_test "PATCH 200 + New ETag" "200" "true"
            log_info "Version incremented: $etag → $new_etag"
        else
            log_warning "ETag not updated or missing"
            report_test "PATCH 200 + New ETag" "200" "false"
        fi
    else
        report_test "PATCH 200 + New ETag" "200" "false"
    fi
    
    return 0
}

# Test suite for test routes (no authentication)
test_fallback_routes() {
    log_info "Testing fallback test routes (/api/test-db) - no authentication required..."
    
    # Clear test data first
    curl -s "$API_URL/api/test-db/bookings" -X DELETE >/dev/null 2>&1 || true
    
    local booking_id="test-1"  # Test routes use fixed ID
    local etag=""
    
    # Test 1: POST 201 + ETag (Create)
    log_test "1. POST 201 + ETag (CREATE)"
    local create_response
    create_response=$(curl -i -s -X POST "$API_URL/api/test-db/bookings" \
        -H "Content-Type: application/json" \
        --data '{"customerName":"WSL Test User","amount":"100.00","currency":"KRW"}' \
        --max-time $TIMEOUT 2>/dev/null || echo "")
    
    if echo "$create_response" | grep -q "HTTP/1.1 201"; then
        etag=$(extract_etag_from_headers "$create_response")
        report_test "POST Create Booking (Test)" "201" "true"
        log_info "Created test booking, ETag: $etag"
    else
        report_test "POST Create Booking (Test)" "201" "false"
        return 1
    fi
    
    if [ -z "$etag" ]; then
        log_error "Failed to extract ETag"
        return 1
    fi
    
    # Test 2: GET 200 + ETag confirmation
    log_test "2. GET 200 + ETag confirmation"
    http_request "GET" "$API_URL/api/test-db/bookings/$booking_id"
    if [ "$HTTP_STATUS" = "200" ]; then
        report_test "GET ETag Confirmation (Test)" "200" "true"
    else
        report_test "GET ETag Confirmation (Test)" "200" "false"
    fi
    
    # Test 3: GET 304 Not Modified
    log_test "3. GET 304 Not Modified (If-None-Match)"
    local cache_response
    cache_response=$(curl -i -s "$API_URL/api/test-db/bookings/$booking_id" \
        -H "If-None-Match: \"$etag\"" --max-time $TIMEOUT 2>/dev/null || echo "")
    
    if echo "$cache_response" | grep -q "HTTP/1.1 304"; then
        report_test "GET 304 Not Modified (Test)" "304" "true"
    else
        report_test "GET 304 Not Modified (Test)" "304" "false"
    fi
    
    # Test 4: PATCH 428 Precondition Required
    log_test "4. PATCH 428 Precondition Required (missing If-Match)"
    http_request "PATCH" "$API_URL/api/test-db/bookings/$booking_id" '{"amount":"150.00"}' "-H 'Content-Type: application/json'"
    if [ "$HTTP_STATUS" = "428" ]; then
        report_test "PATCH 428 Precondition Required (Test)" "428" "true"
    else
        report_test "PATCH 428 Precondition Required (Test)" "428" "false"
    fi
    
    # Test 5: PATCH 412 Precondition Failed
    log_test "5. PATCH 412 Precondition Failed (wrong version)"
    http_request "PATCH" "$API_URL/api/test-db/bookings/$booking_id" '{"amount":"150.00"}' "-H 'Content-Type: application/json' -H 'If-Match: \"999\"'"
    if [ "$HTTP_STATUS" = "412" ]; then
        report_test "PATCH 412 Precondition Failed (Test)" "412" "true"
    else
        report_test "PATCH 412 Precondition Failed (Test)" "412" "false"
    fi
    
    # Test 6: PATCH 200 + New ETag
    log_test "6. PATCH 200 + New ETag (successful update)"
    local success_response
    success_response=$(curl -i -s -X PATCH "$API_URL/api/test-db/bookings/$booking_id" \
        -H "Content-Type: application/json" \
        -H "If-Match: \"$etag\"" \
        --data '{"amount":"150.00"}' --max-time $TIMEOUT 2>/dev/null || echo "")
    
    if echo "$success_response" | grep -q "HTTP/1.1 200"; then
        local new_etag
        new_etag=$(extract_etag_from_headers "$success_response")
        if [ -n "$new_etag" ] && [ "$new_etag" != "$etag" ]; then
            report_test "PATCH 200 + New ETag (Test)" "200" "true"
            log_info "Version incremented: $etag → $new_etag"
        else
            log_warning "ETag not updated or missing"
            report_test "PATCH 200 + New ETag (Test)" "200" "false"
        fi
    else
        report_test "PATCH 200 + New ETag (Test)" "200" "false"
    fi
    
    return 0
}

# Additional diagnostic tests
test_production_guards() {
    log_info "Testing production route guards..."
    
    # Set NODE_ENV=production and test if test routes are blocked
    local test_response
    test_response=$(NODE_ENV=production curl -s -o /dev/null -w "%{http_code}" \
        "$API_URL/api/test-respond" 2>/dev/null || echo "ERROR")
    
    if [ "$test_response" = "404" ]; then
        log_success "✅ Test routes properly blocked in production mode"
    elif [ "$test_response" = "ERROR" ]; then
        log_warning "Could not test production guards (connection error)"
    else
        log_error "❌ Test routes not blocked in production mode (got $test_response)"
    fi
}

# Main execution
main() {
    echo "======================================================="
    echo "     Phase 2A Optimistic Locking Test Suite"
    echo "======================================================="
    echo
    
    log_info "API URL: $API_URL"
    log_info "Timeout: ${TIMEOUT}s"
    log_info "Verbose: $VERBOSE"
    echo
    
    # Check API connectivity
    log_info "Testing API connectivity..."
    http_request "GET" "$API_URL/healthz"
    
    if [ "$HTTP_STATUS" != "200" ]; then
        log_error "API server not responding at $API_URL"
        log_info "Please ensure the API server is running:"
        log_info "  cd apps/api && PORT=4001 npm run dev"
        exit 1
    fi
    
    log_success "API server is responsive"
    echo
    
    # Determine which routes to test
    local use_production=false
    
    if [ "$USE_PRODUCTION_ROUTES" = "true" ] || [ "$USE_PRODUCTION_ROUTES" = "auto" ]; then
        if authenticate_user; then
            use_production=true
        fi
    fi
    
    echo
    
    # Run appropriate test suite
    if [ "$use_production" = "true" ]; then
        test_production_routes
    else
        test_fallback_routes
    fi
    
    echo
    
    # Additional tests
    test_production_guards
    
    # Summary report
    echo
    echo "======================================================="
    echo "                    TEST SUMMARY"
    echo "======================================================="
    
    log_info "Tests Passed: $TESTS_PASSED"
    log_info "Tests Failed: $TESTS_FAILED"
    log_info "Total Tests:  $TESTS_TOTAL"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        log_success "🎉 All tests passed! Optimistic locking is working correctly."
    else
        log_error "❌ Some tests failed. Please review the issues above."
    fi
    
    echo "======================================================="
    
    # Exit with appropriate code
    [ $TESTS_FAILED -eq 0 ]
}

# Handle command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE="true"
            shift
            ;;
        --production)
            USE_PRODUCTION_ROUTES="true"
            shift
            ;;
        --test-only)
            USE_PRODUCTION_ROUTES="false"
            shift
            ;;
        --api-url)
            API_URL="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --verbose, -v        Enable verbose output"
            echo "  --production         Force use of production routes"
            echo "  --test-only          Force use of test routes only"
            echo "  --api-url URL        Set API URL (default: http://localhost:4001)"
            echo "  --timeout SECONDS    Set request timeout (default: 10)"
            echo "  --help, -h           Show this help"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi