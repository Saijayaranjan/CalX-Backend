#!/bin/bash
# =============================================================================
# CalX Backend API - cURL Examples
# =============================================================================
# Replace variables with actual values before running

BASE_URL="http://localhost:3000"
JWT_TOKEN="your-jwt-token"
DEVICE_TOKEN="dev_tok_your-device-token"
DEVICE_ID="calx_TEST01"

# =============================================================================
# Health Check
# =============================================================================

echo "=== Health Check ==="
curl -X GET "$BASE_URL/health"

# =============================================================================
# User Registration
# =============================================================================

echo "\n\n=== Register User ==="
curl -X POST "$BASE_URL/web/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# =============================================================================
# User Login
# =============================================================================

echo "\n\n=== Login User ==="
curl -X POST "$BASE_URL/web/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# =============================================================================
# Device Binding - Step 1: Request Bind Code
# =============================================================================

echo "\n\n=== Request Bind Code ==="
curl -X POST "$BASE_URL/device/bind/request" \
  -H "Content-Type: application/json" \
  -d "{
    \"device_id\": \"$DEVICE_ID\"
  }"

# =============================================================================
# Device Binding - Step 2: User Confirms (use JWT token)
# =============================================================================

echo "\n\n=== Confirm Bind (Web) ==="
curl -X POST "$BASE_URL/web/bind/confirm" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "bind_code": "XXXX"
  }'

# =============================================================================
# Device Binding - Step 3: Device Polls for Token
# =============================================================================

echo "\n\n=== Check Bind Status ==="
curl -X GET "$BASE_URL/device/bind/status?device_id=$DEVICE_ID"

# =============================================================================
# Device Heartbeat
# =============================================================================

echo "\n\n=== Send Heartbeat ==="
curl -X POST "$BASE_URL/device/heartbeat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DEVICE_TOKEN" \
  -d '{
    "battery_percent": 85,
    "power_mode": "NORMAL",
    "firmware_version": "1.0.0"
  }'

# =============================================================================
# Get Device Settings
# =============================================================================

echo "\n\n=== Get Settings ==="
curl -X GET "$BASE_URL/device/settings" \
  -H "Authorization: Bearer $DEVICE_TOKEN"

# =============================================================================
# Send Chat Message (from Device)
# =============================================================================

echo "\n\n=== Send Chat (Device) ==="
curl -X POST "$BASE_URL/device/chat/send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DEVICE_TOKEN" \
  -d '{
    "content": "Hello from device!"
  }'

# =============================================================================
# Send Chat Message (from Web)
# =============================================================================

echo "\n\n=== Send Chat (Web) ==="
curl -X POST "$BASE_URL/web/chat/send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{
    \"device_id\": \"$DEVICE_ID\",
    \"content\": \"Hello from web dashboard!\"
  }"

# =============================================================================
# Get Chat Messages (Device)
# =============================================================================

echo "\n\n=== Get Chat Messages ==="
curl -X GET "$BASE_URL/device/chat" \
  -H "Authorization: Bearer $DEVICE_TOKEN"

# =============================================================================
# Get Chat Messages Since Timestamp
# =============================================================================

echo "\n\n=== Get Chat Messages Since ==="
curl -X GET "$BASE_URL/device/chat?since=2024-01-01T00:00:00.000Z" \
  -H "Authorization: Bearer $DEVICE_TOKEN"

# =============================================================================
# Upload File (from Web)
# =============================================================================

echo "\n\n=== Upload File ==="
curl -X POST "$BASE_URL/web/file/upload" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{
    \"device_id\": \"$DEVICE_ID\",
    \"content\": \"This is my note content.\nLine 2.\nLine 3.\"
  }"

# =============================================================================
# Get File (Device)
# =============================================================================

echo "\n\n=== Get File ==="
curl -X GET "$BASE_URL/device/file" \
  -H "Authorization: Bearer $DEVICE_TOKEN"

# =============================================================================
# AI Query
# =============================================================================

echo "\n\n=== AI Query ==="
curl -X POST "$BASE_URL/device/ai/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DEVICE_TOKEN" \
  -d '{
    "prompt": "What is the square root of 144?"
  }'

# =============================================================================
# Continue AI Response (if has_more=true)
# =============================================================================

echo "\n\n=== Continue AI Response ==="
curl -X GET "$BASE_URL/device/ai/continue?cursor=query_xxx" \
  -H "Authorization: Bearer $DEVICE_TOKEN"

# =============================================================================
# Update Device Settings (from Web)
# =============================================================================

echo "\n\n=== Update Settings ==="
curl -X POST "$BASE_URL/web/device/settings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{
    \"device_id\": \"$DEVICE_ID\",
    \"text_size\": \"LARGE\",
    \"screen_timeout\": 60,
    \"ai_config\": {
      \"provider\": \"OPENAI\",
      \"model\": \"gpt-4o-mini\",
      \"temperature\": 0.5
    }
  }"

# =============================================================================
# Get Activity Log
# =============================================================================

echo "\n\n=== Get Activity Log ==="
curl -X GET "$BASE_URL/web/device/$DEVICE_ID/activity" \
  -H "Authorization: Bearer $JWT_TOKEN"

# =============================================================================
# Check for Updates
# =============================================================================

echo "\n\n=== Check for Updates ==="
curl -X GET "$BASE_URL/device/update/check" \
  -H "Authorization: Bearer $DEVICE_TOKEN"

# =============================================================================
# Download Firmware (requires battery > 30%)
# =============================================================================

echo "\n\n=== Download Firmware ==="
curl -X GET "$BASE_URL/device/update/download?version=1.0.1" \
  -H "Authorization: Bearer $DEVICE_TOKEN"

# =============================================================================
# Trigger OTA Update (from Web)
# =============================================================================

echo "\n\n=== Trigger OTA ==="
curl -X POST "$BASE_URL/web/device/update" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{
    \"device_id\": \"$DEVICE_ID\",
    \"firmware_id\": \"firmware-uuid-here\"
  }"

echo "\n\n=== Done ==="
