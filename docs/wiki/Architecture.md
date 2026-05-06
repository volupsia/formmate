# Architecture

## High-Level Overview

```mermaid
graph TD
    %% Users
    U1["👨‍💻 Developer"]
    U2["👔 Admin"]
    U3["👤 End User"]
    U4["🤖 AI Agent"]

    %% User Interfaces
    A[formmate - AI Schema Builder /mate]
    C[AdminApp /admin]
    D[Portal /portal]
    P[Pages]

    %% Backend Services
    B[FormCMS Backend /api]
    E[AI<br>Gemini / OpenAI]
    M[MCP Server /mcp]

    %% Local agent context
    SK[".agent/skills/\nSkills File"]

    %% User → UI
    U1 -->|Build Schema & UI| A
    U2 -->|Manage Content| C
    U3 -->|View & Engage| D
    U3 -->|Browse Content| P
    U4 -->|MCP Tools| M
    SK -->|API patterns & rules| U4

    %% UI → Backend
    A --> B
    A --> E
    C --> B
    D --> B
    P --> B
    M --> B
```



## 1. formmate (AI Schema & UI Builder)

The "brain" of the ecosystem. This tool leverages LLMs to architect your data models and design your UI. It translates your natural language requirements into technical configurations that the system understands.

### Key Capabilities:
- **Schema Generation**: Describe your domain in natural language, get normalized database schemas
- **Data Seeding**: Generate realistic sample data with relational integrity
- **Query Building**: Create GraphQL queries from prompts, auto-convert to REST endpoints
- **UI Generation**: Generate HTML/CSS pages connected to your data
- **Engagement Features**: Add likes, shares, views, toplist, page tracking, and user avatars via prompts
- **Version History**: Access and rollback all generated content in the portal

---

## 2. formcms (Backend Engine)

The core high-performance engine built with **ASP.NET Core (C#)**.

### Features:
- **REST & GraphQL**: Automatically exposes APIs for every entity you define
- **Normalized Storage**: Optimized for speed (Sqlite, Postgres, SQL Server, MySQL supported)
- **User Engagement**: Built-in likes, bookmarks, shares, views, toplist, and page tracking with buffered writes
- **Social Features**: Notifications, comments system, and popularity scoring
- **Scale**: Designed to handle millions of records and high-concurrency environments

### Performance Stats:
- P95 latency under 200ms for the slowest APIs
- Throughput over 2,400 QPS per application node
- Support for complex queries (5-table joins over 1M rows)
- Efficient handling of large tables (100M+ records for user activities)

### Database Support:
| Database | Status |
|----------|--------|
| SQLite | ✅ Full Support |
| PostgreSQL | ✅ Full Support |
| SQL Server | ✅ Full Support |
| MySQL | ✅ Full Support |

---

## 3. FormCmsAdminApp (Management Dashboard)

A sleek, **React-based** administrative interface.

### Features:
- Manage your content data (CRUD operations)
- Edit related content inline
- Manage assets (images, files) with local or cloud storage
- Built-in audit logging and publication workflows

---

## 4. Pages (Frontend)

Server-side rendered pages for end users to browse content.

### How It Works:
1. **Template Storage**: Handlebars templates are saved to FormCMS database
2. **Server Rendering**: FormCMS backend reads the template, executes the page's query definition to load data, and renders HTML
3. **Dynamic Hydration**: After the page loads in the browser, Alpine.js fetches and displays dynamic social data (likes, views, etc.)

### Features:
- **SEO Optimized**: Server-rendered HTML for search engine visibility
- **Handlebars Templating**: Flexible server-side rendering with Handlebars
- **Built-in Routing**: Automatic routes based on page configuration
- **Cached for Performance**: Response caching for fast page loads
- **Social Features**: Built-in likes, shares, views, and toplist

---

## 5. FormCmsPortal (User Portal)

A personalized portal where users can manage their social engagement and content.

### Features:
- **History**: View previously accessed content
- **Liked Items**: Browse and manage liked content
- **Bookmarked Items**: Organize saved content with folders

---

## 6. MCP Server + Skills File (AI Agent Integration)

FormCMS provides two complementary artifacts that give AI coding agents full context to build, deploy, and manage apps.

### 6a. MCP Server

A dev-time [Model Context Protocol](https://modelcontextprotocol.io) server that lets AI agents (Antigravity, Cursor, Codex, Claude Desktop) interact with FormCMS programmatically.

**Key Capabilities:**
- **Schema Management**: Create and update entities, attributes, and relationships via `define_entity`
- **Data Operations**: Seed and manage records via `insert_entity`, `update_entity`, `list_entities`
- **Query Management**: Create named queries via `save_query`, inspect the GraphQL SDL via `get_graphql_sdl`
- **SPA Deployment**: Deploy React/Vue/Svelte apps directly to FormCMS via `deploy_spa`
- **System Info**: Discover the backend URL and server capabilities via `get_server_info`

**How It Connects:**
- Exposed at `/mcp/sse` (SSE transport) behind the same Nginx gateway on port 5000
- Protected by an optional API key configured in **FormMate Settings → API Key Configuration**
- Calls the FormCMS backend internally — agents never need direct access to the .NET service

### 6b. Skills File

A single Markdown file (`skill.md`) that teaches the AI agent the FormCMS REST API patterns — authentication, entity CRUD, relationship endpoints, asset management, and SPA deployment — so you don't have to explain them in every prompt. The same file works with all AI agents (Antigravity, Cursor, Copilot, Claude).

**Where it lives:** Copy it into your project at the location your agent expects (e.g. `.agent/skills/formcms-react-app/SKILL.md` for Antigravity)

**What it covers:**
- Vite proxy configuration (`/api` and `/files`)
- Cookie-based auth patterns (axios + SWR)
- Entity, relationship, and asset API patterns
- SPA deployment workflow

**How to get it:** Copy from the FormCMS repo at `packages/ai-skills/skill.md`, or follow the [Vite + React + AI Agents guide](./Vite-React-Antigravity-Example.md).

> The MCP server handles **runtime tool calls** (creating schemas, deploying apps). The Skills file provides **static knowledge** (API patterns, code conventions). Together they give the agent full context to build a FormCMS-backed app from scratch.
