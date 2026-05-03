## MCP Server (Dev-time Tools)

You have access to FormCMS MCP tools for **dev-time setup only**. Use these tools to define schemas, create queries, and seed data — do not write raw API calls for these tasks. Never call MCP tools from application code.

> **Rule:** Use MCP tools to *set up* FormCMS. Use the REST API (documented in Part 2) to *build the app*.

### Dev-time vs Runtime

MCP tools are only available to you during development. They cannot be called from the React app at runtime. Follow this table strictly:

| Task | Dev-time (MCP tools) | Runtime (app code — REST API) |
|------|---------------------|-------------------------------|
| **Authentication** | `login_to_formcms` / `get_login_url` (authenticates your MCP session) | `POST /api/login`, `GET /api/me`, cookie-based sessions |
| **Define schemas** | `define_entity` | ❌ Not available — schemas are set up once during development |
| **Inspect schemas** | `list_schemas`, `get_schema` | ❌ Do not fetch schemas at runtime — bake the knowledge into TypeScript types |
| **Create named queries** | `get_graphql_sdl` → `save_query` | ❌ Queries are defined at dev-time only |
| **Execute named queries** | `run_query` (to verify results) | `GET /api/queries/{queryName}` |
| **Seed / test data** | `insert_entity`, `update_entity`, `list_entities` | `POST /api/entities/{entity}/insert`, etc. |
| **CRUD operations** | (available, but use mainly for seeding) | Entity API endpoints — this is what the app uses |
| **Deploy SPA** | `deploy_spa`, `list_spas` | ❌ Not available at runtime |
| **File uploads** | ❌ Use the REST API | `POST /api/assets` (multipart) |

> [!IMPORTANT]
> **Never generate code that calls MCP tools.** MCP tools run in your dev session only. The React app must use the REST API endpoints documented in Part 2.

### Available MCP Tools

| Tool | Category | Purpose |
|------|----------|---------|
| `login_to_formcms` | Auth | **Authenticate your MCP session** — opens a browser login page; waits up to 120 s for the user to complete login. Call this first if tools return 401. |
| `get_login_url` | Auth | Returns the login URL immediately without waiting — use this when you want to display the URL to the user before blocking |
| `logout_from_formcms` | Auth | Clears the session cookie for the current MCP connection |
| `get_server_info` | System | **Get the FormCMS base URL** — call this first before writing any config. Also describes the SPA hosting feature. |
| `deploy_spa` | System | **Deploy a Single Page App** — uploads a base64-encoded ZIP of your build output (e.g. `dist/`) and serves it at a custom URL path |
| `list_spas` | System | List all currently installed SPAs and their URL paths |
| `define_entity` | Schema | Create or update entity schemas (attributes + relationships) |
| `list_schemas` | Schema | List all entity schemas |
| `get_schema` | Schema | Get a single entity schema by name |
| `delete_schema` | Schema | Delete a schema by ID |
| `get_graphql_sdl` | Query | Get the full GraphQL SDL — you need this before writing queries |
| `save_query` | Query | Create or update a named query |
| `run_query` | Query | Execute a named query and return data |
| `list_queries` | Query | List all named queries |
| `insert_entity` | Data | Insert a record (use for seeding data) |
| `update_entity` | Data | Update a record |
| `list_entities` | Data | List records with filters |

### Typical setup workflow

When starting a new FormCMS-backed app, follow this order:

1. **Authenticate** — call `get_login_url` to get the login URL, share it with the user, then call `login_to_formcms` and wait for them to log in. *(Skip if using an API key.)*
2. **Call `get_server_info`** — get the `formcmsBaseUrl` (e.g. `http://localhost:5000`), use it as the proxy target in `vite.config.ts`
3. **Call `define_entity`** — design entities and relationships (the tool guides the payload shape)
4. **Call `get_schema`** or `list_schemas` — verify the schema was applied correctly
5. **Call `get_graphql_sdl`** then **`save_query`** — create named queries for data-fetching
6. **Call `insert_entity`** — seed initial/demo data if needed
7. **Write the React app** — using the runtime API patterns in Part 2

### SPA hosting workflow

You can deploy the built React app directly to FormCMS so it serves the SPA at a custom URL path. Follow these steps:

1. **Build the app** — run `npm run build` to produce the `dist/` directory
2. **Zip the output** — create a ZIP of the build folder contents (not the folder itself)
3. **Base64-encode the ZIP** — convert the ZIP bytes to a base64 string
4. **Call `deploy_spa`** — pass `zipBase64`, `zipFilename`, `urlPath` (e.g. `/blog`), and `directory` (a unique server-side folder name)
5. **Verify** — call `list_spas` to confirm the SPA is registered and accessible

> Deep-link routes (HTML5 history mode) are handled automatically — all sub-paths fall back to `index.html`.

### MCP server URL

Point your MCP client at:
```
http://localhost:<Port>/mcp/sse
```

### MCP Session Authentication

This section is about authenticating **your MCP session** so you can call dev-time tools. This is NOT about end-user login — see "App User Authentication (Runtime)" in Part 2.

The MCP server supports two authentication modes:

#### Browser login (recommended for interactive use)

Each MCP client session authenticates independently. The session cookie is stored in memory only — it is cleared when the MCP server restarts or the client disconnects.

```
1. Call get_login_url  → returns http://localhost:<Port>/mcp/login?sessionId=<id>
2. Share the URL with the user — they open it in their browser
3. Call login_to_formcms → blocks until the user completes login (up to 120 s)
4. All subsequent tool calls in this session are authenticated automatically
```

> If the server is remote, the user opens the URL on their own machine.

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
