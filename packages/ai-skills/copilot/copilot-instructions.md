# FormMate — AI Coding Instructions

## Project Overview
FormMate is a developer toolkit built on top of [FormCMS](https://github.com/formcms/formcms) — a headless CMS backend.
Frontend apps are built with React + TypeScript + Vite, connected to the FormCMS API.

## Tech Stack
- Frontend: React, TypeScript, Vite
- Shared: `@formmate/shared` (types, operators, API client)
- MCP Server: Node.js + Express + `@modelcontextprotocol/sdk`

## FormCMS API Conventions

### 🔑 Authentication (Cookie-based — CRITICAL)
Every `fetch` call MUST include `credentials: 'include'`.
Session is cookie-based; no Authorization header is needed in the browser.

| Method | Path | Body / Notes |
|--------|------|------|
| `GET`  | `/api/me` | Returns current user or 401 |
| `POST` | `/api/login` | `{ usernameOrEmail, password }` |
| `POST` | `/api/register` | `{ email, password, userName }` |
| `GET`  | `/api/logout` | Clears cookie |
| `POST` | `/api/profile/password` | `{ oldPassword, password }` |
| `POST` | `/api/profile/avatar` | `multipart/form-data`, field: `file` |

Always create an `AuthContext` (`src/contexts/AuthContext.tsx`) with `user`, `loading`, `login()`, `register()`, `logout()`. Wrap `<App>` in `<AuthProvider>`. Restore session on mount via `GET /api/me`.

### 📦 Entity CRUD API
```
GET    /api/entities/{entity}         – list (query params: limit, offset)
GET    /api/entities/{entity}/{id}    – single record
POST   /api/entities/{entity}/insert  – create record
POST   /api/entities/{entity}/update  – update record
POST   /api/entities/{entity}/delete  – delete record
```

### 🔍 Named Queries
```
GET /api/queries/{queryName}?param=value
```

## Coding Guidelines
- Use `credentials: 'include'` on ALL fetch calls to the FormCMS backend.
- Use `CONFIG.API_BASE_URL` (from `src/config.ts`) as the base for all API calls.
- Prefer named exports for components.
- Use Lucide React for icons, Framer Motion for animations.
- Use functional components with hooks only.
