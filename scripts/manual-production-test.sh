#!/bin/bash

# Manual Production Route Testing Commands
# Copy and paste these commands one by one with your AUTH token

echo "============================================="
echo "Phase 2A Manual Production Testing Commands"
echo "============================================="
echo ""
echo "First, set your AUTH token:"
echo 'export AUTH_BEARER="Bearer YOUR_TOKEN_HERE"'
echo 'export BASE_URL="http://localhost:4001"'
echo ""
echo "Then run these commands in sequence:"
echo ""

echo "# 1. POST - Create Booking (expecting 201 + ETag)"
echo 'curl -i -X POST $BASE_URL/api/bookings \'
echo '  -H "Content-Type: application/json" \'
echo '  -H "Authorization: $AUTH_BEARER" \'
echo '  -d '"'"'{"customerName":"Prod Test","amount":"100.00","status":"confirmed","bookingDate":"2025-01-01T00:00:00Z"}'"'"

echo ""
echo "# Save the booking ID from response, then:"
echo 'export BOOKING_ID="<ID_FROM_RESPONSE>"'
echo 'export ETAG="<ETAG_FROM_RESPONSE>"  # e.g., "1"'
echo ""

echo "# 2. GET - Retrieve with ETag (expecting 200 + ETag)"
echo 'curl -i $BASE_URL/api/bookings/$BOOKING_ID \'
echo '  -H "Authorization: $AUTH_BEARER"'
echo ""

echo "# 3. GET - Cache Validation (expecting 304)"
echo 'curl -i $BASE_URL/api/bookings/$BOOKING_ID \'
echo '  -H "Authorization: $AUTH_BEARER" \'
echo '  -H "If-None-Match: $ETAG"'
echo ""

echo "# 4. PATCH - No If-Match (expecting 428)"
echo 'curl -i -X PATCH $BASE_URL/api/bookings/$BOOKING_ID \'
echo '  -H "Content-Type: application/json" \'
echo '  -H "Authorization: $AUTH_BEARER" \'
echo '  -d '"'"'{"amount":"150.00"}'"'"
echo ""

echo "# 5. PATCH - Wrong If-Match (expecting 412)"
echo 'curl -i -X PATCH $BASE_URL/api/bookings/$BOOKING_ID \'
echo '  -H "Content-Type: application/json" \'
echo '  -H "Authorization: $AUTH_BEARER" \'
echo '  -H "If-Match: \"wrong-etag\"" \'
echo '  -d '"'"'{"amount":"175.00"}'"'"
echo ""

echo "# 6. PATCH - Correct If-Match (expecting 200 + new ETag)"
echo 'curl -i -X PATCH $BASE_URL/api/bookings/$BOOKING_ID \'
echo '  -H "Content-Type: application/json" \'
echo '  -H "Authorization: $AUTH_BEARER" \'
echo '  -H "If-Match: $ETAG" \'
echo '  -d '"'"'{"amount":"200.00"}'"'"
echo ""

echo "============================================="
echo "Expected Results for GO Decision:"
echo "============================================="
echo "✅ Test 1: 201 Created + ETag header"
echo "✅ Test 2: 200 OK + ETag header"
echo "✅ Test 3: 304 Not Modified"
echo "✅ Test 4: 428 Precondition Required"
echo "✅ Test 5: 412 Precondition Failed"
echo "✅ Test 6: 200 OK + new ETag (version incremented)"
echo ""
echo "All 6 tests must pass for GO decision!"