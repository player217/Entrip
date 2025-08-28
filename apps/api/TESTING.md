# Optimistic Locking 수동 테스트 가이드

## 테스트 준비

### 1. 서버 실행
```bash
cd apps/api
npm run dev
```

### 2. 로그인 (쿠키 저장)
```bash
curl -c cookies.txt -X POST http://localhost:4001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "companyCode": "ENTRIP_MAIN",
    "username": "admin",
    "password": "pass1234"
  }'
```

## 테스트 시나리오

### 1️⃣ 생성 (201 + ETag:"1")

```bash
curl -b cookies.txt -i -X POST http://localhost:4001/api/v1/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Manual Test",
    "teamName": "Test Team",
    "teamType": "GROUP",
    "bookingType": "PACKAGE",
    "origin": "Seoul",
    "destination": "Tokyo",
    "startDate": "2025-09-15T00:00:00Z",
    "endDate": "2025-09-20T00:00:00Z",
    "paxCount": 3,
    "nights": 5,
    "days": 6,
    "totalPrice": 3000,
    "currency": "USD",
    "manager": "Manager"
  }'
```

**예상 결과:**
- Status: `201 Created`
- Headers: `ETag: "1"`
- Body: JSON with `"version": 1`

**응답 예시:**
```
HTTP/1.1 201 Created
ETag: "1"
Content-Type: application/json

{
  "id": "cmeut...",
  "version": 1,
  ...
}
```

### 2️⃣ 조회 with If-None-Match (304)

ID를 위 응답에서 복사한 후:

```bash
# 변경사항 없을 때 - 304 응답
curl -b cookies.txt -i \
  -H "If-None-Match: \"1\"" \
  http://localhost:4001/api/v1/bookings/{id}
```

**예상 결과:**
- Status: `304 Not Modified`
- Body: 없음 (빈 응답)

**응답 예시:**
```
HTTP/1.1 304 Not Modified
ETag: "1"
```

```bash
# 일반 조회 (변경사항 확인용)
curl -b cookies.txt -i \
  http://localhost:4001/api/v1/bookings/{id}
```

**예상 결과:**
- Status: `200 OK`
- Headers: `ETag: "1"`
- Body: 전체 데이터

### 3️⃣ 수정 - Case A: If-Match 없음 (428)

```bash
curl -b cookies.txt -i -X PATCH http://localhost:4001/api/v1/bookings/{id} \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "No If-Match header"
  }'
```

**예상 결과:**
- Status: `428 Precondition Required`

**응답 예시:**
```
HTTP/1.1 428 Precondition Required
Content-Type: application/json

{
  "error": "Precondition Required",
  "message": "If-Match header is required for updates"
}
```

### 4️⃣ 수정 - Case B: 잘못된 If-Match (412)

```bash
curl -b cookies.txt -i -X PATCH http://localhost:4001/api/v1/bookings/{id} \
  -H "Content-Type: application/json" \
  -H "If-Match: \"999\"" \
  -d '{
    "notes": "Wrong version"
  }'
```

**예상 결과:**
- Status: `412 Precondition Failed`

**응답 예시:**
```
HTTP/1.1 412 Precondition Failed
Content-Type: application/json

{
  "error": "Precondition Failed",
  "message": "Resource has been modified",
  "currentVersion": 1
}
```

### 5️⃣ 수정 - Case C: 올바른 If-Match (200)

```bash
curl -b cookies.txt -i -X PATCH http://localhost:4001/api/v1/bookings/{id} \
  -H "Content-Type: application/json" \
  -H "If-Match: \"1\"" \
  -d '{
    "notes": "Successfully updated",
    "customerName": "Updated Customer"
  }'
```

**예상 결과:**
- Status: `200 OK`
- Headers: `ETag: "2"`
- Body: `"version": 2`

**응답 예시:**
```
HTTP/1.1 200 OK
ETag: "2"
Content-Type: application/json

{
  "id": "cmeut...",
  "version": 2,
  "notes": "Successfully updated",
  "customerName": "Updated Customer",
  ...
}
```

## 동시성 테스트

### 두 개의 터미널에서 동시 실행

**Terminal 1:**
```bash
curl -b cookies.txt -X PATCH http://localhost:4001/api/v1/bookings/{id} \
  -H "Content-Type: application/json" \
  -H "If-Match: \"2\"" \
  -d '{"notes": "Update 1"}' &
```

**Terminal 2:**
```bash
curl -b cookies.txt -X PATCH http://localhost:4001/api/v1/bookings/{id} \
  -H "Content-Type: application/json" \
  -H "If-Match: \"2\"" \
  -d '{"notes": "Update 2"}' &
```

**예상 결과:**
- 한 요청: `200 OK` with `ETag: "3"`
- 다른 요청: `412 Precondition Failed`

## Windows PowerShell 예제

### 로그인
```powershell
$response = Invoke-WebRequest -Uri "http://localhost:4001/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"companyCode":"ENTRIP_MAIN","username":"admin","password":"pass1234"}' `
  -SessionVariable session
```

### 생성
```powershell
$booking = Invoke-RestMethod -Uri "http://localhost:4001/api/v1/bookings" `
  -Method POST `
  -WebSession $session `
  -ContentType "application/json" `
  -Body (@{
    customerName = "PowerShell Test"
    teamName = "PS Team"
    teamType = "GROUP"
    bookingType = "PACKAGE"
    origin = "Seoul"
    destination = "Osaka"
    startDate = "2025-10-01T00:00:00Z"
    endDate = "2025-10-05T00:00:00Z"
    paxCount = 2
    nights = 4
    days = 5
    totalPrice = 2000
    currency = "USD"
    manager = "PS Manager"
  } | ConvertTo-Json)

Write-Host "Created booking with ID: $($booking.id) and version: $($booking.version)"
```

### 조회 with If-None-Match
```powershell
$headers = @{
  "If-None-Match" = '"1"'
}

try {
  $response = Invoke-WebRequest -Uri "http://localhost:4001/api/v1/bookings/$($booking.id)" `
    -Method GET `
    -WebSession $session `
    -Headers $headers
  Write-Host "Status: $($response.StatusCode)"
} catch {
  if ($_.Exception.Response.StatusCode -eq 304) {
    Write-Host "304 Not Modified - Cache is valid"
  }
}
```

### 수정 테스트
```powershell
# Case A: No If-Match (428)
try {
  Invoke-RestMethod -Uri "http://localhost:4001/api/v1/bookings/$($booking.id)" `
    -Method PATCH `
    -WebSession $session `
    -ContentType "application/json" `
    -Body '{"notes": "No header"}'
} catch {
  Write-Host "Expected 428: $($_.Exception.Response.StatusCode)"
}

# Case B: Wrong If-Match (412)
$headers = @{
  "If-Match" = '"999"'
}
try {
  Invoke-RestMethod -Uri "http://localhost:4001/api/v1/bookings/$($booking.id)" `
    -Method PATCH `
    -WebSession $session `
    -Headers $headers `
    -ContentType "application/json" `
    -Body '{"notes": "Wrong version"}'
} catch {
  Write-Host "Expected 412: $($_.Exception.Response.StatusCode)"
}

# Case C: Correct If-Match (200)
$headers = @{
  "If-Match" = '"1"'
}
$updated = Invoke-RestMethod -Uri "http://localhost:4001/api/v1/bookings/$($booking.id)" `
  -Method PATCH `
  -WebSession $session `
  -Headers $headers `
  -ContentType "application/json" `
  -Body '{"notes": "Success"}'

Write-Host "Updated to version: $($updated.version)"
```

## Postman Collection

```json
{
  "info": {
    "name": "Entrip Optimistic Locking Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"companyCode\": \"ENTRIP_MAIN\",\n  \"username\": \"admin\",\n  \"password\": \"pass1234\"\n}"
        },
        "url": {
          "raw": "http://localhost:4001/auth/login",
          "protocol": "http",
          "host": ["localhost"],
          "port": "4001",
          "path": ["auth", "login"]
        }
      }
    },
    {
      "name": "Create Booking (201 + ETag)",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"customerName\": \"Postman Test\",\n  \"teamName\": \"API Team\",\n  \"teamType\": \"GROUP\",\n  \"bookingType\": \"PACKAGE\",\n  \"origin\": \"Seoul\",\n  \"destination\": \"Singapore\",\n  \"startDate\": \"2025-11-01T00:00:00Z\",\n  \"endDate\": \"2025-11-07T00:00:00Z\",\n  \"paxCount\": 4,\n  \"nights\": 6,\n  \"days\": 7,\n  \"totalPrice\": 5000,\n  \"currency\": \"USD\",\n  \"manager\": \"API Manager\"\n}"
        },
        "url": {
          "raw": "http://localhost:4001/api/v1/bookings",
          "protocol": "http",
          "host": ["localhost"],
          "port": "4001",
          "path": ["api", "v1", "bookings"]
        }
      }
    },
    {
      "name": "Get with If-None-Match (304)",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "If-None-Match",
            "value": "\"1\""
          }
        ],
        "url": {
          "raw": "http://localhost:4001/api/v1/bookings/{{booking_id}}",
          "protocol": "http",
          "host": ["localhost"],
          "port": "4001",
          "path": ["api", "v1", "bookings", "{{booking_id}}"]
        }
      }
    },
    {
      "name": "Patch without If-Match (428)",
      "request": {
        "method": "PATCH",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"notes\": \"Missing If-Match\"\n}"
        },
        "url": {
          "raw": "http://localhost:4001/api/v1/bookings/{{booking_id}}",
          "protocol": "http",
          "host": ["localhost"],
          "port": "4001",
          "path": ["api", "v1", "bookings", "{{booking_id}}"]
        }
      }
    },
    {
      "name": "Patch with wrong If-Match (412)",
      "request": {
        "method": "PATCH",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "If-Match",
            "value": "\"999\""
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"notes\": \"Wrong version\"\n}"
        },
        "url": {
          "raw": "http://localhost:4001/api/v1/bookings/{{booking_id}}",
          "protocol": "http",
          "host": ["localhost"],
          "port": "4001",
          "path": ["api", "v1", "bookings", "{{booking_id}}"]
        }
      }
    },
    {
      "name": "Patch with correct If-Match (200)",
      "request": {
        "method": "PATCH",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "If-Match",
            "value": "\"1\""
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"notes\": \"Successfully updated\",\n  \"customerName\": \"Updated via Postman\"\n}"
        },
        "url": {
          "raw": "http://localhost:4001/api/v1/bookings/{{booking_id}}",
          "protocol": "http",
          "host": ["localhost"],
          "port": "4001",
          "path": ["api", "v1", "bookings", "{{booking_id}}"]
        }
      }
    }
  ]
}
```

## 자동화 스크립트

### `manual-test.sh`
```bash
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
```

## 테스트 체크리스트

- [ ] 로그인 성공
- [ ] POST 201 + ETag:"1"
- [ ] GET with If-None-Match → 304
- [ ] PATCH without If-Match → 428
- [ ] PATCH with wrong If-Match → 412
- [ ] PATCH with correct If-Match → 200 + ETag:"2"
- [ ] 동시 업데이트 → 하나만 성공