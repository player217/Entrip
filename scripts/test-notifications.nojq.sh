#!/bin/sh
# Notification API E2E Test Script (jq-free)
# Uses Node to parse JSON so jq is not required.

set -e

# Config
API_URL="${API_URL:-http://localhost:4005/api/v2}"
COOKIE_FILE="cookies.txt"

pp() {
  node -e "const fs=require('fs');let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.stringify(JSON.parse(s),null,2))}catch(e){console.log(s)}});"
}

jget() {
  local expr="$1";
  node -e "const fs=require('fs');let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);try{const v=(()=>{return ${expr};})(); if(v===undefined||v===null){process.exit(0)}; if(typeof v==='object'){console.log(JSON.stringify(v));} else {console.log(String(v));}}catch(e){process.exit(0)}});"
}

echo "===================================="
echo "Notification API E2E Test (no jq)"
echo "API_URL=$API_URL"
echo "===================================="
echo

rm -f "$COOKIE_FILE"

echo "1. Login as admin@j1.com (companyCode=j1)..."
LOGIN_RESPONSE=$(curl -s -c "$COOKIE_FILE" -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@j1.com","password":"pass1234","companyCode":"j1"}')
echo "$LOGIN_RESPONSE" | pp

USER_ID=$(echo "$LOGIN_RESPONSE" | jget "(j.user||j.data?.user||{}).id")
echo "User ID: ${USER_ID:-}"
echo

echo "2. Get notification list (first 5)..."
LIST_RESPONSE=$(curl -s -b "$COOKIE_FILE" -X GET "$API_URL/notifications?limit=5")
echo "$LIST_RESPONSE" | pp
echo

echo "3. Get unread notification count..."
UNREAD_RESPONSE=$(curl -s -b "$COOKIE_FILE" -X GET "$API_URL/notifications/unread-count")
echo "$UNREAD_RESPONSE" | pp
echo

echo "4. Get notification preferences..."
PREFS_RESPONSE=$(curl -s -b "$COOKIE_FILE" -X GET "$API_URL/notifications/preferences")
echo "$PREFS_RESPONSE" | pp
echo

echo "5. Update notification preferences (disable email, enable sms)..."
UPDATE_PREFS_RESPONSE=$(curl -s -b "$COOKIE_FILE" -X PUT "$API_URL/notifications/preferences" \
  -H "Content-Type: application/json" \
  -d '{"emailEnabled":false,"smsEnabled":true}')
echo "$UPDATE_PREFS_RESPONSE" | pp
echo

echo "6. Select an unread, non-SYSTEM_ALERT notification (best-effort)..."
# Fetch a page of unread notifications and pick a non-SYSTEM_ALERT first
UNREAD_PAGE=$(curl -s -b "$COOKIE_FILE" -X GET "$API_URL/notifications?limit=20&isRead=false")
echo "$UNREAD_PAGE" | pp
# Prefer non-SYSTEM_ALERT, else any unread
NOTIFICATION_ID=$(echo "$UNREAD_PAGE" | jget "(j.data||[]).find(n=>n&&n.type!=='SYSTEM_ALERT')?.id || (j.data||[])[0]?.id || ''")
echo "Chosen Notification ID: ${NOTIFICATION_ID:-<none>}"
echo

if [ -n "${NOTIFICATION_ID:-}" ]; then
  echo "7. Get notification by ID..."
  DETAIL=$(curl -s -b "$COOKIE_FILE" -X GET "$API_URL/notifications/$NOTIFICATION_ID")
  echo "$DETAIL" | pp
  echo

  echo "8. Mark notification as read..."
  READ=$(curl -s -b "$COOKIE_FILE" -X PATCH "$API_URL/notifications/$NOTIFICATION_ID/read")
  echo "$READ" | pp
  echo

  echo "9. Verify notification is now read..."
  DETAIL2=$(curl -s -b "$COOKIE_FILE" -X GET "$API_URL/notifications/$NOTIFICATION_ID")
  echo "$DETAIL2" | pp
  echo

  echo "10. Delete notification (soft delete)..."
  DEL=$(curl -s -b "$COOKIE_FILE" -X DELETE "$API_URL/notifications/$NOTIFICATION_ID")
  echo "$DEL" | pp
  echo
else
  echo "⚠️  No unread notifications available. Skipping read/delete tests."
  echo
fi

echo "11. Mark all MESSAGE_RECEIVED notifications as read..."
READ_ALL=$(curl -s -b "$COOKIE_FILE" -X PATCH "$API_URL/notifications/read-all" \
  -H "Content-Type: application/json" \
  -d '{"type":"MESSAGE_RECEIVED"}')
echo "$READ_ALL" | pp
echo

echo "12. Get updated unread count..."
UNREAD_RESPONSE2=$(curl -s -b "$COOKIE_FILE" -X GET "$API_URL/notifications/unread-count")
echo "$UNREAD_RESPONSE2" | pp
echo

echo "13. Test pagination (page 2, limit 3)..."
PAG=$(curl -s -b "$COOKIE_FILE" -X GET "$API_URL/notifications?page=2&limit=3")
echo "$PAG" | pp
echo

echo "14. Test filtering by priority (URGENT)..."
URG=$(curl -s -b "$COOKIE_FILE" -X GET "$API_URL/notifications?priority=URGENT&limit=5")
echo "$URG" | pp
echo

echo "15. Test filtering by type (BOOKING_CREATED)..."
BTYPE=$(curl -s -b "$COOKIE_FILE" -X GET "$API_URL/notifications?type=BOOKING_CREATED&limit=5")
echo "$BTYPE" | pp
echo

echo "16. Test ordering by priority (asc)..."
ORD=$(curl -s -b "$COOKIE_FILE" -X GET "$API_URL/notifications?orderBy=priority&order=asc&limit=5")
echo "$ORD" | pp
echo

rm -f "$COOKIE_FILE"
echo "===================================="
echo "✅ Notification API E2E Test Complete (no jq)"
echo "===================================="
