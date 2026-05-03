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

### Set the Super Admin Password

### Authentication (choose one)

The MCP server supports two ways to authenticate:

#### Option A — Browser login (no config needed)

Connect your agent to the MCP server with no API key. When your agent first runs, call the `login_to_formcms` tool (or `get_login_url` to get the URL first). A local login page opens in your browser — enter your FormCMS credentials and you're done. The session is stored in memory for that MCP connection.

#### Option B — API key ✅ Preferred

Open **http://localhost:5000/mate** → **Settings** → **API Key Configuration** → **Generate**.

Copy the key and add it to your MCP client config as `Authorization: Bearer <key>`. The MCP server forwards it to FormCMS automatically, so you never need to log in interactively.

> **Important:** After adding the API key to `antigravity.yaml`, reload the VS Code window so Antigravity re-reads the config and reconnects to the MCP server:
> **Command Palette (`Cmd+Shift+P`) → `Developer: Reload Window`**

## 2. Connect Antigravity to FormCMS

> **This section is Antigravity-specific.** If you use **Cursor**, **Codex**, or **Claude Desktop**, the FormCMS MCP server still works — connect them to `http://localhost:5000/mcp/sse` using their own MCP config format.

### Use the starter template (recommended)

Create an empty project folder and drop in the FormCMS agent config in one command:

```bash
# 1. Create an empty project folder
mkdir my-app && cd my-app

# 2. Drop in the FormCMS agent config (antigravity.yaml + AI skill)
npx degit formcms/formmate/starters/vite-react-starter . --force
```

This drops two files into your folder:

| File | Purpose |
|------|---------|
| `antigravity.yaml` | Pre-configured FormCMS MCP server connection |
| `.agent/skills/formcms-react-app/SKILL.md` | Teaches the AI the FormCMS API patterns |

Open the folder in your editor — Antigravity picks up both files automatically.

> **API key (recommended):** To use Option B from Step 1, open `antigravity.yaml` and uncomment the `headers` section, pasting your API key. Then reload the VS Code window (**`Cmd+Shift+P` → `Developer: Reload Window`**) so the updated MCP server config takes effect.

The agent will scaffold the Vite + React project for you in the next step.

### Manual setup (alternative)

<details>
<summary>Expand if you prefer to configure manually</summary>

**`antigravity.yaml`** at your project root:

```yaml
mcpServers:
  formcms:
    type: sse
    url: http://localhost:5000/mcp/sse
    # Optional: add an API key header to skip browser login
    # headers:
    #   Authorization: "Bearer <your-api-key>"
```

**Skill file:**

```bash
mkdir -p .agent/skills/formcms-react-app
curl -o .agent/skills/formcms-react-app/SKILL.md \
  https://raw.githubusercontent.com/formcms/formmate/main/packages/ai-skills/gemini/formcms-react-app/SKILL.md
```

To generate an API key: open FormMate → **Settings** → **API Key Configuration** → **Generate**.

</details>



## 3. Scaffold the Project and Schema

Just prompt your agent — it will create the entire Vite app from scratch:

```
"Create a Vite + React + TypeScript app connected to FormCMS 
 with a blog schema: posts (title, body, cover image), authors, categories (many-to-one),
 and tags (many-to-many). Seed some sample data."
```

The agent will:
- **Authenticate** — call `get_login_url`, open the URL in your browser to log in *(skipped if you configured an API key — the recommended approach)*
- Run `npm create vite` to scaffold the project
- Configure the Vite proxy (calling `get_server_info` for the base URL)
- Call `define_entity` for each entity
- Seed sample data via `insert_entity`
- Run `npm install && npm run dev` to start the dev server

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
