#!/bin/bash
# Notification API E2E Test Script
# Usage: ./scripts/test-notifications.sh

set -e  # Exit on error

API_URL="http://localhost:4005/api/v2"
COOKIE_FILE="cookies.txt"

echo "===================================="
echo "Notification API E2E Test"
echo "===================================="
echo ""

# Clean up old cookie file
rm -f $COOKIE_FILE

echo "1. Login as admin@j1.com..."
LOGIN_RESPONSE=$(curl -s -c $COOKIE_FILE -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@j1.com","password":"pass1234"}')

echo "$LOGIN_RESPONSE" | jq .
echo ""

# Extract user ID for reference
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.id')
echo "User ID: $USER_ID"
echo ""

echo "2. Get notification list (first 5)..."
curl -s -b $COOKIE_FILE -X GET "$API_URL/notifications?limit=5" | jq .
echo ""

echo "3. Get unread notification count..."
curl -s -b $COOKIE_FILE -X GET "$API_URL/notifications/unread-count" | jq .
echo ""

echo "4. Get notification preferences..."
PREFS_RESPONSE=$(curl -s -b $COOKIE_FILE -X GET "$API_URL/notifications/preferences")
echo "$PREFS_RESPONSE" | jq .
echo ""

echo "5. Update notification preferences (disable email)..."
curl -s -b $COOKIE_FILE -X PUT "$API_URL/notifications/preferences" \
  -H "Content-Type: application/json" \
  -d '{"emailEnabled":false,"smsEnabled":true}' | jq .
echo ""

echo "6. Get first notification ID..."
FIRST_NOTIFICATION=$(curl -s -b $COOKIE_FILE -X GET "$API_URL/notifications?limit=1&isRead=false")
echo "$FIRST_NOTIFICATION" | jq .
echo ""

NOTIFICATION_ID=$(echo "$FIRST_NOTIFICATION" | jq -r '.data[0].id // empty')

if [ -n "$NOTIFICATION_ID" ] && [ "$NOTIFICATION_ID" != "null" ]; then
  echo "Notification ID: $NOTIFICATION_ID"
  echo ""

  echo "7. Get notification by ID..."
  curl -s -b $COOKIE_FILE -X GET "$API_URL/notifications/$NOTIFICATION_ID" | jq .
  echo ""

  echo "8. Mark notification as read..."
  curl -s -b $COOKIE_FILE -X PATCH "$API_URL/notifications/$NOTIFICATION_ID/read" | jq .
  echo ""

  echo "9. Verify notification is now read..."
  curl -s -b $COOKIE_FILE -X GET "$API_URL/notifications/$NOTIFICATION_ID" | jq .
  echo ""

  echo "10. Delete notification (soft delete)..."
  curl -s -b $COOKIE_FILE -X DELETE "$API_URL/notifications/$NOTIFICATION_ID" | jq .
  echo ""
else
  echo "⚠️  No unread notifications found. Skipping read/delete tests."
  echo ""
fi

echo "11. Mark all MESSAGE_RECEIVED notifications as read..."
curl -s -b $COOKIE_FILE -X PATCH "$API_URL/notifications/read-all" \
  -H "Content-Type: application/json" \
  -d '{"type":"MESSAGE_RECEIVED"}' | jq .
echo ""

echo "12. Get updated unread count..."
curl -s -b $COOKIE_FILE -X GET "$API_URL/notifications/unread-count" | jq .
echo ""

echo "13. Test pagination (page 2, limit 3)..."
curl -s -b $COOKIE_FILE -X GET "$API_URL/notifications?page=2&limit=3" | jq .
echo ""

echo "14. Test filtering by priority (URGENT)..."
curl -s -b $COOKIE_FILE -X GET "$API_URL/notifications?priority=URGENT&limit=5" | jq .
echo ""

echo "15. Test filtering by type (BOOKING_CREATED)..."
curl -s -b $COOKIE_FILE -X GET "$API_URL/notifications?type=BOOKING_CREATED&limit=5" | jq .
echo ""

echo "16. Test ordering by priority (asc)..."
curl -s -b $COOKIE_FILE -X GET "$API_URL/notifications?orderBy=priority&order=asc&limit=5" | jq .
echo ""

# Clean up
rm -f $COOKIE_FILE

echo "===================================="
echo "✅ Notification API E2E Test Complete"
echo "===================================="
