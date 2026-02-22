#!/bin/bash
BASE=http://localhost:4001
COOKIE=cookies.txt

echo "=== Manual Testing Script ==="
echo

# Login
echo "1. Login..."
curl -s -c $COOKIE -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"companyCode":"ENTRIP_MAIN","username":"admin","password":"pass1234"}' > /dev/null
echo "✅ Logged in"
echo

# Create
echo "2. Creating booking..."
response=$(curl -s -i -b $COOKIE -X POST "$BASE/api/v1/bookings" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Manual Test",
    "teamName": "Test Team",
    "teamType": "GROUP",
    "bookingType": "PACKAGE",
    "origin": "Seoul",
    "destination": "Bangkok",
    "startDate": "2025-12-01T00:00:00Z",
    "endDate": "2025-12-10T00:00:00Z",
    "paxCount": 5,
    "nights": 9,
    "days": 10,
    "totalPrice": 7500,
    "currency": "USD",
    "manager": "Test Manager"
  }')

id=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
etag=$(echo "$response" | grep -i "^ETag:" | cut -d' ' -f2 | tr -d '\r')
status=$(echo "$response" | head -n1 | awk '{print $2}')

echo "Status: $status"
echo "ID: $id"
echo "ETag: $etag"
echo

# Test If-None-Match
echo "3. Testing If-None-Match..."
status304=$(curl -s -o /dev/null -w "%{http_code}" -b $COOKIE \
  -H "If-None-Match: $etag" "$BASE/api/v1/bookings/$id")
echo "Status: $status304"
[ "$status304" = "304" ] && echo "✅ 304 Not Modified" || echo "❌ Expected 304"
echo

# Test missing If-Match
echo "4. Testing PATCH without If-Match..."
status428=$(curl -s -o /dev/null -w "%{http_code}" -b $COOKIE -X PATCH \
  "$BASE/api/v1/bookings/$id" \
  -H "Content-Type: application/json" \
  -d '{"notes":"No header"}')
echo "Status: $status428"
[ "$status428" = "428" ] && echo "✅ 428 Precondition Required" || echo "❌ Expected 428"
echo

# Test wrong If-Match
echo "5. Testing PATCH with wrong If-Match..."
status412=$(curl -s -o /dev/null -w "%{http_code}" -b $COOKIE -X PATCH \
  "$BASE/api/v1/bookings/$id" \
  -H "If-Match: \"999\"" \
  -H "Content-Type: application/json" \
  -d '{"notes":"Wrong"}')
echo "Status: $status412"
[ "$status412" = "412" ] && echo "✅ 412 Precondition Failed" || echo "❌ Expected 412"
echo

# Test correct If-Match
echo "6. Testing PATCH with correct If-Match..."
response2=$(curl -s -i -b $COOKIE -X PATCH "$BASE/api/v1/bookings/$id" \
  -H "If-Match: $etag" \
  -H "Content-Type: application/json" \
  -d '{"notes":"Success"}')
status200=$(echo "$response2" | head -n1 | awk '{print $2}')
newetag=$(echo "$response2" | grep -i "^ETag:" | cut -d' ' -f2 | tr -d '\r')
echo "Status: $status200"
echo "New ETag: $newetag"
[ "$status200" = "200" ] && [ "$newetag" = '"2"' ] && echo "✅ 200 OK + ETag:\"2\"" || echo "❌ Expected 200"
echo

echo "=== All Tests Complete ==="