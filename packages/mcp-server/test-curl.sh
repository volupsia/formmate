#!/bin/bash

PORT=3002
HOST="http://localhost:$PORT"

# 1. Start the SSE stream in the background and save its output to a file
echo "Connecting to SSE stream..."
curl -s -N "$HOST/mcp/sse" > sse_output.txt &
SSE_PID=$!

sleep 1

ENDPOINT=$(grep -o "/mcp/messages?sessionId=[a-zA-Z0-9-]*" sse_output.txt | head -n 1)

if [ -z "$ENDPOINT" ]; then
  echo "Failed to get session ID from SSE stream."
  cat sse_output.txt
  kill $SSE_PID
  exit 1
fi

echo "Session Endpoint: $ENDPOINT"
MESSAGE_URL="$HOST$ENDPOINT"

# 2. Send 'initialize' request
echo -e "\nSending initialize request..."
curl -s -X POST "$MESSAGE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": { "name": "curl-test", "version": "1.0.0" }
    }
  }' > /dev/null

# 3. Send 'notifications/initialized'
echo -e "\nSending initialized notification..."
curl -s -X POST "$MESSAGE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "notifications/initialized"
  }' > /dev/null

# 4. Call the 'get_server_info' tool (with custom headers to test baseUrl resolution)
echo -e "\nCalling get_server_info tool..."
curl -s -X POST "$MESSAGE_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-api-key" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get_server_info",
      "arguments": {}
    }
  }'

kill $SSE_PID
echo -e "\n--- SSE Stream Output ---"
cat sse_output.txt

