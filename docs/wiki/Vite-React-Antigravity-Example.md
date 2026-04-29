# Build a Full-Stack React App with FormCMS and AI Agents (Antigravity, Cursor, Codex)

> **Step-by-step config is shown for Antigravity**, but the MCP server and skill file work with any MCP-compatible agent — **Cursor, Codex, Claude Desktop, and more**. See Step 2 for your agent's setup.

FormCMS is a fully headless CMS with a built-in **MCP server** — so AI agents like Antigravity, Cursor, and Codex can design your schema, seed data, and deploy your React app through tool calls, all without leaving the chat.

This guide walks you through the full setup.

## 1. Start the FormCMS Backend

Run the all-in-one Docker image. It exposes port `5000` for everything: the REST API, the admin portal, and the MCP server.

```bash
docker run -d \
  --name formcms \
  -p 5000:5000 \
  -v formcms_data:/data \
  -e DATABASE_PROVIDER=0 \
  -e "CONNECTION_STRING=Data Source=/data/cms.db" \
  -e FORMCMS_DATA_PATH=/data \
  -e "DATABASE_URL=file:/data/mate.db" \
  jaike/formcms-mono:latest
```

| Service | URL |
|---------|-----|
| Admin portal (FormMate) | `http://localhost:5000/mate` |
| REST API | `http://localhost:5000/api/` |
| **MCP server (SSE)** | **`http://localhost:5000/mcp/sse`** |

## 2. Connect Antigravity to FormCMS

> **This section is Antigravity-specific.** If you use **Cursor**, **Codex**, or **Claude Desktop**, the FormCMS MCP server still works — connect them to `http://localhost:5000/mcp/sse` using their own MCP config format. The skill file (Step 2b) can be added to any agent that supports context/rule files.

### 2a. Add the MCP Server

Create (or edit) `antigravity.yaml` at the **root of your project** and add the FormCMS MCP server:

```yaml
# antigravity.yaml
mcpServers:
  formcms:
    type: sse
    url: http://localhost:5000/mcp/sse
```

If your FormCMS instance has an API key configured, add the `Authorization` header:

```yaml
mcpServers:
  formcms:
    type: sse
    url: http://localhost:5000/mcp/sse
    headers:
      Authorization: "Bearer <your-api-key>"
```

To generate an API key:
1. Open FormMate at `http://localhost:5000/mate`
2. Go to **Settings** → **API Key Configuration**
3. Click **Generate** to create a key, then **Save Changes**
4. Copy the key and paste it into the `Authorization` header above

Antigravity will pick up this config automatically when you open the project. Call `get_server_info` first to confirm the connection and retrieve the backend base URL.

### 2b. Add the FormCMS React App Skill

The FormCMS skill file teaches Antigravity the REST API patterns, authentication flow, relationship endpoints, and SPA deployment workflow — so you don't have to explain them in every prompt.

Copy the skill file into your project:

```bash
# From your project root
mkdir -p .agent/skills/formcms-react-app
curl -o .agent/skills/formcms-react-app/SKILL.md \
  https://raw.githubusercontent.com/formcms/formmate/main/packages/ai-skills/gemini/formcms-react-app/SKILL.md
```

Or copy it manually from the FormCMS repo:
```
packages/ai-skills/gemini/formcms-react-app/SKILL.md
  → .agent/skills/formcms-react-app/SKILL.md
```

Your project structure should look like:
```
my-app/
├── antigravity.yaml          ← MCP server config
├── .agent/
│   └── skills/
│       └── formcms-react-app/
│           └── SKILL.md      ← FormCMS API patterns & rules
├── src/
└── ...
```

Antigravity automatically loads all skill files under `.agent/skills/` — no extra config needed.

### Available MCP Tools

| Tool | Purpose |
|------|---------|
| `get_server_info` | Get the FormCMS base URL — **call this first** |
| `define_entity` | Create or update entity schemas (attributes + relationships) |
| `list_schemas` / `get_schema` | Inspect existing schemas |
| `get_graphql_sdl` | Fetch the GraphQL SDL before writing queries |
| `save_query` / `run_query` | Create and execute named queries |
| `insert_entity` / `update_entity` | Seed or manage data |
| `deploy_spa` | Deploy your built React app directly to FormCMS |
| `list_spas` | List all deployed SPAs |

## 3. Set Up the Project, Proxy, and Schema

Just prompt your agent:

```
"Create a Vite + React + TypeScript app connected to FormCMS at http://localhost:5000
 with a blog schema: posts (title, body, cover image), authors, categories (many-to-one),
 and tags (many-to-many). Seed some sample data."
```

The agent will scaffold the project, configure the Vite proxy (calling `get_server_info` for the base URL), call `define_entity` for each entity, and seed sample data via `insert_entity`.

## 6. Build the React Frontend

With the backend schema in place, start the dev server and ask your agent to build the UI:

```bash
npm run dev
```

Example prompts:
- *"Build a `PostList` component that fetches from `/api/entities/post` and displays cards in a responsive grid."*
- *"Create a `PostDetail` page that reads the post ID from the URL, fetches `/api/entities/post/{id}`, and renders the cover image, title, body, and category."*
- *"Add a category filter sidebar to `PostList` that calls `/api/entities/category` and filters posts client-side."*

> **Tip:** The agent already knows your schema from the MCP tools — it can build components with the correct field names and relationship structures without you having to describe them.

## 7. Deploy your React App via MCP

When you're ready to publish, ask your agent to deploy:

```
"Build and deploy my app as the home page on FormCMS."
```

The agent will:
1. Run `npm run build` to produce the `dist/` directory
2. Zip and base64-encode the output
3. Call `deploy_spa` with `urlPath: "/"` to serve it from the FormCMS root
4. Call `list_spas` to confirm it's live

You can also do it manually:
1. `npm run build`
2. Zip the **contents** of `dist/` (so `index.html` is at the zip root)
3. Open **http://localhost:5000/mate** → **Settings** → **Frontend Apps** → Upload

Your entire full-stack application — frontend and backend APIs — is now served from a single FormCMS container.

## 8. Iterate Rapidly

```
Need a new feature?
  → Ask the agent to call define_entity to add fields or a new entity.

Need to show it?
  → Ask the agent to update the React components.

Ready to ship?
  → Ask the agent to build and call deploy_spa.
```

This clean separation — **MCP tools set up the backend**, **React components consume the APIs** — gives you a true AI-powered full-stack workflow with zero context switching.
