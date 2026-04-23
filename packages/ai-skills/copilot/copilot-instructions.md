# FormMate — AI Coding Instructions

## Project Overview
FormMate is a developer toolkit built on top of [FormCMS](https://github.com/formcms/formcms) — a headless CMS backend.
Frontend apps are built with React + TypeScript + Vite, connected to the FormCMS API.

## Tech Stack
- Frontend: React, TypeScript, Vite
- Shared: `@formmate/shared` (types, operators, API client)
- MCP Server: Node.js + Express + `@modelcontextprotocol/sdk`

## Configuration

FormCMS apps typically communicate with the backend via API. To avoid CORS issues during development, use a proxy in your Vite configuration instead of hardcoding an API base URL.

### `vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // In Docker, nginx (default port 5000) is the single gateway:
      //   /api/ → .NET FormCMS backend
      //   /mcp/ → MCP server
      // Point the proxy target at your Docker nginx URL.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/mcp': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
      '/files': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
});
```

## Authentication

FormCMS uses **cookie-based session authentication** via axios.

### Setup (`src/main.tsx` or `src/App.tsx`)

```typescript
import axios from 'axios';
// Must be set globally — ensures cookies are sent on every request
axios.defaults.withCredentials = true;
```

### Auth service (`src/services/auth.ts`)

Use axios directly and wrap calls with `catchClient` to return `{ data } | { error, errorDetail }` instead of throwing:

```typescript
import axios from 'axios';
import useSWR from 'swr';

// ── Helpers ────────────────────────────────────────────────────────────────
const fetcher = (url: string) => axios.get(url).then(r => r.data);

export async function catchClient<T>(req: () => Promise<T>) {
  try {
    return { data: await req() };
  } catch (err: any) {
    const title = err.response?.data?.title ?? 'An error has occurred.';
    return { error: title, errorDetail: err.response?.data };
  }
}

// ── Session ────────────────────────────────────────────────────────────────
// SWR caches the session; returns undefined while loading, null when logged out
export function useUserInfo() {
  return useSWR('/api/me', fetcher, { revalidateOnFocus: false, shouldRetryOnError: false });
}

// ── Auth actions (these return no data — just check for success) ──────────
export const login    = (payload: { usernameOrEmail: string; password: string }) =>
  catchClient(() => axios.post('/api/login', payload));

export const register = (payload: { email: string; password: string; userName: string }) =>
  catchClient(() => axios.post('/api/register', payload));

export const logout   = () =>
  catchClient(() => axios.get('/api/logout'));
```

### Consuming in a component

```tsx
import { useUserInfo, login, logout } from '../services/auth';

export function App() {
  const { data: userInfo, isLoading, mutate } = useUserInfo();

  const handleLogin = async (usernameOrEmail: string, password: string) => {
    const res = await login({ usernameOrEmail, password });
    if (res.error) {
      setError(res.errorDetail?.title || res.error);
    } else {
      await mutate(); // re-fetch /api/me to hydrate session
    }
  };

  const handleLogout = async () => {
    await logout();
    await mutate(null, false); // clear cached user without refetch
  };

  if (isLoading) return <Spinner />;
  if (!userInfo) return <LoginForm onSubmit={handleLogin} />;
  return <Dashboard user={userInfo} onLogout={handleLogout} />;
}
```

### Auth Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/api/me` | Get current session user (401 if not logged in) |
| `POST` | `/api/login` | Login — body: `{ usernameOrEmail, password }` |
| `POST` | `/api/register` | Register — body: `{ email, password, userName }` |
| `GET`  | `/api/logout` | Clear session cookie |
| `POST` | `/api/profile/password` | Change password — body: `{ oldPassword, password }` |
| `POST` | `/api/profile/avatar` | Upload avatar — `multipart/form-data`, field name `file` |

### Key Rules
- Set `axios.defaults.withCredentials = true` **once** at app startup — applies to all requests.
- Auth calls return `{ data } | { error, errorDetail }` — always check `res.error`, never rely on thrown exceptions.
- Use SWR's `mutate()` after login/logout to sync the cached session without a full page reload.
- `userInfo.roles` controls access (e.g. `'admin'`).

## Entity API

Used for standard CRUD operations on entities.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET`  | `/api/entities/{entity}` | List records (supports query params: `limit`, `offset`, filters) |
| `GET`  | `/api/entities/{entity}/{id}` | Get single record |
| `POST` | `/api/entities/{entity}/insert` | Create |
| `POST` | `/api/entities/{entity}/update` | Update |
| `POST` | `/api/entities/{entity}/delete` | Delete |

### List response shape

```json
{
  "items": [
    { "id": 1, "title": "...", "published": "true", "publicationStatus": "published", "createdAt": "...", "updatedAt": "..." }
  ],
  "totalRecords": 100
}
```

> Note: `published` is a string `"true"` / `"false"`, not a boolean.

Example (List with filters):
```typescript
const res = await axios.get('/api/entities/post', {
  params: { limit: 10, offset: 0 },
});
const { items, totalRecords } = res.data;
```

Example (Insert):
```typescript
await axios.post('/api/entities/post/insert', {
  title: 'New Post',
  published: 'true',
});
```

## Named Queries

Used for fetching specific data sets defined in FormCMS.

Endpoint: `GET /api/queries/{queryName}?param=value`

```typescript
const res = await axios.get('/api/queries/habitTemplateList', {
  params: { limit: 10 },
});
const data = res.data;
```

## Assets API

FormCMS provides a file/asset management system. Assets are uploaded via `multipart/form-data`.

### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|\n| `POST` | `/api/assets` | Upload new file(s) — `multipart/form-data`, field name `files` |
| `GET`  | `/api/assets` | List all assets |
| `GET`  | `/api/assets/:id` | Get single asset by ID |
| `POST` | `/api/assets/:id` | Replace an existing asset's file |
| `POST` | `/api/assets/delete/:id` | Delete an asset |
| `POST` | `/api/assets/meta` | Update asset metadata |
| `GET`  | `/api/assets/base` | Get the asset base URL (for resolving relative paths) |

### Upload a file

```typescript
const formData = new FormData();
formData.append('files', file); // field name MUST be "files"

const res = await axios.post('/api/assets', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
// res.data is the asset path string directly, e.g. "/files/2024/01/photo.jpg"
```

The upload response is a **plain string** — the relative path of the uploaded file.

### Using asset paths in entity fields (image / file fields)

For entity fields of type `image` or `file`, you store the asset's **`path`** in the entity payload.
After the entity is saved, the backend automatically creates a link between the record and the asset.

**Full flow:**

```typescript
// Step 1 — Upload the asset, get back its path
const formData = new FormData();
formData.append('files', selectedFile);
const uploadRes = await axios.post('/api/assets', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
const assetPath = uploadRes.data; // string, e.g. "/files/2024/01/photo.jpg"

// Step 2 — Include the path in the entity insert/update payload
await axios.post('/api/entities/post/insert', {
  title: 'My Post',
  featured_image: assetPath, // ← store the path, not the full URL
});
// The backend links the post record with the uploaded asset automatically.
```

**Or, if the user selects an existing asset** (e.g. from an asset picker), use its `path` in the same way:

```typescript
// selectedAsset comes from GET /api/assets or an asset picker UI
await axios.post('/api/entities/post/update', {
  id: postId,
  featured_image: selectedAsset.path,
});
```

> **Key rule:** Always store the asset **`path`** (not `url`) in entity fields. The backend uses the path to establish the asset–record link, enabling reference tracking and cleanup.

### Displaying an asset

Asset paths may be relative. Use `/api/assets/base` to resolve them for display:

```typescript
const baseRes = await axios.get('/api/assets/base');
const assetBaseUrl = baseRes.data; // e.g. "http://localhost:5000"

function getFullAssetUrl(path: string) {
  if (!path) return path;
  return path.startsWith('http') ? path : `${assetBaseUrl}${path}`;
}

// Display
<img src={getFullAssetUrl(post.featured_image)} alt="Featured" />
```

## Coding Guidelines
- Use a Vite proxy (in `vite.config.ts`) for `/api` requests to avoid CORS issues.
- Prefer named exports for components.
- Use functional components with hooks only.

## UI Best Practices
- Use **Lucide React** for icons.
- Use **Framer Motion** for transitions.
- Maintain a clean, minimal aesthetic with consistent spacing.
