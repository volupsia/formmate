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

Open **http://localhost:5000/mate** and follow the initial setup wizard to create your admin account.

### Generate an API Key

Open **http://localhost:5000/mate** → **Settings** → **API Key Configuration** → **Generate**.

Copy the key — you'll use it in the next step.

## 2. Connect Your Agent to FormCMS

### Antigravity (VS Code)

Antigravity cannot connect to SSE endpoints directly, so we use [`supergateway`](https://github.com/supercorp-ai/supergateway) as a local STDIO↔SSE bridge.

Edit `~/.gemini/antigravity/mcp_config.json`:

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

Then reload the VS Code window: **`Cmd+Shift+P` → `Developer: Reload Window`**

### Cursor

Add to `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "formcms": {
      "url": "http://localhost:5000/mcp/sse",
      "headers": {
        "Authorization": "Bearer <your-api-key>"
      }
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "formcms": {
      "url": "http://localhost:5000/mcp/sse",
      "headers": {
        "Authorization": "Bearer <your-api-key>"
      }
    }
  }
}
```

## 3. Add the AI Skill File

The skill file teaches the agent how to use FormCMS APIs. It's a single file — just copy it to the right location for your agent:

### Antigravity / Gemini

```bash
mkdir -p .agent/skills/formcms-react-app
curl -o .agent/skills/formcms-react-app/SKILL.md \
  https://raw.githubusercontent.com/formcms/formmate/main/packages/ai-skills/skill.md
```

### Cursor

```bash
mkdir -p .cursor/rules
curl -o .cursor/rules/formcms-react-app.md \
  https://raw.githubusercontent.com/formcms/formmate/main/packages/ai-skills/skill.md
```

### VS Code Copilot

```bash
mkdir -p .github
curl -o .github/copilot-instructions.md \
  https://raw.githubusercontent.com/formcms/formmate/main/packages/ai-skills/skill.md
```

## 4. Scaffold the Project and Schema

Just prompt your agent — it will create the entire Vite app from scratch:

```
"Create a Vite + React + TypeScript app connected to FormCMS 
 with a blog schema: posts (title, body, cover image), authors, categories (many-to-one),
 and tags (many-to-many). Seed some sample data."
```

The agent will:
- Run `npm create vite` to scaffold the project
- Configure the Vite proxy (calling `get_server_info` for the base URL)
- Call `define_entity` for each entity
- Seed sample data via `insert_entity`
- Run `npm install && npm run dev` to start the dev server

## 5. Build the React Frontend

With the backend schema in place, start the dev server and ask your agent to build the UI:

```bash
npm run dev
```

Example prompts:
- *"Build a `PostList` component that fetches from `/api/entities/post` and displays cards in a responsive grid."*
- *"Create a `PostDetail` page that reads the post ID from the URL, fetches `/api/entities/post/{id}`, and renders the cover image, title, body, and category."*
- *"Add a category filter sidebar to `PostList` that calls `/api/entities/category` and filters posts client-side."*

> **Tip:** The agent already knows your schema from the MCP tools — it can build components with the correct field names and relationship structures without you having to describe them.

## 6. Deploy your React App via MCP

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

## 7. Iterate Rapidly

```
Need a new feature?
  → Ask the agent to call define_entity to add fields or a new entity.

Need to show it?
  → Ask the agent to update the React components.

Ready to ship?
  → Ask the agent to build and call deploy_spa.
```

This clean separation — **MCP tools set up the backend**, **React components consume the APIs** — gives you a true AI-powered full-stack workflow with zero context switching.
