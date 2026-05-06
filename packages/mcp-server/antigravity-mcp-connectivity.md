# FormCMS MCP Server: Antigravity Connectivity Guide

This document explains the technical challenges of connecting the Antigravity IDE agent to the FormCMS MCP server, why standard HTTP Server-Sent Events (SSE) connections fail when configured directly, and how the current architecture resolves these issues for both local and cloud environments.

## 1. Why Antigravity Cannot Connect to the Standard FormCMS MCP Server

When attempting to connect Antigravity to the FormCMS MCP server using the `serverURL` configuration (which points to an Nginx proxy over Docker), the connection consistently fails with the error:

```
formcms: calling "initialize": sending "initialize": failed to connect (session ID: ): session not found
```

### The Root Cause
The official Model Context Protocol (MCP) specifies two primary transports: **STDIO** and **SSE**. 

However, the Antigravity client has a known quirk in how it parses the `serverURL` configuration:
1. **Aggressive Stateless POST:** Instead of initiating an HTTP `GET` request to establish an SSE stream and waiting for the `endpoint` event (which provides the required `sessionId`), the Antigravity client treats `serverURL` as a stateless HTTP JSON-RPC endpoint.
2. **Bypassing the Handshake:** It immediately sends a `POST` request to the base `/mcp/sse` endpoint.
3. **The 404 Fallback Error:** Because the Node.js MCP server strictly expects a `sessionId` parameter in the URL for POST messages (e.g., `/mcp/messages/1234?sessionId=1234`), the raw POST to the base `/mcp/sse` URL returns an Express `404 Not Found` HTML page. 
4. **Misleading Error Messages:** The Antigravity Go client parses the 404 status code and generates a hardcoded error (`session not found`), injecting a blank session ID `(session ID: )` because it never actually negotiated one.

Because of this rigid client behavior, connecting Antigravity directly to an SSE endpoint sitting behind an Nginx proxy will fail without a local bridge.

## 2. The `supergateway` Bridge Solution (Current Approach)

The simplest and most reliable fix is to use the third-party [`supergateway`](https://github.com/supercorp-ai/supergateway) tool as a local bridge. It runs a tiny local process that:
1. Receives STDIO from Antigravity (which it handles natively and reliably).
2. Properly executes the full SSE handshake (GET → `endpoint` event → session ID) against the FormCMS MCP server.
3. Proxies JSON-RPC messages bidirectionally.

### Current Configuration (`~/.gemini/antigravity/mcp_config.json`)

```json
{
  "mcpServers": {
    "formcms": {
      "command": "npx",
      "args": [
        "-y",
        "supergateway",
        "--sse",
        "http://localhost:5000/mcp/sse",
        "--header",
        "Authorization: Bearer <your-api-key>"
      ]
    }
  }
}
```

### Why It Works
1. **No session ID issues:** `supergateway` correctly performs the SSE handshake and extracts the `sessionId` before forwarding any messages.
2. **API key auth:** The `--header` flag passes `Authorization: Bearer <key>` on every request. The MCP server extracts the key and forwards it to FormCMS as `X-Api-Key`.
3. **Zero install:** `npx -y` downloads `supergateway` on first run automatically.
4. **No Docker dependency:** Works directly against the Nginx endpoint (`localhost:5000`) — no `docker exec` needed.

### Generating an API Key

Generate a key at: **FormMate → Settings → API Key Configuration → Generate**

> After updating the config, reload Antigravity: `Cmd+Shift+P` → `Developer: Reload Window`

## 3. Remote Cloud Deployments

The same `supergateway` pattern works for cloud deployments — just change the SSE URL:

```json
{
  "mcpServers": {
    "formcms": {
      "command": "npx",
      "args": [
        "-y",
        "supergateway",
        "--sse",
        "https://api.my-domain.com/mcp/sse",
        "--header",
        "Authorization: Bearer <your-api-key>"
      ]
    }
  }
}
```

## 4. How Other Cloud MCP Servers (Like Supabase) Work

You might wonder: *If FormCMS requires a local bridge to connect to a cloud deployment, how do massive platforms like Supabase handle MCP? Do they use SSE?*

The answer is **no, they also completely avoid SSE for IDE configurations.**

The vast majority of the MCP ecosystem (99%+) operates exclusively on STDIO because it completely bypasses the complexities of HTTP networking, proxies, and client-specific bugs (like Antigravity's `serverURL` quirks).

### The Supabase Architecture Example
Supabase recently released their official MCP integration (`@supabase/mcp-server-supabase`). Instead of hosting an SSE endpoint on their cloud infrastructure, they provide a lightweight NPM package. 

When a user wants to connect their Antigravity or Claude IDE to a Supabase Cloud database, they configure their IDE to run the NPM package locally using STDIO:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-key"
      }
    }
  }
}
```

**How the data flows:**
1. The IDE executes the `npx` command on the user's local Mac.
2. A tiny local Node.js process starts up.
3. The IDE communicates with this local process flawlessly over **STDIO**.
4. The local process then uses standard PostgreSQL database connections and REST APIs across the internet to communicate with the Supabase Cloud.

By keeping the MCP Server process running locally and bridging over standard protocols to the cloud, platforms like Supabase entirely avoid the need for Server-Sent Events configurations in IDEs. Your FormCMS setup utilizes this exact same proven architecture via `supergateway`.
