import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const API_REFERENCE = `
# FormCMS API Reference

## Schema Introspection (Dev-time)

After creating entities (via \`define_entity\` or the admin UI), call \`list_schemas\` and \`get_schema\` to inspect the data model. Use this information to write your TypeScript types and understand relationship structures.

> **Do not fetch schemas at runtime.** Call these tools now, understand the structure, then hardcode the types into your app.

### Usage

\`\`\`
# Discover all entity schemas
list_schemas

# Get full detail for a single entity
get_schema  { "name": "post" }
\`\`\`

### Schema shape

Each schema object returned by these tools has this structure:

\`\`\`typescript
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
\`\`\`

### Identifying relationships

Check which relationship descriptor is non-null on each attribute:

| \`displayType\` | Non-null field | Relationship type | What it contains |
|---------------|---------------|-------------------|-----------------|
| \`"lookup"\` | \`lookup\` | Many-to-One | Full schema of the related entity |
| (varies) | \`junction\` | Many-to-Many | Full schema of the junction target entity |
| (varies) | \`collection\` | One-to-Many | Full schema of the child entity |

> Use this information to decide which relationship API endpoints to use when building the app.

---

# Part 2: Runtime (App Code — REST API)

## Configuration

You must configure a Vite proxy so all \`/api\` and \`/files\` requests are forwarded to the FormCMS backend. This avoids CORS issues.

> **Always call \`get_server_info\` first** (if MCP is connected) to get the actual \`formcmsBaseUrl\`. Use that value as the proxy target — do not hardcode a URL.

### Create \`vite.config.ts\`
\`\`\`typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Replace <FORMCMS_BASE_URL> with the value from get_server_info.
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
\`\`\`

---

## App User Authentication (Runtime)

This section covers how to implement **end-user login** in the React app. This is NOT the same as MCP session authentication (which you used in Part 1 to call dev-time tools).

You must use **cookie-based session authentication** via axios.

### Setup — add this once in \`src/main.tsx\` or \`src/App.tsx\`

\`\`\`typescript
import axios from 'axios';
// You MUST set this globally — ensures cookies are sent on every request
axios.defaults.withCredentials = true;
\`\`\`

### Auth service — create \`src/services/auth.ts\`

Wrap all auth calls with \`catchClient\` so they return \`{ data } | { error, errorDetail }\` instead of throwing. Follow this pattern exactly:

\`\`\`typescript
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
\`\`\`

### Using auth in a component

\`\`\`tsx
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
\`\`\`

### Auth Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| \`GET\`  | \`/api/me\` | Get current session user (returns 401 if not logged in) |
| \`POST\` | \`/api/login\` | Login — body: \`{ usernameOrEmail, password }\` |
| \`POST\` | \`/api/register\` | Register — body: \`{ email, password, userName }\` |
| \`GET\`  | \`/api/logout\` | Clear session cookie |
| \`POST\` | \`/api/profile/password\` | Change password — body: \`{ oldPassword, password }\` |
| \`POST\` | \`/api/profile/avatar\` | Upload avatar — \`multipart/form-data\`, field name \`file\` |

### Rules you must follow
- Set \`axios.defaults.withCredentials = true\` **once** at app startup. Do not skip this.
- Always check \`res.error\` on auth calls — never rely on thrown exceptions.
- Call SWR's \`mutate()\` after login/logout to sync the cached session without a full page reload.
- Use \`userInfo.roles\` for access control (e.g. \`'admin'\`).

---

## Entity API (Runtime)

Use these endpoints for all CRUD operations in the React app.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| \`GET\`  | \`/api/entities/{entity}\` | List records (supports \`limit\`, \`offset\`, filters) |
| \`GET\`  | \`/api/entities/{entity}/{id}\` | Get single record |
| \`POST\` | \`/api/entities/{entity}/insert\` | Create |
| \`POST\` | \`/api/entities/{entity}/update\` | Update |
| \`POST\` | \`/api/entities/{entity}/delete\` | Delete |

### List response shape

\`\`\`json
{
  "items": [
    { "id": 1, "title": "...", "published": "true", "publicationStatus": "published", "createdAt": "...", "updatedAt": "..." }
  ],
  "totalRecords": 100
}
\`\`\`

> **Warning:** \`published\` is a string \`"true"\` / \`"false"\`, not a boolean. Always send it as a string.

### Examples

\`\`\`typescript
// List with pagination
const res = await axios.get('/api/entities/post', {
  params: { limit: 10, offset: 0 },
});
const { items, totalRecords } = res.data;

// Insert — note published is a string
await axios.post('/api/entities/post/insert', {
  title: 'New Post',
  published: 'true',
});
\`\`\`

---

## Relationships

There are three relationship types. Relationships are defined on the schema (via \`define_entity\` at dev-time) and managed through dedicated REST endpoints at runtime. Do not duplicate relationship fields as regular attributes.

| Cardinality | SDK term | Example | How data is linked |
|-------------|----------|---------|-------------------|
| **Many-to-Many** | Junction | Post ↔ Tag | A junction table links IDs from both sides |
| **Many-to-One** | Lookup | Post → Category | The parent record stores a reference to the related record |
| **One-to-Many** | Collection | Post → Comment | Child records are owned by the parent |

> **Do not** include relationship fields as regular attributes in the entity payload. They are managed entirely through the relationship endpoints below.

---

### Junction (Many-to-Many)

Use junction endpoints when both entities can have multiple related records on each side (e.g. Post ↔ Tag).

#### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| \`GET\`  | \`/api/entities/junction/target_ids/{entity}/{id}/{field}\` | Get IDs of related records |
| \`GET\`  | \`/api/entities/junction/{entity}/{id}/{field}?exclude={bool}&{qs}\` | List related (or unrelated) records |
| \`POST\` | \`/api/entities/junction/{entity}/{id}/{field}/save\` | Attach items |
| \`POST\` | \`/api/entities/junction/{entity}/{id}/{field}/delete\` | Detach items |

- \`{entity}\` — source entity name (e.g. \`post\`)
- \`{id}\` — source record's ID
- \`{field}\` — relationship field name from the schema (e.g. \`tags\`)

#### Examples

\`\`\`typescript
// Get IDs of all tags linked to post #42
const idsRes = await axios.get('/api/entities/junction/target_ids/post/42/tags');
const tagIds: number[] = idsRes.data; // [1, 3, 7]

// List full tag records linked to post #42
const linkedRes = await axios.get('/api/entities/junction/post/42/tags', {
  params: { exclude: false, limit: 50, offset: 0 },
});
const { items, totalRecords } = linkedRes.data;

// List tags NOT yet linked (for a "pick tags" UI)
const availableRes = await axios.get('/api/entities/junction/post/42/tags', {
  params: { exclude: true, limit: 50, offset: 0 },
});

// Attach tags — send an array of objects with at least { id }
await axios.post('/api/entities/junction/post/42/tags/save', [
  { id: 2 },
  { id: 5 },
]);

// Detach tags
await axios.post('/api/entities/junction/post/42/tags/delete', [
  { id: 7 },
]);
\`\`\`

---

### Lookup (Many-to-One)

Use lookup endpoints when a record references exactly one related record (e.g. Post → Category). The lookup endpoint provides a search/autocomplete API.

#### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| \`GET\`  | \`/api/entities/lookup/{entity}?query={search}\` | Search for matching records to select as the lookup value |

#### Response shape

\`\`\`typescript
interface LookupListResponse {
  hasMore: boolean;
  items: Record<string, any>[];
}
\`\`\`

#### Examples

\`\`\`typescript
// Search for categories matching "tech"
const res = await axios.get('/api/entities/lookup/category', {
  params: { query: 'tech' },
});
const { items, hasMore } = res.data;
// items = [{ id: 3, title: "Technology" }, { id: 8, title: "Tech News" }]

// Set the lookup — include the lookup field in the insert/update payload
// The field name is the relationship field name, the value is the target record's ID
await axios.post('/api/entities/post/insert', {
  title: 'My Tech Post',
  category: 3,  // ← lookup stores the target record's ID
});

// Or update an existing post's category
await axios.post('/api/entities/post/update', {
  id: 42,
  category: 3,
});
\`\`\`

> The lookup value is stored directly on the parent record. Use the search endpoint to build autocomplete/picker UIs.

---

### Collection (One-to-Many)

Use collection endpoints when a parent entity owns multiple child records (e.g. Post → Comment). Always create child records under the parent — do not manually set a foreign key.

#### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| \`GET\`  | \`/api/entities/collection/{entity}/{id}/{field}?{qs}\` | List child records |
| \`POST\` | \`/api/entities/collection/{entity}/{id}/{field}/insert\` | Create a child record under the parent |

#### Examples

\`\`\`typescript
// List all comments for post #42
const res = await axios.get('/api/entities/collection/post/42/comments', {
  params: { limit: 20, offset: 0 },
});
const items = res.data;

// Add a new comment to post #42
await axios.post('/api/entities/collection/post/42/comments/insert', {
  body: 'Great post!',
  authorName: 'Jane',
});
\`\`\`

> Do not manually set foreign keys for collection children. The API handles it automatically.

---

### Workflow: Creating an Entity with Relationships

When you need to create an entity with related data, follow this exact order:

1. **Insert the main entity** via \`POST /api/entities/{entity}/insert\` — this returns the new record (including its \`id\`).
2. **Set lookups** — include lookup field values in the insert payload (step 1), or update later via \`/update\`.
3. **Attach junction items** — call \`POST /api/entities/junction/{entity}/{id}/{field}/save\` with an array of related IDs.
4. **Add collection items** — call \`POST /api/entities/collection/{entity}/{id}/{field}/insert\` for each child.

\`\`\`typescript
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
\`\`\`

## Named Queries (Runtime)

Named queries are **created at dev-time** using MCP tools (\`get_graphql_sdl\` → \`save_query\`). At runtime, fetch query results via REST. Do not create queries from app code.

Endpoint: \`GET /api/queries/{queryName}?param=value\`

\`\`\`typescript
const res = await axios.get('/api/queries/habitTemplateList', {
  params: { limit: 10 },
});
const data = res.data;
\`\`\`

## Assets API

Use these endpoints for file uploads and asset management. Always use \`multipart/form-data\` with field name \`files\`.

### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| \`POST\` | \`/api/assets\` | Upload new file(s) — \`multipart/form-data\`, field name \`files\` |
| \`GET\`  | \`/api/assets\` | List all assets |
| \`GET\`  | \`/api/assets/:id\` | Get single asset by ID |
| \`POST\` | \`/api/assets/:id\` | Replace an existing asset's file |
| \`POST\` | \`/api/assets/delete/:id\` | Delete an asset |
| \`POST\` | \`/api/assets/meta\` | Update asset metadata |
| \`GET\`  | \`/api/assets/base\` | Get the asset base URL (for resolving relative paths) |

### Uploading a file

\`\`\`typescript
const formData = new FormData();
formData.append('files', file); // field name MUST be "files"

const res = await axios.post('/api/assets', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
// res.data is a plain string — the relative path, e.g. "/files/2024/01/photo.jpg"
// Store this string directly. Do not parse or modify it.
\`\`\`

### Linking assets to entity fields

For entity fields of type \`image\` or \`file\`, store the asset's **\`path\`** (not the full URL) in the entity payload. The backend automatically creates a link between the record and the asset.

\`\`\`typescript
// Step 1 — Upload the asset, get back its path
const formData = new FormData();
formData.append('files', selectedFile);
const uploadRes = await axios.post('/api/assets', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
const assetPath = uploadRes.data; // string, e.g. "/files/2024/01/photo.jpg"

// Step 2 — Include the path in the entity payload
await axios.post('/api/entities/post/insert', {
  title: 'My Post',
  featured_image: assetPath, // ← store the path, not the full URL
});
\`\`\`

When using an existing asset (e.g. from an asset picker), use its \`path\` the same way:

\`\`\`typescript
await axios.post('/api/entities/post/update', {
  id: postId,
  featured_image: selectedAsset.path,
});
\`\`\`

> **Always store the asset \`path\`, never the full URL.** The backend uses the path to establish the asset–record link.

### Displaying assets

Asset paths may be relative. Resolve them using \`/api/assets/base\`:

\`\`\`typescript
const baseRes = await axios.get('/api/assets/base');
const assetBaseUrl = baseRes.data; // e.g. "http://localhost:5000"

function getFullAssetUrl(path: string) {
  if (!path) return path;
  return path.startsWith('http') ? path : \`\${assetBaseUrl}\${path}\`;
}

// Use in JSX
<img src={getFullAssetUrl(post.featured_image)} alt="Featured" />
\`\`\`

---

## UI Guidelines
- Use **Lucide React** for icons.
- Use **Framer Motion** for transitions and animations.
- Maintain a clean, minimal aesthetic with consistent spacing.
`;

export function registerAuthPrompts(server: McpServer): void {
    server.prompt(
        'formcms-auth-api',
        'FormCMS API reference — authentication, entity CRUD, named queries, and asset management. ' +
        'Use this when building login, register, logout, data fetching, file uploads, or session-management features.',
        () => ({
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: API_REFERENCE,
                    },
                },
            ],
        })
    );
}
