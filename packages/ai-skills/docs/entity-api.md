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
