#!/bin/bash

BASE=http://localhost:4001
COOKIE=cookies.txt

echo "=== ETag Optimistic Locking Smoke Test ==="
echo

# 로그인(세션 쿠키)
echo "1. Login..."
curl -s -c $COOKIE -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"companyCode":"ENTRIP_MAIN","username":"admin","password":"pass1234"}' > /dev/null
echo "✅ Logged in"
echo

# 1) POST
echo "2. POST - Create booking..."
resp=$(curl -si -b $COOKIE -X POST "$BASE/api/v1/bookings" \
  -H "Content-Type: application/json" \
  -d '{"customerName":"Smoke","teamName":"T","teamType":"GROUP","bookingType":"PACKAGE","origin":"Seoul","destination":"Busan","startDate":"2025-09-01T00:00:00Z","endDate":"2025-09-03T00:00:00Z","paxCount":2,"nights":2,"days":3,"totalPrice":1000,"currency":"KRW","manager":"System"}')
  
# Extract id and etag
id=$(echo "$resp" | tr -d '\r' | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
etag=$(echo "$resp" | tr -d '\r' | grep -i "^ETag:" | cut -d' ' -f2)
status=$(echo "$resp" | head -n1 | awk '{print $2}')

echo "Status: $status"
echo "ID: $id"
echo "ETag: $etag"
if [ "$status" = "201" ] && [ "$etag" = '"1"' ]; then
  echo "✅ POST 201 + ETag:\"1\" - PASSED"
else
  echo "❌ POST failed"
fi
echo

# 2) GET 304
echo "3. GET with If-None-Match..."
status304=$(curl -si -b $COOKIE "$BASE/api/v1/bookings/$id" -H "If-None-Match: $etag" | head -n1 | awk '{print $2}')
echo "Status: $status304"
if [ "$status304" = "304" ]; then
  echo "✅ GET 304 Not Modified - PASSED"
else
  echo "❌ GET 304 failed"
fi
echo

# 3) PATCH 428
echo "4. PATCH without If-Match..."
status428=$(curl -si -b $COOKIE -X PATCH "$BASE/api/v1/bookings/$id" \
  -H "Content-Type: application/json" -d '{"notes":"x"}' | head -n1 | awk '{print $2}')
echo "Status: $status428"
if [ "$status428" = "428" ]; then
  echo "✅ PATCH 428 Precondition Required - PASSED"
else
  echo "❌ PATCH 428 failed"
fi
echo

# 4) PATCH 412
echo "5. PATCH with wrong If-Match..."
status412=$(curl -si -b $COOKIE -X PATCH "$BASE/api/v1/bookings/$id" \
  -H 'If-Match: "999"' -H "Content-Type: application/json" -d '{"notes":"y"}' | head -n1 | awk '{print $2}')
echo "Status: $status412"
if [ "$status412" = "412" ]; then
  echo "✅ PATCH 412 Precondition Failed - PASSED"
else
  echo "❌ PATCH 412 failed"
fi
echo

# 5) PATCH 200 + 새 ETag
echo "6. PATCH with correct If-Match..."
resp2=$(curl -si -b $COOKIE -X PATCH "$BASE/api/v1/bookings/$id" \
  -H "If-Match: $etag" -H "Content-Type: application/json" -d '{"notes":"ok"}')
status200=$(echo "$resp2" | head -n1 | awk '{print $2}')
newetag=$(echo "$resp2" | tr -d '\r' | grep -i "^ETag:" | cut -d' ' -f2)
echo "Status: $status200"
echo "New ETag: $newetag"
if [ "$status200" = "200" ] && [ "$newetag" = '"2"' ]; then
  echo "✅ PATCH 200 + ETag:\"2\" - PASSED"
else
  echo "❌ PATCH 200 failed"
fi
echo

echo "=== Test Complete ==="