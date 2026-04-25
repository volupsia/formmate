# FormCMS MCP Server

This package implements the Model Context Protocol (MCP) server for FormCMS. It provides AI agents with tools to interact with the FormCMS API, execute queries, and fetch API design specifications.

## Endpoints

- `GET /mcp/health`: Health check endpoint.
- `GET /mcp/admin`: Live Logs UI for inspecting JSON-RPC traffic.
- `GET /mcp/sse`: Establishes an SSE connection for the MCP protocol.
- `POST /mcp/messages?sessionId=...`: Receives JSON-RPC messages from MCP clients.

## Request Context & Headers

The HTTP transport layer is configured to extract request context (like authentication and base URL) and pass it down to the MCP tools. This ensures that tools like `get_server_info` return the correct context-aware data, which is especially useful when the server is deployed behind a proxy.

When calling the server, you should pass the following headers to the `POST /mcp/messages` request:
- `Authorization`: Bearer token (API Key).
- `X-Forwarded-Host`: The dynamic domain/host of the FormCMS instance.
- `X-Forwarded-Proto`: HTTP protocol (`http` or `https`).

## Testing via Curl

Because the standard MCP HTTP transport uses **Server-Sent Events (SSE)**, standard HTTP `POST` requests will only return a `202 Accepted` status. The actual JSON-RPC response is streamed asynchronously over the active SSE connection.

### Automated Test Script

We provide a bash script `test-curl.sh` which automatically orchestrates the SSE stream, JSON-RPC initialization, and tool execution.

```bash
# 1. Start the server
npm run dev

# 2. Run the test script
bash test-curl.sh
```

### Manual Testing (Two Terminals)

If you need to test the protocol manually, you will need two terminal windows.

**Terminal 1: Start the SSE connection**
```bash
# Keep this terminal open to receive streamed responses
curl -N http://localhost:3002/mcp/sse
```
*Wait for the `event: endpoint` message to appear and copy the `sessionId` from the URL.*

**Terminal 2: Send JSON-RPC Messages**

1. **Initialize** the connection:
```bash
curl -s -X POST "http://localhost:3002/mcp/messages?sessionId=<SESSION_ID>" \
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
  }'

# Confirm initialization
curl -s -X POST "http://localhost:3002/mcp/messages?sessionId=<SESSION_ID>" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "notifications/initialized"
  }'
```

2. **Call a tool** (e.g., `get_server_info`) and provide the necessary headers:
```bash
curl -s -X POST "http://localhost:3002/mcp/messages?sessionId=<SESSION_ID>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer my-test-key" \
  -H "X-Forwarded-Host: my-custom-domain.local" \
  -H "X-Forwarded-Proto: https" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get_server_info",
      "arguments": {}
    }
  }'
```

After executing the tool call in Terminal 2, look back at **Terminal 1** to view the streamed JSON response containing the tool's result.
