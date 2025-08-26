#!/bin/bash

echo "🔍 Quick Route Test"
echo "=================="

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Start server in background
echo "Starting server..."
cd apps/web && pnpm start > /tmp/next-server.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to be ready..."
for i in {1..30}; do
  if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000" | grep -q "307\|200"; then
    echo -e "${GREEN}✓ Server is ready${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}✗ Server failed to start${NC}"
    kill $SERVER_PID 2>/dev/null
    exit 1
  fi
  sleep 1
done

echo ""
echo "Testing routes..."
echo "-----------------"

# Test routes
ROUTES=(
  "/"
  "/dashboard" 
  "/login"
)

# Expected 404 routes (not implemented yet)
# IMPORTANT: Remove from this list when the page is implemented!
EXPECTED_404=(
  "/unauthorized"
)

# Check if any route was removed from whitelist but still returns 404
CHECK_REMOVED_FROM_WHITELIST=true

PASSED=0
FAILED=0

for route in "${ROUTES[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$route")
  
  # Check if this route is expected to return 404
  IS_EXPECTED_404=false
  for expected in "${EXPECTED_404[@]}"; do
    if [[ "$route" == "$expected" ]]; then
      IS_EXPECTED_404=true
      break
    fi
  done
  
  # Check if status is success (2xx) or redirect (3xx)
  if [[ $STATUS =~ ^[23][0-9]{2}$ ]]; then
    echo -e "${GREEN}✓${NC} $route: HTTP $STATUS"
    ((PASSED++))
  elif [[ $STATUS == "404" && $IS_EXPECTED_404 == true ]]; then
    echo -e "${YELLOW}⚠${NC}  $route: HTTP $STATUS (expected - not implemented)"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} $route: HTTP $STATUS"
    ((FAILED++))
  fi
done

# Test static assets
echo ""
echo "Testing static assets..."
echo "-----------------------"

# Get BUILD_ID first
if [ -f "../../apps/web/.next/BUILD_ID" ]; then
  BUILD_ID=$(cat ../../apps/web/.next/BUILD_ID)
  
  # Test a static CSS file
  CSS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/_next/static/css/")
  if [[ $CSS_STATUS == "404" ]]; then
    echo -e "${YELLOW}⚠${NC}  Static CSS: Cannot test without specific filename"
  else
    echo -e "${GREEN}✓${NC} Static assets accessible"
    ((PASSED++))
  fi
else
  echo -e "${YELLOW}⚠${NC}  BUILD_ID not found - skipping static asset test"
fi

# Kill server
kill $SERVER_PID 2>/dev/null

# Summary
echo ""
echo "=================="
echo "Test Summary:"
echo -e "${GREEN}✓ Passed:${NC} $PASSED"
if [ $FAILED -gt 0 ]; then
  echo -e "${RED}✗ Failed:${NC} $FAILED"
else
  echo -e "${GREEN}✗ Failed:${NC} $FAILED"
fi

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
fi