#!/bin/bash

echo "🚀 Gate G2 Final Production Test"
echo "================================"

cd ../apps/api

# Generate JWT token
echo "Generating JWT token..."
TOKEN=$(node -e "
const jwt = require('jsonwebtoken');
const secret = 'your-super-secret-jwt-key-change-in-production';
const token = jwt.sign(
  {userId:'dev-admin', companyCode:'ENTRIP_MAIN', role:'ADMIN'},
  secret,
  {expiresIn:'30m'}
);
console.log(token);
")

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to generate token"
  exit 1
fi

echo "✅ Token generated successfully"

AUTH="Bearer $TOKEN"
BASE_URL="http://localhost:4001"

echo ""
echo "📝 Test 1: POST /api/bookings (Create with ETag)"
echo "------------------------------------------------"

RESPONSE=$(curl -s -i -X POST "$BASE_URL/api/bookings" \
  -H "Authorization: $AUTH" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: g2-$(date +%s)" \
  --data '{
    "customerName": "Gate G2 Production",
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
    "manager": "John Manager",
    "totalPrice": 1000000,
    "currency": "KRW"
  }')

STATUS_LINE=$(echo "$RESPONSE" | head -n 1)
STATUS=$(echo "$STATUS_LINE" | cut -d' ' -f2)

if [ "$STATUS" = "201" ]; then
  ETAG=$(echo "$RESPONSE" | grep -i "^etag:" | sed 's/.*: *//' | tr -d '\r' | tr -d '"')
  BODY=$(echo "$RESPONSE" | tail -n 1)
  ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | sed 's/"id":"//')
  
  echo "✅ POST 201 Created"
  echo "   ID: $ID"
  echo "   ETag: \"$ETAG\""
  
  # Continue with other tests...
  echo ""
  echo "📝 Test 2: GET with If-None-Match (304)"
  curl -s -i "$BASE_URL/api/bookings/$ID" \
    -H "Authorization: $AUTH" \
    -H "If-None-Match: \"$ETAG\"" | head -n 1
  
  echo ""
  echo "📝 Test 3: PATCH without If-Match (428)"
  curl -s -i -X PATCH "$BASE_URL/api/bookings/$ID" \
    -H "Authorization: $AUTH" \
    -H "Content-Type: application/json" \
    --data '{"totalPrice": 1500000}' | head -n 1
  
  echo ""
  echo "📝 Test 4: PATCH with wrong If-Match (412)"
  curl -s -i -X PATCH "$BASE_URL/api/bookings/$ID" \
    -H "Authorization: $AUTH" \
    -H "If-Match: \"999\"" \
    -H "Content-Type: application/json" \
    --data '{"totalPrice": 1750000}' | head -n 1
  
  echo ""
  echo "📝 Test 5: PATCH with correct If-Match (200)"
  PATCH_RESPONSE=$(curl -s -i -X PATCH "$BASE_URL/api/bookings/$ID" \
    -H "Authorization: $AUTH" \
    -H "If-Match: \"$ETAG\"" \
    -H "Content-Type: application/json" \
    --data '{"totalPrice": 2000000}')
  
  echo "$PATCH_RESPONSE" | head -n 1
  NEW_ETAG=$(echo "$PATCH_RESPONSE" | grep -i "^etag:" | sed 's/.*: *//' | tr -d '\r' | tr -d '"')
  echo "   New ETag: \"$NEW_ETAG\""
  
  echo ""
  echo "🎉 Gate G2 Complete!"
  
else
  echo "❌ POST failed with status: $STATUS"
  echo "$RESPONSE" | head -20
  exit 1
fi