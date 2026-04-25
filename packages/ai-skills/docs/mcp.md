## MCP Server (Dev-time Tools)

FormCMS ships with an MCP server that exposes **dev-time tools** — things you call *once* during setup, not in your app code. When your AI agent is connected to the FormCMS MCP server, use these tools directly instead of writing raw API calls.

> **Rule of thumb:** Use MCP tools to *set up* FormCMS. Use the REST API patterns below to *build your app*.

### Available MCP Tools

| Tool | Category | Purpose |
|------|----------|---------|
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

1. **Call `get_server_info`** — get the `formcmsBaseUrl` (e.g. `http://localhost:5000`), use it as the proxy target in `vite.config.ts`
2. **Call `define_entity`** — design entities and relationships (the tool guides the payload shape)
3. **Call `get_schema`** or `list_schemas` — verify the schema was applied correctly
4. **Call `get_graphql_sdl`** then **`save_query`** — create named queries for data-fetching
5. **Call `insert_entity`** — seed initial/demo data if needed
6. **Write the React app** — using the runtime API patterns documented below

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

---
