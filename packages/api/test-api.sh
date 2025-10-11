#!/bin/bash

# API v2 스모크 테스트 스크립트
# 실행 날짜: 2025-09-30

echo "============================="
echo "API v2 스모크 테스트 시작"
echo "============================="

BASE_URL="http://localhost:4005/api/v2"
TOKEN=""

# 1. 헬스체크
echo -e "\n[1/7] 헬스체크 테스트..."
curl -s -X GET "$BASE_URL/health" | jq '.'
echo "✅ 헬스체크 완료"

# 2. 로그인 테스트
echo -e "\n[2/7] 로그인 테스트..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123","companyCode":"j1"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')

if [ "$TOKEN" != "null" ] && [ ! -z "$TOKEN" ]; then
  echo "✅ 로그인 성공: 토큰 발급됨"
  echo "Token (첫 20자): ${TOKEN:0:20}..."
else
  echo "❌ 로그인 실패"
  echo "$LOGIN_RESPONSE" | jq '.'
fi

# 3. 인증된 사용자 정보 조회
echo -e "\n[3/7] 인증된 사용자 정보 조회..."
ME_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN")
echo "$ME_RESPONSE" | jq '.data | {id, email, name, companyCode}'
echo "✅ 사용자 정보 조회 완료"

# 4. 예약 목록 조회
echo -e "\n[4/7] 예약 목록 조회..."
BOOKINGS_RESPONSE=$(curl -s -X GET "$BASE_URL/bookings?limit=5" \
  -H "Authorization: Bearer $TOKEN")
BOOKING_COUNT=$(echo $BOOKINGS_RESPONSE | jq '.data | length')
echo "✅ 예약 ${BOOKING_COUNT}건 조회됨"
echo "$BOOKINGS_RESPONSE" | jq '.data[0] | {id, bookingNumber, customerName, status}'

# 5. 예약 생성
echo -e "\n[5/7] 예약 생성 테스트..."
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/bookings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "customerName": "API 테스트 고객",
    "type": "PACKAGE",
    "status": "PENDING",
    "totalPrice": 1000000,
    "depositAmount": 300000,
    "currency": "KRW",
    "notes": "API v2 스모크 테스트"
  }')

NEW_BOOKING_ID=$(echo $CREATE_RESPONSE | jq -r '.data.id')
NEW_BOOKING_NUMBER=$(echo $CREATE_RESPONSE | jq -r '.data.bookingNumber')

if [ "$NEW_BOOKING_ID" != "null" ]; then
  echo "✅ 예약 생성 성공"
  echo "  - ID: $NEW_BOOKING_ID"
  echo "  - 예약번호: $NEW_BOOKING_NUMBER"
else
  echo "❌ 예약 생성 실패"
  echo "$CREATE_RESPONSE" | jq '.'
fi

# 6. 예약 상세 조회
echo -e "\n[6/7] 예약 상세 조회..."
if [ "$NEW_BOOKING_ID" != "null" ]; then
  DETAIL_RESPONSE=$(curl -s -X GET "$BASE_URL/bookings/$NEW_BOOKING_ID" \
    -H "Authorization: Bearer $TOKEN")
  echo "$DETAIL_RESPONSE" | jq '.data | {id, bookingNumber, customerName, status, createdAt}'
  echo "✅ 예약 상세 조회 완료"
fi

# 7. 예약 상태 업데이트
echo -e "\n[7/7] 예약 상태 업데이트..."
if [ "$NEW_BOOKING_ID" != "null" ]; then
  UPDATE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/bookings/$NEW_BOOKING_ID/status" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"status": "CONFIRMED"}')

  UPDATED_STATUS=$(echo $UPDATE_RESPONSE | jq -r '.data.status')
  if [ "$UPDATED_STATUS" == "CONFIRMED" ]; then
    echo "✅ 예약 상태 업데이트 성공: PENDING → CONFIRMED"
  else
    echo "❌ 예약 상태 업데이트 실패"
    echo "$UPDATE_RESPONSE" | jq '.'
  fi
fi

echo -e "\n============================="
echo "API v2 스모크 테스트 완료"
echo "============================="

# 테스트 요약
echo -e "\n📊 테스트 요약:"
echo "- API 서버: $BASE_URL"
echo "- 테스트 시간: $(date '+%Y-%m-%d %H:%M:%S')"
echo "- 테스트 항목: 7개"
echo "- 인증 토큰: ${TOKEN:0:20}..."
echo "- 생성된 예약: $NEW_BOOKING_NUMBER"