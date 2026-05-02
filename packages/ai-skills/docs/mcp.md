## MCP Server (Dev-time Tools)

FormCMS ships with an MCP server that exposes **dev-time tools** — things you call *once* during setup, not in your app code. When your AI agent is connected to the FormCMS MCP server, use these tools directly instead of writing raw API calls.

> **Rule of thumb:** Use MCP tools to *set up* FormCMS. Use the REST API patterns below to *build your app*.

### Available MCP Tools

| Tool | Category | Purpose |
|------|----------|---------|
| `login_to_formcms` | Auth | **Authenticate this MCP session** — opens a browser login page; waits up to 120 s for the user to complete login. Call this first if tools return 401. |
| `get_login_url` | Auth | Returns the login URL immediately without waiting — useful when the agent should display the URL to the user before blocking |
| `logout_from_formcms` | Auth | Clears the session cookie for the current MCP connection |
| `get_server_info` | System | **Get the FormCMS base URL** — call this first before writing any config. Also describes the SPA hosting feature. |
| `deploy_spa` | System | **Deploy a Single Page App** — uploads a base64-encoded ZIP of your build output (e.g. `dist/`) and serves it at a custom URL path |
| `list_spas` | System | List all currently installed SPAs and their URL paths |
| `define_entity` | Schema | Create or update entity schemas (attributes + relationships) |
| `list_schemas` | Schema | List all entity schemas |
| `get_schema` | Schema | Get a single entity schema by name |
| `delete_schema` | Schema | Delete a schema by ID |
| `get_graphql_sdl` | Query | Get the full GraphQL SDL — required before writing queries |
| `save_query` | Query | Create or update a named query |
| `run_query` | Query | Execute a named query and return data |
| `list_queries` | Query | List all named queries |
| `insert_entity` | Data | Insert a record (useful for seeding data) |
| `update_entity` | Data | Update a record |
| `list_entities` | Data | List records with filters |

### Typical setup workflow

When starting a new FormCMS-backed app, the agent should:

1. **Authenticate** — call `get_login_url` to get the login URL, share it with the user, then call `login_to_formcms` and wait for them to log in. *(Skip if using an API key — see Authentication below.)*
2. **Call `get_server_info`** — get the `formcmsBaseUrl` (e.g. `http://localhost:5000`), use it as the proxy target in `vite.config.ts`
3. **Call `define_entity`** — design entities and relationships (the tool guides the payload shape)
4. **Call `get_schema`** or `list_schemas` — verify the schema was applied correctly
5. **Call `get_graphql_sdl`** then **`save_query`** — create named queries for data-fetching
6. **Call `insert_entity`** — seed initial/demo data if needed
7. **Write the React app** — using the runtime API patterns documented below

### SPA hosting workflow

FormCMS can serve arbitrary Single Page Applications at custom URL paths — useful for hosting a React/Vue/Svelte app directly from the FormCMS server without a separate static host.

1. **Build your app** — run `npm run build` to produce the `dist/` (or `build/`) directory
2. **Zip the output** — create a ZIP of the build folder contents (not the folder itself)
3. **Base64-encode the ZIP** — convert the ZIP bytes to a base64 string
4. **Call `deploy_spa`** — pass `zipBase64`, `zipFilename`, `urlPath` (e.g. `/blog`), and `directory` (a unique server-side folder name)
5. **Verify** — call `list_spas` to confirm the SPA is registered and accessible

> **Note:** The SPA will be served at the exact `urlPath` you specify. Deep-link routes (HTML5 history mode) are handled by FormCMS automatically — all sub-paths fall back to `index.html`.

### MCP server URL

The MCP server is available at `/mcp/` (proxied via Vite in development, or via nginx in Docker):

```
/mcp/sse   ← SSE transport (used by most MCP clients)
```

Configure your MCP client (e.g. Cursor, Claude Desktop, Gemini CLI) to point at:
```
http://localhost:<Port>/mcp/sse
```

### Authentication

The MCP server supports two authentication modes:

#### Browser login (recommended for interactive use)

Each MCP client session authenticates independently. The session cookie is stored in memory only — it is cleared when the MCP server restarts or the client disconnects.

```
1. Call get_login_url  → returns http://localhost:<Port>/mcp/login?sessionId=<id>
2. Share the URL with the user — they open it in their browser
3. Call login_to_formcms → blocks until the user completes login (up to 120 s)
4. All subsequent tool calls in this session are authenticated automatically
```

> **If the server is remote**, the user opens the URL on their own machine — the login page is served by the MCP server and accessible over the network.

#### API key (for testing and CI)

Pass an API key as a standard Bearer token in the MCP client configuration. This takes priority over a session cookie.

```json
// Example: Claude Desktop config (claude_desktop_config.json)
{
  "mcpServers": {
    "formcms": {
      "url": "http://localhost:3002/mcp/sse",
      "headers": {
        "Authorization": "Bearer <your-api-key>"
      }
    }
  }
}
```

The API key is forwarded to FormCMS as the `X-Api-Key` header on every request.

---
