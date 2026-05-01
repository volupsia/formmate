---
name: Build FormCMS React App
description: Guidelines and patterns for building React applications that integrate with FormCMS backend. Covers configuration, authentication, data fetching, and asset management.
---

# Building a React App with FormCMS

This skill outlines the standard patterns for connecting a React frontend to a FormCMS backend.

## Configuration

FormCMS apps communicate with the backend via proxy to avoid CORS issues during development.

> **If you have the MCP server connected:** call `get_server_info` first — it returns `formcmsBaseUrl`, which is the correct proxy target. Use that value instead of the placeholder below.

### `vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Replace <FORMCMS_BASE_URL> with the value returned by the get_server_info MCP tool.
      // Both /api and /files must point to the same FormCMS backend URL.
      '/api': {
        target: '<FORMCMS_BASE_URL>', // e.g. http://localhost:5000
        changeOrigin: true,
      },
      '/files': {
        target: '<FORMCMS_BASE_URL>', // e.g. http://localhost:5000
        changeOrigin: true,
      }
    }
  }
});
```

---

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

---

## Schema Introspection

After entities are created (via `define_entity` or the admin UI), use the MCP tools `list_schemas` and `get_schema` to discover entity definitions, their attributes, and relationship metadata.

### Dev-time: use MCP tools

```
# Discover all entity schemas
list_schemas

# Get full detail for a single entity
get_schema  { "name": "post" }
```

Call these tools while building the app to understand the attribute/relationship structure, then use that knowledge to write your TypeScript types and API calls — rather than fetching the schema at runtime.

### Schema shape (for reference)

When you call `list_schemas` or `get_schema`, each schema object looks like this:

```typescript
interface SchemaResponse {
  name: string;              // entity name (e.g. "post")
  displayName: string;       // human-readable label (e.g. "Post")
  primaryKey: string;        // usually "id"
  labelAttributeName: string; // field used as the display label (e.g. "title")
  defaultPageSize: number;
  previewUrl: string;
  attributes: Attribute[];
}

interface Attribute {
  field: string;          // camelCase field name
  header: string;         // human-readable label
  displayType: string;    // "text" | "textarea" | "editor" | "number" | "image" | "dropdown" | "lookup" | ...
  inList: boolean;        // shown in list views
  inDetail: boolean;      // shown in detail views
  isDefault: boolean;     // system-managed field (id, createdAt, etc.)
  options: string;        // comma-separated options for dropdown/multiselect; target entity name for lookup
  validation: string;     // regex pattern

  // Relationship descriptors — null when the attribute is not a relationship
  junction: SchemaResponse | null;   // non-null for many-to-many fields
  lookup: SchemaResponse | null;     // non-null for many-to-one fields — embeds the related entity's full schema
  collection: SchemaResponse | null; // non-null for one-to-many fields
}
```

### How to identify relationship attributes

Scan `attributes` and check which relationship descriptor is non-null:

| `displayType` | Non-null field | Relationship type | What it contains |
|---------------|---------------|-------------------|-----------------|
| `"lookup"` | `lookup` | Many-to-One | Full schema of the related entity (its attributes, primaryKey, labelAttributeName, etc.) |
| (varies) | `junction` | Many-to-Many | Full schema of the junction target entity |
| (varies) | `collection` | One-to-Many | Full schema of the child entity |

> **Tip:** Use schema introspection (via MCP tools) to discover which fields are relationships and determine which relationship API endpoints to call when building your app.

---

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

---

## Relationships

FormCMS supports three relationship cardinalities between entities. Relationships are defined on the schema (via `define_entity`) and have their own dedicated REST endpoints for managing related data **after** the parent record exists.

### Relationship Types Overview

| Cardinality | SDK term | Example | How data is linked |
|-------------|----------|---------|-------------------|
| **Many-to-Many** | Junction | Post ↔ Tag | A junction table links IDs from both sides |
| **Many-to-One** | Lookup | Post → Category | The parent record stores a reference to the related record |
| **One-to-Many** | Collection | Post → Comment | Child records are owned by the parent |

> **Important:** Relationship fields must NOT be duplicated as regular attributes. They are managed entirely through the relationship endpoints below.

---

### Junction (Many-to-Many)

Use junctions when both entities can have multiple related records on each side (e.g. a Post can have many Tags, and a Tag can belong to many Posts).

#### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET`  | `/api/entities/junction/target_ids/{entity}/{id}/{field}` | Get IDs of related records |
| `GET`  | `/api/entities/junction/{entity}/{id}/{field}?exclude={bool}&{qs}` | List related (or unrelated) records |
| `POST` | `/api/entities/junction/{entity}/{id}/{field}/save` | Attach items to the junction |
| `POST` | `/api/entities/junction/{entity}/{id}/{field}/delete` | Detach items from the junction |

- `{entity}` — the source entity name (e.g. `post`)
- `{id}` — the source record's ID
- `{field}` — the relationship field name defined on the schema (e.g. `tags`)

#### Usage

```typescript
// 1. Get IDs of all tags linked to post #42
const idsRes = await axios.get('/api/entities/junction/target_ids/post/42/tags');
const tagIds: number[] = idsRes.data; // [1, 3, 7]

// 2. List the full tag records linked to post #42
const linkedRes = await axios.get('/api/entities/junction/post/42/tags', {
  params: { exclude: false, limit: 50, offset: 0 },
});
const { items, totalRecords } = linkedRes.data;

// 3. List tags NOT yet linked (for a "pick tags" UI)
const availableRes = await axios.get('/api/entities/junction/post/42/tags', {
  params: { exclude: true, limit: 50, offset: 0 },
});

// 4. Attach tags to the post (send an array of tag objects with at least { id })
await axios.post('/api/entities/junction/post/42/tags/save', [
  { id: 2 },
  { id: 5 },
]);

// 5. Detach tags from the post
await axios.post('/api/entities/junction/post/42/tags/delete', [
  { id: 7 },
]);
```

---

### Lookup (Many-to-One)

Use lookups when a record references exactly one related record (e.g. a Post belongs to one Category). The lookup endpoint provides a **search/autocomplete** API to find the target record.

#### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET`  | `/api/entities/lookup/{entity}?query={search}` | Search for matching records to select as the lookup value |

#### Response shape

```typescript
interface LookupListResponse {
  hasMore: boolean;
  items: Record<string, any>[];
}
```

#### Usage

```typescript
// 1. Search for categories matching "tech"
const res = await axios.get('/api/entities/lookup/category', {
  params: { query: 'tech' },
});
const { items, hasMore } = res.data;
// items = [{ id: 3, title: "Technology" }, { id: 8, title: "Tech News" }]

// 2. Set the lookup on the parent record — include the lookup field
//    in the insert/update payload using the target record's ID.
//    The field name in the payload is the relationship field name.
await axios.post('/api/entities/post/insert', {
  title: 'My Tech Post',
  category: 3,  // ← lookup field stores the target record's ID
});

// Or update an existing post's category
await axios.post('/api/entities/post/update', {
  id: 42,
  category: 3,
});
```

> The lookup value is stored directly on the parent entity's record. Use the search endpoint to build autocomplete/picker UIs.

---

### Collection (One-to-Many)

Use collections when a parent entity owns multiple child records (e.g. a Post has many Comments). Child records are created **under** the parent.

#### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET`  | `/api/entities/collection/{entity}/{id}/{field}?{qs}` | List child records belonging to the parent |
| `POST` | `/api/entities/collection/{entity}/{id}/{field}/insert` | Create a new child record under the parent |

#### Usage

```typescript
// 1. List all comments for post #42
const res = await axios.get('/api/entities/collection/post/42/comments', {
  params: { limit: 20, offset: 0 },
});
const items = res.data;

// 2. Add a new comment to post #42
await axios.post('/api/entities/collection/post/42/comments/insert', {
  body: 'Great post!',
  authorName: 'Jane',
});
```

> Collection children are always created in the context of their parent. You do not need to manually set a foreign key — the API handles it.

---

### Workflow: Creating an Entity with Relationships

When building a form that creates an entity **and** its related data, follow this order:

1. **Insert the main entity** via `POST /api/entities/{entity}/insert` — this returns the new record (including its `id`).
2. **Set lookups** — include lookup field values directly in the insert payload (step 1), or update them later via `/update`.
3. **Attach junction items** — call `POST /api/entities/junction/{entity}/{id}/{field}/save` with an array of related IDs.
4. **Add collection items** — call `POST /api/entities/collection/{entity}/{id}/{field}/insert` for each child record.

```typescript
// Full example: create a post with a category (lookup), tags (junction), and a comment (collection)

// Step 1 — Create post with lookup
const postRes = await axios.post('/api/entities/post/insert', {
  title: 'Hello World',
  body: '<p>My first post</p>',
  category: 3,        // lookup — category ID
  published: 'true',
});
const newPost = postRes.data;  // { id: 99, ... }

// Step 2 — Attach tags (junction)
await axios.post('/api/entities/junction/post/99/tags/save', [
  { id: 1 },
  { id: 4 },
]);

// Step 3 — Add a comment (collection)
await axios.post('/api/entities/collection/post/99/comments/insert', {
  body: 'Welcome to my blog!',
  authorName: 'Admin',
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

---

## UI Best Practices
- Use **Lucide React** for icons.
- Use **Framer Motion** for transitions.
- Maintain a clean, minimal aesthetic with consistent spacing.
