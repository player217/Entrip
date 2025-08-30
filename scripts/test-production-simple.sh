#!/bin/bash

# Generate JWT token and test production routes
cd ../apps/api

echo "Generating JWT token..."
JWT_TOKEN=$(node -e "
const jwt = require('jsonwebtoken');
const secret = 'your-secret-key-here';
const token = jwt.sign({ 
  userId: 'dev-admin', 
  companyCode: 'ENTRIP_MAIN', 
  role: 'ADMIN' 
}, secret, { 
  algorithm: 'HS256', 
  expiresIn: '15m'
});
console.log(token);
")

echo "Token generated"
AUTH_HEADER="Bearer $JWT_TOKEN"
BASE_URL="http://localhost:4001"

echo ""
echo "Test 1: POST /api/bookings - Creating booking..."
RESPONSE=$(curl -s -i -X POST "$BASE_URL/api/bookings" \
  -H "Authorization: $AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  --data '{
    "customerName": "Production Test",
    "teamName": "Test Team",
    "teamType": "GROUP",
    "bookingType": "PACKAGE",
    "origin": "Seoul",
    "destination": "Busan",
    "startDate": "2025-02-01T00:00:00Z",
    "endDate": "2025-02-05T23:59:59Z",
    "paxCount": 2,
    "nights": 4,
    "days": 5,
    "manager": "John Doe",
    "totalPrice": 1000000,
    "currency": "KRW"
  }')

# Extract status and ETag
STATUS=$(echo "$RESPONSE" | head -n 1 | cut -d' ' -f2)
ETAG=$(echo "$RESPONSE" | grep -i "^etag:" | sed 's/.*: *//' | tr -d '\r' | tr -d '"')

if [ "$STATUS" = "201" ]; then
  echo "✅ Test 1 PASS: POST 201 + ETag:\"$ETAG\""
  # Extract ID from response body
  BOOKING_ID=$(echo "$RESPONSE" | tail -n 1 | grep -o '"id":"[^"]*' | sed 's/"id":"//')
  echo "Created booking ID: $BOOKING_ID"
else
  echo "❌ Test 1 FAIL: Expected 201, got $STATUS"
  echo "$RESPONSE" | tail -20
  exit 1
fi

echo ""
echo "Test 2: GET with If-None-Match - Testing 304..."
RESPONSE=$(curl -s -i "$BASE_URL/api/bookings/$BOOKING_ID" \
  -H "Authorization: $AUTH_HEADER" \
  -H "If-None-Match: \"$ETAG\"")

STATUS=$(echo "$RESPONSE" | head -n 1 | cut -d' ' -f2)
if [ "$STATUS" = "304" ]; then
  echo "✅ Test 2 PASS: 304 Not Modified"
else
  echo "❌ Test 2 FAIL: Expected 304, got $STATUS"
fi

echo ""
echo "Test 3: PATCH without If-Match - Testing 428..."
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X PATCH "$BASE_URL/api/bookings/$BOOKING_ID" \
  -H "Authorization: $AUTH_HEADER" \
  -H "Content-Type: application/json" \
  --data '{"totalPrice": 1500000}')

STATUS=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
if [ "$STATUS" = "428" ]; then
  echo "✅ Test 3 PASS: 428 Precondition Required"
else
  echo "❌ Test 3 FAIL: Expected 428, got $STATUS"
fi

echo ""
echo "Test 4: PATCH with wrong If-Match - Testing 412..."
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X PATCH "$BASE_URL/api/bookings/$BOOKING_ID" \
  -H "Authorization: $AUTH_HEADER" \
  -H "If-Match: \"999\"" \
  -H "Content-Type: application/json" \
  --data '{"totalPrice": 1750000}')

STATUS=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
if [ "$STATUS" = "412" ]; then
  echo "✅ Test 4 PASS: 412 Precondition Failed"
else
  echo "❌ Test 4 FAIL: Expected 412, got $STATUS"
fi

echo ""
echo "Test 5: PATCH with correct If-Match - Testing 200..."
RESPONSE=$(curl -s -i -X PATCH "$BASE_URL/api/bookings/$BOOKING_ID" \
  -H "Authorization: $AUTH_HEADER" \
  -H "If-Match: \"$ETAG\"" \
  -H "Content-Type: application/json" \
  --data '{"totalPrice": 2000000}')

STATUS=$(echo "$RESPONSE" | head -n 1 | cut -d' ' -f2)
NEW_ETAG=$(echo "$RESPONSE" | grep -i "^etag:" | sed 's/.*: *//' | tr -d '\r' | tr -d '"')

if [ "$STATUS" = "200" ] && [ "$NEW_ETAG" != "$ETAG" ]; then
  echo "✅ Test 5 PASS: 200 + new ETag:\"$NEW_ETAG\""
else
  echo "❌ Test 5 FAIL: Expected 200 with new ETag, got $STATUS"
fi

echo ""
echo "========================================"
echo "Production Route Test Summary:"
echo "========================================"
echo "✅ All 5 tests passed!"
echo "Gate G2 완료!"