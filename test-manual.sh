#!/bin/bash

echo "=== Phase 2A Optimistic Locking Manual Test ==="
echo

API_URL="http://localhost:4001"
TEST_ID="test-manual-$(date +%s)"

# Test 1: POST - Create booking
echo "Test 1: POST Create (expecting 201 + ETag)"
RESPONSE=$(curl -s -i -X POST ${API_URL}/api/test-db/bookings \
  -H "Content-Type: application/json" \
  -d "{\"customerName\":\"Test ${TEST_ID}\",\"amount\":\"100.00\"}")
STATUS=$(echo "$RESPONSE" | grep "^HTTP" | awk '{print $2}')
ETAG=$(echo "$RESPONSE" | grep -i "^etag:" | cut -d' ' -f2 | tr -d '\r"')
echo "Status: $STATUS, ETag: $ETAG"
[ "$STATUS" = "201" ] && [ -n "$ETAG" ] && echo "✅ PASS" || echo "❌ FAIL"
echo

# Get booking ID from response
BOOKING_ID=$(echo "$RESPONSE" | tail -1 | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "Created booking ID: $BOOKING_ID"
echo

# Test 2: GET with ETag
echo "Test 2: GET with ETag (expecting 200 + ETag)"  
RESPONSE=$(curl -s -i ${API_URL}/api/test-db/bookings/${BOOKING_ID})
STATUS=$(echo "$RESPONSE" | grep "^HTTP" | awk '{print $2}')
ETAG=$(echo "$RESPONSE" | grep -i "^etag:" | cut -d' ' -f2 | tr -d '\r"')
echo "Status: $STATUS, ETag: $ETAG"
[ "$STATUS" = "200" ] && [ -n "$ETAG" ] && echo "✅ PASS" || echo "❌ FAIL"
echo

# Test 3: GET 304 Not Modified
echo "Test 3: GET with If-None-Match (expecting 304)"
RESPONSE=$(curl -s -i ${API_URL}/api/test-db/bookings/${BOOKING_ID} \
  -H "If-None-Match: \"$ETAG\"")
STATUS=$(echo "$RESPONSE" | grep "^HTTP" | awk '{print $2}')
echo "Status: $STATUS"
[ "$STATUS" = "304" ] && echo "✅ PASS" || echo "❌ FAIL"
echo

# Test 4: PATCH without If-Match
echo "Test 4: PATCH without If-Match (expecting 428)"
RESPONSE=$(curl -s -i -X PATCH ${API_URL}/api/test-db/bookings/${BOOKING_ID} \
  -H "Content-Type: application/json" \
  -d '{"amount":"150.00"}')
STATUS=$(echo "$RESPONSE" | grep "^HTTP" | awk '{print $2}')
echo "Status: $STATUS"
[ "$STATUS" = "428" ] && echo "✅ PASS" || echo "❌ FAIL"
echo

# Test 5: PATCH with wrong If-Match
echo "Test 5: PATCH with wrong If-Match (expecting 412)"
RESPONSE=$(curl -s -i -X PATCH ${API_URL}/api/test-db/bookings/${BOOKING_ID} \
  -H "Content-Type: application/json" \
  -H "If-Match: \"wrong-etag\"" \
  -d '{"amount":"175.00"}')
STATUS=$(echo "$RESPONSE" | grep "^HTTP" | awk '{print $2}')
echo "Status: $STATUS"
[ "$STATUS" = "412" ] && echo "✅ PASS" || echo "❌ FAIL"
echo

# Test 6: PATCH with correct If-Match
echo "Test 6: PATCH with correct If-Match (expecting 200 + new ETag)"
RESPONSE=$(curl -s -i -X PATCH ${API_URL}/api/test-db/bookings/${BOOKING_ID} \
  -H "Content-Type: application/json" \
  -H "If-Match: \"$ETAG\"" \
  -d '{"amount":"200.00"}')
STATUS=$(echo "$RESPONSE" | grep "^HTTP" | awk '{print $2}')
NEW_ETAG=$(echo "$RESPONSE" | grep -i "^etag:" | cut -d' ' -f2 | tr -d '\r"')
echo "Status: $STATUS, New ETag: $NEW_ETAG"
[ "$STATUS" = "200" ] && [ -n "$NEW_ETAG" ] && [ "$NEW_ETAG" != "$ETAG" ] && echo "✅ PASS" || echo "❌ FAIL"
echo

# Cleanup
echo "Cleaning up test booking..."
curl -s -X DELETE ${API_URL}/api/test-db/bookings/${BOOKING_ID} > /dev/null

echo "=== Test Summary ==="
echo "All 6 optimistic locking scenarios tested!"
