## MCP Server (Dev-time Tools)

FormCMS ships with an MCP server that exposes **dev-time tools** — things you call *once* during setup, not in your app code. When your AI agent is connected to the FormCMS MCP server, use these tools directly instead of writing raw API calls.

> **Rule of thumb:** Use MCP tools to *set up* FormCMS. Use the REST API patterns below to *build your app*.

### Available MCP Tools

| Tool | Purpose |
|------|---------|
| `get_server_info` | **Get the FormCMS base URL** — call this first before writing any config |
| `define_entity` | Create or update entity schemas (attributes + relationships) |
| `list_schemas` | List all entity schemas |
| `get_schema` | Get a single entity schema by name |
| `delete_schema` | Delete a schema by ID |
| `get_graphql_sdl` | Get the full GraphQL SDL — required before writing queries |
| `save_query` | Create or update a named query |
| `run_query` | Execute a named query and return data |
| `list_queries` | List all named queries |
| `insert_entity` | Insert a record (useful for seeding data) |
| `update_entity` | Update a record |
| `list_entities` | List records with filters |

### Typical setup workflow

When starting a new FormCMS-backed app, the agent should:

1. **Call `get_server_info`** — get the `formcmsBaseUrl` (e.g. `http://localhost:5000`), use it as the proxy target in `vite.config.ts`
2. **Call `define_entity`** — design entities and relationships (the tool guides the payload shape)
3. **Call `get_schema`** or `list_schemas` — verify the schema was applied correctly
4. **Call `get_graphql_sdl`** then **`save_query`** — create named queries for data-fetching
5. **Call `insert_entity`** — seed initial/demo data if needed
6. **Write the React app** — using the runtime API patterns documented below

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
